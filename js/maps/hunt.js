'use strict';
// 사냥터 캠프 · 들판 · 보스 레이드 섬
function buildHunt() {
  // 허브 입구
  gate(-8.8, 0, 21.2, 0xff6b5b, 0xc0392b, { huntGate: true }, [{ t: '사냥터 · 보스 레이드', c: '#ff9b8f' }, { t: '입장', s: 34 }]);
  // 캠프
  island(HUNT_C.x, 0, HUNT_C.z, 11, { grass: 0xd9b77a, dirt: 0xa0703f, dirt2: 0x7a5232 }, { huntCamp: true });
  addPortal(HUNT_C.x - 5, 0, HUNT_C.z - 7, 0, -0.6);
  // 회복 샘
  const fx = HUNT_C.x - 4, fz = HUNT_C.z + 4;
  cylPlat(fx, 0.5, fz, 1.6, 0.5, M.stone, { fountain: true });
  mesh(G.cyl, mat(0x7af0ff, { emissive: 0x2fc6ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }), fx, 0.52, fz, 1.3, 0.04, 1.3, scene, false, false);
  fountain = { x: fx, z: fz };
  makeLabel([{ t: '회복의 샘', c: '#7af0ff', s: 44 }, { t: '가까이 있으면 체력 회복', s: 28 }], { w: 384, h: 160, sx: 3.6, pos: new THREE.Vector3(fx, 3.2, fz), noBg: true });
  // 무기 상점
  const sx = HUNT_C.x + 5, sz = HUNT_C.z + 4;
  boxPlat(sx, 1.0, sz - 1.2, 3.2, 1.0, 0.9, M.wood, {});
  for (const ox of [-1.4, 1.4]) mesh(G.cyl8, M.woodDark, sx + ox, 1.5, sz - 1.4, 0.1, 3, 0.1);
  mesh(G.box, mat(0xff6b5b), sx, 3.05, sz - 1.2, 3.6, 0.15, 1.6);
  cylPlat(sx, 0.18, sz + 0.6, 1.2, 0.3, mat(0xffcf3f, { emissive: 0x6b4a00, emissiveIntensity: 0.4 }), { weaponShop: true });
  makeLabel([{ t: '무기 상점', c: '#ffcf3f' }, { t: '발판을 밟으면 열려요', s: 30 }], { sx: 3.6, pos: new THREE.Vector3(sx, 4.3, sz - 1) });
  makeLabel([{ t: '사냥터 캠프', c: '#ff9b8f', s: 56 }, { t: '서쪽: 들판 · 남쪽: 보스 레이드', s: 32 }], { sx: 6, pos: new THREE.Vector3(HUNT_C.x, 6.5, HUNT_C.z - 1), noBg: true });
  // 다리
  deckBridge(-128, 115, -110, 115);
  deckBridge(-168, 115, -162, 115);
  deckBridge(-185, 132, -185, 143);
  deckBridge(-168, 160, -162, 160);
  deckBridge(-145, 177, -145, 188);
  deckBridge(-100, 125, -100, 151);
  // 들판
  for (const F of FIELDS) {
    island(F.x, 0, F.z, F.r, F.th, { field: F.id });
    const lv = F.kinds.map((k) => MONSTERS[k].lvl);
    const lo = Math.min(...lv), hi = Math.max(...lv);
    makeLabel([{ t: F.name, c: '#ffffff', s: 50 }, { t: 'Lv.' + (lo === hi ? lo : lo + '~' + hi) + ' · 권장 초당 피해 ' + fmt(monHp(hi) / 3), c: '#ffcf3f', s: 30 }], { w: 512, h: 160, sx: 5, pos: new THREE.Vector3(F.x, 5.5, F.z), noBg: true });
    decorField(F);
    for (let i = 0; i < F.n; i++) spawnMonster(makeMonster(F.kinds[i % F.kinds.length], F));
    spawnMonster(makeMonster(F.kinds[F.kinds.length - 1], F, { elite: true }));
  }
  // 레이드 섬
  island(RAID_C.x, 0, RAID_C.z, RAID_C.r, { grass: 0xb9b2c9, dirt: 0x6e6680, dirt2: 0x4f4860 }, { raidIsland: true });
  mesh(G.cyl, mat(0x8d86a3), RAID_C.x, 0.02, RAID_C.z + 4, 13, 0.05, 13, scene, false, true);
  const ring = new THREE.Mesh(new THREE.RingGeometry(12.5, 13, 72), mat(0xff6b5b, { emissive: 0x8a1c10, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(RAID_C.x, 0.06, RAID_C.z + 4);
  scene.add(ring);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.39;
    const px = RAID_C.x + Math.cos(a) * 19.5, pz = RAID_C.z + Math.sin(a) * 19.5;
    if (Math.sin(a) < -0.85) continue;
    cylPlat(px, 5, pz, 0.9, 5, mat(0x8d86a3), {});
    mesh(G.ico, mat(0xff8f3f, { emissive: 0xff5a1f, emissiveIntensity: 1.2 }), px, 5.6, pz, 0.45, 0.6, 0.45, scene, false, false);
  }
  BOSSES.forEach((b, i) => {
    const ax = RAID_C.x + (i - 2) * 5.2, az = RAID_C.z - 15;
    const c = cylPlat(ax, 0.3, az, 1.4, 0.4, mat(b.col, { emissive: b.col, emissiveIntensity: 0.25 }), { bossAltar: b.id });
    const lab = makeLabel(['', ''], { sx: 3.4, pos: new THREE.Vector3(ax, 3.2, az) });
    raidAltars.push({ b, c, lab, key: '' });
  });
  raidSign = makeLabel([{ t: '보스 레이드', c: '#ff9b8f', s: 60 }, { t: '제단을 밟아 보스를 고르세요', s: 32 }], { sx: 7, pos: new THREE.Vector3(RAID_C.x, 7.5, RAID_C.z - 13), noBg: true });
}
function decorField(F) {
  const ring = (n, r0, r1, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rand(-0.2, 0.2), rr = rand(r0, r1); fn(F.x + Math.cos(a) * rr, F.z + Math.sin(a) * rr); } };
  if (F.deco === 'meadow') { ring(6, F.r * 0.82, F.r * 0.92, (x, z) => tree(x, 0, z, rand(0.9, 1.2))); for (let i = 0; i < 20; i++) flowerSpotsLate.push([F.x + rand(-F.r, F.r) * 0.7, 0, F.z + rand(-F.r, F.r) * 0.7]); }
  if (F.deco === 'forest') ring(10, F.r * 0.78, F.r * 0.93, (x, z) => tree(x, 0, z, rand(1, 1.4), 0x2e7d4f, 'pine'));
  if (F.deco === 'rock') ring(8, F.r * 0.6, F.r * 0.9, (x, z) => rock(x, 0, z, rand(0.9, 1.8), 0x6b543c));
  if (F.deco === 'swamp') {
    ring(6, F.r * 0.8, F.r * 0.92, (x, z) => { mesh(G.cyl8, mat(0x3d3a52), x, 1.4, z, 0.25, 2.8, 0.25); const b = mesh(G.box, mat(0x3d3a52), x + 0.4, 2.4, z, 0.9, 0.12, 0.12); b.rotation.z = 0.5; });
    for (let i = 0; i < 5; i++) mesh(G.cyl, mat(0x3f6b5a, { transparent: true, opacity: 0.8 }), F.x + rand(-10, 10), 0.02, F.z + rand(-10, 10), rand(1.5, 3), 0.04, rand(1.5, 3), scene, false, true);
  }
  if (F.deco === 'volcano') {
    ring(5, F.r * 0.7, F.r * 0.9, (x, z) => rock(x, 0, z, rand(0.8, 1.5), 0x2a2024));
    for (let i = 0; i < 4; i++) mesh(G.cyl, M.lava, F.x + rand(-11, 11), 0.03, F.z + rand(-11, 11), rand(1, 2), 0.04, rand(1, 2), scene, false, false);
  }
}
const flowerSpotsLate = [];
function enterHunt() {
  P.course = null; leaveTracks(); hideTimer();
  const r = { x: HUNT_C.x, y: 0, z: HUNT_C.z - 3, yaw: Math.PI / 2 };
  P.respawn = { ...r };
  P.hp = maxHp();
  respawnAt(r);
  SFX.cp();
  banner('공격: 클릭 · J키 · 공격 버튼', '사냥터 캠프', '서쪽 들판에서 사냥, 남쪽 섬에서 보스 레이드', 3200);
}
