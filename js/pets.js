'use strict';
// =====================================================================
//  펫: 모델 (도형으로 만든 과자 브레인랏), 따라다니기, 부화장, 뽑기, 도감
// =====================================================================
G.sph = new THREE.SphereGeometry(1, 14, 10);
G.pud = new THREE.CylinderGeometry(0.72, 1, 1, 16);
G.donut = new THREE.TorusGeometry(1, 0.42, 8, 20);
G.ring = new THREE.TorusGeometry(1, 0.06, 6, 28);
G.egg = new THREE.SphereGeometry(1, 20, 14);

// ---------- 색칠: 황금은 금빛 금속, 무지개는 매 프레임 색이 도는 재질 ----------
const _pc = new THREE.Color(), _gold = new THREE.Color(0xffcf3f), _hsl = {};
function petPainter(v, rb) {
  const local = new Map();
  return (c, o, keep) => {
    if (keep || v === 0) return mat(c, o);
    if (v === 1) {
      const hex = _pc.set(c).lerp(_gold, 0.72).getHex();
      return mat(hex, Object.assign({ metalness: 0.55, roughness: 0.32, emissive: 0x5a3c00, emissiveIntensity: 0.22 }, o || {}));
    }
    const key = c + (o ? JSON.stringify(o) : '');
    let m = local.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.2, flatShading: true, emissive: c, emissiveIntensity: 0.22 }, o || {}));
      m.userData.rb = true;
      _pc.set(c).getHSL(_hsl);
      rb.push({ m, h: _hsl.h + rb.length * 0.13 });
      local.set(key, m);
    }
    return m;
  };
}
function tintRainbow(rb, t) {
  for (const r of rb) { r.m.color.setHSL((r.h + t * 0.18) % 1, 0.78, 0.62); r.m.emissive.copy(r.m.color); }
}

// 모델은 발밑이 원점, 앞이 -z (캐릭터와 같은 방향). 키는 0.9 안팎
const PET_MODEL = {
  biscat(a, e, pt, g, ck) {
    const C = 0xd9a066, D = 0xb87a42, CH = 0x5a3420;
    a(G.cyl, C, 0, 0.5, 0, 0.42, 0.2, 0.42, Math.PI / 2);
    a(G.cyl, D, 0, 0.5, 0, 0.43, 0.15, 0.43, Math.PI / 2);
    for (const [x, y] of [[-0.25, 0.7], [0.27, 0.68], [0.27, 0.32], [-0.22, 0.3], [0.05, 0.2]]) a(G.ico, CH, x, y, -0.1, 0.05, 0.05, 0.03);
    for (const [x, y] of [[-0.15, 0.6], [0.2, 0.45], [-0.1, 0.32]]) a(G.ico, CH, x, y, 0.1, 0.05, 0.05, 0.03);
    for (const sd of [-1, 1]) {
      a(G.cone, C, sd * 0.24, 0.9, 0, 0.13, 0.2, 0.08, 0, 0, -sd * 0.35);
      a(G.cone, 0xff9fb5, sd * 0.235, 0.88, -0.045, 0.07, 0.12, 0.03, 0, 0, -sd * 0.35, null, true);
      a(G.box, CH, sd * 0.28, 0.47, -0.11, 0.17, 0.012, 0.012, 0, 0, sd * 0.12);
      a(G.box, CH, sd * 0.28, 0.43, -0.11, 0.17, 0.012, 0.012, 0, 0, -sd * 0.1);
      a(G.sph, D, sd * 0.15, 0.05, -0.02, 0.09, 0.06, 0.12);
    }
    e(0.56, -0.1, 0.14, 0.055);
    a(G.box, 0xff8fab, 0, 0.48, -0.105, 0.05, 0.035, 0.02, 0, 0, 0, null, true);
    ck(0.47, -0.1, 0.22);
    pt.tail = a(G.cyl, D, 0.32, 0.34, 0.12, 0.035, 0.34, 0.035, 0, 0, -0.9);
  },
  pulcino(a, e, pt, g, ck) {
    const B = 0xe3a24f, Y = 0xffe14f;
    a(G.sph, B, 0, 0.15, 0, 0.4, 0.17, 0.38);
    a(G.cyl, 0x7ccf6b, 0, 0.28, 0, 0.43, 0.04, 0.41);
    a(G.box, 0xffd23f, 0, 0.31, 0, 0.6, 0.03, 0.6, 0, 0.4, 0);
    a(G.sph, Y, 0, 0.48, 0, 0.3, 0.28, 0.28);
    for (const sd of [-1, 1]) a(G.sph, 0xffd23f, sd * 0.29, 0.47, 0.02, 0.06, 0.12, 0.13, 0, 0, sd * 0.3);
    e(0.5, -0.255, 0.11, 0.046);
    a(G.cone, 0xff9f2e, 0, 0.43, -0.3, 0.055, 0.1, 0.055, -Math.PI / 2);
    ck(0.42, -0.24, 0.17);
    a(G.sph, B, 0, 0.76, 0.02, 0.4, 0.2, 0.38, 0.15);
    for (const [x, z] of [[-0.15, -0.1], [0.1, -0.16], [0.2, 0.05], [-0.05, 0.12], [-0.2, 0.08], [0.02, -0.02]]) a(G.box, 0xfff6e0, x, 0.95 - Math.hypot(x, z) * 0.35, z, 0.045, 0.02, 0.025, 0, x * 3, 0);
  },
  lumaca(a, e, pt, g, ck) {
    const B = 0xf3d9b1, P1 = 0xff9ec7;
    a(G.sph, B, 0, 0.12, 0.02, 0.18, 0.12, 0.46);
    a(G.sph, B, 0, 0.32, -0.32, 0.15, 0.2, 0.14);
    for (const sd of [-1, 1]) {
      a(G.cyl, B, sd * 0.06, 0.55, -0.34, 0.022, 0.2, 0.022, 0, 0, -sd * 0.25);
      a(G.sph, B, sd * 0.087, 0.66, -0.34, 0.045, 0.045, 0.045);
    }
    e(0.67, -0.37, 0.087, 0.034);
    ck(0.3, -0.44, 0.08, 0.035);
    a(G.box, 0x8a4a3a, 0, 0.26, -0.455, 0.05, 0.012, 0.01, 0, 0, 0, null, true);
    for (const sd of [-1, 1]) a(G.sph, P1, sd * 0.1, 0.48, 0.1, 0.11, 0.3, 0.3);
    a(G.cyl, 0xfff3f7, 0, 0.48, 0.1, 0.27, 0.11, 0.27, 0, 0, Math.PI / 2);
    for (const sd of [-1, 1]) a(G.cyl, 0xff7ab0, sd * 0.07, 0.48, 0.1, 0.285, 0.03, 0.285, 0, 0, Math.PI / 2);
  },
  porcino(a, e, pt, g, ck) {
    const CU = 0xffd98a, CA = 0x9a4f1c, PK = 0xff9fb5;
    a(G.pud, CU, 0, 0.26, 0, 0.38, 0.52, 0.38);
    a(G.cyl, CA, 0, 0.53, 0, 0.29, 0.07, 0.29);
    for (let k = 0; k < 7; k++) { const an = k / 7 * TAU + 0.3; a(G.box, CA, Math.cos(an) * 0.29, 0.47, Math.sin(an) * 0.29, 0.06, 0.1 + (k % 3) * 0.04, 0.04, 0, -an, 0); }
    a(G.sph, 0xff3b4f, 0, 0.64, 0, 0.075, 0.075, 0.075);
    a(G.cyl, 0x4a7a2a, 0.02, 0.73, 0, 0.008, 0.08, 0.008, 0, 0, -0.4);
    for (const sd of [-1, 1]) {
      a(G.cone, PK, sd * 0.24, 0.55, -0.04, 0.07, 0.11, 0.05, 0, 0, -sd * 0.7);
      a(G.cyl, PK, sd * 0.15, 0.04, -0.36, 0.06, 0.08, 0.06);
    }
    a(G.cyl, PK, 0, 0.27, -0.35, 0.1, 0.06, 0.075, Math.PI / 2);
    for (const sd of [-1, 1]) a(G.box, 0x8a3a4a, sd * 0.035, 0.27, -0.385, 0.025, 0.035, 0.01, 0, 0, 0, null, true);
    e(0.39, -0.305, 0.1, 0.046);
    ck(0.31, -0.32, 0.19);
    pt.tail = a(G.donut, PK, 0, 0.22, 0.37, 0.05, 0.05, 0.05, 0, Math.PI / 2, 0);
  },
  coniglio(a, e, pt, g, ck) {
    const W = 0xffffff, PK = 0xffb3c8;
    a(G.sph, W, 0, 0.36, 0, 0.3, 0.32, 0.28);
    a(G.sph, W, 0, 0.78, -0.02, 0.24, 0.22, 0.22);
    pt.ears = [];
    for (const sd of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(sd * 0.09, 0.95, 0); ear.rotation.z = -sd * 0.14; g.add(ear);
      a(G.sph, W, 0, 0.17, 0, 0.065, 0.22, 0.045, 0, 0, 0, null, false, ear);
      a(G.sph, PK, 0, 0.17, -0.03, 0.035, 0.16, 0.02, 0, 0, 0, null, true, ear);
      ear.userData.sd = sd; pt.ears.push(ear);
      a(G.sph, W, sd * 0.12, 0.04, -0.12, 0.09, 0.06, 0.12);
    }
    e(0.8, -0.205, 0.09, 0.045);
    a(G.sph, PK, 0, 0.74, -0.225, 0.03, 0.022, 0.02, 0, 0, 0, null, true);
    ck(0.72, -0.19, 0.14);
    a(G.donut, 0xe8b25a, 0, 0.36, 0, 0.36, 0.36, 0.36, Math.PI / 2);
    a(G.donut, 0xff8fbf, 0, 0.395, 0, 0.365, 0.365, 0.27, Math.PI / 2);
    const SPR = [0xffffff, 0x5ab8ff, 0xffd23f, 0x3ee6a5, 0xc77dff];
    for (let k = 0; k < 12; k++) { const an = k / 12 * TAU; a(G.box, SPR[k % 5], Math.cos(an) * 0.36, 0.505, Math.sin(an) * 0.36, 0.05, 0.015, 0.015, 0, an * 2.3, 0, null, true); }
    a(G.sph, W, 0, 0.3, 0.29, 0.08, 0.08, 0.08);
  },
  anatra(a, e, pt, g, ck) {
    const CR = [0xd8913c, 0xbf7326], Y = 0xffe14f, O = 0xff9f2e;
    a(G.sph, Y, 0, 0.3, 0.02, 0.22, 0.24, 0.26);
    for (let i = -5; i <= 5; i++) {
      const th = i * 0.4, s = 0.16 - 0.014 * Math.abs(i);
      a(G.sph, CR[(i + 5) % 2], Math.sin(th) * 0.3, 0.27, 0.02 + Math.cos(th) * 0.3, s * 1.3, s, s * 0.95, 0, th, 0);
    }
    a(G.sph, Y, 0, 0.6, -0.12, 0.18, 0.18, 0.18);
    a(G.sph, O, 0, 0.56, -0.31, 0.09, 0.032, 0.085);
    e(0.65, -0.275, 0.08, 0.04);
    ck(0.57, -0.27, 0.12, 0.032);
    a(G.cone, Y, 0.02, 0.8, -0.12, 0.04, 0.1, 0.04, 0, 0, 0.3);
    for (const sd of [-1, 1]) {
      a(G.box, O, sd * 0.1, 0.015, -0.16, 0.1, 0.03, 0.14);
      a(G.sph, Y, sd * 0.2, 0.42, 0.06, 0.05, 0.1, 0.14, 0, 0, sd * 0.3);
    }
  },
  pinguino(a, e, pt, g, ck) {
    const NV = 0x2b3a67, CO = 0xe0a860;
    a(G.cone16, CO, 0, 0.26, 0, 0.27, 0.5, 0.27, Math.PI);
    for (const y of [0.44, 0.32, 0.2]) { const r = 0.27 * (y - 0.01) / 0.5 + 0.006; a(G.ring, 0xb8813f, 0, y, 0, r, r, r * 1.5, Math.PI / 2); }
    a(G.sph, NV, 0, 0.66, 0, 0.27, 0.3, 0.25);
    a(G.sph, 0xffffff, 0, 0.55, -0.16, 0.17, 0.17, 0.1);
    e(0.78, -0.215, 0.09, 0.042, true);
    a(G.cone, 0xff9f2e, 0, 0.69, -0.27, 0.045, 0.1, 0.045, -Math.PI / 2);
    ck(0.68, -0.21, 0.16, 0.032);
    for (const sd of [-1, 1]) a(G.sph, NV, sd * 0.27, 0.62, 0, 0.05, 0.15, 0.1, 0, 0, sd * 0.45);
    a(G.sph, 0x9ff3d0, 0, 0.97, 0.02, 0.21, 0.13, 0.21);
    for (let k = 0; k < 5; k++) { const an = k / 5 * TAU + 0.3; a(G.sph, 0x9ff3d0, Math.cos(an) * 0.18, 0.9, 0.02 + Math.sin(an) * 0.18, 0.05, 0.07, 0.05); }
    a(G.sph, 0xff3b4f, 0, 1.12, 0.02, 0.055, 0.055, 0.055);
  },
  orsetto(a, e, pt, g, ck) {
    const WF = 0xe8b25a, WD = 0xc98a3a, BR = 0xa06a3a, LB = 0xe6c59a, SY = 0x9a4f1c;
    a(G.box, WF, 0, 0.4, 0, 0.56, 0.5, 0.3);
    for (const x of [-0.18, 0, 0.18]) for (const y of [0.24, 0.4, 0.56]) for (const z of [-0.151, 0.151]) a(G.box, WD, x, y, z, 0.13, 0.11, 0.02);
    a(G.box, SY, 0.14, 0.655, -0.05, 0.2, 0.02, 0.18);
    a(G.box, SY, 0.2, 0.59, -0.157, 0.05, 0.14, 0.012);
    a(G.box, SY, 0.09, 0.61, -0.157, 0.04, 0.1, 0.012);
    a(G.sph, BR, 0, 0.88, 0, 0.24, 0.22, 0.22);
    for (const sd of [-1, 1]) {
      a(G.sph, BR, sd * 0.17, 1.05, 0, 0.085, 0.085, 0.06);
      a(G.sph, LB, sd * 0.17, 1.05, -0.03, 0.05, 0.05, 0.03);
      a(G.sph, BR, sd * 0.33, 0.45, 0, 0.08, 0.15, 0.08, 0, 0, sd * 0.3);
      a(G.sph, BR, sd * 0.14, 0.08, -0.04, 0.1, 0.08, 0.13);
    }
    a(G.sph, LB, 0, 0.83, -0.19, 0.11, 0.08, 0.06);
    a(G.sph, 0x2b1a10, 0, 0.86, -0.245, 0.035, 0.025, 0.02, 0, 0, 0, null, true);
    e(0.93, -0.2, 0.095, 0.042);
    ck(0.84, -0.18, 0.16, 0.035);
    a(G.box, 0xfff3a0, 0, 1.11, 0, 0.13, 0.045, 0.13, 0, 0.5, 0);
  },
  polpo(a, e, pt, g, ck) {
    const PU = 0xb48cff;
    a(G.sph, PU, 0, 0.55, 0, 0.3, 0.32, 0.28);
    for (let k = 0; k < 6; k++) {
      const an = k / 6 * TAU + Math.PI / 6;
      a(G.sph, PU, Math.cos(an) * 0.24, 0.16, Math.sin(an) * 0.24, 0.07, 0.07, 0.2, 0, Math.PI / 2 - an, 0);
      a(G.sph, PU, Math.cos(an) * 0.43, 0.1, Math.sin(an) * 0.43, 0.06, 0.06, 0.06);
    }
    e(0.57, -0.26, 0.1, 0.05);
    ck(0.47, -0.25, 0.17);
    a(G.box, 0x5a2a6a, 0, 0.45, -0.275, 0.06, 0.015, 0.01, 0, 0, 0, null, true);
    a(G.cyl, 0xffffff, 0, 0.99, 0, 0.018, 0.3, 0.018);
    const pop = new THREE.Group(); pop.position.set(0, 1.22, 0); g.add(pop);
    a(G.cyl, 0xff6fae, 0, 0, 0, 0.17, 0.06, 0.17, Math.PI / 2, 0, 0, null, false, pop);
    for (const [r, c] of [[0.13, 0xffffff], [0.08, 0xffd23f], [0.035, 0xffffff]]) for (const sd of [-1, 1]) a(G.ring, c, 0, 0, sd * 0.031, r, r, 0.3, 0, 0, 0, null, false, pop);
    pt.spin.push(pop);
  },
  granchio(a, e, pt, g, ck) {
    const CR = 0xd99a4e, RD = 0xff6b4a;
    pt.claws = [];
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 3; k++) a(G.box, RD, sd * 0.42, 0.1, -0.1 + k * 0.14, 0.24, 0.035, 0.035, 0, 0, -sd * 0.5);
      a(G.cyl, RD, sd * 0.37, 0.3, -0.18, 0.025, 0.22, 0.025, 0, 0, sd * 1.1);
      const cl = new THREE.Group(); cl.position.set(sd * 0.48, 0.36, -0.26); g.add(cl);
      a(G.sph, RD, 0, 0, 0, 0.12, 0.1, 0.1, 0, 0, 0, null, false, cl);
      a(G.cone, RD, 0, 0.06, -0.1, 0.045, 0.14, 0.04, -1.2, 0, 0, null, false, cl);
      a(G.cone, RD, 0, -0.04, -0.1, 0.04, 0.12, 0.035, -1.9, 0, 0, null, false, cl);
      cl.userData.sd = sd; pt.claws.push(cl);
      a(G.cyl, RD, sd * 0.1, 0.47, -0.22, 0.022, 0.26, 0.022);
    }
    a(G.cyl, CR, 0, 0.24, 0, 0.36, 0.2, 0.36);
    a(G.donut, 0xc98a3a, 0, 0.34, 0, 0.34, 0.34, 0.22, Math.PI / 2);
    a(G.cyl, 0xfff0c8, 0, 0.345, 0, 0.3, 0.03, 0.3);
    for (const [x, z] of [[-0.12, -0.05], [0.1, 0.1], [0.14, -0.12]]) a(G.sph, 0xff3b4f, x, 0.38, z, 0.07, 0.05, 0.07);
    for (const [x, z] of [[0.0, 0.14], [-0.15, 0.1]]) a(G.cyl, 0x7ccf3b, x, 0.37, z, 0.075, 0.02, 0.075);
    for (const [x, z] of [[0.0, -0.17], [-0.18, -0.14], [0.2, 0.02]]) a(G.sph, 0x3a4fb8, x, 0.385, z, 0.045, 0.045, 0.045);
    e(0.63, -0.22, 0.1, 0.045, true);
    ck(0.24, -0.36, 0.16, 0.035);
  },
  tartaruga(a, e, pt, g, ck) {
    const GR = 0x7ccf6b;
    for (const [x, z] of [[-0.26, -0.24], [0.26, -0.24], [-0.26, 0.24], [0.26, 0.24]]) a(G.cyl, GR, x, 0.08, z, 0.08, 0.16, 0.08);
    a(G.cyl, 0xfff3e6, 0, 0.36, 0, 0.38, 0.3, 0.38);
    a(G.cyl, 0xff8fab, 0, 0.35, 0, 0.385, 0.05, 0.385);
    a(G.cyl, 0xffffff, 0, 0.52, 0, 0.39, 0.04, 0.39);
    for (let k = 0; k < 9; k++) { const an = k / 9 * TAU; a(G.sph, 0xffffff, Math.cos(an) * 0.31, 0.56, Math.sin(an) * 0.31, 0.06, 0.05, 0.06); }
    a(G.cone16, 0xff3b4f, 0, 0.66, 0, 0.085, 0.16, 0.085);
    a(G.sph, GR, 0, 0.32, -0.45, 0.16, 0.15, 0.16);
    e(0.36, -0.59, 0.075, 0.04);
    ck(0.29, -0.58, 0.11, 0.03);
    a(G.cone, GR, 0, 0.2, 0.42, 0.05, 0.12, 0.05, Math.PI / 2);
  },
  gufo(a, e, pt, g, ck) {
    const SH = 0xd6913e, SD = 0xb8742a, CR = 0xfff6e6;
    a(G.cyl, SH, 0, 0.45, 0, 0.28, 0.5, 0.28);
    for (const y of [0.33, 0.6]) a(G.ring, SD, 0, y, 0, 0.285, 0.285, 0.6, Math.PI / 2);
    a(G.sph, CR, 0, 0.71, 0, 0.27, 0.13, 0.27);
    a(G.sph, CR, 0, 0.2, 0, 0.27, 0.09, 0.27);
    for (const [x, z, c] of [[-0.12, -0.08, 0x5a3420], [0.1, 0.06, 0x5a3420], [0.02, -0.15, 0x7ccf3b], [-0.08, 0.12, 0x7ccf3b], [0.15, -0.05, 0x5a3420]]) a(G.ico, c, x, 0.82, z, 0.03, 0.03, 0.03);
    for (const sd of [-1, 1]) {
      a(G.cyl, 0xffffff, sd * 0.11, 0.56, -0.275, 0.1, 0.02, 0.1, Math.PI / 2, 0, 0, null, true);
      a(G.sph, 0x1a1a2e, sd * 0.11, 0.56, -0.29, 0.055, 0.055, 0.02, 0, 0, 0, null, true);
      a(G.sph, 0xffffff, sd * 0.11 + 0.02, 0.58, -0.305, 0.018, 0.018, 0.01, 0, 0, 0, null, true);
      a(G.cone, SD, sd * 0.19, 0.9, 0, 0.06, 0.16, 0.05, 0, 0, -sd * 0.35);
      const w = new THREE.Group(); w.position.set(sd * 0.28, 0.52, 0.02); g.add(w);
      a(G.sph, SD, sd * 0.05, -0.06, 0, 0.06, 0.22, 0.15, 0, 0, sd * 0.25, null, false, w);
      w.userData.sd = sd; pt.wings.push(w);
      a(G.sph, 0xff9f2e, sd * 0.08, 0.15, -0.12, 0.04, 0.03, 0.06);
    }
    a(G.cone, 0xff9f2e, 0, 0.47, -0.29, 0.04, 0.08, 0.04, Math.PI);
    ck(0.46, -0.27, 0.19, 0.035);
  },
  ape(a, e, pt, g, ck) {
    [0x8a5a3a, 0xfff2dc, 0x8a5a3a, 0xfff2dc].forEach((c, k) => a(G.box, c, 0, 0.3 + k * 0.1, 0.06, 0.44, 0.1, 0.36));
    a(G.box, 0x5a3a24, 0, 0.665, 0.06, 0.44, 0.03, 0.36);
    a(G.sph, 0xffd23f, 0, 0.48, -0.26, 0.18, 0.18, 0.17);
    e(0.52, -0.41, 0.075, 0.04);
    ck(0.44, -0.39, 0.12, 0.03);
    for (const sd of [-1, 1]) {
      a(G.cyl, 0x2b1a10, sd * 0.07, 0.7, -0.3, 0.012, 0.16, 0.012, 0, 0, -sd * 0.35);
      a(G.sph, 0x2b1a10, sd * 0.1, 0.78, -0.3, 0.03, 0.03, 0.03);
      const w = new THREE.Group(); w.position.set(sd * 0.12, 0.7, 0.08); g.add(w);
      a(G.sph, 0xeaf6ff, sd * 0.16, 0.06, 0, 0.2, 0.02, 0.12, 0, 0, sd * 0.35, { transparent: true, opacity: 0.6 }, true, w);
      w.userData.sd = sd; pt.wings.push(w);
    }
    a(G.cone, 0x2b1a10, 0, 0.45, 0.29, 0.04, 0.1, 0.04, Math.PI / 2);
    pt.fast = true;
  },
  volpe(a, e, pt, g, ck) {
    const OR = 0xff8a3d, W = 0xffffff, DK = 0x5a3420, PA = 0xe3b05b;
    a(G.sph, OR, 0, 0.34, 0.02, 0.24, 0.25, 0.32);
    a(G.sph, W, 0, 0.34, -0.22, 0.14, 0.16, 0.08);
    a(G.sph, OR, 0, 0.7, -0.14, 0.22, 0.2, 0.2);
    a(G.sph, W, 0, 0.64, -0.3, 0.1, 0.07, 0.1);
    a(G.sph, 0x2b1a10, 0, 0.66, -0.4, 0.035, 0.03, 0.025, 0, 0, 0, null, true);
    for (const sd of [-1, 1]) {
      a(G.cone, OR, sd * 0.12, 0.9, -0.12, 0.08, 0.16, 0.05, 0, 0, -sd * 0.2);
      a(G.cone, DK, sd * 0.12, 0.89, -0.16, 0.04, 0.1, 0.02, 0, 0, -sd * 0.2);
      for (const z of [-0.14, 0.18]) a(G.cyl, DK, sd * 0.11, 0.06, z, 0.05, 0.12, 0.05);
    }
    e(0.74, -0.31, 0.085, 0.04);
    ck(0.66, -0.3, 0.15, 0.03);
    const tail = new THREE.Group(); tail.position.set(0, 0.42, 0.3); tail.rotation.x = 1.0; g.add(tail);
    a(G.cone16, PA, 0, 0.22, 0, 0.17, 0.44, 0.17, 0, 0, 0, null, false, tail);
    for (let k = 0; k < 4; k++) { const y = 0.06 + k * 0.1, r = 0.17 * (1 - (y + 0.0) / 0.44) + 0.008; a(G.ring, 0xc98a3a, 0, y, 0, r, r, r * 1.6, Math.PI / 2, 0, 0, null, false, tail); }
    for (const [x, y] of [[0.03, 0.1], [-0.04, 0.2], [0.02, 0.3]]) a(G.sph, 0xffffff, x, y, -0.13 + y * 0.25, 0.03, 0.02, 0.03, 0, 0, 0, null, false, tail);
    pt.tail = tail;
  },
  pavone(a, e, pt, g, ck) {
    const BL = 0x3d8bff, LB = 0x7fd4ff;
    const fan = new THREE.Group(); fan.position.set(0, 0.42, 0.24); fan.rotation.x = -0.25; g.add(fan);
    const MC = [0xffffff, 0xffd6e8, 0xd6fff0, 0xfff6c8];
    for (let k = 0; k < 7; k++) {
      const an = -1.2 + k * 0.4, x = Math.sin(an) * 0.42, y = Math.cos(an) * 0.42;
      a(G.cone16, MC[k % 4], x, y, 0, 0.11, 0.26, 0.11, 0, 0, -an, null, false, fan);
      a(G.sph, 0x9b5de5, x * 0.7, y * 0.7, -0.05, 0.045, 0.045, 0.02, 0, 0, 0, null, false, fan);
    }
    pt.fan = fan;
    a(G.sph, BL, 0, 0.4, 0, 0.23, 0.3, 0.24);
    a(G.sph, LB, 0, 0.36, -0.15, 0.15, 0.2, 0.1);
    a(G.cyl, BL, 0, 0.66, -0.08, 0.07, 0.2, 0.07, -0.25);
    a(G.sph, BL, 0, 0.8, -0.12, 0.13, 0.13, 0.13);
    e(0.83, -0.22, 0.065, 0.034, true);
    a(G.cone, 0xffcf3f, 0, 0.79, -0.27, 0.03, 0.08, 0.03, -Math.PI / 2);
    for (let k = -1; k <= 1; k++) { a(G.cyl, 0x1f5fc8, k * 0.04, 0.97, -0.1, 0.008, 0.1, 0.008, 0, 0, -k * 0.35); a(G.sph, 0x2ee59d, k * 0.075, 1.02, -0.1, 0.025, 0.025, 0.025); }
    for (const sd of [-1, 1]) a(G.cyl, 0xffa64d, sd * 0.08, 0.06, 0, 0.02, 0.14, 0.02);
  },
  unicorno(a, e, pt, g, ck) {
    const WF = 0xf0c27a, WD = 0xc9913f, CR = 0xfff6e6, GD = 0xffcf3f;
    const L = [WF, CR, WF, CR, WF], H = [0.09, 0.035, 0.09, 0.035, 0.09];
    let y = 0.36;
    L.forEach((c, k) => {
      a(G.box, c, 0, y + H[k] / 2, 0.02, 0.34, H[k], 0.6);
      if (c === WF) for (const sd of [-1, 1]) for (const z of [-0.18, -0.06, 0.06, 0.18]) a(G.box, WD, sd * 0.171, y + H[k] / 2, 0.02 + z, 0.004, H[k] * 0.9, 0.012);
      y += H[k];
    });
    for (const [x, z] of [[-0.11, -0.2], [0.11, -0.2], [-0.11, 0.24], [0.11, 0.24]]) {
      a(G.box, WF, x, 0.21, z, 0.09, 0.32, 0.09);
      a(G.box, GD, x, 0.03, z, 0.1, 0.06, 0.1, 0, 0, 0, { metalness: 0.5, roughness: 0.35 });
    }
    a(G.box, WF, 0, 0.82, -0.24, 0.15, 0.32, 0.15, 0.35);
    a(G.box, WF, 0, 1.0, -0.36, 0.2, 0.2, 0.3);
    a(G.box, CR, 0, 0.95, -0.52, 0.16, 0.11, 0.06);
    e(1.04, -0.51, 0.065, 0.034);
    ck(0.98, -0.515, 0.085, 0.024);
    a(G.cone16, GD, 0, 1.22, -0.42, 0.045, 0.28, 0.045, -0.35, 0, 0, { emissive: 0xffa800, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.35 });
    for (const sd of [-1, 1]) a(G.cone, WF, sd * 0.07, 1.13, -0.28, 0.035, 0.08, 0.03);
    const MN = [0xff8fbf, 0x9ff3d0, 0xc3a6ff, 0xfff0a8, 0x7fd4ff];
    MN.forEach((c, k) => a(G.sph, c, 0, 1.12 - k * 0.1, -0.25 + k * 0.05, 0.075, 0.075, 0.075));
    MN.forEach((c, k) => { if (k < 4) a(G.sph, c, 0, 0.64 - k * 0.09, 0.36 + k * 0.03, 0.07, 0.07, 0.07); });
  },
  delfino(a, e, pt, g, ck) {
    const BL = 0x7fc8ff, W = 0xf4fbff;
    a(G.sph, BL, 0, 0.5, 0, 0.23, 0.22, 0.46);
    a(G.sph, W, 0, 0.42, -0.04, 0.16, 0.12, 0.36);
    a(G.sph, BL, 0, 0.45, -0.47, 0.08, 0.07, 0.15);
    e(0.57, -0.35, 0.12, 0.04);
    ck(0.48, -0.37, 0.15, 0.03);
    a(G.cyl, 0xfff6e6, 0, 0.71, 0, 0.16, 0.1, 0.16);
    a(G.cyl, 0xc98a3a, 0, 0.78, 0, 0.15, 0.08, 0.15);
    a(G.sph, 0xe8a54a, 0, 0.82, 0, 0.16, 0.11, 0.16);
    for (const [x, z] of [[-0.07, -0.05], [0.06, 0.07], [0.09, -0.06], [-0.05, 0.08]]) a(G.sph, 0x4a2418, x, 0.9, z, 0.022, 0.018, 0.022);
    for (const sd of [-1, 1]) a(G.sph, BL, sd * 0.24, 0.4, -0.1, 0.14, 0.03, 0.08, 0, 0.3 * sd, -sd * 0.45);
    const tail = new THREE.Group(); tail.position.set(0, 0.52, 0.44); g.add(tail);
    a(G.sph, BL, 0, 0, 0.05, 0.1, 0.09, 0.14, 0, 0, 0, null, false, tail);
    for (const sd of [-1, 1]) a(G.sph, BL, sd * 0.13, 0.02, 0.16, 0.16, 0.03, 0.08, 0, -sd * 0.5, 0, null, false, tail);
    pt.tail = tail;
  },
  koala(a, e, pt, g, ck) {
    const CH = 0x5a3423, CL = 0x6b4029, MK = 0x8a5a3a;
    a(G.box, CH, 0, 0.36, 0, 0.44, 0.48, 0.26);
    for (const x of [-0.105, 0.105]) for (const y of [0.42, 0.56]) a(G.box, CL, x, y, -0.135, 0.18, 0.12, 0.04);
    a(G.box, 0xffcf3f, 0, 0.17, 0, 0.47, 0.22, 0.29, 0, 0, 0, { metalness: 0.55, roughness: 0.3 });
    a(G.box, 0xd6243a, 0, 0.17, -0.147, 0.3, 0.1, 0.01);
    a(G.sph, MK, 0, 0.8, 0, 0.26, 0.23, 0.22);
    for (const sd of [-1, 1]) {
      a(G.sph, MK, sd * 0.26, 0.93, 0.01, 0.13, 0.13, 0.06);
      a(G.sph, 0xd9b38a, sd * 0.26, 0.93, -0.035, 0.08, 0.08, 0.03);
      a(G.sph, CH, sd * 0.27, 0.44, -0.04, 0.08, 0.13, 0.08, 0, 0, sd * 0.25);
    }
    a(G.sph, 0x2b1a10, 0, 0.77, -0.21, 0.07, 0.085, 0.05, 0, 0, 0, null, true);
    e(0.87, -0.19, 0.11, 0.04, true);
    ck(0.74, -0.18, 0.17, 0.035);
  },
  leone(a, e, pt, g, ck) {
    const Y = 0xffc04a, PF = 0xe8a54a;
    a(G.sph, Y, 0, 0.38, 0.05, 0.27, 0.27, 0.34);
    for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.24], [0.14, 0.24]]) a(G.cyl, Y, x, 0.09, z, 0.07, 0.18, 0.07);
    for (let k = 0; k < 12; k++) {
      const an = k / 12 * TAU, cx = Math.cos(an), cy = Math.sin(an);
      a(G.sph, PF, cx * 0.29, 0.74 + cy * 0.29, -0.12, 0.1, 0.1, 0.09);
      a(G.sph, 0xffffff, cx * 0.33, 0.74 + cy * 0.33 + 0.04, -0.15, 0.05, 0.03, 0.04);
    }
    a(G.sph, Y, 0, 0.74, -0.2, 0.23, 0.22, 0.2);
    a(G.sph, 0xfff3d6, 0, 0.67, -0.38, 0.11, 0.07, 0.07);
    a(G.sph, 0x7a3a1a, 0, 0.71, -0.44, 0.04, 0.03, 0.025, 0, 0, 0, null, true);
    e(0.79, -0.36, 0.09, 0.042);
    ck(0.7, -0.36, 0.15, 0.035);
    for (const sd of [-1, 1]) a(G.sph, Y, sd * 0.17, 0.93, -0.18, 0.06, 0.06, 0.04);
    const tail = new THREE.Group(); tail.position.set(0, 0.42, 0.38); tail.rotation.x = 0.9; g.add(tail);
    a(G.cyl, Y, 0, 0.16, 0, 0.025, 0.32, 0.025, 0, 0, 0, null, false, tail);
    a(G.sph, PF, 0, 0.34, 0, 0.08, 0.08, 0.08, 0, 0, 0, null, false, tail);
    pt.tail = tail;
  },
  king(a, e, pt, g, ck) {
    const WF = 0xf3c66b, WD = 0xc9913f, CR = 0xfffaf0, GD = 0xffcf3f, ML = { metalness: 0.6, roughness: 0.3 };
    a(G.box, 0xd6243a, 0, 0.5, 0.2, 0.62, 0.74, 0.03, 0.08, 0, 0);
    a(G.box, 0xffffff, 0, 0.86, 0.19, 0.66, 0.07, 0.07);
    let y = 0.06;
    for (let k = 0; k < 4; k++) {
      a(G.box, WF, 0, y + 0.08, 0, 0.6, 0.16, 0.36);
      for (const x of [-0.22, 0.22]) a(G.box, WD, x, y + 0.08, -0.182, 0.012, 0.15, 0.01);
      y += 0.16;
      if (k < 3) { a(G.box, CR, 0, y + 0.025, 0, 0.58, 0.05, 0.34); y += 0.05; }
    }
    e(0.62, -0.18, 0.12, 0.05, true);
    a(G.box, 0x5a2a1a, 0, 0.5, -0.185, 0.09, 0.025, 0.01, 0, 0, 0, null, true);
    ck(0.52, -0.18, 0.2, 0.04);
    for (const sd of [-1, 1]) {
      a(G.box, WF, sd * 0.36, 0.5, 0, 0.1, 0.28, 0.12, 0, 0, sd * 0.35);
      a(G.box, GD, sd * 0.16, 0.03, -0.04, 0.16, 0.06, 0.2, 0, 0, 0, ML);
    }
    a(G.cyl, GD, 0.47, 0.55, -0.12, 0.022, 0.6, 0.022, 0, 0, 0, ML);
    a(G.oct, 0xff4d6d, 0.47, 0.9, -0.12, 0.07, 0.09, 0.07, 0, 0, 0, { emissive: 0xff4d6d, emissiveIntensity: 0.8 });
    a(G.cyl8, GD, 0, 0.91, 0, 0.24, 0.1, 0.24, 0, 0, 0, Object.assign({ emissive: 0xffa800, emissiveIntensity: 0.25 }, ML));
    for (let k = 0; k < 6; k++) { const an = k / 6 * TAU; a(G.cone, GD, Math.cos(an) * 0.2, 1.03, Math.sin(an) * 0.2, 0.06, 0.16, 0.06, 0, 0, 0, ML); }
    a(G.oct, 0x5ab8ff, 0, 0.91, -0.245, 0.05, 0.06, 0.03, 0, 0, 0, { emissive: 0x5ab8ff, emissiveIntensity: 0.8 });
  },
  phoenix(a, e, pt, g, ck) {
    const AM = 0xff9f2e, FO = { emissive: 0xff6a00, emissiveIntensity: 0.5, roughness: 0.35 };
    const F1 = { emissive: 0xff5a1f, emissiveIntensity: 0.9 }, F2 = { emissive: 0xffb000, emissiveIntensity: 0.9 };
    a(G.sph, AM, 0, 0.55, 0.02, 0.27, 0.29, 0.33, 0, 0, 0, FO);
    a(G.sph, 0xffd27a, 0, 0.5, -0.17, 0.17, 0.2, 0.13, 0, 0, 0, FO);
    a(G.sph, AM, 0, 0.9, -0.16, 0.19, 0.19, 0.19, 0, 0, 0, FO);
    a(G.cone, 0xffd23f, 0, 0.86, -0.37, 0.055, 0.13, 0.055, -Math.PI / 2, 0, 0, { metalness: 0.3, roughness: 0.4 });
    e(0.95, -0.32, 0.085, 0.04, true);
    ck(0.86, -0.31, 0.13, 0.035);
    for (let k = -1; k <= 1; k++) a(G.cone, k ? 0xff5a1f : 0xffd23f, k * 0.07, 1.12 - Math.abs(k) * 0.03, -0.08 + Math.abs(k) * 0.03, 0.05, 0.22, 0.05, 0.5, 0, -k * 0.4, k ? F1 : F2);
    for (const sd of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sd * 0.24, 0.66, 0.04); g.add(w);
      [[0xff5a1f, F1, 0.5, 0], [0xff9f2e, F1, 0.42, 0.35], [0xffd23f, F2, 0.33, 0.7]].forEach(([c, o, len, an]) => {
        const r = sd * (1.15 - an * 0.5);
        a(G.cone, c, Math.sin(r) * len * 0.5, Math.cos(r) * len * 0.5 + an * 0.06, 0.02 + an * 0.12, 0.08, len, 0.035, 0, 0, -r, o, false, w);
      });
      w.userData.sd = sd; pt.wings.push(w);
    }
    for (let k = -1; k <= 1; k++) a(G.cone, k ? 0xff5a1f : 0xffd23f, k * 0.08, 0.42, 0.48, 0.06, 0.5, 0.04, 1.9, k * 0.3, 0, k ? F1 : F2);
    for (const sd of [-1, 1]) a(G.sph, 0xffb000, sd * 0.07, 0.28, -0.04, 0.03, 0.06, 0.03);
  },
  whale(a, e, pt, g, ck) {
    const LV = 0xb9a6ff, O = { emissive: 0x6a4cff, emissiveIntensity: 0.18 };
    a(G.sph, LV, 0, 0.62, 0, 0.5, 0.42, 0.66, 0, 0, 0, O);
    a(G.sph, 0xfff0ff, 0, 0.5, -0.06, 0.4, 0.27, 0.56);
    e(0.72, -0.52, 0.26, 0.055, true);
    ck(0.6, -0.54, 0.34, 0.05);
    for (const sd of [-1, 1]) a(G.sph, LV, sd * 0.5, 0.45, -0.12, 0.28, 0.04, 0.14, 0, sd * 0.3, -sd * 0.5, O);
    const tail = new THREE.Group(); tail.position.set(0, 0.72, 0.62); g.add(tail);
    a(G.sph, LV, 0, 0, 0.05, 0.16, 0.14, 0.2, 0, 0, 0, O, false, tail);
    for (const sd of [-1, 1]) a(G.sph, LV, sd * 0.17, 0.1, 0.22, 0.24, 0.04, 0.12, 0.5, -sd * 0.55, 0, O, false, tail);
    pt.tail = tail;
    const KC = [0xff8fbf, 0xffe066, 0x9ff3d0, 0x7fd4ff, 0xffffff, 0xc3a6ff];
    const sp = new THREE.Group(); sp.position.set(0, 1.02, -0.12); g.add(sp);
    KC.forEach((c, k) => { const an = k / 6 * TAU; a(G.ico, c, Math.cos(an) * 0.13, 0.12 + (k % 2) * 0.12, Math.sin(an) * 0.13, 0.065, 0.065, 0.065, k, k, 0, { emissive: c, emissiveIntensity: 0.5 }, false, sp); });
    a(G.ico, 0xffe066, 0, 0.36, 0, 0.09, 0.09, 0.09, 0, 0, 0, { emissive: 0xffc800, emissiveIntensity: 0.8 }, false, sp);
    pt.spin.push(sp);
  },
};

function buildPet(id, v, thumb) {
  const def = petById(id) || PETS[0];
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const rb = [];
  const paint = petPainter(v, rb);
  const pt = { wings: [], spin: [], tail: null };
  const a = (geo, c, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, o = null, keep = false, parent = body) => {
    const m = new THREE.Mesh(geo, paint(c, o, keep));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
    m.castShadow = !thumb;
    parent.add(m);
    return m;
  };
  const e = (y, z, gap, s = 0.05, white = false, parent = body) => {
    for (const sd of [-1, 1]) {
      if (white) {
        a(G.sph, 0xffffff, sd * gap, y, z, s * 1.35, s * 1.35, s * 0.8, 0, 0, 0, null, true, parent);
        a(G.sph, 0x1a1a2e, sd * gap, y, z - s * 0.7, s * 0.8, s * 0.8, s * 0.5, 0, 0, 0, null, true, parent);
        a(G.sph, 0xffffff, sd * gap + s * 0.25, y + s * 0.3, z - s * 1.05, s * 0.28, s * 0.28, s * 0.2, 0, 0, 0, null, true, parent);
      } else {
        a(G.sph, 0x1a1a2e, sd * gap, y, z, s, s * 1.2, s * 0.7, 0, 0, 0, null, true, parent);
        a(G.sph, 0xffffff, sd * gap + s * 0.3, y + s * 0.4, z - s * 0.55, s * 0.32, s * 0.32, s * 0.25, 0, 0, 0, null, true, parent);
      }
    }
  };
  const ck = (y, z, gap, s = 0.045) => { for (const sd of [-1, 1]) a(G.sph, 0xff8fab, sd * gap, y, z, s, s * 0.6, s * 0.4, 0, 0, 0, { transparent: true, opacity: 0.75 }, true); };
  (PET_MODEL[def.id] || PET_MODEL.biscat)(a, e, pt, body, ck);
  const geos = [];
  mergePetMeshes(body, geos);
  g.scale.setScalar(def.size || 1);
  return { g, body, rb, pt, def, v, geos };
}
// 펫 조각을 합쳐 그리기 횟수를 줄여요: 색만 다른 조각은 꼭짓점 색으로 한 메시에 (펫 1마리 수십 번 → 2~4번)
// 움직이는 부위(날개·꼬리)는 그룹별로 따로, 무지개 재질은 색이 계속 바뀌어서 재질별로 합쳐요
const _mv = new THREE.Vector3(), _mn = new THREE.Matrix3();
const vcMats = new Map();
function vcMat(m) {
  const key = [m.roughness, m.metalness, m.emissive.getHex(), m.emissiveIntensity, m.transparent ? 1 : 0, m.opacity].join('|');
  let v = vcMats.get(key);
  if (!v) {
    v = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: m.roughness, metalness: m.metalness, emissive: m.emissive.getHex(), emissiveIntensity: m.emissiveIntensity, transparent: m.transparent, opacity: m.opacity });
    vcMats.set(key, v);
  }
  return v;
}
function mergePetMeshes(group, geos) {
  const groups = new Map();
  for (const ch of [...group.children]) {
    if (ch.isMesh) {
      const k = ch.material.userData.rb ? ch.material : vcMat(ch.material);
      let l = groups.get(k); if (!l) groups.set(k, l = []); l.push(ch);
    } else mergePetMeshes(ch, geos);
  }
  for (const [m, list] of groups) {
    const vc = !!m.vertexColors;
    let total = 0;
    for (const ms of list) { ms.updateMatrix(); const gg = ms.geometry; total += gg.index ? gg.index.count : gg.attributes.position.count; }
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = vc ? new Float32Array(total * 3) : null;
    let o = 0;
    for (const ms of list) {
      const gg = ms.geometry, P = gg.attributes.position, N = gg.attributes.normal, idx = gg.index;
      const cnt = idx ? idx.count : P.count, c = ms.material.color;
      _mn.getNormalMatrix(ms.matrix);
      for (let k = 0; k < cnt; k++, o++) {
        const i = idx ? idx.getX(k) : k;
        _mv.fromBufferAttribute(P, i).applyMatrix4(ms.matrix);
        pos[o * 3] = _mv.x; pos[o * 3 + 1] = _mv.y; pos[o * 3 + 2] = _mv.z;
        _mv.fromBufferAttribute(N, i).applyMatrix3(_mn).normalize();
        nor[o * 3] = _mv.x; nor[o * 3 + 1] = _mv.y; nor[o * 3 + 2] = _mv.z;
        if (col) { col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b; }
      }
      group.remove(ms);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    geos.push(geo);
    const mm = new THREE.Mesh(geo, m);
    mm.castShadow = list[0].castShadow && !m.transparent;
    group.add(mm);
  }
}
function disposePetObj(o) {
  for (const r of o.rb) r.m.dispose();
  for (const gg of o.geos) gg.dispose();
}

// ---------- 추가 펫 모델 (v1.5) ----------
Object.assign(PET_MODEL, {
  criceto(a, e, pt, g, ck) {
    const B = 0xf2c38a, W = 0xfff3e0, PK = 0xffb3c8, DR = 0xd98a3a, RB = 0x6b2a2a;
    a(G.sph, B, 0, 0.34, 0, 0.3, 0.32, 0.28);
    a(G.sph, W, 0, 0.28, -0.2, 0.2, 0.2, 0.09);
    for (const sd of [-1, 1]) {
      a(G.sph, B, sd * 0.17, 0.62, 0, 0.08, 0.08, 0.04);
      a(G.sph, PK, sd * 0.17, 0.62, -0.03, 0.05, 0.05, 0.02, 0, 0, 0, null, true);
      a(G.sph, B, sd * 0.1, 0.35, -0.39, 0.05, 0.05, 0.04);
      a(G.sph, B, sd * 0.13, 0.03, -0.12, 0.08, 0.04, 0.1);
    }
    e(0.47, -0.25, 0.1, 0.04);
    a(G.sph, PK, 0, 0.41, -0.28, 0.03, 0.022, 0.02, 0, 0, 0, null, true);
    ck(0.39, -0.24, 0.18, 0.055);
    for (const z of [-0.36, -0.29]) a(G.cyl, DR, 0, 0.24, z, 0.15, 0.045, 0.15, Math.PI / 2);
    a(G.cyl, RB, 0, 0.24, -0.325, 0.135, 0.03, 0.135, Math.PI / 2);
    a(G.sph, B, 0, 0.18, 0.28, 0.04, 0.04, 0.04);
  },
  topino(a, e, pt, g, ck) {
    const CR = 0xe8c27a, CD = 0xb8863a, GR = 0xd9c2c8, PK = 0xffb3c8;
    a(G.box, CR, 0, 0.2, 0.05, 0.38, 0.26, 0.48);
    for (const x of [-0.11, 0, 0.11]) for (const z of [-0.09, 0.05, 0.19]) a(G.sph, CD, x, 0.33, z, 0.025, 0.012, 0.025);
    a(G.box, CR, 0, 0.42, -0.24, 0.3, 0.26, 0.24);
    for (const x of [-0.08, 0.08]) a(G.sph, CD, x, 0.555, -0.24, 0.022, 0.01, 0.022);
    a(G.cone, CR, 0, 0.38, -0.44, 0.09, 0.14, 0.09, -Math.PI / 2);
    a(G.sph, PK, 0, 0.38, -0.52, 0.03, 0.03, 0.03, 0, 0, 0, null, true);
    for (const sd of [-1, 1]) {
      a(G.cyl, GR, sd * 0.15, 0.6, -0.22, 0.11, 0.025, 0.11, Math.PI / 2);
      a(G.cyl, PK, sd * 0.15, 0.6, -0.235, 0.07, 0.01, 0.07, Math.PI / 2, 0, 0, null, true);
      a(G.box, 0x5a3420, sd * 0.13, 0.37, -0.45, 0.14, 0.008, 0.008, 0, 0, sd * 0.15, null, true);
      for (const z of [-0.12, 0.22]) a(G.sph, GR, sd * 0.13, 0.04, z, 0.06, 0.04, 0.08);
    }
    e(0.47, -0.36, 0.08, 0.035);
    ck(0.4, -0.36, 0.12, 0.03);
    pt.tail = a(G.cyl, GR, 0, 0.28, 0.42, 0.015, 0.36, 0.015, 1.2, 0, 0);
  },
  riccio(a, e, pt, g, ck) {
    const BR = 0x8a5a3a, FA = 0xf3d9b1, PZ = 0xb8742a;
    a(G.sph, BR, 0, 0.26, 0.04, 0.32, 0.26, 0.36);
    a(G.sph, FA, 0, 0.24, -0.26, 0.18, 0.16, 0.16);
    a(G.cone, FA, 0, 0.22, -0.42, 0.08, 0.14, 0.07, -Math.PI / 2);
    a(G.sph, 0x2b1a10, 0, 0.22, -0.5, 0.035, 0.03, 0.03, 0, 0, 0, null, true);
    e(0.3, -0.385, 0.075, 0.034);
    ck(0.22, -0.37, 0.12, 0.03);
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion(), eu = new THREE.Euler();
    for (let i = 0; i < 18; i++) {
      const th = i * 2.4, ph = 0.3 + (i % 4) * 0.3;
      dir.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      if (dir.z < -0.3) continue;
      dir.normalize(); q.setFromUnitVectors(up, dir); eu.setFromQuaternion(q);
      const cx = dir.x * 0.3, cy = 0.26 + dir.y * 0.24, cz = 0.04 + dir.z * 0.34;
      a(G.cyl8, PZ, cx + dir.x * 0.08, cy + dir.y * 0.08, cz + dir.z * 0.08, 0.022, 0.24, 0.022, eu.x, eu.y, eu.z);
      a(G.box, 0xffffff, cx + dir.x * 0.17, cy + dir.y * 0.17, cz + dir.z * 0.17, 0.022, 0.022, 0.022, i, i, 0, null, true);
    }
    for (const sd of [-1, 1]) {
      a(G.donut, PZ, sd * 0.05, 0.56, 0.06, 0.07, 0.07, 0.07, 0, 0, sd * 0.5);
      a(G.sph, FA, sd * 0.13, 0.03, -0.12, 0.06, 0.04, 0.08);
    }
  },
  pecora(a, e, pt, g, ck) {
    const W = 0xfff8f0, PK = 0xffd6e8, DK = 0x3a3040;
    for (const [x, y, z, r1, c] of [[0, 0.42, 0.05, 0, W], [-0.17, 0.38, 0.12, 0.6, W], [0.17, 0.38, 0.12, -0.5, PK], [-0.15, 0.4, -0.12, 0.3, W], [0.15, 0.42, -0.1, 0.9, W], [0, 0.56, 0.12, 0.2, W], [0, 0.3, 0.22, 1.2, W], [-0.05, 0.56, -0.06, 1.5, PK], [0.12, 0.3, -0.15, 0.4, W]]) a(G.cyl, c, x, y, z, 0.13, 0.2, 0.13, r1, r1 * 0.7, 0);
    for (const [x, z] of [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.18], [0.12, 0.18]]) a(G.cyl, DK, x, 0.1, z, 0.04, 0.2, 0.04);
    a(G.sph, DK, 0, 0.47, -0.3, 0.14, 0.15, 0.13);
    for (const sd of [-1, 1]) a(G.sph, DK, sd * 0.16, 0.5, -0.27, 0.08, 0.035, 0.05, 0, 0, sd * 0.4);
    a(G.cyl, W, 0, 0.62, -0.28, 0.07, 0.07, 0.07);
    e(0.5, -0.41, 0.065, 0.034, true);
    ck(0.42, -0.4, 0.1, 0.03);
  },
  cagnolino(a, e, pt, g, ck) {
    const CH = 0xd9913e, CD = 0xb8742a, BR = 0x8a4a1c;
    a(G.cyl8, CH, 0, 0.3, 0.02, 0.15, 0.7, 0.15, Math.PI / 2);
    for (let k = 0; k < 10; k++) a(G.box, 0xfff3d6, Math.cos(k * 1.7) * 0.13, 0.3 + Math.sin(k * 1.7) * 0.13, -0.28 + k * 0.06, 0.02, 0.02, 0.02, k, k, 0, null, true);
    a(G.cyl8, 0x5a2a14, 0, 0.3, 0.33, 0.155, 0.1, 0.155, Math.PI / 2);
    for (const [x, z] of [[-0.08, -0.2], [0.08, -0.2], [-0.08, 0.22], [0.08, 0.22]]) a(G.cyl, CD, x, 0.08, z, 0.04, 0.16, 0.04);
    a(G.sph, CH, 0, 0.44, -0.42, 0.16, 0.15, 0.16);
    a(G.sph, CH, 0, 0.39, -0.57, 0.08, 0.07, 0.1);
    a(G.sph, 0x2b1a10, 0, 0.41, -0.67, 0.035, 0.03, 0.025, 0, 0, 0, null, true);
    for (const sd of [-1, 1]) a(G.sph, BR, sd * 0.16, 0.38, -0.38, 0.05, 0.14, 0.08, 0, 0, sd * 0.25);
    e(0.49, -0.55, 0.075, 0.036);
    ck(0.41, -0.53, 0.11, 0.03);
    pt.tail = a(G.cyl, CH, 0, 0.42, 0.4, 0.025, 0.2, 0.025, 0.7, 0, 0);
  },
  panda(a, e, pt, g, ck) {
    const W = 0xfffaf5, BK = 0x2b2b38;
    a(G.sph, W, 0, 0.32, 0, 0.32, 0.3, 0.3);
    for (const sd of [-1, 1]) {
      a(G.sph, BK, sd * 0.19, 0.58, 0.02, 0.08, 0.08, 0.06);
      a(G.sph, BK, sd * 0.1, 0.38, -0.25, 0.075, 0.06, 0.04, 0, 0, sd * 0.5);
      a(G.sph, BK, sd * 0.3, 0.3, -0.05, 0.08, 0.12, 0.08, 0, 0, sd * 0.3);
      a(G.sph, BK, sd * 0.14, 0.05, -0.12, 0.09, 0.06, 0.11);
    }
    e(0.385, -0.275, 0.1, 0.028, true);
    a(G.sph, BK, 0, 0.3, -0.29, 0.035, 0.025, 0.02, 0, 0, 0, null, true);
    ck(0.28, -0.27, 0.17, 0.035);
    a(G.sph, 0xffb3d6, 0, 0.63, 0, 0.13, 0.085, 0.13);
    a(G.sph, 0x7ccf6b, 0.07, 0.7, 0.02, 0.07, 0.015, 0.035, 0, 0.5, 0.3);
  },
  scoiattolo(a, e, pt, g, ck) {
    const OR = 0xc9773a, CR = 0xfff0dc, CN = 0x6b3a1f, MB = 0xd9a066;
    a(G.sph, OR, 0, 0.3, 0.02, 0.2, 0.24, 0.2);
    a(G.sph, CR, 0, 0.28, -0.14, 0.13, 0.17, 0.08);
    a(G.sph, OR, 0, 0.62, -0.04, 0.17, 0.16, 0.16);
    for (const sd of [-1, 1]) {
      a(G.cone, OR, sd * 0.1, 0.8, -0.03, 0.045, 0.12, 0.035, 0, 0, -sd * 0.2);
      a(G.cone, CR, sd * 0.11, 0.88, -0.03, 0.02, 0.06, 0.02, 0, 0, -sd * 0.2);
      a(G.sph, OR, sd * 0.1, 0.04, -0.08, 0.07, 0.04, 0.1);
      a(G.sph, OR, sd * 0.09, 0.4, -0.29, 0.04, 0.04, 0.04);
    }
    e(0.66, -0.18, 0.07, 0.036);
    a(G.sph, 0x2b1a10, 0, 0.6, -0.2, 0.025, 0.02, 0.02, 0, 0, 0, null, true);
    ck(0.59, -0.17, 0.12, 0.03);
    a(G.sph, CN, 0, 0.36, -0.24, 0.1, 0.09, 0.09);
    a(G.sph, 0xe8c28a, 0, 0.31, -0.24, 0.095, 0.045, 0.085);
    const tail = new THREE.Group(); tail.position.set(0, 0.25, 0.2); g.add(tail);
    [[0.05, 0.08, 0.15], [0.25, 0.18, 0.17], [0.48, 0.16, 0.16], [0.66, 0.06, 0.12]].forEach(([y, z, r]) => a(G.sph, MB, 0, y, z, r, r, r, 0, 0, 0, null, false, tail));
    a(G.sph, CN, 0, 0.79, 0.04, 0.06, 0.06, 0.06, 0, 0, 0, null, false, tail);
    pt.tail = tail;
  },
  pesce(a, e, pt, g, ck) {
    const BB = 0xd9913e, BD = 0xb8742a;
    a(G.sph, BB, 0, 0.45, 0, 0.15, 0.27, 0.42);
    for (const z of [-0.08, 0.06, 0.2]) for (const y of [0.38, 0.52]) for (const sd of [-1, 1]) a(G.sph, BD, sd * 0.125, y, z, 0.03, 0.05, 0.06);
    const tail = new THREE.Group(); tail.position.set(0, 0.45, 0.38); g.add(tail);
    a(G.cone, BB, 0, 0.1, 0.1, 0.05, 0.22, 0.12, 0.7, 0, 0, null, false, tail);
    a(G.cone, BB, 0, -0.1, 0.1, 0.05, 0.22, 0.12, Math.PI - 0.7, 0, 0, null, false, tail);
    pt.tail = tail;
    a(G.cone, BB, 0, 0.74, 0.02, 0.03, 0.12, 0.12);
    e(0.53, -0.335, 0.075, 0.04, true);
    a(G.sph, 0x6b2a2a, 0, 0.38, -0.39, 0.06, 0.04, 0.03, 0, 0, 0, null, true);
    ck(0.45, -0.35, 0.1, 0.03);
  },
  fenicottero(a, e, pt, g, ck) {
    const PK = 0xff8fb0, RD = 0xff3b4f, GR = 0x4fbf5a;
    for (const sd of [-1, 1]) {
      a(G.cyl, PK, sd * 0.06, 0.32, 0, 0.018, 0.64, 0.018);
      a(G.box, PK, sd * 0.06, 0.01, -0.04, 0.06, 0.02, 0.1);
      a(G.sph, PK, sd * 0.2, 0.78, 0.06, 0.05, 0.12, 0.18, 0, 0, sd * 0.4);
    }
    a(G.sph, RD, 0, 0.74, 0.04, 0.22, 0.2, 0.28);
    for (let k = 0; k < 12; k++) { const an = k * 2.1, yy = 0.66 + (k % 3) * 0.07; a(G.box, 0xffe066, Math.cos(an) * 0.19, yy, 0.04 + Math.sin(an) * 0.24, 0.018, 0.03, 0.018, 0, an, 0, null, true); }
    for (let k = 0; k < 5; k++) { const an = -0.9 + k * 0.45; a(G.cone, GR, Math.sin(an) * 0.1, 0.78 + Math.cos(an) * 0.06, 0.3, 0.05, 0.16, 0.03, 1.4, 0, -an * 0.8); }
    a(G.cyl, PK, 0, 0.92, -0.14, 0.035, 0.22, 0.035, -0.5);
    a(G.cyl, PK, 0, 1.08, -0.16, 0.035, 0.16, 0.035, 0.4);
    a(G.sph, PK, 0, 1.2, -0.12, 0.09, 0.09, 0.1);
    a(G.cone, 0xfff0e0, 0, 1.15, -0.25, 0.03, 0.1, 0.03, -2.0);
    a(G.cone, 0x2b2b38, 0, 1.11, -0.29, 0.018, 0.05, 0.018, -2.6, 0, 0, null, true);
    e(1.23, -0.19, 0.05, 0.025);
    ck(1.17, -0.2, 0.07, 0.02);
  },
  lontra(a, e, pt, g, ck) {
    const BR = 0x8a5a3a, LB = 0xd9b38a, CK = 0xd9a066, CH = 0x4a2a18;
    a(G.sph, BR, 0, 0.36, 0.02, 0.22, 0.34, 0.2);
    a(G.sph, LB, 0, 0.34, -0.14, 0.15, 0.24, 0.08);
    a(G.sph, BR, 0, 0.78, -0.02, 0.18, 0.16, 0.16);
    a(G.sph, LB, 0, 0.73, -0.15, 0.1, 0.07, 0.06);
    a(G.sph, 0x2b1a10, 0, 0.76, -0.205, 0.035, 0.025, 0.02, 0, 0, 0, null, true);
    for (const sd of [-1, 1]) {
      a(G.sph, BR, sd * 0.15, 0.9, 0, 0.045, 0.045, 0.03);
      a(G.box, 0x2b1a10, sd * 0.13, 0.72, -0.19, 0.1, 0.006, 0.006, 0, 0, sd * 0.1, null, true);
      a(G.sph, BR, sd * 0.11, 0.04, -0.08, 0.07, 0.04, 0.1);
      a(G.sph, BR, sd * 0.12, 0.45, -0.27, 0.05, 0.05, 0.05);
    }
    e(0.82, -0.17, 0.08, 0.036);
    ck(0.74, -0.16, 0.13, 0.03);
    a(G.cyl, CK, 0, 0.38, -0.24, 0.16, 0.04, 0.16, Math.PI / 2);
    for (const [x, y] of [[-0.07, 0.43], [0.06, 0.35], [-0.03, 0.3], [0.08, 0.46]]) a(G.ico, CH, x, y, -0.265, 0.025, 0.025, 0.015);
    pt.tail = a(G.sph, BR, 0, 0.12, 0.28, 0.08, 0.04, 0.22, 0.3);
  },
  cervo(a, e, pt, g, ck) {
    const BR = 0xc98a4a, W = 0xfff6ea, CO = 0xe0a860;
    a(G.sph, BR, 0, 0.52, 0.04, 0.2, 0.2, 0.34);
    for (const [x, z] of [[-0.09, -0.16], [0.09, -0.16], [-0.09, 0.22], [0.09, 0.22]]) a(G.cyl, BR, x, 0.18, z, 0.035, 0.36, 0.035);
    for (const [x, z] of [[-0.08, -0.05], [0.07, 0.08], [-0.05, 0.2], [0.09, -0.15]]) a(G.sph, W, x, 0.71, z, 0.04, 0.015, 0.04);
    a(G.cyl, BR, 0, 0.78, -0.22, 0.06, 0.26, 0.06, 0.4);
    a(G.sph, BR, 0, 0.94, -0.3, 0.14, 0.13, 0.15);
    a(G.sph, BR, 0, 0.9, -0.43, 0.07, 0.06, 0.08);
    a(G.sph, 0x2b1a10, 0, 0.92, -0.5, 0.03, 0.025, 0.02, 0, 0, 0, null, true);
    e(0.98, -0.42, 0.075, 0.034);
    ck(0.9, -0.41, 0.11, 0.028);
    for (const sd of [-1, 1]) {
      a(G.sph, BR, sd * 0.14, 1.0, -0.25, 0.06, 0.03, 0.04, 0, 0, sd * 0.5);
      a(G.cone16, CO, sd * 0.08, 1.14, -0.27, 0.05, 0.16, 0.05, 0, 0, Math.PI - sd * 0.25);
      a(G.sph, sd < 0 ? 0xffb3d6 : 0x9ff3d0, sd * 0.1, 1.25, -0.27, 0.075, 0.065, 0.075);
    }
    a(G.sph, W, 0, 0.58, 0.38, 0.05, 0.05, 0.04);
  },
  drago(a, e, pt, g, ck) {
    const DG = [0xffb3c8, 0xfff6ee, 0x9ff3a0], GR = 0x7ccf6b;
    let ly = 0, lz = 0;
    for (let k = 0; k < 7; k++) { const z = -0.12 + k * 0.12, y = 0.45 + k * 0.06 + Math.sin(k * 1.3) * 0.12, r = 0.17 - k * 0.012; a(G.sph, DG[k % 3], 0, y, z, r, r, r); ly = y; lz = z; }
    a(G.cyl, 0xc98a4a, 0, ly + 0.08, lz + 0.14, 0.02, 0.32, 0.02, 1.0);
    a(G.sph, GR, 0, 0.7, -0.36, 0.22, 0.2, 0.22);
    a(G.sph, GR, 0, 0.63, -0.57, 0.12, 0.09, 0.11);
    for (const sd of [-1, 1]) {
      a(G.sph, 0x2b1a10, sd * 0.045, 0.66, -0.675, 0.016, 0.016, 0.01, 0, 0, 0, null, true);
      a(G.cone, 0xffe066, sd * 0.1, 0.93, -0.32, 0.04, 0.16, 0.04, -0.3, 0, -sd * 0.25);
      a(G.cyl, 0xfff0a8, sd * 0.2, 0.62, -0.62, 0.008, 0.3, 0.008, 0, 0, sd * 1.2);
      const w = new THREE.Group(); w.position.set(sd * 0.14, 0.7, 0.1); g.add(w);
      a(G.cone, 0xffd6e8, sd * 0.14, 0.05, 0, 0.12, 0.28, 0.03, 0, 0, -sd * 1.2, null, false, w);
      w.userData.sd = sd; pt.wings.push(w);
    }
    e(0.76, -0.53, 0.095, 0.046, true);
    ck(0.66, -0.55, 0.14, 0.035);
  },
  axolotl(a, e, pt, g, ck) {
    const PK = 0xffb3d6, CC = [0xffd6ec, 0xa8e6ff, 0xfff0a8];
    a(G.sph, PK, 0, 0.24, 0.1, 0.2, 0.18, 0.36);
    a(G.sph, PK, 0, 0.36, -0.24, 0.27, 0.21, 0.22);
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 3; k++) { const c = CC[k], x = sd * (0.27 + k * 0.03), y = 0.5 - k * 0.11; a(G.sph, c, x, y, -0.2, 0.1, 0.08, 0.08); a(G.sph, c, x + sd * 0.07, y + 0.03, -0.17, 0.07, 0.06, 0.06); }
      for (const z of [-0.12, 0.28]) a(G.sph, PK, sd * 0.16, 0.06, z, 0.06, 0.04, 0.08);
    }
    e(0.42, -0.42, 0.12, 0.034);
    a(G.box, 0xc2577a, 0, 0.32, -0.45, 0.14, 0.012, 0.01, 0, 0, 0, null, true);
    ck(0.35, -0.43, 0.19, 0.035);
    const tail = new THREE.Group(); tail.position.set(0, 0.26, 0.42); g.add(tail);
    a(G.sph, PK, 0, 0.02, 0.14, 0.04, 0.12, 0.22, 0, 0, 0, null, false, tail);
    pt.tail = tail;
  },
  bradipo(a, e, pt, g, ck) {
    const BR = 0xa08a6a, FA = 0xe6d6b8, BK = 0x5a3a2a, BA = 0xe8b25a, BD = 0xb8742a;
    a(G.cyl, BA, 0, 0.13, 0, 0.36, 0.26, 0.36);
    a(G.donut, 0xfff6ea, 0, 0.255, 0, 0.33, 0.33, 0.12, Math.PI / 2);
    for (const r of [0.24, 0.15]) a(G.ring, BD, 0, 0.262, 0, r, r, 0.6, Math.PI / 2);
    a(G.sph, BR, 0, 0.55, 0.02, 0.25, 0.3, 0.22);
    a(G.sph, FA, 0, 0.62, -0.15, 0.17, 0.15, 0.09);
    for (const sd of [-1, 1]) {
      a(G.sph, BK, sd * 0.07, 0.63, -0.225, 0.07, 0.035, 0.02, 0, 0, -sd * 0.35, null, true);
      const arm = new THREE.Group(); arm.position.set(sd * 0.22, 0.62, -0.02); arm.rotation.z = sd * 0.5; g.add(arm);
      a(G.sph, BR, 0, -0.12, 0, 0.065, 0.16, 0.065, 0, 0, 0, null, false, arm);
      for (let k = -1; k <= 1; k++) a(G.cone, 0xfff6e0, k * 0.025, -0.3, -0.02, 0.012, 0.06, 0.012, Math.PI, 0, 0, null, false, arm);
      a(G.sph, BR, sd * 0.13, 0.3, -0.18, 0.07, 0.06, 0.1);
    }
    e(0.64, -0.235, 0.075, 0.03);
    a(G.sph, 0x2b1a10, 0, 0.58, -0.24, 0.03, 0.02, 0.02, 0, 0, 0, null, true);
    a(G.box, 0x5a2a1a, 0, 0.545, -0.235, 0.05, 0.01, 0.01, 0, 0, 0, null, true);
    ck(0.58, -0.22, 0.12, 0.03);
  },
  lupo(a, e, pt, g, ck) {
    const SV = 0x9aa8c8, W = 0xeef2ff, MC = 0xe8a54a, MD = 0xb8742a;
    const moon = new THREE.Group(); moon.position.set(0, 0.95, 0.12); g.add(moon);
    a(G.cyl, MC, 0, 0, 0, 0.3, 0.08, 0.3, Math.PI / 2, 0, 0, { emissive: 0xffa800, emissiveIntensity: 0.35 }, false, moon);
    a(G.ring, MD, 0, 0, -0.045, 0.24, 0.24, 0.6, 0, 0, 0, null, false, moon);
    for (let k = 0; k < 10; k++) { const an = k / 10 * TAU; a(G.sph, MC, Math.cos(an) * 0.3, Math.sin(an) * 0.3, 0, 0.045, 0.045, 0.045, 0, 0, 0, null, false, moon); }
    a(G.cyl, MD, 0, 0, -0.045, 0.11, 0.01, 0.11, Math.PI / 2, 0, 0, null, false, moon);
    pt.moon = moon;
    a(G.sph, SV, 0, 0.4, 0.04, 0.24, 0.26, 0.36);
    a(G.sph, W, 0, 0.38, -0.22, 0.14, 0.17, 0.09);
    for (const [x, z] of [[-0.12, -0.18], [0.12, -0.18], [-0.12, 0.26], [0.12, 0.26]]) a(G.cyl, SV, x, 0.1, z, 0.055, 0.2, 0.055);
    a(G.sph, SV, 0, 0.76, -0.2, 0.2, 0.19, 0.19);
    a(G.sph, W, 0, 0.69, -0.36, 0.1, 0.08, 0.12);
    a(G.sph, 0x2b2b38, 0, 0.72, -0.48, 0.035, 0.03, 0.025, 0, 0, 0, null, true);
    for (const sd of [-1, 1]) { a(G.cone, SV, sd * 0.12, 0.98, -0.18, 0.075, 0.18, 0.05, 0, 0, -sd * 0.15); a(G.cone, W, sd * 0.12, 0.97, -0.21, 0.035, 0.1, 0.02, 0, 0, -sd * 0.15); }
    e(0.8, -0.36, 0.085, 0.04, true);
    ck(0.71, -0.36, 0.14, 0.03);
    const tail = new THREE.Group(); tail.position.set(0, 0.45, 0.38); tail.rotation.x = 0.9; g.add(tail);
    a(G.sph, SV, 0, 0.18, 0, 0.09, 0.22, 0.09, 0, 0, 0, null, false, tail);
    a(G.sph, W, 0, 0.36, 0, 0.06, 0.08, 0.06, 0, 0, 0, null, false, tail);
    pt.tail = tail;
  },
});

// ---------- 따라다니는 펫 ----------
const petFol = [];
const auraRingMat = new THREE.MeshBasicMaterial({ color: 0x7af0ff, transparent: true, opacity: 0.85, depthWrite: false });
const PET_SLOTS = [[-1.9, 0.5], [1.9, 0.5], [-1.6, 1.8], [1.6, 1.8], [-3.1, 1.1], [3.1, 1.1], [0, 2.7]];
function makeFollower(id, v) {
  const o = buildPet(id, v, false);
  scene.add(o.g);
  const f = { key: id + ':' + v, id, v, o, def: o.def, x: P.x, y: P.y, z: P.z, ry: avatar.rotation.y, ph: Math.random() * 6, fxT: 0 };
  if (o.def.rar >= 6) {
    const ring = new THREE.Mesh(G.ring, auraRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(0.55, 0.55, 1.4);
    o.g.add(ring);
    f.ring = ring;
  }
  o.g.position.set(f.x, f.y, f.z);
  return f;
}
function dropFollower(f) { scene.remove(f.o.g); disposePetObj(f.o); }
function syncPetModels() {
  const pool = petFol.splice(0);
  for (const [id, v] of S.pets.eq) {
    const k = id + ':' + v, i = pool.findIndex((f) => f.key === k);
    if (i >= 0) petFol.push(pool.splice(i, 1)[0]);
    else petFol.push(makeFollower(id, v));
  }
  for (const f of pool) dropFollower(f);
}
function updatePets(dt) {
  const t = performance.now() / 1000;
  const n = petFol.length;
  const bx = Math.sin(avatar.rotation.y), bz = Math.cos(avatar.rotation.y);
  for (let i = 0; i < n; i++) {
    const f = petFol[i], o = f.o;
    // 양옆에서 조금 뒤로 (카메라와 캐릭터 사이를 가리지 않게)
    const sl = PET_SLOTS[i] || PET_SLOTS[PET_SLOTS.length - 1], ss = Math.max(1, f.def.size || 1);
    const lat = sl[0] * (0.85 + 0.15 * ss), back = sl[1];
    const tx = P.x + bx * back + bz * lat, tz = P.z + bz * back - bx * lat;
    const ty = P.y + (f.def.fly ? 1.0 : 0);
    const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz);
    if (d > 28 || Math.abs(ty - f.y) > 24) { f.x = tx; f.y = ty; f.z = tz; }
    else {
      const kk = 1 - Math.exp(-5 * dt);
      f.x += dx * kk; f.z += dz * kk;
      f.y += (ty - f.y) * (1 - Math.exp(-8 * dt));
    }
    const moving = d > 0.35;
    const want = moving ? Math.atan2(-dx, -dz) : avatar.rotation.y;
    let dr = want - f.ry;
    while (dr > Math.PI) dr -= TAU;
    while (dr < -Math.PI) dr += TAU;
    f.ry += dr * (1 - Math.exp(-8 * dt));
    let hop = 0;
    if (f.def.fly) hop = Math.sin(t * 2.6 + f.ph) * 0.15;
    else if (moving) hop = Math.abs(Math.sin(t * 11 + f.ph)) * 0.2;
    o.g.position.set(f.x, f.y + hop, f.z);
    o.g.rotation.y = f.ry;
    o.body.rotation.z = f.def.fly ? Math.sin(t * 1.7 + f.ph) * 0.06 : (moving ? Math.sin(t * 11 + f.ph) * 0.08 : 0);
    const pt = o.pt;
    for (const w of pt.wings) w.rotation.z = w.userData.sd * Math.sin(t * (pt.fast ? 26 : 8) + f.ph) * 0.5;
    if (pt.tail) pt.tail.rotation.y = Math.sin(t * 5 + f.ph) * 0.35;
    if (pt.ears) for (const ea of pt.ears) ea.rotation.x = Math.sin(t * 4 + f.ph) * 0.12;
    if (pt.claws) for (const c of pt.claws) c.rotation.x = Math.sin(t * 6 + f.ph + c.userData.sd) * 0.25;
    if (pt.fan) pt.fan.rotation.z = Math.sin(t * 1.3 + f.ph) * 0.06;
    for (const s of pt.spin) s.rotation.y += dt * 1.6;
    if (pt.moon) pt.moon.rotation.z += dt * 0.4;
    if (o.rb.length) tintRainbow(o.rb, t + f.ph);
    // 반짝이 (전설은 금빛, 아우라는 무지개)
    if (f.def.rar >= 5 || f.v === 2) {
      f.fxT -= dt;
      if (f.fxT <= 0) {
        const aura = f.def.rar >= 6;
        f.fxT = aura ? 0.09 : 0.35;
        const cols = aura || f.v === 2 ? [0xff8fab, 0xffd166, 0x7af0ff, 0xc77dff, 0x9ff3d0] : [0xffe066, 0xffffff];
        const s = f.def.size || 1;
        burst(f.x + rand(-0.4, 0.4) * s, f.y + hop + rand(0.3, 1.1) * s, f.z + rand(-0.4, 0.4) * s, cols[Math.floor(Math.random() * cols.length)], 1, 0.6, aura ? 0.13 : 0.1, 0.8, 0.1, 0.7);
      }
    }
    if (f.ring) {
      f.ring.rotation.z += dt * 2;
      f.ring.position.y = (f.def.fly ? -0.9 + 0.05 : 0.05) / (f.def.size || 1) - hop / (f.def.size || 1);
      auraRingMat.color.setHSL((t * 0.2) % 1, 1, 0.6);
    }
  }
  updateHatchery(dt, t);
  updateCastle(dt);
}

// ---------- 썸네일 (게임 렌더러로 작은 화면에 그려서 저장. 두 번째 WebGL을 만들지 않아요) ----------
let thumbRT = null, thumbScene = null, thumbCam = null, thumbCv = null, thumbBuf = null;
const thumbCache = new Map();
const TH = 160;
const SRGB_LUT = new Uint8ClampedArray(256);
for (let i = 0; i < 256; i++) { const c = i / 255; SRGB_LUT[i] = Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); }
const _box3 = new THREE.Box3(), _bsz = new THREE.Vector3(), _bc = new THREE.Vector3(), _occ = new THREE.Color();
function petThumb(id, v = 0) {
  const key = id + ':' + v;
  if (thumbCache.has(key)) return thumbCache.get(key);
  let url = '';
  try {
    if (!thumbRT) {
      thumbRT = new THREE.WebGLRenderTarget(TH, TH, { samples: 4 });
      thumbScene = new THREE.Scene();
      thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a70, 2.0));
      const dl = new THREE.DirectionalLight(0xfff4e0, 2.4);
      dl.position.set(-3, 5, -6);
      thumbScene.add(dl);
      thumbCam = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
      thumbCv = document.createElement('canvas'); thumbCv.width = thumbCv.height = TH;
      thumbBuf = new Uint8Array(TH * TH * 4);
    }
    const o = buildPet(id, v, true);
    if (o.rb.length) tintRainbow(o.rb, 0.4);
    thumbScene.add(o.g);
    _box3.setFromObject(o.g);
    _box3.getSize(_bsz); _box3.getCenter(_bc);
    const dist = Math.max(_bsz.x, _bsz.y, _bsz.z) * 2.35;
    thumbCam.position.set(_bc.x - Math.sin(0.55) * dist, _bc.y + dist * 0.28, _bc.z - Math.cos(0.55) * dist);
    thumbCam.lookAt(_bc);
    renderer.getClearColor(_occ);
    const oa = renderer.getClearAlpha(), osh = renderer.shadowMap.enabled;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;
    renderer.setRenderTarget(thumbRT);
    renderer.render(thumbScene, thumbCam);
    renderer.readRenderTargetPixels(thumbRT, 0, 0, TH, TH, thumbBuf);
    renderer.setRenderTarget(null);
    renderer.shadowMap.enabled = osh;
    renderer.setClearColor(_occ, oa);
    thumbScene.remove(o.g);
    disposePetObj(o);
    const ctx = thumbCv.getContext('2d'), img = ctx.createImageData(TH, TH), d = img.data;
    for (let y = 0; y < TH; y++) {
      const src = (TH - 1 - y) * TH * 4, dst = y * TH * 4;
      for (let x = 0; x < TH * 4; x += 4) {
        d[dst + x] = SRGB_LUT[thumbBuf[src + x]]; d[dst + x + 1] = SRGB_LUT[thumbBuf[src + x + 1]]; d[dst + x + 2] = SRGB_LUT[thumbBuf[src + x + 2]]; d[dst + x + 3] = thumbBuf[src + x + 3];
      }
    }
    ctx.putImageData(img, 0, 0);
    url = thumbCv.toDataURL('image/png');
  } catch (e) { url = ''; }
  thumbCache.set(key, url);
  return url;
}
// 접속 후 한가할 때 조금씩 미리 그려 둬요 (도감을 처음 열 때 멈칫하지 않게)
function pregenThumbs() {
  const todo = PETS.map((p) => p.id).filter((id) => !thumbCache.has(id + ':0'));
  for (const [id, v] of S.pets.eq) if (!thumbCache.has(id + ':' + v)) todo.unshift(id + '|' + v);
  let i = 0;
  const step = () => {
    if (i >= todo.length) return;
    if (!document.hidden && !hatchBusy) { const t = todo[i++]; const [id, v] = t.split('|'); petThumb(id, +(v || 0)); }
    setTimeout(step, 140);
  };
  setTimeout(step, 2500);
}
function petImg(id, v, cls = '', hide = false) {
  const u = petThumb(id, v);
  return u ? '<img class="pimg' + (hide ? ' sil' : '') + (cls ? ' ' + cls : '') + '" src="' + u + '" alt="">' : '<span class="pimg ph"></span>';
}
