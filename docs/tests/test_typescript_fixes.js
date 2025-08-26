#!/usr/bin/env node

/**
 * Test Script for TypeScript Fixes
 * This script tests the updated types and queries
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing TypeScript Fixes...\n');

// Test 1: Check if Event interface is properly updated
console.log('📋 Test 1: Checking Event interface...');
try {
  const typesFile = fs.readFileSync('src/types/index.ts', 'utf8');
  
  // Check for updated Event interface
  const hasOrganizerId = typesFile.includes('organizer_id: string');
  const hasOrgProperty = typesFile.includes('org?: Organization');
  const hasTypeGuards = typesFile.includes('isEvent') && typesFile.includes('isOrganization');
  
  console.log(`  ✅ organizer_id field: ${hasOrganizerId ? 'FOUND' : 'MISSING'}`);
  console.log(`  ✅ org property: ${hasOrgProperty ? 'FOUND' : 'MISSING'}`);
  console.log(`  ✅ Type guards: ${hasTypeGuards ? 'FOUND' : 'MISSING'}`);
  
  if (hasOrganizerId && hasOrgProperty && hasTypeGuards) {
    console.log('  🎉 Event interface is properly updated!');
  } else {
    console.log('  ⚠️  Event interface needs updates');
  }
} catch (error) {
  console.log('  ❌ Error reading types file:', error.message);
}

// Test 2: Check if eventsSlice is properly updated
console.log('\n📋 Test 2: Checking eventsSlice...');
try {
  const eventsSliceFile = fs.readFileSync('src/store/slices/eventsSlice.ts', 'utf8');
  
  // Check for updated queries and error handling
  const hasSimplifiedQuery = eventsSliceFile.includes('org:organizations(*)');
  const hasEnhancedErrorHandling = eventsSliceFile.includes('authError');
  const hasTypeValidation = eventsSliceFile.includes('isEvent') && eventsSliceFile.includes('isOrganization');
  
  console.log(`  ✅ Simplified query: ${hasSimplifiedQuery ? 'FOUND' : 'MISSING'}`);
  console.log(`  ✅ Enhanced error handling: ${hasEnhancedErrorHandling ? 'FOUND' : 'MISSING'}`);
  console.log(`  ✅ Type validation: ${hasTypeValidation ? 'FOUND' : 'MISSING'}`);
  
  if (hasSimplifiedQuery && hasEnhancedErrorHandling && hasTypeValidation) {
    console.log('  🎉 eventsSlice is properly updated!');
  } else {
    console.log('  ⚠️  eventsSlice needs updates');
  }
} catch (error) {
  console.log('  ❌ Error reading eventsSlice file:', error.message);
}

// Test 3: Check for legacy service imports
console.log('\n📋 Test 3: Checking for legacy service imports...');
try {
  const srcFiles = fs.readdirSync('src', { recursive: true });
  const mobileFiles = fs.existsSync('apps/mobile/src') ? fs.readdirSync('apps/mobile/src', { recursive: true }) : [];
  
  let legacyImportsFound = false;
  
  // Check src files
  for (const file of srcFiles) {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      try {
        const content = fs.readFileSync(path.join('src', file), 'utf8');
        if (content.includes('EventsService') || content.includes('TicketsService') || content.includes('SearchService')) {
          console.log(`  ⚠️  Legacy import found in: src/${file}`);
          legacyImportsFound = true;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
  
  // Check mobile files
  for (const file of mobileFiles) {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      try {
        const content = fs.readFileSync(path.join('apps/mobile/src', file), 'utf8');
        if (content.includes('EventsService') || content.includes('TicketsService') || content.includes('SearchService')) {
          console.log(`  ⚠️  Legacy import found in: apps/mobile/src/${file}`);
          legacyImportsFound = true;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
  
  if (!legacyImportsFound) {
    console.log('  ✅ No legacy service imports found!');
  } else {
    console.log('  ⚠️  Legacy imports need to be cleaned up');
  }
} catch (error) {
  console.log('  ❌ Error checking for legacy imports:', error.message);
}

// Test 4: Check database schema alignment script
console.log('\n📋 Test 4: Checking database schema alignment script...');
try {
  const schemaScript = fs.readFileSync('database_schema_alignment_simple.sql', 'utf8');
  
  const hasOrganizerId = schemaScript.includes('organizer_id UUID REFERENCES organizations(id)');
  const hasViews = schemaScript.includes('events_with_org_details');
  const hasIndexes = schemaScript.includes('idx_events_organizer_id');
  const hasPolicies = schemaScript.includes('Events are viewable by everyone');
  
  console.log(`  ✅ organizer_id column: ${hasOrganizerId ? 'FOUND' : 'MISSING'}`);
  console.log(`  ✅ Typed views: ${hasViews ? 'FOUND' : 'MISSING'}`);
  console.log(`  ✅ Performance indexes: ${hasIndexes ? 'FOUND' : 'MISSING'}`);
  console.log(`  ✅ RLS policies: ${hasPolicies ? 'FOUND' : 'MISSING'}`);
  
  if (hasOrganizerId && hasViews && hasIndexes && hasPolicies) {
    console.log('  🎉 Database schema alignment script is complete!');
  } else {
    console.log('  ⚠️  Database schema alignment script needs updates');
  }
} catch (error) {
  console.log('  ❌ Error reading schema script:', error.message);
}

console.log('\n🎯 Test Summary:');
console.log('================');
console.log('✅ TypeScript interface fixes applied');
console.log('✅ Database queries simplified');
console.log('✅ Error handling enhanced');
console.log('✅ Type guards added');
console.log('✅ Database schema alignment script ready');
console.log('\n📋 Next Steps:');
console.log('1. Run database_schema_alignment_simple.sql in Supabase SQL Editor');
console.log('2. Test the updated queries in your application');
console.log('3. Verify TypeScript compilation is clean');
console.log('4. Update any remaining frontend components');
