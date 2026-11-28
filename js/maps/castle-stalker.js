'use strict';
// =====================================================================
//  쿠키성 내부의 괴물 (층마다 1마리, 플레이어가 있는 층의 괴물만 움직여요)
//  - 키 2.6m, 새카만 몸에 하얀 눈과 입만 보여요
//  - 인식: 아주 멀리서도 봐요(120m = 층 전체). 벽에는 시야가 막혀요 (격자로 판정)
//    새로 발견하려면: 괴물 앞쪽 부채꼴(코사인 ≥ MON_COS) 안에 내가 있고 + 괴물이 내 화면 안에 보여야 해요
//    이미 쫓는 중이면 벽만 없으면 계속 봐요 (뒤돌아 도망쳐도 바로 안 놓쳐요)
//  - 발견하면 괴성을 지르고 쫓아와요. 다른 층으로 가면 계단을 타고 따라와요
//  - 놓치면 마지막으로 본 위치 -> 그 방향으로 몇 칸 더 수색
//  - 옷장(E): 문이 80% 닫혀요. 들어가는 걸 봤으면 옷장 앞까지 와서 서성이지만 문은 못 열어요
// =====================================================================
const STK = {
  R: 120, SPEED: 9 * 1.25, WANDER: 3.2, CATCH: 1.1, SEEN_NEED: 1.5, SEEN_WIN: 2.5,
  LINGER_SEEN: 8, LINGER: 3, HOWL_CD: 8, HOWL_VOL: 0.06, SCARE_VOL: 0.22, TRACK: 1.3, BODY_R: 0.45, STEP_RANGE: 45,
  MON_COS: 0.5,       // 괴물 시야: 정면과 내 쪽 방향의 코사인 유사도가 이 값 이상이면 보여요 (0.5 = 좌우 60°, 총 120°)
  PLAYER_VIEW: true,  // true: 괴물이 내 화면(가로 시야각) 안에 있을 때만 새로 발견돼요
  pDist: 0, beatT: 0, vig: null,
  mons: [], time: 0, seenLog: [], seenNow: false, hide: null, kill: null, grace: 0, wasIn: false, pf: -1, hint: null, flash: null, doors: null,
};
const STK_DOOR_CLOSE = Math.acos(0.8);   // 문짝이 80% 가리는 각도

// ---------- 격자 도우미 ----------
function stkCell(x, z) {
  return { i: Math.max(0, Math.min(CI_N - 1, Math.floor((x - ciX0) / CI_CELL))), j: Math.max(0, Math.min(CI_N - 1, Math.floor((z - ciZ0) / CI_CELL))) };
}
function stkBlocked(fl) {
  if (!fl._blk) fl._blk = new Set([...(fl.stair ? fl.stair.cells : []), ...fl.voidCells].map((c) => c.i + ',' + c.j));
  return fl._blk;
}
// 두 점 사이에 벽이 없나 (같은 층)
function stkLOS(fl, ax, az, bx, bz) {
  let c = stkCell(ax, az);
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.4);
  for (let k = 1; k <= n; k++) {
    const t = k / n, nc = stkCell(ax + (bx - ax) * t, az + (bz - az) * t);
    if (nc.i === c.i && nc.j === c.j) continue;
    if (Math.abs(nc.i - c.i) + Math.abs(nc.j - c.j) === 1) { if (fl.getWall(c, nc)) return false; }
    else {
      const m1 = { i: nc.i, j: c.j }, m2 = { i: c.i, j: nc.j };
      if ((fl.getWall(c, m1) || fl.getWall(m1, nc)) && (fl.getWall(c, m2) || fl.getWall(m2, nc))) return false;
    }
    c = nc;
  }
  return true;
}
// 몸통 폭(±r)까지 벽에 안 걸리고 직선으로 갈 수 있나
function stkWideLOS(fl, ax, az, bx, bz, r) {
  const d = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / d * r, nz = (bx - ax) / d * r;
  return stkLOS(fl, ax, az, bx, bz) && stkLOS(fl, ax + nx, az + nz, bx + nx, bz + nz) && stkLOS(fl, ax - nx, az - nz, bx - nx, bz - nz);
}
// 벽 통과 방지: 막힌 칸 경계는 못 넘고, 벽·모서리 기둥에서 몸 반지름만큼 밀어내요
function stkCollide(fl, ox, oz, m) {
  const r = STK.BODY_R, oc = stkCell(ox, oz);
  let c = stkCell(m.x, m.z);
  const x0 = ciX0 + oc.i * CI_CELL, z0 = ciZ0 + oc.j * CI_CELL;
  if (c.i !== oc.i && fl.getWall(oc, { i: c.i, j: oc.j })) m.x = c.i > oc.i ? x0 + CI_CELL - r : x0 + r;
  if (c.j !== oc.j && fl.getWall(oc, { i: oc.i, j: c.j })) m.z = c.j > oc.j ? z0 + CI_CELL - r : z0 + r;
  c = stkCell(m.x, m.z);
  const cx0 = ciX0 + c.i * CI_CELL, cz0 = ciZ0 + c.j * CI_CELL;
  if (fl.getWall(c, { i: c.i - 1, j: c.j })) m.x = Math.max(m.x, cx0 + r);
  if (fl.getWall(c, { i: c.i + 1, j: c.j })) m.x = Math.min(m.x, cx0 + CI_CELL - r);
  if (fl.getWall(c, { i: c.i, j: c.j - 1 })) m.z = Math.max(m.z, cz0 + r);
  if (fl.getWall(c, { i: c.i, j: c.j + 1 })) m.z = Math.min(m.z, cz0 + CI_CELL - r);
  for (const gi of [c.i, c.i + 1]) for (const gj of [c.j, c.j + 1]) {   // 모서리
    const H = fl.H, V = fl.V;
    const post = (H[gj] && (H[gj][gi - 1] || H[gj][gi])) || (V[gj - 1] && V[gj - 1][gi]) || (V[gj] && V[gj][gi]);
    if (!post) continue;
    const px = ciX0 + gi * CI_CELL, pz = ciZ0 + gj * CI_CELL, dx = m.x - px, dz = m.z - pz, d = Math.hypot(dx, dz);
    if (d < r && d > 1e-4) { m.x = px + dx / d * r; m.z = pz + dz / d * r; }
  }
}
// BFS: from 칸에서 to 칸까지의 칸 목록 (계단/구멍 칸은 목적지일 때만 들어가요)
function stkPath(fl, from, to) {
  const blk = stkBlocked(fl), key = (c) => c.i * CI_N + c.j, prev = new Map([[key(from), null]]), q = [from];
  while (q.length) {
    const c = q.shift();
    if (c.i === to.i && c.j === to.j) break;
    for (const [dx, dz] of CI_DIRS) {
      const b = { i: c.i + dx, j: c.j + dz };
      if (b.i < 0 || b.j < 0 || b.i >= CI_N || b.j >= CI_N || prev.has(key(b)) || fl.getWall(c, b)) continue;
      if (blk.has(b.i + ',' + b.j) && !(b.i === to.i && b.j === to.j)) continue;
      prev.set(key(b), c); q.push(b);
    }
  }
  if (!prev.has(key(to))) return null;
  const out = [];
  for (let c = to; c; c = prev.get(key(c))) out.push(c);
  return out.reverse();
}
function stkFarCell(fl, from) {   // 도착 칸에서 가장 먼 칸 (괴물 시작 위치)
  const blk = stkBlocked(fl), d = new Map([[from.i + ',' + from.j, 0]]), q = [from];
  let far = from;
  while (q.length) {
    const c = q.shift(), dc = d.get(c.i + ',' + c.j);
    for (const [dx, dz] of CI_DIRS) {
      const b = { i: c.i + dx, j: c.j + dz }, k = b.i + ',' + b.j;
      if (b.i < 0 || b.j < 0 || b.i >= CI_N || b.j >= CI_N || d.has(k) || fl.getWall(c, b) || blk.has(k)) continue;
      d.set(k, dc + 1); q.push(b); far = b;
    }
  }
  return far;
}

// 그 자리 바닥 높이 (계단 칸이면 계단 높이, 아래층 계단이 뚫고 올라온 구멍 칸이면 그 계단 높이)
function stkGroundY(fl, x, z) {
  const c = stkCell(x, z);
  const onStair = (st, y0) => {
    if (!st || !st.cells.some((s) => s.i === c.i && s.j === c.j)) return null;
    const a = (x - st.start.x) * st.dir[0] + (z - st.start.z) * st.dir[1];
    return y0 + Math.max(0, Math.min(st.steps, Math.ceil(a / st.stepDepth))) * st.stepH;
  };
  let y = onStair(fl.stair, fl.y);
  if (y == null && fl.index > 0) y = onStair(CASTLE_IN.floors[fl.index - 1].stair, fl.y - CI_FLOOR_H);
  return y == null ? fl.y : y;
}

// ---------- 모습 ----------
const STK_BLACK = new THREE.MeshBasicMaterial({ color: 0x030303 });
const STK_RED = new THREE.MeshBasicMaterial({ color: 0xff1a1a, fog: false });
const STK_WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
function stkBuildMesh() {
  const g = new THREE.Group(), box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const legGeo = box(0.15, 1.15, 0.15); legGeo.translate(0, -0.575, 0);
  const armGeo = box(0.1, 1.75, 0.1); armGeo.translate(0, -0.875, 0);   // 발목까지 늘어진 팔
  const legL = add(legGeo, STK_BLACK, -0.13, 1.15, 0), legR = add(legGeo, STK_BLACK, 0.13, 1.15, 0);
  const torso = add(box(0.5, 0.98, 0.26), STK_BLACK, 0, 1.63, 0); torso.rotation.x = 0.12;   // 살짝 구부정
  const armL = add(armGeo, STK_BLACK, -0.34, 2.05, -0.04), armR = add(armGeo, STK_BLACK, 0.34, 2.05, -0.04);
  const clawGeo = box(0.025, 0.32, 0.025); clawGeo.translate(0, -0.16, 0);
  for (const arm of [armL, armR]) for (let k = -1; k <= 1; k++) { const c = new THREE.Mesh(clawGeo, STK_BLACK); c.position.set(k * 0.035, -1.72, 0); c.rotation.x = -0.35; c.rotation.z = k * 0.15; arm.add(c); }
  const head = new THREE.Group(); head.position.set(0, 2.33, -0.08); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), STK_BLACK); skull.scale.set(0.95, 1.2, 1); head.add(skull);
  // 짝짝이 눈 (가운데 검은 점이 노려봐요)
  const eyeGeo = new THREE.SphereGeometry(1, 10, 8), pupGeo = new THREE.SphereGeometry(0.018, 6, 4);
  for (const [x, r, tilt] of [[-0.1, 0.065, 0.35], [0.1, 0.05, -0.2]]) {
    const e = new THREE.Mesh(eyeGeo, STK_WHITE); e.position.set(x, 0.08, -0.225); e.scale.set(r, r * 1.6, r * 0.4); e.rotation.z = tilt; head.add(e);
    const pp = new THREE.Mesh(pupGeo, STK_RED); pp.position.set(x, 0.08, -0.252); head.add(pp);
  }
  // 귀까지 찢어진 입 + 이빨 틈
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 4, 18, Math.PI * 0.85), STK_WHITE);
  mouth.position.set(0, 0.0, -0.215); mouth.rotation.z = Math.PI + Math.PI * 0.075; mouth.scale.set(1, 0.75, 0.6); head.add(mouth);
  const gapGeo = new THREE.BoxGeometry(0.012, 0.1, 0.02);
  for (let k = -5; k <= 5; k++) {
    const a = -Math.PI / 2 + k * 0.22, gp = new THREE.Mesh(gapGeo, STK_BLACK);
    gp.position.set(Math.cos(a) * 0.17, 0.0 + Math.sin(a) * 0.17 * 0.75, -0.24 + Math.abs(k) * 0.004); gp.rotation.z = a + Math.PI / 2; head.add(gp);
  }
  head.rotation.z = 0.2;
  g.userData = { legL, legR, armL, armR, head, torso, mouth, jerk: 0, jz: 0, jx: 0 };
  return g;
}

// ---------- 초기화 ----------
function stkInit() {
  if (STK.mons.length || !CASTLE_IN.floors.length) return;
  for (const fl of CASTLE_IN.floors) {
    const g = stkBuildMesh(), s = stkFarCell(fl, { i: fl.arrival.i, j: fl.arrival.j });
    fl.group.add(g);
    STK.mons.push({ fl, home: fl, g, spawn: s, x: 0, y: fl.y, z: 0, yaw: 0, follow: null, pace: null, howl: 0, howlAt: -99, state: 'wander', goal: null, path: null, pathT: 0, searchPts: [], timer: 0, lastSeen: null, lastVel: null, walk: 0, stepT: 0, ward: null });
  }
  // 옷장 안에서 쓰는 문짝 2장 (평소엔 숨김)
  const doorGeo = new THREE.BoxGeometry(0.78, 1.9, 0.05); doorGeo.translate(0.39, 0.95 + 0.05, 0);
  const doorMat = new THREE.MeshLambertMaterial({ color: 0xa87a45, emissive: 0x6b3f1a, emissiveIntensity: 0.3 });
  STK.doors = [0, 1].map(() => { const p = new THREE.Group(), m = new THREE.Mesh(doorGeo, doorMat); p.add(m); p.visible = false; return p; });
  // 화면 안내 · 번쩍 효과
  const hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;left:50%;bottom:22%;transform:translateX(-50%);padding:6px 14px;border-radius:10px;background:rgba(0,0,0,.55);color:#fff;font:600 15px sans-serif;pointer-events:none;display:none;z-index:50';
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:60;transition:opacity .15s';
  const vig = document.createElement('div');
  vig.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;opacity:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(60,0,0,.55) 75%,rgba(10,0,0,.95) 100%)';
  STK.vig = vig;
  document.body.append(hint, flash, vig);
  STK.hint = hint; STK.flash = flash;
  stkReset();
}
function stkReset() {
  for (const m of STK.mons) {
    const c = CASTLE_IN.cellCenter(m.spawn.i, m.spawn.j);
    if (m.fl !== m.home) { m.fl = m.home; m.home.group.add(m.g); }
    Object.assign(m, { x: c.x, y: m.home.y, z: c.z, state: 'wander', goal: null, path: null, searchPts: [], timer: 0, lastSeen: null, ward: null, follow: null, pace: null, howl: 0, howlAt: -99 });
  }
  STK.seenLog.length = 0; STK.grace = 3; STK.pf = -1;
}

// ---------- 옷장 ----------
function stkWardFront(w, d) { return { x: w.x + w.fx * d, z: w.z + w.fz * d }; }
function stkNearWard() {
  const fl = CASTLE_IN.floors[CASTLE_IN.playerFloor()];
  if (!fl || Math.abs(P.y - fl.y) > 1) return null;
  let best = null, bd = 1.5;
  for (const w of fl.wardrobes) { const f = stkWardFront(w, 0.9), d = Math.hypot(P.x - f.x, P.z - f.z); if (d < bd) { bd = d; best = w; } }
  return best;
}
function stkSetDoors(w, theta) {   // theta 0 = 닫힘, 클수록 열림
  const lx = -w.fz, lz = w.fx, fy = w.y, ux = w.x + w.fx * 0.62, uz = w.z + w.fz * 0.62;
  STK.doors.forEach((p, k) => {
    const sgn = k ? 1 : -1, hx = ux + lx * sgn * 0.8, hz = uz + lz * sgn * 0.8;
    const dx = -lx * sgn * Math.cos(theta) + w.fx * Math.sin(theta), dz = -lz * sgn * Math.cos(theta) + w.fz * Math.sin(theta);
    p.position.set(hx, fy, hz); p.rotation.y = Math.atan2(-dz, dx); p.visible = true;
  });
}
function stkOpenDoorsInst(w, show) {   // 원래(활짝 열린) 장식 문짝 보이기/숨기기
  const im = w.doorMesh; if (!im) return;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let k = 0; k < 2; k++) {
    if (!show) { if (!w._dm) w._dm = []; w._dm[k] = new THREE.Matrix4(); im.getMatrixAt(w.doorIdx + k, w._dm[k]); im.setMatrixAt(w.doorIdx + k, zero); }
    else if (w._dm) im.setMatrixAt(w.doorIdx + k, w._dm[k]);
  }
  im.instanceMatrix.needsUpdate = true;
}
function stkEnterWard(w) {
  const fl = CASTLE_IN.floors[w.floor];
  STK.hide = w;
  stkOpenDoorsInst(w, false);
  for (const d of STK.doors) fl.group.add(d);
  stkSetDoors(w, STK_DOOR_CLOSE);
  cam.yaw = Math.atan2(-w.fx, -w.fz); cam.pitch = 0;
  if (typeof SFX !== 'undefined') SFX.land();
  // 들어가는 걸 봤나? (숨기 직전 2.5초 중 1.5초 이상 노출 + 괴물이 쫓는 중) -> 옷장 앞까지 와서 서성여요
  const seen = STK.seenLog.reduce((s, e) => s + e.dt, 0);
  for (const m of STK.mons) {
    if (m.fl.index !== w.floor || m.follow) continue;
    if (seen >= STK.SEEN_NEED && m.state === 'chase') { m.state = 'hunt'; m.ward = w; m.path = null; }
    else if (m.state === 'chase' || m.state === 'search') m.ward = w;   // 근처까지 와서 잠깐 머뭇거릴 수도
  }
}
function stkExitWard() {
  const w = STK.hide; if (!w) return;
  STK.hide = null;
  for (const d of STK.doors) { d.visible = false; d.removeFromParent(); }
  stkOpenDoorsInst(w, true);
  const f = stkWardFront(w, 1.4);
  P.x = f.x; P.z = f.z; P.y = w.y + 0.05; P.vx = P.vy = P.vz = 0;
}
// main.js 에서 E 키: 처리했으면 true
function stkKeyE() {
  if (!STK.mons.length || STK.kill || !inCastleIn(P.x, P.y, P.z)) return false;
  if (STK.hide) { stkExitWard(); return true; }
  const w = stkNearWard(); if (!w) return false;
  stkEnterWard(w); return true;
}
// player.js updatePlayer 맨 앞: 옷장 안/잡히는 중엔 움직이지 않아요
function stkHold() {
  if (STK.hide) { P.x = STK.hide.x; P.z = STK.hide.z; P.y = STK.hide.y + 0.02; P.vx = P.vy = P.vz = 0; P.grounded = true; return true; }
  if (STK.kill) { P.vx = P.vy = P.vz = 0; return true; }
  return false;
}

// ---------- 소리 (성 안에서는 tone()이 꺼져 있어서 괴물 소리는 따로 내요) ----------
function stkAudioOk() { return !muted && actx && actx.state === 'running'; }
function stkTone(freq, dur, type, vol, slide = 0, delay = 0) {
  if (!stkAudioOk()) return;
  try {
    const t0 = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* 무시 */ }
}
function stkNoise() { if (!stkNoiseBuf) { const n = actx.sampleRate * 1.5; stkNoiseBuf = actx.createBuffer(1, n, actx.sampleRate); const d = stkNoiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } return stkNoiseBuf; }
function stkThump(cut, vol, dur, pan = 0) {   // 쿵: 걸러낸 잡음 한 토막
  if (!stkAudioOk() || vol < 0.003) return;
  try {
    const t0 = actx.currentTime, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = stkNoise(); f.type = 'lowpass'; f.frequency.value = cut;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g);
    if (actx.createStereoPanner) { const pn = actx.createStereoPanner(); pn.pan.value = pan; g.connect(pn); pn.connect(actx.destination); } else g.connect(actx.destination);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.02);
  } catch (e) { /* 무시 */ }
}
function stkMonStep(m) {   // 괴물 발소리: 가까울수록 크게, 벽 너머면 먹먹하게, 좌우 방향도 들려요
  const d = Math.hypot(P.x - m.x, (P.y - m.y) * 1.5, P.z - m.z), k = Math.max(0, 1 - d / STK.STEP_RANGE);
  if (k <= 0) return;
  const los = Math.abs(P.y - m.y) < 3 && m.fl.index === CASTLE_IN.playerFloor() && stkLOS(m.fl, m.x, m.z, P.x, P.z);
  const ang = Math.atan2(m.x - P.x, m.z - P.z) - Math.atan2(-Math.sin(cam.yaw), -Math.cos(cam.yaw));
  const vol = 0.42 * k * k * (los ? 1 : 0.6);
  stkThump(los ? 260 : 140, vol, 0.22, -Math.sin(ang) * 0.7);
  stkTone(48 + Math.random() * 10, 0.18, 'sine', vol * 0.8, -18);
}
function stkPlayerStep(run) { stkThump(run ? 520 : 420, run ? 0.07 : 0.05, 0.09, (Math.random() - 0.5) * 0.2); }
function stkBeat(vol) { stkTone(58, 0.11, 'sine', vol, -12); stkTone(52, 0.13, 'sine', vol * 0.75, -12, 0.17); }
// 발견했을 때 괴성: 갈라진 목소리가 치솟았다 떨어져요 (너무 크지 않게, 멀수록 조금 작게)
let stkNoiseBuf = null;
function stkHowl(dist, big) {
  if (!stkAudioOk()) return;
  try {
    const vol = big ? STK.SCARE_VOL : STK.HOWL_VOL * (0.55 + 0.45 * Math.max(0, 1 - dist / 60));
    const t0 = actx.currentTime, dur = big ? 1.2 : 1.3, pm = big ? 1.35 : 1;
    const out = actx.createGain();
    out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(vol, t0 + 0.06);
    out.gain.setValueAtTime(vol, t0 + 0.5); out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.7;
    lp.connect(out); out.connect(actx.destination);
    const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 21; lg.gain.value = 28; lfo.connect(lg);
    for (const [f, type, v] of [[330, 'sawtooth', 0.45], [349, 'sawtooth', 0.35], [495, 'square', 0.14], [160, 'sawtooth', 0.3]]) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f * 0.7 * pm, t0); o.frequency.exponentialRampToValueAtTime(f * 1.25 * pm, t0 + (big ? 0.08 : 0.2)); o.frequency.exponentialRampToValueAtTime(f * 0.75 * pm, t0 + dur);
      lg.connect(o.frequency); g.gain.value = v; o.connect(g); g.connect(lp);
      o.start(t0); o.stop(t0 + dur + 0.05);
    }
    stkNoise();
    const ns = actx.createBufferSource(), bp = actx.createBiquadFilter(), ng = actx.createGain();
    ns.buffer = stkNoiseBuf; bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2; ng.gain.value = 0.35;
    ns.connect(bp); bp.connect(ng); ng.connect(lp);
    lfo.start(t0); lfo.stop(t0 + dur + 0.05); ns.start(t0); ns.stop(t0 + dur);
  } catch (e) { /* 무시 */ }
}
function stkScream() {   // 잡혔을 때: 괴물이 얼굴 앞에서 비명
  stkHowl(0, true);
  stkTone(70, 1.0, 'sawtooth', 0.08, -35);
  stkThump(300, 0.3, 0.25);
}
// ---------- 잡기 ----------
function stkStartKill(m) {
  if (STK.kill) return;
  STK.kill = { m, t: 0, yaw: Math.atan2(-(m.x - P.x), -(m.z - P.z)) };
  stkScream(); cam.shake = 0.6;
}
// 잡히면: 괴물 얼굴이 화면 한가운데로 확 달려들고 비명 -> 암전 -> 리스폰
function stkUpdateKill(dt) {
  const k = STK.kill; k.t += dt;
  const m = k.m, g = m.g, u = g.userData;
  cam.yaw = k.yaw; cam.pitch = 0; cam.shake = Math.max(cam.shake, 0.22);
  const fx = -Math.sin(k.yaw), fz = -Math.cos(k.yaw);
  const d = 1.8 - 0.85 * Math.min(1, k.t / 0.12);                  // 1.8 m -> 0.95 m 로 확 붙어요
  const sc = 1 + 0.35 * Math.min(1, k.t / 0.12);
  const cp = camera.position;
  g.visible = true;
  g.rotation.y = k.yaw + Math.PI;                                   // 얼굴이 카메라를 봐요
  g.position.set(cp.x + fx * d, cp.y - (u.head.position.y) * 1 + (Math.random() - 0.5) * 0.03, cp.z + fz * d);
  u.head.scale.setScalar(sc);
  u.head.rotation.set((Math.random() - 0.5) * 0.12, 0, Math.sin(k.t * 55) * 0.12);
  u.mouth.scale.y = 2.3 + Math.sin(k.t * 40) * 0.3;                 // 입을 쩍 벌려요
  u.torso.rotation.x = 0.1;
  u.armL.rotation.x = u.armR.rotation.x = -1.35;                   // 발톱 달린 팔이 화면 양옆으로
  u.armL.rotation.z = 0.35; u.armR.rotation.z = -0.35;
  if (k.t > 0.95) STK.flash.style.opacity = '1';
  if (k.t > 1.2) {
    STK.kill = null;
    if (STK.hide) stkExitWard();
    u.head.scale.setScalar(1); u.head.rotation.set(0, 0, 0); u.armL.rotation.z = u.armR.rotation.z = 0;
    die(); stkReset();
    setTimeout(() => { STK.flash.style.opacity = '0'; }, 250);
  }
}
function stkTryCatch(m) {
  if (!STK.kill && !STK.hide && Math.hypot(P.x - m.x, P.z - m.z) < STK.CATCH && Math.abs(P.y - m.y) < 1.8) stkStartKill(m);
}

// ---------- 괴물 한 마리 ----------
function stkMoveTo(m, tx, tz, spd, dt) {
  const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
  if (d < 0.05) return d;
  const s = Math.min(d, spd * dt), ox = m.x, oz = m.z;
  m.x += dx / d * s; m.z += dz / d * s;
  if (!(m.follow && m.follow.phase === 1)) stkCollide(m.fl, ox, oz, m);   // 계단 위(직선 통로)는 층 경계를 넘어가야 해서 빼요
  m.y = stkGroundY(m.fl, m.x, m.z);
  const want = Math.atan2(-dx, -dz);
  let da = want - m.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
  m.yaw += da * Math.min(1, dt * 10);
  m.walk += s;
  return d - s;
}
// 목표 지점까지 길을 따라 이동 (벽이 안 막으면 바로 직선)
function stkGo(m, tx, tz, spd, dt) {
  const fl = m.fl;
  if (stkWideLOS(fl, m.x, m.z, tx, tz, STK.BODY_R)) { m.path = null; return stkMoveTo(m, tx, tz, spd, dt); }
  m.pathT -= dt;
  if (!m.path || m.pathT <= 0) { m.path = stkPath(fl, stkCell(m.x, m.z), stkCell(tx, tz)); m.pathT = 0.25; }
  if (!m.path || m.path.length < 2) return stkMoveTo(m, tx, tz, spd, dt);
  // 앞쪽 칸 중 직선으로 보이는 가장 먼 칸으로
  let nx = null;
  for (let k = Math.min(m.path.length - 1, 3); k >= 1; k--) {
    const c = CASTLE_IN.cellCenter(m.path[k].i, m.path[k].j);
    if (stkWideLOS(fl, m.x, m.z, c.x, c.z, STK.BODY_R)) { nx = c; break; }
  }
  if (!nx) nx = CASTLE_IN.cellCenter(m.path[1].i, m.path[1].j);
  stkMoveTo(m, nx.x, nx.z, spd, dt);
  const cur = stkCell(m.x, m.z);
  if (m.path[1].i === cur.i && m.path[1].j === cur.j) m.path.shift();
  return Math.hypot(tx - m.x, tz - m.z);
}
function stkSearchPts(m) {   // 마지막으로 본 곳 -> 가던 방향으로 최대 3칸
  const fl = m.fl, pts = [m.lastSeen];
  const v = m.lastVel, ax = Math.abs(v.x) >= Math.abs(v.z);
  const dir = ax ? [Math.sign(v.x) || 1, 0] : [0, Math.sign(v.z) || 1];
  let c = stkCell(m.lastSeen.x, m.lastSeen.z);
  for (let k = 0; k < 5; k++) {
    const b = { i: c.i + dir[0], j: c.j + dir[1] };
    if (b.i < 0 || b.j < 0 || b.i >= CI_N || b.j >= CI_N || fl.getWall(c, b)) break;
    c = b; pts.push(CASTLE_IN.cellCenter(c.i, c.j));
  }
  return pts;
}
function stkToWander(m) { m.state = 'wander'; m.goal = null; m.ward = null; m.pace = null; }
function stkStartLinger(m, t) { m.state = 'linger'; m.timer = t; m.pace = { side: Math.random() < 0.5 ? 1 : -1, wait: 0 }; m.path = null; }

// ---------- 계단 따라가기 ----------
// 쫓던 플레이어가 다른 층으로 가면: 계단 입구까지 달려가서 -> 계단을 타고 -> 그 층에서 계속 찾아요
function stkStartFollow(m, to) {
  const up = to > m.fl.index;
  const st = up ? m.fl.stair : CASTLE_IN.floors[to].stair;
  if (!st) return;
  const lo = st.enter, hi = st.arriveUpper;   // 아래층 계단 앞 칸 / 윗층 도착 칸 (한 줄로 이어져 있어요)
  const c = stkCell(m.x, m.z), onStair = st.cells.some((s) => s.i === c.i && s.j === c.j);
  m.follow = { to, p0: up ? lo : hi, p1: up ? hi : lo, exit: up ? st.nextCell : stkCell(lo.x, lo.z), phase: onStair ? 1 : 0 };
  m.state = 'follow'; m.path = null; m.ward = null; m.pace = null;
}
function stkUpdateFollow(m, dt, pf) {
  const F = m.follow;
  if (F.phase === 0) { if (stkGo(m, F.p0.x, F.p0.z, STK.SPEED, dt) < 0.4) F.phase = 1; }
  else {
    stkMoveTo(m, F.p1.x, F.p1.z, STK.SPEED * 0.8, dt);
    const c = stkCell(m.x, m.z);
    if (c.i === F.exit.i && c.j === F.exit.j) {   // 다른 층에 도착
      const nf = CASTLE_IN.floors[F.to];
      m.fl = nf; nf.group.add(m.g); m.follow = null; m.path = null; m.y = stkGroundY(nf, m.x, m.z);
      if (pf === nf.index) { m.state = 'search'; m.lastSeen = { x: P.x, z: P.z }; m.searchPts = [m.lastSeen]; m.timer = 4; }
      else if (Math.abs(pf - nf.index) === 1) stkStartFollow(m, pf);
      else stkToWander(m);
    }
  }
  stkTryCatch(m);
  stkPose(m, dt, STK.SPEED, pf);
}
function stkFloorChanged(from, to) {
  for (const m of STK.mons) {
    if (m.follow) {   // 아직 계단까지 못 갔는데 플레이어가 이 층으로 돌아오면 그냥 계속 찾아요
      if (m.follow.phase === 0 && m.fl.index === to) { m.follow = null; m.state = 'search'; m.lastSeen = { x: P.x, z: P.z }; m.searchPts = [m.lastSeen]; m.timer = 4; m.path = null; }
      continue;
    }
    if (m.fl.index === from && Math.abs(to - from) === 1 && (m.state === 'chase' || m.state === 'search')) stkStartFollow(m, to);
  }
}

// 괴물 정면 벡터와 (괴물 -> 나) 벡터의 코사인 유사도가 MON_COS 이상이면 시야 안이에요
function stkMonFaces(m, dist) {
  if (dist < 1e-3) return true;
  const fx = -Math.sin(m.yaw), fz = -Math.cos(m.yaw);
  return ((P.x - m.x) * fx + (P.z - m.z) * fz) / dist >= STK.MON_COS;
}
// 괴물이 내 화면 가로 시야각 안에 있나 (카메라 정면 vs 나 -> 괴물, 코사인 비교)
function stkPlayerViews(m, dist) {
  if (!STK.PLAYER_VIEW || dist < 1e-3) return true;
  const half = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect);   // 가로 반시야각
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  return ((m.x - P.x) * fx + (m.z - P.z) * fz) / dist >= Math.cos(half);
}
function stkUpdateMon(m, dt, active, pf) {
  const fl = m.fl;
  if (!active) { if (m.state !== 'wander') stkToWander(m); m.g.visible = false; return; }
  // 보이나? (아주 멀리서도 보여요. 벽에는 막혀요)
  const dist = Math.hypot(P.x - m.x, P.z - m.z);
  const clear = !STK.hide && STK.grace <= 0 && dist < STK.R && Math.abs(P.y - m.y) < 3 && stkLOS(fl, m.x, m.z, P.x, P.z);
  // 이미 쫓는 중이면 벽만 없으면 계속 봐요. 새로 발견할 때만 서로 마주 보고 있어야 해요
  const sees = clear && (m.state === 'chase' || m.state === 'hunt' || (stkMonFaces(m, dist) && stkPlayerViews(m, dist)));
  if (sees) {
    STK.seenNow = true;
    if (m.state !== 'chase' && m.state !== 'hunt') {   // 새로 발견: 괴성 + 잠깐 멈칫
      if (STK.time - m.howlAt > STK.HOWL_CD) { m.howlAt = STK.time; m.howl = 0.45; stkHowl(dist); }
      m.pace = null;
    }
    if (m.state !== 'hunt') m.state = 'chase';
    m.track = STK.TRACK;
    m.lastSeen = { x: P.x, z: P.z }; m.lastVel = { x: P.vx || -Math.sin(cam.yaw), z: P.vz || -Math.cos(cam.yaw) };
  }
  let spd = STK.SPEED;
  switch (m.state) {
    case 'chase':
      if (!sees) {
        if (m.track > 0 && !STK.hide) {   // 방금 놓쳤으면 잠깐은 어디로 갔는지 감으로 따라와요
          m.track -= dt; m.lastSeen = { x: P.x, z: P.z };
          if (Math.hypot(P.vx, P.vz) > 0.5) m.lastVel = { x: P.vx, z: P.vz };
          stkGo(m, P.x, P.z, spd, dt); stkTryCatch(m); break;
        }
        m.state = 'search'; m.searchPts = stkSearchPts(m); m.timer = 6; break;
      }
      if (m.howl > 0) {   // 소리 지르는 동안은 제자리에서 노려봐요
        m.howl -= dt; spd = 0;
        m.yaw = Math.atan2(-(P.x - m.x), -(P.z - m.z));
        m.g.userData.head.rotation.z = Math.sin(STK.time * 70) * 0.12;
        break;
      }
      stkGo(m, P.x, P.z, spd, dt);
      stkTryCatch(m);
      break;
    case 'search': {
      const p = m.searchPts[0];
      if (p) { if (stkGo(m, p.x, p.z, spd, dt) < 0.6) m.searchPts.shift(); }
      else {
        // 옷장 앞에서 놓쳤으면 잠깐 서성여요 (못 봤으니 금방 떠나요)
        if (m.ward && STK.hide === m.ward) { stkStartLinger(m, STK.LINGER); break; }
        m.timer -= dt; spd = 0;
        m.yaw += Math.sin(STK.time * 2.2) * dt * 2.5;   // 두리번
        if (m.timer <= 0) stkToWander(m);
      }
      break;
    }
    case 'hunt': {   // 옷장에 들어가는 걸 봤어요: 옷장 앞까지 와요
      const f = stkWardFront(m.ward, 1.8);
      if (stkGo(m, f.x, f.z, spd, dt) < 0.3) stkStartLinger(m, STK.LINGER_SEEN);
      if (STK.hide !== m.ward) m.state = 'chase';   // 그새 나왔으면 그냥 쫓아요
      break;
    }
    case 'linger': {   // 옷장 앞을 좌우로 서성여요 (문은 못 열어요)
      const w = m.ward, pc = m.pace, lx = -w.fz, lz = w.fx;
      spd = STK.WANDER;
      if (pc.wait > 0) {
        pc.wait -= dt; spd = 0;
        let da = Math.atan2(w.fx, w.fz) - m.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
        m.yaw += da * Math.min(1, dt * 6);   // 옷장 쪽을 빤히 봐요
        if (pc.wait <= 0) pc.side = -pc.side;
      } else {
        const tx = w.x + w.fx * 1.9 + lx * pc.side * 1.2, tz = w.z + w.fz * 1.9 + lz * pc.side * 1.2;
        if (stkGo(m, tx, tz, spd, dt) < 0.15) pc.wait = 0.6 + Math.random() * 0.9;
      }
      m.timer -= dt;
      if (m.timer <= 0) stkToWander(m);
      break;
    }
    default: {   // wander
      spd = STK.WANDER;
      if (!m.goal || stkGo(m, m.goal.x, m.goal.z, spd, dt) < 0.5) {
        const blk = stkBlocked(fl);
        let c; do { c = { i: Math.floor(Math.random() * CI_N), j: Math.floor(Math.random() * CI_N) }; } while (blk.has(c.i + ',' + c.j));
        m.goal = CASTLE_IN.cellCenter(c.i, c.j);
      }
    }
  }
  stkPose(m, dt, spd, pf);
}
// 모습: 걸음 흔들림 + 고개 까딱 + 발소리
function stkPose(m, dt, spd, pf) {
  const g = m.g, u = g.userData, ph = m.walk * 1.6, sw = spd > 0 ? 0.55 : 0;
  g.visible = m.fl.index === pf || (!!m.follow && Math.abs(m.fl.index - pf) <= 1);
  g.position.set(m.x, m.y + Math.abs(Math.sin(ph)) * 0.06 * (spd > 0 ? 1 : 0), m.z);
  g.rotation.y = m.yaw;
  const reach = m.state === 'chase' || m.state === 'follow' ? 0.5 : 0;
  u.legL.rotation.x = Math.sin(ph) * sw; u.legR.rotation.x = -Math.sin(ph) * sw;
  u.armL.rotation.x = -Math.sin(ph) * sw * 0.6 - reach; u.armR.rotation.x = Math.sin(ph) * sw * 0.6 - reach;
  const hunting = m.state === 'chase' || m.state === 'follow' || m.state === 'hunt';
  u.torso.rotation.x += ((hunting ? 0.45 : 0.12) - u.torso.rotation.x) * Math.min(1, dt * 6);
  u.mouth.scale.y += ((hunting ? 1.6 : 0.75) - u.mouth.scale.y) * Math.min(1, dt * 8);
  if (!STK.kill && !(m.howl > 0)) {
    u.jerk -= dt;
    if (u.jerk <= 0) {   // 고개를 홱 꺾었다가 멈췄다가
      u.jerk = hunting ? 0.12 + Math.random() * 0.3 : 0.8 + Math.random() * 2.5;
      u.jz = (Math.random() - 0.5) * (hunting ? 1.3 : 0.7); u.jx = (Math.random() - 0.5) * (hunting ? 0.6 : 0.2);
    }
    u.head.rotation.z += (u.jz - u.head.rotation.z) * Math.min(1, dt * 25);
    u.head.rotation.x += (u.jx - u.head.rotation.x) * Math.min(1, dt * 25);
  }
  if (spd > 0) { m.stepT -= dt; if (m.stepT <= 0) { m.stepT = spd > 6 ? 0.3 : 0.6; stkMonStep(m); } }
}

// ---------- 매 프레임 (updateCastleIn 에서 불러요) ----------
function updateStalker(dt) {
  stkInit();
  if (!STK.mons.length) return;
  const inside = inCastleIn(P.x, P.y, P.z);
  if (inside !== STK.wasIn) { STK.wasIn = inside; if (inside) stkReset(); else { if (STK.hide) stkExitWard(); STK.kill = null; } }
  if (!inside) { STK.hint.style.display = 'none'; STK.vig.style.opacity = '0'; return; }
  STK.time += dt; STK.grace = Math.max(0, STK.grace - dt);
  while (STK.seenLog.length && STK.time - STK.seenLog[0].t > STK.SEEN_WIN) STK.seenLog.shift();
  const pf = CASTLE_IN.playerFloor();
  if (STK.pf >= 0 && pf !== STK.pf && !STK.kill) stkFloorChanged(STK.pf, pf);
  STK.pf = pf;
  STK.seenNow = false;
  if (STK.kill) stkUpdateKill(dt);
  else for (const m of STK.mons) { if (m.follow) stkUpdateFollow(m, dt, pf); else stkUpdateMon(m, dt, m.fl.index === pf, pf); }
  if (STK.seenNow) STK.seenLog.push({ t: STK.time, dt });
  // 내 발소리 (괴물은 못 들어요)
  const sp = Math.hypot(P.vx, P.vz);
  if (!STK.hide && !STK.kill && P.grounded && sp > 1.5) { STK.pDist += sp * dt; if (STK.pDist > (RUN.on ? 3 : 2.3)) { STK.pDist = 0; stkPlayerStep(RUN.on); } }
  // 가까운 괴물: 화면 테두리가 붉어지고 심장이 뛰어요
  let near = 99;
  for (const m of STK.mons) if ((m.fl.index === pf || m.follow) && Math.abs(P.y - m.y) < 5) near = Math.min(near, Math.hypot(P.x - m.x, P.z - m.z));
  const fear = STK.kill ? 1 : Math.max(0, 1 - near / 28);
  STK.vig.style.opacity = (fear * 0.85).toFixed(3);
  STK.beatT -= dt;
  if (fear > 0.05 && STK.beatT <= 0) { STK.beatT = 1.1 - fear * 0.7; stkBeat(0.06 + fear * 0.14); }
  if (fear > 0.75 && !STK.kill) cam.shake = Math.max(cam.shake || 0, (fear - 0.75) * 0.25);
  // 안내
  const txt = STK.kill ? '' : STK.hide ? 'E  옷장에서 나가기' : stkNearWard() ? 'E  옷장에 숨기' : '';
  STK.hint.textContent = txt; STK.hint.style.display = txt ? 'block' : 'none';
}
