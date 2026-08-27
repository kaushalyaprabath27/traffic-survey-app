/**
 * test_idempotency.js -- A5.3: forced-ACK-loss idempotency test.
 *
 * Simulates the scenario the load test's 46 retried requests represent:
 * the backend receives and writes a batch, but the client never sees (or
 * deliberately discards) the success response, so it retries the same
 * batch. With the eventId-based server-side dedup now in the backend
 * (backend/master_apps_script.js, handleSubmitBatch), the retry should be
 * skipped server-side and produce zero duplicate rows.
 *
 * IMPORTANT: this script tests the CODE IN THIS REPOSITORY, which is not
 * yet deployed to the live backend as of this commit -- see the note in
 * docs/idempotency_test_results.md (or the manuscript's Security model /
 * Method validation sections) for deployment status. Running this against
 * the current live endpoint will show zero dedup effect until the author
 * deploys the updated backend/master_apps_script.js.
 *
 * Usage:
 *   node test_idempotency.js --adminId=ADM-XXXX
 */

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
const ADMIN_ID = argv.adminId || process.env.LOADTEST_ADMIN_ID;
if (!ADMIN_ID) {
  console.error('ERROR: --adminId=<registered admin id> is required');
  process.exit(1);
}

// crypto.randomUUID is available in modern Node without an import.
function uuid() {
  return crypto.randomUUID();
}

async function submitBatch(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'submit_batch', payload }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* leave null */ }
  return { httpStatus: res.status, data, raw: text };
}

async function main() {
  const eventId = uuid();
  const now = new Date();
  const event = {
    action: 'submit',
    eventId,
    adminId: ADMIN_ID,
    surveyType: 'main-road',
    name: 'IDEMPOTENCY-TEST',
    location: 'Idempotency-Test-Point',
    locationNumber: 'X1',
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0],
    direction: 'In',
    vehicleType: 'Car',
  };

  console.log('=== A5.3: Forced ACK-loss idempotency test ===');
  console.log('eventId:', eventId);
  console.log('adminId:', ADMIN_ID);
  console.log();

  console.log('--- First submission (the "write commits, ACK is then discarded" case) ---');
  const first = await submitBatch([event]);
  console.log('HTTP', first.httpStatus, JSON.stringify(first.data));
  // Deliberately proceed as if this response was never seen by the client
  // (simulating a dropped connection after the server-side write committed).

  console.log('\n--- Retry with the SAME eventId (what a real client retry would send) ---');
  const retry = await submitBatch([event]);
  console.log('HTTP', retry.httpStatus, JSON.stringify(retry.data));

  console.log('\n=== Result ===');
  const firstCount = first.data && first.data.count;
  const retryCount = retry.data && retry.data.count;
  const retrySkipped = retry.data && retry.data.duplicatesSkipped;

  if (firstCount === 1 && retryCount === 0 && retrySkipped === 1) {
    console.log('PASS: first write landed (count=1), retry was fully deduplicated (count=0, duplicatesSkipped=1).');
    console.log('No duplicate row should exist in the target sheet for this eventId.');
  } else {
    console.log('FAIL or backend not yet updated with dedup logic:');
    console.log(`  first.count=${firstCount} (expected 1)`);
    console.log(`  retry.count=${retryCount} (expected 0)`);
    console.log(`  retry.duplicatesSkipped=${retrySkipped} (expected 1)`);
    console.log('If retry.count is 1 and duplicatesSkipped is undefined, the live backend does not yet');
    console.log('have this repository\'s updated handleSubmitBatch deployed -- this is expected until');
    console.log('the author redeploys backend/master_apps_script.js.');
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
