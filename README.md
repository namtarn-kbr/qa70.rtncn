# QA 2570 – RTNCN Quality Assurance

- Website: https://namtarn-qa70-rtncn.vercel.app
- Google Sheets database: https://docs.google.com/spreadsheets/d/1eHfeDHKDOvxD4usf4rlkDH_NXwG5v0UFfCPPqiSu-6c/edit
- Google Apps Script Web App: https://script.google.com/macros/s/AKfycbxAFSY-FPBijhqCi-DKpwXxe5_u_EToz7hdOTtYw9FJAj4Cj4zB1qOT5XJPTyEVp8pC-w/exec

## Architecture

Browser → Vercel API (edit PIN, input validation, server secret) → GAS Web App (QA_API_SECRET, LockService, Sheet access) → Google Sheets.

Google Sheets is the **single source of truth** for activity data; existing 21 activities are already seeded in its `Activities` tab.
All evidence attachments are **Google Drive links only**, stored in the `Attachments` tab.
Changes are written to `Audit_Log` by GAS; `Plans` remains available for four QA tracks.
The website does not upload binary evidence files.

## Configure once, securely

1. In the **bound Apps Script** project, open Project Settings → Script properties, and set `QA_API_SECRET` to a long random secret of at least 32 characters. Do not paste this secret into chat, HTML, GitHub, or a client-side file.
2. Deploy Apps Script as a **Web app**, Execute as **Me**, access **Anyone** (if approved by the organization's policy). The GAS code checks the shared secret in the POST body for every data operation.
3. In Vercel → Project → Settings → Environment Variables:
   - `GAS_WEB_APP_URL`: the publicly available `/exec` URL (already configured).
   - `GAS_API_SECRET`: the **exact same** secret as `QA_API_SECRET` in GAS, stored as a **Secret/Encrypted** server-only variable (still needs to be set).
   - `EDIT_PIN`: existing server-side edit PIN (already configured).
4. Deploy production again **after saving GAS_API_SECRET** so the Functions receive it.
5. Verify that `GET /api/activities` returns `persistent: true` and 21 activities before changing any records. Then add one test activity or link through the UI and verify the corresponding Sheet. Do not use real sensitive patient data.

No Google Cloud Console, Service Account JSON, `GOOGLE_CLIENT_EMAIL`, or `GOOGLE_PRIVATE_KEY` is required by this GAS implementation.

## API routes

- `GET /api/activities` → GAS `list` (read-only, no PIN, secret stays on server)
- `POST /api/activities` → GAS `createActivity` (edit PIN required)
- `PATCH /api/activities` → GAS `updateActivity` (edit PIN required)
- `POST /api/attachments` → GAS `addLink`, `renameLink`, `replaceLink`, `deleteLink` (edit PIN required)
- `POST /api/verify-pin` → verifies edit PIN for the web UI

GAS accepts authenticated POST requests with JSON `{ "secret": QA_API_SECRET, "action": "list", ... }`.
Vercel never exposes this secret to browser JavaScript or response JSON.

## Safety and fallback

Until `GAS_API_SECRET` is configured, the API returns bundled activity data with `persistent: false`, and changes in the browser remain **temporary**. Server-side writes return HTTP 503.
If the GAS connection is configured but fails, read requests return HTTP 503 rather than falsely reporting permanent storage.

Existing edit PIN access is shared and does not identify individuals; GAS's `Audit_Log` identifies edits as the shared system administrator, not a unique person. For more sensitive data, add personal sign-in with access controls, better rate limiting, and least-privilege policies. Google Drive document access is governed by each Drive file's permissions.

## Developer

```bash
npm ci
npm test
npm run build
```
