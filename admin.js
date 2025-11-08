/******************************************************
 * Accel RFP Platform - Admin Dashboard Logic
 * ----------------------------------------------------
 * Full CRUD for:
 *   • Config defaults
 *   • Pricing tiers
 *   • RFP Templates (Fields + Scoring JSON)
 *   • RFP review
 *   • Response auto-ranking & evaluation
 * ----------------------------------------------------
 * Depends on: config.js, shared.js, admin.html
 ******************************************************/

let pricingData = [];
let templateData = [];
let rfpData = [];
let responseData = [];
let evaluationData = [];

/******************************************************
 * 1. INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  await Promise.all([
    loadConfig(),
    loadPricing(),
    loadTemplates(),
    loadRFPs(),
    loadEvaluations()
  ]);
});

/******************************************************
 * 2. EVENT BINDINGS
 ******************************************************/
function bindUI() {
  // Navigation
  document.getElementById("backToMapBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // Forms
  document.getElementById("configForm").addEventListener("submit", saveConfig);
  document.getElementById("pricingForm").addEventListener("submit", savePricing);
  document.getElementById("templateForm").addEventListener("submit", saveTemplate);

  // Refresh buttons
  document.getElementById("refreshPricingBtn").addEventListener("click", loadPricing);
  document.getElementById("refreshTemplatesBtn").addEventListener("click", loadTemplates);
  document.getElementById("refreshRFPsBtn").addCustomListener("click", loadRFPs);
  document.getElementById("refreshEvalsBtn").addEventListener("click", loadEvaluations);

  // Search & Filter
  document.getElementById("rfpSearch").addEventListener("input", filterRFPs);
  document.getElementById("evalRFPFilter").addEventListener("change", filterEvaluations);
}

/******************************************************
 * 3. CONFIG
 ******************************************************/
async function loadConfig() {
  try {
    const res = = await Shared.fetchGet(Config.ROUTES.getConfig);
    const config = Object.fromEntries(
      (res?.data || []).map(r => [r.Field, r.Value])
    );
    Shared.populateForm(document.getElementById("configForm"), {
      DefaultRadius: config.DefaultRadius || Config.DEFAULTS.radiusMiles,
      DefaultZoom: config.DefaultZoom || Config.DEFAULTS.zoomLevel,
      MinQuantity: config.MinQuantity || Config.DEFAULTS.minQuantity
    });
  } catch (err) {
    Shared.showMessage("Failed to load config.", "error");
  }
}

async function saveConfig(e) {
  e.preventDefault();
  const data = Shared.formToJSON(e.target);
  const payload = Shared.buildPayload(data);
  try {
    const res = await Shared.fetchPost(Config.ROUTES.saveConfig, payload);
    if (res.success) {
      Shared.showMessage("Config saved.", "success");
    }
  } catch (err) {
    Shared.showMessage("Save failed.", "error");
  }
}

/******************************************************
 * 4. PRICING
 ******************************************************/
async function loadPricing() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getPricing);
    pricingData = res?.data || [];
    renderPricingTable();
  } catch (err) {
    Shared.showMessage("Failed to load pricing.", "error");
  }
}

function renderPricingTable() {
  const tbody = document.querySelector("#pricingTable tbody");
  tbody.innerHTML = "";
  pricingData.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.MailType}</td>
      <td>${p.Size}</td>
      <td>$${Number(p.BaseRate).toFixed(2)}</td>
      <td>${p.StepQty}</td>
      <td>$${Number(p.StepRate).toFixed(2)}</td>
      <td>${p.Description}</td>
      <td>${p.Active}</td>
      <td>
        <button class="btn-small btn-secondary" onclick="editPricing('${p.MailType}', '${p.Size}')">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editPricing = (mailType, size) => {
  const tier = pricingData.find(p => p.MailType === mailType && p.Size === size);
  if (tier) {
    Shared.populateForm(document.getElementById("pricingForm"), tier);
  }
};

async function savePricing(e) {
  e.preventDefault();
  const data = Shared.formToJSON(e.target);
  try {
    const res = await Shared.fetchPost(Config.ROUTES.savePricing, data);
    if (res.success) {
      Shared.showMessage("Pricing tier saved.", "success");
      e.target.reset();
      loadPricing();
    }
  } catch (err) {
    Shared.showMessage("Save failed.", "error");
  }
}

/******************************************************
 * 5. TEMPLATES
 ******************************************************/
async function loadTemplates() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getTemplates);
    templateData = res?.data || [];
    renderTemplatesTable();
  } catch (err) {
    Shared.showMessage("Failed to load templates.", "error");
  }
}

function renderTemplatesTable() {
  const tbody = document.querySelector("#templatesTable tbody");
  tbody.innerHTML = "";
  templateData.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.Name}</td>
      <td>${t.Industry}</td>
      <td><pre style="max-height:60px;overflow:auto;font-size:0.8rem;">${t.FieldsJSON}</pre></td>
      <td><pre style="max-height:60px;overflow:auto;font-size:0.8rem;">${t.ScoringJSON}</pre></td>
      <td>${t.Active}</td>
      <td>
        <button class="btn-small btn-secondary" onclick="editTemplate('${t.TemplateID}')">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editTemplate = (id) => {
  const tmpl = templateData.find(t => t.TemplateID === id);
  if (tmpl) {
    Shared.populateForm(document.getElementById("templateForm"), {
      TemplateID: tmpl.TemplateID,
      Name: tmpl.Name,
      Industry: tmpl.Industry,
      Active: tmpl.Active,
      FieldsJSON: tmpl.FieldsJSON,
      ScoringJSON: tmpl.ScoringJSON
    });
  }
};

async function saveTemplate(e) {
  e.preventDefault();
  const data = Shared.formToJSON(e.target);
  data.Fields = JSON.parse(data.FieldsJSON || "[]");
  data.Scoring = JSON.parse(data.ScoringJSON || "{}");
  try {
    const res = await Shared.fetchPost(Config.ROUTES.saveTemplate, data);
    if (res.success) {
      Shared.showMessage("Template saved.", "success");
      e.target.reset();
      loadTemplates();
    }
  } catch (err) {
    Shared.showMessage("Invalid JSON or save failed.", "error");
  }
}

/******************************************************
 * 6. RFPS
 ******************************************************/
async function loadRFPs() {
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getRFPs);
    rfpData = res?.data || [];
    renderRFPsTable();
    populateRFPFilter();
  } catch (err) {
    Shared.showMessage("Failed to load RFPs.", "error");
  }
}

function renderRFPsTable(filtered = rfpData) {
  const tbody = document.querySelector("#rfpsTable tbody");
  tbody.innerHTML = "";
  filtered.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.RFP_ID.slice(0,8)}</td>
      <td>${r.Title}</td>
      <td>${r.Organization}</td>
      <td>${r.ContactName}</td>
      <td>${r.RadiusMiles}</td>
      <td>${r.Status}</td>
      <td>${r.Published}</td>
      <td>${countResponses(r.RFP_ID)}</td>
      <td>
        <button class="btn-small btn-secondary" onclick="viewRFP('${r.RFP_ID}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function countResponses(rfpID) {
  return responseData.filter(r => r.RFP_ID === rfpID).length;
}

function filterRFPs() {
  const term = document.getElementById("rfpSearch").value.toLowerCase();
  const filtered = rfpData.filter(r =>
    r.Title.toLowerCase().includes(term) ||
    r.Organization.toLowerCase().includes(term)
  );
  renderRFPsTable(filtered);
}

window.viewRFP = (id) => {
  window.open(`proposal.html?mode=poster&edit=${id}`, "_blank");
};

/******************************************************
 * 7. EVALUATIONS
 ******************************************************/
async function loadEvaluations() {
  try {
    const [respRes, evalRes] = await Promise.all([
      Shared.fetchGet(Config.ROUTES.getResponses),
      Shared.fetchGet(Config.ROUTES.getEvaluations)
    ]);
    responseData = respRes?.data || [];
    evaluationData = evalRes?.data || [];
    renderEvaluationsTable();
  } catch (err) {
    Shared.showMessage("Failed to load evaluations.", "error");
  }
}

function renderEvaluationsTable() {
  const tbody = document.querySelector("#evaluationsTable tbody");
  tbody.innerHTML = "";
  const filtered = filterByRFP(evaluationData);
  filtered.forEach(e => {
    const resp = responseData.find(r => r.ResponseID === e.ResponseID) || {};
    const rfp = rfpData.find(r => r.RFP_ID === e.RFP_ID) || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.ResponseID.slice(0,8)}</td>
      <td>${rfp.Title || "—"}</td>
      <td>${resp.ResponderName || "—"}</td>
      <td>${e.Score}</td>
      <td>${e.Rank || "?"}</td>
      <td>${e.ThresholdPass === "TRUE" ? "Yes" : "No"}</td>
      <td>${new Date(e.EvaluatedAt).toLocaleDateString()}</td>
      <td>
        <button class="btn-small btn-secondary" onclick="viewResponse('${e.ResponseID}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterByRFP(data) {
  const rfpID = document.getElementById("evalRFPFilter").value;
  return rfpID ? data.filter(e => e.RFP_ID === rfpID) : data;
}

function populateRFPFilter() {
  const select = document.getElementById("evalRFPFilter");
  select.innerHTML = `<option value="">-- All RFPs --</option>`;
  rfpData.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.RFP_ID;
    opt.textContent = `${r.Title} (${r.RFP_ID.slice(0,8)})`;
    select.appendChild(opt);
  });
}

function filterEvaluations() {
  renderEvaluationsTable();
}

window.viewResponse = (id) => {
  alert(`Response JSON:\n${JSON.stringify(
    responseData.find(r => r.ResponseID === id)?.ResponseJSON || {}, null, 2
  )}`);
};
