/* ==========================================================================
   Zeriour — tracking presentation
   Shared by the public tracking page, merchant parcel drawer and internal
   parcel views so the shipment story is identical everywhere.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';
  const UI = ZR.ui;
  const T = {};
  ZR.tracking = T;

  T.PUBLIC_STAGES = ['Order created', 'Picked up', 'In transit', 'At destination hub', 'Out for delivery', 'Delivered'];
  T.stageIndex = function (parcel) {
    const s = parcel.status;
    if (s === 8) return 5;
    if (s === 7) return 4;
    if (s === 5) return 3;
    if (s === 4) return 2;
    if (s >= 2 && s <= 3) return 1;
    return 0;
  };

  T.progress = function (parcel, compact) {
    const current = T.stageIndex(parcel);
    const failed = [9, 10, 11, 12].includes(parcel.status);
    return `<div class="steps" style="${compact ? 'margin:2px 0' : ''}">
      ${T.PUBLIC_STAGES.map((label, i) => {
        const done = i < current || (i === current && parcel.status === 8);
        const isCurrent = i === current && !done;
        return `<div class="step ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}">
          ${i < T.PUBLIC_STAGES.length - 1 ? '<span class="step-line"></span>' : ''}
          <span class="step-dot">${done ? UI.icon('check') : i + 1}</span>
          <span class="step-label">${failed && i === current ? UI.esc(ZR.statusMeta(parcel.statusKey).short) : UI.esc(label)}</span>
        </div>`;
      }).join('')}
    </div>`;
  };

  T.timeline = function (parcel, opts = {}) {
    const events = parcel.timeline.slice().reverse();
    const max = opts.limit ? opts.limit : events.length;
    return `<div class="timeline">
      ${events.slice(0, max).map((e, i) => {
        const meta = ZR.statusMeta(e.status);
        const isLast = i === 0;
        const fail = ['failed', 'return_initiated', 'cancelled'].includes(e.status);
        return `<div class="tl-item ${isLast ? (fail ? 'fail' : 'current') : 'done'}">
          <span class="tl-dot"></span>
          <div class="tl-body">
            <div class="tl-title">${UI.esc(e.label || meta.label)} ${isLast ? `<span class="badge badge-${fail ? 'danger' : 'info'}" style="height:19px;font-size:10px">Latest</span>` : ''}</div>
            <div class="tl-time">${UI.dateTimeFull(e.at)} · ${UI.esc(e.by || 'System')}</div>
            ${e.note ? `<div class="tl-desc">${UI.esc(e.note)}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  };

  T.summary = function (parcel) {
    const origin = ZR.store.branch(parcel.originBranchId);
    const dest = ZR.store.branch(parcel.destBranchId) || ZR.store.branchForDistrict(parcel.customer.district);
    const meta = ZR.statusMeta(parcel.statusKey);
    return `
      <div class="card card-pad-lg" style="position:relative;overflow:hidden">
        <div class="between mb-4 wrap gap-3">
          <div>
            <div class="tiny muted" style="letter-spacing:.07em;text-transform:uppercase;font-weight:650">Tracking number</div>
            <div class="row gap-2 mt-1">
              <span class="mono" style="font-size:clamp(1.15rem,2.4vw,1.5rem);font-weight:700;letter-spacing:-.02em">${UI.esc(parcel.tracking)}</span>
              <button class="icon-btn sm" data-copy="${UI.esc(parcel.tracking)}" aria-label="Copy tracking number">${UI.icon('copy')}</button>
            </div>
          </div>
          <div>${UI.statusBadge(parcel.statusKey, { lg: true })}</div>
        </div>
        ${T.progress(parcel)}
        <div class="grid g-4 mt-6" style="gap:14px">
          <div class="kv"><div class="k">Merchant</div><div class="v">${UI.esc(parcel.merchantName)}</div></div>
          <div class="kv"><div class="k">Destination</div><div class="v">${UI.esc(parcel.customer.upazila)}, ${UI.esc(parcel.customer.district)}</div></div>
          <div class="kv"><div class="k">Estimated delivery</div><div class="v">${UI.date(parcel.eta)} · ${UI.eta(parcel.eta)}</div></div>
          <div class="kv"><div class="k">Service</div><div class="v" style="text-transform:capitalize">${UI.esc(parcel.type)} delivery</div></div>
        </div>
        ${[9, 10, 11, 12].includes(parcel.status) ? `<div class="alert ${parcel.status === 9 ? 'warn' : 'danger'} mt-4">${UI.icon(parcel.status === 9 ? 'warning' : 'arrow-u-up-left')}<div><span class="alert-title">${UI.esc(meta.label)}</span><br>${UI.esc(parcel.returnReason || 'This shipment needs attention. Contact support for details.')}</div></div>` : ''}
        <div class="between mt-4 wrap gap-3">
          <div class="tiny muted">${UI.icon('buildings')} ${UI.esc(origin ? origin.name : 'Origin hub pending')} ${UI.icon('arrow-right')} ${UI.esc(dest ? dest.name : 'Destination hub')}</div>
          <a class="link tiny" href="contact.html">Need help? Contact support ${UI.icon('arrow-up-right')}</a>
        </div>
      </div>`;
  };

  T.details = function (parcel) {
    const origin = ZR.store.branch(parcel.originBranchId);
    const dest = ZR.store.branch(parcel.destBranchId) || ZR.store.branchForDistrict(parcel.customer.district);
    const rider = ZR.store.rider(parcel.riderId);
    return `
      <div class="grid g-2" style="gap:14px">
        <div class="detail-section">
          <div class="ds-head"><h4>${UI.icon('paper-plane-tilt')} Sender & merchant</h4></div>
          <div class="ds-body">
            <div class="kv"><div class="k">Merchant</div><div class="v">${UI.esc(parcel.merchantName)}</div></div>
            <div class="kv mt-3"><div class="k">Pickup location</div><div class="v">${UI.esc(parcel.pickupLocation || '—')}</div></div>
            <div class="kv mt-3"><div class="k">Origin branch</div><div class="v">${UI.esc(origin ? `${origin.name} (${origin.code})` : 'Not assigned yet')}</div></div>
          </div>
        </div>
        <div class="detail-section">
          <div class="ds-head"><h4>${UI.icon('map-pin')} Receiver</h4></div>
          <div class="ds-body">
            <div class="kv"><div class="k">Name</div><div class="v">${UI.esc(parcel.customer.name)}</div></div>
            <div class="kv mt-3"><div class="k">Phone</div><div class="v">${UI.esc(UI.phone(parcel.customer.phone))}</div></div>
            <div class="kv mt-3"><div class="k">Address</div><div class="v">${UI.esc(parcel.customer.address)}, ${UI.esc(parcel.customer.upazila)}, ${UI.esc(parcel.customer.district)}</div></div>
            <div class="kv mt-3"><div class="k">Destination branch</div><div class="v">${UI.esc(dest ? `${dest.name} (${dest.code})` : '—')}</div></div>
          </div>
        </div>
      </div>
      <div class="detail-section mt-4">
        <div class="ds-head"><h4>${UI.icon('package')} Shipment details</h4><span class="tiny muted">${UI.esc(parcel.product || '')}</span></div>
        <div class="ds-body">
          <div class="kv-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
            <div class="kv"><div class="k">Weight</div><div class="v">${UI.kg(parcel.weight)}</div></div>
            <div class="kv"><div class="k">Service</div><div class="v" style="text-transform:capitalize">${UI.esc(parcel.type)}</div></div>
            <div class="kv"><div class="k">COD amount</div><div class="v">${UI.money(parcel.cod)}</div></div>
            <div class="kv"><div class="k">Delivery charge</div><div class="v">${UI.money(parcel.deliveryCharge)}</div></div>
            <div class="kv"><div class="k">Rider</div><div class="v">${UI.esc(rider ? rider.name : 'Not assigned')}</div></div>
            <div class="kv"><div class="k">Created</div><div class="v">${UI.dateTime(parcel.createdAt)}</div></div>
          </div>
          ${parcel.notes ? `<div class="alert info mt-4">${UI.icon('info')}<div><strong>Delivery note:</strong> ${UI.esc(parcel.notes)}</div></div>` : ''}
        </div>
      </div>`;
  };

  T.lookup = function (raw) {
    const q = String(raw || '').trim();
    if (!q) return { ok: false, error: 'Enter a tracking number to continue.' };
    const parcel = ZR.store.parcelByTracking(q);
    if (!parcel) {
      return {
        ok: false,
        error: `We couldn’t find a shipment for “${q}”. Check the number and try again.`,
        hint: 'Demo IDs: ZR4829103756 · ZR4829103893 · ZR4829104030'
      };
    }
    return { ok: true, parcel };
  };
})(window.ZR);
