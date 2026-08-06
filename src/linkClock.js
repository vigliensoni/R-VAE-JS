const DEFAULT_SUBDIVISIONS = 96;
const DEFAULT_BEATS_PER_BAR = 4;

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

/**
 * Clock driven by Ableton Link state shared over WebSockets.
 * The clock mimics the small subset of `maxiClock` we relied on:
 *  - `setTempo`
 *  - `ticker`
 *  - `isTick`
 *  - `playHead` (0..SUBDIV-1)
 */
export class LinkClock {
  constructor({
    subdivisions = DEFAULT_SUBDIVISIONS,
    beatsPerBar = DEFAULT_BEATS_PER_BAR,
    initialTempo = 160,
  } = {}) {
    this.subdivisions = subdivisions;
    this.beatsPerBar = beatsPerBar;
    this.pulsesPerBeat = subdivisions / beatsPerBar;

    this.baseBeat = 0;
    this.baseTime = now();
    this.bpm = initialTempo;

    this.lastPulse = null;
    this._tickReady = false;
    this.playHead = 0;
  }

  /**
   * Returns the current tempo in BPM.
   */
  get tempo() {
    return this.bpm;
  }

  /**
   * Hard-sets the clock tempo locally.
   * Used both for initial configuration and when we adjust tempo
   * before the bridge confirms the change back.
   */
  setTempo(nextBpm) {
    if (!Number.isFinite(nextBpm) || nextBpm <= 0) return;
    const current = now();
    const beat = this._currentBeat(current);
    this.baseBeat = beat;
    this.baseTime = current;
    this.bpm = nextBpm;
  }

  /**
   * Update the clock using the latest Ableton Link state received
   * from the server. The timestamp should be taken as close as
   * possible to when the data was observed (typically `performance.now()`).
   */
  updateFromRemote({ beat, bpm, timestamp }) {
    if (Number.isFinite(bpm) && bpm > 0) {
      this.bpm = bpm;
    }
    if (Number.isFinite(beat)) {
      this.baseBeat = beat;
    }
    if (Number.isFinite(timestamp)) {
      this.baseTime = timestamp;
    } else {
      this.baseTime = now();
    }

    // Keep pulses continuous so `playHead` jumps immediately to
    // the expected subdivision.
    const pulse = Math.floor(this.baseBeat * this.pulsesPerBeat);
    this.lastPulse = pulse;
    this.playHead = this._modSubdivisions(pulse);
    this._tickReady = false;
  }

  /**
   * Advance the clock. Call this frequently (e.g. inside the audio
   * callback) so ticks can be detected promptly.
   */
  ticker(timestamp = now()) {
    const pulse = Math.floor(this._currentBeat(timestamp) * this.pulsesPerBeat);
    if (this.lastPulse === null) {
      this.lastPulse = pulse;
      this.playHead = this._modSubdivisions(pulse);
      this._tickReady = true;
      return;
    }

    if (pulse !== this.lastPulse) {
      this.lastPulse = pulse;
      this.playHead = this._modSubdivisions(pulse);
      this._tickReady = true;
    }
  }

  /**
   * Whether the current `ticker` cycle hit a new tick boundary.
   */
  isTick() {
    if (this._tickReady) {
      this._tickReady = false;
      return true;
    }
    return false;
  }

  _currentBeat(timestamp = now()) {
    const elapsed = (timestamp - this.baseTime) / 1000;
    return this.baseBeat + elapsed * (this.bpm / 60);
  }

  _modSubdivisions(pulse) {
    const mod = pulse % this.subdivisions;
    return mod >= 0 ? mod : mod + this.subdivisions;
  }
}

/**
 * Create a resilient WebSocket connection to the Ableton Link bridge.
 * The caller provides callbacks for state updates and connection status.
 */
export function createLinkSocket({
    url = guessDefaultUrl(),
    onState,
    onOpen,
    onClose,
    reconnect = true,
    reconnectDelayMs = 1000,
  } = {}) {
  let socket = null;
  let shouldReconnect = reconnect;
  let reconnectTimer = null;

  const cleanupReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (!shouldReconnect) return;
    cleanupReconnect();
    reconnectTimer = setTimeout(() => {
      connect();
    }, reconnectDelayMs);
  };

  const connect = () => {
    try {
      socket = new WebSocket(url);
    } catch (err) {
      console.error("Failed to open Ableton Link WebSocket:", err);
      scheduleReconnect();
      return;
    }

    socket.addEventListener("open", () => {
      cleanupReconnect();
      if (typeof onOpen === "function") onOpen();
    });

    socket.addEventListener("message", (event) => {
      if (typeof onState !== "function") return;
      try {
        const data = JSON.parse(event.data);
        onState(data, now());
      } catch (err) {
        console.warn("Ignoring malformed Link payload", err);
      }
    });

    socket.addEventListener("close", () => {
      if (typeof onClose === "function") onClose();
      scheduleReconnect();
    });

    socket.addEventListener("error", (event) => {
      console.error("Ableton Link WebSocket error:", event);
      socket.close();
    });
  };

  connect();

  return {
    sendTempo(bpm) {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      try {
        socket.send(JSON.stringify({ bpm }));
      } catch (err) {
        console.warn("Failed to send tempo to Link bridge", err);
      }
    },
    close() {
      shouldReconnect = false;
      cleanupReconnect();
      if (socket) socket.close();
    },
  };
}

function guessDefaultUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.__ABLETON_LINK_HOST__ || window.location.hostname;
  const port = window.__ABLETON_LINK_PORT__ || 3000;
  return `${protocol}//${host}:${port}`;
}
