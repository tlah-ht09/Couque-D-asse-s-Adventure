'use strict';
// =====================================================================
//  입력 처리
// =====================================================================
const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
function tryClickCrystal(sx, sy) {
  _ndc.set((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  if (!mapGroups.main.visible) return false; // 다른 맵에선 허브 크리스탈을 클릭할 수 없어요
  const hit = raycaster.intersectObject(crystalHit, false);
  if (hit.length) { mine(sx, sy); return true; }
  return false;
}

function anyUIOpen() { return shopOpen || modalOpen || hatchOpen; }
addEventListener('keydown', (e) => {
  ensureAudio();
  if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
  if (hatchOpen && !modalOpen) {
    if (e.code === 'Escape') closeHatch();
    else if (!e.repeat && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE')) { e.preventDefault(); if (hatchBusy) finishHatch(false); else doHatch(); }
    return;
  }
  if (modalOpen) { if (e.code === 'Escape') hideModal(); return; }
  if (e.code === 'Escape' && shopOpen) { closeShop(); return; }
  if (e.code === 'KeyB') { e.preventDefault(); shopOpen ? closeShop() : openShop(); return; }
  if (e.code === 'KeyP') { e.preventDefault(); togglePetPanel(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) { if (e.code !== 'Space') keys.add(e.code); return; }
  keys.add(e.code);
  if (e.code === 'Space') { P.jumpBuf = 0.14; P.jumpHeld = true; }
  if (e.code === 'KeyF' || e.code === 'KeyE') mine();
  if (e.code === 'KeyH') goHome(true);
  if (e.code === 'KeyR') toCheckpoint();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'ShiftRight') toggleShiftLock();
  if (e.code === 'ShiftLeft' && inJumpMap()) runBlockedNotice();
});
addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'Space') P.jumpHeld = false;
});
addEventListener('blur', () => { keys.clear(); P.jumpHeld = false; joy.active = false; });

// 포인터 (마우스 + 터치)
const ptrs = new Map();
canvas.addEventListener('pointerdown', (e) => {
  ensureAudio();
  canvas.focus();
  if (e.pointerType === 'touch' && !document.body.classList.contains('touch')) document.body.classList.add('touch');
  if (shiftLock && e.pointerType === 'mouse' && !plocked()) syncPointerLock(); // 고정이 풀려 있으면 클릭할 때 다시 고정
  const isJoy = e.pointerType === 'touch' && e.clientX < innerWidth * 0.42 && e.clientY > innerHeight * 0.35 && joy.id == null;
  if (isJoy) {
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.active = true; joy.x = joy.y = 0;
    const base = $('joyBase');
    base.style.left = (e.clientX - 65) + 'px'; base.style.top = (e.clientY - 65) + 'px'; base.style.bottom = 'auto';
    base.style.opacity = 1;
  } else {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, drag: false, btn: e.button, t: performance.now(), touch: e.pointerType === 'touch' });
  }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy), R = 55;
    if (d > R) { dx *= R / d; dy *= R / d; }
    joy.x = dx / R; joy.y = dy / R;
    $('joyKnob').style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    return;
  }
  if (shiftLock && e.pointerType === 'mouse') {
    // 시프트락: 드래그 없이 마우스를 움직이기만 해도 시점이 돌아가요 (클릭은 그대로 공격)
    if (plSkip > 0) { plSkip--; return; } // 고정이 걸리거나 풀린 직후 첫 움직임은 크게 튀는 브라우저가 있어 버려요
    const k = 0.0032 * S.sens, mx = clamp(e.movementX || 0, -250, 250), my = clamp(e.movementY || 0, -250, 250);
    cam.yaw -= mx * k;
    cam.pitch = clamp(cam.pitch + my * k * 0.8, -0.15, 1.25);
    return;
  }
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (!p.drag && Math.hypot(p.x - p.sx, p.y - p.sy) > 6) p.drag = true;
  if (p.drag) {
    const k = (e.pointerType === 'touch' ? 0.0065 : 0.005) * S.sens;
    cam.yaw -= dx * k;
    cam.pitch = clamp(cam.pitch + dy * k * 0.8, -0.15, 1.25);
  }
});
function endPtr(e) {
  if (e.pointerId === joy.id) {
    joy.id = null; joy.active = false; joy.x = joy.y = 0;
    $('joyKnob').style.transform = '';
    const base = $('joyBase');
    base.style.left = ''; base.style.top = ''; base.style.bottom = ''; base.style.opacity = '';
    return;
  }
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  ptrs.delete(e.pointerId);
  if (!p.drag && e.type === 'pointerup' && (p.btn === 0 || e.pointerType === 'touch')) {
    const lk = plocked(), sx = lk ? innerWidth / 2 : e.clientX, sy = lk ? innerHeight / 2 : e.clientY; // 마우스가 고정돼 있으면 조준점 기준
    if (!tryClickCrystal(sx, sy)) attack();
  }
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.distT = clamp(cam.distT * (1 + Math.sign(e.deltaY) * 0.1), 4, 22);
}, { passive: false });

// ---------- 시프트락 ----------
function plocked() { return document.pointerLockElement === canvas; }
function useMouseLock() { return !document.body.classList.contains('touch') && typeof canvas.requestPointerLock === 'function'; }
// 시프트락이 켜져 있고 상점·창이 닫혀 있을 때만 마우스를 고정해요
function syncPointerLock() {
  const want = shiftLock && !anyUIOpen() && useMouseLock();
  if (want && !plocked()) {
    try { const r = canvas.requestPointerLock(); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch (e) { /* 고정 불가: 커서가 보이는 채로 시프트락 유지 */ }
  } else if (!want && plocked()) {
    plSelfExit = true;
    document.exitPointerLock();
  }
}
function setShiftLock(on, quiet) {
  on = !!on;
  if (on === shiftLock) return;
  shiftLock = on;
  document.body.classList.toggle('sl', on);
  const b = $('btnSL');
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  syncPointerLock();
  if (!quiet) {
    const touch = document.body.classList.contains('touch');
    toast(on ? (touch ? '시프트락 켜짐 · 캐릭터가 화면 방향을 봐요' : '시프트락 켜짐 · 마우스로 시점, 클릭으로 공격 · 오른쪽 Shift로 끄기') : '시프트락 꺼짐');
    tone(on ? 660 : 440, 0.07, 'triangle', 0.04);
  }
}
function toggleShiftLock() { setShiftLock(!shiftLock); }
document.addEventListener('pointerlockchange', () => {
  const on = plocked();
  document.body.classList.toggle('plock', on);
  plSkip = 2;
  if (on) return;
  if (plSelfExit) { plSelfExit = false; return; }
  // Esc로 직접 풀었으면 시프트락도 꺼요. 다른 창으로 나가서 풀린 거면 켜 둔 채로, 다음 클릭에 다시 고정
  if (shiftLock && !anyUIOpen() && document.hasFocus() && document.visibilityState === 'visible') setShiftLock(false);
});
document.addEventListener('pointerlockerror', () => { plSelfExit = false; });

// 버튼
function pressable(id, down, up) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); ensureAudio(); b.classList.add('press'); down && down(e); try { b.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ } });
  const end = (e) => { b.classList.remove('press'); up && up(e); };
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('click', (e) => { if (e.detail === 0 && down) { down(e); up && up(e); } });
}
pressable('btnMine', (e) => mine(e.clientX || null, e.clientY || null));
pressable('btnAtk', () => { atkHeld = true; attack(); }, () => { atkHeld = false; });
pressable('btnJump', () => { P.jumpBuf = 0.14; P.jumpHeld = true; }, () => { P.jumpHeld = false; });
pressable('btnSL', () => toggleShiftLock());
pressable('btnRun', () => toggleRunTouch());
$('btnShop').onclick = () => { ensureAudio(); shopOpen ? closeShop() : openShop(); };
$('btnDex').onclick = () => { ensureAudio(); togglePetPanel(); };
$('btnHome').onclick = () => { ensureAudio(); goHome(true); };
$('btnCp').onclick = () => { ensureAudio(); toCheckpoint(); };
$('btnSound').onclick = () => { ensureAudio(); toggleMute(); };
$('btnFb').onclick = () => { ensureAudio(); openFeedback(); };
$('shopClose').onclick = closeShop;
$('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) hideModal(); });

// =====================================================================
//  클라우드 저장 + 랭킹 (claude.ai에서 열었을 때만)
// =====================================================================
const cloud = { db: null, user: null, uid: null, ready: false, writing: false, lastJson: '', board: null, boardErr: false, names: {}, readOnly: false };
async function initCloud() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    cloud.db = db; cloud.user = user; cloud.uid = uid;
    const ref = db.doc('data/users/' + uid + '/save');
    const snap = await Promise.race([ref.get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
    if (snap && snap.exists) {
      const d = snap.data();
      if (d && typeof d.json === 'string' && (!hadLocalSave || num(d.t) > localSavedT + 3000)) {
        try {
          applyState(JSON.parse(d.json));
          syncAll();
          goHome(false);
          toast('다른 기기에서 저장한 진행을 불러왔어요', 'good');
          // 로컬 기준으로 띄운 방치 수익 창은 덮어쓰고, 클라우드 저장 시각 기준으로 다시 계산
          if (modalOpen && $('mTitle').textContent === OFFLINE_TITLE) hideModal();
          grantOffline((Date.now() - num(d.t, Date.now())) / 1000);
        } catch (e) { /* 손상된 저장 무시 */ }
      }
    }
    cloud.ready = true;
    subscribeBoard();
    cloudSave();
  } catch (e) { /* 클라우드 없이 진행 */ }
}
async function cloudSave() {
  if (!cloud.ready || cloud.writing || cloud.readOnly) return;
  const json = JSON.stringify(Object.assign({}, S, { t: 0 }));
  if (json === cloud.lastJson) return;
  if (cloud.lastWrite && performance.now() - cloud.lastWrite < 60000 && document.visibilityState !== 'hidden') return;
  cloud.writing = true;
  cloud.lastWrite = performance.now();
  try {
    await cloud.db.doc('data/users/' + cloud.uid + '/save').set({ json: serialize(), t: Date.now() });
    cloud.lastJson = json;
  } catch (e) {
    if (e && e.code === 'invalid_argument') cloud.readOnly = true;
  }
  cloud.writing = false;
}
function subscribeBoard() {
  try {
    cloud.db.collection('times').limit(300).onSnapshot((snap) => {
      cloud.board = snap.docs.map((d) => { const o = d.data() || {}; return { id: d.id, b: o.b || {}, f: Number(o.f) || 0, rl: Number(o.rl) || 0, d: o.d && typeof o.d === 'object' ? o.d : null }; });
      cloud.boardErr = false;
      resolveNames();
      if (shopOpen && shopTab === 'rank') renderShop();
    }, () => { cloud.boardErr = true; });
  } catch (e) { cloud.boardErr = true; }
}
async function resolveNames() {
  if (!cloud.user || !cloud.board) return;
  try {
    const ids = cloud.board.map((r) => r.id).filter((id) => !(id in cloud.names));
    if (!ids.length) return;
    const ps = await cloud.user.profiles(ids);
    for (const id of ids) cloud.names[id] = (ps && ps[id] && ps[id].name) || '';
    if (shopOpen && shopTab === 'rank') renderShop();
  } catch (e) { /* 이름 없이 표시 */ }
}
let boardWriting = false;
async function submitTime() {
  if (!cloud.ready || boardWriting || cloud.boardRO) return;
  boardWriting = true;
  try {
    const b = {};
    for (const z of ZONES) { const r = S.courses[z.id]; if (r && r.best) b[z.id] = Math.round(r.best * 100) / 100; }
    const body = { b, f: S.tower.best, rl: raidTotal(), t: Date.now() };
    if (S.daily.key && S.daily.best) body.d = { k: S.daily.key, t: Math.round(S.daily.best * 100) / 100 };
    await cloud.db.doc('times/' + cloud.uid).set(body);
  } catch (e) { if (e && e.code === 'invalid_argument') cloud.boardRO = true; }
  boardWriting = false;
}
function rankCard(title, color, rows, fmtv, emptyText) {
  let html = '<h4 style="color:' + color + '">' + title + '</h4>';
  if (rows.length) {
    html += '<div class="lb">';
    rows.forEach((r, i) => {
      const me = r.id === cloud.uid;
      const nm = esc(cloud.names[r.id] || (me ? '나' : '플레이어'));
      html += '<span>' + (i + 1) + '</span><span class="' + (me ? 'me' : '') + '">' + nm + (me ? ' (나)' : '') + '</span><span>' + fmtv(r.v) + '</span>';
    });
    html += '</div>';
  } else html += '<p>' + emptyText + '</p>';
  return el('div', 'card', html);
}
function renderRank(body) {
  body.appendChild(el('div', 'card', '<h4>랭킹</h4><p>이 게임을 함께 연 사람들의 기록이에요. 코스는 시작 발판부터 완주해야 기록이 남아요.</p>'));
  if (!cloud.board) {
    const mine = ['끝없는 하늘 탑 최고 ' + S.tower.best + '층', '보스 레이드 단계 합계 ' + raidTotal(), '오늘의 도전 ' + (S.daily.key === dateKey() ? fmtTime(S.daily.best) : '기록 없음')];
    for (const z of ZONES) { const r = S.courses[z.id]; mine.push(z.course + ' ' + (r && r.best ? fmtTime(r.best) : '기록 없음')); }
    body.appendChild(el('div', 'card', '<h4>내 기록</h4><p>' + mine.join('<br>') + '</p>'));
    body.appendChild(el('div', 'card', '<p>' + (cloud.boardErr ? '랭킹을 불러오지 못했어요. 잠시 후 다시 열어 보세요.' : 'claude.ai에서 이 게임을 열면 다른 사람들과 기록을 비교할 수 있어요.') + '</p>'));
    return;
  }
  const B = cloud.board;
  const tower = B.map((r) => ({ id: r.id, v: r.f })).filter((r) => r.v > 0 && r.v < 1e6).sort((a, b) => b.v - a.v).slice(0, 10);
  body.appendChild(rankCard('끝없는 하늘 탑 · 최고 층', '#c3a6ff', tower, (v) => v + '층', '아직 기록이 없어요.'));
  const rr = B.map((r) => ({ id: r.id, v: r.rl })).filter((r) => r.v > 0 && r.v < 1e5).sort((a, b) => b.v - a.v).slice(0, 10);
  body.appendChild(rankCard('보스 레이드 · 단계 합계', '#ff9b8f', rr, (v) => v + '단계', '아직 기록이 없어요.'));
  const today = dateKey();
  const daily = B.map((r) => ({ id: r.id, v: r.d && r.d.k === today ? Number(r.d.t) : NaN })).filter((r) => isFinite(r.v) && r.v > 1 && r.v < 36000).sort((a, b) => a.v - b.v).slice(0, 10);
  body.appendChild(rankCard('오늘의 도전 · ' + today, '#ffd166', daily, fmtTime, '오늘 첫 기록의 주인공이 되어 보세요.'));
  for (const z of ZONES) {
    const rows = B.map((r) => ({ id: r.id, v: Number(r.b[z.id]) })).filter((r) => isFinite(r.v) && r.v > 1 && r.v < 36000).sort((a, b) => a.v - b.v).slice(0, 10);
    body.appendChild(rankCard(z.course, z.css, rows, fmtTime, '아직 기록이 없어요.'));
  }
}

// =====================================================================
//  매 프레임 갱신 (연출)
// =====================================================================
let dropT = 0, autoAcc = 0, saveT = 0, padT = 0, questT = 0, mmT = 0, trackT = 0;
const _white = new THREE.Color(0xffffff);
function spawnCube(D) {
  const idx = cubes.findIndex((c) => !c.on);
  if (idx < 0) return;
  const c = cubes[idx];
  Object.assign(c, { on: true, D, ph: 0, t: 0, x: D.mx, y: 1.2, z: D.mz, r: 11.8 });
  cubeMesh.setColorAt(idx, _col.set(GENS[D.i].color).lerp(_white, 0.65));
  cubeMesh.instanceColor.needsUpdate = true;
}
function updateCubes(dt) {
  for (let i = 0; i < CUBE_MAX; i++) {
    const c = cubes[i];
    if (!c.on) continue;
    c.t += dt;
    let s = 0.42;
    if (c.ph === 0) {
      c.y -= dt * 7;
      if (c.y <= 0.52) { c.y = 0.52; c.ph = 1; }
    } else if (c.ph === 1) {
      c.r -= dt * 2.8;
      c.x = c.D.ca * c.r; c.z = c.D.sa * c.r;
      if (c.r <= 3.9) { c.ph = 2; c.t = 0; c.sx = c.x; c.sz = c.z; }
    } else {
      const k = Math.min(1, c.t / 0.45);
      const e = k * k;
      c.x = lerp(c.sx, 0, e); c.z = lerp(c.sz, 0, e); c.y = lerp(0.52, 3.9, Math.sin(k * Math.PI / 2));
      s = 0.42 * (1 - k * 0.8);
      if (k >= 1) { c.on = false; crystalPulse = Math.max(crystalPulse, 0.35); }
    }
    _dummy.position.set(c.x, c.y, c.z);
    _dummy.rotation.set(c.t * 2, c.t * 3, 0);
    _dummy.scale.setScalar(c.on ? s : 0);
    _dummy.updateMatrix();
    cubeMesh.setMatrixAt(i, _dummy.matrix);
  }
  cubeMesh.instanceMatrix.needsUpdate = true;
}
function updateWorldFx(dt) {
  const t = gameTime;
  // 크리스탈
  crystalPulse = Math.max(0, crystalPulse - dt * 4);
  crystal.position.y = 3.9 + Math.sin(t * 1.6) * 0.18;
  crystalCore.rotation.y += dt * 0.8;
  crystalRing.rotation.z += dt * 0.6;
  const sc = 1 + crystalPulse * 0.18;
  crystalCore.scale.set(1.5 * sc, 2.3 * sc, 1.5 * sc);
  crystalMat.emissiveIntensity = 0.75 + crystalPulse * 0.9;
  crystalLight.intensity = mapGroups.main.visible ? 18 + crystalPulse * 30 : 0;
  // 드로퍼
  dropT += dt;
  for (const D of droppers) {
    D.gem.rotation.y += dt * 1.5;
    if (D.anim < 1) {
      D.anim = Math.min(1, D.anim + dt * 1.6);
      const k = D.anim, e = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
      D.real.scale.setScalar(Math.max(0.01, e));
    } else D.real.scale.setScalar(1);
    const lv = S.gens[D.i];
    if (lv > 0) {
      D.timer -= dt;
      if (D.timer <= 0) {
        D.timer = clamp(2.4 / (1 + Math.log2(lv)), 0.45, 2.4);
        if (Math.hypot(P.x, P.z) < 90 && P.y < 60) spawnCube(D);
      }
    }
  }
  updateCubes(dt);
  beltTex.offset.x -= dt * 0.35;
  // 안내 화살표 (첫 드로퍼)
  if (S.gens[0] === 0 && S.coins >= GENS[0].cost) {
    const D = droppers[0], pr = 15.6;
    guideArrow.visible = true;
    guideArrow.position.set(D.ca * pr, 3.3 + Math.sin(t * 5) * 0.35, D.sa * pr);
    guideArrow.rotation.y += dt * 3;
  } else guideArrow.visible = false;
  // 다리 애니메이션
  for (const z of ZONES) {
    if (!z.dir) continue;
    const B = bridges[z.id];
    if (B.anim < 1 && S.zones[z.id]) { B.anim = Math.min(1, B.anim + dt * 0.9); setBridgeScale(B, 1 - Math.pow(1 - B.anim, 3)); }
  }
  // 별
  for (const st of stars) {
    if (st.taken) continue;
    st.mesh.rotation.y += dt * 2;
    st.mesh.position.y = st.y + Math.sin(t * 2 + st.ph) * 0.15;
  }
  // 포털
  for (const p of portals) { p.ring.rotation.z += dt * 1.5; p.disc.material.opacity = 0.3 + Math.sin(t * 3) * 0.1; }
  // 발사대
  if (launchPad.arrows.visible) launchPad.arrows.children.forEach((a, i) => { a.position.y = a.userData.base + ((t * 1.5 + i * 0.33) % 1) * 0.8; });
  // 구름
  for (const c of clouds) { c.position.x += c.userData.v * dt; if (c.position.x > 340) c.position.x = -340; }
  // 장식
  for (const s of spinners) {
    if (s.kind === 'lava') s.m.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.2;
    else if (s.kind === 'bubble') { s.m.position.y = -5 + Math.abs(Math.sin(t * 1.3 + s.ph)) * 0.8; }
    else if (s.kind === 'smoke' && Math.random() < dt * 3) burst(s.x, s.y, s.z, [0xff8f3f, 0x6b5560], 1, 0.6, 0.35, 2, -0.05, 2);
  }
}

// =====================================================================
//  방치 수익 (게임을 끈 동안 · 다른 탭/앱에 있던 동안 · 기기가 잠든 동안 모두 같은 규칙)
// =====================================================================
const AWAY_MIN = 60; // 이보다 짧게 비우면 메인 루프가 실시간으로 계산
const OFFLINE_TITLE = '돌아온 걸 환영해요';
function grantOffline(away) {
  if (!(away > AWAY_MIN)) return 0;
  const capped = Math.min(away, offlineCap());
  const gain = offlineCps() * capped * offlineEff();
  if (!(gain >= 1)) return 0;
  earn(gain);
  markDirty();
  if (modalOpen) { toast('자리 비운 동안 +' + fmt(gain) + ' 코인', 'good', 4000); return gain; }
  const h = Math.floor(capped / 3600), m = Math.floor((capped % 3600) / 60);
  showModal(OFFLINE_TITLE, '<p>' + (h ? h + '시간 ' : '') + m + '분 동안 드로퍼가 일했어요.</p><p class="hl" style="font-size:28px;margin:6px 0 10px">+' + fmt(gain) + ' 코인</p><p>방치 효율 ' + Math.round(offlineEff() * 100) + '% · 최대 ' + (offlineCap() / 3600) + '시간까지 쌓여요. 상점의 방치 효율 강화로 늘릴 수 있어요.</p>', [{ t: '받기', primary: true }]);
  return gain;
}

// =====================================================================
//  메인 루프
// =====================================================================
let last = performance.now(), acc = 0, lastWall = Date.now();
const STEP = 1 / 120;
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = Math.min(Math.max(0, (now - last) / 1000), AWAY_MIN);
  last = now;
  // 탭이 숨겨졌거나 기기가 잠들어 루프가 멈춰 있었다면 그 시간은 방치 수익으로 정산
  // (performance.now()는 절전 중에 멈출 수 있어서 실제 시각으로 재요)
  const wall = Date.now(), awayWall = (wall - lastWall) / 1000;
  lastWall = wall;
  if (awayWall > AWAY_MIN) { grantOffline(awayWall); rdt = 0; }
  // 경제 (실제 경과 시간 기준)
  earn(baseCps() * rdt);
  autoAcc += autoRate() * rdt;
  if (autoAcc >= 1) {
    const n = Math.floor(autoAcc);
    autoAcc -= n;
    earn(clickValue() * n);
    crystalPulse = Math.max(crystalPulse, 0.5);
  }
  S.play += rdt;
  const dt = Math.min(rdt, 0.05);
  // 물리 (고정 스텝)
  const frozen = hitStop > 0;
  if (frozen) hitStop -= rdt;
  if (!modalOpen && !hatchOpen && !frozen) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 8) { physicsStep(STEP); acc -= STEP; n++; }
    if (n >= 8) acc = 0;
  }
  updateAvatar(dt);
  updateCamera(dt);
  updateWorldFx(dt);
  if (!modalOpen && !hatchOpen && !frozen) updateCombat(dt);
  if (!window.__fxFreeze) updateFx(dt);
  updateGold(dt);
  updateTrail(dt);
  updateRunFx(dt);
  updatePets(dt);
  updateParticles(dt);
  // 주기 작업
  padT -= rdt; if (padT <= 0) { padT = 0.4; refreshPads(false); }
  questT -= rdt; if (questT <= 0) { questT = 0.5; checkQuest(); }
  mmT -= rdt; if (mmT <= 0) { mmT = 1 / 20; drawMinimap(); }
  saveT -= rdt; if (saveT <= 0) { saveT = 6; save(); }
  trackT -= rdt; if (trackT <= 0) { trackT = 1; towerWindow(false); checkAch(); if (dateKey() !== dailyBuildKey && P.trackOn !== 'daily') { rebuildDaily(); syncTrackSigns(); } }
  updateHUD(rdt);
  updateMapVisibility();
  renderer.render(scene, camera);
  gfxTick(now);
}

// =====================================================================
//  피드백 (일반 웹: 개발자 메일로 바로 전송 · claude.ai: 게임 저장소에 보관 · 실패하면 보관했다가 자동 재전송)
// =====================================================================
const GAME_NAME = '쿠크다스의 모험';
const GAME_VER = 'v1.5';
// ↓ 피드백을 받을 메일 주소를 따옴표 안에 넣으세요. 비워 두면 메일 전송은 건너뛰어요.
const FB_EMAIL = '25_60@bssm.hs.kr';
const FB_ENDPOINT = 'https://formsubmit.co/ajax/';
const FB_KINDS = [['bug', '버그'], ['idea', '제안'], ['like', '좋았던 점'], ['etc', '기타']];
const FB_MAX = 1000, FB_COOLDOWN = 30;
const fb = { kind: 'idea', text: '', from: '', busy: false, lastSent: 0 };
function inClaude() { return !!(window.claude && typeof window.claude.use === 'function'); }
function fbKindName(k) { const f = FB_KINDS.find((x) => x[0] === k); return f ? f[1] : '기타'; }
function fbInfo() {
  return GAME_VER + ' · 플레이 ' + fmtDur(S.play) + ' · 환생 ' + (S.rebirths || 0) + '회 · 목표 ' + (S.quest + 1) + '번째 · 하늘 탑 ' + ((S.tower && S.tower.best) || 0) + '층 · 화면 ' + innerWidth + '×' + innerHeight + (IS_TOUCH ? ' (터치)' : '');
}
function openFeedback() {
  const kinds = FB_KINDS.map(([k, n]) => '<button type="button" data-k="' + k + '" aria-pressed="' + (k === fb.kind) + '"' + (k === fb.kind ? ' class="on"' : '') + '>' + n + '</button>').join('');
  showModal('피드백 보내기',
    '<p>버그, 아이디어, 좋았던 점 무엇이든 적어 주세요. 개발자가 하나하나 읽어요.</p>' +
    '<div class="fbSeg" role="group" aria-label="피드백 종류">' + kinds + '</div>' +
    '<label class="fbL" for="fbText">내용</label>' +
    '<textarea id="fbText" class="fbTa" maxlength="' + FB_MAX + '" placeholder="예) 하늘 탑 12층 발판이 너무 멀어요"></textarea>' +
    '<div class="fbMeta"><span>게임 버전과 진행 상황이 함께 전달돼요</span><b id="fbCount">0/' + FB_MAX + '</b></div>' +
    '<label class="fbL" for="fbFrom">답장 받을 연락처 (선택)</label>' +
    '<input id="fbFrom" class="fbIn" type="text" maxlength="80" autocomplete="email" placeholder="이메일 또는 이름">' +
    '<div id="fbStatus" role="status" aria-live="polite"></div>',
    [{ t: '닫기' }]);
  const ta = $('fbText'), from = $('fbFrom'), cnt = $('fbCount');
  ta.value = fb.text;
  from.value = fb.from;
  const upd = () => { fb.text = ta.value; cnt.textContent = ta.value.length + '/' + FB_MAX; };
  ta.addEventListener('input', upd);
  upd();
  from.addEventListener('input', () => { fb.from = from.value; });
  for (const b of $('mBody').querySelectorAll('.fbSeg button')) {
    b.onclick = () => {
      fb.kind = b.dataset.k;
      for (const o of b.parentNode.children) { const on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', String(on)); }
    };
  }
  const send = el('button', 'buy', fb.busy ? '보내는 중…' : '보내기');
  send.id = 'fbSend';
  send.disabled = fb.busy;
  send.onclick = submitFeedback;
  $('mBtns').appendChild(send);
  if (!IS_TOUCH) setTimeout(() => { if ($('fbText') === ta) ta.focus(); }, 60);
}
async function submitFeedback() {
  if (fb.busy) return;
  const st = $('fbStatus');
  const say = (m, bad) => { if (st) { st.textContent = m; st.className = bad ? 'bad' : ''; } };
  const text = fb.text.trim();
  if (text.length < 5) { say('5글자 이상 적어 주세요.', true); SFX.err(); const ta = $('fbText'); if (ta) ta.focus(); return; }
  const wait = Math.ceil(FB_COOLDOWN - (Date.now() - fb.lastSent) / 1000);
  if (wait > 0) { say(wait + '초 뒤에 다시 보낼 수 있어요.', true); return; }
  fb.busy = true;
  const btn = $('fbSend');
  if (btn) { btn.disabled = true; btn.textContent = '보내는 중…'; }
  say('');
  const item = { kind: fb.kind, kindName: fbKindName(fb.kind), text: text.slice(0, FB_MAX), from: fb.from.trim().slice(0, 80), info: fbInfo(), ua: String(navigator.userAgent || '').slice(0, 200), at: Date.now() };
  let how = null;
  try { how = (await fbMail(item)) || (await fbStore(item)); } catch (e) { how = null; }
  if (how) { if (fbOutbox.length) fbScheduleFlush(1500); } else fbQueue(item);
  fb.busy = false;
  fb.lastSent = Date.now();
  fb.text = '';
  SFX.quest();
  const msg = how === 'mail' ? '개발자 메일로 피드백을 보냈어요.' : how === 'stored' ? '피드백이 저장됐어요. 개발자가 확인할게요.' : '지금은 전송이 안 돼서 피드백을 이 기기에 보관했어요. 연결되면 자동으로 다시 보낼게요.';
  if (modalOpen && $('fbText')) showModal('고마워요!', '<p>' + msg + '</p>', [{ t: '확인', primary: true }]);
  else toast(msg, 'good');
}
// 일반 웹(https)에서 FormSubmit으로 개발자 메일에 바로 보내요. claude.ai 안에서는 외부 요청이 막혀 있어 건너뛰어요.
async function fbMail(item) {
  if (!FB_EMAIL || inClaude() || !/^https?:$/.test(location.protocol)) return null;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const tm = setTimeout(() => { if (ctl) ctl.abort(); }, 12000);
  try {
    const body = {
      _subject: '[' + GAME_NAME + '] ' + item.kindName + ' 피드백',
      _template: 'table',
      _captcha: 'false',
      '종류': item.kindName,
      '내용': item.text,
      '연락처': item.from || '(없음)',
      '진행 상황': item.info,
      '기기': item.ua,
      '보낸 시각': new Date(item.at).toLocaleString('ko-KR'),
    };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.from)) body._replyto = item.from;
    const r = await fetch(FB_ENDPOINT + FB_EMAIL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
    const d = await r.json().catch(() => ({}));
    if (r.ok && String(d.success) === 'true') return 'mail';
    console.warn('[feedback] 메일 전송 실패', d && d.message);
    return null;
  } catch (e) { return null; } finally { clearTimeout(tm); }
}
// claude.ai에서 열었을 때: 게임 저장소(feedback/<사용자>/items)에 보관해요. 개발자(소유자)만 읽을 수 있어요.
async function fbStore(item) {
  if (!cloud.db || !cloud.uid) return null;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  try {
    await Promise.race([
      cloud.db.doc('feedback/' + cloud.uid + '/items/' + id).set(item),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ]);
    return 'stored';
  } catch (e) { return null; }
}
// 보내지 못한 피드백은 이 브라우저에 보관했다가 자동으로 다시 보내요. (켤 때 8초 뒤, 그 뒤 1~5분마다, 인터넷이 다시 연결될 때)
const FB_OUTBOX_KEY = 'couqueFeedbackOutbox';
const FB_OUTBOX_MAX = 20;
let fbOutbox = [];
try { const j = JSON.parse(localStorage.getItem(FB_OUTBOX_KEY) || '[]'); if (Array.isArray(j)) fbOutbox = j.filter((x) => x && typeof x.text === 'string').slice(-FB_OUTBOX_MAX); } catch (e) { /* 저장소를 못 쓰면 메모리에만 */ }
let fbFlushT = 0, fbFlushing = false;
function fbSaveOutbox() { try { localStorage.setItem(FB_OUTBOX_KEY, JSON.stringify(fbOutbox)); } catch (e) { /* 메모리에만 */ } }
function fbQueue(item) {
  fbOutbox.push(item);
  if (fbOutbox.length > FB_OUTBOX_MAX) fbOutbox.splice(0, fbOutbox.length - FB_OUTBOX_MAX);
  fbSaveOutbox();
  fbScheduleFlush(60000);
}
function fbScheduleFlush(ms) {
  clearTimeout(fbFlushT);
  if (fbOutbox.length) fbFlushT = setTimeout(fbFlush, ms);
}
async function fbFlush() {
  if (fbFlushing || !fbOutbox.length) return;
  fbFlushing = true;
  try {
    while (fbOutbox.length) {
      const it = fbOutbox[0];
      const how = (await fbMail(it)) || (await fbStore(it));
      if (!how) break;
      fbOutbox.shift();
      fbSaveOutbox();
    }
  } catch (e) { /* 다음에 다시 */ }
  fbFlushing = false;
  fbScheduleFlush(5 * 60000);
}
addEventListener('online', () => fbScheduleFlush(3000));
fbScheduleFlush(8000);

// =====================================================================
//  시작
// =====================================================================
function welcome() {
  const ctl = IS_TOUCH
    ? '<div class="ctl"><kbd>왼쪽 아래 드래그</kbd><span>이동</span><kbd>점프 버튼</kbd><span>점프</span><kbd>화면 드래그</kbd><span>시점 돌리기</span><kbd>채굴 버튼</kbd><span>코인 얻기</span><kbd>공격 버튼</kbd><span>무기 공격 (누르고 있으면 연속)</span><kbd>달리기 버튼</kbd><span>달리기 켜고 끄기 (스태미너 소모 · 점프맵에선 못 써요)</span><kbd>자물쇠 버튼</kbd><span>시프트락 (캐릭터가 화면 방향을 봐요)</span></div>'
    : '<div class="ctl"><kbd>WASD</kbd><span>이동</span><kbd>Space</kbd><span>점프 (길게 누르면 더 높이)</span><kbd>드래그 · 휠</kbd><span>시점 돌리기 · 확대</span><kbd>크리스탈 클릭 · F</kbd><span>채굴해서 코인 얻기</span><kbd>클릭 · J (누르고 있기)</kbd><span>무기 공격</span><kbd>왼쪽 Shift</kbd><span>달리기 (누르고 있기 · 스태미너 소모 · 점프맵에선 못 써요)</span><kbd>오른쪽 Shift</kbd><span>시프트락 (마우스 고정 · 조준점으로 공격)</span><kbd>B · H · R</kbd><span>상점 · 허브 · 체크포인트</span></div>';
  showModal(GAME_NAME, '<p>구름 위 섬에서 <span class="hl">크리스탈을 채굴</span>하고, <span class="ml">드로퍼</span>를 지어 자는 동안에도 코인을 모으세요.</p>' + ctl +
    '<p>다리를 놓아 섬의 <span class="hl">점프맵 코스</span>에 도전하고, 끝없이 이어지는 <span class="hl">하늘 탑</span>, 매일 바뀌는 <span class="hl">오늘의 도전</span>, 무기를 들고 떠나는 <span class="hl">사냥터와 보스 레이드</span>, 과자 펫을 모으는 <span class="hl">펫 부화장</span>까지 즐겨 보세요.</p>',
    [{ t: '시작하기', primary: true, fn: () => { S.welcomed = true; S.seenV2 = true; S.seenV3 = true; S.seenV4 = true; S.seenV5 = true; save(); requestPersist(); } }]);
}
function whatsNewV3() {
  showModal('사냥터와 보스 레이드가 열렸어요', '<div class="ctl">' +
    '<kbd>사냥터</kbd><span>허브 남쪽 붉은 문. 들판 5곳에 몬스터 7종, 금관 쓴 엘리트는 보석을 줘요</span>' +
    '<kbd>보스 레이드</kbd><span>캠프 남쪽 섬. 보스 5종, 단계가 끝없이 올라가요. 처음 쓰러뜨리면 유물 무기</span>' +
    '<kbd>무기</kbd><span>상점 › 전투 탭 또는 캠프 무기 상점. 근접·내려찍기·활·유도탄·연쇄 번개</span>' +
    '<kbd>공격</kbd><span>' + (IS_TOUCH ? '공격 버튼 (누르고 있으면 연속)' : '클릭하거나 J키 (누르고 있으면 연속)') + ' · 가까운 적을 자동 조준</span></div>' +
    '<p>보스의 빨간 원과 부채꼴은 피하고, 주황 충격파는 점프로 넘으세요.</p>',
    [{ t: '사냥하러 가기', primary: true, fn: () => { S.seenV3 = true; save(); enterHunt(); } }, { t: '나중에', fn: () => { S.seenV3 = true; save(); } }]);
}
function whatsNewV4() {
  const sl = IS_TOUCH ? '오른쪽 아래 자물쇠 버튼' : '오른쪽 Shift 키 (Esc나 오른쪽 Shift로 풀기)';
  showModal('시프트락 · 무기 밸런스 업데이트', '<div class="ctl">' +
    '<kbd>시프트락</kbd><span>' + sl + '. 캐릭터가 화면 방향을 보고, 가운데 조준점 쪽으로 공격해요</span>' +
    '<kbd>무기</kbd><span>상점 목록 순서대로 항상 더 세져요. 사냥꾼 활·번개 지팡이·서리 도끼·용의 대검이 강해지고, 용의 대검·별빛 활·차원 낫은 더 싸졌어요</span>' +
    '<kbd>유물</kbd><span>유령 여왕의 홀·용의 숨결은 바로 다음 상점 무기보다 약하게 맞췄어요</span>' +
    '<kbd>보스</kbd><span>보스 체력이 늘었어요. 유물 하나로 다음 보스를 바로 잡지 않고, 무기를 순서대로 모아 잡게 돼요</span></div>' +
    '<p>초당 피해는 이제 한 마리 기준이에요. 연쇄 번개 무기는 여러 마리를 함께 맞히면 더 강해요.</p>',
    [{ t: '확인', primary: true, fn: () => { S.seenV4 = true; save(); } }]);
}
function whatsNew() {
  showModal('하늘섬이 넓어졌어요', '<p>기존 진행은 그대로 두고, 오래 즐길 거리를 더했어요.</p><div class="ctl">' +
    '<kbd>끝없는 하늘 탑</kbd><span>허브 북서쪽 보라색 문. 층마다 보석과 영구 수입 +1%</span>' +
    '<kbd>오늘의 도전</kbd><span>허브 남동쪽 금색 문. 매일 바뀌는 코스, 연속 기록 보상</span>' +
    '<kbd>보석 · 각성</kbd><span>드로퍼 생산량 x3을 끝없이, 꾸미기와 부스터</span>' +
    '<kbd>환생 상점</kbd><span>환생 포인트로 영구 강화 (기존 토큰은 포인트로 바뀌었어요)</span>' +
    '<kbd>메달 · 업적</kbd><span>코스 시간 기록 메달, 끝없이 이어지는 업적</span>' +
    '<kbd>황금 별똥별</kbd><span>가끔 근처에 떨어져요. 잡으면 수입 7배 등 보너스</span></div>' +
    '<p>비용과 보상도 다시 맞췄어요. 처음부터 새로 하고 싶다면 상점 › 설정에서 초기화할 수 있어요.</p>',
    [{ t: '둘러보기', primary: true, fn: () => { S.seenV2 = true; S.seenV3 = true; save(); } }]);
}
function boot() {
  const mapFrom = scene.children.length;
  buildWorld();
  buildTracks();
  buildHunt();
  buildHatchery();
  window.__mapAdopted = adoptMapObjects(mapFrom);
  fitSparkScale();
  rebuildDaily();
  const issues = checkCourses();
  window.__courseIssues = issues;
  if (issues.length) console.warn('[course] 도달 어려운 구간', issues);
  const saved = loadLocal();
  hadLocalSave = !!saved;
  localSavedT = saved ? num(saved.t) : 0;
  if (saved) requestPersist();
  applyState(saved || defaultState());
  if (saved && (!saved.v || saved.v < 2 || !saved.seenV3)) { S.quest = 0; while (S.quest < QUESTS.length && questAt(S.quest).done()) S.quest++; S.welcomed = true; }
  towerWindow(true);
  syncAll();
  respawnAt(SPAWN);
  P.respawn = { ...SPAWN };
  camTarget.set(P.x, P.y + 1.4, P.z);
  // 오프라인 수익
  if (saved) grantOffline((Date.now() - num(saved.t, Date.now())) / 1000);
  if (!S.welcomed) welcome();
  else if (!S.seenV2) whatsNew();
  else if (!S.seenV3) whatsNewV3();
  else if (!S.seenV4) whatsNewV4();
  else if (!S.seenV5) whatsNewV5();
  checkAch();
  checkQuest();
  // 폰트 로드 후 라벨 다시 그리기
  if (document.fonts && document.fonts.load) {
    document.fonts.load('40px "Jua"').then(() => { for (const L of labels) drawLabel(L, L.lines); }).catch(() => {});
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  addEventListener('pagehide', save);
  window.__gameStarted = true;
  window.__game = { THREE, camera, mapGroups, mapAt, get curMap() { return curMap; }, hatch, fuseAll, fuseAllPlan, PETS, EGGS, petThumb, equipBest, fusePet, openEgg, closeHatch, enterHatch, buildPet, rollPet, get PS() { return PS; }, get DEX() { return DEX; }, get S() { return S; }, P, respawnAt, mine, petFol, renderer, scene, airJumpMax, phoenixBlast, refreshPets, syncPetModels, setShiftLock, toggleShiftLock, get shiftLock() { return shiftLock; }, updateFx, fxAttack, get fxCount() { return fxList.length; }, forceAction: (t) => raid && startAction(raid.boss, t), updateCombat, monsters, attack, startRaid, endRaid, BOSSES, WEAPONS, enterHunt, equipWeapon, buyWeapon, openRaidMenu, get raid() { return raid; }, hurtPlayer, maxHp, weaponDps, checkPairs, makeDailyTrack, disposeBuild, TT, get DT() { return DT; }, trackSpec, ensureFloors, trackPairs, enterTower, enterDaily, spawnGold, catchGold, awaken, buyRupg, buyBoost, buySkin, checkAch, questAt, rebirthGain, genFloor, physicsStep, overlapXZ, sweepers, movers, fades, get gameTime() { return gameTime; }, S, P, colliders, courses, stars, checkCourses, buyGen, buyZone, buyUpg, buyLaunch, mine, goHome, respawnAt, launchTo, cam, totalCps, doRebirth, keys, earn, get state() { return S; } };
  $('loading').classList.add('fade');
  setTimeout(() => $('loading').remove(), 600);
  requestAnimationFrame((t) => { last = t; lastWall = Date.now(); frame(t); });
  initCloud();
  pregenThumbs();
}
boot();
