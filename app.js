/******************************************************
 * Accel Mailer Platform - Main Application Logic
 * ----------------------------------------------------
 * Core functionality for the interactive targeting map:
 *   • Initializes Leaflet map
 *   • Loads and filters dataset (CSV or JSON)
 *   • Draws multi-radius rings
 *   • Displays hover counts
 *   • Handles mode switching (Poster / Searcher)
 *   • Connects with Google Sheets via Shared.js
 * ----------------------------------------------------
 * Depends on: config.js, shared.js
 ******************************************************/

// === GLOBALS ===
let map, datasetPoints = [];
let radiusLayers = [];
let markers = [];
let currentMode = "poster"; // default mode
let activeCenter = null;
let datasetLoaded = false;

/******************************************************
 * 1️⃣ INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  bindUI();
  await loadDataset();
});

/******************************************************
 * 2️⃣ MAP INITIALIZATION
 ******************************************************/
function initMap() {
  map = L.map("map", {
    center: [37.0902, -95.7129], // Default to center of US
    zoom: 5,
    zoomControl: true,
    attributionControl: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(map);

  Config.DEBUG.log("Map initialized.");
}

/******************************************************
 * 3️⃣ DATASET LOADING
 ******************************************************/
/**
 * Loads dataset points (can be local CSV or from Sheets).
 * Expected columns: RecordID, Latitude, Longitude, Criteria fields.
 */
async function loadDataset() {
  try {
    // You can swap this for a fetch to a public CSV or Sheet endpoint
    const response = await Shared.fetchGet(Config.ROUTES.getProposals);
    if (response?.data && Array.isArray(response.data)) {
      datasetPoints = response.data.map((d) => ({
        id: d.RecordID || d.id || crypto.randomUUID(),
        lat: parseFloat(d.Lat || d.latitude),
        lng: parseFloat(d.Lng || d.longitude),
        ...d,
      }));
      datasetLoaded = true;
      Shared.showMessage(`Loaded ${datasetPoints.length} points.`, "success");
      Config.DEBUG.log("Dataset loaded:", datasetPoints.length);
      renderMarkers();
    } else {
      console.warn("Dataset response invalid or empty.");
    }
  } catch (err) {
    console.error("Dataset load failed:", err);
    Shared.showMessage("Failed to load dataset.", "error");
  }
}

/******************************************************
 * 4️⃣ MARKERS & POPUPS
 ******************************************************/
function renderMarkers() {
  if (!map || !datasetLoaded) return;
  clearMarkers();

  datasetPoints.forEach((p) => {
    if (!p.lat || !p.lng) return;
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 5,
      color: currentMode === "poster" ? Config.DEFAULTS.themeColor : "purple",
      fillColor: currentMode === "poster" ? Config.DEFAULTS.themeColor : "purple",
      fillOpacity: 0.7,
    });

    marker.bindPopup(getPopupContent(p));
    marker.on("click", () => onMarkerClick(p, marker));
    marker.addTo(map);
    markers.push(marker);
  });

  document.getElementById("pointCount").textContent = markers.length;
  Config.DEBUG.log(`Rendered ${markers.length} markers.`);
}

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

/**
 * Generates popup content for each marker.
 */
function getPopupContent(point) {
  const name = point.BusinessName || point.Title || "Untitled";
  const desc = point.Description || point.Notes || "No description available.";
  return `
    <div class="popup-content">
      <h3>${name}</h3>
      <p>${desc}</p>
      <button class="popup-btn" onclick="openTargetMarket('${point.id}')">
        Target Market
      </button>
    </div>
  `;
}

/******************************************************
 * 5️⃣ RADIUS DRAWING & INTERACTIONS
 ******************************************************/
function drawRings(center, baseMiles = 3, count = 3) {
  clearRings();
  const colors = ["#2F5597", "#3C78D8", "#6FA8DC"];

  for (let i = 1; i <= count; i++) {
    const ring = L.circle(center, {
      radius: milesToMeters(baseMiles * i),
      color: colors[i - 1] || Config.DEFAULTS.highlightColor,
      weight: 2,
      fill: false,
    });

    ring.on("mouseover", (e) => showRadiusCount(e, baseMiles * i));
    ring.on("mouseout", () => hideHoverCount());
    ring.addTo(map);
    radiusLayers.push(ring);
  }
}

function clearRings() {
  radiusLayers.forEach((r) => map.removeLayer(r));
  radiusLayers = [];
}

function milesToMeters(mi) {
  return mi * 1609.34;
}

/**
 * Display dynamic count on ring hover.
 */
function showRadiusCount(e, miles) {
  if (!datasetPoints.length || !activeCenter) return;
  const count = countWithinRadius(activeCenter, miles);
  const hoverPopup = L.popup({
    closeButton: false,
    autoClose: true,
    offset: L.point(0, -5),
  })
    .setLatLng(e.latlng)
    .setContent(`<strong>${count}</strong> locations within ${miles} mi`)
    .openOn(map);
}

function hideHoverCount() {
  map.closePopup();
}

/**
 * Count how many points fall within a given radius.
 */
function countWithinRadius(center, miles) {
  const radiusMeters = milesToMeters(miles);
  const centerPoint = L.latLng(center);
  return datasetPoints.filter((p) => {
    if (!p.lat || !p.lng) return false;
    const distance = centerPoint.distanceTo(L.latLng(p.lat, p.lng));
    return distance <= radiusMeters;
  }).length;
}

/******************************************************
 * 6️⃣ EVENT HANDLERS
 ******************************************************/
function bindUI() {
  const modeSelect = document.getElementById("viewMode");
  const radiusInput = document.getElementById("radiusSize");
  const applyCriteriaBtn = document.getElementById("applyCriteriaBtn");
  const resetBtn = document.getElementById("resetMapBtn");

  // Mode Switch
  modeSelect.addEventListener("change", (e) => {
    currentMode = e.target.value;
    clearMarkers();
    renderMarkers();
  });

  // Apply Criteria
  applyCriteriaBtn.addEventListener("click", () => {
    const criteria = document.getElementById("criteriaSelect").value;
    filterByCriteria(criteria);
  });

  // Reset Map
  resetBtn.addEventListener("click", () => {
    map.setView([37.0902, -95.7129], 5);
    clearRings();
    Shared.showMessage("Map reset.", "info");
  });

  // Click to set center and draw rings
  map.on("click", (e) => {
    activeCenter = e.latlng;
    const baseMiles = parseFloat(radiusInput.value) || 3;
    drawRings(e.latlng, baseMiles);
  });
}

/******************************************************
 * 7️⃣ CRITERIA FILTERS
 ******************************************************/
function filterByCriteria(criteria) {
  if (!criteria) {
    Shared.showMessage("Please select a criteria.", "info");
    return;
  }

  // Basic simulated filtering for demonstration.
  // Replace with real dataset logic (e.g., p.incomeLevel, p.homeowner)
  const filtered = datasetPoints.filter((p) => {
    switch (criteria) {
      case "income":
        return Number(p.Income || 0) > 75000;
      case "homeowners":
        return p.Homeowner === "Yes" || p.OwnsHome === true;
      case "lifestyle":
        return p.Lifestyle && p.Lifestyle.includes("Active");
      case "business":
        return p.BusinessType && p.BusinessType.length > 0;
      default:
        return true;
    }
  });

  clearMarkers();
  filtered.forEach((p) => {
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 5,
      color: "orange",
      fillColor: "orange",
      fillOpacity: 0.7,
    });
    marker.bindPopup(getPopupContent(p));
    marker.addTo(map);
    markers.push(marker);
  });

  document.getElementById("criteriaCount").textContent = filtered.length;
  Shared.showMessage(`Filtered ${filtered.length} matches.`, "success");
}

/******************************************************
 * 8️⃣ MARKER POPUP ACTIONS
 ******************************************************/
function onMarkerClick(point, marker) {
  openTargetMarket(point.id);
}

/**
 * Opens modal overlay with Target Market actions.
 */
function openTargetMarket(id) {
  const record = datasetPoints.find((p) => p.id === id);
  const modal = document.getElementById("modalOverlay");
  const body = document.getElementById("modalBody");
  const closeBtn = document.getElementById("modalClose");

  if (!record) return;

  body.innerHTML = `
    <h2>Target Market Actions</h2>
    <p><strong>${record.BusinessName || record.Title || "Untitled"}</strong></p>
    <p>${record.Description || record.Notes || ""}</p>
    <button id="saveTargetBtn" class="primary-btn">Save as Proposal</button>
  `;

  modal.classList.remove("hidden");
  closeBtn.onclick = () => modal.classList.add("hidden");

  document.getElementById("saveTargetBtn").onclick = async () => {
    const payload = Shared.buildPayload({
      BusinessName: record.BusinessName || record.Title,
      Notes: document.getElementById("notesField").value,
      Mode: currentMode,
      Lat: record.lat,
      Lng: record.lng,
    });
    const result = await Shared.fetchPost(Config.ROUTES.saveProposal, payload);
    if (result && !result.error) {
      Shared.showMessage("Proposal saved successfully!", "success");
      modal.classList.add("hidden");
    } else {
      Shared.showMessage("Save failed.", "error");
    }
  };
}
