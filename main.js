import * as THREE from "three";

/*
Controls (Arrow Keys Only):

↑  Move forward
↓  Move backward
←  Turn left
→  Turn right

Click once on the scene to give it focus.
*/

// ---------- HUD ----------
const hud = document.getElementById("hud");
function setHUD(msg) { if (hud) hud.textContent = msg; }

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
scene.fog = new THREE.Fog(0x050507, 6, 60);

// ---------- Maze ----------
const maze = [
  [1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,1],
  [1,0,1,0,1,0,1,1],
  [1,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,0,1],
  [1,0,0,0,0,1,0,1],
  [1,1,1,1,0,1,0,1],
  [1,1,1,1,1,1,1,1],
];

const TILE = 1;
const PLAYER_RADIUS = 0.22;

function isWallCell(cx, cz) {
  if (cz < 0 || cz >= maze.length) return true;
  if (cx < 0 || cx >= maze[0].length) return true;
  return maze[cz][cx] === 1;
}

function findSafeSpawn() {
  for (let z = 1; z < maze.length - 1; z++) {
    for (let x = 1; x < maze[0].length - 1; x++) {
      if (maze[z][x] === 0) {
        return { x: x + 0.5, z: z + 0.5 };
      }
    }
  }
  return { x: 1.5, z: 1.5 };
}

let spawn = findSafeSpawn();

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  250
);

camera.position.set(spawn.x, 1.6, spawn.z);

let yaw = Math.PI;
camera.rotation.set(0, yaw, 0);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);

renderer.domElement.setAttribute("tabindex", "0");
renderer.domElement.style.outline = "none";
renderer.domElement.addEventListener("click", () => {
  renderer.domElement.focus();
});

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xbbbfff, 0x221100, 0.35);
scene.add(hemi);

const playerTorch = new THREE.PointLight(0xffaa55, 2.6, 24);
scene.add(playerTorch);

// ---------- Floor ----------
const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x1c1c22,
  roughness: 0.95
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(80, 80, 0x2d2d3a, 0x1f1f2a);
grid.position.y = 0.01;
scene.add(grid);

// ---------- Walls ----------
const wallGeo = new THREE.BoxGeometry(1, 3, 1);
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x5a5a66,
  roughness: 0.8
});

for (let z = 0; z < maze.length; z++) {
  for (let x = 0; x < maze[z].length; x++) {
    if (maze[z][x] === 1) {
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set(x + 0.5, 1.5, z + 0.5);
      scene.add(w);
    }
  }
}

// ---------- Crosshair ----------
const crosshair = document.createElement("div");
crosshair.style.position = "fixed";
crosshair.style.left = "50%";
crosshair.style.top = "50%";
crosshair.style.transform = "translate(-50%, -50%)";
crosshair.style.width = "10px";
crosshair.style.height = "10px";
crosshair.style.border = "2px solid rgba(255,255,255,0.6)";
crosshair.style.borderRadius = "50%";
crosshair.style.pointerEvents = "none";
crosshair.style.zIndex = "20";
document.body.appendChild(crosshair);

// ---------- Arrow Key Input Only ----------
const keys = {};

document.addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.key] = false;
});

// ---------- Collision ----------
function canStandAt(x, z) {
  const samples = [
    { dx:  PLAYER_RADIUS, dz:  0 },
    { dx: -PLAYER_RADIUS, dz:  0 },
    { dx:  0, dz:  PLAYER_RADIUS },
    { dx:  0, dz: -PLAYER_RADIUS },
  ];

  for (const s of samples) {
    const px = x + s.dx;
    const pz = z + s.dz;

    const cx = Math.floor(px);
    const cz = Math.floor(pz);

    if (isWallCell(cx, cz)) return false;
  }
  return true;
}

// ---------- Movement ----------
const moveSpeed = 0.10;
const turnSpeed = 0.045;

function update() {

  if (keys["ArrowLeft"]) yaw += turnSpeed;
  if (keys["ArrowRight"]) yaw -= turnSpeed;

  camera.rotation.set(0, yaw, 0);

  let step = 0;
  if (keys["ArrowUp"]) step += moveSpeed;
  if (keys["ArrowDown"]) step -= moveSpeed;

  if (step !== 0) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const nx = camera.position.x + forward.x * step;
    const nz = camera.position.z + forward.z * step;

    if (canStandAt(nx, nz)) {
      camera.position.x = nx;
      camera.position.z = nz;
    }
  }

  playerTorch.position.set(camera.position.x, 2.7, camera.position.z);

  setHUD(
    "حرکت با کلیدهای جهت‌دار ↑↓←→\n" +
    `موقعیت: x=${camera.position.x.toFixed(2)}  z=${camera.position.z.toFixed(2)}`
  );
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop ----------
function animate() {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
}

animate();
