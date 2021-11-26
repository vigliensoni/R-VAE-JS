// THIS FILE MAKES THE CANVAS PERFORMANCE SPACE

import { latspaceRetriever } from '.';


let isDrawing;
let mouseX;
let mouseY;
let canvas = document.getElementById("LSVisualizer");
let cRect = canvas.getBoundingClientRect();
let enableCall = true;

const normalize = (x, max, scaleToMax) => (x/max - 0.5) * 2 * scaleToMax;

let mouseCanvas = document.getElementById("playbackheadSpace");
let mouseCanvasctx = mouseCanvas.getContext("2d");
console.log(mouseCanvas);
console.log(mouseCanvasctx);

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
    console.log("mouse down: " + e.layerX + ", " + e.layerY);
    // if(!enableCall) return;
    isDrawing = true;
    enableCall = false;
    
    mouseCanvasctx.fillStyle = "#FF0000"
    mouseCanvasctx.fillRect(e.layerX, e.layerY, 10, 10);

    setTimeout(() => enableCall = true, 100);
});



mouseCanvas.addEventListener('mousemove', e => {
    console.log("mouse move: " + mouseX + ", " + mouseY);
    // if(!enableCall) return;
    if (isDrawing === true) {
        enableCall = false;
        
        mouseCanvasctx.fillStyle = "#00FF00"
        mouseCanvasctx.fillRect(e.layerX, e.layerY, 10, 10);
        
        setTimeout(() => enableCall = true, 100);
    }
});


export { mouseX, mouseY, canvas }
