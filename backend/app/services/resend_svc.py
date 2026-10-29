import logging
import httpx
from ..config import settings

logger = logging.getLogger("aicte.resend")

RESEND_API_URL = "https://api.resend.com/emails"


def send_otp_email(to_email: str, otp_code: str) -> dict:
    """Send a 6-digit OTP verification email via Resend.
    If RESEND_API_KEY is not set, logs the OTP locally and returns success for smooth local testing."""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
        .header {{ background: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }}
        .header p {{ margin: 6px 0 0; font-size: 13px; color: #94a3b8; }}
        .content {{ padding: 32px 28px; text-align: center; }}
        .lead {{ font-size: 15px; color: #475569; margin-bottom: 24px; line-height: 1.5; }}
        .otp-box {{ display: inline-block; background: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px 36px; margin: 8px 0 24px; }}
        .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7; font-family: monospace; }}
        .footer {{ padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>AICTE Public Grievance Portal</h1>
          <p>Citizen & Student Mobile Verification</p>
        </div>
        <div class="content">
          <p class="lead">Use the one-time verification code below to securely authenticate your mobile complaint session:</p>
          <div class="otp-box">
            <span class="otp-code">{otp_code}</span>
          </div>
          <p style="font-size: 13px; color: #64748b; margin-top: 12px;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div class="footer">
          <p>All India Council for Technical Education (AICTE), New Delhi</p>
          <p>If you did not request this verification code, please disregard this email.</p>
        </div>
      </div>
    </body>
    </html>
    """

    api_key = (settings.resend_api_key or "").strip()
    if not api_key:
        print(f"\n=======================================================")
        print(f"[RESEND SIMULATION] To: {to_email} | OTP: {otp_code}")
        print(f"To send real emails, set RESEND_API_KEY in backend/.env")
        print(f"=======================================================\n")
        return {"status": "simulated", "otp": otp_code}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": f"Your AICTE Grievance Portal Verification Code: {otp_code}",
        "html": html_content
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(RESEND_API_URL, headers=headers, json=payload)
            if resp.status_code in (200, 201):
                logger.info(f"Resend email dispatched successfully to {to_email}")
                return {"status": "sent", "resend_id": resp.json().get("id")}
            else:
                logger.warning(f"Resend API error {resp.status_code}: {resp.text}")
                print(f"[RESEND ERROR {resp.status_code}] {resp.text}. OTP code was: {otp_code}")
                return {"status": "error", "error": resp.text, "otp": otp_code}
    except Exception as e:
        logger.exception("Failed to connect to Resend API")
        print(f"[RESEND EXCEPTION] {e}. OTP code was: {otp_code}")
        return {"status": "exception", "error": str(e), "otp": otp_code}
