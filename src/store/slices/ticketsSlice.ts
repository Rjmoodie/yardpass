import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// import { TicketOwned } from '@yardpass/types';

// Temporary type until packages are built
interface TicketOwned {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  ticketType: string;
  price: number;
  status: 'active' | 'used' | 'expired';
  qrCode: string;
}

interface TicketsState {
  ownedTickets: TicketOwned[];
  selectedTicket: TicketOwned | null;
}

const initialState: TicketsState = {
  ownedTickets: [],
  selectedTicket: null,
};

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    setOwnedTickets: (state, action: PayloadAction<TicketOwned[]>) => {
      state.ownedTickets = action.payload;
    },
    setSelectedTicket: (state, action: PayloadAction<TicketOwned | null>) => {
      state.selectedTicket = action.payload;
    },
    addTicket: (state, action: PayloadAction<TicketOwned>) => {
      state.ownedTickets = [action.payload, ...state.ownedTickets];
    },
    updateTicket: (state, action: PayloadAction<{ id: string; updates: Partial<TicketOwned> }>) => {
      const index = state.ownedTickets.findIndex(ticket => ticket.id === action.payload.id);
      if (index !== -1) {
        state.ownedTickets[index] = { ...state.ownedTickets[index], ...action.payload.updates };
      }
    },
  },
});

export const { setOwnedTickets, setSelectedTicket, addTicket, updateTicket } = ticketsSlice.actions;
export default ticketsSlice.reducer;

