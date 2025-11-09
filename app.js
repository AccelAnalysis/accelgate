/******************************************************
 * Accel RFP Platform - Main Map Console Logic
 * ----------------------------------------------------
 * Features:
 *   • Dual Mode: Poster/Evaluator vs Searcher/Responder
 *   • RFP Markers with radius rings
 *   • Click-to-create RFP or respond
 *   • Real-time filtering & stats
 *   • Modal for RFP preview/response
 *   • NEW: Address search + Profile pins (HQ + sites)
 *   • NEW: Pin popup with Create RFP, Edit, Target Market
 * ----------------------------------------------------
 * Depends on: config.js, shared.js, index.html
 ******************************************************/

let map;
let rfpMarkers = [];
let radiusRings = [];
let rfpData = [];
let filteredData = [];
let activeMode = "poster";
let selectedCenter = null;
let ownProfile = null;

/******************************************************
 * 1. INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  bindUI();
  await Promise.all([loadRFPs(), loadOwnProfile(), loadCriteria()]);
  updateMode();
});

/******************************************************
 * 2. MAP SETUP
 ******************************************************/
function initMap() {
  map = L.map("map", {
    center: Config.DEFAULTS.mapCenter,
    zoom: Config.DEFAULTS.zoomLevel,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  Config.DEBUG.log("Map initialized at", Config.DEFAULTS.mapCenter);
}

/******************************************************
 * 3. LOAD RFPS FROM BACKEND
 ******************************************************/
async function loadRFPs() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getRFPs);
    if (res?.data) {
      rfpData = res.data.filter(r => r.Published === 'TRUE' && r.Lat && r.Lng);
      renderMarkers();
      updateStats();
      Shared.showMessage(`Loaded ${rfpData.length} published RFPs.`, "success");
    }
  } catch (err) {
    Shared.showMessage("Failed to load RFPs.", "error");
    Config.DEBUG.error("loadRFPs error:", err);
  }
}

/******************************************************
 * 4. LOAD OWN PROFILE (HQ + Sites)
 ******************************************************/
async function loadOwnProfile() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getProfiles);
    ownProfile = res?.data?.[0]; // Single org for now
    if (ownProfile) {
      addProfilePins(ownProfile);
      Shared.showMessage(`Profile loaded: ${ownProfile.OrgName}`, "info");
    }
  } catch (err) {
    Config.DEBUG.error("loadOwnProfile error:", err);
  }
}

function addProfilePins(profile) {
  // HQ Pin
  if (profile.HQ_Lat && profile.HQ_Lng) {
    const hqIcon = L.icon({
      iconUrl: 'assets/icons/hq.svg',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
    const hqMarker = L.marker([profile.HQ_Lat, profile.HQ_Lng], { icon: hqIcon }).addTo(map);
    hqMarker.bindPopup(getOwnPinPopup(profile, true));
    hqMarker.on('click', () => openOwnPinPopup(profile, true, hqMarker));
  }

  // Site Pins
  const siteLats = (profile.Site_Lats || '').split('|').filter(Boolean);
  const siteLngs = (profile.Site_Lngs || '').split('|').filter(Boolean);
  const siteAddrs = (profile.Site_Addresses || '').split('|').filter(Boolean);

  siteLats.forEach((lat, i) => {
    const lng = siteLngs[i];
    if (!lat || !lng) return;
    const siteIcon = L.icon({
      iconUrl: 'assets/icons/site.svg',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
    const siteMarker = L.marker([lat, lng], { icon: siteIcon }).addTo(map);
    const siteName = siteAddrs[i] || `Site ${i + 1}`;
    siteMarker.bindPopup(getOwnPinPopup(profile, false, siteName));
    siteMarker.on('click', () => openOwnPinPopup(profile, false, siteMarker, siteName));
  });
}

function getOwnPinPopup(profile, isHQ, siteName = '') {
  const title = isHQ ? `${profile.OrgName} (HQ)` : `${profile.OrgName} – ${siteName}`;
  const addr = isHQ ? profile.HQ_Address : siteName;
  return `
    <div class="popup-content">
      <b>${title}</b><br>
      <small>${addr}</small><hr>
      <div class="popup-actions">
        <button onclick="startRFPFromPin('${profile.UserID}', ${isHQ ? profile.HQ_Lat : 'null'}, ${isHQ ? profile.HQ_Lng : 'null'})">
          Create RFP
        </button>
        <button onclick="editPin('${profile.UserID}', ${isHQ})">
          Edit Pin
        </button>
        <button onclick="showTargetMarket(${isHQ ? profile.HQ_Lat : 'null'}, ${isHQ ? profile.HQ_Lng : 'null'})">
          Target Market
        </button>
      </div>
    </div>`;
}

function openOwnPinPopup(profile, isHQ, marker, siteName) {
  marker.setPopupContent(getOwnPinPopup(profile, isHQ, siteName));
  marker.openPopup();
}

/******************************************************
 * 5. ADDRESS SEARCH
 ******************************************************/
async function performAddressSearch() {
  const query = document.getElementById('addrSearch').value.trim();
  if (!query) return;

  Shared.showMessage("Searching...", "info");
  const result = await Shared.geocodeAddress(query);
  if (result) {
    map.setView([result.lat, result.lng], 14);
    L.marker([result.lat, result.lng])
      .addTo(map)
      .bindPopup(`<b>${query}</b>`)
      .openPopup();
    Shared.showMessage("Location found!", "success");
  } else {
    Shared.showMessage("Address not found.", "error");
  }
}

/******************************************************
 * 6. RENDER MARKERS (RFPs)
 ******************************************************/
function renderMarkers() {
  clearMarkers();
  const data = activeMode === "poster" ? rfpData : filteredData;

  data.forEach(rfp => {
    const lat = parseFloat(rfp.Lat);
    const lng = parseFloat(rfp.Lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const color = activeMode === "poster" 
      ? Config.DEFAULTS.posterModeColor 
      : Config.DEFAULTS.responderModeColor;

    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(getRFPPopupHTML(rfp));
    marker.on("click", () => openRFPModal(rfp));
    rfpMarkers.push(marker);
  });
}

function getRFPPopupHTML(rfp) {
  return `
    <div class="popup-content">
      <h3>${rfp.Title || "Untitled RFP"}</h3>
      <p><strong>${rfp.Organization}</strong></p>
      <p>Radius: ${rfp.RadiusMiles} mi</p>
      <button class="popup-btn" onclick="openRFPModal(${JSON.stringify(rfp).replace(/"/g, '&quot;')})">
        ${activeMode === "poster" ? "View Details" : "Respond"}
      </button>
    </div>
  `;
}

function clearMarkers() {
  rfpMarkers.forEach(m => map.removeLayer(m));
  rfpMarkers = [];
}

/******************************************************
 * 7. MODE SWITCHING
 ******************************************************/
function updateMode() {
  const mode = document.getElementById("viewMode").value;
  activeMode = mode;

  document.body.classList.toggle("responder-mode", mode === "responder");
  document.getElementById("createRFPBtn").style.display = 
    mode === "poster" ? "block" : "none";

  renderMarkers();
  updateStats();
  Shared.showMessage(`Switched to ${mode} mode.`, "info");
}

/******************************************************
 * 8. RADIUS RINGS ON CLICK
 ******************************************************/
function drawRadiusRings(center, miles) {
  clearRadiusRings();
  const steps = 3;
  const colors = ["#2F5597", "#3C78D8", "#6FA8DC"];

  for (let i = 1; i <= steps; i++) {
    const radius = miles * i;
    const ring = L.circle(center, {
      radius: radius * 1609.34,
      color: colors[i - 1],
      weight: 2,
      fill: false,
      opacity: 0.7
    }).addTo(map);

    ring.bindTooltip(`${radius} mi`, { permanent: false, direction: "center" });
    radiusRings.push(ring);
  }

  selectedCenter = center;
  updateRadiusCount();
}

function clearRadiusRings() {
  radiusRings.forEach(r => map.removeLayer(r));
  radiusRings = [];
}

/******************************************************
 * 9. FILTERING & STATS
 ******************************************************/
async function loadCriteria() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getTemplates);
    const select = document.getElementById("criteriaSelect");
    select.innerHTML = `<option value="">-- Any --</option>`;
    res?.data?.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.Industry;
      opt.textContent = t.Industry;
      select.appendChild(opt);
    });
  } catch (err) {
    Config.DEBUG.error("loadCriteria error:", err);
  }
}

function applyFilters() {
  const criteria = document.getElementById("criteriaSelect").value;
  const radius = parseFloat(document.getElementById("radiusSize").value) || 5;

  filteredData = rfpData.filter(rfp => {
    const lat = parseFloat(rfp.Lat), lng = parseFloat(rfp.Lng);
    if (isNaN(lat) || isNaN(lng)) return false;
    if (criteria && !rfp.Title.toLowerCase().includes(criteria.toLowerCase())) return false;

    if (selectedCenter) {
      const dist = map.distance(selectedCenter, [lat, lng]) / 1609.34;
      return dist <= radius;
    }
    return true;
  });

  renderMarkers();
  updateStats();
}

function updateStats() {
  const total = rfpData.length;
  const inRadius = selectedCenter 
    ? rfpData.filter(rfp => {
        const d = map.distance(selectedCenter, [parseFloat(rfp.Lat), parseFloat(rfp.Lng)]) / 1609.34;
        return d <= (parseFloat(document.getElementById("radiusSize").value) || 5);
      }).length 
    : 0;

  document.getElementById("rfpCount").textContent = total;
  document.getElementById("radiusCount").textContent = inRadius;
  document.getElementById("criteriaCount").textContent = filteredData.length;
}

function updateRadiusCount() {
  if (!selectedCenter) return;
  const radius = parseFloat(document.getElementById("radiusSize").value) || 5;
  const count = rfpData.filter(rfp => {
    const d = map.distance(selectedCenter, [parseFloat(rfp.Lat), parseFloat(rfp.Lng)]) / 1609.34;
    return d <= radius;
  }).length;
  document.getElementById("radiusCount").textContent = count;
}

/******************************************************
 * 10. MODAL HANDLING
 ******************************************************/
function openRFPModal(rfp) {
  const modalBody = document.getElementById("modalBody");
  const isPoster = activeMode === "poster";

  modalBody.innerHTML = `
    <h3>${rfp.Title}</h3>
    <p><strong>${rfp.Organization}</strong> • ${rfp.ContactName}</p>
    <p>Email: ${rfp.Email} • Phone: ${rfp.Phone}</p>
    <p>Radius: ${rfp.RadiusMiles} miles</p>
    <hr>
    <p><strong>Custom Fields:</strong></p>
    <pre>${JSON.stringify(JSON.parse(rfp.CustomFieldsJSON || "{}"), null, 2)}</pre>
    <div style="margin-top:1rem;">
      ${isPoster 
        ? `<button class="btn-secondary" onclick="editRFP('${rfp.RFP_ID}')">Edit RFP</button>`
        : `<button class="btn-primary" onclick="respondToRFP('${rfp.RFP_ID}')">Submit Response</button>`
      }
    </div>
  `;

  document.getElementById("modalOverlay").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
}

function editRFP(id) {
  closeModal();
  window.location.href = `proposal.html?mode=poster&edit=${id}`;
}

function respondToRFP(id) {
  closeModal();
  window.location.href = `proposal.html?mode=responder&rfp=${id}`;
}

/******************************************************
 * 11. GLOBAL EXPORTS & ACTIONS
 ******************************************************/
window.startRFPFromPin = (userID, lat, lng) => {
  if (!lat || !lng) return;
  sessionStorage.setItem('rfpDraft', JSON.stringify({ UserID: userID, Lat: lat, Lng: lng }));
  location.href = 'proposal.html?mode=poster';
};

window.editPin = (userID, isHQ) => {
  location.href = `admin.html#profile-${userID}-${isHQ ? 'hq' : 'site'}`;
};

window.showTargetMarket = (lat, lng) => {
  if (!lat || !lng) return;
  const center = L.latLng(lat, lng);
  const radius = parseFloat(document.getElementById("radiusSize").value) || 5;
  drawRadiusRings(center, radius);
  applyFilters();
};

window.openRFPModal = openRFPModal;
window.editRFP = editRFP;
window.respondToRFP = respondToRFP;

/******************************************************
 * 12. UI BINDINGS
 ******************************************************/
function bindUI() {
  // Mode switch
  document.getElementById("viewMode").addEventListener("change", updateMode);

  // Address search
  const searchInput = document.getElementById("addrSearch");
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performAddressSearch();
  });

  // Map click → draw rings
  map.on("click", (e) => {
    const radius = parseFloat(document.getElementById("radiusSize").value) || 5;
    drawRadiusRings(e.latlng, radius);
    applyFilters();
  });

  // Filter button
  document.getElementById("applyCriteriaBtn").addEventListener("click", applyFilters);

  // Reset
  document.getElementById("resetMapBtn").addEventListener("click", () => {
    clearRadiusRings();
    selectedCenter = null;
    map.setView(Config.DEFAULTS.mapCenter, Config.DEFAULTS.zoomLevel);
    updateStats();
  });

  // Create RFP
  document.getElementById("createRFPBtn").addEventListener("click", () => {
    window.location.href = "proposal.html?mode=poster";
  });

  // Modal close
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });

  // Radius input live update
  document.getElementById("radiusSize").addEventListener("input", () => {
    if (selectedCenter) {
      const radius = parseFloat(document.getElementById("radiusSize").value) || 5;
      drawRadiusRings(selectedCenter, radius);
      applyFilters();
    }
  });
}
