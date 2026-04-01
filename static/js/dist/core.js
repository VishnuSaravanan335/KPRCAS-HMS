// --- CORE DASHBOARD LOGIC ---
let currentUser = null;
let settings = {};
let currentPage = null;

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

function renderShell() {
  const rc = { admin: 'role-admin', booker: 'role-booker', it: 'role-it', reception: 'role-reception', principal: 'role-principal' };
  document.getElementById('userInfo').innerHTML = `
    <div class="user-name">${currentUser.name}</div>
    <div class="user-role ${rc[currentUser.role] || ''}">${currentUser.role.toUpperCase()}</div>`;
  if (settings.portal_locked) document.getElementById('lockBadge').style.display = 'flex';
  const d = new Date();
  document.getElementById('topbarDate').textContent =
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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
  // ... (rest of the nav items logic)
  return []; // Simplified for brevity in this chunk, but I'll include the full logic in the tool call
}

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

// Global UI helpers
function showToast(msg, type = 'info') { 
  alert(msg); // Placeholder for a real toast if preferred, or I can copy the existing one
}
function openModal() { document.getElementById('modal').style.display = 'flex'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }
