'use strict';
// =====================================================================
//  유틸
// =====================================================================
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches;
if (IS_TOUCH) document.body.classList.add('touch');

const KU = [[1e68, '무량대수'], [1e64, '불가사의'], [1e60, '나유타'], [1e56, '아승기'], [1e52, '항하사'], [1e48, '극'], [1e44, '재'], [1e40, '정'], [1e36, '간'], [1e32, '구'], [1e28, '양'], [1e24, '자'], [1e20, '해'], [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
function stripZ(s) { return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }
function fmt(n, frac = false) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n, frac);
  if (n >= 1e72) return n.toExponential(2).replace('e+', 'e');
  for (const [v, u] of KU) {
    if (n >= v) {
      const x = n / v;
      const s = x >= 1000 ? Math.floor(x).toLocaleString('ko-KR') : x >= 100 ? x.toFixed(0) : x >= 10 ? stripZ(x.toFixed(1)) : stripZ(x.toFixed(2));
      return s + u;
    }
  }
  if (frac && n < 100) return stripZ(n.toFixed(n < 10 ? 2 : 1));
  return Math.floor(n).toLocaleString('ko-KR');
}
// 시드 난수
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function dateKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? h + '시간 ' + m + '분' : m ? m + '분 ' + s + '초' : s + '초';
}
function fmtTime(s) {
  if (s < 60) return s.toFixed(2) + '초';
  const m = Math.floor(s / 60);
  return m + '분 ' + (s - m * 60).toFixed(1) + '초';
}

// =====================================================================
//  렌더러 / 씬
// =====================================================================
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1500);
const FOG_DAY = new THREE.Color(0xcfe6fb), FOG_NIGHT = new THREE.Color(0x2a2258);
scene.fog = new THREE.Fog(FOG_DAY.clone(), 90, 360);

const hemi = new THREE.HemisphereLight(0xd6ecff, 0x8f7d5c, 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d4, 2.7);
const SUN_OFF = new THREE.Vector3(45, 90, 32);
sun.castShadow = true;
const SM = IS_TOUCH ? 1024 : 2048;
sun.shadow.mapSize.set(SM, SM);
{
  const sc = sun.shadow.camera;
  sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.near = 1; sc.far = 300;
}
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

function fitView() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 74 : 62;
  camera.updateProjectionMatrix();
}
addEventListener('resize', fitView);
fitView();

// ---------- 하늘 ----------
const skyUni = {
  top: { value: new THREE.Color(0x3f9be8) },
  mid: { value: new THREE.Color(0xbfe1fb) },
  bot: { value: new THREE.Color(0xf3f6ff) },
  night: { value: 0 },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1000, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyUni, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float night; varying vec3 vP;
      void main(){
        float h = vP.y;
        vec3 day = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.3, h));
        vec3 n1 = vec3(0.10, 0.07, 0.28), n2 = vec3(0.01, 0.01, 0.06), n3 = vec3(0.16, 0.12, 0.36);
        vec3 nc = h > 0.0 ? mix(n3, n2, smoothstep(0.0, 0.6, h)) : mix(n3, n1, smoothstep(0.0, -0.3, h));
        gl_FragColor = vec4(mix(day, nc, night), 1.0);
        #include <colorspace_fragment>
      }`,
  })
);
sky.renderOrder = -10;
scene.add(sky);

const starField = (() => {
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * TAU, v = Math.acos(rand(-0.2, 1));
    pos[i * 3] = Math.sin(v) * Math.cos(u) * 900;
    pos[i * 3 + 1] = Math.cos(v) * 900;
    pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * 900;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(p);
  return p;
})();

// =====================================================================
//  재질 / 지오메트리 / 메시 헬퍼
// =====================================================================
const matCache = new Map();
function mat(color, o = null) {
  const key = color + (o ? JSON.stringify(o) : '');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.88, metalness: 0, flatShading: true }, o || {}));
    matCache.set(key, m);
  }
  return m;
}
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 28),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 7),
  cone16: new THREE.ConeGeometry(1, 1, 16),
  ico: new THREE.IcosahedronGeometry(1, 0),
  ico1: new THREE.IcosahedronGeometry(1, 1),
  oct: new THREE.OctahedronGeometry(1, 0),
  dodec: new THREE.DodecahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.12, 8, 32),
};
function mesh(geo, material, x, y, z, sx = 1, sy = 1, sz = 1, parent = scene, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = cast;
  m.receiveShadow = recv;
  parent.add(m);
  return m;
}

// =====================================================================
//  충돌체 (AABB 박스 / 수직 원기둥)
// =====================================================================
const colliders = [];
let colSeq = 0;
function addBoxCol(x, y, z, hx, hy, hz, flags) {
  const c = Object.assign({ id: colSeq++, t: 'b', x, y, z, hx, hy, hz, solid: true, dx: 0, dy: 0, dz: 0 }, flags || {});
  c.top = y + hy; c.bot = y - hy; c.ext = Math.max(hx, hz);
  colliders.push(c);
  return c;
}
function addCylCol(x, y, z, r, hy, flags) {
  const c = Object.assign({ id: colSeq++, t: 'c', x, y, z, r, hx: r, hz: r, hy, solid: true, dx: 0, dy: 0, dz: 0 }, flags || {});
  c.top = y + hy; c.bot = y - hy; c.ext = r;
  colliders.push(c);
  return c;
}
function boxPlat(x, top, z, sx, sy, sz, material, flags) {
  const m = mesh(G.box, material, x, top - sy / 2, z, sx, sy, sz);
  const c = addBoxCol(x, top - sy / 2, z, sx / 2, sy / 2, sz / 2, flags);
  c.mesh = m;
  return c;
}
function cylPlat(x, top, z, r, h, material, flags, geo = G.cyl) {
  const m = mesh(geo, material, x, top - h / 2, z, r, h, r);
  const c = addCylCol(x, top - h / 2, z, r, h / 2, flags);
  c.mesh = m;
  return c;
}

// =====================================================================
//  캔버스 라벨 스프라이트
// =====================================================================
const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const labels = [];
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function makeLabel(lines, opt = {}) {
  const cv = document.createElement('canvas');
  cv.width = opt.w || 512; cv.height = opt.h || 256;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
  const sx = opt.sx || 4;
  sp.scale.set(sx, sx * cv.height / cv.width, 1);
  if (opt.pos) sp.position.copy(opt.pos);
  sp.renderOrder = 2;
  scene.add(sp);
  const L = { cv, tex, sp, lines, opt };
  drawLabel(L, lines);
  labels.push(L);
  return L;
}
function drawLabel(L, lines) {
  L.lines = lines;
  const { cv, opt } = L, c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  const items = lines.map((l) => (typeof l === 'string' ? { t: l } : l));
  const sizes = items.map((it, i) => it.s || (i === 0 ? 46 : 38));
  const gap = 10;
  const totalH = sizes.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let maxW = 0;
  items.forEach((it, i) => { c.font = sizes[i] + 'px ' + FONT; maxW = Math.max(maxW, c.measureText(it.t).width); });
  const bw = Math.min(cv.width - 8, maxW + 56), bh = Math.min(cv.height - 8, totalH + 34);
  const bx = (cv.width - bw) / 2, by = (cv.height - bh) / 2;
  if (!opt.noBg) {
    roundRect(c, bx, by, bw, bh, 26);
    c.fillStyle = opt.bg || 'rgba(16,22,44,0.82)';
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = opt.accent || 'rgba(255,255,255,0.35)';
    c.stroke();
  }
  let y = (cv.height - totalH) / 2;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  items.forEach((it, i) => {
    c.font = sizes[i] + 'px ' + FONT;
    if (opt.noBg) { c.lineWidth = 8; c.strokeStyle = 'rgba(16,22,44,0.7)'; c.strokeText(it.t, cv.width / 2, y + sizes[i] / 2 + 2); }
    c.fillStyle = it.c || '#ffffff';
    c.fillText(it.t, cv.width / 2, y + sizes[i] / 2 + 2);
    y += sizes[i] + gap;
  });
  L.tex.needsUpdate = true;
}

// =====================================================================
//  파티클 (인스턴스 메시)
// =====================================================================
const PMAX = 360;
const pMesh = new THREE.InstancedMesh(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), PMAX);
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
pMesh.frustumCulled = false;
scene.add(pMesh);
const parts = [];
const _dummy = new THREE.Object3D();
const _col = new THREE.Color();
for (let i = 0; i < PMAX; i++) {
  parts.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.2, g: 1, rot: 0 });
  _dummy.scale.setScalar(0); _dummy.updateMatrix();
  pMesh.setMatrixAt(i, _dummy.matrix);
  pMesh.setColorAt(i, _col.set(0xffffff));
}
let pIdx = 0;
function burst(x, y, z, color, n = 12, speed = 5, size = 0.18, up = 3, grav = 1, life = 0.9) {
  for (let i = 0; i < n; i++) {
    const p = parts[pIdx];
    const a = Math.random() * TAU, b = Math.random() * Math.PI - Math.PI / 2;
    const sp = speed * rand(0.4, 1);
    p.x = x; p.y = y; p.z = z;
    p.vx = Math.cos(a) * Math.cos(b) * sp; p.vz = Math.sin(a) * Math.cos(b) * sp; p.vy = Math.sin(b) * sp * 0.5 + up * rand(0.5, 1.2);
    p.s = size * rand(0.6, 1.3); p.life = p.max = life * rand(0.7, 1.2); p.g = grav; p.rot = Math.random() * 6;
    pMesh.setColorAt(pIdx, _col.set(Array.isArray(color) ? color[i % color.length] : color));
    pIdx = (pIdx + 1) % PMAX;
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    const p = parts[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    p.vy -= 18 * p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.vx *= 0.985; p.vz *= 0.985;
    const k = Math.max(0, p.life / p.max);
    _dummy.position.set(p.x, p.y, p.z);
    _dummy.rotation.set(p.rot + p.life * 4, p.rot + p.life * 3, 0);
    _dummy.scale.setScalar(p.life > 0 ? p.s * (0.3 + 0.7 * k) : 0);
    _dummy.updateMatrix();
    pMesh.setMatrixAt(i, _dummy.matrix);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}

// =====================================================================
//  사운드 (WebAudio 합성)
// =====================================================================
let actx = null, muted = false;
function ensureAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume().catch(() => {});
  } catch (e) { actx = null; }
}
function tone(freq, dur = 0.1, type = 'sine', vol = 0.12, slide = 0, delay = 0) {
  if (muted || !actx || actx.state !== 'running') return;
  try {
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* 무시 */ }
}
const SFX = {
  click: () => tone(720 + Math.random() * 120, 0.07, 'triangle', 0.07, 260),
  buy: () => { tone(523, 0.08, 'square', 0.05); tone(784, 0.14, 'square', 0.05, 0, 0.07); },
  jump: () => tone(330, 0.12, 'sine', 0.07, 260),
  djump: () => tone(480, 0.14, 'triangle', 0.07, 380),
  land: () => tone(140, 0.06, 'sine', 0.05, -60),
  star: () => { [880, 1108, 1318, 1760].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, 0, i * 0.06)); },
  cp: () => { tone(660, 0.1, 'triangle', 0.08); tone(990, 0.18, 'triangle', 0.08, 0, 0.09); },
  finish: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.05, 0, i * 0.09)); },
  die: () => tone(400, 0.35, 'sawtooth', 0.05, -300),
  bounce: () => tone(220, 0.25, 'sine', 0.09, 700),
  bonk: () => tone(160, 0.12, 'square', 0.06, -80),
  err: () => tone(150, 0.16, 'square', 0.05, -30),
  launch: () => { tone(120, 0.9, 'sawtooth', 0.05, 900); tone(240, 0.9, 'triangle', 0.05, 1200); },
  quest: () => { [784, 988, 1175].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, 0, i * 0.08)); },
};

// =====================================================================
//  화면 텍스트 (떠오르는 숫자, 토스트, 배너)
// =====================================================================
const _v3 = new THREE.Vector3();
function worldToScreen(x, y, z) {
  _v3.set(x, y, z).project(camera);
  if (_v3.z > 1) return null;
  return [(_v3.x + 1) / 2 * innerWidth, (1 - _v3.y) / 2 * innerHeight];
}
function floatText(sx, sy, text, cls = '') {
  const box = $('floaters');
  if (box.childElementCount > 28) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'floater ' + cls;
  el.textContent = text;
  el.style.left = sx + 'px';
  el.style.top = sy + 'px';
  box.appendChild(el);
  const dx = rand(-30, 30);
  const an = el.animate([
    { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.3}px),-90%) scale(1.15)`, opacity: 1, offset: 0.18 },
    { transform: `translate(calc(-50% + ${dx}px),-300%) scale(1)`, opacity: 0 },
  ], { duration: 950, easing: 'cubic-bezier(.2,.7,.3,1)' });
  an.onfinish = () => el.remove();
}
function toast(text, cls = '', ms = 2600) {
  const box = $('toasts');
  while (box.childElementCount > 3) box.lastElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.textContent = text;
  box.prepend(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
}
let bannerTimer = 0;
function banner(top, mid, bottom = '', ms = 2600) {
  $('zb1').textContent = top; $('zb2').textContent = mid; $('zb3').textContent = bottom;
  $('zoneBanner').classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => $('zoneBanner').classList.remove('show'), ms);
}
