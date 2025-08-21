import { supabase } from '../lib/supabase';
import { 
  GuestList, 
  Guest, 
  GuestInvitation, 
  GuestListTemplate,
  GuestListStats,
  CreateGuestListRequest,
  UpdateGuestListRequest,
  AddGuestsRequest,
  UpdateGuestRequest,
  SendInvitationsRequest,
  RSVPRequest,
  CreateTemplateRequest,
  GuestListFilters,
  GuestFilters,
  GuestListResponse,
  GuestListsResponse,
  GuestResponse,
  GuestsResponse,
  InvitationResponse,
  TemplateResponse,
  TemplatesResponse,
  GuestListStatsResponse,
  PaginationInfo
} from '@yardpass/types';

export class GuestListService {
  
  // ============================================================================
  // GUEST LIST MANAGEMENT
  // ============================================================================

  /**
   * Create a new guest list for an event
   */
  static async createGuestList(
    organizerId: string, 
    data: CreateGuestListRequest
  ): Promise<GuestListResponse> {
    try {
      const guestListData = {
        event_id: data.event_id,
        organizer_id: organizerId,
        name: data.name,
        description: data.description,
        max_guests: data.max_guests,
        settings: data.settings || {},
        is_active: true
      };

      const { data: guestList, error } = await supabase
        .from('guest_lists')
        .insert(guestListData)
        .select(`
          *,
          event:events(
            id,
            title,
            description,
            start_at,
            end_at,
            location
          ),
          organizer:users(
            id,
            name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: guestList as GuestList,
        message: 'Guest list created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create guest list'
      };
    }
  }

  /**
   * Get guest list by ID
   */
  static async getGuestList(guestListId: string): Promise<GuestListResponse> {
    try {
      const { data: guestList, error } = await supabase
        .from('guest_lists')
        .select(`
          *,
          event:events(
            id,
            title,
            description,
            start_at,
            end_at,
            location
          ),
          organizer:users(
            id,
            name,
            email,
            avatar_url
          ),
          guests:guests(
            id,
            name,
            email,
            phone,
            status,
            rsvp_at,
            notes,
            metadata,
            created_at
          )
        `)
        .eq('id', guestListId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: guestList as GuestList
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch guest list'
      };
    }
  }

  /**
   * Get guest lists for an organizer
   */
  static async getGuestLists(
    organizerId: string,
    filters: GuestListFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<GuestListsResponse> {
    try {
      let query = supabase
        .from('guest_lists')
        .select(`
          *,
          event:events(
            id,
            title,
            start_at,
            end_at
          ),
          organizer:users(
            id,
            name,
            email
          )
        `, { count: 'exact' })
        .eq('organizer_id', organizerId);

      // Apply filters
      if (filters.event_id) {
        query = query.eq('event_id', filters.event_id);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      query = query.order('created_at', { ascending: false });

      const { data: guestLists, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      const pagination: PaginationInfo = {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };

      return {
        success: true,
        data: guestLists as GuestList[],
        pagination
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch guest lists'
      };
    }
  }

  /**
   * Update guest list
   */
  static async updateGuestList(
    guestListId: string,
    data: UpdateGuestListRequest
  ): Promise<GuestListResponse> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: guestList, error } = await supabase
        .from('guest_lists')
        .update(updateData)
        .eq('id', guestListId)
        .select(`
          *,
          event:events(
            id,
            title,
            description,
            start_at,
            end_at,
            location
          ),
          organizer:users(
            id,
            name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: guestList as GuestList,
        message: 'Guest list updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update guest list'
      };
    }
  }

  /**
   * Delete guest list
   */
  static async deleteGuestList(guestListId: string): Promise<GuestListResponse> {
    try {
      const { error } = await supabase
        .from('guest_lists')
        .delete()
        .eq('id', guestListId);

      if (error) throw error;

      return {
        success: true,
        message: 'Guest list deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete guest list'
      };
    }
  }

  // ============================================================================
  // GUEST MANAGEMENT
  // ============================================================================

  /**
   * Add guests to a guest list
   */
  static async addGuests(
    guestListId: string,
    data: AddGuestsRequest
  ): Promise<GuestsResponse> {
    try {
      const guestsData = data.guests.map(guest => ({
        guest_list_id: guestListId,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        notes: guest.notes,
        metadata: {
          category: guest.category,
          ...guest.metadata
        }
      }));

      const { data: guests, error } = await supabase
        .from('guests')
        .insert(guestsData)
        .select(`
          *,
          guest_list:guest_lists(
            id,
            name,
            event:events(
              id,
              title,
              start_at
            )
          )
        `);

      if (error) throw error;

      // Send invitations if requested
      if (data.send_invitations && data.invitation_settings) {
        const guestIds = guests.map(g => g.id);
        await this.sendInvitations(guestListId, {
          guest_ids: guestIds,
          settings: data.invitation_settings
        });
      }

      return {
        success: true,
        data: guests as Guest[],
        message: `${guests.length} guests added successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add guests'
      };
    }
  }

  /**
   * Get guests for a guest list
   */
  static async getGuests(
    guestListId: string,
    filters: GuestFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<GuestsResponse> {
    try {
      let query = supabase
        .from('guests')
        .select(`
          *,
          guest_list:guest_lists(
            id,
            name,
            event:events(
              id,
              title,
              start_at
            )
          ),
          invitations:guest_invitations(
            id,
            status,
            sent_at,
            responded_at
          )
        `, { count: 'exact' })
        .eq('guest_list_id', guestListId);

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.category) {
        query = query.eq('metadata->category', filters.category);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      if (filters.has_email) {
        query = query.not('email', 'is', null);
      }
      if (filters.has_phone) {
        query = query.not('phone', 'is', null);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      query = query.order('created_at', { ascending: false });

      const { data: guests, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      const pagination: PaginationInfo = {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };

      return {
        success: true,
        data: guests as Guest[],
        pagination
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch guests'
      };
    }
  }

  /**
   * Update guest information
   */
  static async updateGuest(
    guestId: string,
    data: UpdateGuestRequest
  ): Promise<GuestResponse> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      if (data.metadata) {
        updateData.metadata = {
          ...data.metadata,
          updated_at: new Date().toISOString()
        };
      }

      const { data: guest, error } = await supabase
        .from('guests')
        .update(updateData)
        .eq('id', guestId)
        .select(`
          *,
          guest_list:guest_lists(
            id,
            name,
            event:events(
              id,
              title,
              start_at
            )
          )
        `)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: guest as Guest,
        message: 'Guest updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update guest'
      };
    }
  }

  /**
   * Remove guest from list
   */
  static async removeGuest(guestId: string): Promise<GuestResponse> {
    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      return {
        success: true,
        message: 'Guest removed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove guest'
      };
    }
  }

  // ============================================================================
  // INVITATION MANAGEMENT
  // ============================================================================

  /**
   * Send invitations to guests
   */
  static async sendInvitations(
    guestListId: string,
    data: SendInvitationsRequest
  ): Promise<InvitationResponse> {
    try {
      // Get guests to invite
      let query = supabase
        .from('guests')
        .select('id, name, email, phone')
        .eq('guest_list_id', guestListId);

      if (data.guest_ids && data.guest_ids.length > 0) {
        query = query.in('id', data.guest_ids);
      }

      const { data: guests, error: guestsError } = await query;
      if (guestsError) throw guestsError;

      if (!guests || guests.length === 0) {
        return {
          success: false,
          error: 'No guests found to invite'
        };
      }

      // Create invitations
      const invitationsData = guests.map(guest => ({
        guest_id: guest.id,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
        invitation_code: `INV-${Math.random().toString(36).substr(2, 8).toUpperCase()}-${Date.now()}`,
        delivery_method: data.settings.delivery_method,
        expires_at: data.settings.expires_in_days 
          ? new Date(Date.now() + data.settings.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
          : null,
        metadata: {
          custom_message: data.settings.custom_message,
          send_reminders: data.settings.send_reminders
        }
      }));

      const { data: invitations, error: invitationsError } = await supabase
        .from('guest_invitations')
        .insert(invitationsData)
        .select(`
          *,
          guest:guests(
            id,
            name,
            email,
            phone
          )
        `);

      if (invitationsError) throw invitationsError;

      // TODO: Send actual invitations via email/SMS
      // This would integrate with your email/SMS service

      return {
        success: true,
        data: invitations[0] as GuestInvitation,
        message: `${invitations.length} invitations sent successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitations'
      };
    }
  }

  /**
   * Process RSVP response
   */
  static async processRSVP(data: RSVPRequest): Promise<GuestResponse> {
    try {
      // Find invitation by code
      const { data: invitation, error: invitationError } = await supabase
        .from('guest_invitations')
        .select(`
          *,
          guest:guests(
            id,
            name,
            email,
            phone,
            status,
            metadata
          )
        `)
        .eq('invitation_code', data.invitation_code)
        .single();

      if (invitationError) throw invitationError;

      if (!invitation) {
        return {
          success: false,
          error: 'Invalid invitation code'
        };
      }

      if (invitation.status === 'expired') {
        return {
          success: false,
          error: 'Invitation has expired'
        };
      }

      // Update guest status
      const updateData: UpdateGuestRequest = {
        status: data.status,
        rsvp_at: new Date().toISOString(),
        notes: data.notes
      };

      if (data.plus_ones) {
        updateData.metadata = {
          ...invitation.guest.metadata,
          plus_ones: data.plus_ones
        };
      }

      if (data.custom_fields) {
        updateData.metadata = {
          ...updateData.metadata,
          custom_fields: data.custom_fields
        };
      }

      const guestResponse = await this.updateGuest(invitation.guest_id, updateData);

      // Update invitation status
      await supabase
        .from('guest_invitations')
        .update({
          status: 'responded',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      return guestResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process RSVP'
      };
    }
  }

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  /**
   * Create guest list template
   */
  static async createTemplate(
    organizerId: string,
    data: CreateTemplateRequest
  ): Promise<TemplateResponse> {
    try {
      const templateData = {
        organizer_id: organizerId,
        name: data.name,
        description: data.description,
        template_data: data.template_data,
        is_public: data.is_public || false
      };

      const { data: template, error } = await supabase
        .from('guest_list_templates')
        .insert(templateData)
        .select(`
          *,
          organizer:users(
            id,
            name,
            email
          )
        `)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: template as GuestListTemplate,
        message: 'Template created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      };
    }
  }

  /**
   * Get templates for an organizer
   */
  static async getTemplates(
    organizerId?: string,
    includePublic: boolean = true,
    page: number = 1,
    limit: number = 20
  ): Promise<TemplatesResponse> {
    try {
      let query = supabase
        .from('guest_list_templates')
        .select(`
          *,
          organizer:users(
            id,
            name,
            email
          )
        `, { count: 'exact' });

      if (organizerId) {
        query = query.eq('organizer_id', organizerId);
      } else if (includePublic) {
        query = query.eq('is_public', true);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      query = query.order('usage_count', { ascending: false });

      const { data: templates, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      const pagination: PaginationInfo = {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };

      return {
        success: true,
        data: templates as GuestListTemplate[],
        pagination
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates'
      };
    }
  }

  // ============================================================================
  // ANALYTICS & STATISTICS
  // ============================================================================

  /**
   * Get guest list statistics
   */
  static async getGuestListStats(guestListId: string): Promise<GuestListStatsResponse> {
    try {
      // Get guest counts by status
      const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select('status')
        .eq('guest_list_id', guestListId);

      if (guestsError) throw guestsError;

      const stats = {
        total_guests: guests.length,
        confirmed_guests: guests.filter(g => g.status === 'confirmed').length,
        declined_guests: guests.filter(g => g.status === 'declined').length,
        maybe_guests: guests.filter(g => g.status === 'maybe').length,
        attended_guests: guests.filter(g => g.status === 'attended').length,
        pending_guests: guests.filter(g => g.status === 'invited').length,
        response_rate: guests.length > 0 
          ? ((guests.filter(g => ['confirmed', 'declined', 'maybe'].includes(g.status)).length / guests.length) * 100)
          : 0,
        attendance_rate: guests.filter(g => g.status === 'confirmed').length > 0
          ? ((guests.filter(g => g.status === 'attended').length / guests.filter(g => g.status === 'confirmed').length) * 100)
          : 0,
        last_updated: new Date().toISOString()
      };

      return {
        success: true,
        data: stats as GuestListStats
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics'
      };
    }
  }

  /**
   * Get organizer guest list analytics
   */
  static async getOrganizerAnalytics(organizerId: string): Promise<any> {
    try {
      // Get all guest lists for organizer
      const { data: guestLists, error: listsError } = await supabase
        .from('guest_lists')
        .select(`
          id,
          name,
          created_at,
          guests:guests(
            id,
            status,
            rsvp_at
          )
        `)
        .eq('organizer_id', organizerId);

      if (listsError) throw listsError;

      // Calculate analytics
      const analytics = {
        total_guest_lists: guestLists.length,
        total_guests: guestLists.reduce((sum, list) => sum + (list.guests?.length || 0), 0),
        average_guests_per_list: guestLists.length > 0 
          ? guestLists.reduce((sum, list) => sum + (list.guests?.length || 0), 0) / guestLists.length
          : 0,
        response_rate: 0,
        lists_created_this_month: guestLists.filter(list => {
          const created = new Date(list.created_at);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length
      };

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      };
    }
  }
}
