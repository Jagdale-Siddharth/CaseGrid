# AICTE Integrated Complaint Monitoring Dashboard (PS 26264)

One institution-wise view of complaint cases across AICTE bureaus and cells, with role-based access,
configurable routing, explainable overlap detection, deadline alerts, audit trail, dashboards and exports,
plus an Expo mobile app for citizens to lodge and track grievances. **All demo data is synthetic.**

| Layer | Technology |
|---|---|
| Web Frontend | React 18, React Router 6, Tailwind CSS 3, Recharts, Vite |
| Mobile App | React Native, Expo, Expo Location, Image Picker, Document Picker |
| Backend | Python, FastAPI, Pydantic v2, SQLAlchemy 2, JWT, bcrypt, SMTP / Resend email |
| Database | SQLite (default) / PostgreSQL 16 |
| Overlap detection | Rules + TF-IDF + optional multilingual sentence embeddings |

## Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Expo Go app on your phone (for the mobile app)
- A Gmail account with 2-Step Verification (for OTP emails)

## 1. Clone
```bash
git clone <your-repo-url>
cd aicte-complaint-platform
```

## 2. Backend
```powershell
cd backend
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# Mac / Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env          # Mac/Linux: cp .env.example .env
```

Edit `backend/.env` (see section 5 for the email settings), then:

```powershell
python -m app.seed --reset                  # creates demo data
python -m scripts.download_model            # optional: downloads the ~220 MB model once
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app
```
- API docs: http://localhost:8000/docs
- `--host 0.0.0.0` is required so a physical phone can reach the backend.
- Restart the backend after any change to `.env`.

## 3. Web dashboard (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

Demo accounts (password `Demo@1234`):

| Username | Role |
|---|---|
| `admin` | Admin |
| `supervisor` | Supervisor |
| `kulkarni`, `patil` | Technical Bureau officers |
| `deshmukh` | Approval Bureau officer |
| `iyer` | Student Grievance Cell officer |
| `management` | Management (read-only) |

## 4. Mobile app (new terminal)
```bash
cd mobile
npm install
npx expo start -c
```
Scan the QR code with **Expo Go**. Your phone and computer must be on the **same Wi-Fi**.

Set the backend address the phone should use:
1. Find your computer's Wi-Fi IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) and copy the IPv4 address.
2. In the app, tap the gear icon, enter `http://YOUR_IP:8000` and tap **Save URL**.
3. Check from the phone's browser: `http://YOUR_IP:8000/docs` should load.

Windows only, if the phone can't connect, run once in PowerShell **as Administrator**:
```powershell
New-NetFirewallRule -DisplayName "AICTE API 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
New-NetFirewallRule -DisplayName "Expo 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
```

## 5. Email OTP setup (mobile login)
The OTP is emailed to whatever address the user enters. The account in `.env` is only the **sender**.

1. Sign in to the Gmail account you want to send from.
2. Turn on 2-Step Verification: https://myaccount.google.com/security
3. Create an App Password: https://myaccount.google.com/apppasswords
4. Put this in `backend/.env` (no spaces, no quotes):
```
DATABASE_URL=sqlite:///./aicte.db
SECRET_KEY=any-long-random-string
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FIXED_TODAY=2026-10-23
ENABLE_SCHEDULER=false

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=your16characterapppassword
SMTP_FROM_EMAIL=your-account@gmail.com

# Dev only: show the OTP in the app if email sending fails
OTP_DEBUG_FALLBACK=false
```
If no SMTP or Resend settings are present, the OTP is printed in the backend terminal for local testing.
**Never commit `.env` or share your App Password.**

## Run everything with Docker (alternative)
```bash
docker compose up --build
```
Web: http://localhost:5173 , API docs: http://localhost:8000/docs

## Tests
```bash
cd backend
pytest
python -m scripts.eval_overlap
```

## Project layout
```
backend/    FastAPI app (app/), tests, scripts
frontend/   React web dashboard
mobile/     Expo mobile app for citizens
docs/       Traceability, demo scripts, mobile guide
```

## Troubleshooting
| Problem | Fix |
|---|---|
| App says "Cannot reach server" | Backend must run with `--host 0.0.0.0`; check the IP, same Wi-Fi, firewall |
| "Could not send the verification email" | Check the `[SMTP ERROR]` line in the backend terminal; verify `SMTP_USER` and App Password belong to the same Gmail account; restart the backend |
| `npx expo start --tunnel` asks for login | Use `npx expo start` (LAN) instead |
| PowerShell blocks activating the venv | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |