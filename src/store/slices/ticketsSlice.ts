import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase, TABLES, formatResponse, generateQRData } from '@/services/supabase';
import { Ticket, TicketsState, TicketType, TicketStatus, AccessLevel } from '@/types';

// Async thunks
export const fetchUserTickets = createAsyncThunk(
  'tickets/fetchUserTickets',
  async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from(TABLES.TICKETS)
      .select(`
        *,
        event:events(*),
        user:users(*)
      `)
      .eq('userId', userId)
      .order('purchaseDate', { ascending: false });

    return formatResponse(data, error);
  }
);

export const fetchTicketById = createAsyncThunk(
  'tickets/fetchTicketById',
  async (ticketId: string) => {
    const { data, error } = await supabase
      .from(TABLES.TICKETS)
      .select(`
        *,
        event:events(*),
        user:users(*)
      `)
      .eq('id', ticketId)
      .single();

    return formatResponse(data, error);
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
  }) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get event details for pricing
    const { data: event } = await supabase
      .from(TABLES.EVENTS)
      .select('*')
      .eq('id', eventId)
      .single();

    if (!event) throw new Error('Event not found');

    // Calculate total price (this would integrate with Stripe in production)
    const basePrice = getTicketPrice(ticketType);
    const addOnsPrice = addOns.reduce((total, addOnId) => total + 10, 0); // Mock add-on price
    const totalPrice = (basePrice + addOnsPrice) * quantity;

    // Create tickets
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticketData = {
        eventId,
        userId,
        ticketType,
        accessLevel: getAccessLevel(ticketType),
        price: basePrice + addOnsPrice,
        currency: 'USD',
        status: TicketStatus.ACTIVE,
        qrCode: generateQRData(`ticket_${Date.now()}_${i}`, eventId),
        purchaseDate: new Date().toISOString(),
        validFrom: event.startDate,
        validUntil: event.endDate,
        isTransferable: true,
        addOns: addOns.map(addOnId => ({ id: addOnId, name: 'Add-on', description: 'Event add-on', price: 10, type: 'merch' })),
      };

      const { data: ticket, error } = await supabase
        .from(TABLES.TICKETS)
        .insert([ticketData])
        .select(`
          *,
          event:events(*),
          user:users(*)
        `)
        .single();

      if (error) throw error;
      tickets.push(ticket);
    }

    return formatResponse(tickets, null);
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
  async (qrData: string) => {
    try {
      const { ticketId, eventId, timestamp } = JSON.parse(qrData);
      
      // Check if QR code is not too old (e.g., 24 hours)
      const qrAge = Date.now() - timestamp;
      if (qrAge > 24 * 60 * 60 * 1000) {
        throw new Error('QR code expired');
      }

      const { data, error } = await supabase
        .from(TABLES.TICKETS)
        .select(`
          *,
          event:events(*),
          user:users(*)
        `)
        .eq('id', ticketId)
        .eq('eventId', eventId)
        .eq('status', TicketStatus.ACTIVE)
        .single();

      if (error || !data) {
        throw new Error('Invalid ticket');
      }

      return formatResponse(data, null);
    } catch (error) {
      return formatResponse(null, error);
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

// Initial state
const initialState: TicketsState = {
  tickets: [],
  currentTicket: null,
  purchasedTickets: [],
  isLoading: false,
  error: null,
  qrData: null,
};

// Slice
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
      state.tickets.unshift(action.payload);
    },
    updateTicketInList: (state, action: PayloadAction<Ticket>) => {
      const index = state.tickets.findIndex(ticket => ticket.id === action.payload.id);
      if (index !== -1) {
        state.tickets[index] = action.payload;
      }
    },
    removeTicketFromList: (state, action: PayloadAction<string>) => {
      state.tickets = state.tickets.filter(ticket => ticket.id !== action.payload);
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
          // Add all purchased tickets to the list
          action.payload.data.forEach((ticket: Ticket) => {
            state.tickets.unshift(ticket);
          });
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
} = ticketsSlice.actions;

export default ticketsSlice.reducer;
