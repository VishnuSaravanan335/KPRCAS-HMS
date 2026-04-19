from flask import Flask, request, jsonify, session, send_from_directory
from flask.wrappers import Response
import json, os, hashlib, uuid
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Tuple, Union, TypeVar, cast
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'kprhub_secret_2024'

# ─── FILE UPLOAD CONFIGURATION ───────────────────────────────────────────────
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

# ─── SMTP CONFIGURATION ────────────────────────────────────────────────────────
# WARNING: In a production environment, use environment variables for security.
MAIL_SERVER = "smtp.gmail.com"
MAIL_PORT = 587
MAIL_USE_TLS = True
MAIL_USERNAME = "hmskprcas@gmail.com"
MAIL_PASSWORD = "xhyw zskg flan urxt"
MAIL_DEFAULT_SENDER = "hmskprcas@gmail.com"

# --- IT SUPPORT EMAIL CONFIG ---
IT_MAIL_USERNAME = "itsupportkprcas@gmail.com"
IT_MAIL_PASSWORD = "qiot jeas ukhb vaf"

# --- RECEPTION EMAIL CONFIG ---
REC_MAIL_USERNAME = "receptionsupportkprcas@gmail.com"
REC_MAIL_PASSWORD = "wjwd knqj iwtt gaac"

def send_smtp_email(sender_email: str, sender_password: str, recipients: List[str], subject: str, html_content: str) -> Tuple[bool, str]:
    """Helper to send SMTP email from any account."""
    if not sender_password:
        return False, "SMTP password not configured."
    
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        return True, "Email sent successfully."
    except Exception as e:
        print(f"SMTP error ({sender_email}): {e}")
        return False, str(e)

# --- ADMIN EMAILS ---

def get_admin_emails() -> List[str]:
    """Helper to fetch all admin email addresses from data.json."""
    try:
        data = load_data()
        emails = [u.get('email') for u in data.get('users', []) if u.get('role') == 'admin' and u.get('email')]
        return [str(e) for e in emails if e]
    except Exception:
        return []

def send_event_notification(event_data):
    """Sends a professional HTML email notification for a new event booking."""
    admins = get_admin_emails()
    
    # Booker Email Lookup
    booker_id = event_data.get('created_by')
    data = load_data()
    booker = next((u for u in data.get('users', []) if u['id'] == booker_id), None)
    booker_email = booker.get('email') if booker else None
    
    # Trigger next department email
    def is_dept_done(event, target_dept):
        ri = event.get('requested_items', [])
        items = [i for i in ri if i['dept'] == target_dept]
        if not items:
            return True
        return all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in items)

    next_dept = None
    if not is_dept_done(event_data, 'it'): next_dept = 'it'
    elif not is_dept_done(event_data, 'reception'): next_dept = 'reception'
    elif not is_dept_done(event_data, 'pixesclub'): next_dept = 'pixesclub'
    elif not is_dept_done(event_data, 'fineartsclub'): next_dept = 'fineartsclub'

    recipients = admins
    if booker_email: recipients.append(booker_email)
    
    # ALWAYS include Principal and mandatory depts as per new workflow
    principal = next((u for u in data.get('users', []) if u['role'] == 'principal'), None)
    if principal and principal.get('email'): recipients.append(principal.get('email'))
    
    recipients.append(IT_MAIL_USERNAME)
    recipients.append(REC_MAIL_USERNAME)

    # Conditional teams based on event flags
    if event_data.get('has_photos'): # Pixels
        pc = next((u for u in data.get('users', []) if u['role'] == 'pixesclub'), None)
        if pc and pc.get('email'): recipients.append(pc.get('email'))
    
    if event_data.get('has_dance'): # Fine Arts
        fa = next((u for u in data.get('users', []) if u['role'] == 'fineartsclub'), None)
        if fa and fa.get('email'): recipients.append(fa.get('email'))
    
    # Filter duplicates and empty strings
    recipients = list(set([r for r in recipients if r and "@" in r]))
    
    if not recipients:
        recipients = ["23bcomca131@kprcas.ac.in"]

    if not MAIL_PASSWORD:
        return False, "SMTP password not configured."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🔔 New Event Booking: {event_data.get('title')}"
    msg["From"] = MAIL_DEFAULT_SENDER
    msg["To"] = ", ".join(recipients)

    html = f"""
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">KPRCAS HMS - New Booking Request</h2>
            <p>Dear Team,</p>
            <p>A new event booking request has been received from <strong>{event_data['created_by_name']}</strong> and is awaiting your review.</p>
            <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #4f46e5;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; font-weight: bold; width: 150px; color: #64748b;">Event Name:</td><td>{event_data.get('title')}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Coordinator:</td><td>{event_data.get('coordinator')}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Date:</td><td>{event_data.get('date')}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Venue:</td><td>{event_data.get('hall_name')}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Type:</td><td>{event_data.get('event_type')}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Resource:</td><td>{event_data.get('resource_person')}</td></tr>
                </table>
            </div>
            <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-weight: bold; color: #6366f1;">Description:</p>
                <p style="margin: 5px 0 0;">{event_data['description']}</p>
            </div>
            <p style="margin-top: 20px; font-size: 0.85rem; color: #64748b;">This notification is sent via KPRCAS HMS centralized bridge.</p>
        </div>
    </body>
    </html>
    """
    # Force real SMTP attempt
    return send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, recipients, f"🔔 New Event Booking: {event_data.get('title')}", html)

def send_approval_notification(event_data, recipient=None):
    """Sends email when an event is approved by the Principal — to Booker, IT, Reception, Admin."""
    admins = get_admin_emails()
    booker_id = event_data.get('created_by')
    data = load_data()
    booker = next((u for u in data.get('users', []) if u['id'] == booker_id), None)
    booker_email = booker.get('email') if booker else None

    recipients = list(set(admins + [IT_MAIL_USERNAME, REC_MAIL_USERNAME] +
                         ([booker_email] if booker_email else []) +
                         ([recipient] if recipient else [])))
    recipients = [r for r in recipients if r and "@" in r]
    if not recipients:
        recipients = ["23bcomca131@kprcas.ac.in"]

    html = f"""
    <html><body style="font-family:sans-serif;color:#333;line-height:1.6">
    <div style="max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:14px;background:#f0fdf4">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div style="width:48px;height:48px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#fff">✓</div>
        <div>
          <h2 style="margin:0;color:#15803d;font-size:1.25rem">Event Approved!</h2>
          <p style="margin:0;font-size:0.85rem;color:#4b5563">KPRCAS Hall Management System</p>
        </div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:18px;border:1px solid #bbf7d0;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280;width:140px">Event</td><td style="font-weight:600;color:#111827">{event_data.get('title')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280">Date</td><td>{event_data.get('date')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280">Venue</td><td>{event_data.get('hall_name')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280">Hall</td><td>{event_data.get('time_slot','')}</td></tr>
        </table>
      </div>
      <p style="color:#166534;font-weight:500;font-size:0.9rem">✅ This event has been fully approved by the Principal. All departments please prepare accordingly.</p>
      <p style="font-size:0.78rem;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:16px">KPRCAS HMS • Automated Notification</p>
    </div></body></html>"""
    return send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, recipients, f"✅ Event Approved: {event_data.get('title')}", html)

def send_rejection_notification(event_data):
    """Sends a professional cancellation email according to the new institution template."""
    admins = get_admin_emails()
    booker_id = event_data.get('created_by')
    data = load_data()
    booker = next((u for u in data.get('users', []) if u['id'] == booker_id), None)
    booker_email = booker.get('email') if booker else None

    # Recipients: All stakeholders
    recipients = list(set(admins + [IT_MAIL_USERNAME, REC_MAIL_USERNAME] +
                         ([booker_email] if booker_email else [])))
    
    # Add Principal and Clubs
    principal = next((u for u in data.get('users', []) if u['role'] == 'principal'), None)
    if principal and principal.get('email'): recipients.append(principal.get('email'))
    
    if event_data.get('has_photos'):
        pc = next((u for u in data.get('users', []) if u['role'] == 'pixesclub'), None)
        if pc and pc.get('email'): recipients.append(pc.get('email'))
    if event_data.get('has_dance'):
        fa = next((u for u in data.get('users', []) if u['role'] == 'fineartsclub'), None)
        if fa and fa.get('email'): recipients.append(fa.get('email'))

    recipients = [r for r in recipients if r and "@" in r]
    if not recipients: recipients = ["23bcomca131@kprcas.ac.in"]

    subject = f"Cancellation: {event_data.get('title')}"
    
    html = f"""
    <html><body style="font-family:sans-serif;color:#333;line-height:1.6">
    <div style="max-width:600px;margin:0 auto;padding:24px;border:1px solid #fecaca;border-radius:14px;background:#fff">
      <p>Dear User,</p>
      <p>We regret to inform you that your hall booking request has been cancelled due to approval rejection from the authorized authority.</p>
      
      <div style="background:#f8fafc;border-radius:10px;padding:18px;border:1px solid #e2e8f0;margin:20px 0">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;font-weight:700;color:#64748b;width:120px">Event:</td><td>{event_data.get('title')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#64748b">Hall:</td><td>{event_data.get('hall_name')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#64748b">Date:</td><td>{event_data.get('date')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#64748b">Status:</td><td style="color:#dc2626;font-weight:800">Cancelled</td></tr>
        </table>
      </div>
      
      <p>For further details, please check out the HMS (Hall Management System).</p>
      <br>
      <p>Regards,<br><strong>Hall Management System</strong></p>
    </div></body></html>"""
    
    return send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, recipients, subject, html)

def send_dept_decision_notification(event_data, role, decision):
    """Send IT or Reception approve/reject notification to the Booker."""
    booker_id = event_data.get('created_by')
    data = load_data()
    booker = next((u for u in data.get('users', []) if u['id'] == booker_id), None)
    booker_email = booker.get('email') if booker else None
    if not booker_email:
        return False, "No booker email"

    dept_name = "IT Support" if role == 'it' else "Reception"
    is_approved = (decision == 'approved')
    status_color = "#16a34a" if is_approved else "#b91c1c"
    status_bg = "#f0fdf4" if is_approved else "#fef2f2"
    status_border = "#bbf7d0" if is_approved else "#fecaca"
    icon = "✓" if is_approved else "✕"
    icon_bg = "#16a34a" if is_approved else "#dc2626"
    verb = "Approved" if is_approved else "Rejected"
    subject = f"{'✅' if is_approved else '❌'} {dept_name} {verb}: {event_data.get('title')}"

    html = f"""
    <html><body style="font-family:sans-serif;color:#333;line-height:1.6">
    <div style="max-width:600px;margin:0 auto;padding:24px;border:1px solid {status_border};border-radius:14px;background:{status_bg}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div style="width:48px;height:48px;background:{icon_bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#fff">{icon}</div>
        <div>
          <h2 style="margin:0;color:{status_color};font-size:1.2rem">{dept_name} Requirements {verb}</h2>
          <p style="margin:0;font-size:0.85rem;color:#6b7280">KPRCAS HMS Notification</p>
        </div>
      </div>
      <div style="background:#fff;border-radius:10px;padding:18px;border:1px solid {status_border};margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280;width:140px">Event</td><td style="font-weight:600">{event_data.get('title')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280">Date</td><td>{event_data.get('date')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280">Venue</td><td>{event_data.get('hall_name')}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280">Department</td><td>{dept_name}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;color:#6b7280">Status</td><td style="font-weight:800;color:{status_color}">{verb.upper()}</td></tr>
        </table>
      </div>
      <p style="font-size:0.78rem;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px">KPRCAS HMS • Automated Notification</p>
    </div></body></html>"""
    return send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, [booker_email], subject, html)

def send_allocation_complete_notification(event_data, recipient=None):
    """Notify Principal and Booker that IT/Reception allocation is done."""
    admins = get_admin_emails()
    recipients = admins
    if recipient: recipients.append(recipient)
    if not recipients:
        recipients = ["23bcomca131@kprcas.ac.in"]

    html = f"""
    <html><body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #eef2ff;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">KPRCAS HMS - Allocation Finalized</h2>
            <p>Resources for <strong>{event_data.get('title')}</strong> have been successfully allocated by the respective departments.</p>
            <p style="font-size: 0.9rem; color: #64748b;">The request is now pending with the <strong>Principal approval desk</strong>.</p>
        </div>
    </body></html>"""

    return send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, recipients, f"✅ Resource Allocation Complete: {event_data.get('title')}", html)

def send_stage_update_notification(event_data, role):
    """IT or Reception decision notification to Booker and trigger HMS notification."""
    booker_id = event_data.get('created_by')
    data = load_data()
    booker = next((u for u in data.get('users', []) if u['id'] == booker_id), None)
    booker_email = booker.get('email') if booker else None
    
    sender = MAIL_USERNAME
    pwd = MAIL_PASSWORD
    dept_name = "IT Support" if role == 'it' else ("Reception" if role == 'reception' else ("Pixes Club" if role == 'pixesclub' else "Fine Arts Club"))

    # Specific requirement: If IT approves, notify User and Reception
    if role == 'it':
        subject = f"✅ IT Requirements Approved: {event_data['title']}"
        recipients = [REC_MAIL_USERNAME]
        if booker_email: recipients.append(booker_email)
        
        html = f"""
        <html><body style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f0fdf4;">
                <h2 style="color: #10b981;">IT Department Approval</h2>
                <p>The <strong>IT Support</strong> department has approved the requirements for your event <strong>{event_data['title']}</strong>.</p>
                <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
                    <p><strong>Event Details:</strong></p>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>📅 Date:</strong> {event_data.get('date')}</li>
                        <li><strong>🏛️ Venue:</strong> {event_data.get('hall_name')}</li>
                    </ul>
                </div>
                <p style="font-size: 0.9rem; color: #64748b;">The request is now moving to the next stage of approval.</p>
            </div>
        </body></html>"""
        send_smtp_email(sender, pwd, recipients, subject, html)
    else:
        # Standard notification for Reception or other roles
        subject = f"🔄 Requirement Update: {dept_name} - {event_data['title']}"
        html = f"""
        <html><body style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
                <h2 style="color: #6366f1;">{dept_name} Update</h2>
                <p>The <strong>{dept_name}</strong> department has processed your event requirements for <strong>{event_data['title']}</strong>.</p>
                <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 15px 0;">
                    <p style="margin: 0;"><strong>Status:</strong> <span style="font-weight: 700; color: #10b981;">Processed & Allocated</span></p>
                </div>
                <p style="margin-top: 15px; font-size: 0.9rem; color: #64748b;">This notification is sent via the KPRCAS HMS system bridge.</p>
            </div>
        </body></html>"""
        if booker_email:
            send_smtp_email(sender, pwd, [booker_email], subject, html)

    # Sequence Check logic to notify the NEXT department
    def is_dept_done(event, target_dept):
        ri = event.get('requested_items', [])
        items = [i for i in ri if i['dept'] == target_dept]
        if not items:
            return True
        return all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in items)

    next_dept = None
    if not is_dept_done(event_data, 'it'): next_dept = 'it'
    elif not is_dept_done(event_data, 'reception'): next_dept = 'reception'
    elif not is_dept_done(event_data, 'pixesclub'): next_dept = 'pixesclub'
    elif not is_dept_done(event_data, 'fineartsclub'): next_dept = 'fineartsclub'

    # If the just-finished role means there is a new next_dept, notify them
    if next_dept and next_dept != role:
        recipients = []
        if next_dept == 'it': recipients.append(IT_MAIL_USERNAME)
        elif next_dept == 'reception': recipients.append(REC_MAIL_USERNAME)
        elif next_dept == 'pixesclub':
            pc = next((u for u in data.get('users', []) if u['role'] == 'pixesclub'), None)
            if pc and pc.get('email'): recipients.append(pc.get('email'))
        elif next_dept == 'fineartsclub':
            fa = next((u for u in data.get('users', []) if u['role'] == 'fineartsclub'), None)
            if fa and fa.get('email'): recipients.append(fa.get('email'))
            
        recipients = list(set([r for r in recipients if r and "@" in r]))
        if recipients:
            n_subject = f"🔔 Next Step Required: {event_data.get('title')}"
            n_html = f"""
            <html><body style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
                    <h2 style="color: #4f46e5;">Pending Approval Required</h2>
                    <p>The previous department has processed their requirements. It is now your turn to review <strong>{event_data['title']}</strong>.</p>
                </div>
            </body></html>"""
            send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, recipients, n_subject, n_html)

    # If both IT and Reception are done, send final details from HMS account
    status = compute_event_status(event_data)
    if status == 'principal_review':
        hms_subject = f"📢 Final Booking Details: {event_data['title']}"
        hms_html = f"""
        <html><body style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #eef2ff;">
                <h2 style="color: #4f46e5;">KPRCAS HMS - Final Booking Brief</h2>
                <p>IT and Reception have approved the requirements. Here are the final details for <strong>{event_data['title']}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: #fff; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Venue:</td><td style="padding: 8px;">{event_data.get('hall_name')}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Date:</td><td style="padding: 8px;">{event_data.get('date')}</td></tr>
                </table>
                <p style="margin-top: 20px; font-size: 0.85rem; color: #64748b; text-align: center;">Automated Stage Completion - KPRCAS HMS</p>
            </div>
        </body></html>"""
        send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, [IT_MAIL_USERNAME, REC_MAIL_USERNAME], hms_subject, hms_html)

# ─── TYPE ALIASES ─────────────────────────────────────────────────────────────

JsonDict  = Dict[str, Any]
RouteResp = Union[Response, Tuple[Response, int]]

# ─── CORS ─────────────────────────────────────────────────────────────────────

@app.after_request
def add_cors(response: Response) -> Response:
    response.headers['Access-Control-Allow-Origin']      = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods']     = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers']     = 'Content-Type'
    return response

DATA_FILE: str = 'data.json'

# ─── DATA HELPERS ─────────────────────────────────────────────────────────────

def load_data() -> JsonDict:
    if not os.path.exists(DATA_FILE):
        return init_data()
    with open(DATA_FILE, 'r') as f:
        return json.load(f)  # type: ignore[no-any-return]

def save_data(data: JsonDict) -> None:
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def get_request_json() -> JsonDict:
    """Safely retrieve JSON body — always returns a plain dict, never None or str."""
    body = request.get_json(silent=True, force=True)
    if isinstance(body, dict):
        return body  # type: ignore[return-value]
    return {}

def init_data() -> JsonDict:
    data: JsonDict = {
        "settings": {"portal_locked": False},
        "users": [
            {"id": "u1", "name": "Admin User",       "username": "admin",        "password": hash_pw("admin123"),        "role": "admin"},
            {"id": "u2", "name": "Dr. Priya",         "username": "booker",       "password": hash_pw("booker123"),       "role": "booker"},
            {"id": "u3", "name": "Rajan (IT)",        "username": "it",           "password": hash_pw("it123"),           "role": "it"},
            {"id": "u4", "name": "Meena (Reception)", "username": "reception",    "password": hash_pw("reception123"),    "role": "reception"},
            {"id": "u5", "name": "Principal Kumar",   "username": "principal",    "password": hash_pw("principal123"),    "role": "principal"},
            {"id": "u6", "name": "Pixes Club Lead",   "username": "pixesclub",    "password": hash_pw("pixes123"),        "role": "pixesclub",    "email": ""},
            {"id": "u7", "name": "Fine Arts Lead",    "username": "fineartsclub", "password": hash_pw("finearts123"),     "role": "fineartsclub", "email": ""},
        ],
        "halls": [
            # ── Classrooms ──────────────────────────────────────────────────
            {"id": "h_af101", "name": "AF 101",                 "capacity": 60,   "type": "Classroom",  "locked": False, "image": "https://blind-jade-follsdsq9o.edgeone.app/Gemini_Generated_Image_39822p39822p3982.png"},
            {"id": "h_bf101", "name": "BF 101",                 "capacity": 60,   "type": "Classroom",  "locked": False, "image": "https://blind-jade-follsdsq9o.edgeone.app/Gemini_Generated_Image_39822p39822p3982.png"},
            # ── Labs ────────────────────────────────────────────────────────
            {"id": "h_lab1",  "name": "Lab 1",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab2",  "name": "Lab 2",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab3",  "name": "Lab 3",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab4",  "name": "Lab 4",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab6",  "name": "Lab 6",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab7",  "name": "Lab 7",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab8",  "name": "Lab 8",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab9",  "name": "Lab 9",                  "capacity": 50,   "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            # ── Seminar Halls ────────────────────────────────────────────────
            {"id": "h_sem1",  "name": "Seminar Hall 1",         "capacity": 150,  "type": "Seminar",    "locked": False, "image": "https://image2url.com/r2/default/images/1773031202621-88ba1c54-5f16-4dbc-a880-b333ba18d35e.jpg"},
            {"id": "h_sem2",  "name": "Seminar Hall 2",         "capacity": 200,  "type": "Seminar",    "locked": False, "image": "https://image2url.com/r2/default/images/1773031202621-88ba1c54-5f16-4dbc-a880-b333ba18d35e.jpg"},
            # ── Auditoriums ──────────────────────────────────────────────────
            {"id": "h_aud1",  "name": "Auditorium 1",           "capacity": 800,  "type": "Auditorium", "locked": False, "image": "https://image2url.com/r2/default/images/1773031158304-90488c29-3ede-4e04-b854-785134193c29.jpg"},
            {"id": "h_aud2",  "name": "Auditorium 2",           "capacity": 800,  "type": "Auditorium", "locked": False, "image": "https://image2url.com/r2/default/images/1773031158304-90488c29-3ede-4e04-b854-785134193c29.jpg"},
            # ── OAT ─────────────────────────────────────────────────────────
            {"id": "h_oat",   "name": "Open Air Theatre (OAT)", "capacity": 1000, "type": "Open Air",   "locked": False, "image": "https://image2url.com/r2/default/images/1773031158304-90488c29-3ede-4e04-b854-785134193c29.jpg"},
        ],
        "inventory": [
            # ── IT Requirements ──────────────────────────────────────────────
            {"id": "it01", "name": "Hand Mic",           "dept": "it",        "stock_qty": 10,  "in_use": 0},
            {"id": "it02", "name": "Podium Mic",         "dept": "it",        "stock_qty": 5,   "in_use": 0},
            {"id": "it03", "name": "Speakers",           "dept": "it",        "stock_qty": 8,   "in_use": 0},
            {"id": "it04", "name": "Laptop",             "dept": "it",        "stock_qty": 20,  "in_use": 0},
            {"id": "it05", "name": "Projector",          "dept": "it",        "stock_qty": 10,  "in_use": 0},
            {"id": "it06", "name": "Presenter",          "dept": "it",        "stock_qty": 8,   "in_use": 0},
            {"id": "it07", "name": "Podium",             "dept": "it",        "stock_qty": 4,   "in_use": 0},
            {"id": "it08", "name": "Photo Camera",       "dept": "it",        "stock_qty": 3,   "in_use": 0},
            {"id": "it09", "name": "Video Camera",       "dept": "it",        "stock_qty": 3,   "in_use": 0},
            {"id": "it10", "name": "White Board",        "dept": "it",        "stock_qty": 10,  "in_use": 0},
            # ── Stationary / Reception Requirements ──────────────────────────
            {"id": "rc01", "name": "Lamp",               "dept": "reception", "stock_qty": 20,  "in_use": 0},
            {"id": "rc02", "name": "Paneer Sprinkler",   "dept": "reception", "stock_qty": 15,  "in_use": 0},
            {"id": "rc03", "name": "Tray",               "dept": "reception", "stock_qty": 20,  "in_use": 0},
            {"id": "rc04", "name": "Silver Bowls",       "dept": "reception", "stock_qty": 30,  "in_use": 0},
            {"id": "rc05", "name": "Table Cloth",        "dept": "reception", "stock_qty": 25,  "in_use": 0},
            {"id": "rc06", "name": "Plug Card",          "dept": "reception", "stock_qty": 15,  "in_use": 0},
            {"id": "rc07", "name": "L-Folder",           "dept": "reception", "stock_qty": 50,  "in_use": 0},
            {"id": "rc08", "name": "Water Bottle",       "dept": "reception", "stock_qty": 200, "in_use": 0},
            {"id": "rc09", "name": "Hall Chairs",        "dept": "reception", "stock_qty": 500, "in_use": 0},
            {"id": "rc10", "name": "Stage Table",        "dept": "reception", "stock_qty": 10,  "in_use": 0},
            {"id": "rc11", "name": "Stage Chair",        "dept": "reception", "stock_qty": 30,  "in_use": 0},
            {"id": "rc12", "name": "Registration Table", "dept": "reception", "stock_qty": 10,  "in_use": 0},
            {"id": "rc13", "name": "Registration Chair", "dept": "reception", "stock_qty": 20,  "in_use": 0},
            {"id": "rc14", "name": "Reception Table",    "dept": "reception", "stock_qty": 8,   "in_use": 0},
            {"id": "rc15", "name": "Refreshment Table",  "dept": "reception", "stock_qty": 8,   "in_use": 0},
            {"id": "rc16", "name": "T-Poy",              "dept": "reception", "stock_qty": 15,  "in_use": 0},
            # ── Pixes Club (Photography) ──────────────────────────────────────
            {"id": "px01", "name": "DSLR Camera",        "dept": "pixesclub",    "stock_qty": 5,   "in_use": 0},
            {"id": "px02", "name": "Go Pro Camera",      "dept": "pixesclub",    "stock_qty": 3,   "in_use": 0},
            {"id": "px03", "name": "Drone",              "dept": "pixesclub",    "stock_qty": 2,   "in_use": 0},
            {"id": "px04", "name": "Camera Tripod",      "dept": "pixesclub",    "stock_qty": 8,   "in_use": 0},
            {"id": "px05", "name": "Photo Printer",      "dept": "pixesclub",    "stock_qty": 2,   "in_use": 0},
            # ── Fine Arts Club (Dance / Events) ──────────────────────────────
            {"id": "fa01", "name": "Backdrop Stand",     "dept": "fineartsclub", "stock_qty": 4,   "in_use": 0},
            {"id": "fa02", "name": "Costume Set",        "dept": "fineartsclub", "stock_qty": 10,  "in_use": 0},
            {"id": "fa03", "name": "Stage Lights",       "dept": "fineartsclub", "stock_qty": 12,  "in_use": 0},
            {"id": "fa04", "name": "Sound System",       "dept": "fineartsclub", "stock_qty": 3,   "in_use": 0},
            {"id": "fa05", "name": "Dance Props Set",    "dept": "fineartsclub", "stock_qty": 5,   "in_use": 0},
        ],
        "events": []
    }
    save_data(data)
    return data

# ─── AUTH DECORATORS ──────────────────────────────────────────────────────────

def login_required(f: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(f)
    def decorated(*args: Any, **kwargs: Any) -> Any:
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return cast(Callable[..., Any], decorated)

def roles_required(*roles: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorator(f: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(f)
        def decorated(*args: Any, **kwargs: Any) -> Any:
            if 'user_id' not in session:
                return jsonify({"error": "Unauthorized"}), 401
            data = load_data()
            user = next((u for u in data['users'] if u['id'] == session['user_id']), None)
            if not user or user['role'] not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return cast(Callable[..., Any], decorated)
    return decorator

# ─── PAGES ────────────────────────────────────────────────────────────────────

@app.route('/')
def index() -> Response:
    return send_from_directory('templates', 'index.html')

@app.route('/dashboard')
def dashboard() -> Response:
    return send_from_directory('templates', 'dashboard.html')

# ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login() -> Response:
    d: JsonDict = get_request_json()
    username = d.get('username')
    password = d.get('password')
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
    
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    data = load_data()
    user = next((u for u in data['users'] if u['username'] == username and u['password'] == hashed_password), None)
    
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    session['user_id'] = user['id']
    session['role'] = user['role']
    session.permanent = True
    return jsonify({"success": True, "role": user['role']})

@app.route('/api/logout', methods=['POST'])
def logout() -> Response:
    session.pop('user_id', None)
    return jsonify({"success": True})

@app.route('/api/me')
def me() -> RouteResp:
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = load_data()
    user = next((u for u in data['users'] if u['id'] == session['user_id']), None)
    if not user:
        session.pop('user_id', None)
        return jsonify({"error": "User not found"}), 401
    
    return jsonify({
        "user":     {k: v for k, v in user.items() if k != 'password'},
        "settings": data['settings']
    })

# ─── SETTINGS ─────────────────────────────────────────────────────────────────

@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings() -> Response:
    data = load_data()
    return jsonify(data['settings'])

@app.route('/api/settings/portal-lock', methods=['POST'])
@roles_required('admin')
def toggle_portal_lock() -> Response:
    data = load_data()
    data['settings']['portal_locked'] = not data['settings']['portal_locked']
    save_data(data)
    return jsonify(data['settings'])

# ─── HIERARCHY ────────────────────────────────────────────────────────────────

@app.route('/api/hierarchy', methods=['GET'])
@login_required
def get_hierarchy() -> Response:
    data = load_data()
    return jsonify(data.get('hierarchy', {}))

@app.route('/api/hierarchy', methods=['PUT'])
@roles_required('admin')
def update_hierarchy() -> Response:
    d: JsonDict = get_request_json()
    data = load_data()
    data['hierarchy'] = d
    save_data(data)
    return jsonify(data['hierarchy'])

# ─── USERS ────────────────────────────────────────────────────────────────────

@app.route('/api/users', methods=['GET'])
@roles_required('admin')
def get_users() -> Response:
    data = load_data()
    return jsonify([{k: v for k, v in u.items() if k != 'password'} for u in data['users']])

@app.route('/api/users', methods=['POST'])
@roles_required('admin')
def create_user() -> RouteResp:
    d: JsonDict = get_request_json()
    data = load_data()
    if any(u['username'] == d.get('username') for u in data['users']):
        return jsonify({"error": "Username already exists"}), 400
    new_user: JsonDict = {
        "id":       "u" + str(uuid.uuid4()).split('-')[0],
        "name":     d['name'],
        "username": d['username'],
        "password": hash_pw(str(d['password'])),
        "role":     d['role'],
        "email":    d.get('email', '')
    }
    data['users'].append(new_user)
    save_data(data)
    return jsonify({k: v for k, v in new_user.items() if k != 'password'}), 201

@app.route('/api/users/<uid>', methods=['PUT'])
@roles_required('admin')
def update_user(uid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    data = load_data()
    user: Optional[JsonDict] = next((u for u in data['users'] if u['id'] == uid), None)
    if not user:
        return jsonify({"error": "Not found"}), 404
    user['name'] = d.get('name', user['name'])
    user['role'] = d.get('role', user['role'])
    user['email'] = d.get('email', user.get('email', ''))
    if d.get('password'):
        user['password'] = hash_pw(str(d['password']))
    save_data(data)
    return jsonify({k: v for k, v in user.items() if k != 'password'})

@app.route('/api/users/<uid>', methods=['DELETE'])
@roles_required('admin')
def delete_user(uid: str) -> RouteResp:
    if uid == session.get('user_id'):
        return jsonify({"error": "Cannot delete yourself"}), 400
    data = load_data()
    data['users'] = [u for u in data['users'] if u['id'] != uid]
    save_data(data)
    return jsonify({"ok": True})

# ─── HALLS ────────────────────────────────────────────────────────────────────

@app.route('/api/halls', methods=['GET'])
@login_required
def get_halls() -> Response:
    data = load_data()
    return jsonify(data['halls'])

@app.route('/api/halls', methods=['POST'])
@roles_required('admin')
def create_hall() -> RouteResp:
    data = load_data()
    
    # Handle both multipart/form-data and JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        name = request.form.get('name')
        capacity = request.form.get('capacity')
        hall_type = request.form.get('type')
        photo_file = request.files.get('photo')
    else:
        d = get_request_json()
        name = d.get('name')
        capacity = d.get('capacity')
        hall_type = d.get('type')
        photo_file = None

    if not name or not capacity:
        return jsonify({"error": "Name and capacity are required"}), 400

    photo_path = ""
    if photo_file and photo_file.filename:
        ext = photo_file.filename.rsplit('.', 1)[-1].lower() if '.' in photo_file.filename else ''
        safe_name = f"hall_{uuid.uuid4().hex[:8]}.{ext}"
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
        photo_file.save(save_path)
        photo_path = f'/static/uploads/{safe_name}'

    hall: JsonDict = {
        "id":       "h" + str(uuid.uuid4()).split('-')[0],
        "name":     name,
        "capacity": int(capacity),
        "type":     hall_type,
        "locked":   False,
        "image":    photo_path or (request.get_json(silent=True) or {}).get('image', '')
    }
    data['halls'].append(hall)
    save_data(data)
    return jsonify(hall), 201

def timeslot_overlap(slot1: str, slot2: str) -> bool:
    if not slot1 or not slot2:
        return False
    if slot1 == slot2:
        return True
    
    # Standard slots
    full_day = "9:00 AM - 6:00 PM (Full Day)"
    standard_slots = ["9:00 AM - 12:00 PM", "12:00 PM - 3:00 PM", "3:00 PM - 6:00 PM", full_day]
    
    # Full day overlaps with everything
    if slot1 == full_day or slot2 == full_day:
        return True
        
    # If either is a custom slot and not explicitly identical, assume overlap to be safe and prevent double booking
    if slot1 not in standard_slots or slot2 not in standard_slots:
        return True
        
    # If they are different standard slots (like morning vs afternoon), they don't overlap
    return False

def check_available_halls(data: JsonDict, event_date: str, slot: str, days: int = 1, cap: int = 0) -> List[JsonDict]:
    if not event_date or not slot:
        return []
    try:
        start_date = datetime.strptime(event_date, "%Y-%m-%d").date()
    except ValueError:
        return []
         
    required_dates = {(start_date + timedelta(days=i)).isoformat() for i in range(days)}
    busy_halls: set[str] = set()
    for e in data['events']:
        status = compute_event_status(e)
        if status not in ('rejected', 'cancelled') and timeslot_overlap(e.get('time_slot', ''), slot):
            e_start_str = e.get('date')
            e_days = int(e.get('days', 1))
            if e_start_str:
                try:
                    e_start = datetime.strptime(e_start_str, "%Y-%m-%d").date()
                    e_dates = {(e_start + timedelta(days=i)).isoformat() for i in range(e_days)}
                    if required_dates.intersection(e_dates):
                        for h_id in str(e.get('hall_id', '')).split(','):
                            if h_id.strip():
                                busy_halls.add(h_id.strip())
                except ValueError:
                    pass

    return [
        h for h in data.get('halls', [])
        if not h.get('locked') and int(h.get('capacity', 0)) >= cap and h['id'] not in busy_halls
    ]

@app.route('/api/halls/available', methods=['GET'])
@login_required
def get_available_halls() -> RouteResp:
    event_date: Optional[str] = request.args.get('date')
    days_str:   Optional[str] = request.args.get('days', '1')
    slot:       Optional[str] = request.args.get('slot')
    cap:        int           = int(request.args.get('capacity', 0))
    if not event_date or not slot:
        return jsonify({"error": "Date and slot required"}), 400

    try:
        days = int(days_str) if days_str else 1
    except ValueError:
        days = 1

    data = load_data()
    avail = check_available_halls(data, event_date, slot, days, cap)
    return jsonify(avail)

@app.route('/api/halls/<hid>', methods=['PUT'])
@roles_required('admin')
def update_hall(hid: str) -> RouteResp:
    data = load_data()
    hall: Optional[JsonDict] = next((h for h in data['halls'] if h['id'] == hid), None)
    if not hall:
        return jsonify({"error": "Not found"}), 404

    # Handle both multipart/form-data and JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        hall['name'] = request.form.get('name', hall['name'])
        if request.form.get('capacity'):
            hall['capacity'] = int(request.form.get('capacity'))
        hall['type'] = request.form.get('type', hall['type'])
        if request.form.get('locked'):
            hall['locked'] = request.form.get('locked').lower() == 'true'
        
        photo_file = request.files.get('photo')
        if photo_file and photo_file.filename:
            ext = photo_file.filename.rsplit('.', 1)[-1].lower() if '.' in photo_file.filename else ''
            safe_name = f"hall_{uuid.uuid4().hex[:8]}.{ext}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
            photo_file.save(save_path)
            hall['image'] = f'/static/uploads/{safe_name}'
    else:
        d = get_request_json()
        hall.update({k: v for k, v in d.items() if k in ('name', 'capacity', 'type', 'locked', 'image')})
        
    save_data(data)
    return jsonify(hall)

@app.route('/api/halls/<hid>', methods=['DELETE'])
@roles_required('admin')
def delete_hall(hid: str) -> Response:
    data = load_data()
    data['halls'] = [h for h in data['halls'] if h['id'] != hid]
    save_data(data)
    return jsonify({"ok": True})

# ─── INVENTORY ────────────────────────────────────────────────────────────────

@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory() -> Response:
    data = load_data()
    items: List[JsonDict] = list(data['inventory'])
    dept: Optional[str] = request.args.get('dept')
    if dept:
        items = [i for i in items if i['dept'] == dept]
    result: List[JsonDict] = []
    for item in items:
        row: JsonDict = dict(item)
        row['available_qty'] = int(row['stock_qty']) - int(row['in_use'])
        result.append(row)
    return jsonify(result)

@app.route('/api/inventory', methods=['POST'])
@roles_required('admin', 'it', 'reception', 'pixesclub', 'fineartsclub')
def create_inventory() -> RouteResp:
    d: JsonDict = get_request_json()
    data = load_data()
    item: JsonDict = {
        "id":        "i" + str(uuid.uuid4()).split('-')[0],
        "name":      d['name'],
        "dept":      d['dept'],
        "stock_qty": int(d['stock_qty']),
        "in_use":    0
    }
    data['inventory'].append(item)
    save_data(data)
    return jsonify(item), 201

@app.route('/api/inventory/<iid>', methods=['PUT'])
@roles_required('admin', 'it', 'reception', 'pixesclub', 'fineartsclub')
def update_inventory(iid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    data = load_data()
    item: Optional[JsonDict] = next((i for i in data['inventory'] if i['id'] == iid), None)
    if not item:
        return jsonify({"error": "Not found"}), 404
    if 'stock_qty' in d:
        item['stock_qty'] = int(d['stock_qty'])
    if 'name' in d:
        item['name'] = d['name']
    if 'locked' in d:
        item['locked'] = bool(d['locked'])
    save_data(data)
    return jsonify(item)

@app.route('/api/inventory/<iid>', methods=['DELETE'])
@roles_required('admin', 'it', 'reception', 'pixesclub', 'fineartsclub')
def delete_inventory(iid: str) -> Response:
    data = load_data()
    role = str(session.get('role', '')).lower().strip()
    
    # Check if item exists and if user is authorized to delete it
    item = next((i for i in data['inventory'] if i['id'] == iid), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404
        
    # Admin can delete anything; Others only their own department's items
    if role != 'admin' and item.get('dept', '').lower().strip() != role:
        return jsonify({"error": "Action forbidden: You can only delete items belonging to your department"}), 403
        
    data['inventory'] = [i for i in data['inventory'] if i['id'] != iid]
    save_data(data)
    return jsonify({"ok": True})

# ─── EVENTS ───────────────────────────────────────────────────────────────────

def compute_event_status(event: JsonDict) -> str:
    """Determine current status based on approvals."""
    ri: List[JsonDict]  = list(event.get('requested_items', []))
    it_items:      List[JsonDict] = [i for i in ri if i['dept'] == 'it']
    rec_items:     List[JsonDict] = [i for i in ri if i['dept'] == 'reception']
    pixes_items:   List[JsonDict] = [i for i in ri if i['dept'] == 'pixesclub']
    fa_items:      List[JsonDict] = [i for i in ri if i['dept'] == 'fineartsclub']
    it_done:    bool = all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in it_items)  if it_items  else True
    rec_done:   bool = all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in rec_items) if rec_items else True
    pixes_done: bool = all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in pixes_items) if pixes_items else True
    fa_done:    bool = all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in fa_items) if fa_items else True
    if event.get('cancel_reason'):
        return 'cancelled'
    if event.get('principal_decision') == 'approved':
        return 'approved'
    if event.get('principal_decision') == 'rejected':
        return 'rejected'
    if it_done and rec_done and pixes_done and fa_done:
        return 'principal_review'
    return 'dept_review'

@app.route('/api/events', methods=['GET'])
@login_required
def get_events() -> Response:
    data = load_data()
    events: List[JsonDict] = list(data['events'])
    role: str = str(session['role'])
    uid:  str = str(session['user_id'])
    def is_dept_done(event, target_dept):
        ri = event.get('requested_items', [])
        items = [i for i in ri if i['dept'] == target_dept]
        if not items:
            return True
        return all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in items)

    if role == 'booker':
        events = [e for e in events if e['created_by'] == uid]
    elif role == 'it':
        events = [e for e in events if any(i['dept'] == 'it' for i in e.get('requested_items', []))]
    elif role == 'reception':
        events = [e for e in events if any(i['dept'] == 'reception' for i in e.get('requested_items', [])) and is_dept_done(e, 'it')]
    elif role == 'pixesclub':
        events = [e for e in events if any(i['dept'] == 'pixesclub' for i in e.get('requested_items', [])) and is_dept_done(e, 'it') and is_dept_done(e, 'reception')]
    elif role == 'fineartsclub':
        events = [e for e in events if any(i['dept'] == 'fineartsclub' for i in e.get('requested_items', [])) and is_dept_done(e, 'it') and is_dept_done(e, 'reception') and is_dept_done(e, 'pixesclub')]
    # principal & admin see all
    result: List[JsonDict] = []
    for e in events:
        ev: JsonDict = dict(e)
        ev['status'] = compute_event_status(e)
        result.append(ev)
    return jsonify(result)

@app.route('/api/events', methods=['POST'])
@roles_required('booker')
def create_event() -> RouteResp:
    data = load_data()
    if data['settings']['portal_locked']:
        return jsonify({"error": "Portal is locked"}), 403
    # Support both JSON (legacy) and multipart/form-data (new, with agenda)
    if request.content_type and 'multipart/form-data' in request.content_type:
        import json as _json
        d: JsonDict = {k: v for k, v in request.form.items()}
        # Parse JSON-encoded fields sent as form strings
        for field in ('items', 'departments'):
            if field in d and isinstance(d[field], str):
                try:
                    d[field] = _json.loads(d[field])
                except Exception:
                    d[field] = []
        for field in ('has_intro_video', 'has_dance', 'has_photos', 'has_video'):
            d[field] = d.get(field, 'false').lower() == 'true'

        # Handle agenda file
        agenda_file = request.files.get('agenda')
        agenda_path = None
        if agenda_file and agenda_file.filename:
            ext = agenda_file.filename.rsplit('.', 1)[-1].lower() if '.' in agenda_file.filename else ''
            if ext in ALLOWED_EXTENSIONS:
                safe_name = f"{uuid.uuid4().hex}_{uuid.uuid4().hex[:8]}.{ext}"
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
                agenda_file.save(save_path)
                agenda_path = f'/static/uploads/{safe_name}'
            else:
                return jsonify({"error": "Invalid file type. Allowed: pdf, doc, docx, ppt, pptx, txt"}), 400
        else:
            return jsonify({"error": "Agenda file is required"}), 400
    else:
        d = get_request_json()
        agenda_path = d.get('agenda_path', None)
    
    hall_ids = [h.strip() for h in str(d.get('hall_id', '')).split(',') if h.strip()]
    if not hall_ids:
        return jsonify({"error": "No halls selected"}), 400

    available_halls = check_available_halls(data, d['date'], d['time_slot'], int(d.get('days', 1)))
    available_ids = [h['id'] for h in available_halls]
    
    # Proceed even if some halls are potentially booked; Principal/Admin will review.
    # if not all(hid in available_ids for hid in hall_ids):
    #     return jsonify({"error": "One or more selected venues are no longer available for this time slot"}), 400
        
    hall_names = [h['name'] for h in data['halls'] if h['id'] in hall_ids]
    
    # Handle Custom Classroom
    custom_class = d.get('custom_classroom')
    if custom_class:
        hall_names.append(f"Custom Class ({custom_class})")
        
    hall_name_str = ', '.join(hall_names)
    ri: List[JsonDict] = []
    for item_req in d.get('items', []):
        inv: Optional[JsonDict] = next(
            (i for i in data['inventory'] if i['id'] == item_req['item_id']), None
        )
        if inv:
            ri.append({
                "item_id":       inv['id'],
                "item_name":     inv['name'],
                "dept":          inv['dept'],
                "requested_qty": int(item_req['qty']),
                "allocated_qty": 0,
                "dept_approved": False,
                "returned":      False
            })
    event: JsonDict = {
        "id":                 "e" + str(uuid.uuid4()).split('-')[0],
        "title":              d['title'],
        "event_type":         d.get('event_type', 'General'),
        "date":               d['date'],
        "days":               int(d.get('days', 1)),
        "time_slot":          d['time_slot'],
        "hall_id":            d['hall_id'],
        "hall_name":          hall_name_str,
        "description":        d.get('description', ''),
        "budget_id":          d.get('budget_id', ''),
        "coordinator":        d.get('coordinator', ''),
        "coordinator_phone":  d.get('coordinator_phone', ''),
        "resource_person":    d.get('resource_person', ''),
        "expected_count":     int(d.get('expected_count', 0)),
        "departments":        d.get('departments', []),  # list of {school, department}
        "has_intro_video":    bool(d.get('has_intro_video', False)),
        "has_dance":          bool(d.get('has_dance', False)),
        "has_photos":         bool(d.get('has_photos', False)),
        "has_video":          bool(d.get('has_video', False)),
        "special_requirements": d.get('special_requirements', ''),
        "agenda_path":        agenda_path,
        "requested_items":    ri,
        "created_by":         str(session['user_id']),
        "created_by_name":    str(session['name']),
        "created_at":         datetime.now().isoformat(),
        "principal_decision": None,
        "principal_note":     ""
    }
    data['events'].append(event)
    save_data(data)
    event['status'] = compute_event_status(event)
    
    # Trigger Email Notification
    # mail_ok, mail_msg = send_event_notification(event)
    mail_ok, mail_msg = True, "Email notification disabled by request."
    
    resp = {
        **event,
        "email_status": mail_ok,
        "email_message": mail_msg
    }
    
    return jsonify(resp), 201

@app.route('/api/events/<eid>', methods=['GET'])
@login_required
def get_event(eid: str) -> RouteResp:
    data = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404
    ev: JsonDict = dict(event)
    ev['status'] = compute_event_status(event)
    return jsonify(ev)

@app.route('/api/events/<eid>', methods=['DELETE'])
@roles_required('admin')
def delete_event(eid: str) -> RouteResp:
    """Admin only: Hard delete an event."""
    data = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Event not found"}), 404
    
    # Free up explicitly allocated inventory if not returned
    for ri in event.get('requested_items', []):
        inv: Optional[JsonDict] = next(
            (i for i in data['inventory'] if i['id'] == ri['item_id']), None
        )
        if inv and ri.get('dept_approved') and not ri.get('returned'):
            rem = int(ri.get('allocated_qty', 0)) - int(ri.get('returned_qty', 0))
            if rem > 0 and 'in_use' in inv:
                inv['in_use'] = max(0, int(inv['in_use']) - rem)

    data['events'] = [e for e in data['events'] if e['id'] != eid]
    save_data(data)
    return jsonify({"ok": True, "status": "deleted"})

@app.route('/api/events/<eid>', methods=['PUT'])
@roles_required('booker', 'admin')
def edit_event(eid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    data = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Event not found"}), 404
        
    role: str = str(session.get('role', ''))
    uid: str = str(session.get('user_id', ''))
    if role != 'admin' and str(event.get('created_by')) != uid:
        return jsonify({"error": "Unauthorized to edit this event"}), 403
        
    status = compute_event_status(event)
    if status not in ['dept_review', 'principal_review'] and role != 'admin':
        return jsonify({"error": "Cannot edit event in current status"}), 400

    if 'title' in d: event['title'] = d['title']
    if 'date' in d: event['date'] = d['date']
    if 'time_slot' in d: event['time_slot'] = d['time_slot']
    if 'hall_id' in d: 
        event['hall_id'] = d['hall_id']
        hall_ids = [h.strip() for h in str(d['hall_id']).split(',') if h.strip()]
        hall_names = [h['name'] for h in data['halls'] if h['id'] in hall_ids]
        event['hall_name'] = ', '.join(hall_names)
    if 'budget_id' in d: event['budget_id'] = str(d['budget_id']).strip()
    if 'description' in d: event['description'] = d['description']
    if 'coordinator' in d: event['coordinator'] = d['coordinator']
    if 'expected_count' in d: event['expected_count'] = int(d['expected_count'] or 0)
    if 'departments' in d: event['departments'] = d['departments']
    if 'hall_ids' in d:
        # support multi-hall: store comma-separated IDs and compute name list
        ids = [x.strip() for x in str(d['hall_ids']).split(',') if x.strip()]
        event['hall_id'] = ','.join(ids)
        hall_names = [h['name'] for h in data['halls'] if h['id'] in ids]
        event['hall_name'] = ', '.join(hall_names)
    
    save_data(data)
    event['status'] = compute_event_status(event)
    return jsonify(event)

@app.route('/api/events/<eid>/cancel', methods=['POST'])
@login_required
def cancel_event(eid: str) -> RouteResp:
    """Cancel an event with a reason."""
    d: JsonDict = get_request_json()
    reason: str = d.get('reason', 'No reason provided')
    data = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Event not found"}), 404
        
    role: str = str(session.get('role', ''))
    uid: str = str(session.get('user_id', ''))
    if role not in ['admin', 'principal'] and str(event.get('created_by')) != uid:
        return jsonify({"error": "Unauthorized to cancel this event"}), 403

    # Mark as cancelled and store reason
    event['cancel_reason'] = reason
    event['cancelled_by'] = session.get('name')
    event['cancelled_at'] = datetime.now().isoformat()

    # Free up explicitly allocated inventory
    for ri in event.get('requested_items', []):
        inv: Optional[JsonDict] = next(
            (i for i in data['inventory'] if i['id'] == ri['item_id']), None
        )
        if inv and ri.get('dept_approved'):
            alloc_qty = int(ri.get('allocated_qty', 0))
            if alloc_qty > 0 and 'in_use' in inv:
                inv['in_use'] = max(0, int(inv['in_use']) - alloc_qty)

    save_data(data)
    return jsonify({"ok": True, "status": "cancelled", "reason": reason})

@app.route('/api/events/<eid>/dept-review', methods=['POST'])
@roles_required('it', 'reception', 'pixesclub', 'fineartsclub')
def dept_review(eid: str) -> RouteResp:
    """IT or Reception allocate quantities to event items."""
    d:    JsonDict = get_request_json()
    role: str      = str(session['role'])
    data           = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404

    is_reject = bool(d.get('reject', False))
    requested_items = event.get('requested_items')
    if not isinstance(requested_items, list):
        requested_items = []

    for item_update_raw in d.get('items', []):
        item_update: dict = cast(dict, item_update_raw)
        for ri_raw in requested_items:
            ri: dict = cast(dict, ri_raw)
            if ri.get('item_id') == item_update.get('item_id') and ri.get('dept') == role:
                if is_reject:
                    ri['allocated_qty'] = 0
                    ri['dept_approved'] = True
                    ri['dept_rejected'] = True
                else:
                    alloc: int = int(item_update.get('allocated_qty', 0))
                    inv: Optional[JsonDict] = next(
                        (i for i in cast(list, data.get('inventory', [])) if i.get('id') == ri.get('item_id')), None
                    )
                    if inv:
                        available: int = int(inv.get('stock_qty', 0)) - int(inv.get('in_use', 0))
                        if alloc > available:
                            return jsonify({"error": f"Not enough stock for {ri.get('item_name')}"}), 400
                        inv['in_use'] = int(inv.get('in_use', 0)) + alloc
                    ri['allocated_qty'] = alloc
                    ri['dept_approved'] = True
                    ri['dept_rejected'] = False

    save_data(data)

    # Determine if this submission was an approve or reject
    decision = 'rejected' if is_reject else 'approved'
    
    if is_reject:
        # NEW LOGIC: IT/Reception rejections DO NOT send cancellation emails.
        # Instead, we create a "Push Notification" for User, Admin, and Principal.
        notif = {
            "id": str(uuid.uuid4())[:8],
            "event_id": eid,
            "event_title": event.get('title'),
            "message": f"Booking requires attention: {role.upper()} team has declined the request.",
            "type": "rejection_alert",
            "created_at": datetime.now().isoformat(),
            "recipients": ["admin", "principal", event.get('created_by')],
            "read_by": []
        }
        if 'notifications' not in data: data['notifications'] = []
        data['notifications'].append(notif)
        save_data(data)
    else:
        # Standard approval path
        send_dept_decision_notification(event, role, 'approved')
        send_stage_update_notification(event, role)

    # Send notification to Principal if ALL departments finished
    new_status = compute_event_status(event)
    if new_status == 'principal_review' and event.get('status') != 'principal_review':
        send_allocation_complete_notification(event)

    event['status'] = new_status
    save_data(data)
    return jsonify(event)

@app.route('/api/events/<eid>/principal-review', methods=['POST'])
@roles_required('principal', 'admin')
def principal_review(eid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    data = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404
    if compute_event_status(event) != 'principal_review':
        return jsonify({"error": "Not ready for principal review"}), 400
    event['principal_decision'] = d['decision']
    event['principal_note']     = d.get('note', '')
    if d['decision'] == 'rejected':
        for ri in event['requested_items']:
            inv: Optional[JsonDict] = next(
                (i for i in data['inventory'] if i['id'] == ri['item_id']), None
            )
            if inv and ri.get('dept_approved'):
                inv['in_use'] = max(0, int(inv['in_use']) - int(ri['allocated_qty']))
    save_data(data)
    event['status'] = compute_event_status(event)

    if d['decision'] == 'approved':
        send_approval_notification(event)
    elif d['decision'] == 'rejected':
        event['status'] = 'cancelled'
        save_data(data)
        send_rejection_notification(event)

    return jsonify(event)

@app.route('/api/events/<eid>/return', methods=['POST'])
@roles_required('it', 'reception', 'pixesclub', 'fineartsclub')
def return_items(eid: str) -> RouteResp:
    """Handle both Bulk Return All and Partial/Custom Returns."""
    role: str = str(session['role'])
    d: JsonDict = get_request_json()
    returns_list = d.get('returns')  # List of {item_id, qty}
    
    data = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404

    requested_items = event.get('requested_items')
    if not isinstance(requested_items, list):
        return jsonify({"ok": True})

    inventory = cast(list, data.get('inventory', []))
    
    # CASE 1: Partial/Custom Return Processing
    if isinstance(returns_list, list):
        for r in returns_list:
            item_id = r.get('item_id')
            qty_returning = int(r.get('qty', 0))
            if qty_returning <= 0: continue
            
            # Find item in event
            ri = next((i for i in requested_items if i.get('item_id') == item_id and i.get('dept') == role), None)
            if not ri: continue
            
            # Calculate actual return logic
            allocated = int(ri.get('allocated_qty', 0))
            already_returned = int(ri.get('returned_qty', 0))
            rem_to_return = allocated - already_returned
            
            actual_qty = min(qty_returning, rem_to_return)
            if actual_qty <= 0: continue
            
            # Update event record
            ri['returned_qty'] = already_returned + actual_qty
            if ri['returned_qty'] >= allocated:
                ri['returned'] = True
            
            # Update central inventory
            inv = next((i for i in inventory if i.get('id') == item_id), None)
            if inv:
                inv['in_use'] = max(0, int(inv.get('in_use', 0)) - actual_qty)

    # CASE 2: Bulk Return All (One-click)
    else:
        for ri in requested_items:
            if ri.get('dept') == role and ri.get('dept_approved') and not ri.get('returned'):
                allocated = int(ri.get('allocated_qty', 0))
                already_returned = int(ri.get('returned_qty', 0))
                remaining = allocated - already_returned
                
                if remaining > 0:
                    inv = next((i for i in inventory if i.get('id') == ri.get('item_id')), None)
                    if inv:
                        inv['in_use'] = max(0, int(inv.get('in_use', 0)) - remaining)
                    ri['returned_qty'] = allocated
                    ri['returned'] = True

    save_data(data)
    return jsonify({"ok": True})


# ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications() -> Response:
    data = load_data()
    role = session['role']
    uid = session['user_id']
    
    notifs = data.get('notifications', [])
    # Rejections are visible to the Booker, Admins, and Principals
    relevant = [n for n in notifs if role == 'admin' or role == 'principal' or n.get('recipients', []) == [uid] or uid in n.get('recipients', [])]
    return jsonify(relevant)

@app.route('/api/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read() -> Response:
    d = get_request_json()
    notif_id = d.get('id')
    uid = session['user_id']
    data = load_data()
    
    for n in data.get('notifications', []):
        if n['id'] == notif_id:
            if uid not in n['read_by']:
                n['read_by'].append(uid)
            break
    
    save_data(data)
    return jsonify({"success": True})

# ─── STATS ────────────────────────────────────────────────────────────────────

@app.route('/api/stats')
@login_required
def stats() -> Response:
    data = load_data()
    events: List[JsonDict] = list(data['events'])
    return jsonify({
        "total_events":    len(events),
        "approved":        len([e for e in events if e.get('principal_decision') == 'approved']),
        "pending":         len([e for e in events if not e.get('principal_decision')]),
        "rejected":        len([e for e in events if e.get('principal_decision') == 'rejected']),
        "total_users":     len(data['users']),
        "total_halls":     len(data['halls']),
        "inventory_items": len(data['inventory']),
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)