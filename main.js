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
  moveSpeed: 4.0,           // units/sec
  turnSpeedKey: 1.9,        // rad/sec for arrow left/right
  lookSensitivity: 0.0032,  // for drag/swipe
  pitchLimit: Math.PI * 0.47,

  // Gallery layout
  hallWidth: 26,      // very wide (non-claustrophobic)
  hallHeight: 14,
  hallLength: 180,
  wallThickness: 1.0,

  // Lighting
  ambient: 0.18,
  torchIntensity: 0.9,

  // Interact
  interactDistance: 4.0
};

hud.textContent =
  "گالری در حال آماده‌سازی است…\n" +
  "فونتِ نستعلیق و تابلوها در حال بارگذاری‌اند.";

/* -------------------------
   Three.js Basics
-------------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 18, 120);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  600
);
camera.position.set(0, 1.7, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
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
   - Keep arrow keys for movement/turn, but allow mouse look too.
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
  // xNorm/yNorm in -1..1
  const max = 34; // knob travel px
  const x = xNorm * max;
  const y = yNorm * max;
  stickKnob.style.transform = `translate(${x}px, ${y}px)`;
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

function updateStickFromPointer(px, py) {
  const dx = px - mobile.stickCenter.x;
  const dy = py - mobile.stickCenter.y;
  const radius = 50;
  const len = Math.hypot(dx, dy);
  const nx = len > 0 ? dx / Math.max(len, radius) : 0;
  const ny = len > 0 ? dy / Math.max(len, radius) : 0;
  // clamp to circle
  const cl = Math.min(1, len / radius);
  const x = (dx / (len || 1)) * cl;
  const y = (dy / (len || 1)) * cl;

  mobile.stickVec.x = x;
  mobile.stickVec.y = y;

  setStickKnob(x, y);
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
   Materials + procedural textures
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

// Persian tile floor (stylized)
const floorTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, s, s);

  // subtle speckle
  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const v = 20 + Math.random() * 25;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.12})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // tile lines
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 2;
  const step = s / 8;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(s, i * step);
    ctx.stroke();
  }

  // small motifs
  ctx.strokeStyle = "rgba(180,220,255,0.10)";
  for (let i = 0; i < 24; i++) {
    const cx = (i % 6) * (s / 6) + (s / 12);
    const cy = Math.floor(i / 6) * (s / 4) + (s / 8);
    ctx.beginPath();
    ctx.arc(cx, cy, s / 26, 0, Math.PI * 2);
    ctx.stroke();
  }
});
floorTex.repeat.set(12, 72);

const wallTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#1f1c18";
  ctx.fillRect(0, 0, s, s);

  // plaster-ish texture
  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = 30 + Math.random() * 20;
    ctx.fillStyle = `rgba(${r},${r-4},${r-10},${Math.random() * 0.08})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // repeating geometric band
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
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
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(0, 0, s, s);

  // ornate repeating rosette
  const cx = s / 2, cy = s / 2;
  ctx.translate(cx, cy);
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.18, s * 0.08, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,220,180,0.06)";
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // subtle grain
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const v = 18 + Math.random() * 20;
    ctx.fillStyle = `rgba(${v+10},${v+4},${v},${Math.random() * 0.05})`;
    ctx.fillRect(x, y, 1, 1);
  }
});
ceilingTex.repeat.set(10, 60);

// Persian rug texture (stylized)
const rugTex = makePatternTexture((ctx, s) => {
  ctx.fillStyle = "#3a1212";
  ctx.fillRect(0, 0, s, s);

  // border
  ctx.strokeStyle = "rgba(240,210,140,0.35)";
  ctx.lineWidth = 18;
  ctx.strokeRect(14, 14, s - 28, s - 28);

  // inner border
  ctx.strokeStyle = "rgba(240,210,140,0.22)";
  ctx.lineWidth = 10;
  ctx.strokeRect(40, 40, s - 80, s - 80);

  // central medallion
  ctx.fillStyle = "rgba(20,40,65,0.45)";
  ctx.beginPath();
  ctx.ellipse(s/2, s/2, s*0.22, s*0.30, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = "rgba(240,210,140,0.22)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = s/2 + Math.cos(a) * s*0.22;
    const y = s/2 + Math.sin(a) * s*0.30;
    ctx.beginPath();
    ctx.moveTo(s/2, s/2);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // tiny motif dots
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const alpha = Math.random() * 0.07;
    ctx.fillStyle = `rgba(240,210,140,${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
});
rugTex.repeat.set(1, 18);

/* -------------------------
   Gallery geometry
-------------------------- */
const floorMat = new THREE.MeshStandardMaterial({
  map: floorTex,
  roughness: 0.9,
  metalness: 0.05
});
const rugMat = new THREE.MeshStandardMaterial({
  map: rugTex,
  roughness: 0.95,
  metalness: 0.02
});
const wallMat = new THREE.MeshStandardMaterial({
  map: wallTex,
  roughness: 0.92,
  metalness: 0.02
});
const ceilingMat = new THREE.MeshStandardMaterial({
  map: ceilingTex,
  roughness: 0.92,
  metalness: 0.04
});

function addGallery() {
  const W = SETTINGS.hallWidth;
  const H = SETTINGS.hallHeight;
  const L = SETTINGS.hallLength;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -L / 2);
  floor.receiveShadow = false;
  scene.add(floor);

  // Rugs (center strip)
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.68, L), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, -L / 2);
  scene.add(rug);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, L), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, -L / 2);
  scene.add(ceiling);

  // Walls
  const wallGeo = new THREE.BoxGeometry(SETTINGS.wallThickness, H, L);
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-W / 2, H / 2, -L / 2);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(W / 2, H / 2, -L / 2);
  scene.add(rightWall);

  // Back + entrance frames (optional)
  const backGeo = new THREE.BoxGeometry(W, H, SETTINGS.wallThickness);
  const backWall = new THREE.Mesh(backGeo, wallMat);
  backWall.position.set(0, H / 2, -L);
  scene.add(backWall);

  // Subtle “gallery pilasters” along walls (gives museum feel)
  const pilasterGeo = new THREE.BoxGeometry(0.45, H * 0.92, 0.9);
  for (let i = 0; i < 18; i++) {
    const z = -10 - i * 9.5;
    const pL = new THREE.Mesh(pilasterGeo, new THREE.MeshStandardMaterial({
      color: 0x2b241e, roughness: 0.95, metalness: 0.02
    }));
    pL.position.set(-W / 2 + 0.8, H * 0.46, z);
    scene.add(pL);

    const pR = pL.clone();
    pR.position.set(W / 2 - 0.8, H * 0.46, z);
    scene.add(pR);
  }
}

addGallery();

/* -------------------------
   Lighting (lamps)
-------------------------- */
scene.add(new THREE.AmbientLight(0xffffff, SETTINGS.ambient));

function addLamp(x, y, z) {
  const group = new THREE.Group();

  // chain
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.0, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9 })
  );
  chain.position.set(0, 0.5, 0);
  group.add(chain);

  // ornate housing
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.45, 0.9, 14),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.65, metalness: 0.25 })
  );
  body.position.set(0, 0.05, 0);
  group.add(body);

  // glowing core
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff2cc,
      emissive: 0xffd28a,
      emissiveIntensity: 2.2,
      roughness: 0.35
    })
  );
  glow.position.set(0, 0.02, 0);
  group.add(glow);

  const light = new THREE.PointLight(0xffd4a6, SETTINGS.torchIntensity, 28, 2.0);
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
   Poems (16 murals) + Ganjoor links
   - Text shown is short excerpt, Nastaliq
-------------------------- */
const poems = [
  {
    title: "حافظ — غزل ۱",
    excerpt: "اَلا یا اَیُّهَا السّاقی\nاَدِرْ کَأساً و ناوِلْها",
    url: "https://ganjoor.net/hafez/ghazal/sh1"
  },
  {
    title: "حافظ — غزل ۳",
    excerpt: "اگر آن ترکِ شیرازی\nبه دست آرد دلِ ما را",
    url: "https://ganjoor.net/hafez/ghazal/sh3"
  },
  {
    title: "حافظ — غزل ۱۵۲",
    excerpt: "در ازل پرتوِ حُسنت ز تجلّی دَم زد\nعشق پیدا شد و آتش به همه عالم زد",
    url: "https://ganjoor.net/hafez/ghazal/sh152"
  },
  {
    title: "حافظ — غزل ۲۴۴",
    excerpt: "معاشران گره از زلفِ یار باز کنید\nشبی خوش است بدین قصه‌اش دراز کنید",
    url: "https://ganjoor.net/hafez/ghazal/sh244"
  },
  {
    title: "حافظ — غزل ۳۷۴",
    excerpt: "بیا تا گل برافشانیم و می در ساغر اندازیم\nفلک را سقف بشکافیم و طرحی نو دراندازیم",
    url: "https://ganjoor.net/hafez/ghazal/sh374"
  },

  {
    title: "مولانا — مثنوی (آغاز)",
    excerpt: "بشنو این نی چون شکایت می‌کند\nاز جدایی‌ها حکایت می‌کند",
    url: "https://ganjoor.net/moulavi/masnavi/daftar1/sh1"
  },
  {
    title: "مولانا — مثنوی (دفتر ۱)",
    excerpt: "هر که او بیدارتر، پُر دردتر\nهر که او آگاه‌تر، رخ زردتر",
    url: "https://ganjoor.net/moulavi/masnavi/daftar1/sh29"
  },
  {
    title: "مولانا — دیوان شمس",
    excerpt: "بیامدیم دگربار سوی مولایی\nکه تا به زانوی او نیست هیچ دریایی",
    url: "https://ganjoor.net/moulavi/shams/ghazalsh/sh3079"
  },

  {
    title: "سعدی — گلستان",
    excerpt: "بنی‌آدم اعضای یکدیگرند\nکه در آفرینش ز یک گوهرند",
    url: "https://ganjoor.net/saadi/golestan/gbab1/sh10"
  },
  {
    title: "سعدی — حکایت",
    excerpt: "تو نیکی می‌کن و در دجله انداز\nکه ایزد در بیابانَت دهد باز",
    url: "https://ganjoor.net/saadi/mavaez/masnaviat/sh41"
  },
  {
    title: "سعدی — مواعظ",
    excerpt: "به جهان خرم از آنم که جهان خرم از اوست\nعاشقم بر همه عالم که همه عالم از اوست",
    url: "https://ganjoor.net/saadi/mavaez/ghazal2/sh13"
  },

  {
    title: "فردوسی — شاهنامه",
    excerpt: "توانا بود هر که دانا بود\nز دانش دلِ پیر برنا بود",
    url: "https://ganjoor.net/ferdousi/shahname/aghaz/sh1"
  },

  {
    title: "خیام — رباعی ۶۴",
    excerpt: "ای بس که نباشیم و جهان خواهد بود\nنی نام ز ما و نی‌نشان خواهد بود",
    url: "https://ganjoor.net/khayyam/robaee/sh64"
  },
  {
    title: "خیام — رباعی ۶۶",
    excerpt: "این قافلهٔ عمر عجب می‌گذرد!\nدریاب دمی که با طرب می‌گذرد",
    url: "https://ganjoor.net/khayyam/robaee/sh66"
  },

  {
    title: "عطار — منطق‌الطیر",
    excerpt: "مرحبا ای هدهدِ هادی‌شده\nدر طریقِ عشق، آزادی‌شده",
    url: "https://ganjoor.net/attar/manteghotteyr/aghazm/sh1"
  },

  {
    title: "سنایی — قصیده",
    excerpt: "مسلمانان سرایِ عمر، در گیتی دو در دارد\nکه خاص و عام و نیک و بد، بدین هر دو گذر دارد",
    url: "https://ganjoor.net/sanaee/divans/ghaside-sanaee/sh34"
  }
];

/* -------------------------
   Nastaliq mural texture builder
-------------------------- */
async function makeMuralTexture({ title, excerpt }) {
  // Ensure web font is ready (important for canvas)
  if (document.fonts?.ready) await document.fonts.ready;

  const w = 1024, h = 768;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");

  // Frame background
  ctx.fillStyle = "rgba(20,16,12,1)";
  ctx.fillRect(0, 0, w, h);

  // Ornate border
  ctx.strokeStyle = "rgba(240,210,140,0.55)";
  ctx.lineWidth = 18;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  ctx.strokeStyle = "rgba(240,210,140,0.20)";
  ctx.lineWidth = 8;
  ctx.strokeRect(60, 60, w - 120, h - 120);

  // Mural inner “paper”
  ctx.fillStyle = "rgba(245,236,214,0.10)";
  ctx.fillRect(90, 90, w - 180, h - 180);

  // Title (simple, readable)
  ctx.fillStyle = "rgba(255,240,210,0.90)";
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  ctx.fillText(title, w - 110, 140);

  // Nastaliq poem text
  ctx.fillStyle = "rgba(255,245,230,0.92)";
  ctx.font = "700 44px 'Noto Nastaliq Urdu', serif";
  ctx.textAlign = "right";
  ctx.direction = "rtl";

  const lines = excerpt.split("\n");
  let y = 240;
  for (const line of lines) {
    wrapRTL(ctx, line, w - 110, y, w - 220, 62);
    y += 84;
  }

  // Small motif corners
  ctx.strokeStyle = "rgba(180,220,255,0.14)";
  ctx.lineWidth = 3;
  for (const [x, y2] of [[110,110],[w-110,110],[110,h-110],[w-110,h-110]]) {
    ctx.beginPath();
    ctx.arc(x, y2, 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function wrapRTL(ctx, text, xRight, y, maxWidth, lineHeight) {
  // naive RTL wrap: split by spaces and build lines from right
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  const lines = [];
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? (line + " " + words[i]) : words[i];
    const width = ctx.measureText(testLine).width;
    if (width > maxWidth && line) {
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
   Place murals along walls
-------------------------- */
const murals = []; // { mesh, data }
const muralGroup = new THREE.Group();
scene.add(muralGroup);

async function buildMurals() {
  const W = SETTINGS.hallWidth;
  const H = SETTINGS.hallHeight;
  const zStart = -14;
  const zStep = 10.5;

  // Distribute 16 on alternating sides, slightly staggered for richness
  for (let i = 0; i < poems.length; i++) {
    const p = poems[i];
    const tex = await makeMuralTexture(p);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.75,
      metalness: 0.02
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.65,
      metalness: 0.22
    });

    // Frame as thin box + inner canvas plane
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 0.18), frameMat);
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.8), mat);
    canvas.position.set(0, 0, 0.10);
    frame.add(canvas);

    // Position
    const side = i % 2 === 0 ? -1 : 1;
    const z = zStart - i * zStep;
    const x = side * (W / 2 - 0.62);
    const y = 4.8 + ((i % 4) * 0.15); // slight variance
    frame.position.set(x, y, z);
    frame.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

    // Add a gentle “spot” light per mural (museum vibe)
    const sLight = new THREE.SpotLight(0xffe2bb, 0.35, 18, Math.PI/7, 0.6, 1.2);
    sLight.position.set(x - side * 1.2, SETTINGS.hallHeight - 1.4, z + 0.5);
    sLight.target = frame;
    scene.add(sLight);
    scene.add(sLight.target);

    muralGroup.add(frame);
    murals.push({ mesh: frame, data: p });
  }
}

/* -------------------------
   Curator (improved visually)
-------------------------- */
function makeCurator() {
  const g = new THREE.Group();

  // Robe (layered)
  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.85, 1.6, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 })
  );
  robe.position.y = 0.8;
  g.add(robe);

  const sash = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.08, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x4b2a2a, roughness: 0.85 })
  );
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.92;
  g.add(sash);

  // Head + turban
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0xb78c6b, roughness: 0.7 })
  );
  head.position.y = 1.75;
  g.add(head);

  const beard = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.28, 14),
    new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.95 })
  );
  beard.position.set(0, 1.58, 0.11);
  beard.rotation.x = Math.PI;
  g.add(beard);

  const turban = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.07, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0xd7d1c2, roughness: 0.9 })
  );
  turban.position.y = 1.84;
  turban.rotation.x = Math.PI / 2;
  g.add(turban);

  const turbanTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xd7d1c2, roughness: 0.9 })
  );
  turbanTop.position.y = 1.95;
  g.add(turbanTop);

  // Staff
  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 1.7, 10),
    new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.95 })
  );
  staff.position.set(0.45, 0.85, 0.10);
  staff.rotation.z = -0.08;
  g.add(staff);

  // Book
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.22, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.85 })
  );
  book.position.set(-0.38, 1.02, 0.25);
  book.rotation.y = 0.35;
  g.add(book);

  // A small lantern glow
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff1cc,
      emissive: 0xffd28a,
      emissiveIntensity: 1.6,
      roughness: 0.3
    })
  );
  lantern.position.set(-0.46, 0.95, 0.35);
  g.add(lantern);

  const lanternLight = new THREE.PointLight(0xffd4a6, 0.55, 8, 2.0);
  lanternLight.position.copy(lantern.position);
  g.add(lanternLight);

  // Ground shadow hint (dark disk)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 22),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0, metalness: 0 })
  );
  shadow.rotation.x = -Math.PI/2;
  shadow.position.y = 0.02;
  shadow.material.transparent = true;
  shadow.material.opacity = 0.25;
  g.add(shadow);

  g.position.set(0, 0, -44);
  return g;
}

const curator = makeCurator();
scene.add(curator);

const curatorDialog = [
  "در این تالار، هر دیوار همچون نسخه‌ای خطی است: باید آهسته خواند و تند نگذشت.",
  "اگر معنایی بر تو سنگین افتاد، از همان سنگینی نگریز؛ گاه وزنِ معنا، نشانِ صدق آن است.",
  "هر تابلو، دری است. اما کلید، همیشه «نگاه» است؛ نه صرفاً «دانستن».",
  "اگر می‌خواهی گم نشوی، قدم‌هایت را با نفس‌هایت هم‌آهنگ کن: آرام و پیوسته."
];

let dialogIndex = 0;

/* -------------------------
   Interaction & UI buttons
-------------------------- */
const raycaster = new THREE.Raycaster();
const tempVec = new THREE.Vector3();

let currentTarget = null; // { type: 'mural'|'curator', ... }

function clearActionBar() {
  actionBar.innerHTML = "";
}

function addButton(label, onClick) {
  const b = document.createElement("button");
  b.className = "btn";
  b.textContent = label;
  b.addEventListener("click", onClick);
  actionBar.appendChild(b);
}

function updateHUD(text) {
  hud.textContent = text;
}

/* -------------------------
   Collision (simple)
-------------------------- */
function clampToHall(pos) {
  const W = SETTINGS.hallWidth;
  const L = SETTINGS.hallLength;

  // keep player inside corridor bounds
  pos.x = THREE.MathUtils.clamp(pos.x, -W/2 + 1.3, W/2 - 1.3);
  pos.z = THREE.MathUtils.clamp(pos.z, -L + 2.2, 1.5);
}

/* -------------------------
   Build murals then start
-------------------------- */
await buildMurals();
updateHUD("✅ آماده‌است.\nبا کلیدهای جهت‌دار حرکت کن.\n(روی موبایل: دایرهٔ چپ برای حرکت، کشیدنِ انگشتِ راست برای نگاه.)");

/* -------------------------
   Animation loop
-------------------------- */
function animate() {
  const dt = clock.getDelta();

  // Key-based turn (arrow keys only)
  if (keys.ArrowLeft) yaw += SETTINGS.turnSpeedKey * dt;
  if (keys.ArrowRight) yaw -= SETTINGS.turnSpeedKey * dt;

  // Movement (desktop arrows)
  let forward = 0;
  if (keys.ArrowUp) forward += 1;
  if (keys.ArrowDown) forward -= 1;

  // Movement (mobile joystick)
  // stick y: down is positive dy; we want up = forward
  const joyForward = -mobile.stickVec.y;
  const joyStrafe = mobile.stickVec.x;

  // combine (desktop + mobile)
  const moveForward = THREE.MathUtils.clamp(forward + joyForward, -1, 1);
  const moveStrafe = THREE.MathUtils.clamp(joyStrafe, -1, 1);

  // Apply camera rotation
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // Move in facing direction
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

  const speed = SETTINGS.moveSpeed;
  camera.position.addScaledVector(dir, moveForward * speed * dt);
  camera.position.addScaledVector(right, moveStrafe * speed * dt);

  clampToHall(camera.position);

  // Curator idle animation (subtle)
  curator.position.y = Math.sin(performance.now() * 0.0013) * 0.03;
  curator.rotation.y = Math.sin(performance.now() * 0.0007) * 0.25;

  // Lamp flicker
  for (const l of lamps) {
    const t = performance.now() * 0.001;
    l.children.forEach(ch => {
      if (ch.isPointLight) ch.intensity = SETTINGS.torchIntensity * (0.92 + 0.12 * Math.sin(t * 7 + l.position.z));
    });
  }

  // Interaction detection
  updateInteraction();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updateInteraction() {
  clearActionBar();
  currentTarget = null;

  // Check curator proximity
  tempVec.copy(curator.position);
  const distCurator = tempVec.distanceTo(camera.position);
  if (distCurator < SETTINGS.interactDistance + 1.0) {
    currentTarget = { type: "curator" };
  }

  // Raycast murals in front
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const muralMeshes = murals.map(m => m.mesh);
  const hits = raycaster.intersectObjects(muralMeshes, true);

  if (hits.length > 0) {
    const hit = hits[0].object;
    const root = murals.find(m => m.mesh === hit || m.mesh.children.includes(hit) || m.mesh.children[0] === hit)?.mesh;
    const muralObj = murals.find(m => m.mesh === root);
    if (muralObj) {
      // distance gate
      const d = muralObj.mesh.position.distanceTo(camera.position);
      if (d < SETTINGS.interactDistance + 1.2) {
        currentTarget = { type: "mural", mural: muralObj };
      }
    }
  }

  // UI
  if (!currentTarget) {
    updateHUD("✅ آماده‌است.\nبا کلیدهای جهت‌دار حرکت کن.\n(موبایل: چپ حرکت، راست نگاه.)");
    return;
  }

  if (currentTarget.type === "curator") {
    updateHUD(
      "🧑‍🏫 سرپرستِ گالری نزدیک است.\n" +
      "می‌توانی گفت‌وگو را آغاز کنی."
    );
    addButton("گفت‌وگو", () => {
      updateHUD("🧑‍🏫 " + curatorDialog[dialogIndex]);
      dialogIndex = (dialogIndex + 1) % curatorDialog.length;
    });
    addButton("راهنماییِ کوتاه", () => {
      updateHUD(
        "راهنما:\n" +
        "• نزدیکِ تابلوها که شوی، دکمهٔ «گنجور» ظاهر می‌شود.\n" +
        "• روی موبایل، نگاه را با کشیدنِ انگشتِ سمتِ راست تنظیم کن.\n" +
        "• اگر سرگیجه گرفتی، آهسته‌تر بچرخ و نزدیکِ چراغ‌ها حرکت کن."
      );
    });
    return;
  }

  if (currentTarget.type === "mural") {
    const p = currentTarget.mural.data;
    updateHUD(
      "🖼️ " + p.title + "\n" +
      "برای خواندنِ کامل و دیدنِ توضیحات، می‌توانی صفحهٔ گنجور را باز کنی."
    );
    addButton("باز کردن در گنجور", () => {
      window.open(p.url, "_blank", "noopener,noreferrer");
    });
    addButton("سرپرست: توضیح کوتاه", () => {
      updateHUD(
        "🧑‍🏫 " +
        "این تابلو را نه فقط برای معنا، بلکه برای آهنگِ زبان بخوان. " +
        "در شعر فارسی، گاه موسیقیِ واژه‌ها پیش از مفهوم، دل را می‌گیرد."
      );
    });
  }
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
