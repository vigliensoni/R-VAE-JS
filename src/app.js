// AUDIO CLOCK + SAMPLES (optimized)

import { kkPat, snPat, hhPat, kkVel, snVel, hhVel, latspaceRetriever } from "."
import { loadModelById, getActiveModelId, initialModelPromise } from "./modelRegistry.js"
import * as vis from "./visualization.js"
import { mouseX as lsX, mouseY as lsY, markDecodeAt, setTrailFadeSeconds } from './canvas.js'
import { LinkClock, createLinkSocket } from './linkClock.js'
import { ACCENT_COLOR, DEFAULT_TRAIL_SECONDS, MODELS_LS_DATA } from './constants.js'

// UI
const kickPatternbutton = document.getElementById('kickPatternbutton')
const snarePatternbutton = document.getElementById('snarePatternbutton')
const hihatPatternbutton = document.getElementById('hihatPatternbutton')
const allmuteButton = document.getElementById('allmuteButton')

const browserMuteButton = document.getElementById('browserMuteButton')
const midiToggleButton   = document.getElementById('midiToggleButton')
const midiMaxVelocityButton = document.getElementById('midiMaxVelocityButton')
const kkMidiNoteInput = document.getElementById('kkMidiNoteInput')
const snMidiNoteInput = document.getElementById('snMidiNoteInput')
const hhMidiNoteInput = document.getElementById('hhMidiNoteInput')
const modelSelect = document.getElementById('modelSelect')
const modelLoadButton = document.getElementById('modelLoadButton')
const modelStatusLabel = document.getElementById('modelStatusLabel')
const midiLearnXButton = document.getElementById('midiLearnXButton')
const midiLearnYButton = document.getElementById('midiLearnYButton')
const midiLearnXStatus = document.getElementById('midiLearnXStatus')
const midiLearnYStatus = document.getElementById('midiLearnYStatus')
const midiLearnXClearButton = document.getElementById('midiLearnXClearButton')
const midiLearnYClearButton = document.getElementById('midiLearnYClearButton')

// --- NEW STATE ---
let browserSamplesMuted = false
let midiEnabled = true   // MIDI sending allowed when true
let midiMaxVelocity = false   // when true, outgoing MIDI notes ignore the decoded velocity and send max (127)


// helper to update button styles
const setToggleButton = (el, active) => {
  el.style.background = active ? "#4444FF" : "#000000"
  el.style.color = active ? "#FFFFFF" : "#FFD12C"
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// MIDI note helpers
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const NOTE_SELECT_MIN = 24 // C1
const NOTE_SELECT_MAX = 96 // C7

const midiToNoteLabel = (value) => {
  if (!Number.isFinite(value)) return ""
  const midi = clamp(Math.round(value), 0, 127)
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[midi % 12]
  return `${note}${octave}`
}

const NOTE_OPTIONS = Array.from(
  { length: NOTE_SELECT_MAX - NOTE_SELECT_MIN + 1 },
  (_, idx) => {
    const midi = NOTE_SELECT_MIN + idx
    return { midi, label: midiToNoteLabel(midi) }
  }
)

const clampMidiNote = (value, fallback) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return clamp(Math.round(num), NOTE_SELECT_MIN, NOTE_SELECT_MAX)
}

const populateNoteSelect = (select, selectedValue) => {
  if (!select) return
  select.innerHTML = NOTE_OPTIONS.map(
    ({ midi, label }) => `<option value="${midi}">${label}</option>`
  ).join("")
  setSelectValue(select, selectedValue)
}

const setSelectValue = (select, value) => {
  if (!select) return
  const bounded = clamp(Math.round(value), NOTE_SELECT_MIN, NOTE_SELECT_MAX)
  select.value = String(bounded)
}

// Give Nexus knobs a palette that matches the UI
const nexusTheme = {
  accent: ACCENT_COLOR,
  fill: "#080808",
  light: "#FFE188",
  dark: "#050505",
  mediumLight: "#2F2F2F",
  mediumDark: "#151515",
}
Object.assign(Nexus.colors, nexusTheme)

// WEBMIDI
let webmidi = false
let number_of_MIDI_outputs = 0

const attachCcListener = (input) => {
  if (!input || input.__rvaeCcAttached) return
  input.__rvaeCcAttached = true
  input.addListener('controlchange', 'all', e => handleIncomingCC(e))
}

WebMidi.enable(err => {
  if (err) {
    console.log("WebMidi could not be enabled.", err)
    webmidi = false
    return
  }
  console.log("WebMidi enabled!")
  number_of_MIDI_outputs = WebMidi.outputs.length
  webmidi = true

  console.log("MIDI inputs:", WebMidi.inputs.map(i => i.name))
  WebMidi.inputs.forEach(attachCcListener)
  WebMidi.addListener('connected', e => {
    number_of_MIDI_outputs = WebMidi.outputs.length
    if (e.port && e.port.type === 'input') {
      console.log("MIDI input connected:", e.port.name)
      attachCcListener(e.port)
    }
  })
})

// MAXI
const maxi = maximilian()
const maxiEngine = new maxi.maxiAudio()
const kick = new maxi.maxiSample()
const snare = new maxi.maxiSample()
const hihat = new maxi.maxiSample()

const midiOffsetMs = 80; // 70ms magic number latency


// CLOCK
const SUBDIV = 96
const TEMPO_MIN = 20
const TEMPO_MAX = 200
const TEMPO_STEP = 5
const DEFAULT_TEMPO = 160
const TRAIL_MIN_SECONDS = 0.5
const TRAIL_MAX_SECONDS = 8
const TRAIL_STEP_SECONDS = 0.25
const DEFAULT_KK_MIDI = 60 // C3
const DEFAULT_SN_MIDI = 67 // G3
const DEFAULT_HH_MIDI = 72 // C4
const MODEL_IDS = Object.keys(MODELS_LS_DATA)

// DIAL STATE
let thresholdValue = 0.25
let noiseValue = 0
let tempoValue = DEFAULT_TEMPO
let volumeValue = 1.0
let trailFadeValue = DEFAULT_TRAIL_SECONDS
let kkMidiNote = DEFAULT_KK_MIDI
let snMidiNote = DEFAULT_SN_MIDI
let hhMidiNote = DEFAULT_HH_MIDI

const clock = new LinkClock({
  subdivisions: SUBDIV,
  beatsPerBar: 4,
  initialTempo: tempoValue,
})

let linkSocket = null
let suppressTempoBroadcast = false

// DIALS
const threshold = new Nexus.Dial('#thresholdDial', { size:[50,50], interaction:'vertical', mode:'absolute', min:0.01, max:0.99, step:0.01, value:thresholdValue })
const noiseDial = new Nexus.Dial('#noiseDial',   { size:[50,50], interaction:'vertical', mode:'absolute', min:0.00, max:1.0,  step:0.01, value:noiseValue })
const tempoDial = new Nexus.Dial('#tempoDial',   { size:[50,50], interaction:'vertical', mode:'absolute', min:TEMPO_MIN, max:TEMPO_MAX, step:TEMPO_STEP, value:tempoValue })
const volumeDial= new Nexus.Dial('#volumeDial',  { size:[50,50], interaction:'vertical', mode:'absolute', min:0,    max:2,    step:0.025,value:volumeValue })
const trailDial = new Nexus.Dial('#trailDial',   { size:[50,50], interaction:'vertical', mode:'absolute', min:TRAIL_MIN_SECONDS, max:TRAIL_MAX_SECONDS, step:TRAIL_STEP_SECONDS, value:trailFadeValue })

// sync threshold with visualizer
vis.setVisibilityThreshold(thresholdValue)
threshold.on('change', v => {
  thresholdValue = v
  vis.setVisibilityThreshold(v)
  triggerFromLatent(lsX, lsY) // trigger sound when moving threshold
})

noiseDial.on('change', v => {
  noiseValue = v
  if (noiseValue > 0) startNoiseWander()
  else stopNoiseWander()
})

// other dials
tempoDial.on('change',   v => {
  tempoValue = v
  clock.setTempo(tempoValue)
  if (!suppressTempoBroadcast && linkSocket) {
    linkSocket.sendTempo(tempoValue)
  }
})
volumeDial.on('change',  v => { volumeValue = v })
trailDial.on('change', v => {
  trailFadeValue = v
  setTrailFadeSeconds(v)
})

populateNoteSelect(kkMidiNoteInput, kkMidiNote)
populateNoteSelect(snMidiNoteInput, snMidiNote)
populateNoteSelect(hhMidiNoteInput, hhMidiNote)

const modelName = (id) => {
  const entry = MODELS_LS_DATA[id]
  return entry && entry.name ? entry.name : id
}

const populateModelSelect = () => {
  if (!modelSelect) return
  const options = MODEL_IDS.map(id => `<option value="${id}">${modelName(id)}</option>`).join("")
  modelSelect.innerHTML = options
  const current = getActiveModelId()
  if (current) modelSelect.value = current
}

const setModelUiDisabled = (isDisabled) => {
  if (modelSelect) modelSelect.disabled = isDisabled
  if (modelLoadButton) modelLoadButton.disabled = isDisabled
}

const setModelStatus = (text = "", isError = false) => {
  if (!modelStatusLabel) return
  modelStatusLabel.textContent = text
  modelStatusLabel.classList.toggle('model-status--error', Boolean(isError))
}

const refreshCurrentLatent = () => {
  const cx = Number.isFinite(lsX) ? lsX : 0
  const cy = Number.isFinite(lsY) ? lsY : 0
  triggerFromLatent(cx, cy)
}

populateModelSelect()
if (initialModelPromise) {
  setModelUiDisabled(true)
  setModelStatus(`Loading ${modelName(getActiveModelId())}…`)
  initialModelPromise
    .then(() => {
      setModelStatus(`${modelName(getActiveModelId())} ready`)
      refreshCurrentLatent()
    })
    .catch(err => {
      console.error('Initial model failed to load', err)
      setModelStatus('Failed to load initial model', true)
    })
    .finally(() => setModelUiDisabled(false))
}

async function handleModelLoadRequest(modelId) {
  if (!modelId) return
  setModelUiDisabled(true)
  setModelStatus(`Loading ${modelName(modelId)}…`)
  try {
    await loadModelById(modelId)
    setModelStatus(`${modelName(modelId)} ready`)
    refreshCurrentLatent()
  } catch (err) {
    console.error('Unable to load model', err)
    setModelStatus('Model failed to load', true)
  } finally {
    setModelUiDisabled(false)
  }
}

if (modelLoadButton) {
  modelLoadButton.addEventListener('click', () => {
    if (!modelSelect) return
    handleModelLoadRequest(modelSelect.value)
  })
}

if (modelSelect) {
  modelSelect.addEventListener('change', () => {
    setModelStatus(`Selected ${modelName(modelSelect.value)}`)
  })
}

if (kkMidiNoteInput) {
  kkMidiNoteInput.addEventListener('change', (e) => {
    kkMidiNote = clampMidiNote(e.target.value, kkMidiNote)
    setSelectValue(kkMidiNoteInput, kkMidiNote)
  })
}

if (snMidiNoteInput) {
  snMidiNoteInput.addEventListener('change', (e) => {
    snMidiNote = clampMidiNote(e.target.value, snMidiNote)
    setSelectValue(snMidiNoteInput, snMidiNote)
  })
}

if (hhMidiNoteInput) {
  hhMidiNoteInput.addEventListener('change', (e) => {
    hhMidiNote = clampMidiNote(e.target.value, hhMidiNote)
    setSelectValue(hhMidiNoteInput, hhMidiNote)
  })
}

function syncTempoDialWithRemote(bpm) {
  if (!Number.isFinite(bpm)) return
  const bounded = clamp(bpm, TEMPO_MIN, TEMPO_MAX)
  if (Math.abs(bounded - tempoValue) < 0.001) return
  suppressTempoBroadcast = true
  tempoValue = bounded
  tempoDial.value = bounded
  if (typeof tempoDial.render === 'function') tempoDial.render()
  suppressTempoBroadcast = false
}

function initLinkClockBridge() {
  linkSocket = createLinkSocket({
    onState: (state = {}, timestamp) => {
      clock.updateFromRemote({ ...state, timestamp })
      syncTempoDialWithRemote(state.bpm)
    },
    onOpen: () => console.log("Ableton Link bridge connected"),
    onClose: () => console.log("Ableton Link bridge disconnected, retrying..."),
  })
}

initLinkClockBridge()
setTrailFadeSeconds(trailFadeValue)

// Helper to trigger decode/play from latent coords
function triggerFromLatent(x, y) {
  const cx = Number.isFinite(x) ? x : 0
  const cy = Number.isFinite(y) ? y : 0
  markDecodeAt(cx, cy)
  latspaceRetriever(cx, cy)
}

// Noise wander settings
const MAX_RADIUS = 3
const LIMIT = 3

// MIDI LEARN — bind incoming CC messages to the latent X/Y playback head
const MIDI_LEARN_STORAGE_KEY = 'rvae.midiLearnMap'
let midiLearnMap = { x: null, y: null }   // { channel, controller } per axis, or null when unmapped
let midiLearnTarget = null                // 'x' | 'y' while armed and waiting for the next CC
let midiLatentX = 0
let midiLatentY = 0

const isValidBinding = (b) => !!b && Number.isInteger(b.channel) && Number.isInteger(b.controller)

const loadMidiLearnMap = () => {
  try {
    const raw = localStorage.getItem(MIDI_LEARN_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (isValidBinding(parsed && parsed.x)) midiLearnMap.x = parsed.x
    if (isValidBinding(parsed && parsed.y)) midiLearnMap.y = parsed.y
  } catch (e) {
    console.warn('Failed to load MIDI learn mapping', e)
  }
}

const saveMidiLearnMap = () => {
  try {
    localStorage.setItem(MIDI_LEARN_STORAGE_KEY, JSON.stringify(midiLearnMap))
  } catch (e) {
    console.warn('Failed to save MIDI learn mapping', e)
  }
}

const bindingLabel = (b) => (b ? `Ch${b.channel} CC${b.controller}` : 'Unmapped')

const refreshMidiLearnUi = () => {
  if (midiLearnXStatus) {
    midiLearnXStatus.textContent = midiLearnTarget === 'x' ? 'Listening…' : bindingLabel(midiLearnMap.x)
  }
  if (midiLearnYStatus) {
    midiLearnYStatus.textContent = midiLearnTarget === 'y' ? 'Listening…' : bindingLabel(midiLearnMap.y)
  }
  if (midiLearnXButton) midiLearnXButton.classList.toggle('learning', midiLearnTarget === 'x')
  if (midiLearnYButton) midiLearnYButton.classList.toggle('learning', midiLearnTarget === 'y')
}

const armMidiLearn = (axis) => {
  midiLearnTarget = midiLearnTarget === axis ? null : axis
  refreshMidiLearnUi()
}

const clearMidiLearn = (axis) => {
  midiLearnMap[axis] = null
  if (midiLearnTarget === axis) midiLearnTarget = null
  saveMidiLearnMap()
  refreshMidiLearnUi()
}

if (midiLearnXButton) midiLearnXButton.addEventListener('click', () => armMidiLearn('x'))
if (midiLearnYButton) midiLearnYButton.addEventListener('click', () => armMidiLearn('y'))
if (midiLearnXClearButton) midiLearnXClearButton.addEventListener('click', () => clearMidiLearn('x'))
if (midiLearnYClearButton) midiLearnYClearButton.addEventListener('click', () => clearMidiLearn('y'))

loadMidiLearnMap()
refreshMidiLearnUi()

const ccToLatent = (raw) => (clamp(raw, 0, 127) / 127) * (2 * LIMIT) - LIMIT
const isBindingMatch = (b, channel, controller) => !!b && b.channel === channel && b.controller === controller

// Hardware controllers can stream CC messages far faster than a synchronous
// VAE decode can keep up with. Track the latest value instantly, but only
// flush a decode once per animation frame so bursts collapse into the
// latest position instead of queuing up and lagging behind in real time.
let midiLatentDirty = false

function midiLatentTicker() {
  if (midiLatentDirty) {
    midiLatentDirty = false
    triggerFromLatent(midiLatentX, midiLatentY)
  }
  requestAnimationFrame(midiLatentTicker)
}
requestAnimationFrame(midiLatentTicker)

function handleIncomingCC(e) {
  const channel = e.channel
  const controller = e.controller && e.controller.number
  if (!Number.isInteger(channel) || !Number.isInteger(controller)) return

  if (midiLearnTarget) {
    midiLearnMap[midiLearnTarget] = { channel, controller }
    midiLearnTarget = null
    saveMidiLearnMap()
    refreshMidiLearnUi()
    return
  }

  // webmidi v2 reports `value` as the raw 0-127 CC byte for controlchange events.
  const rawValue = Number.isFinite(e.value) ? e.value : 0

  if (isBindingMatch(midiLearnMap.x, channel, controller)) {
    midiLatentX = ccToLatent(rawValue)
    midiLatentDirty = true
  }
  if (isBindingMatch(midiLearnMap.y, channel, controller)) {
    midiLatentY = -ccToLatent(rawValue) // invert: CC increasing should move the head down, matching the mouse/canvas Y convention
    midiLatentDirty = true
  }
}

function sampleInDisk(R) {
  const u = Math.random()
  const v = Math.random()
  const r = R * Math.sqrt(u)
  const a = 2 * Math.PI * v
  return [r * Math.cos(a), r * Math.sin(a)]
}

let noiseTimer = null
const NOISE_INTERVAL_MS = 120

function startNoiseWander() {
  if (noiseTimer) return
  noiseTimer = setInterval(() => {
    if (noiseValue <= 0) return
    const cx = Number.isFinite(lsX) ? lsX : 0
    const cy = Number.isFinite(lsY) ? lsY : 0
    const [dx, dy] = sampleInDisk(noiseValue * MAX_RADIUS)
    const x = clamp(cx + dx, -LIMIT, LIMIT)
    const y = clamp(cy + dy, -LIMIT, LIMIT)
    markDecodeAt(x, y)
    latspaceRetriever(x, y)
  }, NOISE_INTERVAL_MS)
}

function stopNoiseWander() {
  if (noiseTimer) {
    clearInterval(noiseTimer)
    noiseTimer = null
  }
}

// MUTE STATE
let kkMuted = false
let snMuted = false
let hhMuted = false
let allMuted = false

const setButton = (el, active) => {
  el.style.background = active ? "#FF0000" : "#000000"
  if (el === allmuteButton) el.style.color = active ? "#000000" : "#FFD12C"
}

const setAllMutes = (muted) => {
  allMuted = muted
  kkMuted = snMuted = hhMuted = muted
  setButton(kickPatternbutton, muted)
  setButton(snarePatternbutton, muted)
  setButton(hihatPatternbutton, muted)
  setButton(allmuteButton, muted)
}

// MIDI HELPERS
const MIDI_CH = 10;
const clamp01 = v => Math.min(1, Math.max(0, v));

const sendToAll = (note, velocityNorm = 0.8, dur = 100) => {
  if (!midiEnabled) return;                // <-- NEW guard
  if (!webmidi || number_of_MIDI_outputs === 0) return;

  const effectiveVelocityNorm = midiMaxVelocity ? 1 : velocityNorm
  const v = clamp01(effectiveVelocityNorm * volumeValue); // level dial also scales outgoing MIDI
  const when = "+" + midiOffsetMs;

  for (let i = 0; i < number_of_MIDI_outputs; i++) {
    const out = WebMidi.outputs[i];
    if (out && typeof out.playNote === "function") {
      try {
        out.playNote(note, MIDI_CH, {
          velocity: v,
          duration: dur,
          time: when
        });
      } catch (e) {
        const name = out ? out.name : 'unknown';
        console.warn('Output ' + i + ' (' + name + ') skipped:', e);
      }
    }
  }
};

// KITS
const KITS = [
  {
    kk: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Kick%20606%201.wav",
    sn: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Rim%207T8.wav",
    hh: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/ClosedHH%201.wav",
  },
  {
    kk: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Kick%207T8.wav",
    sn: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Snare%207T8.wav",
    hh: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/ClosedHH%20Absynth%203.wav",
  },
  {
    kk: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/kk-3.wav",
    sn: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/sn-3.wav",
    hh: "https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/hh-3.wav",
  },
]

const loadKit = (idx) => {
  const kit = KITS[idx]
  if (!kit) return
  maxiEngine.loadSample(kit.kk, kick)
  maxiEngine.loadSample(kit.sn, snare)
  maxiEngine.loadSample(kit.hh, hihat)
}

// AUDIO ENGINE
const playAudio = () => {
  maxiEngine.init()
  loadKit(2) // default kit

  let kkAmp = 0, snAmp = 0, hhAmp = 0

maxiEngine.play = function () {
  clock.ticker()
  if (clock.isTick()) {
    const tick = clock.playHead % SUBDIV
    vis.visualize(tick)

    // Kick
    const kIdx = kkPat.indexOf(tick);
    if (kIdx >= 0 && !kkMuted && !allMuted) {
      if (!browserSamplesMuted) kick.trigger();         // <-- condition
      const kRaw = kkVel[kIdx];
      kkAmp = ((kRaw != null ? kRaw : 127) / 127);
      sendToAll(kkMidiNote, kkAmp);
    }

    // Snare
    const sIdx = snPat.indexOf(tick);
    if (sIdx >= 0 && !snMuted && !allMuted) {
      if (!browserSamplesMuted) snare.trigger();
      const sRaw = snVel[sIdx];
      snAmp = ((sRaw != null ? sRaw : 127) / 127);
      sendToAll(snMidiNote, snAmp);
    }

    // Hi-hat
    const hIdx = hhPat.indexOf(tick);
    if (hIdx >= 0 && !hhMuted && !allMuted) {
      if (!browserSamplesMuted) hihat.trigger();
      const hRaw = hhVel[hIdx];
      hhAmp = ((hRaw != null ? hRaw : 127) / 127);
      sendToAll(hhMidiNote, hhAmp);
    }
  }

  let w = 0
  if (!browserSamplesMuted) {                           // <-- condition
    w += kick.playOnce()  * kkAmp * volumeValue
    w += snare.playOnce() * snAmp * volumeValue
    w += hihat.playOnce()* hhAmp * volumeValue
  }
  return w
}
}

playAudio()

// BUTTON CLICKS
kickPatternbutton.addEventListener('mousedown', () => {
  kkMuted = !kkMuted
  setButton(kickPatternbutton, kkMuted)
})
snarePatternbutton.addEventListener('mousedown', () => {
  snMuted = !snMuted
  setButton(snarePatternbutton, snMuted)
})
hihatPatternbutton.addEventListener('mousedown', () => {
  hhMuted = !hhMuted
  setButton(hihatPatternbutton, hhMuted)
})
allmuteButton.addEventListener('mousedown', () => setAllMutes(!allMuted))


// --- NEW BUTTON HANDLERS ---
browserMuteButton.addEventListener('mousedown', () => {
  browserSamplesMuted = !browserSamplesMuted
  setToggleButton(browserMuteButton, browserSamplesMuted)
})

midiToggleButton.addEventListener('mousedown', () => {
  midiEnabled = !midiEnabled
  setToggleButton(midiToggleButton, !midiEnabled) // active = muted/off
})

const toggleMidiMaxVelocity = () => {
  midiMaxVelocity = !midiMaxVelocity
  if (midiMaxVelocityButton) setToggleButton(midiMaxVelocityButton, midiMaxVelocity)
}

if (midiMaxVelocityButton) midiMaxVelocityButton.addEventListener('mousedown', toggleMidiMaxVelocity)

// KEYBOARD
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "q": if (!allMuted) { kkMuted = true; setButton(kickPatternbutton, true) } break
    case "w": if (!allMuted) { snMuted = true; setButton(snarePatternbutton, true) } break
    case "e": if (!allMuted) { hhMuted = true; setButton(hihatPatternbutton, true) } break
    case "r": setAllMutes(!allMuted); break
    case "v": toggleMidiMaxVelocity(); break
    case "1": loadKit(0); break
    case "2": loadKit(1); break
    case "3": loadKit(2); break
  }
})

window.addEventListener("keyup", (e) => {
  if (allMuted) return
  switch (e.key) {
    case "q": kkMuted = false; setButton(kickPatternbutton, false); break
    case "w": snMuted = false; setButton(snarePatternbutton, false); break
    case "e": hhMuted = false; setButton(hihatPatternbutton, false); break
  }
})

// Utils
function randomNumber(n = 16) { return Math.floor(n * Math.random()) }
function randomPattern() {
  const rp = []
  for (let i = 0; i < randomNumber(16); i++) rp.push(6 * randomNumber(16))
  return rp
}

export { playAudio, thresholdValue, noiseValue }
