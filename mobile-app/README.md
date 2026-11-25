# Diksha Real Estate — Field Agent Companion App (Android APK)
## 24/7 Shift GPS Tracker & Mobile Telephony Client

This mobile application companion is built specifically for **Field Employees & Sales Agents** of Diksha Real Estate.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────┐
│       SUPERADMIN / MANAGEMENT (WEB)          │
│  - PC / Laptop / Tablet Browser              │
│  - 24/7 Live Fleet Radar Map (Leaflet)       │
│  - Neural Operations Monitor                 │
│  - Lead & Deal Pipeline Management           │
│  - Call Recordings Player                    │
└──────────────────────▲───────────────────────┘
                       │
       REST APIs & Webhooks (HTTPS / JSON)
       • POST /api/location/ping
       • GET  /api/location/live
       • POST /api/webhooks/telephony
                       │
┌──────────────────────▼───────────────────────┐
│     FIELD AGENTS (ANDROID MOBILE APK)        │
│  - Installed on Agent's Android Smartphone   │
│  - Camera Selfie Punch In / Punch Out        │
│  - High-Accuracy Background GPS Service      │
│  - Offline coordinate caching & flush        │
│  - Cloud-Bridged Auto Call Recording         │
└──────────────────────────────────────────────┘
```

---

## ❓ Critical Answers: Permissions, Privacy & Call Recording

### 1. Does background GPS tracking work on employees' private Android phones?
**Yes, 100%.**
On modern Android (10, 11, 12, 13, and 14), background tracking requires two standard mechanisms:
1. **Background Location Permission (`ACCESS_BACKGROUND_LOCATION`):** The app requests *"Allow all the time"* so coordinates can be read even when the phone screen is turned off or in their pocket.
2. **Foreground Duty Service:** The app creates a non-dismissible notification (e.g. `📍 Diksha Duty Active: Syncing location`). This instructs Android's battery manager not to kill the tracker process.

### 2. What about Employee Privacy on Private Phones?
**Shift-Based Duty Tracking (Best Practice):**
- **When Agent Punches In (Morning):** GPS tracking automatically starts. Pings are sent to the CRM every 3 minutes.
- **When Agent Punches Out (Evening):** GPS tracking terminates immediately. Zero location data is collected outside duty hours.
- This complies with Indian privacy laws, prevents labor disputes, and maintains employee trust.

### 3. How does Auto Call Recording work if employees use private phones?
Google strictly blocks direct call recording on standard phone apps for privacy (since Android 10+).
Diksha CRM uses the **Cloud Virtual Number / Telephony Bridge (Exotel / Twilio)**:
1. Agent clicks **"Call Client"** in CRM or Companion App.
2. The Cloud Telephony server dials the agent's phone.
3. When the agent answers, it instantly dials the client showing the **Diksha Real Estate Official Number** (masking the agent's personal phone number).
4. **100% of the conversation is recorded in high quality on the telecom server.**
5. As soon as the call ends, the recording MP3 and call duration are automatically delivered via webhook (`/api/webhooks/telephony`) and stored in the CRM `public.calls` table!

---

## 🚀 How to Build the Android APK

### Prerequisites:
- Node.js 18+ installed
- Android Studio installed on your development machine (with Android SDK 34)

### Step 1: Install Dependencies
```bash
cd "d:\diksha crm\mobile-app"
npm install
```

### Step 2: Configure Server URL
In `src/config.ts`, verify your server URL:
```typescript
API_BASE_URL: 'https://your-crm-domain.com' // or local IP http://192.168.1.X:3000
```

### Step 3: Build Web Assets & Initialize Capacitor
```bash
npm run build
npx cap add android
npx cap sync android
```

### Step 4: Open in Android Studio & Generate APK
```bash
npx cap open android
```
In Android Studio:
1. Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2. Your `.apk` file will be generated in `android/app/build/outputs/apk/debug/app-debug.apk`.
3. Share the `.apk` file directly with your employees via WhatsApp or install it on their phones!

---

## 📡 Live Telemetry & Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/location/ping` | `POST` | Receives background GPS coords, speed, battery from APK |
| `/api/location/live` | `GET` | Powers 24/7 Live Fleet Radar map on SuperAdmin Web |
| `/api/location/history` | `GET` | Fetches chronological route replay breadcrumb trail |
| `/api/webhooks/telephony`| `POST` | Ingests call duration and audio recording MP3s |
