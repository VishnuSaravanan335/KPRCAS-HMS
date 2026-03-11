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
  const rc = { admin: 'role-admin', booker: 'role-booker', it: 'role-it', reception: 'role-reception', principal: 'role-principal' };
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
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'manage-users', icon: '👥', label: 'Users' },
    { id: 'manage-halls', icon: '🏛️', label: 'Halls' },
    { id: 'manage-inventory', icon: '📦', label: 'Inventory' },
    { id: 'all-events', icon: '📅', label: 'All Events' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  if (role === 'booker') return [
    { id: 'my-events', icon: '📅', label: 'My Events' },
    { id: 'new-event', icon: '➕', label: 'New Event' },
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
    'pending-events': renderPendingEvents,
  };
  if (routes[page]) routes[page]();
}

// ─── OVERVIEW (ADMIN) ──────────────────────────────────────────────────────────
async function renderOverview() {
  const stats = await api('/api/stats');
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">System Overview</div><div class="section-sub">KPRCAS Event & Inventory Management</div></div>
        <button class="btn btn-report" onclick="navigateTo('reports')">📄 Download Reports</button>
      </div>
      <div class="stats-row">
        <div class="stat-card sc-blue"><div class="stat-icon">📅</div><div class="stat-label">Total Events</div><div class="stat-value stat-accent">${stats.total_events}</div><div class="stat-sub">All time</div></div>
        <div class="stat-card sc-green"><div class="stat-icon">✅</div><div class="stat-label">Approved</div><div class="stat-value stat-green">${stats.approved}</div><div class="stat-sub">Scheduled</div></div>
        <div class="stat-card sc-gold"><div class="stat-icon">⏳</div><div class="stat-label">Pending</div><div class="stat-value stat-gold">${stats.pending}</div><div class="stat-sub">Awaiting review</div></div>
        <div class="stat-card sc-red"><div class="stat-icon">❌</div><div class="stat-label">Rejected</div><div class="stat-value stat-red">${stats.rejected}</div><div class="stat-sub">Not approved</div></div>
        <div class="stat-card sc-purple"><div class="stat-icon">👥</div><div class="stat-label">Users</div><div class="stat-value stat-purple">${stats.total_users}</div><div class="stat-sub">System accounts</div></div>
        <div class="stat-card sc-cyan"><div class="stat-icon">🏛️</div><div class="stat-label">Halls</div><div class="stat-value stat-cyan">${stats.total_halls}</div><div class="stat-sub">Venues</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-header"><div class="section-title">Quick Actions</div></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-outline" onclick="navigateTo('manage-users')">👥 Manage Users</button>
        <button class="btn btn-outline" onclick="navigateTo('manage-halls')">🏛️ Manage Halls</button>
        <button class="btn btn-outline" onclick="navigateTo('manage-inventory')">📦 Inventory</button>
        <button class="btn btn-outline" onclick="navigateTo('all-events')">📅 All Events</button>
        <button class="btn btn-gold" onclick="navigateTo('settings')">⚙️ Portal Settings</button>
      </div>
    </div>`;
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
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.map(u => `<tr>
              <td style="font-weight:600">${u.name}</td>
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
  const body = { name: v('uName'), username: v('uUsername'), password: v('uPassword'), role: v('uRole') };
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
  const body = { name: v('euName'), role: v('euRole') }; const pw = v('euPassword'); if (pw) body.password = pw;
  await api(`/api/users/${uid}`, 'PUT', body); closeModal(); showToast('User updated', 'success'); renderManageUsers();
}
async function deleteUser(uid, name) {
  if (!confirm(`Delete user "${name}"?`)) return;
  await api(`/api/users/${uid}`, 'DELETE'); showToast('User deleted', 'info'); renderManageUsers();
}

// ─── MANAGE HALLS ─────────────────────────────────────────────────────────────
async function renderManageHalls() {
  const halls = await api('/api/halls');
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Halls & Venues</div><div class="section-sub">${halls.length} venues</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('halls')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddHall()">➕ Add Hall</button>
        </div>
      </div>
      <div class="cards-grid">
        ${halls.map(h => {
    const img = getHallImage(h);
    return `
          <div class="hall-card" style="padding:0;overflow:hidden">
            <div style="height:140px;background-image:url('${img}');background-size:cover;background-position:center;position:relative">
              <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.65))"></div>
              <div style="position:absolute;bottom:10px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-end">
                <div>
                  <div style="font-weight:800;font-size:0.95rem;color:#fff">${h.name}</div>
                  <div style="font-size:0.72rem;color:rgba(255,255,255,0.75);font-family:'JetBrains Mono',monospace">${h.type}</div>
                </div>
                ${h.locked ? '<span class="badge badge-locked">🔒 Locked</span>' : '<span class="badge badge-available">✓ Available</span>'}
              </div>
            </div>
            <div style="padding:14px 16px">
              <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:12px">
                <span class="hall-capacity">${h.capacity}</span><span class="hall-cap-label">seats capacity</span>
              </div>
              <div style="display:flex;gap:7px;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="openEditHall('${h.id}')">✏️ Edit</button>
                <button class="btn ${h.locked ? 'btn-success' : 'btn-gold'} btn-sm" onclick="toggleHallLock('${h.id}',${h.locked})">${h.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
                <button class="btn btn-danger btn-sm" onclick="deleteHall('${h.id}','${h.name}')">Delete</button>
              </div>
            </div>
          </div>`;
  }).join('')}
      </div>
    </div>`;
}
function openAddHall() {
  document.getElementById('modalTitle').textContent = 'Add Hall';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Hall Name</label><input id="hName" placeholder="Seminar Hall C"></div>
      <div class="field"><label>Capacity</label><input id="hCap" type="number" placeholder="100"></div>
      <div class="field"><label>Type</label><select id="hType">${['Seminar', 'Open Air', 'Lab', 'Auditorium', 'Conference'].map(t => `<option>${t}</option>`).join('')}</select></div>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:20px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddHall()">Add Hall</button>
    </div>`;
  openModal();
}
async function submitAddHall() {
  const body = { name: v('hName'), capacity: v('hCap'), type: v('hType') };
  if (!body.name || !body.capacity) { showToast('Fill all fields', 'error'); return; }
  await api('/api/halls', 'POST', body); closeModal(); showToast('Hall added', 'success'); renderManageHalls();
}
function openEditHall(hid) {
  api('/api/halls').then(halls => {
    const h = halls.find(x => x.id === hid);
    document.getElementById('modalTitle').textContent = 'Edit Hall';
    document.getElementById('modalBody').innerHTML = `
      <div class="form-grid">
        <div class="field"><label>Name</label><input id="ehName" value="${h.name}"></div>
        <div class="field"><label>Capacity</label><input id="ehCap" type="number" value="${h.capacity}"></div>
        <div class="field"><label>Type</label><select id="ehType">${['Seminar', 'Open Air', 'Lab', 'Auditorium', 'Conference'].map(t => `<option ${t === h.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="modal-footer" style="padding:0;margin-top:20px;">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitEditHall('${hid}')">Save</button>
      </div>`;
    openModal();
  });
}
async function submitEditHall(hid) {
  await api(`/api/halls/${hid}`, 'PUT', { name: v('ehName'), capacity: parseInt(v('ehCap')), type: v('ehType') });
  closeModal(); showToast('Hall updated', 'success'); renderManageHalls();
}
async function toggleHallLock(hid, locked) {
  await api(`/api/halls/${hid}`, 'PUT', { locked: !locked });
  showToast(locked ? 'Hall unlocked' : 'Hall locked', 'info'); renderManageHalls();
}
async function deleteHall(hid, name) {
  if (!confirm(`Delete hall "${name}"?`)) return;
  await api(`/api/halls/${hid}`, 'DELETE'); showToast('Hall deleted', 'info'); renderManageHalls();
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
              <td style="font-weight:600">${i.name}</td>
              <td><span class="badge badge-${i.dept}">${i.dept.toUpperCase()}</span></td>
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
  if (!confirm(`Delete "${name}"?`)) return;
  await api(`/api/inventory/${iid}`, 'DELETE'); showToast('Item deleted', 'info'); renderManageInventory();
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
  const [halls, inventory] = await Promise.all([api('/api/halls'), api('/api/inventory')]);
  _allHalls = halls;
  const availHalls = halls.filter(h => !h.locked);
  const itItems = inventory.filter(i => i.dept === 'it');
  const recItems = inventory.filter(i => i.dept === 'reception');

  document.getElementById('pageContent').innerHTML = `
  <div style="max-width:960px">
    <div class="section-header" style="margin-bottom:24px">
      <div>
        <div class="section-title">📋 New Event Booking Form</div>
        <div class="section-sub">Fill all details — halls are suggested based on expected attendance</div>
      </div>
    </div>

    <!-- STEP 1: Basic Details -->
    <div class="form-card">
      <div class="form-card-title"><span class="step-badge">1</span> Event Details</div>
      <div class="form-grid" style="margin-top:18px">
        <div class="field" style="grid-column:1/-1">
          <label>Event Title *</label>
          <input id="evTitle" placeholder="e.g. Annual Tech Fest 2025">
        </div>
        <div class="field">
          <label>Event Coordinator *</label>
          <input id="evCoord" placeholder="Name of event coordinator">
        </div>
        <div class="field">
          <label>Expected Attendance *</label>
          <input id="evCount" type="number" min="1" placeholder="e.g. 120" oninput="onCountChange(this.value)">
        </div>
        <div class="field">
          <label>Date *</label>
          <input id="evDate" type="date" min="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="field">
          <label>Time Slot *</label>
          <select id="evSlot">
            <option>9:00 AM - 12:00 PM</option>
            <option>12:00 PM - 3:00 PM</option>
            <option>3:00 PM - 6:00 PM</option>
            <option>9:00 AM - 6:00 PM (Full Day)</option>
          </select>
        </div>
        <div class="field">
          <label>Budget (₹)</label>
          <input id="evBudget" type="number" placeholder="50000">
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>Event Description</label>
          <textarea id="evDesc" placeholder="Brief description of the event…"></textarea>
        </div>
      </div>

      <!-- Yes/No Requirements -->
      <div style="margin-top:20px;border-top:1.5px dashed var(--border);padding-top:18px">
        <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:14px">Special Requirements</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
          ${yesNoRow('evIntro', '🎬', 'Introduction Video / KPR Anthem')}
          ${yesNoRow('evDance', '💃', 'Dance Performance')}
          ${yesNoRow('evPhotos', '📷', 'Photography Required')}
          ${yesNoRow('evVideo', '🎥', 'Videography Required')}
        </div>
      </div>
    </div>

    <!-- STEP 2: Hall Selection -->
    <div class="form-card" style="margin-top:20px">
      <div class="form-card-title"><span class="step-badge">2</span> Select Hall / Venue</div>
      <div id="hallSuggestionBanner" style="display:none" class="suggest-banner"></div>
      <div id="hallGrid" class="hall-select-grid" style="margin-top:16px">
        ${availHalls.map(h => hallSelectCard(h)).join('')}
      </div>
      <input type="hidden" id="evHall">
      <div id="hallPreview" style="display:none;margin-top:16px"></div>
    </div>

    <!-- STEP 3: IT Requirements -->
    <div class="form-card" style="margin-top:20px">
      <div class="form-card-title"><span class="step-badge">3</span> IT Requirements</div>
      <div class="req-table" style="margin-top:16px">
        <div class="req-header"><span>Particulars</span><span style="text-align:center">Available</span><span style="text-align:center">Count</span></div>
        ${itItems.map(i => reqRow(i)).join('')}
      </div>
    </div>

    <!-- STEP 4: Stationary / Reception Requirements -->
    <div class="form-card" style="margin-top:20px">
      <div class="form-card-title"><span class="step-badge">4</span> Stationary &amp; Reception Requirements</div>
      <div class="req-table" style="margin-top:16px">
        <div class="req-header"><span>Particulars</span><span style="text-align:center">Available</span><span style="text-align:center">Count</span></div>
        ${recItems.map(i => reqRow(i)).join('')}
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end;padding-bottom:40px">
      <button class="btn btn-outline" onclick="navigateTo('my-events')">✕ Cancel</button>
      <button class="btn btn-primary" onclick="submitNewEvent()">🚀 Submit Booking Proposal</button>
    </div>
  </div>`;
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

function selectHall(hid, hname, hcap) {
  document.getElementById('evHall').value = hid;
  // Highlight selected
  document.querySelectorAll('.hall-pick-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('hcard_' + hid);
  if (card) card.classList.add('selected');
  // Show preview
  const hall = _allHalls.find(h => h.id === hid);
  const img = getHallImage(hall);
  document.getElementById('hallPreview').style.display = 'block';
  document.getElementById('hallPreview').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--accent-lt);border:1.5px solid var(--accent-mid);border-radius:10px">
      <img src="${img}" style="width:80px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">
      <div>
        <div style="font-weight:700;color:var(--accent)">✓ Selected: ${hname}</div>
        <div style="font-size:0.8rem;color:var(--muted);margin-top:3px">Capacity: ${hcap} · ${hall.type}</div>
      </div>
    </div>`;
}

function onCountChange(val) {
  const count = parseInt(val) || 0;
  if (!count) return;
  const banner = document.getElementById('hallSuggestionBanner');

  // Determine suitable halls
  const suitable = _allHalls.filter(h => !h.locked && h.capacity >= count);
  suitable.sort((a, b) => a.capacity - b.capacity);
  const best = suitable[0];

  if (best) {
    banner.style.display = 'block';
    banner.innerHTML = `
      <span>💡 For <strong>${count} attendees</strong>, we suggest:</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        ${suitable.slice(0, 4).map(h => `
          <button class="btn btn-outline btn-sm" onclick="selectHall('${h.id}','${h.name.replace(/'/g, "\\'")}',${h.capacity})" style="font-size:0.78rem">
            ${h.name} <span style="opacity:0.6">(${h.capacity})</span>
          </button>`).join('')}
      </div>`;
    // Highlight suggested in grid
    document.querySelectorAll('.hall-pick-card').forEach(c => {
      const hid = c.id.replace('hcard_', '');
      c.classList.toggle('suggested', suitable.some(h => h.id === hid));
    });
  } else {
    banner.style.display = 'block';
    banner.innerHTML = `<span style="color:var(--red)">⚠️ No available hall can accommodate <strong>${count}</strong> attendees. Please contact admin.</span>`;
    document.querySelectorAll('.hall-pick-card').forEach(c => c.classList.remove('suggested'));
  }
}

function reqRow(item) {
  return `
  <div class="req-row">
    <span class="req-name">${item.name}</span>
    <span class="req-avail" style="text-align:center">${item.available_qty}</span>
    <input class="item-qty-input" type="number" min="0" value="0" id="qty_${item.id}" placeholder="0">
  </div>`;
}

function inventoryRequestRow(item) {
  return `<div class="item-row">
    <div class="item-row-name">${item.name}</div>
    <div class="item-avail">Avail: <strong>${item.available_qty}</strong></div>
    <input class="item-qty-input" type="number" min="0" value="0" id="qty_${item.id}" placeholder="0">
  </div>`;
}
async function submitNewEvent() {
  const title = v('evTitle'), date = v('evDate'), time_slot = v('evSlot'), hall_id = v('evHall'), budget = v('evBudget');
  const coordinator = v('evCoord'), expected_count = v('evCount');
  if (!title || !date || !hall_id) { showToast('Please fill Event Title, Date and select a Hall', 'error'); return; }
  if (!coordinator) { showToast('Please enter the Event Coordinator name', 'error'); return; }
  const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value === 'yes';
  const inventory = await api('/api/inventory');
  const items = inventory.map(i => ({ item_id: i.id, qty: parseInt(document.getElementById('qty_' + i.id)?.value || 0) })).filter(i => i.qty > 0);
  const body = {
    title, date, time_slot, hall_id, budget: parseFloat(budget || 0),
    description: v('evDesc'), coordinator, expected_count: parseInt(expected_count) || 0,
    has_intro_video: getRadio('evIntro'),
    has_dance: getRadio('evDance'),
    has_photos: getRadio('evPhotos'),
    has_video: getRadio('evVideo'),
    items
  };
  await api('/api/events', 'POST', body);
  showToast('Event proposal submitted successfully!', 'success');
  navigateTo('my-events');
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
        <div><div class="section-title">${dept === 'it' ? 'IT' : 'Reception'} Inventory</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('inventory-${dept}')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddDeptInventory('${dept}')">➕ Add Item</button>
        </div>
      </div>
      <div class="cards-grid">
        ${items.map(i => {
    const pct = i.stock_qty > 0 ? Math.round((i.in_use / i.stock_qty) * 100) : 0;
    return `<div class="inv-card">
            <div class="inv-header">
              <div><div class="inv-name">${i.name}</div><span class="badge badge-${i.dept}">${i.dept.toUpperCase()}</span></div>
              <div class="inv-stock"><div class="inv-stock-num">${i.available_qty}</div><div class="inv-stock-label">available</div></div>
            </div>
            <div class="progress-bar"><div class="progress-fill ${pct > 80 ? 'high' : ''}" style="width:${pct}%"></div></div>
            <div class="inv-stats">
              <span>In use: <strong style="color:var(--gold)">${i.in_use}</strong></span>
              <span>Total: <strong>${i.stock_qty}</strong></span>
            </div>
            <div style="margin-top:12px">
              <button class="btn btn-outline btn-sm" onclick="openEditInventory('${i.id}')">Update Stock</button>
            </div>
          </div>`;
  }).join('')}
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
  const returned = events.filter(e => e.requested_items.some(i => i.dept === dept && i.returned));
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Pending Returns</div><div class="section-sub">Mark items as returned after event</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('returns-${dept}')">📄 Returns Report</button>
        </div>
      </div>
      ${returnable.length === 0 ? emptyState('📦', 'Nothing to return', 'All items have been returned.') :
      `<div class="cards-grid">${returnable.map(e => `
          <div class="event-card status-approved">
            <div class="event-card-header">
              <div class="event-title">${e.title}</div>
              <span class="badge badge-approved">Approved</span>
            </div>
            <div class="event-meta">
              <span class="event-meta-item">📅 ${e.date}</span>
              <span class="event-meta-item">🏛️ ${e.hall_name}</span>
            </div>
            <div style="margin-top:12px">
              ${e.requested_items.filter(i => i.dept === dept && i.dept_approved && !i.returned).map(i =>
        `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border2);font-size:0.855rem">
                  <span style="color:var(--text2)">${i.item_name}</span>
                  <span style="color:var(--gold);font-weight:700">× ${i.allocated_qty}</span>
                </div>`).join('')}
            </div>
            <div class="event-actions">
              <button class="btn btn-success" onclick="processReturn('${e.id}','${dept}')">✅ Mark as Returned</button>
            </div>
          </div>`).join('')}`}
    </div>
    ${returned.length > 0 ? `
    <div class="section">
      <div class="section-header"><div class="section-title">Return History</div></div>
      <div class="table-wrap">
        <table><thead><tr><th>Event</th><th>Date</th><th>Items Returned</th></tr></thead>
        <tbody>${returned.map(e => `<tr>
          <td style="font-weight:600">${e.title}</td><td>${e.date}</td>
          <td style="color:var(--muted)">${e.requested_items.filter(i => i.dept === dept && i.returned).map(i => `${i.item_name} ×${i.allocated_qty}`).join(', ')}</td>
        </tr>`).join('')}</tbody></table>
      </div>
    </div>`: ''}`;
}
async function processReturn(eid, dept) {
  await api(`/api/events/${eid}/return`, 'POST');
  showToast('Items marked as returned', 'success');
  renderReturns(dept);
}

// ─── EVENT CARD ────────────────────────────────────────────────────────────────
// Compact clickable card — full details only in modal
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
      primaryBtn += `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();cancelEvent('${e.id}')">Cancel</button>`;
    }
    if (role === 'admin') {
      primaryBtn += `<button class="btn btn-report btn-sm" onclick="event.stopPropagation();downloadSingleEventReport('${e.id}')">📄</button>`;
    }
  }
  if (role === 'it' || role === 'reception') {
    if (e.status === 'dept_review') {
      const myPending = e.requested_items.filter(i => i.dept === role && !i.dept_approved);
      primaryBtn = myPending.length > 0 ?
        `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openAllocModal('${e.id}','${role}')">📦 Allocate</button>` :
        `<span class="badge badge-approved">✔ Allocated</span>`;
    }
    primaryBtn += `<button class="btn btn-report btn-sm" onclick="event.stopPropagation();downloadSingleEventReport('${e.id}')">📄</button>`;
  }

  // IT/Reception: show only name, date, time + their items (no budget/details)
  const isDepRole = (role === 'it' || role === 'reception');
  const myItems = isDepRole ? e.requested_items.filter(i => i.dept === role) : [];

  return `<div class="event-card status-${e.status}" onclick="viewEventDetail('${e.id}')" style="cursor:pointer">
    <div class="event-card-header">
      <div class="event-title">${e.title}</div>
      ${statusBadge}
    </div>
    <div class="event-meta">
      <span class="event-meta-item">📅 ${e.date}</span>
      <span class="event-meta-item">⏰ ${e.time_slot}</span>
      ${!isDepRole ? `<span class="event-meta-item">🏛️ ${e.hall_name}</span>` : ''}
      ${(!isDepRole && e.budget) ? `<span class="event-meta-item">💰 ₹${Number(e.budget).toLocaleString()}</span>` : ''}
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
    <div class="detail-section">
      <h4>Event Info</h4>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${e.date}</span></div>
      <div class="detail-row"><span class="detail-label">Time Slot</span><span class="detail-value">${e.time_slot}</span></div>
      <div class="detail-row"><span class="detail-label">Hall</span><span class="detail-value">${e.hall_name}</span></div>
      <div class="detail-row"><span class="detail-label">Budget</span><span class="detail-value" style="color:var(--gold)">₹${Number(e.budget).toLocaleString()}</span></div>
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
    if (el && invItem) el.innerHTML = `<strong style="color:var(--green)">${invItem.available_qty}</strong>`;
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
      <div class="amount">₹${Number(e.budget).toLocaleString()}</div>
      <div class="label">Proposed Event Budget</div>
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
  if (!confirm('Cancel this event proposal?')) return;
  await api(`/api/events/${eid}`, 'DELETE');
  showToast('Event cancelled', 'info');
  renderMyEvents();
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
            <div class="report-panel-title">KPR HUB Report Center</div>
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
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:'Plus Jakarta Sans',Arial,sans-serif; background:#fff; color:#0f172a; padding:40px; font-size:13px; line-height:1.5; }
      .rpt-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:20px; border-bottom:2px solid #2563eb; margin-bottom:28px; }
      .rpt-logo { display:flex; align-items:center; gap:12px; }
      .rpt-logo-box { width:44px; height:44px; background:linear-gradient(135deg,#2563eb,#1d4ed8); border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.2rem; color:#fff; }
      .rpt-brand { font-size:1.3rem; font-weight:800; color:#1e2d4e; }
      .rpt-brand span { color:#2563eb; }
      .rpt-meta { text-align:right; color:#64748b; font-size:0.78rem; }
      .rpt-meta strong { display:block; font-size:0.9rem; color:#0f172a; font-weight:700; margin-bottom:3px; }
      h2 { font-size:1.15rem; font-weight:800; color:#1e2d4e; margin:24px 0 14px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; }
      h3 { font-size:0.95rem; font-weight:700; color:#334155; margin:18px 0 10px; }
      table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:0.82rem; }
      th { background:#f8fafc; padding:9px 12px; text-align:left; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; border-bottom:2px solid #e2e8f0; }
      td { padding:9px 12px; border-bottom:1px solid #f1f5f9; color:#334155; }
      tr:hover td { background:#fafbff; }
      .badge { display:inline-flex; padding:2px 9px; border-radius:999px; font-size:0.68rem; font-weight:700; border:1px solid; }
      .b-approved { color:#065f46; background:#d1fae5; border-color:#6ee7b7; }
      .b-rejected  { color:#991b1b; background:#fee2e2; border-color:#fca5a5; }
      .b-pending   { color:#92400e; background:#fef3c7; border-color:#fcd34d; }
      .b-principal { color:#5b21b6; background:#ede9fe; border-color:#c4b5fd; }
      .b-it        { color:#1e40af; background:#dbeafe; border-color:#93c5fd; }
      .b-reception { color:#9d174d; background:#fce7f3; border-color:#f9a8d4; }
      .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
      .stat-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; }
      .stat-box .lbl { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; margin-bottom:6px; }
      .stat-box .val { font-size:1.6rem; font-weight:800; color:#0f172a; }
      .section-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px 18px; margin-bottom:16px; }
      .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9; }
      .row:last-child { border-bottom:none; }
      .lbl { color:#64748b; } .val { font-weight:700; }
      .print-btn { position:fixed; top:20px; right:20px; background:#2563eb; color:#fff; border:none; padding:10px 20px; border-radius:9px; font-family:inherit; font-size:0.875rem; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(37,99,235,0.4); }
      .print-btn:hover { background:#1d4ed8; }
      @media print { .print-btn { display:none; } body { padding:20px; } }
      .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e2e8f0; text-align:center; font-size:0.75rem; color:#94a3b8; }
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
  return `<div class="footer">KPR HUB — Event & Inventory Management System · KPRCAS · Confidential</div>`;
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
    'dept-it': events.filter(e => e.requested_items.some(i => i.dept === 'it')),
    'dept-reception': events.filter(e => e.requested_items.some(i => i.dept === 'reception')),
    'returns-it': events.filter(e => e.requested_items.some(i => i.dept === 'it' && i.dept_approved)),
    'returns-reception': events.filter(e => e.requested_items.some(i => i.dept === 'reception' && i.dept_approved)),
  };

  const reportTitles = {
    'all-events': 'Events Report', 'approved': 'Approved Events Report', 'pending': 'Pending Events Report',
    'inventory': 'Inventory Status Report', 'inventory-it': 'IT Inventory Report',
    'inventory-reception': 'Reception Inventory Report', 'users': 'Users Report', 'halls': 'Halls Report',
    'dept-it': 'IT Department Activity Report', 'dept-reception': 'Reception Department Activity Report',
    'returns-it': 'IT Returns Report', 'returns-reception': 'Reception Returns Report',
    'principal': 'Principal Decisions Report', 'my-events': 'My Events Report', 'full-summary': 'Full System Summary Report',
  };
  const title = reportTitles[type] || 'KPR HUB Report';

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
  if (['all-events', 'approved', 'pending', 'my-events', 'full-summary', 'dept-it', 'dept-reception', 'returns-it', 'returns-reception'].includes(type)) {
    const evSet = filtered[type] || events;
    body += `<h2>📅 Events (${evSet.length})</h2>
    <table><thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Hall</th><th>Budget</th><th>Organizer</th><th>Status</th></tr></thead>
    <tbody>${evSet.map(e => `<tr>
      <td style="font-weight:700">${e.title}</td>
      <td>${e.date}</td><td style="font-size:0.78rem">${e.time_slot}</td>
      <td>${e.hall_name}</td>
      <td>₹${Number(e.budget).toLocaleString()}</td>
      <td>${e.created_by_name}</td>
      <td>${statusBadgeHTML(e.status)}</td>
    </tr>`).join('')}</tbody></table>`;
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
    <table><thead><tr><th>Event</th><th>Date</th><th>Item</th><th>Requested</th><th>Allocated</th><th>Returned</th></tr></thead>
    <tbody>${deptEvents.flatMap(e => e.requested_items.filter(i => i.dept === dept && i.dept_approved).map(i => `<tr>
      <td style="font-weight:700">${e.title}</td><td>${e.date}</td>
      <td>${i.item_name}</td><td>${i.requested_qty}</td>
      <td style="color:#059669;font-weight:700">${i.allocated_qty}</td>
      <td>${i.returned ? '<span class="badge b-approved">✅ Returned</span>' : '<span class="badge b-pending">⏳ Pending</span>'}</td>
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

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} — KPR HUB</title>${reportStyles()}</head>
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
      <div class="row"><span class="lbl">Budget</span><span class="val" style="color:#d97706">₹${Number(e.budget).toLocaleString()}</span></div>
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

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Event Report: ${e.title} — KPR HUB</title>${reportStyles()}</head>
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
async function logout() { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/'; }

init();