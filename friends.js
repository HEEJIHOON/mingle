const PEOPLE=[
{id:'p1',name:'하루',city:'도쿄',country:'일본',emoji:'🌸',age:25,bio:'골목 카페와 작은 서점을 찾아다녀요. 같이 산책해요!',tags:['카페','산책','사진'],r:4.9,n:38,v:1},
{id:'p2',name:'민준',city:'서울',country:'대한민국',emoji:'📷',age:27,bio:'맛있는 걸 먹고 사진 남기는 게 취미예요.',tags:['맛집','사진','전시'],r:4.8,n:24,v:1},
{id:'p3',name:'Emma',city:'파리',country:'프랑스',emoji:'🥐',age:26,bio:'베이커리와 미술관을 좋아해요. 편하게 이야기해요!',tags:['카페','전시','산책'],r:4.7,n:31,v:1},
{id:'p4',name:'루카',city:'로마',country:'이탈리아',emoji:'🍝',age:28,bio:'현지 음식과 숨은 명소를 찾아다니는 여행자예요.',tags:['맛집','산책'],r:4.6,n:19,v:1},
{id:'p5',name:'소피',city:'방콕',country:'태국',emoji:'🌴',age:24,bio:'시장 구경, 야시장, 수다 떠는 걸 좋아해요.',tags:['맛집','쇼핑','사진'],r:4.9,n:42,v:1},
{id:'p6',name:'Noah',city:'뉴욕',country:'미국',emoji:'🎧',age:29,bio:'도시 산책과 음악, 전시를 즐겨요.',tags:['전시','산책','카페'],r:4.5,n:16,v:1},
{id:'p7',name:'유나',city:'오사카',country:'일본',emoji:'🍡',age:23,bio:'디저트 맛집을 찾아다녀요. 코스를 같이 짜봐요!',tags:['맛집','카페','쇼핑'],r:4.8,n:27,v:1},
{id:'p8',name:'Alex',city:'시드니',country:'호주',emoji:'🏄',age:27,bio:'해변, 가벼운 하이킹, 사진을 좋아해요.',tags:['산책','사진','등산'],r:4.6,n:21,v:1},
{id:'p9',name:'지우',city:'타이베이',country:'대만',emoji:'🧋',age:25,bio:'야시장 먹거리와 감성 카페 투어를 좋아해요.',tags:['맛집','카페','사진'],r:4.2,n:8,v:0}
];
const ICE=[['맛집 추천',c=>`${c}에서 현지인이 자주 가는 맛집을 추천해 주실 수 있나요?`],['숨은 명소',c=>`${c}에서 관광객이 잘 모르는 명소가 있을까요?`],['문화·언어',()=>'현지 문화와 언어를 조금 배우고 싶어요. 어떤 표현부터 익히면 좋을까요?'],['일정 소개',c=>`안녕하세요! ${c} 여행을 계획 중이에요. 꼭 해 볼 만한 경험이 있을까요?`]];

const $=s=>document.querySelector(s);
const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const find=id=>PEOPLE.find(p=>p.id===id);

/* ===== 계정별 저장소: 키에 사용자 ID(또는 guest)를 붙여 섞이지 않게 해요 ===== */
const isIn=()=>!!(ME&&ME.id);
const key=n=>`mingle_${n}:${isIn()?ME.id:'guest'}`;
const gk=(n,d)=>get(key(n),d);
const sk=(n,v)=>set(key(n),v);
// 계정 구분 없이 저장되던 예전 공용 키는 주인을 알 수 없어서 읽지 않고 한 번 지워요.
const clearLegacy=()=>{try{['msgs','reviews','favs','blocked','reports'].forEach(n=>localStorage.removeItem('mingle_'+n))}catch(e){}};
const SAVE_FAIL='저장하지 못했어요. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요. 입력한 내용은 그대로 두었어요.';

const needLogin=()=>{if(confirm('로그인이 필요해요. 로그인 페이지로 갈까요?'))location.href='login.html'};
// 인증 초기화를 기다린 뒤에만 계정 기능을 실행해요. 초기화 오류와 비로그인은 구분해요.
async function needAuth(){await authReady;if(authFailed){alert('로그인 상태를 확인하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.');return false}return true}
const stars=v=>'★'.repeat(Math.round(v))+'☆'.repeat(5-Math.round(v));
const err=t=>{const e=$('#err');if(e)e.textContent=t};
let cur=null,ready=false;

/* 후기는 render마다 한 번만 읽고 pid별로 묶어 재사용해요 */
function agg(){const m={};for(const x of gk('reviews',[])){(m[x.pid]=m[x.pid]||[]).push(x)}return m}
function rate(p,ix){const rs=(ix||agg())[p.id]||[],n=p.n+rs.length,s=p.r*p.n+rs.reduce((a,x)=>a+x.s,0);return{avg:n?s/n:0,n,rs}}

/* ===== 모달 ===== */
const modal=$('#modal'),box=$('#modalBox');
let opener=null,openerSel=null;
const isOpen=()=>modal.classList.contains('open');
const setBg=on=>[...document.body.children].forEach(el=>{if(el!==modal&&el.tagName!=='SCRIPT')on?el.setAttribute('inert',''):el.removeAttribute('inert')});
const focusables=()=>[...box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&!el.hidden);
function show(html){
  if(!isOpen()){
    opener=document.activeElement;
    openerSel=opener&&opener.dataset&&opener.dataset.act?`[data-act="${opener.dataset.act}"]`+(opener.dataset.id?`[data-id="${opener.dataset.id}"]`:''):null;
  }
  box.innerHTML='<button class="x" data-act="x" aria-label="닫기">×</button>'+html;
  const h=box.querySelector('h2');
  if(h){h.id='modalTitle';modal.setAttribute('aria-labelledby','modalTitle')}
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  setBg(true);
  box.tabIndex=-1;
  box.scrollTop=0;
  (box.querySelector('input,textarea,select')||box).focus({preventScroll:true});
}
function closeModal(){
  if(!isOpen())return;
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  setBg(false);
  const t=opener&&document.contains(opener)?opener:(openerSel&&document.querySelector(openerSel));
  opener=openerSel=null;
  if(t&&t.focus)t.focus({preventScroll:true});
}
modal.addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
document.addEventListener('keydown',e=>{
  if(!isOpen())return;
  if(e.key==='Escape'){closeModal();return}
  if(e.key!=='Tab')return;
  const f=focusables();
  if(!f.length){e.preventDefault();box.focus();return}
  const a=document.activeElement,first=f[0],last=f[f.length-1];
  if(!box.contains(a)||(e.shiftKey&&(a===first||a===box))){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}
});

/* ===== 목록 ===== */
function render(){
  if(!ready)return;
  const q=$('#q').value.toLowerCase().trim(),city=$('#city').value,tag=$('#tag').value,min=+$('#min').value,ver=$('#ver').checked,sort=$('#sort').value,fav=gk('favs',[]),bl=gk('blocked',[]);
  const ix=agg(),R=new Map(PEOPLE.map(p=>[p.id,rate(p,ix)]));
  const list=PEOPLE.filter(p=>!bl.includes(p.id)&&(!q||[p.name,p.city,p.country,p.bio].concat(p.tags).join(' ').toLowerCase().includes(q))&&(!city||p.city===city)&&(!tag||p.tags.includes(tag))&&(!min||R.get(p.id).avg>=min)&&(!ver||p.v));
  list.sort((a,b)=>sort==='rating'?R.get(b.id).avg-R.get(a.id).avg:sort==='reviews'?R.get(b.id).n-R.get(a.id).n:(b.v-a.v)||R.get(b.id).avg-R.get(a.id).avg);
  $('#grid').innerHTML=list.length?list.map(p=>{const r=R.get(p.id);return `<article class="pc"><div class="pc-top"><div class="av">${p.emoji}</div><div><h3>${esc(p.name)}</h3><div class="meta">${p.age}세 · ${esc(p.city)}, ${esc(p.country)}</div></div></div><button class="badge ${p.v?'ok':'no'}" data-act="trust" data-id="${p.id}">${p.v?'✓ 인증 표시 · 데모':'인증 전 · 데모'}</button><div><span class="stars">${stars(r.avg)}</span> <b>${r.avg.toFixed(1)}</b> <span class="meta">(${r.n}개 평가)</span></div><p>${esc(p.bio)}</p><div class="tg">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="acts"><button class="mini pri" data-act="chat" data-id="${p.id}">메시지</button><button class="mini" data-act="rev" data-id="${p.id}">★ 후기</button><button class="mini" data-act="fav" data-id="${p.id}">${fav.includes(p.id)?'♥':'♡'}</button><button class="mini" data-act="rep" data-id="${p.id}">신고</button><button class="mini" data-act="blk" data-id="${p.id}">차단</button></div></article>`}).join(''):'<div class="empty">조건에 맞는 친구가 없어요.<br>검색어나 필터를 바꿔 보세요.</div>';
}

/* ===== 기능 ===== */
function trust(id){const p=find(id),r=rate(p);show(`<h2>${esc(p.name)}님의 신뢰 정보</h2><ul class="info"><li><b>${p.v?'인증 표시됨':'인증 전'}</b><span>예시 데이터이며 실제 신원 확인이 아니에요.</span></li><li><b>${r.n?r.avg.toFixed(1)+' / 5 · 평가 '+r.n+'개':'평가 없음'}</b><span>평점은 신원 인증과 별개예요.</span></li><li><b>만나기 전에</b><span>개인정보와 금전 정보는 공유하지 말고, 불편하면 신고·차단하세요.</span></li></ul>`)}
function fav(id){const f=gk('favs',[]),i=f.indexOf(id);i>=0?f.splice(i,1):f.push(id);if(!sk('favs',f))return alert('즐겨찾기를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');render();const b=document.querySelector(`[data-act="fav"][data-id="${id}"]`);if(b)b.focus()}

async function profile(){
  if(!(await needAuth()))return;
  await loadProfile();
  if(!isIn()){location.href='login.html';return}
  show(`<h2>내 프로필</h2><form id="pf" class="mf"><input id="nick" maxlength="20" required placeholder="닉네임" value="${esc(ME.name)}"><input id="pcity" maxlength="50" placeholder="주로 여행하고 싶은 도시" value="${esc(ME.city||'')}"><textarea id="pbio" maxlength="300" placeholder="자기소개">${esc(ME.bio||'')}</textarea><p id="err" class="err" role="alert"></p><button class="mini pri">저장</button><button type="button" class="mini" data-act="logout">로그아웃</button></form><p class="note">${esc(ME.email)} 계정으로 로그인했어요.</p>`)
}
async function saveProfile(){
  const nickname=$('#nick').value.trim(),city=$('#pcity').value.trim(),bio=$('#pbio').value.trim();
  if(!nickname)return err('닉네임을 입력해 주세요. 공백만으로는 저장할 수 없어요.');
  if(!isIn())return err('로그인이 필요해요.');
  const {error}=await db.from('profiles').upsert({id:ME.id,nickname,city,bio});
  if(error)return err('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
  ME={...ME,name:nickname,city,bio};showMe();closeModal()
}
function showMe(){$('#me').textContent=authFailed?'로그인 상태 확인 실패':isIn()?ME.name+'님':'게스트'}

function chat(id){if(gk('blocked',[]).includes(id))return;cur=id;drawChat()}
function drawChat(){const p=find(cur),m=gk('msgs',{})[cur]||[{f:'t',t:`안녕하세요! ${p.city} 여행 이야기를 나눠요 😊`}];show(`<h2>${esc(p.name)} · ${esc(p.city)}</h2><div class="ice">${ICE.map((x,i)=>`<button class="mini" data-act="ice" data-i="${i}">${x[0]}</button>`).join('')}<button class="mini" data-act="tips">안전 팁</button></div><div class="msgs" id="msgs">${m.map(x=>`<div class="bub ${x.f==='m'?'me':''}">${esc(x.t)}</div>`).join('')}</div><form id="cf" class="cf"><input id="ci" maxlength="500" placeholder="메시지를 입력하세요" aria-label="메시지"><button class="mini pri">전송</button></form><p id="err" class="err" role="alert"></p><p class="note">브라우저 안에서만 동작하는 데모 채팅이에요.</p>`);const b=$('#msgs');b.scrollTop=b.scrollHeight}
function sendMsg(){const t=$('#ci').value.trim();if(!t)return;const all=gk('msgs',{});all[cur]=all[cur]||[{f:'t',t:`안녕하세요! ${find(cur).city} 여행 이야기를 나눠요 😊`}];all[cur].push({f:'m',t});if(!sk('msgs',all))return err(SAVE_FAIL);drawChat();$('#ci').focus()}
function ice(i){const p=find(cur);$('#ci').value=ICE[i][1](p.city);$('#ci').focus()}
function tips(){alert('안전 팁\n\n• 전화번호, 집 주소, 금융정보는 공유하지 마세요.\n• 송금 요구에 주의하세요.\n• 불편한 대화는 신고하고 차단하세요.\n• 만남은 공공장소에서, 일정은 믿을 수 있는 사람에게 알려 주세요.\n\n데모 기능이며 긴급 구조 서비스가 아니에요.')}

function reviews(id){cur=id;const p=find(id),r=rate(p);show(`<h2>${esc(p.name)}님의 후기</h2><p><span class="stars">${stars(r.avg)}</span> <b>${r.avg.toFixed(1)}</b> <span class="meta">(${r.n}개 평가)</span></p>${r.rs.length?r.rs.slice().reverse().map(x=>`<div class="rv"><span class="stars">${stars(x.s)}</span> <b>${esc(x.u)}</b><p>${esc(x.t||'별점만 남겼어요.')}</p></div>`).join(''):'<p class="note">아직 사용자 후기가 없어요.</p>'}<form id="rf" class="mf"><select id="rs" required><option value="">별점 선택</option><option value="5">★★★★★ 5점</option><option value="4">★★★★ 4점</option><option value="3">★★★ 3점</option><option value="2">★★ 2점</option><option value="1">★ 1점</option></select><textarea id="rt" maxlength="300" placeholder="후기 (선택)"></textarea><p id="err" class="err" role="alert"></p><button class="mini pri">후기 등록</button></form><p class="note">로그인하고 메시지를 보낸 뒤에 남길 수 있어요.</p>`)}
async function sendReview(){
  const s=+$('#rs').value,t=$('#rt').value.trim(),pid=cur;
  if(!(await needAuth()))return;
  if(!isIn())return needLogin();
  if(!(gk('msgs',{})[pid]||[]).some(x=>x.f==='m'))return err('먼저 메시지를 보낸 뒤에 후기를 남길 수 있어요.');
  if(!s)return err('별점을 선택해 주세요.');
  const rs=gk('reviews',[]);
  if(rs.some(x=>x.pid===pid&&x.a===ME.id))return err('이미 후기를 남겼어요.');
  rs.push({pid,a:ME.id,u:ME.name,s,t});
  if(!sk('reviews',rs))return err(SAVE_FAIL);
  render();reviews(pid)
}

async function report(id){if(!(await needAuth()))return;if(!isIn())return needLogin();cur=id;show(`<h2>${esc(find(id).name)}님 신고</h2><form id="xf" class="mf"><select id="xr" required><option value="">사유 선택</option><option>괴롭힘</option><option>사칭·허위 프로필</option><option>스팸·광고</option><option>안전 우려</option><option>기타</option></select><textarea id="xd" maxlength="500" placeholder="상황을 알려 주세요 (선택)"></textarea><p id="err" class="err" role="alert"></p><button class="mini pri">신고 기록 저장</button></form><p class="note">데모에서는 이 브라우저에만 저장되고 운영팀에 전달되지 않아요. 저장한 기록은 안전 센터에서 확인하고 지울 수 있어요.</p>`)}
async function sendReport(){
  const reason=$('#xr').value,detail=$('#xd').value.trim(),pid=cur;
  if(!(await needAuth()))return;
  if(!isIn())return needLogin();
  const r=gk('reports',[]);
  r.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),pid,by:ME.id,byName:ME.name,reason,detail,at:Date.now()});
  if(!sk('reports',r))return err(SAVE_FAIL);
  safety('신고 기록이 이 브라우저에 저장되었어요. 운영팀에는 전달되지 않아요. (데모)')
}
function delReport(id){if(!sk('reports',gk('reports',[]).filter(x=>x.id!==id)))return alert('삭제하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');safety('신고 기록을 삭제했어요.')}
function block(id){let b=gk('blocked',[]);if(b.includes(id))b=b.filter(x=>x!==id);else{if(!confirm(find(id).name+'님을 차단할까요? 검색에서 숨겨지고 채팅이 막혀요.'))return;b.push(id)}if(!sk('blocked',b))return alert('차단 설정을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');render();safety()}
async function safety(msg){
  await authReady;
  const b=gk('blocked',[]),rp=gk('reports',[]).slice().reverse(),nm=id=>esc((find(id)||{}).name||id);
  show(`<h2>안전 센터</h2>${msg?`<p class="note" role="status">${esc(msg)}</p>`:''}<h3>차단한 사용자</h3><p class="note">차단한 사용자는 검색에서 숨겨지고 채팅도 막혀요.</p>${b.length?b.map(id=>`<div class="row"><b>${nm(id)}</b><button class="mini" data-act="blk" data-id="${id}">차단 해제</button></div>`).join(''):'<p>차단한 사용자가 없어요.</p>'}<h3>내 신고 기록</h3>${rp.length?rp.map(x=>`<div class="row"><span><b>${nm(x.pid)}</b> · ${esc(x.reason)} · <span class="meta">${new Date(x.at).toLocaleString('ko-KR')}</span>${x.detail?`<br><span class="meta">${esc(x.detail)}</span>`:''}</span><button class="mini" data-act="delrep" data-id="${x.id}">삭제</button></div>`).join(''):'<p>저장된 신고 기록이 없어요.</p>'}<p class="note">차단·신고 내역은 이 브라우저에만 저장돼요. 신고는 운영팀에 전달되지 않는 데모 기록이에요.</p>`)
}

/* ===== 이벤트 연결 ===== */
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.dataset.id;({x:closeModal,trust:()=>trust(id),fav:()=>fav(id),chat:()=>chat(id),rev:()=>reviews(id),rep:()=>report(id),blk:()=>block(id),delrep:()=>delReport(id),safety,profile:()=>profile(),tips,ice:()=>ice(b.dataset.i),logout:async()=>{await db.auth.signOut();location.href='index.html'}}[b.dataset.act]||(()=>{}))()});
document.addEventListener('submit',e=>{e.preventDefault();({pf:saveProfile,cf:sendMsg,rf:sendReview,xf:sendReport}[e.target.id]||(()=>{}))()});
PEOPLE.map(p=>p.city).filter((v,i,a)=>a.indexOf(v)===i).sort().forEach(c=>{const o=document.createElement('option');o.value=o.textContent=c;$('#city').appendChild(o)});
$('#q').addEventListener('input',render);
['city','tag','min','sort','ver'].forEach(i=>$('#'+i).addEventListener('change',render));
$('#grid').innerHTML='<div class="empty">불러오는 중…</div>';
authReady.then(()=>{clearLegacy();ready=true;showMe();render()});
loadProfile().then(showMe);
