// 인증 SDK(CDN)가 로딩되지 않아도 메뉴·푸터는 그려요. 로그인 관련 기능만 오류 상태로 안내해요. (이슈 #62)
let db = null;
try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    db = window.supabase.createClient(
      "https://knnjrjtdmbgubhoylrob.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubmpyanRkbWJndWJob3lscm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjMxODAsImV4cCI6MjEwODQ5OTE4MH0.LtZDpLgjdpgavF5CeLbUygzPJJ5XrI-JavkQ_EWGZMk"
    );
  }
} catch (e) {
  db = null;
}

let ME = null;
let authFailed = false;

// 레일의 사람 버튼은 상태에 따라 내 정보/로그인으로 보내요. 로그아웃은 내 정보 페이지에서만 해요.
let authState = "pending"; // pending | in | out | error

// 8개 페이지가 공유하는 내비게이션과 푸터는 여기서 넣어요. 메뉴·푸터를 고칠 때 이 파일만 고치면 돼요.
const currentPage = location.pathname.split("/").pop() || "index.html";
const railHTML = `<nav class="rail" aria-label="페이지 이동">
  <a class="rail-logo" href="index.html" aria-label="rululala 홈">r</a>
  <a class="ri" href="index.html" aria-label="홈" title="홈"><svg viewBox="0 0 24 24"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/></svg><span class="rl">홈</span></a>
  <a class="ri" href="friends.html" aria-label="친구 찾기" title="친구 찾기"><svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.8 19.5c.6-3.2 2.7-5 5.2-5s4.6 1.8 5.2 5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M15.8 14.7c2.3.3 3.9 1.9 4.4 4.3"/></svg><span class="rl">친구</span></a>
  <a class="ri" href="world.html" aria-label="도시" title="도시"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c-4.8 5-4.8 12 0 17"/><path d="M12 3.5c4.8 5 4.8 12 0 17"/></svg><span class="rl">도시</span></a>
  <a class="ri" href="stay.html" aria-label="숙소" title="숙소"><svg viewBox="0 0 24 24"><path d="M4 20v-8.5L12 5l8 6.5V20"/><path d="M9.5 20v-5.5h5V20"/></svg><span class="rl">숙소</span></a>
  <a class="ri" href="safe.html" aria-label="안전" title="안전"><svg viewBox="0 0 24 24"><path d="M12 3.5 19 6v5.2c0 4.4-2.9 7.6-7 9.3-4.1-1.7-7-4.9-7-9.3V6z"/><path d="m9 11.8 2.2 2.2 3.8-4"/></svg><span class="rl">안전</span></a>
  <a class="ri rail-auth" href="login.html" id="auth-link" aria-label="로그인" title="로그인"><span class="t-out avc"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.2" r="3.4"/><path d="M5.5 20c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6"/></svg></span><span class="t-in avc"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.2" r="3.4"/><path d="M5.5 20c.8-3.6 3.4-5.6 6.5-5.6s5.7 2 6.5 5.6"/></svg></span><span class="rl t-out-rl">로그인</span><span class="rl t-in-rl">내 정보</span></a>
</nav>`;
const footHTML = `<footer><div class="w">
  <div class="fcols">
    <div class="fcol"><div class="flogo">rululala<i>.</i></div><p>여행지에서 만나는 동네 친구.<br>rululala은 준비 중이에요.</p></div>
    <div class="fcol"><b>메뉴</b><a href="index.html">홈</a><a href="friends.html">친구 찾기</a><a href="world.html">도시</a><a href="stay.html">숙소</a><a href="safe.html">안전</a></div>
    <div class="fcol"><b>안내</b><a href="safe.html">안전 수칙</a><a href="credits.html">사진 크레딧</a><a href="login.html" id="foot-auth">로그인</a><a href="mypage.html">내 정보</a></div>
  </div>
  <div class="fnote">rululala은 준비 중이에요. 도시·숙소와 예시 친구의 프로필·별점·인증 표시는 예시예요. 후기·메시지·차단·신고는 이 브라우저에만 저장되는 데모예요.</div>
</div></footer>`;
const footMypageHTML = `<footer><div class="w">
  <div class="fnote">프로필(닉네임·도시·자기소개)은 가입한 rululala 회원에게만 보여요. 이메일 등 로그인 정보는 공개되지 않아요.</div>
</div></footer>`;
document.body.insertAdjacentHTML("afterbegin", railHTML);
document.body.insertAdjacentHTML("beforeend", currentPage === "mypage.html" ? footMypageHTML : footHTML);
// 현재 페이지의 메뉴만 강조해요. 로그인/내 정보 버튼은 내 정보 페이지에서 강조해요.
Array.prototype.forEach.call(document.querySelectorAll(".rail a.ri"), function (a) {
  if (a.id === "auth-link") {
    if (currentPage === "mypage.html") a.setAttribute("aria-current", "page");
  } else if (a.getAttribute("href") === currentPage) a.setAttribute("aria-current", "page");
});



// 푸터의 로그인 링크도 상태에 따라 로그인/로그아웃으로 바꿔요. 내 정보 링크는 항상 mypage.html이에요.
function paintFootAuth(state) {
  const link = document.getElementById("foot-auth");
  if (!link) return;
  if (state === "in") {
    link.textContent = "로그아웃";
    link.href = "#";
    link.setAttribute("aria-label", "로그아웃");
    link.title = "로그아웃";
  } else if (state === "out") {
    link.textContent = "로그인";
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

function paintAuthState(state) {
  authState = state;
  paintFootAuth(state);
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


// 푸터 로그아웃: 세션 확인 전 클릭은 확인이 끝난 뒤 상태에 맞는 화면으로 보내요. 로그아웃 실패 시 자리에서 다시 시도할 수 있어요.
const footAuthEl = document.getElementById("foot-auth");
if (footAuthEl) {
  footAuthEl.addEventListener("click", async (e) => {
    if (authState === "out") return; // href가 이미 login.html이에요
    e.preventDefault();
    if (authState === "error") return;
    if (authState === "pending") {
      footAuthEl.setAttribute("aria-busy", "true");
      authReady.then(() => {
        if (authState === "in") location.href = "mypage.html";
        else if (authState === "out") location.href = "login.html";
      });
      return;
    }
    // 로그인 상태: 푸터에서 바로 로그아웃해요
    if (footAuthEl.getAttribute("aria-busy") === "true") return;
    footAuthEl.textContent = "로그아웃 중…";
    footAuthEl.setAttribute("aria-busy", "true");
    try {
      const { error } = await signOutCurrentUser();
      if (error) throw error;
      location.href = "index.html";
    } catch (err) {
      footAuthEl.removeAttribute("aria-busy");
      footAuthEl.textContent = "로그아웃 실패 · 다시 눌러 주세요";
    }
  });
}

// 세션 판정은 여기서 한 번만 해요. 프로필 상세(city/bio)는 필요한 화면이 loadProfile()로 읽어요.
const authReady = (async () => {
  if (!db) {
    authFailed = true;
    paintAuthState("error");
    return null;
  }
  let session = null;
  try {
    const res = await db.auth.getSession();
    if (res.error) throw res.error;
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

// SDK가 반환하는 error와 예외를 모든 로그아웃 경로에서 같은 방식으로 처리해요.
async function signOutCurrentUser() {
  if (!db) return { error: new Error("sdk-not-loaded") };
  try {
    const { error } = await db.auth.signOut();
    return { error: error || null };
  } catch (error) {
    return { error };
  }
}

// 읽기 실패를 빈 프로필과 구분해요. 실패한 요청은 다음 호출에서 다시 시도할 수 있어요.
let profilePromise = null;
function loadProfile() {
  if (!profilePromise) {
    profilePromise = (async () => {
      await authReady;
      if (!ME) return { error: new Error("not-signed-in") };
      const uid = ME.id;
      try {
        const { data, error } = await db.from("profiles").select("nickname, city, bio").eq("id", uid).maybeSingle();
        if (error) return { error };
        if (!data) return { error: new Error("profile-not-found") };
        // 응답이 오는 동안 다른 탭에서 계정이 바뀌었으면 이전 계정의 값을 새 신분에 적용하지 않아요.
        if (!ME || ME.id !== uid) return { error: new Error("identity-changed") };
        const nick = (data.nickname || "").trim();
        ME = { ...ME, name: nick || ME.name, city: data.city || "", bio: data.bio || "" };
        return { error: null };
      } catch (error) {
        return { error };
      }
    })().then((result) => {
      if (result.error) profilePromise = null;
      return result;
    });
  }
  return profilePromise;
}

// 읽어 온 본인 행만 갱신하고, 반환된 행을 확인한 뒤 화면에 반영해요.
async function saveProfile(fields) {
  await authReady;
  if (!ME) return { error: new Error("not-signed-in") };
  const loaded = await loadProfile();
  if (loaded.error) return loaded;
  if (!ME) return { error: new Error("not-signed-in") };
  const uid = ME.id;
  const nickname = (fields.nickname || "").trim();
  const city = (fields.city || "").trim();
  const bio = (fields.bio || "").trim();
  if (!nickname) return { error: new Error("nickname-required") };
  try {
    const { data, error } = await db.from("profiles").update({ nickname, city, bio })
      .eq("id", uid).select("id, nickname, city, bio").maybeSingle();
    if (error) return { error };
    if (!data || data.id !== uid) return { error: new Error("profile-not-updated") };
    // 저장이 끝나기 전에 계정이 바뀌었으면 결과를 새 신분에 반영하지 않아요.
    if (!ME || ME.id !== uid) return { error: new Error("identity-changed") };
    ME = { ...ME, name: data.nickname, city: data.city || "", bio: data.bio || "" };
    return { error: null };
  } catch (error) {
    return { error };
  }
}


// ===== 로그인 상태 변경 반영 (#61) =====
// 다른 탭에서 로그인·로그아웃하면 열린 페이지의 메뉴와 화면을 새 신분 기준으로 갱신해요.
// 이 탭에서 직접 한 로그인/로그아웃은 곧 페이지 이동으로 마무리돼요.
let authIdentity;
function applyAuthIdentity(session) {
  const u = session && session.user;
  const next = u ? u.id : null;
  if (authIdentity === undefined) { authIdentity = next; return false; }
  if (next === authIdentity) return false;
  authIdentity = next;
  profilePromise = null;
  if (u) {
    const nick = ((u.user_metadata && u.user_metadata.nickname) || "").trim();
    ME = { id: u.id, email: u.email, name: nick || "여행자", city: "", bio: "" };
    paintAuthState("in");
  } else {
    ME = null;
    paintAuthState("out");
  }
  return true;
}
authReady.then((session) => {
  if (authIdentity === undefined) authIdentity = session && session.user ? session.user.id : null;
});
if (db) {
  db.auth.onAuthStateChange((event, session) => {
    if (!applyAuthIdentity(session)) return;
    if (typeof window.rululalaAuthChanged === "function") window.rululalaAuthChanged();
  });
}
