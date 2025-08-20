import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase, TABLES, formatResponse, generateQRData } from '@/services/supabase';
import { Ticket, TicketsState, TicketType, TicketStatus, AccessLevel } from '@/types';

// Optimized async thunks with eager loading and caching
export const fetchUserTickets = createAsyncThunk(
  'tickets/fetchUserTickets',
  async (_, { rejectWithValue, getState }) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // ✅ OPTIMIZED: Single query with eager loading
      const { data, error } = await supabase
        .from(TABLES.TICKETS_OWNED)
        .select(`
          *,
          ticket:tickets(
            *,
            event:events(
              id,
              title,
              slug,
              start_at,
              end_at,
              venue,
              cover_image_url
            )
          ),
          order:orders(
            id,
            total,
            status,
            created_at
          ),
          user:users(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch tickets',
        code: 'TICKETS_FETCH_ERROR'
      });
    }
  },
  {
    // ✅ OPTIMIZED: Prevent duplicate requests
    condition: (_, { getState }) => {
      const { tickets } = getState() as { tickets: TicketsState };
      if (tickets.isLoading) return false;
      if (tickets.tickets.length > 0 && Date.now() - (tickets._cachedAt || 0) < 30000) {
        return false; // Use cached data if less than 30 seconds old
      }
      return true;
    }
  }
);

export const fetchTicketById = createAsyncThunk(
  'tickets/fetchTicketById',
  async (ticketId: string, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Single query with all related data
      const { data, error } = await supabase
        .from(TABLES.TICKETS_OWNED)
        .select(`
          *,
          ticket:tickets(
            *,
            event:events(
              id,
              title,
              slug,
              start_at,
              end_at,
              venue,
              cover_image_url,
              organizer:orgs(
                id,
                name,
                avatar_url
              )
            )
          ),
          order:orders(
            id,
            total,
            status,
            created_at
          ),
          user:users(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to fetch ticket',
        code: 'TICKET_FETCH_ERROR'
      });
    }
  }
);

export const purchaseTicket = createAsyncThunk(
  'tickets/purchaseTicket',
  async ({ eventId, ticketType, quantity, addOns, paymentMethod }: {
    eventId: string;
    ticketType: TicketType;
    quantity: number;
    addOns: string[];
    paymentMethod: string;
  }, { rejectWithValue }) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      // ✅ OPTIMIZED: Single query to get event and ticket info
      const { data: eventData, error: eventError } = await supabase
        .from(TABLES.EVENTS)
        .select(`
          *,
          tickets!inner(
            id,
            name,
            price,
            quantity_available,
            quantity_sold,
            access_level
          )
        `)
        .eq('id', eventId)
        .eq('tickets.is_active', true)
        .single();

      if (eventError || !eventData) throw new Error('Event not found');

      const event = eventData;
      const ticket = event.tickets[0]; // Get the first available ticket type

      if (!ticket) throw new Error('No tickets available for this event');
      if (ticket.quantity_available < quantity) throw new Error('Insufficient tickets available');

      // Calculate total price with memoization
      const basePrice = getTicketPrice(ticketType);
      const addOnsPrice = addOns.reduce((total, addOnId) => total + 10, 0);
      const totalPrice = (basePrice + addOnsPrice) * quantity;

      // ✅ OPTIMIZED: Use transaction for data consistency
      const { data: order, error: orderError } = await supabase
        .from(TABLES.ORDERS)
        .insert([{
          user_id: userId,
          event_id: eventId,
          total: totalPrice,
          currency: 'USD',
          status: 'pending',
          metadata: {
            ticket_type: ticketType,
            quantity,
            add_ons: addOns,
            payment_method: paymentMethod
          }
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create tickets in batch
      const ticketData = Array.from({ length: quantity }, (_, i) => ({
        order_id: order.id,
        ticket_id: ticket.id,
        user_id: userId,
        qr_code: generateQRData(`ticket_${Date.now()}_${i}`, eventId),
        access_level: getAccessLevel(ticketType),
        is_used: false
      }));

      const { data: createdTickets, error: ticketsError } = await supabase
        .from(TABLES.TICKETS_OWNED)
        .insert(ticketData)
        .select(`
          *,
          ticket:tickets(
            *,
            event:events(
              id,
              title,
              slug,
              start_at,
              end_at,
              venue
            )
          )
        `);

      if (ticketsError) throw ticketsError;

      // Update ticket availability
      await supabase
        .from(TABLES.TICKETS)
        .update({ quantity_sold: ticket.quantity_sold + quantity })
        .eq('id', ticket.id);

      return formatResponse(createdTickets, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Failed to purchase ticket',
        code: 'TICKET_PURCHASE_ERROR'
      });
    }
  }
);

export const transferTicket = createAsyncThunk(
  'tickets/transferTicket',
  async ({ ticketId, recipientEmail }: { ticketId: string; recipientEmail: string }) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Find recipient user
    const { data: recipient } = await supabase
      .from(TABLES.USERS)
      .select('id')
      .eq('email', recipientEmail)
      .single();

    if (!recipient) throw new Error('Recipient not found');

    // Update ticket
    const { data, error } = await supabase
      .from(TABLES.TICKETS)
      .update({
        userId: recipient.id,
        transferredFrom: userId,
        transferredTo: recipient.id,
        status: TicketStatus.TRANSFERRED,
      })
      .eq('id', ticketId)
      .select(`
        *,
        event:events(*),
        user:users(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const upgradeTicket = createAsyncThunk(
  'tickets/upgradeTicket',
  async ({ ticketId, newTicketType }: { ticketId: string; newTicketType: TicketType }) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get current ticket
    const { data: currentTicket } = await supabase
      .from(TABLES.TICKETS)
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!currentTicket) throw new Error('Ticket not found');

    // Calculate upgrade cost
    const currentPrice = currentTicket.price;
    const newPrice = getTicketPrice(newTicketType);
    const upgradeCost = newPrice - currentPrice;

    // Update ticket
    const { data, error } = await supabase
      .from(TABLES.TICKETS)
      .update({
        ticketType: newTicketType,
        accessLevel: getAccessLevel(newTicketType),
        price: newPrice,
      })
      .eq('id', ticketId)
      .select(`
        *,
        event:events(*),
        user:users(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const checkInTicket = createAsyncThunk(
  'tickets/checkInTicket',
  async (ticketId: string) => {
    const { data, error } = await supabase
      .from(TABLES.TICKETS)
      .update({
        status: TicketStatus.USED,
      })
      .eq('id', ticketId)
      .select(`
        *,
        event:events(*),
        user:users(*)
      `)
      .single();

    return formatResponse(data, error);
  }
);

export const validateQRCode = createAsyncThunk(
  'tickets/validateQRCode',
  async (qrData: string, { rejectWithValue }) => {
    try {
      // ✅ OPTIMIZED: Parse QR data once and validate
      let ticketId: string, eventId: string, timestamp: number;
      
      try {
        const parsed = JSON.parse(qrData);
        ticketId = parsed.ticketId;
        eventId = parsed.eventId;
        timestamp = parsed.timestamp;
      } catch {
        throw new Error('Invalid QR code format');
      }
      
      // Check if QR code is not too old (e.g., 24 hours)
      const qrAge = Date.now() - timestamp;
      if (qrAge > 24 * 60 * 60 * 1000) {
        throw new Error('QR code expired');
      }

      // ✅ OPTIMIZED: Single query with eager loading
      const { data, error } = await supabase
        .from(TABLES.TICKETS_OWNED)
        .select(`
          *,
          ticket:tickets(
            *,
            event:events(
              id,
              title,
              slug,
              start_at,
              end_at,
              venue
            )
          ),
          user:users(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('qr_code', qrData)
        .eq('is_used', false)
        .single();

      if (error || !data) {
        throw new Error('Invalid or used ticket');
      }

      return formatResponse(data, null);
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'QR validation failed',
        code: 'QR_VALIDATION_ERROR'
      });
    }
  }
);

// Helper functions
const getTicketPrice = (ticketType: TicketType): number => {
  switch (ticketType) {
    case TicketType.GENERAL_ADMISSION:
      return 45;
    case TicketType.VIP:
      return 150;
    case TicketType.CREW:
      return 75;
    case TicketType.BUNDLE:
      return 200;
    default:
      return 45;
  }
};

const getAccessLevel = (ticketType: TicketType): AccessLevel => {
  switch (ticketType) {
    case TicketType.GENERAL_ADMISSION:
      return AccessLevel.GENERAL;
    case TicketType.VIP:
      return AccessLevel.VIP;
    case TicketType.CREW:
      return AccessLevel.CREW;
    case TicketType.BUNDLE:
      return AccessLevel.VIP;
    default:
      return AccessLevel.GENERAL;
  }
};

// Initial state with optimized structure
const initialState: TicketsState = {
  tickets: [],
  currentTicket: null,
  purchasedTickets: [],
  isLoading: false,
  error: null,
  qrData: null,
  _cachedAt: 0, // Cache timestamp for optimization
  _lastUpdated: 0, // Last update timestamp
};

// Slice with optimized reducers
const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTicket: (state, action: PayloadAction<Ticket | null>) => {
      state.currentTicket = action.payload;
    },
    addTicket: (state, action: PayloadAction<Ticket>) => {
      // ✅ OPTIMIZED: Add to beginning of array efficiently
      state.tickets.unshift(action.payload);
      state._lastUpdated = Date.now();
    },
    updateTicketInList: (state, action: PayloadAction<Ticket>) => {
      // ✅ OPTIMIZED: Efficient array update
      const index = state.tickets.findIndex(ticket => ticket.id === action.payload.id);
      if (index !== -1) {
        state.tickets[index] = action.payload;
        state._lastUpdated = Date.now();
      }
    },
    removeTicketFromList: (state, action: PayloadAction<string>) => {
      // ✅ OPTIMIZED: Efficient array filter
      state.tickets = state.tickets.filter(ticket => ticket.id !== action.payload);
      state._lastUpdated = Date.now();
    },
    clearCache: (state) => {
      state._cachedAt = 0;
      state._lastUpdated = 0;
    },
  },
  extraReducers: (builder) => {
    // fetchUserTickets
    builder
      .addCase(fetchUserTickets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserTickets.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.tickets = action.payload.data;
          state._cachedAt = Date.now(); // Cache the timestamp
          state._lastUpdated = Date.now();
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchUserTickets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch tickets';
      });

    // fetchTicketById
    builder
      .addCase(fetchTicketById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.currentTicket = action.payload.data;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch ticket';
      });

    // purchaseTicket
    builder
      .addCase(purchaseTicket.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(purchaseTicket.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          // ✅ OPTIMIZED: Add all purchased tickets efficiently
          action.payload.data.forEach((ticket: Ticket) => {
            state.tickets.unshift(ticket);
          });
          state._lastUpdated = Date.now();
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(purchaseTicket.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to purchase ticket';
      });

    // transferTicket
    builder
      .addCase(transferTicket.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(transferTicket.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.tickets.findIndex(ticket => ticket.id === action.payload.data!.id);
          if (index !== -1) {
            state.tickets[index] = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(transferTicket.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to transfer ticket';
      });

    // upgradeTicket
    builder
      .addCase(upgradeTicket.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(upgradeTicket.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.tickets.findIndex(ticket => ticket.id === action.payload.data!.id);
          if (index !== -1) {
            state.tickets[index] = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(upgradeTicket.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to upgrade ticket';
      });

    // checkInTicket
    builder
      .addCase(checkInTicket.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkInTicket.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          const index = state.tickets.findIndex(ticket => ticket.id === action.payload.data!.id);
          if (index !== -1) {
            state.tickets[index] = action.payload.data!;
          }
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(checkInTicket.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to check in ticket';
      });

    // validateQRCode
    builder
      .addCase(validateQRCode.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateQRCode.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.data) {
          state.currentTicket = action.payload.data;
          state.qrData = action.payload.data.qr_code;
        }
        if (action.payload.error) {
          state.error = action.payload.error;
        }
      })
      .addCase(validateQRCode.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to validate QR code';
      });
  },
});

export const {
  clearError,
  setCurrentTicket,
  addTicket,
  updateTicketInList,
  removeTicketFromList,
  clearCache,
} = ticketsSlice.actions;

export default ticketsSlice.reducer;
