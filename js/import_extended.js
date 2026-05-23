// === MODULE: import_extended ===

// --- IMPORT : MAPPING ÉLÈVES ---
function prepareStudentMapping(data) {
    const fields = [
        { key: 'nom', label: 'Nom de famille', keywords: ['nom', 'name', 'student'] },
        { key: 'prenom', label: 'Prénom', keywords: ['prénom', 'prenom', 'firstname'] },
        { key: 'classe', label: 'Classe', keywords: ['classe', 'division', 'groupe'] },
        { key: 'sexe', label: 'Sexe (M/F)', keywords: ['sexe', 'genre', 'civilité'] },
        { key: 'mef', label: 'Code MEF / Niveau', keywords: ['mef', 'formation', 'niveau'] },
        { key: 'anonymat', label: 'Code Anonymat (Opt.)', keywords: ['ano', 'secret', 'mat'] }
    ];
    const row0 = data[0];
    const headers = Object.keys(row0);
    let mapping = {};
    fields.forEach(f => { mapping[f.key] = findKey(row0, f.keywords) || ""; });
    openMappingModal(headers, mapping, fields, data);
}

// --- IMPORT : MAPPING PROFESSEURS ---
function prepareTeacherMapping(data) {
    const fields = [
        { key: 'nom', label: 'Nom', keywords: ['nom', 'name'] },
        { key: 'prenom', label: 'Prénom', keywords: ['prénom', 'prenom'] },
        { key: 'civ', label: 'Civilité (M./Mme)', keywords: ['civ', 'genre'] },
        { key: 'matiere', label: 'Matière', keywords: ['matière', 'discipline', 'poste'] }
    ];
    const row0 = data[0];
    const headers = Object.keys(row0);
    let mapping = {};
    fields.forEach(f => { mapping[f.key] = findKey(row0, f.keywords) || ""; });
    openMappingModal(headers, mapping, fields, data);
}

// --- IMPORT : GESTION HG/EMC ---
window.setHGMode = function(isSplit) {
    DB.config.splitHGEMC = isSplit;
    document.getElementById('modalHGEMC').style.display = 'none';
    if (tempImportData) { finalizeGradesImport(tempImportData); }
};

window.closeHGModal = function() {
    document.getElementById('modalHGEMC').style.display = 'none';
    tempImportData = null;
};

// --- IMPORT : FINALISATION NOTES ---
function finalizeGradesImport(data) {
    if (!data || data.length === 0) return;
    const subjects = [
        { key: 'fr', label: 'Français', keywords: ['français', 'francais', 'fr'] },
        { key: 'math', label: 'Mathématiques', keywords: ['math', 'maths'] },
        { key: 'hg', label: 'Hist-Géo', keywords: ['hg', 'histoire', 'géo'] },
        { key: 'emc', label: 'EMC', keywords: ['emc', 'moral'] },
        { key: 'svt', label: 'SVT', keywords: ['svt', 'vie'] },
        { key: 'pc', label: 'Physique-Chimie', keywords: ['phys', 'pc', 'chimie'] },
        { key: 'tech', label: 'Technologie', keywords: ['tech', 'techno'] },
        { key: 'oral', label: 'Oral / Soutenance', keywords: ['oral', 'soutenance', 'stage'] }
    ];
    const row0 = data[0];
    const headers = Object.keys(row0);
    let mapping = {};
    subjects.forEach(s => { mapping[s.key] = findKey(row0, s.keywords) || ""; });
    openMappingModal(headers, mapping, subjects, data);
}

// --- IMPORT : MODE (FUSION/REMPLACEMENT) ---
function setImportMode(mode, element) {
    const input = document.getElementById('selectedImportMode');
    if(input) input.value = mode;
    const tiles = document.querySelectorAll('.import-tile');
    tiles.forEach(t => {
        t.style.border = '1px solid #ddd';
        t.classList.remove('active');
    });
    if (element) {
        element.style.border = '2px solid #3498db';
        element.classList.add('active');
    } else {
        if(tiles.length > 0) tiles[0].style.border = '2px solid #3498db';
    }
}

// --- IMPORT : MODAL MAPPING ---
function openMappingModal(headers, mapping, fields, data) {
    const modal = document.getElementById('mappingModal');
    const container = document.getElementById('mappingContainer');
    const titleEl = document.getElementById('importTitle');
    const descMergeEl = document.getElementById('descMerge');

    if (currentImportType === 'students') {
        titleEl.textContent = "📂 Importation des Élèves";
        descMergeEl.textContent = "Met à jour la classe/infos si l'élève existe déjà. Ajoute les nouveaux.";
    } else if (currentImportType === 'teachers') {
        titleEl.textContent = "🎓 Importation des Professeurs";
        descMergeEl.textContent = "Met à jour la matière/civilité si le prof existe déjà.";
    } else {
        titleEl.textContent = "📊 Importation des Notes";
        descMergeEl.textContent = "Ajoute/Modifie les notes des élèves existants sans toucher aux autres.";
    }

    let html = `<table style="width:100%; border-collapse: collapse;">
        <thead><tr style="border-bottom:2px solid #eee; text-align:left;">
            <th style="padding:8px; font-size:0.9em; color:#888;">Champ Logiciel</th>
            <th style="padding:8px; font-size:0.9em; color:#888;">Colonne Excel</th>
        </tr></thead><tbody>`;

    fields.forEach(f => {
        let options = `<option value="" style="color:#ccc;">(Ignorer)</option>`;
        headers.forEach(h => {
            const selected = (mapping[f.key] === h) ? 'selected' : '';
            const style = selected ? 'font-weight:bold; color:#2980b9;' : '';
            options += `<option value="${escapeHTML(h)}" ${selected} style="${style}">${escapeHTML(h)}</option>`;
        });
        html += `<tr style="border-bottom:1px solid #f5f5f5;">
            <td style="padding:10px 5px; font-weight:500;">${escapeHTML(f.label)}</td>
            <td style="padding:5px;"><select id="map_sel_${f.key}" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px;">${options}</select></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    html += `<div style="margin-top:20px; padding-top:10px; border-top:1px dashed #ddd;">
        <div style="font-size:0.8em; font-weight:bold; color:#666; margin-bottom:5px;">Aperçu (Ligne 1) :</div>
        <div style="overflow-x:auto; font-size:0.75em; background:#f9f9f9; padding:5px; border-radius:4px;">
            <code>${escapeHTML(Object.values(data[0]).join(' | ').substring(0, 100))}...</code>
        </div></div>`;

    container.innerHTML = html;
    setImportMode('merge', document.querySelector('.import-tile'));
    modal.style.display = 'flex';
}

// --- IMPORT : EXECUTION DU MAPPING ---
function processMapping() {
    const selects = document.querySelectorAll('[id^="map_sel_"]');
    let mapping = {};
    selects.forEach(sel => {
        const key = sel.id.replace('map_sel_', '');
        mapping[key] = sel.value;
    });
    const mode = document.getElementById('selectedImportMode').value;
    const isStrict = (mode === 'replace');
    document.getElementById('mappingModal').style.display = 'none';

    if (currentImportType === 'grades') {
        executeImport(tempImportData, mapping, isStrict);
    } else if (currentImportType === 'students') {
        executeStudentImport(tempImportData, mapping, isStrict);
    } else if (currentImportType === 'teachers') {
        executeTeacherImport(tempImportData, mapping, isStrict);
    }
}

// --- IMPORT : EXECUTION ÉLÈVES ---
function executeStudentImport(data, mapping, isStrictReplace) {
    let count = 0;
    if (isStrictReplace) {
        showConfirm("Attention : Le mode Remplacement va effacer tous les élèves existants. Continuer ?", () => {
            DB.students = [];
            executeStudentImport(data, mapping, false); // relance sans flag strict
        });
        return;
    }
    data.forEach(row => {
        const nom = mapping.nom ? row[mapping.nom] : null;
        if (nom) {
            const newS = {
                id: Date.now() + Math.random(),
                nom: String(nom).toUpperCase().trim(),
                prenom: mapping.prenom && row[mapping.prenom] ? String(row[mapping.prenom]).trim() : "",
                classe: mapping.classe && row[mapping.classe] ? String(row[mapping.classe]).trim() : "Non Classé",
                sexe: "M",
                mef: mapping.mef && row[mapping.mef] ? String(row[mapping.mef]).trim() : "",
                anonymat: mapping.anonymat && row[mapping.anonymat] ? String(row[mapping.anonymat]).trim() : "",
                tt: false,
                grades: {}
            };
            if (mapping.sexe && row[mapping.sexe]) {
                const val = String(row[mapping.sexe]).toLowerCase();
                if (val.includes('f') || val === '2' || val === 'mlle' || val === 'mme') newS.sexe = "F";
            }
            const existingIdx = DB.students.findIndex(s => s.nom === newS.nom && s.prenom === newS.prenom);
            if (existingIdx >= 0) {
                DB.students[existingIdx].classe = newS.classe;
                DB.students[existingIdx].mef = newS.mef;
                if(newS.anonymat) DB.students[existingIdx].anonymat = newS.anonymat;
            } else {
                DB.students.push(newS);
                count++;
            }
        }
    });
    renderStudents();
    showToast('✅ ' + count + ' nouveaux élèves ajoutés.', 'success');
}

// --- IMPORT : EXECUTION PROFESSEURS ---
function executeTeacherImport(data, mapping, isStrictReplace) {
    let count = 0;
    if (isStrictReplace) DB.teachers = [];
    data.forEach(row => {
        const nom = mapping.nom ? row[mapping.nom] : null;
        if(nom) {
            const newT = {
                id: Date.now() + Math.random(),
                nom: String(nom).toUpperCase().trim(),
                prenom: mapping.prenom && row[mapping.prenom] ? String(row[mapping.prenom]).trim() : "",
                civ: "M.",
                matiere: mapping.matiere && row[mapping.matiere] ? String(row[mapping.matiere]).trim() : "Divers",
                noHSE: false
            };
            if(mapping.civ && row[mapping.civ]) {
                const c = String(row[mapping.civ]).toLowerCase();
                if(c.includes('mme') || c.includes('f')) newT.civ = "Mme";
            }
            const existing = DB.teachers.find(t => t.nom === newT.nom);
            if(!existing) { DB.teachers.push(newT); count++; }
        }
    });
    renderTeachers();
    showToast('✅ ' + count + ' professeurs ajoutés.', 'success');
}

// --- IMPORT : EXECUTION NOTES ---
function executeImport(data, mapping, isStrictReplace) {
    let countSuccess = 0;
    let notFound = [];
    const kNom = findKey(data[0], ['nom', 'élève', 'eleve']);
    const kPrenom = findKey(data[0], ['prénom', 'prenom']);
    const kClasse = findKey(data[0], ['classe', 'division', 'groupe']);
    const kAno = findKey(data[0], ['anonymat', 'ano', 'code', 'numéro']);
    if(!kNom) { showToast("❌ Colonne NOM introuvable dans le fichier.", 'error'); return; }

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rawNom = row[kNom];
        const rawPrenom = kPrenom ? row[kPrenom] : null;
        const rawClasse = kClasse ? row[kClasse] : null;
        const rawAno = kAno ? row[kAno] : null;
        if (!rawNom) continue;

        const student = findStudentSecure(rawNom, rawPrenom, rawClasse, rawAno);
        if (student) {
            const resolve = (key) => {
                if (!mapping[key]) return student.grades?.[key] || null;
                const valExcel = row[mapping[key]];
                const valClean = cleanNumber(valExcel);
                return valClean !== null ? valClean : (isStrictReplace ? null : (student.grades?.[key] || null));
            };
            student.grades = {
                ...student.grades,
                fr: resolve('fr'), math: resolve('math'), hg: resolve('hg'),
                emc: resolve('emc'), svt: resolve('svt'), pc: resolve('pc'), tech: resolve('tech'),
                oral: resolve('oral')
            };
            countSuccess++;
        } else {
            notFound.push(`${rawNom} ${rawPrenom || ''}`.trim());
        }
    }

    if(typeof saveDB === 'function') saveDB();
    renderGrades();
    showImportReport(countSuccess, notFound);
}

// --- IMPORT : RAPPORT D'IMPORT ---
function showImportReport(successCount, notFoundList) {
    const modal = document.getElementById('importReportModal');
    const summary = document.getElementById('importReportSummary');
    const details = document.getElementById('importReportDetails');
    summary.innerHTML = `<span style="color: green;">✅ ${successCount} élève(s) mis à jour.</span>`;
    if (notFoundList.length > 0) {
        summary.innerHTML += `<br><span style="color: #c53030;">⚠️ ${notFoundList.length} élève(s) non trouvés dans la base.</span>`;
        details.innerHTML = "<strong>Liste des élèves ignorés :</strong><ul>" +
            notFoundList.map(name => `<li>${escapeHTML(name)}</li>`).join('') + "</ul>";
        details.style.display = "block";
    } else {
        details.innerHTML = "Tous les élèves du fichier ont été importés.";
        details.style.display = "none";
    }
    modal.style.display = 'flex';
}

// --- IMPORT : FINALISATION GÉNÉRAL (SALLES, ORAL, GENERAL) ---
function finalizeGeneralImport(data, type) {
    if (!data || data.length === 0) return;
    let report = { success: 0, errors: [] };
    const row0 = data[0];

    if (type === 'students') {
        const kNom = findKey(row0, ['nom']);
        const kPrenom = findKey(row0, ['prénom', 'prenom']);
        const kClasse = findKey(row0, ['classe', 'division']);
        const kSexe = findKey(row0, ['sexe', 'civilité', 'genre']);
        const kMef = findKey(row0, ['mef', 'module', 'formation', 'niveau']);
        const kAno = findKey(row0, ['anonymat', 'ano', 'code', 'numéro']);
        data.forEach((row) => {
            if (!row[kNom]) return;
            let sexe = (kSexe && row[kSexe] && row[kSexe].toString().toLowerCase().includes('f')) ? "F" : "M";
            const existing = DB.students.find(s => s.nom === row[kNom].toString().trim().toUpperCase() && s.prenom === (row[kPrenom] ? row[kPrenom].toString().trim() : ""));
            if (!existing) {
                DB.students.push({
                    id: Date.now() + Math.random(),
                    nom: row[kNom].toString().trim().toUpperCase(),
                    prenom: row[kPrenom] ? row[kPrenom].toString().trim() : "",
                    classe: row[kClasse] ? row[kClasse].toString().trim() : "Non Classé",
                    sexe: sexe,
                    mef: kMef ? row[kMef].toString().trim() : "",
                    anonymat: kAno ? row[kAno].toString().trim() : "",
                    tt: false, grades: {}
                });
                report.success++;
            }
        });
        renderStudents();
    } else if (type === 'teachers') {
        const kNom = findKey(row0, ['nom']);
        const kPrenom = findKey(row0, ['prénom', 'prenom']);
        const kCiv = findKey(row0, ['civilité', 'civ', 'civilite']);
        const kMat = findKey(row0, ['matière', 'discipline']);
        data.forEach((row) => {
            if (!row[kNom]) return;
            DB.teachers.push({
                id: Date.now() + Math.random(),
                civ: kCiv ? row[kCiv] : "M.",
                nom: row[kNom].toString().trim().toUpperCase(),
                prenom: kPrenom ? row[kPrenom].toString().trim() : "",
                matiere: kMat ? row[kMat].toString().trim() : "Divers",
                noHSE: false
            });
            report.success++;
        });
        renderTeachers();
    } else if (type === 'rooms') {
        const kNom = findKey(row0, ['nom', 'salle']);
        const kCap = findKey(row0, ['capacité', 'places']);
        data.forEach((row) => {
            if (!row[kNom]) return;
            DB.rooms.push({
                id: Date.now() + Math.random(),
                nom: row[kNom].toString().trim(),
                capacite: kCap ? parseInt(row[kCap]) : 20,
                isTT: false, isAmen: false
            });
            report.success++;
        });
        renderRooms();
    } else if (type === 'oral' || type === 'general') {
        const kNom = findKey(row0, ['nom', 'élève', 'eleve']);
        const kPrenom = findKey(row0, ['prénom', 'prenom']);
        const kClasse = findKey(row0, ['classe', 'division', 'groupe']);
        const kVal = type === 'oral'
            ? findKey(row0, ['note', 'oral', 'soutenance', 'dnb'])
            : findKey(row0, ['moyenne', 'générale', 'gen', 'socle', 'trimestre']);
        data.forEach((row) => {
            if (!row[kNom]) return;
            const student = findStudentSecure(row[kNom], kPrenom ? row[kPrenom] : null, kClasse ? row[kClasse] : null, null);
            if(student) {
                if(!student.grades) student.grades = {};
                let val = cleanNumber(row[kVal]);
                if (val !== null) {
                    if(type === 'oral') student.grades.oral = val;
                    else student.grades.genAvg = val;
                    report.success++;
                }
            }
        });
        if(typeof saveDB === 'function') saveDB();
        renderSimulation();
    }

    if(report.success > 0) showToast(`✅ Importation terminée : ${report.success} éléments ajoutés ou mis à jour.`, 'success');
}

// --- RECHERCHE SÉCURISÉE D'ÉLÈVE (anti-homonymes) ---
function findStudentSecure(rawNom, rawPrenom, rawClasse, rawAno) {
    if (!rawNom) return null;
    const nomClean = rawNom.toString().toUpperCase().trim();
    const prenomClean = rawPrenom ? rawPrenom.toString().toUpperCase().trim() : "";
    const classeClean = rawClasse ? rawClasse.toString().toUpperCase().trim() : "";
    const anoClean = rawAno ? rawAno.toString().toUpperCase().trim() : "";

    const matchingStudents = DB.students.filter(s => {
        const matchNom = s.nom.toUpperCase().trim() === nomClean;
        const matchPrenom = prenomClean ? (s.prenom.toUpperCase().trim() === prenomClean) : true;
        return matchNom && matchPrenom;
    });

    if (matchingStudents.length === 1) return matchingStudents[0];
    if (matchingStudents.length > 1) {
        const disambiguated = matchingStudents.find(s => {
            const matchAno = anoClean && s.anonymat ? s.anonymat.toUpperCase().trim() === anoClean : false;
            const matchClasse = classeClean && s.classe ? s.classe.toUpperCase().trim() === classeClean : false;
            return matchAno || matchClasse;
        });
        return disambiguated || null;
    }
    return null;
}
