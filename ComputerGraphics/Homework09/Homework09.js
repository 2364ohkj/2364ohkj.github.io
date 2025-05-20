import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Renderer & Scene
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Stats & Controls
const stats = new Stats();
document.body.appendChild(stats.dom);

// Cameras
const aspect = window.innerWidth / window.innerHeight;
const cameraPerspective = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
cameraPerspective.position.set(0, 100, 200);
cameraPerspective.lookAt(scene.position);
const frustumSize = 200;
const cameraOrtho = new THREE.OrthographicCamera(
  -frustumSize * aspect,
   frustumSize * aspect,
   frustumSize,
  -frustumSize,
   0.1,
   1000
);
cameraOrtho.position.copy(cameraPerspective.position);
cameraOrtho.lookAt(scene.position);

// OrbitControls (will update its camera reference on toggle)
const orbitControls = new OrbitControls(cameraPerspective, renderer.domElement);
orbitControls.enableDamping = true;

// GUI setup
const gui = new GUI();
const props = { cameraType: 'Perspective' };

// Planet definitions
const planets = [
  {
    name: 'Sun', radius: 10, distance: 0,
    texture: null, color: '#FFFF00',
    rotationSpeed: 0.005, orbitSpeed: 0
  },
  {
    name: 'Mercury', radius: 1.5, distance: 20,
    texture: './textures/mercury.jpg',
    rotationSpeed: 0.02, orbitSpeed: 0.02
  },
  {
    name: 'Venus', radius: 3, distance: 35,
    texture: './textures/venus.jpg',
    rotationSpeed: 0.015, orbitSpeed: 0.015
  },
  {
    name: 'Earth', radius: 3.5, distance: 50,
    texture: './textures/earth.jpg',
    rotationSpeed: 0.01, orbitSpeed: 0.01
  },
  {
    name: 'Mars', radius: 2.5, distance: 65,
    texture: './textures/mars.jpg',
    rotationSpeed: 0.008, orbitSpeed: 0.008
  }
];

// Load planets into scene
const loader = new THREE.TextureLoader();
planets.forEach((p) => {
  // Material
  let mat;
  if (p.texture) {
    const tex = loader.load(p.texture);
    mat = new THREE.MeshStandardMaterial({ map: tex });
  } else {
    mat = new THREE.MeshBasicMaterial({ color: p.color });
  }

  // Geometry + Mesh
  const geo = new THREE.SphereGeometry(p.radius, 32, 32);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.position.x = p.distance;

  // Orbit pivot
  const pivot = new THREE.Object3D();
  pivot.add(mesh);
  scene.add(pivot);

  // Store references
  p.mesh = mesh;
  p.pivot = pivot;

  // GUI folder for each planet (except Sun)
  if (p.name !== 'Sun') {
    const f = gui.addFolder(p.name);
    f.add(p, 'rotationSpeed', 0, 0.1, 0.001);
    f.add(p, 'orbitSpeed', 0, 0.1, 0.001);
  }
});

// Lighting
scene.add(new THREE.AmbientLight(0x333333));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(100, 100, 100);
scene.add(dirLight);

// Camera GUI
const camFolder = gui.addFolder('Camera');
camFolder.add(props, 'cameraType', ['Perspective', 'Orthographic']).onChange(() => {
  const cam = props.cameraType === 'Perspective' ? cameraPerspective : cameraOrtho;
  orbitControls.object = cam;
});

// Handle resize
overview: window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);

  // Perspective update
  cameraPerspective.aspect = w / h;
  cameraPerspective.updateProjectionMatrix();

  // Orthographic update
  const aspectRatio = w / h;
  cameraOrtho.left = -frustumSize * aspectRatio;
  cameraOrtho.right = frustumSize * aspectRatio;
  cameraOrtho.updateProjectionMatrix();
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  stats.update();
  orbitControls.update();

  planets.forEach((p) => {
    // Planet self-rotation
    p.mesh.rotation.y += p.rotationSpeed;
    // Orbit around Sun
    p.pivot.rotation.y += p.orbitSpeed;
  });

  const activeCam = props.cameraType === 'Perspective' ? cameraPerspective : cameraOrtho;
  renderer.render(scene, activeCam);
}

animate();
