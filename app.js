/******************************************************
 * Accel Mailer Platform - Main Map Logic (Enhanced)
 * ----------------------------------------------------
 * Supports:
 *   • Multi-center radius rings
 *   • Optional GeoJSON highlights
 *   • Poster/Evaluator & Searcher/Responder modes
 *   • Sheet persistence for Lat/Lng + Mode
 ******************************************************/

let map;
let datasetPoints = [];
let markers = [];
let ringSets = []; // array of radius groups
let geoLayers = [];
let activeMode = "poster";
let datasetLoaded = false;

/******************************************************
 * INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  bindUI();
  await loadDataset();
});

/******************************************************
 * MAP INITIALIZATION
 ******************************************************/
function initMap() {
  map = L.map("map", {
    center: [37.09, -95.71],
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
 * LOAD DATASET (from Sheets)
 ******************************************************/
async function loadDataset() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getProposals);
    if (res?.data?.length) {
      datasetPoints = res.data
        .filter(p => p.Lat && p.Lng)
        .map(p => ({
          id: p.ProposalID || crypto.randomUUID(),
          lat: parseFloat(p.Lat),
          lng: parseFloat(p.Lng),
          ...p,
        }));
      datasetLoaded = true;
      renderMarkers();
      Shared.showMessage(`Loaded ${datasetPoints.length} records.`, "success");
    }
  } catch (err) {
    console.error("Dataset load failed:", err);
    Shared.showMessage("Failed to load dataset.", "error");
  }
}

/******************************************************
 * MARKERS
 ******************************************************/
function renderMarkers() {
  clearMarkers();
  datasetPoints.forEach((p) => {
    const color = activeMode === "poster" ? Config.DEFAULTS.themeColor : "purple";
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 5,
      color,
      fillColor: color,
      fillOpacity: 0.7,
    })
      .bindPopup(getPopupHTML(p))
      .addTo(map);

    marker.on("click", () => openTargetMarket(p));
    markers.push(marker);
  });
}

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

function getPopupHTML(p) {
  return `
    <div class="popup-content">
      <h3>${p.BusinessName || "Untitled"}</h3>
      <p>${p.Description || "No details available."}</p>
      <button class="popup-btn" onclick="openTargetMarket(${JSON.stringify(p).replace(/"/g, '&quot;')})">
        Target Market
      </button>
    </div>`;
}

/******************************************************
 * MULTI-CENTER RADIUS RINGS
 ******************************************************/
function drawRings(center, baseMiles = 3, count = 3) {
  const colors = ["#2F5597", "#3C78D8", "#6FA8DC"];
  const thisSet = [];

  for (let i = 1; i <= count; i++) {
    const ring = L.circle(center, {
      radius: milesToMeters(baseMiles * i),
      color: colors[i - 1] || Config.DEFAULTS.highlightColor,
      weight: 2,
      fill: false,
    }).addTo(map);

    ring.on("mouseover", (e) => showRadiusCount(e, baseMiles * i, center));
    ring.on("mouseout", () => map.closePopup());
    thisSet.push(ring);
  }
  ringSets.push(thisSet);
}

function milesToMeters(mi) {
  return mi * 1609.34;
}

function clearAllRings() {
  ringSets.flat().forEach((r) => map.removeLayer(r));
  ringSets = [];
}

/******************************************************
 * RADIUS COUNTS
 ******************************************************/
function showRadiusCount(e, miles, center) {
  if (!datasetPoints.length) return;
  const radiusMeters = milesToMeters(miles);
  const count = datasetPoints.filter((p) => {
    const dist = L.latLng(center).distanceTo([p.lat, p.lng]);
    return dist <= radiusMeters;
  }).length;
  L.popup({ closeButton: false })
    .setLatLng(e.latlng)
    .setContent(`<strong>${count}</strong> within ${miles} mi`)
    .openOn(map);
}

/******************************************************
 * GEOJSON HIGHLIGHTS (Optional)
 ******************************************************/
async function addGeoLayer(url, color = "#FFD965") {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const layer = L.geoJSON(data, {
      style: {
        color,
        weight: 2,
        fillOpacity: 0.1,
      },
    }).addTo(map);
    geoLayers.push(layer);
    Shared.showMessage("Geography layer added.", "success");
  } catch (err) {
    console.error("GeoJSON load failed:", err);
    Shared.showMessage("Failed to load geographic layer.", "error");
  }
}

function clearGeoLayers() {
  geoLayers.forEach((g) => map.removeLayer(g));
  geoLayers = [];
}

/******************************************************
 * EVENT BINDINGS
 ******************************************************/
function bindUI() {
  const modeSelect = document.getElementById("viewMode");
  const radiusInput = document.getElementById("radiusSize");
  const resetBtn = document.getElementById("resetMapBtn");

  modeSelect.addEventListener("change", (e) => {
    activeMode = e.target.value;
    renderMarkers();
  });

  resetBtn.addEventListener("click", () => {
    clearAllRings();
    clearGeoLayers();
    map.setView([37.09, -95.71], 5);
  });

  map.on("click", (e) => {
    const miles = parseFloat(radiusInput.value) || 3;
    drawRings(e.latlng, miles, 3);
  });
}

/******************************************************
 * MARKER POPUP ACTIONS
 ******************************************************/
function openTargetMarket(p) {
  const payload = Shared.buildPayload({
    BusinessName: p.BusinessName || "",
    ContactName: p.ContactName || "",
    Email: p.Email || "",
    Lat: p.lat,
    Lng: p.lng,
    Mode: activeMode,
    Notes: document.getElementById("notesField")?.value || "",
  });

  Shared.fetchPost(Config.ROUTES.saveProposal, payload)
    .then((res) => {
      if (!res.error) Shared.showMessage("Saved target market.", "success");
      else Shared.showMessage("Failed to save.", "error");
    });
}
