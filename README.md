# Server Monitor Dashboard

Une solution de monitoring full-stack pour Linux.

## Architecture

- **Backend (FastAPI) :** Collecte les métriques système locales (CPU, RAM, Disque, Réseau, Température) via un cron worker planifié en arrière-plan, les stocke dans une base SQLite, et fournit des endpoints API.
- **Frontend (Next.js) :** Affiche une vue d'ensemble en temps réel et les tendances historiques via Recharts et shadcn/ui.
- **Backup worker :** conteneur séparé (`backup-worker`, `server/backup_worker.py`) qui exécute les sauvegardes planifiées et celles demandées via `POST /api/backups/run` (l'API ne fait que mettre la demande en file dans la base). Il est le seul à avoir accès complet au socket Docker et n'est pas exposé sur Internet.
- **docker-socket-proxy :** donne à l'API publique un accès Docker en lecture seule (liste/stats des conteneurs, `system df`), sans accès direct au socket.

## Instructions d'installation

### 1. Déploiement (Docker Compose)

1.  Cloner ce repository sur la machine hôte.
2.  Créer un fichier `.env` à partir de `.env.example` :
    ```bash
    cp .env.example .env
    ```
3.  Définir `API_KEY` (obligatoire, l'API refuse de démarrer sans : `openssl rand -hex 32`) et `NEXT_PUBLIC_API_URL` dans `.env`. Pour les sauvegardes Nextcloud, définir aussi `NEXTCLOUD_DB_USER` et `NEXTCLOUD_DB_PASSWORD`. Il est aussi possible de configurer :
    - `COLLECTION_INTERVAL_SECONDS` : l'intervalle en secondes pour la collecte de métriques par le cron worker (par défaut `3600` secondes / 1 heure).
    - `TRAEFIK_CLIENT_HOST` : hostname utilisé par `docker-compose.dev.yml` (mettre `stats.staging.beskarfox.com` en staging).
    - `ALLOWED_DEV_ORIGINS` : liste de hostnames (séparés par des virgules) acceptés par le serveur dev Next.js.
4.  Lancer les services :
    ```bash
    docker-compose up -d --build
    ```

## Fonctionnalités

- **Vue d'ensemble en temps réel :** derniers relevés CPU, RAM, Disque et Uptime.
- **Graphiques historiques :** courbes interactives pour la Température, l'Usage et les statistiques Réseau.
- **Tableau de données :** consultation des 10 derniers relevés triés.
- **Atomic Design :** structure de composants frontend propre et maintenable.
- **Sécurisé :** authentification par clé API pour la soumission de données.
