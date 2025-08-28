// Common types used throughout the application

export interface Organizer {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  isVerified: boolean;
  followers: number;
  events: number;
  rating?: number;
  location?: string;
  website?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  // Additional properties used in components
  totalEvents?: number;
  followersCount?: number;
  user?: {
    avatar_url?: string;
  };
  companyName?: string;
  totalRevenue?: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizer: Organizer;
  category: string;
  image?: string;
  price?: number;
  capacity?: number;
  attendees: number;
  isLive?: boolean;
  tags: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  handle: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  isVerified: boolean;
  joinDate: string;
}

export interface Post {
  id: string;
  content: string;
  media?: string[];
  author: User;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  event?: Event;
}

export interface Ticket {
  id: string;
  eventId: string;
  event: Event;
  userId: string;
  user: User;
  type: string;
  price: number;
  purchaseDate: string;
  status: 'active' | 'used' | 'cancelled';
  qrCode?: string;
}
