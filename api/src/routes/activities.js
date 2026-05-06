const { Router } = require('express');

function createActivitiesRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const date = req.query.date ?? new Date().toISOString().slice(0, 10);
    const rows = db
      .prepare(
        `
        SELECT *
        FROM activities
        WHERE date(started_at) = ?
        ORDER BY started_at DESC
      `
      )
      .all(date);
    return res.json(rows);
  });

  return router;
}

module.exports = { createActivitiesRouter };

