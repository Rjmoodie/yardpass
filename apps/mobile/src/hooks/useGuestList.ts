import { useState, useCallback, useEffect } from 'react';
import { GuestListAPI } from '../services/guestList';
import { 
  GuestList, 
  Guest, 
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
  TemplateResponse,
  TemplatesResponse,
  GuestListStatsResponse
} from '@yardpass/types';

// ============================================================================
// GUEST LIST HOOKS
// ============================================================================

export const useGuestLists = (
  filters: GuestListFilters = {},
  page: number = 1,
  limit: number = 20
) => {
  const [guestLists, setGuestLists] = useState<GuestList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchGuestLists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.getGuestLists(filters, page, limit);
      
      if (response.success && response.data) {
        if (page === 1) {
          setGuestLists(response.data);
        } else {
          setGuestLists(prev => [...prev, ...response.data]);
        }
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.error || 'Failed to fetch guest lists');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, limit]);

  const refresh = useCallback(() => {
    setGuestLists([]);
    setHasMore(true);
    fetchGuestLists();
  }, [fetchGuestLists]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchGuestLists();
    }
  }, [isLoading, hasMore, fetchGuestLists]);

  useEffect(() => {
    fetchGuestLists();
  }, [fetchGuestLists]);

  return {
    guestLists,
    isLoading,
    error,
    hasMore,
    refresh,
    loadMore
  };
};

export const useGuestList = (guestListId: string) => {
  const [guestList, setGuestList] = useState<GuestList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuestList = useCallback(async () => {
    if (!guestListId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.getGuestList(guestListId);
      
      if (response.success && response.data) {
        setGuestList(response.data);
      } else {
        setError(response.error || 'Failed to fetch guest list');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [guestListId]);

  const updateGuestList = useCallback(async (data: UpdateGuestListRequest) => {
    if (!guestListId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.updateGuestList(guestListId, data);
      
      if (response.success && response.data) {
        setGuestList(response.data);
        return response;
      } else {
        setError(response.error || 'Failed to update guest list');
        return response;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [guestListId]);

  const deleteGuestList = useCallback(async () => {
    if (!guestListId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.deleteGuestList(guestListId);
      
      if (response.success) {
        setGuestList(null);
        return response;
      } else {
        setError(response.error || 'Failed to delete guest list');
        return response;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [guestListId]);

  useEffect(() => {
    fetchGuestList();
  }, [fetchGuestList]);

  return {
    guestList,
    isLoading,
    error,
    refresh: fetchGuestList,
    updateGuestList,
    deleteGuestList
  };
};

export const useCreateGuestList = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGuestList = useCallback(async (data: CreateGuestListRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.createGuestList(data);
      
      if (!response.success) {
        setError(response.error || 'Failed to create guest list');
      }
      
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createGuestList,
    isLoading,
    error
  };
};

// ============================================================================
// GUEST MANAGEMENT HOOKS
// ============================================================================

export const useGuests = (
  guestListId: string,
  filters: GuestFilters = {},
  page: number = 1,
  limit: number = 50
) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchGuests = useCallback(async () => {
    if (!guestListId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.getGuests(guestListId, filters, page, limit);
      
      if (response.success && response.data) {
        if (page === 1) {
          setGuests(response.data);
        } else {
          setGuests(prev => [...prev, ...response.data]);
        }
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.error || 'Failed to fetch guests');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [guestListId, filters, page, limit]);

  const addGuests = useCallback(async (data: AddGuestsRequest) => {
    if (!guestListId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.addGuests(guestListId, data);
      
      if (response.success && response.data) {
        setGuests(prev => [...response.data, ...prev]);
        return response;
      } else {
        setError(response.error || 'Failed to add guests');
        return response;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [guestListId]);

  const updateGuest = useCallback(async (guestId: string, data: UpdateGuestRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.updateGuest(guestId, data);
      
      if (response.success && response.data) {
        setGuests(prev => prev.map(guest => 
          guest.id === guestId ? response.data : guest
        ));
        return response;
      } else {
        setError(response.error || 'Failed to update guest');
        return response;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeGuest = useCallback(async (guestId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.removeGuest(guestId);
      
      if (response.success) {
        setGuests(prev => prev.filter(guest => guest.id !== guestId));
        return response;
      } else {
        setError(response.error || 'Failed to remove guest');
        return response;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setGuests([]);
    setHasMore(true);
    fetchGuests();
  }, [fetchGuests]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchGuests();
    }
  }, [isLoading, hasMore, fetchGuests]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  return {
    guests,
    isLoading,
    error,
    hasMore,
    addGuests,
    updateGuest,
    removeGuest,
    refresh,
    loadMore
  };
};

// ============================================================================
// INVITATION HOOKS
// ============================================================================

export const useInvitations = (guestListId: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendInvitations = useCallback(async (data: SendInvitationsRequest) => {
    if (!guestListId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.sendInvitations(guestListId, data);
      
      if (!response.success) {
        setError(response.error || 'Failed to send invitations');
      }
      
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [guestListId]);

  return {
    sendInvitations,
    isLoading,
    error
  };
};

export const useRSVP = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processRSVP = useCallback(async (data: RSVPRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.processRSVP(data);
      
      if (!response.success) {
        setError(response.error || 'Failed to process RSVP');
      }
      
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    processRSVP,
    isLoading,
    error
  };
};

// ============================================================================
// TEMPLATE HOOKS
// ============================================================================

export const useTemplates = (
  includePublic: boolean = true,
  page: number = 1,
  limit: number = 20
) => {
  const [templates, setTemplates] = useState<GuestListTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.getTemplates(includePublic, page, limit);
      
      if (response.success && response.data) {
        if (page === 1) {
          setTemplates(response.data);
        } else {
          setTemplates(prev => [...prev, ...response.data]);
        }
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.error || 'Failed to fetch templates');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [includePublic, page, limit]);

  const createTemplate = useCallback(async (data: CreateTemplateRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.createTemplate(data);
      
      if (response.success && response.data) {
        setTemplates(prev => [response.data, ...prev]);
        return response;
      } else {
        setError(response.error || 'Failed to create template');
        return response;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setTemplates([]);
    setHasMore(true);
    fetchTemplates();
  }, [fetchTemplates]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchTemplates();
    }
  }, [isLoading, hasMore, fetchTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    hasMore,
    createTemplate,
    refresh,
    loadMore
  };
};

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

export const useGuestListStats = (guestListId: string) => {
  const [stats, setStats] = useState<GuestListStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!guestListId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.getGuestListStats(guestListId);
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [guestListId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats
  };
};

export const useOrganizerAnalytics = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await GuestListAPI.getOrganizerAnalytics();
      
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        setError(response.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refresh: fetchAnalytics
  };
};
