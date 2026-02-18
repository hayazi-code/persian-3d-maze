import * as THREE from "three";

/*
Navigation (Arrow Keys Only):
↑ forward
↓ backward
← turn left
→ turn right

Interaction:
- When you are close to the curator, a button appears: «گفتگو با متصدی»
- Click it to open curated dialogue (no extra keys).
*/

// ---------------------
// UI (created in JS so index.html stays simple)
// ---------------------
const hud = document.getElementById("hud");
function setHUD(msg) { if (hud) hud.textContent = msg; }

function makeButton(text) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.style.all = "unset";
  btn.style.cursor = "pointer";
  btn.style.padding = "10px 14px";
  btn.style.borderRadius = "12px";
  btn.style.background = "rgba(0,0,0,0.55)";
  btn.style.border = "1px solid rgba(255, 210, 160, 0.35)";
  btn.style.color = "rgba(255,235,210,0.95)";
  btn.style.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  btn.style.userSelect = "none";
  btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  return btn;
}

const talkBtn = makeButton("گفتگو با متصدی");
talkBtn.style.position = "fixed";
talkBtn.style.bottom = "18px";
talkBtn.style.right = "18px";
talkBtn.style.zIndex = "30";
talkBtn.style.display = "none";
document.body.appendChild(talkBtn);

const dialogOverlay = document.createElement("div");
dialogOverlay.style.position = "fixed";
dialogOverlay.style.inset = "0";
dialogOverlay.style.background = "rgba(0,0,0,0.60)";
dialogOverlay.style.zIndex = "40";
dialogOverlay.style.display = "none";
dialogOverlay.style.backdropFilter = "blur(2px)";
document.body.appendChild(dialogOverlay);

const dialogPanel = document.createElement("div");
dialogPanel.style.position = "absolute";
dialogPanel.style.right = "24px";
dialogPanel.style.left = "24px";
dialogPanel.style.bottom = "24px";
dialogPanel.style.maxWidth = "920px";
dialogPanel.style.margin = "0 auto";
dialogPanel.style.borderRadius = "18px";
dialogPanel.style.border = "1px solid rgba(255, 210, 160, 0.30)";
dialogPanel.style.background = "rgba(10, 8, 6, 0.92)";
dialogPanel.style.boxShadow = "0 20px 60px rgba(0,0,0,0.5)";
dialogPanel.style.padding = "16px 16px 14px 16px";
dialogPanel.style.color = "rgba(255,235,210,0.95)";
dialogPanel.style.font = '15px system-ui, -apple-system, Segoe UI, Roboto, Arial';
dialogPanel.style.lineHeight = "1.7";
dialogOverlay.appendChild(dialogPanel);

const dialogTitle = document.createElement("div");
dialogTitle.style.font = '22px "Noto Nastaliq Urdu","Noto Naskh Arabic","Tahoma","Arial"';
dialogTitle.style.color = "rgba(255, 215, 170, 0.95)";
dialogTitle.style.marginBottom = "6px";
dialogTitle.textContent = "متصدی گالری";
dialogPanel.appendChild(dialogTitle);

const dialogText = document.createElement("div");
dialogText.style.margin = "8px 0 12px 0";
dialogPanel.appendChild(dialogText);

const choicesWrap = document.createElement("div");
choicesWrap.style.display = "flex";
choicesWrap.style.flexWrap = "wrap";
choicesWrap.style.gap = "10px";
choicesWrap.style.justifyContent = "flex-start";
dialogPanel.appendChild(choicesWrap);

const closeBtn = makeButton("بستن");
closeBtn.style.marginRight = "auto";
closeBtn.style.borderColor = "rgba(255, 210, 160, 0.22)";
closeBtn.style.background = "rgba(0,0,0,0.38)";
closeBtn.style.marginTop = "12px";
dialogPanel.appendChild(closeBtn);

closeBtn.addEventListener("click", () => {
  dialogOverlay.style.display = "none";
});

// ---------------------
// Scene
// ---------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
scene.fog = new THREE.Fog(0x050507, 12, 180);

// Gallery dimensions (wide + high ceiling)
const GALLERY_W = 44;        // width
const GALLERY_L = 90;        // length
const WALL_H = 10.5;         // high ceiling
const PLAYER_RADIUS = 0.55;  // roomy collision

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 1.75, -GALLERY_L / 2 + 8);

let yaw = 0; // facing into the gallery
camera.rotation.set(0, yaw, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
document.body.appendChild(renderer.domElement);
renderer.domElement.setAttribute("tabindex", "0");
renderer.domElement.style.outline = "none";
renderer.domElement.addEventListener("click", () => renderer.domElement.focus());

// Lighting (museum-like)
scene.add(new THREE.AmbientLight(0xffffff, 0.18));
scene.add(new THREE.HemisphereLight(0x9fb0ff, 0x120900, 0.16));

// Soft “carry” light so it never becomes unreadable
const playerFill = new THREE.PointLight(0xffd2a4, 0.75, 18);
scene.add(playerFill);

// ---------------------
// Procedural textures
// ---------------------
function makeRugTexture(seed = 0) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");

  g.fillStyle = "#2a0f12";
  g.fillRect(0, 0, c.width, c.height);

  // border
  g.fillStyle = "#c6a24f";
  g.fillRect(22, 22, c.width - 44, c.height - 44);
  g.fillStyle = "#14090a";
  g.fillRect(44, 44, c.width - 88, c.height - 88);

  // field
  g.fillStyle = "#3b1317";
  g.fillRect(70, 70, c.width - 140, c.height - 140);

  // medallion
  g.save();
  g.translate(c.width / 2, c.height / 2);
  g.rotate(0.02 * seed);
  g.fillStyle = "rgba(210,170,90,0.85)";
  g.beginPath(); g.ellipse(0, 0, 190, 120, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(20,9,10,0.85)";
  g.beginPath(); g.ellipse(0, 0, 130, 85, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  // motifs
  g.globalAlpha = 0.35;
  g.fillStyle = "#c6a24f";
  for (let y = 110; y < c.height - 110; y += 64) {
    for (let x = 120; x < c.width - 120; x += 84) {
      const r = 10 + ((x + y + seed) % 10);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillRect(x - 2, y - 22, 4, 44);
      g.fillRect(x - 22, y - 2, 44, 4);
    }
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
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

  // lattice
  g.strokeStyle = "rgba(220,195,130,0.22)";
  g.lineWidth = 3;

  const step = 128;
  for (let y = 0; y <= c.height; y += step) {
    for (let x = 0; x <= c.width; x += step) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + step, y + step); g.stroke();
      g.beginPath(); g.moveTo(x + step, y); g.lineTo(x, y + step); g.stroke();
    }
  }

  // rosette rings
  g.save();
  g.translate(c.width / 2, c.height / 2);
  for (let i = 0; i < 16; i++) {
    g.strokeStyle = `rgba(220,195,130,${0.08 + i * 0.008})`;
    g.beginPath(); g.arc(0, 0, 220 + i * 7, 0, Math.PI * 2); g.stroke();
  }
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 6);
  tex.anisotropy = 8;
  return tex;
}

// ---------------------
// Gallery architecture
// ---------------------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(GALLERY_W, GALLERY_L),
  new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.98 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Rugs: a long runner + side rugs
const rugs = [];
function addRug(x, z, w, l, seed) {
  const tex = makeRugTexture(seed);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0 });
  const r = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
  r.rotation.x = -Math.PI / 2;
  r.position.set(x, 0.02, z);
  scene.add(r);
  rugs.push(r);
}
addRug(0, 0, 6.5, GALLERY_L * 0.92, 1);
addRug(-GALLERY_W * 0.24, 0, 5.2, GALLERY_L * 0.65, 2);
addRug(+GALLERY_W * 0.24, 0, 5.2, GALLERY_L * 0.65, 3);

// Ceiling
const ceilingTex = makeCeilingTexture();
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(GALLERY_W, GALLERY_L),
  new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.85, metalness: 0.05 })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = WALL_H;
scene.add(ceiling);

// Walls (as thin boxes)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x4b4b5a, roughness: 0.86, metalness: 0.06 });

function addWall(w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

const WALL_T = 0.7;
const halfW = GALLERY_W / 2;
const halfL = GALLERY_L / 2;

// north/south
addWall(GALLERY_W + WALL_T, WALL_H, WALL_T, 0, WALL_H / 2, -halfL);
addWall(GALLERY_W + WALL_T, WALL_H, WALL_T, 0, WALL_H / 2, +halfL);
// east/west
addWall(WALL_T, WALL_H, GALLERY_L + WALL_T, -halfW, WALL_H / 2, 0);
addWall(WALL_T, WALL_H, GALLERY_L + WALL_T, +halfW, WALL_H / 2, 0);

// ---------------------
// Museum lamps (beautiful hanging lanterns)
// ---------------------
const lamps = [];

function addLamp(x, z) {
  const lamp = new THREE.Group();

  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 2.0, 10),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.9 })
  );
  chain.position.y = WALL_H - 1.0;

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.40, 0.55, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a2a12, roughness: 0.65, metalness: 0.35 })
  );
  cap.position.y = WALL_H - 2.2;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.44, 0.70, 18),
    new THREE.MeshStandardMaterial({ color: 0x3b2a12, roughness: 0.60, metalness: 0.40 })
  );
  body.position.y = WALL_H - 2.75;

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 18),
    new THREE.MeshStandardMaterial({
      color: 0xffd9b3,
      roughness: 0.18,
      metalness: 0.0,
      emissive: 0xffaa55,
      emissiveIntensity: 0.55
    })
  );
  glass.scale.set(1, 0.75, 1);
  glass.position.y = WALL_H - 2.85;

  lamp.add(chain, cap, body, glass);
  lamp.position.set(x, 0, z);
  scene.add(lamp);

  const light = new THREE.PointLight(0xffaa55, 2.4, 26);
  light.position.set(x, WALL_H - 2.9, z);
  scene.add(light);

  lamps.push({ light, glass });
}

// spaced lamps down the hall
for (let i = -halfL + 10; i <= halfL - 10; i += 12) {
  addLamp(0, i);
  addLamp(-halfW * 0.36, i + 6);
  addLamp(+halfW * 0.36, i - 6);
}

// ---------------------
// Poem “murals” (large framed wall panels)
// ---------------------
function makeMuralTexture(lines, author, title) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // deep mural background
  ctx.fillStyle = "rgba(18, 12, 8, 0.94)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // subtle vignette
  const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 60, canvas.width/2, canvas.height/2, 980);
  grad.addColorStop(0, "rgba(255,220,170,0.07)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // inner border
  ctx.strokeStyle = "rgba(255, 215, 170, 0.22)";
  ctx.lineWidth = 10;
  ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

  // title (nastaliq)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 210, 160, 0.95)";
  ctx.font = '70px "Noto Nastaliq Urdu","Noto Naskh Arabic","Tahoma","Arial"';
  ctx.fillText(title, canvas.width / 2, 160);

  // poem lines (nastaliq)
  ctx.fillStyle = "rgba(255, 238, 220, 0.97)";
  ctx.font = '76px "Noto Nastaliq Urdu","Noto Naskh Arabic","Tahoma","Arial"';
  const startY = 420;
  const gap = 150;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], canvas.width / 2, startY + i * gap);
  }

  // author
  ctx.fillStyle = "rgba(255, 210, 160, 0.85)";
  ctx.font = '48px "Noto Nastaliq Urdu","Noto Naskh Arabic","Tahoma","Arial"';
  ctx.fillText(`— ${author} —`, canvas.width / 2, canvas.height - 140);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function addMuralOnWall({ wall = "N", x = 0, z = 0 }, title, lines, author) {
  const tex = makeMuralTexture(lines, author, title);

  // Big mural dimensions in world units
  const muralW = 14;
  const muralH = 6.2;

  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(muralW, muralH),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0.05 })
  );

  // ornate-ish frame (simple but effective)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(muralW + 0.45, muralH + 0.45, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x7a5a2c, roughness: 0.55, metalness: 0.25 })
  );

  const group = new THREE.Group();
  group.add(frame);
  group.add(mural);
  mural.position.z = 0.14;

  // Position on wall
  const y = 4.8; // higher, museum-like
  const inset = 0.38;

  if (wall === "N") {
    group.position.set(x, y, -halfL + inset);
    group.rotation.y = 0;
  } else if (wall === "S") {
    group.position.set(x, y, +halfL - inset);
    group.rotation.y = Math.PI;
  } else if (wall === "W") {
    group.position.set(-halfW + inset, y, z);
    group.rotation.y = Math.PI / 2;
  } else if (wall === "E") {
    group.position.set(+halfW - inset, y, z);
    group.rotation.y = -Math.PI / 2;
  }

  scene.add(group);

  // Wall-wash light for the mural
  const wash = new THREE.SpotLight(0xffd2a4, 1.9, 28, Math.PI / 7, 0.4, 1);
  wash.position.set(group.position.x, y + 2.2, group.position.z);
  wash.target.position.set(group.position.x, y, group.position.z);
  scene.add(wash);
  scene.add(wash.target);
}

// Murals (keep quotes short; classical authors are public domain, but we still keep it concise)
addMuralOnWall(
  { wall: "N", x: 0 },
  "درگاهِ همدلی",
  ["بنی‌آدم اعضای یک پیکرند", "که در آفرینش ز یک گوهرند"],
  "سعدی"
);

addMuralOnWall(
  { wall: "S", x: 0 },
  "آتشِ عشق",
  ["در ازل پرتو حسنت ز تجلّی دم زد", "عشق پیدا شد و آتش به همه عالم زد"],
  "حافظ"
);

addMuralOnWall(
  { wall: "W", z: -10 },
  "بازگشت",
  ["هر کسی کو دور ماند از اصل خویش", "باز جوید روزگار وصل خویش"],
  "مولوی"
);

addMuralOnWall(
  { wall: "E", z: +12 },
  "نیکی",
  ["تو نیکی می‌کن و در دجله انداز"],
  "سعدی"
);

// ---------------------
// Curator NPC (wandering scholar / curator)
// ---------------------
function makeCurator() {
  const g = new THREE.Group();

  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.70, 1.8, 18),
    new THREE.MeshStandardMaterial({ color: 0x2b2b35, roughness: 0.9 })
  );
  robe.position.y = 0.9;

  const sash = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.07, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0x6e4b1f, roughness: 0.7, metalness: 0.15 })
  );
  sash.position.y = 1.0;
  sash.rotation.x = Math.PI / 2;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0xd9b48c, roughness: 0.8 })
  );
  head.position.y = 1.92;

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.30, 0.35, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a2a12, roughness: 0.65, metalness: 0.25 })
  );
  cap.position.y = 2.22;

  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a2a12, roughness: 0.9 })
  );
  staff.position.set(0.45, 1.0, 0.2);
  staff.rotation.z = 0.08;

  g.add(robe, sash, head, cap, staff);

  // subtle personal light (so you can see them)
  const aura = new THREE.PointLight(0xffd2a4, 0.9, 10);
  aura.position.set(0, 2.2, 0);
  g.add(aura);

  return g;
}

const curator = makeCurator();
curator.position.set(6, 0, -12);
scene.add(curator);

// Waypoints for the curator’s slow “patrol”
const waypoints = [
  new THREE.Vector3( 6, 0, -22),
  new THREE.Vector3(-6, 0, -8),
  new THREE.Vector3( 0, 0,  6),
  new THREE.Vector3( 7, 0,  26),
  new THREE.Vector3(-7, 0,  34),
  new THREE.Vector3( 0, 0,  18),
];
let wpIndex = 0;

// ---------------------
// Curated dialogue system (safe, controlled Persian)
// ---------------------
const Dialog = {
  state: "root",
  memory: {
    greeted: false,
    askedIntro: false,
    askedSaadi: false,
    askedHafez: false,
    askedRumi: false,
  }
};

// Polished formal Persian curator voice
const nodes = {
  root: {
    text: () => {
      if (!Dialog.memory.greeted) {
        Dialog.memory.greeted = true;
        return "خوش آمدید. این گالری برای تماشای شعر—نه فقط خواندن آن—ساخته شده است. اگر مایل باشید، شما را در مسیر دیدنِ هر دیوار و معنای کلی آن همراهی می‌کنم.";
      }
      return "در خدمت‌تان هستم. دوست دارید دربارهٔ کدام بخشِ گالری گفت‌وگو کنیم؟";
    },
    choices: [
      { label: "این‌جا کجاست و چه می‌بینم؟", next: "about_gallery" },
      { label: "راهنمایی برای تماشای دیوارها", next: "how_to_view" },
      { label: "دربارهٔ دیوارِ سعدی", next: "saadi" },
      { label: "دربارهٔ دیوارِ حافظ", next: "hafez" },
      { label: "دربارهٔ دیوارِ مولوی", next: "rumi" },
      { label: "فعلاً خداحافظ", next: "bye" },
    ]
  },

  about_gallery: {
    text: () =>
      "این تالار، یک «گذرگاهِ متن» است: شعرها با مقیاسِ دیواری نصب شده‌اند تا بدن و نگاهِ انسان را هم‌زمان درگیر کنند. این‌جا قرار نیست عجله کنید؛ هر دیوار یک مکث می‌خواهد—مثل ایستادن در برابر یک پردهٔ نقاشی.",
    choices: [
      { label: "چطور بهتر نگاه کنم؟", next: "how_to_view" },
      { label: "برگردیم به فهرست گفتگو", next: "root" },
    ]
  },

  how_to_view: {
    text: () =>
      "پیشنهاد می‌کنم نزدیک شوید، چند گام عقب بروید تا قاب را یک‌جا ببینید، سپس آرام نزدیک شوید و فقط یک بیت را با خودتان زمزمه کنید. در شعر، «نَفَس» بخشی از معناست. نورِ چراغ‌ها هم عمداً گرم انتخاب شده تا حال‌وهوای خواندن در شب را تداعی کند.",
    choices: [
      { label: "دربارهٔ سعدی بگو", next: "saadi" },
      { label: "دربارهٔ حافظ بگو", next: "hafez" },
      { label: "دربارهٔ مولوی بگو", next: "rumi" },
      { label: "برگردیم", next: "root" },
    ]
  },

  saadi: {
    text: () =>
      "این دیوار، «اخلاقِ اجتماعی» را نمایندگی می‌کند: نگاهِ سعدی به انسان، پیوندِ اندام‌هاست—هم‌سرنوشتی و مسئولیت. نصبِ این بیت در ورودیِ دیداریِ تالار عمدی است: نخستین پیام گالری، همدلی است.",
    choices: [
      { label: "چرا این بیت این‌قدر مشهور است؟", next: "saadi_why" },
      { label: "برویم سراغ حافظ", next: "hafez" },
      { label: "برگردیم", next: "root" },
    ]
  },

  saadi_why: {
    text: () =>
      "چون کوتاه است و جهان‌شمول. زبانش روشن است، اما معنایش لایه دارد: از دلسوزی فردی تا مسئولیت جمعی. به همین دلیل، در موقعیت‌های گوناگون—از آموزش تا سیاست—به‌عنوان یک یادآوری اخلاقی تکرار می‌شود.",
    choices: [
      { label: "برگردیم به سعدی", next: "saadi" },
      { label: "برگردیم به فهرست", next: "root" },
    ]
  },

  hafez: {
    text: () =>
      "این دیوار، «زایشِ عشق» را نشان می‌دهد: حافظ از لحظه‌ای سخن می‌گوید که زیبایی رخ می‌نماید و آتشِ معنا در جهان می‌افتد. در این‌جا، مقیاسِ بزرگِ نوشته‌ها عمدی است: انگار خودِ کلمات، شعله می‌کشند.",
    choices: [
      { label: "این تعبیر «ازل» یعنی چه؟", next: "hafez_azal" },
      { label: "برویم سراغ مولوی", next: "rumi" },
      { label: "برگردیم", next: "root" },
    ]
  },

  hafez_azal: {
    text: () =>
      "«ازل» در این‌جا، زمانِ روزمره نیست؛ افقی است که در آن آغاز و پایان کم‌رنگ می‌شود. حافظ با این واژه، لحظهٔ کشف را از یک رخدادِ شخصی فراتر می‌برد و آن را به یک حقیقتِ گسترده تبدیل می‌کند.",
    choices: [
      { label: "برگردیم به حافظ", next: "hafez" },
      { label: "برگردیم به فهرست", next: "root" },
    ]
  },

  rumi: {
    text: () =>
      "این دیوار، «غربت و بازگشت» است: مولوی می‌گوید هر که از اصلِ خویش دور بیفتد، در پیِ وصل خواهد رفت. در فضای موزه، این بیت مثل راهنما عمل می‌کند: هر بار گم می‌شوید، به یاد می‌آورید دنبالِ چه می‌گردید.",
    choices: [
      { label: "این «اصل» را چطور بفهمم؟", next: "rumi_origin" },
      { label: "برگردیم", next: "root" },
    ]
  },

  rumi_origin: {
    text: () =>
      "می‌توان آن را چندگونه فهمید: اصلِ انسانی (هویت)، اصلِ اخلاقی (فضیلت)، یا اصلِ معنوی (پیوند با معنا). زیباییِ شعر همین است: یک عبارت، چند آینه دارد—و هر کس تصویرِ خودش را می‌بیند.",
    choices: [
      { label: "برگردیم به مولوی", next: "rumi" },
      { label: "برگردیم به فهرست", next: "root" },
    ]
  },

  bye: {
    text: () =>
      "به سلامت. اگر دوباره خواستید، نزدیک من بیایید تا گفتگو را ادامه دهیم. این تالار برای مکث ساخته شده است، نه برای عبور.",
    choices: [
      { label: "بستن گفتگو", next: null },
      { label: "برگردیم", next: "root" },
    ]
  }
};

function renderDialog(nodeKey) {
  Dialog.state = nodeKey;
  const node = nodes[nodeKey];

  dialogText.textContent = node.text();

  // clear choices
  choicesWrap.innerHTML = "";

  node.choices.forEach((c) => {
    const b = makeButton(c.label);
    b.style.pointerEvents = "auto";
    b.addEventListener("click", () => {
      if (c.next === null) {
        dialogOverlay.style.display = "none";
      } else {
        renderDialog(c.next);
      }
    });
    choicesWrap.appendChild(b);
  });
}

talkBtn.addEventListener("click", () => {
  dialogOverlay.style.display = "block";
  renderDialog("root");
});

// ---------------------
// Input (arrow keys only)
// ---------------------
const keys = {};
document.addEventListener("keydown", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
});
document.addEventListener("keyup", (e) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
  keys[e.key] = false;
});

// ---------------------
// Movement + simple boundary collision
// ---------------------
const moveSpeed = 0.20;
const turnSpeed = 0.032;

function clampInsideGallery(x, z) {
  const minX = -halfW + PLAYER_RADIUS;
  const maxX =  halfW - PLAYER_RADIUS;
  const minZ = -halfL + PLAYER_RADIUS;
  const maxZ =  halfL - PLAYER_RADIUS;

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    z: Math.max(minZ, Math.min(maxZ, z)),
  };
}

function updatePlayer() {
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

    let nx = camera.position.x + forward.x * step;
    let nz = camera.position.z + forward.z * step;

    const c = clampInsideGallery(nx, nz);
    camera.position.x = c.x;
    camera.position.z = c.z;
  }

  playerFill.position.set(camera.position.x, 2.6, camera.position.z);
}

// ---------------------
// Curator wandering
// ---------------------
const curatorSpeed = 0.035;

function updateCurator() {
  const target = waypoints[wpIndex];
  const pos = curator.position;

  const to = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
  const dist = to.length();

  if (dist < 0.6) {
    wpIndex = (wpIndex + 1) % waypoints.length;
    return;
  }

  to.normalize();
  pos.x += to.x * curatorSpeed;
  pos.z += to.z * curatorSpeed;

  // face movement direction
  const desiredYaw = Math.atan2(to.x, to.z);
  curator.rotation.y = desiredYaw;
}

// Show talk button when close
function updateInteractionHint() {
  const dx = camera.position.x - curator.position.x;
  const dz = camera.position.z - curator.position.z;
  const d = Math.hypot(dx, dz);

  const closeEnough = d < 5.5;

  talkBtn.style.display = closeEnough ? "block" : "none";

  setHUD(
    closeEnough
      ? "کلیدهای جهت‌دار ↑↓←→  |  به متصدی نزدیک هستید: «گفتگو با متصدی»"
      : "کلیدهای جهت‌دار ↑↓←→  |  در گالری حرکت کنید و دیوارها را تماشا کنید."
  );
}

// ---------------------
// Resize
// ---------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------
// Animate
// ---------------------
function animate() {
  requestAnimationFrame(animate);

  // lamp flicker
  const t = performance.now() * 0.01;
  for (let i = 0; i < lamps.length; i++) {
    const flicker = 0.20 * Math.sin(t + i * 1.3) + 0.10 * Math.sin(t * 1.9 + i);
    lamps[i].light.intensity = 2.35 + flicker;
    lamps[i].glass.material.emissiveIntensity = 0.52 + flicker * 0.16;
  }

  updatePlayer();
  updateCurator();
  updateInteractionHint();

  renderer.render(scene, camera);
}

animate();
