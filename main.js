import * as THREE from "three";

// ---------- HUD ----------
const hud = document.getElementById("hud");
function setHUD(msg) { if (hud) hud.textContent = msg; }
setHUD("✅ اجرا شد. با کلیدهای جهت‌دار حرکت کن. (↑↓ حرکت، ←→ چرخش)");

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
scene.fog = new THREE.Fog(0x050507, 6, 60);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);

// ---------- Lights (brighter + warm) ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

// soft overhead fill
const hemi = new THREE.HemisphereLight(0xbbbfff, 0x221100, 0.35);
scene.add(hemi);

// torch that follows the player (warm)
const playerTorch = new THREE.PointLight(0xffaa55, 2.6, 24);
scene.add(playerTorch);

// a couple static torches deeper in maze
const torch2 = new THREE.PointLight(0xffaa55, 2.0, 20);
torch2.position.set(5, 2.6, 5);
scene.add(torch2);

const torch3 = new THREE.PointLight(0xffaa55, 2.0, 20);
torch3.position.set(2, 2.6, 6);
scene.add(torch3);

// ---------- Floor (tile-like via grid overlay) ----------
const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x1c1c22,
  roughness: 0.95,
  metalness: 0.0
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// A visible grid so you can orient yourself immediately
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
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x5a5a66,
  roughness: 0.8,
  metalness: 0.05
});

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

// Ensure we spawn in an open cell (maze[1][1] is 0)
camera.position.set(1.5, 1.6, 1.5);
camera.rotation.set(0, Math.PI, 0); // look “into” the maze a bit

// ---------- Crosshair (so you always see something) ----------
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

// ---------- Controls ----------
const keys = Object.create(null);
document.addEventListener("keydown", (e) => { keys[e.key] = true; });
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

const speed = 0.09;
const turnSpeed = 0.04;

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

function updateMovement() {
  // turning
  if (keys["ArrowLeft"])  camera.rotation.y += turnSpeed;
  if (keys["ArrowRight"]) camera.rotation.y -= turnSpeed;

  // forward/back
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  let move = new THREE.Vector3();
  if (keys["ArrowUp"])   move.add(dir.clone().multiplyScalar(speed));
  if (keys["ArrowDown"]) move.add(dir.clone().multiplyScalar(-speed));

  const next = camera.position.clone().add(move);
  if (!collides(next)) camera.position.copy(next);

  // Torch follows player
  playerTorch.position.set(camera.position.x, 2.7, camera.position.z);
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Animate ----------
function animate() {
  requestAnimationFrame(animate);

  // gentle flicker
  const t = performance.now() * 0.008;
  torch2.intensity = 1.8 + Math.sin(t) * 0.15;
  torch3.intensity = 1.8 + Math.sin(t + 1.7) * 0.15;

  updateMovement();
  renderer.render(scene, camera);
}

animate();
