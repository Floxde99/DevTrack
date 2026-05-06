const Database = require('better-sqlite3');

const IDE_CONTEXT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ide_context (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    repo_name      TEXT,
    repo_path      TEXT,
    git_branch     TEXT,
    active_file    TEXT,
    editor_name    TEXT,
    editor_version TEXT,
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

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
    pid          INTEGER,
    exe_path     TEXT,
    browser_domain TEXT,
    browser_url    TEXT,
    activity_level TEXT,
    category     TEXT NOT NULL,
    project_id   INTEGER REFERENCES projects(id),
    repo_name     TEXT,
    repo_path     TEXT,
    git_branch    TEXT,
    active_file   TEXT,
    editor_name   TEXT,
    editor_version TEXT
  );

  CREATE TABLE IF NOT EXISTS category_rules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_pattern TEXT NOT NULL,
    category    TEXT NOT NULL,
    priority    INTEGER NOT NULL DEFAULT 0
  );

  ${IDE_CONTEXT_TABLE_SQL}
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
  migrateDb(db);
  seedDefaultRules(db);
  return db;
}

module.exports = { createDb, DEFAULT_RULES };

function tableColumns(db, table) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(rows.map((r) => r.name));
}

function addColumnIfMissing(db, table, column, definitionSql) {
  const cols = tableColumns(db, table);
  if (cols.has(column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definitionSql}`);
}

function migrateDb(db) {
  // Existing databases were created before IDE context existed.
  addColumnIfMissing(db, 'activities', 'repo_name', 'TEXT');
  addColumnIfMissing(db, 'activities', 'repo_path', 'TEXT');
  addColumnIfMissing(db, 'activities', 'git_branch', 'TEXT');
  addColumnIfMissing(db, 'activities', 'active_file', 'TEXT');
  addColumnIfMissing(db, 'activities', 'editor_name', 'TEXT');
  addColumnIfMissing(db, 'activities', 'editor_version', 'TEXT');
  addColumnIfMissing(db, 'activities', 'browser_domain', 'TEXT');
  addColumnIfMissing(db, 'activities', 'browser_url', 'TEXT');
  addColumnIfMissing(db, 'activities', 'pid', 'INTEGER');
  addColumnIfMissing(db, 'activities', 'exe_path', 'TEXT');
  addColumnIfMissing(db, 'activities', 'activity_level', 'TEXT');

  // Ensure ide_context schema exists (older DBs won't have it).
  db.exec(IDE_CONTEXT_TABLE_SQL);
  addColumnIfMissing(db, 'ide_context', 'repo_name', 'TEXT');
  addColumnIfMissing(db, 'ide_context', 'repo_path', 'TEXT');
  addColumnIfMissing(db, 'ide_context', 'git_branch', 'TEXT');
  addColumnIfMissing(db, 'ide_context', 'active_file', 'TEXT');
  addColumnIfMissing(db, 'ide_context', 'editor_name', 'TEXT');
  addColumnIfMissing(db, 'ide_context', 'editor_version', 'TEXT');
  addColumnIfMissing(db, 'ide_context', 'updated_at', "TEXT NOT NULL DEFAULT (datetime('now'))");

  // Ensure singleton ide_context row exists (id = 1).
  db.prepare(`INSERT OR IGNORE INTO ide_context (id) VALUES (1)`).run();
}

