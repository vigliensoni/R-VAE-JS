// Installing modules to be distributed with `--save` flag
// npm install --save "path"

import _ from 'lodash';

import * as tf from '@tensorflow/tfjs';
import { Midi } from '@tonejs/midi';
import { thresholdValue, noiseValue } from './app.js';

// Constants
import { MIDI_DRUM_MAP } from './constants.js';
// import { DRUM_CLASSES } from './constants.js';
import { NUM_DRUM_CLASSES } from './constants.js';
import { LOOP_DURATION } from './constants.js';
import { MIN_ONSETS_THRESHOLD } from './constants.js';
import { MODELS_LS_DATA } from './constants.js';
const NUM_MIN_MIDI_FILES = 64;


// VAE model and Utilities
import * as utils from './utils.js';
import * as vae from './vae.js';

// DRUM SAMPLE RANDOM SEQUENCER
import * as sequencerApp from './app.js';
// sequencerApp.playAudio()

// Canvas
import { mouseX, mouseY } from './canvas.js';


// This will be printed directly to the Max console

// Global varibles
var train_data_onsets = [];
var train_data_velocities = [];
var train_data_timeshifts = [];
var isGenerating = false;

var drumOnsets = new Object();
var drumVelocities = new Object();

/////////////////////////////////////////////////////////////

function isValidMIDIFile(midiFile){
    if (midiFile.header.tempos.length > 1){
        utils.error("not compatible with midi files containing multiple tempo changes")
        return false;
    }
    return true;
}

function getTempo(midiFile){
    if (midiFile.header.tempos.length == 0) return 120.0 // no tempo info, then use 120.0
    return midiFile.header.tempos[0].bpm;  // use the first tempo info and ignore tempo changes in MIDI file
}

// Get location of a note in pianoroll
function getNoteIndexAndTimeshift(note, tempo){
    const unit = (60.0 / tempo) / 12.0; // the duration of 16th note
    const half_unit = unit * 0.5;

    const index = Math.max(0, Math.floor((note.time + half_unit) / unit)) // centering
    const timeshift = (note.time - unit * index)/half_unit; // normalized

    return [index, timeshift];
}

function getNumOfDrumOnsets(onsets){
    var count = 0;
    for (var i = 0; i < NUM_DRUM_CLASSES; i++){
        for (var j=0; j < LOOP_DURATION; j++){
            if (onsets[i][j] > 0) count += 1;
        }
    }
    return count;
}

// Convert midi into pianoroll matrix
function processPianoroll(midiFile){
    const tempo = getTempo(midiFile);

    // data array
    var onsets = [];
    var velocities = [];
    var timeshifts = [];

    midiFile.tracks.forEach(track => {

        //notes are an array
        const notes = track.notes
        notes.forEach(note => {
            if ((note.midi in MIDI_DRUM_MAP)){
                let timing = getNoteIndexAndTimeshift(note, tempo);
                let index = timing[0];
                let timeshift = timing[1];

                // add new array
                while (Math.floor(index / LOOP_DURATION) >= onsets.length){
                    onsets.push(utils.create2DArray(NUM_DRUM_CLASSES, LOOP_DURATION));
                    velocities.push(utils.create2DArray(NUM_DRUM_CLASSES, LOOP_DURATION));
                    timeshifts.push(utils.create2DArray(NUM_DRUM_CLASSES, LOOP_DURATION));
                }
                // store velocity
                let drum_id = MIDI_DRUM_MAP[note.midi];

                let matrix = onsets[Math.floor(index / LOOP_DURATION)];
                matrix[drum_id][index % LOOP_DURATION] = 1;    // 1 for onsets

                matrix = velocities[Math.floor(index / LOOP_DURATION)];
                matrix[drum_id][index % LOOP_DURATION] = note.velocity;    // normalized 0 - 1

                // store timeshift
                matrix = timeshifts[Math.floor(index / LOOP_DURATION)];
                matrix[drum_id][index % LOOP_DURATION] = timeshift;    // normalized -1 - 1
            }
        })
    })
    console.log("# of bars in training data:", train_data_onsets.length * 2);
    document.getElementById("num-files-label").innerHTML = "bars in training data:" + train_data_onsets.length * 2;
    // 2D array to tf.tensor2d
    for (var i=0; i < onsets.length; i++){
        if (getNumOfDrumOnsets(onsets[i]) > MIN_ONSETS_THRESHOLD){
            //console.log(onsets[i], velocities[i], timeshifts[i])
            train_data_onsets.push(tf.tensor2d(onsets[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
            train_data_velocities.push(tf.tensor2d(velocities[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
            train_data_timeshifts.push(tf.tensor2d(timeshifts[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
        }
    }
}

const saveButton = document.getElementById('save-button')
saveButton.addEventListener('mousedown', () => {
  if (vae.isReadyToGenerate()){
      let filepath = "file://mymodel.json"
      vae.saveModel(filepath).then(result => {
          utils.log_status('Model result was: ', result);
          console.log('Model result was: ', result);
          createMatrix(path).then(result => {
              utils.log_status('Matrix result was: ', result);
              console.log('Matrix result was: ', result);
          })
      })
  }
})

const fileSelectorSave = document.getElementById('file-selector-save');
console.log("fileSelectorSave",fileSelectorSave)
fileSelectorSave.addEventListener('change', (event) => {
  const fileList = event.target.files;
  console.log("fileSelectorSave",event.target);
  // if (vae.isReadyToGenerate()){
  //     let filepath = "file://" + fileList[0];
  //     vae.saveModel(filepath).then(result => {
  //         utils.log_status('Model result was: ', result);
  //         console.log('Model result was: ', result);
  //         createMatrix(path).then(result => {
  //             utils.log_status('Matrix result was: ', result);
  //             console.log('Matrix result was: ', result);
  //         })
  //     })
  // }
})

//
const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', (event) => {
  const fileList = event.target.files;
  console.log(fileList);
  let dup_factor = 1;
  if ( fileList.length < NUM_MIN_MIDI_FILES ) {
      dup_factor = Math.ceil(NUM_MIN_MIDI_FILES / fileList.length );
      utils.post("duplication factor: " + dup_factor);
  } else {
      dup_factor = 1;
  }
  const newFileList = [];
  for(let i = 0; i < dup_factor; i++) {
    for(let j = 0; j < fileList.length;j++) {
      newFileList.push(fileList[j])
    }
  }
  var actions = Array.from(newFileList).map(async (f)=> {
    return await f.arrayBuffer();
  })
  Promise.all(actions).then((buffers)=> {
    for(let i = 0; i < buffers.length; i++) {
      var midiFile = new Midi(buffers[i]);
      if (isValidMIDIFile(midiFile) == false){
          console.log("Invalid MIDI file: " + filename);
      }

      var tempo = getTempo(midiFile);
      console.log("tempo:", tempo);
      console.log("signature:", midiFile.header.timeSignatures);
      processPianoroll(midiFile);
      console.log("processed:");
    }
  });
});
const trainButton = document.getElementById('trainButton')
trainButton.addEventListener('mousedown', () => {
  console.log("# of bars in training data:", train_data_onsets.length * 2);
  vae.loadAndTrain(train_data_onsets, train_data_velocities, train_data_timeshifts)
})

function processMidiFile(filename){
  return new Promise((resolve, reject)=> {
    var midiFile = new Midi(request.response);
    if (isValidMIDIFile(midiFile) == false){
        console.log("Invalid MIDI file: " + filename);
        reject()
    }

    var tempo = getTempo(midiFile);
    console.log("tempo:", tempo);
    console.log("signature:", midiFile.header.timeSignatures);
    processPianoroll(midiFile);
    console.log("processed:", filename);
    resolve()
  })
}

/////////////////////////////////////////////////////////////
// GENERATE
/////////////////////////////////////////////////////////////

function generate(z1, z2, threshold = thresholdValue, noise_range = noiseValue) {
    try {
        generatePattern(z1, z2, threshold, noise_range);
        // console.log('GV generatePattern');
    } catch(error) {
        error_status(error);
        // console.log('GV error');
    }
};

async function generatePattern(z1, z2, threshold, noise_range){
    // TODO: true added to skip contidition, need to check why this is needed
    if (vae.isReadyToGenerate() || true){
      if (isGenerating) return;

      isGenerating = true;
    //   note z2 axis is inverted, i.e., negative on top
      let [onsets, velocities, timeshifts] = vae.generatePattern(z1, -1*z2, noise_range);
    //   let NUM_DRUM_CLASSES = 3; // GV: To generate only [kk, sn, hh]
    //   drumOnsets = {} // GV Empty variable before declaring it again. Needed?
      console.log(onsets)
      for (var i=0; i< NUM_DRUM_CLASSES; i++){
          var sequence = []; // for velocity
          var sequenceTS = []; // for timeshift
          // output for matrix view
          for (var j=0; j < LOOP_DURATION; j++){
              if (onsets[i][j] > threshold){
                sequence.push(Math.floor(velocities[i][j]*127. + 1)); // 0-1 -> 0-127
                sequenceTS.push(Math.floor(utils.scale(timeshifts[i][j], -1., 1, 0, 127))); // -1 - 1 -> 0 - 127
              } else {
                sequence.push(0);
                sequenceTS.push(64);
              }
          }

          // output for live.step object
        //   Max.outlet("seq_output", i+1, sequence.join(" "));
        //   console.log("seq_output", i+1, sequence.join(" "));
        //   Max.outlet("timeshift_output", i+1, sequenceTS.join(" "));

        // One-liner to return indices of onsets (https://stackoverflow.com/questions/26468557/return-index-value-from-filter-method-javascript)
        // GV Missing here is to store the velocity for each onset
        let onsetIndices = sequence.map((value, index) => value > 0 ? index : undefined).filter(x => x !== undefined)
        drumOnsets[i] = onsetIndices
        let onsetVelocities = onsetIndices.map(x => sequence[x])
        drumVelocities[i] = onsetVelocities
      }

      isGenerating = false;
  } else {
    //   utils.error_status("Model is not trained yet");
      console.log("Model is not trained yet");
  }
}


// RETRIEVE DATA FROM LATENT SPACE
var kkPat = []
var snPat = []
var hhPat = []
var kkVel = []
var snVel = []
var hhVel = []

function latspaceRetriever (mouseX, mouseY) {
    generate(mouseX,
            mouseY,
            sequencerApp.thresholdValue,
            sequencerApp.noiseValue);
    console.log("latspaceRetriever",drumOnsets)
    kkPat = drumOnsets[0];
    snPat = drumOnsets[1];
    hhPat = drumOnsets[2];
    kkVel = drumVelocities[0];
    snVel = drumVelocities[1];
    hhVel = drumVelocities[2];
}

export { latspaceRetriever, kkPat, snPat, hhPat, kkVel, snVel, hhVel}
