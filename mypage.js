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

  $('#p-logout').addEventListener('click', async () => {
    const btn = $('#p-logout');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const { error } = await signOutCurrentUser();
      if (error) throw error;
      location.href = 'index.html';
    } catch (e) {
      setStatus('로그아웃에 실패했어요. 잠시 후 다시 시도해 주세요.', 'err');
    } finally {
      btn.disabled = false;
    }
  });

  const loaded = await loadProfile();
  if (loaded.error) {
    $('#p-submit').textContent = '불러오기 실패';
    setStatus('프로필을 불러오지 못했어요. 기존 정보를 보호하기 위해 저장을 막았어요. 새로고침한 뒤 다시 시도해 주세요.', 'err');
    return;
  }
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
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '저장 중…';
    setStatus('', '');
    try {
      const { error } = await saveProfile({
        nickname: $('#p-nick').value,
        city: $('#p-city').value,
        bio: $('#p-bio').value,
      });
      if (error) throw error;
      setStatus('저장했어요.', 'ok');
    } catch (error) {
      setStatus(error && error.message === 'nickname-required'
        ? '닉네임을 입력해 주세요. 공백만으로는 저장할 수 없어요.'
        : '저장에 실패했어요. 잠시 후 다시 시도해 주세요.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = '저장';
    }
  });
})();
