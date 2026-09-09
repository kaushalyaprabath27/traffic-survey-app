/* =====================================================================
   Welcome intro -- vehicles converge on the chart mark
   =====================================================================
   Sequence: survey vehicles drive in from every edge along their own
   heading, each trailing light, and converge on one point. Each arrival
   pulses a ring and brightens the core. As the last few land, the chart
   mark draws itself out of that point (axis, then the data line, with a
   dot popping in at each vertex), and the welcome card rises in behind it.

   The convergence point is measured from the real card icon, not assumed
   to be screen centre, so the intro's chart and the card's chart occupy
   the same pixels at the same size and the hand-off is an invisible
   cross-fade rather than a jump.

   Self-contained: this file and intro.css are the whole feature. Delete
   both <script>/<link> tags from index.html and the screen is back to
   exactly what it was.
   ===================================================================== */
(function () {
    'use strict';

    // ---- knobs ------------------------------------------------------
    // Surveyors reload the portal a lot in the field, so the full intro
    // plays once per browser session and later loads in the same session
    // get a quick version. Set this to true to always play it in full.
    var REPLAY_FULL_EVERY_LOAD = false;

    // Font Awesome's vehicle glyphs (car/bus/truck/motorcycle/taxi/van)
    // are drawn facing LEFT. That decides both how far to rotate each
    // vehicle so it faces where it is going, and which side its trail
    // hangs off. If FA ever flips them, flip this one flag.
    var GLYPH_FACES_LEFT = true;

    var VEHICLES = [
        { icon: 'fa-motorcycle',   color: '#60a5fa' },
        { icon: 'fa-car',          color: '#a78bfa' },
        { icon: 'fa-taxi',         color: '#fbbf24' },
        { icon: 'fa-bus',          color: '#34d399' },
        { icon: 'fa-truck',        color: '#38bdf8' },
        { icon: 'fa-van-shuttle',  color: '#f472b6' },
        { icon: 'fa-car',          color: '#818cf8' },
        { icon: 'fa-motorcycle',   color: '#22d3ee' },
        { icon: 'fa-truck-moving', color: '#fb923c' },
        { icon: 'fa-bus',          color: '#4ade80' }
    ];

    var CHART_SVG =
        '<svg class="chart-mark" viewBox="0 0 100 100" fill="none" aria-hidden="true">' +
          '<path class="axis" d="M14 12 V84 H90" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>' +
          '<path class="line" d="M24 68 L44 48 L60 58 L82 24" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle class="dot" cx="24" cy="68" r="4.5" fill="currentColor"/>' +
          '<circle class="dot" cx="44" cy="48" r="4.5" fill="currentColor"/>' +
          '<circle class="dot" cx="60" cy="58" r="4.5" fill="currentColor"/>' +
          '<circle class="dot" cx="82" cy="24" r="5.5" fill="currentColor"/>' +
        '</svg>';

    var timers = [];
    var overlay = null;
    var finished = false;

    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

    function reveal() {
        if (finished) return;
        finished = true;
        timers.forEach(clearTimeout);
        timers = [];
        document.documentElement.classList.remove('intro-armed');
        document.body.classList.add('intro-reveal');
        if (overlay) {
            overlay.classList.add('intro-fading');
            setTimeout(function () {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                overlay = null;
            }, 500);
        }
    }

    function run() {
        var screenEl = document.getElementById('welcome-screen');
        var iconEl = document.querySelector('#welcome-screen .icon-pulse');
        if (!screenEl || !iconEl) { reveal(); return; }

        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { reveal(); return; }

        // Measure where the card icon actually sits, and how big it is, so
        // the intro can converge on exactly that spot at exactly that size.
        var box = iconEl.getBoundingClientRect();
        var cx = box.width ? box.left + box.width / 2 : window.innerWidth / 2;
        var cy = box.height ? box.top + box.height / 2 : window.innerHeight / 2;
        var size = box.width ? Math.min(box.width, box.height) : 64;

        var seen = false;
        try { seen = sessionStorage.getItem('ts_intro_seen') === '1'; } catch (e) {}
        try { sessionStorage.setItem('ts_intro_seen', '1'); } catch (e) {}
        var k = (seen && !REPLAY_FULL_EVERY_LOAD) ? 0.4 : 1; // replay speed-up

        overlay = document.createElement('div');
        overlay.id = 'intro-overlay';
        overlay.className = GLYPH_FACES_LEFT ? 'faces-left' : 'faces-right';
        overlay.style.setProperty('--cx', cx + 'px');
        overlay.style.setProperty('--cy', cy + 'px');

        var guides = document.createElement('div');
        guides.className = 'intro-guides';
        overlay.appendChild(guides);

        var core = document.createElement('div');
        core.className = 'intro-core';
        core.style.animationDuration = (1250 * k) + 'ms';
        overlay.appendChild(core);

        // ---- vehicles ------------------------------------------------
        // Spawn beyond the furthest corner so nothing pops into view, and
        // spread the headings evenly with a little jitter so it reads as
        // traffic rather than a mechanical starburst.
        var reach = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) * 0.62;
        var n = VEHICLES.length;
        var arrivals = [];

        VEHICLES.forEach(function (spec, i) {
            var angle = (360 / n) * i + (Math.random() * 18 - 9);
            var rad = angle * Math.PI / 180;
            var dist = reach * (0.85 + Math.random() * 0.3);
            var delay = Math.round((i * 45 + Math.random() * 60) * k);
            var dur = Math.round((850 + Math.random() * 300) * k);

            var v = document.createElement('div');
            v.className = 'intro-vehicle';
            v.style.setProperty('--dx', Math.cos(rad) * dist + 'px');
            v.style.setProperty('--dy', Math.sin(rad) * dist + 'px');
            // Travel direction is angle+180 (start point back to centre).
            // A left-facing glyph already points along -x, so rotating by
            // the spawn angle alone lands its nose on the centre.
            v.style.setProperty('--a', (GLYPH_FACES_LEFT ? angle : angle + 180) + 'deg');
            v.style.setProperty('--d', delay + 'ms');
            v.style.setProperty('--t', dur + 'ms');
            v.style.setProperty('--vc', spec.color);
            v.innerHTML = '<i class="fa-solid ' + spec.icon + '"></i>';
            overlay.appendChild(v);

            var arrival = delay + dur;
            arrivals.push(arrival);
            at(arrival, function () {
                var ring = document.createElement('div');
                ring.className = 'intro-ring';
                ring.style.animationDuration = (620 * k) + 'ms';
                if (overlay) overlay.appendChild(ring);
                setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 700 * k);
            });
            // Drop each vehicle once it has landed, so the compositor is
            // not still tracking ten elements while the chart draws.
            at(arrival + 120, function () { if (v.parentNode) v.parentNode.removeChild(v); });
        });

        var lastArrival = Math.max.apply(null, arrivals);

        // ---- chart mark ----------------------------------------------
        var chart = document.createElement('div');
        chart.className = 'intro-chart';
        chart.style.width = size + 'px';
        chart.style.height = size + 'px';
        chart.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
        chart.innerHTML = CHART_SVG;
        overlay.appendChild(chart);

        var skip = document.createElement('div');
        skip.className = 'intro-skip';
        skip.textContent = 'tap to skip';
        overlay.appendChild(skip);

        document.body.appendChild(overlay);
        overlay.addEventListener('click', reveal);

        // Dash lengths from the real geometry rather than guessed numbers.
        // getTotalLength() is unavailable in some non-browser/older engines,
        // so fall back to a length comfortably longer than either path --
        // an over-long dasharray still hides the stroke and still draws it
        // fully, it just eases slightly differently.
        var axis = chart.querySelector('.axis');
        var line = chart.querySelector('.line');
        var dots = chart.querySelectorAll('.dot');
        [axis, line].forEach(function (p) {
            var len;
            try { len = p.getTotalLength(); } catch (e) { len = 0; }
            if (!len || !isFinite(len)) len = 200;
            p.style.strokeDasharray = len;
            p.style.strokeDashoffset = len;
        });

        // Start the chart while the last vehicles are still landing, so the
        // two phases overlap instead of reading as two separate animations.
        var chartStart = Math.max(0, lastArrival - 420 * k);
        var axisDraw = 340 * k;
        var lineDraw = 620 * k;

        at(chartStart, function () {
            var burst = document.createElement('div');
            burst.className = 'intro-ring burst';
            burst.style.animationDuration = (950 * k) + 'ms';
            if (overlay) overlay.appendChild(burst);
            chart.classList.add('showing');
            axis.style.setProperty('--draw', axisDraw + 'ms');
            axis.style.strokeDashoffset = '0';
        });

        at(chartStart + axisDraw * 0.7, function () {
            line.style.setProperty('--draw', lineDraw + 'ms');
            line.style.strokeDashoffset = '0';
        });

        // Each dot lands just as the drawn line reaches its vertex.
        for (var d = 0; d < dots.length; d++) {
            (function (dot, idx) {
                at(chartStart + axisDraw * 0.7 + lineDraw * (0.18 + idx * 0.26), function () {
                    dot.classList.add('on');
                });
            })(dots[d], d);
        }

        at(chartStart + axisDraw * 0.7 + lineDraw + 180 * k, reveal);
    }

    // Any failure in the intro must end with the card visible, never with a
    // hidden card waiting on the 5s failsafe in index.html.
    function safeRun() {
        try {
            run();
        } catch (e) {
            if (window.console) console.warn('[intro] falling back to no animation:', e);
            reveal();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeRun);
    } else {
        safeRun();
    }
})();
