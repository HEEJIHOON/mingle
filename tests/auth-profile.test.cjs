// Run: node --test tests/auth-profile.test.cjs. No network or real accounts are used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function element() {
  return { value: '', textContent: '', disabled: false, hidden: false, attrs: {}, listeners: {},
    classList: { toggle() {} }, setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(k, fn) { this.listeners[k] = fn; }, focus() {},
    async fire(k) { return this.listeners[k]?.({ preventDefault() {} }); } };
}
const user = { id: 'self', email: 'test@example.invalid', user_metadata: { nickname: 'nick' } };
function setup(options = {}, file) {
  const els = new Map();
  const el = id => { if (!els.has(id)) els.set(id, element()); return els.get(id); };
  for (const id of ['p-nick', 'p-city', 'p-bio', 'p-submit']) el(id).disabled = true;
  el('a-submit').textContent = '로그인';
  el('p-submit').textContent = '불러오는 중…';
  const calls = { updates: 0, auth: 0 };
  const initial = { nickname: 'nick', city: '서울', bio: '기존 소개' };
  let written;
  const db = {
    auth: {
      onAuthStateChange: () => ({}),
      getSession: async () => { if (options.sessionThrow) throw Error('offline'); return { data: { session: options.guest ? null : { user } }, error: options.sessionError ? Error('session') : null }; },
      signOut: async () => { if (options.logoutThrow) throw Error('offline'); return { error: options.logoutError ? Error('logout') : null }; },
      signInWithPassword: async () => { calls.auth++; if (options.authWait) await options.authWait; if (options.authThrow) throw Error('offline'); return { error: options.authError ? Error('Invalid login credentials') : null }; },
      signUp: async () => { calls.auth++; if (options.authWait) await options.authWait; if (options.authThrow) throw Error('offline'); return { data: { session: options.confirmEmail ? null : { user } }, error: options.authError ? Error('rate limit') : null }; },
    },
    from: () => {
      let update = false;
      const query = {
        select() { return query; }, eq() { return query; },
        update(fields) { update = true; written = fields; calls.updates++; return query; },
        async maybeSingle() {
          if (update ? options.saveThrow : options.readThrow) throw Error('offline');
          return update ? { data: options.zeroRows ? null : { id: options.wrongId ? 'other' : 'self', ...written }, error: options.saveError ? Error('save') : null }
            : { data: options.noProfile ? null : initial, error: options.readError ? Error('read') : null };
        },
      }; return query;
    },
  };
  const context = vm.createContext({
    window: { supabase: { createClient: () => db } },
    document: { body: { insertAdjacentHTML() {} }, documentElement: { classList: { toggle() {} } },
      querySelectorAll: () => [], getElementById: el, querySelector: s => el(s.slice(1)) },
    location: { pathname: '/' + (file === 'mypage.js' ? 'mypage.html' : 'login.html'), href: '', search: '' },
    URLSearchParams, console, Error,
  });
  const run = code => vm.runInContext(code, context);
  run(source('common.js'));
  if (file) run(source(file));
  return { el, calls, context, run, async settle() { await new Promise(resolve => setImmediate(resolve)); } };
}
for (const key of ['sessionError', 'sessionThrow']) test(key + ' is not a logged-out success', async () => {
  const s = setup({ [key]: true }); await s.settle(); assert.equal(s.run('authFailed'), true); assert.equal(s.run('authState'), 'error');
});
test('normal guest and authenticated states remain distinct', async () => {
  const guest = setup({ guest: true }), member = setup(); await guest.settle(); await member.settle();
  assert.equal(guest.run('authState'), 'out'); assert.equal(member.run('authState'), 'in');
});
for (const key of ['logoutError', 'logoutThrow']) for (const file of [null, 'mypage.js']) test(key + ' does not redirect from ' + (file || 'footer'), async () => {
  const s = setup({ [key]: true }, file); await s.settle();
  await s.el(file ? 'p-logout' : 'foot-auth').fire('click');
  assert.equal(s.context.location.href, ''); assert.equal(s.el('p-logout').disabled, false);
  assert.match(s.el(file ? 'p-status' : 'foot-auth').textContent, /실패/);
});
for (const file of [null, 'mypage.js']) test('successful logout redirects from ' + (file || 'footer'), async () => {
  const s = setup({}, file); await s.settle(); await s.el(file ? 'p-logout' : 'foot-auth').fire('click'); assert.equal(s.context.location.href, 'index.html');
});
for (const key of ['readError', 'readThrow', 'noProfile']) test(key + ' blocks editing and saving without blocking logout', async () => {
  const s = setup({ [key]: true }, 'mypage.js'); await s.settle();
  assert.equal(s.el('p-submit').disabled, true); assert.equal(s.el('p-city').disabled, true);
  assert.ok((await s.run('saveProfile({nickname:"new"})')).error); assert.equal(s.calls.updates, 0);
  await s.el('p-logout').fire('click'); assert.equal(s.context.location.href, 'index.html');
});
for (const key of ['zeroRows', 'wrongId', 'saveError', 'saveThrow']) test(key + ' is not a successful profile save', async () => {
  const s = setup({ [key]: true }, 'mypage.js'); await s.settle(); s.el('p-nick').value = 'new';
  await s.el('profile-form').fire('submit'); assert.match(s.el('p-status').textContent, /失敗|실패/);
  assert.equal(s.run('ME.name'), 'nick'); assert.equal(s.run('ME.city'), '서울'); assert.equal(s.el('p-submit').disabled, false); assert.equal(s.el('p-submit').textContent, '저장');
});
test('confirmed saved row updates ME', async () => {
  const s = setup({}, 'mypage.js'); await s.settle(); s.el('p-nick').value = 'new';
  await s.el('profile-form').fire('submit'); assert.equal(s.run('ME.name'), 'new'); assert.equal(s.run('ME.city'), '서울'); assert.equal(s.el('p-status').textContent, '저장했어요.');
});
test('unexpected save rejection still restores the button and keeps typed values', async () => {
  const s = setup({}, 'mypage.js'); await s.settle(); s.el('p-nick').value = 'typed'; s.run('saveProfile = async () => { throw new Error("offline"); }');
  await s.el('profile-form').fire('submit'); assert.equal(s.el('p-submit').disabled, false); assert.equal(s.el('p-nick').value, 'typed'); assert.match(s.el('p-status').textContent, /실패/);
});
for (const mode of ['login', 'signup']) for (const key of ['authThrow', 'authError', 'success']) test(mode + ' ' + key + ' restores both buttons', async () => {
  const s = setup({ guest: true, [key]: true }, 'auth.js'); await s.settle(); if (mode === 'signup') s.run('setMode("signup")'); s.el('a-nick').value = 'nick';
  await s.el('auth-form').fire('submit'); assert.equal(s.el('a-submit').disabled, false); assert.equal(s.el('switch-btn').disabled, false);
  assert.equal(s.context.location.href, key === 'success' ? (mode === 'signup' ? 'mypage.html?welcome=1' : 'index.html') : '');
});
test('pending authentication cannot switch mode or start another request', async () => {
  let release; const authWait = new Promise(resolve => { release = resolve; });
  const s = setup({ guest: true, authWait }, 'auth.js'); await s.settle(); const pending = s.el('auth-form').fire('submit');
  await s.el('switch-btn').fire('click'); await s.el('auth-form').fire('submit');
  assert.equal(s.run('mode'), 'login'); assert.equal(s.calls.auth, 1); assert.equal(s.el('switch-btn').disabled, true);
  release(); await pending; assert.equal(s.el('switch-btn').disabled, false);
});
test('blank signup nickname and email-confirmation path restore buttons', async () => {
  const s = setup({ guest: true, confirmEmail: true }, 'auth.js'); await s.settle(); s.run('setMode("signup")');
  await s.el('auth-form').fire('submit'); assert.equal(s.calls.auth, 0); assert.equal(s.el('a-submit').disabled, false);
  s.el('a-nick').value = 'nick'; await s.el('auth-form').fire('submit'); assert.match(s.el('auth-status').textContent, /인증 링크/); assert.equal(s.context.location.href, '');
});

