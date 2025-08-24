# 🔐 Google Sign-In Setup Guide for YardPass

## 📋 **Overview**

This guide will help you set up Google Sign-In for your YardPass app using the existing `profiles` table structure.

## 🎯 **What You'll Get:**

- ✅ **Google Sign-In buttons** that actually work
- ✅ **Automatic profile creation** from Google data
- ✅ **Seamless authentication flow** with Supabase
- ✅ **Cross-platform support** (iOS, Android, Web)
- ✅ **Compatible with existing codebase** (uses profiles table)

## 🔧 **Step-by-Step Setup:**

### **Step 1: Google Cloud Console Setup**

#### **1.1 Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** and **Google Sign-In API**

#### **1.2 Configure OAuth 2.0 Credentials**
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Configure for each platform:

**For Web:**
- Application type: **Web application**
- Name: `YardPass Web`
- Authorized JavaScript origins: 
  - `https://tgxgbiskbqjniviqoroh.supabase.co`
  - `http://localhost:3000` (for development)
- Authorized redirect URIs:
  - `https://tgxgbiskbqjniviqoroh.supabase.co/auth/v1/callback`

**For Android:**
- Application type: **Android**
- Name: `YardPass Android`
- Package name: `com.yardpass.app` (your app's package name)
- SHA-1 certificate fingerprint: (get from your keystore)

**For iOS:**
- Application type: **iOS**
- Name: `YardPass iOS`
- Bundle ID: `com.yardpass.app` (your app's bundle ID)

#### **1.3 Get Client IDs**
Save these client IDs:
- **Web Client ID**: `your-web-client-id.apps.googleusercontent.com`
- **Android Client ID**: `your-android-client-id.apps.googleusercontent.com`
- **iOS Client ID**: `your-ios-client-id.apps.googleusercontent.com`

### **Step 2: Supabase Configuration**

#### **2.1 Enable Google Provider**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/tgxgbiskbqjniviqoroh/auth/providers)
2. Find **Google** in the providers list
3. Click **Enable**
4. Add your **Web Client ID** and **Web Client Secret**
5. Save configuration

#### **2.2 Configure Redirect URLs**
In Supabase Auth settings, add these redirect URLs:
- `https://tgxgbiskbqjniviqoroh.supabase.co/auth/v1/callback`
- `com.yardpass.app://` (for mobile deep linking)

### **Step 3: Install Dependencies**

```bash
# Install Google Sign-In package
npm install @react-native-google-signin/google-signin

# Install additional dependencies
npm install expo-auth-session expo-crypto expo-web-browser
```

### **Step 4: Environment Configuration**

Add these to your `.env` file:

```bash
# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# Supabase Configuration (already set)
EXPO_PUBLIC_SUPABASE_URL=https://tgxgbiskbqjniviqoroh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **Step 5: Update Database Schema**

Run `GOOGLE_SIGNIN_PROFILES_SETUP.sql` in Supabase SQL Editor. This will:

- ✅ **Add Google fields** to existing `profiles` table
- ✅ **Create indexes** for Google ID lookups
- ✅ **Update RLS policies** for Google users
- ✅ **Create Google sign-in function** for profiles table
- ✅ **Update auto-profile creation** trigger

### **Step 6: Create Google Auth Service**

The `src/services/googleAuth.ts` file is already created and configured to work with the `profiles` table.

### **Step 7: Update Auth Slice**

Add Google Sign-In to your Redux auth slice:

```typescript
// In src/store/slices/authSlice.ts
import { GoogleAuthService } from '@/services/googleAuth';

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const { user, session } = await GoogleAuthService.signInWithGoogle();
      
      // Get or create user profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw new Error(profileError.message);
      }

      return profile || {
        id: user.id,
        handle: user.email?.split('@')[0] || '',
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        is_verified: true,
        auth_provider: 'google',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
      };
    } catch (error) {
      return rejectWithValue({
        message: error instanceof Error ? error.message : 'Google sign-in failed',
        code: 'GOOGLE_SIGN_IN_ERROR'
      });
    }
  }
);
```

### **Step 8: Update Sign-In Screen**

Replace the placeholder Google button with real functionality:

```typescript
// In src/screens/auth/SignInScreen.tsx
import { signInWithGoogle } from '@/store/slices/authSlice';

const handleGoogleSignIn = async () => {
  try {
    await dispatch(signInWithGoogle()).unwrap();
    // Navigation will be handled by auth state change
  } catch (error) {
    // Error is already handled by the slice
  }
};

// Replace the placeholder button:
<TouchableOpacity
  style={[styles.socialButton, styles.googleButton]}
  onPress={handleGoogleSignIn}
  activeOpacity={0.8}
>
  <Ionicons name="logo-google" size={20} color="#DB4437" />
  <Text style={styles.googleButtonText}>Continue with Google</Text>
</TouchableOpacity>
```

## 🧪 **Testing Your Setup:**

### **Test Checklist:**
- [ ] **Google Sign-In button** appears on sign-in screen
- [ ] **Google account selection** opens when button is pressed
- [ ] **User is redirected** to YardPass after successful sign-in
- [ ] **User profile** is created/updated in profiles table
- [ ] **Session persists** after app restart
- [ ] **Sign-out** works correctly

### **Database Verification:**
Run this SQL to verify the setup:

```sql
-- Check profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test Google sign-in function
SELECT * FROM public.handle_google_signin(
  'test_google_id_123',
  'test@example.com',
  'Test User',
  'https://example.com/photo.jpg',
  'Test',
  'User'
);
```

## 🎯 **Expected User Flow:**

1. **User taps "Continue with Google"**
2. **Google account picker opens**
3. **User selects account**
4. **Google authenticates user**
5. **Supabase creates/updates profile in profiles table**
6. **User is signed in to YardPass**
7. **App navigates to main screen**

## 🚀 **Key Benefits of This Approach:**

### **✅ Compatibility:**
- **Uses existing profiles table** - no schema conflicts
- **Works with current AuthContext** - no refactoring needed
- **Maintains foreign key relationships** - no data integrity issues
- **Preserves existing functionality** - all current features work

### **✅ Enhanced Features:**
- **Google account verification** - automatic verified status
- **Profile data sync** - name, email, photo from Google
- **Seamless integration** - works with existing auth flow
- **Cross-platform support** - iOS, Android, Web

## 🚨 **Common Issues & Solutions:**

#### **"Google Sign-In not configured"**
- Check that `GoogleSignin.configure()` is called
- Verify client IDs are correct
- Ensure Google+ API is enabled

#### **"Invalid client" error**
- Verify client IDs match your app's package name
- Check that OAuth consent screen is configured
- Ensure redirect URIs are correct

#### **"Profile not found" error**
- Run the database setup script
- Check that profiles table has Google fields
- Verify RLS policies are correct

## 🔧 **Next Steps:**

After Google Sign-In is working:
- Add **Apple Sign-In** for iOS users
- Implement **social profile linking**
- Add **account merging** for existing users
- Create **onboarding flow** for new Google users

**Your Google Sign-In will be fully functional and compatible with your existing codebase!** 🔐✨
