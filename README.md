# 📬 AccelGate

**A Map-Based Direct Mail Targeting & Proposal Platform**
Developed by **Accel Analysis | Industrial Diplomacy Division**

---

## 🧭 Overview

AccelGate is a modular web platform for designing, evaluating, and managing direct-mail campaigns.
It features:

* **Interactive mapping** for geographic targeting (Leaflet.js)
* **Proposal generation** with live pricing estimates
* **Admin dashboard** for pricing, config, and proposal review
* **Google Sheets + Apps Script backend** for persistence and automation

---

## 📁 Project Structure

```
accel_mailer_project/
│
├── index.html         → Main interface (Map Console)
├── app.js             → Core map logic & dataset handling
│
├── proposal.html      → Client-facing proposal form
├── proposal.js        → Loads defaults, pricing, live estimate, submit handler
│
├── admin.html         → Admin dashboard for pricing/config/proposals
├── admin.js           → CRUD logic using shared.js
│
├── shared.js          → Common fetch helpers, serializers, cache, UI utilities
├── config.js          → Constants (Sheet IDs, routes, defaults)
│
├── styles.css         → Unified styling (blue-gold palette, responsive)
├── Code.gs            → Google Apps Script backend for Sheets
│
└── README.md          → Project documentation
```

---

## ⚙️ Dependencies

| Type                 | Name / Version                         | Purpose                        |
| -------------------- | -------------------------------------- | ------------------------------ |
| **Frontend Libs**    | [Leaflet 1.9.4](https://leafletjs.com) | Mapping & radius visualization |
|                      | Google Fonts (Inter 400/600)           | Typography                     |
| **Backend Platform** | Google Apps Script                     | JSON API + Sheet CRUD          |
| **Data Store**       | Google Sheets                          | Primary persistence layer      |
| **Browser Support**  | Chrome 100+, Safari 15+, Firefox 100+  | Tested modern browsers         |

---

## 🧩 Google Sheets Setup

### Required Tabs (automatic via `setup()` in Code.gs)

| Sheet Name    | Purpose                     | Headers                                                                                                                                                                               |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Config**    | Default UI & logic settings | `Field`, `Value`, `Description`                                                                                                                                                       |
| **Pricing**   | Mail type tiers & rates     | `MailType`, `Size`, `BaseRate`, `StepQty`, `StepRate`, `Description`, `Active`                                                                                                        |
| **Proposals** | Captures form submissions   | `Timestamp`, `Proposal ID`, `BusinessName`, `ContactName`, `Email`, `Phone`, `AudienceType`, `MailType`, `Quantity`, `EstimatedTotal`, `RadiusMiles`, `ZipsCities`, `Notes`, `Status` |
| **Responses** | Optional reply storage      | `Timestamp`, `ResponderID`, `ProposalID`, `Name`, `Email`, `Message`, `Rating`                                                                                                        |
| **Admins**    | Optional login or user list | `Username`, `PasswordHash`, `Role`, `Email`                                                                                                                                           |

Run the `setup()` function once from the Apps Script editor to auto-create and headerize these tabs.

---

## 🧠 Google Apps Script Deployment

1. **Open** your target Google Sheet.
2. **Extensions → Apps Script → New Project**.
3. Paste the contents of **`Code.gs`**.
4. Click ▶️ **Run → setup()** to initialize tabs.
5. Deploy the web app:

   * **Deploy → New deployment → Web app**
   * *Execute as*: Me (developer)
   * *Who has access*: Anyone with the link
6. Copy the Web App URL (ending in `/exec`) and set it in **`config.js`**:

   ```js
   const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
   ```

---

## 🖥️ Local Testing & Development

### 1. Run a Local Server

In the project directory:

```bash
python3 -m http.server 8000
```

or use VS Code → **Live Server**.

Visit: **[http://localhost:8000/index.html](http://localhost:8000/index.html)**

### 2. Configure Environment

Edit `config.js`:

```js
const ENVIRONMENT = "dev";  // for local testing
```

Switch to `"prod"` when using the deployed Apps Script URL.

### 3. Test Workflow

| Step | File            | What to Check                                    |
| ---- | --------------- | ------------------------------------------------ |
| 1    | `index.html`    | Map loads, can add radii and markers             |
| 2    | `proposal.html` | Form defaults load, estimate auto-updates        |
| 3    | `admin.html`    | Config & pricing load from Sheets, tables render |
| 4    | `Code.gs`       | Sheet writes visible under each tab              |

---

## 📡 API Endpoints (Handled by Code.gs)

| HTTP | Parameter              | Function Called  | Sheet Affected |
| ---- | ---------------------- | ---------------- | -------------- |
| GET  | `?action=getConfig`    | `getConfig()`    | Config         |
| POST | `?action=saveConfig`   | `saveConfig()`   | Config         |
| GET  | `?action=getPricing`   | `getPricing()`   | Pricing        |
| POST | `?action=savePricing`  | `savePricing()`  | Pricing        |
| GET  | `?action=getProposals` | `getProposals()` | Proposals      |
| POST | `?action=saveProposal` | `saveProposal()` | Proposals      |

All routes return JSON responses such as:

```json
{ "success": true, "message": "Pricing tier saved." }
```

---

## 🧮 Front-End Logic Flow

1. **config.js** — Declares constants and route URLs.
2. **shared.js** — Provides `fetchGet()`, `fetchPost()`, `formToJSON()`, `buildPayload()`.
3. **app.js** — Map setup, radii, filtering, mode switching.
4. **proposal.js** — Loads config + pricing, computes live estimates, submits proposals.
5. **admin.js** — Loads / updates config & pricing, reviews proposals.

---

## 🎨 Branding & UI

* **Primary Color:** `#2F5597` (Accel Blue)
* **Accent Color:** `#FFD965` (Gold)
* **Typography:** Inter (400 / 600)
* **Aesthetic:** Minimalist + data-driven, consistent with *Direct Mailer Form V20-12.1*.

---

## 🧰 Maintenance Tips

* To reset all tabs and headers, re-run `setup()` from Apps Script.
* To expand the schema (e.g., add “Region” or “Campaign Type”), add a new column header — front-end serialization is dynamic.
* Logs appear under **View → Executions** in Apps Script for debugging fetch requests.

---

## 🛡️ Security Notes

* Apps Script runs under the credentials of the deploying Google account.
* Always deploy with **“Execute as Me”** and restrict sharing of the Sheet to trusted admins.
* Sensitive data (emails, budgets) is stored only within the associated Google Sheet.

---

## 🏁 License & Credits

© 2025 Accel Analysis, LLC. All Rights Reserved.
Developed by the Industrial Diplomacy Division.
Leaflet © OpenStreetMap contributors.

