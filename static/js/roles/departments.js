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

function getItemIcon(name, dept) {
  const n = name.toLowerCase();
  if (n.includes('chair')) return '🪑';
  if (n.includes('table')) return '🖼️';
  if (n.includes('lamp') || n.includes('light')) return '💡';
  if (n.includes('card') || n.includes('id')) return '🪪';
  if (n.includes('folder')) return '📁';
  if (n.includes('bottle')) return '🥤';
  if (n.includes('clean') || n.includes('mop')) return '🧹';
  if (n.includes('mic') || n.includes('audio')) return '🎤';
  if (n.includes('projector')) return '📽️';
  if (n.includes('laptop') || n.includes('computer')) return '💻';
  if (n.includes('cable') || n.includes('wire')) return '🔌';
  if (n.includes('bell')) return '🛎️';
  // Fallback to department defaults
  return dept === 'it' ? '🖥️' : (dept === 'reception' ? '🛎️' : (dept === 'pixesclub' ? '📸' : '🎭'));
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
        <div>
          <div class="section-title">${dept === 'it' ? 'IT' : (dept === 'reception' ? 'Reception' : (dept === 'pixesclub' ? 'Pixes Club' : 'Fine Arts Club'))} Asset Hub</div>
          <div class="section-sub">Institutional equipment and inventory registry</div>
        </div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('inventory-${dept}')">📄 Export</button>
          <button class="btn btn-primary" onclick="openAddDeptInventory('${dept}')">➕ Add Item</button>
        </div>
      </div>
      <div class="cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">
        ${paginated.map((i, idx) => {
    const isLowStock = (i.stock_qty - i.in_use) <= 5;
    return `
          <div class="inv-card-premium inst-animate ${i.locked ? 'inv-blocked' : 'inv-clean'}" style="animation-delay: ${idx * 0.05}s">
            <div class="inv-card-inner">
              <div class="inv-header" style="justify-content: space-between; align-items: start; border-bottom: none; padding-bottom: 0;">
                <div class="inv-name-group">
                  <div class="inv-type-icon">${getItemIcon(i.name, dept)}</div>
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
          </div>`;
  }).join('')}
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
  if (!acquireLock('addDeptInventory')) return;
  try {
    const body = { name: v('dInvName'), dept, stock_qty: parseInt(v('dInvQty')) || 0 };
    if (!body.name) { showToast('Enter item name', 'error'); return; }
    await api('/api/inventory', 'POST', body); closeModal(); showToast('Item added', 'success'); renderDeptInventory(dept);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    releaseLock('addDeptInventory');
  }
}

// ─── RETURNS ──────────────────────────────────────────────────────────────────
async function renderReturns(dept) {
  const events = await api('/api/events');
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
      `<div class="cards-grid" style="margin-top:16px;">${returnable.map((e, idx) => {
        const myItems = e.requested_items.filter(i => i.dept === dept && i.dept_approved && !i.returned);
        const emoji = dept === 'it' ? '🖥️' : '🛎️';
        return `
          <div class="luxury-return-card inst-animate" onclick="openPremiumEventDetails('${e.id}')" style="cursor:pointer; animation-delay: ${idx * 0.05}s">
            <div class="luxury-card-corner"></div>
            
            <div class="luxury-header">
              <div class="luxury-title">${esc(e.title)}</div>
              <div class="luxury-status-badge">RETURN PENDING</div>
            </div>
            
            <div class="luxury-return-body">
               <div class="luxury-return-label">
                 <span>📦</span> PENDING RECOVERY
               </div>
               ${myItems.map(i => {
                 const rem = (i.allocated_qty || 0) - (i.returned_qty || 0);
                 return `
                 <div class="luxury-return-item">
                   <div class="name">
                     <span style="font-size:1.1rem; margin-right:8px">${emoji}</span>
                     ${esc(i.item_name)}
                   </div>
                   <div class="qty" style="background:#fff7ed; color:#ea580c; border:1px solid #ffedd5; padding:6px 12px; border-radius:12px; font-size:0.85rem; font-weight:900">
                     ${i.returned_qty || 0} / ${i.allocated_qty}
                   </div>
                 </div>`;
               }).join('')}
            </div>
            
            <div class="luxury-return-footer">
               <button class="luxury-return-btn partial" onclick="event.stopPropagation();openCustomReturnModal('${esc(e.id)}','${dept}')">⚙️ Partial</button>
               <button class="luxury-return-btn bulk" onclick="event.stopPropagation();processReturn('${esc(e.id)}','${dept}')">🔄 Bulk Return</button>
            </div>
          </div>`;
      }).join('')}</div>`}
    </div>

    ${returned.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">Verified Returns History</div><div class="section-sub">Officially logged and verified equipment recoveries</div></div>
      </div>
      <div class="cards-grid">
        ${pagReturned.map((e, idx) => {
        const myReturnedItems = e.requested_items.filter(i => i.dept === dept && i.returned);
        return `
            <div class="luxury-history-card inst-animate" onclick="openPremiumEventDetails('${e.id}')" style="cursor:pointer; animation-delay: ${idx * 0.05}s">
              <div class="luxury-card-corner"></div>
              
              <div class="luxury-header">
                <div class="luxury-title">${esc(e.title)}</div>
                <div class="luxury-status-badge">COMPLETED</div>
              </div>

              <div class="luxury-history-body">
                <div class="luxury-return-label" style="color: #059669">
                   <span>✅</span> RECOVERY LOG
                </div>
                ${myReturnedItems.map(i => `
                  <div class="luxury-history-item">
                    <span class="name">${esc(i.item_name)}</span>
                    <span class="qty-tag">Recovered: ${i.returned_qty || i.allocated_qty}</span>
                  </div>
                `).join('')}
              </div>

              <div class="luxury-history-footer">
                <div class="verification-id">Ref: #${Math.floor(Math.random()*10000)}</div>
                <div class="verified-pill">✔️ VERIFIED</div>
              </div>
            </div>`;
      }).join('')}
      </div>
      ${renderPaginationControls(returned.length, page, EVENTS_PER_PAGE, 'dept-returns')}
    </div>` : ''}
  `;
}

async function processReturn(eid, dept) {
  if (!acquireLock('processReturn_' + eid)) return;
  try {
    await api(`/api/events/${eid}/return`, 'POST', { dept });
    showToast('Items marked as returned ✅', 'success');
    renderReturns(dept);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    releaseLock('processReturn_' + eid);
  }
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
  if (!acquireLock('submitCustomReturn_' + eid)) return;
  try {
    const e = await api('/api/events/' + eid);
    const myItems = e.requested_items.filter(i => i.dept === dept && i.dept_approved && !i.returned);
    const returns = myItems.map(i => ({
      item_id: i.item_id,
      qty: parseInt(document.getElementById('ret_' + i.item_id)?.value || 0)
    })).filter(r => r.qty > 0);

    if (returns.length === 0) { showToast('Please enter return quantities', 'error'); return; }

    await api(`/api/events/${eid}/return`, 'POST', { dept, returns });
    closeModal();
    showToast('Custom return processed successfully', 'success');
    renderReturns(dept);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    releaseLock('submitCustomReturn_' + eid);
  }
}
