import os
import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Hospital Management System")
logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends an email using the configured SMTP server.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.error("SMTP credentials are not configured; email was not sent")
        return False
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        part = MIMEText(html_body, "html")
        msg.attach(part)

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError) as exc:
        logger.exception("SMTP delivery failed: %s", exc)
        return False

def send_verification_email(to_email: str, patient_name: str, verification_link: str):
    subject = "Verify Your Hospital Management System Account"
    
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Hospital Management System</h2>
        <p>Hello {patient_name},</p>
        <p>Thank you for registering with our Hospital Management System.</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{verification_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
        </div>
        <p style="font-size: 14px; color: #666;">This verification link will expire after a limited period.</p>
        <p style="font-size: 14px; color: #666;">If you did not create this account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Regards,<br>Hospital Management System Team</p>
      </body>
    </html>
    """
    
    return send_email(to_email, subject, html_body)

def send_password_reset_email(to_email: str, patient_name: str, reset_link: str):
    subject = "Reset Your Hospital Management System Password"
    
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Hospital Management System</h2>
        <p>Hello {patient_name},</p>
        <p>We received a request to reset your password.</p>
        <p>Please click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #666;">This link will expire after a limited period.</p>
        <p style="font-size: 14px; color: #666;">If you did not request this, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Regards,<br>Hospital Management System Team</p>
      </body>
    </html>
    """
    
    return send_email(to_email, subject, html_body)
