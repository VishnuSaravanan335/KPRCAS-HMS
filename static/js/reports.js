//  REPORTS PAGE
// ═══════════════════════════════════════════════════════════════════════════════
let allEventData = []; 

async function renderReports() {
  const [events, inventory, stats] = await Promise.all([
    api('/api/events'), api('/api/inventory'), api('/api/stats')
  ]);
  allEventData = events;
  const role = currentUser.role;

  const schools = [...new Set(events.flatMap(e => (e.departments || []).map(d => d.school)).filter(Boolean))].sort();
  const allDepts = [...new Set(events.flatMap(e => {
    return (e.departments || []).flatMap(d => [d.department, d.dept, d.name]);
  }).filter(Boolean))].sort();

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
            <div class="report-panel-title">KPRCAS Book My HALL Report Center</div>
            <div class="report-panel-sub">Custom filters for event name, school, department, and date range.</div>
          </div>
        </div>
        ${role !== 'booker' ? `
        <div class="filter-bar" style="background:rgba(255,255,255,0.8); margin-top:20px; border-radius:15px; border:1px solid var(--border); padding: 15px; flex-wrap: wrap;">
          <div class="filter-search-wrap" style="background:#fff; min-width: 200px;">
            <span class="filter-search-icon">🔍</span>
            <input class="filter-search" id="repFilterName" placeholder="Search event..." oninput="getReportData('preview')">
          </div>
          
          <div class="filter-search-wrap" style="background:#fff; min-width: 180px;">
            <span class="filter-search-icon">🏫</span>
            <select class="filter-search" id="repFilterSchool" onchange="updateDeptFilter(); getReportData('preview')" style="border:none; outline:none; background:transparent; width:100%; cursor:pointer;">
              <option value="">All Schools</option>
              ${schools.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>

          <div class="filter-search-wrap" style="background:#fff; min-width: 180px;">
            <span class="filter-search-icon">🏢</span>
            <select class="filter-search" id="repFilterDept" onchange="getReportData('preview')" style="border:none; outline:none; background:transparent; width:100%; cursor:pointer;">
              <option value="">All Departments</option>
              ${allDepts.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">
             <div class="filter-search-wrap" style="background:#fff; min-width:140px">
               <span style="font-size:0.7rem; font-weight:800; color:#94a3b8">FROM</span>
               <input type="date" id="repFilterStart" class="filter-search" onchange="getReportData('preview')">
             </div>
             <div class="filter-search-wrap" style="background:#fff; min-width:140px">
               <span style="font-size:0.7rem; font-weight:800; color:#94a3b8">TO</span>
               <input type="date" id="repFilterEnd" class="filter-search" onchange="getReportData('preview')">
             </div>
          </div>

          <div class="filter-sort-group">
            <select class="filter-sort" id="repFilterSort" onchange="getReportData('preview')" style="background:#fff">
              <option value="date-desc">📅 Date: Newest</option>
              <option value="date-asc">📅 Date: Oldest</option>
              <option value="title-asc">🔤 Title: A-Z</option>
              <option value="dept-asc">🏢 Dept: A-Z</option>
              <option value="school-asc">🏫 School: A-Z</option>
            </select>
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

    <div class="section premium-overview">
      <div class="section-overlay-red"></div>
      <div class="section-header"><div class="section-title">Quick Stats</div></div>
      <div class="stat-grid-premium">
        <div class="stat-card-new red-glass">
          <div class="card-content">
            <div class="card-label">TOTAL EVENTS</div>
            <div class="card-value">${stats.total_events || 0}</div>
            <div class="card-sub">Global event requests processed</div>
          </div>
          <div class="card-icon">📊</div>
        </div>
        
        <div class="stat-card-new green-glass">
          <div class="card-content">
            <div class="card-label">APPROVED</div>
            <div class="card-value">${stats.approved || 0}</div>
            <div class="card-sub">Finalized hall bookings</div>
          </div>
          <div class="card-icon">✅</div>
        </div>

        <div class="stat-card-new gold-glass">
          <div class="card-content">
            <div class="card-label">PENDING</div>
            <div class="card-value">${stats.pending || 0}</div>
            <div class="card-sub">Awaiting administrative review</div>
          </div>
          <div class="card-icon">⏳</div>
        </div>

        <div class="stat-card-new crimson-glass">
          <div class="card-content">
            <div class="card-label">REJECTED</div>
            <div class="card-value">${stats.rejected || 0}</div>
            <div class="card-sub">Requests returned with notes</div>
          </div>
          <div class="card-icon">✕</div>
        </div>
      </div>
    </div>`;
}

function updateDeptFilter() {
  const school = v('repFilterSchool');
  const depts = [...new Set(allEventData.flatMap(e => (e.departments || [])
    .filter(d => !school || d.school === school)
    .flatMap(d => [d.department, d.dept, d.name])
    .filter(Boolean)
  ))].sort();

  const deptSelect = document.getElementById('repFilterDept');
  if (!deptSelect) return;
  deptSelect.innerHTML = `<option value="">All Departments</option>` + depts.map(d => `<option value="${d}">${d}</option>`).join('');
  deptSelect.value = "";
}

function getReportCards(role) {
  const all = [
    { key: 'all-events', icon: '📅', title: 'Events Report', desc: 'All events with status, hall, date and organizer details' },
    { key: 'approved', icon: '✅', title: 'Approved Events', desc: 'All approved/scheduled events with full inventory allocation' },
    { key: 'pending', icon: '⏳', title: 'Pending Events', desc: 'Events still awaiting department or principal review' },
    { key: 'inventory', icon: '📦', title: 'Inventory Status', desc: 'Full inventory stock levels, in-use and available quantities' },
    { key: 'inventory-it', icon: '🖥️', title: 'IT Asset Report', desc: 'IT department inventory with usage and availability' },
    { key: 'inventory-reception', icon: '🛎️', title: 'Reception Inventory', desc: 'Reception inventory items and current stock status' },
    { key: 'dept-it', icon: '🖥️', title: 'IT Dept Activity', desc: 'IT allocation history and pending requests' },
    { key: 'dept-reception', icon: '🛎️', title: 'Reception Dept Activity', desc: 'Reception allocation history and pending requests' },
    { key: 'returns-it', icon: '↩️', title: 'IT Returns Report', desc: 'IT items returned and pending return status' },
    { key: 'returns-reception', icon: '↩️', title: 'Reception Returns', desc: 'Reception items returned and pending status' },
    { key: 'principal', icon: '👤', title: 'Principal Decisions', desc: 'All principal approval/rejection decisions with notes' },
    { key: 'users', icon: '👥', title: 'User Directory', desc: 'System user list and role definitions' },
    { key: 'halls', icon: '🏛️', title: 'Venue Catalog', desc: 'List of all venues and capacities' }
  ];
  const byRole = {
    admin: all,
    booker: [all[0], all[1], all[2]],
    it: [all[0], all[3], all[4], all[8], all[10]],
    reception: [all[0], all[3], all[5], all[9], all[11]],
    principal: [all[0], all[1], all[2], all[10]],
  };
  return byRole[role] || [all[0]];
}

async function getReportData(type) {
  try {
    const filters = {
      name: v('repFilterName')?.toLowerCase() || '',
      school: v('repFilterSchool') || '',
      dept: v('repFilterDept') || '',
      start: v('repFilterStart') || '',
      end: v('repFilterEnd') || '',
      sort: v('repFilterSort') || 'date-desc'
    };

    const [events, inventory, stats] = await Promise.all([
      allEventData.length ? Promise.resolve(allEventData) : api('/api/events'),
      api('/api/inventory'), api('/api/stats')
    ]);

    let filteredEvents = [...events];
    if (filters.name) filteredEvents = filteredEvents.filter(e => e.title.toLowerCase().includes(filters.name));
    if (filters.school) filteredEvents = filteredEvents.filter(e => e.departments && e.departments.some(d => d.school === filters.school));
    if (filters.dept) filteredEvents = filteredEvents.filter(e => e.departments && e.departments.some(d => (d.department || d.dept || d.name) === filters.dept));
    if (filters.start) filteredEvents = filteredEvents.filter(e => e.date >= filters.start);
    if (filters.end) filteredEvents = filteredEvents.filter(e => e.date <= filters.end);

    filteredEvents.sort((a, b) => {
      if (filters.sort === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (filters.sort === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (filters.sort === 'title-asc') return a.title.localeCompare(b.title);
      if (filters.sort === 'dept-asc') {
        const ad = a.departments?.[0]?.department || a.departments?.[0]?.dept || a.departments?.[0]?.name || '';
        const bd = b.departments?.[0]?.department || b.departments?.[0]?.dept || b.departments?.[0]?.name || '';
        return ad.localeCompare(bd);
      }
      if (filters.sort === 'school-asc') {
        const as = a.departments?.[0]?.school || '';
        const bs = b.departments?.[0]?.school || '';
        return as.localeCompare(bs);
      }
      return 0;
    });

    return buildReportHTML(type, { events: filteredEvents, inventory, stats });
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

  title.textContent = 'Institutional Record Preview';
  body.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:120px; text-align:center; gap:24px">
      <div class="spinner" style="width:50px; height:50px; border-top-color:#1e40af"></div>
      <div style="font-weight:900; color:#1e293b; letter-spacing:0.12em; text-transform:uppercase; font-size:0.8rem">Preparing Institutional Record...</div>
    </div>`;

  overlay.classList.add('show');
  modal.classList.add('show');

  try {
    const data = await getReportData(type);
    if (!data) throw new Error('No data returned from generator');
    title.textContent = data.title;
    body.innerHTML = data.body;
  } catch (err) {
    console.error('Report Generation Error:', err);
    body.innerHTML = `<div style="padding:60px; text-align:center"><h3>Generation Interrupted</h3><p>${err.message}</p></div>`;
  }
}

async function downloadReport(type) {
  const data = await getReportData(type);
  if (data) openReportWindow(data.html, type);
}

function openReportWindow(html, name) {
  const win = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes');
  if (!win) { showToast('Please allow popups to view reports', 'error'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}

function reportStyles() {
  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
      
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      @page { size: A4 portrait; margin: 0; }

      .report-preview-body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: #f8fafc;
        color: #0f172a;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .report-page-wrapper {
        background: #ffffff;
        width: 100%;
        max-width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        position: relative;
        box-shadow: 0 0 40px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
      }

      .rpt-top-bar {
        height: 40px;
        background: #1e293b;
        width: 100%;
      }

      .rpt-bottom-bar {
        height: 40px;
        background: #1e293b;
        width: 100%;
        margin-top: auto;
      }

      .rpt-content-padding {
        padding: 15mm 20mm;
        flex: 1;
      }

      .rpt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 25mm;
        width: 100%;
      }

      .rpt-logo-side {
        height: 48px;
        object-fit: contain;
      }

      .rpt-system-name {
        font-size: 1.5rem;
        font-weight: 800;
        color: #1e293b;
        letter-spacing: -0.02em;
        text-transform: uppercase;
      }

      .rpt-system-name span { color: #10b981; }

      .rpt-main-title {
        font-size: 2.2rem;
        font-weight: 900;
        color: #1e293b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10mm;
        text-align: center;
        width: 100%;
      }

      .stats-container-premium {
        display: flex;
        width: 100%;
        margin-bottom: 30px;
        background: #f8fafc;
        padding: 10px;
        justify-content: center;
        gap: 15px;
        border-radius: 12px;
      }

      .stat-box-rounded {
        flex: 1;
        background: #ffffff;
        border-radius: 12px;
        padding: 15px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 80px;
        border: 1px solid #e2e8f0;
      }

      .stat-lbl {
        font-size: 0.75rem;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .stat-val {
        font-size: 2rem;
        font-weight: 900;
        color: #1e293b;
      }

      .rpt-section-title {
        font-size: 1rem;
        font-weight: 800;
        color: #1e293b;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
      }

      .report-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      
      .report-table th {
        background: #1e293b;
        padding: 14px;
        font-size: 0.85rem;
        font-weight: 800;
        color: #ffffff;
        text-transform: uppercase;
        text-align: left;
        letter-spacing: 0.05em;
      }
      
      .report-table td {
        border: 1px solid #e2e8f0;
        padding: 12px 14px;
        font-size: 0.9rem;
        color: #334155;
        font-weight: 500;
        vertical-align: middle;
      }
      
      .report-table td:first-child {
        font-weight: 800;
        color: #0f172a;
      }

      .grid-item {
        padding: 12px 0;
        border-bottom: 1px solid #e2e8f0;
      }

      .grid-lbl {
        font-size: 0.7rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        display: block;
        margin-bottom: 4px;
      }

      .grid-val {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
      }

      .agenda-val {
        font-size: 0.95rem;
        font-weight: 500;
        color: #334155;
        font-style: italic;
      }

      .print-btn {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #1e293b;
        color: white;
        border: none;
        padding: 12px 28px;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        font-family: inherit;
        font-size: 0.9rem;
      }

      @media print {
        body { background: white; padding: 0; display: block; }
        .report-page-wrapper { 
          width: 210mm; 
          height: 297mm; 
          margin: 0 auto; 
          border: none; 
          box-shadow: none; 
          page-break-after: always;
        }
        .print-btn { display: none !important; }
        margin: 30px 0 15px;
        text-transform: uppercase;
        width: 100%;
        text-align: center;
      }
    </style>`;
}

function reportHeader(title) {
  const logoPath = 'https://image2url.com/r2/default/images/1774243478274-c1b09675-5ce9-40cd-a741-5d1a37595866.jpeg';
  return `
    <button class="print-btn" onclick="window.print()">
      Print Official Record
    </button>
    <div class="report-page-wrapper">
      <div class="rpt-top-bar"></div>
      <div class="rpt-content-padding">
        <div class="rpt-header">
          <img src="${logoPath}" alt="Logo" class="rpt-logo-side">
          <div class="rpt-system-name">KPRCAS <span>BOOKMYHALL</span></div>
        </div>
        <div class="rpt-main-title">${title}</div>`;
}

function reportFooter() {
  return `</div><div class="rpt-bottom-bar"></div></div>`;
}

function statusBadgeHTML(status) {
  const m = {
    approved: '<span class="badge">Approved</span>',
    rejected: '<span class="badge">Rejected</span>',
    dept_review: '<span class="badge">Dept Review</span>',
    principal_review: '<span class="badge">Principal Review</span>',
  };
  return m[status] || `<span class="badge">${status}</span>`;
}

function buildReportHTML(type, { events, inventory, stats }) {
  let body = '';
  const filtered = {
    'all-events': events,
    'approved': events.filter(e => e.status === 'approved'),
    'pending': events.filter(e => e.status !== 'approved' && e.status !== 'rejected'),
    'rejected': events.filter(e => e.status === 'rejected'),
    'my-events': events,
    'full-summary': events,
  };

  const reportTitles = {
    'all-events': 'Event Registry', 'approved': 'Scheduled Events', 'pending': 'Pending Approvals',
    'inventory': 'Inventory Registry', 'inventory-it': 'IT Asset Report',
    'inventory-reception': 'Reception Asset Report', 'users': 'User Directory', 'halls': 'Venue Registry',
    'full-summary': 'Institutional Summary',
  };
  const title = reportTitles[type] || 'Institutional Report';

  if (['all-events', 'approved', 'pending', 'full-summary', 'my-events'].includes(type)) {
    const evSet = filtered[type] || events;
    body += `
    <div class="stats-container-premium">
      <div class="stat-box-rounded"><div class="stat-lbl">RECORDS</div><div class="stat-val">${evSet.length}</div></div>
      <div class="stat-box-rounded"><div class="stat-lbl">APPROVED</div><div class="stat-val">${evSet.filter(e => e.status === 'approved').length}</div></div>
      <div class="stat-box-rounded"><div class="stat-lbl">PENDING</div><div class="stat-val">${evSet.filter(e => e.status !== 'approved' && e.status !== 'rejected').length}</div></div>
      <div class="stat-box-rounded"><div class="stat-lbl">REJECTED</div><div class="stat-val">${evSet.filter(e => e.status === 'rejected').length}</div></div>
    </div>`;
  }

  if (['all-events', 'approved', 'pending', 'my-events', 'full-summary'].includes(type)) {
    const evSet = filtered[type] || events;
    body += `<h2>Event Details</h2>
    <table class="report-table">
      <thead><tr><th>Title</th><th>Date & Time</th><th>Venue</th><th>School & Dept</th><th>Agenda</th><th>Status</th></tr></thead>
      <tbody>${evSet.map(e => {
        const deptStr = (e.departments || [])
          .map(d => {
            const deptName = d.department || d.dept || d.name || '';
            return `${d.school || ''}${deptName ? ' - ' + deptName : ''}`.trim();
          })
          .filter(s => s !== '' && s !== '-')
          .join('<br>') || '-';
        return `<tr>
          <td style="font-weight:900;">${e.title}</td>
          <td style="white-space:nowrap;"><div>${e.date}</div><div style="font-size:8pt;">${e.time_slot}</div></td>
          <td>${e.hall_name}</td>
          <td>${deptStr}</td>
          <td style="font-size:9pt; font-weight:500; word-break: break-word;">${e.description || e.agenda || '-'}</td>
          <td>${statusBadgeHTML(e.status)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  const styles = reportStyles();
  const header = reportHeader(title);
  const footer = reportFooter();
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>${styles}</head>
  <body class="report-preview-body">${header}${body}${footer}</body></html>`;
  return { html, body: `<div class="report-preview-body">${styles}${header}${body}${footer}</div>`, title };
}

function buildSingleEventReportHTML(e) {
  const deptStr = (e.departments || [])
    .map(d => {
      const deptName = d.department || d.dept || d.name || '';
      return `${d.school || ''}${deptName ? ' - ' + deptName : ''}`.trim();
    })
          .filter(s => s !== '' && s !== '-')
          .join('<br>') || '-';

  const body = `
    <div class="rpt-section-title">Event Specification</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 40px; margin-bottom: 30px;">
      <div class="grid-item">
        <span class="grid-lbl">Event Title:</span>
        <div class="grid-val">${e.title}</div>
      </div>
      <div class="grid-item">
        <span class="grid-lbl">Schedule Date:</span>
        <div class="grid-val">${e.date}</div>
      </div>
      <div class="grid-item">
        <span class="grid-lbl">Time Slot:</span>
        <div class="grid-val">${e.time_slot}</div>
      </div>
      <div class="grid-item">
        <span class="grid-lbl">Venue:</span>
        <div class="grid-val">${e.hall_name}</div>
      </div>
      <div class="grid-item" style="grid-column: 1 / -1;">
        <span class="grid-lbl">School / Department</span>
        <div class="grid-val">${deptStr}</div>
      </div>
      <div class="grid-item" style="grid-column: 1 / -1; border-bottom: none;">
        <span class="grid-lbl">Event Agenda</span>
        <div class="agenda-val">${e.description || e.agenda || '-'}</div>
      </div>
    </div>

    ${e.agenda_path ? `
      <div style="margin-bottom: 30px; padding: 20px; background: #eff6ff; border: 1px dashed #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.5rem;">📎</span>
          <div>
            <div style="font-weight: 800; color: #1e3a8a; font-size: 0.9rem;">Official Document Attached</div>
            <div style="font-size: 0.75rem; color: #60a5fa;">Click the button to view the original upload</div>
          </div>
        </div>
        <a href="${e.agenda_path}" target="_blank" style="background: #2563eb; color: white; text-decoration: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; font-size: 0.85rem;">View Document</a>
      </div>
    ` : ''}
    
    <div class="rpt-section-title" style="margin-top: 40px;">Resource Allocation Details</div>
    <table class="report-table">
      <thead>
        <tr>
          <th style="width: 25%;">Department</th>
          <th style="width: 50%;">Item Description</th>
          <th style="width: 25%;">Status / Qty</th>
        </tr>
      </thead>
      <tbody>
        ${e.requested_items && e.requested_items.length > 0 ? e.requested_items.map(i => `
          <tr>
            <td>${i.dept.toUpperCase()}</td>
            <td>${i.item_name}</td>
            <td style="text-align: center; font-weight: 800;">${i.allocated_qty} / ${i.requested_qty}</td>
          </tr>
        `).join('') : `<tr><td colspan="3" style="text-align:center; color:#64748b; padding: 20px;">No additional resources requested for this event.</td></tr>`}
      </tbody>
    </table>

    ${e.principal_note ? `
      <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1e293b;">
        <span class="grid-lbl">Administrative Remarks</span>
        <div class="agenda-val" style="color: #0f172a; font-weight: 600;">${e.principal_note}</div>
      </div>
    ` : ''}
  `;

  const styles = reportStyles();
  const header = reportHeader('Event Specification');
  const footer = reportFooter();
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Event Report: ${e.title}</title>${styles}</head>
  <body>${header}${body}${footer}</body></html>`;
}
