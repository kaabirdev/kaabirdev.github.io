/* ==========================================================================
   Zeriour — UI kit
   Formatters, feedback surfaces, overlays, menus and the shared data table.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';

  const UI = {};
  ZR.ui = UI;

  /* ----------------------------------------------------------- primitives */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  UI.qs = qs; UI.qsa = qsa;

  UI.el = function (tag, attrs = {}, html) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
    });
    if (html !== undefined) node.innerHTML = html;
    return node;
  };

  UI.esc = (value) => String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  UI.icon = (name, cls = '') => `<i class="ph ph-${String(name || 'info').replace(/^ph-/, '')} ${cls}" aria-hidden="true"></i>`;

  /* Give unassociated form controls an accessible name from their visible label. */
  UI.enhanceA11y = function (root = document) {
    root.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((el) => {
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label')) return;
      if (el.labels && el.labels.length) return;
      const field = el.closest('.field') || el.closest('td');
      const label = field && field.querySelector('label.label, label');
      const text = label ? label.textContent.replace(/\s+/g, ' ').replace(/\*/g, '').replace(/\(optional\)/i, '').trim() : (el.placeholder || '');
      if (text) el.setAttribute('aria-label', text);
    });
  };

  UI.debounce = function (fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  /* ---------------------------------------------------------- formatters */
  UI.money = function (n, opts = {}) {
    const num = Number(n) || 0;
    const sign = num < 0 ? '−' : '';
    const abs = Math.abs(num);
    const formatted = abs.toLocaleString('en-US', {
      minimumFractionDigits: opts.decimals || 0,
      maximumFractionDigits: opts.decimals === undefined ? 0 : opts.decimals
    });
    return `${sign}৳${formatted}`;
  };
  UI.moneyShort = function (n) {
    const v = Math.abs(Number(n) || 0);
    const sign = Number(n) < 0 ? '−' : '';
    if (v >= 10000000) return `${sign}৳${(v / 10000000).toFixed(2)}Cr`;
    if (v >= 100000) return `${sign}৳${(v / 100000).toFixed(2)}L`;
    if (v >= 1000) return `${sign}৳${(v / 1000).toFixed(1)}k`;
    return `${sign}৳${v}`;
  };
  UI.num = (n) => (Number(n) || 0).toLocaleString('en-US');
  UI.kg = (n) => `${(Number(n) || 0).toFixed(n % 1 === 0 ? 0 : 1)} kg`;
  UI.pct = (n, dp = 1) => `${(Number(n) || 0).toFixed(dp)}%`;

  UI.date = function (iso, style = 'medium') {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    if (style === 'short') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    if (style === 'long') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  UI.time = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  UI.dateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };
  UI.dateTimeFull = (iso) => `${UI.date(iso, 'long')} · ${UI.time(iso)}`;
  UI.weekday = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' });
  UI.relative = function (iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (Math.abs(mins) < 1) return 'just now';
    if (mins < 0) {
      const f = Math.abs(mins);
      if (f < 60) return `in ${f}m`;
      const fh = Math.round(f / 60);
      if (fh < 24) return `in ${fh}h`;
      return `in ${Math.round(fh / 24)}d`;
    }
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.round(months / 12)}y ago`;
  };
  UI.eta = function (iso) {
    const d = new Date(iso);
    const today = new Date();
    const days = Math.ceil((d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };
  UI.initials = (name) => String(name || '')
    .replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2)
    .map((w) => (w[0] || '')).join('').toUpperCase() || 'ZR';
  UI.phone = (p) => String(p || '').replace(/(\+880)(\d{2})(\d{4})(\d+)/, '$1 $2 $3 $4');

  /* ---------------------------------------------------------------- badges */
  UI.statusBadge = function (key, opts = {}) {
    const meta = ZR.statusMeta(key);
    const label = opts.short ? meta.short : meta.label;
    return `<span class="badge badge-${meta.tone}${opts.lg ? ' badge-lg' : ''}"><i class="dot"></i>${UI.esc(label)}</span>`;
  };
  UI.userBadge = function (status) {
    const map = {
      active: ['success', 'Active'], pending: ['warn', 'Pending'], suspended: ['danger', 'Suspended'],
      rejected: ['neutral', 'Rejected'], on_leave: ['warn', 'On leave'], open: ['info', 'Open'],
      in_progress: ['warn', 'In progress'], resolved: ['success', 'Resolved'], closed: ['neutral', 'Closed'],
      approved: ['success', 'Approved'], paid: ['success', 'Paid'], settled: ['success', 'Settled'],
      pending_review: ['warn', 'Pending review'], paused: ['neutral', 'Paused'], expired: ['neutral', 'Expired'],
      sealed: ['info', 'Sealed'], dispatched: ['progress', 'Dispatched'], received: ['success', 'Received'],
      in_transit: ['progress', 'In transit'], scheduled: ['info', 'Scheduled'], picked: ['success', 'Picked'],
      restricted: ['warn', 'Restricted'], full: ['success', 'Full coverage']
    };
    const [tone, label] = map[status] || ['neutral', String(status || '—').replace(/_/g, ' ')];
    return `<span class="badge badge-${tone}"><i class="dot"></i>${UI.esc(label)}</span>`;
  };
  UI.priorityBadge = function (p) {
    const map = { urgent: 'danger', high: 'warn', medium: 'info', low: 'neutral' };
    return `<span class="badge badge-${map[p] || 'neutral'}">${UI.esc(p)}</span>`;
  };

  UI.avatar = function (name, opts = {}) {
    const tone = opts.tone || ['', 'tone-violet', 'tone-success', 'tone-warn', 'tone-sky'][Math.abs(hash(name)) % 5];
    return `<span class="avatar ${opts.size || ''} ${tone} ${opts.square ? 'sq' : ''}" aria-hidden="true">${UI.esc(UI.initials(name))}</span>`;
  };
  function hash(str) {
    let h = 0;
    for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) | 0;
    return h;
  }

  /* --------------------------------------------------------------- toasts */
  UI.toast = function (title, desc = '', type = 'success', opts = {}) {
    let stack = qs('.toast-stack');
    if (!stack) {
      stack = UI.el('div', { class: 'toast-stack', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(stack);
    }
    const icons = { success: 'ph-check-circle', error: 'ph-x-circle', warn: 'ph-warning', info: 'ph-info' };
    const node = UI.el('div', { class: `toast ${type}` }, `
      <span class="t-ico">${UI.icon(icons[type] || 'ph-info')}</span>
      <div class="t-body">
        <div class="t-title">${UI.esc(title)}</div>
        ${desc ? `<div class="t-desc">${UI.esc(desc)}</div>` : ''}
      </div>
      <button class="icon-btn sm t-close" aria-label="Dismiss notification">${UI.icon('x')}</button>
    `);
    node.querySelector('.t-close').addEventListener('click', () => remove());
    stack.appendChild(node);
    let timer = setTimeout(remove, opts.duration || 4600);
    function remove() {
      clearTimeout(timer);
      if (!node.isConnected) return;
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 190);
    }
    node.addEventListener('mouseenter', () => clearTimeout(timer));
    node.addEventListener('mouseleave', () => { timer = setTimeout(remove, 2200); });
    return { close: remove };
  };

  /* --------------------------------------------------------------- overlays */
  let openOverlays = 0;
  function lockScroll() {
    openOverlays += 1;
    document.body.style.overflow = 'hidden';
  }
  function unlockScroll() {
    openOverlays = Math.max(0, openOverlays - 1);
    if (!openOverlays) document.body.style.overflow = '';
  }

  UI.modal = function ({ title = '', subtitle = '', body = '', footer = '', size = '', icon = '', closable = true, onMount } = {}) {
    const root = UI.el('div', { class: 'modal-root open' }, `
      <div class="modal-backdrop" data-close></div>
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${UI.esc(title || 'Dialog')}">
        <div class="modal-head">
          <div>
            <h3>${icon ? UI.icon(icon) + ' ' : ''}${UI.esc(title)}</h3>
            ${subtitle ? `<p>${UI.esc(subtitle)}</p>` : ''}
          </div>
          ${closable ? `<button class="icon-btn" data-close aria-label="Close dialog">${UI.icon('x')}</button>` : ''}
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
      </div>
    `);
    document.body.appendChild(root);
    lockScroll();
    const previouslyFocused = document.activeElement;
    const close = () => {
      if (!root.isConnected) return;
      root.remove();
      unlockScroll();
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
    const onKey = (e) => { if (e.key === 'Escape' && closable) close(); };
    document.addEventListener('keydown', onKey);
    root.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', close));
    setTimeout(() => {
      const target = root.querySelector('input:not([type=hidden]), textarea, select, button.btn-primary, button.btn-danger');
      if (target) target.focus();
    }, 40);
    UI.enhanceA11y(root);
    if (onMount) onMount(root, close);
    return { el: root, close };
  };

  UI.confirm = function ({ title = 'Are you sure?', body = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false, icon = '' } = {}) {
    return new Promise((resolve) => {
      let decided = false;
      const inst = UI.modal({
        title, size: 'narrow', icon: icon || (danger ? 'ph-warning' : 'ph-question'),
        body: `<p style="font-size:var(--text-sm);color:var(--muted);line-height:1.6">${body}</p>`,
        footer: `<button class="btn" data-no>${UI.esc(cancelText)}</button>
                 <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${UI.esc(confirmText)}</button>`,
        onMount(root, close) {
          root.querySelector('[data-no]').addEventListener('click', () => { decided = true; close(); resolve(false); });
          root.querySelector('[data-yes]').addEventListener('click', () => { decided = true; close(); resolve(true); });
          root.querySelector('.modal-backdrop').addEventListener('click', () => { if (!decided) resolve(false); });
        }
      });
      const observer = new MutationObserver(() => {
        if (!document.body.contains(inst.el)) { observer.disconnect(); if (!decided) resolve(false); }
      });
      observer.observe(document.body, { childList: true });
    });
  };

  UI.drawer = function ({ title = '', subtitle = '', body = '', footer = '', size = '', onMount } = {}) {
    const root = UI.el('div', { class: 'drawer-root open' }, `
      <div class="modal-backdrop" data-close></div>
      <aside class="drawer ${size}" role="dialog" aria-modal="true" aria-label="${UI.esc(title)}">
        <div class="drawer-head">
          <div>
            <h3 style="font-size:var(--text-lg)">${UI.esc(title)}</h3>
            ${subtitle ? `<p class="tiny muted" style="margin-top:3px">${subtitle}</p>` : ''}
          </div>
          <button class="icon-btn" data-close aria-label="Close panel">${UI.icon('x')}</button>
        </div>
        <div class="drawer-body">${body}</div>
        ${footer ? `<div class="drawer-foot">${footer}</div>` : ''}
      </aside>
    `);
    document.body.appendChild(root);
    lockScroll();
    const close = () => {
      if (!root.isConnected) return;
      root.remove();
      unlockScroll();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    UI.enhanceA11y(root);
    if (onMount) onMount(root, close);
    return { el: root, close };
  };

  /* ----------------------------------------------------------------- menus */
  UI.menu = function (anchor, items, opts = {}) {
    UI.closeMenus();
    const list = items.filter((i) => i && !i.hidden);
    const menu = UI.el('div', { class: 'menu', role: 'menu', style: 'position:fixed' });
    menu.setAttribute('data-align', 'right');
    list.forEach((item) => {
      if (item.sep) { menu.appendChild(UI.el('div', { class: 'menu-sep' })); return; }
      if (item.label && item.heading) {
        menu.appendChild(UI.el('div', { class: 'menu-label' }, UI.esc(item.label)));
        return;
      }
      const btn = UI.el('button', { class: 'menu-item' + (item.danger ? ' danger' : ''), role: 'menuitem', type: 'button' },
        `${item.icon ? UI.icon(item.icon) : ''}<span>${UI.esc(item.label)}</span>${item.meta ? `<span class="badge badge-neutral" style="margin-left:auto">${UI.esc(item.meta)}</span>` : ''}`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        close();
        if (item.onClick) item.onClick();
      });
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = opts.align === 'left' ? rect.left : rect.right - mw;
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
    let top = rect.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, rect.top - mh - 6);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    const close = () => {
      menu.remove();
      document.removeEventListener('click', onDoc, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
    const onDoc = (e) => {
      if (!menu.contains(e.target) && !anchor.contains(e.target)) close();
    };
    setTimeout(() => {
      document.addEventListener('click', onDoc, true);
      window.addEventListener('resize', close);
      window.addEventListener('scroll', close, true);
    }, 0);
    UI._activeMenu = { close };
    return { el: menu, close };
  };
  UI.closeMenus = function () { if (UI._activeMenu) { UI._activeMenu.close(); UI._activeMenu = null; } };

  /* ------------------------------------------------------------ misc blocks */
  UI.empty = function ({ icon = 'ph-tray', title = 'Nothing here yet', body = '', action = '' } = {}) {
    return `<div class="empty-state">
      <div class="empty-ico">${UI.icon(icon)}</div>
      <h4>${UI.esc(title)}</h4>
      ${body ? `<p>${body}</p>` : ''}
      ${action}
    </div>`;
  };

  UI.skeletonRows = (n = 5) => Array.from({ length: n }, () =>
    `<div class="row gap-3" style="padding:12px 16px;border-bottom:1px solid var(--line-soft)">
      <div class="skeleton" style="width:34px;height:34px;border-radius:8px"></div>
      <div class="grow"><div class="skeleton sk-line" style="width:42%"></div><div class="skeleton sk-line mt-2" style="width:26%;height:8px"></div></div>
      <div class="skeleton sk-line" style="width:70px"></div>
    </div>`).join('');

  UI.kpiSkeleton = (n = 4) => Array.from({ length: n }, () =>
    `<div class="card card-pad"><div class="skeleton sk-line" style="width:50%"></div>
     <div class="skeleton mt-3" style="width:64%;height:28px"></div>
     <div class="skeleton sk-line mt-3" style="width:34%;height:8px"></div></div>`).join('');

  UI.spinner = (lg) => `<span class="spinner ${lg ? 'lg' : ''}" role="status" aria-label="Loading"></span>`;

  /* --------------------------------------------------------------- CSV I/O */
  UI.csv = {
    export(filename, rows, headers) {
      if (!rows || !rows.length) { UI.toast('Nothing to export', 'Add some records first.', 'warn'); return; }
      const cols = headers || Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
      const escape = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [
        cols.map((c) => escape(c.label)).join(','),
        ...rows.map((r) => cols.map((c) => escape(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(','))
      ].join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = UI.el('a', { href: url, download: filename });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      UI.toast('Export ready', `${rows.length} rows downloaded as CSV.`, 'success');
    },
    parse(text) {
      const rows = [];
      let cur = [], field = '', inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
          else if (ch === '"') inQuotes = false;
          else field += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { cur.push(field); field = ''; }
        else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
        else if (ch !== '\r') field += ch;
      }
      if (field || cur.length) { cur.push(field); rows.push(cur); }
      const clean = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
      if (!clean.length) return { headers: [], rows: [] };
      const headers = clean.shift().map((h) => h.trim());
      return { headers, rows: clean.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()]))) };
    }
  };

  /* ------------------------------------------------------------ validate */
  UI.validators = {
    required: (v) => !!String(v || '').trim() || 'This field is required.',
    phone: (v) => /^(?:\+?880|0)1[3-9]\d{8}$/.test(String(v).replace(/[\s-]/g, '')) || 'Enter a valid Bangladeshi phone number.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v)) || 'Enter a valid email address.',
    number: (v, min, max) => {
      const n = Number(v);
      if (v === '' || isNaN(n)) return 'Enter a valid number.';
      if (min !== undefined && n < min) return `Must be at least ${min}.`;
      if (max !== undefined && n > max) return `Must be ${max} or less.`;
      return true;
    },
    minLength: (v, n) => String(v || '').length >= n || `Use at least ${n} characters.`
  };
  /**
   * Validate a form against a rule map. Shows inline errors and returns validity.
   * rules: { fieldName: [{test, message}] }
   */
  UI.validate = function (form, rules) {
    let valid = true;
    Object.entries(rules).forEach(([name, checks]) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (!input) return;
      const field = input.closest('.field');
      const errEl = field ? field.querySelector('.error-text') : null;
      let error = '';
      for (const check of checks) {
        const result = typeof check === 'function' ? check(input.value, input, form) : true;
        if (result !== true) { error = typeof result === 'string' ? result : 'Please check this field.'; break; }
      }
      if (field) {
        field.classList.toggle('invalid', !!error);
        field.classList.toggle('valid', !error && !!String(input.value).trim());
      }
      if (errEl) {
        errEl.textContent = error;
        errEl.hidden = !error;
      }
      input.setAttribute('aria-invalid', error ? 'true' : 'false');
      if (error) valid = false;
    });
    if (!valid) {
      const first = form.querySelector('.field.invalid input, .field.invalid select, .field.invalid textarea');
      if (first) first.focus();
    }
    return valid;
  };

  /* ------------------------------------------------------------- printing */
  UI.print = function (html, title = 'Zeriour document') {
    const win = window.open('', '_blank', 'width=860,height=980');
    if (!win) { UI.toast('Pop-up blocked', 'Allow pop-ups to print this document.', 'warn'); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${UI.esc(title)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;margin:0;padding:24px;color:#0a1728;background:#fff}
        .label-sheet{max-width:480px;margin:0 auto;border:1px solid #cbd7e6;border-radius:6px;padding:20px}
        .ls-head{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px}
        .ls-brand{font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:20px;letter-spacing:-.04em}
        .ls-code{font-family:monospace;font-size:24px;font-weight:700;margin:14px 0 2px}
        .barcode{display:flex;align-items:flex-end;gap:1.5px;height:56px;margin:12px 0}
        .barcode i{display:block;width:2px;background:#000}
        .ls-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;border-top:1px solid #000;padding-top:12px;margin-top:12px}
        .k{font-size:8px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:#555}
        .v{font-size:11px;font-weight:600;line-height:1.4}
        .invoice{max-width:640px;margin:0 auto}
        .inv-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0a1728;padding-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}
        th{text-align:left;background:#f4f7fb;padding:8px;border-bottom:1px solid #e3eaf3;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
        td{padding:9px 8px;border-bottom:1px solid #eef2f8}
        .right{text-align:right}
        .totals{margin-top:16px;margin-left:auto;width:280px;font-size:12px}
        .totals div{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e3eaf3}
        .totals .big{font-weight:700;font-size:15px;border-bottom:0;padding-top:10px}
        .muted{color:#64778f}.tiny{font-size:10px}
        @media print{body{padding:0}}
      </style></head><body>${html}<script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body></html>`);
    win.document.close();
  };

  UI.barcode = function (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) | 0;
    let out = '';
    for (let i = 0; i < 54; i++) {
      h = (h * 1103515245 + 12345) | 0;
      const w = (Math.abs(h) % 3) + 1;
      const tall = Math.abs(h >> 8) % 5 === 0;
      out += `<i style="width:${w}px;height:${tall ? 100 : 64 + (Math.abs(h >> 4) % 30)}%"></i>`;
    }
    return out;
  };

  UI.copy = async function (text, label = 'Copied to clipboard') {
    try {
      await navigator.clipboard.writeText(text);
      UI.toast(label, text, 'success');
    } catch (e) {
      const ta = UI.el('textarea', { style: 'position:fixed;opacity:0' });
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); UI.toast(label, text, 'success'); } catch (err) { UI.toast('Could not copy', 'Select the value manually.', 'error'); }
      ta.remove();
    }
  };

  /* ------------------------------------------------------------- data table */
  /**
   * Render a full-featured table with search, filters, sorting and pagination.
   * columns: [{key,label,render,sortable,sortValue,align,className,width}]
   */
  UI.table = function (mount, config) {
    if (typeof mount === 'string') mount = qs(mount);
    if (!mount) return null;
    const state = {
      rows: config.rows || [],
      page: 1,
      pageSize: config.pageSize || 10,
      sortKey: config.sortKey || null,
      sortDir: config.sortDir || 'desc',
      query: '',
      filters: {},
      selected: new Set()
    };
    (config.filters || []).forEach((f) => { state.filters[f.key] = f.value || ''; });

    mount.innerHTML = `
      <div class="card">
        ${config.toolbar === false ? '' : `
        <div class="table-toolbar no-print">
          ${config.searchable === false ? '<div class="grow"></div>' : `<div class="search-field">
            ${UI.icon('magnifying-glass')}
            <input type="search" placeholder="${UI.esc(config.searchPlaceholder || 'Search…')}" aria-label="Search table" data-tsearch>
          </div>`}
          <div class="row gap-2 wrap" data-toolbar-extra></div>
        </div>`}
        <div class="table-scroll-hint no-print">${UI.icon('arrows-horizontal')} Swipe to see more columns</div>
        <div class="table-wrap">
          <table class="table ${config.compact ? 'table-compact' : ''}" aria-label="${UI.esc(config.label || 'Data table')}">
            <thead></thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="pagination no-print"></div>
      </div>`;

    const extra = mount.querySelector('[data-toolbar-extra]');
    (config.actions || []).forEach((a) => {
      const btn = UI.el('button', { class: `btn ${a.variant || 'btn-sm'} btn-sm`, type: 'button' });
      btn.innerHTML = `${a.icon ? UI.icon(a.icon) : ''}${UI.esc(a.label)}`;
      btn.addEventListener('click', () => a.onClick(state.selected));
      extra.appendChild(btn);
    });
    (config.filters || []).forEach((f) => {
      const sel = UI.el('select', { class: 'select', style: 'height:38px;width:auto;min-height:38px;font-size:var(--text-xs);padding-left:10px', 'aria-label': f.label });
      sel.innerHTML = `<option value="">${UI.esc(f.label)}: All</option>` +
        f.options.map((o) => `<option value="${UI.esc(o.value)}">${UI.esc(o.label)}</option>`).join('');
      sel.addEventListener('change', () => { state.filters[f.key] = sel.value; state.page = 1; render(); });
      extra.appendChild(sel);
    });
    if (config.toolbarExtra) extra.insertAdjacentHTML('beforeend', config.toolbarExtra);

    const searchInput = mount.querySelector('[data-tsearch]');
    if (searchInput) {
      searchInput.addEventListener('input', UI.debounce(() => { state.query = searchInput.value.trim(); state.page = 1; render(); }, 160));
    }

    const thead = mount.querySelector('thead');
    const tbody = mount.querySelector('tbody');
    const pager = mount.querySelector('.pagination');

    function filtered() {
      let rows = state.rows.slice();
      if (config.filterRow) rows = rows.filter((r) => config.filterRow(r, state));
      const q = state.query.toLowerCase();
      if (q) {
        rows = rows.filter((r) => (config.searchFields || Object.keys(r))
          .some((k) => {
            const val = typeof k === 'function' ? k(r) : r[k];
            return val && String(val).toLowerCase().includes(q);
          }));
      }
      (config.filters || []).forEach((f) => {
        const v = state.filters[f.key];
        if (v) rows = rows.filter((r) => (f.match ? f.match(r, v) : String(r[f.key]) === v));
      });
      if (state.sortKey) {
        const col = config.columns.find((c) => c.key === state.sortKey);
        rows.sort((a, b) => {
          const av = col && col.sortValue ? col.sortValue(a) : a[state.sortKey];
          const bv = col && col.sortValue ? col.sortValue(b) : b[state.sortKey];
          if (av === bv) return 0;
          if (typeof av === 'number' && typeof bv === 'number') return state.sortDir === 'asc' ? av - bv : bv - av;
          return state.sortDir === 'asc'
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
        });
      } else if (config.defaultSort) {
        rows.sort(config.defaultSort);
      }
      return rows;
    }

    function renderHead() {
      const selectable = !!config.selectable;
      thead.innerHTML = `<tr>
        ${selectable ? `<th style="width:36px"><span class="check"><input type="checkbox" data-check-all aria-label="Select all rows"></span></th>` : ''}
        ${config.columns.map((c) => `<th class="${c.sortable !== false ? 'sortable' : ''} ${c.align === 'right' ? 'cell-num' : ''}" ${c.width ? `style="width:${c.width}"` : ''} ${c.sortable !== false ? `data-sort="${c.key}"` : ''}>
          ${UI.esc(c.label)}${c.sortable !== false ? UI.icon(state.sortKey === c.key ? (state.sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrows-down-up') : ''}
        </th>`).join('')}
        ${config.rowMenu ? '<th class="cell-actions" style="width:44px"><span class="sr-only">Actions</span></th>' : ''}
      </tr>`;
      thead.querySelectorAll('[data-sort]').forEach((th) => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          else { state.sortKey = key; state.sortDir = 'desc'; }
          render();
        });
      });
      const checkAll = thead.querySelector('[data-check-all]');
      if (checkAll) {
        checkAll.addEventListener('change', () => {
          const rows = paginated();
          rows.forEach((r) => config.selectable === true ? (checkAll.checked ? state.selected.add(r.id) : state.selected.delete(r.id)) : null);
          render();
          if (config.onSelect) config.onSelect(Array.from(state.selected), findRow);
        });
      }
    }

    function paginated() {
      const rows = filtered();
      const maxPage = Math.max(1, Math.ceil(rows.length / state.pageSize));
      if (state.page > maxPage) state.page = maxPage;
      return rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    }
    function findRow(id) { return state.rows.find((r) => r.id === id); }

    function renderBody() {
      const rows = paginated();
      const total = filtered().length;
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="${config.columns.length + (config.selectable ? 1 : 0) + (config.rowMenu ? 1 : 0)}">
          ${config.empty || UI.empty({ icon: config.emptyIcon || 'ph-magnifying-glass', title: config.emptyTitle || 'No records found', body: config.emptyBody || 'Try a different search term or clear your filters.' })}
        </td></tr>`;
      } else {
        tbody.innerHTML = rows.map((row) => `
          <tr data-id="${UI.esc(row.id)}" ${config.onRow ? 'style="cursor:pointer"' : ''} class="${state.selected.has(row.id) ? 'is-selected' : ''}">
            ${config.selectable ? `<td><span class="check"><input type="checkbox" data-check="${UI.esc(row.id)}" ${state.selected.has(row.id) ? 'checked' : ''} aria-label="Select row"></span></td>` : ''}
            ${config.columns.map((c) => `<td class="${c.align === 'right' ? 'cell-num' : ''} ${c.className || ''}" ${c.align === 'right' ? 'style="text-align:right"' : ''}>${c.render ? c.render(row) : UI.esc(row[c.key])}</td>`).join('')}
            ${config.rowMenu ? `<td class="cell-actions"><button class="icon-btn sm" data-row-menu aria-label="Row actions">${UI.icon('dots-three-vertical')}</button></td>` : ''}
          </tr>`).join('');
      }
      tbody.querySelectorAll('[data-row-menu]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tr = btn.closest('tr');
          const row = findRow(tr.dataset.id);
          UI.menu(btn, config.rowMenu(row));
        });
      });
      tbody.querySelectorAll('[data-check]').forEach((cb) => {
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', () => {
          if (cb.checked) state.selected.add(cb.dataset.check);
          else state.selected.delete(cb.dataset.check);
          cb.closest('tr').classList.toggle('is-selected', cb.checked);
          if (config.onSelect) config.onSelect(Array.from(state.selected), findRow);
        });
      });
      if (config.onRow) {
        tbody.querySelectorAll('tr[data-id]').forEach((tr) => {
          tr.addEventListener('click', (e) => {
            if (e.target.closest('button, a, input, select, label')) return;
            const row = findRow(tr.dataset.id);
            if (row) config.onRow(row);
          });
        });
      }
      const start = total ? (state.page - 1) * state.pageSize + 1 : 0;
      const end = Math.min(total, state.page * state.pageSize);
      pager.innerHTML = `
        <span class="page-info tiny muted">Showing <strong>${start}–${end}</strong> of <strong>${UI.num(total)}</strong></span>
        <div class="pager">
          <button data-pg="prev" ${state.page === 1 ? 'disabled' : ''} aria-label="Previous page">${UI.icon('caret-left')}</button>
          ${pageButtons(state.page, Math.ceil(total / state.pageSize))}
          <button data-pg="next" ${end >= total ? 'disabled' : ''} aria-label="Next page">${UI.icon('caret-right')}</button>
        </div>`;
      pager.querySelectorAll('[data-pg]').forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.pg === 'prev') state.page = Math.max(1, state.page - 1);
        else if (b.dataset.pg === 'next') state.page = Math.min(Math.ceil(total / state.pageSize), state.page + 1);
        else state.page = Number(b.dataset.pg);
        render();
      }));
    }

    function pageButtons(current, max) {
      if (max <= 1) return '';
      const pages = [];
      const push = (p) => pages.push(`<button data-pg="${p}" class="${p === current ? 'is-active' : ''}" aria-label="Page ${p}" ${p === current ? 'aria-current="page"' : ''}>${p}</button>`);
      if (max <= 6) { for (let i = 1; i <= max; i++) push(i); }
      else {
        push(1);
        if (current > 3) pages.push('<span class="ellipsis">…</span>');
        for (let i = Math.max(2, current - 1); i <= Math.min(max - 1, current + 1); i++) push(i);
        if (current < max - 2) pages.push('<span class="ellipsis">…</span>');
        push(max);
      }
      return pages.join('');
    }

    function render() { renderHead(); renderBody(); }

    render();
    return {
      refresh(rows) {
        if (rows) state.rows = rows;
        if (config.keepPage !== true) state.page = 1;
        render();
      },
      getRows: () => state.rows,
      getFiltered: filtered,
      getSelected: () => Array.from(state.selected),
      clearSelection() { state.selected.clear(); render(); },
      setQuery(q) { state.query = q; if (searchInput) searchInput.value = q; render(); },
      state
    };
  };

  /* -------------------------------------------------------------- helpers */
  UI.optionList = (items, selected, opts = {}) => items.map((i) => {
    const val = typeof i === 'string' ? i : i.value;
    const label = typeof i === 'string' ? i : i.label;
    return `<option value="${UI.esc(val)}" ${String(selected) === String(val) ? 'selected' : ''}>${UI.esc(label)}</option>`;
  }).join('');

  UI.districtOptions = (selected, includeAll) =>
    (includeAll ? '<option value="">All districts</option>' : '') +
    ZR.DISTRICTS.map((d) => `<option value="${UI.esc(d.name)}" ${selected === d.name ? 'selected' : ''}>${UI.esc(d.name)} — ${UI.esc(d.division)}</option>`).join('');

  UI.setBusy = function (btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="border-top-color:currentColor;border-color:rgba(255,255,255,.35);border-top-color:#fff"></span> ${UI.esc(label || 'Working…')}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  };

  UI.iconForStatus = (key) => ZR.statusMeta(key).icon;
})(window.ZR);
