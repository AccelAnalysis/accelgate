/******************************************************
 * Accel Mailer Platform - Configuration File
 * ----------------------------------------------------
 * Defines Google Apps Script endpoints, Sheet tab names,
 * versioning metadata, and platform-wide constants.
 * ----------------------------------------------------
 * Author: Accel Analysis
 * Version: v1.0.0 (Apps Script Deployment)
 ******************************************************/

// === SYSTEM ENVIRONMENT SETTINGS ===
// Set this to "prod" when deployed as a live web app, or "dev" for localhost testing
const ENVIRONMENT = "prod";  // "dev" | "prod"

// === GOOGLE SHEET CONFIGURATION ===
const SHEET_ID = "10wq0EhBALOZ3nQI63nZBbE1p3_jErxeP3xFjmkagavA"; // Google Sheet ID from /d/<ID>/edit
const SHEET_URL = `https://docs.google.com/spreadsheets/d/10wq0EhBALOZ3nQI63nZBbE1p3_jErxeP3xFjmkagavA/edit`;

// === SHEET TAB NAMES ===
const SHEET_PROPOSALS = "Proposals";
const SHEET_PRICING   = "Pricing";
const SHEET_ADMINS    = "Admins";
const SHEET_CONFIG    = "Config";
const SHEET_RESPONSES = "Responses";

// === GOOGLE APPS SCRIPT ENDPOINTS ===
// Replace this URL with your actual published Web App endpoint
// (Deploy → New Deployment → Web App → "Anyone with the link" access)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyN7nj_UrThpxHFl6s_TS-F1BcOrgDA4L5KGUFzENLk788urumFR6LeaVwVKrVCNAIO/exec";

// === FRONTEND DATA ENDPOINTS (Derived) ===
const ENDPOINTS = {
  proposals: `${SCRIPT_URL}?type=proposals`,
  pricing:   `${SCRIPT_URL}?type=pricing`,
  config:    `${SCRIPT_URL}?type=config`,
  responses: `${SCRIPT_URL}?type=responses`,
  admin:     `${SCRIPT_URL}?type=admin`
};

// === DEFAULT UI SETTINGS ===
const DEFAULTS = {
  radiusMiles: 3,
  audienceType: "Residential",
  mailType: "Postcard",
  themeColor: "#2F5597",
  highlightColor: "#FFD965",
  inactiveColor: "#DCE6F5"
};

// === APP META INFORMATION ===
const APP_INFO = {
  name: "Accel Mailer",
  version: "1.0.0",
  author: "Accel Analysis",
  updated: "2025-11-08",
  description: "Direct mail targeting and proposal automation platform."
};

// === APP ROUTING (used by admin and proposal.js) ===
const ROUTES = {
  saveProposal: `${SCRIPT_URL}?action=saveProposal`,
  getProposals: `${SCRIPT_URL}?action=getProposals`,
  savePricing:  `${SCRIPT_URL}?action=savePricing`,
  getPricing:   `${SCRIPT_URL}?action=getPricing`,
  getConfig:    `${SCRIPT_URL}?action=getConfig`,
  saveConfig:   `${SCRIPT_URL}?action=saveConfig`
};

// === DEBUGGING UTILITIES ===
const DEBUG = {
  enabled: ENVIRONMENT === "dev",
  log: (...args) => {
    if (ENVIRONMENT === "dev") console.log("[DEBUG]", ...args);
  }
};

// === EXPORTS (for modular usage) ===
// These constants are globally available in browser scope.
// In case of modularization, you can wrap this file in a UMD export.
window.Config = {
  ENVIRONMENT,
  SHEET_ID,
  SHEET_URL,
  SCRIPT_URL,
  ENDPOINTS,
  DEFAULTS,
  APP_INFO,
  ROUTES,
  SHEET_PROPOSALS,
  SHEET_PRICING,
  SHEET_ADMINS,
  SHEET_CONFIG,
  SHEET_RESPONSES,
  DEBUG
};

/******************************************************
 * Usage Example:
 * 
 *   fetch(Config.ROUTES.saveProposal, { method: 'POST', body: JSON.stringify(payload) })
 *     .then(res => res.json())
 *     .then(data => console.log('Saved proposal:', data));
 *
 *   console.log(`Active Sheet URL: ${Config.SHEET_URL}`);
 ******************************************************/
