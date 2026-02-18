import * as THREE from "three";

/* -------------------------
   DOM
-------------------------- */
const hud = document.getElementById("hud");
const actionBar = document.getElementById("actionBar");
const stickBase = document.getElementById("stickBase");
const stickKnob = document.getElementById("stickKnob");
const lookPad = document.getElementById("lookPad");

/* -------------------------
   Settings
-------------------------- */
const SETTINGS = {
  // Feel
  moveSpeed: 4.2,            // units/sec
  turnSpeedKey: 2.0,         // rad/sec for arrow left/right
  lookSensitivity: 0.0032,   // for drag/swipe
  pitchLimit: Math.PI * 0.47,

  // Gallery layout
  hallWidth: 26,
  hallHeight: 14,
  hallLength: 190,
  wallThickness: 1.0,

  // Lighting
  ambient: 0.52,
  torchIntensity: 1.75,
  fogNear: 70,
  fogFar: 260,

  // Interact
  interactDistance: 4.6
};

hud.textContent =
  "گالری در حال آماده‌سازی است…\n" +
  "فونتِ نستعلیق و تابلوها در حال بارگذاری‌اند.";

/* -------------------------
   Three.js Basics
-------------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c12);
scene.fog = new THREE.Fog(0x0c0c12, SETTINGS.fogNear, SETTINGS.fogFar);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  800
);
camera.position.set(0, 1.7, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

/* -------------------------
   Player controls (arrow keys only)
-------------------------- */
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

window.addEventListener("keydown", (e) => {
  if (e.code in keys) keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  if (e.code in keys) keys[e.code] = false;
});

/* -------------------------
   Mouse drag look (desktop)
-------------------------- */
let dragging = false;
let lastMouseX = 0, lastMouseY = 0;

window.addEventListener("mousedown", (e) => {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});
window.addEventListener("mouseup", () => (dragging = false));
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  applyLookDelta(dx, dy);
});

/* -------------------------
   Mobile: virtual joystick + look pad
-------------------------- */
const mobile = {
  stickActive: false,
  stickId: null,
  stickCenter: { x: 0, y: 0 },
  stickVec: { x: 0, y: 0 }, // -1..1

  lookActive: false,
  lookId: null,
  lookLast: { x: 0, y: 0 }
};

function setStickKnob(xNorm, yNorm) {
  const max = 34;
  stickKnob.style.transform = `translate(${xNorm * max}px, ${yNorm * max}px)`;
}

function updateStickFromPointer(px, py) {
  const dx = px - mobile.stickCenter.x;
  const dy = py - mobile.stickCenter.y;
  const radius = 50;
  const len = Math.hypot(dx, dy);

  const cl = Math.min(1, len / radius);
  const x = (dx / (len || 1)) * cl;
  const y = (dy / (len || 1)) * cl;

  mobile.stickVec.x = x;
  mobile.stickVec.y = y;

  setStickKnob(x, y);
}

if (stickBase) {
  stickBase.addEventListener("pointerdown", (e) => {
    mobile.stickActive = true;
    mobile.stickId = e.pointerId;
    stickBase.setPointerCapture(e.pointerId);

    const rect = stickBase.getBoundingClientRect();
    mobile.stickCenter.x = rect.left + rect.width / 2;
    mobile.stickCenter.y = rect.top + rect.height / 2;

    updateStickFromPointer(e.clientX, e.clientY);
  });

  stickBase.addEventListener("pointermove", (e) => {
    if (!mobile.stickActive || e.pointerId !== mobile.stickId) return;
    updateStickFromPointer(e.clientX, e.clientY);
  });

  const endStick = (e) => {
    if (mobile.stickId !== null && e.pointerId !== mobile.stickId) return;
    mobile.stickActive = false;
    mobile.stickId = null;
    mobile.stickVec.x = 0;
    mobile.stickVec.y = 0;
    setStickKnob(0, 0);
  };

  stickBase.addEventListener("pointerup", endStick);
  stickBase.addEventListener("pointercancel", endStick);
}

if (lookPad) {
  lookPad.addEventListener("pointerdown", (e) => {
    mobile.lookActive = true;
    mobile.lookId = e.pointerId;
    lookPad.setPointerCapture(e.pointerId);
    mobile.lookLast.x = e.clientX;
    mobile.lookLast.y = e.clientY;
  });

  lookPad.addEventListener("pointermove", (e) => {
    if (!mobile.lookActive || e.pointerId !== mobile.lookId) return;
    const dx = e.clientX - mobile.lookLast.x;
    const dy = e.clientY - mobile.lookLast.y;
    mobile.lookLast.x = e.clientX;
    mobile.lookLast.y = e.clientY;
    applyLookDelta(dx, dy);
  });

  const endLook = (e) => {
    if (mobile.lookId !== null && e.pointerId !== mobile.lookId) return;
    mobile.lookActive = false;
    mobile.lookId = null;
  };

  lookPad.addEventListener("pointerup", endLook);
  lookPad.addEventListener("pointercancel", endLook);
}

/* -------------------------
   Camera orientation (yaw/pitch)
-------------------------- */
let yaw = 0;
let pitch = 0;

function applyLookDelta(dx, dy) {
  yaw -= dx * SETTINGS.lookSensitivity;
  pitch -= dy * SETTINGS.lookSensitivity;
  pitch = THREE.MathUtils.clamp(pitch, -SETTINGS.pitchLimit, SETTINGS.pitchLimit);
}

/* -------------------------
   Helpers
-------------------------- */
function clearActionBar() {
  actionBar.innerHTML = "";
}

/* ✅ Reliable on iOS (including in-app browsers) */
function addButton(label, onClick) {
  const b = document.createElement("button");
  b.className = "btn";
  b.type = "button";
  b.textContent = label;

  b.addEventListener("click", (e) => {
    e.preventDefault();
    onClick();
  });

  b.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      onClick();
    },
    { passive: false }
  );

  actionBar.appendChild(b);
}

function updateHUD(text) {
  hud.textContent = text;
}

/* -------------------------
   Procedural textures
-------------------------- */
function makePatternTexture(drawFn, size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

const floorTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#3c3c3c";
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const v = 55 + Math.random() * 35;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.10})`;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  const step = s / 8;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(s, i * step); ctx.stroke();
  }
});
floorTex.repeat.set(12, 76);

const wallTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#3d342b";
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = 70 + Math.random() * 35;
    ctx.fillStyle = `rgba(${r},${r - 10},${r - 20},${Math.random() * 0.06})`;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 2;
  const bandH = s / 6;
  for (let b = 0; b < 6; b++) {
    const y0 = b * bandH;
    for (let x = 0; x < s; x += s / 10) {
      ctx.beginPath();
      ctx.moveTo(x, y0 + bandH * 0.5);
      ctx.lineTo(x + s / 20, y0 + bandH * 0.2);
      ctx.lineTo(x + s / 10, y0 + bandH * 0.5);
      ctx.lineTo(x + s / 20, y0 + bandH * 0.8);
      ctx.closePath();
      ctx.stroke();
    }
  }
});
wallTex.repeat.set(6, 18);

const ceilingTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#3d3025";
  ctx.fillRect(0, 0, s, s);

  const cx = s / 2, cy = s / 2;
  ctx.translate(cx, cy);
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.18, s * 0.08, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,220,180,0.10)";
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
});
ceilingTex.repeat.set(10, 62);

const rugTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#5b1e1e";
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = "rgba(240,210,140,0.50)";
  ctx.lineWidth = 18;
  ctx.strokeRect(14, 14, s - 28, s - 28);

  ctx.strokeStyle = "rgba(240,210,140,0.22)";
  ctx.lineWidth = 10;
  ctx.strokeRect(40, 40, s - 80, s - 80);

  ctx.fillStyle = "rgba(20,60,95,0.55)";
  ctx.beginPath();
  ctx.ellipse(s / 2, s / 2, s * 0.22, s * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
});
rugTex.repeat.set(1, 18);

/* -------------------------
   Materials
-------------------------- */
const floorMat = new THREE.MeshStandardMaterial({
  map: floorTex, roughness: 0.86, metalness: 0.03
});
const rugMat = new THREE.MeshStandardMaterial({
  map: rugTex, roughness: 0.93, metalness: 0.02
});
const wallMat = new THREE.MeshStandardMaterial({
  map: wallTex, roughness: 0.90, metalness: 0.02
});
const ceilingMat = new THREE.MeshStandardMaterial({
  map: ceilingTex, roughness: 0.88, metalness: 0.04
});

/* -------------------------
   Gallery geometry
-------------------------- */
function addGallery() {
  const W = SETTINGS.hallWidth;
  const H = SETTINGS.hallHeight;
  const L = SETTINGS.hallLength;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -L / 2);
  scene.add(floor);

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.72, L), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, -L / 2);
  scene.add(rug);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, L), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, -L / 2);
  scene.add(ceiling);

  const wallGeo = new THREE.BoxGeometry(SETTINGS.wallThickness, H, L);
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-W / 2, H / 2, -L / 2);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(W / 2, H / 2, -L / 2);
  scene.add(rightWall);

  const backGeo = new THREE.BoxGeometry(W, H, SETTINGS.wallThickness);
  const backWall = new THREE.Mesh(backGeo, wallMat);
  backWall.position.set(0, H / 2, -L);
  scene.add(backWall);
}
addGallery();

/* -------------------------
   Lighting
-------------------------- */
scene.add(new THREE.AmbientLight(0xffffff, SETTINGS.ambient));
scene.add(new THREE.HemisphereLight(0xc8d6ff, 0x2a1a10, 0.40));

const playerFill = new THREE.PointLight(0xffe6c6, 1.0, 20, 2.0);
scene.add(playerFill);

function addLamp(x, y, z) {
  const group = new THREE.Group();

  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.0, 10),
    new THREE.MeshStandardMaterial({ color: 0x3a2f24, roughness: 0.9 })
  );
  chain.position.set(0, 0.5, 0);
  group.add(chain);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.45, 0.9, 14),
    new THREE.MeshStandardMaterial({ color: 0x4b3622, roughness: 0.6, metalness: 0.25 })
  );
  body.position.set(0, 0.05, 0);
  group.add(body);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff2cc,
      emissive: 0xffd28a,
      emissiveIntensity: 2.8,
      roughness: 0.28
    })
  );
  glow.position.set(0, 0.02, 0);
  group.add(glow);

  const light = new THREE.PointLight(0xffe0b8, SETTINGS.torchIntensity, 36, 2.0);
  light.position.set(0, 0.02, 0);
  group.add(light);

  group.position.set(x, y, z);
  scene.add(group);
  return group;
}

const lamps = [];
for (let i = 0; i < 12; i++) {
  const z = -12 - i * 14;
  lamps.push(addLamp(-SETTINGS.hallWidth * 0.33, SETTINGS.hallHeight - 1.2, z));
  lamps.push(addLamp( SETTINGS.hallWidth * 0.33, SETTINGS.hallHeight - 1.2, z));
}

/* -------------------------
   Poems (each has 2–3+ lines) + explanations
-------------------------- */
const poems = [
  {
    title: "حافظ",
    lines: [
      "اَلا یا اَیُّهَا السّاقی اَدِرْ کَأساً و ناوِلْها",
      "که عشق آسان نمود اوّل، ولی افتاد مشکل‌ها",
      "به بویِ نافه‌ای کاخر صبا زان طُرّه بگشاید"
    ],
    explain:
      "حافظ با خطابِ «ساقی» آغاز می‌کند: درخواستِ باده، در حقیقت دعوت به گشودگیِ دل و آغازِ سلوک است. می‌گوید عشق در آغاز ساده می‌نماید، اما هرچه پیش‌تر می‌روی، لایه‌های دشوارِ نفس و جهان آشکار می‌شود. «بوی نافه» نمادِ امیدِ خبری خوش و گشایشِ ناگهانی است؛ یعنی با نسیمِ لطف، گره‌ها باز می‌شوند."
  },
  {
    title: "مولانا",
    lines: [
      "بشنو این نی چون شکایت می‌کند",
      "از جدایی‌ها حکایت می‌کند",
      "کز نیستان تا مرا ببریده‌اند"
   
