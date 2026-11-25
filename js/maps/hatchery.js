'use strict';
// 펫 부화장 섬
// ---------- 펫 부화장 (섬) ----------
const HATCH_C = { x: -100, z: 45 }, HATCH_R = 17;
const eggStands = [];
let dexBoard = null;
function eggMesh(E, parent, s = 1) {
  const g = new THREE.Group();
  parent.add(g);
  const base = E.aura
    ? new THREE.MeshStandardMaterial({ color: E.hex, roughness: 0.3, metalness: 0.3, flatShading: true, emissive: 0x7af0ff, emissiveIntensity: 0.35 })
    : mat(E.hex, { roughness: 0.6 });
  const shell = new THREE.Mesh(G.egg, base);
  shell.scale.set(0.82 * s, 1.08 * s, 0.82 * s);
  shell.position.y = 1.08 * s;
  shell.castShadow = true;
  g.add(shell);
  const sp = mat(E.spot, E.aura ? { emissive: 0xffffff, emissiveIntensity: 0.6 } : {});
  if (E.id === 'macaron') {
    const band = new THREE.Mesh(G.donut, mat(0xffffff));
    band.rotation.x = Math.PI / 2; band.scale.set(0.83 * s, 0.83 * s, 0.25 * s); band.position.y = 1.0 * s; g.add(band);
  }
  for (let k = 0; k < 9; k++) {
    const u = (k * 0.618) % 1, an = k * 2.4, yy = -0.75 + 1.5 * u;
    const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
    const m = new THREE.Mesh(E.id === 'star' || E.aura ? G.oct : G.sph, sp);
    m.position.set(Math.cos(an) * rr * 0.82 * s, (1.08 + yy * 1.08) * s, Math.sin(an) * rr * 0.82 * s);
    m.scale.setScalar((E.id === 'cookie' ? 0.12 : 0.1) * s);
    g.add(m);
  }
  return { g, shell, base };
}
function buildHatchery() {
  gate(8.8, 0, 21.2, 0xff8fbf, 0xd63a7a, { hatchGate: true }, [{ t: '펫 부화장', c: '#ffb3d6' }, { t: '입장', s: 34 }]);
  const th = { grass: 0xffd6e8, dirt: 0xd9a066, dirt2: 0x8a5a3a };
  island(HATCH_C.x, 0, HATCH_C.z, HATCH_R, th, { hatchIsland: true });
  mesh(G.cyl, mat(0xfff3f8), HATCH_C.x, 0.02, HATCH_C.z, 5, 0.05, 5, scene, false, true);
  EGGS.forEach((E, i) => {
    const an = (-150 + 30 * i) * Math.PI / 180; // 아우라 알(6번째)은 동쪽 0도
    const ex = HATCH_C.x + Math.cos(an) * 10, ez = HATCH_C.z + Math.sin(an) * 10;
    cylPlat(ex, 0.9, ez, 1.7, 0.9, mat(0xfff3f8), { eggStand: true });
    const ring = mesh(G.torus, mat(E.hex, { emissive: E.hex, emissiveIntensity: 0.5 }), ex, 0.9, ez, 1.72, 1.72, 1.72, scene, false, false);
    ring.rotation.x = Math.PI / 2;
    const holder = new THREE.Group(); holder.position.set(ex, 0.9, ez); scene.add(holder);
    const em = eggMesh(E, holder, E.mix ? 1.3 : 1.15);
    if (E.mix) { // 아우라 알: 금빛 후광 고리 두 개
      for (const [rr, y, tl] of [[1.7, 1.6, 0.5], [2.0, 1.3, -0.6]]) { const h = mesh(G.torus, mat(0xffd166, { emissive: 0xffb020, emissiveIntensity: 0.9 }), 0, y, 0, rr, rr, rr, holder, false, false); h.rotation.x = Math.PI / 2 + tl; }
    }
    const px = HATCH_C.x + Math.cos(an) * 6.6, pz = HATCH_C.z + Math.sin(an) * 6.6;
    cylPlat(px, 0.18, pz, 1.25, 0.3, mat(E.hex, { emissive: E.hex, emissiveIntensity: 0.3 }), { eggPad: i + 1 });
    const lab = makeLabel([{ t: E.name, c: E.c2 }, { t: fmt(E.cost) + ' 코인', s: 34, c: '#ffcf3f' }], { sx: 5.2, pos: new THREE.Vector3(ex, 5.1, ez) });
    eggStands.push({ E, holder, em, lab, ph: i * 1.3, x: ex, z: ez });
  });
  makeLabel([{ t: '펫 부화장', c: '#ffb3d6', s: 62 }, { t: '알 앞 발판을 밟으면 뽑기', s: 30 }], { sx: 7, pos: new THREE.Vector3(HATCH_C.x, 7.6, HATCH_C.z - 12), noBg: true });
  dexBoard = makeLabel(['', ''], { sx: 4.6, pos: new THREE.Vector3(HATCH_C.x - 8.5, 3.2, HATCH_C.z + 8) });
  addPortal(HATCH_C.x + 8.5, 0, HATCH_C.z + 8, 0, -0.6);
  // 장식: 막대사탕 나무, 도넛 쉼터, 사탕 바위
  const LC = [0xff8fbf, 0x9ff3d0, 0xffe066, 0xc3a6ff];
  [[35, 14.2], [60, 13.5], [120, 13.5], [145, 14.2], [-175, 14], [-5, 14]].forEach(([deg, r], k) => {
    const a = deg * Math.PI / 180, x = HATCH_C.x + Math.cos(a) * r, z = HATCH_C.z + Math.sin(a) * r;
    mesh(G.cyl8, mat(0xffffff), x, 1.6, z, 0.12, 3.2, 0.12);
    const disc = mesh(G.cyl, mat(LC[k % 4]), x, 3.6, z, 1.05, 0.3, 1.05);
    disc.rotation.x = Math.PI / 2; disc.rotation.z = a;
    for (const [rr, c] of [[0.75, 0xffffff], [0.42, LC[(k + 1) % 4]]]) {
      const rg = mesh(G.torus, mat(c), x, 3.6, z, rr, rr, 1.4, scene, false, false);
      rg.rotation.y = Math.PI / 2 - a;
    }
    addCylCol(x, 1.6, z, 0.2, 1.6);
  });
  {
    const x = HATCH_C.x - 11.5, z = HATCH_C.z + 1;
    mesh(G.donut, mat(0xe8b25a), x, 0.35, z, 1.7, 1.7, 1.7).rotation.x = Math.PI / 2;
    mesh(G.donut, mat(0xff8fbf), x, 0.5, z, 1.72, 1.72, 1.2).rotation.x = Math.PI / 2;
    addCylCol(x, 0.5, z, 2.3, 0.5);
  }
  for (let k = 0; k < 8; k++) {
    const a = rand(0.2, 2.9), r = rand(13, 15.5);
    const m = mesh(G.ico, mat(LC[k % 4], { roughness: 0.4 }), HATCH_C.x + Math.cos(a) * r, 0.3, HATCH_C.z + Math.sin(a) * r, rand(0.4, 0.8), rand(0.3, 0.6), rand(0.4, 0.8));
    m.rotation.y = Math.random() * 3;
  }
  refreshDexBoard();
}
function refreshDexBoard() {
  refreshDexBtn();
  if (!dexBoard) return;
  drawLabel(dexBoard, [{ t: '펫 도감 ' + DEX.n + '/' + PETS.length, c: '#ffb3d6' }, { t: '영구 수입 +' + Math.round((dexMult() - 1) * 100) + '%', s: 32, c: '#3ee6a5' }]);
}
function updateHatchery(dt, t) {
  if (Math.hypot(P.x - HATCH_C.x, P.z - HATCH_C.z) > 80) return;
  for (const s of eggStands) {
    s.holder.rotation.y += dt * 0.5;
    s.em.g.rotation.z = Math.sin(t * 1.6 + s.ph) * 0.05;
    if (s.E.aura) {
      s.em.base.color.setHSL((t * 0.12) % 1, 0.7, 0.78);
      s.em.base.emissive.setHSL((t * 0.12 + 0.5) % 1, 0.9, 0.5);
      if (Math.random() < dt * 9) burst(s.x + rand(-1.2, 1.2), rand(1.5, 4), s.z + rand(-1.2, 1.2), [0xff8fab, 0xffd166, 0x7af0ff, 0xc77dff][Math.floor(Math.random() * 4)], 1, 0.5, 0.14, 0.6, 0.05, 0.9);
    }
  }
}
function enterHatch() {
  P.course = null; leaveTracks(); hideTimer();
  const r = { x: HATCH_C.x, y: 0, z: HATCH_C.z + 9, yaw: 0 };
  P.respawn = { ...r };
  respawnAt(r);
  SFX.cp();
}
