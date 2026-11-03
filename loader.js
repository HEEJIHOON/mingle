// 8개 페이지가 함께 쓰는 로더예요. Pages가 고정 주소의 파일을 캐시하므로 매 접속마다 새 버전 매개변수를 붙여요.
var rululalaAssetVersion = Date.now().toString(36) + Math.random().toString(36).slice(2);

// 로딩 실패 안내는 common.js·style.css 없이도 보여야 해서 여기서 직접 만들어요. (이슈 #62)
var rululalaLoadErrorShown = false;
function rululalaShowLoadError() {
  if (rululalaLoadErrorShown) return;
  rululalaLoadErrorShown = true;
  function show() {
    if (document.getElementById("rululala-load-error")) return;
    var box = document.createElement("div");
    box.id = "rululala-load-error";
    box.setAttribute("role", "alert");
    box.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#fff4f2;color:#8c1d13;border-bottom:1px solid #ecc6c0;padding:10px 16px;font:14px/1.5 system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center";
    var msg = document.createElement("span");
    msg.textContent = "화면을 모두 불러오지 못했어요. 인터넷 연결을 확인한 뒤 새로고침해 주세요.";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "새로고침";
    btn.style.cssText = "border:1px solid #d9a49d;background:#ffffff;color:#8c1d13;border-radius:8px;padding:4px 12px;font:inherit;cursor:pointer";
    btn.addEventListener("click", function () { location.reload(); });
    box.appendChild(msg);
    box.appendChild(btn);
    document.body.insertBefore(box, document.body.firstChild);
  }
  if (document.body) show();
  else document.addEventListener("DOMContentLoaded", show);
}

var rululalaStyles = document.createElement("link");
rululalaStyles.rel = "stylesheet";
rululalaStyles.href = "style.css?v=" + rululalaAssetVersion;
rululalaStyles.onerror = rululalaShowLoadError;
document.head.appendChild(rululalaStyles);

// 로그인한 화면은 첫 그리기부터 메뉴가 맞도록 html에 in 클래스를 미리 붙여요.
try{if(localStorage.getItem('sb-knnjrjtdmbgubhoylrob-auth-token'))document.documentElement.classList.add('in')}catch(e){}

// Ordered classic scripts preserve dependencies without document.write.
// 페이지마다 다른 스크립트 목록은 각 HTML의 data-scripts가 넘겨요.
(function () {
  var self = document.currentScript;
  var list = (self && self.getAttribute('data-scripts') || 'common.js').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  list.unshift('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4');
  function appendScripts() {
    list.forEach(function (src) {
      var script = document.createElement('script');
      script.async = false;
      script.onerror = rululalaShowLoadError;
      script.src = src.indexOf('http') === 0 ? src : src + '?v=' + rululalaAssetVersion;
      document.body.appendChild(script);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', appendScripts);
  else appendScripts();
})();
