import * as THREE from "three";

/**
 * Controls:
 * - Move: ArrowUp/ArrowDown or W/S
 * - Turn: ArrowLeft/ArrowRight or A/D
 * - Look up/down: I / K  (works everywhere, avoids Safari quirks)
 * - Strafe: Q / E
 *
 * Tip: click the screen once to ensure it has keyboard focus.
 */

// ---------- HUD ----------
const hud = document.getElementById("hud");
function setHUD(msg) { if (hud) hud.textContent = msg; }

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
scene.fog = new THREE.Fog(0x050507, 6, 60);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(1.5, 1.6, 1.5);
camera.rotation.set(0, Math.PI, 0); // face into maze

// We'll manage pitch (look up/down) separately so it stays stable.
let yaw = camera.rotation.y;
let pitch = 0; // up/down
const PITCH_LIMIT = THREE.MathUtils.degToRad(70);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);

// Make sure canvas can receive focus for key events (Safari helps)
renderer.domElement.setAttribute("tabindex", "0");
renderer.domElement.style.outline = "none";

// Click to focus (important on Safari/iPad, and sometimes desktop)
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

const torch2 = new THREE.PointLight(0xffaa55, 2.0, 20);
torch2.position.set(5, 2.6, 5);
scene.add(torch2);

const torch3 = new THREE.PointLight(0xffaa55, 2.0, 20);
torch3.position.set(2, 2.6, 6);
scene.add(torch3);

// ---------- Floor + grid ----------
const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.95 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(80, 80, 0x2d2d3a, 0x1f1f2a);
grid.position.y = 0.01;
scene.add(grid);

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

const wallGeo = new THREE.BoxGeometry(1, 3, 1);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a5a66, roughness: 0.8, metalness: 0.05 });

const walls = [];
for (let z = 0; z < maze.length; z++) {
  for (let x = 0; x < maze[z].length; x++) {
    if (maze[z][x] === 1) {
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set(x, 1.5, z);
      scene.add(w);
      walls.push(w);
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

// ---------- Key handling (Safari-safe) ----------
const keys = Object.create(null);

function isMovementKey(e) {
  return (
    e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight" ||
    e.key === "w" || e.key === "a" || e.key === "s" || e.key === "d" ||
    e.key === "W" || e.key === "A" || e.key === "S" || e.key === "D" ||
    e.key === "q" || e.key === "e" || e.key === "Q" || e.key === "E" ||
    e.key === "i" || e.key === "k" || e.key === "I" || e.key === "K"
  );
}

document.addEventListener("keydown", (e) => {
  if (isMovementKey(e)) e.preventDefault(); // stop Safari scrolling / focus jumps
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  if (isMovementKey(e)) e.preventDefault();
  keys[e.key] = false;
});

// ---------- Collision ----------
function collides(pos) {
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    pos,
    new THREE.Vector3(0.42, 1.6, 0.42)
  );
  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (playerBox.intersectsBox(wallBox)) return true;
  }
  return false;
}

// ---------- Movement + Look ----------
const moveSpeed = 0.10;
const strafeSpeed = 0.08;
const turnSpeed = 0.04;
const lookSpeed = 0.02;

function keyDown(...names) {
  return names.some((n) => keys[n] === true);
}

function updateMovement() {
  // Turning (yaw)
  if (keyDown("ArrowLeft", "a", "A")) yaw += turnSpeed;
  if (keyDown("ArrowRight", "d", "D")) yaw -= turnSpeed;

  // Look up/down (pitch) - use I/K so we don't fight ArrowUp/Down movement
  if (keyDown("i", "I")) pitch = Math.min(PITCH_LIMIT, pitch + lookSpeed);
  if (keyDown("k", "K")) pitch = Math.max(-PITCH_LIMIT, pitch - lookSpeed);

  // Apply rotation
  camera.rotation.set(pitch, yaw, 0);

  // Forward/back
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  // Right vector (for strafing)
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  let move = new THREE.Vector3();

  // Forward/back: ArrowUp/Down OR W/S
  if (keyDown("ArrowUp", "w", "W")) move.add(forward.clone().multiplyScalar(moveSpeed));
  if (keyDown("ArrowDown", "s", "S")) move.add(forward.clone().multiplyScalar(-moveSpeed));

  // Strafe: Q/E
  if (keyDown("q", "Q")) move.add(right.clone().multiplyScalar(-strafeSpeed));
  if (keyDown("e", "E")) move.add(right.clone().multiplyScalar(strafeSpeed));

  const next = camera.position.clone().add(move);
  if (!collides(next)) camera.position.copy(next);

  // Torch follows player (always visible)
  playerTorch.position.set(camera.position.x, 2.7, camera.position.z);
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop ----------
setHUD("✅ اجرا شد. کلیک کن تا صفحه فوکوس بگیرد. سپس با کلیدها حرکت کن: ↑↓ حرکت، ←→ چرخش، I/K نگاه بالا/پایین، Q/E حرکت کناری.");

function animate() {
  requestAnimationFrame(animate);

  // torch flicker
  const t = performance.now() * 0.008;
  torch2.intensity = 1.9 + Math.sin(t) * 0.18;
  torch3.intensity = 1.9 + Math.sin(t + 1.7) * 0.18;

  updateMovement();

  // HUD position readout (proves movement)
  if (hud) {
    hud.textContent =
      "✅ اجرا شد. کلیک کن تا فوکوس بگیرد.\n" +
      "↑↓ حرکت، ←→ چرخش، I/K نگاه بالا/پایین، Q/E حرکت کناری.\n" +
      `موقعیت: x=${camera.position.x.toFixed(2)}  z=${camera.position.z.toFixed(2)}`;
  }

  renderer.render(scene, camera);
}

animate();
