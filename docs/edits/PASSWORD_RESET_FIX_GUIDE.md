# 🔐 Password Reset Fix Guide

## 🚨 **Current Issue:**

The password reset flow is not detecting tokens properly. Console shows:
```
access_token: false
refresh_token: false
type: null
Not setting reset mode - missing tokens or wrong type
```

## 🔍 **Root Cause Analysis:**

The issue is that the ResetPassword component is not properly parsing URL parameters or handling the token flow correctly. Here are the possible causes:

### **1. URL Parameter Parsing Issues**
- Tokens might be in URL hash instead of query parameters
- Supabase sometimes uses different parameter names
- Mobile deep linking might not be configured properly

### **2. Supabase Configuration Issues**
- Redirect URLs not configured correctly
- Email template not set up properly
- Auth settings not configured for password reset

## ✅ **Complete Fix:**

### **Step 1: Check Supabase Auth Configuration**

1. **Go to Supabase Dashboard** > **Authentication** > **URL Configuration**
2. **Set Site URL**: `https://your-domain.com` (or your app's domain)
3. **Add Redirect URLs**:
   ```
   https://your-domain.com/reset-password
   https://your-domain.com/auth/callback
   com.yardpass.app://reset-password (for mobile)
   ```

### **Step 2: Check Email Template**

1. **Go to Supabase Dashboard** > **Authentication** > **Email Templates**
2. **Select "Reset Password" template**
3. **Verify the action URL** includes the correct redirect:
   ```
   {{ .SiteURL }}/reset-password?access_token={{ .Token }}&refresh_token={{ .RefreshToken }}&type=recovery
   ```

### **Step 3: Update ResetPassword Component**

The new `ResetPasswordScreen.tsx` components I created handle:

- ✅ **URL parameter parsing** (both query and hash)
- ✅ **Token detection** and validation
- ✅ **Session establishment** with Supabase
- ✅ **Proper error handling**
- ✅ **Mobile and web compatibility**

### **Step 4: Test the Complete Flow**

#### **Test 1: Send Reset Email**
1. Navigate to ResetPassword screen
2. Enter valid email address
3. Click "Send Reset Email"
4. Check email for reset link

#### **Test 2: Click Reset Link**
1. Click the reset link in your email
2. Should redirect to ResetPassword screen with tokens
3. Console should show:
   ```
   access_token: true
   refresh_token: true
   type: recovery
   Setting reset mode - tokens found
   ```

#### **Test 3: Update Password**
1. Enter new password
2. Confirm password
3. Click "Update Password"
4. Should show success message

## 🧪 **Debugging Steps:**

### **Step 1: Check URL Parameters**

Add this debug code to your ResetPassword component:

```typescript
useEffect(() => {
  // Debug: Log all URL information
  console.log('Current URL:', window.location.href);
  console.log('URL Search:', window.location.search);
  console.log('URL Hash:', window.location.hash);
  
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  console.log('URL Params:', Object.fromEntries(urlParams));
  console.log('Hash Params:', Object.fromEntries(hashParams));
}, []);
```

### **Step 2: Check Supabase Auth State**

```typescript
useEffect(() => {
  // Check current auth state
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('Current session:', data.session);
    console.log('Session error:', error);
  });
}, []);
```

### **Step 3: Test Token Parsing**

```typescript
const testTokenParsing = () => {
  // Test with sample URL
  const testUrl = 'https://your-domain.com/reset-password?access_token=test&refresh_token=test&type=recovery';
  const url = new URL(testUrl);
  const params = new URLSearchParams(url.search);
  
  console.log('Test parsing:', {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type')
  });
};
```

## 🔧 **Common Issues & Solutions:**

### **Issue 1: "Tokens not found"**
**Solution:**
- Check Supabase redirect URL configuration
- Verify email template action URL
- Ensure tokens are being passed in URL

### **Issue 2: "Session establishment failed"**
**Solution:**
- Check if tokens are valid and not expired
- Verify Supabase project configuration
- Check network connectivity

### **Issue 3: "Password update failed"**
**Solution:**
- Ensure session is properly established
- Check password requirements (length, complexity)
- Verify user permissions

### **Issue 4: "Mobile deep linking not working"**
**Solution:**
- Configure deep linking in your mobile app
- Set up URL schemes for your app
- Test with proper mobile navigation

## 📱 **Mobile-Specific Setup:**

### **For React Native/Expo:**

1. **Configure deep linking** in `app.json`:
```json
{
  "expo": {
    "scheme": "yardpass",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "yardpass"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

2. **Handle deep links** in your navigation:
```typescript
import { Linking } from 'react-native';

useEffect(() => {
  const handleDeepLink = (url: string) => {
    // Parse URL and extract tokens
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const type = urlParams.get('type');
    
    if (accessToken && refreshToken && type === 'recovery') {
      // Navigate to ResetPassword with tokens
      navigation.navigate('ResetPassword', {
        access_token: accessToken,
        refresh_token: refreshToken,
        type: type
      });
    }
  };

  Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
}, []);
```

## 🎯 **Expected Results:**

After implementing these fixes:

### **Console Output (Success):**
```
ResetPassword component - URL params check:
access_token: true
refresh_token: true
type: recovery
Setting reset mode - tokens found
Establishing session with tokens...
Session established successfully
```

### **User Experience:**
1. ✅ **User enters email** → Gets reset email
2. ✅ **User clicks email link** → Redirects with tokens
3. ✅ **App detects tokens** → Shows password update form
4. ✅ **User updates password** → Success message
5. ✅ **User can sign in** → With new password

## 🚀 **Next Steps:**

1. **Implement the new ResetPassword components**
2. **Configure Supabase redirect URLs**
3. **Test the complete flow**
4. **Add the components to your navigation**
5. **Test on both web and mobile**

**Your password reset flow will work perfectly!** 🔐✨
