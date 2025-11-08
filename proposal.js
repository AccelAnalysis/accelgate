/******************************************************
 * Accel RFP Platform - Proposal Form Logic
 * ----------------------------------------------------
 * Features:
 *   • Dual Mode: Poster (create/edit RFP) vs Responder (submit bid)
 *   • Template-driven dynamic fields
 *   • Map center click + radius
 *   • Scoring criteria preview (Poster only)
 *   • Auto-save draft (localStorage)
 *   • Submit → saveRFP / saveResponse
 * ----------------------------------------------------
 * Depends on: config.js, shared.js, proposal.html
 ******************************************************/

let proposalMap;
let centerMarker = null;
let radiusRing = null;
let templates = [];
let currentTemplate = null;
let formMode = "poster"; // poster | responder
let editRFP_ID = null;

/******************************************************
 * 1. INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  bindUI();
  await loadTemplates();
  parseURLParams();
  loadDraft();
  updateFormMode();
});

/******************************************************
 * 2. URL PARAMS & MODE
 ******************************************************/
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  formMode = params.get("mode") || "poster";
  editRFP_ID = params.get("edit") || params.get("rfp");

  document.getElementById("formMode").value = formMode;
  if (editRFP_ID) document.getElementById("editRFP_ID").value = editRFP_ID;
}

function updateFormMode() {
  const isPoster = formMode === "poster";
  document.getElementById("formSubtitle").textContent = 
    isPoster ? "Create or Edit RFP" : "Submit Response to RFP";
  document.getElementById("submitBtn").textContent = 
    isPoster ? "Publish RFP" : "Submit Response";

  // Hide scoring for responders
  document.getElementById("scoringPreviewSection").style.display = 
    isPoster ? "block" : "none";

  if (!isPoster && editRFP_ID) {
    loadRFPForResponse(editRFP_ID);
  }
}

/******************************************************
 * 3. LOAD TEMPLATES
 ******************************************************/
async function loadTemplates() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getTemplates);
    templates = res?.data || [];
    populateTemplateSelect();
  } catch (err) {
    Shared.showMessage("Failed to load templates.", "error");
  }
}

function populateTemplateSelect() {
  const select = document.getElementById("TemplateSelect");
  select.innerHTML = `<option value="">-- Select Template --</option>`;
  templates.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.TemplateID;
    opt.textContent = `${t.Name} (${t.Industry})`;
    select.appendChild(opt);
  });
}

/******************************************************
 * 4. MAP SETUP
 ******************************************************/
function initMap() {
  proposalMap = L.map("proposalMap", {
    center: Config.DEFAULTS.mapCenter,
    zoom: Config.DEFAULTS.zoomLevel,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(proposalMap);

  proposalMap.on("click", (e) => {
    setMapCenter(e.latlng);
  });

  Config.DEBUG.log("Proposal map ready.");
}

function setMapCenter(latlng) {
  // Update hidden fields
  document.getElementById("Lat") ? document.getElementById("Lat").value = latlng.lat.toFixed(6) : null;
  document.getElementById("Lng") ? document.getElementById("Lng").value = latlng.lng.toFixed(6) : null;

  // Add/update marker
  if (centerMarker) centerMarker.setLatLng(latlng);
  else centerMarker = L.marker(latlng).addTo(proposalMap);

  // Update radius ring
  const miles = parseFloat(document.getElementById("RadiusMiles").value) || 5;
  if (radiusRing) proposalMap.removeLayer(radiusRing);
  radiusRing = L.circle(latlng, {
    radius: miles * 1609.34,
    color: Config.DEFAULTS.themeColor,
    fillOpacity: 0.1,
    weight: 2
  }).addTo(proposalMap);

  saveDraft();
}

/******************************************************
 * 5. DYNAMIC FIELDS FROM TEMPLATE
 ******************************************************/
document.getElementById("TemplateSelect").addEventListener("change", async (e) => {
  const templateID = e.target.value;
  currentTemplate = templates.find(t => t.TemplateID === templateID);
  if (!currentTemplate) return;

  const fields = JSON.parse(currentTemplate.FieldsJSON || "[]");
  const scoring = JSON.parse(currentTemplate.ScoringJSON || "{}");

  renderDynamicFields(fields);
  renderScoringPreview(scoring);
  saveDraft();
});

function renderDynamicFields(fields) {
  const container = document.getElementById("dynamicFields");
  container.innerHTML = "";

  if (!fields.length) {
    container.innerHTML = "<p><em>No custom fields defined in this template.</em></p>";
    return;
  }

  fields.forEach(field => {
    const div = document.createElement("div");
    div.className = "form-grid";
    div.innerHTML = `
      <label>${field.label}
        ${field.type === "textarea" 
          ? `<textarea name="${field.name}" ${field.required ? "required" : ""}></textarea>`
          : `<input type="${field.type}" name="${field.name}" ${field.required ? "required" : ""} />`
        }
      </label>
    `;
    container.appendChild(div);
  });
}

function renderScoringPreview(scoring) {
  const preview = document.getElementById("scoringPreview");
  if (!scoring || Object.keys(scoring).length === 0) {
    preview.innerHTML = "<p><em>No scoring criteria defined.</em></p>";
    return;
  }

  let html = "<ul>";
  for (const [key, weight] of Object.entries(scoring)) {
    html += `<li><strong>${key}:</strong> ${weight}%</li>`;
  }
  html += "</ul>";
  preview.innerHTML = html;
}

/******************************************************
 * 6. LOAD RFP FOR RESPONSE (Responder Mode)
 ******************************************************/
async function loadRFPForResponse(rfpID) {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getRFPs);
    const rfp = res?.data?.find(r => r.RFP_ID === rfpID);
    if (!rfp) throw new Error("RFP not found");

    // Populate static fields
    Shared.populateForm(document.getElementById("rfpForm"), {
      Title: `[Response] ${rfp.Title}`,
      Organization: "",
      ContactName: "",
      Email: "",
      Phone: "",
      RadiusMiles: rfp.RadiusMiles,
      ZipsCities: rfp.ZipsCities || ""
    });

    // Set map center
    const lat = parseFloat(rfp.Lat), lng = parseFloat(rfp.Lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      const latlng = L.latLng(lat, lng);
      proposalMap.setView(latlng, 12);
      setMapCenter(latlng);
    }

    // Load template fields
    const template = templates.find(t => t.TemplateID === rfp.TemplateID);
    if (template) {
      document.getElementById("TemplateSelect").value = template.TemplateID;
      document.getElementById("TemplateSelect").dispatchEvent(new Event("change"));
    }

    Shared.showMessage("RFP loaded for response.", "success");
  } catch (err) {
    Shared.showMessage("Failed to load RFP.", "error");
  }
}

/******************************************************
 * 7. FORM SUBMISSION
 ******************************************************/
document.getElementById("rfpForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Shared.formToJSON(form);

  // Add lat/lng
  data.Lat = centerMarker ? centerMarker.getLatLng().lat.toFixed(6) : "";
  data.Lng = centerMarker ? centerMarker.getLatLng().lng.toFixed(6) : "";

  // Add custom fields
  const custom = {};
  document.querySelectorAll("#dynamicFields input, #dynamicFields textarea").forEach(el => {
    custom[el.name] = el.value;
  });
  data.CustomFields = custom;

  const payload = Shared.buildPayload(data);

  Shared.showMessage("Submitting...", "info");

  try {
    const route = formMode === "poster" ? Config.ROUTES.saveRFP : Config.ROUTES.saveResponse;
    const result = await Shared.fetchPost(route, payload);

    if (result.success) {
      Shared.showMessage(
        formMode === "poster" ? "RFP published!" : "Response submitted!",
        "success"
      );
      clearDraft();
      setTimeout(() => window.location.href = "index.html", 1500);
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    Shared.showMessage("Submission failed.", "error");
    Config.DEBUG.error(err);
  }
});

/******************************************************
 * 8. DRAFT AUTO-SAVE
 ******************************************************/
function saveDraft() {
  const data = Shared.formToJSON(document.getElementById("rfpForm"));
  data._draftLat = centerMarker?.getLatLng().lat;
  data._draftLng = centerMarker?.getLatLng().lng;
  Shared.saveCache("rfpDraft", data);
}

function loadDraft() {
  const draft = Shared.loadCache("rfpDraft");
  if (!draft) return;

  Shared.populateForm(document.getElementById("rfpForm"), draft);
  if (draft._draftLat && draft._draftLng) {
    const latlng = L.latLng(draft._draftLat, draft._draftLng);
    proposalMap.setView(latlng, 12);
    setMapCenter(latlng);
  }
  if (draft.TemplateID) {
    setTimeout(() => {
      document.getElementById("TemplateSelect").dispatchEvent(new Event("change"));
    }, 100);
  }
}

function clearDraft() {
  Shared.clearCache("rfpDraft");
}

/******************************************************
 * 9. UI BINDINGS
 ******************************************************/
function bindUI() {
  document.getElementById("backToMapBtn").addEventListener("click", () => {
    if (confirm("Leave without saving?")) {
      clearDraft();
      window.location.href = "index.html";
    }
  });

  // Auto-save on input
  document.getElementById("rfpForm").addEventListener("input", () => {
    setTimeout(saveDraft, 500);
  });

  // Radius change → update ring
  document.getElementById("RadiusMiles").addEventListener("input", () => {
    if (centerMarker) {
      const miles = parseFloat(document.getElementById("RadiusMiles").value) || 5;
      radiusRing.setRadius(miles * 1609.34);
      saveDraft();
    }
  });
}
