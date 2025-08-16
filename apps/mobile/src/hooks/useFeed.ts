import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
// import { apiClient, queryKeys } from '@yardpass/api';
// import { FeedFilter, FeedItem } from '@yardpass/types';

// Temporary types until packages are built
interface FeedFilter {
  type: 'all' | 'following' | 'trending' | 'nearby';
  cursor?: string;
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

// Temporary API client until packages are built
const apiClient = {
  getFeed: async (filter: FeedFilter) => ({ 
    data: { 
      items: [], 
      meta: { cursor: null } 
    } 
  }),
};

const queryKeys = {
  feed: {
    list: (filter: FeedFilter) => ['feed', filter],
  },
};

export const useFeed = {
  fetchFeed: async (filter: FeedFilter) => {
    const response = await apiClient.getFeed(filter);
    return response.data;
  },

  useFeed: (filter: FeedFilter) => {
    return useInfiniteQuery({
      queryKey: queryKeys.feed.list(filter),
      queryFn: ({ pageParam }) => useFeed.fetchFeed({ ...filter, cursor: pageParam }),
      getNextPageParam: (lastPage) => lastPage.meta?.cursor,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
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

