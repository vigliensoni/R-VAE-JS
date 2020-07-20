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
    // Implement this approach later for better compatibility
    // let mouseX = Math.round(e.clientX - cRect.left);
    // let mouseY = Math.round(e.clientY - cRect.top);  
    mouseX = normalize(e.layerX, canvas.width, 3);
    mouseY = normalize(e.layerY, canvas.width, 3);
    console.log(mouseX, mouseY)
}

export { mouseX, mouseY }
