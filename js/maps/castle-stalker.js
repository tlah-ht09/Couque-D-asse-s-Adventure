'use strict';
// =====================================================================
//  쿠키성 내부의 괴물 (층마다 1마리, 플레이어가 있는 층의 괴물만 움직여요)
//  - 키 2.6m, 새카만 몸에 하얀 눈과 입만 보여요
//  - 인식: 반지름 15m + 미로 벽에 시야가 막혀요 (격자로 판정)
//  - 놓치면 마지막으로 본 위치 -> 그 방향으로 몇 칸 더 수색
//  - 옷장(E): 문이 80% 닫혀요. 숨기 직전 2.5초 중 1.5초 이상 보였다면 괴물이 문을 열고 잡아요
// =====================================================================
const STK = {
  R: 15, SPEED: 9 * 1.25, WANDER: 3.2, CATCH: 1.1, SEEN_NEED: 1.5, SEEN_WIN: 2.5,
  mons: [], time: 0, seenLog: [], hide: null, kill: null, grace: 0, wasIn: false, hint: null, flash: null, doors: null,
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

// ---------- 모습 ----------
const STK_BLACK = new THREE.MeshBasicMaterial({ color: 0x030303 });
const STK_WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
function stkBuildMesh() {
  const g = new THREE.Group(), box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const legGeo = box(0.15, 1.15, 0.15); legGeo.translate(0, -0.575, 0);
  const armGeo = box(0.11, 1.3, 0.11); armGeo.translate(0, -0.65, 0);
  const legL = add(legGeo, STK_BLACK, -0.13, 1.15, 0), legR = add(legGeo, STK_BLACK, 0.13, 1.15, 0);
  const torso = add(box(0.5, 0.98, 0.26), STK_BLACK, 0, 1.63, 0); torso.rotation.x = 0.12;   // 살짝 구부정
  const armL = add(armGeo, STK_BLACK, -0.34, 2.05, -0.04), armR = add(armGeo, STK_BLACK, 0.34, 2.05, -0.04);
  const head = new THREE.Group(); head.position.set(0, 2.33, -0.08); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), STK_BLACK); skull.scale.set(0.95, 1.2, 1); head.add(skull);
  // 짝짝이 눈 (가운데 검은 점이 노려봐요)
  const eyeGeo = new THREE.SphereGeometry(1, 10, 8), pupGeo = new THREE.SphereGeometry(0.018, 6, 4);
  for (const [x, r, tilt] of [[-0.1, 0.065, 0.35], [0.1, 0.05, -0.2]]) {
    const e = new THREE.Mesh(eyeGeo, STK_WHITE); e.position.set(x, 0.08, -0.225); e.scale.set(r, r * 1.6, r * 0.4); e.rotation.z = tilt; head.add(e);
    const pp = new THREE.Mesh(pupGeo, STK_BLACK); pp.position.set(x, 0.08, -0.252); head.add(pp);
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
  g.userData = { legL, legR, armL, armR, head };
  return g;
}

// ---------- 초기화 ----------
function stkInit() {
  if (STK.mons.length || !CASTLE_IN.floors.length) return;
  for (const fl of CASTLE_IN.floors) {
    const g = stkBuildMesh(), s = stkFarCell(fl, { i: fl.arrival.i, j: fl.arrival.j });
    fl.group.add(g);
    STK.mons.push({ fl, g, spawn: s, x: 0, z: 0, yaw: 0, state: 'wander', goal: null, path: null, pathT: 0, searchPts: [], timer: 0, lastSeen: null, lastVel: null, walk: 0, stepT: 0, ward: null });
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
  document.body.append(hint, flash);
  STK.hint = hint; STK.flash = flash;
  stkReset();
}
function stkReset() {
  for (const m of STK.mons) {
    const c = CASTLE_IN.cellCenter(m.spawn.i, m.spawn.j);
    Object.assign(m, { x: c.x, z: c.z, state: 'wander', goal: null, path: null, searchPts: [], timer: 0, lastSeen: null, ward: null });
  }
  STK.seenLog.length = 0; STK.grace = 3;
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
  // 제대로 봤나? (숨기 직전 2.5초 중 1.5초 이상 노출 + 괴물이 쫓는 중)
  const seen = STK.seenLog.reduce((s, e) => s + e.dt, 0);
  const m = STK.mons[w.floor];
  if (m && seen >= STK.SEEN_NEED && m.state === 'chase') { m.state = 'hunt'; m.ward = w; m.path = null; }
  else if (m && (m.state === 'chase' || m.state === 'search')) m.ward = w;   // 근처까지 와서 머뭇거릴 수도
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

// ---------- 소리 ----------
function stkStep(vol) { if (typeof tone === 'function' && !muted) tone(55 + Math.random() * 15, 0.13, 'sine', vol, -25); }
function stkSting() { if (typeof tone === 'function' && !muted) { tone(98, 0.9, 'sawtooth', 0.05, -20); tone(104, 0.9, 'sawtooth', 0.05, -24); } }
function stkScream() {
  if (typeof tone !== 'function' || muted) return;
  for (let k = 0; k < 5; k++) tone(300 + Math.random() * 500, 0.7, k % 2 ? 'sawtooth' : 'square', 0.06, 900 + Math.random() * 600, k * 0.02);
  tone(60, 0.8, 'sawtooth', 0.09, -30);
}

// ---------- 잡기 ----------
function stkStartKill(m) {
  if (STK.kill) return;
  STK.kill = { m, t: 0 };
  stkScream(); cam.shake = 0.6;
}
function stkUpdateKill(dt) {
  const k = STK.kill; k.t += dt;
  const m = k.m, hx = m.x, hz = m.z;
  // 괴물 얼굴을 억지로 보게 해요
  const ex = P.x, ez = P.z;
  cam.yaw = Math.atan2(-(hx - ex), -(hz - ez));
  cam.pitch = -0.25; cam.shake = Math.max(cam.shake, 0.15);
  m.g.userData.head.rotation.z = Math.sin(k.t * 60) * 0.15;
  if (k.t > 0.75) STK.flash.style.opacity = '1';
  if (k.t > 1.0) {
    STK.kill = null;
    if (STK.hide) stkExitWard();
    m.g.userData.head.rotation.z = 0;
    die(); stkReset();
    setTimeout(() => { STK.flash.style.opacity = '0'; }, 250);
  }
}

// ---------- 괴물 한 마리 ----------
function stkMoveTo(m, tx, tz, spd, dt) {
  const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
  if (d < 0.05) return d;
  const s = Math.min(d, spd * dt);
  m.x += dx / d * s; m.z += dz / d * s;
  const want = Math.atan2(-dx, -dz);
  let da = want - m.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
  m.yaw += da * Math.min(1, dt * 10);
  m.walk += s;
  return d - s;
}
// 목표 지점까지 길을 따라 이동 (벽이 안 막으면 바로 직선)
function stkGo(m, tx, tz, spd, dt) {
  const fl = m.fl;
  if (stkLOS(fl, m.x, m.z, tx, tz)) { m.path = null; return stkMoveTo(m, tx, tz, spd, dt); }
  m.pathT -= dt;
  if (!m.path || m.pathT <= 0) { m.path = stkPath(fl, stkCell(m.x, m.z), stkCell(tx, tz)); m.pathT = 0.25; }
  if (!m.path || m.path.length < 2) return stkMoveTo(m, tx, tz, spd, dt);
  // 앞쪽 칸 중 직선으로 보이는 가장 먼 칸으로
  let nx = null;
  for (let k = Math.min(m.path.length - 1, 3); k >= 1; k--) {
    const c = CASTLE_IN.cellCenter(m.path[k].i, m.path[k].j);
    if (stkLOS(fl, m.x, m.z, c.x, c.z)) { nx = c; break; }
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
  for (let k = 0; k < 3; k++) {
    const b = { i: c.i + dir[0], j: c.j + dir[1] };
    if (b.i < 0 || b.j < 0 || b.i >= CI_N || b.j >= CI_N || fl.getWall(c, b)) break;
    c = b; pts.push(CASTLE_IN.cellCenter(c.i, c.j));
  }
  return pts;
}
function stkUpdateMon(m, dt, active) {
  const fl = m.fl, g = m.g;
  g.visible = active;
  if (!active) { if (m.state !== 'wander') { m.state = 'wander'; m.goal = null; m.ward = null; } return; }
  // 보이나?
  const dist = Math.hypot(P.x - m.x, P.z - m.z);
  const sees = !STK.hide && STK.grace <= 0 && dist < STK.R && Math.abs(P.y - fl.y) < 3 && stkLOS(fl, m.x, m.z, P.x, P.z);
  if (sees) {
    STK.seenLog.push({ t: STK.time, dt });
    if (m.state === 'wander' || m.state === 'linger') stkSting();
    if (m.state !== 'hunt') m.state = 'chase';
    m.lastSeen = { x: P.x, z: P.z }; m.lastVel = { x: P.vx || -Math.sin(cam.yaw), z: P.vz || -Math.cos(cam.yaw) };
  }
  let spd = STK.SPEED;
  switch (m.state) {
    case 'chase':
      if (!sees) { m.state = 'search'; m.searchPts = stkSearchPts(m); m.timer = 4; break; }
      stkGo(m, P.x, P.z, spd, dt);
      if (dist < STK.CATCH && !STK.kill) stkStartKill(m);
      break;
    case 'search': {
      const p = m.searchPts[0];
      if (p) { if (stkGo(m, p.x, p.z, spd, dt) < 0.6) m.searchPts.shift(); }
      else {
        // 옷장 앞에서 놓쳤으면 잠깐 서성여요 (못 봤으니 열지는 않아요)
        if (m.ward && STK.hide === m.ward) { m.state = 'linger'; m.timer = 2.5; break; }
        m.timer -= dt; spd = 0;
        if (m.timer <= 0) { m.state = 'wander'; m.goal = null; m.ward = null; }
      }
      break;
    }
    case 'linger': {
      const f = stkWardFront(m.ward, 1.6);
      if (stkGo(m, f.x, f.z, STK.WANDER, dt) < 0.3) m.yaw = Math.atan2(m.ward.fx, m.ward.fz);
      m.timer -= dt;
      if (m.timer <= 0) { m.state = 'wander'; m.goal = null; m.ward = null; }
      break;
    }
    case 'hunt': {
      const f = stkWardFront(m.ward, 1.35);
      if (stkGo(m, f.x, f.z, spd, dt) < 0.25) { m.state = 'open'; m.timer = 0; m.yaw = Math.atan2(m.ward.fx, m.ward.fz); }
      if (STK.hide !== m.ward) m.state = 'chase';   // 그새 나왔으면 그냥 쫓아요
      break;
    }
    case 'open':
      m.timer += dt; spd = 0;
      if (STK.hide) stkSetDoors(STK.hide, STK_DOOR_CLOSE + (Math.PI / 2 - STK_DOOR_CLOSE) * Math.min(1, m.timer / 0.18));   // 벌컥
      if (m.timer > 0.12 && !STK.kill) stkStartKill(m);
      break;
    default: {   // wander
      spd = STK.WANDER;
      if (!m.goal || stkGo(m, m.goal.x, m.goal.z, spd, dt) < 0.5) {
        const blk = stkBlocked(fl);
        let c; do { c = { i: Math.floor(Math.random() * CI_N), j: Math.floor(Math.random() * CI_N) }; } while (blk.has(c.i + ',' + c.j));
        m.goal = CASTLE_IN.cellCenter(c.i, c.j);
      }
    }
  }
  // 모습: 걸음 흔들림 + 고개 까딱
  const u = g.userData, ph = m.walk * 1.6, sw = spd > 0 ? 0.55 : 0;
  g.position.set(m.x, fl.y + Math.abs(Math.sin(ph)) * 0.06 * (spd > 0 ? 1 : 0), m.z);
  g.rotation.y = m.yaw;
  u.legL.rotation.x = Math.sin(ph) * sw; u.legR.rotation.x = -Math.sin(ph) * sw;
  u.armL.rotation.x = -Math.sin(ph) * sw * 0.6 - (m.state === 'chase' ? 0.5 : 0); u.armR.rotation.x = Math.sin(ph) * sw * 0.6 - (m.state === 'chase' ? 0.5 : 0);
  if (!STK.kill) u.head.rotation.z = Math.sin(STK.time * 1.3) * 0.18 + (Math.random() < 0.01 ? (Math.random() - 0.5) * 0.6 : 0);
  // 발소리
  if (spd > 3.5) { m.stepT -= dt; if (m.stepT <= 0) { m.stepT = 0.3; const v = 0.12 * Math.max(0, 1 - dist / 28); if (v > 0.01) stkStep(v); } }
}

// ---------- 매 프레임 (updateCastleIn 에서 불러요) ----------
function updateStalker(dt) {
  stkInit();
  if (!STK.mons.length) return;
  const inside = inCastleIn(P.x, P.y, P.z);
  if (inside !== STK.wasIn) { STK.wasIn = inside; if (inside) stkReset(); else { if (STK.hide) stkExitWard(); STK.kill = null; } }
  if (!inside) { STK.hint.style.display = 'none'; return; }
  STK.time += dt; STK.grace = Math.max(0, STK.grace - dt);
  while (STK.seenLog.length && STK.time - STK.seenLog[0].t > STK.SEEN_WIN) STK.seenLog.shift();
  const pf = CASTLE_IN.playerFloor();
  if (STK.kill) stkUpdateKill(dt);
  else for (const m of STK.mons) stkUpdateMon(m, dt, m.fl.index === pf);
  // 안내
  const txt = STK.kill ? '' : STK.hide ? 'E  옷장에서 나가기' : stkNearWard() ? 'E  옷장에 숨기' : '';
  STK.hint.textContent = txt; STK.hint.style.display = txt ? 'block' : 'none';
}
