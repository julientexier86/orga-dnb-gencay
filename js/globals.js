// --- VARIABLES GLOBALES ---
let currentImportType = "";
let tempImportData = null;
let pendingImportData = null;
let currentSpecialRoomSelection = "";

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeStudentId(id) {
    return String(id ?? "");
}

const DEFAULT_LABELS = [
    { code: "TTEMPS", color: "#6b4a72", name: "Tiers-Temps (Auto)" },
    { code: "DNBPRO", color: "#88f10f", name: "DNB Pro" },
    { code: "SEGPA", color: "#0f31f1", name: "SEGPA" },
    { code: "ULIS", color: "#e6f10f", name: "ULIS" },
    { code: "ORDI", color: "#9a7a2e", name: "Ordinateur" },
    { code: "LECT", color: "#2f6f5e", name: "Assistant Lecteur" },
    { code: "AESH", color: "#9a4a2e", name: "Présence AESH" },
    { code: "DICT", color: "#9a7a2e", name: "Dictée Aménagée" },
    { code: "SCRIPT", color: "#2f6f5e", name: "Scripteur" },
    { code: "SORT", color: "#9aa0a2", name: "Sortie 1ère Heure" },
    { code: "TPSDECOMP", color: "#1f3a5c", name: "Temps Décompté" }
];

var DB = {
    config: { schoolName: "", year: "2026", logo: "", nbSurv: 1, examType: "DNB Blanc", customExamName: "", director: { civ: "M. le Principal", name: "" }, signature: "", scienceSubjects: ['SVT', 'PC', 'TECH'], datavisSource: "blank", resultsWorkspace: "blank" }, students: [], rooms: [], teachers: [], distribution: {}, planning: {}, officialResults: [],
    stage: { // MODULE STAGE (Ancien)
        config: { date: "2026-06-01", start: "08:00", end: "17:00", duration: 20, break: 0, lunchStart: "12:00", lunchEnd: "13:30" },
        juries: [], // { id, name, room, members: [] }
        planning: [] // { juryId, time, studentId }
    },
    oralConfig: null, // MODULE ORAL V2.7 — initialisé par setupOralDatabase() au chargement de oral_dnb.js
    uiState: { locked: { students: false, rooms: false, teachers: false, distrib: false, grades: false, simul: false } },
    exams: [
        { name: "Français (Grammaire)", date: "2026-04-16", time: "09:00", timeTT: "09:00", durStd: 90, durTT: 120 },
        { name: "Français (Rédaction)", date: "2026-04-16", time: "11:00", timeTT: "11:00", durStd: 90, durTT: 120 },
        { name: "Mathématiques", date: "2026-04-16", time: "14:30", timeTT: "14:30", durStd: 120, durTT: 160 },
        { name: "Hist-Géo / EMC", date: "2026-04-17", time: "09:00", timeTT: "09:00", durStd: 120, durTT: 160 },
        { name: "Sciences", date: "2026-04-17", time: "13:30", timeTT: "13:30", durStd: 60, durTT: 80 }
    ]
};
var charts = {}; // Pour Stocker les instances de Chart.js
var wizData = { selectedTTIds: [] };
var sortState = { type: null, key: null, order: 'asc' };
var gradeSortState = { key: 'nom', order: 'asc' };
var simulSortState = { key: 'nom', order: 'asc' };
var simulSearchTerm = "";
// --- GESTION ALERTE SAUVEGARDE ---
var firstUnsavedTime = null; // Date de la 1ère modif non sauvegardée
const SAVE_ALERT_DELAY = 5 * 60 * 1000; // 10 minutes en millisecondes

// --- GESTION VISUELLE DU TITRE DE DIRECTION ---
function setDirectorCiv(val) {
    // 1. Sauvegarde la valeur
    DB.config.director.civ = val;

    // 2. Définition des styles (Actif / Inactif)
    const sActive = "padding:12px; border:2px solid #1f3a5c; background:#eef2f0; border-radius:8px; cursor:pointer; text-align:center; transition:0.2s; font-weight:bold; color:#1f3a5c; transform:translateY(-2px); box-shadow:0 3px 5px rgba(0,0,0,0.1);";
    const sInactive = "padding:12px; border:2px solid #ece9e0; background:#fff; border-radius:8px; cursor:pointer; text-align:center; transition:0.2s; color:#656d70;";

    // 3. Mise à jour visuelle des blocs
    const choices = {
        'civ-principal': 'M. le Principal',
        'civ-principale': 'Mme la Principale',
        'civ-adj': 'M. le Principal Adjoint',
        'civ-adje': 'Mme la Principale Adjointe',
        'civ-prov-adj': 'M. le Proviseur Adjoint',
        'civ-prov-adje': 'Mme la Proviseure Adjointe'
    };
    Object.entries(choices).forEach(([id, label]) => {
        const el = document.getElementById(id);
        if (el) el.style.cssText = (val === label) ? sActive : sInactive;
    });
}

// --- SAUVEGARDE SÉCURISÉE (gestion du quota localStorage ~5 Mo) ---
var lastQuotaAlertTime = 0;
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        const isQuota = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
        console.error('safeSetItem : échec de sauvegarde pour', key, e);
        // Alerte au maximum une fois par minute pour ne pas spammer l'utilisateur
        if (Date.now() - lastQuotaAlertTime > 60 * 1000) {
            lastQuotaAlertTime = Date.now();
            const msg = isQuota
                ? "🚨 Stockage du navigateur PLEIN : la sauvegarde automatique a échoué ! Exportez immédiatement votre projet en fichier .data (bouton Sauvegarder), puis allégez les données (logo/signature moins lourds)."
                : "⚠️ Échec de la sauvegarde locale : " + (e && e.message ? e.message : e);
            if (typeof showToast === 'function' && document.getElementById('toast-container')) {
                showToast(msg, 'error');
            } else {
                alert(msg);
            }
        }
        return false;
    }
}

// --- DARK MODE LOGIC ---
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');

    const isDark = body.classList.contains('dark-mode');
    safeSetItem('DNB_DarkMode', isDark);

    // Update button icon
    const btn = document.getElementById('btnDarkMode');
    if (btn) {
        btn.innerHTML = isDark ? '<i class="fas fa-sun"></i> Mode Clair' : '<i class="fas fa-moon"></i> Mode Sombre';
    }
}

// --- TOAST NOTIFICATIONS HELPER ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<div style="display:flex; align-items:center;"><i class="fas ${icon}"></i> <span>${message}</span></div> <span style="cursor:pointer; font-weight:bold; opacity:0.5; font-size: 1.2rem;" onclick="this.parentElement.style.animation='fadeOut 0.3s forwards'; setTimeout(() => this.parentElement.remove(), 300)">×</span>`;

    container.appendChild(toast);

    // Auto remove after 3s
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }
    }, 4000);
}

function restoreFromBackup(slotIdx) {
    const keys = ['DNB_Manager_Current', 'DNB_Manager_Backup_1', 'DNB_Manager_Backup_2', 'DNB_Manager_Backup_3'];
    const key = keys[slotIdx];
    const data = localStorage.getItem(key);

    if (!data) return showToast("❌ Aucun backup trouvé pour cet emplacement.", "error");

    showConfirm(`⚠️ Restaurer le Backup ${slotIdx} ?\n\nCela écrasera les données actuelles. La page va se recharger.`, () => {
        // On met ce backup en 'Current' pour que le reload le charge
        if (!safeSetItem('DNB_Manager_Current', data)) return;
        location.reload();
    });
}

// --- MODALE DE CONFIRMATION PERSONNALISÉE ---
function showConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:12px;padding:28px 30px;max-width:460px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.25);font-family:inherit;';
    const lines = message.split('\n').map(l => l.trim()).filter(l => l);
    const title = lines[0];
    const body = lines.slice(1).join('<br>');
    box.innerHTML = `
        <div style="font-size:1.05rem;font-weight:bold;color:#1f3a5c;margin-bottom:${body ? '12px' : '22px'};">${title}</div>
        ${body ? `<div style="font-size:0.88rem;color:#4b5254;line-height:1.6;margin-bottom:22px;">${body}</div>` : ''}
        <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="sc-cancel" style="padding:8px 20px;border:1px solid #ded9cc;border-radius:6px;background:#faf9f6;cursor:pointer;font-size:0.9rem;color:#4b5254;">Annuler</button>
            <button id="sc-ok" style="padding:8px 22px;border:none;border-radius:6px;background:#9a4a2e;color:white;cursor:pointer;font-size:0.9rem;font-weight:bold;">Confirmer</button>
        </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
    box.querySelector('#sc-cancel').onclick = () => { close(); if (onCancel) onCancel(); };
    box.querySelector('#sc-ok').onclick   = () => { close(); if (onConfirm) onConfirm(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) { close(); if (onCancel) onCancel(); } });
}

// --- MODALE D'ALERTE PERSONNALISÉE (remplace alert() pour messages longs/importants) ---
function showAlertModal(message, type = 'info') {
    const colors = { error:'#9a4a2e', success:'#2f6f5e', warning:'#9a7a2e', info:'#1f3a5c' };
    const color = colors[type] || colors.info;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:12px;padding:28px 30px;max-width:520px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.25);font-family:inherit;';
    const lines = message.split('\n').map(l => l.trim()).filter(l => l);
    const title = lines[0];
    const body = lines.slice(1).join('<br>');
    box.innerHTML = `
        <div style="color:${color};font-size:1.05rem;font-weight:bold;margin-bottom:${body ? '12px' : '22px'};">${title}</div>
        ${body ? `<div style="font-size:0.88rem;color:#23282a;line-height:1.6;margin-bottom:22px;">${body}</div>` : ''}
        <div style="text-align:right;">
            <button style="padding:8px 28px;border:none;border-radius:6px;background:${color};color:white;cursor:pointer;font-weight:bold;">OK</button>
        </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
    box.querySelector('button').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}
