/* Logique panier pure — testable en Node */
(function (root) {
  'use strict';
  var TVA = 0.20;
  var PROMOS = { AEGIS10: 0.10, SUNWAVE: 0.05 };
  function computeTotals(items, promo) {
    var sub = items.reduce(function (s, i) { return s + (i.price || 0) * (i.qty || 1); }, 0);
    var rem = promo && PROMOS[promo] ? sub * PROMOS[promo] : 0;
    var ht = sub - rem;
    var tva = ht * TVA;
    return { sousTotal: +sub.toFixed(2), remise: +rem.toFixed(2), ht: +ht.toFixed(2), tva: +tva.toFixed(2), ttc: +(ht + tva).toFixed(2) };
  }
  function applyPromo(code) { return PROMOS[code] ? code : null; }
  function makeTrackNumber() {
    var n = Math.floor(1000 + Math.random() * 9000);
    return 'TRK-2026-FR-' + n;
  }
  function addItem(cart, ev, qty) {
    var found = cart.find(function (i) { return i.event === ev.title; });
    if (found) { found.qty += qty || 1; } else { cart.push({ event: ev.title, price: ev.price, qty: qty || 1 }); }
    return cart;
  }
  var api = { TVA: TVA, PROMOS: PROMOS, computeTotals: computeTotals, applyPromo: applyPromo, makeTrackNumber: makeTrackNumber, addItem: addItem };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.CartCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
