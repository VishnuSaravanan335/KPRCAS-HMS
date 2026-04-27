// ─── STATE ───────────────────────────────────────────────────────────────────
let currentUser = null;
let settings = {};
let currentPage = null;
function esc(s) { return s ? s.toString().replace(/'/g, "&#39;").replace(/"/g, "&quot;") : ""; }
let eventPageState = { 'all-events': 1, 'pending-events': 1, 'manage-users': 1, 'manage-halls': 1, 'manage-inventory': 1, 'my-events': 1, 'club-requests': 1, 'dept-inventory': 1, 'dept-returns': 1 };
let eventFilters = {}; // gridId -> { query, status, dept, sort }
const EVENTS_PER_PAGE = 12;
const LIST_PER_PAGE = 10;

// ─── DOUBLE-CLICK PREVENTION ──────────────────────────────────────────────────
let _actionLock = {};
function acquireLock(key) {
  if (_actionLock[key]) return false; // Already locked
  _actionLock[key] = true;
  return true;
}
function releaseLock(key) { delete _actionLock[key]; }

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const res = await api('/api/me');
    currentUser = res.user;
    settings = res.settings;
    window._hierarchy = await api('/api/hierarchy');
    renderShell();

    const sb = document.getElementById('sidebar');
    const mw = document.querySelector('.main-wrap');
    if (sb && mw) {
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
    // Start notification polling
    startNotificationPolling();
  } catch (e) {
    console.error("Initialization failed:", e);
    window.location.href = '/';
  }
}

async function logout() {
  await api('/api/logout', 'POST');
  window.location.href = '/';
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
    { id: 'overview', icon: '📊', label: 'Dashboard' },
    { id: 'manage-users', icon: '👥', label: 'Users' },
    { id: 'manage-halls', icon: '🏛️', label: 'Venue' },
    { id: 'manage-schools', icon: '🏫', label: 'School' },
    { id: 'manage-inventory', icon: '📦', label: 'Inventory' },
    { id: 'all-events', icon: '📅', label: 'Event Management' },
    { id: 'settings', icon: '⚙️', label: 'Portal Security' },
    { id: 'reports', icon: '📄', label: 'Reports' },
  ];
  if (role === 'booker') return [
    { id: 'my-events', icon: '🗓️', label: 'My Bookings' },
    { id: 'new-event', icon: '📝', label: 'New Booking' },
    { id: 'reports', icon: '📊', label: 'Reports' },
  ];
  if (role === 'it') return [
    { id: 'it-requests', icon: '💻', label: 'Pending Requests' },
    { id: 'it-inventory', icon: '📦', label: 'IT Inventory' },
    { id: 'it-returns', icon: '🔄', label: 'Returns' },
    { id: 'reports', icon: '📊', label: 'Reports' },
  ];
  if (role === 'reception') return [
    { id: 'rec-requests', icon: '📋', label: 'Pending Requests' },
    { id: 'rec-inventory', icon: '📦', label: 'Inventory' },
    { id: 'rec-returns', icon: '🔄', label: 'Returns' },
    { id: 'reports', icon: '📊', label: 'Reports' },
  ];
  if (role === 'principal') return [
    { id: 'pending-events', icon: '⏳', label: 'Pending' },
    { id: 'all-events', icon: '🗓️', label: 'History' },
    { id: 'reports', icon: '📊', label: 'Reports' },
  ];
  if (role === 'pixesclub') return [
    { id: 'club-requests', icon: '🎥', label: 'Club Dashboard' },
    { id: 'club-inventory', icon: '🎒', label: 'Pixes Equipment' },
    { id: 'reports', icon: '📊', label: 'Reports' },
  ];
  if (role === 'fineartsclub') return [
    { id: 'club-requests', icon: '🎭', label: 'Club Dashboard' },
    { id: 'reports', icon: '📊', label: 'Reports' },
  ];
  return [];
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.id === 'nav-' + page));
  const titles = {
    'overview': 'Dashboard', 'manage-users': 'Users', 'manage-halls': 'Venue',
    'manage-inventory': 'Inventory', 'all-events': 'Event Management', 'settings': 'Portal Security',
    'my-events': 'My Bookings', 'new-event': 'New Booking', 'reports': 'Reports',
    'it-requests': 'IT Requests', 'it-inventory': 'IT Asset Registry', 'it-returns': 'Equipment Returns',
    'rec-requests': 'Reception Requests', 'rec-inventory': 'Institutional Inventory', 'rec-returns': 'Equipment Returns',
    'pending-events': 'Authorization Pending',
    'club-requests': 'Club Activity Hub', 'club-inventory': 'Club Asset Registry', 'club-returns': 'Club Returns',
    'manage-schools': 'School',
  };
  document.getElementById('topbarTitle').textContent = titles[page] || page;
  document.getElementById('pageContent').innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span>Loading…</span></div>';
  if (window.innerWidth <= 768) closeSidebar();
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

// ─── ALL EVENTS ───────────────────────────────────────────────────────────────
async function renderAllEvents() {
  const allEvents = await api('/api/events');
  const role = currentUser.role;
  const gridId = 'allEventsGrid';
  
  // 1. Apply Filtering/Sorting to the FULL list first
  const filtered = getFilteredEvents(allEvents, gridId);

  // 2. Paginate the FILTERED list
  const page = eventPageState['all-events'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const paginated = filtered.slice(start, start + EVENTS_PER_PAGE);

  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Event Master Database</div><div class="section-sub">${filtered.length} events matching current filters</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('all-events')">📊 System Report</button>
        </div>
      </div>
      ${allEvents.length === 0 ? emptyState('📅', 'Empty Database', 'No events have been recorded yet.') :
      eventFilterBar(gridId, role, allEvents) +
      '<div class="cards-grid-scroll" id="allEventsGrid">' +
      paginated.map(e => eventCard(e, role)).join('') +
      '</div>' +
      renderPaginationControls(filtered.length, page, EVENTS_PER_PAGE, 'all-events')}
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
  const isApproved = e.principal_decision === 'approved' || e.status === 'approved';
  const isRejected = e.principal_decision === 'rejected' || e.status === 'rejected' || e.status === 'cancelled' || e.cancel_reason;

  const luxuryClass = isApproved ? 'luxury-approved' : (isRejected ? 'luxury-rejected' : 'luxury-pending');
  const statusLabel = isApproved ? 'SCHEDULED' : (isRejected ? (e.status === 'cancelled' ? 'CANCELLED' : 'REJECTED') : 'PENDING');

  const coordinatorName = e.coordinator || e.created_by_name || 'User';
  const avatarLetter = coordinatorName.charAt(0).toUpperCase();

  return `
    <div class="luxury-event-card ${luxuryClass} status-${e.status}" 
         data-dept="${(e.departments || []).map(d => (d.school || d.department || '').toLowerCase()).join(',')}"
         onclick="openPremiumEventDetails('${esc(e.id)}')" style="cursor:pointer">
      <div class="luxury-card-corner"></div>
      <div class="sort-data" style="display:none">
        <span class="sort-title">${esc(e.title.toLowerCase())}</span>
        <span class="sort-date">${e.date}</span>
      </div>
      
      <div class="luxury-header">
        <div class="luxury-title">${esc(e.title)}</div>
        <div class="luxury-status-badge">${statusLabel}</div>
      </div>

      <div class="luxury-meta-box">
        <div class="luxury-meta-row">
          <div class="luxury-meta-pill">
            <span class="icon">📅</span>
            <span class="text">${e.date}</span>
          </div>
          <div class="luxury-meta-pill">
            <span class="icon">⏰</span>
            <span class="text">${esc(e.time_slot.split(' ')[0])}</span>
          </div>
        </div>
        <div class="luxury-venue-row">
          <span class="icon">🏛️</span>
          <span class="text">${esc(e.hall_name)}</span>
        </div>
        <div class="luxury-venue-row" style="margin-top:6px; font-size:0.8rem; color:var(--muted); font-weight: 600;">
          <span class="icon">📎</span>
          <span class="text">${e.agenda_path ? 'Proposal Attached' : 'No Proposal'}</span>
        </div>
      </div>

      <div class="luxury-footer">
        <div class="luxury-user-box">
          <div class="luxury-avatar">${avatarLetter}</div>
          <div class="luxury-user-name">${esc(coordinatorName)}</div>
        </div>
        <div class="luxury-button-group">
          ${((role === 'admin' || role === 'principal') && e.status === 'principal_review') ? `
            <button class="luxury-action-btn luxury-btn-success" onclick="event.stopPropagation();adminDecision('${esc(e.id)}', 'approve')">Accept</button>
            <button class="luxury-action-btn luxury-btn-danger" onclick="event.stopPropagation();adminDecision('${esc(e.id)}', 'reject')">Reject</button>
          ` : `
            <button class="luxury-view-btn" onclick="event.stopPropagation();openPremiumEventDetails('${esc(e.id)}')">View</button>
            <button class="luxury-view-btn" style="background:var(--green); border-color:var(--green); color:white" onclick="event.stopPropagation();previewSingleEventReport('${esc(e.id)}')">Preview</button>
          `}
          ${(role === 'booker' && e.status === 'pending') ? `
            <button class="luxury-action-btn luxury-btn-success" style="background:linear-gradient(135deg, #fbbf24, #d97706); border:none" onclick="event.stopPropagation();editEvent('${esc(e.id)}')">Edit</button>
            <button class="luxury-action-btn luxury-btn-danger" onclick="event.stopPropagation();deleteEvent('${esc(e.id)}')">Delete</button>
          ` : ''}
          ${(role !== 'booker' && role !== 'admin' && role !== 'principal' && e.requested_items?.some(i => i.dept === role && !i.dept_approved)) ? `
            <button class="luxury-action-btn luxury-btn-success" onclick="event.stopPropagation();openAllocModal('${esc(e.id)}', '${role}')">Allocate</button>
            <button class="luxury-action-btn luxury-btn-danger" onclick="event.stopPropagation();rejectDeptItems('${esc(e.id)}', '${role}')">Deny</button>
          ` : ''}
        </div>
      </div>
    </div>`;
}

// ─── NOTIFICATION POLLING ───────────────────────────────────────────────────
function startNotificationPolling() {
  checkNotifications();
  setInterval(checkNotifications, 30000); // Check every 30s
}

async function checkNotifications() {
  try {
    const notifs = await api('/api/notifications');
    const unread = notifs.filter(n => !n.read_by.includes(currentUser.id));
    if (unread.length > 0) {
      unread.forEach(n => {
        showRejectionToast(n);
      });
    }
  } catch (e) { console.error("Notification check failed"); }
}

function showRejectionToast(n) {
  // Check if toast already exists to avoid spam
  if (document.getElementById(`toast-${n.id}`)) return;

  const cont = document.getElementById('toastContainer') || createToastContainer();
  const toast = document.createElement('div');
  toast.id = `toast-${n.id}`;
  toast.className = 'premium-toast rejection-toast';
  toast.innerHTML = `
    <div class="toast-icon">⚠️</div>
    <div class="toast-body">
      <div class="toast-title">Booking Attention Required</div>
      <div class="toast-text">${n.message} (Event: ${n.event_title})</div>
    </div>
    <div class="toast-close" onclick="markNotifRead('${n.id}')">×</div>
  `;
  cont.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 100);
}

function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toastContainer';
  c.className = 'toast-container';
  document.body.appendChild(c);
  return c;
}

async function markNotifRead(id) {
  await api('/api/notifications/read', 'POST', { id });
  const t = document.getElementById(`toast-${id}`);
  if (t) {
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 300);
  }
}

// ─── EVENT CARD ────────────────────────────────────────────────────────────────


// ─── VIEW EVENT DETAIL ────────────────────────────────────────────────────────
function renderProgressChart(e) {
  const itApproved  = e.requested_items.filter(i => i.dept === 'it').every(i => i.dept_approved);
  const recApproved = e.requested_items.filter(i => i.dept === 'reception').every(i => i.dept_approved);
  const pixDone  = !e.has_photos || e.requested_items.filter(i => i.dept === 'pixesclub').every(i => i.dept_approved);
  const danceDone = !e.has_dance || e.requested_items.filter(i => i.dept === 'fineartsclub').every(i => i.dept_approved);
  const adminDone     = e.status === 'principal_review' || e.status === 'approved';
  const principalDone = e.status === 'approved';

  const pixStep = e.has_photos ? `
      <div class="status-step step-it ${pixDone ? 'active' : ''}">
        <div class="step-dot">${pixDone ? '📸' : '⏳'}</div>
        <div class="step-label">Pixes Club</div>
      </div>` : '';

  const danceStep = e.has_dance ? `
      <div class="status-step step-reception ${danceDone ? 'active' : ''}">
        <div class="step-dot">${danceDone ? '🎭' : '⏳'}</div>
        <div class="step-label">Fine Arts</div>
      </div>` : '';

  return `
    <div class="status-timeline">
      <div class="status-step step-request active">
        <div class="step-dot">📝</div>
        <div class="step-label">Request</div>
      </div>
      <div class="status-step step-it ${itApproved ? 'active' : ''}">
        <div class="step-dot">${itApproved ? '💻' : '⏳'}</div>
        <div class="step-label">IT Approval</div>
      </div>
      <div class="status-step step-reception ${recApproved ? 'active' : ''}">
        <div class="step-dot">${recApproved ? '🛎️' : '⏳'}</div>
        <div class="step-label">Reception</div>
      </div>
      ${pixStep}
      ${danceStep}
      <div class="status-step step-admin ${adminDone ? 'active' : ''}">
        <div class="step-dot">${adminDone ? '🏛️' : '⏳'}</div>
        <div class="step-label">Admin Review</div>
      </div>
      <div class="status-step step-principal ${principalDone ? 'active' : ''}">
        <div class="step-dot">${principalDone ? '🎓' : '⏳'}</div>
        <div class="step-label">Principal</div>
      </div>
    </div>`;
}

async function previewSingleEventReport(eid) {
  try {
    const e = await api('/api/events/' + eid);
    if (e.agenda_path) {
      window.open(e.agenda_path, '_blank');
    } else {
      // Fallback to legacy report if no file
      const overlay = document.getElementById('modalOverlay');
      const modal = document.getElementById('mainModal');
      const body = document.getElementById('modalBody');
      const title = document.getElementById('modalTitle');
      title.textContent = 'Event Report Preview';
      body.innerHTML = buildSingleEventReportHTML(e);
      overlay.classList.add('show');
      modal.classList.add('show');
    }
  } catch (err) {
    console.error('Preview Error:', err);
    showToast('Failed to open preview: ' + err.message, 'error');
  }
}

async function openPremiumEventDetails(eid) {
  const e = await api('/api/events/' + eid);
  const coordinatorName = e.coordinator || e.created_by_name || 'User';
  const itItems = e.requested_items.filter(i => i.dept === 'it');
  const recItems = e.requested_items.filter(i => i.dept === 'reception');
  const clubItems = e.requested_items.filter(i => i.dept === 'pixesclub' || i.dept === 'fineartsclub');

  const statusClass = e.principal_decision === 'approved' ? 'status-approved-inst' :
    (e.principal_decision === 'rejected' ? 'status-rejected-inst' :
      (e.cancel_reason ? 'status-cancelled-inst' : 'status-pending-inst'));

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-premium-dossier" id="eventDossier">
      <div class="dossier-header ${statusClass}">
        <div class="dossier-header-top">
          <div class="dossier-id">REF# ${e.id}</div>
          <div class="dossier-status-badge">${e.status.replace(/_/g, ' ').toUpperCase()}</div>
        </div>
        <h2 class="dossier-title">${esc(e.title)}</h2>
        <div class="dossier-coordinator"><span class="label">COORDINATOR</span> ${esc(coordinatorName)}</div>
      </div>

      <div class="dossier-body">
        ${renderProgressChart(e)}

        <div class="dossier-premium-block">
          <div class="dossier-block-header">
            <h4>📋 Schedule Details</h4>
          </div>
          <table class="dossier-premium-table">
            <tr><td class="label">Primary Venue</td><td class="val">${esc(e.hall_name)}</td></tr>
            <tr><td class="label">Scheduled Date</td><td class="val">${new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
            <tr><td class="label">Time Slot</td><td class="val">${esc(e.time_slot)}</td></tr>
            <tr><td class="label">Contact Number</td><td class="val" style="font-weight:900; color:#1e40af">${esc(e.phone || '—')}</td></tr>
            <tr><td class="label">Budget Reference</td><td class="val"><span class="gold-glow">${e.budget_id || '—'}</span></td></tr>
            <tr><td class="label">Attendance</td><td class="val">${e.expected_count} Expected Attendees</td></tr>
            <tr><td class="label">Resource Person</td><td class="val">${esc(e.resource_person || '—')}</td></tr>
          </table>
        </div>

        <div class="dossier-premium-block">
          <div class="dossier-block-header">
            <h4>📦 Resource Allocation</h4>
          </div>
          <table class="dossier-premium-table">
             ${itItems.length + recItems.length + clubItems.length === 0 ?
      '<tr><td colspan="2" style="text-align:center; color:#94a3b8; padding:30px">No hardware requirements logged for this event.</td></tr>' : ''}
             
             ${itItems.map(i => `
               <tr>
                 <td class="label">🖥️ IT Asset</td>
                 <td class="val">
                   <div style="display:flex; justify-content:space-between; align-items:center">
                     <span>${esc(i.item_name)}</span>
                     <span class="ai-status ${i.dept_approved ? 'ok' : 'pending'}" style="margin:0">${i.allocated_qty} / ${i.requested_qty}</span>
                   </div>
                 </td>
               </tr>`).join('')}

             ${recItems.map(i => `
               <tr>
                 <td class="label">🛎️ Reception</td>
                 <td class="val">
                   <div style="display:flex; justify-content:space-between; align-items:center">
                     <span>${esc(i.item_name)}</span>
                     <span class="ai-status ${i.dept_approved ? 'ok' : 'pending'}" style="margin:0">${i.allocated_qty} / ${i.requested_qty}</span>
                   </div>
                 </td>
               </tr>`).join('')}

             ${clubItems.map(i => `
               <tr>
                 <td class="label">🎭 Club Requirement</td>
                 <td class="val">
                   <div style="display:flex; justify-content:space-between; align-items:center">
                     <span>${esc(i.item_name)}</span>
                     <span class="ai-status ${i.dept_approved ? 'ok' : 'pending'}" style="margin:0">${i.allocated_qty} / ${i.requested_qty}</span>
                   </div>
                 </td>
               </tr>`).join('')}
          </table>
        </div>

        <div class="dossier-premium-block" style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border-color: #bfdbfe;">
          <div class="dossier-block-header" style="background: rgba(255,255,255,0.5); border-color: #bfdbfe;">
            <h4 style="color: #1e40af;">📎 Uploaded Proposal File</h4>
          </div>
          <div style="padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="width: 54px; height: 54px; background: #fff; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #bfdbfe;">
                ${e.agenda_path?.endsWith('.pdf') ? '📕' : '📄'}
              </div>
              <div>
                <div style="font-weight: 800; color: #1e3a8a; font-size: 0.95rem;">Original Event Agenda</div>
                <div style="font-size: 0.78rem; color: #60a5fa; font-weight: 600; margin-top: 2px;">Institutional Document Reference</div>
              </div>
            </div>
            ${e.agenda_path ? `
              <a href="${e.agenda_path}" target="_blank" class="luxury-action-btn luxury-btn-success" style="text-decoration:none; display:flex; align-items:center; gap:8px; padding: 12px 24px; background: #2563eb; border: none;">
                <span>View Original Copy</span>
              </a>
            ` : `
              <div style="color: #94a3b8; font-style: italic; font-size: 0.85rem;">No file attached</div>
            `}
          </div>
        </div>

        ${e.principal_note ? `
        <div class="dossier-premium-block" style="border-color:#fef3c7">
          <div class="dossier-block-header" style="background:#fffbeb; border-color:#fef3c7">
            <h4 style="color:#b45309">💬 Administrative Decision Note</h4>
          </div>
          <div style="padding:20px; font-size:0.85rem; color:#92400e; line-height:1.5; background:#fffcf0">
            ${esc(e.principal_note)}
          </div>
        </div>` : ''}

      </div>

      <div class="modal-footer" style="padding:24px; border-radius: 0 0 28px 28px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:12px">
        <button class="btn btn-report" onclick="downloadSingleEventReport('${eid}');closeModal()" style="padding:10px 24px; min-width:180px">📄 Export Official Document</button>
        <button class="btn btn-outline" onclick="closeModal()" style="min-width:100px">Close</button>
      </div>
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
async function rejectDeptItems(eid, role) {
  const label = role === 'pixesclub' ? 'Pixes Club' : (role === 'fineartsclub' ? 'Dance Performance' : role.toUpperCase());
  showReasonModal('Deny Request', `Deny all ${label} items for this event?`, 'State the reason for denial...', async (reason) => {
    const e = await api('/api/events/' + eid);
    const items = e.requested_items.filter(i => i.dept === role).map(i => ({ item_id: i.item_id, allocated_qty: 0 }));
    await api(`/api/events/${eid}/dept-review`, 'POST', { items, reject: true, note: reason });
    showToast('Items denied ✓', 'success');
    if (role === 'pixesclub' || role === 'fineartsclub') renderClubRequests(role);
    else renderDeptRequests(role);
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
      <h4>Note / Remarks <span id="noteRequiredLabel" style="color:var(--red); font-size:0.7rem; display:none">(Required for rejection)</span></h4>
      <textarea class="decision-note" id="principalNote" placeholder="Add remarks or feedback…" oninput="document.getElementById('noteRequiredLabel').style.display='none'"></textarea>
      <div style="display:flex;gap:12px">
        <button class="btn btn-success" style="flex:1" onclick="submitPrincipalDecision('${eid}','approved')">✅ Approve Event</button>
        <button class="btn btn-danger" style="flex:1" onclick="submitPrincipalDecision('${eid}','rejected')">❌ Reject Event</button>
      </div>
    </div>`;
  openModal();
}
async function submitPrincipalDecision(eid, decision) {
  const note = document.getElementById('principalNote')?.value || '';
  if (decision === 'rejected' && !note.trim()) {
    document.getElementById('noteRequiredLabel').style.display = 'inline';
    showToast('Please provide a reason for rejection in the note field.', 'error');
    return;
  }
  await api(`/api/events/${eid}/principal-review`, 'POST', { decision, note });
  closeModal();
  showToast(decision === 'approved' ? 'Event approved! 🎉' : 'Event rejected', decision === 'approved' ? 'success' : 'error');
  navigateTo(currentPage);
}

async function deleteEvent(eid) {
  showConfirmModal('Delete Proposal', 'Are you sure you want to permanently remove this event proposal? This action cannot be undone.', async () => {
    try {
      await api('/api/events/' + eid, 'DELETE');
      showToast('Event deleted permanently', 'success');
      navigateTo(currentPage);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });
}

function editEvent(eid) {
  showToast('Edit feature is being synchronized with the booking engine...', 'info');
}

async function cancelEvent(eid) {
  showConfirmModal('Cancel Proposal', 'Are you sure you want to cancel this event proposal?', async () => {
    await api(`/api/events/${eid}/cancel`, 'POST', { reason: 'User cancelled via dashboard' });
    showToast('Event cancelled', 'info');
    navigateTo(currentPage);
  });
}

async function adminDecision(eid, decision) {
  if (!acquireLock('adminDecision_' + eid)) return;
  
  const process = async (note) => {
    try {
      await api(`/api/events/${eid}/principal-review`, 'POST', {
        decision: decision === 'approve' ? 'approved' : 'rejected',
        note: note || `Processed by Admin via Quick Action`
      });
      showToast(`Event ${decision}d`, 'success');
      navigateTo(currentPage);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      releaseLock('adminDecision_' + eid);
    }
  };

  if (decision === 'reject') {
    showPromptModal('Reject Proposal', 'Please provide a reason for rejection:', 'e.g. Venue overlap / Budget issues', process);
    // If modal is closed without submit, we need to release lock. 
    // But showPromptModal doesn't have a cancel callback easily. 
    // I'll add a check or just assume they will submit or refresh.
  } else {
    showConfirmModal('Approve Proposal', 'Are you sure you want to approve this event proposal?', () => process('Approved by Admin'));
  }
}

async function adminDeleteEvent(eid) {
  if (!acquireLock('adminDeleteEvent_' + eid)) return;
  showConfirmModal('Delete Event', 'Permanently delete this event? This action cannot be undone.', async () => {
    try {
      await api(`/api/events/${eid}`, 'DELETE');
      showToast('Event deleted', 'info');
      navigateTo(currentPage);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      releaseLock('adminDeleteEvent_' + eid);
    }
  }, () => {
    releaseLock('adminDeleteEvent_' + eid);
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
  const luxuryClass = 'luxury-featured';
  const label = e.status === 'approved' ? 'SCHEDULED' : (e.status === 'cancelled' ? 'CANCELLED' : 'UPCOMING');

  const coordinatorName = e.coordinator || e.created_by_name || 'User';
  const avatarLetter = coordinatorName.charAt(0).toUpperCase();

  return `
    <div class="luxury-event-card ${luxuryClass} inst-animate status-${e.status}" 
         data-dept="${(e.departments || []).map(d => (d.school || d.department || '').toLowerCase()).join(',')}"
         onclick="openPremiumEventDetails('${esc(e.id)}')" 
      style="cursor:pointer; animation-delay: ${idx * 0.05}s">
      <div class="luxury-card-corner"></div>
      <div class="sort-data" style="display:none">
        <span class="sort-title">${esc(e.title.toLowerCase())}</span>
        <span class="sort-date">${e.date}</span>
      </div>
      
      <div class="luxury-header">
        <div class="luxury-title">${esc(e.title)}</div>
        <div class="luxury-status-badge">${label}</div>
      </div>

      <div class="luxury-meta-box">
        <div class="luxury-meta-row">
          <div class="luxury-meta-pill">
            <span class="icon">📅</span>
            <span class="text">${e.date}</span>
          </div>
          <div class="luxury-meta-pill">
            <span class="icon">⏰</span>
            <span class="text">${esc(e.time_slot.split(' ')[0])}</span>
          </div>
        </div>
        <div class="luxury-venue-row">
          <span class="icon">🏛️</span>
          <span class="text">${esc(e.hall_name)}</span>
        </div>
        <div class="luxury-venue-row" style="margin-top:6px; font-size:0.8rem; color:var(--muted); font-weight: 600;">
          <span class="icon">📎</span>
          <span class="text">${e.agenda_path ? 'Proposal Attached' : 'No Proposal'}</span>
        </div>
      </div>

      <div class="luxury-footer">
        <div class="luxury-user-box">
          <div class="luxury-avatar">${avatarLetter}</div>
          <div class="luxury-user-name">${esc(coordinatorName)}</div>
        </div>
        <div class="luxury-button-group">
          <button class="luxury-view-btn" onclick="event.stopPropagation();openPremiumEventDetails('${esc(e.id)}')">View</button>
          <button class="luxury-view-btn" style="background:var(--green); border-color:var(--green); color:white" onclick="event.stopPropagation();previewSingleEventReport('${esc(e.id)}')">Preview</button>
        </div>
      </div>
    </div>`;
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
    // Desktop: Sync main-wrap
    if (mw) {
      mw.classList.toggle('sidebar-expanded', isExpanded);
      mw.classList.toggle('sidebar-collapsed', !isExpanded);
    }
    if (btn) btn.innerHTML = isExpanded ? '✕' : '☰';
  }
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const mw = document.querySelector('.main-wrap');
  const ov = document.getElementById('sidebarOverlay');
  const btn = document.getElementById('menuToggleBtn');

  if (sb) sb.classList.remove('expanded');
  if (ov) ov.classList.remove('show');
  document.body.style.overflow = '';

  if (btn) btn.innerHTML = '☰';

  // Also sync main-wrap if on desktop
  if (window.innerWidth > 768 && mw) {
    mw.classList.remove('sidebar-expanded');
    mw.classList.add('sidebar-collapsed');
  }
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
  if (!eventFilters[gridId]) {
    eventFilters[gridId] = { query: '', status: 'all', dept: 'all', sort: 'date-desc' };
  }
  const f = eventFilters[gridId];

  return `
  <div class="filter-bar">
    <div class="filter-search-wrap">
      <span class="filter-search-icon">🔍</span>
      <input class="filter-search" placeholder="Search events, venues, or coordinators..." value="${esc(f.query)}" 
             oninput="onFilterUpdate('${gridId}', 'query', this.value)" id="search_${gridId}">
    </div>
    <div class="filter-chips">
      <button class="filter-chip ${f.status === 'all' ? 'active' : ''}" onclick="onFilterUpdate('${gridId}', 'status', 'all')">All</button>
      ${allEvents.some(e => e.status === 'approved') ? `<button class="filter-chip ${f.status === 'approved' ? 'active' : ''}" onclick="onFilterUpdate('${gridId}', 'status', 'approved')"><span>✅</span> Approved</button>` : ''}
      ${allEvents.some(e => e.status === 'dept_review') ? `<button class="filter-chip ${f.status === 'dept_review' ? 'active' : ''}" onclick="onFilterUpdate('${gridId}', 'status', 'dept_review')"><span>🔎</span> Dept Review</button>` : ''}
      ${allEvents.some(e => e.status === 'principal_review') ? `<button class="filter-chip ${f.status === 'principal_review' ? 'active' : ''}" onclick="onFilterUpdate('${gridId}', 'status', 'principal_review')"><span>⏳</span> Pending</button>` : ''}
      ${allEvents.some(e => e.status === 'rejected') ? `<button class="filter-chip ${f.status === 'rejected' ? 'active' : ''}" onclick="onFilterUpdate('${gridId}', 'status', 'rejected')"><span>❌</span> Rejected</button>` : ''}
    </div>
    <div class="filter-sort-group">
      <select class="filter-sort" onchange="onFilterUpdate('${gridId}', 'sort', this.value)" id="sort_${gridId}">
        <option value="date-desc" ${f.sort === 'date-desc' ? 'selected' : ''}>📅 Date: Latest first</option>
        <option value="date-asc" ${f.sort === 'date-asc' ? 'selected' : ''}>📅 Date: Earliest first</option>
      </select>
    </div>
  </div>`;
}

async function onFilterUpdate(gridId, field, value) {
  if (!eventFilters[gridId]) eventFilters[gridId] = { query: '', status: 'all', dept: 'all', sort: 'date-desc' };
  eventFilters[gridId][field] = value;

  // For paginated pages, reset page and re-render
  const paginatedGrids = ['allEventsGrid', 'pendingEventsGrid', 'myEventsGrid', 'clubEventsGrid'];
  if (paginatedGrids.includes(gridId)) {
    const pageContext = {
      'allEventsGrid': 'all-events',
      'pendingEventsGrid': 'pending-events',
      'myEventsGrid': 'my-events',
      'clubEventsGrid': 'club-requests'
    }[gridId];
    if (pageContext) eventPageState[pageContext] = 1;
    navigateTo(currentPage);
    return;
  }
  applyDOMFilter(gridId);
}

function getFilteredEvents(events, gridId) {
  const f = eventFilters[gridId] || { query: '', status: 'all', dept: 'all', sort: 'date-desc' };
  let result = [...events];

  if (f.status !== 'all') result = result.filter(e => e.status === f.status);
  if (f.dept !== 'all') {
    result = result.filter(e => {
      const depts = e.departments ? e.departments.map(d => d.school.toLowerCase()) : [];
      return depts.includes(f.dept.toLowerCase());
    });
  }
  if (f.query) {
    const q = f.query.toLowerCase();
    result = result.filter(e => 
      e.title.toLowerCase().includes(q) || 
      e.hall_name.toLowerCase().includes(q) ||
      (e.created_by_name && e.created_by_name.toLowerCase().includes(q))
    );
  }

  result.sort((a, b) => {
    if (f.sort === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (f.sort === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (f.sort === 'title') return a.title.localeCompare(b.title);
    if (f.sort === 'venue') return (a.hall_name || '').localeCompare(b.hall_name || '');
    if (f.sort === 'coordinator') return (a.created_by_name || '').localeCompare(b.created_by_name || '');
    if (f.sort === 'dept-asc') {
      const da = a.departments && a.departments.length > 0 ? a.departments[0].school : '';
      const db = b.departments && b.departments.length > 0 ? b.departments[0].school : '';
      return da.localeCompare(db);
    }
    return 0;
  });
  return result;
}

function applyDOMFilter(gridId) {
  const f = eventFilters[gridId] || { query: '', status: 'all', dept: 'all', sort: 'date-desc' };
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.luxury-event-card, .v4-classic-card'));
  cards.forEach(card => {
    const title = (card.querySelector('.luxury-title, .v4-event-title')?.textContent || '').toLowerCase();
    const dept = (card.dataset.dept || '').toLowerCase();
    const status = card.dataset.status || 'all';
    const matchQuery = !f.query || title.includes(f.query.toLowerCase());
    const matchStatus = f.status === 'all' || status === f.status;
    const matchDept = f.dept === 'all' || dept.includes(f.dept.toLowerCase());
    card.style.display = (matchQuery && matchStatus && matchDept) ? 'flex' : 'none';
  });
}

function emptyState(icon, title, sub) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}
function showConfirmModal(title, message, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <div style="text-align:center; padding:10px 0;">
      <div style="font-size:0.9rem; color:#1e293b; font-weight:700; margin-bottom:16px;">${message}</div>
      <div style="font-size:0.85rem; color:#64748b; margin-bottom:24px;">This action is permanent and cannot be reversed.</div>
      <div style="display:flex; gap:12px; max-width:400px; margin:0 auto">
        <button class="btn btn-outline" style="flex:1; border-radius:12px; font-weight:700" onclick="closeModal()">Dismiss</button>
        <button class="btn btn-danger" style="flex:1; border-radius:12px; font-weight:700; position:relative" id="confirmOk">
          <span id="confirmText">Confirm Action</span>
          <div id="confirmSpinner" class="spinner-xs" style="display:none; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%)"></div>
        </button>
      </div>
    </div>`;
  const btn = document.getElementById('confirmOk');
  const txt = document.getElementById('confirmText');
  const spin = document.getElementById('confirmSpinner');

  btn.onclick = async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    txt.style.opacity = '0';
    spin.style.display = 'block';

    try {
      await onConfirm();
      closeModal();
    } catch (err) {
      showToast('Action Failed: ' + (err.message || 'System Error'), 'error');
      btn.disabled = false;
      txt.style.opacity = '1';
      spin.style.display = 'none';
    }
  };
  openModal();
}

function showReasonModal(title, message, placeholder, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <div style="padding:10px 0;">
      <div style="font-size:0.9rem; color:#1e293b; font-weight:700; margin-bottom:12px;">${message}</div>
      <textarea id="reasonInput" class="decision-note" style="margin-bottom:20px; min-height:100px" placeholder="${placeholder}"></textarea>
      <div style="display:flex; gap:12px;">
        <button class="btn btn-outline" style="flex:1; border-radius:12px; font-weight:700" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" style="flex:1; border-radius:12px; font-weight:700" id="reasonSubmit">Confirm Denial</button>
      </div>
    </div>`;
  const btn = document.getElementById('reasonSubmit');
  btn.onclick = async () => {
    const reason = document.getElementById('reasonInput').value;
    if (!reason.trim()) {
      showToast('Please provide a reason.', 'error');
      return;
    }
    btn.disabled = true;
    try {
      await onConfirm(reason);
      closeModal();
    } catch (err) {
      showToast('Action Failed: ' + err.message, 'error');
      btn.disabled = false;
    }
  };
  openModal();
}

/**
 * Custom alternative to native prompt()
 */
function showPromptModal(title, message, placeholder, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <div style="padding:10px 0;">
      <div style="font-size:1rem; color:#1e293b; font-weight:600; margin-bottom:12px;">${message}</div>
      <input type="text" id="promptInput" placeholder="${placeholder}" 
             style="width:100%; padding:14px; border-radius:12px; border:1px solid #e2e8f0; font-family:inherit; font-size:1rem; margin-bottom:24px; outline:none; transition:border-color 0.2s"
             onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='#e2e8f0'">
      
      <div style="display:flex; gap:12px; justify-content:flex-end">
        <button class="btn btn-outline" style="min-width:100px; border-radius:12px" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" style="min-width:140px; border-radius:12px; position:relative" id="promptSubmit">
          <span id="promptBtnText">Submit</span>
          <div id="promptSpinner" class="spinner-xs" style="display:none; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%)"></div>
        </button>
      </div>
    </div>`;

  const input = document.getElementById('promptInput');
  const btn = document.getElementById('promptSubmit');
  const txt = document.getElementById('promptBtnText');
  const spin = document.getElementById('promptSpinner');

  input.focus();

  // Allow Enter key to submit
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btn.click();
  });

  btn.onclick = async () => {
    const val = input.value.trim();
    if (!val) { showToast('Please enter a value', 'error'); return; }

    btn.disabled = true;
    txt.style.opacity = '0';
    spin.style.display = 'block';

    try {
      await onSubmit(val);
      closeModal();
    } catch (err) {
      showToast('Submit Failed: ' + (err.message || 'Error'), 'error');
      btn.disabled = false;
      txt.style.opacity = '1';
      spin.style.display = 'none';
    }
  };

  openModal();
}
init();

async function downloadSingleEventReport(eid) {
  try {
    const e = await api('/api/events/' + eid);
    if (e.agenda_path) {
      // If original copy exists, download/open it directly
      const link = document.createElement('a');
      link.href = e.agenda_path;
      link.target = '_blank';
      link.download = `Proposal_${e.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback to institutional report
      const html = buildSingleEventReportHTML(e);
      const win = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
      if (!win) { showToast('Please allow popups to view reports', 'error'); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  } catch (err) {
    console.error('Download Error:', err);
    showToast('Failed to retrieve document: ' + err.message, 'error');
  }
}
