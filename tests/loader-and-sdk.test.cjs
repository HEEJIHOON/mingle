// Run: node --test tests/loader-and-sdk.test.cjs. No network or real accounts are used.
// Covers #62: visible script/style load-failure notice and common.js rendering the
// rail/footer when the auth SDK failed to load. Cache behavior (per-visit fresh asset
// URLs) is intentionally unchanged; the deployment-version change was deferred to #51.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function makeDocument() {
  const registry = [];
  function node(tag) {
    return { tagName: tag, id: '', attrs: {}, children: [], listeners: {},
      style: {}, textContent: '', type: '', rel: '', href: '', src: '', async: true,
      onerror: null,
      setAttribute(k, v) { this.attrs[k] = v; if (k === 'id') this.id = v; },
      getAttribute(k) { return this.attrs[k]; },
      appendChild(c) { this.children.push(c); if (c.id) registry.push(c); return c; },
      addEventListener(k, fn) { this.listeners[k] = fn; } };
  }
  const head = node('head');
  const body = node('body');
  body.insertBefore = function (c) { this.children.unshift(c); if (c.id) registry.push(c); return c; };
  body.insertAdjacentHTML = function (where, html) { (this.html = this.html || []).push(html); };
  const docListeners = {};
  return {
    readyState: 'complete',
    currentScript: null,
    head, body,
    documentElement: { style: {}, classList: { added: [], removed: [], add(c) { this.added.push(c); }, remove(c) { this.removed.push(c); }, toggle() {} } },
    createElement: t => node(t),
    getElementById: id => registry.find(n => n.id === id) || null,
    querySelectorAll: () => [],
    addEventListener(k, fn) { docListeners[k] = fn; },
    fire(k) { if (docListeners[k]) docListeners[k](); },
  };
}

function runLoader(now) {
  const document = makeDocument();
  const loaderScript = { getAttribute: k => (k === 'data-scripts' ? 'common.js,friends.js' : null) };
  document.currentScript = loaderScript;
  const sandbox = {
    document,
    localStorage: { getItem: () => null },
    location: { reload() { sandbox.reloaded = true; } },
    Date: { now: () => now },
    Math,
    setTimeout: () => 0,
    window: { requestAnimationFrame: fn => { fn(); return 0; } },
  };
  vm.createContext(sandbox);
  vm.runInContext(source('loader.js'), sandbox);
  return { document, sandbox };
}

test('#62 per-visit fresh asset URLs stay unchanged (cache behavior preserved)', () => {
  const a = runLoader(1000), b = runLoader(9999);
  const hrefOf = r => r.document.head.children[0].href;
  const srcsOf = r => r.document.body.children.filter(c => c.tagName === 'script').map(c => c.src);
  assert.match(hrefOf(a), /^style\.css\?v=.+/);
  assert.notEqual(hrefOf(a), hrefOf(b)); // per-visit fresh version, as before
  assert.notDeepEqual(srcsOf(a), srcsOf(b));
  const srcs = srcsOf(a);
  assert.equal(srcs[0], 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4'); // CDN stays unversioned
  assert.match(srcs[1], /^common\.js\?v=/);
  assert.match(srcs[2], /^friends\.js\?v=/);
});

test('#62 script load failure shows a visible notice with a reload button', () => {
  const { document } = runLoader(1000);
  const scripts = document.body.children.filter(c => c.tagName === 'script');
  assert.ok(scripts.every(s => typeof s.onerror === 'function'), 'every script has onerror');
  scripts[0].onerror(); // CDN SDK fails
  const box = document.getElementById('rululala-load-error');
  assert.ok(box, 'notice element exists');
  assert.equal(box.attrs.role, 'alert');
  const [msg, btn] = box.children;
  assert.match(msg.textContent, /불러오지 못했어요/);
  assert.equal(btn.textContent, '새로고침');
  btn.listeners.click();
  scripts[1].onerror(); // second failure must not duplicate the notice
  assert.equal(document.body.children.filter(c => c.id === 'rululala-load-error').length, 1);
});

test('#62 stylesheet load failure also shows the notice', () => {
  const { document } = runLoader(1000);
  const link = document.head.children[0];
  assert.equal(typeof link.onerror, 'function');
  link.onerror();
  assert.ok(document.getElementById('rululala-load-error'));
});

function element() {
  return { value: '', textContent: '', disabled: false, hidden: false, attrs: {}, listeners: {},
    classList: { toggle() {} }, setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(k, fn) { this.listeners[k] = fn; }, focus() {} };
}

test('#62 common.js renders rail/footer and marks auth as failed when the SDK did not load', async () => {
  const els = new Map();
  const el = id => { if (!els.has(id)) els.set(id, element()); return els.get(id); };
  const inserted = [];
  const sandbox = {
    window: {}, // no window.supabase: CDN script failed
    document: {
      getElementById: el,
      querySelectorAll: () => [],
      body: { insertAdjacentHTML: (where, html) => inserted.push(html) },
      documentElement: { classList: { toggle() {} } },
    },
    location: { pathname: '/index.html', href: '' },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const run = code => vm.runInContext(code, context);
  run(source('common.js')); // must not throw
  assert.ok(inserted.some(h => h.includes('class="rail"')), 'rail rendered');
  assert.ok(inserted.some(h => h.includes('<footer>')), 'footer rendered');
  assert.equal(await run('authReady'), null);
  assert.equal(run('authFailed'), true);
  assert.equal(el('foot-auth').attrs['aria-label'], '로그인 상태 확인 실패');
  const out = await run('signOutCurrentUser()');
  assert.ok(out.error, 'signOut reports an error instead of throwing');
});

test('#62 common.js still signs out state normally when the SDK is present', async () => {
  const els = new Map();
  const el = id => { if (!els.has(id)) els.set(id, element()); return els.get(id); };
  const inserted = [];
  const sandbox = {
    document: {
      getElementById: el,
      querySelectorAll: () => [],
      body: { insertAdjacentHTML: (where, html) => inserted.push(html) },
      documentElement: { classList: { toggle() {} } },
    },
    location: { pathname: '/index.html', href: '' },
  };
  sandbox.window = sandbox;
  sandbox.supabase = { createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({}),
    },
    from: () => { throw new Error('not used'); },
  }) };
  const context = vm.createContext(sandbox);
  const run = code => vm.runInContext(code, context);
  run(source('common.js'));
  assert.equal(await run('authReady'), null);
  assert.equal(run('authFailed'), false);
  assert.equal(el('foot-auth').textContent, '로그인');
});

test('refresh-flash: page stays hidden until stylesheet and scripts are all ready', () => {
  const { document } = runLoader(1000);
  assert.equal(document.documentElement.style.visibility, 'hidden');
  const link = document.head.children[0];
  assert.equal(typeof link.onload, 'function');
  const scripts = document.body.children.filter(c => c.tagName === 'script');
  assert.ok(scripts.every(s => typeof s.onload === 'function'), 'every script has onload');
  link.onload(); // stylesheet ready, scripts still pending
  assert.equal(document.documentElement.style.visibility, 'hidden');
  scripts.slice(0, -1).forEach(s => s.onload());
  assert.equal(document.documentElement.style.visibility, 'hidden');
  scripts[scripts.length - 1].onload();
  assert.equal(document.documentElement.style.visibility, '');
});

test('refresh-flash: failed assets still reveal the page and show the notice', () => {
  const { document } = runLoader(1000);
  const link = document.head.children[0];
  const scripts = document.body.children.filter(c => c.tagName === 'script');
  link.onerror();
  scripts.forEach(s => s.onerror());
  assert.equal(document.documentElement.style.visibility, '');
  assert.ok(document.getElementById('rululala-load-error'), 'notice element exists');
});

test('refresh-flash: preload class kills transitions before first paint, restored after reveal', () => {
  const { document } = runLoader(1000);
  assert.ok(document.documentElement.classList.added.includes('rululala-preload'));
  const link = document.head.children[0];
  const scripts = document.body.children.filter(c => c.tagName === 'script');
  link.onload();
  scripts.forEach(s => s.onload());
  assert.equal(document.documentElement.style.visibility, '');
  assert.ok(document.documentElement.classList.removed.includes('rululala-preload'));
});

test('refresh-flash: stylesheet disables transitions under the preload class', () => {
  const css = source('style.css');
  assert.match(css, /html\.rululala-preload \*\{transition:none!important\}|html\.rululala-preload[^{]*\{transition:none!important\}/);
});
