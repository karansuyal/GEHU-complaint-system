"""Sends one test email so you can verify your Brevo setup.

    python send_test_email.py you@example.com
"""
import sys

from app.core.config import settings
from app.services.email import send_email
from app.services.email_templates import delivery_check_email


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python send_test_email.py you@example.com")
        return 2
    to = sys.argv[1]
    print(f"Provider: {settings.email_provider}   From: {settings.sender_address or '(not set)'}")
    if settings.email_provider == "console":
        print("No provider configured (BREVO_API_KEY / SMTP_HOST empty): the mail will only be printed below.\n")
    subject, text, html = delivery_check_email()
    ok = send_email(to, subject, text, html)
    print("Sent." if ok else "FAILED - check the log lines above (bad API key, unverified sender, or blocked IP are the usual causes).")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
