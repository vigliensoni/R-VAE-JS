// THIS FILE CREATES CONTROLS THE AUDIO CLOCK AND SAMPLES

import { drumOnsets } from "."

const playButton = document.getElementById('playButton')
const clockUI = document.getElementById('clock')
const kickPatternbutton = document.getElementById('kickPatternbutton')
const snarePatternbutton = document.getElementById('snarePatternbutton')
const hihatPatternbutton = document.getElementById('hihatPatternbutton')

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
const threshold = new Nexus.Dial('thresholdDial', {
  interaction: 'vertical',
  mode: 'absolute',
  min: 0.01,
  max: 0.99,
  step: 0.01,
  value: 0.5
})

const noise = new Nexus.Dial('noiseDial', {
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
        kick.trigger()
      }
      if (snPat.indexOf(tickCounter) >= 0) {
        snare.trigger()
      }
      if (hhPat.indexOf(tickCounter) >= 0) {
        hihat.trigger()
      }
    }
    
    w = kick.playOnce()
    w += snare.playOnce()
    w += hihat.playOnce() * 0.25
    return w
  }
}

let canvas = document.getElementById("performanceCanvas");
// canvas.addEventListener('mousemove', getMouse, false);

// function getMouse (mousePosition) {
//   // let mouseX = mousePosition.layerX
//   // let mouseY = mousePosition.layerY
//   // let normalize = (x, max = 3) => (x/canvas.width - 0.5) * max * 2
  
//   // console.log( normalize(mouseX), normalize(mouseY) )
//   // console.log( drumOnsets )

// }

// dials
threshold.on('change', function(t) {
  thresholdValue = t
})

noise.on('change', function(n) {
  noiseValue = n
})

// performance space listeners
canvas.addEventListener('mousedown', event => {
  // kkPat = randomPattern()
  kkPat = drumOnsets[0]
  console.log(kkPat)
  // console.log(drumOnsets[0])
})

canvas.addEventListener('mousedown', event => {
  // snPat = randomPattern()
  snPat = drumOnsets[1]
  // console.log(snPat)
})

canvas.addEventListener('mousedown', event => {
  // hhPat = randomPattern()
  hhPat = drumOnsets[2]
  // console.log(hhPat)
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