'use strict';
// =====================================================================
//  무기별 이펙트 정의
// =====================================================================
const WFX = {
  stick: { kind: 'slash', c1: 0xffffff, c2: 0xb5875a, op: 0.95, add: false, dur: 0.18, tail: 0.7, swing: 'whoosh', hitSnd: 'wood', chunk: 'wood', hit: { fl: 0xfff3d6, fs: 1.3, sp: [0xd9b48a, 0xffffff], n: 7, speed: 5 } },
  hammer: { kind: 'slash', c1: 0xffffff, c2: 0x7d8aa3, op: 0.85, add: false, dur: 0.22, tail: 0.7, swing: 'whooshLow', hitSnd: 'thud', heavy: true, chunk: 'rock', shake: 0.12, stop: 0.05, hit: { fl: 0xffffff, fs: 1.8, sp: [0xcfc6b5, 0x8a8273], n: 10, speed: 5 } },
  iron: { kind: 'slash', c1: 0xffffff, c2: 0x6f9fff, op: 1, add: true, dur: 0.15, tail: 0.65, edge: true, glint: true, swing: 'whoosh', hitSnd: 'shing', shake: 0.03, stop: 0.015, hit: { fl: 0xe6f3ff, fs: 2.1, sp: [0xffffff, 0xbfe0ff], n: 10, speed: 9 } },
  jelly: { kind: 'slam', wave: { c1: 0xd8ffe0, c2: 0x3fbf6a, wobble: true }, decal: 'splat', chunk: 'jelly', swing: 'boing', hitSnd: 'boing', shake: 0.08, stop: 0.02, hit: { fl: 0xc8ffd4, fs: 1.8, sp: [0x6fe08a, 0xd8ffe0], n: 10, speed: 5 }, idle: { c: [0x6fe08a, 0xb8ffc8], g: 4, rate: 6, size: 0.14 } },
  bow: { kind: 'shoot', muzzle: 0xfff3d6, trail: { c: [0xffffff, 0xe8d2b0], size: 0.2, life: 0.3, per: 3 }, swing: 'twang', hitSnd: 'thunk', chunk: 'wood', hit: { fl: 0xffffff, fs: 1.4, sp: [0xffffff, 0xd9b48a], n: 8, speed: 6 } },
  flame: { kind: 'slash', c1: 0xffe066, c2: 0xff3d0a, op: 1, add: true, dur: 0.19, tail: 0.85, embers: [0xff5a1f, 0xffcf3f, 0xff8f3f], swing: 'fire', hitSnd: 'fire', light: 0xff7a00, shake: 0.05, stop: 0.02, hit: { fl: 0xffb040, fs: 2.5, sp: [0xff5a1f, 0xffcf3f, 0xffffff], n: 16, speed: 6, up: 2.5 }, fireHit: true, idle: { c: [0xff8f3f, 0xffcf3f], g: -2.5, rate: 14, size: 0.16 } },
  fist: { kind: 'slam', wave: { c1: 0xfff0d0, c2: 0xa08a6a }, wave2: true, decal: 'crack', spikes: 0x8a7a6a, chunk: 'rock', dust: true, swing: 'quake', hitSnd: 'thud', shake: 0.35, stop: 0.08, hit: { fl: 0xffe8c0, fs: 2.4, sp: [0xcfc6b5, 0x8a8273], n: 12, speed: 6 } },
  staff: { kind: 'chain', tip: 0x9ff3ff, rune: 0x7af0ff, bolt: { core: 0xffffff, glow: 0x3fa8ff }, swing: 'zap', light: 0x7af0ff, hit: { fl: 0xbff6ff, fs: 2.3, sp: [0x7af0ff, 0xffffff], n: 14, speed: 8 }, idle: { c: [0x9ff3ff, 0xffffff], g: 0, rate: 12, size: 0.1, jitter: true } },
  axe: { kind: 'slash', c1: 0xe6fbff, c2: 0x1f9bf0, op: 1, add: true, dur: 0.21, tail: 0.75, arcBoost: 25, ice: true, decal: 'frost', chunk: 'ice', swing: 'whooshBig', hitSnd: 'ice', light: 0x9fdcff, shake: 0.08, stop: 0.03, hit: { fl: 0xdff6ff, fs: 2.3, sp: [0xcff3ff, 0x7fd4ff, 0xffffff], n: 14, speed: 6 }, idle: { c: [0xdff6ff, 0x9fdcff], g: 0.8, rate: 10, size: 0.12 } },
  scepter: { kind: 'homing', tip: 0xd8b8ff, rune: 0xc3a6ff, trail: { c: [0xc3a6ff, 0x9b5de5, 0xffffff], size: 0.32, life: 0.55, per: 3, rise: 1.2 }, swing: 'ghost', hitSnd: 'ghost', light: 0xb07dff, hit: { fl: 0xd8b8ff, fs: 2.5, sp: [0xc3a6ff, 0xffffff], n: 18, speed: 5, swirl: 7 }, idle: { c: [0xc3a6ff, 0x9b5de5], g: -1.2, rate: 10, size: 0.18 } },
  great: { kind: 'slash', c1: 0xffc46a, c2: 0xc8102e, op: 1, add: true, dur: 0.2, tail: 0.75, cross: true, scale: 1.15, embers: [0xff4d6d, 0xffcf3f, 0xffa040], swing: 'heavy', hitSnd: 'thud', light: 0xff4d6d, shake: 0.2, stop: 0.06, hit: { fl: 0xffc0a0, fs: 3.0, sp: [0xff4d6d, 0xffcf3f, 0xffffff], n: 20, speed: 9 }, idle: { c: [0xff4d6d, 0xffa040], g: -2, rate: 12, size: 0.15 } },
  breath: { kind: 'chain', tip: 0xffb040, rune: 0xff8f3f, fireBeam: true, swing: 'roar', hitSnd: 'fire', light: 0xff7a00, hit: { fl: 0xffb040, fs: 3.2, sp: [0xff5a1f, 0xffcf3f, 0xffffff], n: 22, speed: 7, up: 2.5 }, fireHit: true, idle: { c: [0xff8f3f, 0xffd166], g: -3, rate: 16, size: 0.18 } },
  starbow: { kind: 'shoot', muzzle: 0xffe08a, trail: { c: [0xffe08a, 0xffffff, 0xfff3b0], size: 0.24, life: 0.45, per: 4 }, beam: 0xffe08a, swing: 'chime', hitSnd: 'chime', light: 0xffd166, chunk: 'star', hit: { fl: 0xffe08a, fs: 2.7, sp: [0xffe08a, 0xffffff], n: 16, speed: 8 }, idle: { c: [0xffe08a, 0xffffff], g: 0, rate: 8, size: 0.14 } },
  scythe: { kind: 'slam', spin: { c1: 0xe2c2ff, c2: 0x2a0b4e, add: false, op: 0.95 }, wave: { c1: 0xc77dff, c2: 0x1a0530 }, decal: 'vortex', vortex: true, swing: 'void', hitSnd: 'void', light: 0x9b5de5, shake: 0.18, stop: 0.04, hit: { fl: 0xc77dff, fs: 2.6, sp: [0x9b5de5, 0xe2c2ff], n: 16, speed: 6, swirl: -8 }, idle: { c: [0x9b5de5, 0x5a2a9b], g: 1.2, rate: 12, size: 0.2 } },
  reaper: { kind: 'slam', spin: { c1: 0xfff0c0, c2: 0x9b5de5, add: true, op: 1 }, wave: { c1: 0xffe08a, c2: 0x9b5de5 }, decal: 'rune', blades: 6, pillar: 0xffe08a, swing: 'royal', hitSnd: 'heavy', light: 0xffd166, shake: 0.3, stop: 0.07, hit: { fl: 0xfff0c0, fs: 3.4, sp: [0xffe08a, 0xc77dff, 0xffffff], n: 22, speed: 9 }, idle: { c: [0xffe08a, 0xc77dff], g: -0.6, rate: 12, size: 0.14, orbit: true } },
};
const _tipV = new THREE.Vector3();
function weaponTip() {
  if (weaponGroup && weaponGroup.userData.tip) { weaponGroup.userData.tip.getWorldPosition(_tipV); return _tipV; }
  return _tipV.set(P.x, P.y + 1.3, P.z);
}
function later(sec, fn) { const o = new THREE.Object3D(); let done = false; addFx(o, (t) => { if (!done && t >= sec) { done = true; fn(); } }, sec + 0.01); }
// 기울어진 호 위의 점 (slashArc와 같은 변환)
function arcPoint(b, u, rr) {
  const arc = b.arc * Math.PI / 180, th = Math.PI / 2 - arc / 2 + arc * u;
  let x = Math.cos(th) * rr, y = 0, z = -Math.sin(th) * rr;
  if (b.dir < 0) x = -x;
  const ct = Math.cos(b.tilt), st = Math.sin(b.tilt);
  const x1 = x * ct - y * st, y1 = x * st + y * ct;
  const pa = b.pitch != null ? b.pitch : SLASH_PITCH, cp = Math.cos(pa), spp = Math.sin(pa);
  const y2 = y1 * cp - z * spp, z2 = y1 * spp + z * cp;
  const cf = Math.cos(b.face), sf = Math.sin(b.face);
  return [b.x + x1 * cf + z2 * sf, b.y + y2, b.z - x1 * sf + z2 * cf];
}
function groundY() { return P.grounded && P.ground ? P.ground.top : P.y; }

// ---------- 휘두르기 / 시전 ----------
function fxAttack(w, hits) {
  const F = WFX[w.id] || WFX.stick;
  const fx = -Math.sin(P.face), fz = -Math.cos(P.face);
  const gy = groundY(), onGround = P.grounded;
  const chest = P.y + 1.05;
  if (WSFX[F.swing]) WSFX[F.swing]();
  if (F.kind === 'slash') {
    const c = P.combo, fin = c === 2;
    const tilt = c === 0 ? 0.3 : c === 1 ? -0.34 : 0;
    const dir = c === 1 ? -1 : 1;
    const sc = (F.scale || 1) * (fin ? 1.2 : 1);
    const arcDeg = fin ? 330 : Math.min(230, (w.arc || 120) + 40 + (F.arcBoost || 0));
    const b = { x: P.x, y: chest - (fin ? 0.25 : 0), z: P.z, face: P.face, tilt, dir, arc: arcDeg, pitch: fin ? 0.12 : SLASH_PITCH, r0: w.range * 0.14 * sc, r1: (w.range + 0.6) * sc, c1: F.c1, c2: F.c2, add: F.add, op: F.op, dur: F.dur * (fin ? 1.5 : 1), tail: F.tail || 0.55, edgeW: 0.2, grow: fin ? 0.5 : 0 };
    slashArc(b);
    if (F.edge) slashArc(Object.assign({}, b, { r0: b.r1 * 0.93, r1: b.r1 * 1.05, c1: 0xffffff, c2: 0xdff0ff, edgeW: 0.7, op: 0.95, add: true }));
    if (F.cross) slashArc(Object.assign({}, b, { tilt: -tilt * 0.9, dir: -dir, dur: b.dur * 1.15, r1: b.r1 * 0.95 }));
    if (F.embers) for (let i = 0; i < 10; i++) { const p = arcPoint(b, Math.random(), rand(b.r0 + 0.3, b.r1)); sparks(p[0], p[1], p[2], { n: 2, c: F.embers, speed: 1.5, up: 2.5, g: -1.5, life: 0.7, size: 0.22, drag: 2.5 }); }
    if (F.ice) {
      for (let i = 0; i < 10; i++) { const p = arcPoint(b, Math.random(), rand(b.r0 + 0.3, b.r1)); sparks(p[0], p[1], p[2], { n: 2, c: [0xffffff, 0xbfeaff], speed: 1, up: 0.3, g: 0.6, life: 0.9, size: 0.35, size1: 0.6, drag: 3, alpha: 0.6 }); }
      const tp = arcPoint(b, 0.5, b.r1 * 0.8);
      chunks(tp[0], tp[1], tp[2], 'ice', { n: 6, size: 0.18, speed: 4, up: 3, dir: [fx, 0, fz], floor: gy, life: 0.9 });
      if (onGround) decal(P.x + fx * w.range * 0.7, gy, P.z + fz * w.range * 0.7, TEX.frost, { size: w.range * 1.6, s0: 0.5, dur: 1.2, op: 0.9 });
    }
    if (F.glint) for (const u of [0.25, 0.6, 0.95]) { const p = arcPoint(b, u, b.r1 * 0.98); later(b.dur * u, () => flare(p[0], p[1], p[2], 0xffffff, 0.9, 0.18)); }
    if (F.heavy && onGround) later(b.dur * 0.85, () => {
      const ix = P.x + fx * w.range * 0.75, iz = P.z + fz * w.range * 0.75;
      waveRing(ix, gy, iz, { c1: 0xf2ece0, c2: 0xb9b0a0, r: 2.6, dur: 0.4, op: 0.8 });
      decal(ix, gy, iz, TEX.dust, { size: 2.8, s0: 0.8, dur: 0.6, op: 0.8, growFast: true });
      chunks(ix, gy + 0.2, iz, 'rock', { n: 5, size: 0.14, speed: 3, up: 4, floor: gy, life: 0.8 });
      cam.shake = Math.max(cam.shake, 0.06);
    });
    if (fin) {
      const p = arcPoint(b, 0.95, b.r1);
      later(b.dur, () => {
        flare(p[0], p[1], p[2], F.c1, 2.4, 0.3);
        if (onGround) waveRing(P.x + fx * w.range * 0.8, gy, P.z + fz * w.range * 0.8, { c1: F.c1, c2: F.c2, r: 2.2 * sc, dur: 0.35, add: F.add, op: 0.8 });
        if (F.light) lightFlash(p[0], p[1], p[2], F.light, 25, 0.3);
      });
      cam.shake = Math.max(cam.shake, 0.05);
    }
  } else if (F.kind === 'slam') {
    const R = w.range + 0.6;
    later(0.06, () => {
      if (F.spin) {
        const b = { x: P.x, y: P.y + 0.9, z: P.z, face: P.face, tilt: 0, dir: 1, arc: 358, r0: R * 0.35, r1: R, c1: F.spin.c1, c2: F.spin.c2, add: F.spin.add, op: F.spin.op, dur: 0.2, tail: 0.85, edgeW: 0.25, grow: 0.4 };
        slashArc(b);
      }
      if (F.wave) {
        waveRing(P.x, gy, P.z, { c1: F.wave.c1, c2: F.wave.c2, r: R * 1.25, dur: 0.45, wobble: F.wave.wobble, add: !!F.light, op: 0.9 });
        if (F.wave2) later(0.12, () => waveRing(P.x, gy, P.z, { c1: F.wave.c1, c2: F.wave.c2, r: R * 1.8, dur: 0.55, op: 0.7 }));
      }
      if (onGround && F.decal) {
        const tx = TEX[F.decal];
        if (F.decal === 'rune') decal(P.x, gy, P.z, tx, { size: R * 2.4, s0: R * 0.6, dur: 1.1, add: true, color: 0xffe08a, spin: 2.5, rot: 0 });
        else if (F.decal === 'vortex') decal(P.x, gy, P.z, tx, { size: R * 2.3, s0: R * 2.8, dur: 0.9, spin: -6, op: 0.95 });
        else decal(P.x, gy, P.z, tx, { size: R * (F.decal === 'crack' ? 2.2 : 1.7), s0: 0.6, dur: F.decal === 'crack' ? 1.6 : 1.1, op: 0.95, growFast: true });
      }
      if (F.spikes && onGround) spikesRing(P.x, gy, P.z, 10, R * 0.85, F.spikes, 1.8);
      if (F.chunk === 'rock') chunks(P.x, gy + 0.3, P.z, 'rock', { n: 10, size: 0.2, speed: 6, up: 6, floor: gy, life: 1.0 });
      if (F.chunk === 'jelly') chunks(P.x, gy + 0.4, P.z, 'jelly', { n: 10, size: 0.18, speed: 5, up: 6, floor: gy, life: 1.1 });
      if (F.dust) for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; decal(P.x + Math.cos(a) * R * 0.9, gy, P.z + Math.sin(a) * R * 0.9, TEX.dust, { size: 1.8, s0: 0.4, dur: 0.7, op: 0.75 }); }
      if (F.vortex) sparks(P.x, P.y + 0.6, P.z, { n: 40, c: [0x9b5de5, 0xe2c2ff, 0x5a2a9b], speed: 1, radius: R, flat: true, swirl: -9, g: 0, drag: 0.5, life: 0.8, size: 0.25, cx: P.x, cz: P.z });
      if (F.blades) {
        for (let i = 0; i < F.blades; i++) {
          const a = P.face + (i / F.blades) * TAU;
          const dx = -Math.sin(a), dz = -Math.cos(a);
          const pts = [];
          for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(P.x + dx * (0.6 + k * R * 0.32), P.y + 1.0 + Math.sin(k / 6 * Math.PI) * 0.4, P.z + dz * (0.6 + k * R * 0.32)));
          ribbon(pts, 0.24, 0xffd98a, 0.35, { taper: true, op: 0.7 });
          ribbon(pts, 0.07, 0xffffff, 0.3, { taper: true, op: 0.9 });
        }
      }
      if (F.pillar) pillar(P.x, gy, P.z, { c1: F.pillar, r: 1.1, h: 14, dur: 0.6 });
      if (F.light) lightFlash(P.x, P.y + 1.5, P.z, F.light, 45, 0.4);
      cam.shake = Math.max(cam.shake, F.shake || 0);
      if (F.decal === 'splat') sparks(P.x, gy + 0.3, P.z, { n: 16, c: [0x6fe08a, 0xd8ffe0], speed: 5, up: 3, g: 10, life: 0.6, size: 0.2, flat: true });
    });
  } else if (F.kind === 'shoot') {
    const tp = weaponTip();
    flare(tp.x, tp.y, tp.z, F.muzzle, 1.4, 0.18);
    sparks(tp.x, tp.y, tp.z, { n: 6, c: F.trail.c, speed: 3, dir: [fx, 0.1, fz], spread: 0.5, life: 0.25, size: 0.12 });
    if (F.light) lightFlash(tp.x, tp.y, tp.z, F.light, 18, 0.2);
  } else if (F.kind === 'chain' || F.kind === 'homing') {
    const tp = weaponTip();
    flare(tp.x, tp.y, tp.z, F.tip, 1.8, 0.25);
    sparks(tp.x, tp.y, tp.z, { n: 10, c: [F.tip, 0xffffff], speed: 3, life: 0.35, size: 0.14 });
    if (onGround) decal(P.x, gy, P.z, TEX.rune, { size: 3.2, s0: 1.2, dur: 0.6, add: true, color: F.rune, spin: 4, op: 0.85 });
    if (F.light) lightFlash(tp.x, tp.y, tp.z, F.light, 20, 0.25);
  }
}
// ---------- 발사체 ----------
function fxShoot(w, p) {
  const F = WFX[w.id];
  if (!F) return;
  if (w.id === 'starbow') {
    p.m.geometry = starGeo; p.m.scale.setScalar(0.35);
    p.m.material = mat(0xffe08a, { emissive: 0xffc040, emissiveIntensity: 1.4 });
    p.spin = 14;
    const end = new THREE.Vector3(p.x + p.vx / p.spd * 26, p.y + p.vy / p.spd * 26, p.z + p.vz / p.spd * 26);
    ribbon([new THREE.Vector3(p.x, p.y, p.z), end], 0.12, F.beam, 0.25, { op: 0.8 });
  }
  if (F.kind === 'homing' || w.id === 'starbow') {
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flare, color: F.trail.c[0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    g.scale.setScalar(F.kind === 'homing' ? 1.6 : 1.4);
    p.m.add(g);
    p.glow = g;
  }
  p.trailAcc = 0;
}
function fxTrail(p, dt) {
  const F = p.w && WFX[p.w.id];
  if (!F || !F.trail) return;
  if (p.spin) p.m.rotation.z += p.spin * dt;
  const T = F.trail;
  sparks(p.x, p.y, p.z, { n: T.per, c: T.c, speed: 0.4, up: T.rise || 0, g: 0, life: T.life, size: T.size, radius: 0.08, drag: 3 });
}
function fxProjEnd(p) { if (p.glow) p.glow.material.dispose(); }
// ---------- 연쇄 ----------
function fxChainHop(w, a, b, k) {
  const F = WFX[w.id] || WFX.staff;
  const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
  const len = A.distanceTo(B);
  if (F.fireBeam) {
    const pts = boltPoints(A, B, 0.25, Math.max(6, Math.round(len * 1.2)));
    ribbon(pts, 0.55, 0xff6a1f, 0.32, { wave: true, op: 0.85 });
    ribbon(pts, 0.2, 0xffe08a, 0.28, {});
    for (let i = 0; i < 8; i++) { const q = pts[Math.floor(Math.random() * pts.length)]; sparks(q.x, q.y, q.z, { n: 2, c: [0xff5a1f, 0xffcf3f], speed: 1.5, up: 2, g: -1.5, life: 0.6, size: 0.24 }); }
    fireball(B.x, B.y, B.z, 1.6, k ? 0xff8f3f : 0xffb040, 0.4);
  } else {
    const segs = Math.max(6, Math.round(len * 1.4));
    const main = boltPoints(A, B, 0.6, segs);
    ribbon(main, 0.34, F.bolt.glow, 0.22, { op: 0.7, flicker: true });
    ribbon(main, 0.09, F.bolt.core, 0.2, { flicker: true });
    for (let j = 0; j < 2; j++) {
      const from = main[1 + Math.floor(Math.random() * (main.length - 2))];
      const to = new THREE.Vector3(from.x + rand(-1.6, 1.6), from.y + rand(-1, 0.8), from.z + rand(-1.6, 1.6));
      const br = boltPoints(from, to, 0.3, 4);
      ribbon(br, 0.14, F.bolt.glow, 0.18, { op: 0.6, flicker: true });
      ribbon(br, 0.05, F.bolt.core, 0.16, {});
    }
    sparks(B.x, B.y, B.z, { n: 10, c: [0x7af0ff, 0xffffff], speed: 7, life: 0.3, size: 0.12, drag: 4 });
  }
  if (F.light && k === 0) lightFlash(B.x, B.y, B.z, F.light, 30, 0.25);
}
// ---------- 적중 ----------
function fxHit(w, e, crit) {
  const F = (w && WFX[w.id]) || WFX.stick;
  const H = F.hit;
  const ey = (e.y || 0) + (e.boss ? e.size * 0.7 : 0.9);
  const tx = P.x - e.x, tz = P.z - e.z, td = Math.hypot(tx, tz) || 1;
  const off = Math.min(e.r * 0.8, 1.5);
  const x = e.x + tx / td * off, z = e.z + tz / td * off;
  flare(x, ey, z, H.fl, H.fs * (crit ? 1.6 : 1), crit ? 0.32 : 0.22);
  sparks(x, ey, z, { n: crit ? H.n * 2 : H.n, c: H.sp, speed: H.speed || 5, up: H.up || 1, g: F.fireHit ? -1 : 6, life: 0.45, size: 0.16, drag: 3, swirl: H.swirl || 0, cx: e.x, cz: e.z });
  if (F.chunk && F.chunk !== 'star' && Math.random() < 0.7) chunks(x, ey, z, F.chunk, { n: crit ? 5 : 3, size: F.chunk === 'ice' ? 0.16 : 0.12, speed: 4, up: 4, floor: (e.y || 0), life: 0.7 });
  if (F.chunk === 'star') chunks(x, ey, z, 'star', { n: crit ? 6 : 3, size: 0.18, speed: 5, up: 4, life: 0.6 });
  if (F.fireHit) fireball(x, ey, z, crit ? 1.6 : 1.1, 0xff8f3f, 0.3);
  if (crit) { waveRing(x, ey - 0.6, z, { c1: 0xffe08a, c2: 0xffcf3f, r: 1.8, dur: 0.25, add: true, op: 0.8 }); }
  hitSound(w);
}
// ---------- 대기 이펙트 ----------
let idleAcc = 0;
function weaponIdleFx(dt) {
  if (!weaponGroup || !inHunt() && !raid && Math.hypot(P.x, P.z) > 60) return;
  const F = WFX[S.combat.equip];
  if (!F || !F.idle) return;
  const I = F.idle;
  idleAcc += dt * I.rate;
  const tp = weaponTip();
  while (idleAcc >= 1) {
    idleAcc -= 1;
    if (I.orbit) sparks(tp.x, tp.y, tp.z, { n: 1, c: I.c, speed: 0.5, radius: 0.35, swirl: 6, g: I.g, life: 0.7, size: I.size, drag: 1, cx: tp.x, cz: tp.z });
    else sparks(tp.x, tp.y, tp.z, { n: 1, c: I.c, speed: I.jitter ? 2.5 : 0.4, radius: 0.12, g: I.g, life: I.jitter ? 0.2 : 0.7, size: I.size, drag: I.jitter ? 6 : 1 });
  }
}
