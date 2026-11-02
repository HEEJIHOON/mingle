// 7개 페이지가 함께 쓰는 로더예요. Pages가 고정 주소의 파일을 캐시하므로 매 접속마다 새 버전 매개변수를 붙여요.
var rululalaAssetVersion = Date.now().toString(36) + Math.random().toString(36).slice(2);
var rululalaStyles = document.createElement('link');
rululalaStyles.rel = 'stylesheet';
rululalaStyles.href = 'style.css?v=' + rululalaAssetVersion;
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
      script.src = src.indexOf('http') === 0 ? src : src + '?v=' + rululalaAssetVersion;
      document.body.appendChild(script);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', appendScripts);
  else appendScripts();
})();
