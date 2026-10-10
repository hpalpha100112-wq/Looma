(function () {
  'use strict';

  const API = '/api';
  const tokenKey = 'looma.auth.token';
  const userKey = 'looma.auth.user';
  const root = document.querySelector('.app-root');
  const routeView = document.getElementById('routeView');
  const homeMain = document.getElementById('homeMain');
  const toastEl = document.getElementById('toast');
  const state = {
    token: localStorage.getItem(tokenKey) || '',
    user: readUser(),
    projects: [],
    currentBrief: null,
    currentDesign: null,
    currentProjectId: null,
    toastTimer: null,
    privateUrls: [],
    style: 'Warm Modern',
    styleKey: 'warm',
    communityJoined: readArray('looma.community.joined')
  };

  function readUser() { try { return JSON.parse(localStorage.getItem(userKey) || 'null'); } catch { return null; } }
  function readArray(key) { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
  function toast(message) { toastEl.textContent = message; toastEl.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200); }
  function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    return fetch(`${API}${path}`, { ...options, headers }).then(async res => {
      let payload = {}; try { payload = await res.json(); } catch { payload = {}; }
      if (!res.ok) {
        if (res.status === 401 && state.token) clearAuth(false);
        throw new Error(payload.error || `Request failed (${res.status}).`);
      }
      return payload;
    });
  }
  function routeInfo() {
    let value = location.hash.replace(/^#\/?/, '');
    if (!value) value = 'home';
    const [path, query = ''] = value.split('?');
    return { path: path || 'home', parts: (path || 'home').split('/').filter(Boolean), query: new URLSearchParams(query) };
  }
  function navigate(path) { location.hash = `#/${String(path).replace(/^\/+/, '')}`; }
  function link(path, label, cls = 'btn btn-primary') { return `<a class="${cls}" href="#/${path.replace(/^\/+/, '')}">${label}</a>`; }
  function layout(kicker, title, desc, actions, content) {
    const page = routeInfo().parts.join(' / ').replace(/-/g, ' ');
    return `<div class="route-page"><div class="route-breadcrumb"><a href="#/home">Home</a><span>/</span><span>${esc(page || 'Home')}</span></div><div class="route-heading"><div><div class="route-kicker">${esc(kicker)}</div><h1>${title}</h1><p>${desc}</p></div><div class="route-actions">${actions || ''}</div></div>${content || ''}</div>`;
  }

  const palettes = {
    minimal:{wall:'#e8e7df',floor:'#bba991',sofa:'#b7b8ae',sofa2:'#c9c9bf',accent:'#a4aa98',wood:'#92795e',plant:'#647c63',rug:'#dedbd1',art:'#d5d3ca'},
    japandi:{wall:'#e8dfd1',floor:'#b58f6a',sofa:'#c8b9a6',sofa2:'#ddd0bd',accent:'#a78c6c',wood:'#916b4c',plant:'#6b7b5a',rug:'#e1d5c4',art:'#c5b8a3'},
    warm:{wall:'#e6d7c4',floor:'#a87956',sofa:'#bba18a',sofa2:'#d0b9a1',accent:'#8a9876',wood:'#8a6046',plant:'#5f7856',rug:'#d4c3ad',art:'#bd8d70'},
    modern:{wall:'#d9d8d1',floor:'#a08d7b',sofa:'#5a665e',sofa2:'#778079',accent:'#b58b62',wood:'#725744',plant:'#65785a',rug:'#c9c7bd',art:'#b7a28a'},
    coastal:{wall:'#e9e4d8',floor:'#c9ac8d',sofa:'#d9d9ce',sofa2:'#eceadd',accent:'#789e9c',wood:'#a98764',plant:'#5e816c',rug:'#ddd8ca',art:'#8fb1ad'}
  };
  const styleMap = {'Soft Minimal':'minimal','Japandi':'japandi','Warm Modern':'warm','Contemporary':'modern','Coastal':'coastal'};
  const styleNames = {minimal:'Soft Minimal',japandi:'Japandi',warm:'Warm Modern',modern:'Contemporary',coastal:'Coastal'};
  const styleDesc = {minimal:'Soft neutrals · clear silhouettes',japandi:'Natural textures · quiet balance',warm:'Earthy layers · warm timber',modern:'Deep tones · crisp contrast',coastal:'Airy palette · relaxed texture'};
  const svgScene = (key = 'warm', compact = false) => {
    const p = palettes[key] || palettes.warm, id = `r${key}${compact ? 'c' : 'f'}`;
    return `<svg viewBox="0 0 780 480" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustrative ${esc(key)} interior style"><defs><linearGradient id="w${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.wall}"/><stop offset="1" stop-color="${p.art}"/></linearGradient><linearGradient id="f${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p.floor}"/><stop offset="1" stop-color="${p.wood}"/></linearGradient><filter id="sh${id}" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="780" height="480" fill="url(#w${id})"/><rect y="349" width="780" height="131" fill="url(#f${id})"/><path d="M0 350H780" stroke="#8f7962" stroke-opacity=".4" stroke-width="3"/><rect x="72" y="45" width="182" height="190" rx="4" fill="#f1eee2" stroke="#fffaf0" stroke-width="10"/><rect x="86" y="59" width="154" height="162" fill="#b9cbc4"/><path d="M86 168Q140 125 164 155T240 131V221H86Z" fill="#dae0d1"/><path d="M163 59V221M86 140H240" stroke="#f4efe5" stroke-width="8"/><rect x="452" y="61" width="187" height="118" fill="#f4eee4" stroke="#c6b9a7" stroke-width="2"/><rect x="463" y="72" width="165" height="96" fill="${p.art}"/><path d="M474 146Q515 102 552 133T617 102V168H474Z" fill="${p.accent}" opacity=".55"/><circle cx="548" cy="104" r="17" fill="#e8d8b8" opacity=".9"/><ellipse cx="385" cy="421" rx="250" ry="35" fill="#3d3328" opacity=".17" filter="url(#sh${id})"/><ellipse cx="404" cy="405" rx="244" ry="47" fill="${p.rug}" opacity=".95"/><rect x="231" y="292" width="344" height="89" rx="20" fill="${p.sofa}"/><rect x="245" y="254" width="156" height="88" rx="18" fill="${p.sofa}"/><rect x="408" y="254" width="150" height="88" rx="18" fill="${p.sofa}"/><rect x="257" y="266" width="119" height="64" rx="13" fill="${p.sofa2}"/><rect x="421" y="265" width="119" height="65" rx="13" fill="${p.accent}" opacity=".83"/><path d="M239 373V394M562 373V394" stroke="${p.wood}" stroke-width="12" stroke-linecap="round"/><path d="M292 361Q394 347 504 361L487 388Q392 399 306 388Z" fill="${p.wood}"/><path d="M308 365Q400 355 487 365" stroke="#dfc5a0" stroke-opacity=".8" stroke-width="3" fill="none"/><ellipse cx="393" cy="355" rx="30" ry="9" fill="#e4dac9"/><path d="M377 353q-9-35 0-45h31q8 24 0 45Z" fill="#f0e9dc"/><path d="M392 310q-12-28 4-43q9 19 0 43M392 312q-25-16-23-30q23 4 23 30M394 310q21-23 31-17q-5 19-31 17" fill="${p.plant}"/><path d="M657 349V209" stroke="${p.wood}" stroke-width="7"/><path d="M623 210Q657 164 691 210L679 239H635Z" fill="#e5d3b7"/><path d="M629 352h56l-6 27h-44Z" fill="${p.wood}"/><path d="M52 302Q15 270 29 235Q57 249 55 294M53 297Q82 259 100 269Q91 303 53 310M51 277Q35 239 51 213Q74 244 55 285" fill="${p.plant}"/><path d="M33 350h39l-5 36H38Z" fill="#c6b5a0"/></svg>`;
  };
  function card({ title, desc, key = 'warm', category = 'Warm & natural', href = '#/studio', badge = '', meta = 'Room concept' }) {
    return `<article class="route-card" data-search="${esc((title+' '+desc+' '+category).toLowerCase())}"><a href="${href}" aria-label="Open ${esc(title)}"><div class="route-card-visual">${svgScene(key, true)}${badge ? `<span class="draft-tag">${esc(badge)}</span>` : ''}</div></a><div class="route-card-body"><h3>${esc(title)}</h3><p>${esc(desc)}</p><div class="route-card-foot"><small>${esc(meta)}</small><a class="text-button" href="${href}">Explore ↗</a></div></div></article>`;
  }
  function styleHref(style, extra = {}) {
    const params = new URLSearchParams({ style, ...extra });
    return `#/studio?${params.toString()}`;
  }
  function setHeader(route) {
    const first = route.parts[0] || 'home';
    document.querySelectorAll('[data-nav-route]').forEach(a => a.classList.toggle('active', a.dataset.navRoute === first || (first === 'projects' && a.dataset.navRoute === 'projects')));
    const count = document.getElementById('savedCount'); if (count) count.textContent = state.token ? String(state.projects.length) : '0';
    const account = document.getElementById('accountBtn'); if (account) account.textContent = state.user ? 'My account' : 'Sign in';
  }
  function render() {
    cleanupPrivateUrls();
    const route = routeInfo();
    setHeader(route);
    const first = route.parts[0] || 'home';
    const isHome = first === 'home';
    homeMain.hidden = !isHome;
    routeView.hidden = isHome;
    root.classList.toggle('is-routed', !isHome);
    if (isHome) { renderHomeDetails(); return; }
    routeView.innerHTML = '<div class="route-page"><div class="route-status">Loading your page…</div></div>';
    const renders = {
      explore: renderExplore,
      templates: renderTemplates,
      studio: renderStudio,
      projects: renderProjects,
      project: () => renderProjectDetail(route.parts[1] || ''),
      community: renderCommunity,
      pricing: renderPricing,
      account: renderAccount,
      support: renderSupport,
      help: renderSupport
    };
    const method = first === 'projects' && route.parts.length > 1 ? () => renderProjectDetail(route.parts[1]) : renders[first];
    if (!method) { routeView.innerHTML = layout('Not found', 'This room is not on the plan.', 'The page may have moved. Head back to the studio to keep creating.', link('home', 'Back home'), `<div class="route-empty"><h3>Let’s find your way back.</h3>${link('explore', 'Explore styles')}</div>`); return; }
    Promise.resolve(method(route)).catch(error => {
      console.error(error);
      routeView.innerHTML = layout('Something went wrong', 'This page could not load.', esc(error.message || 'Please try again.'), link(first, 'Try again'), `<div class="route-empty"><h3>We kept your place.</h3><p>Your work has not been intentionally changed. Retry the page or return to projects.</p>${link('projects', 'Open projects', 'btn btn-primary')}</div>`);
    });
  }
  function renderHomeDetails() {
    document.getElementById('heroScene').innerHTML = svgScene('warm');
    document.getElementById('workspaceScene').innerHTML = svgScene('japandi', true);
    document.querySelectorAll('[data-scene]').forEach(el => el.innerHTML = svgScene(el.dataset.scene, true));
    document.querySelectorAll('[data-project-scene]').forEach(el => { if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', svgScene(el.dataset.projectScene, true)); });
    document.querySelectorAll('.filter-chip').forEach(chip => chip.onclick = () => {
      document.querySelectorAll('.filter-chip').forEach(x => x.classList.toggle('active', x === chip));
      document.querySelectorAll('.style-card').forEach(c => c.style.display = chip.dataset.filter === 'all' || c.dataset.category === chip.dataset.filter ? '' : 'none');
    });
    document.querySelectorAll('.style-card').forEach(btn => btn.onclick = () => {
      document.querySelectorAll('.style-card').forEach(c => c.classList.toggle('selected', c === btn));
      state.style = btn.dataset.style; state.styleKey = styleMap[state.style] || 'warm';
      const cta = document.getElementById('stylesCta'); if (cta) { cta.textContent = `Use ${state.style} in my room ↗`; cta.href = styleHref(state.style); }
      toast(`${state.style} selected. Your style will be ready in the Studio.`);
    });
  }

  function renderExplore() {
    const content = `<div class="route-toolbar"><input id="exploreSearch" class="route-search" type="search" placeholder="Search styles, rooms or moods…" aria-label="Search styles"/><div id="exploreFilters" class="filter-row"><button class="filter-chip active" data-explore-filter="all">All styles</button><button class="filter-chip" data-explore-filter="calm">Calm & natural</button><button class="filter-chip" data-explore-filter="warm">Warm & lived-in</button><button class="filter-chip" data-explore-filter="bold">Modern & bold</button></div></div><div id="exploreCards" class="route-cards">${[
      ['Soft Minimal','A quieter room with space to breathe.','minimal','calm'],['Japandi','Natural textures, gentle contrast and crafted wood.','japandi','calm'],['Warm Modern','Layered neutrals and welcoming timber.','warm','warm'],['Contemporary','Sculptural forms and considered contrast.','modern','bold'],['Coastal Calm','Airy fabrics and a soft, relaxed palette.','coastal','calm']
    ].map(([t,d,k,c]) => card({title:t,desc:d,key:k,category:c,href:styleHref(styleNames[k]),meta:'Style guide'})).join('')}</div><div class="route-section route-panel"><h3>Not sure where to start?</h3><p>Use the guided studio to pick the room, dimensions, budget and must-keep items before testing a look.</p>${link('studio', 'Build my room brief')}</div>`;
    routeView.innerHTML = layout('Explore the possibilities', 'Find a style that feels like you.', 'Browse different interior directions, search by mood, and take any style into your own room brief.', link('templates','Browse templates','btn btn-plain'), content);
    let filter = 'all';
    const apply = () => {
      const q = document.getElementById('exploreSearch').value.toLowerCase();
      document.querySelectorAll('#exploreCards .route-card').forEach(el => { const cat = el.dataset.search; const category = cat.includes('minimal') || cat.includes('japandi') || cat.includes('calm') ? 'calm' : cat.includes('contemporary') || cat.includes('contrast') ? 'bold' : 'warm'; el.hidden = !(cat.includes(q) && (filter === 'all' || category === filter)); });
    };
    document.getElementById('exploreSearch').addEventListener('input', apply);
    document.querySelectorAll('[data-explore-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.exploreFilter; document.querySelectorAll('[data-explore-filter]').forEach(c=>c.classList.toggle('active',c===b)); apply(); }));
  }

  const templates = [
    {id:'small-living',name:'Small-space living',room:'Living room',style:'Soft Minimal',key:'minimal',w:3.5,l:4,budget:'Under ₹75,000',desc:'Airy layout ideas for compact apartments.',category:'Small homes'},
    {id:'japandi-bedroom',name:'Quiet Japandi bedroom',room:'Bedroom',style:'Japandi',key:'japandi',w:3.5,l:3.8,budget:'₹75,000 – ₹1.5L',desc:'Calm textures, natural wood and gentle light.',category:'Bedroom'},
    {id:'warm-family',name:'Warm family living room',room:'Living room',style:'Warm Modern',key:'warm',w:4.5,l:4,budget:'₹1.5L – ₹3L',desc:'Durable finishes and welcoming layers.',category:'Family home'},
    {id:'modern-kitchen',name:'Contemporary kitchen',room:'Kitchen',style:'Contemporary',key:'modern',w:3.2,l:4,budget:'₹3L – ₹6L',desc:'Clean contrast and streamlined storage ideas.',category:'Kitchen'},
    {id:'coastal-studio',name:'Light coastal studio',room:'Studio apartment',style:'Coastal',key:'coastal',w:4,l:5,budget:'₹1.5L – ₹3L',desc:'A breezy visual direction for a multi-use room.',category:'Studio apartment'},
    {id:'home-office',name:'Focused home office',room:'Office',style:'Soft Minimal',key:'minimal',w:2.8,l:3,budget:'₹75,000 – ₹1.5L',desc:'A tidy work zone that still feels like home.',category:'Work from home'}
  ];
  function templateLink(t) { return styleHref(t.style,{template:t.id,roomType:t.room,width:t.w,length:t.l,budget:t.budget}); }
  function renderTemplates() {
    const content = `<div class="route-toolbar"><input id="templateSearch" class="route-search" type="search" placeholder="Search room templates…"/><select id="templateRoom" class="route-select" aria-label="Filter templates by room"><option value="all">All room types</option>${['Living room','Bedroom','Kitchen','Studio apartment','Office'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="route-cards" id="templateCards">${templates.map(t=>card({title:t.name,desc:t.desc,key:t.key,category:t.category,href:templateLink(t),badge:'STARTER TEMPLATE',meta:`${t.w} × ${t.l} m · ${t.budget}`})).join('')}</div><div class="route-section route-status">Templates are editable starting points. Dimension and budget suggestions are illustrative and should be confirmed for your own room.</div>`;
    routeView.innerHTML = layout('Start with a helpful default', 'A good room plan begins with a starting point.', 'Choose a room template, then personalise the dimensions, priorities and style in the Studio.', link('studio','Start from scratch','btn btn-plain'), content);
    const apply = () => { const q=document.getElementById('templateSearch').value.toLowerCase(), room=document.getElementById('templateRoom').value; document.querySelectorAll('#templateCards .route-card').forEach((el,i)=>{const t=templates[i];el.hidden=!(t.name.toLowerCase().includes(q)||t.desc.toLowerCase().includes(q)||t.category.toLowerCase().includes(q)) || (room!=='all'&&t.room!==room);}); };
    document.getElementById('templateSearch').addEventListener('input',apply); document.getElementById('templateRoom').addEventListener('change',apply);
  }

  function renderStudio(route = routeInfo()) {
    const q = route.query;
    if (q.has('style') || q.has('template') || q.has('roomType') || q.has('width') || q.has('length')) { state.currentDesign = null; state.currentBrief = null; state.currentProjectId = null; }
    const requestedStyle = q.get('style') || state.style;
    if (styleMap[requestedStyle]) { state.style = requestedStyle; state.styleKey = styleMap[requestedStyle]; }
    else if (styleNames[requestedStyle]) { state.style = styleNames[requestedStyle]; state.styleKey = requestedStyle; }
    else { state.style = requestedStyle; state.styleKey = styleMap[state.style] || state.styleKey || 'warm'; }
    const room = q.get('roomType') || 'Living room';
    const width = q.get('width') || '4.5', length = q.get('length') || '4';
    const budget = q.get('budget') || '₹1.5L – ₹3L';
    const inner = `<div class="studio-layout"><aside class="studio-panel studio-sidebar"><div class="route-kicker">Your room brief</div><h3>Start with the essentials.</h3><p>Adjust the defaults for your room. The AI action requires a signed-in account and a server API key.</p>
      <form id="studioForm" class="studio-fields">
       <div class="studio-field"><label for="studioName">Project name</label><input id="studioName" name="name" maxlength="70" value="My ${esc(room.toLowerCase())}" required/></div>
       <div class="studio-field"><label for="studioRoom">Room type</label><select id="studioRoom" name="roomType">${['Living room','Bedroom','Kitchen','Dining room','Bathroom','Studio apartment','Office'].map(x=>`<option ${room===x?'selected':''}>${x}</option>`).join('')}</select></div>
       <div class="studio-field"><label>Dimensions (metres)</label><div class="studio-dimensions"><input type="number" id="studioWidth" name="width" min="1" max="100" step="0.1" value="${esc(width)}" required aria-label="Room width in metres"/><input type="number" id="studioLength" name="length" min="1" max="100" step="0.1" value="${esc(length)}" required aria-label="Room length in metres"/></div></div>
       <div class="studio-field"><label for="studioBudget">Planning budget</label><select id="studioBudget" name="budget">${['Under ₹75,000','₹75,000 – ₹1.5L','₹1.5L – ₹3L','₹3L – ₹6L','₹6L+','Just exploring'].map(x=>`<option ${budget===x?'selected':''}>${x}</option>`).join('')}</select></div>
       <div class="studio-field"><label>Design direction</label><div class="studio-style-list">${Object.entries(styleMap).map(([name,key])=>`<button class="studio-style-chip ${state.style===name?'active':''}" type="button" data-studio-style="${esc(name)}" data-key="${key}"><i style="background:linear-gradient(135deg,${palettes[key].wall} 0 42%,${palettes[key].sofa} 42% 70%,${palettes[key].wood} 70%)"></i>${esc(name)}</button>`).join('')}</div><input type="hidden" name="style" id="studioStyle" value="${esc(state.style)}"/><input type="hidden" name="styleKey" id="studioStyleKey" value="${esc(state.styleKey)}"/></div>
       <div class="studio-field"><label for="studioPhoto">Room photo (optional)</label><div class="studio-upload"><span>Upload a JPG, PNG or WEBP</span><small>Maximum 8 MB. Your room image is sent to the configured AI provider for editing.</small><input id="studioPhoto" type="file" name="roomPhoto" accept="image/png,image/jpeg,image/webp"/></div><div id="studioPhotoPreview" class="mobile-note"></div></div>
       <div class="studio-field"><label for="studioKeep">What should stay?</label><textarea id="studioKeep" name="keepItems" maxlength="600" placeholder="Keep the existing flooring, window positions, sofa…"></textarea></div>
       ${state.token ? '<button class="btn btn-primary" type="submit" id="generateDesignBtn">Generate room concept ✦</button>' : `<div class="route-status">Sign in to generate a room concept and save it to your account. ${link('account?mode=register','Create an account','text-button')}</div><button class="btn btn-primary" type="submit">Continue to AI design ✦</button>`}
       <p class="mobile-note">This creates a visual concept, not a construction drawing. Always verify measurements, feasibility and costs.</p>
      </form></aside>
      <div class="studio-main"><div class="studio-stage-card"><div class="studio-stage-head"><div><strong id="studioStageTitle">Your design canvas</strong><small id="studioStageSub">A visual reference for your selected direction</small></div><div class="studio-view-tabs"><button class="active" type="button" data-view-mode="preview">Preview</button><button type="button" data-view-mode="moodboard">Moodboard</button></div></div><div class="studio-stage" id="studioStage">${svgScene(state.styleKey,true)}<span class="studio-stage-label">STYLE PREVIEW</span></div><div class="studio-stage-foot"><p id="studioStageNote">Concept illustration · not an exact model of your room</p><div class="route-actions"><a href="#/templates" class="btn btn-plain btn-small">Use a template</a><button type="button" class="btn btn-plain btn-small" id="studioResetBtn">Reset brief</button></div></div></div><div id="studioOutput"></div></div></div>`;
    routeView.innerHTML = layout('Your creative workspace', 'Make the room work for real life.', 'Keep your brief, style direction, dimensions and budget together. Move from an idea to a visual concept without losing context.', link('projects','View projects','btn btn-plain'), inner);
    document.querySelectorAll('[data-studio-style]').forEach(b=>b.addEventListener('click',()=>{state.style=b.dataset.studioStyle;state.styleKey=b.dataset.key;document.getElementById('studioStyle').value=state.style;document.getElementById('studioStyleKey').value=state.styleKey;document.querySelectorAll('[data-studio-style]').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('studioStage').innerHTML=svgScene(state.styleKey,true)+'<span class="studio-stage-label">STYLE PREVIEW</span>';document.getElementById('studioStageTitle').textContent=state.style;document.getElementById('studioStageSub').textContent=styleDesc[state.styleKey];}));
    document.querySelectorAll('[data-view-mode]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view-mode]').forEach(x=>x.classList.toggle('active',x===b));toast(b.dataset.viewMode==='moodboard'?'Moodboard view focuses on palette and style references.':'Preview view shows the room concept.'); if(b.dataset.viewMode==='moodboard'){document.getElementById('studioStage').innerHTML=`<div style="padding:22px;display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--surface-2);border-radius:12px;min-height:315px"><div>${svgScene(state.styleKey,true)}</div><div style="display:grid;gap:9px;align-content:center"><div style="height:35px;border-radius:8px;background:${palettes[state.styleKey].wall}"></div><div style="height:35px;border-radius:8px;background:${palettes[state.styleKey].sofa}"></div><div style="height:35px;border-radius:8px;background:${palettes[state.styleKey].wood}"></div><div style="height:35px;border-radius:8px;background:${palettes[state.styleKey].accent}"></div><small style="color:var(--muted)">${esc(styleDesc[state.styleKey])}</small></div></div>`;}else{document.getElementById('studioStage').innerHTML=svgScene(state.styleKey,true)+'<span class="studio-stage-label">STYLE PREVIEW</span>';}}));
    document.getElementById('studioPhoto').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(f.type)){toast('Use a JPG, PNG or WEBP image up to 8 MB.');e.target.value='';return;}document.getElementById('studioPhotoPreview').textContent=`Selected photo: ${f.name}`;});
    document.getElementById('studioResetBtn').addEventListener('click',()=>{state.currentBrief=null;state.currentDesign=null;renderStudio(routeInfo());toast('Studio brief reset.');});
    document.getElementById('studioForm').addEventListener('submit',generateDesign);
    if (state.currentBrief && state.currentDesign && !q.has('reset')) showDesignResult(state.currentBrief,state.currentDesign);
    const pending = localStorage.getItem('looma.pendingBrief');
    if (pending) { try { const b=JSON.parse(pending); localStorage.removeItem('looma.pendingBrief'); ['name','roomType','width','length','budget','keepItems'].forEach(k=>{const el=document.querySelector(`#studioForm [name="${k}"]`);if(el&&b[k]!==undefined)el.value=b[k];}); if(b.style&&styleMap[b.style]){state.style=b.style;state.styleKey=styleMap[b.style];document.getElementById('studioStyle').value=state.style;document.getElementById('studioStyleKey').value=state.styleKey;document.querySelectorAll('[data-studio-style]').forEach(el=>el.classList.toggle('active',el.dataset.studioStyle===state.style));document.getElementById('studioStage').innerHTML=svgScene(state.styleKey,true)+'<span class="studio-stage-label">STYLE PREVIEW</span>';}} catch {} }
  }
  async function generateDesign(event) {
    event.preventDefault();
    const form=document.getElementById('studioForm');
    const brief={name:form.elements.name.value.trim()||'My room idea',roomType:form.elements.roomType.value,width:Number(form.elements.width.value),length:Number(form.elements.length.value),budget:form.elements.budget.value,style:form.elements.style.value,styleKey:form.elements.styleKey.value,keepItems:form.elements.keepItems.value.trim()};
    if(!Number.isFinite(brief.width)||!Number.isFinite(brief.length)||brief.width<1||brief.length<1||brief.width>100||brief.length>100){toast('Room dimensions must be between 1 and 100 metres.');return;}
    const file=form.elements.roomPhoto.files?.[0];
    if(file&&(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))){toast('Use a JPG, PNG or WEBP image up to 8 MB.');return;}
    if(!state.token){localStorage.setItem('looma.pendingBrief',JSON.stringify(brief));localStorage.setItem('looma.returnAfterAuth','#/studio');navigate('account?mode=register');return;}
    state.currentBrief=brief;state.currentDesign=null;
    const btn=document.getElementById('generateDesignBtn');if(btn){btn.disabled=true;btn.textContent='Generating…';}
    const stage=document.getElementById('studioStage');stage.innerHTML='<div class="loader"><div class="loader-orb"></div><h3>Making space for a new idea…</h3><p>AI generation can take a little while. Keep this page open until it finishes.</p></div>';
    document.getElementById('studioStageTitle').textContent='Generation in progress';document.getElementById('studioStageSub').textContent='Connecting to your configured image model';document.getElementById('studioOutput').innerHTML='<div class="route-status" style="margin-top:14px">Your room photo, if supplied, is sent to the configured image provider for redesign. Each generation may incur API charges.</div>';
    try{
      const data=new FormData();Object.entries(brief).forEach(([k,v])=>data.append(k,String(v)));if(file)data.append('roomPhoto',file,file.name);
      const result=await api('/ai/redesign',{method:'POST',body:data});state.currentDesign=result;state.currentProjectId=null;showDesignResult(brief,result);toast('Your AI concept is ready.');
    }catch(error){document.getElementById('studioStage').innerHTML=svgScene(brief.styleKey,true)+'<span class="studio-stage-label">STYLE PREVIEW</span>';document.getElementById('studioStageTitle').textContent='Could not generate this concept';document.getElementById('studioStageSub').textContent='Your brief is still available to edit or retry';document.getElementById('studioOutput').innerHTML=`<div class="route-status" style="margin-top:14px;color:var(--ink)"><strong>Generation did not finish</strong><p>${esc(error.message)}</p><p>Check your sign-in, server OPENAI_API_KEY configuration, account quota and model access.</p><button class="btn btn-primary btn-small" id="retryDesign">Try again</button></div>`;document.getElementById('retryDesign').addEventListener('click',()=>document.getElementById('studioForm').requestSubmit());}
    finally{const b=document.getElementById('generateDesignBtn');if(b){b.disabled=false;b.textContent='Generate room concept ✦';}}
  }
  function showDesignResult(brief, design) {
    const stage=document.getElementById('studioStage');if(!stage)return;
    const imagePath=design.imagePath||design.image_path;
    stage.innerHTML=imagePath?`<img id="studioGeneratedImage" data-private-image="${esc(imagePath)}" alt="AI-generated ${esc(brief.roomType)} concept"/><span class="studio-stage-label">AI-GENERATED CONCEPT</span>`:svgScene(brief.styleKey||'warm',true)+'<span class="studio-stage-label">STYLE PREVIEW</span>';
    document.getElementById('studioStageTitle').textContent=brief.name;document.getElementById('studioStageSub').textContent=`${brief.roomType} · ${brief.width} × ${brief.length} m · ${brief.style}`;document.getElementById('studioStageNote').textContent='AI concept only · validate dimensions and feasibility before implementation';
    document.getElementById('studioOutput').innerHTML=`<div class="studio-results"><div class="route-panel"><div class="route-kicker">Room summary</div><h3>${(Number(brief.width)*Number(brief.length)).toFixed(1)} m²</h3><p>Approximate area from the dimensions you entered.</p></div><div class="route-panel"><div class="route-kicker">Budget preference</div><h3>${esc(brief.budget)}</h3><p>This is your selected planning band, not a quote.</p></div><div class="route-panel"><div class="route-kicker">Design direction</div><h3>${esc(brief.style)}</h3><p>${esc(styleDesc[brief.styleKey]||'Your chosen design direction')}</p></div></div><div class="route-actions" style="margin-top:14px"><button class="btn btn-primary" id="saveStudioProject">Save to projects</button><button class="btn btn-plain" id="exportStudioBrief">Export brief</button><button class="btn btn-plain" id="compareStudioReference">Compare reference</button><button class="btn btn-plain" id="newStudioConcept">New concept</button></div><div id="studioCompare" class="compare-panel" style="margin-top:14px"><div class="compare-col"><h4>Generated design</h4><div id="studioCompareImage" class="scene-compare"></div><p>Image returned by the configured AI image service.</p></div><div class="compare-col"><h4>Style reference</h4><div class="scene-compare">${svgScene(brief.styleKey||'warm',true)}</div><p>Illustration for comparison; not another AI result.</p></div></div><p class="mobile-note" style="margin-top:13px">${esc(design.disclaimer||'AI-generated visual concept. Verify all dimensions, feasibility, local codes and prices with qualified professionals.')}</p>`;
    loadPrivateImages(routeView);
    document.getElementById('saveStudioProject').addEventListener('click',saveStudioProject);
    document.getElementById('exportStudioBrief').addEventListener('click',exportCurrentBrief);
    document.getElementById('compareStudioReference').addEventListener('click',()=>{const p=document.getElementById('studioCompare');p.classList.toggle('show');document.getElementById('compareStudioReference').textContent=p.classList.contains('show')?'Hide comparison':'Compare reference';if(p.classList.contains('show'))document.getElementById('studioCompareImage').innerHTML=imagePath?`<img data-private-image="${esc(imagePath)}" alt="Generated concept comparison" style="width:100%;height:100%;object-fit:cover"/>`:svgScene(brief.styleKey,true);loadPrivateImages(p);});
    document.getElementById('newStudioConcept').addEventListener('click',()=>{state.currentDesign=null;state.currentProjectId=null;document.getElementById('studioOutput').innerHTML='';document.getElementById('studioStage').innerHTML=svgScene(brief.styleKey,true)+'<span class="studio-stage-label">STYLE PREVIEW</span>';document.getElementById('studioStageTitle').textContent='Your design canvas';document.getElementById('studioStageSub').textContent='Update your brief and generate a new concept';toast('Brief preserved. Make changes and generate again.');});
  }
  async function saveStudioProject(){
    if(!state.token){localStorage.setItem('looma.returnAfterAuth','#/studio');navigate('account?mode=login');return;}
    if(!state.currentBrief||!state.currentDesign?.imagePath){toast('Generate a design before saving.');return;}
    const btn=document.getElementById('saveStudioProject');btn.disabled=true;btn.textContent='Saving…';
    try{const b=state.currentBrief,d=state.currentDesign;const result=await api('/projects',{method:'POST',body:JSON.stringify({name:b.name,roomType:b.roomType,width:b.width,length:b.length,budget:b.budget,style:b.style,styleKey:b.styleKey,keepItems:b.keepItems,imagePath:d.imagePath,photoPath:null,brief:{...b,model:d.model||''}})});state.projects.unshift(result.project);state.currentProjectId=result.project.id;setSavedCount();toast('Project saved to your library.');navigate(`projects/${encodeURIComponent(result.project.id)}`);}catch(e){toast(e.message);btn.disabled=false;btn.textContent='Save to projects';}
  }
  function exportCurrentBrief(){if(!state.currentBrief)return;const b=state.currentBrief,d=state.currentDesign||{};const text=`LOOMA INTERIOR DESIGN BRIEF\n\nProject: ${b.name}\nRoom: ${b.roomType}\nDimensions: ${b.width} × ${b.length} m (approx.)\nArea: ${(b.width*b.length).toFixed(1)} m²\nBudget band: ${b.budget}\nStyle direction: ${b.style}\nMust keep: ${b.keepItems||'Not specified'}\nModel: ${d.model||'Not available'}\n\nNote: This visual concept is not a construction drawing. Verify measurements, feasibility, regulations and prices with qualified local professionals.\n`;const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(b.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'looma-design')+'-brief.txt';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('Design brief exported.');}

  async function renderProjects() {
    if(!state.token){routeView.innerHTML=layout('Your design library','All your room ideas, in one place.','Sign in to save AI concepts, revisit your brief and open a project when you are ready to continue.',link('account?mode=login','Sign in','btn btn-primary'),`<div class="route-empty"><h3>Your projects live here.</h3><p>After you generate and save a room concept, it will appear in this library with its own detail page.</p>${link('studio','Create your first concept')}</div><div class="route-section route-panel"><h3>Start with a reference</h3><p>Try one of the public demo project briefs to get a feel for the workflow.</p><div class="route-actions">${link('projects/sample-sunday-living-room','Sunday living room','btn btn-plain')}${link('projects/sample-quiet-bedroom','Quiet bedroom','btn btn-plain')}</div></div>`);return;}
    const result=await api('/projects');state.projects=result.projects||[];setSavedCount();
    const cards=state.projects.map(p=>`<article class="route-card"><a href="#/projects/${encodeURIComponent(p.id)}"><div class="route-card-visual">${p.imagePath?`<img data-private-image="${esc(p.imagePath)}" alt="Saved ${esc(p.name)}"/>`:svgScene(p.styleKey,true)}${p.favorite?'<span class="draft-tag">FAVOURITE</span>':'<span class="draft-tag">SAVED PROJECT</span>'}</div></a><div class="route-card-body"><h3>${esc(p.name)}</h3><p>${esc(p.roomType)} · ${esc(p.style)} · Updated ${esc(new Date(p.updatedAt||p.createdAt).toLocaleDateString())}</p><div class="route-card-foot"><small>${(Number(p.width)*Number(p.length)).toFixed(1)} m² approx.</small><a class="text-button" href="#/projects/${encodeURIComponent(p.id)}">Open project ↗</a></div></div></article>`).join('');
    routeView.innerHTML=layout('Your design library','All your room ideas, in one place.','Continue a saved concept, revisit its brief, or open a new room project.',link('studio','+ New project'),`<div class="route-stats"><div class="route-stat"><small>Saved projects</small><strong>${state.projects.length}</strong><span>In your design library</span></div><div class="route-stat"><small>Room types</small><strong>${new Set(state.projects.map(p=>p.roomType)).size}</strong><span>Across saved designs</span></div><div class="route-stat"><small>Next action</small><strong>${state.projects.length?'Keep refining':'Start a concept'}</strong><span>${state.projects.length?'Open any project to compare or export':'A room photo is optional'}</span></div></div><div class="route-toolbar"><input class="route-search" id="projectSearch" placeholder="Search your projects…" type="search"/><span class="mobile-note">Private to your account</span></div><div id="myProjectCards" class="route-cards">${cards||`<div class="route-empty" style="grid-column:1/-1"><h3>Your first saved project starts here.</h3><p>Generate a room concept and choose “Save to projects”.</p>${link('studio','Create a room concept')}</div>`}</div>`);
    loadPrivateImages(routeView);document.getElementById('projectSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#myProjectCards .route-card').forEach(card=>card.hidden=!card.dataset.search.includes(q));});
    document.querySelectorAll('#myProjectCards .route-card').forEach((el,i)=>el.dataset.search=(state.projects[i]?.name+' '+state.projects[i]?.roomType+' '+state.projects[i]?.style).toLowerCase());
  }

  const demoProjects = {
    'sample-sunday-living-room':{id:'sample-sunday-living-room',name:'Sunday living room',roomType:'Living room',width:4.5,length:4,budget:'₹1.5L – ₹3L',style:'Warm Modern',styleKey:'warm',keepItems:'Keep circulation clear around the seating area.',imagePath:null,brief:{model:'Illustrative demo concept'}},
    'sample-quiet-bedroom':{id:'sample-quiet-bedroom',name:'Quiet bedroom',roomType:'Bedroom',width:3.5,length:3.8,budget:'₹75,000 – ₹1.5L',style:'Japandi',styleKey:'japandi',keepItems:'Preserve a calm, uncluttered feel.',imagePath:null,brief:{model:'Illustrative demo concept'}}
  };
  async function renderProjectDetail(id){
    if(demoProjects[id]){renderProjectPage(demoProjects[id],true);return;}
    if(!state.token){localStorage.setItem('looma.returnAfterAuth',`#/projects/${encodeURIComponent(id)}`);routeView.innerHTML=layout('Private project','Sign in to open this project.','Saved concepts are visible only to the account that owns them.',link('account?mode=login','Sign in to continue'),`<div class="route-empty"><h3>Your project is private.</h3><p>Sign in to load the saved room brief and generated image.</p>${link('projects','Back to projects','btn btn-plain')}</div>`);return;}
    const result=await api(`/projects/${encodeURIComponent(id)}`);renderProjectPage(result.project,false);
  }
  function renderProjectPage(p,isDemo){
    const visual=p.imagePath?`<img data-private-image="${esc(p.imagePath)}" alt="${esc(p.name)} interior design" style="width:100%;height:100%;min-height:290px;object-fit:cover"/>`:svgScene(p.styleKey||'warm',true);
    const actions=`${link(`studio?style=${encodeURIComponent(p.style||'Warm Modern')}&roomType=${encodeURIComponent(p.roomType||'Living room')}&width=${p.width||4.5}&length=${p.length||4}&budget=${encodeURIComponent(p.budget||'Just exploring')}`,'Redesign this room')}${link('projects','All projects','btn btn-plain')}`;
    const body=`<div class="detail-banner"><div class="detail-banner-visual">${visual}</div><div class="detail-banner-copy"><div class="route-kicker">${isDemo?'Public example · demo project':'Your private project'}</div><h2>${esc(p.name)}</h2><p>${esc(p.brief?.description||'A saved interior direction with its room brief and planning assumptions together. Use the details as a starting point, then adjust the room to fit your needs.')}</p><div class="detail-facts"><div class="detail-fact"><small>Room type</small><strong>${esc(p.roomType)}</strong></div><div class="detail-fact"><small>Style</small><strong>${esc(p.style)}</strong></div><div class="detail-fact"><small>Approx. area</small><strong>${(Number(p.width)*Number(p.length)).toFixed(1)} m²</strong></div><div class="detail-fact"><small>Budget band</small><strong>${esc(p.budget)}</strong></div></div><div class="route-actions">${actions}</div>${!isDemo?`<div class="route-actions" style="margin-top:10px"><button class="btn btn-plain btn-small" id="favoriteProject">${p.favorite?'★ Remove favourite':'☆ Add favourite'}</button><button class="btn btn-plain btn-small" id="renameProject">Rename</button><button class="btn btn-plain btn-small" id="deleteProject">Delete project</button></div>`:''}</div></div><div class="route-two-col route-section"><section class="route-panel"><h3>Room brief</h3><div class="route-list"><div class="route-list-row"><span class="route-list-icon">⌂</span><div><strong>Dimensions</strong><p>${p.width} m × ${p.length} m. Approximate total area: ${(Number(p.width)*Number(p.length)).toFixed(1)} m².</p></div></div><div class="route-list-row"><span class="route-list-icon">✦</span><div><strong>Style direction</strong><p>${esc(styleDesc[p.styleKey]||'A selected interior direction')}.</p></div></div><div class="route-list-row"><span class="route-list-icon">✓</span><div><strong>Items and constraints to preserve</strong><p>${esc(p.keepItems||'No must-keep items were added to this brief.')}</p></div></div></div></section><section class="route-panel"><h3>Next steps</h3><p>Use this saved concept as a conversation starter, not a construction specification.</p><div class="route-list"><div class="route-list-row"><span class="route-list-icon">01</span><div><strong>Confirm measurements</strong><p>Check actual wall lengths, door swings, window positions and clearances.</p></div></div><div class="route-list-row"><span class="route-list-icon">02</span><div><strong>Validate the budget</strong><p>Confirm local product, labour, delivery and installation costs.</p></div></div><div class="route-list-row"><span class="route-list-icon">03</span><div><strong>Try another direction</strong><p>Take the room brief to the Studio to create a fresh alternative.</p></div></div></div><div class="route-actions">${link('studio','Open studio','btn btn-primary')}${link('support','Ask for help','btn btn-plain')}</div></section></div>`;
    routeView.innerHTML=layout('Project details',esc(p.name),'A dedicated page for your chosen room, with its visual concept, assumptions and useful next actions.',link('projects','Back to projects','btn btn-plain'),body);loadPrivateImages(routeView);
    if(!isDemo){document.getElementById('favoriteProject').addEventListener('click',async()=>{try{const r=await api(`/projects/${encodeURIComponent(p.id)}`,{method:'PATCH',body:JSON.stringify({favorite:!p.favorite})});toast(r.project.favorite?'Added to favourites.':'Removed from favourites.');renderProjectDetail(p.id);}catch(e){toast(e.message);}});document.getElementById('renameProject').addEventListener('click',async()=>{const name=prompt('Choose a new project name',p.name);if(!name||!name.trim())return;try{await api(`/projects/${encodeURIComponent(p.id)}`,{method:'PATCH',body:JSON.stringify({name:name.trim()})});toast('Project renamed.');renderProjectDetail(p.id);}catch(e){toast(e.message);}});document.getElementById('deleteProject').addEventListener('click',async()=>{if(!confirm(`Delete “${p.name}” from your projects? This cannot be undone.`))return;try{await api(`/projects/${encodeURIComponent(p.id)}`,{method:'DELETE'});state.projects=state.projects.filter(x=>x.id!==p.id);setSavedCount();toast('Project deleted.');navigate('projects');}catch(e){toast(e.message);}});}
  }

  function renderCommunity(){
    const challenges=[{id:'slow-living',name:'Slow living corner',desc:'Create a small corner for reading, tea or a quiet reset.',key:'japandi',tag:'7-day prompt'},{id:'small-space',name:'Make a small room work',desc:'Share one thoughtful space-saving idea for an everyday room.',key:'minimal',tag:'Community prompt'},{id:'warm-welcome',name:'A warmer welcome',desc:'Explore earth tones, tactility and light for an inviting entrance.',key:'warm',tag:'Design prompt'}];
    const body=`<div class="route-cards">${challenges.map(c=>`<article class="route-card"><div class="route-card-visual">${svgScene(c.key,true)}<span class="draft-tag">${c.tag}</span></div><div class="route-card-body"><h3>${c.name}</h3><p>${c.desc}</p><div class="route-card-foot"><small>Join at your pace</small><button class="text-button" data-join-challenge="${c.id}">${state.communityJoined.includes(c.id)?'✓ Joined':'Join prompt ↗'}</button></div></div></article>`).join('')}</div><div class="route-two-col route-section"><section class="route-panel"><div class="route-kicker">Share your progress</div><h3>Inspiration grows when it is shared.</h3><p>Save a concept to your project library, then decide which details you want to share with a friend or designer.</p><div class="route-actions">${link('projects','Open my projects')}${link('studio','Create a design','btn btn-plain')}</div></section><section class="route-panel"><div class="route-kicker">Community guidelines</div><h3>Helpful, kind and practical.</h3><p>Keep feedback respectful. Avoid sharing addresses or private information. Treat every concept as inspiration and confirm real-world dimensions, safety and costs before building.</p></section></div>`;
    routeView.innerHTML=layout('The Looma community','Good ideas feel even better when shared.','Browse design prompts, find a starting point and keep a little inspiration for your own home.',link('explore','Explore styles','btn btn-plain'),body);
    document.querySelectorAll('[data-join-challenge]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.joinChallenge;if(state.communityJoined.includes(id))state.communityJoined=state.communityJoined.filter(x=>x!==id);else state.communityJoined.push(id);localStorage.setItem('looma.community.joined',JSON.stringify(state.communityJoined));b.textContent=state.communityJoined.includes(id)?'✓ Joined':'Join prompt ↗';toast(state.communityJoined.includes(id)?'Prompt added to your local community list.':'Prompt removed from your list.');}));
  }
  function renderPricing(){
    const plans=[{name:'Free',price:'₹0',period:'forever',desc:'For trying out your first room concepts.',points:['Room brief and style exploration','Save generated concepts to projects','Export a design brief'],cta:'Start free',href:'studio',featured:false},{name:'Studio',price:'₹799',period:'/ month · illustrative',desc:'For regular home design projects and deeper iteration.',points:['Everything in Free','Larger design workflow allowance','Advanced export options (planned)'],cta:'Ask about Studio',href:'support?subject=Studio%20plan',featured:true},{name:'Professional',price:'Let’s talk',period:'team options',desc:'For designers and teams who need a repeatable client workflow.',points:['Team collaboration (planned)','Professional project reviews (planned)','Custom workflow discussion'],cta:'Contact us',href:'support?subject=Professional%20plan',featured:false}];
    const body=`<div class="route-status" style="margin-bottom:17px">Pricing shown here is a product-design placeholder and is not a live checkout. Paid subscriptions are not enabled in this code package.</div><div class="plan-grid">${plans.map(p=>`<article class="plan-card ${p.featured?'featured':''}">${p.featured?'<span class="tiny-badge" style="align-self:start;margin-bottom:12px">PLANNED PLAN</span>':''}<h3>${p.name}</h3><p>${p.desc}</p><div class="plan-price">${p.price}<small> ${p.period}</small></div><div class="plan-points">${p.points.map(x=>`<span>${x}</span>`).join('')}</div>${link(p.href,p.cta,p.featured?'btn btn-primary':'btn btn-plain')}</article>`).join('')}</div><div class="route-section route-panel"><h3>What happens next?</h3><p>Start with the free workflow. Before a real paid launch, connect a payment provider, define plan limits, add cancellation/refund rules, and publish pricing and privacy terms.</p>${link('support','Discuss a plan','btn btn-plain')}</div>`;
    routeView.innerHTML=layout('Simple, transparent plans','Start free. Upgrade only when you need more.', 'Explore the intended plans and understand what is ready today versus what still needs a billing integration.',link('studio','Try Looma free'),body);
  }
  function renderAccount(route=routeInfo()){
    if(state.user){routeView.innerHTML=layout('Your account','Welcome back to Looma.','Manage your account session and jump straight into your private project library.',link('projects','Open my projects'),`<div class="route-two-col"><section class="route-panel"><div class="route-kicker">Signed in</div><h3>${esc(state.user.email||'Looma member')}</h3><p>Your projects and generated images are stored on the configured Looma server and are private to your account.</p><div class="settings-row"><div><strong>Email</strong><p>${esc(state.user.email||'')}</p></div><span class="tiny-badge">ACCOUNT</span></div><div class="settings-row"><div><strong>Session</strong><p>Use sign out on shared devices.</p></div><button class="btn btn-plain btn-small" id="signOutBtn">Sign out</button></div></section><section class="route-panel"><h3>Your workspace</h3><p>Continue a saved project or start a new design.</p><div class="route-actions">${link('projects','View saved projects')}${link('studio','Start a room concept','btn btn-plain')}</div></section></div>`);document.getElementById('signOutBtn').addEventListener('click',()=>clearAuth(true));return;}
    const mode=route.query.get('mode')==='register'?'register':'login';const reg=mode==='register';
    const body=`<div class="route-two-col"><section class="route-panel"><div class="route-kicker">Private project space</div><h3>${reg?'Create your account.':'Welcome back.'}</h3><p>${reg?'Save AI redesigns, organise room ideas and return to your project library.':'Sign in to reopen saved designs and continue your room brief.'}</p><form id="accountForm" class="route-form"><label>Email address<input id="accountEmail" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"/></label><label>Password<input id="accountPassword" type="password" autocomplete="${reg?'new-password':'current-password'}" required minlength="${reg?'10':'1'}" maxlength="128" placeholder="${reg?'At least 10 characters':'Your password'}"/></label><p class="mobile-note">${reg?'Use at least 10 characters.':'Your session is signed with a server-side token.'}</p><div id="accountError" class="status" role="status"></div><button class="btn btn-primary" type="submit">${reg?'Create account':'Sign in'} ↗</button></form><p class="mobile-note" style="margin-top:15px">${reg?'Already have an account?':'New to Looma?'} <a href="#/account?mode=${reg?'login':'register'}" style="color:var(--green);font-weight:750">${reg?'Sign in':'Create an account'}</a></p></section><section class="route-panel"><h3>Your work stays together.</h3><div class="route-list"><div class="route-list-row"><span class="route-list-icon">⌂</span><div><strong>Saved rooms</strong><p>View one dedicated detail page per saved project.</p></div></div><div class="route-list-row"><span class="route-list-icon">✦</span><div><strong>AI room redesign</strong><p>Generate visual room ideas using the API key configured on your server.</p></div></div><div class="route-list-row"><span class="route-list-icon">↗</span><div><strong>Exportable brief</strong><p>Keep dimensions and budget assumptions close to the concept.</p></div></div></div></section></div>`;
    routeView.innerHTML=layout('Your Looma account',reg?'A room to call your own.':'Pick up where you left off.',reg?'Create an account to save designs and keep your projects private.':'Sign in to open your saved concepts and continue designing.',link('support','Account help','btn btn-plain'),body);
    document.getElementById('accountForm').addEventListener('submit',async e=>{e.preventDefault();const err=document.getElementById('accountError'),btn=e.submitter;btn.disabled=true;btn.textContent=reg?'Creating…':'Signing in…';err.textContent='';try{const result=await api(`/auth/${reg?'register':'login'}`,{method:'POST',body:JSON.stringify({email:document.getElementById('accountEmail').value.trim(),password:document.getElementById('accountPassword').value})});state.token=result.token;state.user=result.user;localStorage.setItem(tokenKey,state.token);localStorage.setItem(userKey,JSON.stringify(state.user));const returnTo=localStorage.getItem('looma.returnAfterAuth');localStorage.removeItem('looma.returnAfterAuth');toast(reg?'Account created. Welcome to Looma.':'You are signed in.');if(returnTo&&returnTo.startsWith('#/'))location.hash=returnTo;else if(localStorage.getItem('looma.pendingBrief'))navigate('studio');else navigate('projects');}catch(error){err.textContent=error.message;}finally{btn.disabled=false;btn.textContent=reg?'Create account ↗':'Sign in ↗';}});
  }
  const faqData=[['How accurate are AI room concepts?','They are visual ideas, not measured CAD models. Verify actual room dimensions, clearances, structural changes, building rules and costs before carrying out work.'],['Is my room photo stored?','The Looma server processes the uploaded source photo in memory and sends it to the configured image provider for editing. The source image is not retained by this server. Generated images are stored on server disk and served privately to their owner. Review the image provider’s current data terms before public launch.'],['Why did generation fail?','Check that OPENAI_API_KEY is set on the server, your account has model access and available quota, and that the backend logs do not show an upstream error.'],['Can I build a precise floorplan here?','This starter is an AI visual-design website. A precise editable 2D/3D CAD canvas, BIM import/export and construction-ready dimensions are not implemented yet.'],['Can I purchase a paid plan?','The page shows intended plan concepts only. Billing is not connected in this code package, and no payment is taken.']];
  function renderSupport(route=routeInfo()){
    const subject=route.query.get('subject')||'';
    const body=`<div class="route-two-col"><section class="route-panel"><div class="route-kicker">Talk to us</div><h3>How can we help?</h3><p>Send a message about your project, account, deployment or product feedback. This form stores an inquiry on the server; configure access and retention before public use.</p><form id="supportForm" class="route-form"><label>Your email<input id="supportEmail" type="email" maxlength="254" required value="${esc(state.user?.email||'')}" placeholder="you@example.com"/></label><label>Topic<select id="supportTopic"><option ${subject.toLowerCase().includes('plan')?'selected':''}>Plans and pricing</option><option>Account and sign-in</option><option>AI generation</option><option>Deployment help</option><option>Product feedback</option><option>Other</option></select></label><label>Subject<input id="supportSubject" maxlength="120" required value="${esc(subject)}" placeholder="Tell us what you need help with"/></label><label>Message<textarea id="supportMessage" maxlength="3000" required placeholder="Share the details that will help us understand your question…"></textarea></label><div id="supportStatus" class="status" role="status"></div><button class="btn btn-primary" type="submit">Send support request ↗</button></form></section><section class="route-panel"><div class="route-kicker">Help centre</div><h3>Common questions</h3><p>Answers to the most common design and account questions.</p><div class="route-faq">${faqData.map((f,i)=>`<div class="faq-item"><button type="button" data-faq="${i}">${esc(f[0])}<span>＋</span></button><div class="faq-answer">${esc(f[1])}</div></div>`).join('')}</div></section></div>`;
    routeView.innerHTML=layout('Help and support','A little help goes a long way.','Find answers or send the Looma team a message. The guidance here distinguishes live features from planned integrations.',link('studio','Back to studio','btn btn-plain'),body);
    document.querySelectorAll('[data-faq]').forEach(b=>b.addEventListener('click',()=>{const item=b.closest('.faq-item');item.classList.toggle('open');b.querySelector('span').textContent=item.classList.contains('open')?'−':'＋';}));
    document.getElementById('supportForm').addEventListener('submit',async e=>{e.preventDefault();const status=document.getElementById('supportStatus'),btn=e.submitter;btn.disabled=true;btn.textContent='Sending…';status.textContent='';try{const r=await api('/support',{method:'POST',body:JSON.stringify({email:document.getElementById('supportEmail').value.trim(),topic:document.getElementById('supportTopic').value,subject:document.getElementById('supportSubject').value.trim(),message:document.getElementById('supportMessage').value.trim()})});status.textContent=`Thanks — support request ${r.ticketId} was received.`;document.getElementById('supportMessage').value='';toast('Support request sent.');}catch(err){status.textContent=err.message;}finally{btn.disabled=false;btn.textContent='Send support request ↗';}});
  }
  function loadPrivateImages(container){
    if(!state.token||!container)return;
    container.querySelectorAll('img[data-private-image]').forEach(async img=>{const path=img.dataset.privateImage;if(!path||img.dataset.loaded==='yes')return;try{const response=await fetch(path,{headers:{Authorization:`Bearer ${state.token}`}});if(!response.ok)throw new Error('Image unavailable');const url=URL.createObjectURL(await response.blob());state.privateUrls.push(url);img.src=url;img.dataset.loaded='yes';}catch{img.alt=`${img.alt||'Saved image'} unavailable`;}});
  }
  function cleanupPrivateUrls(){state.privateUrls.forEach(URL.revokeObjectURL);state.privateUrls=[];}
  function setSavedCount(){const el=document.getElementById('savedCount');if(el)el.textContent=state.token?String(state.projects.length):'0';}
  function clearAuth(showMessage=true){state.token='';state.user=null;state.projects=[];localStorage.removeItem(tokenKey);localStorage.removeItem(userKey);if(showMessage)toast('You have signed out.');setHeader(routeInfo());navigate('account?mode=login');}

  // Homepage cards with sample project names open distinct sample-detail routes.
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#/"]');if(!a)return;
    const href=a.getAttribute('href');if(href&&href.includes('/studio?')){
      const q=new URLSearchParams(href.split('?')[1]||'');const style=q.get('style');if(style){state.style=styleMap[style]?style:(styleNames[style]?style:state.style);state.styleKey=styleMap[state.style]||state.styleKey;}
    }
  });
  window.addEventListener('hashchange',render);
  window.addEventListener('storage',e=>{if(e.key===tokenKey){state.token=e.newValue||'';render();}});

  async function boot(){
    document.querySelectorAll('a[href="#/studio"]').forEach(a=>a.addEventListener('click',()=>{state.currentDesign=null;state.currentProjectId=null;}));
    if(state.token){try{const r=await api('/auth/me');state.user=r.user;localStorage.setItem(userKey,JSON.stringify(state.user));const p=await api('/projects');state.projects=p.projects||[];}catch{state.token='';state.user=null;localStorage.removeItem(tokenKey);localStorage.removeItem(userKey);}}
    setSavedCount();render();
  }
  boot();
})();
