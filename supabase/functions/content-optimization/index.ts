import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with proper authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const contentType = url.searchParams.get('content_type');
    const contentId = url.searchParams.get('content_id');
    const testId = url.searchParams.get('test_id');

    if (req.method === 'POST') {
      const requestBody = await req.json();
      
      // Track content performance
      if (requestBody.track_performance) {
        const { content_type, content_id, interaction_type, interaction_data } = requestBody;
        
        const { data: performanceId, error: performanceError } = await supabase
          .from('content_performance')
          .upsert({
            content_type,
            content_id,
            views_count: interaction_type === 'view' ? 1 : 0,
            clicks_count: interaction_type === 'click' ? 1 : 0,
            conversions_count: interaction_type === 'conversion' ? 1 : 0,
            performance_metrics: interaction_data || {}
          }, {
            onConflict: 'content_type,content_id'
          })
          .select()
          .single();

        if (performanceError) {
          console.error('Error tracking performance:', performanceError);
          return new Response(JSON.stringify({
            error: 'Failed to track performance'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Update engagement score
        await supabase.rpc('update_content_engagement', {
          p_content_type: content_type,
          p_content_id: content_id
        });

        return new Response(JSON.stringify({
          performance_id: performanceId,
          message: 'Performance tracked successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create A/B test
      if (requestBody.create_ab_test) {
        const { 
          test_name, 
          test_type, 
          content_id, 
          variant_a, 
          variant_b, 
          traffic_split 
        } = requestBody;

        const { data: test, error: testError } = await supabase
          .from('ab_tests')
          .insert({
            test_name,
            test_type,
            content_id,
            variant_a,
            variant_b,
            traffic_split: traffic_split || 0.5
          })
          .select()
          .single();

        if (testError) {
          console.error('Error creating A/B test:', testError);
          return new Response(JSON.stringify({
            error: 'Failed to create A/B test'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          test,
          test_id: test.id
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Submit A/B test result
      if (requestBody.submit_ab_result) {
        const { 
          test_id, 
          variant_shown, 
          interaction_type, 
          interaction_data 
        } = requestBody;

        const { data: result, error: resultError } = await supabase
          .from('ab_test_results')
          .insert({
            test_id,
            user_id: user.id,
            variant_shown,
            interaction_type,
            interaction_data: interaction_data || {}
          })
          .select()
          .single();

        if (resultError) {
          console.error('Error submitting A/B test result:', resultError);
          return new Response(JSON.stringify({
            error: 'Failed to submit A/B test result'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          result,
          result_id: result.id
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Submit user feedback
      if (requestBody.submit_feedback) {
        const { 
          content_type, 
          content_id, 
          feedback_type, 
          rating, 
          feedback_text, 
          feedback_data 
        } = requestBody;

        const { data: feedback, error: feedbackError } = await supabase
          .from('user_feedback')
          .insert({
            user_id: user.id,
            content_type,
            content_id,
            feedback_type,
            rating,
            feedback_text,
            feedback_data: feedback_data || {}
          })
          .select()
          .single();

        if (feedbackError) {
          console.error('Error submitting feedback:', feedbackError);
          return new Response(JSON.stringify({
            error: 'Failed to submit feedback'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          feedback,
          feedback_id: feedback.id
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET - Fetch content performance or A/B test data
    if (contentType && contentId) {
      // Get content performance
      const { data: performance, error: performanceError } = await supabase
        .from('content_performance')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .single();

      if (performanceError && performanceError.code !== 'PGRST116') {
        console.error('Error fetching performance:', performanceError);
        return new Response(JSON.stringify({
          error: 'Failed to fetch performance data'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get user feedback for this content
      const { data: feedback } = await supabase
        .from('user_feedback')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({
        performance: performance || {
          content_type: contentType,
          content_id: contentId,
          views_count: 0,
          clicks_count: 0,
          conversions_count: 0,
          engagement_score: 0,
          conversion_rate: 0
        },
        feedback: feedback || [],
        content_type: contentType,
        content_id: contentId
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (testId) {
      // Get A/B test details
      const { data: test, error: testError } = await supabase
        .from('ab_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) {
        console.error('Error fetching A/B test:', testError);
        return new Response(JSON.stringify({
          error: 'Failed to fetch A/B test'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get A/B test results
      const { data: results } = await supabase
        .from('ab_test_results')
        .select('*')
        .eq('test_id', testId)
        .order('timestamp', { ascending: false });

      // Calculate test statistics
      const variantAStats = results?.filter(r => r.variant_shown === 'a') || [];
      const variantBStats = results?.filter(r => r.variant_shown === 'b') || [];

      const testStats = {
        variant_a: {
          shown: variantAStats.length,
          interactions: variantAStats.filter(r => r.interaction_type).length,
          conversion_rate: variantAStats.length > 0 ? 
            (variantAStats.filter(r => r.interaction_type === 'conversion').length / variantAStats.length) : 0
        },
        variant_b: {
          shown: variantBStats.length,
          interactions: variantBStats.filter(r => r.interaction_type).length,
          conversion_rate: variantBStats.length > 0 ? 
            (variantBStats.filter(r => r.interaction_type === 'conversion').length / variantBStats.length) : 0
        }
      };

      return new Response(JSON.stringify({
        test,
        results: results || [],
        statistics: testStats
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's feedback history
    const { data: userFeedback } = await supabase
      .from('user_feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get top performing content
    const { data: topContent } = await supabase
      .from('content_performance')
      .select('*')
      .order('engagement_score', { ascending: false })
      .limit(10);

    return new Response(JSON.stringify({
      user_feedback: userFeedback || [],
      top_performing_content: topContent || [],
      user_id: user.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Content optimization error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
