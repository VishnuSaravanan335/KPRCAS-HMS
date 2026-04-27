// ─── BOOKER: MY EVENTS ────────────────────────────────────────────────────────
async function renderMyEvents() {
  const allEvents = await api('/api/events');
  const gridId = 'myEventsGrid';
  
  // 1. Apply Filtering/Sorting to the FULL list first
  const filtered = getFilteredEvents(allEvents, gridId);

  // 2. Paginate the FILTERED list
  const page = eventPageState['my-events'] || 1;
  const start = (page - 1) * EVENTS_PER_PAGE;
  const paginated = filtered.slice(start, start + EVENTS_PER_PAGE);

  const pc = document.getElementById('pageContent');
  pc.innerHTML = `
    <div class="section">
      <div class="section-header">
        <div><div class="section-title">My Events</div><div class="section-sub">${filtered.length} proposal(s) matching current filters</div></div>
        <div class="section-actions">
          <button class="btn btn-report btn-sm" onclick="downloadReport('my-events')">\u{1F4C4} My Report</button>
          <button class="btn btn-primary" onclick="navigateTo('new-event')">\u{2795} New Event</button>
        </div>
      </div>
      ${allEvents.length === 0 ? emptyState('\u{1F4C5}', 'No events yet', 'Create your first event proposal to get started.') :
      eventFilterBar(gridId, 'booker', allEvents) +
      '<div class="cards-grid" id="myEventsGrid">' + 
      paginated.map(e => eventCard(e, 'booker')).join('') + 
      '</div>' +
      renderPaginationControls(filtered.length, page, EVENTS_PER_PAGE, 'my-events')}
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
        <div class="wstep" id="ws5" onclick="gotoStep(5)" style="display:none"><span>5</span> 📸 Pixes</div>
        <div class="wstep" id="ws6" onclick="gotoStep(6)" style="display:none"><span>6</span> 💃 Dance</div>
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
        <div style="margin-top:18px;border-top:1.5px dashed rgba(255,255,255,0.2);padding-top:16px">
          <div style="font-size:0.82rem;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">
            🎓 Participating Schools & Departments
          </div>
          <div id="schoolPicker" style="display:flex;flex-direction:column;gap:10px">
            ${buildSchoolPicker(hierarchy)}
          </div>
        </div>

        <!-- Special Requirements -->
        <div style="margin-top:18px;border-top:1.5px dashed rgba(255,255,255,0.2);padding-top:16px">
          <div class="label-premium-header">✨ Special Requirements & Facilities</div>
          <div class="field" style="margin-bottom:18px">
            <textarea id="evSpecialReq" rows="3" placeholder="Enter any extra setup, seating, or specific needs here…" style="border-color:#c4b5fd"></textarea>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
            ${yesNoRow('evIntro', '🎬', 'Intro Video / KPR Anthem')}
            ${yesNoRow('evDance', '💃', 'Dance Performance', true)}
            ${yesNoRow('evPhotos', '📷', 'Photography', true)}
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
            <div style="font-size:0.95rem;font-weight:800;color:#ffffff">🏨 Select Your Venue(s)</div>
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
        <div id="hallSelectedDisplay" style="margin-top:16px;display:none;padding:16px;background:var(--grad-green);border-radius:14px;border:1.5px solid #7dd3fc;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:0.7rem;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Selected Venues</div>
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
          <button class="btn btn-primary" id="btnPage4" onclick="proceedFromReception()">Next →</button>
        </div>
      </div>

      <!-- PAGE 5: PIXES CLUB -->
      <div class="wpage" id="wpage5" style="display:none">
        ${pixesItems.length > 0 ? `
        <div style="background:var(--grad-green);border-radius:12px;padding:14px 18px;margin-bottom:16px;border:1.5px solid #7dd3fc">
          <div style="font-size:0.85rem;font-weight:800;color:#ffffff">📸 Pixes Club — Photography Requirements</div>
          <div style="font-size:0.75rem;color:#64748b;margin-top:4px">Select quantities for required photography equipment.</div>
        </div>
        <div class="req-table" id="pixesReqTable">
          <div class="req-header"><span>Photography Item</span><span style="text-align:center">Available</span><span style="text-align:center">Qty</span></div>
          ${pixesItems.map(i => reqRow(i)).join('')}
        </div>` : `
        <div style="text-align:center;padding:40px 20px">
          <div style="font-size:3rem;margin-bottom:16px">📸</div>
          <div style="font-size:1.1rem;font-weight:800;color:#0ea5e9;margin-bottom:8px">Pixes Club Participation Confirmed</div>
          <div style="font-size:0.85rem;color:#64748b;max-width:320px;margin:0 auto">Photography coverage has been requested. The Pixes Club will be notified to coordinate.</div>
          <div style="margin-top:20px;padding:12px 20px;background:#f0f9ff;border-radius:10px;border:1.5px solid #bae6fd;display:inline-block;font-weight:700;color:#0369a1">✅ No equipment items required</div>
        </div>`}
        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="gotoStep(4)">← Back</button>
          <button class="btn btn-primary" id="btnPage5" onclick="proceedFromPixes()">Next →</button>
        </div>
      </div>

      <!-- PAGE 6: FINE ARTS CLUB -->
      <div class="wpage" id="wpage6" style="display:none">
        ${faItems.length > 0 ? `
        <div style="background:linear-gradient(135deg,#fdf4ff,#fae8ff);border-radius:12px;padding:14px 18px;margin-bottom:16px;border:1.5px solid #d8b4fe">
          <div style="font-size:0.85rem;font-weight:800;color:#7e22ce">🎭 Dance Performance Requirements</div>
          <div style="font-size:0.75rem;color:#64748b;margin-top:4px">Select quantities for required dance equipment.</div>
        </div>
        <div class="req-table" id="faReqTable">
          <div class="req-header"><span>Dance Requirement</span><span style="text-align:center">Available</span><span style="text-align:center">Qty</span></div>
          ${faItems.map(i => reqRow(i)).join('')}
        </div>` : `
        <div style="text-align:center;padding:40px 20px">
          <div style="font-size:3rem;margin-bottom:16px">🎭</div>
          <div style="font-size:1.1rem;font-weight:800;color:#8b5cf6;margin-bottom:8px">Fine Arts Club Participation Confirmed</div>
          <div style="font-size:0.85rem;color:#64748b;max-width:320px;margin:0 auto">Dance performance coverage has been requested. The Fine Arts Club will be notified to coordinate.</div>
          <div style="margin-top:20px;padding:12px 20px;background:#faf5ff;border-radius:10px;border:1.5px solid #ddd6fe;display:inline-block;font-weight:700;color:#6d28d9">✅ No equipment items required</div>
        </div>`}
        <div class="wizard-nav">
          <button class="btn btn-outline" onclick="gotoStep(5)">← Back</button>
          <button class="btn btn-primary" onclick="submitNewEvent()">🚀 Submit Proposal</button>
        </div>
      </div>

    </div>
  </div>
  `;
  syncClubSteps();
}


function resetNewEventForm() {
  _selectedHalls = {};
}

function gotoStep(n) {
  if (n === 2 && !validateStep1()) return;

  const getValue = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value === 'yes';
  const hasPhotos = getValue('evPhotos');
  const hasDance  = getValue('evDance');

  const total = 6;
  for (let i = 1; i <= total; i++) {
    const pg = document.getElementById('wpage' + i);
    const ws = document.getElementById('ws' + i);
    if (ws) {
      // Sync visibility of club steps in header
      if (i === 5) ws.style.display = hasPhotos ? 'flex' : 'none';
      if (i === 6) ws.style.display = hasDance  ? 'flex' : 'none';
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

function yesNoRow(id, icon, label, triggersClub = false) {
  const extra = triggersClub ? `onchange="syncClubSteps()"` : '';
  return `<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:12px 14px">
    <div style="font-size:0.84rem;font-weight:600;color:var(--text2);margin-bottom:10px">${icon} ${label}</div>
    <div style="display:flex;gap:16px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.84rem;font-weight:600;color:var(--green)">
        <input type="radio" name="${id}" id="${id}_yes" value="yes" style="accent-color:var(--green)" ${extra}> Yes
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.84rem;font-weight:600;color:var(--muted)">
        <input type="radio" name="${id}" id="${id}_no" value="no" checked style="accent-color:var(--muted)" ${extra}> No
      </label>
    </div>
  </div>`;
}

function syncClubSteps() {
  const hasPhotos = document.querySelector('input[name="evPhotos"]:checked')?.value === 'yes';
  const hasDance  = document.querySelector('input[name="evDance"]:checked')?.value === 'yes';
  const ws5 = document.getElementById('ws5');
  const ws6 = document.getElementById('ws6');
  if (ws5) ws5.style.display = hasPhotos ? 'flex' : 'none';
  if (ws6) ws6.style.display = hasDance  ? 'flex' : 'none';

  // Update button labels based on flow
  const btn4 = document.getElementById('btnPage4');
  const btn5 = document.getElementById('btnPage5');

  if (btn4) {
    if (!hasPhotos && !hasDance) btn4.innerHTML = '🚀 Submit Proposal';
    else btn4.innerHTML = 'Next →';
  }
  if (btn5) {
    if (!hasDance) btn5.innerHTML = '🚀 Submit Proposal';
    else btn5.innerHTML = 'Next →';
  }
}

function proceedFromReception() {
  const hasPhotos = document.querySelector('input[name="evPhotos"]:checked')?.value === 'yes';
  const hasDance  = document.querySelector('input[name="evDance"]:checked')?.value === 'yes';
  if (hasPhotos) return gotoStep(5);
  if (hasDance)  return gotoStep(6);
  submitNewEvent();
}

function proceedFromPixes() {
  const hasDance = document.querySelector('input[name="evDance"]:checked')?.value === 'yes';
  if (hasDance) return gotoStep(6);
  submitNewEvent();
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
  if (!acquireLock('submitNewEvent')) return;
  
  // Find the active primary button to show loading state
  const activePage = document.querySelector('.wpage:not([style*="display: none"])');
  const submitBtn = activePage ? activePage.querySelector('.btn-primary') : null;
  const originalHtml = submitBtn ? submitBtn.innerHTML : '';
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-xs" style="width:14px;height:14px;border-width:2px;margin-right:8px"></span> Processing...';
  }

  try {
    const title = v('evTitle'), date = v('evDate'), budget_id = v('evBudget');
    let time_slot = v('evSlot');
    if (time_slot === 'CUSTOM') time_slot = v('evCustomSlot');

    const hall_id = v('evHall');
    const coordinator = v('evCoord'), expected_count = v('evCount');
    const days = parseInt(v('evDays') || 1);
    const description = v('evDesc');
    const special_requirements = v('evSpecialReq');

    if (!title || !date) { showToast('Please fill Event Title and Date', 'error'); if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML=originalHtml;} return; }
    if (!hall_id) { showToast('Please select at least one Hall on step 2', 'error'); if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML=originalHtml;} return; }
    if (!coordinator) { showToast('Please enter the Event Coordinator name', 'error'); if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML=originalHtml;} return; }

    // Mandatory agenda check
    const agendaInput = document.getElementById('evAgenda');
    if (!agendaInput || !agendaInput.files || agendaInput.files.length === 0) {
      showToast('📎 Agenda is mandatory. Please attach a file.', 'error'); 
      if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML=originalHtml;}
      return;
    }

    const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value === 'yes';
    const inventory = await api('/api/inventory');
    const items = inventory.map(i => ({ item_id: i.id, qty: parseInt(document.getElementById('qty_' + i.id)?.value || 0) })).filter(i => i.qty > 0);
    const departments = getSelectedDepartments();

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
      if (!classNo) { showToast('Please enter the Classroom Number', 'error'); if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML=originalHtml;} return; }
      fd.append('custom_classroom', classNo);
    }

    const resp = await fetch('/api/events', { method: 'POST', body: fd, credentials: 'include' });
    if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Submission failed'); }
    
    showToast('Proposal submitted successfully! 🎉', 'success');
    
    // Slight delay to ensure toast is seen before navigation
    setTimeout(() => {
      navigateTo('my-events');
    }, 800);

  } catch (err) {
    showToast('Submission Error: ' + err.message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  } finally {
    releaseLock('submitNewEvent');
  }
}
