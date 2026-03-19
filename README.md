# GapoLibrary Mobile App

React Native (Expo) mobile companion for the GapoLibrary web system.

## Setup

1. Install dependencies:
   ```bash
   cd GapoLibrary_MobileApp
   npm install
   ```

2. Update the API base URL in `lib/api.ts`:
   - Find your PC's local IP: run `ipconfig` in CMD, look for IPv4 (e.g. `192.168.1.5`)
   - Replace `BASE_URL` with `http://YOUR_IP:3000/api`
   - Make sure the GapoLibrary web app is running (`npm run dev` in the GapoLibrary folder)

3. Start the app:
   ```bash
   npx expo start
   ```

4. Scan the QR code with **Expo Go** on your phone (must be on the same Wi-Fi network).

## Features
- Login / Register
- Browse & search books
- View book details & reserve
- Borrowing history
- Profile & sign out

## Notes
- The mobile app calls the same Next.js API routes as the web app
- Authentication uses the session cookie from the web app's `/api/auth/login` endpoint
- Expo Go does NOT support `localhost` — always use your machine's local IP
