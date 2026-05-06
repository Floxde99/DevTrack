const { WebSocketServer } = require('ws');

function createWsServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('error', () => {});
  });

  function broadcast(payload) {
    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(message);
    }
  }

  return { wss, broadcast };
}

module.exports = { createWsServer };

