const fs = require('fs');
const path = require('path');

const modules = [
    '.', // root
    'main-road',
    'roundabout',
    't-junction',
    'pedestrian',
    'bus-idling',
    'institutional-idling'
];

const privacyCardHtml = `
                    <!-- Data Privacy & Local Backup Disclosure -->
                    <div class="data-privacy-card" style="margin-top: 1.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); border-radius: 0.5rem; text-align: left;">
                        <h4 style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fa-solid fa-shield-halved" style="color: #10b981;"></i> Data Privacy & Local Backup Notice
                        </h4>
                        <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.75rem;">
                            All survey events recorded on this device are automatically backed up to internal memory (<code style="background: rgba(0,0,0,0.3); padding: 0.1rem 0.3rem; border-radius: 3px;">traffic_survey_secret_backup</code>). Data is retained locally even if offline or server sync is delayed.
                        </p>
                        <button type="button" class="secondary-btn btn-export-backup" onclick="exportLocalBackup()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.85rem; padding: 0.5rem; border-color: #10b981; color: #10b981;">
                            <i class="fa-solid fa-file-arrow-down"></i> Export Local Backup (.json)
                        </button>
                    </div>
`;

const headerBackupBtnHtml = `<button class="secondary-btn btn-export-backup" onclick="exportLocalBackup()" title="Export Local Backup (.json)" style="padding: 0.2rem 0.8rem; border-radius: 0.5rem; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; border-color: #10b981; color: #10b981;"><i class="fa-solid fa-file-arrow-down"></i> Backup</button>`;

const jsExportFunction = `
// --- TRANSPARENT LOCAL BACKUP EXPORT ---
function exportLocalBackup() {
    let secretData = localStorage.getItem('traffic_survey_secret_backup');
    if (!secretData) {
        secretData = (typeof STORAGE_KEY !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
    }
    if (!secretData || secretData === '[]') {
        if (typeof showToast === 'function') showToast('No local backup data found on this device yet.', 'error');
        else alert('No local backup data found on this device yet.');
        return;
    }
    try {
        let blob = new Blob([secretData], { type: 'application/json' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = \`traffic_survey_backup_\${new Date().toISOString().split('T')[0]}.json\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('Local backup file (.json) exported successfully!', 'success');
    } catch(e) {
        alert('Failed to export backup: ' + e.message);
    }
}
`;

modules.forEach(mod => {
    const dir = path.join(__dirname, mod);
    
    // 1. Patch HTML
    const htmlPath = path.join(dir, 'index.html');
    if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf8');

        if (!html.includes('data-privacy-card')) {
            // Inject before closing </form> in setup-screen
            if (html.includes('id="btn-start"')) {
                html = html.replace(/<button type="submit" id="btn-start"/, privacyCardHtml + '\n                    <button type="submit" id="btn-start"');
            } else if (html.includes('id="btn-setup-back"')) {
                html = html.replace(/<div style="display: flex; gap: 1rem; margin-top: 1rem;">\s*<button type="button" id="btn-setup-back"/, privacyCardHtml + '\n                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">\n                        <button type="button" id="btn-setup-back"');
            }
        }

        if (!html.includes('onclick="exportLocalBackup()"') && html.includes('id="undo-btn"')) {
            html = html.replace(/id="undo-btn">.*?<\/button>/, match => `${match}\n                ${headerBackupBtnHtml}`);
        }

        fs.writeFileSync(htmlPath, html);
        console.log(`Patched HTML: ${mod}/index.html`);
    }

    // 2. Patch JS
    const jsPath = path.join(dir, 'app.js');
    if (fs.existsSync(jsPath)) {
        let js = fs.readFileSync(jsPath, 'utf8');

        if (!js.includes('function exportLocalBackup()')) {
            js += '\n\n' + jsExportFunction;
            fs.writeFileSync(jsPath, js);
            console.log(`Patched JS: ${mod}/app.js`);
        }
    }
});

console.log('All modules patched with transparency disclosure and backup export buttons!');
