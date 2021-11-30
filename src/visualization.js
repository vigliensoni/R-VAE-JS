import { MODELS_LS_DATA } from './constants.js';
import { ROWS, COLS, LOOP_DURATION, NUM_DRUM_CLASSES, Px } from './constants.js';
import { canvas } from './canvas.js';

const INST_SIDE = Math.sqrt(NUM_DRUM_CLASSES) // 3 - SIDE OF THE INSTRUMENT CUBE



// CREATING AN LS MATRIX
// one onset for each instrument at t = 0
const matLength = NUM_DRUM_CLASSES * LOOP_DURATION * COLS * ROWS
const LSMatrix = new Float32Array(matLength) 

// SYNTHETIC DATA
// function createSynthData(r, c, i, t) {
//   LSMatrix[(r * COLS * NUM_DRUM_CLASSES * LOOP_DURATION) + (c * NUM_DRUM_CLASSES * LOOP_DURATION) + (i * LOOP_DURATION) + t] = 1 // R 1st
// }

// for (let row = 0; row < ROWS; row++ ){
//   for (let col = 0; col < COLS; col++ ){
//     for (let inst = 0; inst < NUM_DRUM_CLASSES; inst++){
//       for (let time = 0; time < LOOP_DURATION; time++){
//         createSynthData(row, col, inst, time)
//       }
//     }
//   }
// }

let matrix3 = new Uint8ClampedArray(ROWS * INST_SIDE * COLS * INST_SIDE * LOOP_DURATION * Px * Px * 4)

// LOADING DATA FOR VISUALIZATION

// FOOTWORK
// let url = "https://raw.githubusercontent.com/vigliensoni/R-VAE-models/master/footwork-model/model-matrix-LS.data"

// TRAP
let spaceURL = MODELS_LS_DATA['trap']['space-url']
// let spaceURL = MODELS_LS_DATA['2-clips-12-epochs']['space-url']


async function getMatrix(spaceURL) {
  return fetch(spaceURL).then(response => response.arrayBuffer())
    .then(buffer => { 
      return new Float32Array(buffer, 0, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT); 
    });
  }


( async () => {
  let LSMatrix = await getMatrix(spaceURL);
  // console.log(LSMatrix);
  
  let matrix2 = new Float32Array(ROWS * INST_SIDE * COLS * INST_SIDE * LOOP_DURATION) 

  let counter = 0;
  for (let t = 0; t < LOOP_DURATION; t++) {
      for (let r = 0; r < ROWS; r++) {
          for (let i2 = 0; i2 < INST_SIDE; i2++) {
              for (let c = 0; c < COLS; c++) {
                  for (let i1 = 0; i1 < INST_SIDE; i1++) {
                      let pos = ( i1 * LOOP_DURATION  ) + 
                              ( c * NUM_DRUM_CLASSES * LOOP_DURATION ) + 
                              ( i2 * LOOP_DURATION * INST_SIDE  ) +  
                              ( r * NUM_DRUM_CLASSES * LOOP_DURATION * COLS ) + 
                              t
                      matrix2[counter] = LSMatrix[pos]
                      counter++
                  }
              }
          }
      }
  }
  
  
  // ///////////////////////////////////////
  // SCALE THE MATRIX TO ANY DESIRED SIZE
  // Scaling factor is given by Px. Image is converted to Uint8ClampedArray
  // ///////////////////////////////////////
  //  let matrix3 = new Uint8ClampedArray(ROWS * INST_SIDE * COLS * INST_SIDE * LOOP_DURATION * Px * Px * 4) // Four bytes (R, G, B, A)
  
  
  function scaleMatrix(t, r, c, pos, val) {
    // scale the matrix given the factor Px
      for(let y = 0; y < Px; y++) {
        for(let x = 0; x < Px; x++) {
          let idx = x * 4 + 
                  y * ( 4 * COLS * INST_SIDE * Px ) + 
                  r * ( 4 * COLS * INST_SIDE * Px * Px) + 
                  c * ( Px * 4 ) + 
                  t * ( COLS * INST_SIDE * ROWS * INST_SIDE * Px * Px * 4 )
          if (val >= 0 && pos%INST_SIDE == 0) matrix3.set([val*255, 0, 0, 255], idx)
          else if (val >= 0 && pos%INST_SIDE == 1) matrix3.set([0, val*255, 0, 255], idx) 
          else if (val >= 0 && pos%INST_SIDE == 2) matrix3.set([0, 0, val*255, 255], idx)
          
        }
      }
  
  }
  
  // Iterate over all points
  for(let t = 0; t < LOOP_DURATION; t++) {
    for(let r = 0; r < ROWS * INST_SIDE; r++) {
      for(let c = 0; c < COLS * INST_SIDE; c++) {
          let pos = r * COLS * INST_SIDE + c + t * ROWS * INST_SIDE * COLS * INST_SIDE
          let val = matrix2[pos]
          scaleMatrix(t, r, c, pos, val)
      }
    }
  }

})();


// VISUALIZE MATRIX
let ctx = canvas.getContext('2d');
// Since the canvas size is fixed to 900, this don't make sense
const height = ROWS * INST_SIDE * Px;
const width = COLS * INST_SIDE * Px;
canvas.width = width;
canvas.height = height;

let idata;
idata = ctx.createImageData(width, height);

function visualize(t) {  
  idata.data.set(matrix3.slice(width * height * 4 * (t), width * height * 4 * (t + 1)));
  ctx.putImageData(idata,0,0);
}

window.addEventListener("load", () => { visualize(0) }, false );

// 
// 1. Arreglar la matriz, no crear todo cada vez, crear un array de 96 idata
// 2. Crear funcion asincrónica
// 3. TODO ver thresholds

export { visualize }