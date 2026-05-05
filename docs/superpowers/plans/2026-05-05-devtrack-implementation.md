# DevTrack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une application de suivi du temps en temps réel pour Windows composée d'un daemon Node.js natif, d'une API Express dans Docker, et d'un dashboard React Dark Amber.

**Architecture:** Daemon Node.js (natif Windows) → SQLite partagé + HTTP POST → API Express (Docker) → WebSocket → Dashboard React (Docker). Le daemon collecte la fenêtre active toutes les 2 s via `ffi-napi` (Win32), catégorise selon des règles configurables, et persiste en SQLite. L'API expose REST + WebSocket. Le dashboard affiche tout en temps réel.

**Tech Stack:** Node.js 18+, `ffi-napi` (Win32 bindings), `better-sqlite3`, Express 4, `ws`, React 18 + Vite, Tailwind CSS, Recharts, Docker Compose.

---

## Structure de fichiers

```
devtrack/
├── daemon/
│   ├── src/
│   │   ├── tracker.js        # boucle principale (poll + write + POST)
│   │   ├── window.js         # GetForegroundWindow + GetLastInputInfo via ffi-napi
│   │   ├── categorizer.js    # matching app_name → catégorie
│   │   ├── db.js             # écriture SQLite (better-sqlite3)
│   │   └── client.js         # HTTP POST vers l'API
│   ├── config.json           # interval, idle_threshold, db_path, api_url
│   ├── package.json
│   └── tests/
│       ├── categorizer.test.js
│       └── db.test.js
├── api/
│   ├── src/
│   │   ├── server.js         # point d'entrée Express
│   │   ├── db.js             # connexion SQLite + migrations
│   │   ├── ws.js             # WebSocket server (broadcast)
│   │   └── routes/
│   │       ├── events.js     # POST /api/events
│   │       ├── activities.js # GET /api/activities
│   │       ├── stats.js      # GET /api/stats/today, /week
│   │       ├── projects.js   # CRUD /api/projects
│   │       └── rules.js      # GET + PUT /api/rules
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── theme.js          # tokens Dark Amber
│   │   ├── api/
│   │   │   ├── http.js       # fetch wrapper
│   │   │   └── ws.js         # WebSocket hook
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   ├── StatsCards.jsx
│   │   │   ├── Timeline.jsx
│   │   │   ├── ActivityLog.jsx
│   │   │   ├── DonutChart.jsx
│   │   │   └── ProjectBreakdown.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Projects.jsx
│   │       ├── History.jsx
│   │       └── Config.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
├── data/                     # SQLite DB — gitignored, volume Docker
├── docker-compose.yml
└── .gitignore
```

---

## Task 0 : Scaffolding du projet

**Files:**
- Create: `daemon/package.json`
- Create: `daemon/config.json`
- Create: `api/package.json`
- Create: `api/Dockerfile`
- Create: `frontend/package.json`
- Create: `frontend/Dockerfile`
- Create: `docker-compose.yml`
- Modify: `.gitignore`

- [ ] **Step 1 : Créer la structure de dossiers**

```bash
mkdir -p daemon/src daemon/tests api/src/routes frontend/src/api frontend/src/components frontend/src/pages data
```

- [ ] **Step 2 : Créer `daemon/package.json`**

```json
{
  "name": "devtrack-daemon",
  "version": "1.0.0",
  "main": "src/tracker.js",
  "scripts": {
    "start": "node src/tracker.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "ffi-napi": "^4.0.3",
    "ref-napi": "^3.0.3"
  },
  "devDependencies": {}
}
```

- [ ] **Step 3 : Créer `daemon/config.json`**

```json
{
  "poll_interval_ms": 2000,
  "write_interval_ms": 5000,
  "idle_threshold_s": 120,
  "db_path": "../data/devtrack.db",
  "api_url": "http://localhost:3001"
}
```

- [ ] **Step 4 : Créer `api/package.json`**

```json
{
  "name": "devtrack-api",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.3",
    "ws": "^8.16.0",
    "cors": "^2.8.5"
  }
}
```

- [ ] **Step 5 : Créer `api/Dockerfile`**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY src/ ./src/
EXPOSE 3001
CMD ["node", "src/server.js"]
```

- [ ] **Step 6 : Créer `frontend/package.json`**

```json
{
  "name": "devtrack-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.3",
    "recharts": "^2.12.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.8"
  }
}
```

- [ ] **Step 7 : Créer `frontend/Dockerfile`**

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

- [ ] **Step 8 : Créer `frontend/nginx.conf`**

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://api:3001;
    }
    location /ws {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

- [ ] **Step 9 : Créer `docker-compose.yml`**

```yaml
services:
  api:
    build: ./api
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    environment:
      - DB_PATH=/app/data/devtrack.db
      - PORT=3001
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api
    restart: unless-stopped
```

- [ ] **Step 10 : Mettre à jour `.gitignore`**

```
.superpowers/
node_modules/
data/
*.db
dist/
.env
```

- [ ] **Step 11 : Commit**

```bash
git add .
git commit -m "chore: scaffold project structure"
```

---

## Task 1 : Schéma SQLite partagé

**Files:**
- Create: `api/src/db.js`
- Create: `api/src/seed.js`

- [ ] **Step 1 : Écrire le test du schéma**

Créer `api/tests/db.test.js` :

```js
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { createDb } from '../src/db.js';
import { mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

test('createDb crée les 3 tables', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-'));
  const db = createDb(join(dir, 'test.db'));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all().map(r => r.name);
  assert.ok(tables.includes('activities'));
  assert.ok(tables.includes('projects'));
  assert.ok(tables.includes('category_rules'));
  db.close();
});

test('createDb insère les règles par défaut', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'devtrack-'));
  const db = createDb(join(dir, 'test.db'));
  const rules = db.prepare('SELECT * FROM category_rules').all();
  assert.ok(rules.length > 0);
  const coding = rules.find(r => r.category === 'coding');
  assert.ok(coding, 'règle coding présente');
  db.close();
});
```

- [ ] **Step 2 : Lancer le test — vérifier qu'il échoue**

```bash
cd api && node --test tests/db.test.js
```
Attendu : `ERR_MODULE_NOT_FOUND` ou équivalent (fichier absent)

- [ ] **Step 3 : Créer `api/src/db.js`**

```js
import Database from 'better-sqlite3';

const SCHEMA = `
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS activities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at   TEXT NOT NULL,
    ended_at     TEXT,
    app_name     TEXT NOT NULL,
    window_title TEXT,
    category     TEXT NOT NULL,
    project_id   INTEGER REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#f59e0b',
    is_active  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS category_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_pattern TEXT NOT NULL,
    category    TEXT NOT NULL,
    priority    INTEGER NOT NULL DEFAULT 0
  );
`;

const DEFAULT_RULES = [
  { app_pattern: 'cursor.exe',            category: 'coding',        priority: 10 },
  { app_pattern: 'code.exe',              category: 'coding',        priority: 10 },
  { app_pattern: 'devenv.exe',            category: 'coding',        priority: 10 },
  { app_pattern: 'webstorm64.exe',        category: 'coding',        priority: 10 },
  { app_pattern: 'idea64.exe',            category: 'coding',        priority: 10 },
  { app_pattern: 'vim.exe',               category: 'coding',        priority: 10 },
  { app_pattern: 'nvim.exe',              category: 'coding',        priority: 10 },
  { app_pattern: 'chrome.exe',            category: 'web',           priority: 8  },
  { app_pattern: 'firefox.exe',           category: 'web',           priority: 8  },
  { app_pattern: 'msedge.exe',            category: 'web',           priority: 8  },
  { app_pattern: 'brave.exe',             category: 'web',           priority: 8  },
  { app_pattern: 'opera.exe',             category: 'web',           priority: 8  },
  { app_pattern: 'discord.exe',           category: 'communication', priority: 9  },
  { app_pattern: 'slack.exe',             category: 'communication', priority: 9  },
  { app_pattern: 'outlook.exe',           category: 'communication', priority: 9  },
  { app_pattern: 'thunderbird.exe',       category: 'communication', priority: 9  },
  { app_pattern: 'teams.exe',             category: 'communication', priority: 9  },
  { app_pattern: 'msteams.exe',           category: 'communication', priority: 9  },
  { app_pattern: 'WindowsTerminal.exe',   category: 'terminal',      priority: 7  },
  { app_pattern: 'powershell.exe',        category: 'terminal',      priority: 7  },
  { app_pattern: 'cmd.exe',               category: 'terminal',      priority: 7  },
  { app_pattern: 'wt.exe',               category: 'terminal',      priority: 7  },
  { app_pattern: 'alacritty.exe',         category: 'terminal',      priority: 7  },
  { app_pattern: 'figma.exe',             category: 'design',        priority: 6  },
  { app_pattern: 'photoshop.exe',         category: 'design',        priority: 6  },
  { app_pattern: 'illustrator.exe',       category: 'design',        priority: 6  },
];

export function createDb(path) {
  const db = new Database(path);
  db.exec(SCHEMA);
  const count = db.prepare('SELECT COUNT(*) as n FROM category_rules').get().n;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO category_rules (app_pattern, category, priority) VALUES (?, ?, ?)'
    );
    const insertMany = db.transaction((rules) => {
      for (const r of rules) insert.run(r.app_pattern, r.category, r.priority);
    });
    insertMany(DEFAULT_RULES);
  }
  return db;
}
```

- [ ] **Step 4 : Relancer le test — vérifier qu'il passe**

```bash
cd api && node --test tests/db.test.js
```
Attendu : `✓ createDb crée les 3 tables`, `✓ createDb insère les règles par défaut`

- [ ] **Step 5 : Commit**

```bash
git add api/src/db.js api/tests/db.test.js
git commit -m "feat(api): SQLite schema + default category rules"
```

---

## Task 2 : Daemon — détection fenêtre Win32

**Files:**
- Create: `daemon/src/window.js`

> Note : `ffi-napi` requiert les **Visual C++ Build Tools**. Vérifier que `npm install` réussit avant de commencer cette tâche. Si la compilation échoue : `npm install --global windows-build-tools` (PowerShell admin).

- [ ] **Step 1 : Écrire le test**

Créer `daemon/tests/window.test.js` :

```js
import { test } from 'node:test';
import { strict as assert } from 'assert';
import { getActiveWindow } from '../src/window.js';

test('getActiveWindow retourne un objet avec app_name et window_title', () => {
  const result = getActiveWindow();
  assert.ok(typeof result === 'object', 'résultat est un objet');
  assert.ok(typeof result.app_name === 'string', 'app_name est une string');
  assert.ok(typeof result.window_title === 'string', 'window_title est une string');
  assert.ok(result.app_name.length > 0, 'app_name non vide');
});

test('getIdleSeconds retourne un nombre >= 0', () => {
  const { getIdleSeconds } = await import('../src/window.js');
  const idle = getIdleSeconds();
  assert.ok(typeof idle === 'number');
  assert.ok(idle >= 0);
});
```

- [ ] **Step 2 : Lancer le test — vérifier qu'il échoue**

```bash
cd daemon && npm install && node --test tests/window.test.js
```
Attendu : module not found

- [ ] **Step 3 : Créer `daemon/src/window.js`**

```js
import ffi from 'ffi-napi';
import ref from 'ref-napi';
import path from 'path';

const DWORD  = ref.types.uint32;
const HANDLE = ref.refType(ref.types.void);

const user32 = ffi.Library('user32', {
  GetForegroundWindow:  [HANDLE, []],
  GetWindowTextW:       ['int',  [HANDLE, 'pointer', 'int']],
  GetWindowThreadProcessId: ['uint32', [HANDLE, ref.refType(DWORD)]],
  GetLastInputInfo:     ['bool', ['pointer']],
});

const kernel32 = ffi.Library('kernel32', {
  OpenProcess:          [HANDLE, ['uint32', 'bool', DWORD]],
  QueryFullProcessImageNameW: ['bool', [HANDLE, DWORD, 'pointer', ref.refType(DWORD)]],
  CloseHandle:          ['bool', [HANDLE]],
  GetTickCount:         [DWORD,  []],
});

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const LASTINPUTINFO_SIZE = 8; // UINT cbSize + DWORD dwTime

function getWindowTitle(hwnd) {
  const buf = Buffer.alloc(512);
  user32.GetWindowTextW(hwnd, buf, 256);
  return buf.slice(0, buf.indexOf(0, 0, 'ucs2') + 1).toString('ucs2').replace(/\0/g, '');
}

function getProcessName(hwnd) {
  const pidBuf = ref.alloc(DWORD);
  user32.GetWindowThreadProcessId(hwnd, pidBuf);
  const pid = pidBuf.deref();
  if (!pid) return 'unknown.exe';

  const hProc = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
  if (!hProc) return 'unknown.exe';

  try {
    const nameBuf = Buffer.alloc(1024);
    const sizeBuf = ref.alloc(DWORD, 512);
    kernel32.QueryFullProcessImageNameW(hProc, 0, nameBuf, sizeBuf);
    const full = nameBuf.slice(0, sizeBuf.deref() * 2).toString('ucs2').replace(/\0/g, '');
    return path.basename(full) || 'unknown.exe';
  } finally {
    kernel32.CloseHandle(hProc);
  }
}

export function getActiveWindow() {
  try {
    const hwnd = user32.GetForegroundWindow();
    if (!hwnd) return { app_name: 'unknown.exe', window_title: '' };
    return {
      app_name:     getProcessName(hwnd),
      window_title: getWindowTitle(hwnd),
    };
  } catch {
    return { app_name: 'unknown.exe', window_title: '' };
  }
}

export function getIdleSeconds() {
  try {
    const buf = Buffer.alloc(LASTINPUTINFO_SIZE);
    buf.writeUInt32LE(LASTINPUTINFO_SIZE, 0);
    user32.GetLastInputInfo(buf);
    const lastInput = buf.readUInt32LE(4);
    const now = kernel32.GetTickCount();
    return Math.max(0, (now - lastInput) / 1000);
  } catch {
    return 0;
  }
}
```

- [ ] **Step 4 : Relancer le test**

```bash
cd daemon && node --test tests/window.test.js
```
Attendu : les 2 tests passent (le premier retourne votre fenêtre active actuelle)

- [ ] **Step 5 : Commit**

```bash
git add daemon/src/window.js daemon/tests/window.test.js
git commit -m "feat(daemon): Win32 window + idle detection via ffi-napi"
```

---

## Task 3 : Daemon — catégoriseur

**Files:**
- Create: `daemon/src/categorizer.js`

- [ ] **Step 1 : Écrire le test**

Créer `daemon/tests/categorizer.test.js` :

```js
import { test } from 'node:test';
import { strict as assert } from 'assert';
import { categorize, loadRules } from '../src/categorizer.js';

const DEFAULT_RULES = [
  { app_pattern: 'cursor.exe',   category: 'coding',        priority: 10 },
  { app_pattern: 'chrome.exe',   category: 'web',           priority: 8  },
  { app_pattern: 'discord.exe',  category: 'communication', priority: 9  },
  { app_pattern: 'powershell*',  category: 'terminal',      priority: 7  },
];

test('categorize : cursor.exe → coding', () => {
  assert.equal(categorize('cursor.exe', DEFAULT_RULES), 'coding');
});

test('categorize : CHROME.EXE (casse) → web', () => {
  assert.equal(categorize('CHROME.EXE', DEFAULT_RULES), 'web');
});

test('categorize : powershell.exe (glob) → terminal', () => {
  assert.equal(categorize('powershell.exe', DEFAULT_RULES), 'terminal');
});

test('categorize : app inconnue → other', () => {
  assert.equal(categorize('notepad.exe', DEFAULT_RULES), 'other');
});

test('loadRules : retourne un tableau', () => {
  const rules = loadRules([]);
  assert.ok(Array.isArray(rules));
});
```

- [ ] **Step 2 : Lancer le test — vérifier qu'il échoue**

```bash
cd daemon && node --test tests/categorizer.test.js
```

- [ ] **Step 3 : Créer `daemon/src/categorizer.js`**

```js
function globMatch(pattern, str) {
  const lower = str.toLowerCase();
  const pat = pattern.toLowerCase();
  if (!pat.includes('*')) return lower === pat;
  const regex = new RegExp('^' + pat.replace(/\*/g, '.*') + '$');
  return regex.test(lower);
}

export function categorize(appName, rules) {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (globMatch(rule.app_pattern, appName)) return rule.category;
  }
  return 'other';
}

export function loadRules(rawRules) {
  return rawRules.map(r => ({
    app_pattern: r.app_pattern,
    category:    r.category,
    priority:    r.priority ?? 0,
  }));
}
```

- [ ] **Step 4 : Relancer le test**

```bash
cd daemon && node --test tests/categorizer.test.js
```
Attendu : 5 tests passent

- [ ] **Step 5 : Commit**

```bash
git add daemon/src/categorizer.js daemon/tests/categorizer.test.js
git commit -m "feat(daemon): app categorizer with glob support"
```

---

## Task 4 : Daemon — écriture SQLite

**Files:**
- Create: `daemon/src/db.js`

- [ ] **Step 1 : Écrire le test**

Créer `daemon/tests/db.test.js` :

```js
import { test } from 'node:test';
import { strict as assert } from 'assert';
import { mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { DaemonDb } from '../src/db.js';

test('upsertActivity crée puis ferme une activité', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'daemon-'));
  const db  = new DaemonDb(join(dir, 'test.db'));

  const id = db.upsertActivity({
    app_name:     'cursor.exe',
    window_title: 'test',
    category:     'coding',
    project_id:   null,
    started_at:   new Date().toISOString(),
  });
  assert.ok(typeof id === 'number');

  db.closeActivity(id, new Date().toISOString());
  const row = db.getActivity(id);
  assert.ok(row.ended_at !== null);
  db.close();
});

test('getRules retourne un tableau', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'daemon-'));
  const db  = new DaemonDb(join(dir, 'test.db'));
  const rules = db.getRules();
  assert.ok(Array.isArray(rules));
  db.close();
});
```

- [ ] **Step 2 : Lancer le test — vérifier qu'il échoue**

```bash
cd daemon && node --test tests/db.test.js
```

- [ ] **Step 3 : Créer `daemon/src/db.js`**

```js
import Database from 'better-sqlite3';

const SCHEMA = `
  PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS activities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at   TEXT NOT NULL,
    ended_at     TEXT,
    app_name     TEXT NOT NULL,
    window_title TEXT,
    category     TEXT NOT NULL,
    project_id   INTEGER
  );
  CREATE TABLE IF NOT EXISTS category_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_pattern TEXT NOT NULL,
    category    TEXT NOT NULL,
    priority    INTEGER NOT NULL DEFAULT 0
  );
`;

export class DaemonDb {
  constructor(dbPath) {
    this._db = new Database(dbPath);
    this._db.exec(SCHEMA);
    this._insert = this._db.prepare(
      `INSERT INTO activities (started_at, app_name, window_title, category, project_id)
       VALUES (@started_at, @app_name, @window_title, @category, @project_id)`
    );
    this._close = this._db.prepare(
      `UPDATE activities SET ended_at = ? WHERE id = ?`
    );
    this._get = this._db.prepare(`SELECT * FROM activities WHERE id = ?`);
    this._rules = this._db.prepare(`SELECT * FROM category_rules ORDER BY priority DESC`);
  }

  upsertActivity(activity) {
    return this._insert.run(activity).lastInsertRowid;
  }

  closeActivity(id, endedAt) {
    this._close.run(endedAt, id);
  }

  getActivity(id) {
    return this._get.get(id);
  }

  getRules() {
    return this._rules.all();
  }

  close() {
    this._db.close();
  }
}
```

- [ ] **Step 4 : Relancer le test**

```bash
cd daemon && node --test tests/db.test.js
```
Attendu : 2 tests passent

- [ ] **Step 5 : Commit**

```bash
git add daemon/src/db.js daemon/tests/db.test.js
git commit -m "feat(daemon): SQLite writer with WAL mode"
```

---

## Task 5 : Daemon — client HTTP

**Files:**
- Create: `daemon/src/client.js`

- [ ] **Step 1 : Créer `daemon/src/client.js`**

```js
export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.retryQueue = [];
  }

  async postEvent(event) {
    try {
      const res = await fetch(`${this.baseUrl}/api/events`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(event),
        signal:  AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.warn(`[client] POST failed: ${err.message} — queued for retry`);
      this.retryQueue.push(event);
      return false;
    }
  }

  async flushRetryQueue() {
    if (this.retryQueue.length === 0) return;
    const batch = [...this.retryQueue];
    this.retryQueue = [];
    for (const event of batch) {
      const ok = await this.postEvent(event);
      if (!ok) break;
    }
  }
}
```

- [ ] **Step 2 : Commit**

```bash
git add daemon/src/client.js
git commit -m "feat(daemon): HTTP client with retry queue"
```

---

## Task 6 : Daemon — boucle principale

**Files:**
- Create: `daemon/src/tracker.js`

- [ ] **Step 1 : Créer `daemon/src/tracker.js`**

```js
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getActiveWindow, getIdleSeconds } from './window.js';
import { categorize, loadRules } from './categorizer.js';
import { DaemonDb } from './db.js';
import { ApiClient } from './client.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(__dir, '../config.json'), 'utf8'));

const db     = new DaemonDb(resolve(__dir, config.db_path));
const client = new ApiClient(config.api_url);

let currentActivityId   = null;
let currentApp          = null;
let currentActivityStart = null;

function getRules() {
  return loadRules(db.getRules());
}

function closeCurrentActivity() {
  if (currentActivityId === null) return;
  const now = new Date().toISOString();
  db.closeActivity(currentActivityId, now);
  currentActivityId = null;
}

function startActivity(appName, title, category) {
  const now = new Date().toISOString();
  currentActivityStart = now;
  currentApp = appName;
  currentActivityId = db.upsertActivity({
    started_at:   now,
    app_name:     appName,
    window_title: title,
    category,
    project_id:   null,
  });
  client.postEvent({ type: 'activity_start', app_name: appName, window_title: title, category, started_at: now });
}

async function tick() {
  const idleSec = getIdleSeconds();
  const isIdle  = idleSec >= config.idle_threshold_s;

  const { app_name, window_title } = isIdle
    ? { app_name: '_idle_', window_title: '' }
    : getActiveWindow();

  const rules    = getRules();
  const category = isIdle ? 'idle' : categorize(app_name, rules);
  const key      = `${app_name}|${category}`;

  if (key !== currentApp) {
    closeCurrentActivity();
    startActivity(app_name, window_title, category);
  }
}

async function run() {
  console.log('[devtrack daemon] starting...');
  setInterval(tick, config.poll_interval_ms);
  setInterval(() => client.flushRetryQueue(), 30_000);
  process.on('SIGINT',  () => { closeCurrentActivity(); process.exit(0); });
  process.on('SIGTERM', () => { closeCurrentActivity(); process.exit(0); });
}

run();
```

- [ ] **Step 2 : Tester le daemon manuellement**

```bash
cd daemon && node src/tracker.js
```
Attendu : `[devtrack daemon] starting...` puis silence (poll en background). Changer de fenêtre → les activités s'accumulent dans `data/devtrack.db`. Vérifier avec :
```bash
node -e "import('better-sqlite3').then(({default:DB})=>{ const db=new DB('../data/devtrack.db'); console.log(db.prepare('SELECT * FROM activities LIMIT 5').all()); db.close(); })"
```

- [ ] **Step 3 : Commit**

```bash
git add daemon/src/tracker.js
git commit -m "feat(daemon): main tracking loop with idle detection"
```

---

## Task 7 : API — serveur Express + routes events

**Files:**
- Create: `api/src/server.js`
- Create: `api/src/ws.js`
- Create: `api/src/routes/events.js`

- [ ] **Step 1 : Écrire le test**

Créer `api/tests/events.test.js` :

```js
import { test } from 'node:test';
import { strict as assert } from 'assert';
import { mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createDb } from '../src/db.js';
import { createEventsRouter } from '../src/routes/events.js';
import express from 'express';

async function makeApp() {
  const dir = await mkdtemp(join(tmpdir(), 'api-'));
  const db  = createDb(join(dir, 'test.db'));
  const app = express();
  app.use(express.json());
  const broadcast = () => {};
  app.use('/api/events', createEventsRouter(db, broadcast));
  return { app, db };
}

test('POST /api/events retourne 201 et l\'id', async () => {
  const { app } = await makeApp();
  const server  = app.listen(0);
  const port    = server.address().port;

  const res = await fetch(`http://localhost:${port}/api/events`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'activity_start',
      app_name: 'cursor.exe',
      window_title: 'test',
      category: 'coding',
      started_at: new Date().toISOString(),
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id);
  server.close();
});
```

- [ ] **Step 2 : Lancer le test — vérifier qu'il échoue**

```bash
cd api && node --test tests/events.test.js
```

- [ ] **Step 3 : Créer `api/src/ws.js`**

```js
import { WebSocketServer } from 'ws';

export function createWsServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    ws.on('error', console.error);
  });

  function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send(msg);
    });
  }

  return { wss, broadcast };
}
```

- [ ] **Step 4 : Créer `api/src/routes/events.js`**

```js
import { Router } from 'express';

export function createEventsRouter(db, broadcast) {
  const router = Router();

  router.post('/', (req, res) => {
    const { app_name, window_title, category, started_at, type } = req.body;
    if (!app_name || !category || !started_at) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const stmt = db.prepare(
      `INSERT INTO activities (started_at, app_name, window_title, category)
       VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(started_at, app_name, window_title ?? '', category);
    broadcast({ type: 'activity_changed', app_name, window_title, category, started_at });
    res.status(201).json({ id: result.lastInsertRowid });
  });

  return router;
}
```

- [ ] **Step 5 : Créer `api/src/server.js`**

```js
import express from 'express';
import cors from 'cors';
import http from 'http';
import { createDb } from './db.js';
import { createWsServer } from './ws.js';
import { createEventsRouter } from './routes/events.js';
import { createActivitiesRouter } from './routes/activities.js';
import { createStatsRouter } from './routes/stats.js';
import { createProjectsRouter } from './routes/projects.js';
import { createRulesRouter } from './routes/rules.js';

const PORT   = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || './data/devtrack.db';

const app    = express();
const server = http.createServer(app);
const db     = createDb(DB_PATH);
const { broadcast } = createWsServer(server);

app.use(cors());
app.use(express.json());

app.use('/api/events',     createEventsRouter(db, broadcast));
app.use('/api/activities', createActivitiesRouter(db));
app.use('/api/stats',      createStatsRouter(db));
app.use('/api/projects',   createProjectsRouter(db));
app.use('/api/rules',      createRulesRouter(db));

app.get('/health', (_, res) => res.json({ ok: true }));

server.listen(PORT, () => console.log(`[api] listening on :${PORT}`));
```

- [ ] **Step 6 : Relancer le test**

```bash
cd api && node --test tests/events.test.js
```
Attendu : `✓ POST /api/events retourne 201 et l'id`

- [ ] **Step 7 : Commit**

```bash
git add api/src/server.js api/src/ws.js api/src/routes/events.js api/tests/events.test.js
git commit -m "feat(api): Express server + WebSocket + events endpoint"
```

---

## Task 8 : API — routes activities, stats, projects, rules

**Files:**
- Create: `api/src/routes/activities.js`
- Create: `api/src/routes/stats.js`
- Create: `api/src/routes/projects.js`
- Create: `api/src/routes/rules.js`

- [ ] **Step 1 : Créer `api/src/routes/activities.js`**

```js
import { Router } from 'express';

export function createActivitiesRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const rows = db.prepare(`
      SELECT * FROM activities
      WHERE date(started_at) = ?
      ORDER BY started_at DESC
    `).all(date);
    res.json(rows);
  });

  return router;
}
```

- [ ] **Step 2 : Créer `api/src/routes/stats.js`**

```js
import { Router } from 'express';

export function createStatsRouter(db) {
  const router = Router();

  router.get('/today', (req, res) => {
    const date = new Date().toISOString().slice(0, 10);
    const rows = db.prepare(`
      SELECT category,
             SUM(
               (strftime('%s', COALESCE(ended_at, datetime('now')))
               - strftime('%s', started_at))
             ) AS seconds
      FROM activities
      WHERE date(started_at) = ? AND category != 'idle'
      GROUP BY category
    `).all(date);

    const current = db.prepare(`
      SELECT app_name, window_title, category, started_at
      FROM activities WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1
    `).get();

    res.json({ date, by_category: rows, current });
  });

  router.get('/week', (req, res) => {
    const rows = db.prepare(`
      SELECT date(started_at) as day, category,
             SUM(
               strftime('%s', COALESCE(ended_at, datetime('now')))
               - strftime('%s', started_at)
             ) AS seconds
      FROM activities
      WHERE started_at >= datetime('now', '-7 days') AND category != 'idle'
      GROUP BY day, category
      ORDER BY day
    `).all();
    res.json(rows);
  });

  return router;
}
```

- [ ] **Step 3 : Créer `api/src/routes/projects.js`**

```js
import { Router } from 'express';

export function createProjectsRouter(db) {
  const router = Router();

  router.get('/', (_, res) => {
    res.json(db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all());
  });

  router.post('/', (req, res) => {
    const { name, color = '#f59e0b' } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = db.prepare(
      'INSERT INTO projects (name, color) VALUES (?, ?)'
    ).run(name, color);
    res.status(201).json({ id: result.lastInsertRowid, name, color });
  });

  router.patch('/:id', (req, res) => {
    const { name, color, is_active } = req.body;
    const { id } = req.params;
    if (is_active === true || is_active === 1) {
      db.prepare('UPDATE projects SET is_active = 0').run();
    }
    const fields = [];
    const vals   = [];
    if (name      !== undefined) { fields.push('name = ?');      vals.push(name); }
    if (color     !== undefined) { fields.push('color = ?');     vals.push(color); }
    if (is_active !== undefined) { fields.push('is_active = ?'); vals.push(is_active ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
    vals.push(id);
    db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
    res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  return router;
}
```

- [ ] **Step 4 : Créer `api/src/routes/rules.js`**

```js
import { Router } from 'express';

export function createRulesRouter(db) {
  const router = Router();

  router.get('/', (_, res) => {
    res.json(db.prepare('SELECT * FROM category_rules ORDER BY priority DESC').all());
  });

  router.put('/', (req, res) => {
    const rules = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'array expected' });
    db.prepare('DELETE FROM category_rules').run();
    const insert = db.prepare(
      'INSERT INTO category_rules (app_pattern, category, priority) VALUES (?, ?, ?)'
    );
    const tx = db.transaction((list) => list.forEach(r => insert.run(r.app_pattern, r.category, r.priority ?? 0)));
    tx(rules);
    res.json({ ok: true, count: rules.length });
  });

  return router;
}
```

- [ ] **Step 5 : Tester l'API manuellement**

```bash
cd api && node src/server.js
# Dans un autre terminal :
curl http://localhost:3001/health
curl http://localhost:3001/api/stats/today
curl http://localhost:3001/api/projects
```
Attendu : réponses JSON valides

- [ ] **Step 6 : Commit**

```bash
git add api/src/routes/
git commit -m "feat(api): activities, stats, projects, rules endpoints"
```

---

## Task 9 : Frontend — setup Vite + thème Dark Amber

**Files:**
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/theme.js`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`

- [ ] **Step 1 : Installer les dépendances frontend**

```bash
cd frontend && npm install
```

- [ ] **Step 2 : Créer `frontend/tailwind.config.js`**

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#0c0a00',
        surface: '#0f0d00',
        raised:  '#1c1800',
        border:  '#292400',
        muted:   '#78716c',
        primary: '#e2c97e',
        accent:  '#f59e0b',
        bright:  '#fcd34d',
        live:    '#4ade80',
      },
    },
  },
};
```

- [ ] **Step 3 : Créer `frontend/postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 4 : Créer `frontend/src/theme.js`**

```js
export const CATEGORY_COLORS = {
  coding:        '#f59e0b',
  web:           '#fb923c',
  communication: '#c084fc',
  terminal:      '#fbbf24',
  design:        '#34d399',
  idle:          '#ef4444',
  other:         '#57534e',
};

export const CATEGORY_LABELS = {
  coding:        '💻 Coding',
  web:           '🌐 Web',
  communication: '💬 Communication',
  terminal:      '🖥️ Terminal',
  design:        '🎨 Design',
  idle:          '😴 Idle',
  other:         '📦 Autre',
};

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
```

- [ ] **Step 5 : Créer `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevTrack</title>
  </head>
  <body class="bg-base text-primary">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6 : Créer `frontend/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 7 : Créer `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body { background: #0c0a00; color: #e2c97e; font-family: 'Segoe UI', system-ui, sans-serif; }
* { box-sizing: border-box; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #0f0d00; }
::-webkit-scrollbar-thumb { background: #292400; border-radius: 2px; }
```

- [ ] **Step 8 : Créer `frontend/src/App.jsx`**

```jsx
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import History from './pages/History.jsx';
import Config from './pages/Config.jsx';
import Sidebar from './components/Sidebar.jsx';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/history"  element={<History />} />
          <Route path="/config"   element={<Config />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 9 : Créer `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws':  { target: 'ws://localhost:3001', ws: true },
    },
  },
});
```

- [ ] **Step 10 : Vérifier que Vite démarre**

```bash
cd frontend && npm run dev
```
Attendu : `Local: http://localhost:5173/` sans erreur

- [ ] **Step 11 : Commit**

```bash
git add frontend/
git commit -m "feat(frontend): Vite + React + Tailwind Dark Amber setup"
```

---

## Task 10 : Frontend — API client + WebSocket hook

**Files:**
- Create: `frontend/src/api/http.js`
- Create: `frontend/src/api/ws.js`

- [ ] **Step 1 : Créer `frontend/src/api/http.js`**

```js
const BASE = import.meta.env.VITE_API_URL || '';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  put:    (path, body)   => request('PUT',    path, body),
  delete: (path)         => request('DELETE', path),
};
```

- [ ] **Step 2 : Créer `frontend/src/api/ws.js`**

```js
import { useEffect, useRef, useState } from 'react';

const WS_URL = `ws://${window.location.host}/ws`;

export function useDevTrackWs(onMessage) {
  const wsRef    = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen    = () => setConnected(true);
      ws.onclose   = () => { setConnected(false); setTimeout(connect, 3000); };
      ws.onerror   = () => ws.close();
      ws.onmessage = (e) => {
        try { onMessage(JSON.parse(e.data)); }
        catch {}
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  return connected;
}
```

- [ ] **Step 3 : Commit**

```bash
git add frontend/src/api/
git commit -m "feat(frontend): HTTP client + WebSocket hook"
```

---

## Task 11 : Frontend — Sidebar + TopBar

**Files:**
- Create: `frontend/src/components/Sidebar.jsx`
- Create: `frontend/src/components/TopBar.jsx`

- [ ] **Step 1 : Créer `frontend/src/components/Sidebar.jsx`**

```jsx
import { NavLink } from 'react-router-dom';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDuration } from '../theme.js';

const NAV = [
  { to: '/',         label: '📊 Dashboard' },
  { to: '/projects', label: '🗂 Projets'   },
  { to: '/history',  label: '📅 Historique'},
  { to: '/config',   label: '⚙ Config'     },
];

export default function Sidebar({ stats, activeProject, onProjectClick }) {
  const categories = ['coding', 'web', 'communication', 'terminal', 'design', 'idle', 'other'];
  const totalSec   = (stats?.by_category ?? []).filter(r => r.category !== 'idle').reduce((a, r) => a + r.seconds, 0);

  return (
    <aside className="w-[200px] bg-[#080600] border-r border-[#1c1800] flex flex-col p-3 flex-shrink-0">
      <div className="text-accent font-bold text-base mb-1">⏱ DevTrack</div>

      <div className="text-bright text-2xl font-bold mt-2 tabular-nums">{formatDuration(totalSec)}</div>
      <div className="text-muted text-xs uppercase tracking-widest mb-4">Temps actif</div>

      <div className="text-muted text-[10px] uppercase tracking-widest mb-1">Catégories</div>
      {categories.map(cat => {
        const row = stats?.by_category?.find(r => r.category === cat);
        return (
          <div key={cat} className="flex justify-between items-center px-2 py-1 rounded-md mb-0.5 hover:bg-raised cursor-pointer">
            <span className="text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                style={{ background: CATEGORY_COLORS[cat] }} />
              {CATEGORY_LABELS[cat]}
            </span>
            <span className="text-xs text-muted tabular-nums">{formatDuration(row?.seconds ?? 0)}</span>
          </div>
        );
      })}

      <nav className="mt-4 border-t border-[#1c1800] pt-3 flex flex-col gap-0.5">
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `text-xs px-2 py-1.5 rounded-md ${isActive ? 'bg-raised text-primary' : 'text-muted hover:bg-raised hover:text-primary'}`
            }>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-[#1c1800] pt-3">
        <div className="text-[10px] text-muted uppercase tracking-widest mb-1">Projet actif</div>
        <button onClick={onProjectClick}
          className="w-full bg-raised border border-border rounded-md px-2 py-1.5 text-xs text-bright flex justify-between items-center hover:border-accent">
          <span>{activeProject ? `● ${activeProject.name}` : 'Aucun'}</span>
          <span className="text-muted">▾</span>
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2 : Créer `frontend/src/components/TopBar.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { formatDuration, CATEGORY_COLORS } from '../theme.js';

export default function TopBar({ current, date, onPrev, onNext, canNext }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!current?.started_at) return;
    const start = new Date(current.started_at).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    setElapsed(Math.floor((Date.now() - start) / 1000));
    return () => clearInterval(id);
  }, [current?.started_at]);

  return (
    <div className="bg-surface border-b border-[#1c1800] px-5 py-2 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 bg-raised border border-border rounded-full px-3 py-1.5">
        <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
        <span className="text-live text-xs">{current?.app_name ?? '—'}</span>
        <span className="text-muted text-xs">— {current?.category ?? '—'}</span>
        <span className="text-muted mx-1">|</span>
        <span className="text-bright text-sm font-semibold tabular-nums">{formatDuration(elapsed)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <button onClick={onPrev} className="bg-raised border border-border rounded px-2 py-0.5 hover:text-primary">◀</button>
        <span>{date}</span>
        <button onClick={onNext} disabled={!canNext}
          className={`bg-raised border border-border rounded px-2 py-0.5 ${canNext ? 'hover:text-primary' : 'opacity-30 cursor-default'}`}>▶</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Commit**

```bash
git add frontend/src/components/Sidebar.jsx frontend/src/components/TopBar.jsx
git commit -m "feat(frontend): Sidebar + TopBar components"
```

---

## Task 12 : Frontend — StatsCards + DonutChart + ProjectBreakdown

**Files:**
- Create: `frontend/src/components/StatsCards.jsx`
- Create: `frontend/src/components/DonutChart.jsx`
- Create: `frontend/src/components/ProjectBreakdown.jsx`

- [ ] **Step 1 : Créer `frontend/src/components/StatsCards.jsx`**

```jsx
import { formatDuration } from '../theme.js';

function Card({ label, value, sub, pct, color }) {
  return (
    <div className="bg-surface border border-[#1c1800] rounded-lg p-3">
      <div className="text-[10px] text-muted uppercase tracking-widest mb-1">{label}</div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      {pct !== undefined && (
        <div className="h-[3px] rounded-full mt-2 bg-raised">
          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

export default function StatsCards({ stats }) {
  const byCategory = stats?.by_category ?? [];
  const totalSec   = byCategory.filter(r => r.category !== 'idle').reduce((a, r) => a + r.seconds, 0);
  const codingSec  = byCategory.find(r => r.category === 'coding')?.seconds ?? 0;
  const idleSec    = byCategory.find(r => r.category === 'idle')?.seconds ?? 0;

  return (
    <div className="grid grid-cols-4 gap-3">
      <Card label="Temps actif" value={formatDuration(totalSec)} sub="aujourd'hui" color="#f59e0b" pct={(totalSec / 28800) * 100} />
      <Card label="Coding"      value={formatDuration(codingSec)} sub={`${totalSec ? Math.round(codingSec / totalSec * 100) : 0}% du temps actif`} color="#fcd34d" pct={totalSec ? (codingSec / totalSec) * 100 : 0} />
      <Card label="Idle"        value={formatDuration(idleSec)}   sub="inactivité" color="#ef4444" pct={(idleSec / 3600) * 100} />
      <Card label="Activité"    value={stats?.current?.app_name ?? '—'} sub={stats?.current?.category ?? ''} color="#fb923c" />
    </div>
  );
}
```

- [ ] **Step 2 : Créer `frontend/src/components/DonutChart.jsx`**

```jsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDuration } from '../theme.js';

export default function DonutChart({ stats }) {
  const data = (stats?.by_category ?? [])
    .filter(r => r.category !== 'idle' && r.seconds > 0)
    .map(r => ({ name: CATEGORY_LABELS[r.category] ?? r.category, value: r.seconds, category: r.category }));

  if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted text-sm">Aucune donnée</div>;

  return (
    <div className="flex items-center gap-4 h-full">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
            {data.map(entry => (
              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? '#57534e'} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatDuration(v)} contentStyle={{ background: '#1c1800', border: '1px solid #292400', color: '#e2c97e' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5">
        {data.map(entry => (
          <div key={entry.category} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: CATEGORY_COLORS[entry.category] }} />
            <span className="text-primary">{entry.name}</span>
            <span className="text-muted ml-1">{formatDuration(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Créer `frontend/src/components/ProjectBreakdown.jsx`**

```jsx
import { formatDuration } from '../theme.js';
import { api } from '../api/http.js';
import { useEffect, useState } from 'react';

export default function ProjectBreakdown() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch(() => {});
  }, []);

  if (projects.length === 0) return <div className="text-muted text-xs">Aucun projet créé</div>;

  return (
    <div className="flex flex-col gap-2">
      {projects.map(p => (
        <div key={p.id} className="bg-base border border-[#1c1800] rounded px-3 py-2">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: p.color }}>● {p.name}</span>
            {p.is_active === 1 && <span className="text-[10px] bg-raised text-live px-1.5 rounded">actif</span>}
          </div>
          <div className="h-1 bg-raised rounded-full">
            <div className="h-full rounded-full" style={{ width: '40%', background: p.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4 : Commit**

```bash
git add frontend/src/components/StatsCards.jsx frontend/src/components/DonutChart.jsx frontend/src/components/ProjectBreakdown.jsx
git commit -m "feat(frontend): StatsCards, DonutChart, ProjectBreakdown"
```

---

## Task 13 : Frontend — Timeline + ActivityLog

**Files:**
- Create: `frontend/src/components/Timeline.jsx`
- Create: `frontend/src/components/ActivityLog.jsx`

- [ ] **Step 1 : Créer `frontend/src/components/Timeline.jsx`**

```jsx
import { CATEGORY_COLORS } from '../theme.js';

function getTimePercent(isoStr) {
  const d = new Date(isoStr);
  return ((d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400) * 100;
}

export default function Timeline({ activities }) {
  const now = new Date();
  const startPct = 8 / 24 * 100; // afficher à partir de 8h
  const endPct   = Math.min((now.getHours() + now.getMinutes() / 60) / 24 * 100, 100);
  const range    = endPct - startPct;

  const hours = Array.from({ length: 9 }, (_, i) => i + 9);

  return (
    <div>
      <div className="relative h-5 bg-raised rounded overflow-hidden mb-1">
        {(activities ?? []).map((act, i) => {
          const s = Math.max(getTimePercent(act.started_at), startPct);
          const e = act.ended_at ? Math.min(getTimePercent(act.ended_at), endPct) : endPct;
          const left  = ((s - startPct) / range) * 100;
          const width = ((e - s) / range) * 100;
          if (width <= 0) return null;
          return (
            <div key={i} className="absolute top-0 h-full"
              style={{ left: `${left}%`, width: `${width}%`, background: CATEGORY_COLORS[act.category] ?? '#57534e' }}
              title={`${act.app_name} (${act.category})`} />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted/50">
        {hours.map(h => <span key={h}>{h}h</span>)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Créer `frontend/src/components/ActivityLog.jsx`**

```jsx
import { CATEGORY_COLORS, formatDuration } from '../theme.js';

function duration(a) {
  const end = a.ended_at ? new Date(a.ended_at) : new Date();
  return Math.floor((end - new Date(a.started_at)) / 1000);
}

function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityLog({ activities }) {
  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto">
      {(activities ?? []).slice(0, 20).map((act, i) => (
        <div key={i} className="flex items-center gap-2 bg-base border border-[#1c1800] rounded px-2 py-1.5 text-xs">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[act.category] }} />
          <span className="text-primary flex-none w-28 truncate">{act.app_name}</span>
          <span className="text-muted flex-1 truncate">{act.window_title}</span>
          <span className="text-muted/70 flex-none">{formatDuration(duration(act))}</span>
          <span className="text-muted/40 flex-none">{timeStr(act.started_at)}</span>
        </div>
      ))}
      {(!activities || activities.length === 0) && (
        <div className="text-muted text-xs text-center py-4">Aucune activité aujourd'hui</div>
      )}
    </div>
  );
}
```

- [ ] **Step 3 : Commit**

```bash
git add frontend/src/components/Timeline.jsx frontend/src/components/ActivityLog.jsx
git commit -m "feat(frontend): Timeline + ActivityLog components"
```

---

## Task 14 : Frontend — page Dashboard (assemblage final)

**Files:**
- Create: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1 : Créer `frontend/src/pages/Dashboard.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react';
import TopBar from '../components/TopBar.jsx';
import StatsCards from '../components/StatsCards.jsx';
import Timeline from '../components/Timeline.jsx';
import ActivityLog from '../components/ActivityLog.jsx';
import DonutChart from '../components/DonutChart.jsx';
import ProjectBreakdown from '../components/ProjectBreakdown.jsx';
import { api } from '../api/http.js';
import { useDevTrackWs } from '../api/ws.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [date,       setDate]       = useState(todayStr());
  const [stats,      setStats]      = useState(null);
  const [activities, setActivities] = useState([]);

  const loadData = useCallback(async (d) => {
    const [s, a] = await Promise.all([
      api.get('/api/stats/today').catch(() => null),
      api.get(`/api/activities?date=${d}`).catch(() => []),
    ]);
    setStats(s);
    setActivities(a);
  }, []);

  useEffect(() => { loadData(date); }, [date]);

  useDevTrackWs((msg) => {
    if (msg.type === 'activity_changed') loadData(date);
  });

  const isToday  = date === todayStr();
  const prevDay  = () => setDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); });
  const nextDay  = () => { if (!isToday) setDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().slice(0, 10); }); };

  return (
    <div className="flex flex-col h-full">
      <TopBar current={stats?.current} date={date} onPrev={prevDay} onNext={nextDay} canNext={!isToday} />

      <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
        <StatsCards stats={stats} />

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Gauche : timeline + log */}
          <div className="bg-surface border border-[#1c1800] rounded-lg p-4 flex flex-col gap-3 overflow-hidden">
            <div className="text-[10px] text-muted uppercase tracking-widest">Timeline du jour</div>
            <Timeline activities={activities} />
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">Activité récente</div>
            <div className="flex-1 overflow-hidden">
              <ActivityLog activities={activities} />
            </div>
          </div>

          {/* Droite : donut + projets */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface border border-[#1c1800] rounded-lg p-4 flex-1">
              <div className="text-[10px] text-muted uppercase tracking-widest mb-3">Répartition du jour</div>
              <div className="h-32">
                <DonutChart stats={stats} />
              </div>
            </div>
            <div className="bg-surface border border-[#1c1800] rounded-lg p-4">
              <div className="text-[10px] text-muted uppercase tracking-widest mb-3">Projets</div>
              <ProjectBreakdown />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Mettre à jour `App.jsx` pour passer les props à Sidebar**

Modifier `frontend/src/App.jsx` pour charger le projet actif et les stats côté App et les passer à `<Sidebar>` :

```jsx
import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Projects from './pages/Projects.jsx';
import History from './pages/History.jsx';
import Config from './pages/Config.jsx';
import Sidebar from './components/Sidebar.jsx';
import { api } from './api/http.js';

export default function App() {
  const [stats,         setStats]         = useState(null);
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => {
    api.get('/api/stats/today').then(setStats).catch(() => {});
    api.get('/api/projects').then(ps => setActiveProject(ps.find(p => p.is_active === 1) ?? null)).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar stats={stats} activeProject={activeProject} onProjectClick={() => {}} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/history"  element={<History />} />
          <Route path="/config"   element={<Config />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 3 : Créer les pages stub (Projects, History, Config) pour que le router ne casse pas**

`frontend/src/pages/Projects.jsx` :
```jsx
export default function Projects() { return <div className="p-6 text-primary">🗂 Projets — à venir</div>; }
```

`frontend/src/pages/History.jsx` :
```jsx
export default function History() { return <div className="p-6 text-primary">📅 Historique — à venir</div>; }
```

`frontend/src/pages/Config.jsx` :
```jsx
export default function Config() { return <div className="p-6 text-primary">⚙ Config — à venir</div>; }
```

- [ ] **Step 4 : Tester le dashboard en local**

```bash
cd api && node src/server.js &
cd frontend && npm run dev
```
Ouvrir `http://localhost:5173`. La sidebar, la topbar et les cartes doivent s'afficher. Sans daemon actif, les stats sont vides — c'est normal.

- [ ] **Step 5 : Commit**

```bash
git add frontend/src/pages/ frontend/src/App.jsx
git commit -m "feat(frontend): Dashboard page assembled + stub pages"
```

---

## Task 15 : Frontend — pages Projects + Config (fonctionnelles)

**Files:**
- Modify: `frontend/src/pages/Projects.jsx`
- Modify: `frontend/src/pages/Config.jsx`

- [ ] **Step 1 : Remplacer `frontend/src/pages/Projects.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { api } from '../api/http.js';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [name,     setName]     = useState('');
  const [color,    setColor]    = useState('#f59e0b');

  const load = () => api.get('/api/projects').then(setProjects).catch(() => {});
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/api/projects', { name: name.trim(), color });
    setName(''); load();
  }

  async function activate(id) {
    await api.patch(`/api/projects/${id}`, { is_active: true });
    load();
  }

  async function remove(id) {
    await api.delete(`/api/projects/${id}`);
    load();
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-accent font-bold text-lg mb-4">🗂 Projets</h1>

      <form onSubmit={create} className="flex gap-2 mb-6">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Nom du projet" required
          className="flex-1 bg-raised border border-border rounded px-3 py-2 text-sm text-primary placeholder-muted outline-none focus:border-accent" />
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          className="w-10 h-10 rounded border border-border bg-raised cursor-pointer" />
        <button type="submit"
          className="bg-accent text-base font-semibold px-4 py-2 rounded text-sm hover:bg-bright">
          Créer
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {projects.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-surface border border-[#1c1800] rounded-lg px-4 py-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="flex-1 text-sm text-primary">{p.name}</span>
            {p.is_active === 1 && <span className="text-[10px] text-live bg-raised px-2 py-0.5 rounded">actif</span>}
            <button onClick={() => activate(p.id)}
              className="text-xs text-muted hover:text-accent border border-border rounded px-2 py-0.5">
              Activer
            </button>
            <button onClick={() => remove(p.id)}
              className="text-xs text-muted hover:text-red-400 border border-border rounded px-2 py-0.5">
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Remplacer `frontend/src/pages/Config.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { api } from '../api/http.js';

const CATEGORIES = ['coding', 'web', 'communication', 'terminal', 'design', 'other'];

export default function Config() {
  const [rules,   setRules]   = useState([]);
  const [pattern, setPattern] = useState('');
  const [cat,     setCat]     = useState('coding');

  const load = () => api.get('/api/rules').then(setRules).catch(() => {});
  useEffect(() => { load(); }, []);

  async function addRule(e) {
    e.preventDefault();
    if (!pattern.trim()) return;
    const newRules = [...rules, { app_pattern: pattern.trim(), category: cat, priority: 5 }];
    await api.put('/api/rules', newRules);
    setPattern(''); load();
  }

  async function removeRule(idx) {
    const newRules = rules.filter((_, i) => i !== idx);
    await api.put('/api/rules', newRules);
    load();
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-accent font-bold text-lg mb-4">⚙ Configuration</h1>
      <h2 className="text-sm text-muted uppercase tracking-widest mb-3">Règles de catégorisation</h2>

      <form onSubmit={addRule} className="flex gap-2 mb-4">
        <input value={pattern} onChange={e => setPattern(e.target.value)}
          placeholder="app_pattern (ex: cursor.exe, chrome*)"
          className="flex-1 bg-raised border border-border rounded px-3 py-2 text-sm text-primary placeholder-muted outline-none focus:border-accent" />
        <select value={cat} onChange={e => setCat(e.target.value)}
          className="bg-raised border border-border rounded px-2 py-2 text-sm text-primary">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="bg-accent text-base font-semibold px-4 py-2 rounded text-sm hover:bg-bright">
          Ajouter
        </button>
      </form>

      <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center gap-3 bg-surface border border-[#1c1800] rounded px-3 py-2 text-xs">
            <span className="text-bright font-mono flex-1">{r.app_pattern}</span>
            <span className="text-muted">→</span>
            <span className="text-accent">{r.category}</span>
            <span className="text-muted/50 ml-auto">p:{r.priority}</span>
            <button onClick={() => removeRule(i)} className="text-muted hover:text-red-400 ml-1">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Commit**

```bash
git add frontend/src/pages/Projects.jsx frontend/src/pages/Config.jsx
git commit -m "feat(frontend): Projects + Config pages functional"
```

---

## Task 16 : Frontend — page Historique

**Files:**
- Modify: `frontend/src/pages/History.jsx`

- [ ] **Step 1 : Remplacer `frontend/src/pages/History.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/http.js';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDuration } from '../theme.js';

const CATEGORIES = ['coding', 'web', 'communication', 'terminal', 'design'];

export default function History() {
  const [weekData, setWeekData] = useState([]);

  useEffect(() => {
    api.get('/api/stats/week').then(rows => {
      const byDay = {};
      for (const row of rows) {
        if (!byDay[row.day]) byDay[row.day] = { day: row.day };
        byDay[row.day][row.category] = row.seconds;
      }
      setWeekData(Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)));
    }).catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-accent font-bold text-lg mb-4">📅 Historique — 7 derniers jours</h1>

      <div className="bg-surface border border-[#1c1800] rounded-lg p-4 mb-4">
        <div className="text-[10px] text-muted uppercase tracking-widest mb-4">Temps par catégorie</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={weekData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fill: '#78716c', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fill: '#78716c', fontSize: 11 }} tickFormatter={s => `${Math.floor(s / 3600)}h`} />
            <Tooltip
              formatter={(v, name) => [formatDuration(v), CATEGORY_LABELS[name] ?? name]}
              contentStyle={{ background: '#1c1800', border: '1px solid #292400', color: '#e2c97e' }}
            />
            {CATEGORIES.map(cat => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {weekData.map(day => {
          const total = CATEGORIES.reduce((a, c) => a + (day[c] ?? 0), 0);
          return (
            <div key={day.day} className="bg-surface border border-[#1c1800] rounded-lg p-3">
              <div className="text-[10px] text-muted mb-1">{new Date(day.day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</div>
              <div className="text-base font-bold text-bright tabular-nums">{formatDuration(total)}</div>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {CATEGORIES.filter(c => day[c] > 0).map(c => (
                  <div key={c} className="flex justify-between text-[10px]">
                    <span style={{ color: CATEGORY_COLORS[c] }}>{CATEGORY_LABELS[c]}</span>
                    <span className="text-muted">{formatDuration(day[c])}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add frontend/src/pages/History.jsx
git commit -m "feat(frontend): History page with weekly bar chart"
```

---

## Task 17 : Intégration Docker + test bout en bout

**Files:**
- Vérification de `docker-compose.yml` (Task 0)

- [ ] **Step 1 : Builder les images Docker**

```bash
docker compose build
```
Attendu : `api` et `frontend` buildent sans erreur

- [ ] **Step 2 : Lancer la stack**

```bash
docker compose up -d
```
Attendu : les 2 containers démarrent. Vérifier :
```bash
docker compose ps
curl http://localhost:3001/health
```
Attendu : `{"ok":true}`

- [ ] **Step 3 : Lancer le daemon en parallèle**

```bash
cd daemon && node src/tracker.js
```

- [ ] **Step 4 : Ouvrir le dashboard**

Ouvrir `http://localhost:3000`. Vérifier :
- La sidebar affiche les catégories
- La topbar affiche l'app active (cursor.exe ou similaire)
- Le timer live s'incrémente en temps réel
- Changer de fenêtre → le dashboard se met à jour en quelques secondes

- [ ] **Step 5 : Créer un projet de test**

- Aller sur `http://localhost:3000/projects`
- Créer un projet "ia-test" en jaune
- Cliquer "Activer"
- Vérifier que la sidebar affiche "🟡 ia-test"

- [ ] **Step 6 : Commit final**

```bash
git add .
git commit -m "chore: full stack integration verified"
```

---

## Task 18 : Daemon autostart Windows (optionnel)

- [ ] **Step 1 : Créer `daemon/start-daemon.bat`**

```bat
@echo off
cd /d "%~dp0"
node src/tracker.js >> logs/daemon.log 2>&1
```

- [ ] **Step 2 : Enregistrer dans Task Scheduler**

```powershell
$action  = New-ScheduledTaskAction -Execute "node" -Argument "src/tracker.js" -WorkingDirectory "C:\Users\flori\Documents\ia test\daemon"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "DevTrack Daemon" -Action $action -Trigger $trigger -RunLevel Highest
```

- [ ] **Step 3 : Commit**

```bash
git add daemon/start-daemon.bat
git commit -m "chore(daemon): Windows Task Scheduler autostart script"
```

---

## Récapitulatif des commandes de lancement

```bash
# Terminal 1 — daemon (natif Windows)
cd daemon && node src/tracker.js

# Terminal 2 — stack Docker
docker compose up -d

# Dashboard
open http://localhost:3000

# Dev frontend (hot reload)
cd frontend && npm run dev   # → http://localhost:5173
```
