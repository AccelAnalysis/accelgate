# Two-Sided Map (Leaflet + Google Apps Script)

A minimal, production-ready starter for a two-sided marketplace map:

- **Poster/Evaluator** drops a pin, submits a post (title/desc/tags + eval parameters).
- **Searcher/Responder** searches by keywords/tags, clicks a pin, and sends a response.
- Poster can **load their posts** and **evaluate responses** (rating/status/notes).

Front-end is static (GitHub Pages or any static host). Backend is **Google Apps Script** writing to a Google Sheet.

---

## File Tree

```
.
├─ index.html        # UI: role toggle, map, forms
├─ styles.css        # Dark, clean UI styling
├─ config.js         # Set your Apps Script Web App URL
├─ shared.js         # Fetch helpers (x-www-form-urlencoded to avoid CORS preflight)
├─ app.js            # Map + UI logic
└─ Code.gs           # Apps Script backend (paste into script.google.com)
```

---

## 1) Backend: Google Apps Script

1. Create a **Google Spreadsheet** named e.g. `Two-Sided Map`.
2. Open **Extensions → Apps Script** and create a project.
3. Replace `Code.gs` content with the file from this repo.
4. Run **setup()** once (Editor → Run → setup). This creates two sheets:
   - `Posts`: `Timestamp, PostID, Title, Desc, Tags, Lat, Lng, Email, AccessKey, EvalParams, Status`
   - `Responses`: `Timestamp, ResponseID, PostID, ResponderName, ResponderEmail, Message, Rating, Notes, Status`
5. **Deploy**: `Deploy → New deployment → Web app`
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy the Web App URL (ends with `/exec`).

> **Note on CORS:** We avoid preflight by posting data as `application/x-www-form-urlencoded`. No custom headers needed.

---

## 2) Frontend: GitHub Pages

1. Put these files in a GitHub repo (e.g., `two-sided-map`).
2. Edit `config.js` and set:
   ```js
   const SCRIPT_URL = "YOUR_WEB_APP_URL_HERE";
   ```
3. Commit & push.
4. Enable **GitHub Pages** (Settings → Pages). Choose branch `main` and `/root`.
5. Visit your GitHub Pages URL to test.

---

## 3) Custom Domain on GoDaddy

1. In GitHub repo **Settings → Pages → Custom domain**, enter your domain/subdomain (e.g., `map.yourdomain.com`).
2. In **GoDaddy DNS**, add CNAME:
   - Name: `map` (or desired subdomain)
   - Value: `your-username.github.io`
3. Wait for DNS to propagate. Enable HTTPS in GitHub Pages when it appears.

> Alternatively, you can deploy the static files on your GoDaddy hosting (no changes needed).

---

## 4) Using the App

### Poster/Evaluator
- Click **Place / Move Pin**, then click the map to set a pin.
- Fill in *Title, Description, Tags, Email, Access Key, Evaluation Params*.
- Click **Create Post**.
- To **manage posts** and evaluate responses, enter the **same Email + Access Key** and click **Load My Posts**.
  - Expand a post to load its responses and save **Rating / Status / Notes** on each response.

### Searcher/Responder
- Enter **keywords** and/or **tags** (comma-separated).
- Click **Search**.
- Click a **map pin** or the **Respond** button in the list to send a response.

---

## 5) Security & Privacy (MVP)

- This MVP uses **email + access key** as a lightweight owner check. Consider upgrading to:
  - Email verification / magic links
  - OAuth (Sign in with Google)
- **Never store sensitive PII** in the sheet. If you plan to handle PII, add a privacy statement.
- To restrict origins, you can proxy through Cloudflare Workers or your server. For now, the app avoids CORS preflight.

---

## 6) Extending

- Add **marker clustering** (Leaflet.markercluster) as posts scale.
- Add **bbox** queries and **map-viewport search** to limit results to current view.
- Add **email notifications** on new responses (Apps Script `MailApp.sendEmail` or GmailApp).
- Add **attachments** (Drive file uploads) for richer requests/responses.
- Add **status** transitions (open → closed) and auto-close logic.

---

## 7) Local Testing

You can test locally with any static server, for example:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`.

---

## Troubleshooting

- **Nothing saves?** Make sure `SCRIPT_URL` is set correctly and the Web App deployment is the latest version.
- **Sheet headers wrong?** Run `setup()` again or verify the exact header order.
- **CORS error?** We post as `x-www-form-urlencoded`. If you added custom headers client-side, remove them.
- **403 Forbidden on listResponses/evaluate?** Email or Access Key mismatch for that PostID.
