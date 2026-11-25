'use strict';
// =====================================================================
//  전투: 무기, 몬스터, 사냥터, 보스 레이드
// =====================================================================
// 목록 순서 = 얻는 순서. 한 칸 갈 때마다 한 마리 기준 초당 피해가 1.8배 이상 올라요.
// 유물(보스 첫 처치 보상)은 그 보스를 잡게 해 준 상점 무기보다 세고, 바로 다음 상점 무기보다는 약해요.
const WEAPONS = [
  { id: 'stick', name: '나무 막대', kind: 'melee', dmg: 6, rate: 2.2, range: 2.4, arc: 110, cost: 0, col: 0x9b6b43, shape: 'stick' },
  { id: 'hammer', name: '돌 망치', kind: 'melee', dmg: 22, rate: 1.6, range: 2.6, arc: 120, cost: 1500, col: 0x9aa5b4, shape: 'hammer' },
  { id: 'iron', name: '철검', kind: 'melee', dmg: 60, rate: 2.4, range: 2.7, arc: 120, cost: 3e4, col: 0xd9e2f0, shape: 'sword' },
  { id: 'jelly', name: '젤리 망치', kind: 'slam', dmg: 160, rate: 2.0, range: 3.2, relic: 'slime', col: 0x6fe08a, shape: 'hammer', glow: true },
  { id: 'bow', name: '사냥꾼 활', kind: 'bow', dmg: 330, rate: 1.8, range: 20, cost: 5e5, col: 0xb07a45, shape: 'bow' },
  { id: 'flame', name: '화염검', kind: 'melee', dmg: 750, rate: 2.5, range: 3.0, arc: 140, cost: 8e6, col: 0xff6a1f, shape: 'sword', glow: true },
  { id: 'fist', name: '거인의 주먹', kind: 'slam', dmg: 3200, rate: 1.4, range: 4.0, relic: 'golem', col: 0x8a7a6a, shape: 'fist' },
  { id: 'staff', name: '번개 지팡이', kind: 'chain', dmg: 5400, rate: 1.5, range: 20, chain: 4, cost: 1.5e8, col: 0x7af0ff, shape: 'staff', glow: true },
  { id: 'axe', name: '서리 도끼', kind: 'melee', dmg: 12500, rate: 1.6, range: 3.4, arc: 170, cost: 3e9, col: 0x9fdcff, shape: 'axe', glow: true },
  { id: 'scepter', name: '유령 여왕의 홀', kind: 'homing', dmg: 16500, rate: 2.2, range: 24, relic: 'ghost', col: 0xc3a6ff, shape: 'staff', glow: true },
  { id: 'great', name: '용의 대검', kind: 'melee', dmg: 45000, rate: 1.8, range: 3.8, arc: 160, cost: 5e10, col: 0xff4d6d, shape: 'great', glow: true },
  { id: 'breath', name: '용의 숨결', kind: 'chain', dmg: 62000, rate: 2.4, range: 16, chain: 6, relic: 'dragon', col: 0xff8f3f, shape: 'staff', glow: true },
  { id: 'starbow', name: '별빛 활', kind: 'bow', dmg: 125000, rate: 2.2, range: 28, pierce: true, cost: 1e12, col: 0xffd166, shape: 'bow', glow: true },
  { id: 'scythe', name: '차원 낫', kind: 'slam', dmg: 600000, rate: 2.0, range: 4.8, cost: 1e13, col: 0x9b5de5, shape: 'scythe', glow: true },
  { id: 'reaper', name: '군주의 검', kind: 'slam', dmg: 2.5e6, rate: 2.2, range: 5.2, relic: 'lord', col: 0xc77dff, shape: 'great', glow: true },
];
const KIND_TXT = { melee: '앞쪽 베기', slam: '주변 360도 내려찍기', bow: '자동 조준 화살', homing: '유도 마법탄', chain: '연쇄 번개' };
const weaponById = (id) => WEAPONS.find((w) => w.id === id) || WEAPONS[0];
const MONSTERS = {
  slime: { name: '슬라임', model: 'slime', col: 0x6fe08a, lvl: 1, speed: 2.6, r: 0.75 },
  mush: { name: '버섯돌이', model: 'mush', col: 0xff5a5f, lvl: 2, speed: 2.3, r: 0.7 },
  wolf: { name: '회색 늑대', model: 'wolf', col: 0x9aa3b5, lvl: 3, speed: 5.0, r: 0.85 },
  bwolf: { name: '검은 늑대', model: 'wolf', col: 0x3a3d52, lvl: 4, speed: 5.6, r: 0.9 },
  golem: { name: '돌 골렘', model: 'golem', col: 0x8a7a6a, lvl: 5, speed: 2.4, r: 1.15 },
  ghost: { name: '늪 유령', model: 'ghost', col: 0xd8d0ff, lvl: 6, speed: 3.6, r: 0.85, float: true },
  fire: { name: '불꽃 정령', model: 'fire', col: 0xff6a1f, lvl: 7, speed: 4.2, r: 0.85, float: true },
};
const monHp = (L) => 30 * Math.pow(4.5, L - 1);
const monDmg = (L) => 6 * Math.pow(1.62, L - 1);
const monCoin = (L) => 15 * Math.pow(7, L - 1);
const HUNT_C = { x: -100, z: 115 };
const FIELDS = [
  { id: 1, name: '초록 들판', x: -145, z: 115, r: 18, kinds: ['slime', 'slime', 'mush'], n: 10, th: { grass: 0x9be07a, dirt: 0xa0703f, dirt2: 0x7a5232 }, deco: 'meadow' },
  { id: 2, name: '늑대 숲', x: -185, z: 115, r: 18, kinds: ['wolf', 'wolf', 'bwolf'], n: 9, th: { grass: 0x4f9e5a, dirt: 0x6b4a2b, dirt2: 0x4a3320 }, deco: 'forest' },
  { id: 3, name: '바위 협곡', x: -185, z: 160, r: 18, kinds: ['golem'], n: 8, th: { grass: 0xb59a78, dirt: 0x8a6e50, dirt2: 0x6b543c }, deco: 'rock' },
  { id: 4, name: '유령 늪', x: -145, z: 160, r: 18, kinds: ['ghost'], n: 9, th: { grass: 0x5e5a78, dirt: 0x3d3a52, dirt2: 0x2b283d }, deco: 'swamp' },
  { id: 5, name: '화산 분지', x: -145, z: 205, r: 18, kinds: ['fire'], n: 9, th: { grass: 0x4a3b40, dirt: 0x3a2d31, dirt2: 0x2a2024 }, deco: 'volcano' },
];
const RAID_C = { x: -100, z: 172, r: 22 };
// 보스 1단계 체력: 바로 앞 상점 무기(슬라임=철검, 거인=화염검, 여왕=서리 도끼, 드래곤=용의 대검, 군주=차원 낫)를
// 막 산 무렵의 전투 숙련으로 1분 안팎에 잡히고, 그 전 무기·유물로는 3분 안에 거의 못 잡게 맞췄어요.
// (이전엔 유물 하나로 다음 보스를 바로 잡는 연쇄가 생겨서 뒤쪽 상점 무기가 쓸모없어졌어요)
const BOSSES = [
  { id: 'slime', name: '킹 슬라임', hp: 1e4, dmg: 18, reward: 5e4, col: 0x5ee08a, size: 3.2, speed: 3.2, keep: 2.5, model: 'slime', pats: ['slam', 'slam', 'wave', 'summon'], minion: 'slime', relic: 'jelly' },
  { id: 'golem', name: '바위 거인', hp: 3.5e5, dmg: 45, reward: 5e6, col: 0x8a7a6a, size: 3.4, speed: 2.6, keep: 3, model: 'golem', pats: ['wave', 'rocks', 'slam', 'rocks'], minion: 'golem', relic: 'fist' },
  { id: 'ghost', name: '유령 여왕', hp: 1.5e7, dmg: 110, reward: 5e8, col: 0xc3a6ff, size: 2.8, speed: 4, keep: 8, model: 'ghost', pats: ['orbs', 'teleport', 'orbs', 'summon'], minion: 'ghost', relic: 'scepter' },
  { id: 'dragon', name: '화염 드래곤', hp: 1.2e8, dmg: 260, reward: 5e10, col: 0xff5a3d, size: 3.2, speed: 4.5, keep: 7, model: 'dragon', pats: ['breath', 'meteor', 'wave', 'breath', 'summon'], minion: 'fire', relic: 'breath' },
  { id: 'lord', name: '차원 군주', hp: 6e9, dmg: 600, reward: 5e12, col: 0x9b5de5, size: 3.0, speed: 4.5, keep: 5, model: 'lord', pats: ['orbs', 'meteor', 'slam', 'teleport', 'breath', 'wave'], minion: 'fire', relic: 'reaper' },
];
const bossById = (id) => BOSSES.find((b) => b.id === id);
const PAT_TXT = { slam: '점프 내려찍기 (빨간 원 밖으로)', wave: '충격파 (점프로 넘기)', rocks: '낙석 (빨간 원 피하기)', orbs: '탄막 (점프하거나 피하기)', breath: '불꽃 브레스 (부채꼴 밖으로)', meteor: '유성우 (빨간 원 피하기)', teleport: '순간이동 후 폭발', summon: '부하 소환' };

// ---------- 전투 수치 ----------
function combatMult() { return Math.pow(1.07, S.combat.mastery) * (1 + 0.03 * S.rlv) * (1 + PS.dmg); }
function maxHp() { return 100 * Math.pow(1.1, S.combat.vital) * (1 + PS.hp); }
function masteryCost() { return 800 * Math.pow(1.55, S.combat.mastery); }
function vitalCost() { return 600 * Math.pow(1.6, S.combat.vital); }
function curWeapon() { return weaponById(S.combat.equip); }
// 한 마리 기준 초당 피해 (치명타 10% x2 포함). 보스 권장 화력과 바로 비교할 수 있어요
function weaponDps(w) { return w.dmg * w.rate * combatMult() * 1.1; }
// 연쇄 번개가 여러 마리를 맞힐 때 합친 피해 배수 (튈 때마다 80%)
function chainSum(w) { let s = 0; for (let k = 0; k < (w.chain || 1); k++) s += Math.pow(0.8, k); return s; }
function raidTotal() { let n = 0; for (const b of BOSSES) n += S.raid[b.id] || 0; return n; }
P.hp = 100; P.atkCD = 0; P.atkT = 9; P.hurtInv = 0; P.lastHurt = -99; P.downT = 0;
const inHunt = () => P.x < -75 && P.z > 85 && P.y < 30;

// ---------- 무기 모델 ----------
let weaponGroup = null;
function weaponModel(w) {
  const g = new THREE.Group();
  const c = w.glow ? mat(w.col, { emissive: w.col, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.4 }) : mat(w.col, { metalness: 0.2, roughness: 0.6 });
  const wood = mat(0x7d5430), dark = mat(0x3a3d52);
  switch (w.shape) {
    case 'stick': mesh(G.cyl8, c, 0, -0.45, 0, 0.07, 0.95, 0.07, g); break;
    case 'hammer': mesh(G.cyl8, wood, 0, -0.4, 0, 0.06, 0.9, 0.06, g); mesh(G.box, c, 0, -0.9, 0, 0.42, 0.26, 0.26, g); break;
    case 'sword': mesh(G.box, dark, 0, -0.05, 0, 0.08, 0.22, 0.08, g); mesh(G.box, dark, 0, -0.18, 0, 0.36, 0.06, 0.1, g); mesh(G.box, c, 0, -0.72, 0, 0.12, 1.0, 0.04, g); break;
    case 'great': mesh(G.box, dark, 0, -0.05, 0, 0.1, 0.3, 0.1, g); mesh(G.box, dark, 0, -0.24, 0, 0.5, 0.08, 0.12, g); mesh(G.box, c, 0, -1.0, 0, 0.24, 1.5, 0.06, g); break;
    case 'axe': mesh(G.cyl8, wood, 0, -0.45, 0, 0.06, 1.1, 0.06, g); mesh(G.box, c, 0.18, -0.85, 0, 0.36, 0.42, 0.06, g); break;
    case 'staff': mesh(G.cyl8, wood, 0, -0.5, 0, 0.05, 1.3, 0.05, g); mesh(G.oct, c, 0, -1.2, 0, 0.16, 0.24, 0.16, g); break;
    case 'bow': { const b = mesh(G.torus, c, 0, -0.35, 0, 0.55, 0.55, 0.55, g); b.rotation.y = Math.PI / 2; b.scale.set(0.55, 0.55, 0.3); mesh(G.box, mat(0xffffff), 0, -0.35, 0, 0.01, 1.05, 0.01, g); break; }
    case 'fist': mesh(G.box, c, 0, -0.18, 0, 0.42, 0.42, 0.42, g); break;
    case 'scythe': { mesh(G.cyl8, dark, 0, -0.55, 0, 0.05, 1.5, 0.05, g); const bl = mesh(G.box, c, 0.32, -1.25, 0, 0.7, 0.1, 0.05, g); bl.rotation.z = -0.35; break; }
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  const tipY = { stick: -0.95, hammer: -0.95, sword: -1.2, great: -1.75, axe: -0.9, staff: -1.25, bow: -0.35, fist: -0.2, scythe: -1.3 }[w.shape] || -1;
  const tip = new THREE.Object3D();
  tip.position.set(w.shape === 'scythe' ? 0.55 : w.shape === 'axe' ? 0.25 : 0, tipY, 0);
  g.add(tip);
  g.userData.tip = tip;
  const F = WFX[w.id];
  if (F && F.idle) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flare, color: F.idle.c[0], transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.scale.setScalar(w.shape === 'great' ? 1.1 : 0.8);
    tip.add(sp);
    g.userData.aura = sp;
  }
  return g;
}
function equipWeapon(id) {
  if (!S.combat.owned.includes(id)) return false;
  S.combat.equip = id;
  if (weaponGroup) { AV.armR.remove(weaponGroup); if (weaponGroup.userData.aura) weaponGroup.userData.aura.material.dispose(); }
  weaponGroup = weaponModel(curWeapon());
  weaponGroup.position.set(0, -0.62, -0.05);
  weaponGroup.rotation.x = Math.PI / 2;
  AV.armR.add(weaponGroup);
  markDirty();
  return true;
}
function buyWeapon(w) {
  if (S.combat.owned.includes(w.id)) return equipWeapon(w.id);
  if (w.relic || !spend(w.cost)) return false;
  S.combat.owned.push(w.id);
  equipWeapon(w.id);
  SFX.buy();
  toast(w.name + ' 획득!', 'gold');
  afterProgress();
  save();
  return true;
}
function buyMastery() { const c = masteryCost(); if (!spend(c)) return false; S.combat.mastery++; SFX.buy(); afterProgress(); return true; }
function buyVital() { const c = vitalCost(); if (!spend(c)) return false; S.combat.vital++; P.hp = maxHp(); SFX.buy(); afterProgress(); return true; }

// ---------- 몬스터 모델 ----------
function monsterModel(model, col, scale, elite) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: col, roughness: 0.75, flatShading: true, emissive: 0x000000 });
  body.userData.own = true;
  const dark = mat(0x1a1a2e), white = mat(0xffffff);
  const P2 = { g, body, legs: [] };
  if (model === 'slime') {
    body.transparent = true; body.opacity = 0.9;
    P2.core = mesh(G.ico1, body, 0, 0.55, 0, 0.78, 0.6, 0.78, g);
    mesh(G.box, dark, -0.22, 0.72, -0.62, 0.1, 0.16, 0.05, g, false, false);
    mesh(G.box, dark, 0.22, 0.72, -0.62, 0.1, 0.16, 0.05, g, false, false);
  } else if (model === 'mush') {
    mesh(G.cyl8, mat(0xf3e9d2), 0, 0.38, 0, 0.26, 0.76, 0.26, g);
    P2.core = mesh(G.ico1, body, 0, 0.92, 0, 0.72, 0.42, 0.72, g);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; mesh(G.box, white, Math.cos(a) * 0.42, 1.12, Math.sin(a) * 0.42, 0.14, 0.06, 0.14, g, false, false); }
    mesh(G.box, dark, -0.1, 0.5, -0.26, 0.06, 0.1, 0.03, g, false, false);
    mesh(G.box, dark, 0.1, 0.5, -0.26, 0.06, 0.1, 0.03, g, false, false);
  } else if (model === 'wolf') {
    P2.core = mesh(G.box, body, 0, 0.75, 0.1, 0.62, 0.52, 1.25, g);
    mesh(G.box, body, 0, 1.0, -0.7, 0.48, 0.44, 0.5, g);
    mesh(G.box, body, 0, 0.9, -1.02, 0.26, 0.22, 0.3, g);
    mesh(G.cone, body, -0.15, 1.3, -0.62, 0.1, 0.24, 0.1, g);
    mesh(G.cone, body, 0.15, 1.3, -0.62, 0.1, 0.24, 0.1, g);
    mesh(G.box, mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.8 }), -0.13, 1.06, -0.96, 0.07, 0.06, 0.02, g, false, false);
    mesh(G.box, mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.8 }), 0.13, 1.06, -0.96, 0.07, 0.06, 0.02, g, false, false);
    const tail = mesh(G.box, body, 0, 0.95, 0.85, 0.14, 0.14, 0.5, g);
    tail.rotation.x = 0.6;
    for (const [x, z] of [[-0.2, -0.35], [0.2, -0.35], [-0.2, 0.5], [0.2, 0.5]]) {
      const piv = new THREE.Group(); piv.position.set(x, 0.55, z); g.add(piv);
      mesh(G.box, body, 0, -0.27, 0, 0.16, 0.55, 0.16, piv);
      P2.legs.push(piv);
    }
  } else if (model === 'golem') {
    P2.core = mesh(G.box, body, 0, 1.35, 0, 1.3, 1.15, 0.9, g);
    mesh(G.box, body, 0, 2.2, -0.05, 0.62, 0.52, 0.6, g);
    const eye = mat(0xff9f43, { emissive: 0xff7a00, emissiveIntensity: 1 });
    mesh(G.box, eye, -0.14, 2.24, -0.36, 0.12, 0.08, 0.02, g, false, false);
    mesh(G.box, eye, 0.14, 2.24, -0.36, 0.12, 0.08, 0.02, g, false, false);
    for (const sx of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(sx * 0.85, 1.75, 0); g.add(piv);
      mesh(G.box, body, 0, -0.6, 0, 0.42, 1.2, 0.42, piv);
      P2.legs.push(piv);
    }
    mesh(G.box, body, -0.35, 0.4, 0, 0.42, 0.8, 0.5, g);
    mesh(G.box, body, 0.35, 0.4, 0, 0.42, 0.8, 0.5, g);
  } else if (model === 'ghost') {
    body.transparent = true; body.opacity = 0.78;
    P2.core = mesh(G.ico1, body, 0, 1.45, 0, 0.55, 0.55, 0.55, g);
    const tail = mesh(G.cone16, body, 0, 0.85, 0, 0.55, 1.1, 0.55, g);
    tail.rotation.x = Math.PI;
    mesh(G.box, dark, -0.17, 1.5, -0.48, 0.11, 0.17, 0.04, g, false, false);
    mesh(G.box, dark, 0.17, 1.5, -0.48, 0.11, 0.17, 0.04, g, false, false);
    mesh(G.box, dark, 0, 1.3, -0.5, 0.16, 0.08, 0.04, g, false, false);
  } else if (model === 'fire') {
    body.emissive.set(col); body.emissiveIntensity = 0.9;
    P2.core = mesh(G.ico, body, 0, 1.2, 0, 0.55, 0.65, 0.55, g, false, false);
    const outer = mesh(G.ico, mat(0xffd166, { emissive: 0xffa800, emissiveIntensity: 0.6, transparent: true, opacity: 0.45 }), 0, 1.25, 0, 0.82, 0.95, 0.82, g, false, false);
    P2.outer = outer;
    mesh(G.box, dark, -0.15, 1.3, -0.5, 0.09, 0.14, 0.03, g, false, false);
    mesh(G.box, dark, 0.15, 1.3, -0.5, 0.09, 0.14, 0.03, g, false, false);
  }
  if (elite) {
    const cr = new THREE.Group();
    const top = { slime: 1.05, mush: 1.35, wolf: 1.45, golem: 2.6, ghost: 2.05, fire: 2.0 }[model] || 1.4;
    cr.position.set(0, top, model === 'wolf' ? -0.7 : 0);
    g.add(cr);
    mesh(G.cyl8, M.gold, 0, 0, 0, 0.26, 0.16, 0.26, cr, false, false);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; mesh(G.cone, M.gold, Math.cos(a) * 0.2, 0.14, Math.sin(a) * 0.2, 0.06, 0.16, 0.06, cr, false, false); }
  }
  g.scale.setScalar(scale);
  scene.add(g);
  return P2;
}
const barBgMat = new THREE.SpriteMaterial({ color: 0x1a1f3a, depthTest: false, transparent: true, opacity: 0.85 });
const barFgMat = new THREE.SpriteMaterial({ color: 0xff5a5f, depthTest: false });
const barElMat = new THREE.SpriteMaterial({ color: 0xffcf3f, depthTest: false });
function makeBar(elite) {
  const bg = new THREE.Sprite(barBgMat), fg = new THREE.Sprite(elite ? barElMat : barFgMat);
  bg.renderOrder = 5; fg.renderOrder = 6;
  bg.visible = fg.visible = false;
  scene.add(bg, fg);
  return { bg, fg };
}

// ---------- 몬스터 ----------
const monsters = [];
function makeMonster(kind, field, opts = {}) {
  const def = MONSTERS[kind];
  const elite = !!opts.elite;
  const L = opts.lvl || def.lvl;
  const sc = (elite ? 1.45 : 1) * (opts.scale || 1);
  const model = monsterModel(def.model, elite ? new THREE.Color(def.col).lerp(new THREE.Color(0xffd166), 0.35).getHex() : def.col, sc, elite);
  const m = {
    kind, def, field, elite, lvl: L, model, bar: makeBar(elite),
    r: def.r * sc, speed: def.speed * (elite ? 0.9 : 1), hpMax: monHp(L) * (elite ? 6 : 1) * (opts.hpMul || 1), dmg: monDmg(L) * (elite ? 1.5 : 1),
    hp: 0, alive: false, state: 'idle', t: 0, cd: 0, face: Math.random() * TAU, respawnT: 0, wanderT: 0, tx: 0, tz: 0, flash: 0, x: 0, z: 0, y: 0, hopT: Math.random() * 3, minion: !!opts.minion, showBar: 0,
  };
  monsters.push(m);
  return m;
}
function spawnMonster(m, x, z) {
  if (x == null) {
    const F = m.field, a = Math.random() * TAU, rr = F.r * Math.sqrt(Math.random()) * 0.78;
    x = F.x + Math.cos(a) * rr; z = F.z + Math.sin(a) * rr;
  }
  m.x = m.tx = x; m.z = m.tz = z; m.y = 0;
  m.hp = m.hpMax; m.alive = true; m.state = 'idle'; m.cd = 0; m.showBar = 0;
  m.model.g.visible = true;
  m.model.g.scale.setScalar((m.elite ? 1.45 : 1) * (m.minion ? 0.9 : 1));
}
function removeMonster(m) {
  scene.remove(m.model.g, m.bar.bg, m.bar.fg);
  m.model.body.dispose();
  const i = monsters.indexOf(m);
  if (i >= 0) monsters.splice(i, 1);
}
function aliveEnemies() {
  const out = [];
  for (const m of monsters) if (m.alive) out.push(m);
  if (raid && raid.boss && raid.boss.alive) out.push(raid.boss);
  return out;
}
function killMonster(m) {
  m.alive = false; m.state = 'dead';
  m.model.g.visible = false; m.bar.bg.visible = m.bar.fg.visible = false;
  m.respawnT = m.elite ? 40 : rand(5, 8);
  const coins = Math.max(monCoin(m.lvl) * permMult(), totalCps() * (1.5 + m.lvl)) * (m.elite ? 6 : 1) * (m.minion ? 0.3 : 1);
  earn(coins);
  S.combat.kills++;
  burst(m.x, m.y + 1, m.z, [m.def.col, 0xffffff, 0xffcf3f], m.elite ? 40 : 16, 5, 0.16, 3, 1, 0.8);
  const sp = worldToScreen(m.x, m.y + 1.8, m.z);
  if (sp) floatText(sp[0], sp[1] - 10, '+' + fmt(coins), m.elite ? 'big' : '');
  if (m.elite || Math.random() < 0.01 + 0.004 * m.lvl) {
    const g = earnGems(m.elite ? 2 + Math.floor(Math.random() * 3) : 1);
    if (sp) floatText(sp[0], sp[1] - 40, '보석 +' + g, 'mint');
  }
  SFX.star();
  if (m.minion) removeMonster(m);
  if (S.combat.kills % 5 === 0 || m.elite) afterProgress(); else markDirty();
}

// ---------- 플레이어 피격 ----------
function hurtPlayer(dmg, sx, sz) {
  if (P.hurtInv > 0 || P.downT > 0) return;
  P.hp -= dmg;
  P.hurtInv = 0.45;
  P.lastHurt = nowSec();
  if (sx != null) {
    const dx = P.x - sx, dz = P.z - sz, d = Math.hypot(dx, dz) || 1;
    P.vx += dx / d * 7; P.vz += dz / d * 7; P.vy = Math.max(P.vy, 5); P.grounded = false; P.ground = null; P.knock = 0.25;
  }
  SFX.bonk();
  cam.shake = Math.max(cam.shake, 0.18);
  const h = $('hurt');
  h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
  const sp = worldToScreen(P.x, P.y + 2.2, P.z);
  if (sp) floatText(sp[0], sp[1], '-' + fmt(dmg, true), 'hurtTxt');
  if (P.hp <= 0) playerDown();
}
function playerDown() {
  if (PS.aura.phoenix && nowSec() >= (P.phxReady || 0)) {
    P.phxReady = nowSec() + 90;
    P.hp = maxHp(); P.hurtInv = 2;
    burst(P.x, P.y + 1, P.z, [0xff5a1f, 0xffb000, 0xffe066], 50, 7, 0.22, 5, 0.4, 1.1);
    SFX.finish();
    toast('캐러멜 불사조의 가호! 다시 일어났어요 (90초 뒤 다시)', 'gold', 3200);
    return;
  }
  P.hp = maxHp();
  SFX.die();
  if (raid) { endRaid(false, '쓰러졌어요'); return; }
  banner('쓰러졌어요', '캠프에서 다시 시작해요', '체력 단련과 더 강한 무기가 도움이 돼요', 2600);
  const r = { x: HUNT_C.x, y: 0, z: HUNT_C.z - 3, yaw: Math.PI / 2 };
  P.respawn = { ...r };
  respawnAt(r);
}

// ---------- 공격 ----------
const swings = [];
const swingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
const projs = [];
const arrowGeo = new THREE.BoxGeometry(0.08, 0.08, 0.9);
const orbGeo = new THREE.IcosahedronGeometry(0.28, 1);
const zaps = [];
function enemyDist(e) { return Math.hypot(e.x - P.x, e.z - P.z) - e.r; }
function attack() {
  if (P.atkCD > 0 || P.downT > 0) return false;
  const w = curWeapon();
  P.atkCD = 1 / w.rate;
  P.atkT = 0;
  const nowT = nowSec();
  P.combo = nowT - (P.lastAtk || 0) > Math.max(0.9, 1.6 / w.rate) ? 0 : ((P.combo || 0) + 1) % 3;
  P.lastAtk = nowT;
  const F = WFX[w.id] || WFX.stick;
  const es = aliveEnemies().filter((e) => Math.abs((e.y || 0) - P.y) < 4);
  let tgt = null, best = 1e9;
  // 시프트락이면 카메라 정면(조준점) 쪽 적만 자동 조준해요. 바로 붙은 적은 예외
  const aimF = shiftLock ? [-Math.sin(cam.yaw), -Math.cos(cam.yaw)] : null;
  for (const e of es) {
    const d = enemyDist(e);
    if (!(d < Math.max(w.range, 3) + 4 && d < best)) continue;
    if (aimF && d > 1.2) { const ax = e.x - P.x, az = e.z - P.z, al = Math.hypot(ax, az) || 1; if ((ax * aimF[0] + az * aimF[1]) / al < SL_AIM_COS) continue; }
    best = d; tgt = e;
  }
  if (tgt) P.face = Math.atan2(-(tgt.x - P.x), -(tgt.z - P.z));
  const fx = -Math.sin(P.face), fz = -Math.cos(P.face);
  if (w.kind === 'melee' || w.kind === 'slam') {
    const cosHalf = Math.cos((w.kind === 'slam' ? 360 : w.arc) * Math.PI / 360);
    let hits = 0;
    for (const e of es) {
      const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
      if (d - e.r > w.range) continue;
      if (w.kind === 'melee' && d > 0.3 && (dx * fx + dz * fz) / d < cosHalf) continue;
      dealDamage(e, w.dmg, w.kind === 'slam' ? 3 : 5, w);
      hits++;
    }
    fxAttack(w, hits);
    if (hits) { hitStop = Math.max(hitStop, F.stop || 0); cam.shake = Math.max(cam.shake, F.shake || 0); }
  } else if (w.kind === 'bow' || w.kind === 'homing') {
    const tx = tgt ? tgt.x : P.x + fx * w.range, tz = tgt ? tgt.z : P.z + fz * w.range, ty = tgt ? (tgt.y || 0) + (tgt.boss ? tgt.size * 0.6 : 0.8) : P.y + 1.2;
    const sx = P.x + fx * 0.6, sy = P.y + 1.3, sz = P.z + fz * 0.6;
    const dx = tx - sx, dy = ty - sy, dz = tz - sz, d = Math.hypot(dx, dy, dz) || 1;
    const spd = w.kind === 'bow' ? 42 : 24;
    const m = new THREE.Mesh(w.kind === 'bow' ? arrowGeo : orbGeo, mat(w.kind === 'bow' ? 0xf3e9d2 : w.col, { emissive: w.col, emissiveIntensity: 0.8 }));
    m.position.set(sx, sy, sz);
    m.lookAt(tx, ty, tz);
    scene.add(m);
    const pr = { m, w, x: sx, y: sy, z: sz, vx: dx / d * spd, vy: dy / d * spd, vz: dz / d * spd, spd, life: w.range / spd + 0.3, dmg: w.dmg, pierce: !!w.pierce, homing: w.kind === 'homing' ? tgt : null, hit: new Set() };
    projs.push(pr);
    fxAttack(w, 0);
    fxShoot(w, pr);
  } else if (w.kind === 'chain') {
    if (tgt && best <= w.range) {
      fxAttack(w, 1);
      const tp0 = weaponTip();
      let cur = tgt, from = [tp0.x, tp0.y, tp0.z], dmg = w.dmg;
      const done = new Set();
      for (let k = 0; k < w.chain && cur; k++) {
        done.add(cur);
        const to = [cur.x, (cur.y || 0) + (cur.boss ? cur.size * 0.6 : 0.9), cur.z];
        fxChainHop(w, from, to, k);
        dealDamage(cur, dmg, 2, w);
        from = to; dmg *= 0.8;
        let nb = null, nd = 8;
        for (const e of es) { if (done.has(e) || !e.alive) continue; const d = Math.hypot(e.x - cur.x, e.z - cur.z); if (d < nd) { nd = d; nb = e; } }
        cur = nb;
      }
    } else { const F2 = WFX[w.id]; const tp = weaponTip(); flare(tp.x, tp.y, tp.z, F2 ? F2.tip : 0xffffff, 0.9, 0.15); tone(300, 0.08, 'triangle', 0.04); }
  }
  if (PS.aura.phoenix && Math.random() < 0.35) phoenixBlast(w);
  return true;
}
function spawnSwing(w) {
  const arc = (w.kind === 'slam' ? 360 : w.arc) * Math.PI / 180;
  const geo = new THREE.RingGeometry(0.6, w.range, 28, 1, -arc / 2, arc);
  const m = new THREE.Mesh(geo, swingMat.clone());
  m.material.color.set(w.col === 0x9b6b43 ? 0xffffff : w.col);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = P.face + Math.PI / 2;
  m.position.set(P.x, P.y + (w.kind === 'slam' ? 0.15 : 1.0), P.z);
  scene.add(m);
  swings.push({ m, t: 0 });
}
function zap(a, b, col) {
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push(new THREE.Vector3(lerp(a[0], b[0], k) + (i && i < n ? rand(-0.35, 0.35) : 0), lerp(a[1], b[1], k) + (i && i < n ? rand(-0.35, 0.35) : 0), lerp(a[2], b[2], k) + (i && i < n ? rand(-0.35, 0.35) : 0)));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true }));
  scene.add(line);
  zaps.push({ m: line, t: 0 });
}
function dealDamage(e, base, knock, w) {
  const crit = Math.random() < 0.1;
  const dmg = base * combatMult() * rand(0.9, 1.1) * (crit ? 2 : 1);
  e.hp -= dmg;
  e.flash = 0.12;
  e.showBar = 4;
  if (!e.boss && knock) {
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1;
    e.kx = dx / d * knock * 1.4; e.kz = dz / d * knock * 1.4;
    if (e.state === 'idle') e.state = 'chase';
  }
  const sp = worldToScreen(e.x, (e.y || 0) + (e.boss ? e.size * 1.4 : 2.0), e.z);
  if (sp) floatText(sp[0] + rand(-20, 20), sp[1], fmt(dmg), crit ? 'crit' : 'dmg');
  fxHit(w, e, crit);
  if (e.hp <= 0) { if (e.boss) bossDefeated(); else killMonster(e); }
}

// ---------- 사냥터 만들기 ----------
function deckBridge(x0, z0, x1, z1) {
  const alongX = z0 === z1;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0), W = 4.4;
  mesh(G.box, M.wood, cx, -0.3, cz, alongX ? len : W, 0.6, alongX ? W : len);
  addBoxCol(cx, -0.3, cz, alongX ? len / 2 : W / 2, 0.3, alongX ? W / 2 : len / 2, {});
  for (const sd of [-1, 1]) {
    const rx = alongX ? cx : cx + sd * 2.05, rz = alongX ? cz + sd * 2.05 : cz;
    mesh(G.box, M.wood, rx, 1.12, rz, alongX ? len : 0.16, 0.14, alongX ? 0.16 : len);
    addBoxCol(rx, 0.6, rz, alongX ? len / 2 : 0.12, 0.6, alongX ? 0.12 : len / 2, {});
    for (let s = 0; s <= len; s += Math.max(3, len / 6)) {
      const px = alongX ? Math.min(x0, x1) + s : rx, pz = alongX ? rz : Math.min(z0, z1) + s;
      mesh(G.box, M.woodDark, px, 0.6, pz, 0.26, 1.2, 0.26);
    }
  }
}
let fountain = null, raidAltars = [], raidSign = null;
function raidSigns(on) { if (raidSign) raidSign.sp.visible = on; for (const A of raidAltars) A.lab.sp.visible = on; }
