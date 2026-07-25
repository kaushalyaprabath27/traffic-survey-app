# Comprehensive Documentation: Traffic Survey Application Suite

> [!IMPORTANT]
> **Internal Project Documentation**
> This file is internal technical project documentation generated to explain the codebase's architecture and operation. It is **not** the actual academic manuscript submitted for publication (which is maintained separately as a Word document outside this repository). 


## 1. System Overview
The Traffic Survey Application is a distributed, progressive web application (PWA) designed to facilitate high-volume, concurrent manual data collection in the field. It is built to operate in harsh network environments and specifically architected to circumvent strict API quota limitations imposed by free-tier cloud providers (Google Apps Script). 

The system utilizes a decentralized edge-storage model where data is aggregated locally on the surveyor's device and periodically flushed in optimized batches to a centralized Google Sheets database.

## 2. Platform and Technology Stack
**Frontend:**
- Pure HTML5, CSS3, and Vanilla JavaScript (ES6+).
- Progressive Web App (PWA) capabilities driven by a Service Worker (`sw.js`) and Web App Manifest (`manifest.json`), allowing the app to be installed to the home screen and function exactly like a native app on iOS and Android devices.
- No third-party heavy frameworks (e.g., React, Angular) are used, ensuring the payload size is extremely small and loads instantly over poor 3G/4G connections.
- Icons provided by FontAwesome (via CDN).

**Backend:**
- Google Apps Script (JavaScript) operating as an HTTP POST endpoint.
- Google Sheets functioning as the primary relational database.
- Google MailApp service for handling authentication (OTP emails).

## 3. Application Topology (The 6 Modules)
The suite is modular, consisting of a root authentication/routing portal and 6 specialized surveying modules, each living in their own distinct directory. Each module shares the same underlying network engine but presents a vastly different user interface tailored to a specific traffic measurement scenario:

1. **`main-road`**: Tracks directional traffic flow (In/Out) along primary arteries.
2. **`roundabout`**: Tracks traffic entering and exiting circular intersections.
3. **`t-junction`**: Tracks complex 3-way directional flow.
4. **`pedestrian`**: Tracks zebra crossing pedestrian volume and crossing duration.
5. **`bus-idling`**: Tracks public transport dwell times at stops, including passenger boarding/alighting counts and GPS coordinates.
6. **`institutional-idling`**: Tracks vehicle dwell times and actions at school/institutional drop-off zones.

## 4. Frontend Data Capture & Survey UX
### A. The Recording Mechanism
When a surveyor interacts with the UI, a JavaScript event listener triggers `handleVehicleClick()`. At this exact millisecond, the device's system clock is read to generate a timestamp. 
```javascript
const now = new Date();
const dateStr = now.toLocaleDateString('en-CA');
const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
```
The data is packaged into a JSON object alongside the surveyor's metadata (Name, Location, Direction, Vehicle Type).

### B. Haptic Feedback
To ensure surveyors can keep their eyes on the road, `navigator.vibrate(50)` provides a 50-millisecond physical vibration upon every successful button press, confirming data capture without requiring visual verification.

### C. The "Undo" Feature
Mistakes happen in rapid data entry. The system includes an `undoLastAction()` method. Because data is queued locally before syncing, pressing "Undo" executes a `.pop()` operation on the local JavaScript array (`localStorage.getItem(STORAGE_KEY)`), instantly and permanently destroying the last recorded vehicle before it reaches the cloud. 
*Constraint:* Once the background sync pushes the record to the cloud (which happens every 15 seconds), it is flushed from local memory and can no longer be undone.

### D. Psychological Reinforcement (Milestones & Counters)
To combat surveyor fatigue, two UI elements exist:
- **Session Counter:** A live numerical badge tracks the surveyor's total count for the active shift.
- **Milestone Animations:** Upon hitting multiples of 50 records, an animated bus using randomized CSS gradients slides across the screen (`@keyframes driveAcross`). Crucially, this element has `pointer-events: none;`, ensuring it never blocks a surveyor's tap.

## 5. Network Architecture: Batch Processing & Offline Mode
The defining architectural feature of the application is its fault-tolerant, batch-processing network engine designed to solve severe Google Apps Script quota crashes.

### A. The "Silent Killer" Problem (Historical Context)
Previously, the app used synchronous requests for every vehicle tap. 34 simultaneous surveyors tapping once per second forced Google's servers to boot up 34 concurrent execution instances. This led to Google's strict "90-minute daily execution limit" being consumed in under an hour, crashing the entire system.

### B. Edge Aggregation (The Solution)
The application was rewritten so that tapping a vehicle does **not** trigger a network request. Instead, it calls `queueDataLocally()`, which stringifies the JSON payload and appends it to a persistent array in the device's `localStorage`.
If the app is closed, crashes, or loses power, the data remains safely encoded in the device's physical memory.

### C. Asynchronous Batch Flushing
A persistent `setInterval` loop wakes up every 15,000 milliseconds (15 seconds) and invokes `syncOfflineQueue()`.
1. The app checks if the device has an internet connection (`navigator.onLine`). If offline, it aborts silently and waits another 15 seconds.
2. If online, it reads the local array and slices up to **50 records** into a single batch (`const batch = queue.slice(0, 50);`).
3. The batch is sent as a single `POST` request to the backend.
4. Only upon receiving a verified `HTTP 200 OK` from Google does the app delete those 50 records from the local queue. 

By grouping 50 taps into 1 request, server load is mathematically reduced by 98%.

### D. Empirical Load-Test Quota Evaluation
To measure the quota-reduction impact, simulated load-tests were conducted against the production backend using an automated Node.js test harness. 

**Execution-Time Methodology Note:** 
Because Google Apps Script deployed as a Web App does not expose real execution metrics via a public API, server-side CPU time cannot be programmatically pulled by the client. The execution times reported below are calculated estimates, derived by multiplying the number of HTTP requests sent by an assumed average processing duration (0.3 seconds per standalone `appendRow` versus 0.25 seconds per bulk `setValues` batch).

**1. Representative Field Load (6 Surveyors)**
A 10-minute simulation was run using 6 concurrent virtual surveyors (representing one active surveyor per application module), generating approximately one event per second per surveyor.
- **Total Vehicle Events Logged:** 3,570 events
- **Unbatched Baseline Requests (Theoretical):** 3,570 requests
- **Batched HTTP Requests Sent:** 215 requests
- **Network Overhead Reduction:** 93.98%
- **Estimated Apps Script Execution Time (Unbatched):** ~17.85 minutes 
- **Estimated Apps Script Execution Time (Batched):** ~0.90 minutes

**2. Worst-Case Stress Test (34 Surveyors)**
A secondary 10-minute stress test was conducted simulating 34 concurrent surveyors to observe system behavior under extreme load conditions.
- **Total Vehicle Events Logged:** 20,230 events
- **Unbatched Baseline Requests (Theoretical):** 20,230 requests
- **Batched HTTP Requests Sent:** 283 requests (Average batch size: 43.81 items)
- **Estimated Apps Script Execution Time (Unbatched):** ~101.15 minutes (exceeding the daily 90-minute limit)
- **Estimated Apps Script Execution Time (Batched):** ~1.18 minutes

These simulations indicate that the edge-aggregation architecture effectively shifts processing load from the backend to the client, preventing the free-tier server limits from being exhausted during standard surveying sessions.

## 6. Backend Architecture (Google Apps Script)
The backend acts as an API router and database controller.

### A. Routing
A master `doPost(e)` function intercepts incoming traffic and routes it based on the `action` parameter. The primary route is `handleSubmitBatch(data)`.

### B. Relational Database Mapping
When a batch arrives, the backend reads the `adminId` from the payload. It queries a central "Admin Registry" spreadsheet to find the correct, dynamically-generated Google Spreadsheet owned by that specific administrator.
The backend then maps the incoming JSON variables to a rigid 1D Array structure (representing columns A, B, C, etc.).

### C. Bulk Insertion (`setValues`)
To further minimize execution time, the backend uses Google Sheets' bulk insertion command (`getRange().setValues(rows)`) to write the entire batch of 50 vehicles into the database grid simultaneously. This operation takes ~0.2 seconds total, compared to the ~10 seconds required to append 50 rows individually.

## 7. Security and Administration
The system requires no pre-provisioned database accounts for administrators. It utilizes an autonomous setup workflow:
1. **OTP Verification:** A new administrator inputs their email. The Apps Script generates a 6-digit OTP, caches it via `CacheService` for 15 minutes, and emails it via `MailApp.sendEmail`.
2. **Dynamic Generation:** Upon OTP verification, the script dynamically generates a brand new Google Spreadsheet, populates it with 6 distinct tabs (one for each survey type) with predefined column headers, and assigns ownership to the admin's email.
3. **Admin ID Assignment:** The system generates a unique 4-digit PIN (e.g., `ADM-4921`). This PIN is all the field surveyors need. When surveyors enter this PIN into their app, the backend autonomously routes their data to the correct dynamically-generated spreadsheet.

## 8. The Vault: Failsafe Data Extraction & Transparency
While the local queue is aggressively flushed every 15 seconds, the app maintains a secondary, hidden queue known as the `traffic_survey_secret_backup`.
Every single tap is appended to this permanent vault, and it is **never** deleted by the sync engine.
If catastrophic failure occurs (e.g., the backend server is deleted, or the surveyor inputs the wrong Admin ID for an entire 8-hour shift), the data is not lost.

### Transparent UI Access & Disclosures
To ensure surveyors are fully aware of data retention practices and can access their backups without developer intervention, the application includes clear, visible transparency controls:
- **In-App Disclosure:** A "Data Privacy & Local Backup Notice" is prominently displayed on the Setup Screen of every module. It informs surveyors that all recorded events are backed up to local device storage and retained even if offline or delayed.
- **Visible Export Controls:** Surveyors can export their full historical dataset at any time by clicking the clearly labeled **"Export Local Backup (.json)"** button located on the setup portal and the active survey header. This triggers an autonomous Blob conversion, safely downloading the raw JSON payload to the device's downloads folder.
