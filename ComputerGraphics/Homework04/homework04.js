import { resizeAspectRatio, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let axes;
let sunTransform;
let earthTransform;
let moonTransform;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    return true;
}

function setupBuffers() {
    const cubeVertices = new Float32Array([
        -0.5,  0.5,  // 좌상단
        -0.5, -0.5,  // 좌하단
         0.5, -0.5,  // 우하단
         0.5,  0.5   // 우상단
    ]);

    const indices = new Uint16Array([
        0, 1, 2,    // 첫 번째 삼각형
        0, 2, 3     // 두 번째 삼각형
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // VBO for position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    // EBO
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function getTranslationMatrix(dx, dy) {
    const T = mat4.create();
    mat4.translate(T, T, [dx, dy, 0]);
    return T;
}

function getRotationMatrix(r) {
    const R = mat4.create();
    mat4.rotate(R, R, r, [0, 0, 1]);
    return R;
}

function getScaleMatrix(s) {
    const S = mat4.create();
    mat4.scale(S, S, [s, s, 1]);
    return S;
}

function applyTransform(time) {

    sunTransform = getScaleMatrix(0.2);
    mat4.multiply(sunTransform, getRotationMatrix(Math.PI / 4 * time), sunTransform);
    
    earthTransform = getScaleMatrix(0.1);
    mat4.multiply(earthTransform, getRotationMatrix(Math.PI * time), earthTransform);
    mat4.multiply(earthTransform, getTranslationMatrix(0.7, 0), earthTransform);
    mat4.multiply(earthTransform, getRotationMatrix(Math.PI / 6 * time), earthTransform);

    moonTransform = getScaleMatrix(0.05);
    mat4.multiply(moonTransform, getRotationMatrix(Math.PI * time), moonTransform);
    mat4.multiply(moonTransform, getTranslationMatrix(0.2, 0), moonTransform);
    mat4.multiply(moonTransform, getRotationMatrix(Math.PI * time * 2), moonTransform);
    mat4.multiply(moonTransform, getTranslationMatrix(0.7, 0), moonTransform);
    mat4.multiply(moonTransform, getRotationMatrix(Math.PI / 6 * time), moonTransform);

}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // draw axes
    axes.draw(mat4.create(), mat4.create()); 

    // draw cube
    shader.use();
    gl.bindVertexArray(vao);
    // gl.drawElements(mode, index_count, type, byte_offset);
    shader.setMat4("u_model", sunTransform);
    shader.setVec4("u_color", [1.0, 0.0, 0.0, 1.0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    shader.setMat4("u_model", earthTransform);
    shader.setVec4("u_color", [0.0, 1.0, 1.0, 1.0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    shader.setMat4("u_model", moonTransform);
    shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function animate(currentTime) {
    let time = currentTime / 1000;

    applyTransform(time);

    render();

    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        await initShader();

        setupBuffers();
        axes = new Axes(gl, 0.8);

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
