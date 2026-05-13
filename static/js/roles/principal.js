// ─── PRINCIPAL: PENDING APPROVALS ───────────────────────────────────────────
async function renderPendingEvents() {
  const events = await api('/api/events');
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  const pending = events.filter(e => e.status === 'principal_review');
  const reviewed = events.filter(e => e.status !== 'principal_review');
  
  const gridId = 'pendingEventsGrid';
  const role = 'principal';
  
  document.getElementById('pageContent').innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Events Awaiting Approval</div><div class="section-sub">${pending.length} pending your final review</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('principal')">📄 Decision Report</button>
        </div>
      </div>
      ${pending.length === 0 ? emptyState('✅', 'All clear!', 'No events are pending your review.') : 
      eventFilterBar(gridId, role, pending) + 
      '<div class="cards-grid" id="pendingEventsGrid">' + 
      pending.map(e => eventCard(e, role)).join('') + '</div>'}
    </div>
    ${reviewed.length > 0 ? `
    <div class="section">
      <div class="section-header"><div class="section-title">Recently Processed</div></div>
      <div class="cards-grid" id="reviewedGrid">
        ${reviewed.slice(0, 8).map(e => eventCard(e, role)).join('')}
      </div>
    </div>` : ''}`;
}
