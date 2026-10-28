// The hero: a planet at sunrise whose air dissolves into magenta pixels (WebGL, with a 2D fallback),
// the pixel wordmark, and the data parts (flag tape, ask box, chips pinned to the planet).
// It loads the data itself so it does not depend on app.js. Its country links carry data-go-country, which app.js
// handles like every other country picker; app.js then fires "countrychange" and the sun moves to that country.
import { STATUSES, scoreCountries, mergeCompanies, startCountry } from './src/observatory.js';

const hero = document.querySelector('[data-hero]');
const $ = (sel) => hero.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
const flag = (code) => `<span class="flag" aria-hidden="true">${emoji(code)}</span>`;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T0 = 12; // the still frame (2D fallback, reduced motion) shows this moment
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Dither steps, dark to light: space, plum, berry, magenta, sunrise, warm white.
const DITHER = ['#05060B', '#3A0A24', '#A3155A', '#FF2E88', '#FFB672', '#FFF1E2'];
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

let cv = $('.hero-sky');
const wm = $('.hero-wm');
const row = $('[data-hero-chips]');
let G = {}; // hero geometry in CSS px, y down

/* ---------- geometry: the planet sits under the chips; a pin hangs from each chip to the surface ---------- */
function geom() {
  const W = hero.clientWidth, H = hero.clientHeight, hb = hero.getBoundingClientRect(), rb = row.getBoundingClientRect();
  const narrow = W < 720, peak = rb.bottom - hb.top + (narrow ? 64 : 70);
  const R = Math.max(W * 1.25, 460), Cx = W * 0.5, Cy = peak + R;
  const chips = [...row.querySelectorAll('a')];
  // Pins only when the chips sit in one row.
  const one = !narrow && chips.length > 0 && new Set(chips.map((c) => c.offsetTop)).size === 1;
  const on = row.querySelector('[aria-current="true"]');
  let sx = W * (narrow ? 0.8 : 0.71);
  if (one && on) { const b = on.getBoundingClientRect(); sx = b.left + b.width / 2 - hb.left; }
  const sy = Cy - Math.sqrt(R * R - (sx - Cx) ** 2) + 4;
  G = { W, H, R, Cx, Cy, sx, sy };
  for (const c of chips) {
    const s = c.querySelector('.hero-stem'), b = c.getBoundingClientRect();
    const x = b.left + b.width / 2 - hb.left;
    const h = Math.round(Cy - Math.sqrt(Math.max(0, R * R - (x - Cx) ** 2)) - (b.bottom - hb.top) + 12);
    s.style.display = one && h > 10 ? 'block' : 'none';
    s.style.height = `${h}px`;
  }
}

/* ---------- sky: render the smooth scene, then dither the cells a mask picks (top, edges, air above the limb) ---------- */
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes, uSun; uniform vec3 uP; uniform float uT, uS;
uniform vec3 uD0, uD1, uD2, uD3, uD4, uD5;
float h1(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1.,0.,0.)),f.x),mix(h3(i+vec3(0.,1.,0.)),h3(i+vec3(1.,1.,0.)),f.x),f.y),
  mix(mix(h3(i+vec3(0.,0.,1.)),h3(i+vec3(1.,0.,1.)),f.x),mix(h3(i+vec3(0.,1.,1.)),h3(i+1.),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return v;}
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=hs(i),b=hs(i+vec2(1.,0.)),c=hs(i+vec2(0.,1.)),d=hs(i+1.);return a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y;}
float f2(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n2(p);p=vec2(1.6*p.x-1.2*p.y,1.2*p.x+1.6*p.y);a*=.5;}return v;}
float b2(vec2 a){a=floor(a);return fract(.5*a.x+.75*a.y*a.y);}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
vec3 scene(vec2 p){
 vec2 uv=p/uRes; float S=uS, R=uP.z;
 vec2 q=p-uP.xy; float r=length(q), d=r-R;
 vec2 qs=uSun-uP.xy; float da=atan(q.x,q.y)-atan(qs.x,qs.y);
 float warm=exp(-da*da/.0025), wide=exp(-da*da/.04), br=1.+.08*sin(uT*.45);
 vec3 MAG=vec3(1.,.03,.26), BLUE=vec3(.18,.45,1.), WARM=vec3(1.,.5,.18), HOT=vec3(1.,.82,.6);
 vec3 col=mix(vec3(.0008,.0006,.002),vec3(.004,.002,.01),smoothstep(.95,.2,uv.y));
 if(d>0.){
  float st=0.; vec2 g=p/(4.*S), id=floor(g); float hh=h1(id);
  if(hh>.982){vec2 o=vec2(h1(id+7.1),h1(id+3.3))*.7+.15; float dd=length(fract(g)-o)*4.; st+=(hh-.982)/.018*exp(-dd*dd*1.2)*.5;}
  vec2 g2=p/(170.*S), id2=floor(g2); float hb=h1(id2+19.);
  if(hb>.82){vec2 o=vec2(h1(id2+1.7),h1(id2+5.9))*.6+.2; float dd=length(fract(g2)-o)*170./S; st+=exp(-dd*dd*.35)*1.5+exp(-dd*.5)*.05;}
  col+=vec3(1.,.9,.95)*st*smoothstep(0.,80.*S,d)*(1.-.9*wide);
  vec3 ac=mix(MAG,mix(WARM,HOT,.35),warm);
  col+=ac*exp(-d/(4.*S))*(.5+1.6*wide+3.*warm)*br;
  col+=mix(MAG,WARM,wide*.8)*exp(-d/(36.*S))*(.06+.2*wide+.45*warm)*br;
  float aw=exp(-d/(170.*S));
  if(aw>.015){vec2 fp=p/S*.0021;
   vec2 w=vec2(f2(fp+vec2(uT*.05,0.)),f2(fp+vec2(5.2,1.3-uT*.04)));
   float k=f2(fp+2.2*w+uT*.02); float c=.5+.5*sin(k*11.+w.x*3.-uT*.25); c=c*c*c;
   col+=mix(MAG,WARM,wide*.75)*aw*max(c*.95+(k-.3)*.55,0.)*.42*br;}
 } else {
  float rr=r/R, nz=sqrt(max(0.,1.-rr*rr));
  vec3 N=vec3(q/R,nz), L=normalize(vec3(qs/length(qs)*.5,-.86));
  float ndl=dot(N,L), day=smoothstep(-.02,.32,ndl)*(.22+.78*wide);
  float a=uT*.0035, ca=cos(a), sa=sin(a);
  vec3 P=vec3(N.x,N.y*ca-N.z*sa,N.y*sa+N.z*ca);
  float land=smoothstep(.5,.57,fbm(P*2.4+vec3(3.,1.,7.)));
  float cl=smoothstep(.5,.78,fbm(vec3(P.x*3.,P.y*9.,P.z*9.)+vec3(0.,0.,uT*.0015)));
  vec3 surf=mix(vec3(.004,.016,.05),vec3(.03,.026,.016),land);
  surf=mix(surf,vec3(.7,.74,.82),cl*.9);
  col=surf*day*(1.1+2.6*warm);
  float night=clamp(1.-day*1.6,0.,1.);
  float city=smoothstep(.72,.95,n3(P*190.))*smoothstep(.42,.7,fbm(P*16.+5.))*land*(1.-cl*.85);
  col+=(surf*.015+vec3(1.,.6,.26)*city*2.2)*night;
  float fr=pow(1.-nz,6.);
  col+=mix(mix(BLUE,MAG,.3),WARM,warm)*fr*(.25+1.4*wide+2.*warm)*br;
  col+=mix(MAG,HOT,warm)*exp(d/(2.5*S))*(.4+1.5*wide+2.*warm)*br;
 }
 vec2 sv=p-uSun; float sd=length(sv)/S;
 col+=HOT*(1.6*exp(-sd/7.)+.45*exp(-sd/45.)+.05*exp(-sd/170.))*br;
 col+=mix(WARM,HOT,.6)*exp(-abs(sv.y)/(1.1*S))*exp(-abs(sv.x)/(170.*S))*.3*br;
 col*=1.-.45*smoothstep(.4,1.15,length((uv-vec2(.5,.55))*vec2(1.,.8)));
 col=1.-exp(-col*1.3);
 return pow(col,vec3(1./2.2));
}
void main(){
 vec2 p=gl_FragCoord.xy; float C=4.*uS;
 vec2 cc=floor(p/C), cp=(cc+.5)*C, lf=fract(p/C), uv=cp/uRes;
 float d=length(cp-uP.xy)-uP.z;
 float m=max(smoothstep(.5,.97,uv.y),smoothstep(.33,.5,abs(uv.x-.5))*.95);
 if(d>0.)m=max(m,smoothstep(14.*uS,150.*uS,d));
 m*=smoothstep(30.*uS,140.*uS,length(cp-uSun));
 bool px=m>b4(cc+vec2(1.,2.))*.9+.05;
 vec3 col=scene(px?cp:p);
 if(px){
  float l=clamp((dot(col,vec3(.42,.4,.18))-.07)*1.25,0.,1.);
  float i=floor(l*5.+b4(cc));
  col=i<.5?uD0:i<1.5?uD1:i<2.5?uD2:i<3.5?uD3:i<4.5?uD4:uD5;
  if(max(lf.x,lf.y)>.75)col=uD0;
 } else col+=(h1(p+fract(uT*.731)*97.)-.5)*.018;
 gl_FragColor=vec4(col,1.);
}`;

function program(gl) {
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'], [gl.FRAGMENT_SHADER, FS]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  return prog;
}

let gl = cv.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'low-power' });
const prog = gl && program(gl);
const U = {};
let ctx = null, sc = 1;
if (gl && !prog) {
  // A canvas keeps its first context type, so swap in a fresh one for the 2D fallback.
  gl = null;
  const fresh = cv.cloneNode(false);
  cv.replaceWith(fresh);
  cv = fresh;
}
if (gl) {
  for (const n of ['uRes', 'uSun', 'uP', 'uT', 'uS', 'uD0', 'uD1', 'uD2', 'uD3', 'uD4', 'uD5']) U[n] = gl.getUniformLocation(prog, n);
  DITHER.forEach((h, i) => { const c = hex(h); gl.uniform3f(U[`uD${i}`], c[0] / 255, c[1] / 255, c[2] / 255); });
} else ctx = cv.getContext('2d');

function size() {
  geom();
  // ponytail: the sky renders at up to 1.5x; raise toward devicePixelRatio if stars look soft on 3x screens
  sc = Math.min(devicePixelRatio || 1, 1.5);
  cv.width = Math.max(1, Math.round(G.W * sc));
  cv.height = Math.max(1, Math.round(G.H * sc));
  if (!gl) return;
  gl.viewport(0, 0, cv.width, cv.height);
  gl.uniform2f(U.uRes, cv.width, cv.height);
  gl.uniform1f(U.uS, sc);
  gl.uniform3f(U.uP, G.Cx * sc, (G.H - G.Cy) * sc, G.R * sc);
  gl.uniform2f(U.uSun, G.sx * sc, (G.H - G.sy) * sc);
}

// 2D fallback: the same scene with gradients, then the same dither mask over 4px cells. Drawn once per layout.
function flat() {
  const g = ctx;
  if (!g) return;
  const { W, H, R, Cx, Cy, sx, sy } = G;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const radial = (x, y, r0, r1, stops) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  g.setTransform(sc, 0, 0, sc, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#030208');
  sky.addColorStop(1, '#140818');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  for (let i = 0, n = (W * H) / 1400; i < n; i++) {
    const a = rnd();
    g.fillStyle = `rgba(255,230,240,${(a * a * 0.75).toFixed(3)})`;
    g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.35 + a * 0.6, 0, 7); g.fill();
  }
  g.fillStyle = radial(Cx, Cy, R, R + 260, [[0, 'rgba(255,46,136,.5)'], [0.12, 'rgba(255,46,136,.2)'], [1, 'rgba(255,46,136,0)']]); g.fillRect(0, 0, W, H);
  g.fillStyle = radial(sx, sy, 0, 420, [[0, 'rgba(255,182,114,.55)'], [1, 'rgba(255,182,114,0)']]); g.fillRect(0, 0, W, H);
  g.beginPath(); g.arc(Cx, Cy, R, 0, 7);
  g.fillStyle = radial(Cx, Cy, R * 0.8, R, [[0, '#010205'], [0.93, '#04060f'], [0.995, '#2a1030'], [1, '#c02a70']]); g.fill();
  g.save(); g.clip();
  g.fillStyle = radial(sx, sy, 0, R * 0.5, [[0, 'rgba(255,200,150,.6)'], [0.18, 'rgba(150,170,200,.22)'], [0.5, 'rgba(40,60,100,.08)'], [1, 'rgba(40,60,100,0)']]); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 360; i++) { // city lights on the night side
    const cx = rnd() * W, top = Cy - Math.sqrt(Math.max(0, R * R - (cx - Cx) ** 2)), cy = top + 6 + rnd() ** 1.6 * (H - top);
    if (Math.hypot(cx - sx, cy - sy) < 260 || rnd() < 0.4) continue;
    g.fillStyle = `rgba(255,175,95,${(0.25 + rnd() * 0.5).toFixed(2)})`;
    g.beginPath(); g.arc(cx, cy, 0.5 + rnd() * 0.7, 0, 7); g.fill();
  }
  g.restore();
  g.beginPath(); g.arc(Cx, Cy, R, 0, 7);
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,170,205,.85)'; g.shadowColor = 'rgba(255,46,136,.9)'; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0;
  g.fillStyle = radial(sx, sy, 0, 300, [[0, 'rgba(255,250,240,1)'], [0.03, 'rgba(255,225,185,.9)'], [0.16, 'rgba(255,160,80,.32)'], [0.5, 'rgba(255,140,60,.08)'], [1, 'rgba(255,140,60,0)']]);
  g.fillRect(sx - 300, sy - 300, 600, 600);
  // Dither pass: average each 4px cell, then quantize the cells the mask picks.
  const C = 4, cols = Math.ceil(W / C), rows = Math.ceil(H / C), sm = document.createElement('canvas');
  sm.width = cols; sm.height = rows;
  const sg = sm.getContext('2d');
  sg.drawImage(cv, 0, 0, cols, rows);
  const px = sg.getImageData(0, 0, cols, rows).data;
  const paths = DITHER.map(() => new Path2D());
  const sst = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = (i + 0.5) * C, y = (j + 0.5) * C, d = Math.hypot(x - Cx, y - Cy) - R;
    let m = Math.max(sst(0.5, 0.97, 1 - y / H), sst(0.33, 0.5, Math.abs(x / W - 0.5)) * 0.95);
    if (d > 0) m = Math.max(m, sst(14, 150, d));
    m *= sst(30, 140, Math.hypot(x - sx, y - sy));
    if (m <= (BAYER[((j + 2) & 3) * 4 + ((i + 1) & 3)] / 16) * 0.9 + 0.05) continue;
    const o = (j * cols + i) * 4, l = Math.min(1, Math.max(0, ((px[o] * 0.42 + px[o + 1] * 0.4 + px[o + 2] * 0.18) / 255 - 0.07) * 1.25));
    const k = Math.min(5, Math.floor(l * 5 + BAYER[(j & 3) * 4 + (i & 3)] / 16));
    paths[0].rect(i * C, j * C, C, C);
    if (k) paths[k].rect(i * C, j * C, C - 1, C - 1);
  }
  DITHER.forEach((h, q) => { g.fillStyle = h; g.fill(paths[q]); });
}

function drawSky(t) {
  if (gl) { gl.uniform1f(U.uT, t); gl.drawArrays(gl.TRIANGLES, 0, 3); } else flat();
}

/* ---------- wordmark: Jersey 10 rasterised to a cell grid, filled with a drifting magenta-to-sunrise dither ---------- */
const WM = ['#E0287E', '#FF2E88', '#FF6F7D', '#FFB672', '#FFE6C8'];
const LINES = ['AGENT', 'OBSERVATORY'];
const wdpr = Math.min(devicePixelRatio || 1, 2);
const wg = wm.getContext('2d');
let lit = null, cols = 0, rows = 0, cell = 0, gapD = 0;
function buildMask() {
  const avail = wm.clientWidth;
  if (!avail || !wg) return false;
  const t = document.createElement('canvas').getContext('2d');
  t.font = '28px "Jersey 10", monospace';
  const base = t.measureText('OBSERVATORY');
  const bw = base.actualBoundingBoxLeft + base.actualBoundingBoxRight;
  // Whole-number font scale keeps every glyph pixel the same size.
  const k = Math.max(1, Math.round(avail / (bw * 4.5)));
  const capH = 15 * k, lead = 5 * k;
  t.font = `${28 * k}px "Jersey 10", monospace`;
  const ms = LINES.map((s) => t.measureText(s));
  cols = Math.ceil(Math.max(...ms.map((m) => m.actualBoundingBoxLeft + m.actualBoundingBoxRight))) + 1;
  rows = capH * 2 + lead;
  const mk = document.createElement('canvas');
  mk.width = cols; mk.height = rows;
  const mc = mk.getContext('2d');
  mc.font = t.font;
  LINES.forEach((s, n) => mc.fillText(s, Math.round(ms[n].actualBoundingBoxLeft), capH + n * (capH + lead)));
  const d = mc.getImageData(0, 0, cols, rows).data, out = [];
  for (let i = 0; i < cols * rows; i++) if (d[i * 4 + 3] >= 128) out.push(i);
  lit = new Int32Array(out);
  cell = avail / cols;
  wm.style.height = `${Math.round(rows * cell)}px`;
  wm.width = Math.round(avail * wdpr);
  wm.height = Math.round(rows * cell * wdpr);
  gapD = cell >= 3 ? Math.max(1, Math.round(wdpr)) : wdpr >= 2 ? 1 : 0;
  return true;
}
function drawWord(time) {
  if (!lit) return;
  const T = time / 1000, cD = cell * wdpr, shift = T * 0.05;
  const colB = new Float32Array(cols);
  for (let x = 0; x < cols; x++) { const u = x / cols; colB[x] = u * 1.15 + 0.14 * Math.sin(u * 7 + T * 0.45); }
  const paths = WM.map(() => new Path2D());
  for (const idx of lit) {
    const cy = (idx / cols) | 0, cx = idx - cy * cols;
    const s = colB[cx] + (cy / rows) * 0.45 - shift, m = s - 2 * Math.floor(s / 2), tri = m < 1 ? m : 2 - m;
    const p = tri * 3.999, lo = p | 0;
    const c = p - lo > (BAYER[(cy & 3) * 4 + (cx & 3)] + 0.5) / 16 ? lo + 1 : lo;
    const x0 = Math.round(cx * cD), y0 = Math.round(cy * cD);
    paths[c].rect(x0, y0, Math.round((cx + 1) * cD) - x0 - gapD, Math.round((cy + 1) * cD) - y0 - gapD);
  }
  wg.clearRect(0, 0, wm.width, wm.height);
  WM.forEach((fill, q) => { wg.fillStyle = fill; wg.fill(paths[q]); });
}

/* ---------- one clock: a still frame first, then about 30 fps only while the hero is on screen ---------- */
const now = () => (reduce ? T0 : T0 + (performance.now() / 1000) % 3600);
let heroOn = false, raf = 0, last = 0;
function heroAll() {
  const ok = buildMask();
  size();
  drawSky(gl ? now() : T0);
  if (ok) drawWord(reduce ? 1e4 : 1e4 + performance.now());
  hero.classList.add('is-ready');
}
function tick(ts) {
  raf = 0;
  if (!heroOn) return;
  if (ts - last > 32) {
    last = ts;
    if (gl) drawSky(now());
    drawWord(1e4 + ts);
  }
  raf = requestAnimationFrame(tick);
}
heroAll();
if (!reduce) {
  new IntersectionObserver(([e]) => {
    heroOn = e.isIntersecting;
    if (heroOn && !raf) raf = requestAnimationFrame(tick);
  }).observe(hero);
}
let lastW = 0, pend = 0;
new ResizeObserver(() => {
  // Height only (data arrived, text wrapped): resize the sky. Width: rebuild the wordmark too, once per frame.
  if (hero.clientWidth === lastW) { size(); drawSky(gl ? now() : T0); return; }
  lastW = hero.clientWidth;
  cancelAnimationFrame(pend);
  pend = requestAnimationFrame(heroAll);
}).observe(hero);
document.fonts?.load('28px "Jersey 10"').then(heroAll, () => {});
document.fonts?.ready.then(heroAll);

/* ---------- data: flag tape, chips and the ask box ---------- */
let ranking, commerce, companies, focus;

// "Can my agent shop in X?" answered from the shopping category.
function answer(code) {
  const cells = commerce.capabilities.map((cap) => cap.countries[code]);
  const live = cells.filter((c) => c.status === 'live').length;
  const sources = cells.reduce((n, c) => n + (c.evidence?.length ?? 0), 0);
  const best = Object.keys(STATUSES).find((s) => cells.some((c) => c.status === s));
  const [word, status] = live === cells.length ? ['Yes', 'live'] : live ? ['Partly', 'limited'] : [STATUSES[best].label, best];
  return { word, status, text: `${live} of ${cells.length} shopping capabilities live · ${sources} source${sources === 1 ? '' : 's'}` };
}

function renderCountries() {
  const label = (r) => `${esc(r.name)}, rank ${r.rank}, score ${r.score}`;
  $('[data-hero-flags]').innerHTML = ranking.map((r) => `
    <li><a href="#country=${r.code}" data-go-country="${r.code}" aria-label="${label(r)}" aria-current="${r.code === focus}">${flag(r.code)}<span>${r.code}</span><b>${r.score}</b></a></li>`).join('');
  row.innerHTML = ranking.map((r) => `
    <li><a href="#country=${r.code}" data-go-country="${r.code}" tabindex="-1" aria-current="${r.code === focus}">${flag(r.code)}<span class="hero-chip-c">${r.code}</span><span class="hero-chip-v">${r.score}</span><i class="hero-stem"></i></a></li>`).join('');
}

// The companies with the most live markets, under the ask box.
function renderCompanies() {
  const top = companies.slice(0, 10);
  $('[data-hero-cos-label]').textContent = `Tracked · ${top.length} of ${companies.length} companies`;
  $('[data-hero-cos]').innerHTML = top.map((c) => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a></li>`).join('');
}

function renderTabs() {
  $('[data-hero-tabs]').innerHTML = ranking.map((r) => `
    <button type="button" role="tab" id="hero-tab-${r.code}" aria-controls="hero-ask-panel" aria-selected="false" tabindex="-1" data-ask="${r.code}" aria-label="${esc(r.name)}">${flag(r.code)}${r.code}</button>`).join('');
}

function ask(code) {
  const r = ranking.find((x) => x.code === code);
  const a = answer(code);
  hero.querySelectorAll('[data-ask]').forEach((b) => {
    const on = b.dataset.ask === code;
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
  });
  $('[data-hero-panel]').setAttribute('aria-labelledby', `hero-tab-${code}`);
  $('[data-hero-q]').textContent = `Can my agent shop in ${r.name}?`;
  $('[data-hero-ans]').innerHTML = `<span class="hero-ret" aria-hidden="true">↳</span><span class="hero-st s-${a.status}">${a.word}</span><span>${a.text}</span><a href="#matrix">See the cells</a>`;
}

function wire() {
  const tabs = $('[data-hero-tabs]');
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]');
    if (b) ask(b.dataset.ask);
  });
  // Arrow keys move between tabs, as in any tab list.
  tabs.addEventListener('keydown', (e) => {
    const all = [...tabs.querySelectorAll('[data-ask]')], i = all.indexOf(document.activeElement);
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (i < 0 || j === undefined) return;
    e.preventDefault();
    const b = all[(j + all.length) % all.length];
    b.focus();
    ask(b.dataset.ask);
  });
  // app.js already marked the new country (aria-current); move the sun over its chip and ask about it.
  document.addEventListener('countrychange', (e) => {
    focus = e.detail;
    size();
    drawSky(gl ? now() : T0);
    ask(focus);
  });
  $('[data-hero-copy]').addEventListener('click', async (e) => {
    const btn = e.currentTarget, q = $('[data-hero-q]');
    try {
      await navigator.clipboard.writeText(q.textContent);
      btn.textContent = 'Copied';
    } catch {
      // No clipboard access (http, old browser): select the question so the reader can copy it by hand.
      getSelection().selectAllChildren(q);
      btn.textContent = 'Selected';
    }
    setTimeout(() => (btn.textContent = 'Copy'), 1600);
  });
}

const getJson = (name) => fetch(`data/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
  return r.json();
});
try {
  const meta = await getJson('meta');
  const categories = await Promise.all(meta.categories.map((c) => getJson(c.id)));
  ranking = scoreCountries(meta, categories);
  commerce = categories.find((c) => c.category === 'commerce');
  companies = mergeCompanies(categories);
  focus = startCountry(ranking.map((r) => r.code), location.hash, navigator.languages ?? [navigator.language], Intl.DateTimeFormat().resolvedOptions().timeZone);
  renderCountries();
  renderTabs();
  renderCompanies();
  ask(focus);
  wire();
  $('[data-hero-ask]').hidden = false;
} catch {
  // app.js shows the load error; the hero keeps its sky and wordmark.
}
