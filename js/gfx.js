'use strict';
// =====================================================================
//  화질: 자동이면 프레임이 느릴 때 한 단계씩 가볍게 (흐림 효과 끄기 → 해상도 → 그림자)
// =====================================================================
const GFX_MAX = Math.min(devicePixelRatio, IS_TOUCH ? 1.5 : 2);
const GFX_STEPS = [
  { fx: true, pr: 1, sh: 2048 },
  { fx: false, pr: 1, sh: 2048 },
  { fx: false, pr: 0.8, sh: 2048 },
  { fx: false, pr: 0.65, sh: 1024 },
  { fx: false, pr: 0.5, sh: 1024 },
];
const gfx = { lv: -1, t0: 0, last: 0, frames: 0, slow: 0, warm: 0 };
function gfxPr(lv) { const st = GFX_STEPS[lv]; return lv === GFX_STEPS.length - 1 ? Math.max(0.75, GFX_MAX * st.pr) : Math.max(Math.min(1, GFX_MAX), GFX_MAX * st.pr); }
function gfxShadow(lv) { return Math.min(SM, GFX_STEPS[lv].sh); }
function setGfxLevel(lv) {
  lv = clamp(lv, 0, GFX_STEPS.length - 1);
  if (lv === gfx.lv) return;
  gfx.lv = lv;
  document.body.classList.toggle('lowfx', !GFX_STEPS[lv].fx);
  renderer.setPixelRatio(gfxPr(lv));
  renderer.setSize(innerWidth, innerHeight, false);
  const sh = gfxShadow(lv);
  if (sun.shadow.mapSize.x !== sh) {
    sun.shadow.mapSize.set(sh, sh);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
}
// S.gfx: 0 자동, 1 고화질, 2 저화질. 자동이 고른 단계는 S.gfxLv로 기억해서 다음 접속 때 그 단계부터 시작
function applyGfxSetting() {
  gfx.frames = 0; gfx.t0 = 0; gfx.slow = 0; gfx.warm = 0;
  if (S.gfx === 1) setGfxLevel(0);
  else if (S.gfx === 2) setGfxLevel(GFX_STEPS.length - 1);
  else setGfxLevel(S.gfxLv || 0);
}
function gfxTick(now) {
  if (S.gfx !== 0 || document.hidden) { gfx.t0 = 0; gfx.last = 0; return; }
  // 탭을 다녀오는 등 한 프레임이 너무 길면 그 구간은 버려요
  if (gfx.last && now - gfx.last > 1000) { gfx.t0 = 0; }
  gfx.last = now;
  if (!gfx.t0) { gfx.t0 = now; gfx.frames = 0; return; }
  gfx.frames++;
  const el = now - gfx.t0;
  if (el < 2500) return;
  const fps = gfx.frames * 1000 / el;
  gfx.t0 = now; gfx.frames = 0;
  if (gfx.warm < 2) { gfx.warm++; return; }
  if (fps < 42 && gfx.lv < GFX_STEPS.length - 1) {
    if (++gfx.slow >= 2) { gfx.slow = 0; setGfxLevel(gfx.lv + 1); S.gfxLv = gfx.lv; markDirty(); }
  } else gfx.slow = 0;
}
function gfxDesc() { return '해상도 x' + stripZ(gfxPr(gfx.lv).toFixed(2)) + ' · 그림자 ' + gfxShadow(gfx.lv) + (GFX_STEPS[gfx.lv].fx ? ' · 흐림 효과 켬' : ''); }
$('hatch').addEventListener('click', (e) => { if (hatchBusy && !e.target.closest('button')) finishHatch(false); });
