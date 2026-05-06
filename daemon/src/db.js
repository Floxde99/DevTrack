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

class DaemonDb {
  constructor(dbPath) {
    const Database = loadBetterSqlite3();
    this._db = new Database(dbPath);
    this._db.exec(SCHEMA);

    this._insertActivity = this._db.prepare(
      `INSERT INTO activities (started_at, app_name, window_title, category, project_id)
       VALUES (@started_at, @app_name, @window_title, @category, @project_id)`
    );
    this._closeActivity = this._db.prepare(`UPDATE activities SET ended_at = ? WHERE id = ?`);
    this._getActivity = this._db.prepare(`SELECT * FROM activities WHERE id = ?`);
    this._getRules = this._db.prepare(`SELECT * FROM category_rules ORDER BY priority DESC, id ASC`);
  }

  upsertActivity(activity) {
    const res = this._insertActivity.run({
      window_title: '',
      project_id: null,
      ...activity,
    });
    return Number(res.lastInsertRowid);
  }

  closeActivity(id, endedAt) {
    this._closeActivity.run(endedAt, id);
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

