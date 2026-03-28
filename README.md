# KPR EMS — Event & Analytics Management System

A full-stack web application with a **Flask backend** and **HTML/CSS/JS frontend**.

---

## 📁 Project Structure

```
kprhub/
├── app.py                  # Flask backend (all API routes)
├── data.json               # Auto-generated database (JSON file)
├── requirements.txt
├── templates/
│   ├── index.html          # Login page
│   └── dashboard.html      # Main dashboard shell
└── static/
    ├── css/
    │   └── dashboard.css   # All styles
    └── js/
        └── dashboard.js    # All frontend logic
```

---

## 🚀 Setup & Run

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the app
```bash
python app.py
```

### 3. Open in browser
```
http://localhost:5000
```

---

## 👤 Default Login Credentials

| Role       | Username    | Password       |
|------------|-------------|----------------|
| Admin      | admin       | admin123       |
| Booker     | booker      | booker123      |
| IT Support | it          | it123          |
| Reception  | reception   | reception123   |
| Principal  | principal   | principal123   |

---

## 🔄 Event Workflow

```
Booker creates event
        ↓
IT & Reception allocate inventory (independently)
        ↓
Principal reviews & approves/rejects
        ↓
After event: IT & Reception mark items as returned
```

---

## 🛠️ API Endpoints

| Method | Endpoint                          | Role         | Description               |
|--------|-----------------------------------|--------------|---------------------------|
| POST   | /api/login                        | All          | Login                     |
| POST   | /api/logout                       | All          | Logout                    |
| GET    | /api/me                           | All          | Current user info         |
| GET    | /api/users                        | Admin        | List users                |
| POST   | /api/users                        | Admin        | Create user               |
| PUT    | /api/users/<id>                   | Admin        | Update user               |
| DELETE | /api/users/<id>                   | Admin        | Delete user               |
| GET    | /api/halls                        | All          | List halls                |
| POST   | /api/halls                        | Admin        | Create hall               |
| PUT    | /api/halls/<id>                   | Admin        | Update/lock hall          |
| DELETE | /api/halls/<id>                   | Admin        | Delete hall               |
| GET    | /api/inventory                    | All          | List inventory            |
| POST   | /api/inventory                    | Admin/IT/Rec | Add item                  |
| PUT    | /api/inventory/<id>               | Admin/IT/Rec | Update stock              |
| DELETE | /api/inventory/<id>               | Admin        | Delete item               |
| GET    | /api/events                       | All          | List events (role-filtered)|
| POST   | /api/events                       | Booker       | Create event              |
| GET    | /api/events/<id>                  | All          | Get event details         |
| POST   | /api/events/<id>/dept-review      | IT/Reception | Allocate items            |
| POST   | /api/events/<id>/principal-review | Principal    | Approve/reject            |
| POST   | /api/events/<id>/return           | IT/Reception | Mark items returned       |
| DELETE | /api/events/<id>                  | Booker/Admin | Cancel event              |
| GET    | /api/stats                        | All          | System statistics         |
| GET    | /api/settings                     | All          | Portal settings           |
| POST   | /api/settings/portal-lock         | Admin        | Toggle portal lock        |
