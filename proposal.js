/******************************************************
 * Accel Mailer Platform - Proposal Form Logic
 * ----------------------------------------------------
 * Handles proposal creation, prefill defaults,
 * dynamic pricing calculation, and submission.
 * ----------------------------------------------------
 * Depends on: config.js, shared.js
 ******************************************************/

let proposalMap;
let pricingTable = [];
let configDefaults = {};

/******************************************************
 * 1️⃣ INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  bindUI();
  await loadDefaults();
  await loadPricing();
});

/******************************************************
 * 2️⃣ LOAD CONFIG DEFAULTS
 ******************************************************/
async function loadDefaults() {
  try {
    const response = await Shared.fetchGet(Config.ROUTES.getConfig);
    if (response?.data && Array.isArray(response.data)) {
      configDefaults = Object.fromEntries(
        response.data.map((r) => [r.Field, r.Value])
      );
      applyDefaults();
      Config.DEBUG.log("Config defaults loaded:", configDefaults);
    } else {
      console.warn("Config fetch returned empty or invalid.");
    }
  } catch (err) {
    console.error("Config load failed:", err);
    Shared.showMessage("Failed to load default settings.", "error");
  }
}

function applyDefaults() {
  document.getElementById("RadiusMiles").value =
    configDefaults.DefaultRadius || Config.DEFAULTS.radiusMiles;
  document.getElementById("AudienceType").value =
    configDefaults.DefaultAudienceType || Config.DEFAULTS.audienceType;
  document.getElementById("MailType").value =
    configDefaults.DefaultMailType || "Postcard 4x6";
}

/******************************************************
 * 3️⃣ LOAD PRICING TABLE
 ******************************************************/
async function loadPricing() {
  try {
    const response = await Shared.fetchGet(Config.ROUTES.getPricing);
    if (response?.data && Array.isArray(response.data)) {
      pricingTable = response.data.filter((r) => r.Active === "TRUE" || r.Active === true);
      Config.DEBUG.log("Pricing table loaded:", pricingTable);
    } else {
      console.warn("Pricing fetch returned empty or invalid.");
    }
  } catch (err) {
    console.error("Pricing load failed:", err);
    Shared.showMessage("Failed to load pricing data.", "error");
  }
}

/******************************************************
 * 4️⃣ MAP INITIALIZATION
 ******************************************************/
function initMap() {
  proposalMap = L.map("proposalMap", {
    center: [37.09, -95.71], // Default to US center
    zoom: 4,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
  }).addTo(proposalMap);

  // Add radius ring when clicked
  proposalMap.on("click", (e) => {
    const miles = parseFloat(document.getElementById("RadiusMiles").value) || 3;
    drawProposalRing(e.latlng, miles);
  });

  Config.DEBUG.log("Proposal map initialized.");
}

function drawProposalRing(center, miles) {
  // Clear previous rings
  proposalMap.eachLayer((layer) => {
    if (layer instanceof L.Circle) proposalMap.removeLayer(layer);
  });

  L.circle(center, {
    radius: miles * 1609.34,
    color: Config.DEFAULTS.themeColor,
    fillOpacity: 0.05,
  }).addTo(proposalMap);

  Config.DEBUG.log(`Drew ring at ${center.lat}, ${center.lng} (${miles} mi)`);
}

/******************************************************
 * 5️⃣ UI EVENT BINDINGS
 ******************************************************/
function bindUI() {
  const form = document.getElementById("proposalForm");
  const qtyInput = document.getElementById("Quantity");
  const mailTypeSelect = document.getElementById("MailType");

  qtyInput.addEventListener("input", updateEstimate);
  mailTypeSelect.addEventListener("change", updateEstimate);

  form.addEventListener("submit", onSubmitProposal);

  document.getElementById("backToMapBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

/******************************************************
 * 6️⃣ ESTIMATION CALCULATION
 ******************************************************/
function updateEstimate() {
  const mailType = document.getElementById("MailType").value;
  const qty = parseInt(document.getElementById("Quantity").value) || 0;

  if (!pricingTable.length) {
    Shared.showMessage("Pricing not yet loaded.", "info");
    return;
  }

  const tier = pricingTable.find(
    (p) => p.MailType === mailType || p.Size === mailType
  );

  const baseRate = parseFloat(tier?.BaseRate || 0);
  const stepQty = parseInt(tier?.StepQty || 500);
  const stepRate = parseFloat(tier?.StepRate || baseRate);
  const perPieceRate = qty >= stepQty ? stepRate : baseRate;
  const total = qty * perPieceRate;

  document.getElementById("baseRate").textContent = `$${baseRate.toFixed(2)}`;
  document.getElementById("ratePerPiece").textContent = `$${perPieceRate.toFixed(2)}`;
  document.getElementById("estTotal").textContent = `$${total.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  Config.DEBUG.log("Estimate updated:", { mailType, qty, baseRate, perPieceRate, total });
}

/******************************************************
 * 7️⃣ FORM SUBMISSION
 ******************************************************/
async function onSubmitProposal(e) {
  e.preventDefault();

  const form = document.getElementById("proposalForm");
  const data = Shared.formToJSON(form);
  const miles = parseFloat(document.getElementById("RadiusMiles").value);
  const total = document.getElementById("estTotal").textContent.replace(/[^0-9.]/g, "");

  const payload = Shared.buildPayload(data, {
    EstimatedTotal: parseFloat(total),
    RadiusMiles: miles,
    appVersion: Config.APP_INFO.version,
  });

  Shared.showMessage("Submitting proposal...", "info");
  const result = await Shared.fetchPost(Config.ROUTES.saveProposal, payload);

  if (result && !result.error) {
    Shared.showMessage("Proposal submitted successfully!", "success");
    form.reset();
    applyDefaults();
    updateEstimate();
  } else {
    Shared.showMessage("Submission failed. Please try again.", "error");
  }
}

/******************************************************
 * 8️⃣ OPTIONAL: AUTOFILL EXAMPLE (prefilled proposals)
 ******************************************************/
function prefillProposal(data) {
  const form = document.getElementById("proposalForm");
  if (data) Shared.populateForm(form, data);
  updateEstimate();
}
