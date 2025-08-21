import { supabase } from '@yardpass/api';
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

export class GuestListAPI {
  
  // ============================================================================
  // GUEST LIST MANAGEMENT
  // ============================================================================

  /**
   * Create a new guest list for an event
   */
  static async createGuestList(data: CreateGuestListRequest): Promise<GuestListResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/guest-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch guest list'
      };
    }
  }

  /**
   * Get guest lists for current user
   */
  static async getGuestLists(
    filters: GuestListFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<GuestListsResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        )
      });

      const response = await fetch(`/api/guest-lists?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}/guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        )
      });

      const response = await fetch(`/api/guest-lists/${guestListId}/guests?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guests/${guestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guests/${guestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitations'
      };
    }
  }

  /**
   * Process RSVP response (for guests)
   */
  static async processRSVP(data: RSVPRequest): Promise<GuestResponse> {
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
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
  static async createTemplate(data: CreateTemplateRequest): Promise<TemplateResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/guest-list-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      };
    }
  }

  /**
   * Get templates
   */
  static async getTemplates(
    includePublic: boolean = true,
    page: number = 1,
    limit: number = 20
  ): Promise<TemplatesResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        includePublic: includePublic.toString()
      });

      const response = await fetch(`/api/guest-list-templates?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics'
      };
    }
  }

  /**
   * Get organizer analytics
   */
  static async getOrganizerAnalytics(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/guest-lists/analytics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Export guest list to CSV
   */
  static async exportGuestList(guestListId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      if (format === 'csv') {
        return await response.text();
      } else {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to export guest list');
    }
  }

  /**
   * Import guests from CSV
   */
  static async importGuests(guestListId: string, csvData: string): Promise<GuestsResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/guest-lists/${guestListId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: csvData
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import guests'
      };
    }
  }

  /**
   * Bulk update guest statuses
   */
  static async bulkUpdateGuests(
    guestIds: string[],
    updates: Partial<UpdateGuestRequest>
  ): Promise<GuestsResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/guests/bulk-update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          guest_ids: guestIds,
          updates
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update guests'
      };
    }
  }
}
