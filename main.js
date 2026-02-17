import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 5, 40);

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(1, 1.6, 1);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x444444);
scene.add(ambientLight);

const torchLight = new THREE.PointLight(0xffaa55, 1.2, 12);
torchLight.position.set(5, 3, 5);
scene.add(torchLight);

// Floor
const floorGeometry = new THREE.PlaneGeometry(50, 50);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Maze Layout (1 = wall, 0 = empty)
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
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

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

// Movement
const speed = 0.08;
const keys = {};

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

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

function updateMovement() {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0));

    let moveVector = new THREE.Vector3();

    if (keys["ArrowUp"]) moveVector.add(direction.clone().multiplyScalar(speed));
    if (keys["ArrowDown"]) moveVector.add(direction.clone().multiplyScalar(-speed));
    if (keys["ArrowLeft"]) camera.rotation.y += 0.03;
    if (keys["ArrowRight"]) camera.rotation.y -= 0.03;

    const newPosition = camera.position.clone().add(moveVector);

    if (!checkCollision(newPosition)) {
        camera.position.copy(newPosition);
    }
}

// Resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    renderer.render(scene, camera);
}

animate();
