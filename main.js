import * as THREE from "three";

/*
Arrow Keys Only:
↑ forward
↓ backward
← turn left
→ turn right
Click scene once for focus.
*/

// ---------- HUD ----------
const hud = document.getElementById("hud");
function setHUD(msg) { if (hud) hud.textContent = msg; }

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
scene.fog = new THREE.Fog(0x050507, 10, 120);

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

// ---------- World Scale (50% wider corridors) ----------
const TILE = 1.5;          // <— This makes all halls 50% wider
const WALL_W = TILE;
const WALL_H = 3.2;
const WALL_D = TILE;

const PLAYER_RADIUS = 0.28; // tuned for TILE=1.5

function isWallCell(cx, cz) {
  if (cz < 0 || cz >= maze.length) return true;
  if (cx < 0 || cx >= maze[0].length) return true;
  return maze[cz][cx] === 1;
}

function worldToCell(v) {
  return Math.floor(v / TILE);
}

function findSafeSpawn() {
  for (let z = 1; z < maze.length - 1; z++) {
    for (let x = 1; x < maze[0].length - 1; x++) {
      if (maze[z][x] === 0) return { x: (x + 0.5) * TILE, z: (z + 0.5) * TILE };
    }
  }
  return { x: 1.5 * TILE, z: 1.5 * TILE };
}

const spawn = findSafeSpawn();

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(spawn.x, 1.65, spawn.z);

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

// ---------- Lighting ----------
const ambient = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0x8fa2ff, 0x120900, 0.18);
scene.add(hemi);

// small “carry” light so it’s never pitch black
const playerTorch = new THREE.PointLight(0xffc07a, 0.9, 16);
scene.add(playerTorch);

// ---------- Procedural textures ----------
function makeRugTexture(seed = 0) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");

  // base
  g.fillStyle = "#2b0f12";
  g.fillRect(0, 0, c.width, c.height);

  // border
  g.fillStyle = "#c9a24a";
  g.fillRect(24, 24, c.width - 48, c.height - 48);
  g.fillStyle = "#1a0b0c";
  g.fillRect(44, 44, c.width - 88, c.height - 88);

  // field
  g.fillStyle = "#3a1216";
  g.fillRect(70, 70, c.width - 140, c.height - 140);

  // medallion
  g.save();
  g.translate(c.width / 2, c.height / 2);
  g.rotate(0.02 * seed);
  g.fillStyle = "rgba(205, 168, 88, 0.85)";
  g.beginPath();
  g.ellipse(0, 0, 180, 120, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(26, 11, 12, 0.85)";
  g.beginPath();
  g.ellipse(0, 0, 130, 85, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // repeating motifs
  g.globalAlpha = 0.35;
  g.fillStyle = "#c9a24a";
  for (let y = 110; y < c.height - 110; y += 62) {
    for (let x = 120; x < c.width - 120; x += 80) {
      const r = 10 + ((x + y + seed) % 9);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 2, y - 20, 4, 40);
      g.fillRect(x - 20, y - 2, 40, 4);
    }
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = 8;
  return tex;
}

function makeCeilingTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext("2d");

  g.fillStyle = "#0f1016";
  g.fillRect(0, 0, c.width, c.height);

  // star lattice
  g.strokeStyle = "rgba(200, 180, 120, 0.30)";
  g.lineWidth = 3;

  const step = 128;
  for (let y = 0; y <= c.height; y += step) {
    for (let x = 0; x <= c.width; x += step) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + step, y + step);
      g.stroke();

      g.beginPath();
      g.moveTo(x + step, y);
      g.lineTo(x, y + step);
      g.stroke();
    }
  }

  // center rosette
  g.save();
  g.translate(c.width / 2, c.height / 2);
  for (let i = 0; i < 18; i++) {
    g.rotate(Math.PI / 9);
    g.strokeStyle = `rgba(220, 195, 130, ${0.15 + i * 0.01})`;
    g.beginPath();
    g.arc(0, 0, 220 + i * 6, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 8;
  return tex;
}

// ---------- Floor: dark stone + rugs ----------
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.98 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Rugs placed in corridors
const rugs = [];
function addRug(x, z, rot = 0, seed = 0) {
  const rugTex = makeRugTexture(seed);
  const rugMat = new THREE.MeshStandardMaterial({
    map: rugTex,
    roughness: 0.95,
    metalness: 0.0
  });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(TILE * 2.0, TILE * 1.15), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.rotation.z = rot;
  rug.position.set(x, 0.02, z);
  scene.add(rug);
  rugs.push(rug);
}

// Drop a few rugs in open cells
let rugSeed = 1;
for (let z = 1; z < maze.length - 1; z++) {
  for (let x = 1; x < maze[0].length - 1; x++) {
    if (maze[z][x] === 0 && (x + z) % 3 === 0) {
      addRug((x + 0.5) * TILE, (z + 0.5) * TILE, ((x + z) % 2) ? 0 : Math.PI / 2, rugSeed++);
    }
  }
}

// ---------- Ceiling ----------
const ceilingTex = makeCeilingTexture();
const ceilingMat = new THREE.MeshStandardMaterial({
  map: ceilingTex,
  color: 0xffffff,
  roughness: 0.85,
  metalness: 0.05
});
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = WALL_H; // at top of walls
scene.add(ceiling);

// ---------- Walls ----------
const wallGeo = new THREE.BoxGeometry(WALL_W, WALL_H, WALL_D);
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x4c4c5b,
  roughness: 0.86,
  metalness: 0.05
});

for (let z = 0; z < maze.length; z++) {
  for (let x = 0; x < maze[z].length; x++) {
    if (maze[z][x] === 1) {
      const w = new THREE.Mesh(wallGeo, wallMat);
      w.position.set((x + 0.5) * TILE, WALL_H / 2, (z + 0.5) * TILE);
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
crosshair.style.border = "2px solid rgba(255,255,255,0.55)";
crosshair.style.borderRadius = "50%";
crosshair.style.pointerEvents = "none";
crosshair.style.zIndex = "20";
document.body.appendChild(crosshair);

// ---------- Arrow input ----------
const keys = {};
document.addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
});
document.addEventListener("keyup", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
  keys[e.key] = false;
});

// ---------- Collision (grid-based) ----------
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
    const cx = worldToCell(px);
    const cz = worldToCell(pz);
    if (isWallCell(cx, cz)) return false;
  }
  return true;
}

// ---------- Nastaliq poem texture + framed plaque ----------
function makePoemTextureNastaliq(lines, author) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");

  // parchment background
  ctx.fillStyle = "rgba(24, 18, 12, 0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // inner glow
  const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 80, canvas.width/2, canvas.height/2, 650);
  grad.addColorStop(0, "rgba(255, 220, 170, 0.06)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // border line (actual frame will be 3D; this is just a thin inner edge)
  ctx.strokeStyle = "rgba(255, 215, 170, 0.25)";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Nastaliq-ish: use Noto Nastaliq Urdu if loaded
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Big Nastaliq
  ctx.fillStyle = "rgba(255, 238, 215, 0.97)";
  ctx.font = '58px "Noto Nastaliq Urdu", "Noto Naskh Arabic", "Tahoma", "Arial"';

  const cx = canvas.width / 2;
  const startY = 330;
  const gap = 96;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, startY + i * gap);
  }

  ctx.fillStyle = "rgba(255, 210, 160, 0.85)";
  ctx.font = '36px "Noto Nastaliq Urdu", "Noto Naskh Arabic", "Tahoma", "Arial"';
  ctx.fillText(`— ${author} —`, cx, canvas.height - 140);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function addFramedPoem({ cellX, cellZ, face }, lines, author) {
  // Convert cell center to world
  const x = (cellX + 0.5) * TILE;
  const z = (cellZ + 0.5) * TILE;

  // Plaque plane
  const tex = makePoemTextureNastaliq(lines, author);
  const plaqueW = 1.55; // in world units
  const plaqueH = 0.92;

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(plaqueW, plaqueH),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 })
  );

  // 3D frame (simple ornate-ish)
  const frameOuter = new THREE.Mesh(
    new THREE.BoxGeometry(plaqueW + 0.10, plaqueH + 0.10, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x7a5a2c, roughness: 0.55, metalness: 0.25 })
  );
  const frameInnerCut = new THREE.Mesh(
    new THREE.BoxGeometry(plaqueW - 0.02, plaqueH - 0.02, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  // (Cheap “cutout” illusion: we simply place the inner slightly behind; looks like depth)
  frameInnerCut.position.z = -0.01;

  const group = new THREE.Group();
  group.add(frameOuter);
  group.add(frameInnerCut);
  group.add(plaque);

  // Placement on wall
  const y = 1.75;
  const out = (TILE / 2) + 0.02; // just off wall surface

  let px = x, pz = z, ry = 0;

  if (face === "N") { pz -= out; ry = 0; }
  if (face === "S") { pz += out; ry = Math.PI; }
  if (face === "E") { px += out; ry = -Math.PI / 2; }
  if (face === "W") { px -= out; ry =  Math.PI / 2; }

  group.position.set(px, y, pz);
  group.rotation.y = ry;

  // plaque itself slightly forward from frame
  plaque.position.z = 0.028;

  scene.add(group);

  // Lamp (beautiful hanging lamp nearby)
  const lamp = new THREE.Group();

  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.65, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 })
  );
  chain.position.y = WALL_H - 0.35;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.14, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0x3b2a12, roughness: 0.65, metalness: 0.35 })
  );
  body.position.y = WALL_H - 0.85;

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd7a8, roughness: 0.2, metalness: 0.0, emissive: 0xffaa55, emissiveIntensity: 0.6 })
  );
  glass.position.y = WALL_H - 0.93;

  lamp.add(chain, body, glass);

  // place lamp near the plaque, slightly “in corridor”
  const lampSide = 0.55 * TILE;
  const lampOut = 0.35 * TILE;

  let lx = x, lz = z;
  if (face === "N") { lx += lampSide; lz -= lampOut; }
  if (face === "S") { lx -= lampSide; lz += lampOut; }
  if (face === "E") { lx += lampOut; lz += lampSide; }
  if (face === "W") { lx -= lampOut; lz -= lampSide; }

  lamp.position.set(lx, 0, lz);
  scene.add(lamp);

  const light = new THREE.PointLight(0xffaa55, 2.4, 20);
  light.position.set(lx, WALL_H - 0.95, lz);
  scene.add(light);

  return { light, glass };
}

// ---------- Place framed poems (choose wall-adjacent cells) ----------
const lamps = [];

// Short public-domain-safe snippets (keep each quote short)
lamps.push(addFramedPoem({ cellX: 2, cellZ: 1, face: "S" }, ["بنی‌آدم اعضای یک پیکرند", "که در آفرینش ز یک گوهرند"], "سعدی"));
lamps.push(addFramedPoem({ cellX: 6, cellZ: 1, face: "S" }, ["در ازل پرتو حسنت ز تجلّی دم زد", "عشق پیدا شد و آتش به همه عالم زد"], "حافظ"));
lamps.push(addFramedPoem({ cellX: 6, cellZ: 3, face: "W" }, ["هر کسی کو دور ماند از اصل خویش", "باز جوید روزگار وصل خویش"], "مولوی"));
lamps.push(addFramedPoem({ cellX: 1, cellZ: 5, face: "E" }, ["تو نیکی می‌کن و در دجله انداز"], "سعدی"));
lamps.push(addFramedPoem({ cellX: 4, cellZ: 6, face: "N" }, ["میان عاشق و معشوق هیچ حائل نیست"], "حافظ"));

// ---------- Movement ----------
const moveSpeed = 0.13; // a bit faster because tiles are bigger
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

  playerTorch.position.set(camera.position.x, 2.7, camera.position.z);

  setHUD("کلیدهای جهت‌دار ↑↓←→  |  لوح‌های خطِ نستعلیق را کنار چراغ‌ها ببین.");
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

  // lamp flicker
  const t = performance.now() * 0.01;
  for (let i = 0; i < lamps.length; i++) {
    const flicker = 0.22 * Math.sin(t + i * 1.4) + 0.10 * Math.sin(t * 1.9 + i);
    lamps[i].light.intensity = 2.35 + flicker;
    lamps[i].glass.material.emissiveIntensity = 0.55 + flicker * 0.18;
  }

  update();
  renderer.render(scene, camera);
}

animate();
