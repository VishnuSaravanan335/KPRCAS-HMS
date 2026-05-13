// ─── OVERVIEW (ADMIN) ──────────────────────────────────────────────────────────
console.log("admin.js v1.0.1 loaded");
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
        <div><div class="section-title">Venues</div><div class="section-sub">${halls.length} halls available</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('halls')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddHall()">➕ Add Hall</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Capacity</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${halls.map(h => `<tr>
              <td style="font-weight:600">${h.name}</td>
              <td>${h.capacity} seats</td>
              <td>${h.type}</td>
              <td><span class="badge ${h.locked ? 'badge-it' : 'badge-green'}">${h.locked ? '🔒 Locked' : '🟢 Open'}</span></td>
              <td><div class="td-actions">
                <button class="btn btn-outline btn-sm" onclick="openEditHall('${h.id}')">Edit</button>
                <button class="btn btn-outline btn-sm" onclick="toggleHallLock('${h.id}',${h.locked})">${h.locked ? 'Unlock' : 'Lock'}</button>
                <button class="btn btn-danger btn-sm" onclick="deleteHall('${h.id}','${h.name}')">Delete</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
function openAddHall() {
  document.getElementById('modalTitle').textContent = 'Add New Hall';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Hall Name</label><input id="hName" placeholder="Seminar Hall I"></div>
      <div class="field"><label>Capacity</label><input id="hCap" type="number" placeholder="200"></div>
      <div class="field"><label>Type</label><select id="hType"><option>Seminar</option><option>Open Air</option><option>Lab</option><option>Auditorium</option><option>Conference</option></select></div>
    </div>
    <div class="modal-footer" style="padding:0;margin-top:20px;">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddHall()">Create Hall</button>
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

// ─── SCHOOLS & DEPARTMENTS ───────────────────────────────────────────────────
async function renderManageSchools() {
  const h = await api('/api/hierarchy');
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div>
          <div class="section-title">Institutional Hierarchy</div>
          <div class="section-sub">Manage Schools and their constituent Departments</div>
        </div>
        <button class="btn btn-primary" onclick="openAddSchoolModal()">➕ Add School</button>
      </div>
      <div class="cards-grid" style="grid-template-columns: repeat(4, 1fr);">
        ${Object.entries(h).map(([school, depts]) => `
          <div class="inst-hierarchy-card inst-animate">
            <div class="inst-card-header">
              <div class="inst-school-title">${school}</div>
              <button class="inst-delete-btn" onclick="deleteSchool('${esc(school)}')">Delete</button>
            </div>
            <div class="inst-body">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${depts.map(d => `
                  <div class="inst-dept-item">
                    <span class="inst-dept-name">${d}</span>
                    <button class="inst-dept-remove" onclick="deleteDept('${esc(school)}', '${esc(d)}')" title="Remove Department">✕</button>
                  </div>
                `).join('')}
                <button class="inst-add-dept-btn" onclick="openAddDeptModal('${esc(school)}')">
                  <span>➕</span> Add Department
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function openAddSchoolModal() {
  showPromptModal('Add New School', 'Enter the name of the new School (e.g., School of Business):', 'School Name', async (name) => {
    const h = await api('/api/hierarchy');
    if (h[name]) { showToast('School already exists', 'error'); return; }
    h[name] = [];
    await api('/api/hierarchy', 'PUT', h);
    showToast('School added', 'success');
    renderManageSchools();
  });
}

function openAddDeptModal(school) {
  showPromptModal('Add Department', `Add a department to ${school}:`, 'Department Name', async (dept) => {
    const h = await api('/api/hierarchy');
    if (h[school].includes(dept)) { showToast('Department already exists', 'error'); return; }
    h[school].push(dept);
    await api('/api/hierarchy', 'PUT', h);
    showToast('Department added', 'success');
    renderManageSchools();
  });
}

async function deleteSchool(school) {
  showConfirmModal('Delete School', `Are you sure you want to delete ${school} and all its departments?`, async () => {
    const h = await api('/api/hierarchy');
    delete h[school];
    await api('/api/hierarchy', 'PUT', h);
    showToast('School deleted', 'info');
    renderManageSchools();
  });
}

async function deleteDept(school, dept) {
  showConfirmModal('Delete Department', `Remove ${dept} from ${school}?`, async () => {
    const h = await api('/api/hierarchy');
    h[school] = h[school].filter(d => d !== dept);
    await api('/api/hierarchy', 'PUT', h);
    showToast('Department removed', 'info');
    renderManageSchools();
  });
}
