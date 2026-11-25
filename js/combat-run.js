'use strict';
// ---------- 몬스터 갱신 ----------
const MON_VIEW_D = 80;
function updateMonsters(dt) {
  const near = inHunt() || raid;
  for (let mi = monsters.length - 1; mi >= 0; mi--) {
    const m = monsters[mi];
    const md = m.model;
    if (!near) { md.g.visible = false; m.bar.bg.visible = m.bar.fg.visible = false; continue; }
    if (!m.alive) {
      m.respawnT -= dt;
      if (m.respawnT <= 0 && !m.minion) spawnMonster(m);
      continue;
    }
    const F = m.field;
    const dx = P.x - m.x, dz = P.z - m.z, d = Math.hypot(dx, dz);
    // 멀리 있는 몬스터는 그리지 않아요 (움직임 계산은 계속)
    md.g.visible = d < MON_VIEW_D;
    const onField = Math.hypot(P.x - F.x, P.z - F.z) < F.r + 1.5 && P.y < 4 && P.downT <= 0;
    m.t += dt; m.cd -= dt;
    let mvx = 0, mvz = 0, spd = 0;
    if (m.state === 'idle') {
      m.wanderT -= dt;
      if (m.wanderT <= 0) { const a = Math.random() * TAU, rr = F.r * Math.sqrt(Math.random()) * 0.75; m.tx = F.x + Math.cos(a) * rr; m.tz = F.z + Math.sin(a) * rr; m.wanderT = rand(3, 6); }
      const wx = m.tx - m.x, wz = m.tz - m.z, wd = Math.hypot(wx, wz);
      if (wd > 0.5) { mvx = wx / wd; mvz = wz / wd; spd = m.speed * 0.35; }
      if (onField && d < (m.minion ? 40 : 11)) m.state = 'chase';
    } else if (m.state === 'chase') {
      if (!onField || d > 22) { m.state = 'idle'; m.wanderT = 0; }
      else if (d > m.r + 0.9) { mvx = dx / d; mvz = dz / d; spd = m.speed; }
      else if (m.cd <= 0) { m.state = 'wind'; m.t = 0; }
    } else if (m.state === 'wind') {
      if (m.t > 0.55) {
        if (d < m.r + 1.5 && Math.abs(P.y - m.y) < 2.2) hurtPlayer(m.dmg, m.x, m.z);
        m.state = 'chase'; m.cd = 1.0;
      }
    }
    if (m.kx || m.kz) { m.x += m.kx * dt; m.z += m.kz * dt; const f = Math.exp(-10 * dt); m.kx *= f; m.kz *= f; if (Math.abs(m.kx) + Math.abs(m.kz) < 0.05) m.kx = m.kz = 0; }
    if (spd) {
      m.x += mvx * spd * dt; m.z += mvz * spd * dt;
      const tf = Math.atan2(-mvx, -mvz);
      let df = tf - m.face; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
      m.face += df * Math.min(1, dt * 8);
    } else if (m.state !== 'idle') {
      const tf = Math.atan2(-dx, -dz);
      let df = tf - m.face; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
      m.face += df * Math.min(1, dt * 8);
    }
    // 섬 밖으로 못 나감
    const fx = m.x - F.x, fz = m.z - F.z, fd = Math.hypot(fx, fz), lim = F.r - 0.8;
    if (fd > lim) { m.x = F.x + fx / fd * lim; m.z = F.z + fz / fd * lim; }
    // 애니메이션
    const g = md.g;
    let bob = 0;
    const moving = spd > 0.1;
    if (m.def.model === 'slime') { m.hopT += dt * (moving ? 4 : 1.5); bob = Math.abs(Math.sin(m.hopT)) * (moving ? 0.5 : 0.1); md.core.scale.y = 0.6 * (1 - Math.abs(Math.cos(m.hopT)) * 0.15); }
    else if (m.def.float) { bob = 0.25 + Math.sin(m.t * 2.5 + m.hopT) * 0.2; if (md.outer) md.outer.rotation.y += dt * 2; }
    else { m.hopT += dt * (moving ? spd * 1.6 : 0); md.legs.forEach((lg, i) => { lg.rotation.x = Math.sin(m.hopT + (i % 2 ? Math.PI : 0)) * (moving ? 0.7 : 0); }); bob = moving ? Math.abs(Math.sin(m.hopT)) * 0.06 : 0; }
    if (m.state === 'wind') { const k = m.t / 0.55; g.rotation.x = -0.35 * k; md.body.emissive.setRGB(0.6 * k, 0.05, 0.05); }
    else { g.rotation.x = 0; md.body.emissive.setRGB(m.flash > 0 ? 0.9 : 0, m.flash > 0 ? 0.9 : 0, m.flash > 0 ? 0.9 : 0); }
    if (m.def.model === 'fire') md.body.emissive.set(m.flash > 0 ? 0xffffff : m.def.col);
    m.flash -= dt;
    g.position.set(m.x, m.y + bob, m.z);
    g.rotation.y = m.face;
    if (m.def.model === 'fire' && Math.random() < dt * 6) burst(m.x, m.y + 1.6, m.z, [0xff8f3f, 0xffd166], 1, 0.5, 0.12, 1.5, -0.2, 0.6);
    // 체력바
    m.showBar -= dt;
    const showB = m.showBar > 0 || m.elite;
    m.bar.bg.visible = m.bar.fg.visible = showB && d < 40;
    if (showB) {
      const top = { slime: 1.4, mush: 1.6, wolf: 1.8, golem: 3.0, ghost: 2.4, fire: 2.4 }[m.def.model] * (m.elite ? 1.45 : 1) + 0.4;
      const W = m.elite ? 2.2 : 1.4, k = clamp(m.hp / m.hpMax, 0, 1);
      m.bar.bg.position.set(m.x, m.y + top, m.z); m.bar.bg.scale.set(W + 0.1, 0.22, 1);
      m.bar.fg.position.set(m.x, m.y + top, m.z); m.bar.fg.scale.set(Math.max(0.001, W * k), 0.14, 1);
      m.bar.fg.center.set(k > 0 ? 0.5 / k : 0.5, 0.5);
    }
  }
  // 몬스터끼리 겹치지 않게
  for (let i = 0; i < monsters.length; i++) {
    const a = monsters[i];
    if (!a.alive || !a.model.g.visible) continue;
    for (let j = i + 1; j < monsters.length; j++) {
      const b = monsters[j];
      if (!b.alive || b.field !== a.field) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), mn = a.r + b.r;
      if (d < mn && d > 1e-4) { const k = (mn - d) / d * 0.5; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; }
    }
  }
}
function updateProjectiles(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    p.life -= dt;
    if (p.homing && p.homing.alive) {
      const h = p.homing, ty = (h.y || 0) + (h.boss ? h.size * 0.6 : 0.8);
      const dx = h.x - p.x, dy = ty - p.y, dz = h.z - p.z, d = Math.hypot(dx, dy, dz) || 1;
      p.vx = lerp(p.vx, dx / d * p.spd, dt * 6); p.vy = lerp(p.vy, dy / d * p.spd, dt * 6); p.vz = lerp(p.vz, dz / d * p.spd, dt * 6);
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.m.position.set(p.x, p.y, p.z);
    if (!p.spin) p.m.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
    fxTrail(p, dt);
    let dead = p.life <= 0;
    if (!dead) for (const e of aliveEnemies()) {
      if (p.hit.has(e)) continue;
      const ey = (e.y || 0) + (e.boss ? e.size * 0.6 : 0.8);
      if (Math.hypot(e.x - p.x, e.z - p.z) < e.r + 0.35 && Math.abs(ey - p.y) < (e.boss ? e.size : 1.4)) {
        p.hit.add(e);
        dealDamage(e, p.dmg, 2, p.w);
        if (!p.pierce) { dead = true; break; }
      }
    }
    if (dead) { scene.remove(p.m); fxProjEnd(p); projs.splice(i, 1); }
  }
  for (let i = swings.length - 1; i >= 0; i--) {
    const s = swings[i]; s.t += dt;
    s.m.material.opacity = 0.5 * (1 - s.t / 0.22);
    if (s.t > 0.22) { scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); swings.splice(i, 1); }
  }
  for (let i = zaps.length - 1; i >= 0; i--) {
    const z = zaps[i]; z.t += dt;
    z.m.material.opacity = 1 - z.t / 0.2;
    if (z.t > 0.2) { scene.remove(z.m); z.m.geometry.dispose(); z.m.material.dispose(); zaps.splice(i, 1); }
  }
}

// =====================================================================
//  보스 레이드
// =====================================================================
let raid = null;
const hazards = [];
const hzRed = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
const hzRedFill = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const waveMat = new THREE.MeshBasicMaterial({ color: 0xffa45c, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
function bossModel(def) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: def.col, roughness: 0.6, flatShading: true, emissive: 0x000000 });
  body.userData.own = true;
  const dark = mat(0x1a1a2e);
  const parts = { g, body, wings: [] };
  const eye = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 });
  const crown = (y, s = 1) => { const c = new THREE.Group(); c.position.y = y; g.add(c); mesh(G.cyl8, M.gold, 0, 0, 0, 0.45 * s, 0.25 * s, 0.45 * s, c); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; mesh(G.cone, M.gold, Math.cos(a) * 0.36 * s, 0.24 * s, Math.sin(a) * 0.36 * s, 0.1 * s, 0.3 * s, 0.1 * s, c); } };
  if (def.model === 'slime') {
    body.transparent = true; body.opacity = 0.9;
    parts.core = mesh(G.ico1, body, 0, 0.62, 0, 0.85, 0.65, 0.85, g);
    mesh(G.box, dark, -0.25, 0.8, -0.72, 0.1, 0.18, 0.05, g, false, false);
    mesh(G.box, dark, 0.25, 0.8, -0.72, 0.1, 0.18, 0.05, g, false, false);
    crown(1.22, 0.6);
  } else if (def.model === 'golem') {
    parts.core = mesh(G.box, body, 0, 1.3, 0, 1.3, 1.1, 0.9, g);
    mesh(G.box, body, 0, 2.15, 0, 0.62, 0.5, 0.6, g);
    const e2 = mat(0xff9f43, { emissive: 0xff7a00, emissiveIntensity: 1.2 });
    mesh(G.box, e2, -0.14, 2.18, -0.31, 0.12, 0.08, 0.02, g, false, false);
    mesh(G.box, e2, 0.14, 2.18, -0.31, 0.12, 0.08, 0.02, g, false, false);
    for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.85, 1.7, 0); g.add(piv); mesh(G.box, body, 0, -0.65, 0, 0.5, 1.3, 0.5, piv); parts.wings.push(piv); }
    mesh(G.box, body, -0.35, 0.4, 0, 0.45, 0.8, 0.5, g); mesh(G.box, body, 0.35, 0.4, 0, 0.45, 0.8, 0.5, g);
    for (let i = 0; i < 4; i++) mesh(G.dodec, mat(0x6b8a5a), rand(-0.5, 0.5), 1.9, rand(-0.3, 0.3), 0.2, 0.15, 0.2, g, false, false);
  } else if (def.model === 'ghost') {
    body.transparent = true; body.opacity = 0.8;
    parts.core = mesh(G.ico1, body, 0, 1.5, 0, 0.55, 0.55, 0.55, g);
    const tail = mesh(G.cone16, body, 0, 0.85, 0, 0.65, 1.3, 0.65, g); tail.rotation.x = Math.PI;
    mesh(G.box, dark, -0.17, 1.55, -0.48, 0.11, 0.17, 0.04, g, false, false);
    mesh(G.box, dark, 0.17, 1.55, -0.48, 0.11, 0.17, 0.04, g, false, false);
    crown(2.0, 0.7);
    for (let i = 0; i < 3; i++) { const o = mesh(G.oct, mat(0xc3a6ff, { emissive: 0x9b5de5, emissiveIntensity: 1 }), 0, 1.5, 0, 0.15, 0.2, 0.15, g, false, false); parts.wings.push(o); }
  } else if (def.model === 'dragon') {
    parts.core = mesh(G.box, body, 0, 1.2, 0.2, 0.9, 0.8, 1.6, g);
    mesh(G.box, body, 0, 1.6, -0.75, 0.45, 0.45, 0.6, g);
    mesh(G.box, body, 0, 1.85, -1.2, 0.55, 0.42, 0.65, g);
    mesh(G.box, mat(0xffd166), 0, 1.68, -1.45, 0.4, 0.12, 0.35, g);
    mesh(G.cone, mat(0xf3e9d2), -0.18, 2.2, -1.05, 0.07, 0.35, 0.07, g); mesh(G.cone, mat(0xf3e9d2), 0.18, 2.2, -1.05, 0.07, 0.35, 0.07, g);
    mesh(G.box, eye, -0.18, 1.95, -1.53, 0.08, 0.06, 0.02, g, false, false); mesh(G.box, eye, 0.18, 1.95, -1.53, 0.08, 0.06, 0.02, g, false, false);
    const tail = mesh(G.box, body, 0, 1.05, 1.35, 0.3, 0.3, 1.1, g); tail.rotation.x = -0.3;
    for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(sx * 0.4, 1.55, 0.1); g.add(piv); mesh(G.box, mat(0xb8323f), sx * 0.95, 0, 0, 1.9, 0.06, 1.1, piv); parts.wings.push(piv); }
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.7], [0.3, 0.7]]) mesh(G.box, body, x, 0.45, z, 0.22, 0.9, 0.22, g);
  } else if (def.model === 'lord') {
    parts.core = mesh(G.cone16, body, 0, 1.1, 0, 0.75, 2.2, 0.75, g);
    mesh(G.ico1, mat(0x1a1a2e), 0, 2.35, 0, 0.38, 0.4, 0.38, g);
    mesh(G.box, eye, -0.12, 2.4, -0.33, 0.08, 0.05, 0.02, g, false, false); mesh(G.box, eye, 0.12, 2.4, -0.33, 0.08, 0.05, 0.02, g, false, false);
    const halo = mesh(G.torus, mat(0xc77dff, { emissive: 0x9b5de5, emissiveIntensity: 1.3 }), 0, 2.9, 0.1, 0.45, 0.45, 0.45, g, false, false); halo.rotation.x = Math.PI / 2 - 0.3;
    for (let i = 0; i < 4; i++) { const o = mesh(G.oct, mat(0xc77dff, { emissive: 0x9b5de5, emissiveIntensity: 1 }), 0, 1.6, 0, 0.2, 0.28, 0.2, g, false, false); parts.wings.push(o); }
  }
  g.scale.setScalar(def.size);
  scene.add(g);
  return parts;
}
function bossStats(def, lvl) { return { hp: def.hp * Math.pow(1.6, lvl - 1), dmg: def.dmg * Math.pow(1.22, lvl - 1) }; }
function bossUnlocked(i) { return i === 0 || (S.raid[BOSSES[i - 1].id] || 0) >= 1; }
function refreshAltars(force) {
  for (const A of raidAltars) {
    const i = BOSSES.indexOf(A.b), un = bossUnlocked(i), best = S.raid[A.b.id] || 0;
    const key = un + '|' + best;
    if (key === A.key && !force) continue;
    A.key = key;
    drawLabel(A.lab, un ? [{ t: A.b.name, c: '#' + new THREE.Color(A.b.col).getHexString(), s: 44 }, { t: best ? '최고 ' + best + '단계' : '도전!', s: 32 }] : [{ t: A.b.name, c: '#9aa5c4', s: 44 }, { t: '이전 보스 처치 필요', c: '#9aa5c4', s: 28 }]);
  }
}
let raidPick = 1;
function openRaidMenu(id) {
  if (raid) return;
  const i = BOSSES.findIndex((b) => b.id === id), def = BOSSES[i];
  if (!bossUnlocked(i)) { toast(BOSSES[i - 1].name + '을(를) 먼저 쓰러뜨려야 해요', 'bad'); SFX.err(); return; }
  const best = S.raid[id] || 0;
  raidPick = best + 1;
  const render = () => {
    const st = bossStats(def, raidPick), dps = weaponDps(curWeapon());
    const need = st.hp / 100;
    const relicW = WEAPONS.find((w) => w.relic === def.id);
    $('raidInfo').innerHTML = '<div class="kv"><span>단계</span><span>' + raidPick + (raidPick > best ? ' (새 단계)' : '') + '</span><span>보스 체력</span><span>' + fmt(st.hp) + '</span><span>보스 공격력</span><span>' + fmt(st.dmg, true) + ' (내 체력 ' + fmt(maxHp()) + ')</span><span>권장 초당 피해</span><span>' + fmt(need) + '</span><span>내 초당 피해</span><span style="color:' + (dps >= need ? '#3ee6a5' : '#ff9b8f') + '">' + fmt(dps) + '</span><span>보상</span><span>' + fmt(raidCoins(def, raidPick)) + ' 코인 · 보석 ' + Math.round(raidGems(i, raidPick) * gemMult()) + '</span></div>' +
      (relicW && !S.combat.owned.includes(relicW.id) ? '<p class="hl" style="margin-top:8px">첫 처치 시 유물 무기 「' + relicW.name + '」 획득</p>' : '');
    $('rlVal').textContent = raidPick + '단계';
  };
  showModal(def.name + ' 레이드', '<p>3분 안에 보스를 쓰러뜨리세요. 체력이 0이 되면 실패해요.</p><p style="color:var(--muted);font-size:14px">패턴: ' + def.pats.filter((v, k, a) => a.indexOf(v) === k).map((p) => PAT_TXT[p]).join(' · ') + '</p>' +
    '<div class="seg" style="margin:10px 0"><span>도전 단계</span><div><button id="rlMinus">−</button><button id="rlVal" class="on">1단계</button><button id="rlPlus">+</button></div></div><div id="raidInfo"></div>',
    [{ t: '취소' }, { t: '도전하기', primary: true, fn: () => startRaid(def, raidPick) }]);
  $('rlMinus').onclick = () => { raidPick = Math.max(1, raidPick - 1); render(); };
  $('rlPlus').onclick = () => { raidPick = Math.min(best + 1, raidPick + 1); render(); };
  render();
}
function raidCoins(def, lvl) { return Math.max(def.reward * Math.pow(1.8, lvl - 1), totalCps() * (120 + 20 * lvl)); }
function raidGems(i, lvl) { return 6 + 4 * i + 1.5 * lvl; }
function startRaid(def, lvl) {
  const st = bossStats(def, lvl);
  const parts = bossModel(def);
  const boss = { boss: true, def, lvl, parts, x: RAID_C.x, z: RAID_C.z + 8, y: 0, r: def.size * 0.75, size: def.size, hp: st.hp, hpMax: st.hp, dmg: st.dmg, alive: true, cd: 2, action: null, face: Math.PI, flash: 0, contactCD: 0, t: 0 };
  P.course = null; leaveTracks(); hideTimer();
  raid = { def, lvl, boss, t0: nowSec(), limit: 180, minions: [] };
  P.hp = maxHp();
  const r = { x: RAID_C.x, y: 0, z: RAID_C.z - 4, yaw: Math.PI };
  P.respawn = { ...r };
  respawnAt(r);
  $('bossBar').classList.remove('hidden');
  raid.prevDist = cam.distT; cam.distT = Math.max(cam.distT, 15); cam.pitch = Math.max(cam.pitch, 0.5);
  $('bossName').textContent = def.name + ' · ' + lvl + '단계';
  tone(80, 1.2, 'sawtooth', 0.06, 40);
  raidSigns(false);
  banner(lvl + '단계', def.name, '3분 안에 쓰러뜨리세요', 1800);
}
function clearRaidStuff() {
  for (const h of hazards) for (const m of h.ms) scene.remove(m);
  hazards.length = 0;
  for (const m of monsters.slice()) if (m.minion) removeMonster(m);
  if (raid && raid.boss) { scene.remove(raid.boss.parts.g); raid.boss.parts.body.dispose(); }
  $('bossBar').classList.add('hidden');
  raidSigns(true);
}
function endRaid(win, reason) {
  if (!raid) return;
  const R = raid;
  clearRaidStuff();
  if (R.prevDist) cam.distT = R.prevDist;
  raid = null;
  const r = { x: RAID_C.x, y: 0, z: RAID_C.z - 11, yaw: Math.PI };
  P.respawn = { ...r };
  if (!win) {
    banner('레이드 실패', reason || '다시 도전해 보세요', '무기·전투 숙련·체력 단련을 강화해 보세요', 3000);
    respawnAt(r);
    return;
  }
  const i = BOSSES.indexOf(R.def);
  const time = nowSec() - R.t0;
  const coins = raidCoins(R.def, R.lvl);
  earn(coins);
  const g = earnGems(raidGems(i, R.lvl));
  const first = R.lvl > (S.raid[R.def.id] || 0);
  if (first) S.raid[R.def.id] = R.lvl;
  S.combat.bossKills++;
  let extra = '';
  const relic = WEAPONS.find((w) => w.relic === R.def.id);
  if (relic && !S.combat.owned.includes(relic.id)) { S.combat.owned.push(relic.id); extra = ' · 유물 「' + relic.name + '」 획득!'; }
  SFX.finish();
  burst(P.x, P.y + 2, P.z, [0xffcf3f, 0xff6b5b, 0xffffff, 0xc77dff], 90, 10, 0.24, 8, 1, 1.6);
  banner(fmtTime(time) + (first ? ' · 새 단계 돌파' : ''), R.def.name + ' 처치!', '+' + fmt(coins) + ' 코인 · 보석 +' + g + extra, 5000);
  refreshAltars(true);
  submitTime();
  afterProgress();
  save();
  setTimeout(() => { if (!raid) respawnAt(r); }, 1800);
}
function bossDefeated() {
  const b = raid.boss;
  b.alive = false;
  burst(b.x, b.size, b.z, [b.def.col, 0xffffff, 0xffcf3f], 80, 9, 0.3, 6, 0.8, 1.6);
  endRaid(true);
}

// 위험 요소
function hzCircle(x, z, r, delay, dmg) {
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 32), hzRedFill);
  const out = new THREE.Mesh(new THREE.RingGeometry(r - 0.15, r, 40), hzRed);
  fill.rotation.x = out.rotation.x = -Math.PI / 2;
  fill.position.set(x, 0.06, z); out.position.set(x, 0.07, z);
  fill.scale.setScalar(0.01);
  scene.add(fill, out);
  hazards.push({ type: 'circle', x, z, r, delay, dmg, t: 0, ms: [fill, out], fill });
}
const waveGeo = new THREE.CylinderGeometry(1, 1, 0.7, 48, 1, true);
function hzWave(x, z, speed, maxR, dmg, delay = 0) {
  const m = new THREE.Mesh(waveGeo, waveMat);
  m.position.set(x, 0.35, z);
  m.visible = false;
  scene.add(m);
  hazards.push({ type: 'wave', x, z, speed, maxR, dmg, t: -delay, ms: [m], m, hit: false });
}
function hzOrb(x, y, z, vx, vz, dmg, col) {
  const m = new THREE.Mesh(orbGeo, mat(col, { emissive: col, emissiveIntensity: 1 }));
  m.scale.setScalar(1.6);
  m.position.set(x, y, z);
  scene.add(m);
  hazards.push({ type: 'orb', x, y, z, vx, vz, dmg, t: 0, life: 5, ms: [m], m });
}
function hzCone(x, z, ang, half, len, delay, dur, dmg) {
  const geo = new THREE.CircleGeometry(len, 24, -half, half * 2);
  const m = new THREE.Mesh(geo, hzRed.clone());
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = ang;
  m.position.set(x, 0.08, z);
  scene.add(m);
  hazards.push({ type: 'cone', x, z, ang, half, len, delay, dur, dmg, t: 0, tick: 0, ms: [m], m, own: true });
}
function hzRock(x, z, delay, col = 0x8a7a6a) {
  const m = mesh(G.dodec, mat(col), x, 18, z, 0.9, 0.9, 0.9, scene, true, false);
  hazards.push({ type: 'rock', x, z, delay, t: 0, ms: [m], m });
}
function updateHazards(dt) {
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.t += dt;
    let done = false;
    const pd = Math.hypot(P.x - h.x, P.z - h.z);
    if (h.type === 'circle') {
      h.fill.scale.setScalar(Math.max(0.01, Math.min(1, h.t / h.delay)));
      if (h.t >= h.delay) {
        if (pd < h.r + PR * 0.5 && P.y < 1.6) hurtPlayer(h.dmg, h.x, h.z);
        burst(h.x, 0.3, h.z, [0xff6b5b, 0xffa45c], 10, 5, 0.18, 3, 1, 0.5);
        done = true;
      }
    } else if (h.type === 'wave') {
      if (h.t >= 0) {
        const R = h.t * h.speed;
        h.m.visible = true;
        h.m.scale.set(R, 1, R);
        h.m.material.opacity = 0.7 * (1 - R / h.maxR);
        if (!h.hit && Math.abs(pd - R) < 0.6 && P.y < 0.75) { h.hit = true; hurtPlayer(h.dmg, h.x, h.z); }
        if (R > h.maxR) done = true;
      }
    } else if (h.type === 'orb') {
      h.x += h.vx * dt; h.z += h.vz * dt;
      h.m.position.set(h.x, h.y, h.z);
      h.m.rotation.y += dt * 4;
      const dy = P.y + 0.9 - h.y;
      if (Math.hypot(P.x - h.x, P.z - h.z) < 0.85 && Math.abs(dy) < 1.1) { hurtPlayer(h.dmg, h.x, h.z); done = true; }
      if (h.t > h.life || Math.hypot(h.x - RAID_C.x, h.z - RAID_C.z) > RAID_C.r + 6) done = true;
    } else if (h.type === 'cone') {
      if (h.t < h.delay) h.m.material.opacity = 0.15 + 0.25 * (h.t / h.delay);
      else {
        h.m.material.color.set(0xff8f3f); h.m.material.opacity = 0.55;
        h.tick -= dt;
        if (Math.random() < dt * 30) { const a = h.ang + rand(-h.half, h.half), rr = rand(1, h.len); burst(h.x + Math.cos(a) * rr, 0.8, h.z - Math.sin(a) * rr, [0xff8f3f, 0xffd166, 0xff5a1f], 2, 2, 0.25, 2, -0.1, 0.5); }
        if (h.tick <= 0) {
          const a = Math.atan2(-(P.z - h.z), P.x - h.x);
          let da = a - h.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
          if (pd < h.len && Math.abs(da) < h.half && P.y < 2) { hurtPlayer(h.dmg, h.x, h.z); }
          h.tick = 0.3;
        }
        if (h.t > h.delay + h.dur) done = true;
      }
    } else if (h.type === 'rock') {
      const k = Math.min(1, h.t / h.delay);
      h.m.position.y = 18 * (1 - k * k) + 0.6;
      h.m.rotation.x += dt * 3;
      if (k >= 1) done = true;
    }
    if (done) {
      for (const m of h.ms) { scene.remove(m); if (h.own && m.material) m.material.dispose(); }
      hazards.splice(i, 1);
    }
  }
}
function startAction(b, type) {
  const st = { type, t: 0, stage: 0 };
  const D = b.dmg;
  if (type === 'slam') { st.sx = b.x; st.sz = b.z; st.tx = clamp(P.x, RAID_C.x - 17, RAID_C.x + 17); st.tz = clamp(P.z, RAID_C.z - 17, RAID_C.z + 17); hzCircle(st.tx, st.tz, 4.5, 1.0, D * 1.3); }
  if (type === 'rocks' || type === 'meteor') {
    const n = type === 'rocks' ? 4 + Math.min(3, b.lvl >> 1) : 6 + Math.min(4, b.lvl >> 1);
    for (let k = 0; k < n; k++) {
      const x = P.x + (k ? rand(-7, 7) : 0), z = P.z + (k ? rand(-7, 7) : 0), dl = 1.3 + k * 0.08;
      hzCircle(x, z, type === 'rocks' ? 2.6 : 3, dl, D);
      hzRock(x, z, dl, type === 'rocks' ? 0x8a7a6a : 0xff5a1f);
    }
  }
  if (type === 'breath') { const a = Math.atan2(-(P.z - b.z), P.x - b.x); hzCone(b.x, b.z, a, 0.5, 13, 1.0, 0.9, D * 0.7); st.face = a; }
  if (type === 'teleport') { st.tx = P.x + rand(-5, 5); st.tz = P.z + rand(-5, 5); }
  b.action = st;
}
function runAction(b, dt) {
  const A = b.action;
  A.t += dt;
  const D = b.dmg, g = b.parts.g;
  switch (A.type) {
    case 'slam': {
      const k = Math.min(1, A.t / 1.0);
      b.x = lerp(A.sx, A.tx, k); b.z = lerp(A.sz, A.tz, k);
      b.y = Math.sin(k * Math.PI) * 7;
      if (k >= 1 && !A.stage) { A.stage = 1; b.y = 0; hzWave(b.x, b.z, 9, 15, D * 0.8); cam.shake = 0.35; tone(70, 0.4, 'sawtooth', 0.07, -30); }
      if (A.t > 1.4) b.action = null;
      break;
    }
    case 'wave': {
      g.scale.y = b.size * (1 - 0.25 * Math.sin(Math.min(1, A.t / 0.7) * Math.PI));
      if (A.t > 0.7 && !A.stage) {
        A.stage = 1; g.scale.y = b.size;
        const n = b.def.id === 'lord' ? 3 : b.def.id === 'golem' || b.lvl >= 4 ? 2 : 1;
        for (let k = 0; k < n; k++) hzWave(b.x, b.z, 8 + k, 20, D, k * 0.65);
        cam.shake = 0.3; tone(60, 0.5, 'sawtooth', 0.07, -20);
      }
      if (A.t > 1.0) b.action = null;
      break;
    }
    case 'rocks': case 'meteor': if (A.t > 0.6) b.action = null; break;
    case 'orbs': {
      const n = 12 + Math.min(10, b.lvl);
      if (A.t > 0.5 && A.stage === 0) { A.stage = 1; for (let k = 0; k < n; k++) { const a = (k / n) * TAU; hzOrb(b.x, 0.9, b.z, Math.cos(a) * 6.5, Math.sin(a) * 6.5, D, b.def.col); } tone(500, 0.2, 'sine', 0.05, 300); }
      if (A.t > 1.2 && A.stage === 1) { A.stage = 2; for (let k = 0; k < n; k++) { const a = ((k + 0.5) / n) * TAU; hzOrb(b.x, 0.9, b.z, Math.cos(a) * 6.5, Math.sin(a) * 6.5, D, b.def.col); } }
      if (A.t > 1.6) b.action = null;
      break;
    }
    case 'breath': {
      b.face = Math.atan2(-Math.cos(A.face), Math.sin(A.face));
      if (A.t > 2.0) b.action = null;
      break;
    }
    case 'teleport': {
      if (A.t < 0.4) g.scale.setScalar(b.size * (1 - A.t / 0.4) + 0.01);
      else if (!A.stage) { A.stage = 1; b.x = clamp(A.tx, RAID_C.x - 16, RAID_C.x + 16); b.z = clamp(A.tz, RAID_C.z - 16, RAID_C.z + 16); hzCircle(b.x, b.z, 5.5, 0.9, D * 1.2); }
      else g.scale.setScalar(Math.min(b.size, b.size * (A.t - 0.4) / 0.4) + 0.01);
      if (A.t > 1.5) { g.scale.setScalar(b.size); b.action = null; }
      break;
    }
    case 'summon': {
      if (!A.stage) {
        A.stage = 1;
        const alive = monsters.filter((m) => m.minion && m.alive).length;
        const n = Math.min(3, 6 - alive);
        const kind = b.def.minion, L = Math.min(7, MONSTERS[kind].lvl + Math.floor(b.lvl / 2));
        const F = { x: RAID_C.x, z: RAID_C.z, r: RAID_C.r, id: 'raid' };
        for (let k = 0; k < n; k++) { const mm = makeMonster(kind, F, { minion: true, lvl: L, hpMul: 0.5 }); const a = Math.random() * TAU; spawnMonster(mm, b.x + Math.cos(a) * 4, b.z + Math.sin(a) * 4); mm.state = 'chase'; }
        burst(b.x, 1, b.z, [b.def.col, 0xffffff], 20, 4, 0.2, 3, 1, 0.8);
      }
      if (A.t > 0.8) b.action = null;
      break;
    }
  }
}
function updateRaid(dt) {
  if (!raid) return;
  const b = raid.boss;
  const left = raid.limit - (nowSec() - raid.t0);
  $('bossHpFill').style.width = (clamp(b.hp / b.hpMax, 0, 1) * 100).toFixed(1) + '%';
  $('bossHpTxt').textContent = fmt(Math.max(0, b.hp)) + ' / ' + fmt(b.hpMax);
  $('bossTime').textContent = Math.max(0, Math.ceil(left)) + '초';
  if (left <= 0) { endRaid(false, '시간 초과'); return; }
  if (P.y < -8) { P.respawn = { x: RAID_C.x, y: 0, z: RAID_C.z - 4 }; hurtPlayer(maxHp() * 0.25); if (raid) respawnAt(P.respawn); }
  if (!b.alive) return;
  b.t += dt;
  const dx = P.x - b.x, dz = P.z - b.z, d = Math.hypot(dx, dz);
  const enraged = b.hp < b.hpMax * 0.4;
  if (b.action) runAction(b, dt);
  else {
    if (d > b.def.keep + b.r) { const s = b.def.speed * (enraged ? 1.25 : 1); b.x += dx / d * s * dt; b.z += dz / d * s * dt; }
    b.face = Math.atan2(-dx, -dz);
    b.y = b.def.model === 'ghost' || b.def.model === 'lord' ? 0.4 + Math.sin(b.t * 2) * 0.25 : b.def.model === 'dragon' ? 0.6 + Math.sin(b.t * 3) * 0.3 : 0;
    b.cd -= dt;
    if (b.cd <= 0) {
      const pats = b.def.pats;
      startAction(b, pats[Math.floor(Math.random() * pats.length)]);
      b.cd = (2.6 - Math.min(0.8, b.lvl * 0.05)) * (enraged ? 0.65 : 1);
    }
  }
  if (!b.action || b.action.type !== 'breath') b.face = Math.atan2(-dx, -dz);
  // 경기장 밖으로 안 나감
  const ox = b.x - RAID_C.x, oz = b.z - RAID_C.z, od = Math.hypot(ox, oz);
  if (od > RAID_C.r - 2) { b.x = RAID_C.x + ox / od * (RAID_C.r - 2); b.z = RAID_C.z + oz / od * (RAID_C.r - 2); }
  // 몸통 접촉
  b.contactCD -= dt;
  if (d < b.r + PR + 0.2 && P.y < b.y + b.size * 1.2 && b.contactCD <= 0) { hurtPlayer(b.dmg * 0.5, b.x, b.z); b.contactCD = 1; }
  // 모델
  const g = b.parts.g;
  g.position.set(b.x, b.y, b.z);
  g.rotation.y = b.face;
  b.flash -= dt;
  b.parts.body.emissive.setRGB(b.flash > 0 ? 0.8 : enraged ? 0.35 : 0, b.flash > 0 ? 0.8 : 0, b.flash > 0 ? 0.8 : 0);
  if (b.def.model === 'slime') b.parts.core.scale.y = 0.65 * (1 - Math.abs(Math.sin(b.t * 3)) * 0.1);
  if (b.def.model === 'dragon') b.parts.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(b.t * 6) * 0.5; });
  if (b.def.model === 'golem') b.parts.wings.forEach((w, i) => { w.rotation.x = Math.sin(b.t * 3 + i * Math.PI) * 0.4; });
  if (b.def.model === 'ghost' || b.def.model === 'lord') b.parts.wings.forEach((o, i) => { const a = b.t * 2 + (i / b.parts.wings.length) * TAU; o.position.set(Math.cos(a) * 0.9, 1.5 + Math.sin(b.t * 3 + i) * 0.2, Math.sin(a) * 0.9); });
}

// ---------- 매 프레임 ----------
let atkHoldT = 0;
function updateCombat(dt) {
  P.atkCD -= dt; P.atkT += dt; P.hurtInv -= dt;
  if (P.downT > 0) P.downT -= dt;
  const mh = maxHp();
  if (P.hp > mh) P.hp = mh;
  if (nowSec() - P.lastHurt > 5) P.hp = Math.min(mh, P.hp + mh * 0.08 * dt);
  if (fountain && Math.hypot(P.x - fountain.x, P.z - fountain.z) < 4 && P.y < 3) P.hp = Math.min(mh, P.hp + mh * 0.5 * dt);
  let hold = keys.has('KeyJ') || atkHeld;
  if (!hold) for (const p of ptrs.values()) if (!p.drag && (p.btn === 0 || p.touch) && performance.now() - p.t > 260) hold = true;
  if (hold && !modalOpen) attack();
  updateMonsters(dt);
  updateRaid(dt);
  updateHazards(dt);
  updateProjectiles(dt);
  // 체력바 UI
  const show = inHunt() || raid || P.hp < mh - 0.5;
  const hb = $('hpBar');
  hb.classList.toggle('hidden', !show);
  if (show) { $('hpFill').style.width = (clamp(P.hp / mh, 0, 1) * 100).toFixed(1) + '%'; $('hpTxt').textContent = fmt(Math.max(0, P.hp)) + ' / ' + fmt(mh); }
  if (!inHunt() && !raid && P.hp < mh) P.hp = mh;
}
let atkHeld = false;

// ---------- 전투 탭 ----------
function renderWarTab(body) {
  const top = el('div', 'card');
  body.appendChild(top);
  shopRefs.push(() => {
    const w = curWeapon();
    top.innerHTML = '<h4>전투</h4><p>허브 남쪽 붉은 문으로 사냥터에 갈 수 있어요. 클릭·J키·공격 버튼으로 공격하고, 근처 적을 자동으로 조준해요. 시프트락을 켜면 조준점 쪽 적을 노려요.</p><div class="kv"><span>장착 무기</span><span>' + w.name + '</span><span>초당 피해</span><span>' + fmt(weaponDps(w)) + '</span><span>최대 체력</span><span>' + fmt(maxHp()) + '</span><span>처치한 몬스터</span><span>' + fmt(S.combat.kills) + '</span><span>레이드 단계 합계</span><span>' + raidTotal() + '</span></div>';
  });
  const ms = row('×', '#ff6b5b');
  ms.btn.onclick = () => { if (buyMastery()) updateShop(); else SFX.err(); };
  body.appendChild(ms.r);
  shopRefs.push(() => { ms.mid.innerHTML = '<div class="nm">전투 숙련 <small>Lv.' + S.combat.mastery + '</small></div><div class="ds">모든 무기 피해 x1.07 (끝없이) · 지금 <b>x' + fmt(Math.pow(1.07, S.combat.mastery), true) + '</b><br>환생 레벨당 피해 +3%</div>'; ms.btn.innerHTML = '강화<br>' + fmt(masteryCost()); ms.btn.disabled = S.coins < masteryCost(); });
  const vt = row('♥', '#ff8fab');
  vt.btn.onclick = () => { if (buyVital()) updateShop(); else SFX.err(); };
  body.appendChild(vt.r);
  shopRefs.push(() => { vt.mid.innerHTML = '<div class="nm">체력 단련 <small>Lv.' + S.combat.vital + '</small></div><div class="ds">최대 체력 x1.1 · 지금 <b>' + fmt(maxHp()) + '</b></div>'; vt.btn.innerHTML = '강화<br>' + fmt(vitalCost()); vt.btn.disabled = S.coins < vitalCost(); });
  body.appendChild(el('div', 'seg', '<span>무기 · 산 무기는 환생해도 유지돼요</span>'));
  for (const w of WEAPONS) {
    const css = '#' + new THREE.Color(w.col).getHexString();
    const { r, mid, btn } = row(w.relic ? '★' : w.kind === 'bow' ? '➶' : w.kind === 'chain' ? 'ϟ' : w.kind === 'homing' ? '◎' : w.kind === 'slam' ? '◉' : '/', css);
    btn.onclick = () => { if (buyWeapon(w)) renderShop(); else SFX.err(); };
    body.appendChild(r);
    shopRefs.push(() => {
      const own = S.combat.owned.includes(w.id), on = S.combat.equip === w.id;
      mid.innerHTML = '<div class="nm">' + w.name + (w.relic ? ' <em>유물</em>' : '') + '</div><div class="ds">' + KIND_TXT[w.kind] + (w.chain ? ' ' + w.chain + '번' : '') + (w.pierce ? ' · 관통' : '') + '<br>공격력 <b>' + fmt(w.dmg) + '</b> · 초당 ' + w.rate + '회 · 사거리 ' + w.range + '<br>초당 피해 <b>' + fmt(weaponDps(w)) + '</b>' + (w.chain ? ' · ' + w.chain + '마리면 합계 ' + fmt(weaponDps(w) * chainSum(w)) : '') + '</div>';
      if (on) { btn.className = 'buy done'; btn.textContent = '장착 중'; btn.disabled = true; }
      else if (own) { btn.className = 'buy alt'; btn.textContent = '장착'; btn.disabled = false; }
      else if (w.relic) { btn.className = 'buy'; btn.innerHTML = bossById(w.relic).name + '<br>처치 보상'; btn.disabled = true; }
      else { btn.className = 'buy'; btn.innerHTML = '구매<br>' + fmt(w.cost); btn.disabled = S.coins < w.cost; }
    });
  }
}
