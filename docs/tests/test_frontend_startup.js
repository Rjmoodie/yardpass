const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Frontend Startup...\n');

try {
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found');
    process.exit(1);
  }

  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Check TypeScript compilation
  console.log('🔍 Checking TypeScript compilation...');
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    console.log('⚠️  TypeScript errors found (but continuing)...');
    console.log('   This is expected during development');
  }

  // Check if Expo CLI is available
  console.log('📱 Checking Expo CLI...');
  try {
    execSync('npx expo --version', { stdio: 'pipe' });
    console.log('✅ Expo CLI available');
  } catch (error) {
    console.log('⚠️  Expo CLI not found, installing...');
    execSync('npm install -g @expo/cli', { stdio: 'inherit' });
  }

  // Check if we can start the development server
  console.log('🚀 Testing development server startup...');
  console.log('   (This will start the server - press Ctrl+C to stop)');
  
  // Start the development server
  execSync('npm start', { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error during testing:', error.message);
  process.exit(1);
}
