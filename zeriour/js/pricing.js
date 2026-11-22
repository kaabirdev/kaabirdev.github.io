/* ==========================================================================
   Zeriour — delivery pricing engine
   Shared by the public calculator, the merchant parcel form and admin config.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';

  const P = {};
  ZR.pricing = P;

  P.settings = () => (ZR.store && ZR.store.state ? ZR.store.state.settings.pricing : ZR.seedData().settings.pricing);
  P.types = () => P.settings().types;
  P.typeOf = (id) => P.types().find((t) => t.id === id) || P.types()[0];
  P.isRemote = (district) => (ZR.REMOTE || []).includes(district);
  P.branchFor = (district) => (ZR.store ? ZR.store.branchForDistrict(district) : null);

  /**
   * Quote a delivery using the live admin pricing configuration.
   * @returns {{deliveryCharge:number, base:number, weightCharge:number, remoteCharge:number,
   *            codCharge:number, total:number, eta:string, type:{}, includedKg:number, extraKg:number}}
   */
  P.quote = function ({ type = 'standard', weight = 1, cod = 0, destination = 'Dhaka' } = {}) {
    const cfg = P.settings();
    const t = P.typeOf(type);
    const w = Math.max(0.1, Number(weight) || 0.1);
    const base = Math.round(cfg.base * t.multiplier);
    const extraKg = Math.max(0, Math.ceil(w) - cfg.includedKg);
    const weightCharge = extraKg * cfg.perKg;
    const remoteCharge = P.isRemote(destination) ? cfg.remoteSurcharge : 0;
    const codCharge = Number(cod) > 0 ? Math.max(Math.round(Number(cod) * cfg.codRate / 100), cfg.codMin) : 0;
    const deliveryCharge = base + weightCharge + remoteCharge;
    return {
      type: t,
      typeId: t.id,
      base,
      weightCharge,
      remoteCharge,
      deliveryCharge,
      codCharge,
      total: deliveryCharge + codCharge,
      eta: t.eta,
      includedKg: cfg.includedKg,
      extraKg,
      remote: P.isRemote(destination)
    };
  };

  /* Config used by the public pricing table */
  P.matrix = function () {
    const baseCfg = P.settings();
    return P.types().map((t) => ({
      ...t,
      base: Math.round(baseCfg.base * t.multiplier),
      perKg: baseCfg.perKg,
      sample: {
        halfKg: Math.round(baseCfg.base * t.multiplier),
        oneKg: Math.round(baseCfg.base * t.multiplier),
        twoKg: Math.round(baseCfg.base * t.multiplier) + baseCfg.perKg,
        fiveKg: Math.round(baseCfg.base * t.multiplier) + (4 * baseCfg.perKg)
      }
    }));
  };
})(window.ZR);
