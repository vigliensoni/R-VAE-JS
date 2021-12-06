// THIS FILE MAKES THE CANVAS PERFORMANCE SPACE

import { latspaceRetriever } from '.';
import { ROWS, COLS, INST_SIDE, Px } from './constants.js';


let isDrawing;
let mouseX;
let mouseY;

let mouseXprevious;
let mouseYprevious;

let canvas = document.getElementById("LSVisualizer");
let cRect = canvas.getBoundingClientRect();
let enableCall = true;

const normalize = (x, max, scaleToMax) => (x/max - 0.5) * 2 * scaleToMax;

let mouseCanvas = document.getElementById("playbackheadSpace");
let mouseCanvasctx = mouseCanvas.getContext("2d");

let height = ROWS * INST_SIDE * Px;
let width = COLS * INST_SIDE * Px;

mouseCanvas.height = height;
mouseCanvas.width = width;

const factor = mouseCanvas.width/360; // amplification factor in relation to 900 px canvas

console.log(factor, height);
// console.log(mouseCanvasctx);

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

    mouseCanvasctx.fillStyle = "#00FF00"
    mouseCanvasctx.beginPath();
    mouseCanvasctx.arc(mouseXprevious*factor, mouseYprevious*factor, 10*factor, 0, 2*Math.PI);
    mouseCanvasctx.fill();   


    mouseCanvasctx.fillStyle = "#FF0000"
    mouseCanvasctx.beginPath();
    mouseCanvasctx.arc(e.layerX*factor, e.layerY*factor, 10*factor, 0, 2*Math.PI);
    mouseCanvasctx.fill();
    
    mouseXprevious = e.layerX;
    mouseYprevious = e.layerY;

    setTimeout(() => enableCall = true, 100);
});



mouseCanvas.addEventListener('mousemove', e => {

    if (isDrawing === true) {
        mouseCanvasctx.fillStyle = "#00FF00"
        mouseCanvasctx.beginPath();
        mouseCanvasctx.arc(mouseXprevious*factor, mouseYprevious*factor, 10*factor, 0, 2*Math.PI);
        mouseCanvasctx.fill();        
        
        mouseCanvasctx.fillStyle = "#FF0000"
        mouseCanvasctx.beginPath();
        mouseCanvasctx.arc(e.layerX*factor, e.layerY*factor, 10*factor, 0, 2*Math.PI);
        mouseCanvasctx.fill();
        
        mouseXprevious = e.layerX;
        mouseYprevious = e.layerY;

        setTimeout(() => enableCall = true, 100);
    }
});


mouseCanvas.addEventListener('mouseup', e => {
    // if (isDrawing === true) {
        mouseCanvasctx.fillStyle = "#FF0000"

        mouseCanvasctx.beginPath();
        mouseCanvasctx.arc(e.layerX*factor, e.layerY*factor, 10*factor, 0, 2*Math.PI);
        mouseCanvasctx.fill();

        mouseXprevious = e.layerX;
        mouseYprevious = e.layerY;

        setTimeout(() => enableCall = true, 100);
    // }
});

window.addEventListener("keydown", event => {
    if (event.key == "c") {
        mouseCanvasctx.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
    }
  })


export { mouseX, mouseY, canvas }
