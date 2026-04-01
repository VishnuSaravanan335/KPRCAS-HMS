// --- EVENT RENDERING LOGIC ---
async function renderMyEvents() {
  const events = await api('/api/events');
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">My Events</div><div class="section-sub">${events.length} proposal(s)</div></div>
        <div class="section-actions">
          <button class="btn btn-primary" onclick="navigateTo('new-event')">➕ New Event</button>
        </div>
      </div>
      <div class="cards-grid">${events.map(e => eventCard(e, 'booker')).join('')}</div>
    </div>`;
}

function eventCard(e, role) {
  const status = computeEventStatus(e);
  const sc = { pending: 'badge-gold', approved: 'badge-green', rejected: 'badge-red', cancelled: 'badge-muted' };
  return `
  <div class="event-card">
    <div class="event-card-header">
      <div class="event-title">${e.title}</div>
      <span class="badge ${sc[status]}">${status.toUpperCase()}</span>
    </div>
    <div class="event-details">
      <div class="event-detail">📅 ${e.date} (${e.days} days)</div>
      <div class="event-detail">🏛️ ${e.hall_name}</div>
    </div>
    <div class="event-actions">
      <button class="btn btn-outline btn-sm" onclick="viewEventDetails('${e.id}')">Details</button>
    </div>
  </div>`;
}

function computeEventStatus(e) {
  if (e.principal_decision === 'rejected') return 'rejected';
  if (e.principal_decision === 'approved') return 'approved';
  return 'pending';
}

async function viewEventDetails(eid) {
  const e = await api(`/api/events/${eid}`);
  document.getElementById('modalTitle').textContent = 'Event Details';
  document.getElementById('modalBody').innerHTML = `
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:12px">${e.title}</div>
    <div style="margin-bottom:8px"><strong>Date:</strong> ${e.date} (${e.days} days)</div>
    <div style="margin-bottom:8px"><strong>Venue:</strong> ${e.hall_name}</div>
    <div style="margin-bottom:16px"><strong>By:</strong> ${e.created_by_name}</div>
    <div style="padding:12px;background:#f8fafc;border-radius:8px">${e.description || 'No description provided.'}</div>
  `;
  openModal();
}
// ... other event rendering (admin, principal)
