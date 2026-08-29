/**
 * LOAD-TEST HARNESS (T1) — batching, quota, and event-reconciliation validation.
 *
 * Unlike the repository's original load_test_harness.js, this version:
 *   - logs every single HTTP request to a CSV (timestamp, surveyor, batch size,
 *     HTTP status, backend-acknowledged count, latency, outcome, raw response)
 *   - sums the backend's own `count` field from every successful response and
 *     reports it as "events acknowledged", separate from "events generated"
 *   - supports a "representative" mode (one surveyor per module) as well as
 *     the original "worstcase" mode (N surveyors, all one module)
 *   - never estimates: if a number can't be measured this way, it is left out
 *     of the summary rather than guessed.
 *
 * Usage:
 *   node loadtest.js --mode=representative --duration=600 --adminId=<your registered admin ID>
 *   node loadtest.js --mode=worstcase --surveyors=34 --duration=600 --adminId=<your registered admin ID>
 *   (the admin ID actually used for the load test reported in docs/loadtest_results.md
 *   has since been rotated -- see REVISION_CHANGELOG.md, MethodsX revision r2, Part 0)
 *
 * Env override: LOADTEST_APPS_SCRIPT_URL to point at a different endpoint.
 */

const fs = require('fs');
const path = require('path');

const APPS_SCRIPT_URL = process.env.LOADTEST_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbz4jYswPv7LSFSkSymoQ8tBt1ui6ngLTwh5EAKNVxu5Qf16-oGT8zf6nMkczo-o5hQC/exec';

function parseArgs() {
  const args = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

const argv = parseArgs();
const MODE = argv.mode || 'worstcase'; // 'representative' | 'worstcase'
const DURATION_SECONDS = parseInt(argv.duration || '600', 10);
const NUM_SURVEYORS_ARG = argv.surveyors ? parseInt(argv.surveyors, 10) : (MODE === 'representative' ? 6 : 34);
const TAP_INTERVAL_MS = parseInt(argv.tapIntervalMs || '1000', 10); // ~1 tap/sec/surveyor
const SYNC_INTERVAL_MS = 15000; // matches main-road/app.js:42 — not configurable, this is what's deployed
const MAX_BATCH_SIZE = 50;      // matches main-road/app.js:286 — not configurable, this is what's deployed
const ADMIN_ID = argv.adminId || process.env.LOADTEST_ADMIN_ID;
if (!ADMIN_ID) {
  console.error('ERROR: --adminId=<registered admin id> is required (e.g. --adminId=ADM-7K4QX9M2FZPW)');
  process.exit(1);
}

const MODULES = ['main-road', 'roundabout', 't-junction', 'pedestrian', 'bus-idling', 'institutional-idling'];
const vehicleTypes = ['Bike', 'Tuk Tuk', 'Car', 'Bus', 'Van', 'Truck', 'Long Vehicle'];
const directions = ['In', 'Out'];

const outDir = argv.outDir || path.join(__dirname, 'results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const runId = `${MODE}_${NUM_SURVEYORS_ARG}surv_${DURATION_SECONDS}s_${Date.now()}`;
const csvPath = path.join(outDir, `${runId}.csv`);
const csvHeader = 'iso_timestamp,surveyor_id,survey_type,request_seq,batch_size,http_status,outcome,ack_count,latency_ms,response_body\n';
fs.writeFileSync(csvPath, csvHeader);

function csvEscape(s) {
  const str = String(s == null ? '' : s);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function appendCsvRow(fields) {
  fs.appendFileSync(csvPath, fields.map(csvEscape).join(',') + '\n');
}

const metrics = {
  totalEventsGenerated: 0,
  totalRequestsSent: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalEventsAcknowledged: 0, // sum of backend-reported `count`, successful responses only
  batchSizes: [],
  latenciesMs: [],
  startTime: 0,
  endTime: 0,
};

function buildEvent(surveyType, surveyorId) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0];
  const base = { action: 'submit', adminId: ADMIN_ID, surveyType, name: surveyorId, timestamp: now.getTime() };

  if (surveyType === 'main-road' || surveyType === 'roundabout' || surveyType === 't-junction') {
    return { ...base, location: 'LoadTest-Point-A', locationNumber: 'E1', date, time,
      direction: directions[Math.floor(Math.random() * directions.length)],
      vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] };
  }
  if (surveyType === 'pedestrian') {
    return { ...base, location: 'LoadTest-Crossing-A', locationNumber: 'X1', date,
      startTime: time, finishTime: time, countIn: '1', countOut: '0' };
  }
  if (surveyType === 'bus-idling') {
    return { ...base, location: 'LoadTest-Stop-A', gps: '6.0535,80.2210', date, route: 'B130',
      startTime: time, stopTime: time, durationSeconds: '5', offCount: '1', onCount: '1' };
  }
  if (surveyType === 'institutional-idling') {
    return { ...base, location: 'LoadTest-Gate-A', locationNumber: 'G1', date, time,
      direction: directions[Math.floor(Math.random() * directions.length)],
      actionStatus: 'Dropping off', vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] };
  }
  throw new Error('Unknown surveyType: ' + surveyType);
}

class VirtualSurveyor {
  constructor(id, surveyType) {
    this.id = `LOADTEST-${surveyType.toUpperCase()}-${String(id).padStart(2, '0')}`;
    this.surveyType = surveyType;
    this.queue = [];
    this.requestSeq = 0;
    this.isSyncing = false;
    this.tapTimer = null;
    this.syncTimer = null;
  }

  start() {
    this.tapTimer = setInterval(() => this.recordEvent(), TAP_INTERVAL_MS);
    const initialDelay = Math.floor(Math.random() * 2000);
    setTimeout(() => {
      this.syncTimer = setInterval(() => this.flushQueue(), SYNC_INTERVAL_MS);
    }, initialDelay);
  }

  stop() {
    if (this.tapTimer) clearInterval(this.tapTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
  }

  async finalFlush() {
    // Wait out any in-flight regular sync first — otherwise this can race the
    // interval timer's flushQueue() and resubmit the same still-queued items
    // before the earlier request has had a chance to trim them off the queue.
    while (this.isSyncing) {
      await new Promise(r => setTimeout(r, 100));
    }
    while (this.queue.length > 0) {
      await this.flushQueue();
    }
  }

  recordEvent() {
    this.queue.push(buildEvent(this.surveyType, this.id));
    metrics.totalEventsGenerated++;
  }

  async flushQueue() {
    if (this.queue.length === 0) return;
    if (this.isSyncing) return;

    const batch = this.queue.slice(0, MAX_BATCH_SIZE);
    this.isSyncing = true;
    this.requestSeq++;
    const seq = this.requestSeq;
    const startTime = Date.now();
    const isoTs = new Date(startTime).toISOString();

    metrics.totalRequestsSent++;
    metrics.batchSizes.push(batch.length);

    let httpStatus = '', outcome = 'network_error', ackCount = '', responseBody = '';
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'submit_batch', payload: batch }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      httpStatus = res.status;
      const latency = Date.now() - startTime;
      metrics.latenciesMs.push(latency);
      const text = await res.text();
      responseBody = text;

      let data = null;
      try { data = JSON.parse(text); } catch (e) { /* leave data null */ }

      if (res.ok && data && data.status === 'success') {
        outcome = 'success';
        ackCount = typeof data.count === 'number' ? data.count : '';
        metrics.successfulRequests++;
        metrics.totalEventsAcknowledged += (typeof data.count === 'number' ? data.count : 0);
        this.queue = this.queue.slice(batch.length);
      } else if (res.ok && data && data.status === 'error') {
        outcome = 'app_error';
        metrics.failedRequests++;
      } else {
        outcome = 'http_error';
        metrics.failedRequests++;
      }

      appendCsvRow([isoTs, this.id, this.surveyType, seq, batch.length, httpStatus, outcome, ackCount, latency, responseBody]);
    } catch (err) {
      const latency = Date.now() - startTime;
      metrics.latenciesMs.push(latency);
      metrics.failedRequests++;
      appendCsvRow([isoTs, this.id, this.surveyType, seq, batch.length, httpStatus, 'network_error', '', latency, String(err.message || err)]);
    } finally {
      this.isSyncing = false;
    }
  }
}

function buildSurveyors() {
  if (MODE === 'representative') {
    return MODULES.map((mod, i) => new VirtualSurveyor(i + 1, mod));
  }
  // worstcase: all main-road, matching the repository's original stress scenario
  return Array.from({ length: NUM_SURVEYORS_ARG }, (_, i) => new VirtualSurveyor(i + 1, 'main-road'));
}

async function run() {
  const surveyors = buildSurveyors();
  console.log('================================================================');
  console.log(' TRAFFIC SURVEY APP: LOAD TEST (T1)');
  console.log('================================================================');
  console.log(` Mode:                 ${MODE}`);
  console.log(` Surveyors:            ${surveyors.length} (${surveyors.map(s => s.surveyType).join(', ')})`);
  console.log(` Duration:             ${DURATION_SECONDS}s`);
  console.log(` Tap interval:         ${TAP_INTERVAL_MS}ms/surveyor (deployed constant, not configurable in-app)`);
  console.log(` Sync interval:        ${SYNC_INTERVAL_MS}ms (main-road/app.js:42)`);
  console.log(` Max batch size:       ${MAX_BATCH_SIZE} (main-road/app.js:286)`);
  console.log(` Admin ID:             ${ADMIN_ID}`);
  console.log(` Endpoint:             ${APPS_SCRIPT_URL}`);
  console.log(` CSV log:              ${csvPath}`);
  console.log('----------------------------------------------------------------');

  metrics.startTime = Date.now();
  surveyors.forEach(s => s.start());

  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - metrics.startTime) / 1000);
    console.log(`[${elapsed}s/${DURATION_SECONDS}s] generated=${metrics.totalEventsGenerated} requests=${metrics.totalRequestsSent} ok=${metrics.successfulRequests} fail=${metrics.failedRequests} acked=${metrics.totalEventsAcknowledged}`);
  }, 30000);

  await new Promise(resolve => setTimeout(resolve, DURATION_SECONDS * 1000));

  clearInterval(progressInterval);
  surveyors.forEach(s => s.stop());
  console.log('\nDuration elapsed. Draining remaining queues (final flush)...');
  await Promise.all(surveyors.map(s => s.finalFlush()));

  metrics.endTime = Date.now();
  report(surveyors);
}

function report(surveyors) {
  const totalDurationSec = (metrics.endTime - metrics.startTime) / 1000;
  const sizes = metrics.batchSizes.slice().sort((a, b) => a - b);
  const avgBatch = sizes.length ? (sizes.reduce((a, b) => a + b, 0) / sizes.length) : 0;
  const medianBatch = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
  const minBatch = sizes.length ? sizes[0] : 0;
  const maxBatch = sizes.length ? sizes[sizes.length - 1] : 0;

  const lat = metrics.latenciesMs.slice().sort((a, b) => a - b);
  const avgLat = lat.length ? (lat.reduce((a, b) => a + b, 0) / lat.length) : 0;
  const medianLat = lat.length ? lat[Math.floor(lat.length / 2)] : 0;

  const shortfall = metrics.totalEventsGenerated - metrics.totalEventsAcknowledged;

  const summary = {
    mode: MODE,
    surveyors: surveyors.length,
    surveyTypes: surveyors.map(s => s.surveyType),
    durationSecondsRequested: DURATION_SECONDS,
    durationSecondsActual: totalDurationSec,
    tapIntervalMs: TAP_INTERVAL_MS,
    syncIntervalMs: SYNC_INTERVAL_MS,
    maxBatchSize: MAX_BATCH_SIZE,
    adminId: ADMIN_ID,
    totalEventsGenerated: metrics.totalEventsGenerated,
    totalRequestsSent: metrics.totalRequestsSent,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    totalEventsAcknowledged: metrics.totalEventsAcknowledged,
    shortfall,
    avgBatchSize: Number(avgBatch.toFixed(2)),
    medianBatchSize: medianBatch,
    minBatchSize: minBatch,
    maxBatchSize_observed: maxBatch,
    avgLatencyMs: Number(avgLat.toFixed(0)),
    medianLatencyMs: medianLat,
    minLatencyMs: lat.length ? lat[0] : 0,
    maxLatencyMs: lat.length ? lat[lat.length - 1] : 0,
    eventsPerSecondRateUsed: Number((1000 / TAP_INTERVAL_MS).toFixed(3)) + ' events/sec/surveyor',
    csvPath,
  };

  console.log('\n================================================================');
  console.log('                    LOAD-TEST RESULTS (T1)                     ');
  console.log('================================================================');
  console.log(JSON.stringify(summary, null, 2));

  const jsonPath = path.join(outDir, `${runId}.summary.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  console.log(`\nSummary JSON written to: ${jsonPath}`);
  console.log(`Per-request CSV written to: ${csvPath}`);

  if (shortfall !== 0) {
    console.log(`\n*** RECONCILIATION MISMATCH: ${shortfall} events generated were not acknowledged by the backend. ***`);
  } else {
    console.log('\nReconciliation OK: events generated === events acknowledged by backend.');
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
