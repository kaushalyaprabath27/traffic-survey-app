/**
 * LOAD-TEST HARNESS: BATCHING & QUOTA VALIDATION
 * 
 * Simulates 34 concurrent virtual surveyors operating for 10 minutes (600 seconds),
 * queuing events at ~1 tap/sec and flushing in batches up to 50 items every 15 seconds.
 * 
 * Target: Google Apps Script Master Endpoint
 */

const APPS_SCRIPT_URL = (typeof window !== 'undefined' && window.ENV_APPS_SCRIPT_URL) ? window.ENV_APPS_SCRIPT_URL : 'https://script.google.com/macros/s/AKfycbz4jYswPv7LSFSkSymoQ8tBt1ui6ngLTwh5EAKNVxu5Qf16-oGT8zf6nMkczo-o5hQC/exec';

const NUM_SURVEYORS = parseInt(process.env.TEST_SURVEYORS || '34', 10);
const DURATION_SECONDS = parseInt(process.argv[2] || process.env.TEST_DURATION_SECONDS || '600', 10); // Default 10 min
const TAP_INTERVAL_MS = 1000; // 1 tap per second
const SYNC_INTERVAL_MS = 15000; // 15 seconds batch flush
const MAX_BATCH_SIZE = 50;

const vehicleTypes = ['Bike', 'Tuk Tuk', 'Car', 'Bus', 'Van', 'Truck', 'Long Vehicle'];
const directions = ['In', 'Out'];

// Global Benchmark Metrics
const metrics = {
    totalEventsGenerated: 0,
    totalRequestsSent: 0,
    successfulRequests: 0,
    failedRequests: 0,
    batchSizes: [],
    latenciesMs: [],
    startTime: 0,
    endTime: 0
};

class VirtualSurveyor {
    constructor(id) {
        this.id = `SURVEYOR-${String(id).padStart(2, '0')}`;
        this.adminId = 'ADM-TEST';
        this.queue = [];
        this.eventsGenerated = 0;
        this.requestsSent = 0;
        this.isSyncing = false;
        this.tapTimer = null;
        this.syncTimer = null;
    }

    start() {
        // Generate 1 event per second
        this.tapTimer = setInterval(() => this.recordEvent(), TAP_INTERVAL_MS);
        
        // Stagger initial sync timers slightly (0-2s offset) to simulate non-aligned client clocks
        const initialDelay = Math.floor(Math.random() * 2000);
        setTimeout(() => {
            this.syncTimer = setInterval(() => this.flushQueue(), SYNC_INTERVAL_MS);
        }, initialDelay);
    }

    stop() {
        if (this.tapTimer) clearInterval(this.tapTimer);
        if (this.syncTimer) clearInterval(this.syncTimer);
        // Final flush if queue has remaining items
        if (this.queue.length > 0) {
            this.flushQueue(true);
        }
    }

    recordEvent() {
        const now = new Date();
        const event = {
            action: 'submit',
            adminId: this.adminId,
            surveyType: 'main-road',
            name: this.id,
            location: 'LoadTest-Point-A',
            locationNumber: 'E1',
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            direction: directions[Math.floor(Math.random() * directions.length)],
            vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
            timestamp: now.getTime()
        };

        this.queue.push(event);
        this.eventsGenerated++;
        metrics.totalEventsGenerated++;
    }

    async flushQueue(isFinal = false) {
        if (this.queue.length === 0) return;
        if (this.isSyncing && !isFinal) return;

        const batch = this.queue.slice(0, MAX_BATCH_SIZE);
        this.isSyncing = true;

        const startTime = Date.now();
        metrics.totalRequestsSent++;
        this.requestsSent++;
        metrics.batchSizes.push(batch.length);

        try {
            const res = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'submit_batch',
                    payload: batch
                }),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                }
            });

            const latency = Date.now() - startTime;
            metrics.latenciesMs.push(latency);

            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status}`);
            }

            const data = await res.json();
            if (data.status === 'success') {
                metrics.successfulRequests++;
                // Remove successfully sent items from local queue
                this.queue = this.queue.slice(batch.length);
            } else {
                metrics.failedRequests++;
                console.error(`[${this.id}] Server returned error status:`, data.message);
            }
        } catch (err) {
            metrics.failedRequests++;
            console.error(`[${this.id}] Network/Sync Error:`, err.message);
        } finally {
            this.isSyncing = false;
        }
    }
}

async function runLoadTest() {
    console.log(`================================================================`);
    console.log(` TRAFFIC SURVEY APP: CONCURRENT LOAD-TEST & QUOTA BENCHMARK`);
    console.log(`================================================================`);
    console.log(` Virtual Surveyors:    ${NUM_SURVEYORS}`);
    console.log(` Expected Duration:     ${DURATION_SECONDS} seconds (${DURATION_SECONDS/60} minutes)`);
    console.log(` Event Tap Frequency:   ~1 event / sec / surveyor`);
    console.log(` Batch Flush Polling:   Every 15 seconds (Max 50 items/batch)`);
    console.log(` Target Endpoint:      ${APPS_SCRIPT_URL}`);
    console.log(`----------------------------------------------------------------`);
    console.log(` Starting load test run...\n`);

    metrics.startTime = Date.now();

    const surveyors = Array.from({ length: NUM_SURVEYORS }, (_, i) => new VirtualSurveyor(i + 1));
    surveyors.forEach(s => s.start());

    // Progress reporter every 30 seconds
    const progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - metrics.startTime) / 1000);
        console.log(`[Progress: ${elapsed}s / ${DURATION_SECONDS}s] Events Generated: ${metrics.totalEventsGenerated} | Batches Sent: ${metrics.totalRequestsSent} (Success: ${metrics.successfulRequests}, Fail: ${metrics.failedRequests})`);
    }, 30000);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, DURATION_SECONDS * 1000));

    clearInterval(progressInterval);
    console.log(`\nStopping virtual surveyors & executing final queue flushes...`);
    
    // Stop all virtual surveyors and allow final batch flushes to complete
    await Promise.all(surveyors.map(s => {
        s.stop();
        return new Promise(r => setTimeout(r, 2000));
    }));

    metrics.endTime = Date.now();
    reportResults();
}

function reportResults() {
    const totalDurationSec = (metrics.endTime - metrics.startTime) / 1000;
    const avgBatchSize = metrics.batchSizes.length > 0 
        ? (metrics.batchSizes.reduce((a, b) => a + b, 0) / metrics.batchSizes.length).toFixed(2)
        : 0;
    const minBatchSize = metrics.batchSizes.length > 0 ? Math.min(...metrics.batchSizes) : 0;
    const maxBatchSize = metrics.batchSizes.length > 0 ? Math.max(...metrics.batchSizes) : 0;

    const avgLatency = metrics.latenciesMs.length > 0
        ? (metrics.latenciesMs.reduce((a, b) => a + b, 0) / metrics.latenciesMs.length).toFixed(0)
        : 0;
    const minLatency = metrics.latenciesMs.length > 0 ? Math.min(...metrics.latenciesMs) : 0;
    const maxLatency = metrics.latenciesMs.length > 0 ? Math.max(...metrics.latenciesMs) : 0;

    const unbatchedRequestCount = metrics.totalEventsGenerated;
    const batchedRequestCount = metrics.totalRequestsSent;
    const requestReductionPct = (((unbatchedRequestCount - batchedRequestCount) / unbatchedRequestCount) * 100).toFixed(2);

    // Apps Script Execution Time Calculation:
    // Without batching: ~0.3s per standalone appendRow request => unbatchedRequestCount * 0.3s
    // With batching: ~0.25s per setValues batch request => batchedRequestCount * 0.25s
    const unbatchedEstCpuSec = (unbatchedRequestCount * 0.3).toFixed(1);
    const batchedEstCpuSec = (batchedRequestCount * 0.25).toFixed(1);
    const cpuReductionPct = (((unbatchedEstCpuSec - batchedEstCpuSec) / unbatchedEstCpuSec) * 100).toFixed(2);

    console.log(`\n================================================================`);
    console.log(`                  LOAD-TEST BENCHMARK RESULTS                   `);
    console.log(`================================================================`);
    console.log(` Total Duration:             ${totalDurationSec.toFixed(1)} seconds`);
    console.log(` Virtual Surveyors Simulated:${NUM_SURVEYORS}`);
    console.log(` Total Vehicle Events Logged:${metrics.totalEventsGenerated}`);
    console.log(` Total Batch HTTP Requests:  ${metrics.totalRequestsSent}`);
    console.log(` Successful Responses:       ${metrics.successfulRequests}`);
    console.log(` Failed/Error Responses:     ${metrics.failedRequests}`);
    console.log(` Success Rate:               ${((metrics.successfulRequests / (metrics.totalRequestsSent || 1)) * 100).toFixed(2)}%`);
    console.log(`----------------------------------------------------------------`);
    console.log(` BATCH METRICS:`);
    console.log(`   - Average Batch Size:     ${avgBatchSize} items / request`);
    console.log(`   - Min / Max Batch Size:   ${minBatchSize} / ${maxBatchSize} items`);
    console.log(`   - Target Polling Window:  15.0 seconds`);
    console.log(`----------------------------------------------------------------`);
    console.log(` LATENCY & PERFORMANCE:`);
    console.log(`   - Average Roundtrip:      ${avgLatency} ms`);
    console.log(`   - Min / Max Latency:      ${minLatency} ms / ${maxLatency} ms`);
    console.log(`----------------------------------------------------------------`);
    console.log(` APPS SCRIPT QUOTA ANALYSIS:`);
    console.log(`   - Unbatched HTTP Requests: ${unbatchedRequestCount} requests`);
    console.log(`   - Batched HTTP Requests:   ${batchedRequestCount} requests`);
    console.log(`   - Network Overhead Cut:    ${requestReductionPct}% reduction`);
    console.log(`   - Unbatched Est. Execution:${unbatchedEstCpuSec} sec (${(unbatchedEstCpuSec/60).toFixed(2)} min)`);
    console.log(`   - Batched Est. Execution:  ${batchedEstCpuSec} sec (${(batchedEstCpuSec/60).toFixed(2)} min)`);
    console.log(`   - Daily Quota CPU Savings: ${cpuReductionPct}% reduction`);
    console.log(`================================================================\n`);
}

runLoadTest();
