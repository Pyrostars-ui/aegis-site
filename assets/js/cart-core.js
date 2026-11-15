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
  function sanitizeNameInput(raw) {
    return String(raw || '').replace(/[^\p{L}\s'’-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 50);
  }
  function validateName(raw, label) {
    var trimmed = String(raw || '').trim().replace(/\s{2,}/g, ' ');
    var field = label || 'Ce champ';
    if (/[^\p{L}\s'’-]/u.test(trimmed)) {
      return { ok: false, error: field + ' : caractères spéciaux et chiffres non autorisés.' };
    }
    var letters = (trimmed.match(/\p{L}/gu) || []).length;
    if (trimmed.length < 2 || letters < 2) {
      return { ok: false, error: field + ' doit contenir au moins 2 lettres.' };
    }
    if (trimmed.length > 50) {
      return { ok: false, error: field + ' ne doit pas dépasser 50 caractères.' };
    }
    return { ok: true, formatted: trimmed };
  }
  function validateAddress(raw) {
    var trimmed = String(raw || '').trim().replace(/\s{2,}/g, ' ');
    if (!trimmed) return { ok: true, formatted: '' };
    if (/[<>{}[\]$]/.test(trimmed)) {
      return { ok: false, error: 'Adresse postale : caractères spéciaux non autorisés.' };
    }
    if (trimmed.length < 10) {
      return { ok: false, error: 'Adresse postale trop courte (ex. 12 Rue de Rivoli, 75001 Paris).' };
    }
    var hasPostalCode = /\b\d{4,5}\b/.test(trimmed);
    var words = trimmed.split(/[\s,]+/).filter(function (w) { return /\p{L}{2,}/u.test(w); });
    if (!hasPostalCode || words.length < 2) {
      return { ok: false, error: 'Format d’adresse invalide : indiquez rue, code postal (4-5 chiffres) et ville (ex. 12 Rue de Rivoli, 75001 Paris).' };
    }
    return { ok: true, formatted: trimmed };
  }
  var BLOCKED_EMAIL_DOMAINS = {
    'localhost': 1, 'local': 1, 'invalid': 1, 'test': 1, 'test.com': 1, 'example.com': 1, 'example.org': 1,
    'example.net': 1, 'fake.com': 1, 'domain.com': 1, 'none.com': 1, 'null.com': 1, 'asdf.com': 1,
    'mailinator.com': 1, 'yopmail.com': 1, 'yopmail.fr': 1, 'tempmail.com': 1, 'temp-mail.org': 1,
    'guerrillamail.com': 1, '10minutemail.com': 1, 'throwawaymail.com': 1, 'trashmail.com': 1,
    'sharklasers.com': 1, 'getnada.com': 1, 'dispostable.com': 1, 'maildrop.cc': 1, 'fakeinbox.com': 1
  };
  function validateEmail(raw) {
    var em = String(raw || '').trim().toLowerCase();
    if (!em || em.indexOf('@') === -1) {
      return { ok: false, error: 'Adresse e-mail invalide (@ requis).' };
    }
    var parts = em.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1] || /\s/.test(em)) {
      return { ok: false, error: 'Format d’adresse e-mail invalide.' };
    }
    var local = parts[0], domain = parts[1];
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) || local.charAt(0) === '.' || local.slice(-1) === '.' || local.indexOf('..') !== -1) {
      return { ok: false, error: 'Identifiant e-mail invalide avant le @.' };
    }
    var labels = domain.split('.');
    if (labels.length < 2 || labels.some(function (l) { return !l || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l); })) {
      return { ok: false, error: 'Domaine e-mail invalide (ex. nom@domaine.fr).' };
    }
    var tld = labels[labels.length - 1];
    if (!/^[a-z]{2,24}$/.test(tld)) {
      return { ok: false, error: 'Extension de domaine invalide (ex. .fr, .com).' };
    }
    if (BLOCKED_EMAIL_DOMAINS[domain] || BLOCKED_EMAIL_DOMAINS[tld]) {
      return { ok: false, error: 'Domaine e-mail non autorisé (' + domain + '). Utilisez une adresse valide.' };
    }
    return { ok: true, formatted: em };
  }
  var api = { TVA: TVA, PROMOS: PROMOS, computeTotals: computeTotals, applyPromo: applyPromo, makeTrackNumber: makeTrackNumber, addItem: addItem, formatPhoneInput: formatPhoneInput, validatePhone: validatePhone, sanitizeNameInput: sanitizeNameInput, validateName: validateName, validateAddress: validateAddress, validateEmail: validateEmail };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.CartCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
