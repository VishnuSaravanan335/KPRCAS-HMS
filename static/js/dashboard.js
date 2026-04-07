// ─── STATE ───────────────────────────────────────────────────────────────────
let currentUser = null;
let settings = {};
let currentPage = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await api('/api/me');
    currentUser = res.user;
    settings = res.settings;
    renderShell();
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
  const rc = { admin: 'badge badge-admin', booker: 'badge badge-booker', it: 'badge badge-it', reception: 'badge badge-reception', principal: 'badge badge-principal' };
  document.getElementById('userInfo').innerHTML = `
    <div class="user-name">${currentUser.name}</div>
    <div class="user-role ${rc[currentUser.role] || ''}">${currentUser.role.toUpperCase()}</div>`;
  if (settings.portal_locked) document.getElementById('lockBadge').style.display = 'flex';
  // Date display
  const d = new Date();
  document.getElementById('topbarDate').textContent =
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  // Nav
  const navItems = getNavItems();
  document.getElementById('sidebarNav').innerHTML = navItems.map(n => `
    <div class="nav-item ${n.id === currentPage ? 'active' : ''}" id="nav-${n.id}" onclick="navigateTo('${n.id}')">
      <span class="nav-icon">${n.icon}</span> ${n.label}
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
    { id: 'new-event', icon: '✨', label: 'Propose Event' },
    { id: 'reports', icon: '📄', label: 'Personal Reports' },
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
    { id: 'pending-events', icon: '⏳', label: 'Pending Approval' },
    { id: 'all-events', icon: '📅', label: 'All Events' },
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
    'my-events': 'My Events', 'new-event': 'New Event', 'reports': 'Reports',
    'it-requests': 'IT Requests', 'it-inventory': 'IT Inventory', 'it-returns': 'Returns',
    'rec-requests': 'Reception Requests', 'rec-inventory': 'Inventory', 'rec-returns': 'Returns',
    'pending-events': 'Pending Approval',
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
  };
  if (routes[page]) routes[page]();
}

// ─── OVERVIEW (ADMIN) ──────────────────────────────────────────────────────────
async function renderOverview() {
  const [stats, events] = await Promise.all([api('/api/stats'), api('/api/events')]);
  
  const total = stats.total_events || 1;
  const pApp = Math.round((stats.approved / total) * 100);
  const pPen = Math.round((stats.pending / total) * 100);
  const pRej = Math.round((stats.rejected / total) * 100);

  document.getElementById('pageContent').innerHTML = `
    ${getUpcomingEventsHtml(events)}

    <div class="section">
      <div class="section-header">
        <div><div class="section-title">System Overview</div><div class="section-sub">KPRCAS Event & Inventory Management</div></div>
        <button class="btn btn-report" onclick="navigateTo('reports')">📄 Download Reports</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-label">Total Events</div>
          <div class="stat-value">${stats.total_events}</div>
          <div class="stat-bar-box"><div class="stat-bar-fill" style="width:100%; background:var(--accent)"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--green-lt);color:var(--green)">✅</div>
          <div class="stat-label">Approved</div>
          <div class="stat-value" style="color:var(--green)">${stats.approved}</div>
          <div class="stat-bar-box"><div class="stat-bar-fill" style="width:${pApp}%; background:var(--green)"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--gold-lt);color:var(--gold)">⏳</div>
          <div class="stat-label">Pending</div>
          <div class="stat-value" style="color:var(--gold)">${stats.pending}</div>
          <div class="stat-bar-box"><div class="stat-bar-fill" style="width:${pPen}%; background:var(--gold)"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--red-lt);color:var(--red)">❌</div>
          <div class="stat-label">Rejected</div>
          <div class="stat-value" style="color:var(--red)">${stats.rejected}</div>
          <div class="stat-bar-box"><div class="stat-bar-fill" style="width:${pRej}%; background:var(--red)"></div></div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-header"><div class="section-title">Quick Actions</div></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-outline" onclick="navigateTo('manage-users')">👥 Manage Users</button>
        <button class="btn btn-outline" onclick="navigateTo('manage-halls')">🏛️ Manage Halls</button>
        <button class="btn btn-outline" onclick="navigateTo('manage-schools')">🏫 Manage Hierarchy</button>
        <button class="btn btn-outline" onclick="navigateTo('manage-inventory')">📦 Inventory</button>
        <button class="btn btn-outline" onclick="navigateTo('all-events')">📅 All Events</button>
        <button class="btn btn-gold" onclick="navigateTo('settings')">⚙️ Portal Settings</button>
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
  const roleColors = { admin: 'badge-admin', booker: 'badge-booker', it: 'badge-it', reception: 'badge-reception', principal: 'badge-principal' };
  document.getElementById('pageContent').innerHTML = `
    
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Users</div><div class="section-sub">${users.length} system accounts</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('users')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddUser()">➕ Add User</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.map(u => `<tr>
              <td style="font-weight:600">${u.name}</td>
              <td style="color:var(--muted);font-size:0.85rem">${u.email || '—'}</td>
              <td><span style="font-family:'JetBrains Mono',monospace;font-size:0.82rem;background:#f8fafc;padding:2px 8px;border-radius:5px;border:1px solid #e2e8f0">${u.username}</span></td>
              <td><span class="badge ${roleColors[u.role] || ''}">${u.role}</span></td>
              <td><div class="td-actions">
                <button class="btn btn-outline btn-sm" onclick="openEditUser('${u.id}')">Edit</button>
                ${u.id !== currentUser.id ? `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}','${u.name}')">Delete</button>` : ''}
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
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
        <option value="booker">Booker</option><option value="it">IT Support</option>
        <option value="reception">Reception</option><option value="principal">Principal</option><option value="admin">Admin</option>
      </select></div>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:20px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddUser()">Create User</button>
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
          ${['booker', 'it', 'reception', 'principal', 'admin'].map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
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
        ${halls.map(h => {
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
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteHall('${h.id}','${h.name}')" style="grid-column: 1 / -1">🗑️ Remove Venue</button>
            </div>
          </div>`;
  }).join('')}
      </div>
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
          <thead><tr><th>Name</th><th>Department</th><th>Total Stock</th><th>In Use</th><th>Available</th><th>Actions</th></tr></thead>
          <tbody>
            ${items.map(i => `<tr>
              <td style="font-weight:700">${i.name}</td>
              <td><span class="badge" style="background-color:${i.dept === 'it' ? '#6366f1' : '#10b981'};color:#fff">${i.dept.toUpperCase()}</span></td>
              <td>${i.stock_qty}</td>
              <td><span style="color:var(--gold);font-weight:700">${i.in_use}</span></td>
              <td><span style="color:var(--green);font-weight:700">${i.available_qty}</span></td>
              <td><div class="td-actions">
                <button class="btn btn-outline btn-sm" onclick="openEditInventory('${i.id}')">Edit Stock</button>
                <button class="btn btn-danger btn-sm" onclick="deleteInventory('${i.id}','${i.name}')">Delete</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
function openAddInventory() {
  document.getElementById('modalTitle').textContent = 'Add Inventory Item';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Item Name</label><input id="invName" placeholder="Laptop"></div>
      <div class="field"><label>Department</label><select id="invDept"><option value="it">IT</option><option value="reception">Reception</option></select></div>
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
    document.getElementById('modalTitle').textContent = 'Update Stock';
    document.getElementById('modalBody').innerHTML = `
      <p style="color:var(--muted);margin-bottom:16px">Update stock for <strong>${item.name}</strong></p>
      <div class="field"><label>Total Stock</label><input id="eInvQty" type="number" value="${item.stock_qty}"></div>
      <div class="modal-footer" style="padding:0;margin-top:20px;">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitEditInventory('${iid}')">Update</button>
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

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
async function renderSettings() {
  const s = await api('/api/settings');
  document.getElementById('pageContent').innerHTML = `
    
    <div class="section">
      <div class="section-header"><div class="section-title">Portal Settings</div></div>
      <div class="table-wrap" style="padding:24px;max-width:520px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
          <div>
            <div style="font-weight:700;font-size:0.95rem">Portal Lock</div>
            <div style="color:var(--muted);font-size:0.84rem;margin-top:5px;line-height:1.5">Prevent non-admin users from accessing the portal and creating new bookings.</div>
          </div>
          <button class="btn ${s.portal_locked ? 'btn-success' : 'btn-danger'}" onclick="togglePortalLock()" style="flex-shrink:0">
            ${s.portal_locked ? '🔓 Unlock' : '🔒 Lock Portal'}
          </button>
        </div>
        <div style="margin-top:16px;padding:12px 16px;border-radius:10px;background:${s.portal_locked ? 'var(--red-lt)' : 'var(--green-lt)'};border:1px solid ${s.portal_locked ? '#fca5a5' : '#6ee7b7'}">
          Status: <strong style="color:${s.portal_locked ? 'var(--red)' : 'var(--green)'}">${s.portal_locked ? '🔒 LOCKED' : '🟢 OPEN'}</strong>
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
      ${events.length === 0 ? emptyState('\u{1F4C5}', 'No events yet', 'Create your first event proposal to get started.') : eventFilterBar('myEventsGrid', 'booker', events) + '<div class="cards-grid" id="myEventsGrid">' + events.map(e => eventCard(e, 'booker')).join('') + '</div>'}
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
  if (hall.image && hall.image.startsWith('http')) return hall.image;
  // Fallback by type for admin-added halls
  const t = (hall.type || '').toLowerCase();
  const n = (hall.name || '').toLowerCase();
  if (t === 'open air' || n.includes('oat')) return HALL_IMAGES.oat;
  if (t === 'auditorium') return HALL_IMAGES.auditorium;
  if (t === 'seminar') return HALL_IMAGES.seminar;
  if (t === 'lab') return HALL_IMAGES.lab;
  if (t === 'conference') return HALL_IMAGES.seminar;
  return HALL_IMAGES.classroom;
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
  const itItems = inventory.filter(i => i.dept === 'it');
  const recItems = inventory.filter(i => i.dept === 'reception');

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
            ${yesNoRow('evIntro','🎬','Intro Video / KPR Anthem')}
            ${yesNoRow('evDance','💃','Dance Performance')}
            ${yesNoRow('evPhotos','📷','Photography')}
            ${yesNoRow('evVideo','🎥','Videography')}
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
  // If moving to step 2, validate step 1 first
  if (n === 2 && !validateStep1()) return;

  for (let i = 1; i <= 4; i++) {
    const pg = document.getElementById('wpage' + i);
    const ws = document.getElementById('ws' + i);
    if (pg) pg.style.display = (i === n) ? '' : 'none';
    if (ws) { ws.classList.toggle('active', i === n); ws.classList.toggle('done', i < n); }
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
          <input type="checkbox" class="school-chk" value="${school.replace(/"/g,'&quot;')}" 
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
            <input type="checkbox" class="dept-chk" data-school="${school.replace(/"/g,'&quot;')}" value="${dep.replace(/"/g,'&quot;')}" 
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
    if(exp) exp.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0)';
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
  const id = btoa(school).replace(/=/g,'').slice(0,8);
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
  const tl = getHallTypeLabel(h);
  return `
  <div class="hall-pick-card" id="hcard_${h.id}" onclick="selectHall('${h.id}','${h.name.replace(/'/g, '&#39;')}',${h.capacity})">
    <div class="hall-pick-img" style="background-image:url('${img}')">
      <div class="hall-pick-overlay"></div>
      <div class="hall-pick-cap">${h.capacity} seats</div>
    </div>
    <div class="hall-pick-body">
      <div class="hall-pick-name">${h.name}</div>
      <div class="hall-pick-type" style="color:${tl.color};background:${tl.bg}">${tl.label} · ${h.type}</div>
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
    const totalCap = Object.values(_selectedHalls).reduce((s,h) => s + h.capacity, 0);
    capEl.textContent = totalCap + ' seats total';
    
    const count = parseInt(document.getElementById('evCount')?.value || 0);
    if (count > 0) onCountChange(count);
  }
}

function selectHall(hid, hname, hcap) {
  if (!_multiSelectMode) {
    _selectedHalls = {};
    const customInp = document.getElementById('customClassInputBox');
    if(customInp) customInp.style.display = 'none';
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
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  const role = currentUser.role;
  document.getElementById('pageContent').innerHTML = `
    
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">All Events</div><div class="section-sub">${events.length} total</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('all-events')">\u{1F4C4} Full Report</button>
        </div>
      </div>
      ${events.length === 0 ? emptyState('\u{1F4C5}', 'No events', 'No events have been created yet.') : eventFilterBar('allEventsGrid', role, events) + '<div class="cards-grid" id="allEventsGrid">' + events.map(e => eventCard(e, role)).join('') + '</div>'}
    </div>`;
}

// ─── PENDING EVENTS (PRINCIPAL) ───────────────────────────────────────────────
async function renderPendingEvents() {
  const events = await api('/api/events');
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  const pending = events.filter(e => e.status === 'principal_review');
  const reviewed = events.filter(e => e.status !== 'principal_review');
  document.getElementById('pageContent').innerHTML = `
    
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Events Awaiting Approval</div><div class="section-sub">${pending.length} pending</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('principal')">\u{1F4C4} Decision Report</button>
        </div>
      </div>
      ${pending.length === 0 ? emptyState('\u{2705}', 'All clear!', 'No events are pending your review.') : eventFilterBar('pendingGrid', 'principal', pending) + '<div class="cards-grid" id="pendingGrid">' + pending.map(e => eventCard(e, 'principal')).join('') + '</div>'}
    </div>
    ${reviewed.length > 0 ? '<div class="section"><div class="section-header"><div class="section-title">Previously Reviewed</div></div>' + eventFilterBar('reviewedGrid', 'principal', reviewed) + '<div class="cards-grid" id="reviewedGrid">' + reviewed.map(e => eventCard(e, 'principal')).join('') + '</div></div>' : ''}`;
}

// ─── DEPT REQUESTS ────────────────────────────────────────────────────────────
async function renderDeptRequests(dept) {
  const events = await api('/api/events');
  
  const relevant = events.filter(e => e.requested_items.some(i => i.dept === dept) && (e.status === 'dept_review' || e.status === 'principal_review' || e.status === 'approved'));
  relevant.sort((a, b) => new Date(a.date) - new Date(b.date));
  const pending = relevant.filter(e => e.requested_items.some(i => i.dept === dept && !i.dept_approved));
  const done = relevant.filter(e => e.requested_items.every(i => i.dept !== dept || i.dept_approved));
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
      `<div class="cards-grid">${pending.map(e => eventCard(e, dept)).join('')}</div>`}
    </div>
    ${done.length > 0 ? `
    <div class="section">
      <div class="section-header"><div class="section-title">Processed</div></div>
      <div class="cards-grid">${done.map(e => eventCard(e, dept)).join('')}</div>
    </div>`: ''}`;
}

// ─── DEPT INVENTORY ───────────────────────────────────────────────────────────
async function renderDeptInventory(dept) {
  const items = await api('/api/inventory?dept=' + dept);
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">${dept === 'it' ? 'IT' : 'Reception'} Command Center — Inventory</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('inventory-${dept}')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddDeptInventory('${dept}')">➕ Add Item</button>
        </div>
      </div>
      <div class="cards-grid">
        ${items.map((i, idx) => {
          const grads = ['grad-violet', 'grad-ocean', 'grad-emerald', 'grad-sunset', 'grad-berry', 'grad-midnight'];
          const gradClass = grads[idx % grads.length];
          return `
          <div class="inv-card ${gradClass}">
            <div class="inv-header">
              <div class="inv-name" style="font-weight:800; color:#fff">${i.name}</div>
              <span class="badge" style="background:rgba(255,255,255,0.2); color:#fff; border:1px solid rgba(255,255,255,0.3)">${dept.toUpperCase()}</span>
            </div>
            <div class="inv-stats">
              <div class="stat-box" style="background:rgba(255,255,255,0.1); border:none">
                <div class="stat-label" style="color:rgba(255,255,255,0.7)">Total</div>
                <div class="stat-value" style="color:#fff">${i.stock_qty}</div>
              </div>
              <div class="stat-box" style="background:rgba(255,255,255,0.1); border:none">
                <div class="stat-label" style="color:rgba(255,255,255,0.7)">In Use</div>
                <div class="stat-value" style="color:#fff">${i.in_use}</div>
              </div>
              <div class="stat-box" style="background:rgba(255,255,255,0.1); border:none">
                <div class="stat-label" style="color:rgba(255,255,255,0.7)">Avail</div>
                <div class="stat-value" style="color:#fff">${i.stock_qty - i.in_use}</div>
              </div>
            </div>
            <div style="margin-top:16px">
              <button class="btn btn-sm" style="width:100%; justify-content:center; background:rgba(255,255,255,0.2); color:#fff; border:1px solid rgba(255,255,255,0.3)" onclick="openEditInventory('${i.id}')">Modify Stock</button>
            </div>
          </div>`}).join('')}
      </div>
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
  const returnable = events.filter(e => e.status === 'approved' && e.requested_items.some(i => i.dept === dept && i.dept_approved && !i.returned));
  const returned = events.filter(e => e.requested_items.some(i => i.dept === dept && i.returned === true));
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Pending Equipment Returns</div><div class="section-sub">Collect and mark items as returned after event</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('returns-${dept}')">📄 Returns Report</button>
        </div>
      </div>
      ${returnable.length === 0 ? emptyState('📦', 'All items returned', 'Nothing pending for return right now.') :
      `<div class="cards-grid">${returnable.map(e => {
        const myItems = e.requested_items.filter(i => i.dept === dept && i.dept_approved && !i.returned);
        return `
          <div class="event-card status-approved" style="border-top: 4px solid #10b981;">
            <div class="event-card-header">
              <div class="event-title">${e.title}</div>
              <span class="badge badge-approved">Return Pending</span>
            </div>
            <div class="event-meta">
              <span class="event-meta-item">📅 ${e.date}</span>
              <span class="event-meta-item">🏛️ ${e.hall_name}</span>
              <span class="event-meta-item">👤 ${e.created_by_name}</span>
            </div>
            <div style="margin-top:14px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
              <div style="font-size:0.75rem; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:8px;">Allocated Items:</div>
              ${myItems.map(i => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.85rem;border-bottom:1px solid #f1f5f9">
                  <span style="font-weight:600;color:#1e293b">${i.item_name}</span>
                  <span style="color:#10b981;font-weight:700">× ${i.allocated_qty}</span>
                </div>`).join('')}
            </div>
            <div style="margin-top:16px">
              <button class="btn btn-primary" style="width:100%; border-radius:12px; font-weight:800; padding:12px;" onclick="processReturn('${e.id}','${dept}')">
                ↩️ Confirm All Items Returned
              </button>
            </div>
          </div>`;
      }).join('')}`}
    </div>
    ${returned.length > 0 ? `
    <div class="section">
      <div class="section-header"><div class="section-title">Return Histories</div></div>
      <div class="table-wrap">
        <table><thead><tr><th>Event</th><th>Date</th><th>Items Returned</th><th>Status</th></tr></thead>
        <tbody>${returned.map(e => `<tr>
          <td style="font-weight:600">${e.title}</td><td>${e.date}</td>
          <td>${e.requested_items.filter(i => i.dept === dept && i.returned).map(i =>
            `<div style="font-size:0.8rem;color:var(--muted)">${i.item_name} × <span style="font-weight:700;color:var(--green)">${i.returned_qty || i.allocated_qty}</span></div>`
          ).join('')}</td>
          <td><span class="badge badge-approved">✅ Returned</span></td>
        </tr>`).join('')}</tbody></table>
      </div>
    </div>` : ''}`;
}

async function processReturn(eid, dept) {
  await api(`/api/events/${eid}/return`, 'POST', {});
  showToast('All items marked as returned ✅', 'success');
  renderReturns(dept);
}

function renderProgressChart(e) {
  const status = e.status;
  const stages = [
    { id: 'booked', label: 'Booked' },
    { id: 'dept_review', label: 'Dept Review' },
    { id: 'principal_review', label: 'Principal Review' },
    { id: 'approved', label: 'Approved' }
  ];
  
  let currentIdx = 0;
  if (status === 'dept_review') currentIdx = 1;
  else if (status === 'principal_review') currentIdx = 2;
  else if (status === 'approved') currentIdx = 3;
  
  if (status === 'rejected') {
    return `<div style="color:#ef4444;font-weight:700;font-size:0.8rem;text-align:center;padding:12px;background:#fef2f2;border-radius:10px;border:1px solid #fee2e2;margin:10px 0">❌ Event Proposal Rejected</div>`;
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
function eventCard(e, role) {
  const statusBadge = {
    dept_review: '<span class="badge badge-pending">⏳ Dept Review</span>',
    principal_review: '<span class="badge badge-principal">👤 Principal Review</span>',
    approved: '<span class="badge badge-approved">✅ Approved</span>',
    rejected: '<span class="badge badge-rejected">❌ Rejected</span>',
  }[e.status] || '';

  // Primary action button (shown in footer)
  let primaryBtn = '';
  if (role === 'booker' || role === 'admin' || role === 'principal') {
    if (role === 'principal' && e.status === 'principal_review') {
      primaryBtn = `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openPrincipalModal('${e.id}')">Review & Decide</button>`;
    }
    if (role === 'booker' && e.status === 'dept_review') {
      primaryBtn += `<button class="btn btn-warning btn-sm" onclick="event.stopPropagation();openEditEventModal('${e.id}')">Edit</button>`;
      primaryBtn += `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();cancelEvent('${e.id}')">Cancel</button>`;
    }
    if (role === 'admin') {
      if (e.status !== 'approved' && e.status !== 'rejected') {
        primaryBtn += `<button class="btn btn-success btn-sm" onclick="event.stopPropagation();adminApproveEvent('${e.id}')">Approve</button>`;
      }
      primaryBtn += `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();adminDeleteEvent('${e.id}')">Delete</button>`;
      primaryBtn += `<button class="btn btn-report btn-sm" onclick="event.stopPropagation();downloadSingleEventReport('${e.id}')">📄</button>`;
    }
  }
  if (role === 'it' || role === 'reception') {
    if (e.status === 'dept_review') {
      const myPending = e.requested_items.filter(i => i.dept === role && !i.dept_approved);
      primaryBtn = myPending.length > 0 ?
        `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openAllocModal('${e.id}','${role}')">📦 Allocate</button>` :
        `<span class="badge ${role === 'it' ? 'badge-it' : 'badge-reception'}">✔ Allocated</span>`;
    }
    primaryBtn += `<button class="btn btn-report btn-sm" onclick="event.stopPropagation();downloadSingleEventReport('${e.id}')">📄</button>`;
  }

  // IT/Reception: show only name, date, time + their items (no budget/details)
  const isDepRole = (role === 'it' || role === 'reception');
  const myItems = isDepRole ? e.requested_items.filter(i => i.dept === role) : [];

  // Determine school tag
  let schoolTag = '';
  if (e.departments && e.departments.length > 0) {
    const s = e.departments[0].school.toUpperCase();
    let cls = 'sb-gen';
    if (s.includes('BCA')) cls = 'sb-bca';
    else if (s.includes('B.COM') || s.includes('BCOM')) cls = 'sb-bcom';
    else if (s.includes('BSC')) cls = 'sb-bsc';
    else if (s.includes('BA')) cls = 'sb-ba';
    else if (s.includes('BBA')) cls = 'sb-bba';
    schoolTag = `<div class="school-badge ${cls}">${s}</div>`;
  }

  return `<div class="event-card status-${e.status}" onclick="viewEventDetail('${e.id}')" style="cursor:pointer">
    <div class="event-card-header">
      <div style="flex:1">
        ${schoolTag}
        <div class="event-title">${e.title}</div>
      </div>
      ${statusBadge}
    </div>
    ${renderMiniStepper(e.status)}
    <div class="event-meta" style="margin-top:10px">
      <span class="event-meta-item">📅 ${e.date}</span>
      <span class="event-meta-item">⏰ ${e.time_slot}</span>
      ${!isDepRole ? `<span class="event-meta-item">🏛️ ${e.hall_name}</span>` : ''}
      ${(!isDepRole && e.budget_id) ? `<span class="event-meta-item">🔖 ${e.budget_id}</span>` : ''}
    </div>
    ${isDepRole && myItems.length > 0 ? `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border2)">
      ${myItems.map(i => `<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:3px 0;color:var(--text2)">
        <span>${i.item_name}</span><span style="font-weight:700;color:var(--accent)">× ${i.requested_qty}</span>
      </div>`).join('')}
    </div>` : ''}
    ${(!isDepRole && e.created_by_name) ? `<div style="font-size:0.75rem;color:var(--muted);margin-top:6px">👤 ${e.created_by_name}</div>` : ''}
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span style="font-size:0.74rem;color:var(--muted)">Click for full details</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${primaryBtn}</div>
    </div>
  </div>`;
}

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
  // Show approved events for all, or pending events if booker
  let upcoming = allEvents.filter(e => e.status === 'approved');
  if (currentUser.role === 'booker') {
      const myPending = allEvents.filter(e => e.status === 'dept_review' || e.status === 'principal_review');
      upcoming = [...upcoming.slice(0, 3), ...myPending.slice(0, 3)].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  } else {
      upcoming = upcoming.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 4);
  }

  if (upcoming.length === 0) return '';
  return `
    <div class="section upcoming-widget" style="margin-bottom:24px;">
      <div class="section-header">
        <div>
          <div class="section-title">Schedule Overview</div>
          <div class="section-sub">Recent & Upcoming Events</div>
        </div>
      </div>
      <div class="upcoming-scroll-container">
        <!-- Total Summary Card -->
        <div class="upcoming-card-box upcoming-total-card grad-midnight">
          <div class="total-val">${allEvents.filter(e => e.status === 'approved').length}</div>
          <div class="total-lbl">Approved Events Total</div>
        </div>

        ${upcoming.map((e, idx) => {
            const isMyPending = currentUser.role === 'booker' && (e.status === 'dept_review' || e.status === 'principal_review');
            const grads = ['grad-violet', 'grad-ocean', 'grad-emerald', 'grad-sunset', 'grad-berry'];
            const gradClass = grads[idx % grads.length];
            
            return `
            <div class="upcoming-card-box ${gradClass}">
              <div class="upcoming-card-top">
                <div class="upcoming-card-title" style="color:#fff; font-weight:800; font-size:1.1rem">${e.title}</div>
                <div class="upcoming-card-status">${e.status === 'approved' ? '✅' : '⏳'}</div>
              </div>
              <div class="upcoming-card-meta" style="color:rgba(255,255,255,0.8); font-size:0.85rem">
                <div class="meta-line">📅 ${e.date}</div>
                <div class="meta-line">⌚ ${e.time_slot}</div>
                <div class="meta-line">🏛️ ${e.hall_name}</div>
              </div>
              <div class="upcoming-card-footer" style="border-top:1px solid rgba(255,255,255,0.2); padding-top:12px; margin-top:12px">
                <div class="organizer-name" style="color:rgba(255,255,255,0.9); font-weight:600">By ${e.created_by_name}</div>
                ${isMyPending ? `<button class="btn btn-gold btn-xs" onclick="event.stopPropagation();openEditEventModal('${e.id}')">✏️ Edit</button>` : ''}
              </div>
            </div>
            `;
        }).join('')}
      </div>
    </div>
  `;
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
            <div class="report-panel-sub">All reports are generated as print-ready HTML. Use browser Print → Save as PDF.</div>
          </div>
        </div>
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
    { key: 'users', icon: '👥', title: 'Users Report', desc: 'All system users with roles and account details' },
    { key: 'halls', icon: '🏛️', title: 'Halls Report', desc: 'All halls with capacity, type and lock status' },
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
async function downloadReport(type) {
  showToast('Generating report…', 'info');
  try {
    const [events, inventory, users, halls, stats] = await Promise.all([
      api('/api/events'), api('/api/inventory'),
      currentUser.role === 'admin' ? api('/api/users') : Promise.resolve([]),
      api('/api/halls'), api('/api/stats')
    ]);
    const html = buildReportHTML(type, { events, inventory, users, halls, stats });
    openReportWindow(html, type);
  } catch (e) { showToast('Error generating report', 'error'); }
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
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
      * { box-sizing:border-box; margin:0; padding:0; }
      body { 
        font-family:'Plus Jakarta Sans',Arial,sans-serif; 
        background:#f8fafc; color:#0f172a; 
        padding:20mm; font-size:11px; line-height:1.45; 
        margin:0 auto; max-width:210mm; 
      }
      @page { size: A4; margin: 0; }
      .rpt-header { 
        display:flex; justify-content:space-between; align-items:flex-end; 
        padding-bottom:18px; border-bottom:3.5px solid #6366f1; margin-bottom:28px; 
      }
      .rpt-logo { display:flex; align-items:center; gap:12px; }
      .rpt-logo-box { 
        width:48px; height:48px; background:linear-gradient(135deg,#6366f1,#4f46e5); 
        border-radius:12px; display:flex; align-items:center; justify-content:center; 
        font-weight:800; font-size:1.3rem; color:#fff; box-shadow:0 10px 20px rgba(99,102,241,0.25);
      }
      .rpt-brand { font-size:1.4rem; font-weight:800; color:#1e293b; }
      .rpt-brand span { color:#6366f1; }
      .rpt-meta { text-align:right; color:#64748b; font-size:0.75rem; }
      .rpt-meta strong { display:block; font-size:0.95rem; color:#0f172a; font-weight:800; margin-bottom:3px; }
      h2 { font-size:1.1rem; font-weight:800; color:#1e293b; margin:28px 0 14px; padding-bottom:8px; border-bottom:1.5px solid #e2e8f0; text-transform:uppercase; letter-spacing:0.02em; }
      .table-card { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.02); margin-bottom:20px; }
      table { width:100%; border-collapse:collapse; font-size:0.78rem; }
      th { 
        background:#f1f5f9; padding:10px 14px; text-align:left; font-size:0.65rem; 
        font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#475569; 
        border-bottom:1px solid #e2e8f0; 
      }
      td { padding:10px 14px; border-bottom:1px solid #f1f5f9; color:#1e293b; }
      tr:last-child td { border-bottom:none; }
      tr:nth-child(even) td { background:#fafbff; }
      .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:999px; font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; }
      .b-approved { color:#059669; background:#dcfce7; }
      .b-rejected  { color:#dc2626; background:#fee2e2; }
      .b-pending   { color:#d97706; background:#fef3c7; }
      .b-principal { color:#6366f1; background:#e0e7ff; }
      .b-it        { color:#2563eb; background:#dbeafe; }
      .b-reception { color:#7c3aed; background:#ede9fe; }
      .stat-box { background:#ffffff; border:1.5px solid #e2e8f0; border-radius:12px; padding:16px 18px; box-shadow:0 2px 4px rgba(0,0,0,0.02); }
      .stat-box .logo-text {
        font-size: 1.25rem;
        font-weight: 800;
        color: #fff;
        letter-spacing: -0.3px;
        text-transform: uppercase;
      }

      .logo-text span {
        color: #10b981;
        margin-left: 2px;
      }
      .stat-box .lbl { font-size:0.65rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; margin-bottom:6px; }
      .stat-box .val { font-size:1.6rem; font-weight:800; color:#1e293b; }
      .footer { margin-top:50px; padding-top:20px; border-top:1.5px solid #e2e8f0; text-align:center; font-size:0.7rem; color:#94a3b8; font-weight:600; letter-spacing:0.02em; }
      .print-btn { 
        position:fixed; top:20px; right:20px; background:#6366f1; color:#fff; border:none; 
        padding:12px 24px; border-radius:10px; font-family:inherit; font-size:0.85rem; 
        font-weight:800; cursor:pointer; box-shadow:0 10px 25px rgba(99,102,241,0.4); z-index:9999;
        transition: all 0.2s;
      }
      .print-btn:hover { background:#4f46e5; transform:translateY(-2px); box-shadow:0 15px 30px rgba(99,102,241,0.5); }
      @media print { .print-btn { display:none; } body { padding:10mm; background:#fff; } .table-card { border:none; box-shadow:none; } }
    </style>`;
}

function reportHeader(title, subtitle) {
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
  return `
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
    <div class="rpt-header">
      <div class="rpt-logo">
        <div class="rpt-logo-box">K</div>
        <div>
          <div class="rpt-brand">KPR<span>HUB</span></div>
          <div style="font-size:0.75rem;color:#64748b">KPRCAS Institution</div>
        </div>
      </div>
      <div class="rpt-meta">
        <strong>${title}</strong>
        ${subtitle}<br>Generated: ${now}<br>By: ${currentUser.name} (${currentUser.role.toUpperCase()})
      </div>
    </div>`;
}

function reportFooter() {
  return `<div class="footer">KPRCAS HMS — Event & Inventory Management System · KPRCAS · Confidential</div>`;
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
    'all-events': 'Events Report', 'approved': 'Approved Events Report', 'pending': 'Pending Events Report',
    'inventory': 'Inventory Status Report', 'inventory-it': 'IT Inventory Report',
    'inventory-reception': 'Reception Inventory Report', 'users': 'Users Report', 'halls': 'Halls Report',
    'dept-it': 'IT Department Activity Report', 'dept-reception': 'Reception Department Activity Report',
    'returns-it': 'IT Returns Report', 'returns-reception': 'Reception Returns Report',
    'principal': 'Principal Decisions Report', 'my-events': 'My Events Report', 'full-summary': 'Full System Summary Report',
  };
  const title = reportTitles[type] || 'KPRCAS HMS Report';

  // SUMMARY STATS BLOCK
  if (['all-events', 'approved', 'pending', 'full-summary', 'principal', 'my-events'].includes(type)) {
    const evSet = filtered[type] || events;
    body += `<div class="stats-row">
      <div class="stat-box"><div class="lbl">Events</div><div class="val">${evSet.length}</div></div>
      <div class="stat-box"><div class="lbl">Approved</div><div class="val" style="color:#059669">${evSet.filter(e => e.status === 'approved').length}</div></div>
      <div class="stat-box"><div class="lbl">Pending</div><div class="val" style="color:#d97706">${evSet.filter(e => e.status !== 'approved' && e.status !== 'rejected').length}</div></div>
      <div class="stat-box"><div class="lbl">Rejected</div><div class="val" style="color:#dc2626">${evSet.filter(e => e.status === 'rejected').length}</div></div>
    </div>`;
  }

  // EVENTS TABLE
  if (['all-events', 'approved', 'pending', 'my-events', 'full-summary', 'dept-it', 'dept-reception'].includes(type)) {
    const evSet = filtered[type] || events;
    body += `<h2>📅 Events (${evSet.length})</h2>
    <div class="table-card">
      <table><thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Hall</th><th>Budget ID</th><th>Organizer</th><th>Status</th></tr></thead>
      <tbody>${evSet.map(e => `<tr>
        <td style="font-weight:800;color:#1e293b">${e.title}</td>
        <td>${e.date}</td><td style="font-size:0.7rem;font-family:'JetBrains Mono',monospace">${e.time_slot}</td>
        <td>${e.hall_name}</td>
        <td><code style="background:#f1f5f9;padding:2px 5px;border-radius:4px">${e.budget_id || '—'}</code></td>
        <td>${e.created_by_name}</td>
        <td>${statusBadgeHTML(e.status)}</td>
      </tr>`).join('')}</tbody></table>
    </div>`;
  }

  // PRINCIPAL DECISIONS
  if (type === 'principal') {
    const decided = events.filter(e => e.principal_decision);
    body += `<h2>👤 Principal Decisions (${decided.length})</h2>
    <table><thead><tr><th>Event</th><th>Date</th><th>Decision</th><th>Note</th></tr></thead>
    <tbody>${decided.map(e => `<tr>
      <td style="font-weight:700">${e.title}</td><td>${e.date}</td>
      <td>${e.principal_decision === 'approved' ? '<span class="badge b-approved">✅ Approved</span>' : '<span class="badge b-rejected">❌ Rejected</span>'}</td>
      <td style="color:#64748b;font-style:italic">${e.principal_note || '—'}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  // INVENTORY
  if (['inventory', 'inventory-it', 'inventory-reception', 'full-summary'].includes(type)) {
    const inv = type === 'inventory-it' ? inventory.filter(i => i.dept === 'it') :
      type === 'inventory-reception' ? inventory.filter(i => i.dept === 'reception') : inventory;
    body += `<h2>📦 Inventory Status (${inv.length} items)</h2>
    <table><thead><tr><th>Item</th><th>Department</th><th>Total Stock</th><th>In Use</th><th>Available</th></tr></thead>
    <tbody>${inv.map(i => `<tr>
      <td style="font-weight:700">${i.name}</td>
      <td><span class="badge b-${i.dept}">${i.dept.toUpperCase()}</span></td>
      <td>${i.stock_qty}</td>
      <td style="color:#d97706;font-weight:700">${i.in_use}</td>
      <td style="color:#059669;font-weight:700">${i.available_qty}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  // DEPT ALLOCATIONS
  if (['dept-it', 'dept-reception', 'returns-it', 'returns-reception'].includes(type)) {
    const dept = type.includes('it') ? 'it' : 'reception';
    const deptEvents = events.filter(e => e.requested_items.some(i => i.dept === dept && i.dept_approved));
    body += `<h2>📋 Allocation Details</h2>
    <table><thead><tr><th>Event</th><th>Date</th><th>Item</th><th>Requested</th><th>Allocated</th><th>Returned Qty</th><th>Status</th></tr></thead>
    <tbody>${deptEvents.flatMap(e => e.requested_items.filter(i => i.dept === dept && i.dept_approved).map(i => `<tr>
      <td style="font-weight:700">${e.title}</td><td>${e.date}</td>
      <td>${i.item_name}</td><td>${i.requested_qty}</td>
      <td style="color:#059669;font-weight:700">${i.allocated_qty}</td>
      <td style="text-align:center;font-weight:700;color:var(--accent)">${i.returned_qty || 0}</td>
      <td>${(i.returned_qty || 0) >= (i.allocated_qty || 0) ? '<span class="badge b-approved">✅ Fully Returned</span>' : (i.returned_qty > 0 ? '<span class="badge b-it">⏳ Partially Returned</span>' : '<span class="badge b-pending">⚠️ Pending</span>')}</td>
    </tr>`)).join('')}</tbody></table>`;
  }

  // USERS (admin only)
  if ((type === 'users' || type === 'full-summary') && users.length > 0) {
    const roleB = { admin: 'b-pending', booker: 'b-approved', it: 'b-it', reception: 'b-reception', principal: 'b-principal' };
    body += `<h2>👥 System Users (${users.length})</h2>
    <table><thead><tr><th>Name</th><th>Username</th><th>Role</th></tr></thead>
    <tbody>${users.map(u => `<tr>
      <td style="font-weight:700">${u.name}</td>
      <td style="font-family:monospace">${u.username}</td>
      <td><span class="badge ${roleB[u.role] || ''}">${u.role}</span></td>
    </tr>`).join('')}</tbody></table>`;
  }

  // HALLS
  if (type === 'halls' || type === 'full-summary') {
    body += `<h2>🏛️ Halls (${halls.length})</h2>
    <table><thead><tr><th>Name</th><th>Type</th><th>Capacity</th><th>Status</th></tr></thead>
    <tbody>${halls.map(h => `<tr>
      <td style="font-weight:700">${h.name}</td><td>${h.type}</td><td>${h.capacity}</td>
      <td>${h.locked ? '<span class="badge b-rejected">🔒 Locked</span>' : '<span class="badge b-approved">✓ Available</span>'}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} — KPRCAS HMS</title>${reportStyles()}</head>
  <body>${reportHeader(title, 'Phase Report')}<div id="content">${body}</div>${reportFooter()}</body></html>`;
}

function buildSingleEventReportHTML(e) {
  const itItems = e.requested_items.filter(i => i.dept === 'it');
  const recItems = e.requested_items.filter(i => i.dept === 'reception');
  const body = `
    <h2>📅 Event Details</h2>
    <div class="section-box">
      <div class="row"><span class="lbl">Title</span><span class="val">${e.title}</span></div>
      <div class="row"><span class="lbl">Date</span><span class="val">${e.date}</span></div>
      <div class="row"><span class="lbl">Time Slot</span><span class="val">${e.time_slot}</span></div>
      <div class="row"><span class="lbl">Hall</span><span class="val">${e.hall_name}</span></div>
      <div class="row"><span class="lbl">Budget ID</span><span class="val" style="color:#d97706">${e.budget_id || '—'}</span></div>
      <div class="row"><span class="lbl">Organizer</span><span class="val">${e.created_by_name}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val">${statusBadgeHTML(e.status)}</span></div>
      ${e.description ? `<div class="row"><span class="lbl">Description</span><span class="val">${e.description}</span></div>` : ''}
    </div>
    ${(e.has_intro_video || e.has_dance) ? `
    <h2>✨ Special Requirements</h2>
    <div class="section-box">
      ${e.has_intro_video ? '<div class="row"><span>🎬 Intro Video Required</span><span class="badge b-approved">Yes</span></div>' : ''}
      ${e.has_dance ? '<div class="row"><span>💃 Dance Performance</span><span class="badge b-approved">Yes</span></div>' : ''}
    </div>`: ''}
    ${itItems.length > 0 ? `
    <h2>🖥️ IT Inventory</h2>
    <table><thead><tr><th>Item</th><th>Requested</th><th>Allocated</th><th>Status</th></tr></thead>
    <tbody>${itItems.map(i => `<tr><td style="font-weight:700">${i.item_name}</td><td>${i.requested_qty}</td>
      <td style="color:#059669;font-weight:700">${i.allocated_qty}</td>
      <td>${i.dept_approved ? '<span class="badge b-approved">Allocated</span>' : '<span class="badge b-pending">Pending</span>'}</td>
    </tr>`).join('')}</tbody></table>` : ''}
    ${recItems.length > 0 ? `
    <h2>🛎️ Reception Inventory</h2>
    <table><thead><tr><th>Item</th><th>Requested</th><th>Allocated</th><th>Status</th></tr></thead>
    <tbody>${recItems.map(i => `<tr><td style="font-weight:700">${i.item_name}</td><td>${i.requested_qty}</td>
      <td style="color:#059669;font-weight:700">${i.allocated_qty}</td>
      <td>${i.dept_approved ? '<span class="badge b-approved">Allocated</span>' : '<span class="badge b-pending">Pending</span>'}</td>
    </tr>`).join('')}</tbody></table>` : ''}
    ${e.principal_decision ? `
    <h2>👤 Principal's Decision</h2>
    <div class="section-box">
      <div class="row"><span class="lbl">Decision</span><span class="val">${statusBadgeHTML(e.principal_decision)}</span></div>
      ${e.principal_note ? `<div class="row"><span class="lbl">Note</span><span class="val" style="font-style:italic">${e.principal_note}</span></div>` : ''}
    </div>`: ''}`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Event Report: ${e.title} — KPRCAS HMS</title>${reportStyles()}</head>
  <body>${reportHeader('Event Report: ' + e.title, 'Individual Event Phase Report')}${body}${reportFooter()}</body></html>`;
}

async function previewReport(type) {
  await downloadReport(type);
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
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }
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
  return `
  <div class="filter-bar">
    <div class="filter-search-wrap">
      <span class="filter-search-icon">🔍</span>
      <input class="filter-search" placeholder="Search events..." oninput="filterEvents('${gridId}','${role}')" id="search_${gridId}">
    </div>
    <div class="filter-chips">
      <button class="filter-chip active" onclick="setStatusFilter('${gridId}','${role}','all',this)">All</button>
      ${allEvents.some(e => e.status === 'approved') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','approved',this)">✅ Approved</button>` : ''}
      ${allEvents.some(e => e.status === 'dept_review') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','dept_review',this)">⏳ Dept Review</button>` : ''}
      ${allEvents.some(e => e.status === 'principal_review') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','principal_review',this)">👤 Pending</button>` : ''}
      ${allEvents.some(e => e.status === 'rejected') ? `<button class="filter-chip" onclick="setStatusFilter('${gridId}','${role}','rejected',this)">❌ Rejected</button>` : ''}
    </div>
    <select class="filter-sort" onchange="sortEvents('${gridId}','${role}');" id="sort_${gridId}">
      <option value="date-asc">📅 Date: Earliest first</option>
      <option value="date-desc">📅 Date: Latest first</option>
      <option value="title">🔤 Title A–Z</option>
    </select>
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
  const cards = Array.from(grid.querySelectorAll('.event-card'));
  let visible = 0;
  cards.forEach(card => {
    const title = (card.querySelector('.event-title')?.textContent || '').toLowerCase();
    const meta = (card.querySelector('.event-meta')?.textContent || '').toLowerCase();
    const status = card.className.match(/status-(\S+)/)?.[1] || '';
    const matchQ = !query || title.includes(query) || meta.includes(query);
    const matchS = statusFilter === 'all' || status === statusFilter;
    card.style.display = (matchQ && matchS) ? '' : 'none';
    if (matchQ && matchS) visible++;
  });
  // Sort visible cards
  const visibleCards = cards.filter(c => c.style.display !== 'none');
  visibleCards.sort((a, b) => {
    const da = a.querySelector('.event-meta-item')?.textContent?.trim() || '';
    const db = b.querySelector('.event-meta-item')?.textContent?.trim() || '';
    const ta = a.querySelector('.event-title')?.textContent || '';
    const tb = b.querySelector('.event-title')?.textContent || '';
    if (sortVal === 'date-asc') return da.localeCompare(db);
    if (sortVal === 'date-desc') return db.localeCompare(da);
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