/* =====================================================================
   Fullscreen / immersive mode -- shared by the portal and all 7 modules
   =====================================================================
   Goal: no browser address bar while counting. A browser tab only hides
   its chrome in the Fullscreen API, and the API is only granted from a
   real user gesture -- it cannot be requested on page load. That is why
   the address bar survived the portal's own "Next" click: pressing Start
   Survey navigates to a module's index.html, a NEW document, and
   fullscreen does not carry across a navigation. With skipSetup=true the
   module then hides the very buttons that could have re-requested it.

   So this does two things, both from genuine gestures:
     1. The FIRST tap anywhere on the page requests fullscreen (and locks
        landscape where supported). A tap on a vehicle button still counts
        that vehicle -- requesting fullscreen does not swallow the click.
     2. A floating button is shown while the survey screen is up and the
        page is not fullscreen, as a visible affordance and a fallback for
        browsers that refused the automatic attempt. It hides itself as
        soon as fullscreen is entered, and comes back if the browser or
        the user leaves fullscreen later.

   Loaded by every module's index.html and by the portal, so this
   behaviour lives in one file rather than being pasted into eight.

   Note: none of this applies inside the Android APK wrapper, whose own
   title bar is a setting in the tool that built it, not something the web
   page can remove.
   ===================================================================== */
(function () {
    'use strict';

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Honour the same preference the intro does: do not force display
        // changes on someone who asked for less motion.
        return;
    }

    var btn = null;
    var triedAutomatically = false;

    function isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }

    function requestFullscreen() {
        var el = document.documentElement;
        var fn = el.requestFullscreen || el.webkitRequestFullscreen;
        if (!fn) return Promise.reject(new Error('unsupported'));
        try {
            var r = fn.call(el);
            return (r && typeof r.then === 'function') ? r : Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    function lockLandscape() {
        // Only meaningful once actually fullscreen, and unsupported on iOS.
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function () {});
            }
        } catch (e) {}
    }

    function goFullscreen() {
        if (isFullscreen()) return;
        requestFullscreen().then(function () {
            lockLandscape();
            update();
        }).catch(function () {
            // Refused (no gesture, iOS Safari on iPhone, or disallowed by
            // the embedder). Leave the button visible so it can be tried
            // deliberately; never loop on it.
            update();
        });
    }

    // The survey screen id differs between modules.
    function surveyVisible() {
        return !!document.querySelector('#survey-screen.active, #screen-survey.active');
    }

    function ensureButton() {
        if (btn) return btn;
        btn = document.createElement('button');
        btn.id = 'go-fullscreen-btn';
        btn.type = 'button';
        btn.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
        btn.style.cssText = [
            'position:fixed', 'bottom:14px', 'left:50%', 'transform:translateX(-50%)',
            'z-index:9998', 'background:rgba(59,130,246,.92)', 'color:#fff', 'border:none',
            'padding:.5rem 1.1rem', 'border-radius:2rem', 'font-family:inherit',
            'font-weight:600', 'font-size:.85rem', 'box-shadow:0 4px 14px rgba(0,0,0,.35)',
            'display:flex', 'align-items:center', 'gap:.5rem', 'cursor:pointer'
        ].join(';');
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            goFullscreen();
        });
        document.body.appendChild(btn);
        return btn;
    }

    function update() {
        var wanted = surveyVisible() && !isFullscreen();
        if (wanted) {
            ensureButton().style.display = 'flex';
        } else if (btn) {
            btn.style.display = 'none';
        }
    }

    // 1. First genuine gesture anywhere takes the page fullscreen. Capture
    //    phase so it runs even if a handler stops propagation, and once:true
    //    so a refusal is never retried on every subsequent tap.
    function onFirstGesture() {
        if (triedAutomatically) return;
        triedAutomatically = true;
        goFullscreen();
    }
    document.addEventListener('pointerdown', onFirstGesture, { capture: true, once: true });
    document.addEventListener('touchstart', onFirstGesture, { capture: true, once: true });
    document.addEventListener('click', onFirstGesture, { capture: true, once: true });

    // 2. Keep the fallback button in sync with what is actually on screen.
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);

    function start() {
        update();
        // The survey screen appears asynchronously (screen transitions, and
        // the skipSetup handler runs on a timer), so poll briefly rather
        // than assuming it is up at load. Cheap, and stops on its own.
        var ticks = 0;
        var iv = setInterval(function () {
            update();
            if (++ticks > 40) clearInterval(iv); // ~20s
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
