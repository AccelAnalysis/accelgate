/******************************************************
 * Accel RFP Platform - Admin Dashboard Logic
 * ----------------------------------------------------
 * Features:
 *   • Template CRUD with JSON validation
 *   • NEW: Profile CRUD with HQ + multiple sites
 *   • Pin color & icon editing
 *   • Evaluation filtering & scoring details
 * ----------------------------------------------------
 * Depends on: config.js, shared.js, admin.html
 ******************************************************/

let activeTab = "templates";
let currentProfile = null;
let siteCounter = 0;

/******************************************************
 * 1. INITIALIZATION
 ******************************************************/
document.addEventListener("DOMContentLoaded", () => {
  bindNav();
  bindForms();
  bindFilters();
  loadActiveTab();
});

/******************************************************
 * 2. NAVIGATION
 ******************************************************/
function bindNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.dataset.tab;
      showTab(activeTab);
    });
  });

  document.getElementById("backToMapBtn").addEventListener("click", () => {
    location.href = "index.html";
  });
}

function showTab(tab) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
  document.getElementById(tab + "Tab").classList.remove("hidden");
  loadActiveTab();
}

async function loadActiveTab() {
  if (activeTab === "templates") await loadTemplates();
  if (activeTab === "profiles") await loadProfiles();
  if (activeTab === "evaluations") await loadEvaluations();
}

/******************************************************
 * 3. TEMPLATES
 ******************************************************/
async function loadTemplates() {
  const tbody = document.querySelector("#templatesTable tbody");
  tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getTemplates);
    if (res?.data) {
      tbody.innerHTML = "";
      res.data.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.TemplateID}</td>
          <td>${t.Name}</td>
          <td>${t.Industry}</td>
          <td>
            <button class="btn-small" onclick="editTemplate('${t.TemplateID}')">Edit</button>
            <button class="btn-small" style="background:#c0392b;color:white;" onclick="deleteTemplate('${t.TemplateID}')">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='4'>Error loading templates.</td></tr>";
  }
}

window.editTemplate = async (id) => {
  const res = await Shared.fetchGet(Config.ROUTES.getTemplates, { id });
  const t = res?.data?.[0];
  if (!t) return;
  document.getElementById("templateId").value = t.TemplateID;
  document.getElementById("templateName").value = t.Name;
  document.getElementById("templateIndustry").value = t.Industry;
  document.getElementById("fieldsJSON").value = t.FieldsJSON;
  document.getElementById("scoringJSON").value = t.ScoringJSON || "";
  showTab("templates");
};

window.deleteTemplate = async (id) => {
  if (!confirm("Delete this template?")) return;
  await Shared.fetchPost(Config.ROUTES.saveTemplate, { TemplateID: id, _delete: true });
  loadTemplates();
};

/******************************************************
 * 4. PROFILES (NEW)
 ******************************************************/
async function loadProfiles() {
  const tbody = document.querySelector("#profilesTable tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getProfiles);
    if (res?.data) {
      tbody.innerHTML = "";
      res.data.forEach(p => {
        const siteCount = (p.Site_Addresses || '').split('|').filter(Boolean).length;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${p.UserID}</td>
          <td>${p.OrgName}</td>
          <td>${p.HQ_Address}</td>
          <td>${siteCount}</td>
          <td>
            <button class="btn-small" onclick="editProfile('${p.UserID}')">Edit</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='5'>Error loading profiles.</td></tr>";
  }
}

window.editProfile = async (userId) => {
  const res = await Shared.fetchGet(Config.ROUTES.getProfiles, { id: userId });
  currentProfile = res?.data?.[0];
  if (!currentProfile) return;

  document.getElementById("profileUserId").value = currentProfile.UserID;
  document.getElementById("orgName").value = currentProfile.OrgName;
  document.getElementById("hqAddress").value = currentProfile.HQ_Address;
  document.getElementById("hqLat").value = currentProfile.HQ_Lat;
  document.getElementById("hqLng").value = currentProfile.HQ_Lng;
  document.getElementById("pinColor").value = currentProfile.PinColor || "#FFD965";
  document.getElementById("pinIcon").value = currentProfile.PinIcon || "hq";

  renderSiteList();
  showTab("profiles");
};

function renderSiteList() {
  const container = document.getElementById("siteList");
  container.innerHTML = "";
  siteCounter = 0;

  const siteAddrs = (currentProfile?.Site_Addresses || '').split('|').filter(Boolean);
  const siteLats = (currentProfile?.Site_Lats || '').split('|').filter(Boolean);
  const siteLngs = (currentProfile?.Site_Lngs || '').split('|').filter(Boolean);

  siteAddrs.forEach((addr, i) => addSiteRow(addr, siteLats[i], siteLngs[i]));
}

function addSiteRow(address = "", lat = "", lng = "") {
  const id = `site_${siteCounter++}`;
  const div = document.createElement("div");
  div.className = "form-grid";
  div.style.marginBottom = "1rem";
  div.innerHTML = `
    <div>
      <label>Site Address</label>
      <input type="text" data-site="addr" value="${address}" placeholder="Enter address" />
      <button type="button" class="btn-small" data-geocode="${id}">Geocode</button>
    </div>
    <div>
      <label>Lat</label>
      <input type="number" step="any" data-site="lat" value="${lat}" readonly />
    </div>
    <div>
      <label>Lng</label>
      <input type="number" step="any" data-site="lng" value="${lng}" readonly />
    </div>
    <div style="align-self:end;">
      <button type="button" class="btn-small" style="background:#c0392b;color:white;" onclick="this.parentElement.parentElement.remove()">Remove</button>
    </div>
  `;

  // Geocode button
  div.querySelector(`[data-geocode="${id}"]`).addEventListener("click", async () => {
    const addrInput = div.querySelector(`[data-site="addr"]`);
    const result = await Shared.geocodeAddress(addrInput.value);
    if (result) {
      div.querySelector(`[data-site="lat"]`).value = result.lat.toFixed(6);
      div.querySelector(`[data-site="lng"]`).value = result.lng.toFixed(6);
    } else {
      Shared.showMessage("Address not found.", "error");
    }
  });

  document.getElementById("siteList").appendChild(div);
}

/******************************************************
 * 5. FORM BINDINGS
 ******************************************************/
function bindForms() {
  // Template Form
  document.getElementById("templateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Shared.formToJSON(e.target);
    try {
      JSON.parse(data.FieldsJSON);
      if (data.ScoringJSON) JSON.parse(data.ScoringJSON);
    } catch (err) {
      Shared.showMessage("Invalid JSON in fields or scoring.", "error");
      return;
    }
    await Shared.fetchPost(Config.ROUTES.saveTemplate, data);
    Shared.showMessage("Template saved.", "success");
    e.target.reset();
    loadTemplates();
  });

  document.getElementById("clearTemplateBtn").addEventListener("click", () => {
    document.getElementById("templateForm").reset();
    document.getElementById("templateId").value = "";
  });

  // Profile Form
  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Shared.formToJSON(e.target);

    // Collect sites
    const siteAddrs = [], siteLats = [], siteLngs = [];
    document.querySelectorAll("#siteList > div").forEach(row => {
      const addr = row.querySelector(`[data-site="addr"]`).value.trim();
      const lat = row.querySelector(`[data-site="lat"]`).value;
      const lng = row.querySelector(`[data-site="lng"]`).value;
      if (addr && lat && lng) {
        siteAddrs.push(addr);
        siteLats.push(lat);
        siteLngs.push(lng);
      }
    });

    data.Site_Addresses = siteAddrs.join('|');
    data.Site_Lats = siteLats.join('|');
    data.Site_Lngs = siteLngs.join('|');

    await Shared.fetchPost(Config.ROUTES.saveProfile, data);
    Shared.showMessage("Profile saved.", "success");
    e.target.reset();
    currentProfile = null;
    loadProfiles();
  });

  document.getElementById("clearProfileBtn").addEventListener("click", () => {
    document.getElementById("profileForm").reset();
    document.getElementById("siteList").innerHTML = "";
    currentProfile = null;
  });

  document.getElementById("addSiteBtn").addEventListener("click", () => addSiteRow());

  // HQ Geocode
  document.getElementById("geocodeHQBtn").addEventListener("click", async () => {
    const addr = document.getElementById("hqAddress").value;
    const result = await Shared.geocodeAddress(addr);
    if (result) {
      document.getElementById("hqLat").value = result.lat.toFixed(6);
      document.getElementById("hqLng").value = result.lng.toFixed(6);
    } else {
      Shared.showMessage("HQ address not found.", "error");
    }
  });
}

/******************************************************
 * 6. EVALUATIONS
 ******************************************************/
async function loadEvaluations() {
  const tbody = document.querySelector("#evaluationsTable tbody");
  tbody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";
  try {
    const res = await Shared.fetchGet(Config.ROUTES.getEvaluations);
    if (res?.data) {
      tbody.innerHTML = "";
      res.data.forEach(e => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${e.ResponseID}</td>
          <td>${e.RFP_ID}</td>
          <td>${e.Score}</td>
          <td>${e.Pass === "TRUE" ? "Yes" : "No"}</td>
          <td>${e.Timestamp}</td>
          <td><button class="btn-small" onclick="viewEvaluation('${e.ResponseID}')">View</button></td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='6'>Error loading evaluations.</td></tr>";
  }
}

window.viewEvaluation = async (responseId) => {
  const res = await Shared.fetchGet(Config.ROUTES.getResponses, { id: responseId });
  const r = res?.data?.[0];
  if (!r) return;

  const details = JSON.parse(r.ScoreDetails || "{}");
  let html = `<h3>Response #${r.ResponseID}</h3><pre>${JSON.stringify(details, null, 2)}</pre>`;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalOverlay").classList.remove("hidden");
};

function bindFilters() {
  document.getElementById("applyEvalFilterBtn").addEventListener("click", loadEvaluations);
}

/******************************************************
 * 7. MODAL
 ******************************************************/
document.getElementById("modalClose").addEventListener("click", () => {
  document.getElementById("modalOverlay").classList.add("hidden");
});
document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target.id === "modalOverlay") document.getElementById("modalOverlay").classList.add("hidden");
});
