// THIS FILE CREATES CONTROLS THE AUDIO CLOCK AND SAMPLES

import { kkPat, snPat, hhPat, kkVel, snVel, hhVel } from "."
// import { canvas, isDrawing } from './canvas.js';
import * as vis from "./visualization.js"
// import { LOOP_DURATION } from "./constants";
// import * as vae from './vae.js'
// import { MODELS_LS_DATA } from './constants.js'


// const playButton = document.getElementById('goButton')
// const clockUI = document.getElementById('clock')
const kickPatternbutton = document.getElementById('kickPatternbutton')
const snarePatternbutton = document.getElementById('snarePatternbutton')
const hihatPatternbutton = document.getElementById('hihatPatternbutton')
const allmuteButton = document.getElementById('allmuteButton')


let webmidi;

// loading WebMIDI
WebMidi.enable(function (err) {
  if (err) {
    console.log("WebMidi could not be enabled.", err)
    webmidi = false;
  } else {
    console.log("WebMidi enabled!")
    console.log("WebMidi Outputs: ", WebMidi.outputs)
    webmidi = true;
  }
});


// create a maximilian object
var maxi = maximilian()

// create an audio engine
var maxiEngine = new maxi.maxiAudio()

// create two oscillators
var kick = new maxi.maxiSample()
var snare = new maxi.maxiSample()
var hihat = new maxi.maxiSample()
let clock = new maxi.maxiClock()

// control sequencer
const subdiv = 96 // 4 * 24 -> 1 beat
const ticksperbeat = 12 // GV: why this is 12 and not 24?
clock.setTempo(160) // Running at 160, though
clock.setTicksPerBeat(ticksperbeat)

// declare variables for dial
let thresholdValue = 0.25
let noiseValue = 0
let tempoValue = 160
let volumeValue = 1.0

// create dials
const threshold = new Nexus.Dial('#thresholdDial', {
  size: [50, 50],
  interaction: 'vertical',
  mode: 'absolute',
  min: 0.01,
  max: 0.99,
  step: 0.01,
  value: thresholdValue
})

const noise = new Nexus.Dial('#noiseDial', {
  size: [50, 50],
  interaction: 'vertical',
  mode: 'absolute',
  min: 0.00,
  max: 1.0,
  step: 0.01,
  value: noiseValue
})

const tempo = new Nexus.Dial('#tempoDial', {
  size: [50, 50],
  interaction: 'vertical',
  mode: 'absolute',
  min: 60,
  max: 200,
  step: 5,
  value: tempoValue
})

const volume = new Nexus.Dial('#volumeDial', {
  size: [50, 50],
  interaction: 'vertical',
  mode: 'absolute',
  min: 0,
  max: 2,
  step: 0.025,
  value: volumeValue
})

// INIT PATTERNS
let kkMuted
let snMuted
let hhMuted
let allMuted = false


// when the play button is pressed...
const playAudio = () => {

  // start the audio engine
  maxiEngine.init()

  maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/kk-3.wav", kick);
  maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/sn-3.wav", snare);
  maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/hh-3.wav", hihat);

  let w = 0;
  let tickCounter;
  let kkAmp, snAmp, hhAmp;


  maxiEngine.play = function () {
    clock.ticker();
    if (clock.isTick()) {
      tickCounter = clock.playHead % subdiv;


      vis.visualize(tickCounter) // one tick before to be in sync
      if ((kkPat.indexOf(tickCounter)) >= 0) {
        if ((kkMuted !== true)) {
          kick.trigger()
          kkAmp = kkVel[kkPat.indexOf(tickCounter)] / 127 // Onset Velocity, needs to be done to MIDI
          if (webmidi) {
            WebMidi.outputs[0].playNote("C1"); // WebMidi not working on Firefox
            WebMidi.outputs[1].playNote("C1"); // WebMidi not working on Firefox
          }
        }
      }
      if ((snPat.indexOf(tickCounter)) >= 0) {
        if ((snMuted !== true)) {
          snare.trigger()
          snAmp = snVel[snPat.indexOf(tickCounter)] / 127
          if (webmidi)  {
            WebMidi.outputs[0].playNote("A1");
            WebMidi.outputs[1].playNote("A1");
          }
        }
      }
      if ((hhPat.indexOf(tickCounter) >= 0)) {
        if ((hhMuted !== true)) {
          hihat.trigger()
          hhAmp = hhVel[hhPat.indexOf(tickCounter)] / 127
          if (webmidi) {
            WebMidi.outputs[0].playNote("G#1");
            WebMidi.outputs[1].playNote("G#1");
          }
        }
      }
    }

    w = kick.playOnce() * kkAmp * volumeValue
    w += snare.playOnce() * snAmp * volumeValue
    w += hihat.playOnce() * hhAmp * volumeValue
    return w
  }
}



// dials
threshold.on('change', function(t) {
  thresholdValue = t
})

noise.on('change', function(n) {
  noiseValue = n
})

tempo.on('change', function(t) {
  tempoValue = t;
  clock.setTempo(tempoValue);
})

volume.on('change', function(t) {
  volumeValue = t;
})

// BUTTON LISTENERS

// MUTE BUTTONS ON
window.addEventListener("keydown", event => {
  if (event.key == "q" & allMuted == false) {
    kkMuted = true
    kickPatternbutton.style.background="#FF0000"
  } else if (event.key == "w" & allMuted == false) {
    snMuted = true
    snarePatternbutton.style.background="#FF0000"
  } else if (event.key == "e" & allMuted == false) {
    hhMuted = true
    hihatPatternbutton.style.background="#FF0000"
  } else if (event.key == "r" & allMuted == false ) {
    allMuted = true
    kkMuted = true
    snMuted = true
    hhMuted = true
    allmuteButton.style.background="#FF0000"
  } else if (event.key == "r" & allMuted == true ) {
    allMuted = false
    kkMuted = false
    snMuted = false
    hhMuted = false
    allmuteButton.style.background="#000000"
    allmuteButton.style.color="#FFD12C"

  }
})

// MUTE BUTTONS OFF
window.addEventListener("keyup", event => {
  if (event.key == "q" & allMuted == false) {
    kkMuted = false
    kickPatternbutton.style.background="#000000"
  } else if (event.key == "w" & allMuted == false) {
    snMuted = false
    snarePatternbutton.style.background="#000000"
  } else if (event.key == "e" & allMuted == false) {
    hhMuted = false
    hihatPatternbutton.style.background="#000000"
  }
})

// CLICK ON MUTE BUTTONS
kickPatternbutton.addEventListener('mousedown', () => {
  if ( kkMuted == false ) {
    kkMuted = true
    kickPatternbutton.style.background="#FF0000"
  } else if ( kkMuted == true ) {
    kkMuted = false
    kickPatternbutton.style.background="#000000"
  }
})


snarePatternbutton.addEventListener('mousedown', () => {
  if ( snMuted == false ) {
    snMuted = true
    snarePatternbutton.style.background="#FF0000"
  } else if ( snMuted == true ) {
    snMuted = false
    snarePatternbutton.style.background="#000000"
  }
})

hihatPatternbutton.addEventListener('mousedown', () => {
  if ( hhMuted == false ) {
    hhMuted = true
    hihatPatternbutton.style.background="#FF0000"
  } else if ( hhMuted == true ) {
    hhMuted = false
    hihatPatternbutton.style.background="#000000"
  }
})

// CLICK ON SOUND OFF
allmuteButton.addEventListener('mousedown', () => {
  if (allMuted == true ) {
    allMuted = false
    kkMuted = false
    snMuted = false
    hhMuted = false
    allmuteButton.style.background="#000000"
  } else if (allMuted == false ) {
    allMuted = true
    kkMuted = true
    snMuted = true
    hhMuted = true
    allmuteButton.style.background="#FF0000"
  }
})

// MUTE BUTTONS ON
window.addEventListener("keydown", event => {
  if (event.key == "1" ) {
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Kick%20606%201.wav", kick);
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Rim%207T8.wav", snare);
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/ClosedHH%201.wav", hihat);

  } else if (event.key == "2" ) {
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Kick%207T8.wav", kick);
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Snare%207T8.wav", snare);
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/ClosedHH%20Absynth%203.wav", hihat);
  } else if (event.key == "3" ) {
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/kk-3.wav", kick);
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/sn-3.wav", snare);
    maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/hh-3.wav", hihat);
  }
})


function randomNumber (n = 16) {
  return Math.floor(n * Math.random())
}

function randomPattern () {
  const rp = []
  for (let i = 0; i < randomNumber(16); i++) {
    rp.push(6 * randomNumber(16))
  }
  return rp
}



export { playAudio, thresholdValue, noiseValue }
