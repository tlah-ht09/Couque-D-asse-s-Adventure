'use strict';
// ---------- 섬 장식 ----------
function decorate(zid, x, top, z, r) {
  const ring = (n, r0, r1, fn) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.2, 0.2), rr = rand(r0, r1);
      fn(x + Math.cos(a) * rr, z + Math.sin(a) * rr, a);
    }
  };
  if (zid === 1) {
    ring(6, r * 0.55, r * 0.85, (px, pz) => tree(px, top, pz, rand(0.85, 1.2), [0x4fbf5a, 0x63cf6a, 0x3fae55][Math.floor(Math.random() * 3)]));
    for (let i = 0; i < 26; i++) flowerSpots.push([x + rand(-r, r) * 0.8, top, z + rand(-r, r) * 0.8]);
  } else if (zid === 2) {
    ring(5, r * 0.5, r * 0.85, (px, pz) => rock(px, top, pz, rand(0.7, 1.5), 0x2a2024));
    const vx = x + rand(-3, 3), vz = z + rand(-3, 3);
    const v = mesh(G.cone16, mat(0x3a2d31), vx, top + 1.6, vz, 3, 3.2, 3);
    v.rotation.y = 0.3;
    mesh(G.cyl, M.lava, vx, top + 3.05, vz, 1.1, 0.2, 1.1, scene, false, false);
    addCylCol(vx, top + 1.2, vz, 2.4, 1.2, { zone: zid });
    spinners.push({ kind: 'smoke', x: vx, y: top + 3.3, z: vz });
  } else if (zid === 3) {
    ring(6, r * 0.5, r * 0.85, (px, pz) => tree(px, top, pz, rand(0.9, 1.25), 0x2e8b6a, 'pine'));
    ring(5, r * 0.3, r * 0.7, (px, pz) => {
      const m = mesh(G.oct, M.ice, px, top + 0.9, pz, 0.5, 1.4, 0.5);
      m.rotation.y = Math.random() * 3;
    });
  } else if (zid === 4) {
    ring(7, r * 0.6, r * 0.95, (px, pz) => {
      const g = new THREE.Group(); g.position.set(px, top + 0.6, pz); scene.add(g);
      for (let i = 0; i < 3; i++) mesh(G.ico1, M.cloud, rand(-0.8, 0.8), rand(0, 0.4), rand(-0.8, 0.8), rand(0.7, 1.1), rand(0.5, 0.8), rand(0.7, 1.1), g, false, false);
    });
  } else if (zid === 5) {
    ring(7, r * 0.5, r * 0.9, (px, pz) => {
      const col = [0x7c6cf0, 0x22d3c5, 0xfd79a8][Math.floor(Math.random() * 3)];
      for (let i = 0; i < 3; i++) {
        const m = mesh(G.oct, mat(col, { emissive: col, emissiveIntensity: 0.7 }), px + rand(-0.6, 0.6), top + 0.8, pz + rand(-0.6, 0.6), 0.35, rand(0.9, 1.6), 0.35);
        m.rotation.set(rand(-0.3, 0.3), Math.random() * 3, rand(-0.3, 0.3));
      }
    });
  }
}

// ---------- 다리 ----------
const bridges = {};
function buildBridge(z) {
  const [fx, fz] = z.dir, lx = -fz, lz = fx;
  const r0 = HUB_R - 1.5, r1 = ENTRY_D - ENTRY_R + 1.5, len = r1 - r0;
  const alongX = fx !== 0;
  const g = new THREE.Group();
  g.position.set(fx * r0, 0, fz * r0);
  scene.add(g);
  const W = 4.4;
  mesh(G.box, M.wood, fx * len / 2, -0.3, fz * len / 2, alongX ? len : W, 0.6, alongX ? W : len, g);
  for (let s = 0.6; s < len; s += 1.5) mesh(G.box, M.woodDark, fx * s, 0.005, fz * s, alongX ? 0.12 : W - 0.2, 0.02, alongX ? W - 0.2 : 0.12, g, false, true);
  for (let s = 0.5; s <= len + 0.01; s += len / 6) {
    for (const sd of [-1, 1]) mesh(G.box, M.woodDark, fx * s + lx * sd * 2.05, 0.6, fz * s + lz * sd * 2.05, 0.26, 1.2, 0.26, g);
  }
  for (const sd of [-1, 1]) mesh(G.box, M.wood, fx * len / 2 + lx * sd * 2.05, 1.12, fz * len / 2 + lz * sd * 2.05, alongX ? len : 0.16, 0.14, alongX ? 0.16 : len, g);
  const cxw = fx * (r0 + len / 2), czw = fz * (r0 + len / 2);
  const deck = addBoxCol(cxw, -0.3, czw, alongX ? len / 2 : W / 2, 0.3, alongX ? W / 2 : len / 2, { bridge: z.id });
  const rails = [-1, 1].map((sd) => addBoxCol(cxw + lx * sd * 2.05, 0.6, czw + lz * sd * 2.05, alongX ? len / 2 : 0.12, 0.6, alongX ? 0.12 : len / 2, { bridge: z.id }));
  const ghost = mesh(G.box, ghostMat(0xffffff), cxw, -0.3, czw, alongX ? len : W, 0.6, alongX ? W : len, scene, false, false);
  // 구매 발판
  const pr = HUB_R - 5;
  const padMat = new THREE.MeshStandardMaterial({ color: 0x5c6788, flatShading: true, emissive: 0x000000 });
  const pad = cylPlat(fx * pr, 0.18, fz * pr, 1.35, 0.3, padMat, { bridgePad: z.id });
  const padLabel = makeLabel(['', ''], { sx: 3.8, pos: new THREE.Vector3(fx * pr, 2.9, fz * pr) });
  const sign = makeLabel([{ t: z.name, c: z.css }], { w: 384, h: 128, sx: 3.6, pos: new THREE.Vector3(fx * (r0 + 0.5) + lx * 3.4, 2.6, fz * (r0 + 0.5) + lz * 3.4) });
  bridges[z.id] = { g, deck, rails, ghost, pad, padMat, padLabel, sign, alongX, anim: 1 };
}

// ---------- 발사대 ----------
let launchPad = null;
function buildLaunchPad() {
  const p = LAUNCH_POS;
  const padMat = new THREE.MeshStandardMaterial({ color: 0x5c6788, flatShading: true, emissive: 0x000000 });
  const c = cylPlat(p.x, 0.3, p.z, 2, 0.45, padMat, { launchPad: true });
  const ring1 = mesh(G.torus, M.gold, p.x, 0.32, p.z, 2.05, 2.05, 2.05, scene, false, true);
  ring1.rotation.x = Math.PI / 2;
  const arrows = new THREE.Group();
  arrows.position.set(p.x, 0.3, p.z);
  scene.add(arrows);
  for (let i = 0; i < 3; i++) {
    const a = mesh(G.cone, mat(0xffd166, { emissive: 0xffa800, emissiveIntensity: 0.8 }), 0, 1 + i * 1.1, 0, 0.6, 0.8, 0.6, arrows, false, false);
    a.userData.base = 1 + i * 1.1;
  }
  const label = makeLabel(['', ''], { sx: 4, pos: new THREE.Vector3(p.x, 5.6, p.z) });
  launchPad = { c, padMat, arrows, label };
}

// ---------- 드로퍼 ----------
const droppers = [];
const beltTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 16;
  const c = cv.getContext('2d');
  c.fillStyle = '#6b3f22'; c.fillRect(0, 0, 64, 16);
  c.fillStyle = '#fff1d6'; c.fillRect(0, 0, 12, 16);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 1); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const beltMat = new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9, flatShading: true });
// 쿠크다스 겉면: 노릇한 바탕에 바삭한 결(빗금)과 구운 자국
const couqueTex = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, '#f2c374'); gr.addColorStop(1, '#e0a24f');
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = 'rgba(160, 95, 30, 0.45)'; c.lineWidth = 3;
  for (let k = -128; k < 256; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 128, 128); c.stroke(); }
  c.strokeStyle = 'rgba(255, 236, 190, 0.5)'; c.lineWidth = 1.5;
  for (let k = -128; k < 256; k += 16) { c.beginPath(); c.moveTo(k + 5, 0); c.lineTo(k + 133, 128); c.stroke(); }
  for (let k = 0; k < 40; k++) { c.fillStyle = 'rgba(150, 80, 25, ' + (0.15 + Math.random() * 0.25) + ')'; c.beginPath(); c.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2.5, 0, TAU); c.fill(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const couqueMat = new THREE.MeshStandardMaterial({ map: couqueTex, roughness: 0.75, flatShading: true });
const creamMat = mat(0xfff4dc, { roughness: 0.5 });
const waferMat = mat(0xd99a4e, { roughness: 0.8 });
// 작은 쿠크다스 (과자 두 장 사이에 크림)
function miniCouque(parent, cream, y, s = 1) {
  const g = new THREE.Group();
  g.position.y = y;
  parent.add(g);
  mesh(G.box, couqueMat, 0, 0.11 * s, 0, 1.0 * s, 0.12 * s, 0.6 * s, g, true, false);
  mesh(G.box, cream, 0, 0, 0, 0.92 * s, 0.1 * s, 0.52 * s, g, false, false);
  mesh(G.box, couqueMat, 0, -0.11 * s, 0, 1.0 * s, 0.12 * s, 0.6 * s, g, true, false);
  return g;
}
function buildDropper(i) {
  const gd = GENS[i];
  const a = (202.5 + 45 * i) * Math.PI / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const R = 11.8, mx = ca * R, mz = sa * R;
  const real = new THREE.Group();
  real.position.set(mx, 0, mz);
  real.rotation.y = -a;
  scene.add(real);
  // 쿠크다스 드로퍼: 과자 결이 보이는 세 겹 과자 사이에 크림, 가운데에 등급 색 띠
  const tier = mat(gd.color, { metalness: 0.25, roughness: 0.45, emissive: gd.color, emissiveIntensity: 0.15 });
  for (const [ox, oz] of [[0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7]]) mesh(G.cyl8, waferMat, ox, 1.0, oz, 0.13, 2.0, 0.13, real); // 웨이퍼 롤 다리
  mesh(G.box, couqueMat, 0, 2.15, 0, 2.0, 0.4, 2.0, real);
  mesh(G.box, creamMat, 0, 2.425, 0, 1.86, 0.15, 1.86, real);
  mesh(G.box, couqueMat, 0, 2.7, 0, 2.0, 0.4, 2.0, real);
  mesh(G.box, creamMat, 0, 2.975, 0, 1.86, 0.15, 1.86, real);
  mesh(G.box, couqueMat, 0, 3.25, 0, 2.0, 0.4, 2.0, real);
  mesh(G.box, tier, 0, 2.7, 0, 2.06, 0.18, 2.06, real, false, false);
  const fun = mesh(G.cone16, waferMat, 0, 1.55, 0, 0.6, 0.75, 0.6, real);
  fun.rotation.x = Math.PI;
  const gem = miniCouque(real, mat(gd.color, { emissive: gd.color, emissiveIntensity: 0.5 }), 4.1, 1.1);
  gem.rotation.z = 0.25;
  const len = R - 3.5;
  mesh(G.box, beltMat, -len / 2 + 0.4, 0.15, 0, len, 0.3, 1.1, real, false, true);
  for (const sd of [-1, 1]) mesh(G.box, waferMat, -len / 2 + 0.4, 0.22, sd * 0.62, len, 0.3, 0.14, real, false, true);
  const ghost = new THREE.Group();
  ghost.position.copy(real.position);
  ghost.rotation.y = real.rotation.y;
  scene.add(ghost);
  const gm = ghostMat(gd.color, 0.16);
  mesh(G.box, gm, 0, 2.7, 0, 2.0, 1.5, 2.0, ghost, false, false);
  const col = addCylCol(mx, 1.95, mz, 1.15, 1.95, { solid: false });
  const pr = 15.6;
  const padMat = new THREE.MeshStandardMaterial({ color: 0x5c6788, flatShading: true, emissive: 0x000000 });
  const pad = cylPlat(ca * pr, 0.18, sa * pr, 1.35, 0.3, padMat, { pad: i });
  const pring = mesh(G.torus, mat(gd.color), ca * pr, 0.2, sa * pr, 1.42, 1.42, 1.42, scene, false, true);
  pring.rotation.x = Math.PI / 2;
  const label = makeLabel(['', ''], { sx: 3.7, pos: new THREE.Vector3(ca * pr, 3.0, sa * pr), accent: gd.css });
  droppers.push({ i, a, ca, sa, mx, mz, real, ghost, gem, col, pad, padMat, label, ring: pring, timer: rand(0, 1), anim: 1, lastKey: '' });
}

// 드로퍼 큐브 (인스턴스)
const CUBE_MAX = 180;
// 드로퍼에서 나오는 건 작은 쿠크다스 조각 (등급 색이 살짝 섞여요)
const cubeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.45, 0.8), new THREE.MeshStandardMaterial({ map: couqueTex, roughness: 0.7, flatShading: true, emissive: 0x3a2008, emissiveIntensity: 0.4 }), CUBE_MAX);
cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
cubeMesh.frustumCulled = false;
cubeMesh.castShadow = true;
scene.add(cubeMesh);
const cubes = [];
for (let i = 0; i < CUBE_MAX; i++) {
  cubes.push({ on: false });
  _dummy.position.set(0, -999, 0); _dummy.scale.setScalar(0); _dummy.updateMatrix();
  cubeMesh.setMatrixAt(i, _dummy.matrix);
  cubeMesh.setColorAt(i, _col.set(0xffffff));
}

// ---------- 크리스탈 ----------
const crystal = new THREE.Group();
crystal.position.set(0, 3.9, 0);
scene.add(crystal);
const crystalMat = new THREE.MeshStandardMaterial({ color: 0x8ff0ff, emissive: 0x19a8e6, emissiveIntensity: 0.75, roughness: 0.15, metalness: 0.2, flatShading: true, transparent: true, opacity: 0.92 });
const crystalCore = mesh(G.oct, crystalMat, 0, 0, 0, 1.5, 2.3, 1.5, crystal, true, false);
const crystalRing = mesh(G.torus, M.gold, 0, -0.2, 0, 2.3, 2.3, 2.3, crystal, false, false);
crystalRing.rotation.x = Math.PI / 2 - 0.25;
const crystalHit = new THREE.Mesh(new THREE.SphereGeometry(2.8, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
crystal.add(crystalHit);
const crystalGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(200,250,255,0.85)', 'rgba(60,190,255,0.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
crystalGlow.scale.set(8, 8, 1);
crystal.add(crystalGlow);
const crystalLight = new THREE.PointLight(0x7fe3ff, 18, 16, 1.6);
crystalLight.position.set(0, 3.9, 0);
scene.add(crystalLight);
let crystalPulse = 0;

// ---------- 구름 ----------
const clouds = [];
// 같은 도형 여러 개(위치·크기만 다름)를 지오메트리 하나로 합쳐요
function mergedBlobs(base, parts) {
  const src = base.index ? base.toNonIndexed() : base;
  const bp = src.attributes.position.array, bn = src.attributes.normal.array, n = bp.length;
  const pos = new Float32Array(n * parts.length), nor = new Float32Array(n * parts.length);
  parts.forEach(([x, y, z, sx, sy, sz], k) => {
    for (let i = 0; i < n; i += 3) {
      pos[k * n + i] = bp[i] * sx + x; pos[k * n + i + 1] = bp[i + 1] * sy + y; pos[k * n + i + 2] = bp[i + 2] * sz + z;
      const nx = bn[i] / sx, ny = bn[i + 1] / sy, nz = bn[i + 2] / sz, l = Math.hypot(nx, ny, nz) || 1;
      nor[k * n + i] = nx / l; nor[k * n + i + 1] = ny / l; nor[k * n + i + 2] = nz / l;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.computeBoundingSphere();
  return g;
}
function makeCloud(x, y, z, s) {
  const g = new THREE.Group();
  // 공 5개를 메시 하나로 합쳐서 그리기 횟수를 1/5로 줄여요
  const parts = [];
  for (let i = 0; i < 5; i++) parts.push([rand(-1.8, 1.8) * s, rand(-0.3, 0.4) * s, rand(-0.9, 0.9) * s, rand(1, 1.7) * s, rand(0.7, 1.1) * s, rand(1, 1.5) * s]);
  mesh(mergedBlobs(G.ico1, parts), M.cloud, 0, 0, 0, 1, 1, 1, g, false, false);
  g.position.set(x, y, z);
  g.userData.v = rand(0.3, 0.9);
  scene.add(g);
  clouds.push(g);
}
