'use strict';
// =====================================================================
//  쿠키성 내부 장식 (stage C): 층별 테마색, 카펫, 횃불, 기둥, 배너, 액자, 샹들리에,
//  8층 왕좌의 방, 옷장 꾸미기, 커튼 은신처.
//  - 반복 소품은 전부 InstancedMesh (재질+지오메트리별 1개), 새 조명 없음(emissive/Basic만)
//  - 충돌체는 기둥/단상/왕좌만 (floor.cols 에 넣어 층 전환 때 같이 켜고 꺼요)
// =====================================================================
const CD_THEMES = [
  { name: 'ruby',    carpet: 0xd32f4f, trim: 0xffd27a, banner: 0xe0405a },
  { name: 'caramel', carpet: 0xc88a3c, trim: 0xfff0c0, banner: 0xe0a050 },
  { name: 'mint',    carpet: 0x45c9a0, trim: 0xffffff, banner: 0x7be0c0 },
  { name: 'choco',   carpet: 0x6b3f2a, trim: 0xe0b070, banner: 0x8a5a3c },
  { name: 'candy',   carpet: 0xf06292, trim: 0xffffff, banner: 0xff8fb8 },
  { name: 'jelly',   carpet: 0x8e5fd0, trim: 0xf0d0ff, banner: 0xb388f0 },
  { name: 'lemon',   carpet: 0xf2d230, trim: 0xfff6b0, banner: 0xffe066 },
  { name: 'royal',   carpet: 0xb3122e, trim: 0xf5c542, banner: 0xc01838 },
];
const CD_FABRIC = [0xb03040, 0xc04050, 0xd06a40, 0x4a78c0, 0x3a5a8a, 0xff7ab0, 0x8e6fd0, 0xb3122e];
const cdWood = mat(0x9a6a40, { emissive: 0x4a2a14, emissiveIntensity: 0.3 });
const cdIron = mat(0x70767e, { emissive: 0x30343a, emissiveIntensity: 0.3 });
const cdMulti = mat(0xffffff, { emissive: 0x555555, emissiveIntensity: 0.4 });
const CASTLE_DECOR = { themes: CD_THEMES, stats: [], colliders: 0 };
const cdFlameMat = new THREE.MeshBasicMaterial({ color: 0xffa030 });
let cdT = 0;
function updateCastleDecor(dt) {
  if (typeof P !== 'undefined' && typeof inCastleIn === 'function' && !inCastleIn(P.x, P.y, P.z)) return;
  cdT += dt || 0;
  const a = Math.sin(cdT * 11) * 0.5 + Math.sin(cdT * 17.3 + 1) * 0.5;
  cdFlameMat.color.setRGB(1, 0.58 + a * 0.12, 0.13 + a * 0.05);
}

(function buildCastleDecor() {
  const geoOf = { box: G.box, cyl: G.cyl8, cylB: G.cyl, cone: G.cone, ico: G.ico };
  const gold = mat(0xf5c542, { emissive: 0xb88a10, emissiveIntensity: 0.5 });
  const dark = mat(0x4a3020, { emissive: 0x2a1810, emissiveIntensity: 0.3 });
  const stone = mat(0xf3e6d0, { emissive: 0xf3e6d0, emissiveIntensity: 0.3 });
  const wax = mat(0xfff4dc, { emissive: 0xfff4dc, emissiveIntensity: 0.6 });
  const cookie = mat(0xd9a05a, { emissive: 0x8a5a20, emissiveIntensity: 0.35 });
  const choc = mat(0x5a3420, { emissive: 0x2a1408, emissiveIntensity: 0.3 });
  const ruby = mat(0xff3050, { emissive: 0xff1030, emissiveIntensity: 0.7 });
  const canvasM = mat(0xffffff, { emissive: 0x555555, emissiveIntensity: 0.4 });
  const tmpC = new THREE.Color();
  const key = (i, j) => j * CI_N + i;
  const SC = CI_CELL / 4;   // 칸 4m 기준 치수 배율
  const cellOf = (x, z) => ({ i: Math.floor((x - ciX0) / CI_CELL), j: Math.floor((z - ciZ0) / CI_CELL) });

  for (const fl of CASTLE_IN.floors) {
    const f = fl.index, th = CD_THEMES[f], y0 = fl.y, rng = ciRng(7000 + f * 97);
    const mats = {
      carpet: mat(th.carpet, { emissive: th.carpet, emissiveIntensity: 0.25 }),
      ctrim: mat(th.trim, { emissive: th.trim, emissiveIntensity: 0.3 }),
      banner: mat(th.banner, { emissive: th.banner, emissiveIntensity: 0.3 }),
      gold, dark, stone, wax, cookie, choc, ruby, canvas: canvasM, flame: cdFlameMat,
    };
    const lists = {};
    const add = (m, g, x, y, z, sx, sy, sz, ry, c, rx, rz) => { (lists[m + '|' + g] || (lists[m + '|' + g] = [])).push({ x, y, z, sx, sy, sz, ry: ry || 0, rx: rx || 0, rz: rz || 0, c }); };
    const on = Math.abs(f - CASTLE_IN.shown) <= 1;
    let nCols = 0;
    const addCol = (x, y, z, hx, hy, hz) => { const c = addBoxCol(x, y, z, hx, hy, hz, {}); c.solid = on; fl.cols.push(c); nCols++; };

    // ---- 막힌 칸 ----
    const blocked = new Set();
    if (fl.stair) fl.stair.cells.forEach((c) => blocked.add(key(c.i, c.j)));
    fl.voidCells.forEach((c) => blocked.add(key(c.i, c.j)));
    fl.wardrobes.forEach((w) => blocked.add(key(w.i, w.j)));
    const arrKey = key(fl.arrival.i, fl.arrival.j);
    const pblocked = new Set(blocked); pblocked.add(arrKey);
    if (f === 0) blocked.add(arrKey);
    const free = (x, z, set) => { const c = cellOf(x, z); return ciIn(c.i, c.j) && !set.has(key(c.i, c.j)); };
    const TH = fl.halls.find((h) => h.throne) || null;
    const inThrone = (x, z) => TH && x > TH.x0 && x < TH.x1 && z > TH.z0 && z < TH.z1;
    const inAnyHallCell = (c) => fl.halls.some((h) => c.i >= h.i && c.i < h.i + h.w && c.j >= h.j && c.j < h.j + h.h);

    // ---- 주 통로 경로 (도착 -> 계단 앞 / 왕좌의 방) ----
    let goalKey = -1, goal = null;
    if (fl.stair) { const e = fl.stair.enter; goal = { i: Math.round((e.x - ciX0) / CI_CELL - 0.5), j: Math.round((e.z - ciZ0) / CI_CELL - 0.5) }; goalKey = key(goal.i, goal.j); }
    const isGoal = (c) => (goal ? key(c.i, c.j) === goalKey : (TH && c.i >= TH.i && c.i < TH.i + TH.w && c.j >= TH.j && c.j < TH.j + TH.h));
    const path = [];
    {
      const s0 = { i: fl.arrival.i, j: fl.arrival.j }, prev = new Map([[key(s0.i, s0.j), null]]), q = [s0];
      let end = null;
      for (let qi = 0; qi < q.length && !end; qi++) {
        const c = q[qi];
        if (isGoal(c)) { end = c; break; }
        for (const [dx, dz] of CI_DIRS) {
          const b = { i: c.i + dx, j: c.j + dz };
          if (!ciIn(b.i, b.j) || prev.has(key(b.i, b.j)) || fl.getWall(c, b)) continue;
          if (blocked.has(key(b.i, b.j)) && key(b.i, b.j) !== goalKey) continue;
          prev.set(key(b.i, b.j), c); q.push(b);
        }
      }
      for (let c = end; c; c = prev.get(key(c.i, c.j))) path.unshift(c);
    }
    const pathSet = new Set(path.map((c) => key(c.i, c.j)));
    // 카펫 (칸 중심 사각 + 다음 칸까지 이음)
    for (let k = 0; k < path.length; k++) {
      const c = path[k];
      if (blocked.has(key(c.i, c.j)) && key(c.i, c.j) !== goalKey) continue;
      const cc = CASTLE_IN.cellCenter(c.i, c.j);
      add('ctrim', 'box', cc.x, y0 + 0.015, cc.z, 1.9 * SC, 0.03, 1.9 * SC);
      add('carpet', 'box', cc.x, y0 + 0.02, cc.z, 1.6 * SC, 0.04, 1.6 * SC);
      const n = path[k + 1];
      if (n && !(blocked.has(key(n.i, n.j)) && key(n.i, n.j) !== goalKey)) {
        const nc = CASTLE_IN.cellCenter(n.i, n.j), mx = (cc.x + nc.x) / 2, mz = (cc.z + nc.z) / 2, h = cc.z === nc.z;
        add('ctrim', 'box', mx, y0 + 0.015, mz, h ? CI_CELL : 1.9 * SC, 0.03, h ? 1.9 * SC : CI_CELL);
        add('carpet', 'box', mx, y0 + 0.02, mz, h ? CI_CELL : 1.6 * SC, 0.04, h ? 1.6 * SC : CI_CELL);
      }
    }

    // ---- 벽 소품 슬롯 ----
    const wpos = (s, off, dt) => { const h = s.w.axis === 'x', n = s.side * (s.w.thick / 2 + off), t = s.t + (dt || 0); return h ? { x: t, z: s.w.cz + n } : { x: s.w.cx + n, z: t }; };
    const wsz = (s, al, nr) => (s.w.axis === 'x' ? [al, nr] : [nr, al]);
    const torch = (s) => {
      let p = wpos(s, 0.05), z = wsz(s, 0.12, 0.1);
      add('dark', 'box', p.x, y0 + 2.2, p.z, z[0], 0.4, z[1]);
      p = wpos(s, 0.2); add('dark', 'cyl', p.x, y0 + 2.5, p.z, 0.13, 0.14, 0.13);
      add('flame', 'ico', p.x, y0 + 2.76, p.z, 0.11, 0.2, 0.11);
    };
    const banner = (s, sc) => {
      sc = sc || 1;
      const w = 0.95 * sc, h = 1.8 * sc, yc = sc > 1 ? y0 + 3.2 : y0 + 3.4;
      let p = wpos(s, 0.06), z = wsz(s, w, 0.06);
      add('banner', 'box', p.x, yc, p.z, z[0], h, z[1]);
      z = wsz(s, w, 0.07); add('gold', 'box', p.x, yc - h / 2 + 0.04, p.z, z[0], 0.08, z[1]);
      z = wsz(s, w + 0.25, 0.07); add('gold', 'box', p.x, yc + h / 2 + 0.05, p.z, z[0], 0.07, z[1]);
      p = wpos(s, 0.1); add('gold', 'ico', p.x, yc + 0.1 * sc, p.z, 0.16 * sc, 0.16 * sc, 0.16 * sc);
    };
    const frame = (s) => {
      let p = wpos(s, 0.04), z = wsz(s, 0.95, 0.06);
      add('gold', 'box', p.x, y0 + 2.3, p.z, z[0], 0.75, z[1]);
      p = wpos(s, 0.075); z = wsz(s, 0.8, 0.06);
      add('canvas', 'box', p.x, y0 + 2.3, p.z, z[0], 0.6, z[1], 0, rng());
    };
    const curtain = (s) => {
      const h = s.w.axis === 'x';
      let p = wpos(s, 0.85), z = wsz(s, 1.7, 0.12);
      add('carpet', 'box', p.x, y0 + 1.45, p.z, z[0], 2.7, z[1]);
      z = wsz(s, 2.0, 0.08); add('dark', 'box', p.x, y0 + 2.85, p.z, z[0], 0.08, z[1]);
      for (const dt of [-0.5, 0, 0.5]) { const q = wpos(s, 0.77, dt), zz = wsz(s, 0.1, 0.08); add('banner', 'box', q.x, y0 + 1.4, q.z, zz[0], 2.5, zz[1]); }
      const hp = wpos(s, 0.45);
      castleHides.push({ floor: f, x: hp.x, y: y0, z: hp.z, fx: h ? 0 : s.side, fz: h ? s.side : 0, kind: 'curtain' });
    };
    const pillar = (x, z) => {
      add('stone', 'box', x, y0 + 0.15, z, 1.0, 0.3, 1.0);
      add('stone', 'cyl', x, y0 + 3.0, z, 0.38, 5.4, 0.38);
      add('gold', 'box', x, y0 + 5.45, z, 0.9, 0.2, 0.9);
      add('gold', 'box', x, y0 + 5.45 + 0.17, z, 1.1, 0.14, 1.1);
      addCol(x, y0 + 3.0, z, 0.4, 3.0, 0.4);
    };
    const chandelier = (x, z, r, n) => {
      const y = y0 + 4.4;
      add('dark', 'box', x, y0 + 5.0, z, 0.06, 1.2, 0.06);
      add('gold', 'cyl', x, y, z, r, 0.08, r);
      add('gold', 'ico', x, y - 0.2, z, r * 0.22, r * 0.22, r * 0.22);
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2, cx = x + Math.cos(a) * r * 0.85, cz = z + Math.sin(a) * r * 0.85;
        add('wax', 'cyl', cx, y + 0.2, cz, 0.07, 0.3, 0.07);
        add('flame', 'ico', cx, y + 0.45, cz, 0.07, 0.12, 0.07);
      }
    };
    const findWall = (axis, line, t) => fl.walls.find((w) => (axis === 'x' ? (w.axis === 'x' && Math.abs(w.cz - line) < 0.1 && Math.abs(t - w.cx) <= w.len / 2 - 0.9) : (w.axis !== 'x' && Math.abs(w.cx - line) < 0.1 && Math.abs(t - w.cz) <= w.len / 2 - 0.9)));

    const slots = [];
    fl.walls.forEach((w, wi) => {
      const hz = w.axis === 'x', c0 = (hz ? w.cx : w.cz) - (w.len - w.thick) / 2, n = Math.round((w.len - w.thick) / CI_CELL);
      for (let k = 0; k < n; k++) for (const side of [1, -1]) {
        const t = c0 + CI_CELL / 2 + k * CI_CELL, nn = side * (w.thick / 2 + 1.0);
        const px = hz ? t : w.cx + nn, pz = hz ? w.cz + nn : t;
        if (!free(px, pz, pblocked) || inThrone(px, pz)) continue;
        slots.push({ w, side, t, px, pz, used: false, k, wi });
      }
    });
    // 커튼 은신처 1~3개 (홀 옆 우선, 주 경로 칸 제외)
    const curtCells = new Set();
    const cand = slots.filter((s) => { const c = cellOf(s.px, s.pz); return !pathSet.has(key(c.i, c.j)); });
    for (let k = cand.length - 1; k > 0; k--) { const m = Math.floor(rng() * (k + 1)); [cand[k], cand[m]] = [cand[m], cand[k]]; }
    cand.sort((a, b) => (inAnyHallCell(cellOf(b.px, b.pz)) ? 1 : 0) - (inAnyHallCell(cellOf(a.px, a.pz)) ? 1 : 0));
    const wantC = 2 + (rng() < 0.5 ? 1 : 0);
    let nCurt = 0;
    for (const s of cand) {
      if (nCurt >= wantC) break;
      const c = cellOf(s.px, s.pz), kk = key(c.i, c.j);
      if (curtCells.has(kk)) continue;
      curtCells.add(kk); s.used = true; curtain(s); nCurt++;
    }
    // ---- 층별 테마 소품 (벽 슬롯 + 홀 중앙; 충돌 없음, 벽/홀에만 붙여서 통로 안 막음) ----
    if (f < 7) {
      const fab = mat(CD_FABRIC[f], { emissive: CD_FABRIC[f], emissiveIntensity: 0.25 });
      mats.fabric = fab; mats.wood = cdWood; mats.iron = cdIron; mats.multi = cdMulti;
      const pw = (m, s, off, dt, y, al, sy, nr, c) => { const p = wpos(s, off, dt), z = wsz(s, al, nr); add(m, 'box', p.x, y0 + y, p.z, z[0], sy, z[1], 0, c); };
      const pc = (m, s, off, dt, y, d, hh) => { const p = wpos(s, off, dt); add(m, 'cyl', p.x, y0 + y, p.z, d, hh, d); };
      const pi = (m, s, off, dt, y, d, c) => { const p = wpos(s, off, dt); add(m, 'ico', p.x, y0 + y, p.z, d, d, d, 0, c); };
      const armor = (s) => { pw('stone', s, 0.45, 0, 0.05, 0.8, 0.1, 0.8); pc('iron', s, 0.45, 0, 0.55, 0.35, 0.9); pw('iron', s, 0.45, 0, 1.3, 0.6, 0.8, 0.4); pi('iron', s, 0.45, 0, 1.85, 0.35); pw('wood', s, 0.45, 0.5, 1.3, 0.06, 2.6, 0.06); };
      const counter = (s) => { pw('wood', s, 0.55, 0, 0.45, 2.6, 0.9, 1.0); pw('stone', s, 0.55, 0, 0.93, 2.7, 0.07, 1.1); pc('iron', s, 0.55, -0.7, 1.15, 0.4, 0.45); pc('iron', s, 0.55, 0.6, 1.1, 0.3, 0.35); };
      const stove = (s) => { pw('iron', s, 0.5, 0, 0.5, 1.3, 1.0, 0.9); pw('dark', s, 0.93, 0, 0.5, 0.8, 0.5, 0.05); pi('flame', s, 0.95, 0, 0.45, 0.25); pc('iron', s, 0.5, 0, 1.2, 0.5, 0.4); pw('iron', s, 0.3, 0, 2.4, 0.5, 2.8, 0.5); };
      const barrel = (s) => { const d = rng() - 0.5; pc('wood', s, 0.5, d, 0.5, 0.9, 1.0); pc('iron', s, 0.5, d, 0.3, 0.94, 0.1); pc('iron', s, 0.5, d, 0.75, 0.94, 0.1); };
      const sofa = (s) => { pw('fabric', s, 0.6, 0, 0.3, 2.6, 0.6, 1.0); pw('fabric', s, 0.25, 0, 0.85, 2.6, 0.9, 0.3); for (const g of [-1, 1]) pw('fabric', s, 0.6, g * 1.4, 0.5, 0.3, 0.7, 1.0); };
      const fire = (s) => { pw('stone', s, 0.45, 0, 1.3, 2.2, 2.6, 0.8); pw('dark', s, 0.87, 0, 0.6, 1.2, 1.1, 0.05); pi('flame', s, 0.88, 0, 0.45, 0.3); pw('wood', s, 0.5, 0, 2.65, 2.6, 0.15, 1.0); };
      const shelf = (s, books) => { pw('wood', s, 0.35, 0, 1.3, 2.2, 2.6, 0.5); if (books) for (let r = 0; r < 3; r++) pw('multi', s, 0.4, 0, 0.6 + r * 0.7, 1.9, 0.5, 0.45, rng()); };
      const desk = (s) => { pw('wood', s, 0.6, 0, 0.8, 1.6, 0.1, 0.9); for (const g of [-1, 1]) pw('wood', s, 0.6, g * 0.7, 0.4, 0.1, 0.8, 0.8); pw('multi', s, 0.6, 0.3, 0.92, 0.5, 0.14, 0.4, rng()); pw('wood', s, 1.5, 0, 0.45, 0.6, 0.1, 0.6); pw('wood', s, 1.8, 0, 0.9, 0.6, 0.8, 0.1); };
      const globe = (s) => { pc('wood', s, 0.5, 0, 0.1, 0.5, 0.2); pc('wood', s, 0.5, 0, 0.5, 0.1, 0.8); pi('multi', s, 0.5, 0, 1.2, 0.9, rng()); };
      const blocks = (s) => { for (let q = 0; q < 3; q++) { const z = 0.5 + rng() * 0.3, o = 0.6 + rng() * 0.6, d = (rng() - 0.5) * 2.4, c = rng(); pw('multi', s, o, d, z / 2, z, z, z, c); if (q === 0) pw('multi', s, o, d, z + 0.2, z * 0.7, 0.4, z * 0.7, rng()); } };
      const horse = (s) => { pw('wood', s, 0.6, 0, 0.85, 1.3, 0.5, 0.5); pw('wood', s, 0.6, 0.7, 1.3, 0.3, 0.5, 0.3); pw('multi', s, 0.6, 0.55, 1.2, 0.1, 0.5, 0.2, rng()); for (const g of [-1, 1]) { pw('wood', s, 0.6, g * 0.45, 0.5, 0.1, 0.5, 0.1); pw('wood', s, 0.38 + (g + 1) * 0.11, 0, 0.1, 1.7, 0.1, 0.1); } };
      const bed = (s) => { pw('wood', s, 1.6, 0, 0.3, 2.2, 0.5, 3.0); pw('fabric', s, 1.6, 0, 0.65, 2.0, 0.25, 2.8); pw('stone', s, 0.6, 0, 0.9, 1.4, 0.15, 0.5); pw('wood', s, 0.2, 0, 1.0, 2.2, 1.5, 0.15); for (const o of [0.15, 3.05]) for (const g of [-1, 1]) pc('wood', s, o, g * 1.05, 1.25, 0.12, 2.5); pw('fabric', s, 1.6, 0, 2.55, 2.2, 0.08, 3.0); };
      const dresser = (s) => { pw('wood', s, 0.4, 0, 0.55, 1.6, 1.1, 0.7); for (const g of [-1, 1]) pw('gold', s, 0.78, g * 0.4, 0.7, 0.2, 0.08, 0.04); };
      const night = (s, dt) => { pw('wood', s, 0.35, dt, 0.3, 0.6, 0.6, 0.5); pc('wax', s, 0.35, dt, 0.75, 0.07, 0.3); pi('flame', s, 0.35, dt, 0.97, 0.1); };
      const KINDS = [
        [[armor, 1]],
        [[(s) => { pw('wood', s, 0.45, 0, 0.45, 2.4, 0.9, 0.8); pc('gold', s, 0.45, -0.6, 1.05, 0.12, 0.3); pc('wax', s, 0.45, -0.6, 1.3, 0.07, 0.25); pi('flame', s, 0.45, -0.6, 1.48, 0.1); pc('gold', s, 0.45, 0.6, 1.05, 0.12, 0.3); pc('wax', s, 0.45, 0.6, 1.3, 0.07, 0.25); pi('flame', s, 0.45, 0.6, 1.48, 0.1); }, 1]],
        [[counter, 3], [stove, 1.5], [barrel, 2]],
        [[sofa, 2], [fire, 1], [(s) => shelf(s, false), 1]],
        [[(s) => shelf(s, true), 4], [desk, 1.5], [globe, 0.7]],
        [[blocks, 3], [horse, 1]],
        [[(s) => { bed(s); night(s, 1.7); night(s, -1.7); }, 2], [dresser, 2]],
      ];
      const PROB = [0.3, 0.3, 0.5, 0.4, 0.6, 0.4, 0.45];
      const kinds = KINDS[f], wsum = kinds.reduce((a, k) => a + k[1], 0), usedT = new Set();
      for (const s of slots) {
        if (s.used || rng() > PROB[f] || usedT.has(s.wi + '|' + s.side + '|' + (s.k - 1))) continue;
        let r = rng() * wsum, fn = kinds[0][0];
        for (const k of kinds) { if ((r -= k[1]) < 0) { fn = k[0]; break; } }
        fn(s); s.used = true; usedT.add(s.wi + '|' + s.side + '|' + s.k);
      }
      // 홀 중앙 소품
      for (const h of fl.halls) {
        if (h.throne || h.w < 2 || h.h < 2) continue;
        let ok = true;
        for (let i = h.i; i < h.i + h.w && ok; i++) for (let j = h.j; j < h.j + h.h; j++) if (blocked.has(key(i, j))) { ok = false; break; }
        if (!ok) continue;
        const lx = h.w >= h.h, cx = h.cx, cz = h.cz;
        const A = (m, g, a, b, y, sa, sy, sb, c) => add(m, g, lx ? cx + a : cx + b, y0 + y, lx ? cz + b : cz + a, lx ? sa : sb, sy, lx ? sb : sa, 0, c);   // a: 긴 축, b: 짧은 축
        const len = Math.min(10, (lx ? h.w : h.h) * CI_CELL - 8);
        if (f === 1) {
          A('wood', 'box', 0, 0, 0.8, len, 0.12, 1.4); A('wood', 'box', 0, 0, 0.4, len - 0.6, 0.75, 0.5);
          for (let a = -len / 2 + 0.9; a <= len / 2 - 0.8; a += 1.5) for (const g of [-1, 1]) { A('wood', 'box', a, g * 1.25, 0.45, 0.55, 0.1, 0.55); A('wood', 'box', a, g * 1.5, 0.9, 0.55, 0.8, 0.1); }
          for (const a of [-len / 4, len / 4]) { A('gold', 'cyl', a, 0, 0.95, 0.14, 0.3, 0.14); A('wax', 'cyl', a, 0, 1.25, 0.07, 0.3, 0.07); A('flame', 'ico', a, 0, 1.45, 0.1, 0.1, 0.1); }
        } else if (f === 2) {
          A('wood', 'box', 0, 0, 0.45, 3.2, 0.9, 1.3); A('stone', 'box', 0, 0, 0.93, 3.3, 0.07, 1.4);
          A('iron', 'cyl', -0.8, 0, 1.15, 0.4, 0.45, 0.4); A('iron', 'cyl', 0.8, 0.2, 1.1, 0.3, 0.35, 0.3);
        } else if (f === 3) {
          A('fabric', 'box', 0, 0, 0.06, 6, 0.04, 4.4); A('wood', 'box', 0, 0, 0.3, 1.6, 0.1, 1.0);
          for (const g of [-1, 1]) { A('fabric', 'box', 0, g * 2.2, 0.3, 2.6, 0.6, 0.9); A('fabric', 'box', 0, g * 2.55, 0.8, 2.6, 0.9, 0.25); }
        } else if (f === 4) {
          for (const g of [-1, 1]) { A('wood', 'box', g * 3, 0, 0.8, 1.6, 0.1, 0.9); A('wood', 'box', g * 3, 0, 0.4, 1.4, 0.8, 0.12); A('wood', 'box', g * 3 + (g > 0 ? -1.1 : 1.1), 0, 0.45, 0.6, 0.1, 0.6); A('multi', 'box', g * 3, 0.1, 0.92, 0.5, 0.14, 0.4, rng()); }
          A('wood', 'cyl', 0, 4.2, 0.1, 0.5, 0.2, 0.5); A('wood', 'cyl', 0, 4.2, 0.5, 0.1, 0.8, 0.1); A('multi', 'ico', 0, 4.2, 1.2, 0.9, 0.9, 0.9, rng());
        } else if (f === 5) {
          A('fabric', 'box', 0, 0, 0.175, 6, 0.35, 6);
          for (let q = 0; q < 40; q++) A('multi', 'ico', (rng() - 0.5) * 5.4, (rng() - 0.5) * 5.4, 0.42 + rng() * 0.15, 0.55, 0.55, 0.55, rng());
          for (const [a, b] of [[-4.2, 3.6], [4.2, -3.6]]) A('multi', 'box', a, b, 0.04, 2.6, 0.06, 2.2, rng());
        }
      }
    }
    // 벽 장식: 2칸마다 액자/벽등, 사이사이 가끔 배너
    for (const s of slots) {
      if (s.used) continue;
      const r = rng();
      if ((s.k + s.wi) % 2 === 0) { if (r < 0.55) frame(s); else torch(s); } else if (r < 0.12) banner(s);
    }

    // ---- 홀: 기둥/샹들리에/러그 (왕좌의 방 제외) ----
    for (const h of fl.halls) {
      if (h.throne) continue;
      if (h.w < 2 || h.h < 2) continue;
      for (const [px, pz] of [[h.x0 + 1.4 * SC, h.z0 + 1.4 * SC], [h.x1 - 1.4 * SC, h.z0 + 1.4 * SC], [h.x0 + 1.4 * SC, h.z1 - 1.4 * SC], [h.x1 - 1.4 * SC, h.z1 - 1.4 * SC]]) if (free(px, pz, pblocked)) pillar(px, pz);
      const offs = h.w >= 4 ? [-CI_CELL, CI_CELL] : [0];
      for (const o of offs) {
        const x = h.cx + o, z = h.cz;
        if ([[0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9]].every(([dx, dz]) => free(x + dx * SC, z + dz * SC, pblocked))) chandelier(x, z, 0.9 * SC, 6);
      }
      let ok = true;
      for (let i = h.i; i < h.i + h.w && ok; i++) for (let j = h.j; j < h.j + h.h; j++) if (blocked.has(key(i, j))) { ok = false; break; }
      if (ok) {
        add('ctrim', 'box', h.cx, y0 + 0.015, h.cz, h.x1 - h.x0 - 2.1 * SC, 0.03, h.z1 - h.z0 - 2.1 * SC);
        add('carpet', 'box', h.cx, y0 + 0.02, h.cz, h.x1 - h.x0 - 2.5 * SC, 0.04, h.z1 - h.z0 - 2.5 * SC);
      }
    }

    // ---- 옷장 꾸미기 ----
    for (const w of fl.wardrobes) {
      const cc = w.cell, fx = w.fx, fz = w.fz, lx = -fz, lz = fx, uc = -(CI_CELL / 2 - CI_WALL_T / 2 - 0.05 - 0.6);
      const P2 = (u, v) => ({ x: cc.x + fx * u + lx * v, z: cc.z + fz * u + lz * v });
      const S2 = (a, b) => (fx !== 0 ? [a, b] : [b, a]);
      let p = P2(uc, 0), z = S2(1.4, 1.8);
      add('gold', 'box', p.x, y0 + 2.16, p.z, z[0], 0.12, z[1]);
      add('gold', 'ico', p.x, y0 + 2.34, p.z, 0.12, 0.12, 0.12);
      for (const sg of [1, -1]) {
        p = P2(uc + 0.95, sg * 0.96); add('gold', 'ico', p.x, y0 + 0.95, p.z, 0.05, 0.05, 0.05);
        p = P2(uc + 0.95, sg * 0.88); add('gold', 'ico', p.x, y0 + 0.95, p.z, 0.05, 0.05, 0.05);
      }
      w.kind = 'wardrobe';
    }
    castleHides.forEach((h) => { if (h.floor === f && !h.kind) h.kind = 'wardrobe'; });

    // ---- 8층: 왕좌의 방 ----
    if (TH) {
      let u = { x: 0, z: -1 };
      if (path.length >= 2) {
        const e = path[path.length - 1], p0 = path[path.length - 2];
        u = { x: -(p0.i - e.i), z: -(p0.j - e.j) };
      }
      if (Math.abs(u.x) + Math.abs(u.z) !== 1) u = { x: 0, z: -1 };
      const vv = { x: -u.z, z: u.x }, ax = Math.abs(u.x) === 1;
      const Au = (ax ? TH.w : TH.h) * CI_CELL / 2, Bv = (ax ? TH.h : TH.w) * CI_CELL / 2;
      const W = (a, b) => ({ x: TH.cx + u.x * a + vv.x * b, z: TH.cz + u.z * a + vv.z * b });
      const SZ = (sa, sb) => (ax ? [sa, sb] : [sb, sa]);
      const box = (m, g, a, b, yc, sa, sy, sb, c) => { const p = W(a, b), s = SZ(sa, sb); add(m, g, p.x, yc, p.z, s[0], sy, s[1], 0, c); };
      const solid = (a, b, yc, sa, sy, sb) => { const p = W(a, b), s = SZ(sa, sb); addCol(p.x, yc, p.z, s[0] / 2, sy / 2, s[1] / 2); };
      const aMax = Au - 0.2;
      // 단상 3단
      const steps = [{ a0: Au - 6.5, top: 0.35, hb: Math.min(7, Bv - 1) }, { a0: Au - 4.5, top: 0.7, hb: 5.5 }, { a0: Au - 2.5, top: 1.05, hb: 4 }];
      steps.forEach((s, k) => {
        const len = aMax - s.a0, ac = (s.a0 + aMax) / 2;
        box('cookie', 'box', ac, 0, y0 + s.top / 2, len, s.top, s.hb * 2);
        solid(ac, 0, y0 + s.top / 2, len, s.top, s.hb * 2);
        box('gold', 'box', s.a0 + 0.05, 0, y0 + s.top + 0.02, 0.1, 0.04, s.hb * 2);
        const aEnd = k < 2 ? steps[k + 1].a0 : Au - 2.0;
        box('carpet', 'box', (s.a0 + aEnd) / 2, 0, y0 + s.top + 0.03, aEnd - s.a0, 0.04, 2.4);
      });
      // 입구에서 단상까지 붉은 카펫
      const aS = -Au + 0.2, aE = steps[0].a0;
      box('ctrim', 'box', (aS + aE) / 2, 0, y0 + 0.015, aE - aS, 0.03, 2.8);
      box('carpet', 'box', (aS + aE) / 2, 0, y0 + 0.02, aE - aS, 0.04, 2.4);
      if (path.length) {
        const e = path[path.length - 1], ec = CASTLE_IN.cellCenter(e.i, e.j);
        const ae = (ec.x - TH.cx) * u.x + (ec.z - TH.cz) * u.z, be = (ec.x - TH.cx) * vv.x + (ec.z - TH.cz) * vv.z;
        if (Math.abs(be) > 0.1) {
          box('ctrim', 'box', ae, be / 2, y0 + 0.015, 1.9, 0.03, Math.abs(be) + 1.9);
          box('carpet', 'box', ae, be / 2, y0 + 0.02, 1.6, 0.04, Math.abs(be) + 1.6);
        }
      }
      // 쿠키 왕좌
      const dT = y0 + 1.05, aT = Au - 1.4;
      box('cookie', 'box', aT, 0, dT + 0.275, 1.8, 0.55, 2.4);
      solid(aT, 0, dT + 0.275, 1.8, 0.55, 2.4);
      for (const sg of [1, -1]) box('cookie', 'box', aT, sg * 1.35, dT + 0.8, 1.6, 0.5, 0.3);
      const dy = dT + 2.4, rz = ax ? Math.PI / 2 : 0, rx = ax ? 0 : Math.PI / 2;
      let p = W(Au - 0.62, 0);
      add('cookie', 'cylB', p.x, dy, p.z, 1.9, 0.3, 1.9, 0, null, rx, rz);
      p = W(Au - 0.42, 0);
      add('gold', 'cylB', p.x, dy, p.z, 2.05, 0.2, 2.05, 0, null, rx, rz);
      solid(Au - 0.6, 0, dy, 0.5, 3.8, 3.4);
      for (const [b, dh] of [[0.8, 0.6], [-0.9, 1.0], [0, -0.2], [1.0, -0.8], [-0.8, -0.9], [0.1, 1.3], [-1.3, 0.1], [1.3, 0.2]]) {
        p = W(Au - 0.82, b); add('choc', 'ico', p.x, dy + dh, p.z, 0.17, 0.17, 0.17);
      }
      p = W(Au - 0.6, 0); add('gold', 'ico', p.x, dT + 4.6, p.z, 0.25, 0.25, 0.25);
      // 왕관 + 받침대
      box('stone', 'box', Au - 1.2, 3, dT + 0.5, 0.8, 1.0, 0.8);
      solid(Au - 1.2, 3, dT + 0.5, 0.8, 1.0, 0.8);
      p = W(Au - 1.2, 3);
      add('gold', 'cyl', p.x, dT + 1.1, p.z, 0.3, 0.12, 0.3);
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; add('gold', 'cone', p.x + Math.cos(a) * 0.26, dT + 1.3, p.z + Math.sin(a) * 0.26, 0.07, 0.25, 0.07); }
      add('ruby', 'ico', p.x, dT + 1.2, p.z, 0.1, 0.1, 0.1);
      // 기둥 두 줄
      for (let a = -Au + 4; a < Au - 7; a += CI_CELL) for (const sg of [1, -1]) { const q = W(a, sg * (Bv / 2)); pillar(q.x, q.z); }
      // 샹들리에
      for (const [a, r, n] of [[-7 * SC, 1.0 * SC, 8], [0, 2.0 * SC, 14], [7 * SC, 1.0 * SC, 8]]) { const q = W(a, 0); chandelier(q.x, q.z, r, n); }
      // 둘레 벽: 큰 배너 / 횃불 / 뒤쪽 커튼 은신처
      const sides = [
        { axis: 'z', line: TH.x0, nx: 1, nz: 0, start: TH.z0, n: TH.h },
        { axis: 'z', line: TH.x1, nx: -1, nz: 0, start: TH.z0, n: TH.h },
        { axis: 'x', line: TH.z0, nx: 0, nz: 1, start: TH.x0, n: TH.w },
        { axis: 'x', line: TH.z1, nx: 0, nz: -1, start: TH.x0, n: TH.w },
      ];
      let curt = 0;
      for (const sd of sides) {
        const side = sd.axis === 'x' ? sd.nz : sd.nx;
        for (let k = 0; k <= sd.n; k++) for (const half of [0, 1]) {
          if ((k === 0 || k === sd.n) && half === 0 && false) continue;
          const t = sd.start + k * CI_CELL + (half ? CI_CELL / 2 : 0);
          if (k === sd.n && half) continue;
          const w = findWall(sd.axis, sd.line, t);
          if (!w) continue;
          const s = { w, side, t };
          const px = sd.axis === 'x' ? t : sd.line, pz = sd.axis === 'x' ? sd.line : t;
          const aa = (px - TH.cx) * u.x + (pz - TH.cz) * u.z, bb = (px - TH.cx) * vv.x + (pz - TH.cz) * vv.z;
          if (aa > Au - 1 && Math.abs(bb) < 3 * SC) continue;
          if (aa > Au - 1 && Math.abs(Math.abs(bb) - (Bv - CI_CELL / 2)) < 0.1 && curt < 2 && half) { curtain(s); curt++; continue; }
          if (half) banner(s, 1.6); else if (k > 0 && k < sd.n) torch(s);
        }
      }
    }

    // ---- InstancedMesh 생성 ----
    const d = new THREE.Object3D();
    let draws = 0, inst = 0;
    for (const kk of Object.keys(lists)) {
      const [m, g] = kk.split('|'), list = lists[kk];
      const im = new THREE.InstancedMesh(geoOf[g], mats[m], list.length);
      let hasC = false;
      list.forEach((b, k) => {
        d.position.set(b.x, b.y, b.z); d.rotation.set(b.rx, b.ry, b.rz); d.scale.set(b.sx, b.sy, b.sz); d.updateMatrix();
        im.setMatrixAt(k, d.matrix);
        if (b.c !== undefined && b.c !== null) { im.setColorAt(k, tmpC.setHSL(b.c, 0.55, 0.72)); hasC = true; }
      });
      im.instanceMatrix.needsUpdate = true;
      if (hasC && im.instanceColor) im.instanceColor.needsUpdate = true;
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
      fl.group.add(im);
      draws++; inst += list.length;
    }
    CASTLE_DECOR.stats.push({ floor: f + 1, draws, instances: inst, colliders: nCols });
    CASTLE_DECOR.colliders += nCols;
    fl.decor = { theme: th.name, themeName: fl.theme, path: path.length };
  }
})();
