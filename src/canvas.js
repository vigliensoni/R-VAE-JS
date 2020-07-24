// THIS FILE MAKES THE CANVAS PERFORMANCE SPACE

import { latspaceRetriever } from '.';


let isDrawing;
let mouseX;
let mouseY;
let canvas = document.getElementById("LSVisualizer");
let cRect = canvas.getBoundingClientRect();
let enableCall = true;
const normalize = (x, max, scaleToMax) => (x/max - 0.5) * 2 * scaleToMax;



canvas.addEventListener('mousedown', e => {
    if(!enableCall) return;
    isDrawing = true;
    enableCall = false;
    getMouse(e);
    latspaceRetriever(mouseX, mouseY);
    setTimeout(() => enableCall = true, 300);
});

canvas.addEventListener('mouseup', e => {
    if (isDrawing === true) {
        isDrawing = false;
    }
});

canvas.addEventListener('mousemove', e => {
    if(!enableCall) return;
    if (isDrawing === true) {
        enableCall = false;
        getMouse(e);
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

export { mouseX, mouseY, canvas }
