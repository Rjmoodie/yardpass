import { NavigatorScreenParams } from '@react-navigation/native';

// Root Stack Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  // Modal screens
  EventDetails: { eventId: string };
  PostDetails: { postId: string };
  UserProfile: { userId: string };
  CreatePost: undefined;
  EventCreation: undefined;
  Camera: undefined;
  Gallery: undefined;
  Settings: undefined;
  Notifications: undefined;
  Messages: undefined;
  Search: undefined;
  Comments: { postId: string };
  FollowersFollowing: { userId: string; type: 'followers' | 'following' };
  EditProfile: undefined;
  Help: undefined;
  Privacy: undefined;
  Terms: undefined;
  About: undefined;
  // Ticket screens
  TicketPurchase: { eventId: string };
  TicketDetails: { ticketId: string };
  // Organizer screens
  OrganizerDashboard: undefined;
  EventEditor: { eventId?: string };
  MediaScheduler: { eventId: string };
  Analytics: { eventId?: string };
  // Additional screens for navigation
  EventDetail: { event: any };
  TicketDetail: { ticket: any };
  OrganizerDetail: { organizerId: string };
  PostDetail: { postId: string };
};

// Auth Stack Navigator
export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ResetPassword: undefined;
  AuthPrompt: {
    action: string;
    title: string;
    message: string;
    primaryAction: string;
    secondaryAction: string;
    onSuccess?: () => void;
  };
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Create: undefined;
  Wallet: undefined;
  Profile: undefined;
};

// Navigation prop types
export type RootNavigationProp = import('@react-navigation/native').NavigationProp<RootStackParamList>;
export type AuthNavigationProp = import('@react-navigation/native').NavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = import('@react-navigation/native').NavigationProp<MainTabParamList>;

// Route prop types
export type RootRouteProp<T extends keyof RootStackParamList> = import('@react-navigation/native').RouteProp<RootStackParamList, T>;
export type AuthRouteProp<T extends keyof AuthStackParamList> = import('@react-navigation/native').RouteProp<AuthStackParamList, T>;
export type MainTabRouteProp<T extends keyof MainTabParamList> = import('@react-navigation/native').RouteProp<MainTabParamList, T>;
