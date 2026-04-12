// ─── STATE ───────────────────────────────────────────────────────────────────
let currentUser = null;
let settings = {};
let currentPage = null;
let eventPageState = { 'all-events': 1, 'pending-events': 1, 'manage-users': 1, 'manage-halls': 1, 'manage-inventory': 1, 'my-events': 1, 'club-requests': 1, 'dept-inventory': 1, 'dept-returns': 1 };
const EVENTS_PER_PAGE = 12;
const LIST_PER_PAGE = 10;

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await api('/api/me');
    currentUser = res.user;
    settings = res.settings;
    window._hierarchy = await api('/api/hierarchy');
    renderShell();
    // Default sidebar to collapsed on load
    const sb = document.getElementById('sidebar');
    const mw = document.querySelector('.main-wrap');
    if (sb && mw) {
      // FORCE COLLAPSED DEFAULT (NO 'expanded' class)
      sb.classList.remove('expanded');
      mw.classList.add('sidebar-collapsed');
      mw.classList.remove('sidebar-expanded');
      const btn = document.getElementById('menuToggleBtn');
      if (btn) btn.innerHTML = '☰';
    }
    if (settings.portal_locked && currentUser.role !== 'admin') {
      showPortalLocked(); return;
    }
    navigateTo(defaultPage());
  } catch (e) { window.location.href = '/'; }
}

function defaultPage() {
  const m = { admin: 'overview', booker: 'my-events', it: 'it-requests', reception: 'rec-requests', principal: 'pending-events' };
  return m[currentUser.role] || 'overview';
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function renderShell() {
  const rc = {
    admin: 'badge badge-admin',
    booker: 'badge badge-booker',
    it: 'badge badge-it',
    reception: 'badge badge-reception',
    principal: 'badge badge-principal',
    pixesclub: 'badge badge-pixes',
    fineartsclub: 'badge badge-finearts'
  };
  document.getElementById('userInfo').className = 'user-info';
  document.getElementById('userInfo').innerHTML = `
    <div class="user-name">${currentUser.name}</div>
    <div class="user-role premium-role-badge">${currentUser.role.toUpperCase()}</div>`;

  // Role badge in topbar
  const roleBadge = document.getElementById('topbarRoleBadge');
  if (roleBadge) {
    roleBadge.textContent = currentUser.role.toUpperCase();
    roleBadge.className = 'topbar-role-badge premium-role-badge';
    roleBadge.style.display = 'block';
  }

  // Highlight logout if admin
  const logoutBtn = document.querySelector('.btn-logout');
  if (logoutBtn) {
    logoutBtn.classList.toggle('highlighted', currentUser.role === 'admin');
    logoutBtn.innerHTML = `↩ <span>Sign Out</span>`;
  }

  if (settings.portal_locked) document.getElementById('lockBadge').style.display = 'flex';
  // Date display
  const d = new Date();
  document.getElementById('topbarDate').textContent =
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  // Nav
  const navItems = getNavItems();
  document.getElementById('sidebarNav').innerHTML = navItems.map(n => `
    <div class="nav-item ${n.id === currentPage ? 'active' : ''}" id="nav-${n.id}" onclick="navigateTo('${n.id}')">
      <span class="nav-icon">${n.icon}</span> <span class="nav-text">${n.label}</span>
    </div>`).join('');
}

function getNavItems() {
  const role = currentUser.role;
  if (role === 'admin') return [
    { id: 'overview', icon: '📊', label: 'Command Center' },
    { id: 'manage-users', icon: '👥', label: 'Identity Management' },
    { id: 'manage-halls', icon: '🏛️', label: 'Venue Catalog' },
    { id: 'manage-schools', icon: '🏫', label: 'School Hierarchy' },
    { id: 'manage-inventory', icon: '📦', label: 'System Inventory' },
    { id: 'all-events', icon: '📅', label: 'Event Master' },
    { id: 'settings', icon: '⚙️', label: 'Portal Config' },
    { id: 'reports', icon: '📄', label: 'Intelligence' },
  ];
  if (role === 'booker') return [
    { id: 'my-events', icon: '📅', label: 'My Bookings' },
    { id: 'new-event', icon: '✨', label: 'New Booking' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  if (role === 'it') return [
    { id: 'it-requests', icon: '🖥️', label: 'Pending Requests' },
    { id: 'it-inventory', icon: '📦', label: 'IT Inventory' },
    { id: 'it-returns', icon: '↩️', label: 'Returns' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  if (role === 'reception') return [
    { id: 'rec-requests', icon: '📋', label: 'Pending Requests' },
    { id: 'rec-inventory', icon: '📦', label: 'Inventory' },
    { id: 'rec-returns', icon: '↩️', label: 'Returns' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  if (role === 'principal') return [
    { id: 'pending-events', icon: '⏳', label: 'Pending' },
    { id: 'all-events', icon: '📅', label: 'History' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  if (role === 'pixesclub') return [
    { id: 'club-requests', icon: '📸', label: 'Club Dashboard' },
    { id: 'club-inventory', icon: '🎒', label: 'Pixes Equipment' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  if (role === 'fineartsclub') return [
    { id: 'club-requests', icon: '💃', label: 'Club Dashboard' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  return [];
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.id === 'nav-' + page));
  const titles = {
    'overview': 'Overview', 'manage-users': 'Manage Users', 'manage-halls': 'Manage Halls',
    'manage-inventory': 'Inventory', 'all-events': 'All Events', 'settings': 'Settings',
    'my-events': 'My Bookings', 'new-event': 'New Booking', 'reports': 'Reports',
    'it-requests': 'IT Requests', 'it-inventory': 'IT Asset Registry', 'it-returns': 'Equipment Returns',
    'rec-requests': 'Reception Requests', 'rec-inventory': 'Institutional Inventory', 'rec-returns': 'Equipment Returns',
    'pending-events': 'Authorization Pending',
    'club-requests': 'Club Activity Hub', 'club-inventory': 'Club Asset Registry', 'club-returns': 'Club Returns',
    'manage-schools': 'Institutional Hierarchy',
  };
  document.getElementById('topbarTitle').textContent = titles[page] || page;
  document.getElementById('pageContent').innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Loading…</span></div>';
  closeSidebar();
  const routes = {
    'overview': renderOverview,
    'manage-users': renderManageUsers,
    'manage-halls': renderManageHalls,
    'manage-inventory': renderManageInventory,
    'all-events': renderAllEvents,
    'settings': renderSettings,
    'my-events': renderMyEvents,
    'new-event': renderNewEvent,
    'reports': renderReports,
    'it-requests': () => renderDeptRequests('it'),
    'it-inventory': () => renderDeptInventory('it'),
    'it-returns': () => renderReturns('it'),
    'rec-requests': () => renderDeptRequests('reception'),
    'rec-inventory': () => renderDeptInventory('reception'),
    'rec-returns': () => renderReturns('reception'),
    'manage-schools': renderManageSchools,
    'pending-events': renderPendingEvents,
    'club-requests': () => renderClubRequests(currentUser.role),
    'club-inventory': () => renderDeptInventory(currentUser.role),
    'club-returns': () => renderReturns(currentUser.role),
  };
  if (routes[page]) routes[page]();
}

// ─── OVERVIEW (ADMIN) ──────────────────────────────────────────────────────────
async function renderOverview() {
  const [stats, events] = await Promise.all([api('/api/stats'), api('/api/events')]);

  // Mask Global Overview for Clubs (only show their dashboard)
  if (currentUser.role === 'pixesclub' || currentUser.role === 'fineartsclub') {
    return renderClubRequests(currentUser.role);
  }

  document.getElementById('pageContent').innerHTML = `
    ${getUpcomingEventsHtml(events)}

    <div class="section premium-overview">
      <div class="section-overlay-red"></div>
      <div class="section-header">
        <div>
          <div class="section-title" style="color:#7f1d1d">Administrative Command Center</div>
          <div class="section-sub">Real-time System Intelligence & Monitoring</div>
        </div>
        <div class="header-actions">
           <button class="btn btn-gold btn-sm" onclick="previewReport('full-summary')">✨ System Synthesis</button>
           <button class="btn btn-primary" onclick="downloadReport('all-events')">📅 Export Ledger</button>
        </div>
      </div>
      
      <div class="stat-grid-premium">
        <div class="stat-card-new red-glass">
          <div class="card-content">
            <div class="card-label">Total Volume</div>
            <div class="card-value">${stats.total_events || 0}</div>
            <div class="card-sub">Global event requests processed</div>
          </div>
          <div class="card-icon">📊</div>
        </div>
        
        <div class="stat-card-new green-glass">
            <div class="card-content">
              <div class="card-label">Successful Approvals</div>
              <div class="card-value">${stats.approved || 0}</div>
              <div class="card-sub">Finalized hall bookings</div>
            </div>
            <div class="card-icon">✅</div>
        </div>

        <div class="stat-card-new gold-glass">
            <div class="card-content">
              <div class="card-label">Active Queue</div>
              <div class="card-value">${stats.pending || 0}</div>
              <div class="card-sub">Awaiting administrative review</div>
            </div>
            <div class="card-icon">⏳</div>
        </div>

        <div class="stat-card-new crimson-glass">
            <div class="card-content">
              <div class="card-label">Denied Proposals</div>
              <div class="card-value">${stats.rejected || 0}</div>
              <div class="card-sub">Requests returned with notes</div>
            </div>
            <div class="card-icon">✕</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header"><div class="section-title">Operational Directorates</div></div>
      <div class="quick-action-grid">
        <button class="action-card" onclick="navigateTo('manage-users')">
          <span class="action-icon">👥</span>
          <span class="action-text">Identity Hub</span>
        </button>
        <button class="action-card" onclick="navigateTo('manage-halls')">
          <span class="action-icon">🏛️</span>
          <span class="action-text">Venue Catalog</span>
        </button>
        <button class="action-card" onclick="navigateTo('manage-schools')">
          <span class="action-icon">🏫</span>
          <span class="action-text">School Org</span>
        </button>
        <button class="action-card" onclick="navigateTo('manage-inventory')">
          <span class="action-icon">📦</span>
          <span class="action-text">Supply Chain</span>
        </button>
        <button class="action-card" onclick="navigateTo('all-events')">
          <span class="action-icon">📅</span>
          <span class="action-text">Master Schedule</span>
        </button>
        <button class="action-card special" onclick="navigateTo('settings')">
          <span class="action-icon">⚙️</span>
          <span class="action-text">Portal Config</span>
        </button>
      </div>
    </div>`;
}

// ─── MANAGE SCHOOLS ───────────────────────────────────────────────────────────
async function renderManageSchools() {
  const hierarchy = await api('/api/hierarchy');
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">School Hierarchy</div><div class="section-sub">Manage colleges and departments</div></div>
        <button class="btn btn-primary" onclick="openAddSchool()">➕ Add School</button>
      </div>
      <div class="hierarchy-grid">
        ${Object.entries(hierarchy).map(([school, depts]) => `
          <div class="hierarchy-card">
            <div class="hierarchy-card-header">
              <div>
                <div class="hierarchy-school-name">🏫 ${school}</div>
                <div style="font-size:0.72rem;color:var(--muted);font-weight:700;margin-top:2px;text-transform:uppercase;letter-spacing:0.05em">${depts.length} Departments</div>
              </div>
              <div class="hierarchy-actions">
                <button class="btn btn-icon" onclick="openAddDept('${school.replace(/'/g, "\\'")}')">➕</button>
                <button class="btn btn-icon btn-danger" onclick="deleteSchool('${school.replace(/'/g, "\\'")}')">🗑️</button>
              </div>
            </div>
            <div class="hierarchy-depts">
              ${depts.map(d => `
                <div class="hierarchy-dept-tag">
                  ${d} <span class="tag-close" onclick="deleteDept('${school.replace(/'/g, "\\'")}', '${d.replace(/'/g, "\\'")}')">×</span>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

async function openAddSchool() {
  const name = prompt("Enter School/College Name:");
  if (!name) return;
  const hierarchy = await api('/api/hierarchy');
  if (hierarchy[name]) { showToast('School already exists', 'error'); return; }
  hierarchy[name] = [];
  await api('/api/hierarchy', 'PUT', hierarchy);
  renderManageSchools();
}

async function openAddDept(school) {
  const dept = prompt(`Add department to ${school}:`);
  if (!dept) return;
  const hierarchy = await api('/api/hierarchy');
  if (hierarchy[school].includes(dept)) { showToast('Department already exists', 'error'); return; }
  hierarchy[school].push(dept);
  await api('/api/hierarchy', 'PUT', hierarchy);
  renderManageSchools();
}

async function deleteSchool(school) {
  showConfirmModal('Delete School', `Delete entire school "${school}" and all its departments?`, async () => {
    const hierarchy = await api('/api/hierarchy');
    delete hierarchy[school];
    await api('/api/hierarchy', 'PUT', hierarchy);
    renderManageSchools();
  });
}

async function deleteDept(school, dept) {
  showConfirmModal('Remove Department', `Remove department "${dept}" from ${school}?`, async () => {
    const hierarchy = await api('/api/hierarchy');
    hierarchy[school] = hierarchy[school].filter(d => d !== dept);
    await api('/api/hierarchy', 'PUT', hierarchy);
    renderManageSchools();
  });
}

// ─── MANAGE USERS ─────────────────────────────────────────────────────────────
async function renderManageUsers() {
  const users = await api('/api/users');
  const roleStyles = {
    admin: 'role-admin', booker: 'role-booker', it: 'role-it', reception: 'role-reception',
    principal: 'role-admin', pixesclub: 'role-club', fineartsclub: 'role-club'
  };

  const page = eventPageState['manage-users'] || 1;
  const start = (page - 1) * LIST_PER_PAGE;
  const paginated = users.slice(start, start + LIST_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Identity Management</div><div class="section-sub">Configure and maintain professional system accounts</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('users')">📄 Export Directory</button>
          <button class="btn btn-primary" onclick="openAddUser()">➕ Register Identity</button>
        </div>
      </div>
      
      <div class="premium-id-table-wrap">
        <table class="premium-id-table">
          <thead>
            <tr>
              <th>User Identity</th>
              <th>System Role</th>
              <th>Username</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.map(u => {
    const style = roleStyles[u.role] || 'role-booker';
    const avatarColor = style === 'role-admin' ? 'var(--accent-lt)' : (style === 'role-club' ? '#fffbeb' : '#f1f5f9');
    const avatarText = style === 'role-admin' ? 'var(--accent)' : (style === 'role-club' ? '#d97706' : '#475569');

    return `
              <tr class="id-row-premium">
                <td>
                  <div class="user-identity-cell">
                    <div class="id-avatar-circle" style="background:${avatarColor}; color:${avatarText}; position:relative;">
                      ${u.name.charAt(0)}
                      <div class="tag-golden-green" style="position:absolute; bottom:-10px; right:-10px; font-size:9px; padding:2px 6px; border:1px solid #c9a227; box-shadow:0 2px 4px rgba(0,0,0,0.1)">FIXED</div>
                    </div>
                    <div class="id-name-box">
                      <div class="id-full-name">${u.name}</div>
                      <div class="id-email-sub">${u.email || 'managed@kprcas.ac.in'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="role-pill-badge ${style}">${u.role.toUpperCase()}</span>
                </td>
                <td>
                  <span class="id-username-mono">@${u.username}</span>
                </td>
                <td style="text-align:right">
                  <div style="display:flex; gap:12px; justify-content:flex-end">
                    <button class="btn manage-btn-edit" onclick="openEditUser('${u.id}')" title="Edit Properties">
                       <span class="btn-icon">✏️</span> Edit
                    </button>
                    ${u.id !== currentUser.id ? `
                    <button class="btn manage-btn-delete" onclick="deleteUser('${u.id}', '${u.name}')" title="Revoke Access">
                       <span class="btn-icon">🗑️</span> Delete
                    </button>` : ''}
                  </div>
                </td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(users.length, page, LIST_PER_PAGE, 'manage-users')}
    </div>`;
}

function openAddUser() {
  document.getElementById('modalTitle').textContent = 'Add New User';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Full Name</label><input id="uName" placeholder="Dr. Jane Smith"></div>
      <div class="field"><label>Username</label><input id="uUsername" placeholder="jsmith"></div>
      <div class="field"><label>Email</label><input id="uEmail" type="email" placeholder="user@example.com"></div>
      <div class="field"><label>Password</label><input id="uPassword" type="password" placeholder="••••••••"></div>
      <div class="field"><label>Role</label><select id="uRole">
        <option value="booker">Booker</option>
        <option value="it">IT Support</option>
        <option value="reception">Reception</option>
        <option value="principal">Principal</option>
        <option value="pixesclub">Pixes Club</option>
        <option value="fineartsclub">Fine Arts Club</option>
        <option value="admin">Admin</option>
      </select></div>
    </div>`;
  openModal();
}
async function submitAddUser() {
  const body = { name: v('uName'), username: v('uUsername'), email: v('uEmail'), password: v('uPassword'), role: v('uRole') };
  if (!body.name || !body.username || !body.password) { showToast('Fill all fields', 'error'); return; }
  await api('/api/users', 'POST', body); closeModal(); showToast('User created', 'success'); renderManageUsers();
}
function openEditUser(uid) {
  api('/api/users').then(users => {
    const u = users.find(x => x.id === uid);
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-grid">
        <div class="field"><label>Full Name</label><input id="euName" value="${u.name}"></div>
        <div class="field"><label>Email</label><input id="euEmail" type="email" value="${u.email || ''}"></div>
        <div class="field"><label>Role</label><select id="euRole">
          ${['booker', 'it', 'reception', 'principal', 'admin', 'pixesclub', 'fineartsclub'].map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
        </select></div>
        <div class="field" style="grid-column:1/-1"><label>New Password (leave blank to keep)</label><input id="euPassword" type="password" placeholder="••••••••"></div>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:20px;">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitEditUser('${uid}')">Save Changes</button>
      </div>`;
    openModal();
  });
}
async function submitEditUser(uid) {
  const body = { name: v('euName'), email: v('euEmail'), role: v('euRole') }; const pw = v('euPassword'); if (pw) body.password = pw;
  await api(`/api/users/${uid}`, 'PUT', body); closeModal(); showToast('User updated', 'success'); renderManageUsers();
}
async function deleteUser(uid, name) {
  showConfirmModal('Delete User', `Are you sure you want to delete user "${name}"? This action cannot be undone.`, async () => {
    await api(`/api/users/${uid}`, 'DELETE');
    showToast('User deleted', 'info');
    renderManageUsers();
  });
}

// ─── MANAGE HALLS ─────────────────────────────────────────────────────────────
async function renderManageHalls() {
  const halls = await api('/api/halls');
  const page = eventPageState['manage-halls'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const paginated = halls.slice(start, start + EVENTS_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Institutional Venues</div><div class="section-sub">${halls.length} venues managed in catalog</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('halls')">📄 Export Catalog</button>
          <button class="btn btn-primary" onclick="openAddHall()">➕ Register New Venue</button>
        </div>
      </div>
      <div class="hall-grid">
        ${paginated.map(h => {
    const img = getHallImage(h);
    return `
          <div class="hall-card ${h.locked ? 'locked' : ''}">
            <div class="hall-header" style="background-image: url('${img}')">
              <div class="hall-overlay"></div>
              <span class="status-badge ${h.locked ? 'status-locked' : 'status-active'}">
                ${h.locked ? '🔒 Locked' : '● Online'}
              </span>
            </div>
            <div class="hall-body">
              <div class="hall-name">${h.name}</div>
              <div class="hall-meta">
                <span class="capacity-tag">👥 ${h.capacity} Seats</span>
                <span>📍 ${h.type}</span>
              </div>
            </div>
            <div class="hall-footer">
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openEditHall('${h.id}')">✏️ Edit</button>
              <button class="btn ${h.locked ? 'btn-success' : 'btn-gold'} btn-sm" onclick="event.stopPropagation();toggleHallLock('${h.id}',${h.locked})">${h.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteHall('${h.id}','${h.name}')" style="grid-column: 1 / -1; border-radius:12px; margin-top:8px">🗑️ Remove from Catalog</button>
            </div>
          </div>`;
  }).join('')}
      </div>
      ${renderPaginationControls(halls.length, page, EVENTS_PER_PAGE, 'manage-halls')}
    </div>`;
}
function openAddHall() {
  document.getElementById('modalTitle').textContent = 'Register New Institutional Venue';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid large-form" style="gap:20px">
      <div class="field" style="grid-column:1/-1">
        <label>Venue Name</label>
        <input id="hName" placeholder="e.g. Main Auditorium / Seminar Hall C">
      </div>
      <div class="field">
        <label>Seating Capacity</label>
        <input id="hCap" type="number" placeholder="e.g. 150">
      </div>
      <div class="field">
        <label>Classification</label>
        <select id="hType">
          ${['Seminar Hall', 'Open Air Theatre (OAT)', 'Lab', 'Auditorium', 'Conference Hall', 'Classroom'].map(t => `<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="grid-column:1/-1">
        <label>Venue Photograph</label>
        <input id="hPhoto" type="file" accept="image/*" style="padding:10px; border:2px dashed var(--border); border-radius:12px; width:100%">
      </div>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:28px">
      <button class="btn btn-outline" onclick="closeModal()">✕ Cancel</button>
      <button class="btn btn-primary" onclick="submitAddHall()">✓ Create Venue</button>
    </div>`;
  openModal();
}
async function submitAddHall() {
  const name = v('hName'), cap = v('hCap'), type = v('hType'), photo = document.getElementById('hPhoto')?.files[0];
  if (!name || !cap) { showToast('Fill all required fields', 'error'); return; }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('capacity', cap);
  fd.append('type', type);
  if (photo) fd.append('photo', photo);

  await fetch('/api/halls', { method: 'POST', body: fd, credentials: 'include' });
  closeModal(); showToast('Hall added', 'success'); renderManageHalls();
}
function openEditHall(hid) {
  api('/api/halls').then(halls => {
    const h = halls.find(x => x.id === hid);
    document.getElementById('modalTitle').textContent = 'Modify Venue — ' + h.name;
    document.getElementById('modalBody').innerHTML = `
      <div class="form-grid large-form" style="gap:20px">
        <div class="field" style="grid-column:1/-1">
          <label>Venue Name</label>
          <input id="ehName" value="${h.name}">
        </div>
        <div class="field">
          <label>Seating Capacity</label>
          <input id="ehCap" type="number" value="${h.capacity}">
        </div>
        <div class="field">
          <label>Classification</label>
          <select id="ehType">
            ${['Seminar Hall', 'Open Air Theatre (OAT)', 'Lab', 'Auditorium', 'Conference Hall', 'Classroom'].map(t => `<option ${t === h.type ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>Update Photograph (leave blank to keep current)</label>
          <input id="ehPhoto" type="file" accept="image/*" style="padding:10px; border:2px dashed var(--border); border-radius:12px; width:100%">
        </div>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:28px">
        <button class="btn btn-outline" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="submitEditHall('${hid}')">Save Changes</button>
      </div>`;
    openModal();
  });
}
async function submitEditHall(hid) {
  const fd = new FormData();
  fd.append('name', v('ehName'));
  fd.append('capacity', parseInt(v('ehCap')));
  fd.append('type', v('ehType'));
  const photo = document.getElementById('ehPhoto')?.files[0];
  if (photo) fd.append('photo', photo);

  await fetch(`/api/halls/${hid}`, { method: 'PUT', body: fd, credentials: 'include' });
  closeModal(); showToast('Hall updated', 'success'); renderManageHalls();
}
async function toggleHallLock(hid, locked) {
  await api(`/api/halls/${hid}`, 'PUT', { locked: !locked });
  showToast(locked ? 'Hall unlocked' : 'Hall locked', 'info'); renderManageHalls();
}
async function deleteHall(hid, name) {
  showConfirmModal('Remove Venue', `Permanently remove "${name}" from the institutional catalog?`, async () => {
    await api(`/api/halls/${hid}`, 'DELETE');
    showToast('Hall deleted', 'info');
    renderManageHalls();
  });
}

// ─── MANAGE INVENTORY ─────────────────────────────────────────────────────────
async function renderManageInventory() {
  const items = await api('/api/inventory');
  const page = eventPageState['manage-inventory'] || 1;
  const start = (page - 1) * LIST_PER_PAGE;
  const paginated = items.slice(start, start + LIST_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">All Inventory</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('inventory')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddInventory()">➕ Add Item</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Department</th><th>In Use Alone</th><th>Actions</th></tr></thead>
          <tbody>
            ${paginated.map(i => `<tr>
              <td style="font-weight:700">${i.name} ${i.locked ? ' <span style="font-size:0.8rem" title="Blocked">🔒</span>' : ''}</td>
              <td><span class="badge" style="background-color:${i.dept === 'it' ? '#6366f1' : (i.dept === 'reception' ? '#10b981' : (i.dept === 'pixesclub' ? '#38bdf8' : '#fb7185'))};color:#fff">${i.dept.toUpperCase()}</span></td>
              <td><span class="in-use-pill">${i.in_use}</span></td>
              <td><div class="td-actions">
                <button class="btn btn-outline btn-sm" onclick="openEditInventory('${i.id}')">Edit Stock</button>
                ${(currentUser.role !== 'reception' && currentUser.role !== 'it') ? `<button class="btn btn-sm ${i.locked ? 'btn-success' : 'btn-warning'}" style="color:#000" onclick="toggleInventoryLock('${i.id}', ${i.locked})">${i.locked ? 'Unblock' : 'Block'}</button>` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteInventory('${i.id}','${i.name}')">Delete</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls(items.length, page, LIST_PER_PAGE, 'manage-inventory')}
    </div>`;
}
function openAddInventory() {
  document.getElementById('modalTitle').textContent = 'Add Inventory Item';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Item Name</label><input id="invName" placeholder="Laptop"></div>
      <div class="field"><label>Department</label><select id="invDept">
        <option value="it">IT Support</option>
        <option value="reception">Reception</option>
        <option value="pixesclub">Pixes Club</option>
        <option value="fineartsclub">Fine Arts Club</option>
      </select></div>
      <div class="field"><label>Stock Quantity</label><input id="invQty" type="number" placeholder="10"></div>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:20px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddInventory()">Add Item</button>
    </div>`;
  openModal();
}
async function submitAddInventory() {
  const body = { name: v('invName'), dept: v('invDept'), stock_qty: parseInt(v('invQty')) || 0 };
  if (!body.name) { showToast('Enter item name', 'error'); return; }
  await api('/api/inventory', 'POST', body); closeModal(); showToast('Item added', 'success'); renderManageInventory();
}
function openEditInventory(iid) {
  api('/api/inventory').then(items => {
    const item = items.find(x => x.id === iid);
    document.getElementById('modalTitle').textContent = 'Modify Inventory Item';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-grid single">
        <div class="field">
          <label>Item Name</label>
          <input value="${item.name}" readonly style="background:#f8fafc">
        </div>
        <div class="field">
          <label>Total Stock Quantity</label>
          <input id="eInvQty" type="number" value="${item.stock_qty}">
        </div>
      </div>
      <div class="modal-footer" style="padding:0; margin-top:24px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <button class="btn btn-danger" onclick="deleteInventory('${item.id}', '${item.name}')">🗑️ Delete</button>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline" onclick="closeModal()">Dismiss</button>
          <button class="btn btn-primary" onclick="submitEditInventory('${iid}')">Update Record</button>
        </div>
      </div>`;
    openModal();
  });
}
async function submitEditInventory(iid) {
  await api(`/api/inventory/${iid}`, 'PUT', { stock_qty: parseInt(v('eInvQty')) });
  closeModal(); showToast('Stock updated', 'success'); renderManageInventory();
}
async function deleteInventory(iid, name) {
  showConfirmModal('Delete Item', `Remove "${name}" from system inventory?`, async () => {
    await api(`/api/inventory/${iid}`, 'DELETE');
    showToast('Item deleted', 'info');
    renderManageInventory();
  });
}
async function toggleInventoryLock(iid, locked) {
  await api(`/api/inventory/${iid}`, 'PUT', { locked: !locked });
  showToast(locked ? 'Item Unlocked' : 'Item Blocked', 'info');
  // Need to know where we are to re-render correctly
  if (eventPageState['currentContext'] === 'manage-inventory') {
    renderManageInventory();
  } else {
    const role = currentUser.role;
    const dept = (role === 'it' || role === 'reception') ? role : (role === 'pixesclub' ? 'pixesclub' : 'fineartsclub');
    renderDeptInventory(dept);
  }
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
async function renderSettings() {
  const s = await api('/api/settings');
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Portal Configuration</div><div class="section-sub">Manage system-wide access and security settings</div></div>
      </div>
      
      <div class="cards-grid" style="grid-template-columns: 1fr; max-width: 600px; margin: 0 auto;">
        <div class="form-card admin-lock-card">
          <div style="display:flex;gap:18px;align-items:center;">
            <div class="lock-card-icon">🔒</div>
            <div style="flex:1">
              <div class="lock-card-title">Administrative Lock</div>
              <div class="lock-card-desc">When active, only administrators can access the portal. All other users will see a maintenance screen.</div>
            </div>
          </div>
          
          <div class="lock-status-panel">
            <div class="status-info">
              <div class="status-label">CURRENT STATUS</div>
              <div class="status-value ${s.portal_locked ? 'locked' : 'open'}">
                <span class="pulse-dot"></span>
                ${s.portal_locked ? 'SYSTEM UNDER MAINTENANCE' : 'PUBLIC ACCESS ACTIVE'}
              </div>
            </div>
            <button class="btn-lock-toggle ${s.portal_locked ? 'unlocked' : 'locked'}" onclick="togglePortalLock()">
              ${s.portal_locked ? '🔓 Authorize Access' : '🔒 Restrict Access'}
            </button>
          </div>
        </div>
      </div>
    </div>`;
}
async function togglePortalLock() {
  const s = await api('/api/settings/portal-lock', 'POST');
  settings = s;
  document.getElementById('lockBadge').style.display = s.portal_locked ? 'flex' : 'none';
  showToast(s.portal_locked ? 'Portal locked' : 'Portal unlocked', 'info');
  renderSettings();
}

// ─── BOOKER: MY EVENTS ────────────────────────────────────────────────────────
async function renderMyEvents() {
  const events = await api('/api/events');
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  const page = eventPageState['my-events'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const paginated = events.slice(start, start + EVENTS_PER_PAGE);
  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">My Events</div><div class="section-sub">${events.length} proposal(s)</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('my-events')">\u{1F4C4} My Report</button>
          <button class="btn btn-primary" onclick="navigateTo('new-event')">\u{2795} New Event</button>
        </div>
      </div>
      ${events.length === 0 ? emptyState('\u{1F4C5}', 'No events yet', 'Create your first event proposal to get started.') :
      eventFilterBar('myEventsGrid', 'booker', events) +
      '<div class="cards-grid" id="myEventsGrid">' + paginated.map(e => eventCard(e, 'booker')).join('') + '</div>' +
      renderPaginationControls(events.length, page, EVENTS_PER_PAGE, 'my-events')}
    </div>`;
}

// ─── HALL IMAGE MAP ────────────────────────────────────────────────────────────
const HALL_IMAGES = {
  classroom: 'https://blind-jade-follsdsq9o.edgeone.app/Gemini_Generated_Image_39822p39822p3982.png',
  lab: 'https://image2url.com/r2/default/images/1773031110724-b30b93d0-2e62-474a-bfb7-9d9c2598d9fe.jpg',
  seminar: 'https://image2url.com/r2/default/images/1773031202621-88ba1c54-5f16-4dbc-a880-b333ba18d35e.jpg',
  auditorium: 'https://image2url.com/r2/default/images/1773031158304-90488c29-3ede-4e04-b854-785134193c29.jpg',
  oat: 'https://image2url.com/r2/default/images/1773033055745-7e583046-cbc4-4841-ab1f-77c57e3e8289.png',
};
function getHallImage(hall) {
  // If no image, return fallback by type
  if (!hall.image || hall.image.trim() === '') {
    const t = (hall.type || '').toLowerCase();
    const n = (hall.name || '').toLowerCase();
    if (t === 'open air' || n.includes('oat')) return HALL_IMAGES.oat;
    if (t === 'auditorium') return HALL_IMAGES.auditorium;
    if (t === 'seminar' || n.includes('seminar')) return HALL_IMAGES.seminar;
    if (t === 'lab' || n.includes('lab')) return HALL_IMAGES.lab;
    if (t === 'conference') return HALL_IMAGES.seminar;
    return HALL_IMAGES.classroom;
  }
  // Image exists - support both http and local uploads
  return hall.image;
}
function getHallTypeLabel(hall) {
  if (hall.capacity <= 50) return { label: 'Small (≤50)', color: 'var(--green)', bg: 'var(--green-lt)' };
  if (hall.capacity < 300) return { label: 'Medium (51–299)', color: 'var(--gold)', bg: 'var(--gold-lt)' };
  return { label: 'Large (300+)', color: 'var(--purple)', bg: 'var(--purple-lt)' };
}

// Store halls globally for suggestion logic
let _allHalls = [];

// ─── BOOKER: NEW EVENT ────────────────────────────────────────────────────────
async function renderNewEvent() {
  const [halls, inventory, hierarchy] = await Promise.all([api('/api/halls'), api('/api/inventory'), api('/api/hierarchy')]);
  _allHalls = halls;
  const availHalls = halls.filter(h => !h.locked);
  const itItems = inventory.filter(i => i.dept === 'it' && !i.locked);
  const recItems = inventory.filter(i => i.dept === 'reception' && !i.locked);
  const pixesItems = inventory.filter(i => i.dept === 'pixesclub' && !i.locked);
  const faItems = inventory.filter(i => i.dept === 'fineartsclub' && !i.locked);

  document.getElementById('pageContent').innerHTML = `
  <div class="wizard-container">
    <div class="wizard-header">
      <div class="wizard-header-top">
        <div class="wizard-title">📋 New Event Proposal</div>
        <div style="color: rgba(255,255,255,0.8); font-size: 0.8rem; font-weight: 600; background: rgba(0,0,0,0.1); padding: 4px 12px; border-radius: 20px;">
          Draft Mode
        </div>
      </div>
      <div class="wizard-steps">
        <div class="wstep active" id="ws1" onclick="gotoStep(1)"><span>1</span> Details</div>
        <div class="wstep" id="ws2" onclick="gotoStep(2)"><span>2</span> Hall</div>
        <div class="wstep" id="ws3" onclick="gotoStep(3)"><span>3</span> IT</div>
        <div class="wstep" id="ws4" onclick="gotoStep(4)"><span>4</span> Reception</div>
        <div class="wstep" id="ws5" onclick="gotoStep(5)"><span>5</span> 📸 Pixes</div>
        <div class="wstep" id="ws6" onclick="gotoStep(6)"><span>6</span> 💃 Arts</div>
      </div>
    </div>
    <div class="wizard-body">

      <!-- PAGE 1 -->
      <div class="wpage" id="wpage1">
        <div class="form-grid" style="gap:16px">
          <div class="field" style="grid-column:1/-1">
            <label>Event Title *</label>
            <input id="evTitle" placeholder="e.g. Annual Tech Fest 2025" style="border-color:#0ea5e9">
          </div>
          <div class="field">
            <label>Event Type *</label>
            <select id="evType" style="border-color:#6366f1">
              <option value="Workshop">Workshop</option>
              <option value="Seminar">Seminar</option>
              <option value="Conference">Conference</option>
              <option value="Cultural">Cultural</option>
              <option value="Guest Lecture">Guest Lecture</option>
              <option value="Placement">Placement Drive</option>
              <option value="Meeting">Internal Meeting</option>
            </select>
          </div>
          <div class="field">
            <label>Resource Person / Guest *</label>
            <input id="evResource" placeholder="Name of Speaker/Guest" style="border-color:#8b5cf6">
          </div>
          <div class="field">
            <label>Event Coordinator *</label>
            <input id="evCoord" placeholder="Coordinator name" style="border-color:#10b981">
          </div>
          <div class="field">
            <label>Coordinator Phone *</label>
            <input id="evPhone" type="tel" placeholder="e.g. 9876543210" style="border-color:#0ea5e9">
          </div>
          <div class="field">
            <label>Expected Attendance *</label>
            <input id="evCount" type="number" min="1" placeholder="e.g. 120" oninput="onCountChange(this.value)" style="border-color:#8b5cf6">
          </div>
          <div class="field">
            <label>Date *</label>
            <input id="evDate" type="date" min="${new Date().toISOString().split('T')[0]}" style="border-color:#f59e0b">
          </div>
          <div class="field">
            <label>Duration (No. of Days) *</label>
            <input id="evDays" type="number" min="1" value="1" style="border-color:#10b981">
          </div>
          <div class="field">
            <label>Time Slot *</label>
            <select id="evSlot" style="border-color:#0ea5e9" onchange="if(this.value==='CUSTOM'){document.getElementById('evCustomSlotBox').style.display='block'}else{document.getElementById('evCustomSlotBox').style.display='none'}">
              <option>9:00 AM - 12:00 PM</option>
              <option>12:00 PM - 3:00 PM</option>
              <option>3:00 PM - 6:00 PM</option>
              <option>9:00 AM - 6:00 PM (Full Day)</option>
              <option value="CUSTOM">Other / Custom Time...</option>
            </select>
          </div>
          <div class="field" id="evCustomSlotBox" style="display:none;grid-column:1/-1">
            <label>Specify Custom Time *</label>
            <input id="evCustomSlot" type="text" placeholder="e.g. 10:30 AM - 1:30 PM" style="border-color:#0ea5e9">
          </div>
          <div class="field">
            <label>Budget ID</label>
            <input id="evBudget" type="text" placeholder="e.g. BGT-2025-01" style="border-color:#10b981">
          </div>
          <div class="field" style="grid-column:1/-1">
            <label>Event Overview & Purpose</label>
            <textarea id="evDesc" rows="2" placeholder="Briefly describe the event goal…"></textarea>
          </div>
        </div>

        <!-- School / Department Selector -->
        <div style="margin-top:18px;border-top:1.5px dashed #bae6fd;padding-top:16px">
          <div style="font-size:0.82rem;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">
            🎓 Participating Schools & Departments
          </div>
          <div id="schoolPicker" style="display:flex;flex-direction:column;gap:10px">
            ${buildSchoolPicker(hierarchy)}
          </div>
        </div>

        <!-- Special Requirements -->
        <div style="margin-top:18px;border-top:1.5px dashed #bae6fd;padding-top:16px">
          <div class="label-premium-header">✨ Special Requirements & Facilities</div>
          <div class="field" style="margin-bottom:18px">
            <textarea id="evSpecialReq" rows="3" placeholder="Enter any extra setup, seating, or specific needs here…" style="border-color:#c4b5fd"></textarea>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
            ${yesNoRow('evIntro', '🎬', 'Intro Video / KPR Anthem')}
            ${yesNoRow('evDance', '💃', 'Dance Performance')}
            ${yesNoRow('evPhotos', '📷', 'Photography')}
            ${yesNoRow('evVideo', '🎥', 'Videography')}
          </div>
        </div>
          <!-- Agenda Upload - MANDATORY -->
        <div style="margin-top:18px;border-top:1.5px dashed #fca5a5;padding-top:16px;background:linear-gradient(135deg,#fff7ed,#fef3c7);border-radius:12px;padding:16px;border:1.5px solid #fcd34d">
          <div style="font-size:0.82rem;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📎 Event Agenda (Mandatory)</div>
          <div style="font-size:0.78rem;color:#78350f;margin-bottom:12px">Upload the event agenda document. Without this, the proposal cannot be submitted.</div>
          <div class="field" style="margin:0">
            <input id="evAgenda" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" style="border:2px dashed #f59e0b;border-radius:10px;padding:10px;cursor:pointer;background:#fffbeb;width:100%">
          </div>
        </div>

        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="navigateTo('my-events')">✕ Cancel</button>
          <button class="btn btn-primary" onclick="proceedToHalls()">Proceed to Hall Selection →</button>
        </div>
      </div>

      <!-- PAGE 2 -->
      <div class="wpage" id="wpage2" style="display:none">
        <div class="section-header" style="margin-bottom:12px">
          <div>
            <div style="font-size:0.95rem;font-weight:800;color:#1e40af">🏨 Select Your Venue(s)</div>
            <div style="font-size:0.78rem;color:#64748b;margin-top:2px">Choose one or more halls for your event. Use the <strong>Multiple Selection</strong> mode for complex bookings.</div>
          </div>
          <div class="section-actions">
            <button class="btn btn-outline btn-sm" id="multiSelectToggle" onclick="toggleMultiSelectMode()">
              <span id="multiSelectIcon">🔘</span> <span id="multiSelectLabel">Enable Multi-Select</span>
            </button>
          </div>
        </div>
        <div id="hallSuggestionBanner" style="display:none" class="suggest-banner"></div>
        <div id="hallGrid" class="hall-select-grid" style="margin-top:8px">
          ${availHalls.map(h => hallSelectCard(h)).join('')}
          <!-- Custom Class Card -->
          <div class="hall-pick-card custom-class-card" id="hcard_custom_class" onclick="selectCustomClass()">
            <div class="hall-pick-img" style="background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center; font-size: 2.5rem;">
              🏫
            </div>
            <div class="hall-pick-body">
              <div class="hall-pick-name">Custom Class</div>
              <div class="hall-pick-type" style="color:var(--purple);background:var(--purple-lt)">Personal Selection</div>
            </div>
          </div>
        </div>
        
        <div id="customClassInputBox" style="display:none; margin-top:12px; padding:16px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px;">
          <label style="font-size:0.82rem; font-weight:700; color:#475569; display:block; margin-bottom:8px;">Enter Classroom Number *</label>
          <input id="evCustomClassroom" placeholder="e.g. SF 201, MB 305..." style="width:100%; border:1.5px solid #cbd5e1; border-radius:8px; padding:10px;">
        </div>

        <input type="hidden" id="evHall">
        <div id="hallSelectedDisplay" style="margin-top:16px;display:none;padding:16px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:14px;border:1.5px solid #7dd3fc;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:0.7rem;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Selected Venues</div>
              <div id="hallSelectedNames" style="color:#0c4a6e;font-weight:600;font-size:0.95rem"></div>
            </div>
            <div style="text-align:right">
              <div style="font-size:0.7rem;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Combined Capacity</div>
              <div id="hallTotalCapacity" style="color:#6d28d9;font-weight:800;font-size:1.15rem"></div>
            </div>
          </div>
        </div>
        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="gotoStep(1)">← Back</button>
          <button class="btn btn-primary" onclick="gotoStep(3)">Next: IT →</button>
        </div>
      </div>

      <!-- PAGE 3 -->
      <div class="wpage" id="wpage3" style="display:none">
        <div class="req-table">
          <div class="req-header"><span>IT Item</span><span style="text-align:center">Available</span><span style="text-align:center">Qty</span></div>
          ${itItems.length ? itItems.map(i => reqRow(i)).join('') : '<div style="padding:20px;text-align:center;color:var(--muted)">No IT items in inventory</div>'}
        </div>
        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="gotoStep(2)">← Back</button>
          <button class="btn btn-primary" onclick="gotoStep(4)">Next: Reception →</button>
        </div>
      </div>

      <!-- PAGE 4 -->
      <div class="wpage" id="wpage4" style="display:none">
        <div class="req-table">
          <div class="req-header"><span>Item</span><span style="text-align:center">Available</span><span style="text-align:center">Qty</span></div>
          ${recItems.length ? recItems.map(i => reqRow(i)).join('') : '<div style="padding:20px;text-align:center;color:var(--muted)">No reception items in inventory</div>'}
        </div>
        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="gotoStep(3)">← Back</button>
          <button class="btn btn-primary" onclick="gotoStep(5)">Next: Pixes Club →</button>
        </div>
      </div>

      <!-- PAGE 5: PIXES CLUB -->
      <div class="wpage" id="wpage5" style="display:none">
        <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;padding:14px 18px;margin-bottom:16px;border:1.5px solid #7dd3fc">
          <div style="font-size:0.85rem;font-weight:800;color:#0369a1">📸 Pixes Club — Photography Requirements</div>
          <div style="font-size:0.75rem;color:#64748b;margin-top:4px">Only available if Photography was selected in Step 1. Leave all at 0 if not needed.</div>
        </div>
        <div class="req-table" id="pixesReqTable">
          <div class="req-header"><span>Photography Item</span><span style="text-align:center">Available</span><span style="text-align:center">Qty</span></div>
          ${pixesItems.length ? pixesItems.map(i => reqRow(i)).join('') : '<div style="padding:20px;text-align:center;color:var(--muted)">No Pixes Club items available</div>'}
        </div>
        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="gotoStep(4)">← Back</button>
          <button class="btn btn-primary" onclick="gotoStep(6)">Next: Fine Arts →</button>
        </div>
      </div>

      <!-- PAGE 6: FINE ARTS CLUB -->
      <div class="wpage" id="wpage6" style="display:none">
        <div style="background:linear-gradient(135deg,#fdf4ff,#fae8ff);border-radius:12px;padding:14px 18px;margin-bottom:16px;border:1.5px solid #d8b4fe">
          <div style="font-size:0.85rem;font-weight:800;color:#7e22ce">💃 Fine Arts Club — Dance Performance Requirements</div>
          <div style="font-size:0.75rem;color:#64748b;margin-top:4px">Only available if Dance Performance was selected in Step 1. Leave all at 0 if not needed.</div>
        </div>
        <div class="req-table" id="faReqTable">
          <div class="req-header"><span>Fine Arts Item</span><span style="text-align:center">Available</span><span style="text-align:center">Qty</span></div>
          ${faItems.length ? faItems.map(i => reqRow(i)).join('') : '<div style="padding:20px;text-align:center;color:var(--muted)">No Fine Arts items available</div>'}
        </div>
        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="gotoStep(5)">← Back</button>
          <button class="btn btn-primary" onclick="submitNewEvent()">🚀 Submit Proposal</button>
        </div>
      </div>

    </div>
  </div>
  `;
}


function resetNewEventForm() {
  _selectedHalls = {};
}

function gotoStep(n) {
  if (n === 2 && !validateStep1()) return;

  const getValue = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value === 'yes';
  const hasPhotos = getValue('evPhotos');
  const hasDance = getValue('evDance');

  // Detection for forward/backward skip
  let current = 1;
  const activeWs = document.querySelector('.wstep.active');
  if (activeWs) {
    current = parseInt(activeWs.id.replace('ws', ''));
  }

  // Smart Skip Pixes (Step 5)
  if (n === 5 && !hasPhotos) {
    return n > current ? gotoStep(6) : gotoStep(4);
  }
  // Smart Skip Arts (Step 6)
  if (n === 6 && !hasDance) {
    if (n > current) {
      // If moving forward from 5 or 4, and no Arts, and we are at the end...
      // If current was 5 and no arts, we submit. If current was 4 and no photos/no arts, we submit.
      // However, better to just let it fall through to a confirm.
      if (confirm('No club requirements selected. Propose event now?')) {
        submitNewEvent();
      }
      return;
    } else {
      return gotoStep(5);
    }
  }

  const total = 6;
  for (let i = 1; i <= total; i++) {
    const pg = document.getElementById('wpage' + i);
    const ws = document.getElementById('ws' + i);

    if (ws) {
      // Hide skipped steps in tracker
      if (i === 5) ws.style.display = hasPhotos ? 'flex' : 'none';
      if (i === 6) ws.style.display = hasDance ? 'flex' : 'none';

      ws.classList.toggle('active', i === n);
      ws.classList.toggle('done', i < n);
    }
    if (pg) pg.style.display = (i === n) ? '' : 'none';
  }
}

function validateStep1() {
  const title = v('evTitle'), date = v('evDate'), coord = v('evCoord'), phone = v('evPhone'), count = v('evCount'), res = v('evResource');
  if (!title) { showToast('Event Title is required', 'error'); return false; }
  if (!date) { showToast('Please select an Event Date', 'error'); return false; }
  if (!res) { showToast('Resource Person is required', 'error'); return false; }
  if (!coord) { showToast('Event Coordinator is required', 'error'); return false; }
  if (!phone || phone.length < 10) { showToast('Valid Coordinator Phone is required', 'error'); return false; }
  if (!count || parseInt(count) <= 0) { showToast('Please enter expected attendance', 'error'); return false; }
  const agendaInput = document.getElementById('evAgenda');
  if (!agendaInput || !agendaInput.files || agendaInput.files.length === 0) {
    showToast('📎 Agenda document is mandatory — please attach a file', 'error'); return false;
  }
  return true;
}

function proceedToHalls() {
  if (validateStep1()) {
    gotoStep(2);
  }
}


// ─── SCHOOL / DEPT PICKER ──────────────────────────────────────────────────
function buildSchoolPicker(hierarchy) {
  if (!hierarchy || typeof hierarchy !== 'object') return '<em style="color:var(--muted)">No schools found</em>';
  return Object.entries(hierarchy).map(([school, depts], idx) => {
    const schoolId = 'sch_' + idx;
    return `
    <div class="school-selection-card">
      <div class="school-selection-header" onclick="toggleSchoolUI('${schoolId}')">
        <div style="display:flex;align-items:center;gap:14px">
          <input type="checkbox" class="school-chk" value="${school.replace(/"/g, '&quot;')}" 
            onchange="onSchoolCheck(this,'${schoolId}')" onclick="event.stopPropagation()">
          <div>
            <div class="school-selection-name">${school}</div>
            <div class="school-selection-count">${depts.length} Departments</div>
          </div>
        </div>
        <div class="school-selection-arrow" id="exp_${schoolId}">▼</div>
      </div>
      <div class="dept-selection-grid" id="dl_${schoolId}" style="display:none">
        ${depts.map(dep => `
          <label class="dept-selection-item">
            <input type="checkbox" class="dept-chk" data-school="${school.replace(/"/g, '&quot;')}" value="${dep.replace(/"/g, '&quot;')}" 
              onchange="updateSchoolCheckState('${schoolId}')">
            <span>${dep}</span>
          </label>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function toggleSchoolUI(id) {
  const dl = document.getElementById('dl_' + id);
  const exp = document.getElementById('exp_' + id);
  if (dl) {
    const isHidden = dl.style.display === 'none';
    dl.style.display = isHidden ? 'grid' : 'none';
    if (exp) exp.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0)';
  }
}

function onSchoolCheck(chk, id) {
  const dl = document.getElementById('dl_' + id);
  if (dl) {
    if (chk.checked && dl.style.display === 'none') toggleSchoolUI(id);
  }
}

let _multiSelectMode = false;
function toggleMultiSelectMode() {
  _multiSelectMode = !_multiSelectMode;
  const btn = document.getElementById('multiSelectToggle');
  const label = document.getElementById('multiSelectLabel');
  const icon = document.getElementById('multiSelectIcon');

  if (_multiSelectMode) {
    btn.classList.replace('btn-outline', 'btn-primary');
    label.textContent = 'Multi-Select Active';
    icon.textContent = '✔️';
    showToast('You can now select multiple halls', 'info');
  } else {
    btn.classList.replace('btn-primary', 'btn-outline');
    label.textContent = 'Enable Multi-Select';
    icon.textContent = '🔘';
    // Clear all but the first selected if desired, or just leave it
  }
}

function updateSchoolCheckState(id) {
  const dl = document.getElementById('dl_' + id);
  const schoolChk = document.querySelector(`#sb_${id} .school-chk`);
  if (dl && schoolChk) {
    const total = dl.querySelectorAll('.dept-chk').length;
    const checked = dl.querySelectorAll('.dept-chk:checked').length;
    schoolChk.checked = checked === total && total > 0;
    schoolChk.indeterminate = checked > 0 && checked < total;
  }
}

function toggleSchool(chk, school) {
  const id = btoa(school).replace(/=/g, '').slice(0, 8);
  const dl = document.getElementById('dl_' + id);
  if (dl) dl.style.display = chk.checked ? 'grid' : 'none';
  // Select all depts when school is checked
  if (chk.checked && dl) {
    dl.querySelectorAll('.dept-chk').forEach(c => c.checked = true);
  } else if (dl) {
    dl.querySelectorAll('.dept-chk').forEach(c => c.checked = false);
  }
}

function getSelectedDepartments() {
  const result = [];
  document.querySelectorAll('.dept-chk:checked').forEach(chk => {
    result.push({ school: chk.dataset.school, department: chk.value });
  });
  return result;
}

function yesNoRow(id, icon, label) {
  return `<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:12px 14px">
    <div style="font-size:0.84rem;font-weight:600;color:var(--text2);margin-bottom:10px">${icon} ${label}</div>
    <div style="display:flex;gap:16px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.84rem;font-weight:600;color:var(--green)">
        <input type="radio" name="${id}" id="${id}_yes" value="yes" style="accent-color:var(--green)"> Yes
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.84rem;font-weight:600;color:var(--muted)">
        <input type="radio" name="${id}" id="${id}_no" value="no" checked style="accent-color:var(--muted)"> No
      </label>
    </div>
  </div>`;
}

function hallSelectCard(h) {
  const img = getHallImage(h);
  const imgHtml = img ? `<div class="hall-pick-img" style="background-image:url('${img}')"><div class="hall-pick-overlay"></div></div>` :
    `<div class="hall-pick-img" style="background-color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--muted)">🏛️</div>`;
  return `
  <div class="hall-pick-card" id="hcard_${h.id}" onclick="selectHall('${h.id}','${h.name.replace(/'/g, '&#39;')}',${h.capacity})">
    ${imgHtml}
    <div class="hall-pick-body">
      <div class="hall-pick-name">${h.name}</div>
      <div class="hall-meta" style="margin-bottom: 0;">
        <span class="capacity-tag">👥 ${h.capacity} Seats</span>
        <span>📍 ${h.type}</span>
      </div>
    </div>
  </div>`;
}

// Multi-hall selection tracker
let _selectedHalls = {};

function selectCustomClass() {
  const hid = 'custom_class';
  if (!_multiSelectMode) {
    _selectedHalls = {};
  }

  if (_selectedHalls[hid]) {
    delete _selectedHalls[hid];
    document.getElementById('customClassInputBox').style.display = 'none';
  } else {
    _selectedHalls[hid] = { id: hid, name: 'Custom Class', capacity: 0 };
    document.getElementById('customClassInputBox').style.display = 'block';
  }
  updateHallSelectionUI();
}

function updateHallSelectionUI() {
  document.querySelectorAll('.hall-pick-card').forEach(c => {
    const id = c.id.replace('hcard_', '');
    c.classList.toggle('selected', !!_selectedHalls[id]);
  });

  const ids = Object.keys(_selectedHalls);
  document.getElementById('evHall').value = ids.join(',');

  const dispEl = document.getElementById('hallSelectedDisplay');
  const namesEl = document.getElementById('hallSelectedNames');
  const capEl = document.getElementById('hallTotalCapacity');

  if (ids.length === 0) {
    dispEl.style.display = 'none';
  } else {
    dispEl.style.display = 'block';
    namesEl.textContent = Object.values(_selectedHalls).map(h => h.name).join(', ');
    const totalCap = Object.values(_selectedHalls).reduce((s, h) => s + h.capacity, 0);
    capEl.textContent = totalCap + ' seats total';

    const count = parseInt(document.getElementById('evCount')?.value || 0);
    if (count > 0) onCountChange(count);
  }
}

function selectHall(hid, hname, hcap) {
  if (!_multiSelectMode) {
    _selectedHalls = {};
    const customInp = document.getElementById('customClassInputBox');
    if (customInp) customInp.style.display = 'none';
  }

  if (_selectedHalls[hid]) {
    delete _selectedHalls[hid];
  } else {
    _selectedHalls[hid] = { id: hid, name: hname, capacity: parseInt(hcap) };
  }
  updateHallSelectionUI();
}

function onCountChange(val) {
  const count = parseInt(val) || 0;
  if (!count) return;
  const banner = document.getElementById('hallSuggestionBanner');

  const totalSelectedCap = Object.values(_selectedHalls).reduce((s, h) => s + h.capacity, 0);

  let suitableHalls = [];
  let categoryLabel = "";

  if (count <= 60) {
    suitableHalls = _allHalls.filter(h => !h.locked && (h.type.toLowerCase().includes('lab') || h.type.toLowerCase().includes('classroom') || h.capacity <= 60));
    categoryLabel = "Classrooms/Labs";
  } else if (count <= 300) {
    suitableHalls = _allHalls.filter(h => !h.locked && (h.type.toLowerCase().includes('seminar') || (h.capacity > 60 && h.capacity <= 300)));
    categoryLabel = "Seminar Halls";
  } else {
    suitableHalls = _allHalls.filter(h => !h.locked && (h.type.toLowerCase().includes('auditorium') || h.type.toLowerCase().includes('open air') || h.capacity > 300));
    categoryLabel = "Auditoriums/OAT";
  }

  suitableHalls.sort((a, b) => a.capacity - b.capacity);

  banner.style.display = 'block';
  banner.className = 'suggest-banner';

  if (totalSelectedCap >= count) {
    banner.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:rgba(255,255,255,0.2);padding:8px;border-radius:10px;font-size:1.2rem">✅</div>
        <div>
          <div style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em">Capacity Requirement Met</div>
          <div style="font-size:0.85rem;margin-top:2px">Your selection (Cap: ${totalSelectedCap}) is sufficient for ${count} attendees.</div>
        </div>
      </div>`;
  } else if (suitableHalls.length > 0) {
    banner.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div style="background:rgba(255,255,255,0.2);padding:8px;border-radius:10px;font-size:1.2rem">💡</div>
        <div>
          <div style="font-size:0.75rem;font-weight:800;text-transform:uppercase;opacity:0.9;letter-spacing:0.05em">Recommended ${categoryLabel}</div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            ${suitableHalls.slice(0, 4).map(h => `
              <button class="btn btn-sm" onclick="selectHall('${h.id}','${h.name.replace(/'/g, "\\'")}',${h.capacity})" 
                style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:0.75rem;font-weight:700;backdrop-filter:blur(6px);padding:4px 10px">
                ${h.name} <span style="opacity:0.7;font-weight:400;margin-left:4px">(${h.capacity})</span>
              </button>`).join('')}
          </div>
        </div>
      </div>`;
  } else {
    banner.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    banner.innerHTML = `<div style="display:flex;align-items:center;gap:10px">⚠️ No suitable single hall found for ${count} people. Consider multi-hall selection.</div>`;
  }

  document.querySelectorAll('.hall-pick-card').forEach(c => {
    const hid = c.id.replace('hcard_', '');
    c.classList.toggle('suggested', suitableHalls.some(h => h.id === hid));
  });
}

function reqRow(item) {
  return `
  <div class="req-row">
    <span class="req-name">${item.name}</span>
    <span class="req-avail" style="text-align:center;visibility:hidden">---</span>
    <input class="item-qty-input" type="number" min="0" value="0" id="qty_${item.id}" placeholder="0">
  </div>`;
}

function inventoryRequestRow(item) {
  return `<div class="item-row">
    <div class="item-row-name">${item.name}</div>
    <div class="item-avail" style="visibility:hidden">---</div>
    <input class="item-qty-input" type="number" min="0" value="0" id="qty_${item.id}" placeholder="0">
  </div>`;
}

async function submitNewEvent() {
  const title = v('evTitle'), date = v('evDate'), budget_id = v('evBudget');
  let time_slot = v('evSlot');
  if (time_slot === 'CUSTOM') time_slot = v('evCustomSlot');

  const hall_id = v('evHall');
  const coordinator = v('evCoord'), expected_count = v('evCount');
  const days = parseInt(v('evDays') || 1);
  const description = v('evDesc');
  const special_requirements = v('evSpecialReq');

  if (!title || !date) { showToast('Please fill Event Title and Date', 'error'); return; }
  if (!hall_id) { showToast('Please select at least one Hall on step 2', 'error'); return; }
  if (!coordinator) { showToast('Please enter the Event Coordinator name', 'error'); return; }

  // Mandatory agenda check
  const agendaInput = document.getElementById('evAgenda');
  if (!agendaInput || !agendaInput.files || agendaInput.files.length === 0) {
    showToast('📎 Agenda is mandatory. Please attach a file.', 'error'); return;
  }

  const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value === 'yes';
  const inventory = await api('/api/inventory');
  const items = inventory.map(i => ({ item_id: i.id, qty: parseInt(document.getElementById('qty_' + i.id)?.value || 0) })).filter(i => i.qty > 0);
  const departments = getSelectedDepartments();

  // Use FormData to support file upload
  const fd = new FormData();
  fd.append('title', title);
  fd.append('date', date);
  fd.append('days', days);
  fd.append('time_slot', time_slot);
  fd.append('hall_id', hall_id);
  fd.append('expected_count', parseInt(expected_count) || 0);
  fd.append('event_type', v('evType'));
  fd.append('resource_person', v('evResource'));
  fd.append('coordinator', coordinator);
  fd.append('coordinator_phone', v('evPhone'));
  fd.append('description', description);
  fd.append('special_requirements', special_requirements);
  fd.append('budget_id', budget_id);
  fd.append('departments', JSON.stringify(departments));
  fd.append('has_intro_video', getRadio('evIntro'));
  fd.append('has_dance', getRadio('evDance'));
  fd.append('has_photos', getRadio('evPhotos'));
  fd.append('has_video', getRadio('evVideo'));
  fd.append('items', JSON.stringify(items));
  fd.append('agenda', agendaInput.files[0]);

  if (_selectedHalls['custom_class']) {
    const classNo = v('evCustomClassroom');
    if (!classNo) { showToast('Please enter the Classroom Number', 'error'); return; }
    fd.append('custom_classroom', classNo);
  }

  try {
    const resp = await fetch('/api/events', { method: 'POST', body: fd, credentials: 'include' });
    if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Submission failed'); }
    showToast('Proposal submitted successfully!', 'success');
    navigateTo('my-events');
  } catch (e) {
    showToast(e.message || 'Error submitting proposal', 'error');
  }
}

// ─── ALL EVENTS ───────────────────────────────────────────────────────────────
async function renderAllEvents() {
  const events = await api('/api/events');
  events.sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
  const role = currentUser.role;
  const page = eventPageState['all-events'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const paginated = events.slice(start, start + EVENTS_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Event Master Database</div><div class="section-sub">${events.length} total events tracked</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('all-events')">📊 System Report</button>
        </div>
      </div>
      ${events.length === 0 ? emptyState('📅', 'Empty Database', 'No events have been recorded yet.') :
      eventFilterBar('allEventsGrid', role, events) +
      '<div class="cards-grid-scroll" id="allEventsGrid">' +
      paginated.map(e => eventCard(e, role)).join('') +
      '</div>' +
      renderPaginationControls(events.length, page, EVENTS_PER_PAGE, 'all-events')}
    </div>`;
}

function changePage(context, delta) {
  eventPageState[context] = (eventPageState[context] || 1) + delta;
  if (context === 'all-events') renderAllEvents();
  if (context === 'pending-events') renderPendingEvents();
  if (context === 'my-events') renderMyEvents();
  if (context === 'club-requests') renderClubRequests(currentUser.role);
  if (context === 'manage-users') renderManageUsers();
  if (context === 'manage-halls') renderManageHalls();
  if (context === 'manage-inventory') renderManageInventory();
  if (context === 'dept-inventory') {
    const role = currentUser.role;
    const dept = (role === 'it' || role === 'reception') ? role : (role === 'pixesclub' ? 'pixesclub' : 'fineartsclub');
    renderDeptInventory(dept);
  }
  if (context === 'dept-returns') {
    const role = currentUser.role;
    const dept = (role === 'it' || role === 'reception') ? role : (role === 'pixesclub' ? 'pixesclub' : 'fineartsclub');
    renderReturns(dept);
  }
  if (context.startsWith('dept-requests-')) {
    const dept = context.replace('dept-requests-', '');
    renderDeptRequests(dept);
  }
  eventPageState['currentContext'] = context;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPaginationControls(total, page, perPage, context) {
  const maxPage = Math.ceil(total / perPage);
  if (maxPage <= 1) return '';
  return `
    <div class="pagination-bar">
      <button class="btn-page" ${page === 1 ? 'disabled' : ''} onclick="changePage('${context}', -1)">
        ← Previous
      </button>
      <div class="page-info">Page ${page} of ${maxPage}</div>
      <button class="btn-page" ${page >= maxPage ? 'disabled' : ''} onclick="changePage('${context}', 1)">
        Next Page →
      </button>
    </div>`;
}

function eventCard(e, role) {
  const statusBadge = {
    dept_review: '<span class="em-badge" style="background:#e2e8f0;color:#475569;font-size:0.6rem;padding:3px 8px;border-radius:4px">DEPT REVIEW</span>',
    principal_review: '<span class="em-badge" style="background:#e2e8f0;color:#475569;font-size:0.6rem;padding:3px 8px;border-radius:4px">PRINCIPAL</span>',
    approved: '<span class="em-badge" style="background:var(--gold-lt);color:var(--gold);font-size:0.6rem;padding:3px 8px;border-radius:4px">APPROVED</span>',
    rejected: '<span class="em-badge" style="background:var(--red-lt);color:var(--red);font-size:0.6rem;padding:3px 8px;border-radius:4px">REJECTED</span>',
  }[e.status] || '';

  let actions = '';
  if (role === 'admin') {
    actions = `
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-sm" onclick="event.stopPropagation();adminDeleteEvent('${e.id}')" title="Delete" style="background:#fee2e2;color:#dc2626;border:2.5px solid #ef4444;border-radius:14px;width:44px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 2px 5px rgba(220,38,38,0.1)">🗑️</button>
        <button class="btn btn-sm" onclick="event.stopPropagation();downloadSingleEventReport('${e.id}')" title="Report" style="background:#eff6ff;color:#2563eb;border:2.5px solid #3b82f6;border-radius:14px;width:44px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 2px 5px rgba(37,99,235,0.1)">📄</button>
        ${e.status !== 'approved' && e.status !== 'rejected' ? `<button class="btn btn-success btn-sm" onclick="event.stopPropagation();adminApproveEvent('${e.id}')" style="border-radius:14px;height:40px;padding:0 16px;font-weight:700;box-shadow:0 2px 5px rgba(5,150,105,0.1)">Quick Approve</button>` : ''}
      </div>
    `;
  } else if (role === 'principal' && e.status === 'principal_review') {
    actions = `<button class="btn btn-success btn-sm" onclick="event.stopPropagation();openPrincipalModal('${e.id}')" style="border-radius:14px;height:40px;padding:0 20px;font-weight:700">Review Decision</button>`;
  } else if (role === 'booker' && e.status === 'dept_review') {
    actions = `<div style="display:flex;gap:8px">
                 <button class="btn btn-warning btn-sm" onclick="event.stopPropagation();openEditEventModal('${e.id}')" style="border-radius:12px;height:38px;padding:0 15px;font-weight:700">Edit</button>
                 <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();cancelEvent('${e.id}')" style="border-radius:12px;height:38px;padding:0 15px;font-weight:700">Cancel</button>
               </div>`;
  } else if (role === 'it' || role === 'reception') {
    if (e.status === 'dept_review') {
      const myPending = e.requested_items.filter(i => i.dept === role && !i.dept_approved);
      actions = myPending.length > 0 ?
        `<button class="btn btn-success btn-sm" onclick="event.stopPropagation();openAllocModal('${e.id}','${role}')">📦 Allocate</button>` :
        `<span class="em-badge" style="background:var(--green-lt);color:var(--green)">✔ Allocated</span>`;
    } else if (e.status === 'approved') {
      const myReturns = e.requested_items.filter(i => i.dept === role && i.dept_approved && !i.returned && i.allocated_qty > 0);
      if (myReturns.length > 0) {
        actions = `<button class="btn btn-sm" style="background:#fef08a;color:#854d0e;border:1px solid #fde047" onclick="event.stopPropagation();processReturn('${e.id}','${role}')">↩️ Return</button>`;
      }
    }
  } else if (role === 'pixesclub' || role === 'fineartsclub') {
    if (e.status === 'dept_review') {
      const myPending = e.requested_items.filter(i => i.dept === role && !i.dept_approved);
      if (role === 'pixesclub') {
        actions = myPending.length > 0 ? `
            <button class="btn btn-success btn-sm" onclick="event.stopPropagation();openAllocModal('${e.id}','${role}')">✅ Accept</button>
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();rejectClubItems('${e.id}','${role}')">❌ Deny</button>` :
          `<span class="em-badge" style="background:var(--green-lt);color:var(--green)">✔ Approved</span>`;
      } else {
        // Fine Arts Club only needs event details, no action buttons
        actions = '';
      }
    } else if (e.status === 'approved') {
      const myReturns = e.requested_items.filter(i => i.dept === role && i.dept_approved && !i.returned && i.allocated_qty > 0);
      if (myReturns.length > 0) {
        actions = `<button class="btn btn-sm" style="background:#fef08a;color:#854d0e;border:1px solid #fde047" onclick="event.stopPropagation();processReturn('${e.id}','${role}')">↩️ Return</button>`;
      }
    }
  }

  let schoolStr = '';
  if (e.departments && e.departments.length > 0 && e.departments[0].school) {
    schoolStr = `<span class="em-school" style="color:var(--muted);font-weight:700;margin-left:8px;font-size:0.75rem;padding:2px 6px;background:var(--bg);border-radius:4px">🏛️ ${e.departments[0].school.toUpperCase()}</span>`;
  }

  let cardStyle = `padding:10px; border-radius:12px;`;
  if (e.status === 'approved') cardStyle += `background: rgba(22, 163, 74, 0.05); border: 1px solid rgba(22, 163, 74, 0.1);`;
  else if (e.status === 'dept_review' || e.status === 'principal_review') cardStyle += `background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.1);`;
  else if (e.status === 'scheduled') cardStyle += `background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.12);`;
  else cardStyle += `background: #ffffff; border: 1px solid var(--border);`;

  return `
    <div class="event-manage-card status-${e.status}" onclick="viewEventDetail('${e.id}')" style="cursor:pointer; ${cardStyle}">
      <div class="em-header" style="margin-bottom:6px">
        <div>
           ${statusBadge}
           <div class="em-title" style="font-size:0.85rem; font-weight:800; color:#1e293b">${e.title}</div>
        </div>
        <div style="font-size:0.65rem; font-weight:700; color:var(--muted)">#${e.id.slice(-4).toUpperCase()}</div>
      </div>
      
      <div style="font-size:0.7rem; color:var(--text); margin-bottom:6px; font-weight:600; opacity:0.8">👤 ${e.created_by_name || 'System'}${schoolStr}</div>
      
      <div class="em-meta" style="margin-bottom:8px; gap:6px; flex-wrap:wrap">
        <div class="em-meta-item" style="font-size:0.7rem">📅 ${e.date}</div>
        <div class="em-meta-item" style="font-size:0.7rem">⏰ ${e.time_slot.split('-')[0]}</div>
        ${(role !== 'it' && role !== 'reception') ? `<div class="em-meta-item" style="font-size:0.7rem">🏛️ ${e.hall_name}</div>` : ''}
      </div>

      <div class="em-actions" style="border-top:1px dashed rgba(0,0,0,0.06); padding-top:6px; gap:4px">
        ${actions}
        <button class="btn btn-success btn-xs" onclick="event.stopPropagation();viewEventDetail('${e.id}')" style="margin-left:auto; padding:2px 8px; font-size:0.65rem">Details</button>
      </div>
    </div>
  `;
}

// ─── CLUB REQUESTS (PIXES + FINE ARTS) ───────────────────────────────────────
async function renderClubRequests(role) {
  const events = await api('/api/events');
  // Pending Action: events where this club hasn't approved yet
  const pending = events.filter(e => e.requested_items.some(i => i.dept === role && !i.dept_approved) && (e.status === 'dept_review' || e.status === 'principal_review' || e.status === 'approved'));
  // Upcoming Schedule: scheduled events this club is involved in
  const upcoming = events.filter(e => e.status === 'approved' && e.requested_items.some(i => i.dept === role));

  pending.sort((a, b) => new Date(a.date) - new Date(b.date));
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

  const clubLabel = role === 'pixesclub' ? '📸 Pixes Club' : '💃 Fine Arts Club';

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">${clubLabel} — Club Workspace</div><div class="section-sub">Quick access to pending actions and your upcoming event schedule</div></div>
      </div>
      
      <div class="section-group-label" style="margin-top:24px; font-weight:800; color:#1e293b; font-size:1.1rem; letter-spacing:-0.01em;">📥 Pending Actions (${pending.length})</div>
      <div id="clubEventsGrid" class="cards-grid" style="margin-top:16px;">
        ${pending.length === 0 ? emptyState('✅', 'Workspace Clear', 'All club requests have been processed.') :
      pending.map(e => eventCard(e, role)).join('')}
      </div>

      ${upcoming.length > 0 ? `
      <div class="section-group-label" style="margin-top:40px; font-weight:800; color:#1e293b; font-size:1.1rem; letter-spacing:-0.01em;">📅 Upcoming Schedule (${upcoming.length})</div>
      <div class="cards-grid" style="margin-top:16px;">
        ${upcoming.slice(0, 10).map(e => eventCard(e, role)).join('')}
      </div>` : ''}
    </div>`;

  initEventCache('clubEventsGrid', role, pending);
}

// ─── PENDING EVENTS (PRINCIPAL) ───────────────────────────────────────────────
async function renderPendingEvents() {
  const events = await api('/api/events');
  const pending = events.filter(e => e.status === 'principal_review');
  const reviewed = events.filter(e => e.status !== 'principal_review');

  pending.sort((a, b) => new Date(a.date) - new Date(b.date));

  const page = eventPageState['pending-events'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const paginated = pending.slice(start, start + EVENTS_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Critical Approvals</div><div class="section-sub">${pending.length} events awaiting your decision</div></div>
      </div>
      
      <div class="filter-bar">
        <div class="filter-search-wrap">
          <span class="filter-search-icon">🔍</span>
          <input type="text" class="filter-search" id="pendingSearch" placeholder="Search events, halls..." oninput="filterPendingEvents()">
        </div>
        <select class="filter-sort" id="pendingSort" onchange="sortPendingEvents()">
          <option value="date">📅 Sort by Date (Earliest)</option>
          <option value="dept">🏫 Sort by Department</option>
          <option value="title">📝 Sort by Title</option>
        </select>
      </div>

      <div id="pendingEventsGridContainer">
        ${pending.length === 0 ? emptyState('✨', 'Inbox Zero', 'No events are currently awaiting approval.') :
      '<div class="cards-grid-scroll" id="pendingEventsGrid">' +
      paginated.map(e => eventCard(e, 'principal')).join('') +
      '</div>' +
      renderPaginationControls(pending.length, page, EVENTS_PER_PAGE, 'pending-events')}
      </div>
    </div>
    
    ${reviewed.length > 0 ? `
    <div class="section" style="margin-top:40px; border-top:1px solid var(--border); padding-top:40px">
      <div class="section-header"><div class="section-title">Decision History</div></div>
      <div class="cards-grid-scroll">
        ${reviewed.slice(0, 4).map(e => eventCard(e, 'principal')).join('')}
      </div>
      ${reviewed.length > 4 ? `<button class="btn btn-outline" style="margin-top:16px; width:100%" onclick="navigateTo('all-events')">View All History</button>` : ''}
    </div>` : ''}`;
}

// Helper for Principal Filtering/Sorting
function filterPendingEvents() { sortPendingEvents(); }
async function sortPendingEvents() {
  const events = await api('/api/events');
  let pending = events.filter(e => e.status === 'principal_review');
  const query = document.getElementById('pendingSearch')?.value.toLowerCase() || '';
  const sortBy = document.getElementById('pendingSort')?.value || 'date';

  if (query) {
    pending = pending.filter(e => e.title.toLowerCase().includes(query) || e.hall_name.toLowerCase().includes(query));
  }

  if (sortBy === 'dept') {
    pending.sort((a, b) => a.departments[0]?.department.localeCompare(b.departments[0]?.department));
  } else if (sortBy === 'title') {
    pending.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    pending.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  const grid = document.getElementById('pendingEventsGrid');
  if (grid) grid.innerHTML = pending.map(e => eventCard(e, 'principal')).join('');
}

// ─── DEPT REQUESTS ────────────────────────────────────────────────────────────
async function renderDeptRequests(dept) {
  const events = await api('/api/events');
  const relevant = events.filter(e => e.requested_items.some(i => i.dept === dept) && (e.status === 'dept_review' || e.status === 'principal_review' || e.status === 'approved'));
  relevant.sort((a, b) => new Date(a.date) - new Date(b.date));
  const pending = relevant.filter(e => e.requested_items.some(i => i.dept === dept && !i.dept_approved));
  const done = relevant.filter(e => e.requested_items.every(i => i.dept !== dept || i.dept_approved));
  const page = eventPageState['dept-requests-' + dept] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const pagPending = pending.slice(start, start + EVENTS_PER_PAGE);
  document.getElementById('pageContent').innerHTML = `
    ${getUpcomingEventsHtml(events)}
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Pending Inventory Requests</div><div class="section-sub">${pending.length} awaiting your allocation</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('dept-${dept}')">📄 Dept Report</button>
        </div>
      </div>
      ${pending.length === 0 ? emptyState('✅', 'All done!', 'No pending requests for your department.') :
      `<div class="cards-grid">${pagPending.map(e => eventCard(e, dept)).join('')}</div>` +
      renderPaginationControls(pending.length, page, EVENTS_PER_PAGE, 'dept-requests-' + dept)}
    </div>
    ${done.length > 0 ? `
    <div class="section">
      <div class="section-header"><div class="section-title">Processed</div></div>
      <div class="cards-grid">${done.slice(0, 4).map(e => eventCard(e, dept)).join('')}</div>
    </div>`: ''}`;
}

// ─── DEPT INVENTORY ───────────────────────────────────────────────────────────
async function renderDeptInventory(dept) {
  const items = await api('/api/inventory?dept=' + dept);
  const page = eventPageState['dept-inventory'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const paginated = items.slice(start, start + EVENTS_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">${dept === 'it' ? 'IT' : (dept === 'reception' ? 'Reception' : (dept === 'pixesclub' ? 'Pixes Club' : 'Fine Arts Club'))} Command Center — Inventory</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('inventory-${dept}')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddDeptInventory('${dept}')">➕ Add Item</button>
        </div>
      </div>
      <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
        ${paginated.map((i, idx) => {
    const grads = ['grad-violet', 'grad-ocean', 'grad-emerald', 'grad-sunset', 'grad-berry', 'grad-midnight'];
    const gradClass = grads[idx % grads.length];
    const isLowStock = (i.stock_qty - i.in_use) <= 5;
    return `
          <div class="inv-card-premium ${i.locked ? 'inv-blocked' : 'inv-clean'}">
            <div class="inv-card-inner">
              <div class="inv-header" style="justify-content: space-between; align-items: start; border-bottom: none; padding-bottom: 0;">
                <div class="inv-name-group">
                  <div class="inv-type-icon">${dept === 'it' ? '🖥️' : (dept === 'reception' ? '🛎️' : (dept === 'pixesclub' ? '📸' : '🎭'))}</div>
                  <div class="inv-name-text">${i.name}</div>
                </div>
                ${i.locked ? '<div title="Item Blocked / Locked" style="font-size:1.2rem; background:#fee2e2; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">🔒</div>' : ''}
              </div>
              
              <div class="inv-main-stats" style="margin-top:16px; margin-bottom: 16px; display:flex; justify-content:center; align-items:center;">
                <div class="inv-stat-circle" style="border-color:${i.locked ? '#fca5a5' : '#e2e8f0'}; background:${i.locked ? '#fff1f2' : '#f8fafc'}; color:${i.locked ? '#e11d48' : '#334155'};">
                  <div class="stat-circle-val" style="color:inherit">${i.in_use}</div>
                  <div class="stat-circle-lbl" style="color:inherit">IN USE</div>
                </div>
              </div>

              <div class="inv-footer-actions">
                <button class="btn-inv-action" style="flex:1; background:var(--surface); color:var(--text); border:1px solid var(--border);" onclick="openEditInventory('${i.id}')">
                  ⚙️ Manage
                </button>
                <button class="btn-inv-action" style="flex:1; background:${i.locked ? '#ecfdf5' : '#fef2f2'}; color:${i.locked ? '#059669' : '#dc2626'}; border:1px solid ${i.locked ? '#a7f3d0' : '#fecaca'};" onclick="toggleInventoryLock('${i.id}', ${i.locked})">
                  ${i.locked ? '🔓 Unblock' : '🔒 Block'}
                </button>
              </div>
            </div>
          </div>`}).join('')}
      </div>
      ${renderPaginationControls(items.length, page, EVENTS_PER_PAGE, 'dept-inventory')}
    </div>`;
}
function openAddDeptInventory(dept) {
  document.getElementById('modalTitle').textContent = 'Add Inventory Item';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid single">
      <div class="field"><label>Item Name</label><input id="dInvName" placeholder="Item name"></div>
      <div class="field"><label>Stock Quantity</label><input id="dInvQty" type="number" placeholder="10"></div>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:20px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddDeptInventory('${dept}')">Add</button>
    </div>`;
  openModal();
}
async function submitAddDeptInventory(dept) {
  const body = { name: v('dInvName'), dept, stock_qty: parseInt(v('dInvQty')) || 0 };
  if (!body.name) { showToast('Enter item name', 'error'); return; }
  await api('/api/inventory', 'POST', body); closeModal(); showToast('Item added', 'success'); renderDeptInventory(dept);
}

// ─── RETURNS ──────────────────────────────────────────────────────────────────
async function renderReturns(dept) {
  const events = await api('/api/events');
  // Logic Fix: Visible after allocation (dept_approved), regardless of event date
  const returnable = events.filter(e =>
    (e.status === 'approved' || e.status === 'principal_review' || e.status === 'dept_review') &&
    e.requested_items.some(i => i.dept === dept && i.dept_approved && !i.returned)
  );
  const returned = events.filter(e => e.requested_items.some(i => i.dept === dept && i.returned === true));

  const page = eventPageState['dept-returns'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const pagReturned = returned.slice(start, start + EVENTS_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Pending Equipment Returns</div><div class="section-sub">Collect and mark items as returned after event completion</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('returns-${dept}')">📄 Returns History Report</button>
        </div>
      </div>
      ${returnable.length === 0 ? emptyState('📦', 'All items returned', 'Excellent! No pending equipment returns for your department.') :
      `<div class="cards-grid">${returnable.map(e => {
        const myItems = e.requested_items.filter(i => i.dept === dept && i.dept_approved && !i.returned);
        return `
          <div class="event-card-return" style="background: linear-gradient(145deg, #ffffff, #f8fafc); border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div class="return-card-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
              <div class="return-title-box">
                <div class="return-event-title" style="font-size: 1rem; font-weight: 900; color: #1e293b;">${e.title}</div>
                <div class="return-event-date" style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-top: 2px;">📅 ${e.date}</div>
              </div>
              <div class="return-status-tag" style="background: #fff7ed; color: #c2410c; padding: 4px 10px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; border: 1px solid #fed7aa;">⚠️ PENDING</div>
            </div>
            
            <div class="return-items-box-premium" style="background: #f1f5f9; padding: 12px; border-radius: 10px; margin-bottom: 16px;">
              <div class="return-items-label-premium" style="font-size: 0.65rem; font-weight: 800; color: #475569; margin-bottom: 8px; letter-spacing: 0.05em;">ITEMS TO COLLECT:</div>
              <div class="return-items-list-premium">
                ${myItems.map(i => `
                  <div class="return-item-row-premium" style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                    <span class="item-name-premium">${i.item_name}</span>
                    <span class="item-qty-premium" style="color: #059669;">× ${i.allocated_qty}</span>
                  </div>`).join('')}
              </div>
            </div>

            <div class="return-card-footer" style="padding-top:12px; border-top: 1px dashed #cbd5e1; display:flex; flex-direction:column; gap:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div class="booker-info" style="display: flex; align-items: center; gap: 8px;">
                  <div class="booker-avatar" style="background:#dbeafe; color:#2563eb; width:32px; height:32px; font-size:0.8rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800;">${e.created_by_name.charAt(0)}</div>
                  <div style="display:flex; flex-direction:column;">
                      <div style="font-size:0.65rem; font-weight:700; color:#94a3b8; text-transform:uppercase;">Booked by</div>
                      <div style="font-size:0.85rem; font-weight:800; color:#1e293b;">${e.created_by_name}</div>
                  </div>
                </div>
              </div>
              
              <div style="display:flex; gap:8px; width:100%;">
                <button class="btn-return-custom" style="flex:1; padding: 8px; font-size: 0.75rem; font-weight: 800; border-radius: 8px; background: #fff; border: 1px solid #e2e8f0; cursor: pointer;" onclick="openCustomReturnModal('${e.id}','${dept}')">
                  ⚙️ Custom
                </button>
                <button class="btn-return-all" style="flex:1; padding: 8px; font-size: 0.75rem; font-weight: 800; border-radius: 8px; background: #16a34a; color: #fff; border: none; cursor: pointer;" onclick="processReturn('${e.id}','${dept}')">
                  ↩️ Return All
                </button>
              </div>
            </div>
          </div>`;
      }).join('')}`}
    </div>

    ${returned.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Recently Returned Histories</div></div>
      </div>
      <div class="history-cards-grid">
        ${pagReturned.map(e => {
        const myReturnedItems = e.requested_items.filter(i => i.dept === dept && i.returned);
        return `
            <div class="history-receipt-card">
              <div class="receipt-header">
                <div class="receipt-icon">📜</div>
                <div class="receipt-info">
                  <div class="receipt-event">${e.title}</div>
                  <div class="receipt-date">Returned on ${e.date}</div>
                </div>
              </div>
              <div class="receipt-body">
                ${myReturnedItems.map(i => `
                  <div class="receipt-item">
                    <span>${i.item_name}</span>
                    <span class="qty-tag">qty: ${i.returned_qty || i.allocated_qty}</span>
                  </div>
                `).join('')}
              </div>
              <div class="receipt-footer">
                <span class="status-success">✔️ FULLY RETURNED</span>
              </div>
            </div>`;
      }).join('')}
      </div>
      ${renderPaginationControls(returned.length, page, EVENTS_PER_PAGE, 'dept-returns')}
    </div>` : ''}`;
}

async function processReturn(eid, dept) {
  await api(`/api/events/${eid}/return`, 'POST', { dept });
  showToast('Items marked as returned ✅', 'success');
  renderReturns(dept);
}

async function openCustomReturnModal(eid, dept) {
  const e = await api('/api/events/' + eid);
  const myItems = e.requested_items.filter(i => i.dept === dept && i.dept_approved && !i.returned);

  document.getElementById('modalTitle').textContent = 'Custom Equipment Return';
  document.getElementById('modalBody').innerHTML = `
    <div class="info-box">Select items and quantities being returned for: <strong>${e.title}</strong></div>
    <div class="items-alloc-list">
      <table class="alloc-table">
        <thead><tr><th>Item</th><th>Allocated</th><th>Returned</th><th>Remaining</th><th>Return Now</th></tr></thead>
        <tbody>${myItems.map(i => {
    const rem = Math.max(0, (i.allocated_qty || 0) - (i.returned_qty || 0));
    return `<tr>
            <td style="font-weight:600">${i.item_name}</td>
            <td style="color:var(--muted)">${i.allocated_qty}</td>
            <td style="color:#16a34a;font-weight:700">${i.returned_qty || 0}</td>
            <td style="color:#b91c1c;font-weight:800">${rem}</td>
            <td><input class="alloc-input" id="ret_${i.item_id}" type="number" min="0" max="${rem}" value="${rem}" style="width:70px"></td>
          </tr>`;
  }).join('')}</tbody>
      </table>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:16px">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCustomReturn('${eid}','${dept}')">✅ Confirm Partial Return</button>
    </div>`;
  openModal();
}

async function submitCustomReturn(eid, dept) {
  const e = await api('/api/events/' + eid);
  const myItems = e.requested_items.filter(i => i.dept === dept && i.dept_approved && !i.returned);
  const returns = myItems.map(i => ({
    item_id: i.item_id,
    qty: parseInt(document.getElementById('ret_' + i.item_id)?.value || 0)
  })).filter(r => r.qty > 0);

  if (returns.length === 0) { showToast('Please enter return quantities', 'error'); return; }

  try {
    await api(`/api/events/${eid}/return`, 'POST', { dept, returns });
    closeModal();
    showToast('Custom return processed successfully', 'success');
    renderReturns(dept);
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

function renderProgressChart(e) {
  const status = e.status;

  // 5-step workflow: Booker → IT → Reception → Principal → Approved
  const stages = [
    { id: 'booked', label: 'Booker' },
    { id: 'it', label: 'IT' },
    { id: 'reception', label: 'Reception' },
    { id: 'principal', label: 'Principal' },
    { id: 'approved', label: 'Approved' }
  ];

  if (status === 'rejected') {
    return `<div style="color:#ef4444;font-weight:700;font-size:0.8rem;text-align:center;padding:12px;background:#fef2f2;border-radius:10px;border:1px solid #fee2e2;margin:10px 0">❌ Event Proposal Rejected by Principal</div>`;
  }
  if (status === 'cancelled') {
    return `<div style="color:#ef4444;font-weight:700;font-size:0.8rem;text-align:center;padding:12px;background:#fef2f2;border-radius:10px;border:1px solid #fee2e2;margin:10px 0">🚫 Event Cancelled</div>`;
  }

  // Determine which step is active based on status + IT/Reception sub-status
  let currentIdx = 0;
  if (status === 'dept_review') {
    const ri = e.requested_items || [];
    const itDone = ri.filter(i => i.dept === 'it').every(i => i.dept_approved || i.dept_rejected);
    currentIdx = itDone ? 2 : 1;  // IT done → Reception active; else IT active
  } else if (status === 'principal_review') {
    currentIdx = 3;
  } else if (status === 'approved') {
    currentIdx = 4;
  }

  return `
  <div class="status-timeline">
    ${stages.map((stage, idx) => {
    let cls = '';
    if (idx < currentIdx) cls = 'completed';
    else if (idx === currentIdx) cls = 'active';
    else cls = 'pending';
    return `
        <div class="status-step ${cls}">
          <div class="step-dot">${idx < currentIdx ? '✓' : idx + 1}</div>
          <div class="step-label">${stage.label}</div>
        </div>
      `;
  }).join('')}
  </div>`;
}

function renderMiniStepper(status) {
  if (status === 'rejected') return '';
  const steps = status === 'approved' ? 3 : (status === 'principal_review' ? 2 : (status === 'dept_review' ? 1 : 0));
  return `
    <div class="mini-stepper">
        <div class="mini-dot completed"></div>
        <div class="mini-line ${steps >= 1 ? 'completed' : ''}"></div>
        <div class="mini-dot ${steps >= 1 ? 'completed' : (steps === 0 ? 'active' : '')}"></div>
        <div class="mini-line ${steps >= 2 ? 'completed' : ''}"></div>
        <div class="mini-dot ${steps >= 2 ? 'completed' : (steps === 1 ? 'active' : '')}"></div>
        <div class="mini-line ${steps >= 3 ? 'completed' : ''}"></div>
        <div class="mini-dot ${steps >= 3 ? 'completed' : (steps === 2 ? 'active' : '')}"></div>
    </div>`;
}

// ─── EVENT CARD ────────────────────────────────────────────────────────────────


// ─── VIEW EVENT DETAIL ────────────────────────────────────────────────────────
async function viewEventDetail(eid) {
  const e = await api('/api/events/' + eid);
  const itItems = e.requested_items.filter(i => i.dept === 'it');
  const recItems = e.requested_items.filter(i => i.dept === 'reception');
  document.getElementById('modalTitle').textContent = e.title;
  document.getElementById('modalBody').innerHTML = `
    ${renderProgressChart(e)}
    <div class="detail-section">
      <h4>Event Info</h4>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${e.date}</span></div>
      <div class="detail-row"><span class="detail-label">Time Slot</span><span class="detail-value">${e.time_slot}</span></div>
      <div class="detail-row"><span class="detail-label">Hall</span><span class="detail-value">${e.hall_name}</span></div>
      <div class="detail-row"><span class="detail-label">Budget ID</span><span class="detail-value" style="color:var(--gold)">${e.budget_id || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${e.status.replace(/_/g, ' ').toUpperCase()}</span></div>
      ${e.coordinator ? `<div class="detail-row"><span class="detail-label">Coordinator</span><span class="detail-value">${e.coordinator}</span></div>` : ''}
      ${e.expected_count ? `<div class="detail-row"><span class="detail-label">Expected Attendance</span><span class="detail-value">${e.expected_count}</span></div>` : ''}
      ${e.description ? `<div class="detail-row"><span class="detail-label">Description</span><span class="detail-value" style="max-width:260px;text-align:right">${e.description}</span></div>` : ''}
    </div>
    ${(e.has_intro_video || e.has_dance) ? `
    <div class="detail-section">
      <h4>Special Requirements</h4>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${e.has_intro_video ? '<span class="req-tag">🎬 Intro Video</span>' : ''}
        ${e.has_dance ? '<span class="req-tag">💃 Dance Performance</span>' : ''}
      </div>
    </div>`: ''}
    ${itItems.length > 0 ? `<div class="detail-section"><h4>IT Items</h4>
      <table class="alloc-table"><thead><tr><th>Item</th><th>Requested</th><th>Allocated</th><th>Status</th></tr></thead>
      <tbody>${itItems.map(i => `<tr><td>${i.item_name}</td><td>${i.requested_qty}</td><td>${i.allocated_qty}</td>
        <td>${i.dept_approved ? '<span class="badge badge-approved">Done</span>' : '<span class="badge badge-pending">Pending</span>'}</td>
      </tr>`).join('')}</tbody></table></div>` : ''}
    ${recItems.length > 0 ? `<div class="detail-section"><h4>Reception Items</h4>
      <table class="alloc-table"><thead><tr><th>Item</th><th>Requested</th><th>Allocated</th><th>Status</th></tr></thead>
      <tbody>${recItems.map(i => `<tr><td>${i.item_name}</td><td>${i.requested_qty}</td><td>${i.allocated_qty}</td>
        <td>${i.dept_approved ? '<span class="badge badge-approved">Done</span>' : '<span class="badge badge-pending">Pending</span>'}</td>
      </tr>`).join('')}</tbody></table></div>` : ''}
    ${e.principal_note ? `<div class="detail-section"><h4>Principal's Note</h4>
      <div style="background:var(--bg);padding:12px;border-radius:9px;font-size:0.875rem;color:var(--text2);line-height:1.6">${e.principal_note}</div>
    </div>`: ''}
    <div class="modal-footer" style="padding:0;margin-top:4px">
      <button class="btn btn-report" onclick="downloadSingleEventReport('${eid}');closeModal()">📄 Download Report</button>
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>`;
  openModal();
}

// ─── ALLOC MODAL ──────────────────────────────────────────────────────────────
async function openAllocModal(eid, dept) {
  const e = await api('/api/events/' + eid);
  const myItems = e.requested_items.filter(i => i.dept === dept && !i.dept_approved);
  document.getElementById('modalTitle').textContent = `Allocate ${dept.toUpperCase()} Items`;
  document.getElementById('modalBody').innerHTML = `
    <div class="info-box">Allocating items for: <strong>${e.title}</strong> — ${e.date}</div>
    <div class="items-alloc-list">
      <table class="alloc-table">
        <thead><tr><th>Item</th><th>Requested</th><th>Available</th><th>Allocate</th></tr></thead>
        <tbody>${myItems.map(i => `<tr>
          <td style="font-weight:600">${i.item_name}</td>
          <td>${i.requested_qty}</td>
          <td id="avail_${i.item_id}">…</td>
          <td><input class="alloc-input" id="alloc_${i.item_id}" type="number" min="0" value="${i.requested_qty}"></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:16px">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAllocation('${eid}','${dept}')">✅ Confirm Allocation</button>
    </div>`;
  openModal();
  const inv = await api('/api/inventory?dept=' + dept);
  myItems.forEach(i => {
    const invItem = inv.find(x => x.id === i.item_id);
    const el = document.getElementById('avail_' + i.item_id);
    if (el) {
      if (invItem) el.innerHTML = `<strong style="color:var(--green)">${invItem.available_qty}</strong>`;
      else el.innerHTML = `<strong style="color:var(--red)">0 (Deleted)</strong>`;
    }
  });
}
async function submitAllocation(eid, dept) {
  const e = await api('/api/events/' + eid);
  const myItems = e.requested_items.filter(i => i.dept === dept && !i.dept_approved);
  const items = myItems.map(i => ({ item_id: i.item_id, allocated_qty: parseInt(document.getElementById('alloc_' + i.item_id)?.value || 0) }));
  try {
    await api(`/api/events/${eid}/dept-review`, 'POST', { items });
    closeModal(); showToast('Items allocated successfully', 'success');
    if (dept === 'it') renderDeptRequests('it'); else renderDeptRequests('reception');
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

// ─── PRINCIPAL MODAL ──────────────────────────────────────────────────────────
async function rejectClubItems(eid, role) {
  showConfirmModal('Deny Club Request', `Deny all ${role === 'pixesclub' ? 'Pixes Club' : 'Fine Arts Club'} items for this event?`, async () => {
    const e = await api('/api/events/' + eid);
    const items = e.requested_items.filter(i => i.dept === role).map(i => ({ item_id: i.item_id, allocated_qty: 0 }));
    await api(`/api/events/${eid}/dept-review`, 'POST', { items, reject: true });
    showToast('Club items denied ✓', 'success');
    renderClubRequests(role);
  });
}

async function openPrincipalModal(eid) {
  const e = await api('/api/events/' + eid);
  const itItems = e.requested_items.filter(i => i.dept === 'it');
  const recItems = e.requested_items.filter(i => i.dept === 'reception');
  document.getElementById('modalTitle').textContent = 'Final Review — ' + e.title;
  document.getElementById('modalBody').innerHTML = `
    <div class="budget-display">
      <div class="amount">${e.budget_id || '—'}</div>
      <div class="label">Proposed Event Budget ID</div>
    </div>
    <div class="detail-section">
      <h4>Event Details</h4>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${e.date}</span></div>
      <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${e.time_slot}</span></div>
      <div class="detail-row"><span class="detail-label">Hall</span><span class="detail-value">${e.hall_name}</span></div>
      <div class="detail-row"><span class="detail-label">Organizer</span><span class="detail-value">${e.created_by_name}</span></div>
    </div>
    ${(e.has_intro_video || e.has_dance) ? `<div style="margin-bottom:16px">
      ${e.has_intro_video ? '<span class="req-tag">🎬 Intro Video</span>' : ''}
      ${e.has_dance ? '<span class="req-tag">💃 Dance Performance</span>' : ''}
    </div>`: ''}
    ${[['IT', itItems], ['Reception', recItems]].filter(([, it]) => it.length > 0).map(([label, it]) => `
    <div class="detail-section"><h4>${label} Inventory Allocated</h4>
      <table class="alloc-table"><thead><tr><th>Item</th><th>Requested</th><th>Allocated</th></tr></thead>
      <tbody>${it.map(i => `<tr><td>${i.item_name}</td><td>${i.requested_qty}</td><td style="color:var(--green);font-weight:700">${i.allocated_qty}</td></tr>`).join('')}</tbody>
    </table></div>`).join('')}
    <div class="detail-section">
      <h4>Note / Remarks (optional)</h4>
      <textarea class="decision-note" id="principalNote" placeholder="Add remarks or feedback…"></textarea>
      <div style="display:flex;gap:12px">
        <button class="btn btn-success" style="flex:1" onclick="submitPrincipalDecision('${eid}','approved')">✅ Approve Event</button>
        <button class="btn btn-danger" style="flex:1" onclick="submitPrincipalDecision('${eid}','rejected')">❌ Reject Event</button>
      </div>
    </div>`;
  openModal();
}
async function submitPrincipalDecision(eid, decision) {
  const note = document.getElementById('principalNote')?.value || '';
  await api(`/api/events/${eid}/principal-review`, 'POST', { decision, note });
  closeModal();
  showToast(decision === 'approved' ? 'Event approved! 🎉' : 'Event rejected', 'decision' === 'approved' ? 'success' : 'error');
  renderPendingEvents();
}

async function cancelEvent(eid) {
  showConfirmModal('Cancel Proposal', 'Are you sure you want to cancel this event proposal?', async () => {
    await api(`/api/events/${eid}/cancel`, 'POST', { reason: 'User cancelled via dashboard' });
    showToast('Event cancelled', 'info');
    navigateTo(currentPage);
  });
}

async function adminApproveEvent(eid) {
  showConfirmModal('Quick Approve', 'Approve this event immediately without further reviews?', async () => {
    await api(`/api/events/${eid}/principal-review`, 'POST', { decision: 'approved', note: 'Approved by Admin via Quick Action' });
    showToast('Event approved', 'success');
    navigateTo(currentPage);
  });
}

async function adminDeleteEvent(eid) {
  showConfirmModal('Delete Event', 'Permanently delete this event? This action cannot be undone.', async () => {
    await api(`/api/events/${eid}`, 'DELETE');
    showToast('Event deleted', 'info');
    navigateTo(currentPage);
  });
}

async function openEditEventModal(eid) {
  const e = await api('/api/events/' + eid);
  const halls = await api('/api/halls');
  const availHalls = halls.filter(h => !h.locked || h.id === e.hall_id);

  document.getElementById('modalTitle').textContent = 'Edit Event Details';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid large-form">
      <div class="field" style="grid-column:1/-1">
        <label>Event Title</label>
        <input id="editTitle" value="${e.title.replace(/"/g, '&quot;')}">
      </div>
      <div class="field">
        <label>Date</label>
        <input id="editDate" type="date" value="${e.date}">
      </div>
      <div class="field">
        <label>Time Slot</label>
        <select id="editSlot">
          <option ${e.time_slot.includes('9:00 AM - 12') ? 'selected' : ''}>9:00 AM - 12:00 PM</option>
          <option ${e.time_slot.includes('12:00 PM - 3') ? 'selected' : ''}>12:00 PM - 3:00 PM</option>
          <option ${e.time_slot.includes('3:00 PM - 6') ? 'selected' : ''}>3:00 PM - 6:00 PM</option>
          <option ${e.time_slot.includes('Full Day') ? 'selected' : ''}>9:00 AM - 6:00 PM (Full Day)</option>
        </select>
      </div>
      <div class="field" style="grid-column:1/-1">
        <label>Hall</label>
        <select id="editHall">
          ${availHalls.map(h => `<option value="${h.id}" ${h.id === e.hall_id ? 'selected' : ''}>${h.name} (${h.capacity} seats)</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Expected Attendance</label>
        <input id="editCount" type="number" value="${e.expected_count}">
      </div>
      <div class="field">
        <label>Coordinator</label>
        <input id="editCoord" value="${e.coordinator.replace(/"/g, '&quot;')}">
      </div>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:20px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditEvent('${eid}')">Save Changes</button>
    </div>
  `;
  openModal();
}

async function submitEditEvent(eid) {
  const body = {
    title: v('editTitle'),
    date: v('editDate'),
    time_slot: v('editSlot'),
    hall_id: v('editHall'),
    expected_count: parseInt(v('editCount')) || 0,
    coordinator: v('editCoord')
  };
  if (!body.title || !body.date) { showToast('Title and Date are required', 'error'); return; }
  await api('/api/events/' + eid, 'PUT', body);
  closeModal();
  showToast('Event updated successfully', 'success');
  navigateTo(currentPage);
}

function getUpcomingEventsHtml(allEvents) {
  let upcoming = allEvents.filter(e => e.status === 'approved');
  if (currentUser.role === 'booker') {
    const myPending = allEvents.filter(e => e.status === 'dept_review' || e.status === 'principal_review');
    upcoming = [...upcoming, ...myPending].sort((a, b) => new Date(a.date) - new Date(b.date));
  } else {
    upcoming = upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  if (upcoming.length === 0) return '';

  return `
    <div class="section upcoming-gallery-section" style="margin-top:20px;">
      <div class="section-header">
        <div class="section-title">⭐ Featured Upcoming Events</div>
      </div>
      <div class="upcoming-gallery-grid">
        ${upcoming.map((e, idx) => renderUpcomingCard(e, idx, 'gallery')).join('')}
      </div>
    </div>
  `;
}

function renderUpcomingCard(e, idx, row) {
  const isMyPending = currentUser.role === 'booker' && (e.status === 'dept_review' || e.status === 'principal_review');
  const accentClass = row === 'row1' ? 'row-featured' : 'row-regular';

  return `
    <div class="upcoming-card-box ${accentClass}" onclick="viewEventDetail('${e.id}')" style="cursor:pointer; background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); border: 1.5px solid #bbf7d0; box-shadow: 0 10px 30px rgba(22, 163, 74, 0.08); padding:12px">
      <div class="card-corner-triangle" style="border-color: transparent #16a34a transparent transparent;"></div>
      <div class="upcoming-card-top" style="margin-bottom: 12px;">
        <div class="upcoming-card-title" style="font-size:0.95rem; line-height:1.2; font-weight:900; color:#064e3b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:60px">${e.title}</div>
        <div class="upcoming-card-status-pill" style="background:#16a34a; color:#fff; padding:3px 10px; font-size:0.65rem; border-radius:6px">
          Scheduled
        </div>
      </div>
      
      <div class="upcoming-card-meta-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px; background: rgba(22, 163, 74, 0.04); padding:10px; border-radius:12px; border:1px solid rgba(22, 163, 74, 0.08);">
        <div class="meta-item" style="display:flex; align-items:center; gap:8px">
          <span style="font-size:0.85rem">📅</span>
          <span style="font-size:0.75rem; font-weight:800; color:#064e3b">${e.date}</span>
        </div>
        <div class="meta-item" style="display:flex; align-items:center; gap:8px">
          <span style="font-size:0.85rem">⏰</span>
          <span style="font-size:0.75rem; font-weight:800; color:#064e3b">${e.time_slot.split(' ')[0]}</span>
        </div>
        <div class="meta-item" style="display:flex; align-items:center; gap:8px; grid-column: span 2; border-top: 1px solid rgba(22, 163, 74, 0.1); padding-top:4px">
          <span style="font-size:0.85rem">🏛️</span>
          <span style="font-size:0.75rem; font-weight:800; color:#064e3b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${e.hall_name}</span>
        </div>
      </div>

      <div class="upcoming-card-footer" style="border-top: 1px dashed #bbf7d0; padding-top: 10px;">
        <div class="organizer-info" style="display:flex; align-items:center; gap:8px">
          <div style="width:32px; height:32px; background:#16a34a; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; color:#fff; font-size:0.8rem">${e.created_by_name.charAt(0)}</div>
          <span style="font-size:0.75rem; font-weight:800; color:#064e3b">${e.created_by_name}</span>
        </div>
        <button class="btn btn-primary" style="background:#16a34a; border:none; padding:5px 12px; font-size:0.7rem; font-weight:800; border-radius:8px" onclick="event.stopPropagation();viewEventDetail('${e.id}')">View</button>
      </div>
    </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
async function renderReports() {
  const [events, inventory, stats] = await Promise.all([
    api('/api/events'), api('/api/inventory'), api('/api/stats')
  ]);
  const role = currentUser.role;

  const reportCards = getReportCards(role);
  document.getElementById('pageContent').innerHTML = `
    
    <div class="section">
      <div class="section-header">
        <div>
          <div class="section-title">📄 Reports & Exports</div>
          <div class="section-sub">Download phase-wise reports for your role</div>
        </div>
      </div>
      <div class="report-panel">
        <div class="report-panel-left">
          <div class="report-icon">📊</div>
          <div>
            <div class="report-panel-title">KPRCAS HMS Report Center</div>
            <div class="report-panel-sub">Custom filters for event name, department, and custom date range.</div>
          </div>
        </div>
        ${role !== 'booker' ? `
        <div class="report-filters-inline" style="background:rgba(255,255,255,0.5); padding:16px; border-radius:15px; display:flex; gap:12px; flex-wrap:wrap; border:1px solid var(--border); margin-bottom:12px;">
          <input type="text" id="repFilterName" placeholder="Event Name..." class="btn btn-outline btn-sm" style="flex:1; min-width:150px; text-align:left;">
          <input type="text" id="repFilterDept" placeholder="Department..." class="btn btn-outline btn-sm" style="flex:1; min-width:150px; text-align:left;">
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:0.75rem; font-weight:700">From:</span>
            <input type="date" id="repFilterStart" class="btn btn-outline btn-sm">
            <span style="font-size:0.75rem; font-weight:700">To:</span>
            <input type="date" id="repFilterEnd" class="btn btn-outline btn-sm">
          </div>
        </div>` : ''}
        <div class="report-buttons">
          <button class="btn btn-report" onclick="downloadReport('full-summary')">📋 Full Summary Report</button>
        </div>
      </div>

      <div class="cards-grid">
        ${reportCards.map(rc => `
          <div class="inv-card">
            <div class="inv-header">
              <div><div class="inv-name">${rc.icon} ${rc.title}</div><div style="font-size:0.78rem;color:var(--muted);margin-top:4px">${rc.desc}</div></div>
            </div>
            <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-report btn-sm" onclick="downloadReport('${rc.key}')">📥 Download</button>
              <button class="btn btn-outline btn-sm" onclick="previewReport('${rc.key}')">👁 Preview</button>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-header"><div class="section-title">Quick Stats</div></div>
      <div class="stats-row">
        <div class="stat-card sc-blue"><div class="stat-icon">📅</div><div class="stat-label">Total Events</div><div class="stat-value stat-accent">${stats.total_events}</div></div>
        <div class="stat-card sc-green"><div class="stat-icon">✅</div><div class="stat-label">Approved</div><div class="stat-value stat-green">${stats.approved}</div></div>
        <div class="stat-card sc-gold"><div class="stat-icon">⏳</div><div class="stat-label">Pending</div><div class="stat-value stat-gold">${stats.pending}</div></div>
        <div class="stat-card sc-red"><div class="stat-icon">❌</div><div class="stat-label">Rejected</div><div class="stat-value stat-red">${stats.rejected}</div></div>
      </div>
    </div>`;
}
function getReportCards(role) {
  const all = [
    { key: 'all-events', icon: '📅', title: 'Events Report', desc: 'All events with status, hall, date and organizer details' },
    { key: 'approved', icon: '✅', title: 'Approved Events', desc: 'All approved/scheduled events with full inventory allocation' },
    { key: 'pending', icon: '⏳', title: 'Pending Events', desc: 'Events still awaiting department or principal review' },
    { key: 'inventory', icon: '📦', title: 'Inventory Status', desc: 'Full inventory stock levels, in-use and available quantities' },
    { key: 'inventory-it', icon: '🖥️', title: 'IT Inventory', desc: 'IT department inventory with usage and availability' },
    { key: 'inventory-reception', icon: '🛎️', title: 'Reception Inventory', desc: 'Reception inventory items and current stock status' },
    { key: 'dept-it', icon: '🖥️', title: 'IT Dept Activity', desc: 'IT allocation history and pending requests' },
    { key: 'dept-reception', icon: '🛎️', title: 'Reception Dept Activity', desc: 'Reception allocation history and pending requests' },
    { key: 'returns-it', icon: '↩️', title: 'IT Returns Report', desc: 'IT items returned and pending return status' },
    { key: 'returns-reception', icon: '↩️', title: 'Reception Returns', desc: 'Reception items returned and pending status' },
    { key: 'principal', icon: '👤', title: 'Principal Decisions', desc: 'All principal approval/rejection decisions with notes' },
  ];
  const byRole = {
    admin: all,
    booker: [all[0], all[1], all[2]],
    it: [all[0], all[3], all[4], all[8], all[10]],
    reception: [all[0], all[3], all[5], all[9], all[11]],
    principal: [all[0], all[1], all[2], all[12]],
  };
  return byRole[role] || [all[0]];
}

// ─── REPORT GENERATION ────────────────────────────────────────────────────────
async function getReportData(type) {
  try {
    const filters = {
      name: v('repFilterName')?.toLowerCase() || '',
      dept: v('repFilterDept')?.toLowerCase() || '',
      start: v('repFilterStart') || '',
      end: v('repFilterEnd') || ''
    };

    const [events, inventory, users, halls, stats] = await Promise.all([
      api('/api/events'), api('/api/inventory'),
      currentUser.role === 'admin' ? api('/api/users') : Promise.resolve([]),
      api('/api/halls'), api('/api/stats')
    ]);

    let filteredEvents = [...events];
    if (filters.name) filteredEvents = filteredEvents.filter(e => e.title.toLowerCase().includes(filters.name));
    if (filters.dept) filteredEvents = filteredEvents.filter(e => e.departments.some(d => d.school.toLowerCase().includes(filters.dept)));
    if (filters.start) filteredEvents = filteredEvents.filter(e => e.date >= filters.start);
    if (filters.end) filteredEvents = filteredEvents.filter(e => e.date <= filters.end);

    return buildReportHTML(type, { events: filteredEvents, inventory, users, halls, stats });
  } catch (e) {
    showToast('Error generating report: ' + e.message, 'error');
    return null;
  }
}

async function previewReport(type) {
  const overlay = document.getElementById('modalOverlay');
  const modal = document.getElementById('mainModal');
  const body = document.getElementById('modalBody');
  const title = document.getElementById('modalTitle');

  // 1. Immediate Feedback
  title.textContent = 'Institutional Record Preview';
  body.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:120px; text-align:center; gap:24px">
      <div class="spinner" style="width:50px; height:50px; border-top-color:#2563eb"></div>
      <div style="font-weight:900; color:#1e293b; letter-spacing:0.12em; text-transform:uppercase; font-size:0.8rem">Preparing Institutional Record...</div>
    </div>`;

  overlay.classList.add('show');
  modal.classList.add('show');

  try {
    // 2. Load Data with Failure Protection
    const data = await getReportData(type);
    if (!data) throw new Error('No data returned from generator');

    title.textContent = data.title;
    body.innerHTML = `
      <div class="report-preview-container">
        ${reportStyles()}
        <div class="report-frame-premium">
          ${data.body}
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Report Generation Error:', err);
    body.innerHTML = `
      <div style="padding:60px; text-align:center">
        <div style="font-size:3rem; margin-bottom:20px">⚠️</div>
        <h3 style="font-weight:800; color:#0f172a; margin-bottom:12px">Generation Interrupted</h3>
        <p style="color:#64748b; font-size:0.9rem; margin-bottom:24px">${err.message || 'System timeout during institutional record processing.'}</p>
        <button class="btn btn-primary" onclick="closeModal()">Close & Try Again</button>
      </div>`;
  }
}

async function downloadReport(type) {
  showToast('Preparing download...', 'info');
  const data = await getReportData(type);
  if (data) openReportWindow(data.html, type);
}


async function downloadSingleEventReport(eid) {
  showToast('Generating event report…', 'info');
  const e = await api('/api/events/' + eid);
  const html = buildSingleEventReportHTML(e);
  openReportWindow(html, 'event-' + e.title);
}

function openReportWindow(html, name) {
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) { showToast('Please allow popups to view reports', 'error'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  showToast('Report opened — use Ctrl+P to save as PDF', 'success');
}

function reportStyles() {
  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
      .report-preview-container * { box-sizing:border-box; margin:0; padding:0; }
      .report-preview-container { 
        font-family:'Plus Jakarta Sans', sans-serif; 
        background:#f8fafc; color:#000000; 
        padding:60px 20px;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
      }
      .report-page-wrapper {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        padding: 15mm; /* Balanced institutional margins */
        min-height: 297mm;
        width: 210mm;
        margin: 0 auto;
        border-radius: 4px;
        position: relative;
        box-shadow: 0 40px 100px rgba(0,0,0,0.1);
      }
      @page { size: A4; margin: 0; }
      
      .rpt-header-premium {
        display: flex; align-items: flex-start; gap: 20px;
        padding-bottom: 30px; margin-bottom: 40px;
        border-bottom: 2px solid #000000;
        text-align: left;
      }
      .logo-box-premium {
        width: 80px; height: 80px;
        display: flex; align-items: center; justify-content: center;
      }
      .logo-box-premium img { max-width: 100%; max-height: 100%; object-fit: contain; }
      
      .inst-brand-box { flex: 1; text-align: left; }
      .inst-title { 
        font-size: 16px !important; font-weight: 900; 
        background: linear-gradient(to right, #2563eb, #10b981, #1e293b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 2px;
        text-transform: uppercase;
      }
      .inst-addr { font-size: 0.85rem; font-weight: 800; color: #000000; line-height: 1.4; max-width: 400px; }
      
      .rpt-record-box { text-align: right; padding-top: 5px; }
      .record-lbl { font-size: 0.75rem; font-weight: 800; color: #b91c1c; opacity: 0.6; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
      .record-ts { font-size: 1.2rem; font-weight: 900; color: #0f172a; line-height: 1.25; }
      .record-gen { margin-top: 15px; font-size: 0.65rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }

      .rpt-section-title {
        display: flex; flex-direction: column; align-items: center; justify-content: center; 
        text-align: center; margin-bottom: 50px; width: 100%;
      }
      .title-bar { display: none; }
      .title-text { 
        font-size: 2.2rem; font-weight: 900; color: #0f172a; 
        text-transform: uppercase; letter-spacing: 0.05em; 
        border-bottom: 4px solid #b91c1c; padding-bottom: 10px;
      }

      h2 { font-size: 1.6rem; font-weight: 900; color: #0f172a; margin: 50px 0 20px; display: flex; align-items: center; gap: 12px; }
      h2::before { content: ''; width: 6px; height: 24px; background: #3b82f6; border-radius: 3px; }

      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
      .stat-card { padding: 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; border-bottom: 4px solid #64748b; background: #f8fafc; }
      .stat-card.approved { background: #f0fdf4; border-color: #dcfce7; border-bottom-color: #16a34a; }
      .stat-card.pending  { background: #fffbeb; border-color: #fef3c7; border-bottom-color: #d97706; }
      .stat-card.rejected { background: #fef2f2; border-color: #fee2e2; border-bottom-color: #dc2626; }
      .stat-lbl { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
      .stat-val { font-size: 2.8rem; font-weight: 900; color: #0f172a; }

      .report-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; }
      .report-table th { background: #f8fafc; color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; white-space: normal; vertical-align: top; line-height: 1.2; }
      .report-table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 0.85rem; vertical-align: middle; }
      .report-table tr:nth-child(even) td { background: #fbfcfe; }
      
      .badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; }
      .b-approved { color: #16a34a; background: #dcfce7; }
      .b-rejected { color: #dc2626; background: #fee2e2; }
      .b-pending  { color: #d97706; background: #fef3c7; }
      .b-it       { color: #2563eb; background: #dbeafe; }
      .b-reception { color: #7c3aed; background: #ede9fe; }

      .print-btn { 
        position: fixed; top: 20px; right: 20px; background: #1e293b; color: #fff; border: none; 
        padding: 12px 28px; border-radius: 12px; font-size: 0.9rem; font-weight: 800; cursor: pointer;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15); z-index: 9999;
      }
      @media print { .print-btn { display: none; } body { padding: 0mm; } }
    </style>`;
}

function reportHeader(title, subtitle) {
  const logoUrl = 'https://image2url.com/r2/default/images/1774243478274-c1b09675-5ce9-40cd-a741-5d1a37595866.jpeg';
  return `
    <button class="print-btn" onclick="window.print()">🖨️ Print Document</button>
    <div class="report-page-wrapper">
    <div class="rpt-header-premium">
      <div class="logo-box-premium">
        <img src="${logoUrl}" alt="KPRCAS Logo">
      </div>
      <div class="inst-brand-box">
        <div class="inst-title">KPRCAS HMS</div>
        <div class="inst-addr">KPR COLLEGE OF ARTS SCIENCE AND RESEARCH</div>
        <div class="inst-loc" style="font-size:12px; font-weight:700; color:#000; margin-top:2px">ARASUR, COIMBATORE</div>
      </div>
    </div>
    
    <div class="rpt-section-title">
      <div class="title-text">${title}</div>
    </div>`;
}

function reportFooter() {
  return `</div><div class="footer">KPRCAS — Institutional Management Record</div>`;
}

function statusBadgeHTML(status) {
  const m = {
    approved: '<span class="badge b-approved">✅ Approved</span>',
    rejected: '<span class="badge b-rejected">❌ Rejected</span>',
    dept_review: '<span class="badge b-pending">⏳ Dept Review</span>',
    principal_review: '<span class="badge b-principal">👤 Principal Review</span>',
  };
  return m[status] || status;
}

function buildReportHTML(type, { events, inventory, users, halls, stats }) {
  const now = new Date();
  let body = '';
  const logoUrl = 'https://image2url.com/r2/default/images/1774243478274-c1b09675-5ce9-40cd-a741-5d1a37595866.jpeg';
  // Filter events by type
  const filtered = {
    'all-events': events,
    'approved': events.filter(e => e.status === 'approved'),
    'pending': events.filter(e => e.status !== 'approved' && e.status !== 'rejected'),
    'rejected': events.filter(e => e.status === 'rejected'),
    'my-events': events,
    'full-summary': events,
    'principal': events.filter(e => e.principal_decision),
    'dept-it': events.filter(e => e.requested_items.some(i => i.dept === 'it' && i.dept_approved)),
    'dept-reception': events.filter(e => e.requested_items.some(i => i.dept === 'reception' && i.dept_approved)),
    'returns-it': events.filter(e => e.status === 'approved' && e.requested_items.some(i => i.dept === 'it' && i.returned_qty > 0)),
    'returns-reception': events.filter(e => e.status === 'approved' && e.requested_items.some(i => i.dept === 'reception' && i.returned_qty > 0)),
  };

  const reportTitles = {
    'all-events': 'Comprehensive Events Report', 'approved': 'Finalized Scheduled Events', 'pending': 'Events Awaiting Authorization',
    'inventory': 'Institutional Inventory Registry', 'inventory-it': 'IT Equipment Asset Report',
    'inventory-reception': 'Reception Asset Registry', 'users': 'System Identity Directory', 'halls': 'Institutional Venue Catalog',
    'dept-it': 'IT Directorate Operations Log', 'dept-reception': 'Reception Directorate Operations Log',
    'returns-it': 'Equipment Recovery Report (IT)', 'returns-reception': 'Equipment Recovery Report (Reception)',
    'principal': 'Administrative Decision Log', 'my-events': 'Personal Booking History', 'full-summary': 'Global Institutional Summary',
  };
  const title = reportTitles[type] || 'KPRCAS HMS Report';

  // SUMMARY STATS BLOCK
  if (['all-events', 'approved', 'pending', 'full-summary', 'principal', 'my-events'].includes(type)) {
    const evSet = filtered[type] || events;
    body += `<div class="report-stats-grid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:15px; margin-bottom:50px">
      <div class="stat-card" style="background:#f8fafc; border:2px solid #e2e8f0; border-radius:20px; padding:24px; text-align:left; box-shadow: 0 4px 15px rgba(0,0,0,0.02)">
        <div style="font-size:0.7rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:8px">Total Records</div>
        <div style="font-size:2.8rem; font-weight:900; color:#0f172a">${evSet.length}</div>
      </div>
      <div class="stat-card approved" style="background:#f0fdf4; border:2px solid #bbf7d0; border-radius:20px; padding:24px; text-align:left; box-shadow: 0 4px 15px rgba(0,0,0,0.02)">
        <div style="font-size:0.7rem; font-weight:800; color:#16a34a; text-transform:uppercase; margin-bottom:8px">Approved</div>
        <div style="font-size:2.8rem; font-weight:900; color:#0f172a">${evSet.filter(e => e.status === 'approved').length}</div>
      </div>
      <div class="stat-card pending" style="background:#fffbeb; border:2px solid #fef3c7; border-radius:20px; padding:24px; text-align:left; box-shadow: 0 4px 15px rgba(0,0,0,0.02)">
        <div style="font-size:0.7rem; font-weight:800; color:#d97706; text-transform:uppercase; margin-bottom:8px">Pending</div>
        <div style="font-size:2.8rem; font-weight:900; color:#0f172a">${evSet.filter(e => e.status !== 'approved' && e.status !== 'rejected').length}</div>
      </div>
      <div class="stat-card rejected" style="background:#fef2f2; border:2px solid #fecaca; border-radius:20px; padding:24px; text-align:left; box-shadow: 0 4px 15px rgba(0,0,0,0.02)">
        <div style="font-size:0.7rem; font-weight:800; color:#dc2626; text-transform:uppercase; margin-bottom:8px">Rejected</div>
        <div style="font-size:2.8rem; font-weight:900; color:#0f172a">${evSet.filter(e => e.status === 'rejected').length}</div>
      </div>
    </div>`;
  }

  // EVENTS TABLE
  if (['all-events', 'approved', 'pending', 'my-events', 'full-summary', 'dept-it', 'dept-reception'].includes(type)) {
    const evSet = filtered[type] || events;
    body += `<h2>Events Registry (${evSet.length})</h2>
    <table class="report-table"><thead><tr><th>Event Title</th><th>Date & Schedule</th><th>Venue</th><th>Budget/ID</th><th>Staff Coordinator</th><th>Status</th></tr></thead>
      <tbody>${evSet.map(e => `<tr>
        <td style="font-weight:900; color:#0f172a; font-size:1.1rem">${e.title}</td>
        <td><div style="font-weight:700; color:#1e293b">${e.date}</div><div style="font-size:0.75rem; color:#64748b; font-family:'JetBrains Mono'">${e.time_slot}</div></td>
        <td style="font-weight:800; color:#3b82f6">${e.hall_name}</td>
        <td><span style="background:#f1f5f9; padding:4px 10px; border-radius:8px; font-weight:700; color:#475569; font-size:0.85rem">${e.budget_id || 'N/A'}</span></td>
        <td style="font-weight:700; color:#334155">${e.created_by_name}</td>
        <td>${statusBadgeHTML(e.status)}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  // PRINCIPAL DECISIONS
  if (type === 'principal') {
    const decided = events.filter(e => e.principal_decision);
    body += `<h2>Principal Decisions Log (${decided.length})</h2>
    <table class="report-table"><thead><tr><th>Event Title</th><th>Decision Date</th><th>Institutional Verdict</th><th>Administrative Note</th></tr></thead>
    <tbody>${decided.map(e => `<tr>
      <td style="font-weight:800; color:#0f172a">${e.title}</td><td>${e.date}</td>
      <td>${e.principal_decision === 'approved' ? '<span class="badge b-approved">Institutional Approval</span>' : '<span class="badge b-rejected">Administrative Rejection</span>'}</td>
      <td style="color:#64748b; font-style:italic; font-weight:600">${e.principal_note || 'No notes provided'}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  // INVENTORY
  if (['inventory', 'inventory-it', 'inventory-reception', 'full-summary'].includes(type)) {
    const inv = type === 'inventory-it' ? inventory.filter(i => i.dept === 'it') :
      type === 'inventory-reception' ? inventory.filter(i => i.dept === 'reception') : inventory;
    body += `<h2>Institutional Asset Registry (${inv.length} items)</h2>
    <table class="report-table"><thead><tr><th>Asset Name</th><th>Asset Category</th><th>Total Capacity</th><th>Active Usage</th><th>Net Available</th></tr></thead>
    <tbody>${inv.map(i => `<tr>
      <td style="font-weight:800; color:#0f172a">${i.name}</td>
      <td><span class="badge b-${i.dept}">${i.dept.toUpperCase()}</span></td>
      <td style="font-weight:700">${i.stock_qty}</td>
      <td style="color:#b45309; font-weight:800">${i.in_use}</td>
      <td style="color:#059669; font-weight:800">${i.available_qty}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  // DEPT ALLOCATIONS
  if (['dept-it', 'dept-reception', 'returns-it', 'returns-reception'].includes(type)) {
    const dept = type.includes('it') ? 'it' : 'reception';
    const deptEvents = events.filter(e => e.requested_items.some(i => i.dept === dept && i.dept_approved));
    body += `<h2>Unit Allocation Intelligence</h2>
    <table class="report-table"><thead><tr><th>Event</th><th>Date</th><th>Allocated Asset</th><th>Req Qty</th><th>Alloc Qty</th><th>Returned</th><th>Status</th></tr></thead>
    <tbody>${deptEvents.flatMap(e => e.requested_items.filter(i => i.dept === dept && i.dept_approved).map(i => `<tr>
      <td style="font-weight:800; color:#0f172a">${e.title}</td><td>${e.date}</td>
      <td style="font-weight:700; color:#3b82f6">${i.item_name}</td><td>${i.requested_qty}</td>
      <td style="color:#059669; font-weight:800">${i.allocated_qty}</td>
      <td style="color:#7c3aed; font-weight:800">${i.returned_qty || 0}</td>
      <td>${(i.returned_qty || 0) >= (i.allocated_qty || 0) ? '<span class="badge b-approved">Fully Recovered</span>' : (i.returned_qty > 0 ? '<span class="badge b-it">Partial Recovery</span>' : '<span class="badge b-pending">Awaiting Return</span>')}</td>
    </tr>`)).join('')}</tbody></table>`;
  }

  // USERS
  if ((type === 'users' || type === 'full-summary') && users.length > 0) {
    const roleB = { admin: 'b-pending', booker: 'b-approved', it: 'b-it', reception: 'b-reception', principal: 'b-principal' };
    body += `<h2>Institutional Identity Hub (${users.length})</h2>
    <table class="report-table"><thead><tr><th>Full Name</th><th>Auth Identifier</th><th>System Privilege</th></tr></thead>
    <tbody>${users.map(u => `<tr>
      <td style="font-weight:800; color:#0f172a">${u.name}</td>
      <td style="font-family:'JetBrains Mono'; font-weight:600">${u.username}</td>
      <td><span class="badge ${roleB[u.role] || ''}">${u.role.toUpperCase()}</span></td>
    </tr>`).join('')}</tbody></table>`;
  }

  // HALLS
  if (type === 'halls' || type === 'full-summary') {
    body += `<h2>Venue Catalogue Analysis (${halls.length})</h2>
    <table class="report-table"><thead><tr><th>Venue Title</th><th>Category</th><th>Occupancy</th><th>Portal Status</th></tr></thead>
    <tbody>${halls.map(h => `<tr>
      <td style="font-weight:800; color:#0f172a">${h.name}</td><td>${h.type.toUpperCase()}</td><td style="font-weight:700">${h.capacity}</td>
      <td>${h.locked ? '<span class="badge b-rejected">Locked</span>' : '<span class="badge b-approved">Operational</span>'}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} — KPRCAS HMS</title>${reportStyles()}</head>
  <body>${reportHeader(title, 'Phase Report')}<div id="content">${body}</div>${reportFooter()}</body></html>`;

  return { html, body: reportHeader(title, 'Phase Report') + `<div id="content">${body}</div>` + reportFooter(), title };
}

function buildSingleEventReportHTML(e) {
  const itItems = e.requested_items.filter(i => i.dept === 'it');
  const recItems = e.requested_items.filter(i => i.dept === 'reception');
  const body = `
    <h2>📅 Professional Event Specification</h2>
    <div class="professional-grid">
      <div class="grid-item"><span class="lbl">Primary Title</span><span class="val" style="font-weight:900;color:#0f172a;font-size:1.1rem">${e.title}</span></div>
      <div class="grid-item"><span class="lbl">Scheduled Date</span><span class="val" style="font-weight:800">${e.date}</span></div>
      <div class="grid-item"><span class="lbl">Temporal Horizon</span><span class="val" style="font-weight:700; color:#3b82f6">${e.time_slot}</span></div>
      <div class="grid-item"><span class="lbl">Institutional Venue</span><span class="val" style="font-weight:800; color:#b91c1c">${e.hall_name}</span></div>
      <div class="grid-item"><span class="lbl">Fiscal Identifier</span><span class="val" style="color:#d97706; font-weight:700">${e.budget_id || 'NOT_SPECIFIED'}</span></div>
      <div class="grid-item"><span class="lbl">Lead Coordinator</span><span class="val" style="font-weight:700">${e.created_by_name}</span></div>
      <div class="grid-item" style="grid-column:1/-1"><span class="lbl">Status Directive</span><span class="val">${statusBadgeHTML(e.status)}</span></div>
      ${e.description ? `<div class="grid-item" style="grid-column:1/-1"><span class="lbl">Abstract / Description</span><span class="val" style="font-style:italic; border-left:3px solid #e2e8f0; padding-left:12px; margin-top:8px">${e.description}</span></div>` : ''}
    </div>
    ${(e.has_intro_video || e.has_dance) ? `
    <h2>✨ Special Requirements</h2>
    <div class="section-box">
      ${e.has_intro_video ? '<div class="row"><span>🎬 Intro Video Required</span><span class="badge b-approved">Yes</span></div>' : ''}
      ${e.has_dance ? '<div class="row"><span>💃 Dance Performance</span><span class="badge b-approved">Yes</span></div>' : ''}
    </div>`: ''}
    ${itItems.length > 0 ? `
    <h2>Institutional IT Allocation</h2>
    <table class="report-table"><thead><tr><th>Asset Name</th><th>Req Qty</th><th>Allocated</th><th>Verdict</th></tr></thead>
    <tbody>${itItems.map(i => `<tr><td style="font-weight:800; color:#0f172a">${i.item_name}</td><td style="font-weight:700">${i.requested_qty}</td>
      <td style="color:#059669; font-weight:800">${i.allocated_qty}</td>
      <td>${i.dept_approved ? '<span class="badge b-approved">Allocated</span>' : '<span class="badge b-pending">Awaiting Review</span>'}</td>
    </tr>`).join('')}</tbody></table>` : ''}
    ${recItems.length > 0 ? `
    <h2>Institutional Reception Allocation</h2>
    <table class="report-table"><thead><tr><th>Asset Name</th><th>Req Qty</th><th>Allocated</th><th>Verdict</th></tr></thead>
    <tbody>${recItems.map(i => `<tr><td style="font-weight:800; color:#0f172a">${i.item_name}</td><td style="font-weight:700">${i.requested_qty}</td>
      <td style="color:#059669; font-weight:800">${i.allocated_qty}</td>
      <td>${i.dept_approved ? '<span class="badge b-approved">Allocated</span>' : '<span class="badge b-pending">Awaiting Review</span>'}</td>
    </tr>`).join('')}</tbody></table>` : ''}
    ${e.principal_decision ? `
    <h2>Administrative Verdict</h2>
    <div class="section-box">
      <div class="row"><span class="lbl">Decision Status</span><span class="val">${statusBadgeHTML(e.principal_decision)}</span></div>
      ${e.principal_note ? `<div class="row"><span class="lbl">Executive Note</span><span class="val" style="font-style:italic">${e.principal_note}</span></div>` : ''}
    </div>`: ''}`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Event Report: ${e.title} — KPRCAS HMS</title>${reportStyles()}</head>
  <body>${reportHeader('Event Report: ' + e.title, 'Individual Event Phase Report')}${body}${reportFooter()}</body></html>`;
}


// ─── PORTAL LOCKED ────────────────────────────────────────────────────────────
function showPortalLocked() {
  document.getElementById('pageContent').style.display = 'none';
  document.getElementById('portalLockedScreen').style.display = 'flex';
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}
function v(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function openModal() { document.getElementById('modalOverlay').classList.add('show'); document.getElementById('mainModal').classList.add('show'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); document.getElementById('mainModal').classList.remove('show'); }
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mw = document.querySelector('.main-wrap');
  const btn = document.getElementById('menuToggleBtn');
  const ov = document.getElementById('sidebarOverlay');

  if (!sb) return;
  const isExpanded = sb.classList.toggle('expanded');

  if (window.innerWidth <= 768) {
    if (ov) {
      ov.classList.toggle('show', isExpanded);
      document.body.style.overflow = isExpanded ? 'hidden' : '';
    }
    if (btn) btn.innerHTML = isExpanded ? '✕' : '☰';
  } else {
    if (mw) {
      if (!isExpanded) {
        mw.classList.add('sidebar-collapsed');
        mw.classList.remove('sidebar-expanded');
        if (btn) btn.innerHTML = '☰';
      } else {
        mw.classList.remove('sidebar-collapsed');
        mw.classList.add('sidebar-expanded');
        if (btn) btn.innerHTML = '✕';
      }
    }
  }
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const btn = document.getElementById('menuToggleBtn');
  if (sb) sb.classList.remove('expanded');
  if (ov) {
    ov.classList.remove('show');
    document.body.style.overflow = '';
  }
  if (btn) btn.innerHTML = '☰';
}
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `${icons[type] || 'ℹ️'} ${msg}`;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}
// ─── EVENT FILTER BAR ────────────────────────────────────────────────────────
function eventFilterBar(gridId, role, allEvents) {
  const statuses = ['all', ...new Set(allEvents.map(e => e.status))];

  // Use the full hierarchy for the filter dropdown if available, otherwise fallback to existing event depts
  let depts = [];
  if (window._hierarchy) {
    Object.values(window._hierarchy).forEach(schoolDepts => {
      schoolDepts.forEach(d => { if (!depts.includes(d)) depts.push(d); });
    });
  } else {
    allEvents.forEach(e => {
      if (e.departments) e.departments.forEach(d => { if (!depts.includes(d.school)) depts.push(d.school); });
    });
  }
  depts.sort();

  const deptFilterHtml = (role === 'admin' || role === 'principal') ? `
    <select class="filter-sort" id="dept_filter_${gridId}" onchange="filterEvents('${gridId}','${role}')" style="min-width:160px; border-radius:12px; border:1px solid var(--border)">
      <option value="all">🏢 All Departments</option>
      ${depts.map(d => `<option value="${d}">${d.toUpperCase()}</option>`).join('')}
    </select>` : '';

  return `
  <div class="filter-bar">
    <div class="filter-search-wrap">
      <span class="filter-search-icon">🔍</span>
      <input class="filter-search" placeholder="Search events..." oninput="filterEvents('${gridId}','${role}')" id="search_${gridId}">
    </div>
    <div class="filter-chips">
      <button class="filter-chip active" onclick="setStatusFilter('${gridId}','${role}','all',this)">All</button>
      ${allEvents.some(e => e.status === 'approved') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','approved',this)"><span>✅</span> Approved</button>` : ''}
      ${allEvents.some(e => e.status === 'dept_review') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','dept_review',this)"><span>🔎</span> Dept Review</button>` : ''}
      ${allEvents.some(e => e.status === 'principal_review') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','principal_review',this)"><span>⏳</span> Pending</button>` : ''}
      ${allEvents.some(e => e.status === 'rejected') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','rejected',this)"><span>❌</span> Rejected</button>` : ''}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${deptFilterHtml}
      <select class="filter-sort" onchange="sortEvents('${gridId}','${role}');" id="sort_${gridId}">
        <option value="date-asc">📅 Date: Earliest first</option>
        <option value="date-desc">📅 Date: Latest first</option>
        <option value="title">📋 Title A–Z</option>
        <option value="dept-asc">🏛️ Department A–Z</option>
      </select>
    </div>
  </div>`;
}

let _evCache = {}; // gridId → events array
function initEventCache(gridId, role, events) {
  _evCache[gridId] = { events, role };
}

function filterEvents(gridId, role) {
  const query = (document.getElementById('search_' + gridId)?.value || '').toLowerCase();
  const activeChip = document.querySelector(`.filter-chip.active[onclick*="${gridId}"]`);
  const statusFilter = activeChip?.dataset?.status || 'all';
  applyEventFilter(gridId, role, query, statusFilter);
}

function setStatusFilter(gridId, role, status, btn) {
  // Update active chip
  btn.closest('.filter-chips').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  btn.dataset.status = status;
  const query = (document.getElementById('search_' + gridId)?.value || '').toLowerCase();
  applyEventFilter(gridId, role, query, status);
}

function sortEvents(gridId, role) {
  const query = (document.getElementById('search_' + gridId)?.value || '').toLowerCase();
  const activeChip = document.querySelector(`.filter-chip.active[onclick*="${gridId}"]`);
  const statusFilter = activeChip?.dataset?.status || 'all';
  applyEventFilter(gridId, role, query, statusFilter);
}

function applyEventFilter(gridId, role, query, statusFilter) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const sortVal = document.getElementById('sort_' + gridId)?.value || 'date-asc';
  const deptFilter = document.getElementById('dept_filter_' + gridId)?.value || 'all';
  const cards = Array.from(grid.querySelectorAll('.event-card, .event-manage-card'));
  let visible = 0;
  cards.forEach(card => {
    const title = (card.querySelector('.event-title, .em-title')?.textContent || '').toLowerCase();
    const meta = (card.querySelector('.event-meta, .em-meta')?.textContent || '').toLowerCase();
    const schoolTags = Array.from(card.querySelectorAll('.em-school')).map(s => s.textContent.replace('🏛️', '').trim().toLowerCase());
    const status = card.className.match(/status-(\S+)/)?.[1] || '';

    const matchQ = !query || title.includes(query) || meta.includes(query);
    const matchS = statusFilter === 'all' || status === statusFilter;
    const matchD = deptFilter === 'all' || schoolTags.some(t => t.includes(deptFilter.toLowerCase()));

    card.style.display = (matchQ && matchS && matchD) ? '' : 'none';
    if (matchQ && matchS && matchD) visible++;
  });
  // Sort visible cards
  const visibleCards = cards.filter(c => c.style.display !== 'none');
  visibleCards.sort((a, b) => {
    const da = a.querySelector('.event-meta-item, .em-meta-item')?.textContent?.trim() || '';
    const db = b.querySelector('.event-meta-item, .em-meta-item')?.textContent?.trim() || '';
    const ta = a.querySelector('.event-title, .em-title')?.textContent || '';
    const tb = b.querySelector('.event-title, .em-title')?.textContent || '';
    const dpa = (a.querySelector('.em-school') && a.querySelector('.em-school').textContent) || '';
    const dpb = (b.querySelector('.em-school') && b.querySelector('.em-school').textContent) || '';
    if (sortVal === 'date-asc') return da.localeCompare(db);
    if (sortVal === 'date-desc') return db.localeCompare(da);
    if (sortVal === 'dept-asc') {
      const depCmp = dpa.localeCompare(dpb);
      return depCmp !== 0 ? depCmp : da.localeCompare(db);
    }
    if (sortVal === 'title') return ta.localeCompare(tb);
    return 0;
  });
  visibleCards.forEach(c => grid.appendChild(c));
  if (visible === 0) {
    if (!grid.querySelector('.filter-empty')) {
      const el = document.createElement('div');
      el.className = 'filter-empty';
      el.style = 'grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);font-size:0.9rem';
      el.innerHTML = '\u{1F50D} No events match your search.';
      grid.appendChild(el);
    }
  } else {
    grid.querySelector('.filter-empty')?.remove();
  }
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}
function showConfirmModal(title, message, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <div style="text-align:center; padding:10px 0;">
      <div style="font-size:1.1rem; color:var(--text); margin-bottom:24px; line-height:1.5">${message}</div>
      <div style="display:flex; gap:12px; max-width:400px; margin:0 auto">
        <button class="btn btn-outline" style="flex:1" onclick="closeModal()">Dismiss</button>
        <button class="btn btn-danger" style="flex:1" id="confirmOk">Confirm</button>
      </div>
    </div>`;
  const btn = document.getElementById('confirmOk');
  btn.onclick = () => { onConfirm(); closeModal(); };
  openModal();
}
async function logout() { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/'; }

init();
