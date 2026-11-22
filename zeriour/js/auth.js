/* ==========================================================================
   Zeriour — simulated authentication
   Demo only. Sessions live in localStorage; credentials are in the seed data.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';

  const KEY = 'zeriour:session:v1';

  const ROLES = {
    merchant: {
      label: 'Merchant', icon: 'ph-storefront', file: 'merchant.html',
      demoEmail: 'merchant@demo.com', blurb: 'Ship, track and settle COD for your store.',
      home: 'Overview', accent: 'blue'
    },
    admin: {
      label: 'Super Admin', icon: 'ph-shield-check', file: 'admin.html',
      demoEmail: 'admin@demo.com', blurb: 'Run the network, merchants, pricing and payouts.',
      home: 'Command center', accent: 'navy'
    },
    branch: {
      label: 'Branch Staff', icon: 'ph-warehouse', file: 'branch.html',
      demoEmail: 'branch@demo.com', blurb: 'Scan, sort and dispatch parcels at the hub.',
      home: 'Branch desk', accent: 'sky'
    },
    rider: {
      label: 'Rider', icon: 'ph-moped', file: 'rider.html',
      demoEmail: 'rider@demo.com', blurb: 'Deliver parcels, collect COD, close tasks.',
      home: 'My route', accent: 'violet'
    }
  };

  const A = {};
  ZR.auth = A;
  A.ROLES = ROLES;
  A.roleMeta = (role) => ROLES[role] || ROLES.merchant;

  A.session = function () {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.userId || !s.expires || s.expires < Date.now()) return null;
      return s;
    } catch (e) { return null; }
  };

  A.currentUser = function () {
    const s = A.session();
    if (!s || !ZR.store.state) return null;
    return ZR.store.state.users.find((u) => u.id === s.userId) || null;
  };

  A.isLoggedIn = () => !!(A.session() && A.currentUser());

  A.homeFor = (role) => (ROLES[role] ? ROLES[role].file : 'login.html');

  A.login = function (email, password) {
    const user = ZR.store.state.users.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
    );
    if (!user) return { ok: false, error: 'No demo account found with that email address.' };
    if (user.password !== String(password)) return { ok: false, error: 'Incorrect password. Demo password is 123456.' };
    const session = {
      userId: user.id, role: user.role, email: user.email,
      startedAt: new Date().toISOString(), expires: Date.now() + 12 * 60 * 60 * 1000
    };
    try { window.localStorage.setItem(KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
    ZR.store.log(user.name, user.role, 'Signed in to the demo workspace', user.email, 'auth');
    ZR.store.save('auth:login');
    return { ok: true, user, redirect: A.homeFor(user.role) };
  };

  A.loginAs = function (role) {
    const meta = ROLES[role];
    if (!meta) return { ok: false, error: 'Unknown demo role.' };
    return A.login(meta.demoEmail, '123456');
  };

  A.logout = function () {
    const user = A.currentUser();
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    if (user && ZR.store.state) {
      ZR.store.log(user.name, user.role, 'Signed out', '', 'auth');
      ZR.store.save('auth:logout');
    }
  };

  /**
   * Guard a dashboard page. Redirects to the demo login when the session is
   * missing or holds a different role.
   */
  A.require = function (role) {
    const user = A.currentUser();
    if (!user) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.hash);
      location.replace('login.html?next=' + next);
      return null;
    }
    if (role && user.role !== role) {
      location.replace(A.homeFor(user.role));
      return null;
    }
    return user;
  };

  A.initials = (name) => String(name || '')
    .replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase();
})(window.ZR);
