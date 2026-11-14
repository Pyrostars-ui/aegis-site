(function () {
  'use strict';
  /* ===== Auth token : meta tag + cookie depuis query param ===== */
  var meta = document.querySelector('meta[name="aegis-auth-token"]');
  var TOKEN = meta ? meta.content : '';
  var qs = new URLSearchParams(location.search);
  if (qs.get('aegis_token')) {
    document.cookie = 'aegis_token=' + encodeURIComponent(qs.get('aegis_token')) + '; path=/; SameSite=Lax; Secure';
    qs.delete('aegis_token');
    var clean = location.pathname + (qs.toString() ? '?' + qs.toString() : '') + location.hash;
    history.replaceState({}, '', clean);
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
        '<img class="card-img" src="' + (ev.img || 'assets/img/hero-concert.jpg') + '" alt="" loading="lazy">' +
        '<div class="card-body">' +
        '<span class="card-tag">' + ev.catLabel + '</span>' +
        '<h3 class="card-title-link">' + ev.title + '</h3>' +
        '<p class="card-meta">' + ev.date + ' · ' + ev.lieu + '</p>' +
        '<p class="card-foot"><span class="card-price">' + ev.prix + ' €</span>' +
        '<span class="card-stock' + (ev.stock < 20 ? ' low' : '') + '">' + (ev.stock < 20 ? 'Stock faible' : ev.stock + ' places') + '</span></p></div>';
      container.appendChild(a);
    });
  }
  if (grid && window.AEGIS_EVENTS) {
    renderCards(window.AEGIS_EVENTS, grid);
    /* recherche + filtres */
    var search = document.getElementById('search-input');
    var chips = document.querySelectorAll('.chip[data-filter]');
    var noRes = document.getElementById('no-result');
    var activeFilter = 'all';
    function applyFilters() {
      var q = search ? search.value.trim().toLowerCase() : '';
      var list = window.AEGIS_EVENTS.filter(function (ev) {
        var okCat = activeFilter === 'all' || ev.category === activeFilter;
        var okQ = !q || (ev.title + ' ' + ev.lieu + ' ' + ev.catLabel).toLowerCase().indexOf(q) !== -1;
        return okCat && okQ;
      });
      renderCards(list, grid);
      if (noRes) noRes.hidden = list.length > 0;
    }
    if (search) search.addEventListener('input', applyFilters);
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
  if (detail && window.AEGIS_EVENTS) {
    var id = new URLSearchParams(location.search).get('id');
    var ev = window.AEGIS_EVENTS.find(function (e) { return e.id === id; }) || window.AEGIS_EVENTS[0];
    document.title = ev.title + ' — AEGIS Tickets';
    detail.innerHTML =
      '<section class="event-hero"><img src="' + ev.img + '" alt="" class="event-hero-img">' +
      '<div class="event-hero-body"><span class="card-tag">' + ev.catLabel + '</span>' +
      '<h1>' + ev.title + '</h1><p class="card-meta">' + ev.date + ' · ' + ev.lieu + '</p></div></section>' +
      '<section class="card"><div class="card-body"><h2>Programme</h2><p>' + ev.desc + '</p></div></section>' +
      '<section class="card"><div class="card-body"><h2>Tarifs</h2><p><strong>' + ev.prix + ' €</strong> — place standard (TVA 20 % incluse dans le total du panier).</p></div></section>' +
      '<section class="buy-box card"><div class="card-body">' +
      '<p class="card-stock' + (ev.stock < 20 ? ' low' : '') + '">' + (ev.stock < 20 ? '⚠ Stock faible : ' + ev.stock + ' places' : ev.stock + ' places disponibles') + '</p>' +
      '<button class="btn btn-primary btn-lg" id="ev-buy">Acheter — ' + ev.prix + ' €</button>' +
      '</div></section>';
    var buyBtn = document.getElementById('ev-buy');
    if (buyBtn) buyBtn.addEventListener('click', function () {
      var cart = getCart();
      window.CartCore.addItem(cart, ev, 1);
      saveCart(cart);
      updateBadge();
      openCart();
    });
  }

  /* ===== Panier v2 ===== */
  var CART_KEY = 'aegis-cart';
  var promoCode = null;
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }
  var badge = document.getElementById('cart-badge');
  function updateBadge() {
    if (!badge) return;
    var n = getCart().reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    badge.textContent = n;
    badge.hidden = n === 0;
  }
  var overlay = document.getElementById('cart-overlay');
  var panel = document.getElementById('cart-panel');
  function openCart() { if (overlay) overlay.hidden = false; if (panel) panel.hidden = false; renderCart(); }
  function closeCart() { if (overlay) overlay.hidden = true; if (panel) panel.hidden = true; }
  var fab = document.getElementById('cart-fab');
  if (fab) fab.addEventListener('click', openCart);
  var cartClose = document.getElementById('cart-close');
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });

  function renderCart() {
    var itemsEl = document.getElementById('cart-items');
    var totalsEl = document.getElementById('cart-totals');
    if (!itemsEl) return;
    var cart = getCart();
    itemsEl.innerHTML = '';
    cart.forEach(function (it, idx) {
      var row = document.createElement('div');
      row.className = 'cart-item';
      row.innerHTML = '<span class="ci-name">' + it.event + '</span>' +
        '<span class="ci-qty"><button class="qty-btn" data-i="' + idx + '" data-d="-1" aria-label="Diminuer">−</button>' +
        '<span>' + it.qty + '</span>' +
        '<button class="qty-btn" data-i="' + idx + '" data-d="1" aria-label="Augmenter">+</button></span>' +
        '<span class="ci-price">' + (it.price * it.qty).toFixed(2) + ' €</span>' +
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
    if (totalsEl) totalsEl.innerHTML =
      '<p>Sous-total : <strong>' + t.sousTotal.toFixed(2) + ' €</strong></p>' +
      (t.remise > 0 ? '<p>Remise (' + promoCode + ') : −' + t.remise.toFixed(2) + ' €</p>' : '') +
      '<p>HT : ' + t.ht.toFixed(2) + ' €</p><p>TVA 20 % : ' + t.tva.toFixed(2) + ' €</p>' +
      '<p class="ttc">TTC : <strong>' + t.ttc.toFixed(2) + ' €</strong></p>';
  }
  var promoApply = document.getElementById('promo-apply');
  if (promoApply) promoApply.addEventListener('click', function () {
    var v = (document.getElementById('promo-input').value || '').trim().toUpperCase();
    promoCode = window.CartCore.applyPromo(v);
    renderCart();
  });
  var payBtn = document.getElementById('cart-pay');
  if (payBtn) payBtn.addEventListener('click', function () {
    var cart = getCart();
    if (!cart.length) return;
    var t = window.CartCore.computeTotals(cart, promoCode);
    payBtn.disabled = true;
    aegisPost('/payer_et_expedier', { client_id: 1, total: t.ttc, id: Date.now() % 100000 })
      .then(function (res) {
        var suivi = (res && res.suivi) || window.CartCore.makeTrackNumber();
        var list = JSON.parse(localStorage.getItem('aegis-tickets-list') || '[]');
        cart.forEach(function (it) {
          list.push({ event: it.event, qty: it.qty, price: it.price, date: new Date().toISOString().slice(0, 10), suivi: suivi, status: res && res.status === 'Expediee' ? 'upcoming' : 'upcoming' });
        });
        localStorage.setItem('aegis-tickets-list', JSON.stringify(list));
        localStorage.removeItem(CART_KEY);
        promoCode = null;
        updateBadge(); renderCart(); closeCart();
        alert('Paiement accepté ✅ Suivi : ' + suivi);
      })
      .catch(function () { alert('Erreur réseau lors du paiement.'); })
      .finally(function () { payBtn.disabled = false; });
  });
  updateBadge();

  /* ===== Compte : profil éditable ===== */
  var PKEY = 'aegis-profile';
  function defP() { return { prenom: 'Laury', nom: 'Ragouton', email: 'baciragouton@gmail.com', adresse: '' }; }
  function loadP() { try { return Object.assign(defP(), JSON.parse(localStorage.getItem(PKEY) || '{}')); } catch (e) { return defP(); } }
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
      document.getElementById('pf-adresse').value = p.adresse || '';
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
    pform.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('pf-msg');
      var prenom = document.getElementById('pf-prenom').value.trim();
      var nom = document.getElementById('pf-nom').value.trim();
      var email = document.getElementById('pf-email').value.trim();
      var adresse = document.getElementById('pf-adresse').value.trim();
      if (prenom.length < 2 || nom.length < 2) { msg.textContent = 'Prénom et nom requis (2 caractères min).'; msg.className = 'form-msg ko'; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Adresse e-mail invalide.'; msg.className = 'form-msg ko'; return; }
      localStorage.setItem(PKEY, JSON.stringify({ prenom: prenom, nom: nom, email: email, adresse: adresse }));
      renderP();
      msg.textContent = 'Profil mis à jour ✓'; msg.className = 'form-msg ok';
      setTimeout(function () { pform.hidden = true; editBtn.setAttribute('aria-expanded', 'false'); editBtn.textContent = 'Modifier le profil'; msg.textContent = ''; }, 1200);
    });
    renderP();
  }

  /* ===== Compte : billets ===== */
  var tlist = document.getElementById('tickets-list');
  if (tlist) {
    var tickets = JSON.parse(localStorage.getItem('aegis-tickets-list') || '[]');
    var tFilter = 'all';
    function renderTickets() {
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
        el.innerHTML = '<div class="card-body"><h3>' + t.event + ' ×' + t.qty + '</h3>' +
          '<p class="card-meta">' + t.date + ' · Suivi ' + t.suivi + '</p>' +
          '<p class="card-price">' + (t.price * t.qty).toFixed(2) + ' €</p>' +
          '<div class="qr" aria-label="QR code du billet">▦ ' + t.suivi + '</div></div>';
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
    renderTickets();
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
  var nl = document.getElementById('newsletter-form');
  if (nl) nl.addEventListener('submit', function (e) {
    e.preventDefault();
    document.getElementById('nl-msg').textContent = 'Merci ! Inscription enregistrée ✓';
    nl.reset();
  });
  var cf = document.getElementById('contact-form');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    document.getElementById('cf-msg-out').textContent = 'Message envoyé ✓ Nous revenons vers vous rapidement.';
    cf.reset();
  });
})();
