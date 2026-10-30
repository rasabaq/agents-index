// "A day with an agent": everyday errands split into steps, each step one capability from the data.
// The errands are an editorial grouping, so edit them freely; checkErrands (run by the tests and npm run validate)
// catches a typo. A step is one capability id, or a list of ids when either way does the job. `labels` names each
// id in the errand's own words. `icon` is a category id, for its pixel icon (src/icons.js).
// A capability is used at most once per view, so a capability points to one step.
import { STATUSES } from './observatory.js';

export const ERRANDS = [
  { id: 'shop', title: 'Do the weekly shop', icon: 'commerce', steps: [
    ['commerce.marketplace-agent', 'commerce.in-chat-checkout'],
    ['payments.card-agent-token', 'payments.wallet-agent'],
    'services.delivery-rides',
    'rules.agent-purchase-protection',
  ], labels: {
    'commerce.marketplace-agent': 'Fill the basket on a marketplace',
    'commerce.in-chat-checkout': 'Buy inside the assistant',
    'payments.card-agent-token': 'Pay by card',
    'payments.wallet-agent': 'Pay from your wallet app',
    'services.delivery-rides': 'Get it delivered',
    'rules.agent-purchase-protection': 'Get a refund if it goes wrong',
  } },
  { id: 'bill', title: 'Pay a bill', icon: 'banking', steps: [
    'banking.open-finance-access',
    ['banking.bank-agent-actions', 'payments.instant-rail-agent'],
  ], labels: {
    'banking.open-finance-access': 'See the bill and your balance',
    'banking.bank-agent-actions': 'Tell your bank to pay it',
    'payments.instant-rail-agent': 'Send the money instantly',
  } },
  { id: 'trip', title: 'Plan a weekend away', icon: 'services', steps: [
    'services.travel-booking',
    'autonomy.calls-for-you',
    'services.restaurant-booking',
  ], labels: {
    'services.travel-booking': 'Find and book the hotel',
    'autonomy.calls-for-you': 'Phone a place with a question',
    'services.restaurant-booking': 'Book a table for dinner',
  } },
  { id: 'doctor', title: 'See a doctor', icon: 'health', steps: [
    'health.coverage-check',
    'health.book-appointment',
    'health.prescription-refill',
  ], labels: {
    'health.coverage-check': 'Check what your plan covers',
    'health.book-appointment': 'Book the appointment',
    'health.prescription-refill': 'Renew the prescription',
  } },
  { id: 'car', title: 'Sort out car insurance', icon: 'insurance', steps: [
    'messaging.business-ai-agent',
    'insurance.buy-policy',
    'messaging.pay-in-chat',
    'insurance.file-claim',
  ], labels: {
    'messaging.business-ai-agent': "Ask the insurer's chat agent",
    'insurance.buy-policy': 'Buy the policy',
    'messaging.pay-in-chat': 'Pay without leaving the chat',
    'insurance.file-claim': 'File a claim after a bump',
  } },
  { id: 'office', title: 'Deal with a public office', icon: 'government', steps: [
    'government.digital-id-api',
    'autonomy.browser-agent',
    'government.ai-public-services',
  ], labels: {
    'government.digital-id-api': 'Prove who you are',
    'autonomy.browser-agent': 'Fill in the online form',
    'government.ai-public-services': 'Finish with the government assistant',
  } },
  { id: 'setup', title: 'Set up your assistant', icon: 'access', steps: [
    'access.assistant-available',
    'access.local-language',
    'autonomy.personal-assistant-actions',
  ], labels: {
    'access.assistant-available': 'Sign up for a big assistant',
    'access.local-language': 'Use it in your own language',
    'autonomy.personal-assistant-actions': 'Let it act in your apps',
  } },
];

// The For businesses view: the seller's side of BUSINESS_GROUPS (src/observatory.js), plus the back office.
export const BUSINESS_ERRANDS = [
  { id: 'sell', title: 'Sell through AI agents', icon: 'commerce', steps: [
    'commerce.merchant-protocol',
    ['commerce.in-chat-checkout', 'commerce.marketplace-agent'],
    'rules.ai-law',
  ], labels: {
    'commerce.merchant-protocol': 'Open your store to AI agents',
    'commerce.in-chat-checkout': 'Customers buy inside an AI assistant',
    'commerce.marketplace-agent': 'Marketplace agents buy for shoppers',
    'rules.ai-law': 'Know which AI law applies',
  } },
  { id: 'chat', title: 'Sell in chat apps', icon: 'messaging', steps: [
    'messaging.business-ai-agent',
    'messaging.pay-in-chat',
  ], labels: {
    'messaging.business-ai-agent': 'Run an AI agent that sells in chat',
    'messaging.pay-in-chat': 'Take payment inside the chat',
  } },
  { id: 'paid', title: 'Get paid by agents', icon: 'payments', steps: [
    ['payments.card-agent-token', 'payments.instant-rail-agent', 'payments.wallet-agent'],
    'banking.open-finance-access',
  ], labels: {
    'payments.card-agent-token': 'Get paid by card',
    'payments.instant-rail-agent': 'Get paid by instant transfer',
    'payments.wallet-agent': 'Get paid from a wallet app',
    'banking.open-finance-access': 'See the money land in your account',
  } },
  { id: 'backoffice', title: 'Run the back office', icon: 'work', steps: [
    'work.hr-payroll',
    'banking.bank-agent-actions',
  ], labels: {
    'work.hr-payroll': 'Run payroll and HR paperwork',
    'banking.bank-agent-actions': "Pay suppliers through your bank's assistant",
  } },
];

// What a step's status means for you: a live step the agent does, a limited one it helps with and you finish,
// anything else you do yourself.
export const roleOf = (status) => (status === 'live' ? 'does' : status === 'limited' ? 'helps' : 'you');

const ids = (step) => [step].flat();

// One errand in one country. capIndex maps a capability id to the capability (its cells in `countries`).
// Each step lists its ways with their cells; `best` is the way with the best status (the first on a tie), and the
// step's role is the best way's role. `handoff` is the first step you do yourself, or -1 when the agent can at least
// help with every step. Ids missing from the data are skipped, so a renamed capability never breaks the page.
export function errandIn(errand, capIndex, code) {
  const steps = errand.steps.map((step) => {
    const ways = ids(step).filter((id) => capIndex[id]).map((id) => {
      const cell = capIndex[id].countries[code];
      return { id, label: errand.labels[id], cap: capIndex[id], cell, role: roleOf(cell.status) };
    });
    const best = ways.reduce((a, b) => (STATUSES[b.cell.status].points > STATUSES[a.cell.status].points ? b : a), ways[0]);
    return { ways, best, role: best?.role };
  }).filter((s) => s.ways.length);
  const count = (role) => steps.filter((s) => s.role === role).length;
  return {
    steps,
    does: count('does'),
    helps: count('helps'),
    you: count('you'),
    points: steps.reduce((sum, s) => sum + STATUSES[s.best.cell.status].points, 0),
    handoff: steps.findIndex((s) => s.role === 'you'),
  };
}

// Where a capability sits in a list of errands: the errand and the step's index, or null.
export function findStep(errands, capId) {
  for (const errand of errands) {
    const index = errand.steps.findIndex((step) => ids(step).includes(capId));
    if (index >= 0) return { errand, index };
  }
  return null;
}

// Problems with the errands, against the capability ids in the data. An empty list means they are fine.
export function checkErrands(capIds, views = { people: ERRANDS, business: BUSINESS_ERRANDS }) {
  const known = new Set(capIds);
  const errors = [];
  for (const [view, errands] of Object.entries(views)) {
    const seen = new Set();
    const errandIds = new Set();
    for (const e of errands) {
      if (errandIds.has(e.id)) errors.push(`errands (${view}): errand id "${e.id}" is used twice`);
      errandIds.add(e.id);
      for (const id of e.steps.flatMap(ids)) {
        if (!known.has(id)) errors.push(`errands (${view}): "${e.id}" names an unknown capability "${id}"`);
        if (seen.has(id)) errors.push(`errands (${view}): capability "${id}" is used twice`);
        if (!e.labels?.[id]) errors.push(`errands (${view}): "${e.id}" has no label for "${id}"`);
        seen.add(id);
      }
    }
  }
  return errors;
}
