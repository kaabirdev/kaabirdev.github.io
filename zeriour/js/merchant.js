/* ==========================================================================
   Zeriour — Merchant workspace
   Overview, parcels, bulk import, finance, customers, store, support.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';
  const UI = ZR.ui;
  const S = ZR.store;
  const App = ZR.app;

  S.init();
  const user = ZR.auth.require('merchant');
  if (!user) return;
  const merchantId = user.merchantId || 'mer_0001';
  let merchant = S.merchant(merchantId) || S.state.merchants[0];
  const merchantParcels = () => S.merchantParcels(merchant.id);

  /* ------------------------------------------------------------------ utils */
  const money = UI.money;
  const shortId = (id) => String(id || '').replace(/_/g, ' ');
  function sparkline(values, color = 'var(--primary)') {
    if (!values || values.length < 2) return '';
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const span = max - min || 1;
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * 64},${23 - ((v - min) / span) * 19}`).join(' ');
    return `<svg class="spark" viewBox="0 0 64 24" fill="none" aria-hidden="true"><polyline points="${pts}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function kpi({ label, value, icon, tone = '', delta, deltaDir = 'up', foot = '', spark }) {
    return `<div class="kpi">
      <div class="kpi-top"><span class="kpi-label">${UI.esc(label)}</span><span class="kpi-ico ${tone}">${UI.icon(icon)}</span></div>
      <div class="kpi-val">${value}</div>
      <div class="kpi-foot">
        <span>${delta ? `<span class="delta ${deltaDir}">${UI.icon(deltaDir === 'up' ? 'arrow-up-right' : deltaDir === 'down' ? 'arrow-down-right' : 'minus')} ${UI.esc(delta)}</span>` : ''} ${foot}</span>
        ${spark || ''}
      </div>
    </div>`;
  }
  function sectionHead(title, sub, actions = '') {
    return `<div class="card-head"><div><h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${actions}</div>`;
  }
  function periodSwitch(active = 14) {
    return `<div class="segmented" data-period>
      ${[7, 14, 30].map((d) => `<button data-days="${d}" class="${d === active ? 'is-active' : ''}">${d}d</button>`).join('')}
    </div>`;
  }
  function rangeFor(days) {
    const from = new Date(Date.now() - days * 86400000);
    return { from, keys: Array.from({ length: days }, (_, i) => new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10)) };
  }
  function dayLabels(keys) {
    return keys.map((k) => new Date(k + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
  }
  function seriesFor(list, days) {
    const { keys } = rangeFor(days);
    return {
      labels: dayLabels(keys),
      created: keys.map((k) => list.filter((p) => p.createdAt.slice(0, 10) === k).length),
      delivered: keys.map((k) => list.filter((p) => p.deliveredAt && p.deliveredAt.slice(0, 10) === k).length)
    };
  }
  function openParcelDrawer(id, ctx) {
    const p = S.parcel(id);
    if (!p) return;
    const rider = S.rider(p.riderId);
    const origin = S.branch(p.originBranchId);
    const dest = S.branch(p.destBranchId) || S.branchForDistrict(p.customer.district);
    const canEdit = p.status <= 5;
    const canCancel = p.status <= 1;
    UI.drawer({
      title: p.tracking,
      subtitle: `${p.merchantName} · ${UI.statusBadge(p.statusKey, { short: true })}`,
      size: 'wide',
      body: `
        <div class="card card-pad mb-4">
          <div class="between wrap gap-3 mb-3">
            <div><div class="tiny muted">Current status</div><div class="row gap-2 mt-1">${UI.statusBadge(p.statusKey, { lg: true })}</div></div>
            <div class="text-right"><div class="tiny muted">COD</div><div class="strong num" style="font-size:var(--text-lg)">${money(p.cod)}</div></div>
          </div>
          ${ZR.tracking.progress(p)}
          <div class="between tiny muted mt-3"><span>${UI.icon('clock')} Updated ${UI.relative(p.updatedAt)}</span><span>${UI.icon('calendar')} ETA ${UI.date(p.eta)}</span></div>
        </div>
        ${ZR.tracking.details(p)}
        <div class="detail-section mt-4">
          <div class="ds-head"><h4>${UI.icon('path')} Status timeline</h4><span class="badge badge-neutral">${p.timeline.length} events</span></div>
          <div class="ds-body">${ZR.tracking.timeline(p)}</div>
        </div>
        <div class="detail-section mt-4">
          <div class="ds-head"><h4>${UI.icon('buildings')} Routing</h4></div>
          <div class="ds-body"><div class="kv-grid">
            <div class="kv"><div class="k">Origin</div><div class="v">${origin ? origin.name + ' · ' + origin.code : 'Awaiting assignment'}</div></div>
            <div class="kv"><div class="k">Destination</div><div class="v">${dest ? dest.name + ' · ' + dest.code : '—'}</div></div>
            <div class="kv"><div class="k">Rider</div><div class="v">${rider ? rider.name + ' · ' + rider.phone : 'Not assigned'}</div></div>
            <div class="kv"><div class="k">Bag</div><div class="v">${p.bagId || 'Not bagged'}</div></div>
          </div></div>
        </div>
        <p class="tiny faint mt-4">${UI.icon('flask')} Demo record — use the admin, branch or rider workspaces to move this parcel forward.</p>`,
      footer: `
        <button class="btn btn-sm" data-dl-label>${UI.icon('printer')} Shipping label</button>
        <button class="btn btn-sm" data-dl-invoice>${UI.icon('receipt')} Invoice</button>
        ${canEdit ? `<button class="btn btn-sm" data-edit>${UI.icon('pencil-simple')} Edit</button>` : ''}
        ${canCancel ? `<button class="btn btn-sm btn-danger-soft" data-cancel>${UI.icon('prohibit')} Cancel</button>` : ''}
        <span class="grow"></span>
        <a class="btn btn-sm btn-primary" href="track.html?id=${p.tracking}" target="_blank" rel="noopener">${UI.icon('arrow-up-right')} Public tracking</a>`,
      onMount(root, close) {
        root.querySelector('[data-dl-label]').addEventListener('click', () => printLabel(p));
        root.querySelector('[data-dl-invoice]').addEventListener('click', () => printInvoice(p));
        const edit = root.querySelector('[data-edit]');
        if (edit) edit.addEventListener('click', () => { close(); editParcelModal(p, ctx); });
        const cancel = root.querySelector('[data-cancel]');
        if (cancel) cancel.addEventListener('click', async () => {
          const ok = await UI.confirm({ title: 'Cancel this parcel?', body: `Parcel <strong>${p.tracking}</strong> will be cancelled. This is only possible before pickup.`, confirmText: 'Cancel parcel', danger: true });
          if (!ok) return;
          S.cancelParcel(p.id, { actor: merchant.owner });
          UI.toast('Parcel cancelled', p.tracking, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  function printLabel(p) {
    const dest = S.branch(p.destBranchId) || S.branchForDistrict(p.customer.district);
    UI.print(`
      <div class="label-sheet">
        <div class="ls-head">
          <div><div class="ls-brand">zeriour<span style="color:#2563eb">.</span></div><div class="tiny">PRECISION LOGISTICS · DHAKA</div></div>
          <div style="text-align:right"><div style="font-size:9px;letter-spacing:.08em;font-weight:700">SERVICE</div><div style="font-weight:700;font-size:14px">${p.type.toUpperCase()}</div></div>
        </div>
        <div class="ls-code">${p.tracking}</div>
        <div class="tiny">COD: <strong>৳${p.cod.toLocaleString('en-US')}</strong> · Weight: ${p.weight} kg</div>
        <div class="barcode">${UI.barcode(p.tracking)}</div>
        <div class="ls-grid">
          <div><div class="k">Deliver to</div><div class="v">${UI.esc(p.customer.name)}<br>${UI.esc(p.customer.phone)}</div></div>
          <div><div class="k">Destination hub</div><div class="v">${UI.esc(dest ? dest.code : '—')}<br>${UI.esc(p.customer.upazila)}</div></div>
          <div style="grid-column:1/-1"><div class="k">Address</div><div class="v">${UI.esc(p.customer.address)}, ${UI.esc(p.customer.upazila)}, ${UI.esc(p.customer.district)}</div></div>
          <div><div class="k">Merchant</div><div class="v">${UI.esc(p.merchantName)}</div></div>
          <div><div class="k">Order / invoice</div><div class="v">${UI.esc(p.invoiceNo)}</div></div>
          <div><div class="k">Pickup</div><div class="v">${UI.esc(p.pickupLocation || merchant.store.pickupAddress)}</div></div>
          <div><div class="k">Product</div><div class="v">${UI.esc(p.product || '—')}</div></div>
        </div>
        <div style="border-top:1px dashed #999;margin-top:10px;padding-top:6px;font-size:8px;color:#444">DEMO DOCUMENT · NOT A REAL SHIPPING LABEL · ZERIOUR PROTOTYPE</div>
      </div>`, 'Shipping label ' + p.tracking);
  }

  function printInvoice(p) {
    UI.print(`
      <div class="invoice">
        <div class="inv-head">
          <div><div style="font-family:'Plus Jakarta Sans';font-weight:800;font-size:22px;letter-spacing:-.04em">zeriour<span style="color:#2563eb">.</span></div>
            <div class="tiny muted">Zeriour Logistics Ltd. · Gulshan Avenue, Dhaka 1212<br>support@zeriour.demo · 09612 300 400</div></div>
          <div style="text-align:right"><div style="font-weight:700;font-size:18px">INVOICE</div><div class="tiny">${UI.esc(p.invoiceNo)}<br>${UI.date(p.createdAt)}</div></div>
        </div>
        <div style="display:flex;justify-content:space-between;gap:24px;margin-top:18px;font-size:12px">
          <div><div class="k">BILLED TO</div><div class="v">${UI.esc(p.merchantName)}<br>${UI.esc(merchant.owner)}<br>${UI.esc(merchant.store.pickupAddress)}</div></div>
          <div><div class="k">SHIP TO</div><div class="v">${UI.esc(p.customer.name)}<br>${UI.esc(p.customer.phone)}<br>${UI.esc(p.customer.address)}, ${UI.esc(p.customer.upazila)}<br>${UI.esc(p.customer.district)}</div></div>
          <div><div class="k">TRACKING</div><div class="v mono">${UI.esc(p.tracking)}</div></div>
        </div>
        <table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Amount</th></tr></thead>
          <tbody>
            <tr><td>${UI.esc(p.product || 'Parcel delivery')}<div class="tiny muted">${p.type} service · ${p.weight} kg</div></td><td class="right">1</td><td class="right">৳${p.deliveryCharge.toLocaleString('en-US')}</td></tr>
            ${p.weightCharge ? `<tr><td>Additional weight charge<div class="tiny muted">Above first ${ZR.pricing.settings().includedKg} kg</div></td><td class="right">—</td><td class="right">included</td></tr>` : ''}
            <tr><td>COD collection fee<div class="tiny muted">${ZR.pricing.settings().codRate}% of collected amount</div></td><td class="right">—</td><td class="right">৳${p.codCharge.toLocaleString('en-US')}</td></tr>
          </tbody></table>
        <div class="totals">
          <div><span>Delivery charge</span><span>৳${p.deliveryCharge.toLocaleString('en-US')}</span></div>
          <div><span>COD fee</span><span>৳${p.codCharge.toLocaleString('en-US')}</span></div>
          <div class="big"><span>Total</span><span>৳${(p.deliveryCharge + p.codCharge).toLocaleString('en-US')}</span></div>
        </div>
        <div style="margin-top:28px;font-size:9px;color:#777;border-top:1px solid #ddd;padding-top:8px">Demo invoice generated by the Zeriour frontend prototype. Not a tax document.</div>
      </div>`, 'Invoice ' + p.invoiceNo);
  }

  function editParcelModal(p, ctx) {
    UI.modal({
      title: 'Edit parcel',
      subtitle: p.tracking + ' · changes are saved to the shared demo dataset',
      size: 'wide',
      body: `<form data-edit-form class="form-grid">
        <div class="field"><label class="label">Customer name</label><input class="input" name="name" value="${UI.esc(p.customer.name)}"><span class="error-text" hidden></span></div>
        <div class="field"><label class="label">Phone</label><input class="input" name="phone" value="${UI.esc(p.customer.phone)}"><span class="error-text" hidden></span></div>
        <div class="field full"><label class="label">Address</label><textarea class="textarea" name="address" rows="2">${UI.esc(p.customer.address)}</textarea><span class="error-text" hidden></span></div>
        <div class="field"><label class="label">Product description</label><input class="input" name="product" value="${UI.esc(p.product || '')}"></div>
        <div class="field"><label class="label">Special instructions</label><input class="input" name="notes" value="${UI.esc(p.notes || '')}"></div>
      </form>`,
      footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Save changes</button>`,
      onMount(root, close) {
        root.querySelector('[data-save]').addEventListener('click', () => {
          const form = root.querySelector('[data-edit-form]');
          if (!UI.validate(form, { name: [UI.validators.required], phone: [UI.validators.required, UI.validators.phone], address: [UI.validators.required] })) return;
          const fd = new FormData(form);
          S.editParcel(p.id, {
            customer: { name: fd.get('name'), phone: fd.get('phone'), address: fd.get('address') },
            product: fd.get('product'), notes: fd.get('notes')
          }, { actor: merchant.owner });
          UI.toast('Parcel updated', p.tracking, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  /* ---------------------------------------------------------------- overview */
  function renderOverview(el, ctx) {
    const stats = S.statsMerchant(merchant.id);
    const parcels = merchantParcels();
    let days = 14;
    if (ctx.query.get('days')) days = Math.max(7, Math.min(30, +ctx.query.get('days')));
    const series = seriesFor(parcels, days);
    const recent = parcels.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
    const statusGroups = [
      { label: 'Delivered', count: parcels.filter((p) => p.statusKey === 'delivered').length, tone: 'success' },
      { label: 'Out for delivery', count: parcels.filter((p) => p.status === 7).length, tone: 'accent' },
      { label: 'In transit', count: parcels.filter((p) => p.status >= 2 && p.status <= 6).length, tone: 'info' },
      { label: 'Pending pickup', count: parcels.filter((p) => p.status <= 1).length, tone: 'warn' },
      { label: 'Failed / return', count: parcels.filter((p) => [9, 10, 11].includes(p.status)).length, tone: 'danger' },
      { label: 'Cancelled', count: parcels.filter((p) => p.statusKey === 'cancelled').length, tone: 'neutral' }
    ];

    el.innerHTML = `
      ${App.pageHead({
        title: 'Overview',
        sub: `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${UI.esc(user.name.split(' ')[0])}. Here’s how ${UI.esc(merchant.name)} is performing.`,
        actions: `${periodSwitch(days)}<a class="btn btn-primary" href="#/parcels/new">${UI.icon('plus')} Create parcel</a>`
      })}
      <div class="grid g-4 mb-4">
        ${kpi({ label: 'Total parcels', value: UI.num(stats.total), icon: 'package', delta: '8.4%', foot: 'vs last month', spark: sparkline(series.created) })}
        ${kpi({ label: 'In transit', value: UI.num(stats.inTransit), icon: 'truck', tone: 'violet', delta: '2.1%', foot: 'active shipments' })}
        ${kpi({ label: 'Delivered', value: UI.num(stats.delivered), icon: 'check-circle', tone: 'success', delta: '5.6%', foot: 'lifetime', spark: sparkline(series.delivered, 'var(--success)') })}
        ${kpi({ label: 'Delivery success', value: stats.successRate + '%', icon: 'target', tone: 'sky', delta: '1.2%', foot: 'closed parcels', spark: sparkline([62, 68, 66, 74, 79, 77, 84, 88]) })}
      </div>
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'COD collected', value: money(stats.codCollected), icon: 'wallet', tone: 'success', foot: 'from delivered parcels' })}
        ${kpi({ label: 'Available balance', value: money(stats.balance), icon: 'bank', deltaDir: 'flat', foot: `next payout Tuesday`, spark: sparkline([12, 18, 16, 24, 22, 31, 35]) })}
        ${kpi({ label: 'Pending settlement', value: money(stats.pending), icon: 'hourglass', tone: 'warn', foot: 'awaiting delivery' })}
        ${kpi({ label: 'Returns & failures', value: UI.num(stats.returned + stats.failed), icon: 'arrow-u-up-left', tone: 'danger', foot: `${stats.returned} returned · ${stats.failed} failed` })}
      </div>

      <div class="grid" style="grid-template-columns:1.6fr 1fr;gap:16px" id="overviewCharts">
        <div class="card">
          ${sectionHead('Shipment volume', `Created vs delivered · last ${days} days`, `<a class="link tiny" href="#/parcels">View all ${UI.icon('arrow-right')}</a>`)}
          <div class="card-body">
            <div class="chart-legend mb-3">
              <span class="li"><span class="sw" style="background:var(--primary)"></span>Created</span>
              <span class="li"><span class="sw" style="background:var(--success)"></span>Delivered</span>
            </div>
            <div class="chart-box h-240"><canvas id="mTrend"></canvas></div>
          </div>
        </div>
        <div class="card">
          ${sectionHead('Status distribution', 'All parcels in your account')}
          <div class="card-body">
            <div class="chart-box h-240"><canvas id="mStatus"></canvas></div>
          </div>
        </div>
      </div>

      <div class="grid mt-4" style="grid-template-columns:1.65fr 1fr;gap:16px" id="overviewLower">
        <div class="card">
          ${sectionHead('Recent activity', 'Latest status changes across your parcels', `<a class="link tiny" href="#/parcels">All parcels ${UI.icon('arrow-right')}</a>`)}
          <div class="table-wrap">
            <table class="table table-compact">
              <thead><tr><th>Tracking</th><th>Customer</th><th>Status</th><th class="cell-num">COD</th><th>Updated</th></tr></thead>
              <tbody>${recent.map((p) => `
                <tr data-open="${p.id}" style="cursor:pointer">
                  <td><span class="tracking-code">${p.tracking}</span></td>
                  <td><div class="cell-strong">${UI.esc(p.customer.name)}</div><div class="tiny muted">${UI.esc(p.customer.district)}</div></td>
                  <td>${UI.statusBadge(p.statusKey, { short: true })}</td>
                  <td class="cell-num">${money(p.cod)}</td>
                  <td class="tiny muted nowrap">${UI.relative(p.updatedAt)}</td>
                </tr>`).join('')}</tbody>
            </table>
          </div>
          <div class="card-foot"><a class="link tiny" href="#/parcels">Open parcel management ${UI.icon('arrow-right')}</a></div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <div class="between"><h4 style="font-size:var(--text-sm)"><i class="ph ph-lightning"></i> Quick actions</h4><span class="badge badge-neutral">Merchant</span></div>
            <div class="grid g-2 mt-3" style="gap:8px">
              <a class="btn btn-sm" href="#/parcels/new">${UI.icon('plus')} New parcel</a>
              <a class="btn btn-sm" href="#/bulk">${UI.icon('upload-simple')} Bulk import</a>
              <a class="btn btn-sm" href="#/pickups">${UI.icon('hand-arrow-up')} Pickup</a>
              <a class="btn btn-sm" href="#/finance">${UI.icon('wallet')} Withdraw</a>
              <a class="btn btn-sm" href="#/returns">${UI.icon('arrow-u-up-left')} Returns</a>
              <a class="btn btn-sm" href="#/support">${UI.icon('lifebuoy')} Support</a>
            </div>
          </div>
          <div class="card card-pad">
            <div class="between"><h4 style="font-size:var(--text-sm)"><i class="ph ph-wallet"></i> COD wallet</h4><a class="link tiny" href="#/finance">Details</a></div>
            <div class="num" style="font-family:var(--font-display);font-weight:750;font-size:1.8rem;letter-spacing:-.035em;margin-top:8px">${money(stats.balance)}</div>
            <div class="tiny muted">Available for withdrawal</div>
            <div class="progress mt-3"><span style="width:${Math.min(100, Math.round(stats.balance / Math.max(1, stats.balance + stats.pending) * 100))}%"></span></div>
            <div class="between tiny muted mt-2"><span>Available</span><span>Pending ${money(stats.pending)}</span></div>
            <button class="btn btn-primary btn-sm btn-block mt-4" data-withdraw>Request withdrawal</button>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <div class="row gap-2"><span class="kpi-ico warn"><i class="ph ph-warning"></i></span><h4 style="font-size:var(--text-sm)">Needs attention</h4></div>
            <div class="stack gap-2 mt-3">
              ${stats.pendingPickup ? `<a class="row gap-2 tiny" href="#/pickups">${UI.icon('hand-arrow-up')} ${stats.pendingPickup} parcels awaiting pickup</a>` : ''}
              ${stats.failed ? `<a class="row gap-2 tiny" href="#/returns">${UI.icon('x-circle')} ${stats.failed} failed deliveries to review</a>` : ''}
              ${!stats.pendingPickup && !stats.failed ? `<span class="tiny muted">${UI.icon('check-circle')} Nothing urgent right now.</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;

    const trendCtx = document.getElementById('mTrend');
    if (trendCtx) {
      ZR.charts.areaLine('mTrend', {
        labels: series.labels,
        series: [
          { label: 'Created', data: series.created, color: ZR.charts.tokens().primary },
          { label: 'Delivered', data: series.delivered, color: ZR.charts.tokens().success, fill: false }
        ],
        legend: false
      });
    }
    if (document.getElementById('mStatus')) {
      ZR.charts.doughnut('mStatus', {
        labels: statusGroups.map((s) => s.label),
        data: statusGroups.map((s) => s.count),
        colors: [ZR.charts.tokens().success, ZR.charts.tokens().primary, ZR.charts.tokens().warn, ZR.charts.tokens().danger, ZR.charts.tokens().faint, ZR.charts.tokens().violet],
        centerLabel: UI.num(stats.total), centerSub: 'parcels'
      });
    }

    el.querySelectorAll('[data-period] button').forEach((b) => b.addEventListener('click', () => {
      App.go('overview?days=' + b.dataset.days);
    }));
    el.querySelectorAll('[data-open]').forEach((tr) => tr.addEventListener('click', () => openParcelDrawer(tr.dataset.open, ctx)));
    const wd = el.querySelector('[data-withdraw]');
    if (wd) wd.addEventListener('click', () => withdrawModal(ctx));
  }

  /* --------------------------------------------------------------- parcels */
  function renderParcels(el, ctx) {
    const stats = S.statsMerchant(merchant.id);
    let rows = merchantParcels().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const statusOptions = ZR.STATUSES.map((s) => ({ value: s.key, label: s.label }));
    const districtOptions = Array.from(new Set(rows.map((p) => p.customer.district))).sort().map((d) => ({ value: d, label: d }));

    el.innerHTML = `
      ${App.pageHead({
        title: 'Parcels',
        sub: `${UI.num(rows.length)} parcels in your account · click any row for the full timeline`,
        actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export CSV</button>
                  <a class="btn btn-sm" href="#/bulk">${UI.icon('upload-simple')} Bulk import</a>
                  <a class="btn btn-sm btn-primary" href="#/parcels/new">${UI.icon('plus')} New parcel</a>`
      })}
      <div class="row gap-2 wrap mb-4">
        <span class="badge badge-neutral badge-lg">All <strong>${rows.length}</strong></span>
        <a class="badge badge-warn badge-lg" href="#/pickups">Pending pickup <strong>${stats.pendingPickup}</strong></a>
        <span class="badge badge-info badge-lg">In transit <strong>${stats.inTransit}</strong></span>
        <span class="badge badge-accent badge-lg">Out for delivery <strong>${stats.outForDelivery}</strong></span>
        <span class="badge badge-success badge-lg">Delivered <strong>${stats.delivered}</strong></span>
        <span class="badge badge-danger badge-lg">Returns &amp; failed <strong>${stats.returned + stats.failed}</strong></span>
        <span class="badge badge-neutral badge-lg">Cancelled <strong>${stats.cancelled}</strong></span>
      </div>
      <div data-table></div>`;

    const table = UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Merchant parcels',
      searchPlaceholder: 'Search tracking, customer or phone…',
      searchFields: ['tracking', 'customer', 'merchantName', (r) => r.customer.name, (r) => r.customer.phone],
      pageSize: 10,
      selectable: true,
      filters: [
        { key: 'statusKey', label: 'Status', options: statusOptions },
        { key: 'district', label: 'District', options: districtOptions, match: (r, v) => r.customer.district === v }
      ],
      defaultSort: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      columns: [
        { key: 'tracking', label: 'Tracking', render: (p) => `<span class="tracking-code">${p.tracking}<button class="icon-btn sm copy-btn" data-copy="${p.tracking}" aria-label="Copy tracking">${UI.icon('copy')}</button></span>` },
        { key: 'customer', label: 'Customer', render: (p) => `<div class="user-cell"><span class="avatar sm">${UI.initials(p.customer.name)}</span><div style="min-width:0"><div class="name truncate">${UI.esc(p.customer.name)}</div><div class="meta">${UI.esc(p.customer.phone)}</div></div></div>` },
        { key: 'district', label: 'Destination', render: (p) => `<div class="cell-strong">${UI.esc(p.customer.upazila)}</div><div class="tiny muted">${UI.esc(p.customer.district)}</div>` },
        { key: 'statusKey', label: 'Status', render: (p) => UI.statusBadge(p.statusKey, { short: true }) },
        { key: 'cod', label: 'COD', align: 'right', render: (p) => `<span class="num">${money(p.cod)}</span>` },
        { key: 'weight', label: 'Weight', align: 'right', render: (p) => `<span class="tiny muted">${p.weight} kg</span>` },
        { key: 'createdAt', label: 'Created', render: (p) => `<div class="tiny">${UI.date(p.createdAt)}</div><div class="tiny faint">${UI.relative(p.createdAt)}</div>`, sortValue: (p) => new Date(p.createdAt).getTime() }
      ],
      rowMenu: (p) => [
        { label: 'View details', icon: 'eye', onClick: () => openParcelDrawer(p.id, ctx) },
        { label: 'Copy tracking', icon: 'copy', onClick: () => UI.copy(p.tracking, 'Tracking number copied') },
        { label: 'Print label', icon: 'printer', onClick: () => printLabel(p) },
        { label: 'Download invoice', icon: 'receipt', onClick: () => printInvoice(p) },
        { sep: true },
        { label: 'Edit parcel', icon: 'pencil-simple', hidden: p.status > 5, onClick: () => editParcelModal(p, ctx) },
        { label: 'Request pickup', icon: 'hand-arrow-up', hidden: p.status > 1, onClick: () => { S.requestPickup([p.id], { actor: merchant.owner }); UI.toast('Pickup requested', p.tracking, 'success'); ctx.refresh(); } },
        { label: 'Cancel parcel', icon: 'prohibit', danger: true, hidden: p.status > 1, onClick: async () => {
          const ok = await UI.confirm({ title: 'Cancel parcel?', body: `Cancel <strong>${p.tracking}</strong>? This cannot be undone.`, confirmText: 'Cancel parcel', danger: true });
          if (!ok) return;
          S.cancelParcel(p.id, { actor: merchant.owner });
          UI.toast('Parcel cancelled', p.tracking, 'success');
          ctx.refresh();
        } }
      ],
      onRow: (p) => openParcelDrawer(p.id, ctx),
      toolbarExtra: `<span class="tiny muted" data-selected-count style="align-self:center"></span>`
    });

    // toolbar actions are injected by UI.table via config.actions
    // copy buttons
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-copy]');
      if (btn) { e.stopPropagation(); UI.copy(btn.dataset.copy, 'Tracking number copied'); }
    });
    el.querySelector('[data-export]').addEventListener('click', () => exportParcels(rows));
  }

  function exportParcels(rows, selected) {
    const list = selected && selected.length ? rows.filter((p) => selected.includes(p.id)) : rows;
    UI.csv.export('zeriour-parcels-' + new Date().toISOString().slice(0, 10) + '.csv', list, [
      { key: 'tracking', label: 'Tracking ID' },
      { key: 'customer', label: 'Customer', value: (p) => p.customer.name },
      { key: 'phone', label: 'Phone', value: (p) => p.customer.phone },
      { key: 'address', label: 'Address', value: (p) => `${p.customer.address}, ${p.customer.upazila}, ${p.customer.district}` },
      { key: 'status', label: 'Status', value: (p) => ZR.statusMeta(p.statusKey).label },
      { key: 'cod', label: 'COD (BDT)', value: (p) => p.cod },
      { key: 'charge', label: 'Delivery charge', value: (p) => p.deliveryCharge },
      { key: 'weight', label: 'Weight (kg)', value: (p) => p.weight },
      { key: 'type', label: 'Service', value: (p) => p.type },
      { key: 'created', label: 'Created', value: (p) => UI.date(p.createdAt) }
    ]);
  }

  /* ----------------------------------------------------------- new parcel */
  function renderNewParcel(el, ctx) {
    const defaults = { pickup: merchant.store.pickupAddress };
    el.innerHTML = `
      ${App.pageHead({
        title: 'Create parcel',
        crumbs: [{ label: 'Parcels', href: '#/parcels' }, { label: 'New parcel' }],
        sub: 'Enter delivery details. Charges are calculated live from current demo rates.',
        actions: `<a class="btn btn-sm" href="#/bulk">${UI.icon('copy')} Multiple parcels</a><a class="btn btn-sm" href="#/parcels">Cancel</a>`
      })}
      <div class="grid" style="grid-template-columns:1.55fr 1fr;gap:16px;align-items:start" id="newParcelGrid">
        <form class="card" data-parcel-form novalidate>
          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('user-circle')}</span><div><h4>Recipient</h4><p>Who is receiving this parcel?</p></div></div>
            <div class="form-grid">
              <div class="field"><label class="label" for="np-name">Customer name <span class="req">*</span></label><input class="input" id="np-name" name="name" placeholder="e.g. Rakibul Hasan" autocomplete="name"><span class="error-text" hidden></span></div>
              <div class="field"><label class="label" for="np-phone">Customer phone <span class="req">*</span></label><input class="input" id="np-phone" name="phone" placeholder="+8801XXXXXXXXX" inputmode="tel"><span class="error-text" hidden></span></div>
              <div class="field full"><label class="label" for="np-alt">Alternative phone <span class="opt">(optional)</span></label><input class="input" id="np-alt" name="altPhone" placeholder="Backup number for delivery" inputmode="tel"><span class="hint">Helps riders complete delivery on the first attempt.</span></div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('map-pin')}</span><div><h4>Delivery address</h4><p>District and upazila drive routing and charges.</p></div></div>
            <div class="form-grid">
              <div class="field"><label class="label" for="np-district">District <span class="req">*</span></label><select class="select" id="np-district" name="district"><option value="">Select district</option>${UI.districtOptions()}</select><span class="error-text" hidden></span></div>
              <div class="field"><label class="label" for="np-upazila">Upazila / Thana <span class="req">*</span></label><select class="select" id="np-upazila" name="upazila"><option value="">Select district first</option></select><span class="error-text" hidden></span></div>
              <div class="field"><label class="label" for="np-area">Delivery area / zone</label><input class="input" id="np-area" name="area" placeholder="e.g. Dhanmondi Zone A"></div>
              <div class="field"><label class="label" for="np-address">Full address <span class="req">*</span></label><input class="input" id="np-address" name="address" placeholder="House, road, landmark"><span class="error-text" hidden></span></div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('package')}</span><div><h4>Parcel details</h4><p>Product, weight and cash-on-delivery amount.</p></div></div>
            <div class="form-grid">
              <div class="field"><label class="label" for="np-product">Product description <span class="req">*</span></label><input class="input" id="np-product" name="product" placeholder="e.g. Cotton panjabi (L)"><span class="error-text" hidden></span></div>
              <div class="field"><label class="label" for="np-type">Service type</label><select class="select" id="np-type" name="type">${ZR.pricing.types().map((t) => `<option value="${t.id}">${t.name} · ${t.eta}</option>`).join('')}</select></div>
              <div class="field"><label class="label" for="np-weight">Weight (kg) <span class="req">*</span></label><input class="input" id="np-weight" name="weight" type="number" min="0.1" max="20" step="0.1" value="1" inputmode="decimal"><span class="error-text" hidden></span></div>
              <div class="field"><label class="label" for="np-cod">COD amount</label><div class="input-group prefix"><span class="addon">৳</span><input class="input" id="np-cod" name="cod" type="number" min="0" step="50" value="1500" inputmode="numeric"></div><span class="hint">Set to 0 for a prepaid parcel.</span></div>
              <div class="field full"><label class="label" for="np-notes">Special instructions <span class="opt">(optional)</span></label><textarea class="textarea" id="np-notes" name="notes" rows="2" placeholder="Fragile, call before delivery, deliver after 6 PM…"></textarea></div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section-head"><span class="ico">${UI.icon('hand-arrow-up')}</span><div><h4>Pickup</h4><p>Where should the rider collect this parcel?</p></div></div>
            <div class="form-grid">
              <div class="field full"><label class="label" for="np-pickup">Pickup location</label><input class="input" id="np-pickup" name="pickupLocation" value="${UI.esc(defaults.pickup)}"><span class="hint">Default address from your store settings.</span></div>
            </div>
            <label class="checkbox mt-4"><input type="checkbox" name="requestPickup" checked><span>Request pickup immediately after creating this parcel</span></label>
          </div>

          <div class="card-foot between" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <span class="tiny muted">${UI.icon('flask')} Demo parcel — no real pickup will occur</span>
            <button class="btn btn-primary" type="submit">${UI.icon('plus')} Create parcel</button>
          </div>
        </form>

        <aside class="stack gap-4" style="position:sticky;top:calc(var(--topbar-h) + 16px)">
          <div class="card">
            <div class="card-head" style="padding:14px 16px"><div><h4 style="font-size:var(--text-sm)">Charge summary</h4><p class="sub">Live pricing</p></div><span class="badge badge-info"><i class="dot"></i>Live</span></div>
            <div class="card-body">
              <div class="summary-line"><span>Base charge</span><strong data-q="base">৳60</strong></div>
              <div class="summary-line"><span>Additional weight</span><strong data-q="weight">৳0</strong></div>
              <div class="summary-line"><span>Remote surcharge</span><strong data-q="remote">৳0</strong></div>
              <div class="summary-line"><span>COD fee</span><strong data-q="cod">৳18</strong></div>
              <div class="summary-total summary-line"><span>Delivery charge</span><strong data-q="delivery">৳60</strong></div>
              <div class="summary-total summary-line" style="border-top:0;padding-top:0"><span>Total with COD fee</span><strong data-q="total" style="color:var(--primary)">৳78</strong></div>
              <div class="alert info mt-3 tiny" style="padding:10px">${UI.icon('info')}<div><span data-q="eta">2–4 business days</span> transit estimate. Remote areas may take longer.</div></div>
              <div class="tiny faint mt-3">${UI.icon('path')} Destination hub: <span data-q="hub">—</span></div>
            </div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)">What happens next</h4>
            <div class="stack gap-2 mt-3 tiny muted" style="line-height:1.5">
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">1</span> Parcel appears in your list as <strong>Order created</strong></div>
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">2</span> Admin assigns an origin branch</div>
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">3</span> Branch scans it into the network</div>
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">4</span> Rider delivers and collects COD</div>
            </div>
            <a class="link tiny mt-3" href="login.html?role=admin" style="display:inline-block">Open admin demo to process ${UI.icon('arrow-up-right')}</a>
          </div>
        </aside>
      </div>`;

    const form = el.querySelector('[data-parcel-form]');
    const district = form.querySelector('[name="district"]');
    const upazila = form.querySelector('[name="upazila"]');
    const weight = form.querySelector('[name="weight"]');
    const cod = form.querySelector('[name="cod"]');
    const type = form.querySelector('[name="type"]');

    const fillUpazilas = () => {
      const list = ZR.upazilasOf(district.value);
      upazila.innerHTML = `<option value="">${list.length ? 'Select upazila' : 'Select district first'}</option>` + list.map((u) => `<option>${UI.esc(u)}</option>`).join('');
    };
    district.addEventListener('change', () => { fillUpazilas(); updateQuote(); });
    const updateQuote = () => {
      const q = ZR.pricing.quote({ type: type.value, weight: weight.value, cod: cod.value, destination: district.value || 'Dhaka' });
      const set = (k, v) => { const n = form.parentElement.querySelector(`[data-q="${k}"]`); if (n) n.textContent = v; };
      set('base', money(q.base));
      set('weight', money(q.weightCharge));
      set('remote', money(q.remoteCharge));
      set('cod', money(q.codCharge));
      set('delivery', money(q.deliveryCharge));
      set('total', money(q.total));
      set('eta', q.eta);
      const hub = S.branchForDistrict(district.value);
      set('hub', hub ? `${hub.name} (${hub.code})` : 'Nearest hub auto-assigned');
    };
    [weight, cod, type].forEach((inp) => inp.addEventListener('input', updateQuote));
    type.addEventListener('change', updateQuote);
    updateQuote();

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const valid = UI.validate(form, {
        name: [UI.validators.required],
        phone: [UI.validators.required, UI.validators.phone],
        district: [UI.validators.required],
        upazila: [UI.validators.required],
        address: [UI.validators.required, (v) => String(v).trim().length >= 6 || 'Add a little more address detail.'],
        product: [UI.validators.required],
        weight: [(v) => UI.validators.number(v, 0.1, 20)]
      });
      if (!valid) { UI.toast('Check the form', 'Some required fields need attention.', 'warn'); return; }
      const fd = new FormData(form);
      const btn = form.querySelector('button[type="submit"]');
      UI.setBusy(btn, true, 'Creating…');
      setTimeout(() => {
        const parcel = S.createParcel({
          customer: {
            name: fd.get('name'), phone: fd.get('phone'), altPhone: fd.get('altPhone') || '',
            address: fd.get('address'), district: fd.get('district'), upazila: fd.get('upazila'),
            area: fd.get('area') || `${fd.get('upazila')} Zone A`
          },
          weight: fd.get('weight'), type: fd.get('type'), cod: fd.get('cod'),
          product: fd.get('product'), notes: fd.get('notes'), pickupLocation: fd.get('pickupLocation')
        }, { merchantId: merchant.id, actor: merchant.owner });
        if (fd.get('requestPickup')) S.requestPickup([parcel.id], { merchantId: merchant.id, actor: merchant.owner });
        UI.setBusy(btn, false);
        el.querySelector('#newParcelGrid').innerHTML = `
          <div class="card card-pad-lg text-center anim-fade-up" style="grid-column:1/-1;max-width:620px;margin:0 auto">
            <div class="empty-ico" style="background:var(--success-soft);color:var(--success);border-color:rgba(13,155,108,.2);width:56px;height:56px;font-size:26px">${UI.icon('check-circle')}</div>
            <h2 style="font-size:var(--text-2xl)">Parcel created</h2>
            <p class="lead" style="font-size:var(--text-sm);margin-top:8px">${UI.esc(parcel.customer.name)} · ${UI.esc(parcel.customer.upazila)}, ${UI.esc(parcel.customer.district)}</p>
            <div class="summary-box" style="max-width:380px;margin:18px auto;text-align:left">
              <div class="summary-line"><span>Tracking number</span><strong class="mono">${parcel.tracking}</strong></div>
              <div class="summary-line"><span>Status</span><strong>${UI.statusBadge(parcel.statusKey, { short: true })}</strong></div>
              <div class="summary-line"><span>COD</span><strong>${money(parcel.cod)}</strong></div>
              <div class="summary-line"><span>Delivery charge</span><strong>${money(parcel.deliveryCharge + parcel.codCharge)}</strong></div>
            </div>
            <div class="row gap-2 center wrap">
              <a class="btn btn-primary" href="#/parcels">View parcels ${UI.icon('arrow-right')}</a>
              <button class="btn" data-again>Create another</button>
              <button class="btn" data-show>Open details</button>
            </div>
            <p class="tiny faint mt-4">${UI.icon('lightning')} It’s already visible in the admin demo — switch roles to assign a branch.</p>
          </div>`;
        el.querySelector('[data-again]').addEventListener('click', () => App.route());
        el.querySelector('[data-show]').addEventListener('click', () => openParcelDrawer(parcel.id, { refresh: () => App.refresh() }));
        UI.toast('Parcel created', `${parcel.tracking} · ${money(parcel.cod)} COD`, 'success');
      }, 520);
    });
  }

  /* ------------------------------------------------------------ bulk / CSV */
  function renderBulk(el, ctx) {
    let mode = 'manual';
    let parsed = null;
    el.innerHTML = `
      ${App.pageHead({
        title: 'Bulk parcel creation',
        crumbs: [{ label: 'Parcels', href: '#/parcels' }, { label: 'Bulk' }],
        sub: 'Add several parcels manually or import a CSV. Every row is validated before creation.',
        actions: `<button class="btn btn-sm" data-template>${UI.icon('download-simple')} CSV template</button><a class="btn btn-sm" href="#/parcels">Back to parcels</a>`
      })}
      <div class="row gap-2 mb-4">
        <div class="segmented" data-mode>
          <button data-m="manual" class="is-active">${UI.icon('list-plus')} Manual rows</button>
          <button data-m="csv">${UI.icon('file-csv')} CSV import</button>
        </div>
        <span class="tiny muted">Max 50 rows per import in this demo</span>
      </div>
      <div data-bulk-body></div>`;

    const body = el.querySelector('[data-bulk-body]');
    const templateBtn = el.querySelector('[data-template]');
    templateBtn.addEventListener('click', () => {
      UI.csv.export('zeriour-bulk-template.csv', [{
        customer_name: 'Rakibul Hasan', phone: '+8801712345678', address: 'House 12, Road 5, Dhanmondi',
        district: 'Dhaka', upazila: 'Dhanmondi', weight: 1.2, cod: 1500, product: 'Cotton panjabi (L)',
        type: 'standard', notes: ''
      }], null);
    });

    const rowHtml = (i) => `
      <tr>
        <td class="cell-tight tiny muted">${i + 1}</td>
        <td><input class="input" name="name" placeholder="Customer name" aria-label="Customer name" style="min-width:140px"></td>
        <td><input class="input" name="phone" placeholder="+8801…" aria-label="Customer phone" style="min-width:130px"></td>
        <td><select class="select" name="district" aria-label="District" style="min-width:120px"><option value="">District</option>${ZR.DISTRICTS.map((d) => `<option>${d.name}</option>`).join('')}</select></td>
        <td><input class="input" name="address" placeholder="Address" aria-label="Delivery address" style="min-width:150px"></td>
        <td><input class="input" name="weight" type="number" value="1" step="0.1" min="0.1" aria-label="Weight in kilograms" style="width:76px"></td>
        <td><input class="input" name="cod" type="number" value="0" step="50" min="0" aria-label="COD amount" style="width:92px"></td>
        <td><button type="button" class="icon-btn sm" data-remove aria-label="Remove row">${UI.icon('trash')}</button></td>
      </tr>`;

    function paint() {
      if (mode === 'manual') {
        body.innerHTML = `
          <div class="card">
            <div class="table-wrap">
              <table class="table" style="min-width:900px">
                <thead><tr><th>#</th><th>Customer</th><th>Phone</th><th>District</th><th>Address</th><th>Weight</th><th>COD</th><th></th></tr></thead>
                <tbody data-rows>${Array.from({ length: 3 }, (_, i) => rowHtml(i)).join('')}</tbody>
              </table>
            </div>
            <div class="card-foot between" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
              <button class="btn btn-sm" data-add>${UI.icon('plus')} Add row</button>
              <button class="btn btn-primary btn-sm" data-create>${UI.icon('checks')} Create parcels</button>
            </div>
          </div>
          <p class="tiny faint mt-3">${UI.icon('info')} Rows with missing customer, phone, district or address are skipped and reported.</p>`;
        const tbody = body.querySelector('[data-rows]');
        let n = 3;
        body.querySelector('[data-add]').addEventListener('click', () => {
          if (n >= 50) { UI.toast('Row limit reached', 'This demo supports 50 rows per import.', 'warn'); return; }
          tbody.insertAdjacentHTML('beforeend', rowHtml(n++));
          bindRemove();
        });
        function bindRemove() {
          tbody.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => {
            if (tbody.children.length > 1) b.closest('tr').remove();
          }));
        }
        bindRemove();
        body.querySelector('[data-create]').addEventListener('click', () => {
          const rows = Array.from(tbody.querySelectorAll('tr')).map((tr) => ({
            name: tr.querySelector('[name="name"]').value.trim(),
            phone: tr.querySelector('[name="phone"]').value.trim(),
            district: tr.querySelector('[name="district"]').value,
            address: tr.querySelector('[name="address"]').value.trim(),
            weight: tr.querySelector('[name="weight"]').value,
            cod: tr.querySelector('[name="cod"]').value,
            upazila: (ZR.upazilasOf(tr.querySelector('[name="district"]').value)[0]) || ''
          })).filter((r) => r.name || r.phone || r.address);
          if (!rows.length) { UI.toast('Nothing to create', 'Fill at least one complete row.', 'warn'); return; }
          const invalid = rows.filter((r) => !r.name || !r.phone || !r.district || !r.address);
          if (invalid.length) { UI.toast('Some rows are incomplete', `${invalid.length} row(s) skipped. Fill customer, phone, district and address.`, 'warn'); }
          const good = rows.filter((r) => r.name && r.phone && r.district && r.address);
          good.forEach((r) => S.createParcel({
            customer: { name: r.name, phone: r.phone, altPhone: '', address: r.address, district: r.district, upazila: r.upazila, area: r.upazila + ' Zone A' },
            weight: r.weight, type: 'standard', cod: r.cod, product: 'Bulk imported parcel', notes: 'Bulk creation demo', pickupLocation: merchant.store.pickupAddress
          }, { merchantId: merchant.id, actor: merchant.owner }));
          if (good.length) {
            UI.toast('Parcels created', `${good.length} parcel(s) added with status “Order created”.`, 'success');
            setTimeout(() => App.go('parcels'), 700);
          }
        });
      } else {
        body.innerHTML = `
          <div class="grid g-2" style="gap:16px;align-items:start" id="csvGrid">
            <div class="card">
              <div class="card-head"><div><h3>Import a CSV</h3><p class="sub">Header row required · phone in +880 or 01 format</p></div><span class="badge badge-neutral">.csv</span></div>
              <div class="card-body">
                <div class="upload-zone" data-drop>
                  ${UI.icon('upload-simple')}
                  <div class="small strong mt-2">Drop your CSV here</div>
                  <div class="tiny muted">or click to browse — max 1 MB</div>
                  <input type="file" accept=".csv,text/csv" hidden data-file>
                </div>
                <div class="row gap-3 mt-4"><span class="grow" style="height:1px;background:var(--line)"></span><span class="tiny faint">or paste rows</span><span class="grow" style="height:1px;background:var(--line)"></span></div>
                <textarea class="textarea mt-3 mono" rows="5" data-paste placeholder="customer_name,phone,address,district,upazila,weight,cod&#10;Rakibul Hasan,+8801712345678,House 12 Road 5,Dhaka,Dhanmondi,1.2,1500" style="font-size:11px"></textarea>
                <div class="row gap-2 mt-3"><button class="btn btn-primary btn-sm" data-parse>${UI.icon('table')} Parse & preview</button><button class="btn btn-sm" data-fill-demo>Load sample rows</button></div>
                <div class="hint mt-3">Expected headers: customer_name, phone, address, district, upazila, weight, cod, product, type, notes</div>
              </div>
            </div>
            <div class="card">
              <div class="card-head"><div><h3>Preview</h3><p class="sub">Validate before importing</p></div><span class="badge badge-neutral" data-prev-count>No file</span></div>
              <div class="card-body" data-preview>${UI.empty({ icon: 'ph-file-csv', title: 'Nothing to preview', body: 'Upload a CSV or paste rows to see the parsed table.' })}</div>
            </div>
          </div>`;
        const drop = body.querySelector('[data-drop]');
        const fileInput = body.querySelector('[data-file]');
        const preview = body.querySelector('[data-preview]');
        const prevCount = body.querySelector('[data-prev-count]');
        const paste = body.querySelector('[data-paste]');

        const parseText = (text) => {
          parsed = UI.csv.parse(text);
          if (!parsed.rows.length) { preview.innerHTML = UI.empty({ icon: 'ph-warning', title: 'No rows found', body: 'Make sure the first row contains column headers.' }); prevCount.textContent = 'No rows'; return; }
          prevCount.textContent = `${parsed.rows.length} rows`;
          const cols = parsed.headers.slice(0, 7);
          preview.innerHTML = `<div class="table-wrap"><table class="table table-compact">
            <thead><tr>${cols.map((h) => `<th>${UI.esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${parsed.rows.slice(0, 8).map((r) => `<tr>${cols.map((h) => `<td class="tiny">${UI.esc(r[h] || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
            ${parsed.rows.length > 8 ? `<div class="tiny muted mt-2">Showing 8 of ${parsed.rows.length} rows</div>` : ''}
            <div class="row gap-2 mt-4"><button class="btn btn-primary btn-sm" data-import>${UI.icon('checks')} Import ${parsed.rows.length} parcels</button><span class="tiny muted">Rows missing required fields are skipped.</span></div>`;
          preview.querySelector('[data-import]').addEventListener('click', () => {
            let created = 0, skipped = 0;
            parsed.rows.slice(0, 50).forEach((r) => {
              const name = r.customer_name || r.name;
              const phone = r.phone;
              const district = r.district;
              const address = r.address;
              if (!name || !phone || !district || !address || !ZR.DISTRICT_MAP[district]) { skipped++; return; }
              const upazila = r.upazila && ZR.upazilasOf(district).includes(r.upazila) ? r.upazila : ZR.upazilasOf(district)[0];
              S.createParcel({
                customer: { name, phone, altPhone: r.alt_phone || '', address, district, upazila, area: upazila + ' Zone A' },
                weight: r.weight || 1, type: (r.type || 'standard').toLowerCase(), cod: r.cod || 0,
                product: r.product || 'CSV imported parcel', notes: r.notes || '',
                pickupLocation: merchant.store.pickupAddress
              }, { merchantId: merchant.id, actor: merchant.owner });
              created++;
            });
            UI.toast('Import complete', `${created} created${skipped ? `, ${skipped} skipped` : ''}.`, created ? 'success' : 'warn');
            if (created) setTimeout(() => App.go('parcels'), 800);
          });
        };

        if (paste) paste.addEventListener('input', () => { if (!paste.value.trim()) { parsed = null; prevCount.textContent = 'No file'; preview.innerHTML = UI.empty({ icon: 'ph-file-csv', title: 'Nothing to preview', body: 'Upload a CSV or paste rows to see the parsed table.' }); } });
        body.querySelector('[data-parse]').addEventListener('click', () => {
          if (!paste.value.trim()) { UI.toast('Nothing to parse', 'Paste CSV rows or upload a file first.', 'warn'); return; }
          parseText(paste.value);
        });
        body.querySelector('[data-fill-demo]').addEventListener('click', () => {
          paste.value = 'customer_name,phone,address,district,upazila,weight,cod,product,type,notes\nTanvir Ahmed,+8801711234567,House 22 Road 7,Dhaka,Mirpur,1.5,2200,Cotton panjabi,standard,\nSharmin Akter,+8801812345678,House 9 Road 2,Chattogram,Panchlaish,0.8,950,Handloom saree,express,Fragile\nAbdul Karim,+8801912345678,Village Bazar Road,Sylhet,Sylhet Sadar,2.1,3400,Tea sampler set,standard,';
          UI.toast('Sample rows loaded', 'Click “Parse & preview” to continue.', 'info');
        });
        const handleFile = (file) => {
          if (!file) return;
          if (file.size > 1024 * 1024) { UI.toast('File too large', 'Keep the CSV under 1 MB.', 'warn'); return; }
          const reader = new FileReader();
          reader.onload = () => { paste.value = String(reader.result || '').slice(0, 20000); parseText(paste.value); };
          reader.readAsText(file);
        };
        fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
        drop.addEventListener('click', () => fileInput.click());
        ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragover'); }));
        ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragover'); }));
        drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
      }
    }
    el.querySelectorAll('[data-mode] button').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.m;
      el.querySelectorAll('[data-mode] button').forEach((x) => x.classList.toggle('is-active', x === b));
      paint();
    }));
    paint();
  }

  /* --------------------------------------------------------------- finance */
  function withdrawModal(ctx) {
    const m = S.merchant(merchant.id);
    UI.modal({
      title: 'Request a withdrawal',
      subtitle: 'Simulated payout request · admin approval required',
      body: `
        <div class="alert info mb-4">${UI.icon('info')}<div>Available balance: <strong>${money(m.balance)}</strong>. Requests are reviewed by the admin demo and settle within one business day.</div></div>
        <form data-wd-form class="form-grid">
          <div class="field full"><label class="label" for="wdAmount">Amount (৳)</label>
            <div class="input-group prefix"><span class="addon">৳</span><input class="input" id="wdAmount" name="amount" type="number" min="100" step="100" value="${Math.min(10000, Math.floor(m.balance / 100) * 100)}" inputmode="numeric"></div>
            <span class="error-text" hidden></span>
            <div class="row gap-2 mt-2">
              ${[25, 50, 100].map((p) => `<button type="button" class="badge badge-neutral" data-pct="${p}" style="cursor:pointer">${p === 100 ? 'Full balance' : p + '%'}</button>`).join('')}
            </div>
          </div>
          <div class="field full"><label class="label">Payout method</label>
            <select class="select" name="method"><option>bKash Merchant</option><option>Nagad</option><option>Bank Transfer</option></select>
          </div>
          <div class="field full"><label class="label">Account / number</label><input class="input" name="account" placeholder="bKash number or bank account"><span class="error-text" hidden></span></div>
        </form>
        <p class="tiny faint mt-4">${UI.icon('flask')} No real money moves. The request appears in the admin withdrawal queue.</p>`,
      footer: `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-submit>Request withdrawal</button>`,
      onMount(root, close) {
        const form = root.querySelector('[data-wd-form]');
        const amount = form.querySelector('[name="amount"]');
        root.querySelectorAll('[data-pct]').forEach((b) => b.addEventListener('click', () => { amount.value = Math.floor(m.balance * (+b.dataset.pct) / 100 / 100) * 100; }));
        root.querySelector('[data-submit]').addEventListener('click', () => {
          const valid = UI.validate(form, {
            amount: [(v) => UI.validators.number(v, 100, m.balance)],
            account: [UI.validators.required]
          });
          if (!valid) return;
          const res = S.requestWithdrawal(merchant.id, +amount.value, form.querySelector('[name="method"]').value, form.querySelector('[name="account"]').value, { actor: merchant.owner });
          if (!res.ok) { UI.toast('Withdrawal failed', res.error, 'error'); return; }
          UI.toast('Withdrawal requested', `${money(+amount.value)} · awaiting admin approval`, 'success');
          close();
          if (ctx) ctx.refresh();
        });
      }
    });
  }

  function renderFinance(el, ctx) {
    const stats = S.statsMerchant(merchant.id);
    const delivered = merchantParcels().filter((p) => p.statusKey === 'delivered').sort((a, b) => new Date(b.deliveredAt || b.updatedAt) - new Date(a.deliveredAt || a.updatedAt));
    const txns = S.state.transactions.filter((t) => t.merchantId === merchant.id).slice(0, 40);
    const wds = S.state.withdrawals.filter((w) => w.merchantId === merchant.id);
    const feeTotal = delivered.reduce((s, p) => s + p.codCharge + p.deliveryCharge, 0);

    el.innerHTML = `
      ${App.pageHead({
        title: 'Finance & COD',
        sub: 'Settlement statements, transaction history and withdrawal requests.',
        actions: `<button class="btn btn-sm" data-export-statement>${UI.icon('download-simple')} Download statement</button><button class="btn btn-sm btn-primary" data-withdraw>${UI.icon('bank')} Request withdrawal</button>`
      })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Available balance', value: money(stats.balance), icon: 'wallet', tone: 'success', foot: 'ready to withdraw' })}
        ${kpi({ label: 'Pending settlement', value: money(stats.pending), icon: 'hourglass', tone: 'warn', foot: 'in transit / COD pending' })}
        ${kpi({ label: 'COD collected', value: money(stats.codCollected), icon: 'coins', foot: `${delivered.length} delivered parcels` })}
        ${kpi({ label: 'Fees & charges', value: money(feeTotal), icon: 'receipt', tone: 'sky', foot: 'delivery + COD fees' })}
      </div>

      <div class="tabs mb-4" data-finance-tabs>
        <button class="tab is-active" data-tab="statement">COD statement <span class="count">${delivered.length}</span></button>
        <button class="tab" data-tab="transactions">Transactions <span class="count">${txns.length}</span></button>
        <button class="tab" data-tab="withdrawals">Withdrawals <span class="count">${wds.length}</span></button>
      </div>

      <div data-panel="statement">
        <div class="card">
          <div class="card-head"><div><h3>COD settlement statement</h3><p class="sub">Per-parcel collection and deduction · ${UI.date(new Date(Date.now() - 30 * 86400000))} to ${UI.date(new Date())}</p></div>
            <span class="badge badge-success"><i class="dot"></i>Reconciled</span></div>
          <div class="table-wrap">
            <table class="table table-compact">
              <thead><tr><th>Tracking</th><th>Delivered</th><th class="cell-num">COD</th><th class="cell-num">COD fee</th><th class="cell-num">Delivery</th><th class="cell-num">Net</th><th>Status</th></tr></thead>
              <tbody>${delivered.length ? delivered.slice(0, 15).map((p) => {
                const net = Math.max(0, (p.codCollected || p.cod) - p.codCharge - p.deliveryCharge);
                return `<tr data-open="${p.id}" style="cursor:pointer">
                  <td><span class="tracking-code">${p.tracking}</span></td>
                  <td class="tiny muted">${UI.date(p.deliveredAt || p.updatedAt)}</td>
                  <td class="cell-num">${money(p.codCollected || p.cod)}</td>
                  <td class="cell-num" style="color:var(--danger)">−${money(p.codCharge)}</td>
                  <td class="cell-num" style="color:var(--danger)">−${money(p.deliveryCharge)}</td>
                  <td class="cell-num cell-strong">${money(net)}</td>
                  <td><span class="badge badge-success"><i class="dot"></i>Settled</span></td>
                </tr>`;
              }).join('') : `<tr><td colspan="7">${UI.empty({ icon: 'ph-wallet', title: 'No settled COD yet', body: 'COD rows appear once your parcels are delivered in the demo.' })}</td></tr>`}</tbody>
            </table>
          </div>
          <div class="card-foot between" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <span class="tiny muted">Showing latest ${Math.min(15, delivered.length)} settled parcels</span>
            <span class="small strong">Lifetime COD ${money(stats.codCollected)}</span>
          </div>
        </div>
      </div>

      <div data-panel="transactions" hidden>
        <div class="card">
          <div class="card-head"><div><h3>Transaction history</h3><p class="sub">COD collections, delivery charges and payouts</p></div><a class="link tiny" href="#/transactions">Open full ledger ${UI.icon('arrow-right')}</a></div>
          <div class="table-wrap">
            <table class="table table-compact">
              <thead><tr><th>Reference</th><th>Type</th><th>Date</th><th class="cell-num">Amount</th><th>Status</th></tr></thead>
              <tbody>${txns.slice(0, 10).map((t) => `<tr>
                <td class="mono tiny">${UI.esc(t.reference || t.id)}</td>
                <td class="tiny">${UI.esc(String(t.type).replace(/_/g, ' '))}${t.note ? `<div class="tiny faint">${UI.esc(t.note)}</div>` : ''}</td>
                <td class="tiny muted">${UI.date(t.date)}</td>
                <td class="cell-num ${t.amount < 0 ? '' : 'cell-strong'}" style="color:${t.amount < 0 ? 'var(--muted)' : 'var(--success)'}">${t.amount < 0 ? '−' : '+'}${money(Math.abs(t.amount))}</td>
                <td>${UI.userBadge(t.status)}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div data-panel="withdrawals" hidden>
        <div class="card">
          <div class="card-head"><div><h3>Withdrawal requests</h3><p class="sub">Approved by the admin demo · paid to your account</p></div><button class="btn btn-sm btn-primary" data-withdraw>New request</button></div>
          <div class="table-wrap">
            <table class="table table-compact">
              <thead><tr><th>Request</th><th>Method</th><th>Account</th><th>Date</th><th class="cell-num">Amount</th><th>Status</th></tr></thead>
              <tbody>${wds.length ? wds.map((w) => `<tr>
                <td class="mono tiny">${UI.esc(w.id.toUpperCase())}</td>
                <td class="tiny">${UI.esc(w.method)}</td>
                <td class="tiny muted">${UI.esc(w.account)}</td>
                <td class="tiny muted">${UI.date(w.date)}</td>
                <td class="cell-num cell-strong">${money(w.amount)}</td>
                <td>${UI.userBadge(w.status)}</td>
              </tr>`).join('') : `<tr><td colspan="6">${UI.empty({ icon: 'ph-bank', title: 'No withdrawals yet', body: 'Your available balance can be withdrawn at any time.', action: '<button class="btn btn-sm btn-primary" data-withdraw>Request withdrawal</button>' })}</td></tr>`}</tbody>
            </table>
          </div>
          <div class="card-foot tiny muted">${UI.icon('info')} Payouts are simulated. Approval happens in the admin dashboard → Withdrawals.</div>
        </div>
      </div>`;

    el.querySelectorAll('[data-finance-tabs] .tab').forEach((tab) => tab.addEventListener('click', () => {
      el.querySelectorAll('[data-finance-tabs] .tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      el.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    }));
    el.querySelectorAll('[data-withdraw]').forEach((b) => b.addEventListener('click', () => withdrawModal(ctx)));
    el.querySelectorAll('[data-open]').forEach((tr) => tr.addEventListener('click', () => openParcelDrawer(tr.dataset.open, ctx)));
    el.querySelector('[data-export-statement]').addEventListener('click', () => {
      UI.csv.export('zeriour-cod-statement.csv', delivered, [
        { key: 'tracking', label: 'Tracking' },
        { key: 'date', label: 'Delivered', value: (p) => UI.date(p.deliveredAt || p.updatedAt) },
        { key: 'cod', label: 'COD collected', value: (p) => p.codCollected || p.cod },
        { key: 'fee', label: 'COD fee', value: (p) => p.codCharge },
        { key: 'delivery', label: 'Delivery charge', value: (p) => p.deliveryCharge },
        { key: 'net', label: 'Net payable', value: (p) => (p.codCollected || p.cod) - p.codCharge - p.deliveryCharge }
      ]);
    });
  }

  function renderTransactions(el, ctx) {
    const rows = S.state.transactions.filter((t) => t.merchantId === merchant.id);
    el.innerHTML = `
      ${App.pageHead({ title: 'Transaction ledger', sub: 'Every COD collection, delivery deduction and payout in one place.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export ledger</button>` })}
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Transactions',
      searchPlaceholder: 'Search reference or type…',
      searchFields: ['reference', 'type', 'note'],
      pageSize: 12,
      filters: [{
        key: 'type', label: 'Type', options: [
          { value: 'cod_collection', label: 'COD collection' },
          { value: 'delivery_charge', label: 'Delivery charge' },
          { value: 'payout', label: 'Payout' }
        ]
      }],
      defaultSort: (a, b) => new Date(b.date) - new Date(a.date),
      columns: [
        { key: 'reference', label: 'Reference', render: (t) => `<span class="mono tiny">${UI.esc(t.reference || t.id)}</span>` },
        { key: 'type', label: 'Description', render: (t) => `<div class="cell-strong" style="text-transform:capitalize">${UI.esc(String(t.type).replace(/_/g, ' '))}</div><div class="tiny muted">${UI.esc(t.note || '')}</div>` },
        { key: 'date', label: 'Date', render: (t) => `<span class="tiny muted">${UI.dateTime(t.date)}</span>`, sortValue: (t) => new Date(t.date).getTime() },
        { key: 'amount', label: 'Amount', align: 'right', render: (t) => `<span class="num" style="font-weight:600;color:${t.amount < 0 ? 'var(--muted)' : 'var(--success)'}">${t.amount < 0 ? '−' : '+'}${money(Math.abs(t.amount))}</span>` },
        { key: 'status', label: 'Status', render: (t) => UI.userBadge(t.status) }
      ]
    });
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-ledger.csv', rows, [
      { key: 'reference', label: 'Reference' }, { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date', value: (t) => UI.dateTime(t.date) }, { key: 'note', label: 'Note' }
    ]));
  }

  /* --------------------------------------------------------------- pickups */
  function renderPickups(el, ctx) {
    const stats = S.statsMerchant(merchant.id);
    const list = S.state.pickups.filter((p) => p.merchantId === merchant.id);
    el.innerHTML = `
      ${App.pageHead({ title: 'Pickup requests', sub: 'Book a rider to collect parcels from your store.', actions: `<button class="btn btn-sm btn-primary" data-request>${UI.icon('hand-arrow-up')} Request pickup</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Awaiting pickup', value: UI.num(stats.pendingPickup), icon: 'package', tone: 'warn', foot: 'parcels not collected' })}
        ${kpi({ label: 'Open requests', value: UI.num(list.filter((p) => p.status === 'pending').length), icon: 'hand-arrow-up', foot: 'pickup bookings' })}
        ${kpi({ label: 'Picked this week', value: UI.num(list.filter((p) => p.status === 'picked').length), icon: 'check-circle', tone: 'success', foot: 'completed pickups' })}
        ${kpi({ label: 'Avg. pickup time', value: '4h 20m', icon: 'clock', tone: 'sky', foot: 'from request to scan' })}
      </div>
      <div class="grid" style="grid-template-columns:1.5fr 1fr;gap:16px;align-items:start" id="pickupGrid">
        <div class="card">
          <div class="card-head"><div><h3>Pickup bookings</h3><p class="sub">All pickup requests for your store</p></div></div>
          <div class="table-wrap">
            <table class="table table-compact">
              <thead><tr><th>Booking</th><th>Date & window</th><th class="cell-num">Parcels</th><th>Status</th><th></th></tr></thead>
              <tbody>${list.length ? list.map((p) => `<tr>
                <td><div class="cell-strong mono">${p.id.toUpperCase()}</div><div class="tiny muted truncate" style="max-width:220px">${UI.esc(p.address)}</div></td>
                <td><div class="tiny">${UI.date(p.date)}</div><div class="tiny muted">${UI.esc(p.window)}</div></td>
                <td class="cell-num">${p.parcelCount}</td>
                <td>${UI.userBadge(p.status)}</td>
                <td class="cell-actions"><button class="icon-btn sm" data-view="${p.id}" aria-label="Pickup details">${UI.icon('eye')}</button></td>
              </tr>`).join('') : `<tr><td colspan="5">${UI.empty({ icon: 'ph-hand-arrow-up', title: 'No pickups booked', body: 'Request a pickup when you have parcels ready.', action: '<button class="btn btn-sm btn-primary" data-request>Request pickup</button>' })}</td></tr>`}</tbody>
            </table>
          </div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-info"></i> Pickup windows</h4>
            <p class="tiny muted mt-2" style="line-height:1.6">Riders collect from your pickup address inside the selected window. Requests made after 17:00 roll into the next working day.</p>
            <div class="stack gap-2 mt-3">
              <div class="between tiny"><span>10:00 – 13:00</span><span class="badge badge-success">Available</span></div>
              <div class="between tiny"><span>14:00 – 17:00</span><span class="badge badge-success">Available</span></div>
              <div class="between tiny"><span>16:00 – 19:00</span><span class="badge badge-warn">Limited</span></div>
            </div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-map-pin"></i> Pickup address</h4>
            <p class="small mt-2">${UI.esc(merchant.store.pickupAddress)}</p>
            <div class="row gap-2 mt-3"><span class="badge badge-neutral">${UI.esc(merchant.district)}</span><span class="badge badge-neutral">Default</span></div>
            <a class="link tiny mt-3" href="#/stores" style="display:inline-block">Manage store addresses ${UI.icon('arrow-right')}</a>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-request]').forEach((b) => b.addEventListener('click', () => pickupModal(ctx)));
    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      const p = list.find((x) => x.id === b.dataset.view);
      if (!p) return;
      UI.modal({
        title: 'Pickup ' + p.id.toUpperCase(),
        body: `<div class="kv-grid">
          <div class="kv"><div class="k">Status</div><div class="v">${UI.userBadge(p.status)}</div></div>
          <div class="kv"><div class="k">Parcels</div><div class="v">${p.parcelCount}</div></div>
          <div class="kv"><div class="k">Date</div><div class="v">${UI.date(p.date)}</div></div>
          <div class="kv"><div class="k">Window</div><div class="v">${UI.esc(p.window)}</div></div>
          <div class="kv" style="grid-column:1/-1"><div class="k">Address</div><div class="v">${UI.esc(p.address)}</div></div>
        </div>`,
        footer: '<button class="btn" data-close>Close</button>'
      });
    }));
  }

  function pickupModal(ctx) {
    const eligible = merchantParcels().filter((p) => p.status <= 1);
    UI.modal({
      title: 'Request a pickup',
      subtitle: 'Select parcels ready for collection',
      size: 'wide',
      body: `
        ${eligible.length ? `
        <div class="row gap-2 mb-3"><button class="btn btn-sm" data-all>Select all</button><span class="tiny muted">${eligible.length} parcels awaiting pickup</span></div>
        <div class="table-wrap" style="max-height:300px;overflow:auto">
          <table class="table table-compact">
            <thead><tr><th></th><th>Tracking</th><th>Customer</th><th>District</th><th class="cell-num">COD</th></tr></thead>
            <tbody>${eligible.map((p) => `<tr>
              <td><input type="checkbox" name="pick" value="${p.id}" checked aria-label="Select ${p.tracking}"></td>
              <td class="mono tiny">${p.tracking}</td><td class="tiny">${UI.esc(p.customer.name)}</td><td class="tiny muted">${UI.esc(p.customer.district)}</td><td class="cell-num tiny">${money(p.cod)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="field mt-4"><label class="label">Pickup window</label><select class="select" name="window"><option>10:00 – 13:00</option><option>14:00 – 17:00</option><option>16:00 – 19:00</option></select></div>
        <div class="field mt-3"><label class="label">Pickup address</label><input class="input" name="address" value="${UI.esc(merchant.store.pickupAddress)}"></div>`
        : UI.empty({ icon: 'ph-check-circle', title: 'Nothing awaiting pickup', body: 'All your parcels are already in the network. Create a parcel first.' })}`,
      footer: eligible.length ? `<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-send>Request pickup</button>` : '<button class="btn" data-close>Close</button>',
      onMount(root, close) {
        const all = root.querySelector('[data-all]');
        if (all) all.addEventListener('click', () => root.querySelectorAll('[name="pick"]').forEach((c) => { c.checked = true; }));
        const send = root.querySelector('[data-send]');
        if (send) send.addEventListener('click', () => {
          const ids = Array.from(root.querySelectorAll('[name="pick"]:checked')).map((c) => c.value);
          if (!ids.length) { UI.toast('Select parcels', 'Choose at least one parcel for pickup.', 'warn'); return; }
          S.requestPickup(ids, { merchantId: merchant.id, window: root.querySelector('[name="window"]').value, actor: merchant.owner });
          UI.toast('Pickup requested', `${ids.length} parcel(s) · rider will be assigned by the branch.`, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  /* --------------------------------------------------------------- returns */
  function renderReturns(el, ctx) {
    const rows = merchantParcels().filter((p) => [9, 10, 11].includes(p.status));
    el.innerHTML = `
      ${App.pageHead({ title: 'Returns & failed deliveries', sub: 'Every failed attempt with its reason, and the return status of each parcel.', actions: `<a class="btn btn-sm" href="#/parcels">All parcels</a>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Failed attempts', value: UI.num(rows.filter((p) => p.statusKey === 'failed').length), icon: 'x-circle', tone: 'danger', foot: 'needs a retry' })}
        ${kpi({ label: 'Return initiated', value: UI.num(rows.filter((p) => p.statusKey === 'return_initiated').length), icon: 'arrow-u-up-left', tone: 'warn', foot: 'on the way back' })}
        ${kpi({ label: 'Returned to you', value: UI.num(rows.filter((p) => p.statusKey === 'returned').length), icon: 'arrow-counter-clockwise', foot: 'received back' })}
        ${kpi({ label: 'Return rate', value: (merchantParcels().length ? (rows.length / merchantParcels().length * 100).toFixed(1) : 0) + '%', icon: 'percent', tone: 'sky', foot: 'of all parcels' })}
      </div>
      ${rows.length ? `<div class="grid" style="grid-template-columns:1.5fr 1fr;gap:16px;align-items:start" id="returnsGrid">
        <div class="card">
          <div class="card-head"><div><h3>Return queue</h3><p class="sub">${rows.length} parcels need attention</p></div></div>
          <div class="table-wrap"><table class="table table-compact">
            <thead><tr><th>Tracking</th><th>Customer</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows.map((p) => `<tr>
              <td><span class="tracking-code">${p.tracking}</span></td>
              <td><div class="tiny strong">${UI.esc(p.customer.name)}</div><div class="tiny muted">${UI.esc(p.customer.upazila)}</div></td>
              <td class="tiny muted" style="max-width:220px">${UI.esc(p.returnReason || 'Delivery attempt failed')}</td>
              <td>${UI.statusBadge(p.statusKey, { short: true })}</td>
              <td class="cell-actions"><button class="icon-btn sm" data-view="${p.id}" aria-label="View parcel">${UI.icon('eye')}</button></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div class="card card-pad">
          <h4 style="font-size:var(--text-sm)"><i class="ph ph-lightbulb"></i> Reduce returns</h4>
          <p class="tiny muted mt-2" style="line-height:1.6">Most failed deliveries in the demo dataset are caused by unreachable customers. Confirming phone numbers before dispatch is the single biggest improvement.</p>
          <div class="stack gap-2 mt-3 tiny">
            <div class="row gap-2"><i class="ph ph-check-circle" style="color:var(--success)"></i> Add an alternative phone number</div>
            <div class="row gap-2"><i class="ph ph-check-circle" style="color:var(--success)"></i> Use clear delivery instructions</div>
            <div class="row gap-2"><i class="ph ph-check-circle" style="color:var(--success)"></i> Keep COD amounts accurate</div>
          </div>
          <button class="btn btn-sm btn-outline-primary btn-block mt-4" data-redispatch>Request re-dispatch</button>
        </div>
      </div>` : `<div class="card">${UI.empty({ icon: 'ph-check-circle', title: 'No returns in your account', body: 'Failed deliveries and returns will appear here with their reason codes.' })}</div>`}`;

    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => openParcelDrawer(b.dataset.view, ctx)));
    const re = el.querySelector('[data-redispatch]');
    if (re) re.addEventListener('click', () => {
      const failed = rows.find((p) => p.statusKey === 'failed');
      if (!failed) { UI.toast('Nothing to re-dispatch', 'No failed parcel is currently eligible.', 'info'); return; }
      const dup = S.createParcel({
        customer: { ...failed.customer }, weight: failed.weight, type: failed.type, cod: failed.cod,
        product: failed.product, notes: 'Re-dispatch of ' + failed.tracking, pickupLocation: failed.pickupLocation
      }, { merchantId: merchant.id, actor: merchant.owner });
      UI.toast('Re-dispatch created', `${dup.tracking} created for ${failed.customer.name}`, 'success');
      ctx.refresh();
    });
  }

  /* ------------------------------------------------------------- customers */
  function renderCustomers(el, ctx) {
    const map = new Map();
    merchantParcels().forEach((p) => {
      const key = p.customer.phone;
      if (!map.has(key)) map.set(key, { id: key, name: p.customer.name, phone: key, altPhone: p.customer.altPhone, district: p.customer.district, upazila: p.customer.upazila, address: p.customer.address, count: 0, delivered: 0, cod: 0, last: p.createdAt });
      const c = map.get(key);
      c.count += 1;
      if (p.statusKey === 'delivered') { c.delivered += 1; c.cod += p.cod; }
      if (new Date(p.createdAt) > new Date(c.last)) c.last = p.createdAt;
    });
    const rows = Array.from(map.values()).sort((a, b) => new Date(b.last) - new Date(a.last));
    el.innerHTML = `
      ${App.pageHead({ title: 'Customers', sub: 'Recipients derived from your parcel history. Every address is reusable when creating a parcel.', actions: `<a class="btn btn-sm" href="#/parcels/new">${UI.icon('plus')} New parcel</a>` })}
      <div class="grid g-3 mb-5">
        ${kpi({ label: 'Unique customers', value: UI.num(rows.length), icon: 'users', foot: 'in your account' })}
        ${kpi({ label: 'Repeat customers', value: UI.num(rows.filter((r) => r.count > 1).length), icon: 'arrows-clockwise', tone: 'violet', foot: '2+ orders' })}
        ${kpi({ label: 'Delivered value', value: money(rows.reduce((s, r) => s + r.cod, 0)), icon: 'coins', tone: 'success', foot: 'COD across customers' })}
      </div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Customers',
      searchPlaceholder: 'Search name, phone or district…',
      searchFields: ['name', 'phone', 'district', 'upazila'],
      pageSize: 12,
      columns: [
        { key: 'name', label: 'Customer', render: (c) => `<div class="user-cell"><span class="avatar sm">${UI.initials(c.name)}</span><div><div class="name">${UI.esc(c.name)}</div><div class="meta">${UI.esc(c.phone)}</div></div></div>` },
        { key: 'district', label: 'Location', render: (c) => `<div class="tiny">${UI.esc(c.upazila)}</div><div class="tiny muted">${UI.esc(c.district)}</div>` },
        { key: 'count', label: 'Parcels', align: 'right', render: (c) => `<span class="num">${c.count}</span>` },
        { key: 'delivered', label: 'Delivered', align: 'right', render: (c) => `<span class="num">${c.delivered}</span>` },
        { key: 'cod', label: 'COD value', align: 'right', render: (c) => `<span class="num">${money(c.cod)}</span>` },
        { key: 'last', label: 'Last order', render: (c) => `<span class="tiny muted">${UI.relative(c.last)}</span>`, sortValue: (c) => new Date(c.last).getTime() }
      ],
      onRow: (c) => {
        const history = merchantParcels().filter((p) => p.customer.phone === c.phone);
        UI.drawer({
          title: c.name,
          subtitle: `${c.phone} · ${c.district}`,
          body: `
            <div class="card card-pad mb-4"><div class="kv-grid">
              <div class="kv"><div class="k">Phone</div><div class="v">${UI.esc(c.phone)}</div></div>
              <div class="kv"><div class="k">Alternative</div><div class="v">${UI.esc(c.altPhone || '—')}</div></div>
              <div class="kv" style="grid-column:1/-1"><div class="k">Address</div><div class="v">${UI.esc(c.address)}, ${UI.esc(c.upazila)}, ${UI.esc(c.district)}</div></div>
            </div></div>
            <div class="detail-section"><div class="ds-head"><h4>Parcel history</h4><span class="badge badge-neutral">${history.length}</span></div>
              <div class="table-wrap"><table class="table table-compact"><thead><tr><th>Tracking</th><th>Status</th><th class="cell-num">COD</th></tr></thead>
              <tbody>${history.map((p) => `<tr><td class="mono tiny">${p.tracking}</td><td>${UI.statusBadge(p.statusKey, { short: true })}</td><td class="cell-num tiny">${money(p.cod)}</td></tr>`).join('')}</tbody></table></div>
            </div>`,
          footer: `<button class="btn btn-sm" data-copy>${UI.icon('copy')} Copy phone</button><a class="btn btn-sm btn-primary" href="#/parcels/new">Create parcel</a>`,
          onMount(root) { root.querySelector('[data-copy]').addEventListener('click', () => UI.copy(c.phone, 'Phone copied')); }
        });
      }
    });
  }

  /* ---------------------------------------------------------------- stores */
  function renderStores(el, ctx) {
    const extra = merchant.store.extraAddresses || [];
    el.innerHTML = `
      ${App.pageHead({ title: 'Store & pickup addresses', sub: 'Control the name, subdomain and addresses used on labels and pickups.', actions: `<button class="btn btn-sm btn-primary" data-edit>${UI.icon('pencil-simple')} Edit store</button>` })}
      <div class="grid" style="grid-template-columns:1.4fr 1fr;gap:16px;align-items:start" id="storeGrid">
        <div class="card">
          <div class="profile-cover" style="height:80px"></div>
          <div class="card-body" style="margin-top:-26px">
            <div class="row gap-3" style="align-items:flex-end">
              <span class="avatar xl tone-dark" style="border:3px solid var(--surface)">${UI.initials(merchant.name)}</span>
              <div class="grow" style="padding-bottom:2px"><h3 style="font-size:var(--text-lg)">${UI.esc(merchant.name)}</h3><div class="tiny muted">${UI.esc(merchant.businessType)} · ${UI.esc(merchant.district)}</div></div>
              ${UI.userBadge(merchant.status)}
            </div>
            <div class="grid g-2 mt-4" style="gap:12px">
              <div class="kv"><div class="k">Store subdomain</div><div class="v mono tiny">${UI.esc(merchant.store.subdomain)}</div></div>
              <div class="kv"><div class="k">Commission plan</div><div class="v">${merchant.commission}% ${UI.esc(merchant.plan)}</div></div>
              <div class="kv" style="grid-column:1/-1"><div class="k">Registered address</div><div class="v">${UI.esc(merchant.address)}, ${UI.esc(merchant.district)}</div></div>
            </div>
            <div class="divider" style="margin-block:16px"></div>
            <div class="between mb-3"><h4 style="font-size:var(--text-sm)">Pickup addresses</h4><button class="btn btn-sm" data-add-address>${UI.icon('plus')} Add address</button></div>
            <div class="stack gap-2">
              <div class="row gap-3" style="padding:11px 12px;border:1px solid var(--line);border-radius:var(--r-md)">
                <span class="kpi-ico"><i class="ph ph-map-pin"></i></span>
                <div class="grow"><div class="small strong">${UI.esc(merchant.store.pickupAddress)}</div><div class="tiny muted">Primary pickup · ${UI.esc(merchant.district)}</div></div>
                <span class="badge badge-success">Default</span>
              </div>
              ${extra.map((a, i) => `<div class="row gap-3" style="padding:11px 12px;border:1px solid var(--line);border-radius:var(--r-md)">
                <span class="kpi-ico"><i class="ph ph-map-pin"></i></span>
                <div class="grow"><div class="small strong">${UI.esc(a)}</div><div class="tiny muted">Additional pickup address</div></div>
                <button class="icon-btn sm" data-remove-address="${i}" aria-label="Remove address">${UI.icon('trash')}</button>
              </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-storefront"></i> Store setup</h4>
            <div class="summary-line"><span>Return address</span><strong class="tiny" style="text-align:right;max-width:60%">${UI.esc(merchant.store.returnAddress || merchant.address)}</strong></div>
            <div class="summary-line"><span>Default service</span><strong>Standard</strong></div>
            <div class="summary-line"><span>COD enabled</span><strong><span class="badge badge-success">Yes</span></strong></div>
            <div class="summary-line"><span>Weekly volume</span><strong>${UI.esc((merchant.application && merchant.application.volume) || '—')}</strong></div>
            <button class="btn btn-soft btn-sm btn-block mt-3" data-edit>Edit store details</button>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-truck"></i> Pickup preferences</h4>
            <p class="tiny muted mt-2" style="line-height:1.6">Riders collect from the default address unless you choose another when requesting a pickup.</p>
            <label class="switch mt-3"><input type="checkbox" checked><span class="tiny">SMS when a rider is on the way</span></label>
            <label class="switch mt-3"><input type="checkbox"><span class="tiny">Auto-request pickup on parcel creation</span></label>
          </div>
        </div>
      </div>`;

    const refresh = () => ctx.refresh();
    el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
      UI.modal({
        title: 'Edit store',
        size: 'wide',
        body: `<form data-store-form class="form-grid">
          <div class="field"><label class="label">Store name</label><input class="input" name="name" value="${UI.esc(merchant.store.name)}"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Business type</label><input class="input" name="businessType" value="${UI.esc(merchant.businessType)}"></div>
          <div class="field full"><label class="label">Pickup address</label><input class="input" name="pickupAddress" value="${UI.esc(merchant.store.pickupAddress)}"><span class="error-text" hidden></span></div>
          <div class="field full"><label class="label">Return address</label><input class="input" name="returnAddress" value="${UI.esc(merchant.store.returnAddress || '')}"></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Save store</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-store-form]');
            if (!UI.validate(form, { name: [UI.validators.required], pickupAddress: [UI.validators.required] })) return;
            const fd = new FormData(form);
            S.updateMerchant(merchant.id, {
              name: fd.get('name'), businessType: fd.get('businessType'),
              store: { ...merchant.store, name: fd.get('name'), pickupAddress: fd.get('pickupAddress'), returnAddress: fd.get('returnAddress') }
            });
            UI.toast('Store updated', 'Labels and pickups now use the new details.', 'success');
            close(); refresh();
          });
        }
      });
    }));
    el.querySelector('[data-add-address]').addEventListener('click', () => {
      UI.modal({
        title: 'Add pickup address',
        body: `<div class="field"><label class="label">Address</label><input class="input" name="addr" placeholder="Warehouse, road, area"></div>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Add address</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const val = root.querySelector('[name="addr"]').value.trim();
            if (!val) { UI.toast('Address required', 'Enter a pickup address.', 'warn'); return; }
            const list = (merchant.store.extraAddresses || []).concat(val);
            S.updateMerchant(merchant.id, { store: { ...merchant.store, extraAddresses: list } });
            UI.toast('Address added', val, 'success');
            close(); refresh();
          });
        }
      });
    });
    el.querySelectorAll('[data-remove-address]').forEach((b) => b.addEventListener('click', () => {
      const list = (merchant.store.extraAddresses || []).slice();
      list.splice(+b.dataset.removeAddress, 1);
      S.updateMerchant(merchant.id, { store: { ...merchant.store, extraAddresses: list } });
      refresh();
    }));
  }

  /* --------------------------------------------------------------- profile */
  function renderProfile(el, ctx) {
    el.innerHTML = `
      ${App.pageHead({ title: 'Merchant profile', sub: 'Your business identity, contact details and account security.' })}
      <div class="grid" style="grid-template-columns:1fr 1.4fr;gap:16px;align-items:start" id="profileGrid">
        <div class="card">
          <div class="profile-cover"></div>
          <div class="card-body" style="margin-top:-28px">
            <span class="avatar xl tone-dark" style="border:3px solid var(--surface)">${UI.initials(merchant.owner)}</span>
            <h3 class="mt-3" style="font-size:var(--text-lg)">${UI.esc(merchant.owner)}</h3>
            <div class="tiny muted">${UI.esc(merchant.name)}</div>
            <div class="inline-list mt-3"><span class="badge badge-success"><i class="dot"></i>${merchant.status}</span><span class="badge badge-neutral">${UI.esc(merchant.plan)} plan</span></div>
            <div class="divider" style="margin-block:16px"></div>
            <div class="stack gap-2 tiny">
              <div class="row gap-2">${UI.icon('envelope-simple')} <span>${UI.esc(merchant.email)}</span></div>
              <div class="row gap-2">${UI.icon('phone')} <span>${UI.esc(merchant.phone)}</span></div>
              <div class="row gap-2">${UI.icon('map-pin')} <span>${UI.esc(merchant.district)}</span></div>
              <div class="row gap-2">${UI.icon('calendar')} <span>Member since ${UI.date(merchant.createdAt)}</span></div>
            </div>
            <button class="btn btn-sm btn-block mt-4" data-edit-profile>${UI.icon('pencil-simple')} Edit details</button>
          </div>
        </div>

        <div class="stack gap-4">
          <div class="card">
            ${sectionHead('Business details', 'Used on invoices and merchant records')}
            <div class="card-body">
              <div class="kv-grid">
                <div class="kv"><div class="k">Business name</div><div class="v">${UI.esc(merchant.name)}</div></div>
                <div class="kv"><div class="k">Owner</div><div class="v">${UI.esc(merchant.owner)}</div></div>
                <div class="kv"><div class="k">Business type</div><div class="v">${UI.esc(merchant.businessType)}</div></div>
                <div class="kv"><div class="k">Commission</div><div class="v">${merchant.commission}%</div></div>
                <div class="kv" style="grid-column:1/-1"><div class="k">Business address</div><div class="v">${UI.esc(merchant.address)}, ${UI.esc(merchant.district)}</div></div>
              </div>
            </div>
          </div>
          <div class="card">
            ${sectionHead('Security', 'Simulated account security controls', '<span class="badge badge-neutral">Demo</span>')}
            <div class="card-body">
              <div class="between wrap gap-3" style="padding-bottom:14px;border-bottom:1px solid var(--line)">
                <div><div class="small strong">Password</div><div class="tiny muted">Last changed 2 months ago (demo)</div></div>
                <button class="btn btn-sm" data-password>${UI.icon('lock-simple')} Change password</button>
              </div>
              <div class="between wrap gap-3" style="padding-block:14px;border-bottom:1px solid var(--line)">
                <div><div class="small strong">Two-factor authentication</div><div class="tiny muted">Not enabled in this prototype</div></div>
                <span class="badge badge-neutral">Unavailable</span>
              </div>
              <div class="between wrap gap-3" style="padding-top:14px">
                <div><div class="small strong">Active session</div><div class="tiny muted">This browser only · expires in 12 hours</div></div>
                <button class="btn btn-sm btn-danger-soft" data-signout>${UI.icon('sign-out')} Sign out</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-edit-profile]').forEach((b) => b.addEventListener('click', () => {
      UI.modal({
        title: 'Edit merchant details',
        size: 'wide',
        body: `<form data-profile-form class="form-grid">
          <div class="field"><label class="label">Owner name</label><input class="input" name="owner" value="${UI.esc(merchant.owner)}"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Email</label><input class="input" type="email" name="email" value="${UI.esc(merchant.email)}"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Phone</label><input class="input" name="phone" value="${UI.esc(merchant.phone)}"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Business type</label><input class="input" name="businessType" value="${UI.esc(merchant.businessType)}"></div>
          <div class="field full"><label class="label">Address</label><input class="input" name="address" value="${UI.esc(merchant.address)}"></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Save changes</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-profile-form]');
            if (!UI.validate(form, { owner: [UI.validators.required], email: [UI.validators.required, UI.validators.email], phone: [UI.validators.required, UI.validators.phone] })) return;
            const fd = new FormData(form);
            S.updateMerchant(merchant.id, { owner: fd.get('owner'), email: fd.get('email'), phone: fd.get('phone'), businessType: fd.get('businessType'), address: fd.get('address') });
            UI.toast('Profile updated', 'Merchant details saved.', 'success');
            close(); ctx.refresh();
          });
        }
      });
    }));
    el.querySelector('[data-password]').addEventListener('click', () => {
      UI.modal({
        title: 'Change password',
        subtitle: 'Demo only — no real credentials are changed',
        body: `<div class="alert warn mb-4">${UI.icon('warning')}<div>Password changes are not persisted in this prototype. Use the demo password 123456 to sign in.</div></div>
          <div class="form-grid"><div class="field full"><label class="label">Current password</label><input class="input" type="password" value="123456"></div>
          <div class="field"><label class="label">New password</label><input class="input" type="password" placeholder="At least 6 characters"></div>
          <div class="field"><label class="label">Confirm password</label><input class="input" type="password" placeholder="Repeat new password"></div></div>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-close>Update password</button>'
      });
    });
    el.querySelector('[data-signout]').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Sign out?', body: 'You will return to the demo sign-in page.', confirmText: 'Sign out' });
      if (!ok) return;
      ZR.auth.logout();
      location.href = 'login.html';
    });
  }

  /* ------------------------------------------------------------------- API */
  function renderApi(el, ctx) {
    const api = merchant.api || {};
    let revealed = false;
    el.innerHTML = `
      ${App.pageHead({ title: 'API & webhooks', sub: 'Simulated integration credentials for your store. No network calls are made.', actions: `<span class="badge badge-warn"><i class="dot"></i>Simulation only</span>` })}
      <div class="alert warn mb-5">${UI.icon('warning')}<div><strong>These credentials are fake.</strong> They are generated locally to demonstrate the merchant API surface. Never use them in production.</div></div>
      <div class="grid" style="grid-template-columns:1.15fr .85fr;gap:16px;align-items:start" id="apiGrid">
        <div class="stack gap-4">
          <div class="card">
            ${sectionHead('API credentials', 'Use these keys in your test integration', '<span class="badge badge-neutral">v1</span>')}
            <div class="card-body">
              <div class="field"><label class="label">API key</label>
                <div class="input-group"><input class="input mono" readonly value="${'•'.repeat(24)}${String(api.key || '').slice(-6)}" data-key-field><span class="addon" style="padding:0"><button class="icon-btn sm" data-reveal aria-label="Reveal API key">${UI.icon('eye')}</button></span></div>
                <span class="hint">Created ${UI.date(api.created)} · scopes: parcels, cod, webhooks</span>
              </div>
              <div class="row gap-2 mt-4"><button class="btn btn-sm" data-copy-key>${UI.icon('copy')} Copy key</button><button class="btn btn-sm btn-danger-soft" data-rotate>${UI.icon('arrows-clockwise')} Rotate key</button></div>
            </div>
          </div>
          <div class="card">
            ${sectionHead('Webhook endpoint', 'Receive signed events when parcel status changes')}
            <div class="card-body">
              <div class="field"><label class="label">Endpoint URL</label>
                <input class="input mono" style="font-size:11px" value="${UI.esc(api.webhook || '')}" placeholder="https://merchant.example.com/webhooks/zeriour" data-webhook>
                <span class="hint">Events are simulated and never delivered. Retries are not implemented in the prototype.</span>
              </div>
              <div class="field mt-4"><label class="label">Subscribed events</label>
                <div class="grid g-2" style="gap:8px">
                  ${['parcel.created', 'parcel.picked_up', 'parcel.in_transit', 'parcel.delivered', 'parcel.failed', 'payment.settled'].map((ev, i) => `<label class="checkbox"><input type="checkbox" data-event value="${ev}" ${i < 4 ? 'checked' : ''}><span class="mono tiny">${ev}</span></label>`).join('')}
                </div>
              </div>
              <button class="btn btn-primary btn-sm mt-4" data-save-webhook>Save endpoint</button>
            </div>
          </div>
          <div class="card">
            ${sectionHead('Quick test request', 'Example payload for creating a parcel')}
            <div class="card-body">
              <pre class="mono" style="background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-md);padding:14px;font-size:11px;line-height:1.6;overflow:auto;margin:0">curl -X POST https://api.zeriour.demo/v1/parcels \\
  -H "Authorization: Bearer ${UI.esc(api.key || 'zr_test_key')}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "Rakibul Hasan",
    "phone": "+8801712345678",
    "district": "Dhaka",
    "upazila": "Dhanmondi",
    "address": "House 12, Road 5",
    "weight": 1.2,
    "cod": 1500
  }'</pre>
              <button class="btn btn-sm mt-3" data-copy-curl>${UI.icon('copy')} Copy example</button>
            </div>
          </div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-plugs-connected"></i> Integration status</h4>
            <div class="between mt-3"><span class="tiny">API access</span><span class="badge badge-success">Enabled</span></div>
            <div class="between mt-2"><span class="tiny">Webhook signing</span><span class="badge badge-neutral">Not configured</span></div>
            <div class="between mt-2"><span class="tiny">Last request</span><span class="tiny muted">Never</span></div>
            <div class="between mt-2"><span class="tiny">Rate limit</span><span class="tiny muted">120 req / min</span></div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-book-open"></i> Docs & support</h4>
            <p class="tiny muted mt-2" style="line-height:1.6">The prototype does not expose a real HTTP API. Use the docs as a visual reference for the intended integration.</p>
            <a class="btn btn-sm btn-block mt-3" href="#/support">${UI.icon('lifebuoy')} Ask integration support</a>
            <div class="alert info mt-3 tiny" style="padding:10px">${UI.icon('info')}<div>Rotating a key updates the local demo record immediately.</div></div>
          </div>
        </div>
      </div>`;

    const keyField = el.querySelector('[data-key-field]');
    el.querySelector('[data-reveal]').addEventListener('click', (e) => {
      revealed = !revealed;
      keyField.value = revealed ? api.key : '•'.repeat(24) + String(api.key).slice(-6);
      e.currentTarget.innerHTML = `<i class="ph ph-${revealed ? 'eye-slash' : 'eye'}"></i>`;
    });
    el.querySelector('[data-copy-key]').addEventListener('click', () => UI.copy(api.key, 'API key copied'));
    el.querySelector('[data-copy-curl]').addEventListener('click', () => UI.copy(el.querySelector('pre').textContent, 'Example request copied'));
    el.querySelector('[data-rotate]').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Rotate API key?', body: 'The existing demo key will stop working immediately. Any integration using it would need updating.', confirmText: 'Rotate key', danger: true });
      if (!ok) return;
      const key = 'zr_live_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 10);
      S.updateMerchant(merchant.id, { api: { ...api, key, created: new Date().toISOString() } });
      UI.toast('API key rotated', 'A new demo key has been generated.', 'success');
      ctx.refresh();
    });
    el.querySelector('[data-save-webhook]').addEventListener('click', () => {
      const url = el.querySelector('[data-webhook]').value.trim();
      const events = Array.from(el.querySelectorAll('[data-event]:checked')).map((c) => c.value);
      S.updateMerchant(merchant.id, { api: { ...api, webhook: url, events } });
      UI.toast('Webhook saved', `${events.length} events subscribed (simulated).`, 'success');
    });
  }

  /* --------------------------------------------------------------- support */
  function renderSupport(el, ctx) {
    const tickets = S.state.tickets.filter((t) => t.merchantId === merchant.id);
    el.innerHTML = `
      ${App.pageHead({ title: 'Support tickets', sub: 'Talk to the Zeriour team about deliveries, payments or your account.', actions: `<button class="btn btn-sm btn-primary" data-new>${UI.icon('plus')} New ticket</button>` })}
      <div class="grid g-3 mb-5">
        ${kpi({ label: 'Open tickets', value: UI.num(tickets.filter((t) => t.status === 'open').length), icon: 'lifebuoy', tone: 'warn', foot: 'awaiting a reply' })}
        ${kpi({ label: 'In progress', value: UI.num(tickets.filter((t) => t.status === 'in_progress').length), icon: 'arrows-clockwise', tone: 'sky', foot: 'being handled' })}
        ${kpi({ label: 'Resolved', value: UI.num(tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length), icon: 'check-circle', tone: 'success', foot: 'lifetime' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Your tickets</h3><p class="sub">Newest first · replies appear instantly in the demo</p></div></div>
        <div class="table-wrap">
          <table class="table table-compact">
            <thead><tr><th>Subject</th><th>Category</th><th>Priority</th><th>Created</th><th>Status</th><th></th></tr></thead>
            <tbody>${tickets.length ? tickets.map((t) => `<tr data-ticket="${t.id}" style="cursor:pointer">
              <td><div class="cell-strong">${UI.esc(t.subject)}</div><div class="tiny muted">${UI.esc(t.id.toUpperCase())} · ${t.messages.length} message(s)</div></td>
              <td class="tiny">${UI.esc(t.category)}</td>
              <td>${UI.priorityBadge(t.priority)}</td>
              <td class="tiny muted">${UI.relative(t.createdAt)}</td>
              <td>${UI.userBadge(t.status)}</td>
              <td class="cell-actions">${UI.icon('caret-right')}</td>
            </tr>`).join('') : `<tr><td colspan="6">${UI.empty({ icon: 'ph-lifebuoy', title: 'No tickets yet', body: 'Open a ticket and the reply appears in your thread.', action: '<button class="btn btn-sm btn-primary" data-new>Open a ticket</button>' })}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      <div class="grid g-3 mt-5" style="gap:12px">
        <div class="card card-pad"><span class="kpi-ico"><i class="ph ph-phone"></i></span><h4 class="mt-3" style="font-size:var(--text-sm)">Hotline</h4><div class="small strong mt-1">09612 300 400</div><div class="tiny muted">Daily · 9am – 9pm</div></div>
        <div class="card card-pad"><span class="kpi-ico sky"><i class="ph ph-envelope-simple"></i></span><h4 class="mt-3" style="font-size:var(--text-sm)">Email</h4><div class="small strong mt-1">support@zeriour.demo</div><div class="tiny muted">Replies within 24 hours</div></div>
        <div class="card card-pad"><span class="kpi-ico violet"><i class="ph ph-book-open"></i></span><h4 class="mt-3" style="font-size:var(--text-sm)">Help centre</h4><div class="small strong mt-1">Guides & policies</div><div class="tiny muted">Demo documentation only</div></div>
      </div>`;

    el.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => {
      UI.modal({
        title: 'Open a support ticket',
        size: 'wide',
        body: `<form data-ticket-form class="form-grid">
          <div class="field full"><label class="label">Subject</label><input class="input" name="subject" placeholder="Short summary of the issue"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Category</label><select class="select" name="category"><option>Delivery</option><option>Finance</option><option>Technical</option><option>Account</option><option>Pickup</option></select></div>
          <div class="field"><label class="label">Priority</label><select class="select" name="priority"><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></div>
          <div class="field full"><label class="label">Message</label><textarea class="textarea" name="message" rows="4" placeholder="Describe what happened, including tracking numbers if relevant."></textarea><span class="error-text" hidden></span></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-send>Submit ticket</button>',
        onMount(root, close) {
          root.querySelector('[data-send]').addEventListener('click', () => {
            const form = root.querySelector('[data-ticket-form]');
            if (!UI.validate(form, { subject: [UI.validators.required, (v) => String(v).length >= 6 || 'Use at least 6 characters.'], message: [UI.validators.required, (v) => String(v).length >= 10 || 'Add a little more detail.'] })) return;
            const fd = new FormData(form);
            S.createTicket({ merchantId: merchant.id, subject: fd.get('subject'), category: fd.get('category'), priority: fd.get('priority'), message: fd.get('message') }, { actor: merchant.owner });
            UI.toast('Ticket submitted', 'Support will reply in your thread.', 'success');
            close(); ctx.refresh();
          });
        }
      });
    }));
    el.querySelectorAll('[data-ticket]').forEach((tr) => tr.addEventListener('click', () => ticketDrawer(tr.dataset.ticket, ctx)));
  }

  function ticketDrawer(id, ctx) {
    const t = S.state.tickets.find((x) => x.id === id);
    if (!t) return;
    UI.drawer({
      title: t.subject,
      subtitle: `${t.id.toUpperCase()} · ${t.category} · ${t.priority} priority`,
      body: `
        <div class="between mb-4"><span>${UI.userBadge(t.status)}</span><span class="tiny muted">Opened ${UI.dateTime(t.createdAt)}</span></div>
        <div class="stack gap-3">
          ${t.messages.map((m) => `<div class="card card-pad" style="background:${m.by === 'merchant' ? 'var(--surface)' : 'var(--primary-50)'}">
            <div class="between mb-2"><span class="tiny strong">${m.by === 'merchant' ? 'You' : 'Zeriour support'}</span><span class="tiny faint">${UI.relative(m.at)}</span></div>
            <p class="small" style="line-height:1.65">${UI.esc(m.text)}</p>
          </div>`).join('')}
        </div>
        ${t.status !== 'closed' ? `<div class="field mt-4"><label class="label">Add a reply</label><textarea class="textarea" data-reply rows="3" placeholder="Add more information…"></textarea></div>` : ''}`,
      footer: t.status !== 'closed'
        ? `<button class="btn" data-close>Close</button><button class="btn btn-primary" data-send>Send reply</button>`
        : `<button class="btn" data-close>Close</button>`,
      onMount(root, close) {
        const send = root.querySelector('[data-send]');
        if (send) send.addEventListener('click', () => {
          const val = root.querySelector('[data-reply]').value.trim();
          if (!val) { UI.toast('Reply required', 'Type a message before sending.', 'warn'); return; }
          S.replyTicket(t.id, val, 'merchant', { actor: merchant.owner });
          UI.toast('Reply sent', 'Added to the ticket thread.', 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  /* --------------------------------------------------------- notifications */
  function renderNotifications(el, ctx) {
    const all = S.notificationsFor(merchant.id);
    let filter = 'all';
    el.innerHTML = `
      ${App.pageHead({ title: 'Notifications', sub: 'Parcel updates, payouts and operational alerts.', actions: `<button class="btn btn-sm" data-read-all>${UI.icon('checks')} Mark all read</button>` })}
      <div class="row gap-2 mb-4">
        <div class="segmented" data-nfilter>
          <button data-f="all" class="is-active">All <span class="count">${all.length}</span></button>
          <button data-f="unread">Unread <span class="count">${all.filter((n) => !n.read).length}</span></button>
        </div>
      </div>
      <div class="card" data-list></div>`;

    const paint = () => {
      const list = all.filter((n) => filter === 'all' || !n.read);
      el.querySelector('[data-list]').innerHTML = list.length ? list.map((n) => `
        <div class="notif-item ${n.read ? '' : 'unread'}" style="align-items:flex-start;padding:14px 16px">
          <span class="ni-ico badge-${n.tone || 'info'}">${UI.icon((n.icon || 'ph-bell').replace('ph-', ''))}</span>
          <div class="grow" style="min-width:0">
            <div class="between gap-2"><span class="nt">${UI.esc(n.title)}</span><span class="tiny faint nowrap">${UI.relative(n.at)}</span></div>
            <div class="nd">${UI.esc(n.body)}</div>
            <div class="row gap-3 mt-2">
              ${!n.read ? `<button class="link tiny" data-mark="${n.id}">Mark read</button>` : '<span class="tiny faint">Read</span>'}
              ${n.link ? `<a class="link tiny" href="${n.link}">Open ${UI.icon('arrow-right')}</a>` : ''}
            </div>
          </div>
        </div>`).join('') : UI.empty({ icon: 'ph-bell-slash', title: 'No notifications', body: filter === 'unread' ? 'You’re all caught up.' : 'New updates will appear here.' });
      el.querySelectorAll('[data-mark]').forEach((b) => b.addEventListener('click', () => { S.markRead(b.dataset.mark); S.save('notification:read'); ctx.refresh(); }));
    };
    paint();
    el.querySelectorAll('[data-nfilter] button').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.f;
      el.querySelectorAll('[data-nfilter] button').forEach((x) => x.classList.toggle('is-active', x === b));
      paint();
    }));
    el.querySelector('[data-read-all]').addEventListener('click', () => { S.markAllRead(merchant.id); UI.toast('All caught up', 'Notifications marked as read.', 'success'); ctx.refresh(); });
  }

  /* --------------------------------------------------------------- settings */
  function renderSettings(el, ctx) {
    const prefs = (() => { try { return JSON.parse(localStorage.getItem('zeriour:prefs') || '{}'); } catch (e) { return {}; } })();
    el.innerHTML = `
      ${App.pageHead({ title: 'Account settings', sub: 'Workspace appearance, notification preferences and demo controls.' })}
      <div class="grid" style="grid-template-columns:1.3fr .7fr;gap:16px;align-items:start" id="settingsGrid">
        <div class="stack gap-4">
          <div class="card">
            ${sectionHead('Appearance', 'Saved to this browser')}
            <div class="card-body">
              <div class="between wrap gap-3">
                <div><div class="small strong">Theme</div><div class="tiny muted">Light is the default Zeriour experience.</div></div>
                <div class="segmented" data-theme-pref>
                  <button data-theme="light" class="${ZR.app.theme() === 'light' ? 'is-active' : ''}">${UI.icon('sun')} Light</button>
                  <button data-theme="dark" class="${ZR.app.theme() === 'dark' ? 'is-active' : ''}">${UI.icon('moon')} Dark</button>
                </div>
              </div>
              <div class="divider" style="margin-block:14px"></div>
              <div class="between wrap gap-3"><div><div class="small strong">Notification sound</div><div class="tiny muted">Play a subtle tone for new alerts.</div></div><label class="switch"><input type="checkbox"><span class="sr-only">Notification sound</span></label></div>
            </div>
          </div>
          <div class="card">
            ${sectionHead('Notifications', 'Choose what the demo alerts you about')}
            <div class="card-body stack gap-4">
              <div class="between wrap gap-3"><div><div class="small strong">Parcel status changes</div><div class="tiny muted">Pickup, transit and delivery events.</div></div><label class="switch"><input type="checkbox" data-pref="parcels" ${prefs.parcels !== false ? 'checked' : ''}><span class="sr-only">Parcel notifications</span></label></div>
              <div class="between wrap gap-3"><div><div class="small strong">COD settlements</div><div class="tiny muted">When a delivery is settled to your wallet.</div></div><label class="switch"><input type="checkbox" data-pref="cod" ${prefs.cod !== false ? 'checked' : ''}><span class="sr-only">COD notifications</span></label></div>
              <div class="between wrap gap-3"><div><div class="small strong">Weekly payout summary</div><div class="tiny muted">Every Tuesday after settlement.</div></div><label class="switch"><input type="checkbox" data-pref="payout" ${prefs.payout !== false ? 'checked' : ''}><span class="sr-only">Payout summary</span></label></div>
              <div class="between wrap gap-3"><div><div class="small strong">Product announcements</div><div class="tiny muted">New dashboard features and changes.</div></div><label class="switch"><input type="checkbox" data-pref="product" ${prefs.product === true ? 'checked' : ''}><span class="sr-only">Product announcements</span></label></div>
              <button class="btn btn-sm btn-soft" data-save-prefs>${UI.icon('check')} Save preferences</button>
            </div>
          </div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-storefront"></i> Workspace</h4>
            <div class="summary-line"><span>Merchant</span><strong class="tiny">${UI.esc(merchant.name)}</strong></div>
            <div class="summary-line"><span>Role</span><strong class="tiny">Merchant owner</strong></div>
            <div class="summary-line"><span>Session</span><strong class="tiny">Demo · 12h</strong></div>
            <div class="summary-line"><span>Data</span><strong class="tiny">Browser localStorage</strong></div>
            <a class="btn btn-sm btn-block mt-3" href="#/profile">Open profile</a>
          </div>
          <div class="card card-pad" style="border-color:rgba(217,45,60,.25)">
            <h4 style="font-size:var(--text-sm);color:var(--danger)"><i class="ph ph-warning"></i> Demo data</h4>
            <p class="tiny muted mt-2" style="line-height:1.6">Resetting replaces every parcel, payment and ticket with the original seed. This affects all four role dashboards.</p>
            <button class="btn btn-sm btn-danger-soft btn-block mt-3" data-reset>Reset demo data</button>
            <button class="btn btn-sm btn-ghost btn-block mt-2" data-signout>Sign out</button>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-theme-pref] button').forEach((b) => b.addEventListener('click', () => {
      ZR.app.setTheme(b.dataset.theme);
      el.querySelectorAll('[data-theme-pref] button').forEach((x) => x.classList.toggle('is-active', x === b));
    }));
    el.querySelector('[data-save-prefs]').addEventListener('click', () => {
      const p = {};
      el.querySelectorAll('[data-pref]').forEach((c) => { p[c.dataset.pref] = c.checked; });
      try { localStorage.setItem('zeriour:prefs', JSON.stringify(p)); } catch (e) { /* ignore */ }
      UI.toast('Preferences saved', 'Stored in this browser.', 'success');
    });
    el.querySelector('[data-reset]').addEventListener('click', ZR.app.resetDemo);
    el.querySelector('[data-signout]').addEventListener('click', () => { ZR.auth.logout(); location.href = 'login.html'; });
  }

  /* ---------------------------------------------------------------- routes */
  const routes = {
    overview: { title: 'Overview', render: renderOverview },
    parcels: { title: 'Parcels', render: renderParcels },
    'parcels/new': { title: 'Create parcel', render: renderNewParcel },
    bulk: { title: 'Bulk creation', render: renderBulk },
    finance: { title: 'Finance & COD', render: renderFinance },
    transactions: { title: 'Transactions', render: renderTransactions },
    pickups: { title: 'Pickup requests', render: renderPickups },
    returns: { title: 'Returns', render: renderReturns },
    customers: { title: 'Customers', render: renderCustomers },
    stores: { title: 'Store', render: renderStores },
    profile: { title: 'Merchant profile', render: renderProfile },
    api: { title: 'API & webhooks', render: renderApi },
    support: { title: 'Support', render: renderSupport },
    notifications: { title: 'Notifications', render: renderNotifications },
    settings: { title: 'Settings', render: renderSettings }
  };

  const nav = [
    { label: 'Workspace', items: [
      { label: 'Overview', icon: 'squares-four', route: 'overview' },
      { label: 'Parcels', icon: 'package', route: 'parcels', count: () => merchantParcels().filter((p) => p.status <= 7).length },
      { label: 'Create parcel', icon: 'plus-circle', route: 'parcels/new' },
      { label: 'Bulk import', icon: 'upload-simple', route: 'bulk' },
      { label: 'Pickups', icon: 'hand-arrow-up', route: 'pickups', count: () => merchantParcels().filter((p) => p.status <= 1).length },
      { label: 'Returns', icon: 'arrow-u-up-left', route: 'returns', count: () => merchantParcels().filter((p) => [9, 10].includes(p.status)).length }
    ] },
    { label: 'Money', items: [
      { label: 'Finance & COD', icon: 'wallet', route: 'finance' },
      { label: 'Transactions', icon: 'receipt', route: 'transactions' }
    ] },
    { label: 'Store', items: [
      { label: 'Customers', icon: 'users', route: 'customers' },
      { label: 'Store settings', icon: 'storefront', route: 'stores' },
      { label: 'API & webhooks', icon: 'code', route: 'api' }
    ] },
    { label: 'Account', items: [
      { label: 'Support', icon: 'lifebuoy', route: 'support' },
      { label: 'Notifications', icon: 'bell', route: 'notifications', count: () => S.unreadCount(merchant.id) },
      { label: 'Settings', icon: 'gear', route: 'settings' }
    ] }
  ];

  ZR.app.registerParcelOpener((id) => {
    const p = S.parcel(id);
    if (!p || p.merchantId !== merchant.id) return false;
    openParcelDrawer(id, { refresh: () => App.refresh() });
    return true;
  });

  App.mount({
    role: 'merchant',
    user,
    nav,
    routes,
    defaultRoute: 'overview',
    roleLabel: merchant.name,
    roleSub: `${merchant.plan} plan · ${merchant.district}`,
    searchPlaceholder: 'Search parcels, customers, pages…'
  });
})(window.ZR);
