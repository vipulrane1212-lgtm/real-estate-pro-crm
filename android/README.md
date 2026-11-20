# Diksha Real Estate CRM — Android Native App

This is the official Android companion application for **Diksha Real Estate CRM**. It connects directly to the Next.js CRM backend on your local network or server, reusing the existing database, authentication sessions, and business logic with zero duplication.

---

## 1. Native Features Implemented

1. **Configurable Server Address (`ConfigActivity.kt`):**
   - Allows dynamically setting the Next.js server URL (e.g. `http://192.168.1.X:3000` for physical devices on office WiFi, or `http://10.0.2.2:3000` for Android Virtual Device emulators).
   - Includes an instant "Test Ping" button to verify server reachability before connecting.
   - Preserves session cookies in `SharedPreferences` for background services.

2. **Unmissable Loud Alarm for Overdue Follow-ups (`AlarmActivity.kt` & `FollowUpAlarmService.kt`):**
   - Runs as an Android Foreground Service monitoring `/api/follow-ups/reminders`.
   - When an overdue follow-up is detected, it triggers a **Full-Screen Intent** (`setFullScreenIntent`) that turns on the phone screen and displays the alarm over the lock screen (`FLAG_SHOW_WHEN_LOCKED` + `FLAG_TURN_SCREEN_ON`).
   - Plays the native alarm audio ringtone (`RingtoneManager.TYPE_ALARM`) at full volume and activates a persistent SOS vibration pattern until the agent acts.
   - Interactive alarm screen features:
     * **Call Client Now**: Opens native phone dialer with pre-dialed number.
     * **Mark Complete**: Hits `PATCH /api/follow-ups/[id]` to close the follow-up.
     * **Snooze 5m / 10m**: Hits `POST /api/follow-ups/[id]/snooze`.
     * **Acknowledge / Dismiss**: Hits `POST /api/follow-ups/[id]/acknowledge`.

3. **Renewal & Agreement Voice Alerts (`FollowUpAlarmService.kt`):**
   - Employs native Android `android.speech.tts.TextToSpeech` to vocalize upcoming expirations (7 days, 3 days, 1 day, and on the day) as returned by `/api/alerts/expiries`.
   - Speaks out loud: *"Attention: Agreement for [property/client] expires in 3 days"*.

4. **Live Selfie Anti-Spoofing Camera Enforcement (`MainActivity.kt`):**
   - Intercepts WebChromeClient `onShowFileChooser` to strictly launch the camera intent (`MediaStore.ACTION_IMAGE_CAPTURE`).
   - **Intentionally blocks gallery/file-picker intents** to ensure attendance selfies cannot be faked with saved gallery photos.
   - Automatically handles HTML5 Geolocation and WebRTC camera permissions.

5. **Full Real Estate Operations:**
   - Full access to Leads, Follow-ups, Live Attendance check-in/out, Documents, and Free-Form Office Expenses.

---

## 2. Prerequisites to Build

- **Android Studio** (Hedgehog, Iguana, or later) OR command-line **Android SDK** (API level 34).
- **JDK 17** (Java Development Kit 17+).

---

## 3. How to Build the APK

### Method A: Via Android Studio (Recommended)
1. Open Android Studio.
2. Select **Open** and choose the `android` folder located at `d:\diksha crm\android`.
3. Allow Gradle to sync dependencies.
4. From the top menu, select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Android Studio will generate the debug APK at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### Method B: Via Command Line (Gradle)
From a terminal in the `android` folder (with `JAVA_HOME` pointing to JDK 17):
```bash
# On Windows
gradlew.bat assembleDebug

# On Linux / macOS / WSL
./gradlew assembleDebug
```
The output APK will be placed in `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 4. How to Install and Test on an Android Phone

1. **Ensure Both Phone and PC are on the Same WiFi Network:**
   - On your Windows machine running `npm run dev`, open PowerShell and run `ipconfig` to find your local IPv4 address (e.g. `192.168.1.15`).
2. **Transfer APK to Phone:**
   - **Via USB cable:** Connect phone via USB, enable File Transfer, and copy `app-debug.apk` to your phone's *Downloads* folder.
   - **Via ADB:** Run `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
   - **Via WhatsApp / Google Drive:** Send the APK file to your phone and download it.
3. **Install the APK:**
   - Tap the APK file on your phone.
   - When prompted with *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** and toggle **Allow from this source**.
   - Tap **Install**.
4. **First Run & Server Setup:**
   - Open **Diksha CRM**.
   - Tap the **Server IP** button in the top navy header.
   - Enter your computer's local IP, for example: `http://192.168.1.15:3000`.
   - Tap **Test Ping** to verify connectivity.
   - Tap **Save & Connect**.
5. **Test Workflow on Mobile:**
   - **Login:** Enter your agent or admin credentials.
   - **Live Attendance:** Navigate to Attendance, tap Check-In, allow Camera and Location permissions, take a live selfie (verify that gallery selection is blocked), and punch in.
   - **Free-Form Expense:** Open Office Expenses, tap Record Expense, type a headline (e.g. *Chai Nashta*), amount, and save.
   - **Loud Alarm:** When a scheduled follow-up becomes overdue on the web or mobile, your phone will trigger the full-screen alarm screen with loud audio and vibration even if the phone screen is locked.
