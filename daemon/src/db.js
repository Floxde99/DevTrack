function loadBetterSqlite3() {
  // eslint-disable-next-line global-require
  return require('better-sqlite3');
}

const SCHEMA = `
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS activities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at   TEXT NOT NULL,
    ended_at     TEXT,
    app_name     TEXT NOT NULL,
    window_title TEXT,
    pid            INTEGER,
    exe_path       TEXT,
    browser_domain TEXT,
    browser_url    TEXT,
    activity_level TEXT,
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

function ensureActivitiesColumns(db) {
  const cols = db.prepare(`PRAGMA table_info(activities)`).all();
  const names = new Set(cols.map((c) => c.name));

  if (!names.has('browser_domain')) db.exec(`ALTER TABLE activities ADD COLUMN browser_domain TEXT;`);
  if (!names.has('browser_url')) db.exec(`ALTER TABLE activities ADD COLUMN browser_url TEXT;`);
  if (!names.has('pid')) db.exec(`ALTER TABLE activities ADD COLUMN pid INTEGER;`);
  if (!names.has('exe_path')) db.exec(`ALTER TABLE activities ADD COLUMN exe_path TEXT;`);
  if (!names.has('activity_level')) db.exec(`ALTER TABLE activities ADD COLUMN activity_level TEXT;`);
}

class DaemonDb {
  constructor(dbPath) {
    const Database = loadBetterSqlite3();
    this._db = new Database(dbPath);
    this._db.exec(SCHEMA);
    ensureActivitiesColumns(this._db);

    this._insertActivity = this._db.prepare(
      `INSERT INTO activities (
         started_at, app_name, window_title, pid, exe_path,
         browser_domain, browser_url, activity_level,
         category, project_id
       )
       VALUES (
         @started_at, @app_name, @window_title, @pid, @exe_path,
         @browser_domain, @browser_url, @activity_level,
         @category, @project_id
       )`
    );
    this._closeActivity = this._db.prepare(`UPDATE activities SET ended_at = ? WHERE id = ?`);
    this._updateBrowserContext = this._db.prepare(
      `UPDATE activities
       SET browser_domain = COALESCE(@browser_domain, browser_domain),
           browser_url = COALESCE(@browser_url, browser_url),
           window_title = COALESCE(@window_title, window_title),
           activity_level = COALESCE(@activity_level, activity_level)
       WHERE id = @id`
    );
    this._getActivity = this._db.prepare(`SELECT * FROM activities WHERE id = ?`);
    this._getRules = this._db.prepare(`SELECT * FROM category_rules ORDER BY priority DESC, id ASC`);
  }

  upsertActivity(activity) {
    const res = this._insertActivity.run({
      window_title: '',
      pid: null,
      exe_path: '',
      browser_domain: null,
      browser_url: null,
      activity_level: null,
      project_id: null,
      ...activity,
    });
    return Number(res.lastInsertRowid);
  }

  closeActivity(id, endedAt) {
    this._closeActivity.run(endedAt, id);
  }

  updateBrowserContext(id, context) {
    this._updateBrowserContext.run({
      id,
      browser_domain: context?.browser_domain ?? null,
      browser_url: context?.browser_url ?? null,
      window_title: context?.window_title ?? null,
      activity_level: context?.activity_level ?? null,
    });
  }

  getActivity(id) {
    return this._getActivity.get(id);
  }

  getRules() {
    return this._getRules.all();
  }

  close() {
    this._db.close();
  }
}

module.exports = { DaemonDb };

