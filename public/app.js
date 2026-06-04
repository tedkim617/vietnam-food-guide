const state = { data:null, q:'', category:'', selected:null, adminToken:localStorage.getItem('adminToken')||'', view:'home' };
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
const fmt = n => n ? Number(n).toLocaleString('ko-KR') : '정보 없음';
const spice = n => ['맵지 않음','약간 매움','보통 매움','매움'][Number(n)||0] || '정보 없음';
const imageUrl = src => src || '/uploads/foods/placeholder.svg';

async function api(path, opts={}){
  const headers = {'Content-Type':'application/json', ...(opts.headers||{})};
  if(state.adminToken) headers.Authorization = `Bearer ${state.adminToken}`;
  const res = await fetch(path, {...opts, headers});
  if(!res.ok) throw new Error((await res.json().catch(()=>({error:res.statusText}))).error || res.statusText);
  return res.json();
}
async function uploadImage(file, slug){
  const fd = new FormData();
  fd.append('slug', slug || 'food');
  fd.append('image', file);
  const headers = {};
  if(state.adminToken) headers.Authorization = `Bearer ${state.adminToken}`;
  const res = await fetch('/api/admin/upload-image', { method:'POST', headers, body:fd });
  if(!res.ok) throw new Error((await res.json().catch(()=>({error:res.statusText}))).error || res.statusText);
  return res.json();
}
async function load(){
  state.data = await api(`/api/data?q=${encodeURIComponent(state.q)}&category=${encodeURIComponent(state.category)}`);
  render();
}
function catName(id){ return state.data?.categories.find(c=>c.id===id)?.nameKo || id; }
function foodCard(f){
  return `<article class="card">
    <div class="cardImg" style="background-image:url('${esc(imageUrl(f.image))}')"></div>
    <div class="cardBody">
      <div class="names"><div class="vi">${esc(f.nameVi)}</div><div class="en">${esc(f.nameEn)}</div><div class="ko">${esc(f.nameKo)} · ${esc(f.pronunciationKo)}</div></div>
      <div class="tags"><span class="tag">${esc(catName(f.categoryId))}</span><span class="tag">${spice(f.spicyLevel)}</span>${f.hasCilantro?'<span class="tag">고수 주의</span>':''}</div>
      <div class="price">${f.priceMin||f.priceMax ? `${fmt(f.priceMin)}~${fmt(f.priceMax)} ${esc(f.currency)}` : '가격 정보 없음'}</div>
      <button class="openBtn" onclick="openFood('${esc(f.id)}')">주문 정보 보기</button>
    </div>
  </article>`;
}
function shell(content){
  return `<main class="shell">
    <section class="hero">
      <div class="topbar"><div class="brand"><div class="logo">🍜</div><div class="brandText">Viet Menu Guide<span>베트남 음식 주문 도우미</span></div></div><button class="adminlink" onclick="showAdmin()">관리자</button></div>
      <div class="search"><input id="searchInput" placeholder="쌀국수, phở, pho, 퍼, coffee 검색" value="${esc(state.q)}"><button onclick="doSearch()">검색</button></div>
      <div class="chips"><button class="chip ${state.category===''?'active':''}" onclick="setCat('')">전체</button>${state.data.categories.map(c=>`<button class="chip ${state.category===c.id?'active':''}" onclick="setCat('${esc(c.id)}')">${esc(c.icon)} ${esc(c.nameKo)}</button>`).join('')}</div>
    </section>
    ${content}
  </main>${nav()}${detailDrawer()}<div class="copyToast" id="toast">복사했습니다</div>`;
}
function nav(){return `<nav class="bottomNav"><button class="active" onclick="scrollToTop()">홈</button><button onclick="setCat('meal')">식사</button><button onclick="setCat('snack')">간식</button><button onclick="showPhrases()">주문문장</button><button onclick="showAdmin()">관리</button></nav>`}
function render(){
  const foods = state.data.foods;
  const title = state.q ? '검색 결과' : (state.category ? esc(catName(state.category)) : '전체 음식');
  const content = `<div class="sectionTitle"><div><h2>${title}</h2><p>${foods.length}개 항목</p></div></div>
    <div class="sectionTitle"><div><p>사진을 누르지 말고 “주문 정보 보기”로 크게 보여주세요.</p></div></div>
    ${foods.length ? `<div class="grid">${foods.map(foodCard).join('')}</div>` : '<div class="empty">검색 결과가 없습니다.</div>'}`;
  document.getElementById('app').innerHTML = shell(content);
  $('#searchInput')?.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });
}
function detailDrawer(){return `<div class="drawer" id="drawer" onclick="if(event.target.id==='drawer')closeFood()"><div class="sheet" id="sheet"></div></div>`}
function openFood(id){
  const f = state.data.foods.find(x=>x.id===id); if(!f) return;
  $('#sheet').innerHTML = `<button class="close" onclick="closeFood()">×</button><div class="detailImg" style="background-image:url('${esc(imageUrl(f.image))}')"></div><div class="detail">
    <div class="label">${esc(catName(f.categoryId))} · ${esc(f.region || '지역 정보 없음')}</div><h1>${esc(f.nameVi)}</h1><p class="en">${esc(f.nameEn)}</p><p class="ko">${esc(f.nameKo)} · ${esc(f.pronunciationKo)}</p>
    <div class="orderBox"><div class="label" style="color:#d9fff5">직원에게 보여주세요</div><div class="big">${esc(f.orderPhraseVi || f.nameVi)}</div><div>${esc(f.orderPhraseKo || '이 음식을 주문하고 싶어요.')}</div><button onclick="copyText('${esc(String(f.orderPhraseVi||f.nameVi).replaceAll("'","\\'"))}')">베트남어 문장 복사</button></div>
    <div class="infoGrid"><div class="info"><div class="label">평균 금액</div><div class="value">${f.priceMin||f.priceMax ? `${fmt(f.priceMin)}~${fmt(f.priceMax)} ${esc(f.currency)}` : '정보 없음'}</div></div><div class="info"><div class="label">매운 정도</div><div class="value">${spice(f.spicyLevel)}</div></div><div class="info"><div class="label">고수</div><div class="value">${f.hasCilantro?'포함 가능':'보통 없음'}</div></div><div class="info"><div class="label">태그</div><div class="value">${esc((f.dietTags||[]).join(', ')||'정보 없음')}</div></div></div>
    <h3>간단한 음식소개</h3><p>${esc(f.shortIntro)}</p><h3>주요재료 및 소스</h3><p>${esc(f.ingredients)}</p><h3>먹는방법</h3><p>${esc(f.howToEat)}</p><h3>추천 식당</h3>${f.restaurants?.length ? f.restaurants.map(r=>`<div class="info"><b>${esc(r.name)}</b><br>${esc(r.city||'')} · ${esc(r.note||'')}<br>${r.mapUrl?`<a href="${esc(r.mapUrl)}" target="_blank">Google Maps 열기</a>`:''}</div>`).join('') : '<p class="en">추천 식당 정보 없음</p>'}
  </div>`;
  $('#drawer').classList.add('show');
}
function closeFood(){ $('#drawer')?.classList.remove('show'); }
function copyText(t){ navigator.clipboard?.writeText(t); $('#toast').classList.add('show'); setTimeout(()=>$('#toast').classList.remove('show'),1300); }
function doSearch(){ state.q = $('#searchInput').value.trim(); load(); }
function setCat(id){ state.category=id; state.q=''; load(); }
function scrollToTop(){ window.scrollTo({top:0,behavior:'smooth'}); }
function showPhrases(){ state.category='other'; state.q=''; load(); }
function showAdmin(){ renderAdminLogin(); }
function renderAdminLogin(){
  document.getElementById('app').innerHTML = `<main class="admin"><div class="adminPanel"><h1>관리자 페이지</h1><p>음식 정보를 수시로 추가·수정할 수 있습니다. 기본 비밀번호는 .env의 ADMIN_PASSWORD 값입니다.</p><input id="pw" type="password" placeholder="관리자 비밀번호"><div class="adminActions"><button class="primary" style="padding:12px 18px" onclick="adminLogin()">로그인</button><button class="secondary" onclick="load()">사용자 앱으로 돌아가기</button></div></div></main>`;
}
async function adminLogin(){
  try{ const r = await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#pw').value})}); state.adminToken=r.token; localStorage.setItem('adminToken',r.token); renderAdmin(); }
  catch(e){ alert('로그인 실패: '+e.message); }
}
async function renderAdmin(){
  const data = await api('/api/admin/data');
  document.getElementById('app').innerHTML = `<main class="admin"><div class="adminPanel"><h1>음식 데이터 관리</h1><p>${data.foods.length}개 음식 등록됨</p><div class="adminActions"><button class="primary" style="padding:12px 18px" onclick="editFood()">새 음식 추가</button><button class="secondary" onclick="load()">앱 보기</button><button class="danger" onclick="logout()">로그아웃</button></div><p class="hint">이미지는 관리자 화면에서 파일을 선택하면 <b>public/uploads/foods</b> 폴더에 저장됩니다. URL을 입력할 필요가 없습니다.</p></div><div class="grid">${data.foods.map(f=>`<article class="card"><div class="cardImg" style="background-image:url('${esc(imageUrl(f.image))}')"></div><div class="cardBody"><div class="vi">${esc(f.nameVi)}</div><div class="ko">${esc(f.nameKo)} · ${esc(catNameLocal(data,f.categoryId))}</div><div class="adminActions"><button class="secondary" onclick='editFood(${JSON.stringify(f).replaceAll("'","&#39;")})'>수정</button><button class="danger" onclick="deleteFood('${esc(f.id)}')">삭제</button></div></div></article>`).join('')}</div></main>`;
}
function catNameLocal(data,id){ return data.categories.find(c=>c.id===id)?.nameKo || id; }
function logout(){ localStorage.removeItem('adminToken'); state.adminToken=''; load(); }
function editFood(f={}){
  document.getElementById('app').innerHTML = `<main class="admin"><div class="adminPanel"><h1>${f.id?'음식 수정':'새 음식 추가'}</h1><div class="formGrid">
    <input id="id" placeholder="id 영문 슬러그" value="${esc(f.id||'')}"><select id="categoryId">${(state.data?.categories||[]).map(c=>`<option value="${esc(c.id)}" ${f.categoryId===c.id?'selected':''}>${esc(c.nameKo)}</option>`).join('')}</select>
    <input id="nameVi" placeholder="베트남어 명칭" value="${esc(f.nameVi||'')}"><input id="nameEn" placeholder="영어 명칭" value="${esc(f.nameEn||'')}">
    <input id="nameKo" placeholder="한국어 명칭" value="${esc(f.nameKo||'')}"><input id="pronunciationKo" placeholder="한국어 독음" value="${esc(f.pronunciationKo||'')}">
    <div class="imageField"><label>음식사진 직접 업로드</label><input id="imageFile" type="file" accept="image/*"><small>선택한 이미지는 public/uploads/foods 폴더에 저장됩니다.</small><input id="image" type="hidden" value="${esc(f.image||'')}"><div id="imagePreview" class="imagePreview" style="background-image:url('${esc(imageUrl(f.image))}')"></div></div><input id="region" placeholder="지역" value="${esc(f.region||'')}">
    <input id="priceMin" type="number" placeholder="최저 가격" value="${esc(f.priceMin||0)}"><input id="priceMax" type="number" placeholder="최고 가격" value="${esc(f.priceMax||0)}">
    <select id="spicyLevel"><option value="0">맵지 않음</option><option value="1">약간 매움</option><option value="2">보통 매움</option><option value="3">매움</option></select><select id="hasCilantro"><option value="false">고수 없음/정보 없음</option><option value="true">고수 포함 가능</option></select>
    <textarea id="shortIntro" placeholder="간단한 음식소개">${esc(f.shortIntro||'')}</textarea><textarea id="ingredients" placeholder="주요재료 및 소스">${esc(f.ingredients||'')}</textarea>
    <textarea id="howToEat" placeholder="먹는방법">${esc(f.howToEat||'')}</textarea><textarea id="keywords" placeholder="검색 키워드, 쉼표 구분">${esc((f.keywords||[]).join(', '))}</textarea>
    <input id="orderPhraseVi" placeholder="주문 문장 베트남어" value="${esc(f.orderPhraseVi||'')}"><input id="orderPhraseKo" placeholder="주문 문장 한국어" value="${esc(f.orderPhraseKo||'')}">
  </div><div class="adminActions"><button class="primary" style="padding:12px 18px" onclick="saveFood()">저장</button><button class="secondary" onclick="renderAdmin()">취소</button></div></div></main>`;
  $('#spicyLevel').value = String(f.spicyLevel||0); $('#hasCilantro').value = String(Boolean(f.hasCilantro));
  $('#imageFile')?.addEventListener('change', e=>{ const file=e.target.files?.[0]; if(file) $('#imagePreview').style.backgroundImage = `url('${URL.createObjectURL(file)}')`; });
}
async function saveFood(){
  const fields = ['id','categoryId','image','nameVi','nameEn','nameKo','pronunciationKo','shortIntro','ingredients','howToEat','region','orderPhraseVi','orderPhraseKo'];
  const body = {}; fields.forEach(x=>body[x]=$('#'+x).value.trim());
  const file = $('#imageFile')?.files?.[0];
  try{
    if(file){
      const uploaded = await uploadImage(file, body.id || body.nameVi || 'food');
      body.image = uploaded.image;
    }
    body.priceMin=Number($('#priceMin').value||0); body.priceMax=Number($('#priceMax').value||0); body.spicyLevel=Number($('#spicyLevel').value); body.hasCilantro=$('#hasCilantro').value==='true'; body.keywords=$('#keywords').value.split(',').map(s=>s.trim()).filter(Boolean); body.published=true; body.currency='VND'; body.restaurants=[];
    await api('/api/admin/food',{method:'POST',body:JSON.stringify(body)}); await load(); await renderAdmin();
  } catch(e){ alert('저장 실패: '+e.message); }
}
async function deleteFood(id){ if(!confirm('삭제할까요?'))return; await api('/api/admin/food/'+encodeURIComponent(id),{method:'DELETE'}); renderAdmin(); }

load().catch(e=>{ document.getElementById('app').innerHTML = `<main class="shell"><div class="empty">앱 로딩 실패: ${esc(e.message)}</div></main>`; });
