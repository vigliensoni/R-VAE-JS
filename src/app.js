// AUDIO CLOCK + SAMPLES (optimized)

import { kkPat, snPat, hhPat, kkVel, snVel, hhVel } from "."
import * as vis from "./visualization.js"
import { latspaceRetriever } from '.';
import { mouseX as lsX, mouseY as lsY, markDecodeAt } from './canvas.js'

// UI
const kickPatternbutton = document.getElementById('kickPatternbutton')
const snarePatternbutton = document.getElementById('snarePatternbutton')
const hihatPatternbutton = document.getElementById('hihatPatternbutton')
const allmuteButton = document.getElementById('allmuteButton')

// WEBMIDI
let webmidi = false
let number_of_MIDI_outputs = 0

WebMidi.enable(err => {
  if (err) {
    console.log("WebMidi could not be enabled.", err)
    webmidi = false
    return
  }
  console.log("WebMidi enabled!")
  number_of_MIDI_outputs = WebMidi.outputs.length
  webmidi = true
})

// MAXI
const maxi = maximilian()
const maxiEngine = new maxi.maxiAudio()
const kick = new maxi.maxiSample()
const snare = new maxi.maxiSample()
const hihat = new maxi.maxiSample()
const clock = new maxi.maxiClock()

// CLOCK
const SUBDIV = 96
const TICKS_PER_BEAT = 12
clock.setTempo(160)
clock.setTicksPerBeat(TICKS_PER_BEAT)

// DIAL STATE
let thresholdValue = 0.25
let noiseValue = 0
let tempoValue = 160
let volumeValue = 1.0

// DIALS
const threshold = new Nexus.Dial('#thresholdDial', { size:[50,50], interaction:'vertical', mode:'absolute', min:0.01, max:0.99, step:0.01, value:thresholdValue })
const noiseDial = new Nexus.Dial('#noiseDial',   { size:[50,50], interaction:'vertical', mode:'absolute', min:0.00, max:1.0,  step:0.01, value:noiseValue })
const tempoDial = new Nexus.Dial('#tempoDial',   { size:[50,50], interaction:'vertical', mode:'absolute', min:60,   max:200,  step:5,    value:tempoValue })
const volumeDial= new Nexus.Dial('#volumeDial',  { size:[50,50], interaction:'vertical', mode:'absolute', min:0,    max:2,    step:0.025,value:volumeValue })

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
tempoDial.on('change',   v => { tempoValue = v; clock.setTempo(tempoValue) })
volumeDial.on('change',  v => { volumeValue = v })

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
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

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
  if (!webmidi || number_of_MIDI_outputs === 0) return;
  const v = clamp01(velocityNorm); // WebMidi.js default expects 0..1
  for (let i = 0; i < number_of_MIDI_outputs; i++) {
    const out = WebMidi.outputs[i];
    if (out && typeof out.playNote === "function") {
      try {
        out.playNote(note, MIDI_CH, {
          duration: dur,
          velocity: v       // <-- decoded velocity (0..1)
          // rawVelocity: false // (default)
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
        kick.trigger();
        const kRaw = kkVel[kIdx];
        kkAmp = ((kRaw != null ? kRaw : 127) / 127);   // 0..1, preserves 0
        sendToAll("C1", kkAmp);                         // <-- use decoded velocity
      }

      // Snare
      const sIdx = snPat.indexOf(tick);
      if (sIdx >= 0 && !snMuted && !allMuted) {
        snare.trigger();
        const sRaw = snVel[sIdx];
        snAmp = ((sRaw != null ? sRaw : 127) / 127);
        sendToAll("C#1", snAmp);
      }

      // Hi-hat
      const hIdx = hhPat.indexOf(tick);
      if (hIdx >= 0 && !hhMuted && !allMuted) {
        hihat.trigger();
        const hRaw = hhVel[hIdx];
        hhAmp = ((hRaw != null ? hRaw : 127) / 127);
        sendToAll("D1", hhAmp);
      }

    }

    let w = 0
    w += kick.playOnce()  * kkAmp * volumeValue
    w += snare.playOnce() * snAmp * volumeValue
    w += hihat.playOnce()* hhAmp * volumeValue
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

// KEYBOARD
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "q": if (!allMuted) { kkMuted = true; setButton(kickPatternbutton, true) } break
    case "w": if (!allMuted) { snMuted = true; setButton(snarePatternbutton, true) } break
    case "e": if (!allMuted) { hhMuted = true; setButton(hihatPatternbutton, true) } break
    case "r": setAllMutes(!allMuted); break
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
