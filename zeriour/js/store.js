/* ==========================================================================
   Zeriour — shared state layer
   One localStorage-backed model shared by every role dashboard.
   All reads/mutations go through this module so logic never forks per page.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';

  const KEY = 'zeriour:state:v1';
  const listeners = new Set();
  const DAY = 86400000;
  const memory = { value: null };

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const nowISO = () => new Date().toISOString();
  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
  const sameDay = (a, b) => dayKey(a) === dayKey(b);

  function readRaw() {
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memory.value;
    }
  }
  function writeRaw(state) {
    memory.value = state;
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode / quota */ }
  }

  /* ------------------------------------------------------------------ state */
  const S = {};
  ZR.store = S;

  S.init = function () {
    let state = readRaw();
    if (!state || !state.parcels || state.version !== 9) {
      state = ZR.seedData();
      writeRaw(state);
    }
    S.state = state;
    return state;
  };

  S.get = () => S.state;
  S.save = function (type = 'change') {
    writeRaw(S.state);
    S.emit(type);
  };
  S.reset = function () {
    S.state = ZR.seedData();
    writeRaw(S.state);
    S.emit('reset');
  };
  S.subscribe = function (fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  S.emit = function (type, detail) {
    listeners.forEach((fn) => { try { fn(type, detail); } catch (e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('zr:change', { detail: { type, detail } }));
  };
  // keep tabs in sync
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      S.state = readRaw() || ZR.seedData();
      S.emit('external');
    }
  });

  /* -------------------------------------------------------------- selectors */
  S.merchant = (id) => S.state.merchants.find((m) => m.id === id);
  S.branch = (id) => S.state.branches.find((b) => b.id === id);
  S.rider = (id) => S.state.riders.find((r) => r.id === id);
  S.branchByCode = (code) => S.state.branches.find((b) => b.code === code);
  S.parcel = (id) => S.state.parcels.find((p) => p.id === id);
  S.parcelByTracking = (t) => {
    const q = String(t || '').trim().toUpperCase().replace(/\s+/g, '');
    return S.state.parcels.find((p) => p.tracking === q) || S.state.parcels.find((p) => p.tracking.endsWith(q) && q.length >= 6);
  };
  S.merchantParcels = (merchantId) => S.state.parcels.filter((p) => p.merchantId === merchantId);
  S.branchParcels = (branchId) => S.state.parcels.filter((p) => p.originBranchId === branchId || p.destBranchId === branchId);
  S.riderParcels = (riderId) => S.state.parcels.filter((p) => p.riderId === riderId);
  S.activeRiderTasks = (riderId) => S.state.parcels.filter((p) => p.riderId === riderId && [6, 7, 9].includes(p.status));
  S.todayActive = (riderId) => S.state.parcels.filter((p) => p.riderId === riderId && [7, 9].includes(p.status));
  S.notificationsFor = (audience) => S.state.notifications
    .filter((n) => n.audience === audience || n.audience === 'all')
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  S.unreadCount = (audience) => S.notificationsFor(audience).filter((n) => !n.read).length;

  S.branchForDistrict = (district) => S.state.branches.find((b) => b.district === district) || null;

  S.destinationBranch = function (parcel) {
    return S.branch(parcel.destBranchId) || S.branchForDistrict(parcel.customer.district) || S.state.branches[0];
  };

  /* ---------------------------------------------------------------- helpers */
  function nextTracking() {
    const base = 4829104100 + S.state.parcels.length * 137;
    return 'ZR' + String(base).slice(0, 10);
  }
  S.nextTracking = nextTracking;

  S.notify = function ({ audience = 'admin', title, body = '', tone = 'info', icon = 'ph-bell', link = '' }) {
    S.state.notifications.unshift({
      id: 'ntf_' + Math.random().toString(36).slice(2, 9),
      audience, title, body, tone, icon, link, read: false, at: nowISO()
    });
    if (S.state.notifications.length > 120) S.state.notifications.length = 120;
  };

  S.log = function (actor, role, action, target = '', type = 'general') {
    S.state.logs.unshift({
      id: 'log_' + Math.random().toString(36).slice(2, 9),
      actor, role, action, target, type, at: nowISO()
    });
    if (S.state.logs.length > 200) S.state.logs.length = 200;
  };

  function pushEvent(parcel, statusKey, by, note = '') {
    parcel.timeline.push({
      status: statusKey,
      label: ZR.statusMeta(statusKey).label,
      at: nowISO(),
      by: by || 'System',
      note
    });
    parcel.updatedAt = nowISO();
  }
  S.pushEvent = pushEvent;

  /* -------------------------------------------------------------- mutations */
  S.createParcel = function (payload, ctx = {}) {
    const merchant = S.merchant(ctx.merchantId || payload.merchantId);
    const quote = ZR.pricing.quote({
      type: payload.type,
      weight: payload.weight,
      cod: payload.cod,
      destination: payload.customer.district,
      origin: merchant ? merchant.district : 'Dhaka'
    });
    const parcel = {
      id: 'pcl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      tracking: nextTracking(),
      merchantId: merchant.id,
      merchantName: merchant.name,
      customer: { ...payload.customer },
      weight: +payload.weight,
      type: payload.type || 'standard',
      cod: +payload.cod || 0,
      deliveryCharge: quote.total - quote.codCharge,
      codCharge: quote.codCharge,
      weightCharge: quote.weightCharge,
      remoteCharge: quote.remoteCharge,
      product: payload.product || '',
      status: 0,
      statusKey: 'created',
      originBranchId: payload.originBranchId || null,
      destBranchId: payload.destBranchId || (S.branchForDistrict(payload.customer.district) || {}).id || null,
      riderId: null,
      bagId: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      eta: new Date(Date.now() + (payload.type === 'sameday' ? 1 : payload.type === 'express' ? 2 : 4) * DAY).toISOString(),
      notes: payload.notes || '',
      pickupLocation: payload.pickupLocation || merchant.store.pickupAddress,
      invoiceNo: 'INV-' + String(Date.now()).slice(-6),
      timeline: [],
      attempts: 0,
      returnReason: '',
      source: ctx.source || 'merchant'
    };
    pushEvent(parcel, 'created', ctx.actor || 'Merchant portal', `Parcel created by ${merchant.name}`);
    S.state.parcels.unshift(parcel);
    S.log(ctx.actor || merchant.name, 'merchant', `Created parcel ${parcel.tracking}`, parcel.tracking, 'parcel');
    S.notify({
      audience: 'admin', title: 'New parcel created',
      body: `${merchant.name} created ${parcel.tracking} for ${parcel.customer.district}.`,
      tone: 'info', icon: 'ph-package', link: '#/parcels'
    });
    if (ctx.autoRequestPickup) S.requestPickup([parcel.id], ctx);
    S.save('parcel:create');
    return parcel;
  };

  S.editParcel = function (id, patch, ctx = {}) {
    const p = S.parcel(id);
    if (!p) return null;
    Object.assign(p, patch);
    if (patch.customer) p.customer = { ...p.customer, ...patch.customer };
    pushEvent(p, p.statusKey, ctx.actor || 'Merchant portal', 'Parcel details updated');
    S.log(ctx.actor || 'Merchant', 'merchant', `Updated parcel ${p.tracking}`, p.tracking, 'parcel');
    S.save('parcel:update');
    return p;
  };

  S.cancelParcel = function (id, ctx = {}) {
    const p = S.parcel(id);
    if (!p || p.status > 1) return false;
    p.status = ZR.statusIndex('cancelled');
    p.statusKey = 'cancelled';
    pushEvent(p, 'cancelled', ctx.actor || 'Merchant portal', ctx.reason || 'Cancelled by merchant');
    S.log(ctx.actor || 'Merchant', 'merchant', `Cancelled parcel ${p.tracking}`, p.tracking, 'parcel');
    S.save('parcel:cancel');
    return true;
  };

  S.requestPickup = function (parcelIds, ctx = {}) {
    const merchantId = ctx.merchantId || (S.parcel(parcelIds[0]) || {}).merchantId;
    const ids = parcelIds.slice();
    ids.forEach((id) => {
      const p = S.parcel(id);
      if (!p) return;
      p.status = ZR.statusIndex('pickup_requested');
      p.statusKey = 'pickup_requested';
      p.eta = p.eta || new Date(Date.now() + 3 * DAY).toISOString();
      pushEvent(p, 'pickup_requested', ctx.actor || 'Merchant portal', 'Pickup requested — awaiting rider assignment');
    });
    const merchant = S.merchant(merchantId);
    S.state.pickups.unshift({
      id: 'pck_' + Date.now().toString(36),
      merchantId, merchantName: merchant ? merchant.name : 'Merchant',
      parcelCount: ids.length,
      weight: ids.reduce((sum, id) => sum + ((S.parcel(id) || {}).weight || 0), 0),
      address: (merchant && merchant.store.pickupAddress) || '',
      district: (merchant && merchant.district) || 'Dhaka',
      date: new Date().toISOString(),
      window: ctx.window || '10:00 – 13:00',
      status: 'pending', riderId: null
    });
    S.notify({
      audience: 'admin', title: 'Pickup requested',
      body: `${merchant ? merchant.name : 'Merchant'} requested pickup for ${ids.length} parcel(s).`,
      tone: 'warn', icon: 'ph-hand-arrow-up', link: '#/pickups'
    });
    S.log(ctx.actor || 'Merchant', 'merchant', `Requested pickup for ${ids.length} parcel(s)`, merchant ? merchant.name : '', 'pickup');
    S.save('pickup:request');
    return true;
  };

  /* admin branch assignment */
  S.assignBranch = function (parcelId, branchId, ctx = {}) {
    const p = S.parcel(parcelId);
    const branch = S.branch(branchId);
    if (!p || !branch) return false;
    p.originBranchId = branchId;
    if (!p.destBranchId) {
      const dest = S.branchForDistrict(p.customer.district);
      if (dest) p.destBranchId = dest.id;
    }
    if (p.status <= 1) {
      p.status = ZR.statusIndex('pickup_requested');
      p.statusKey = 'pickup_requested';
      pushEvent(p, 'pickup_requested', ctx.actor || 'Operations', `Assigned to origin branch ${branch.code} — ${branch.name}`);
    }
    S.notify({
      audience: 'branch', title: 'Parcel assigned to your branch',
      body: `${p.tracking} → ${branch.code} · ${branch.name}`,
      tone: 'info', icon: 'ph-warehouse', link: '#/incoming'
    });
    S.log(ctx.actor || 'Admin', 'admin', `Assigned ${p.tracking} to ${branch.code}`, p.tracking, 'parcel');
    S.save('parcel:assign-branch');
    return true;
  };

  S.assignRider = function (parcelId, riderId, ctx = {}) {
    const p = S.parcel(parcelId);
    const rider = S.rider(riderId);
    if (!p || !rider) return false;
    p.riderId = riderId;
    p.status = ZR.statusIndex('assigned');
    p.statusKey = 'assigned';
    if (rider.branchId && !p.destBranchId) p.destBranchId = rider.branchId;
    pushEvent(p, 'assigned', ctx.actor || 'Branch desk', `Assigned to ${rider.name}`);
    S.notify({
      audience: riderId, title: 'New delivery assigned',
      body: `${p.tracking} · ${p.customer.upazila}, ${p.customer.district}${p.cod ? ` · COD ৳${p.cod}` : ''}`,
      tone: 'info', icon: 'ph-package', link: '#/tasks'
    });
    S.log(ctx.actor || 'Branch', 'branch', `Assigned ${p.tracking} to ${rider.name}`, p.tracking, 'parcel');
    S.save('parcel:assign-rider');
    return true;
  };

  S.branchAdvance = function (parcelId, action, ctx = {}) {
    const p = S.parcel(parcelId);
    if (!p) return false;
    const branch = S.branch(ctx.branchId) || S.branch(p.originBranchId) || S.state.branches[0];
    const map = {
      receive_origin: ['at_origin', `Received at ${branch.name}`],
      dispatch: ['in_transit', `Dispatched from ${branch.name} to destination branch`],
      receive_dest: ['at_destination', 'Received at destination branch'],
      sort: ['at_origin', 'Sorted into destination bag']
    };
    if (action === 'assign_rider') return S.assignRider(parcelId, ctx.riderId, ctx);
    const target = map[action];
    if (!target) return false;
    p.status = ZR.statusIndex(target[0]);
    p.statusKey = target[0];
    // the first hub to scan an unassigned parcel adopts it as the origin
    if (['receive_origin', 'dispatch'].includes(action) && !p.originBranchId) p.originBranchId = branch.id;
    if (!p.destBranchId) p.destBranchId = S.branchForDistrict(p.customer.district) ? S.branchForDistrict(p.customer.district).id : branch.id;
    if (action === 'receive_dest') p.destBranchId = branch.id;
    pushEvent(p, target[0], ctx.actor || branch.code, target[1]);
    if (target[0] === 'in_transit') {
      S.notify({
        audience: 'branch', title: 'Inbound parcel on the way',
        body: `${p.tracking} is in transit${p.destBranchId ? ' → ' + ((S.branch(p.destBranchId) || {}).code || '') : ''}.`,
        tone: 'info', icon: 'ph-truck', link: '#/incoming'
      });
    }
    S.log(ctx.actor || branch.code, 'branch', `${ZR.statusMeta(target[0]).label} — ${p.tracking}`, p.tracking, 'parcel');
    S.save('parcel:branch');
    return true;
  };

  S.riderAction = function (parcelId, action, ctx = {}) {
    const p = S.parcel(parcelId);
    if (!p) return false;
    const rider = S.rider(p.riderId) || S.rider(ctx.riderId);
    if (action === 'out_for_delivery') {
      p.status = ZR.statusIndex('out_for_delivery');
      p.statusKey = 'out_for_delivery';
      pushEvent(p, 'out_for_delivery', ctx.actor || 'Rider app', 'Out for delivery');
    } else if (action === 'delivered') {
      const collected = ctx.codCollected === undefined ? p.cod : +ctx.codCollected;
      p.status = ZR.statusIndex('delivered');
      p.statusKey = 'delivered';
      p.deliveredAt = nowISO();
      p.attempts += 1;
      p.codCollected = collected;
      pushEvent(p, 'delivered', ctx.actor || 'Rider app', `Delivered successfully. COD collected: ৳${collected}`);
      if (collected > 0) {
        const merchant = S.merchant(p.merchantId);
        const net = Math.max(0, collected - p.deliveryCharge - p.codCharge);
        S.state.transactions.unshift({
          id: 'txn_' + Date.now().toString(36) + 'a', merchantId: p.merchantId, type: 'cod_collection',
          amount: collected, fee: p.codCharge, status: 'settled', reference: p.tracking,
          date: nowISO(), parcelId: p.id, note: 'COD collected on delivery'
        });
        S.state.transactions.unshift({
          id: 'txn_' + Date.now().toString(36) + 'b', merchantId: p.merchantId, type: 'delivery_charge',
          amount: -p.deliveryCharge, fee: 0, status: 'settled', reference: p.tracking,
          date: nowISO(), parcelId: p.id, note: 'Delivery charge deducted'
        });
        if (merchant) {
          merchant.balance += net;
          merchant.pending = Math.max(0, merchant.pending - net);
        }
        S.notify({
          audience: p.merchantId, title: 'Parcel delivered — COD settled',
          body: `${p.tracking} delivered. ৳${net.toLocaleString('en-US')} added to your available balance.`,
          tone: 'success', icon: 'ph-check-circle', link: '#/finance'
        });
      } else {
        S.notify({
          audience: p.merchantId, title: 'Parcel delivered',
          body: `${p.tracking} was delivered to ${p.customer.name}.`,
          tone: 'success', icon: 'ph-check-circle', link: '#/parcels'
        });
      }
      if (rider) {
        rider.earnings += 45;
        rider.deliveries += 1;
      }
    } else if (action === 'failed') {
      p.status = ZR.statusIndex('failed');
      p.statusKey = 'failed';
      p.attempts += 1;
      p.returnReason = ctx.reason || 'Customer unavailable';
      pushEvent(p, 'failed', ctx.actor || 'Rider app', ctx.reason || 'Delivery attempt failed');
      S.notify({
        audience: p.merchantId, title: 'Delivery failed — action needed',
        body: `${p.tracking}: ${ctx.reason || 'Customer unavailable'}. A retry will be scheduled.`,
        tone: 'warn', icon: 'ph-warning', link: '#/parcels'
      });
      S.notify({
        audience: 'admin', title: 'Failed delivery reported',
        body: `${p.tracking} · ${ctx.reason || 'Customer unavailable'} · ${rider ? rider.name : 'Rider'}`,
        tone: 'warn', icon: 'ph-warning', link: '#/returns'
      });
    } else if (action === 'reschedule') {
      p.status = ZR.statusIndex('assigned');
      p.statusKey = 'assigned';
      pushEvent(p, 'assigned', ctx.actor || 'Rider app', `Rescheduled for ${ctx.date || 'tomorrow'}`);
      S.notify({
        audience: p.merchantId, title: 'Delivery rescheduled',
        body: `${p.tracking} rescheduled to ${ctx.date || 'tomorrow'}.`,
        tone: 'info', icon: 'ph-calendar', link: '#/parcels'
      });
    } else if (action === 'return_initiate') {
      p.status = ZR.statusIndex('return_initiated');
      p.statusKey = 'return_initiated';
      p.returnReason = ctx.reason || p.returnReason || 'Customer refused';
      pushEvent(p, 'return_initiated', ctx.actor || 'Branch', `Return initiated — ${p.returnReason}`);
      S.notify({
        audience: p.merchantId, title: 'Return initiated',
        body: `${p.tracking} is being returned: ${p.returnReason}.`,
        tone: 'danger', icon: 'ph-arrow-u-up-left', link: '#/returns'
      });
    } else if (action === 'mark_returned') {
      p.status = ZR.statusIndex('returned');
      p.statusKey = 'returned';
      pushEvent(p, 'returned', ctx.actor || 'Returns desk', 'Returned to merchant');
    }
    S.log(ctx.actor || (rider ? rider.name : 'Rider'), 'rider', `${ZR.statusMeta(p.statusKey).label} — ${p.tracking}`, p.tracking, 'parcel');
    S.save('parcel:rider');
    return true;
  };

  S.recordPickup = function (pickupId, ctx = {}) {
    const pk = S.state.pickups.find((x) => x.id === pickupId);
    if (!pk) return false;
    pk.status = 'picked';
    pk.riderId = ctx.riderId || pk.riderId;
    S.log(ctx.actor || 'Branch', 'branch', `Marked pickup ${pickupId} as collected`, pickupId, 'pickup');
    S.save('pickup:picked');
    return true;
  };

  /* merchant account */
  S.applyMerchant = function (payload) {
    const now = nowISO();
    const merchant = {
      id: 'mer_' + Date.now().toString(36),
      name: payload.name,
      owner: payload.owner,
      email: payload.email,
      phone: payload.phone,
      businessType: payload.businessType,
      address: payload.address,
      district: payload.district,
      status: 'pending',
      plan: 'Growth',
      commission: 4,
      balance: 0, pending: 0, lifetime: 0,
      createdAt: now,
      store: {
        name: payload.name,
        subdomain: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.zeriour.store',
        pickupAddress: payload.pickupAddress,
        returnAddress: payload.address
      },
      api: {
        key: 'zr_test_' + Math.random().toString(36).slice(2, 12),
        created: now,
        webhook: '',
        events: []
      },
      application: { volume: payload.volume || '1–50 parcels / week', category: payload.category || 'General' }
    };
    S.state.merchants.unshift(merchant);
    S.notify({
      audience: 'admin', title: 'New merchant application',
      body: `${merchant.name} · ${merchant.district} · ${payload.volume || 'volume unspecified'}`,
      tone: 'info', icon: 'ph-storefront', link: '#/merchants'
    });
    S.log(merchant.owner, 'merchant', `Submitted merchant application for “${merchant.name}”`, merchant.id, 'merchant');
    S.save('merchant:apply');
    return merchant;
  };

  S.updateMerchant = function (id, patch) {
    const m = S.merchant(id);
    if (!m) return null;
    Object.assign(m, patch);
    if (patch.store) m.store = { ...m.store, ...patch.store };
    if (patch.api) m.api = { ...m.api, ...patch.api };
    S.save('merchant:update');
    return m;
  };
  S.setMerchantStatus = function (id, status, ctx = {}) {
    const m = S.merchant(id);
    if (!m) return false;
    m.status = status;
    S.log(ctx.actor || 'Admin', 'admin', `${status === 'active' ? 'Activated' : status === 'suspended' ? 'Suspended' : 'Rejected'} merchant “${m.name}”`, id, 'merchant');
    S.notify({
      audience: id, title: status === 'active' ? 'Merchant account active' : status === 'suspended' ? 'Merchant account suspended' : 'Application rejected',
      body: status === 'active' ? 'Your account is approved. You can start creating parcels.' : 'Contact support for details.',
      tone: status === 'active' ? 'success' : 'danger', icon: 'ph-storefront', link: '#/'
    });
    S.save('merchant:status');
    return true;
  };

  S.requestWithdrawal = function (merchantId, amount, method, account, ctx = {}) {
    const m = S.merchant(merchantId);
    if (!m || amount <= 0 || amount > m.balance) return { ok: false, error: 'Amount exceeds available balance.' };
    m.balance -= amount;
    const wd = {
      id: 'wd_' + Date.now().toString(36), merchantId, merchantName: m.name, amount, method, account,
      status: 'pending', date: nowISO()
    };
    S.state.withdrawals.unshift(wd);
    S.notify({
      audience: 'admin', title: 'Withdrawal request submitted',
      body: `${m.name} requested ৳${amount.toLocaleString('en-US')} via ${method}.`,
      tone: 'warn', icon: 'ph-wallet', link: '#/withdrawals'
    });
    S.log(ctx.actor || m.name, 'merchant', `Requested withdrawal ৳${amount.toLocaleString('en-US')}`, wd.id, 'finance');
    S.save('withdrawal:request');
    return { ok: true, withdrawal: wd };
  };

  S.decideWithdrawal = function (id, decision, ctx = {}) {
    const wd = S.state.withdrawals.find((w) => w.id === id);
    if (!wd || wd.status !== 'pending') return false;
    wd.status = decision;
    wd.decidedAt = nowISO();
    const m = S.merchant(wd.merchantId);
    if (decision === 'approved') {
      S.state.transactions.unshift({
        id: 'txn_' + Date.now().toString(36), merchantId: wd.merchantId, type: 'payout',
        amount: -wd.amount, fee: 0, status: 'settled', reference: wd.id,
        date: nowISO(), note: `Withdrawal via ${wd.method}`
      });
      if (m) m.pending = Math.max(0, m.pending - wd.amount);
      S.notify({
        audience: wd.merchantId, title: 'Withdrawal approved',
        body: `৳${wd.amount.toLocaleString('en-US')} is on its way via ${wd.method}.`,
        tone: 'success', icon: 'ph-bank', link: '#/finance'
      });
    } else if (m) {
      m.balance += wd.amount;
      S.notify({
        audience: wd.merchantId, title: 'Withdrawal rejected',
        body: `Your ৳${wd.amount.toLocaleString('en-US')} request was rejected and returned to your balance.`,
        tone: 'danger', icon: 'ph-x-circle', link: '#/finance'
      });
    }
    S.log(ctx.actor || 'Admin', 'admin', `${decision === 'approved' ? 'Approved' : 'Rejected'} withdrawal ${id}`, id, 'finance');
    S.save('withdrawal:decision');
    return true;
  };

  /* tickets */
  S.createTicket = function ({ merchantId, subject, category, priority, message }, ctx = {}) {
    const t = {
      id: 'tkt_' + Date.now().toString(36), merchantId, subject, category, priority,
      status: 'open', createdAt: nowISO(), messages: [{ by: ctx.actor || 'merchant', text: message, at: nowISO() }]
    };
    S.state.tickets.unshift(t);
    S.notify({
      audience: 'admin', title: 'New support ticket',
      body: `${subject} · ${priority} priority`, tone: 'info', icon: 'ph-lifebuoy', link: '#/tickets'
    });
    S.log(ctx.actor || 'Merchant', 'merchant', `Opened ticket “${subject}”`, t.id, 'support');
    S.save('ticket:create');
    return t;
  };
  S.replyTicket = function (id, text, by, ctx = {}) {
    const t = S.state.tickets.find((x) => x.id === id);
    if (!t) return false;
    t.messages.push({ by, text, at: nowISO() });
    if (by !== 'merchant') {
      t.status = 'in_progress';
      S.notify({
        audience: t.merchantId, title: 'Support replied to your ticket',
        body: t.subject, tone: 'info', icon: 'ph-lifebuoy', link: '#/support'
      });
    }
    S.log(ctx.actor || by, by === 'merchant' ? 'merchant' : 'admin', `Replied to ticket ${id}`, id, 'support');
    S.save('ticket:reply');
    return true;
  };
  S.setTicketStatus = function (id, status) {
    const t = S.state.tickets.find((x) => x.id === id);
    if (!t) return false;
    t.status = status;
    S.save('ticket:status');
    return true;
  };

  /* bags / consignments */
  S.createBag = function ({ originBranchId, destBranchId, parcelIds }, ctx = {}) {
    const bag = {
      id: 'BAG-' + (1046 + S.state.bags.length),
      originBranchId, destBranchId, parcelCount: parcelIds.length,
      weight: parcelIds.reduce((s, id) => s + ((S.parcel(id) || {}).weight || 0), 0),
      status: 'open', sealedAt: null, sealedBy: null, parcelIds
    };
    S.state.bags.unshift(bag);
    parcelIds.forEach((id) => { const p = S.parcel(id); if (p) p.bagId = bag.id; });
    S.log(ctx.actor || 'Branch', 'branch', `Created consignment ${bag.id} (${parcelIds.length} parcels)`, bag.id, 'logistics');
    S.save('bag:create');
    return bag;
  };
  S.setBagStatus = function (id, status, ctx = {}) {
    const b = S.state.bags.find((x) => x.id === id);
    if (!b) return false;
    b.status = status;
    if (status === 'sealed') { b.sealedAt = nowISO(); b.sealedBy = ctx.actor || 'Branch'; }
    S.log(ctx.actor || 'Branch', 'branch', `Consignment ${id} marked ${status}`, id, 'logistics');
    S.save('bag:status');
    return true;
  };

  /* settings */
  S.updatePricing = function (patch, ctx = {}) {
    Object.assign(S.state.settings.pricing, patch);
    S.log(ctx.actor || 'Admin', 'admin', 'Updated delivery pricing configuration', 'pricing', 'settings');
    S.save('settings:pricing');
  };
  S.updateSettings = function (patch) {
    Object.assign(S.state.settings, patch);
    S.save('settings:general');
  };
  S.toggleCoupon = function (code) {
    const c = S.state.coupons.find((x) => x.code === code);
    if (!c) return;
    c.status = c.status === 'active' ? 'paused' : 'active';
    S.save('coupon:toggle');
  };
  S.markRead = function (id) {
    const n = S.state.notifications.find((x) => x.id === id);
    if (n) { n.read = true; S.save('notification:read'); }
  };
  S.markAllRead = function (audience) {
    S.state.notifications.forEach((n) => { if (n.audience === audience || n.audience === 'all') n.read = true; });
    S.save('notification:read-all');
  };

  S.adminSetStatus = function (id, statusKey, ctx = {}) {
    const p = S.parcel(id);
    if (!p) return false;
    if (statusKey === 'delivered') return S.riderAction(id, 'delivered', { ...ctx, codCollected: p.cod });
    if (statusKey === 'failed') return S.riderAction(id, 'failed', ctx);
    p.status = ZR.statusIndex(statusKey);
    p.statusKey = statusKey;
    pushEvent(p, statusKey, ctx.actor || 'Admin', ctx.note || 'Status updated by admin');
    S.log(ctx.actor || 'Admin', 'admin', `Set ${p.tracking} to ${ZR.statusMeta(statusKey).label}`, p.tracking, 'parcel');
    S.save('parcel:admin-status');
    return true;
  };

  /* network administration */
  S.saveBranch = function (payload, ctx = {}) {
    let branch = payload.id ? S.branch(payload.id) : null;
    if (branch) {
      Object.assign(branch, payload);
      S.log(ctx.actor || 'Admin', 'admin', `Updated branch ${branch.code}`, branch.id, 'branch');
    } else {
      branch = {
        id: 'br_' + Date.now().toString(36),
        code: payload.code, name: payload.name, district: payload.district,
        thana: payload.thana, address: payload.address, manager: payload.manager,
        phone: payload.phone, staff: +payload.staff || 1, capacity: +payload.capacity || 500,
        active: true, createdAt: nowISO()
      };
      S.state.branches.push(branch);
      S.log(ctx.actor || 'Admin', 'admin', `Created branch ${branch.code}`, branch.id, 'branch');
    }
    S.save('branch:save');
    return branch;
  };

  S.saveRider = function (payload, ctx = {}) {
    let rider = payload.id ? S.rider(payload.id) : null;
    if (rider) {
      Object.assign(rider, payload);
      S.log(ctx.actor || 'Admin', 'admin', `Updated rider ${rider.name}`, rider.id, 'rider');
    } else {
      rider = {
        id: 'rdr_' + Date.now().toString(36),
        name: payload.name, phone: payload.phone, branchId: payload.branchId,
        zone: payload.zone, vehicle: payload.vehicle || 'Motorcycle',
        rating: 4.5, deliveries: 0, successRate: 0, earnings: 0,
        status: 'active', joined: nowISO()
      };
      S.state.riders.push(rider);
      S.log(ctx.actor || 'Admin', 'admin', `Added rider ${rider.name}`, rider.id, 'rider');
    }
    S.save('rider:save');
    return rider;
  };

  S.addCoupon = function (payload, ctx = {}) {
    const coupon = {
      code: String(payload.code || '').toUpperCase(), type: payload.type, value: +payload.value || 0,
      minOrder: +payload.minOrder || 0, uses: 0, limit: +payload.limit || 100,
      expires: payload.expires, status: 'active'
    };
    S.state.coupons.unshift(coupon);
    S.log(ctx.actor || 'Admin', 'admin', `Created coupon ${coupon.code}`, coupon.code, 'promotion');
    S.save('coupon:create');
    return coupon;
  };

  S.addAnnouncement = function (payload, ctx = {}) {
    const ann = {
      id: 'ann_' + Date.now().toString(36), title: payload.title, body: payload.body,
      audience: payload.audience || 'all', status: 'published', date: nowISO()
    };
    S.state.announcements.unshift(ann);
    S.log(ctx.actor || 'Admin', 'admin', `Published announcement “${ann.title}”`, ann.id, 'content');
    S.save('announcement:create');
    return ann;
  };

  S.setAreaService = function (district, service) {
    const area = S.state.areas.find((a) => a.district === district);
    if (area) { area.service = service; S.save('area:service'); }
    return area;
  };

  S.updateContent = function (patch) {
    S.state.content = { ...(S.state.content || {}), ...patch };
    S.save('content:update');
  };

  /* ------------------------------------------------------------------ stats */
  S.statsMerchant = function (merchantId) {
    const list = S.merchantParcels(merchantId);
    const by = (k) => list.filter((p) => p.statusKey === k).length;
    const delivered = by('delivered');
    const returned = list.filter((p) => ['return_initiated', 'returned'].includes(p.statusKey)).length;
    const failed = by('failed');
    const cancelled = by('cancelled');
    const inTransit = list.filter((p) => p.status >= 2 && p.status <= 6).length;
    const outForDelivery = list.filter((p) => p.status === 7).length;
    const pendingPickup = list.filter((p) => p.status <= 1).length;
    const codCollected = list.filter((p) => p.statusKey === 'delivered').reduce((s, p) => s + (p.codCollected || p.cod), 0);
    const closed = delivered + failed + returned;
    const m = S.merchant(merchantId) || {};
    return {
      total: list.length, delivered, inTransit, outForDelivery, pendingPickup, returned, failed, cancelled,
      active: inTransit + outForDelivery,
      codCollected,
      balance: m.balance || 0,
      pending: m.pending || 0,
      successRate: closed ? Math.round((delivered / closed) * 1000) / 10 : 0,
      deliveryRate: list.length ? Math.round((delivered / list.length) * 1000) / 10 : 0,
      statusCounts: ZR.STATUSES.map((s) => ({ ...s, count: list.filter((p) => p.statusKey === s.key).length })),
      series: S.dailySeries(list, 14),
      months: S.monthlySeries(list, 6)
    };
  };

  S.statsAdmin = function () {
    const parcels = S.state.parcels;
    const today = new Date();
    const todays = parcels.filter((p) => sameDay(p.createdAt, today));
    const delivered = parcels.filter((p) => p.statusKey === 'delivered');
    const returned = parcels.filter((p) => ['return_initiated', 'returned'].includes(p.statusKey));
    const failed = parcels.filter((p) => p.statusKey === 'failed');
    const revenue = parcels.reduce((s, p) => s + p.deliveryCharge + (p.statusKey === 'delivered' ? p.codCharge : 0), 0);
    const codVolume = delivered.reduce((s, p) => s + (p.codCollected || p.cod), 0);
    const pendingPayments = S.state.withdrawals.filter((w) => w.status === 'pending').reduce((s, w) => s + w.amount, 0);
    return {
      merchants: S.state.merchants.filter((m) => m.status === 'active').length,
      merchantsTotal: S.state.merchants.length,
      applications: S.state.merchants.filter((m) => m.status === 'pending').length,
      parcels: parcels.length,
      todays: todays.length,
      active: parcels.filter((p) => p.status >= 2 && p.status <= 7).length,
      delivered: delivered.length,
      returned: returned.length,
      failed: failed.length,
      returnsRate: parcels.length ? Math.round((returned.length / parcels.length) * 1000) / 10 : 0,
      successRate: (delivered.length + failed.length + returned.length) ? Math.round((delivered.length / (delivered.length + failed.length + returned.length)) * 1000) / 10 : 0,
      codVolume,
      revenue,
      pendingPayments,
      branchCount: S.state.branches.length,
      riderCount: S.state.riders.filter((r) => r.status === 'active').length,
      statusCounts: ZR.STATUSES.map((s) => ({ ...s, count: parcels.filter((p) => p.statusKey === s.key).length })),
      series: S.dailySeries(parcels, 14),
      months: S.monthlySeries(parcels, 6),
      revenueMonths: S.monthlyRevenue(6),
      branchPerf: S.state.branches.map((b) => {
        const bp = parcels.filter((p) => p.destBranchId === b.id);
        const d = bp.filter((p) => p.statusKey === 'delivered').length;
        return { name: b.code, branch: b.name, total: bp.length, delivered: d, rate: bp.length ? Math.round(d / bp.length * 100) : 0 };
      }),
      riderPerf: S.state.riders.map((r) => {
        const rp = parcels.filter((p) => p.riderId === r.id);
        const d = rp.filter((p) => p.statusKey === 'delivered').length;
        return { name: r.name, total: rp.length, delivered: d, rating: r.rating };
      }).sort((a, b) => b.delivered - a.delivered).slice(0, 6)
    };
  };

  S.statsBranch = function (branchId) {
    const br = S.branch(branchId) || S.state.branches[0];
    const parcels = S.state.parcels;
    const incoming = parcels.filter((p) => p.destBranchId === br.id && [4, 5, 6, 7].includes(p.status));
    const outgoing = parcels.filter((p) => p.originBranchId === br.id && [3, 4].includes(p.status));
    const sorting = parcels.filter((p) => (p.originBranchId === br.id || p.destBranchId === br.id) && [3, 5].includes(p.status));
    const ready = parcels.filter((p) => p.originBranchId === br.id && p.status === 3);
    const today = new Date();
    const receivedToday = parcels.filter((p) => p.timeline.some((t) => t.by === br.code && sameDay(t.at, today)));
    const deliveredToday = parcels.filter((p) => p.riderId && (S.rider(p.riderId) || {}).branchId === br.id && p.statusKey === 'delivered' && p.deliveredAt && sameDay(p.deliveredAt, today));
    const pendingTransfers = parcels.filter((p) => p.status === 4 && (p.originBranchId === br.id || p.destBranchId === br.id));
    const codToday = deliveredToday.reduce((s, p) => s + (p.codCollected || p.cod), 0);
    return {
      incoming, outgoing, sorting, ready, pendingTransfers,
      incomingCount: incoming.length, outgoingCount: outgoing.length, sortingCount: sorting.length,
      readyCount: ready.length, receivedToday: receivedToday.length, deliveredToday: deliveredToday.length,
      pendingTransfersCount: pendingTransfers.length,
      codToday,
      riders: S.state.riders.filter((r) => r.branchId === br.id),
      staff: S.state.staff.filter((s) => s.branchId === br.id),
      series: S.dailySeries(parcels.filter((p) => p.originBranchId === br.id || p.destBranchId === br.id), 7)
    };
  };

  S.statsRider = function (riderId) {
    const r = S.rider(riderId) || {};
    const parcels = S.riderParcels(riderId);
    const today = new Date();
    const tasks = parcels.filter((p) => [6, 7, 9].includes(p.status));
    const deliveredToday = parcels.filter((p) => p.statusKey === 'delivered' && p.deliveredAt && sameDay(p.deliveredAt, today));
    return {
      tasks,
      taskCount: tasks.length,
      outForDelivery: parcels.filter((p) => p.statusKey === 'out_for_delivery').length,
      deliveredToday: deliveredToday.length,
      codToday: deliveredToday.reduce((s, p) => s + (p.codCollected || p.cod), 0),
      completed: parcels.filter((p) => p.statusKey === 'delivered').length,
      failed: parcels.filter((p) => p.statusKey === 'failed').length,
      earnings: r.earnings || 0,
      todayEarnings: deliveredToday.length * 45,
      history: parcels.filter((p) => [8, 9, 11].includes(p.status)).slice(0, 20)
    };
  };

  /* series helpers (charts) */
  S.dailySeries = function (parcels, days = 14) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY);
      const key = dayKey(d);
      out.push({
        label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        key,
        created: parcels.filter((p) => dayKey(p.createdAt) === key).length,
        delivered: parcels.filter((p) => p.deliveredAt && dayKey(p.deliveredAt) === key).length,
        failed: parcels.filter((p) => p.statusKey === 'failed' && dayKey(p.updatedAt) === key).length
      });
    }
    return out;
  };
  S.monthlySeries = function (parcels, months = 6) {
    const out = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('en-GB', { month: 'short' });
      const key = d.toISOString().slice(0, 7);
      out.push({
        label,
        created: parcels.filter((p) => p.createdAt.slice(0, 7) === key).length,
        delivered: parcels.filter((p) => p.deliveredAt && p.deliveredAt.slice(0, 7) === key).length
      });
    }
    return out;
  };
  S.monthlyRevenue = function (months = 6) {
    const out = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const delivery = S.state.parcels.reduce((s, p) => s + (p.createdAt.slice(0, 7) === key ? p.deliveryCharge : 0), 0);
      const cod = S.state.transactions.filter((t) => t.type === 'cod_collection' && t.date.slice(0, 7) === key).reduce((s, t) => s + t.fee, 0);
      out.push({ label: d.toLocaleDateString('en-GB', { month: 'short' }), delivery, cod, total: delivery + cod });
    }
    return out;
  };

  /* global search for the command palette */
  S.search = function (q) {
    const term = String(q || '').trim().toLowerCase();
    if (!term) return { parcels: [], merchants: [], riders: [], branches: [] };
    return {
      parcels: S.state.parcels.filter((p) =>
        p.tracking.toLowerCase().includes(term) ||
        p.customer.name.toLowerCase().includes(term) ||
        p.customer.phone.includes(term) ||
        p.merchantName.toLowerCase().includes(term)
      ).slice(0, 6),
      merchants: S.state.merchants.filter((m) => m.name.toLowerCase().includes(term) || m.owner.toLowerCase().includes(term)).slice(0, 4),
      riders: S.state.riders.filter((r) => r.name.toLowerCase().includes(term) || r.phone.includes(term)).slice(0, 4),
      branches: S.state.branches.filter((b) => b.name.toLowerCase().includes(term) || b.code.toLowerCase().includes(term)).slice(0, 4)
    };
  };

  S.dayKey = dayKey;
  S.sameDay = sameDay;
  S.nowISO = nowISO;
  S.clone = clone;
})(window.ZR);
