const cors = require('cors');
const express = require('express');
const http = require('node:http');

const { createDb } = require('./db.js');
const { createWsServer } = require('./ws.js');
const { createEventsRouter } = require('./routes/events.js');
const { createActivitiesRouter } = require('./routes/activities.js');
const { createStatsRouter } = require('./routes/stats.js');
const { createProjectsRouter } = require('./routes/projects.js');
const { createRulesRouter } = require('./routes/rules.js');
const { createIdeContextRouter } = require('./routes/ideContext.js');

const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.DB_PATH ?? './data/devtrack.db';

const app = express();
const server = http.createServer(app);

const db = createDb(DB_PATH);
const { broadcast } = createWsServer(server);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/events', createEventsRouter(db, broadcast));
app.use('/api/ide-context', createIdeContextRouter(db));
app.use('/api/activities', createActivitiesRouter(db));
app.use('/api/stats', createStatsRouter(db));
app.use('/api/projects', createProjectsRouter(db));
app.use('/api/rules', createRulesRouter(db));

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${PORT}`);
});

