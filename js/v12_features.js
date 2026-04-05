// =========================================================
// v12_features.js
// Fonctions issues de la version 1.2 de Orga Exam College
// Ce fichier contient toutes les nouvelles fonctionnalites
// absentes du projet actuel (V14.7+).
// =========================================================

// =========================================================
// === GESTION DU TITRE DE L'EXAMEN (GENERIQUE) ===
// =========================================================

// Fonction appelee quand le menu deroulant change
window.handleExamTypeChange = function(value) {
    DB.config.examType = value;
    const customContainer = document.getElementById('customExamContainer');
    const customInput = document.getElementById('customExamInput');

    if (value === 'CUSTOM') {
        customContainer.style.display = 'block';
        customContainer.setAttribute('aria-hidden', 'false');
        customInput.focus();
    } else {
        customContainer.style.display = 'none';
        customContainer.setAttribute('aria-hidden', 'true');
    }
};

// Helper appele par TOUS les exports PDF pour recuperer le bon titre
window.getExamTitle = function() {
    const type = DB.config.examType || "DNB Blanc";
    if (type === 'CUSTOM') {
        return (DB.config.customExamName && DB.config.customExamName.trim() !== "")
               ? DB.config.customExamName.toUpperCase()
               : "ÉVALUATION";
    }
    return type.toUpperCase();
};

// =========================================================
// === MODULE ETIQUETTES DE TABLE ===
// =========================================================

window.openTableLabelConfig = function() {
    if (!DB.students || DB.students.length === 0) return alert("Aucun élève dans la base.");

    let title = "🏷️ Étiquettes de Table";
    let defCols = 2;
    let defRows = 4;

    const overlay = document.createElement('div');
    overlay.className = "modal-overlay-custom";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center; transition: 0.3s;";

    overlay.innerHTML = `
        <div style="background:white; border-radius:12px; width:400px; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; overflow:hidden; box-shadow:0 15px 40px rgba(0,0,0,0.3);">
            <div style="background:#2c3e50; padding:15px; text-align:center;">
                <h3 style="margin:0; font-size:1.2rem; color: white !important;">${title}</h3>
            </div>
            <div style="padding:20px;">
                <p style="font-size:0.9rem; color:#666; margin-bottom:15px;">Configurez le nombre d'étiquettes par page A4 :</p>

                <div style="display:flex; gap:20px; margin-bottom:20px;">
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.8rem; font-weight:bold; color: #333;">Colonnes</label>
                        <input type="number" id="tblColsTable" value="${defCols}" min="1" max="5" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:5px;">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; font-size:0.8rem; font-weight:bold; color: #333;">Lignes</label>
                        <input type="number" id="tblRowsTable" value="${defRows}" min="1" max="20" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:5px;">
                    </div>
                </div>

                <div style="display:flex; gap:10px;">
                    <button class="btn btn-secondary" style="flex:1; padding:10px;" onclick="this.closest('.modal-overlay-custom').remove()">Annuler</button>
                    <button class="btn btn-success" style="flex:1; padding:10px;" id="btnStartGenTable">Générer PDF</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btnStartGenTable').onclick = function() {
        const c = parseInt(document.getElementById('tblColsTable').value);
        const r = parseInt(document.getElementById('tblRowsTable').value);
        overlay.remove();
        if (typeof generateTableLabelsPDF === 'function') {
            generateTableLabelsPDF(c, r);
        } else {
            console.error("Erreur : La fonction generateTableLabelsPDF n'est pas définie.");
        }
    };
};

/**
 * Moteur de rendu PDF dedie aux Etiquettes de TABLE
 */
function generateTableLabelsPDF(nbCols, nbRows) {
    if (window.syncDistributionData) window.syncDistributionData();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const items = [];

    if (DB.distribution && Object.keys(DB.distribution).length > 0) {
        Object.keys(DB.distribution).sort().forEach(roomName => {
            if (roomName === "Zone Tampon") return;
            DB.distribution[roomName].forEach(s => {
                items.push({
                    room: roomName,
                    name: `${s.nom} ${s.prenom}`,
                    classe: s.classe,
                    code: s.anonymat || ""
                });
            });
        });
    } else {
        DB.students.forEach(s => items.push({
            room: "NON PLACÉ",
            name: `${s.nom} ${s.prenom}`,
            classe: s.classe,
            code: s.anonymat || ""
        }));
    }

    const m = 10;
    const boxW = (210 - 2*m) / nbCols;
    const boxH = (297 - 2*m) / nbRows;
    const perPage = nbCols * nbRows;

    items.forEach((item, i) => {
        const idxPage = i % perPage;
        if (i > 0 && idxPage === 0) doc.addPage();

        const col = idxPage % nbCols;
        const row = Math.floor(idxPage / nbCols);
        const x = m + col * boxW;
        const y = m + row * boxH;
        const cx = x + boxW/2;
        const cy = y + boxH/2;

        doc.setDrawColor(200);
        doc.setLineDash([1, 1]);
        doc.rect(x, y, boxW, boxH);
        doc.setLineDash([]);

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`DNB ${DB.config.year || ""} - Salle ${item.room}`, cx, y + 8, {align:'center'});

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(item.name, cx, cy, {align:'center'});

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(item.classe, cx, cy + 6, {align:'center'});

        if (item.code) {
             doc.setFontSize(11);
             doc.setTextColor(192, 57, 43);
             doc.text(item.code, cx, y + boxH - 6, {align:'center'});
        }
    });

    doc.save("Etiquettes_Table.pdf");
}

// =========================================================
// === EXPORT ELEVES VERS EXCEL ===
// =========================================================

window.exportStudentsToExcel = function() {
    if (!DB.students || DB.students.length === 0) {
        return alert("Aucun élève à exporter.");
    }

    const data = [
        ["Nom", "Prénom", "Sexe", "Classe", "MEF", "Anonymat", "Tiers-Temps", "Aménagements"]
    ];

    DB.students.forEach(s => {
        data.push([
            s.nom,
            s.prenom,
            s.sexe,
            s.classe || "Non classé",
            s.mef || "",
            s.anonymat || "",
            s.tt ? "OUI" : "NON",
            s.labels ? s.labels.join(", ") : ""
        ]);
    });

    try {
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Liste_Eleves");

        ws['!cols'] = [
            { wch: 20 },
            { wch: 20 },
            { wch: 8  },
            { wch: 12 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 25 }
        ];

        const fileName = `Export_Eleves_DNB_${DB.config.year || 2026}.xlsx`;
        XLSX.writeFile(wb, fileName);
    } catch (err) {
        console.error(err);
        alert("Erreur lors de la génération du fichier Excel : " + err.message);
    }
};

// =========================================================
// === EXPORT GROUPES ELEVES (COPIE AVEC EN-TETES) ===
// =========================================================

window.exportGroupsByRoom = function() {
    if (!DB.rooms || DB.rooms.length === 0) {
        alert("⚠️ Aucune salle configurée.");
        return;
    }
    if (!DB.distribution || Object.keys(DB.distribution).length === 0) {
        alert("⚠️ La répartition n'a pas été faite.");
        return;
    }

    let clipboardContent = "Nom\tPrénom\tAnnée en cours - Groupe\n";
    let count = 0;

    DB.rooms.forEach((room, index) => {
        const groupNumber = String(index + 1).padStart(2, '0');
        const groupName = `DNBBL-GPE${groupNumber}`;

        const studentsInRoom = DB.distribution[room.nom] || [];

        studentsInRoom.forEach(student => {
            const nom = student.nom.trim();
            const prenom = student.prenom.trim();

            clipboardContent += `${nom}\t${prenom}\t${groupName}\n`;
            count++;
        });
    });

    if (navigator.clipboard) {
        navigator.clipboard.writeText(clipboardContent)
            .then(() => {
                alert(`✅ COPIE RÉUSSIE !\n\n${count} élèves copiés avec les en-têtes.\n\n👉 Allez dans votre logiciel EDT.\n👉 Faites CTRL + V.`);
            })
            .catch(err => {
                console.error('Erreur clipboard:', err);
                alert("❌ Erreur technique : Impossible d'accéder au presse-papier.");
            });
    } else {
        alert("❌ Votre navigateur ne supporte pas la copie automatique.");
    }
};

// =========================================================
// === EXPORT LISTE DES EPREUVES ===
// =========================================================

window.exportExamsList = function() {
    if (!DB.exams || DB.exams.length === 0) return alert("⚠️ Aucune épreuve définie.");

    let clipboardContent = "Code\tLibellé\n";
    const uniqueExams = new Set();
    let count = 0;

    DB.exams.forEach(exam => {
        const libelle = exam.name.trim();
        if (!uniqueExams.has(libelle)) {
            uniqueExams.add(libelle);
            const cleanName = libelle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const suffixe = cleanName.substring(0, 3).replace(/\s/g, "");
            const code = `DNBBLC-${suffixe}`;
            clipboardContent += `${code}\t${libelle}\n`;
            count++;
        }
    });

    navigator.clipboard.writeText(clipboardContent).then(() => {
        alert(`✅ COPIE RÉUSSIE !\n\n${count} matières copiées.\nSuivez maintenant le tutoriel en bas de page.`);
    });
};

// =========================================================
// === SUPPRESSION LOGO / SIGNATURE ===
// =========================================================

window.deleteLogo = function() {
    if(confirm("Voulez-vous vraiment supprimer le logo ?")) {
        DB.config.logo = "";
        document.getElementById('logoInput').value = "";
        checkLogo();
    }
};

window.deleteSignature = function() {
    if(confirm("Voulez-vous vraiment supprimer la signature ?")) {
        DB.config.signature = "";
        document.getElementById('sigInput').value = "";
        checkSignature();
    }
};

// =========================================================
// === MODULE CORRECTIONS : INITIALISATION & MODE GLOBAL ===
// =========================================================

function initCorrectionsModule() {
    if (!DB.corrections) DB.corrections = { settings: {}, lots: {} };
    window.allClasses = [...new Set(DB.students.map(s => s.classe).filter(c => c && c !== "Non Classé"))].sort();
}

function updateCorrGlobalMode() {
    initCorrectionsModule();
    const subj = document.getElementById('corrSubjectSelect').value;
    if(!DB.corrections.settings[subj]) DB.corrections.settings[subj] = { mode: 'auto', teachers: [], manualMap: {} };
    DB.corrections.settings[subj].mode = document.getElementById('corrModeSelect').value;
    renderCorrectionsConfig();
}

// =========================================================
// === MODALE D'AJOUT D'UN CORRECTEUR ===
// =========================================================

window.openAddCorrectorModal = function() {
    const select = document.getElementById('correctorProfSelect');
    select.innerHTML = '<option value="">-- Choisir un professeur --</option>';

    const seenIds = new Set();
    DB.teachers.forEach(t => {
        if (!t.id || seenIds.has(String(t.id))) {
            t.id = 'prof_' + Math.random().toString(36).substr(2, 9);
        }
        seenIds.add(String(t.id));
    });

    DB.teachers.sort((a,b) => a.nom.localeCompare(b.nom)).forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.nom} ${t.prenom} (${t.matiere})</option>`;
    });

    document.getElementById('addCorrectorModal').style.display = 'flex';
};

// =========================================================
// === CONFIRMATION AJOUT CORRECTEUR ===
// =========================================================

window.confirmAddCorrector = function() {
    initCorrectionsModule();
    const subj = document.getElementById('corrSubjectSelect').value;

    if (!DB.corrections.settings[subj]) {
        DB.corrections.settings[subj] = { mode: 'auto', teachers: [], manualMap: {} };
    }

    const modal = document.getElementById('addCorrectorModal');
    const selectEl = modal.querySelector('#correctorProfSelect');

    if (!selectEl) {
        console.error("Erreur : Sélecteur de professeur introuvable.");
        return;
    }

    const profIdRaw = selectEl.value;
    if (!profIdRaw || profIdRaw === "") {
        alert("Veuillez sélectionner un professeur dans la liste.");
        return;
    }

    DB.corrections.settings[subj].teachers = DB.corrections.settings[subj].teachers.filter(t =>
        t !== null && t.id !== null && t.id !== undefined
    );

    const alreadyExists = DB.corrections.settings[subj].teachers.some(t =>
        String(t.id) === String(profIdRaw)
    );

    if (alreadyExists) {
        alert("Ce professeur figure déjà dans l'équipe de correction pour cette matière.");
        return;
    }

    const finalId = isNaN(profIdRaw) ? profIdRaw : parseFloat(profIdRaw);
    DB.corrections.settings[subj].teachers.push({
        id: finalId,
        classes: [],
        allowOwn: false,
        quota: 0
    });

    selectEl.selectedIndex = 0;
    modal.style.display = 'none';

    renderCorrectionsConfig();

    if (typeof saveDB === 'function') saveDB();
};

// =========================================================
// === RENDU DE L'INTERFACE CORRECTIONS (ROBUSTE) ===
// =========================================================

window.renderCorrectionsConfig = function() {
    initCorrectionsModule();
    const subj = document.getElementById('corrSubjectSelect').value;
    if(!DB.corrections.settings[subj]) DB.corrections.settings[subj] = { mode: 'auto', teachers: [], manualMap: {} };

    const config = DB.corrections.settings[subj];
    document.getElementById('corrModeSelect').value = config.mode;

    const isAutoOrQuota = (config.mode === 'auto' || config.mode === 'manual_quota');
    const isManualClass = config.mode === 'one_to_one';
    const isManualAssisted = config.mode === 'manual_assisted';

    document.getElementById('corrManualClassArea').style.display = isManualClass ? 'block' : 'none';

    const assistedArea = document.getElementById('corrAssistedArea');
    if (assistedArea) assistedArea.style.display = isManualAssisted ? 'block' : 'none';

    const thead = document.getElementById('corrThead');
    const tbody = document.getElementById('corrTbody');

    if (isAutoOrQuota) {
        thead.innerHTML = `<tr>
            <th>Professeur</th>
            <th>Classes en responsabilité</th>
            <th style="text-align:center;">Corrige ses élèves ?</th>
            <th style="text-align:center;">Quota copies</th>
            <th style="text-align:center;">Action</th>
        </tr>`;
    } else {
        thead.innerHTML = `<tr>
            <th style="width:80%;">Équipe de correction</th>
            <th style="text-align:center; width:20%;">Action</th>
        </tr>`;
    }

    tbody.innerHTML = '';

    const validTeachers = config.teachers.filter(tc => tc.id !== null);

    if (validTeachers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#999; padding: 20px;">Aucun correcteur. Cliquez sur "Ajouter".</td></tr>`;
    }

    validTeachers.forEach((tc, idx) => {
        const profDb = DB.teachers.find(t => String(t.id) === String(tc.id));
        const nomComplet = profDb ? `${profDb.nom} ${profDb.prenom}` : '⚠️ ID Rompu (Supprimer/Ré-ajouter)';

        if (isAutoOrQuota) {
            let classesHtml = `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
            window.allClasses.forEach(cls => {
                const isChecked = tc.classes.includes(cls) ? 'checked' : '';
                classesHtml += `<label style="background:#e8f0fe; border: 1px solid #d2e3fc; color: #1967d2; padding:5px 12px; border-radius:16px; font-size:0.85rem; cursor:pointer; display:inline-flex; align-items:center; gap:8px;">
                    <input type="checkbox" ${isChecked} onchange="toggleCorrectorClass('${subj}', ${idx}, '${cls}', this.checked)">
                    <span>${cls}</span>
                </label>`;
            });
            classesHtml += `</div>`;

            tbody.innerHTML += `<tr>
                <td style="font-weight:bold;">${nomComplet}</td>
                <td>${classesHtml}</td>
                <td style="text-align:center;"><input type="checkbox" ${tc.allowOwn ? 'checked' : ''} onchange="toggleCorrectorOwn('${subj}', ${idx}, this.checked)" style="transform:scale(1.3);"></td>
                <td style="text-align:center;"><input type="number" value="${tc.quota || 0}" onchange="updateCorrectorQuota('${subj}', ${idx}, this.value)" style="width:70px; text-align:center;"></td>
                <td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="removeCorrector('${subj}', ${idx})">🗑️</button></td>
            </tr>`;
        } else {
            tbody.innerHTML += `<tr>
                <td style="font-weight:bold; font-size:1.1rem;">👨‍🏫 ${nomComplet}</td>
                <td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="removeCorrector('${subj}', ${idx})">🗑️ Retirer</button></td>
            </tr>`;
        }
    });

    if (isManualClass) {
        renderManualClassTable(subj, config, profsMap = {});
    } else if (isManualAssisted) {
        initManualAssistedMode(subj);
    }

    renderLotsResult(subj);
};

// =========================================================
// === RAZ EQUIPE CORRECTION ===
// =========================================================

window.resetCorrectionSubject = function() {
    const subj = document.getElementById('corrSubjectSelect').value;
    if (confirm(`Voulez-vous vraiment RAZ complète de l'équipe pour cette matière ?`)) {

        if (DB.corrections && DB.corrections.settings) {
            DB.corrections.settings[subj] = {
                mode: 'auto',
                teachers: [],
                manualMap: {}
            };
        }

        if (DB.corrections.lots) {
            DB.corrections.lots[subj] = [];
        }

        if (typeof saveDB === 'function') saveDB();
        renderCorrectionsConfig();
        alert("Réinitialisation réussie. La liste est maintenant totalement vide.");
    }
};

// =========================================================
// === ACTIONS CORRECTEURS (Suppression, Toggle, Quotas) ===
// =========================================================

window.removeCorrector = function(subj, idx) {
    DB.corrections.settings[subj].teachers.splice(idx, 1);
    renderCorrectionsConfig();
};

window.toggleCorrectorClass = function(subj, idx, cls, isChecked) {
    const arr = DB.corrections.settings[subj].teachers[idx].classes;
    if(isChecked) arr.push(cls);
    else arr.splice(arr.indexOf(cls), 1);
};

window.toggleCorrectorOwn = function(subj, idx, val) {
    DB.corrections.settings[subj].teachers[idx].allowOwn = val;
};

window.updateManualMap = function(subj, cls, profId) {
    if (!DB.corrections.settings[subj].manualMap) {
        DB.corrections.settings[subj].manualMap = {};
    }

    if (profId === "") {
        delete DB.corrections.settings[subj].manualMap[cls];
    } else {
        DB.corrections.settings[subj].manualMap[cls] = isNaN(profId) ? profId : parseFloat(profId);
    }

    if (typeof saveDB === 'function') {
        saveDB();
    }
};

window.updateCorrectorQuota = function(subj, idx, val) {
    DB.corrections.settings[subj].teachers[idx].quota = parseInt(val) || 0;
    if(typeof saveDB === 'function') saveDB();
};

// =========================================================
// === MOTEUR DE GENERATION DES LOTS ===
// =========================================================

window.generateDistributionLots = function() {
    const subj = document.getElementById('corrSubjectSelect').value;
    const config = DB.corrections.settings[subj];
    let pool = DB.students.filter(s => s.anonymat && s.anonymat.trim() !== "");

    if(pool.length === 0) return alert("Aucun élève ne possède de code d'anonymat.");
    if(!config || config.teachers.length === 0) return alert("Veuillez ajouter des correcteurs.");

    let profsMap = {};
    config.teachers.forEach(tc => {
        const tDb = DB.teachers.find(t => t.id === tc.id);
        profsMap[tc.id] = {
            id: tc.id, name: tDb ? `${tDb.nom} ${tDb.prenom}` : 'Inconnu',
            classes: tc.classes, allowOwn: tc.allowOwn, quota: tc.quota || 0, copies: []
        };
    });

    // MODE 1 : 1 Lot = 1 Classe
    if (config.mode === 'one_to_one') {
        let unassignedClasses = new Set();
        pool.forEach(student => {
            if(!student.classe || student.classe === "Non Classé") return;
            const assignedProfId = config.manualMap && config.manualMap[student.classe];

            if (assignedProfId && profsMap[assignedProfId]) {
                profsMap[assignedProfId].copies.push(student);
            } else {
                unassignedClasses.add(student.classe);
            }
        });

        if (unassignedClasses.size > 0) {
            alert(`⚠️ Attention : Vous n'avez pas assigné de correcteur pour les classes : ${Array.from(unassignedClasses).join(', ')}.`);
        }

        DB.corrections.lots[subj] = Object.values(profsMap).filter(p => p.copies.length > 0);
        if(typeof saveDB === 'function') saveDB();
        renderLotsResult(subj);
        return;
    }

    // MODES 2 & 3 : Equitable (auto) ou Quotas Manuels
    pool = pool.sort(() => Math.random() - 0.5);
    const profsArray = Object.values(profsMap);

    if (config.mode === 'auto') {
        const base = Math.floor(pool.length / profsArray.length);
        const remainder = pool.length % profsArray.length;
        profsArray.forEach((p, i) => p.quota = base + (i < remainder ? 1 : 0));
    } else {
        const totalQuota = profsArray.reduce((sum, p) => sum + p.quota, 0);
        if (totalQuota < pool.length) return alert(`⚠️ Quotas insuffisants (${totalQuota} copies prévues pour ${pool.length} élèves).`);
    }

    let unassigned = [];
    pool.forEach(student => {
        let eligibles = profsArray.filter(p => p.copies.length < p.quota && (p.allowOwn || !p.classes.includes(student.classe)));
        if (eligibles.length > 0) {
            eligibles.sort((a,b) => (b.quota - b.copies.length) - (a.quota - a.copies.length));
            eligibles[0].copies.push(student);
        } else { unassigned.push(student); }
    });

    if (unassigned.length > 0) {
        unassigned.forEach(student => {
            let dispos = profsArray.filter(p => p.copies.length < p.quota);
            if (dispos.length > 0) dispos[0].copies.push({...student, forced: true});
            else profsArray[0].copies.push({...student, forced: true});
        });
    }

    DB.corrections.lots[subj] = profsArray;
    if(typeof saveDB === 'function') saveDB();
    renderLotsResult(subj);
};

// =========================================================
// === RENDU TABLEAU AFFECTATION PAR CLASSE ===
// =========================================================

window.renderManualClassTable = function(subj, config) {
    const tbody = document.getElementById('corrManualClassTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const classes = [...new Set(DB.students.map(s => s.classe).filter(c => c && c !== "Non Classé"))].sort();

    if (classes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#e67e22;">⚠️ Aucun élève avec une classe n\'a été trouvé.</td></tr>';
        return;
    }

    classes.forEach(cls => {
        const count = DB.students.filter(s => s.classe === cls && s.anonymat).length;
        const currentProfId = config.manualMap ? config.manualMap[cls] : "";

        let options = `<option value="">-- Choisir un correcteur --</option>`;
        config.teachers.forEach(tc => {
            const profDb = DB.teachers.find(t => String(t.id) === String(tc.id));
            if (profDb) {
                const selected = String(tc.id) === String(currentProfId) ? 'selected' : '';
                options += `<option value="${tc.id}" ${selected}>${profDb.nom} ${profDb.prenom}</option>`;
            }
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:bold;">📦 Classe : ${cls}</td>
            <td style="text-align:center;">
                <span class="badge ${count > 0 ? 'btn-success' : 'btn-danger'}" style="padding:5px 10px;">${count} copies</span>
            </td>
            <td>
                <select class="form-control" onchange="updateManualMap('${subj}', '${cls}', this.value)" style="width:100%; padding:5px;">
                    ${options}
                </select>
            </td>`;
        tbody.appendChild(tr);
    });
};

// =========================================================
// === RENDU VISUEL DES LOTS + BOUTON PDF ===
// =========================================================

window.renderLotsResult = function(subj) {
    const area = document.getElementById('corrResultsArea');
    area.innerHTML = '';
    const lots = DB.corrections.lots[subj];
    if(!lots || lots.length === 0) return;

    const headerHtml = `
    <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; background: #e8f8f5; padding: 15px; border-radius: 8px; border: 1px solid #1abc9c; margin-bottom: 10px;">
        <h4 style="margin: 0; color: #16a085;">✅ Répartition terminée (${lots.length} lots)</h4>
        <div style="display: flex; gap: 15px;">
            <button class="btn btn-dark" onclick="exportPochettesCorrecteursPDF('${subj}')" style="font-size: 1rem; padding: 10px 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
    📁 Pochettes Correcteurs (A3)
</button><button class="btn btn-success" onclick="exportCorrectionsPDF('${subj}')" style="font-size: 1rem; padding: 10px 20px; box-shadow: 0 4px 6px rgba(46, 204, 113, 0.3);">
                📄 Bordereaux (PDF)
            </button>
            <button class="btn btn-primary" onclick="exportCorrectionsExcel('${subj}')" style="font-size: 1rem; padding: 10px 20px; background-color: #27ae60; border-color: #2ecc71; box-shadow: 0 4px 6px rgba(39, 174, 96, 0.3);">
                📊 Fichier Excel de Saisie
            </button>
        </div>
    </div>
`;
    area.innerHTML = headerHtml;

    lots.forEach(prof => {
        prof.copies.sort((a,b) => (a.anonymat || "").localeCompare(b.anonymat || ""));

        let listHtml = prof.copies.map(c => {
            const warning = c.forced ? `<span style="color:#e74c3c; font-size:0.7rem;" title="Attribution forcée (Contrainte ignorée)">⚠️</span>` : '';
            return `<div style="padding:4px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; font-family:monospace; font-size:1rem;">
                <span>${c.anonymat}</span> ${warning}
            </div>`;
        }).join('');

        area.innerHTML += `
            <div style="border:1px solid #ddd; border-radius:8px; overflow:hidden; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
                <div style="background:#34495e; color:white; padding:10px 15px; display:flex; justify-content:space-between; align-items:center;">
                    <strong>👨‍🏫 ${prof.name}</strong>
                    <span class="badge" style="background:#2ecc71; font-size:1rem; padding:5px 10px;">${prof.copies.length} copies</span>
                </div>
                <div style="max-height:250px; overflow-y:auto; padding:5px 10px;">
                    ${listHtml || '<p style="text-align:center; color:#ccc;">Aucune copie</p>'}
                </div>
            </div>
        `;
    });
};

// =========================================================
// === ANALYSE STATISTIQUE DES CORRECTIONS ===
// =========================================================

window.renderAnalyseCorrections = function() {
    const subj = document.getElementById('analyseSubjectSelect').value;
    const area = document.getElementById('analyseResultsArea');
    if(!area) return;
    area.innerHTML = '';

    // --- PARTIE 1 : ANALYSE DES CORRECTEURS ET MATIERE ---

    if (!DB.corrections || !DB.corrections.lots || !DB.corrections.lots[subj]) {
        area.innerHTML = '<div class="alert alert-warning">⚠️ Aucune répartition de copies pour cette matière.</div>';
    } else {
        const lots = DB.corrections.lots[subj];
        let totalSum = 0, totalCount = 0, classData = {};

        DB.students.forEach(s => {
            if (s.grades && typeof s.grades[subj] === 'number') {
                const note = s.grades[subj];
                totalSum += note; totalCount++;
                const c = s.classe || 'Non classé';
                if (!classData[c]) classData[c] = { sum: 0, count: 0 };
                classData[c].sum += note; classData[c].count++;
            }
        });

        if (totalCount > 0) {
            const globalAvg = (totalSum / totalCount).toFixed(2);

            let classAvgsHtml = `<div style="display:flex; flex-wrap:wrap; gap:10px; margin: 20px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">`;
            classAvgsHtml += `<div style="flex:100%; font-weight:bold; margin-bottom:5px;">📍 Moyennes DNB par classe :</div>`;
            Object.keys(classData).sort().forEach(c => {
                const avg = (classData[c].sum / classData[c].count).toFixed(2);
                classAvgsHtml += `<span class="badge" style="background:#e8f0fe; color:#1967d2; padding:8px; border-radius:20px;">${c} : ${avg}</span>`;
            });
            classAvgsHtml += `</div>`;

            let tableHtml = `<table class="table table-bordered" style="background:white; text-align:center;">
                <thead style="background:#34495e; color:white;">
                    <tr><th>👨‍🏫 Correcteur</th><th>Avancement</th><th style="background-color: #f4f6f9; color: #2c3e50;">🎯 Moyenne du Lot</th><th>Écart /Niveau</th></tr>
                </thead><tbody>`;

            lots.forEach(prof => {
                let profSum = 0, profCount = 0;
                prof.copies.forEach(lotStudent => {
                    const s = DB.students.find(st => st.anonymat === lotStudent.anonymat);
                    if (s && s.grades && typeof s.grades[subj] === 'number') {
                        profSum += s.grades[subj]; profCount++;
                    }
                });
                const profAvg = profCount > 0 ? (profSum / profCount).toFixed(2) : '-';
                let ecartHtml = '-';
                if (profAvg !== '-' && globalAvg !== '-') {
                    const ecart = (profAvg - globalAvg).toFixed(2);
                    const color = ecart > 0 ? '#27ae60' : (ecart < 0 ? '#e74c3c' : '#7f8c8d');
                    ecartHtml = `<span style="color:${color}; font-weight:bold;">${ecart > 0 ? '+' : ''}${ecart}</span>`;
                }
                tableHtml += `<tr><td>${prof.name}</td><td>${profCount}/${prof.copies.length}</td><td style="font-weight:bold; color:#2980b9;">${profAvg}</td><td>${ecartHtml}</td></tr>`;
            });
            tableHtml += `</tbody></table>`;

            area.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#ecf0f1; padding:20px; border-radius:8px; border-left:6px solid #2980b9;">
                    <h4>Moyenne Globale ${subj.toUpperCase()}</h4>
                    <div style="font-size:2.5rem; font-weight:bold; color:#2980b9;">${globalAvg}</div>
                </div>
                ${classAvgsHtml}
                ${tableHtml}`;
        }
    }

    // ============================================================================
    // PARTIE 2 : COMPARAISON GLOBALE DNB vs CONTROLE CONTINU
    // ============================================================================

    if (DB.classStats && Object.keys(DB.classStats).length > 0) {
        const hr = document.createElement('hr');
        hr.style.margin = "40px 0";
        area.appendChild(hr);

        const compDiv = document.createElement('div');
        compDiv.className = "card";
        compDiv.style.borderTop = "4px solid #27ae60";

        compDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 15px 0 15px; margin-bottom: 15px;">

                <div>
                    <h4 style="color:#27ae60; margin: 0 0 5px 0;">📊 Comparaison Bilan : ${getExamTitle()} vs Moyennes Annuelles</h4>
                    <p style="font-size:0.9rem; color:#666; margin: 0;">Vue d'ensemble de toutes les matières importées via le fichier global.</p>
                </div>

                <div role="group" aria-label="Options d'exportation" style="display: flex; gap: 10px;">
                    <button onclick="window.exportTableToExcel('tableComparatifNiveau')"
                            style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                            aria-label="Exporter le tableau au format Excel">
                        📊 Export Excel
                    </button>

                    <button onclick="window.exportTableToPDF()"
                            style="background-color: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                            aria-label="Exporter le tableau au format PDF">
                        📄 Export PDF
                    </button>
                </div>
            </div>

            <div class="table-responsive" style="padding: 0 15px 15px 15px;">
                <div id="zoneCapturePDF" style="background-color: #ffffff; padding: 10px;">
                    ${getGlobalComparisonHtml()}
                </div>
            </div>
        `;
        area.appendChild(compDiv);
    }
};

// =========================================================
// === FONCTIONS MANQUANTES POUR L'ANALYSE ===
// =========================================================

function importMissingLabels() {
    if (!DB.config.labels || DB.config.labels.length === 0) {
        DB.config.labels = JSON.parse(JSON.stringify(DEFAULT_LABELS));
    }
}

// =========================================================
// === EXPORT POCHETTES CORRECTEURS (A3 PDF) ===
// =========================================================

window.exportPochettesCorrecteursPDF = function(subj) {
    const lots = DB.corrections.lots[subj];
    if (!lots || lots.length === 0) return alert("Aucun lot à exporter.");

    const subjectNames = {
        'fr': 'Français',
        'math': 'Mathématiques',
        'hg': 'Histoire-Géographie / EMC',
        'svt': 'SVT',
        'pc': 'Physique-Chimie',
        'tech': 'Technologie'
    };
    const matiereNom = subjectNames[subj] || subj;
    const year = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a3');

    const PG_H = 297;
    const HALF_W = 210;
    const M = 15;

    lots.forEach((prof, idx) => {
        if (idx > 0) doc.addPage("a3", "l");

        const covX = HALF_W + M;
        const covW = HALF_W - (2*M);
        const covCenterX = covX + (covW/2);

        if (typeof addSmartLogo === "function") {
            addSmartLogo(doc, covX, 15, 45);
        }

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(schoolName, covX + 65, 25);

        doc.setFontSize(28);
        doc.setTextColor(44, 62, 80);
        doc.text("POCHETTE DE CORRECTION", covCenterX, 90, {align:'center'});

        doc.setFontSize(20);
        doc.text(`${getExamTitle()} - SESSION ${year}`, covCenterX, 105, {align:'center'});

        doc.setDrawColor(44, 62, 80);
        doc.setLineWidth(1.5);
        doc.rect(covX + 20, 130, covW - 40, 80);

        doc.setFontSize(24);
        doc.setTextColor(41, 128, 185);
        doc.text(`${matiereNom}`, covCenterX, 150, {align:'center'});

        let nameFontSize = 30;
        doc.setFontSize(nameFontSize);

        let nameWidth = doc.getTextWidth(prof.name);
        const maxNameWidth = covW - 50;

        if (nameWidth > maxNameWidth) {
            nameFontSize = Math.floor(nameFontSize * (maxNameWidth / nameWidth));
            if (nameFontSize < 12) nameFontSize = 12;
            doc.setFontSize(nameFontSize);
        }

        doc.setTextColor(0);
        doc.text(`${prof.name}`, covCenterX, 175, {align:'center'});

        doc.setFontSize(22);
        doc.setTextColor(231, 76, 60);
        doc.text(`Nombre de copies : ${prof.copies.length}`, covCenterX, 195, {align:'center'});

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        const consignes = "Veuillez corriger les copies contenues dans cette pochette.\nSaisissez ensuite les notes sur le fichier Excel envoyé via Pronote.\nRestituez cette pochette avec les copies corrigées et le bordereau de notation au secrétariat.";
        doc.text(consignes, covCenterX, 240, {align:'center', maxWidth: covW - 20});
    });

    doc.save(`Pochettes_Correction_${matiereNom.replace(/[\s\/]+/g, '_')}.pdf`);
};

// =========================================================
// === EXPORT COUPONS AMENAGEMENTS VIERGES ===
// =========================================================

window.exportCouponsAmenagementsPDF = function() {
    if (!window.jspdf) return alert("Erreur : La librairie jsPDF n'est pas chargée.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setProperties({ title: "Coupons_Amenagements_Vierges.pdf" });

    const year = DB.config.year || new Date().getFullYear();

    const couponsPerPage = 4;
    const pageW = 210;
    const pageH = 297;
    const couponH = pageH / couponsPerPage;

    const amenagementsTypes = [
        "Copie rédigée sur ordinateur",
        "Dictée aménagée",
        "Non prise en compte de la qualité rédactionnelle dont l'orthographe",
        "Dispense de l'exercice de tâche cartographique – épreuve Histoire-Géographie",
        "Neutralisation de l'exercice d'algorithmique - épreuve de mathématiques"
    ];

    for (let i = 0; i < couponsPerPage; i++) {
        const startY = i * couponH;

        if (i > 0) {
            doc.setDrawColor(150);
            doc.setLineWidth(0.3);
            doc.setLineDash([3, 3], 0);
            doc.line(0, startY, pageW, startY);
            doc.setLineDash([]);
            doc.setFontSize(12);
            doc.setTextColor(150);
            doc.text("✂", 5, startY + 1.5);
        }

        if (typeof addSmartLogo === "function") {
            addSmartLogo(doc, 15, startY + 5, 20);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text(`${getExamTitle()} - SESSION ${year}`, 105, startY + 12, { align: 'center' });

        doc.setFontSize(15);
        doc.setTextColor(41, 128, 185);
        doc.text("AMÉNAGEMENTS D'ÉPREUVES", 105, startY + 19, { align: 'center' });

        const checkX = 25;
        let checkY = startY + 32;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);

        amenagementsTypes.forEach((texte) => {
            doc.setDrawColor(0);
            doc.setLineWidth(0.3);
            doc.rect(checkX, checkY - 3, 4, 4);

            doc.text(texte, checkX + 8, checkY, { maxWidth: 165 });

            const textLines = doc.splitTextToSize(texte, 165);
            checkY += (textLines.length * 4) + 3.5;
        });

        doc.rect(checkX, checkY - 3, 4, 4);
        doc.setFont("helvetica", "bold");
        doc.text("Autre(s) :", checkX + 8, checkY);

        doc.setDrawColor(150);
        doc.setLineDash([1, 1], 0);
        doc.line(checkX + 26, checkY, 185, checkY);
        doc.setLineDash([]);
    }

    doc.save(`Coupons_Amenagements_Vierges_${year}.pdf`);
};

// =========================================================
// === MODAL CONFIG COUPONS AMENAGEMENT (Version V1.2) ===
// =========================================================

window.openCouponsConfigModal = function() {
    const targetStudents = DB.students.filter(s => s.tiersTemps || s.tt || (s.labels && s.labels.length > 0));
    if (targetStudents.length === 0) {
        return alert("Aucun élève avec aménagement n'a été trouvé dans la base.");
    }

    // Recuperation dynamique de tous les labels uniques
    let allUniqueLabels = new Set();
    let hasTiersTemps = false;

    targetStudents.forEach(s => {
        if (s.tiersTemps || s.tt) hasTiersTemps = true;
        if (s.labels) {
            s.labels.forEach(l => {
                if (l.trim() !== '') allUniqueLabels.add(l.trim());
            });
        }
    });
    const uniqueLabelsArray = Array.from(allUniqueLabels).sort();

    const overlay = document.createElement('div');
    overlay.id = "coupons-modal-overlay";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(3px);";

    const modal = document.createElement('div');
    modal.style.cssText = "background:white; border-radius:12px; width:850px; max-height:95vh; font-family:'Segoe UI', sans-serif; box-shadow:0 20px 50px rgba(0,0,0,0.3); overflow:hidden; display:flex; flex-direction:column;";

    const defaultAmens = [
        { id: 'ordi', text: 'Copie rédigée sur ordinateur', code: 'ORDI' },
        { id: 'dict', text: 'Dictée aménagée', code: 'DICT' },
        { id: 'carto', text: "Dispense de l'exercice de tâche cartographique", code: 'CARTO' },
        { id: 'algo', text: "Neutralisation de l'exercice d'algorithmique", code: 'ALGO' },
        { id: 'ortho', text: "Non prise en compte de la qualité rédactionnelle dont l'orthographe", code: 'ORTHO' }
    ];

    let tableRows = '';
    defaultAmens.forEach(a => {
        tableRows += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:10px; text-align:center;">
                    <input type="checkbox" id="chk-${a.id}" checked style="transform: scale(1.3); cursor: pointer;">
                </td>
                <td style="padding:10px; font-size:0.9rem; color:#2c3e50;">${a.text}</td>
                <td style="padding:10px;">
                    <input type="text" id="map-${a.id}" value="${a.code}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-family:monospace; font-size:1rem; text-align:center;">
                </td>
            </tr>
        `;
    });

    let autresHtml = `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top: 10px;">`;
    if (hasTiersTemps) {
        autresHtml += `
            <label style="background:#fff; padding:8px 12px; border:1px solid #bdc3c7; border-radius:6px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="chk-other-tt" value="Tiers-Temps" checked style="transform: scale(1.2);">
                <b>Tiers-Temps</b>
            </label>
        `;
    }
    uniqueLabelsArray.forEach(lbl => {
        const safeValue = lbl.replace(/"/g, '&quot;');
        autresHtml += `
            <label style="background:#fff; padding:8px 12px; border:1px solid #bdc3c7; border-radius:6px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" class="chk-other-label" value="${safeValue}" checked style="transform: scale(1.2);">
                ${lbl}
            </label>
        `;
    });
    autresHtml += `</div>`;

    if (!hasTiersTemps && uniqueLabelsArray.length === 0) autresHtml = `<p style="color:#7f8c8d; font-style:italic;">Aucun aménagement supplémentaire détecté.</p>`;

    modal.innerHTML = `
        <div style="background:#8e44ad; color:white; padding:15px; text-align:center;">
            <h2 style="margin:0;">⚙️ Configuration des Coupons d'Aménagement</h2>
        </div>
        <div style="padding:20px 25px; overflow-y:auto; font-size: 0.95rem; flex: 1;">

            <h3 style="color:#2c3e50; border-bottom: 2px solid #8e44ad; padding-bottom: 5px; margin-top:0;">1. Aménagements avec cases dédiées</h3>
            <p style="color:#7f8c8d; margin-top:5px; font-size: 0.9rem;">Cochez les aménagements à imprimer. <br><b style="color:#e67e22;">✨ NOUVEAU :</b> Le système est intelligent. La <b>Dictée</b> n'apparaîtra que sur le coupon de Français, la <b>Cartographie</b> sur celui d'Histoire, et l'<b>Algorithmique</b> sur les Mathématiques.</p>

            <table style="width:100%; border-collapse: collapse; margin-top: 15px; background: #fafafa; border-radius: 8px; box-shadow: 0 0 0 1px #eee;">
                <tr style="background:#f1f2f6; border-bottom: 2px solid #ddd;">
                    <th style="padding:10px; text-align:center; width: 10%;">Imprimer</th>
                    <th style="padding:10px; text-align:left; width: 65%;">Description imprimée sur le Coupon</th>
                    <th style="padding:10px; text-align:center; width: 25%;">Mot-clé à détecter</th>
                </tr>
                ${tableRows}
            </table>

            <h3 style="color:#2c3e50; border-bottom: 2px solid #8e44ad; padding-bottom: 5px; margin-top:30px;">2. Aménagements autorisés pour la ligne "Autre(s)"</h3>
            <p style="color:#7f8c8d; margin-top:5px; font-size: 0.9rem;">Sélectionnez ci-dessous les labels qui ont le droit d'apparaître sur la ligne <b>Autre(s) : ...</b></p>

            <div style="background:#e8f8f5; padding: 15px; border-radius: 8px; border: 1px solid #1abc9c;">
                ${autresHtml}
            </div>

        </div>
        <div style="padding:15px; background:#f1f2f6; text-align:right; border-top:1px solid #ddd;">
            <button onclick="document.body.removeChild(document.getElementById('coupons-modal-overlay'))" style="padding:10px 20px; border:none; border-radius:6px; background:#95a5a6; color:white; font-weight:bold; cursor:pointer; margin-right: 10px;">Annuler</button>
            <button onclick="generateCouponsPDF()" style="padding:10px 20px; border:none; border-radius:6px; background:#8e44ad; color:white; font-weight:bold; cursor:pointer;">Lancer la génération PDF 🖨️</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
};

// =========================================================
// === MOTEUR DE GENERATION DES COUPONS PDF (INTELLIGENT) ===
// =========================================================

window.generateCouponsPDF = function() {
    // 1. Recuperation des amenagements avec ciblage specifique des epreuves
    const allAmensConfig = [
        { id: 'ordi', text: 'Copie rédigée sur ordinateur', targetExams: null },
        { id: 'dict', text: 'Dictée aménagée', targetExams: ['Français'] },
        { id: 'carto', text: "Dispense de l'exercice de tâche cartographique – épreuve Histoire-Géographie", targetExams: ['Histoire-Géographie / EMC'] },
        { id: 'algo', text: "Neutralisation de l'exercice d'algorithmique - épreuve de mathématiques", targetExams: ['Mathématiques'] },
        { id: 'ortho', text: "Non prise en compte de la qualité rédactionnelle dont l'orthographe", targetExams: null }
    ];

    const activeAmens = [];
    allAmensConfig.forEach(a => {
        const checkbox = document.getElementById(`chk-${a.id}`);
        if (checkbox && checkbox.checked) {
            const code = document.getElementById(`map-${a.id}`).value.toLowerCase().trim();
            activeAmens.push({ text: a.text, code: code, targetExams: a.targetExams });
        }
    });

    // 2. Recuperation des amenagements autorises pour la ligne "Autre"
    const allowedOthers = [];
    const ttCheck = document.getElementById('chk-other-tt');
    if (ttCheck && ttCheck.checked) allowedOthers.push("tiers-temps");

    const otherChecks = document.querySelectorAll('.chk-other-label');
    otherChecks.forEach(chk => {
        if (chk.checked) allowedOthers.push(chk.value.toLowerCase().trim());
    });

    document.body.removeChild(document.getElementById('coupons-modal-overlay'));

    // 3. Initialisation PDF
    if (!window.jspdf) return alert("Erreur jsPDF.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const year = DB.config.year || new Date().getFullYear();

    const targetStudents = DB.students.filter(s => s.tiersTemps || s.tt || (s.labels && s.labels.length > 0));
    const examsList = ['Français', 'Mathématiques', 'Histoire-Géographie / EMC', 'SVT', 'Physique-Chimie', 'Technologie'];
    let allCoupons = [];

    targetStudents.sort((a, b) => (a.anonymat || "").localeCompare(b.anonymat || ""));

    // 4. Construction des donnees eleve par eleve
    targetStudents.forEach(s => {
        let studentHasCode = {};
        let autresLabels = [];

        if (s.tiersTemps || s.tt) {
            if (allowedOthers.includes("tiers-temps")) autresLabels.push("Tiers-Temps");
        }

        if (s.labels) {
            s.labels.forEach(lbl => {
                const l = lbl.toLowerCase().trim();
                let isMapped = false;

                activeAmens.forEach(a => {
                    if (a.code && l.includes(a.code)) {
                        studentHasCode[a.code] = true;
                        isMapped = true;
                    }
                });

                if (!isMapped && allowedOthers.includes(l)) {
                    autresLabels.push(lbl);
                }
            });
        }

        const finalAutreText = autresLabels.join(", ");

        // Creation des tickets pour cet eleve avec FILTRAGE STRICT
        examsList.forEach(exam => {
            let currentCouponAmens = [];
            let hasAtLeastOneChecked = false;

            activeAmens.forEach(a => {
                if (!a.targetExams || a.targetExams.includes(exam)) {
                    let isChecked = !!studentHasCode[a.code];
                    if (isChecked) hasAtLeastOneChecked = true;

                    currentCouponAmens.push({
                        text: a.text,
                        isChecked: isChecked
                    });
                }
            });

            if (hasAtLeastOneChecked || finalAutreText !== "") {
                allCoupons.push({
                    anonymat: s.anonymat || "SANS CODE",
                    exam: exam,
                    amens: currentCouponAmens,
                    autreText: finalAutreText
                });
            }
        });
    });

    if (allCoupons.length === 0) {
        return alert("Aucun coupon à générer avec les critères actuels. Aucun élève n'a d'aménagement actif pour ces épreuves.");
    }

    // 5. Generation visuelle (4 coupons par page)
    const couponsPerPage = 4;
    const pageW = 210;
    const pageH = 297;
    const couponH = pageH / couponsPerPage;

    allCoupons.forEach((coupon, index) => {
        if (index > 0 && index % couponsPerPage === 0) doc.addPage();

        const startY = (index % couponsPerPage) * couponH;

        if (index % couponsPerPage > 0) {
            doc.setDrawColor(150); doc.setLineWidth(0.3); doc.setLineDash([3, 3], 0);
            doc.line(0, startY, pageW, startY);
            doc.setLineDash([]);
            doc.setFontSize(12); doc.setTextColor(150); doc.text("✂", 5, startY + 1.5);
        }

        if (typeof addSmartLogo === "function") addSmartLogo(doc, 15, startY + 5, 18);

        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(44, 62, 80);
        doc.text(`${getExamTitle()} - SESSION ${year}`, 105, startY + 10, { align: 'center' });
        doc.setFontSize(14); doc.setTextColor(41, 128, 185);
        doc.text("AMÉNAGEMENTS D'ÉPREUVES", 105, startY + 16, { align: 'center' });

        doc.setTextColor(0); doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text("N° d'anonymat :", 105, startY + 23, { align: 'center' });

        doc.setFontSize(18); doc.setFont("helvetica", "bold");
        doc.text(coupon.anonymat, 105, startY + 30, { align: 'center' });

        doc.setFontSize(12); doc.setTextColor(231, 76, 60);
        doc.text(`Épreuve : ${coupon.exam}`, 105, startY + 36, { align: 'center' });

        doc.setTextColor(0); doc.setFontSize(9); doc.setFont("helvetica", "normal");
        const checkX = 20;
        let checkY = startY + 44;

        const drawCheck = (texte, isChecked) => {
            doc.setDrawColor(0); doc.setLineWidth(0.3);
            doc.rect(checkX, checkY - 3, 4, 4);
            if (isChecked) {
                doc.setFont("helvetica", "bold");
                doc.text("X", checkX + 0.8, checkY + 0.5);
                doc.setFont("helvetica", "normal");
            }
            doc.text(texte, checkX + 8, checkY, { maxWidth: 170 });
            const lines = doc.splitTextToSize(texte, 170);
            checkY += (lines.length * 4) + 1.5;
        };

        coupon.amens.forEach(amen => {
            drawCheck(amen.text, amen.isChecked);
        });

        doc.rect(checkX, checkY - 3, 4, 4);
        doc.setFont("helvetica", "bold");
        doc.text(`Autre(s) :`, checkX + 8, checkY);

        doc.setFont("helvetica", "normal");
        if (coupon.autreText) {
            doc.text(coupon.autreText, checkX + 25, checkY, { maxWidth: 155 });
        } else {
            doc.setDrawColor(150); doc.setLineDash([1, 1], 0);
            doc.line(checkX + 25, checkY, 190, checkY);
            doc.setLineDash([]);
        }
    });

    doc.save(`Coupons_Amenagements_Anonymes_${year}.pdf`);
};

// =========================================================
// === IMPORTATION DES MOYENNES PAR CLASSE ===
// =========================================================

window.handleGlobalClassImport = function() {
    const input = document.getElementById('fileGlobalAnnual');
    if (!input.files[0]) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        processClassAverages(jsonData);
    };
    reader.readAsArrayBuffer(input.files[0]);
};

function processClassAverages(data) {
    DB.classStats = {};

    const subjectsMap = {
        fr: ['français', 'francais'],
        math: ['mathématiques', 'maths'],
        hg: ['histoire-géographie', 'hg', 'emc', 'moral'],
        svt: ['svt'],
        pc: ['physique-chimie', 'pc'],
        tech: ['technologie', 'techno']
    };

    const headers = Object.keys(data[0]);
    const kClasse = findKey(data[0], ['classe', 'division']);

    if (!kClasse) {
        return alert("Erreur : Impossible de trouver la colonne 'Classe' ou 'Division'.");
    }

    let classCount = 0;
    data.forEach(row => {
        const rawValue = row[kClasse];
        if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "" || String(rawValue).toLowerCase().includes("moyenne")) {
            return;
        }

        const className = String(rawValue).trim();
        DB.classStats[className] = {};

        for (const [subId, aliases] of Object.entries(subjectsMap)) {
            const colName = headers.find(h => aliases.some(a => h.toLowerCase().includes(a)));
            if (colName) {
                const val = cleanNumber(row[colName]);
                if (val !== null) DB.classStats[className][subId] = val;
            }
        }
        classCount++;
    });

    alert(`✅ Synchronisation terminée : ${classCount} classes enregistrées. Les anciennes données ont été supprimées.`);

    if(typeof renderAnalyseCorrections === 'function') {
        renderAnalyseCorrections();
    }
}

// ============================================================================
// GENERATION DU TABLEAU DE COMPARAISON GLOBAL (AVEC NOMS DES CORRECTEURS)
// ============================================================================

function getGlobalComparisonHtml() {
    if (!DB.classStats) return "<p>Veuillez importer les moyennes de classes.</p>";

    const classes = Object.keys(DB.classStats).sort();
    const subjs = { fr: 'Français', math: 'Maths', hg: 'HG/EMC', svt: 'SVT', pc: 'PC', tech: 'Techno' };

    let html = `<table id="tableComparatifNiveau" class='table table-bordered' style="border: 1px solid #ddd; background-color: #ffffff;">
        <thead>
            <tr>
                <th style="background-color: #f4f6f9; vertical-align: middle; border-bottom: 2px solid #ddd;">Classe</th>`;

    for(const name of Object.values(subjs)) {
        html += `<th colspan="2" style="text-align:center; border-left: 2px solid #ddd; border-bottom: 2px solid #ddd; background-color: #f4f6f9;">${name}</th>`;
    }

    html += `</tr><tr style="font-size:0.75rem; background-color: #f4f6f9;">
                <th style="border-bottom: 2px solid #ddd;"></th>`;
    for(let i=0; i<6; i++) {
        html += `<th style="border-left: 2px solid #ddd; border-bottom: 2px solid #ddd;">${getExamTitle()}</th>
                 <th style="border-bottom: 2px solid #ddd;">Année</th>`;
    }
    html += `</tr></thead><tbody>`;

    let globalStats = {};
    for (const subId in subjs) {
        globalStats[subId] = { sumDnb: 0, countDnb: 0, sumAnnuel: 0, countAnnuel: 0 };
    }

    classes.forEach(cls => {
        html += `<tr><td style="border-right: 2px solid #ddd; vertical-align: middle;"><b>${cls}</b></td>`;

        for(const [subId, label] of Object.entries(subjs)) {
            const students = DB.students.filter(s => s.classe === cls && s.grades && s.grades[subId] != null);
            let avgDNB = "-";
            if (students.length > 0) {
                const sum = students.reduce((a,b) => a + b.grades[subId], 0);
                avgDNB = (sum / students.length).toFixed(1);
                globalStats[subId].sumDnb += sum;
                globalStats[subId].countDnb += students.length;
            }

            const avgAnnuelStr = DB.classStats[cls][subId];
            const avgAnnuel = avgAnnuelStr ? parseFloat(avgAnnuelStr) : "-";
            if (avgAnnuel !== "-") {
                globalStats[subId].sumAnnuel += avgAnnuel;
                globalStats[subId].countAnnuel++;
            }

            let bgColor = "";
            let textColor = "";

            if(avgDNB !== "-" && avgAnnuel !== "-") {
                const diff = parseFloat(avgDNB) - avgAnnuel;
                if (diff <= -0.5) {
                    bgColor = "background-color: #f8d7da;";
                    textColor = "color: #721c24; font-weight: bold;";
                } else if (diff >= 0.5) {
                    bgColor = "background-color: #d4edda;";
                    textColor = "color: #155724; font-weight: bold;";
                }
            }

            let correctorHtml = "";
            if (DB.corrections && DB.corrections.settings && DB.corrections.settings[subId]) {
                const config = DB.corrections.settings[subId];
                if (config.mode === 'one_to_one' && config.manualMap) {
                    const profId = config.manualMap[cls];
                    if (profId) {
                        const teacher = DB.teachers ? DB.teachers.find(t => String(t.id) === String(profId)) : null;
                        if (teacher) {
                            const civ = teacher.civ || "";
                            const nom = teacher.nom || "";
                            correctorHtml = `<br><span style="font-size: 0.65rem; color: #7f8c8d; font-weight: normal;">${civ} ${nom}</span>`;
                        }
                    }
                }
            }

            html += `<td style="border-left: 2px solid #ddd; text-align: center; vertical-align: middle; ${bgColor} ${textColor}">
                        ${avgDNB}
                        ${correctorHtml}
                     </td>
                     <td style="color:#666; text-align: center; vertical-align: middle;">
                        ${avgAnnuel !== "-" ? avgAnnuel.toFixed(1) : "-"}
                     </td>`;
        }
        html += `</tr>`;
    });

    html += `</tbody>
             <tfoot style="background-color: #f8f9fa; border-top: 2px solid #ddd;">
                <tr>
                    <td style="font-weight: bold; font-size: 0.95rem; border-right: 2px solid #ddd; vertical-align: middle;">Cohorte</td>`;

    for(const subId of Object.keys(subjs)) {
        const stats = globalStats[subId];
        const gDnb = stats.countDnb > 0 ? (stats.sumDnb / stats.countDnb).toFixed(1) : "-";
        const gAnnuel = stats.countAnnuel > 0 ? (stats.sumAnnuel / stats.countAnnuel).toFixed(1) : "-";

        let bgColor = "";
        let textColor = "";
        if (gDnb !== "-" && gAnnuel !== "-") {
            const diff = parseFloat(gDnb) - parseFloat(gAnnuel);
            if (diff <= -0.5) {
                bgColor = "background-color: #f8d7da;";
                textColor = "color: #721c24; font-weight: bold;";
            } else if (diff >= 0.5) {
                bgColor = "background-color: #d4edda;";
                textColor = "color: #155724; font-weight: bold;";
            }
        }

        html += `<td style="border-left: 2px solid #ddd; font-weight:bold; text-align: center; vertical-align: middle; ${bgColor} ${textColor}">${gDnb}</td>
                 <td style="font-weight:bold; color:#2c3e50; text-align: center; vertical-align: middle;">${gAnnuel}</td>`;
    }

    html += `</tr></tfoot></table>`;
    return html;
}

function getComparisonTableHtml(subj) {
    const students = DB.students.filter(s => s.grades && s.grades[subj]);
    if (students.length === 0) return "<p>Aucune donnée de comparaison disponible.</p>";

    let html = `<table class='table'><thead><tr>
                <th>Élève</th><th>Classe</th><th>${getExamTitle()}</th><th>Moy. Annuelle</th><th>Écart</th>
                </tr></thead><tbody>`;

    students.forEach(s => {
        const dnb = s.grades[subj] || 0;
        const annuel = (s.annualGrades && s.annualGrades[subj]) ? s.annualGrades[subj] : null;
        const ecart = annuel !== null ? (dnb - annuel).toFixed(1) : "-";
        const color = ecart > 2 ? 'text-danger' : (ecart < -2 ? 'text-primary' : 'text-success');

        html += `<tr>
            <td>${s.nom} ${s.prenom}</td>
            <td>${s.classe}</td>
            <td><b>${dnb}</b></td>
            <td>${annuel || '-'}</td>
            <td class="${color}"><b>${ecart}</b></td>
        </tr>`;
    });
    html += "</tbody></table>";
    return html;
}

// ============================================================================
// FONCTIONS D'EXPORTATION (EXCEL & PDF) - Tableau comparatif
// ============================================================================

window.exportTableToExcel = function(tableId, filename = 'Comparatif_DNB_Blanc.xls') {
    const table = document.getElementById(tableId);
    if (!table) {
        alert("Tableau introuvable pour l'export.");
        return;
    }

    const tableClone = table.cloneNode(true);
    const htmlCode = tableClone.outerHTML;

    const template = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <style> table, td, th { border: 1px solid #dddddd; } </style>
        </head>
        <body>${htmlCode}</body>
        </html>
    `;

    const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.exportTableToPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const year = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";

    doc.setFontSize(16).setTextColor(44, 62, 80).setFont("helvetica", "bold");
    doc.text(`Comparaison Bilan : ${getExamTitle()} vs Moyennes Annuelles`, 148, 15, { align: 'center' });

    doc.setFontSize(11).setTextColor(100).setFont("helvetica", "normal");
    doc.text(`${schoolName} - Session ${year}`, 148, 22, { align: 'center' });

    doc.autoTable({
        html: '#tableComparatifNiveau',
        startY: 30,
        theme: 'grid',
        useCss: true,
        styles: {
            font: 'helvetica',
            fontSize: 9,
            valign: 'middle',
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        headStyles: {
            fillColor: [244, 246, 249],
            textColor: [44, 62, 80],
            fontStyle: 'bold'
        },
        footStyles: {
            fillColor: [248, 249, 250],
            textColor: [44, 62, 80],
            fontStyle: 'bold'
        },
        didParseCell: function(data) {
            if (data.column.index === 0) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.halign = 'left';
            }
        }
    });

    doc.save(`Comparatif_DNB_Blanc_${year}.pdf`);
};

// =========================================================
// === REINITIALISATION DES LOTS ===
// =========================================================

function resetLots(subjectKey) {
    if (!subjectKey) return;

    const confirmMessage = `Êtes-vous sûr de vouloir effacer la répartition des lots pour la matière "${subjectKey.toUpperCase()}" ? \n\nLes correcteurs seront conservés, mais les listes d'élèves seront vidées.`;

    if (confirm(confirmMessage)) {
        try {
            DB.corrections.lots[subjectKey] = [];

            if (typeof saveDB === 'function') {
                saveDB();
            }

            renderLotsResult(subjectKey);

            console.log(`[Reset] Lots réinitialisés pour : ${subjectKey}`);
        } catch (error) {
            console.error("Erreur lors du reset des lots :", error);
            alert("Une erreur est survenue lors de la réinitialisation.");
        }
    }
}

// ============================================================================
// MODULE : REPARTITION MANUELLE ASSISTEE (DRAG & DROP)
// ============================================================================

let draggedAssistStudentId = null;

function initManualAssistedMode(subjectKey) {
    const config = DB.corrections.settings[subjectKey];
    if (!config || config.teachers.length === 0) return;

    if (!DB.corrections.lots[subjectKey] || DB.corrections.lots[subjectKey].length === 0) {
        DB.corrections.lots[subjectKey] = config.teachers.map(tc => {
            const tDb = DB.teachers.find(t => t.id === tc.id);
            return {
                id: tc.id,
                name: tDb ? `${tDb.nom} ${tDb.prenom}` : 'Inconnu',
                copies: []
            };
        });
    }

    populateAssistFilters();
    populateAssistGroupSelect(subjectKey);
    renderAssistedReservoir();
    renderAssistedDropzones(subjectKey);
}

function populateAssistFilters() {
    const select = document.getElementById('assistFilterLabel');
    select.innerHTML = '<option value="">-- Tous les élèves non attribués --</option>';
    if (DB.config && DB.config.labels) {
        DB.config.labels.forEach(lbl => {
            select.innerHTML += `<option value="${lbl.code}">${lbl.name} (${lbl.code})</option>`;
        });
    }
}

function populateAssistGroupSelect(subjectKey) {
    const select = document.getElementById('assistGroupAssignSelect');
    select.innerHTML = '<option value="">-- Choisir un correcteur --</option>';
    const lots = DB.corrections.lots[subjectKey] || [];
    lots.forEach(lot => {
        select.innerHTML += `<option value="${lot.id}">${lot.name}</option>`;
    });
}

function getUnassignedStudents(subjectKey) {
    const lots = DB.corrections.lots[subjectKey] || [];
    const assignedIds = new Set();
    lots.forEach(lot => lot.copies.forEach(copy => assignedIds.add(copy.id)));
    return DB.students.filter(s => s.anonymat && s.anonymat.trim() !== "" && !assignedIds.has(s.id));
}

function renderAssistedReservoir() {
    const subjectKey = document.getElementById('corrSubjectSelect').value;
    const filterLabel = document.getElementById('assistFilterLabel').value;
    const searchVal = document.getElementById('assistSearchInput').value.toLowerCase();
    const reservoir = document.getElementById('assistReservoirList');

    reservoir.innerHTML = '';
    let unassigned = getUnassignedStudents(subjectKey);

    if (filterLabel) unassigned = unassigned.filter(s => s.labels && s.labels.includes(filterLabel));
    if (searchVal) {
        unassigned = unassigned.filter(s =>
            s.nom.toLowerCase().includes(searchVal) || s.prenom.toLowerCase().includes(searchVal) || s.anonymat.toLowerCase().includes(searchVal)
        );
    }

    if (unassigned.length === 0) {
        reservoir.innerHTML = '<div style="padding:15px; color:#7f8c8d; text-align:center; font-style:italic;">Aucune copie restante pour ces critères.</div>';
        return;
    }

    unassigned.forEach(s => {
        const item = document.createElement('div');
        item.draggable = true;
        item.style.cssText = "background: white; border: 1px solid #ddd; border-left: 4px solid #2980b9; padding: 8px 10px; margin-bottom: 8px; border-radius: 4px; cursor: grab; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: 0.2s;";

        let badges = (s.labels || []).map(lbl => `<span style="background:#e67e22; color:white; padding:2px 5px; border-radius:10px; font-size:0.65rem; margin-left:3px;">${lbl}</span>`).join('');

        item.innerHTML = `
            <div style="font-size:0.9rem;">
                <strong>${s.nom}</strong> ${s.prenom}
                <div style="font-size:0.75rem; color:#7f8c8d;">Ano: ${s.anonymat} | Cl: ${s.classe}</div>
            </div>
            <div>${badges}</div>
        `;

        item.addEventListener('dragstart', (e) => {
            draggedAssistStudentId = s.id;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => item.style.opacity = '0.4', 0);
        });

        item.addEventListener('dragend', () => {
            item.style.opacity = '1';
            draggedAssistStudentId = null;
        });

        reservoir.appendChild(item);
    });
}

function renderAssistedDropzones(subjectKey) {
    const container = document.getElementById('assistDropzones');
    container.innerHTML = '';
    const lots = DB.corrections.lots[subjectKey] || [];

    lots.forEach((lot, index) => {
        const card = document.createElement('div');
        card.style.cssText = "background: white; border: 2px dashed #bdc3c7; border-radius: 8px; display: flex; flex-direction: column; height: 350px; transition: background 0.2s;";

        card.innerHTML = `
            <div style="background: #34495e; color: white; padding: 10px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between;">
                <strong>👨‍🏫 ${lot.name}</strong>
                <span class="badge" style="background:#2ecc71;">${lot.copies.length}</span>
            </div>
            <div class="dropzone-body" style="flex: 1; padding: 10px; overflow-y: auto; background: #fafafa;">
                ${lot.copies.map(c => `
                    <div style="background: #fff; border: 1px solid #eee; padding: 5px 8px; margin-bottom: 5px; font-size: 0.8rem; display: flex; justify-content: space-between; border-left: 3px solid #2ecc71; border-radius: 3px;">
                        <span>${c.nom} ${c.prenom} (${c.anonymat})</span>
                        <button onclick="removeCopyFromLot('${subjectKey}', ${index}, ${c.id})" style="background:none; border:none; color:#e74c3c; cursor:pointer;" title="Retirer">✖</button>
                    </div>
                `).join('')}
            </div>
        `;

        const dropzoneBody = card.querySelector('.dropzone-body');

        dropzoneBody.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.style.borderColor = '#27ae60';
            card.style.backgroundColor = '#e8f8f5';
        });

        dropzoneBody.addEventListener('dragleave', () => {
            card.style.borderColor = '#bdc3c7';
            card.style.backgroundColor = 'transparent';
        });

        dropzoneBody.addEventListener('drop', (e) => {
            e.preventDefault();
            card.style.borderColor = '#bdc3c7';
            card.style.backgroundColor = 'transparent';
            if (draggedAssistStudentId) {
                assignStudentToLot(subjectKey, draggedAssistStudentId, lot.id);
            }
        });

        container.appendChild(card);
    });
}

function assignStudentToLot(subjectKey, studentId, lotId) {
    const student = DB.students.find(s => s.id === studentId);
    const lot = DB.corrections.lots[subjectKey].find(l => l.id === lotId);
    if (!student || !lot) return;

    lot.copies.push(student);
    if (typeof saveDB === 'function') saveDB();

    renderAssistedReservoir();
    renderAssistedDropzones(subjectKey);
    renderLotsResult(subjectKey);
}

function removeCopyFromLot(subjectKey, lotIndex, studentId) {
    const lot = DB.corrections.lots[subjectKey][lotIndex];
    lot.copies = lot.copies.filter(c => c.id !== studentId);

    if (typeof saveDB === 'function') saveDB();
    renderAssistedReservoir();
    renderAssistedDropzones(subjectKey);
    renderLotsResult(subjectKey);
}

// Attribution Groupee
function assignFilteredGroup() {
    const subjectKey = document.getElementById('corrSubjectSelect').value;
    const targetLotIdRaw = document.getElementById('assistGroupAssignSelect').value;

    if (!targetLotIdRaw) return alert("Veuillez sélectionner un correcteur dans la liste déroulante.");

    const filterLabel = document.getElementById('assistFilterLabel').value;
    const searchVal = document.getElementById('assistSearchInput').value.toLowerCase();

    let unassigned = getUnassignedStudents(subjectKey);
    if (filterLabel) unassigned = unassigned.filter(s => s.labels && s.labels.includes(filterLabel));
    if (searchVal) unassigned = unassigned.filter(s => s.nom.toLowerCase().includes(searchVal) || s.prenom.toLowerCase().includes(searchVal));

    if (unassigned.length === 0) return alert("Le réservoir actuel est vide avec ces filtres.");

    const lotId = isNaN(targetLotIdRaw) ? targetLotIdRaw : parseFloat(targetLotIdRaw);
    const lot = DB.corrections.lots[subjectKey].find(l => l.id === lotId);
    if (!lot) return;

    unassigned.forEach(student => lot.copies.push(student));

    if (typeof saveDB === 'function') saveDB();
    renderAssistedReservoir();
    renderAssistedDropzones(subjectKey);
    renderLotsResult(subjectKey);

    showToast(`${unassigned.length} copies attribuées d'un coup à ${lot.name}.`);
}

// =========================================================
// === VISIBILITE MENU SECRETARIAT D'EXAMEN ===
// =========================================================

function updateSecretariatMenuVisibility(examType) {
    const blocSecretariat = document.getElementById('blocSecretariat');
    if (!blocSecretariat) return;

    if (examType === 'DNB') {
        blocSecretariat.style.display = 'block';
        blocSecretariat.setAttribute('aria-hidden', 'false');
    } else {
        blocSecretariat.style.display = 'none';
        blocSecretariat.setAttribute('aria-hidden', 'true');

        const sousMenu = document.getElementById('secretariatMenu');
        const btnPrincipal = document.getElementById('btnSecretariat');
        if (sousMenu) sousMenu.classList.remove('open');
        if (btnPrincipal) {
            btnPrincipal.classList.remove('active');
            btnPrincipal.setAttribute('aria-expanded', 'false');
        }
    }
}

// Surcharge (Override) douce de handleExamTypeChange
const originalHandleExamTypeChange = window.handleExamTypeChange;

window.handleExamTypeChange = function(value) {
    if (typeof originalHandleExamTypeChange === 'function') {
        originalHandleExamTypeChange(value);
    }
    updateSecretariatMenuVisibility(value);
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const selectElement = document.getElementById('examTypeSelect');
        const currentType = (typeof DB !== 'undefined' && DB.config && DB.config.examType)
                            ? DB.config.examType
                            : (selectElement ? selectElement.value : 'DNB Blanc');

        updateSecretariatMenuVisibility(currentType);
    }, 150);
});

// =========================================================
// === POCHETTES CLASSES (Initialisation + Toggle) ===
// =========================================================

function initPochettesClasses() {
    const container = document.getElementById('classesCheckboxContainer');
    if (!container) return;

    container.innerHTML = '';

    let classes = [];

    if (typeof DB !== 'undefined' && DB.students && DB.students.length > 0) {
        classes = [...new Set(DB.students.map(s => s.classe || s.Classe))];
        classes = classes.filter(Boolean).sort();
    }

    if (classes.length === 0) {
        classes = ['3A', '3B', '3C', '3D'];
    }

    classes.forEach(cls => {
        const label = document.createElement('label');
        label.className = 'pochette-checkbox-label';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'poch-chk class-chk';
        input.setAttribute('data-type', 'classe');
        input.value = cls;

        label.appendChild(input);
        label.appendChild(document.createTextNode(` Confirmations ${cls}`));

        container.appendChild(label);
    });
}

function toggleAllClasses(state) {
    document.querySelectorAll('.class-chk').forEach(chk => chk.checked = state);
}

// =========================================================
// === GENERATION PDF POCHETTES ORGANISATION (A3 Paysage) ===
// =========================================================

window.generatePochettesPDF = function() {
    const checkboxes = document.querySelectorAll('.poch-chk:checked');
    if (checkboxes.length === 0) {
        alert("Veuillez sélectionner au moins une pochette à générer.");
        return;
    }

    if (typeof window.jspdf === 'undefined') {
        alert("Erreur : La librairie jsPDF n'est pas chargée.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a3');

    const PAGE_W = 420;
    const PAGE_H = 297;
    const HALF_W = 210;

    const examType = (typeof DB !== 'undefined' && DB.config && DB.config.examType) ? DB.config.examType : "DNB";
    const examYear = (typeof DB !== 'undefined' && DB.config && DB.config.year) ? DB.config.year : new Date().getFullYear();
    const etabName = (typeof DB !== 'undefined' && DB.config && DB.config.schoolName) ? DB.config.schoolName : "Établissement";

    let count = 0;

    checkboxes.forEach(cb => {
        if (count > 0) doc.addPage("a3", "l");
        count++;

        const type = cb.getAttribute('data-type');
        const val = cb.value;

        // Ligne de pliure centrale (pointilles)
        doc.setDrawColor(200);
        doc.setLineDash([5, 5], 0);
        doc.line(HALF_W, 0, HALF_W, PAGE_H);
        doc.setLineDash([]);

        // PARTIE DROITE DE LA POCHETTE (COUVERTURE)
        const M = 20;
        const centerX = HALF_W + (HALF_W / 2);

        if (typeof addSmartLogo === 'function') {
            addSmartLogo(doc, HALF_W + M, 20, 40);
        } else {
            doc.setFontSize(16);
            doc.setTextColor(100);
            doc.text("Académie", HALF_W + M, 30);
        }

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(etabName, PAGE_W - M, 30, { align: 'right' });

        doc.setFontSize(45);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 62, 80);
        doc.text(`${examType} ${examYear}`, centerX, 100, { align: 'center' });

        let titreSecondaire = (type === 'classe') ? "Confirmations inscriptions" : val;
        doc.setFontSize(35);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text(titreSecondaire, centerX, 140, { align: 'center' });

        if (type === 'classe') {
            doc.setFontSize(80);
            doc.setFont("helvetica", "bold");

            const textW = doc.getTextWidth(val);
            const boxPadding = 30;
            const boxW = textW + boxPadding * 2;
            const boxH = 50;
            const boxX = centerX - (boxW / 2);
            const boxY = 180;

            doc.setDrawColor(0);
            doc.setLineWidth(2);
            doc.rect(boxX, boxY, boxW, boxH);

            doc.text(val, centerX, boxY + 38, { align: 'center' });
        }
    });

    doc.save(`Pochettes_Organisation_${examYear}.pdf`);
};

// =========================================================
// === AFFICHAGES SIGNALETIQUE (Toggle, Init, PDF) ===
// =========================================================

window.toggleAllAffichages = function(state) {
    document.querySelectorAll('.room-aff-chk').forEach(chk => chk.checked = state);
};

window.initAffichagesRooms = function() {
    const container = document.getElementById('roomsAffichageContainer');
    if (!container) return;

    container.innerHTML = '';
    let rooms = [];

    if (typeof DB !== 'undefined' && DB.rooms && DB.rooms.length > 0) {
        rooms = DB.rooms.map(r => {
            if (typeof r === 'string') return r;
            if (typeof r === 'object') return r.name || r.nom || r.salle || r.roomName || r.title || "";
            return "";
        });
        rooms = [...new Set(rooms)].filter(val => val !== "").sort((a, b) => {
            return a.toString().localeCompare(b.toString(), undefined, {numeric: true, sensitivity: 'base'});
        });
    }

    if (rooms.length === 0) {
        container.innerHTML = '<p style="color: red; font-size: 0.9rem;">Aucune salle trouvée.</p>';
        return;
    }

    rooms.forEach(room => {
        const label = document.createElement('label');
        label.className = 'pochette-checkbox-label';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'aff-chk room-aff-chk';
        input.setAttribute('data-type', 'room');
        input.value = room;

        label.appendChild(input);
        label.appendChild(document.createTextNode(` ${room}`));

        container.appendChild(label);
    });
};

window.generateAffichagesPDF = function() {
    const checkboxes = document.querySelectorAll('.aff-chk:checked');
    if (checkboxes.length === 0) {
        alert("Veuillez sélectionner au moins un affichage à générer.");
        return;
    }

    if (typeof window.jspdf === 'undefined') {
        alert("Erreur : La librairie jsPDF n'est pas chargée.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const PAGE_W = 297;
    const PAGE_H = 210;
    const CENTER_X = PAGE_W / 2;
    const CENTER_Y = PAGE_H / 2;

    const examType = (typeof DB !== 'undefined' && DB.config && DB.config.examType) ? DB.config.examType : "DNB";
    const examYear = (typeof DB !== 'undefined' && DB.config && DB.config.examYear) ? DB.config.examYear : new Date().getFullYear();

    let schoolName = "Établissement";
    if (typeof DB !== 'undefined' && DB.config) {
        const possibleKeys = ['nomEtablissement', 'nomEtab', 'etablissement', 'etabName', 'schoolName', 'college', 'nomCollege'];
        for (const key of possibleKeys) {
            if (DB.config[key]) {
                schoolName = DB.config[key];
                break;
            }
        }
    }
    const schoolCity = (typeof DB !== 'undefined' && DB.config && DB.config.city) ? DB.config.city : "";
    const chkPrefix = document.getElementById('chkPrefixSalle');
    const useRoomPrefix = chkPrefix ? chkPrefix.checked : true;

    let count = 0;

    checkboxes.forEach(cb => {
        if (count > 0) doc.addPage("a4", "l");
        count++;

        const type = cb.getAttribute('data-type');
        const val = cb.value;

        if (typeof addSmartLogo === 'function') {
            addSmartLogo(doc, 15, 10, 50);
        }

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(schoolName, PAGE_W - 15, 20, { align: 'right' });

        if (schoolCity) {
            doc.setFontSize(14);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(80);
            doc.text(schoolCity, PAGE_W - 15, 28, { align: 'right' });
        }

        doc.setFontSize(40);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60);
        doc.text(`${examType} SESSION ${examYear}`, CENTER_X, PAGE_H - 18, { align: 'center' });

        doc.setTextColor(0);

        if (type === 'room' || type === 'sign') {
            doc.setFontSize(95);
            doc.setFont("helvetica", "bold");

            let printText = val;
            if (type === 'room' && useRoomPrefix) {
                if (!val.toLowerCase().startsWith('salle')) {
                    printText = `Salle ${val}`;
                }
            }

            if (printText.length > 12) doc.setFontSize(70);
            if (printText.length > 20) doc.setFontSize(55);
            doc.text(printText, CENTER_X, CENTER_Y - 5, { align: 'center', baseline: 'middle' });

        } else if (type === 'custom') {
            const line1 = document.getElementById('inputSilenceText1').value;
            const line2 = document.getElementById('inputSilenceText2').value;

            doc.setFontSize(75);
            doc.setFont("helvetica", "bold");
            doc.text(line1, CENTER_X, CENTER_Y - 25, { align: 'center', baseline: 'middle' });

            doc.setFontSize(42);
            doc.setFont("helvetica", "normal");
            const lines2 = doc.splitTextToSize(line2, PAGE_W - 40);
            doc.text(lines2, CENTER_X, CENTER_Y + 18, { align: 'center', baseline: 'middle' });

        } else if (type === 'arrow-right' || type === 'arrow-left') {
            doc.setFillColor(0);
            const tailW = 120;
            const tailH = 40;
            const headW = 60;
            const headH = 100;
            const offsetY = CENTER_Y - 10;

            if (type === 'arrow-right') {
                doc.rect(CENTER_X - 80, offsetY - (tailH/2), tailW, tailH, 'F');
                const headX = CENTER_X - 80 + tailW;
                doc.triangle(headX, offsetY - (headH/2), headX, offsetY + (headH/2), headX + headW, offsetY, 'F');
            } else {
                const startX = CENTER_X + 80;
                doc.rect(startX - tailW, offsetY - (tailH/2), tailW, tailH, 'F');
                const headX = startX - tailW;
                doc.triangle(headX, offsetY - (headH/2), headX, offsetY + (headH/2), headX - headW, offsetY, 'F');
            }
        }
    });

    doc.save(`Affichages_Signaletique_${examYear}.pdf`);
};

// =========================================================
// === POCHETTES MATIERES (Toggle + PDF A3) ===
// =========================================================

window.toggleAllMatieres = function(state) {
    document.querySelectorAll('.mat-chk').forEach(chk => chk.checked = state);
};

window.generatePochettesMatieresPDF = function() {
    const checkboxes = document.querySelectorAll('.mat-chk:checked');
    if (checkboxes.length === 0) {
        alert("Veuillez sélectionner au moins une matière à générer.");
        return;
    }

    if (typeof window.jspdf === 'undefined') {
        alert("Erreur : La librairie jsPDF n'est pas chargée.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a3');

    const PAGE_W = 420;
    const PAGE_H = 297;
    const HALF_W = 210;

    const examType = (typeof DB !== 'undefined' && DB.config && DB.config.examType) ? DB.config.examType : "DNB";
    const examYear = (typeof DB !== 'undefined' && DB.config && DB.config.examYear) ? DB.config.examYear : new Date().getFullYear();

    let schoolName = "Établissement";
    if (typeof DB !== 'undefined' && DB.config) {
        const possibleKeys = ['nomEtablissement', 'nomEtab', 'etablissement', 'etabName', 'schoolName', 'college', 'nomCollege'];
        for (const key of possibleKeys) {
            if (DB.config[key]) {
                schoolName = DB.config[key];
                break;
            }
        }
    }
    if (schoolName === "Établissement") {
        const etabInput = document.getElementById('etabName') || document.getElementById('nomEtab') || document.getElementById('etablissement') || document.getElementById('schoolName');
        if (etabInput && etabInput.value) schoolName = etabInput.value;
    }

    let count = 0;

    checkboxes.forEach(cb => {
        if (count > 0) doc.addPage("a3", "l");
        count++;

        const matiereTitle = cb.value;

        doc.setDrawColor(200);
        doc.setLineDash([5, 5], 0);
        doc.line(HALF_W, 0, HALF_W, PAGE_H);
        doc.setLineDash([]);

        const M = 20;
        const centerX = HALF_W + (HALF_W / 2);

        if (typeof addSmartLogo === 'function') {
            addSmartLogo(doc, HALF_W + M, 15, 50);
        }

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(schoolName, PAGE_W - M, 25, { align: 'right' });

        doc.setFontSize(45);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 62, 80);
        doc.text(`${examType} SESSION ${examYear}`, centerX, 100, { align: 'center' });

        doc.setFontSize(30);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("Copies d'examen", centerX, 135, { align: 'center' });

        // CADRE DE LA MATIERE (Centrage absolu)
        doc.setFontSize(40);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);

        const maxTextWidth = 150;
        const lines = doc.splitTextToSize(matiereTitle, maxTextWidth);

        let actualMaxWidth = 0;
        lines.forEach(line => {
            const w = doc.getTextWidth(line);
            if (w > actualMaxWidth) actualMaxWidth = w;
        });

        const boxPaddingX = 35;
        const boxW = actualMaxWidth + boxPaddingX;

        const lineHeight = 16;
        const boxPaddingY = 30;
        const boxH = boxPaddingY + (lines.length * lineHeight);

        const boxX = centerX - (boxW / 2);
        const boxY = 160;

        doc.setDrawColor(0);
        doc.setLineWidth(2);
        doc.rect(boxX, boxY, boxW, boxH);

        const totalTextHeight = (lines.length - 1) * lineHeight;
        const startY = boxY + (boxH / 2) - (totalTextHeight / 2);

        lines.forEach((line, index) => {
            const yPos = startY + (index * lineHeight);
            doc.text(line, centerX, yPos, { align: 'center', baseline: 'middle' });
        });
    });

    doc.save(`Pochettes_Matieres_${examYear}.pdf`);
};

// =========================================================
// === LECTURE EXCEL LOTS RECTORAT + GENERATION PDF ===
// =========================================================

window.processLotsExcelAndGeneratePDF = function() {
    const rneInput = document.getElementById('inputRneCe').value.trim().toUpperCase();
    const fileInput = document.getElementById('excelLotsInput');
    const feedback = document.getElementById('lotsFeedback');

    if (!rneInput) return alert("Veuillez saisir le RNE de votre établissement (ex: 0333530H).");
    if (!fileInput.files || fileInput.files.length === 0) return alert("Veuillez sélectionner le fichier Excel (.xlsx).");
    if (typeof XLSX === 'undefined') return alert("Erreur : La librairie SheetJS n'est pas chargée.");

    feedback.innerHTML = "<span style='color: blue;'>Lecture du fichier Excel en cours...</span>";

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});

            let headerIndex = -1;
            let headers = [];

            for (let i = 0; i < Math.min(20, rows.length); i++) {
                const rowStr = rows[i].join(" ");
                if (rowStr.includes("RNE CE") || rowStr.includes("Numéro lot")) {
                    headerIndex = i;
                    headers = rows[i];
                    break;
                }
            }

            if (headerIndex === -1) {
                feedback.innerHTML = "<span style='color: red;'>Erreur : En-tête introuvable. Est-ce le bon fichier Excel d'anonymat ?</span>";
                return;
            }

            const findIndexPartial = (arr, searchStr) => arr.findIndex(h => typeof h === 'string' && h.includes(searchStr));

            const idxRneCE = findIndexPartial(headers, "RNE CE");
            const idxComCor = findIndexPartial(headers, "Com Cor");
            const idxLot = findIndexPartial(headers, "Numéro lot");
            const idxRang = findIndexPartial(headers, "rang");
            const idxEpreuve = findIndexPartial(headers, "Libellé épreuve");

            if (idxRneCE < 0 || idxComCor < 0 || idxLot < 0 || idxRang < 0 || idxEpreuve < 0) {
                feedback.innerHTML = "<span style='color: red;'>Erreur : Colonnes manquantes dans l'Excel.</span>";
                return;
            }

            const matieresData = {
                "FRANCAIS": { commissions: new Set(), sousLots: { "Dictée": new Set(), "Grammaire": new Set(), "Rédaction": new Set() }, lotSizes: {} },
                "MATHEMATIQUES": { commissions: new Set(), lots: new Set(), lotSizes: {} },
                "HISTOIRE GEOGRAPHIE EMC": { commissions: new Set(), lots: new Set(), lotSizes: {} },
                "SCIENCES": { commissions: new Set(), lots: new Set(), lotSizes: {} }
            };

            for (let i = headerIndex + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length <= Math.max(idxRneCE, idxEpreuve)) continue;

                const rowRne = String(row[idxRneCE]).trim().toUpperCase();
                if (rowRne !== rneInput) continue;

                const comCor = String(row[idxComCor]).trim();
                const lotNum = String(row[idxLot]).trim();
                const rang = parseInt(String(row[idxRang]).trim(), 10);
                const epreuveBrut = String(row[idxEpreuve]).trim().toLowerCase();

                if (isNaN(rang)) continue;

                if (epreuveBrut.includes("dictée") || epreuveBrut.includes("grammaire") || epreuveBrut.includes("rédaction")) {
                    let sousMat = epreuveBrut.includes("dictée") ? "Dictée" : (epreuveBrut.includes("grammaire") ? "Grammaire" : "Rédaction");
                    matieresData["FRANCAIS"].commissions.add(comCor);
                    matieresData["FRANCAIS"].sousLots[sousMat].add(lotNum);
                    if (!matieresData["FRANCAIS"].lotSizes[lotNum] || rang > matieresData["FRANCAIS"].lotSizes[lotNum]) {
                        matieresData["FRANCAIS"].lotSizes[lotNum] = rang;
                    }
                }
                else if (epreuveBrut.includes("math")) {
                    matieresData["MATHEMATIQUES"].commissions.add(comCor);
                    matieresData["MATHEMATIQUES"].lots.add(lotNum);
                    if (!matieresData["MATHEMATIQUES"].lotSizes[lotNum] || rang > matieresData["MATHEMATIQUES"].lotSizes[lotNum]) {
                        matieresData["MATHEMATIQUES"].lotSizes[lotNum] = rang;
                    }
                }
                else if (epreuveBrut.includes("histoire") || epreuveBrut.includes("géo") || epreuveBrut.includes("emc")) {
                    matieresData["HISTOIRE GEOGRAPHIE EMC"].commissions.add(comCor);
                    matieresData["HISTOIRE GEOGRAPHIE EMC"].lots.add(lotNum);
                    if (!matieresData["HISTOIRE GEOGRAPHIE EMC"].lotSizes[lotNum] || rang > matieresData["HISTOIRE GEOGRAPHIE EMC"].lotSizes[lotNum]) {
                        matieresData["HISTOIRE GEOGRAPHIE EMC"].lotSizes[lotNum] = rang;
                    }
                }
                else if (epreuveBrut.includes("science") || epreuveBrut.includes("svt") || epreuveBrut.includes("physique") || epreuveBrut.includes("technologie")) {
                    matieresData["SCIENCES"].commissions.add(comCor);
                    matieresData["SCIENCES"].lots.add(lotNum);
                    if (!matieresData["SCIENCES"].lotSizes[lotNum] || rang > matieresData["SCIENCES"].lotSizes[lotNum]) {
                        matieresData["SCIENCES"].lotSizes[lotNum] = rang;
                    }
                }
            }

            feedback.innerHTML = "<span style='color: green;'>Fichier analysé avec succès. Génération du PDF...</span>";
            generateBordereauxPDF(matieresData, rneInput);
            setTimeout(() => { feedback.innerHTML = ""; }, 4000);

        } catch (err) {
            console.error(err);
            feedback.innerHTML = "<span style='color: red;'>Erreur de lecture. Le fichier Excel est peut-être corrompu ou illisible.</span>";
        }
    };

    reader.readAsArrayBuffer(file);
};

// =========================================================
// === PDF A3 BORDEREAUX LOTS (avec sous-lots Francais) ===
// =========================================================

function generateBordereauxPDF(data, rne) {
    if (typeof window.jspdf === 'undefined') return alert("Erreur : jsPDF non chargé.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a3');

    const PAGE_W = 420;
    const PAGE_H = 297;
    const HALF_W = 210;
    const M = 20;
    const centerX = HALF_W + (HALF_W / 2);

    const examType = (typeof DB !== 'undefined' && DB.config && DB.config.examType) ? DB.config.examType : "DNB";
    const examYear = (typeof DB !== 'undefined' && DB.config && DB.config.examYear) ? DB.config.examYear : new Date().getFullYear();

    let schoolName = "Établissement non configuré";
    if (typeof DB !== 'undefined' && DB.config) {
        const possibleKeys = ['nomEtablissement', 'nomEtab', 'etablissement', 'etabName', 'schoolName', 'college', 'nomCollege'];
        for (const key of possibleKeys) {
            if (DB.config[key]) {
                schoolName = DB.config[key];
                break;
            }
        }
    }
    if (schoolName === "Établissement non configuré") {
        const etabInput = document.getElementById('etabName') || document.getElementById('nomEtab') || document.getElementById('etablissement') || document.getElementById('schoolName');
        if (etabInput && etabInput.value) schoolName = etabInput.value;
    }
    const schoolCity = (typeof DB !== 'undefined' && DB.config && DB.config.city) ? DB.config.city : "";

    let count = 0;

    const drawTemplate = (matiere) => {
        if (count > 0) doc.addPage("a3", "l");
        count++;

        doc.setDrawColor(200);
        doc.setLineDash([5, 5], 0);
        doc.line(HALF_W, 0, HALF_W, PAGE_H);
        doc.setLineDash([]);

        if (typeof addSmartLogo === 'function') {
            addSmartLogo(doc, HALF_W + M, 15, 40);
        }

        let currentHeaderY = 20;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(schoolName, PAGE_W - M, currentHeaderY, { align: 'right' });

        if (schoolCity) {
            currentHeaderY += 8;
            doc.setFontSize(14);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(80);
            doc.text(schoolCity, PAGE_W - M, currentHeaderY, { align: 'right' });
        }

        currentHeaderY += 8;
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(rne, PAGE_W - M, currentHeaderY, { align: 'right' });

        doc.setFontSize(32);
        doc.setTextColor(44, 62, 80);
        doc.text(`${examType} SESSION ${examYear}`, centerX, 70, { align: 'center' });

        doc.setFontSize(22);
        doc.setTextColor(100);
        doc.text("Bordereaux envoi au centre de correction", centerX, 85, { align: 'center' });

        doc.setTextColor(0);
        doc.setFontSize(26);
        doc.text(`Matière : ${matiere}`, HALF_W + M, 115);
    };

    // MATIERES CLASSIQUES
    ['MATHEMATIQUES', 'HISTOIRE GEOGRAPHIE EMC', 'SCIENCES'].forEach(mat => {
        if (data[mat].lots.size === 0) return;

        drawTemplate(mat);

        let currentY = 135;
        const lineSpacing = 8;

        const comms = Array.from(data[mat].commissions).join(' / ');
        const lots = Array.from(data[mat].lots).sort();

        let totalCopies = 0;
        let additionStr = [];
        lots.forEach(lot => {
            const size = data[mat].lotSizes[lot];
            additionStr.push(size);
            totalCopies += size;
        });

        doc.setFontSize(18);
        doc.setFont("helvetica", "normal");

        const commsStr = `Commission(s) : ${comms}`;
        const commsLines = doc.splitTextToSize(commsStr, 180);
        doc.text(commsLines, HALF_W + M, currentY);
        currentY += (commsLines.length * lineSpacing) + 5;

        const lotStr = `Numéro(s) de Lot : ${lots.join(' / ')}`;
        const lotLines = doc.splitTextToSize(lotStr, 180);
        doc.text(lotLines, HALF_W + M, currentY);
        currentY += (lotLines.length * lineSpacing) + 5;

        const copyStr = `Nombre de copies : ${additionStr.join(' + ')} = ${totalCopies}`;
        const copyLines = doc.splitTextToSize(copyStr, 180);
        doc.text(copyLines, HALF_W + M, currentY);
        currentY += (copyLines.length * lineSpacing) + 15;

        let yCheck = Math.max(currentY, 190);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("Éléments envoyés :", HALF_W + M, yCheck);

        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        const elements = ["Copies", "Feuilles d'émargement", "PV de séance", "Bandeaux d'anonymat"];
        elements.forEach((el, idx) => {
            doc.rect(HALF_W + M + 10, yCheck + 12 + (idx * 12) - 5, 6, 6);
            doc.text(el, HALF_W + M + 22, yCheck + 12 + (idx * 12));
        });
    });

    // LE FRANCAIS (Specificite 3 Sous-lots)
    if (data["FRANCAIS"].commissions.size > 0) {
        drawTemplate("FRANCAIS");

        let currentY = 135;
        const lineSpacing = 8;

        const comms = Array.from(data["FRANCAIS"].commissions).join(' / ');
        doc.setFontSize(18);
        doc.setFont("helvetica", "normal");

        const commsLines = doc.splitTextToSize(`Commission(s) : ${comms}`, 180);
        doc.text(commsLines, HALF_W + M, currentY);
        currentY += (commsLines.length * lineSpacing) + 5;

        doc.text("Numéro(s) de Lot :", HALF_W + M, currentY);
        currentY += lineSpacing;

        doc.setFontSize(14);
        let totalCopies = 0;
        let additionStr = [];

        ['Dictée', 'Grammaire', 'Rédaction'].forEach(sousMat => {
            const lots = Array.from(data["FRANCAIS"].sousLots[sousMat]).sort();
            if (lots.length > 0) {
                const sousLotStr = `${sousMat.toUpperCase()} : ${lots.join(' / ')}`;
                const sousLotLines = doc.splitTextToSize(sousLotStr, 140);

                doc.text(sousLotLines, HALF_W + M + 45, currentY);
                currentY += (sousLotLines.length * 7) + 2;

                if (sousMat === 'Dictée' || additionStr.length === 0) {
                    additionStr = []; totalCopies = 0;
                    lots.forEach(lot => {
                        const size = data["FRANCAIS"].lotSizes[lot];
                        additionStr.push(size);
                        totalCopies += size;
                    });
                }
            }
        });

        currentY += 5;
        doc.setFontSize(18);
        const copyStr = `Nombre de copies : ${additionStr.join(' + ')} = ${totalCopies}`;
        const copyLines = doc.splitTextToSize(copyStr, 180);
        doc.text(copyLines, HALF_W + M, currentY);
        currentY += (copyLines.length * lineSpacing) + 15;

        let yCheck = Math.max(currentY, 190);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("Éléments envoyés :", HALF_W + M, yCheck);

        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        const elements = ["Copies", "Feuilles d'émargement", "PV de séance", "Bandeaux d'anonymat"];
        elements.forEach((el, idx) => {
            doc.rect(HALF_W + M + 10, yCheck + 12 + (idx * 12) - 5, 6, 6);
            doc.text(el, HALF_W + M + 22, yCheck + 12 + (idx * 12));
        });
    }

    if (count === 0) return alert("Aucune donnée trouvée pour ce RNE dans le fichier Excel ! Vérifiez que le RNE est correct.");
    doc.save(`Bordereaux_Lots_${rne}_${examYear}.pdf`);
}

// ============================================================
// MOTEUR D'IMPORT DES BORDEREAUX ET GESTION DES CONFLITS
// ============================================================

window.pendingConflicts = [];
window.currentConflictIndex = 0;
window.directImportsCount = 0;

window.processImportBordereaux = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const subj = document.getElementById('importBordereauSubject').value;
    const feedback = document.getElementById('importBordereauxFeedback');
    feedback.innerHTML = '<span style="color: #2980b9;">⏳ Lecture et analyse des fichiers en cours...</span>';

    if (typeof XLSX === 'undefined') {
        feedback.innerHTML = '<span style="color: red;">❌ Erreur : SheetJS non chargé.</span>';
        return;
    }

    window.pendingConflicts = [];
    window.directImportsCount = 0;
    let errors = [];

    const subjectLabels = { 'hg': 'Histoire-Géographie', 'emc': 'EMC', 'fr': 'Français', 'math': 'Mathématiques', 'svt': 'SVT', 'pc': 'Physique-Chimie', 'tech': 'Technologie' };

    const queueNote = (student, subjectKey, newNote) => {
        const oldNote = student.grades ? student.grades[subjectKey] : undefined;

        if (oldNote !== undefined && Math.abs(oldNote - newNote) > 0.001) {
            window.pendingConflicts.push({
                student: student,
                subjectKey: subjectKey,
                subjectLabel: subjectLabels[subjectKey] || subjectKey,
                oldNote: oldNote,
                newNote: newNote
            });
        } else {
            if (!student.grades) student.grades = {};
            if (oldNote !== newNote) {
                student.grades[subjectKey] = newNote;
                window.directImportsCount++;
            }
        }
    };

    for (let i = 0; i < files.length; i++) {
        try {
            const data = await files[i].arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                let headerRowIdx = rows.findIndex(r => r && r.some(cell => String(cell).includes('Code Anonymat')));
                if (headerRowIdx === -1) return;

                const headers = rows[headerRowIdx];
                const idxAnon = headers.findIndex(h => String(h).includes('Code Anonymat'));
                const idxNoteGlobale = headers.findIndex(h => String(h).includes('Note Globale'));
                const idxNoteHG = headers.findIndex(h => String(h).includes('Note HG'));
                const idxNoteEMC = headers.findIndex(h => String(h).includes('Note EMC'));

                for (let r = headerRowIdx + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || !row[idxAnon]) continue;

                    const student = DB.students.find(s => s.anonymat === String(row[idxAnon]).trim());
                    if (student) {
                        if (subj === 'hg') {
                            let noteHG = parseFloat(String(row[idxNoteHG] || "").replace(',', '.'));
                            let noteEMC = parseFloat(String(row[idxNoteEMC] || "").replace(',', '.'));
                            if (!isNaN(noteHG)) queueNote(student, 'hg', noteHG);
                            if (!isNaN(noteEMC)) queueNote(student, 'emc', noteEMC);
                        } else {
                            let note = parseFloat(String(row[idxNoteGlobale] || "").replace(',', '.'));
                            if (!isNaN(note)) queueNote(student, subj, note);
                        }
                    }
                }
            });
        } catch (err) {
            errors.push(files[i].name);
        }
    }

    event.target.value = '';

    if (window.pendingConflicts.length > 0) {
        document.getElementById('conflictSummaryCount').innerText = window.pendingConflicts.length;
        document.getElementById('conflictSummaryModal').style.display = 'flex';
    } else {
        finishImportBordereaux(errors);
    }
};

window.resolveAllConflicts = function() {
    window.pendingConflicts.forEach(conflict => {
        conflict.student.grades[conflict.subjectKey] = conflict.newNote;
        window.directImportsCount++;
    });

    document.getElementById('conflictSummaryModal').style.display = 'none';
    finishImportBordereaux([]);
};

window.startManualConflictResolution = function() {
    document.getElementById('conflictSummaryModal').style.display = 'none';
    window.currentConflictIndex = 0;
    showConflictResolutionStep();
};

window.showConflictResolutionStep = function() {
    const conflict = window.pendingConflicts[window.currentConflictIndex];

    document.getElementById('conflictProgress').innerText = `${window.currentConflictIndex + 1} / ${window.pendingConflicts.length}`;
    document.getElementById('conflictAnonymat').innerText = conflict.student.anonymat;

    const nomComplet = `${conflict.student.nom || ''} ${conflict.student.prenom || ''}`.trim();
    const classe = conflict.student.classe || 'Non classé';
    document.getElementById('conflictStudentIdentity').innerText = `${nomComplet} (Classe : ${classe})`;

    document.getElementById('conflictSubjLabel').innerText = conflict.subjectLabel;
    document.getElementById('conflictOldNote').innerText = conflict.oldNote;
    document.getElementById('conflictNewNote').innerText = conflict.newNote;

    document.getElementById('conflictResolutionModal').style.display = 'flex';
};

window.resolveConflict = function(choice) {
    const conflict = window.pendingConflicts[window.currentConflictIndex];

    if (choice === 'overwrite') {
        conflict.student.grades[conflict.subjectKey] = conflict.newNote;
        window.directImportsCount++;
    }

    window.currentConflictIndex++;

    if (window.currentConflictIndex < window.pendingConflicts.length) {
        showConflictResolutionStep();
    } else {
        document.getElementById('conflictResolutionModal').style.display = 'none';
        finishImportBordereaux([]);
    }
};

window.finishImportBordereaux = function(errors = []) {
    if (typeof autoSave === 'function') autoSave();
    else if (typeof saveDB === 'function') saveDB();
    if (typeof renderGrades === 'function') renderGrades();

    const feedback = document.getElementById('importBordereauxFeedback');
    let msg = `<span style="color: #27ae60;">✅ Import réussi : ${window.directImportsCount} notes ajoutées/mises à jour.</span>`;

    if (errors.length > 0) {
        msg += `<br><span style="color: #e67e22;">⚠️ Erreur de lecture sur : ${errors.join(', ')}</span>`;
    }

    feedback.innerHTML = msg;
    setTimeout(() => { feedback.innerHTML = ''; }, 6000);
};

// Export global des notes en Excel
window.exportAllGradesExcel = function() {
    if (!DB.students || DB.students.length === 0) {
        showToast("Aucun élève à exporter.", "warning");
        return;
    }
    const activeSciences = DB.config.scienceSubjects || ['SVT', 'PC', 'TECH'];
    const data = [["Nom", "Prénom", "Classe", "Français", "Mathématiques", "Hist-Géo", "SVT", "Phys-Chi", "Techno", "Moy. Sciences", "Moy. Examen"]];

    DB.students.forEach(s => {
        if (!s.grades) return;
        let sumSci = 0, countSci = 0;
        if (activeSciences.includes('SVT') && s.grades.svt != null) { sumSci += s.grades.svt; countSci++; }
        if (activeSciences.includes('PC') && s.grades.pc != null) { sumSci += s.grades.pc; countSci++; }
        if (activeSciences.includes('TECH') && s.grades.tech != null) { sumSci += s.grades.tech; countSci++; }
        const moySci = countSci > 0 ? (sumSci / countSci) : null;
        let sumGen = 0, countGen = 0;
        if (s.grades.fr != null) { sumGen += s.grades.fr; countGen++; }
        if (s.grades.math != null) { sumGen += s.grades.math; countGen++; }
        if (s.grades.hg != null) { sumGen += s.grades.hg; countGen++; }
        if (moySci !== null) { sumGen += moySci; countGen++; }
        const moyDNB = countGen > 0 ? (sumGen / countGen) : null;
        data.push([
            s.nom || "", s.prenom || "", s.classe || "",
            s.grades.fr ?? "", s.grades.math ?? "", s.grades.hg ?? "",
            s.grades.svt ?? "", s.grades.pc ?? "", s.grades.tech ?? "",
            moySci !== null ? moySci.toFixed(2) : "",
            moyDNB !== null ? moyDNB.toFixed(2) : ""
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notes");
    XLSX.writeFile(wb, "Export_Notes_Global.xlsx");
    showToast("Export Excel des notes généré !", "success");
};
