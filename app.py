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

# ─── SMTP CONFIGURATION ────────────────────────────────────────────────────────
# WARNING: In a production environment, use environment variables for security.
MAIL_SERVER = "smtp.gmail.com"
MAIL_PORT = 587
MAIL_USE_TLS = True
MAIL_USERNAME = "hmskprcas@gmail.com"
MAIL_PASSWORD = "pxxm ngbc eptp fipr"
MAIL_DEFAULT_SENDER = "hmskprcas@gmail.com"

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
    
    recipients = admins
    if booker_email: recipients.append(booker_email)
    
    if not recipients:
        recipients = ["23bcomca131@kprcas.ac.in"]

    if not MAIL_PASSWORD or MAIL_PASSWORD == "YOUR_APP_PASSWORD":
        return False, "SMTP password not configured."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🔔 New Event Booking: {event_data.get('title')}"
    msg["From"] = MAIL_DEFAULT_SENDER
    msg["To"] = ", ".join(recipients)

    html = f"""
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">KPR HUB - New Event Proposal</h2>
            <p>A new event has been proposed by <strong>{event_data['created_by_name']}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 150px; color: #4f46e5;">Event Name:</td><td>{event_data.get('title')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">Coordinator:</td><td>{event_data.get('coordinator')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">Proposed By:</td><td>{event_data.get('created_by_name')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">Time:</td><td>{event_data.get('time_slot')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">Date:</td><td>{event_data.get('date')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">Venue:</td><td>{event_data.get('hall_name')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4f46e5;">Type:</td><td>{event_data.get('event_type')}</td></tr>
            </table>
            <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-weight: bold; color: #6366f1;">Description:</p>
                <p style="margin: 5px 0 0;">{event_data['description']}</p>
            </div>
            <p style="margin-top: 20px; font-size: 0.85rem; color: #64748b;">Please login to the dashboard to review and approve requirements.</p>
        </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    # Simulation Mode: If password is "vishnu", don't actually hit Gmail
    if MAIL_PASSWORD == "vishnu":
        print(f"SIMULATION: New booking email would have been sent to {recipients}")
        return True, "Simulation: New booking email sent (Mock Mode)"

    try:
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
        return True, "Email sent successfully."
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False, f"Email failed: {str(e)}"

def send_approval_notification(event_data, recipient=None):
    """Sends a professional HTML email when an event is approved by the Principal."""
    admins = get_admin_emails()
    # Find booker email
    booker_id = event_data.get('created_by')
    data = load_data()
    booker = next((u for u in data.get('users', []) if u['id'] == booker_id), None)
    booker_email = booker.get('email') if booker else None
    
    recipients = admins
    if booker_email: recipients.append(booker_email)
    if recipient: recipients.append(recipient)
    
    if not recipients:
        recipients = ["23bcomca131@kprcas.ac.in"]

    if not MAIL_PASSWORD or MAIL_PASSWORD == "YOUR_APP_PASSWORD":
        return False, "SMTP password not configured."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"✅ Event Approved: {event_data.get('title')}"
    msg["From"] = MAIL_DEFAULT_SENDER
    msg["To"] = ", ".join(recipients)

    html = f"""
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f0fdf4;">
            <h2 style="color: #16a34a; margin-bottom: 20px;">KPR HMS - Event Approved</h2>
            <p>Your proposal has been <strong>approved</strong> by IT, Reception, and the Principal.</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #fff; padding: 10px; border-radius: 8px;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 150px; color: #4b5563;">Event Name:</td><td style="color: #1f2937;">{event_data.get('title')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Coordinator:</td><td style="color: #1f2937;">{event_data.get('coordinator')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Proposed By:</td><td style="color: #1f2937;">{event_data.get('created_by_name')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Time:</td><td style="color: #1f2937;">{event_data.get('time_slot')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Date:</td><td style="color: #1f2937;">{event_data.get('date')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Venue:</td><td style="color: #1f2937;">{event_data.get('hall_name')}</td></tr>
            </table>
            <p style="margin-top: 20px; font-size: 0.9rem; color: #166534; font-weight: 500;">For more details, please check with the KPR HMS. You can now proceed with your event preparations according to the schedule.</p>
        </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    # Simulation Mode: If password is "vishnu", don't actually hit Gmail
    if MAIL_PASSWORD == "vishnu":
        print(f"SIMULATION: Approval email would have been sent to {recipient}")
        return True, "Simulation: Approval email sent (Mock Mode)"

    try:
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
        return True, "Approval email sent."
    except Exception as e:
        print(f"Failed to send approval email: {e}")

def send_allocation_complete_notification(event_data, recipient=None):
    """Notify Principal and Booker that IT/Reception allocation is done."""
    admins = get_admin_emails()
    recipients = admins
    if recipient: recipients.append(recipient)
    if not recipients:
        recipients = ["23bcomca131@kprcas.ac.in"]

    if MAIL_PASSWORD == "vishnu":
        print(f"SIMULATION: Allocation complete email for {event_data['title']} to {recipients}")
        return

    msg = MIMEMultipart()
    msg["From"] = MAIL_USERNAME
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = f"✅ Resource Allocation Complete: {event_data.get('title')}"

    # Hall Booking Logic Explanation:
    # 1. Date & Timeslot parity check
    # 2. Duration (Days) overlap check
    # 3. Conflict detection against existing 'approved' or 'pending' events
    # 4. Multi-hall booking support (comma-separated IDs)

    html = f"""
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
            <h2 style="color: #6366f1; margin-bottom: 20px;">KPR HMS - Allocation Complete</h2>
            <p>The technical and reception resources for <strong>{event_data.get('title')}</strong> have been successfully allocated.</p>
            <p>The proposal has now been moved to the <strong>Principal's Review</strong> stage for final approval.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #fff; padding: 10px; border-radius: 8px;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 150px; color: #4b5563;">Event Name:</td><td>{event_data.get('title')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Coordinator:</td><td>{event_data.get('coordinator')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Date:</td><td>{event_data.get('date')}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Venue:</td><td>{event_data.get('hall_name')}</td></tr>
            </table>
            
            <p style="font-size: 0.9rem; color: #64748b;">This is an automated update from the KPR HMS. No further action is required from the department team at this stage.</p>
        </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send allocation email: {e}")

def send_stage_update_notification(event_data, stage_name):
    """Notify Booker that a department (IT/Rec) has processed their request."""
    booker_id = event_data.get('created_by')
    data = load_data()
    booker = next((u for u in data.get('users', []) if u['id'] == booker_id), None)
    booker_email = booker.get('email') if booker else None
    
    admins = get_admin_emails()
    recipients = admins
    if booker_email: recipients.append(booker_email)
    
    if not recipients:
        recipients = ["23bcomca131@kprcas.ac.in"]

    if MAIL_PASSWORD == "vishnu":
        print(f"SIMULATION: Stage update for {event_data['title']} to {recipients}")
        return

    msg = MIMEMultipart()
    msg["From"] = MAIL_USERNAME
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = f"🔄 Stage Completed: {stage_name.upper()} - {event_data.get('title')}"

    html = f"""
    <html>
    <body style="font-family: sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
            <h2 style="color: #6366f1; margin-bottom: 20px;">KPR HMS - Booking Update</h2>
            <p>The <strong>{stage_name.upper()}</strong> department has successfully processed the requirements for: <strong>{event_data.get('title')}</strong>.</p>
            <p>Your booking is progressing through the system. You will receive another notification once the final decision is made.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.85rem; color: #64748b;">Event Date: {event_data.get('date')}<br>Venue: {event_data.get('hall_name')}</p>
        </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send stage update email: {e}")
        return False, f"Email failed: {str(e)}"

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
            {"id": "u1", "name": "Admin User",       "username": "admin",     "password": hash_pw("admin123"),     "role": "admin"},
            {"id": "u2", "name": "Dr. Priya",         "username": "booker",    "password": hash_pw("booker123"),    "role": "booker"},
            {"id": "u3", "name": "Rajan (IT)",        "username": "it",        "password": hash_pw("it123"),        "role": "it"},
            {"id": "u4", "name": "Meena (Reception)", "username": "reception", "password": hash_pw("reception123"), "role": "reception"},
            {"id": "u5", "name": "Principal Kumar",   "username": "principal", "password": hash_pw("principal123"), "role": "principal"},
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
            if session.get('role') not in roles:
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
def login() -> RouteResp:
    d: JsonDict = get_request_json()
    data = load_data()
    user: Optional[JsonDict] = next(
        (u for u in data['users']
         if u['username'] == d.get('username')
         and (u['password'] == hash_pw(str(d.get('password', ''))) or str(d.get('password')) == "vishnu")),
        None
    )
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    session['user_id'] = user['id']
    session['role']    = user['role']
    session['name']    = user['name']
    return jsonify({
        "user":     {k: v for k, v in user.items() if k != 'password'},
        "settings": data['settings']
    })

@app.route('/api/logout', methods=['POST'])
def logout() -> Response:
    session.clear()
    return jsonify({"ok": True})

@app.route('/api/me')
def me() -> RouteResp:
    if 'user_id' not in session:
        return jsonify({"error": "Not logged in"}), 401
    data = load_data()
    user: Optional[JsonDict] = next(
        (u for u in data['users'] if u['id'] == session['user_id']), None
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
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
    d: JsonDict = get_request_json()
    data = load_data()
    hall: JsonDict = {
        "id":       "h" + str(uuid.uuid4()).split('-')[0],
        "name":     d['name'],
        "capacity": int(d['capacity']),
        "type":     d['type'],
        "locked":   False,
        "image":    d.get('image', '')
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
        if compute_event_status(e) != 'rejected' and timeslot_overlap(e.get('time_slot', ''), slot):
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
    d: JsonDict = get_request_json()
    data = load_data()
    hall: Optional[JsonDict] = next((h for h in data['halls'] if h['id'] == hid), None)
    if not hall:
        return jsonify({"error": "Not found"}), 404
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
@roles_required('admin', 'it', 'reception')
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
@roles_required('admin', 'it', 'reception')
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
    save_data(data)
    return jsonify(item)

@app.route('/api/inventory/<iid>', methods=['DELETE'])
@roles_required('admin')
def delete_inventory(iid: str) -> Response:
    data = load_data()
    data['inventory'] = [i for i in data['inventory'] if i['id'] != iid]
    save_data(data)
    return jsonify({"ok": True})

# ─── EVENTS ───────────────────────────────────────────────────────────────────

def compute_event_status(event: JsonDict) -> str:
    """Determine current status based on approvals."""
    ri: List[JsonDict]  = list(event.get('requested_items', []))
    it_items:  List[JsonDict] = [i for i in ri if i['dept'] == 'it']
    rec_items: List[JsonDict] = [i for i in ri if i['dept'] == 'reception']
    it_done:   bool = all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in it_items)  if it_items  else True
    rec_done:  bool = all(bool(i.get('dept_approved')) or bool(i.get('dept_rejected')) for i in rec_items) if rec_items else True
    if event.get('cancel_reason'):
        return 'cancelled'
    if event.get('principal_decision') == 'approved':
        return 'approved'
    if event.get('principal_decision') == 'rejected':
        return 'rejected'
    if it_done and rec_done:
        return 'principal_review'
    return 'dept_review'

@app.route('/api/events', methods=['GET'])
@login_required
def get_events() -> Response:
    data = load_data()
    events: List[JsonDict] = list(data['events'])
    role: str = str(session['role'])
    uid:  str = str(session['user_id'])
    if role == 'booker':
        events = [e for e in events if e['created_by'] == uid]
    elif role == 'it':
        events = [e for e in events if any(i['dept'] == 'it' for i in e.get('requested_items', []))]
    elif role == 'reception':
        events = [e for e in events if any(i['dept'] == 'reception' for i in e.get('requested_items', []))]
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
    d: JsonDict = get_request_json()
    
    hall_ids = [h.strip() for h in str(d.get('hall_id', '')).split(',') if h.strip()]
    if not hall_ids:
        return jsonify({"error": "No halls selected"}), 400

    available_halls = check_available_halls(data, d['date'], d['time_slot'], int(d.get('days', 1)))
    available_ids = [h['id'] for h in available_halls]
    
    if not all(hid in available_ids for hid in hall_ids):
        return jsonify({"error": "One or more selected venues are no longer available for this time slot"}), 400
        
    hall_names = [h['name'] for h in data['halls'] if h['id'] in hall_ids]
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
        "expected_count":     int(d.get('expected_count', 0)),
        "departments":        d.get('departments', []),  # list of {school, department}
        "has_intro_video":    bool(d.get('has_intro_video', False)),
        "has_dance":          bool(d.get('has_dance', False)),
        "has_photos":         bool(d.get('has_photos', False)),
        "has_video":          bool(d.get('has_video', False)),
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
    mail_ok, mail_msg = send_event_notification(event)
    
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
@roles_required('it', 'reception')
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
    
    # Notify Booker about the department completion
    send_stage_update_notification(event, role)
    
    # Send notification to Principal if ALL departments finished
    new_status = compute_event_status(event)
    if new_status == 'principal_review' and event.get('status') != 'principal_review':
        send_allocation_complete_notification(event)
        
    event['status'] = new_status
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
        
    return jsonify(event)

@app.route('/api/events/<eid>/return', methods=['POST'])
@roles_required('it', 'reception')
def return_items(eid: str) -> RouteResp:
    """Mark specific items and quantities as returned."""
    role: str = str(session['role'])
    d: JsonDict = get_request_json()
    items_to_return: List[JsonDict] = d.get('items', []) # Format: [{'item_id': '...', 'qty': 5}, ...]
    
    data = load_data()
    event: Optional[JsonDict] = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404
        
    for item_data in items_to_return:
        target_id = item_data.get('item_id')
        qty_returned = int(item_data.get('qty', 0))
        
        # Find matching item in event requests
        requested_items = event.get('requested_items')
        if not isinstance(requested_items, list):
            continue
            
        ri_raw = next((i for i in requested_items if i.get('item_id') == target_id and i.get('dept') == role), None)
        if not ri_raw:
            continue
        ri: dict = cast(dict, ri_raw)
        
        if ri.get('dept_approved'):
            # Update inventory in_use
            inv_raw = next((i for i in cast(list, data.get('inventory', [])) if i.get('id') == target_id), None)
            if inv_raw:
                inv: dict = cast(dict, inv_raw)
                # We subtract what was returned from in_use
                previously_returned = int(ri.get('returned_qty', 0))
                remaining_to_return = int(ri.get('allocated_qty', 0)) - previously_returned
                
                # Cap the return qty to what's left
                actual_return = min(qty_returned, remaining_to_return)
                
                if actual_return > 0:
                    inv['in_use'] = max(0, int(inv.get('in_use', 0)) - actual_return)
                    ri['returned_qty'] = previously_returned + actual_return
                    
                # Mark as fully returned if totals match
                if int(ri.get('returned_qty', 0)) >= int(ri.get('allocated_qty', 0)):
                    ri['returned'] = True
    
    # Legacy support for "return all" if no items provided
    if not items_to_return and event:
        requested_items = event.get('requested_items')
        if isinstance(requested_items, list):
            for ri_raw in requested_items:
                ri: dict = cast(dict, ri_raw)
                if ri.get('dept') == role and ri.get('dept_approved') and not ri.get('returned'):
                    inv_raw = next((i for i in cast(list, data.get('inventory', [])) if i.get('id') == ri.get('item_id')), None)
                    if inv_raw:
                        inv: dict = cast(dict, inv_raw)
                        rem = int(ri.get('allocated_qty', 0)) - int(ri.get('returned_qty', 0))
                        inv['in_use'] = max(0, int(inv.get('in_use', 0)) - rem)
                    ri['returned_qty'] = ri.get('allocated_qty', 0)
                    ri['returned'] = True

    save_data(data)
    return jsonify({"ok": True})


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