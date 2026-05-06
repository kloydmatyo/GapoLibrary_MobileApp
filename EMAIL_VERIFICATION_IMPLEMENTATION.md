# Email Verification Flow - Implementation Guide

## ✅ What Was Implemented (Mobile App)

### 1. **Verification Screen** (`app/verify-email.tsx`)
- Handles deep links from verification emails
- Shows loading, success, and error states
- Auto-redirects to login after successful verification
- Displays user-friendly error messages

### 2. **Deep Link Configuration**
- Updated `app.json` with URL scheme and associated domains
- Configured `app/_layout.tsx` to handle deep links
- Supports both `gapolibrary://verify-email?token=xxx` and web URLs

### 3. **Resend Verification Screen** (`app/(auth)/resend-verification.tsx`)
- Allows users to request a new verification email
- Simple email input form
- Error handling and success feedback

### 4. **Enhanced Login Screen**
- Detects email verification errors
- Shows specific message for unverified accounts
- Link to resend verification screen

### 5. **API Integration** (`lib/api.ts`)
- Added `resendVerificationEmail()` function
- Ready to consume backend endpoint

---

## ⚠️ Required Backend Implementation (Web App)

### Add Resend Verification Endpoint

Create: `GapoLibrary/app/api/auth/resend-verification/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/backend/services/authService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists and is not verified
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'This email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token and send email
    const result = await authService.resendVerificationEmail(email);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
```

### Update authService

Add to `GapoLibrary/backend/services/authService.ts`:

```typescript
async resendVerificationEmail(email: string) {
  try {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.isVerified) {
      return { success: false, message: 'Email already verified' };
    }

    // Generate new token
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    user.verificationToken = verificationToken;
    await user.save();

    // Send email
    await sendVerificationEmail(user.email, user.name, verificationToken);

    return { success: true, message: 'Verification email sent' };
  } catch (error) {
    console.error('Resend verification error:', error);
    return { success: false, message: 'Failed to send email' };
  }
}
```

---

## 📱 How It Works

### User Flow

1. **Registration**
   - User registers via mobile app
   - Backend sends verification email with link
   - User sees success message: "Check your email to verify"

2. **Email Verification**
   - User clicks link in email: `https://your-app.vercel.app/verify-email?token=xxx`
   - Mobile app intercepts the deep link
   - App navigates to `/verify-email` screen
   - Token is sent to backend API
   - Success: User redirected to login
   - Error: User sees error message with retry option

3. **Resend Verification**
   - User clicks "Didn't receive verification email?" on login
   - Enters email address
   - Backend generates new token and sends email
   - User receives new verification link

4. **Login Protection**
   - Unverified users cannot log in
   - Login screen shows specific error message
   - Provides link to resend verification

---

## 🔗 Deep Link Configuration

### URL Schemes Supported

1. **Custom Scheme**: `gapolibrary://verify-email?token=xxx`
2. **Universal Links**: `https://your-gapolibrary-app.vercel.app/verify-email?token=xxx`

### Testing Deep Links

#### iOS Simulator
```bash
xcrun simctl openurl booted "gapolibrary://verify-email?token=test123"
```

#### Android Emulator
```bash
adb shell am start -W -a android.intent.action.VIEW -d "gapolibrary://verify-email?token=test123"
```

#### Physical Device
Send yourself a test email with the verification link or use a QR code generator.

---

## 🎨 UI/UX Features

- **Loading State**: Spinner with "Verifying your email..." message
- **Success State**: Green checkmark icon with success message, auto-redirect
- **Error State**: Red X icon with error message and "Back to Login" button
- **Consistent Branding**: Uses green color palette matching web app
- **Responsive**: Works on all screen sizes

---

## 🔒 Security Considerations

1. **Token Expiration**: Tokens expire after 24 hours
2. **One-Time Use**: Tokens should be invalidated after successful verification
3. **Rate Limiting**: Backend should limit resend requests (e.g., 1 per 5 minutes)
4. **Email Validation**: Backend validates email format before sending

---

## 📝 Environment Variables

Ensure `.env.local` has:

```env
EXPO_PUBLIC_API_URL=https://your-gapolibrary-app.vercel.app/api
```

For local development:
```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
```

---

## ✅ Testing Checklist

- [ ] User can register and receives verification email
- [ ] Clicking email link opens mobile app
- [ ] Verification screen shows loading state
- [ ] Successful verification redirects to login
- [ ] Invalid token shows error message
- [ ] Expired token shows appropriate error
- [ ] Resend verification sends new email
- [ ] Login blocks unverified users with clear message
- [ ] Deep links work on both iOS and Android
- [ ] Universal links work from email clients

---

## 🚀 Next Steps

1. Implement backend resend verification endpoint
2. Test deep linking on physical devices
3. Configure universal links for production domain
4. Add rate limiting to resend endpoint
5. Consider adding push notifications for verification status
