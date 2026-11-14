# Serveur AEGIS en mode poll() — documentation

## Contexte
Le backend AEGIS (projet-aegis) utilise normalement io_uring. Dans le sandbox WSL2
(kernel 6.18.33.2), io_uring_setup echoue avec EPERM (seccomp) -> le serveur bascule
automatiquement en mode poll() (aegis_server_poll.c, fork de aegis_server_io_uring.c).

## Lancement
    /home/pn/work/aegis_server_poll 8090 -1 0 dev-token-123 /tmp/aegis-tickets
    # argv: port | max_requests (-1 = infini) | rate-limit/min (0 = off) | token | racine statique

## Bug trouve et corrige (2026-11-14) : segfault (exit 139) en mode poll
Cause : use-after-free dans la boucle poll(). Quand une connexion etait fermee
(free_conn_context -> g_conn_in_use[i] = false), son client_fd pouvait etre reutilise
par le noyau pour une nouvelle connexion dans le meme tour de boucle. Le pointeur
pctx[k] pointait alors vers une entree du pool reutilisee -> double close() / acces a
un contexte reinitialise -> segfault.

Correctif (aegis_server_poll.c) : snapshot des (fd, ctx) valides AVANT traitement,
avec re-validation a chaque iteration :
- pfds[k].fd != snap_fd[k] -> on saute (fd change = entree reutilisee)
- verification g_conn_in_use[ci] && g_conn_pool[ci].client_fd == snap_fd[k] avant tout acces

## Verification
- Build ASAN (-fsanitize=address) : 200 rounds x 5 requetes concurrentes -> 0 erreur ASAN
- Binaire patche en prod : 360 requetes concurrentes + 60 s de stabilite -> 200, processus vivant

## Limites connues du mode poll
- MAX_CONNECTIONS = 256, buffer 80 Ko par connexion (pool statique, zero malloc au runtime)
- Rate-limit par IP desactive par defaut (argv[3] = 0)
- Pas de HTTP keep-alive en mode poll (fermeture apres chaque reponse sauf keep_alive)
