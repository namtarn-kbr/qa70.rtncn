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

## Update the deployed Google Apps Script before deleting activities

**This repository cannot automatically edit the separately deployed Apps Script project.**
Update the current Apps Script **Code.gs** with the full `QA2570_GAS_Code_v2.gs` provided in the conversation, then select:

**Apps Script → Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**.

Use **Manage deployments** rather than New deployment so the existing `/exec` URL continues to work. The `QA_API_SECRET` Script Property does not need to be changed.

The new `deleteActivity` action:
- Requires authenticated POST from the Vercel server, same shared secret as existing operations
- Takes an activity ID; deletes its row from `Activities` and its matching document links from `Attachments`
- Appends an `Audit_Log` entry (`DELETE_ACTIVITY`) with the deleted activity and linked evidence metadata
- Does **not** remove the underlying files from Google Drive
- Responds with `deletedId`, the new activities array and `persistent:true`

The website shows a separate delete confirmation; on successful create/update/delete, it closes the dialog and shows a Thai success toast. The left sidebar footer attributes “คณะกรรมการประกันคุณภาพการศึกษา”.

The website's `DELETE /api/activities` endpoint will report an error until the Apps Script deployment supports `deleteActivity`.

## API routes

- `GET /api/activities` → GAS `list` (read-only, no PIN, secret stays on server)
- `POST /api/activities` → GAS `createActivity` (edit PIN required)
- `PATCH /api/activities` → GAS `updateActivity` (edit PIN required)
- `DELETE /api/activities` → GAS `deleteActivity` (edit PIN required, deletes linked evidence entries but not Drive files)
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


## UI update: Gantt date filters and college emblem

- The Gantt view filters by **plan**, **month**, and an optional **date range** (activity time spans overlapping the selected dates). Its four track colors remain consistent.
- The left institutional logo was replaced using the college emblem supplied for the QA2570 project.
- The view still has 12 monthly columns on desktop; changing the date filter hides nonmatching activities rather than truncating the fiscal timeline.

## Fix: delete shows `Unsupported action`

The Vercel API now displays a helpful message when Apps Script is still on an old Web App deployment.
**Publishing a new GitHub/Vercel version cannot update an existing Apps Script Web App.**
Use the delivered `QA2570_GAS_Code_v3.gs` as the full `Code.gs` source in Apps Script.
Then choose **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**.

Use the **existing deployment**, so the `GAS_WEB_APP_URL` does not change.
After publishing, open the GAS `/exec` URL in a browser; it should show:

```json
{"success":true,"service":"QA2570","version":"v3-20261107","supportsDeleteActivity":true}
```

(Additional `message` may appear.) Do not paste the `QA_API_SECRET` anywhere outside GAS Script Properties and Vercel server-side Secrets.
Deletion removes the matching activity and **link metadata** from the Sheet, adds an Audit_Log entry, but does not delete underlying Google Drive files.



## Multi-plan Gantt chart and single-page PDF (2026-11-07)

The QA2570 website now offers multi-select plan chips rather than a single plan dropdown:
- **ทุกแผน** shows every populated plan.
- Choose an individual plan and add other plans (e.g., **สมศ. + EdPEx**) without losing the original plan's data.
- Gantt activities are displayed in **one combined list, sorted by start date**, even when several plans are selected; no separate plan groups or subheadings.
- The timeline bars keep their plan-specific blue/orange/green/purple colors.
- The previous **month and date-range filters have been removed**, per the agreed UX.

**ดาวน์โหลด Gantt PDF** generates an **A4 landscape, automatically paginated PDF**, using high-resolution canvas rendering with the **actual Sarabun web font** (a font availability check prevents silent fallback), the official college emblem, a complete 12-month timeline repeated on every page, plan-color legend and institutional footer. Activity titles use a fixed **15pt print size** (within the requested 14–16pt range); long titles wrap and the pagination engine allocates row height dynamically rather than shrinking text. The 21 existing activities typically fit in **two A4 landscape pages**, but longer user-entered names or additional activities can generate more pages without reducing title size.

Implementation: `pdf-export.js` is included in the static Vercel `public/` build by `build.js`. The PDF contains **one 2526×1785 JPEG image for each A4 landscape PDF page** so Thai glyph shaping remains visually consistent; its text is image-based rather than selectable. No additional backend service or GAS change is necessary for PDF export. The PDF reflects the currently selected plans and other active activity filters.
