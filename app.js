/******************************************************
 * Accel RFP Platform - Main Map Console Logic
 * ----------------------------------------------------
 * Features:
 *   • Dual Mode: Poster/Evaluator vs Searcher/Responder
 *   • RFP Markers with radius rings
 *   • Click-to-create RFP or respond
 *   • Real-time filtering & stats
 *   • Modal for RFP preview/response
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

/******************************************************
 * 1. INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  bindUI();
  await loadRFPs();
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
 * 3. LOAD RFPs FROM BACKEND
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
 * 4. RENDER MARKERS
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

    marker.bindPopup(getPopupHTML(rfp));
    marker.on("click", () => openRFPModal(rfp));
    rfpMarkers.push(marker);
  });
}

function getPopupHTML(rfp) {
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
 * 5. MODE SWITCHING
 ******************************************************/
function updateMode() {
  const mode = document.getElementById("viewMode").value;
  activeMode = mode;

  // Update UI
  document.body.classList.toggle("responder-mode", mode === "responder");
  document.getElementById("createRFPBtn").style.display = 
    mode === "poster" ? "block" : "none";

  renderMarkers();
  updateStats();
  Shared.showMessage(`Switched to ${mode} mode.`, "info");
}

/******************************************************
 * 6. RADIUS RINGS ON CLICK
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
 * 7. FILTERING & STATS
 ******************************************************/
function applyFilters() {
  const criteria = document.getElementById("criteriaSelect").value;
  const radius = parseFloat(document.getElementById("radiusSize").value) || 5;

  filteredData = rfpData.filter(rfp => {
    const lat = parseFloat(rfp.Lat), lng = parseFloat(rfp.Lng);
    if (isNaN(lat) || isNaN(lng)) return false;
    if (criteria && !rfp.Title.toLowerCase().includes(criteria)) return false;

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
 * 8. MODAL HANDLING
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
 * 9. UI BINDINGS
 ******************************************************/
function bindUI() {
  // Mode switch
  document.getElementById("viewMode").addEventListener("change", updateMode);

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

/******************************************************
 * 10. GLOBAL EXPORTS (for inline onclick)
 ******************************************************/
window.openRFPModal = openRFPModal;
window.editRFP = editRFP;
window.respondToRFP = respondToRFP;
