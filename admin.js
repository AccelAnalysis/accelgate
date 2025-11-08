/******************************************************
 * Accel Mailer Platform - Admin Console Logic
 * ----------------------------------------------------
 * Provides CRUD operations for:
 *   • Config defaults (Config sheet)
 *   • Pricing tiers (Pricing sheet)
 *   • Submitted proposals (Proposals sheet)
 * ----------------------------------------------------
 * Depends on: config.js, shared.js
 ******************************************************/

let pricingTable = [];
let proposals = [];
let configDefaults = {};

/******************************************************
 * 1️⃣ INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  await loadConfigDefaults();
  await loadPricingList();
  await loadProposals();
});

/******************************************************
 * 2️⃣ EVENT BINDINGS
 ******************************************************/
function bindUI() {
  // === Navigation ===
  document.getElementById("backToFormBtn").addEventListener("click", () => {
    window.location.href = "proposal.html";
  });

  // === Config Form ===
  document.getElementById("configForm").addEventListener("submit", saveConfig);

  // === Pricing Form ===
  document.getElementById("pricingForm").addEventListener("submit", savePricingTier);
  document.getElementById("refreshPricingBtn").addEventListener("click", loadPricingList);

  // === Proposals Section ===
  document.getElementById("refreshProposalsBtn").addEventListener("click", loadProposals);
  document.getElementById("proposalSearch").addEventListener("input", filterProposals);
}

/******************************************************
 * 3️⃣ LOAD CONFIG DEFAULTS
 ******************************************************/
async function loadConfigDefaults() {
  try {
    const response = await Shared.fetchGet(Config.ROUTES.getConfig);
    if (response?.data && Array.isArray(response.data)) {
      configDefaults = Object.fromEntries(response.data.map((r) => [r.Field, r.Value]));
      populateConfigForm();
      Config.DEBUG.log("Loaded Config Defaults:", configDefaults);
    } else {
      console.warn("Config response invalid or empty.");
    }
  } catch (err) {
    console.error("Failed to load config defaults:", err);
    Shared.showMessage("Error loading configuration defaults.", "error");
  }
}

function populateConfigForm() {
  document.getElementById("DefaultRadius").value =
    configDefaults.DefaultRadius || Config.DEFAULTS.radiusMiles;
  document.getElementById("DefaultAudienceType").value =
    configDefaults.DefaultAudienceType || Config.DEFAULTS.audienceType;
  document.getElementById("DefaultMailType").value =
    configDefaults.DefaultMailType || Config.DEFAULTS.mailType;
}

/******************************************************
 * 4️⃣ SAVE CONFIG DEFAULTS
 ******************************************************/
async function saveConfig(e) {
  e.preventDefault();
  const data = Shared.formToJSON(e.target);
  const payload = Shared.buildPayload(data);
  Shared.showMessage("Saving defaults...", "info");

  try {
    const result = await Shared.fetchPost(Config.ROUTES.saveConfig, payload);
    if (result && !result.error) {
      Shared.showMessage("Defaults saved successfully!", "success");
      await loadConfigDefaults();
    } else {
      throw new Error(result.message || "Save failed");
    }
  } catch (err) {
    console.error("Save config error:", err);
    Shared.showMessage("Failed to save defaults.", "error");
  }
}

/******************************************************
 * 5️⃣ LOAD & RENDER PRICING TABLE
 ******************************************************/
async function loadPricingList() {
  const tableBody = document.querySelector("#pricingTable tbody");
  tableBody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;

  try {
    const response = await Shared.fetchGet(Config.ROUTES.getPricing);
    pricingTable = response?.data || [];
    renderPricingTable(pricingTable);
  } catch (err) {
    console.error("Failed to load pricing:", err);
    Shared.showMessage("Error loading pricing tiers.", "error");
  }
}

function renderPricingTable(list) {
  const tableBody = document.querySelector("#pricingTable tbody");
  tableBody.innerHTML = "";

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="7">No pricing tiers found.</td></tr>`;
    return;
  }

  list.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.MailType || ""}</td>
      <td>${p.Size || ""}</td>
      <td>${Number(p.BaseRate || 0).toFixed(2)}</td>
      <td>${p.StepQty || ""}</td>
      <td>${Number(p.StepRate || 0).toFixed(2)}</td>
      <td>${p.Description || ""}</td>
      <td>${p.Active || ""}</td>
    `;
    row.addEventListener("click", () => populatePricingForm(p));
    tableBody.appendChild(row);
  });

  Shared.showMessage(`Loaded ${list.length} pricing tiers.`, "success");
}

/******************************************************
 * 6️⃣ SAVE / UPDATE PRICING TIER
 ******************************************************/
async function savePricingTier(e) {
  e.preventDefault();
  const data = Shared.formToJSON(e.target);
  const payload = Shared.buildPayload(data);
  Shared.showMessage("Saving pricing tier...", "info");

  try {
    const result = await Shared.fetchPost(Config.ROUTES.savePricing, payload);
    if (result && !result.error) {
      Shared.showMessage("Pricing tier saved successfully!", "success");
      e.target.reset();
      await loadPricingList();
    } else {
      throw new Error(result.message || "Save failed");
    }
  } catch (err) {
    console.error("Save pricing error:", err);
    Shared.showMessage("Failed to save pricing tier.", "error");
  }
}

function populatePricingForm(p) {
  document.getElementById("MailType").value = p.MailType || "";
  document.getElementById("Size").value = p.Size || "";
  document.getElementById("BaseRate").value = p.BaseRate || "";
  document.getElementById("StepQty").value = p.StepQty || "";
  document.getElementById("StepRate").value = p.StepRate || "";
  document.getElementById("Description").value = p.Description || "";
  document.getElementById("Active").value = p.Active || "TRUE";
  Shared.showMessage("Loaded pricing tier for editing.", "info");
}

/******************************************************
 * 7️⃣ LOAD & RENDER PROPOSALS
 ******************************************************/
async function loadProposals() {
  const tableBody = document.querySelector("#proposalTable tbody");
  tableBody.innerHTML = `<tr><td colspan="10">Loading proposals...</td></tr>`;

  try {
    const response = await Shared.fetchGet(Config.ROUTES.getProposals);
    proposals = response?.data || [];
    renderProposalsTable(proposals);
  } catch (err) {
    console.error("Failed to load proposals:", err);
    Shared.showMessage("Error loading proposals.", "error");
  }
}

function renderProposalsTable(list) {
  const tableBody = document.querySelector("#proposalTable tbody");
  tableBody.innerHTML = "";

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="10">No proposals found.</td></tr>`;
    return;
  }

  list.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.Timestamp || ""}</td>
      <td>${p.BusinessName || ""}</td>
      <td>${p.ContactName || ""}</td>
      <td>${p.Email || ""}</td>
      <td>${p.Phone || ""}</td>
      <td>${p.MailType || ""}</td>
      <td>${p.Quantity || ""}</td>
      <td>$${Number(p.EstimatedTotal || 0).toLocaleString()}</td>
      <td>${p.RadiusMiles || ""}</td>
      <td>${p.Status || "Pending"}</td>
    `;
    tableBody.appendChild(row);
  });

  Shared.showMessage(`Loaded ${list.length} proposals.`, "success");
}

/******************************************************
 * 8️⃣ FILTER PROPOSALS
 ******************************************************/
function filterProposals(e) {
  const term = e.target.value.toLowerCase();
  const filtered = proposals.filter(
    (p) =>
      (p.BusinessName && p.BusinessName.toLowerCase().includes(term)) ||
      (p.Email && p.Email.toLowerCase().includes(term))
  );
  renderProposalsTable(filtered);
}
