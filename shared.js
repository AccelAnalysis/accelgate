/******************************************************
 * Accel RFP Platform - Shared Utility Library
 * ----------------------------------------------------
 * Universal helpers for:
 *   • fetchGet / fetchPost (Apps Script backend)
 *   • Form serialization & population
 *   • Local cache (localStorage)
 *   • Toast notifications
 *   • Timestamp & payload helpers
 *   • NEW: Geocoding + Real Scoring Engine
 * ----------------------------------------------------
 * Depends on: config.js (must load first)
 ******************************************************/

if (!window.Config) {
  throw new Error("config.js must be loaded before shared.js");
}

/******************************************************
 * 1. FETCH WRAPPERS
 ******************************************************/
async function fetchGet(route, params = {}) {
  const url = new URL(route);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined) url.searchParams.append(k, v);
  });

  Config.DEBUG.log("GET →", url.toString());
  try {
    const res = await fetch(url, { method: "GET", cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    Config.DEBUG.log("GET ←", data);
    return data;
  } catch (err) {
    Config.DEBUG.error("fetchGet failed:", err);
    return { error: true, message: err.message };
  }
}

async function fetchPost(route, payload = {}) {
  Config.DEBUG.log("POST →", route, payload);
  try {
    const res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-cache",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    Config.DEBUG.log("POST ←", data);
    return data;
  } catch (err) {
    Config.DEBUG.error("fetchPost failed:", err);
    return { error: true, message: err.message };
  }
}

/******************************************************
 * 2. GEOCODING (Nominatim – no API key)
 ******************************************************/
async function geocodeAddress(address) {
  if (!address || address.trim() === "") return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AccelRFP/1.1 (contact@accelanalysis.com)' }
    });
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    throw new Error("No results found");
  } catch (err) {
    Config.DEBUG.error("Geocode failed:", err);
    return null;
  }
}

/******************************************************
 * 3. REAL SCORING ENGINE
 *    - Uses Template.ScoringJSON weights
 *    - Auto-scores numeric/range/select fields
 *    - Normalizes to 0–100 scale
 ******************************************************/
function calculateScore(responses, scoringWeights, fieldDefinitions = []) {
  if (!responses || !scoringWeights) return { score: 0, details: {} };

  const weights = scoringWeights;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
  let weightedScore = 0;
  const details = {};

  // Auto-score supported field types
  fieldDefinitions.forEach(field => {
    const key = field.name;
    const weight = weights[key] || 0;
    if (weight === 0) return;

    const value = responses[key];
    let fieldScore = 0;

    if (Config.SCORING.AUTO_SCORE_FIELDS.includes(field.type)) {
      // Assume max value = 10 for range/select, or use actual max
      const max = field.max || 10;
      fieldScore = (parseFloat(value) || 0) / max * 100;
    } else if (field.type === "text" || field.type === "textarea") {
      // Simple length-based heuristic (fallback)
      const len = (value || "").length;
      fieldScore = Math.min(len / 200, 1) * 100;
    }

    const contribution = (fieldScore * weight) / 100;
    weightedScore += contribution;
    details[key] = { value, fieldScore: fieldScore.toFixed(1), weight, contribution: contribution.toFixed(1) };
  });

  // Normalize to 0–100
  const finalScore = Math.round((weightedScore / totalWeight) * 100);
  const pass = finalScore >= Config.DEFAULTS.passThreshold;

  return {
    score: finalScore,
    pass,
    details,
    normalized: true
  };
}

/******************************************************
 * 4. FORM UTILITIES
 ******************************************************/
function formToJSON(form) {
  const data = {};
  const fd = new FormData(form);
  for (const [key, value] of fd.entries()) {
    const trimmed = typeof value === "string" ? value.trim() : value;
    data[key] = trimmed;
  }
  return data;
}

function populateForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (!el) return;
    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = !!value;
    } else if (el.tagName === "SELECT" && el.multiple) {
      const opts = Array.from(el.options);
      opts.forEach(opt => opt.selected = (value || []).includes(opt.value));
    } else {
      el.value = value ?? "";
    }
  });
}

/******************************************************
 * 5. LOCAL CACHE
 ******************************************************/
function saveCache(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
    Config.DEBUG.log("Cache saved:", key);
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
}

function loadCache(key, parse = true) {
  try {
    const val = localStorage.getItem(key);
    return parse && val ? JSON.parse(val) : val;
  } catch (e) {
    console.warn("localStorage load failed:", e);
    return null;
  }
}

function clearCache(key) {
  localStorage.removeItem(key);
}

/******************************************************
 * 6. PAYLOAD & TIME HELPERS
 ******************************************************/
function timestamp() {
  return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
}

function buildPayload(formData, extra = {}) {
  return {
    Timestamp: timestamp(),
    ...formData,
    ...extra,
    _version: Config.APP_INFO.version
  };
}

/******************************************************
 * 7. TOAST NOTIFICATIONS
 ******************************************************/
function showMessage(message, type = "info", duration = 3500) {
  const colors = {
    success: "#27ae60",
    error: "#c0392b",
    info: "#2980b9",
    warning: "#f39c12"
  };
  const bg = colors[type] || colors.info;

  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: bg,
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    zIndex: 10000,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    opacity: 0,
    transform: "translateY(20px)",
    transition: "all 0.3s ease",
    maxWidth: "320px",
    wordWrap: "break-word"
  });

  document.body.appendChild(toast);

  // Trigger reflow
  toast.offsetHeight;
  toast.style.opacity = 1;
  toast.style.transform = "translateY(0)";

  setTimeout(() => {
    toast.style.opacity = 0;
    toast.style.transform = "translateY(20px)";
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
}

/******************************************************
 * 8. EXPORT
 ******************************************************/
window.Shared = {
  fetchGet,
  fetchPost,
  geocodeAddress,
  calculateScore,
  formToJSON,
  populateForm,
  saveCache,
  loadCache,
  clearCache,
  timestamp,
  buildPayload,
  showMessage
};
