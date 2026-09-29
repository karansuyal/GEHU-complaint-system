"""Email templates.

Each ``*_email`` helper returns ``(subject, text_body, html_body)``. Every
message ships a plain-text part as well as HTML, which is what spam filters and
screen readers like best.

The HTML is deliberately old-school (nested tables, inline CSS, bgcolor
buttons): that is the only markup that renders the same in Gmail, Outlook,
Apple Mail and the in-app mail views of Indian carriers' phones.
"""
from html import escape

from app.core.config import settings

PINE = "#204B3B"
PINE_DARK = "#132E24"
BRASS = "#B8862E"
INK = "#17211D"
INK_SOFT = "#42473F"
INK_FAINT = "#8C8A7E"
PAPER = "#FAF9F6"
STONE = "#E4E1D8"

SERIF = "Georgia, 'Times New Roman', serif"
SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


def portal_url(path: str = "") -> str:
    return settings.FRONTEND_ORIGIN.rstrip("/") + path


def _layout(*, preheader: str, heading: str, body_html: str, cta: tuple[str, str] | None = None,
            footnote: str = "") -> str:
    button = ""
    if cta:
        label, url = cta
        button = f"""
        <tr><td style="padding:8px 0 4px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="{PINE}" style="border-radius:6px;">
              <a href="{escape(url, quote=True)}" target="_blank"
                 style="display:inline-block;padding:13px 26px;font-family:{SANS};font-size:15px;
                        font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">{escape(label)}</a>
            </td>
          </tr></table>
        </td></tr>"""
    foot = (
        f'<p style="margin:0 0 10px 0;font-family:{SANS};font-size:12px;line-height:18px;'
        f'color:{INK_FAINT};">{escape(footnote)}</p>'
        if footnote
        else ""
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{escape(heading)}</title>
</head>
<body style="margin:0;padding:0;background:{PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{escape(preheader)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{PAPER}">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="max-width:560px;background:#ffffff;border:1px solid {STONE};border-radius:10px;overflow:hidden;">
    <tr><td bgcolor="{PINE}" style="padding:20px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="34" height="34" align="center" valign="middle" bgcolor="{PINE_DARK}"
            style="border-radius:6px;font-family:{SERIF};font-size:18px;font-weight:bold;color:{PAPER};">G</td>
        <td style="padding-left:12px;font-family:{SERIF};font-size:17px;color:{PAPER};font-weight:bold;">
          GEHU Bhimtal<br>
          <span style="font-family:{SANS};font-size:11px;font-weight:normal;color:#b7c9bf;letter-spacing:.4px;">Complaint Registry</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:30px 28px 8px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-family:{SERIF};font-size:24px;line-height:30px;color:{INK};padding-bottom:14px;">{escape(heading)}</td></tr>
        {body_html}
        {button}
      </table>
    </td></tr>
    <tr><td style="padding:22px 28px 26px 28px;">
      <div style="border-top:1px solid {STONE};padding-top:16px;">
        {foot}
        <p style="margin:0;font-family:{SANS};font-size:12px;line-height:18px;color:{INK_FAINT};">
          Graphic Era Hill University, Bhimtal Campus &middot; This is an automated message, please don't reply.
        </p>
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""


def _p(text: str) -> str:
    return (
        f'<tr><td style="font-family:{SANS};font-size:15px;line-height:24px;color:{INK_SOFT};'
        f'padding-bottom:14px;">{escape(text)}</td></tr>'
    )


def _code_box(code: str) -> str:
    spaced = "&nbsp;".join(escape(c) for c in code)
    return (
        f'<tr><td style="padding:4px 0 18px 0;">'
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td bgcolor="#EAF1EC" style="border:1px solid #DCE8E0;border-radius:8px;padding:14px 26px;'
        f'font-family:{SERIF};font-size:34px;letter-spacing:6px;font-weight:bold;color:{PINE_DARK};">{spaced}</td>'
        f"</tr></table></td></tr>"
    )


def _detail_row(label: str, value: str) -> str:
    return (
        f'<tr><td style="padding:0 0 14px 0;"><table role="presentation" width="100%" cellpadding="0" '
        f'cellspacing="0" border="0" style="border-left:3px solid {BRASS};background:{PAPER};">'
        f'<tr><td style="padding:10px 14px;font-family:{SANS};font-size:13px;color:{INK_FAINT};">{escape(label)}<br>'
        f'<span style="font-size:15px;color:{INK};font-weight:600;">{escape(value)}</span></td></tr></table></td></tr>'
    )


# --------------------------------------------------------------------- OTP


def otp_email(code: str, purpose: str, minutes: int) -> tuple[str, str, str]:
    if purpose == "verify":
        subject = f"{code} is your GEHU Complaint Portal verification code"
        heading = "Verify your email"
        intro = "Enter this code on the verification screen to finish creating your account."
        text = (
            f"Your verification code is {code}\n\n"
            f"It expires in {minutes} minutes. If you didn't sign up, ignore this email."
        )
        footnote = "If you didn't sign up for the GEHU Complaint Portal, you can safely ignore this email."
    else:
        subject = f"{code} is your GEHU Complaint Portal password reset code"
        heading = "Reset your password"
        intro = "Use this code to choose a new password."
        text = (
            f"Your password reset code is {code}\n\n"
            f"It expires in {minutes} minutes. If you didn't ask for this, ignore this email "
            "- your password has not been changed."
        )
        footnote = "If you didn't ask for a reset, ignore this email. Your password has not been changed."
    body = _p(intro) + _code_box(code) + _p(f"This code expires in {minutes} minutes. Never share it with anyone.")
    html = _layout(
        preheader=f"Your code is {code}. It expires in {minutes} minutes.",
        heading=heading,
        body_html=body,
        footnote=footnote,
    )
    return subject, text, html


# ------------------------------------------------------------ notifications


def notification_email(name: str, title: str, message: str, path: str | None) -> tuple[str, str, str]:
    url = portal_url(path or "/")
    first = (name or "there").split()[0]
    text = f"Hi {first},\n\n{title}\n{message}\n\nOpen it: {url}\n"
    body = _p(f"Hi {first},") + _detail_row(title, message)
    html = _layout(
        preheader=message,
        heading=title,
        body_html=body,
        cta=("Open in portal", url),
        footnote="You get these emails because you have an account on the GEHU Complaint Portal.",
    )
    return title, text, html


def complaint_received_email(name: str, ticket_id: str, title: str, complaint_id: str,
                             private: bool) -> tuple[str, str, str]:
    """Confirmation to the student. For anonymous / ragging complaints the
    email stays generic (no category, no title) in case the inbox is shared."""
    first = (name or "there").split()[0]
    url = portal_url(f"/complaints/{complaint_id}")
    subject = f"We received your complaint {ticket_id}"
    intro = "Your complaint has been logged and routed. Keep this ticket number to follow up."
    body = _p(f"Hi {first},") + _p(intro) + _detail_row("Ticket number", ticket_id)
    if not private:
        body += _detail_row("Summary", title)
    text = f"Hi {first},\n\n{intro}\nTicket: {ticket_id}\n" + ("" if private else f"Summary: {title}\n") + f"\nTrack it: {url}\n"
    html = _layout(
        preheader=f"Ticket {ticket_id} is now with the campus team.",
        heading="Complaint received",
        body_html=body,
        cta=("Track complaint", url),
        footnote="You will get an email whenever the status changes.",
    )
    return subject, text, html


def welcome_email(name: str) -> tuple[str, str, str]:
    first = (name or "there").split()[0]
    url = portal_url("/complaints/new")
    subject = "Welcome to the GEHU Complaint Portal"
    text = (
        f"Hi {first},\n\nYour email is verified and your account is ready. "
        f"You can file and track complaints any time: {url}\n"
    )
    body = (
        _p(f"Hi {first},")
        + _p("Your email is verified and your account is ready. File a complaint, follow it "
             "until it is resolved, and rate the outcome.")
    )
    html = _layout(
        preheader="Your account is ready.",
        heading="You're all set",
        body_html=body,
        cta=("File a complaint", url),
    )
    return subject, text, html


def password_changed_email(name: str) -> tuple[str, str, str]:
    first = (name or "there").split()[0]
    subject = "Your GEHU Complaint Portal password was changed"
    text = (
        f"Hi {first},\n\nYour password was just changed. If this was you, no action is needed.\n"
        "If it wasn't, reset it right away using 'Forgot password' on the sign-in page and contact the admin.\n"
    )
    body = (
        _p(f"Hi {first},")
        + _p("Your password was just changed. If this was you, no action is needed.")
        + _p("If it wasn't you, reset it right away with “Forgot password” on the sign-in page and tell the campus admin.")
    )
    html = _layout(
        preheader="Your password was changed.",
        heading="Password changed",
        body_html=body,
        cta=("Go to sign in", portal_url("/login")),
    )
    return subject, text, html


def staff_added_email(name: str, role: str, category: str | None) -> tuple[str, str, str]:
    first = (name or "there").split()[0]
    what = f"{role} for {category}" if category else role
    subject = "You've been added to the GEHU Complaint Portal"
    text = (
        f"Hi {first},\n\nAn admin created a {what} account for you.\n"
        f"Sign in at {portal_url('/login')} with the password the admin shared with you, "
        "then change it via 'Forgot password'.\n"
    )
    body = (
        _p(f"Hi {first},")
        + _p(f"An admin created a {what} account for you on the complaint portal.")
        + _p("Sign in with the password the admin shared with you. For safety, set your own password "
             "using “Forgot password” after your first sign-in.")
    )
    html = _layout(
        preheader=f"You now have a {role} account.",
        heading="Your staff account is ready",
        body_html=body,
        cta=("Sign in", portal_url("/login")),
    )
    return subject, text, html


def delivery_check_email() -> tuple[str, str, str]:
    subject = "Test email from the GEHU Complaint Portal"
    text = "If you can read this, Brevo email delivery is working.\n"
    body = _p("If you can read this, email delivery through Brevo is working correctly.")
    html = _layout(preheader="Email delivery works.", heading="Email is working", body_html=body)
    return subject, text, html

