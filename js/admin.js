/**
 * =========================================================================
 * Ambara Architects & Construction — Admin Dashboard Controller (js/admin.js)
 * Manages enquiries, Google Sheets sync, Cloudinary photos, and analytics
 * =========================================================================
 */

(function () {
  'use strict';

  // DOM Helpers
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // Constants
  const STORAGE_KEY_ENQ = 'wsite_enq';
  const STORAGE_KEY_PROJ = 'wsite_proj';
  const STORAGE_KEY_PASS = 'ambara_admin_pw';
  const DEFAULT_PASS = 'ambara123';

  const STATUSES = ['New', 'Contacted', 'Site visit', 'Quotation', 'Won', 'Lost'];
  const STATUS_COLORS = {
    New: '#f0d78c',
    Contacted: '#6fb3ff',
    'Site visit': '#b58cff',
    Quotation: '#ff9f5c',
    Won: '#4ade80',
    Lost: '#ff7a7a'
  };
  const CATEGORIES = ['Completed', 'Ongoing', 'Elevation', 'Interior'];

  // Utilities
  const getStored = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || '[]');
    } catch (e) {
      return [];
    }
  };

  const setStored = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      showToast('Local storage full. Delete old photos or connect Cloudinary.');
      return false;
    }
  };

  const escapeHtml = (str) =>
    String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const timeAgo = (dateStr) => {
    const sec = (Date.now() - new Date(dateStr)) / 1000;
    if (isNaN(sec) || sec < 60) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    return Math.floor(sec / 86400) + 'd ago';
  };

  const showToast = (msg) => {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('o');
    setTimeout(() => t.classList.remove('o'), 2500);
  };

  const renderStatusPill = (status) => {
    const col = STATUS_COLORS[status] || '#9a9789';
    return `<span class="p" style="color:${col};border-color:${col}66">${status}</span>`;
  };

  /* -------------------------------------------------------------
     1. Authentication
     ------------------------------------------------------------- */
  const getPassword = () => localStorage.getItem(STORAGE_KEY_PASS) || DEFAULT_PASS;

  const enterApp = () => {
    $('#login').hidden = true;
    $('#app').hidden = false;
    const td = $('#td');
    if (td) {
      td.textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
    switchView('dash');
    checkSyncStatus();
    autoSyncFromCloud();
  };

  const lf = $('#lf');
  if (lf) {
    lf.onsubmit = (e) => {
      e.preventDefault();
      const entered = ($('#pw')?.value || '').trim();
      if (entered === getPassword()) {
        sessionStorage.setItem('wsite_auth', '1');
        enterApp();
      } else {
        const er = $('#er');
        if (er) er.textContent = 'Invalid password. Default is ambara123';
      }
    };
  }

  $$('#lo, #lo2').forEach(b => {
    b.onclick = () => {
      sessionStorage.removeItem('wsite_auth');
      location.reload();
    };
  });

  /* -------------------------------------------------------------
     2. Views Navigation
     ------------------------------------------------------------- */
  function switchView(viewName) {
    $$('main > section').forEach(s => {
      s.hidden = s.id !== 'v-' + viewName;
    });
    $$('nav button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === viewName);
    });

    const titles = {
      dash: 'Dashboard Overview',
      enq: 'Customer Enquiries',
      proj: 'Project Photo Gallery'
    };
    const ttl = $('#ttl');
    if (ttl) ttl.textContent = titles[viewName] || 'Dashboard';

    renderAllViews();

    if (viewName === 'enq' || viewName === 'dash') {
      autoSyncFromCloud();
    }
  }

  $$('nav button').forEach(b => {
    b.onclick = () => switchView(b.dataset.v);
  });
  $$('[data-go]').forEach(b => {
    b.onclick = () => switchView(b.dataset.go);
  });

  function renderAllViews() {
    renderDashboard();
    renderEnquiries();
    renderProjects();
  }

  /* -------------------------------------------------------------
     3. Dashboard View
     ------------------------------------------------------------- */
  function renderDashboard() {
    const list = getStored(STORAGE_KEY_ENQ);
    const countStatus = (s) => list.filter(x => x.status === s).length;
    const inProgress = countStatus('Contacted') + countStatus('Site visit') + countStatus('Quotation');
    const wonCount = countStatus('Won');
    const convRate = list.length ? Math.round((wonCount / list.length) * 100) : 0;

    const I = {
      total: 'M4 5h16v12H8l-4 4zM8 9h8M8 13h5',
      new: 'M12 3l2.5 5.5 6 .8-4.4 4.1 1.1 6L12 16.5 6.8 19.4l1.1-6L3.5 9.3l6-.8z',
      progress: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
      won: 'M5 13l4 4L19 7'
    };

    const cards = [
      ['Total enquiries', list.length, I.total, 'From website form & WhatsApp'],
      ['New', countStatus('New'), I.new, countStatus('New') ? 'Needs follow-up' : 'All caught up'],
      ['In progress', inProgress, I.progress, 'Active discussions'],
      ['Won / Closed', wonCount, I.won, convRate + '% conversion rate']
    ];

    const cs = $('#cs');
    if (cs) {
      cs.innerHTML = cards.map(c => `
        <div class="sc">
          <div class="ic"><svg viewBox="0 0 24 24"><path d="${c[2]}"/></svg></div>
          <b>${c[1]}</b>
          <span>${c[0]}</span>
          <em>${c[3]}</em>
        </div>
      `).join('');
    }

    // Greeting
    const h = new Date().getHours();
    const gr2 = $('#gr2');
    if (gr2) {
      gr2.textContent = h < 12 ? 'GOOD MORNING' : h < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
    }

    // Weekly Chart (last 7 days)
    const days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      return d;
    });

    const counts = days.map(d =>
      list.filter(x => new Date(x.date).toDateString() === d.toDateString()).length
    );
    const maxVal = Math.max(1, ...counts);

    const wk = $('#wk');
    if (wk) {
      wk.innerHTML = days.map((d, i) => `
        <div>
          <b>${counts[i] || ''}</b>
          <u style="height:${(counts[i] / maxVal) * 100}%"></u>
          <span>${d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
        </div>
      `).join('');
    }

    // Pipeline Bars
    const bars = $('#bars');
    if (bars) {
      bars.innerHTML = STATUSES.map(s => `
        <div class="bar">
          <span>${s}</span>
          <i><u style="width:${list.length ? (countStatus(s) / list.length) * 100 : 0}%;background:${STATUS_COLORS[s]}"></u></i>
          <b style="font-weight:400">${countStatus(s)}</b>
        </div>
      `).join('');
    }

    // Recent 5 enquiries
    const rec = $('#rec');
    if (rec) {
      rec.innerHTML = list.slice(0, 5).map(renderEnquiryRow).join('') ||
        '<div class="empty">No enquiries yet.<br>New submissions from your website form will appear here.</div>';
      bindEnquiryClicks('#rec');
    }

    // Badge in sidebar
    const newCount = countStatus('New');
    const nb = $('#nb');
    if (nb) {
      nb.hidden = !newCount;
      nb.textContent = newCount;
    }
  }

  /* -------------------------------------------------------------
     4. Enquiries View
     ------------------------------------------------------------- */
  const renderEnquiryRow = (x) => `
    <div class="row" data-id="${x.id}">
      <div class="av">${escapeHtml((x.name || '?')[0].toUpperCase())}</div>
      <div class="ri">
        <b>${escapeHtml(x.name)}</b>
        <small>${escapeHtml(x.service || 'Enquiry')} · ${escapeHtml(x.phone || x.msg)}</small>
      </div>
      ${renderStatusPill(x.status)}
      <span class="t">${timeAgo(x.date)}</span>
      <button class="row-del-btn" title="Delete enquiry" data-del="${x.id}">✕</button>
    </div>
  `;

  const bindEnquiryClicks = (containerSelector) => {
    $$(containerSelector + ' .row').forEach(row => {
      row.onclick = (e) => {
        const delBtn = e.target.closest('.row-del-btn');
        if (delBtn) {
          e.stopPropagation();
          const delId = delBtn.dataset.del;
          if (confirm('Delete this enquiry?')) {
            const updated = getStored(STORAGE_KEY_ENQ).filter(y => String(y.id) !== String(delId));
            setStored(STORAGE_KEY_ENQ, updated);
            renderAllViews();
            showToast('Enquiry deleted');
          }
          return;
        }
        openEnquiryDrawer(row.dataset.id);
      };
    });
  };

  const fs = $('#fs');
  if (fs) {
    fs.innerHTML = '<option value="">All statuses</option>' + STATUSES.map(s => `<option>${s}</option>`).join('');
  }

  function renderEnquiries() {
    const filter = $('#fs')?.value || '';
    const list = getStored(STORAGE_KEY_ENQ).filter(x =>
      (!filter || x.status === filter)
    );

    const el = $('#el');
    if (el) {
      el.innerHTML = list.map(renderEnquiryRow).join('') ||
        '<div class="empty">No enquiries found for this filter.<br>Customer submissions from the website will automatically appear here.</div>';
      bindEnquiryClicks('#el');
    }
  }

  if ($('#fs')) $('#fs').onchange = renderEnquiries;

  // Export CSV
  const btnCsv = $('#csv');
  if (btnCsv) {
    btnCsv.onclick = () => {
      const list = getStored(STORAGE_KEY_ENQ);
      if (!list.length) return showToast('Nothing to export yet.');
      const headers = ['ID', 'Date', 'Name', 'Phone', 'Email', 'Service', 'Message', 'Status', 'Notes'];
      const rows = list.map(x => [
        x.id,
        x.date,
        x.name,
        x.phone,
        x.email,
        x.service,
        x.msg,
        x.status,
        x.notes
      ]);
      const csv = [headers, ...rows]
        .map(row => row.map(cell => '"' + String(cell ?? '').replace(/"/g, '""') + '"').join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ambara-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    };
  }

  // Automatic Cloud Sync (Fetches latest enquiries from Google Sheets for any device)
  async function autoSyncFromCloud() {
    if (!window.AmbaraSheets || !window.AmbaraSheets.getUrl()) {
      checkSyncStatus();
      return;
    }

    setSyncDot('syncing');
    try {
      const res = await window.AmbaraSheets.fetchEnquiries();
      if (res && res.ok && res.source === 'cloud') {
        setSyncDot('online');
        renderAllViews();
      } else {
        checkSyncStatus();
      }
    } catch (e) {
      checkSyncStatus();
    }
  }

  function setSyncDot(state) {
    const dot = $('#sync-dot');
    const label = $('#sync-label');
    if (!dot || !label) return;

    dot.className = 'sync-dot ' + (state === 'online' ? '' : state);
    if (state === 'online') label.textContent = 'Google Sheets Connected';
    else if (state === 'syncing') label.textContent = 'Syncing with Google Sheets…';
    else label.textContent = 'Local Database (Offline / Setup needed)';
  }

  function checkSyncStatus() {
    if (window.AmbaraSheets && window.AmbaraSheets.getUrl()) {
      setSyncDot('online');
    } else {
      setSyncDot('offline');
    }
  }

  /* -------------------------------------------------------------
     5. Enquiry Detail Drawer
     ------------------------------------------------------------- */
  const dr = $('#dr');
  const bk = $('#bk');

  function openEnquiryDrawer(id) {
    const list = getStored(STORAGE_KEY_ENQ);
    const item = list.find(y => String(y.id) === String(id));
    if (!item || !dr) return;

    let phoneDigits = String(item.phone || '').replace(/\D/g, '');
    if (phoneDigits.length === 10) phoneDigits = '91' + phoneDigits;

    dr.innerHTML = `
      <div class="dh">
        <h2>${escapeHtml(item.name)}</h2>
        <button class="x" id="dx">✕</button>
      </div>
      ${renderStatusPill(item.status)}
      
      <div class="acts">
        <a class="btn" href="tel:${escapeHtml(item.phone)}">Call Client</a>
        <a class="btn o" target="_blank" href="https://wa.me/${phoneDigits}?text=${encodeURIComponent('Hi ' + item.name + ', thanks for reaching out to Ambara Architects & Construction.')}">Open WhatsApp</a>
        ${item.email ? `<a class="btn o" href="mailto:${escapeHtml(item.email)}">Send Email</a>` : ''}
      </div>

      <div class="kv">
        <div><small>Phone</small><b>${escapeHtml(item.phone || '-')}</b></div>
        <div><small>Email</small>${escapeHtml(item.email || '-')}</div>
        <div><small>Service Requested</small><b>${escapeHtml(item.service || '-')}</b></div>
        <div><small>Message / Plot Details</small>${escapeHtml(item.msg || '-')}</div>
        <div><small>Received On</small>${new Date(item.date).toLocaleString()}</div>
      </div>

      <small style="color:var(--mut)">Update Status</small>
      <div class="chips">
        ${STATUSES.map(s => `
          <button class="p ${item.status === s ? 'on' : ''}" data-s="${s}" 
            style="color:${STATUS_COLORS[s]};border-color:${STATUS_COLORS[s]}66;${item.status === s ? 'background:' + STATUS_COLORS[s] : ''}">
            ${s}
          </button>
        `).join('')}
      </div>

      <small style="color:var(--mut)">Internal Notes (Plot size, site visit schedule, quotation)</small>
      <textarea id="nt" rows="4" placeholder="Add follow-up notes here…" style="margin:6px 0 16px">${escapeHtml(item.notes || '')}</textarea>
      
      <button class="btn r" id="dl">Delete Enquiry</button>
    `;

    dr.classList.add('o');
    if (bk) bk.classList.add('o');

    // Drawer event listeners
    const btnClose = $('#dx');
    if (btnClose) btnClose.onclick = closeDrawer;

    // Status chips
    $$('.chips button').forEach(btn => {
      btn.onclick = () => {
        const newStatus = btn.dataset.s;
        updateEnquiryFields(id, { status: newStatus });
        openEnquiryDrawer(id);
        renderAllViews();
      };
    });

    // Notes auto-save
    const nt = $('#nt');
    if (nt) {
      nt.oninput = (e) => {
        updateEnquiryFields(id, { notes: e.target.value });
      };
    }

    // Delete
    const btnDel = $('#dl');
    if (btnDel) {
      btnDel.onclick = () => {
        if (confirm(`Delete enquiry from ${item.name}?`)) {
          const updated = getStored(STORAGE_KEY_ENQ).filter(y => String(y.id) !== String(id));
          setStored(STORAGE_KEY_ENQ, updated);
          closeDrawer();
          renderAllViews();
          showToast('Enquiry deleted');
        }
      };
    }
  }

  function updateEnquiryFields(id, changes) {
    const list = getStored(STORAGE_KEY_ENQ);
    const idx = list.findIndex(y => String(y.id) === String(id));
    if (idx > -1) {
      Object.assign(list[idx], changes);
      setStored(STORAGE_KEY_ENQ, list);

      // Push to Google Sheets if connected
      if (window.AmbaraSheets) {
        window.AmbaraSheets.updateEnquiry(id, changes);
      }
    }
  }

  const closeDrawer = () => {
    if (dr) dr.classList.remove('o');
    if (bk) bk.classList.remove('o');
  };
  if (bk) bk.onclick = closeDrawer;

  /* -------------------------------------------------------------
     6. Project Photo Gallery (Cloudinary + Local)
     ------------------------------------------------------------- */
  const fi = $('#fi');
  const dz = $('#dz');
  const progressBox = $('#upload-prog');

  async function handlePhotoUpload(files) {
    if (!files || !files.length) return;

    const list = getStored(STORAGE_KEY_PROJ);
    let addedCount = 0;

    if (progressBox) progressBox.hidden = false;

    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;

      const title = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      
      try {
        let uploadResult;
        if (window.AmbaraCloudinary) {
          uploadResult = await window.AmbaraCloudinary.upload(f, (pct) => {
            const spinnerText = $('#spinner-text');
            if (spinnerText) spinnerText.textContent = `Uploading "${title}"… ${pct}%`;
          });
        }

        const photoUrl = uploadResult?.url || '';
        if (photoUrl) {
          list.push({
            id: Date.now() + Math.random(),
            title: title,
            cat: 'Completed',
            img: photoUrl,
            on: true,
            source: uploadResult?.source || 'local'
          });
          addedCount++;
        }
      } catch (err) {
        console.error('Error adding photo:', err);
      }
    }

    if (progressBox) progressBox.hidden = true;

    if (addedCount > 0) {
      if (setStored(STORAGE_KEY_PROJ, list)) {
        showToast(`${addedCount} photo(s) added successfully!`);
        renderProjects();
      }
    }
  }

  if (fi) fi.onchange = (e) => handlePhotoUpload(e.target.files);

  if (dz) {
    ['dragenter', 'dragover'].forEach(v => {
      dz.addEventListener(v, (e) => { e.preventDefault(); dz.classList.add('h'); });
    });
    ['dragleave', 'drop'].forEach(v => {
      dz.addEventListener(v, (e) => { e.preventDefault(); dz.classList.remove('h'); });
    });
    dz.addEventListener('drop', (e) => handlePhotoUpload(e.dataTransfer.files));
  }

  function renderProjects() {
    const list = getStored(STORAGE_KEY_PROJ);
    const gr = $('#gr');
    const mu = $('#mu');

    // Storage calculation
    const rawStorageLength = (localStorage.getItem(STORAGE_KEY_PROJ) || '').length;
    if (mu) {
      mu.style.width = Math.min(100, (rawStorageLength / 4.5e6) * 100) + '%';
    }

    if (!gr) return;

    if (!list.length) {
      gr.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          No custom photos uploaded yet.<br>
          Drop high-resolution photos above to replace the website's default placeholders!
        </div>
      `;
      return;
    }

    gr.innerHTML = list.map((p, i) => `
      <div class="pc ${p.on ? '' : 'off'}">
        <img src="${p.img}" alt="${escapeHtml(p.title)}" loading="lazy">
        <div>
          <input data-i="${i}" data-k="title" value="${escapeHtml(p.title)}" placeholder="Project title">
          <select data-i="${i}" data-k="cat">
            ${CATEGORIES.map(c => `<option ${p.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <div class="ac">
            <button data-a="l" data-i="${i}" title="Move Left">←</button>
            <button data-a="t" data-i="${i}">${p.on ? 'Hide' : 'Show'}</button>
            <button data-a="r" data-i="${i}" title="Move Right">→</button>
            <button data-a="d" data-i="${i}" title="Delete" style="color:#ff8a8a">🗑</button>
          </div>
        </div>
      </div>
    `).join('');

    // Input changes (title & category)
    $$('#gr [data-k]').forEach(e => {
      e.onchange = () => {
        const b = getStored(STORAGE_KEY_PROJ);
        b[+e.dataset.i][e.dataset.k] = e.value;
        setStored(STORAGE_KEY_PROJ, b);
      };
    });

    // Action buttons (move left/right, toggle on/off, delete)
    $$('#gr [data-a]').forEach(btn => {
      btn.onclick = () => {
        const b = getStored(STORAGE_KEY_PROJ);
        const idx = +btn.dataset.i;
        const act = btn.dataset.a;

        if (act === 'd') {
          if (!confirm('Delete this photo from the website gallery?')) return;
          b.splice(idx, 1);
        } else if (act === 't') {
          b[idx].on = !b[idx].on;
        } else {
          const targetIdx = act === 'l' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= b.length) return;
          [b[idx], b[targetIdx]] = [b[targetIdx], b[idx]];
        }

        setStored(STORAGE_KEY_PROJ, b);
        renderProjects();
      };
    });
  }

  /* -------------------------------------------------------------
     7. Multi-tab Storage Event Listener
     ------------------------------------------------------------- */
  window.addEventListener('storage', (e) => {
    if (!$('#app').hidden && (e.key === STORAGE_KEY_ENQ || e.key === STORAGE_KEY_PROJ)) {
      renderAllViews();
    }
  });

  // Check initial login state
  if (sessionStorage.getItem('wsite_auth')) {
    enterApp();
  }

})();
