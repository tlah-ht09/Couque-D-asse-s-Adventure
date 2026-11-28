'use strict';
// 끝없는 하늘 탑 · 오늘의 도전 (절차 생성 트랙)
// =====================================================================
//  절차 생성 트랙: 끝없는 하늘 탑 / 오늘의 도전
// =====================================================================
const TOWER_C = new THREE.Vector3(-110, 0, -110);
const DAILY_C = new THREE.Vector3(110, 0, 110);
const TRACK_SIDE = 44, CORNER_H = 2.5;
const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DAILY_THEME = { grass: 0xffe08a, dirt: 0xc08a4a, dirt2: 0x8a5a2b };

function makeTrack(name, origin, seedFn, diffFn, maxFloors) {
  return { name, origin, seed: seedFn, diff: diffFn, max: maxFloors, specs: [], built: new Map(), pairs: [] };
}
const TT = makeTrack('tower', { x: TOWER_C.x, top: 0, z: TOWER_C.z - 18 }, (k) => hashStr('tower-' + TT.runSeed + '-' + k), (k) => Math.min(1, (k - 1) / 70), Infinity);
TT.runSeed = (Math.random() * 1e9) | 0;
// 새 판: 시드를 바꾸고 지어둔 층을 모두 버림 → 매번 다른 탑
function reseedTower() {
  TT.runSeed = (Math.random() * 1e9) | 0;
  for (const b of TT.built.values()) disposeBuild(b);
  TT.built.clear(); if (TT.pairsByFloor) TT.pairsByFloor.clear();
  TT.specs.length = 0; TT.lastLo = TT.lastHi = null;
}
// 구간 템플릿 (타워오브헬식 기믹 단위). seq: 종류 이름 | '*' 아무거나 | 'A','B' 이 층에서 고정된 랜덤 종류
// lat: rand/zig/line/arc/wave · dy: stairs/flat · sc: 발판 크기 배율 · sp: 이동 속도 배율
const TPLS = [
  { id: 'mix', name: '뒤죽박죽', w: 3, seq: ['*'] },
  { id: 'aaa', name: '한 우물만', min: 3, w: 1.5, seq: ['A'], lat: 'arc' },
  { id: 'ab', name: '반복 리듬', min: 4, w: 2, seq: ['A', 'B'], lat: 'wave' },
  { id: 'stairs', name: '하늘 계단', w: 1, seq: ['n'], lat: 'arc', dy: 'stairs', sc: 0.85 },
  { id: 'disczig', name: '지그재그 원판', min: 2, w: 1, need: ['disc'], seq: ['disc'], lat: 'zig' },
  { id: 'beamline', name: '외나무 다리', min: 3, w: 1, need: ['beam'], seq: ['beam'], lat: 'line', dy: 'flat' },
  { id: 'movers', name: '흔들리는 길', min: 4, w: 1, need: ['ml'], seq: ['ml'], lat: 'line' },
  { id: 'tiny', name: '바늘 발판', min: 5, w: 0.8, seq: ['n'], lat: 'zig', sc: 0.6 },
  { id: 'fadeway', name: '사라지는 복도', min: 6, w: 1, need: ['fade'], seq: ['fade'], lat: 'line' },
  { id: 'tramp', name: '트램펄린 연쇄', min: 7, w: 0.8, need: ['bounce'], seq: ['bounce', 'n'] },
  { id: 'icezig', name: '미끄럼 지그재그', min: 8, w: 1, need: ['ice'], seq: ['ice'], lat: 'zig' },
  { id: 'lavarun', name: '용암 건너기', min: 9, w: 0.8, need: ['lava'], seq: ['lava', 'n'] },
  { id: 'elev', name: '엘리베이터', min: 10, w: 0.8, need: ['my'], seq: ['my', 'n'], lat: 'wave' },
  { id: 'spin', name: '회전 지옥', min: 12, w: 0.8, need: ['sweep'], seq: ['sweep', 'disc'] },
  { id: 'rush', name: '고속 셔틀', min: 15, w: 0.7, need: ['mf', 'ml'], seq: ['mf', 'ml'], sp: 1.25 },
];
function pickTpl(rng, kEff, avail, prevId) {
  const ok = TPLS.filter((t) => kEff >= (t.min || 0) && (t.need || []).every((n) => avail.includes(n)));
  const tw = ok.reduce((a, t) => a + t.w, 0);
  for (let tries = 0; ; tries++) {
    let r = rng() * tw, pick = ok[0];
    for (const t of ok) { if ((r -= t.w) <= 0) { pick = t; break; } }
    if (pick.id !== prevId || tries >= 2) return pick;
  }
}
let DT = null; // 오늘의 도전 트랙 (날짜별로 다시 만듦)
function makeDailyTrack(key) {
  return makeTrack('daily', { x: DAILY_C.x, top: 0, z: DAILY_C.z - 18 }, (k) => hashStr('daily-' + key + '-' + k), (k) => [0.3, 0.45, 0.6, 0.75][k - 1], 4);
}

// ---------- 층 설계 (순수 계산) ----------
function trackSpec(T, k) {
  for (let j = T.specs.length + 1; j <= k; j++) T.specs.push(genFloor(T, j));
  return T.specs[k - 1];
}
function genFloor(T, k) {
  const prev = k === 1 ? T.origin : T.specs[k - 2].end;
  const dirIdx = (k - 1) % 4;
  const rng = mulberry32(T.seed(k));
  const R = (a, b) => a + rng() * (b - a);
  const d = T.diff(k);
  const kEff = T.name === 'daily' ? Math.round(5 + 18 * d) : k;
  const gmin = lerp(1.5, 2.3, d), gmax = lerp(2.6, 3.5, d);
  const SPAN = TRACK_SIDE - 2 * CORNER_H;
  const table = [['n', 3]];
  if (kEff >= 2) table.push(['disc', 2]);
  if (kEff >= 3) table.push(['beam', 1 + d]);
  if (kEff >= 4) table.push(['ml', 1 + 2 * d]);
  if (kEff >= 6) table.push(['fade', 1 + 2 * d]);
  if (kEff >= 7) table.push(['bounce', 0.7]);
  if (kEff >= 8) table.push(['ice', 0.8 + d]);
  if (kEff >= 9) table.push(['lava', 0.6 + d]);
  if (kEff >= 10) table.push(['my', 0.8 + d]);
  if (kEff >= 12) table.push(['sweep', 0.6 + d]);
  if (kEff >= 15) table.push(['mf', 0.5 + d]);
  const tw = table.reduce((a, b) => a + b[1], 0);
  const pickKind = () => { let r = rng() * tw; for (const [n, w] of table) { if ((r -= w) <= 0) return n; } return 'n'; };
  const mkItem0 = (kind) => {
    const it = { kind, w: 3, dd: 3, ext: 0 };
    switch (kind) {
      case 'disc': { const r = R(lerp(1.6, 1.05, d), lerp(1.9, 1.35, d)); it.r = r; it.w = it.dd = 2 * r; break; }
      case 'beam': it.w = R(1.0, 1.4); it.dd = R(4, 6.5); break;
      case 'ml': it.w = it.dd = R(lerp(2.8, 2, d), lerp(3.2, 2.4, d)); it.move = { a: 'l', amp: R(2, 3.4), spd: R(lerp(0.9, 1.5, d), lerp(1.3, 2.3, d)), ph: R(0, 6.28) }; break;
      case 'fade': it.w = it.dd = R(lerp(3, 2, d), lerp(3.4, 2.5, d)); break;
      case 'bounce': it.w = it.dd = 2.6; break;
      case 'ice': it.w = R(2.6, 3.4); it.dd = R(3, 4); break;
      case 'lava': it.w = 5.6; it.dd = 6; break;
      case 'my': it.w = it.dd = R(2.2, 2.8); it.move = { a: 'y', amp: R(0.8, 1.2), spd: R(1.2, 1.8), ph: R(0, 6.28) }; break;
      case 'sweep': { const r = R(3.4, 4.3); it.r = r; it.w = it.dd = 2 * r; it.spd = (rng() < 0.5 ? -1 : 1) * R(lerp(1.5, 2.3, d), lerp(2, 2.9, d)); break; }
      case 'mf': it.w = it.dd = R(2.6, 3.2); it.move = { a: 'f', amp: R(2.5, 3.4), spd: R(0.7, 1.1), ph: R(0, 6.28) }; it.ext = 2 * it.move.amp; break;
      default: it.w = R(lerp(3.2, 1.8, d), lerp(3.6, 2.5, d)); it.dd = R(lerp(3, 1.8, d), lerp(3.6, 2.6, d));
    }
    return it;
  };
  // 0) 구간 템플릿
  const avail = table.map((t) => t[0]);
  const tpl = pickTpl(rng, kEff, avail, k > 1 ? T.specs[k - 2].tpl : null);
  const mir = rng() < 0.5 ? -1 : 1;
  const mkItem = (kind) => {
    const it = mkItem0(kind);
    if (tpl.sc && ['n', 'fade', 'ice', 'disc'].includes(kind)) {
      it.w = Math.max(1.1, it.w * tpl.sc); it.dd = Math.max(1.1, it.dd * tpl.sc);
      if (it.r) { it.r = it.w / 2; it.dd = it.w; }
    }
    if (tpl.sp) { if (it.move) it.move.spd *= tpl.sp; if (it.spd) it.spd *= tpl.sp; }
    return it;
  };
  const slot = {};
  const pickSlot = (s) => {
    if (slot[s]) return slot[s];
    let kd = 'n';
    for (let i = 0; i < 6; i++) { kd = pickKind(); if (kd !== 'n' && !Object.values(slot).includes(kd)) break; }
    return (slot[s] = kd);
  };
  const kindAt = (j) => {
    const s = tpl.seq[j % tpl.seq.length];
    return s === '*' ? pickKind() : (s === 'A' || s === 'B') ? pickSlot(s) : s;
  };
  // 1) 아이템 고르기
  const items = [];
  const gNom = (gmin + gmax) / 2;
  let used = 0;
  while (used + (items.length + 1) * gNom < SPAN - 2) {
    let kind = kindAt(items.length);
    const last = items[items.length - 1];
    if (last && last.kind === 'bounce' && !['n', 'disc', 'ice'].includes(kind)) kind = 'n';
    if (last && (last.kind === 'my') && kind === 'bounce') kind = 'n';
    const it = mkItem(kind);
    items.push(it);
    used += it.dd + it.ext;
  }
  // 2) 간격 맞추기
  const gapRange = (j) => {
    const before = items[j - 1];
    if (before && before.kind === 'bounce') return [1.5, 3.0];
    return [gmin, gmax];
  };
  for (let guard = 0; guard < 20; guard++) {
    const D = items.reduce((a, it) => a + it.dd + it.ext, 0);
    const free = SPAN - D;
    let lo = 0, hi = 0;
    for (let j = 0; j <= items.length; j++) { const [a, b] = gapRange(j); lo += a; hi += b; }
    if (free < lo) {
      let idx = -1;
      for (let j = items.length - 1; j >= 0; j--) if (items[j].kind !== 'bounce' || j === items.length - 1) { idx = j; break; }
      if (idx < 0) idx = items.length - 1;
      if (items[idx] && items[idx - 1] && items[idx - 1].kind === 'bounce') idx = idx - 1;
      items.splice(idx, 1);
      continue;
    }
    if (free > hi) { items.push(mkItem('n')); continue; }
    break;
  }
  const D = items.reduce((a, it) => a + it.dd + it.ext, 0);
  const free = SPAN - D;
  const ranges = items.map((_, j) => gapRange(j)).concat([gapRange(items.length)]);
  const lo = ranges.reduce((a, r) => a + r[0], 0), hi = ranges.reduce((a, r) => a + r[1], 0);
  const tt = hi > lo ? clamp((free - lo) / (hi - lo), 0, 1) : 0.5;
  const gaps = ranges.map(([a, b]) => a + (b - a) * tt);
  for (let j = 0; j + 1 < gaps.length; j++) {
    const [a1, b1] = ranges[j], [a2, b2] = ranges[j + 1];
    const delta = R(-0.4, 0.4);
    const nd = clamp(delta, Math.max(a1 - gaps[j], gaps[j + 1] - b2), Math.min(b1 - gaps[j], gaps[j + 1] - a2));
    gaps[j] += nd; gaps[j + 1] -= nd;
  }
  // 3) 위치/높이
  let F = CORNER_H, L = 0, top = prev.top, prevW = 5, prevKind = 'corner';
  const out = [];
  const latS = lerp(1, 2.6, d);
  let rise = 0;
  items.forEach((it, j) => {
    F += gaps[j];
    const amp = it.move && it.move.a === 'f' ? it.move.amp : 0;
    const cF = F + amp + it.dd / 2;
    F = cF + it.dd / 2 + amp;
    const nI = items.length;
    let tgt;
    switch (tpl.lat) {
      case 'zig': tgt = (j % 2 ? 1 : -1) * mir * lerp(1.6, 2.6, d); break;
      case 'line': tgt = R(-0.3, 0.3); break;
      case 'arc': tgt = mir * (Math.sin(Math.PI * (j + 0.5) / nI) * 5 - 2.5); break;
      case 'wave': tgt = mir * Math.sin(j * 1.4) * 2.4; break;
      default: tgt = L + R(-latS, latS);
    }
    let nl = clamp(tgt, -3, 3);
    const lim = (prevW + it.w) / 2 + 0.2;
    nl = clamp(nl, L - lim, L + lim);
    if (j === items.length - 1) nl = clamp(nl, -(2.5 + it.w / 2 + 0.2), 2.5 + it.w / 2 + 0.2);
    let dy = R(-0.5, lerp(1.0, 1.4, d));
    if (tpl.dy === 'stairs') dy = R(0.8, lerp(1.0, 1.4, d));
    else if (tpl.dy === 'flat') dy = R(-0.3, 0.3);
    if (prevKind === 'bounce') dy = R(3, 4.5);
    else if (it.kind === 'my' || prevKind === 'my') dy = R(-0.2, 0.4);
    else if (it.kind === 'sweep' || it.kind === 'lava') dy = Math.min(dy, 0.6);
    top += dy; rise += dy;
    out.push(Object.assign({}, it, { F: cF, L: nl, top, dy }));
    L = nl; prevW = it.w; prevKind = it.kind;
  });
  let dyEnd = prevKind === 'bounce' ? R(3, 4) : prevKind === 'my' ? R(-0.2, 0.4) : R(0, 1);
  if (rise + dyEnd < 3 && prevKind !== 'my' && prevKind !== 'bounce') {
    let need = 3 - (rise + dyEnd);
    const add = Math.min(need, 1.3 - dyEnd); dyEnd += add; need -= add;
    if (need > 0) {
      // 앞 아이템들 높이를 조금씩 올림 (이후 전체가 같이 올라감)
      for (let j = 0; j < out.length && need > 0; j++) {
        const o = out[j], pk = j ? out[j - 1].kind : 'corner';
        if (o.kind === 'my' || pk === 'my' || pk === 'bounce' || o.kind === 'sweep' || o.kind === 'lava') continue;
        const room = Math.max(0, 1.3 - o.dy);
        const a = Math.min(room, need);
        if (a <= 0) continue;
        o.dy += a; need -= a;
        for (let q = j; q < out.length; q++) out[q].top += a;
      }
    }
  }
  const endTop = (out.length ? out[out.length - 1].top : prev.top) + dyEnd;
  const [fx, fz] = DIRS4[dirIdx];
  const end = { x: prev.x + fx * TRACK_SIDE, top: endTop, z: prev.z + fz * TRACK_SIDE };
  return { k, dirIdx, start: prev, end, items: out, tpl: tpl.id, tplName: tpl.name, theme: 1 + (Math.floor((k - 1) / 10) % 5) };
}

// ---------- 층 만들기 ----------
function captureBuild(fn) {
  const sc = scene.children.length, co = colliders.length, mv = movers.length, fd = fades.length, sw = sweepers.length, lb = labels.length;
  fn();
  return { objs: scene.children.slice(sc), cols: colliders.slice(co), mvs: movers.slice(mv), fds: fades.slice(fd), sws: sweepers.slice(sw), lbs: labels.slice(lb) };
}
function removeFrom(arr, items) {
  if (!items.length) return;
  const set = new Set(items);
  for (let i = arr.length - 1; i >= 0; i--) if (set.has(arr[i])) arr.splice(i, 1);
}
function disposeBuild(b) {
  for (const o of b.objs) {
    o.removeFromParent();
    o.traverse && o.traverse((m) => { if (m.material && m.material.userData && m.material.userData.own) m.material.dispose(); });
  }
  removeFrom(colliders, b.cols); removeFrom(movers, b.mvs); removeFrom(fades, b.fds); removeFrom(sweepers, b.sws); removeFrom(labels, b.lbs);
  for (const L of b.lbs) { L.tex.dispose(); L.sp.material.dispose(); }
  if (P.ground && b.cols.includes(P.ground)) { P.ground = null; P.grounded = false; }
}
function buildFloor(T, k) {
  const sp = trackSpec(T, k);
  const [fx, fz] = DIRS4[sp.dirIdx], lx = -fz, lz = fx;
  const alongZ = fx === 0;
  const W = (F, L) => [sp.start.x + fx * F + lx * L, sp.start.z + fz * F + lz * L];
  const th = sp.theme;
  let last = null;
  const pairs = [];
  sp.items.forEach((it, j) => {
    const [x, z] = W(it.F, it.L);
    const round = it.kind === 'disc' || it.kind === 'sweep';
    const kind = it.kind === 'disc' ? 'cyl' : it.kind === 'ml' || it.kind === 'my' || it.kind === 'mf' || it.kind === 'beam' || it.kind === 'lava' ? 'n' : it.kind;
    const c = makePlatform(th, kind, x, it.top, z, {
      round, r: it.r, sx: alongZ ? it.w : it.dd, sz: alongZ ? it.dd : it.w, h: 0.8, idx: k + j, v: 20, spd: it.spd,
      move: it.move && moveVec(it.move, fx, fz, lx, lz),
    });
    c.track = T; c.tfloor = k; c.zone = -1;
    if (it.kind === 'lava') {
      for (const [fo, l0, l1] of [[-it.dd / 4, -it.w / 2, it.w / 2 - 2.2], [it.dd / 4, -it.w / 2 + 2.2, it.w / 2]]) {
        const lm = (l0 + l1) / 2, lw = l1 - l0;
        const [bx, bz] = W(it.F + fo, it.L + lm);
        const kc = boxPlat(bx, it.top + 0.35, bz, alongZ ? lw : 1, 0.36, alongZ ? 1 : lw, M.lava, { kill: true });
        kc.track = T; kc.tfloor = k;
      }
    }
    pairs.push([last, c]);
    last = c;
  });
  // 끝 모서리 (체크포인트 / 결승)
  const isEnd = T.max !== Infinity && k === T.max;
  const milestone = T.name === 'tower' && k % 10 === 0;
  const cm = isEnd ? M.finish : milestone ? M.gold : M.cp;
  const corner = boxPlat(sp.end.x, sp.end.top, sp.end.z, 5, 1, 5, cm, {});
  corner.track = T; corner.tfloor = k; corner.tcorner = k;
  if (isEnd) corner.trackFinish = true;
  pairs.push([last, corner]);
  // 깃발
  const px = sp.end.x + 2.1, pz = sp.end.z + 2.1;
  mesh(G.cyl8, M.pole, px, sp.end.top + 1.4, pz, 0.08, 2.8, 0.08);
  const fm = new THREE.MeshStandardMaterial({ color: 0x8892b0, flatShading: true, side: THREE.DoubleSide });
  fm.userData.own = true;
  corner.flag = mesh(G.box, fm, px + 0.55, sp.end.top + 2.45, pz, 1.1, 0.7, 0.06);
  const lines = T.name === 'tower'
    ? (milestone ? [{ t: k + '층', c: '#ffcf3f', s: 64 }, { t: '보석 +' + (10 + k / 10), c: '#7af0ff', s: 34 }] : [{ t: k + '층', c: '#ffffff', s: 60 }]).concat([{ t: '▶ ' + trackSpec(T, k + 1).tplName, c: '#c3a6ff', s: 30 }])
    : (isEnd ? [{ t: '결승', c: '#ffcf3f', s: 60 }] : [{ t: k + ' / ' + T.max + ' 구간', c: '#ffffff', s: 50 }]);
  makeLabel(lines, { w: 256, h: T.name === 'tower' ? 176 : 128, sx: milestone || isEnd ? 3.6 : 2.8, pos: new THREE.Vector3(sp.end.x, sp.end.top + 3.9, sp.end.z), noBg: true });
  if (isEnd) addPortal(sp.end.x - 1.4, sp.end.top, sp.end.z - 1.4, 0, 0);
  T.pairsByFloor = T.pairsByFloor || new Map();
  T.pairsByFloor.set(k, pairs);
}
function ensureFloors(T, lo, hi) {
  for (const [k, b] of T.built) if (k < lo || k > hi) { disposeBuild(b); T.built.delete(k); if (T.pairsByFloor) T.pairsByFloor.delete(k); }
  for (let k = Math.max(1, lo); k <= Math.min(hi, T.max); k++) if (!T.built.has(k)) T.built.set(k, adoptBuild(captureBuild(() => buildFloor(T, k)), T.name));
}
function trackPairs(T) {
  const out = [];
  const keys = [...T.built.keys()].sort((a, b) => a - b);
  for (const k of keys) {
    const ps = T.pairsByFloor.get(k);
    const prevCorner = k === 1 ? T.startCol : (T.built.has(k - 1) ? T.built.get(k - 1).cols.find((c) => c.tcorner === k - 1) : null);
    for (const [a, b] of ps) { const A = a || prevCorner; if (A) out.push([A, b]); }
  }
  return out;
}

// ---------- 섬 / 입구 ----------
let towerSign = null, towerCont = null, dailySign = null;
function gate(x, top, z, color, emissive, flags, lines) {
  const m = mat(color, { emissive, emissiveIntensity: 0.9 });
  const c = cylPlat(x, top + 0.25, z, 1.5, 0.25, m, flags);
  const ring = mesh(G.torus, m, x, top + 2.1, z, 1.55, 1.55, 1.55, scene, false, false);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.45, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  disc.position.set(x, top + 2.1, z);
  scene.add(disc);
  ring.rotation.y = disc.rotation.y = Math.atan2(x, z);
  portals.push({ ring, disc, x, y: top, z });
  const lab = makeLabel(lines, { sx: 4.2, pos: new THREE.Vector3(x, top + 4.6, z) });
  return { c, lab };
}
function buildTracks() {
  // 허브 입구
  const tg = gate(-15.6, 0, -15.6, 0xc3a6ff, 0x6b3fd8, { towerGate: true }, [{ t: '끝없는 하늘 탑', c: '#c3a6ff' }, { t: '입장', s: 34 }]);
  towerSign = tg.lab;
  const dg = gate(15.6, 0, 15.6, 0xffd166, 0xc07a00, { dailyGate: true }, [{ t: '오늘의 도전', c: '#ffd166' }, { t: '입장', s: 34 }]);
  dailySign = dg.lab;
  // 탑 섬
  const ti = island(TOWER_C.x, 0, TOWER_C.z, 14, THEMES[4], { towerIsland: true });
  ti.track = TT; ti.tfloor = 0;
  decorate(4, TOWER_C.x, 0, TOWER_C.z, 14);
  const s0 = boxPlat(TT.origin.x, 0, TT.origin.z, 5, 1, 5, M.start, {});
  s0.track = TT; s0.tfloor = 0; s0.tcorner = 0;
  TT.startCol = s0;
  makeLabel([{ t: '1층으로', c: '#ffffff', s: 50 }], { w: 256, h: 128, sx: 2.8, pos: new THREE.Vector3(TT.origin.x, 3.4, TT.origin.z), noBg: true });
  addPortal(TOWER_C.x + 8, 0, TOWER_C.z + 5, 0, 0.4);
  const cm = mat(0x7af0ff, { emissive: 0x2fc6ff, emissiveIntensity: 0.7 });
  const cc = cylPlat(TOWER_C.x - 8, 0.25, TOWER_C.z + 5, 1.4, 0.25, cm, { towerCont: true });
  cc.track = TT; cc.tfloor = 0;
  towerCont = makeLabel(['', ''], { sx: 3.6, pos: new THREE.Vector3(TOWER_C.x - 8, 3.4, TOWER_C.z + 5) });
  makeLabel([{ t: '끝없는 하늘 탑', c: '#c3a6ff', s: 56 }, { t: '층마다 보석과 영구 수입 +1%', s: 32 }], { sx: 6, pos: new THREE.Vector3(TOWER_C.x, 6.5, TOWER_C.z + 2), noBg: true });
  // 오늘의 도전 섬
  const di = island(DAILY_C.x, 0, DAILY_C.z, 14, DAILY_THEME, { dailyIsland: true });
  di.tfloor = 0;
  for (const [ox, oz] of [[-10, -3], [10, -3], [-7.5, -8.5], [7.5, -8.5], [-11, 3.5]]) tree(DAILY_C.x + ox, 0, DAILY_C.z + oz, rand(0.9, 1.1), 0xf2a541);
  addPortal(DAILY_C.x + 8, 0, DAILY_C.z + 5, 0, 0.4);
  dailyBoard = makeLabel(['', ''], { sx: 6, h: 300, pos: new THREE.Vector3(DAILY_C.x, 6.8, DAILY_C.z + 2), noBg: true });
}
let dailyBoard = null, dailyStartCol = null, dailyBuildKey = '';
function rebuildDaily() {
  const key = dateKey();
  if (dailyBuildKey === key) return;
  if (DT) { for (const b of DT.built.values()) disposeBuild(b); if (DT.startBuild) disposeBuild(DT.startBuild); }
  DT = makeDailyTrack(key);
  DT.startBuild = captureBuild(() => {
    const s0 = boxPlat(DT.origin.x, 0, DT.origin.z, 5, 1, 5, M.start, {});
    s0.track = DT; s0.tfloor = 0; s0.tcorner = 0; s0.dailyStart = true;
    DT.startCol = s0;
    makeLabel([{ t: '출발', c: '#ffffff', s: 56 }, { t: '밟으면 시간 측정', c: '#ffd166', s: 30 }], { w: 256, h: 160, sx: 3, pos: new THREE.Vector3(DT.origin.x, 3.6, DT.origin.z), noBg: true });
  });
  adoptBuild(DT.startBuild, 'daily');
  ensureFloors(DT, 1, 4);
  dailyBuildKey = key;
}
