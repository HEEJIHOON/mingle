const db = window.supabase.createClient(
  "https://knnjrjtdmbgubhoylrob.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmpyanRkbWJndWJob3lscm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjMxODAsImV4cCI6MjEwODQ5OTE4MH0.LtZDpLgjdpgavF5CeLbUygzPJJ5XrI-JavkQ_EWGZMk"
);

let ME = null;
let authFailed = false;

// 레일의 사람 버튼은 상태에 따라 내 정보/로그인으로 보내요. 로그아웃은 내 정보 페이지에서만 해요.
let authState = "pending"; // pending | in | out | error

function paintAuthState(state) {
  authState = state;
  document.documentElement.classList.toggle("in", state === "in");
  const link = document.getElementById("auth-link");
  if (!link) return;
  if (state === "in") {
    link.href = "mypage.html";
    link.setAttribute("aria-label", "내 정보");
    link.title = "내 정보";
  } else if (state === "out") {
    link.href = "login.html";
    link.setAttribute("aria-label", "로그인");
    link.title = "로그인";
  } else if (state === "error") {
    link.removeAttribute("href");
    link.setAttribute("aria-label", "로그인 상태 확인 실패");
    link.title = "로그인 상태를 확인하지 못했어요. 새로고침해 주세요.";
  }
  link.removeAttribute("aria-busy");
}

// 세션 확인 전 클릭은 확인이 끝난 뒤 올바른 목적지로 보내요. 확인 실패 시에는 아무 곳으로도 보내지 않아요.
const authLinkEl = document.getElementById("auth-link");
if (authLinkEl) {
  authLinkEl.addEventListener("click", (e) => {
    if (authState === "in" || authState === "out") return; // href가 이미 실제 상태와 일치해요
    e.preventDefault();
    if (authState === "error") return;
    authLinkEl.setAttribute("aria-busy", "true");
    authReady.then(() => {
      if (authState === "in") location.href = "mypage.html";
      else if (authState === "out") location.href = "login.html";
    });
  });
}

// 세션 판정은 여기서 한 번만 해요. 프로필 상세(city/bio)는 필요한 화면이 loadProfile()로 읽어요.
const authReady = (async () => {
  let session = null;
  try {
    const res = await db.auth.getSession();
    session = res.data && res.data.session;
  } catch (e) {
    authFailed = true;
    paintAuthState("error");
    return null;
  }

  // 실제 로그인 상태에 맞게 메뉴를 바로 바로잡아요
  paintAuthState(session ? "in" : "out");

  if (session) {
    const u = session.user;
    const nick = ((u.user_metadata && u.user_metadata.nickname) || "").trim();
    ME = { id: u.id, email: u.email, name: nick || "여행자", city: "", bio: "" };
  }
  return session;
})();

// profiles 상세 조회는 친구 찾기처럼 필요한 화면에서만 호출해요.
let profilePromise = null;
function loadProfile() {
  if (!profilePromise) {
    profilePromise = authReady.then(async () => {
      if (!ME) return;
      try {
        const { data } = await db.from("profiles").select("nickname, city, bio").eq("id", ME.id).maybeSingle();
        if (data) {
          const nick = (data.nickname || "").trim();
          ME = { ...ME, name: nick || ME.name, city: data.city || "", bio: data.bio || "" };
        }
      } catch (e) { /* 프로필 조회 실패 시 세션 정보로 계속해요 */ }
    });
  }
  return profilePromise;
}

// 프로필 저장은 어느 화면에서나 이 함수를 써요. 행은 가입 트리거가 만들고, RLS상 본인 행만 갱신할 수 있어요.
async function saveProfile(fields) {
  await authReady;
  if (!ME) return { error: new Error("not-signed-in") };
  const nickname = (fields.nickname || "").trim();
  const city = (fields.city || "").trim();
  const bio = (fields.bio || "").trim();
  if (!nickname) return { error: new Error("nickname-required") };
  const { error } = await db.from("profiles").update({ nickname, city, bio }).eq("id", ME.id);
  if (!error) ME = { ...ME, name: nickname, city, bio };
  return { error };
}
