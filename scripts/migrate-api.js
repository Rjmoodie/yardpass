#!/usr/bin/env node

/**
 * YardPass API Migration Script
 * Updates frontend code to use Edge Functions
 */

const fs = require('fs');
const path = require('path');

// Migration mappings
const MIGRATIONS = {
  // Import statements
  'import { EventsService } from \'@yardpass/api\';': 'import { apiGateway } from \'@yardpass/api\';',
  'import { TicketsService } from \'@yardpass/api\';': 'import { apiGateway } from \'@yardpass/api\';',
  'import { SearchService } from \'@yardpass/api\';': 'import { apiGateway } from \'@yardpass/api\';',
  'import { PostsService } from \'@yardpass/api\';': 'import { apiGateway } from \'@yardpass/api\';',
  
  // Method calls
  'EventsService.getEvents(': 'apiGateway.getEvents(',
  'EventsService.createEvent(': 'apiGateway.createEvent(',
  'EventsService.updateEvent(': 'apiGateway.updateEvent(',
  'SearchService.search(': 'apiGateway.search(',
  'PostsService.getPosts(': 'apiGateway.getSocialFeed(',
  'PostsService.createPost(': 'apiGateway.createPost(',
};

function migrateFile(filePath) {
  console.log(`Migrating: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  for (const [oldPattern, newPattern] of Object.entries(MIGRATIONS)) {
    if (content.includes(oldPattern)) {
      content = content.replace(new RegExp(oldPattern, 'g'), newPattern);
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    // Create backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, fs.readFileSync(filePath));
    
    // Write migrated content
    fs.writeFileSync(filePath, content);
    console.log(`✅ Migrated: ${filePath}`);
  }
}

function main() {
  console.log('🚀 Starting YardPass API Migration...\n');
  
  // Files to migrate
  const files = [
    'apps/mobile/src/screens/main/SearchScreen.tsx',
    'src/store/slices/authSlice.ts',
    'src/components/events/CategoryFilter.tsx',
    'src/screens/organizer/AnalyticsScreen.tsx'
  ];
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      migrateFile(file);
    }
  });
  
  console.log('\n🎉 Migration complete!');
  console.log('📋 Next steps:');
  console.log('1. Review migrated files');
  console.log('2. Test API integrations');
  console.log('3. Update error handling');
}

main();

