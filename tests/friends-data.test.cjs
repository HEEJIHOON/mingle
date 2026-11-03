// Run: node --test tests/friends-data.test.cjs. No network or real accounts are used.
// Covers #59 (member list failure states), #60 (stored-data validation), #61 (cross-tab auth changes).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function element() {
  return { value: '', textContent: '', innerHTML: '', disabled: false, checked: false, hidden: false,
    tabIndex: 0, scrollTop: 0, scrollHeight: 0, dataset: {}, attrs: {}, listeners: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    removeAttribute(k) { delete this.attrs[k]; }, addEventListener(k, fn) { this.listeners[k] = fn; },
    appendChild() {}, focus() {}, querySelector: () => null, closest: () => null };
}
const user = { id: 'self', email: 'test@example.invalid', user_metadata: { nickname: 'nick' } };
const other = { id: 'other', email: 'o@example.invalid', user_metadata: { nickname: '다른' } };
const memberRow = { id: 'u2', nickname: '민수', city: '부산', bio: '반가워요' };
function setup(options = {}, withFriends = true) {
  const els = new Map();
  const el = id => { if (!els.has(id)) els.set(id, element()); return els.get(id); };
  const store = {};
  const alerts = [];
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const docListeners = {};
  const db = {
    auth: {
      onAuthStateChange: cb => { db._authCb = cb; return {}; },
      getSession: async () => { if (options.sessionThrow) throw Error('offline'); return { data: { session: options.guest ? null : { user } }, error: options.sessionError ? Error('session') : null }; },
      signOut: async () => ({ error: null }),
    },
    from: () => {
      const q = {
        select() { return q; }, eq() { return q; }, order() { return q; },
        async limit() { if (options.membersThrow) throw Error('offline'); return { data: options.members || [], error: options.membersError ? Error('members') : null }; },
        async maybeSingle() { return { data: options.noProfile ? null : { nickname: 'nick', city: '서울', bio: '소개' }, error: options.profileError ? Error('profile') : null }; },
      }; return q;
    },
  };
  const document = {
    body: { children: [], classList: { add() {}, remove() {} }, insertAdjacentHTML() {} },
    documentElement: { classList: { toggle() {}, add() {}, remove() {} } },
    querySelector: s => el(s), querySelectorAll: () => [], getElementById: id => el('#' + id),
    createElement: () => element(),
    addEventListener: (k, fn) => { docListeners[k] = fn; },
  };
  const window = { supabase: { createClient: () => db } };
  const context = vm.createContext({
    window, document, localStorage,
    location: { pathname: '/friends.html', href: '', search: '' },
    URLSearchParams, console, Error, Number, JSON, Math, Date, Array, Object,
    alert: m => alerts.push(m), confirm: () => true,
  });
  const run = code => vm.runInContext(code, context);
  run(source('common.js'));
  if (withFriends) run(source('friends.js'));
  return { el, store, alerts, db, docListeners, context, run,
    async settle() { await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); },
    fireAct(act) { return docListeners.click({ target: { closest: s => (s === '[data-act]' ? { dataset: { act } } : null) } }); } };
}
const K = (n, id) => `rululala_${n}:${id}`;

// ===== #60 stored-data validation =====
test('favs stored as object is ignored and page still renders', async () => {
  const s = setup({ guest: true }); s.store[K('favs', 'guest')] = '{"p1":true}';
  await s.settle(); s.run('render()');
  assert.match(s.el('#grid').innerHTML, /하루/);
  s.run("fav('p1')");
  assert.deepEqual(JSON.parse(s.store[K('favs', 'guest')]), ['p1']);
});
test('msgs stored as array does not break chat', async () => {
  const s = setup({ guest: true }); s.store[K('msgs', 'guest')] = '[]';
  await s.settle(); s.run('render()'); s.run("chat('p1')");
  assert.match(s.el('#modalBox').innerHTML, /여행 이야기를 나눠요/);
});
test('blocked stored as string does not hide people', async () => {
  const s = setup({ guest: true }); s.store[K('blocked', 'guest')] = '"p1"';
  await s.settle(); s.run('render()');
  assert.match(s.el('#grid').innerHTML, /하루/);
});
test('invalid review entries are skipped, valid kept', async () => {
  const s = setup({ guest: true });
  s.store[K('reviews', 'guest')] = JSON.stringify([{ pid: 'p1', s: 5, u: 'a', t: 'x' }, { pid: 'p1', s: '5' }, { pid: 'p1', s: 9 }, { pid: 'p1', s: 0 }, { pid: 1, s: 5 }, null, 'junk']);
  await s.settle();
  assert.equal(s.run("rate(find('p1')).rs.length"), 1);
  s.run('render()'); assert.match(s.el('#grid').innerHTML, /39개 평가/); // 38 demo + 1 valid
});
test('invalid report entries are skipped in safety center', async () => {
  const s = setup({ guest: true });
  s.store[K('reports', 'guest')] = JSON.stringify([{ id: 'r1', pid: 'p1', reason: '스팸·광고', at: 1 }, { pid: 'p1' }, 'junk', null]);
  await s.settle(); s.run('render()'); await s.run('safety()');
  assert.match(s.el('#modalBox').innerHTML, /스팸·광고/);
  assert.equal((s.el('#modalBox').innerHTML.match(/data-act="delrep"/g) || []).length, 1);
});
test('unknown person id actions are no-ops', async () => {
  const s = setup({ guest: true }); await s.settle(); s.run('render()');
  s.run("fav('nope'); chat('nope'); block('nope'); reviews('nope')");
  assert.equal(s.store[K('favs', 'guest')], undefined);
  assert.equal(s.el('#modalBox').innerHTML, '');
});
test('review with invalid or out-of-range stars is rejected', async () => {
  const s = setup(); await s.settle();
  s.store[K('msgs', 'self')] = JSON.stringify({ p1: [{ f: 'm', t: 'hi' }] });
  s.run("cur='p1'");
  s.el('#rs').value = '9'; await s.run('sendReview()');
  assert.match(s.el('#err').textContent, /별점/); assert.equal(s.store[K('reviews', 'self')], undefined);
  s.el('#rs').value = 'abc'; await s.run('sendReview()');
  assert.match(s.el('#err').textContent, /별점/); assert.equal(s.store[K('reviews', 'self')], undefined);
});
test('valid review is stored after validation', async () => {
  const s = setup(); await s.settle();
  s.store[K('msgs', 'self')] = JSON.stringify({ p1: [{ f: 'm', t: 'hi' }] });
  s.run("cur='p1'"); s.el('#rs').value = '5'; s.el('#rt').value = '좋았어요';
  await s.run('sendReview()');
  const saved = JSON.parse(s.store[K('reviews', 'self')]);
  assert.equal(saved.length, 1); assert.equal(saved[0].s, 5); assert.equal(saved[0].a, 'self');
});

// ===== #59 member list failure states =====
for (const key of ['membersError', 'membersThrow']) test(key + ' shows failure with retry, not empty list', async () => {
  const s = setup({ [key]: true }); await s.settle();
  assert.match(s.el('#members').innerHTML, /불러오지 못했어요/);
  assert.match(s.el('#members').innerHTML, /다시 시도/);
  assert.doesNotMatch(s.el('#members').innerHTML, /아직 다른 가입자/);
  assert.equal(s.run('MEMBERS'), null);
});
test('real zero members is distinct from failure', async () => {
  const s = setup({ members: [] }); await s.settle();
  assert.match(s.el('#members').innerHTML, /아직 다른 가입자가 없어요/);
  assert.doesNotMatch(s.el('#members').innerHTML, /불러오지 못했어요/);
});
test('member list renders and search-no-result is distinct', async () => {
  const s = setup({ members: [memberRow] }); await s.settle();
  assert.match(s.el('#members').innerHTML, /민수/);
  s.el('#q').value = 'zzz'; s.run('renderMembers()');
  assert.match(s.el('#members').innerHTML, /검색어에 맞는 가입자가 없어요/);
});
test('retry button recovers after a failed load', async () => {
  const options = { membersError: true };
  const s = setup(options); await s.settle();
  assert.match(s.el('#members').innerHTML, /불러오지 못했어요/);
  options.membersError = false; options.members = [memberRow];
  await s.fireAct('remembers'); await s.settle();
  assert.match(s.el('#members').innerHTML, /민수/);
  assert.doesNotMatch(s.el('#members').innerHTML, /불러오지 못했어요/);
});
test('guest sees the login prompt, never a failure', async () => {
  const s = setup({ guest: true, membersError: true }); await s.settle();
  assert.match(s.el('#members').innerHTML, /로그인한 회원에게만/);
});

// ===== #61 cross-tab auth changes =====
test('logout in another tab clears ME and calls the page hook', async () => {
  const s = setup({}, false); await s.settle();
  assert.equal(s.run('ME.id'), 'self');
  s.run('window.rululalaAuthChanged=()=>{window._calls=(window._calls||0)+1}');
  s.db._authCb('SIGNED_OUT', null);
  assert.equal(s.run('ME'), null); assert.equal(s.run('authState'), 'out');
  assert.equal(s.run('window._calls'), 1);
});
test('account switch in another tab adopts the new identity', async () => {
  const s = setup({}, false); await s.settle();
  s.run('window.rululalaAuthChanged=()=>{window._calls=(window._calls||0)+1}');
  s.db._authCb('SIGNED_IN', { user: other });
  assert.equal(s.run('ME.id'), 'other'); assert.equal(s.run('ME.name'), '다른');
  assert.equal(s.run('authState'), 'in'); assert.equal(s.run('window._calls'), 1);
});
for (const [event, session] of [['TOKEN_REFRESHED', { user }], ['INITIAL_SESSION', { user }], ['SIGNED_IN', { user }]]) {
  test(event + ' with the same identity does not call the hook', async () => {
    const s = setup({}, false); await s.settle();
    s.run('window.rululalaAuthChanged=()=>{window._calls=(window._calls||0)+1}');
    s.db._authCb(event, session);
    assert.equal(s.run('window._calls'), undefined);
    assert.equal(s.run('ME.id'), 'self');
  });
}
test('friends page redraws under guest after a cross-tab logout', async () => {
  const s = setup({ members: [memberRow] }); await s.settle();
  assert.match(s.el('#members').innerHTML, /민수/);
  s.run("chat('p1')"); assert.equal(s.run('isOpen()'), true);
  s.db._authCb('SIGNED_OUT', null); await s.settle();
  assert.equal(s.run('isOpen()'), false); // open chat modal closed
  assert.match(s.el('#members').innerHTML, /로그인한 회원에게만/); // member list hidden
  assert.match(s.el('#me').textContent, /게스트/);
});
