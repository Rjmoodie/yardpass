import { supabase } from '../lib/supabase';
import { Ticket, TicketOwned, ApiResponse, ApiError } from '@yardpass/types';

export class TicketsService {
  /**
   * Get owned tickets for user
   */
  static async getOwnedTickets(userId: string): Promise<ApiResponse<TicketOwned[]>> {
    try {
      const { data, error } = await supabase
        .from('tickets_owned')
        .select(`
          *,
          ticket:tickets(*),
          event:events(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data as TicketOwned[],
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_OWNED_TICKETS_FAILED',
        message: error.message || 'Failed to get owned tickets',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Get ticket by QR code
   */
  static async getTicketByQR(qrCode: string): Promise<ApiResponse<TicketOwned>> {
    try {
      const { data, error } = await supabase
        .from('tickets_owned')
        .select(`
          *,
          ticket:tickets(*),
          event:events(*)
        `)
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;

      return {
        data: data as TicketOwned,
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'GET_TICKET_BY_QR_FAILED',
        message: error.message || 'Failed to get ticket by QR code',
        details: error,
      };

      throw apiError;
    }
  }

  /**
   * Mark ticket as used
   */
  static async markTicketAsUsed(ticketId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await supabase
        .from('tickets_owned')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      return {
        data: { success: true },
      };
    } catch (error: any) {
      const apiError: ApiError = {
        code: 'MARK_TICKET_USED_FAILED',
        message: error.message || 'Failed to mark ticket as used',
        details: error,
      };

      throw apiError;
    }
  }
}


