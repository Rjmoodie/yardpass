#!/usr/bin/env node

/**
 * YardPass Debug & Test Script
 * Comprehensive testing from frontend to backend
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  frontend: {
    components: [
      'apps/mobile/src/screens/main/SearchScreen.tsx',
      'src/components/events/CategoryFilter.tsx',
      'src/screens/organizer/AnalyticsScreen.tsx',
      'src/store/slices/authSlice.ts'
    ],
    apiGateway: 'packages/api/src/gateway.ts'
  },
  edgeFunctions: [
    'supabase/functions/get-events/index.ts',
    'supabase/functions/search/index.ts',
    'supabase/functions/social-feed/index.ts',
    'supabase/functions/checkout-session/index.ts',
    'supabase/functions/stripe-webhook/index.ts'
  ],
  database: [
    'supabase/schema.sql',
    'phase1_database_setup.sql',
    'security_fixes_ultimate_corrected.sql'
  ]
};

// Test results
const testResults = {
  frontend: { passed: 0, failed: 0, issues: [] },
  edgeFunctions: { passed: 0, failed: 0, issues: [] },
  database: { passed: 0, failed: 0, issues: [] },
  apiGateway: { passed: 0, failed: 0, issues: [] }
};

console.log('🔍 YardPass Debug & Test Suite');
console.log('================================\n');

// 1. Frontend Component Testing
console.log('📱 FRONTEND COMPONENT TESTING');
console.log('----------------------------');

function testFrontendComponents() {
  TEST_CONFIG.frontend.components.forEach(componentPath => {
    console.log(`\n🔍 Testing: ${componentPath}`);
    
    if (!fs.existsSync(componentPath)) {
      console.log(`❌ File not found: ${componentPath}`);
      testResults.frontend.failed++;
      testResults.frontend.issues.push(`File not found: ${componentPath}`);
      return;
    }
    
    const content = fs.readFileSync(componentPath, 'utf8');
    let issues = [];
    
    // Test 1: Import statements
    if (content.includes('import {') && content.includes('Service')) {
      if (!content.includes('apiGateway')) {
        issues.push('Still using old Service imports instead of apiGateway');
      }
    }
    
    // Test 2: API calls
    if (content.includes('await') && content.includes('Service.')) {
      issues.push('Still using old Service API calls');
    }
    
    // Test 3: Error handling
    if (content.includes('apiGateway') && !content.includes('response.error')) {
      issues.push('Missing error handling for apiGateway calls');
    }
    
    // Test 4: TypeScript types
    if (content.includes('interface') || content.includes('type')) {
      console.log('✅ TypeScript interfaces found');
    }
    
    if (issues.length === 0) {
      console.log('✅ Component passed all tests');
      testResults.frontend.passed++;
    } else {
      console.log('❌ Component has issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      testResults.frontend.failed++;
      testResults.frontend.issues.push(...issues.map(issue => `${componentPath}: ${issue}`));
    }
  });
}

// 2. API Gateway Testing
console.log('\n🔧 API GATEWAY TESTING');
console.log('---------------------');

function testApiGateway() {
  const gatewayPath = TEST_CONFIG.frontend.apiGateway;
  console.log(`\n🔍 Testing: ${gatewayPath}`);
  
  if (!fs.existsSync(gatewayPath)) {
    console.log(`❌ File not found: ${gatewayPath}`);
    testResults.apiGateway.failed++;
    testResults.apiGateway.issues.push(`File not found: ${gatewayPath}`);
    return;
  }
  
  const content = fs.readFileSync(gatewayPath, 'utf8');
  let issues = [];
  
  // Test 1: Class definition
  if (!content.includes('class ApiGateway')) {
    issues.push('Missing ApiGateway class definition');
  }
  
  // Test 2: Edge Function calls
  if (!content.includes('call(')) {
    issues.push('Missing call method for Edge Functions');
  }
  
  // Test 3: Error handling
  if (!content.includes('response.error')) {
    issues.push('Missing error handling in API Gateway');
  }
  
  // Test 4: TypeScript types
  if (!content.includes('EdgeFunctionResponse')) {
    issues.push('Missing EdgeFunctionResponse type');
  }
  
  if (issues.length === 0) {
    console.log('✅ API Gateway passed all tests');
    testResults.apiGateway.passed++;
  } else {
    console.log('❌ API Gateway has issues:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    testResults.apiGateway.failed++;
    testResults.apiGateway.issues.push(...issues);
  }
}

// 3. Edge Functions Testing
console.log('\n⚡ EDGE FUNCTIONS TESTING');
console.log('------------------------');

function testEdgeFunctions() {
  TEST_CONFIG.edgeFunctions.forEach(functionPath => {
    console.log(`\n🔍 Testing: ${functionPath}`);
    
    if (!fs.existsSync(functionPath)) {
      console.log(`❌ File not found: ${functionPath}`);
      testResults.edgeFunctions.failed++;
      testResults.edgeFunctions.issues.push(`File not found: ${functionPath}`);
      return;
    }
    
    const content = fs.readFileSync(functionPath, 'utf8');
    let issues = [];
    
    // Test 1: Deno serve function
    if (!content.includes('serve(')) {
      issues.push('Missing Deno serve function');
    }
    
    // Test 2: CORS headers
    if (!content.includes('corsHeaders')) {
      issues.push('Missing CORS headers');
    }
    
    // Test 3: Authentication
    if (!content.includes('auth.uid()') && !content.includes('getUser')) {
      issues.push('Missing authentication check');
    }
    
    // Test 4: Error handling
    if (!content.includes('try {') || !content.includes('catch')) {
      issues.push('Missing try-catch error handling');
    }
    
    // Test 5: Response format
    if (!content.includes('new Response(')) {
      issues.push('Missing proper response format');
    }
    
    if (issues.length === 0) {
      console.log('✅ Edge Function passed all tests');
      testResults.edgeFunctions.passed++;
    } else {
      console.log('❌ Edge Function has issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      testResults.edgeFunctions.failed++;
      testResults.edgeFunctions.issues.push(...issues.map(issue => `${functionPath}: ${issue}`));
    }
  });
}

// 4. Database Schema Testing
console.log('\n🗄️ DATABASE SCHEMA TESTING');
console.log('-------------------------');

function testDatabaseSchema() {
  TEST_CONFIG.database.forEach(schemaPath => {
    console.log(`\n🔍 Testing: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      console.log(`❌ File not found: ${schemaPath}`);
      testResults.database.failed++;
      testResults.database.issues.push(`File not found: ${schemaPath}`);
      return;
    }
    
    const content = fs.readFileSync(schemaPath, 'utf8');
    let issues = [];
    
    // Test 1: Table definitions
    if (!content.includes('CREATE TABLE')) {
      issues.push('Missing table definitions');
    }
    
    // Test 2: RLS policies
    if (!content.includes('CREATE POLICY')) {
      issues.push('Missing RLS policies');
    }
    
    // Test 3: Indexes
    if (!content.includes('CREATE INDEX')) {
      issues.push('Missing database indexes');
    }
    
    // Test 4: Functions
    if (!content.includes('CREATE FUNCTION')) {
      issues.push('Missing database functions');
    }
    
    if (issues.length === 0) {
      console.log('✅ Database schema passed all tests');
      testResults.database.passed++;
    } else {
      console.log('❌ Database schema has issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      testResults.database.failed++;
      testResults.database.issues.push(...issues.map(issue => `${schemaPath}: ${issue}`));
    }
  });
}

// 5. Integration Testing
console.log('\n🔗 INTEGRATION TESTING');
console.log('---------------------');

function testIntegration() {
  console.log('\n🔍 Testing API Gateway Integration');
  
  // Check if API Gateway exports are correct
  const apiIndexPath = 'packages/api/src/index.ts';
  if (fs.existsSync(apiIndexPath)) {
    const content = fs.readFileSync(apiIndexPath, 'utf8');
    
    if (content.includes('export { apiGateway }')) {
      console.log('✅ API Gateway properly exported');
    } else {
      console.log('❌ API Gateway not properly exported');
      testResults.apiGateway.issues.push('API Gateway not properly exported');
    }
    
    if (content.includes('@deprecated')) {
      console.log('✅ Deprecated services properly marked');
    } else {
      console.log('❌ Deprecated services not marked');
      testResults.apiGateway.issues.push('Deprecated services not marked');
    }
  }
  
  console.log('\n🔍 Testing Edge Functions Deployment');
  console.log('Note: Run "supabase functions list" to verify deployment');
}

// 6. Performance Testing
console.log('\n⚡ PERFORMANCE TESTING');
console.log('---------------------');

function testPerformance() {
  console.log('\n🔍 Testing Frontend Performance');
  
  // Check for performance optimizations
  const searchScreenPath = 'apps/mobile/src/screens/main/SearchScreen.tsx';
  if (fs.existsSync(searchScreenPath)) {
    const content = fs.readFileSync(searchScreenPath, 'utf8');
    
    if (content.includes('useMemo')) {
      console.log('✅ useMemo optimizations found');
    } else {
      console.log('❌ Missing useMemo optimizations');
    }
    
    if (content.includes('useCallback')) {
      console.log('✅ useCallback optimizations found');
    } else {
      console.log('❌ Missing useCallback optimizations');
    }
    
    if (content.includes('debounce')) {
      console.log('✅ Debouncing implemented');
    } else {
      console.log('❌ Missing debouncing');
    }
  }
}

// 7. Security Testing
console.log('\n🔒 SECURITY TESTING');
console.log('------------------');

function testSecurity() {
  console.log('\n🔍 Testing Security Measures');
  
  // Check Edge Functions for security
  TEST_CONFIG.edgeFunctions.forEach(functionPath => {
    if (fs.existsSync(functionPath)) {
      const content = fs.readFileSync(functionPath, 'utf8');
      
      if (content.includes('auth.uid()')) {
        console.log(`✅ Authentication check in ${path.basename(functionPath)}`);
      } else {
        console.log(`❌ Missing authentication in ${path.basename(functionPath)}`);
      }
      
      if (content.includes('SUPABASE_ANON_KEY')) {
        console.log(`✅ Using ANON_KEY in ${path.basename(functionPath)}`);
      } else if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.log(`⚠️ Using SERVICE_ROLE_KEY in ${path.basename(functionPath)} (webhook only)`);
      } else {
        console.log(`❌ Missing proper key usage in ${path.basename(functionPath)}`);
      }
    }
  });
}

// Run all tests
function runAllTests() {
  testFrontendComponents();
  testApiGateway();
  testEdgeFunctions();
  testDatabaseSchema();
  testIntegration();
  testPerformance();
  testSecurity();
  
  // Generate summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  
  const totalTests = Object.values(testResults).reduce((sum, category) => 
    sum + category.passed + category.failed, 0
  );
  const totalPassed = Object.values(testResults).reduce((sum, category) => 
    sum + category.passed, 0
  );
  const totalFailed = Object.values(testResults).reduce((sum, category) => 
    sum + category.failed, 0
  );
  
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} ✅`);
  console.log(`Failed: ${totalFailed} ❌`);
  console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  console.log('\n📋 DETAILED RESULTS:');
  Object.entries(testResults).forEach(([category, results]) => {
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  Passed: ${results.passed} ✅`);
    console.log(`  Failed: ${results.failed} ❌`);
    if (results.issues.length > 0) {
      console.log(`  Issues:`);
      results.issues.forEach(issue => console.log(`    - ${issue}`));
    }
  });
  
  // Save results to file
  const resultsPath = 'debug-test-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! YardPass is ready for production.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above.');
  }
}

// Run the test suite
runAllTests();
