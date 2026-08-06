const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const AbletonLink = require("abletonlink");

const PORT = Number(process.env.PORT) || 3000;
const BROADCAST_INTERVAL_MS = 50;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve static assets from the built client bundle by default.
const staticDir = path.join(__dirname, "..", "dist");
app.use(express.static(staticDir));

// Ableton Link session (default: 160 BPM, quantum = 4 beats, enabled).
const link = new AbletonLink(160, 4, true);

link.on("numPeers", (numPeers) => console.log(`Ableton Link peers: ${numPeers}`));
link.on("tempo", (bpm) => console.log(`Ableton Link tempo: ${bpm} BPM`));

function currentState() {
  // link.beat/phase/bpm read a cached session-state snapshot that only
  // refreshes on link.update() (driven below by startUpdate), so this
  // always reflects Ableton's actual timeline rather than a local guess.
  return { beat: link.beat, phase: link.phase, bpm: link.bpm };
}

function broadcastState(beat, phase, bpm) {
  const payload = JSON.stringify({
    bpm,
    beat,
    phase,
    serverTime: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

// Polls the native Link session every BROADCAST_INTERVAL_MS, refreshing
// the cached beat/phase/bpm/numPeers before each broadcast.
link.startUpdate(BROADCAST_INTERVAL_MS, (beat, phase, bpm) => {
  broadcastState(beat, phase, bpm);
});

wss.on("connection", (ws) => {
  console.log(`Browser client connected to Ableton Link bridge (peers: ${link.numPeers})`);

  // Immediately send the current state so the client can sync quickly.
  const { beat, phase, bpm } = currentState();
  ws.send(
    JSON.stringify({
      bpm,
      beat,
      phase,
      serverTime: Date.now(),
    })
  );

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (typeof data.bpm === "number" && Number.isFinite(data.bpm) && data.bpm > 0) {
        link.bpm = data.bpm;
        console.log(`Tempo updated via WebSocket: ${data.bpm} BPM`);
      }
    } catch (err) {
      console.warn("Ignoring malformed message from client:", err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ableton Link bridge available at http://localhost:${PORT}`);
});

