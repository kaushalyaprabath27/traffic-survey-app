const fs = require('fs');
const path = require('path');
const dirs = ['roundabout', 'pedestrian', 'bus-idling', 'institutional-idling'];

const logic = `
// --- BATCHING, SYNC & NEW FEATURES LOGIC ---
let sessionCount = 0;
let isSyncing = false;

const gradients = [
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #8b5cf6, #5b21b6)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #ec4899, #be185d)'
];

function updateSessionCounter(amount) {
    sessionCount += amount;
    if (sessionCount < 0) sessionCount = 0;
    const counterVal = document.getElementById('counter-val');
    if (counterVal) counterVal.innerText = sessionCount;
    if (amount > 0 && sessionCount > 0 && sessionCount % 50 === 0) {
        triggerMilestoneAnimation(sessionCount);
    }
}

function triggerMilestoneAnimation(number) {
    const milestoneBus = document.getElementById('milestoneBus');
    const milestoneText = document.getElementById('milestoneText');
    if (!milestoneBus || !milestoneText) return;
    milestoneText.innerText = number + "!";
    milestoneBus.style.background = gradients[Math.floor(Math.random() * gradients.length)];
    milestoneBus.classList.remove('animate-bus');
    void milestoneBus.offsetWidth; 
    milestoneBus.classList.add('animate-bus');
}

function undoLastAction() {
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    if (queue.length > 0) {
        queue.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        
        let secretQueue = [];
        try { secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]'); } catch(e){}
        if(secretQueue.length > 0) {
            secretQueue.pop();
            localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));
        }

        updateSessionCounter(-1);
        if(typeof showToast === 'function') showToast('Last entry removed!', 'success');
        updateSyncStatus();
    } else {
        if(typeof showToast === 'function') showToast('Nothing to undo (or already synced)', 'error');
    }
}

function queueDataLocally(data) {
    if (navigator.vibrate) navigator.vibrate(50);
    
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    queue.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

    let secretQueue = [];
    try { secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]'); } catch(e){}
    secretQueue.push(data);
    localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));

    updateSessionCounter(1);
    if(typeof showToast === 'function') showToast('Saved locally', 'success');
    updateSyncStatus(); 
}

function syncOfflineQueue() {
    if (isSyncing || !navigator.onLine) return;
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    if (queue.length === 0) return;
    
    const batch = queue.slice(0, 50);
    isSyncing = true;
    if(typeof showToast === 'function') showToast('Syncing batch...', 'success');

    if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        setTimeout(() => {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            isSyncing = false;
            if(typeof showToast === 'function') showToast('Mock sync complete', 'success');
            updateSyncStatus();
        }, 1000);
        return;
    }

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'submit_batch', payload: batch }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    })
    .then(response => {
        if (!response.ok) throw new Error('Network error');
        return response.json();
    })
    .then(result => {
        if (result.status === 'success') {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            if(typeof showToast === 'function') showToast('Cloud Sync: ' + batch.length + ' records saved!', 'success');
        }
    })
    .catch(err => console.error('Sync failed:', err))
    .finally(() => {
        isSyncing = false;
        updateSyncStatus();
    });
}

function updateSyncStatus() {
    appState.isOnline = navigator.onLine;
    let queue = [];
    try { queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){}
    const syncStatusElement = document.getElementById('sync-status');
    if (!syncStatusElement) return;

    if (appState.isOnline) {
        if (queue.length > 0) {
            syncStatusElement.className = 'sync-status online';
            syncStatusElement.innerHTML = '<i class="fa-solid fa-wifi"></i> Online (' + queue.length + ' pending)';
        } else {
            syncStatusElement.className = 'sync-status online';
            syncStatusElement.innerHTML = '<i class="fa-solid fa-wifi"></i> Online (Synced)';
        }
    } else {
        syncStatusElement.className = 'sync-status offline';
        syncStatusElement.innerHTML = '<i class="fa-solid fa-plane"></i> Offline (' + queue.length + ' pending)';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let headerClicks = 0;
    const headerTitle = document.querySelector('#setup-screen h2');
    if(headerTitle) {
        headerTitle.addEventListener('click', () => {
            headerClicks++;
            if(headerClicks === 5) {
                headerClicks = 0;
                let secretData = localStorage.getItem('traffic_survey_secret_backup');
                if(!secretData) { alert('No backup data found.'); return; }
                let blob = new Blob([secretData], {type: 'application/json'});
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = 'traffic_survey_secret_backup.json';
                a.click();
            }
        });
    }
});
`;

dirs.forEach(mod => {
    const jsPath = path.join(mod, 'app.js');
    if (fs.existsSync(jsPath)) {
        let js = fs.readFileSync(jsPath, 'utf8');
        
        // Remove legacy network functions to prevent conflicts
        js = js.replace(/function saveRecord[\s\S]*?\n\}/, '');
        js = js.replace(/async function sendDataToSheet[\s\S]*?\n\}/, '');
        js = js.replace(/function sendDataToSheet[\s\S]*?\n\}/, '');
        js = js.replace(/async function processQueue[\s\S]*?\n\}/, '');
        js = js.replace(/function processQueue[\s\S]*?\n\}/, '');
        js = js.replace(/function updateSyncStatus[\s\S]*?\n\}/, '');
        js = js.replace(/function updateNetworkStatus[\s\S]*?\n\}/, '');
        js = js.replace(/function loadOfflineQueue[\s\S]*?\n\}/, '');
        js = js.replace(/function saveOfflineQueue[\s\S]*?\n\}/, '');

        // Redirect save to queueDataLocally
        js = js.replace(/saveRecord\((.*?)\)/g, 'queueDataLocally($1)');
        js = js.replace(/sendDataToSheet\((.*?)\)/g, 'queueDataLocally($1)');

        // Add interval in init
        if (!js.includes('setInterval(syncOfflineQueue')) {
            js = js.replace('function init() {', 'function init() {\n    setInterval(syncOfflineQueue, 15000);\n');
        }

        if (!js.includes('function queueDataLocally')) {
            js += '\n\n' + logic;
        }

        fs.writeFileSync(jsPath, js);
        console.log('Fixed ' + mod);
    }
});
