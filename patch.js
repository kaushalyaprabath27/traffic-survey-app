const fs = require('fs');
const path = require('path');

const modules = [
    'main-road',
    'roundabout',
    't-junction',
    'pedestrian',
    'bus-idling',
    'institutional-idling'
];

const cssToAdd = `
/* --- NEW FEATURES CSS --- */
body {
    padding-top: env(safe-area-inset-top, 20px);
}

.survey-header {
    flex-wrap: wrap; /* Allows wrapping on portrait mode */
}

.counter-badge {
    background: #10b981;
    color: white;
    padding: 0.2rem 0.8rem;
    border-radius: 0.5rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
}

.undo-btn {
    background: #ef4444;
    color: white;
    padding: 0.2rem 0.8rem;
    border-radius: 0.5rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    cursor: pointer;
    text-decoration: none;
}
.undo-btn:active {
    transform: scale(0.95);
}

.milestone-animation-container {
    position: fixed;
    bottom: 20%;
    left: -200px;
    display: flex;
    align-items: center;
    color: white;
    padding: 15px 25px;
    border-radius: 50px;
    font-size: 2rem;
    font-weight: bold;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    pointer-events: none;
    z-index: 9999;
    opacity: 0;
    background: linear-gradient(135deg, #f59e0b, #d97706);
}

.milestone-animation-container i {
    margin-right: 15px;
    font-size: 2.5rem;
}

@keyframes driveAcross {
    0% { transform: translateX(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateX(calc(100vw + 400px)); opacity: 0; }
}

.animate-bus {
    animation: driveAcross 4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}
`;

const htmlToInjectHeader = `
                    <button class="undo-btn" id="undo-btn" onclick="undoLastAction()"><i class="fa-solid fa-rotate-left"></i> Undo</button>
                    <div class="counter-badge" id="session-counter"><i class="fa-solid fa-hashtag"></i> <span id="counter-val">0</span></div>
`;

const htmlToInjectBody = `
    <!-- Milestone Animation -->
    <div id="milestoneBus" class="milestone-animation-container">
        <i class="fa-solid fa-bus"></i>
        <span id="milestoneText">50!</span>
    </div>
`;

const jsNetworkLogic = `
// --- BATCHING, SYNC & NEW FEATURES LOGIC ---
let sessionCount = 0;
let isSyncing = false;

// Array of vibrant gradients for animation
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
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
    milestoneBus.style.background = randomGradient;

    milestoneBus.classList.remove('animate-bus');
    void milestoneBus.offsetWidth; 
    milestoneBus.classList.add('animate-bus');
}

function undoLastAction() {
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (queue.length > 0) {
        queue.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        
        // Remove from secret backup too
        let secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]');
        if(secretQueue.length > 0) {
            secretQueue.pop();
            localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));
        }

        updateSessionCounter(-1);
        showToast('Last entry removed!', 'success');
        updateNetworkStatus();
    } else {
        showToast('Nothing to undo (or already synced)', 'error');
    }
}

function queueDataLocally(data) {
    // 1. Haptic Feedback
    if (navigator.vibrate) navigator.vibrate(50);

    // 2. Add to Main Queue (for syncing)
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    queue.push(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

    // 3. Add to Secret Backup Queue (never deleted on sync)
    let secretQueue = JSON.parse(localStorage.getItem('traffic_survey_secret_backup') || '[]');
    secretQueue.push(data);
    localStorage.setItem('traffic_survey_secret_backup', JSON.stringify(secretQueue));

    // 4. Update UI
    updateSessionCounter(1);
    showToast('Saved locally', 'success');
    updateNetworkStatus(); // to show pending count
}

function syncOfflineQueue() {
    if (isSyncing) return;
    if (!navigator.onLine) return;
    
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (queue.length === 0) return;
    
    // Batch up to 50 records
    const batch = queue.slice(0, 50);
    isSyncing = true;
    showToast('Syncing batch...', 'success');

    if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        setTimeout(() => {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            isSyncing = false;
            showToast('Mock sync complete', 'success');
            updateNetworkStatus();
        }, 1000);
        return;
    }

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'submit_batch',
            payload: batch
        }),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8' // Avoids CORS preflight
        }
    })
    .then(response => {
        // If Google errors out (e.g. Quota Exceeded), it returns an error page WITHOUT CORS headers.
        // This will correctly throw a fetch TypeError and we won't delete the local queue!
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
    })
    .then(result => {
        if (result.status === "success") {
            let currentQueue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            // Only slice off the ones we successfully sent
            currentQueue = currentQueue.slice(batch.length);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentQueue));
            showToast('Cloud Sync: ' + batch.length + ' records saved!', 'success');
        }
    })
    .catch(err => {
        console.error("Sync failed, data safe in queue:", err);
    })
    .finally(() => {
        isSyncing = false;
        updateNetworkStatus();
    });
}

// Hidden feature: 5 clicks the App Header in setup to download backup
document.addEventListener('DOMContentLoaded', () => {
    let headerClicks = 0;
    const headerTitle = document.querySelector('#setup-screen h2');
    if(headerTitle) {
        headerTitle.addEventListener('click', () => {
            headerClicks++;
            if(headerClicks === 5) {
                headerClicks = 0;
                let secretData = localStorage.getItem('traffic_survey_secret_backup');
                if(!secretData) {
                    alert("No backup data found.");
                    return;
                }
                let blob = new Blob([secretData], {type: "application/json"});
                let url = URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = "traffic_survey_secret_backup.json";
                a.click();
            }
        });
    }
});

// Update Network Status UI
function updateNetworkStatus() {
    appState.isOnline = navigator.onLine;
    let queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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
`;

modules.forEach(mod => {
    const dir = path.join(__dirname, mod);
    
    // 1. Patch CSS
    const cssPath = path.join(dir, 'style.css');
    if (fs.existsSync(cssPath)) {
        let css = fs.readFileSync(cssPath, 'utf8');
        if (!css.includes('.milestone-animation-container')) {
            fs.appendFileSync(cssPath, cssToAdd);
            console.log(`Patched ${mod}/style.css`);
        }
    }

    // 2. Patch HTML
    const htmlPath = path.join(dir, 'index.html');
    if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        if (!html.includes('id="undo-btn"')) {
            html = html.replace('<div id="sync-status"', htmlToInjectHeader + '\n                <div id="sync-status"');
        }
        
        if (!html.includes('id="milestoneBus"')) {
            html = html.replace('<!-- Toast Notification Container -->', htmlToInjectBody + '\n    <!-- Toast Notification Container -->');
        }
        
        fs.writeFileSync(htmlPath, html);
        console.log(`Patched ${mod}/index.html`);
    }

    // 3. Patch JS
    const jsPath = path.join(dir, 'app.js');
    if (fs.existsSync(jsPath)) {
        let js = fs.readFileSync(jsPath, 'utf8');
        
        const removeRegex = /function updateNetworkStatus\(\) \{[\s\S]*?\/\/ UI Utilities/g;
        if (js.match(removeRegex)) {
            js = js.replace(removeRegex, jsNetworkLogic + '\n\n// UI Utilities');
        } else {
            console.warn(`Could not regex patch ${mod}/app.js. Proceeding carefully.`);
        }
        
        const saveDataRegex = /function saveData\([\s\S]*?\}/g;
        js = js.replace(saveDataRegex, `function saveData(data) {
    queueDataLocally(data);
}`);

        if (!js.includes('setInterval(syncOfflineQueue')) {
            js = js.replace('function init() {', 'function init() {\n    setInterval(syncOfflineQueue, 15000);\n');
        }

        fs.writeFileSync(jsPath, js);
        console.log(`Patched ${mod}/app.js`);
    }
});

console.log("All modules patched successfully!");
