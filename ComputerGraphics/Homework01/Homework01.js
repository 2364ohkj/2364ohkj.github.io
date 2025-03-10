// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// Set canvas size: 현재 window 전체를 canvas로 사용
canvas.width = 500;
canvas.height = 500;

let halfSide = canvas.width / 2;

// Enable scissor test
gl.enable(gl.SCISSOR_TEST);

// Function to clear each quadrant with different colors
function clearQuadrant(x, y, side, color) {
    gl.viewport(x, y, side, side);
    gl.scissor(x, y, side, side);
    gl.clearColor(...color);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

// Start rendering
render();

// Render loop
function render() {
    clearQuadrant(0, halfSide, halfSide, [1.0, 0.0, 0.0, 1.0]);
    clearQuadrant(halfSide, halfSide, halfSide, [0.0, 1.0, 0.0, 1.0]);
    clearQuadrant(0, 0, halfSide, [0.0, 0.0, 1.0, 1.0]);
    clearQuadrant(halfSide, 0, halfSide, [1.0, 1.0, 0.0, 1.0]);
}

// Resize viewport when window size changes
window.addEventListener('resize', () => {
    canvas.width = Math.min(window.innerWidth, window.innerHeight);
    canvas.height = Math.min(window.innerWidth, window.innerHeight);
    halfSide = canvas.width / 2;
    render();
});

