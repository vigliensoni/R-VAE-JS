let mouseX;
let mouseY;

let canvasWidth;
let canvasHeight;

let canvas = document.getElementById("performanceCanvas");

context = canvas.getContext("2d");

canvasWidth = window.innerWidth / 2;
canvasHeight = window.innerHeight / 2;

canvas.style.position = "fixed"

canvas.setAttribute("height", canvasHeight);

canvas.width = canvasWidth;
canvas.height = canvasHeight;

canvas.style.top = 0;
canvas.style.right = 0;

canvas.addEventListener('mousemove', getMouse, false);

function getMouse (mousePosition) {
    mouseX = mousePosition.layerX;
    mouseY = mousePosition.layerY;
    // console.log(mouseX/canvas.width, mouseY/canvas.height);
}

function draw() {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.strokeStyle = "#00FF00";
    context.fillStyle = "#FFFF00";
    context.beginPath();
    context.arc(mouseX, mouseY, 20, 0, Math.PI*2, true);
    context.closePath();
    context.stroke();
    context.fill();

    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);


// export { getMouse };