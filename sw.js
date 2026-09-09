// Bumped v1 -> v2 when the 4-way-junction module was added: this file's own
// bytes are what the browser diffs to decide a new service worker exists at
// all, so editing index.html alone (adding the new <option>) never triggers
// an update -- the old service worker keeps serving its cached index.html
// (cache-first below) forever, which is why a change like a new dropdown
// option can silently never appear for anyone who has visited before.
// skipWaiting()/clients.claim() below make a version bump like this one take
// over immediately instead of waiting for every open tab to be closed first.
const CACHE_NAME = 'master-traffic-survey-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './intro.css',
    './intro.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .catch(err => console.log('Cache install error:', err))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request).then(
                    function(response) {
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        var responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                        return response;
                    }
                );
            })
    );
});
