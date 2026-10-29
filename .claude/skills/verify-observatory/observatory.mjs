#!/usr/bin/env node
// Drives the AI Agent Observatory site for verification: a static server on a free port and a headless Chrome
// on a throwaway profile, controlled over the Chrome DevTools Protocol. No npm dependencies: Node 22+ has fetch and
// WebSocket built in. Run `node observatory.mjs help` for the commands; SKILL.md explains the workflow.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync, readdirSync, openSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = resolve(process.env.VERIFY_OUT ?? join(REPO, '.verify-runs'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [cmd = 'help', ...rest] = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[i + 1]?.startsWith('--') || rest[i + 1] === undefined ? true : rest[++i];
  else args.push(rest[i]);
}

// ---- run state: one folder per run under .verify-runs/<id>; `latest` names the newest one.
const runDir = (id) => join(OUT, id);
function currentRun() {
  const id = process.env.VERIFY_RUN ?? (existsSync(join(OUT, 'latest')) ? readFileSync(join(OUT, 'latest'), 'utf8').trim() : null);
  if (!id || !existsSync(join(runDir(id), 'state.json'))) die('No run found. Start one with: node observatory.mjs up');
  return JSON.parse(readFileSync(join(runDir(id), 'state.json'), 'utf8'));
}
const saveState = (s) => writeFileSync(join(s.dir, 'state.json'), JSON.stringify(s, null, 2));
const log = (s, entry) => appendFileSync(join(s.dir, 'steps.log'), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
function die(msg) { console.error(msg); process.exit(1); }
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

function findChrome() {
  const candidates = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  for (const c of candidates) if (c && existsSync(c)) return c;
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8' }).trim(); } catch { /* next */ }
  }
  die('No Chrome found. Set CHROME=/path/to/chrome.');
}
const freePort = () => new Promise((ok) => { const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); }); });

// ---- CDP: attach to the run's page, send commands, detach. Every connection re-applies the run's emulation.
// The error collector records page errors, unhandled rejections, console.error and failed resources.
const COLLECTOR = `(() => { if (window.__verify) return; const v = window.__verify = { errors: [] };
  const add = (kind, msg) => v.errors.push({ kind, msg: String(msg).slice(0, 300) });
  addEventListener('error', (e) => { const t = e.target; if (t && t !== window && (t.src || t.href)) add('resource', t.src || t.href); else add('error', e.message); }, true);
  addEventListener('unhandledrejection', (e) => add('rejection', e.reason && (e.reason.stack || e.reason)));
  const ce = console.error; console.error = (...a) => { add('console', a.map(String).join(' ')); ce.apply(console, a); }; })();`;

async function connect(s) {
  const list = await (await fetch(`http://127.0.0.1:${s.cdpPort}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  if (!page) die('Chrome has no page target. Run doctor.');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0;
  const waiting = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) { const { ok, bad } = waiting.get(msg.id); waiting.delete(msg.id); msg.error ? bad(new Error(msg.error.message)) : ok(msg.result); }
    else if (msg.method) listeners.forEach((f) => f(msg));
  };
  const send = (method, params = {}) => new Promise((ok, bad) => { waiting.set(++id, { ok, bad }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const on = (f) => listeners.push(f);
  await send('Page.enable');
  await send('Runtime.enable');
  return { send, evaluate, on, close: () => ws.close() };
}

// Emulation (viewport, color scheme, language, time zone) and the error collector belong to the session that set them and
// vanish when it detaches. So `up` starts this holder: it stays attached and applies whatever state.json asks for.
// Headless Chrome windows cannot go below 500px wide, so a 400px phone needs this override anyway.
const VIEW = (s) => JSON.stringify({ width: s.width, height: s.height, scheme: s.scheme, lang: s.lang, tz: s.tz });
async function hold(s) {
  const c = await connect(s);
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECTOR });
  let applied = null;
  for (;;) {
    const now = JSON.parse(readFileSync(join(s.dir, 'state.json'), 'utf8'));
    if (now.stopped) process.exit(0);
    if (VIEW(now) !== applied) {
      await c.send('Emulation.setDeviceMetricsOverride', { width: now.width, height: now.height, deviceScaleFactor: 1, mobile: false });
      await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: now.scheme }] });
      await c.send('Emulation.setUserAgentOverride', { userAgent: now.userAgent, ...(now.lang ? { acceptLanguage: now.lang } : {}) });
      // The site guesses the visitor's country from the time zone, so runs pin one (UTC by default) to stay repeatable.
      await c.send('Emulation.setTimezoneOverride', { timezoneId: now.tz ?? 'UTC' });
      applied = VIEW(now);
      writeFileSync(join(s.dir, 'held.json'), applied);
    }
    await sleep(150);
  }
}
async function applyView(s) {
  saveState(s);
  for (let i = 0; i < 50; i++) {
    if (existsSync(join(s.dir, 'held.json')) && readFileSync(join(s.dir, 'held.json'), 'utf8') === VIEW(s)) return;
    await sleep(100);
  }
  die('The emulation holder did not apply the view. Run doctor.');
}
const frames = (c) => c.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
async function waitFor(c, css, ms = 10000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) {
    if (await c.evaluate(`!!document.querySelector(${JSON.stringify(css)})`)) return true;
  }
  die(`Timed out waiting for ${css}`);
}

// ---- commands
const commands = {
  async up() {
    const id = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = runDir(id);
    mkdirSync(join(dir, 'evidence'), { recursive: true });
    const port = Number(flags.port) || await freePort();
    // The same server as `npm start`, on a free port and bound to this machine only.
    const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', REPO], { detached: true, stdio: ['ignore', 'ignore', 'ignore'] });
    const chrome = spawn(findChrome(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(dir, 'profile')}`, '--window-size=1440,900',
      '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      // CI Linux runners block the user namespaces Chrome's sandbox needs; the page is our own localhost site.
      ...(process.env.CI ? ['--no-sandbox'] : []), 'about:blank'], { detached: true, stdio: ['ignore', 'ignore', openSync(join(dir, 'chrome.log'), 'w')] });
    server.unref(); chrome.unref();
    const portFile = join(dir, 'profile', 'DevToolsActivePort');
    for (let i = 0; i < 300 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile)) die(`Chrome did not start (no DevToolsActivePort). Its log:\n${readFileSync(join(dir, 'chrome.log'), 'utf8').slice(-2000)}`);
    const cdpPort = Number(readFileSync(portFile, 'utf8').split('\n')[0]);
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) { try { if ((await fetch(`${url}/`)).ok) break; } catch { /* not yet */ } await sleep(100); }
    const version = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).json();
    const rev = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    const s = { id, dir, url, port, cdpPort, serverPid: server.pid, chromePid: chrome.pid, repo: REPO, rev, width: 1440, height: 900, scheme: 'dark', lang: null,
      userAgent: version['User-Agent'].replace('HeadlessChrome', 'Chrome'), started: new Date().toISOString() };
    saveState(s);
    writeFileSync(join(OUT, 'latest'), id);
    const holder = spawn(process.execPath, [fileURLToPath(import.meta.url), 'hold'], { detached: true, stdio: 'ignore', env: { ...process.env, VERIFY_RUN: id, VERIFY_OUT: OUT } });
    holder.unref();
    s.holderPid = holder.pid;
    await applyView(s);
    log(s, { cmd: 'up', url, rev, chrome: version.Browser });
    console.log(JSON.stringify({ run: id, url, evidence: join(dir, 'evidence'), rev, chrome: version.Browser }, null, 2));
    // Without VERIFY_RUN, commands act on the newest run, which may belong to someone else's parallel run.
    console.error(`Pin your commands to this run: export VERIFY_RUN=${id}`);
  },

  async doctor() {
    const s = currentRun();
    const checks = [];
    const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
    check('server process (ours)', alive(s.serverPid), `pid ${s.serverPid}`);
    check('chrome process (ours)', alive(s.chromePid), `pid ${s.chromePid}`);
    check('emulation holder (ours)', alive(s.holderPid), `pid ${s.holderPid}, view ${VIEW(s)}`);
    try {
      const html = await (await fetch(`${s.url}/`)).text();
      check('site answers with the observatory', html.includes('<title>AI Agent Observatory'), s.url);
      const meta = await (await fetch(`${s.url}/data/meta.json`)).json();
      check('data loads', Array.isArray(meta.countries) && meta.countries.length > 0, `asOf ${meta.asOf}, ${meta.countries.length} countries`);
    } catch (e) { check('site answers with the observatory', false, e.message); }
    const rev = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    check('serving the checked-out build', rev === s.rev, `started at ${s.rev}, HEAD now ${rev}`);
    try {
      const v = await (await fetch(`http://127.0.0.1:${s.cdpPort}/json/version`)).json();
      check('chrome devtools answers', !!v.Browser, v.Browser);
    } catch (e) { check('chrome devtools answers', false, e.message); }
    const ok = checks.every((c) => c.ok);
    checks.forEach((c) => console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.detail ? `: ${c.detail}` : ''}`));
    console.log(ok ? `healthy: run ${s.id}` : `unhealthy: run ${s.id}. Run down, then up.`);
    process.exit(ok ? 0 : 1);
  },

  async open() {
    const s = currentRun();
    const path = args[0] ?? '/';
    // Each open sets the whole view; anything not given goes back to the default (1440 × 900, dark, browser language, UTC).
    s.width = Number(flags.width ?? 1440);
    s.height = Number(flags.height ?? (s.width <= 500 ? 860 : 900));
    s.scheme = flags.scheme ?? 'dark';
    s.lang = flags.lang ?? null;
    s.tz = flags.tz ?? 'UTC';
    await applyView(s);
    const c = await connect(s);
    let loaded;
    const done = new Promise((r) => (loaded = r));
    c.on((m) => m.method === 'Page.loadEventFired' && loaded());
    // A new query string forces a real load even when only the hash differs from the current page.
    const url = new URL(path, s.url);
    url.searchParams.set('verify', Date.now().toString(36));
    await c.send('Page.navigate', { url: url.href });
    await done;
    await waitFor(c, flags.wait ?? '#cn-title');
    await sleep(Number(flags.settle ?? 800));
    const info = await c.evaluate(`({ url: location.href, title: document.title, width: innerWidth, height: innerHeight, scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', languages: navigator.languages, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })`);
    log(s, { cmd: 'open', path, ...info });
    console.log(JSON.stringify(info, null, 2));
    c.close();
  },

  async eval() {
    const s = currentRun();
    const c = await connect(s);
    const value = await c.evaluate(args[0]);
    log(s, { cmd: 'eval', js: args[0].slice(0, 300), value });
    console.log(JSON.stringify(value, null, 2));
    c.close();
  },

  // A real mouse click at the centre of the first match, after scrolling it into view.
  async click() {
    const s = currentRun();
    const c = await connect(s);
    const css = JSON.stringify(args[0]);
    const box = await c.evaluate(`(() => { const e = document.querySelector(${css}); if (!e) return null; e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 80) }; })()`);
    if (!box) die(`No element matches ${args[0]}`);
    await frames(c);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
    await sleep(Number(flags.settle ?? 400));
    log(s, { cmd: 'click', css: args[0], target: box.text });
    console.log(JSON.stringify({ clicked: args[0], target: box.text }));
    c.close();
  },

  // A real key press: Escape, Enter, Tab, ArrowDown, j, k, 1-6 ...
  async press() {
    const s = currentRun();
    const c = await connect(s);
    const key = args[0];
    const codes = { Escape: 27, Enter: 13, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39 };
    const vk = codes[key] ?? key.toUpperCase().charCodeAt(0);
    // Chrome only fires a button's Enter activation when the key carries its text, '\r'.
    const text = key === 'Enter' ? '\r' : key.length === 1 ? key : undefined;
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: vk });
    await sleep(Number(flags.settle ?? 300));
    log(s, { cmd: 'press', key });
    console.log(JSON.stringify({ pressed: key }));
    c.close();
  },

  // Screenshot into the run's evidence folder: the viewport, the viewport after scrolling --at <css> to the top,
  // or --full for the whole page.
  async shot() {
    const s = currentRun();
    const name = (args[0] ?? 'shot').replace(/[^\w.-]+/g, '-');
    const c = await connect(s);
    if (flags.at) {
      const found = await c.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(flags.at)}); if (!e) return false;
        scrollTo({ top: e.getBoundingClientRect().top + scrollY - ${Number(flags.offset ?? 70)}, behavior: 'instant' }); return true; })()`);
      if (!found) die(`No element matches ${flags.at}`);
      await sleep(400);
    }
    await frames(c);
    const params = { format: 'png' };
    if (flags.full) {
      const { w, h } = await c.evaluate('({ w: document.documentElement.clientWidth, h: document.documentElement.scrollHeight })');
      Object.assign(params, { captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
    }
    const { data } = await c.send('Page.captureScreenshot', params);
    const view = await c.evaluate(`({ width: innerWidth, scrollY: Math.round(scrollY), url: location.href })`);
    const file = join(s.dir, 'evidence', `${name}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    log(s, { cmd: 'shot', file, ...view });
    console.log(file);
    c.close();
  },

  async errors() {
    const s = currentRun();
    const c = await connect(s);
    const errs = await c.evaluate('window.__verify ? window.__verify.errors : null');
    if (errs === null) die('No collector on this page. Load it with open first.');
    log(s, { cmd: 'errors', errs });
    console.log(JSON.stringify(errs, null, 2));
    c.close();
    // Failed logos fall back to a monogram on purpose, so only script and console errors fail the check.
    process.exit(errs.some((e) => e.kind !== 'resource') ? 1 : 0);
  },

  // Stop only the processes this run started, and drop the throwaway profile. Evidence and steps.log stay.
  async down() {
    const s = currentRun();
    const pids = [s.holderPid, s.chromePid, s.serverPid].filter(Boolean);
    for (const pid of pids) { try { process.kill(-pid, 'SIGTERM'); } catch { /* already gone */ } }
    for (let i = 0; i < 30 && pids.some(alive); i++) await sleep(100);
    rmSync(join(s.dir, 'profile'), { recursive: true, force: true });
    s.stopped = new Date().toISOString();
    saveState(s);
    log(s, { cmd: 'down' });
    const evidence = join(s.dir, 'evidence');
    console.log(JSON.stringify({ stopped: s.id, evidence, files: existsSync(evidence) ? readdirSync(evidence) : [] }, null, 2));
  },

  // Internal: started by `up`; see hold() above.
  async hold() { await hold(currentRun()); },

  help() {
    console.log(`Usage: node .claude/skills/verify-observatory/observatory.mjs <command>
  up [--port N]                                   start server + headless Chrome, print run id, URL, evidence dir
  doctor                                          read-only health check (exit 1 when unhealthy)
  open <path> [--width 1440|400] [--height N] [--lang es-CL] [--tz America/Santiago] [--scheme dark|light] [--wait <css>]
  eval '<js>'                                     run JS in the page, print the JSON result
  click '<css>'                                   real mouse click on the first match
  press <key>                                     real key press (Escape, Enter, Tab, ArrowDown, j, k, 1-6)
  shot <name> [--at <css>] [--full]               PNG into the run's evidence folder
  errors                                          page errors since the last open (exit 1 on script errors)
  down                                            stop this run's processes; keep evidence
Env: VERIFY_RUN=<id> picks a run (default: latest); VERIFY_OUT=<dir> moves .verify-runs; CHROME=<path>.`);
  },
};

if (!commands[cmd]) die(`Unknown command ${cmd}. Try help.`);
await commands[cmd]();
