// THIS FILE CREATES CONTROLS THE AUDIO CLOCK AND SAMPLES

import { drumOnsets } from "."
import { isDrawing } from './canvas.js';
import * as vis from "./visualization.js"
import { LOOP_DURATION } from "./constants";
import * as vae from './vae.js'
import { MODELS_LS_DATA } from './constants.js'

const playButton = document.getElementById('playButton')
const clockUI = document.getElementById('clock')
const kickPatternbutton = document.getElementById('kickPatternbutton')
const snarePatternbutton = document.getElementById('snarePatternbutton')
const hihatPatternbutton = document.getElementById('hihatPatternbutton')

let webmidi

// load WebMIDI
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
const ticksperbeat = 24 // GV: why this is 12 and not 24?
clock.setTempo(80) // Running at 160, though
clock.setTicksPerBeat(ticksperbeat)

// console.log('clock', clock)
// declare variables for dial
var thresholdValue
var noiseValue

// create dials
const threshold = new Nexus.Dial('#thresholdDial', {
  interaction: 'vertical',
  mode: 'absolute',
  min: 0.01,
  max: 0.99,
  step: 0.01,
  value: 0.99
})

const noise = new Nexus.Dial('#noiseDial', {
  interaction: 'vertical',
  mode: 'absolute',
  min: 0.00,
  max: 1.0,
  step: 0.01,
  value: 0.0
})

// console.log(threshold)

// INIT PATTERNS
var kkPat = []
var snPat = []
var hhPat = []
let kkMuted 
let snMuted
let hhMuted

// when the play button is pressed...
const playAudio = () => {
  // arrange play button
  playButton.style.display = 'none'
  // start the audio engine
  maxiEngine.init()
  
  // maxiEngine.loadSample('./audio/Kick 606 1.wav', kick)
  maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Kick%20606%201.wav", kick)

  // maxiEngine.loadSample('./audio/Rim 7T8.wav', snare)
  maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/Rim%207T8.wav", snare)

  // maxiEngine.loadSample('./audio/ClosedHH 1.wav', hihat)
  maxiEngine.loadSample("https://raw.githubusercontent.com/vigliensoni/drum-sample-random-sequencer/master/audio/ClosedHH%201.wav", hihat)

  // show an oscilloscope and freqscope
  // Nexus.context = maxiEngine.context
  // const oscilloscope = new Nexus.Oscilloscope('oscilloscope', { size: [400, 100] }).connect(maxiEngine.maxiAudioProcessor)
  // const spectrogram = new Nexus.Spectrogram('spectrogram', { size: [400, 100] }).connect(maxiEngine.maxiAudioProcessor)
  
 
  

  maxiEngine.play = function () {
    var w = 0
    clock.ticker()
    if (clock.isTick()) {
      // let beatCounter = clock.playHead % 7;
      let tickCounter = clock.playHead % subdiv
      const beatCounter = Math.floor(clock.playHead / subdiv)
      clockUI.innerHTML = (beatCounter + 1) + ' ' + Math.floor(tickCounter / ticksperbeat + 1) + ' ' + (tickCounter % ticksperbeat + 1) 
      
      // CHECK HOW TO CHANGE DATASTRUCTURE TO MATCH RVAE
      // if ( drumOnsets[0] ) {
      //   kick.trigger()
      // }
      
      vis.visualize(clock.playHead % LOOP_DURATION)
      // vis.visualize(subdiv)

      if (kkPat.indexOf(tickCounter) >= 0) {
        if (kkMuted !== true) {
          kick.trigger()
          if (webmidi) WebMidi.outputs[0].playNote("C1") // WebMidi only working on Firefox
        }
      }
      if (snPat.indexOf(tickCounter) >= 0) {
        if (snMuted !== true) {
          snare.trigger()
          if (webmidi) WebMidi.outputs[0].playNote("A1")
        }
      }
      if (hhPat.indexOf(tickCounter) >= 0) {
        if (hhMuted !== true) {
          hihat.trigger()
          if (webmidi) WebMidi.outputs[0].playNote("G#1")
        }
      }
    }
    
    w = kick.playOnce() 
    w += snare.playOnce()
    w += hihat.playOnce() * 0.25
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


let canvas = document.getElementById("LSVisualizer");

// Retrieve patterns from latent space when mouse moves and drags (drawing)
canvas.addEventListener('mousemove', event => {
  if (isDrawing) {
    kkPat = drumOnsets[0]
    snPat = drumOnsets[1]
    hhPat = drumOnsets[2]
  }
})



// button listeners


window.addEventListener("keydown", event => {
  if (event.key == "q") {
    kkMuted = true
    kickPatternbutton.style.background="#FF0000"
    console.log('muted')
  } else if (event.key == "w") {
    snMuted = true
    snarePatternbutton.style.background="#FF0000"
  } else if (event.key == "e") {
    hhMuted = true
    hihatPatternbutton.style.background="#FF0000"
  }
})

window.addEventListener("keyup", event => {
  if (event.key == "q") {
    kkMuted = false
    kickPatternbutton.style.background="#FFFFFF"
  } else if (event.key == "w") {
    snMuted = false
    snarePatternbutton.style.background="#FFFFFF"
  } else if (event.key == "e") {
    hhMuted = false
    hihatPatternbutton.style.background="#FFFFFF"
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




// function chooseModel(){
//   let modelURL = MODELS_LS_DATA[this.value]['model-url']
//   let spaceURL = MODELS_LS_DATA[this.value]['space-url']
//   vae.loadModel(modelURL)
//   console.log(modelURL, spaceURL)
// }

// document.getElementById("model").onchange = chooseModel







playButton.addEventListener('click', () => playAudio())



export { playAudio, thresholdValue, noiseValue }

