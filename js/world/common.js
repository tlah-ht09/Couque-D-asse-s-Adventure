'use strict';
// =====================================================================
//  월드 구성
// =====================================================================
const HUB_R = 28, ENTRY_D = 64, ENTRY_R = 13;
const SKY_POS = new THREE.Vector3(95, 90, -95), SKY_R = 14;
const LAUNCH_POS = new THREE.Vector3(15.6, 0, -15.6);
const SPAWN = { x: 0, y: 0, z: 9, yaw: 0.3 };
const SKY_SPAWN = { x: SKY_POS.x, y: SKY_POS.y, z: SKY_POS.z + 3, yaw: 0 };

const THEMES = {
  0: { grass: 0x86d26f, dirt: 0xa0703f, dirt2: 0x7a5232 },
  1: { grass: 0x8ee07a, dirt: 0xa0703f, dirt2: 0x7a5232, plats: [0xffd166, 0x6ec8ff, 0xff8fab, 0xb8f28b] },
  2: { grass: 0x4a3b40, dirt: 0x3a2d31, dirt2: 0x2a2024, plats: [0x6b5560, 0x5b4a52, 0x7a5f57] },
  3: { grass: 0xf2f8ff, dirt: 0x9fb8d6, dirt2: 0x7d97b8, plats: [0xe8f4ff, 0xd3e6fb] },
  4: { grass: 0xe6dcff, dirt: 0xb7a6e6, dirt2: 0x9a86d6, plats: [0xc7b8ff, 0xffc2e2, 0xa8e6ff, 0xfff0a8] },
  5: { grass: 0x3a3366, dirt: 0x29234d, dirt2: 0x1d1838, plats: [0x7c6cf0, 0x22d3c5, 0xfd79a8, 0xffe08a], emissive: true },
};

const movers = [], fades = [], sweepers = [], stars = [], spinners = [], portals = [];
const courses = {};
const islands = [];
const flowerSpots = [];

function island(x, top, z, r, th, flags) {
  const g = new THREE.Group();
  g.position.set(x, top, z);
  scene.add(g);
  mesh(G.cyl, mat(th.grass), 0, -0.6, 0, r, 1.2, r, g);
  mesh(G.cyl, mat(th.dirt), 0, -2.0, 0, r * 0.97, 1.6, r * 0.97, g, true, false);
  const cone = mesh(G.cone16, mat(th.dirt2), 0, -2.8 - r * 0.45, 0, r * 0.93, r * 0.9, r * 0.93, g, true, false);
  cone.rotation.x = Math.PI;
  for (let i = 0; i < Math.round(r / 3); i++) {
    const a = Math.random() * TAU, rr = r * rand(0.3, 0.8);
    const rock = mesh(G.dodec, mat(th.dirt2), Math.cos(a) * rr, -3 - r * rand(0.2, 0.6), Math.sin(a) * rr, rand(0.8, 2), rand(1, 2.5), rand(0.8, 2), g, false, false);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
  }
  const c = addCylCol(x, top - 1.5, z, r, 1.5, Object.assign({ island: true }, flags || {}));
  islands.push({ x, z, y: top, r, color: th.grass });
  return c;
}

function tree(x, top, z, s = 1, leaf = 0x4fbf5a, kind = 'round') {
  mesh(G.cyl8, mat(0x8b5a2b), x, top + 0.9 * s, z, 0.28 * s, 1.8 * s, 0.28 * s);
  if (kind === 'pine') {
    mesh(G.cone, mat(leaf), x, top + 2.3 * s, z, 1.35 * s, 1.9 * s, 1.35 * s);
    mesh(G.cone, mat(leaf), x, top + 3.4 * s, z, 1.0 * s, 1.6 * s, 1.0 * s);
    mesh(G.cone, mat(0xffffff), x, top + 4.15 * s, z, 0.45 * s, 0.6 * s, 0.45 * s);
  } else {
    const b = mesh(G.ico, mat(leaf), x, top + 2.6 * s, z, 1.45 * s, 1.3 * s, 1.45 * s);
    b.rotation.y = Math.random() * 3;
    mesh(G.ico, mat(leaf), x + 0.6 * s, top + 3.3 * s, z - 0.3 * s, 0.8 * s, 0.8 * s, 0.8 * s);
  }
  addCylCol(x, top + 1.5 * s, z, 0.35 * s, 1.5 * s);
}
function rock(x, top, z, s, color) {
  const m = mesh(G.dodec, mat(color), x, top + s * 0.35, z, s, s * 0.7, s * 0.9);
  m.rotation.y = Math.random() * 3;
  if (s > 0.7) addCylCol(x, top + s * 0.35, z, s * 0.8, s * 0.35 + 0.01);
}

// ---------- 공용 재질 ----------
const M = {
  cp: mat(0x3ee6a5),
  start: mat(0xf7f7ff),
  finish: mat(0xffcf3f, { metalness: 0.25, roughness: 0.5 }),
  bounce: mat(0xff4d9d),
  bounceTop: mat(0xffb3d6, { emissive: 0xff4d9d, emissiveIntensity: 0.35 }),
  ice: mat(0xaee6ff, { roughness: 0.15, metalness: 0.15, emissive: 0x3a86c8, emissiveIntensity: 0.12 }),
  lava: mat(0xff6a1f, { emissive: 0xff4a10, emissiveIntensity: 1.1, roughness: 1 }),
  sweep: mat(0xff4d6d, { emissive: 0x7a0a1a, emissiveIntensity: 0.3 }),
  post: mat(0xf2f2f7),
  pole: mat(0xeeeeee),
  wood: mat(0xb07a45),
  woodDark: mat(0x7d5430),
  stone: mat(0xe9dcbc),
  pedestal: mat(0xd9d2e9),
  gold: mat(0xffcf3f, { metalness: 0.45, roughness: 0.35, emissive: 0x6b4a00, emissiveIntensity: 0.25 }),
  portal: mat(0x7af0ff, { emissive: 0x2fc6ff, emissiveIntensity: 0.9 }),
  padOk: mat(0x3ee6a5, { emissive: 0x0f7a52, emissiveIntensity: 0.45 }),
  padNo: mat(0x5c6788),
  padLock: mat(0x3b4260),
  cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 1, flatShading: true }),
};
function ghostMat(color, op = 0.22) { return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }); }

function themeMat(zid, idx) {
  const th = THEMES[zid];
  const c = th.plats[idx % th.plats.length];
  return th.emissive ? mat(c, { emissive: c, emissiveIntensity: 0.25 }) : mat(c);
}

// ---------- 별 조각 ----------
const starGeo = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1, a = (i / 10) * TAU + Math.PI / 2;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 1 });
  g.center();
  return g;
})();
const starMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffa800, emissiveIntensity: 0.75, roughness: 0.35, metalness: 0.3, flatShading: true });
function glowTex(inner, outer) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const starGlowMat = new THREE.SpriteMaterial({ map: glowTex('rgba(255,240,170,0.9)', 'rgba(255,200,60,0.35)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
function addStar(x, y, z, zone) {
  const id = (zone === 0 ? 'h' : 'z' + zone + '-') + stars.filter((s) => s.zone === zone).length;
  const m = mesh(starGeo, starMat, x, y, z, 0.55, 0.55, 0.55, scene, true, false);
  const gl = new THREE.Sprite(starGlowMat);
  gl.scale.set(2.6, 2.6, 1);
  gl.position.set(x, y, z);
  scene.add(gl);
  stars.push({ id, x, y, z, zone, mesh: m, glow: gl, taken: false, ph: Math.random() * 6 });
}

// ---------- 플랫폼 ----------
function makePlatform(zid, kind, x, top, z, o) {
  const h = o.h || (kind === 'finish' ? 2 : 0.8);
  let material;
  const flags = { zone: zid };
  switch (kind) {
    case 'start': material = M.start; flags.start = zid; break;
    case 'cp': material = M.cp; flags.cp = true; break;
    case 'finish': material = M.finish; flags.finish = zid; break;
    case 'ice': material = M.ice; flags.ice = true; break;
    case 'bounce': material = M.bounce; flags.bounce = o.v || 20; break;
    case 'fade': material = new THREE.MeshStandardMaterial({ color: 0xffa94d, emissive: 0xff7a00, emissiveIntensity: 0.15, roughness: 0.7, flatShading: true, transparent: true, opacity: 0.95 }); material.userData.own = true; break;
    default: material = themeMat(zid, o.idx || 0);
  }
  const c = o.round ? cylPlat(x, top, z, o.r, h, material, flags) : boxPlat(x, top, z, o.sx, h, o.sz, material, flags);
  if (kind === 'fade') { c.fade = { st: 0, t: 0 }; fades.push(c); }
  if (kind === 'bounce') {
    const tp = o.round ? mesh(G.cyl, M.bounceTop, x, top + 0.08, z, o.r * 0.75, 0.16, o.r * 0.75) : mesh(G.box, M.bounceTop, x, top + 0.08, z, o.sx * 0.7, 0.16, o.sz * 0.7);
    tp.castShadow = false;
    c.deco = [tp];
  }
  if (kind === 'cp') {
    const px = x + (o.round ? o.r * 0.6 : o.sx / 2 - 0.4), pz = z + (o.round ? 0 : o.sz / 2 - 0.4);
    mesh(G.cyl8, M.pole, px, top + 1.4, pz, 0.08, 2.8, 0.08);
    const fm = new THREE.MeshStandardMaterial({ color: 0x8892b0, flatShading: true, side: THREE.DoubleSide, emissive: 0x000000 });
    fm.userData.own = true;
    const flag = mesh(G.box, fm, px + 0.55, top + 2.45, pz, 1.1, 0.7, 0.06);
    c.flag = flag;
  }
  if (kind === 'sweep') {
    const len = o.r - 0.25;
    const post = addCylCol(x, top + 0.8, z, 0.45, 0.8, { zone: zid });
    post.mesh = mesh(G.cyl, M.post, x, top + 0.8, z, 0.45, 1.6, 0.45);
    const g = new THREE.Group();
    g.position.set(x, top + 0.6, z);
    scene.add(g);
    mesh(G.box, M.sweep, 0, 0, 0, len * 2, 0.55, 0.42, g);
    mesh(G.cyl, M.post, 0, 0.35, 0, 0.6, 0.3, 0.6, g);
    sweepers.push({ x, z, y0: top + 0.28, y1: top + 0.92, len, ang: Math.random() * TAU, spd: o.spd || 1.8, g });
  }
  if (o.move) {
    const mv = o.move;
    c.move = { ax: mv.ax, ay: mv.ay, az: mv.az, amp: mv.amp, spd: mv.spd, ph: mv.ph || 0, ox: c.x, oy: c.y, oz: c.z };
    movers.push(c);
  }
  return c;
}

function decorateFinish(zid, c, fx, fz, lx, lz) {
  const cx = c.x, cz = c.z, top = c.top;
  const hs = Math.min(c.hx, c.hz);
  // 트로피
  const tx = cx + fx * (hs - 2.2), tz = cz + fz * (hs - 2.2);
  mesh(G.cyl, M.gold, tx, top + 0.25, tz, 0.9, 0.5, 0.9);
  mesh(G.cyl8, M.gold, tx, top + 0.9, tz, 0.22, 0.9, 0.22);
  const cup = mesh(G.cone16, M.gold, tx, top + 2.0, tz, 0.95, 1.4, 0.95);
  cup.rotation.x = Math.PI;
  const h1 = mesh(G.torus, M.gold, tx + lx * 0.95, top + 2.1, tz + lz * 0.95, 0.4, 0.4, 0.4);
  const h2 = mesh(G.torus, M.gold, tx - lx * 0.95, top + 2.1, tz - lz * 0.95, 0.4, 0.4, 0.4);
  h1.rotation.y = h2.rotation.y = Math.atan2(lx, lz) + Math.PI / 2;
  addCylCol(tx, top + 1.3, tz, 0.95, 1.3, { zone: zid });
  const lab = makeLabel([{ t: zoneById(zid).course + ' 완주 지점', c: '#ffcf3f' }, '최고 기록 없음'], { sx: 4.2, pos: new THREE.Vector3(tx, top + 4.2, tz), accent: 'rgba(255,207,63,.7)' });
  courses[zid].trophyLabel = lab;
  // 귀환 포털
  const px = cx + lx * (hs - 2), pz = cz + lz * (hs - 2);
  addPortal(px, top, pz, zid, Math.atan2(fx, fz));
  // 별 탑 (계단 블록)
  for (let k = 0; k < 3; k++) {
    const bx = cx - lx * (hs - 1.4) + fx * (k * 1.6 - 1.6), bz = cz - lz * (hs - 1.4) + fz * (k * 1.6 - 1.6);
    boxPlat(bx, top + 1.2 * (k + 1), bz, 1.5, 1.2 * (k + 1), 1.5, themeMat(zid === 5 ? 5 : zid, k + 1), { zone: zid });
    if (k === 2) addStar(bx, top + 1.2 * 3 + 1.5, bz, zid);
  }
}

function addPortal(x, top, z, zid, rotY = 0) {
  const c = cylPlat(x, top + 0.25, z, 1.3, 0.25, M.portal, { portal: true, zone: zid });
  const ring = mesh(G.torus, M.portal, x, top + 1.9, z, 1.35, 1.35, 1.35, scene, false, false);
  ring.rotation.y = rotY;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 24), new THREE.MeshBasicMaterial({ color: 0x9ff3ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  disc.position.set(x, top + 1.9, z);
  disc.rotation.y = rotY;
  scene.add(disc);
  portals.push({ ring, disc, x, y: top, z });
  makeLabel([{ t: '허브로 귀환', c: '#9ff3ff' }], { w: 256, h: 96, sx: 2.6, pos: new THREE.Vector3(x, top + 3.7, z), noBg: true });
  return c;
}

// ---------- 코스 빌더 ----------
function moveVec(mv, fx, fz, lx, lz) {
  const a = mv.a;
  const v = a === 'l' ? [lx, 0, lz] : a === 'f' ? [fx, 0, fz] : [0, 1, 0];
  return { ax: v[0], ay: v[1], az: v[2], amp: mv.amp, spd: mv.spd, ph: mv.ph || 0 };
}

function buildCourse(zid, O, dir, startF, steps, entryCol, gs = 1) {
  const fx = dir[0], fz = dir[1], lx = -fz, lz = fx;
  const W = (F, L) => [O.x + fx * F + lx * L, O.z + fz * F + lz * L];
  const alongZ = fx === 0;
  const C = courses[zid] = { zid, pairs: [], gs, nodes: [] };
  let prev = { F: startF, L: 0, top: O.y, d: 0, amp: 0 };
  let last = entryCol;
  steps.forEach((s, i) => {
    const kind = s.t || 'n';
    const round = kind === 'cyl' || kind === 'sweep';
    const r = s.r || 1.5;
    const w = round ? 2 * r : (s.w || 3), d = round ? 2 * r : (s.d || 3);
    const ampF = s.move && s.move.a === 'f' ? s.move.amp : 0;
    const F = prev.F + prev.d / 2 + prev.amp + (s.g == null ? 3 : s.g) + ampF + d / 2;
    const L = prev.L + (s.l || 0);
    const top = prev.top + (s.y || 0);
    const [x, z] = W(F, L);
    const c = makePlatform(zid, kind, x, top, z, {
      round, r, sx: alongZ ? w : d, sz: alongZ ? d : w, h: s.h, idx: i, v: s.v, spd: s.spd,
      move: s.move && moveVec(s.move, fx, fz, lx, lz),
    });
    C.nodes.push(c);
    C.pairs.push([last, c]);
    last = c;
    if (kind === 'start') { C.start = c; makeLabel([{ t: zoneById(zid).course, c: '#ffffff' }, { t: '여기서 시작', c: '#ffcf3f', s: 34 }], { sx: 3.6, pos: new THREE.Vector3(x, top + 3, z), noBg: true }); }
    if (kind === 'finish') { C.finish = c; }
    if (s.star) addStar(x, top + 1.5, z, zid);
    if (s.side) {
      const sd = s.side;
      const [x2, z2] = W(F + (sd.f || 0), L + sd.l);
      const sc = makePlatform(zid, sd.t || 'n', x2, top + (sd.y || 0), z2, {
        sx: alongZ ? (sd.w || 2) : (sd.d || 2), sz: alongZ ? (sd.d || 2) : (sd.w || 2), idx: i + 2,
        move: sd.move && moveVec(sd.move, fx, fz, lx, lz),
      });
      C.pairs.push([c, sc]);
      if (sd.star) addStar(x2, top + (sd.y || 0) + 1.5, z2, zid);
    }
    if (s.hazard === 'stripes') {
      for (const [fo, l0, l1] of [[-d / 4, -w / 2, w / 2 - 2.2], [d / 4, -w / 2 + 2.2, w / 2]]) {
        const lm = (l0 + l1) / 2, lw = l1 - l0;
        const [bx, bz] = W(F + fo, L + lm);
        boxPlat(bx, top + 0.35, bz, alongZ ? lw : 1, 0.36, alongZ ? 1 : lw, M.lava, { kill: true, zone: zid });
      }
    }
    if (kind === 'finish') decorateFinish(zid, c, fx, fz, lx, lz);
    prev = { F, L, top, d, amp: ampF };
  });
  return C;
}
