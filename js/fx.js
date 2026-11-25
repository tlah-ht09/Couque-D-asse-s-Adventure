'use strict';
// =====================================================================
//  무기 이펙트 엔진
// =====================================================================
let hitStop = 0;
const fxList = [];
const fxGeoCache = new Map();
function arcGeo(r0, r1, a0, len, segs = 36) {
  const key = [r0, r1, a0, len, segs].map((v) => v.toFixed(3)).join('|');
  if (fxGeoCache.has(key)) return fxGeoCache.get(key);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, a = a0 + len * u, c = Math.cos(a), s = Math.sin(a);
    pos.push(c * r0, s * r0, 0, c * r1, s * r1, 0);
    uv.push(u, 0, u, 1);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  fxGeoCache.set(key, g);
  return g;
}
const FX_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const SLASH_FS = `uniform vec3 c1; uniform vec3 c2; uniform float prog; uniform float fade; uniform float tail; uniform float edgeW; varying vec2 vUv;
void main(){
  float d = prog - vUv.x;
  if (d < 0.0) discard;
  float k = clamp(d / tail, 0.0, 1.0);
  float a = 1.0 - smoothstep(0.0, 1.0, k);
  float r = vUv.y;
  float inner = mix(0.25, 0.86, k);
  float body = smoothstep(inner, inner + 0.22, r) * (1.0 - smoothstep(0.96, 1.0, r) * 0.7);
  float edge = smoothstep(1.0 - edgeW, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
  float head = 1.0 - smoothstep(0.0, 0.07, d);
  vec3 col = mix(c2, c1, pow(r, 5.0)) + vec3(edge * 0.25 + head * 0.25);
  gl_FragColor = vec4(col, clamp((body * 0.85 + edge * 0.6 + head * 0.3 * body) * a * fade, 0.0, 1.0));
  #include <colorspace_fragment>
}`;
const BAND_FS = `uniform vec3 c1; uniform vec3 c2; uniform float fade; varying vec2 vUv;
void main(){
  float r = vUv.y;
  float a = smoothstep(0.0, 0.55, r) * (1.0 - smoothstep(0.8, 1.0, r));
  gl_FragColor = vec4(mix(c2, c1, r), a * fade);
  #include <colorspace_fragment>
}`;
const PILLAR_FS = `uniform vec3 c1; uniform float fade; varying vec2 vUv;
void main(){
  float a = (1.0 - vUv.y) * smoothstep(0.0, 0.08, vUv.y);
  gl_FragColor = vec4(c1 * 1.15, a * fade * 0.6);
  #include <colorspace_fragment>
}`;
function fxMat(fs, opts) {
  return new THREE.ShaderMaterial({
    vertexShader: FX_VS, fragmentShader: fs, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { c1: { value: new THREE.Color(opts.c1) }, c2: { value: new THREE.Color(opts.c2 != null ? opts.c2 : opts.c1) }, prog: { value: 0 }, fade: { value: 1 }, tail: { value: opts.tail || 0.55 }, edgeW: { value: opts.edgeW || 0.18 } },
  });
}
function addFx(obj, upd, life, disp) {
  scene.add(obj);
  fxList.push({ obj, upd, life, t: 0, disp });
}

// ---------- 베기 궤적 ----------
// 캐릭터 기준: 앞 = -Z, 오른쪽 = +X. tilt: 앞쪽 축 기준 기울기, dir: 1이면 오른쪽→왼쪽
const SLASH_PITCH = 0.38;
function slashArc(o) {
  const root = new THREE.Group();
  root.position.set(o.x, o.y, o.z);
  root.rotation.y = o.face;
  const pitch = new THREE.Group();
  pitch.rotation.x = o.pitch != null ? o.pitch : SLASH_PITCH;
  root.add(pitch);
  const tilt = new THREE.Group();
  tilt.rotation.z = o.tilt || 0;
  pitch.add(tilt);
  const arc = o.arc * Math.PI / 180;
  const geo = arcGeo(o.r0, o.r1, Math.PI / 2 - arc / 2, arc);
  // 바탕(색) + 광채(가산) 두 겹
  const base = new THREE.Mesh(geo, fxMat(SLASH_FS, Object.assign({}, o, { add: false })));
  const glow = new THREE.Mesh(geo, fxMat(SLASH_FS, { c1: o.c1, c2: o.c2, add: true, tail: (o.tail || 0.55) * 0.7, edgeW: 0.3 }));
  for (const m of [base, glow]) {
    m.rotation.x = -Math.PI / 2;
    if (o.dir < 0) m.scale.x = -1;
    tilt.add(m);
  }
  base.renderOrder = 4; glow.renderOrder = 5;
  const dur = o.dur || 0.16, tail = o.tail || 0.55, hold = o.hold || 0.2;
  const gop = o.add ? 0.55 : 0.18;
  addFx(root, (t) => {
    const p = Math.min(1 + tail, (t / dur) * (1 + tail));
    const f = t < dur ? 1 : Math.max(0, 1 - (t - dur) / hold);
    base.material.uniforms.prog.value = p; glow.material.uniforms.prog.value = p;
    base.material.uniforms.fade.value = (o.op || 1) * f;
    glow.material.uniforms.fade.value = gop * f;
    if (o.grow) root.scale.setScalar(1 + t * o.grow);
  }, dur + hold, () => { base.material.dispose(); glow.material.dispose(); });
}
// ---------- 충격파 링 ----------
function waveRing(x, y, z, o) {
  const m = new THREE.Mesh(arcGeo(0.62, 1, 0, TAU, 56), fxMat(BAND_FS, o));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.08, z);
  m.renderOrder = 3;
  const dur = o.dur || 0.45, R = o.r || 4;
  addFx(m, (t) => {
    const k = t / dur, e = 1 - Math.pow(1 - k, 2.2);
    let s = 0.3 + (R - 0.3) * e;
    if (o.wobble) s *= 1 + Math.sin(t * 34) * 0.07 * (1 - k);
    m.scale.setScalar(s);
    m.material.uniforms.fade.value = (o.op || 1) * (1 - k);
    if (o.spin) m.rotation.z += o.spin * 0.016;
  }, dur, () => m.material.dispose());
}
// ---------- 빛기둥 ----------
const pillarGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
function pillar(x, y, z, o) {
  const m = new THREE.Mesh(pillarGeo, fxMat(PILLAR_FS, Object.assign({ add: true }, o)));
  m.position.set(x, y + o.h / 2, z);
  m.scale.set(o.r, o.h, o.r);
  const dur = o.dur || 0.6;
  addFx(m, (t) => { const k = t / dur; m.material.uniforms.fade.value = (1 - k) * (k < 0.1 ? k / 0.1 : 1); m.scale.x = m.scale.z = o.r * (1 - k * 0.6); }, dur, () => m.material.dispose());
}

// ---------- 캔버스 텍스처 ----------
function cvTex(size, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const TEX = {
  flare: cvTex(128, (c, s) => {
    const h = s / 2;
    const g = c.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.75)'); g.addColorStop(0.45, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
    c.globalCompositeOperation = 'lighter';
    for (const [w, l] of [[3, h], [2, h * 0.7]]) {
      for (const a of (l === h ? [0, Math.PI / 2] : [Math.PI / 4, -Math.PI / 4])) {
        c.save(); c.translate(h, h); c.rotate(a);
        const lg = c.createLinearGradient(-l, 0, l, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = lg; c.fillRect(-l, -w, l * 2, w * 2); c.restore();
      }
    }
  }),
  crack: cvTex(256, (c, s) => {
    const h = s / 2;
    const g = c.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(70,55,40,0.55)'); g.addColorStop(0.5, 'rgba(70,55,40,0.2)'); g.addColorStop(1, 'rgba(70,55,40,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(40,30,22,0.9)'; c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      let a = (i / 9) * TAU + Math.random() * 0.4, x = h, y = h, r = 0;
      c.lineWidth = 7; c.beginPath(); c.moveTo(x, y);
      while (r < h * 0.92) { r += 14 + Math.random() * 14; a += (Math.random() - 0.5) * 0.6; x = h + Math.cos(a) * r; y = h + Math.sin(a) * r; c.lineTo(x, y); c.lineWidth *= 0.85; }
      c.stroke();
    }
  }),
  frost: cvTex(256, (c, s) => {
    const h = s / 2;
    const g = c.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(230,248,255,0.9)'); g.addColorStop(0.6, 'rgba(160,220,255,0.45)'); g.addColorStop(1, 'rgba(160,220,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      c.save(); c.translate(h, h); c.rotate((i / 6) * TAU);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h * 0.85); c.stroke();
      for (let k = 1; k <= 3; k++) { const y = -h * 0.22 * k; c.beginPath(); c.moveTo(0, y); c.lineTo(-18 + k * 3, y - 18); c.moveTo(0, y); c.lineTo(18 - k * 3, y - 18); c.stroke(); }
      c.restore();
    }
  }),
  splat: cvTex(256, (c, s) => {
    const h = s / 2;
    c.fillStyle = 'rgba(111,224,138,0.75)';
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, r = h * (0.55 + Math.random() * 0.3); i ? c.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r) : c.moveTo(h + Math.cos(a) * r, h + Math.sin(a) * r); }
    c.fill();
    for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, r = h * (0.75 + Math.random() * 0.2); c.beginPath(); c.arc(h + Math.cos(a) * r, h + Math.sin(a) * r, 6 + Math.random() * 10, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(220,255,225,0.5)'; c.beginPath(); c.ellipse(h - 20, h - 24, 30, 14, -0.5, 0, TAU); c.fill();
  }),
  rune: cvTex(256, (c, s) => {
    const h = s / 2;
    c.strokeStyle = '#ffffff'; c.lineWidth = 5;
    c.beginPath(); c.arc(h, h, h * 0.92, 0, TAU); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.arc(h, h, h * 0.78, 0, TAU); c.stroke();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; c.beginPath(); c.moveTo(h + Math.cos(a) * h * 0.8, h + Math.sin(a) * h * 0.8); c.lineTo(h + Math.cos(a) * h * (i % 2 ? 0.86 : 0.9), h + Math.sin(a) * h * (i % 2 ? 0.86 : 0.9)); c.stroke(); }
    c.lineWidth = 4;
    for (const off of [0, Math.PI / 3]) { c.beginPath(); for (let i = 0; i <= 3; i++) { const a = off + (i / 3) * TAU - Math.PI / 2; const x = h + Math.cos(a) * h * 0.74, y = h + Math.sin(a) * h * 0.74; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.beginPath(); c.arc(h, h, h * 0.3, 0, TAU); c.stroke();
  }),
  vortex: cvTex(256, (c, s) => {
    const h = s / 2;
    const g = c.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(10,0,25,0.95)'); g.addColorStop(0.35, 'rgba(60,20,110,0.75)'); g.addColorStop(0.75, 'rgba(155,93,229,0.35)'); g.addColorStop(1, 'rgba(155,93,229,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(210,170,255,0.85)'; c.lineWidth = 4;
    for (let k = 0; k < 4; k++) { c.beginPath(); for (let i = 0; i < 60; i++) { const t = i / 60, a = (k / 4) * TAU + t * 5, r = h * 0.9 * t; i ? c.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r) : c.moveTo(h, h); } c.stroke(); }
  }),
  dust: cvTex(128, (c, s) => {
    const h = s / 2;
    const g = c.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(235,225,205,0.9)'); g.addColorStop(0.6, 'rgba(210,200,180,0.5)'); g.addColorStop(1, 'rgba(210,200,180,0)');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
  }),
};
const planeGeo = new THREE.PlaneGeometry(1, 1);
function decal(x, y, z, tex, o) {
  const m = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: o.color != null ? o.color : 0xffffff, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2, fog: true }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = o.rot != null ? o.rot : Math.random() * TAU;
  m.position.set(x, y + 0.05, z);
  m.renderOrder = 2;
  const dur = o.dur || 1, s0 = o.s0 != null ? o.s0 : o.size, s1 = o.size;
  addFx(m, (t) => {
    const k = t / dur;
    m.scale.setScalar(lerp(s0, s1, Math.min(1, k * (o.growFast ? 6 : 2.5))));
    m.material.opacity = (o.op || 1) * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) * (k < 0.06 ? k / 0.06 : 1);
    if (o.spin) m.rotation.z += o.spin * 0.016;
  }, dur, () => m.material.dispose());
}

// ---------- 섬광 스프라이트 ----------
function flare(x, y, z, color, size = 2, dur = 0.25) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flare, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.position.set(x, y, z);
  sp.renderOrder = 7;
  sp.material.rotation = Math.random() * TAU;
  addFx(sp, (t) => { const k = t / dur; sp.scale.setScalar(size * (0.4 + 0.9 * Math.sin(Math.min(1, k * 1.6) * Math.PI / 2)) * (1 - k * 0.3)); sp.material.opacity = 1 - k; }, dur, () => sp.material.dispose());
}
// ---------- 광원 플래시 (고정 2개) ----------
const fxLights = [0, 1].map(() => { const l = new THREE.PointLight(0xffffff, 0, 12, 2); scene.add(l); return { l, t: 0, dur: 1, peak: 0 }; });
let fxLightIdx = 0;
function lightFlash(x, y, z, color, peak = 30, dur = 0.25) {
  const L = fxLights[fxLightIdx++ % fxLights.length];
  L.l.position.set(x, y, z); L.l.color.set(color); L.t = 0; L.dur = dur; L.peak = peak;
}

// ---------- 발광 파티클 (포인트 셰이더) ----------
const SPK = 1600;
const spkGeo = new THREE.BufferGeometry();
const spkPos = new Float32Array(SPK * 3), spkCol = new Float32Array(SPK * 3), spkSize = new Float32Array(SPK), spkA = new Float32Array(SPK);
spkGeo.setAttribute('position', new THREE.BufferAttribute(spkPos, 3).setUsage(THREE.DynamicDrawUsage));
spkGeo.setAttribute('pcol', new THREE.BufferAttribute(spkCol, 3).setUsage(THREE.DynamicDrawUsage));
spkGeo.setAttribute('psize', new THREE.BufferAttribute(spkSize, 1).setUsage(THREE.DynamicDrawUsage));
spkGeo.setAttribute('palpha', new THREE.BufferAttribute(spkA, 1).setUsage(THREE.DynamicDrawUsage));
const spkMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { scale: { value: 600 } },
  vertexShader: `attribute float psize; attribute float palpha; attribute vec3 pcol; uniform float scale; varying float vA; varying vec3 vC;
    void main(){ vA = palpha; vC = pcol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = palpha > 0.001 ? psize * scale / max(0.1, -mv.z) : 0.0; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying float vA; varying vec3 vC;
    void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * (0.7 + a * 0.9), a * a * vA);
    #include <colorspace_fragment>
    }`,
});
const spkPts = new THREE.Points(spkGeo, spkMat);
spkPts.frustumCulled = false;
spkPts.renderOrder = 8;
scene.add(spkPts);
const spk = [];
for (let i = 0; i < SPK; i++) spk.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, s0: 0.2, s1: 0, a: 1, swirl: 0, cx: 0, cz: 0 });
let spkIdx = 0;
function fitSparkScale() { spkMat.uniforms.scale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)); }
addEventListener('resize', fitSparkScale);
function sparks(x, y, z, o) {
  const n = o.n || 10, cols = Array.isArray(o.c) ? o.c : [o.c];
  for (let i = 0; i < n; i++) {
    const p = spk[spkIdx], j = spkIdx;
    spkIdx = (spkIdx + 1) % SPK;
    let dx, dy, dz;
    if (o.dir) {
      const s = o.spread || 0.4;
      dx = o.dir[0] + rand(-s, s); dy = o.dir[1] + rand(-s, s); dz = o.dir[2] + rand(-s, s);
    } else {
      const a = Math.random() * TAU, b = Math.acos(rand(-1, 1));
      dx = Math.sin(b) * Math.cos(a); dy = Math.cos(b); dz = Math.sin(b) * Math.sin(a);
      if (o.flat) dy *= 0.2;
    }
    const sp = (o.speed || 4) * rand(0.35, 1);
    const r = o.radius || 0;
    spkPos[j * 3] = x + (r ? rand(-r, r) : 0); spkPos[j * 3 + 1] = y + (r ? rand(-r, r) * (o.flat ? 0.2 : 1) : 0); spkPos[j * 3 + 2] = z + (r ? rand(-r, r) : 0);
    p.vx = dx * sp; p.vy = dy * sp + (o.up || 0); p.vz = dz * sp;
    p.g = o.g != null ? o.g : 0; p.drag = o.drag != null ? o.drag : 2;
    p.life = p.max = (o.life || 0.6) * rand(0.6, 1.2);
    p.s0 = (o.size || 0.25) * rand(0.7, 1.3); p.s1 = o.size1 != null ? o.size1 * rand(0.7, 1.3) : 0;
    p.a = o.alpha || 1;
    p.swirl = o.swirl || 0; p.cx = o.cx != null ? o.cx : x; p.cz = o.cz != null ? o.cz : z;
    _col.set(cols[i % cols.length]);
    spkCol[j * 3] = _col.r; spkCol[j * 3 + 1] = _col.g; spkCol[j * 3 + 2] = _col.b;
  }
}
function updateSparks(dt) {
  for (let i = 0; i < SPK; i++) {
    const p = spk[i];
    if (p.life <= 0) { if (spkA[i] !== 0) spkA[i] = 0; continue; }
    p.life -= dt;
    const k = Math.max(0, p.life / p.max);
    const f = Math.exp(-p.drag * dt);
    p.vx *= f; p.vy = p.vy * f - p.g * dt; p.vz *= f;
    let px = spkPos[i * 3], pz = spkPos[i * 3 + 2];
    if (p.swirl) {
      const rx = px - p.cx, rz = pz - p.cz;
      p.vx += -rz * p.swirl * dt - rx * Math.abs(p.swirl) * 0.5 * dt;
      p.vz += rx * p.swirl * dt - rz * Math.abs(p.swirl) * 0.5 * dt;
    }
    spkPos[i * 3] = px + p.vx * dt; spkPos[i * 3 + 1] += p.vy * dt; spkPos[i * 3 + 2] = pz + p.vz * dt;
    spkSize[i] = lerp(p.s1, p.s0, k);
    spkA[i] = p.a * Math.min(1, k * 3) * (k > 0.92 ? (1 - k) / 0.08 : 1);
  }
  spkGeo.attributes.position.needsUpdate = true;
  spkGeo.attributes.pcol.needsUpdate = true;
  spkGeo.attributes.psize.needsUpdate = true;
  spkGeo.attributes.palpha.needsUpdate = true;
}

// ---------- 파편 메시 ----------
const CHUNK = {
  rock: { geo: G.dodec, mat: mat(0x9a8f7e) },
  ice: { geo: G.oct, mat: new THREE.MeshStandardMaterial({ color: 0xcff3ff, emissive: 0x5ec8ff, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9, flatShading: true }) },
  jelly: { geo: G.ico1, mat: new THREE.MeshStandardMaterial({ color: 0x6fe08a, emissive: 0x1f8a42, emissiveIntensity: 0.4, roughness: 0.2, transparent: true, opacity: 0.85, flatShading: true }) },
  wood: { geo: G.box, mat: mat(0xb07a45) },
  spike: { geo: G.cone, mat: mat(0x8a7a6a) },
  star: { geo: starGeo, mat: new THREE.MeshBasicMaterial({ color: 0xffe08a }) },
};
function chunks(x, y, z, type, o) {
  const C = CHUNK[type];
  for (let i = 0; i < (o.n || 6); i++) {
    const m = new THREE.Mesh(C.geo, C.mat);
    const s = (o.size || 0.2) * rand(0.6, 1.3);
    m.scale.setScalar(s);
    m.position.set(x + rand(-0.2, 0.2), y, z + rand(-0.2, 0.2));
    m.castShadow = false;
    const a = Math.random() * TAU, sp = (o.speed || 5) * rand(0.5, 1);
    const st = { vx: Math.cos(a) * sp + (o.dir ? o.dir[0] * sp : 0), vy: (o.up || 5) * rand(0.6, 1.2), vz: Math.sin(a) * sp + (o.dir ? o.dir[2] * sp : 0), rx: rand(-8, 8), rz: rand(-8, 8), gy: y - 0.5 };
    const life = o.life || 0.9;
    addFx(m, (t, dt) => {
      st.vy -= 22 * dt;
      m.position.x += st.vx * dt; m.position.y += st.vy * dt; m.position.z += st.vz * dt;
      if (o.floor != null && m.position.y < o.floor + s * 0.5) { m.position.y = o.floor + s * 0.5; st.vy *= -0.35; st.vx *= 0.7; st.vz *= 0.7; }
      m.rotation.x += st.rx * dt; m.rotation.z += st.rz * dt;
      const k = t / life;
      if (k > 0.7) m.scale.setScalar(s * (1 - (k - 0.7) / 0.3));
    }, life);
  }
}
// 땅에서 솟는 가시
function spikesRing(x, y, z, n, r, col, h = 1.6) {
  const m0 = mat(col);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand(-0.15, 0.15), rr = r * rand(0.8, 1.1);
    const m = new THREE.Mesh(G.cone, m0);
    m.position.set(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr);
    m.rotation.set(rand(-0.3, 0.3), 0, rand(-0.3, 0.3));
    const hh = h * rand(0.7, 1.2);
    m.castShadow = true;
    addFx(m, (t) => {
      const k = t < 0.12 ? t / 0.12 : t > 0.6 ? Math.max(0, 1 - (t - 0.6) / 0.3) : 1;
      m.scale.set(0.35 * hh * 0.5, hh * k, 0.35 * hh * 0.5);
      m.position.y = y + hh * k * 0.5 - 0.1;
    }, 0.9);
  }
}
// ---------- 리본 빔 (번개 / 화염) ----------
function ribbon(points, width, color, dur, opts = {}) {
  const n = points.length;
  const pos = new Float32Array(n * 2 * 3), idx = [];
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const a = new THREE.Vector3(), side = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const p = points[i], q = points[Math.min(n - 1, i + 1)], r = points[Math.max(0, i - 1)];
    a.subVectors(q, r).normalize();
    side.crossVectors(a, camDir).normalize();
    const w = width * (opts.taper ? (1 - i / (n - 1) * 0.7) : 1) * (opts.wave ? 0.7 + 0.5 * Math.sin(i * 1.7) : 1);
    pos.set([p.x + side.x * w, p.y + side.y * w, p.z + side.z * w], i * 6);
    pos.set([p.x - side.x * w, p.y - side.y * w, p.z - side.z * w], i * 6 + 3);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  m.renderOrder = 7;
  m.frustumCulled = false;
  addFx(m, (t) => { const k = t / dur; m.material.opacity = (opts.op || 1) * (1 - k) * (opts.flicker ? (0.6 + 0.4 * Math.random()) : 1); }, dur, () => { g.dispose(); m.material.dispose(); });
}
function boltPoints(a, b, jitter, segs = 10) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const k = i / segs, j = i && i < segs ? jitter * Math.sin(k * Math.PI) : 0;
    pts.push(new THREE.Vector3(lerp(a.x, b.x, k) + rand(-j, j), lerp(a.y, b.y, k) + rand(-j, j), lerp(a.z, b.z, k) + rand(-j, j)));
  }
  return pts;
}
// 불덩이 폭발 (구가 커지며 사라짐)
const fireballMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
function fireball(x, y, z, r, col = 0xffa040, dur = 0.35) {
  const m = new THREE.Mesh(G.ico1, fireballMat.clone());
  m.material.color.set(col);
  m.position.set(x, y, z);
  addFx(m, (t) => { const k = t / dur; m.scale.setScalar(r * (0.3 + 0.9 * Math.sqrt(k))); m.material.opacity = 0.85 * (1 - k); }, dur, () => m.material.dispose());
}

// ---------- 효과음 (노이즈 합성) ----------
let noiseBuf = null;
function noise(dur, f0, f1, q = 1, vol = 0.1, type = 'bandpass', delay = 0) {
  if (muted || !actx || actx.state !== 'running') return;
  if (typeof inCastleIn === 'function' && typeof P !== 'undefined' && inCastleIn(P.x, P.y, P.z)) return;   // 성 안: 효과음 끔
  try {
    if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t0 = actx.currentTime + delay;
    const src = actx.createBufferSource(); src.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(actx.destination);
    src.start(t0, Math.random() * 0.4); src.stop(t0 + dur + 0.05);
  } catch (e) { /* 무시 */ }
}
const WSFX = {
  whoosh: () => noise(0.17, 700, 2600, 0.8, 0.07),
  whooshLow: () => noise(0.24, 300, 1000, 0.7, 0.09),
  whooshBig: () => { noise(0.3, 250, 1600, 0.6, 0.12); tone(110, 0.22, 'sawtooth', 0.03, -40); },
  wood: () => { tone(240, 0.06, 'square', 0.04); noise(0.05, 1400, 700, 2, 0.05); },
  thud: () => { tone(85, 0.2, 'sine', 0.13, -35); noise(0.14, 500, 90, 0.7, 0.1, 'lowpass'); },
  shing: () => { tone(2400, 0.28, 'sine', 0.035); tone(3600, 0.2, 'sine', 0.018); noise(0.07, 5000, 8000, 2, 0.03, 'highpass'); },
  boing: () => { tone(260, 0.28, 'sine', 0.09, 520); noise(0.12, 900, 300, 1, 0.06, 'lowpass', 0.05); },
  twang: () => { tone(190, 0.22, 'triangle', 0.07, -70); noise(0.06, 3200, 1500, 3, 0.03); },
  thunk: () => { tone(320, 0.05, 'square', 0.04, -120); },
  fire: () => { noise(0.35, 300, 1400, 0.6, 0.09, 'lowpass'); tone(130, 0.2, 'sawtooth', 0.02); },
  quake: () => { tone(52, 0.55, 'sawtooth', 0.09, -18); noise(0.55, 220, 60, 0.5, 0.16, 'lowpass'); },
  zap: () => { noise(0.2, 3000, 6500, 4, 0.07); tone(1500, 0.1, 'square', 0.025, -900); noise(0.08, 5000, 2000, 5, 0.05, 'bandpass', 0.06); },
  ice: () => { noise(0.22, 6000, 9500, 3, 0.05, 'highpass'); tone(1800, 0.32, 'sine', 0.03); tone(2700, 0.26, 'sine', 0.02); },
  ghost: () => { tone(440, 0.42, 'sine', 0.035, 220); tone(447, 0.42, 'sine', 0.035, 223); },
  heavy: () => { noise(0.3, 260, 1300, 0.8, 0.12); tone(105, 0.28, 'sawtooth', 0.04, -45); },
  roar: () => { tone(88, 0.45, 'sawtooth', 0.06, 70); noise(0.45, 400, 1600, 0.5, 0.11, 'lowpass'); },
  chime: () => { [1568, 2093, 2637].forEach((f, i) => tone(f, 0.18, 'triangle', 0.035, 0, i * 0.04)); },
  void: () => { noise(0.5, 2200, 180, 1.5, 0.09); tone(66, 0.5, 'sine', 0.09, -26); },
  royal: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.035, 0, i * 0.05)); noise(0.35, 400, 2400, 0.7, 0.08); },
};
let lastHitSnd = 0;
function hitSound(w) {
  const now = performance.now();
  if (now - lastHitSnd < 70) return;
  lastHitSnd = now;
  const f = WFX[w.id];
  if (f && f.hitSnd && WSFX[f.hitSnd]) WSFX[f.hitSnd]();
}

// ---------- 매 프레임 ----------
function updateFx(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i];
    f.t += dt;
    f.upd(f.t, dt);
    if (f.t >= f.life) { scene.remove(f.obj); if (f.disp) f.disp(); fxList.splice(i, 1); }
  }
  for (const L of fxLights) {
    if (L.t >= L.dur) { if (L.l.intensity !== 0) L.l.intensity = 0; continue; }
    L.t += dt;
    L.l.intensity = L.peak * Math.max(0, 1 - L.t / L.dur);
  }
  updateSparks(dt);
  weaponIdleFx(dt);
}
