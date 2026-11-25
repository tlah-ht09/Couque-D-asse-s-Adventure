'use strict';
// =====================================================================
//  UI: HUD, 상점, 모달, 미니맵
// =====================================================================
function refreshSoundIcon() {
  $('sndIco').innerHTML = muted
    ? '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'
    : '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/>';
}
function toggleMute() { muted = !muted; S.mute = muted; refreshSoundIcon(); toast(muted ? '소리 꺼짐' : '소리 켜짐', '', 1200); }

let hudT = 0, lastBuffKey = '';
function updateHUD(dt) {
  hudT -= dt;
  if (hudT > 0 && !dirty) return;
  hudT = 0.1;
  const cps = totalCps();
  $('coins').textContent = fmt(S.coins);
  $('cps').textContent = fmt(cps, true);
  $('clickv').textContent = fmt(clickValue(), true);
  $('mineVal').textContent = '+' + fmt(clickValue(), true);
  $('gemsTxt').textContent = fmt(S.gems);
  $('multChip').textContent = '배율 x' + fmt(globalMult(), true);
  $('starChip').textContent = '별 ' + S.stars.length + '/' + stars.length;
  const rc = $('rebChip');
  if (S.rlv > 0) { rc.classList.remove('hidden'); rc.textContent = '환생 Lv.' + S.rlv; } else rc.classList.add('hidden');
  // 버프
  const now = performance.now(), nowD = Date.now();
  const items = [];
  if (boostActive()) items.push(['boost', '바람의 가호 x2 · ' + fmtDur((S.boostEnd - nowD) / 1000)]);
  for (const b of buffs) if (b.end > now) items.push([b.kind, b.label + ' · ' + Math.ceil((b.end - now) / 1000) + '초']);
  const key = items.map((x) => x[1]).join('|');
  if (key !== lastBuffKey) {
    lastBuffKey = key;
    const box = $('buffs');
    box.innerHTML = '';
    for (const [k, t] of items) { const e = document.createElement('span'); e.className = 'chip buff ' + k; e.textContent = t; box.appendChild(e); }
    box.classList.toggle('hidden', !items.length);
  }
  renderQuest();
  // 타이머 / 층수
  if (P.course) { $('timer').classList.remove('hidden'); $('ttime').textContent = (nowSec() - P.courseT0).toFixed(2); }
  else if (P.trackOn === 'tower') { $('timer').classList.remove('hidden'); $('tzone').textContent = '끝없는 탑 · 최고 ' + S.tower.best + '층'; $('ttime').textContent = P.trackFloor.tower + '층'; }
  else if (!$('timer').classList.contains('hidden') && !P.course) hideTimer();
  if (shopOpen) { $('shopCoins').textContent = fmt(S.coins); $('shopGems').textContent = fmt(S.gems); updateShop(); }
  dirty = false;
}

// ---------- 상점 ----------
let shopOpen = false, shopTab = 'gen', buyAmt = 1;
const TABS = [['gen', '생산'], ['upg', '강화'], ['war', '전투'], ['pet', '펫'], ['gem', '보석'], ['world', '월드'], ['reb', '환생'], ['ach', '업적'], ['rank', '랭킹'], ['set', '설정']];
function openShop(tab) {
  setPetMode(false);
  if (tab) shopTab = tab;
  shopOpen = true;
  syncPointerLock();
  $('shop').classList.remove('hidden');
  renderTabs();
  renderShop();
}
function closeShop() { setPetMode(false); shopOpen = false; $('shop').classList.add('hidden'); canvas.focus(); syncPointerLock(); }
function renderTabs() {
  const nav = $('tabs');
  nav.innerHTML = '';
  for (const [k, n] of TABS) {
    const b = document.createElement('button');
    b.textContent = n;
    b.id = 'tab-' + k;
    if (k === shopTab) b.className = 'on';
    b.onclick = () => { shopTab = k; renderTabs(); renderShop(); };
    nav.appendChild(b);
  }
  const on = nav.querySelector('.on');
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
const shopRefs = [];
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function row(swText, swColor) {
  const r = el('div', 'row');
  const sw = el('div', 'sw', swText); sw.style.background = swColor;
  const mid = el('div');
  const btn = el('button', 'buy');
  r.append(sw, mid, btn);
  return { r, mid, btn, sw };
}
function renderShop() {
  const body = $('tabBody');
  body.innerHTML = '';
  shopRefs.length = 0;
  $('shopCoins').textContent = fmt(S.coins);
  $('shopGems').textContent = fmt(S.gems);
  const T = shopTab;
  if (T === 'gen') {
    const seg = el('div', 'seg', '<span>구매 수량</span>');
    const box = el('div');
    for (const [v, n] of [[1, 'x1'], [10, 'x10'], [0, '최대']]) {
      const b = el('button', buyAmt === v ? 'on' : '', n);
      b.onclick = () => { buyAmt = v; renderShop(); };
      box.appendChild(b);
    }
    seg.appendChild(box);
    body.appendChild(seg);
    GENS.forEach((g, i) => {
      if (i > 1 && S.gens[i - 1] === 0 && S.gens[i] === 0 && S.gens[i - 2] === 0) return;
      const { r, mid, btn } = row(String(i + 1), g.css);
      btn.onclick = () => {
        const n = buyAmt === 0 ? Math.max(1, genMaxAfford(i)) : buyAmt;
        if (buyGen(i, n)) updateShop(); else SFX.err();
      };
      body.appendChild(r);
      shopRefs.push(() => {
        const un = genUnlocked(i), lv = S.gens[i];
        r.classList.toggle('locked', !un);
        const n = buyAmt === 0 ? Math.max(1, genMaxAfford(i)) : buyAmt;
        const cost = genCost(i, n);
        const aw = S.awk[i] ? ' <em>각성 ' + S.awk[i] + '</em>' : '';
        mid.innerHTML = '<div class="nm">' + (un ? g.name : '???') + ' <small>Lv.' + lv + '</small>' + aw + '</div><div class="ds">' +
          (un ? '1레벨당 초당 <b>+' + fmt(g.inc * genMult(i) * globalMult(), true) + '</b> · 현재 <b>' + fmt(genIncome(i) * globalMult(), true) + '/초</b><br>Lv.' + nextMilestone(i) + ' 달성 시 생산량 <em>2배</em>' : '이전 드로퍼를 먼저 건설하세요') + '</div>';
        btn.innerHTML = (lv === 0 ? '건설' : '구매 x' + n) + '<br>' + fmt(cost);
        btn.disabled = !un || S.coins < cost;
      });
    });
    body.appendChild(el('div', 'card', '<p>허브 섬의 초록 발판을 밟아도 드로퍼를 살 수 있어요. 발판 위에 서 있으면 연속으로 구매해요. 레벨 100 이후에도 50레벨마다 생산량이 계속 2배가 돼요.</p>'));
  } else if (T === 'upg') {
    for (const u of UPGS) {
      const { r, mid, btn } = row(u.ico, u.css);
      btn.onclick = () => { if (buyUpg(u)) updateShop(); else SFX.err(); };
      body.appendChild(r);
      shopRefs.push(() => {
        const l = S.up[u.key], maxed = l >= u.max;
        let extra = '';
        if (u.key === 'click') extra = '현재 클릭당 <b>' + fmt(clickValue(), true) + '</b>';
        if (u.key === 'auto') extra = '현재 초당 <b>' + (S.up.auto * 0.5) + '회</b>';
        if (u.key === 'gold') extra = '현재 <b>' + (S.up.gold * 2) + '%</b>';
        if (u.key === 'speed') extra = '현재 <b>x' + speedMult().toFixed(2) + '</b>';
        if (u.key === 'jump') extra = '현재 <b>x' + jumpMult().toFixed(2) + '</b>';
        if (u.key === 'offline') extra = '현재 <b>' + Math.round(offlineEff() * 100) + '%</b> · 최대 ' + offlineCap() / 3600 + '시간';
        mid.innerHTML = '<div class="nm">' + u.name + ' <small>' + (u.max > 1 ? 'Lv.' + l + '/' + u.max : l ? '보유' : '') + '</small></div><div class="ds">' + u.desc + (extra ? '<br>' + extra : '') + '</div>';
        if (maxed) { btn.className = 'buy done'; btn.textContent = u.max > 1 ? '최대' : '보유 중'; btn.disabled = true; }
        else { btn.className = 'buy'; btn.innerHTML = '강화<br>' + fmt(upgCost(u)); btn.disabled = S.coins < upgCost(u); }
      });
    }
  } else if (T === 'war') {
    renderWarTab(body);
  } else if (T === 'pet') {
    renderPetTab(body);
  } else if (T === 'gem') {
    body.appendChild(el('div', 'card', '<h4>하늘 보석</h4><p>끝없는 탑, 메달, 오늘의 도전, 별 조각, 업적, 황금 별똥별에서 얻어요. 보석으로 산 것은 환생해도 사라지지 않아요.</p>'));
    const bst = row('x2', '#7af0ff');
    bst.btn.onclick = () => { if (buyBoost()) updateShop(); else SFX.err(); };
    body.appendChild(bst.r);
    shopRefs.push(() => {
      bst.mid.innerHTML = '<div class="nm">바람의 가호</div><div class="ds">30분 동안 모든 수입 2배 · 최대 4시간까지 쌓여요' + (boostActive() ? '<br>남은 시간 <b>' + fmtDur((S.boostEnd - Date.now()) / 1000) + '</b>' : '') + '</div>';
      bst.btn.className = 'buy alt'; bst.btn.innerHTML = '사용<br>보석 25'; bst.btn.disabled = S.gems < 25;
    });
    body.appendChild(el('div', 'seg', '<span>드로퍼 각성 · 생산량 x3, 끝없이 강화</span>'));
    GENS.forEach((g, i) => {
      if (!genUnlocked(i) && !S.awk[i]) return;
      const { r, mid, btn } = row('★' + (S.awk[i] || 0), g.css);
      btn.onclick = () => { if (awaken(i)) renderShop(); else SFX.err(); };
      body.appendChild(r);
      shopRefs.push(() => {
        const req = awkReq(i), ok = S.gens[i] >= req;
        mid.innerHTML = '<div class="nm">' + g.name + ' <small>각성 ' + (S.awk[i] || 0) + '단계</small></div><div class="ds">' + (ok ? '생산량 <b>x' + fmt(Math.pow(3, (S.awk[i] || 0) + 1)) + '</b>로' : '드로퍼 <em>Lv.' + req + '</em> 필요 (지금 Lv.' + S.gens[i] + ')') + '</div>';
        btn.className = 'buy'; btn.innerHTML = '각성<br>보석 ' + fmt(awkCost(i)); btn.disabled = !ok || S.gems < awkCost(i);
      });
    });
    for (const [kind, list, title] of [['shirt', SHIRTS, '옷 색'], ['hat', HATS, '모자'], ['trail', TRAILS, '이동 꼬리']]) {
      body.appendChild(el('div', 'seg', '<span>꾸미기 · ' + title + '</span>'));
      const grid = el('div', 'skins');
      for (const it of list) {
        const b = el('button', 'skin');
        b.onclick = () => { if (buySkin(kind, it)) renderShop(); else SFX.err(); };
        grid.appendChild(b);
        shopRefs.push(() => {
          const own = S.skin.owned.includes(it.id), on = S.skin[kind] === it.id;
          b.className = 'skin' + (on ? ' on' : '');
          const dot = kind === 'shirt' ? '<i style="background:#' + new THREE.Color(it.c).getHexString() + '"></i>' : kind === 'trail' && it.cols ? '<i style="background:linear-gradient(90deg,' + it.cols.map((c) => '#' + new THREE.Color(c).getHexString()).join(',') + ')"></i>' : '';
          b.innerHTML = dot + '<span>' + it.name + '</span><small>' + (on ? '착용 중' : own ? '착용' : '보석 ' + it.cost) + '</small>';
          b.disabled = !own && S.gems < it.cost;
        });
      }
      body.appendChild(grid);
    }
  } else if (T === 'world') {
    body.appendChild(el('div', 'card', '<h4>섬 지도</h4><p>다리를 놓아 새 섬을 열고 코스를 처음 완주하면 수입이 영구로 늘어나요. 빠르게 완주하면 메달과 보석을 받아요.</p>'));
    const hub = row('H', '#86d26f');
    hub.btn.className = 'buy alt'; hub.btn.textContent = '이동';
    hub.btn.onclick = () => { goHome(true); closeShop(); };
    hub.mid.innerHTML = '<div class="nm">허브 섬</div><div class="ds">크리스탈과 드로퍼가 있는 본거지</div>';
    body.appendChild(hub.r);
    const tw = row('∞', '#c3a6ff');
    tw.btn.className = 'buy alt'; tw.btn.textContent = '입장';
    tw.btn.onclick = () => { closeShop(); enterTower(0); };
    body.appendChild(tw.r);
    shopRefs.push(() => { tw.mid.innerHTML = '<div class="nm">끝없는 하늘 탑 <small>최고 ' + S.tower.best + '층</small></div><div class="ds">끝없이 이어지는 점프맵. 새 층마다 보석, 수입 <b>+1%/층</b> (지금 +' + Math.min(S.tower.best, 500) + '%)</div>'; });
    const tc = row('▲', '#7af0ff');
    tc.btn.className = 'buy alt';
    tc.btn.onclick = () => { closeShop(); continueTower(); };
    body.appendChild(tc.r);
    shopRefs.push(() => { const f = Math.floor(S.tower.best / 10) * 10; tc.mid.innerHTML = '<div class="nm">탑 이어하기</div><div class="ds">' + (f >= 10 ? f + '층 체크포인트에서 시작' : '10층에 도달하면 열려요') + '</div>'; tc.btn.textContent = '이어하기'; tc.btn.disabled = f < 10; });
    const ht = row('⚔', '#ff6b5b');
    ht.btn.className = 'buy alt'; ht.btn.textContent = '입장';
    ht.btn.onclick = () => { closeShop(); enterHunt(); };
    body.appendChild(ht.r);
    shopRefs.push(() => { ht.mid.innerHTML = '<div class="nm">사냥터 · 보스 레이드 <small>처치 ' + fmt(S.combat.kills) + '</small></div><div class="ds">몬스터를 잡아 코인과 보석을 벌고, 보스를 쓰러뜨려 유물 무기를 얻어요. 레이드 단계 합계 <b>' + raidTotal() + '</b></div>'; });
    const pt = row('P', '#ff8fbf');
    pt.btn.className = 'buy alt'; pt.btn.textContent = '이동';
    pt.btn.onclick = () => { closeShop(); enterHatch(); };
    body.appendChild(pt.r);
    shopRefs.push(() => { pt.mid.innerHTML = '<div class="nm">펫 부화장 <small>도감 ' + DEX.n + '/' + PETS.length + '</small></div><div class="ds">알을 깨서 펫을 얻어요. 데리고 다니면 코인·보석·피해·체력·점프·속도가 올라요</div>'; });
    const dy = row('D', '#ffd166');
    dy.btn.className = 'buy alt'; dy.btn.textContent = '입장';
    dy.btn.onclick = () => { closeShop(); enterDaily(); };
    body.appendChild(dy.r);
    shopRefs.push(() => { const today = S.daily.key === dateKey(); dy.mid.innerHTML = '<div class="nm">오늘의 도전 <small>연속 ' + dailyStreakNow() + '일</small></div><div class="ds">매일 바뀌는 4구간 코스. ' + (today ? '오늘 기록 <b>' + fmtTime(S.daily.best) + '</b>' : '첫 완주 시 보석 <em>' + Math.round((15 + 2 * Math.min(dailyStreakNow() + 1, 10)) * gemMult()) + '</em>') + '</div>'; });
    for (const z of ZONES) {
      const { r, mid, btn } = row(String(z.id), z.css);
      btn.onclick = () => {
        const open = z.sky ? S.launch : S.zones[z.id];
        if (!open) { if (!(z.sky ? buyLaunch() : buyZone(z))) SFX.err(); refreshPads(true); updateShop(); return; }
        closeShop();
        leaveTracks(); P.course = null; hideTimer();
        if (z.sky) { P.respawn = { ...SKY_SPAWN }; respawnAt(SKY_SPAWN); }
        else {
          const rr = { x: z.dir[0] * (ENTRY_D - 4), y: 0, z: z.dir[1] * (ENTRY_D - 4), yaw: Math.atan2(-z.dir[0], -z.dir[1]) };
          P.respawn = { ...rr }; respawnAt(rr);
        }
        SFX.cp();
      };
      body.appendChild(r);
      shopRefs.push(() => {
        const open = z.sky ? S.launch : S.zones[z.id];
        const rec = S.courses[z.id], m = S.medals[z.id] || 0;
        const zs = stars.filter((s) => s.zone === z.id), got = zs.filter((s) => s.taken).length;
        const medals = MEDALS[z.id].map((t, k) => '<span style="color:' + (m > k ? MEDAL_CSS[k] : '#5c6788') + '">' + MEDAL_NAMES[k][0] + ' ' + t + '초</span>').join(' · ');
        mid.innerHTML = '<div class="nm">' + z.name + ' <small>' + z.course + '</small></div><div class="ds">' +
          (rec && rec.clears ? '최고 <b>' + (rec.best ? fmtTime(rec.best) : '-') + '</b> · 보너스 <b>+' + Math.round(z.bonus * 100) + '%</b>' : '첫 완주 시 수입 <em>+' + Math.round(z.bonus * 100) + '%</em>') +
          '<br>' + medals + '<br>별 조각 ' + got + '/' + zs.length + '</div>';
        if (open) { btn.className = 'buy alt'; btn.textContent = '이동'; btn.disabled = false; }
        else { btn.className = 'buy'; btn.innerHTML = (z.sky ? '발사대' : '다리') + ' 건설<br>' + fmt(zoneCost(z)); btn.disabled = S.coins < zoneCost(z); }
      });
    }
  } else if (T === 'reb') {
    const card = el('div', 'card');
    body.appendChild(card);
    const btn = el('button', 'buy wide');
    btn.onclick = () => {
      const g = rebirthGain();
      if (g < 1) { SFX.err(); return; }
      showModal('환생할까요?', '<p>환생 레벨 <span class="hl">+' + g + '</span>와 환생 포인트 <span class="hl">' + g + '</span>를 받아요.</p><p>초기화: 코인, 드로퍼 레벨, 채굴 파워' + (S.rup.keep ? '' : ', 자동 채굴기, 황금 손길') + '</p><p>유지: 각성, 보석, 펫, 다리, 코스 기록·메달, 탑 기록, 별 조각, 업적, 이동 능력</p>',
        [{ t: '취소' }, { t: '환생하기', primary: true, fn: () => { doRebirth(); renderShop(); } }]);
    };
    body.appendChild(btn);
    shopRefs.push(() => {
      const g = rebirthGain();
      card.innerHTML = '<h4>환생</h4><p>이번 회차에 번 코인이 많을수록 환생 레벨을 더 받아요. 레벨 1당 전체 수입 +5%, 그리고 같은 수만큼 환생 포인트를 받아 아래 상점에서 써요.</p>' +
        '<div class="kv"><span>환생 레벨</span><span>' + S.rlv + ' (+' + (S.rlv * 5) + '%)</span><span>환생 포인트</span><span>' + S.rp + '</span>' +
        '<span>이번 회차 수익</span><span>' + fmt(S.runEarned) + '</span><span>지금 환생하면</span><span>+' + g + '</span></div>' +
        (g < 1 ? '<p style="margin-top:8px">이번 회차에 ' + fmt(Math.max(0, 1e7 - S.runEarned)) + ' 코인 더 벌면 환생할 수 있어요</p>' : '');
      btn.textContent = g < 1 ? '아직 환생할 수 없어요' : '환생하고 레벨 +' + g + ' 받기';
      btn.disabled = g < 1;
    });
    body.appendChild(el('div', 'seg', '<span>환생 상점 · 포인트로 영구 강화</span>'));
    for (const u of RUPGS) {
      const { r, mid, btn: b } = row(u.ico, u.css);
      b.onclick = () => { if (buyRupg(u)) updateShop(); else SFX.err(); };
      body.appendChild(r);
      shopRefs.push(() => {
        const l = S.rup[u.key] || 0, maxed = l >= u.max;
        let cur = '';
        if (u.key === 'mult') cur = '지금 +' + (25 * l) + '%';
        if (u.key === 'click') cur = '지금 x' + (1 + l);
        if (u.key === 'disc') cur = '지금 -' + Math.round((1 - discount()) * 100) + '%';
        if (u.key === 'start') cur = l ? '환생 후 ' + fmt(Math.pow(10, l + 2)) + ' 코인' : '';
        if (u.key === 'luck') cur = l ? '지금 +' + (15 * l) + '%' : '';
        if (u.key === 'rest') cur = '최대 ' + offlineCap() / 3600 + '시간';
        if (u.key === 'gain') cur = l ? '지금 +' + (10 * l) + '%' : '';
        if (u.key === 'gem') cur = l ? '지금 +' + (10 * l) + '%' : '';
        mid.innerHTML = '<div class="nm">' + u.name + ' <small>Lv.' + l + (u.max !== Infinity ? '/' + u.max : '') + '</small></div><div class="ds">' + u.desc + (cur ? '<br><b>' + cur + '</b>' : '') + '</div>';
        if (maxed) { b.className = 'buy done'; b.textContent = '최대'; b.disabled = true; }
        else { b.className = 'buy'; b.innerHTML = '강화<br>' + u.cost(l) + ' P'; b.disabled = S.rp < u.cost(l); }
      });
    }
  } else if (T === 'ach') {
    const head = el('div', 'card');
    body.appendChild(head);
    shopRefs.push(() => { head.innerHTML = '<h4>업적</h4><p>단계를 달성할 때마다 전체 수입 +2%와 보석을 받아요. 대부분의 업적은 끝없이 이어져요.</p><div class="kv"><span>달성 단계</span><span>' + achTiers() + '단계 (+' + achTiers() * 2 + '%)</span><span>메달</span><span>' + medalCount() + '/20 (+' + medalCount() * 3 + '%)</span></div>'; });
    for (const a of ACH) {
      const { r, mid, btn, sw } = row('', '#ffcf3f');
      btn.className = 'buy done';
      btn.disabled = true;
      body.appendChild(r);
      shopRefs.push(() => {
        const t = S.ach[a.key] || 0, next = a.th(t), v = a.val();
        sw.textContent = t;
        const fin = !isFinite(next);
        const pct = fin ? 100 : clamp(v / next * 100, 0, 100);
        mid.innerHTML = '<div class="nm">' + a.name + ' <small>' + t + '단계</small></div><div class="ds">' + (fin ? '모든 단계 달성!' : '다음: ' + fmt(next) + a.unit + ' (지금 ' + fmt(Math.floor(v)) + ')') + '</div><div class="bar" style="margin-top:6px"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
        btn.textContent = fin ? '완료' : Math.floor(pct) + '%';
      });
    }
  } else if (T === 'rank') {
    renderRank(body);
  } else if (T === 'set') {
    const c1 = el('div', 'card');
    c1.innerHTML = '<h4>조작</h4><label for="sensR">시점 회전 감도</label><input type="range" id="sensR" min="0.3" max="2.5" step="0.1">';
    body.appendChild(c1);
    const rg = c1.querySelector('#sensR');
    rg.value = S.sens;
    rg.oninput = () => { S.sens = +rg.value; };
    const touchUI = document.body.classList.contains('touch');
    c1.appendChild(el('p', '', touchUI ? '시프트락: 오른쪽 아래 자물쇠 버튼. 캐릭터가 화면 방향을 보고, 가운데 조준점 쪽 적을 노려요.' : '시프트락: Shift 키. 마우스가 화면에 고정돼 움직이기만 해도 시점이 돌아가고, 클릭하면 조준점 쪽으로 공격해요. Shift나 Esc로 풀어요.'));
    const slb = el('button', 'buy alt wide', shiftLock ? '시프트락 끄기' : '시프트락 켜기');
    slb.onclick = () => { toggleShiftLock(); slb.textContent = shiftLock ? '시프트락 끄기' : '시프트락 켜기'; };
    c1.appendChild(slb);
    const cg = el('div', 'card', '<h4>화질</h4><p>자동은 화면이 버벅이면 흐림 효과, 해상도, 그림자 순서로 한 단계씩 가볍게 바꿔요. 계속 느리면 저화질을 골라 보세요.</p>');
    const sg = el('div', 'seg', '<span>모드</span>');
    const gb = el('div');
    for (const [gv, gn] of [[0, '자동'], [1, '고화질'], [2, '저화질']]) {
      const b = el('button', S.gfx === gv ? 'on' : '', gn);
      b.onclick = () => { S.gfx = gv; if (gv === 0) S.gfxLv = 0; applyGfxSetting(); save(); renderShop(); };
      gb.appendChild(b);
    }
    sg.appendChild(gb);
    cg.appendChild(sg);
    const gnow = el('p', '', ''); gnow.id = 'gfxNow';
    cg.appendChild(gnow);
    body.appendChild(cg);
    shopRefs.push(() => { gnow.textContent = '지금: ' + gfxDesc(); });
    const c2 = el('div', 'card', '<h4>저장 코드</h4><p>자동 저장은 이 브라우저에 돼요. 다른 기기로 옮기려면 코드를 복사해 두세요.</p>');
    const ta = el('textarea'); ta.id = 'saveCode'; ta.placeholder = '저장 코드를 붙여 넣으세요';
    const rowb = el('div', 'btnRow');
    const bc = el('button', 'buy alt', '코드 복사');
    bc.onclick = () => {
      ta.value = exportCode();
      ta.select();
      try { navigator.clipboard.writeText(ta.value).then(() => toast('저장 코드를 복사했어요', 'good'), () => toast('코드를 길게 눌러 직접 복사해 주세요')); }
      catch (e) { toast('코드를 길게 눌러 직접 복사해 주세요'); }
    };
    const bi = el('button', 'buy', '코드 불러오기');
    bi.onclick = () => { if (importCode(ta.value)) { toast('저장을 불러왔어요', 'good'); renderShop(); } else toast('코드가 올바르지 않아요', 'bad'); };
    rowb.append(bc, bi);
    c2.append(ta, rowb);
    body.appendChild(c2);
    const c3 = el('div', 'card', '<h4>기록</h4>');
    const kv = el('div', 'kv');
    kv.innerHTML = '<span>누적 수익</span><span>' + fmt(S.lifeEarned) + '</span><span>모은 보석</span><span>' + fmt(S.gemsTotal) + '</span><span>채굴 횟수</span><span>' + fmt(S.clicks) + '</span><span>추락 횟수</span><span>' + fmt(S.deaths) + '</span><span>황금 별똥별</span><span>' + S.goldCaught + '번</span><span>플레이 시간</span><span>' + fmtDur(S.play) + '</span>';
    c3.appendChild(kv);
    body.appendChild(c3);
    const c4 = el('div', 'card', '<h4>처음부터</h4><p>모든 진행이 지워져요.</p>');
    const br = el('button', 'buy danger wide', '게임 초기화');
    br.onclick = () => showModal('정말 초기화할까요?', '<p>코인, 보석, 드로퍼, 다리, 기록, 별 조각, 꾸미기가 모두 사라져요. 되돌릴 수 없어요.</p>', [{ t: '취소' }, { t: '초기화', danger: true, fn: () => { resetGame(); closeShop(); toast('새 게임을 시작했어요'); } }]);
    c4.appendChild(br);
    body.appendChild(c4);
    const c5 = el('div', 'card', '<h4>피드백</h4><p>버그, 아이디어, 좋았던 점을 개발자에게 보내 주세요.</p>' + (fbOutbox.length ? '<p>보내는 중인 피드백 ' + fbOutbox.length + '개 · 연결되면 자동으로 보내요</p>' : ''));
    const bf = el('button', 'buy alt wide', '피드백 보내기');
    bf.onclick = openFeedback;
    c5.appendChild(bf);
    body.appendChild(c5);
    body.appendChild(el('div', 'card', '<h4>단축키</h4><p>WASD/방향키 이동 · Space 점프 · 드래그 시점 · 휠 줌 · F 채굴 · B 상점 · P 펫 도감 · H 허브 · R 체크포인트 · M 소리</p>'));
  }
  updateShop();
}
function updateShop() { for (const f of shopRefs) f(); }

// ---------- 모달 ----------
let modalOpen = false;
function showModal(title, html, btns) {
  $('mTitle').textContent = title;
  $('mBody').innerHTML = html;
  const box = $('mBtns');
  box.innerHTML = '';
  (btns || [{ t: '확인', primary: true }]).forEach((b) => {
    const e = el('button', 'buy' + (b.primary ? '' : ' alt') + (b.danger ? ' danger' : ''), esc(b.t));
    e.onclick = () => { hideModal(); if (b.fn) b.fn(); };
    box.appendChild(e);
  });
  $('modal').classList.remove('hidden');
  modalOpen = true;
  syncPointerLock();
  setTimeout(() => { const last = box.lastElementChild; if (last) last.focus(); }, 30);
}
function hideModal() { $('modal').classList.add('hidden'); modalOpen = false; canvas.focus(); syncPointerLock(); }

// ---------- 미니맵 ----------
const mm = $('minimap'), mctx = mm.getContext('2d');
function drawMinimap() {
  const W = mm.width, Hh = mm.height, cx = W / 2, cy = Hh / 2;
  const s = (W / 2) / 95;
  const c = mctx;
  c.clearRect(0, 0, W, Hh);
  c.save();
  c.beginPath(); c.arc(cx, cy, W / 2, 0, TAU); c.clip();
  c.fillStyle = 'rgba(24,34,66,0.9)'; c.fillRect(0, 0, W, Hh);
  const inSky = inSkyZone(P.x, P.y, P.z);
  const tx = (x) => cx + (x - P.x) * s, tz = (z) => cy + (z - P.z) * s;
  for (const is of islands) {
    if ((is.y > 60) !== inSky) continue;
    c.fillStyle = '#' + new THREE.Color(is.color).getHexString();
    c.globalAlpha = 0.9;
    c.beginPath(); c.arc(tx(is.x), tz(is.z), is.r * s, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  for (const z of ZONES) {
    if (!z.dir || !S.zones[z.id] || inSky) continue;
    const d = bridges[z.id].deck;
    c.fillStyle = '#c08a55';
    c.fillRect(tx(d.x - d.hx), tz(d.z - d.hz), d.hx * 2 * s, d.hz * 2 * s);
  }
  const drawCol = (n, color) => {
    const x = tx(n.x), y = tz(n.z);
    if (x < -10 || x > W + 10 || y < -10 || y > Hh + 10) return;
    c.fillStyle = color;
    const w = Math.max(4, n.hx * 2 * s), h = Math.max(4, n.hz * 2 * s);
    c.fillRect(x - w / 2, y - h / 2, w, h);
  };
  for (const C of Object.values(courses)) {
    const col = zoneById(C.zid).css;
    for (const n of C.nodes) if ((n.top > 60) === inSky) drawCol(n, col);
  }
  for (const T of [TT, DT]) {
    if (!T) continue;
    for (const b of T.built.values()) for (const n of b.cols) if (Math.abs(n.top - P.y) < 14 && !n.kill) drawCol(n, n.tcorner != null ? '#3ee6a5' : T.name === 'tower' ? '#c3a6ff' : '#ffd166');
  }
  for (const st of stars) {
    if (st.taken || (st.y > 60) !== inSky) continue;
    const x = tx(st.x), y = tz(st.z);
    if (Math.hypot(x - cx, y - cy) > W / 2) continue;
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
    c.strokeStyle = '#7a5200'; c.lineWidth = 2; c.stroke();
  }
  if (!inSky) {
    c.fillStyle = S.launch ? '#ffd166' : '#8a94b4';
    c.beginPath(); c.arc(tx(LAUNCH_POS.x), tz(LAUNCH_POS.z), 6, 0, TAU); c.fill();
  }
  if (inHunt() || raid) {
    for (const m of monsters) {
      if (!m.alive) continue;
      const x = tx(m.x), y = tz(m.z);
      if (Math.hypot(x - cx, y - cy) > W / 2) continue;
      c.fillStyle = m.elite ? '#ffcf3f' : '#ff5a5f';
      c.beginPath(); c.arc(x, y, m.elite ? 6 : 4, 0, TAU); c.fill();
    }
    if (raid && raid.boss.alive) { c.fillStyle = '#c77dff'; c.beginPath(); c.arc(tx(raid.boss.x), tz(raid.boss.z), 10, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); }
  }
  if (goldOrb && !goldOrb.taken) {
    let x = tx(goldOrb.x), y = tz(goldOrb.z);
    const dd = Math.hypot(x - cx, y - cy), R = W / 2 - 12;
    if (dd > R) { x = cx + (x - cx) / dd * R; y = cy + (y - cy) / dd * R; }
    c.fillStyle = Math.floor(performance.now() / 250) % 2 ? '#ffd23f' : '#ffffff';
    c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill();
    c.strokeStyle = '#7a5200'; c.lineWidth = 3; c.stroke();
  }
  c.translate(cx, cy);
  c.rotate(-cam.yaw);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 60, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); c.closePath(); c.fill();
  c.rotate(cam.yaw);
  c.rotate(-avatar.rotation.y);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#1a1f3a'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 10); c.lineTo(0, 5); c.lineTo(-10, 10); c.closePath(); c.fill(); c.stroke();
  c.restore();
  c.fillStyle = '#ffffff'; c.font = '26px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('N', cx, 22);
}
