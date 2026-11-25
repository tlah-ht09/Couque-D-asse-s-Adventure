'use strict';
// 허브 섬과 각 구역 배치 (buildWorld)
// ---------- 월드 생성 ----------
function buildWorld() {
  // 허브
  const hubCol = island(0, 0, 0, HUB_R, THEMES[0], { hub: true });
  mesh(G.cyl, M.stone, 0, 0.02, 0, 6.5, 0.05, 6.5, scene, false, true);
  for (const z of ZONES) {
    if (!z.dir) continue;
    const [fx, fz] = z.dir;
    mesh(G.box, M.stone, fx * 16.5, 0.015, fz * 16.5, fx ? 20 : 3.2, 0.03, fz ? 20 : 3.2, scene, false, true);
  }
  cylPlat(0, 0.8, 0, 3.2, 0.8, M.pedestal, { pedestal: true });
  const pr = mesh(G.torus, M.gold, 0, 0.8, 0, 3.2, 3.2, 3.2, scene, false, false);
  pr.rotation.x = Math.PI / 2;
  // 허브 나무 / 바위
  for (const deg of [55, 80, 100, 198, 214, 232, 252, 290, 345]) {
    const a = deg * Math.PI / 180, rr = rand(24, 26);
    tree(Math.cos(a) * rr, 0, Math.sin(a) * rr, rand(0.9, 1.25), [0x4fbf5a, 0x63cf6a, 0x3fae55][deg % 3]);
  }
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * TAU, rr = rand(18, 27);
    flowerSpots.push([Math.cos(a) * rr, 0, Math.sin(a) * rr]);
  }
  // 허브 비밀 파쿠르
  const hp = [[-17, 1.2, 16], [-20.5, 2.6, 13], [-23, 4.0, 9.5], [-21, 5.4, 5.5]];
  hp.forEach(([x, t, z], k) => boxPlat(x, t, z, 2, 0.6, 2, mat([0xffd166, 0x6ec8ff, 0xff8fab, 0xb8f28b][k]), {}));
  addStar(-21, 5.4 + 1.5, 5.5, 0);
  addStar(0, 2.1, 2.6, 0);
  const bp = makePlatform(0, 'bounce', 19, 0.3, 9, { round: true, r: 1.2, h: 0.3, v: 20 });
  bp.zone = 0;
  addStar(19, 6.7, 9, 0);

  for (let i = 0; i < GENS.length; i++) buildDropper(i);
  for (const z of ZONES) if (z.dir) buildBridge(z);
  buildLaunchPad();

  // 구역
  for (const z of ZONES) {
    const th = THEMES[z.id];
    if (z.sky) {
      const ec = island(SKY_POS.x, SKY_POS.y, SKY_POS.z, SKY_R, th, { zone: z.id, sky: true });
      decorate(z.id, SKY_POS.x, SKY_POS.y, SKY_POS.z, SKY_R);
      addPortal(SKY_POS.x + 7, SKY_POS.y, SKY_POS.z + 5, z.id, 0.6);
      buildCourse(z.id, SKY_POS, [0, -1], SKY_R - 1, COURSE_SPECS[5], ec, 0.5);
      continue;
    }
    const O = new THREE.Vector3(z.dir[0] * ENTRY_D, 0, z.dir[1] * ENTRY_D);
    const ec = island(O.x, 0, O.z, ENTRY_R, th, { zone: z.id });
    if (z.id === 4) buildTower(z.id, O, z.dir, ec);
    else buildCourse(z.id, O, z.dir, ENTRY_R - 1, COURSE_SPECS[z.id], ec);
    decorate(z.id, O.x, 0, O.z, ENTRY_R);
  }

  // 용암 바다
  {
    const nodes = courses[2].nodes;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const c of nodes) { x0 = Math.min(x0, c.x - c.hx); x1 = Math.max(x1, c.x + c.hx); z0 = Math.min(z0, c.z - c.hz); z1 = Math.max(z1, c.z + c.hz); }
    x0 -= 14; x1 += 14; z0 -= 18; z1 += 18;
    const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff3d00, emissiveIntensity: 0.9, roughness: 1, flatShading: true });
    const lm = mesh(G.box, lavaMat, (x0 + x1) / 2, -5.5, (z0 + z1) / 2, x1 - x0, 1, z1 - z0, scene, false, false);
    addBoxCol((x0 + x1) / 2, -5.5, (z0 + z1) / 2, (x1 - x0) / 2, 0.5, (z1 - z0) / 2, { kill: true, lava: true, zone: 2 });
    spinners.push({ kind: 'lava', m: lavaMat });
    for (let i = 0; i < 18; i++) {
      const b = mesh(G.ico, M.lava, rand(x0 + 4, x1 - 4), -5, rand(z0 + 4, z1 - 4), rand(0.4, 1), rand(0.4, 1), rand(0.4, 1), scene, false, false);
      spinners.push({ kind: 'bubble', m: b, ph: Math.random() * 6 });
    }
  }

  // 꽃 (인스턴스)
  {
    const fg = new THREE.ConeGeometry(0.18, 0.35, 5);
    const fm = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }), flowerSpots.length);
    const cols = [0xff6b8b, 0xffd166, 0xffffff, 0xb48cff, 0x6ec8ff];
    flowerSpots.forEach(([x, y, z], i) => {
      _dummy.position.set(x, y + 0.18, z); _dummy.rotation.set(Math.PI, 0, 0); _dummy.scale.setScalar(rand(0.8, 1.3)); _dummy.updateMatrix();
      fm.setMatrixAt(i, _dummy.matrix);
      fm.setColorAt(i, _col.set(cols[i % cols.length]));
    });
    scene.add(fm);
  }

  // 구름
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * TAU, rr = rand(40, 330);
    const low = Math.random() < 0.6;
    makeCloud(Math.cos(a) * rr, low ? rand(-34, -14) : rand(120, 170), Math.sin(a) * rr, rand(2.5, 6));
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * TAU, rr = rand(240, 330);
    makeCloud(Math.cos(a) * rr, rand(20, 70), Math.sin(a) * rr, rand(4, 8));
  }
  const sea = new THREE.Mesh(new THREE.CircleGeometry(1400, 48), new THREE.MeshBasicMaterial({ color: 0xf4f9ff }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -44;
  sea.userData.global = true;
  scene.add(sea);

  // 크리스탈 안내
  crystalLabel = makeLabel([{ t: '채굴 크리스탈', c: '#9ff3ff' }, { t: '클릭해서 코인 얻기', s: 34 }], { sx: 4.4, pos: new THREE.Vector3(0, 7.6, 0), noBg: true });
}
let crystalLabel = null;
const guideArrow = mesh(G.cone, mat(0x3ee6a5, { emissive: 0x1fbf85, emissiveIntensity: 0.8 }), 0, -50, 0, 0.7, 1.1, 0.7, scene, false, false);
guideArrow.rotation.x = Math.PI;
