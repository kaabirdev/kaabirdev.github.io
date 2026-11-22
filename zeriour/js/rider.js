/* ==========================================================================
   Zeriour — Rider console
   Mobile-first delivery tasks, route view, pickups, history and earnings.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';
  const UI = ZR.ui;
  const S = ZR.store;
  const App = ZR.app;

  S.init();
  const user = ZR.auth.require('rider');
  if (!user) return;
  const rider = S.rider(user.riderId) || S.state.riders[0];
  const riderId = rider.id;
  const branch = S.branch(rider.branchId) || S.state.branches[0];
  const actor = rider.name;
  const money = UI.money;

  function stats() { return S.statsRider(riderId); }
  function tasks() {
    return S.state.parcels.filter((p) => p.riderId === riderId && [6, 7, 9].includes(p.status))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  /* ------------------------------------------------------------------ actions */
  function deliverModal(p, ctx) {
    UI.modal({
      title: 'Confirm delivery',
      subtitle: `${p.tracking} · ${p.customer.name}`,
      body: `
        <div class="card card-pad mb-4" style="background:var(--surface-2)">
          <div class="between"><span class="tiny muted">COD to collect</span><span class="strong num" style="font-size:var(--text-xl)">${money(p.cod)}</span></div>
          <div class="between mt-1"><span class="tiny muted">Delivery charge (merchant)</span><span class="tiny">${money(p.deliveryCharge)}</span></div>
        </div>
        ${p.cod > 0 ? `<label class="checkbox mb-3"><input type="checkbox" name="cash" checked><span>Cash collected from customer</span></label>
        <div class="field"><label class="label">Amount collected</label><div class="input-group prefix"><span class="addon">৳</span><input class="input" name="amount" type="number" value="${p.cod}" min="0"></div><span class="hint">Adjust only if the customer paid a different amount.</span></div>` : '<div class="alert success mb-3">' + UI.icon('check-circle') + '<div>Prepaid parcel — no cash collection required.</div></div>'}
        <div class="field mt-3"><label class="label">Delivery note <span class="opt">(optional)</span></label><input class="input" name="note" placeholder="e.g. Handed to customer at reception"></div>
        <p class="tiny faint mt-4">${UI.icon('flask')} Completing delivery credits the merchant wallet and updates public tracking immediately.</p>`,
      footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-success" data-confirm>${UI.icon('check-circle')} Mark delivered</button>`,
      onMount(root, close) {
        root.querySelector('[data-confirm]').addEventListener('click', () => {
          const cash = root.querySelector('[name="cash"]');
          const amount = root.querySelector('[name="amount"]');
          if (p.cod > 0 && cash && !cash.checked) { UI.toast('Confirm cash', 'Tick the cash collected box or record a failed delivery.', 'warn'); return; }
          const collected = p.cod > 0 ? +((amount && amount.value) || p.cod) : 0;
          S.riderAction(p.id, 'delivered', { actor, codCollected: collected, note: (root.querySelector('[name="note"]') || {}).value });
          UI.toast('Delivery completed', p.cod ? `${money(collected)} COD collected` : 'Prepaid parcel delivered', 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  function failModal(p, ctx) {
    const reasons = ['Customer unreachable', 'Customer refused the parcel', 'Cash not ready', 'Address not found', 'Shop / office closed', 'Customer asked to reschedule'];
    UI.modal({
      title: 'Record failed delivery',
      subtitle: `${p.tracking} · attempt ${(p.attempts || 0) + 1}`,
      body: `<div class="field"><label class="label">Reason</label><select class="select" name="reason">${reasons.map((r) => `<option>${r}</option>`).join('')}</select></div>
        <div class="field mt-3"><label class="label">Note for the merchant <span class="opt">(optional)</span></label><textarea class="textarea" name="note" rows="3" placeholder="What happened at the address?"></textarea></div>
        <div class="alert warn mt-4">${UI.icon('warning')}<div>The merchant is notified immediately. The parcel will appear in the return queue for a retry decision.</div></div>`,
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-danger" data-confirm>Record failure</button>',
      onMount(root, close) {
        root.querySelector('[data-confirm]').addEventListener('click', () => {
          const reason = root.querySelector('[name="reason"]').value;
          const note = root.querySelector('[name="note"]').value.trim();
          S.riderAction(p.id, 'failed', { actor, reason: note ? `${reason} — ${note}` : reason });
          UI.toast('Failure recorded', reason, 'warn');
          close(); ctx.refresh();
        });
      }
    });
  }

  function rescheduleModal(p, ctx) {
    UI.modal({
      title: 'Reschedule delivery',
      subtitle: p.tracking,
      body: `<p class="tiny muted mb-4">Choose when to attempt delivery again. The parcel moves back to “Assigned to rider”.</p>
        <div class="stack gap-2">
          ${['Today evening', 'Tomorrow morning', 'Tomorrow afternoon', 'Day after tomorrow'].map((d, i) => `<label class="radio"><input type="radio" name="when" value="${d}" ${i === 1 ? 'checked' : ''}><span>${d}</span></label>`).join('')}
        </div>
        <div class="field mt-4"><label class="label">Note</label><input class="input" name="note" placeholder="e.g. Customer will be home after 6 PM"></div>`,
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-confirm>Reschedule</button>',
      onMount(root, close) {
        root.querySelector('[data-confirm]').addEventListener('click', () => {
          const when = root.querySelector('[name="when"]:checked').value;
          const note = root.querySelector('[name="note"]').value.trim();
          S.riderAction(p.id, 'reschedule', { actor, date: when, note });
          UI.toast('Delivery rescheduled', when, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  function taskCard(p, i, opts = {}) {
    const meta = ZR.statusMeta(p.statusKey);
    const started = p.status === 7;
    const failed = p.status === 9;
    return `<article class="task-card" data-task="${p.id}">
      <div class="task-top">
        <span class="task-seq"><span class="n">${i + 1}</span> ${UI.statusBadge(p.statusKey, { short: true })}</span>
        <span class="tiny faint mono">${p.tracking}</span>
      </div>
      <div class="task-body">
        <div class="task-person">
          <span class="avatar">${UI.initials(p.customer.name)}</span>
          <div class="grow" style="min-width:0">
            <div class="nm truncate">${UI.esc(p.customer.name)}</div>
            <div class="tiny muted"><span class="ph ph-phone"></span> ${UI.esc(p.customer.phone)}</div>
          </div>
          <a class="icon-btn outline" href="tel:${UI.esc(p.customer.phone)}" aria-label="Call ${UI.esc(p.customer.name)}">${UI.icon('phone')}</a>
        </div>
        <div class="task-addr"><span class="ph ph-map-pin"></span><div>${UI.esc(p.customer.address)}, ${UI.esc(p.customer.upazila)}, ${UI.esc(p.customer.district)}</div></div>
        ${p.notes ? `<div class="task-addr"><span class="ph ph-note"></span><div>${UI.esc(p.notes)}</div></div>` : ''}
        <div class="task-meta">
          <span class="badge badge-neutral">${UI.icon('package')} ${p.weight} kg</span>
          <span class="badge ${p.cod ? 'badge-success' : 'badge-neutral'}">${UI.icon('wallet')} ${p.cod ? money(p.cod) + ' COD' : 'Prepaid'}</span>
          <span class="badge badge-neutral">${UI.icon('buildings')} ${UI.esc((S.branch(p.destBranchId) || {}).code || branch.code)}</span>
        </div>
        ${opts.history ? `
          <div class="between tiny muted"><span>Delivered ${UI.dateTime(p.deliveredAt || p.updatedAt)}</span><span>${money(p.codCollected || p.cod)}</span></div>
        ` : failed ? `
        <div class="alert danger tiny" style="padding:8px 10px">${UI.icon('warning')}<div>${UI.esc(p.returnReason || 'Delivery attempt failed')}</div></div>
        <div class="row gap-2 wrap">
          <button class="btn btn-primary btn-sm grow" data-retry="${p.id}">${UI.icon('arrows-clockwise')} Retry delivery</button>
          <button class="btn btn-sm" data-reschedule="${p.id}" aria-label="Choose a new date">${UI.icon('calendar')}</button>
        </div>
        ` : `
        <div class="row gap-2 wrap">
          ${!started ? `<button class="btn btn-primary btn-sm grow" data-start="${p.id}">${UI.icon('moped')} Start delivery</button>` : ''}
          <button class="btn btn-success btn-sm grow" data-deliver="${p.id}">${UI.icon('check-circle')} Delivered</button>
          <button class="btn btn-sm" data-fail="${p.id}" aria-label="Record failed delivery">${UI.icon('x')}</button>
          <button class="btn btn-sm" data-reschedule="${p.id}" aria-label="Reschedule">${UI.icon('calendar')}</button>
        </div>`}
      </div>
    </article>`;
  }

  /* ------------------------------------------------------------------- tasks */
  function renderTasks(el, ctx) {
    const s = stats();
    const list = tasks();
    const out = list.filter((p) => p.status === 7);
    const failed = list.filter((p) => p.status === 9);
    let filter = 'all';

    el.innerHTML = `
      <div class="rider-hero mb-4">
        <div class="between" style="position:relative;z-index:1">
          <div><div class="rider-greet">${UI.icon('sun')} Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</div><h2>${UI.esc(rider.name.split(' ')[0])}</h2></div>
          <button class="icon-btn" style="background:rgba(255,255,255,.1);color:#fff" data-notif aria-label="Notifications">${UI.icon('bell')}</button>
        </div>
        <div class="rider-stats">
          <div class="rider-stat"><div class="v">${s.taskCount}</div><div class="l">Open tasks</div></div>
          <div class="rider-stat"><div class="v">${s.deliveredToday}</div><div class="l">Delivered today</div></div>
          <div class="rider-stat"><div class="v">${money(s.codToday)}</div><div class="l">COD today</div></div>
        </div>
      </div>

      <div class="between gap-3 mb-3 wrap">
        <div><div class="eyebrow">Assigned to you</div><h1 style="font-size:var(--text-xl);margin-top:2px">Today’s deliveries</h1></div>
        <div class="segmented" data-filter>
          <button data-f="all" class="is-active">All ${list.length}</button>
          <button data-f="out">On route ${out.length}</button>
          <button data-f="pending">Pending ${list.length - out.length}</button>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1.05fr .95fr;gap:16px;align-items:start" id="riderTasksGrid">
        <div class="stack gap-3" data-task-list></div>
        <div class="stack gap-4 rider-sticky">
          <div class="card card-pad">
            <div class="between"><h4 style="font-size:var(--text-sm)"><i class="ph ph-wallet"></i> COD to collect</h4><span class="badge badge-warn">${money(list.reduce((x, p) => x + (p.status === 9 ? 0 : p.cod), 0))}</span></div>
            <p class="tiny muted mt-2" style="line-height:1.6">Deposit collected cash at ${branch.code} before 19:00. The branch cashier reconciles each parcel scan.</p>
            <button class="btn btn-sm btn-block mt-3" data-deposit>${UI.icon('bank')} Record cash deposit</button>
          </div>
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-path"></i> Route snapshot</h4>
            <div class="between mt-3 tiny"><span class="muted">Zone</span><span class="strong">${UI.esc(rider.zone)}</span></div>
            <div class="between mt-2 tiny"><span class="muted">Stops remaining</span><span class="strong">${list.length}</span></div>
            <div class="between mt-2 tiny"><span class="muted">Failed today</span><span class="strong">${failed.length}</span></div>
            <div class="progress mt-3"><span style="width:${s.taskCount ? Math.round((s.deliveredToday / Math.max(1, s.taskCount + s.deliveredToday)) * 100) : 0}%"></span></div>
            <a class="btn btn-sm btn-soft btn-block mt-3" href="#/route">${UI.icon('path')} Open route view</a>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-lightbulb"></i> Delivery tips</h4>
            <div class="stack gap-2 mt-2 tiny muted" style="line-height:1.5">
              <div class="row gap-2">${UI.icon('check-circle', '')} Call before entering a building</div>
              <div class="row gap-2">${UI.icon('check-circle', '')} Count COD cash in front of the customer</div>
              <div class="row gap-2">${UI.icon('check-circle', '')} Record a reason for every failure</div>
            </div>
          </div>
        </div>
      </div>`;

    const host = el.querySelector('[data-task-list]');
    const paint = () => {
      const filtered = filter === 'all' ? list : filter === 'out' ? out : list.filter((p) => p.status !== 7);
      host.innerHTML = filtered.length ? filtered.map((p, i) => taskCard(p, i)).join('') : `<div class="card">${UI.empty({ icon: 'ph-check-circle', title: 'All clear for now', body: 'No tasks in this filter. New assignments appear instantly when the hub dispatches them.', action: '<a class="btn btn-sm" href="#/history">View delivery history</a>' })}</div>`;
      bindTaskActions();
    };
    const bindTaskActions = () => {
      host.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => {
        const p = S.parcel(b.dataset.start);
        S.riderAction(p.id, 'out_for_delivery', { actor });
        UI.toast('Out for delivery', p.tracking, 'info');
        ctx.refresh();
      }));
      host.querySelectorAll('[data-deliver]').forEach((b) => b.addEventListener('click', () => deliverModal(S.parcel(b.dataset.deliver), ctx)));
      host.querySelectorAll('[data-fail]').forEach((b) => b.addEventListener('click', () => failModal(S.parcel(b.dataset.fail), ctx)));
      host.querySelectorAll('[data-reschedule]').forEach((b) => b.addEventListener('click', () => rescheduleModal(S.parcel(b.dataset.reschedule), ctx)));
      host.querySelectorAll('[data-retry]').forEach((b) => b.addEventListener('click', () => {
        const p = S.parcel(b.dataset.retry);
        S.riderAction(p.id, 'reschedule', { actor, date: 'today evening' });
        UI.toast('Retry scheduled', `${p.tracking} is back on your route.`, 'success');
        ctx.refresh();
      }));
    };
    paint();
    el.querySelectorAll('[data-filter] button').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.f;
      el.querySelectorAll('[data-filter] button').forEach((x) => x.classList.toggle('is-active', x === b));
      paint();
    }));
    el.querySelector('[data-notif]').addEventListener('click', () => App.go('notifications'));
    el.querySelector('[data-deposit]').addEventListener('click', () => {
      UI.modal({
        title: 'Cash deposit',
        subtitle: 'Simulated COD reconciliation',
        body: `<div class="card card-pad mb-4" style="background:var(--surface-2)"><div class="between"><span class="small">COD collected today</span><strong class="num">${money(s.codToday)}</strong></div>
          <div class="between mt-2"><span class="small">Rider float</span><strong class="num">${money(0)}</strong></div></div>
          <div class="field"><label class="label">Amount deposited</label><div class="input-group prefix"><span class="addon">৳</span><input class="input" type="number" value="${s.codToday}" min="0"></div></div>
          <div class="field mt-3"><label class="label">Received by</label><select class="select"><option>${UI.esc(branch.manager)} · Branch manager</option><option>Tania Islam · Cashier</option></select></div>
          <p class="tiny faint mt-4">${UI.icon('flask')} This creates an activity log entry for the branch. No real cash is involved.</p>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-confirm>Confirm deposit</button>',
        onMount(root, close) {
          root.querySelector('[data-confirm]').addEventListener('click', () => {
            S.log(actor, 'rider', `Deposited ${money(s.codToday)} COD at ${branch.code}`, branch.code, 'finance');
            S.notify({ audience: 'branch', title: 'Cash deposit recorded', body: `${rider.name} deposited ${money(s.codToday)} COD.`, tone: 'success', icon: 'ph-wallet', link: '#/cod' });
            S.save('cod:deposit');
            UI.toast('Deposit recorded', `${money(s.codToday)} at ${branch.code}`, 'success');
            close(); ctx.refresh();
          });
        }
      });
    });
  }

  /* ------------------------------------------------------------------- route */
  function renderRoute(el, ctx) {
    const list = tasks().filter((p) => p.status !== 9);
    const byArea = {};
    list.forEach((p) => { const k = p.customer.upazila; (byArea[k] = byArea[k] || []).push(p); });
    const stops = Object.values(byArea).flat();
    const s = stats();
    const started = sessionStorage.getItem('zr:routeStarted') === '1';

    el.innerHTML = `
      <div class="between gap-3 mb-3 wrap">
        <div><div class="eyebrow">Route</div><h1 style="font-size:var(--text-xl);margin-top:2px">Your delivery sequence</h1>
          <p class="tiny muted mt-1">${UI.esc(rider.zone)} · ${stops.length} stops · visual simulation only</p></div>
        <button class="btn ${started ? 'btn-soft' : 'btn-primary'} btn-sm" data-route-start>${UI.icon(started ? 'pause' : 'navigation-arrow')} ${started ? 'Pause route' : 'Start route'}</button>
      </div>

      <div class="grid" style="grid-template-columns:1.05fr .95fr;gap:16px;align-items:start" id="riderRouteGrid">
        <div class="card">
          <div class="card-head"><div><h3>Stop order</h3><p class="sub">Grouped by upazila</p></div><span class="badge badge-neutral">${UI.icon('path')} ${stops.length} stops</span></div>
          <div class="card-body">
            ${stops.length ? `<div class="timeline">
              ${stops.map((p, i) => `<div class="tl-item ${i === 0 ? 'current' : ''}">
                <span class="tl-dot"></span>
                <div class="tl-body">
                  <div class="tl-title"><span class="task-seq" style="margin-right:4px"><span class="n">${i + 1}</span></span> ${UI.esc(p.customer.name)} <span class="badge badge-neutral">${UI.esc(p.customer.upazila)}</span></div>
                  <div class="tl-desc">${UI.esc(p.customer.address)}</div>
                  <div class="tl-time">${UI.icon('clock')} ETA ${new Date(Date.now() + (i + 1) * 18 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · ${p.cod ? money(p.cod) + ' COD' : 'Prepaid'}</div>
                </div>
              </div>`).join('')}
            </div>` : UI.empty({ icon: 'ph-check-circle', title: 'No stops assigned', body: 'Your route is clear. New tasks will appear here.' })}
          </div>
        </div>
        <div class="stack gap-4 rider-sticky">
          <div class="card" style="overflow:hidden">
            <div style="background:linear-gradient(150deg,#0b1c33,#123a63);padding:16px;color:#fff">
              <div class="between"><span class="eyebrow" style="color:#8fb4ff">Route map</span><span class="badge" style="background:rgba(255,255,255,.12);color:#dbe8f7">Schematic</span></div>
              <svg viewBox="0 0 320 220" style="width:100%;height:auto;margin-top:8px" role="img" aria-label="Schematic route map">
                <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#4d86ff"/></linearGradient></defs>
                <g opacity=".2" stroke="#fff" stroke-width="1">
                  ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 30}" x2="320" y2="${i * 30}"/>`).join('')}
                  ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 32}" y1="0" x2="${i * 32}" y2="220"/>`).join('')}
                </g>
                ${(() => {
                  const pts = [[112, 96], [168, 80], [232, 68], [276, 104], [250, 150], [180, 170]].slice(0, Math.max(1, stops.length));
                  return `<path d="M34 182 ${pts.map(([x, y]) => `L${x} ${y}`).join(' ')}" fill="none" stroke="url(#rg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${started ? '0' : '7 6'}"/>`;
                })()}
                <circle cx="34" cy="182" r="7" fill="#22d3ee" stroke="#0b1c33" stroke-width="3"/>
                <text x="34" y="204" fill="#a9bdd4" font-size="9" text-anchor="middle">Hub</text>
                ${stops.slice(0, 6).map((p, i) => {
                  const pts = [[112, 96], [168, 80], [232, 68], [276, 104], [250, 150], [180, 170]];
                  const [x, y] = pts[i] || [140, 60];
                  return `<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#4d86ff" stroke-width="2"/><text x="${x}" y="${y - 10}" fill="#dbe8f7" font-size="8" text-anchor="middle">${i + 1}</text>`;
                }).join('')}
              </svg>
              <p class="tiny" style="color:#8fa6bd;margin-top:4px">Not a real map — route distances and ETAs are illustrative.</p>
            </div>
            <div class="card-body">
              <div class="grid g-3" style="gap:8px">
                <div><div class="tiny faint">Stops</div><div class="strong num">${stops.length}</div></div>
                <div><div class="tiny faint">Est. distance</div><div class="strong num">${(stops.length * 2.4).toFixed(1)} km</div></div>
                <div><div class="tiny faint">Cash to collect</div><div class="strong num">${money(list.reduce((x, p) => x + p.cod, 0))}</div></div>
              </div>
              <div class="alert info mt-3 tiny" style="padding:10px">${UI.icon('info')}<div>Use the Tasks tab to start a delivery or record its outcome.</div></div>
            </div>
          </div>
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-phone"></i> Branch contact</h4>
            <div class="small strong mt-2">${UI.esc(branch.name)}</div>
            <div class="tiny muted">${UI.esc(branch.phone)} · ${branch.code}</div>
            <a class="btn btn-sm btn-block mt-3" href="tel:${UI.esc(branch.phone)}">${UI.icon('phone')} Call hub</a>
          </div>
        </div>
      </div>`;

    el.querySelector('[data-route-start]').addEventListener('click', () => {
      const next = !started;
      sessionStorage.setItem('zr:routeStarted', next ? '1' : '0');
      UI.toast(next ? 'Route started' : 'Route paused', next ? `${stops.length} stops · estimate ${stops.length * 18} min` : 'Progress saved for this session', next ? 'success' : 'info');
      ctx.refresh();
    });
  }

  /* ----------------------------------------------------------------- pickups */
  function renderPickups(el, ctx) {
    const list = S.state.pickups.filter((p) => p.riderId === riderId && p.status !== 'picked');
    const done = S.state.pickups.filter((p) => p.riderId === riderId && p.status === 'picked');
    el.innerHTML = `
      <div class="between gap-3 mb-3"><div><div class="eyebrow">Pickups</div><h1 style="font-size:var(--text-xl);margin-top:2px">Collections from merchants</h1><p class="tiny muted mt-1">${branch.code} · ${list.length} assigned</p></div>
        <span class="badge badge-info">${UI.icon('hand-arrow-up')} ${list.length} active</span></div>
      <div class="grid" style="grid-template-columns:1.05fr .95fr;gap:16px;align-items:start" id="riderPickupGrid">
        <div class="stack gap-3">
          ${list.length ? list.map((pk) => `
            <div class="task-card">
              <div class="task-top"><span class="task-seq"><span class="n">${UI.icon('storefront')}</span> Pickup</span><span class="badge badge-info">${UI.esc(pk.window)}</span></div>
              <div class="task-body">
                <div class="task-person"><span class="avatar tone-warning">${UI.initials(pk.merchantName || 'M')}</span><div class="grow" style="min-width:0"><div class="nm truncate">${UI.esc(pk.merchantName || (S.merchant(pk.merchantId) || {}).name || 'Merchant')}</div><div class="tiny muted">${pk.parcelCount} parcels · ${UI.kg(pk.weight)}</div></div></div>
                <div class="task-addr"><span class="ph ph-map-pin"></span><div>${UI.esc(pk.address)}</div></div>
                <div class="task-meta"><span class="badge badge-neutral">${UI.icon('calendar')} ${UI.date(pk.date)}</span><span class="badge badge-neutral">${UI.icon('clock')} ${UI.esc(pk.window)}</span></div>
                <div class="row gap-2"><button class="btn btn-primary grow" data-collect="${pk.id}" style="height:44px">${UI.icon('check')} Mark collected</button><a class="btn" style="height:44px" href="tel:${UI.esc((S.merchant(pk.merchantId) || {}).phone || '')}" aria-label="Call merchant">${UI.icon('phone')}</a></div>
              </div>
            </div>`).join('') : `<div class="card">${UI.empty({ icon: 'ph-hand-arrow-up', title: 'No pickups assigned', body: 'The hub will assign merchant collections to you when they are scheduled.' })}</div>`}
        </div>
        <div class="stack gap-4 rider-sticky">
          <div class="card card-pad">
            <div class="between"><h4 style="font-size:var(--text-sm)"><i class="ph ph-check-circle"></i> Completed pickups</h4><span class="badge badge-success">${done.length}</span></div>
            <div class="stack gap-2 mt-3">
              ${done.slice(0, 4).map((pk) => `<div class="between tiny"><span class="truncate">${UI.esc(pk.merchantName || 'Merchant')}</span><span class="faint">${UI.date(pk.date)}</span></div>`).join('') || '<span class="tiny muted">Nothing collected yet.</span>'}
            </div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-info"></i> Pickup checklist</h4>
            <div class="stack gap-2 mt-3 tiny muted">
              <div class="row gap-2">${UI.icon('check')} Confirm parcel count with merchant</div>
              <div class="row gap-2">${UI.icon('check')} Scan each label before bagging</div>
              <div class="row gap-2">${UI.icon('check')} Check COD amounts are recorded</div>
              <div class="row gap-2">${UI.icon('check')} Hand over a printed receipt if asked</div>
            </div>
          </div>
        </div>
      </div>`;
    el.querySelectorAll('[data-collect]').forEach((b) => b.addEventListener('click', () => {
      S.recordPickup(b.dataset.collect, { actor, riderId });
      UI.toast('Pickup collected', 'Merchant parcels are now in your task list.', 'success');
      ctx.refresh();
    }));
  }

  /* ----------------------------------------------------------------- history */
  function renderHistory(el, ctx) {
    const rows = S.state.parcels.filter((p) => p.riderId === riderId && [8, 9, 11].includes(p.status)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    el.innerHTML = `
      <div class="between gap-3 mb-3"><div><div class="eyebrow">History</div><h1 style="font-size:var(--text-xl);margin-top:2px">Delivery record</h1><p class="tiny muted mt-1">${rows.length} completed tasks</p></div>
        <a class="btn btn-sm" href="#/earnings">${UI.icon('wallet')} Earnings</a></div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Delivery history',
      searchPlaceholder: 'Search tracking or customer…',
      searchFields: ['tracking', (r) => r.customer.name],
      pageSize: 10,
      filters: [{ key: 'statusKey', label: 'Outcome', options: [{ value: 'delivered', label: 'Delivered' }, { value: 'failed', label: 'Failed' }, { value: 'returned', label: 'Returned' }] }],
      columns: [
        { key: 'tracking', label: 'Tracking', render: (p) => `<span class="tracking-code">${p.tracking}</span>` },
        { key: 'customer', label: 'Customer', render: (p) => `<div class="tiny strong">${UI.esc(p.customer.name)}</div><div class="tiny muted">${UI.esc(p.customer.upazila)}</div>` },
        { key: 'statusKey', label: 'Outcome', render: (p) => UI.statusBadge(p.statusKey, { short: true }) },
        { key: 'cod', label: 'COD', align: 'right', render: (p) => `<span class="num">${money(p.cod)}</span>` },
        { key: 'updatedAt', label: 'Date', render: (p) => `<span class="tiny muted">${UI.date(p.deliveredAt || p.updatedAt)}</span>`, sortValue: (p) => new Date(p.updatedAt).getTime() }
      ],
      onRow: (p) => {
        UI.modal({
          title: p.tracking,
          subtitle: p.customer.name,
          body: `<div class="kv-grid">
            <div class="kv"><div class="k">Status</div><div class="v">${UI.statusBadge(p.statusKey)}</div></div>
            <div class="kv"><div class="k">COD</div><div class="v num">${money(p.codCollected || p.cod)}</div></div>
            <div class="kv"><div class="k">Attempts</div><div class="v">${p.attempts || 1}</div></div>
            <div class="kv"><div class="k">Delivered</div><div class="v">${p.deliveredAt ? UI.dateTime(p.deliveredAt) : '—'}</div></div>
            <div class="kv" style="grid-column:1/-1"><div class="k">Address</div><div class="v">${UI.esc(p.customer.address)}, ${UI.esc(p.customer.upazila)}, ${UI.esc(p.customer.district)}</div></div>
            ${p.returnReason ? `<div class="kv" style="grid-column:1/-1"><div class="k">Failure reason</div><div class="v">${UI.esc(p.returnReason)}</div></div>` : ''}
          </div>`,
          footer: '<button class="btn" data-close>Close</button>'
        });
      }
    });
  }

  /* ---------------------------------------------------------------- earnings */
  function renderEarnings(el, ctx) {
    const s = stats();
    const delivered = S.state.parcels.filter((p) => p.riderId === riderId && p.statusKey === 'delivered');
    const today = delivered.filter((p) => p.deliveredAt && S.sameDay(p.deliveredAt, new Date()));
    const week = delivered.filter((p) => p.deliveredAt && (Date.now() - new Date(p.deliveredAt).getTime()) < 7 * 86400000);
    el.innerHTML = `
      <div class="between gap-3 mb-3"><div><div class="eyebrow">Earnings</div><h1 style="font-size:var(--text-xl);margin-top:2px">Your pay</h1><p class="tiny muted mt-1">Demo incentive model · ${UI.esc(rider.zone)}</p></div>
        <button class="btn btn-sm" data-deposit>${UI.icon('bank')} Deposit COD</button></div>
      <div class="grid g-3 mb-4" style="gap:10px">
        <div class="card card-pad"><div class="tiny muted">Today</div><div class="num display" style="font-size:1.4rem;font-weight:750">${money(today.length * 45)}</div><div class="tiny faint">${today.length} deliveries</div></div>
        <div class="card card-pad"><div class="tiny muted">This week</div><div class="num display" style="font-size:1.4rem;font-weight:750">${money(week.length * 45)}</div><div class="tiny faint">${week.length} deliveries</div></div>
        <div class="card card-pad"><div class="tiny muted">Lifetime</div><div class="num display" style="font-size:1.4rem;font-weight:750">${money(s.earnings)}</div><div class="tiny faint">${s.completed} completed</div></div>
      </div>
      <div class="grid" style="grid-template-columns:1.05fr .95fr;gap:16px;align-items:start" id="riderEarningsGrid">
        <div class="card">
          <div class="card-head"><div><h3>Recent earnings</h3><p class="sub">৳45 base per completed delivery</p></div><span class="badge badge-success"><i class="dot"></i>Demo rate</span></div>
          <div class="table-wrap"><table class="table table-compact">
            <thead><tr><th>Tracking</th><th>Date</th><th class="cell-num">COD</th><th class="cell-num">Earning</th></tr></thead>
            <tbody>${delivered.slice(0, 10).map((p) => `<tr><td class="mono tiny">${p.tracking}</td><td class="tiny muted">${UI.date(p.deliveredAt)}</td><td class="cell-num tiny">${money(p.codCollected || p.cod)}</td><td class="cell-num" style="color:var(--success);font-weight:600">+৳45</td></tr>`).join('') || `<tr><td colspan="4">${UI.empty({ icon: 'ph-wallet', title: 'No earnings yet', body: 'Complete a delivery to see it here.' })}</td></tr>`}</tbody>
          </table></div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad" style="background:linear-gradient(150deg,#0b1c33,#123a63);color:#fff;border:0">
            <div class="between"><span class="eyebrow" style="color:#8fb4ff">COD in hand</span>${UI.icon('wallet')}</div>
            <div class="num" style="font-family:var(--font-display);font-weight:750;font-size:1.9rem;letter-spacing:-.03em;margin-top:6px">${money(s.codToday)}</div>
            <p class="tiny mt-1" style="color:#a9bdd4">Collected today · deposit at ${branch.code}</p>
            <button class="btn btn-sm btn-block mt-3" data-deposit style="background:#fff;color:#0a1728">${UI.icon('bank')} Record deposit</button>
          </div>
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-receipt"></i> How pay works</h4>
            <div class="summary-line mt-2"><span>Base per delivery</span><strong>৳45</strong></div>
            <div class="summary-line"><span>COD handling</span><strong>No deduction</strong></div>
            <div class="summary-line"><span>Failed attempt</span><strong>৳10</strong></div>
            <div class="summary-line"><span>Payout</span><strong>Weekly, Thursday</strong></div>
            <p class="tiny faint mt-3">${UI.icon('flask')} Rates are illustrative demo values, not real compensation.</p>
          </div>
        </div>
      </div>`;
    el.querySelectorAll('[data-deposit]').forEach((b) => b.addEventListener('click', () => {
      UI.modal({
        title: 'Record COD deposit',
        subtitle: 'Simulated handover to the hub cashier',
        body: `<div class="card card-pad mb-4" style="background:var(--surface-2)"><div class="between"><span class="small">Collected today</span><strong class="num">${money(s.codToday)}</strong></div></div>
          <div class="field"><label class="label">Amount</label><div class="input-group prefix"><span class="addon">৳</span><input class="input" type="number" value="${s.codToday}"></div></div>
          <p class="tiny faint mt-3">${UI.icon('info')} The branch records this as a COD collection event.</p>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-confirm>Confirm deposit</button>',
        onMount(root, close) {
          root.querySelector('[data-confirm]').addEventListener('click', () => {
            S.log(actor, 'rider', `Deposited ${money(s.codToday)} COD at ${branch.code}`, branch.code, 'finance');
            S.notify({ audience: 'branch', title: 'Cash deposit recorded', body: `${rider.name} deposited ${money(s.codToday)} COD.`, tone: 'success', icon: 'ph-wallet', link: '#/cod' });
            S.save('cod:deposit');
            UI.toast('Deposit recorded', money(s.codToday), 'success');
            close(); ctx.refresh();
          });
        }
      });
    }));
  }

  /* ----------------------------------------------------------------- profile */
  function renderProfile(el, ctx) {
    const s = stats();
    el.innerHTML = `
      <div class="rider-hero mb-4">
        <div class="row gap-3" style="position:relative;z-index:1">
          ${UI.avatar(rider.name, { size: 'xl', tone: 'tone-dark' })}
          <div><h2 style="margin-top:0">${UI.esc(rider.name)}</h2><div class="rider-greet">${UI.esc(rider.zone)} · ${UI.esc(branch.code)}</div>
          <div class="row gap-2 mt-2"><span class="badge" style="background:rgba(255,255,255,.14);color:#e6f0fb">${UI.icon('star')} ${rider.rating}</span><span class="badge" style="background:rgba(255,255,255,.14);color:#e6f0fb">${UI.esc(rider.vehicle)}</span><span class="badge" style="background:rgba(16,185,129,.22);color:#7ef0c0">${rider.status.replace('_', ' ')}</span></div></div>
        </div>
        <div class="rider-stats">
          <div class="rider-stat"><div class="v">${UI.num(rider.deliveries)}</div><div class="l">Deliveries</div></div>
          <div class="rider-stat"><div class="v">${rider.successRate}%</div><div class="l">Success</div></div>
          <div class="rider-stat"><div class="v">${s.completed}</div><div class="l">In demo</div></div>
        </div>
      </div>
      <div class="grid g-2" style="gap:14px" id="riderProfileGrid">
        <div class="card card-pad">
          <h4 style="font-size:var(--text-sm)"><i class="ph ph-identification-card"></i> Rider details</h4>
          <div class="kv-grid mt-3">
            <div class="kv"><div class="k">Rider ID</div><div class="v mono">${UI.esc(rider.id.toUpperCase())}</div></div>
            <div class="kv"><div class="k">Phone</div><div class="v">${UI.esc(rider.phone)}</div></div>
            <div class="kv"><div class="k">Hub</div><div class="v">${UI.esc(branch.name)}</div></div>
            <div class="kv"><div class="k">Zone</div><div class="v">${UI.esc(rider.zone)}</div></div>
            <div class="kv"><div class="k">Vehicle</div><div class="v">${UI.esc(rider.vehicle)}</div></div>
            <div class="kv"><div class="k">Joined</div><div class="v">${UI.date(rider.joined)}</div></div>
          </div>
          <button class="btn btn-sm btn-block mt-4" data-edit>${UI.icon('pencil-simple')} Edit contact details</button>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <div class="between"><h4 style="font-size:var(--text-sm)"><i class="ph ph-toggle-left"></i> Availability</h4><label class="switch"><input type="checkbox" data-avail ${rider.status === 'active' ? 'checked' : ''}><span class="sr-only">Availability</span></label></div>
            <p class="tiny muted mt-2" style="line-height:1.6">When off duty, the hub stops assigning new parcels to you. Existing tasks remain in your list.</p>
            <div class="divider" style="margin-block:12px"></div>
            <div class="between"><span class="small">Cash limit</span><strong>${money(15000)}</strong></div>
            <div class="between mt-2"><span class="small">COD in hand</span><strong>${money(s.codToday)}</strong></div>
            <div class="progress mt-3"><span style="width:${Math.min(100, Math.round(s.codToday / 15000 * 100))}%"></span></div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-shield-check"></i> Documents</h4>
            <div class="between mt-3 tiny"><span>NID verification</span><span class="badge badge-success">Verified</span></div>
            <div class="between mt-2 tiny"><span>Driving licence</span><span class="badge badge-success">Verified</span></div>
            <div class="between mt-2 tiny"><span>Bike registration</span><span class="badge badge-neutral">On file</span></div>
            <p class="tiny faint mt-3">${UI.icon('flask')} Demo profile data only.</p>
          </div>
        </div>
      </div>`;
    el.querySelector('[data-avail]').addEventListener('change', (e) => {
      S.saveRider({ id: rider.id, status: e.target.checked ? 'active' : 'on_leave' }, { actor });
      UI.toast('Availability updated', e.target.checked ? 'You are on duty.' : 'You are off duty.', 'info');
    });
    el.querySelector('[data-edit]').addEventListener('click', () => {
      UI.modal({
        title: 'Edit contact details',
        body: `<div class="form-grid">
          <div class="field full"><label class="label">Phone</label><input class="input" name="phone" value="${UI.esc(rider.phone)}"></div>
          <div class="field full"><label class="label">Zone</label><input class="input" name="zone" value="${UI.esc(rider.zone)}"></div>
        </div>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Save</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const phone = root.querySelector('[name="phone"]').value.trim();
            const zone = root.querySelector('[name="zone"]').value.trim();
            if (!phone || !zone) { UI.toast('Missing details', 'Phone and zone are required.', 'warn'); return; }
            S.saveRider({ id: rider.id, phone, zone }, { actor });
            UI.toast('Profile updated', 'Contact details saved.', 'success');
            close(); ctx.refresh();
          });
        }
      });
    });
  }

  /* ----------------------------------------------------------- notifications */
  function renderNotifications(el, ctx) {
    const rows = S.notificationsFor(riderId);
    el.innerHTML = `
      <div class="between mb-3"><div><div class="eyebrow">Alerts</div><h1 style="font-size:var(--text-xl);margin-top:2px">Notifications</h1></div>
        <button class="btn btn-sm" data-read>${UI.icon('checks')} Mark all read</button></div>
      <div class="card">
        ${rows.length ? rows.map((n) => `<div class="notif-item ${n.read ? '' : 'unread'}" style="padding:13px 14px">
          <span class="ni-ico badge-${n.tone || 'info'}">${UI.icon((n.icon || 'ph-bell').replace('ph-', ''))}</span>
          <div class="grow"><div class="between gap-2"><span class="nt">${UI.esc(n.title)}</span><span class="tiny faint">${UI.relative(n.at)}</span></div>
          <div class="nd">${UI.esc(n.body)}</div></div>
        </div>`).join('') : UI.empty({ icon: 'ph-bell-slash', title: 'No alerts', body: 'New assignments and COD reminders appear here.' })}
      </div>`;
    el.querySelector('[data-read]').addEventListener('click', () => { S.markAllRead(riderId); UI.toast('All read', 'Notifications cleared.', 'success'); ctx.refresh(); });
  }

  /* ---------------------------------------------------------------- settings */
  function renderSettings(el, ctx) {
    el.innerHTML = `
      <div class="mb-3"><div class="eyebrow">Settings</div><h1 style="font-size:var(--text-xl);margin-top:2px">Rider preferences</h1></div>
      <div class="grid g-2" style="gap:14px" id="riderSettingsGrid">
        <div class="card card-pad">
          <h4 style="font-size:var(--text-sm)"><i class="ph ph-paint-brush"></i> Appearance</h4>
          <div class="between mt-3"><span class="small">Theme</span>
            <div class="segmented" data-theme-pref>
              <button data-theme="light" class="${ZR.app.theme() === 'light' ? 'is-active' : ''}">Light</button>
              <button data-theme="dark" class="${ZR.app.theme() === 'dark' ? 'is-active' : ''}">Dark</button>
            </div>
          </div>
          <div class="divider" style="margin-block:14px"></div>
          <div class="between"><span class="small">Large touch targets</span><label class="switch"><input type="checkbox" checked><span class="sr-only">Large touch targets</span></label></div>
          <div class="between mt-3"><span class="small">Vibration on scan</span><label class="switch"><input type="checkbox" checked><span class="sr-only">Vibration</span></label></div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-user-circle"></i> Session</h4>
            <div class="row gap-2 mt-3">${UI.avatar(user.name, { tone: 'tone-violet' })}<div><div class="small strong">${UI.esc(user.name)}</div><div class="tiny muted">${UI.esc(user.email)}</div></div></div>
            <button class="btn btn-sm btn-block mt-3" data-switch>${UI.icon('arrows-left-right')} Switch demo role</button>
            <button class="btn btn-sm btn-ghost btn-block mt-2" data-signout>${UI.icon('sign-out')} Sign out</button>
          </div>
          <div class="card card-pad" style="border-color:rgba(217,45,60,.25)">
            <h4 style="font-size:var(--text-sm);color:var(--danger)"><i class="ph ph-warning"></i> Demo data</h4>
            <p class="tiny muted mt-2">Reset every role’s dataset to the original seed.</p>
            <button class="btn btn-sm btn-danger-soft btn-block mt-3" data-reset>Reset demo data</button>
          </div>
        </div>
      </div>`;
    el.querySelectorAll('[data-theme-pref] button').forEach((b) => b.addEventListener('click', () => {
      ZR.app.setTheme(b.dataset.theme);
      el.querySelectorAll('[data-theme-pref] button').forEach((x) => x.classList.toggle('is-active', x === b));
    }));
    el.querySelector('[data-reset]').addEventListener('click', ZR.app.resetDemo);
    el.querySelector('[data-switch]').addEventListener('click', ZR.app.roleSwitcher);
    el.querySelector('[data-signout]').addEventListener('click', () => { ZR.auth.logout(); location.href = 'login.html'; });
  }

  /* ---------------------------------------------------------------- routes */
  const routes = {
    tasks: { title: 'My tasks', render: renderTasks },
    route: { title: 'Route', render: renderRoute },
    pickups: { title: 'Pickups', render: renderPickups },
    history: { title: 'Delivery history', render: renderHistory },
    earnings: { title: 'Earnings', render: renderEarnings },
    profile: { title: 'Profile', render: renderProfile },
    notifications: { title: 'Notifications', render: renderNotifications },
    settings: { title: 'Settings', render: renderSettings }
  };

  const nav = [
    { label: 'Deliveries', items: [
      { label: 'My tasks', icon: 'squares-four', route: 'tasks', count: () => tasks().length },
      { label: 'Route view', icon: 'path', route: 'route' },
      { label: 'Pickups', icon: 'hand-arrow-up', route: 'pickups', count: () => S.state.pickups.filter((p) => p.riderId === riderId && p.status !== 'picked').length },
      { label: 'History', icon: 'clock-counter-clockwise', route: 'history' }
    ] },
    { label: 'Earnings', items: [
      { label: 'Earnings & COD', icon: 'wallet', route: 'earnings' }
    ] },
    { label: 'Account', items: [
      { label: 'Notifications', icon: 'bell', route: 'notifications', count: () => S.unreadCount(riderId) },
      { label: 'Profile', icon: 'user', route: 'profile' },
      { label: 'Settings', icon: 'gear', route: 'settings' }
    ] }
  ];

  ZR.app.registerParcelOpener((id) => {
    const p = S.parcel(id);
    if (!p || p.riderId !== riderId) return false;
    deliverModal(p, { refresh: () => App.refresh() });
    return true;
  });

  App.mount({
    role: 'rider',
    user,
    nav,
    routes,
    defaultRoute: 'tasks',
    roleLabel: rider.name,
    roleSub: `${rider.zone} · ${branch.code}`,
    searchPlaceholder: 'Search your tasks or tracking…'
  });
})(window.ZR);
