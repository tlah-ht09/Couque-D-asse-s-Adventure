'use strict';
// =====================================================================
//  게임 로직: 착지 이벤트, 구매, 코스, 트랙, 퀘스트, 저장
// =====================================================================
let dirty = true;
function markDirty() { dirty = true; }
const nowSec = () => performance.now() / 1000;
P.trackOn = null;
P.trackFloor = { tower: 0, daily: 0 };

function onLand(c) {
  if (c.fade && c.fade.st === 0) { c.fade.st = 1; c.fade.t = 0; }
  // 절차 생성 트랙
  if (c.track && c.tfloor != null) {
    const key = c.track.name;
    if (P.trackOn === key && c.tfloor < P.trackFloor[key] && !c.trackFinish) { die(); return; }
    if (c.tcorner != null) trackCorner(c.track, c);
  }
  if (c.dailyStart) dailyStart(c);
  if (c.trackFinish) dailyFinish(c);
  if (c.start) startCourse(c.start, c);
  if (c.cp) setCheckpoint(c);
  if (c.finish) finishCourse(c.finish, c);
  if (c.portal) { goHome(true); return; }
  if (c.towerGate) { enterTower(0); return; }
  if (c.dailyGate) { enterDaily(); return; }
  if (c.towerCont) { continueTower(); return; }
  if (c.huntGate) { enterHunt(); return; }
  if (c.hatchGate) { enterHatch(); return; }
  if (c.castleGate) { enterCastle(); return; }
  if (c.castleBuild) { tryBuyCastle(); return; }
  if (c.castleDoor) { castleDoorTouch(); return; }
  if (c.castleInExit) { exitCastleInterior(); return; }
  if (c.eggPad) { openEgg(c.eggPad - 1); return; }
  if (c.weaponShop) { openShop('war'); return; }
  if (c.bossAltar && !raid) { openRaidMenu(c.bossAltar); return; }
  if (c.pad != null) tryBuyGen(c.pad, true);
  if (c.bridgePad) tryBuyBridge(c.bridgePad);
  if (c.launchPad) {
    if (S.launch) { leaveTracks(); P.respawn = { ...SKY_SPAWN }; launchTo({ x: SKY_POS.x, y: SKY_POS.y + 0.2, z: SKY_POS.z }); }
    else tryBuyLaunch();
  }
  if (c.island) {
    const zid = c.hub ? 0 : c.towerIsland ? 't' : c.dailyIsland ? 'd' : c.huntCamp ? 'h' : c.hatchIsland ? 'p' : c.castleIsland ? 'c' : c.field ? 'f' + c.field : c.raidIsland ? 'r' : c.zone;
    if (zid !== P.zoneShown) {
      if (zid === 0 && P.zoneShown != null) banner('돌아왔어요', '허브 섬', '드로퍼를 늘리고 다음 섬을 열어 보세요', 2200);
      else if (zid === 't') banner('최고 ' + S.tower.best + '층', '끝없는 하늘 탑', '오를수록 보석과 영구 수입이 늘어나요', 2600);
      else if (zid === 'c') banner('성 ' + S.castle.lv + '/8단계', '쿠키성 월드', '코인으로 성을 8단계까지 쌓아요', 2400);
      else if (zid === 'h') banner('회복의 샘 · 무기 상점', '사냥터 캠프', '서쪽은 사냥 들판, 남쪽은 보스 레이드', 2400);
      else if (typeof zid === 'string' && zid[0] === 'f') { const F = FIELDS[+zid.slice(1) - 1], lv = F.kinds.map((k) => MONSTERS[k].lvl); banner('몬스터 Lv.' + Math.min(...lv) + (Math.max(...lv) > Math.min(...lv) ? '~' + Math.max(...lv) : ''), F.name, F.kinds.filter((v, i, a) => a.indexOf(v) === i).map((k) => MONSTERS[k].name).join(' · ') + ' · 금관 쓴 엘리트 몬스터는 보석을 줘요', 2600); }
      else if (zid === 'p') banner('도감 ' + DEX.n + '/' + PETS.length, '펫 부화장', '알 앞 발판을 밟으면 뽑기를 할 수 있어요', 2600);
      else if (zid === 'r' && !raid) banner('레이드 단계 합계 ' + raidTotal(), '보스 레이드', '제단을 밟아 보스를 고르세요', 2400);
      else if (zid === 'd') banner(S.daily.key === dateKey() ? '오늘 기록 ' + fmtTime(S.daily.best) : '오늘 아직 완주 전', '오늘의 도전', '매일 바뀌는 코스 · 연속 ' + dailyStreakNow() + '일', 2600);
      else if (typeof zid === 'number' && zid > 0) {
        const z = zoneById(zid), rec = S.courses[zid];
        banner(rec && rec.clears ? '최고 기록 ' + fmtTime(rec.best || 0) : '첫 완주 보상: 수입 영구 +' + Math.round(z.bonus * 100) + '%', z.name, z.course + ' · 메달 ' + (S.medals[zid] ? MEDAL_NAMES[S.medals[zid] - 1] : '없음'), 2600);
      }
      P.zoneShown = zid;
    }
    if (zid === 0 && (P.course || P.trackOn)) { P.course = null; leaveTracks(); hideTimer(); }
  }
}
function onStand(c, h) {
  P.standT += h;
  if (c.pad != null && P.standT > 0.5) {
    P.padRep = (P.padRep || 0) + h;
    if (P.padRep > 0.28) { P.padRep = 0; tryBuyGen(c.pad, false); }
  }
}

// ---------- 일반 코스 ----------
function startCourse(zid, c) {
  P.course = zid;
  P.courseT0 = nowSec();
  P.respawn = { x: c.x, y: c.top, z: c.z, yaw: cam.yaw };
  P.cpCol = c;
  $('tzone').textContent = zoneById(zid).course;
  $('timer').classList.remove('hidden');
}
function hideTimer() { $('timer').classList.add('hidden'); }
function setCheckpoint(c) {
  if (P.cpCol === c) return;
  P.cpCol = c;
  P.respawn = { x: c.x, y: c.top, z: c.z, yaw: cam.yaw };
  if (c.flag) { c.flag.material.color.set(0x3ee6a5); c.flag.material.emissive.set(0x1a8a5f); }
  SFX.cp();
  burst(c.x, c.top + 1, c.z, [0x3ee6a5, 0xffffff], 18, 4, 0.15, 3, 1, 0.8);
  toast('체크포인트 저장', 'good', 1400);
}
function medalFor(zid, t) { const m = MEDALS[zid]; let r = 0; for (let i = 0; i < 4; i++) if (t <= m[i]) r = i + 1; return r; }
function finishCourse(zid, c) {
  const z = zoneById(zid);
  const rec = S.courses[zid] || (S.courses[zid] = { clears: 0, best: 0 });
  const timed = P.course === zid;
  const first = rec.clears === 0;
  if (!first && !timed) return;
  const time = timed ? nowSec() - P.courseT0 : 0;
  rec.clears++;
  const reward = first ? Math.max(z.reward, totalCps() * 60) : Math.max(z.reward * 0.03, totalCps() * 10);
  earn(reward);
  let newRec = false;
  if (timed && (!rec.best || time < rec.best)) { rec.best = time; newRec = true; }
  let medalLine = '';
  if (timed) {
    const m = medalFor(zid, time), pm = S.medals[zid] || 0;
    if (m > pm) {
      let g = 0;
      for (let i = pm; i < m; i++) g += MEDAL_GEMS[i];
      S.medals[zid] = m;
      const got = earnGems(g);
      medalLine = ' · ' + MEDAL_NAMES[m - 1] + ' 메달! 보석 +' + got;
    } else if (m < 4) medalLine = ' · 다음 메달 ' + MEDAL_NAMES[m] + ' ' + MEDALS[zid][m] + '초';
  }
  P.course = null;
  hideTimer();
  P.respawn = { x: c.x, y: c.top, z: c.z, yaw: cam.yaw };
  SFX.finish();
  burst(c.x, c.top + 2, c.z, [0xffcf3f, 0x3ee6a5, 0xff8fab, 0x5ab8ff, 0xffffff], 70, 9, 0.22, 7, 1, 1.4);
  const line = '+' + fmt(reward) + ' 코인' + (first ? ' · 수입 영구 +' + Math.round(z.bonus * 100) + '%' : '') + medalLine;
  banner(timed ? (newRec ? '새 기록 ' : '기록 ') + fmtTime(time) : '완주', first ? z.course + ' 첫 완주!' : z.course + ' 완주!', line, 4600);
  updateTrophy(zid);
  if (newRec) submitTime();
  afterProgress();
  save();
}
function updateTrophy(zid) {
  const C = courses[zid], rec = S.courses[zid];
  if (!C || !C.trophyLabel) return;
  const m = S.medals[zid] || 0;
  drawLabel(C.trophyLabel, [{ t: zoneById(zid).course + ' 완주 지점', c: '#ffcf3f' }, rec && rec.best ? '최고 ' + fmtTime(rec.best) : rec && rec.clears ? '완주 ' + rec.clears + '회' : '최고 기록 없음', { t: m ? MEDAL_NAMES[m - 1] + ' 메달' : '메달 ' + MEDALS[zid][0] + '초부터', c: m ? MEDAL_CSS[m - 1] : '#b3bfdd', s: 32 }]);
}
function leaveTracks() { P.trackOn = null; if (P.course === 'daily') P.course = null; if (raid) endRaid(false, '레이드를 떠났어요'); }
function goHome(fx) {
  P.course = null;
  leaveTracks();
  hideTimer();
  P.respawn = { ...SPAWN };
  P.cpCol = null;
  if (fx) SFX.cp();
  respawnAt(SPAWN);
}
function toCheckpoint() { respawnAt(P.respawn); }

// ---------- 끝없는 탑 ----------
function enterTower(floor) {
  P.course = null; hideTimer();
  P.trackOn = 'tower';
  P.trackFloor.tower = floor;
  let r;
  if (floor <= 0) r = { x: TOWER_C.x, y: 0, z: TOWER_C.z + 6, yaw: 0 };
  else { const sp = trackSpec(TT, floor); r = { x: sp.end.x, y: sp.end.top, z: sp.end.z, yaw: Math.atan2(-DIRS4[floor % 4][0], -DIRS4[floor % 4][1]) }; }
  P.respawn = { ...r };
  towerWindow(true);
  respawnAt(r);
  SFX.cp();
}
function continueTower() {
  const f = Math.floor(S.tower.best / 10) * 10;
  if (f < 10) { toast('10층에 도달하면 이어하기가 열려요', 'bad'); SFX.err(); return; }
  enterTower(f);
}
function towerWindow(force) {
  if (window.__noWindow) return;
  const cur = P.trackOn === 'tower' ? P.trackFloor.tower : 0;
  const lo = Math.max(1, cur - 2), hi = cur + 4;
  if (!force && TT.lastLo === lo && TT.lastHi === hi) return;
  TT.lastLo = lo; TT.lastHi = hi;
  ensureFloors(TT, lo, hi);
}
function trackCorner(T, c) {
  const k = c.tcorner;
  P.trackOn = T.name;
  const fresh = P.trackFloor[T.name] !== k || P.cpCol !== c;
  P.trackFloor[T.name] = k;
  P.respawn = { x: c.x, y: c.top, z: c.z, yaw: cam.yaw };
  P.cpCol = c;
  if (c.flag) { c.flag.material.color.set(0x3ee6a5); c.flag.material.emissive.set(0x1a8a5f); }
  if (T.name === 'tower') {
    towerWindow(false);
    if (k > S.tower.best) {
      S.tower.best = k;
      const coins = Math.max(150 * k, totalCps() * 15);
      earn(coins);
      const g = earnGems(k % 10 === 0 ? 10 + k / 10 : 1);
      SFX.cp();
      burst(c.x, c.top + 1, c.z, [0xc3a6ff, 0xffffff, 0x7af0ff], k % 10 === 0 ? 60 : 18, 5, 0.16, 4, 1, 1);
      if (k % 10 === 0) { SFX.finish(); banner('새 최고 기록', k + '층 돌파!', '+' + fmt(coins) + ' 코인 · 보석 +' + g + ' · 수입 +' + k + '%', 3600); }
      else toast(k + '층 · +' + fmt(coins) + ' 코인 · 보석 +' + g, 'good', 1800);
      submitTime();
      afterProgress();
    } else if (fresh && k > 0) { SFX.cp(); toast(k + '층 체크포인트', '', 1200); }
  } else if (fresh && k > 0 && !c.trackFinish) { SFX.cp(); toast(k + '구간 체크포인트', 'good', 1200); }
}

// ---------- 오늘의 도전 ----------
function prevDateKey(key) { const [y, m, d] = key.split('-').map(Number); return dateKey(new Date(y, m - 1, d - 1)); }
function dailyStreakNow() { const D = S.daily, k = dateKey(); return D.lastKey === k || D.lastKey === prevDateKey(k) ? D.streak : 0; }
function enterDaily() {
  rebuildDaily();
  P.course = null; hideTimer();
  P.trackOn = 'daily';
  P.trackFloor.daily = 0;
  const r = { x: DAILY_C.x, y: 0, z: DAILY_C.z + 6, yaw: 0 };
  P.respawn = { ...r };
  respawnAt(r);
  SFX.cp();
  updateDailyBoard();
}
function dailyStart(c) {
  P.trackOn = 'daily';
  P.trackFloor.daily = 0;
  P.course = 'daily';
  P.courseT0 = nowSec();
  P.respawn = { x: c.x, y: c.top, z: c.z, yaw: cam.yaw };
  P.cpCol = c;
  $('tzone').textContent = '오늘의 도전';
  $('timer').classList.remove('hidden');
}
function dailyFinish(c) {
  if (P.course !== 'daily') { toast('출발 발판을 밟고 시작해야 기록돼요', 'bad'); return; }
  const time = nowSec() - P.courseT0;
  P.course = null; hideTimer();
  P.respawn = { x: c.x, y: c.top, z: c.z, yaw: cam.yaw };
  const D = S.daily, key = dailyBuildKey;
  SFX.finish();
  burst(c.x, c.top + 2, c.z, [0xffd166, 0xffffff, 0xff8fab, 0x3ee6a5], 70, 9, 0.22, 7, 1, 1.4);
  if (D.key !== key) {
    D.streak = D.lastKey === prevDateKey(key) ? D.streak + 1 : 1;
    D.key = key; D.lastKey = key; D.best = time; D.clears++;
    D.bestStreak = Math.max(D.bestStreak, D.streak);
    const g = earnGems(15 + 2 * Math.min(D.streak, 10));
    const coins = Math.max(5000, totalCps() * 90);
    earn(coins);
    banner('기록 ' + fmtTime(time), '오늘의 도전 완주!', '연속 ' + D.streak + '일 · 보석 +' + g + ' · +' + fmt(coins) + ' 코인', 4600);
  } else if (time < D.best) {
    D.best = time;
    banner('오늘 새 기록', fmtTime(time), '랭킹에 반영했어요', 3200);
  } else banner('기록 ' + fmtTime(time), '오늘의 도전 완주', '오늘 최고 ' + fmtTime(D.best), 3000);
  submitTime();
  updateDailyBoard();
  afterProgress();
  save();
}
function updateDailyBoard() {
  if (!dailyBoard) return;
  const D = S.daily, today = D.key === dateKey();
  const [, m, d] = dateKey().split('-').map(Number);
  drawLabel(dailyBoard, [{ t: '오늘의 도전 · ' + m + '월 ' + d + '일', c: '#ffd166', s: 52 }, { t: today ? '오늘 기록 ' + fmtTime(D.best) : '첫 완주 시 보석 +' + Math.round((15 + 2 * Math.min(dailyStreakNow() + 1, 10)) * gemMult()), s: 34 }, { t: '연속 ' + dailyStreakNow() + '일 · 최장 ' + D.bestStreak + '일', s: 30, c: '#b3bfdd' }]);
}

// ---------- 별 ----------
function collectStar(st) {
  st.taken = true;
  st.mesh.visible = false; st.glow.visible = false;
  if (!S.stars.includes(st.id)) S.stars.push(st.id);
  const reward = Math.max(50, totalCps() * 30);
  earn(reward);
  const g = earnGems(3);
  SFX.star();
  burst(st.x, st.y, st.z, [0xffd23f, 0xffffff, 0xffa800], 30, 6, 0.16, 3, 0.6, 1);
  const sp = worldToScreen(st.x, st.y, st.z);
  if (sp) floatText(sp[0], sp[1], '+' + fmt(reward), 'big');
  toast('별 조각 ' + S.stars.length + '/' + stars.length + ' · 수입 +4% · 보석 +' + g, 'gold');
  afterProgress();
}

// ---------- 채굴 ----------
function mine(sx, sy) {
  const v = clickValue();
  earn(v);
  let jp = 0;
  if (PS.aura.king && Math.random() < 0.02) { jp = totalCps() * 30; earn(jp); SFX.star(); }
  S.clicks++;
  crystalPulse = 1;
  SFX.click();
  burst(rand(-0.5, 0.5), 3.9 + rand(-0.5, 0.5), rand(-0.5, 0.5), [0x9ff3ff, 0xffffff, 0xffcf3f], 6, 5, 0.13, 2.5, 1, 0.6);
  if (sx == null) {
    const p = worldToScreen(0, 5.5, 0);
    const b = $('btnMine').getBoundingClientRect();
    const onScreen = p && p[0] > 0 && p[0] < innerWidth && p[1] > 0 && p[1] < innerHeight && Math.hypot(P.x, P.z) < 40;
    if (onScreen) { sx = p[0]; sy = p[1]; } else { sx = b.left + b.width / 2; sy = b.top - 10; }
  }
  floatText(sx + rand(-14, 14), sy + rand(-6, 6), '+' + fmt(v, true), buffMult('click') > 1 ? 'big' : '');
  if (jp) floatText(sx, sy - 44, '잭팟! +' + fmt(jp), 'big');
  if (crystalLabel && S.clicks >= 25) crystalLabel.sp.visible = false;
}

// ---------- 구매 ----------
function buyGen(i, n = 1) {
  if (!genUnlocked(i) || n < 1) return false;
  const cost = genCost(i, n);
  if (!spend(cost)) return false;
  const before = S.gens[i];
  S.gens[i] += n;
  const D = droppers[i];
  if (before === 0) { D.anim = 0; toast(GENS[i].name + ' 건설 완료!', 'good'); }
  if (milestoneCount(S.gens[i]) > milestoneCount(before)) toast(GENS[i].name + ' Lv.' + S.gens[i] + ' · 생산량 2배!', 'gold');
  SFX.buy();
  burst(D.mx, 3, D.mz, [GENS[i].color, 0xffffff], 16, 4, 0.16, 3, 1, 0.8);
  syncDropper(D, true);
  afterProgress();
  return true;
}
function tryBuyGen(i, enter) {
  if (!genUnlocked(i)) {
    if (enter) { toast(GENS[i - 1].name + '을(를) 먼저 건설해야 해요', 'bad'); SFX.err(); }
    return;
  }
  if (!buyGen(i, 1) && enter) { toast('코인이 부족해요 · 필요 ' + fmt(genCost(i)), 'bad'); SFX.err(); }
}
function buyUpg(u) {
  const l = S.up[u.key];
  if (l >= u.max) return false;
  if (!spend(upgCost(u))) return false;
  S.up[u.key]++;
  SFX.buy();
  toast(u.name + ' Lv.' + S.up[u.key], 'good', 1600);
  if (u.key === 'dbl') banner('새 능력', '더블 점프', '공중에서 점프 버튼을 한 번 더 누르세요', 3000);
  afterProgress();
  return true;
}
function awaken(i) {
  if (S.gens[i] < awkReq(i)) return false;
  if (!spendGems(awkCost(i))) return false;
  S.awk[i]++;
  const D = droppers[i];
  SFX.finish();
  burst(D.mx, 3.5, D.mz, [GENS[i].color, 0xffffff, 0x7af0ff], 50, 7, 0.2, 5, 0.8, 1.2);
  banner('각성 ' + S.awk[i] + '단계', GENS[i].name, '생산량 x3 · 지금 x' + fmt(Math.pow(3, S.awk[i])), 3000);
  D.lastKey = '';
  afterProgress();
  return true;
}
function buyBoost() {
  const now = Date.now();
  if ((S.boostEnd || 0) - now > 3.5 * 3600 * 1000) { toast('부스터는 최대 4시간까지 쌓을 수 있어요', 'bad'); return false; }
  if (!spendGems(25)) return false;
  S.boostEnd = Math.max(now, S.boostEnd || 0) + 30 * 60 * 1000;
  SFX.buy();
  toast('바람의 가호 · 수입 2배 ' + fmtDur((S.boostEnd - now) / 1000), 'gold');
  markDirty();
  return true;
}
function buySkin(kind, item) {
  const sk = S.skin;
  if (!sk.owned.includes(item.id)) {
    if (!spendGems(item.cost)) return false;
    sk.owned.push(item.id);
    SFX.buy();
    toast(item.name + ' 획득!', 'gold');
  }
  sk[kind] = item.id;
  applySkin();
  markDirty();
  save();
  return true;
}
function buyRupg(u) {
  const l = S.rup[u.key] || 0;
  if (l >= u.max) return false;
  const c = u.cost(l);
  if (S.rp < c) return false;
  S.rp -= c;
  S.rup[u.key] = l + 1;
  SFX.buy();
  toast(u.name + ' Lv.' + (l + 1), 'good', 1600);
  afterProgress();
  return true;
}
function buyZone(z) {
  if (S.zones[z.id]) return false;
  if (!spend(zoneCost(z))) return false;
  S.zones[z.id] = true;
  SFX.buy();
  const B = bridges[z.id];
  if (B) { B.anim = 0; syncBridge(z); }
  banner('다리 완공', z.name + ' 개방', z.course + '에 도전해 보세요', 3000);
  afterProgress();
  save();
  return true;
}
function tryBuyBridge(id) {
  const z = zoneById(id);
  if (S.zones[id]) return;
  if (!buyZone(z)) { toast(z.name + ' 다리 비용 ' + fmt(zoneCost(z)) + ' 코인', 'bad'); SFX.err(); }
}
function buyLaunch() {
  const z = ZONES[4];
  if (S.launch) return false;
  if (!spend(zoneCost(z))) return false;
  S.launch = true; S.zones[5] = true;
  SFX.buy();
  syncLaunch();
  banner('발사대 완공', '별빛 섬 개방', '발사대 위에 올라서면 하늘로 날아가요', 3200);
  afterProgress();
  save();
  return true;
}
function tryBuyLaunch() {
  if (!buyLaunch()) { toast('발사대 건설 비용 ' + fmt(zoneCost(ZONES[4])) + ' 코인', 'bad'); SFX.err(); }
}
function doRebirth() {
  const g = rebirthGain();
  if (g < 1) return;
  S.rlv += g; S.rp += g;
  S.rebirths++;
  S.bestRun = Math.max(S.bestRun || 0, S.runEarned);
  S.coins = 0; S.runEarned = 0;
  S.gens = GENS.map(() => 0);
  S.up.click = 0;
  if (!S.rup.keep) { S.up.auto = 0; S.up.gold = 0; }
  if (S.rup.start) { const c = Math.pow(10, S.rup.start + 2); S.coins = c; S.runEarned = 0; }
  for (const D of droppers) syncDropper(D, false);
  goHome(false);
  burst(0, 4, 0, [0xc77dff, 0xffffff, 0x9ff3ff], 80, 10, 0.25, 6, 0.8, 1.6);
  SFX.finish();
  banner('환생 완료', '환생 레벨 +' + g, '환생 포인트 ' + S.rp + ' · 환생 상점에서 쓰세요', 4000);
  afterProgress();
  save();
}

// ---------- 월드 동기화 ----------
function syncDropper(D, animate) {
  const built = S.gens[D.i] > 0;
  if (built && !D.real.visible && animate) D.anim = 0;
  D.real.visible = built;
  D.ghost.visible = !built && genUnlocked(D.i);
  D.col.solid = built;
  if (!built) D.anim = 1;
  D.lastKey = '';
}
function syncBridge(z) {
  const B = bridges[z.id];
  const built = !!S.zones[z.id];
  B.g.visible = built;
  B.deck.solid = built;
  for (const r of B.rails) r.solid = built;
  B.ghost.visible = !built;
  B.pad.solid = !built;
  B.pad.mesh.visible = !built;
  B.padLabel.sp.visible = !built;
  B.sign.sp.visible = built;
  if (built && B.anim >= 1) setBridgeScale(B, 1);
}
function setBridgeScale(B, k) {
  if (B.alongX) B.g.scale.set(Math.max(0.001, k), 1, 1); else B.g.scale.set(1, 1, Math.max(0.001, k));
}
function syncLaunch() {
  drawLabel(launchPad.label, S.launch
    ? [{ t: '별빛 섬 발사대', c: '#ffd166' }, '올라서면 발사!']
    : [{ t: '별빛 섬 발사대', c: '#ffd166' }, { t: '건설 ' + fmt(zoneCost(ZONES[4])) + ' 코인', c: S.coins >= zoneCost(ZONES[4]) ? '#3ee6a5' : '#ff9b8f' }]);
  launchPad.arrows.visible = S.launch;
}
function syncTrackSigns() {
  if (towerSign) drawLabel(towerSign, [{ t: '끝없는 하늘 탑', c: '#c3a6ff' }, { t: '최고 ' + S.tower.best + '층', s: 34 }]);
  if (towerCont) {
    const f = Math.floor(S.tower.best / 10) * 10;
    drawLabel(towerCont, f >= 10 ? [{ t: '이어하기', c: '#7af0ff' }, { t: f + '층부터', s: 36 }] : [{ t: '이어하기', c: '#9aa5c4' }, { t: '10층 도달 시 열림', s: 30, c: '#9aa5c4' }]);
  }
  if (dailySign) drawLabel(dailySign, [{ t: '오늘의 도전', c: '#ffd166' }, { t: S.daily.key === dateKey() ? '오늘 ' + fmtTime(S.daily.best) : '오늘 아직 안 했어요', s: 32 }]);
  updateDailyBoard();
}
function syncAll() {
  for (const D of droppers) syncDropper(D, false);
  for (const z of ZONES) if (z.dir) syncBridge(z);
  syncLaunch();
  refreshCastle();
  for (const st of stars) { st.taken = S.stars.includes(st.id); st.mesh.visible = st.glow.visible = !st.taken; }
  for (const z of ZONES) updateTrophy(z.id);
  if (crystalLabel) crystalLabel.sp.visible = S.clicks < 25;
  muted = !!S.mute;
  refreshSoundIcon();
  applySkin();
  equipWeapon(S.combat.equip);
  refreshAltars(true);
  syncTrackSigns();
  refreshPads(true);
  syncPetModels();
  refreshDexBoard();
  applyGfxSetting();
  markDirty();
}
let lastAffordKey = '';
function refreshPads(force) {
  for (const D of droppers) {
    const i = D.i, gd = GENS[i], lv = S.gens[i], un = genUnlocked(i), cost = genCost(i), ok = un && S.coins >= cost;
    const key = [lv, un, ok, fmt(cost), fmt(genIncome(i) * globalMult(), true), S.awk[i]].join('|');
    if (key !== D.lastKey || force) {
      D.lastKey = key;
      let lines;
      const aw = S.awk[i] ? ' ★' + S.awk[i] : '';
      if (!un) lines = [{ t: gd.name, c: '#9aa5c4' }, { t: '이전 드로퍼 필요', c: '#9aa5c4', s: 34 }];
      else if (lv === 0) lines = [{ t: gd.name + aw, c: gd.css }, { t: '밟아서 건설', s: 32 }, { t: fmt(cost) + ' 코인', c: ok ? '#3ee6a5' : '#ff9b8f', s: 36 }];
      else lines = [{ t: gd.name + ' Lv.' + lv + aw, c: gd.css, s: 40 }, { t: '초당 +' + fmt(genIncome(i) * globalMult(), true), c: '#3ee6a5', s: 32 }, { t: '다음 ' + fmt(cost) + ' 코인', c: ok ? '#ffffff' : '#ff9b8f', s: 32 }];
      drawLabel(D.label, lines);
      D.label.sp.visible = un;
      D.ring.visible = un;
      D.ghost.visible = un && lv === 0;
      D.padMat.color.set(!un ? 0x3b4260 : ok ? 0x3ee6a5 : 0x5c6788);
      D.padMat.emissive.set(ok ? 0x0f7a52 : 0x000000);
    }
  }
  for (const z of ZONES) {
    if (!z.dir) continue;
    const B = bridges[z.id];
    if (S.zones[z.id]) {
      const rec = S.courses[z.id];
      const key = 'b' + (rec ? rec.best + '|' + rec.clears : '') + (S.medals[z.id] || 0);
      if (key !== B.signKey || force) { B.signKey = key; drawLabel(B.sign, [{ t: z.name, c: z.css }, { t: rec && rec.best ? '최고 ' + fmtTime(rec.best) : rec && rec.clears ? '완주함' : '도전!', s: 32 }]); }
      continue;
    }
    const ok = S.coins >= zoneCost(z);
    const key = 'p' + ok;
    if (key !== B.padKey || force) {
      B.padKey = key;
      drawLabel(B.padLabel, [{ t: z.name + ' 다리', c: z.css }, { t: '밟아서 건설', s: 30 }, { t: fmt(zoneCost(z)) + ' 코인', c: ok ? '#3ee6a5' : '#ff9b8f', s: 36 }]);
      B.padMat.color.set(ok ? 0x3ee6a5 : 0x5c6788);
      B.padMat.emissive.set(ok ? 0x0f7a52 : 0x000000);
    }
  }
  if (!S.launch) {
    const ok = S.coins >= zoneCost(ZONES[4]);
    if (('l' + ok) !== lastAffordKey || force) { lastAffordKey = 'l' + ok; syncLaunch(); launchPad.padMat.color.set(ok ? 0x3ee6a5 : 0x5c6788); }
  } else launchPad.padMat.color.set(0xffd166);
}

// ---------- 목표 (정해진 목표 + 끝없는 목표) ----------
const cleared = (id) => !!(S.courses[id] && S.courses[id].clears);
const awkTotal = () => S.awk.reduce((a, b) => a + b, 0);
const rupTotal = () => Object.values(S.rup).reduce((a, b) => a + b, 0);
const QUESTS = [
  { text: '크리스탈을 클릭하거나 채굴 버튼을 눌러 코인 15개 모으기', done: () => S.lifeEarned >= 15, prog: () => S.lifeEarned / 15, r: 10 },
  { text: '초록 발판을 밟아 브론즈 드로퍼 건설하기', done: () => S.gens[0] >= 1, r: 15 },
  { text: '크리스탈 받침대 근처의 별 조각 줍기', done: () => S.stars.includes('h1'), r: 30 },
  { text: '북쪽 다리를 건너 초원 코스 완주하기', done: () => cleared(1), r: 60, s: 20 },
  { text: '초당 수입 20 달성하기', done: () => totalCps() >= 20, prog: () => totalCps() / 20, r: 100 },
  { text: '허브 북서쪽 보라색 문으로 끝없는 하늘 탑 5층 오르기', done: () => S.tower.best >= 5, prog: () => S.tower.best / 5, r: 200, s: 20, g: 5 },
  { text: '용암 섬으로 가는 다리 건설하기 (동쪽)', done: () => !!S.zones[2], r: 150, s: 20 },
  { text: '용암 코스 완주하기', done: () => cleared(2), r: 500, s: 30 },
  { text: '허브 남동쪽 금색 문으로 오늘의 도전 완주하기', done: () => S.daily.clears >= 1, r: 1000, s: 30, g: 5 },
  { text: '아무 코스에서나 메달 1개 따기', done: () => medalCount() >= 1, r: 1000, s: 30 },
  { text: '상점에서 더블 점프 배우기', done: () => S.up.dbl >= 1, r: 1500, s: 30 },
  { text: '황금 별똥별 잡기 (가끔 근처에 떨어져요)', done: () => S.goldCaught >= 1, r: 2000, s: 60, g: 5 },
  { text: '허브 남쪽 붉은 문으로 사냥터에 가서 몬스터 10마리 잡기', done: () => S.combat.kills >= 10, prog: () => S.combat.kills / 10, r: 2000, s: 60, g: 5 },
  { text: '전투 탭(또는 캠프 무기 상점)에서 돌 망치 사기', done: () => S.combat.owned.includes('hammer'), r: 1000, s: 30 },
  { text: '끝없는 하늘 탑 15층 오르기', done: () => S.tower.best >= 15, prog: () => S.tower.best / 15, r: 3000, s: 60, g: 5 },
  { text: '별 조각 8개 모으기', done: () => S.stars.length >= 8, prog: () => S.stars.length / 8, r: 4000, s: 60 },
  { text: '얼음 섬으로 가는 다리 건설하기 (남쪽)', done: () => !!S.zones[3], r: 10000, s: 60 },
  { text: '얼음 코스 완주하기', done: () => cleared(3), r: 30000, s: 60 },
  { text: '보스 레이드 섬에서 킹 슬라임 1단계 쓰러뜨리기', done: () => (S.raid.slime || 0) >= 1, r: 3e4, s: 90, g: 10 },
  { text: '드로퍼 하나를 25레벨로 키우고 보석으로 각성하기', done: () => awkTotal() >= 1, r: 50000, s: 60 },
  { text: '초당 수입 1만 달성하기', done: () => totalCps() >= 1e4, prog: () => totalCps() / 1e4, r: 1e5, s: 60 },
  { text: '한 회차에 1,000만 코인을 벌고 첫 환생하기', done: () => S.rebirths >= 1, prog: () => S.rebirths ? 1 : Math.min(1, S.runEarned / 1e7), r: 1e5, s: 60, g: 10 },
  { text: '환생 상점에서 강화 1번 구매하기', done: () => rupTotal() >= 1, r: 2e5, s: 60 },
  { text: '끝없는 하늘 탑 30층 오르기', done: () => S.tower.best >= 30, prog: () => S.tower.best / 30, r: 5e5, s: 90, g: 10 },
  { text: '구름 탑으로 가는 다리 건설하기 (서쪽)', done: () => !!S.zones[4], r: 1e6, s: 90 },
  { text: '바위 거인 1단계 쓰러뜨리기', done: () => (S.raid.golem || 0) >= 1, r: 2e6, s: 120, g: 10 },
  { text: '구름 탑 꼭대기까지 오르기', done: () => cleared(4), r: 5e6, s: 90 },
  { text: '메달 8개 모으기', done: () => medalCount() >= 8, prog: () => medalCount() / 8, r: 1e7, s: 120, g: 10 },
  { text: '별빛 섬 발사대 건설하기', done: () => S.launch, r: 5e7, s: 120 },
  { text: '유령 여왕 1단계 쓰러뜨리기', done: () => (S.raid.ghost || 0) >= 1, r: 1e8, s: 150, g: 15 },
  { text: '별빛 코스 완주하기 (낮은 중력!)', done: () => cleared(5), r: 2e8, s: 120 },
  { text: '별 조각 24개 모두 모으기', done: () => S.stars.length >= stars.length, prog: () => S.stars.length / stars.length, r: 5e8, s: 300, g: 20 },
  { text: '모든 코스에서 플래티넘 메달 따기', done: () => medalCount() >= 20, prog: () => medalCount() / 20, r: 1e9, s: 300, g: 30 },
];
// 정해진 목표가 끝나면 끝없이 이어지는 목표
function questAt(n) {
  if (n < QUESTS.length) return QUESTS[n];
  const j = n - QUESTS.length, k = Math.floor(j / 5), t = j % 5;
  if (t === 4) { const rl = 6 + 4 * k; return { text: '보스 레이드 단계 합계 ' + rl + ' 달성하기', done: () => raidTotal() >= rl, prog: () => raidTotal() / rl, r: 0, s: 150, g: 10 + k }; }
  if (t === 0) { const f = 40 + 10 * k; return { text: '끝없는 하늘 탑 ' + f + '층 오르기', done: () => S.tower.best >= f, prog: () => S.tower.best / f, r: 0, s: 120, g: 10 + k }; }
  if (t === 1) { const c = 1e6 * Math.pow(10, k); return { text: '초당 수입 ' + fmt(c) + ' 달성하기', done: () => totalCps() >= c, prog: () => Math.log10(Math.max(1, totalCps())) / Math.log10(c), r: 0, s: 120, g: 5 + k }; }
  if (t === 2) { const l = 20 * (k + 1); return { text: '환생 레벨 ' + l + ' 모으기', done: () => S.rlv >= l, prog: () => S.rlv / l, r: 0, s: 120, g: 8 + k }; }
  const a = 3 + 2 * k; return { text: '드로퍼 각성 총 ' + a + '단계 달성하기', done: () => awkTotal() >= a, prog: () => awkTotal() / a, r: 0, s: 120, g: 8 + k };
}
function questReward(q) { return Math.max(q.r, totalCps() * (q.s || 0)); }
function checkQuest() {
  let guard = 0;
  while (questAt(S.quest).done() && guard++ < 30) {
    const q = questAt(S.quest);
    const r = questReward(q);
    earn(r);
    let gtxt = '';
    if (q.g) gtxt = ' · 보석 +' + earnGems(q.g);
    S.quest++;
    SFX.quest();
    toast('목표 달성! +' + fmt(r) + ' 코인' + gtxt, 'good');
    $('quest').classList.add('done');
    setTimeout(() => $('quest').classList.remove('done'), 900);
    markDirty();
  }
}
function renderQuest() {
  const q = questAt(S.quest);
  $('qnum').textContent = S.quest < QUESTS.length ? (S.quest + 1) + '/' + QUESTS.length : '끝없는 목표 ' + (S.quest - QUESTS.length + 1);
  if ($('qtext').textContent !== q.text) $('qtext').textContent = q.text;
  const p = q.prog ? clamp(q.prog(), 0, 1) : q.done() ? 1 : 0;
  $('qbar').style.width = (p * 100).toFixed(1) + '%';
  $('qreward').textContent = '보상 ' + fmt(questReward(q)) + ' 코인' + (q.g ? ' · 보석 ' + Math.round(q.g * gemMult()) : '');
}
function afterProgress() { checkQuest(); checkAch(); markDirty(); }

// ---------- 저장 ----------
let hadLocalSave = false;
let localSavedT = 0; // 시작할 때 불러온 로컬 저장의 시각 (클라우드 저장과 비교용)
let saveWarned = false;
function serialize() { S.t = Date.now(); return JSON.stringify(S); }
function save() {
  try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e) {
    // 시크릿 모드·저장 공간 부족·저장이 막힌 iframe 등: 진행이 날아갈 수 있으니 한 번만 알려 줘요
    if (!saveWarned && !cloud.ready) { saveWarned = true; toast('이 브라우저에선 자동 저장이 안 돼요. 상점 › 설정의 저장 코드를 복사해 두세요', 'bad', 7000); }
  }
  cloudSave();
}
// localStorage엔 만료시간이 없어요. 다만 기기 저장 공간이 모자라면 브라우저가 지울 수 있어서
// "이 사이트 데이터는 지우지 말아 달라"고 요청해 둬요. (거절되거나 미지원이어도 게임은 그대로 저장돼요)
function requestPersist() {
  try {
    const st = navigator.storage;
    if (!st || typeof st.persist !== 'function' || typeof st.persisted !== 'function') return;
    st.persisted().then((ok) => { if (!ok) return st.persist(); }).catch(() => {});
  } catch (e) { /* 미지원 */ }
}
function loadLocal() {
  try { const j = localStorage.getItem(SAVE_KEY); if (j) return JSON.parse(j); } catch (e) { /* 무시 */ }
  return null;
}
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
function applyState(o) {
  const d = defaultState();
  if (!o || typeof o !== 'object') { S = d; return; }
  const v1 = !o.v || o.v < 2;
  S = d;
  for (const k of ['coins', 'runEarned', 'lifeEarned', 'rebirths', 'quest', 'clicks', 'deaths', 'play', 'gems', 'gemsTotal', 'rlv', 'rp', 'goldCaught', 'bestRun', 'boostEnd']) S[k] = num(o[k], 0);
  S.t = num(o.t, Date.now()); S.created = num(o.created, Date.now());
  S.sens = clamp(num(o.sens, 1), 0.3, 3);
  S.gfx = clamp(Math.floor(num(o.gfx, 0)), 0, 2);
  S.gfxLv = clamp(Math.floor(num(o.gfxLv, 0)), 0, 4);
  for (const u of UPGS) S.up[u.key] = Math.min(u.max, Math.floor(num(o.up && o.up[u.key], 0)));
  for (const u of RUPGS) S.rup[u.key] = Math.min(u.max, Math.floor(num(o.rup && o.rup[u.key], 0)));
  S.gens = GENS.map((_, i) => Math.floor(num(o.gens && o.gens[i], 0)));
  S.awk = GENS.map((_, i) => Math.floor(num(o.awk && o.awk[i], 0)));
  S.zones = { 1: true };
  if (o.zones) for (const z of ZONES) if (o.zones[z.id]) S.zones[z.id] = true;
  S.launch = !!o.launch;
  if (o.courses) for (const z of ZONES) { const r = o.courses[z.id]; if (r) S.courses[z.id] = { clears: Math.floor(num(r.clears)), best: num(r.best) }; }
  if (o.medals) for (const z of ZONES) S.medals[z.id] = Math.min(4, Math.floor(num(o.medals[z.id])));
  if (o.tower) S.tower.best = Math.floor(num(o.tower.best));
  if (o.daily) {
    const D = o.daily;
    S.daily = { key: typeof D.key === 'string' ? D.key : '', best: num(D.best), streak: Math.floor(num(D.streak)), lastKey: typeof D.lastKey === 'string' ? D.lastKey : '', bestStreak: Math.floor(num(D.bestStreak)), clears: Math.floor(num(D.clears)) };
  }
  if (o.ach) for (const a of ACH) S.ach[a.key] = Math.floor(num(o.ach[a.key]));
  if (o.combat && typeof o.combat === 'object') {
    const C = o.combat;
    S.combat.owned = [...new Set(['stick', ...(Array.isArray(C.owned) ? C.owned.filter((id) => WEAPONS.some((w) => w.id === id)) : [])])];
    S.combat.equip = S.combat.owned.includes(C.equip) ? C.equip : 'stick';
    for (const k of ['mastery', 'vital', 'kills', 'bossKills']) S.combat[k] = Math.floor(num(C[k]));
  }
  if (o.castle && typeof o.castle === 'object') {
    const K = o.castle;
    S.castle = { lv: clamp(Math.floor(num(K.lv)), 0, 8) }; // 옛 저장의 다른 필드는 무시
  }
  if (o.raid) for (const b of BOSSES) S.raid[b.id] = Math.floor(num(o.raid[b.id]));
  if (o.skin && typeof o.skin === 'object') {
    const owned = Array.isArray(o.skin.owned) ? o.skin.owned.filter((x) => typeof x === 'string') : [];
    S.skin.owned = [...new Set(['blue', 'cap', 'none', ...owned])];
    for (const [k, list] of [['shirt', SHIRTS], ['hat', HATS], ['trail', TRAILS]]) if (list.some((x) => x.id === o.skin[k]) && S.skin.owned.includes(o.skin[k])) S.skin[k] = o.skin[k];
  }
  S.stars = Array.isArray(o.stars) ? o.stars.filter((id) => stars.some((s) => s.id === id)) : [];
  S.quest = Math.floor(S.quest);
  S.mute = !!o.mute; S.welcomed = !!o.welcomed;
  S.seenV2 = !!o.seenV2;
  S.seenV3 = !!o.seenV3;
  S.seenV4 = !!o.seenV4;
  S.seenV5 = !!o.seenV5;
  S.seenCastle = !!o.seenCastle;
  if (o.pets && typeof o.pets === 'object') {
    const Q = o.pets;
    if (Q.inv && typeof Q.inv === 'object') for (const p of PETS) { const a = Q.inv[p.id]; if (Array.isArray(a)) { const c = [0, 1, 2].map((k) => Math.floor(num(a[k]))); if (c[0] + c[1] + c[2] > 0) S.pets.inv[p.id] = c; } }
    if (Q.dex && typeof Q.dex === 'object') for (const p of PETS) { const d = Math.floor(num(Q.dex[p.id])) & 7; if (d) S.pets.dex[p.id] = d | 1; }
    for (const p of PETS) if (S.pets.inv[p.id]) { const c = S.pets.inv[p.id]; S.pets.dex[p.id] = (S.pets.dex[p.id] || 0) | 1 | (c[1] ? 2 : 0) | (c[2] ? 4 : 0); }
    S.pets.hatched = Math.floor(num(Q.hatched));
    S.pets.msN = Q.msN != null ? Math.floor(num(Q.msN)) : (DEX_MS_V1[Math.min(DEX_MS_V1.length, Math.floor(num(Q.ms))) - 1] || 0);
    refreshPets();
    if (Array.isArray(Q.eq)) for (const e of Q.eq) {
      if (!Array.isArray(e) || S.pets.eq.length >= petSlots()) continue;
      const id = e[0], v = Math.floor(num(e[1]));
      if (petById(id) && v <= 2 && petCount(id, v) - petEquipped(id, v) > 0) S.pets.eq.push([id, v]);
    }
  }
  refreshPets();
  if (v1) {
    // 1.0 저장 이전: 환생 토큰 → 환생 레벨/포인트, 기존 진행에 맞춰 보석 지급
    const tok = Math.floor(num(o.tokens, 0));
    S.rlv = tok; S.rp = tok;
    S.gems = S.stars.length * 3 + Object.keys(S.courses).length * 10;
    S.gemsTotal = S.gems;
    S.quest = 0;
  }
}
function exportCode() { try { return btoa(unescape(encodeURIComponent(serialize()))); } catch (e) { return ''; } }
function importCode(code) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!o || typeof o !== 'object' || !Array.isArray(o.gens)) return false;
    applyState(o);
    syncAll();
    goHome(false);
    save();
    return true;
  } catch (e) { return false; }
}
function resetGame() {
  applyState(defaultState());
  S.welcomed = true;
  syncAll();
  goHome(false);
  save();
}
