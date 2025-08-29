import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../services/supabase';

// Custom base query for Supabase
const supabaseBaseQuery = async (args: any) => {
  const { url, method, body, headers } = args;
  
  try {
    const { data, error } = await supabase
      .from(url)
      .select(method === 'GET' ? '*' : '')
      .eq(method === 'GET' ? 'id' : 'id', body?.id || '')
      .single();

    if (error) throw error;
    return { data };
  } catch (error) {
    return { error: { status: 'CUSTOM_ERROR', error: error.message } };
  }
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: supabaseBaseQuery,
  tagTypes: ['Pass', 'Location', 'Notification'],
  endpoints: (builder) => ({
    // Add additional API endpoints here as needed
  }),
});

export const {} = api;
