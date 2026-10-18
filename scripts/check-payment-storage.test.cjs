const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime, tick } = require('./security-test-runtime.cjs');
const checkout = { reference: 'ref-a', authorizationUrl: 'https://checkout.paystack.com/private', selectedPlans: ['plan'], billingCycle: 'monthly', amount: 100, discountAmount: 0, mode: 'replace' };

test('server checkout persistence stores only its reference', async () => {
  const r = runtime();
  const store = r.load('@/lib/pending-payment');
  await tick();
  await store.savePendingPayment('a', { ...checkout, status: 'Pending' });
  assert.deepEqual(JSON.parse(r.plain.get('staxis-payment:a')), { reference: 'ref-a' });
  assert.equal([...r.secure.values()].some((value) => value.includes('checkout.paystack')), false);
});

test('legacy checkout migration preserves recovery fields encrypted and removes plaintext details', async () => {
  const r = runtime({ plain: { 'staxis-payment:a': JSON.stringify(checkout) } });
  const store = r.load('@/lib/pending-payment');
  const restored = await store.readPendingPayment('a');
  assert.deepEqual(restored, checkout);
  assert.deepEqual(JSON.parse(r.plain.get('staxis-payment:a')), { reference: 'ref-a' });
  const restarted = runtime({ secure: Object.fromEntries(r.secure), plain: Object.fromEntries(r.plain) });
  assert.deepEqual(await restarted.load('@/lib/pending-payment').readPendingPayment('a'), checkout);
});

test('failed secure migration retains recoverable legacy checkout', async () => {
  const raw = JSON.stringify(checkout);
  const r = runtime({ plain: { 'staxis-payment:a': raw } });
  r.native.setItemAsync = async () => { throw new Error('storage unavailable'); };
  const store = r.load('@/lib/pending-payment');
  await assert.rejects(store.readPendingPayment('a'));
  assert.equal(r.plain.get('staxis-payment:a'), raw);
});

test('payment cleanup removes matching encrypted recovery but preserves a newer checkout', async () => {
  const r = runtime();
  const store = r.load('@/lib/pending-payment');
  await tick();
  await store.savePendingPayment('a', checkout);
  await store.clearPendingPayment('older-ref', 'a');
  assert.equal((await store.readPendingPayment('a')).reference, 'ref-a');
  await store.clearPendingPayment('ref-a', 'a');
  assert.equal(await store.readPendingPayment('a'), null);
  assert.equal([...r.secure.values()].some((value) => value.includes('checkout.paystack')), false);
});

test('startup migration minimizes all accounts and removes malformed payment records', async () => {
  const r = runtime({ plain: { 'staxis-payment:a': JSON.stringify(checkout), 'staxis-payment:b': '{broken' } });
  await r.load('@/lib/pending-payment').migratePendingPayments();
  assert.deepEqual(JSON.parse(r.plain.get('staxis-payment:a')), { reference: 'ref-a' });
  assert.equal(r.plain.has('staxis-payment:b'), false);
});
