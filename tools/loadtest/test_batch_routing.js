// Runs the REAL handleSubmitBatch from backend/master_apps_script.js inside a
// vm with the Google Apps Script globals mocked, and checks that a mixed
// batch lands in the right sheets. This is the bug being fixed: previously
// one sheet was chosen from payload[0].surveyType and everything went there.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Defaults to the working copy; pass a path to test another version
// (used to confirm this test actually fails against the pre-fix backend).
const SRC = process.argv[2] || path.join('C:\\Users\\User\\Desktop\\PB\\traffic-survey-app', 'backend', 'master_apps_script.js');

// ---- mocked spreadsheet ------------------------------------------------
function makeSheet(name) {
    const rows = [];
    return {
        name,
        rows,
        getLastRow: () => rows.length,
        getRange: (startRow, startCol, numRows, numCols) => ({
            setValues: (values) => {
                if (values.length !== numRows) throw new Error('row count mismatch');
                values.forEach(r => {
                    // real setValues rejects ragged input
                    if (r.length !== numCols) {
                        throw new Error('The number of columns in the data does not match the number of columns in the range.');
                    }
                    rows.push(r);
                });
            }
        }),
        appendRow: (r) => rows.push(r),
        getRange2: null,
        setFrozenRows: () => {},
    };
}

const targetSheets = {};
const targetSs = {
    getId: () => 'TARGET_SS',
    getUrl: () => 'https://example/target',
    getSheetByName: (n) => targetSheets[n] || null,
    insertSheet: (n) => (targetSheets[n] = makeSheet(n)),
    getSheets: () => Object.values(targetSheets),
};

// registry: one admin, ADM-TEST, pointing at TARGET_SS
const registrySheet = makeSheet('Admin_Registry');
registrySheet.rows.push(['Timestamp', 'Name', 'Email', 'Institute', 'Country', 'Password', 'AdminID', 'TargetSheetID', 'TargetSheetURL', 'Config', 'PasswordSalt']);
registrySheet.rows.push([new Date(), 'Test', 't@e.com', 'Inst', 'LK', 'hash', 'ADM-TEST', 'TARGET_SS', 'url', '{}', 'salt']);
registrySheet.getDataRange = () => ({ getValues: () => registrySheet.rows });

const registrySs = {
    getId: () => 'REGISTRY_SS',
    getUrl: () => 'https://example/registry',
    getSheetByName: (n) => (n === 'Admin_Registry' ? registrySheet : null),
    insertSheet: (n) => makeSheet(n),
    getSheets: () => [registrySheet],
};

const sandbox = {
    SpreadsheetApp: {
        create: () => registrySs,
        openById: (id) => (id === 'TARGET_SS' ? targetSs : registrySs),
    },
    PropertiesService: {
        getScriptProperties: () => ({
            getProperty: (k) => (k === 'REGISTRY_SHEET_ID' ? 'REGISTRY_SS' : null),
            setProperty: () => {},
        }),
    },
    CacheService: {
        getScriptCache: () => {
            const store = {};
            return {
                get: (k) => (k in store ? store[k] : null),
                put: (k, v) => { store[k] = v; },
                remove: (k) => { delete store[k]; },
            };
        },
    },
    ContentService: {
        MimeType: { JSON: 'json', TEXT: 'text' },
        createTextOutput: (s) => ({ setMimeType: () => s }),
    },
    Utilities: {
        getUuid: () => 'uuid',
        computeDigest: () => [1, 2, 3],
        DigestAlgorithm: { SHA_256: 'sha256' },
        Charset: { UTF_8: 'utf8' },
    },
    MailApp: { sendEmail: () => {} },
    Logger: { log: console.log },
    console,
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox);

// ---- the mixed batch a real device produces ----------------------------
const mk = (surveyType, extra) => Object.assign({
    adminId: 'ADM-TEST',
    eventId: 'evt-' + Math.random().toString(36).slice(2),
    name: 'ABC',
    location: '6.07850, 80.19242',
    locationNumber: '3',
    date: '2026-09-13',
    time: '10:00:00',
}, extra, { surveyType });

// argv[3] === 'samewidth' uses only the two 8-column road types, which is
// the quieter failure mode: no exception, rows just land in the wrong tab.
const SAME_WIDTH_ONLY = process.argv[3] === 'samewidth';

const payload = SAME_WIDTH_ONLY ? [
    mk('main-road', { direction: 'In', vehicleType: 'Car' }),
    mk('main-road', { direction: 'Out', vehicleType: 'Bus' }),
    mk('4-way-junction', { direction: 'Left', vehicleType: 'Bike' }),
    mk('4-way-junction', { direction: 'Straight', vehicleType: 'Truck' }),
    mk('4-way-junction', { direction: 'Right', vehicleType: 'Van' }),
] : [
    mk('main-road', { direction: 'In', vehicleType: 'Car' }),
    mk('main-road', { direction: 'Out', vehicleType: 'Bus' }),
    mk('4-way-junction', { direction: 'Left', vehicleType: 'Bike' }),
    mk('4-way-junction', { direction: 'Straight', vehicleType: 'Truck' }),
    mk('4-way-junction', { direction: 'Right', vehicleType: 'Van' }),
    // different column count -- this is what used to throw and stall the queue
    mk('pedestrian', { startTime: '10:00:00', finishTime: '10:15:00', countIn: '12', countOut: '9' }),
    mk('bus-idling', { gps: '6.07,80.19', busRoute: '350', startTime: '10:01', stopTime: '10:03', idlingDuration: '120', gotOff: '4', gotOn: '6' }),
    // unknown type -> single-column fallback row, must not break its group
    mk('space-elevator', { weird: true }),
];

let result;
try {
    result = sandbox.handleSubmitBatch({ payload });
} catch (e) {
    console.log('THREW:', e.message);
    process.exit(1);
}

console.log('response:', result);
console.log('');
Object.keys(targetSheets).sort().forEach(name => {
    const s = targetSheets[name];
    console.log(`sheet "${name}": ${s.rows.length} row(s), ${s.rows[0] ? s.rows[0].length : 0} cols`);
    s.rows.forEach(r => console.log('   ', JSON.stringify(r)));
});

// ---- assertions --------------------------------------------------------
const fail = [];
const count = (n) => (targetSheets[n] ? targetSheets[n].rows.length : 0);
// Expected counts come from the payload actually sent, so the samewidth
// run is not marked failing for types it never submitted.
const expected = {};
payload.forEach((p) => { expected[p.surveyType] = (expected[p.surveyType] || 0) + 1; });
Object.keys(expected).forEach((t) => {
    if (count(t) !== expected[t]) {
        fail.push(t + ' should have ' + expected[t] + ' row(s), has ' + count(t));
    }
});

// no 4-way row may appear in the main-road sheet
const mr = targetSheets['main-road'];
if (mr && mr.rows.some(r => ['Left', 'Straight', 'Right'].indexOf(r[5]) !== -1)) {
    fail.push('a 4-way-junction row leaked into the main-road sheet');
}

console.log('\n' + (fail.length ? 'FAILURES:\n - ' + fail.join('\n - ') : 'ALL CHECKS PASSED'));
process.exit(fail.length ? 1 : 0);
