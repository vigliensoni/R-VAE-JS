// THIS FILE MAKES THE CANVAS PERFORMANCE SPACE

import { latspaceRetriever } from '.';
import {
  ROWS,
  COLS,
  INST_SIDE,
  Px,
  ACCENT_COLOR,
  DEFAULT_TRAIL_SECONDS,
} from './constants.js';


let isDrawing;
let mouseX;
let mouseY;

let prevTrailX;
let prevTrailY;
let headPosX;
let headPosY;

let canvas = document.getElementById("LSVisualizer");
let cRect = canvas.getBoundingClientRect();
let enableCall = true;

const normalize = (x, max, scaleToMax) => (x/max - 0.5) * 2 * scaleToMax;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let mouseCanvas = document.getElementById("playbackheadSpace");
let mouseCanvasctx = mouseCanvas.getContext("2d");

let height = ROWS * INST_SIDE * Px;
let width = COLS * INST_SIDE * Px;

mouseCanvas.height = height;
mouseCanvas.width = width;
document.documentElement.style.setProperty("--ls-canvas-width", `${width}px`);

const factor = mouseCanvas.width/360; // amplification factor in relation to 900 px canvas

console.log(factor, height);
// console.log(mouseCanvasctx);

const HEAD_RADIUS = 10 * factor;
const HEAD_BORDER_WIDTH = 3 * factor;
const LINE_WIDTH = 6 * factor;
const HEAD_BORDER_COLOR = "#FFE188"; // bright accent highlight
let trailFadeSeconds = DEFAULT_TRAIL_SECONDS;
let lastFadeTimestamp = null;

function drawPlaybackHead(rawX, rawY, { connect = true } = {}) {
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return;
  const drawX = rawX * factor;
  const drawY = rawY * factor;

  if (
    connect &&
    Number.isFinite(prevTrailX) &&
    Number.isFinite(prevTrailY)
  ) {
    mouseCanvasctx.save();
    mouseCanvasctx.strokeStyle = ACCENT_COLOR;
    mouseCanvasctx.lineCap = "round";
    mouseCanvasctx.lineWidth = LINE_WIDTH;
    mouseCanvasctx.beginPath();
    mouseCanvasctx.moveTo(prevTrailX * factor, prevTrailY * factor);
    mouseCanvasctx.lineTo(drawX, drawY);
    mouseCanvasctx.stroke();
    mouseCanvasctx.restore();
  }

  prevTrailX = rawX;
  prevTrailY = rawY;

  headPosX = rawX;
  headPosY = rawY;

  renderHeadIndicator();
}

function fadeTrail(timestamp) {
  if (lastFadeTimestamp === null) {
    lastFadeTimestamp = timestamp;
  }
  const dt = timestamp - lastFadeTimestamp;
  lastFadeTimestamp = timestamp;

  if (trailFadeSeconds > 0 && dt > 0) {
    const alpha = clamp(dt / (trailFadeSeconds * 1000), 0, 1);
    if (alpha > 0) {
      mouseCanvasctx.save();
      mouseCanvasctx.globalCompositeOperation = "destination-out";
      mouseCanvasctx.fillStyle = `rgba(0,0,0,${alpha})`;
      mouseCanvasctx.fillRect(0, 0, mouseCanvas.width, mouseCanvas.height);
      mouseCanvasctx.restore();
    }
  }

  renderHeadIndicator();
  requestAnimationFrame(fadeTrail);
}

requestAnimationFrame(fadeTrail);

function setTrailFadeSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return;
  trailFadeSeconds = seconds;
}

function renderHeadIndicator() {
  if (!Number.isFinite(headPosX) || !Number.isFinite(headPosY)) return;
  const x = headPosX * factor;
  const y = headPosY * factor;

  mouseCanvasctx.save();
  mouseCanvasctx.fillStyle = ACCENT_COLOR;
  mouseCanvasctx.strokeStyle = HEAD_BORDER_COLOR;
  mouseCanvasctx.lineWidth = HEAD_BORDER_WIDTH;
  mouseCanvasctx.beginPath();
  mouseCanvasctx.arc(x, y, HEAD_RADIUS, 0, 2 * Math.PI);
  mouseCanvasctx.fill();
  mouseCanvasctx.stroke();
  mouseCanvasctx.restore();
}

mouseCanvas.addEventListener('mousedown', e => {
    if(!enableCall) return;
    isDrawing = true;
    enableCall = false;
    getMouse(e);
    // console.log("mouse down: " + e.layerX + ", " + e.layerY);
    // mouseCanvasctx.fillStyle = "#FF0000"
    // mouseCanvasctx.fillRect(e.layerX, e.layerY, 4, 4);

    latspaceRetriever(mouseX, mouseY);
    setTimeout(() => enableCall = true, 300);
});

mouseCanvas.addEventListener('mouseup', e => {
    if (isDrawing === true) {
        isDrawing = false;
    }
});

mouseCanvas.addEventListener('mousemove', e => {
    if(!enableCall) return;
    if (isDrawing === true) {
        enableCall = false;
        getMouse(e);
        // console.log("mouse move: " + mouseX + ", " + mouseY);
        // mouseCanvasctx.fillStyle = "#00FF00"
        // mouseCanvasctx.fillRect(e.layerX, e.layerY, 4, 4);
        
        latspaceRetriever(mouseX, mouseY);
        setTimeout(() => enableCall = true, 300);
    }
});

function getMouse(e) {
    // More compatible approach for canvas size, doesn't work
    // right with dynamic canvas size.
    // mouseX = Math.round(e.clientX - cRect.left);
    // mouseY = Math.round(e.clientY - cRect.top);
    mouseX = e.layerX;
    mouseY = e.layerY;
    mouseX = normalize(mouseX, canvas.width, 3);
    mouseY = normalize(mouseY, canvas.height, 3);
}

mouseCanvas.addEventListener('mousedown', e => {
    isDrawing = true;
   enableCall = false;
    drawPlaybackHead(e.layerX, e.layerY, { connect: false });

    setTimeout(() => enableCall = true, 100);
});



mouseCanvas.addEventListener('mousemove', e => {

    if (isDrawing === true) {
        drawPlaybackHead(e.layerX, e.layerY, { connect: true });

        setTimeout(() => enableCall = true, 100);
    }
});


mouseCanvas.addEventListener('mouseup', e => {
    // if (isDrawing === true) {
        drawPlaybackHead(e.layerX, e.layerY, { connect: false });

        setTimeout(() => enableCall = true, 100);
    // }
});

window.addEventListener("keydown", event => {
    if (event.key == "c") {
        mouseCanvasctx.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
        prevTrailX = headPosX;
        prevTrailY = headPosY;
        renderHeadIndicator();
    }
  })



// programmatic decode marker for knobs (latent coords -> accent dot on overlay)
function markDecodeAt(xNorm, yNorm) {
  const SCALE_TO_MAX = 3;                   // must match normalize(..., 3)
  // invert: (x/max - 0.5) * 2 * SCALE_TO_MAX
  const px = ((xNorm / (2 * SCALE_TO_MAX)) + 0.5) * canvas.width;
  const py = ((yNorm / (2 * SCALE_TO_MAX)) + 0.5) * canvas.height;

  drawPlaybackHead(px, py, { connect: false });
}

export { mouseX, mouseY, canvas, markDecodeAt, setTrailFadeSeconds }
