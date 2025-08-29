import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
// import { apiClient, queryKeys } from '@yardpass/api';
// import { FeedFilter, FeedItem } from '@yardpass/types';

// Temporary types until packages are built
interface FeedFilter {
  type: 'all' | 'following' | 'trending' | 'nearby' | 'for_you' | 'near_me';
  cursor?: string;
  limit?: number;
}

interface FeedItem {
  id: string;
  type: 'video' | 'image' | 'text';
  content: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
}

interface FeedResponse {
  items: FeedItem[];
  meta: {
    cursor: string | null;
  };
}

// Temporary API client until packages are built
const apiClient = {
  getFeed: async (filter: FeedFilter): Promise<FeedResponse> => ({ 
    items: [], 
    meta: { cursor: null } 
  }),
};

const queryKeys = {
  feed: {
    list: (filter: FeedFilter) => ['feed', filter],
  },
};

export const useFeed = {
  fetchFeed: async (filter: FeedFilter): Promise<FeedResponse> => {
    const response = await apiClient.getFeed(filter);
    return response;
  },

  useFeed: (filter: FeedFilter) => {
    return useInfiniteQuery({
      queryKey: queryKeys.feed.list(filter),
      queryFn: ({ pageParam }) => useFeed.fetchFeed({ ...filter, cursor: pageParam as string }),
      getNextPageParam: (lastPage: FeedResponse) => lastPage.meta?.cursor,
      initialPageParam: '',
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
    });
  },

  useFeedItems: (filter: FeedFilter) => {
    const query = useFeed.useFeed(filter);
    
    const items: FeedItem[] = query.data?.pages.flatMap(page => page.items) || [];
    
    return {
      ...query,
      items,
    };
  },
};

