// Run: node --test tests/a11y-copy.test.cjs. No network or real accounts are used.
// Covers #63 (copy matches actual behavior) and #64 (labels, accessible names, heading order).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const PAGES = ['index.html', 'friends.html', 'world.html', 'stay.html', 'safe.html', 'credits.html', 'login.html', 'mypage.html'];

test('#64 every page has exactly one h1 and heading levels never skip', () => {
  for (const page of PAGES) {
    const levels = [...source(page).matchAll(/<h([1-6])[\s>]/g)].map(m => +m[1]);
    assert.equal(levels.filter(l => l === 1).length, 1, `${page}: exactly one h1`);
    assert.equal(levels[0], 1, `${page}: first heading is h1`);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] <= levels[i - 1] + 1, `${page}: h${levels[i - 1]} followed by h${levels[i]}`);
    }
  }
});

test('#64 login form inputs have associated labels', () => {
  const html = source('login.html');
  for (const id of ['a-nick', 'a-email', 'a-pw']) {
    assert.ok(html.includes(`id="${id}"`), `${id} input exists`);
    assert.ok(html.includes(`for="${id}"`), `${id} has a label`);
  }
});

test('#64 favorite buttons expose an accessible name and pressed state', () => {
  const js = source('friends.js');
  assert.ok(js.includes('aria-pressed="${fav.includes(p.id)}"'));
  assert.ok(js.includes('aria-label="${esc(p.name)}님 즐겨찾기"'));
});

test('#63 home no longer claims local reviews reach other travelers or require login for messaging', () => {
  const html = source('index.html');
  assert.ok(!html.includes('다음 여행자가 친구를 고를 때 도움이 돼요'));
  assert.ok(!html.includes('로그인하고 메시지를 보내 보세요'));
  assert.ok(html.includes('내 브라우저에만 저장돼요'));
});

test('#63 copy distinguishes real members from demo data and states the real storage location', () => {
  assert.ok(source('friends.html').includes('실제 가입자의 정보는 본인이 직접 쓴 내용이에요'));
  assert.ok(source('common.js').includes('예시 친구의 프로필·별점·인증 표시는 예시예요'));
  assert.ok(!source('common.js').includes('프로필·도시·숙소와 별점·인증 표시는 예시예요'));
});

test('#63 page counts in comments match the actual 8 pages', () => {
  assert.ok(!source('loader.js').includes('7개 페이지'));
  assert.ok(!source('common.js').includes('7개 페이지'));
  assert.ok(source('loader.js').includes('8개 페이지'));
  assert.ok(source('common.js').includes('8개 페이지'));
});
