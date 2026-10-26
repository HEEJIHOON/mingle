const db = window.supabase.createClient(
  "https://ozyhskcynzagtlifcmzc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eWhza2N5bnphZ3RsaWZjbXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzAyNDksImV4cCI6MjEwODQwNjI0OX0.dq5B33D9VkJQtLSXDPsqV9WUBVJE1uGO5JfVPam71-Y"
);

let ME = null;

const authReady = (async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    const u = session.user;
    ME = { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.nickname) || "여행자", city: "", bio: "" };
    const { data } = await db.from("profiles").select("nickname, city, bio").eq("id", u.id).maybeSingle();
    if (data) ME = { ...ME, name: data.nickname || ME.name, city: data.city || "", bio: data.bio || "" };
  }
  const link = document.getElementById("auth-link");
  if (link && ME) {
    link.textContent = "로그아웃";
    link.href = "#";
    link.removeAttribute("aria-current");
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await db.auth.signOut();
      location.href = "index.html";
    });
  }
})();
