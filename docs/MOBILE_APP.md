# AICTE Citizen Grievance Mobile Application

A cross-platform mobile application built with **React Native (0.88.0)** and **Expo (SDK 58)** designed for students, faculty members, and citizen stakeholders to lodge complaints, submit verifiable field evidence, and track grievances in real time.

---

## 1. Key Capabilities

### 1.1 Passwordless Email OTP Authentication
- Authenticates citizens via email OTP powered by the **Resend API**.
- When `RESEND_API_KEY` is set in `backend/.env`, an official branded AICTE verification email is dispatched.
- In offline/development mode without a Resend key, the 6-digit OTP is automatically logged to the backend console for instant developer preview.
- Issue and verification endpoints:
  - `POST /citizen/auth/send-otp` (Rate-limited, 10-minute expiry window).
  - `POST /citizen/auth/verify-otp` (Returns JWT access token with `sub=citizen:<email>`).

### 1.2 Verifiable Field Evidence (Geotagging & Documents)
- **GPS Geotagging**: Uses `expo-location` to capture precise device coordinates (`geo_latitude`, `geo_longitude`) and performs reverse geocoding to attach the physical street address (`geo_address`).
- **Photo Capture & Upload**: Uses `expo-image-picker` to capture or choose high-resolution field photos.
- **Document Attachments**: Uses `expo-document-picker` to attach official letters, fee receipts, or PDFs up to 10 MB.
- **W3C Base64 Transport**: Files and photos are transferred as Base64 JSON payloads to guarantee 100% reliability across modern Android and iOS runtimes (avoiding legacy FormData implementation bugs in React Native 0.88+).

### 1.3 Urgent Priority Flag
- Citizens can toggle an **Urgent** priority checkbox for critical violations (e.g. safety hazards, extortion, withheld hall tickets).
- Cases flagged urgent automatically inherit elevated priority and trigger faster supervisor SLA tracking.

### 1.4 Real-time Public Tracking
- Public tracking endpoint (`GET /citizen/track/{case_id}`):
  - Accessible directly on the mobile app's **Track Complaint** tab.
  - Citizens or stakeholders can enter any Case Reference ID (e.g., `CMP-2026-000031`) without logging in to see:
    - Current handling bureau/cell (Regulation Bureau, Approval Bureau, Grievance Cell).
    - Status badge (Open, In Progress, Under Review, Resolved).
    - Urgent priority indicator.
    - Chronological action timeline and expected disposal dates.

---

## 2. Directory Structure

```
mobile/
├── App.js                     # Root entry point with Tab navigation & auth context
├── app.json                   # Expo SDK 58 application manifest & permissions
├── package.json               # Expo 58, React Native 0.88, React 19 dependencies
├── babel.config.js            # Babel preset for Expo
└── src/
    ├── services/
    │   └── api.js             # API client, Base64 encoder, auth & tracking endpoints
    └── screens/
        ├── AuthScreen.jsx         # Email entry and 6-digit OTP verification
        ├── NewComplaintScreen.jsx  # Grievance filing with Geotag, Docs, and Urgent toggle
        ├── MyComplaintsScreen.jsx  # List of cases filed by the authenticated citizen
        ├── TrackCaseScreen.jsx    # Public case reference tracker
        └── ProfileScreen.jsx      # Citizen profile and sign-out
```

---

## 3. How to Run the Mobile App

### Prerequisites
- Node.js 18+ installed on your host machine.
- **Expo Go** app installed on your physical Android or iOS device from Google Play Store or Apple App Store.

### Step 1: Start the Backend Server
Make sure the backend is running and listening on `0.0.0.0`:
```bash
cd backend
.\.venv\Scripts\Activate.ps1   # or source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app
```

### Step 2: Configure API Host (If using Local Wi-Fi)
In `mobile/src/services/api.js`, the default host is configured to:
```javascript
const BASE_URL = 'http://<YOUR_LOCAL_IP>:8000';
```
*(Example: `http://10.83.67.219:8000` or your machine's active Wi-Fi IPv4 address).*

### Step 3: Launch Expo Dev Server
From the project root:
```bash
cd mobile
npm install
npx expo start -c --tunnel
```
*(The `--tunnel` flag creates a secure ngrok tunnel so your physical phone can connect even if it is on a different Wi-Fi network or cellular data).*

### Step 4: Open on Your Phone
1. Open the **Expo Go** app on your phone.
2. Scan the QR code displayed in your terminal.
3. The app bundles and opens directly on your phone with live reload enabled.

---

## 4. API Endpoints for Citizen Operations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/citizen/auth/send-otp` | Sends a 6-digit OTP to the complainant's email via Resend API |
| `POST` | `/citizen/auth/verify-otp` | Validates OTP and returns JWT token |
| `GET` | `/citizen/auth/me` | Fetches authenticated citizen details |
| `GET` | `/citizen/institutions` | Searchable list of technical institutions for autocomplete |
| `GET` | `/citizen/categories` | AICTE grievance categories (Infrastructure, Faculty, Fees, etc.) |
| `POST` | `/citizen/complaints` | Submits new grievance with Base64 geotagged photo and PDF attachment |
| `GET` | `/citizen/my-complaints` | Returns all grievances filed under the citizen's email |
| `GET` | `/citizen/track/{case_id}` | Public tracking view for any case ID (no auth required) |
