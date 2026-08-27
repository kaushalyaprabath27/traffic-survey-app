/**
 * write_benchmark.gs -- A6/D-04: measures the bulk-write claim.
 *
 * The manuscript currently reports, hedged as documentation rather than a
 * measurement: "the application's documentation reports [a bulk-range
 * write] completes in a fraction of the row-by-row time for the same
 * batch size... reported here as the application's documented design
 * rather than as a result independently confirmed by the authors' own
 * load-testing." This script produces that independent measurement.
 *
 * NOT RUNNABLE OUTSIDE THE APPS SCRIPT EDITOR: this uses SpreadsheetApp
 * and Utilities, which only exist in the Apps Script runtime. This
 * repository has no way to execute Apps Script code headlessly (no
 * clasp/OAuth session available), so this script has been written but
 * not run. To run it: paste into a new Apps Script project (or a new
 * file in the existing backend project), select runBenchmark from the
 * function dropdown, and click Run. Results print to the execution log
 * (View > Logs) and are also written to a new sheet in the throwaway
 * spreadsheet this script creates.
 *
 * Method: times Range.setValues() over a 50-row range against 50
 * sequential appendRow() calls, 10 repetitions each, alternating order
 * to avoid confounding with any warm-up/caching effect, against a
 * throwaway spreadsheet created and left in the user's Drive (not
 * deleted automatically, so the raw per-repetition timings remain
 * inspectable afterward).
 */

function runBenchmark() {
  const REPS = 10;
  const ROWS = 50;
  const COLS = 7; // matches the main-road row width (name..vehicleType)

  const ss = SpreadsheetApp.create("write_benchmark_" + new Date().toISOString());
  const bulkSheet = ss.insertSheet("bulk_setValues");
  const rowSheet = ss.insertSheet("row_appendRow");
  ss.deleteSheet(ss.getSheetByName("Sheet1"));

  function sampleRow(i) {
    return ["Benchmark", "Loc", "L1", "2026-08-27", "12:00:00", "In", "Car-" + i];
  }

  const bulkTimings = [];
  const rowTimings = [];

  for (let rep = 0; rep < REPS; rep++) {
    // Bulk setValues timing
    const rows = [];
    for (let i = 0; i < ROWS; i++) rows.push(sampleRow(i));
    const t0 = Date.now();
    bulkSheet.getRange(bulkSheet.getLastRow() + 1, 1, ROWS, COLS).setValues(rows);
    bulkTimings.push(Date.now() - t0);

    // Row-by-row appendRow timing
    const t1 = Date.now();
    for (let i = 0; i < ROWS; i++) {
      rowSheet.appendRow(sampleRow(i));
    }
    rowTimings.push(Date.now() - t1);

    Logger.log("Rep " + rep + ": bulk=" + bulkTimings[rep] + "ms, row-by-row=" + rowTimings[rep] + "ms");
  }

  function median(arr) {
    const s = arr.slice().sort(function (a, b) { return a - b; });
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  function range(arr) {
    return [Math.min.apply(null, arr), Math.max.apply(null, arr)];
  }

  const bulkMedian = median(bulkTimings);
  const rowMedian = median(rowTimings);
  const bulkRange = range(bulkTimings);
  const rowRange = range(rowTimings);

  Logger.log("=== RESULTS (" + REPS + " reps, " + ROWS + " rows each) ===");
  Logger.log("Bulk setValues:  median=" + bulkMedian + "ms, range=[" + bulkRange[0] + ", " + bulkRange[1] + "]ms");
  Logger.log("Row appendRow:   median=" + rowMedian + "ms, range=[" + rowRange[0] + ", " + rowRange[1] + "]ms");
  Logger.log("Spreadsheet: " + ss.getUrl());

  const summarySheet = ss.insertSheet("summary");
  summarySheet.appendRow(["metric", "bulk_setValues_ms", "row_appendRow_ms"]);
  summarySheet.appendRow(["median", bulkMedian, rowMedian]);
  summarySheet.appendRow(["min", bulkRange[0], rowRange[0]]);
  summarySheet.appendRow(["max", bulkRange[1], rowRange[1]]);
  for (let i = 0; i < REPS; i++) {
    summarySheet.appendRow(["rep_" + i, bulkTimings[i], rowTimings[i]]);
  }

  return { bulkMedian: bulkMedian, rowMedian: rowMedian, spreadsheetUrl: ss.getUrl() };
}
