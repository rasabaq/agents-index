// The tier list and the numbers band. Loads the same data as app.js and draws two sections of its own.
import { TIERS, tierOf, scoreCountries } from './src/observatory.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const getJson = (name) => fetch(`data/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
  return r.json();
});
const emoji = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const word = (n) => WORDS[n] ?? String(n);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- tier list ---------- */

const range = (t, i) => (i === 0 ? `≥ ${t.min}` : t.min === 0 ? `< ${TIERS[i - 1].min}` : `${t.min}–${TIERS[i - 1].min - 1}`);

const tile = (r) => `
  <li><a class="tile" href="#country=${esc(r.code)}" aria-label="${esc(r.name)}, score ${r.score}">
    <span class="tile-id"><span class="tile-flag" aria-hidden="true">${emoji(r.code)}</span><b>${esc(r.code)}</b></span>
    <span class="tile-v">${r.score}</span>
    <span class="tile-n">${esc(r.name)}</span>
    <span class="tile-bar" aria-hidden="true"><b style="--w:${r.score}%"></b></span>
  </a></li>`;

function renderTiers(ranking) {
  $('[data-tiers-title]').textContent = `${word(TIERS.length)} tiers, ${word(ranking.length).toLowerCase()} countries.`;
  $('[data-tiers]').innerHTML = TIERS.map((t, i) => {
    const rows = ranking.filter((r) => tierOf(r.score) === t.letter);
    const tied = new Set(rows.map((r) => r.score)).size < rows.length;
    return `
      <li class="tier-row tier-${t.letter.toLowerCase()}">
        <p class="tier-l"><b><span class="sr-only">Tier </span>${t.letter}</b><span>${range(t, i)}</span></p>
        <ul class="tier-r">${rows.length ? rows.map(tile).join('') : '<li class="tile-0">No country yet</li>'}</ul>
        <p class="tier-k">${rows.length} ${rows.length === 1 ? 'country' : 'countries'}${tied ? ' · tied' : ''}</p>
      </li>`;
  }).join('');
  $('[data-tiers]').addEventListener('click', (e) => {
    // The same hash fires no hashchange, so follow it here.
    if (e.target.closest('.tile')?.hash === location.hash) followHash();
  });
}

// app.js reads #country=XX only once, at load. Follow later changes through the country select it listens to.
function followHash() {
  const code = location.hash.match(/^#country=(\w\w)$/)?.[1];
  const sel = $('[data-country-select]');
  if (!code || ![...sel.options].some((o) => o.value === code)) return;
  sel.value = code;
  sel.dispatchEvent(new Event('change'));
  $('#country').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------- numbers band: a magenta dither field shown only inside 5x7 dot-matrix numerals ---------- */

// Counted the same way as the hero stats in app.js: unique source URLs, companies merged by name.
function renderBand(meta, categories) {
  const caps = categories.flatMap((c) => c.capabilities);
  const cells = caps.flatMap((cap) => Object.values(cap.countries));
  const sources = new Set(cells.flatMap((c) => (c.evidence ?? []).map((e) => e.url))).size;
  const cos = categories.flatMap((c) => c.companies ?? []);
  const figs = [
    [cells.length, 'Cells', `${caps.length} capabilities × ${meta.countries.length} countries.<br>${cells.filter((c) => c.confidence).length} rest on thin evidence.`],
    [sources, 'Sources', 'Unique links behind the statuses.<br>Open any cell to read them.'],
    [new Set(cos.map((c) => c.name.toLowerCase())).size, 'Companies', `Who makes each capability work,<br>based in ${new Set(cos.map((c) => c.hq)).size} countries.`],
  ];
  $('[data-nums]').insertAdjacentHTML('beforeend', figs.map(([n, label, text]) => `
    <figure class="fig">
      <p class="num" data-n="${n}" style="--d:${String(n).length}"><span class="sr-only">${n}</span></p>
      <figcaption><b>${label}</b><span>${text}</span></figcaption>
    </figure>`).join('<i class="sep" aria-hidden="true"></i>'));
}

const GLYPH = {
  0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110',
  2: '01110100010000100010001000100011111', 3: '11111000100010000010000011000101110',
  4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
  6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000',
  8: '01110100011000101110100011000101110', 9: '01110100011000101111000010001001100',
};
const CELL = 4; // CSS px per canvas pixel; every dot is a whole number of cells
const K = CELL / 560; // field scale
const RAMP = [[5, 6, 11], [58, 10, 36], [163, 21, 90], [255, 46, 136], [255, 182, 114]]; // space, plum, berry, magenta, sunrise
const OFF = [20, 16, 26]; // unlit dots
const T0 = 12; // the still frame (reduced motion, no WebGL) is this moment
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uT, uK; uniform sampler2D uMask;
uniform vec3 uC0, uC1, uC2, uC3, uC4, uOff;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=h(i),b=h(i+vec2(1.,0.)),c=h(i+vec2(0.,1.)),d=h(i+1.);return a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y;}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=vec2(1.6*p.x-1.2*p.y,1.2*p.x+1.6*p.y);a*=.5;}return v;}
float b2(vec2 a){a=floor(a);return fract(.5*a.x+.75*a.y*a.y);}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float m=texture2D(uMask,vec2(uv.x,1.-uv.y)).r;
  if(m<.1){gl_FragColor=vec4(0.);return;}
  if(m<.9){gl_FragColor=vec4(uOff,1.);return;}
  vec2 p=gl_FragCoord.xy*uK;
  vec2 q=vec2(fbm(p+vec2(uT*.05,0.)),fbm(p+vec2(5.2,1.3-uT*.04)));
  float k=fbm(p+2.2*q+uT*.02);
  float c=.5+.5*sin(k*11.+q.x*3.-uT*.25);c=c*c*c;
  float v=.5+.5*(c*.95+(k-.3)*.55);
  float i=floor(clamp(v,0.,1.)*4.+b4(gl_FragCoord.xy));
  gl_FragColor=vec4(i<.5?uC0:i<1.5?uC1:i<2.5?uC2:i<3.5?uC3:uC4,1.);
}`;

// The same field in JS for the 2D fallback, drawn once.
const hs = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hs(ix, iy), b = hs(ix + 1, iy), c = hs(ix, iy + 1), d = hs(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y) {
  let v = 0, a = 0.5;
  for (let i = 0; i < 4; i++) { v += a * noise(x, y); [x, y] = [1.6 * x - 1.2 * y, 1.2 * x + 1.6 * y]; a *= 0.5; }
  return v;
}
const b2 = (x, y) => { const s = 0.5 * Math.floor(x) + 0.75 * Math.floor(y) ** 2; return s - Math.floor(s); };
function shade(fx, fy, t) {
  const px = fx * K, py = fy * K, qx = fbm(px + t * 0.05, py), qy = fbm(px + 5.2, py + 1.3 - t * 0.04);
  const k = fbm(px + 2.2 * qx + t * 0.02, py + 2.2 * qy + t * 0.02);
  const c = 0.5 + 0.5 * Math.sin(k * 11 + qx * 3 - t * 0.25), v = 0.5 + 0.5 * (c * c * c * 0.95 + (k - 0.3) * 0.55);
  return Math.min(4, Math.floor(Math.min(1, Math.max(0, v)) * 4 + b2(fx / 2, fy / 2) * 0.25 + b2(fx, fy)));
}

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

function startBand() {
  const nums = $('[data-nums]');
  let cv = nums.querySelector('canvas');
  let gl = cv.getContext('webgl', { antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  const prog = gl && program(gl);
  const U = {};
  if (gl && !prog) {
    // A canvas that tried WebGL cannot give a 2D context; swap in a fresh one.
    gl = null;
    const fresh = cv.cloneNode(false);
    cv.replaceWith(fresh);
    cv = fresh;
  }
  const ctx = gl ? null : cv.getContext('2d');
  if (gl) {
    for (const name of ['uRes', 'uT', 'uK', 'uC0', 'uC1', 'uC2', 'uC3', 'uC4', 'uOff']) U[name] = gl.getUniformLocation(prog, name);
    RAMP.forEach((c, i) => gl.uniform3f(U[`uC${i}`], c[0] / 255, c[1] / 255, c[2] / 255));
    gl.uniform3f(U.uOff, OFF[0] / 255, OFF[1] / 255, OFF[2] / 255);
    gl.uniform1f(U.uK, K);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  }

  const items = [...nums.children].filter((el) => el !== cv);
  const numEls = [...nums.querySelectorAll('.num')];
  let w = 1, h = 1, mask = null;

  // Pick the biggest dot that fits: all numerals in one row, else stacked. Dots are whole cells.
  function fit() {
    const setDot = (d) => nums.style.setProperty('--dot', `${d}px`);
    const room = nums.clientWidth;
    nums.classList.remove('stack');
    for (const d of [24, 20, 16, 12]) {
      setDot(d);
      if (items.at(-1).getBoundingClientRect().right - items[0].getBoundingClientRect().left <= room) return;
    }
    nums.classList.add('stack');
    for (const d of [16, 12, 8]) {
      setDot(d);
      if (Math.max(...numEls.map((el) => el.offsetWidth)) <= room) return;
    }
  }

  // The mask follows where CSS placed each numeral: 255 lit dot, 90 unlit dot, 0 gap.
  function size() {
    const box = nums.getBoundingClientRect();
    w = Math.ceil(nums.clientWidth / CELL);
    h = Math.ceil(nums.clientHeight / CELL);
    mask = new Uint8Array(w * h);
    for (const el of numEls) {
      const r = el.getBoundingClientRect(), s = el.dataset.n, cols = s.length * 6 - 1;
      const P = Math.round(r.width / cols / CELL), ox = Math.round((r.left - box.left) / CELL), oy = Math.round((r.top - box.top) / CELL);
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          if (gx % 6 === 5) continue; // the space between digits
          const on = GLYPH[s[Math.floor(gx / 6)]][gy * 5 + (gx % 6)] === '1';
          for (let yy = 0; yy < P - 1; yy++) {
            for (let xx = 0; xx < P - 1; xx++) {
              const X = ox + gx * P + xx, Y = oy + gy * P + yy;
              if (X < w && Y < h) mask[Y * w + X] = on ? 255 : 90;
            }
          }
        }
      }
    }
    cv.width = w;
    cv.height = h;
    cv.style.width = `${w * CELL}px`;
    cv.style.height = `${h * CELL}px`;
    if (!gl) return;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, mask);
  }

  function draw(t) {
    if (gl) {
      gl.uniform1f(U.uT, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return;
    }
    const img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const m = mask[y * w + x];
        if (!m) continue;
        const col = m === 90 ? OFF : RAMP[shade(x + 0.5, h - y - 0.5, T0)];
        d.set([...col, 255], (y * w + x) * 4);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  const now = () => (reduce ? T0 : T0 + (performance.now() / 1000) % 3600);
  const all = () => { fit(); size(); draw(gl ? now() : T0); };
  all();
  let pending = 0;
  addEventListener('resize', () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(all); });
  document.fonts?.ready.then(all);

  // About 30 fps, only while the band is on screen. The motion is slow.
  if (!gl || reduce) return;
  let on = false, raf = 0, last = 0;
  const tick = (ts) => {
    raf = 0;
    if (!on) return;
    if (ts - last > 32) { last = ts; draw(now()); }
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    if (on && !raf) raf = requestAnimationFrame(tick);
  }).observe(nums);
}

try {
  const meta = await getJson('meta');
  const categories = await Promise.all(meta.categories.map((c) => getJson(c.id)));
  renderTiers(scoreCountries(meta, categories));
  renderBand(meta, categories);
  startBand();
  addEventListener('hashchange', followHash);
} catch (err) {
  // app.js already tells the reader the data did not load; hide the empty shells.
  document.querySelectorAll('[data-sections]').forEach((el) => (el.hidden = true));
  console.error(err);
}
