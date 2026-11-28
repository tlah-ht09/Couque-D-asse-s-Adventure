'use strict';
// =====================================================================
//  플레이어
// =====================================================================
const PR = 0.4, PH = 1.7, GRAV = 32, JUMP = 12, SPEED = 9;
const P = {
  x: SPAWN.x, y: SPAWN.y, z: SPAWN.z, vx: 0, vy: 0, vz: 0,
  grounded: false, ground: null, prevGround: null, coyote: 0, jumpBuf: 0, jumpHeld: false, cut: false,
  airJumps: 0, face: 0, knock: 0, launch: null, inv: 0, standT: 0,
  respawn: { x: SPAWN.x, y: SPAWN.y, z: SPAWN.z, yaw: 0 }, cpCol: null,
  course: null, courseT0: 0, walk: 0, landT: 0,
};

// ---------- 캐릭터 모델 ----------
const avatar = new THREE.Group();
scene.add(avatar);
const AV = {};
{
  const shirt = new THREE.MeshStandardMaterial({ color: 0x4f7cff, roughness: 0.85, flatShading: true }), skin = mat(0xffd9b3), pants = mat(0x2b3a67), cap = mat(0xff5a5f), dark = mat(0x1a1a2e);
  AV.shirt = shirt;
  AV.body = mesh(G.box, shirt, 0, 1.12, 0, 0.78, 0.72, 0.46, avatar);
  AV.head = mesh(G.box, skin, 0, 1.75, 0, 0.6, 0.56, 0.56, avatar);
  AV.hats = {};
  const hat = (id) => { const g = new THREE.Group(); avatar.add(g); AV.hats[id] = g; g.visible = false; return g; };
  const hc = hat('cap');
  mesh(G.box, cap, 0, 2.08, 0, 0.66, 0.16, 0.62, hc);
  mesh(G.box, cap, 0, 2.02, -0.38, 0.6, 0.06, 0.3, hc);
  hat('none');
  const hw = hat('wizard');
  mesh(G.cyl, mat(0x5b3fd8), 0, 2.06, 0, 0.52, 0.06, 0.52, hw);
  const wc = mesh(G.cone16, mat(0x6c4cf0), 0, 2.5, 0, 0.36, 0.9, 0.36, hw);
  wc.rotation.z = -0.15;
  mesh(G.oct, mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.8 }), 0.05, 2.45, -0.36, 0.08, 0.08, 0.08, hw);
  const hh = hat('horn');
  const horn = mesh(G.cone16, mat(0xfff3b0, { emissive: 0xffc8f0, emissiveIntensity: 0.4 }), 0, 2.28, -0.2, 0.1, 0.55, 0.1, hh);
  horn.rotation.x = -0.35;
  const hcr = hat('crown');
  mesh(G.cyl8, M.gold, 0, 2.13, 0, 0.36, 0.22, 0.36, hcr);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; mesh(G.cone, M.gold, Math.cos(a) * 0.28, 2.34, Math.sin(a) * 0.28, 0.08, 0.22, 0.08, hcr); }
  mesh(G.oct, mat(0xff4d6d, { emissive: 0xff4d6d, emissiveIntensity: 0.6 }), 0, 2.15, -0.36, 0.07, 0.09, 0.07, hcr);
  const hl = hat('halo');
  const ring = mesh(G.torus, mat(0xfff3b0, { emissive: 0xffd23f, emissiveIntensity: 1.2 }), 0, 2.4, 0, 0.32, 0.32, 0.32, hl, false, false);
  ring.rotation.x = Math.PI / 2;
  mesh(G.box, dark, -0.14, 1.78, -0.285, 0.08, 0.12, 0.02, avatar, false, false);
  mesh(G.box, dark, 0.14, 1.78, -0.285, 0.08, 0.12, 0.02, avatar, false, false);
  const limb = (x, y, m, w, h) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0); avatar.add(piv);
    mesh(G.box, m, 0, -h / 2, 0, w, h, w, piv);
    return piv;
  };
  AV.legL = limb(-0.2, 0.76, pants, 0.3, 0.76);
  AV.legR = limb(0.2, 0.76, pants, 0.3, 0.76);
  AV.armL = limb(-0.52, 1.44, shirt, 0.24, 0.66);
  AV.armR = limb(0.52, 1.44, shirt, 0.24, 0.66);
}
const shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
shadowBlob.rotation.x = -Math.PI / 2;
scene.add(shadowBlob);

// ---------- 입력 ----------
const keys = new Set();
const joy = { id: null, x: 0, y: 0, ox: 0, oy: 0, active: false };
const cam = { yaw: 0, pitch: 0.42, dist: 11, distT: 11, cur: 11, shake: 0, sl: 0 };
// 시프트락: 캐릭터가 늘 카메라 방향을 보고, 카메라는 오른쪽 어깨 뒤로 비켜나요. PC에선 마우스 커서를 화면에 고정해요
let shiftLock = false, plSelfExit = false, plSkip = 0;
// 1인칭: 쿠크다스 성 내부에서만 켜져요
function firstPerson() { return typeof inCastleIn !== 'undefined' && inCastleIn(P.x, P.y, P.z); }
function pitchClamp(p) { return cam.fp ? clamp(p, -1.35, 1.35) : clamp(p, -0.15, 1.25); }
const FP_EYE = 1.65;
const SL_OFFSET = 1.3, SL_AIM_COS = Math.cos(55 * Math.PI / 180);
let gameTime = 0;

function inSkyZone(x, y, z) { return y > 60 && x > 55 && x < 140 && z < -50 && z > -340; }
function gscale() { return !P.launch && inSkyZone(P.x, P.y, P.z) ? 0.5 : 1; }
function applySkin() {
  const sk = S.skin;
  const sh = SHIRTS.find((x) => x.id === sk.shirt) || SHIRTS[0];
  AV.shirt.color.set(sh.c);
  AV.shirt.metalness = sh.id === 'gold' ? 0.4 : 0;
  for (const id in AV.hats) AV.hats[id].visible = id === sk.hat;
  if (!AV.hats[sk.hat]) AV.hats.cap.visible = true;
}
let trailT = 0;
function updateTrail(dt) {
  const tr = TRAILS.find((x) => x.id === S.skin.trail);
  if (!tr || !tr.cols) return;
  const sp = Math.hypot(P.vx, P.vz) + Math.abs(P.vy) * 0.5;
  if (sp < 2.5) return;
  trailT -= dt;
  if (trailT > 0) return;
  trailT = 0.035;
  const c = tr.cols[Math.floor(Math.random() * tr.cols.length)];
  burst(P.x + rand(-0.2, 0.2), P.y + rand(0.2, 1.2), P.z + rand(-0.2, 0.2), c, 1, 0.6, tr.id === 'star' ? 0.14 : 0.11, 0.6, tr.id === 'fire' ? -0.4 : 0.15, 0.55);
}

function inputVec() {
  let ix = 0, iy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (joy.active) { ix += joy.x; iy += -joy.y; }
  const l = Math.hypot(ix, iy);
  if (l > 1) { ix /= l; iy /= l; }
  return [ix, iy];
}

// ---------- 달리기 · 스태미너 ----------
// 왼쪽 Shift(터치는 달리기 버튼)로 1.5배 빨리 달려요. 스태미너는 연속 5초 분량이고,
// 다 쓰면 5초 동안 안 차고, 남겨 두고 멈추면 1초 뒤부터 차요. 빈 상태에서 가득 차기까지 10초.
// 점프맵(코스 발판 · 끝없는 탑 · 오늘의 도전)에서는 절대 달릴 수 없어요.
const RUN_MULT = 1.5, STAM_MAX = 5, STAM_FILL = 10, STAM_WAIT = 1, STAM_WAIT_EMPTY = 5;
const RUN = { stam: STAM_MAX, wait: 0, empty: false, on: false, touch: false, lock: false, ground: null, told: 0, fullT: 0, dust: 0, fov: 0 };
function runHeld() { return keys.has('ShiftLeft') || RUN.touch; }
function inJumpMap() {
  const m = playerMap();
  if (m === 'tower' || m === 'daily' || P.trackOn) return true;
  const g = P.ground || RUN.ground;
  return !!(g && g.course);
}
function runBlockedNotice() {
  if (gameTime - RUN.told < 2.5 && RUN.told) return;
  RUN.told = gameTime || 0.001;
  toast('점프맵에서는 달릴 수 없어요', 'bad', 1600);
}
function setRunTouch(on) {
  RUN.touch = !!on;
  const b = $('btnRun');
  if (b) { b.classList.toggle('on', RUN.touch); b.setAttribute('aria-pressed', RUN.touch ? 'true' : 'false'); }
}
function toggleRunTouch() {
  if (!RUN.touch && inJumpMap()) { runBlockedNotice(); return; }
  setRunTouch(!RUN.touch);
}
function staminaEmpty() {
  const box = $('stamBox');
  if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
  tone(220, 0.22, 'sawtooth', 0.05, -90);
}
function updateStamina(h, hasInput, L) {
  if (P.ground) RUN.ground = P.ground;
  if (!runHeld()) RUN.lock = false;
  const want = runHeld() && hasInput && !L && P.knock <= 0;
  const blocked = inJumpMap();
  if (blocked && RUN.touch) { setRunTouch(false); runBlockedNotice(); }
  RUN.on = want && !blocked && !RUN.empty && !RUN.lock && RUN.stam > 0;
  if (RUN.on) {
    RUN.stam -= h;
    RUN.wait = STAM_WAIT;
    if (RUN.stam <= 0) {
      // 모두 소진: 5초 동안 회복 안 함, 키를 뗐다 다시 눌러야 다시 달려요
      RUN.stam = 0; RUN.empty = true; RUN.lock = true; RUN.wait = STAM_WAIT_EMPTY;
      if (RUN.touch) setRunTouch(false);
      staminaEmpty();
    }
  } else if (RUN.wait > 0) {
    RUN.wait -= h;
  } else {
    RUN.empty = false;
    if (RUN.stam < STAM_MAX) RUN.stam = Math.min(STAM_MAX, RUN.stam + (STAM_MAX / STAM_FILL) * h);
  }
}
// 화면 하단 스태미너 바 · 달릴 때 먼지 · 살짝 넓어지는 시야
function updateRunFx(dt) {
  const bar = $('stamBar'), box = $('stamBox'), fill = $('stamFill');
  const full = RUN.stam >= STAM_MAX && !RUN.on;
  RUN.fullT = full ? RUN.fullT + dt : 0;
  const show = !full || RUN.fullT < 0.7;
  bar.classList.toggle('show', show);
  fill.style.width = (RUN.stam / STAM_MAX * 100).toFixed(1) + '%';
  box.classList.toggle('run', RUN.on);
  box.classList.toggle('tired', RUN.empty);
  box.classList.toggle('low', !RUN.empty && RUN.stam < STAM_MAX * 0.25);
  // 시야
  const fovT = RUN.on ? 1 : 0;
  const nf = RUN.fov + (fovT - RUN.fov) * (1 - Math.exp(-6 * dt));
  if (Math.abs(nf - RUN.fov) > 0.0005 || (fovT === 0 && RUN.fov !== 0 && nf < 0.002)) {
    RUN.fov = nf < 0.002 && fovT === 0 ? 0 : nf;
    camera.fov = 62 + RUN.fov * 6;
    camera.updateProjectionMatrix();
  }
  // 발밑 먼지
  if (RUN.on && P.grounded && Math.hypot(P.vx, P.vz) > SPEED) {
    RUN.dust -= dt;
    if (RUN.dust <= 0) {
      RUN.dust = 0.07;
      burst(P.x + rand(-0.25, 0.25), P.y + 0.08, P.z + rand(-0.25, 0.25), [0xffffff, 0xe8e0d0], 2, 1.2, 0.1, 0.4, 0.5, 0.35);
    }
  }
}

// ---------- 충돌 ----------
function overlapXZ(c, x, z, r) {
  if (c.t === 'b') {
    const dx = Math.max(Math.abs(x - c.x) - c.hx, 0), dz = Math.max(Math.abs(z - c.z) - c.hz, 0);
    return dx * dx + dz * dz < r * r;
  }
  const dx = x - c.x, dz = z - c.z, rr = c.r + r;
  return dx * dx + dz * dz < rr * rr;
}
function pushOut(c) {
  if (c.t === 'b') {
    const qx = clamp(P.x, c.x - c.hx, c.x + c.hx), qz = clamp(P.z, c.z - c.hz, c.z + c.hz);
    let dx = P.x - qx, dz = P.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= PR * PR) return null;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2), k = (PR - d) / d;
      P.x += dx * k; P.z += dz * k;
      return [dx / d, dz / d];
    }
    const px1 = c.x + c.hx - P.x, px2 = P.x - (c.x - c.hx), pz1 = c.z + c.hz - P.z, pz2 = P.z - (c.z - c.hz);
    const m = Math.min(px1, px2, pz1, pz2);
    if (m === px1) { P.x += px1 + PR; return [1, 0]; }
    if (m === px2) { P.x -= px2 + PR; return [-1, 0]; }
    if (m === pz1) { P.z += pz1 + PR; return [0, 1]; }
    P.z -= pz2 + PR; return [0, -1];
  }
  let dx = P.x - c.x, dz = P.z - c.z;
  const rr = c.r + PR, d2 = dx * dx + dz * dz;
  if (d2 >= rr * rr) return null;
  let d = Math.sqrt(d2);
  if (d < 1e-6) { dx = 1; dz = 0; d = 1; }
  const nx = dx / d, nz = dz / d;
  P.x = c.x + nx * rr; P.z = c.z + nz * rr;
  return [nx, nz];
}

function physicsStep(h) {
  gameTime += h;
  // 움직이는 발판
  for (const c of movers) {
    const m = c.move;
    if (!m) continue;
    const s = Math.sin(gameTime * m.spd + m.ph) * m.amp;
    const nx = m.ox + m.ax * s, ny = m.oy + m.ay * s, nz = m.oz + m.az * s;
    c.dx = nx - c.x; c.dy = ny - c.y; c.dz = nz - c.z;
    c.x = nx; c.y = ny; c.z = nz;
    c.top = c.y + c.hy; c.bot = c.y - c.hy;
    if (c.mesh) c.mesh.position.set(c.x, c.y, c.z);
  }
  // 사라지는 발판
  for (const c of fades) {
    const f = c.fade;
    if (f.st === 1) {
      f.t += h;
      c.mesh.position.x = c.x + Math.sin(f.t * 60) * 0.05;
      c.mesh.material.emissiveIntensity = 0.15 + 0.6 * (f.t / 0.75);
      if (f.t > 0.75) { f.st = 2; f.t = 0; c.solid = false; c.mesh.visible = false; }
    } else if (f.st === 2) {
      f.t += h;
      if (f.t > 2.6) { f.st = 0; f.t = 0; c.solid = true; c.mesh.visible = true; c.mesh.position.x = c.x; c.mesh.material.emissiveIntensity = 0.15; }
    }
  }
  // 회전 막대
  for (const s of sweepers) { s.ang += s.spd * h; s.g.rotation.y = -s.ang; }

  updatePlayer(h);
}

function updatePlayer(h) {
  if (typeof stkHold === 'function' && stkHold()) return;   // 옷장 안 / 괴물에게 잡히는 중
  P.inv = Math.max(0, P.inv - h);
  P.knock = Math.max(0, P.knock - h);
  const L = P.launch;
  const [ix, iy] = L ? [0, 0] : inputVec();
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  const wx = rx * ix + fx * iy, wz = rz * ix + fz * iy;
  const hasInput = !!(ix || iy) && !L;
  updateStamina(h, hasInput, L);
  const spd = SPEED * (firstPerson() || hellTower() ? 1 : speedMult()) * (RUN.on && !hellTower() ? RUN_MULT : 1);   // 성 안: 강화/펫 보너스 없이 기본 속도
  const onIce = P.grounded && P.ground && P.ground.ice;
  const turning = hasInput && (wx * P.vx + wz * P.vz) < 0;
  let rate;
  if (L) rate = 0;
  else if (P.knock > 0) rate = 1.2;
  else if (P.grounded) rate = onIce ? 1.6 : !hasInput ? 30 : turning ? 35 : 20;
  else rate = !hasInput ? 8 : turning ? 14 : 10;
  const k = 1 - Math.exp(-rate * h);
  P.vx += (wx * spd - P.vx) * k;
  P.vz += (wz * spd - P.vz) * k;
  if (P.grounded && !hasInput && !onIce && P.knock <= 0 && Math.hypot(P.vx, P.vz) < 0.3) P.vx = P.vz = 0;
  if ((ix || iy) && !L) P.face = Math.atan2(-wx, -wz);
  if ((shiftLock || cam.fp) && !L) P.face = cam.yaw;

  // 점프
  P.coyote = P.grounded ? 0.11 : P.coyote - h;
  P.jumpBuf -= h;
  if (P.jumpBuf > 0 && !L) {
    const jv = JUMP * (hellTower() ? 1 : jumpMult());
    if (P.coyote > 0) {
      P.vy = jv; P.grounded = false; P.ground = null; P.coyote = 0; P.jumpBuf = 0; P.cut = false;
      P.airJumps = airJumpMax();
      SFX.jump();
      burst(P.x, P.y + 0.1, P.z, 0xffffff, 6, 2.5, 0.12, 0.5, 0.6, 0.4);
    } else if (P.airJumps > 0) {
      P.vy = jv * 0.92; P.airJumps--; P.jumpBuf = 0; P.cut = false;
      SFX.djump();
      burst(P.x, P.y + 0.3, P.z, [0xc77dff, 0xffffff, 0x9ff3ff], 14, 3.5, 0.14, -0.5, 0.4, 0.5);
    }
  }
  if (!P.jumpHeld && P.vy > 4 && !P.cut && !L && !P.bounced) { P.vy *= 0.55; P.cut = true; }

  // 중력
  const fallMul = (P.vy < 0 && !L && !P.bounced) ? 1.3 : 1;
  P.vy -= GRAV * fallMul * (L ? 1 : gscale()) * h;
  if (P.vy < -55) P.vy = -55;

  // 발판과 함께 이동
  if (P.grounded && P.ground) { P.x += P.ground.dx; P.y += P.ground.dy; P.z += P.ground.dz; }

  // 수평 이동 + 벽 충돌
  P.x += P.vx * h; P.z += P.vz * h;
  const stepH = P.grounded ? 0.46 : 0.26;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of colliders) {
      if (!c.solid) continue;
      if (Math.abs(P.x - c.x) > c.ext + 1 || Math.abs(P.z - c.z) > c.ext + 1) continue;
      if (P.y >= c.top - stepH || P.y + PH <= c.bot) continue;
      const n = pushOut(c);
      if (n) {
        const vn = P.vx * n[0] + P.vz * n[1];
        if (vn < 0) { P.vx -= vn * n[0]; P.vz -= vn * n[1]; }
        if (c.kill && P.inv <= 0) { die(); return; }
      }
    }
  }

  // 수직 이동
  const prevY = P.y;
  P.y += P.vy * h;
  let land = null, landTop = -1e9;
  const sup = PR * 0.82;
  for (const c of colliders) {
    if (!c.solid) continue;
    if (Math.abs(P.x - c.x) > c.ext + 1 || Math.abs(P.z - c.z) > c.ext + 1) continue;
    if (P.vy <= 0) {
      if (P.y < c.top && prevY >= c.top - stepH && c.top > landTop && overlapXZ(c, P.x, P.z, sup)) { land = c; landTop = c.top; }
    } else if (P.y + PH > c.bot && prevY + PH <= c.bot + 0.05 && overlapXZ(c, P.x, P.z, sup)) {
      P.y = c.bot - PH; P.vy = 0; SFX.bonk();
    }
  }
  P.prevGround = P.ground;
  if (land) {
    const wasAir = !P.grounded;
    P.y = landTop;
    if (land.kill && P.inv <= 0) { die(); return; }
    if (land.bounce) {
      P.vy = land.bounce * (gscale() < 1 ? 1 : 1);
      P.grounded = false; P.ground = null; P.bounced = true; P.airJumps = airJumpMax();
      SFX.bounce();
      burst(P.x, P.y, P.z, [0xff4d9d, 0xffb3d6], 12, 4, 0.15, 2, 1, 0.6);
      onLand(land);
      return;
    }
    if (wasAir && P.vy < -14) { SFX.land(); burst(P.x, P.y + 0.05, P.z, 0xffffff, 5, 2, 0.1, 0.3, 0.6, 0.3); }
    P.vy = 0; P.grounded = true; P.ground = land; P.bounced = false;
    if (P.launch && P.launch.t > 0.4) P.launch = null;
  } else {
    P.grounded = false; P.ground = null;
  }
  if (P.ground && P.ground !== P.prevGround) onLand(P.ground);
  if (P.ground) onStand(P.ground, h); else P.standT = 0;
  if (P.launch) { P.launch.t += h; if (P.launch.t > 8) P.launch = null; }

  // 회전 막대
  if (P.knock <= 0) {
    for (const s of sweepers) {
      if (Math.abs(P.x - s.x) > s.len + 1.5 || Math.abs(P.z - s.z) > s.len + 1.5) continue;
      if (P.y > s.y1 || P.y + PH < s.y0) continue;
      for (const off of [0, Math.PI]) {
        const a = s.ang + off, cx = Math.cos(a), cz = Math.sin(a);
        const t = clamp((P.x - s.x) * cx + (P.z - s.z) * cz, 0, s.len);
        const qx = s.x + cx * t, qz = s.z + cz * t;
        if (Math.hypot(P.x - qx, P.z - qz) < PR + 0.24) {
          const sg = Math.sign(s.spd);
          const tx = -Math.sin(a) * sg, tz = Math.cos(a) * sg;
          P.vx = tx * 12; P.vz = tz * 12; P.vy = 8;
          P.grounded = false; P.ground = null; P.knock = 0.45;
          SFX.bonk();
          cam.shake = 0.25;
          burst(P.x, P.y + 1, P.z, 0xff4d6d, 8, 3, 0.12, 1, 1, 0.4);
          break;
        }
      }
    }
  }

  // 별
  for (const st of stars) {
    if (st.taken) continue;
    const dx = P.x - st.x, dy = P.y + 0.9 - st.y, dz = P.z - st.z;
    if (dx * dx + dy * dy + dz * dz < 1.6 * 1.6) collectStar(st);
  }

  if (goldOrb && !goldOrb.taken) {
    const dx = P.x - goldOrb.x, dy = P.y + 0.9 - goldOrb.y, dz = P.z - goldOrb.z;
    if (dx * dx + dy * dy + dz * dz < 2.2 * 2.2) catchGold();
  }

  // 추락
  const killY = P.launch ? -26 : P.respawn.y > 5 ? P.respawn.y - 28 : -26;
  if (P.y < killY) die();
}

function die() {
  SFX.die();
  S.deaths++;
  cam.shake = 0.2;
  if (!towerFall()) respawnAt(P.respawn);
}
function respawnAt(r) {
  P.x = r.x; P.y = r.y + 0.05; P.z = r.z;
  P.vx = P.vy = P.vz = 0;
  P.grounded = false; P.ground = null; P.prevGround = null; P.launch = null; P.knock = 0; P.inv = 0.3;
  cam.yaw = r.yaw != null ? r.yaw : cam.yaw;
  burst(P.x, P.y + 1, P.z, [0xffffff, 0x9ff3ff], 14, 3, 0.14, 1.5, 0.5, 0.6);
}

function launchTo(target, T = 3) {
  const dx = target.x - P.x, dy = target.y - P.y, dz = target.z - P.z;
  P.vx = dx / T; P.vz = dz / T; P.vy = (dy + 0.5 * GRAV * T * T) / T;
  P.grounded = false; P.ground = null;
  P.launch = { t: 0 };
  P.face = Math.atan2(-dx, -dz);
  SFX.launch();
  cam.shake = 0.3;
  burst(P.x, P.y, P.z, [0xffd166, 0xff8f3f, 0xffffff], 40, 8, 0.25, 3, 1, 1);
}

// ---------- 카메라 ----------
function rayDist(ox, oy, oz, dx, dy, dz, maxT) {
  let best = maxT;
  for (const c of colliders) {
    if (!c.solid || c.noCam) continue;
    const ex = c.ext + c.hy + maxT;
    if (Math.abs(c.x - ox) > ex || Math.abs(c.z - oz) > ex || Math.abs(c.y - oy) > ex) continue;
    const hx = c.hx, hz = c.hz;
    let t0 = 0, t1 = best;
    const sl = (o, d, mn, mx) => {
      if (Math.abs(d) < 1e-8) return o >= mn && o <= mx;
      let a = (mn - o) / d, b = (mx - o) / d;
      if (a > b) { const t = a; a = b; b = t; }
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
      return t0 <= t1;
    };
    if (!sl(ox, dx, c.x - hx, c.x + hx)) continue;
    if (!sl(oy, dy, c.bot, c.top)) continue;
    if (!sl(oz, dz, c.z - hz, c.z + hz)) continue;
    if (t0 > 0.05 && t0 < best) best = t0;
  }
  return best;
}
const camTarget = new THREE.Vector3(P.x, P.y + 1.4, P.z);
const camLook = new THREE.Vector3();
function updateCamera(dt) {
  const fp = firstPerson();
  if (fp !== !!cam.fp) {
    cam.fp = fp;
    if (fp) { cam.pitch3p = cam.pitch; cam.pitch = 0; camTarget.set(P.x, P.y + FP_EYE, P.z); }
    else { cam.pitch = cam.pitch3p != null ? cam.pitch3p : 0.42; cam.cur = 1.2; camTarget.set(P.x, P.y + 1.4, P.z); }
  }
  if (fp) {
    // 눈 높이에 카메라를 두고 바라보는 방향으로 돌려요 (계단 오를 때만 살짝 부드럽게)
    camTarget.set(P.x, lerp(camTarget.y, P.y + FP_EYE, 1 - Math.exp(-16 * dt)), P.z);
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    camera.position.copy(camTarget);
    if (cam.shake > 0) {
      cam.shake -= dt;
      const s = cam.shake * 0.15;
      camera.position.x += rand(-s, s); camera.position.y += rand(-s, s); camera.position.z += rand(-s, s);
    }
    camLook.set(camera.position.x - Math.sin(cam.yaw) * cp, camera.position.y - sp, camera.position.z - Math.cos(cam.yaw) * cp);
    camera.lookAt(camLook);
    cam.cur = 1.2;
  } else updateCamera3p(dt);
  sky.position.copy(camera.position);
  starField.position.copy(camera.position);
  updateCameraEnv();
}
function updateCamera3p(dt) {
  const want = cam.distT * (P.launch ? 1.6 : 1);
  cam.dist = lerp(cam.dist, want, 1 - Math.exp(-6 * dt));
  camTarget.x = lerp(camTarget.x, P.x, 1 - Math.exp(-18 * dt));
  camTarget.z = lerp(camTarget.z, P.z, 1 - Math.exp(-18 * dt));
  camTarget.y = lerp(camTarget.y, P.y + 1.4, 1 - Math.exp(-(P.launch ? 20 : 10) * dt));
  // 시프트락: 바라보는 점을 오른쪽 어깨 쪽으로 옮겨요. 오른쪽이 벽이면 그만큼 덜 옮겨요
  cam.sl += ((shiftLock && !P.launch ? 1 : 0) - cam.sl) * (1 - Math.exp(-10 * dt));
  camLook.copy(camTarget);
  if (cam.sl > 0.002) {
    const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), want = SL_OFFSET * cam.sl;
    const off = Math.max(0, Math.min(want, rayDist(camTarget.x, camTarget.y, camTarget.z, rx, 0, rz, want + 0.35) - 0.35));
    camLook.x += rx * off; camLook.z += rz * off;
  }
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const dx = Math.sin(cam.yaw) * cp, dy = sp, dz = Math.cos(cam.yaw) * cp;
  const hit = rayDist(camLook.x, camLook.y, camLook.z, dx, dy, dz, cam.dist + 0.4);
  const d = Math.max(1.2, Math.min(cam.dist, hit - 0.4));
  cam.cur = d < cam.cur ? d : lerp(cam.cur, d, 1 - Math.exp(-4 * dt));
  camera.position.set(camLook.x + dx * cam.cur, camLook.y + dy * cam.cur, camLook.z + dz * cam.cur);
  if (cam.shake > 0) {
    cam.shake -= dt;
    const s = cam.shake * 0.5;
    camera.position.x += rand(-s, s); camera.position.y += rand(-s, s); camera.position.z += rand(-s, s);
  }
  camera.lookAt(camLook);
}
function updateCameraEnv() {
  sun.position.set(P.x + SUN_OFF.x, P.y + SUN_OFF.y, P.z + SUN_OFF.z);
  sun.target.position.set(P.x, P.y, P.z);
  // 고도에 따른 밤하늘
  const cpos = camera.position;
  const nearTower = Math.abs(cpos.x - TOWER_C.x - 22) < 70 && Math.abs(cpos.z - TOWER_C.z + 40) < 70;
  const night = nearTower ? clamp((cpos.y - 70) / 160, 0, 1) : clamp((cpos.y - 48) / 32, 0, 1);
  skyUni.night.value = night;
  starField.material.opacity = night;
  scene.fog.color.copy(FOG_DAY).lerp(FOG_NIGHT, night);
  hemi.intensity = lerp(1.5, 0.9, night);
  sun.intensity = lerp(2.7, 1.4, night);
}

// ---------- 아바타 애니메이션 ----------
function updateAvatar(dt) {
  avatar.visible = !firstPerson();
  avatar.position.set(P.x, P.y, P.z);
  let d = P.face - avatar.rotation.y;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  avatar.rotation.y += d * (1 - Math.exp(-14 * dt));
  const sp = Math.hypot(P.vx, P.vz);
  if (P.grounded) {
    P.walk += dt * sp * 1.5;
    const sw = Math.sin(P.walk) * Math.min(1, sp / 6) * 0.9;
    AV.legL.rotation.x = sw; AV.legR.rotation.x = -sw;
    AV.armL.rotation.x = -sw * 0.8; AV.armR.rotation.x = sw * 0.8;
    AV.armL.rotation.z = AV.armR.rotation.z = 0;
    AV.body.position.y = 1.12 + Math.abs(Math.sin(P.walk)) * 0.05 * Math.min(1, sp / 6);
  } else {
    AV.legL.rotation.x = 0.5; AV.legR.rotation.x = -0.3;
    AV.armL.rotation.x = AV.armR.rotation.x = -0.4;
    AV.armL.rotation.z = -0.9; AV.armR.rotation.z = 0.9;
  }
  avatar.scale.set(1, 1, 1);
  if (P.atkT < 0.34 && typeof curWeapon === 'function') {
    const w = curWeapon(), k = Math.min(1, P.atkT / 0.2), e = 1 - Math.pow(1 - k, 3);
    const A = AV.armR, L2 = AV.armL;
    if (w.kind === 'melee') {
      const c = P.combo || 0;
      if (c === 0) { A.rotation.x = lerp(-2.3, 0.1, e); A.rotation.z = lerp(1.0, -0.8, e); }
      else if (c === 1) { A.rotation.x = lerp(-1.5, -0.7, e); A.rotation.z = lerp(-1.1, 1.2, e); }
      else { A.rotation.x = -1.45; A.rotation.z = lerp(1.2, -0.4, e); L2.rotation.z = -0.9; avatar.rotation.y = P.face + Math.min(1, P.atkT / 0.26) * TAU; }
    } else if (w.kind === 'slam') {
      A.rotation.x = lerp(-3.1, 0.9, e); A.rotation.z = 0; L2.rotation.x = lerp(-3.1, 0.9, e); L2.rotation.z = 0;
      const sq = P.atkT < 0.3 ? Math.sin(Math.min(1, P.atkT / 0.3) * Math.PI) : 0;
      avatar.scale.set(1 + sq * 0.12, 1 - sq * 0.16, 1 + sq * 0.12);
    } else if (w.kind === 'bow') { A.rotation.x = -1.55; A.rotation.z = 0; L2.rotation.x = -1.4; L2.rotation.z = -0.3; }
    else { A.rotation.x = lerp(-2.9, -1.6, e); A.rotation.z = 0; }
  }
  if (P.launch) avatar.rotation.x = Math.sin(gameTime * 3) * 0.2; else avatar.rotation.x = 0;
  // 그림자 원
  let gy = -1e9;
  for (const c of colliders) {
    if (!c.solid || c.top > P.y + 0.05 || c.top < gy) continue;
    if (Math.abs(P.x - c.x) > c.ext + 1 || Math.abs(P.z - c.z) > c.ext + 1) continue;
    if (overlapXZ(c, P.x, P.z, 0.01)) gy = c.top;
  }
  if (avatar.visible && gy > -1e8 && P.y - gy < 30) {
    shadowBlob.visible = true;
    shadowBlob.position.set(P.x, gy + 0.03, P.z);
    const s = clamp(1 - (P.y - gy) / 14, 0.35, 1);
    shadowBlob.scale.setScalar(s);
    shadowBlob.material.opacity = 0.3 * s;
  } else shadowBlob.visible = false;
}
