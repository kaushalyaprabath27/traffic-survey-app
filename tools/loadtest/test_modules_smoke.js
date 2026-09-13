/**
 * MODULE SMOKE TEST -- does every survey module still actually record?
 *
 * Loads each module's real index.html + app.js in a real DOM (jsdom), the
 * way the root portal launches it (?skipSetup=true&admin=...), fires the
 * page lifecycle, drives that module's own recording control the way a
 * surveyor would, and checks that an event lands in that module's
 * localStorage queue. A module that throws during load, or records
 * nothing, is reported as broken.
 *
 * Written after four modules were found to be calling functions that were
 * never defined (roundabout: loadOfflineQueue/processQueue, pedestrian and
 * institutional-idling: updateNetworkStatus, bus-idling: processQueue).
 * Each threw during init, which aborted the rest of init -- and where
 * init() is called at top level, the rest of the FILE -- so listeners were
 * never attached and the module silently recorded nothing. Nothing in the
 * repo would have caught that, because nothing executed these files.
 *
 * Note the two interaction styles: the counting modules record on a single
 * .vehicle-btn tap, while pedestrian and bus-idling are start/stop toggles
 * where one click only begins the observation. An earlier version of this
 * harness clicked once and wrongly reported both as broken.
 *
 * Requires jsdom, which this repository does not vendor (it has no
 * package.json -- the frontend is plain static files):
 *   npm i jsdom        # in a scratch dir, then run with NODE_PATH set
 *   node tools/loadtest/test_modules_smoke.js
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..', '..');
const MODULES = ['main-road', 'roundabout', 't-junction', '4-way-junction',
                 'pedestrian', 'bus-idling', 'institutional-idling'];

function testModule(mod) {
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.message || e)));
    vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

    const html = fs.readFileSync(path.join(APP, mod, 'index.html'), 'utf8');
    const dom = new JSDOM(html, {
        url: 'https://traficaaa.netlify.app/' + mod +
             '/index.html?skipSetup=true&admin=ADM-TEST&adminName=T&name=Tester&loc=6.1,80.2&locNum=3',
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        virtualConsole: vc,
    });
    const { window } = dom;
    const doc = window.document;

    window.alert = () => {};
    window.confirm = () => true;
    window.scrollTo = () => {};
    if (!window.navigator.vibrate) window.navigator.vibrate = () => {};
    // geolocation is only used behind a button press, but stub it anyway
    Object.defineProperty(window.navigator, 'geolocation', {
        value: { getCurrentPosition: (ok) => ok({ coords: { latitude: 6.1, longitude: 80.2 } }) },
        configurable: true,
    });
    window.fetch = () => new Promise(() => {}); // never resolves: no real sync

    let loadError = null;
    try {
        // config.js is git-ignored locally in some checkouts; tolerate absence
        const cfgPath = path.join(APP, 'config.js');
        if (fs.existsSync(cfgPath)) window.eval(fs.readFileSync(cfgPath, 'utf8'));
        window.eval(fs.readFileSync(path.join(APP, mod, 'app.js'), 'utf8'));
    } catch (e) {
        loadError = e.message;
    }

    if (!loadError) {
        try {
            doc.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
            if (typeof window.onload === 'function') window.onload();
        } catch (e) {
            loadError = 'lifecycle: ' + e.message;
        }
    }

    // let the module's own 100ms skipSetup timer run
    return new Promise((resolve) => {
        setTimeout(() => {
            const keyMatch = fs.readFileSync(path.join(APP, mod, 'app.js'), 'utf8')
                .match(/const STORAGE_KEY = '([^']+)'/);
            const key = keyMatch ? keyMatch[1] : '(none)';

            const before = (() => {
                try { return JSON.parse(window.localStorage.getItem(key) || '[]').length; }
                catch (e) { return 0; }
            })();

            // find the control this module records with
            const btns = doc.querySelectorAll(".vehicle-btn");
            let clicked = null;
            let clickError = null;
            if (btns.length) {
                clicked = '.vehicle-btn (' + btns.length + ')';
                try { btns[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
                catch (e) { clickError = e.message; }
            } else {
                // Modules with a bespoke flow, driven the way a surveyor
                // actually drives them. Both are start/stop toggles, so a
                // single click only STARTS the observation -- an earlier
                // version of this harness clicked once and wrongly reported
                // these two as recording nothing. Note also that the survey
                // screen id differs between modules (#survey-screen vs
                // #screen-survey).
                const press = (sel) => {
                    const el = doc.querySelector(sel);
                    if (!el) return false;
                    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
                    return true;
                };
                try {
                    if (doc.querySelector('#btn-action')) {
                        // pedestrian: start crossing, then stop -> saves
                        clicked = '#btn-action x2 (start/stop)';
                        press('#btn-action');
                        press('#btn-action');
                    } else if (doc.querySelector('#toggleTimerBtn')) {
                        // bus-idling: pick a route (the save handler rightly
                        // refuses without one), start idling, stop, then save
                        clicked = 'route + #toggleTimerBtn x2 + save';
                        const rs = doc.querySelector('#routeSelect');
                        if (rs) {
                            rs.value = 'Gintota – Galle';
                            rs.dispatchEvent(new window.Event('change', { bubbles: true }));
                        }
                        press('#toggleTimerBtn');
                        press('#toggleTimerBtn');
                        press('#saveRecordBtn');
                    }
                } catch (e) { clickError = e.message; }
            }

            setTimeout(() => {
                let after = 0, queued = null;
                try {
                    const q = JSON.parse(window.localStorage.getItem(key) || '[]');
                    after = q.length;
                    queued = q[q.length - 1] || null;
                } catch (e) {}

                resolve({
                    mod, key, loadError, errors, clicked, clickError,
                    recorded: after - before,
                    surveyType: queued ? queued.surveyType : null,
                    surveyScreenActive: !!doc.querySelector('#survey-screen.active, #screen-survey.active'),
                    vehicleBtns: btns.length,
                });
                window.close();
            }, 60);
        }, 250);
    });
}

(async () => {
    const rows = [];
    for (const m of MODULES) rows.push(await testModule(m));

    console.log('module               queue key                          screen  btns  clicked                recorded  type');
    console.log('-------------------------------------------------------------------------------------------------------------------');
    rows.forEach(r => {
        console.log(
            r.mod.padEnd(21) +
            r.key.padEnd(35) +
            (r.surveyScreenActive ? 'ok    ' : 'NO    ') +
            String(r.vehicleBtns).padEnd(6) +
            String(r.clicked || '-').slice(0, 22).padEnd(23) +
            String(r.recorded).padEnd(10) +
            (r.surveyType || '-')
        );
    });

    console.log('\nerrors:');
    let any = false;
    rows.forEach(r => {
        if (r.loadError) { console.log('  ' + r.mod + ' LOAD: ' + r.loadError); any = true; }
        if (r.clickError) { console.log('  ' + r.mod + ' CLICK: ' + r.clickError); any = true; }
        r.errors.slice(0, 3).forEach(e => { console.log('  ' + r.mod + ' ' + e.slice(0, 160)); any = true; });
    });
    if (!any) console.log('  none');

    const broken = rows.filter(r => r.loadError || r.recorded < 1);
    console.log('\nNOT RECORDING: ' + (broken.length ? broken.map(b => b.mod).join(', ') : 'none'));
})();
