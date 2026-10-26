// Agent Atlas view: a periodic table of agent capabilities. One tile per capability, grouped by category.
(window.ATLAS_VIEWS ??= []).push({
  id: 'periodic',
  title: 'Periodic table',
  blurb: 'Which agent capabilities are everywhere, and which are rare? Each tile is one capability; the big number counts the countries where it is live, and the squares show every country in ranking order. Click a tile for notes and sources.',
  render(el, ctx) {
    const { esc, flag, STATUSES } = ctx;
    const ORDER = ['live', 'limited', 'announced', 'none'];
    // Hand-picked element-style symbols; unknown ids fall back to two letters of the name.
    const SYMBOLS = {
      'commerce.in-chat-checkout': 'Ck', 'commerce.marketplace-agent': 'Mp', 'commerce.merchant-protocol': 'Mc',
      'payments.card-agent-token': 'Cd', 'payments.instant-rail-agent': 'Ir', 'payments.wallet-agent': 'Wa',
      'services.restaurant-booking': 'Rb', 'services.travel-booking': 'Tr', 'services.delivery-rides': 'Dr',
      'autonomy.browser-agent': 'Bw', 'autonomy.calls-for-you': 'Ph', 'autonomy.personal-assistant-actions': 'Pa',
      'banking.open-finance-access': 'Ob', 'banking.bank-agent-actions': 'Bk',
      'messaging.business-ai-agent': 'Bz', 'messaging.pay-in-chat': 'Pc',
      'government.digital-id-api': 'Id', 'government.ai-public-services': 'Gv',
    };
    const symbol = (cap) => SYMBOLS[cap.id] ?? cap.name[0].toUpperCase() + (cap.name.slice(1).match(/[bcdfghjklmnpqrstvwxz]/i)?.[0] ?? '').toLowerCase();
    const countries = ctx.ranking; // squares follow the ranking, best first
    const cell = (cap, code) => cap.countries[code] ?? { status: 'none', note: '', evidence: [] };
    const live = (cap) => countries.filter((c) => cell(cap, c.code).status === 'live').length;
    const points = (cap) => countries.reduce((s, c) => s + STATUSES[cell(cap, c.code).status].points, 0);
    const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : '#');

    if (!document.getElementById('v-periodic-style')) {
      const style = document.createElement('style');
      style.id = 'v-periodic-style';
      style.textContent = `
.v-periodic { font-family: var(--font); }
.v-periodic .pt-sum { margin: 0 0 12px; font-size: 14px; color: var(--ink-2); }
.v-periodic .pt-sum b { color: var(--ink); font-weight: 600; }
.v-periodic .pt-legend { margin-bottom: 24px; align-items: center; }
.v-periodic .pt-legend > span { display: inline-flex; align-items: center; gap: 8px; }
.v-periodic .pt-legend .low { margin: 0; }
.v-periodic .pt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 28px 12px; align-items: start; }
.v-periodic .pt-head { margin: 0 0 10px; padding-top: 10px; border-top: 2px solid var(--line); font: 500 10.5px/1.3 var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-2); }
.v-periodic .pt-tiles { display: grid; gap: 8px; }
.v-periodic .pt-tile { container-type: inline-size; display: block; width: 100%; padding: 12px 12px 8px; border: 1px solid var(--line); border-radius: 10px; background: rgba(3, 3, 8, 0.55); text-align: left; cursor: pointer; transition: border-color 0.12s ease, box-shadow 0.12s ease; }
.v-periodic .pt-tile:hover { border-color: var(--line-strong); }
.v-periodic .pt-tile[aria-pressed='true'] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.v-periodic .pt-in { display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'sym num' 'name name' 'sq sq'; gap: 8px; align-items: start; }
/* the element symbol is the one pixel moment: Jersey 10 in the category color */
.v-periodic .pt-sym { grid-area: sym; font: 400 34px/0.75 var(--pixel); color: var(--cat); }
.v-periodic .pt-num { grid-area: num; text-align: right; line-height: 1; }
.v-periodic .pt-num b { font-size: 28px; font-weight: 700; letter-spacing: -0.03em; color: var(--ink); }
.v-periodic .pt-num span { display: block; margin-top: 5px; font: 400 10.5px/1 var(--mono); color: var(--muted); }
.v-periodic .pt-name { grid-area: name; min-height: 2.7em; font-size: 13px; line-height: 1.35; color: var(--ink-2); }
.v-periodic .pt-sq { grid-area: sq; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 2px; }
/* one column per country: status capsule, then flag over code. Hovering a country lights its column in every tile. */
.v-periodic .pt-sq > span { display: grid; grid-template-rows: 14px auto; justify-items: center; align-items: center; gap: 5px; padding: 6px 0 5px; border-radius: 6px; }
.v-periodic .pt-sq em { display: grid; justify-items: center; gap: 4px; font: 500 9.5px/1 var(--mono); font-style: normal; letter-spacing: 0.06em; color: var(--muted); }
.v-periodic .pt-sq em .flag { width: auto; margin: 0; font-size: 13px; }
.v-periodic .pt-sq > span.on { background: var(--sun-tint); }
.v-periodic .pt-sq > span.on em { color: var(--sunrise); }
.v-periodic .pt-panel { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line); }
.v-periodic .pt-hint { margin: 0; font-size: 13px; color: var(--muted); }
.v-periodic .pt-dh { display: flex; align-items: flex-start; gap: 14px; }
.v-periodic .pt-dsym { flex: none; display: grid; place-items: center; width: 52px; height: 52px; border: 1px solid var(--line); border-top: 2px solid var(--cat); border-radius: 8px; font: 400 32px/1 var(--pixel); color: var(--cat); }
.v-periodic .pt-dh h3 { margin: 0; font-size: 18px; line-height: 1.3; outline: none; }
.v-periodic .pt-dh p { margin: 4px 0 0; font-size: 14px; color: var(--ink-2); }
.v-periodic .pt-dh .pt-cat { font: 500 10.5px/1.4 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.v-periodic .pt-close { flex: none; margin-left: auto; width: 32px; height: 32px; border: 0; border-radius: 8px; background: var(--surface-2); color: var(--ink-2); font-size: 20px; line-height: 1; cursor: pointer; }
.v-periodic .pt-close:hover { color: var(--ink); }
.v-periodic .pt-rows { margin: 18px 0 0; padding: 0; list-style: none; }
.v-periodic .pt-rows > li { display: grid; grid-template-columns: 160px 96px minmax(0, 1fr); gap: 6px 16px; padding: 14px 0; border-top: 1px solid var(--line); font-size: 14px; }
.v-periodic .pt-c { font-weight: 600; color: var(--ink); }
.v-periodic .pt-st { display: grid; justify-items: start; align-content: start; gap: 4px; }
.v-periodic .pt-st small { margin-top: 2px; font: 400 10.5px/1.3 var(--mono); color: var(--muted); }
.v-periodic .pt-note { margin: 0; color: var(--ink-2); line-height: 1.5; }
.v-periodic .pt-ev { margin: 8px 0 0; padding: 0; list-style: none; font-size: 13px; line-height: 1.45; }
.v-periodic .pt-ev li + li { margin-top: 4px; }
.v-periodic .pt-ev a { font-weight: 500; }
.v-periodic .pt-ev span { color: var(--muted); }
@container (min-width: 300px) {
  .v-periodic .pt-in { grid-template-columns: 36px minmax(0, 1fr) auto; grid-template-areas: 'sym name num' 'sq sq sq'; gap: 10px 10px; }
  .v-periodic .pt-sym { font-size: 30px; }
  .v-periodic .pt-name { min-height: 0; padding-top: 2px; font-size: 13.5px; color: var(--ink); }
}
@media (max-width: 640px) {
  .v-periodic .pt-rows > li { grid-template-columns: minmax(0, 1fr) auto; }
  .v-periodic .pt-body { grid-column: 1 / -1; }
  .v-periodic .pt-st { justify-items: end; }
}
@media (max-width: 520px) {
  .v-periodic .pt-dsym { display: none; }
}`;
      document.head.append(style);
    }

    const groups = ctx.categories.map((cat) => ({
      id: cat.category,
      caps: cat.capabilities.map((cap) => ({ ...cap, category: cat.category, sym: symbol(cap), live: live(cap) }))
        .sort((a, b) => b.live - a.live || points(b) - points(a) || a.name.localeCompare(b.name)),
    }));
    const all = groups.flatMap((g) => g.caps);
    const byId = Object.fromEntries(all.map((c) => [c.id, c]));

    // One-line takeaway: how many are live everywhere, and how many in just one country (and where).
    const n = countries.length;
    const everywhere = all.filter((c) => c.live === n).length;
    const single = all.filter((c) => c.live === 1);
    const where = [...new Set(single.map((c) => countries.find((k) => cell(c, k.code).status === 'live').code))];
    const summary = `<b>${everywhere} of ${all.length}</b> capabilities are live in all ${n} countries. `
      + (single.length ? `<b>${single.length}</b> ${single.length === 1 ? 'is' : 'are'} live in just one country${where.length === 1 ? `, ${single.length === 1 ? 'the' : 'all in the'} ${esc(ctx.byCode[where[0]].name)}` : ''}.` : '');

    const square = (cap, c) => {
      const x = cell(cap, c.code);
      return `<span data-code="${c.code}"><i class="smark ${x.status}${x.confidence === 'low' ? ' q' : ''}"></i><em>${flag(c.code)}${c.code}</em></span>`;
    };
    const tile = (cap) => `
      <button type="button" class="pt-tile" style="--cat: ${ctx.catIndex[cap.category].color}" data-cap="${esc(cap.id)}" aria-pressed="false"
        aria-label="${esc(cap.name)}: live in ${cap.live} of ${n} countries. Show details.">
        <span class="pt-in"><span class="pt-sym" aria-hidden="true">${esc(cap.sym)}</span>
          <span class="pt-num"><b>${cap.live}</b><span>of ${n} live</span></span>
          <span class="pt-name">${esc(cap.name)}</span>
          <span class="pt-sq" aria-hidden="true">${countries.map((c) => square(cap, c)).join('')}</span></span>
      </button>`;

    el.innerHTML = `<div class="v-periodic">
      <p class="pt-sum">${summary}</p>
      <div class="atlas-legend pt-legend">
        ${ORDER.map((s) => `<span><i class="smark ${s}"></i>${esc(STATUSES[s].label)}</span>`).join('')}
        <span><span class="low"></span>Low confidence: sources are thin</span>
        <span>Squares follow the country ranking, best first</span>
      </div>
      <div class="pt-grid" role="group" aria-label="Periodic table of ${all.length} agent capabilities, grouped by category">
        ${groups.map((g) => `<section>
          <h3 class="pt-head" style="border-top-color: ${ctx.catIndex[g.id].color}">${esc(ctx.catName(g.id))}</h3>
          <div class="pt-tiles">${g.caps.map(tile).join('')}</div>
        </section>`).join('')}
      </div>
      <div class="pt-panel" aria-live="polite"><p class="pt-hint">Click a tile to see every country's status, note and sources.</p></div>
    </div>`;

    const root = el.firstElementChild;
    const panel = root.querySelector('.pt-panel');
    let open = null;

    const detail = (cap) => `
      <div class="pt-dh">
        <span class="pt-dsym" style="--cat: ${ctx.catIndex[cap.category].color}" aria-hidden="true">${esc(cap.sym)}</span>
        <div>
          <span class="pt-cat">${esc(ctx.catName(cap.category))} · live in ${cap.live} of ${n} countries</span>
          <h3 tabindex="-1">${esc(cap.name)}</h3>
          <p>${esc(cap.question)}</p>
        </div>
        <button type="button" class="pt-close" aria-label="Close details">×</button>
      </div>
      <ul class="pt-rows">${countries.map((c) => {
        const x = cell(cap, c.code);
        return `<li>
          <span class="pt-c">${flag(c.code)}${esc(c.name)}</span>
          <span class="pt-st"><span class="chip s-${x.status}">${esc(STATUSES[x.status].label)}${x.confidence === 'low' ? '<span class="low"></span>' : ''}</span>${x.confidence === 'low' ? '<small>Low confidence</small>' : ''}</span>
          <div class="pt-body">
            <p class="pt-note">${esc(x.note || 'No note.')}</p>
            ${x.evidence?.length ? `<ul class="pt-ev">${x.evidence.map((e) => `<li><a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a> <span>${esc([e.publisher, e.date].filter(Boolean).join(', '))}</span></li>`).join('')}</ul>` : ''}
          </div>
        </li>`;
      }).join('')}</ul>`;

    const select = (id, focus) => {
      open = open === id ? null : id;
      root.querySelectorAll('.pt-tile').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.cap === open)));
      if (!open) {
        panel.innerHTML = '<p class="pt-hint">Click a tile to see every country\'s status, note and sources.</p>';
        return;
      }
      panel.innerHTML = detail(byId[open]);
      if (focus) panel.querySelector('h3').focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    root.addEventListener('click', (e) => {
      if (e.target.closest('.pt-close')) {
        const id = open;
        select(open);
        root.querySelector(`.pt-tile[data-cap="${CSS.escape(id)}"]`)?.focus();
        return;
      }
      const t = e.target.closest('.pt-tile');
      if (t) { ctx.tip.hide(); select(t.dataset.cap, e.detail === 0); }
    });

    let lit = null;
    const light = (code) => {
      if (code === lit) return;
      lit = code;
      root.querySelectorAll('.pt-sq > span').forEach((s) => s.classList.toggle('on', s.dataset.code === code));
    };
    root.addEventListener('pointermove', (e) => {
      const sq = e.target.closest('.pt-sq > span');
      light(sq?.dataset.code ?? null);
      if (!sq) return ctx.tip.hide();
      const c = ctx.byCode[sq.dataset.code];
      const x = cell(byId[sq.closest('.pt-tile').dataset.cap], c.code);
      ctx.tip.show(e, `<strong>${flag(c.code)}${esc(c.name)} · ${esc(STATUSES[x.status].label)}${x.confidence === 'low' ? ' · low confidence' : ''}</strong>${esc(x.note)}`);
    });
    root.addEventListener('pointerleave', () => { light(null); ctx.tip.hide(); });
  },
});
