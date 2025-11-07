(function(){
  let map, resultsMap, posterMarker, placing=false;
  let markersLayer = L.layerGroup();
  let resultsLayer = L.layerGroup();
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');
  modalClose.addEventListener('click', ()=> closeModal());
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  function openModal(node){
    modalBody.innerHTML = '';
    modalBody.appendChild(node);
    modal.classList.remove('hidden');
  }
  function closeModal(){
    modal.classList.add('hidden');
    modalBody.innerHTML = '';
  }

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    // role toggle
    document.querySelectorAll('input[name=role]').forEach(r => {
      r.addEventListener('change', () => setRole(r.value));
    });
    setRole(document.querySelector('input[name=role]:checked').value);

    // maps
    map = L.map('map').setView([37.266, -76.62], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    markersLayer.addTo(map);

    resultsMap = L.map('resultsMap').setView([37.266, -76.62], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(resultsMap);
    resultsLayer.addTo(resultsMap);

    // Poster placing
    document.getElementById('placePinBtn').addEventListener('click', () => {
      placing = !placing;
      document.getElementById('placePinBtn').classList.toggle('secondary', !placing);
    });
    map.on('click', onMapClickPlace);

    // Submit post
    document.getElementById('postForm').addEventListener('submit', onSubmitPost);

    // Owner manage
    document.getElementById('loadMyPostsBtn').addEventListener('click', loadMyPosts);

    // Search
    document.getElementById('searchForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      runSearch();
    });

    // initial ping (optional)
    Api.ping().catch(()=>{});
  }

  function setRole(role){
    document.getElementById('posterPanel').classList.toggle('hidden', role!=='poster');
    document.getElementById('searcherPanel').classList.toggle('hidden', role!=='searcher');
    setTimeout(()=>{
      map.invalidateSize();
      resultsMap.invalidateSize();
    }, 200);
  }

  function onMapClickPlace(e){
    if(!placing) return;
    const latlng = e.latlng;
    if(posterMarker){
      posterMarker.setLatLng(latlng);
    } else {
      posterMarker = L.marker(latlng, {draggable:true}).addTo(markersLayer);
      posterMarker.on('dragend', ()=>{
        const ll = posterMarker.getLatLng();
        setLatLngInputs(ll.lat, ll.lng);
      });
    }
    setLatLngInputs(latlng.lat, latlng.lng);
  }
  function setLatLngInputs(lat,lng){
    document.getElementById('postLat').value = lat.toFixed(6);
    document.getElementById('postLng').value = lng.toFixed(6);
  }

  async function onSubmitPost(e){
    e.preventDefault();
    const status = document.getElementById('postStatus');
    status.textContent = '';
    const payload = {
      title: document.getElementById('postTitle').value.trim(),
      desc:  document.getElementById('postDesc').value.trim(),
      tags:  document.getElementById('postTags').value.trim(),
      email: document.getElementById('postEmail').value.trim(),
      key:   document.getElementById('postKey').value.trim(),
      eval:  document.getElementById('postEval').value.trim(),
      lat:   document.getElementById('postLat').value,
      lng:   document.getElementById('postLng').value
    };
    if(!payload.lat || !payload.lng){
      status.textContent = 'Please place your pin on the map first.';
      return;
    }
    try{
      const res = await Api.createPost(payload);
      if(res.ok){
        status.textContent = `Saved! PostID: ${res.postId}`;
        status.style.color = '#22c55e';
        // reset minimal fields, keep email/key
        document.getElementById('postTitle').value='';
        document.getElementById('postDesc').value='';
        document.getElementById('postTags').value='';
        document.getElementById('postEval').value='';
      }else{
        status.textContent = res.error || 'Save failed';
        status.style.color = '#ef4444';
      }
    }catch(err){
      status.textContent = err.message;
      status.style.color = '#ef4444';
    }
  }

  async function loadMyPosts(){
    const email = document.getElementById('ownerEmail').value.trim();
    const key   = document.getElementById('ownerKey').value.trim();
    const container = document.getElementById('myPosts');
    container.innerHTML = '';
    if(!email || !key){
      container.textContent = 'Enter your email and access key.';
      return;
    }
    try{
      const res = await Api.listPostsByOwner({ email, key });
      if(!res.ok){ container.textContent = res.error || 'Failed to load.'; return; }
      const posts = res.posts || [];
      if(!posts.length){ container.textContent = 'No posts yet.'; return; }
      posts.forEach(p => container.appendChild(renderOwnerPost(p, email, key)));
    }catch(err){
      container.textContent = err.message;
    }
  }

  function renderOwnerPost(p, email, key){
    const tpl = document.getElementById('postItemTpl').content.cloneNode(true);
    tpl.querySelector('.title').textContent = p.title;
    tpl.querySelector('.pid').textContent = p.postId;
    tpl.querySelector('.desc').textContent = p.desc;
    tpl.querySelector('.eval').textContent = p.eval || '—';
    tpl.querySelector('.coords').textContent = `${(+p.lat).toFixed(5)}, ${(+p.lng).toFixed(5)}`;
    const tagsEl = tpl.querySelector('.tags');
    (p.tags || '').split(',').map(s=>s.trim()).filter(Boolean).forEach(t => {
      const span = document.createElement('span'); span.className='tag'; span.textContent = t; tagsEl.appendChild(span);
    });
    const responsesWrap = tpl.querySelector('.responses');
    // load responses lazily when details opens
    tpl.querySelector('details').addEventListener('toggle', async (e)=>{
      if(e.target.open && !responsesWrap.dataset.loaded){
        responsesWrap.textContent = 'Loading responses…';
        const res = await Api.listResponses({ postId: p.postId, email, key });
        if(!res.ok){ responsesWrap.textContent = res.error || 'Failed to load.'; return; }
        responsesWrap.innerHTML='';
        (res.responses||[]).forEach(r => responsesWrap.appendChild(renderResponseEvalForm(p.postId, r, email, key)));
        responsesWrap.dataset.loaded = '1';
      }
    });
    return tpl;
  }

  function renderResponseEvalForm(postId, r, email, key){
    const tpl = document.getElementById('responseItemTpl').content.cloneNode(true);
    tpl.querySelector('.name').textContent = r.name || '—';
    tpl.querySelector('.email').textContent = r.email || '—';
    tpl.querySelector('.message').textContent = r.message || '';
    const form = tpl.querySelector('.evalForm');
    form.rating.value = r.rating || '';
    form.status.value = r.status || '';
    form.notes.value  = r.notes  || '';
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload = {
        postId, responseId: r.responseId,
        email, key,
        rating: form.rating.value, status: form.status.value, notes: form.notes.value
      };
      const btn = form.querySelector('button'); const prev = btn.textContent; btn.textContent = 'Saving…'; btn.disabled = true;
      try{
        const res = await Api.evaluateResponse(payload);
        btn.textContent = res.ok ? 'Saved!' : 'Error';
        setTimeout(()=>{ btn.textContent = prev; btn.disabled=false; }, 800);
      }catch(err){
        btn.textContent = 'Error'; setTimeout(()=>{ btn.textContent = prev; btn.disabled=false; }, 800);
      }
    });
    return tpl;
  }

  async function runSearch(){
    const q = document.getElementById('q').value.trim();
    const tags = document.getElementById('tags').value.trim();
    const statusEl = document.getElementById('searchStatus');
    statusEl.textContent = 'Searching…';
    try{
      const res = await Api.listPosts({ q, tags });
      if(!res.ok){ statusEl.textContent = res.error || 'Search failed.'; return; }
      statusEl.textContent = `${(res.posts||[]).length} result(s)`;
      renderSearchResults(res.posts||[]);
    }catch(err){
      statusEl.textContent = err.message;
    }
  }
  // === Role-aware marker popup system ===
  function attachMarkerPopup(marker, data){
    const role = document.querySelector('input[name=role]:checked').value;
    const tplId = (role === 'poster') ? 'popupPosterTpl' : 'popupSearcherTpl';
    const tpl = document.getElementById(tplId).content.cloneNode(true);
    tpl.querySelector('.popup-title').textContent = data.title || 'Untitled Pin';
    const div = document.createElement('div');
    div.appendChild(tpl);

    // bind popup
    marker.bindPopup(div.innerHTML);

    // handle popupopen to wire events
    marker.on('popupopen', e=>{
      const popup = document.querySelector('.leaflet-popup');
      if(!popup) return;

      if(role==='poster'){
        popup.querySelector('.btnTarget').onclick = ()=> openTargetMarketModal(data, marker);
        popup.querySelector('.btnPost').onclick   = ()=> openPostModalForMarker(data);
        popup.querySelector('.btnEdit').onclick   = ()=> openEditPinModal(data, marker);
      }else{
        popup.querySelector('.btnPosts').onclick  = ()=> openPostsModal(data);
        popup.querySelector('.btnProfile').onclick= ()=> openProfileModal(data);
        popup.querySelector('.btnRefer').onclick  = ()=> openReferModal(data);
      }
    });
  }

  // --- Modal helpers ---
  function openModalById(id){ document.getElementById(id).classList.remove('hidden'); }
  function closeModalById(id){ document.getElementById(id).classList.add('hidden'); }
  document.querySelectorAll('.modal-close').forEach(btn=>{
    btn.addEventListener('click', ()=> closeModalById(btn.dataset.close));
  });

  // === Poster/Evaluator actions ===
  function openTargetMarketModal(data, marker){
    openModalById('modalTargetMarket');
    const tmMap = L.map('tmMapPreview').setView(marker.getLatLng(), 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(tmMap);
    const group = L.layerGroup().addTo(tmMap);

    const form = document.getElementById('targetForm');
    const summary = document.getElementById('tmSummary');
    const orderBtn = document.getElementById('btnOrderMailers');

    form.onsubmit = (ev)=>{
      ev.preventDefault();
      group.clearLayers();
      summary.innerHTML='';
      orderBtn.classList.add('hidden');
      const base = parseFloat(document.getElementById('tmBaseRadius').value);
      const rings = parseInt(document.getElementById('tmRingCount').value);
      const inc = parseFloat(document.getElementById('tmIncrement').value);
      const latlng = marker.getLatLng();
      let cur = base;
      const counts=[];
      for(let i=0;i<rings;i++){
        const c = L.circle(latlng,{radius:cur*1609.34,color:'#2F5597',fill:false}).addTo(group);
        counts.push({ring:i+1,radius:cur,targets:Math.floor(Math.random()*200)+50}); // placeholder data
        cur+=inc;
      }
      summary.innerHTML = counts.map(c=>`Ring ${c.ring}: ${c.radius.toFixed(1)}mi — ${c.targets} targets`).join('<br>');
      orderBtn.classList.remove('hidden');
    };
    orderBtn.onclick = ()=>{
      alert('Redirecting to Order Direct Mailers flow…');
      closeModalById('modalTargetMarket');
      // TODO: integrate proposal.html navigation with prefilled params
    };
  }

  function openPostModalForMarker(data){
    alert('Open Post creation modal for marker: '+data.title);
    // integrate with existing post creation form
  }

  function openEditPinModal(data, marker){
    openModalById('modalEditPin');
    document.getElementById('editPinTitle').value = data.title || '';
    document.getElementById('editPinIcon').value = data.icon || 'default';
    document.getElementById('editPinVisibility').value = data.visibility || 'public';
    document.getElementById('editPinForm').onsubmit = (e)=>{
      e.preventDefault();
      data.title = document.getElementById('editPinTitle').value;
      data.icon = document.getElementById('editPinIcon').value;
      data.visibility = document.getElementById('editPinVisibility').value;
      marker.bindTooltip(data.title);
      closeModalById('modalEditPin');
      // TODO: persist via Api.updatePin
    };
  }

  // === Searcher/Responder actions ===
  function openPostsModal(data){ alert('Show posts for marker: '+data.title); }
  function openProfileModal(data){ alert('Show profile for '+data.title); }
  function openReferModal(data){ alert('Show referral modal for '+data.title); }

  function renderSearchResults(posts){
    resultsLayer.clearLayers();
    const list = document.getElementById('resultsList');
    list.innerHTML = '';
    const bounds = [];
    posts.forEach(p => {
      const m = L.marker([+p.lat, +p.lng]).addTo(resultsLayer);
      m.bindPopup(`<b>${escapeHtml(p.title)}</b><br>${escapeHtml(p.desc)}<br><i>${escapeHtml(p.tags||'')}</i><br><br><button class="popupRespond" data-id="${p.postId}">Respond</button>`);
      m.on('popupopen', () => {
        const btn = document.querySelector('.leaflet-popup .popupRespond');
        if(btn){
          btn.addEventListener('click', () => openRespondModal(p));
        }
      });
      bounds.push([+p.lat, +p.lng]);

      // list card
      const card = document.createElement('div'); card.className='card';
      const tagsEl = document.createElement('div'); tagsEl.className='chips';
      (p.tags||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(t => {
        const span = document.createElement('span'); span.className='tag'; span.textContent = t; tagsEl.appendChild(span);
      });
      card.innerHTML = `<h3 style="margin:0 0 6px 0">${escapeHtml(p.title)}</h3>`;
      const desc = document.createElement('p'); desc.textContent = p.desc; card.appendChild(desc);
      card.appendChild(tagsEl);
      const act = document.createElement('div'); act.className='row';
      const btn = document.createElement('button'); btn.textContent='Respond'; btn.addEventListener('click', ()=> openRespondModal(p));
      act.appendChild(btn);
      card.appendChild(act);
      list.appendChild(card);
    });
    if(bounds.length){ resultsMap.fitBounds(bounds, { padding: [20,20] }); }
  }

  function openRespondModal(post){
    const tpl = document.getElementById('respondTpl').content.cloneNode(true);
    tpl.querySelector('.title').textContent = post.title;
    tpl.querySelector('.desc').textContent = post.desc;
    const form = tpl.querySelector('form');
    form.postId.value = post.postId;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const btns = form.querySelectorAll('button'); btns.forEach(b=>b.disabled=true);
      const status = form.querySelector('.status'); status.textContent='Sending…';
      const payload = {
        postId: post.postId,
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        message: form.message.value.trim()
      };
      try{
        const res = await Api.createResponse(payload);
        if(res.ok){ status.textContent='Sent!'; setTimeout(()=> closeModal(), 600); }
        else { status.textContent = res.error || 'Failed.'; btns.forEach(b=>b.disabled=false); }
      }catch(err){
        status.textContent = err.message; btns.forEach(b=>b.disabled=false);
      }
    });
    tpl.querySelector('.cancelRespond').addEventListener('click', ()=> closeModal());
    openModal(tpl);
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
})();
