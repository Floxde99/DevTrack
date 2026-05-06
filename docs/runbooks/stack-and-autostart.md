# DevTrack runbook: stack + autostart

This runbook documents how to run the Docker stack (API + frontend) and how to set up (and undo) Windows autostart for the DevTrack daemon.

## Docker stack (API + frontend)

### Start (recommended)

From repo root:

```powershell
.\scripts\stack-start.ps1 -Build -WaitTimeoutSeconds 90
```

What it does:

- Runs `docker compose up -d` (optionally `--build`)
- Waits for service health (`--wait`) up to the provided timeout
- Prints `docker compose ps`

### Stop

```powershell
.\scripts\stack-stop.ps1
```

This stops and removes containers, **but keeps** the `./data/` directory on disk.

To also remove named volumes (if you add any later):

```powershell
.\scripts\stack-stop.ps1 -RemoveVolumes
```

### Status + logs

```powershell
.\scripts\stack-status.ps1
```

### Healthchecks

The Compose file includes healthchecks for:

- **API**: `GET http://localhost:3001/health`
- **Frontend**: `GET http://localhost:3000/`

The frontend `depends_on` waits for the API to be **healthy** before starting.

## Windows autostart (daemon)

The daemon reads the active window/idle state, so it should run in an **interactive user session**. This runbook configures a Task Scheduler entry that runs **at logon**.

### Register (enable autostart)

From repo root:

```powershell
.\scripts\autostart\register-devtrack-daemon.ps1 -Force
```

Notes:

- Creates a scheduled task named **"DevTrack Daemon"**
- Trigger: **At logon**
- Action: runs `.\scripts\autostart\run-daemon.ps1` hidden
- Log output: `.\logs\devtrack-daemon-autostart.log`

### Unregister (disable autostart)

```powershell
.\scripts\autostart\unregister-devtrack-daemon.ps1
```

### Manual XML import (optional)

If you prefer Task Scheduler XML import, use:

- `scripts\autostart\DevTrack-Daemon-Logon.template.xml`

It contains `__REPO_ROOT__` and `__USER_ID__` placeholders, so it’s mainly meant as a reference/template. The PowerShell scripts above are the recommended, reversible way to manage the task.

