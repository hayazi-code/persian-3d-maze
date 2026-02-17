import * as THREE from "three";

/**
 * Controls (Safari-friendly):
 * - Move: W/S or ArrowUp/ArrowDown
 * - Turn: A/D or ArrowLeft/ArrowRight
 * - Look up/down: I/K
 * - Reset: R  (teleport to a safe spot)
 *
 * IMPORTANT: click the scene once so it has focus.
 */

// ---------- HUD ----------
const hud = document.getElementById("hud");
function setHUD(msg) { if (hud) hud.textContent = msg; }

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
scene.fog = new THREE.Fog(0x050507, 6, 60);

// ---------- Maze (grid) ----------
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

const TILE = 1;                // world units per tile
const PLAYER_RADIUS = 0.22;    // collision radius in world units

function isWallCell(cx, cz) {
  if (cz < 0 || cz >= maze.length) return true;
  if (cx < 0 || cx >= maze[0].length) return true;
  return maze[cz][cx] === 1;
}

// Find a safe spawn: open cell with at least one open neighbor
function findSafeSpawn() {
  for (let z = 1; z < maze.length - 1; z++) {
    for (let x = 1; x < maze[0].length - 1; x++) {
      if (maze[z][x] === 0) {
        const neighborsOpen =
          (maze[z][x+1] === 0) || (maze[z][x-1] === 0) || (maze[z+1][x] === 0) || (maze[z-1][x] === 0);
        if (neighborsOpen) {
          return { x: x + 0.5, z: z + 0.5 }; // center of tile
        }
      }
    }
  }
  return { x: 1.5, z: 1.5 };
}

let spawn = findSafeSpawn();

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(spawn.x, 1.6, spawn.z);

// We'll manage yaw/pitch explicitly
let yaw = Math.PI; // face into maze-ish
let pitch = 0;
const PITCH_LIMIT = THREE.MathUtils.degToRad(70);
camera.rotation.set(pitch, yaw, 0);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);

renderer.domElement.setAttribute("tabindex", "0");
renderer.domElement.style.outline = "none";
renderer.domElement.addEventListener("click", () => renderer.domElement.focus());

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xbbbfff, 0x221100, 0.35);
scene.add(hemi);

const playerTorch = new THREE.PointLight(0xffaa55, 2.6, 24);
scene.add(playerTorch);

const torch2 = new THREE.PointLight(0xffaa55, 2.0, 20);
torch2.position.set(5.5, 2.6, 5.5);
scene.add(torch2);

// ---------- Floor + grid ----------
const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.95 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(80, 80, 0x2d2d3a, 0x1f1f2a);
grid.position.y = 0.01;
scene.add(grid);

// ---------- Walls ----------
const wallGeo = new THREE.BoxGeometry(1, 3, 1);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a5a66, roughness: 0.8, metalness: 0.05 });

for (let z = 0; z < maze.length; z++) {
  for (let x = 0; x < maze[z].length; x++) {
    if (maze[z][x] === 1) {
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set(x + 0.5, 1.5, z + 0.5); // center walls on tiles
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

// ---------- Input ----------
const keys = Object.create(null);
function down(k) { return keys[k] === true; }

function isControlKey(e) {
  const k = e.key;
  return ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","W","A","S","D","i","k","I","K","r","R"].includes(k);
}

document.addEventListener("keydown", (e) => {
  if (isControlKey(e)) e.preventDefault();
  keys[e.key] = true;

  // Reset
  if (e.key === "r" || e.key === "R") {
    const s = findSafeSpawn();
    camera.position.set(s.x, 1.6, s.z);
  }
});

document.addEventListener("keyup", (e) => {
  if (isControlKey(e)) e.preventDefault();
  keys[e.key] = false;
});

// ---------- Grid-based collision (reliable) ----------
function canStandAt(x, z) {
  // Check the four surrounding sample points around player's circle
  const samples = [
    { dx:  PLAYER_RADIUS, dz:  0 },
    { dx: -PLAYER_RADIUS, dz:  0 },
    { dx:  0, dz:  PLAYER_RADIUS },
    { dx:  0, dz: -PLAYER_RADIUS },
  ];

  for (const s of samples) {
    const px = x + s.dx;
    const pz = z + s.dz;

    const cx = Math.floor(px); // because walls are centered at tile centers and each tile is 1 unit
    const cz = Math.floor(pz);

    if (isWallCell(cx, cz)) return false;
  }
  return true;
}

// ---------- Movement ----------
const moveSpeed = 0.10;
const turnSpeed = 0.045;
const lookSpeed = 0.02;

function update() {
  // Turn
  if (down("ArrowLeft") || down("a") || down("A")) yaw += turnSpeed;
  if (down("ArrowRight") || down("d") || down("D")) yaw -= turnSpeed;

  // Look
  if (down("i") || down("I")) pitch = Math.min(PITCH_LIMIT, pitch + lookSpeed);
  if (down("k") || down("K")) pitch = Math.max(-PITCH_LIMIT, pitch - lookSpeed);

  camera.rotation.set(pitch, yaw, 0);

  // Forward vector
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  let step = 0;
  if (down("ArrowUp") || down("w") || down("W")) step += moveSpeed;
  if (down("ArrowDown") || down("s") || down("S")) step -= moveSpeed;

  if (step !== 0) {
    const nx = camera.position.x + forward.x * step;
    const nz = camera.position.z + forward.z * step;

    // Try full move; if blocked, try sliding on x then z
    if (canStandAt(nx, nz)) {
      camera.position.x = nx;
      camera.position.z = nz;
    } else if (canStandAt(nx, camera.position.z)) {
      camera.position.x = nx;
    } else if (canStandAt(camera.position.x, nz)) {
      camera.position.z = nz;
    }
  }

  // Torch follows player
  playerTorch.position.set(camera.position.x, 2.7, camera.position.z);

  // HUD: show position so we know it changes
  setHUD(
    "✅ اجرا شد. (اول یک بار روی صحنه کلیک کن تا فوکوس بگیرد)\n" +
    "حرکت: W/S یا ↑/↓   چرخش: A/D یا ←/→   نگاه بالا/پایین: I/K   ریست: R\n" +
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

  // Torch flicker
  const t = performance.now() * 0.008;
  torch2.intensity = 1.9 + Math.sin(t) * 0.18;

  update();
  renderer.render(scene, camera);
}

animate();
