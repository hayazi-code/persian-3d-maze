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
scene.fog = new THREE.Fog(0x050507, 7, 70);

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

const PLAYER_RADIUS = 0.22;

function isWallCell(cx, cz) {
  if (cz < 0 || cz >= maze.length) return true;
  if (cx < 0 || cx >= maze[0].length) return true;
  return maze[cz][cx] === 1;
}

function findSafeSpawn() {
  for (let z = 1; z < maze.length - 1; z++) {
    for (let x = 1; x < maze[0].length - 1; x++) {
      if (maze[z][x] === 0) return { x: x + 0.5, z: z + 0.5 };
    }
  }
  return { x: 1.5, z: 1.5 };
}

const spawn = findSafeSpawn();

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 250);
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
renderer.domElement.addEventListener("click", () => renderer.domElement.focus());

// ---------- Lights ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0x99aaff, 0x120a00, 0.25);
scene.add(hemi);

// Torch attached to player (so nothing is ever fully black)
const playerTorch = new THREE.PointLight(0xffc07a, 1.4, 18);
scene.add(playerTorch);

// ---------- Floor ----------
const floorGeo = new THREE.PlaneGeometry(80, 80);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x17171d,
  roughness: 0.98,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// subtle grid so orientation stays easy (we’ll remove later if you want)
const grid = new THREE.GridHelper(80, 80, 0x252535, 0x171728);
grid.position.y = 0.01;
scene.add(grid);

// ---------- Walls ----------
const wallGeo = new THREE.BoxGeometry(1, 3, 1);
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x4f4f5c,
  roughness: 0.85,
  metalness: 0.05
});

const wallCenters = []; // keep for placing plaques/torches

for (let z = 0; z < maze.length; z++) {
  for (let x = 0; x < maze[z].length; x++) {
    if (maze[z][x] === 1) {
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set(x + 0.5, 1.5, z + 0.5);
      scene.add(w);
      wallCenters.push({ x: x + 0.5, z: z + 0.5 });
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
crosshair.style.border = "2px solid rgba(255,255,255,0.55)";
crosshair.style.borderRadius = "50%";
crosshair.style.pointerEvents = "none";
crosshair.style.zIndex = "20";
document.body.appendChild(crosshair);

// ---------- Arrow keys only ----------
const keys = {};

document.addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
});
document.addEventListener("keyup", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
  keys[e.key] = false;
});

// ---------- Collision (grid samples) ----------
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

// ---------- Poetry plaque generator (canvas -> texture) ----------
function makePoemTexture(lines, author) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "rgba(10, 8, 6, 0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // border
  ctx.strokeStyle = "rgba(255, 210, 160, 0.55)";
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  // subtle inner border
  ctx.strokeStyle = "rgba(255, 210, 160, 0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // text settings (browser Persian fonts)
  ctx.fillStyle = "rgba(255, 235, 210, 0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Try a stack of Persian-capable fonts
  const mainFont = '42px "Vazirmatn", "Vazir", "IRANSans", "Noto Naskh Arabic", "Noto Sans Arabic", "Tahoma", "Arial"';
  ctx.font = mainFont;

  // Render poem lines
  const centerX = canvas.width / 2;
  const startY = 190;
  const lineGap = 62;

  // Ensure lines are strings; draw top-to-bottom
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], centerX, startY + i * lineGap);
  }

  // author
  ctx.font = '30px "Vazirmatn", "Vazir", "IRANSans", "Noto Naskh Arabic", "Tahoma", "Arial"';
  ctx.fillStyle = "rgba(255, 210, 160, 0.85)";
  ctx.fillText(`— ${author} —`, centerX, canvas.height - 90);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function addPlaqueWithTorch({ x, z, face }, poemLines, author) {
  // face: "N" means plaque faces north (looking -z), "S" faces south, "E" faces east, "W" faces west
  // We'll offset plaque slightly off the wall surface
  const texture = makePoemTexture(poemLines, author);

  const plaqueGeo = new THREE.PlaneGeometry(0.95, 0.55);
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.85,
    metalness: 0.05
  });

  const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);

  // position plaque at eye-ish level
  const y = 1.65;
  const offset = 0.51; // wall half-size is 0.5, so 0.51 avoids z-fighting

  let rx = 0, ry = 0, px = x, pz = z;

  if (face === "N") { pz -= offset; ry = 0; }
  if (face === "S") { pz += offset; ry = Math.PI; }
  if (face === "E") { px += offset; ry = -Math.PI / 2; }
  if (face === "W") { px -= offset; ry =  Math.PI / 2; }

  plaque.position.set(px, y, pz);
  plaque.rotation.set(rx, ry, 0);
  scene.add(plaque);

  // Torch sconce (simple geometry)
  const sconce = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.35, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 })
  );
  base.position.y = 1.6;
  base.rotation.z = Math.PI / 2;

  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.10, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a2a12, roughness: 0.85, metalness: 0.2 })
  );
  cup.position.set(0.17, 1.6, 0);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0xffaa55, emissiveIntensity: 0.8 })
  );
  flame.position.set(0.20, 1.66, 0);

  sconce.add(base, cup, flame);

  // Place sconce slightly to the right of plaque
  const torchOffsetSide = 0.42;
  const torchOffsetOut = 0.48;

  let tx = x, tz = z, tRotY = 0;

  if (face === "N") { tx += torchOffsetSide; tz -= torchOffsetOut; tRotY = 0; }
  if (face === "S") { tx -= torchOffsetSide; tz += torchOffsetOut; tRotY = Math.PI; }
  if (face === "E") { tx += torchOffsetOut; tz += torchOffsetSide; tRotY = -Math.PI / 2; }
  if (face === "W") { tx -= torchOffsetOut; tz -= torchOffsetSide; tRotY =  Math.PI / 2; }

  sconce.position.set(tx, 0, tz);
  sconce.rotation.y = tRotY;
  scene.add(sconce);

  // Warm light near flame
  const torchLight = new THREE.PointLight(0xffaa55, 2.2, 12);
  torchLight.position.set(tx, 2.0, tz);
  scene.add(torchLight);

  return { plaque, torchLight, flame };
}

// ---------- Place a few poem plaques ----------
const torches = [];

// These are short original “in the style of” lines? No — you asked for actual Persian poetry.
// But we must avoid quoting long copyrighted text. So we’ll use very short, public-domain-safe snippets.
// Saadi / Hafez / Rumi are public domain; still keep each quote short.
torches.push(
  addPlaqueWithTorch(
    { x: 2.5, z: 1.5, face: "S" },
    ["بنی‌آدم اعضای یک پیکرند", "که در آفرینش ز یک گوهرند"],
    "سعدی"
  )
);

torches.push(
  addPlaqueWithTorch(
    { x: 6.5, z: 1.5, face: "S" },
    ["در ازل پرتو حسنت ز تجلّی دم زد", "عشق پیدا شد و آتش به همه عالم زد"],
    "حافظ"
  )
);

torches.push(
  addPlaqueWithTorch(
    { x: 6.5, z: 3.5, face: "W" },
    ["هر کسی کو دور ماند از اصل خویش", "باز جوید روزگار وصل خویش"],
    "مولوی"
  )
);

torches.push(
  addPlaqueWithTorch(
    { x: 1.5, z: 5.5, face: "E" },
    ["تو نیکی می‌کن و در دجله انداز", "که ایزد در بیابانت دهد باز"],
    "سعدی"
  )
);

torches.push(
  addPlaqueWithTorch(
    { x: 4.5, z: 6.5, face: "N" },
    ["میان عاشق و معشوق هیچ حائل نیست", "تو خود حجاب خودی، حافظ از میان برخیز"],
    "حافظ"
  )
);

torches.push(
  addPlaqueWithTorch(
    { x: 2.5, z: 3.5, face: "E" },
    ["این نیز بگذرد"],
    "نقل مشهور"
  )
);

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

    // slide-friendly
    if (canStandAt(nx, nz)) {
      camera.position.x = nx;
      camera.position.z = nz;
    } else if (canStandAt(nx, camera.position.z)) {
      camera.position.x = nx;
    } else if (canStandAt(camera.position.x, nz)) {
      camera.position.z = nz;
    }
  }

  // player torch follows
  playerTorch.position.set(camera.position.x, 2.7, camera.position.z);

  setHUD("حرکت با کلیدهای جهت‌دار ↑↓←→  |  در کنار مشعل‌ها، لوح‌های شعر را بخوان.");
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

  // torch flicker
  const t = performance.now() * 0.01;
  for (let i = 0; i < torches.length; i++) {
    const flicker = 0.18 * Math.sin(t + i * 1.7) + 0.10 * Math.sin(t * 1.9 + i);
    torches[i].torchLight.intensity = 2.1 + flicker;
    torches[i].flame.material.emissiveIntensity = 0.75 + flicker * 0.25;
  }

  update();
  renderer.render(scene, camera);
}

animate();
