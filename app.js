/* ================================
   app.js – Two-Sided Request Map
   Poster/Evaluator + Searcher/Responder
   ================================ */

// === Globals ===
let map, resultsMap;
let posterMarker = null;
let role = 'poster';
let allPosts = [];
let activePopupMarker = null;

// === Initialize on DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  initRoleToggle();
  initPosterView();
  initSearcherView();
  restoreSavedRole();
});

// ===============================
// Role Toggle Logic
// ===============================
function initRoleToggle() {
  const radios = document.querySelectorAll('input[name="role"]');
  radios.forEach(r => {
    r.addEventListener('change', e => {
      role = e.target.value;
      localStorage.setItem('role', role);
      updateRoleView(role);
    });
  });
}

function restoreSavedRole() {
  const saved = localStorage.getItem('role');
  if (saved) {
    role = saved;
    document.querySelector(`input[name="role"][value="${saved}"]`).checked = true;
  }
  updateRoleView(role);
}

function updateRoleView(newRole) {
  const posterPanel = document.getElementById('posterPanel');
  const searcherPanel = document.getElementById('searcherPanel');
  if (newRole === 'poster') {
    posterPanel.classList.remove('hidden');
    searcherPanel.classList.add('hidden');
    initPosterMap();
  } else {
    posterPanel.classList.add('hidden');
    searcherPanel.classList.remove('hidden');
    initSearcherMap();
  }
}

// ===============================
// Poster / Evaluator View
// ===============================
function initPosterView() {
  // Form submission
  const postForm = document.getElementById('postForm');
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = collectPostData();
    document.getElementById('postStatus').textContent = 'Saving...';
    try {
      await savePost(data);
      document.getElementById('postStatus').textContent = '✅ Post saved successfully.';
      postForm.reset();
      localStorage.removeItem('posterMarker');
      if (posterMarker) map.removeLayer(posterMarker);
    } catch (err) {
      document.getElementById('postStatus').textContent = '❌ Error saving post.';
      console.error(err);
    }
  });

  // Load My Posts
  document.getElementById('loadMyPostsBtn').addEventListener('click', async () => {
    const email = document.getElementById('ownerEmail').value.trim();
    const key = document.getElementById('ownerKey').value.trim();
    const list = document.getElementById('myPosts');
    list.innerHTML = 'Loading...';
    try {
      const posts = await fetchMyPosts(email, key);
      list.innerHTML = '';
      posts.forEach(p => list.appendChild(renderPostCard(p)));
    } catch (err) {
      list.innerHTML = 'Error loading posts.';
      console.error(err);
    }
  });

  // Place / Move Pin button
  document.getElementById('placePinBtn').addEventListener('click', () => {
    alert('Click on the map to place or move your pin.');
    enablePinPlacement();
  });
}

function initPosterMap() {
  if (map) return; // initialize once
  map = L.map('map').setView([37.0, -76.4], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const saved = localStorage.getItem('posterMarker');
  if (saved) {
    const { lat, lng } = JSON.parse(saved);
    posterMarker = L.marker([lat, lng]).addTo(map);
  }

  map.on('click', (e) => {
    if (!document.body.classList.contains('placing-pin')) return;
    const { lat, lng } = e.latlng;
    if (posterMarker) map.removeLayer(posterMarker);
    posterMarker = L.marker([lat, lng]).addTo(map);
    localStorage.setItem('posterMarker', JSON.stringify({ lat, lng }));
    document.getElementById('postLat').value = lat;
    document.getElementById('postLng').value = lng;
    document.body.classList.remove('placing-pin');

    // Bind popup
    const popupTpl = document.getElementById('popupPosterTpl').content.cloneNode(true);
    popupTpl.querySelector('.popup-title').textContent = 'My Marker';
    popupTpl.querySelector('.btnTarget').addEventListener('click', openTargetMarketModal);
    popupTpl.querySelector('.btnPost').addEventListener('click', () => alert('Open Post form.'));
    popupTpl.querySelector('.btnEdit').addEventListener('click', openEditPinModal);
    posterMarker.bindPopup(popupTpl).openPopup();
  });
}

function enablePinPlacement() {
  document.body.classList.add('placing-pin');
}

function collectPostData() {
  return {
    title: document.getElementById('postTitle').value.trim(),
    desc: document.getElementById('postDesc').value.trim(),
    tags: document.getElementById('postTags').value.trim(),
    email: document.getElementById('postEmail').value.trim(),
    key: document.getElementById('postKey').value.trim(),
    eval: document.getElementById('postEval').value.trim(),
    lat: parseFloat(document.getElementById('postLat').value),
    lng: parseFloat(document.getElementById('postLng').value)
  };
}

// Simulated savePost
async function savePost(data) {
  console.log('Saving post:', data);
  // Replace with shared.js helper call to backend
  await new Promise(res => setTimeout(res, 500));
  return true;
}

// Simulated fetchMyPosts
async function fetchMyPosts(email, key) {
  console.log('Fetching posts for', email);
  // Replace with shared.js call
  await new Promise(res => setTimeout(res, 300));
  return allPosts.filter(p => p.email === email && p.key === key);
}

function renderPostCard(p) {
  const tpl = document.getElementById('postItemTpl').content.cloneNode(true);
  tpl.querySelector('.title').textContent = p.title || '(untitled)';
  tpl.querySelector('.tags').textContent = p.tags || '';
  tpl.querySelector('.pid').textContent = p.id || '(none)';
  tpl.querySelector('.eval').textContent = p.eval || '';
  tpl.querySelector('.coords').textContent = `${p.lat}, ${p.lng}`;
  tpl.querySelector('.desc').textContent = p.desc || '';
  return tpl;
}

// ===============================
// Searcher / Responder View
// ===============================
function initSearcherView() {
  document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // critical fix to stop page reload
    const q = document.getElementById('q').value.trim();
    const tags = document.getElementById('tags').value.trim();
    document.getElementById('searchStatus').textContent = 'Searching...';
    try {
      const results = await runSearch(q, tags);
      document.getElementById('searchStatus').textContent = `${results.length} results found.`;
      renderSearchResults(results);
    } catch (err) {
      document.getElementById('searchStatus').textContent = 'Error during search.';
      console.error(err);
    }
  });
}

function initSearcherMap() {
  if (resultsMap) return;
  resultsMap = L.map('resultsMap').setView([37.0, -76.4], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(resultsMap);
}

async function runSearch(q, tags) {
  console.log('Search terms:', q, tags);
  await new Promise(res => setTimeout(res, 400)); // simulate delay
  // For demo, return all posts containing q or tags
  const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  return allPosts.filter(p =>
    (!q || p.title.toLowerCase().includes(q.toLowerCase()) || p.desc.toLowerCase().includes(q.toLowerCase())) &&
    (tagList.length === 0 || tagList.some(t => p.tags.toLowerCase().includes(t)))
  );
}

function renderSearchResults(results) {
  const list = document.getElementById('resultsList');
  list.innerHTML = '';
  if (resultsMap) {
    resultsMap.eachLayer(l => { if (l instanceof L.Marker) resultsMap.removeLayer(l); });
  }

  results.forEach(p => {
    const marker = L.marker([p.lat, p.lng]).addTo(resultsMap);
    const popupTpl = document.getElementById('popupSearcherTpl').content.cloneNode(true);
    popupTpl.querySelector('.popup-title').textContent = p.title;
    popupTpl.querySelector('.btnPosts').addEventListener('click', () => openRespondModal(p));
    popupTpl.querySelector('.btnProfile').addEventListener('click', () => alert('View profile of poster.'));
    popupTpl.querySelector('.btnRefer').addEventListener('click', () => alert('Refer this post.'));
    marker.bindPopup(popupTpl);
    list.appendChild(renderPostCard(p));
  });
}

// ===============================
// Marker Popup Modals
// ===============================
function openTargetMarketModal() {
  showModal('modalTargetMarket');
  const form = document.getElementById('targetForm');
  const preview = L.map('tmMapPreview').setView([37.0, -76.4], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(preview);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const base = parseFloat(document.getElementById('tmBaseRadius').value);
    const rings = parseInt(document.getElementById('tmRingCount').value);
    const step = parseFloat(document.getElementById('tmIncrement').value);
    const latlng = posterMarker ? posterMarker.getLatLng() : preview.getCenter();
    preview.eachLayer(l => { if (l instanceof L.Circle) preview.removeLayer(l); });
    for (let i = 0; i < rings; i++) {
      const radius = (base + i * step) * 1609.34;
      L.circle(latlng, { radius, color: i === 0 ? 'green' : 'blue', fillOpacity: 0.1 }).addTo(preview);
    }
    document.getElementById('tmSummary').innerHTML = `Created ${rings} rings starting at ${base} mi with ${step} mi increments.`;
    document.getElementById('btnOrderMailers').classList.remove('hidden');
  }, { once: true });
}

function openEditPinModal() {
  showModal('modalEditPin');
}

function openRespondModal(post) {
  showModal();
  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  body.innerHTML = '';
  const tpl = document.getElementById('respondTpl').content.cloneNode(true);
  tpl.querySelector('.title').textContent = post.title;
  tpl.querySelector('.desc').textContent = post.desc;
  tpl.querySelector('input[name="postId"]').value = post.id || '';
  tpl.querySelector('.cancelRespond').addEventListener('click', closeModal);
  tpl.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    tpl.querySelector('.status').textContent = 'Sending...';
    await new Promise(res => setTimeout(res, 400));
    tpl.querySelector('.status').textContent = '✅ Response sent!';
    e.target.reset();
  });
  body.appendChild(tpl);
}

// ===============================
// Modal Helpers
// ===============================
function showModal(id) {
  if (!id) {
    document.getElementById('modal').classList.remove('hidden');
    return;
  }
  document.getElementById(id).classList.remove('hidden');
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.close;
    if (target) document.getElementById(target).classList.add('hidden');
    else closeModal();
  });
});
