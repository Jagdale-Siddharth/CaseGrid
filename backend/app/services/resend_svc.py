import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

import httpx
from ..config import settings

logger = logging.getLogger("aicte.email")

RESEND_API_URL = "https://api.resend.com/emails"
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_otp_email(to_email: str, otp_code: str) -> dict:
    """Send a 6-digit OTP verification email via Brevo, Resend, or SMTP.
    If no provider is set, logs the OTP locally and returns success for smooth local testing."""

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

    subject = f"Your AICTE Grievance Portal Verification Code: {otp_code}"

    # 0) Google Apps Script Web App (delivers to ANY recipient natively over HTTPS port 443)
    google_url = (settings.google_mail_webhook_url or "").strip()
    if google_url:
        return _send_via_google_script(google_url, to_email, subject, html_content, otp_code)

    # 1) Brevo HTTPS REST API (port 443 - works anywhere, delivers to ANY recipient)
    brevo_key = (settings.brevo_api_key or "").strip()
    if brevo_key:
        return _send_via_brevo(brevo_key, to_email, subject, html_content, otp_code)

    # 2) Resend HTTPS REST API (port 443)
    resend_key = (settings.resend_api_key or "").strip()
    if resend_key:
        return _send_via_resend(resend_key, to_email, subject, html_content, otp_code)

    # 3) SMTP (with fast 3-second timeout to avoid locking the event loop)
    if settings.smtp_host and settings.smtp_user and settings.smtp_password:
        return _send_via_smtp(to_email, subject, html_content, otp_code)

    # 4) No provider configured -> simulated fallback
    print(f"\n=======================================================")
    print(f"[OTP SIMULATION] To: {to_email} | OTP: {otp_code}")
    print(f"Set BREVO_API_KEY, RESEND_API_KEY, or SMTP_* in backend/.env to send real emails")
    print(f"=======================================================\n")
    return {"status": "simulated", "otp": otp_code}


def _send_via_brevo(api_key: str, to_email: str, subject: str, html: str, otp_code: str) -> dict:
    sender_email = (settings.brevo_sender_email or settings.smtp_from_email or "rishidembla07@gmail.com").strip()
    sender_name = settings.brevo_sender_name or "AICTE Grievance Portal"
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
    }
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(BREVO_API_URL, headers=headers, json=payload)
        if resp.status_code in (200, 201):
            logger.info(f"Brevo email dispatched successfully to {to_email}")
            return {"status": "sent", "provider": "brevo", "messageId": resp.json().get("messageId")}
        logger.warning(f"Brevo API error {resp.status_code}: {resp.text}")
        print(f"[BREVO ERROR {resp.status_code}] {resp.text}. OTP code was: {otp_code}")
        return {"status": "error", "error": resp.text, "otp": otp_code}
    except Exception as e:
        logger.exception("Failed to connect to Brevo API")
        print(f"[BREVO EXCEPTION] {e}. OTP code was: {otp_code}")
        return {"status": "exception", "error": str(e), "otp": otp_code}


def _send_via_smtp(to_email: str, subject: str, html: str, otp_code: str) -> dict:
    sender = (settings.smtp_from_email or settings.smtp_user).strip()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender if "<" in sender else formataddr(("AICTE Grievance Portal", sender))
    msg["To"] = to_email
    msg.set_content(
        f"Your AICTE Grievance Portal verification code is {otp_code}.\n"
        f"It is valid for 10 minutes. Do not share this code with anyone."
    )
    msg.add_alternative(html, subtype="html")
    try:
        ctx = ssl.create_default_context()
        if settings.smtp_use_ssl or settings.smtp_port == 465:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=3, context=ctx) as srv:
                srv.login(settings.smtp_user, settings.smtp_password)
                srv.send_message(msg)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=3) as srv:
                srv.ehlo()
                srv.starttls(context=ctx)
                srv.ehlo()
                srv.login(settings.smtp_user, settings.smtp_password)
                srv.send_message(msg)
        logger.info(f"SMTP email dispatched successfully to {to_email}")
        return {"status": "sent", "provider": "smtp"}
    except Exception as e:
        logger.exception("SMTP send failed")
        print(f"[SMTP ERROR] {e}. OTP code was: {otp_code}")
        return {"status": "exception", "error": str(e), "otp": otp_code}


def _send_via_resend(api_key: str, to_email: str, subject: str, html: str, otp_code: str) -> dict:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"from": settings.resend_from_email, "to": [to_email], "subject": subject, "html": html}
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(RESEND_API_URL, headers=headers, json=payload)
        if resp.status_code in (200, 201):
            logger.info(f"Resend email dispatched successfully to {to_email}")
            return {"status": "sent", "provider": "resend", "resend_id": resp.json().get("id")}
        logger.warning(f"Resend API error {resp.status_code}: {resp.text}")
        print(f"[RESEND ERROR {resp.status_code}] {resp.text}. OTP code was: {otp_code}")
        return {"status": "error", "error": resp.text, "otp": otp_code}
    except Exception as e:
        logger.exception("Failed to connect to Resend API")
        print(f"[RESEND EXCEPTION] {e}. OTP code was: {otp_code}")
        return {"status": "exception", "error": str(e), "otp": otp_code}


def _send_via_google_script(webhook_url: str, to_email: str, subject: str, html: str, otp_code: str) -> dict:
    payload = {
        "to": to_email,
        "subject": subject,
        "html": html,
    }
    try:
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            resp = client.post(webhook_url, json=payload)
        if resp.status_code in (200, 201):
            data = resp.json() if resp.text.strip().startswith("{") else {}
            if data.get("status") == "error":
                logger.error(f"Google Script reported error: {data.get('error')}")
                return {"status": "error", "error": data.get("error", "Google Script error"), "otp": otp_code}
            logger.info(f"Google Script email dispatched successfully to {to_email}")
            return {"status": "sent", "provider": "google_apps_script"}
        logger.warning(f"Google Script HTTP {resp.status_code}: {resp.text}")
        return {"status": "error", "error": resp.text, "otp": otp_code}
    except Exception as e:
        logger.exception("Failed to connect to Google Script Webhook")
        return {"status": "exception", "error": str(e), "otp": otp_code}
