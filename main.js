import * as THREE from "three";

// ---------- On-screen HUD + error trapping ----------
const hud = document.getElementById("hud");

function setHUD(msg) {
  if (hud) hud.textContent = msg;
}

window.addEventListener("error", (e) => {
  setHUD("❌ خطا:\n" + (e?.message || e) + "\n\n(برای جزئیات، کنسول مرورگر را ببینید.)");
});
window.addEventListener("unhandledrejection", (e) => {
  setHUD("❌ خطا (Promise):\n" + (e?.reason?.message || e?.reason || e) + "\n\n(برای جزئیات، کنسول مرورگر را ببینید.)");
});

setHUD("✅ main.js اجرا شد. در حال ساخت صحنه…");

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 4, 35);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(1.5, 1.6, 1.5);

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);

// ---------- Lighting ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

// Torch near player
const torch1 = new THREE.PointLight(0xffaa55, 2.4, 18);
torch1.position.set(1.5, 2.7, 1.5);
scene.add(torch1);

// Second torch
const torch2 = new THREE.PointLight(0xffaa55, 1.7, 14);
torch2.position.set(5, 2.7, 5);
scene.add(torch2);

// ---------- Floor ----------
const floorGeo = new THREE.PlaneGeometry(60, 60);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

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
const wallMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.85 });

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

// ---------- Controls (Arrow keys) ----------
const keys = Object.create(null);
document.addEventListener("keydown", (e) => { keys[e.key] = true; });
document.addEventListener("keyup", (e) => { keys[e.key] = false; });

const speed = 0.08;
const turnSpeed = 0.035;

function collides(pos) {
  // Simple player box
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    pos,
    new THREE.Vector3(0.45, 1.6, 0.45)
  );

  for (const wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (playerBox.intersectsBox(wallBox)) return true;
  }
  return false;
}

function updateMovement() {
  // Turning
  if (keys["ArrowLeft"])  camera.rotation.y += turnSpeed;
  if (keys["ArrowRight"]) camera.rotation.y -= turnSpeed;

  // Forward/back
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  let move = new THREE.Vector3();
  if (keys["ArrowUp"])   move.add(dir.clone().multiplyScalar(speed));
  if (keys["ArrowDown"]) move.add(dir.clone().multiplyScalar(-speed));

  const next = camera.position.clone().add(move);
  if (!collides(next)) camera.position.copy(next);

  // Keep torch near player so you always see something
  torch1.position.set(camera.position.x, 2.7, camera.position.z);
}

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Loop ----------
setHUD("✅ اجرا شد. با کلیدهای جهت‌دار حرکت کن.");

function animate() {
  requestAnimationFrame(animate);

  // Tiny flicker for torch2 (subtle)
  torch2.intensity = 1.55 + Math.sin(performance.now() * 0.008) * 0.15;

  updateMovement();
  renderer.render(scene, camera);
}

animate();
