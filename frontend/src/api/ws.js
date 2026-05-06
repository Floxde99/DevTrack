import { useEffect, useRef, useState } from 'react';

function defaultWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

export function useDevTrackWs(onMessage) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;

    function connect() {
      if (stopped) return;
      const url = import.meta.env.VITE_WS_URL || defaultWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!stopped) setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        try {
          onMessage(JSON.parse(e.data));
        } catch {
          // ignore
        }
      };
    }

    connect();
    return () => {
      stopped = true;
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return connected;
}

