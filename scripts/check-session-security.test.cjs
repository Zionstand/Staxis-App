const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime, deferred, tick } = require('./security-test-runtime.cjs');
const user = (id) => ({ id, email: `${id}@example.test`, firstName: id, lastName: 'Test', role: 'USER' });
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const unauthorized = (config) => ({ config, response: { status: 401, data: { message: 'Unauthorized' } } });

test('a refresh completing after local logout cannot restore credentials', async () => {
  const r = runtime();
  const auth = r.load('@/store/use-auth').useAuth;
  const tokens = r.load('@/lib/token-storage').tokenStorage;
  await tick();
  await tokens.setTokens('old-access', 'old-refresh');
  auth.getState().setUser(user('old'));
  const api = r.load('@/lib/api').default;
  const started = deferred(), refreshed = deferred();
  api.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') { started.resolve(); return response(config, await refreshed.promise); }
    if (!config._retry) throw unauthorized(config);
    return response(config, { private: true });
  };
  const request = api.get('/user/me').catch((error) => error);
  await started.promise;
  auth.getState().clearUser();
  await tokens.clear();
  refreshed.resolve({ access_token: 'resurrected', refresh_token: 'resurrected-refresh' });
  await request;
  assert.equal(await tokens.getAccessToken(), null);
  assert.equal(auth.getState().user, null);
});

test('legacy account data without credentials never authenticates on launch', async () => {
  const r = runtime({ plain: { 'auth-user': JSON.stringify({ state: { user: user('old') }, version: 0 }) } });
  const auth = r.load('@/store/use-auth').useAuth;
  await tick();
  assert.equal(auth.getState().user, null);
  assert.equal(r.plain.has('auth-user'), false);
});

test('account persistence is encrypted and restores only with credentials', async () => {
  const r = runtime();
  const auth = r.load('@/store/use-auth').useAuth;
  const tokens = r.load('@/lib/token-storage').tokenStorage;
  await tick();
  await tokens.setTokens('access', 'refresh');
  await auth.getState().setUser(user('alice'));
  assert.equal(r.plain.has('auth-user'), false);
  const restarted = runtime({ secure: Object.fromEntries(r.secure), plain: Object.fromEntries(r.plain) });
  const restored = restarted.load('@/store/use-auth').useAuth;
  await tick();
  assert.equal(restored.getState().user.id, 'alice');
});

test('malformed legacy account data is removed even when parsing fails', async () => {
  const r = runtime({ secure: { accessToken: 'access', refreshToken: 'refresh' }, plain: { 'auth-user': '{broken' } });
  const auth = r.load('@/store/use-auth').useAuth;
  await tick();
  assert.equal(auth.getState().user, null);
  assert.equal(r.plain.has('auth-user'), false);
  assert.equal(r.secure.has('accessToken'), false);
});

for (const fail of [false, true]) test(`late refresh ${fail ? 'failure' : 'success'} cannot affect another signed-in account`, async () => {
  const r = runtime();
  const { useAuth, beginSignIn, completeSignIn } = r.load('@/store/use-auth');
  await tick();
  await completeSignIn(beginSignIn(), { user: user('a'), access_token: 'a-access', refresh_token: 'a-refresh' });
  const api = r.load('@/lib/api').default;
  const started = deferred(), result = deferred();
  let retries = 0;
  api.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') { started.resolve(); return response(config, await result.promise); }
    if (!config._retry) throw unauthorized(config);
    retries++;
    return response(config, {});
  };
  const request = api.get('/user/me').catch((error) => error);
  await started.promise;
  await completeSignIn(beginSignIn(), { user: user('b'), access_token: 'b-access', refresh_token: 'b-refresh' });
  if (fail) result.reject(new Error('refresh failed'));
  else result.resolve({ access_token: 'a-new', refresh_token: 'a-new-refresh' });
  await request;
  assert.equal(useAuth.getState().user.id, 'b');
  assert.equal(r.secure.get('accessToken'), 'b-access');
  assert.equal(retries, 0);
  assert.deepEqual(r.redirects, []);
});

test('a failed token write leaves no half-authenticated account and newer login still works', async () => {
  const r = runtime();
  const { useAuth, beginSignIn, completeSignIn } = r.load('@/store/use-auth');
  await tick();
  const original = r.native.setItemAsync;
  r.native.setItemAsync = async (key, value) => { if (value === 'bad-refresh') throw new Error('disk'); return original(key, value); };
  await assert.rejects(completeSignIn(beginSignIn(), { user: user('a'), access_token: 'a-access', refresh_token: 'bad-refresh' }));
  assert.equal(useAuth.getState().user, null);
  assert.equal(r.secure.has('accessToken'), false);
  await completeSignIn(beginSignIn(), { user: user('b'), access_token: 'b-access', refresh_token: 'b-refresh' });
  assert.equal(useAuth.getState().user.id, 'b');
});

test('stale profile writes and earlier sign-in completions cannot replace the current account', async () => {
  const r = runtime();
  const { useAuth, beginSignIn, completeSignIn } = r.load('@/store/use-auth');
  await tick();
  const old = beginSignIn();
  const current = beginSignIn();
  await completeSignIn(current, { user: user('b'), access_token: 'b-access', refresh_token: 'b-refresh' });
  await assert.rejects(completeSignIn(old, { user: user('a'), access_token: 'a-access', refresh_token: 'a-refresh' }));
  await assert.rejects(useAuth.getState().setUser(user('a'), old.generation));
  assert.equal(useAuth.getState().user.id, 'b');
  assert.equal(r.secure.get('accessToken'), 'b-access');
});

test('local signout clears identity synchronously while remote logout is hung', async () => {
  const r = runtime();
  const { useAuth, beginSignIn, completeSignIn } = r.load('@/store/use-auth');
  await tick();
  await completeSignIn(beginSignIn(), { user: user('a'), access_token: 'a-access', refresh_token: 'a-refresh' });
  const { default: api, signOut } = r.load('@/lib/api');
  api.defaults.adapter = () => new Promise(() => {});
  const signedOut = signOut();
  assert.equal(useAuth.getState().user, null);
  assert.deepEqual(r.redirects, ['/(auth)/login']);
  await signedOut;
  assert.equal(r.secure.has('accessToken'), false);
});

test('concurrent unauthorized requests share one refresh and replay with refreshed credentials', async () => {
  const r = runtime();
  const { beginSignIn, completeSignIn } = r.load('@/store/use-auth');
  await tick();
  await completeSignIn(beginSignIn(), { user: user('a'), access_token: 'a-access', refresh_token: 'a-refresh' });
  const api = r.load('@/lib/api').default;
  const result = deferred();
  let refreshCount = 0;
  const headers = [];
  api.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') { refreshCount++; return response(config, await result.promise); }
    if (!config._retry) throw unauthorized(config);
    headers.push(config.headers.Authorization);
    return response(config, { success: true });
  };
  const one = api.get('/one'), two = api.get('/two');
  await tick();
  result.resolve({ access_token: 'a-new', refresh_token: 'a-new-refresh' });
  await Promise.all([one, two]);
  assert.equal(refreshCount, 1);
  assert.deepEqual(headers, ['Bearer a-new', 'Bearer a-new']);
});

test('a token write already in native storage cannot overwrite a newer sign-in', async () => {
  const r = runtime();
  const { useAuth, beginSignIn, completeSignIn } = r.load('@/store/use-auth');
  await tick();
  const started = deferred(), resume = deferred();
  const write = r.native.setItemAsync;
  r.native.setItemAsync = async (key, value) => {
    if (value === 'a-access') { started.resolve(); await resume.promise; }
    return write(key, value);
  };
  const one = completeSignIn(beginSignIn(), { user: user('a'), access_token: 'a-access', refresh_token: 'a-refresh' }).catch((error) => error);
  await started.promise;
  const two = completeSignIn(beginSignIn(), { user: user('b'), access_token: 'b-access', refresh_token: 'b-refresh' });
  resume.resolve();
  await Promise.all([one, two]);
  assert.equal(useAuth.getState().user.id, 'b');
  assert.equal(r.secure.get('accessToken'), 'b-access');
  assert.equal(r.secure.get('refreshToken'), 'b-refresh');
});

test('a request queued before signout never starts under the next session', async () => {
  const r = runtime();
  const { useAuth, beginSignIn, completeSignIn } = r.load('@/store/use-auth');
  await tick();
  await completeSignIn(beginSignIn(), { user: user('a'), access_token: 'a-access', refresh_token: 'a-refresh' });
  const { default: api, postData } = r.load('@/lib/api');
  let sent = false;
  api.defaults.adapter = async (config) => { sent = true; return response(config, {}); };
  const request = postData('/user/action', { private: 'a' }).catch((error) => error);
  await useAuth.getState().clearUser();
  await request;
  assert.equal(sent, false);
});
