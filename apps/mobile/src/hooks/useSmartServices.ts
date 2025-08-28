// Hook for using smart services

import { useState, useEffect } from 'react';
import { SmartServices, RecommendationFilters, Recommendation } from '@/services/smartServices';

export const useSmartServices = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = async (filters: RecommendationFilters) => {
    setLoading(true);
    setError(null);
    try {
      const results = await SmartServices.getRecommendations(filters);
      setRecommendations(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const analyzeUserBehavior = async (userId: string) => {
    try {
      return await SmartServices.analyzeUserBehavior(userId);
    } catch (err) {
      console.error('Failed to analyze user behavior:', err);
      return null;
    }
  };

  const getPersonalizedContent = async (userId: string) => {
    try {
      return await SmartServices.getPersonalizedContent(userId);
    } catch (err) {
      console.error('Failed to get personalized content:', err);
      return [];
    }
  };

  return {
    recommendations,
    loading,
    error,
    getRecommendations,
    analyzeUserBehavior,
    getPersonalizedContent,
  };
};
