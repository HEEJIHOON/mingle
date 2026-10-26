const db = window.supabase.createClient(
  "https://knnjrjtdmbgubhoylrob.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmpyanRkbWJndWJob3lscm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjMxODAsImV4cCI6MjEwODQ5OTE4MH0.LtZDpLgjdpgavF5CeLbUygzPJJ5XrI-JavkQ_EWGZMk"
);

let ME = null;
let authFailed = false;

// 세션 판정은 여기서 한 번만 해요. 프로필 상세(city/bio)는 필요한 화면이 loadProfile()로 읽어요.
const authReady = (async () => {
  let session = null;
  try {
    const res = await db.auth.getSession();
    session = res.data && res.data.session;
  } catch (e) {
    authFailed = true;
    return null;
  }

  // 실제 로그인 상태에 맞게 메뉴를 바로 바로잡아요
  document.documentElement.classList.toggle("in", !!session);

  const link = document.getElementById("auth-link");
  if (link && session) {
    link.href = "#";
    link.removeAttribute("aria-current");
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await db.auth.signOut();
      location.href = "index.html";
    });
  }

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
