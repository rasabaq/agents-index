// Every cell as one CSV table: a row per country and check, in the order of meta.json and the category files.
// The site builds it in the browser from the data already loaded (ui.js wireCsv), so it is never out of date.
export const CSV_COLUMNS = ['country_code', 'country', 'category', 'capability_id', 'capability', 'status', 'unsure', 'gap_reason', 'note', 'sources', 'source_urls', 'as_of'];

// RFC 4180: a field with a comma, a quote or a line break goes in quotes, and a quote inside is doubled.
export const csvField = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function cellsCsv(meta, categories) {
  const rows = [CSV_COLUMNS];
  for (const country of meta.countries) {
    for (const cat of categories) {
      for (const cap of cat.capabilities) {
        const cell = cap.countries[country.code];
        if (!cell) continue;
        const urls = (cell.evidence ?? []).map((e) => e.url);
        rows.push([country.code, country.name, cat.category, cap.id, cap.name, cell.status, cell.confidence === 'low' ? 'yes' : 'no', cell.gapReason ?? '', cell.note, urls.length, urls.join(' '), meta.asOf]);
      }
    }
  }
  return `${rows.map((r) => r.map(csvField).join(',')).join('\r\n')}\r\n`;
}
