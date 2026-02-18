import * as THREE from "three";

/* ===============================
   DOM
================================= */
const hud = document.getElementById("hud");
const actionBar = document.getElementById("actionBar");
const stickBase = document.getElementById("stickBase");
const stickKnob = document.getElementById("stickKnob");
const lookPad = document.getElementById("lookPad");

function setHUD(text) {
  if (hud) hud.textContent = text;
}

setHUD("در حال بارگذاری گالری…");

/* ===============================
   SCENE / CAMERA / RENDERER
================================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101015);
scene.fog = new THREE.Fog(0x101015, 120, 520);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  900
);
camera.position.set(0, 1.7, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ===============================
   LIGHTING (BRIGHTER)
================================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.78));
scene.add(new THREE.HemisphereLight(0xdbe6ff, 0x2a1a12, 0.55));

const playerFill = new THREE.PointLight(0xffefd8, 1.1, 18, 2.0);
scene.add(playerFill);

/* ===============================
   GALLERY GEOMETRY (WIDE + TALL)
================================= */
const G = {
  width: 34,
  height: 16,
  length: 170,
  wallT: 1.0
};

const floorMat = new THREE.MeshStandardMaterial({ color: 0x4b1c1c, roughness: 0.95 });
const rugMat   = new THREE.MeshStandardMaterial({ color: 0x7a2020, roughness: 0.92 });
const wallMat  = new THREE.MeshStandardMaterial({ color: 0x3b2f26, roughness: 0.92 });
const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.85 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(G.width, G.length), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, -G.length / 2);
scene.add(floor);

const rug = new THREE.Mesh(new THREE.PlaneGeometry(G.width * 0.74, G.length), rugMat);
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.01, -G.length / 2);
scene.add(rug);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(G.width, G.length), ceilMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, G.height, -G.length / 2);
scene.add(ceiling);

const leftWall = new THREE.Mesh(new THREE.BoxGeometry(G.wallT, G.height, G.length), wallMat);
leftWall.position.set(-G.width / 2, G.height / 2, -G.length / 2);
scene.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.BoxGeometry(G.wallT, G.height, G.length), wallMat);
rightWall.position.set(G.width / 2, G.height / 2, -G.length / 2);
scene.add(rightWall);

const backWall = new THREE.Mesh(new THREE.BoxGeometry(G.width, G.height, G.wallT), wallMat);
backWall.position.set(0, G.height / 2, -G.length);
scene.add(backWall);

/* Decorative ceiling lamps (bright) */
function addCeilingLamp(x, z) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.45, 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x4b3622, roughness: 0.55, metalness: 0.2 })
  );
  body.position.set(0, 0, 0);
  g.add(body);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 18, 18),
    new THREE.MeshStandardMaterial({
      color: 0xfff3da,
      emissive: 0xffd29a,
      emissiveIntensity: 2.7,
      roughness: 0.3
    })
  );
  glow.position.set(0, -0.05, 0);
  g.add(glow);

  const light = new THREE.PointLight(0xffe2bf, 2.4, 46, 2.0);
  light.position.set(0, -0.05, 0);
  g.add(light);

  g.position.set(x, G.height - 1.0, z);
  scene.add(g);
}

for (let i = 0; i < 12; i++) {
  const z = -14 - i * 13;
  addCeilingLamp(-G.width * 0.28, z);
  addCeilingLamp( G.width * 0.28, z);
}

/* ===============================
   POEMS (3 lines min) + EXPLANATIONS
================================= */
const poems = [
  {
    title: "حافظ",
    lines: [
      "دوش دیدم که ملایک در میخانه زدند",
      "گل آدم بسرشتند و به پیمانه زدند",
      "ساکنان حرم ستر و عفاف ملکوت"
    ],
    explain:
      "در این تصویرپردازی، «میخانه» نمادِ جایگاهِ راز و معرفت است. حافظ می‌گوید سرشتِ انسان با ظرفی از «پیمانه» شکل گرفت؛ یعنی آمیزه‌ای از خاکِ محدود و اشتیاقِ بی‌پایان. اشاره به «حرم ستر و عفاف» یادآورِ آن است که حقیقتِ انسان را نمی‌توان تنها با ظاهر سنجید."
  },
  {
    title: "مولانا",
    lines: [
      "این جهان کوه است و فعل ما ندا",
      "سوی ما آید نداها را صدا",
      "چون تو در کوه ندا کردی، جواب آید تو را"
    ],
    explain:
      "مولانا قانونِ بازتاب را بیان می‌کند: کردارِ تو مانند صدایی است که در کوه می‌پیچد و به تو بازمی‌گردد. جهان در این نگاه، نه بی‌طرف و خاموش، بلکه آینه‌دارِ کنشِ انسان است. نتیجه این است که اصلاحِ بیرون از مسیرِ اصلاحِ درون جدا نیست."
  },
  {
    title: "سعدی",
    lines: [
      "بنی آدم اعضای یکدیگرند",
      "که در آفرینش ز یک گوهرند",
      "چو عضوی به درد آورد روزگار"
    ],
    explain:
      "این ابیات، اخلاقِ اجتماعی را به زبانِ بدن توضیح می‌دهد: انسان‌ها همچون اندام‌های یک پیکرند. اگر عضوی آسیب ببیند، آرامشِ کل پیکر مختل می‌شود. سعدی از این راه، همدلی را از سطحِ توصیه به سطحِ ضرورتِ انسانی ارتقا می‌دهد."
  },
  {
    title: "فردوسی",
    lines: [
      "توانا بود هر که دانا بود",
      "ز دانش دل پیر برنا بود",
      "ز دانش به اندر جهان نیکنام"
    ],
    explain:
      "فردوسی توانایی را نتیجهٔ دانایی می‌داند، نه زور. دانش، دلِ خسته و فرسوده را نیز جوان می‌کند، چون به انسان افق و قدرتِ تشخیص می‌دهد. در این نگاه، نام نیک در جهان از رهگذرِ خرد و آموزش پایدار می‌شود."
  },
  {
    title: "خیام",
    lines: [
      "ابر آمد و باز بر سر سبزه گریست",
      "بی بادهٔ گلگون نمی‌باید زیست",
      "این سبزه که امروز تماشاگه ماست"
    ],
    explain:
      "خیام گذرِ زمان را با طبیعت نشان می‌دهد: بارانِ ابر بر سبزه، یادآورِ تکرارِ آمدن و رفتن است. «باده» در اینجا بیش از یک نوشیدنی، نمادِ شورِ زیستن و قدر دانستنِ لحظه است. پیام اصلی: اکنون را دریاب، زیرا چرخهٔ جهان منتظرِ کسی نمی‌ماند."
  },
  {
    title: "عطار",
    lines: [
      "چون به عشق آمد قلم بر خود شکافت",
      "عقل در شرحش چو خر در گل بخفت",
      "عشق را صد پرده باشد پیش و پس"
    ],
    explain:
      "عطار می‌گوید وقتی نوبتِ عشق برسد، ابزارهای معمولِ توضیح (قلم و عقل) ناتوان می‌شوند. «خر در گل» تصویرِ گیر کردنِ عقل در جزئیات است؛ جایی که راهِ عبور، از جنسِ تجربه و سلوک است نه استدلال. عشق لایه‌ها و پرده‌های فراوان دارد؛ باید قدم‌به‌قدم پیش رفت."
  },
  {
    title: "نظامی",
    lines: [
      "جهان چون خط و خال و چشم و ابروست",
      "که هر چیزی به جای خویش نیکوست",
      "اگر در جای خود بنشست، زیباست"
    ],
    explain:
      "نظامی بر تناسب و جای‌مندیِ عناصر تأکید می‌کند. زیباییِ عالم از آن روست که هر چیز در جایِ درستِ خود معنا دارد؛ حتی آنچه به‌تنهایی کوچک یا کم‌ارزش می‌نماید. نتیجهٔ اخلاقی: قضاوت را به کلّیت و نسبت‌ها بسپار، نه به تک‌جزء."
  },
  {
    title: "پروین اعتصامی",
    lines: [
      "گویند خردمند مرو در پی مال",
      "زیرا که همه مال رود در زوال",
      "آن به که بماند هنر اندر دل تو"
    ],
    explain:
      "پروین تفاوتِ داراییِ بیرونی و سرمایهٔ درونی را روشن می‌کند. مال، ناپایدار و وابسته به زمان است؛ اما «هنر» و «فضیلت» در جان می‌ماند و آدمی را در هر شرایطی توانا می‌کند. نتیجه: به آنچه از تو جدا نمی‌شود بیشتر بیندیش."
  }
];

/* ===============================
   TEXTURE FOR POEM FRAMES (Nastaliq)
================================= */
function makePoemTexture({ title, lines }) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 768;
  const ctx = c.getContext("2d");

  // background
  ctx.fillStyle = "#0f0f12";
  ctx.fillRect(0, 0, c.width, c.height);

  // border
  ctx.strokeStyle = "rgba(255,230,190,0.70)";
  ctx.lineWidth = 18;
  ctx.strokeRect(26, 26, c.width - 52, c.height - 52);

  ctx.strokeStyle = "rgba(255,230,190,0.22)";
  ctx.lineWidth = 6;
  ctx.strokeRect(58, 58, c.width - 116, c.height - 116);

  // title
  ctx.fillStyle = "rgba(255,235,210,0.95)";
  ctx.textAlign = "center";
  ctx.font = "52px 'Noto Nastaliq Urdu'";
  ctx.fillText(title, c.width / 2, 150);

  // poem lines
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "46px 'Noto Nastaliq Urdu'";
  let y = 270;
  for (const line of lines) {
    ctx.fillText(line, c.width / 2, y);
    y += 95;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ===============================
   PLACE POEM FRAMES ON WALLS (LOWER + BIGGER)
================================= */
const frames = [];

poems.forEach((poem, i) => {
  const tex = makePoemTexture(poem);

  const material = new THREE.MeshBasicMaterial({ map: tex });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 5.1), material);

  const z = -18 - i * 16;
  const leftSide = i % 2 === 0;

  const x = leftSide ? -G.width / 2 + 1.05 : G.width / 2 - 1.05;
  mesh.position.set(x, 3.0, z); // lower for visibility
  mesh.rotation.y = leftSide ? Math.PI / 2 : -Math.PI / 2;

  scene.add(mesh);
  frames.push({ mesh, poem });
});

/* ===============================
   INTERACTION BUTTONS (iOS-safe)
================================= */
function clearButtons() {
  if (actionBar) actionBar.innerHTML = "";
}

function addButton(label, fn) {
  if (!actionBar) return;
  const b = document.createElement("button");
  b.className = "btn";
  b.type = "button";
  b.textContent = label;

  // click
  b.addEventListener("click", (e) => {
    e.preventDefault();
    fn();
  });

  // iOS / in-app browsers: touchend is often more reliable
  b.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      fn();
    },
    { passive: false }
  );

  actionBar.appendChild(b);
}

function updateInteraction() {
  clearButtons();

  let best = null;
  let bestDist = Infinity;

  for (const f of frames) {
    const d = camera.position.distanceTo(f.mesh.position);
    if (d < 6.0 && d < bestDist) {
      best = f;
      bestDist = d;
    }
  }

  if (best) {
    addButton("توضیح شعر", () => {
      setHUD(
        `«${best.poem.title}»\n\n` +
        best.poem.lines.join("\n") +
        `\n\n— توضیح —\n${best.poem.explain}`
      );
    });

    addButton("راهنمایی", () => {
      setHUD(
        "راهنما:\n" +
        "• نزدیکِ تابلو شو تا دکمهٔ «توضیح شعر» ظاهر شود.\n" +
        "• موبایل: با دایرهٔ چپ حرکت کن؛ با کشیدن انگشت در سمت راست نگاه کن.\n" +
        "• دسکتاپ: با کلیدهای جهت‌دار حرکت و چرخش انجام بده."
      );
    });
  }
}

/* ===============================
   CONTROLS: DESKTOP ARROW KEYS + MOBILE JOYSTICK/LOOK
================================= */
const clock = new THREE.Clock();

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

window.addEventListener("keydown", (e) => {
  if (e.code in keys) keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  if (e.code in keys) keys[e.code] = false;
});

// yaw/pitch
let yaw = 0;
let pitch = 0;
const PITCH_LIMIT = Math.PI * 0.47;

// mobile state
const mobile = {
  stickActive: false,
  stickId: null,
  stickCenterX: 0,
  stickCenterY: 0,
  stickX: 0, // -1..1
  stickY: 0, // -1..1
  lookActive: false,
  lookId: null,
  lookLastX: 0,
  lookLastY: 0
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function applyLookDelta(dx, dy) {
  const sens = 0.0032;
  yaw -= dx * sens;
  pitch -= dy * sens;
  pitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
}

function setStickKnob(xNorm, yNorm) {
  if (!stickKnob) return;
  const max = 34;
  stickKnob.style.transform = `translate(${xNorm * max}px, ${yNorm * max}px)`;
}

function updateStick(px, py) {
  const dx = px - mobile.stickCenterX;
  const dy = py - mobile.stickCenterY;
  const radius = 52;
  const len = Math.hypot(dx, dy);

  const cl = Math.min(1, len / radius);
  const x = (dx / (len || 1)) * cl;
  const y = (dy / (len || 1)) * cl;

  mobile.stickX = x;
  mobile.stickY = y;

  setStickKnob(x, y);
}

if (stickBase) {
  stickBase.addEventListener("pointerdown", (e) => {
    mobile.stickActive = true;
    mobile.stickId = e.pointerId;
    stickBase.setPointerCapture(e.pointerId);

    const r = stickBase.getBoundingClientRect();
    mobile.stickCenterX = r.left + r.width / 2;
    mobile.stickCenterY = r.top + r.height / 2;

    updateStick(e.clientX, e.clientY);
  });

  stickBase.addEventListener("pointermove", (e) => {
    if (!mobile.stickActive || e.pointerId !== mobile.stickId) return;
    updateStick(e.clientX, e.clientY);
  });

  const endStick = (e) => {
    if (mobile.stickId !== null && e.pointerId !== mobile.stickId) return;
    mobile.stickActive = false;
    mobile.stickId = null;
    mobile.stickX = 0;
    mobile.stickY = 0;
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
    mobile.lookLastX = e.clientX;
    mobile.lookLastY = e.clientY;
  });

  lookPad.addEventListener("pointermove", (e) => {
    if (!mobile.lookActive || e.pointerId !== mobile.lookId) return;
    const dx = e.clientX - mobile.lookLastX;
    const dy = e.clientY - mobile.lookLastY;
    mobile.lookLastX = e.clientX;
    mobile.lookLastY = e.clientY;
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

/* ===============================
   MOVEMENT + BOUNDS
================================= */
function updateMovement(dt) {
  // update camera rotation
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  // keep a small light with the player
  playerFill.position.copy(camera.position).add(new THREE.Vector3(0, 1.8, 0));

  const moveSpeed = 5.0;     // units/sec
  const turnSpeed = 2.0;     // rad/sec

  // desktop arrows: forward/back + yaw
  let forward = 0;
  if (keys.ArrowUp) forward += 1;
  if (keys.ArrowDown) forward -= 1;

  if (keys.ArrowLeft) yaw += turnSpeed * dt;
  if (keys.ArrowRight) yaw -= turnSpeed * dt;

  // mobile joystick: forward/back + strafe
  // stickY: up is negative on screen -> invert
  const mobForward = -mobile.stickY;
  const mobStrafe = mobile.stickX;

  const f = forward + mobForward;
  const s = mobStrafe;

  if (Math.abs(f) > 0.001) camera.translateZ(-f * moveSpeed * dt);
  if (Math.abs(s) > 0.001) camera.translateX(s * moveSpeed * dt);

  // hard bounds so you stay inside the gallery
  const minX = -G.width / 2 + 1.6;
  const maxX =  G.width / 2 - 1.6;
  const minZ = -G.length + 2.0;
  const maxZ =  2.0;

  camera.position.x = clamp(camera.position.x, minX, maxX);
  camera.position.z = clamp(camera.position.z, minZ, maxZ);
  camera.position.y = 1.7; // lock height
}

/* ===============================
   LOOP
================================= */
setHUD(
  "گالری آماده است.\n" +
  "• موبایل: با دایرهٔ چپ حرکت کن؛ با کشیدن انگشت در سمت راست نگاه کن.\n" +
  "• نزدیک تابلو شو تا «توضیح شعر» ظاهر شود."
);

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  updateMovement(dt);
  updateInteraction();
  renderer.render(scene, camera);
}
animate();
