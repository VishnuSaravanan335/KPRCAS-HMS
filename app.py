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

# ─── DB COLUMN CHECK ────────────────────────────────────────────────────────
try:
    import db as _db
    # Check if column exists
    res = _db.fetch_one("SHOW COLUMNS FROM events LIKE 'agenda_path'")
    if not res:
        print("Adding missing agenda_path column...")
        _db.execute_query("ALTER TABLE events ADD COLUMN agenda_path VARCHAR(255)")
except Exception as _e:
    print(f"DB Update Warning: {_e}")

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
MAIL_PASSWORD = "xhywzskgflanurxt"
MAIL_DEFAULT_SENDER = "hmskprcas@gmail.com"

# --- IT SUPPORT EMAIL CONFIG ---
IT_MAIL_USERNAME = "itsupport@gmail.com"
IT_MAIL_PASSWORD = "qiot jeas ukhb vaf"

# --- RECEPTION EMAIL CONFIG ---
REC_MAIL_USERNAME = "receptionsupportkprcas@gmail.com"
REC_MAIL_PASSWORD = "wjwd knqj iwtt gaac"

def send_smtp_email(sender_email: str, sender_password: str, recipients: List[str], subject: str, html_content: str) -> Tuple[bool, str]:
    """Helper to send SMTP email from any account with automatic port fallback."""
    clean_pw = sender_password.replace(" ", "")
    if not clean_pw:
        return False, "SMTP password not configured."
    
    # Filter and deduplicate recipients
    clean_recipients = list(set([r.strip() for r in recipients if r and "@" in r]))
    if not clean_recipients:
        # Final safety fallback to ensure something is sent
        clean_recipients = ["23bcomca131@kprcas.ac.in", sender_email]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = ", ".join(clean_recipients)
    msg.attach(MIMEText(html_content, "html"))

    # Try Port 587 (STARTTLS) first
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(sender_email, clean_pw)
            server.send_message(msg)
        return True, "Sent via 587"
    except Exception as e587:
        print(f"SMTP 587 failed: {e587}")
        # Fallback to Port 465 (SSL)
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
                server.login(sender_email, clean_pw)
                server.send_message(msg)
            return True, "Sent via 465"
        except Exception as e465:
            error_msg = f"Critical SMTP failure: Port 587 ({e587}), Port 465 ({e465})"
            print(error_msg)
            return False, error_msg

# --- ADMIN EMAILS ---

def get_admin_emails() -> List[str]:
    """Helper to fetch all admin email addresses from data.json."""
    try:
        data = load_data()
        emails = [u.get('email') for u in data.get('users', []) if u.get('role') == 'admin' and u.get('email')]
        return [str(e) for e in emails if e]
    except Exception:
        return []

def send_notification_with_fallback(recipients: List[str], subject: str, html: str) -> Tuple[bool, str]:
    """Tries to send via Primary, then IT, then Reception SMTP accounts."""
    # Try sending via Primary account first
    success, msg = send_smtp_email(MAIL_USERNAME, MAIL_PASSWORD, recipients, subject, html)
    
    if not success:
        print(f"Primary SMTP failed, trying IT Support fallback... ({msg})")
        success, msg = send_smtp_email(IT_MAIL_USERNAME, IT_MAIL_PASSWORD, recipients, subject + " (via IT)", html)
        
    if not success:
        print(f"IT SMTP failed, trying Reception fallback... ({msg})")
        success, msg = send_smtp_email(REC_MAIL_USERNAME, REC_MAIL_PASSWORD, recipients, subject + " (via Rec)", html)
        
    return success, msg

def send_event_notification(event_data):
    """Sends KPRCAS HMS official templates (1, 2, 3) on submission."""
    import db as _db
    data = load_data()
    admins = [u['email'] for u in data.get('users', []) if u['role'] == 'admin' and u.get('email')]
    principal_email = next((u['email'] for u in data.get('users', []) if u['role'] == 'principal' and u.get('email')), None)
    it_email = IT_MAIL_USERNAME
    rec_email = REC_MAIL_USERNAME
    
    # Get Booker Email
    booker_email = None
    try:
        db_user = _db.fetch_one("SELECT email, name FROM users WHERE id = %s", (event_data.get('created_by'),))
        if db_user and db_user.get('email'):
            booker_email = db_user['email']
            booker_name = db_user.get('name', 'User')
    except: pass
    if not booker_email:
        booker = next((u for u in data.get('users', []) if u['id'] == event_data.get('created_by')), None)
        booker_email = booker.get('email') if booker else None
        booker_name = booker.get('name') if booker else 'User'

    # 1) Template 1: To User (Booker)
    if booker_email:
        spec = "None"
        if event_data.get('has_photos') and event_data.get('has_dance'): spec = "Fine Arts / Pixels"
        elif event_data.get('has_photos'): spec = "Pixels"
        elif event_data.get('has_dance'): spec = "Fine Arts"

        dept_label = "—"
        if event_data.get('departments'):
            dept_label = event_data['departments'][0].get('school') or event_data['departments'][0].get('department') or "—"

        t1_html = f"""
        Dear {booker_name},<br><br>
        Your hall booking request has been successfully submitted and is currently under review.<br><br>
        <b>Booking Details:</b><br>
        <ul>
          <li>Event Name: {event_data['title']}</li>
          <li>Hall Name: {event_data.get('hall_name','—')}</li>
          <li>Date: {event_data.get('date','—')}</li>
          <li>Time: {event_data.get('time_slot','—')}</li>
          <li>Department / Club: {dept_label}</li>
          <li>Special Requirements: {spec}</li>
        </ul><br>
        Your request has been forwarded to the concerned teams for approval.<br><br>
        For further details, please check out the HMS (Hall Management System).<br><br>
        Regards,<br>Hall Management System
        """
        send_notification_with_fallback([booker_email], f"Booking Request Received: {event_data['title']}", t1_html)

    # 2) Template 2: To IT / Reception / Admin / Principal
    t2_recipients = admins + [it_email, rec_email]
    if principal_email: t2_recipients.append(principal_email)
    t2_recipients = list(set([r for r in t2_recipients if r and "@" in r]))

    t2_html = f"""
    Dear Team,<br><br>
    A new hall booking request has been submitted and requires your review.<br><br>
    <b>Booking Details:</b><br>
    <ul>
      <li>Booker Name: {booker_name}</li>
      <li>Event Name: {event_data['title']}</li>
      <li>Hall Name: {event_data.get('hall_name','—')}</li>
      <li>Date: {event_data.get('date','—')}</li>
      <li>Time: {event_data.get('time_slot','—')}</li>
      <li>Number of Participants: {event_data.get('expected_count', 0)}</li>
      <li>Special Requirements: {'Yes' if (event_data.get('has_photos') or event_data.get('has_dance')) else 'No'}</li>
    </ul><br>
    Please review and update the status in HMS.<br><br>
    Regards,<br>Hall Management System
    """
    send_notification_with_fallback(t2_recipients, f"🔔 New Booking Alert: {event_data['title']}", t2_html)

    # 3) Template 3: Special Requirement (Pixels / Fine Arts)
    if event_data.get('has_photos'):
        pc_email = next((u['email'] for u in data.get('users', []) if u['role'] == 'pixesclub' and u.get('email')), None)
        if pc_email:
            t3p_html = f"""
            Dear Team,<br><br>
            A hall booking request has been submitted with your service requirement.<br><br>
            <b>Booking Details:</b><br>
            <ul>
              <li>Event Name: {event_data['title']}</li>
              <li>Hall Name: {event_data.get('hall_name','—')}</li>
              <li>Date: {event_data.get('date','—')}</li>
              <li>Time: {event_data.get('time_slot','—')}</li>
              <li>Requirement: Pixels</li>
            </ul><br>
            Please review the request and provide your approval / rejection in HMS.<br><br>
            Regards,<br>Hall Management System
            """
            send_notification_with_fallback([pc_email], f"📸 Pixels Requirement: {event_data['title']}", t3p_html)
            
    if event_data.get('has_dance'):
        fa_email = next((u['email'] for u in data.get('users', []) if u['role'] == 'fineartsclub' and u.get('email')), None)
        if fa_email:
            t3f_html = f"""
            Dear Team,<br><br>
            A hall booking request has been submitted with your service requirement.<br><br>
            <b>Booking Details:</b><br>
            <ul>
              <li>Event Name: {event_data['title']}</li>
              <li>Hall Name: {event_data.get('hall_name','—')}</li>
              <li>Date: {event_data.get('date','—')}</li>
              <li>Time: {event_data.get('time_slot','—')}</li>
              <li>Requirement: Fine Arts</li>
            </ul><br>
            Please review the request and provide your approval / rejection in HMS.<br><br>
            Regards,<br>Hall Management System
            """
            send_notification_with_fallback([fa_email], f"💃 Fine Arts Requirement: {event_data['title']}", t3f_html)

def send_approval_notification(event_data):
    """Template 4: Booking Approved (to User + All Teams)."""
    data = load_data()
    all_emails = [u['email'] for u in data.get('users', []) if u.get('email')]
    
    # Booker name
    booker_name = event_data.get('created_by_name', 'User')

    html = f"""
    Dear {booker_name},<br><br>
    We are pleased to inform you that your hall booking request has been approved.<br><br>
    <b>Booking Details:</b><br>
    <ul>
      <li>Event Name: {event_data['title']}</li>
      <li>Hall Name: {event_data.get('hall_name','—')}</li>
      <li>Date: {event_data.get('date','—')}</li>
      <li>Time: {event_data.get('time_slot','—')}</li>
    </ul><br>
    <b>Status: Approved</b><br><br>
    For further details, please check out the HMS (Hall Management System).<br><br>
    Regards,<br>Hall Management System
    """
    return send_notification_with_fallback(list(set(all_emails)), f"✅ Booking Approved: {event_data['title']}", html)

def send_rejection_notification(event_data):
    """Template 5: Booking Cancelled (only if Admin / Principal rejects)."""
    import db as _db
    booker_email = None
    try:
        db_user = _db.fetch_one("SELECT email, name FROM users WHERE id = %s", (event_data.get('created_by'),))
        booker_email = db_user['email']
        booker_name = db_user.get('name', 'User')
    except: pass
    
    if not booker_email: return False

    html = f"""
    Dear {booker_name},<br><br>
    We regret to inform you that your hall booking request has been cancelled due to rejection by the approving authority.<br><br>
    <b>Booking Details:</b><br>
    <ul>
      <li>Event Name: {event_data['title']}</li>
      <li>Hall Name: {event_data.get('hall_name','—')}</li>
      <li>Date: {event_data.get('date','—')}</li>
      <li>Time: {event_data.get('time_slot','—')}</li>
    </ul><br>
    <b>Status: Cancelled</b><br><br>
    For further details, please check out the HMS (Hall Management System).<br><br>
    Regards,<br>Hall Management System
    """
    return send_notification_with_fallback([booker_email], f"❌ Booking Cancelled: {event_data['title']}", html)

def create_notification(user_id: str, title: str, message: str) -> bool:
    """Persistent database-level notification."""
    try:
        _db.execute_query("INSERT INTO notifications (user_id, title, message) VALUES (%s, %s, %s)", 
                         (user_id, title, message))
        return True
    except Exception as e:
        print(f"Notification Error: {e}")
        return False

def send_dept_decision_notification(event_data, role, decision):
    """Template 6: Push Notification for IT/Reception/Club rejections."""
    dept_map = {'it': 'IT Support', 'reception': 'Reception', 'pixesclub': 'Pixels', 'fineartsclub': 'Fine Arts'}
    dept_label = dept_map.get(role, role.upper())

    if decision == 'rejected':
        msg = f"Hall booking update: The request has been declined by {dept_label} and is pending further review by Admin / Principal. Please check HMS for details."
        # Send push notification to Admins and Principal
        data = load_data()
        admin_ids = [u['id'] for u in data.get('users', []) if u['role'] in ['admin', 'principal']]
        for uid in admin_ids:
            create_notification(uid, "Dept Decline Alert", msg)
        return True, "Push notification sent"

    # For approvals, we still send the legacy email to booker as it was before
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
          <p style="margin:0;font-size:0.85rem;color:#6b7280">KPRCAS Book My HALL Notification</p>
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
            <h2 style="color: #4f46e5; margin-bottom: 20px;">KPRCAS Book My HALL - Allocation Finalized</h2>
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
    dept_name = "IT Support" if role == 'it' else ("Reception" if role == 'reception' else ("Pixes Club" if role == 'pixesclub' else "Dance Performance"))

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
                <p style="margin-top: 15px; font-size: 0.9rem; color: #64748b;">This notification is sent via the KPRCAS Book My HALL system bridge.</p>
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
                <h2 style="color: #4f46e5;">KPRCAS Book My HALL - Final Booking Brief</h2>
                <p>IT and Reception have approved the requirements. Here are the final details for <strong>{event_data['title']}</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: #fff; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Venue:</td><td style="padding: 8px;">{event_data.get('hall_name')}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Date:</td><td style="padding: 8px;">{event_data.get('date')}</td></tr>
                </table>
                <p style="margin-top: 20px; font-size: 0.85rem; color: #64748b; text-align: center;">Automated Stage Completion - KPRCAS Book My HALL</p>
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
            {"id": "u7", "name": "Dance Performance Lead",    "username": "fineartsclub", "password": hash_pw("finearts123"),     "role": "fineartsclub", "email": ""},
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
            # ── Dance Performance (Dance / Events) ──────────────────────────────
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
            import db
            user = db.fetch_one("SELECT role FROM users WHERE id = %s", (session['user_id'],))
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
    import db
    user = db.fetch_one("SELECT * FROM users WHERE username = %s AND password = %s", (username, hashed_password))
    
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    
    session['user_id'] = user['id']
    session['role'] = user['role']
    session['name'] = user['name']
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
    import db
    user = db.fetch_one("SELECT * FROM users WHERE id = %s", (session['user_id'],))
    if not user:
        session.pop('user_id', None)
        return jsonify({"error": "User not found"}), 401
    
    settings_rows = db.fetch_all("SELECT setting_key, setting_value FROM settings")
    settings = {}
    for r in settings_rows:
        try:
            settings[r['setting_key']] = json.loads(r['setting_value']) if isinstance(r['setting_value'], str) else r['setting_value']
        except:
            settings[r['setting_key']] = r['setting_value']
    
    return jsonify({
        "user":     {k: v for k, v in user.items() if k != 'password'},
        "settings": settings
    })

# ─── SETTINGS ─────────────────────────────────────────────────────────────────

@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings() -> Response:
    import db
    settings_rows = db.fetch_all("SELECT setting_key, setting_value FROM settings")
    settings = {}
    for r in settings_rows:
        try:
            settings[r['setting_key']] = json.loads(r['setting_value']) if isinstance(r['setting_value'], str) else r['setting_value']
        except:
            settings[r['setting_key']] = r['setting_value']
    return jsonify(settings)

@app.route('/api/settings/portal-lock', methods=['POST'])
@roles_required('admin')
def toggle_portal_lock() -> Response:
    import db
    row = db.fetch_one("SELECT setting_value FROM settings WHERE setting_key = 'portal_locked'")
    if row:
        val = json.loads(row['setting_value']) if isinstance(row['setting_value'], str) else row['setting_value']
        new_val = not val
        db.execute_query("UPDATE settings SET setting_value = %s WHERE setting_key = 'portal_locked'", (json.dumps(new_val),))
    else:
        new_val = True
        db.execute_query("INSERT INTO settings (setting_key, setting_value) VALUES ('portal_locked', %s)", (json.dumps(new_val),))
    return jsonify({"portal_locked": new_val})

# ─── HIERARCHY ────────────────────────────────────────────────────────────────

@app.route('/api/hierarchy', methods=['GET'])
@login_required
def get_hierarchy() -> Response:
    import db
    row = db.fetch_one("SELECT setting_value FROM settings WHERE setting_key = 'hierarchy'")
    if row:
        return jsonify(json.loads(row['setting_value']) if isinstance(row['setting_value'], str) else row['setting_value'])
    return jsonify({})

@app.route('/api/hierarchy', methods=['PUT'])
@roles_required('admin')
def update_hierarchy() -> Response:
    d: JsonDict = get_request_json()
    import db
    db.execute_query("UPDATE settings SET setting_value = %s WHERE setting_key = 'hierarchy'", (json.dumps(d),))
    return jsonify(d)

# ─── USERS ────────────────────────────────────────────────────────────────────

@app.route('/api/users', methods=['GET'])
@roles_required('admin')
def get_users() -> Response:
    import db
    users = db.fetch_all("SELECT * FROM users")
    return jsonify([{k: v for k, v in u.items() if k != 'password'} for u in users])

@app.route('/api/users', methods=['POST'])
@roles_required('admin')
def create_user() -> RouteResp:
    d: JsonDict = get_request_json()
    import db
    if db.fetch_one("SELECT id FROM users WHERE username = %s", (d.get('username'),)):
        return jsonify({"error": "Username already exists"}), 400
    new_user = {
        "id":       "u" + str(uuid.uuid4()).split('-')[0],
        "name":     d['name'],
        "username": d['username'],
        "password": hash_pw(str(d['password'])),
        "role":     d['role'],
        "email":    d.get('email', '')
    }
    db.execute_query("INSERT INTO users (id, name, username, password, role, email) VALUES (%s, %s, %s, %s, %s, %s)", 
                     (new_user['id'], new_user['name'], new_user['username'], new_user['password'], new_user['role'], new_user['email']))
    return jsonify({k: v for k, v in new_user.items() if k != 'password'}), 201

@app.route('/api/users/<uid>', methods=['PUT'])
@roles_required('admin')
def update_user(uid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    import db
    user = db.fetch_one("SELECT * FROM users WHERE id = %s", (uid,))
    if not user:
        return jsonify({"error": "Not found"}), 404
    name = d.get('name', user['name'])
    role = d.get('role', user['role'])
    email = d.get('email', user.get('email', ''))
    username = d.get('username', user['username'])
    
    # Check if username is already taken by another user
    if username != user['username']:
        existing = db.fetch_one("SELECT id FROM users WHERE username = %s AND id != %s", (username, uid))
        if existing:
            return jsonify({"error": "Username already exists"}), 400

    if d.get('password'):
        password = hash_pw(str(d['password']))
        db.execute_query("UPDATE users SET name=%s, role=%s, email=%s, username=%s, password=%s WHERE id=%s", (name, role, email, username, password, uid))
    else:
        db.execute_query("UPDATE users SET name=%s, role=%s, email=%s, username=%s WHERE id=%s", (name, role, email, username, uid))
        
    user = db.fetch_one("SELECT * FROM users WHERE id = %s", (uid,))
    return jsonify({k: v for k, v in user.items() if k != 'password'})

@app.route('/api/users/<uid>', methods=['DELETE'])
@roles_required('admin')
def delete_user(uid: str) -> RouteResp:
    import db
    db.execute_query("DELETE FROM users WHERE id = %s", (uid,))
    return jsonify({"ok": True})

# ─── HALLS ────────────────────────────────────────────────────────────────────

@app.route('/api/halls', methods=['GET'])
@login_required
def get_halls() -> Response:
    import db
    halls = db.fetch_all("SELECT * FROM halls")
    return jsonify(halls)

@app.route('/api/halls', methods=['POST'])
@roles_required('admin')
def create_hall() -> RouteResp:
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

    hall_id = "h" + str(uuid.uuid4()).split('-')[0]
    import db
    db.execute_query("""
        INSERT INTO halls (id, name, capacity, type, building, floor, locked, image)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (hall_id, name, int(capacity), hall_type, "", "", False, photo_path or (request.get_json(silent=True) or {}).get('image', '')))
    
    hall = db.fetch_one("SELECT * FROM halls WHERE id = %s", (hall_id,))
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

    import db
    events = db.fetch_all("SELECT * FROM events")
    halls = db.fetch_all("SELECT * FROM halls")
    data = {'events': events, 'halls': halls}
    avail = check_available_halls(data, event_date, slot, days, cap)
    return jsonify(avail)

@app.route('/api/halls/<hid>', methods=['PUT'])
@roles_required('admin')
def update_hall(hid: str) -> RouteResp:
    import db
    hall = db.fetch_one("SELECT * FROM halls WHERE id = %s", (hid,))
    if not hall:
        return jsonify({"error": "Not found"}), 404

    name = hall['name']
    capacity = hall['capacity']
    h_type = hall['type']
    locked = bool(hall['locked'])
    image = hall['image']

    if request.content_type and 'multipart/form-data' in request.content_type:
        name = request.form.get('name', name)
        if request.form.get('capacity'):
            capacity = int(request.form.get('capacity'))
        h_type = request.form.get('type', h_type)
        if request.form.get('locked'):
            locked = request.form.get('locked').lower() == 'true'
        
        photo_file = request.files.get('photo')
        if photo_file and photo_file.filename:
            ext = photo_file.filename.rsplit('.', 1)[-1].lower() if '.' in photo_file.filename else ''
            safe_name = f"hall_{uuid.uuid4().hex[:8]}.{ext}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
            photo_file.save(save_path)
            image = f'/static/uploads/{safe_name}'
    else:
        d = get_request_json()
        if 'name' in d: name = d['name']
        if 'capacity' in d: capacity = int(d['capacity'])
        if 'type' in d: h_type = d['type']
        if 'locked' in d:
            # Handle both boolean and various truthy/falsy values
            val = d['locked']
            if isinstance(val, str):
                locked = val.lower() in ['true', '1', 'yes']
            else:
                locked = bool(val)
        if 'image' in d: image = d['image']
        
    db.execute_query("""
        UPDATE halls 
        SET name=%s, capacity=%s, type=%s, locked=%s, image=%s 
        WHERE id=%s
    """, (name, capacity, h_type, 1 if locked else 0, image, hid))
    
    return jsonify({
        "id": hid,
        "name": name,
        "capacity": capacity,
        "type": h_type,
        "locked": locked,
        "image": image
    })

@app.route('/api/halls/<hid>', methods=['DELETE'])
@roles_required('admin')
def delete_hall(hid: str) -> Response:
    import db
    db.execute_query("DELETE FROM halls WHERE id = %s", (hid,))
    return jsonify({"ok": True})

# ─── INVENTORY ────────────────────────────────────────────────────────────────

@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory() -> Response:
    import db
    items = db.fetch_all("SELECT * FROM inventory")
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
    item: JsonDict = {
        "id":        "i" + str(uuid.uuid4()).split('-')[0],
        "name":      d['name'],
        "dept":      d['dept'],
        "stock_qty": int(d['stock_qty']),
        "in_use":    0,
        "locked":    False
    }
    import db
    db.execute_query("""
        INSERT INTO inventory (id, name, dept, stock_qty, in_use, locked)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (item['id'], item['name'], item['dept'], item['stock_qty'], item['in_use'], item['locked']))
    return jsonify(item), 201

@app.route('/api/inventory/<iid>', methods=['PUT'])
@roles_required('admin', 'it', 'reception', 'pixesclub', 'fineartsclub')
def update_inventory(iid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    import db
    item = db.fetch_one("SELECT * FROM inventory WHERE id = %s", (iid,))
    if not item:
        return jsonify({"error": "Not found"}), 404
    stock_qty = int(d['stock_qty']) if 'stock_qty' in d else item['stock_qty']
    name = d['name'] if 'name' in d else item['name']
    locked = bool(d['locked']) if 'locked' in d else item['locked']
    db.execute_query("UPDATE inventory SET stock_qty=%s, name=%s, locked=%s WHERE id=%s", (stock_qty, name, locked, iid))
    item = db.fetch_one("SELECT * FROM inventory WHERE id = %s", (iid,))
    return jsonify(item)

@app.route('/api/inventory/<iid>', methods=['DELETE'])
@roles_required('admin', 'it', 'reception', 'pixesclub', 'fineartsclub')
def delete_inventory(iid: str) -> Response:
    role = str(session.get('role', '')).lower().strip()
    import db
    item = db.fetch_one("SELECT * FROM inventory WHERE id = %s", (iid,))
    if not item:
        return jsonify({"error": "Item not found"}), 404
    if role != 'admin' and item.get('dept', '').lower().strip() != role:
        return jsonify({"error": "Action forbidden: You can only delete items belonging to your department"}), 403
    db.execute_query("DELETE FROM inventory WHERE id = %s", (iid,))
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

def get_full_event(eid):
    import db
    event = db.fetch_one("SELECT * FROM events WHERE id = %s", (eid,))
    if not event: return None
    event['departments'] = db.fetch_all("SELECT school, department FROM event_departments WHERE event_id = %s", (eid,))
    event['requested_items'] = db.fetch_all("SELECT * FROM event_requested_items WHERE event_id = %s", (eid,))
    # Convert bit/bool values from DB if needed
    for item in event['requested_items']:
        item['dept_approved'] = bool(item['dept_approved'])
        item['returned'] = bool(item['returned'])
        item['dept_rejected'] = bool(item['dept_rejected'])
    for key in ['has_intro_video', 'has_dance', 'has_photos', 'has_video']:
        event[key] = bool(event.get(key))
    event['status'] = compute_event_status(event)
    return event

def get_all_events_full():
    import db
    events = db.fetch_all("SELECT * FROM events")
    for e in events:
        eid = e['id']
        e['departments'] = db.fetch_all("SELECT school, department FROM event_departments WHERE event_id = %s", (eid,))
        e['requested_items'] = db.fetch_all("SELECT * FROM event_requested_items WHERE event_id = %s", (eid,))
        for item in e['requested_items']:
            item['dept_approved'] = bool(item['dept_approved'])
            item['returned'] = bool(item['returned'])
            item['dept_rejected'] = bool(item['dept_rejected'])
        for key in ['has_intro_video', 'has_dance', 'has_photos', 'has_video']:
            e[key] = bool(e.get(key))
        e['status'] = compute_event_status(e)
    return events

@app.route('/api/events', methods=['GET'])
@login_required
def get_events() -> Response:
    events = get_all_events_full()
    role: str = str(session['role'])
    uid:  str = str(session['user_id'])
    
    def is_dept_done(event, target_dept):
        items = [i for i in event.get('requested_items', []) if i['dept'] == target_dept]
        if not items: return True
        return all(i['dept_approved'] or i['dept_rejected'] for i in items)

    if role == 'booker':
        events = [e for e in events if e['created_by'] == uid]
    elif role == 'it':
        events = [e for e in events if any(i['dept'] == 'it' for i in e.get('requested_items', []))]
    elif role == 'reception':
        events = [e for e in events if any(i['dept'] == 'reception' for i in e.get('requested_items', [])) and is_dept_done(e, 'it')]
    elif role == 'pixesclub':
        # Show events where photography was requested (flag-based, not just items)
        events = [e for e in events if e.get('has_photos') and
                  (e['status'] in ('dept_review', 'principal_review', 'approved') or e.get('principal_decision') == 'approved')]
    elif role == 'fineartsclub':
        # Show events where dance was requested (flag-based, not just items)
        events = [e for e in events if e.get('has_dance') and
                  (e['status'] in ('dept_review', 'principal_review', 'approved') or e.get('principal_decision') == 'approved')]
    
    return jsonify(events)

@app.route('/api/events', methods=['POST'])
@roles_required('booker')
def create_event() -> RouteResp:
    import db
    settings_row = db.fetch_one("SELECT setting_value FROM settings WHERE setting_key = 'portal_locked'")
    if settings_row and (json.loads(settings_row['setting_value']) if isinstance(settings_row['setting_value'], str) else settings_row['setting_value']):
        return jsonify({"error": "Portal is locked"}), 403

    if request.content_type and 'multipart/form-data' in request.content_type:
        import json as _json
        d: JsonDict = {k: v for k, v in request.form.items()}
        for field in ('items', 'departments'):
            if field in d and isinstance(d[field], str):
                try: d[field] = _json.loads(d[field])
                except: d[field] = []
        for field in ('has_intro_video', 'has_dance', 'has_photos', 'has_video'):
            d[field] = d.get(field, 'false').lower() == 'true'
        agenda_file = request.files.get('agenda')
        agenda_path = None
        if agenda_file and agenda_file.filename:
            ext = agenda_file.filename.rsplit('.', 1)[-1].lower() if '.' in agenda_file.filename else ''
            if ext in ALLOWED_EXTENSIONS:
                safe_name = f"{uuid.uuid4().hex}_{uuid.uuid4().hex[:8]}.{ext}"
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_name)
                agenda_file.save(save_path)
                agenda_path = f'/static/uploads/{safe_name}'
            else: return jsonify({"error": "Invalid file type"}), 400
        else: return jsonify({"error": "Agenda file is required"}), 400
    else:
        d = get_request_json()
        agenda_path = d.get('agenda_path', None)
    
    # ── Double Booking Prevention Check ───────────────────────────────
    hall_ids_str = str(d.get('hall_id', ''))
    hall_ids = [h.strip() for h in hall_ids_str.split(',') if h.strip()]
    if not hall_ids: return jsonify({"error": "No halls selected"}), 400

    # Fetch halls and events to check availability
    halls_data = db.fetch_all("SELECT * FROM halls")
    events_data = db.fetch_all("SELECT * FROM events")
    mock_data = {"halls": halls_data, "events": events_data}
    
    available_halls = check_available_halls(mock_data, d['date'], d['time_slot'], int(d.get('days', 1)))
    available_hall_ids = [h['id'] for h in available_halls]
    
    # Check if all selected halls are actually available
    for h_id in hall_ids:
        if h_id not in available_hall_ids:
            return jsonify({"error": f"Conflict: Hall {h_id} is already booked for this date/time."}), 409

    hall_names = [h['name'] for h in halls_data if h['id'] in hall_ids]
    custom_class = d.get('custom_classroom')
    if custom_class: hall_names.append(f"Custom Class ({custom_class})")
    hall_name_str = ', '.join(hall_names)

    event_id = "e" + str(uuid.uuid4()).split('-')[0]
    # Ensure session name exists
    creator_name = session.get('name', 'Institutional User')
    
    db.execute_query("""
        INSERT INTO events (id, title, event_type, date, days, time_slot, hall_id, hall_name, description, agenda_path, 
        budget_id, coordinator, coordinator_phone, expected_count, has_intro_video, has_dance, has_photos, has_video, 
        created_by, created_by_name, created_at) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (event_id, d['title'], d.get('event_type', 'General'), d['date'], int(d.get('days', 1)), d['time_slot'], 
          hall_ids_str, hall_name_str, d.get('description', ''), agenda_path, d.get('budget_id', ''), d.get('coordinator', ''), 
          d.get('coordinator_phone', ''), int(d.get('expected_count', 0)), d.get('has_intro_video', False), 
          d.get('has_dance', False), d.get('has_photos', False), d.get('has_video', False), 
          str(session['user_id']), str(creator_name), datetime.now().isoformat()))

    for dep in d.get('departments', []):
        db.execute_query("INSERT INTO event_departments (event_id, school, department) VALUES (%s, %s, %s)", 
                         (event_id, dep.get('school', ''), dep.get('department', '')))

    for item_req in d.get('items', []):
        inv = db.fetch_one("SELECT * FROM inventory WHERE id = %s", (item_req['item_id'],))
        if inv:
            db.execute_query("""
                INSERT INTO event_requested_items (event_id, item_id, item_name, dept, requested_qty, allocated_qty) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (event_id, inv['id'], inv['name'], inv['dept'], int(item_req['qty']), 0))

    event = get_full_event(event_id)
    try:
        send_event_notification(event)
    except Exception as e:
        print(f"Email error: {e}")
    return jsonify(event), 201

@app.route('/api/events/<eid>', methods=['GET'])
@login_required
def get_event(eid: str) -> RouteResp:
    event = get_full_event(eid)
    if not event:
        return jsonify({"error": "Not found"}), 404
    return jsonify(event)

@app.route('/api/events/<eid>', methods=['DELETE'])
@roles_required('admin')
def delete_event(eid: str) -> RouteResp:
    import db
    event = get_full_event(eid)
    if not event: return jsonify({"error": "Event not found"}), 404
    
    # Free inventory
    for ri in event.get('requested_items', []):
        if ri.get('dept_approved') and not ri.get('returned'):
            rem = int(ri.get('allocated_qty', 0)) - int(ri.get('returned_qty', 0))
            if rem > 0:
                db.execute_query("UPDATE inventory SET in_use = GREATEST(0, in_use - %s) WHERE id = %s", (rem, ri['item_id']))

    db.execute_query("DELETE FROM events WHERE id = %s", (eid,))
    return jsonify({"ok": True, "status": "deleted"})

@app.route('/api/events/<eid>', methods=['PUT'])
@roles_required('booker', 'admin')
def edit_event(eid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    import db
    event = get_full_event(eid)
    if not event: return jsonify({"error": "Event not found"}), 404
    
    role = str(session.get('role', ''))
    uid = str(session.get('user_id', ''))
    if role != 'admin' and str(event.get('created_by')) != uid:
        return jsonify({"error": "Unauthorized"}), 403

    # Field mapping for update
    fields = ['title', 'date', 'time_slot', 'budget_id', 'description', 'coordinator', 'expected_count']
    updates = []
    params = []
    for f in fields:
        if f in d:
            updates.append(f"{f} = %s")
            params.append(d[f])
    
    if 'hall_id' in d:
        hall_ids = [h.strip() for h in str(d['hall_id']).split(',') if h.strip()]
        halls = db.fetch_all("SELECT name FROM halls WHERE id IN (%s)" % (",".join(["%s"]*len(hall_ids))), tuple(hall_ids))
        hall_name_str = ', '.join([h['name'] for h in halls])
        updates.append("hall_id = %s")
        params.append(d['hall_id'])
        updates.append("hall_name = %s")
        params.append(hall_name_str)

    if updates:
        params.append(eid)
        db.execute_query(f"UPDATE events SET {', '.join(updates)} WHERE id = %s", tuple(params))
    
    return jsonify(get_full_event(eid))

@app.route('/api/events/<eid>/cancel', methods=['POST'])
@login_required
def cancel_event(eid: str) -> RouteResp:
    d: JsonDict = get_request_json()
    reason = d.get('reason', 'No reason provided')
    import db
    event = get_full_event(eid)
    if not event: return jsonify({"error": "Not found"}), 404
    
    role = str(session.get('role', ''))
    uid = str(session.get('user_id', ''))
    if role not in ['admin', 'principal'] and str(event.get('created_by')) != uid:
        return jsonify({"error": "Unauthorized"}), 403

    db.execute_query("""
        UPDATE events SET cancel_reason = %s, cancelled_by = %s, cancelled_at = %s WHERE id = %s
    """, (reason, session.get('name'), datetime.now().isoformat(), eid))

    # Free inventory
    for ri in event.get('requested_items', []):
        if ri.get('dept_approved'):
            db.execute_query("UPDATE inventory SET in_use = GREATEST(0, in_use - %s) WHERE id = %s", 
                             (int(ri.get('allocated_qty', 0)), ri['item_id']))

    db.execute_query("UPDATE events SET cancel_reason=%s, cancelled_by=%s, cancelled_at=%s WHERE id=%s", (reason, session['name'], datetime.now().isoformat(), eid))
    
    event = get_full_event(eid)
    try:
        send_rejection_notification(event)
    except Exception as e:
        print(f"Rejection mail error: {e}")

    return jsonify({"ok": True, "status": "cancelled"})

@app.route('/api/events/<eid>/dept-review', methods=['POST'])
@roles_required('it', 'reception', 'pixesclub', 'fineartsclub')
def dept_review(eid: str) -> RouteResp:
    d = get_request_json()
    role = str(session['role'])
    import db
    event = get_full_event(eid)
    if not event: return jsonify({"error": "Not found"}), 404

    is_reject = bool(d.get('reject', False))
    club_confirm = bool(d.get('club_confirm', False))
    items = d.get('items', [])

    if not items and club_confirm and not is_reject:
        # Club confirmed participation with no inventory items
        existing = db.fetch_one("SELECT id FROM event_requested_items WHERE event_id=%s AND dept=%s", (eid, role))
        if not existing:
            db.execute_query(
                "INSERT INTO event_requested_items (event_id, item_id, item_name, dept, requested_qty, allocated_qty, dept_approved, dept_rejected) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (eid, f'confirm_{role}_{eid}', 'Club Confirmation', role, 0, 0, 1, 0)
            )
        else:
            db.execute_query("UPDATE event_requested_items SET dept_approved=1, dept_rejected=0 WHERE event_id=%s AND dept=%s", (eid, role))
    elif not items and is_reject and club_confirm:
        # Club declined participation
        existing = db.fetch_one("SELECT id FROM event_requested_items WHERE event_id=%s AND dept=%s", (eid, role))
        if not existing:
            db.execute_query(
                "INSERT INTO event_requested_items (event_id, item_id, item_name, dept, requested_qty, allocated_qty, dept_approved, dept_rejected) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (eid, f'confirm_{role}_{eid}', 'Club Declined', role, 0, 0, 1, 1)
            )
        else:
            db.execute_query("UPDATE event_requested_items SET dept_approved=1, dept_rejected=1 WHERE event_id=%s AND dept=%s", (eid, role))
    else:
        for item_update in items:
            item_id = item_update.get('item_id')
            alloc = int(item_update.get('allocated_qty', 0))
            ri = next((i for i in event['requested_items'] if i['item_id'] == item_id and i['dept'] == role), None)
            if not ri: continue
            if is_reject:
                db.execute_query("UPDATE event_requested_items SET allocated_qty=0, dept_approved=True, dept_rejected=True WHERE event_id=%s AND item_id=%s", (eid, item_id))
            else:
                inv = db.fetch_one("SELECT stock_qty, in_use FROM inventory WHERE id = %s", (item_id,))
                if inv:
                    available = inv['stock_qty'] - inv['in_use']
                    if alloc > available:
                        return jsonify({"error": f"Not enough stock for {ri['item_name']}"}), 400
                    db.execute_query("UPDATE inventory SET in_use = in_use + %s WHERE id = %s", (alloc, item_id))
                db.execute_query("UPDATE event_requested_items SET allocated_qty=%s, dept_approved=True, dept_rejected=False WHERE event_id=%s AND item_id=%s", (alloc, eid, item_id))

    # Standardized Notification Bridge (Template 6 + Email)
    try:
        updated_event = get_full_event(eid)
        send_dept_decision_notification(updated_event, role, 'rejected' if is_reject else 'approved')
    except Exception as e:
        print(f"Dept notification error: {e}")

    return jsonify(get_full_event(eid))


@app.route('/api/events/<eid>/principal-review', methods=['POST'])
@roles_required('principal', 'admin')
def principal_review(eid: str) -> RouteResp:
    d = get_request_json()
    import db
    event = get_full_event(eid)
    if not event: return jsonify({"error": "Not found"}), 404
    
    decision = d['decision']
    note = d.get('note', '')
    db.execute_query("UPDATE events SET principal_decision=%s, principal_note=%s WHERE id=%s", (decision, note, eid))
    
    event = get_full_event(eid)
    try:
        if decision == 'approved':
            send_approval_notification(event)
        else:
            send_rejection_notification(event)
    except Exception as e:
        print(f"Principal review mail error: {e}")
    
    if decision == 'rejected':
        for ri in event['requested_items']:
            if ri['dept_approved']:
                db.execute_query("UPDATE inventory SET in_use = GREATEST(0, in_use - %s) WHERE id = %s", 
                                 (int(ri['allocated_qty']), ri['item_id']))
    
    return jsonify(get_full_event(eid))

@app.route('/api/events/<eid>/return', methods=['POST'])
@roles_required('it', 'reception', 'pixesclub', 'fineartsclub')
def return_items(eid: str) -> RouteResp:
    role = str(session['role'])
    d = get_request_json()
    import db
    event = get_full_event(eid)
    if not event: return jsonify({"error": "Not found"}), 404

    returns_list = d.get('returns')
    if isinstance(returns_list, list):
        for r in returns_list:
            item_id = r.get('item_id')
            qty = int(r.get('qty', 0))
            ri = next((i for i in event['requested_items'] if i['item_id'] == item_id and i['dept'] == role), None)
            if ri and qty > 0:
                actual = min(qty, ri['allocated_qty'] - ri['returned_qty'])
                db.execute_query("UPDATE event_requested_items SET returned_qty = returned_qty + %s, returned = (returned_qty >= allocated_qty) WHERE event_id=%s AND item_id=%s", (actual, eid, item_id))
                db.execute_query("UPDATE inventory SET in_use = GREATEST(0, in_use - %s) WHERE id = %s", (actual, item_id))
    else:
        # Bulk return
        for ri in event['requested_items']:
            if ri['dept'] == role and ri['dept_approved'] and not ri['returned']:
                rem = ri['allocated_qty'] - ri['returned_qty']
                db.execute_query("UPDATE event_requested_items SET returned_qty = allocated_qty, returned = True WHERE event_id=%s AND item_id=%s", (eid, ri['item_id']))
                db.execute_query("UPDATE inventory SET in_use = GREATEST(0, in_use - %s) WHERE id = %s", (rem, ri['item_id']))

    return jsonify({"ok": True})


# ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications() -> Response:
    import db
    role = session['role']
    # Fetch notifications for specific user or their role
    notifs = db.fetch_all("SELECT * FROM notifications WHERE user_id = %s OR user_id = %s ORDER BY created_at DESC LIMIT 50", (session['user_id'], role))
    return jsonify(notifs)

@app.route('/api/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read() -> Response:
    import db
    db.execute_query("UPDATE notifications SET is_read = True WHERE user_id = %s OR user_id = %s", (session['user_id'], session['role']))
    return jsonify({"success": True})

# ─── STATS ────────────────────────────────────────────────────────────────────

@app.route('/api/stats')
@login_required
def stats() -> Response:
    import db
    events = db.fetch_all("SELECT principal_decision FROM events")
    users_count = db.fetch_one("SELECT COUNT(*) as c FROM users")['c']
    halls_count = db.fetch_one("SELECT COUNT(*) as c FROM halls")['c']
    inv_count = db.fetch_one("SELECT COUNT(*) as c FROM inventory")['c']
    
    return jsonify({
        "total_events":    len(events),
        "approved":        len([e for e in events if e.get('principal_decision') == 'approved']),
        "pending":         len([e for e in events if not e.get('principal_decision')]),
        "rejected":        len([e for e in events if e.get('principal_decision') == 'rejected']),
        "total_users":     users_count,
        "total_halls":     halls_count,
        "inventory_items": inv_count,
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)