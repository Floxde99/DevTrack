const Database = require('better-sqlite3');

const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#f59e0b',
    is_active  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at   TEXT NOT NULL,
    ended_at     TEXT,
    app_name     TEXT NOT NULL,
    window_title TEXT,
    category     TEXT NOT NULL,
    project_id   INTEGER REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS category_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_pattern TEXT NOT NULL,
    category    TEXT NOT NULL,
    priority    INTEGER NOT NULL DEFAULT 0
  );
`;

const DEFAULT_RULES = [
  { app_pattern: 'cursor.exe', category: 'coding', priority: 10 },
  { app_pattern: 'code.exe', category: 'coding', priority: 10 },
  { app_pattern: 'devenv.exe', category: 'coding', priority: 10 },
  { app_pattern: 'webstorm64.exe', category: 'coding', priority: 10 },
  { app_pattern: 'idea64.exe', category: 'coding', priority: 10 },
  { app_pattern: 'vim.exe', category: 'coding', priority: 10 },
  { app_pattern: 'nvim.exe', category: 'coding', priority: 10 },

  { app_pattern: 'chrome.exe', category: 'web', priority: 8 },
  { app_pattern: 'firefox.exe', category: 'web', priority: 8 },
  { app_pattern: 'msedge.exe', category: 'web', priority: 8 },
  { app_pattern: 'brave.exe', category: 'web', priority: 8 },
  { app_pattern: 'opera.exe', category: 'web', priority: 8 },

  { app_pattern: 'discord.exe', category: 'communication', priority: 9 },
  { app_pattern: 'slack.exe', category: 'communication', priority: 9 },
  { app_pattern: 'outlook.exe', category: 'communication', priority: 9 },
  { app_pattern: 'thunderbird.exe', category: 'communication', priority: 9 },
  { app_pattern: 'teams.exe', category: 'communication', priority: 9 },
  { app_pattern: 'msteams.exe', category: 'communication', priority: 9 },

  { app_pattern: 'WindowsTerminal.exe', category: 'terminal', priority: 7 },
  { app_pattern: 'powershell.exe', category: 'terminal', priority: 7 },
  { app_pattern: 'cmd.exe', category: 'terminal', priority: 7 },
  { app_pattern: 'wt.exe', category: 'terminal', priority: 7 },
  { app_pattern: 'alacritty.exe', category: 'terminal', priority: 7 },

  { app_pattern: 'figma.exe', category: 'design', priority: 6 },
  { app_pattern: 'photoshop.exe', category: 'design', priority: 6 },
  { app_pattern: 'illustrator.exe', category: 'design', priority: 6 },
];

function seedDefaultRules(db) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM category_rules').get().n;
  if (count !== 0) return;

  const insert = db.prepare(
    'INSERT INTO category_rules (app_pattern, category, priority) VALUES (?, ?, ?)'
  );
  const tx = db.transaction((rules) => {
    for (const r of rules) insert.run(r.app_pattern, r.category, r.priority);
  });
  tx(DEFAULT_RULES);
}

function createDb(dbPath) {
  const db = new Database(dbPath);
  db.exec(SCHEMA_SQL);
  seedDefaultRules(db);
  return db;
}

module.exports = { createDb, DEFAULT_RULES };

