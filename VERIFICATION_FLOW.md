# Email Verification Flow - Visual Guide

## 📱 Screen Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     REGISTRATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. Register Screen
   ├─ User fills form (name, email, password)
   ├─ Taps "Register"
   └─ Success Alert: "Check your email to verify"
       └─ Redirects to Login

2. Email Inbox
   ├─ User receives verification email
   ├─ Email contains link: https://your-app.vercel.app/verify-email?token=xxx
   └─ User taps link

3. Deep Link Handler (app/_layout.tsx)
   ├─ App intercepts URL
   ├─ Parses token from query params
   └─ Navigates to /verify-email screen

4. Verify Email Screen (app/verify-email.tsx)
   ├─ Loading State
   │   ├─ Shows spinner
   │   └─ "Verifying your email..."
   │
   ├─ Success State
   │   ├─ Green checkmark icon
   │   ├─ "Email verified successfully!"
   │   ├─ "Redirecting to login..."
   │   └─ Auto-redirect after 3 seconds
   │
   └─ Error State
       ├─ Red X icon
       ├─ Error message
       └─ "Back to Login" button

┌─────────────────────────────────────────────────────────────────┐
│                     LOGIN FLOW                                   │
└─────────────────────────────────────────────────────────────────┘

1. Login Screen
   ├─ User enters email/password
   ├─ Taps "Sign In"
   │
   ├─ If email not verified:
   │   ├─ Alert: "Email Not Verified"
   │   ├─ Message: "Please check your email inbox..."
   │   └─ Shows link: "Didn't receive verification email?"
   │
   └─ If verified:
       └─ Success → Navigate to Home

2. Resend Verification Screen (optional)
   ├─ User taps "Didn't receive verification email?"
   ├─ Enters email address
   ├─ Taps "Send Verification Email"
   └─ Success Alert: "Email sent, check your inbox"
       └─ Returns to Login
```

## 🎨 Screen Mockups

### Verify Email Screen - Loading
```
┌─────────────────────────────┐
│                             │
│      ┌─────────────┐        │
│      │   📚 Book   │        │
│      │    Icon     │        │
│      └─────────────┘        │
│                             │
│      GapoLibrary            │
│                             │
│         ⏳ Spinner          │
│                             │
│   Verifying your email...   │
│                             │
└─────────────────────────────┘
```

### Verify Email Screen - Success
```
┌─────────────────────────────┐
│                             │
│      ┌─────────────┐        │
│      │   📚 Book   │        │
│      │    Icon     │        │
│      └─────────────┘        │
│                             │
│      GapoLibrary            │
│                             │
│         ✅ Success          │
│                             │
│  Email verified successfully!│
│                             │
│   Redirecting to login...   │
│                             │
└─────────────────────────────┘
```

### Verify Email Screen - Error
```
┌─────────────────────────────┐
│                             │
│      ┌─────────────┐        │
│      │   📚 Book   │        │
│      │    Icon     │        │
│      └─────────────┘        │
│                             │
│      GapoLibrary            │
│                             │
│         ❌ Error            │
│                             │
│  Verification failed.       │
│  Token expired or invalid.  │
│                             │
│   ┌─────────────────┐       │
│   │ Back to Login   │       │
│   └─────────────────┘       │
│                             │
└─────────────────────────────┘
```

### Resend Verification Screen
```
┌─────────────────────────────┐
│                             │
│      ┌─────────────┐        │
│      │   📧 Mail   │        │
│      │    Icon     │        │
│      └─────────────┘        │
│                             │
│   Resend Verification       │
│                             │
│  Enter your email address   │
│  and we'll send you a new   │
│  verification link.         │
│                             │
│   ┌─────────────────┐       │
│   │ Email           │       │
│   └─────────────────┘       │
│                             │
│   ┌─────────────────┐       │
│   │ Send Verification│      │
│   │      Email       │      │
│   └─────────────────┘       │
│                             │
│   Back to Login             │
│                             │
└─────────────────────────────┘
```

## 🔄 State Diagram

```
                    ┌──────────────┐
                    │   Register   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Email Sent   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ User Clicks  │
                    │ Email Link   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Deep Link   │
                    │   Handler    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Verify     │
                    │   Screen     │
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
         ┌──────────┐          ┌──────────┐
         │ Success  │          │  Error   │
         └────┬─────┘          └────┬─────┘
              │                     │
              ▼                     ▼
         ┌──────────┐          ┌──────────┐
         │  Login   │          │  Retry   │
         │  Screen  │          │  Options │
         └──────────┘          └────┬─────┘
                                    │
                                    ▼
                             ┌──────────────┐
                             │   Resend     │
                             │ Verification │
                             └──────────────┘
```

## 📋 Implementation Checklist

### Mobile App (✅ Complete)
- [x] Verify email screen with loading/success/error states
- [x] Deep link configuration in app.json
- [x] Deep link handler in _layout.tsx
- [x] Resend verification screen
- [x] Enhanced login error handling
- [x] API integration for resend endpoint
- [x] Color palette consistency
- [x] User-friendly error messages

### Backend (⚠️ Required)
- [ ] Create `/api/auth/resend-verification` endpoint
- [ ] Add `resendVerificationEmail()` to authService
- [ ] Implement rate limiting (1 request per 5 minutes)
- [ ] Add token expiration check
- [ ] Invalidate token after successful verification
- [ ] Log verification attempts for security

### Testing
- [ ] Test deep links on iOS simulator
- [ ] Test deep links on Android emulator
- [ ] Test on physical devices
- [ ] Test with expired tokens
- [ ] Test with invalid tokens
- [ ] Test resend functionality
- [ ] Test rate limiting
- [ ] Test email delivery

## 🔗 Deep Link Examples

### Custom Scheme (Always works)
```
gapolibrary://verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Universal Link (Requires domain configuration)
```
https://your-gapolibrary-app.vercel.app/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Testing Command (iOS)
```bash
xcrun simctl openurl booted "gapolibrary://verify-email?token=test123"
```

### Testing Command (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "gapolibrary://verify-email?token=test123" \
  com.gapolibrary.mobile
```

## 🎯 Key Features

1. **Seamless Experience**: User clicks email link → App opens → Verification happens automatically
2. **Error Recovery**: Clear error messages with retry options
3. **Visual Feedback**: Loading spinners, success/error icons
4. **Auto-redirect**: Success state redirects to login after 3 seconds
5. **Resend Option**: Users can request new verification email
6. **Login Protection**: Unverified users see helpful error message
7. **Consistent Design**: Matches web app's green color palette
