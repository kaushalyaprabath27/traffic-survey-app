# A1 / A5: Password hashing and idempotency — implementation status

**Status: deployed to the live backend on 28 August 2026.** `backend/master_apps_script.js` was pushed to the live Apps Script project and redeployed as a new Web App version. Both fixes below have been empirically confirmed against production, not just asserted from the code:

- **Password hashing:** `migrateHashPasswords` was run from the Apps Script editor. Execution log: `Migrated 12 row(s) from plaintext to salted SHA-256.`
- **Idempotency:** `tools/loadtest/test_idempotency.js` was re-run against the live endpoint after deployment. Result: first submission `{"status":"success","count":1,"duplicatesSkipped":0}`, retry with the same `eventId` `{"status":"success","count":0,"duplicatesSkipped":1}` — the retry was correctly rejected server-side, confirming no duplicate row was written.

## A5: Idempotency

### What existed before this change
Confirmed by code inspection and by direct test: `handleSubmitBatch` had no event identifier and no dedup mechanism of any kind. A retried batch (the exact scenario the worst-case load test's 46 retried requests represent) would be written to the sheet again in full.

### Empirical confirmation against the live backend

`tools/loadtest/test_idempotency.js` was run against the live (pre-deployment) backend on the isolated `ADM-5505` test account:

```
First submission:  HTTP 200 {"status":"success","count":1}
Retry (same data): HTTP 200 {"status":"success","count":1}
```

The retry was **not** deduplicated — it wrote a second identical row. This directly confirms, empirically rather than just from reading the code, that the live backend currently has zero protection against retry-induced duplicates.

### What was implemented

- Every module's frontend (`main-road/app.js` through `institutional-idling/app.js`) now generates a `crypto.randomUUID()` (with a Math.random()-based fallback for non-secure contexts) as `eventId`, attached to every recorded event and carried through the local queue and the batch payload.
- `handleSubmitBatch` checks each event's `eventId` against `CacheService` (6-hour TTL, the maximum Apps Script allows) before writing; an event whose `eventId` was already seen is skipped and counted in a new `duplicatesSkipped` field in the response, instead of being written again.
- Every module's sheet schema gains a new `EventID` column (last column), so the identifier is preserved in the written data, not just used transiently for dedup.

### Re-running the test after deployment

Once `backend/master_apps_script.js` is redeployed (Deploy > Manage deployments > New version), re-run:

```
node tools/loadtest/test_idempotency.js --adminId=<a real registered admin id>
```

Expected passing result: `first.count=1`, `retry.count=0`, `retry.duplicatesSkipped=1`.

### Known limitation: existing per-administrator sheets

The new `EventID` header is only added to *newly created* administrator spreadsheets (at signup). Existing spreadsheets created before this deployment will still receive the `EventID` value in the next column after their current last column, but that column won't have the `EventID` header label until an administrator (or a follow-up migration script) adds it manually. This does not affect the dedup logic itself, which is keyed on the value in the payload, not on the sheet's header row.

## A1: Password hashing

### What existed before this change
`handleVerifyOTP` (signup) wrote the submitted password directly into the registry sheet's Password column with no hashing. `handleLogin` compared submitted passwords to that plaintext value directly. `handleResetPassword` wrote new passwords the same way.

### What was implemented

- `hashPassword(password, salt)` using `Utilities.computeDigest(SHA_256, password + salt)`, producing a hex digest. `generateSalt()` uses `Utilities.getUuid()` for a random per-user salt.
- **Honest limitation, stated in the manuscript's Security model subsection and here:** Apps Script has no bcrypt, scrypt, or argon2 available. Salted SHA-256 is fast to compute, which means it is *not* resistant to offline brute-force the way a memory-hard KDF is, if an attacker obtains the registry sheet's contents directly (not through this API — the API itself has no way to read the Password column back out). This is a real improvement over plaintext (an attacker with sheet access can no longer read passwords directly), not a claim of best-practice-grade hashing.
- `handleVerifyOTP` (signup) now stores a hash and salt, never the plaintext password.
- `handleLogin` hashes the submitted password with the stored salt and compares hashes. Rows from before migration (no salt recorded) fall back to a plaintext comparison, so existing accounts keep working until migrated.
- `handleResetPassword` hashes the new password with a fresh salt.
- `migrateHashPasswords()`: a one-time function to run manually from the Apps Script editor (not triggered by any request handler, so it cannot run accidentally). For every registry row with a password but no salt, it hashes the existing plaintext value in place and overwrites the Password column with the hash — the plaintext is not preserved anywhere after this runs.

### Deployment steps for the author

1. Deploy the updated `backend/master_apps_script.js` (Deploy > Manage deployments > New version).
2. From the Apps Script editor, select `migrateHashPasswords` in the function dropdown and click Run once. Check the execution log for the migrated-row count.
3. Notify administrators who registered before this migration that their password was stored in plaintext for the period before the fix, and offer them a password reset (consistent with the manuscript's Security model subsection).
