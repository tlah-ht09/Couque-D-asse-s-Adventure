'use strict';
// 쿠키성 내부: 로비 + 8개 방 + 고압 세척 청소
// 3단계: 상점 (도구 이름, 반경, 세기, 사거리, 가격)
const WASH_TOOLS = [
  { name: '정원 호스', r: 0.35, str: 1.2, reach: 6, cost: 0 },
  { name: '분무 노즐', r: 0.42, str: 1.5, reach: 7, cost: 5e7 },
  { name: '고압 세척기', r: 0.5, str: 1.8, reach: 8, cost: 5e10 },
  { name: '터보 노즐', r: 0.58, str: 2.2, reach: 9, cost: 5e13 },
  { name: '회전 노즐', r: 0.68, str: 2.6, reach: 10, cost: 5e16 },
  { name: '산업용 세척기', r: 0.78, str: 3.0, reach: 11, cost: 1e20 },
  { name: '제트 세척기', r: 0.88, str: 3.5, reach: 12, cost: 1e25 },
  { name: '쿠키 왕실 세척기', r: 1.0, str: 4.0, reach: 14, cost: 1e30 },
];
const ROOM_DIMS = [[5, 4, 2.2], [6, 5, 2.5], [7, 6, 2.6], [8, 6, 3], [9, 7, 3.2], [10, 8, 3.4], [11, 9, 3.6], [12, 10, 4]];
const LOBBY = { x: 175, z: -150, spawn: { x: 175, y: 0, z: -148.5, yaw: 0 } };
const CELL = 8, REDIRTY_MS = 30 * 60 * 1000;
const roomPos = (k) => ({ x: 140 + 28 * ((k - 1) % 4), z: -190 - 30 * Math.floor((k - 1) / 4) }); // k = 1..8
const roomLabels = [];
let shopLabel = null, washShopLast = 0, labelT = 0, exitLabel = null, washHud = null, wroom = null, roomTouchT = 0;
const wash = { held: false, pid: null, x: 0, y: 0, fxT: 0 };
let washBeam = null;
const _wv = new THREE.Vector3(), _wd = new THREE.Vector3(), _wup = new THREE.Vector3(0, 1, 0);

function buildCastleInterior() {
  const cream = mat(0xf6e8c8), floorM = mat(0xe3b878), padM = mat(0x7af0ff, { emissive: 0x3ac8e0, emissiveIntensity: 0.5 });
  boxPlat(LOBBY.x, 0, LOBBY.z, 38, 0.6, 14, mat(0xf0d9a0), {});
  for (let k = 1; k <= 8; k++) {
    const x = LOBBY.x + (k - 4.5) * 4;
    cylPlat(x, 0.15, LOBBY.z - 3, 1.2, 0.15, padM, { castleRoom: k });
    roomLabels.push(makeLabel(['', ''], { sx: 3.4, pos: new THREE.Vector3(x, 2.6, LOBBY.z - 3) }));
  }
  cylPlat(LOBBY.x, 0.15, LOBBY.z + 5.5, 1.2, 0.15, mat(0xffcf3f, { emissive: 0xc08a00, emissiveIntensity: 0.5 }), { castleExit: true });
  exitLabel = makeLabel([{ t: '섬으로 나가기', c: '#ffcf8a' }, ''], { sx: 3.4, pos: new THREE.Vector3(LOBBY.x, 2.6, LOBBY.z + 5.5) });
  cylPlat(LOBBY.x - 8, 0.15, LOBBY.z + 5.5, 1.2, 0.15, mat(0xff9fd0, { emissive: 0xc04a8a, emissiveIntensity: 0.5 }), { washShop: true });
  shopLabel = makeLabel([{ t: '청소도구 상점', c: '#ffb8de' }, ''], { sx: 3.4, pos: new THREE.Vector3(LOBBY.x - 8, 2.6, LOBBY.z + 5.5) });
  for (let k = 1; k <= 8; k++) {
    const [w, d, h] = ROOM_DIMS[k - 1], { x: cx, z: cz } = roomPos(k), T = 0.3;
    boxPlat(cx, 0, cz, w, 0.4, d, floorM, {});
    const wall = (x, z, sx, sz) => { mesh(G.box, cream, x, h / 2, z, sx, h, sz); addBoxCol(x, (h + 8) / 2, z, sx / 2, (h + 8) / 2, sz / 2, {}); };
    wall(cx, cz - d / 2 - T / 2, w + 2 * T, T); wall(cx, cz + d / 2 + T / 2, w + 2 * T, T);
    wall(cx - w / 2 - T / 2, cz, T, d); wall(cx + w / 2 + T / 2, cz, T, d);
    cylPlat(cx, 0.15, cz - d / 2 + 0.9, 0.7, 0.15, mat(0xffcf3f, { emissive: 0xc08a00, emissiveIntensity: 0.5 }), { castleLobby: true });
  }
  refreshCastleInterior();
}

function refreshCastleInterior() {
  roomLabels.forEach((L, i) => {
    const k = i + 1, ok = S.castle.lv >= k, dt = S.castle.doneT[i], left = REDIRTY_MS - (Date.now() - dt);
    const st = !S.castle.first[i] ? { t: '청소하기', s: 30, c: '#3ee6a5' } : dt > 0 && left > 0 ? { t: '방 ' + k + ' · ' + Math.ceil(left / 60000) + '분 뒤 더러워짐', s: 26, c: '#ffd166' } : { t: '방 ' + k + ' · 완료', s: 30, c: '#3ee6a5' };
    drawLabel(L, ok ? [{ t: '방 ' + k, c: '#9ff3ff' }, st] : [{ t: '방 ' + k, c: '#9a9a9a' }, { t: '성 ' + k + '단계 필요', s: 30, c: '#9a9a9a' }]);
  });
}

function castleDoorTouch() {
  const now = performance.now();
  if (now - castleBuyT < 1500) return;
  castleBuyT = now;
  if (S.castle.lv < 1) { toast('성 1단계를 먼저 지어요', 'bad'); return; }
  goLobby();
}
function goLobby() {
  P.course = null; leaveTracks(); hideTimer();
  P.respawn = { ...LOBBY.spawn };
  respawnAt(LOBBY.spawn);
  SFX.cp();
}
function castleInteriorTouch(c) {
  const now = performance.now();
  if (c.washShop) { if (now - washShopLast > 600 && !modalOpen) openWashShop(); washShopLast = now; return; } // 발판 위에 서 있어도 한 번만 열어요

  if (now - roomTouchT < 800) return;
  roomTouchT = now;
  if (c.castleRoom) {
    if (S.castle.lv < c.castleRoom) { toast('성 ' + c.castleRoom + '단계가 필요해요', 'bad'); SFX.err(); return; }
    enterRoom(c.castleRoom);
  } else if (c.castleLobby) { exitRoom(); goLobby(); }
  else if (c.castleExit) { exitRoom(); enterCastle(); }
}

// 로비 라벨 갱신 (2초마다)
function updateLobby(dt) {
  labelT -= dt;
  if (labelT > 0) return;
  labelT = 2;
  refreshCastleInterior();
}

// ---- 청소도구 상점 ----
function openWashShop() {
  const lv = S.castle.lv, cur = S.castle.tool;
  let h = '<div style="max-height:55vh;overflow:auto;text-align:left">';
  WASH_TOOLS.forEach((T, i) => {
    const k = i + 1, nxt = k === cur + 1;
    let act;
    if (k === cur) act = '<b style="color:#3ee6a5">사용 중</b>';
    else if (k < cur) act = '<span style="color:#9ab">보유</span>';
    else if (!nxt) act = '<span style="opacity:.5">잠김</span>';
    else if (lv < k) act = '<span style="color:#ff9f9f">성 ' + k + '단계 필요</span>';
    else act = '<button class="buy" data-wt="' + k + '"' + (S.coins < T.cost ? ' disabled' : '') + '>구매 ' + fmt(T.cost) + '</button>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12);' + (k > cur + 1 ? 'opacity:.45' : '') + '"><div><b>' + k + '. ' + T.name + '</b><br><small>반경 ' + T.r + ' m · 세기 ' + T.str + ' · 사거리 ' + T.reach + ' m</small></div><div>' + act + '</div></div>';
  });
  h += '</div>';
  showModal('청소도구 상점', h, [{ t: '닫기', primary: true }]);
  $('mBody').querySelectorAll('button[data-wt]').forEach((b) => {
    b.onclick = () => {
      const k = +b.dataset.wt, T = WASH_TOOLS[k - 1];
      if (k !== S.castle.tool + 1 || S.castle.lv < k || !spend(T.cost)) { SFX.err(); return; }
      S.castle.tool = k; save(); SFX.buy();
      toast(T.name + ' 장착!');
      openWashShop();
    };
  });
}

// ---- 더러움 격자 ----
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function makeSurface(sw, sh, pos, ry, rx, mult, seed) {
  const cols = Math.round(sw * CELL), rows = Math.round(sh * CELL), n = cols * rows;
  const th = new Float32Array(n), cv = document.createElement('canvas');
  cv.width = cols; cv.height = rows;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(cols, rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) th[y * cols + x] = (0.6 + 0.4 * vnoise(x / 4, y / 4, seed)) * mult;
  const nb = 3, br = Math.sqrt(0.15 * n / nb / Math.PI);
  for (let b = 0; b < nb; b++) {
    const bx = hash2(b, 1, seed) * cols, by = hash2(b, 2, seed) * rows;
    for (let y = Math.max(0, Math.floor(by - br * 1.3)); y < Math.min(rows, by + br * 1.3); y++) for (let x = Math.max(0, Math.floor(bx - br * 1.3)); x < Math.min(cols, bx + br * 1.3); x++) {
      const dd = Math.hypot(x - bx, y - by), rr = br * (0.8 + 0.4 * vnoise(x / 3, y / 3, seed + b));
      if (dd < rr) th[y * cols + x] = 2.0;
    }
  }
  let clean = 0;
  const stub = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    stub[i] = th[i] >= 1.9 && mult === 1 ? 1 : 0;
    const j = i * 4, q = hash2(i, 7, seed), st = th[i] >= 1.5;
    img.data[j] = st ? 74 : 90 + 32 * q; img.data[j + 1] = st ? 74 : 70 + 25 * q; img.data[j + 2] = st ? 42 : 48 + 10 * q;
    img.data[j + 3] = Math.min(1, th[i]) * 255;
    if (th[i] < 0.05) clean++;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1 }));
  m.position.copy(pos); m.rotation.y = ry; m.rotation.x = rx; m.renderOrder = 1;
  scene.add(m);
  const s = { mesh: m, tex, ctx, img, th, cols, rows, n, clean, dirty: false, x0: 0, y0: 0, x1: -1, y1: -1 };
  m.userData.surf = s;
  return s;
}
function enterRoom(k) {
  if (wroom) exitRoom();
  const [w, d, h] = ROOM_DIMS[k - 1], { x: cx, z: cz } = roomPos(k), o = 0.01;
  const done = S.castle.doneT[k - 1], age = Date.now() - done;
  const fresh = done > 0 && age < REDIRTY_MS;
  const mult = fresh ? 0 : (S.castle.first[k - 1] && done > 0 ? 0.6 : 1);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const surfs = [
    makeSurface(w, d, V(cx, o, cz), 0, -Math.PI / 2, mult, k * 11 + 1),
    makeSurface(w, h, V(cx, h / 2, cz - d / 2 + o), 0, 0, mult, k * 11 + 2),
    makeSurface(w, h, V(cx, h / 2, cz + d / 2 - o), Math.PI, 0, mult, k * 11 + 3),
    makeSurface(d, h, V(cx - w / 2 + o, h / 2, cz), Math.PI / 2, 0, mult, k * 11 + 4),
    makeSurface(d, h, V(cx + w / 2 - o, h / 2, cz), -Math.PI / 2, 0, mult, k * 11 + 5),
  ];
  const total = surfs.reduce((a, s) => a + s.n, 0);
  wroom = { k, surfs, meshes: surfs.map((s) => s.mesh), total, clean: surfs.reduce((a, s) => a + s.clean, 0), done: false, prevDist: cam.distT };
  if (fresh) { wroom.done = true; wroom.clean = total; toast('아직 깨끗해요 · ' + Math.ceil((REDIRTY_MS - age) / 60000) + '분 뒤 다시 더러워져요'); }
  P.inRoom = k;
  cam.distT = Math.min(cam.distT, 5);
  const r = { x: cx, y: 0, z: cz + d / 2 - 1, yaw: 0 };
  P.course = null; leaveTracks(); hideTimer();
  P.respawn = { ...r };
  respawnAt(r);
  SFX.cp();
  if (!washHud) {
    washHud = document.createElement('div'); washHud.id = 'washHud';
    washHud.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);padding:6px 14px;border-radius:12px;background:rgba(20,20,30,.6);color:#fff;font:600 15px sans-serif;pointer-events:none;z-index:20;display:none';
    document.body.appendChild(washHud);
  }
  washHud.style.display = 'block';
  updateWashHud();
}
function exitRoom() {
  if (!wroom) { P.inRoom = 0; return; }
  for (const s of wroom.surfs) { scene.remove(s.mesh); s.mesh.geometry.dispose(); s.mesh.material.dispose(); s.tex.dispose(); }
  cam.distT = wroom.prevDist;
  wroom = null; P.inRoom = 0; wash.held = false; wash.pid = null;
  if (washBeam) washBeam.visible = false;
  if (washHud) washHud.style.display = 'none';
}
function updateWashHud() {
  if (!wroom || !washHud) return;
  const pc = Math.min(100, wroom.clean / wroom.total * 100), done = wroom.done || pc >= 99.5;
  washHud.innerHTML = (done ? '깨끗해요! 로비 발판으로 돌아가세요' : '방 ' + wroom.k + ' · 청소 ' + pc.toFixed(1) + '% · ' + WASH_TOOLS[S.castle.tool - 1].name + ' Lv.' + S.castle.tool)
    + '<div style="margin-top:4px;height:5px;border-radius:3px;background:rgba(255,255,255,.25);overflow:hidden"><div style="height:100%;width:' + pc + '%;background:' + (done ? '#3ee6a5' : '#7af0ff') + '"></div></div>';
}

// ---- 입력 ----
function washPointer(e, type) {
  if (type === 'down') {
    if (P.inRoom && e.button === 0 && !wash.held) { wash.held = true; wash.pid = e.pointerId; wash.x = e.clientX; wash.y = e.clientY; }
  } else if (e.pointerId === wash.pid) {
    if (type === 'move') { wash.x = e.clientX; wash.y = e.clientY; }
    else { wash.held = false; wash.pid = null; }
  }
}

// ---- 분사 ----
function updateWash(dt) {
  if (!P.inRoom || !wroom) { if (wroom) exitRoom(); return; }
  if (curMap !== 'castle' || !(P.x > 125 && P.z < -135)) { exitRoom(); return; } // 방 밖으로 나가면 정리
  if (!washBeam) {
    washBeam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.55, depthWrite: false }));
    washBeam.visible = false; scene.add(washBeam);
  }
  const tl = S.castle.tool, T = WASH_TOOLS[tl - 1];
  let hit = null;
  if (wash.held && !modalOpen) {
    const lk = plocked();
    _ndc.set(((lk ? innerWidth / 2 : wash.x) / innerWidth) * 2 - 1, -((lk ? innerHeight / 2 : wash.y) / innerHeight) * 2 + 1);
    raycaster.setFromCamera(_ndc, camera);
    const hs = raycaster.intersectObjects(wroom.meshes, false);
    if (hs.length && Math.hypot(hs[0].point.x - P.x, hs[0].point.y - P.y - 1, hs[0].point.z - P.z) <= T.reach) hit = hs[0];
  }
  if (hit) {
    const s = hit.object.userData.surf, rc = T.r * CELL, ru = Math.ceil(rc);
    const cx = Math.floor(hit.uv.x * s.cols), cy = Math.floor((1 - hit.uv.y) * s.rows), data = s.img.data;
    for (let y = Math.max(0, cy - ru); y <= Math.min(s.rows - 1, cy + ru); y++) for (let x = Math.max(0, cx - ru); x <= Math.min(s.cols - 1, cx + ru); x++) {
      const dd = Math.hypot(x - cx, y - cy);
      if (dd > rc) continue;
      const i = y * s.cols + x, v = s.th[i];
      if (v <= 0) continue;
      const nv = Math.max(0, v - T.str * dt * (1 - 0.6 * dd / rc));
      s.th[i] = nv;
      data[i * 4 + 3] = Math.min(1, nv) * 255;
      if (v >= 0.05 && nv < 0.05) { s.clean++; wroom.clean++; }
      if (x < s.x0 || !s.dirty) s.x0 = x; if (x > s.x1 || !s.dirty) s.x1 = x;
      if (y < s.y0 || !s.dirty) s.y0 = y; if (y > s.y1 || !s.dirty) s.y1 = y;
      s.dirty = true;
    }
    // 빔: 노즐 -> 맞은 곳
    _wd.set(hit.point.x - P.x, hit.point.y - (P.y + 1.1), hit.point.z - P.z);
    const len = _wd.length();
    _wv.set(P.x + _wd.x / len * 0.5, P.y + 1.1, P.z + _wd.z / len * 0.5);
    _wd.set(hit.point.x - _wv.x, hit.point.y - _wv.y, hit.point.z - _wv.z);
    const bl = _wd.length();
    washBeam.position.set((_wv.x + hit.point.x) / 2, (_wv.y + hit.point.y) / 2, (_wv.z + hit.point.z) / 2);
    washBeam.quaternion.setFromUnitVectors(_wup, _wd.normalize());
    const br = 0.04 + 0.03 * tl / 8;
    washBeam.scale.set(br, bl, br);
    washBeam.visible = true;
    wash.fxT -= dt;
    if (wash.fxT <= 0) { wash.fxT = 0.1; burst(hit.point.x, hit.point.y, hit.point.z, [0x9fe8ff, 0xffffff], 2, 2.5, 0.1, 1.5, 1, 0.5); }
  } else washBeam.visible = false;
  for (const s of wroom.surfs) {
    if (!s.dirty) continue;
    s.ctx.putImageData(s.img, 0, 0, s.x0, s.y0, s.x1 - s.x0 + 1, s.y1 - s.y0 + 1);
    s.tex.needsUpdate = true; s.dirty = false;
  }
  if (hit) updateWashHud();
  if (!wroom.done && wroom.clean / wroom.total >= 0.995) completeRoom();
}
function completeRoom() {
  const r = wroom, k = r.k;
  r.done = true;
  for (const s of r.surfs) {
    for (let i = 0; i < s.n; i++) { s.th[i] = 0; s.img.data[i * 4 + 3] = 0; }
    s.ctx.putImageData(s.img, 0, 0); s.tex.needsUpdate = true; s.clean = s.n;
  }
  r.clean = r.total;
  updateWashHud();
  if (!S.castle.first[k - 1]) {
    S.castle.first[k - 1] = true;
    earnGems(20 * k);
    banner('방 ' + k + ' 첫 청소 완료!', '영구 수입 +3%', '+' + 20 * k + ' 젬');
  } else {
    const a = totalCps() * (60 + 15 * k);
    earn(a);
    toast('방 ' + k + ' 청소 완료! +' + fmt(a) + ' 코인');
  }
  S.castle.doneT[k - 1] = Date.now();
  save();
  refreshCastleInterior();
  burst(P.x, P.y + 1.5, P.z, [0xffd166, 0xffffff, 0x9fe8ff, 0xff8fbf], 60, 8, 0.22, 5, 0.8, 1.4);
  SFX.buy();
}
function washDebugClean() { if (wroom && !wroom.done) { wroom.clean = wroom.total; completeRoom(); } }
