# YardPass Mobile App - Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the YardPass mobile app to both iOS App Store and Google Play Store.

## Prerequisites

### Development Environment
- Node.js (v18+)
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)
- Xcode (for iOS development)
- Android Studio (for Android development)

### Accounts & Services
- Apple Developer Account ($99/year)
- Google Play Console Account ($25 one-time)
- Expo Account (free)
- Supabase Account (free tier available)

## Initial Setup

### 1. Expo Configuration
```bash
# Login to Expo
eas login

# Configure EAS
eas build:configure
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. App Configuration
Update `app.json` with your app details:
```json
{
  "expo": {
    "name": "YardPass",
    "slug": "yardpass",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yardpass"
    },
    "android": {
      "package": "com.yourcompany.yardpass"
    }
  }
}
```

## iOS Deployment

### 1. Apple Developer Setup
1. **Create App ID**
   - Go to [Apple Developer Portal](https://developer.apple.com)
   - Navigate to Certificates, Identifiers & Profiles
   - Create a new App ID with your bundle identifier

2. **Create Distribution Certificate**
   - Generate a distribution certificate
   - Download and install in Keychain Access

3. **Create Provisioning Profile**
   - Create a distribution provisioning profile
   - Associate with your App ID and certificate

### 2. App Store Connect Setup
1. **Create App**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Click "My Apps" → "+" → "New App"
   - Fill in app information

2. **App Information**
   - App Name: YardPass
   - Bundle ID: com.yourcompany.yardpass
   - SKU: yardpass-ios
   - User Access: Full Access

### 3. Build & Submit
```bash
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### 4. App Store Review Process
1. **Prepare for Review**
   - Complete app metadata
   - Add screenshots (6.5" iPhone, 5.5" iPhone, 12.9" iPad)
   - Write app description
   - Add keywords

2. **Submit for Review**
   - Upload build
   - Complete app review information
   - Submit for review (typically 1-3 days)

## Android Deployment

### 1. Google Play Console Setup
1. **Create Developer Account**
   - Go to [Google Play Console](https://play.google.com/console)
   - Pay $25 registration fee
   - Complete account setup

2. **Create App**
   - Click "Create app"
   - App name: YardPass
   - Default language: English
   - App or game: App
   - Free or paid: Free

### 2. App Signing Setup
1. **Generate Upload Key**
   ```bash
   keytool -genkey -v -keystore yardpass-upload-key.keystore -alias yardpass-upload -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure EAS**
   - Add keystore to EAS secrets
   - Update `eas.json` with Android configuration

### 3. Build & Submit
```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

### 4. Play Store Review Process
1. **Complete Store Listing**
   - App description
   - Screenshots (phone, 7" tablet, 10" tablet)
   - Feature graphic
   - Privacy policy

2. **Content Rating**
   - Complete content rating questionnaire
   - Get content rating certificate

3. **Submit for Review**
   - Upload APK/AAB
   - Complete release information
   - Submit for review (typically 1-7 days)

## CI/CD Pipeline

### 1. GitHub Actions Setup
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy YardPass

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build-ios:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: eas build --platform ios --non-interactive

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: eas build --platform android --non-interactive
```

### 2. Environment Secrets
Add these secrets to your GitHub repository:
- `EXPO_TOKEN`: Your Expo access token
- `APPLE_ID`: Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password
- `GOOGLE_SERVICE_ACCOUNT_KEY`: Google Play service account JSON

## Testing Strategy

### 1. Internal Testing
```bash
# Build for internal testing
eas build --profile preview --platform all

# Distribute to testers
eas submit --latest --platform ios
eas submit --latest --platform android
```

### 2. Beta Testing
- **iOS**: TestFlight
  - Upload build to App Store Connect
  - Add internal testers
  - Submit for external testing

- **Android**: Play Console Internal Testing
  - Upload APK/AAB to Play Console
  - Add testers by email
  - Distribute testing link

### 3. Staged Rollouts
- **iOS**: Phased release (1%, 10%, 50%, 100%)
- **Android**: Staged rollout (1%, 5%, 10%, 50%, 100%)

## Monitoring & Analytics

### 1. Crash Reporting
- **Expo Application Services**
  - Built-in crash reporting
  - Performance monitoring
  - Error tracking

### 2. Analytics
- **Firebase Analytics**
  - User behavior tracking
  - Performance metrics
  - Custom events

### 3. App Store Analytics
- **App Store Connect**
  - Downloads and sales
  - User engagement
  - Performance metrics

- **Google Play Console**
  - Install analytics
  - User acquisition
  - Performance data

## Post-Launch Maintenance

### 1. Version Updates
```bash
# Update version in app.json
# Build new version
eas build --platform all

# Submit updates
eas submit --platform ios
eas submit --platform android
```

### 2. Hot Fixes
- Use Expo Updates for minor fixes
- No app store review required
- Instant deployment

### 3. Monitoring
- Monitor crash reports
- Track user feedback
- Analyze performance metrics
- Respond to app store reviews

## Troubleshooting

### Common Issues
1. **Build Failures**
   - Check Expo SDK version compatibility
   - Verify all dependencies are compatible
   - Review build logs for specific errors

2. **App Store Rejection**
   - Review rejection reasons
   - Fix compliance issues
   - Resubmit with explanations

3. **Play Store Issues**
   - Verify app signing
   - Check content rating
   - Ensure privacy policy compliance

### Support Resources
- [Expo Documentation](https://docs.expo.dev)
- [Apple Developer Documentation](https://developer.apple.com/documentation)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

## Security Considerations

### 1. Code Signing
- Keep private keys secure
- Use key management services
- Rotate keys regularly

### 2. API Security
- Use environment variables for secrets
- Implement proper authentication
- Regular security audits

### 3. Data Protection
- Encrypt sensitive data
- Implement proper data retention
- GDPR compliance

This deployment guide ensures a smooth and secure deployment process for the YardPass mobile application across both major mobile platforms.
