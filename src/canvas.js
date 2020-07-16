// THIS FILE MAKES THE CANVAS PERFORMANCE SPACE

import { getMouse } from '.';

let isDrawing;
let mouseX;
let mouseY;
let canvas = document.getElementById("LSVisualizer");
let cRect = canvas.getBoundingClientRect();


canvas.addEventListener('mousedown', e => {
    isDrawing = true;
    mouseX = Math.round(e.clientX - cRect.left);
    mouseY = Math.round(e.clientY - cRect.top);
    getMouse(e);
});

canvas.addEventListener('mousemove', e => {
    mouseX = Math.round(e.clientX - cRect.left);
    mouseY = Math.round(e.clientY - cRect.top);
    if (isDrawing === true) {
        // getMouse();
    }
});

canvas.addEventListener('mouseup', e => {
    if (isDrawing === true) {
        isDrawing = false;
    }
});

export { canvas, isDrawing, mouseX, mouseY }