import { resizeAspectRatio, setupText } from './util.js';
import { Shader, readShaderFile } from './shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader = null;
let vao = null;

let dx = 0.0;
let dy = 0.0;

// Initialize WebGL stuffs
function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    // Set canvas dimensions
    canvas.width = 600;
    canvas.height = 600;
    
    // add resize handler
    resizeAspectRatio(gl, canvas);

    // set viewport (the first time)
    gl.viewport(0, 0, canvas.width, canvas.height);

    // set the background color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    return true;
}

// Loading the shader source files
async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

// Create and setup buffers
function setupBuffers() {
    const vertices = new Float32Array([
        // positions      // colors
         0.1, -0.1, 0.0,  1.0, 0.0, 0.0,  // bottom right, red
        -0.1, -0.1, 0.0,  1.0, 0.0, 0.0,  // bottom left, red
        -0.1,  0.1, 0.0,  1.0, 0.0, 0.0,   // top left, red
         0.1,  0.1, 0.0,  1.0, 0.0, 0.0    // top right, red
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    //한 vertex의 데이터 구조 (위의 vertices array 참조))
    //[x y z r g b] = 6개의 float 값 (size = 6)
    //↑      ↑---- color 데이터 시작 (offset: 3 * Float32Array.BYTES_PER_ELEMENT)
    //↑----------- position 데이터 시작 (offset: 0)

    shader.setAttribPointer('aPos', 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    shader.setAttribPointer('aColor', 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 
                        3 * Float32Array.BYTES_PER_ELEMENT);
}

// Render function
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);  // 0: 첫번 vertex의 index, 4: vertex의 개수
    // setupText(canvas, "Use arrow keys to move the rectangle");

    shader.setFloat('dx', dx);
    shader.setFloat('dy', dy);

    // browser에게 animation을 위해 render()를 호출하도록 요청
    // 즉, 아래의 명령은 requestAnimationFrame(function() { render(); }) 와 같다. 
    requestAnimationFrame(() => render());
}

window.addEventListener('keydown', (event) => {
    let step = 0.01;
    switch (event.key) {
        case 'ArrowUp':
            if (dy <= 0.9)
                dy += step;  // 위로 이동
            break;
        case 'ArrowDown':
            if (dy >= -0.9)
                dy -= step;  // 아래로 이동
            break;
        case 'ArrowLeft':
            if (dx >= -0.9)
                dx -= step;  // 왼쪽으로 이동
            break;
        case 'ArrowRight':
            if (dx <= 0.9)
                dx += step;  // 오른쪽으로 이동
            break;
    }
});



// Main function
async function main() {
    try {
        
        // WebGL 초기화
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        // 셰이더 초기화
        await initShader();
        
        // 나머지 초기화
        setupBuffers();
        shader.use();
        setupText(canvas, "Use arrow keys to move the rectangle", 1);
        // 렌더링 시작
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

// Call main function
// main() 함수는 프로그램 초기화 성공 여부 (success = true or false)를 return 한다.
// success = true 이면 프로그램을 계속 실행
// success = false 이면 프로그램을 종료
// catch block은 success = true 인 경우 main()의 내부에서 발생하는 error를 처리하는 부분임

main().then(success => {
    if (!success) {
        console.log('프로그램을 종료합니다.');
        return;
    }
    // 성공한 경우 여기서 추가 작업을 할 수 있음
}).catch(error => {
    // 다음과 같은 예기치 않은 에러들을 처리:
    // 1. main() 함수 자체가 실행되지 못하는 경우
    // 2. then() 블록 내부에서 발생하는 에러
    // 3. 비동기 작업 중 발생하는 처리되지 않은 에러
    console.error('프로그램 실행 중 오류 발생:', error);
});

