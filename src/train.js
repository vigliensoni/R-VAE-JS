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
          // utils.error("Invalid MIDI file: " + filename);
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
