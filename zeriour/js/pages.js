/* ==========================================================================
   Zeriour — page controllers
   Login, registration, tracking, contact, pricing and landing-page logic.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';
  const UI = ZR.ui;
  const P = ZR.public;
  const Pages = {};
  ZR.pages = Pages;

  const page = () => {
    const raw = (document.body.dataset.page || '').trim().replace(/\.html$/i, '');
    return raw === 'index' || raw === '' ? 'home' : raw;
  };

  /* ------------------------------------------------------------------ facts */
  const FACTS = [
    { v: '64', l: 'districts served' },
    { v: '8', l: 'regional hubs' },
    { v: '480+', l: 'upazila routes' },
    { v: '98.2%', l: 'on-time delivery' }
  ];

  /* ------------------------------------------------------------------ login */
  function initLogin() {
    const picker = document.querySelector('[data-role-picker]');
    const form = document.querySelector('[data-login-form]');
    if (!form) return;
    const email = form.querySelector('[name="email"]');
    const password = form.querySelector('[name="password"]');
    const errorBox = document.querySelector('[data-login-error]');
    const credsHost = document.querySelector('[data-demo-creds]');
    const params = new URLSearchParams(location.search);
    const preselect = params.get('role');

    // already signed in?
    const existing = ZR.auth.currentUser();
    const banner = document.querySelector('[data-session-banner]');
    if (existing && banner) {
      banner.hidden = false;
      banner.innerHTML = `<div class="alert info">${UI.icon('check-circle')}<div style="flex:1"><strong>You’re already signed in</strong> as ${UI.esc(existing.name)} (${ZR.auth.roleMeta(existing.role).label}).<div class="row gap-2 mt-2"><a class="btn btn-sm btn-primary" href="${ZR.auth.homeFor(existing.role)}">Continue to workspace</a><button class="btn btn-sm" data-sign-out>Sign out</button></div></div></div>`;
      banner.querySelector('[data-sign-out]').addEventListener('click', () => { ZR.auth.logout(); location.reload(); });
    }

    const roles = Object.entries(ZR.auth.ROLES);
    if (picker) {
      picker.innerHTML = roles.map(([key, r]) => `
        <button type="button" class="role-btn ${key === (preselect || 'merchant') ? 'is-active' : ''}" data-role="${key}">
          <span class="ico">${UI.icon(r.icon.replace('ph-', ''))}</span>
          <span style="min-width:0"><span class="t">${UI.esc(r.label)}</span><br><span class="s">${UI.esc(key === 'merchant' ? 'Ship & settle' : key === 'admin' ? 'Run network' : key === 'branch' ? 'Scan & sort' : 'Deliver & collect')}</span></span>
        </button>`).join('');
    }
    if (credsHost) {
      credsHost.innerHTML = roles.map(([key, r]) => `
        <div class="between" style="padding:8px 0;border-bottom:1px solid var(--line-soft);gap:8px">
          <div class="row gap-2" style="min-width:0">${UI.avatar(r.label, { size: 'sm', tone: 'tone-neutral' })}<span class="tiny" style="font-weight:600">${key === 'admin' ? 'Admin' : r.label}</span></div>
          <span class="mono tiny" style="color:var(--muted)">${r.demoEmail}</span>
          <button type="button" class="badge badge-neutral" data-fill-email="${r.demoEmail}" style="cursor:pointer">Use</button>
        </div>`).join('');
    }

    const setRole = (role) => {
      picker && picker.querySelectorAll('[data-role]').forEach((b) => b.classList.toggle('is-active', b.dataset.role === role));
      const meta = ZR.auth.ROLES[role];
      if (meta) { email.value = meta.demoEmail; password.value = '123456'; }
      if (errorBox) errorBox.innerHTML = '';
    };
    picker && picker.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-role]');
      if (btn) setRole(btn.dataset.role);
    });
    if (credsHost) credsHost.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-fill-email]');
      if (!btn) return;
      const role = Object.entries(ZR.auth.ROLES).find(([, r]) => r.demoEmail === btn.dataset.fillEmail);
      if (role) setRole(role[0]);
    });

    // initial fill
    const initialRole = preselect && ZR.auth.ROLES[preselect] ? preselect
      : picker && picker.querySelector('.is-active') ? picker.querySelector('.is-active').dataset.role : 'merchant';
    setRole(initialRole);

    form.querySelectorAll('[data-toggle-password]').forEach((btn) => btn.addEventListener('click', () => {
      const show = password.type === 'password';
      password.type = show ? 'text' : 'password';
      btn.innerHTML = `<i class="ph ${show ? 'ph-eye-slash' : 'ph-eye'}"></i>`;
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (errorBox) errorBox.innerHTML = '';
      const valid = UI.validate(form, {
        email: [UI.validators.required, UI.validators.email],
        password: [(v) => !!String(v) || 'Enter your password.', (v) => String(v).length >= 6 || 'Password must be at least 6 characters.']
      });
      if (!valid) return;
      const btn = form.querySelector('button[type="submit"]');
      UI.setBusy(btn, true, 'Signing in…');
      setTimeout(() => {
        const res = ZR.auth.login(email.value, password.value);
        UI.setBusy(btn, false);
        if (!res.ok) {
          if (errorBox) errorBox.innerHTML = `<div class="alert danger">${UI.icon('warning-circle')}<div><strong>Sign-in failed</strong><br>${UI.esc(res.error)}</div></div>`;
          form.classList.add('shake');
          setTimeout(() => form.classList.remove('shake'), 400);
          return;
        }
        UI.toast('Welcome back', `Signed in as ${res.user.name}`, 'success', { duration: 1500 });
        const next = params.get('next');
        const target = next && next.startsWith(ZR.auth.roleMeta(res.user.role).file) ? next : res.redirect;
        setTimeout(() => { location.href = target; }, 420);
      }, 620);
    });
  }

  /* --------------------------------------------------------------- register */
  const REGISTER_STEPS = ['Business', 'Contact', 'Pickup', 'Review'];
  function initRegister() {
    const host = document.querySelector('[data-register-root]');
    if (!host) return;
    let step = 0;
    const data = {};

    host.innerHTML = `
      <div class="card">
        <div class="card-head no-print" style="padding-bottom:14px">
          <div><h3>Merchant application</h3><p class="sub">Takes about 3 minutes · Reviewed within one business day</p></div>
          <span class="badge badge-neutral">Step <span data-step-label>1</span> of 4</span>
        </div>
        <div style="padding:18px 20px 0">
          <div class="steps" data-steps>${REGISTER_STEPS.map((s, i) => `
            <div class="step ${i === 0 ? 'current' : ''}" data-stepdot="${i}">
              ${i < 3 ? '<span class="step-line"></span>' : ''}
              <span class="step-dot">${i + 1}</span>
              <span class="step-label">${s}</span>
            </div>`).join('')}</div>
        </div>
        <form data-register-form novalidate style="margin-top:18px">
          <div data-panel="0">
            <div class="form-section">
              <div class="form-section-head"><span class="ico">${UI.icon('storefront')}</span><div><h4>Business details</h4><p>Tell us what you sell and where you ship from.</p></div></div>
              <div class="form-grid">
                <div class="field full"><label class="label" for="rg-name">Business / store name <span class="req">*</span></label>
                  <input class="input" id="rg-name" name="name" placeholder="e.g. Nokshi Kuthir" autocomplete="organization">
                  <span class="error-text" hidden></span></div>
                <div class="field"><label class="label" for="rg-type">Business type <span class="req">*</span></label>
                  <select class="select" id="rg-type" name="businessType">
                    <option value="">Select a category</option>
                    ${['Fashion & Apparel', 'FMCG', 'Electronics', 'Handicrafts', 'Beauty', 'Stationery', 'Food & Grocery', 'Agro', 'Other'].map((t) => `<option>${t}</option>`).join('')}
                  </select><span class="error-text" hidden></span></div>
                <div class="field"><label class="label" for="rg-category">Primary product category</label>
                  <input class="input" id="rg-category" name="category" placeholder="e.g. Handloom sarees">
                  <span class="error-text" hidden></span></div>
              </div>
            </div>
          </div>

          <div data-panel="1" hidden>
            <div class="form-section">
              <div class="form-section-head"><span class="ico">${UI.icon('user-circle')}</span><div><h4>Contact & account</h4><p>This person will be the primary account owner.</p></div></div>
              <div class="form-grid">
                <div class="field"><label class="label" for="rg-owner">Owner name <span class="req">*</span></label>
                  <input class="input" id="rg-owner" name="owner" placeholder="Full name" autocomplete="name"><span class="error-text" hidden></span></div>
                <div class="field"><label class="label" for="rg-phone">Mobile number <span class="req">*</span></label>
                  <input class="input" id="rg-phone" name="phone" placeholder="+8801XXXXXXXXX" inputmode="tel" autocomplete="tel"><span class="error-text" hidden></span></div>
                <div class="field"><label class="label" for="rg-email">Email address <span class="req">*</span></label>
                  <input class="input" id="rg-email" name="email" type="email" placeholder="you@business.com" autocomplete="email"><span class="error-text" hidden></span></div>
                <div class="field"><label class="label" for="rg-password">Password <span class="req">*</span></label>
                  <input class="input" id="rg-password" name="password" type="password" placeholder="At least 6 characters" autocomplete="new-password">
                  <span class="hint">Demo only — stored in this browser.</span><span class="error-text" hidden></span></div>
              </div>
            </div>
          </div>

          <div data-panel="2" hidden>
            <div class="form-section">
              <div class="form-section-head"><span class="ico">${UI.icon('map-pin')}</span><div><h4>Pickup & volume</h4><p>Where should riders collect your parcels?</p></div></div>
              <div class="form-grid">
                <div class="field"><label class="label" for="rg-district">District <span class="req">*</span></label>
                  <select class="select" id="rg-district" name="district"><option value="">Select district</option>${UI.districtOptions()}</select><span class="error-text" hidden></span></div>
                <div class="field"><label class="label" for="rg-volume">Expected weekly volume</label>
                  <select class="select" id="rg-volume" name="volume">
                    <option>1–50 parcels / week</option><option>51–200 parcels / week</option><option>201–500 parcels / week</option><option>500+ parcels / week</option>
                  </select></div>
                <div class="field full"><label class="label" for="rg-address">Business address <span class="req">*</span></label>
                  <textarea class="textarea" id="rg-address" name="address" rows="2" placeholder="House, road, area, thana"></textarea><span class="error-text" hidden></span></div>
                <div class="field full"><label class="label" for="rg-pickup">Pickup address <span class="opt">(if different)</span></label>
                  <textarea class="textarea" id="rg-pickup" name="pickupAddress" rows="2" placeholder="Warehouse or pickup point"></textarea></div>
              </div>
            </div>
          </div>

          <div data-panel="3" hidden>
            <div class="form-section">
              <div class="form-section-head"><span class="ico">${UI.icon('check-square')}</span><div><h4>Review your application</h4><p>Confirm your details before submitting.</p></div></div>
              <div data-review></div>
              <label class="checkbox mt-4"><input type="checkbox" name="terms"><span>I agree to the Zeriour merchant terms, COD settlement policy and delivery guidelines. I understand this is a demo prototype and no real service is activated.</span></label>
              <span class="error-text" hidden data-terms-error></span>
            </div>
          </div>

          <div class="card-foot" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <button type="button" class="btn" data-back hidden>${UI.icon('arrow-left')} Back</button>
            <div class="row gap-2" style="margin-left:auto">
              <a class="btn btn-ghost" href="login.html">Already registered?</a>
              <button type="button" class="btn btn-primary" data-next>Continue ${UI.icon('arrow-right')}</button>
              <button type="submit" class="btn btn-primary" data-submit hidden>Submit application ${UI.icon('paper-plane-tilt')}</button>
            </div>
          </div>
        </form>
      </div>`;

    const form = host.querySelector('[data-register-form]');
    const back = host.querySelector('[data-back]');
    const next = host.querySelector('[data-next]');
    const submit = host.querySelector('[data-submit]');
    const stepLabel = host.querySelector('[data-step-label]');
    const review = host.querySelector('[data-review]');

    const read = (name) => (form.querySelector(`[name="${name}"]`) || {}).value || '';
    const collect = () => {
      ['name', 'businessType', 'category', 'owner', 'phone', 'email', 'password', 'district', 'volume', 'address', 'pickupAddress'].forEach((k) => { data[k] = read(k); });
      if (!data.pickupAddress) data.pickupAddress = data.address;
      data.pickupAddress = data.pickupAddress || 'Main warehouse';
      return data;
    };

    const STEP_RULES = [
      { name: [(v) => UI.validators.required(v), (v) => UI.validators.minLength(v, 3)], businessType: [UI.validators.required] },
      { owner: [UI.validators.required], phone: [UI.validators.required, UI.validators.phone], email: [UI.validators.required, UI.validators.email], password: [UI.validators.required, (v) => String(v).length >= 6 || 'Use at least 6 characters.'] },
      { district: [UI.validators.required], address: [UI.validators.required, (v) => String(v).trim().length >= 8 || 'Add a little more address detail.'] },
      {}
    ];
    const ruleMap = (rules) => rules || {};

    function paint() {
      host.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = +p.dataset.panel !== step; });
      stepLabel.textContent = step + 1;
      back.hidden = step === 0;
      next.hidden = step === 3;
      submit.hidden = step !== 3;
      host.querySelectorAll('[data-stepdot]').forEach((d) => {
        const i = +d.dataset.stepdot;
        d.classList.toggle('done', i < step);
        d.classList.toggle('current', i === step);
        const dot = d.querySelector('.step-dot');
        if (i < step) dot.innerHTML = UI.icon('check');
        else dot.textContent = i + 1;
      });
      if (step === 3) {
        collect();
        review.innerHTML = `
          <div class="kv-grid">
            <div class="kv"><div class="k">Business</div><div class="v">${UI.esc(data.name || '—')}</div></div>
            <div class="kv"><div class="k">Type</div><div class="v">${UI.esc(data.businessType || '—')}</div></div>
            <div class="kv"><div class="k">Owner</div><div class="v">${UI.esc(data.owner || '—')}</div></div>
            <div class="kv"><div class="k">Contact</div><div class="v">${UI.esc(data.phone || '—')} · ${UI.esc(data.email || '—')}</div></div>
            <div class="kv"><div class="k">District</div><div class="v">${UI.esc(data.district || '—')}</div></div>
            <div class="kv"><div class="k">Weekly volume</div><div class="v">${UI.esc(data.volume)}</div></div>
            <div class="kv" style="grid-column:1/-1"><div class="k">Pickup address</div><div class="v">${UI.esc(data.pickupAddress || '—')}</div></div>
          </div>
          <div class="summary-box mt-4">
            <div class="summary-line"><span>Account activation</span><strong>Free</strong></div>
            <div class="summary-line"><span>Call charges</span><strong>Standard rates apply</strong></div>
            <div class="summary-line"><span>COD settlement</span><strong>Weekly · Tuesdays</strong></div>
          </div>`;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    back.addEventListener('click', () => { if (step > 0) { step -= 1; paint(); } });
    next.addEventListener('click', () => {
      if (!UI.validate(form, ruleMap(STEP_RULES[step]))) return;
      collect();
      step = Math.min(3, step + 1);
      paint();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      collect();
      const terms = form.querySelector('[name="terms"]');
      const termsErr = form.querySelector('[data-terms-error]');
      if (!terms.checked) {
        termsErr.hidden = false;
        termsErr.textContent = 'Please accept the merchant terms to continue.';
        return;
      }
      termsErr.hidden = true;
      const btn = submit;
      UI.setBusy(btn, true, 'Submitting…');
      setTimeout(() => {
        const m = ZR.store.applyMerchant({
          name: data.name, owner: data.owner, email: data.email, phone: data.phone,
          businessType: data.businessType, category: data.category, district: data.district,
          address: data.address, pickupAddress: data.pickupAddress, volume: data.volume
        });
        UI.setBusy(btn, false);
        host.innerHTML = `
          <div class="card card-pad-lg text-center anim-fade-up">
            <div class="empty-ico" style="background:var(--success-soft);color:var(--success);border-color:rgba(13,155,108,.2);width:56px;height:56px;font-size:26px">${UI.icon('check-circle')}</div>
            <h2 style="font-size:var(--text-2xl)">Application received</h2>
            <p class="lead" style="max-width:46ch;margin:10px auto 0">Thanks, ${UI.esc(data.owner.split(' ')[0] || 'there')}. “${UI.esc(m.name)}” is now pending review. In this prototype the application is saved locally and appears instantly for the admin demo role.</p>
            <div class="summary-box" style="max-width:420px;margin:20px auto;text-align:left">
              <div class="summary-line"><span>Application ID</span><strong class="mono">${UI.esc(m.id.toUpperCase())}</strong></div>
              <div class="summary-line"><span>Status</span><strong><span class="badge badge-warn"><i class="dot"></i>Pending review</span></strong></div>
              <div class="summary-line"><span>Next step</span><strong>Admin approval</strong></div>
            </div>
            <div class="row gap-2 center wrap">
              <a class="btn btn-primary" href="admin.html">${UI.icon('shield-check')} Review as admin</a>
              <a class="btn" href="login.html?role=merchant">Try the demo merchant</a>
            </div>
            <p class="tiny faint mt-4">${UI.icon('flask')} This application is a frontend simulation. It is stored only in your browser.</p>
          </div>`;
      }, 800);
    });
    paint();
  }

  /* ----------------------------------------------------------------- forgot */
  function initForgot() {
    const form = document.querySelector('[data-forgot-form]');
    if (!form) return;
    const host = document.querySelector('[data-forgot-root]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!UI.validate(form, { email: [UI.validators.required, UI.validators.email] })) return;
      const email = form.querySelector('[name="email"]').value;
      const btn = form.querySelector('button[type="submit"]');
      UI.setBusy(btn, true, 'Sending…');
      setTimeout(() => {
        const known = ZR.store.state.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
        host.innerHTML = `
          <div class="card card-pad-lg text-center anim-fade-up">
            <div class="empty-ico" style="background:var(--primary-50);color:var(--primary);border-color:var(--primary-100);width:54px;height:54px;font-size:24px">${UI.icon('envelope-simple')}</div>
            <h2 style="font-size:var(--text-xl)">Check your inbox</h2>
            <p class="lead" style="font-size:var(--text-sm);margin-top:8px">If an account exists for <strong>${UI.esc(email)}</strong>, a password reset link has been sent.</p>
            <div class="alert info mt-4" style="text-align:left">${UI.icon('flask')}<div><strong>Demo note:</strong> no email is actually sent. ${known ? 'This email matches a demo account — use the credentials below to sign in.' : 'Try merchant@demo.com with password 123456.'}</div></div>
            <div class="row gap-2 center mt-4"><a class="btn btn-primary" href="login.html">Back to sign in</a><a class="btn" href="contact.html">Contact support</a></div>
          </div>`;
      }, 700);
    });
  }

  /* ------------------------------------------------------------------ track */
  function trackSkeleton() {
    return `<div class="card card-pad-lg"><div class="skeleton sk-line" style="width:26%"></div>
      <div class="skeleton mt-3" style="width:44%;height:26px"></div>
      <div class="skeleton mt-4" style="height:56px"></div>
      <div class="grid g-4 mt-5">${Array.from({ length: 4 }, () => '<div><div class="skeleton sk-line" style="width:60%"></div><div class="skeleton sk-line mt-2" style="width:85%"></div></div>').join('')}</div>
    </div>`;
  }

  function initTrack() {
    const root = document.querySelector('[data-track-root]');
    if (!root) return;
    const form = document.querySelector('[data-track-form]');
    const demoHost = document.querySelector('[data-track-demos]');
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || '';

    if (demoHost) {
      demoHost.innerHTML = ['ZR4829103756', 'ZR4829103893', 'ZR4829104030'].map((t) => {
        const p = ZR.store.parcelByTracking(t);
        return `<a class="row gap-2" href="track.html?id=${t}" style="padding:9px 10px;border-radius:var(--r-sm);border:1px solid var(--line);font-size:var(--text-xs)">
          <span class="mono" style="font-weight:600">${t}</span>
          <span style="margin-left:auto">${p ? UI.statusBadge(p.statusKey, { short: true }) : ''}</span>
        </a>`;
      }).join('');
    }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    async function show(raw) {
      const q = String(raw || '').trim();
      if (!q) { root.innerHTML = idle(); bindIdle(); return; }
      root.innerHTML = trackSkeleton();
      await sleep(420);
      const res = ZR.tracking.lookup(q);
      if (!res.ok) {
        root.innerHTML = `
          <div class="card card-pad-lg anim-fade-up" style="max-width:560px;margin-inline:auto;text-align:center">
            <div class="empty-ico" style="width:52px;height:52px;font-size:24px;background:var(--warn-soft);color:var(--warn);border-color:rgba(194,118,10,.2)">${UI.icon('package')}</div>
            <h3 style="font-size:var(--text-lg)">Shipment not found</h3>
            <p class="lead" style="font-size:var(--text-sm);margin-top:6px">${UI.esc(res.error)}</p>
            <div class="alert info mt-4" style="text-align:left">${UI.icon('flask')}<div>${UI.esc(res.hint)}</div></div>
            <form class="row gap-2 mt-4" data-retry style="align-items:stretch">
              <input class="input grow" name="retry" placeholder="Try another tracking number" value="${UI.esc(q)}" aria-label="Tracking number">
              <button class="btn btn-primary" type="submit">Track</button>
            </form>
          </div>`;
        root.querySelector('[data-retry]').addEventListener('submit', (e) => {
          e.preventDefault();
          const v = e.target.querySelector('[name="retry"]').value.trim();
          history.replaceState(null, '', 'track.html?id=' + encodeURIComponent(v));
          show(v);
        });
        return;
      }
      const p = res.parcel;
      root.innerHTML = `
        <div class="stack gap-5">
          ${ZR.tracking.summary(p)}
          <div class="track-layout">
            <div class="card">
              <div class="card-head"><div><h3>${UI.icon('path')} Shipment journey</h3><p class="sub">${UI.esc(p.timeline.length)} tracked events</p></div><span class="badge badge-neutral">${UI.icon('clock')} Updated ${UI.relative(p.updatedAt)}</span></div>
              <div class="card-body">${ZR.tracking.timeline(p)}</div>
            </div>
            <div class="stack gap-4">
              ${ZR.tracking.details(p)}
              <div class="card card-pad">
                <h4 style="font-size:var(--text-sm)">${UI.icon('question')} Need to change something?</h4>
                <p class="tiny muted mt-2" style="line-height:1.6">Address changes and reschedules are possible until the parcel is out for delivery.</p>
                <a class="btn btn-sm btn-soft mt-3" href="contact.html">Contact support ${UI.icon('arrow-right')}</a>
              </div>
            </div>
          </div>
        </div>`;
      root.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => UI.copy(b.dataset.copy, 'Tracking number copied')));
    }

    function idle() {
      const recent = ZR.store.state.parcels.slice(0, 3);
      return `<div class="card card-pad-lg text-center" style="max-width:640px;margin-inline:auto">
        <div class="empty-ico" style="width:52px;height:52px;font-size:24px">${UI.icon('package')}</div>
        <h3 style="font-size:var(--text-lg)">Track any Zeriour shipment</h3>
        <p class="lead" style="font-size:var(--text-sm);margin-top:6px">Enter your tracking number above to see live status, hub movements and delivery events.</p>
        <div class="inline-list center mt-4">${['ZR4829103756', 'ZR4829103893', 'ZR4829104030'].map((t) => `<button class="badge badge-neutral mono" data-track-quick="${t}" style="cursor:pointer;height:26px">${t}</button>`).join('')}</div>
        <p class="tiny faint mt-4">${UI.icon('flask')} Demo records are generated locally and update as you move them through each role dashboard.</p>
      </div>`;
    }

    function bindIdle() {
      root.querySelectorAll('[data-track-quick]').forEach((b) => b.addEventListener('click', () => {
        if (form) form.querySelector('input').value = b.dataset.trackQuick;
        history.replaceState(null, '', 'track.html?id=' + b.dataset.trackQuick);
        show(b.dataset.trackQuick);
      }));
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = form.querySelector('input').value.trim();
        if (!val) {
          UI.toast('Enter a tracking number', 'Try one of the demo IDs below.', 'warn');
          form.querySelector('input').focus();
          return;
        }
        history.replaceState(null, '', 'track.html?id=' + encodeURIComponent(val));
        show(val);
        const target = document.querySelector('[data-track-result]');
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    if (id) show(id);
    else { root.innerHTML = idle(); bindIdle(); }
  }

  /* ---------------------------------------------------------------- contact */
  function initContact() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    const host = document.querySelector('[data-contact-root]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valid = UI.validate(form, {
        name: [UI.validators.required],
        email: [UI.validators.required, UI.validators.email],
        phone: [UI.validators.phone],
        topic: [UI.validators.required],
        message: [UI.validators.required, (v) => v.trim().length >= 12 || 'Tell us a little more (12+ characters).']
      });
      if (!valid) return;
      const btn = form.querySelector('button[type="submit"]');
      UI.setBusy(btn, true, 'Sending…');
      const ref = 'ZR-CS-' + String(Date.now()).slice(-6);
      setTimeout(() => {
        ZR.store.notify({
          audience: 'admin', title: 'New website enquiry',
          body: `${form.querySelector('[name="name"]').value} · ${form.querySelector('[name="topic"]').value} · ${ref}`,
          tone: 'info', icon: 'ph-headset', link: '#/tickets'
        });
        ZR.store.save('contact:message');
        host.innerHTML = `
          <div class="card card-pad-lg text-center anim-fade-up">
            <div class="empty-ico" style="background:var(--success-soft);color:var(--success);border-color:rgba(13,155,108,.2);width:54px;height:54px;font-size:24px">${UI.icon('chat-circle-dots')}</div>
            <h2 style="font-size:var(--text-xl)">Message sent</h2>
            <p class="lead" style="font-size:var(--text-sm);margin-top:8px">Thanks for reaching out. Our support team replies within one business day.</p>
            <div class="summary-box" style="max-width:340px;margin:18px auto;text-align:left">
              <div class="summary-line"><span>Reference</span><strong class="mono">${ref}</strong></div>
              <div class="summary-line"><span>Response time</span><strong>Under 24 hours</strong></div>
            </div>
            <div class="row gap-2 center"><a class="btn btn-primary" href="index.html">Back to home</a><button class="btn" data-again>Send another</button></div>
          </div>`;
        host.querySelector('[data-again]').addEventListener('click', () => location.reload());
      }, 760);
    });
  }

  /* ---------------------------------------------------------------- pricing */
  function initPricingPage() {
    const matrix = document.querySelector('[data-pricing-matrix]');
    if (matrix) {
      const rows = ZR.pricing.matrix();
      matrix.innerHTML = `<div class="table-wrap"><table class="table">
        <thead><tr><th>Service</th><th class="cell-num">First 1 kg</th><th class="cell-num">2 kg</th><th class="cell-num">5 kg</th><th>Transit time</th><th>Best for</th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <td class="cell-strong">${UI.esc(r.name)}</td>
          <td class="cell-num">${UI.money(r.sample.oneKg)}</td>
          <td class="cell-num">${UI.money(r.sample.twoKg)}</td>
          <td class="cell-num">${UI.money(r.sample.fiveKg)}</td>
          <td><span class="badge badge-neutral">${UI.esc(r.eta)}</span></td>
          <td class="tiny muted">${UI.esc(r.desc)}</td>
        </tr>`).join('')}</tbody></table></div>
        <div class="card-foot tiny muted" style="display:flex;gap:8px;align-items:flex-start">${UI.icon('info')}<span>Rates shown are base delivery charges for Dhaka-origin shipments. COD adds ${ZR.pricing.settings().codRate}% (min ${UI.money(ZR.pricing.settings().codMin)}). A ${UI.money(ZR.pricing.settings().remoteSurcharge)} surcharge applies to remote districts.</span></div>`;
    }
    const faqHost = document.querySelector('[data-faq]');
    if (faqHost) faqHost.innerHTML = P.FAQS.map(([q, a]) => `
      <div class="acc-item">
        <button class="acc-trigger" aria-expanded="false">${UI.esc(q)}${UI.icon('plus')}</button>
        <div class="acc-panel"><div><p>${UI.esc(a)}</p></div></div>
      </div>`).join('');
    P.bindAccordions();
  }

  /* ------------------------------------------------------------------- home */
  function initHome() {
    const trackHost = document.querySelector('[data-track-widget]');
    if (trackHost && !trackHost.dataset.done) {
      trackHost.dataset.done = '1';
      trackHost.innerHTML = P.trackWidget({ uid: 'home' });
      P.bindTrackWidgets(trackHost);
    }
    const faqHost = document.querySelector('[data-faq]');
    if (faqHost) {
      faqHost.innerHTML = P.FAQS.slice(0, 5).map(([q, a]) => `
        <div class="acc-item">
          <button class="acc-trigger" aria-expanded="false">${UI.esc(q)}${UI.icon('plus')}</button>
          <div class="acc-panel"><div><p>${UI.esc(a)}</p></div></div>
        </div>`).join('');
      P.bindAccordions();
    }
    const cov = document.querySelector('[data-home-coverage]');
    if (cov) {
      const list = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Rangpur', 'Barishal', 'Mymensingh'];
      cov.innerHTML = list.map((div) => {
        const districts = ZR.DISTRICTS.filter((d) => d.division === div);
        return `<div class="coverage-row"><span class="dot"></span><span class="nm">${div} Division</span><span class="ct">${districts.length} districts</span></div>`;
      }).join('');
    }
    const metrics = document.querySelector('[data-live-metrics]');
    if (metrics) {
      const s = ZR.store.statsAdmin();
      metrics.innerHTML = `
        <div class="grid g-4" style="gap:14px">
          <div><div class="num" style="font-family:var(--font-display);font-weight:750;font-size:20px">${UI.num(s.parcels)}</div><div class="tiny muted">demo parcels tracked</div></div>
          <div><div class="num" style="font-family:var(--font-display);font-weight:750;font-size:20px">${UI.moneyShort(s.codVolume)}</div><div class="tiny muted">COD volume simulated</div></div>
          <div><div class="num" style="font-family:var(--font-display);font-weight:750;font-size:20px">${s.successRate}%</div><div class="tiny muted">delivery success rate</div></div>
          <div><div class="num" style="font-family:var(--font-display);font-weight:750;font-size:20px">${s.branchCount}</div><div class="tiny muted">regional hubs</div></div>
        </div>`;
    }
  }

  function initCoverage() {
    const host = document.querySelector('[data-hub-directory]');
    if (!host) return;
    host.innerHTML = ZR.store.state.branches.map((b) => `<div class="row gap-3">
      <span class="badge badge-neutral mono" style="min-width:54px;justify-content:center">${UI.esc(b.code)}</span>
      <div class="grow"><div class="strong small">${UI.esc(b.name)}</div><div class="tiny muted">${UI.esc(b.district)} · ${b.staff} staff</div></div>
      <span class="tiny faint">${UI.esc(b.thana)}</span>
    </div>`).join('');
  }

  /* ------------------------------------------------------------------- boot */
  function boot() {
    ZR.store.init();
    P.init();
    switch (page()) {
      case 'login': initLogin(); break;
      case 'register': initRegister(); break;
      case 'forgot': initForgot(); break;
      case 'track': initTrack(); break;
      case 'contact': initContact(); break;
      case 'pricing': initPricingPage(); break;
      case 'home': initHome(); break;
      case 'coverage': initCoverage(); break;
      default: break;
    }
    Pages.initFacts && Pages.initFacts();
  }

  Pages.initFacts = function () {
    const host = document.querySelector('[data-facts]');
    if (host && !host.dataset.done) {
      host.dataset.done = '1';
      host.innerHTML = FACTS.map((f) => `<div class="stat-item"><div class="v">${UI.esc(f.v)}</div><div class="l">${UI.esc(f.l)}</div></div>`).join('');
    }
  };

  document.addEventListener('DOMContentLoaded', boot);
  Pages.boot = boot;
})(window.ZR);
