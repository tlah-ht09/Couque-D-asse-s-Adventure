'use strict';
// ---------- 뽑기 ----------
// 아우라 알(mix): 아우라 펫은 각각 auraPct%, 나머지 확률은 다른 등급 펫 모두에게 똑같이 나눠요.
// 확률만 다른 복사본(원래 펫을 프로토타입으로)을 쓰고, 뽑힌 펫은 원래 펫(base)으로 돌려줘요.
const eggPoolCache = {};
function eggPets(ei) {
  const E = EGGS[ei];
  if (!E.mix) return PETS.filter((p) => p.egg === ei);
  if (eggPoolCache[ei]) return eggPoolCache[ei];
  const au = PETS.filter((p) => p.rar >= 6), rest = PETS.filter((p) => p.rar < 6);
  const each = (100 - E.mix.auraPct * au.length) / rest.length;
  const pool = rest.map((p) => Object.assign(Object.create(p), { pct: each, base: p }))
    .concat(au.map((p) => Object.assign(Object.create(p), { pct: E.mix.auraPct, base: p })));
  pool.sort((a, b) => a.rar - b.rar);
  return (eggPoolCache[ei] = pool);
}
function pctTxt(x) { return stripZ(x.toFixed(x < 1 ? 2 : 1)); }
function eggRarPct(ei) { const o = RAR.map(() => 0); for (const p of eggPets(ei)) o[p.rar] += p.pct; return o; }
function rollPet(ei) {
  const pool = eggPets(ei);
  let r = Math.random() * 100;
  for (const p of pool) { r -= p.pct; if (r < 0) return p.base || p; }
  return pool[0].base || pool[0];
}
function petScore(p, v) { let s = p.aura ? 3 : 0; for (const k in p.st) s += petStatVal(p, k, v) / PSTAT[k].vals[3]; return s; }
function ownedPetList() {
  const out = [];
  for (const p of PETS) for (let v = 2; v >= 0; v--) { const c = petCount(p.id, v); if (c > 0) out.push({ p, v, c }); }
  return out;
}
// 빈 칸을 가장 센 펫으로 채우기 (all이면 전부 다시 골라요)
function equipBest(all) {
  if (all) S.pets.eq = [];
  const slots = petSlots();
  const cand = [];
  for (const { p, v, c } of ownedPetList()) { const free = c - petEquipped(p.id, v); for (let k = 0; k < free; k++) cand.push([p, v]); }
  cand.sort((A, B) => petScore(B[0], B[1]) - petScore(A[0], A[1]));
  for (const [p, v] of cand) { if (S.pets.eq.length >= slots) break; S.pets.eq.push([p.id, v]); }
  afterPetChange();
}
function equipPet(id, v) {
  if (S.pets.eq.length >= petSlots()) { toast('펫 칸이 가득 찼어요. 먼저 한 마리를 내려놓으세요', 'bad'); return false; }
  if (petCount(id, v) - petEquipped(id, v) <= 0) return false;
  S.pets.eq.push([id, v]);
  afterPetChange();
  return true;
}
function unequipPet(id, v) {
  const i = S.pets.eq.findIndex((e) => e[0] === id && e[1] === v);
  if (i < 0) return false;
  S.pets.eq.splice(i, 1);
  afterPetChange();
  return true;
}
function fusePet(id, v, quiet) {
  if (v >= 2 || petCount(id, v) < FUSE_N) return false;
  const inv = S.pets.inv[id];
  inv[v] -= FUSE_N; inv[v + 1]++;
  const bit = 1 << (v + 1), first = !((S.pets.dex[id] || 0) & bit);
  S.pets.dex[id] = (S.pets.dex[id] || 0) | bit;
  // 데리고 다니던 펫이면 새로 만든 펫으로 바꿔 줘요
  const ei = S.pets.eq.findIndex((e) => e[0] === id && e[1] === v);
  if (ei >= 0) S.pets.eq[ei] = [id, v + 1];
  while (petEquipped(id, v) > inv[v]) S.pets.eq.splice(S.pets.eq.findIndex((e) => e[0] === id && e[1] === v), 1);
  if (quiet) return first ? 'new' : true;
  const p = petById(id);
  SFX.finish();
  toast(PVAR[v + 1].name + ' ' + p.name + ' 완성!' + (first ? ' · 도감 +' + (v === 0 ? 2 : 3) + '%' : ''), 'gold', 3200);
  afterPetChange();
  return true;
}
// 일괄 합성: 만들 수 있는 황금 → 무지개 수 미리 계산
function fuseAllPlan() {
  let g = 0, r = 0;
  for (const p of PETS) {
    const a = S.pets.inv[p.id];
    if (!a) continue;
    const ng = Math.floor((a[0] || 0) / FUSE_N), nr = Math.floor(((a[1] || 0) + ng) / FUSE_N);
    g += ng; r += nr;
  }
  return { g, r };
}
// 모든 펫을 합성 (일반 5 → 황금, 황금 5 → 무지개). 장착한 펫은 합성된 펫으로 바뀌어요
function fuseAll() {
  let g = 0, r = 0, ng = 0, nr = 0;
  for (const p of PETS) {
    for (let v = 0; v < 2; v++) {
      let res;
      while ((res = fusePet(p.id, v, true))) {
        if (v) { r++; if (res === 'new') nr++; } else { g++; if (res === 'new') ng++; }
      }
    }
  }
  if (!g && !r) { toast('합성할 수 있는 펫이 없어요 (같은 펫 ' + FUSE_N + '마리 필요)', 'bad'); return false; }
  SFX.finish();
  const parts = [];
  if (g) parts.push('황금 ' + g + '마리');
  if (r) parts.push('무지개 ' + r + '마리');
  const dx = ng * 2 + nr * 3;
  toast('일괄 합성 완료 · ' + parts.join(' · ') + (dx ? ' · 도감 +' + dx + '%' : ''), 'gold', 3600);
  if (S.pets.eq.length < petSlots()) equipBest(false); else afterPetChange();
  return true;
}
function fuseAllBtn(after) {
  const pl = fuseAllPlan(), n = pl.g + pl.r;
  const b = el('button', 'buy fuse', '일괄 합성' + (n ? ' (' + n + ')' : ''));
  b.disabled = !n;
  b.title = n ? '황금 ' + pl.g + ' · 무지개 ' + pl.r : '같은 펫 ' + FUSE_N + '마리가 모이면 합성할 수 있어요';
  b.onclick = () => { if (fuseAll() && after) after(); };
  return b;
}
function afterPetChange() {
  refreshPets();
  syncPetModels();
  checkDexMs();
  refreshDexBoard();
  afterProgress();
  save();
}
function checkDexMs() {
  let got = false;
  for (const m of DEX_MS) {
    if (m.n <= S.pets.msN || DEX.n < m.n) continue;
    let txt = m.txt;
    if (m.gems) txt = txt.replace('보석 ' + m.gems, '보석 ' + earnGems(m.gems));
    toast('도감 ' + m.n + '종 달성! ' + txt, 'gold', 4200);
    S.pets.msN = m.n;
    if (m.slot) got = true;
  }
  if (got && S.pets.eq.length < petSlots()) { const before = S.pets.eq.length; equipBest(false); return S.pets.eq.length > before; }
  return false;
}
function hatch(ei, n) {
  const E = EGGS[ei];
  if (n >= 10 && !petX10()) return null;
  if (!spend(E.cost * n)) return null;
  const out = [];
  for (let k = 0; k < n; k++) {
    const p = rollPet(ei);
    const inv = S.pets.inv[p.id] || (S.pets.inv[p.id] = [0, 0, 0]);
    inv[0]++;
    const isNew = !((S.pets.dex[p.id] || 0) & 1);
    S.pets.dex[p.id] = (S.pets.dex[p.id] || 0) | 1;
    S.pets.hatched++;
    out.push({ p, isNew });
  }
  refreshPets();
  if (S.pets.eq.length < petSlots()) equipBest(false); else afterPetChange();
  return out;
}

// ---------- 부화 화면 ----------
const HATCH_NS = [1, 3, 10, 50];
let hatchOpen = false, hatchEgg = 0, hatchN = 1, hatchAuto = false, hatchBusy = false, hatchTimer = 0, hatchRes = null;
function eggCss(E) { return '--c1:' + E.c1 + ';--c2:' + E.c2; }
function openEgg(ei) {
  if (raid) return;
  hatchEgg = ei;
  hatchOpen = true;
  hatchAuto = false;
  keys.clear(); P.jumpHeld = false;
  hatchRes = null;
  if (shopOpen) closeShop();
  $('hatch').classList.remove('hidden');
  syncPointerLock();
  renderHatch('ready');
}
function closeHatch() {
  if (!hatchOpen) return;
  clearTimeout(hatchTimer);
  if (hatchBusy) finishHatch(true);
  hatchOpen = false; hatchAuto = false; hatchBusy = false;
  $('hatch').classList.add('hidden');
  canvas.focus();
  syncPointerLock();
}
function renderHatch(state) {
  const E = EGGS[hatchEgg];
  $('hTitle').textContent = E.name;
  $('hTitle').style.color = E.c2;
  const st = $('hStage');
  st.className = '';
  if (state === 'ready') {
    st.innerHTML = '<div class="hEgg idle big" style="' + eggCss(E) + '"></div>';
    $('hSub').innerHTML = '1개 <b>' + fmt(E.cost) + '</b> 코인 · 가진 코인 ' + fmt(S.coins);
  }
  // 확률표 (도감에 없는 펫은 실루엣)
  const odds = $('hOdds');
  odds.innerHTML = eggPets(hatchEgg).map((p) => {
    const known = (S.pets.dex[p.id] || 0) & 1;
    return '<div class="hOdd" style="--rc:' + RAR[p.rar].css + '">' + petImg(p.id, 0, '', !known) + '<b class="' + (p.rar >= 6 ? 'rAura' : '') + '">' + pctTxt(p.pct) + '%</b><small>' + (known ? esc(p.name) : '???') + '</small><i>' + RAR[p.rar].name + '</i></div>';
  }).join('');
  renderHatchBtns();
}
function renderHatchBtns() {
  const E = EGGS[hatchEgg], box = $('hBtns');
  box.innerHTML = '';
  if (hatchBusy) { box.appendChild(el('div', 'hSkip', '눌러서 건너뛰기')); return; }
  for (const n of HATCH_NS) {
    const lock = n >= 10 && !petX10();
    const b = el('button', 'buy', (lock ? n + '개 · 도감 10종에 열림' : n + '개 뽑기') + '<br>' + fmt(E.cost * n));
    b.disabled = lock || S.coins < E.cost * n;
    b.onclick = () => { hatchN = n; doHatch(); };
    box.appendChild(b);
  }
  const au = el('button', 'buy alt' + (hatchAuto ? ' on' : ''), hatchAuto ? '자동 끄기' : '자동 뽑기<br><small>' + hatchN + '개씩</small>');
  au.onclick = () => { hatchAuto = !hatchAuto; renderHatchBtns(); if (hatchAuto) doHatch(); };
  box.appendChild(au);
  if (fuseAllPlan().g) box.appendChild(fuseAllBtn(() => renderHatchBtns()));
  const c = el('button', 'buy alt', '닫기');
  c.onclick = closeHatch;
  box.appendChild(c);
}
function doHatch() {
  if (hatchBusy || !hatchOpen) return;
  const E = EGGS[hatchEgg];
  const res = hatch(hatchEgg, hatchN);
  if (!res) {
    SFX.err();
    if (hatchAuto) { hatchAuto = false; toast('코인이 부족해서 자동 뽑기를 멈췄어요', 'bad'); }
    else toast(hatchN >= 10 && !petX10() ? '도감 10종을 모으면 ' + hatchN + '개 뽑기가 열려요' : '코인이 부족해요', 'bad');
    renderHatchBtns();
    return;
  }
  hatchBusy = true;
  hatchRes = res;
  $('hTitle').textContent = E.name;
  const hi = Math.max(...res.map((r) => r.p.rar));
  const st = $('hStage');
  st.className = res.length > 3 ? 'many' : '';
  if (res.length > 10) { st.className = ''; st.innerHTML = '<div class="hEgg big shake' + (hi >= 5 ? ' glow' : '') + (hi >= 6 ? ' aura' : '') + '" style="' + eggCss(E) + '"><b class="eggN">x' + res.length + '</b></div>'; }
  else st.innerHTML = res.map((r) => '<div class="hEgg shake' + (r.p.rar >= 5 ? ' glow' : '') + (r.p.rar >= 6 ? ' aura' : '') + '" style="' + eggCss(E) + '"></div>').join('');
  $('hSub').innerHTML = '부화 중…';
  // 자동 뽑기 중엔 처음 보는 전설 이상이 아니면 빠르게
  const fast = hatchAuto && !autoStopHit(res);
  const wait = fast ? 520 : 1000 + (hi >= 4 ? 450 : 0) + (hi >= 6 ? 1100 : 0);
  for (let k = 0; k < Math.floor(wait / 160); k++) tone(420 + k * 40, 0.05, 'triangle', 0.04, 0, k * 0.16);
  renderHatchBtns();
  hatchTimer = setTimeout(() => finishHatch(false), wait);
}
// 자동 뽑기는 도감에 없던 전설 이상 펫이 나올 때만 멈춰요 (이미 가진 펫이면 계속)
function autoStopHit(res) { return res.some((r) => r.isNew && r.p.rar >= 5); }
function finishHatch(quiet) {
  if (!hatchBusy) return;
  clearTimeout(hatchTimer);
  hatchBusy = false;
  const res = hatchRes || [];
  const hi = Math.max(0, ...res.map((r) => r.p.rar));
  const news = res.filter((r) => r.isNew);
  if (news.length > 3) toast('도감 등록 ' + news.length + '종 · ' + news.map((r) => r.p.name).join(', '), 'good', 4200);
  else for (const r of news) toast('도감 등록 · ' + r.p.name + ' (' + RAR[r.p.rar].name + ')', 'good', 2600);
  if (quiet || !hatchOpen) return;
  const st = $('hStage');
  let show = res.map((r) => ({ p: r.p, isNew: r.isNew, n: 1 }));
  if (res.length > 10) {
    const m = new Map();
    for (const r of res) { const g = m.get(r.p.id); if (g) { g.n++; g.isNew = g.isNew || r.isNew; } else m.set(r.p.id, { p: r.p, isNew: r.isNew, n: 1 }); }
    show = [...m.values()].sort((A, B) => (B.p.rar - A.p.rar) || (B.n - A.n));
    st.className = 'many';
  }
  st.innerHTML = show.map((r) => '<div class="hPet r' + r.p.rar + '" style="--rc:' + RAR[r.p.rar].css + '">' + petImg(r.p.id, 0) +
    '<b>' + esc(r.p.name) + '</b><span class="' + (r.p.rar >= 6 ? 'rAura' : '') + '">' + RAR[r.p.rar].name + '</span>' + (r.n > 1 ? '<i class="hcnt">x' + r.n + '</i>' : '') + (r.isNew ? '<i class="new">NEW</i>' : '') + '</div>').join('');
  if (hi >= 6) {
    const fl = $('hFlash'); fl.classList.remove('on', 'aura'); void fl.offsetWidth; fl.classList.add('on', 'aura');
    [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, 0, i * 0.08));
    $('hTitle').innerHTML = '<span class="rAura">아우라 등급!</span>';
  } else if (hi >= 4) {
    const fl = $('hFlash'); fl.classList.remove('on', 'aura'); void fl.offsetWidth; fl.classList.add('on');
    SFX.finish();
  } else if (hi >= 2) SFX.star(); else SFX.cp();
  if (res.length > 10) {
    const cnt = RAR.map(() => 0); for (const r of res) cnt[r.p.rar]++;
    $('hSub').innerHTML = '<div class="hSum">' + cnt.map((c, k) => c ? '<span class="' + (k >= 6 ? 'rAura' : '') + '" style="color:' + RAR[k].css + '">' + RAR[k].name + ' ' + c + '</span>' : '').join('') + '<span>· 가진 코인 ' + fmt(S.coins) + '</span></div>';
  } else $('hSub').innerHTML = res.length === 1 ? (res[0].p.what + ' · ' + petStatTxt(res[0].p, 0)) : '가진 코인 ' + fmt(S.coins);
  if (hatchAuto && autoStopHit(res)) { hatchAuto = false; toast('새 ' + RAR[Math.max(...res.filter((r) => r.isNew).map((r) => r.p.rar))].name + ' 펫이 나와서 자동 뽑기를 멈췄어요', 'gold'); }
  renderHatchBtns();
  renderHatchOdds();
  if (hatchAuto) hatchTimer = setTimeout(() => { if (hatchAuto && hatchOpen) doHatch(); }, 650);
}
function renderHatchOdds() {
  for (const [i, p] of eggPets(hatchEgg).entries()) {
    const d = $('hOdds').children[i];
    if (!d) continue;
    const known = (S.pets.dex[p.id] || 0) & 1;
    const img = d.querySelector('img');
    if (img) img.classList.toggle('sil', !known);
    d.querySelector('small').textContent = known ? p.name : '???';
  }
}
function fmtPct(x) { return stripZ((x * 100).toFixed(x < 0.1 ? 1 : 0)) + '%'; }
function petStatTxt(p, v) { return Object.keys(p.st).map((k) => PSTAT[k].name + ' +' + fmtPct(petStatVal(p, k, v))).join(' · '); }

// ---------- 아우라 능력 ----------
function airJumpMax() { return S.up.dbl + (PS.aura.whale ? 1 : 0); }
function phoenixBlast(w) {
  const R = 4.5, hits = [];
  for (const e of aliveEnemies()) {
    if (Math.abs((e.y || 0) - P.y) > 4 || !(e.hp > 0)) continue;
    if (Math.hypot(e.x - P.x, e.z - P.z) - (e.r || 0) <= R) hits.push(e);
  }
  if (!hits.length) return;
  for (const e of hits) if (e.hp > 0 && (e.alive !== false)) dealDamage(e, w.dmg * 0.5, 2, w);
  burst(P.x, P.y + 0.6, P.z, [0xff5a1f, 0xffb000, 0xffe066], 26, 8, 0.2, 2, 0.2, 0.6);
  tone(180, 0.18, 'sawtooth', 0.04, -80);
}

// ---------- 상점 › 펫 탭 (화면의 펫 도감 버튼으로 열면 상점 탭 없이 펫 화면만) ----------
let petView = 'egg', petPanel = false;
function setPetMode(on) {
  petPanel = on;
  $('shop').classList.toggle('petMode', on);
  $('shopTitle').textContent = on ? '펫 · 도감' : '상점';
}
function openPetPanel(view) {
  if (view) petView = view;
  openShop('pet');
  setPetMode(true);
}
function togglePetPanel() { if (shopOpen && petPanel) closeShop(); else openPetPanel('dex'); }
function refreshDexBtn() { const b = $('dexCnt'); if (b) b.textContent = DEX.n + '/' + PETS.length; }
function renderPetTab(body) {
  const seg = el('div', 'seg', '<span>펫 · 도감 ' + DEX.n + '/' + PETS.length + '</span>');
  const box = el('div');
  for (const [k, n] of [['egg', '뽑기'], ['inv', '내 펫'], ['dex', '도감']]) {
    const b = el('button', petView === k ? 'on' : '', n);
    b.onclick = () => { petView = k; renderShop(); };
    box.appendChild(b);
  }
  seg.appendChild(box);
  body.appendChild(seg);
  if (petView === 'egg') {
    const c = el('div', 'card', '<h4>펫 뽑기</h4><p>알을 깨서 펫을 얻어요. 비싼 알일수록 높은 등급이 잘 나와요. 아우라 펫은 오로라 알과 아우라 알(아우라 펫마다 3%)에서 나와요. 펫은 환생해도 사라지지 않아요.</p>');
    const go = el('button', 'buy alt wide', '펫 부화장으로 가기');
    go.onclick = () => { closeShop(); enterHatch(); };
    c.appendChild(go);
    body.appendChild(c);
    EGGS.forEach((E, i) => {
      const { r, mid, btn, sw } = row('', 'transparent');
      sw.className = 'sw eggSw';
      sw.setAttribute('style', eggCss(E));
      const pc = eggRarPct(i);
      const bar = pc.map((x, k) => x > 0 ? '<i style="flex:' + Math.max(x, 2.5) + ';background:' + RAR[k].css + '"></i>' : '').join('');
      const txt = pc.map((x, k) => x > 0 ? '<span style="color:' + RAR[k].css + '"' + (k >= 6 ? ' class="rAura"' : '') + '>' + RAR[k].name + ' ' + pctTxt(x) + '%</span>' : '').filter(Boolean).join(' · ');
      mid.innerHTML = '<div class="nm">' + E.name + ' <small>' + fmt(E.cost) + ' 코인</small></div><div class="oddBar">' + bar + '</div><div class="ds">' + txt + '</div>';
      btn.className = 'buy alt'; btn.textContent = '열기';
      btn.onclick = () => openEgg(i);
      body.appendChild(r);
    });
  } else if (petView === 'inv') {
    const slots = petSlots();
    const c = el('div', 'card');
    const eff = Object.keys(PSTAT).filter((k) => PS[k] > 0).map((k) => '<span>' + PSTAT[k].name + (PSTAT[k].cap && PS[k] >= PSTAT[k].cap - 1e-9 ? ' (최대)' : '') + '</span><span>+' + fmtPct(PS[k]) + '</span>').join('');
    const aur = PETS.filter((p) => p.aura && PS.aura[p.aura]).map((p) => '<p class="rAura" style="margin-top:6px">' + esc(p.special) + '</p>').join('');
    c.innerHTML = '<h4>데리고 다니는 펫 ' + S.pets.eq.length + '/' + slots + '</h4>' +
      (eff ? '<div class="kv">' + eff + '<span>도감 보너스 (수입)</span><span>+' + Math.round((dexMult() - 1) * 100) + '%</span></div>' : '<p>펫을 장착하면 효과가 여기에 보여요. 도감에 등록한 펫은 장착하지 않아도 수입 보너스를 줘요.</p>') + aur;
    const rb = el('div', 'btnRow');
    const b1 = el('button', 'buy', '가장 센 펫 장착');
    b1.onclick = () => { equipBest(true); renderShop(); };
    const b2 = el('button', 'buy alt', '모두 내려놓기');
    b2.onclick = () => { S.pets.eq = []; afterPetChange(); renderShop(); };
    rb.append(b1, b2, fuseAllBtn(() => renderShop()));
    c.appendChild(rb);
    body.appendChild(c);
    const list = ownedPetList().sort((A, B) => (B.p.rar - A.p.rar) || (B.v - A.v) || petScore(B.p, B.v) - petScore(A.p, A.v));
    if (!list.length) { body.appendChild(el('div', 'card', '<p>아직 펫이 없어요. 펫 부화장에서 알을 깨 보세요. 쿠키 알은 1억 코인이에요.</p>')); return; }
    body.appendChild(el('div', 'seg', '<span>같은 펫 ' + FUSE_N + '마리 → 황금 (효과 2배) · 황금 ' + FUSE_N + '마리 → 무지개 (4배) · 일괄 합성은 되는 만큼 한 번에</span>'));
    const grid = el('div', 'petGrid');
    for (const { p, v, c: cnt } of list) {
      const eqn = petEquipped(p.id, v);
      const card = el('div', 'pcard' + (eqn ? ' eq' : '') + (v ? ' v' + v : ''));
      card.style.setProperty('--rc', RAR[p.rar].css);
      card.innerHTML = petImg(p.id, v) + '<span class="pcnt">x' + cnt + (eqn ? ' · 장착 ' + eqn : '') + '</span>' +
        '<div class="pnm">' + (v ? '<em class="vb v' + v + '">' + PVAR[v].name + '</em> ' : '') + esc(p.name) + '</div>' +
        '<div class="prar' + (p.rar >= 6 ? ' rAura' : '') + '">' + RAR[p.rar].name + ' · ' + esc(p.what) + '</div>' +
        '<div class="pst">' + petStatTxt(p, v).replace(/\+([0-9.]+%)/g, '<b>+$1</b>') + (p.special ? '<br><span class="rAura">' + esc(p.special) + '</span>' : '') + '</div>';
      const bb = el('div', 'pbtns');
      const free = cnt - eqn;
      if (free > 0) { const b = el('button', 'buy', '장착'); b.disabled = S.pets.eq.length >= slots; b.onclick = () => { if (equipPet(p.id, v)) renderShop(); }; bb.appendChild(b); }
      if (eqn) { const b = el('button', 'buy alt', '해제'); b.onclick = () => { unequipPet(p.id, v); renderShop(); }; bb.appendChild(b); }
      if (v < 2) { const b = el('button', 'buy fuse', (v ? '무지개' : '황금') + ' ' + Math.min(cnt, FUSE_N) + '/' + FUSE_N); b.disabled = cnt < FUSE_N; b.onclick = () => { if (fusePet(p.id, v)) renderShop(); }; bb.appendChild(b); }
      card.appendChild(bb);
      grid.appendChild(card);
    }
    body.appendChild(grid);
  } else {
    const c = el('div', 'card');
    const ms = DEX_MS.map((m) => '<span' + (DEX.n >= m.n ? ' class="ok"' : '') + '>' + m.n + '종 · ' + m.txt + '</span>').join('');
    c.innerHTML = '<h4>펫 도감 ' + DEX.n + '/' + PETS.length + '</h4><p>새 펫을 등록할 때마다 영구 수입 <b class="mint">+3%</b>, 황금은 +2%, 무지개는 +3%예요. 지금 <b class="mint">+' + Math.round((dexMult() - 1) * 100) + '%</b> · 펫 칸 ' + petSlots() + '칸 · 부화 ' + fmt(S.pets.hatched) + '번</p><div class="msList">' + ms + '</div>';
    body.appendChild(c);
    EGGS.forEach((E, ei) => {
      if (E.mix) return; // 아우라 알은 모든 펫이 나와서 도감에 따로 묶지 않아요
      body.appendChild(el('div', 'seg', '<span>' + E.name + ' · ' + fmt(E.cost) + ' 코인</span>'));
      const grid = el('div', 'dexGrid');
      for (const p of eggPets(ei)) {
        const d = S.pets.dex[p.id] || 0, known = d & 1;
        const card = el('div', 'dcard' + (known ? '' : ' unk'));
        card.style.setProperty('--rc', RAR[p.rar].css);
        card.innerHTML = petImg(p.id, d & 4 ? 2 : d & 2 ? 1 : 0, '', !known) +
          '<b>' + (known ? esc(p.name) : '???') + '</b><span class="' + (p.rar >= 6 ? 'rAura' : '') + '" style="color:' + RAR[p.rar].css + '">' + RAR[p.rar].name + ' · ' + pctTxt(p.pct) + '%</span>' +
          '<div class="dvar"><i class="' + (d & 1 ? 'on' : '') + '" title="일반"></i><i class="g ' + (d & 2 ? 'on' : '') + '" title="황금"></i><i class="r ' + (d & 4 ? 'on' : '') + '" title="무지개"></i></div>';
        grid.appendChild(card);
      }
      body.appendChild(grid);
    });
  }
}

function whatsNewV5() {
  showModal('펫과 도감이 생겼어요', '<div class="ctl">' +
    '<kbd>펫 부화장</kbd><span>허브 남쪽 분홍 문 (사냥터 문 옆). 알 6종, 1억 ~ 1경 코인. 비싼 알일수록 높은 등급이 잘 나와요</span>' +
    '<kbd>등급</kbd><span>노말 · 희귀 · 레어 · 유니크 · 신화 · 전설, 그리고 오로라 알(0.1%)과 아우라 알에서 나오는 <span class="rAura">아우라</span></span>' +
    '<kbd>효과</kbd><span>코인 · 보석 · 무기 피해 · 체력 · 점프력 · 이동 속도. 아우라 펫은 고유 능력까지</span>' +
    '<kbd>합성</kbd><span>같은 펫 5마리 → 황금 (효과 2배), 황금 5마리 → 무지개 (4배)</span>' +
    '<kbd>도감</kbd><span>새 펫마다 영구 수입 +3%. 많이 모을수록 펫 칸과 10개 뽑기가 열려요</span></div>' +
    '<p>펫은 환생해도 사라지지 않아요. 상점 › 펫 탭에서도 뽑기와 도감을 볼 수 있어요.</p>',
    [{ t: '나중에', fn: () => { S.seenV5 = true; save(); } }, { t: '부화장 가기', primary: true, fn: () => { S.seenV5 = true; save(); enterHatch(); } }]);
}
