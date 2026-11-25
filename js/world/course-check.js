'use strict';
// =====================================================================
//  코스 난이도 자동 점검 (개발용: 점프로 갈 수 있는지 계산)
// =====================================================================
function colAt(c, s) {
  if (!c.move) return [c.x, c.y, c.z];
  const m = c.move, k = s * m.amp;
  return [m.ox + m.ax * k, m.oy + m.ay * k, m.oz + m.az * k];
}
function gapXZ(a, pa, b, pb) {
  if (a.t === 'c' && b.t === 'c') return Math.max(0, Math.hypot(pa[0] - pb[0], pa[2] - pb[2]) - a.r - b.r);
  if (a.t === 'b' && b.t === 'b') {
    const dx = Math.max(0, Math.abs(pa[0] - pb[0]) - a.hx - b.hx), dz = Math.max(0, Math.abs(pa[2] - pb[2]) - a.hz - b.hz);
    return Math.hypot(dx, dz);
  }
  const [bx, bp, cc, cp] = a.t === 'b' ? [a, pa, b, pb] : [b, pb, a, pa];
  const qx = clamp(cp[0], bp[0] - bx.hx, bp[0] + bx.hx), qz = clamp(cp[2], bp[2] - bx.hz, bp[2] + bx.hz);
  return Math.max(0, Math.hypot(cp[0] - qx, cp[2] - qz) - cc.r);
}
function checkCourses() {
  const out = [];
  for (const C of Object.values(courses)) out.push(...checkPairs(C.pairs, C.gs, C.zid));
  return out;
}
function checkPairs(pairs, gs = 1, zid = 0) {
  const out = [];
  const SPEED = 9, JUMP = 12, GRAV = 32;
  {
    const g = GRAV * gs;
    const C = { zid };
    for (const [a, b] of pairs) {
      const v0 = a.bounce || JUMP;
      let best = null;
      const S1 = a.move ? 17 : 1, S2 = b.move ? 17 : 1;
      for (let i = 0; i < S1; i++) for (let j = 0; j < S2; j++) {
        const sa = S1 > 1 ? -1 + 2 * i / (S1 - 1) : 0, sb = S2 > 1 ? -1 + 2 * j / (S2 - 1) : 0;
        const pa = colAt(a, sa), pb = colAt(b, sb);
        const topA = pa[1] + a.hy, topB = pb[1] + b.hy;
        const dy = topB - topA;
        const gap = gapXZ(a, pa, b, pb);
        const apex = v0 * v0 / (2 * g);
        let ok = false, reach = 0;
        if (dy <= apex * 0.9) {
          const t = (v0 + Math.sqrt(Math.max(0, v0 * v0 - 2 * g * dy))) / g;
          reach = SPEED * t * 0.85 + 0.3;
          ok = gap <= reach;
        }
        const score = gap - reach;
        if (!best || (ok && !best.ok) || (ok === best.ok && score < best.score)) best = { ok, gap, dy, reach, score };
      }
      if (!best.ok) out.push({ zone: C.zid, a: a.id, b: b.id, gap: +best.gap.toFixed(2), dy: +best.dy.toFixed(2), reach: +best.reach.toFixed(2) });
    }
  }
  return out;
}
