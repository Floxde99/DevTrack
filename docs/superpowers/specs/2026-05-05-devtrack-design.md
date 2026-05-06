# DevTrack — Spec de design

**Date :** 2026-05-05  
**Statut :** Approuvé

---

## Résumé

DevTrack est une application de suivi du temps en temps réel pour développeurs sous Windows. Elle catégorise automatiquement l'activité (coding, web, communication, terminal, inactivité) et associe les sessions à des projets déclarés. Le tout s'affiche dans un dashboard web local stylisé Dark Amber.

---

## Architecture

### Vue d'ensemble

```
[Daemon Node.js — Windows natif]
        │
        ├──▶ SQLite (fichier local, volume Docker partagé)
        │
        └──▶ HTTP POST (événements live)
                        │
                        ▼
            [API Server — Docker · Express.js · port 3001]
                        │
                        ├── SQLite (lecture historique + agrégations)
                        └── WebSocket (push temps réel)
                                        │
                                        ▼
                        [Dashboard — Docker · React · port 3000]
```

### Composants

#### 1. Daemon (`/daemon`) — Node.js natif Windows

Tourne en arrière-plan, ne nécessite pas Docker.

**Responsabilités :**

- Interroge `GetForegroundWindow` + `GetWindowText` via `ffi-napi` (ou `node-ffi-napi`) toutes les **2 secondes**
- Détecte l'inactivité via `GetLastInputInfo` — seuil configurable (défaut : 120 s)
- Applique les règles de catégorisation (matching sur `app_name`)
- Écrit les segments d'activité dans SQLite toutes les **5 secondes**
- POST chaque changement d'activité à l'API (`POST /api/events`)
- Gère le projet actif (lit la config locale ou interroge l'API)
- Démarre automatiquement avec Windows (Task Scheduler ou `pm2`)

**Fichiers clés :**

```
daemon/
  src/
    tracker.js        # boucle principale
    window.js         # bindings Win32
    categorizer.js    # règles de catégorisation
    db.js             # écriture SQLite locale
    client.js         # HTTP POST vers l'API
  config.json         # seuil idle, interval, URL API
  package.json
```

#### 2. API Server (`/api`) — Docker · Express.js

**Responsabilités :**

- Reçoit les événements du daemon (`POST /api/events`)
- Stocke dans SQLite (volume monté)
- Expose les endpoints REST pour le dashboard
- Gère les WebSockets (broadcast des événements live)
- CRUD projets

**Endpoints REST :**

```
POST   /api/events              # reçoit un événement du daemon
GET    /api/activities?date=    # historique par jour
GET    /api/stats/today         # agrégations du jour
GET    /api/stats/week          # agrégations de la semaine
GET    /api/projects            # liste des projets
POST   /api/projects            # créer un projet
PATCH  /api/projects/:id        # modifier (nom, couleur, actif)
DELETE /api/projects/:id        # supprimer
GET    /api/rules               # règles de catégorisation
PUT    /api/rules               # remplacer toutes les règles
```

**WebSocket :**

- Connexion : `ws://localhost:3001/ws`
- Événements émis : `activity_changed`, `stats_updated`

#### 3. Dashboard (`/frontend`) — Docker · React + Vite

**Responsabilités :**

- Affichage temps réel via WebSocket
- Visualisation historique via REST
- Gestion des projets
- Configuration des règles de catégorisation

---

## Modèle de données (SQLite)

```sql
CREATE TABLE activities (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at   DATETIME NOT NULL,
  ended_at     DATETIME,
  app_name     TEXT NOT NULL,
  window_title TEXT,
  category     TEXT NOT NULL,
  project_id   INTEGER REFERENCES projects(id)
);

CREATE TABLE projects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#f59e0b',
  is_active  BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category_rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  app_pattern TEXT NOT NULL,   -- glob, ex: "cursor*", "chrome*"
  category    TEXT NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 0
);
```

---

## Catégories


| Catégorie        | Couleur   | Apps par défaut                                                                               |
| ---------------- | --------- | --------------------------------------------------------------------------------------------- |
| 💻 Coding        | `#f59e0b` | `cursor.exe`, `code.exe`, `devenv.exe`, `webstorm64.exe`, `idea64.exe`, `vim.exe`, `nvim.exe` |
| 🌐 Web           | `#fb923c` | `chrome.exe`, `firefox.exe`, `msedge.exe`, `brave.exe`, `opera.exe`                           |
| 💬 Communication | `#c084fc` | `discord.exe`, `slack.exe`, `outlook.exe`, `thunderbird.exe`, `teams.exe`, `msteams.exe`      |
| 🖥️ Terminal     | `#fbbf24` | `WindowsTerminal.exe`, `powershell.exe`, `cmd.exe`, `wt.exe`, `alacritty.exe`                 |
| 🎨 Design        | `#34d399` | `figma.exe`, `photoshop.exe`, `illustrator.exe`, `xd.exe`                                     |
| 😴 Idle          | `#ef4444` | *(inactivité > seuil)*                                                                        |
| 📦 Autre         | `#57534e` | *(fallback)*                                                                                  |


Les règles sont éditables depuis le dashboard (priorité, ajout/suppression d'apps).

---

## Interface utilisateur

### Charte graphique — Dark Amber


| Token           | Valeur    |
| --------------- | --------- |
| `bg-base`       | `#0c0a00` |
| `bg-surface`    | `#0f0d00` |
| `bg-elevated`   | `#1c1800` |
| `border`        | `#292400` |
| `text-primary`  | `#e2c97e` |
| `text-muted`    | `#78716c` |
| `accent`        | `#f59e0b` |
| `accent-bright` | `#fcd34d` |
| `live-green`    | `#4ade80` |


### Layout — Sidebar fixe

```
┌────────────┬────────────────────────────────────────────┐
│  Sidebar   │  Top bar : activité live + date nav        │
│  (200px)   ├────────────────────────────────────────────┤
│            │  Stats cards (×4)                          │
│  ⏱ Total  ├──────────────────────┬─────────────────────┤
│  Catégories│  Timeline + Log      │  Donut + Projets    │
│  Nav       │  d'activité          │  du jour            │
│  Projet ▾  │                      │                     │
└────────────┴──────────────────────┴─────────────────────┘
```

### Pages / vues

1. **Dashboard** (défaut) — vue temps réel + stats du jour
2. **Projets** — liste, création, activation, historique par projet
3. **Historique** — navigation par jour/semaine, graphiques
4. **Configuration** — règles de catégorisation, seuil d'inactivité, URL API

---

## Infrastructure Docker

```yaml
# docker-compose.yml
services:
  api:
    build: ./api
    ports: ["3001:3001"]
    volumes:
      - ./data:/app/data   # SQLite partagé avec le daemon
    environment:
      - DB_PATH=/app/data/devtrack.db

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [api]
    environment:
      - VITE_API_URL=http://localhost:3001
```

Le daemon lit/écrit dans `./data/devtrack.db` (chemin Windows absolu, ex: `C:\Users\flori\Documents\ia test\data\devtrack.db`), configuré dans `daemon/config.json`. Docker monte ce même répertoire `./data` comme volume — les deux processus accèdent ainsi au même fichier SQLite. L'accès concurrent est géré par WAL mode SQLite (`PRAGMA journal_mode=WAL`).

---

## Gestion des erreurs


| Scénario           | Comportement                                                                |
| ------------------ | --------------------------------------------------------------------------- |
| API inaccessible   | Daemon continue d'écrire dans SQLite, retry POST toutes les 30 s            |
| Docker down        | Dashboard inaccessible, daemon continue de logger localement                |
| Fenêtre sans titre | `window_title = ""` accepté, `app_name` suffisant pour catégoriser          |
| App inconnue       | Catégorie `autre`, loguée pour révision dans Config                         |
| SQLite corrompu    | Daemon crée un nouveau fichier `devtrack-YYYYMMDD.db`, alerte dans les logs |


---

## Prérequis


| Composant        | Prérequis                                                                 |
| ---------------- | ------------------------------------------------------------------------- |
| Daemon           | Node.js ≥ 18, `node-gyp` + Build Tools Windows (pour compiler `ffi-napi`) |
| Docker stack     | Docker Desktop for Windows avec WSL2                                      |
| Daemon autostart | `pm2` (optionnel) ou Task Scheduler Windows                               |


Le daemon nécessite les **Visual C++ Build Tools** (`npm install --global windows-build-tools` ou via Visual Studio Installer) pour compiler les bindings natifs Win32.

---

## Plan de déploiement initial

1. Installer les build tools Windows si absents
2. `npm install` dans `/daemon` + lancer avec `node src/tracker.js`
3. `docker compose up -d` à la racine
4. Ouvrir `http://localhost:3000`
5. Configurer le projet actif dans le dashboard
6. Optionnel : enregistrer le daemon dans Task Scheduler pour démarrage automatique

---

## Ce qui est hors scope (v1)

- Synchronisation cloud / multi-machines
- Notifications / alertes (ex: "vous codez depuis 3h sans pause")
- Rapports exportables (CSV, PDF)
- Authentification
- Support macOS / Linux

