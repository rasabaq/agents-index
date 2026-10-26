// Agent Atlas view: head-to-head comparison of two countries, one split row per capability.
(() => {
  const CSS = `
.v-compare { container-type: inline-size; }
.v-compare .vc-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 18px; }
.v-compare .vc-pick { flex: 0 1 230px; min-width: 0; }
.v-compare .vc-pick select { width: 100%; text-overflow: ellipsis; }
.v-compare .vc-swap { display: grid; place-items: center; flex: none; width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink-2); cursor: pointer; }
.v-compare .vc-swap:hover { border-color: var(--line-strong); color: var(--ink); }
.v-compare .vc-swap svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.v-compare .vc-only { margin-left: auto; }
.v-compare .vc-head { margin: 0; max-width: 64ch; font-size: 19px; line-height: 1.45; font-weight: 500; color: var(--ink); text-wrap: balance; }
.v-compare .vc-sub { margin: 6px 0 0; font-size: 14px; color: var(--muted); }
.v-compare .vc-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; margin: 18px 0 8px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 12.5px; color: var(--muted); }
.v-compare .vc-legend .chip { margin-right: 5px; }
.v-compare .vc-legend .low { margin: 0 5px 0 0; color: var(--ink-2); }
.v-compare .vc-key { display: inline-flex; align-items: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
.v-compare .vc-key .vc-track { width: 44px; margin-right: 7px; }

.v-compare .vc-group { margin-top: 18px; }
.v-compare .vc-cat, .v-compare .vc-row { display: grid; grid-template-columns: minmax(92px, 1fr) minmax(0, 320px) minmax(92px, 1fr); column-gap: 16px; padding: 0 34px; }
.v-compare .vc-cat { align-items: end; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
.v-compare .vc-cat h3 { margin: 0; text-align: center; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.v-compare .vc-sw { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; vertical-align: 1px; }
.v-compare .vc-code { width: 92px; text-align: center; font-size: 12px; font-weight: 600; color: var(--ink-2); white-space: nowrap; }
.v-compare .vc-cat .vc-code:first-child { justify-self: end; }

.v-compare .vc-item { border-bottom: 1px solid var(--line); }
.v-compare .vc-row { position: relative; width: 100%; grid-template-areas: 'a name b' 'a gap b'; align-items: center; row-gap: 6px; padding-top: 12px; padding-bottom: 12px; border: 0; border-radius: 8px; background: none; text-align: center; cursor: pointer; }
.v-compare .vc-row:hover { background: var(--surface-2); }
.v-compare .vc-row:focus-visible { outline-offset: -2px; }
.v-compare .vc-a { grid-area: a; justify-self: end; }
.v-compare .vc-b { grid-area: b; justify-self: start; }
.v-compare .vc-name { grid-area: name; font-size: 14px; font-weight: 600; color: var(--ink); line-height: 1.35; }
.v-compare .vc-gap { grid-area: gap; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.v-compare .vc-chip { min-width: 92px; padding: 4px 8px; text-align: center; }
.v-compare .vc-track { position: relative; display: block; width: min(100%, 240px); height: 8px; border-radius: 4px; background: var(--surface-2); box-shadow: inset 0 0 0 1px var(--line); }
.v-compare .vc-track::after { content: ''; position: absolute; left: 50%; top: -3px; bottom: -3px; width: 1px; margin-left: -0.5px; background: var(--line-strong); }
.v-compare .vc-fill { position: absolute; top: 0; bottom: 0; background: var(--accent); }
.v-compare .vc-fill.l { right: 50%; border-radius: 4px 0 0 4px; }
.v-compare .vc-fill.r { left: 50%; border-radius: 0 4px 4px 0; }
.v-compare .vc-verdict { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.v-compare .vc-verdict b { font-weight: 600; color: var(--ink-2); }
.v-compare .vc-chev { position: absolute; right: 10px; top: 50%; width: 14px; height: 14px; margin-top: -7px; fill: none; stroke: var(--muted); stroke-width: 1.8; transition: transform 0.15s ease; }
.v-compare .vc-row[aria-expanded='true'] .vc-chev { transform: rotate(180deg); }

.v-compare .vc-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; padding: 6px 34px 20px; }
.v-compare .vc-detail[hidden] { display: none; }
.v-compare .vc-side h4 { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--ink); }
.v-compare .vc-side p { margin: 0 0 8px; font-size: 13.5px; line-height: 1.5; color: var(--ink-2); }
.v-compare .vc-side .vc-lowtxt { font-size: 12.5px; color: var(--muted); }
.v-compare .vc-side ul { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.45; }
.v-compare .vc-side li { margin-bottom: 6px; }
.v-compare .vc-side li span { display: block; font-size: 12px; color: var(--muted); }
.v-compare .vc-empty { margin: 24px 0 8px; text-align: center; color: var(--muted); }
.v-compare .vc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

@container (max-width: 600px) {
  .v-compare .vc-controls { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
  .v-compare .vc-pick:first-child { grid-row: 1; }
  .v-compare .vc-swap { grid-column: 2; grid-row: 1 / 3; transform: rotate(90deg); }
  .v-compare .vc-only { grid-column: 1 / -1; justify-self: start; margin-left: 0; }
  .v-compare .vc-head { font-size: 17px; }
  .v-compare .vc-cat, .v-compare .vc-row { grid-template-columns: auto minmax(0, 1fr) auto; column-gap: 10px; padding-left: 4px; padding-right: 4px; }
  .v-compare .vc-cat { grid-template-areas: 'h h h' 'ca . cb'; row-gap: 8px; }
  .v-compare .vc-cat h3 { grid-area: h; text-align: left; }
  .v-compare .vc-code { width: auto; text-align: left; }
  .v-compare .vc-cat .vc-code:first-child { grid-area: ca; justify-self: start; }
  .v-compare .vc-cat .vc-code:last-child { grid-area: cb; }
  .v-compare .vc-row { grid-template-areas: 'name name name' 'a gap b'; row-gap: 10px; }
  .v-compare .vc-name { text-align: left; padding-right: 22px; }
  .v-compare .vc-chip { min-width: 84px; }
  .v-compare .vc-chev { top: 15px; margin-top: 0; right: 4px; }
  .v-compare .vc-detail { grid-template-columns: 1fr; padding: 4px 4px 18px; }
}`;

  const pts = (n) => `${n} ${n === 1 ? 'pt' : 'pts'}`;

  (window.ATLAS_VIEWS ??= []).push({
    id: 'compare',
    title: 'Head to head',
    blurb: 'What can an agent do in one country that it cannot do in another? Pick two countries; each row shows both statuses, and the bar points to the country that is ahead and grows with the gap.',
    render(el, ctx) {
      if (!document.getElementById('v-compare-css')) {
        const s = document.createElement('style');
        s.id = 'v-compare-css';
        s.textContent = CSS;
        document.head.append(s);
      }
      const { esc, emoji, STATUSES: S } = ctx;
      const name = Object.fromEntries(ctx.meta.countries.map((c) => [c.code, c.name]));
      // "the United States" reads right mid-sentence; only names that need an article get one.
      const the = (code) => (/^United /.test(name[code]) ? `the ${name[code]}` : name[code]);
      const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
      const caps = Object.fromEntries(ctx.capabilities.map((c) => [c.id, c]));
      const n = ctx.capabilities.length;
      const state = { a: 'US', b: 'CL', only: false, open: new Set() };

      const opts = ctx.meta.countries.map((c) => `<option value="${c.code}">${emoji(c.code)} ${esc(c.name)}</option>`).join('');
      el.classList.add('v-compare');
      el.innerHTML = `
        <div class="vc-controls">
          <label class="select vc-pick"><span class="vc-sr">First country</span><select data-side="a">${opts}</select></label>
          <button type="button" class="vc-swap" aria-label="Swap the two countries" title="Swap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/></svg>
          </button>
          <label class="select vc-pick"><span class="vc-sr">Second country</span><select data-side="b">${opts}</select></label>
          <button type="button" class="pill vc-only" aria-pressed="false">Only differences</button>
        </div>
        <p class="vc-head" aria-live="polite"></p>
        <p class="vc-sub"></p>
        <div class="vc-legend">
          ${Object.entries(S).map(([k, s]) => `<span class="vc-key"><span class="chip s-${k}">${s.label}</span>${pts(s.points)}</span>`).join('')}
          <span class="vc-key"><span class="low" aria-hidden="true">?</span>Low confidence</span>
          <span class="vc-key"><span class="vc-track"><span class="vc-fill r" style="width:37.5%"></span></span>Gap in points, toward the leader</span>
        </div>
        <div class="vc-list" role="region" aria-label="Capability by capability comparison"></div>`;
      const $ = (s) => el.querySelector(s);
      const list = $('.vc-list');

      const chip = (cell, code) => `<span class="chip vc-chip s-${cell.status}" data-code="${code}"><span class="vc-sr">${esc(name[code])}: </span>${S[cell.status].label}${cell.confidence === 'low' ? '<span class="low" title="Low confidence">?</span>' : ''}</span>`;

      const side = (cap, code) => {
        const c = cap.countries[code];
        const ev = (c.evidence ?? []).map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a><span>${esc(e.publisher)} · ${esc(e.date)}</span></li>`).join('');
        return `<div class="vc-side">
          <h4>${emoji(code)} ${esc(name[code])} <span class="chip s-${c.status}">${S[c.status].label}</span></h4>
          <p>${esc(c.note)}</p>
          ${c.confidence === 'low' ? '<p class="vc-lowtxt">Low confidence: the sources for this answer are thin or indirect.</p>' : ''}
          ${ev ? `<ul>${ev}</ul>` : '<p class="vc-lowtxt">No sources: we searched and found no availability.</p>'}
        </div>`;
      };

      function draw() {
        const { a, b } = state;
        $('[data-side="a"]').value = a;
        $('[data-side="b"]').value = b;
        $('.vc-only').setAttribute('aria-pressed', state.only);

        let ahead = 0, behind = 0, html = '';
        for (const cat of ctx.categories) {
          let rows = cat.capabilities.map((cap) => ({ cap, d: S[cap.countries[a].status].points - S[cap.countries[b].status].points }));
          ahead += rows.filter((r) => r.d > 0).length;
          behind += rows.filter((r) => r.d < 0).length;
          if (state.only) rows = rows.filter((r) => r.d);
          if (!rows.length) continue;
          // Biggest gap first; on a tie, rows where A leads come before rows where B leads.
          rows.sort((x, y) => Math.abs(y.d) - Math.abs(x.d) || y.d - x.d || x.cap.name.localeCompare(y.cap.name));
          const ci = ctx.catIndex[cat.category];
          html += `<section class="vc-group">
            <div class="vc-cat">
              <span class="vc-code" aria-hidden="true">${emoji(a)} ${a}</span>
              <h3><span class="vc-sw" style="background:${ci.color}"></span>${esc(ci.name)}</h3>
              <span class="vc-code" aria-hidden="true">${emoji(b)} ${b}</span>
            </div>
            ${rows.map(({ cap, d }) => {
              const g = Math.abs(d);
              const verdict = d > 0 ? `← <b>${a}</b> ahead by ${pts(g)}` : d < 0 ? `<b>${b}</b> ahead by ${pts(g)} →` : 'Same in both';
              const open = state.open.has(cap.id);
              const did = `vc-d-${cap.id.replace(/\W/g, '-')}`;
              return `<div class="vc-item">
                <button type="button" class="vc-row" data-id="${esc(cap.id)}" aria-expanded="${open}" aria-controls="${did}">
                  <span class="vc-a">${chip(cap.countries[a], a)}</span>
                  <span class="vc-name">${esc(cap.name)}</span>
                  <span class="vc-gap">
                    <span class="vc-track" aria-hidden="true">${d ? `<span class="vc-fill ${d > 0 ? 'l' : 'r'}" style="width:${g * 50}%"></span>` : ''}</span>
                    <span class="vc-verdict">${verdict}</span>
                  </span>
                  <span class="vc-b">${chip(cap.countries[b], b)}</span>
                  <svg class="vc-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
                </button>
                <div class="vc-detail" id="${did}"${open ? '' : ' hidden'}>${side(cap, a)}${side(cap, b)}</div>
              </div>`;
            }).join('')}
          </section>`;
        }
        list.innerHTML = html || `<p class="vc-empty">${esc(name[a])} and ${esc(name[b])} have the same status on all ${n} capabilities.</p>`;

        const gaps = ahead + behind;
        const la = ctx.byCode[a].counts.live, lb = ctx.byCode[b].counts.live;
        $('.vc-head').textContent = `In ${the(a)} an AI agent can do ${la} of ${n} things today. In ${the(b)} it can do ${lb}. `
          + (gaps ? `Here ${gaps === 1 ? 'is the 1 gap' : `are the ${gaps} gaps`}.` : 'There are no gaps.');
        $('.vc-sub').textContent = `“Today” means live for ordinary people. ${cap1(the(a))} is ahead on ${ahead}, ${the(b)} is ahead on ${behind}, and they are level on ${n - gaps}.`;
      }

      el.querySelectorAll('select').forEach((sel) => sel.addEventListener('change', () => {
        const k = sel.dataset.side, o = k === 'a' ? 'b' : 'a';
        // Picking the country already on the other side swaps them, so both sides are never the same.
        if (sel.value === state[o]) state[o] = state[k];
        state[k] = sel.value;
        draw();
      }));
      $('.vc-swap').addEventListener('click', () => {
        [state.a, state.b] = [state.b, state.a];
        draw();
      });
      $('.vc-only').addEventListener('click', () => {
        state.only = !state.only;
        draw();
      });
      list.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const row = e.target.closest('.vc-row');
        if (!row) return;
        const id = row.dataset.id, open = !state.open.has(id);
        open ? state.open.add(id) : state.open.delete(id);
        row.setAttribute('aria-expanded', open);
        row.nextElementSibling.hidden = !open;
      });
      list.addEventListener('pointermove', (e) => {
        const c = e.target.closest('.vc-chip');
        if (!c) return ctx.tip.hide();
        const cap = caps[c.closest('.vc-row').dataset.id], cell = cap.countries[c.dataset.code];
        ctx.tip.show(e, `<strong>${S[cell.status].label} in ${esc(name[c.dataset.code])}</strong>${esc(cell.note)}${cell.confidence === 'low' ? '<br><em>Low confidence.</em>' : ''}`);
      });
      list.addEventListener('pointerleave', () => ctx.tip.hide());

      draw();
    },
  });
})();
