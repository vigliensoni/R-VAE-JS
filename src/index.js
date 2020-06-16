// Installing modules to be distributed with `--save` flag
// npm install --save "path"

import _ from 'lodash';

import * as path from 'path';
// import * as Max from 'max-api';
import * as fs from 'fs';
import * as glob from 'glob';
import * as tf from '@tensorflow/tfjs';
import { Midi } from '@tonejs/midi';
// import * as UI from '@tonejs/ui';
// import * as webcomponents from '@webcomponents/webcomponentsjs';
import * as Tone from "tone";


// Constants
import { MIDI_DRUM_MAP } from './constants.js';
import { DRUM_CLASSES } from './constants.js';
import { NUM_DRUM_CLASSES } from './constants.js';
import { LOOP_DURATION } from './constants.js';
import { MIN_ONSETS_THRESHOLD } from './constants.js';
const NUM_MIN_MIDI_FILES = 64;

// VAE model and Utilities
import * as utils from './utils.js';
import * as vae from './vae.js';


// CANVAS
import * as canvasDef from './canvas.js';

// DRUM SAMPLE RANDOM SEQUENCER
import * as sequencerApp from './app.js';
// sequencerApp.playAudio()

// This will be printed directly to the Max console
// Max.post(`Loaded the ${path.basename(__filename)} script`);

// Global varibles
var train_data_onsets = []; 
var train_data_velocities = []; 
var train_data_timeshifts = [];
var isGenerating = false;

var drumOnsets = new Object();

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
    
    /*    for debug - output pianoroll */
    // if (velocities.length > 0){ 
    //     var index = utils.getRandomInt(velocities.length); 
    //     let x = velocities[index];
    //     for (var i=0; i< NUM_DRUM_CLASSES; i++){
    //         for (var j=0; j < LOOP_DURATION; j++){
    //             Max.outlet("matrix_output", j, i, Math.ceil(x[i][j]));
    //         }
    //     }
    // }
    
    // 2D array to tf.tensor2d
    for (var i=0; i < onsets.length; i++){
        if (getNumOfDrumOnsets(onsets[i]) > MIN_ONSETS_THRESHOLD){
            train_data_onsets.push(tf.tensor2d(onsets[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
            train_data_velocities.push(tf.tensor2d(velocities[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
            train_data_timeshifts.push(tf.tensor2d(timeshifts[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
        }
    }
}

function processMidiFile(filename){
    // // Read MIDI file into a buffer
    var input = fs.readFileSync(filename)

    var midiFile = new Midi(input);  
    if (isValidMIDIFile(midiFile) == false){
        // utils.error("Invalid MIDI file: " + filename);
        // console.log("Invalid MIDI file: " + filename);
        return false;
    }

    var tempo = getTempo(midiFile);
    // console.log("tempo:", tempo);
    // console.log("signature:", midiFile.header.timeSignatures);
    processPianoroll(midiFile);
    // console.log("processed:", filename);
    return true;
}

// 1. Go to dir 
// 2. Read, validate, and count MIDI files
// 3. If ( count < NUM_MIN_MIDI_FILES ) { 
//     dup_factor = Math.ceil(NUM_MIN_MIDI_FILES / files.length)
// }

/////////////////////////////////////////////////////////////
// LOAD MODEL
/////////////////////////////////////////////////////////////


// Max.addHandler("loadmodel", (path)=>{
//     filepath = "file://" + path;
//     vae.loadModel(filepath);
//     utils.log_status("Model loaded!");
// });


// Fix CORS issues, for now loading it from Github
// vae.loadModel("https://raw.githubusercontent.com/vigliensoni/R-VAE-JS/master/dist/data/11-clips-footwotk-triplets.model/model.json"); // footwork
// vae.loadModel("https://raw.githubusercontent.com/vigliensoni/R-VAE/master/data/trap_all_files.model/model.json"); // footwork
// vae.loadModel("https://raw.githubusercontent.com/vigliensoni/R-VAE/master/data/4-measure-bin-ternary/model_2020616_105235.model/model.json"); // simple 4m

// vae.loadModel("http://localhost:8080/footwork-model/model_2020616_135157.model/model.json")

// FOOTWORK
vae.loadModel("https://raw.githubusercontent.com/vigliensoni/R-VAE-models/master/footwork-model/model.json") 
// TRAP
vae.loadModel("https://raw.githubusercontent.com/vigliensoni/R-VAE-models/master/trap_all_files.model/model.json") 

/////////////////////////////////////////////////////////////
// GENERATE 
/////////////////////////////////////////////////////////////

function generate(z1, z2, threshold = 0.5, noise_range = 0.0) {
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
      let NUM_DRUM_CLASSES = 3; // GV: To generate only [kk, sn, hh]
    //   drumOnsets = {} // GV Empty variable before declaring it again. Needed?

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
      }
    //   Max.outlet("generated", 1);
    //   console.log("generated", 1);
    //   utils.log_status("");
    //   console.log("");
      isGenerating = false;
  } else {
    //   utils.error_status("Model is not trained yet");
      console.log("Model is not trained yet");
  }
}

// // Generate a rhythm pattern
// Max.addHandler("generate", (z1, z2, threshold, noise_range = 0.0)=>{
//     try {
//         generatePattern(z1, z2, threshold, noise_range);
//     } catch(error) {
//         error_status(error);
//     }
// });

// async function generatePattern(z1, z2, threshold, noise_range){
//     if (vae.isReadyToGenerate()){    
//       if (isGenerating) return;
  
//       isGenerating = true;
//       let [onsets, velocities, timeshifts] = vae.generatePattern(z1, z2, noise_range);
//       Max.outlet("matrix_clear", 1); // clear all
//       for (var i=0; i< NUM_DRUM_CLASSES; i++){
//           var sequence = []; // for velocity
//           var sequenceTS = []; // for timeshift
//           // output for matrix view
//           for (var j=0; j < LOOP_DURATION; j++){
//               // if (pattern[i * LOOP_DURATION + j] > 0.2) x = 1;
//               if (onsets[i][j] > threshold){
//                 Max.outlet("matrix_output", j + 1, i + 1, 1); // index for live.grid starts from 1
           
//                 // for live.step
//                 sequence.push(Math.floor(velocities[i][j]*127. + 1)); // 0-1 -> 0-127
//                 sequenceTS.push(Math.floor(utils.scale(timeshifts[i][j], -1., 1, 0, 127))); // -1 - 1 -> 0 - 127
//               } else {
//                 sequence.push(0);
//                 sequenceTS.push(64);
//               }
//           }
  
//           // output for live.step object
//           Max.outlet("seq_output", i+1, sequence.join(" "));
//           Max.outlet("timeshift_output", i+1, sequenceTS.join(" "));
//       }
//       Max.outlet("generated", 1);
//       utils.log_status("");
//       isGenerating = false;
//   } else {
//       utils.error_status("Model is not trained yet");
//   }
// }





let canvas = document.getElementById("LSVisualizer");
canvas.addEventListener('mousemove', getMouse, false);

// let [x, y] = canvasDef.getMouse;
// console.log(x,y);


function getMouse (mousePosition) {
    let mouseX = mousePosition.layerX
    let mouseY = mousePosition.layerY
    // console.log(mouseX, mouseY)
    let normalize = (x, max, scaleToMax) => (x/max - 0.5) * 2 * scaleToMax
    generate(normalize(mouseX, canvas.width, 3), 
            normalize(mouseY, canvas.height, 3), 
            sequencerApp.thresholdValue, 
            sequencerApp.noiseValue)

}

export { drumOnsets } 


// canvas.width => +3
// 