// Run with: node scripts/check-billing-selection.cjs
// Uses installed TypeScript to exercise the app's billing code without a native runtime.
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const modules = new Map();
function loadSource(relativePath) {
  if (modules.has(relativePath)) return modules.get(relativePath);
  const file = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  modules.set(relativePath, exports);
  vm.runInNewContext(outputText, {
    exports,
    URL,
    require: (name) => name.startsWith('@/') ? loadSource(`src/${name.slice(2)}.ts`) : require(name),
  }, { filename: file });
  return exports;
}

const billing = loadSource('src/lib/billing.ts');
const { CreateTicketSchema } = loadSource('src/lib/zod-schema.ts');
const ids = (plans) => Array.from(plans, (plan) => plan.id);
const plain = (value) => JSON.parse(JSON.stringify(value));
const tracks = [
  { id: 'business', title: 'Business IT Management', plans: [
    { id: 'business-enterprise', name: 'Enterprise', price: 250000, isCustom: true },
    { id: 'business-executive', name: 'Executive', price: 250000, isCustom: false },
  ] },
  { id: 'digital', title: 'Digital Systems Management', plans: [
    { id: 'digital-enterprise', name: 'Enterprise', price: 0, isCustom: true },
    { id: 'digital-core', name: 'Core', price: 60000, isCustom: false },
  ] },
  { id: 'data', title: 'Data Analytics and Intelligence', plans: [
    { id: 'data-enterprise', name: 'Enterprise', price: 0, isCustom: true },
    { id: 'data-analyst', name: 'Analyst', price: 90000, isCustom: false },
  ] },
];
const enterprise = { business: 'business-enterprise', digital: 'digital-enterprise', data: 'data-enterprise' };
const mixed = { ...enterprise, digital: 'digital-core', data: 'data-analyst' };

const checks = [
  ['Enterprise remains selected in all three services without enabling a zero/custom payment', () => {
    const selection = billing.getBillingSelection(tracks, enterprise);
    assert.deepEqual(ids(selection.plans), Object.values(enterprise));
    assert.equal(selection.quotePlans.length, 3);
    assert.equal(selection.pricedPlans.length, 0);
    assert.equal(billing.isValidPaymentAmount(billing.priceSubscription(selection.pricedPlans, 'monthly').total), false);
  }],
  ['Mixed selection charges only priced plans and computes discounts from those plans', () => {
    const selection = billing.getBillingSelection(tracks, mixed);
    assert.deepEqual(ids(selection.pricedPlans), ['digital-core', 'data-analyst']);
    assert.deepEqual(ids(selection.quotePlans), ['business-enterprise']);
    assert.deepEqual(plain(billing.priceSubscription(selection.pricedPlans, 'annually')), {
      subtotal: 1800000, bundleDiscount: 135000, cycleDiscount: 180000, total: 1485000,
    });
    const single = billing.getBillingSelection(tracks, { business: 'business-enterprise', digital: 'digital-core' });
    assert.equal(billing.priceSubscription(single.pricedPlans, 'monthly').bundleDiscount, 0);
  }],
  ['Changing the plan in one service preserves the selections in other services', () => {
    const changed = billing.getBillingSelection(tracks, { ...enterprise, business: 'business-executive' });
    assert.deepEqual(ids(changed.plans), ['business-executive', 'digital-enterprise', 'data-enterprise']);
    assert.deepEqual(ids(changed.pricedPlans), ['business-executive']);
    assert.equal(changed.quotePlans.length, 2);
  }],
  ['Catalogue refresh preserves choices and removes missing or mismatched plan IDs', () => {
    assert.deepEqual(plain(billing.reconcilePlanSelection(tracks, mixed)), mixed);
    const refreshed = tracks.map((track) => ({ ...track, plans: track.plans.filter((plan) => plan.id !== 'data-analyst') }));
    const reconciled = billing.reconcilePlanSelection(refreshed, { ...mixed, removedService: 'old-plan' });
    assert.deepEqual(plain(reconciled), { business: 'business-enterprise', digital: 'digital-core' });
    assert.equal(billing.getBillingSelection(tracks, { business: 'digital-core' }).plans.length, 0);
  }],
  ['Refreshed pricing/custom status changes eligibility while retaining the chosen plan', () => {
    const refreshed = tracks.map((track) => ({ ...track, plans: track.plans.map((plan) => plan.id === 'business-enterprise'
      ? { ...plan, isCustom: false, price: 300000 } : plan) }));
    const selection = billing.getBillingSelection(refreshed, billing.reconcilePlanSelection(refreshed, enterprise));
    assert.deepEqual(ids(selection.pricedPlans), ['business-enterprise']);
    assert.equal(billing.priceSubscription(selection.pricedPlans, 'monthly').total, 300000);
    assert.equal(selection.quotePlans.length, 2);
  }],
  ['Zero, negative, nonfinite and unsafe amounts cannot enter online checkout', () => {
    for (const price of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      const selection = billing.getBillingSelection([{ id: 'invalid', title: 'Service', plans: [{ id: 'p', name: 'Plan', price }] }], { invalid: 'p' });
      assert.equal(selection.pricedPlans.length, 0);
      assert.equal(selection.quotePlans.length, 1);
    }
  }],
  ['Hosted checkout accepts only the exact HTTPS Paystack checkout origin', () => {
    assert.equal(typeof billing.isTrustedPaystackCheckoutUrl, 'function');
    assert.equal(billing.isTrustedPaystackCheckoutUrl('https://checkout.paystack.com/pay/abc'), true);
    for (const url of [
      'http://checkout.paystack.com/pay/abc',
      'https://checkout.paystack.com.evil.test/pay/abc',
      'https://checkout.paystack.com:8443/pay/abc',
      'https://user@checkout.paystack.com/pay/abc',
      'javascript:alert(1)',
    ]) assert.equal(billing.isTrustedPaystackCheckoutUrl(url), false, url);
  }],
  ['Quote draft contains all service/plan context and satisfies the real Support form schema', () => {
    const draft = billing.createPlanQuoteRequest(tracks.map((track) => ({ name: 'Enterprise', trackTitle: track.title })), 'quarterly');
    const validated = CreateTicketSchema.safeParse({ subject: draft.quoteSubject, description: draft.quoteDescription, category: 'BILLING' });
    assert.equal(validated.success, true);
    for (const track of tracks) assert.ok(draft.quoteDescription.includes(`Enterprise — ${track.title}`));
    assert.ok(draft.quoteDescription.includes('Preferred billing period: Quarterly'));
    const longDraft = billing.createPlanQuoteRequest([{ name: 'Enterprise'.repeat(30), trackTitle: 'Business IT' }], 'monthly');
    assert.equal(longDraft.quoteSubject.length, 150);
    assert.ok(longDraft.quoteDescription.includes('Enterprise'.repeat(30)));
  }],
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`${checks.length} billing selection checks passed.`);
