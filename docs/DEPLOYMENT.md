# Deployment Guide

Step-by-step instructions to stand up a working instance of the backend from nothing, verified by following this document into a clean Apps Script project.

## 1. Create the Apps Script project

1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Delete the default `Code.gs` content and paste in the full contents of `backend/master_apps_script.js`.
3. Save the project (give it a name, e.g. "Traffic Survey Backend").

No other files or libraries are required — the backend is a single script file.

## 2. Deploy as a Web App

1. Click **Deploy > New deployment**.
2. Select type **Web app**.
3. Set **Execute as: Me** (your Google account — the deployment runs under your identity and quota, not the caller's).
4. Set **Who has access: Anyone** (required so the frontend, running in surveyors' browsers with no Google login, can reach it).
5. Click **Deploy**, authorize the requested permissions (Sheets, Gmail send, and script cache), and copy the resulting Web App URL (`https://script.google.com/macros/s/AKfycb.../exec`).

**This step is the origin of a limitation worth understanding before you rely on it:** because the Web App executes as its owner (you), *all tenants who register through this deployment share your single Google account's daily execution-time and email-sending quotas*. There is no per-tenant quota isolation — a second research team who signs up through your deployment is drawing against the same account-level limits as your own surveys. This is not configurable at deployment time; it follows directly from the "Execute as: Me" requirement in step 3, which is itself required for the Web App to work for unauthenticated callers.

## 3. First run: the central registry

The backend provisions its own registry on first use — there is no manual spreadsheet-creation step. The first request that calls `setupRegistry()` (any signup attempt) will:

1. Create a new spreadsheet titled "Traffic Survey Master Registry".
2. Store its ID in the script's Properties Service (`REGISTRY_SHEET_ID`), so subsequent calls reuse the same registry instead of creating a new one each time.
3. Add an `Admin_Registry` sheet with the header row: `Timestamp, Name, Email, Institute, Country, Password, AdminID, TargetSheetID, TargetSheetURL, Config`.

You can trigger this manually the first time by running the `setupRegistry` function once from the Apps Script editor (Run menu), or simply by completing the onboarding flow described in step 5.

**Note on the Password column:** the backend currently stores this value as submitted, with no hashing (see `docs/validation_multimodule_results.md`'s companion finding in `TECHNICAL_DOCUMENTATION.md` Section 7, "Security model and threat scope"). Do not treat this registry sheet as suitable for real, reused passwords; this is a known, disclosed limitation, not a design choice to build around.

## 4. Email (OTP) configuration

The OTP and welcome emails are sent via `MailApp.sendEmail`, which uses the deploying Google account's own Gmail sending quota and identity — there is no separate SMTP or mail-service configuration to set up. Consumer Gmail accounts have a daily send limit (see Google's own quota documentation, cited as reference [3] in the manuscript); Workspace accounts have a higher one. If OTP emails stop arriving, check this quota before assuming a code defect.

## 5. First-administrator onboarding

1. Open the frontend (`index.html`) with `MASTER_APPS_SCRIPT_URL` in `app.js` (and in every module's own `app.js`) pointed at your deployed Web App URL from step 2.
2. Use the signup form: name, institute, country, email, password. This calls `action=request_otp`.
3. Check the registered email for a 6-digit code (subject "Traffic Survey App - Your Verification Code"); it expires in 15 minutes.
4. Submit the code (`action=verify_otp`). On success, the backend creates a new per-administrator spreadsheet (six tabs, one per module, with header rows already set), registers it, and returns an Admin ID (`ADM-XXXX`) and the new spreadsheet's URL.
5. Give surveyors that Admin ID — it is what they enter in each module's setup screen to route their recorded data to your spreadsheet.

## 6. Connecting the frontend

`app.js` (root) and each module's own `app.js` each have their own `MASTER_APPS_SCRIPT_URL` / `APPS_SCRIPT_URL` constant — all of them must point at the same deployed Web App URL. The frontend itself is static (HTML/CSS/vanilla JS) and can be hosted on GitHub Pages, Netlify, Vercel, or any static file host.

## What this document does not (yet) cover

- Rotating or updating the deployed Web App URL after surveyors are already using an old one.
- Migrating the registry to a hashed-password scheme (see the disclosed limitation in step 3).
- Multi-region or multi-account deployment to work around the shared-quota limitation in step 2.

These are open items, not silently assumed to be solved.
