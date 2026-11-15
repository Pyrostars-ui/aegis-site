(function () {
  'use strict';
  /* ===== Auth token : UNIQUEMENT cookie ou query param (jamais en dur dans le HTML) ===== */
  var qs = new URLSearchParams(location.search);
  if (qs.get('aegis_token')) {
    document.cookie = 'aegis_token=' + encodeURIComponent(qs.get('aegis_token')) + '; path=/; SameSite=Lax; Secure';
    qs.delete('aegis_token');
    var clean = location.pathname + (qs.toString() ? '?' + qs.toString() : '') + location.hash;
    history.replaceState({}, '', clean);
  }
  var TOKEN = decodeURIComponent((document.cookie.match(/(?:^|;\s*)aegis_token=([^;]+)/) || [])[1] || '');
  /* Échappement HTML systématique pour tout contenu injecté via innerHTML (anti-XSS) */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function aegisPost(path, payload) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }

  /* ===== Nav mobile ===== */
  var navToggle = document.getElementById('nav-toggle');
  var navMenu = document.getElementById('nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var open = navMenu.hidden;
      navMenu.hidden = !open;
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ===== Cartes événements (index + evenements) ===== */
  var grid = document.getElementById('cards-grid');
  function renderCards(list, container) {
    if (!container) return;
    container.innerHTML = '';
    list.forEach(function (ev) {
      var a = document.createElement('a');
      a.className = 'card card-event';
      a.href = 'evenement.html?id=' + encodeURIComponent(ev.id);
      a.setAttribute('data-category', ev.category);
      a.innerHTML =
        '<img class="card-img" src="' + esc(ev.img) + '" alt="">' +
        '<div class="card-body">' +
        '<span class="card-tag">' + esc(ev.catLabel) + '</span>' +
        '<h3 class="card-title-link">' + esc(ev.title) + '</h3>' +
        '<p class="card-meta">' + esc(ev.date) + ' · ' + esc(ev.lieu) + '</p>' +
        '<p class="card-foot"><span class="card-price">' + esc(ev.prix) + ' €</span>' +
        '<span class="card-stock' + (ev.stock < 20 ? ' low' : '') + '">' + (ev.stock < 20 ? 'Stock faible' : esc(ev.stock) + ' places') + '</span></p></div>';
      var cardImg = a.querySelector('.card-img');
      if (cardImg) cardImg.addEventListener('error', function () { this.src = 'assets/img/hero-concert.jpg'; }, { once: true });
      container.appendChild(a);
    });
  }
  /* ===== Barre de recherche dans la navigation ===== */
  var navSearchInput = null;
  (function initNavSearch() {
    var navMain = document.querySelector('.nav-main');
    var brand = navMain ? navMain.querySelector('.brand') : null;
    if (!navMain || !brand || document.getElementById('nav-search-form')) return;
    var form = document.createElement('form');
    form.id = 'nav-search-form';
    form.className = 'nav-search';
    form.setAttribute('role', 'search');
    form.innerHTML =
      '<label class="sr-only" for="nav-search-input">Rechercher un événement</label>' +
      '<input type="search" id="nav-search-input" placeholder="Rechercher un événement…">' +
      '<button type="submit" aria-label="Rechercher"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>';
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) navMain.insertBefore(form, themeBtn);
    else navMain.appendChild(form);
    navSearchInput = document.getElementById('nav-search-input');
    var initialQ = new URLSearchParams(location.search).get('q');
    if (initialQ) navSearchInput.value = initialQ;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var qVal = navSearchInput.value.trim();
      if (!document.getElementById('cards-grid')) {
        location.href = qVal ? ('evenements.html?q=' + encodeURIComponent(qVal)) : 'evenements.html';
      } else if (typeof refreshFilters === 'function') {
        refreshFilters();
        var gridEl = document.getElementById('cards-grid');
        if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  })();

  window.AEGIS_EVENTS = window.AEGIS_EVENTS || [];
  var refreshFilters = null;
  if (grid) {
    renderCards(window.AEGIS_EVENTS, grid);
    /* recherche + filtres */
    var search = document.getElementById('search-input');
    var chips = document.querySelectorAll('.chip[data-filter]');
    var noRes = document.getElementById('no-result');
    var activeFilter = 'all';
    var urlQ = new URLSearchParams(location.search).get('q');
    if (urlQ && search && !search.value) search.value = urlQ;
    function applyFilters() {
      var q = ((navSearchInput && navSearchInput.value) || (search && search.value) || '').trim().toLowerCase();
      var list = window.AEGIS_EVENTS.filter(function (ev) {
        var okCat = activeFilter === 'all' || ev.category === activeFilter;
        var okQ = !q || (ev.title + ' ' + ev.lieu + ' ' + ev.catLabel).toLowerCase().indexOf(q) !== -1;
        return okCat && okQ;
      });
      renderCards(list, grid);
      if (noRes) noRes.hidden = list.length > 0;
    }
    refreshFilters = applyFilters;
    if (search) search.addEventListener('input', function () {
      if (navSearchInput) navSearchInput.value = search.value;
      applyFilters();
    });
    if (navSearchInput) navSearchInput.addEventListener('input', function () {
      if (search) search.value = navSearchInput.value;
      applyFilters();
    });
    if (urlQ) applyFilters();
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.remove('is-active'); });
        c.classList.add('is-active');
        activeFilter = c.getAttribute('data-filter');
        applyFilters();
      });
    });
  }

  /* ===== Page détail événement ===== */
  var detail = document.getElementById('event-detail');
  function renderDetail() {
    if (!detail || !window.AEGIS_EVENTS) return;
    var id = new URLSearchParams(location.search).get('id');
    var ev = window.AEGIS_EVENTS.find(function (e) { return e.id === id; }) || window.AEGIS_EVENTS[0];
    if (!ev) return;
    document.title = ev.title + ' — BilletPulse';
    detail.innerHTML =
      '<section class="event-hero"><img src="' + esc(ev.img) + '" alt="" class="event-hero-img">' +
      '<div class="event-hero-body"><span class="card-tag">' + esc(ev.catLabel) + '</span>' +
      '<h1>' + esc(ev.title) + '</h1><p class="card-meta">' + esc(ev.date) + ' · ' + esc(ev.lieu) + '</p></div></section>' +
      '<section class="card"><div class="card-body"><h2>Programme</h2><p>' + esc(ev.desc) + '</p></div></section>' +
      '<section class="card"><div class="card-body"><h2>Tarifs</h2><div class="tarifs" role="radiogroup" aria-label="Choix du tarif">' +
      (ev.tarifs || [{type:'standard',label:'Standard',prix:ev.prix}]).map(function (t, i) {
        return '<label class="tarif-option"><input type="radio" name="tarif" value="' + esc(t.type) + '" data-prix="' + Number(t.prix) + '"' + (i === 0 ? ' checked' : '') + '>' +
          '<span class="tarif-label">' + esc(t.label) + '</span><span class="tarif-prix">' + Number(t.prix) + ' €</span></label>';
      }).join('') +
      '<p class="tarif-note">TVA 20 % incluse dans le total du panier.</p></div></section>' +
      '<section class="buy-box card"><div class="card-body">' +
      '<p class="card-stock' + (ev.stock < 20 ? ' low' : '') + '">' + (ev.stock < 20 ? '⚠ Stock faible : ' + esc(ev.stock) + ' places' : esc(ev.stock) + ' places disponibles') + '</p>' +
      '<button class="btn btn-primary btn-lg" id="ev-buy">Acheter — ' + esc(ev.prix) + ' €</button>' +
      '</div></section>';
    function tarifChoisi() {
      var r = document.querySelector('input[name="tarif"]:checked');
      return r ? { type: r.value, prix: Number(r.dataset.prix) } : { type: 'standard', prix: ev.prix };
    }
    var tarifLabel = { standard: 'Standard', premium: 'Premium', vip: 'VIP' };
    var buyBtn = document.getElementById('ev-buy');
    if (buyBtn) {
      var radios = document.querySelectorAll('input[name="tarif"]');
      radios.forEach(function (r) {
        r.addEventListener('change', function () {
          var t = tarifChoisi();
          buyBtn.textContent = 'Acheter — ' + t.prix + ' € (' + (tarifLabel[t.type] || t.type) + ')';
        });
      });
      buyBtn.addEventListener('click', function () {
        var t = tarifChoisi();
        var cart = getCart();
        var evTarif = Object.assign({}, ev, { prix: t.prix, tarif: t.type, tarifLabel: tarifLabel[t.type] || t.type });
        window.CartCore.addItem(cart, evTarif, 1);
        saveCart(cart);
        updateBadge();
        renderCart();
        openCart({ skipSync: true });
      });
    }
  }
  if (detail && window.AEGIS_EVENTS.length) renderDetail();

  /* ===== Catalogue dynamique Cloud Firestore ===== */
  var FS_BASE = 'https://firestore.googleapis.com/v1/projects/com-example-myapplicatio-83790/databases/(default)/documents';
  function parseFsVal(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseFsVal);
    if ('mapValue' in v) {
      var o = {};
      var mf = v.mapValue.fields || {};
      Object.keys(mf).forEach(function (k) { o[k] = parseFsVal(mf[k]); });
      return o;
    }
    return null;
  }
  function toFsVal(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsVal) } };
    if (typeof v === 'object') {
      var fields = {};
      Object.keys(v).forEach(function (k) { fields[k] = toFsVal(v[k]); });
      return { mapValue: { fields: fields } };
    }
    return { stringValue: String(v) };
  }
  if ((grid || detail) && typeof fetch === 'function') {
    fetch(FS_BASE + '/evenements?pageSize=50')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.documents) || !data.documents.length) return;
        var remote = data.documents.map(function (doc) {
          var f = doc.fields || {};
          var obj = { id: doc.name.split('/').pop() };
          Object.keys(f).forEach(function (k) { obj[k] = parseFsVal(f[k]); });
          return obj;
        });
        window.AEGIS_EVENTS = remote;
        if (refreshFilters) refreshFilters();
        if (detail) renderDetail();
      })
      .catch(function () {
        if (grid && !window.AEGIS_EVENTS.length) {
          var p = document.createElement('p');
          p.textContent = 'Impossible de charger les événements depuis Firestore.';
          grid.replaceChildren(p);
        }
      });
  }

  /* ===== Firebase Auth + Panier v2 (synchronisé Cloud Firestore) ===== */
  var _fbKeyPromise = null;
  function getFirebaseApiKey() {
    if (!_fbKeyPromise) {
      _fbKeyPromise = fetch('/__/firebase/init.json')
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (cfg) { return cfg.apiKey || ''; })
        .catch(function () { return ''; });
    }
    return _fbKeyPromise;
  }
  var AUTH_KEY = 'aegis-auth';
  var CART_KEY = 'aegis-cart';
  var TICKETS_KEY = 'aegis-tickets-list';
  var PKEY = 'aegis-profile';
  var promoCode = null;
  function getAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } }
  function saveAuth(a) { if (a) localStorage.setItem(AUTH_KEY, JSON.stringify(a)); else localStorage.removeItem(AUTH_KEY); }
  function ensureFreshToken() {
    var a = getAuth();
    if (!a || !a.uid || !a.idToken) return Promise.resolve(null);
    if (a.expiresAt && Date.now() < a.expiresAt - 60000) return Promise.resolve(a);
    if (!a.refreshToken || typeof fetch !== 'function') return Promise.resolve(a);
    return getFirebaseApiKey().then(function (apiKey) {
      if (!apiKey) return a;
      return fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(a.refreshToken)
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.id_token) { saveAuth(null); return null; }
          var updated = {
            uid: d.user_id || a.uid,
            email: a.email,
            idToken: d.id_token,
            refreshToken: d.refresh_token || a.refreshToken,
            expiresAt: Date.now() + (Number(d.expires_in) || 3600) * 1000
          };
          saveAuth(updated);
          return updated;
        })
        .catch(function () { return a; });
    });
  }
  function fsPatchUserDoc(collection, uid, fields, token) {
    return fetch(FS_BASE + '/' + collection + '/' + encodeURIComponent(uid), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ fields: fields })
    });
  }
  function fsGetUserDoc(collection, uid, token) {
    return fetch(FS_BASE + '/' + collection + '/' + encodeURIComponent(uid), {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (r) { return r.ok ? r.json() : null; });
  }
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function getTicketsLocal() { try { return JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]'); } catch (e) { return []; } }
  function pushCartToFs(c) {
    if (typeof fetch !== 'function') return Promise.resolve();
    return ensureFreshToken().then(function (a) {
      if (!a) return;
      return fsPatchUserDoc('paniers', a.uid, {
        items: toFsVal(Array.isArray(c) ? c : []),
        promoCode: toFsVal(promoCode || ''),
        updatedAt: toFsVal(new Date().toISOString())
      }, a.idToken);
    }).catch(function () {});
  }
  var lastCartSaveTs = 0;
  function saveCart(c) {
    lastCartSaveTs = Date.now();
    localStorage.setItem(CART_KEY, JSON.stringify(c));
    pushCartToFs(c);
  }
  function pushTicketsToFs(list) {
    if (typeof fetch !== 'function') return Promise.resolve();
    return ensureFreshToken().then(function (a) {
      if (!a) return;
      return fsPatchUserDoc('billets', a.uid, {
        items: toFsVal(Array.isArray(list) ? list : []),
        updatedAt: toFsVal(new Date().toISOString())
      }, a.idToken);
    }).catch(function () {});
  }
  function syncCartFromFs() {
    if (typeof fetch !== 'function' || (Date.now() - lastCartSaveTs < 2500)) return Promise.resolve();
    return ensureFreshToken().then(function (a) {
      if (!a || (Date.now() - lastCartSaveTs < 2500)) return;
      return fsGetUserDoc('paniers', a.uid, a.idToken).then(function (doc) {
        if (!doc || !doc.fields || (Date.now() - lastCartSaveTs < 2500)) return;
        var items = parseFsVal(doc.fields.items);
        var remotePromo = parseFsVal(doc.fields.promoCode);
        if (Array.isArray(items)) localStorage.setItem(CART_KEY, JSON.stringify(items));
        promoCode = remotePromo ? window.CartCore.applyPromo(String(remotePromo)) : null;
        updateBadge();
        renderCart();
      });
    }).catch(function () {});
  }
  function syncTicketsFromFs(onDone) {
    if (typeof fetch !== 'function') return Promise.resolve(getTicketsLocal());
    return ensureFreshToken().then(function (a) {
      if (!a) return getTicketsLocal();
      return fsGetUserDoc('billets', a.uid, a.idToken).then(function (doc) {
        if (doc && doc.fields) {
          var items = parseFsVal(doc.fields.items);
          if (Array.isArray(items)) {
            localStorage.setItem(TICKETS_KEY, JSON.stringify(items));
            if (typeof onDone === 'function') onDone(items);
            return items;
          }
        }
        return getTicketsLocal();
      });
    }).catch(function () { return getTicketsLocal(); });
  }
  var badge = document.getElementById('cart-badge');
  var navCartBadge = null;
  (function initNavCart() {
    var navMain = document.querySelector('.nav-main');
    var navMenu = document.getElementById('nav-menu');
    if (!navMain || document.getElementById('nav-cart-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'nav-cart-btn';
    btn.className = 'nav-cart';
    btn.setAttribute('aria-label', 'Ouvrir le panier');
    btn.title = 'Voir votre panier et valider vos billets';
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' +
      '<span>Panier</span>' +
      '<span class="nav-cart-badge" id="nav-cart-badge" hidden>0</span>';
    if (navMenu && navMenu.parentNode === navMain) {
      navMenu.insertAdjacentElement('afterend', btn);
    } else {
      var searchForm = document.getElementById('nav-search-form');
      if (searchForm) navMain.insertBefore(btn, searchForm);
      else navMain.appendChild(btn);
    }
    navCartBadge = document.getElementById('nav-cart-badge');
    btn.addEventListener('click', function () {
      if (document.getElementById('cart-panel')) openCart();
      else location.href = 'evenements.html?openCart=1';
    });
  })();
  function updateBadge() {
    var n = getCart().reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    if (badge) { badge.textContent = n; badge.hidden = n === 0; }
    if (navCartBadge) { navCartBadge.textContent = n; navCartBadge.hidden = n === 0; }
  }
  var overlay = document.getElementById('cart-overlay');
  var panel = document.getElementById('cart-panel');
  var GIFT_KEY = 'aegis-cart-gift';
  var validateGiftForm = null;
  function getGiftState() { try { return JSON.parse(localStorage.getItem(GIFT_KEY)) || { active: false, nom: '', email: '', message: '' }; } catch (e) { return { active: false, nom: '', email: '', message: '' }; } }
  function saveGiftState(g) { localStorage.setItem(GIFT_KEY, JSON.stringify(g)); }
  if (panel && !document.getElementById('cart-cadeau-box')) {
    var cadeauBox = document.createElement('div');
    cadeauBox.id = 'cart-cadeau-box';
    cadeauBox.className = 'cadeau-box';
    cadeauBox.innerHTML =
      '<label class="cadeau-option"><input type="checkbox" id="cadeau-check">' +
      '<span class="cadeau-label">🎁 Offrir à un ami ou un proche</span></label>' +
      '<div class="cadeau-fields" id="cadeau-fields" hidden>' +
      '<label for="cadeau-nom">Prénom et nom du bénéficiaire</label>' +
      '<input type="text" id="cadeau-nom" minlength="2" maxlength="50" autocomplete="off" placeholder="Ex. Camille Dupont">' +
      '<label for="cadeau-email">E-mail du bénéficiaire</label>' +
      '<input type="email" id="cadeau-email" autocomplete="off" placeholder="camille@exemple.fr">' +
      '<label for="cadeau-msg">Message personnalisé (facultatif)</label>' +
      '<textarea id="cadeau-msg" rows="2" maxlength="200" placeholder="Joyeux anniversaire !"></textarea>' +
      '<button type="button" class="btn btn-outline btn-sm" id="cadeau-validate">Valider le cadeau</button>' +
      '<p class="form-msg" id="cadeau-feedback" role="status" aria-live="polite"></p>' +
      '</div>';
    var totalsRef = document.getElementById('cart-totals');
    if (totalsRef && totalsRef.parentNode === panel) panel.insertBefore(cadeauBox, totalsRef);
    else panel.appendChild(cadeauBox);

    var cCheck = document.getElementById('cadeau-check');
    var cFields = document.getElementById('cadeau-fields');
    var cNom = document.getElementById('cadeau-nom');
    var cEmail = document.getElementById('cadeau-email');
    var cMsg = document.getElementById('cadeau-msg');
    var cValBtn = document.getElementById('cadeau-validate');
    var cFeedback = document.getElementById('cadeau-feedback');
    var initGift = getGiftState();
    cCheck.checked = !!initGift.active;
    cFields.hidden = !initGift.active;
    cNom.value = initGift.nom || '';
    cEmail.value = initGift.email || '';
    cMsg.value = initGift.message || '';
    function persistGift() {
      if (window.CartCore && window.CartCore.sanitizeNameInput) {
        var cleanNom = window.CartCore.sanitizeNameInput(cNom.value);
        if (cNom.value !== cleanNom) cNom.value = cleanNom;
      }
      var cleanEmail = cEmail.value.replace(/\s+/g, '').toLowerCase();
      if (cEmail.value !== cleanEmail) cEmail.value = cleanEmail;
      var cleanMsg = cMsg.value.replace(/[<>{}[\]$]/g, '');
      if (cMsg.value !== cleanMsg) cMsg.value = cleanMsg;
      cFields.hidden = !cCheck.checked;
      saveGiftState({ active: cCheck.checked, nom: cNom.value.trim(), email: cEmail.value.trim(), message: cMsg.value.trim() });
    }
    cCheck.addEventListener('change', function () {
      if (!cCheck.checked && cFeedback) { cFeedback.textContent = ''; cFeedback.className = 'form-msg'; }
      persistGift();
    });
    [cNom, cEmail, cMsg].forEach(function (el) { el.addEventListener('input', persistGift); });
    validateGiftForm = function (showSuccess) {
      if (!cCheck.checked) return true;
      if (window.CartCore && window.CartCore.validateName) {
        var vn = window.CartCore.validateName(cNom.value, 'Nom du bénéficiaire');
        if (!vn.ok) { cFeedback.textContent = vn.error; cFeedback.className = 'form-msg ko'; return false; }
      } else if (cNom.value.trim().length < 2) {
        cFeedback.textContent = 'Nom du bénéficiaire requis (2 caractères min).'; cFeedback.className = 'form-msg ko'; return false;
      }
      var emCheck = window.CartCore && window.CartCore.validateEmail ? window.CartCore.validateEmail(cEmail.value) : { ok: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cEmail.value.trim()) };
      if (!emCheck.ok) {
        cFeedback.textContent = emCheck.error || 'E-mail du bénéficiaire invalide.'; cFeedback.className = 'form-msg ko'; return false;
      }
      if (/[<>{}[\]$]/.test(cMsg.value)) {
        cFeedback.textContent = 'Message cadeau : caractères spéciaux non autorisés.'; cFeedback.className = 'form-msg ko'; return false;
      }
      if (showSuccess) {
        cFeedback.textContent = 'Informations cadeau validées ✓'; cFeedback.className = 'form-msg ok';
      } else {
        cFeedback.textContent = ''; cFeedback.className = 'form-msg';
      }
      return true;
    }
    if (cValBtn) cValBtn.addEventListener('click', function () { persistGift(); validateGiftForm(true); });
  }
  function openCart(opts) {
    renderCart();
    if (overlay) overlay.hidden = false;
    if (panel) panel.hidden = false;
    if (!(opts && opts.skipSync)) syncCartFromFs();
    if (!getTicketsLocal().length) {
      syncTicketsFromFs(function () { renderCart(); });
    }
  }
  function closeCart() { if (overlay) overlay.hidden = true; if (panel) panel.hidden = true; }
  var fab = document.getElementById('cart-fab');
  if (fab) fab.addEventListener('click', openCart);
  var cartClose = document.getElementById('cart-close');
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
  window.addEventListener('focus', syncCartFromFs);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) syncCartFromFs(); });

  function renderCart() {
    var itemsEl = document.getElementById('cart-items');
    var totalsEl = document.getElementById('cart-totals');
    var payEl = document.getElementById('cart-pay');
    if (!itemsEl) return;
    var cart = getCart();
    itemsEl.innerHTML = '';
    if (payEl) payEl.disabled = cart.length === 0;
    if (!cart.length) {
      var empty = document.createElement('p');
      empty.className = 'cart-empty';
      empty.textContent = 'Votre panier est vide. Ajoutez des billets depuis le catalogue pour commencer.';
      itemsEl.appendChild(empty);
      if (totalsEl) totalsEl.replaceChildren();
      return;
    }
    var boughtTickets = getTicketsLocal();
    cart.forEach(function (it, idx) {
      var qty = Number(it.qty) || 0;
      var unitPrice = Number(it.price) || 0;
      var lineTotal = (unitPrice * qty).toFixed(2);
      var alreadyQty = boughtTickets.reduce(function (s, bt) {
        return bt.event === it.event ? s + (Number(bt.qty) || 0) : s;
      }, 0);
      var metaParts = [];
      if (it.tarifLabel) metaParts.push(it.tarifLabel);
      metaParts.push(unitPrice.toFixed(2) + ' € / billet');
      if (it.cadeau && it.cadeau.destinataire) metaParts.push('🎁 Cadeau : ' + it.cadeau.destinataire);
      else if (it.cadeau) metaParts.push('🎁 Cadeau');
      if (alreadyQty > 0) metaParts.push('✓ Déjà acheté (' + alreadyQty + ')');

      var row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = '<div class="ci-info"><span class="ci-name">' + esc(it.event) + '</span>' +
        '<span class="ci-meta">' + esc(metaParts.join(' · ')) + '</span></div>' +
        '<span class="ci-qty"><button class="qty-btn" data-i="' + idx + '" data-d="-1" aria-label="Diminuer">−</button>' +
        '<span>' + qty + '</span>' +
        '<button class="qty-btn" data-i="' + idx + '" data-d="1" aria-label="Augmenter">+</button></span>' +
        '<span class="ci-price">' + lineTotal + ' €</span>' +
        '<button class="icon-btn ci-del" data-i="' + idx + '" aria-label="Supprimer"><span class="material-symbols-outlined">delete</span></button>';
      itemsEl.appendChild(row);
    });
    itemsEl.querySelectorAll('.qty-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = getCart(); var i = +b.getAttribute('data-i');
        c[i].qty += +b.getAttribute('data-d');
        if (c[i].qty <= 0) c.splice(i, 1);
        saveCart(c); updateBadge(); renderCart();
      });
    });
    itemsEl.querySelectorAll('.ci-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = getCart(); c.splice(+b.getAttribute('data-i'), 1);
        saveCart(c); updateBadge(); renderCart();
      });
    });
    var t = window.CartCore.computeTotals(cart, promoCode);
    if (totalsEl) {
      var makeLine = function (label, value, bold, className) {
        var p = document.createElement('p');
        if (className) p.className = className;
        p.appendChild(document.createTextNode(label));
        if (bold) {
          var strong = document.createElement('strong');
          strong.textContent = value;
          p.appendChild(strong);
        } else {
          p.appendChild(document.createTextNode(value));
        }
        return p;
      };
      var lines = [
        makeLine('Sous-total : ', (Number(t.sousTotal) || 0).toFixed(2) + ' €', true)
      ];
      if (t.remise > 0) {
        lines.push(makeLine('Remise (' + String(promoCode || '') + ') : −', (Number(t.remise) || 0).toFixed(2) + ' €', false));
      }
      lines.push(makeLine('HT : ', (Number(t.ht) || 0).toFixed(2) + ' €', false));
      lines.push(makeLine('TVA 20 % : ', (Number(t.tva) || 0).toFixed(2) + ' €', false));
      lines.push(makeLine('TTC : ', (Number(t.ttc) || 0).toFixed(2) + ' €', true, 'ttc'));
      totalsEl.replaceChildren.apply(totalsEl, lines);
    }
  }
  var promoApply = document.getElementById('promo-apply');
  if (promoApply) promoApply.addEventListener('click', function () {
    var v = (document.getElementById('promo-input').value || '').trim().toUpperCase();
    promoCode = window.CartCore.applyPromo(v);
    saveCart(getCart());
    renderCart();
  });
  var payBtn = document.getElementById('cart-pay');
  if (payBtn) payBtn.addEventListener('click', function () {
    var cart = getCart();
    if (!cart.length) return;
    if (typeof validateGiftForm === 'function' && !validateGiftForm(false)) return;
    var t = window.CartCore.computeTotals(cart, promoCode);
    payBtn.disabled = true;
    aegisPost('/payer_et_expedier', { client_id: 1, total: t.ttc, id: Date.now() % 100000 })
      .then(function (res) {
        var suivi = (res && res.suivi) || window.CartCore.makeTrackNumber();
        return syncTicketsFromFs().then(function (existing) {
          var list = Array.isArray(existing) ? existing.slice() : [];
          var gift = getGiftState();
          var giftPayload = gift && gift.active ? { nom: gift.nom, email: gift.email, message: gift.message } : null;
          cart.forEach(function (it) {
            var ticket = { event: it.event, qty: it.qty, price: it.price, date: new Date().toISOString().slice(0, 10), suivi: suivi, status: 'upcoming' };
            if (giftPayload) ticket.cadeau = giftPayload;
            list.push(ticket);
          });
          localStorage.setItem(TICKETS_KEY, JSON.stringify(list));
          promoCode = null;
          localStorage.removeItem(CART_KEY);
          localStorage.removeItem(GIFT_KEY);
          var gc = document.getElementById('cadeau-check');
          var gf = document.getElementById('cadeau-fields');
          if (gc) gc.checked = false;
          if (gf) gf.hidden = true;
          return Promise.all([pushTicketsToFs(list), pushCartToFs([])]).then(function () { return suivi; });
        });
      })
      .then(function (suivi) {
        updateBadge(); renderCart(); closeCart();
        if (typeof renderTicketsGlobal === 'function') renderTicketsGlobal();
        alert('Paiement accepté ✅ Suivi : ' + suivi);
      })
      .catch(function () { alert('Erreur réseau lors du paiement.'); })
      .finally(function () { payBtn.disabled = false; });
  });
  updateBadge();
  renderCart();
  if (new URLSearchParams(location.search).get('openCart') === '1' && panel) openCart();
  syncCartFromFs();
  syncTicketsFromFs();

  /* ===== Compte : authentification + profil éditable ===== */
  function defP() { return { prenom: 'Adélaïde', nom: 'Bernstein', email: 'adelaide.bernstein@exemple.fr', tel: '', adresse: '' }; }
  function loadP() { try { return Object.assign(defP(), JSON.parse(localStorage.getItem(PKEY) || '{}')); } catch (e) { return defP(); } }
  function pushProfileToFs(p) {
    return ensureFreshToken().then(function (a) {
      if (!a) return;
      return fsPatchUserDoc('users', a.uid, {
        prenom: toFsVal(p.prenom || 'Client'),
        nom: toFsVal(p.nom || 'AEGIS'),
        email: toFsVal(p.email || a.email || ''),
        tel: toFsVal(p.tel || ''),
        adresse: toFsVal(p.adresse || ''),
        updatedAt: toFsVal(new Date().toISOString())
      }, a.idToken);
    }).catch(function () {});
  }
  function syncProfileFromFs(onDone) {
    return ensureFreshToken().then(function (a) {
      if (!a) return null;
      return fsGetUserDoc('users', a.uid, a.idToken).then(function (doc) {
        if (doc && doc.fields) {
          var p = {
            prenom: parseFsVal(doc.fields.prenom) || 'Client',
            nom: parseFsVal(doc.fields.nom) || 'AEGIS',
            email: parseFsVal(doc.fields.email) || a.email || '',
            tel: parseFsVal(doc.fields.tel) || '',
            adresse: parseFsVal(doc.fields.adresse) || ''
          };
          localStorage.setItem(PKEY, JSON.stringify(p));
          if (typeof onDone === 'function') onDone(p);
          return p;
        }
        return null;
      });
    }).catch(function () { return null; });
  }

  var authSection = document.getElementById('auth-section');
  var accountProfile = document.getElementById('account-profile');
  var logoutBtn = document.getElementById('logout-btn');
  var authForm = document.getElementById('auth-form');
  var authSignupBtn = document.getElementById('auth-signup-btn');
  var authMsg = document.getElementById('auth-msg');
  function updateAuthUI() {
    var a = getAuth();
    var signedIn = !!(a && a.uid && a.idToken);
    if (authSection) authSection.hidden = signedIn;
    if (accountProfile) accountProfile.hidden = !signedIn;
    if (logoutBtn) logoutBtn.hidden = !signedIn;
  }
  function authEndpoint(action, payload) {
    return getFirebaseApiKey().then(function (apiKey) {
      if (!apiKey) throw new Error('MISSING_CONFIG');
      return fetch('https://identitytoolkit.googleapis.com/v1/accounts:' + action + '?key=' + encodeURIComponent(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ returnSecureToken: true }, payload))
      });
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) {
          var code = (d && d.error && d.error.message) || 'AUTH_ERROR';
          throw new Error(code);
        }
        return d;
      });
    });
  }
  function formatAuthErr(code) {
    if (code.indexOf('EMAIL_EXISTS') !== -1) return 'Un compte existe déjà avec cet e-mail.';
    if (code.indexOf('INVALID_LOGIN_CREDENTIALS') !== -1 || code.indexOf('INVALID_PASSWORD') !== -1 || code.indexOf('EMAIL_NOT_FOUND') !== -1) return 'E-mail ou mot de passe incorrect.';
    if (code.indexOf('WEAK_PASSWORD') !== -1) return 'Mot de passe trop court (6 caractères minimum).';
    if (code.indexOf('INVALID_EMAIL') !== -1) return 'Adresse e-mail invalide.';
    return 'Erreur d’authentification (' + code + ').';
  }
  var editBtn = document.getElementById('edit-profile');
  var pform = document.getElementById('profile-form');
  if (editBtn && pform) {
    var pTitle = document.getElementById('profil-title');
    var pMail = document.getElementById('profile-mail');
    var avatar = document.querySelector('.avatar');
    function renderP() {
      var p = loadP();
      if (pTitle) pTitle.textContent = p.prenom + ' ' + p.nom;
      if (pMail) pMail.textContent = p.email || '—';
      if (avatar) avatar.textContent = (p.prenom[0] || '') + (p.nom[0] || '');
      document.getElementById('pf-prenom').value = p.prenom;
      document.getElementById('pf-nom').value = p.nom;
      document.getElementById('pf-email').value = p.email || '';
      document.getElementById('pf-tel').value = p.tel || '';
      var pfRue = document.getElementById('pf-rue');
      var pfComp = document.getElementById('pf-complement');
      var pfCp = document.getElementById('pf-cp');
      var pfVille = document.getElementById('pf-ville');
      var pfPays = document.getElementById('pf-pays');
      if (pfRue && pfCp && pfVille && pfPays) {
        if (p.rue || p.cp || p.ville) {
          pfRue.value = p.rue || '';
          if (pfComp) pfComp.value = p.complement || '';
          pfCp.value = p.cp || '';
          pfVille.value = p.ville || '';
          pfPays.value = p.pays || 'France';
        } else if (p.adresse) {
          var m = String(p.adresse).match(/^(.*?)[,\s]+(\d{4,5})\s+([^,]+)(?:,\s*(.+))?$/);
          pfRue.value = m ? m[1].trim() : p.adresse;
          pfCp.value = m ? m[2] : '';
          pfVille.value = m ? m[3].trim() : '';
          pfPays.value = (m && m[4]) ? m[4].trim() : 'France';
        }
      }
    }
    if (authForm) {
      authForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (document.getElementById('auth-email').value || '').trim();
        var password = document.getElementById('auth-password').value || '';
        authMsg.textContent = 'Connexion en cours…'; authMsg.className = 'form-msg';
        authEndpoint('signInWithPassword', { email: email, password: password })
          .then(function (d) {
            saveAuth({ uid: d.localId, email: d.email, idToken: d.idToken, refreshToken: d.refreshToken, expiresAt: Date.now() + (Number(d.expiresIn) || 3600) * 1000 });
            updateAuthUI();
            return Promise.all([
              syncProfileFromFs(renderP),
              syncCartFromFs(),
              syncTicketsFromFs(function () { if (typeof renderTicketsGlobal === 'function') renderTicketsGlobal(); })
            ]);
          })
          .then(function () { authMsg.textContent = ''; })
          .catch(function (err) { authMsg.textContent = formatAuthErr(err.message); authMsg.className = 'form-msg ko'; });
      });
    }
    if (authSignupBtn) {
      authSignupBtn.addEventListener('click', function () {
        var email = (document.getElementById('auth-email').value || '').trim();
        var password = document.getElementById('auth-password').value || '';
        var rawPrenom = (document.getElementById('auth-prenom').value || '').trim();
        var rawNom = (document.getElementById('auth-nom').value || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { authMsg.textContent = 'Adresse e-mail invalide.'; authMsg.className = 'form-msg ko'; return; }
        if (password.length < 6) { authMsg.textContent = 'Mot de passe : 6 caractères minimum.'; authMsg.className = 'form-msg ko'; return; }
        if (window.CartCore && window.CartCore.validateName) {
          if (rawPrenom) {
            var vp = window.CartCore.validateName(rawPrenom, 'Prénom');
            if (!vp.ok) { authMsg.textContent = vp.error; authMsg.className = 'form-msg ko'; return; }
            rawPrenom = vp.formatted;
          }
          if (rawNom) {
            var vn = window.CartCore.validateName(rawNom, 'Nom');
            if (!vn.ok) { authMsg.textContent = vn.error; authMsg.className = 'form-msg ko'; return; }
            rawNom = vn.formatted;
          }
        }
        var prenom = rawPrenom || 'Client';
        var nom = rawNom || 'BilletPulse';
        authMsg.textContent = 'Création du compte et du panier Firestore…'; authMsg.className = 'form-msg';
        authEndpoint('signUp', { email: email, password: password })
          .then(function (d) {
            var auth = { uid: d.localId, email: d.email, idToken: d.idToken, refreshToken: d.refreshToken, expiresAt: Date.now() + (Number(d.expiresIn) || 3600) * 1000 };
            saveAuth(auth);
            var profile = { prenom: prenom, nom: nom, email: d.email, tel: '', adresse: '' };
            localStorage.setItem(PKEY, JSON.stringify(profile));
            var initialCart = getCart();
            var nowIso = new Date().toISOString();
            return Promise.all([
              fsPatchUserDoc('users', auth.uid, {
                prenom: toFsVal(profile.prenom), nom: toFsVal(profile.nom), email: toFsVal(profile.email),
                tel: toFsVal(''), adresse: toFsVal(''), updatedAt: toFsVal(nowIso)
              }, auth.idToken),
              fsPatchUserDoc('paniers', auth.uid, {
                items: toFsVal(initialCart), promoCode: toFsVal(promoCode || ''), updatedAt: toFsVal(nowIso)
              }, auth.idToken),
              fsPatchUserDoc('billets', auth.uid, {
                items: toFsVal([]), updatedAt: toFsVal(nowIso)
              }, auth.idToken)
            ]);
          })
          .then(function () {
            localStorage.setItem(TICKETS_KEY, '[]');
            updateAuthUI(); renderP(); updateBadge();
            if (typeof renderTicketsGlobal === 'function') renderTicketsGlobal();
            authMsg.textContent = '';
          })
          .catch(function (err) { authMsg.textContent = formatAuthErr(err.message); authMsg.className = 'form-msg ko'; });
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        saveAuth(null);
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem(TICKETS_KEY);
        localStorage.removeItem(PKEY);
        promoCode = null;
        updateAuthUI(); updateBadge(); renderCart();
        if (typeof renderTicketsGlobal === 'function') renderTicketsGlobal();
      });
    }
    updateAuthUI();
    if (getAuth()) {
      syncProfileFromFs(renderP);
    }
    editBtn.addEventListener('click', function () {
      var open = pform.hidden;
      pform.hidden = !open;
      editBtn.setAttribute('aria-expanded', String(open));
      editBtn.textContent = open ? 'Fermer' : 'Modifier le profil';
      if (open) document.getElementById('pf-prenom').focus();
    });
    document.getElementById('pf-cancel').addEventListener('click', function () {
      pform.hidden = true; editBtn.setAttribute('aria-expanded', 'false'); editBtn.textContent = 'Modifier le profil'; renderP();
    });
    ['pf-prenom', 'pf-nom', 'auth-prenom', 'auth-nom', 'pf-ville', 'pf-pays'].forEach(function (fieldId) {
      var el = document.getElementById(fieldId);
      if (el && window.CartCore && window.CartCore.sanitizeNameInput) {
        el.addEventListener('input', function () {
          var clean = window.CartCore.sanitizeNameInput(el.value);
          if (el.value !== clean) el.value = clean;
        });
      }
    });
    var pfTelInput = document.getElementById('pf-tel');
    if (pfTelInput && window.CartCore && window.CartCore.formatPhoneInput) {
      pfTelInput.addEventListener('input', function () {
        var formatted = window.CartCore.formatPhoneInput(pfTelInput.value);
        if (pfTelInput.value !== formatted) pfTelInput.value = formatted;
      });
    }
    var pfRueInput = document.getElementById('pf-rue');
    var pfCompInput = document.getElementById('pf-complement');
    var pfCpInput = document.getElementById('pf-cp');
    var pfVilleInput = document.getElementById('pf-ville');
    var pfPaysInput = document.getElementById('pf-pays');
    if (pfCpInput) {
      pfCpInput.addEventListener('input', function () {
        var cleanCp = pfCpInput.value.replace(/\D/g, '').slice(0, 5);
        if (pfCpInput.value !== cleanCp) pfCpInput.value = cleanCp;
      });
    }
    var pfAdresseList = document.getElementById('pf-adresse-suggestions');
    if (pfRueInput && pfAdresseList) {
      var addrTimer = null;
      pfRueInput.addEventListener('input', function () {
        var q = pfRueInput.value.trim();
        if (addrTimer) clearTimeout(addrTimer);
        if (q.length < 4) { pfAdresseList.hidden = true; pfAdresseList.innerHTML = ''; return; }
        addrTimer = setTimeout(function () {
          fetch('https://api-adresse.data.gouv.fr/search/?q=' + encodeURIComponent(q) + '&limit=5')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
              pfAdresseList.innerHTML = '';
              var feats = (data && Array.isArray(data.features)) ? data.features : [];
              if (!feats.length) { pfAdresseList.hidden = true; return; }
              feats.forEach(function (f) {
                var props = f && f.properties;
                if (!props || !props.label) return;
                var li = document.createElement('li');
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = props.label;
                btn.addEventListener('click', function () {
                  pfRueInput.value = props.name || props.label;
                  if (pfCpInput && props.postcode) pfCpInput.value = props.postcode;
                  if (pfVilleInput && props.city) pfVilleInput.value = props.city;
                  if (pfPaysInput) pfPaysInput.value = 'France';
                  pfAdresseList.hidden = true;
                  pfAdresseList.innerHTML = '';
                });
                li.appendChild(btn);
                pfAdresseList.appendChild(li);
              });
              pfAdresseList.hidden = !pfAdresseList.children.length;
            })
            .catch(function () { pfAdresseList.hidden = true; });
        }, 250);
      });
      document.addEventListener('click', function (ev) {
        if (ev.target !== pfRueInput && !pfAdresseList.contains(ev.target)) pfAdresseList.hidden = true;
      });
    }
    pform.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('pf-msg');
      var prenom = document.getElementById('pf-prenom').value.trim();
      var nom = document.getElementById('pf-nom').value.trim();
      var email = document.getElementById('pf-email').value.trim();
      var tel = document.getElementById('pf-tel').value.trim();
      var rue = pfRueInput ? pfRueInput.value.trim() : '';
      var complement = pfCompInput ? pfCompInput.value.trim() : '';
      var cp = pfCpInput ? pfCpInput.value.trim() : '';
      var ville = pfVilleInput ? pfVilleInput.value.trim() : '';
      var pays = pfPaysInput ? pfPaysInput.value.trim() : 'France';
      if (window.CartCore && window.CartCore.validateName) {
        var vp = window.CartCore.validateName(prenom, 'Prénom');
        if (!vp.ok) { msg.textContent = vp.error; msg.className = 'form-msg ko'; return; }
        var vn = window.CartCore.validateName(nom, 'Nom');
        if (!vn.ok) { msg.textContent = vn.error; msg.className = 'form-msg ko'; return; }
        prenom = vp.formatted; nom = vn.formatted;
        document.getElementById('pf-prenom').value = prenom;
        document.getElementById('pf-nom').value = nom;
      } else if (prenom.length < 2 || nom.length < 2) {
        msg.textContent = 'Prénom et nom requis (2 caractères min).'; msg.className = 'form-msg ko'; return;
      }
      if (window.CartCore && window.CartCore.validateEmail) {
        var emCheck = window.CartCore.validateEmail(email);
        if (!emCheck.ok) { msg.textContent = emCheck.error; msg.className = 'form-msg ko'; return; }
        email = emCheck.formatted;
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Adresse e-mail invalide.'; msg.className = 'form-msg ko'; return; }
      if (window.CartCore && window.CartCore.validatePhone) {
        var phoneCheck = window.CartCore.validatePhone(tel);
        if (!phoneCheck.ok) { msg.textContent = phoneCheck.error; msg.className = 'form-msg ko'; return; }
        tel = phoneCheck.formatted;
        if (pfTelInput) pfTelInput.value = tel;
      }
      var adresse = '';
      if (window.CartCore && window.CartCore.validateStructuredAddress) {
        var addrCheck = window.CartCore.validateStructuredAddress({ rue: rue, complement: complement, cp: cp, ville: ville, pays: pays });
        if (!addrCheck.ok) { msg.textContent = addrCheck.error; msg.className = 'form-msg ko'; return; }
        rue = addrCheck.rue; complement = addrCheck.complement; cp = addrCheck.cp; ville = addrCheck.ville; pays = addrCheck.pays; adresse = addrCheck.formatted;
        if (pfRueInput) pfRueInput.value = rue;
        if (pfCpInput) pfCpInput.value = cp;
        if (pfVilleInput) pfVilleInput.value = ville;
        if (pfPaysInput) pfPaysInput.value = pays;
      }
      var updatedP = { prenom: prenom, nom: nom, email: email, tel: tel, rue: rue, complement: complement, cp: cp, ville: ville, pays: pays, adresse: adresse };
      localStorage.setItem(PKEY, JSON.stringify(updatedP));
      pushProfileToFs(updatedP);
      renderP();
      msg.textContent = 'Profil mis à jour ✓'; msg.className = 'form-msg ok';
      setTimeout(function () { pform.hidden = true; editBtn.setAttribute('aria-expanded', 'false'); editBtn.textContent = 'Modifier le profil'; msg.textContent = ''; }, 1200);
    });
    renderP();
  }

  /* ===== Compte : billets ===== */
  var tlist = document.getElementById('tickets-list');
  var renderTicketsGlobal = null;
  if (tlist) {
    var tickets = getTicketsLocal();
    var tFilter = 'all';
    function renderTickets() {
      tickets = getTicketsLocal();
      var q = (document.getElementById('ticket-search').value || '').toLowerCase();
      tlist.innerHTML = '';
      var shown = tickets.filter(function (t) {
        var okF = tFilter === 'all' || t.status === tFilter;
        var okQ = !q || t.event.toLowerCase().indexOf(q) !== -1;
        return okF && okQ;
      });
      document.getElementById('no-tickets').hidden = shown.length > 0;
      shown.forEach(function (t) {
        var el = document.createElement('article');
        el.className = 'ticket card';
        el.innerHTML = '<div class="card-body"><h3>' + esc(t.event) + ' ×' + (Number(t.qty)||0) + '</h3>' +
          '<p class="card-meta">' + esc(t.date) + ' · Suivi ' + esc(t.suivi) + '</p>' +
          '<p class="card-price">' + ((Number(t.price)||0) * (Number(t.qty)||0)).toFixed(2) + ' €</p>' +
          '<div class="qr" aria-label="QR code du billet">▦ ' + esc(t.suivi) + '</div></div>';
        tlist.appendChild(el);
      });
      var total = tickets.reduce(function (s, t) { return s + t.price * t.qty; }, 0);
      document.getElementById('stat-billets').textContent = tickets.reduce(function (s, t) { return s + t.qty; }, 0);
      document.getElementById('stat-total').textContent = total.toFixed(2).replace('.', ',') + ' €';
      document.getElementById('stat-events').textContent = new Set(tickets.map(function (t) { return t.event; })).size;
    }
    document.querySelectorAll('.chip[data-tfilter]').forEach(function (c) {
      c.addEventListener('click', function () {
        document.querySelectorAll('.chip[data-tfilter]').forEach(function (x) { x.classList.remove('is-active'); });
        c.classList.add('is-active'); tFilter = c.getAttribute('data-tfilter'); renderTickets();
      });
    });
    document.getElementById('ticket-search').addEventListener('input', renderTickets);
    document.getElementById('export-csv').addEventListener('click', function () {
      var csv = 'event,date,suivi,qty,price\n' + tickets.map(function (t) {
        return [t.event, t.date, t.suivi, t.qty, t.price].join(',');
      }).join('\n');
      var a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'mes-billets.csv'; a.click();
    });
    renderTicketsGlobal = renderTickets;
    renderTickets();
    syncTicketsFromFs(function () { renderTickets(); });
  }

  /* ===== Countdown ===== */
  var cd = document.getElementById('cd-value');
  if (cd) {
    var target = new Date('2027-06-12T18:00:00+02:00').getTime();
    function tick() {
      var d = target - Date.now();
      if (d < 0) { cd.textContent = 'En cours !'; return; }
      var j = Math.floor(d / 864e5), h = Math.floor(d / 36e5) % 24, m = Math.floor(d / 6e4) % 60, s = Math.floor(d / 1e3) % 60;
      cd.textContent = j + 'j ' + h + 'h ' + m + 'm ' + s + 's';
    }
    tick(); setInterval(tick, 1000);
  }

  /* ===== Cookies + newsletter + contact ===== */
  var banner = document.getElementById('cookie-banner');
  if (banner) {
    if (localStorage.getItem('aegis-cookies')) banner.hidden = true;
    var acc = document.getElementById('cookie-accept'), ref = document.getElementById('cookie-refuse');
    if (acc) acc.addEventListener('click', function () { localStorage.setItem('aegis-cookies', '1'); banner.hidden = true; });
    if (ref) ref.addEventListener('click', function () { localStorage.setItem('aegis-cookies', '0'); banner.hidden = true; });
  }
  /* ===== Normalisation automatique en minuscules & blocage domaines invalides des champs e-mail ===== */
  document.querySelectorAll('input[type="email"]').forEach(function (emailEl) {
    emailEl.addEventListener('input', function () {
      var lower = emailEl.value.toLowerCase();
      if (emailEl.value !== lower) {
        var pos = emailEl.selectionStart;
        emailEl.value = lower;
        if (typeof pos === 'number') emailEl.setSelectionRange(pos, pos);
      }
      emailEl.setCustomValidity('');
    });
    emailEl.addEventListener('blur', function () {
      var val = emailEl.value.trim();
      if (!val || !window.CartCore || !window.CartCore.validateEmail) return;
      var res = window.CartCore.validateEmail(val);
      emailEl.setCustomValidity(res.ok ? '' : res.error);
    });
  });

  /* ===== Infobulles explicatives sur les champs validés ===== */
  (function initInfoTips() {
    var tips = {
      'pf-prenom': 'Lettres uniquement (2 à 50 caractères, sans chiffres ni symboles).',
      'pf-nom': 'Lettres uniquement (2 à 50 caractères, sans chiffres ni symboles).',
      'pf-email': 'Converti en minuscules. Les domaines jetables ou invalides sont bloqués.',
      'pf-tel': 'Format international (+33 6 12 34 56 78) ou 06..., chiffres uniquement.',
      'pf-rue': 'Saisissez le numéro et la rue puis choisissez une suggestion pour préremplir code postal et ville.',
      'pf-cp': 'Code postal obligatoire (4 ou 5 chiffres).',
      'pf-ville': 'Nom de la ville obligatoire (lettres uniquement).',
      'pf-pays': 'Pays obligatoire (ex. France).',
      'cadeau-nom': 'Prénom et nom du bénéficiaire (2 lettres min., sans caractères spéciaux).',
      'cadeau-email': 'E-mail valide avec @ et domaine autorisé pour recevoir le billet cadeau.'
    };
    Object.keys(tips).forEach(function (forId) {
      var lbl = document.querySelector('label[for="' + forId + '"]');
      if (!lbl || lbl.querySelector('.info-tip')) return;
      var tip = document.createElement('span');
      tip.className = 'info-tip';
      tip.tabIndex = 0;
      tip.textContent = 'i';
      tip.setAttribute('role', 'note');
      tip.setAttribute('aria-label', tips[forId]);
      tip.setAttribute('data-tip', tips[forId]);
      lbl.appendChild(tip);
    });
  })();

  /* ===== Bulle info confirmation / erreur (tous formulaires) ===== */
  var toastTimer = null;
  function showInfoBubble(text, isError) {
    if (!text) return;
    var toast = document.getElementById('bp-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bp-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.className = 'toast-bubble ' + (isError ? 'toast-err' : 'toast-ok');
    toast.innerHTML =
      '<img src="' + (isError ? 'assets/img/emoji-error.svg' : 'assets/img/emoji-success.svg') + '" alt="">' +
      '<span>' + esc(text) + '</span>' +
      '<button type="button" class="toast-close" aria-label="Fermer">×</button>';
    toast.hidden = false;
    toast.querySelector('.toast-close').addEventListener('click', function () { toast.hidden = true; });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 4500);
  }
  if (typeof MutationObserver === 'function') {
    document.querySelectorAll('.form-msg').forEach(function (el) {
      new MutationObserver(function () {
        var txt = (el.textContent || '').trim();
        if (!txt) return;
        if (el.classList.contains('ok')) showInfoBubble(txt, false);
        else if (el.classList.contains('ko')) showInfoBubble(txt, true);
      }).observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  var nl = document.getElementById('newsletter-form');
  if (nl) nl.addEventListener('submit', function (e) {
    e.preventDefault();
    var nlMsg = document.getElementById('nl-msg');
    var nlEmail = document.getElementById('nl-email');
    if (nlEmail && window.CartCore && window.CartCore.validateEmail) {
      var res = window.CartCore.validateEmail(nlEmail.value);
      if (!res.ok) { nlMsg.className = 'form-msg ko'; nlMsg.textContent = res.error; return; }
    }
    nlMsg.className = 'form-msg ok';
    nlMsg.textContent = 'Merci ! Inscription enregistrée ✓';
    nl.reset();
  });
  var cf = document.getElementById('contact-form');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var cfMsg = document.getElementById('cf-msg-out');
    var cfEmail = cf.querySelector('input[type="email"]');
    if (cfEmail && window.CartCore && window.CartCore.validateEmail) {
      var res = window.CartCore.validateEmail(cfEmail.value);
      if (!res.ok) { cfMsg.className = 'form-msg ko'; cfMsg.textContent = res.error; return; }
    }
    cfMsg.className = 'form-msg ok';
    cfMsg.textContent = 'Message envoyé ✓ Nous revenons vers vous rapidement.';
    cf.reset();
  });

  /* ===== Thème Jour / Nuit ===== */
  (function initThemeToggle() {
    var root = document.documentElement;
    var mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    var saved = localStorage.getItem('aegis_theme');
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

    function currentTheme() {
      var explicit = root.getAttribute('data-theme');
      if (explicit === 'dark' || explicit === 'light') return explicit;
      return (mql && mql.matches) ? 'dark' : 'light';
    }

    var navMain = document.querySelector('.nav-main');
    if (!navMain) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle';

    var SUN_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
    var MOON_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

    function syncBtn(t) {
      var isDark = t === 'dark';
      btn.innerHTML = isDark ? SUN_SVG : MOON_SVG;
      var label = isDark ? 'Passer en mode jour' : 'Passer en mode nuit';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }

    syncBtn(currentTheme());
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('aegis_theme', next);
      syncBtn(next);
    });
    if (mql && mql.addEventListener) {
      mql.addEventListener('change', function () {
        if (!localStorage.getItem('aegis_theme')) syncBtn(currentTheme());
      });
    }
    navMain.appendChild(btn);
  })();

  /* ===== Espace Administrateur (admin.html & admin-catalogue.html) ===== */
  var adminPanel = document.getElementById('admin-panel');
  if (adminPanel) {
    var adminStatus = document.getElementById('admin-status');
    var adminLoginLink = document.getElementById('admin-login-link');
    var adminList = document.getElementById('admin-events-list');
    var adminForm = document.getElementById('admin-event-form');
    var aeSearch = document.getElementById('ae-search');
    var aeMsg = document.getElementById('ae-msg');
    var cachedAdminEvents = [];

    function renderAdminEvents() {
      if (!adminList) return;
      var q = aeSearch ? aeSearch.value.trim().toLowerCase() : '';
      var filtered = cachedAdminEvents.filter(function (ev) {
        if (!q) return true;
        return (ev.title + ' ' + ev.lieu + ' ' + ev.id + ' ' + ev.catLabel).toLowerCase().indexOf(q) !== -1;
      });
      adminList.innerHTML = '';
      if (!filtered.length) {
        adminList.innerHTML = '<p class="card-meta">Aucun événement trouvé.</p>';
        return;
      }
      filtered.forEach(function (ev) {
        var card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = '<div class="card-body"><h3>' + esc(ev.title) + '</h3>' +
          '<p class="card-meta">' + esc(ev.id) + ' · ' + esc(ev.date) + ' · ' + esc(ev.lieu) + '</p>' +
          '<p class="card-price">' + esc(ev.prix) + ' € · Stock : ' + esc(ev.stock) + '</p>' +
          '<div class="form-actions"><button type="button" class="btn btn-outline btn-sm ae-edit">Modifier</button>' +
          '<button type="button" class="btn btn-outline btn-sm ae-del">Supprimer</button></div></div>';
        card.querySelector('.ae-edit').addEventListener('click', function () {
          document.getElementById('ae-id').value = ev.id || '';
          document.getElementById('ae-title').value = ev.title || '';
          document.getElementById('ae-category').value = ev.category || 'concert';
          document.getElementById('ae-catlabel').value = ev.catLabel || 'Concert';
          document.getElementById('ae-date').value = ev.date || '';
          document.getElementById('ae-lieu').value = ev.lieu || '';
          document.getElementById('ae-prix').value = ev.prix || 40;
          document.getElementById('ae-stock').value = ev.stock || 0;
          document.getElementById('ae-img').value = ev.img || 'assets/img/events/nova.jpg';
          document.getElementById('ae-desc').value = ev.desc || '';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        card.querySelector('.ae-del').addEventListener('click', function () {
          if (!confirm('Supprimer « ' + ev.title + ' » ?')) return;
          ensureFreshToken().then(function (a) {
            if (!a) return;
            return fetch(FS_BASE + '/evenements/' + encodeURIComponent(ev.id), {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + a.idToken }
            });
          }).then(loadAdminEvents);
        });
        adminList.appendChild(card);
      });
    }

    function loadAdminEvents() {
      fetch(FS_BASE + '/evenements?pageSize=50', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !Array.isArray(data.documents)) return;
          cachedAdminEvents = data.documents.map(function (doc) {
            var f = doc.fields || {};
            var o = { id: doc.name.split('/').pop() };
            Object.keys(f).forEach(function (k) { o[k] = parseFsVal(f[k]); });
            return o;
          });
          var statCount = document.getElementById('admin-stat-count');
          var statStock = document.getElementById('admin-stat-stock');
          var statCats = document.getElementById('admin-stat-cats');
          if (statCount) statCount.textContent = String(cachedAdminEvents.length);
          if (statStock) {
            var totalStock = cachedAdminEvents.reduce(function (s, ev) { return s + (Number(ev.stock) || 0); }, 0);
            statStock.textContent = String(totalStock);
          }
          if (statCats) {
            var cats = {};
            cachedAdminEvents.forEach(function (ev) { if (ev.category) cats[ev.category] = true; });
            statCats.textContent = String(Object.keys(cats).length);
          }
          renderAdminEvents();
        });
    }

    if (aeSearch) aeSearch.addEventListener('input', renderAdminEvents);

    ensureFreshToken().then(function (a) {
      if (!a) {
        adminStatus.textContent = 'Connexion requise : connectez-vous avec le compte administrateur sur Mon compte.';
        if (adminLoginLink) adminLoginLink.hidden = false;
        return;
      }
      return fsGetUserDoc('admins', a.uid, a.idToken).then(function (doc) {
        if (!doc || !doc.fields) {
          adminStatus.textContent = 'Accès refusé : le compte ' + a.email + ' n’a pas le rôle administrateur.';
          return;
        }
        adminStatus.textContent = 'Connecté en tant qu’administrateur (' + a.email + ') ✓';
        adminPanel.hidden = false;
        loadAdminEvents();
      });
    });
    if (adminForm) {
      document.getElementById('ae-reset').addEventListener('click', function () { adminForm.reset(); aeMsg.textContent = ''; });
      adminForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = document.getElementById('ae-id').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        var prix = Number(document.getElementById('ae-prix').value) || 40;
        var fields = {
          id: toFsVal(id),
          title: toFsVal(document.getElementById('ae-title').value.trim()),
          category: toFsVal(document.getElementById('ae-category').value.trim()),
          catLabel: toFsVal(document.getElementById('ae-catlabel').value.trim()),
          date: toFsVal(document.getElementById('ae-date').value.trim()),
          lieu: toFsVal(document.getElementById('ae-lieu').value.trim()),
          prix: toFsVal(prix),
          stock: toFsVal(Number(document.getElementById('ae-stock').value) || 0),
          img: toFsVal(document.getElementById('ae-img').value.trim()),
          desc: toFsVal(document.getElementById('ae-desc').value.trim()),
          tarifs: toFsVal([{ type: 'standard', label: 'Standard', prix: prix }, { type: 'vip', label: 'VIP', prix: Math.round(prix * 1.6) }])
        };
        aeMsg.textContent = 'Enregistrement…'; aeMsg.className = 'form-msg';
        ensureFreshToken().then(function (a) {
          if (!a) throw new Error('Non connecté');
          return fsPatchUserDoc('evenements', id, fields, a.idToken);
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          aeMsg.textContent = 'Événement enregistré ✓'; aeMsg.className = 'form-msg ok';
          loadAdminEvents();
        }).catch(function (err) {
          aeMsg.textContent = 'Erreur : ' + err.message; aeMsg.className = 'form-msg ko';
        });
      });
    }
  }
})();
