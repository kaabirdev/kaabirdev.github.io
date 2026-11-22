/* ==========================================================================
   Zeriour — Super Admin command center
   Network, merchants, parcels, finance, pricing, support and system settings.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';
  const UI = ZR.ui;
  const S = ZR.store;
  const App = ZR.app;

  S.init();
  const user = ZR.auth.require('admin');
  if (!user) return;
  const actor = user.name;

  /* ------------------------------------------------------------------ utils */
  const money = UI.money;
  function sparkline(values, color = 'var(--primary)') {
    if (!values || values.length < 2) return '';
    const max = Math.max(...values, 1), min = Math.min(...values, 0), span = max - min || 1;
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * 64},${23 - ((v - min) / span) * 19}`).join(' ');
    return `<svg class="spark" viewBox="0 0 64 24" fill="none" aria-hidden="true"><polyline points="${pts}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function kpi({ label, value, icon, tone = '', delta, deltaDir = 'up', foot = '', spark }) {
    return `<div class="kpi">
      <div class="kpi-top"><span class="kpi-label">${UI.esc(label)}</span><span class="kpi-ico ${tone}">${UI.icon(icon)}</span></div>
      <div class="kpi-val">${value}</div>
      <div class="kpi-foot"><span>${delta ? `<span class="delta ${deltaDir}">${UI.icon(deltaDir === 'up' ? 'arrow-up-right' : deltaDir === 'down' ? 'arrow-down-right' : 'minus')} ${UI.esc(delta)}</span>` : ''} ${foot}</span>${spark || ''}</div>
    </div>`;
  }
  function panel(title, sub, body, actions = '', cls = '') {
    return `<div class="card ${cls}"><div class="card-head"><div><h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions}</div>${body}</div>`;
  }
  function statusOptions(selected) {
    return ZR.STATUSES.map((s) => `<option value="${s.key}" ${selected === s.key ? 'selected' : ''}>${s.label}</option>`).join('');
  }

  /* ------------------------------------------------------------- parcel view */
  function parcelDrawer(id, ctx) {
    const p = S.parcel(id);
    if (!p) return;
    const merchant = S.merchant(p.merchantId);
    const origin = S.branch(p.originBranchId);
    const dest = S.branch(p.destBranchId) || S.branchForDistrict(p.customer.district);
    const riders = S.state.riders.filter((r) => !dest || r.branchId === dest.id || r.branchId === p.destBranchId);
    UI.drawer({
      title: p.tracking,
      subtitle: `${p.merchantName} · ${UI.statusBadge(p.statusKey, { short: true })}`,
      size: 'wide',
      body: `
        <div class="card card-pad mb-4">
          <div class="between wrap gap-3 mb-3">
            <div><div class="tiny muted">Status</div><div class="mt-1">${UI.statusBadge(p.statusKey, { lg: true })}</div></div>
            <div class="text-right"><div class="tiny muted">COD</div><div class="strong num" style="font-size:var(--text-lg)">${money(p.cod)}</div></div>
          </div>
          ${ZR.tracking.progress(p)}
          <div class="row gap-4 mt-3 wrap tiny muted">
            <span>${UI.icon('buildings')} ${origin ? origin.code : 'No origin'}</span>
            <span>${UI.icon('map-pin')} ${dest ? dest.code : '—'}</span>
            <span>${UI.icon('moped')} ${p.riderId ? (S.rider(p.riderId) || {}).name : 'No rider'}</span>
            <span>${UI.icon('clock')} ${UI.relative(p.updatedAt)}</span>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-head"><div><h4 style="font-size:var(--text-sm)">${UI.icon('sliders-horizontal')} Operations controls</h4><p class="sub">Assign routing and move the parcel through the network</p></div><span class="badge badge-neutral">Admin only</span></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="field"><label class="label">Origin branch</label>
                <select class="select" data-assign-origin>${S.state.branches.map((b) => `<option value="${b.id}" ${p.originBranchId === b.id ? 'selected' : ''}>${b.code} · ${UI.esc(b.name)}</option>`).join('')}</select>
              </div>
              <div class="field"><label class="label">Destination branch</label>
                <select class="select" data-assign-dest>${S.state.branches.map((b) => `<option value="${b.id}" ${p.destBranchId === b.id ? 'selected' : ''}>${b.code} · ${UI.esc(b.name)}</option>`).join('')}</select>
              </div>
              <div class="field"><label class="label">Assign rider</label>
                <select class="select" data-assign-rider><option value="">Unassigned</option>${S.state.riders.map((r) => `<option value="${r.id}" ${p.riderId === r.id ? 'selected' : ''}>${UI.esc(r.name)} · ${UI.esc(S.branch(r.branchId) ? S.branch(r.branchId).code : '')}</option>`).join('')}</select>
              </div>
              <div class="field"><label class="label">Set status</label>
                <select class="select" data-set-status>${statusOptions(p.statusKey)}</select>
              </div>
              <div class="field full"><label class="label">Internal note <span class="opt">(optional)</span></label>
                <input class="input" data-status-note placeholder="e.g. Customer requested evening delivery"></div>
            </div>
            <div class="row gap-2 mt-3 wrap">
              <button class="btn btn-sm btn-primary" data-save-ops>${UI.icon('check')} Apply changes</button>
              <button class="btn btn-sm" data-reset-route>${UI.icon('arrows-clockwise')} Auto-route by district</button>
              <span class="tiny faint" style="align-self:center">${UI.icon('flask')} Changes update branch, rider and public tracking immediately.</span>
            </div>
          </div>
        </div>

        <div class="alert info mb-4">${UI.icon('storefront')}<div><strong>${UI.esc(p.merchantName)}</strong> · ${UI.esc(merchant ? merchant.owner : '')} · ${UI.esc(merchant ? merchant.phone : '')}</div></div>
        ${ZR.tracking.details(p)}
        <div class="detail-section mt-4"><div class="ds-head"><h4>${UI.icon('path')} Timeline</h4><span class="badge badge-neutral">${p.timeline.length} events</span></div><div class="ds-body">${ZR.tracking.timeline(p)}</div></div>`,
      footer: `<button class="btn btn-sm" data-close>Close</button><span class="grow"></span><a class="btn btn-sm btn-primary" href="track.html?id=${p.tracking}" target="_blank" rel="noopener">${UI.icon('arrow-up-right')} Public view</a>`,
      onMount(root, close) {
        root.querySelector('[data-reset-route]').addEventListener('click', () => {
          const hub = S.branchForDistrict(p.customer.district);
          if (hub) root.querySelector('[data-assign-dest]').value = hub.id;
          UI.toast('Destination matched', hub ? `${hub.code} · ${hub.name}` : 'No hub for this district', 'info');
        });
        root.querySelector('[data-save-ops]').addEventListener('click', () => {
          const originId = root.querySelector('[data-assign-origin]').value;
          const destId = root.querySelector('[data-assign-dest]').value;
          const riderId = root.querySelector('[data-assign-rider]').value;
          const statusKey = root.querySelector('[data-set-status]').value;
          const note = root.querySelector('[data-status-note]').value.trim();
          p.destBranchId = destId;
          if (originId !== p.originBranchId) S.assignBranch(p.id, originId, { actor });
          if (riderId && riderId !== p.riderId) S.assignRider(p.id, riderId, { actor });
          if (statusKey && statusKey !== p.statusKey) S.adminSetStatus(p.id, statusKey, { actor, note });
          S.log(actor, 'admin', `Updated operations for ${p.tracking}`, p.tracking, 'parcel');
          S.save('parcel:ops');
          UI.toast('Parcel updated', `${p.tracking} · ${ZR.statusMeta(p.statusKey).short}`, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  /* ---------------------------------------------------------------- overview */
  function renderOverview(el, ctx) {
    const s = S.statsAdmin();
    const pendingWd = S.state.withdrawals.filter((w) => w.status === 'pending');
    const pendingApps = S.state.merchants.filter((m) => m.status === 'pending');
    const failed = S.state.parcels.filter((p) => p.statusKey === 'failed');
    const recentLogs = S.state.logs.slice(0, 8);

    el.innerHTML = `
      ${App.pageHead({
        title: 'Command center',
        sub: `Network snapshot · ${UI.dateTime(new Date().toISOString())} · all demo data`,
        actions: `<span class="demo-note">${UI.icon('flask')} Demo environment</span><button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export snapshot</button><a class="btn btn-sm btn-primary" href="#/parcels">${UI.icon('package')} Manage parcels</a>`
      })}

      ${(pendingWd.length || pendingApps.length || failed.length) ? `
      <div class="grid g-3 mb-5" style="gap:10px" id="alertGrid">
        ${pendingWd.length ? `<a class="card card-pad card-hover row gap-3" href="#/withdrawals" style="align-items:center">
          <span class="kpi-ico warn"><i class="ph ph-bank"></i></span>
          <div class="grow"><div class="small strong">${pendingWd.length} withdrawal requests</div><div class="tiny muted">${money(pendingWd.reduce((x, w) => x + w.amount, 0))} awaiting approval</div></div>
          ${UI.icon('caret-right')}
        </a>` : ''}
        ${pendingApps.length ? `<a class="card card-pad card-hover row gap-3" href="#/merchants" style="align-items:center">
          <span class="kpi-ico"><i class="ph ph-storefront"></i></span>
          <div class="grow"><div class="small strong">${pendingApps.length} merchant application${pendingApps.length === 1 ? '' : 's'}</div><div class="tiny muted">New stores waiting for review</div></div>
          ${UI.icon('caret-right')}
        </a>` : ''}
        ${failed.length ? `<a class="card card-pad card-hover row gap-3" href="#/returns" style="align-items:center">
          <span class="kpi-ico danger"><i class="ph ph-warning"></i></span>
          <div class="grow"><div class="small strong">${failed.length} failed deliveries</div><div class="tiny muted">Review reasons and retry</div></div>
          ${UI.icon('caret-right')}
        </a>` : ''}
      </div>` : ''}

      <div class="grid g-4 mb-4">
        ${kpi({ label: 'Total parcels', value: UI.num(s.parcels), icon: 'package', delta: '+12.4%', foot: 'vs last month', spark: sparkline(s.series.map((d) => d.created)) })}
        ${kpi({ label: "Today's shipments", value: UI.num(s.todays), icon: 'lightning', tone: 'violet', delta: '+6.2%', foot: 'created today' })}
        ${kpi({ label: 'Active deliveries', value: UI.num(s.active), icon: 'truck', tone: 'sky', foot: 'in the network now' })}
        ${kpi({ label: 'Delivered', value: UI.num(s.delivered), icon: 'check-circle', tone: 'success', delta: '+3.1%', foot: `${s.successRate}% success`, spark: sparkline(s.series.map((d) => d.delivered), 'var(--success)') })}
      </div>
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Active merchants', value: UI.num(s.merchants), icon: 'storefront', foot: `${s.applications} pending application${s.applications === 1 ? '' : 's'}` })}
        ${kpi({ label: 'COD volume', value: money(s.codVolume), icon: 'coins', tone: 'success', foot: 'collected on delivery' })}
        ${kpi({ label: 'Platform revenue', value: money(s.revenue), icon: 'chart-line-up', tone: 'violet', foot: 'delivery + COD fees' })}
        ${kpi({ label: 'Return rate', value: s.returnsRate + '%', icon: 'arrow-u-up-left', tone: 'warn', deltaDir: 'down', delta: '0.4%', foot: `${s.returned} returned parcels` })}
      </div>

      <div class="grid" style="grid-template-columns:1.65fr 1fr;gap:16px" id="adminCharts">
        <div class="card">
          ${panel('Shipment volume', 'Created vs delivered · last 14 days',
            `<div class="card-body"><div class="chart-legend mb-3"><span class="li"><span class="sw" style="background:var(--primary)"></span>Created</span><span class="li"><span class="sw" style="background:var(--success)"></span>Delivered</span></div><div class="chart-box h-240"><canvas id="aTrend"></canvas></div></div>`,
            `<span class="badge badge-success"><i class="dot"></i>Live demo</span>`)}
        </div>
        <div class="card">
          ${panel('Status distribution', 'All parcels in the demo dataset', `<div class="card-body"><div class="chart-box h-240"><canvas id="aStatus"></canvas></div></div>`)}
        </div>
      </div>

      <div class="grid mt-4" style="grid-template-columns:1.4fr 1fr;gap:16px" id="adminLower">
        <div class="stack gap-4">
          <div class="card">
            ${panel('Revenue trend', 'Delivery and COD fees · last 6 months', `<div class="card-body"><div class="chart-box h-200"><canvas id="aRevenue"></canvas></div></div>`, `<button class="btn btn-sm btn-ghost" data-export-rev>${UI.icon('download-simple')} CSV</button>`)}
          </div>
          <div class="card">
            ${panel('Branch performance', 'Delivered share by destination hub', `<div class="card-body"><div class="chart-box h-200"><canvas id="aBranch"></canvas></div></div>`)}
          </div>
        </div>
        <div class="stack gap-4">
          <div class="card">
            ${panel('Recent activity', 'Admin, branch and system events', `<div class="card-body" style="padding:8px 16px"><div class="stack" style="gap:0">${recentLogs.map((l) => `<div class="row gap-3" style="padding:9px 0;border-bottom:1px solid var(--line-soft)">
              <span class="avatar sm ${l.role === 'admin' ? 'tone-dark' : l.role === 'branch' ? 'tone-sky' : l.role === 'rider' ? 'tone-violet' : 'tone-success'}">${UI.initials(l.actor)}</span>
              <div class="grow" style="min-width:0"><div class="tiny" style="line-height:1.4">${UI.esc(l.action)}</div><div class="tiny faint">${UI.esc(l.actor)} · ${UI.relative(l.at)}</div></div>
            </div>`).join('')}</div></div>`, `<a class="link tiny" href="#/logs">All logs ${UI.icon('arrow-right')}</a>`)}
          </div>
          <div class="card card-pad">
            <div class="between"><h4 style="font-size:var(--text-sm)"><i class="ph ph-warning"></i> Operational alerts</h4><span class="badge badge-warn">${failed.length + pendingWd.length}</span></div>
            <div class="stack gap-3 mt-3">
              ${failed.slice(0, 2).map((p) => `<a class="row gap-2 tiny" href="#/returns">${UI.icon('x-circle')} <span class="grow"><strong>${p.tracking}</strong> — ${UI.esc(p.returnReason || 'Delivery failed')}</span></a>`).join('')}
              ${pendingWd.length ? `<a class="row gap-2 tiny" href="#/withdrawals">${UI.icon('bank')} ${pendingWd.length} payouts awaiting approval</a>` : ''}
              <a class="row gap-2 tiny" href="#/pricing">${UI.icon('receipt')} Verify delivery pricing configuration</a>
              ${!failed.length ? `<span class="tiny muted">${UI.icon('check-circle')} No operational alerts.</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;

    if (document.getElementById('aTrend')) {
      ZR.charts.bars('aTrend', {
        labels: s.series.map((d) => d.label),
        series: [
          { label: 'Created', data: s.series.map((d) => d.created), color: ZR.charts.tokens().primary },
          { label: 'Delivered', data: s.series.map((d) => d.delivered), color: ZR.charts.tokens().success }
        ],
        legend: false
      });
    }
    if (document.getElementById('aStatus')) {
      const groups = [
        { label: 'Delivered', count: S.state.parcels.filter((p) => p.statusKey === 'delivered').length, color: ZR.charts.tokens().success },
        { label: 'In transit', count: S.state.parcels.filter((p) => p.status >= 2 && p.status <= 7).length, color: ZR.charts.tokens().primary },
        { label: 'Pending', count: S.state.parcels.filter((p) => p.status <= 1).length, color: ZR.charts.tokens().warn },
        { label: 'Failed / return', count: S.state.parcels.filter((p) => [9, 10, 11].includes(p.status)).length, color: ZR.charts.tokens().danger },
        { label: 'Cancelled', count: S.state.parcels.filter((p) => p.statusKey === 'cancelled').length, color: ZR.charts.tokens().faint }
      ];
      ZR.charts.doughnut('aStatus', { labels: groups.map((g) => g.label), data: groups.map((g) => g.count), colors: groups.map((g) => g.color), centerLabel: UI.num(s.parcels), centerSub: 'parcels' });
    }
    if (document.getElementById('aRevenue')) {
      ZR.charts.areaLine('aRevenue', {
        labels: s.revenueMonths.map((m) => m.label),
        series: [
          { label: 'Delivery fees', data: s.revenueMonths.map((m) => m.delivery) },
          { label: 'COD fees', data: s.revenueMonths.map((m) => m.cod), fill: false, color: ZR.charts.tokens().violet }
        ],
        yFormatter: (v) => money(v)
      });
    }
    if (document.getElementById('aBranch')) {
      const perf = s.branchPerf.slice().sort((a, b) => b.rate - a.rate);
      ZR.charts.bars('aBranch', {
        labels: perf.map((b) => b.name),
        series: [{ label: 'Delivered', data: perf.map((b) => b.delivered), color: ZR.charts.tokens().primary }],
        legend: false
      });
    }
    el.querySelector('[data-export]').addEventListener('click', () => {
      UI.csv.export('zeriour-network-snapshot.csv', [
        { metric: 'Total parcels', value: s.parcels },
        { metric: 'Delivered', value: s.delivered },
        { metric: 'Active deliveries', value: s.active },
        { metric: 'Active merchants', value: s.merchants },
        { metric: 'COD volume (BDT)', value: s.codVolume },
        { metric: 'Revenue (BDT)', value: s.revenue },
        { metric: 'Return rate (%)', value: s.returnsRate }
      ], [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }]);
    });
    el.querySelector('[data-export-rev]').addEventListener('click', () => {
      UI.csv.export('zeriour-revenue.csv', s.revenueMonths, [{ key: 'label', label: 'Month' }, { key: 'delivery', label: 'Delivery fees' }, { key: 'cod', label: 'COD fees' }, { key: 'total', label: 'Total' }]);
    });
  }

  /* --------------------------------------------------------------- merchants */
  function renderMerchants(el, ctx) {
    const rows = S.state.merchants.slice();
    el.innerHTML = `
      ${App.pageHead({ title: 'Merchants', sub: 'Approve applications, review performance and manage account status.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button><button class="btn btn-sm btn-primary" data-add>${UI.icon('plus')} Add merchant</button>` })}
      <div class="row gap-2 wrap mb-4">
        <span class="badge badge-neutral badge-lg">All <strong>${rows.length}</strong></span>
        <span class="badge badge-warn badge-lg">Pending <strong>${rows.filter((m) => m.status === 'pending').length}</strong></span>
        <span class="badge badge-success badge-lg">Active <strong>${rows.filter((m) => m.status === 'active').length}</strong></span>
        <span class="badge badge-danger badge-lg">Suspended <strong>${rows.filter((m) => m.status === 'suspended').length}</strong></span>
      </div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Merchants',
      searchPlaceholder: 'Search merchant, owner, email…',
      searchFields: ['name', 'owner', 'email', 'district'],
      pageSize: 10,
      filters: [{ key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending review' }, { value: 'suspended', label: 'Suspended' }, { value: 'rejected', label: 'Rejected' }] }],
      columns: [
        { key: 'name', label: 'Merchant', render: (m) => `<div class="user-cell"><span class="avatar sm sq">${UI.initials(m.name)}</span><div><div class="name">${UI.esc(m.name)}</div><div class="meta">${UI.esc(m.email)}</div></div></div>` },
        { key: 'owner', label: 'Owner', render: (m) => `<div class="tiny">${UI.esc(m.owner)}</div><div class="tiny muted">${UI.esc(m.phone)}</div>` },
        { key: 'district', label: 'District', render: (m) => `<span class="badge badge-neutral">${UI.esc(m.district)}</span>` },
        { key: 'parcels', label: 'Parcels', align: 'right', render: (m) => `<span class="num">${S.merchantParcels(m.id).length}</span>` },
        { key: 'cod', label: 'COD volume', align: 'right', render: (m) => `<span class="num">${money(S.merchantParcels(m.id).filter((p) => p.statusKey === 'delivered').reduce((x, p) => x + p.cod, 0))}</span>` },
        { key: 'createdAt', label: 'Joined', render: (m) => `<span class="tiny muted">${UI.date(m.createdAt)}</span>`, sortValue: (m) => new Date(m.createdAt).getTime() },
        { key: 'status', label: 'Status', render: (m) => UI.userBadge(m.status) }
      ],
      rowMenu: (m) => [
        { label: 'View merchant', icon: 'eye', onClick: () => merchantDrawer(m.id, ctx) },
        { label: 'Set commission', icon: 'percent', onClick: () => commissionModal(m.id, ctx) },
        { label: 'Approve account', icon: 'check-circle', hidden: m.status === 'active', onClick: () => { S.setMerchantStatus(m.id, 'active', { actor }); UI.toast('Merchant activated', m.name, 'success'); ctx.refresh(); } },
        { label: 'Reject application', icon: 'x-circle', danger: true, hidden: m.status !== 'pending', onClick: async () => {
          const ok = await UI.confirm({ title: 'Reject application?', body: `${m.name} will be marked rejected. The demo applicant cannot sign in.`, confirmText: 'Reject application', danger: true });
          if (!ok) return; S.setMerchantStatus(m.id, 'rejected', { actor }); UI.toast('Application rejected', m.name, 'info'); ctx.refresh();
        } },
        { label: 'Suspend account', icon: 'prohibit', danger: true, hidden: m.status !== 'active', onClick: async () => {
          const ok = await UI.confirm({ title: 'Suspend merchant?', body: `${m.name} will lose access to the demo merchant workspace. Parcels and records are kept.`, confirmText: 'Suspend account', danger: true });
          if (!ok) return; S.setMerchantStatus(m.id, 'suspended', { actor }); UI.toast('Merchant suspended', m.name, 'warn'); ctx.refresh();
        } },
        { label: 'Reactivate', icon: 'arrows-clockwise', hidden: m.status !== 'suspended', onClick: () => { S.setMerchantStatus(m.id, 'active', { actor }); UI.toast('Merchant reactivated', m.name, 'success'); ctx.refresh(); } }
      ],
      onRow: (m) => merchantDrawer(m.id, ctx)
    });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-merchants.csv', rows, [
      { key: 'name', label: 'Merchant' }, { key: 'owner', label: 'Owner' }, { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' }, { key: 'district', label: 'District' }, { key: 'status', label: 'Status' },
      { key: 'balance', label: 'Balance' }, { key: 'pending', label: 'Pending' }
    ]));
    el.querySelector('[data-add]').addEventListener('click', () => {
      UI.modal({
        title: 'Add merchant',
        subtitle: 'Creates an active demo merchant record',
        body: `<form data-add-form class="form-grid">
          <div class="field full"><label class="label">Business name</label><input class="input" name="name" placeholder="e.g. Padma Organics"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Owner</label><input class="input" name="owner" placeholder="Full name"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Phone</label><input class="input" name="phone" placeholder="+8801…"></div>
          <div class="field"><label class="label">Email</label><input class="input" name="email" type="email" placeholder="owner@store.com"></div>
          <div class="field"><label class="label">District</label><select class="select" name="district">${UI.districtOptions('Dhaka')}</select></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Create merchant</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-add-form]');
            if (!UI.validate(form, { name: [UI.validators.required], owner: [UI.validators.required], email: [UI.validators.required, UI.validators.email], phone: [UI.validators.required, UI.validators.phone] })) return;
            const fd = new FormData(form);
            const m = S.applyMerchant({ name: fd.get('name'), owner: fd.get('owner'), email: fd.get('email'), phone: fd.get('phone'), district: fd.get('district'), businessType: 'General', address: 'Demo address', pickupAddress: 'Demo pickup point', volume: '1–50 parcels / week' });
            S.setMerchantStatus(m.id, 'active', { actor });
            UI.toast('Merchant created', m.name, 'success');
            close(); ctx.refresh();
          });
        }
      });
    });
  }

  function customerDirectory() {
    const map = new Map();
    S.state.parcels.forEach((p) => {
      const key = (p.customer.phone || p.customer.name || '').trim();
      let c = map.get(key);
      if (!c) {
        c = { id: key, name: p.customer.name, phone: p.customer.phone, district: p.customer.district, upazila: p.customer.upazila, parcelIds: [], delivered: 0, cod: 0, last: 0 };
        map.set(key, c);
      }
      c.parcelIds.push(p.id);
      if (p.statusKey === 'delivered') { c.delivered += 1; c.cod += p.cod || 0; }
      c.last = Math.max(c.last, new Date(p.updatedAt || p.createdAt).getTime());
    });
    return Array.from(map.values()).sort((a, b) => b.last - a.last);
  }

  function renderCustomers(el, ctx) {
    const rows = customerDirectory();
    const repeat = rows.filter((c) => c.parcelIds.length > 1).length;
    const districts = new Set(rows.map((c) => c.district)).size;
    el.innerHTML = `
      ${App.pageHead({ title: 'Customers', sub: 'Everyone receiving parcels in the network, grouped by phone number.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div class="row gap-2 wrap mb-4">
        <span class="badge badge-neutral badge-lg">All <strong>${rows.length}</strong></span>
        <span class="badge badge-info badge-lg">Repeat buyers <strong>${repeat}</strong></span>
        <span class="badge badge-neutral badge-lg">Districts <strong>${districts}</strong></span>
      </div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Network customers',
      searchPlaceholder: 'Search name, phone or district…',
      searchFields: ['name', 'phone', 'district', 'upazila'],
      pageSize: 12,
      columns: [
        { key: 'name', label: 'Customer', render: (c) => `<div class="user-cell"><span class="avatar sm">${UI.initials(c.name)}</span><div><div class="name">${UI.esc(c.name)}</div><div class="meta">${UI.esc(c.phone)}</div></div></div>` },
        { key: 'district', label: 'Location', render: (c) => `<div class="tiny">${UI.esc(c.district)}</div><div class="tiny muted">${UI.esc(c.upazila)}</div>` },
        { key: 'parcels', label: 'Parcels', align: 'right', render: (c) => `<span class="num">${c.parcelIds.length}</span>` },
        { key: 'delivered', label: 'Delivered', align: 'right', render: (c) => `<span class="num">${c.delivered}</span>` },
        { key: 'cod', label: 'COD collected', align: 'right', render: (c) => `<span class="num">${money(c.cod)}</span>` },
        { key: 'last', label: 'Last order', render: (c) => `<span class="tiny muted">${UI.relative(new Date(c.last).toISOString())}</span>`, sortValue: (c) => c.last }
      ],
      rowMenu: (c) => [{ label: 'View customer', icon: 'eye', onClick: () => customerDrawer(c, ctx) }],
      onRow: (c) => customerDrawer(c, ctx)
    });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-customers.csv', rows, [
      { key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' }, { key: 'district', label: 'District' },
      { key: 'upazila', label: 'Upazila' }, { key: 'parcels', label: 'Parcels', value: (c) => c.parcelIds.length },
      { key: 'delivered', label: 'Delivered' }, { key: 'cod', label: 'COD collected' },
      { key: 'last', label: 'Last order', value: (c) => UI.dateTime(c.last) }
    ]));
  }

  function customerDrawer(c, ctx) {
    const parcels = c.parcelIds.map((id) => S.parcel(id)).filter(Boolean);
    UI.drawer({
      title: c.name,
      subtitle: `${c.phone} · ${c.upazila}, ${c.district}`,
      body: `
        <div class="grid g-3 mb-4" style="gap:10px">
          <div class="card card-pad"><div class="tiny muted">Parcels</div><div class="strong num" style="font-size:20px">${parcels.length}</div></div>
          <div class="card card-pad"><div class="tiny muted">Delivered</div><div class="strong num" style="font-size:20px">${c.delivered}</div></div>
          <div class="card card-pad"><div class="tiny muted">COD collected</div><div class="strong num" style="font-size:20px">${money(c.cod)}</div></div>
        </div>
        <div class="detail-section">
          <div class="ds-head"><h4>${UI.icon('package')} Shipment history</h4><span class="badge badge-neutral">${parcels.length}</span></div>
          <div class="ds-body stack gap-2">
            ${parcels.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((p) => `
              <button class="row gap-3" style="width:100%;text-align:left;padding:10px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--surface)" data-open-parcel="${p.id}">
                <span class="badge badge-neutral mono">${p.tracking}</span>
                <span class="grow"><span class="tiny strong" style="display:block">${UI.esc(p.product || 'Parcel')}</span><span class="tiny faint">${UI.date(p.createdAt)} · ${UI.esc(p.merchantName || 'Merchant')}</span></span>
                ${UI.statusBadge(p.statusKey)}
              </button>`).join('')}
          </div>
        </div>
        <p class="tiny faint mt-4">${UI.icon('info')} Customer records are derived from receiver details on parcels. Editing a parcel updates this profile automatically.</p>`,
      footer: '<button class="btn" data-close>Close</button>',
      onMount(root, close) {
        root.querySelectorAll('[data-open-parcel]').forEach((b) => b.addEventListener('click', () => {
          const id = b.dataset.openParcel;
          close();
          setTimeout(() => App.openParcel(id), 220);
        }));
      }
    });
  }

  function commissionModal(id, ctx) {
    const m = S.merchant(id);
    if (!m) return;
    UI.modal({
      title: 'Commission rate',
      subtitle: `${m.name} · ${m.plan} plan`,
      body: `<form data-commission-form>
        <div class="field"><label class="label">Platform commission (%)</label>
          <div class="input-group suffix"><input class="input" type="number" name="commission" value="${m.commission}" min="0" max="25" step="0.1"><span class="addon">%</span></div>
          <span class="hint">Deducted from each delivered parcel's delivery charge. Typical merchant rates are 3–6%.</span>
          <span class="error-text" hidden></span>
        </div>
        <div class="alert info mt-4">${UI.icon('info')}<div>This is a demo setting. Changing it updates the merchant's commission label across the admin workspace.</div></div>
      </form>`,
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Save commission</button>',
      onMount(root, close) {
        root.querySelector('[data-save]').addEventListener('click', () => {
          const form = root.querySelector('[data-commission-form]');
          const input = form.querySelector('input[name="commission"]');
          const val = Number(input.value);
          if (!Number.isFinite(val) || val < 0 || val > 25) {
            input.closest('.field').classList.add('is-invalid');
            const err = input.closest('.field').querySelector('.error-text');
            err.textContent = 'Enter a rate between 0 and 25%.'; err.hidden = false;
            input.focus();
            return;
          }
          m.commission = Math.round(val * 10) / 10;
          S.save('merchant:commission');
          S.log(actor, 'admin', `Set ${m.name} commission to ${m.commission}%`, m.name, 'merchant');
          UI.toast('Commission updated', `${m.name} · ${m.commission}%`, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  function merchantDrawer(id, ctx) {
    const m = S.merchant(id);
    if (!m) return;
    const parcels = S.merchantParcels(id);
    const delivered = parcels.filter((p) => p.statusKey === 'delivered');
    UI.drawer({
      title: m.name,
      subtitle: `${m.owner} · ${m.district} · ${m.businessType}`,
      size: 'wide',
      body: `
        <div class="between mb-4 wrap gap-2"><div class="inline-list"><span class="badge badge-neutral">${UI.esc(m.plan)} plan</span><span class="badge badge-neutral">${m.commission}% commission</span></div>${UI.userBadge(m.status)}</div>
        <div class="grid g-3 mb-4" style="gap:10px">
          <div class="card card-pad"><div class="tiny muted">Total parcels</div><div class="strong num" style="font-size:20px">${parcels.length}</div></div>
          <div class="card card-pad"><div class="tiny muted">Delivered</div><div class="strong num" style="font-size:20px">${delivered.length}</div></div>
          <div class="card card-pad"><div class="tiny muted">COD collected</div><div class="strong num" style="font-size:20px">${money(delivered.reduce((x, p) => x + p.cod, 0))}</div></div>
        </div>
        <div class="card card-pad mb-4"><div class="kv-grid">
          <div class="kv"><div class="k">Email</div><div class="v">${UI.esc(m.email)}</div></div>
          <div class="kv"><div class="k">Phone</div><div class="v">${UI.esc(m.phone)}</div></div>
          <div class="kv"><div class="k">Business address</div><div class="v">${UI.esc(m.address)}</div></div>
          <div class="kv"><div class="k">Pickup address</div><div class="v">${UI.esc(m.store.pickupAddress)}</div></div>
          <div class="kv"><div class="k">Available balance</div><div class="v num">${money(m.balance)}</div></div>
          <div class="kv"><div class="k">Pending settlement</div><div class="v num">${money(m.pending)}</div></div>
          <div class="kv"><div class="k">Joined</div><div class="v">${UI.date(m.createdAt)}</div></div>
          <div class="kv"><div class="k">Store subdomain</div><div class="v mono tiny">${UI.esc(m.store.subdomain)}</div></div>
        </div></div>
        <div class="detail-section"><div class="ds-head"><h4>Recent parcels</h4><a class="link tiny" href="#/parcels">All parcels</a></div>
          <div class="table-wrap"><table class="table table-compact"><thead><tr><th>Tracking</th><th>Status</th><th class="cell-num">COD</th></tr></thead>
          <tbody>${parcels.slice(0, 6).map((p) => `<tr><td class="mono tiny">${p.tracking}</td><td>${UI.statusBadge(p.statusKey, { short: true })}</td><td class="cell-num tiny">${money(p.cod)}</td></tr>`).join('') || `<tr><td colspan="3">${UI.empty({ icon: 'ph-package', title: 'No parcels yet' })}</td></tr>`}</tbody></table></div>
        </div>`,
      footer: `
        <button class="btn btn-sm" data-close>Close</button><span class="grow"></span>
        ${m.status === 'pending' ? `<button class="btn btn-sm btn-danger-soft" data-reject>Reject</button><button class="btn btn-sm btn-primary" data-approve>Approve merchant</button>` : ''}
        ${m.status === 'active' ? `<button class="btn btn-sm btn-danger-soft" data-suspend>Suspend</button>` : ''}
        ${m.status === 'suspended' ? `<button class="btn btn-sm btn-primary" data-reactivate>Reactivate</button>` : ''}`,
      onMount(root, close) {
        const bind = (sel, fn) => { const b = root.querySelector(sel); if (b) b.addEventListener('click', fn); };
        bind('[data-approve]', () => { S.setMerchantStatus(m.id, 'active', { actor }); UI.toast('Merchant approved', m.name, 'success'); close(); ctx.refresh(); });
        bind('[data-reactivate]', () => { S.setMerchantStatus(m.id, 'active', { actor }); UI.toast('Merchant reactivated', m.name, 'success'); close(); ctx.refresh(); });
        bind('[data-suspend]', async () => {
          const ok = await UI.confirm({ title: 'Suspend merchant?', body: `${m.name} will lose access to the merchant workspace.`, confirmText: 'Suspend', danger: true });
          if (!ok) return; S.setMerchantStatus(m.id, 'suspended', { actor }); UI.toast('Merchant suspended', m.name, 'warn'); close(); ctx.refresh();
        });
        bind('[data-reject]', async () => {
          const ok = await UI.confirm({ title: 'Reject application?', body: `${m.name} will be marked rejected.`, confirmText: 'Reject', danger: true });
          if (!ok) return; S.setMerchantStatus(m.id, 'rejected', { actor }); close(); ctx.refresh();
        });
      }
    });
  }

  /* ---------------------------------------------------------------- parcels */
  function renderParcels(el, ctx) {
    const rows = S.state.parcels.slice();
    el.innerHTML = `
      ${App.pageHead({ title: 'Parcel management', sub: `${UI.num(rows.length)} parcels across ${S.state.merchants.length} merchants and ${S.state.branches.length} hubs.`, actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button><a class="btn btn-sm" href="#/returns">${UI.icon('arrow-u-up-left')} Returns</a>` })}
      <div class="row gap-2 wrap mb-4">
        <span class="badge badge-neutral badge-lg">All <strong>${rows.length}</strong></span>
        <span class="badge badge-info badge-lg">In transit <strong>${rows.filter((p) => p.status >= 2 && p.status <= 7).length}</strong></span>
        <span class="badge badge-success badge-lg">Delivered <strong>${rows.filter((p) => p.statusKey === 'delivered').length}</strong></span>
        <span class="badge badge-warn badge-lg">Failed <strong>${rows.filter((p) => p.statusKey === 'failed').length}</strong></span>
        <span class="badge badge-danger badge-lg">Returns <strong>${rows.filter((p) => [10, 11].includes(p.status)).length}</strong></span>
      </div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'All parcels',
      searchPlaceholder: 'Search tracking, customer, merchant…',
      searchFields: ['tracking', 'merchantName', 'customer', (r) => r.customer.name, (r) => r.customer.phone],
      pageSize: 12,
      filters: [
        { key: 'statusKey', label: 'Status', options: ZR.STATUSES.map((s) => ({ value: s.key, label: s.label })) },
        { key: 'merchantId', label: 'Merchant', options: S.state.merchants.slice(0, 14).map((m) => ({ value: m.id, label: m.name })) }
      ],
      defaultSort: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      columns: [
        { key: 'tracking', label: 'Tracking', render: (p) => `<span class="tracking-code">${p.tracking}</span>` },
        { key: 'merchantName', label: 'Merchant', render: (p) => `<div class="tiny strong">${UI.esc(p.merchantName)}</div><div class="tiny faint">${UI.esc(p.customer.district)}</div>` },
        { key: 'customer', label: 'Receiver', render: (p) => `<div class="tiny">${UI.esc(p.customer.name)}</div><div class="tiny muted">${UI.esc(p.customer.phone)}</div>` },
        { key: 'statusKey', label: 'Status', render: (p) => UI.statusBadge(p.statusKey, { short: true }) },
        { key: 'route', label: 'Route', render: (p) => {
          const o = S.branch(p.originBranchId), d = S.branch(p.destBranchId);
          return `<div class="tiny mono">${o ? o.code : '—'} → ${d ? d.code : '—'}</div><div class="tiny faint">${p.riderId ? UI.esc((S.rider(p.riderId) || {}).name) : 'no rider'}</div>`;
        } },
        { key: 'cod', label: 'COD', align: 'right', render: (p) => `<span class="num">${money(p.cod)}</span>` },
        { key: 'createdAt', label: 'Created', render: (p) => `<span class="tiny muted">${UI.date(p.createdAt)}</span>`, sortValue: (p) => new Date(p.createdAt).getTime() }
      ],
      rowMenu: (p) => [
        { label: 'Open parcel', icon: 'eye', onClick: () => parcelDrawer(p.id, ctx) },
        { label: 'Assign origin branch', icon: 'warehouse', onClick: () => assignBranchModal(p.id, ctx) },
        { label: 'Assign rider', icon: 'moped', onClick: () => assignRiderModal(p.id, ctx) },
        { label: 'Copy tracking', icon: 'copy', onClick: () => UI.copy(p.tracking, 'Tracking copied') },
        { sep: true },
        { label: 'Mark delivered', icon: 'check-circle', hidden: p.statusKey === 'delivered', onClick: () => { S.adminSetStatus(p.id, 'delivered', { actor, note: 'Marked delivered by admin' }); UI.toast('Parcel delivered', p.tracking, 'success'); ctx.refresh(); } }
      ],
      onRow: (p) => parcelDrawer(p.id, ctx)
    });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-all-parcels.csv', rows, [
      { key: 'tracking', label: 'Tracking' }, { key: 'merchantName', label: 'Merchant' },
      { key: 'customer', label: 'Customer', value: (p) => p.customer.name },
      { key: 'phone', label: 'Phone', value: (p) => p.customer.phone },
      { key: 'district', label: 'District', value: (p) => p.customer.district },
      { key: 'status', label: 'Status', value: (p) => ZR.statusMeta(p.statusKey).label },
      { key: 'cod', label: 'COD' }, { key: 'charge', label: 'Charge', value: (p) => p.deliveryCharge }
    ]));
  }

  function assignBranchModal(id, ctx) {
    const p = S.parcel(id);
    UI.modal({
      title: 'Assign origin branch',
      subtitle: p.tracking,
      body: `<div class="field"><label class="label">Origin branch</label><select class="select" name="branch">${S.state.branches.map((b) => `<option value="${b.id}" ${p.originBranchId === b.id ? 'selected' : ''}>${b.code} · ${UI.esc(b.name)} — ${UI.esc(b.district)}</option>`).join('')}</select></div>
        <p class="tiny faint mt-3">${UI.icon('info')} The parcel will appear in this branch’s incoming queue immediately.</p>`,
      footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Assign branch</button>',
      onMount(root, close) {
        root.querySelector('[data-save]').addEventListener('click', () => {
          const branchId = root.querySelector('[name="branch"]').value;
          S.assignBranch(p.id, branchId, { actor });
          UI.toast('Branch assigned', `${p.tracking} → ${S.branch(branchId).code}`, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  function assignRiderModal(id, ctx) {
    const p = S.parcel(id);
    const dest = S.branch(p.destBranchId) || S.branchForDistrict(p.customer.district);
    const riders = S.state.riders.filter((r) => r.status === 'active' && (!dest || r.branchId === dest.id));
    UI.modal({
      title: 'Assign delivery rider',
      subtitle: `${p.tracking} · ${p.customer.upazila}, ${p.customer.district}`,
      body: riders.length ? `<div class="field"><label class="label">Rider at ${UI.esc(dest ? dest.code : 'destination hub')}</label>
        <select class="select" name="rider">${riders.map((r) => `<option value="${r.id}" ${p.riderId === r.id ? 'selected' : ''}>${UI.esc(r.name)} · ${UI.esc(r.zone)} · Rating ${r.rating}</option>`).join('')}</select></div>
        <div class="alert info mt-4">${UI.icon('info')}<div>The rider’s task list updates immediately and the parcel status becomes “Assigned to Rider”.</div></div>`
        : UI.empty({ icon: 'ph-moped', title: 'No riders at this hub', body: 'Assign a different destination branch or add a rider first.' }),
      footer: riders.length ? '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Assign rider</button>' : '<button class="btn" data-close>Close</button>',
      onMount(root, close) {
        const save = root.querySelector('[data-save]');
        if (save) save.addEventListener('click', () => {
          const riderId = root.querySelector('[name="rider"]').value;
          S.assignRider(p.id, riderId, { actor });
          UI.toast('Rider assigned', `${p.tracking} → ${S.rider(riderId).name}`, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  /* ---------------------------------------------------------------- branches */
  function renderBranches(el, ctx) {
    const rows = S.state.branches;
    el.innerHTML = `
      ${App.pageHead({ title: 'Branch network', sub: 'Hubs receive, sort and dispatch parcels. Performance is calculated from live demo data.', actions: `<button class="btn btn-sm btn-primary" data-add>${UI.icon('plus')} Add branch</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Active hubs', value: UI.num(rows.filter((b) => b.active).length), icon: 'warehouse', foot: `${rows.length} total branches` })}
        ${kpi({ label: 'Parcels in hubs', value: UI.num(S.state.parcels.filter((p) => [3, 4, 5].includes(p.status)).length), icon: 'stack', tone: 'warn', foot: 'awaiting movement' })}
        ${kpi({ label: 'Branch staff', value: UI.num(rows.reduce((s, b) => s + b.staff, 0)), icon: 'users', tone: 'violet', foot: 'across the network' })}
        ${kpi({ label: 'In transit', value: UI.num(S.state.parcels.filter((p) => p.status === 4).length), icon: 'truck', tone: 'sky', foot: 'between hubs' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>All branches</h3><p class="sub">Operational status and throughput</p></div><span class="badge badge-success"><i class="dot"></i>${rows.filter((b) => b.active).length} online</span></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Branch</th><th>District</th><th>Manager</th><th class="cell-num">Staff</th><th class="cell-num">Parcels</th><th class="cell-num">Delivered</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map((b) => {
            const bp = S.state.parcels.filter((p) => p.originBranchId === b.id || p.destBranchId === b.id);
            const delivered = bp.filter((p) => p.statusKey === 'delivered').length;
            return `<tr data-branch="${b.id}">
              <td><div class="cell-strong">${UI.esc(b.name)}</div><div class="tiny mono faint">${b.code}</div></td>
              <td class="tiny">${UI.esc(b.district)}<div class="tiny faint">${UI.esc(b.thana)}</div></td>
              <td class="tiny">${UI.esc(b.manager)}<div class="tiny faint">${UI.esc(b.phone)}</div></td>
              <td class="cell-num">${b.staff}</td>
              <td class="cell-num">${bp.length}</td>
              <td class="cell-num">${delivered}</td>
              <td>${b.active ? UI.userBadge('active') : UI.userBadge('suspended')}</td>
              <td class="cell-actions"><button class="icon-btn sm" data-edit="${b.id}" aria-label="Edit branch">${UI.icon('pencil-simple')}</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;

    const branchModal = (branch) => {
      UI.modal({
        title: branch ? 'Edit branch' : 'Add branch',
        size: 'wide',
        body: `<form data-branch-form class="form-grid">
          <div class="field"><label class="label">Branch code</label><input class="input mono" name="code" value="${branch ? UI.esc(branch.code) : ''}" placeholder="DHK-03"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Branch name</label><input class="input" name="name" value="${branch ? UI.esc(branch.name) : ''}" placeholder="Uttara Hub"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">District</label><select class="select" name="district">${UI.districtOptions(branch ? branch.district : 'Dhaka')}</select></div>
          <div class="field"><label class="label">Thana / area</label><input class="input" name="thana" value="${branch ? UI.esc(branch.thana) : ''}" placeholder="Uttara"></div>
          <div class="field"><label class="label">Manager</label><input class="input" name="manager" value="${branch ? UI.esc(branch.manager) : ''}" placeholder="Manager name"></div>
          <div class="field"><label class="label">Phone</label><input class="input" name="phone" value="${branch ? UI.esc(branch.phone) : ''}" placeholder="+8801…"></div>
          <div class="field"><label class="label">Staff count</label><input class="input" type="number" name="staff" value="${branch ? branch.staff : 6}" min="1"></div>
          <div class="field"><label class="label">Daily capacity</label><input class="input" type="number" name="capacity" value="${branch ? branch.capacity : 800}" min="50"></div>
          <div class="field full"><label class="label">Address</label><input class="input" name="address" value="${branch ? UI.esc(branch.address) : ''}" placeholder="Street, area"></div>
        </form>`,
        footer: `${branch ? '<button class="btn btn-danger-soft" data-deactivate>Deactivate</button>' : ''}<span class="grow"></span><button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>${branch ? 'Save branch' : 'Create branch'}</button>`,
        onMount(root, close) {
          const de = root.querySelector('[data-deactivate]');
          if (de) de.addEventListener('click', async () => {
            const ok = await UI.confirm({ title: 'Deactivate branch?', body: `${branch.name} will stop receiving new parcel assignments. Existing parcels keep their records.`, confirmText: 'Deactivate', danger: true });
            if (!ok) return;
            S.saveBranch({ id: branch.id, active: !branch.active }, { actor });
            UI.toast(branch.active ? 'Branch deactivated' : 'Branch reactivated', branch.code, 'info');
            close(); ctx.refresh();
          });
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-branch-form]');
            if (!UI.validate(form, { code: [UI.validators.required], name: [UI.validators.required], manager: [UI.validators.required], phone: [UI.validators.phone] })) return;
            const fd = new FormData(form);
            S.saveBranch({ id: branch ? branch.id : undefined, code: fd.get('code'), name: fd.get('name'), district: fd.get('district'), thana: fd.get('thana'), manager: fd.get('manager'), phone: fd.get('phone'), staff: fd.get('staff'), capacity: fd.get('capacity'), address: fd.get('address'), active: branch ? branch.active : true }, { actor });
            UI.toast(branch ? 'Branch updated' : 'Branch created', fd.get('name'), 'success');
            close(); ctx.refresh();
          });
        }
      });
    };
    el.querySelector('[data-add]').addEventListener('click', () => branchModal(null));
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => branchModal(S.branch(b.dataset.edit))));
  }

  /* ------------------------------------------------------------------ riders */
  function renderRiders(el, ctx) {
    const rows = S.state.riders;
    el.innerHTML = `
      ${App.pageHead({ title: 'Delivery agents', sub: 'Riders assigned to hubs, with zones, ratings and delivery performance.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button><button class="btn btn-sm btn-primary" data-add>${UI.icon('plus')} Add rider</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Active riders', value: UI.num(rows.filter((r) => r.status === 'active').length), icon: 'moped', foot: `${rows.length} total` })}
        ${kpi({ label: 'Deliveries completed', value: UI.num(rows.reduce((s, r) => s + r.deliveries, 0)), icon: 'check-circle', tone: 'success', foot: 'lifetime demo' })}
        ${kpi({ label: 'Average rating', value: (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(2), icon: 'star', tone: 'warn', foot: 'out of 5.0' })}
        ${kpi({ label: 'Rider earnings', value: money(rows.reduce((s, r) => s + r.earnings, 0)), icon: 'wallet', tone: 'violet', foot: 'current cycle' })}
      </div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Riders',
      searchPlaceholder: 'Search rider, phone or zone…',
      searchFields: ['name', 'phone', 'zone'],
      pageSize: 10,
      filters: [
        { key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'on_leave', label: 'On leave' }, { value: 'suspended', label: 'Suspended' }] },
        { key: 'branchId', label: 'Hub', options: S.state.branches.map((b) => ({ value: b.id, label: b.code })) }
      ],
      columns: [
        { key: 'name', label: 'Rider', render: (r) => `<div class="user-cell"><span class="avatar sm">${UI.initials(r.name)}</span><div><div class="name">${UI.esc(r.name)}</div><div class="meta">${UI.esc(r.phone)}</div></div></div>` },
        { key: 'branchId', label: 'Hub', render: (r) => `<span class="badge badge-neutral mono">${UI.esc((S.branch(r.branchId) || {}).code || '—')}</span>` },
        { key: 'zone', label: 'Zone', render: (r) => `<span class="tiny">${UI.esc(r.zone)}</span><div class="tiny faint">${UI.esc(r.vehicle)}</div>` },
        { key: 'deliveries', label: 'Deliveries', align: 'right', render: (r) => `<span class="num">${UI.num(r.deliveries)}</span>` },
        { key: 'successRate', label: 'Success', align: 'right', render: (r) => `<span class="num">${r.successRate}%</span>` },
        { key: 'rating', label: 'Rating', align: 'right', render: (r) => `<span class="num">${UI.icon('star', '')} ${r.rating}</span>` },
        { key: 'status', label: 'Status', render: (r) => UI.userBadge(r.status) }
      ],
      rowMenu: (r) => [
        { label: 'Edit rider', icon: 'pencil-simple', onClick: () => riderModal(r) },
        { label: 'Suspend', icon: 'prohibit', danger: true, hidden: r.status === 'suspended', onClick: async () => {
          const ok = await UI.confirm({ title: 'Suspend rider?', body: `${r.name} will stop receiving new delivery assignments.`, confirmText: 'Suspend rider', danger: true });
          if (!ok) return;
          S.saveRider({ id: r.id, status: 'suspended' }, { actor });
          UI.toast('Rider suspended', r.name, 'warn'); ctx.refresh();
        } },
        { label: 'Reactivate', icon: 'check-circle', hidden: r.status !== 'suspended', onClick: () => { S.saveRider({ id: r.id, status: 'active' }, { actor }); UI.toast('Rider reactivated', r.name, 'success'); ctx.refresh(); } }
      ],
      onRow: (r) => riderModal(r)
    });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-riders.csv', rows, [
      { key: 'name', label: 'Rider' }, { key: 'phone', label: 'Phone' }, { key: 'zone', label: 'Zone' },
      { key: 'hub', label: 'Hub', value: (r) => (S.branch(r.branchId) || {}).code },
      { key: 'deliveries', label: 'Deliveries' }, { key: 'successRate', label: 'Success %' },
      { key: 'rating', label: 'Rating' }, { key: 'status', label: 'Status' }
    ]));

    function riderModal(rider) {
      UI.modal({
        title: rider ? 'Edit rider' : 'Add rider',
        size: 'wide',
        body: `<form data-rider-form class="form-grid">
          <div class="field"><label class="label">Name</label><input class="input" name="name" value="${rider ? UI.esc(rider.name) : ''}" placeholder="Full name"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Phone</label><input class="input" name="phone" value="${rider ? UI.esc(rider.phone) : ''}" placeholder="+8801…"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Hub</label><select class="select" name="branchId">${S.state.branches.map((b) => `<option value="${b.id}" ${rider && rider.branchId === b.id ? 'selected' : ''}>${b.code} · ${UI.esc(b.name)}</option>`).join('')}</select></div>
          <div class="field"><label class="label">Zone</label><input class="input" name="zone" value="${rider ? UI.esc(rider.zone) : ''}" placeholder="e.g. Mirpur–Kazipara"></div>
          <div class="field"><label class="label">Vehicle</label><select class="select" name="vehicle">${['Motorcycle', 'E-bike', 'Bicycle'].map((v) => `<option ${rider && rider.vehicle === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="field"><label class="label">Status</label><select class="select" name="status">${[['active', 'Active'], ['on_leave', 'On leave'], ['suspended', 'Suspended']].map(([v, l]) => `<option value="${v}" ${rider && rider.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Save rider</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-rider-form]');
            if (!UI.validate(form, { name: [UI.validators.required], phone: [UI.validators.required, UI.validators.phone], zone: [UI.validators.required] })) return;
            const fd = new FormData(form);
            const saved = S.saveRider({
              id: rider ? rider.id : undefined, name: fd.get('name'), phone: fd.get('phone'),
              branchId: fd.get('branchId'), zone: fd.get('zone'), vehicle: fd.get('vehicle'),
              status: fd.get('status'), rating: rider ? rider.rating : 4.5,
              deliveries: rider ? rider.deliveries : 0, successRate: rider ? rider.successRate : 0,
              earnings: rider ? rider.earnings : 0, joined: rider ? rider.joined : new Date().toISOString()
            }, { actor });
            UI.toast(rider ? 'Rider updated' : 'Rider added', saved.name, 'success');
            close(); ctx.refresh();
          });
        }
      });
    }
    el.querySelector('[data-add]').addEventListener('click', () => riderModal(null));
  }

  /* ----------------------------------------------------------------- pickups */
  function renderPickups(el, ctx) {
    const rows = S.state.pickups.slice();
    el.innerHTML = `
      ${App.pageHead({ title: 'Pickup management', sub: 'Requests raised by merchants, and rider assignment for collection.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Pending pickups', value: UI.num(rows.filter((p) => p.status === 'pending').length), icon: 'hand-arrow-up', tone: 'warn', foot: 'need a rider' })}
        ${kpi({ label: 'Scheduled', value: UI.num(rows.filter((p) => p.status === 'scheduled').length), icon: 'calendar-check', tone: 'sky', foot: 'confirmed windows' })}
        ${kpi({ label: 'Collected', value: UI.num(rows.filter((p) => p.status === 'picked').length), icon: 'check-circle', tone: 'success', foot: 'picked up' })}
        ${kpi({ label: 'Parcels to collect', value: UI.num(rows.reduce((s, p) => s + p.parcelCount, 0)), icon: 'package', foot: 'across bookings' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Pickup requests</h3><p class="sub">Assign a rider or mark as collected</p></div></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Booking</th><th>Merchant</th><th>Window</th><th class="cell-num">Parcels</th><th>Rider</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map((p) => `<tr>
            <td><div class="cell-strong mono">${p.id.toUpperCase()}</div><div class="tiny muted truncate" style="max-width:240px">${UI.esc(p.address)}</div></td>
            <td class="tiny">${UI.esc(p.merchantName || (S.merchant(p.merchantId) || {}).name || 'Merchant')}</td>
            <td><div class="tiny">${UI.date(p.date)}</div><div class="tiny faint">${UI.esc(p.window)}</div></td>
            <td class="cell-num">${p.parcelCount}</td>
            <td class="tiny">${p.riderId ? UI.esc((S.rider(p.riderId) || {}).name) : '<span class="faint">Unassigned</span>'}</td>
            <td>${UI.userBadge(p.status)}</td>
            <td class="cell-actions"><button class="btn btn-sm" data-assign="${p.id}">${UI.icon('moped')} Assign</button></td>
          </tr>`).join('') || `<tr><td colspan="7">${UI.empty({ icon: 'ph-hand-arrow-up', title: 'No pickup requests', body: 'Merchant pickup requests appear here.' })}</td></tr>`}</tbody>
        </table></div>
      </div>`;

    el.querySelectorAll('[data-assign]').forEach((b) => b.addEventListener('click', () => {
      const pk = rows.find((x) => x.id === b.dataset.assign);
      UI.modal({
        title: 'Assign pickup rider',
        subtitle: pk.id.toUpperCase() + ' · ' + pk.window,
        body: `<div class="field"><label class="label">Rider</label><select class="select" name="rider">${S.state.riders.filter((r) => r.status === 'active').map((r) => `<option value="${r.id}" ${pk.riderId === r.id ? 'selected' : ''}>${UI.esc(r.name)} · ${UI.esc((S.branch(r.branchId) || {}).code || '')}</option>`).join('')}</select></div>
        <label class="checkbox mt-4"><input type="checkbox" name="collected"><span>Mark pickup as collected now</span></label>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Assign rider</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const riderId = root.querySelector('[name="rider"]').value;
            pk.riderId = riderId;
            pk.status = root.querySelector('[name="collected"]').checked ? 'picked' : 'scheduled';
            S.notify({ audience: riderId, title: 'Pickup assigned', body: `${pk.id.toUpperCase()} · ${pk.parcelCount} parcels · ${pk.window}`, tone: 'info', icon: 'ph-hand-arrow-up', link: '#/pickups' });
            S.log(actor, 'admin', `Assigned pickup ${pk.id} to ${S.rider(riderId).name}`, pk.id, 'pickup');
            S.save('pickup:assign');
            UI.toast('Pickup assigned', `${pk.id.toUpperCase()} → ${S.rider(riderId).name}`, 'success');
            close(); ctx.refresh();
          });
        }
      });
    }));
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-pickups.csv', rows, [
      { key: 'id', label: 'Booking' }, { key: 'merchantName', label: 'Merchant' },
      { key: 'parcelCount', label: 'Parcels' }, { key: 'window', label: 'Window' },
      { key: 'status', label: 'Status' }, { key: 'date', label: 'Date', value: (p) => UI.date(p.date) }
    ]));
  }

  /* ----------------------------------------------------------------- returns */
  function renderReturns(el, ctx) {
    const rows = S.state.parcels.filter((p) => [9, 10, 11].includes(p.status));
    el.innerHTML = `
      ${App.pageHead({ title: 'Returns management', sub: 'Failed delivery reasons, retries and return processing across the network.', actions: `<a class="btn btn-sm" href="#/parcels">All parcels</a>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Failed deliveries', value: UI.num(rows.filter((p) => p.statusKey === 'failed').length), icon: 'x-circle', tone: 'danger', foot: 'retry available' })}
        ${kpi({ label: 'Return initiated', value: UI.num(rows.filter((p) => p.statusKey === 'return_initiated').length), icon: 'arrow-u-up-left', tone: 'warn', foot: 'in return flow' })}
        ${kpi({ label: 'Returned', value: UI.num(rows.filter((p) => p.statusKey === 'returned').length), icon: 'arrow-counter-clockwise', foot: 'back with merchant' })}
        ${kpi({ label: 'Network return rate', value: S.statsAdmin().returnsRate + '%', icon: 'percent', tone: 'sky', foot: 'of all parcels' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Return queue</h3><p class="sub">${rows.length} parcels in the failed / return flow</p></div><span class="badge badge-warn">${UI.icon('warning')} Requires review</span></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Tracking</th><th>Merchant</th><th>Customer</th><th>Reason</th><th>Status</th><th class="cell-num">COD</th><th></th></tr></thead>
          <tbody>${rows.length ? rows.map((p) => `<tr>
            <td><span class="tracking-code">${p.tracking}</span></td>
            <td class="tiny">${UI.esc(p.merchantName)}</td>
            <td class="tiny">${UI.esc(p.customer.name)}<div class="tiny faint">${UI.esc(p.customer.upazila)}</div></td>
            <td class="tiny muted" style="max-width:220px">${UI.esc(p.returnReason || 'Delivery attempt failed')}<div class="tiny faint">${p.attempts} attempt(s)</div></td>
            <td>${UI.statusBadge(p.statusKey, { short: true })}</td>
            <td class="cell-num">${money(p.cod)}</td>
            <td class="cell-actions">
              ${p.statusKey === 'failed' ? `<button class="btn btn-sm" data-retry="${p.id}">${UI.icon('arrows-clockwise')} Retry</button>` : ''}
              ${p.statusKey === 'return_initiated' ? `<button class="btn btn-sm" data-received="${p.id}">${UI.icon('check')} Mark returned</button>` : ''}
              <button class="icon-btn sm" data-view="${p.id}" aria-label="Open parcel">${UI.icon('eye')}</button>
            </td>
          </tr>`).join('') : `<tr><td colspan="7">${UI.empty({ icon: 'ph-check-circle', title: 'No returns', body: 'All parcels are moving without failed attempts.' })}</td></tr>`}</tbody>
        </table></div>
      </div>`;
    el.querySelectorAll('[data-retry]').forEach((b) => b.addEventListener('click', () => {
      const p = S.parcel(b.dataset.retry);
      S.adminSetStatus(p.id, 'assigned', { actor, note: 'Admin requested a second delivery attempt' });
      S.notify({ audience: p.merchantId, title: 'Retry scheduled', body: `${p.tracking} will be attempted again.`, tone: 'info', icon: 'ph-arrows-clockwise', link: '#/parcels' });
      UI.toast('Retry scheduled', p.tracking, 'success');
      ctx.refresh();
    }));
    el.querySelectorAll('[data-received]').forEach((b) => b.addEventListener('click', async () => {
      const p = S.parcel(b.dataset.received);
      const ok = await UI.confirm({ title: 'Mark as returned?', body: `${p.tracking} will be marked returned to the merchant and COD will not be collected.`, confirmText: 'Mark returned' });
      if (!ok) return;
      S.riderAction(p.id, 'mark_returned', { actor });
      UI.toast('Return completed', p.tracking, 'success');
      ctx.refresh();
    }));
    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => parcelDrawer(b.dataset.view, ctx)));
  }

  /* ----------------------------------------------------------------- finance */
  function renderFinance(el, ctx) {
    const s = S.statsAdmin();
    const topMerchants = S.state.merchants.map((m) => {
      const parcels = S.merchantParcels(m.id);
      const delivered = parcels.filter((p) => p.statusKey === 'delivered');
      return { id: m.id, name: m.name, parcels: parcels.length, cod: delivered.reduce((x, p) => x + p.cod, 0), fees: parcels.reduce((x, p) => x + p.deliveryCharge, 0) };
    }).sort((a, b) => b.cod - a.cod).slice(0, 8);
    const txns = S.state.transactions.slice(0, 8);

    el.innerHTML = `
      ${App.pageHead({ title: 'Revenue & COD', sub: 'Platform revenue, merchant COD exposure and settlement activity.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export report</button><a class="btn btn-sm" href="#/withdrawals">${UI.icon('bank')} Withdrawals</a>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Platform revenue', value: money(s.revenue), icon: 'chart-line-up', delta: '+9.2%', foot: 'delivery + COD fees' })}
        ${kpi({ label: 'COD volume', value: money(s.codVolume), icon: 'coins', tone: 'success', foot: 'delivered parcels' })}
        ${kpi({ label: 'Pending payouts', value: money(s.pendingPayments), icon: 'bank', tone: 'warn', foot: 'withdrawal requests' })}
        ${kpi({ label: 'Avg. order value', value: money(Math.round(s.codVolume / Math.max(1, s.delivered))), icon: 'receipt', tone: 'sky', foot: 'per delivered COD parcel' })}
      </div>
      <div class="grid" style="grid-template-columns:1.4fr 1fr;gap:16px" id="financeCharts">
        <div class="card">
          ${panel('Revenue breakdown', 'Delivery fees vs COD collection fees', `<div class="card-body"><div class="chart-box h-280"><canvas id="fRevenue"></canvas></div></div>`, `<div class="segmented"><button class="is-active">6 months</button><button>12 months</button></div>`)}
        </div>
        <div class="card">
          ${panel('Settlement status', 'Current payout cycle', `<div class="card-body">
            <div class="chart-box h-200"><canvas id="fStatus"></canvas></div>
            <div class="divider" style="margin-block:14px"></div>
            <div class="summary-line"><span>Pending requests</span><strong>${S.state.withdrawals.filter((w) => w.status === 'pending').length}</strong></div>
            <div class="summary-line"><span>Approved this cycle</span><strong>${S.state.withdrawals.filter((w) => w.status === 'approved').length}</strong></div>
            <a class="btn btn-sm btn-soft btn-block mt-3" href="#/withdrawals">Review withdrawals</a>
          </div>`)}
        </div>
      </div>
      <div class="grid mt-4" style="grid-template-columns:1.4fr 1fr;gap:16px" id="financeLower">
        <div class="card">
          ${panel('Top merchants by COD', 'Delivered COD volume in the demo dataset', `<div class="table-wrap"><table class="table table-compact">
            <thead><tr><th>Merchant</th><th class="cell-num">Parcels</th><th class="cell-num">COD volume</th><th class="cell-num">Delivery fees</th></tr></thead>
            <tbody>${topMerchants.map((m) => `<tr><td><div class="cell-strong">${UI.esc(m.name)}</div></td><td class="cell-num">${m.parcels}</td><td class="cell-num">${money(m.cod)}</td><td class="cell-num">${money(m.fees)}</td></tr>`).join('')}</tbody>
          </table></div>`, `<a class="link tiny" href="#/merchants">All merchants ${UI.icon('arrow-right')}</a>`)}
        </div>
        <div class="card">
          ${panel('Latest transactions', 'Network-wide ledger', `<div class="card-body" style="padding:8px 16px"><div class="stack" style="gap:0">${txns.map((t) => `<div class="between gap-2" style="padding:9px 0;border-bottom:1px solid var(--line-soft)">
            <div style="min-width:0"><div class="tiny strong truncate">${UI.esc((S.merchant(t.merchantId) || {}).name || 'Merchant')}</div><div class="tiny faint mono">${UI.esc(t.reference)}</div></div>
            <div class="text-right"><div class="tiny num" style="color:${t.amount < 0 ? 'var(--muted)' : 'var(--success)'}">${t.amount < 0 ? '−' : '+'}${money(Math.abs(t.amount))}</div><div class="tiny faint">${UI.relative(t.date)}</div></div>
          </div>`).join('')}</div></div>`, `<a class="link tiny" href="#/transactions">Ledger ${UI.icon('arrow-right')}</a>`)}
        </div>
      </div>`;

    if (document.getElementById('fRevenue')) {
      ZR.charts.areaLine('fRevenue', {
        labels: s.revenueMonths.map((m) => m.label),
        series: [
          { label: 'Delivery fees', data: s.revenueMonths.map((m) => m.delivery) },
          { label: 'COD fees', data: s.revenueMonths.map((m) => m.cod), color: ZR.charts.tokens().violet, fill: false }
        ],
        yFormatter: (v) => money(v)
      });
    }
    if (document.getElementById('fStatus')) {
      ZR.charts.doughnut('fStatus', {
        labels: ['Pending', 'Approved', 'Rejected'],
        data: [
          S.state.withdrawals.filter((w) => w.status === 'pending').length,
          S.state.withdrawals.filter((w) => w.status === 'approved').length,
          S.state.withdrawals.filter((w) => w.status === 'rejected').length
        ],
        colors: [ZR.charts.tokens().warn, ZR.charts.tokens().success, ZR.charts.tokens().danger],
        centerLabel: UI.num(S.state.withdrawals.length), centerSub: 'requests'
      });
    }
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-revenue-report.csv', s.revenueMonths, [
      { key: 'label', label: 'Month' }, { key: 'delivery', label: 'Delivery fees' },
      { key: 'cod', label: 'COD fees' }, { key: 'total', label: 'Total' }
    ]));
  }

  /* ------------------------------------------------------------- withdrawals */
  function renderWithdrawals(el, ctx) {
    const rows = S.state.withdrawals;
    const pending = rows.filter((w) => w.status === 'pending');
    el.innerHTML = `
      ${App.pageHead({ title: 'Withdrawals', sub: 'Approve or reject merchant payout requests. Approving creates a settled transaction.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Pending approval', value: money(pending.reduce((s, w) => s + w.amount, 0)), icon: 'hourglass', tone: 'warn', foot: `${pending.length} requests` })}
        ${kpi({ label: 'Approved payouts', value: money(rows.filter((w) => w.status === 'approved').reduce((s, w) => s + w.amount, 0)), icon: 'check-circle', tone: 'success', foot: `${rows.filter((w) => w.status === 'approved').length} paid` })}
        ${kpi({ label: 'Rejected', value: UI.num(rows.filter((w) => w.status === 'rejected').length), icon: 'x-circle', tone: 'danger', foot: 'returned to balance' })}
        ${kpi({ label: 'Total requested', value: money(rows.reduce((s, w) => s + w.amount, 0)), icon: 'bank', foot: 'lifetime demo' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Payout requests</h3><p class="sub">Review each request before approving</p></div><span class="badge badge-warn">${pending.length} awaiting</span></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Request</th><th>Merchant</th><th>Method</th><th>Account</th><th>Date</th><th class="cell-num">Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.length ? rows.map((w) => `<tr>
            <td class="mono tiny">${UI.esc(w.id.toUpperCase())}</td>
            <td class="tiny"><div class="cell-strong">${UI.esc(w.merchantName || (S.merchant(w.merchantId) || {}).name || 'Merchant')}</div></td>
            <td class="tiny">${UI.esc(w.method)}</td>
            <td class="tiny muted">${UI.esc(w.account)}</td>
            <td class="tiny muted">${UI.date(w.date)}</td>
            <td class="cell-num cell-strong">${money(w.amount)}</td>
            <td>${UI.userBadge(w.status)}</td>
            <td class="cell-actions">${w.status === 'pending' ? `<div class="row gap-1" style="justify-content:flex-end">
              <button class="btn btn-sm btn-success" data-approve="${w.id}">${UI.icon('check')} Approve</button>
              <button class="icon-btn sm" data-reject="${w.id}" aria-label="Reject">${UI.icon('x')}</button>
            </div>` : `<button class="icon-btn sm" data-view="${w.id}" aria-label="Details">${UI.icon('eye')}</button>`}</td>
          </tr>`).join('') : `<tr><td colspan="8">${UI.empty({ icon: 'ph-bank', title: 'No withdrawal requests', body: 'Merchant requests will appear here.' })}</td></tr>`}</tbody>
        </table></div>
      </div>`;

    el.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', async () => {
      const w = rows.find((x) => x.id === b.dataset.approve);
      const ok = await UI.confirm({ title: 'Approve withdrawal?', body: `Approve <strong>${money(w.amount)}</strong> for ${UI.esc(w.merchantName || (S.merchant(w.merchantId) || {}).name)} via ${UI.esc(w.method)}.<br><br>The merchant balance is already reserved; this creates a settled payout transaction.`, confirmText: 'Approve payout' });
      if (!ok) return;
      S.decideWithdrawal(w.id, 'approved', { actor });
      UI.toast('Withdrawal approved', `${money(w.amount)} · ${w.method}`, 'success');
      ctx.refresh();
    }));
    el.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', async () => {
      const w = rows.find((x) => x.id === b.dataset.reject);
      const ok = await UI.confirm({ title: 'Reject withdrawal?', body: `${money(w.amount)} will be returned to the merchant’s available balance and the merchant is notified.`, confirmText: 'Reject request', danger: true });
      if (!ok) return;
      S.decideWithdrawal(w.id, 'rejected', { actor });
      UI.toast('Withdrawal rejected', 'Amount returned to merchant balance.', 'info');
      ctx.refresh();
    }));
    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      const w = rows.find((x) => x.id === b.dataset.view);
      const m = S.merchant(w.merchantId);
      UI.modal({
        title: 'Withdrawal ' + w.id.toUpperCase(),
        body: `<div class="kv-grid">
          <div class="kv"><div class="k">Merchant</div><div class="v">${UI.esc((m || {}).name || w.merchantName)}</div></div>
          <div class="kv"><div class="k">Amount</div><div class="v num">${money(w.amount)}</div></div>
          <div class="kv"><div class="k">Method</div><div class="v">${UI.esc(w.method)}</div></div>
          <div class="kv"><div class="k">Account</div><div class="v">${UI.esc(w.account)}</div></div>
          <div class="kv"><div class="k">Requested</div><div class="v">${UI.dateTime(w.date)}</div></div>
          <div class="kv"><div class="k">Status</div><div class="v">${UI.userBadge(w.status)}</div></div>
        </div>`,
        footer: '<button class="btn" data-close>Close</button>'
      });
    }));
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-withdrawals.csv', rows, [
      { key: 'id', label: 'Request' }, { key: 'merchantName', label: 'Merchant' },
      { key: 'amount', label: 'Amount' }, { key: 'method', label: 'Method' },
      { key: 'account', label: 'Account' }, { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date', value: (w) => UI.date(w.date) }
    ]));
  }

  /* ----------------------------------------------------------------- pricing */
  function renderPricing(el, ctx) {
    const p = ZR.pricing.settings();
    const sample = ZR.pricing.quote({ type: 'standard', weight: 1, cod: 1500, destination: 'Chattogram' });
    const sample2 = ZR.pricing.quote({ type: 'express', weight: 2.5, cod: 3000, destination: 'Sylhet' });
    el.innerHTML = `
      ${App.pageHead({ title: 'Pricing configuration', sub: 'These values feed the public calculator, the merchant parcel form and every new parcel.', actions: `<span class="badge badge-info"><i class="dot"></i>Live configuration</span>` })}
      <div class="grid" style="grid-template-columns:1.3fr .7fr;gap:16px;align-items:start" id="pricingGrid">
        <form class="card" data-price-form>
          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('receipt')}</span><div><h4>Base charges</h4><p>Applied to every shipment before weight and COD adjustments.</p></div></div>
            <div class="form-grid">
              <div class="field"><label class="label">Base delivery rate (৳)</label><input class="input" type="number" name="base" value="${p.base}" min="0" step="1"><span class="hint">Standard service, first kilogram.</span></div>
              <div class="field"><label class="label">Included weight (kg)</label><input class="input" type="number" name="includedKg" value="${p.includedKg}" min="0" step="0.5"></div>
              <div class="field"><label class="label">Extra weight rate (৳ / kg)</label><input class="input" type="number" name="perKg" value="${p.perKg}" min="0" step="1"></div>
              <div class="field"><label class="label">Remote district surcharge (৳)</label><input class="input" type="number" name="remoteSurcharge" value="${p.remoteSurcharge}" min="0" step="5"></div>
            </div>
          </div>
          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('wallet')}</span><div><h4>COD collection fee</h4><p>Charged on cash-on-delivery parcels only.</p></div></div>
            <div class="form-grid">
              <div class="field"><label class="label">Fee rate (%)</label><input class="input" type="number" name="codRate" value="${p.codRate}" min="0" step="0.1"><span class="hint">Percentage of the COD amount.</span></div>
              <div class="field"><label class="label">Minimum fee (৳)</label><input class="input" type="number" name="codMin" value="${p.codMin}" min="0" step="1"></div>
            </div>
          </div>
          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('lightning')}</span><div><h4>Service multipliers</h4><p>Applied on top of the base delivery rate.</p></div></div>
            <div class="form-grid">
              ${p.types.map((t) => `<div class="field"><label class="label">${UI.esc(t.name)} × base</label>
                <input class="input" type="number" name="mult-${t.id}" value="${t.multiplier}" min="0.1" step="0.1">
                <span class="hint">${UI.esc(t.eta)}</span></div>`).join('')}
            </div>
          </div>
          <div class="card-foot between" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <span class="tiny muted">${UI.icon('warning')} Changes apply to new parcels immediately</span>
            <div class="row gap-2"><button type="button" class="btn btn-sm" data-reset>Reset to defaults</button><button class="btn btn-sm btn-primary" type="submit">${UI.icon('check')} Save pricing</button></div>
          </div>
        </form>

        <div class="stack gap-4">
          <div class="card">
            <div class="card-head" style="padding:14px 16px"><div><h4 style="font-size:var(--text-sm)">Live preview</h4><p class="sub">Recalculated from saved values</p></div></div>
            <div class="card-body">
              <div class="tiny muted">Standard · 1 kg · COD ৳1,500 · Chattogram</div>
              <div class="summary-line"><span>Delivery</span><strong>${money(sample.deliveryCharge)}</strong></div>
              <div class="summary-line"><span>COD fee</span><strong>${money(sample.codCharge)}</strong></div>
              <div class="summary-total summary-line"><span>Total</span><strong>${money(sample.total)}</strong></div>
              <div class="divider" style="margin-block:12px"></div>
              <div class="tiny muted">Express · 2.5 kg · COD ৳3,000 · Sylhet</div>
              <div class="summary-line"><span>Delivery</span><strong>${money(sample2.deliveryCharge)}</strong></div>
              <div class="summary-line"><span>COD fee</span><strong>${money(sample2.codCharge)}</strong></div>
              <div class="summary-total summary-line"><span>Total</span><strong>${money(sample2.total)}</strong></div>
            </div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-plugs-connected"></i> Where this is used</h4>
            <div class="stack gap-2 mt-3 tiny muted" style="line-height:1.5">
              <span>• Public pricing calculator (pricing.html)</span>
              <span>• Landing page estimate widget</span>
              <span>• Merchant new-parcel charge summary</span>
              <span>• Bulk import and CSV validation</span>
            </div>
            <a class="btn btn-sm btn-block mt-3" href="pricing.html" target="_blank" rel="noopener">${UI.icon('arrow-up-right')} Open public calculator</a>
          </div>
        </div>
      </div>`;

    const form = el.querySelector('[data-price-form]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const types = ZR.pricing.types().map((t) => ({ ...t, multiplier: +fd.get('mult-' + t.id) || t.multiplier }));
      S.updatePricing({
        base: +fd.get('base'), includedKg: +fd.get('includedKg'), perKg: +fd.get('perKg'),
        remoteSurcharge: +fd.get('remoteSurcharge'), codRate: +fd.get('codRate'), codMin: +fd.get('codMin'), types
      }, { actor });
      UI.toast('Pricing saved', 'Public calculator and merchant forms now use these rates.', 'success');
      ctx.refresh();
    });
    el.querySelector('[data-reset]').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Reset pricing?', body: 'Restore the original demo rates: ৳60 base, ৳20/kg, 1.2% COD, ৳35 remote surcharge.', confirmText: 'Reset rates' });
      if (!ok) return;
      S.updatePricing({
        base: 60, includedKg: 1, perKg: 20, codRate: 1.2, codMin: 10, remoteSurcharge: 35,
        types: [
          { id: 'standard', name: 'Standard', multiplier: 1, eta: '2–4 business days', desc: 'Reliable nationwide delivery through our branch network.' },
          { id: 'express', name: 'Express', multiplier: 1.6, eta: '24–48 hours', desc: 'Priority handling with next-day delivery to major cities.' },
          { id: 'sameday', name: 'Same-Day', multiplier: 2.4, eta: '6–12 hours', desc: 'Metro-to-metro same-day delivery, order before 11:00 AM.' }
        ]
      }, { actor });
      UI.toast('Pricing reset', 'Default demo rates restored.', 'success');
      ctx.refresh();
    });
  }

  /* ------------------------------------------------------------- service areas */
  function renderAreas(el, ctx) {
    const areas = S.state.areas;
    el.innerHTML = `
      ${App.pageHead({ title: 'Service areas', sub: 'Coverage status for all 64 districts. Changes affect routing warnings and surcharges in the demo.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div class="grid g-3 mb-4" style="gap:12px">
        <div class="card card-pad"><div class="between"><div><div class="tiny muted">Full coverage</div><div class="strong num" style="font-size:20px">${areas.filter((a) => a.service === 'full').length}</div></div><span class="kpi-ico success"><i class="ph ph-check-circle"></i></span></div></div>
        <div class="card card-pad"><div class="between"><div><div class="tiny muted">Restricted / remote</div><div class="strong num" style="font-size:20px">${areas.filter((a) => a.service === 'restricted').length}</div></div><span class="kpi-ico warn"><i class="ph ph-warning"></i></span></div></div>
        <div class="card card-pad"><div class="between"><div><div class="tiny muted">Upazilas mapped</div><div class="strong num" style="font-size:20px">${ZR.DISTRICTS.reduce((s, d) => s + d.upazilas.length, 0)}</div></div><span class="kpi-ico"><i class="ph ph-map-trifold"></i></span></div></div>
      </div>
      <div class="card">
        <div class="card-toolbar table-toolbar"><div class="search-field">${UI.icon('magnifying-glass')}<input type="search" placeholder="Search district or division…" data-search aria-label="Search service areas"></div>
          <select class="select" data-div-filter aria-label="Filter by division" style="width:auto;height:38px;font-size:var(--text-xs)"><option value="">All divisions</option>${[...new Set(areas.map((a) => a.division))].map((d) => `<option>${d}</option>`).join('')}</select>
        </div>
        <div class="table-wrap"><table class="table table-compact">
          <thead><tr><th>District</th><th>Division</th><th class="cell-num">Upazilas</th><th>Hub</th><th>Transit</th><th>Service</th><th></th></tr></thead>
          <tbody data-body></tbody>
        </table></div>
      </div>`;
    const body = el.querySelector('[data-body]');
    let q = '', div = '';
    const paint = () => {
      const rows = areas.filter((a) => (!div || a.division === div) && (!q || a.district.toLowerCase().includes(q) || a.division.toLowerCase().includes(q)));
      body.innerHTML = rows.map((a) => `<tr>
        <td class="cell-strong">${UI.esc(a.district)}</td>
        <td class="tiny muted">${UI.esc(a.division)}</td>
        <td class="cell-num tiny">${a.upazilas}</td>
        <td class="tiny">${UI.esc(a.branch)}</td>
        <td class="tiny muted">${UI.esc(a.avgDays)} days</td>
        <td>${a.service === 'full' ? '<span class="badge badge-success"><i class="dot"></i>Full coverage</span>' : '<span class="badge badge-warn"><i class="dot"></i>Restricted</span>'}</td>
        <td class="cell-actions"><label class="switch" title="Toggle coverage"><input type="checkbox" data-toggle="${UI.esc(a.district)}" ${a.service === 'full' ? 'checked' : ''}><span class="sr-only">Full coverage for ${UI.esc(a.district)}</span></label></td>
      </tr>`).join('') || `<tr><td colspan="7">${UI.empty({ icon: 'ph-map-trifold', title: 'No districts match' })}</td></tr>`;
      body.querySelectorAll('[data-toggle]').forEach((c) => c.addEventListener('change', () => {
        S.setAreaService(c.dataset.toggle, c.checked ? 'full' : 'restricted');
        UI.toast('Coverage updated', `${c.dataset.toggle} → ${c.checked ? 'full coverage' : 'restricted'}`, 'success');
        ctx.refresh();
      }));
    };
    paint();
    el.querySelector('[data-search]').addEventListener('input', UI.debounce((e) => { q = e.target.value.trim().toLowerCase(); paint(); }, 140));
    el.querySelector('[data-div-filter]').addEventListener('change', (e) => { div = e.target.value; paint(); });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-service-areas.csv', areas, [
      { key: 'district', label: 'District' }, { key: 'division', label: 'Division' },
      { key: 'upazilas', label: 'Upazilas' }, { key: 'branch', label: 'Hub' },
      { key: 'avgDays', label: 'Transit days' }, { key: 'service', label: 'Service' }
    ]));
  }

  /* ----------------------------------------------------------------- coupons */
  function renderCoupons(el, ctx) {
    const rows = S.state.coupons;
    el.innerHTML = `
      ${App.pageHead({ title: 'Coupons & promotions', sub: 'Demo promotions applied at merchant checkout. Visual simulation only.', actions: `<button class="btn btn-sm btn-primary" data-add>${UI.icon('plus')} Create coupon</button>` })}
      <div class="grid g-3 mb-5">
        ${kpi({ label: 'Active coupons', value: UI.num(rows.filter((c) => c.status === 'active').length), icon: 'ticket', tone: 'success', foot: 'available now' })}
        ${kpi({ label: 'Redemptions', value: UI.num(rows.reduce((s, c) => s + c.uses, 0)), icon: 'checks', foot: 'demo uses' })}
        ${kpi({ label: 'Best performer', value: rows.slice().sort((a, b) => b.uses - a.uses)[0].code, icon: 'trophy', tone: 'warn', foot: 'by redemption count' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>All coupons</h3><p class="sub">Toggle availability at any time</p></div></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th class="cell-num">Min order</th><th class="cell-num">Used</th><th>Expires</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map((c) => `<tr>
            <td><span class="mono" style="font-weight:700">${UI.esc(c.code)}</span></td>
            <td class="tiny" style="text-transform:capitalize">${UI.esc(c.type.replace('_', ' '))}</td>
            <td class="tiny strong">${c.type === 'percent' ? c.value + '%' : c.type === 'flat' ? money(c.value) : 'Free delivery'}</td>
            <td class="cell-num tiny">${money(c.minOrder)}</td>
            <td class="cell-num tiny">${c.uses}${c.limit ? `<span class="faint"> / ${c.limit}</span>` : ''}</td>
            <td class="tiny muted">${UI.date(c.expires)}</td>
            <td>${UI.userBadge(c.status === 'active' ? 'active' : c.status)}</td>
            <td class="cell-actions"><label class="switch"><input type="checkbox" data-toggle="${c.code}" ${c.status === 'active' ? 'checked' : ''}><span class="sr-only">Toggle ${c.code}</span></label></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;

    el.querySelectorAll('[data-toggle]').forEach((c) => c.addEventListener('change', () => {
      S.toggleCoupon(c.dataset.toggle);
      UI.toast('Coupon updated', `${c.dataset.toggle} is now ${c.checked ? 'active' : 'paused'}.`, 'info');
      ctx.refresh();
    }));
    el.querySelector('[data-add]').addEventListener('click', () => {
      UI.modal({
        title: 'Create coupon',
        body: `<form data-coupon-form class="form-grid">
          <div class="field full"><label class="label">Coupon code</label><input class="input mono" name="code" placeholder="EIDSHIP25" style="text-transform:uppercase"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Type</label><select class="select" name="type"><option value="percent">Percentage off</option><option value="flat">Flat amount off</option><option value="free_delivery">Free delivery</option></select></div>
          <div class="field"><label class="label">Value</label><input class="input" type="number" name="value" value="20" min="0"><span class="hint">Ignored for free delivery.</span></div>
          <div class="field"><label class="label">Minimum order (৳)</label><input class="input" type="number" name="minOrder" value="500" min="0"></div>
          <div class="field"><label class="label">Use limit</label><input class="input" type="number" name="limit" value="200" min="1"></div>
          <div class="field full"><label class="label">Expiry date</label><input class="input" type="date" name="expires" value="${new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)}"></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Create coupon</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-coupon-form]');
            if (!UI.validate(form, { code: [UI.validators.required, (v) => /^[A-Za-z0-9]{4,16}$/.test(v) || 'Use 4–16 letters or numbers.'], value: [(v) => UI.validators.number(v, 0)] })) return;
            const fd = new FormData(form);
            if (S.state.coupons.some((c) => c.code === fd.get('code').toUpperCase())) { UI.toast('Code already exists', 'Choose a different coupon code.', 'error'); return; }
            S.addCoupon({ code: fd.get('code'), type: fd.get('type'), value: fd.get('value'), minOrder: fd.get('minOrder'), limit: fd.get('limit'), expires: fd.get('expires') }, { actor });
            UI.toast('Coupon created', fd.get('code').toUpperCase(), 'success');
            close(); ctx.refresh();
          });
        }
      });
    });
  }

  /* ----------------------------------------------------------------- tickets */
  function renderTickets(el, ctx) {
    const rows = S.state.tickets;
    el.innerHTML = `
      ${App.pageHead({ title: 'Support tickets', sub: 'Merchant support across deliveries, payments and platform issues.', actions: `<span class="badge badge-warn">${rows.filter((t) => t.status === 'open').length} open</span>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Open', value: UI.num(rows.filter((t) => t.status === 'open').length), icon: 'lifebuoy', tone: 'warn', foot: 'awaiting first reply' })}
        ${kpi({ label: 'In progress', value: UI.num(rows.filter((t) => t.status === 'in_progress').length), icon: 'arrows-clockwise', tone: 'sky', foot: 'being handled' })}
        ${kpi({ label: 'Resolved', value: UI.num(rows.filter((t) => ['resolved', 'closed'].includes(t.status)).length), icon: 'check-circle', tone: 'success', foot: 'lifetime' })}
        ${kpi({ label: 'Urgent', value: UI.num(rows.filter((t) => t.priority === 'urgent').length), icon: 'siren', tone: 'danger', foot: 'needs immediate attention' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Ticket queue</h3><p class="sub">Sorted by newest first</p></div></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Subject</th><th>Merchant</th><th>Category</th><th>Priority</th><th>Created</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map((t) => `<tr data-ticket="${t.id}" style="cursor:pointer">
            <td><div class="cell-strong">${UI.esc(t.subject)}</div><div class="tiny faint mono">${t.id.toUpperCase()}</div></td>
            <td class="tiny">${UI.esc((S.merchant(t.merchantId) || {}).name || 'Merchant')}</td>
            <td class="tiny">${UI.esc(t.category)}</td>
            <td>${UI.priorityBadge(t.priority)}</td>
            <td class="tiny muted">${UI.relative(t.createdAt)}</td>
            <td>${UI.userBadge(t.status)}</td>
            <td class="cell-actions">${UI.icon('caret-right')}</td>
          </tr>`).join('') || `<tr><td colspan="7">${UI.empty({ icon: 'ph-lifebuoy', title: 'No tickets', body: 'Support requests will appear here.' })}</td></tr>`}</tbody>
        </table></div>
      </div>`;
    el.querySelectorAll('[data-ticket]').forEach((tr) => tr.addEventListener('click', () => adminTicketDrawer(tr.dataset.ticket, ctx)));
  }

  function adminTicketDrawer(id, ctx) {
    const t = S.state.tickets.find((x) => x.id === id);
    if (!t) return;
    const merchant = S.merchant(t.merchantId);
    UI.drawer({
      title: t.subject,
      subtitle: `${t.id.toUpperCase()} · ${UI.esc((merchant || {}).name || 'Merchant')}`,
      body: `
        <div class="between mb-4 wrap gap-2"><div class="row gap-2">${UI.priorityBadge(t.priority)}${UI.userBadge(t.status)}</div>
          <select class="select" data-status style="width:auto;height:32px;min-height:32px;font-size:var(--text-xs)">${[['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved'], ['closed', 'Closed']].map(([v, l]) => `<option value="${v}" ${t.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div class="stack gap-3">
          ${t.messages.map((m) => `<div class="card card-pad" style="background:${m.by === 'admin' ? 'var(--primary-50)' : 'var(--surface)'}">
            <div class="between mb-2"><span class="tiny strong">${m.by === 'admin' ? 'Zeriour support' : (merchant ? merchant.name : 'Merchant')}</span><span class="tiny faint">${UI.relative(m.at)}</span></div>
            <p class="small" style="line-height:1.65">${UI.esc(m.text)}</p>
          </div>`).join('')}
        </div>
        <div class="field mt-4"><label class="label">Reply as support</label><textarea class="textarea" data-reply rows="3" placeholder="Type your response…"></textarea></div>
        <p class="tiny faint mt-2">${UI.icon('info')} Replying sets the ticket to “In progress” and notifies the merchant.</p>`,
      footer: `<button class="btn" data-close>Close</button><span class="grow"></span><button class="btn btn-primary" data-send>${UI.icon('paper-plane-tilt')} Send reply</button>`,
      onMount(root, close) {
        root.querySelector('[data-status]').addEventListener('change', (e) => {
          S.setTicketStatus(t.id, e.target.value);
          UI.toast('Ticket status updated', e.target.value.replace('_', ' '), 'success');
        });
        root.querySelector('[data-send]').addEventListener('click', () => {
          const val = root.querySelector('[data-reply]').value.trim();
          if (!val) { UI.toast('Reply required', 'Type a response before sending.', 'warn'); return; }
          S.replyTicket(t.id, val, 'admin', { actor });
          UI.toast('Reply sent', 'The merchant has been notified in the demo.', 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  /* ----------------------------------------------------------- announcements */
  function renderAnnouncements(el, ctx) {
    const rows = S.state.announcements;
    el.innerHTML = `
      ${App.pageHead({ title: 'Announcements', sub: 'Broadcast operational notices to merchants, branches or riders.', actions: `<button class="btn btn-sm btn-primary" data-add>${UI.icon('plus')} New announcement</button>` })}
      <div class="grid g-2" style="gap:14px">
        ${rows.map((a) => `<div class="card card-pad">
          <div class="between wrap gap-2 mb-2"><div class="row gap-2"><span class="badge badge-info">${UI.esc(a.audience === 'all' ? 'All roles' : a.audience)}</span><span class="badge badge-success">${UI.esc(a.status)}</span></div><span class="tiny faint">${UI.date(a.date)}</span></div>
          <h4 style="font-size:var(--text-md)">${UI.esc(a.title)}</h4>
          <p class="small muted mt-2" style="line-height:1.6">${UI.esc(a.body)}</p>
          <div class="row gap-2 mt-4"><button class="btn btn-sm" data-toggle="${a.id}">${UI.icon(a.status === 'published' ? 'eye-slash' : 'eye')} ${a.status === 'published' ? 'Unpublish' : 'Publish'}</button><span class="tiny faint">Announcement ID ${a.id}</span></div>
        </div>`).join('')}
      </div>`;

    el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
      const a = rows.find((x) => x.id === b.dataset.toggle);
      a.status = a.status === 'published' ? 'draft' : 'published';
      S.save('announcement:toggle');
      UI.toast('Announcement updated', `${a.title} is now ${a.status}.`, 'info');
      ctx.refresh();
    }));
    el.querySelector('[data-add]').addEventListener('click', () => {
      UI.modal({
        title: 'New announcement',
        size: 'wide',
        body: `<form data-ann-form class="form-grid">
          <div class="field full"><label class="label">Title</label><input class="input" name="title" placeholder="e.g. Eid dispatch cut-off times"><span class="error-text" hidden></span></div>
          <div class="field full"><label class="label">Message</label><textarea class="textarea" name="body" rows="4" placeholder="Operational details for the audience…"></textarea><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Audience</label><select class="select" name="audience"><option value="all">All roles</option><option value="merchant">Merchants</option><option value="branch">Branch staff</option><option value="rider">Riders</option></select></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Publish announcement</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-ann-form]');
            if (!UI.validate(form, { title: [UI.validators.required], body: [UI.validators.required, (v) => String(v).length >= 12 || 'Add a little more detail.'] })) return;
            const fd = new FormData(form);
            S.addAnnouncement({ title: fd.get('title'), body: fd.get('body'), audience: fd.get('audience') }, { actor });
            UI.toast('Announcement published', fd.get('title'), 'success');
            close(); ctx.refresh();
          });
        }
      });
    });
  }

  /* ----------------------------------------------------------------- reports */
  function renderReports(el, ctx) {
    const s = S.statsAdmin();
    const districts = {};
    S.state.parcels.forEach((p) => { districts[p.customer.district] = (districts[p.customer.district] || 0) + 1; });
    const topDistricts = Object.entries(districts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const serviceMix = [
      { label: 'Standard', count: S.state.parcels.filter((p) => p.type === 'standard').length, color: ZR.charts.tokens().primary },
      { label: 'Express', count: S.state.parcels.filter((p) => p.type === 'express').length, color: ZR.charts.tokens().violet },
      { label: 'Same-day', count: S.state.parcels.filter((p) => p.type === 'sameday').length, color: ZR.charts.tokens().accent }
    ];
    el.innerHTML = `
      ${App.pageHead({ title: 'Reports & analytics', sub: 'Network performance, revenue and geographic demand. Export any table as CSV.', actions: `<button class="btn btn-sm btn-primary" data-export>${UI.icon('download-simple')} Export report</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Parcels moved', value: UI.num(s.parcels), icon: 'package', foot: `last ${s.parcels} demo records` })}
        ${kpi({ label: 'Success rate', value: s.successRate + '%', icon: 'target', tone: 'success', foot: 'delivered / total' })}
        ${kpi({ label: 'Return rate', value: s.returnsRate + '%', icon: 'arrow-u-up-left', tone: 'warn', foot: 'returned / total' })}
        ${kpi({ label: 'Revenue', value: money(s.revenue), icon: 'chart-line-up', tone: 'violet', foot: 'delivery + COD fees' })}
      </div>
      <div class="grid" style="grid-template-columns:1.4fr 1fr;gap:16px" id="reportCharts">
        <div class="card">
          ${panel('Demand by district', 'Parcel count per destination district', `<div class="card-body"><div class="chart-box h-280"><canvas id="rDistricts"></canvas></div></div>`)}
        </div>
        <div class="card">
          ${panel('Service mix', 'Share of delivery services', `<div class="card-body"><div class="chart-box h-280"><canvas id="rServices"></canvas></div></div>`)}
        </div>
      </div>
      <div class="card mt-4">
        ${panel('District demand table', 'Top destinations in the demo dataset', `<div class="table-wrap"><table class="table table-compact">
          <thead><tr><th>District</th><th>Division</th><th class="cell-num">Parcels</th><th class="cell-num">Delivered</th><th class="cell-num">Return rate</th><th>Service</th></tr></thead>
          <tbody>${topDistricts.map(([d, count]) => {
            const list = S.state.parcels.filter((p) => p.customer.district === d);
            const delivered = list.filter((p) => p.statusKey === 'delivered').length;
            const returned = list.filter((p) => [10, 11].includes(p.status)).length;
            const area = S.state.areas.find((a) => a.district === d);
            return `<tr><td class="cell-strong">${UI.esc(d)}</td><td class="tiny muted">${UI.esc(area ? area.division : '—')}</td>
              <td class="cell-num">${count}</td><td class="cell-num">${delivered}</td>
              <td class="cell-num">${(returned / count * 100).toFixed(1)}%</td>
              <td>${area && area.service === 'restricted' ? '<span class="badge badge-warn">Restricted</span>' : '<span class="badge badge-success">Full</span>'}</td></tr>`;
          }).join('')}</tbody>
        </table></div>`)}
      </div>`;

    if (document.getElementById('rDistricts')) {
      ZR.charts.bars('rDistricts', {
        labels: topDistricts.map(([d]) => d),
        series: [{ label: 'Parcels', data: topDistricts.map(([, c]) => c), color: ZR.charts.tokens().primary }],
        horizontal: true, legend: false
      });
    }
    if (document.getElementById('rServices')) {
      ZR.charts.doughnut('rServices', {
        labels: serviceMix.map((s2) => s2.label),
        data: serviceMix.map((s2) => s2.count),
        colors: serviceMix.map((s2) => s2.color),
        centerLabel: UI.num(S.state.parcels.length), centerSub: 'parcels'
      });
    }
    el.querySelector('[data-export]').addEventListener('click', () => {
      UI.csv.export('zeriour-network-report.csv', topDistricts.map(([d, c]) => ({ district: d, parcels: c })), [
        { key: 'district', label: 'District' }, { key: 'parcels', label: 'Parcels' }
      ]);
    });
  }

  /* -------------------------------------------------------------------- logs */
  function renderLogs(el, ctx) {
    const rows = S.state.logs;
    el.innerHTML = `
      ${App.pageHead({ title: 'Activity logs', sub: 'Audit trail of admin, branch, rider and system actions in this demo.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Activity logs',
      searchPlaceholder: 'Search action or actor…',
      searchFields: ['action', 'actor', 'target'],
      pageSize: 15,
      filters: [{ key: 'role', label: 'Role', options: [{ value: 'admin', label: 'Admin' }, { value: 'branch', label: 'Branch' }, { value: 'rider', label: 'Rider' }, { value: 'merchant', label: 'Merchant' }, { value: 'system', label: 'System' }] }],
      columns: [
        { key: 'at', label: 'Time', render: (l) => `<div class="tiny">${UI.dateTime(l.at)}</div><div class="tiny faint">${UI.relative(l.at)}</div>`, sortValue: (l) => new Date(l.at).getTime() },
        { key: 'actor', label: 'Actor', render: (l) => `<div class="user-cell"><span class="avatar sm ${l.role === 'admin' ? 'tone-dark' : l.role === 'branch' ? 'tone-sky' : l.role === 'rider' ? 'tone-violet' : 'tone-neutral'}">${UI.initials(l.actor)}</span><div><div class="name">${UI.esc(l.actor)}</div><div class="meta" style="text-transform:capitalize">${UI.esc(l.role)}</div></div></div>` },
        { key: 'action', label: 'Action', render: (l) => `<span class="tiny">${UI.esc(l.action)}</span>` },
        { key: 'target', label: 'Target', render: (l) => `<span class="mono tiny faint">${UI.esc(l.target || '—')}</span>` },
        { key: 'type', label: 'Type', render: (l) => `<span class="badge badge-neutral">${UI.esc(l.type || 'general')}</span>` }
      ]
    });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-activity-logs.csv', rows, [
      { key: 'at', label: 'Time', value: (l) => UI.dateTime(l.at) }, { key: 'actor', label: 'Actor' },
      { key: 'role', label: 'Role' }, { key: 'action', label: 'Action' },
      { key: 'target', label: 'Target' }, { key: 'type', label: 'Type' }
    ]));
  }

  /* ------------------------------------------------------------------- roles */
  function renderRoles(el, ctx) {
    const rows = S.state.staffRoles;
    el.innerHTML = `
      ${App.pageHead({ title: 'Roles & permissions', sub: 'Define what each internal role can access. Visual simulation of the permission model.', actions: `<span class="badge badge-neutral">${rows.length} roles</span>` })}
      <div class="grid g-2" style="gap:14px">
        ${rows.map((r) => `<div class="card card-pad">
          <div class="between gap-2"><div class="row gap-2"><span class="kpi-ico ${r.name.includes('Admin') ? 'danger' : r.name.includes('Finance') ? 'success' : 'violet'}"><i class="ph ph-shield-check"></i></span><div><h4 style="font-size:var(--text-md)">${UI.esc(r.name)}</h4><div class="tiny muted">${r.users} demo user${r.users > 1 ? 's' : ''}</div></div></div><span class="badge badge-neutral">${r.perms.length} permissions</span></div>
          <div class="inline-list mt-3">${r.perms.map((p) => `<span class="badge badge-info">${UI.esc(p)}</span>`).join('')}</div>
          <div class="row gap-2 mt-4"><button class="btn btn-sm" data-edit="${UI.esc(r.name)}">${UI.icon('pencil-simple')} Edit permissions</button><button class="btn btn-sm btn-ghost" data-users="${UI.esc(r.name)}">${UI.icon('users')} View users</button></div>
        </div>`).join('')}
      </div>
      <div class="alert info mt-5">${UI.icon('info')}<div><strong>Simulation only.</strong> Role permissions in this prototype are descriptive. Real enforcement would live on the server.</div></div>`;

    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
      const role = rows.find((r) => r.name === b.dataset.edit);
      const all = ['Overview', 'Parcels', 'Merchants', 'Branches', 'Riders', 'Finance', 'Pricing', 'Reports', 'Settings', 'Support'];
      UI.modal({
        title: 'Permissions · ' + role.name,
        body: `<div class="grid g-2" style="gap:8px">${all.map((p) => `<label class="checkbox"><input type="checkbox" value="${p}" ${role.perms.includes(p) || role.name === 'Super Admin' ? 'checked' : ''} ${role.name === 'Super Admin' ? 'disabled' : ''}><span>${p}</span></label>`).join('')}</div>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Save permissions</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            role.perms = Array.from(root.querySelectorAll('input:checked')).map((c) => c.value);
            S.save('roles:update');
            UI.toast('Permissions updated', role.name, 'success');
            close(); ctx.refresh();
          });
        }
      });
    }));
    el.querySelectorAll('[data-users]').forEach((b) => b.addEventListener('click', () => {
      UI.modal({
        title: b.dataset.users + ' · demo users',
        body: `<div class="stack gap-2">${S.state.users.map((u) => `<div class="between" style="padding:9px 0;border-bottom:1px solid var(--line-soft)"><div class="row gap-2">${UI.avatar(u.name, { size: 'sm' })}<div><div class="tiny strong">${UI.esc(u.name)}</div><div class="tiny muted">${UI.esc(u.email)}</div></div></div><span class="badge badge-neutral">${ZR.auth.roleMeta(u.role).label}</span></div>`).join('')}</div>`,
        footer: '<button class="btn" data-close>Close</button>'
      });
    }));
  }

  /* ----------------------------------------------------------------- content */
  function renderContent(el, ctx) {
    const c = S.state.content || {};
    el.innerHTML = `
      ${App.pageHead({ title: 'Website content', sub: 'Demo CMS for the public site copy. Saved locally; static HTML pages are not rewritten.', actions: `<a class="btn btn-sm" href="index.html" target="_blank" rel="noopener">${UI.icon('arrow-up-right')} Preview site</a>` })}
      <div class="alert info mb-5">${UI.icon('info')}<div><strong>Simulated CMS.</strong> Content is stored in the demo model and shown here. This prototype ships with static marketing pages, so edits are not published to the live site markup.</div></div>
      <div class="grid" style="grid-template-columns:1.2fr .8fr;gap:16px;align-items:start" id="contentGrid">
        <form class="card" data-content-form>
          <div class="card-head"><div><h3>Homepage copy</h3><p class="sub">Hero and banner content</p></div><span class="badge badge-neutral">Draft</span></div>
          <div class="card-body stack gap-4">
            <div class="field"><label class="label">Hero headline</label><input class="input" name="heroTitle" value="${UI.esc(c.heroTitle || 'Every parcel, delivered with proof.')}"></div>
            <div class="field"><label class="label">Hero subheadline</label><textarea class="textarea" name="heroBody" rows="3">${UI.esc(c.heroBody || 'Zeriour gives Bangladeshi merchants one calm place to ship, track and settle COD — from Dhaka same-day runs to the last mile in Kurigram.')}</textarea></div>
            <div class="field"><label class="label">Promo banner</label><input class="input" name="banner" value="${UI.esc(c.banner || 'Same-day metro dispatch until 11:00 AM')}"></div>
            <div class="field"><label class="label">Support note</label><input class="input" name="supportNote" value="${UI.esc(c.supportNote || 'Hotline open daily 9:00 – 21:00')}"></div>
            <button class="btn btn-primary" type="submit">${UI.icon('check')} Save content</button>
          </div>
        </form>
        <div class="stack gap-4">
          <div class="card card-pad">
            <div class="eyebrow">Preview</div>
            <h3 class="mt-2" style="font-size:var(--text-xl)">${UI.esc(c.heroTitle || 'Every parcel, delivered with proof.')}</h3>
            <p class="small muted mt-2" style="line-height:1.6">${UI.esc(c.heroBody || 'Zeriour gives Bangladeshi merchants one calm place to ship, track and settle COD.')}</p>
            <div class="badge badge-info mt-3">${UI.esc(c.banner || 'Same-day metro dispatch until 11:00 AM')}</div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-megaphone"></i> Announcements</h4>
            <p class="tiny muted mt-2" style="line-height:1.6">Operational notices are managed separately and appear in dashboards.</p>
            <a class="btn btn-sm btn-block mt-3" href="#/announcements">Manage announcements</a>
          </div>
        </div>
      </div>`;
    el.querySelector('[data-content-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.updateContent({ heroTitle: fd.get('heroTitle'), heroBody: fd.get('heroBody'), banner: fd.get('banner'), supportNote: fd.get('supportNote') });
      UI.toast('Content saved', 'Stored in the demo content model.', 'success');
      ctx.refresh();
    });
  }

  /* ---------------------------------------------------------------- settings */
  function renderSettings(el, ctx) {
    const st = S.state.settings;
    el.innerHTML = `
      ${App.pageHead({ title: 'General settings', sub: 'Platform identity, support contacts and demo-wide configuration.' })}
      <div class="grid" style="grid-template-columns:1.25fr .75fr;gap:16px;align-items:start" id="adminSettingsGrid">
        <form class="card" data-settings-form>
          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('buildings')}</span><div><h4>Company</h4><p>Displayed across the demo workspace.</p></div></div>
            <div class="form-grid">
              <div class="field"><label class="label">Brand name</label><input class="input" name="brand" value="${UI.esc(st.brand)}"></div>
              <div class="field"><label class="label">Support phone</label><input class="input" name="supportPhone" value="${UI.esc(st.supportPhone)}"></div>
              <div class="field"><label class="label">Support email</label><input class="input" name="supportEmail" value="${UI.esc(st.supportEmail)}"></div>
              <div class="field"><label class="label">Payout cycle</label><input class="input" name="payoutCycle" value="${UI.esc(st.payoutCycle)}"></div>
              <div class="field"><label class="label">Return window (days)</label><input class="input" type="number" name="returnWindow" value="${st.returnWindow}" min="0" max="30"></div>
              <div class="field"><label class="label">Max parcel weight (kg)</label><input class="input" type="number" name="maxWeight" value="${st.maxWeight}" min="1" max="50"></div>
            </div>
          </div>
          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('sliders')}</span><div><h4>Platform controls</h4><p>Demo-only operational switches.</p></div></div>
            <div class="between wrap gap-3" style="padding:10px 0;border-bottom:1px solid var(--line-soft)">
              <div><div class="small strong">Maintenance mode</div><div class="tiny muted">Public site would show a maintenance notice.</div></div>
              <label class="switch"><input type="checkbox" name="maintenanceMode" ${st.maintenanceMode ? 'checked' : ''}><span class="sr-only">Maintenance mode</span></label>
            </div>
            <div class="between wrap gap-3" style="padding:10px 0">
              <div><div class="small strong">Demo environment banner</div><div class="tiny muted">Show the “demo data” note in dashboards.</div></div>
              <label class="switch"><input type="checkbox" checked><span class="sr-only">Demo banner</span></label>
            </div>
          </div>
          <div class="card-foot"><button class="btn btn-primary" type="submit">${UI.icon('check')} Save settings</button></div>
        </form>

        <div class="stack gap-4">
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-user-circle"></i> Current admin</h4>
            <div class="row gap-2 mt-3">${UI.avatar(user.name, { tone: 'tone-dark' })}<div><div class="small strong">${UI.esc(user.name)}</div><div class="tiny muted">${UI.esc(user.email)}</div></div></div>
            <div class="summary-line mt-3"><span>Role</span><strong class="tiny">Super Admin</strong></div>
            <div class="summary-line"><span>Session</span><strong class="tiny">Local demo · 12h</strong></div>
            <button class="btn btn-sm btn-block mt-3" data-switch>${UI.icon('arrows-left-right')} Switch demo role</button>
          </div>
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-database"></i> Demo dataset</h4>
            <div class="summary-line"><span>Parcels</span><strong>${S.state.parcels.length}</strong></div>
            <div class="summary-line"><span>Merchants</span><strong>${S.state.merchants.length}</strong></div>
            <div class="summary-line"><span>Riders</span><strong>${S.state.riders.length}</strong></div>
            <div class="summary-line"><span>Storage</span><strong class="tiny">localStorage</strong></div>
            <a class="btn btn-sm btn-block mt-3" href="#/logs">${UI.icon('list-checks')} View activity logs</a>
          </div>
          <div class="card card-pad" style="border-color:rgba(217,45,60,.25)">
            <h4 style="font-size:var(--text-sm);color:var(--danger)"><i class="ph ph-warning"></i> Danger zone</h4>
            <p class="tiny muted mt-2" style="line-height:1.6">Resetting rebuilds every record for all four roles. This cannot be undone.</p>
            <button class="btn btn-danger-soft btn-sm btn-block mt-3" data-reset>Reset demo data</button>
            <button class="btn btn-ghost btn-sm btn-block mt-2" data-signout>Sign out</button>
          </div>
        </div>
      </div>`;

    el.querySelector('[data-settings-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      S.updateSettings({
        brand: fd.get('brand'), supportPhone: fd.get('supportPhone'), supportEmail: fd.get('supportEmail'),
        payoutCycle: fd.get('payoutCycle'), returnWindow: +fd.get('returnWindow'), maxWeight: +fd.get('maxWeight'),
        maintenanceMode: fd.get('maintenanceMode') === 'on'
      });
      S.log(actor, 'admin', 'Updated general platform settings', 'settings', 'settings');
      S.save('settings:save');
      UI.toast('Settings saved', 'Demo configuration updated.', 'success');
    });
    el.querySelector('[data-switch]').addEventListener('click', App.roleSwitcher);
    el.querySelector('[data-reset]').addEventListener('click', App.resetDemo);
    el.querySelector('[data-signout]').addEventListener('click', () => { ZR.auth.logout(); location.href = 'login.html'; });
  }

  /* ---------------------------------------------------------------- routes */
  const routes = {
    overview: { title: 'Command center', render: renderOverview },
    merchants: { title: 'Merchants', render: renderMerchants },
    customers: { title: 'Customers', render: renderCustomers },
    parcels: { title: 'Parcels', render: renderParcels },
    branches: { title: 'Branches', render: renderBranches },
    riders: { title: 'Delivery agents', render: renderRiders },
    pickups: { title: 'Pickups', render: renderPickups },
    returns: { title: 'Returns', render: renderReturns },
    finance: { title: 'Revenue & COD', render: renderFinance },
    withdrawals: { title: 'Withdrawals', render: renderWithdrawals },
    pricing: { title: 'Pricing', render: renderPricing },
    areas: { title: 'Service areas', render: renderAreas },
    coupons: { title: 'Coupons', render: renderCoupons },
    tickets: { title: 'Support tickets', render: renderTickets },
    announcements: { title: 'Announcements', render: renderAnnouncements },
    reports: { title: 'Reports', render: renderReports },
    logs: { title: 'Activity logs', render: renderLogs },
    roles: { title: 'Roles & permissions', render: renderRoles },
    content: { title: 'Website content', render: renderContent },
    transactions: { title: 'Transactions', render: renderTransactionsAdmin },
    settings: { title: 'Settings', render: renderSettings }
  };

  function renderTransactionsAdmin(el, ctx) {
    const rows = S.state.transactions;
    el.innerHTML = `
      ${App.pageHead({ title: 'All transactions', sub: 'Network-wide COD collections, delivery charges and payouts.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Network transactions',
      searchPlaceholder: 'Search reference or merchant…',
      searchFields: ['reference', 'note', 'type'],
      pageSize: 14,
      filters: [{ key: 'type', label: 'Type', options: [{ value: 'cod_collection', label: 'COD collection' }, { value: 'delivery_charge', label: 'Delivery charge' }, { value: 'payout', label: 'Payout' }] }],
      defaultSort: (a, b) => new Date(b.date) - new Date(a.date),
      columns: [
        { key: 'id', label: 'Transaction', render: (t) => `<span class="mono tiny">${UI.esc(t.id.toUpperCase())}</span>` },
        { key: 'merchantId', label: 'Merchant', render: (t) => `<span class="tiny">${UI.esc((S.merchant(t.merchantId) || {}).name || '—')}</span>` },
        { key: 'type', label: 'Type', render: (t) => `<span class="badge badge-neutral" style="text-transform:capitalize">${UI.esc(String(t.type).replace(/_/g, ' '))}</span>` },
        { key: 'reference', label: 'Reference', render: (t) => `<span class="tiny faint mono">${UI.esc(t.reference || '—')}</span>` },
        { key: 'date', label: 'Date', render: (t) => `<span class="tiny muted">${UI.date(t.date)}</span>`, sortValue: (t) => new Date(t.date).getTime() },
        { key: 'amount', label: 'Amount', align: 'right', render: (t) => `<span class="num" style="color:${t.amount < 0 ? 'var(--muted)' : 'var(--success)'}">${t.amount < 0 ? '−' : '+'}${money(Math.abs(t.amount))}</span>` },
        { key: 'status', label: 'Status', render: (t) => UI.userBadge(t.status) }
      ]
    });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-transactions.csv', rows, [
      { key: 'id', label: 'ID' }, { key: 'merchant', label: 'Merchant', value: (t) => (S.merchant(t.merchantId) || {}).name },
      { key: 'type', label: 'Type' }, { key: 'reference', label: 'Reference' },
      { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date', value: (t) => UI.dateTime(t.date) }
    ]));
  }

  const nav = [
    { label: 'Command', items: [
      { label: 'Overview', icon: 'squares-four', route: 'overview' },
      { label: 'Parcels', icon: 'package', route: 'parcels', count: () => S.state.parcels.filter((p) => p.status >= 2 && p.status <= 7).length },
      { label: 'Merchants', icon: 'storefront', route: 'merchants', count: () => S.state.merchants.filter((m) => m.status === 'pending').length },
      { label: 'Customers', icon: 'users-three', route: 'customers' }
    ] },
    { label: 'Network', items: [
      { label: 'Branches', icon: 'warehouse', route: 'branches' },
      { label: 'Delivery agents', icon: 'moped', route: 'riders' },
      { label: 'Pickups', icon: 'hand-arrow-up', route: 'pickups' },
      { label: 'Returns', icon: 'arrow-u-up-left', route: 'returns' }
    ] },
    { label: 'Commerce', items: [
      { label: 'Revenue & COD', icon: 'chart-line-up', route: 'finance' },
      { label: 'Withdrawals', icon: 'bank', route: 'withdrawals', count: () => S.state.withdrawals.filter((w) => w.status === 'pending').length },
      { label: 'Transactions', icon: 'receipt', route: 'transactions' },
      { label: 'Pricing', icon: 'tag', route: 'pricing' },
      { label: 'Coupons', icon: 'ticket', route: 'coupons' }
    ] },
    { label: 'Coverage', items: [
      { label: 'Service areas', icon: 'map-trifold', route: 'areas' }
    ] },
    { label: 'Experience', items: [
      { label: 'Support tickets', icon: 'lifebuoy', route: 'tickets', count: () => S.state.tickets.filter((t) => t.status === 'open').length },
      { label: 'Announcements', icon: 'megaphone', route: 'announcements' },
      { label: 'Website content', icon: 'browser', route: 'content' }
    ] },
    { label: 'System', items: [
      { label: 'Reports', icon: 'chart-bar', route: 'reports' },
      { label: 'Activity logs', icon: 'list-magnifying-glass', route: 'logs' },
      { label: 'Roles', icon: 'shield-check', route: 'roles' },
      { label: 'Settings', icon: 'gear', route: 'settings' }
    ] }
  ];

  ZR.app.registerParcelOpener((id) => {
    if (!S.parcel(id)) return false;
    parcelDrawer(id, { refresh: () => App.refresh() });
    return true;
  });

  App.mount({
    role: 'admin',
    user,
    nav,
    routes,
    defaultRoute: 'overview',
    roleLabel: 'Super Admin',
    roleSub: 'Zeriour network · Dhaka HQ',
    searchPlaceholder: 'Search parcels, merchants, riders…'
  });
})(window.ZR);
