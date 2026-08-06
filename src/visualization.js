// visualization.js
import { ROWS, COLS, LOOP_DURATION, NUM_DRUM_CLASSES, Px } from './constants.js';
import { canvas } from './canvas.js';

const INST_SIDE = Math.sqrt(NUM_DRUM_CLASSES);
const W = COLS * INST_SIDE * Px;
const H = ROWS * INST_SIDE * Px;

let threshold = 0.25; // just a variable; no rebuilds
export const setVisibilityThreshold = v => { threshold = Math.min(1, Math.max(0, v)); };

let rgbFrames = [];
let valFrames = [];
let currentSpaceUrl = null;
let latestRequestToken = 0;

const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;
const idata = ctx.createImageData(W, H);

function rebuildFrames(matrix2) {
  const planeW = COLS * INST_SIDE;
  const planeH = ROWS * INST_SIDE;
  const pixelsPerFrame = W * H;

  const rgbTmp = new Array(LOOP_DURATION);
  const valTmp = new Array(LOOP_DURATION);

  for (let t = 0; t < LOOP_DURATION; t++) {
    const rgb = new Uint8ClampedArray(pixelsPerFrame * 3);
    const vals = new Float32Array(planeW * planeH);

    for (let rr = 0; rr < planeH; rr++) {
      for (let cc = 0; cc < planeW; cc++) {
        const logicalIdx = rr * planeW + cc + t * planeW * planeH;
        const val = matrix2[logicalIdx];
        vals[rr * planeW + cc] = val;

        // choose color by instrument plane (0,1,2)
        const plane = (cc % INST_SIDE);
        const r = plane === 0 ? val * 255 : 0;
        const g = plane === 1 ? val * 255 : 0;
        const b = plane === 2 ? val * 255 : 0;

        // write Px×Px block into rgb (no alpha)
        const x0 = cc * Px, y0 = rr * Px;
        for (let y = 0; y < Px; y++) {
          let base = ((y0 + y) * W + x0) * 3;
          for (let x = 0; x < Px; x++) {
            rgb[base] = r; rgb[base + 1] = g; rgb[base + 2] = b;
            base += 3;
          }
        }
      }
    }

    rgbTmp[t] = rgb;
    valTmp[t] = vals;
  }

  rgbFrames = rgbTmp;
  valFrames = valTmp;
}

function reindexLatentSpace(LSMatrix) {
  const total = ROWS * INST_SIDE * COLS * INST_SIDE * LOOP_DURATION;
  const matrix2 = new Float32Array(total);
  let p = 0;
  for (let t = 0; t < LOOP_DURATION; t++) {
    for (let r = 0; r < ROWS; r++) {
      for (let i2 = 0; i2 < INST_SIDE; i2++) {
        for (let c = 0; c < COLS; c++) {
          for (let i1 = 0; i1 < INST_SIDE; i1++) {
            const pos =
              (i1 * LOOP_DURATION) +
              (c * NUM_DRUM_CLASSES * LOOP_DURATION) +
              (i2 * LOOP_DURATION * INST_SIDE) +
              (r * NUM_DRUM_CLASSES * LOOP_DURATION * COLS) +
              t;
            matrix2[p++] = LSMatrix[pos];
          }
        }
      }
    }
  }
  return matrix2;
}

export async function loadLatentSpace(spaceUrl) {
  if (!spaceUrl) throw new Error('A latent-space URL is required');
  latestRequestToken += 1;
  const requestToken = latestRequestToken;
  const response = await fetch(spaceUrl);
  if (!response.ok) {
    throw new Error(`Unable to load latent space (${response.status})`);
  }
  const buf = await response.arrayBuffer();
  if (requestToken !== latestRequestToken) return; // newer request superseded this
  const LSMatrix = new Float32Array(buf);
  const matrix2 = reindexLatentSpace(LSMatrix);
  rebuildFrames(matrix2);
  currentSpaceUrl = spaceUrl;
}

// Draw current frame: combine prebuilt RGB with thresholded alpha
export function visualize(t) {
  const rgb = rgbFrames[t];
  const vals = valFrames[t];
  if (!rgb || !vals) return;

  const data = idata.data; // RGBA
  const planeW = COLS * INST_SIDE;

  // Fill RGBA
  // 1) copy RGB (tight loop)
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    data[j] = rgb[i];     // R
    data[j + 1] = rgb[i + 1]; // G
    data[j + 2] = rgb[i + 2]; // B
    // A set below
  }
  // 2) set A from vals with threshold (per logical pixel -> expanded to Px×Px)
  for (let rr = 0; rr < ROWS * INST_SIDE; rr++) {
    for (let cc = 0; cc < COLS * INST_SIDE; cc++) {
      const on = vals[rr * planeW + cc] >= threshold ? 255 : 0;
      const x0 = cc * Px, y0 = rr * Px;
      for (let y = 0; y < Px; y++) {
        let base = ((y0 + y) * W + x0) * 4 + 3; // alpha offset
        for (let x = 0; x < Px; x++) { data[base] = on; base += 4; }
      }
    }
  }

  ctx.putImageData(idata, 0, 0);
}
