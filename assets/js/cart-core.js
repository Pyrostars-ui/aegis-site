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
    if (found) { found.qty += qty || 1; } else { cart.push({ event: ev.title, price: Number(ev.prix) || Number(ev.price) || 0, qty: qty || 1, tarif: ev.tarif || 'standard', tarifLabel: ev.tarifLabel || 'Standard', cadeau: ev.cadeau || null }); }
    return cart;
  }
  var PHONE_COUNTRIES = [
    { code: '352', name: 'Luxembourg', min: 6, max: 9, groups: [3, 3, 3] },
    { code: '351', name: 'Portugal', min: 9, max: 9, groups: [3, 3, 3] },
    { code: '377', name: 'Monaco', min: 8, max: 8, groups: [2, 2, 2, 2] },
    { code: '212', name: 'Maroc', min: 9, max: 9, groups: [3, 2, 2, 2] },
    { code: '213', name: 'Algérie', min: 9, max: 9, groups: [3, 2, 2, 2] },
    { code: '216', name: 'Tunisie', min: 8, max: 8, groups: [2, 3, 3] },
    { code: '33', name: 'France', min: 9, max: 9, groups: [1, 2, 2, 2, 2] },
    { code: '32', name: 'Belgique', min: 8, max: 9, groups: [3, 2, 2, 2] },
    { code: '41', name: 'Suisse', min: 9, max: 9, groups: [2, 3, 2, 2] },
    { code: '44', name: 'Royaume-Uni', min: 10, max: 10, groups: [4, 3, 3] },
    { code: '49', name: 'Allemagne', min: 10, max: 11, groups: [3, 4, 4] },
    { code: '34', name: 'Espagne', min: 9, max: 9, groups: [3, 3, 3] },
    { code: '39', name: 'Italie', min: 9, max: 10, groups: [3, 3, 4] },
    { code: '31', name: 'Pays-Bas', min: 9, max: 9, groups: [1, 4, 4] },
    { code: '1', name: 'États-Unis / Canada', min: 10, max: 10, groups: [3, 3, 4] }
  ];
  function groupDigits(str, groups) {
    var out = [], pos = 0;
    for (var i = 0; i < groups.length && pos < str.length; i++) {
      out.push(str.slice(pos, pos + groups[i]));
      pos += groups[i];
    }
    if (pos < str.length) out.push(str.slice(pos));
    return out.join(' ');
  }
  function matchPhoneCountry(digits) {
    for (var i = 0; i < PHONE_COUNTRIES.length; i++) {
      if (digits.indexOf(PHONE_COUNTRIES[i].code) === 0) return PHONE_COUNTRIES[i];
    }
    return null;
  }
  function formatPhoneInput(raw) {
    var s = String(raw || '').replace(/[^\d+]/g, '');
    if (!s) return '';
    var hasPlus = s.charAt(0) === '+';
    var digits = s.replace(/\+/g, '');
    if (!hasPlus && digits.charAt(0) === '0') {
      digits = digits.slice(0, 10);
      return groupDigits(digits, [2, 2, 2, 2, 2]);
    }
    var country = matchPhoneCountry(digits);
    if (country) {
      var rest = digits.slice(country.code.length, country.code.length + country.max);
      return '+' + country.code + (rest ? ' ' + groupDigits(rest, country.groups) : '');
    }
    digits = digits.slice(0, 15);
    return '+' + digits;
  }
  function validatePhone(raw) {
    var trimmed = String(raw || '').trim();
    if (!trimmed) return { ok: true, formatted: '' };
    if (/[^\d+\s]/.test(trimmed)) return { ok: false, error: 'Caractères invalides dans le numéro de téléphone.' };
    if ((trimmed.match(/\+/g) || []).length > 1 || (trimmed.indexOf('+') > 0)) {
      return { ok: false, error: 'Le signe + doit uniquement figurer au début de l’indicatif.' };
    }
    var digits = trimmed.replace(/\D/g, '');
    if (trimmed.charAt(0) !== '+' && digits.charAt(0) === '0') {
      if (!/^0[1-9]\d{8}$/.test(digits)) {
        return { ok: false, error: 'Numéro français invalide (10 chiffres attendus, ex. 06 12 34 56 78).' };
      }
      return { ok: true, formatted: formatPhoneInput(digits) };
    }
    if (trimmed.charAt(0) !== '+') {
      return { ok: false, error: 'Utilisez le format international (+indicatif, ex. +33 6 12 34 56 78).' };
    }
    var country = matchPhoneCountry(digits);
    if (country) {
      var n = digits.length - country.code.length;
      if (n < country.min || n > country.max) {
        var expected = country.min === country.max ? country.min : country.min + ' à ' + country.max;
        return { ok: false, error: 'Indicatif +' + country.code + ' (' + country.name + ') : ' + expected + ' chiffres attendus après l’indicatif.' };
      }
      return { ok: true, formatted: formatPhoneInput(trimmed) };
    }
    if (digits.length < 8 || digits.length > 15) {
      return { ok: false, error: 'Numéro international invalide (8 à 15 chiffres au total).' };
    }
    return { ok: true, formatted: '+' + digits };
  }
  var api = { TVA: TVA, PROMOS: PROMOS, computeTotals: computeTotals, applyPromo: applyPromo, makeTrackNumber: makeTrackNumber, addItem: addItem, formatPhoneInput: formatPhoneInput, validatePhone: validatePhone };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.CartCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
