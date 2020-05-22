// THIS FILE CREATES CONTROLS THE AUDIO CLOCK AND SAMPLES

import { drumOnsets } from "."
import { isDrawing } from './canvas.js';


const playButton = document.getElementById('playButton')
const clockUI = document.getElementById('clock')
const kickPatternbutton = document.getElementById('kickPatternbutton')
const snarePatternbutton = document.getElementById('snarePatternbutton')
const hihatPatternbutton = document.getElementById('hihatPatternbutton')

// load WebMIDI
WebMidi.enable(function (err) {
  if (err) {
    console.log("WebMidi could not be enabled.", err)
  } else {
    console.log("WebMidi enabled!")
    console.log("WebMidi Outputs: ", WebMidi.outputs)
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
var clock = new maxi.maxiClock()

// control sequencer 
const subdiv = 48 // 4 * 24 -> 1 beat
const ticksperbeat = 12 // GV: why this is 12 and not 24?
clock.setTempo(160)
clock.setTicksPerBeat(ticksperbeat)

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
  Nexus.context = maxiEngine.context
  const oscilloscope = new Nexus.Oscilloscope('oscilloscope', { size: [400, 100] }).connect(maxiEngine.maxiAudioProcessor)
  const spectrogram = new Nexus.Spectrogram('spectrogram', { size: [400, 100] }).connect(maxiEngine.maxiAudioProcessor)
  
 


  maxiEngine.play = function () {
    var w = 0
    clock.ticker()
    if (clock.isTick()) {
      // let beatCounter = clock.playHead % 7;
      var tickCounter = clock.playHead % subdiv
      const beatCounter = Math.floor(clock.playHead / subdiv)
      clockUI.innerHTML = (beatCounter + 1) + ' ' + Math.floor(tickCounter / ticksperbeat + 1) + ' ' + (tickCounter % ticksperbeat + 1)

      // CHECK HOW TO CHANGE DATASTRUCTURE TO MATCH RVAE
      // if ( drumOnsets[0] ) {
      //   kick.trigger()
      // }
      

      if (kkPat.indexOf(tickCounter) >= 0) {
        if (kkMuted !== true) {
          kick.trigger()
          WebMidi.outputs[1].playNote("C1")
        }
      }
      if (snPat.indexOf(tickCounter) >= 0) {
        if (snMuted !== true) {
          snare.trigger()
          WebMidi.outputs[1].playNote("A1")
        }
      }
      if (hhPat.indexOf(tickCounter) >= 0) {
        if (hhMuted !== true) {
          hihat.trigger()
          WebMidi.outputs[1].playNote("G#1")
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


let canvas = document.getElementById("performanceCanvas");

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

playButton.addEventListener('click', () => playAudio())



export { playAudio, thresholdValue, noiseValue }