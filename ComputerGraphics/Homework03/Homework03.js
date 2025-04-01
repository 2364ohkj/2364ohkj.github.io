import { resizeAspectRatio, setupText, updateText, Axes } from './util/util.js';
import { Shader, readShaderFile } from './util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let isInitialized = false;  // main이 실행되는 순간 true로 변경
let shader;
let vao;
let positionBuffer; // 2D position을 위한 VBO
let isDrawing = false; // mouse button을 누르고 있는 동안 true
let startPoint = null;  // mouse button down 위치 (도형의 시작점)
let tempEndPoint = null; // mouse 이동 중 현재 위치
let lines = []; // 저장된 선분 정보 (두 번째 도형)
let circle = null; // 저장된 원 정보 (첫 번째 도형)
// 텍스트 출력용 DOM 요소
let textOverlay;  // 첫 번째 도형(원) 정보 표시
let textOverlay2; // 두 번째 도형(선분) 정보 표시
let textOverlay3; // 원과 선분의 교점 정보 표시 (교점 개수 포함)
let axes = new Axes(gl, 0.85); // 좌표축 그려주는 object

// DOMContentLoaded event
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
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // a_position는 2D 좌표 (x,y)로 읽음
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
}

// 캔버스 좌표를 WebGL 좌표(NDC)로 변환하는 함수
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        // 도형은 최대 2개 (첫 번째는 원, 두 번째는 선분)
        if (!isDrawing && (circle === null || lines.length < 1)) { 
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true;
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY];
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {
            if (circle === null) {
                // 첫 번째 도형: 원 (중심: startPoint, 원 위의 한 점: tempEndPoint)
                const dx = tempEndPoint[0] - startPoint[0];
                const dy = tempEndPoint[1] - startPoint[1];
                const radius = Math.sqrt(dx * dx + dy * dy);
                circle = { center: startPoint.slice(), radius: radius, segments: 100 };
                updateText(textOverlay, 
                    "Circle: center (" + startPoint[0].toFixed(2) + ", " + startPoint[1].toFixed(2) + ") radius = " + radius.toFixed(2));
            } else {
                // 두 번째 도형: 선분
                lines.push([...startPoint, ...tempEndPoint]);
                updateText(textOverlay2, "Line segment: (" + lines[lines.length-1][0].toFixed(2) + ", " + lines[lines.length-1][1].toFixed(2) +
                    ") ~ (" + lines[lines.length-1][2].toFixed(2) + ", " + lines[lines.length-1][3].toFixed(2) + ")");
            }
            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

/**
 * 원의 윤곽선을 그리는 함수
 * 채워지지 않고 선으로만 그리기 위해 LINE_LOOP 모드를 사용
 */
function drawCircle(gl, shader, centerX, centerY, radius, segments = 100) {
    const vertices = [];
    // 원 둘레의 점들만 생성 (중심은 포함하지 않음)
    for (let i = 0; i < segments; i++) {
        let angle = (i / segments) * Math.PI * 2;
        let x = centerX + radius * Math.cos(angle);
        let y = centerY + radius * Math.sin(angle);
        vertices.push(x, y, 0.0);
    }
    const vertexArray = new Float32Array(vertices);
    // 임시 버퍼 생성 및 데이터 업로드
    const tempBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tempBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(shader.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    // 윤곽선을 그리기 위해 LINE_LOOP 사용
    gl.drawArrays(gl.LINE_LOOP, 0, vertexArray.length / 3);
    gl.deleteBuffer(tempBuffer);
}

/**
 * 원과 선분의 교점을 계산하는 함수
 * 원: { center: [cx, cy], radius: r }
 * 선분: [x1, y1, x2, y2]
 * 반환: 교점이 담긴 배열 (없으면 빈 배열)
 */
function computeCircleLineIntersection(circle, line) {
    const [cx, cy] = circle.center;
    const r = circle.radius;
    const [x1, y1, x2, y2] = line;
    const dx = x2 - x1;
    const dy = y2 - y1;
    // 선분을 파라미터 t로 표현: P(t) = P0 + t*d, t in [0,1]
    const a = dx * dx + dy * dy;
    const b = 2 * ((x1 - cx) * dx + (y1 - cy) * dy);
    const c = (x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy) - r * r;
    const discriminant = b * b - 4 * a * c;
    const intersections = [];
    if (discriminant < 0) {
        // No intersection
        return intersections;
    }
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);
    // 유효한 t 값이 [0,1] 범위에 있어야 선분 위의 교점임
    if (t1 >= 0 && t1 <= 1) {
        intersections.push([x1 + t1 * dx, y1 + t1 * dy]);
    }
    if (t2 >= 0 && t2 <= 1 && discriminant > 0) {
        intersections.push([x1 + t2 * dx, y1 + t2 * dy]);
    }
    return intersections;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    shader.use();
    
    // 첫 번째 도형: 원이 저장되어 있으면 magenta 색상으로 그림
    if (circle !== null) {
        shader.setVec4("u_color", [1.0, 0.0, 1.0, 1.0]); // magenta
        drawCircle(gl, shader, circle.center[0], circle.center[1], circle.radius, circle.segments);
    }
    
    // 두 번째 도형: 선분들을 white 색상으로 그림
    for (let i = 0; i < lines.length; i++) {
        shader.setVec4("u_color", [1.0, 1.0, 1.0, 1.0]); // white
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines[i]), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
    }
    
    // 임시 도형 미리보기 (마우스 드래그 중)
    if (isDrawing && startPoint && tempEndPoint) {
        if (circle === null) {
            // 첫 번째 도형(원) 미리보기
            const dx = tempEndPoint[0] - startPoint[0];
            const dy = tempEndPoint[1] - startPoint[1];
            const radius = Math.sqrt(dx * dx + dy * dy);
            shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); // 회색
            drawCircle(gl, shader, startPoint[0], startPoint[1], radius, 100);
        } else {
            // 두 번째 도형(선분) 미리보기
            shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]); // 회색
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        }
    }
    
    // 원과 선분의 교점 계산 및 텍스트 출력 (세 번째 줄)
    if (circle !== null && lines.length > 0) {
        // 여기서는 첫 번째 선분과의 교점을 계산
        const intersections = computeCircleLineIntersection(circle, lines[0]);
        let text;
        if (intersections.length == 0) {
            text = "No intersection";
        } else {
            text = "Intersection Points: " + intersections.length;
            intersections.forEach((pt, index) => {
                text += " Point " + (index + 1) + ": (" + pt[0].toFixed(2) + ", " + pt[1].toFixed(2) + ")";
            });
        }
        updateText(textOverlay3, text);

        // 교점을 점으로 그리기
        if (intersections.length > 0) {
            // 교점은 색상을 예시로 노란색([1.0, 1.0, 0.0, 1.0])으로 설정
            shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
            intersections.forEach((pt) => {
                // 점의 위치 데이터를 업데이트하여 그리기
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pt), gl.STATIC_DRAW);
                gl.bindVertexArray(vao);
                gl.drawArrays(gl.POINTS, 0, 1);
            });
        }
    }

    
    // 좌표축 그리기 (identity 행렬 2개 전달)
    axes.draw(mat4.create(), mat4.create());
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
        shader.use();
        // 텍스트 요소 초기화 (setupText(canvas, 초기텍스트, 위치번호))
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);
        setupMouseEvents();
        render();
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
