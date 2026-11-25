'use strict';
// 1~5구역 코스 데이터 · 구름 탑(4구역)
// ---------- 코스 데이터 ----------
const COURSE_SPECS = {
  1: [
    { t: 'start', g: 1.5, w: 4, d: 3 },
    { g: 2.5, w: 3, d: 3 },
    { g: 2.8, l: 1.5, y: 0.6, w: 3, d: 3 },
    { g: 2.8, l: -3, y: 0.6, w: 3, d: 3 },
    { g: 3, l: 1.5, w: 2.2, d: 2.2 },
    { g: 3, y: -0.4, w: 2.2, d: 2.2, side: { l: -5, y: 1.2, w: 2, d: 2, star: true } },
    { t: 'cp', g: 3, w: 5, d: 4 },
    { g: 2.5, w: 1.4, d: 7 },
    { g: 2.5, l: 2, w: 1.4, d: 5 },
    { g: 3, l: -2, y: 1, w: 3, d: 3 },
    { g: 3, y: 1, w: 3, d: 3, star: true },
    { g: 3, l: -2.5, w: 2, d: 2 },
    { g: 3.2, l: 2.5, y: 0.5, w: 2, d: 2 },
    { t: 'cp', g: 3, w: 5, d: 4 },
    { t: 'cyl', g: 3, r: 1.3 },
    { t: 'cyl', g: 3, l: 2.5, y: 0.6, r: 1.2 },
    { t: 'cyl', g: 3, l: -2.5, y: 0.6, r: 1.1, side: { l: -5, y: 1.4, w: 1.6, d: 1.6, star: true } },
    { t: 'cyl', g: 3.2, l: 1, y: 0.6, r: 1 },
    { g: 3, y: -1, w: 3, d: 3 },
    { t: 'finish', g: 3, w: 9, d: 9 },
  ],
  2: [
    { t: 'start', g: 1.5, w: 4, d: 3 },
    { g: 3, w: 3, d: 3 },
    { g: 3, w: 3, d: 3, move: { a: 'l', amp: 3, spd: 1.2 } },
    { g: 3, w: 3, d: 3 },
    { g: 3, w: 2.5, d: 2.5, move: { a: 'l', amp: 3.5, spd: 1.5 } },
    { g: 3, w: 2.5, d: 2.5, move: { a: 'l', amp: 3.5, spd: 1.5, ph: Math.PI }, star: true },
    { t: 'cp', g: 3, w: 5, d: 4 },
    { g: 2.5, w: 6, d: 8, hazard: 'stripes' },
    { g: 3, y: 1, w: 2, d: 2 },
    { g: 3, y: 1, w: 2, d: 2, move: { a: 'y', amp: 1.2, spd: 1.4 } },
    { g: 3, y: 1, w: 2.4, d: 2.4, side: { l: 5, y: 1, w: 2, d: 2, star: true, move: { a: 'y', amp: 1, spd: 1.8 } } },
    { t: 'cp', g: 3, w: 5, d: 4 },
    { g: 2, w: 3, d: 3, move: { a: 'f', amp: 4, spd: 0.9 } },
    { g: 2, w: 3, d: 3 },
    { g: 3, l: -1, w: 1.2, d: 6 },
    { g: 3, l: 2.2, w: 1.2, d: 6, star: true },
    { g: 3, l: -1.2, y: 0.8, w: 3, d: 3, move: { a: 'l', amp: 4, spd: 2 } },
    { t: 'finish', g: 3, w: 9, d: 9 },
  ],
  3: [
    { t: 'start', g: 1.5, w: 4, d: 3 },
    { t: 'ice', g: 3, w: 3, d: 4 },
    { t: 'ice', g: 3, l: 2, w: 3, d: 4 },
    { t: 'ice', g: 3, l: -2, w: 2, d: 5, star: true },
    { t: 'sweep', g: 3, r: 4, spd: 1.8 },
    { g: 3, w: 3, d: 3 },
    { t: 'cp', g: 3, w: 5, d: 4 },
    { t: 'bounce', g: 3, w: 2.5, d: 2.5, v: 20 },
    { g: 3.5, y: 5, w: 3, d: 3, side: { l: -6, y: 1.5, w: 2, d: 2, star: true } },
    { t: 'ice', g: 3, y: -0.5, w: 2.2, d: 2.2 },
    { t: 'ice', g: 3, l: 2, y: -0.5, w: 2.2, d: 2.2 },
    { t: 'sweep', g: 3, l: -2, y: -0.5, r: 4, spd: -2.4 },
    { t: 'cp', g: 3, w: 5, d: 4 },
    { t: 'fade', g: 3, w: 2.5, d: 2.5 },
    { t: 'fade', g: 3, l: 2, w: 2.5, d: 2.5 },
    { t: 'fade', g: 3, l: -2, y: 0.5, w: 2.5, d: 2.5, star: true },
    { t: 'bounce', g: 3, w: 2.5, d: 2.5, v: 18 },
    { g: 3.5, y: 3.5, w: 3, d: 3, move: { a: 'l', amp: 3, spd: 1 } },
    { t: 'ice', g: 3, w: 3, d: 3 },
    { t: 'finish', g: 3, w: 9, d: 9 },
  ],
  5: [
    { t: 'start', g: 2, w: 4, d: 3 },
    { t: 'cyl', g: 6, r: 1.6 },
    { t: 'cyl', g: 6, l: 3, y: 1.5, r: 1.5 },
    { t: 'cyl', g: 6, l: -3, y: 1.5, r: 1.5, move: { a: 'y', amp: 2, spd: 1 }, star: true },
    { t: 'fade', g: 6, w: 2.5, d: 2.5 },
    { t: 'cp', g: 6, w: 5, d: 4 },
    { t: 'sweep', g: 6, r: 4.5, spd: 2.2 },
    { g: 7, w: 2.5, d: 2.5, move: { a: 'l', amp: 5, spd: 1.2 } },
    { g: 7, y: 2, w: 2.5, d: 2.5, side: { l: 9, y: 3, w: 2, d: 2, star: true } },
    { t: 'bounce', g: 6, w: 2.5, d: 2.5, v: 20 },
    { g: 6, y: 9, w: 3, d: 3 },
    { t: 'cp', g: 6, w: 5, d: 4 },
    { t: 'fade', g: 6, w: 2, d: 2 },
    { t: 'fade', g: 6, l: 3, y: 1, w: 2, d: 2 },
    { t: 'fade', g: 6, l: -3, y: 1, w: 2, d: 2, star: true },
    { g: 7, w: 2.5, d: 2.5, move: { a: 'f', amp: 4, spd: 0.8 } },
    { t: 'sweep', g: 5, r: 4.5, spd: -2.6 },
    { t: 'cyl', g: 7, r: 1.2, y: 2, side: { l: -8, y: 4, w: 1.6, d: 1.6, star: true } },
    { t: 'cyl', g: 7, r: 1.2, y: 2 },
    { t: 'finish', g: 6, w: 10, d: 10 },
  ],
};

// ---------- 구름 탑 (4구역) ----------
function buildTower(zid, O, dir, entryCol) {
  const fx = dir[0], fz = dir[1], lx = -fz, lz = fx;
  const W = (F, L) => [O.x + fx * F + lx * L, O.z + fz * F + lz * L];
  const alongZ = fx === 0;
  const C = courses[zid] = { zid, pairs: [], gs: 1, nodes: [] };
  let [x, z] = W(15.5, 0);
  const s0 = makePlatform(zid, 'start', x, 0, z, { sx: alongZ ? 4 : 3, sz: alongZ ? 3 : 4 });
  C.start = s0;
  C.pairs.push([entryCol, s0]);
  makeLabel([{ t: zoneById(zid).course, c: '#ffffff' }, { t: '여기서 시작', c: '#ffcf3f', s: 34 }], { sx: 3.6, pos: new THREE.Vector3(x, 3, z), noBg: true });
  [x, z] = W(21, 0);
  const s1 = makePlatform(zid, 'n', x, 0, z, { sx: 3, sz: 3, idx: 1 });
  C.pairs.push([s0, s1]);
  const [cx, cz] = W(30, 0);
  const base = cylPlat(cx, 0, cz, 5, 1, themeMat(zid, 0), { zone: zid });
  C.pairs.push([s1, base]);
  const pillar = cylPlat(cx, 41.5, cz, 3, 42.5, mat(0xf5f0ff), { zone: zid });
  for (let y = 4; y < 41; y += 6) mesh(G.cyl, mat(0xd8ccff), cx, y, cz, 3.08, 0.5, 3.08, scene, false, true);
  let last = base;
  const RADIUS = 8, N = 33;
  for (let k = 0; k < N; k++) {
    const phi = (k * 50) * Math.PI / 180;
    const F = 30 + RADIUS * Math.sin(phi), L = RADIUS * Math.cos(phi);
    const [px, pz] = W(F, L);
    const top = 1.3 + 1.25 * k;
    const isCp = k === 8 || k === 16 || k === 24;
    const isFade = [5, 6, 13, 14, 20, 21, 28, 29].includes(k);
    const isMove = [10, 18, 26].includes(k);
    const kind = isCp ? 'cp' : isFade ? 'fade' : 'cyl';
    const c = makePlatform(zid, kind, px, top, pz, { round: true, r: isCp ? 2.3 : 1.8, h: 0.7, idx: k, move: isMove ? { ax: 0, ay: 1, az: 0, amp: 0.8, spd: 1.6 } : null });
    C.nodes.push(c);
    C.pairs.push([last, c]);
    last = c;
    if (k === 3) addStar(px, top + 1.5, pz, zid);
    if (k === 12 || k === 22) {
      const [sx, sz] = W(30 + 12.5 * Math.sin(phi), 12.5 * Math.cos(phi));
      const sc = makePlatform(zid, 'cyl', sx, top + 1, sz, { round: true, r: 1.3, h: 0.6, idx: k + 1 });
      C.pairs.push([c, sc]);
      addStar(sx, top + 2.5, sz, zid);
    }
  }
  const fin = makePlatform(zid, 'finish', cx, 42.5, cz, { round: true, r: 5.5, h: 1 });
  C.finish = fin;
  C.pairs.push([last, fin]);
  // 완주 장식 (원형 플랫폼용)
  const hs = 3.9;
  const fc = { x: cx, z: cz, top: 42.5, hx: hs, hz: hs };
  decorateFinish(zid, fc, fx, fz, lx, lz);
  return C;
}
