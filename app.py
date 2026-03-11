from flask import Flask, request, jsonify, session, send_from_directory, Response
import json, os, hashlib, uuid
from datetime import datetime, date
from functools import wraps
from typing import List, Dict, Any, Optional, Union, TypedDict, cast

class User(TypedDict):
    id: str
    name: str
    username: str
    password: str
    role: str

class Hall(TypedDict):
    id: str
    name: str
    capacity: int
    type: str
    locked: bool
    image: str

class InventoryItem(TypedDict):
    id: str
    name: str
    dept: str
    stock_qty: int
    in_use: int

class RequestedItem(TypedDict):
    item_id: str
    item_name: str
    dept: str
    requested_qty: int
    allocated_qty: int
    dept_approved: bool
    returned: bool

class Event(TypedDict, total=False):
    id: str
    title: str
    date: str
    time_slot: str
    hall_id: str
    hall_name: str
    description: str
    budget: float
    coordinator: str
    expected_count: int
    has_intro_video: bool
    has_dance: bool
    requested_items: List[RequestedItem]
    created_by: str
    created_by_name: str
    created_at: str
    principal_decision: Optional[str]
    principal_note: str
    status: str  # Transient field added during processing

class AppData(TypedDict):
    settings: Dict[str, Any]
    users: List[User]
    halls: List[Hall]
    inventory: List[InventoryItem]
    events: List[Event]

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'kprhub_secret_2024'

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin','*')
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

DATA_FILE = 'data.json'

# ─── DATA HELPERS ────────────────────────────────────────────────────────────

def load_data() -> AppData:
    if not os.path.exists(DATA_FILE):
        return cast(AppData, init_data())
    with open(DATA_FILE, 'r') as f:
        return cast(AppData, json.load(f))

def save_data(data: AppData) -> None:
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def init_data() -> AppData:
    data: AppData = {
        "settings": {"portal_locked": False},
        "users": [
            {"id": "u1", "name": "Admin User",      "username": "admin",     "password": hash_pw("admin123"),     "role": "admin"},
            {"id": "u2", "name": "Dr. Priya",        "username": "booker",    "password": hash_pw("booker123"),    "role": "booker"},
            {"id": "u3", "name": "Rajan (IT)",       "username": "it",        "password": hash_pw("it123"),        "role": "it"},
            {"id": "u4", "name": "Meena (Reception)","username": "reception", "password": hash_pw("reception123"), "role": "reception"},
            {"id": "u5", "name": "Principal Kumar",  "username": "principal", "password": hash_pw("principal123"), "role": "principal"},
        ],
        "halls": [
            # ── Classrooms ──────────────────────────────────────────────────
            {"id": "h_af101",  "name": "AF 101",            "capacity": 60,  "type": "Classroom",  "locked": False, "image": "https://blind-jade-follsdsq9o.edgeone.app/Gemini_Generated_Image_39822p39822p3982.png"},
            {"id": "h_bf101",  "name": "BF 101",            "capacity": 60,  "type": "Classroom",  "locked": False, "image": "https://blind-jade-follsdsq9o.edgeone.app/Gemini_Generated_Image_39822p39822p3982.png"},
            # ── Labs ────────────────────────────────────────────────────────
            {"id": "h_lab1",   "name": "Lab 1",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab2",   "name": "Lab 2",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab3",   "name": "Lab 3",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab4",   "name": "Lab 4",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab6",   "name": "Lab 6",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab7",   "name": "Lab 7",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab8",   "name": "Lab 8",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            {"id": "h_lab9",   "name": "Lab 9",             "capacity": 50,  "type": "Lab",        "locked": False, "image": "https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg"},
            # ── Seminar Halls ────────────────────────────────────────────────
            {"id": "h_sem1",   "name": "Seminar Hall 1",    "capacity": 150, "type": "Seminar",    "locked": False, "image": "https://image2url.com/r2/default/images/1773031202621-88ba1c54-5f16-4dbc-a880-b333ba18d35e.jpg"},
            {"id": "h_sem2",   "name": "Seminar Hall 2",    "capacity": 200, "type": "Seminar",    "locked": False, "image": "https://image2url.com/r2/default/images/1773031202621-88ba1c54-5f16-4dbc-a880-b333ba18d35e.jpg"},
            # ── Auditoriums ──────────────────────────────────────────────────
            {"id": "h_aud1",   "name": "Auditorium 1",      "capacity": 800, "type": "Auditorium", "locked": False, "image": "https://image2url.com/r2/default/images/1773031158304-90488c29-3ede-4e04-b854-785134193c29.jpg"},
            {"id": "h_aud2",   "name": "Auditorium 2",      "capacity": 800, "type": "Auditorium", "locked": False, "image": "https://image2url.com/r2/default/images/1773031158304-90488c29-3ede-4e04-b854-785134193c29.jpg"},
            # ── OAT ─────────────────────────────────────────────────────────
            {"id": "h_oat",    "name": "Open Air Theatre (OAT)", "capacity": 1000, "type": "Open Air", "locked": False, "image": "https://image2url.com/r2/default/images/1773031158304-90488c29-3ede-4e04-b854-785134193c29.jpg"},
        ],
        "inventory": [
            # ── IT Requirements ──────────────────────────────────────────────
            {"id": "it01",  "name": "Hand Mic",          "dept": "it", "stock_qty": 10, "in_use": 0},
            {"id": "it02",  "name": "Podium Mic",        "dept": "it", "stock_qty": 5,  "in_use": 0},
            {"id": "it03",  "name": "Speakers",          "dept": "it", "stock_qty": 8,  "in_use": 0},
            {"id": "it04",  "name": "Laptop",            "dept": "it", "stock_qty": 20, "in_use": 0},
            {"id": "it05",  "name": "Projector",         "dept": "it", "stock_qty": 10, "in_use": 0},
            {"id": "it06",  "name": "Presenter",         "dept": "it", "stock_qty": 8,  "in_use": 0},
            {"id": "it07",  "name": "Podium",            "dept": "it", "stock_qty": 4,  "in_use": 0},
            {"id": "it08",  "name": "Photo Camera",      "dept": "it", "stock_qty": 3,  "in_use": 0},
            {"id": "it09",  "name": "Video Camera",      "dept": "it", "stock_qty": 3,  "in_use": 0},
            {"id": "it10",  "name": "White Board",       "dept": "it", "stock_qty": 10, "in_use": 0},
            # ── Stationary / Reception Requirements ──────────────────────────
            {"id": "rc01",  "name": "Lamp",              "dept": "reception", "stock_qty": 20, "in_use": 0},
            {"id": "rc02",  "name": "Paneer Sprinkler",  "dept": "reception", "stock_qty": 15, "in_use": 0},
            {"id": "rc03",  "name": "Tray",              "dept": "reception", "stock_qty": 20, "in_use": 0},
            {"id": "rc04",  "name": "Silver Bowls",      "dept": "reception", "stock_qty": 30, "in_use": 0},
            {"id": "rc05",  "name": "Table Cloth",       "dept": "reception", "stock_qty": 25, "in_use": 0},
            {"id": "rc06",  "name": "Plug Card",         "dept": "reception", "stock_qty": 15, "in_use": 0},
            {"id": "rc07",  "name": "L-Folder",          "dept": "reception", "stock_qty": 50, "in_use": 0},
            {"id": "rc08",  "name": "Water Bottle",      "dept": "reception", "stock_qty": 200,"in_use": 0},
            {"id": "rc09",  "name": "Hall Chairs",       "dept": "reception", "stock_qty": 500,"in_use": 0},
            {"id": "rc10",  "name": "Stage Table",       "dept": "reception", "stock_qty": 10, "in_use": 0},
            {"id": "rc11",  "name": "Stage Chair",       "dept": "reception", "stock_qty": 30, "in_use": 0},
            {"id": "rc12",  "name": "Registration Table","dept": "reception", "stock_qty": 10, "in_use": 0},
            {"id": "rc13",  "name": "Registration Chair","dept": "reception", "stock_qty": 20, "in_use": 0},
            {"id": "rc14",  "name": "Reception Table",   "dept": "reception", "stock_qty": 8,  "in_use": 0},
            {"id": "rc15",  "name": "Refreshment Table", "dept": "reception", "stock_qty": 8,  "in_use": 0},
            {"id": "rc16",  "name": "T-Poy",             "dept": "reception", "stock_qty": 15, "in_use": 0},
        ],
        "events": []
    }
    save_data(data)
    return data

# ─── AUTH DECORATORS ─────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

def roles_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({"error": "Unauthorized"}), 401
            if session.get('role') not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# ─── PAGES ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

@app.route('/dashboard')
def dashboard():
    return send_from_directory('templates', 'dashboard.html')

# ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    d = request.json
    data = load_data()
    user = next((u for u in data['users']
                 if u['username'] == d.get('username')
                 and u['password'] == hash_pw(d.get('password', ''))), None)
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    session['user_id'] = user['id']
    session['role']    = user['role']
    session['name']    = user['name']
    return jsonify({"user": {k: v for k, v in user.items() if k != 'password'},
                    "settings": data['settings']})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"ok": True})

@app.route('/api/me')
def me():
    if 'user_id' not in session:
        return jsonify({"error": "Not logged in"}), 401
    data = load_data()
    user = next((u for u in data['users'] if u['id'] == session['user_id']), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": {k: v for k, v in user.items() if k != 'password'},
                    "settings": data['settings']})

# ─── SETTINGS ────────────────────────────────────────────────────────────────

@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings():
    data = load_data()
    return jsonify(data['settings'])

@app.route('/api/settings/portal-lock', methods=['POST'])
@roles_required('admin')
def toggle_portal_lock():
    data = load_data()
    data['settings']['portal_locked'] = not data['settings']['portal_locked']
    save_data(data)
    return jsonify(data['settings'])

# ─── USERS ───────────────────────────────────────────────────────────────────

@app.route('/api/users', methods=['GET'])
@roles_required('admin')
def get_users():
    data = load_data()
    return jsonify([{k: v for k, v in u.items() if k != 'password'} for u in data['users']])

@app.route('/api/users', methods=['POST'])
@roles_required('admin')
def create_user():
    d = request.json
    data = load_data()
    if any(u['username'] == d['username'] for u in data['users']):
        return jsonify({"error": "Username already exists"}), 400
    u_id_long = str(uuid.uuid4().hex)
    u_id = u_id_long[:8]
    new_user: User = {
        "id": "u" + u_id,
        "name": str(d.get('name', '')),
        "username": str(d.get('username', '')),
        "password": hash_pw(str(d.get('password', ''))),
        "role": str(d.get('role', 'booker'))
    }
    data['users'].append(new_user)
    save_data(data)
    return jsonify({k: v for k, v in new_user.items() if k != 'password'}), 201

@app.route('/api/users/<uid>', methods=['PUT'])
@roles_required('admin')
def update_user(uid):
    d = request.json
    data = load_data()
    user = next((u for u in data['users'] if u['id'] == uid), None)
    if not user:
        return jsonify({"error": "Not found"}), 404
    user['name'] = d.get('name', user['name'])
    user['role'] = d.get('role', user['role'])
    if d.get('password'):
        user['password'] = hash_pw(d['password'])
    save_data(data)
    return jsonify({k: v for k, v in user.items() if k != 'password'})

@app.route('/api/users/<uid>', methods=['DELETE'])
@roles_required('admin')
def delete_user(uid):
    if uid == session.get('user_id'):
        return jsonify({"error": "Cannot delete yourself"}), 400
    data = load_data()
    data['users'] = [u for u in data['users'] if u['id'] != uid]
    save_data(data)
    return jsonify({"ok": True})

# ─── HALLS ───────────────────────────────────────────────────────────────────

@app.route('/api/halls', methods=['GET'])
@login_required
def get_halls():
    data = load_data()
    return jsonify(data['halls'])

@app.route('/api/halls', methods=['POST'])
@roles_required('admin')
def create_hall():
    d = request.json
    data = load_data()
    h_id_long = str(uuid.uuid4().hex)
    h_id = h_id_long[:8]
    hall: Hall = {
        "id": "h" + h_id,
        "name": str(d.get('name', '')),
        "capacity": int(d.get('capacity', 0)),
        "type": str(d.get('type', 'Classroom')),
        "locked": False,
        "image": str(d.get('image', ''))
    }
    data['halls'].append(hall)
    save_data(data)
    return jsonify(hall), 201

@app.route('/api/halls/<hid>', methods=['PUT'])
@roles_required('admin')
def update_hall(hid):
    d = request.json
    data = load_data()
    hall = next((h for h in data['halls'] if h['id'] == hid), None)
    if not hall:
        return jsonify({"error": "Not found"}), 404
    
    # Cast to dict to allow update
    cast(dict, hall).update({k: v for k, v in d.items() if k in ('name','capacity','type','locked','image')})
    save_data(data)
    return jsonify(hall)

@app.route('/api/halls/<hid>', methods=['DELETE'])
@roles_required('admin')
def delete_hall(hid):
    data = load_data()
    data['halls'] = [h for h in data['halls'] if h['id'] != hid]
    save_data(data)
    return jsonify({"ok": True})

# ─── INVENTORY ───────────────────────────────────────────────────────────────

@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory():
    data = load_data()
    inventory_list = cast(List[InventoryItem], cast(dict, data).get('inventory', []))
    items = inventory_list
    dept = request.args.get('dept')
    if dept:
        items = [i for i in inventory_list if str(i.get('dept')) == dept]
    result = []
    for item in items:
        # Create a dict from the TypedDict and add a computed field
        i = dict(item)
        s_qty = int(cast(dict, item).get('stock_qty', 0))
        u_qty = int(cast(dict, item).get('in_use', 0))
        i['available_qty'] = s_qty - u_qty
        result.append(i)
    return jsonify(result)

@app.route('/api/inventory', methods=['POST'])
@roles_required('admin', 'it', 'reception')
def create_inventory():
    d = request.json
    data = load_data()
    i_id_long = str(uuid.uuid4().hex)
    i_id = i_id_long[:8]
    item: InventoryItem = {
        "id": "i" + i_id,
        "name": str(d.get('name', '')),
        "dept": str(d.get('dept', 'it')),
        "stock_qty": int(d.get('stock_qty', 0)),
        "in_use": 0
    }
    data['inventory'].append(item)
    save_data(data)
    return jsonify(item), 201

@app.route('/api/inventory/<iid>', methods=['PUT'])
@roles_required('admin', 'it', 'reception')
def update_inventory(iid):
    d = request.json or {}
    data = load_data()
    inventory_list = cast(List[InventoryItem], cast(dict, data).get('inventory', []))
    item = next((i for i in inventory_list if i.get('id') == iid), None)
    if not item:
        return jsonify({"error": "Not found"}), 404
    if 'stock_qty' in d:
        cast(dict, item)['stock_qty'] = int(str(d.get('stock_qty', 0)))
    if 'name' in d:
        cast(dict, item)['name'] = str(d.get('name', ''))
    save_data(data)
    return jsonify(item)

@app.route('/api/inventory/<iid>', methods=['DELETE'])
@roles_required('admin')
def delete_inventory(iid):
    data = load_data()
    data['inventory'] = [i for i in data['inventory'] if i['id'] != iid]
    save_data(data)
    return jsonify({"ok": True})

# ─── EVENTS ──────────────────────────────────────────────────────────────────

def compute_event_status(event: Event) -> str:
    """Determine current status based on approvals."""
    ri: List[RequestedItem] = cast(List[RequestedItem], event.get('requested_items', []))
    it_items = [i for i in ri if i['dept'] == 'it']
    rec_items = [i for i in ri if i['dept'] == 'reception']
    it_done  = all(i.get('dept_approved') for i in it_items) if it_items else True
    rec_done = all(i.get('dept_approved') for i in rec_items) if rec_items else True
    if event.get('principal_decision') == 'approved':
        return 'approved'
    if event.get('principal_decision') == 'rejected':
        return 'rejected'
    if it_done and rec_done:
        return 'principal_review'
    return 'dept_review'

@app.route('/api/events', methods=['GET'])
@login_required
def get_events():
    data = load_data()
    events = data['events']
    role = session['role']
    uid  = session['user_id']
    if role == 'booker':
        events = [e for e in events if e.get('created_by') == uid]
    elif role == 'it':
        events = [e for e in events if
                  any(i.get('dept') == 'it' for i in cast(List[RequestedItem], e.get('requested_items', [])))]
    elif role == 'reception':
        events = [e for e in events if
                  any(i.get('dept') == 'reception' for i in cast(List[RequestedItem], e.get('requested_items', [])))]
    # principal & admin see all
    result = []
    for e in events:
        ev = dict(e)
        ev['status'] = compute_event_status(cast(Event, e))
        result.append(ev)
    return jsonify(result)

@app.route('/api/events', methods=['POST'])
@roles_required('booker')
def create_event():
    data = load_data()
    if data['settings']['portal_locked']:
        return jsonify({"error": "Portal is locked"}), 403
    d = request.json
    # Validate hall not locked
    hall = next((h for h in data['halls'] if h['id'] == d.get('hall_id')), None)
    if not hall or hall.get('locked'):
        return jsonify({"error": "Hall not available"}), 400
    # Build requested items with dept info
    ri: List[RequestedItem] = []
    inventory_items = cast(List[InventoryItem], cast(dict, data).get('inventory', []))
    for item_req in d.get('items', []):
        inv = next((i for i in inventory_items if i.get('id') == item_req.get('item_id')), None)
        if inv:
            ri.append({
                "item_id": str(inv.get('id', '')),
                "item_name": str(inv.get('name', '')),
                "dept": str(inv.get('dept', 'it')),
                "requested_qty": int(str(item_req.get('qty', 0))),
                "allocated_qty": 0,
                "dept_approved": False,
                "returned": False
            })
    e_id_long = str(uuid.uuid4().hex)
    e_id = e_id_long[:8]
    event: Event = {
        "id": "e" + e_id,
        "title": str(d.get('title', '')),
        "date": str(d.get('date', '')),
        "time_slot": str(d.get('time_slot', '')),
        "hall_id": str(d.get('hall_id', '')),
        "hall_name": str(cast(Hall, hall).get('name', 'Unknown')),
        "description": str(d.get('description', '')),
        "budget": float(d.get('budget', 0)),
        "coordinator": str(d.get('coordinator', '')),
        "expected_count": int(d.get('expected_count', 0)),
        "has_intro_video": bool(d.get('has_intro_video', False)),
        "has_dance": bool(d.get('has_dance', False)),
        "requested_items": ri,
        "created_by": str(session.get('user_id')),
        "created_by_name": str(session.get('name')),
        "created_at": datetime.now().isoformat(),
        "principal_decision": None,
        "principal_note": ""
    }
    data['events'].append(event)
    save_data(data)
    # Status is transient for frontend
    ev_dict = dict(event)
    ev_dict['status'] = compute_event_status(event)
    return jsonify(ev_dict), 201

@app.route('/api/events/<eid>', methods=['GET'])
@login_required
def get_event(eid):
    data = load_data()
    events_list = cast(List[Event], data.get('events', []))
    event = next((e for e in events_list if e.get('id') == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404
    ev = dict(event)
    ev['status'] = compute_event_status(cast(Event, event))
    return jsonify(ev)

@app.route('/api/events/<eid>/dept-review', methods=['POST'])
@roles_required('it', 'reception')
def dept_review(eid):
    """IT or Reception allocate quantities to event items."""
    d = request.json  # {item_id, allocated_qty}
    role = session['role']
    data = load_data()
    event = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404

    for item_update in d.get('items', []):
        requested_items = cast(List[RequestedItem], event.get('requested_items', []))
        for ri in requested_items:
            if ri.get('item_id') == item_update.get('item_id') and ri.get('dept') == role:
                alloc = int(item_update.get('allocated_qty', 0))
                # Update inventory in_use
                inventory = cast(List[InventoryItem], data.get('inventory', []))
                inv = next((i for i in inventory if i.get('id') == ri.get('item_id')), None)
                if inv:
                    available = int(cast(Union[str, int, float], inv.get('stock_qty', 0))) - int(cast(Union[str, int, float], inv.get('in_use', 0)))
                    if alloc > available:
                        return jsonify({"error": f"Not enough stock for {ri.get('item_name')}"}), 400
                    inv['in_use'] += alloc
                cast(dict, ri)['allocated_qty'] = alloc
                cast(dict, ri)['dept_approved'] = True

    save_data(data)
    ev_res = dict(event)
    ev_res['status'] = compute_event_status(cast(Event, event))
    return jsonify(ev_res)

@app.route('/api/events/<eid>/principal-review', methods=['POST'])
@roles_required('principal')
def principal_review(eid):
    d = request.json  # {decision: approved|rejected, note}
    data = load_data()
    event = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404
    if compute_event_status(event) != 'principal_review':
        return jsonify({"error": "Not ready for principal review"}), 400
    event['principal_decision'] = d['decision']
    event['principal_note'] = d.get('note', '')
    # If rejected, free inventory
    if d.get('decision') == 'rejected':
        for ri in cast(List[RequestedItem], event.get('requested_items', [])):
            inv = next((i for i in data['inventory'] if i['id'] == ri.get('item_id')), None)
            if inv and ri.get('dept_approved'):
                inv['in_use'] = max(0, inv['in_use'] - int(cast(float, ri.get('allocated_qty', 0))))
    save_data(data)
    ev_res = dict(event)
    ev_res['status'] = compute_event_status(cast(Event, event))
    return jsonify(ev_res)

@app.route('/api/events/<eid>/return', methods=['POST'])
@roles_required('it', 'reception')
def return_items(eid):
    """Mark items as returned after event."""
    role = session['role']
    data = load_data()
    event = next((e for e in data['events'] if e['id'] == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404
    for ri in cast(List[RequestedItem], event.get('requested_items', [])):
        if ri['dept'] == role and ri['dept_approved'] and not ri.get('returned'):
            inv = next((i for i in data['inventory'] if i['id'] == ri['item_id']), None)
            if inv:
                inv['in_use'] = max(0, inv['in_use'] - int(cast(float, ri.get('allocated_qty', 0))))
            cast(dict, ri)['returned'] = True
    save_data(data)
    return jsonify({"ok": True})

@app.route('/api/events/<eid>', methods=['DELETE'])
@roles_required('booker', 'admin')
def delete_event(eid):
    data = load_data()
    # Free inventory
    events = cast(List[Event], data.get('events', []))
    event = next((e for e in events if e.get('id') == eid), None)
    if not event:
        return jsonify({"error": "Not found"}), 404

    for ri in cast(List[RequestedItem], event.get('requested_items', [])):
        if ri.get('dept_approved') and not ri.get('returned'):
            inventory = cast(List[InventoryItem], cast(dict, data).get('inventory', []))
            inv = next((i for i in inventory if i.get('id') == ri.get('item_id')), None)
            if inv:
                inv['in_use'] = max(0, int(cast(Union[str, int, float], inv.get('in_use', 0))) - int(cast(float, ri.get('allocated_qty', 0))))
    
    # Cast data to dict for list assignment if needed
    cast(dict, data)['events'] = [e for e in events if e.get('id') != eid]
    save_data(data)
    return jsonify({"ok": True})

# ─── STATS ───────────────────────────────────────────────────────────────────

@app.route('/api/stats')
@login_required
def stats():
    data = load_data()
    events = data['events']
    return jsonify({
        "total_events": len(events),
        "approved": len([e for e in events if e.get('principal_decision') == 'approved']),
        "pending": len([e for e in events if not e.get('principal_decision')]),
        "rejected": len([e for e in events if e.get('principal_decision') == 'rejected']),
        "total_users": len(data['users']),
        "total_halls": len(data['halls']),
        "inventory_items": len(data['inventory']),
    })

if __name__ == '__main__':
    init_data()
    app.run(debug=True, port=5000)