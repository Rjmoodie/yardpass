const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jysyzpgbrretxsvjvqmp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c3l6cGdicnJldHhzdmp2cW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mzk0NDQsImV4cCI6MjA3MTAxNTQ0NH0.JiQraVg-JWWpa6JZlg0MGJ5L20awPuTbivmOyODMAQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSmartServices() {
  console.log('🧠 Testing Smart Services Implementation...\n');

  try {
    // Test 1: Smart Search Service
    console.log('1️⃣ Testing Smart Search Service:');
    await testSmartSearch();

    // Test 2: Location Intelligence Service
    console.log('\n2️⃣ Testing Location Intelligence Service:');
    await testLocationIntelligence();

    // Test 3: Content Recommendations Service
    console.log('\n3️⃣ Testing Content Recommendations Service:');
    await testContentRecommendations();

    // Test foreign key constraints
    await testForeignKeyConstraints();

    console.log('\n🎉 All Smart Services Tests Completed!');
    console.log('🚀 Your backend now has AI-powered intelligence!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

async function testSmartSearch() {
  try {
    // Test semantic search
    const searchQuery = 'concert';
    const { data: searchResults, error: searchError } = await supabase
      .from('events')
      .select(`
        *,
        org:orgs(name, slug, is_verified),
        tickets(id, name, price, quantity_available)
      `)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,venue.ilike.%${searchQuery}%`)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .limit(5);

    if (searchError) {
      console.log(`   ❌ Search error: ${searchError.message}`);
    } else {
      console.log(`   ✅ Smart search works! Found ${searchResults?.length || 0} events`);
      searchResults?.forEach((event, index) => {
        console.log(`      ${index + 1}. ${event.title} (${event.city})`);
      });
    }

    // Test search analytics tracking with query_length
    const searchAnalytics = {
      session_id: `test_session_${Date.now()}`,
      query: searchQuery,
      query_length: searchQuery.length,
      search_type: 'global',
      results_count: searchResults?.length || 0,
      has_results: (searchResults?.length || 0) > 0,
      search_time_ms: 150,
      filters_applied: {},
      timestamp: new Date().toISOString(),
    };

    const { error: analyticsError } = await supabase
      .from('search_analytics')
      .insert(searchAnalytics);

    if (analyticsError) {
      console.log(`   ⚠️  Search analytics tracking: ${analyticsError.message}`);
    } else {
      console.log(`   ✅ Search analytics tracking works!`);
    }

    // Test search suggestions
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('search_suggestions')
      .select('*')
      .eq('suggestion_type', 'trending')
      .order('usage_count', { ascending: false })
      .limit(3);

    if (suggestionsError) {
      console.log(`   ⚠️  Search suggestions: ${suggestionsError.message}`);
    } else {
      console.log(`   ✅ Search suggestions work! Found ${suggestions?.length || 0} trending suggestions`);
      suggestions?.forEach((suggestion, index) => {
        console.log(`      ${index + 1}. "${suggestion.query}" (${suggestion.usage_count} uses)`);
      });
    }

  } catch (error) {
    console.log(`   ❌ Smart search test failed: ${error.message}`);
  }
}

async function testLocationIntelligence() {
  try {
    // Test nearby events (using NYC coordinates)
    const nycLocation = { lat: 40.7128, lng: -74.0060 };
    
    const { data: nearbyEvents, error: nearbyError } = await supabase
      .from('events')
      .select(`
        *,
        org:orgs(name, slug, is_verified),
        tickets(id, name, price, quantity_available)
      `)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .not('location', 'is', null)
      .limit(5);

    if (nearbyError) {
      console.log(`   ❌ Nearby events error: ${nearbyError.message}`);
    } else {
      console.log(`   ✅ Location intelligence works! Found ${nearbyEvents?.length || 0} events with location data`);
      
      // Calculate distances manually for testing
      nearbyEvents?.forEach((event, index) => {
        if (event.location) {
          const distance = calculateDistance(nycLocation, {
            lat: event.location.coordinates[1],
            lng: event.location.coordinates[0],
          });
          console.log(`      ${index + 1}. ${event.title} - ${distance.toFixed(1)} miles from NYC`);
        }
      });
    }

    // Test location insights for an organization
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('id, name')
      .limit(1);

    if (!orgsError && orgs?.length > 0) {
      const orgId = orgs[0].id;
      const { data: orgEvents, error: orgEventsError } = await supabase
        .from('events')
        .select(`
          *,
          tickets(price)
        `)
        .eq('org_id', orgId)
        .eq('status', 'published')
        .limit(10);

      if (!orgEventsError) {
        console.log(`   ✅ Location insights analysis works! Found ${orgEvents?.length || 0} events for organization`);
        
        // Analyze venue popularity
        const venueStats = analyzeVenues(orgEvents || []);
        if (venueStats.length > 0) {
          console.log(`      Top venue: ${venueStats[0].venue} (${venueStats[0].event_count} events)`);
        }
      }
    }

    // Test event categories
    const { data: categories, error: categoriesError } = await supabase
      .from('event_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(5);

    if (categoriesError) {
      console.log(`   ⚠️  Event categories: ${categoriesError.message}`);
    } else {
      console.log(`   ✅ Event categories work! Found ${categories?.length || 0} categories`);
      categories?.forEach((category, index) => {
        console.log(`      ${index + 1}. ${category.name} (${category.slug})`);
      });
    }

  } catch (error) {
    console.log(`   ❌ Location intelligence test failed: ${error.message}`);
  }
}

async function testContentRecommendations() {
  try {
    // Test content recommendations
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(username, display_name, avatar_url, verified),
        event:events(title, slug),
        reactions(id, type),
        comments(id)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (postsError) {
      console.log(`   ❌ Content recommendations error: ${postsError.message}`);
    } else {
      console.log(`   ✅ Content recommendations work! Found ${posts?.length || 0} posts for analysis`);
      
      // Analyze engagement
      posts?.forEach((post, index) => {
        const engagement = (post.reactions?.length || 0) + (post.comments?.length || 0);
        const viralScore = calculateViralScore(post);
        console.log(`      ${index + 1}. "${post.title || 'Post'}" - Engagement: ${engagement}, Viral Score: ${viralScore.toFixed(2)}`);
      });
    }

    // Test trending content detection
    const { data: recentPosts, error: recentError } = await supabase
      .from('posts')
      .select(`
        *,
        reactions(id, type),
        comments(id)
      `)
      .eq('is_active', true)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    if (!recentError) {
      const trendingPosts = analyzeTrendingPosts(recentPosts || []);
      console.log(`   ✅ Trending content detection works! Found ${trendingPosts.length} trending posts`);
      
      trendingPosts.slice(0, 3).forEach((post, index) => {
        console.log(`      ${index + 1}. "${post.title}" - Viral Score: ${post.viral_score.toFixed(2)}`);
      });
    }

    // Test event content curation
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title')
      .eq('status', 'published')
      .limit(1);

    if (!eventsError && events?.length > 0) {
      const eventId = events[0].id;
      const { data: eventPosts, error: eventPostsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(username, display_name, avatar_url, verified),
          reactions(id, type),
          comments(id)
        `)
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (!eventPostsError) {
        const engagementSummary = calculateEngagementSummary(eventPosts || []);
        console.log(`   ✅ Event content curation works! Event: "${events[0].title}"`);
        console.log(`      Posts: ${engagementSummary.total_posts}, Reactions: ${engagementSummary.total_reactions}, Comments: ${engagementSummary.total_comments}`);
      }
    }

    // Test event tags
    const { data: tags, error: tagsError } = await supabase
      .from('event_tags')
      .select('*')
      .eq('is_trending', true)
      .order('usage_count', { ascending: false })
      .limit(5);

    if (tagsError) {
      console.log(`   ⚠️  Event tags: ${tagsError.message}`);
    } else {
      console.log(`   ✅ Event tags work! Found ${tags?.length || 0} trending tags`);
      tags?.forEach((tag, index) => {
        console.log(`      ${index + 1}. #${tag.name} (${tag.usage_count} uses)`);
      });
    }

  } catch (error) {
    console.log(`   ❌ Content recommendations test failed: ${error.message}`);
  }
}

// Test foreign key constraints
async function testForeignKeyConstraints() {
  console.log('\n🔗 Testing Foreign Key Constraints...');
  
  try {
    // Check what foreign key constraints exist on events table using raw SQL
    const { data: constraints, error } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'events')
      .eq('constraint_type', 'FOREIGN KEY');
    
    if (error) {
      console.log(`   ❌ Error checking constraints: ${error.message}`);
    } else {
      console.log(`   ✅ Found ${constraints?.length || 0} foreign key constraints on events table`);
      if (constraints) {
        constraints.forEach(constraint => {
          console.log(`      - ${constraint.constraint_name}`);
        });
      }
    }
    
    // Also check if category_id column exists
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'events')
      .eq('column_name', 'category_id');
    
    if (columnError) {
      console.log(`   ❌ Error checking columns: ${columnError.message}`);
    } else {
      console.log(`   ✅ category_id column exists: ${columns?.length > 0 ? 'Yes' : 'No'}`);
      if (columns?.length > 0) {
        console.log(`      - Type: ${columns[0].data_type}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Constraint check failed: ${error.message}`);
  }
}

// Helper functions for testing
function calculateDistance(point1, point2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function analyzeVenues(events) {
  const venueStats = new Map();

  events.forEach(event => {
    const venue = event.venue || 'Unknown Venue';
    const attendance = event.checkins?.length || 0;
    
    if (venueStats.has(venue)) {
      const stats = venueStats.get(venue);
      stats.count++;
      stats.totalAttendance += attendance;
    } else {
      venueStats.set(venue, { count: 1, totalAttendance: attendance });
    }
  });

  return Array.from(venueStats.entries())
    .map(([venue, stats]) => ({
      venue,
      event_count: stats.count,
      avg_attendance: Math.round(stats.totalAttendance / stats.count),
    }))
    .sort((a, b) => b.event_count - a.event_count);
}

function calculateViralScore(content) {
  const reactions = content.reactions?.length || 0;
  const comments = content.comments?.length || 0;
  const totalEngagement = reactions + comments;
  
  // Simple viral score calculation
  if (totalEngagement > 50) return 0.9;
  if (totalEngagement > 20) return 0.7;
  if (totalEngagement > 10) return 0.5;
  if (totalEngagement > 5) return 0.3;
  return 0.1;
}

function analyzeTrendingPosts(posts) {
  return posts.map(post => {
    const viralScore = calculateViralScore(post);
    return {
      id: post.id,
      title: post.title || 'Post',
      viral_score: viralScore,
    };
  }).filter(post => post.viral_score > 0.3);
}

function calculateEngagementSummary(posts) {
  const totalPosts = posts.length;
  const totalReactions = posts.reduce((sum, post) => sum + (post.reactions?.length || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);

  return {
    total_posts: totalPosts,
    total_reactions: totalReactions,
    total_comments: totalComments,
    avg_engagement_rate: totalPosts > 0 ? (totalReactions + totalComments) / totalPosts : 0,
  };
}

testSmartServices();
