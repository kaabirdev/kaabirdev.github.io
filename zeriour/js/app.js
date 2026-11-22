/* ==========================================================================
   Zeriour — application shell
   Theme control, role workspaces, hash router, notification centre and ⌘K.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';

  const UI = ZR.ui;
  const App = {};
  ZR.app = App;

  /* ------------------------------------------------------------------ theme */
  const THEME_KEY = 'zeriour:theme';
  App.theme = function () { return document.documentElement.classList.contains('dark') ? 'dark' : 'light'; };
  App.setTheme = function (theme, persist = true) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ } }
    document.querySelectorAll('[data-theme-icon]').forEach((i) => {
      i.className = `ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'} ${i.dataset.extra || ''}`;
    });
    window.dispatchEvent(new CustomEvent('zr:theme', { detail: { theme } }));
  };
  App.toggleTheme = function () {
    App.setTheme(App.theme() === 'dark' ? 'light' : 'dark');
    UI.toast(App.theme() === 'dark' ? 'Dark theme on' : 'Light theme on', '', 'info', { duration: 1800 });
  };
  App.initTheme = function () {
    let theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { /* ignore */ }
    App.setTheme(theme, false);
    // reflect on any static toggles
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', App.toggleTheme);
    });
  };

  /* -------------------------------------------------------------- page head */
  App.pageHead = function ({ crumbs = [], title, sub = '', actions = '', badge = '' }) {
    return `
      <div class="page-head">
        <div>
          ${crumbs.length ? `<nav class="breadcrumb" aria-label="Breadcrumb">${crumbs.map((c, i) => `${i ? UI.icon('caret-right') : ''}${c.href ? `<a href="${c.href}">${UI.esc(c.label)}</a>` : `<span>${UI.esc(c.label)}</span>`}`).join('')}</nav>` : ''}
          <h1>${UI.esc(title)} ${badge}</h1>
          ${sub ? `<p class="sub">${sub}</p>` : ''}
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ''}
      </div>`;
  };

  /* ------------------------------------------------------------------ shell */
  App.mount = function ({ role, user, nav, routes, defaultRoute, roleLabel, roleSub, searchPlaceholder }) {
    const meta = ZR.auth.roleMeta(role);
    const shell = UI.el('div', { class: `app-shell role-${role} ${role === 'rider' ? 'rider-shell' : ''}` });
    const audience = role === 'merchant' ? (user.merchantId || user.id) : role === 'admin' ? 'admin' : role === 'rider' ? (user.riderId || user.id) : 'branch';
    App.audience = audience;
    App.role = role;
    App.user = user;
    App.routes = routes;
    App.nav = nav;
    App.defaultRoute = defaultRoute || Object.keys(routes)[0];

    shell.innerHTML = `
      <aside class="app-sidebar" id="appSidebar" aria-label="Workspace navigation">
        <div class="sb-head">
          <a class="brand" href="index.html" aria-label="Zeriour home">
            <span class="brand-mark">${brandMark()}</span>
            <span><span class="brand-name">zeriour<span>.</span></span><span class="brand-tag">${UI.esc(role === 'admin' ? 'Control Center' : role === 'branch' ? 'Branch Ops' : role === 'rider' ? 'Rider Console' : 'Merchant Suite')}</span></span>
          </a>
          <button class="icon-btn sm sidebar-close" data-sidebar-close aria-label="Close navigation">${UI.icon('x')}</button>
        </div>
        <div class="sb-role">
          <span class="ico">${UI.icon(meta.icon.replace('ph-', ''))}</span>
          <div class="grow">
            <div class="t">${UI.esc(roleLabel || meta.label)}</div>
            <div class="s">${UI.esc(roleSub || 'Demo workspace')}</div>
          </div>
        </div>
        <nav class="sb-nav" id="sidebarNav"></nav>
        <div class="sb-foot">
          <div class="sb-help">
            <div class="t">${UI.icon('flask')} Demo environment</div>
            <div class="d">All data is simulated and stored in this browser only.</div>
            <button class="btn btn-sm btn-ghost" data-reset-demo style="width:100%;justify-content:flex-start;padding-inline:2px">${UI.icon('arrow-counter-clockwise')} Reset demo data</button>
          </div>
        </div>
      </aside>
      <div class="sidebar-scrim" data-sidebar-close></div>
      <div class="app-main">
        <header class="app-topbar">
          <button class="icon-btn mobile-menu-btn" data-menu-toggle aria-label="Open navigation" style="display:none">${UI.icon('list')}</button>
          <div class="workspace-badge"><span class="dot"></span> ${UI.esc(role === 'admin' ? 'Live network' : role === 'branch' ? 'Branch online' : role === 'rider' ? 'On duty' : 'Store online')}</div>
          <div class="topbar-search">
            ${UI.icon('magnifying-glass', 'lead-ico')}
            <input type="search" id="globalSearch" placeholder="${UI.esc(searchPlaceholder || 'Search parcels, people, pages…')}" aria-label="Global search" autocomplete="off" readonly>
            <span class="shortcut"><span class="kbd">Ctrl</span><span class="kbd">K</span></span>
          </div>
          <div class="topbar-right">
            <button class="icon-btn mobile-search-btn" data-search-open aria-label="Search" style="display:none">${UI.icon('magnifying-glass')}</button>
            <button class="icon-btn" data-theme-toggle aria-label="Toggle dark mode" title="Toggle theme"><i data-theme-icon class="ph ph-moon"></i></button>
            <div class="dropdown">
              <button class="icon-btn" id="notifBtn" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">
                ${UI.icon('bell')}<span class="notif-dot" hidden></span>
              </button>
            </div>
            <div class="dropdown">
              <button class="user-menu-btn row gap-2" id="profileBtn" aria-haspopup="true" aria-expanded="false" style="padding:4px 6px 4px 4px;border-radius:10px">
                ${UI.avatar(user.name, { size: 'sm', tone: role === 'admin' ? 'tone-dark' : '' })}
                <span class="hide-mobile" style="text-align:left;line-height:1.2">
                  <span style="display:block;font-size:var(--text-xs);font-weight:650">${UI.esc(user.name.split(' ').slice(0, 2).join(' '))}</span>
                  <span style="display:block;font-size:9.5px;color:var(--muted)">${UI.esc(meta.label)}</span>
                </span>
                ${UI.icon('caret-down', 'hide-mobile')}
              </button>
            </div>
          </div>
        </header>
        <main class="app-content" id="appView" tabindex="-1"></main>
      </div>
      <nav class="rider-tabbar" id="riderTabbar" aria-label="Quick navigation"></nav>
    `;
    document.body.innerHTML = '';
    document.body.appendChild(shell);
    App.shell = shell;
    App.view = UI.qs('#appView');

    /* sidebar open/close */
    const sidebar = UI.qs('#appSidebar');
    UI.qsa('[data-menu-toggle]').forEach((b) => b.addEventListener('click', () => {
      sidebar.classList.add('open');
      UI.qs('.sidebar-scrim').classList.add('show');
    }));
    UI.qsa('[data-sidebar-close]').forEach((b) => b.addEventListener('click', () => {
      sidebar.classList.remove('open');
      UI.qs('.sidebar-scrim').classList.remove('show');
    }));

    UI.qsa('[data-reset-demo]').forEach((btn) => btn.addEventListener('click', App.resetDemo));
    UI.qs('[data-theme-toggle]').addEventListener('click', App.toggleTheme);
    UI.qs('#globalSearch').addEventListener('click', () => App.palette());
    UI.qs('#globalSearch').addEventListener('focus', (e) => { e.target.blur(); App.palette(); });
    const mobileSearch = UI.qs('[data-search-open]');
    if (mobileSearch) mobileSearch.addEventListener('click', () => App.palette());

    /* notifications */
    const notifBtn = UI.qs('#notifBtn');
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      App.notifPanel(notifBtn);
    });
    App.renderNotifDot();

    /* profile */
    UI.qs('#profileBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      App.profileMenu(e.currentTarget);
    });

    App.renderNav();
    App.riderTabbar();

    window.addEventListener('hashchange', App.route);
    App.route();

    // global shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        App.palette();
      }
    });

    // refresh notifications dot when store changes
    ZR.store.subscribe((type) => {
      if (type && type.startsWith('notification')) App.renderNotifDot();
    });
  };

  function brandMark() {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6.5h11.5L7.5 17.5H19" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15.5 6.5 19 6.5 19 10" stroke="#22d3ee" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  App.brandMark = brandMark;

  App.renderNav = function () {
    const nav = App.nav || [];
    const host = UI.qs('#sidebarNav');
    if (!host) return;
    host.innerHTML = nav.map((group) => `
      ${group.label ? `<div class="sb-group">${UI.esc(group.label)}</div>` : ''}
      ${group.items.map((item) => {
        const count = typeof item.count === 'function' ? item.count() : item.count;
        return `<a class="sb-link" href="#/${item.route}" data-route="${item.route}">
          ${UI.icon(item.icon)}
          <span class="grow truncate">${UI.esc(item.label)}</span>
          ${count ? `<span class="sb-count">${count > 99 ? '99+' : count}</span>` : ''}
          ${item.soon ? '<span class="badge badge-neutral" style="height:17px;font-size:9px">Soon</span>' : ''}
        </a>`;
      }).join('')}
    `).join('');
    UI.qsa('[data-route]', host).forEach((a) => a.addEventListener('click', () => {
      UI.qs('#appSidebar').classList.remove('open');
      UI.qs('.sidebar-scrim').classList.remove('show');
    }));
    App.markActive();
  };

  App.markActive = function () {
    const current = App.currentRoute;
    UI.qsa('#sidebarNav [data-route]').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.route === current);
      if (a.dataset.route === current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    UI.qsa('#riderTabbar [data-route]').forEach((a) => {
      a.classList.toggle('is-active', a.dataset.route === current);
    });
  };

  App.riderTabbar = function () {
    const host = UI.qs('#riderTabbar');
    if (!host || App.role !== 'rider') return;
    const items = [
      { route: 'tasks', icon: 'squares-four', label: 'Tasks' },
      { route: 'route', icon: 'path', label: 'Route' },
      { route: 'history', icon: 'clock-counter-clockwise', label: 'History' },
      { route: 'earnings', icon: 'wallet', label: 'Earnings' },
      { route: 'profile', icon: 'user', label: 'Profile' }
    ];
    host.innerHTML = items.map((i) => `<a class="rt" href="#/${i.route}" data-route="${i.route}">${UI.icon(i.icon)}<span>${i.label}</span></a>`).join('');
    App.markActive();
  };

  /* ----------------------------------------------------------------- router */
  App.route = function () {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const [pathPart, queryPart] = raw.split('?');
    const routeId = pathPart || App.defaultRoute || 'overview';
    const route = App.routes[routeId] || App.routes[App.defaultRoute || 'overview'] || App.routes[Object.keys(App.routes)[0]];
    if (!route) return;
    if (typeof App._cleanup === 'function') { try { App._cleanup(); } catch (e) { /* ignore */ } App._cleanup = null; }
    UI.closeMenus();
    App.currentRoute = routeId;
    App.markActive();
    App.view.innerHTML = '';
    App.view.scrollTop = 0;
    const ctx = {
      user: App.user, role: App.role, route: routeId,
      query: new URLSearchParams(queryPart || ''),
      refresh: App.refresh, go: App.go, head: App.pageHead
    };
    const cleanup = route.render(App.view, ctx);
    UI.enhanceA11y(App.view);
    if (typeof cleanup === 'function') App._cleanup = cleanup;
    document.title = `${route.title || 'Workspace'} · Zeriour`;
    if (window.innerWidth <= 1023) window.scrollTo({ top: 0 });
    // let the current route re-render itself after mutations
    App.renderNav();
  };

  App.go = function (route) {
    if (location.hash === '#/' + route) App.route();
    else location.hash = '#/' + route;
  };

  App.refresh = function () {
    const view = App.view;
    if (!view) return;
    const y = window.scrollY;
    App.route();
    window.scrollTo({ top: y });
  };

  /* ---------------------------------------------------------- notifications */
  App.renderNotifDot = function () {
    const btn = UI.qs('#notifBtn');
    if (!btn) return;
    const count = ZR.store.unreadCount(App.audience);
    let dot = btn.querySelector('.notif-dot');
    if (!dot) { dot = UI.el('span', { class: 'notif-dot' }); btn.appendChild(dot); }
    dot.hidden = count === 0;
    dot.textContent = count > 9 ? '9+' : count;
    dot.style.cssText = `position:absolute;top:2px;right:2px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:var(--danger);color:#fff;font-size:9px;font-weight:700;display:grid;place-items:center;border:2px solid var(--surface);line-height:1`;
    dot.hidden = count === 0;
    btn.style.position = 'relative';
    btn.setAttribute('aria-label', `Notifications${count ? `, ${count} unread` : ''}`);
  };

  App.notifPanel = function (anchor) {
    const items = ZR.store.notificationsFor(App.audience).slice(0, 8);
    const unread = items.filter((n) => !n.read).length;
    const panel = UI.el('div', { class: 'notif-panel card', role: 'dialog', 'aria-label': 'Notifications' });
    panel.innerHTML = `
      <div class="notif-head">
        <div class="row gap-2">
          <strong style="font-size:var(--text-sm)">Notifications</strong>
          ${unread ? `<span class="badge badge-info">${unread} new</span>` : ''}
        </div>
        <button class="link tiny" data-read-all ${unread ? '' : 'disabled style="opacity:.4;pointer-events:none"'}>Mark all read</button>
      </div>
      <div class="notif-list">
        ${items.length ? items.map((n) => `
          <button class="notif-item ${n.read ? '' : 'unread'}" data-notif="${n.id}" data-link="${UI.esc(n.link || '')}" style="width:100%;text-align:left">
            <span class="ni-ico badge-${n.tone || 'info'}">${UI.icon((n.icon || 'ph-bell').replace('ph-', ''))}</span>
            <span class="grow" style="min-width:0">
              <span class="nt" style="display:block">${UI.esc(n.title)}</span>
              <span class="nd" style="display:block">${UI.esc(n.body)}</span>
              <span class="nw" style="display:block">${UI.relative(n.at)}</span>
            </span>
            ${n.read ? '' : '<span style="width:6px;height:6px;border-radius:50%;background:var(--primary);flex:0 0 auto;margin-top:6px"></span>'}
          </button>`).join('') : UI.empty({ icon: 'ph-bell-slash', title: 'You’re all caught up', body: 'New operational updates will appear here.' })}
      </div>
      <div style="padding:8px 12px;border-top:1px solid var(--line);text-align:center">
        <a class="link tiny" href="#/notifications" data-notif-all>View all notifications</a>
      </div>`;
    // position under the bell (fixed so it never clips)
    const rect = anchor.getBoundingClientRect();
    panel.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${Math.max(10, window.innerWidth - rect.right - 2)}px;width:min(380px,calc(100vw - 20px));z-index:200`;
    document.body.appendChild(panel);
    const close = () => { panel.remove(); document.removeEventListener('click', onDoc, true); window.removeEventListener('resize', close); };
    const onDoc = (e) => { if (!panel.contains(e.target) && !anchor.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('click', onDoc, true), 0);
    window.addEventListener('resize', close);
    panel.querySelector('[data-read-all]').addEventListener('click', () => {
      ZR.store.markAllRead(App.audience); close(); App.renderNotifDot();
    });
    panel.querySelectorAll('[data-notif]').forEach((b) => b.addEventListener('click', () => {
      ZR.store.markRead(b.dataset.notif);
      close(); App.renderNotifDot();
      if (b.dataset.link) App.go(b.dataset.link.replace(/^#\//, ''));
      else App.refresh();
    }));
    panel.querySelector('[data-notif-all]').addEventListener('click', () => { close(); App.go('notifications'); });
  };

  App.profileMenu = function (anchor) {
    const user = App.user;
    UI.menu(anchor, [
      { label: 'Signed in as', heading: true },
      { label: `${user.name}`, icon: 'user-circle', meta: ZR.auth.roleMeta(user.role).label },
      { sep: true },
      { label: 'Account settings', icon: 'gear', onClick: () => App.go(App.role === 'admin' ? 'settings' : 'settings') },
      { label: 'Notification preferences', icon: 'bell', onClick: () => App.go('notifications') },
      { label: 'Switch demo role', icon: 'arrows-left-right', onClick: () => App.roleSwitcher() },
      { sep: true },
      { label: 'Public website', icon: 'globe-hemisphere-west', onClick: () => { location.href = 'index.html'; } },
      { label: 'Reset demo data', icon: 'arrow-counter-clockwise', onClick: App.resetDemo },
      { label: 'Sign out', icon: 'sign-out', danger: true, onClick: () => { ZR.auth.logout(); location.href = 'login.html'; } }
    ]);
  };

  App.roleSwitcher = function () {
    const roles = Object.entries(ZR.auth.ROLES);
    const inst = UI.modal({
      title: 'Switch demo workspace',
      subtitle: 'Jump between the four simulated roles. Your data is shared and persists.',
      body: `<div class="grid g-2" style="gap:10px">${roles.map(([key, r]) => `
        <button class="role-btn ${key === App.role ? 'is-active' : ''}" data-switch="${key}">
          <span class="ico">${UI.icon(r.icon.replace('ph-', ''))}</span>
          <span><span class="t">${UI.esc(r.label)}</span><br><span class="s">${UI.esc(r.blurb)}</span></span>
        </button>`).join('')}</div>
        <p class="tiny muted mt-4">${UI.icon('flask')} Simulated authentication — each role sees the same shared dataset.</p>`,
      footer: '<button class="btn" data-close>Cancel</button>'
    });
    inst.el.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => {
      const res = ZR.auth.loginAs(b.dataset.switch);
      if (res.ok) location.href = res.redirect;
    }));
  };

  App.resetDemo = async function () {
    const ok = await UI.confirm({
      title: 'Reset demo data?',
      body: 'Every parcel, payment, ticket and workflow change you have made in this browser will be replaced with the original seeded dataset. This cannot be undone.',
      confirmText: 'Reset everything',
      danger: true
    });
    if (!ok) return;
    ZR.store.reset();
    UI.toast('Demo data restored', 'The original dataset has been reseeded.', 'success', { duration: 1800 });
    setTimeout(() => location.reload(), 700);
  };

  /* -------------------------------------------------------------- palette */
  App.palette = function () {
    if (UI.qs('.cmd-root')) return;
    const allRoutes = (App.nav || []).flatMap((g) => g.items)
      .filter((i) => !i.soon)
      .map((i) => ({ label: i.label, icon: i.icon, route: i.route, meta: 'Go to' }));
    const root = UI.el('div', { class: 'cmd-root open' }, `
      <div class="cmd-backdrop"></div>
      <div class="cmd" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cmd-input">
          ${UI.icon('magnifying-glass')}
          <input type="text" placeholder="Search parcels, merchants, riders or jump to a page…" aria-label="Search" autocomplete="off">
          <span class="kbd">Esc</span>
        </div>
        <div class="cmd-list"></div>
        <div class="cmd-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> navigate</span><span><span class="kbd">↵</span> open</span><span><span class="kbd">Esc</span> close</span></div>
      </div>`);
    document.body.appendChild(root);
    const input = root.querySelector('input');
    const list = root.querySelector('.cmd-list');
    let items = [];
    let selected = 0;

    const close = () => { root.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(items.length - 1, selected + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(0, selected - 1); paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[selected]) items[selected].run(); }
    };

    function build(q) {
      const res = q ? ZR.store.search(q) : { parcels: [], merchants: [], riders: [], branches: [] };
      const out = [];
      const routeMatches = allRoutes.filter((r) => r.label.toLowerCase().includes(q.toLowerCase()));
      if (routeMatches.length) {
        out.push({ heading: q ? 'Pages' : 'Quick navigation' });
        routeMatches.slice(0, 6).forEach((r) => out.push({
          label: r.label, icon: r.icon, meta: 'Page', run: () => { close(); App.go(r.route); }
        }));
      }
      if (res.parcels.length) {
        out.push({ heading: 'Parcels' });
        res.parcels.forEach((p) => out.push({
          label: p.tracking, sub: `${p.customer.name} · ${p.customer.district}`, icon: 'package',
          meta: ZR.statusMeta(p.statusKey).short,
          run: () => { close(); App.openParcel(p.id); }
        }));
      }
      if (App.role === 'admin' && res.merchants.length) {
        out.push({ heading: 'Merchants' });
        res.merchants.forEach((m) => out.push({
          label: m.name, sub: `${m.owner} · ${m.district}`, icon: 'storefront', meta: 'Merchant',
          run: () => { close(); App.go('merchants'); }
        }));
      }
      if ((App.role === 'admin' || App.role === 'branch') && res.riders.length) {
        out.push({ heading: 'Riders' });
        res.riders.forEach((r) => out.push({
          label: r.name, sub: r.zone, icon: 'moped', meta: 'Rider',
          run: () => { close(); App.go(App.role === 'admin' ? 'riders' : 'riders'); }
        }));
      }
      if (!q) {
        out.push({ heading: 'Actions' });
        out.push({ label: 'Toggle dark mode', icon: 'moon', meta: 'Theme', run: () => { close(); App.toggleTheme(); } });
        out.push({ label: 'Switch demo role', icon: 'arrows-left-right', meta: 'Demo', run: () => { close(); App.roleSwitcher(); } });
        out.push({ label: 'Reset demo data', icon: 'arrow-counter-clockwise', meta: 'Demo', run: () => { close(); App.resetDemo(); } });
      }
      return out;
    }

    function paint() {
      let idx = 0;
      list.innerHTML = items.map((it) => {
        if (it.heading) return `<div class="cmd-group">${UI.esc(it.heading)}</div>`;
        const i = idx++;
        it._i = i;
        return `<button class="cmd-item ${i === selected ? 'sel' : ''}" data-idx="${i}">
          ${UI.icon(it.icon || 'arrow-right')}
          <span style="min-width:0"><span style="display:block" class="truncate">${UI.esc(it.label)}</span>
          ${it.sub ? `<span class="tiny muted truncate" style="display:block">${UI.esc(it.sub)}</span>` : ''}</span>
          <span class="r">${UI.esc(it.meta || '')}</span>
        </button>`;
      }).join('') || `<div class="cmd-empty">${UI.icon('magnifying-glass')} No matches for “${UI.esc(input.value)}”</div>`;
      list.querySelectorAll('[data-idx]').forEach((b) => {
        b.addEventListener('click', () => { const item = items.find((x) => x._i === +b.dataset.idx); if (item) item.run(); });
        b.addEventListener('mouseenter', () => { selected = +b.dataset.idx; paint(); });
      });
    }

    function update() {
      items = build(input.value.trim());
      selected = 0;
      paint();
    }

    input.addEventListener('input', UI.debounce(update, 100));
    root.querySelector('.cmd-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    update();
    setTimeout(() => input.focus(), 30);
  };

  App._parcelOpeners = [];
  App.registerParcelOpener = (fn) => { App._parcelOpeners.push(fn); };
  App.openParcel = function (id) {
    if (App._parcelOpeners.length) {
      const handled = App._parcelOpeners.some((fn) => fn(id));
      if (handled) return;
    }
    const p = ZR.store.parcel(id);
    if (p) location.href = 'tracking.html?id=' + encodeURIComponent(p.tracking);
  };

  /* boot public theme on every page */
  document.addEventListener('DOMContentLoaded', () => {
    App.initTheme();
    // header shadow on scroll
    const header = UI.qs('.pub-header');
    if (header) {
      const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 6);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  });
})(window.ZR);
