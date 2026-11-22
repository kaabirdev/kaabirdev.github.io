/* ==========================================================================
   Zeriour — public website behaviour
   Shared header/footer, tracking widget, pricing calculator, coverage map,
   forms, accordions and scroll reveals.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';
  const UI = ZR.ui;
  const P = {};
  ZR.public = P;

  const BRAND_MARK = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 6.5h11.5L7.5 17.5H19" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M15.5 6.5 19 6.5 19 10" stroke="#22d3ee" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const NAV = [
    { label: 'Home', href: 'index.html' },
    {
      label: 'Services', href: 'services.html', items: [
        { t: 'Standard delivery', d: 'Nationwide coverage in 2–4 days', icon: 'package', href: 'services.html' },
        { t: 'Express delivery', d: 'Next-day to major cities', icon: 'lightning', href: 'services.html' },
        { t: 'Same-day metro', d: 'Dhaka & Chattogram in hours', icon: 'timer', href: 'services.html' },
        { t: 'COD collection', d: 'Collect and settle merchant payments', icon: 'wallet', href: 'services.html' },
        { t: 'Merchant tools', d: 'Bulk import, labels and API', icon: 'sliders-horizontal', href: 'services.html' },
        { t: 'Returns management', d: 'Handle failed deliveries cleanly', icon: 'arrow-u-up-left', href: 'services.html' }
      ]
    },
    { label: 'Coverage', href: 'coverage.html' },
    { label: 'Pricing', href: 'pricing.html' },
    { label: 'Track', href: 'track.html' },
    {
      label: 'Company', href: 'about.html', items: [
        { t: 'About Zeriour', d: 'Our network, team and story', icon: 'buildings', href: 'about.html' },
        { t: 'Contact', d: 'Talk to sales or support', icon: 'headset', href: 'contact.html' },
        { t: 'Become a merchant', d: 'Start shipping in 24 hours', icon: 'storefront', href: 'register.html' }
      ]
    }
  ];

  P.header = function () {
    const active = (document.body.dataset.page || '').trim();
    const links = NAV.map((n) => {
      if (n.items) {
        return `<div class="dropdown">
          <button class="pub-link" aria-expanded="false" aria-haspopup="true">${n.label} ${UI.icon('caret-down')}</button>
          <div class="pub-menu-panel" role="menu">
            ${n.items.map((i) => `<a class="pm-item" href="${i.href}" role="menuitem">
              <span class="ico">${UI.icon(i.icon)}</span>
              <span><span class="t" style="display:block">${i.t}</span><span class="d" style="display:block">${i.d}</span></span>
            </a>`).join('')}
          </div>
        </div>`;
      }
      return `<a class="pub-link ${active === n.href ? 'is-active' : ''}" href="${n.href}">${n.label}</a>`;
    }).join('');

    return `<header class="pub-header" data-pub-header>
      <div class="container">
        <nav class="pub-nav" aria-label="Main navigation">
          <a class="brand" href="index.html" aria-label="Zeriour — home">
            <span class="brand-mark">${BRAND_MARK}</span>
            <span><span class="brand-name">zeriour<span>.</span></span><span class="brand-tag">Precision logistics</span></span>
          </a>
          <div class="pub-links">${links}</div>
          <div class="pub-actions">
            <button class="icon-btn" data-theme-toggle aria-label="Toggle dark mode" title="Toggle theme"><i data-theme-icon class="ph ph-moon"></i></button>
            <a class="btn btn-ghost desktop-only" href="login.html">Sign in</a>
            <a class="btn btn-primary" href="register.html">Start shipping ${UI.icon('arrow-right')}</a>
            <button class="icon-btn mobile-toggle" data-pub-menu aria-label="Open menu" aria-expanded="false">${UI.icon('list')}</button>
          </div>
        </nav>
      </div>
    </header>
    <div class="pub-mobile" id="pubMobile" aria-hidden="true">
      <div class="pm-backdrop" data-pub-close></div>
      <div class="pm-sheet" role="dialog" aria-modal="true" aria-label="Site menu">
        <div class="between mb-3">
          <a class="brand" href="index.html"><span class="brand-mark">${BRAND_MARK}</span><span><span class="brand-name">zeriour<span>.</span></span><span class="brand-tag">Precision logistics</span></span></a>
          <button class="icon-btn" data-pub-close aria-label="Close menu">${UI.icon('x')}</button>
        </div>
        ${NAV.map((n) => n.items
          ? `<div class="pm-group">${n.label}</div>${n.items.map((i) => `<a class="pm-link" href="${i.href}">${i.t} ${UI.icon('arrow-up-right')}</a>`).join('')}`
          : `<a class="pm-link" href="${n.href}">${n.label} ${UI.icon('caret-right')}</a>`).join('')}
        <div class="pm-group">Account</div>
        <a class="pm-link" href="login.html">Sign in</a>
        <a class="pm-link" href="register.html">Become a merchant</a>
        <div style="margin-top:auto;padding-top:20px">
          <a class="btn btn-primary btn-block" href="track.html">${UI.icon('package')} Track a parcel</a>
          <button class="btn btn-ghost btn-block mt-2" data-theme-toggle>${UI.icon('moon')} Switch theme</button>
        </div>
      </div>
    </div>`;
  };

  P.footer = function () {
    return `<footer class="pub-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="index.html">
              <span class="brand-mark">${BRAND_MARK}</span>
              <span><span class="brand-name">zeriour<span>.</span></span><span class="brand-tag">Precision logistics</span></span>
            </a>
            <p style="font-size:var(--text-sm);color:#9fb0c4;line-height:1.65;max-width:30ch;margin-top:14px">
              A nationwide courier network built for Bangladeshi commerce — reliable pickups, transparent COD and tracking that actually updates.
            </p>
            <div class="footer-social mt-4">
              <a href="#" aria-label="Facebook">${UI.icon('facebook-logo')}</a>
              <a href="#" aria-label="Instagram">${UI.icon('instagram-logo')}</a>
              <a href="#" aria-label="LinkedIn">${UI.icon('linkedin-logo')}</a>
              <a href="#" aria-label="YouTube">${UI.icon('youtube-logo')}</a>
            </div>
          </div>
          <div>
            <h5>Services</h5>
            <a class="footer-link" href="services.html">Standard delivery</a>
            <a class="footer-link" href="services.html">Express delivery</a>
            <a class="footer-link" href="services.html">Same-day metro</a>
            <a class="footer-link" href="services.html">COD collection</a>
            <a class="footer-link" href="pricing.html">Pricing calculator</a>
          </div>
          <div>
            <h5>Company</h5>
            <a class="footer-link" href="about.html">About us</a>
            <a class="footer-link" href="coverage.html">Coverage areas</a>
            <a class="footer-link" href="contact.html">Contact</a>
            <a class="footer-link" href="register.html">Become a merchant</a>
            <a class="footer-link" href="login.html">Merchant login</a>
          </div>
          <div>
            <h5>Support</h5>
            <a class="footer-link" href="track.html">Track a parcel</a>
            <a class="footer-link" href="pricing.html#faq">Delivery FAQ</a>
            <a class="footer-link" href="contact.html">Report an issue</a>
            <a class="footer-link" href="login.html">Merchant portal</a>
            <a class="footer-link" href="login.html?role=admin">Demo admin</a>
          </div>
          <div>
            <h5>Get in touch</h5>
            <a class="footer-link" href="tel:+8809612300400">${UI.icon('phone')} 09612 300 400</a>
            <a class="footer-link" href="mailto:support@zeriour.demo">${UI.icon('envelope-simple')} support@zeriour.demo</a>
            <span class="footer-link" style="cursor:default">${UI.icon('map-pin')} Gulshan Avenue, Dhaka 1212</span>
            <span class="footer-link" style="cursor:default">${UI.icon('clock')} Sat–Thu · 9:00 – 21:00</span>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© <span data-year>2024</span> Zeriour Logistics Ltd. All rights reserved. A fictional brand built for a UI/UX prototype.</span>
          <div class="row gap-4 wrap">
            <a href="#" class="footer-link" style="padding:0">Privacy</a>
            <a href="#" class="footer-link" style="padding:0">Terms</a>
            <a href="#" class="footer-link" style="padding:0">Refunds</a>
            <a href="#" class="footer-link" style="padding:0">Demo disclaimer</a>
          </div>
        </div>
      </div>
    </footer>`;
  };

  P.mountChrome = function () {
    const headerHost = document.querySelector('[data-pub-header]');
    if (headerHost) headerHost.outerHTML = P.header();
    const footerHost = document.querySelector('[data-pub-footer]');
    if (footerHost) footerHost.innerHTML = P.footer();
    document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });

    // dropdowns
    document.querySelectorAll('.pub-header .dropdown').forEach((dd) => {
      const trigger = dd.querySelector('.pub-link');
      const panel = dd.querySelector('.pub-menu-panel');
      let open = false;
      let closeTimer = null;
      let hoverOpened = false;
      const setOpen = (v) => {
        open = v;
        if (!v) hoverOpened = false;
        clearTimeout(closeTimer);
        trigger.setAttribute('aria-expanded', String(v));
        panel.style.display = v ? 'grid' : 'none';
      };
      setOpen(false);
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        UI.closeMenus();
        if (open && hoverOpened) { hoverOpened = false; return; }
        setOpen(!open);
      });
      document.addEventListener('click', (e) => { if (open && !dd.contains(e.target)) setOpen(false); });
      dd.addEventListener('mouseenter', () => {
        if (!window.matchMedia('(min-width:1024px)').matches) return;
        clearTimeout(closeTimer);
        hoverOpened = true;
        setOpen(true);
      });
      dd.addEventListener('mouseleave', () => {
        if (!window.matchMedia('(min-width:1024px)').matches) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => setOpen(false), 180);
      });
      // keep the panel open while the pointer crosses the space above it
      panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    });

    // mobile sheet
    const sheet = document.getElementById('pubMobile');
    const toggle = document.querySelector('[data-pub-menu]');
    if (sheet && toggle) {
      const openSheet = (v) => {
        sheet.classList.toggle('open', v);
        sheet.setAttribute('aria-hidden', String(!v));
        toggle.setAttribute('aria-expanded', String(v));
        document.body.style.overflow = v ? 'hidden' : '';
      };
      toggle.addEventListener('click', () => openSheet(true));
      sheet.querySelectorAll('[data-pub-close]').forEach((b) => b.addEventListener('click', () => openSheet(false)));
    }
    // re-init theme buttons injected after app.js boot
    document.querySelectorAll('.pub-header [data-theme-toggle], .pub-mobile [data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', ZR.app.toggleTheme);
    });
    document.querySelectorAll('[data-theme-icon]').forEach((i) => {
      i.className = `ph ${ZR.app.theme() === 'dark' ? 'ph-sun' : 'ph-moon'}`;
    });
  };

  /* ---------------------------------------------------------- track widgets */
  P.trackWidget = function (opts = {}) {
    return `<form class="track-widget" data-track-widget role="search">
      <div class="tw-inner">
        <label class="sr-only" for="trackInput-${opts.uid || 'x'}">Tracking number</label>
        <input class="tw-input mono" id="trackInput-${opts.uid || 'x'}" name="tracking" type="text" placeholder="Enter tracking number (ZR…)" autocomplete="off" spellcheck="false">
        <button class="btn btn-primary" type="submit">${UI.icon('magnifying-glass')} Track parcel</button>
      </div>
      <div class="tw-hint">${UI.icon('flask')} Demo IDs:
        <button type="button" data-demo-id="ZR4829103756">ZR4829103756</button>
        <button type="button" data-demo-id="ZR4829103893">ZR4829103893</button>
        <button type="button" data-demo-id="ZR4829104030">ZR4829104030</button>
      </div>
    </form>`;
  };

  P.bindTrackWidgets = function (root = document) {
    root.querySelectorAll('[data-track-widget]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = form.querySelector('input[name="tracking"]').value.trim();
        if (!val) {
          UI.toast('Tracking number required', 'Enter a tracking number or try a demo ID.', 'warn');
          form.querySelector('input').focus();
          return;
        }
        const btn = form.querySelector('button[type="submit"]');
        UI.setBusy(btn, true, 'Locating…');
        setTimeout(() => { location.href = 'track.html?id=' + encodeURIComponent(val); }, 380);
      });
      form.querySelectorAll('[data-demo-id]').forEach((b) => b.addEventListener('click', () => {
        form.querySelector('input').value = b.dataset.demoId;
        form.querySelector('input').focus();
      }));
    });
  };

  /* ------------------------------------------------------------- accordions */
  P.bindAccordions = function (root = document) {
    root.querySelectorAll('.accordion').forEach((acc) => {
      acc.querySelectorAll('.acc-trigger').forEach((trig) => {
        trig.addEventListener('click', () => {
          const item = trig.closest('.acc-item');
          const isOpen = item.classList.contains('open');
          if (!acc.dataset.multi) {
            acc.querySelectorAll('.acc-item.open').forEach((o) => { o.classList.remove('open'); o.querySelector('.acc-trigger').setAttribute('aria-expanded', 'false'); });
          }
          item.classList.toggle('open', !isOpen);
          trig.setAttribute('aria-expanded', String(!isOpen));
        });
      });
    });
  };

  /* --------------------------------------------------------------- reveals */
  P.bindReveals = function () {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((t) => io.observe(t));
  };

  P.bindCounters = function () {
    const nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;
    const run = (node) => {
      const target = parseFloat(node.dataset.count);
      const decimals = node.dataset.decimals ? +node.dataset.decimals : 0;
      const suffix = node.dataset.suffix || '';
      const prefix = node.dataset.prefix || '';
      const start = performance.now();
      const dur = 1300;
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = prefix + (target * eased).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nodes.forEach((n) => io.observe(n));
  };

  /* ------------------------------------------------------------- calculator */
  P.calculator = function (opts = {}) {
    const cfg = ZR.pricing.settings();
    const id = 'calc-' + Math.random().toString(36).slice(2, 7);
    return `<div class="card price-calc" data-calculator>
      <form class="calc-form" novalidate>
        <div class="between wrap gap-3 mb-4">
          <div>
            <h3 style="font-size:var(--text-lg)">Estimate your delivery cost</h3>
            <p class="tiny muted mt-1">Live demo rates — the same configuration admins control.</p>
          </div>
          <div class="segmented" role="group" aria-label="Delivery type">
            ${ZR.pricing.types().map((t, i) => `<button type="button" data-type="${t.id}" class="${i === 0 ? 'is-active' : ''}">${t.name}</button>`).join('')}
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="label" for="${id}-origin">Origin district</label>
            <select class="select" id="${id}-origin" name="origin">${UI.districtOptions('Dhaka')}</select>
          </div>
          <div class="field">
            <label class="label" for="${id}-dest">Destination district</label>
            <select class="select" id="${id}-dest" name="destination">${UI.districtOptions('Chattogram')}</select>
          </div>
          <div class="field">
            <label class="label" for="${id}-weight">Parcel weight</label>
            <div class="input-group">
              <input class="input" id="${id}-weight" name="weight" type="number" min="0.5" step="0.5" value="1" inputmode="decimal">
              <span class="addon">kg</span>
            </div>
            <input type="range" min="0.5" max="${cfg.maxWeight || 20}" step="0.5" value="1" data-weight-range aria-label="Parcel weight slider" style="width:100%;margin-top:8px;accent-color:var(--primary)">
          </div>
          <div class="field">
            <label class="label" for="${id}-cod">COD amount <span class="opt">(optional)</span></label>
            <div class="input-group prefix">
              <span class="addon">৳</span>
              <input class="input" id="${id}-cod" name="cod" type="number" min="0" step="50" value="1500" inputmode="numeric">
            </div>
          </div>
        </div>
        <div class="hint mt-4">${UI.icon('info')} Charges are calculated using live admin pricing rules. Remote districts may include a surcharge.</div>
      </form>
      <div class="calc-out">
        <div class="between mb-2">
          <span class="eyebrow" style="color:#8fb4ff">Estimated charge</span>
          <span class="badge badge-outline" style="color:#c6d8ef;border-color:rgba(255,255,255,.18)" data-route-label>Dhaka → Chattogram</span>
        </div>
        <div class="calc-line"><span>Base delivery charge</span><strong data-line="base">৳60</strong></div>
        <div class="calc-line"><span>Additional weight</span><strong data-line="weight">৳0</strong></div>
        <div class="calc-line"><span>Remote area surcharge</span><strong data-line="remote">৳0</strong></div>
        <div class="calc-line"><span>COD collection fee</span><strong data-line="cod">৳18</strong></div>
        <div class="calc-total">
          <div><div class="l">Total payable</div><div class="v" data-line="total">৳78</div><div class="calc-eta">${UI.icon('clock')} <span data-line="eta">2–4 business days</span></div></div>
          <span class="tiny" style="color:#7f96b0;text-align:right;max-width:13ch;line-height:1.4">Weight includes first ${cfg.includedKg} kg</span>
        </div>
        <a class="btn btn-primary btn-block mt-5" href="register.html" style="background:#fff;color:#0a1728;border-color:#fff">Start shipping ${UI.icon('arrow-right')}</a>
        <p class="tiny mt-2" style="color:#7f96b0;text-align:center">Final charge may vary by branch routing.</p>
      </div>
    </div>`;
  };

  P.bindCalculators = function (root = document) {
    root.querySelectorAll('[data-calculator]').forEach((calc) => {
      const form = calc.querySelector('form');
      const weight = form.querySelector('input[name="weight"]');
      const range = form.querySelector('[data-weight-range]');
      const cod = form.querySelector('input[name="cod"]');
      const origin = form.querySelector('select[name="origin"]');
      const dest = form.querySelector('select[name="destination"]');
      let type = 'standard';

      const update = () => {
        const q = ZR.pricing.quote({ type, weight: weight.value, cod: cod.value, destination: dest.value });
        const set = (key, val) => { const el = calc.querySelector(`[data-line="${key}"]`); if (el) el.textContent = val; };
        set('base', UI.money(q.base));
        set('weight', UI.money(q.weightCharge));
        set('remote', UI.money(q.remoteCharge));
        set('cod', UI.money(q.codCharge));
        set('total', UI.money(q.total));
        set('eta', q.eta);
        calc.querySelector('[data-route-label]').textContent = `${origin.value} → ${dest.value}`;
        if (range) {
          if (+range.value !== +weight.value) range.value = Math.min(+range.max, Math.max(+range.min, +weight.value || 0.5));
          const min = +range.min || 0;
          const max = +range.max || 1;
          const pct = Math.max(0, Math.min(100, ((+range.value - min) / (max - min)) * 100));
          range.style.setProperty('--range-progress', pct + '%');
        }
      };
      form.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
        form.querySelectorAll('[data-type]').forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        type = b.dataset.type;
        update();
      }));
      weight.addEventListener('input', update);
      if (range) range.addEventListener('input', () => { weight.value = range.value; update(); });
      cod.addEventListener('input', update);
      origin.addEventListener('change', update);
      dest.addEventListener('change', update);
      update();
    });
  };

  /* --------------------------------------------------------------- FAQ data */
  P.FAQS = [
    ['How fast is standard delivery?', 'Standard parcels move through our branch network in 2–4 business days. Dhaka and Chattogram metro areas are typically 1–2 days, while remote districts can take up to 5 days.'],
    ['How is the delivery charge calculated?', 'Charges combine a base rate by service type, a per-kilogram rate above the first kilogram, and an optional remote-area surcharge. COD collection adds a small percentage fee (minimum ৳10).'],
    ['When do merchants receive COD settlements?', 'COD is reconciled after delivery and paid out weekly, every Tuesday, to your bKash, Nagad or bank account. You can request an early withdrawal from your available balance at any time.'],
    ['What happens if a delivery fails?', 'The rider records a reason and we attempt delivery again the next working day. After two failed attempts a parcel enters the return flow, and you can request a re-dispatch from the merchant dashboard.'],
    ['Can I print shipping labels in bulk?', 'Yes. Merchant accounts can select any number of parcels and print thermal-ready labels or download an invoice. Bulk CSV import is supported for up to 500 rows per file.'],
    ['Is there an API for my store?', 'The prototype shows a simulated API credentials screen and webhook configuration. No real network requests are made — all integrations are demonstrated locally.'],
    ['How do I change my delivery address?', 'Before a parcel is out for delivery, contact support or update the parcel from the merchant dashboard. Once a rider is assigned, the destination branch must confirm the change.'],
    ['Do you deliver on Fridays and holidays?', 'Our hubs operate Saturday to Thursday. Friday deliveries are limited to same-day metro and express services in Dhaka and Chattogram.']
  ];

  /* -------------------------------------------------------------- coverage */
  P.bindCoverage = function () {
    const host = document.querySelector('[data-coverage-grid]');
    if (!host) return;
    const search = document.querySelector('[data-coverage-search]');
    const divisionBtns = document.querySelectorAll('[data-division]');
    const countEl = document.querySelector('[data-coverage-count]');
    let division = '';
    let query = '';

    const divisionBranches = (div) => ZR.store.state.branches.filter((b) => {
      const d = ZR.DISTRICT_MAP[b.district];
      return d && d.division === div;
    });

    function render() {
      const list = ZR.DISTRICTS.filter((d) => {
        if (division && d.division !== division) return false;
        if (query && !d.name.toLowerCase().includes(query) && !d.upazilas.some((u) => u.toLowerCase().includes(query))) return false;
        return true;
      });
      if (countEl) countEl.textContent = list.length;
      host.innerHTML = list.length ? list.map((d) => {
        const svc = ZR.REMOTE.includes(d.name) ? 'restricted' : 'full';
        const branch = ZR.store.state.branches.find((b) => b.district === d.name);
        return `<button class="card card-pad card-hover text-left" data-district="${UI.esc(d.name)}" style="text-align:left;display:flex;flex-direction:column;gap:6px">
          <div class="between gap-2">
            <strong style="font-size:var(--text-sm)">${UI.esc(d.name)}</strong>
            ${svc === 'full' ? `<span class="badge badge-success"><i class="dot"></i>Full</span>` : `<span class="badge badge-warn"><i class="dot"></i>Restricted</span>`}
          </div>
          <div class="tiny muted">${UI.esc(d.division)} Division · ${d.upazilas.length} upazilas</div>
          <div class="tiny faint" style="margin-top:auto;padding-top:6px;display:flex;gap:5px;align-items:center">${UI.icon(branch ? 'buildings' : 'map-trifold')} ${UI.esc(branch ? branch.name : 'Nearest hub routes daily')}</div>
        </button>`;
      }).join('') : UI.empty({ icon: 'map-trifold', title: 'No districts match', body: 'Try another district or clear the division filter.' });

      host.querySelectorAll('[data-district]').forEach((b) => b.addEventListener('click', () => P.districtSheet(b.dataset.district)));
    }

    search && search.addEventListener('input', UI.debounce(() => { query = search.value.trim().toLowerCase(); render(); }, 140));
    divisionBtns.forEach((b) => b.addEventListener('click', () => {
      divisionBtns.forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      division = b.dataset.division;
      render();
    }));
    render();

    // network map
    const map = document.querySelector('[data-network-map]');
    if (map) {
      const pos = { Dhaka: [196, 150], Chattogram: [284, 224], Sylhet: [306, 104], Rajshahi: [104, 118], Khulna: [116, 214], Rangpur: [138, 48], Barishal: [204, 246], Mymensingh: [238, 92] };
      const divs = Object.keys(pos);
      map.innerHTML = `
        <svg viewBox="0 0 420 300" class="map-bd" role="img" aria-label="Schematic Zeriour network map of Bangladesh divisions">
          ${divs.filter((d) => d !== 'Dhaka').map((d) => {
            const [x, y] = pos[d];
            return `<line x1="196" y1="150" x2="${x}" y2="${y}" stroke="var(--line-strong)" stroke-width="1.2" stroke-dasharray="4 4" opacity=".8"/>`;
          }).join('')}
          ${divs.map((d) => {
            const [x, y] = pos[d];
            const branches = divisionBranches(d).length;
            const isCore = d === 'Dhaka' || d === 'Chattogram';
            return `<g class="map-node" data-div="${d}" style="cursor:pointer" tabindex="0" role="button" aria-label="${d} division">
              <circle cx="${x}" cy="${y}" r="${isCore ? 30 : 26}" fill="transparent"/>
              <circle cx="${x}" cy="${y}" r="${isCore ? 15 : 11}" fill="${isCore ? 'var(--primary)' : 'var(--primary-50)'}" stroke="${isCore ? 'var(--primary)' : 'var(--primary-100)'}" stroke-width="1.5"/>
              <circle cx="${x}" cy="${y}" r="${isCore ? 5 : 4}" fill="${isCore ? '#fff' : 'var(--primary)'}"/>
              <text x="${x}" y="${y + (isCore ? 31 : 27)}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--ink)">${d}</text>
              <text x="${x}" y="${y + (isCore ? 42 : 38)}" text-anchor="middle" font-size="8" fill="var(--faint)">${branches} hub${branches === 1 ? '' : 's'}</text>
            </g>`;
          }).join('')}
          <text x="14" y="288" font-size="8" fill="var(--faint)">Schematic network view — not to scale</text>
        </svg>`;
      map.querySelectorAll('[data-div]').forEach((node) => {
        const go = () => {
          divisionBtns.forEach((x) => x.classList.toggle('is-active', x.dataset.division === node.dataset.div));
          division = node.dataset.div;
          render();
          const hostRect = host.getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + hostRect.top - 140, behavior: 'smooth' });
        };
        node.addEventListener('click', go);
        node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    }
  };

  P.districtSheet = function (name) {
    const d = ZR.DISTRICT_MAP[name];
    if (!d) return;
    const branch = ZR.store.state.branches.find((b) => b.district === name);
    const remote = ZR.REMOTE.includes(name);
    const quote = ZR.pricing.quote({ type: 'standard', weight: 1, cod: 0, destination: name });
    UI.drawer({
      title: name,
      subtitle: `${d.division} Division · ${d.upazilas.length} upazilas`,
      body: `
        <div class="detail-section">
          <div class="ds-head"><h4>${UI.icon('map-pin')} Service details</h4>${remote ? '<span class="badge badge-warn">Remote surcharge</span>' : '<span class="badge badge-success">Full coverage</span>'}</div>
          <div class="ds-body">
            <div class="kv-grid">
              <div class="kv"><div class="k">Delivery hub</div><div class="v">${UI.esc(branch ? branch.name : 'Via nearest regional hub')}</div></div>
              <div class="kv"><div class="k">Typical transit</div><div class="v">${remote ? '3–5 days' : ['Dhaka', 'Chattogram'].includes(name) ? '1–2 days' : '2–4 days'}</div></div>
              <div class="kv"><div class="k">Standard rate (1 kg)</div><div class="v">${UI.money(quote.deliveryCharge)}</div></div>
              <div class="kv"><div class="k">Remote surcharge</div><div class="v">${remote ? UI.money(ZR.pricing.settings().remoteSurcharge) : 'Not applicable'}</div></div>
            </div>
            ${branch ? `<div class="alert info mt-4">${UI.icon('buildings')}<div><strong>${UI.esc(branch.name)}</strong><br>${UI.esc(branch.address)} · ${UI.esc(branch.phone)}</div></div>` : ''}
          </div>
        </div>
        <div class="detail-section">
          <div class="ds-head"><h4>${UI.icon('map-trifold')} Upazilas & thanas</h4><span class="tiny muted">${d.upazilas.length} areas</span></div>
          <div class="ds-body"><div class="inline-list">${d.upazilas.map((u) => `<span class="badge badge-neutral">${UI.esc(u)}</span>`).join('')}</div></div>
        </div>
        <div class="alert mt-4">${UI.icon('info')}<div>Delivery estimates are based on the current demo configuration and may change with weather, holidays or hub load.</div></div>`,
      footer: `<a class="btn btn-primary grow" href="register.html">Ship to ${UI.esc(name)}</a><a class="btn" href="pricing.html">See all rates</a>`
    });
  };

  /* ------------------------------------------------------------------- boot */
  P.init = function () {
    P.mountChrome();
    P.bindTrackWidgets();
    P.bindAccordions();
    P.bindReveals();
    P.bindCounters();
    P.bindCalculators();
    P.bindCoverage();
    const calcHost = document.querySelector('[data-calculator-host]');
    if (calcHost) { calcHost.innerHTML = P.calculator(); P.bindCalculators(calcHost); }
  };
})(window.ZR);
