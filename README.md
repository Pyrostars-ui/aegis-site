# AEGIS Tickets — Démo billetterie

Site statique 6 pages servi par le backend AEGIS (runtime C11).

## Pages
- `index.html` : Accueil avec héros, stats, événements
- `evenements.html` : Liste des événements
- `evenement.html?id=...` : Détail événement
- `aide.html` : Aide et contacts
- `compte.html` : Profil utilisateur (éditable)
- `mentions-legales.html` : Mentions légales

## Stack
- **Frontend** : HTML5/CSS3/JS vanilla (pas de framework)
- **Design** : Material 3, 4 fonts Google, images Unsplash locales
- **Backend** : AEGIS C11 (mode poll() car io_uring bloqué par seccomp WSL2)
- **Tests** : Unitaires (Node), intégration (bash/curl), E2E (Playwright)
- **Auth** : Token via header Bearer, query param `?aegis_token=`, cookie `aegis_token`
- **Tunnel** : cloudflared (HTTPS chiffré, pas de port ouvert)

## Lancer le backend
```bash
/home/pn/work/aegis_server_poll 8090 -1 120 [REDACTED] /tmp/aegis-tickets
```

## Lancer le tunnel
```bash
/home/pn/bin/cloudflared tunnel --url http://127.0.0.1:8090
```

## Lien public
https://namespace-reef-votes-objective.trycloudflare.com/?aegis_token=[REDACTED]

## Licence
MIT
<!-- v2 -->
