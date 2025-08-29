import { supabase } from './supabase';
import { EventCategoryData, EventTag } from '../types';

export class ReferenceDataService {
  /**
   * Fetch all event categories
   */
  static async getEventCategories(): Promise<EventCategoryData[]> {
    try {
      const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event categories:', error);
      return [];
    }
  }

  /**
   * Fetch event tags with optional trending filter
   */
  static async getEventTags(trendingOnly = false): Promise<EventTag[]> {
    try {
      let query = supabase
        .from('event_tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (trendingOnly) {
        query = query.eq('is_trending', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event tags:', error);
      return [];
    }
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug: string): Promise<EventCategoryData | null> {
    try {
      const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching category by slug:', error);
      return null;
    }
  }

  /**
   * Get tag by slug
   */
  static async getTagBySlug(slug: string): Promise<EventTag | null> {
    try {
      const { data, error } = await supabase
        .from('event_tags')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tag by slug:', error);
      return null;
    }
  }

  /**
   * Search categories by name
   */
  static async searchCategories(searchTerm: string): Promise<EventCategoryData[]> {
    try {
      const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching categories:', error);
      return [];
    }
  }

  /**
   * Search tags by name
   */
  static async searchTags(searchTerm: string): Promise<EventTag[]> {
    try {
      const { data, error } = await supabase
        .from('event_tags')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching tags:', error);
      return [];
    }
  }
}
