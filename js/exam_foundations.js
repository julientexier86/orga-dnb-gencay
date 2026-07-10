// === MODULE: exam_foundations ===
// Socle commun : modèles de consignes, sauvegardes nommées, en-tête PDF.

const NAMED_BACKUPS_KEY = 'DNB_Manager_NamedBackups';

const DEFAULT_EXAM_INSTRUCTIONS = {
    candidates: `Présence obligatoire 15 minutes avant le début des épreuves.
Pièce d'identité ou carnet de correspondance obligatoire.
Sacs et téléphones portables éteints à déposer à l'entrée.
Toute tentative de fraude sera sanctionnée.
Le silence est exigé dès l'entrée en salle d'examen.`,
    teachers: `Merci de vous présenter au secrétariat d'examen 15 minutes avant le début de votre premier créneau.
Vous récupérerez les documents de surveillance et les consignes de salle auprès du secrétariat d'examen.
En cas de difficulté, prévenir immédiatement le secrétariat d'examen.`,
    aesh: `Merci de vous présenter au secrétariat d'examen 15 minutes avant le début de la première épreuve accompagnée.
Vous êtes affecté(e) à l'épreuve et à la salle mentionnées sur cette convocation.
En cas de difficulté, prévenir immédiatement le secrétariat d'examen.`,
    surveillants: `Lire les consignes aux candidats avant le début de l'épreuve.
Vérifier les convocations, les identités et les matériels autorisés.
Signaler immédiatement tout incident au secrétariat d'examen.`,
    secretariat: `Centraliser les appels, incidents, remplacements et documents de session.
Conserver les listes d'émargement et les pièces justificatives.
Prévenir la direction de tout événement nécessitant une décision.`,
    reserve: `Rester joignable et disponible pendant toute la demi-journée indiquée.
Se présenter au secrétariat d'examen au début du créneau de réserve.
Attendre l'autorisation du secrétariat avant de quitter l'établissement.`,
    correctors: `Corriger les copies confiées dans le respect du barème communiqué.
Reporter les notes sur le bordereau prévu.
Restituer les copies, bordereaux et pochettes au secrétariat dans les délais indiqués.`
};

function ensureExamFoundationConfig() {
    if (!DB.config) DB.config = {};
    if (!DB.config.instructionTemplates) DB.config.instructionTemplates = {};

    Object.entries(DEFAULT_EXAM_INSTRUCTIONS).forEach(([key, value]) => {
        if (!DB.config.instructionTemplates[key]) DB.config.instructionTemplates[key] = value;
    });

    if (DB.config.convocText) DB.config.instructionTemplates.candidates = DB.config.convocText;
    if (DB.config.teacherConvocInstructions) DB.config.instructionTemplates.teachers = DB.config.teacherConvocInstructions;
    if (DB.config.aeshConvocations && DB.config.aeshConvocations.instructions) {
        DB.config.instructionTemplates.aesh = DB.config.aeshConvocations.instructions;
    }

    DB.config.instructionTemplates.candidates = DB.config.instructionTemplates.candidates
        .replace(/ce DNB Blanc/g, "cet examen")
        .replace(/Ce DNB Blanc/g, "Cet examen");
}

function getSafeExamFileLabel() {
    const label = typeof getExamDisplayName === 'function'
        ? getExamDisplayName()
        : ((DB.config && DB.config.examType) || 'Examen');
    return String(label || 'Examen')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'Examen';
}

function getInstructionTemplate(key) {
    ensureExamFoundationConfig();
    return DB.config.instructionTemplates[key] || DEFAULT_EXAM_INSTRUCTIONS[key] || "";
}

function setInstructionTemplate(key, value) {
    ensureExamFoundationConfig();
    DB.config.instructionTemplates[key] = value;

    if (key === 'candidates') DB.config.convocText = value;
    if (key === 'teachers') DB.config.teacherConvocInstructions = value;
    if (key === 'aesh') {
        if (!DB.config.aeshConvocations) DB.config.aeshConvocations = { assignments: {} };
        DB.config.aeshConvocations.instructions = value;
    }

    syncInstructionTemplateFields(key, value);
    if (typeof autoSave === 'function') autoSave();
}

function syncInstructionTemplateFields(key, value = getInstructionTemplate(key)) {
    const directMap = {
        candidates: 'txtConvocInfo',
        teachers: 'txtConvocProfInstructions',
        aesh: 'txtAeshInstructions'
    };
    const directId = directMap[key];
    if (directId) {
        const directField = document.getElementById(directId);
        if (directField && directField.value !== value) directField.value = value;
    }

    const modelField = document.getElementById(`instr-${key}`);
    if (modelField && modelField.value !== value) modelField.value = value;
}

function syncAllInstructionFields() {
    ensureExamFoundationConfig();
    Object.keys(DEFAULT_EXAM_INSTRUCTIONS).forEach(key => syncInstructionTemplateFields(key));
}

function renderInstructionTemplates() {
    const container = document.getElementById('instructionTemplatesContainer');
    if (!container) return;
    ensureExamFoundationConfig();

    const labels = [
        ['candidates', 'Candidats'],
        ['teachers', 'Professeurs'],
        ['aesh', 'AESH'],
        ['surveillants', 'Surveillants'],
        ['secretariat', "Secrétariat d'examen"],
        ['reserve', 'Réserve'],
        ['correctors', 'Correcteurs']
    ];

    container.innerHTML = labels.map(([key, label]) => `
        <div style="border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fff;">
            <label for="instr-${key}" style="display:block; font-weight:bold; color:#2c3e50; margin-bottom:6px;">${escapeHTML(label)}</label>
            <textarea id="instr-${key}" rows="5" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-family:sans-serif; font-size:0.9rem; line-height:1.4;" oninput="setInstructionTemplate('${key}', this.value)">${escapeHTML(getInstructionTemplate(key))}</textarea>
        </div>
    `).join('');
}

function getNamedBackups() {
    try {
        return JSON.parse(localStorage.getItem(NAMED_BACKUPS_KEY) || '[]');
    } catch (error) {
        console.warn('Sauvegardes nommées illisibles', error);
        return [];
    }
}

function setNamedBackups(backups) {
    return safeSetItem(NAMED_BACKUPS_KEY, JSON.stringify(backups.slice(0, 12)));
}

function createNamedBackup(label = '') {
    if (typeof DB === 'undefined' || !DB) return;
    const now = new Date();
    const backup = {
        id: `${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
        label: label || `Sauvegarde manuelle ${now.toLocaleString('fr-FR')}`,
        createdAt: now.toISOString(),
        summary: {
            students: (DB.students || []).length,
            rooms: (DB.rooms || []).length,
            teachers: (DB.teachers || []).length,
            exam: typeof getExamSessionLabel === 'function' ? getExamSessionLabel() : (DB.config?.year || '')
        },
        data: JSON.stringify(DB)
    };
    const backups = [backup, ...getNamedBackups()];
    setNamedBackups(backups);
    renderNamedBackups();
    return backup;
}

function createManualNamedBackup() {
    const input = document.getElementById('namedBackupLabel');
    const label = input && input.value.trim() ? input.value.trim() : '';
    const backup = createNamedBackup(label);
    if (input) input.value = '';
    if (backup && typeof showToast === 'function') showToast('Sauvegarde nommée créée.', 'success');
}

function restoreNamedBackup(id) {
    const backup = getNamedBackups().find(item => item.id === id);
    if (!backup) return showToast('Sauvegarde introuvable.', 'error');
    showConfirm(`Restaurer "${backup.label}" ?\n\nLes données actuelles seront remplacées au rechargement.`, () => {
        if (!safeSetItem('DNB_Manager_Current', backup.data)) return;
        location.reload();
    });
}

function deleteNamedBackup(id) {
    setNamedBackups(getNamedBackups().filter(item => item.id !== id));
    renderNamedBackups();
}

function renderNamedBackups() {
    const list = document.getElementById('namedBackupsList');
    if (!list) return;
    const backups = getNamedBackups();
    if (backups.length === 0) {
        list.innerHTML = '<div style="color:#7f8c8d; padding:10px;">Aucune sauvegarde nommée pour le moment.</div>';
        return;
    }

    list.innerHTML = backups.map(backup => {
        const date = new Date(backup.createdAt).toLocaleString('fr-FR');
        const summary = backup.summary || {};
        return `
            <div style="display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; padding:10px 0; border-bottom:1px solid #ecf0f1;">
                <div>
                    <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(backup.label)}</div>
                    <div style="font-size:0.84rem; color:#7f8c8d;">${escapeHTML(date)} - ${summary.students || 0} élève(s), ${summary.rooms || 0} salle(s), ${summary.teachers || 0} professeur(s)</div>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" style="padding:6px 10px;" onclick="restoreNamedBackup('${backup.id}')">Restaurer</button>
                    <button class="btn btn-danger" style="padding:6px 10px;" onclick="deleteNamedBackup('${backup.id}')">Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

function createActionBackup(label) {
    const backup = createNamedBackup(label);
    if (backup) console.log(`[Backup] ${backup.label}`);
}

function clearStudentsWithBackup() {
    showConfirm("Vider la liste des élèves ?\n\nUne sauvegarde nommée sera créée avant suppression.", () => {
        createActionBackup('Avant vidage élèves');
        DB.students = [];
        if (typeof renderStudents === 'function') renderStudents();
        if (typeof autoSave === 'function') autoSave();
    });
}

function clearRoomsWithBackup() {
    showConfirm("Vider la liste des salles ?\n\nUne sauvegarde nommée sera créée avant suppression.", () => {
        createActionBackup('Avant vidage salles');
        DB.rooms = [];
        if (typeof renderRooms === 'function') renderRooms();
        if (typeof autoSave === 'function') autoSave();
    });
}

function clearTeachersWithBackup() {
    showConfirm("Vider la liste des professeurs ?\n\nUne sauvegarde nommée sera créée avant suppression.", () => {
        createActionBackup('Avant vidage professeurs');
        DB.teachers = [];
        if (typeof renderTeachers === 'function') renderTeachers();
        if (typeof autoSave === 'function') autoSave();
    });
}

function drawExamPdfHeader(doc, options = {}) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = options.margin ?? 14;
    const logoSize = options.logoSize ?? 28;
    const y = options.y ?? 10;
    const title = options.title || '';
    const subtitle = options.subtitle || '';
    const schoolName = DB.config?.schoolName || 'Établissement';
    const session = typeof getExamSessionLabel === 'function' ? getExamSessionLabel() : `Session ${DB.config?.year || ''}`;

    if (typeof addSmartLogo === 'function') addSmartLogo(doc, margin, y, logoSize);
    doc.setTextColor(44, 62, 80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(options.schoolFontSize || 14);
    doc.text(schoolName, pageWidth / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(session, pageWidth / 2, y + 15, { align: 'center' });

    if (title) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(options.titleFontSize || 16);
        doc.setTextColor(0);
        doc.text(title, pageWidth / 2, y + 31, { align: 'center' });
    }
    if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(90);
        doc.text(subtitle, pageWidth / 2, y + 38, { align: 'center' });
    }
    return y + (subtitle ? 46 : title ? 40 : 24);
}

window.addEventListener('load', () => {
    setTimeout(() => {
        ensureExamFoundationConfig();
        syncAllInstructionFields();
        renderInstructionTemplates();
        renderNamedBackups();
    }, 350);
});
