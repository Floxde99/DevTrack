# DevTrack

Windows time tracking for dev work: a **Windows daemon** collects activity, writes to **SQLite**, and an **Express API + React dashboard** (Docker) shows it in real time.

## Architecture (quick)

- **Daemon (Windows, host)**: polls active window + idle time → writes to `./data/devtrack.db` → POST events to API
- **API (Docker)**: reads the same SQLite DB (volume) + WebSocket broadcast
- **Frontend (Docker)**: dashboard UI

## Prerequisites

- **Windows 10/11**
- **Docker Desktop** (running)
- **Node.js** installed on the host to run the daemon
- **PowerShell** available (for the Windows window/idle collector)

## Quickstart

### 1) Start API + Frontend (Docker)

From repo root:

```powershell
docker compose up --build
```

- Frontend: `http://localhost:3000`
- API health: `http://localhost:3001/health`

### 2) Start the daemon (Windows host)

In a second terminal:

```powershell
cd "daemon"
npm install
npm start
```

Optional prereq check:

```powershell
.\scripts\check-prereqs.ps1
```

Optional helper script (starts docker compose):

```powershell
.\scripts\dev.ps1
```

The daemon uses `daemon/config.json`:

- `api_url`: defaults to `http://localhost:3001`
- `db_path`: defaults to `../../data/devtrack.db`

## Data / SQLite

- The database file is `./data/devtrack.db` (created automatically).
- SQLite runs in **WAL** mode to allow concurrent access (daemon + API).

## Troubleshooting

### `better-sqlite3` / Node native module mismatch (NODE_MODULE_VERSION)

If you see an error like:

> compiled against a different Node.js version using NODE_MODULE_VERSION 127 … requires 137

Fix (from `daemon/`):

```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules
npm install
```

Then rerun:

```powershell
npm start
```

### Docker isn’t running

If `docker compose up` fails, start Docker Desktop first and retry.

## Smoke test (end-to-end)

1. `docker compose up --build`
2. Confirm API: open `http://localhost:3001/health` → `{ "ok": true }`
3. Start daemon: `cd daemon; npm install; npm start`
4. Open `http://localhost:3000` and confirm the dashboard loads (and stats endpoints respond)

