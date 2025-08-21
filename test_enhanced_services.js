const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jysyzpgbrretxsvjvqmp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5c3l6cGdicnJldHhzdmp2cW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mzk0NDQsImV4cCI6MjA3MTAxNTQ0NH0.JiQraVg-JWWpa6JZlg0MGJ5L20awPuTbivmOyODMAQs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEnhancedSearch() {
  console.log('🔍 Testing Enhanced Search Services...\n');

  try {
    // Test 1: Basic event search
    console.log('1. Testing basic event search...');
    const { data: events, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        orgs(name, slug, verified)
      `)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .limit(5);

    if (eventError) {
      console.log('❌ Event search error:', eventError.message);
    } else {
      console.log(`✅ Found ${events?.length || 0} events`);
    }

    // Test 2: User search
    console.log('\n2. Testing user search...');
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select(`
        id, user_id, username, display_name, bio, avatar_url, verified, followers_count, following_count, posts_count
      `)
      .limit(5);

    if (userError) {
      console.log('❌ User search error:', userError.message);
    } else {
      console.log(`✅ Found ${users?.length || 0} users`);
    }

    // Test 3: Organization search
    console.log('\n3. Testing organization search...');
    const { data: orgs, error: orgError } = await supabase
      .from('orgs')
      .select(`
        id, name, slug, description, avatar_url, verified, website_url
      `)
      .limit(5);

    if (orgError) {
      console.log('❌ Organization search error:', orgError.message);
    } else {
      console.log(`✅ Found ${orgs?.length || 0} organizations`);
    }

    // Test 4: Search analytics table
    console.log('\n4. Testing search analytics table...');
    const { data: analytics, error: analyticsError } = await supabase
      .from('search_analytics')
      .select('*')
      .limit(5);

    if (analyticsError) {
      console.log('❌ Search analytics error:', analyticsError.message);
    } else {
      console.log(`✅ Found ${analytics?.length || 0} analytics records`);
    }

    // Test 5: Search suggestions table
    console.log('\n5. Testing search suggestions table...');
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('search_suggestions')
      .select('*')
      .limit(5);

    if (suggestionsError) {
      console.log('❌ Search suggestions error:', suggestionsError.message);
    } else {
      console.log(`✅ Found ${suggestions?.length || 0} suggestions`);
    }

    // Test 6: Test the OR query that was causing issues
    console.log('\n6. Testing OR query syntax...');
    const { data: orTest, error: orError } = await supabase
      .from('events')
      .select('title, city, category')
      .or('title.ilike.%festival%,city.ilike.%festival%,category.ilike.%festival%')
      .limit(3);

    if (orError) {
      console.log('❌ OR query error:', orError.message);
    } else {
      console.log(`✅ OR query found ${orTest?.length || 0} results`);
    }

    console.log('\n🎉 Enhanced Search Services Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEnhancedSearch();
