// THIS FILE MAKES THE CANVAS PERFORMANCE SPACE

import { kkMuted } from "./app.js"

let mouseX;
let mouseY;
let isDrawing
let colorFill

let canvasWidth;
let canvasHeight;

let canvas = document.getElementById("LSVisualizer");

let context = canvas.getContext("2d");

canvasWidth = window.innerWidth / 2;
canvasHeight = window.innerHeight / 2;

canvas.style.position = "relative"

canvas.setAttribute("height", canvasHeight);

canvas.width = canvasWidth;
canvas.height = canvasHeight;

canvas.style.top = 0
canvas.style.right = 0


// canvas.addEventListener('mousemove', getMouse, false);

// function getMouse (mousePosition) {
//     mouseX = mousePosition.layerX;
//     mouseY = mousePosition.layerY;
//     // console.log(mouseX/canvas.width, mouseY/canvas.height);
// }

canvas.addEventListener('mousedown', e => {
    // mouseX = e.offsetX
    // mouseY = e.offsetY
    isDrawing = true
})

canvas.addEventListener('mousemove', e => {
    if (isDrawing === true) {
        draw(colorFill="#00FF00")
        mouseX = e.offsetX
        mouseY = e.offsetY
    }

})

canvas.addEventListener('mouseup', e => {
    if (isDrawing === true) {
        draw(colorFill="#FFFF00")
        // mouseX = e.offsetX
        // mouseY = e.offsetY
        isDrawing = false
    }
})

function draw(colorFill) {
    // console.log(mouseX, mouseY)
    // context.fillStyle = "#000000";
    // context.fillRect(0, 0, canvasWidth, canvasHeight);
    // context.strokeStyle = "#000000";
    // context.fillStyle = colorFill
    // context.beginPath();
    // context.arc(mouseX, mouseY, 20, 0, Math.PI*2, true);
    // context.closePath();
    // context.stroke();
    // context.fill();

    // requestAnimationFrame(draw)
}

// requestAnimationFrame(draw);

export { isDrawing, canvas }