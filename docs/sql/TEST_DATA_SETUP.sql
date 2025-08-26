-- ========================================
-- YARDPASS TEST DATA SETUP
-- Comprehensive sample data for testing public browsing
-- ========================================

-- ========================================
-- 1. CLEAN UP EXISTING TEST DATA
-- ========================================

-- Clear existing test data (optional - uncomment if needed)
-- DELETE FROM public.event_posts WHERE event_id IN (SELECT id FROM events WHERE title LIKE '%Test%');
-- DELETE FROM public.ticket_tiers WHERE event_id IN (SELECT id FROM events WHERE title LIKE '%Test%');
-- DELETE FROM public.events WHERE title LIKE '%Test%';
-- DELETE FROM public.organizations WHERE name LIKE '%Test%';

-- ========================================
-- 2. INSERT TEST ORGANIZATIONS
-- ========================================

-- Insert test organizations
INSERT INTO public.organizations (id, name, description, avatar_url, is_verified, is_active, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'MusicFest Productions', 'Premier music festival organizers with 10+ years of experience creating unforgettable experiences.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'TechCon Events', 'Leading technology conference organizers specializing in innovation and networking.', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Sports Central', 'Professional sports event management and athletic competition organizers.', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'ArtSpace Collective', 'Contemporary art exhibitions and cultural event curators.', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=150&h=150&fit=crop', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Food & Wine Society', 'Culinary events, wine tastings, and gourmet experiences.', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=150&h=150&fit=crop', false, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 3. INSERT TEST EVENTS
-- ========================================

-- Insert test events with realistic data and coordinates
INSERT INTO public.events (id, title, description, short_description, slug, category, subcategory, tags, cover_image, logo, gallery, video_url, organizer_id, city, venue, address, latitude, longitude, start_date, end_date, timezone, doors_open, doors_close, visibility, status, is_active, is_featured, is_verified, capacity, waitlist_enabled, waitlist_count, price_range, currency, likes_count, shares_count, views_count, followers_count, created_at, published_at) VALUES

-- Music Event 1
('550e8400-e29b-41d4-a716-446655440101', 'Summer Music Festival 2024', 
'Join us for the biggest music festival of the summer! Featuring top artists from around the world, amazing food, and unforgettable experiences. This 3-day festival will showcase over 50 artists across 5 stages, with food trucks, art installations, and interactive experiences throughout the venue.',
'The biggest music festival of the summer featuring 50+ artists',
'summer-music-festival-2024',
'music', 'festival',
ARRAY['music', 'festival', 'summer', 'live', 'outdoor', 'vip'],
'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop'
],
'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
'550e8400-e29b-41d4-a716-446655440001',
'Nashville', 'Downtown Festival Grounds', '123 Festival Street, Nashville, TN 37201',
36.1627, -86.7816,
'2024-07-15 14:00:00+00', '2024-07-17 23:00:00+00', 'America/Chicago',
'2024-07-15 13:00:00+00', '2024-07-17 23:30:00+00',
'public', 'published', true, true, true, 5000, true, 250,
'{"min": 150, "max": 350}', 'USD', 1250, 340, 8900, 2100,
NOW(), NOW()),

-- Tech Event
('550e8400-e29b-41d4-a716-446655440102', 'Tech Innovation Summit 2024',
'Join industry leaders, innovators, and entrepreneurs for three days of cutting-edge technology discussions, networking opportunities, and hands-on workshops. Topics include AI, blockchain, sustainable tech, and the future of work.',
'Three-day technology conference with industry leaders and innovators',
'tech-innovation-summit-2024',
'technology', 'conference',
ARRAY['technology', 'innovation', 'ai', 'blockchain', 'networking', 'workshop'],
'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop'
],
NULL,
'550e8400-e29b-41d4-a716-446655440002',
'San Francisco', 'Moscone Center', '747 Howard Street, San Francisco, CA 94103',
37.7849, -122.4094,
'2024-09-20 09:00:00+00', '2024-09-22 18:00:00+00', 'America/Los_Angeles',
'2024-09-20 08:30:00+00', '2024-09-22 18:30:00+00',
'public', 'published', true, true, true, 2000, true, 150,
'{"min": 299, "max": 899}', 'USD', 890, 210, 5600, 1200,
NOW(), NOW()),

-- Sports Event
('550e8400-e29b-41d4-a716-446655440103', 'City Marathon 2024',
'Experience the ultimate urban running challenge! Our annual marathon takes you through the most scenic routes of the city, with live entertainment, cheering stations, and a spectacular finish line celebration.',
'Annual urban marathon with scenic city routes and entertainment',
'city-marathon-2024',
'sports', 'marathon',
ARRAY['sports', 'marathon', 'running', 'outdoor', 'fitness', 'community'],
'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
],
NULL,
'550e8400-e29b-41d4-a716-446655440003',
'Los Angeles', 'Downtown LA', 'Various locations throughout Los Angeles',
34.0522, -118.2437,
'2024-11-10 07:00:00+00', '2024-11-10 15:00:00+00', 'America/Los_Angeles',
'2024-11-10 06:00:00+00', '2024-11-10 16:00:00+00',
'public', 'published', true, false, true, 10000, true, 500,
'{"min": 75, "max": 150}', 'USD', 2100, 450, 12000, 3400,
NOW(), NOW()),

-- Art Event
('550e8400-e29b-41d4-a716-446655440104', 'Contemporary Art Exhibition',
'Discover groundbreaking contemporary art from emerging and established artists. This month-long exhibition features installations, paintings, sculptures, and digital art that challenge perceptions and inspire creativity.',
'Month-long contemporary art exhibition featuring emerging and established artists',
'contemporary-art-exhibition-2024',
'arts-culture', 'exhibition',
ARRAY['art', 'culture', 'exhibition', 'contemporary', 'gallery', 'creative'],
'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=600&fit=crop'
],
NULL,
'550e8400-e29b-41d4-a716-446655440004',
'New York', 'Modern Art Gallery', '456 Gallery Street, New York, NY 10001',
40.7128, -74.0060,
'2024-08-01 10:00:00+00', '2024-08-31 18:00:00+00', 'America/New_York',
'2024-08-01 09:30:00+00', '2024-08-31 19:00:00+00',
'public', 'published', true, true, true, 500, false, 0,
'{"min": 0, "max": 25}', 'USD', 450, 120, 3200, 800,
NOW(), NOW()),

-- Food Event
('550e8400-e29b-41d4-a716-446655440105', 'Jazz Night Under the Stars',
'An intimate evening of live jazz music under the open sky. Enjoy gourmet food, fine wines, and the smooth sounds of local and international jazz artists in our beautiful outdoor venue.',
'Intimate jazz evening with gourmet food and fine wines',
'jazz-night-under-the-stars-2024',
'music', 'jazz',
ARRAY['music', 'jazz', 'outdoor', 'dining', 'wine', 'intimate'],
'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop'
],
NULL,
'550e8400-e29b-41d4-a716-446655440005',
'Nashville', 'Riverside Gardens', '789 Riverside Drive, Nashville, TN 37201',
36.1627, -86.7816,
'2024-06-15 19:00:00+00', '2024-06-15 23:00:00+00', 'America/Chicago',
'2024-06-15 18:30:00+00', '2024-06-15 23:30:00+00',
'public', 'published', true, false, false, 200, true, 50,
'{"min": 85, "max": 150}', 'USD', 320, 85, 1800, 450,
NOW(), NOW()),

-- Business Event
('550e8400-e29b-41d4-a716-446655440106', 'Startup Networking Mixer',
'Connect with fellow entrepreneurs, investors, and industry professionals in a relaxed networking environment. Share ideas, find collaborators, and build meaningful business relationships.',
'Networking event for entrepreneurs, investors, and professionals',
'startup-networking-mixer-2024',
'business', 'networking',
ARRAY['business', 'networking', 'startup', 'entrepreneur', 'investor', 'professional'],
'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1552664730-d307ca884978?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop'
],
NULL,
'550e8400-e29b-41d4-a716-446655440002',
'Austin', 'Innovation Hub', '321 Tech Boulevard, Austin, TX 73301',
30.2672, -97.7431,
'2024-10-15 18:00:00+00', '2024-10-15 21:00:00+00', 'America/Chicago',
'2024-10-15 17:30:00+00', '2024-10-15 21:30:00+00',
'public', 'published', true, false, true, 300, false, 0,
'{"min": 25, "max": 50}', 'USD', 180, 45, 950, 280,
NOW(), NOW()),

-- Education Event
('550e8400-e29b-41d4-a716-446655440107', 'Photography Workshop Series',
'Learn the art of photography from professional photographers in this comprehensive 4-week workshop series. Covering composition, lighting, editing, and portfolio development.',
'4-week photography workshop with professional instructors',
'photography-workshop-series-2024',
'education', 'workshop',
ARRAY['education', 'photography', 'workshop', 'creative', 'learning', 'hands-on'],
'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop'
],
NULL,
'550e8400-e29b-41d4-a716-446655440004',
'Seattle', 'Creative Arts Center', '654 Art Street, Seattle, WA 98101',
47.6062, -122.3321,
'2024-09-05 19:00:00+00', '2024-09-26 21:00:00+00', 'America/Los_Angeles',
'2024-09-05 18:30:00+00', '2024-09-26 21:30:00+00',
'public', 'published', true, false, true, 50, true, 20,
'{"min": 200, "max": 350}', 'USD', 95, 25, 420, 120,
NOW(), NOW()),

-- Entertainment Event
('550e8400-e29b-41d4-a716-446655440108', 'Comedy Night Extravaganza',
'Laugh the night away with some of the best comedians in the city! This comedy showcase features both established performers and up-and-coming talent in an intimate club setting.',
'Comedy showcase featuring established and emerging comedians',
'comedy-night-extravaganza-2024',
'entertainment', 'comedy',
ARRAY['entertainment', 'comedy', 'nightlife', 'intimate', 'laugh', 'showcase'],
'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&h=150&fit=crop',
ARRAY[
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop'
],
NULL,
'550e8400-e29b-41d4-a716-446655440001',
'Chicago', 'Laugh Factory', '987 Comedy Lane, Chicago, IL 60601',
41.8781, -87.6298,
'2024-08-20 20:00:00+00', '2024-08-20 23:00:00+00', 'America/Chicago',
'2024-08-20 19:30:00+00', '2024-08-20 23:30:00+00',
'public', 'published', true, false, true, 150, false, 0,
'{"min": 35, "max": 75}', 'USD', 210, 55, 1100, 320,
NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. INSERT TICKET TIERS
-- ========================================

-- Insert ticket tiers for events
INSERT INTO public.ticket_tiers (id, event_id, name, description, price, currency, quantity, sold, is_active, created_at) VALUES

-- Summer Music Festival tickets
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440101', 'General Admission', 'Access to all stages and general areas', 150.00, 'USD', 3000, 1200, true, NOW()),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440101', 'VIP Pass', 'Premium viewing areas, exclusive lounges, meet & greet opportunities', 350.00, 'USD', 500, 180, true, NOW()),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440101', 'Crew Pass', 'All-access pass including backstage areas and artist meet & greets', 500.00, 'USD', 100, 45, true, NOW()),

-- Tech Summit tickets
('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440102', 'Conference Pass', 'Access to all sessions and networking events', 299.00, 'USD', 1500, 650, true, NOW()),
('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440102', 'VIP Conference Pass', 'Premium seating, exclusive workshops, and networking dinner', 899.00, 'USD', 200, 75, true, NOW()),

-- Marathon tickets
('550e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440103', 'Marathon Entry', 'Full marathon participation with race packet and finish line celebration', 75.00, 'USD', 8000, 3200, true, NOW()),
('550e8400-e29b-41d4-a716-446655440207', '550e8400-e29b-41d4-a716-446655440103', 'Half Marathon Entry', 'Half marathon participation with race packet', 55.00, 'USD', 2000, 850, true, NOW()),

-- Art Exhibition tickets
('550e8400-e29b-41d4-a716-446655440208', '550e8400-e29b-41d4-a716-446655440104', 'Free Admission', 'General exhibition access', 0.00, 'USD', 500, 0, true, NOW()),
('550e8400-e29b-41d4-a716-446655440209', '550e8400-e29b-41d4-a716-446655440104', 'Guided Tour', 'Curator-led tour with exclusive insights', 25.00, 'USD', 100, 35, true, NOW()),

-- Jazz Night tickets
('550e8400-e29b-41d4-a716-446655440210', '550e8400-e29b-41d4-a716-446655440105', 'General Admission', 'Concert access with cash bar', 85.00, 'USD', 150, 65, true, NOW()),
('550e8400-e29b-41d4-a716-446655440211', '550e8400-e29b-41d4-a716-446655440105', 'Dinner & Show', 'Premium seating with 3-course dinner and wine pairing', 150.00, 'USD', 50, 25, true, NOW()),

-- Networking Mixer tickets
('550e8400-e29b-41d4-a716-446655440212', '550e8400-e29b-41d4-a716-446655440106', 'General Admission', 'Networking access with light refreshments', 25.00, 'USD', 250, 120, true, NOW()),
('550e8400-e29b-41d4-a716-446655440213', '550e8400-e29b-41d4-a716-446655440106', 'VIP Networking', 'Priority networking, private meeting rooms, and premium refreshments', 50.00, 'USD', 50, 30, true, NOW()),

-- Photography Workshop tickets
('550e8400-e29b-41d4-a716-446655440214', '550e8400-e29b-41d4-a716-446655440107', 'Full Series', 'Complete 4-week workshop with materials included', 350.00, 'USD', 40, 18, true, NOW()),
('550e8400-e29b-41d4-a716-446655440215', '550e8400-e29b-41d4-a716-446655440107', 'Single Session', 'Individual workshop session', 95.00, 'USD', 20, 8, true, NOW()),

-- Comedy Night tickets
('550e8400-e29b-41d4-a716-446655440216', '550e8400-e29b-41d4-a716-446655440108', 'General Admission', 'Show access with 2-drink minimum', 35.00, 'USD', 120, 75, true, NOW()),
('550e8400-e29b-41d4-a716-446655440217', '550e8400-e29b-41d4-a716-446655440108', 'VIP Seating', 'Premium front-row seating with complimentary drinks', 75.00, 'USD', 30, 20, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. INSERT EVENT POSTS
-- ========================================

-- Insert sample event posts
INSERT INTO public.event_posts (id, event_id, user_id, content, media_urls, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Excited to announce our headliner lineup for Summer Music Festival 2024! 🎵 Get ready for an incredible weekend of music, food, and unforgettable memories. Early bird tickets are selling fast!', ARRAY['https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=300&fit=crop'], NOW()),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440002', 'Just confirmed: AI pioneer Dr. Sarah Chen will be our keynote speaker at Tech Innovation Summit 2024! Don''t miss her insights on the future of artificial intelligence. 🚀', ARRAY['https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop'], NOW()),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440003', 'Training for City Marathon 2024 starts now! 🏃‍♂️ Join our training program and get ready for the most scenic marathon route in the city. Registration is open!', ARRAY['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'], NOW()),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440004', 'Behind the scenes: Installing our latest contemporary art exhibition! 🎨 This month-long showcase will feature groundbreaking works from emerging artists. Free admission for students!', ARRAY['https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop'], NOW()),
('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440005', 'Jazz Night Under the Stars is back! 🎷 Join us for an intimate evening of live jazz, gourmet food, and fine wines. Limited seating available - book your table now!', ARRAY['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop'], NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 6. INSERT EVENT ANALYTICS
-- ========================================

-- Insert sample analytics data
INSERT INTO public.event_analytics (id, event_id, user_id, action, metadata, created_at) VALUES
-- Summer Music Festival analytics
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440101', NULL, 'view', '{"source": "public_browse", "duration": 45}', NOW()),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440101', NULL, 'view', '{"source": "search", "duration": 120}', NOW()),
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440101', NULL, 'like', '{"source": "event_details"}', NOW()),
('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440101', NULL, 'share', '{"platform": "twitter"}', NOW()),

-- Tech Summit analytics
('550e8400-e29b-41d4-a716-446655440405', '550e8400-e29b-41d4-a716-446655440102', NULL, 'view', '{"source": "category_browse", "duration": 90}', NOW()),
('550e8400-e29b-41d4-a716-446655440406', '550e8400-e29b-41d4-a716-446655440102', NULL, 'like', '{"source": "event_details"}', NOW()),
('550e8400-e29b-41d4-a716-446655440407', '550e8400-e29b-41d4-a716-446655440102', NULL, 'view', '{"source": "recommendations", "duration": 60}', NOW()),

-- Marathon analytics
('550e8400-e29b-41d4-a716-446655440408', '550e8400-e29b-41d4-a716-446655440103', NULL, 'view', '{"source": "public_browse", "duration": 30}', NOW()),
('550e8400-e29b-41d4-a716-446655440409', '550e8400-e29b-41d4-a716-446655440103', NULL, 'like', '{"source": "event_details"}', NOW()),
('550e8400-e29b-41d4-a716-446655440410', '550e8400-e29b-41d4-a716-446655440103', NULL, 'share', '{"platform": "facebook"}', NOW()),

-- Art Exhibition analytics
('550e8400-e29b-41d4-a716-446655440411', '550e8400-e29b-41d4-a716-446655440104', NULL, 'view', '{"source": "search", "duration": 75}', NOW()),
('550e8400-e29b-41d4-a716-446655440412', '550e8400-e29b-41d4-a716-446655440104', NULL, 'like', '{"source": "event_details"}', NOW()),

-- Jazz Night analytics
('550e8400-e29b-41d4-a716-446655440413', '550e8400-e29b-41d4-a716-446655440105', NULL, 'view', '{"source": "category_browse", "duration": 45}', NOW()),
('550e8400-e29b-41d4-a716-446655440414', '550e8400-e29b-41d4-a716-446655440105', NULL, 'like', '{"source": "event_details"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 7. INSERT EVENT CATEGORIES (if not exists)
-- ========================================

-- Insert event categories if they don't exist
INSERT INTO public.event_categories (id, name, slug, description, icon_url, color_hex, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440501', 'Music', 'music', 'Live music events, concerts, and performances', '🎵', '#FF6B6B', 1),
('550e8400-e29b-41d4-a716-446655440502', 'Technology', 'technology', 'Tech conferences, hackathons, and workshops', '💻', '#45B7D1', 2),
('550e8400-e29b-41d4-a716-446655440503', 'Sports', 'sports', 'Sports events, games, and athletic competitions', '⚽', '#4ECDC4', 3),
('550e8400-e29b-41d4-a716-446655440504', 'Arts & Culture', 'arts-culture', 'Art exhibitions, theater, and cultural events', '🎨', '#FFEAA7', 4),
('550e8400-e29b-41d4-a716-446655440505', 'Food & Drink', 'food-drink', 'Food festivals, wine tastings, and culinary events', '🍕', '#96CEB4', 5),
('550e8400-e29b-41d4-a716-446655440506', 'Business', 'business', 'Business conferences, networking events, and seminars', '💼', '#DDA0DD', 6),
('550e8400-e29b-41d4-a716-446655440507', 'Education', 'education', 'Educational workshops, classes, and training sessions', '📚', '#98D8C8', 7),
('550e8400-e29b-41d4-a716-446655440508', 'Entertainment', 'entertainment', 'Comedy, theater, and entertainment shows', '🎭', '#F7DC6F', 8)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Verify the test data
SELECT 
    'Test Data Summary' as section,
    COUNT(*) as total_events,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_events,
    COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_events
FROM events 
WHERE id LIKE '550e8400-e29b-41d4-a716-4466554401%';

SELECT 
    'Organizations Summary' as section,
    COUNT(*) as total_organizations,
    COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_organizations
FROM organizations 
WHERE id LIKE '550e8400-e29b-41d4-a716-4466554400%';

SELECT 
    'Ticket Tiers Summary' as section,
    COUNT(*) as total_ticket_tiers,
    COUNT(CASE WHEN price = 0 THEN 1 END) as free_tickets,
    COUNT(CASE WHEN price > 100 THEN 1 END) as premium_tickets
FROM ticket_tiers 
WHERE id LIKE '550e8400-e29b-41d4-a716-4466554402%';

SELECT 
    'Public Events Access' as section,
    COUNT(*) as public_events_count
FROM public_events;

-- ========================================
-- 9. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🎉 Test Data Setup Complete!' as status,
    'Your database now has realistic test data for public browsing' as message,
    'You can now test all public features with this sample data' as next_step;
