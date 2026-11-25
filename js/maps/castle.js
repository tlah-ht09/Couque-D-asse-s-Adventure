'use strict';
// 쿠키성 월드: 코인으로 성을 8단계까지 쌓는 섬
const CASTLE_C = { x: 110, z: -110 }, CASTLE_R = 18;
const CASTLE_STAGES = [
  { name: '쿠키 터 다지기', cost: 1e8 },
  { name: '비스킷 성벽', cost: 1e11 },
  { name: '웨이퍼 망루', cost: 1e12 },
  { name: '초코 본관', cost: 1e15 },
  { name: '사탕 첨탑', cost: 1e16 },
  { name: '젤리 분수 정원', cost: 5e19 },
  { name: '황금 캐러멜 지붕', cost: 1e20 },
  { name: '쿠키 왕관', cost: 1e24 },
];
const castleGroups = [];   // 단계별 그룹 (인덱스 = 단계 - 1)
const castleGhosts = [];   // 아직 안 지은 단계를 보여 주는 반투명 설계도
const GHOST_NEXT = new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0.38, depthWrite: false });
const GHOST_FAR = new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0.14, depthWrite: false });
const castleCols = { found: null, walls: [], keep: null, door: null, enter: null }; // 단계에 따라 켜고 끄는 충돌체
let castleBoard = null, castleEnterLabel = null, castleEnterRing = null, castleBuyT = 0, castleBoardT = 0, castleDoorT = 0;

// 영구 수입 배율 (성 단계마다 +4%, 환생해도 유지)
function castleMult() { return 1 + 0.04 * S.castle.lv; }

function buildCastle() {
  const X = CASTLE_C.x, Z = CASTLE_C.z;
  // 허브 출입구 (허브 가장자리, 축에서 벗어난 자리)
  gate(8.0, 0, -19.4, 0xffcf8a, 0xc07a30, { castleGate: true }, [{ t: '쿠키성 월드', c: '#ffcf8a' }, { t: '입장', s: 34 }]);
  const th = { grass: 0xf3d9a4, dirt: 0xc98f4e, dirt2: 0x8a5a2e };
  island(X, 0, Z, CASTLE_R, th, { castleIsland: true });
  addPortal(X + 12, 0, Z + 8, 0, -0.6);
  makeLabel([{ t: '쿠키성 월드', c: '#ffcf8a', s: 62 }, { t: '코인으로 성을 쌓아 보세요', s: 30 }], { sx: 7, pos: new THREE.Vector3(X, 16.5, Z), noBg: true });
  for (let k = 0; k < 8; k++) { const g = new THREE.Group(); g.visible = false; scene.add(g); castleGroups.push(g); }
  // 작은 도우미: 중심 좌표 기준 메쉬
  const B = (k, geo, col, x, y, z, sx, sy, sz, emi) => mesh(geo, mat(col, emi ? { emissive: emi, emissiveIntensity: 0.7 } : {}), X + x, y, Z + z, sx, sy, sz, castleGroups[k]);
  const KEEP_T = 7.4, WALL_T = 4.4, TW_T = 8.4;
  // 1단계: 쿠키 터 (바닥판)
  B(0, G.box, 0xe6b86a, 0, 0.2, 2, 18, 0.4, 22);
  B(0, G.box, 0xf3d9a4, 0, 0.42, 2, 16, 0.05, 20);
  castleCols.found = addBoxCol(X, 0.2, Z + 2, 9, 0.2, 11, {});
  // 2단계: 비스킷 성벽 (정면은 문 자리를 비워요)
  const walls = [[0, -7.5, 16, 1], [-7.5, 0, 1, 16], [7.5, 0, 1, 16], [-4.75, 7.5, 6.5, 1], [4.75, 7.5, 6.5, 1]];
  for (const [wx, wz, sx, sz] of walls) {
    B(1, G.box, 0xd9a55b, wx, WALL_T - 2 + 0.4 - 0.4 + 0.0, wz, sx, 4, sz);
    const c = addBoxCol(X + wx, 0.4 + 2, Z + wz, sx / 2, 2, sz / 2, {});
    c.solid = false; castleCols.walls.push(c);
    const n = Math.floor((sx > sz ? sx : sz) / 2);
    for (let i = 0; i < n; i++) {
      const o = -((sx > sz ? sx : sz) - 2) / 2 + i * 2;
      B(1, G.box, 0xc58f45, sx > sz ? wx + o : wx, WALL_T + 0.4, sx > sz ? wz : wz + o, 1, 0.8, 1);
    }
  }
  // 3단계: 웨이퍼 망루 (모서리 4개)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    B(2, G.cyl, 0xf0d28a, sx * 7.5, 4.4, sz * 7.5, 2, 8, 2);
    B(2, G.cyl, 0xd9b265, sx * 7.5, TW_T + 0.2, sz * 7.5, 2.4, 0.5, 2.4);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; B(2, G.box, 0xc9a050, sx * 7.5 + Math.cos(a) * 2, TW_T + 0.8, sz * 7.5 + Math.sin(a) * 2, 0.8, 0.7, 0.8); }
    const c = addCylCol(X + sx * 7.5, 4.4, Z + sz * 7.5, 2, 4, {});
    c.solid = false; castleCols.walls.push(c);
  }
  // 4단계: 초코 본관
  B(3, G.box, 0x6b3f2a, 0, 0.4 + 3.5, 0, 8, 7, 8);
  B(3, G.box, 0x8a5538, 0, KEEP_T + 0.25, 0, 9, 0.5, 9);
  for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 2; j++) B(3, G.box, 0xffe6a8, i * 2.4, 4 + j * 2, 4.02, 1, 1.1, 0.1, 0xffcf6a);
  B(3, G.box, 0x3b2216, 0, 1.9, 4.05, 2.4, 3, 0.15);
  B(3, G.cyl, 0x3b2216, 0, 3.4, 4.05, 1.2, 0.15, 1.2).rotation.x = Math.PI / 2;
  castleCols.keep = addBoxCol(X, 0.4 + 3.5, Z, 4, 3.5, 4, {});
  castleCols.keep.solid = false;
  // 문 충돌체 (본관 앞)
  castleCols.door = addBoxCol(X, 0.4 + 1.5, Z + 4.6, 1.2, 1.5, 0.3, { castleDoor: true });
  castleCols.door.solid = false;
  // 5단계: 사탕 첨탑 (줄무늬 원뿔)
  const spire = (k, x, y, z, r, h, c1, c2) => {
    B(k, G.cone16, c1, x, y + h / 2, z, r, h, r);
    for (let i = 1; i <= 3; i++) B(k, G.torus, c2, x, y + h * (1 - i * 0.25) + 0.05, z, r * (i * 0.25) * 0.95, r * (i * 0.25) * 0.95, r * (i * 0.25) * 0.95).rotation.x = Math.PI / 2;
  };
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    spire(4, sx * 7.5, TW_T + 0.5, sz * 7.5, 2.3, 4.5, 0xff8fbf, 0xffffff);
    spire(4, sx * 3.8, KEEP_T + 0.5, sz * 3.8, 1.2, 3.2, 0x9ff3d0, 0xffffff);
  }
  // 6단계: 젤리 분수 정원 (문 앞 좌우)
  B(5, G.cyl, 0xfff3f8, -5, 0.65, 11, 2.6, 0.5, 2.6);
  B(5, G.cyl, 0xff8fbf, -5, 1.4, 11, 0.5, 1.5, 0.5);
  B(5, G.cyl, 0x7af0ff, -5, 1.0, 11, 2.2, 0.15, 2.2, 0x3ac8e0);
  B(5, G.sph, 0x7af0ff, -5, 2.4, 11, 0.7, 0.7, 0.7, 0x3ac8e0);
  [[-8, 9], [-8, 12], [8, 9], [8, 12], [-2.5, 12.5], [2.5, 12.5]].forEach(([bx, bz], i) => {
    B(5, G.sph, [0x9ff3d0, 0xb8f28b, 0xffe066][i % 3], bx, 1.0, bz, 1.5, 1.2, 1.5);
  });
  // 7단계: 황금 캐러멜 지붕
  B(6, G.cone, 0xe8a63a, 0, KEEP_T + 0.5 + 2.2, 0, 6.2, 4.4, 6.2, 0xb87510);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    B(6, G.torus, 0xffd166, sx * 7.5, TW_T + 0.9, sz * 7.5, 2.1, 2.1, 2.1, 0xc08a00).rotation.x = Math.PI / 2;
    B(6, G.sph, 0xffd166, sx * 7.5, TW_T + 5.2, sz * 7.5, 0.45, 0.45, 0.45, 0xc08a00);
  }
  // 8단계: 쿠키 왕관
  const cy = KEEP_T + 0.5 + 4.4 + 0.4;
  B(7, G.cyl, 0xffd166, 0, cy, 0, 2.6, 0.8, 2.6, 0xe0a000);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    B(7, G.cone, 0xffd166, Math.cos(a) * 2.2, cy + 1.2, Math.sin(a) * 2.2, 0.8, 1.8, 0.8, 0xe0a000);
    B(7, G.sph, [0xff6b8b, 0x7af0ff, 0x9ff3d0][i % 3], Math.cos(a) * 2.2, cy + 2.3, Math.sin(a) * 2.2, 0.3, 0.3, 0.3, 0xffffff);
  }
  B(7, G.sph, 0xff4d6d, 0, cy + 0.7, 0, 0.7, 0.7, 0.7, 0xff2050);
  // 입장하기 발판 (문 바로 앞, 8단계 완성 후에만 보이고 밟을 수 있어요)
  B(7, G.cyl, 0x5ef2c0, 0, 0.5, 6.4, 1.1, 0.2, 1.1, 0x2fd9a0);
  castleEnterRing = B(7, G.torus, 0xffffff, 0, 0.66, 6.4, 1.12, 1.12, 1.12, 0xffffff);
  castleEnterRing.rotation.x = Math.PI / 2;
  castleCols.enter = addCylCol(X, 0.5, Z + 6.4, 1.1, 0.1, { castleEnter: true });
  castleCols.enter.solid = false;
  // 건설 발판 + 안내판
  cylPlat(X + 5, 0.6, Z + 11, 1.4, 0.2, mat(0xffcf3f, { emissive: 0xc08a00, emissiveIntensity: 0.5 }), { castleBuild: true });
  castleBoard = makeLabel(['', ''], { sx: 5.2, pos: new THREE.Vector3(X + 5, 3.6, Z + 11) });
  // 설계도: 단계 그룹을 복제해서 반투명 재질만 바꿔요 (지오메트리는 공유)
  for (const g of castleGroups) {
    const gh = g.clone(true);
    gh.traverse((o) => { if (o.isMesh) { o.material = GHOST_FAR; o.castShadow = o.receiveShadow = false; } });
    gh.visible = false;
    scene.add(gh);
    castleGhosts.push(gh);
  }
  // 입장 안내 (설계도에 복제되지 않게 복제 뒤에 붙여요)
  castleEnterLabel = makeLabel([{ t: '입장하기', c: '#5ef2c0' }, { t: '밟으면 성 안으로', s: 30 }], { sx: 4.2, pos: new THREE.Vector3(X, 3.2, Z + 6.4) });
  castleEnterLabel.sp.removeFromParent();
  castleGroups[7].add(castleEnterLabel.sp);
  refreshCastle();
}

function refreshCastle() {
  if (!castleGroups.length) return;
  const lv = S.castle.lv;
  castleGroups.forEach((g, k) => { g.visible = lv >= k + 1; });
  // 안 지은 단계는 설계도로, 다음 단계는 조금 더 진하게
  castleGhosts.forEach((gh, k) => {
    gh.visible = lv < k + 1;
    const m = k === lv ? GHOST_NEXT : GHOST_FAR;
    gh.traverse((o) => { if (o.isMesh) o.material = m; });
  });
  castleCols.found.solid = lv >= 1;
  for (const c of castleCols.walls) c.solid = lv >= 2;
  castleCols.keep.solid = lv >= 4;
  castleCols.door.solid = lv >= 1;
  castleCols.enter.solid = lv >= 8;
  updateCastleBoard();
}
function updateCastleBoard() {
  if (!castleBoard) return;
  const lv = S.castle.lv;
  if (lv >= 8) { drawLabel(castleBoard, [{ t: '쿠키성 완성!', c: '#ffd166' }, { t: '8/8단계', s: 34 }]); return; }
  const st = CASTLE_STAGES[lv];
  drawLabel(castleBoard, [{ t: (lv + 1) + '단계 ' + st.name, c: '#ffcf8a' }, { t: fmt(st.cost) + ' 코인', s: 34, c: S.coins >= st.cost ? '#3ee6a5' : '#ff9b8f' }]);
}
function tryBuyCastle() {
  const now = performance.now();
  if (now - castleBuyT < 400) return;
  castleBuyT = now;
  const lv = S.castle.lv;
  if (lv >= 8) return;
  const st = CASTLE_STAGES[lv];
  if (!spend(st.cost)) { toast(st.name + ' 건설 비용 ' + fmt(st.cost) + ' 코인', 'bad'); SFX.err(); return; }
  S.castle.lv++;
  refreshCastle();
  SFX.buy();
  toast((lv + 1) + '단계 ' + st.name + ' 완성! 수입 +4%');
  const X = CASTLE_C.x, Z = CASTLE_C.z;
  burst(X, 5, Z, [0xffd166, 0xffffff, 0xff8fbf], 60, 8, 0.22, 5, 0.8, 1.4);
  burst(X, 9, Z, [0xffd166, 0xffcf8a], 30, 6, 0.2, 4, 0.8, 1.2);
  save();
}
function updateCastle(dt) {
  if (!S.seenCastle && !modalOpen && Math.hypot(P.x - CASTLE_C.x, P.z - CASTLE_C.z) < 40) {
    S.seenCastle = true; save();
    showModal('쿠키성 월드', '코인으로 성을 8단계까지 쌓아요. 단계마다 영구 수입 +4% (환생해도 유지). 성을 완성하면 문 앞에 입장하기 발판이 생겨요.');
  }
  if (Math.hypot(P.x - CASTLE_C.x, P.z - CASTLE_C.z) > 40) return;
  if (castleEnterRing && S.castle.lv >= 8) {
    const k = 1 + Math.sin(performance.now() / 300) * 0.06;
    castleEnterRing.scale.set(1.12 * k, 1.12 * k, 1.12 * k);
  }
  castleBoardT -= dt;
  if (castleBoardT <= 0) { castleBoardT = 0.5; updateCastleBoard(); }
}
function castleDoorTouch() {
  const now = performance.now();
  if (now - castleDoorT < 1500) return;
  castleDoorT = now;
  if (S.castle.lv < 8) { toast('성을 완성하면 열려요'); return; }
  toast('문 앞 입장하기 발판을 밟아 주세요');
}
function castleEnterTouch() {
  if (S.castle.lv < 8) return;
  if (typeof enterCastleInterior === 'function') enterCastleInterior();
}
function enterCastle() {
  P.course = null; leaveTracks(); hideTimer();
  const r = { x: CASTLE_C.x, y: 0, z: CASTLE_C.z + 15, yaw: 0 };
  P.respawn = { ...r };
  respawnAt(r);
  SFX.cp();
}
