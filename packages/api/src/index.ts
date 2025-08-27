/**
 * @deprecated Traditional API services are deprecated. Use Edge Functions via ApiGateway instead.
 * 
 * MIGRATION GUIDE:
 * OLD: import { EventsService, TicketsService } from '@yardpass/api';
 * 
 * NEW: import { apiGateway } from '@yardpass/api';
 * 
 * Benefits of Edge Functions:
 * - Better security (RLS enforcement)
 * - Serverless auto-scaling
 * - Real-time capabilities
 * - Consistent response formats
 * - Lower infrastructure costs
 */

// Export the new API Gateway (RECOMMENDED)
export { apiGateway, ApiGateway } from './gateway';
export type { EdgeFunctionResponse } from './gateway';

// Export deprecated traditional services (LEGACY - DO NOT USE)
export { EventsService } from './services/events';
export { TicketsService } from './services/tickets';
export { PostsService } from './services/posts';
export { OrdersService } from './services/orders';
export { SearchService } from './services/search';
export { OrganizationsService } from './services/organizations';
export { CommentsService } from './services/comments';
// UploadService and VideoService removed - use apiGateway.uploadMedia() instead
export { CheckinsService } from './services/checkins';
export { AuthService } from './services/auth';

// Export utilities
export { supabase } from './lib/supabase';
export { ApiError, ApiResponse } from './lib/types';


