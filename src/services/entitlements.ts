import { apiGateway } from './api';

export interface EntitlementsResponse {
  access: 'none' | 'general' | 'vip' | 'crew';
}

export class EntitlementsService {
  /**
   * Get user's access level for a specific event
   */
  static async getUserAccessLevel(eventId: string): Promise<EntitlementsResponse> {
    try {
      const response = await apiGateway.get(`/functions/v1/get-entitlements?eventId=${eventId}`);
      
      if (response.success) {
        return response.data;
      } else {
        console.error('Failed to get entitlements:', response.error);
        return { access: 'none' };
      }
    } catch (error) {
      console.error('Error getting entitlements:', error);
      return { access: 'none' };
    }
  }

  /**
   * Check if user can access content with a specific access level
   */
  static canAccessContent(userAccess: string, requiredAccess: string): boolean {
    const accessHierarchy = {
      'none': 0,
      'general': 1,
      'vip': 2,
      'crew': 3
    };

    const userLevel = accessHierarchy[userAccess as keyof typeof accessHierarchy] || 0;
    const requiredLevel = accessHierarchy[requiredAccess as keyof typeof accessHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Get access level for multiple events (batch request)
   */
  static async getBatchAccessLevels(eventIds: string[]): Promise<Record<string, string>> {
    const accessLevels: Record<string, string> = {};
    
    // For now, make individual requests
    // TODO: Implement batch endpoint if needed
    const promises = eventIds.map(async (eventId) => {
      const response = await this.getUserAccessLevel(eventId);
      accessLevels[eventId] = response.access;
    });

    await Promise.all(promises);
    return accessLevels;
  }
}
