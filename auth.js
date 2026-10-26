const form = document.getElementById("auth-form");
const title = document.getElementById("auth-title");
const nick = document.getElementById("a-nick");
const email = document.getElementById("a-email");
const pw = document.getElementById("a-pw");
const submitBtn = document.getElementById("a-submit");
const statusEl = document.getElementById("auth-status");
const switchText = document.getElementById("switch-text");
const switchBtn = document.getElementById("switch-btn");

let mode = "login";

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  title.textContent = signup ? "회원가입" : "로그인";
  submitBtn.textContent = signup ? "가입하기" : "로그인";
  nick.hidden = !signup;
  nick.required = signup;
  pw.autocomplete = signup ? "new-password" : "current-password";
  switchText.textContent = signup ? "이미 계정이 있나요?" : "계정이 없나요?";
  switchBtn.textContent = signup ? "로그인" : "회원가입";
  statusEl.textContent = "";
}

function friendlyError(error) {
  const msg = error.message || "";
  if (msg.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않아요.";
  if (msg.includes("already registered")) return "이미 가입된 이메일이에요.";
  if (msg.includes("at least 6")) return "비밀번호는 6자 이상이어야 해요.";
  if (msg.includes("Email not confirmed")) return "이메일 인증을 먼저 완료해 주세요.";
  if (msg.includes("rate limit")) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  return "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

switchBtn.addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  statusEl.textContent = "";

  if (mode === "signup") {
    const nickname = nick.value.trim();
    if (!nickname) {
      statusEl.textContent = "닉네임을 입력해 주세요. 공백만으로는 만들 수 없어요.";
      submitBtn.disabled = false;
      nick.focus();
      return;
    }
    const { data, error } = await db.auth.signUp({
      email: email.value.trim(),
      password: pw.value,
      options: { data: { nickname } },
    });
    submitBtn.disabled = false;
    if (error) { statusEl.textContent = friendlyError(error); return; }
    if (!data.session) { statusEl.textContent = "가입 완료! 이메일로 보낸 인증 링크를 눌러주세요."; return; }
    location.href = "index.html";
  } else {
    const { error } = await db.auth.signInWithPassword({
      email: email.value.trim(),
      password: pw.value,
    });
    submitBtn.disabled = false;
    if (error) { statusEl.textContent = friendlyError(error); return; }
    location.href = "index.html";
  }
});

// 세션 판정은 common.js의 authReady를 재사용해요 (프로필 조회를 기다리지 않아요)
authReady.then((session) => {
  if (session) location.href = "index.html";
});
