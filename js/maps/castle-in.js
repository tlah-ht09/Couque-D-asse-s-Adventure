'use strict';
// =====================================================================
//  쿠키성 내부 (맵 'castleIn'): 8층 미로 성
//  - 층마다 80x80m, 10x10칸(칸 8m), 층 높이 6m
//  - 미로는 시드 고정(재귀 백트래커 + 일부 벽 제거 + 큰 방), 계단은 층마다 다른 곳
//  - 위치: CI 에서 멀리 떨어진 허공 (mapAt 이 castleIn 으로 판정)
// =====================================================================
const CI = { x: -400, y: 300, z: -400 };
const CI_FLOOR_H = 6, CI_CELL = 8, CI_N = 10, CI_FLOORS = 8, CI_WALL_T = 0.4, CI_SLAB_T = 0.4;
const CI_STEP_H = 0.4, CI_STEP_N = 15;          // 계단: 15단 x 0.4m = 6m, 단 깊이 0.8m (3칸 = 12m)
const CI_ENTRANCE = { i: 4, j: 9 };             // 1층 도착 칸 (남쪽 가장자리)
const CI_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// ===== PURE_BEGIN (three.js 없이 노드에서 테스트하는 부분) =====
function ciRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ciShuffle(a, r) { for (let k = a.length - 1; k > 0; k--) { const m = Math.floor(r() * (k + 1)); [a[k], a[m]] = [a[m], a[k]]; } return a; }
const ciKey = (i, j) => j * CI_N + i;
const ciIn = (i, j) => i >= 0 && j >= 0 && i < CI_N && j < CI_N;

// 층마다 올라가는 계단 자리 계획. 계단은 3칸짜리 직선(S[0..2]), N0 = 아래 입구 앞 칸, B = 윗층 도착 칸
function ciPlanStairs() {
  const plans = [];
  let A = CI_ENTRANCE, prevVoid = [];
  for (let f = 0; f < CI_FLOORS - 1; f++) {
    const r = ciRng(9000 + f * 77);
    const cands = [];
    const bad = new Set(prevVoid.map((c) => ciKey(c.i, c.j)));
    for (let j = 0; j < CI_N; j++) for (let i = 0; i < CI_N; i++) for (let d = 0; d < 4; d++) {
      const [dx, dz] = CI_DIRS[d];
      const S = [0, 1, 2].map((k) => ({ i: i + dx * k, j: j + dz * k }));
      const N0 = { i: i - dx, j: j - dz }, B = { i: i + dx * 3, j: j + dz * 3 };
      const all = [...S, N0, B];
      if (!all.every((c) => ciIn(c.i, c.j) && !bad.has(ciKey(c.i, c.j)))) continue;
      if (S.some((c) => c.i === A.i && c.j === A.j)) continue;
      if (f === 6 && S.some((c) => c.i >= 2 && c.i <= 7 && c.j >= 2 && c.j <= 7)) continue; // 8층 중앙 홀 피하기
      const score = Math.abs(N0.i - A.i) + Math.abs(N0.j - A.j) + r() * 3;
      cands.push({ score, S, N0, B, d: [dx, dz] });
    }
    cands.sort((a, b) => b.score - a.score);
    const p = cands[Math.floor(r() * Math.min(5, cands.length))];
    plans.push(p);
    A = p.B; prevVoid = p.S;
  }
  return plans;
}

function ciGenFloor(f, plans) {
  const N = CI_N, rng = ciRng(1234 + f * 7919);
  const A = f === 0 ? { ...CI_ENTRANCE } : { ...plans[f - 1].B };
  const plan = f < CI_FLOORS - 1 ? plans[f] : null;
  const voidCells = f > 0 ? plans[f - 1].S : [];
  const stairCells = plan ? plan.S : [];
  const voidSet = new Set(voidCells.map((c) => ciKey(c.i, c.j)));
  const stairIdx = new Map(stairCells.map((c, k) => [ciKey(c.i, c.j), k]));
  const H = Array.from({ length: N + 1 }, () => Array(N).fill(true));   // H[j][i]: z=j 선의 i번째 칸 벽
  const V = Array.from({ length: N }, () => Array(N + 1).fill(true));   // V[j][i]: x=i 선의 j번째 줄 벽
  const setWall = (a, b, v) => {
    if (b.i === a.i + 1) V[a.j][b.i] = v; else if (b.i === a.i - 1) V[a.j][a.i] = v;
    else if (b.j === a.j + 1) H[b.j][a.i] = v; else H[a.j][a.i] = v;
  };
  const getWall = (a, b) => (b.i === a.i + 1 ? V[a.j][b.i] : b.i === a.i - 1 ? V[a.j][a.i] : b.j === a.j + 1 ? H[b.j][a.i] : H[a.j][a.i]);
  const allowed = (a, b) => {
    if (!ciIn(a.i, a.j) || !ciIn(b.i, b.j)) return false;
    if (voidSet.has(ciKey(a.i, a.j)) || voidSet.has(ciKey(b.i, b.j))) return false;
    const sa = stairIdx.get(ciKey(a.i, a.j)), sb = stairIdx.get(ciKey(b.i, b.j));
    if (sa == null && sb == null) return true;
    if (sa != null && sb != null) return true;
    const s = sa != null ? a : b, o = sa != null ? b : a;
    return stairIdx.get(ciKey(s.i, s.j)) === 0 && o.i === plan.N0.i && o.j === plan.N0.j;
  };
  // 재귀 백트래커
  const vis = new Set([ciKey(A.i, A.j)]);
  const stack = [A];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nb = ciShuffle(CI_DIRS.map(([dx, dz]) => ({ i: cur.i + dx, j: cur.j + dz })), rng).filter((c) => allowed(cur, c) && !vis.has(ciKey(c.i, c.j)));
    if (!nb.length) { stack.pop(); continue; }
    setWall(cur, nb[0], false);
    vis.add(ciKey(nb[0].i, nb[0].j));
    stack.push(nb[0]);
  }
  // 벽을 많이 허물어서 갈래길 만들기 (남은 안쪽 벽의 20%)
  const walls = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = { i, j };
    for (const b of [{ i: i + 1, j }, { i, j: j + 1 }]) if (allowed(a, b) && getWall(a, b)) walls.push([a, b]);
  }
  ciShuffle(walls, rng);
  const rm = Math.round(walls.length * 0.2);
  for (let k = 0; k < rm; k++) setWall(walls[k][0], walls[k][1], false);
  // 큰 방
  const halls = [];
  const hallCells = new Set();
  const overlap = (a, b) => a.i < b.i + b.w + 1 && b.i < a.i + a.w + 1 && a.j < b.j + b.h + 1 && b.j < a.j + a.h + 1;
  if (f === CI_FLOORS - 1) halls.push({ i: 2, j: 2, w: 6, h: 6, throne: true });
  else {
    const want = 1 + (rng() < 0.5 ? 1 : 0);
    for (let t = 0; t < 80 && halls.length < want; t++) {
      const sh = rng() < 0.5 ? [3, 3] : rng() < 0.5 ? [2, 3] : [3, 2];
      const R = { w: sh[0], h: sh[1], i: Math.floor(rng() * (N - sh[0] + 1)), j: Math.floor(rng() * (N - sh[1] + 1)) };
      let ok = true;
      for (let jj = R.j; jj < R.j + R.h && ok; jj++) for (let ii = R.i; ii < R.i + R.w; ii++) {
        const k = ciKey(ii, jj);
        if (voidSet.has(k) || stairIdx.has(k) || (plan && ii === plan.N0.i && jj === plan.N0.j) || (ii === A.i && jj === A.j)) { ok = false; break; }
      }
      if (ok && halls.some((h) => overlap(h, R))) ok = false;
      if (ok) halls.push(R);
    }
  }
  for (const h of halls) for (let jj = h.j; jj < h.j + h.h; jj++) for (let ii = h.i; ii < h.i + h.w; ii++) {
    hallCells.add(ciKey(ii, jj));
    if (ii + 1 < h.i + h.w) setWall({ i: ii, j: jj }, { i: ii + 1, j: jj }, false);
    if (jj + 1 < h.j + h.h) setWall({ i: ii, j: jj }, { i: ii, j: jj + 1 }, false);
  }
  // 아래층 계단이 뚫고 올라오는 구멍(난간 벽은 그대로 두고 안쪽만 틔움 + 도착 칸 쪽 열기)
  if (f > 0) {
    const S = voidCells, B = plans[f - 1].B;
    setWall(S[0], S[1], false); setWall(S[1], S[2], false); setWall(S[2], B, false);
  }
  // 막다른 길 정리: 계단 칸 빼고 3~4개만 남기고(옷장 자리) 나머지는 옆 칸으로 뚫어요
  const keepN = 3 + (rng() < 0.5 ? 1 : 0);
  const spec0 = new Set([...stairCells, ...voidCells].map((c) => ciKey(c.i, c.j)));
  const dEnds = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = { i, j };
    if (spec0.has(ciKey(i, j))) continue;
    if (CI_DIRS.filter(([dx, dz]) => { const b = { i: i + dx, j: j + dz }; return ciIn(b.i, b.j) && !getWall(c, b); }).length === 1) dEnds.push(c);
  }
  ciShuffle(dEnds, rng);
  const isSp = (c) => c.i === A.i && c.j === A.j || (plan && (c.i === plan.N0.i && c.j === plan.N0.j || c.i === plan.B.i && c.j === plan.B.j));
  dEnds.sort((a, b) => (isSp(a) ? 1 : 0) - (isSp(b) ? 1 : 0));
  dEnds.forEach((c, k) => {
    if (k < keepN && !isSp(c)) return;
    const opts = ciShuffle(CI_DIRS.map(([dx, dz]) => ({ i: c.i + dx, j: c.j + dz })).filter((b) => allowed(c, b) && getWall(c, b)), rng);
    if (opts.length) setWall(c, opts[0], false);
  });
  const deg = (c) => CI_DIRS.filter(([dx, dz]) => { const b = { i: c.i + dx, j: c.j + dz }; return ciIn(b.i, b.j) && !getWall(c, b); }).length;
  // 옷장: 막다른 길 우선, 모자라면 벽 많은 칸
  const special = new Set([...stairCells, ...voidCells].map((c) => ciKey(c.i, c.j)));
  special.add(ciKey(A.i, A.j));
  if (plan) { special.add(ciKey(plan.N0.i, plan.N0.j)); special.add(ciKey(plan.B.i, plan.B.j)); }
  const dead = [], other = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = ciKey(i, j);
    if (special.has(k) || hallCells.has(k)) continue;
    const c = { i, j };
    const opens = CI_DIRS.filter(([dx, dz]) => { const b = { i: i + dx, j: j + dz }; return ciIn(b.i, b.j) && !getWall(c, b); });
    if (opens.length === 1) dead.push({ i, j, fx: opens[0][0], fz: opens[0][1], w: 99 });
    else {
      const closed = CI_DIRS.filter(([dx, dz]) => { const b = { i: i + dx, j: j + dz }; return !ciIn(b.i, b.j) || getWall(c, b); });
      if (closed.length >= 2) { const back = closed[Math.floor(rng() * closed.length)]; other.push({ i, j, fx: -back[0], fz: -back[1], w: closed.length + rng() }); }
    }
  }
  ciShuffle(dead, rng);
  other.sort((a, b) => b.w - a.w);
  const wantW = 3 + (rng() < 0.5 ? 1 : 0);
  const cand = [...dead, ...other], wardrobes = [];
  for (let minD = 5; minD >= 2 && wardrobes.length < wantW; minD--) {
    for (const c of cand) {
      if (wardrobes.length >= wantW) break;
      if (wardrobes.includes(c)) continue;
      if (wardrobes.every((o) => Math.abs(o.i - c.i) + Math.abs(o.j - c.j) >= minD)) wardrobes.push(c);
    }
  }
  for (let k = 0; k < wardrobes.length; k++) { const { i, j, fx, fz } = wardrobes[k]; wardrobes[k] = { i, j, fx, fz }; }
  if (wardrobes.length < wantW) for (const c of cand) { if (wardrobes.length >= wantW) break; if (!wardrobes.some((o) => o.i === c.i && o.j === c.j)) wardrobes.push({ i: c.i, j: c.j, fx: c.fx, fz: c.fz }); }
  // 합친 벽 구간 (칸 좌표). axis 'x' = x 방향으로 뻗은 벽(z=line), 'z' = z 방향 벽(x=line)
  const segs = [];
  for (let j = 0; j <= N; j++) { let s = -1; for (let i = 0; i <= N; i++) { const on = i < N && H[j][i]; if (on && s < 0) s = i; if (!on && s >= 0) { segs.push({ axis: 'x', line: j, a: s, b: i }); s = -1; } } }
  for (let i = 0; i <= N; i++) { let s = -1; for (let j = 0; j <= N; j++) { const on = j < N && V[j][i]; if (on && s < 0) s = j; if (!on && s >= 0) { segs.push({ axis: 'z', line: i, a: s, b: j }); s = -1; } } }
  return { f, A, H, V, halls, plan, voidCells, stairCells, wardrobes, segs, getWall };
}
// ===== PURE_END =====

// ===================== 여기부터 three.js 부분 =====================
const castleHides = [];   // 옷장 안 서 있는 자리 {floor, x, y, z, fx, fz}
const CI_WALL_COL = [0xf2d2b0, 0xe6a0a8, 0xa8dcc8, 0xf5e0a0, 0xa8b8e0, 0xd8b4f0, 0xf4b0a8, 0xe6c15a];
const CI_THEME = ['현관 홀', '식당', '부엌', '거실', '서재', '놀이방', '침실', '왕의 방'];
const CASTLE_IN = { CI, FLOOR_H: CI_FLOOR_H, CELL: CI_CELL, N: CI_N, floors: [], plans: null, attached: false, shown: -1, exitPad: null };
const ciX0 = CI.x - CI_N * CI_CELL / 2, ciZ0 = CI.z - CI_N * CI_CELL / 2;
CASTLE_IN.cellCenter = (i, j) => ({ x: ciX0 + (i + 0.5) * CI_CELL, z: ciZ0 + (j + 0.5) * CI_CELL });
CASTLE_IN.floorTop = (f) => CI.y + f * CI_FLOOR_H;
CASTLE_IN.playerFloor = () => Math.max(0, Math.min(CI_FLOORS - 1, Math.floor((P.y - CI.y) / CI_FLOOR_H)));
const inCastleIn = (x, y, z) => x < -330 && z < -330 && y > 250;
let castleInExitT = 0;

function ciInst(parent, list, material) {
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(G.box, material, list.length);
  const d = new THREE.Object3D();
  list.forEach((b, k) => { d.position.set(b.x, b.y, b.z); d.scale.set(b.sx, b.sy, b.sz); d.updateMatrix(); im.setMatrixAt(k, d.matrix); });
  im.instanceMatrix.needsUpdate = true;
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
  parent.add(im);
  return im;
}

(function buildCastleInterior() {
  const plans = ciPlanStairs();
  CASTLE_IN.plans = plans;
  const T = CI_WALL_T;
  for (let f = 0; f < CI_FLOORS; f++) {
    const gen = ciGenFloor(f, plans);
    const group = new THREE.Group();
    group.name = 'castleIn:floor' + (f + 1);
    const y0 = CASTLE_IN.floorTop(f);
    const cols = [];
    const col = (x, y, z, hx, hy, hz, fl) => { const c = addBoxCol(x, y, z, hx, hy, hz, fl); c.solid = false; cols.push(c); return c; };
    const wallCol = new THREE.Color(CI_WALL_COL[f]);
    const wallMat = mat(CI_WALL_COL[f], { emissive: CI_WALL_COL[f], emissiveIntensity: 0.3 });
    const slabMat = mat(wallCol.clone().multiplyScalar(0.7).getHex(), { emissive: wallCol.clone().multiplyScalar(0.7).getHex(), emissiveIntensity: 0.3 });
    // --- 벽 (합친 구간) ---
    const wallBoxes = [], wallList = [];
    for (const s of gen.segs) {
      const len = (s.b - s.a) * CI_CELL + T, mid = (s.a + s.b) / 2 * CI_CELL;
      const line = s.line * CI_CELL;
      const cx = s.axis === 'x' ? ciX0 + mid : ciX0 + line, cz = s.axis === 'x' ? ciZ0 + line : ciZ0 + mid;
      const sx = s.axis === 'x' ? len : T, sz = s.axis === 'x' ? T : len;
      wallBoxes.push({ x: cx, y: y0 + CI_FLOOR_H / 2, z: cz, sx, sy: CI_FLOOR_H, sz });
      col(cx, y0 + CI_FLOOR_H / 2, cz, sx / 2, CI_FLOOR_H / 2, sz / 2, {});
      wallList.push({ axis: s.axis, cx, cz, len, thick: T, h: CI_FLOOR_H, y: y0 });
    }
    ciInst(group, wallBoxes, wallMat);
    // --- 벽 테두리: 어두운 걸레받이 + 크림색 윗덮개 + 끝/모서리 기둥 + 바닥 격자선 ---
    {
      const dk = wallCol.clone().multiplyScalar(0.45).getHex(), pk = wallCol.clone().multiplyScalar(0.3).getHex();
      const baseB = [], capB = [], postB = [], gridB = [];
      const BH = 0.4, CH = 0.25, PT = T + 0.2;
      for (const w of wallBoxes) {
        baseB.push({ x: w.x, y: y0 + BH / 2, z: w.z, sx: w.sx + (w.sx > w.sz ? 0 : 0.2), sy: BH, sz: w.sz + (w.sx > w.sz ? 0.2 : 0) });
        // 걸레받이는 양옆으로 0.1 더 두껍게(긴 방향은 그대로)
        const bb = baseB[baseB.length - 1]; if (w.sx > w.sz) bb.sz = w.sz + 0.2; else bb.sx = w.sx + 0.2;
        capB.push({ x: w.x, y: y0 + CI_FLOOR_H - CH / 2, z: w.z, sx: w.sx > w.sz ? w.sx : w.sx + 0.16, sy: CH, sz: w.sx > w.sz ? w.sz + 0.16 : w.sz });
      }
      const pts = new Set();
      for (const sg of gen.segs) {
        const ends = sg.axis === 'x' ? [[sg.a, sg.line], [sg.b, sg.line]] : [[sg.line, sg.a], [sg.line, sg.b]];
        for (const [gi, gj] of ends) pts.add(gj * (CI_N + 1) + gi);
      }
      for (const k of pts) {
        const gi = k % (CI_N + 1), gj = Math.floor(k / (CI_N + 1));
        postB.push({ x: ciX0 + gi * CI_CELL, y: y0 + CI_FLOOR_H / 2, z: ciZ0 + gj * CI_CELL, sx: PT, sy: CI_FLOOR_H, sz: PT });
      }
      // 바닥 격자선(칸 경계, 얇은 어두운 선)
      const GL = 0.06;
      for (let g = 1; g < CI_N; g++) {
        gridB.push({ x: ciX0 + CI_N * CI_CELL / 2, y: y0 + 0.012, z: ciZ0 + g * CI_CELL, sx: CI_N * CI_CELL, sy: 0.024, sz: GL });
        gridB.push({ x: ciX0 + g * CI_CELL, y: y0 + 0.012, z: ciZ0 + CI_N * CI_CELL / 2, sx: GL, sy: 0.024, sz: CI_N * CI_CELL });
      }
      const dm = mat(dk, { emissive: dk, emissiveIntensity: 0.25 });
      ciInst(group, baseB, dm);
      ciInst(group, capB, mat(0xfff3d6, { emissive: 0xfff3d6, emissiveIntensity: 0.45 }));
      ciInst(group, postB, mat(pk, { emissive: pk, emissiveIntensity: 0.2 }));
      ciInst(group, gridB, dm);
    }
    // --- 바닥판 (윗층 계단 구멍 비움) + 맨 위층 지붕판 ---
    const holes = new Set(gen.voidCells.map((c) => ciKey(c.i, c.j)));
    const slabBoxes = [];
    const addSlab = (top, useHoles) => {
      for (let j = 0; j < CI_N; j++) {
        let s = -1;
        for (let i = 0; i <= CI_N; i++) {
          const on = i < CI_N && !(useHoles && holes.has(ciKey(i, j)));
          if (on && s < 0) s = i;
          if (!on && s >= 0) {
            const xa = ciX0 + s * CI_CELL - (s === 0 ? T / 2 : 0), xb = ciX0 + i * CI_CELL + (i === CI_N ? T / 2 : 0);
            const za = ciZ0 + j * CI_CELL - (j === 0 ? T / 2 : 0), zb = ciZ0 + (j + 1) * CI_CELL + (j === CI_N - 1 ? T / 2 : 0);
            const x = (xa + xb) / 2, z = (za + zb) / 2, sx = xb - xa, sz = zb - za;
            slabBoxes.push({ x, y: top - CI_SLAB_T / 2, z, sx, sy: CI_SLAB_T, sz });
            col(x, top - CI_SLAB_T / 2, z, sx / 2, CI_SLAB_T / 2, sz / 2, {});
            s = -1;
          }
        }
      }
    };
    addSlab(y0, true);
    if (f === CI_FLOORS - 1) addSlab(y0 + CI_FLOOR_H, false);
    ciInst(group, slabBoxes, slabMat);
    // --- 올라가는 계단 (계단식 경사: 박스 콜라이더) ---
    let stair = null;
    if (gen.plan) {
      const p = gen.plan, [dx, dz] = p.d;
      const c0 = CASTLE_IN.cellCenter(p.S[0].i, p.S[0].j);
      const sx0 = c0.x - dx * CI_CELL / 2, sz0 = c0.z - dz * CI_CELL / 2;   // 계단 시작 가장자리
      const depth = CI_CELL * 3 / CI_STEP_N, wd = CI_CELL - T;
      const stepBoxes = [];
      for (let k = 1; k <= CI_STEP_N; k++) {
        const along = depth * (k - 1) + depth / 2;
        const x = sx0 + dx * along, z = sz0 + dz * along, h = CI_STEP_H * k;
        const hx = (dx !== 0 ? depth : wd) / 2, hz = (dz !== 0 ? depth : wd) / 2;
        stepBoxes.push({ x, y: y0 + h / 2, z, sx: hx * 2, sy: h, sz: hz * 2 });
        col(x, y0 + h / 2, z, hx, h / 2, hz, {});
      }
      ciInst(group, stepBoxes, mat(0xd9b27a, { emissive: 0xd9b27a, emissiveIntensity: 0.25 }));
      const e = CASTLE_IN.cellCenter(p.S[0].i, p.S[0].j), t = CASTLE_IN.cellCenter(p.B.i, p.B.j);
      stair = { cells: p.S, enter: CASTLE_IN.cellCenter(p.N0.i, p.N0.j), bottom: { x: e.x, z: e.z }, arriveUpper: t, dir: p.d, start: { x: sx0, z: sz0 }, steps: CI_STEP_N, stepH: CI_STEP_H, stepDepth: depth, width: wd, nextCell: p.B };
    }
    // --- 옷장: 뒤·양옆·위 4면 껍데기(앞은 열림) ---
    const wardBoxes = [], wardDoors = [], wardrobes = [];
    const WW = 1.6, WD = 1.2, WH = 2.1, WT = 0.1;
    for (const w of gen.wardrobes) {
      const cc = CASTLE_IN.cellCenter(w.i, w.j), fx = w.fx, fz = w.fz, lx = -fz, lz = fx;
      // 로컬 좌표 (u = 앞쪽, v = 옆) -> 월드
      const put = (u, v, uSize, vSize, y, hgt, arr) => {
        const x = cc.x + fx * u + lx * v, z = cc.z + fz * u + lz * v;
        const sx = (fx !== 0 ? uSize : vSize), sz = (fz !== 0 ? uSize : vSize);
        arr.push({ x, y: y0 + y + hgt / 2, z, sx, sy: hgt, sz });
        return [x, y0 + y + hgt / 2, z, sx / 2, hgt / 2, sz / 2];
      };
      const uc = -(CI_CELL / 2 - T / 2 - 0.05 - WD / 2);   // 몸통 중심 (뒤판이 벽에 붙게)
      const parts = [
        put(uc - WD / 2 + WT / 2, 0, WT, WW, 0, WH, wardBoxes),               // 뒤
        put(uc, WW / 2 - WT / 2, WD, WT, 0, WH, wardBoxes),                   // 옆 1
        put(uc, -(WW / 2 - WT / 2), WD, WT, 0, WH, wardBoxes),                // 옆 2
        put(uc, 0, WD, WW, WH - WT, WT, wardBoxes),                           // 위
      ];
      for (const q of parts) col(q[0], q[1], q[2], q[3], q[4], q[5], {});
      // 문짝(장식, 충돌 없음): 앞 모서리에서 바깥으로 활짝 열린 모양
      const doorIdx = wardDoors.length;
      for (const sgn of [1, -1]) put(uc + WD / 2 - 0.4 + 0.45, sgn * (WW / 2 + WT), 0.8, 0.05, 0.05, 1.9, wardDoors);
      const hx = cc.x + fx * (uc - 0.02), hz = cc.z + fz * (uc - 0.02);
      const entry = { floor: f, x: hx, y: y0, z: hz, fx, fz };
      castleHides.push(entry);
      wardrobes.push({ ...entry, doorIdx, i: w.i, j: w.j, w: WW, d: WD, h: WH, cell: cc });
    }
    ciInst(group, wardBoxes, mat(0x8a5a2e, { emissive: 0x6b3f1a, emissiveIntensity: 0.3 }));
    const wardDoorMesh = ciInst(group, wardDoors, mat(0xa87a45, { emissive: 0x6b3f1a, emissiveIntensity: 0.3 }));
    for (const w of wardrobes) w.doorMesh = wardDoorMesh;
    // --- 1층 출구 패드 ---
    let arrival = CASTLE_IN.cellCenter(gen.A.i, gen.A.j);
    if (f === 0) {
      const px = arrival.x, pz = arrival.z + 1.15 * CI_CELL / 4;
      const pm = mesh(G.cyl, mat(0x5ef2c0, { emissive: 0x2fd9a0, emissiveIntensity: 1.0 }), px, y0 + 0.075, pz, 0.6, 0.15, 0.6, group, false, false);
      mesh(G.torus, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 }), px, y0 + 0.2, pz, 0.62, 0.62, 0.62, group, false, false).rotation.x = Math.PI / 2;
      const pc = addCylCol(px, y0 + 0.075, pz, 0.6, 0.075, { castleInExit: true });
      pc.solid = false; pc.mesh = pm; cols.push(pc);
      CASTLE_IN.exitPad = { x: px, y: y0, z: pz, col: pc };
    }
    // --- 데이터 ---
    const halls = gen.halls.map((h) => ({ i: h.i, j: h.j, w: h.w, h: h.h, throne: !!h.throne, x0: ciX0 + h.i * CI_CELL, z0: ciZ0 + h.j * CI_CELL, x1: ciX0 + (h.i + h.w) * CI_CELL, z1: ciZ0 + (h.j + h.h) * CI_CELL, cx: ciX0 + (h.i + h.w / 2) * CI_CELL, cz: ciZ0 + (h.j + h.h / 2) * CI_CELL }));
    CASTLE_IN.floors.push({ index: f, theme: CI_THEME[f], group, y: y0, top: y0 + CI_FLOOR_H, wallColor: CI_WALL_COL[f], H: gen.H, V: gen.V, getWall: gen.getWall, walls: wallList, halls, stair, voidCells: gen.voidCells, wardrobes, arrival: { i: gen.A.i, j: gen.A.j, x: arrival.x, z: arrival.z }, cols });
  }
  CASTLE_IN.setFloor = castleInSetFloor;
  castleInSetFloor(0, true);
})();

// 플레이어 층 ±1 만 보이고, 그 층들의 충돌체만 켜요
function castleInSetFloor(pf, force) {
  if (!force && pf === CASTLE_IN.shown) return;
  CASTLE_IN.shown = pf;
  for (const fl of CASTLE_IN.floors) {
    const on = Math.abs(fl.index - pf) <= 1;
    fl.group.visible = on;
    for (const c of fl.cols) c.solid = on;
  }
}
function castleInAttach() {
  if (CASTLE_IN.attached || typeof mapGroups === 'undefined' || !mapGroups.castleIn) return;
  for (const fl of CASTLE_IN.floors) mapGroups.castleIn.add(fl.group);
  CASTLE_IN.attached = true;
}
function updateCastleIn(dt) {
  castleInAttach();
  if (typeof updateStalker === 'function') updateStalker(dt);
  if (!inCastleIn(P.x, P.y, P.z)) { ciWindT = 1.5; return; }
  castleInSetFloor(CASTLE_IN.playerFloor());
  ciWindT -= dt;
  if (ciWindT <= 0) { ciWindT = 5 + Math.random() * 7; ciWindGust(); }
}
// 성 안 배경음: 간간히 스치는 바람 소리만
let ciWindT = 1.5, ciWindBuf = null;
function ciWindGust() {
  if (muted || !actx || actx.state !== 'running') return;
  try {
    if (!ciWindBuf) { const n = actx.sampleRate * 2; ciWindBuf = actx.createBuffer(1, n, actx.sampleRate); const d = ciWindBuf.getChannelData(0); let b = 0; for (let i = 0; i < n; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = b * 6; } }
    const t0 = actx.currentTime, dur = 2.5 + Math.random() * 2.5, f0 = 250 + Math.random() * 250;
    const src = actx.createBufferSource(); src.buffer = ciWindBuf; src.loop = true;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.7;
    f.frequency.setValueAtTime(f0, t0); f.frequency.linearRampToValueAtTime(f0 * 2.2, t0 + dur * 0.45); f.frequency.linearRampToValueAtTime(f0 * 0.8, t0 + dur);
    const g = actx.createGain(), v = 0.04 + Math.random() * 0.03;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
    if (pan) { pan.pan.setValueAtTime(Math.random() * 1.6 - 0.8, t0); src.connect(f); f.connect(g); g.connect(pan); pan.connect(actx.destination); } else { src.connect(f); f.connect(g); g.connect(actx.destination); }
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
  } catch (e) { /* 무시 */ }
}
function enterCastleInterior() {
  castleInAttach();
  const A = CASTLE_IN.floors[0].arrival;
  P.course = null; leaveTracks(); hideTimer();
  const r = { x: A.x, y: CI.y, z: A.z - 0.6, yaw: 0 };
  P.respawn = { ...r };
  castleInSetFloor(0, true);
  respawnAt(r);
  SFX.cp();
}
function exitCastleInterior() {
  const now = performance.now();
  if (now - castleInExitT < 1500) return;
  castleInExitT = now;
  P.course = null; leaveTracks(); hideTimer();
  const r = { x: CASTLE_C.x, y: 0.4, z: CASTLE_C.z + 9, yaw: 0 };
  P.respawn = { ...r };
  respawnAt(r);
  SFX.cp();
}

// ===================== 성 안 미니맵 (ui.js drawMinimap 이 성 안에서 이걸 불러요) =====================
//  - 지금 층만: 바닥·큰 방·벽·올라가는 계단(▲)·내려가는 구멍(▼)·출구 발판·옷장
//  - 층마다 정적인 그림은 오프스크린 캔버스에 한 번만 그려 두고, 플레이어 중심으로 잘라 붙여요
const CI_MM_R = 42;            // 미니맵 반지름(m)
const CI_MM_PAD = 4;           // 오프스크린 여백(m)
const ciMMCache = [];
const ciHex = (n, k) => { const c = new THREE.Color(n); if (k != null) c.multiplyScalar(k); return '#' + c.getHexString(); };
function ciMMBuild(f, s) {
  const fl = CASTLE_IN.floors[f];
  const span = CI_N * CI_CELL + CI_MM_PAD * 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.ceil(span * s);
  const c = cv.getContext('2d');
  const X = (x) => (x - ciX0 + CI_MM_PAD) * s, Z = (z) => (z - ciZ0 + CI_MM_PAD) * s;
  const cs = CI_CELL * s;
  // 바닥
  c.fillStyle = ciHex(fl.wallColor, 0.32);
  c.fillRect(X(ciX0), Z(ciZ0), CI_N * cs, CI_N * cs);
  // 큰 방
  for (const h of fl.halls) {
    c.fillStyle = h.throne ? 'rgba(255,205,80,0.28)' : 'rgba(255,255,255,0.09)';
    c.fillRect(X(h.x0), Z(h.z0), h.w * cs, h.h * cs);
  }
  // 계단 한 줄 그리기 (st: stair 데이터, up: 올라가는 계단이면 true)
  const drawStair = (st, up) => {
    const [dx, dz] = st.dir, len = st.stepDepth * st.steps, wd = st.width;
    const ax = st.start.x, az = st.start.z, bx = ax + dx * len, bz = az + dz * len;
    const x0 = Math.min(ax, bx) - (dx ? 0 : wd / 2), z0 = Math.min(az, bz) - (dz ? 0 : wd / 2);
    const w = dx ? len : wd, h = dz ? len : wd;
    c.fillStyle = up ? '#d9b27a' : 'rgba(10,8,20,0.85)';
    c.fillRect(X(x0), Z(z0), w * s, h * s);
    c.strokeStyle = up ? 'rgba(90,55,20,0.75)' : 'rgba(170,200,255,0.35)';
    c.lineWidth = Math.max(1, s * 0.12);
    c.beginPath();
    for (let k = 1; k < st.steps; k++) {
      const px = ax + dx * st.stepDepth * k, pz = az + dz * st.stepDepth * k;
      if (dx) { c.moveTo(X(px), Z(z0)); c.lineTo(X(px), Z(z0 + h)); } else { c.moveTo(X(x0), Z(pz)); c.lineTo(X(x0 + w), Z(pz)); }
    }
    c.stroke();
    // 화살표: 올라감 = 계단 방향, 내려감 = 반대 방향
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, sg = up ? 1 : -1, ux = dx * sg, uz = dz * sg;
    const L = Math.min(len * 0.3, 6) * s, Wd = wd * 0.32 * s, cx = X(mx), cz = Z(mz);
    c.fillStyle = up ? '#fff6d8' : '#9fc4ff';
    c.strokeStyle = 'rgba(20,14,30,0.9)'; c.lineWidth = Math.max(2, s * 0.5);
    c.beginPath();
    c.moveTo(cx + ux * L, cz + uz * L);
    c.lineTo(cx - ux * L * 0.4 - uz * Wd, cz - uz * L * 0.4 + ux * Wd);
    c.lineTo(cx - ux * L * 0.4 + uz * Wd, cz - uz * L * 0.4 - ux * Wd);
    c.closePath(); c.stroke(); c.fill();
  };
  if (f > 0 && CASTLE_IN.floors[f - 1].stair) drawStair(CASTLE_IN.floors[f - 1].stair, false);
  if (fl.stair) drawStair(fl.stair, true);
  // 벽
  c.fillStyle = ciHex(fl.wallColor);
  for (const w of fl.walls) {
    const t = Math.max(w.thick, 2.6 / s);   // 너무 얇으면 안 보여서 최소 두께
    const sx = w.axis === 'x' ? w.len : t, sz = w.axis === 'x' ? t : w.len;
    c.fillRect(X(w.cx - sx / 2), Z(w.cz - sz / 2), sx * s, sz * s);
  }
  // 1층 출구 발판
  if (f === 0 && CASTLE_IN.exitPad) {
    const e = CASTLE_IN.exitPad;
    c.fillStyle = '#5ef2c0'; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(2, s * 0.4);
    c.beginPath(); c.arc(X(e.x), Z(e.z), Math.max(6, 1.1 * s), 0, TAU); c.fill(); c.stroke();
  }
  return { cv, s };
}
function ciMMWardrobe(c, x, y, w, s, hidden, pulse) {
  const bw = Math.max(24, w.w * s * 1.6), bd = Math.max(17, w.d * s * 1.6);
  c.save();
  c.translate(x, y);
  c.rotate(Math.atan2(w.fx, -w.fz));   // 앞(열린 쪽)이 화면 위(-y)가 되게 돌린 뒤 그려요
  if (hidden || pulse > 0) {
    c.fillStyle = hidden ? 'rgba(120,255,170,0.35)' : 'rgba(255,214,120,' + (0.25 * pulse).toFixed(3) + ')';
    c.beginPath(); c.arc(0, 0, bw * 0.95, 0, TAU); c.fill();
  }
  c.fillStyle = hidden ? '#7be0a0' : '#b8763a';
  c.strokeStyle = '#2a170a'; c.lineWidth = 3;
  c.beginPath(); c.rect(-bw / 2, -bd / 2, bw, bd); c.fill(); c.stroke();
  // 문짝 두 개 + 손잡이 (앞쪽 = -y)
  c.strokeStyle = '#ffe2b0'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-bw / 2 + 3, -bd / 2 + 2); c.lineTo(bw / 2 - 3, -bd / 2 + 2); c.moveTo(0, -bd / 2 + 1); c.lineTo(0, bd / 2 - 1); c.stroke();
  c.fillStyle = '#ffe2b0';
  c.fillRect(-4.5, -1.5, 2.5, 3); c.fillRect(2, -1.5, 2.5, 3);
  c.restore();
}
function drawCastleInMinimap(c, W, Hh) {
  const cx = W / 2, cy = Hh / 2, s = (W / 2) / CI_MM_R;
  const f = CASTLE_IN.playerFloor(), fl = CASTLE_IN.floors[f];
  if (!ciMMCache[f] || ciMMCache[f].s !== s) ciMMCache[f] = ciMMBuild(f, s);
  const mm = ciMMCache[f];
  c.clearRect(0, 0, W, Hh);
  c.save();
  c.beginPath(); c.arc(cx, cy, W / 2, 0, TAU); c.clip();
  c.fillStyle = 'rgba(14,10,24,0.94)'; c.fillRect(0, 0, W, Hh);
  const ox = cx - (P.x - ciX0 + CI_MM_PAD) * s, oz = cy - (P.z - ciZ0 + CI_MM_PAD) * s;
  c.drawImage(mm.cv, ox, oz);
  // 옷장 (밖에 있으면 테두리에 작은 점으로 방향만)
  const tx = (x) => cx + (x - P.x) * s, tz = (z) => cy + (z - P.z) * s;
  const hide = typeof STK !== 'undefined' ? STK.hide : null;
  const now = performance.now() / 1000, R = W / 2 - 14;
  for (const w of fl.wardrobes) {
    let x = tx(w.x), y = tz(w.z);
    const dd = Math.hypot(x - cx, y - cy);
    if (dd > R) {
      x = cx + (x - cx) / dd * R; y = cy + (y - cy) / dd * R;
      c.fillStyle = 'rgba(232,160,90,0.85)'; c.strokeStyle = '#2a170a'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, 7.5, 0, TAU); c.fill(); c.stroke();
      continue;
    }
    const isHid = !!hide && hide.floor === w.floor && hide.doorIdx === w.doorIdx;
    const near = Math.hypot(P.x - w.x, P.z - w.z) < 4;
    ciMMWardrobe(c, x, y, w, s, isHid, near ? 0.6 + 0.4 * Math.sin(now * 6) : 0);
  }
  // 시야 부채꼴 + 플레이어 화살표 (1인칭이라 둘 다 cam.yaw 기준)
  c.translate(cx, cy);
  c.rotate(-cam.yaw);
  c.fillStyle = 'rgba(255,255,255,0.16)';
  c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 56, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); c.closePath(); c.fill();
  c.fillStyle = '#ffffff'; c.strokeStyle = '#1a1f3a'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, -13); c.lineTo(9, 9); c.lineTo(0, 4.5); c.lineTo(-9, 9); c.closePath(); c.fill(); c.stroke();
  c.restore();
  // 북쪽 표시 + 층 이름
  c.fillStyle = '#ffffff'; c.font = '26px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('N', cx, 22);
  const label = (f + 1) + 'F ' + fl.theme;
  c.font = '27px ' + FONT;
  const tw = c.measureText(label).width + 24, ly = Hh - 42;
  c.fillStyle = 'rgba(10,8,20,0.78)';
  c.beginPath(); if (c.roundRect) c.roundRect(cx - tw / 2, ly - 18, tw, 36, 18); else c.rect(cx - tw / 2, ly - 18, tw, 36); c.fill();
  c.fillStyle = '#ffe6b8'; c.fillText(label, cx, ly + 1);
}
