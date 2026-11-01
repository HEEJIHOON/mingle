const $ = (s) => document.querySelector(s);

function setStatus(text, kind) {
  const el = $('#p-status');
  el.textContent = text;
  el.className = kind || '';
}

(async () => {
  await authReady;
  if (authFailed) {
    setStatus('로그인 상태를 확인하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.', 'err');
    return;
  }
  if (!ME) { location.href = 'login.html'; return; }

  await loadProfile();
  $('#p-nick').value = ME.name || '';
  $('#p-city').value = ME.city || '';
  $('#p-bio').value = ME.bio || '';
  $('#p-email').textContent = ME.email + ' 계정으로 로그인했어요.';
  ['#p-nick', '#p-city', '#p-bio', '#p-submit'].forEach((id) => { $(id).disabled = false; });
  $('#p-submit').textContent = '저장';
  try {
    if (new URLSearchParams(location.search).get('welcome')) $('#welcome').hidden = false;
  } catch (e) {}

  $('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#p-submit');
    btn.disabled = true;
    btn.textContent = '저장 중…';
    setStatus('', '');
    const { error } = await saveProfile({
      nickname: $('#p-nick').value,
      city: $('#p-city').value,
      bio: $('#p-bio').value,
    });
    btn.disabled = false;
    btn.textContent = '저장';
    if (error) {
      setStatus(error.message === 'nickname-required'
        ? '닉네임을 입력해 주세요. 공백만으로는 저장할 수 없어요.'
        : '저장에 실패했어요. 잠시 후 다시 시도해 주세요.', 'err');
      return;
    }
    setStatus('저장했어요.', 'ok');
  });

  $('#p-logout').addEventListener('click', async () => {
    await db.auth.signOut();
    location.href = 'index.html';
  });
})();
