# Traffic Survey Application Suite

A distributed, offline-first progressive web application (PWA) suite designed for high-volume, concurrent manual traffic data collection in the field. 

This repository contains the frontend application suite, which is built on an edge-aggregation batching architecture designed specifically to circumvent strict free-tier execution quota limitations when syncing data to Google Sheets via Google Apps Script.

## The Modules
The suite consists of a root portal and six specialized surveying modules tailored to distinct traffic measurement scenarios:
1. **`main-road`**: Tracks directional traffic flow (In/Out) along primary arteries.
2. **`roundabout`**: Tracks traffic entering and exiting circular intersections.
3. **`t-junction`**: Tracks complex 3-way directional flow.
4. **`pedestrian`**: Tracks zebra crossing pedestrian volume and crossing duration.
5. **`bus-idling`**: Tracks public transport dwell times, boarding/alighting counts, and GPS coordinates.
6. **`institutional-idling`**: Tracks vehicle dwell times and actions at school/institutional drop-off zones.

## Architecture and Technical Documentation
For an exhaustive breakdown of the batch-processing network engine, Google Apps Script backend routing, and empirical quota-reduction benchmarks, please read the [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md).

## Setup and Deployment

### 1. Deploying the Frontend
The frontend is built using pure HTML5, CSS3, and Vanilla JavaScript with no heavy frameworks. It can be hosted on any static file server (e.g., GitHub Pages, Netlify, Vercel).
1. Clone this repository.
2. Serve the root directory via your chosen hosting provider.
3. The PWA `manifest.json` and `sw.js` will automatically enable "Add to Home Screen" capabilities on mobile devices.

### 2. Deploying the Backend (Google Apps Script)
The backend acts as an API router and database controller utilizing Google Sheets as the relational database.
1. Obtain the backend code from [`backend/master_apps_script.js`](backend/master_apps_script.js) in this repository.
2. Create a new Google Apps Script project at [script.google.com](https://script.google.com).
3. Paste the backend code into the editor.
4. Deploy the script as a **Web App**, granting access to "Anyone".
5. Copy the deployed Web App URL.

### 3. Connecting Frontend to Backend
Once your Google Apps Script Web App is deployed, you must link the frontend to it:
1. Open the `app.js` file in the root directory.
2. Replace the `MASTER_APPS_SCRIPT_URL` constant with your deployed Web App URL.
3. Repeat this process for the `app.js` file inside every individual module directory (`main-road/app.js`, `roundabout/app.js`, etc.).
4. Deploy your frontend changes.

## Documentation

- [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) --- full architecture, development, and security-findings detail
- [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md) --- event JSON schema and Sheet column layout for every module
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) --- step-by-step deployment procedure
- [docs/loadtest_results.md](docs/loadtest_results.md) --- batching/quota load-test method, raw per-request logs, and results
- [docs/idempotency_and_password_hashing.md](docs/idempotency_and_password_hashing.md) --- password-hashing migration and event-deduplication fix, with deployment steps
- [docs/STORAGE_CEILING_ANALYSIS.md](docs/STORAGE_CEILING_ANALYSIS.md) --- local-storage quota derivation and failure-pathway analysis
- [docs/validation_multimodule_results.md](docs/validation_multimodule_results.md) --- video-based validation method and results across all six modules
- [CHANGELOG.md](CHANGELOG.md) --- release history

## Data Privacy & Offline Recovery
All surveyor data is aggregated into local device memory before being asynchronously flushed to the cloud in batches of 50. Even in the event of total network failure or backend unavailability, data is persistently retained on the device in a fallback queue (`traffic_survey_secret_backup`). Surveyors can explicitly download a raw JSON backup of their entire dataset via the "Export Local Backup" controls found throughout the app UI.

## License
This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.
