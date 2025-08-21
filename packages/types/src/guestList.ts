// YardPass Guest List Types
// Comprehensive type definitions for guest list management

// ============================================================================
// CORE GUEST LIST TYPES
// ============================================================================

export interface GuestList {
  id: string;
  event_id: string;
  organizer_id: string;
  name: string;
  description?: string;
  max_guests?: number;
  is_active: boolean;
  settings: GuestListSettings;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  event?: Event;
  organizer?: User;
  guests?: Guest[];
  stats?: GuestListStats;
}

export interface Guest {
  id: string;
  guest_list_id: string;
  email?: string;
  phone?: string;
  name: string;
  status: GuestStatus;
  rsvp_at?: string;
  notes?: string;
  metadata: GuestMetadata;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  guest_list?: GuestList;
  invitations?: GuestInvitation[];
}

export interface GuestInvitation {
  id: string;
  guest_id: string;
  invited_by: string;
  invitation_code: string;
  sent_at: string;
  responded_at?: string;
  status: InvitationStatus;
  delivery_method: DeliveryMethod;
  expires_at?: string;
  metadata: InvitationMetadata;
  
  // Computed fields
  guest?: Guest;
  invited_by_user?: User;
}

export interface GuestListTemplate {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  template_data: TemplateData;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  organizer?: User;
}

// ============================================================================
// ENUM TYPES
// ============================================================================

export type GuestStatus = 'invited' | 'confirmed' | 'declined' | 'maybe' | 'attended';

export type InvitationStatus = 'sent' | 'delivered' | 'opened' | 'responded' | 'expired';

export type DeliveryMethod = 'email' | 'sms' | 'push';

export type GuestCategory = 'VIP' | 'General' | 'Press' | 'Staff' | 'VIP' | 'Media' | 'Influencer' | 'Partner';

// ============================================================================
// SETTINGS & METADATA TYPES
// ============================================================================

export interface GuestListSettings {
  categories?: GuestCategory[];
  default_notes?: string;
  auto_reminder?: boolean;
  reminder_days?: number[];
  allow_plus_ones?: boolean;
  max_plus_ones?: number;
  require_rsvp?: boolean;
  rsvp_deadline?: string;
  custom_fields?: CustomField[];
  notification_settings?: NotificationSettings;
}

export interface GuestMetadata {
  category?: GuestCategory;
  plus_ones?: number;
  dietary_restrictions?: string[];
  accessibility_needs?: string[];
  special_requests?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface InvitationMetadata {
  delivery_attempts?: number;
  last_delivery_attempt?: string;
  bounce_reason?: string;
  open_count?: number;
  click_count?: number;
  device_info?: DeviceInfo;
}

export interface TemplateData {
  categories: GuestCategory[];
  default_notes: string;
  auto_reminder: boolean;
  reminder_days: number[];
  allow_plus_ones: boolean;
  max_plus_ones: number;
  require_rsvp: boolean;
  custom_fields: CustomField[];
  notification_settings: NotificationSettings;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface GuestListStats {
  total_guests: number;
  confirmed_guests: number;
  declined_guests: number;
  maybe_guests: number;
  attended_guests: number;
  pending_guests: number;
  response_rate: number;
  attendance_rate: number;
  last_updated: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'date';
  required: boolean;
  options?: string[];
  default_value?: any;
}

export interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  reminder_frequency: 'daily' | 'weekly' | 'custom';
  reminder_times: string[];
}

export interface DeviceInfo {
  user_agent?: string;
  ip_address?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateGuestListRequest {
  event_id: string;
  name: string;
  description?: string;
  max_guests?: number;
  settings?: Partial<GuestListSettings>;
}

export interface UpdateGuestListRequest {
  name?: string;
  description?: string;
  max_guests?: number;
  is_active?: boolean;
  settings?: Partial<GuestListSettings>;
}

export interface AddGuestsRequest {
  guests: AddGuestData[];
  send_invitations?: boolean;
  invitation_settings?: InvitationSettings;
}

export interface AddGuestData {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  category?: GuestCategory;
  metadata?: Partial<GuestMetadata>;
}

export interface InvitationSettings {
  delivery_method: DeliveryMethod;
  expires_in_days?: number;
  custom_message?: string;
  send_reminders?: boolean;
}

export interface UpdateGuestRequest {
  name?: string;
  email?: string;
  phone?: string;
  status?: GuestStatus;
  notes?: string;
  metadata?: Partial<GuestMetadata>;
}

export interface SendInvitationsRequest {
  guest_ids?: string[];
  settings: InvitationSettings;
}

export interface RSVPRequest {
  invitation_code: string;
  status: 'confirmed' | 'declined' | 'maybe';
  notes?: string;
  plus_ones?: number;
  custom_fields?: Record<string, any>;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  template_data: TemplateData;
  is_public?: boolean;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GuestListResponse {
  success: boolean;
  data?: GuestList;
  error?: string;
  message?: string;
}

export interface GuestListsResponse {
  success: boolean;
  data?: GuestList[];
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface GuestResponse {
  success: boolean;
  data?: Guest;
  error?: string;
  message?: string;
}

export interface GuestsResponse {
  success: boolean;
  data?: Guest[];
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface InvitationResponse {
  success: boolean;
  data?: GuestInvitation;
  error?: string;
  message?: string;
}

export interface TemplateResponse {
  success: boolean;
  data?: GuestListTemplate;
  error?: string;
  message?: string;
}

export interface TemplatesResponse {
  success: boolean;
  data?: GuestListTemplate[];
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface GuestListStatsResponse {
  success: boolean;
  data?: GuestListStats;
  error?: string;
  message?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface GuestListFilters {
  event_id?: string;
  organizer_id?: string;
  is_active?: boolean;
  status?: GuestStatus[];
  search?: string;
  category?: GuestCategory;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface GuestFilters {
  guest_list_id?: string;
  status?: GuestStatus[];
  category?: GuestCategory;
  search?: string;
  has_email?: boolean;
  has_phone?: boolean;
  rsvp_date_range?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// EVENT TYPES (for integration)
// ============================================================================

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  location?: string;
  organizer_id: string;
  // Add other event fields as needed
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  // Add other user fields as needed
}
