import * as THREE from "three";

// --------------------
// Scene Setup
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 5, 40);

// --------------------
// Camera
// --------------------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(1.5, 1.6, 1.5);

// --------------------
// Renderer
// --------------------
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Debug label
const dbg = document.getElementById("dbg");
if (dbg) dbg.textContent = "JS running. Use arrow keys.";

// --------------------
// Lighting
// --------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const torch1 = new THREE.PointLight(0xffaa55, 2.2, 18);
torch1.position.set(1.5, 2.6, 1.5);
scene.add(torch1);

const torch2 = new THREE.PointLight(0xffaa55, 1.6, 14);
torch2.position.set(5, 2.6, 5);
scene.add(torch2);

// --------------------
// Floor
// --------------------
const floorGeometry = new THREE.PlaneGeometry(50, 50, 10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.9,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --------------------
// Maze Layout
// 1 = wall, 0 = empty
// --------------------
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

const wallGeometry = new THREE.BoxGeometry(1, 3, 1);
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.8,
});

const walls = [];

for (let z = 0; z < maze.length; z++) {
  for (let x = 0; x < maze[z].length; x++) {
    if (maze[z][x] === 1) {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(x, 1.5, z);
      scene.add(wall);
      walls.push(wall);
    }
  }
}

// --------------------
// Movement Controls
// --------------------
const speed = 0.08;
const turnSpeed = 0.03;
const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Collision detection
function checkCollision(newPos) {
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    newPos,
    new THREE.Vector3(0.4, 1.6, 0.4)
  );

  for (let wall of walls) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (playerBox.intersectsBox(wallBox)) {
      return true;
    }
  }
  return false;
}

// Update movement
function updateMovement() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0;
  direction.normalize();

  let moveVector = new THREE.Vector3();

  if (keys["ArrowUp"]) {
    moveVector.add(direction.clone().multiplyScalar(speed));
  }

  if (keys["ArrowDown"]) {
    moveVector.add(direction.clone().multiplyScalar(-speed));
  }

  if (keys["ArrowLeft"]) {
    camera.rotation.y += turnSpeed;
  }

  if (keys["ArrowRight"]) {
    camera.rotation.y -= turnSpeed;
  }

  const newPosition = camera.position.clone().add(moveVector);

  if (!checkCollision(newPosition)) {
    camera.position.copy(newPosition);
  }
}

// --------------------
// Resize Handling
// --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --------------------
// Animation Loop
// --------------------
function animate() {
  requestAnimationFrame(animate);
  updateMovement();
  renderer.render(scene, camera);
}

animate();
