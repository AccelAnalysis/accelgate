/******************************************************
 * Accel Mailer Platform - Shared Utility Library
 * ----------------------------------------------------
 * Provides universal helpers for:
 *   • Fetching data from Apps Script
 *   • Submitting JSON payloads
 *   • Serializing and deserializing form data
 *   • Caching, logging, and UI utilities
 * ----------------------------------------------------
 * Depends on: config.js
 * Author: Accel Analysis
 ******************************************************/

if (!window.Config) {
  console.error("Config.js must be loaded before Shared.js");
}

/******************************************************
 * 1️⃣ UNIVERSAL FETCH WRAPPERS
 ******************************************************/

/**
 * Perform a GET request to the Apps Script backend.
 * @param {string} route - The endpoint URL (from Config.ROUTES or Config.ENDPOINTS).
 * @param {object} [params] - Optional query parameters as key/value pairs.
 * @returns {Promise<object>} Parsed JSON response.
 */
async function fetchGet(route, params = {}) {
  const url = new URL(route);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  try {
    Config.DEBUG.log("GET:", url.toString());
    const res = await fetch(url, { method: "GET", cache: "no-cache" });
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    const data = await res.json();
    Config.DEBUG.log("GET Response:", data);
    return data;
  } catch (err) {
    console.error("Fetch GET error:", err);
    return { error: true, message: err.message };
  }
}

/**
 * Perform a POST request to the Apps Script backend.
 * @param {string} route - The endpoint URL (from Config.ROUTES or Config.ENDPOINTS).
 * @param {object} payload - The JSON payload to send.
 * @returns {Promise<object>} Parsed JSON response.
 */
async function fetchPost(route, payload) {
  try {
    Config.DEBUG.log("POST:", route, payload);
    const res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-cache",
    });
    if (!res.ok) throw new Error(`POST ${route} failed: ${res.status}`);
    const data = await res.json();
    Config.DEBUG.log("POST Response:", data);
    return data;
  } catch (err) {
    console.error("Fetch POST error:", err);
    return { error: true, message: err.message };
  }
}

/******************************************************
 * 2️⃣ FORM SERIALIZATION UTILITIES
 ******************************************************/

/**
 * Convert a standard HTML form into a JSON object.
 * @param {HTMLFormElement} form - The form element.
 * @returns {object} Key/value pairs representing form data.
 */
function formToJSON(form) {
  const data = {};
  const fd = new FormData(form);
  for (const [key, value] of fd.entries()) {
    data[key] = value.trim();
  }
  return data;
}

/**
 * Populate a form with values from a JSON object.
 * @param {HTMLFormElement} form - The form element.
 * @param {object} data - Key/value pairs to populate.
 */
function populateForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (!el) return;
    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = !!value;
    } else {
      el.value = value;
    }
  });
}

/******************************************************
 * 3️⃣ STORAGE & CACHE HELPERS
 ******************************************************/

/**
 * Save an object to localStorage.
 * @param {string} key
 * @param {object} data
 */
function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    Config.DEBUG.log("Cache saved:", key);
  } catch (err) {
    console.warn("Cache save failed:", err);
  }
}

/**
 * Retrieve an object from localStorage.
 * @param {string} key
 * @param {boolean} [parse=true] Whether to parse JSON.
 * @returns {any}
 */
function loadCache(key, parse = true) {
  const val = localStorage.getItem(key);
  if (!val) return null;
  return parse ? JSON.parse(val) : val;
}

/**
 * Remove an item from localStorage.
 * @param {string} key
 */
function clearCache(key) {
  localStorage.removeItem(key);
}

/******************************************************
 * 4️⃣ SHEET & DATA HELPERS
 ******************************************************/

/**
 * Create a timestamp in the same format as Google Sheets.
 * @returns {string} Formatted timestamp
 */
function timestamp() {
  return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
}

/**
 * Build a standardized proposal or response payload.
 * @param {object} formData - The serialized form data.
 * @param {object} [extra] - Additional fields to merge.
 * @returns {object} Final payload with timestamp and metadata.
 */
function buildPayload(formData, extra = {}) {
  return {
    Timestamp: timestamp(),
    ...formData,
    ...extra,
    appVersion: Config.APP_INFO.version,
  };
}

/******************************************************
 * 5️⃣ ERROR & STATUS UTILITIES
 ******************************************************/

/**
 * Display a toast notification or fallback alert.
 * @param {string} message - Message to show.
 * @param {"success"|"error"|"info"} [type="info"] - Type of notification.
 */
function showMessage(message, type = "info") {
  const color = type === "error" ? "#c0392b" : type === "success" ? "#27ae60" : "#2980b9";
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: color,
    color: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    zIndex: 9999,
    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
    opacity: "0.95",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/******************************************************
 * 6️⃣ EXPORTS
 ******************************************************/
window.Shared = {
  fetchGet,
  fetchPost,
  formToJSON,
  populateForm,
  saveCache,
  loadCache,
  clearCache,
  timestamp,
  buildPayload,
  showMessage,
};
