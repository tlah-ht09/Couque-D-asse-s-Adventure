'use strict';
// =====================================================================
//  업적 (단계가 끝없이 이어짐)
// =====================================================================
const sumGens = () => S.gens.reduce((a, b) => a + b, 0);
const ACH = [
  { key: 'clicks', name: '채굴 장인', unit: '번 채굴', val: () => S.clicks, th: (t) => 100 * Math.pow(5, t) },
  { key: 'earn', name: '부의 길', unit: ' 코인 누적', val: () => S.lifeEarned, th: (t) => 1e4 * Math.pow(100, t) },
  { key: 'build', name: '건설왕', unit: '레벨 (드로퍼 합계)', val: () => sumGens(), th: (t) => 25 * Math.pow(2, t) },
  { key: 'tower', name: '탑 정복자', unit: '층', val: () => S.tower.best, th: (t) => 10 * (t + 1) },
  { key: 'reb', name: '윤회', unit: '번 환생', val: () => S.rebirths, th: (t) => [1, 3, 10, 25, 50][t] ?? 50 * Math.pow(2, t - 4) },
  { key: 'awk', name: '각성자', unit: '단계 각성', val: () => S.awk.reduce((a, b) => a + b, 0), th: (t) => [1, 3, 6, 10][t] ?? 10 + 6 * (t - 3) },
  { key: 'stars', name: '별 수집가', unit: '개 별 조각', val: () => S.stars.length, th: (t) => [6, 12, 18, 24][t] ?? Infinity },
  { key: 'medal', name: '스피드러너', unit: '개 메달', val: () => medalCount(), th: (t) => [1, 5, 10, 15, 20][t] ?? Infinity },
  { key: 'hunt', name: '몬스터 헌터', unit: '마리 처치', val: () => S.combat.kills, th: (t) => 25 * Math.pow(4, t) },
  { key: 'raid', name: '레이드 영웅', unit: ' (레이드 단계 합계)', val: () => raidTotal(), th: (t) => [1, 3, 6, 10, 15][t] ?? 15 + 8 * (t - 4) },
  { key: 'gold', name: '행운아', unit: '번 황금 별똥별', val: () => S.goldCaught, th: (t) => Math.pow(3, t) },
  { key: 'daily', name: '꾸준함', unit: '일 연속 도전', val: () => S.daily.bestStreak, th: (t) => [2, 3, 5, 7, 14, 30, 60, 100][t] ?? 100 + 50 * (t - 7) },
  { key: 'fall', name: '불굴의 의지', unit: '번 추락', val: () => S.deaths, th: (t) => 10 * Math.pow(5, t) },
  { key: 'time', name: '하늘섬 주민', unit: '시간 플레이', val: () => S.play / 3600, th: (t) => [1, 3, 10, 24, 50, 100][t] ?? 100 * (t - 4) },
  { key: 'pets', name: '펫 수집가', unit: '종 도감 등록', val: () => DEX.n, th: (t) => [3, 6, 10, 14, 22, 30, 37][t] ?? Infinity },
  { key: 'hatch', name: '부화 장인', unit: '번 부화', val: () => S.pets.hatched, th: (t) => 10 * Math.pow(5, t) },
];
function checkAch() {
  for (const a of ACH) {
    let t = S.ach[a.key] || 0, guard = 0;
    while (a.val() >= a.th(t) && guard++ < 40) {
      t++;
      const g = earnGems(2 + Math.min(t, 10));
      toast('업적 · ' + a.name + ' ' + t + '단계 · 수입 +2% · 보석 +' + g, 'gold', 3000);
      SFX.quest();
    }
    if (t !== (S.ach[a.key] || 0)) { S.ach[a.key] = t; markDirty(); }
  }
}

// =====================================================================
//  황금 별똥별 (무작위 이벤트)
// =====================================================================
let goldOrb = null;
let goldNext = performance.now() + rand(50, 80) * 1000;
const goldGroup = new THREE.Group();
goldGroup.visible = false;
scene.add(goldGroup);
const goldCore = mesh(G.oct, mat(0xffd23f, { emissive: 0xffb000, emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.3 }), 0, 0, 0, 0.9, 1.3, 0.9, goldGroup, false, false);
const goldGlow = new THREE.Sprite(starGlowMat);
goldGlow.scale.set(5, 5, 1);
goldGroup.add(goldGlow);
const goldBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 90, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
goldBeam.position.y = 45;
goldGroup.add(goldBeam);

function luckLv() { return S.rup.luck || 0; }
function spawnGold() {
  const cand = [];
  for (const c of colliders) {
    if (!c.solid || c.kill || c.move || c.fade || c.bounce || c.pad != null || c.bridgePad || c.launchPad || c.portal || c.towerGate || c.dailyGate || c.towerCont || c.pedestal || c.eggPad || c.hatchGate || c.castleGate || c.castleBuild || c.castleDoor || c.castleRoom || c.castleLobby || c.castleExit || c.washShop || c.eggStand) continue;
    if (c.t === 'b' && (c.hx < 1 || c.hz < 1)) continue;
    if (c.t === 'c' && c.r < 1.1) continue;
    const dx = c.x - P.x, dz = c.z - P.z, d = Math.hypot(dx, dz);
    if (d < 10 || d > 75 || Math.abs(c.top - P.y) > 18) continue;
    if (inSkyZone(c.x, c.top, c.z) !== inSkyZone(P.x, P.y, P.z)) continue;
    cand.push(c);
  }
  if (!cand.length) { goldNext = performance.now() + 20000; return; }
  const c = cand[Math.floor(Math.random() * cand.length)];
  let x = c.x, z = c.z;
  if (c.island) { const a = Math.random() * TAU, r = c.r * rand(0.2, 0.6); x += Math.cos(a) * r; z += Math.sin(a) * r; }
  const life = 40000 * (1 + 0.1 * luckLv());
  goldOrb = { x, y: c.top + 1.4, z, end: performance.now() + life, taken: false };
  goldGroup.position.set(x, goldOrb.y, z);
  goldGroup.visible = true;
  SFX.star();
  toast('황금 별똥별이 떨어졌어요! 40초 안에 잡으세요', 'gold', 3200);
}
function catchGold() {
  goldOrb.taken = true;
  goldGroup.visible = false;
  S.goldCaught++;
  const now = performance.now(), dur = 1 + 0.1 * luckLv();
  const r = Math.random();
  let title, line;
  if (r < 0.45) {
    buffs.push({ kind: 'income', mult: 7, end: now + 60000 * dur, label: '광산 열풍 x7' });
    title = '광산 열풍'; line = '모든 수입 7배 · ' + Math.round(60 * dur) + '초';
  } else if (r < 0.75) {
    const c = Math.min(S.coins * 0.15, totalCps() * 900) + 100;
    earn(c);
    title = '횡재'; line = '+' + fmt(c) + ' 코인';
  } else if (r < 0.9) {
    buffs.push({ kind: 'click', mult: 25, end: now + 15000 * dur, label: '채굴 폭주 x25' });
    title = '채굴 폭주'; line = '채굴량 25배 · ' + Math.round(15 * dur) + '초 · 마구 누르세요!';
  } else {
    const g = earnGems(3 + Math.floor(Math.random() * 6));
    title = '보석 비'; line = '보석 +' + g;
  }
  SFX.finish();
  burst(goldOrb.x, goldOrb.y, goldOrb.z, [0xffd23f, 0xffffff, 0xffa800], 60, 8, 0.2, 5, 0.6, 1.2);
  banner('황금 별똥별', title, line, 3200);
  afterProgress();
}
function updateGold(dt) {
  const now = performance.now();
  for (let i = buffs.length - 1; i >= 0; i--) if (buffs[i].end <= now) { buffs.splice(i, 1); markDirty(); }
  if (goldOrb && !goldOrb.taken) {
    const left = goldOrb.end - now;
    if (left <= 0) { goldOrb = null; goldGroup.visible = false; toast('황금 별똥별이 사라졌어요', '', 1600); }
    else {
      goldCore.rotation.y += dt * 3;
      goldGroup.position.y = goldOrb.y + Math.sin(now / 300) * 0.2;
      goldGroup.visible = left > 8000 || Math.floor(now / 150) % 2 === 0;
    }
  } else if (goldOrb && goldOrb.taken) goldOrb = null;
  if (!goldOrb && now > goldNext && !modalOpen && P.y > -10) {
    goldNext = now + rand(110, 230) * 1000 / (1 + 0.15 * luckLv()) / (PS.aura.king ? 2 : 1);
    spawnGold();
  }
  // 화면 가장자리 표시
  const ar = $('goldArrow');
  if (!goldOrb || goldOrb.taken) { ar.classList.add('hidden'); return; }
  ar.classList.remove('hidden');
  _v3.set(goldOrb.x, goldOrb.y, goldOrb.z).project(camera);
  const behind = _v3.z > 1;
  let sx = _v3.x, sy = _v3.y;
  if (behind) { sx = -sx; sy = -sy; }
  const inside = !behind && Math.abs(sx) < 0.9 && Math.abs(sy) < 0.85;
  const secs = Math.ceil((goldOrb.end - now) / 1000);
  $('goldTxt').textContent = Math.round(Math.hypot(goldOrb.x - P.x, goldOrb.z - P.z)) + 'm · ' + secs + '초';
  if (inside) {
    ar.style.left = ((sx + 1) / 2 * innerWidth) + 'px';
    ar.style.top = ((1 - sy) / 2 * innerHeight - 40) + 'px';
    $('goldPtr').style.transform = 'rotate(180deg)';
  } else {
    const ang = Math.atan2(-sy, sx);
    const m = Math.max(Math.abs(sx), Math.abs(sy)) || 1;
    let ex = sx / m, ey = sy / m;
    ex = clamp(ex, -0.5, 0.62); ey = clamp(ey, -0.62, 0.55);
    ar.style.left = ((ex + 1) / 2 * innerWidth) + 'px';
    ar.style.top = ((1 - ey) / 2 * innerHeight) + 'px';
    $('goldPtr').style.transform = 'rotate(' + (ang * 180 / Math.PI + 90) + 'deg)';
  }
}
