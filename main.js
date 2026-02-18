import * as THREE from "three";

/* ===============================
   BASIC SETUP
================================= */

const hud = document.getElementById("hud");
const actionBar = document.getElementById("actionBar");

hud.textContent = "در حال بارگذاری گالری…";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 1.7, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ===============================
   LIGHTING
================================= */

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const point = new THREE.PointLight(0xffe0b0, 1.8, 60);
point.position.set(0, 6, 0);
scene.add(point);

/* ===============================
   GALLERY ROOM
================================= */

const width = 30;
const height = 14;
const length = 140;

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(width, length),
  new THREE.MeshStandardMaterial({ color: 0x5b1e1e })
);
floor.rotation.x = -Math.PI / 2;
floor.position.z = -length / 2;
scene.add(floor);

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(width, length),
  new THREE.MeshStandardMaterial({ color: 0x403225 })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(0, height, -length / 2);
scene.add(ceiling);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x3c2f25 });

const leftWall = new THREE.Mesh(
  new THREE.BoxGeometry(1, height, length),
  wallMat
);
leftWall.position.set(-width / 2, height / 2, -length / 2);
scene.add(leftWall);

const rightWall = new THREE.Mesh(
  new THREE.BoxGeometry(1, height, length),
  wallMat
);
rightWall.position.set(width / 2, height / 2, -length / 2);
scene.add(rightWall);

/* ===============================
   POEMS
================================= */

const poems = [
{
title:"حافظ",
lines:[
"دوش دیدم که ملایک در میخانه زدند",
"گل آدم بسرشتند و به پیمانه زدند",
"ساکنان حرم ستر و عفاف ملکوت"
],
explain:"حافظ آفرینش انسان را با تصویر میخانه بیان می‌کند؛ یعنی انسان آمیزه‌ای از خاک و شراب معرفت است."
},
{
title:"مولانا",
lines:[
"این جهان کوه است و فعل ما ندا",
"سوی ما آید نداها را صدا",
"گر بدی دیدی مرو در انتقام"
],
explain:"مولانا می‌گوید هر عملی بازتاب دارد؛ جهان آیینهٔ رفتار ماست."
},
{
title:"سعدی",
lines:[
"بنی آدم اعضای یکدیگرند",
"که در آفرینش ز یک گوهرند",
"چو عضوی به درد آورد روزگار"
],
explain:"سعدی بر همبستگی انسان‌ها تأکید می‌کند؛ درد یکی درد همه است."
},
{
title:"فردوسی",
lines:[
"توانا بود هر که دانا بود",
"ز دانش دل پیر برنا بود",
"بکوشید و دانا شد و دادگر"
],
explain:"فردوسی دانش را سرچشمهٔ توانایی و عدالت می‌داند."
},
{
title:"خیام",
lines:[
"ابر آمد و باز بر سر سبزه گریست",
"بی بادهٔ گلگون نمی‌باید زیست",
"این سبزه که امروز تماشاگه ماست"
],
explain:"خیام گذر عمر و لذتِ لحظهٔ اکنون را یادآور می‌شود."
},
{
title:"نظامی",
lines:[
"جهان چون خط و خال و چشم و ابروست",
"که هر چیزی به جای خویش نیکوست",
"تو نیکوکار باش ای مرد نیک"
],
explain:"نظامی نظم و هماهنگی هستی را توصیف می‌کند."
},
{
title:"عطار",
lines:[
"چون قلم اندر نوشتن می‌شتافت",
"چون به عشق آمد قلم بر خود شکافت",
"عشق دریایی‌ست بی‌پایان"
],
explain:"عطار عشق را فراتر از عقل و زبان می‌داند."
},
{
title:"باباطاهر",
lines:[
"دلم جز مهر مهرویان طریقی بر نمی‌گیرد",
"ز هر در می‌روم آخر به دردی سر نمی‌گیرد",
"به صحرا می‌روم صحرا تهی بیند"
],
explain:"باباطاهر بیانگر سادگی و سوز عاشقانه است."
},
{
title:"سنایی",
lines:[
"جهان زندان و ما زندانیان",
"حفره‌کن زندان و خود را وارهان",
"به نور دل ببین اسرار جان"
],
explain:"سنایی دعوت به رهایی معنوی می‌کند."
},
{
title:"صائب",
lines:[
"از دل برون شو ای غم دنیا",
"کز دل به جز خیال تو جایی نمانده است",
"هر موج دریا آینه‌ای از آسمان است"
],
explain:"صائب تصویرسازی‌های لطیف و عرفانی دارد."
},
{
title:"شهریار",
lines:[
"آمدی جانم به قربانت ولی حالا چرا",
"بی وفا حالا که من افتاده‌ام از پا چرا",
"نوشدارویی و بعد از مرگ سهراب آمدی"
],
explain:"شهریار حسرت و تأخیر در عشق را بیان می‌کند."
},
{
title:"پروین اعتصامی",
lines:[
"گویند خردمند مرو در پی مال",
"زیرا که همه مال رود در زوال",
"آن به که بماند هنر اندر دل تو"
],
explain:"پروین ارزش دانش و اخلاق را بر مال دنیا ترجیح می‌دهد."
}
];

/* ===============================
   CREATE POEM FRAMES
================================= */

const frames = [];

function makeTextTexture(textLines){
  const c=document.createElement("canvas");
  c.width=1024;
  c.height=768;
  const ctx=c.getContext("2d");

  ctx.fillStyle="#111";
  ctx.fillRect(0,0,c.width,c.height);

  ctx.fillStyle="#fff";
  ctx.textAlign="center";
  ctx.font="48px 'Noto Nastaliq Urdu'";
  let y=200;
  for(let line of textLines){
    ctx.fillText(line,c.width/2,y);
    y+=90;
  }

  const tex=new THREE.CanvasTexture(c);
  tex.needsUpdate=true;
  return tex;
}

poems.forEach((poem,i)=>{
  const tex=makeTextTexture(poem.lines);

  const mesh=new THREE.Mesh(
    new THREE.PlaneGeometry(6,4),
    new THREE.MeshBasicMaterial({map:tex})
  );

  const z=-15 - i*10;
  const side=i%2===0? -width/2+1.1 : width/2-1.1;

  mesh.position.set(side,3,z);
  mesh.rotation.y=i%2===0? Math.PI/2 : -Math.PI/2;

  scene.add(mesh);
  frames.push({mesh,poem});
});

/* ===============================
   INTERACTION
================================= */

function clearButtons(){
  actionBar.innerHTML="";
}

function addButton(label,fn){
  const b=document.createElement("button");
  b.className="btn";
  b.textContent=label;

  b.addEventListener("click",fn);
  b.addEventListener("touchend",(e)=>{
    e.preventDefault();
    fn();
  },{passive:false});

  actionBar.appendChild(b);
}

function checkInteraction(){
  clearButtons();

  frames.forEach(f=>{
    const dist=camera.position.distanceTo(f.mesh.position);
    if(dist<4){
      addButton("توضیح شعر",()=>{
        hud.textContent=f.poem.explain;
      });
    }
  });
}

/* ===============================
   MOVEMENT (ARROW KEYS)
================================= */

const keys={};
window.addEventListener("keydown",e=>keys[e.code]=true);
window.addEventListener("keyup",e=>keys[e.code]=false);

function updateMovement(dt){
  const speed=5*dt;

  if(keys["ArrowUp"]) camera.translateZ(-speed);
  if(keys["ArrowDown"]) camera.translateZ(speed);
  if(keys["ArrowLeft"]) camera.rotation.y+=1.8*dt;
  if(keys["ArrowRight"]) camera.rotation.y-=1.8*dt;
}

/* ===============================
   ANIMATION LOOP
================================= */

function animate(){
  requestAnimationFrame(animate);
  const dt=clock.getDelta();
  updateMovement(dt);
  checkInteraction();
  renderer.render(scene,camera);
}

const clock=new THREE.Clock();
animate();
