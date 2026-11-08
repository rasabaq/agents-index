// The hero's crew: four pixel agents and the agent log beside the headline (hero-crew.js draws them).
// Each line is one real cell: an errand, the country, and the product its note names. The status and the live count
// come from the data when the page loads, so a data refresh updates the log without touching this file.
// To add a line: pick a cell, use a product name that appears in its note, and add images/logos/<logo>.png
// (48 x 48, the company's own icon). test/crew.test.mjs checks all three.

export const AGENTS = [
  { id: 'shop', label: 'Shop' },
  { id: 'pay', label: 'Pay' },
  { id: 'book', label: 'Book' },
  { id: 'act', label: 'Act' }, // applies for jobs, proves who you are, phones shops
];

// In play order: the agents take turns so each one keeps busy.
export const CREW = [
  { agent: 'book', errand: 'book a table', cap: 'services.restaurant-booking', country: 'GB', product: 'OpenTable', logo: 'opentable' },
  { agent: 'pay', errand: 'send a Pix', cap: 'payments.instant-rail-agent', country: 'BR', product: 'Mercado Pago', logo: 'mercadopago' },
  { agent: 'shop', errand: 'buy in chat', cap: 'commerce.in-chat-checkout', country: 'US', product: 'Gemini', logo: 'google' },
  { agent: 'act', errand: 'apply for jobs', cap: 'work.job-apply', country: 'DE', product: 'LoopCV', logo: 'loopcv' },
  { agent: 'book', errand: 'book a hotel', cap: 'services.travel-booking', country: 'JP', product: 'Booking.com', logo: 'booking' },
  { agent: 'pay', errand: 'pay by card', cap: 'payments.card-agent-token', country: 'BR', product: 'Visa', logo: 'visa' },
  { agent: 'shop', errand: 'order food', cap: 'services.delivery-rides', country: 'IN', product: 'Swiggy', logo: 'swiggy' },
  { agent: 'act', errand: 'prove my ID', cap: 'government.digital-id-api', country: 'SG', product: 'Singpass', logo: 'singpass' },
  { agent: 'book', errand: 'book a doctor', cap: 'health.book-appointment', country: 'FR', product: 'Doctolib', logo: 'doctolib' },
  { agent: 'pay', errand: 'pay by UPI', cap: 'payments.instant-rail-agent', country: 'IN', product: 'ChatGPT', logo: 'chatgpt' },
  { agent: 'shop', errand: 'order food', cap: 'services.delivery-rides', country: 'KR', product: 'KakaoTalk', logo: 'kakao' },
  { agent: 'act', errand: 'phone a shop', cap: 'autonomy.calls-for-you', country: 'US', product: 'AI Mode', logo: 'google' },
  { agent: 'book', errand: 'book a table', cap: 'services.restaurant-booking', country: 'JP', product: 'Alexa+', logo: 'amazon' },
  // A gap on purpose: the log also shows where no agent works yet.
  { agent: 'pay', errand: 'pay from a wallet', cap: 'payments.wallet-agent', country: 'KE', product: null, logo: null },
];

export const logoUrl = (logo) => `images/logos/${logo}.png`;

const capsById = (categories) => new Map(categories.flatMap((c) => c.capabilities.map((cap) => [cap.id, cap])));

// The lines as the hero shows them: status and confidence from the cell, and how many countries have that task live.
// A line whose capability or country left the data is dropped, never shown with a guessed status.
export function crewLines(meta, categories, crew = CREW) {
  const caps = capsById(categories), of = meta.countries.length;
  return crew.flatMap((line) => {
    const cap = caps.get(line.cap), cell = cap?.countries[line.country];
    if (!cell) return [];
    const live = Object.values(cap.countries).filter((c) => c.status === 'live').length;
    return [{ ...line, status: cell.status, low: cell.confidence === 'low', live, of }];
  });
}

// Problems with the crew list, as messages (empty when all is well). hasLogo(name) says whether the logo file exists.
export function checkCrew(categories, hasLogo, crew = CREW) {
  const caps = capsById(categories), agents = new Set(AGENTS.map((a) => a.id)), errors = [];
  for (const l of crew) {
    const at = `${l.errand} · ${l.country}`, cell = caps.get(l.cap)?.countries[l.country];
    if (!agents.has(l.agent)) errors.push(`${at}: unknown agent "${l.agent}"`);
    if (!cell) { errors.push(`${at}: no cell ${l.cap} for ${l.country}`); continue; }
    if (l.product && !cell.note.includes(l.product)) errors.push(`${at}: the note does not name "${l.product}"`);
    if (l.product && !l.logo) errors.push(`${at}: "${l.product}" has no logo`);
    if (l.logo && !hasLogo(l.logo)) errors.push(`${at}: missing ${logoUrl(l.logo)}`);
    if (!l.product && cell.status !== 'none') errors.push(`${at}: a line with no product must be a gap, but the cell is ${cell.status}`);
  }
  for (const a of agents) if (!crew.some((l) => l.agent === a)) errors.push(`agent "${a}" has no line`);
  return errors;
}
