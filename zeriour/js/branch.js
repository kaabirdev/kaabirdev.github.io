/* ==========================================================================
   Zeriour — Branch operations desk
   Scan, sort, bag, dispatch, manifest and collect COD at the hub.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';
  const UI = ZR.ui;
  const S = ZR.store;
  const App = ZR.app;

  S.init();
  const user = ZR.auth.require('branch');
  if (!user) return;
  const branch = S.branch(user.branchId) || S.state.branches[0];
  const branchId = branch.id;
  const actor = user.name;
  const branchCode = branch.code;
  const money = UI.money;

  /* ------------------------------------------------------------------ utils */
  function kpi({ label, value, icon, tone = '', foot = '', delta, deltaDir = 'up' }) {
    return `<div class="kpi">
      <div class="kpi-top"><span class="kpi-label">${UI.esc(label)}</span><span class="kpi-ico ${tone}">${UI.icon(icon)}</span></div>
      <div class="kpi-val">${value}</div>
      <div class="kpi-foot"><span>${delta ? `<span class="delta ${deltaDir}">${UI.icon('arrow-up-right')} ${delta}</span>` : ''} ${foot}</span></div>
    </div>`;
  }
  function scopeParcels() { return S.branchParcels(branchId); }
  function queueCard(title, rows, actionHead, actionFn, emptyText) {
    return `<div class="card">
      <div class="card-head"><div><h3>${title}</h3><p class="sub">${rows.length} parcel${rows.length === 1 ? '' : 's'}</p></div><a class="link tiny" href="#/incoming">View queue ${UI.icon('arrow-right')}</a></div>
      <div class="table-wrap"><table class="table table-compact">
        <thead><tr><th>Tracking</th><th>Customer</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.length ? rows.slice(0, 6).map((p) => `<tr>
          <td><span class="tracking-code">${p.tracking}</span></td>
          <td class="tiny">${UI.esc(p.customer.name)}</td>
          <td>${UI.statusBadge(p.statusKey, { short: true })}</td>
          <td class="cell-actions"><button class="icon-btn sm" data-act="${p.id}" title="${actionHead}" aria-label="${actionHead}">${UI.icon('check')}</button></td>
        </tr>`).join('') : `<tr><td colspan="4" class="tiny muted" style="text-align:center;padding:22px">${UI.icon('check-circle')} ${emptyText}</td></tr>`}</tbody>
      </table></div>
    </div>`;
  }
  function branchRiders() { return S.state.riders.filter((r) => r.branchId === branchId); }

  function assignRiderModal(parcel, ctx) {
    const riders = branchRiders().filter((r) => r.status === 'active');
    UI.modal({
      title: 'Assign rider',
      subtitle: `${parcel.tracking} · ${parcel.customer.upazila}, ${parcel.customer.district}`,
      body: riders.length ? `
        <div class="field"><label class="label">Rider at ${UI.esc(branch.code)}</label>
          <select class="select" name="rider">${riders.map((r) => `<option value="${r.id}">${UI.esc(r.name)} · ${UI.esc(r.zone)} · Rating ${r.rating}</option>`).join('')}</select>
        </div>
        <div class="alert info mt-4">${UI.icon('info')}<div>Assigning the parcel sets its status to <strong>Assigned to Rider</strong> and adds it to the rider’s task list immediately.</div></div>`
        : UI.empty({ icon: 'ph-moped', title: 'No active riders', body: 'Add or reactivate a rider for this hub first.', action: '<a class="btn btn-sm btn-primary" href="#/riders">Manage riders</a>' }),
      footer: riders.length ? '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Assign</button>' : '<button class="btn" data-close>Close</button>',
      onMount(root, close) {
        const save = root.querySelector('[data-save]');
        if (save) save.addEventListener('click', () => {
          const riderId = root.querySelector('[name="rider"]').value;
          S.assignRider(parcel.id, riderId, { actor, branchId });
          UI.toast('Rider assigned', `${parcel.tracking} → ${S.rider(riderId).name}`, 'success');
          close(); ctx.refresh();
        });
      }
    });
  }

  function scanLookup(value, host, ctx) {
    const q = String(value || '').trim();
    if (!q) { UI.toast('Scan a parcel', 'Enter or paste a tracking number.', 'warn'); return; }
    host.innerHTML = `<div class="card card-pad-lg"><div class="row gap-3"><span class="spinner lg"></span><div><div class="small strong">Looking up ${UI.esc(q)}</div><div class="tiny muted">Querying the shared parcel dataset…</div></div></div></div>`;
    setTimeout(() => {
      const p = S.parcelByTracking(q) || S.parcel(q);
      if (!p) {
        host.innerHTML = `<div class="card card-pad-lg anim-fade-up">
          <div class="empty-ico" style="background:var(--danger-soft);color:var(--danger);border-color:rgba(217,45,60,.2)">${UI.icon('warning')}</div>
          <h4>Parcel not found</h4>
          <p class="tiny muted mt-2">No parcel matches “${UI.esc(q)}”. Check the number or scan again.</p>
          <div class="row gap-2 mt-4"><button class="btn btn-sm" data-retry>${UI.icon('scan')} Scan another</button></div>
        </div>`;
        host.querySelector('[data-retry]').focus();
        return;
      }
      const actions = scanActions(p);
      host.innerHTML = `<div class="card anim-fade-up">
        <div class="card-head">
          <div><h3 class="mono" style="font-size:var(--text-md)">${p.tracking}</h3><p class="sub">${UI.esc(p.merchantName)} · ${UI.esc(p.customer.upazila)}, ${UI.esc(p.customer.district)}</p></div>
          ${UI.statusBadge(p.statusKey, { lg: true })}
        </div>
        <div class="card-body">
          <div class="grid g-3" style="gap:12px">
            <div class="kv"><div class="k">Receiver</div><div class="v">${UI.esc(p.customer.name)}<br>${UI.esc(p.customer.phone)}</div></div>
            <div class="kv"><div class="k">Route</div><div class="v">${UI.esc((S.branch(p.originBranchId) || {}).code || '—')} → ${UI.esc((S.branch(p.destBranchId) || {}).code || '—')}</div></div>
            <div class="kv"><div class="k">COD</div><div class="v num">${money(p.cod)}</div></div>
            <div class="kv"><div class="k">Weight / service</div><div class="v" style="text-transform:capitalize">${p.weight} kg · ${UI.esc(p.type)}</div></div>
            <div class="kv"><div class="k">Bag</div><div class="v mono tiny">${UI.esc(p.bagId || 'Not bagged')}</div></div>
            <div class="kv"><div class="k">Attempts</div><div class="v">${p.attempts || 0}</div></div>
          </div>
          ${p.notes ? `<div class="alert info mt-4">${UI.icon('info')}<div><strong>Delivery note:</strong> ${UI.esc(p.notes)}</div></div>` : ''}
          <div class="divider" style="margin-block:16px"></div>
          <div class="between wrap gap-2 mb-2"><h4 style="font-size:var(--text-sm)">Available next actions</h4><span class="tiny faint">${UI.icon('scan')} ${UI.dateTime(new Date().toISOString())}</span></div>
          <div class="row gap-2 wrap">${actions}</div>
          <div class="tiny faint mt-3">${UI.icon('info')} Valid next steps are based on the parcel’s current status and this branch’s role in the route.</div>
        </div>
        <div class="card-foot between" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" data-view>${UI.icon('eye')} Full parcel record</button>
          <button class="btn btn-sm" data-clear>${UI.icon('scan')} Scan next parcel</button>
        </div>
      </div>`;
      host.querySelectorAll('[data-scan-action]').forEach((b) => b.addEventListener('click', () => runScanAction(p, b.dataset.scanAction, ctx)));
      host.querySelector('[data-view]').addEventListener('click', () => parcelModal(p.id, ctx));
      host.querySelector('[data-clear]').addEventListener('click', () => {
        const input = document.querySelector('[data-scan-input]');
        host.innerHTML = scanIdle();
        if (input) { input.value = ''; input.focus(); }
      });
    }, 380);
  }

  function scanActions(p) {
    const isOrigin = p.originBranchId === branchId;
    const isDest = p.destBranchId === branchId;
    const out = [];
    if ([0, 1].includes(p.status)) out.push(`<button class="btn btn-primary btn-sm" data-scan-action="receive_origin">${UI.icon('warehouse')} Receive at origin</button>`);
    if (p.status === 2) out.push(`<button class="btn btn-primary btn-sm" data-scan-action="receive_origin">${UI.icon('warehouse')} Receive at hub</button>`);
    if (p.status === 3 && isOrigin) out.push(`<button class="btn btn-primary btn-sm" data-scan-action="dispatch">${UI.icon('truck')} Dispatch to destination</button>`);
    if (p.status === 4 && isDest) out.push(`<button class="btn btn-primary btn-sm" data-scan-action="receive_dest">${UI.icon('buildings')} Receive at destination</button>`);
    if (p.status === 5) out.push(`<button class="btn btn-primary btn-sm" data-scan-action="assign">${UI.icon('user-focus')} Assign rider</button>`);
    if ([6, 7].includes(p.status)) out.push(`<button class="btn btn-sm" data-scan-action="assign">${UI.icon('arrows-clockwise')} Reassign rider</button>`);
    if (p.status === 2) out.push(`<button class="btn btn-sm" data-scan-action="sort">${UI.icon('stack')} Mark sorted</button>`);
    if (!out.length) out.push(`<span class="badge badge-neutral">${UI.icon('info')} No branch action available for this status</span>`);
    return out.join('');
  }

  function runScanAction(p, action, ctx) {
    if (action === 'assign') { assignRiderModal(p, ctx); return; }
    const labels = {
      receive_origin: 'received at origin hub',
      dispatch: 'dispatched to destination hub',
      receive_dest: 'received at destination hub',
      sort: 'sorted into destination bag'
    };
    S.branchAdvance(p.id, action, { branchId, actor, branchCode });
    UI.toast('Scan recorded', `${p.tracking} ${labels[action] || 'updated'}`, 'success');
    const input = document.querySelector('[data-scan-input]');
    const host = document.querySelector('[data-scan-result]');
    if (host) {
      host.innerHTML = scanIdle();
      if (input) { input.value = ''; input.focus(); }
    }
    App.refresh();
  }

  function scanIdle() {
    return `<div class="card card-pad-lg text-center">
      <div class="empty-ico">${UI.icon('scan')}</div>
      <h4>Ready to scan</h4>
      <p class="tiny muted mt-1" style="max-width:38ch;margin-inline:auto">Scan or type a tracking number above. The parcel’s current status and valid next actions will appear here.</p>
      <div class="inline-list center mt-3">${S.state.parcels.filter((p) => p.originBranchId === branchId || p.destBranchId === branchId).slice(0, 3).map((p) => `<button class="badge badge-neutral mono" data-try="${p.tracking}" style="cursor:pointer;height:24px">${p.tracking}</button>`).join('')}</div>
    </div>`;
  }

  function parcelModal(id, ctx) {
    const p = S.parcel(id);
    if (!p) return;
    UI.drawer({
      title: p.tracking,
      subtitle: `${p.merchantName} · ${UI.statusBadge(p.statusKey, { short: true })}`,
      size: 'wide',
      body: `${ZR.tracking.summary(p)}
        <div class="mt-4">${ZR.tracking.details(p)}</div>
        <div class="detail-section mt-4"><div class="ds-head"><h4>${UI.icon('path')} Timeline</h4></div><div class="ds-body">${ZR.tracking.timeline(p)}</div></div>`,
      footer: `<button class="btn btn-sm" data-close>Close</button><span class="grow"></span>${[0, 1, 2].includes(p.status) ? `<button class="btn btn-sm btn-primary" data-receive>Receive at this hub</button>` : p.status === 3 ? `<button class="btn btn-sm btn-primary" data-dispatch>Dispatch</button>` : p.status === 5 ? `<button class="btn btn-sm btn-primary" data-assign>Assign rider</button>` : ''}`,
      onMount(root, close) {
        const rec = root.querySelector('[data-receive]');
        if (rec) rec.addEventListener('click', () => { S.branchAdvance(p.id, 'receive_origin', { branchId, actor }); UI.toast('Received at hub', p.tracking, 'success'); close(); ctx.refresh(); });
        const dis = root.querySelector('[data-dispatch]');
        if (dis) dis.addEventListener('click', () => { S.branchAdvance(p.id, 'dispatch', { branchId, actor }); UI.toast('Dispatched', p.tracking, 'success'); close(); ctx.refresh(); });
        const asg = root.querySelector('[data-assign]');
        if (asg) asg.addEventListener('click', () => { close(); assignRiderModal(p, ctx); });
      }
    });
  }

  /* ---------------------------------------------------------------- overview */
  function renderOverview(el, ctx) {
    const s = S.statsBranch(branchId);
    const pendingInbound = S.state.parcels.filter((p) => p.destBranchId === branchId && [4, 5].includes(p.status));
    const ready = S.state.parcels.filter((p) => p.originBranchId === branchId && p.status === 3);
    const recentScans = S.state.parcels
      .filter((p) => p.timeline.some((t) => t.by === branchCode))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);

    el.innerHTML = `
      ${App.pageHead({
        title: `${branch.name}`,
        sub: `${branch.code} · ${branch.thana}, ${branch.district} · ${branch.staff} staff on record`,
        actions: `<a class="btn btn-sm" href="#/sorting">${UI.icon('stack')} Sorting bay</a><a class="btn btn-sm btn-primary" href="#/scan">${UI.icon('scan')} Scan parcel</a>`
      })}
      <div class="grid g-4 mb-4">
        ${kpi({ label: 'Incoming parcels', value: UI.num(s.incomingCount), icon: 'download-simple', tone: 'violet', foot: 'to receive / assign' })}
        ${kpi({ label: 'Outgoing parcels', value: UI.num(s.outgoingCount), icon: 'upload-simple', tone: 'sky', foot: 'to dispatch' })}
        ${kpi({ label: 'Awaiting sorting', value: UI.num(s.sortingCount), icon: 'stack', tone: 'warn', foot: 'in the sorting bay' })}
        ${kpi({ label: 'Ready for dispatch', value: UI.num(s.readyCount), icon: 'truck', tone: 'success', foot: 'scanned and bagged' })}
      </div>
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Received today', value: UI.num(s.receivedToday), icon: 'warehouse', foot: 'scan events at this hub' })}
        ${kpi({ label: 'Delivered today', value: UI.num(s.deliveredToday), icon: 'check-circle', tone: 'success', foot: 'by branch riders' })}
        ${kpi({ label: 'Pending transfers', value: UI.num(s.pendingTransfersCount), icon: 'arrows-left-right', tone: 'warn', foot: 'in line-haul' })}
        ${kpi({ label: 'COD collected today', value: money(s.codToday), icon: 'wallet', tone: 'success', foot: 'from branch riders' })}
      </div>

      <div class="grid" style="grid-template-columns:1.55fr .95fr;gap:16px;align-items:start" id="branchMain">
        <div class="stack gap-4">
          <div class="card">
            <div class="card-head"><div><h3>Scan desk</h3><p class="sub">Fast intake for inbound and outbound parcels</p></div><span class="badge badge-success"><i class="dot"></i>Scanner ready</span></div>
            <div class="card-body">
              <form data-quick-scan class="row gap-2" style="align-items:stretch">
                <div class="input-icon grow">${UI.icon('barcode')}<input class="input mono" name="tracking" placeholder="Scan or type tracking number…" aria-label="Tracking number" autocomplete="off" style="height:46px"></div>
                <button class="btn btn-primary" type="submit" style="height:46px">${UI.icon('scan')} Look up</button>
              </form>
              <div class="row gap-2 mt-3 wrap">
                <span class="tiny muted">Recent scans:</span>
                ${recentScans.slice(0, 3).map((p) => `<button class="badge badge-neutral mono" data-scan-try="${p.tracking}" style="cursor:pointer">${p.tracking}</button>`).join('')}
              </div>
            </div>
          </div>

          <div class="grid g-2" style="gap:14px" id="branchQueues">
            ${queueCard('Inbound queue', pendingInbound, 'Receive', 'receive', 'No inbound parcels right now')}
            ${queueCard('Ready to dispatch', ready, 'Dispatch', 'dispatch', 'Nothing waiting for dispatch')}
          </div>

          <div class="card">
            <div class="card-head"><div><h3>Throughput · last 7 days</h3><p class="sub">Parcels created and delivered touching this hub</p></div><a class="link tiny" href="#/reports">Reports ${UI.icon('arrow-right')}</a></div>
            <div class="card-body"><div class="chart-box h-200"><canvas id="bThroughput"></canvas></div></div>
          </div>
        </div>

        <div class="stack gap-4">
          <div class="card card-pad" style="background:linear-gradient(150deg,#0b1c33,#123a63);color:#fff;border:0">
            <div class="between"><span class="eyebrow" style="color:#8fb4ff">Branch snapshot</span>${UI.icon('warehouse')}</div>
            <div class="row gap-2 mt-3"><span style="font-size:30px;font-family:var(--font-display);font-weight:750;letter-spacing:-.04em">${s.incomingCount + s.outgoingCount}</span><span class="tiny" style="color:#a9bdd4;align-self:flex-end;padding-bottom:6px">parcels in scope</span></div>
            <div class="progress mt-3" style="background:rgba(255,255,255,.12)"><span style="width:${Math.min(100, Math.round(s.readyCount / Math.max(1, s.incomingCount + s.outgoingCount) * 100))}%"></span></div>
            <div class="row gap-3 mt-4 tiny" style="color:#a9bdd4">
              <span>${UI.icon('stack')} ${s.sortingCount} sorting</span>
              <span>${UI.icon('truck')} ${s.readyCount} ready</span>
              <span>${UI.icon('moped')} ${branchRiders().length} riders</span>
            </div>
          </div>
          <div class="card">
            <div class="card-head" style="padding:14px 16px"><div><h4 style="font-size:var(--text-sm)">Rider availability</h4><p class="sub">${branchRiders().filter((r) => r.status === 'active').length} active at this hub</p></div><a class="link tiny" href="#/riders">Manage</a></div>
            <div class="card-body" style="padding:10px 16px">
              ${branchRiders().slice(0, 4).map((r) => {
                const tasks = S.state.parcels.filter((p) => p.riderId === r.id && [6, 7].includes(p.status)).length;
                return `<div class="between" style="padding:7px 0;border-bottom:1px solid var(--line-soft)">
                  <div class="row gap-2">${UI.avatar(r.name, { size: 'sm' })}<div><div class="tiny strong">${UI.esc(r.name)}</div><div class="tiny faint">${UI.esc(r.zone)}</div></div></div>
                  <span class="badge ${tasks ? 'badge-info' : 'badge-neutral'}">${tasks} task${tasks === 1 ? '' : 's'}</span>
                </div>`;
              }).join('') || '<div class="tiny muted" style="padding:8px 0">No riders assigned.</div>'}
            </div>
          </div>
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-clock-counter-clockwise"></i> Recent hub scans</h4>
            <div class="stack gap-2 mt-3">
              ${recentScans.map((p) => `<button class="between text-left" data-scan-try="${p.tracking}" style="width:100%;padding:6px 0;border-bottom:1px solid var(--line-soft)">
                <div><div class="mono tiny" style="font-weight:600">${p.tracking}</div><div class="tiny faint">${UI.esc((p.timeline[p.timeline.length - 1] || {}).label || '')}</div></div>
                <span class="tiny faint">${UI.relative(p.updatedAt)}</span>
              </button>`).join('') || '<span class="tiny muted">No scans recorded yet.</span>'}
            </div>
          </div>
        </div>
      </div>`;

    const form = el.querySelector('[data-quick-scan]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      App.go('scan');
      setTimeout(() => {
        const input = document.querySelector('[data-scan-input]');
        if (input) {
          input.value = form.querySelector('[name="tracking"]').value;
          document.querySelector('[data-scan-form]').dispatchEvent(new Event('submit'));
        }
      }, 120);
    });
    el.querySelectorAll('[data-scan-try]').forEach((b) => b.addEventListener('click', () => {
      App.go('scan');
      setTimeout(() => {
        const input = document.querySelector('[data-scan-input]');
        if (input) { input.value = b.dataset.scanTry; document.querySelector('[data-scan-form]').dispatchEvent(new Event('submit')); }
      }, 120);
    }));
    el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const p = S.parcel(b.dataset.act);
      if (!p) return;
      if (p.status === 4) S.branchAdvance(p.id, 'receive_dest', { branchId, actor });
      else if (p.status === 5) { assignRiderModal(p, ctx); return; }
      else S.branchAdvance(p.id, 'receive_origin', { branchId, actor });
      UI.toast('Parcel updated', p.tracking, 'success');
      ctx.refresh();
    }));

    const canvas = document.getElementById('bThroughput');
    if (canvas) {
      const series = S.dailySeries(scopeParcels(), 7);
      ZR.charts.areaLine('bThroughput', {
        labels: series.map((d) => d.label),
        series: [
          { label: 'Inbound', data: series.map((d) => d.created) },
          { label: 'Delivered', data: series.map((d) => d.delivered), color: ZR.charts.tokens().success, fill: false }
        ],
        legend: true
      });
    }
  }

  /* ------------------------------------------------------------------- scan */
  function renderScan(el, ctx) {
    const recent = scopeParcels().filter((p) => p.timeline.some((t) => t.by === branchCode)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8);
    el.innerHTML = `
      ${App.pageHead({ title: 'Parcel scanning', sub: `Scan at ${branch.code} to receive, sort, dispatch or hand off to a rider.`, actions: `<a class="btn btn-sm" href="#/incoming">${UI.icon('download-simple')} Inbound queue</a>` })}
      <div class="grid" style="grid-template-columns:1.2fr .8fr;gap:16px;align-items:start" id="scanGrid">
        <div class="stack gap-4">
          <form class="card card-pad" data-scan-form>
            <label class="label mb-2" for="scanInput">Tracking number</label>
            <div class="row gap-2" style="align-items:stretch">
              <div class="input-icon grow">${UI.icon('barcode')}<input class="input mono" id="scanInput" data-scan-input name="tracking" placeholder="e.g. ZR4829103756" autocomplete="off" style="height:50px;font-size:var(--text-md)" aria-label="Scan tracking number"></div>
              <button class="btn btn-primary" type="submit" style="height:50px;padding-inline:22px">${UI.icon('scan')} Scan</button>
            </div>
            <div class="row gap-2 mt-3 wrap">
              <span class="tiny muted">Try:</span>
              ${scopeParcels().slice(0, 4).map((p) => `<button type="button" class="badge badge-neutral mono" data-try="${p.tracking}" style="cursor:pointer">${p.tracking}</button>`).join('')}
            </div>
            <p class="tiny faint mt-3">${UI.icon('info')} Scanning is simulated. Each valid action appends a timestamped event to the parcel’s shared timeline.</p>
          </form>
          <div data-scan-result>${scanIdle()}</div>
        </div>
        <div class="stack gap-4">
          <div class="card">
            <div class="card-head" style="padding:14px 16px"><div><h4 style="font-size:var(--text-sm)">Recent scans at ${branch.code}</h4><p class="sub">Latest timeline events</p></div></div>
            <div class="card-body" style="padding:8px 16px">
              <div class="stack gap-1">
                ${recent.map((p) => `<button class="between text-left" data-open="${p.id}" style="width:100%;padding:8px 0;border-bottom:1px solid var(--line-soft)">
                  <div style="min-width:0"><div class="mono tiny strong">${p.tracking}</div><div class="tiny faint">${UI.esc((p.timeline[p.timeline.length - 1] || {}).label || '')}</div></div>
                  <div class="text-right"><div class="tiny faint">${UI.relative(p.updatedAt)}</div>${UI.statusBadge(p.statusKey, { short: true })}</div>
                </button>`).join('') || '<span class="tiny muted" style="padding:8px 0">No scans yet.</span>'}
              </div>
            </div>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-question"></i> Scan rules</h4>
            <div class="stack gap-2 mt-3 tiny muted" style="line-height:1.5">
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">1</span> Pickup parcels must be received at origin</div>
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">2</span> Origin can dispatch once sorted</div>
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">3</span> Destination receives, then assigns a rider</div>
              <div class="row gap-2"><span class="badge badge-neutral" style="min-width:20px;justify-content:center">4</span> Invalid transitions are blocked</div>
            </div>
          </div>
        </div>
      </div>`;

    const form = el.querySelector('[data-scan-form]');
    const host = el.querySelector('[data-scan-result]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      scanLookup(form.querySelector('[data-scan-input]').value, host, ctx);
    });
    el.querySelectorAll('[data-try]').forEach((b) => b.addEventListener('click', () => {
      form.querySelector('[data-scan-input]').value = b.dataset.try;
      form.dispatchEvent(new Event('submit'));
    }));
    host.addEventListener('click', (e) => {
      const quick = e.target.closest('[data-try]');
      if (quick) { form.querySelector('[data-scan-input]').value = quick.dataset.try; form.dispatchEvent(new Event('submit')); }
    });
    el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => parcelModal(b.dataset.open, ctx)));
  }

  /* ---------------------------------------------------------------- inbound */
  function renderIncoming(el, ctx) {
    const rows = S.state.parcels.filter((p) => p.destBranchId === branchId && [4, 5, 6, 7].includes(p.status));
    el.innerHTML = `
      ${App.pageHead({ title: 'Incoming shipments', sub: `Parcels routed to ${branch.name}. Receive them, then assign a rider.`, actions: `<a class="btn btn-sm btn-primary" href="#/scan">${UI.icon('scan')} Scan intake</a>` })}
      <div class="grid g-3 mb-5">
        ${kpi({ label: 'In line-haul', value: UI.num(rows.filter((p) => p.status === 4).length), icon: 'truck', tone: 'sky', foot: 'arriving from origin hubs' })}
        ${kpi({ label: 'Received, unassigned', value: UI.num(rows.filter((p) => p.status === 5).length), icon: 'warehouse', tone: 'warn', foot: 'need rider assignment' })}
        ${kpi({ label: 'Out for delivery', value: UI.num(rows.filter((p) => [6, 7].includes(p.status)).length), icon: 'moped', tone: 'violet', foot: 'with riders now' })}
      </div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Incoming parcels',
      searchPlaceholder: 'Search tracking, customer or merchant…',
      searchFields: ['tracking', 'merchantName', (r) => r.customer.name, (r) => r.customer.phone],
      pageSize: 10,
      filters: [{ key: 'statusKey', label: 'Status', options: [4, 5, 6, 7].map((i) => ({ value: ZR.STATUSES[i].key, label: ZR.STATUSES[i].label })) }],
      columns: [
        { key: 'tracking', label: 'Tracking', render: (p) => `<span class="tracking-code">${p.tracking}</span>` },
        { key: 'customer', label: 'Receiver', render: (p) => `<div class="tiny strong">${UI.esc(p.customer.name)}</div><div class="tiny muted">${UI.esc(p.customer.upazila)} · ${UI.esc(p.customer.phone)}</div>` },
        { key: 'merchantName', label: 'Merchant', render: (p) => `<span class="tiny">${UI.esc(p.merchantName)}</span>` },
        { key: 'statusKey', label: 'Status', render: (p) => UI.statusBadge(p.statusKey, { short: true }) },
        { key: 'cod', label: 'COD', align: 'right', render: (p) => `<span class="num">${money(p.cod)}</span>` },
        { key: 'actions', label: 'Action', render: (p) => p.status === 4
          ? `<button class="btn btn-sm btn-primary" data-receive="${p.id}">${UI.icon('check')} Receive</button>`
          : p.status === 5 ? `<button class="btn btn-sm" data-assign="${p.id}">${UI.icon('user-focus')} Assign rider</button>`
          : `<button class="btn btn-sm" data-view="${p.id}">${UI.icon('eye')} View</button>` }
      ],
      onRow: (p) => parcelModal(p.id, ctx)
    });
    el.querySelectorAll('[data-receive]').forEach((b) => b.addEventListener('click', () => {
      const p = S.parcel(b.dataset.receive);
      S.branchAdvance(p.id, 'receive_dest', { branchId, actor });
      UI.toast('Received', p.tracking, 'success'); ctx.refresh();
    }));
    el.querySelectorAll('[data-assign]').forEach((b) => b.addEventListener('click', () => assignRiderModal(S.parcel(b.dataset.assign), ctx)));
    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => parcelModal(b.dataset.view, ctx)));
  }

  /* ---------------------------------------------------------------- outbound */
  function renderOutgoing(el, ctx) {
    const rows = S.state.parcels.filter((p) => p.originBranchId === branchId && [2, 3, 4].includes(p.status));
    el.innerHTML = `
      ${App.pageHead({ title: 'Outgoing shipments', sub: 'Sort, bag and dispatch parcels leaving this hub.', actions: `<a class="btn btn-sm" href="#/sorting">${UI.icon('stack')} Sorting bay</a><a class="btn btn-sm btn-primary" href="#/bags">${UI.icon('bag')} Create bag</a>` })}
      <div class="grid g-3 mb-5">
        ${kpi({ label: 'Awaiting sort', value: UI.num(rows.filter((p) => p.status <= 3).length), icon: 'stack', tone: 'warn', foot: 'ready to bag' })}
        ${kpi({ label: 'Ready to dispatch', value: UI.num(rows.filter((p) => p.status === 3).length), icon: 'truck', tone: 'success', foot: 'scanned at origin' })}
        ${kpi({ label: 'Already in transit', value: UI.num(rows.filter((p) => p.status === 4).length), icon: 'arrows-left-right', tone: 'sky', foot: 'on line-haul' })}
      </div>
      <div data-table></div>`;
    UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Outgoing parcels',
      searchable: true,
      searchFields: ['tracking', 'merchantName', (r) => r.customer.name, (r) => r.customer.district],
      pageSize: 10,
      columns: [
        { key: 'tracking', label: 'Tracking', render: (p) => `<span class="tracking-code">${p.tracking}</span>` },
        { key: 'destination', label: 'Destination', render: (p) => `<div class="tiny strong">${UI.esc(p.customer.district)}</div><div class="tiny muted">${UI.esc((S.branch(p.destBranchId) || {}).code || '—')}</div>` },
        { key: 'statusKey', label: 'Status', render: (p) => UI.statusBadge(p.statusKey, { short: true }) },
        { key: 'bagId', label: 'Bag', render: (p) => p.bagId ? `<span class="mono tiny">${p.bagId}</span>` : '<span class="tiny faint">Not bagged</span>' },
        { key: 'weight', label: 'Weight', align: 'right', render: (p) => `<span class="tiny">${p.weight} kg</span>` },
        { key: 'actions', label: 'Action', render: (p) => `<button class="btn btn-sm" data-dispatch="${p.id}">${UI.icon('truck')} Dispatch</button>` }
      ]
    });
    el.querySelectorAll('[data-dispatch]').forEach((b) => b.addEventListener('click', () => {
      const p = S.parcel(b.dataset.dispatch);
      S.branchAdvance(p.id, 'dispatch', { branchId, actor });
      UI.toast('Dispatched', `${p.tracking} → ${(S.branch(p.destBranchId) || {}).code || 'destination'}`, 'success');
      ctx.refresh();
    }));
  }

  /* ---------------------------------------------------------------- sorting */
  function renderSorting(el, ctx) {
    const rows = S.state.parcels.filter((p) => (p.originBranchId === branchId || p.destBranchId === branchId) && [3, 5].includes(p.status));
    el.innerHTML = `
      ${App.pageHead({ title: 'Sorting bay', sub: 'Select parcels, create a consignment bag and seal it for dispatch.', actions: `<a class="btn btn-sm" href="#/bags">${UI.icon('bag')} All bags</a>` })}
      <div class="alert info mb-4">${UI.icon('info')}<div>Bags group parcels heading to the same destination hub. Sealing a bag dispatches all parcels inside it and updates their shared timelines.</div></div>
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Awaiting sorting', value: UI.num(rows.length), icon: 'stack', tone: 'warn', foot: 'at this hub' })}
        ${kpi({ label: 'Open bags', value: UI.num(S.state.bags.filter((b) => b.originBranchId === branchId && b.status === 'open').length), icon: 'bag', foot: 'accepting parcels' })}
        ${kpi({ label: 'Total bag weight', value: UI.kg(S.state.bags.filter((b) => b.originBranchId === branchId).reduce((s, b) => s + b.weight, 0)), icon: 'scales', tone: 'sky', foot: 'current consignments' })}
        ${kpi({ label: 'Destination hubs', value: UI.num(new Set(rows.map((p) => p.destBranchId)).size), icon: 'buildings', tone: 'violet', foot: 'in this queue' })}
      </div>
      <div class="grid" style="grid-template-columns:1fr 300px;gap:16px;align-items:start" id="sortingGrid">
        <div data-table></div>
        <div class="card card-pad" style="position:sticky;top:calc(var(--topbar-h) + 16px)">
          <h4 style="font-size:var(--text-sm)"><i class="ph ph-bag"></i> Bag builder</h4>
          <p class="tiny muted mt-2" style="line-height:1.6">Select parcels from the table, then choose a destination hub to create a consignment.</p>
          <div class="summary-line mt-3"><span>Selected</span><strong data-sel-count>0 parcels</strong></div>
          <div class="summary-line"><span>Total weight</span><strong data-sel-weight>0 kg</strong></div>
          <div class="field mt-3"><label class="label" for="bagDest">Destination hub</label>
            <select class="select" id="bagDest">${S.state.branches.filter((b) => b.id !== branchId).map((b) => `<option value="${b.id}">${b.code} · ${UI.esc(b.name)}</option>`).join('')}</select>
          </div>
          <button class="btn btn-primary btn-block mt-3" data-create-bag>${UI.icon('bag')} Create bag</button>
          <p class="tiny faint mt-2">${UI.icon('flask')} Bag creation updates parcel records locally.</p>
        </div>
      </div>`;

    const table = UI.table(el.querySelector('[data-table]'), {
      rows,
      label: 'Sorting queue',
      searchPlaceholder: 'Search tracking or destination…',
      searchFields: ['tracking', (r) => r.customer.district],
      pageSize: 10,
      selectable: true,
      columns: [
        { key: 'tracking', label: 'Tracking', render: (p) => `<span class="tracking-code">${p.tracking}</span>` },
        { key: 'customer', label: 'Destination', render: (p) => `<div class="tiny strong">${UI.esc(p.customer.district)}</div><div class="tiny muted">${UI.esc(p.customer.upazila)}</div>` },
        { key: 'dest', label: 'Hub', render: (p) => `<span class="badge badge-neutral mono">${UI.esc((S.branch(p.destBranchId) || {}).code || '—')}</span>` },
        { key: 'statusKey', label: 'Status', render: (p) => UI.statusBadge(p.statusKey, { short: true }) },
        { key: 'weight', label: 'Weight', align: 'right', render: (p) => `<span class="tiny">${p.weight} kg</span>` }
      ],
      onSelect: (ids) => {
        const selected = rows.filter((p) => ids.includes(p.id));
        el.querySelector('[data-sel-count]').textContent = `${selected.length} parcel${selected.length === 1 ? '' : 's'}`;
        el.querySelector('[data-sel-weight]').textContent = UI.kg(selected.reduce((s, p) => s + p.weight, 0));
      }
    });

    el.querySelector('[data-create-bag]').addEventListener('click', () => {
      const ids = table.getSelected();
      if (!ids.length) { UI.toast('Select parcels', 'Choose at least one parcel to bag.', 'warn'); return; }
      const destId = el.querySelector('#bagDest').value;
      const bag = S.createBag({ originBranchId: branchId, destBranchId: destId, parcelIds: ids }, { actor });
      S.setBagStatus(bag.id, 'sealed', { actor });
      UI.toast('Bag created & sealed', `${bag.id} · ${bag.parcelCount} parcels · ${UI.kg(bag.weight)}`, 'success');
      App.go('bags');
    });
  }

  /* ------------------------------------------------------------------- bags */
  function renderBags(el, ctx) {
    const rows = S.state.bags.filter((b) => b.originBranchId === branchId || b.destBranchId === branchId);
    const label = (id) => { const b = S.branch(id); return b ? `${b.code} · ${b.name}` : '—'; };
    el.innerHTML = `
      ${App.pageHead({ title: 'Consignments', sub: 'Sealed bags moving between hubs. Each bag scan updates every parcel inside.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Open bags', value: UI.num(rows.filter((b) => b.status === 'open').length), icon: 'bag', tone: 'warn', foot: 'not sealed yet' })}
        ${kpi({ label: 'Sealed', value: UI.num(rows.filter((b) => b.status === 'sealed').length), icon: 'lock-simple', foot: 'ready to dispatch' })}
        ${kpi({ label: 'In transit', value: UI.num(rows.filter((b) => b.status === 'dispatched').length), icon: 'truck', tone: 'sky', foot: 'between hubs' })}
        ${kpi({ label: 'Received', value: UI.num(rows.filter((b) => b.status === 'received').length), icon: 'check-circle', tone: 'success', foot: 'at destination' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Bag list</h3><p class="sub">Consignments touching ${branch.code}</p></div><button class="btn btn-sm" data-new>${UI.icon('plus')} New bag</button></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Bag</th><th>Route</th><th class="cell-num">Parcels</th><th class="cell-num">Weight</th><th>Sealed by</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map((b) => `<tr>
            <td class="cell-strong mono">${b.id}</td>
            <td class="tiny">${UI.esc(label(b.originBranchId))}<div class="tiny faint">→ ${UI.esc(label(b.destBranchId))}</div></td>
            <td class="cell-num">${b.parcelCount}</td>
            <td class="cell-num tiny">${UI.kg(b.weight)}</td>
            <td class="tiny muted">${UI.esc(b.sealedBy || '—')}<div class="tiny faint">${b.sealedAt ? UI.relative(b.sealedAt) : ''}</div></td>
            <td>${UI.userBadge(b.status)}</td>
            <td class="cell-actions">
              <button class="icon-btn sm" data-manifest="${b.id}" aria-label="Print manifest" title="Print manifest">${UI.icon('printer')}</button>
              ${b.status === 'open' && b.originBranchId === branchId ? `<button class="btn btn-sm" data-seal="${b.id}">Seal</button>` : ''}
              ${b.status === 'sealed' && b.originBranchId === branchId ? `<button class="btn btn-sm btn-primary" data-dispatch="${b.id}">Dispatch</button>` : ''}
              ${b.status === 'dispatched' && b.destBranchId === branchId ? `<button class="btn btn-sm btn-primary" data-receive="${b.id}">Receive</button>` : ''}
            </td>
          </tr>`).join('') || `<tr><td colspan="7">${UI.empty({ icon: 'ph-bag', title: 'No consignments yet', body: 'Create a bag from the sorting bay.', action: '<a class="btn btn-sm btn-primary" href="#/sorting">Open sorting bay</a>' })}</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="card mt-4">
        <div class="card-head"><div><h3>How bag scanning works</h3><p class="sub">Consignment lifecycle</p></div></div>
        <div class="card-body">
          <div class="steps">
            ${[['Open', 'Parcels added'], ['Sealed', 'Bag locked with a manifest'], ['Dispatched', 'Line-haul departure'], ['Received', 'Destination intake']].map(([t], i) => `<div class="step ${i === 0 ? 'current' : ''}">
              ${i < 3 ? '<span class="step-line"></span>' : ''}<span class="step-dot">${i + 1}</span><span class="step-label">${t}</span>
            </div>`).join('')}
          </div>
          <p class="tiny muted mt-4 text-center">Sealing and dispatching a bag updates the status of every parcel inside it.</p>
        </div>
      </div>`;

    const processBag = (bag, action) => {
      const parcelIds = S.state.parcels.filter((p) => p.bagId === bag.id).map((p) => p.id);
      if (action === 'dispatch') {
        parcelIds.forEach((id) => { const p = S.parcel(id); if (p && p.status <= 3) S.branchAdvance(p.id, 'dispatch', { branchId, actor }); });
        S.setBagStatus(bag.id, 'dispatched', { actor });
        S.notify({ audience: 'branch', title: 'Consignment dispatched', body: `${bag.id} · ${bag.parcelCount} parcels to ${(S.branch(bag.destBranchId) || {}).code}`, tone: 'info', icon: 'ph-truck', link: '#/incoming' });
      } else if (action === 'receive') {
        parcelIds.forEach((id) => { const p = S.parcel(id); if (p && p.status === 4) S.branchAdvance(p.id, 'receive_dest', { branchId, actor }); });
        S.setBagStatus(bag.id, 'received', { actor });
      }
      UI.toast(`Bag ${action}`, bag.id, 'success');
      ctx.refresh();
    };

    el.querySelectorAll('[data-seal]').forEach((b) => b.addEventListener('click', () => { const bag = rows.find((x) => x.id === b.dataset.seal); S.setBagStatus(bag.id, 'sealed', { actor }); UI.toast('Bag sealed', bag.id, 'success'); ctx.refresh(); }));
    el.querySelectorAll('[data-dispatch]').forEach((b) => b.addEventListener('click', () => { const bag = rows.find((x) => x.id === b.dataset.dispatch); processBag(bag, 'dispatch'); }));
    el.querySelectorAll('[data-receive]').forEach((b) => b.addEventListener('click', () => { const bag = rows.find((x) => x.id === b.dataset.receive); processBag(bag, 'receive'); }));
    el.querySelectorAll('[data-manifest]').forEach((b) => b.addEventListener('click', () => printManifest(rows.find((x) => x.id === b.dataset.manifest))));
    el.querySelector('[data-new]').addEventListener('click', () => App.go('sorting'));
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-bags.csv', rows, [
      { key: 'id', label: 'Bag' }, { key: 'parcelCount', label: 'Parcels' }, { key: 'weight', label: 'Weight' },
      { key: 'status', label: 'Status' }, { key: 'sealedBy', label: 'Sealed by' }
    ]));
  }

  function printManifest(bag) {
    const parcels = S.state.parcels.filter((p) => p.bagId === bag.id);
    UI.print(`
      <div class="invoice">
        <div class="inv-head">
          <div><div style="font-family:'Plus Jakarta Sans';font-weight:800;font-size:22px;letter-spacing:-.04em">zeriour.</div>
            <div class="tiny muted">Branch manifest · ${UI.esc(branch.name)} (${branch.code})<br>${UI.esc(branch.address)}</div></div>
          <div style="text-align:right"><div style="font-weight:700;font-size:18px">CONSIGNMENT</div><div class="tiny mono">${bag.id}</div><div class="tiny">${UI.date(new Date().toISOString())}</div></div>
        </div>
        <div style="display:flex;gap:30px;margin-top:16px;font-size:11px">
          <div><div class="k">FROM</div><div class="v">${UI.esc((S.branch(bag.originBranchId) || {}).name)}</div></div>
          <div><div class="k">TO</div><div class="v">${UI.esc((S.branch(bag.destBranchId) || {}).name)}</div></div>
          <div><div class="k">PARCELS</div><div class="v">${parcels.length}</div></div>
          <div><div class="k">WEIGHT</div><div class="v">${UI.kg(bag.weight)}</div></div>
          <div><div class="k">SEALED BY</div><div class="v">${UI.esc(bag.sealedBy || '—')}</div></div>
        </div>
        <table><thead><tr><th>#</th><th>Tracking</th><th>Destination</th><th>Receiver</th><th>Weight</th><th class="right">COD</th></tr></thead>
          <tbody>${parcels.map((p, i) => `<tr><td>${i + 1}</td><td class="mono">${p.tracking}</td><td>${UI.esc(p.customer.district)}</td><td>${UI.esc(p.customer.name)}</td><td>${p.weight} kg</td><td class="right">৳${p.cod.toLocaleString('en-US')}</td></tr>`).join('')}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:10px">
          <div>Dispatched by: ____________________</div><div>Received by: ____________________</div><div>Date: ____________</div>
        </div>
        <div style="margin-top:20px;font-size:8px;color:#777;border-top:1px solid #ddd;padding-top:6px">Demo manifest · Zeriour frontend prototype · Not a real shipping document</div>
      </div>`, 'Manifest ' + bag.id);
  }

  /* ----------------------------------------------------------------- riders */
  function renderRiders(el, ctx) {
    const riders = branchRiders();
    el.innerHTML = `
      ${App.pageHead({ title: 'Riders at this hub', sub: 'Delivery agents assigned to ' + branch.name + '.', actions: `<a class="btn btn-sm" href="#/incoming">${UI.icon('user-focus')} Assign deliveries</a>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Active riders', value: UI.num(riders.filter((r) => r.status === 'active').length), icon: 'moped', foot: `${riders.length} on record` })}
        ${kpi({ label: 'Tasks today', value: UI.num(S.state.parcels.filter((p) => riders.some((r) => r.id === p.riderId) && [6, 7].includes(p.status)).length), icon: 'package', tone: 'warn', foot: 'assigned to riders' })}
        ${kpi({ label: 'Delivered', value: UI.num(S.state.parcels.filter((p) => riders.some((r) => r.id === p.riderId) && p.statusKey === 'delivered').length), icon: 'check-circle', tone: 'success', foot: 'by this team' })}
        ${kpi({ label: 'COD in field', value: money(S.state.parcels.filter((p) => riders.some((r) => r.id === p.riderId) && [6, 7].includes(p.status)).reduce((s, p) => s + p.cod, 0)), icon: 'wallet', tone: 'sky', foot: 'expected collection' })}
      </div>
      <div class="grid g-2" style="gap:14px">
        ${riders.map((r) => {
          const tasks = S.state.parcels.filter((p) => p.riderId === r.id && [6, 7].includes(p.status));
          const delivered = S.state.parcels.filter((p) => p.riderId === r.id && p.statusKey === 'delivered').length;
          return `<div class="task-card">
            <div class="task-top">
              <div class="row gap-2">${UI.avatar(r.name)}<div><div class="small strong">${UI.esc(r.name)}</div><div class="tiny muted">${UI.esc(r.zone)}</div></div></div>
              ${UI.userBadge(r.status)}
            </div>
            <div class="task-body">
              <div class="grid g-3" style="gap:8px">
                <div><div class="tiny faint">Tasks</div><div class="strong num">${tasks.length}</div></div>
                <div><div class="tiny faint">Delivered</div><div class="strong num">${delivered}</div></div>
                <div><div class="tiny faint">Rating</div><div class="strong num">${UI.icon('star')} ${r.rating}</div></div>
              </div>
              <div class="row gap-2 wrap">
                <span class="badge badge-neutral">${UI.esc(r.phone)}</span>
                <span class="badge badge-neutral">${UI.esc(r.vehicle)}</span>
              </div>
            </div>
            <div class="task-actions">
              <button class="btn btn-sm" data-view="${r.id}">${UI.icon('eye')} Details</button>
              <button class="btn btn-sm btn-soft" data-assign-task="${r.id}" ${r.status !== 'active' ? 'disabled' : ''}>${UI.icon('plus')} Assign parcel</button>
            </div>
          </div>`;
        }).join('') || `<div class="card">${UI.empty({ icon: 'ph-moped', title: 'No riders at this hub', body: 'Add a rider from the admin workspace.' })}</div>`}
      </div>`;

    el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      const r = riders.find((x) => x.id === b.dataset.view);
      const tasks = S.state.parcels.filter((p) => p.riderId === r.id && [6, 7].includes(p.status));
      UI.drawer({
        title: r.name,
        subtitle: `${r.zone} · ${branch.code}`,
        body: `<div class="card card-pad mb-4"><div class="kv-grid">
          <div class="kv"><div class="k">Phone</div><div class="v">${UI.esc(r.phone)}</div></div>
          <div class="kv"><div class="k">Vehicle</div><div class="v">${UI.esc(r.vehicle)}</div></div>
          <div class="kv"><div class="k">Rating</div><div class="v">${UI.icon('star')} ${r.rating} · ${r.successRate}% success</div></div>
          <div class="kv"><div class="k">Deliveries</div><div class="v">${UI.num(r.deliveries)} lifetime</div></div>
          <div class="kv"><div class="k">Earnings</div><div class="v num">${money(r.earnings)}</div></div>
          <div class="kv"><div class="k">Joined</div><div class="v">${UI.date(r.joined)}</div></div>
        </div></div>
        <div class="detail-section"><div class="ds-head"><h4>Open tasks</h4><span class="badge badge-neutral">${tasks.length}</span></div>
          <div class="table-wrap"><table class="table table-compact"><thead><tr><th>Tracking</th><th>Area</th><th class="cell-num">COD</th></tr></thead>
          <tbody>${tasks.map((p) => `<tr><td class="mono tiny">${p.tracking}</td><td class="tiny">${UI.esc(p.customer.upazila)}</td><td class="cell-num tiny">${money(p.cod)}</td></tr>`).join('') || '<tr><td colspan="3" class="tiny muted">No open tasks.</td></tr>'}</tbody></table></div>
        </div>`,
        footer: '<button class="btn" data-close>Close</button>'
      });
    }));
    el.querySelectorAll('[data-assign-task]').forEach((b) => b.addEventListener('click', () => {
      const rider = riders.find((r) => r.id === b.dataset.assignTask);
      const eligible = S.state.parcels.filter((p) => p.destBranchId === branchId && p.status === 5 && !p.riderId);
      UI.drawer({
        title: 'Assign deliveries',
        subtitle: `${rider.name} · ${rider.zone}`,
        body: eligible.length ? eligible.map((p) => `<div class="between" style="padding:10px 0;border-bottom:1px solid var(--line-soft)">
          <div><div class="mono tiny strong">${p.tracking}</div><div class="tiny muted">${UI.esc(p.customer.name)} · ${UI.esc(p.customer.upazila)}</div></div>
          <button class="btn btn-sm btn-soft" data-assign-parcel="${p.id}" data-rider="${rider.id}">Assign</button>
        </div>`).join('') : UI.empty({ icon: 'ph-check-circle', title: 'No unassigned parcels', body: 'Receive inbound parcels at this hub first.' }),
        footer: '<button class="btn" data-close>Close</button>',
        onMount(root, close) {
          root.querySelectorAll('[data-assign-parcel]').forEach((btn) => btn.addEventListener('click', () => {
            const p = S.parcel(btn.dataset.assignParcel);
            S.assignRider(p.id, btn.dataset.rider, { actor, branchId });
            UI.toast('Assigned', `${p.tracking} → ${rider.name}`, 'success');
            close(); ctx.refresh();
          }));
        }
      });
    }));
  }

  /* ------------------------------------------------------------------ staff */
  function renderStaff(el, ctx) {
    const staff = S.state.staff.filter((s) => s.branchId === branchId);
    el.innerHTML = `
      ${App.pageHead({ title: 'Branch staff', sub: 'People with access to this hub’s scanning, sorting and cash operations.', actions: `<button class="btn btn-sm btn-primary" data-add>${UI.icon('plus')} Add staff</button>` })}
      <div class="card">
        <div class="card-head"><div><h3>Team directory</h3><p class="sub">${staff.length} staff at ${branch.code}</p></div><span class="badge badge-neutral">${branch.staff} on payroll</span></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>${staff.length ? staff.map((s) => `<tr>
            <td><div class="user-cell"><span class="avatar sm">${UI.initials(s.name)}</span><div><div class="name">${UI.esc(s.name)}</div><div class="meta">${UI.esc(s.email)}</div></div></div></td>
            <td><span class="badge badge-neutral">${UI.esc(s.role)}</span></td>
            <td class="tiny">${UI.esc(s.phone)}</td>
            <td>${UI.userBadge(s.status)}</td>
            <td class="tiny muted">${UI.date(s.joined)}</td>
          </tr>`).join('') : `<tr><td colspan="5">${UI.empty({ icon: 'ph-users', title: 'No staff records', body: 'Add staff to this branch to populate the directory.' })}</td></tr>`}</tbody>
        </table></div>
      </div>`;
    el.querySelector('[data-add]').addEventListener('click', () => {
      UI.modal({
        title: 'Add branch staff',
        body: `<form data-staff-form class="form-grid">
          <div class="field full"><label class="label">Full name</label><input class="input" name="name" placeholder="Staff member name"><span class="error-text" hidden></span></div>
          <div class="field"><label class="label">Role</label><select class="select" name="role">${['Sorting Supervisor', 'Scanning Operator', 'Cashier', 'Dispatcher', 'Branch Manager'].map((r) => `<option>${r}</option>`).join('')}</select></div>
          <div class="field"><label class="label">Phone</label><input class="input" name="phone" placeholder="+8801…"></div>
        </form>`,
        footer: '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-save>Add staff</button>',
        onMount(root, close) {
          root.querySelector('[data-save]').addEventListener('click', () => {
            const form = root.querySelector('[data-staff-form]');
            if (!UI.validate(form, { name: [UI.validators.required], phone: [UI.validators.required, UI.validators.phone] })) return;
            const fd = new FormData(form);
            S.state.staff.push({
              id: 'stf_' + Date.now().toString(36), name: fd.get('name'), role: fd.get('role'),
              branchId, phone: fd.get('phone'), email: fd.get('name').toLowerCase().replace(/\s+/g, '.') + '@zeriour.demo',
              status: 'active', joined: new Date().toISOString()
            });
            S.log(actor, 'branch', `Added staff ${fd.get('name')}`, branchCode, 'staff');
            S.save('staff:add');
            UI.toast('Staff added', fd.get('name'), 'success');
            close(); ctx.refresh();
          });
        }
      });
    });
  }

  /* -------------------------------------------------------------------- COD */
  function renderCod(el, ctx) {
    const riders = branchRiders();
    const delivered = S.state.parcels.filter((p) => riders.some((r) => r.id === p.riderId) && p.statusKey === 'delivered');
    const today = new Date();
    const todayList = delivered.filter((p) => p.deliveredAt && S.sameDay(p.deliveredAt, today));
    el.innerHTML = `
      ${App.pageHead({ title: 'COD collection records', sub: 'Cash collected by branch riders, reconciled per parcel.', actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Collected today', value: money(todayList.reduce((s, p) => s + (p.codCollected || p.cod), 0)), icon: 'wallet', tone: 'success', foot: `${todayList.length} parcels` })}
        ${kpi({ label: 'Collected lifetime', value: money(delivered.reduce((s, p) => s + (p.codCollected || p.cod), 0)), icon: 'coins', foot: `${delivered.length} delivered` })}
        ${kpi({ label: 'COD fees', value: money(delivered.reduce((s, p) => s + p.codCharge, 0)), icon: 'receipt', tone: 'sky', foot: 'retained by platform' })}
        ${kpi({ label: 'Awaiting deposit', value: money(S.state.parcels.filter((p) => riders.some((r) => r.id === p.riderId) && [6, 7].includes(p.status)).reduce((s, p) => s + p.cod, 0)), icon: 'hourglass', tone: 'warn', foot: 'still with riders' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Collection records</h3><p class="sub">Most recent settlements at this hub</p></div><span class="badge badge-success"><i class="dot"></i>Reconciled</span></div>
        <div class="table-wrap"><table class="table table-compact">
          <thead><tr><th>Tracking</th><th>Rider</th><th>Delivered</th><th class="cell-num">COD collected</th><th class="cell-num">COD fee</th><th class="cell-num">Net to merchant</th></tr></thead>
          <tbody>${delivered.slice(0, 14).map((p) => `<tr>
            <td class="mono tiny">${p.tracking}</td>
            <td class="tiny">${UI.esc((S.rider(p.riderId) || {}).name || '—')}</td>
            <td class="tiny muted">${UI.dateTime(p.deliveredAt)}</td>
            <td class="cell-num">${money(p.codCollected || p.cod)}</td>
            <td class="cell-num" style="color:var(--danger)">−${money(p.codCharge)}</td>
            <td class="cell-num cell-strong">${money(Math.max(0, (p.codCollected || p.cod) - p.codCharge - p.deliveryCharge))}</td>
          </tr>`).join('') || `<tr><td colspan="6">${UI.empty({ icon: 'ph-wallet', title: 'No COD collections', body: 'Collections appear when branch riders complete deliveries.' })}</td></tr>`}</tbody>
        </table></div>
      </div>`;
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-branch-cod.csv', delivered, [
      { key: 'tracking', label: 'Tracking' }, { key: 'rider', label: 'Rider', value: (p) => (S.rider(p.riderId) || {}).name },
      { key: 'cod', label: 'COD collected', value: (p) => p.codCollected || p.cod },
      { key: 'fee', label: 'COD fee', value: (p) => p.codCharge },
      { key: 'date', label: 'Delivered', value: (p) => UI.dateTime(p.deliveredAt) }
    ]));
  }

  /* ---------------------------------------------------------------- returns */
  function renderReturns(el, ctx) {
    const rows = scopeParcels().filter((p) => [9, 10, 11].includes(p.status));
    el.innerHTML = `
      ${App.pageHead({ title: 'Return processing', sub: 'Failed deliveries routed back through this hub.', actions: `<a class="btn btn-sm" href="#/incoming">${UI.icon('warehouse')} Inbound</a>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Failed at hub', value: UI.num(rows.filter((p) => p.statusKey === 'failed').length), icon: 'x-circle', tone: 'danger', foot: 'needs processing' })}
        ${kpi({ label: 'Return initiated', value: UI.num(rows.filter((p) => p.statusKey === 'return_initiated').length), icon: 'arrow-u-up-left', tone: 'warn', foot: 'in return flow' })}
        ${kpi({ label: 'Returned', value: UI.num(rows.filter((p) => p.statusKey === 'returned').length), icon: 'arrow-counter-clockwise', foot: 'completed' })}
        ${kpi({ label: 'Return COD at risk', value: money(rows.reduce((s, p) => s + p.cod, 0)), icon: 'coins', tone: 'sky', foot: 'uncollected value' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Return queue</h3><p class="sub">${rows.length} parcels</p></div><span class="badge badge-warn">Process before closing</span></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Tracking</th><th>Customer</th><th>Reason</th><th>Attempts</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.map((p) => `<tr>
            <td class="mono tiny">${p.tracking}</td>
            <td class="tiny">${UI.esc(p.customer.name)}<div class="tiny faint">${UI.esc(p.customer.upazila)}</div></td>
            <td class="tiny muted" style="max-width:220px">${UI.esc(p.returnReason || 'Delivery attempt failed')}</td>
            <td class="tiny">${p.attempts || 0}</td>
            <td>${UI.statusBadge(p.statusKey, { short: true })}</td>
            <td class="cell-actions">
              ${p.statusKey === 'failed' ? `<button class="btn btn-sm" data-retry="${p.id}">${UI.icon('arrows-clockwise')} Retry</button><button class="btn btn-sm btn-danger-soft" data-return="${p.id}">Initiate return</button>` : ''}
              ${p.statusKey === 'return_initiated' ? `<button class="btn btn-sm btn-primary" data-returned="${p.id}">${UI.icon('check')} Mark returned</button>` : ''}
            </td>
          </tr>`).join('') || `<tr><td colspan="6">${UI.empty({ icon: 'ph-check-circle', title: 'No returns', body: 'Nothing to process at this hub.' })}</td></tr>`}</tbody>
        </table></div>
      </div>`;
    el.querySelectorAll('[data-retry]').forEach((b) => b.addEventListener('click', () => {
      const p = S.parcel(b.dataset.retry);
      S.riderAction(p.id, 'reschedule', { actor, date: 'tomorrow' });
      UI.toast('Retry scheduled', p.tracking, 'success'); ctx.refresh();
    }));
    el.querySelectorAll('[data-return]').forEach((b) => b.addEventListener('click', async () => {
      const p = S.parcel(b.dataset.return);
      const ok = await UI.confirm({ title: 'Initiate return?', body: `${p.tracking} will enter the return flow back to ${p.merchantName}.`, confirmText: 'Initiate return' });
      if (!ok) return;
      S.riderAction(p.id, 'return_initiate', { actor });
      UI.toast('Return initiated', p.tracking, 'success'); ctx.refresh();
    }));
    el.querySelectorAll('[data-returned]').forEach((b) => b.addEventListener('click', () => {
      const p = S.parcel(b.dataset.returned);
      S.riderAction(p.id, 'mark_returned', { actor });
      UI.toast('Return completed', p.tracking, 'success'); ctx.refresh();
    }));
  }

  /* ---------------------------------------------------------------- reports */
  function renderReports(el, ctx) {
    const s = S.statsBranch(branchId);
    const riders = branchRiders();
    const riderPerf = riders.map((r) => {
      const mine = S.state.parcels.filter((p) => p.riderId === r.id);
      const delivered = mine.filter((p) => p.statusKey === 'delivered');
      const closed = mine.filter((p) => [8, 9, 11].includes(p.status));
      return {
        name: r.name,
        tasks: mine.length,
        delivered: delivered.length,
        closed: closed.length,
        cod: delivered.reduce((x, p) => x + p.cod, 0)
      };
    }).sort((a, b) => b.delivered - a.delivered);

    el.innerHTML = `
      ${App.pageHead({ title: 'Branch performance', sub: `Operational reporting for ${branch.name}.`, actions: `<button class="btn btn-sm" data-export>${UI.icon('download-simple')} Export report</button>` })}
      <div class="grid g-4 mb-5">
        ${kpi({ label: 'Parcels handled', value: UI.num(scopeParcels().length), icon: 'package', foot: 'lifetime at this hub' })}
        ${kpi({ label: 'Delivered', value: UI.num(scopeParcels().filter((p) => p.statusKey === 'delivered').length), icon: 'check-circle', tone: 'success', foot: 'successful deliveries' })}
        ${kpi({ label: 'Avg. handling', value: '6.4h', icon: 'clock', tone: 'sky', foot: 'intake to dispatch' })}
        ${kpi({ label: 'Rider utilisation', value: (riders.length ? Math.round(scopeParcels().filter((p) => riders.some((r) => r.id === p.riderId)).length / riders.length) : 0) + ' / rider', icon: 'moped', tone: 'violet', foot: 'parcels per agent' })}
      </div>
      <div class="grid" style="grid-template-columns:1.4fr 1fr;gap:16px" id="branchReports">
        <div class="card">
          <div class="card-head"><div><h3>Volume · last 7 days</h3><p class="sub">Intake vs delivered</p></div></div>
          <div class="card-body"><div class="chart-box h-240"><canvas id="bReportChart"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Rider performance</h3><p class="sub">Delivered parcels by agent</p></div></div>
          <div class="card-body"><div class="chart-box h-240"><canvas id="bRiderChart"></canvas></div></div>
        </div>
      </div>
      <div class="card mt-4">
        <div class="card-head"><div><h3>Agent breakdown</h3><p class="sub">Task and COD performance</p></div></div>
        <div class="table-wrap"><table class="table table-compact">
          <thead><tr><th>Rider</th><th>Zone</th><th class="cell-num">Assigned</th><th class="cell-num">Delivered</th><th class="cell-num">COD</th><th class="cell-num">Success</th></tr></thead>
          <tbody>${riderPerf.map((r) => `<tr><td class="cell-strong">${UI.esc(r.name)}</td><td class="tiny muted">${UI.esc((riders.find((x) => x.name === r.name) || {}).zone || '')}</td>
            <td class="cell-num">${r.tasks}</td><td class="cell-num">${r.delivered}</td><td class="cell-num">${money(r.cod)}</td>
            <td class="cell-num">${r.closed ? Math.round(r.delivered / r.closed * 100) : 0}%</td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;

    if (document.getElementById('bReportChart')) {
      const series = S.dailySeries(scopeParcels(), 7);
      ZR.charts.bars('bReportChart', {
        labels: series.map((d) => d.label),
        series: [
          { label: 'Intake', data: series.map((d) => d.created) },
          { label: 'Delivered', data: series.map((d) => d.delivered), color: ZR.charts.tokens().success }
        ]
      });
    }
    if (document.getElementById('bRiderChart')) {
      ZR.charts.bars('bRiderChart', {
        labels: riderPerf.map((r) => r.name.split(' ')[0]),
        series: [{ label: 'Delivered', data: riderPerf.map((r) => r.delivered), color: ZR.charts.tokens().violet }],
        legend: false
      });
    }
    el.querySelector('[data-export]').addEventListener('click', () => UI.csv.export('zeriour-branch-report.csv', riderPerf, [
      { key: 'name', label: 'Rider' }, { key: 'tasks', label: 'Assigned' }, { key: 'delivered', label: 'Delivered' }, { key: 'cod', label: 'COD' }
    ]));
  }

  /* ------------------------------------------------------------ activity log */
  function renderLogs(el, ctx) {
    const rows = S.state.logs.filter((l) => l.role === 'branch' || l.actor === branchCode || l.target === branchCode || l.actor === actor);
    el.innerHTML = `
      ${App.pageHead({ title: 'Branch activity log', sub: 'Operational events recorded at this hub.', actions: `<a class="btn btn-sm" href="#/scan">${UI.icon('scan')} Scan desk</a>` })}
      <div class="card">
        <div class="card-head"><div><h3>Recent events</h3><p class="sub">${rows.length} records</p></div></div>
        <div class="table-wrap"><table class="table table-compact">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Type</th></tr></thead>
          <tbody>${rows.length ? rows.map((l) => `<tr>
            <td class="tiny muted">${UI.dateTime(l.at)}</td>
            <td class="tiny">${UI.esc(l.actor)}</td>
            <td class="tiny">${UI.esc(l.action)}</td>
            <td class="mono tiny faint">${UI.esc(l.target || '—')}</td>
            <td><span class="badge badge-neutral">${UI.esc(l.type || 'general')}</span></td>
          </tr>`).join('') : `<tr><td colspan="5">${UI.empty({ icon: 'ph-list-magnifying-glass', title: 'No events yet', body: 'Scan or process a parcel to create branch activity.' })}</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="grid g-2 mt-4" style="gap:14px" id="inventoryGrid">
        <div class="card card-pad">
          <h4 style="font-size:var(--text-sm)"><i class="ph ph-stack"></i> Hub inventory snapshot</h4>
          <div class="summary-line mt-3"><span>Parcels in sorting</span><strong>${S.state.parcels.filter((p) => (p.originBranchId === branchId || p.destBranchId === branchId) && [3, 5].includes(p.status)).length}</strong></div>
          <div class="summary-line"><span>Open bags</span><strong>${S.state.bags.filter((b) => b.originBranchId === branchId && b.status === 'open').length}</strong></div>
          <div class="summary-line"><span>Sealed bags</span><strong>${S.state.bags.filter((b) => b.originBranchId === branchId && b.status === 'sealed').length}</strong></div>
          <div class="summary-line"><span>Hub capacity</span><strong>${branch.capacity.toLocaleString()} parcels / day</strong></div>
          <div class="progress mt-3"><span style="width:${Math.min(100, Math.round(scopeParcels().length / branch.capacity * 100))}%"></span></div>
        </div>
        <div class="card card-pad">
          <h4 style="font-size:var(--text-sm)"><i class="ph ph-info"></i> Branch details</h4>
          <div class="kv-grid mt-3">
            <div class="kv"><div class="k">Manager</div><div class="v">${UI.esc(branch.manager)}</div></div>
            <div class="kv"><div class="k">Phone</div><div class="v">${UI.esc(branch.phone)}</div></div>
            <div class="kv"><div class="k">Address</div><div class="v">${UI.esc(branch.address)}</div></div>
            <div class="kv"><div class="k">Staff</div><div class="v">${branch.staff}</div></div>
          </div>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------- notifications */
  function renderNotifications(el, ctx) {
    const rows = S.notificationsFor('branch');
    el.innerHTML = `
      ${App.pageHead({ title: 'Notifications', sub: 'Hub alerts, consignments and delivery updates.', actions: `<button class="btn btn-sm" data-read-all>${UI.icon('checks')} Mark all read</button>` })}
      <div class="card">
        ${rows.length ? rows.map((n) => `<div class="notif-item ${n.read ? '' : 'unread'}" style="padding:14px 16px">
          <span class="ni-ico badge-${n.tone || 'info'}">${UI.icon((n.icon || 'ph-bell').replace('ph-', ''))}</span>
          <div class="grow"><div class="between gap-2"><span class="nt">${UI.esc(n.title)}</span><span class="tiny faint">${UI.relative(n.at)}</span></div>
          <div class="nd">${UI.esc(n.body)}</div>
          <a class="link tiny mt-1" style="display:inline-block" href="${n.link || '#/overview'}">Open ${UI.icon('arrow-right')}</a></div>
        </div>`).join('') : UI.empty({ icon: 'ph-bell-slash', title: 'No notifications', body: 'Hub updates will appear here.' })}
      </div>`;
    el.querySelector('[data-read-all]').addEventListener('click', () => { S.markAllRead('branch'); UI.toast('All caught up', 'Notifications marked read.', 'success'); ctx.refresh(); });
  }

  /* ---------------------------------------------------------------- settings */
  function renderSettings(el, ctx) {
    el.innerHTML = `
      ${App.pageHead({ title: 'Branch settings', sub: 'Workspace preferences and hub session information.' })}
      <div class="grid" style="grid-template-columns:1.2fr .8fr;gap:16px;align-items:start" id="branchSettingsGrid">
        <div class="stack gap-4">
          <div class="card">
            <div class="card-head"><div><h3>Appearance</h3><p class="sub">Saved to this browser</p></div></div>
            <div class="card-body">
              <div class="between wrap gap-3"><div><div class="small strong">Theme</div><div class="tiny muted">Choose light or dark for the operations desk.</div></div>
                <div class="segmented" data-theme-pref>
                  <button data-theme="light" class="${ZR.app.theme() === 'light' ? 'is-active' : ''}">${UI.icon('sun')} Light</button>
                  <button data-theme="dark" class="${ZR.app.theme() === 'dark' ? 'is-active' : ''}">${UI.icon('moon')} Dark</button>
                </div>
              </div>
              <div class="divider" style="margin-block:14px"></div>
              <div class="between wrap gap-3"><div><div class="small strong">Scanner beep</div><div class="tiny muted">Audible feedback on successful scans.</div></div><label class="switch"><input type="checkbox" checked><span class="sr-only">Scanner beep</span></label></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Hub details</h3><p class="sub">Read-only in the branch workspace</p></div><span class="badge badge-neutral">Managed by admin</span></div>
            <div class="card-body"><div class="kv-grid">
              <div class="kv"><div class="k">Branch</div><div class="v">${UI.esc(branch.name)} (${branch.code})</div></div>
              <div class="kv"><div class="k">Manager</div><div class="v">${UI.esc(branch.manager)}</div></div>
              <div class="kv"><div class="k">District</div><div class="v">${UI.esc(branch.district)}, ${UI.esc(branch.thana)}</div></div>
              <div class="kv"><div class="k">Capacity</div><div class="v">${branch.capacity.toLocaleString()} / day</div></div>
              <div class="kv" style="grid-column:1/-1"><div class="k">Address</div><div class="v">${UI.esc(branch.address)}</div></div>
            </div></div>
          </div>
          <div class="card card-pad" style="border-color:rgba(217,45,60,.25)">
            <h4 style="font-size:var(--text-sm);color:var(--danger)"><i class="ph ph-warning"></i> Demo data</h4>
            <p class="tiny muted mt-2" style="line-height:1.6">Reset returns every role’s dataset to its original seeded state.</p>
            <button class="btn btn-sm btn-danger-soft mt-3" data-reset>Reset demo data</button>
          </div>
        </div>
        <div class="stack gap-4">
          <div class="card card-pad">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-user-circle"></i> Signed in</h4>
            <div class="row gap-2 mt-3">${UI.avatar(user.name, { tone: 'tone-sky' })}<div><div class="small strong">${UI.esc(user.name)}</div><div class="tiny muted">${UI.esc(user.email)}</div></div></div>
            <div class="summary-line mt-3"><span>Role</span><strong class="tiny">Branch staff</strong></div>
            <div class="summary-line"><span>Hub</span><strong class="tiny">${branch.code}</strong></div>
            <button class="btn btn-sm btn-block mt-3" data-switch>${UI.icon('arrows-left-right')} Switch demo role</button>
            <button class="btn btn-sm btn-ghost btn-block mt-2" data-signout>${UI.icon('sign-out')} Sign out</button>
          </div>
          <div class="card card-pad" style="background:var(--surface-2)">
            <h4 style="font-size:var(--text-sm)"><i class="ph ph-shield-check"></i> Operational access</h4>
            <div class="stack gap-2 mt-3 tiny muted">
              <span>${UI.icon('check-circle')} Scan and receive parcels</span>
              <span>${UI.icon('check-circle')} Create and seal consignments</span>
              <span>${UI.icon('check-circle')} Assign riders</span>
              <span>${UI.icon('check-circle')} Process returns</span>
              <span>${UI.icon('x-circle')} Change delivery pricing</span>
            </div>
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
    overview: { title: 'Branch overview', render: renderOverview },
    scan: { title: 'Scan parcel', render: renderScan },
    incoming: { title: 'Incoming shipments', render: renderIncoming },
    outgoing: { title: 'Outgoing shipments', render: renderOutgoing },
    sorting: { title: 'Sorting bay', render: renderSorting },
    bags: { title: 'Consignments', render: renderBags },
    riders: { title: 'Branch riders', render: renderRiders },
    staff: { title: 'Branch staff', render: renderStaff },
    cod: { title: 'COD records', render: renderCod },
    returns: { title: 'Returns', render: renderReturns },
    reports: { title: 'Branch reports', render: renderReports },
    logs: { title: 'Activity log', render: renderLogs },
    notifications: { title: 'Notifications', render: renderNotifications },
    settings: { title: 'Branch settings', render: renderSettings }
  };

  const nav = [
    { label: 'Operations', items: [
      { label: 'Overview', icon: 'squares-four', route: 'overview' },
      { label: 'Scan parcel', icon: 'scan', route: 'scan' },
      { label: 'Incoming', icon: 'download-simple', route: 'incoming', count: () => S.state.parcels.filter((p) => p.destBranchId === branchId && [4, 5].includes(p.status)).length },
      { label: 'Outgoing', icon: 'upload-simple', route: 'outgoing', count: () => S.state.parcels.filter((p) => p.originBranchId === branchId && p.status === 3).length },
      { label: 'Sorting bay', icon: 'stack', route: 'sorting' },
      { label: 'Consignments', icon: 'bag', route: 'bags' }
    ] },
    { label: 'Team', items: [
      { label: 'Riders', icon: 'moped', route: 'riders' },
      { label: 'Branch staff', icon: 'users', route: 'staff' }
    ] },
    { label: 'Records', items: [
      { label: 'COD collections', icon: 'wallet', route: 'cod' },
      { label: 'Returns', icon: 'arrow-u-up-left', route: 'returns', count: () => S.state.parcels.filter((p) => (p.originBranchId === branchId || p.destBranchId === branchId) && [9, 10].includes(p.status)).length },
      { label: 'Branch reports', icon: 'chart-bar', route: 'reports' },
      { label: 'Activity log', icon: 'list-magnifying-glass', route: 'logs' }
    ] },
    { label: 'Account', items: [
      { label: 'Notifications', icon: 'bell', route: 'notifications', count: () => S.unreadCount('branch') },
      { label: 'Settings', icon: 'gear', route: 'settings' }
    ] }
  ];

  ZR.app.registerParcelOpener((id) => {
    const p = S.parcel(id);
    if (!p || (p.originBranchId !== branchId && p.destBranchId !== branchId)) return false;
    parcelModal(id, { refresh: () => App.refresh() });
    return true;
  });

  App.mount({
    role: 'branch',
    user,
    nav,
    routes,
    defaultRoute: 'overview',
    roleLabel: branch.name,
    roleSub: `${branch.code} · ${branch.thana}`,
    searchPlaceholder: 'Search tracking, customer, riders…'
  });
})(window.ZR);
