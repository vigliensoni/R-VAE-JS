// THIS FILE MAKES THE CANVAS PERFORMANCE SPACE

let isDrawing;
let canvas = document.getElementById("LSVisualizer");

canvas.addEventListener('mousedown', e => {
    isDrawing = true;
});

canvas.addEventListener('mouseup', e => {
    if (isDrawing === true) {
        isDrawing = false;
    }
});

export { isDrawing }