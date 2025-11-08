/******************************************************
 * Accel RFP Platform - Configuration File
 * ----------------------------------------------------
 * Central source of truth for:
 *   • Google Apps Script Web App URL
 *   • Google Sheet ID & structure
 *   • API endpoints (GET/POST)
 *   • Default values & UI constants
 *   • Debug mode & environment
 * ----------------------------------------------------
 * Used by: shared.js, app.js, proposal.js, admin.js
 ******************************************************/

// === ENVIRONMENT ===
const ENVIRONMENT = "prod"; // "dev" | "prod"

// === GOOGLE SHEET CONFIG ===
const SHEET_ID = "10wq0EhBALOZ3nQI63nZBbE1p3_jErxeP3xFjmkagavA"; // REPLACE WITH YOUR SHEET ID
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

// === SHEET TAB NAMES ===
const SHEET_CONFIG     = "Config";
const SHEET_PRICING    = "Pricing";
const SHEET_TEMPLATES  = "Templates";
const SHEET_RFPS       = "RFPs";
const SHEET_RESPONSES  = "Responses";
const SHEET_EVALUATIONS = "Evaluations";
const SHEET_ADMINS     = "Admins";

// === GOOGLE APPS SCRIPT WEB APP URL ===
// Deploy → New Deployment → Web App → Execute as: Me → Who has access: Anyone
// Paste the EXEC URL below after deployment
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyN7nj_UrThpxHFl6s_TS-F1BcOrgDA4L5KGUFzENLk788urumFR6LeaVwVKrVCNAIO/exec"; // REPLACE AFTER DEPLOYMENT

// === API ENDPOINTS ===
const ROUTES = {
  // Config
  getConfig:    `${SCRIPT_URL}?action=getConfig`,
  saveConfig:   `${SCRIPT_URL}?action=saveConfig`,

  // Pricing
  getPricing:   `${SCRIPT_URL}?action=getPricing`,
  savePricing:  `${SCRIPT_URL}?action=savePricing`,

  // RFP Templates
  getTemplates: `${SCRIPT_URL}?action=getTemplates`,
  saveTemplate: `${SCRIPT_URL}?action=saveTemplate`,

  // RFPs
  getRFPs:      `${SCRIPT_URL}?action=getRFPs`,
  saveRFP:      `${SCRIPT_URL}?action=saveRFP`,

  // Responses
  saveResponse: `${SCRIPT_URL}?action=saveResponse`,
  getResponses: `${SCRIPT_URL}?action=getResponses`,

  // Evaluations & Scoring
  evaluateResponse: `${SCRIPT_URL}?action=evaluateResponse`,
  getEvaluations:   `${SCRIPT_URL}?action=getEvaluations`,

  // Admin
  getAdmins:    `${SCRIPT_URL}?action=getAdmins`
};

// === DEFAULT UI & SYSTEM VALUES ===
const DEFAULTS = {
  radiusMiles: 5,
  zoomLevel: 10,
  themeColor: "#2F5597",
  highlightColor: "#FFD965",
  posterModeColor: "#2F5597",
  responderModeColor: "#9C27B0",
  mapCenter: [39.8283, -98.5795], // Geographic center of USA
  minQuantity: 100,
  maxRadius: 50
};

// === APP METADATA ===
const APP_INFO = {
  name: "Accel RFP Platform",
  version: "1.0.0",
  description: "Map-based RFP creation, distribution, and automated evaluation system",
  author: "Accel Analysis",
  updated: "2025-11-08"
};

// === DEBUG UTILITIES ===
const DEBUG = {
  enabled: ENVIRONMENT === "dev",
  log: (...args) => {
    if (ENVIRONMENT === "dev") console.log("[RFP DEBUG]", ...args);
  },
  error: (...args) => {
    console.error("[RFP ERROR]", ...args);
  }
};

// === EXPORT TO WINDOW (for shared.js & page scripts) ===
window.Config = {
  ENVIRONMENT,
  SHEET_ID,
  SHEET_URL,
  SCRIPT_URL,
  ROUTES,
  DEFAULTS,
  APP_INFO,
  DEBUG,
  // Sheet names (for reference)
  SHEET_CONFIG,
  SHEET_PRICING,
  SHEET_TEMPLATES,
  SHEET_RFPS,
  SHEET_RESPONSES,
  SHEET_EVALUATIONS,
  SHEET_ADMINS
};

/******************************************************
 * QUICK TEST (open browser console):
 *   console.log(Config.ROUTES.getRFPs);
 *   console.log(Config.SHEET_URL);
 ******************************************************/
