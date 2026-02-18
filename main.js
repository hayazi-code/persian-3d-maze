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
  hallLength: 180,
  wallThickness: 1.0,

  // Brighter lighting
  ambient: 0.48,             // ✅ brighter
  torchIntensity: 1.55,      // ✅ brighter
  fogNear: 55,               // ✅ less oppressive fog
  fogFar: 220,

  // Interact
  interactDistance: 4.4
};

hud.textContent =
  "گالری در حال آماده‌سازی است…\n" +
  "فونتِ نستعلیق و تابلوها در حال بارگذاری‌اند.";

/* -------------------------
   Three.js Basics
-------------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b10); // ✅ slightly brighter than pure black
scene.fog = new THREE.Fog(0x0b0b10, SETTINGS.fogNear, SETTINGS.fogFar);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  700
);
camera.position.set(0, 1.7, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;       // ✅ nicer brightness curve
renderer.toneMappingExposure = 1.25;                      // ✅ brighter overall
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

  stickBase.addEventListener("pointerup", (e) => {
    if (e.pointerId !== mobile.stickId) return;
    mobile.stickActive = false;
    mobile.stickId = null;
    mobile.stickVec.x = 0;
    mobile.stickVec.y = 0;
    setStickKnob(0, 0);
  });

  stickBase.addEventListener("pointercancel", () => {
    mobile.stickActive = false;
    mobile.stickId = null;
    mobile.stickVec.x = 0;
    mobile.stickVec.y = 0;
    setStickKnob(0, 0);
  });
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

  lookPad.addEventListener("pointerup", (e) => {
    if (e.pointerId !== mobile.lookId) return;
    mobile.lookActive = false;
    mobile.lookId = null;
  });

  lookPad.addEventListener("pointercancel", () => {
    mobile.lookActive = false;
    mobile.lookId = null;
  });
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

function addButton(label, onClick) {
  const b = document.createElement("button");
  b.className = "btn";
  b.textContent = label;
  b.addEventListener("click", onClick, { passive: true });
  actionBar.appendChild(b);
}

function safeOpenLink(url) {
  // ✅ Robust open for mobile Safari: fallback to same-tab navigation
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = url;
  } catch {
    window.location.href = url;
  }
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
  ctx.fillStyle = "#383838"; // ✅ brighter base
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const v = 55 + Math.random() * 30;
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
floorTex.repeat.set(12, 72);

const wallTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#3a3128"; // ✅ brighter walls
  ctx.fillRect(0, 0, s, s);

  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = 70 + Math.random() * 30;
    ctx.fillStyle = `rgba(${r},${r-10},${r-20},${Math.random() * 0.06})`;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
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
  ctx.fillStyle = "#3a2f24"; // ✅ brighter ceiling
  ctx.fillRect(0, 0, s, s);

  const cx = s / 2, cy = s / 2;
  ctx.translate(cx, cy);
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.18, s * 0.08, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,220,180,0.08)";
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
});
ceilingTex.repeat.set(10, 60);

const rugTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#5a1d1d"; // ✅ brighter rugs
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = "rgba(240,210,140,0.45)";
  ctx.lineWidth = 18;
  ctx.strokeRect(14, 14, s - 28, s - 28);

  ctx.strokeStyle = "rgba(240,210,140,0.22)";
  ctx.lineWidth = 10;
  ctx.strokeRect(40, 40, s - 80, s - 80);

  ctx.fillStyle = "rgba(20,60,95,0.50)";
  ctx.beginPath();
  ctx.ellipse(s/2, s/2, s*0.22, s*0.30, 0, 0, Math.PI*2);
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
  map: rugTex, roughness: 0.92, metalness: 0.02
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

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.70, L), rugMat);
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
   Lighting (brighter)
-------------------------- */
scene.add(new THREE.AmbientLight(0xffffff, SETTINGS.ambient));
scene.add(new THREE.HemisphereLight(0xbfd0ff, 0x2a1a10, 0.38)); // ✅ adds lift

// Player fill so it never feels “black”
const playerFill = new THREE.PointLight(0xffe2bb, 0.9, 18, 2.0);
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
      emissiveIntensity: 2.6,
      roughness: 0.28
    })
  );
  glow.position.set(0, 0.02, 0);
  group.add(glow);

  const light = new THREE.PointLight(0xffe0b8, SETTINGS.torchIntensity, 34, 2.0);
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
   Poems (unchanged data, links kept)
-------------------------- */
const poems = [
  { title: "حافظ — غزل ۱", excerpt: "اَلا یا اَیُّهَا السّاقی\nاَدِرْ کَأساً و ناوِلْها", url: "https://ganjoor.net/hafez/ghazal/sh1" },
  { title: "حافظ — غزل ۳", excerpt: "اگر آن ترکِ شیرازی\nبه دست آرد دلِ ما را", url: "https://ganjoor.net/hafez/ghazal/sh3" },
  { title: "حافظ — غزل ۱۵۲", excerpt: "در ازل پرتوِ حُسنت ز تجلّی دَم زد\nعشق پیدا شد و آتش به همه عالم زد", url: "https://ganjoor.net/hafez/ghazal/sh152" },
  { title: "حافظ — غزل ۲۴۴", excerpt: "معاشران گره از زلفِ یار باز کنید\nشبی خوش است بدین قصه‌اش دراز کنید", url: "https://ganjoor.net/hafez/ghazal/sh244" },
  { title: "حافظ — غزل ۳۷۴", excerpt: "بیا تا گل برافشانیم و می در ساغر اندازیم\nفلک را سقف بشکافیم و طرحی نو دراندازیم", url: "https://ganjoor.net/hafez/ghazal/sh374" },

  { title: "مولانا — مثنوی (آغاز)", excerpt: "بشنو این نی چون شکایت می‌کند\nاز جدایی‌ها حکایت می‌کند", url: "https://ganjoor.net/moulavi/masnavi/daftar1/sh1" },
  { title: "مولانا — مثنوی (دفتر ۱)", excerpt: "هر که او بیدارتر، پُر دردتر\nهر که او آگاه‌تر، رخ زردتر", url: "https://ganjoor.net/moulavi/masnavi/daftar1/sh29" },
  { title: "مولانا — دیوان شمس", excerpt: "بیامدیم دگربار سوی مولایی\nکه تا به زانوی او نیست هیچ دریایی", url: "https://ganjoor.net/moulavi/shams/ghazalsh/sh3079" },

  { title: "سعدی — گلستان", excerpt: "بنی‌آدم اعضای یکدیگرند\nکه در آفرینش ز یک گوهرند", url: "https://ganjoor.net/saadi/golestan/gbab1/sh10" },
  { title: "سعدی — حکایت", excerpt: "تو نیکی می‌کن و در دجله انداز\nکه ایزد در بیابانَت دهد باز", url: "https://ganjoor.net/saadi/mavaez/masnaviat/sh41" },
  { title: "سعدی — مواعظ", excerpt: "به جهان خرم از آنم که جهان خرم از اوست\nعاشقم بر همه عالم که همه عالم از اوست", url: "https://ganjoor.net/saadi/mavaez/ghazal2/sh13" },

  { title: "فردوسی — شاهنامه", excerpt: "توانا بود هر که دانا بود\nز دانش دلِ پیر برنا بود", url: "https://ganjoor.net/ferdousi/shahname/aghaz/sh1" },

  { title: "خیام — رباعی ۶۴", excerpt: "ای بس که نباشیم و جهان خواهد بود\nنی نام ز ما و نی‌نشان خواهد بود", url: "https://ganjoor.net/khayyam/robaee/sh64" },
  { title: "خیام — رباعی ۶۶", excerpt: "این قافلهٔ عمر عجب می‌گذرد!\nدریاب دمی که با طرب می‌گذرد", url: "https://ganjoor.net/khayyam/robaee/sh66" },

  { title: "عطار — منطق‌الطیر", excerpt: "مرحبا ای هدهدِ هادی‌شده\nدر طریقِ عشق، آزادی‌شده", url: "https://ganjoor.net/attar/manteghotteyr/aghazm/sh1" },

  { title: "سنایی — قصیده", excerpt: "مسلمانان سرایِ عمر، در گیتی دو در دارد\nکه خاص و عام و نیک و بد، بدین هر دو گذر دارد", url: "https://ganjoor.net/sanaee/divans/ghaside-sanaee/sh34" }
];

/* -------------------------
   Nastaliq mural textures (bigger + easier reading)
-------------------------- */
async function makeMuralTexture({ title, excerpt }) {
  if (document.fonts?.ready) await document.fonts.ready;

  const w = 1280, h = 900; // ✅ larger texture
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "rgba(18,14,10,1)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,230,190,0.62)";
  ctx.lineWidth = 18;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  ctx.strokeStyle = "rgba(255,230,190,0.24)";
  ctx.lineWidth = 10;
  ctx.strokeRect(74, 74, w - 148, h - 148);

  ctx.fillStyle = "rgba(255,245,230,0.12)";
  ctx.fillRect(110, 110, w - 220, h - 220);

  ctx.fillStyle = "rgba(255,240,210,0.95)";
  ctx.font = "700 38px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  ctx.fillText(title, w - 130, 170);

  // ✅ larger Nastaliq text
  ctx.fillStyle = "rgba(255,250,238,0.96)";
  ctx.font = "700 56px 'Noto Nastaliq Urdu', serif";
  ctx.textAlign = "right";
  ctx.direction = "rtl";

  const lines = excerpt.split("\n");
  let y = 300;
  for (const line of lines) {
    wrapRTL(ctx, line, w - 140, y, w - 280, 70);
    y += 110;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function wrapRTL(ctx, text, xRight, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  const lines = [];
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? (line + " " + words[i]) : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], xRight, y + i * lineHeight);
  }
}

/* -------------------------
   Place murals (bigger + lower)
-------------------------- */
const murals = []; // { mesh, data }
const raycaster = new THREE.Raycaster();

async function buildMurals() {
  const W = SETTINGS.hallWidth;

  const zStart = -12;
  const zStep = 10.5;

  for (let i = 0; i < poems.length; i++) {
    const p = poems[i];
    const tex = await makeMuralTexture(p);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.72,
      metalness: 0.02
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d22,
      roughness: 0.6,
      metalness: 0.25
    });

    // ✅ larger mural geometry
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.2, 4.5, 0.22), frameMat);
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 4.0), mat);
    canvas.position.set(0, 0, 0.12);
    frame.add(canvas);

    const side = i % 2 === 0 ? -1 : 1;
    const z = zStart - i * zStep;
    const x = side * (W / 2 - 0.68);

    // ✅ lower height for easier viewing
    const y = 3.25;

    frame.position.set(x, y, z);
    frame.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

    // ✅ stronger spotlight for readability
    const sLight = new THREE.SpotLight(0xfff0d0, 0.85, 22, Math.PI / 7, 0.55, 1.1);
    sLight.position.set(x - side * 1.4, SETTINGS.hallHeight - 1.6, z + 0.6);
    sLight.target = frame;
    scene.add(sLight);
    scene.add(sLight.target);

    scene.add(frame);
    murals.push({ mesh: frame, data: p });
  }
}

/* -------------------------
   Curator (same model, slightly brighter + easier hit)
-------------------------- */
function makeCurator() {
  const g = new THREE.Group();

  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.9, 1.75, 18),
    new THREE.MeshStandardMaterial({ color: 0x2f3644, roughness: 0.85 })
  );
  robe.position.y = 0.88;
  g.add(robe);

  const sash = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.085, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x6b3a32, roughness: 0.8 })
  );
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 1.02;
  g.add(sash);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0xc79d79, roughness: 0.65 })
  );
  head.position.y = 1.88;
  g.add(head);

  const beard = new THREE.Mesh(
    new THREE.ConeGeometry(0.20, 0.32, 14),
    new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.95 })
  );
  beard.position.set(0, 1.70, 0.12);
  beard.rotation.x = Math.PI;
  g.add(beard);

  const turban = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.075, 10, 22),
    new THREE.MeshStandardMaterial({ color: 0xe3ddcf, roughness: 0.85 })
  );
  turban.position.y = 1.98;
  turban.rotation.x = Math.PI / 2;
  g.add(turban);

  const turbanTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xe3ddcf, roughness: 0.85 })
  );
  turbanTop.position.y = 2.10;
  g.add(turbanTop);

  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 1.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x4b311f, roughness: 0.95 })
  );
  staff.position.set(0.50, 0.95, 0.10);
  staff.rotation.z = -0.08;
  g.add(staff);

  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.24, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.85 })
  );
  book.position.set(-0.40, 1.10, 0.26);
  book.rotation.y = 0.35;
  g.add(book);

  // brighter lantern
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff1cc,
      emissive: 0xffd28a,
      emissiveIntensity: 2.3,
      roughness: 0.25
    })
  );
  lantern.position.set(-0.50, 1.03, 0.36);
  g.add(lantern);

  const lanternLight = new THREE.PointLight(0xffe2bb, 0.9, 10, 2.0);
  lanternLight.position.copy(lantern.position);
  g.add(lanternLight);

  // invisible interaction radius (makes mobile “tap to talk” forgiving)
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 18, 18),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
  );
  halo.position.set(0, 1.2, 0);
  g.add(halo);

  g.position.set(0, 0, -44);
  return g;
}

const curator = makeCurator();
scene.add(curator);

const curatorDialog = [
  "در این تالار، هر دیوار همچون نسخه‌ای خطی است: باید آهسته خواند و تند نگذشت.",
  "اگر معنایی بر تو سنگین افتاد، از همان سنگینی مگریز؛ گاه وزنِ معنا، نشانِ صدق آن است.",
  "هر تابلو، دری است. اما کلید، همیشه «نگاه» است؛ نه صرفاً «دانستن».",
  "اگر می‌خواهی گم نشوی، قدم‌هایت را با نفس‌هایت هم‌آهنگ کن: آرام و پیوسته."
];
let dialogIndex = 0;

/* -------------------------
   Movement bounds
-------------------------- */
function clampToHall(pos) {
  const W = SETTINGS.hallWidth;
  const L = SETTINGS.hallLength;
  pos.x = THREE.MathUtils.clamp(pos.x, -W/2 + 1.3, W/2 - 1.3);
  pos.z = THREE.MathUtils.clamp(pos.z, -L + 2.2, 1.5);
}

/* -------------------------
   Interaction
-------------------------- */
let currentTarget = null;

function updateHUD(text) {
  hud.textContent = text;
}

function updateInteraction() {
  clearActionBar();
  currentTarget = null;

  // curator proximity
  const distCurator = curator.position.distanceTo(camera.position);
  if (distCurator < SETTINGS.interactDistance + 1.0) {
    currentTarget = { type: "curator" };
  }

  // mural raycast
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(murals.map(m => m.mesh), true);

  if (hits.length > 0) {
    const hit = hits[0].object;
    const muralObj = murals.find(m => m.mesh === hit || m.mesh.children.includes(hit));
    if (muralObj) {
      const d = muralObj.mesh.position.distanceTo(camera.position);
      if (d < SETTINGS.interactDistance + 1.4) {
        currentTarget = { type: "mural", mural: muralObj };
      }
    }
  }

  // default HUD
  if (!currentTarget) {
    updateHUD("✅ آماده‌است.\nحرکت: کلیدهای جهت‌دار (یا موبایل: چپ حرکت، راست نگاه)\nبه تابلو یا متصدی نزدیک شو تا گزینه‌ها ظاهر شوند.");
    return;
  }

  if (currentTarget.type === "curator") {
    updateHUD("🧑‍🏫 متصدی نزدیک است.\nبرای گفتگو دکمه را لمس کن.");

    addButton("گفت‌وگو", () => {
      updateHUD("🧑‍🏫 " + curatorDialog[dialogIndex]);
      dialogIndex = (dialogIndex + 1) % curatorDialog.length;
    });

    addButton("راهنمایی", () => {
      updateHUD(
        "راهنما:\n" +
        "• نزدیکِ تابلوها که شوی، «باز کردن در گنجور» ظاهر می‌شود.\n" +
        "• روی موبایل، با کشیدنِ انگشتِ سمت راست نگاه را تنظیم کن.\n" +
        "• اگر می‌خواهی تابلوها روشن‌تر باشند، به چراغ‌های سقفی نزدیک‌تر حرکت کن."
      );
    });
    return;
  }

  if (currentTarget.type === "mural") {
    const p = currentTarget.mural.data;
    updateHUD("🖼️ " + p.title + "\nبرای متن کامل می‌توانی صفحهٔ گنجور را باز کنی.");

    addButton("باز کردن در گنجور", () => safeOpenLink(p.url));
    addButton("توضیح کوتاه", () => {
      updateHUD(
        "🧑‍🏫 " +
        "این بیت را با مکث بخوان. در شعر فارسی، آهنگِ واژه‌ها گاه پیش از مفهوم، دل را می‌گیرد."
      );
    });
  }
}

/* -------------------------
   Build murals then start
-------------------------- */
await buildMurals();
updateHUD("✅ آماده‌است.\nگالری روشن‌تر شد و تابلوها بزرگ‌تر و پایین‌تر نصب شدند.");

/* -------------------------
   Animation loop
-------------------------- */
function animate() {
  const dt = clock.getDelta();

  // turn with arrow keys
  if (keys.ArrowLeft) yaw += SETTINGS.turnSpeedKey * dt;
  if (keys.ArrowRight) yaw -= SETTINGS.turnSpeedKey * dt;

  // movement (desktop arrows)
  let forward = 0;
  if (keys.ArrowUp) forward += 1;
  if (keys.ArrowDown) forward -= 1;

  // movement (mobile joystick)
  const joyForward = -mobile.stickVec.y;
  const joyStrafe = mobile.stickVec.x;

  const moveForward = THREE.MathUtils.clamp(forward + joyForward, -1, 1);
  const moveStrafe = THREE.MathUtils.clamp(joyStrafe, -1, 1);

  // apply rotation
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // move
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

  camera.position.addScaledVector(dir, moveForward * SETTINGS.moveSpeed * dt);
  camera.position.addScaledVector(right, moveStrafe * SETTINGS.moveSpeed * dt);
  clampToHall(camera.position);

  // keep a gentle player light
  playerFill.position.set(camera.position.x, 2.4, camera.position.z);

  // curator idle motion
  curator.position.y = Math.sin(performance.now() * 0.0012) * 0.03;
  curator.rotation.y = Math.sin(performance.now() * 0.0007) * 0.22;

  // lamp flicker (still subtle but brighter)
  for (const l of lamps) {
    const t = performance.now() * 0.001;
    for (const ch of l.children) {
      if (ch.isPointLight) ch.intensity = SETTINGS.torchIntensity * (0.95 + 0.10 * Math.sin(t * 7 + l.position.z));
    }
  }

  updateInteraction();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

/* -------------------------
   Resize
-------------------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
