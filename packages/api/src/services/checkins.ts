import { supabase } from '../lib/supabase';
import { Checkin, ApiResponse, GeoPoint } from '@yardpass/types';

export class CheckinService {
  /**
   * Check in a user to an event using QR code
   */
  static async checkIn(
    qrCode: string,
    userId: string,
    location?: GeoPoint
  ): Promise<ApiResponse<Checkin>> {
    try {
      // Find the ticket by QR code
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets_owned')
        .select(`
          *,
          tickets!tickets_owned_ticket_id_fkey(
            *,
            events!tickets_event_id_fkey(
              id,
              name,
              start_time,
              end_time,
              location
            )
          )
        `)
        .eq('qr_code', qrCode)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Invalid QR code or ticket not found');
      }

      // Check if ticket belongs to the user
      if (ticket.user_id !== userId) {
        throw new Error('Ticket does not belong to this user');
      }

      // Check if ticket is already used
      if (ticket.status === 'used') {
        throw new Error('Ticket has already been used');
      }

      // Check if event is currently active
      const event = ticket.tickets.events;
      const now = new Date();
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      if (now < eventStart) {
        throw new Error('Event has not started yet');
      }

      if (now > eventEnd) {
        throw new Error('Event has already ended');
      }

      // Create checkin record
      const checkinData: Omit<Checkin, 'id' | 'created_at'> = {
        user_id: userId,
        ticket_id: ticket.ticket_id,
        event_id: event.id,
        qr_code: qrCode,
        location: location || null,
        checkin_time: new Date().toISOString(),
        status: 'checked_in',
      };

      const { data: checkin, error: checkinError } = await supabase
        .from('checkins')
        .insert(checkinData)
        .select()
        .single();

      if (checkinError) {
        throw new Error(`Failed to create checkin: ${checkinError.message}`);
      }

      // Update ticket status to used
      const { error: updateError } = await supabase
        .from('tickets_owned')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (updateError) {
        console.error('Failed to update ticket status:', updateError);
      }

      return {
        success: true,
        data: checkin,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Check-in failed',
      };
    }
  }

  /**
   * Get checkins for an event
   */
  static async getByEventId(
    eventId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<Checkin[]>> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select(`
          *,
          users!checkins_user_id_fkey(
            id,
            handle,
            display_name,
            avatar_url
          ),
          tickets_owned!checkins_ticket_id_fkey(
            *,
            tickets!tickets_owned_ticket_id_fkey(
              name,
              price
            )
          )
        `)
        .eq('event_id', eventId)
        .order('checkin_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch event checkins: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch event checkins',
      };
    }
  }

  /**
   * Get checkins for a user
   */
  static async getByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ApiResponse<Checkin[]>> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select(`
          *,
          events!checkins_event_id_fkey(
            id,
            name,
            slug,
            start_time,
            end_time,
            location
          ),
          tickets_owned!checkins_ticket_id_fkey(
            *,
            tickets!tickets_owned_ticket_id_fkey(
              name,
              price
            )
          )
        `)
        .eq('user_id', userId)
        .order('checkin_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch user checkins: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user checkins',
      };
    }
  }

  /**
   * Get checkin by ID
   */
  static async getById(id: string): Promise<ApiResponse<Checkin>> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select(`
          *,
          users!checkins_user_id_fkey(
            id,
            handle,
            display_name,
            avatar_url
          ),
          events!checkins_event_id_fkey(
            id,
            name,
            slug,
            start_time,
            end_time,
            location
          ),
          tickets_owned!checkins_ticket_id_fkey(
            *,
            tickets!tickets_owned_ticket_id_fkey(
              name,
              price
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch checkin: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch checkin',
      };
    }
  }

  /**
   * Update checkin status
   */
  static async updateStatus(id: string, status: Checkin['status']): Promise<ApiResponse<Checkin>> {
    try {
      const { data, error } = await supabase
        .from('checkins')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update checkin status: ${error.message}`);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update checkin status',
      };
    }
  }

  /**
   * Get checkin statistics for an event
   */
  static async getEventStats(eventId: string): Promise<ApiResponse<{
    totalCheckins: number;
    uniqueAttendees: number;
    checkinRate: number;
    totalTickets: number;
  }>> {
    try {
      // Get total checkins
      const { count: totalCheckins } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      // Get unique attendees
      const { count: uniqueAttendees } = await supabase
        .from('checkins')
        .select('user_id', { count: 'exact', head: true })
        .eq('event_id', eventId);

      // Get total tickets sold for this event
      const { count: totalTickets } = await supabase
        .from('tickets_owned')
        .select('*', { count: 'exact', head: true })
        .eq('tickets.events.id', eventId);

      const checkinRate = totalTickets ? (totalCheckins / totalTickets) * 100 : 0;

      return {
        success: true,
        data: {
          totalCheckins: totalCheckins || 0,
          uniqueAttendees: uniqueAttendees || 0,
          checkinRate: Math.round(checkinRate * 100) / 100,
          totalTickets: totalTickets || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch event stats',
      };
    }
  }

  /**
   * Get checkin statistics for a user
   */
  static async getUserStats(userId: string): Promise<ApiResponse<{
    totalCheckins: number;
    eventsAttended: number;
    lastCheckin: string | null;
  }>> {
    try {
      // Get total checkins
      const { count: totalCheckins } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get unique events attended
      const { count: eventsAttended } = await supabase
        .from('checkins')
        .select('event_id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get last checkin
      const { data: lastCheckin } = await supabase
        .from('checkins')
        .select('checkin_time')
        .eq('user_id', userId)
        .order('checkin_time', { ascending: false })
        .limit(1)
        .single();

      return {
        success: true,
        data: {
          totalCheckins: totalCheckins || 0,
          eventsAttended: eventsAttended || 0,
          lastCheckin: lastCheckin?.checkin_time || null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user stats',
      };
    }
  }

  /**
   * Validate QR code without checking in
   */
  static async validateQRCode(qrCode: string): Promise<ApiResponse<{
    isValid: boolean;
    ticket?: any;
    event?: any;
    message: string;
  }>> {
    try {
      const { data: ticket, error } = await supabase
        .from('tickets_owned')
        .select(`
          *,
          tickets!tickets_owned_ticket_id_fkey(
            *,
            events!tickets_event_id_fkey(
              id,
              name,
              start_time,
              end_time,
              location
            )
          )
        `)
        .eq('qr_code', qrCode)
        .single();

      if (error || !ticket) {
        return {
          success: true,
          data: {
            isValid: false,
            message: 'Invalid QR code',
          },
        };
      }

      const event = ticket.tickets.events;
      const now = new Date();
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      if (ticket.status === 'used') {
        return {
          success: true,
          data: {
            isValid: false,
            ticket,
            event,
            message: 'Ticket has already been used',
          },
        };
      }

      if (now < eventStart) {
        return {
          success: true,
          data: {
            isValid: false,
            ticket,
            event,
            message: 'Event has not started yet',
          },
        };
      }

      if (now > eventEnd) {
        return {
          success: true,
          data: {
            isValid: false,
            ticket,
            event,
            message: 'Event has already ended',
          },
        };
      }

      return {
        success: true,
        data: {
          isValid: true,
          ticket,
          event,
          message: 'QR code is valid',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'QR code validation failed',
      };
    }
  }
}


