(function () {
  'use strict';
  /* Token auth */
  const token = document.querySelector('meta[name="aegis-auth-token"]')?.content || '';
  if (token) {
    const urlParam = new URLSearchParams(window.location.search).get('aegis_token');
    if (urlParam) {
      document.cookie = `aegis_token=${encodeURIComponent(urlParam)}; path=/; SameSite=Lax; Secure`;
      history.replaceState({}, '', window.location.pathname);
    }
  }
  /* Panier v2 */
  const cartKey = 'aegis-cart';
  let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
  function saveCart() { localStorage.setItem(cartKey, JSON.stringify(cart)); }
  function updateBadge() {
    const badge = document.getElementById('cart-badge');
    badge.textContent = cart.reduce((s, i) => s + (i.qty || 0), 0);
    badge.hidden = badge.textContent === '0';
  }
  /* Compte éditable */
  const profileKey = 'aegis-profile';
  function defautProfile() { return { prenom:'Laury', nom:'Ragouton', email:'baciragouton@gmail.com', adresse:'' }; }
  function loadProfile() { try { return Object.assign(defautProfile(), JSON.parse(localStorage.getItem(profileKey) || '{}')); } catch { return defautProfile(); } }
  function saveProfile(p) { try { localStorage.setItem(profileKey, JSON.stringify(p)); } catch {} }
  function renderProfile() {
    const p = loadProfile();
    const title = document.getElementById('profil-title');
    const avatar = document.querySelector('.avatar');
    if (title) title.textContent = p.prenom + ' ' + p.nom;
    if (avatar) avatar.textContent = (p.prenom[0] || '') + (p.nom[0] || '');
    const mailEl = document.getElementById('profile-mail');
    if (mailEl) mailEl.textContent = p.email || '—';
  }
  /* Initial render */
  updateBadge();
  renderProfile();
})();
