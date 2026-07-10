// === MODULE: planning_distribution ===
// --- 1. CONFIGURATION : MODALE DE DÉCOUPAGE ---

// Ouvre la modale pour l'examen donné
function openSlotConfig(examIdx) {
    const exam = DB.exams[examIdx];
    document.getElementById('slotExamIndex').value = examIdx;
    document.getElementById('slotModalTitle').innerText = `${exam.name} (${exam.date})`;
    document.getElementById('reqDurStd').innerText = exam.durStd;
    document.getElementById('reqDurTT').innerText = exam.durTT;

    // Initialisation des données si inexistantes
    if (!exam.slots) exam.slots = { std: [], tt: [] };

    // Si vide, on pré-remplit avec 1 seul créneau couvrant toute la durée (aide à la saisie)
    if (exam.slots.std.length === 0) {
        let endStd = addMinutesObj(exam.time, exam.durStd); // Fonction helper locale
        exam.slots.std.push({ start: exam.time, end: endStd });
    }
    if (exam.slots.tt.length === 0) {
        let startTT = exam.timeTT || exam.time;
        let endTT = addMinutesObj(startTT, exam.durTT);
        exam.slots.tt.push({ start: startTT, end: endTT });
    }

    renderSlotRows('std', exam.slots.std);
    renderSlotRows('tt', exam.slots.tt);

    checkSlotValidity(); // Vérifie la cohérence immédiate
    document.getElementById('slotModal').style.display = 'flex';
}

// Affiche les lignes de saisie
function renderSlotRows(type, data) {
    const container = document.getElementById(type === 'std' ? 'slotsListStd' : 'slotsListTT');
    container.innerHTML = '';
    data.forEach((slot, idx) => {
        const div = document.createElement('div');
        div.className = 'slot-item';
        div.innerHTML = `
            <span style="font-weight:bold; color:#777;">${idx + 1}.</span>
            <input type="time" value="${slot.start}" onchange="updateSlotData('${type}', ${idx}, 'start', this.value)">
            <span>à</span>
            <input type="time" value="${slot.end}" onchange="updateSlotData('${type}', ${idx}, 'end', this.value)">
            <button class="btn btn-danger btn-sm" style="padding:2px 6px; margin-left:auto;" onclick="removeSlotRow('${type}', ${idx})">x</button>
        `;
        container.appendChild(div);
    });
}

function addSlotRow(type) {
    const examIdx = document.getElementById('slotExamIndex').value;
    const list = DB.exams[examIdx].slots[type];
    // On ajoute un créneau vide par défaut qui suit le précédent si possible
    let lastEnd = list.length > 0 ? list[list.length - 1].end : (type === 'std' ? DB.exams[examIdx].time : (DB.exams[examIdx].timeTT || DB.exams[examIdx].time));
    list.push({ start: lastEnd, end: addMinutesObj(lastEnd, 60) }); // Ajoute 1h par défaut
    renderSlotRows(type, list);
    checkSlotValidity();
}

function removeSlotRow(type, idx) {
    const examIdx = document.getElementById('slotExamIndex').value;
    DB.exams[examIdx].slots[type].splice(idx, 1);
    renderSlotRows(type, DB.exams[examIdx].slots[type]);
    checkSlotValidity();
}

function updateSlotData(type, idx, key, val) {
    const examIdx = document.getElementById('slotExamIndex').value;
    DB.exams[examIdx].slots[type][idx][key] = val;
    checkSlotValidity();
}

// Vérification Mathématique (Durée totale)
function checkSlotValidity() {
    const examIdx = document.getElementById('slotExamIndex').value;
    const exam = DB.exams[examIdx];

    const verify = (type, targetDur, divId) => {
        let total = 0;
        exam.slots[type].forEach(s => {
            if (s.start && s.end) total += getMinutesDiff(s.start, s.end);
        });
        const div = document.getElementById(divId);
        if (total === targetDur) {
            div.innerHTML = `<span style="color:#27ae60">✅ Total: ${total} min (Parfait)</span>`;
            return true;
        } else {
            const diff = targetDur - total;
            div.innerHTML = `<span style="color:#e74c3c">⚠️ Total: ${total} min (Écart: ${diff} min)</span>`;
            return false;
        }
    };

    verify('std', exam.durStd, 'checkStdMsg');
    verify('tt', exam.durTT, 'checkTTMsg');
}

function saveExamSlots() {
    showConfirm("Valider ce découpage ?\n\nATTENTION : Si vous modifiez le nombre de créneaux, vous devrez refaire le planning de cette épreuve.", () => {
        document.getElementById('slotModal').style.display = 'none';
        renderExamTable();
        renderPlanning();
    });
}


// --- 2. SURCHARGE : TABLEAU DE CONFIGURATION ---
// On remplace la fonction existante pour ajouter le bouton "Découper"
// --- Mise à jour pour élargir les cases durées ---
window.renderExamTable = function () {
    const b = document.getElementById('examTable');
    b.innerHTML = '';
    DB.exams.forEach((e, i) => {
        // Vérifie si "découpé"
        const hasSlots = e.slots && (e.slots.std.length > 1 || e.slots.tt.length > 1);
        const btnStyle = hasSlots ? "background:#27ae60; color:white;" : "background:#95a5a6; color:white;";
        const btnText = hasSlots ? "✅ Découpé" : "✂️ Découper";

        b.innerHTML += `
        <tr>
            <td>${e.name}<br>
                <button class="btn btn-sm" style="${btnStyle}; font-size:0.75rem; padding:2px 6px; margin-top:3px;" onclick="openSlotConfig(${i})">${btnText}</button>
            </td>
            <td><input type="date" value="${e.date}" onchange="updateExam(${i},'date',this.value)"></td>
            <td><input type="time" value="${e.time}" onchange="updateExam(${i},'time',this.value)"></td>
            <td><input type="time" value="${e.timeTT || e.time}" style="background-color:#fef9e7;" onchange="updateExam(${i},'timeTT',this.value)"></td>

            <td><input type="number" value="${e.durStd}" style="width:90px; text-align:center" onchange="updateExam(${i},'durStd',this.value)"></td>
            <td style="color:var(--tt-color)"><input type="number" value="${e.durTT}" style="width:90px; text-align:center" onchange="updateExam(${i},'durTT',this.value)"></td>
        </tr>`;
    });
};



// --- 4. ALGORITHME DE DÉTECTION DE COLLISION ---

function checkTeacherCollision(teacherName, dateStr, startStr, endStr, myKey) {
    // Convertir heures en minutes pour comparaison facile
    const startMin = timeToMin(startStr);
    const endMin = timeToMin(endStr);
    const cleanTeacherName = normalizePlanningTeacherName(teacherName);

    // On parcourt TOUT le planning
    for (const [key, assignedTeacher] of Object.entries(DB.planning)) {
        if (normalizePlanningTeacherName(assignedTeacher) !== cleanTeacherName) continue; // Pas le même prof
        if (key === myKey) continue; // C'est moi-même

        const duty = getPlanningDuty(key);
        if (!duty) continue;

        // Règle 1 : Même jour ?
        if (duty.exam.date !== dateStr) continue;

        // Règle 2 : Chevauchement horaire ?
        const otherStart = timeToMin(duty.slot.start);
        const otherEnd = timeToMin(duty.slot.end);

        // Formule collision : Max(Starts) < Min(Ends)
        if (Math.max(startMin, otherStart) < Math.min(endMin, otherEnd)) {
            return duty.roomName; // Retourne le nom de la salle où il y a conflit
        }
    }
    return false; // Pas de conflit
}

// [Nettoyage 07/2026] `timeToMin` supprimée ici : doublon mort, la version active est dans js/stage_orals.js.
function getMinutesDiff(start, end) {
    return timeToMin(end) - timeToMin(start);
}
function addMinutesObj(time, mins) {
    const total = timeToMin(time) + parseInt(mins);
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}


// --- 5. SURCHARGE : EXPORT CONVOCATIONS PROFS (Mise à jour V4) ---

function getTeacherSurveillanceDuties(teacher) {
    const fullName = window.getTeacherPlanningName(teacher);
    const duties = [];

    for (const [key, assignedName] of Object.entries(DB.planning || {})) {
        if (normalizePlanningTeacherName(assignedName) !== fullName) continue;

        const duty = getPlanningDuty(key);
        if (!duty) continue;

        duties.push({
            date: duty.exam.date,
            start: duty.slot.start,
            end: duty.slot.end,
            name: duty.type === 'dict' ? `Dictée - ${duty.exam.name}` : duty.exam.name,
            room: duty.type === 'dict' ? `${duty.roomName} (renfort)` : duty.roomName,
            isTT: duty.type === 'tt'
        });
    }

    const reserves = ensurePlanningReserve();
    Object.entries(reserves).forEach(([key, assignedName]) => {
        if (normalizePlanningTeacherName(assignedName) !== fullName) return;

        const duty = getReserveDuty(key);
        if (!duty) return;

        duties.push({
            date: duty.exam.date,
            start: duty.slot.start,
            end: duty.slot.end,
            name: duty.exam.name,
            room: getReserveDisplayLabel(),
            isTT: false
        });
    });

    return duties.sort((a, b) => {
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.start.localeCompare(b.start);
    });
}

function getTeacherOralDuties(teacher) {
    if (!DB.stage || !DB.stage.juries || !DB.stage.config) return [];

    return DB.stage.juries
        .filter(j => j.members && j.members.some(memberId => String(memberId) === String(teacher.id)))
        .map(jury => {
            const room = DB.rooms.find(r => String(r.id) === String(jury.room) || r.nom === jury.room);
            return {
                date: DB.stage.config.date || '',
                start: DB.stage.config.start || '',
                end: DB.stage.config.end || '',
                room: room ? room.nom : "Salle ?",
                group: jury.name || "Jury oral"
            };
        })
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start || '').localeCompare(b.start || ''));
}

window.saveTeacherConvocInstructions = function () {
    const textarea = document.getElementById('txtConvocProfInstructions');
    if (!textarea) return;
    if (typeof setInstructionTemplate === 'function') {
        setInstructionTemplate('teachers', textarea.value);
        return;
    }
    if (!DB.config) DB.config = {};
    DB.config.teacherConvocInstructions = textarea.value;
    if (typeof autoSave === 'function') autoSave();
};

function loadTeacherConvocInstructions() {
    const textarea = document.getElementById('txtConvocProfInstructions');
    if (!textarea) return;
    textarea.value = typeof getInstructionTemplate === 'function'
        ? getInstructionTemplate('teachers')
        : ((DB.config && DB.config.teacherConvocInstructions) || '');
}

window.addEventListener('load', loadTeacherConvocInstructions);

window.exportConvocationTeachers = function (includeOrals = false) {
    DB.config.schoolName = document.getElementById('schoolName').value;
    DB.config.year = document.getElementById('sessionYear').value;
    const instructionsBox = document.getElementById('txtConvocProfInstructions');
    if (instructionsBox) {
        if (typeof setInstructionTemplate === 'function') setInstructionTemplate('teachers', instructionsBox.value);
        else DB.config.teacherConvocInstructions = instructionsBox.value;
    }
    if (!DB.config.director) DB.config.director = { civ: "M. le Principal", name: "" };
    cleanupPlanningAssignments();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let count = 0;

    DB.teachers.forEach(teacher => {
        const fullName = window.getTeacherPlanningName(teacher);
        const duties = getTeacherSurveillanceDuties(teacher);
        const oralDuties = includeOrals ? getTeacherOralDuties(teacher) : [];

        if (duties.length === 0 && oralDuties.length === 0) return;

        if (count > 0) doc.addPage();
        count++;

        if (typeof drawExamPdfHeader === 'function') {
            drawExamPdfHeader(doc, {
                title: includeOrals ? "CONVOCATION PROFESSEUR" : "CONVOCATION SURVEILLANCE",
                y: 8,
                logoSize: 34
            });
        } else {
            addSmartLogo(doc, 15, 10, 45);
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text("DNB", 195, 12, { align: 'right' });
            doc.text(`Session ${DB.config.year}`, 195, 17, { align: 'right' });
            doc.setFontSize(14); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
            doc.text(DB.config.schoolName || "Collège", 105, 18, { align: 'center' });
            doc.setFontSize(18); doc.setTextColor(0);
            doc.text(includeOrals ? "CONVOCATION PROFESSEUR" : "CONVOCATION SURVEILLANCE", 105, 40, { align: 'center' });
        }

        // Info Prof
        doc.setFillColor(248, 249, 250); doc.setDrawColor(44, 62, 80);
        doc.rect(15, 50, 180, 20, 'FD');
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text(`${teacher.civ || ""} ${fullName}`, 20, 62);

        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        let currentY = 85;

        if (duties.length > 0) {
            doc.text("Planning de vos créneaux de surveillance :", 15, currentY);

            const body = duties.map(d => {
                const dateObj = new Date(d.date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                return [
                    dateStr,
                    `${d.start} - ${d.end}`,
                    d.name + (d.isTT ? " (TT)" : ""),
                    d.room
                ];
            });

            doc.autoTable({
                head: [['Date', 'Créneau', 'Épreuve', 'Salle / mission']],
                body: body,
                startY: currentY + 5,
                theme: 'grid',
                headStyles: { fillColor: [44, 62, 80] },
                styles: { cellPadding: 3, valign: 'middle', fontSize: 10 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 35, fontStyle: 'bold' },
                    3: { cellWidth: 35, halign: 'center' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

        if (includeOrals && oralDuties.length > 0) {
            oralDuties.forEach(oral => {
                if (currentY + 30 > 270) { doc.addPage(); currentY = 20; }

                doc.setFillColor(142, 68, 173);
                doc.rect(15, currentY, 180, 24, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text("JURY ORAL", 20, currentY + 7);

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Date : ${oral.date}`, 20, currentY + 15);
                doc.text(`Heure : ${oral.start} - ${oral.end}`, 80, currentY + 15);
                doc.text(`Salle : ${oral.room}`, 140, currentY + 15);
                doc.text(`Groupe : ${oral.group}`, 20, currentY + 21);

                currentY += 30;
            });
        }

        const instructions = (typeof getInstructionTemplate === 'function'
            ? getInstructionTemplate('teachers')
            : (DB.config.teacherConvocInstructions || '')).trim();
        if (instructions) {
            if (currentY + 35 > 270) { doc.addPage(); currentY = 20; }
            doc.setFillColor(248, 249, 250);
            doc.setDrawColor(180, 180, 180);
            doc.rect(15, currentY, 180, 12, 'FD');
            doc.setTextColor(44, 62, 80);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Consignes", 20, currentY + 8);
            currentY += 17;

            doc.setTextColor(0);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(instructions, 175);
            const textHeight = lines.length * 5;
            if (currentY + textHeight > 270) { doc.addPage(); currentY = 20; }
            doc.text(lines, 15, currentY);
            currentY += textHeight + 8;
        }

        // Signature
        let finalY = currentY + 10;
        if (finalY > 250) { doc.addPage(); finalY = 40; }

        doc.setFontSize(11);
        doc.text(`Fait à ${DB.config.city || "SJI"}, le ${new Date().toLocaleDateString()}`, 140, finalY, { align: 'center' });
        doc.setFont("helvetica", "bold");
        doc.text(DB.config.director.civ || "Le Chef", 140, finalY + 5, { align: 'center' });
        doc.text(DB.config.director.name || "", 140, finalY + 10, { align: 'center' });

        if (DB.config.signature) {
            try {
                const imgProps = doc.getImageProperties(DB.config.signature);
                const ratio = imgProps.width / imgProps.height;
                doc.addImage(DB.config.signature, 'PNG', 120, finalY + 15, 20 * ratio, 20);
            } catch (e) { }
        }
    });

    if (count === 0) {
        showToast("Aucune convocation professeur à générer.", 'warning');
        return;
    }

    doc.save(includeOrals ? "Convocations_Profs_Oral_Et_Surveillances.pdf" : "Convocations_Profs_Surveillances.pdf");
};

window.exportConvocationTeachersSurveillanceOnly = function () {
    exportConvocationTeachers(false);
};

window.exportConvocationTeachersWithOrals = function () {
    exportConvocationTeachers(true);
};

window.exportTeachersReceiptSheet = function () {
    if (typeof window.jspdf === 'undefined') return alert("⚠️ Librairie PDF non chargée.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    if (typeof addSmartLogo === 'function') addSmartLogo(doc, 15, 10, 30);
    doc.setFontSize(14); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
    doc.text(DB.config.schoolName || "Collège", 105, 18, { align: 'center' });
    doc.setFontSize(16); doc.setTextColor(0);
    doc.text("Émargement - Remise des convocations", 105, 35, { align: 'center' });

    let tableData = [];
    DB.teachers.forEach(teacher => {
        const duties = getTeacherSurveillanceDuties(teacher);
        const oralDuties = getTeacherOralDuties(teacher);

        // N'inclure que les professeurs ayant au moins une convocation
        if (duties.length === 0 && oralDuties.length === 0) return;

        tableData.push([
            (teacher.nom || "").toUpperCase(),
            teacher.prenom || "",
            teacher.matiere || teacher.matieres || "",
            ""
        ]);
    });

    tableData.sort((a, b) => a[0].localeCompare(b[0]));

    if (tableData.length === 0) {
        return alert("Aucun professeur n'a de convocation actuellement (aucune surveillance et aucun oral attribué).");
    }

    doc.autoTable({
        head: [['Nom', 'Prénom', 'Matière', 'Signature pour réception']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { cellWidth: 50 }
        },
        styles: { minCellHeight: 12, valign: 'middle' }
    });

    doc.save("Emargement_Remise_Convocations_Profs.pdf");
};


// =========================================================
// === MODULE EDT & AUTO-AFFECTATION (NOUVEAU) ===
// =========================================================

// Nouvelle gestion des imports EDT
const _originalHandleFileSelect = handleFileSelect;
handleFileSelect = function (type) {
    // On détecte nos deux nouveaux types
    if (type === 'edt_cancelled' || type === 'edt_maintained') {
        const inputId = (type === 'edt_cancelled') ? 'fileEDT_Cancelled' : 'fileEDT_Maintained';
        const input = document.getElementById(inputId);

        if (!input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
            // On passe le sous-type à la fonction de traitement
            processEdtData(jsonData, type);
        };
        reader.readAsArrayBuffer(input.files[0]);
    } else {
        _originalHandleFileSelect(type);
    }
};

// --- CORRECTION IMPORT : LECTURE UNIVERSELLE DES DATES ---
function processEdtData(data, type) {
    const targetKey = (type === 'edt_cancelled') ? 'cancelled' : 'maintained';
    DB.edt[targetKey] = [];

    let rapport = { total: 0, succes: 0 };
    // On se base sur la date du 1er examen pour deviner l'année
    const refYear = DB.exams.length > 0 ? new Date(DB.exams[0].date).getFullYear() : new Date().getFullYear();

    // Fonction Helper : Convertir n'importe quoi en Date JS
    const parseDateSmart = (val) => {
        if (!val) return null;

        // Cas 1 : C'est déjà un objet Date (rare via CSV mais possible via XLSX)
        if (val instanceof Date) return val;

        // Cas 2 : C'est un nombre Excel (Serial Number ex: 45366.5)
        if (typeof val === 'number') {
            // Conversion Excel -> JS (Base date: 30/12/1899)
            return new Date(Math.round((val - 25569) * 864e5));
        }

        const str = val.toString().trim().toLowerCase();

        // Cas 3 : Format Texte Français "lundi 16/03 à 09h30" (Votre cas CSV)
        // Regex souple : cherche jour/mois et heure:minute
        const match = str.match(/(\d{1,2})[\/|-](\d{1,2}).*?(\d{1,2})[h|:](\d{1,2})/);
        if (match) {
            const d = parseInt(match[1]);
            const m = parseInt(match[2]) - 1; // Mois 0-11
            const hr = parseInt(match[3]);
            const mn = parseInt(match[4]);
            return new Date(refYear, m, d, hr, mn);
        }

        return null;
    };

    data.forEach((row, index) => {
        // 1. Trouver les colonnes (souple)
        const kDate = findKey(row, ['date', 'debut', 'jour', 'start']);
        const kDur = findKey(row, ['durée', 'duree', 'fin', 'duration']);
        const kProf = findKey(row, ['professeur', 'prof', 'enseignant', 'nom']);

        if (!kDate || !row[kDate] || !kProf || !row[kProf]) return;

        rapport.total++;

        // 2. Parsing Date ROBUSTE
        const startObj = parseDateSmart(row[kDate]);
        if (!startObj) {
            // console.warn("Date illisible ligne " + index, row[kDate]);
            return;
        }

        // 3. Calcul Durée
        let durationMin = 60; // Par défaut 1h
        if (row[kDur]) {
            const dStr = row[kDur].toString().toLowerCase().replace(/\s/g, '');
            if (dStr.includes('h')) {
                const parts = dStr.split('h');
                durationMin = parseInt(parts[0]) * 60 + (parseInt(parts[1]) || 0);
            } else {
                // Si c'est un nombre pur (ex: 1.5 ou 90 ?)
                // Dans votre CSV c'est "1h00", donc géré par le 'if'
                durationMin = parseInt(dStr) || 60;
            }
        }

        const endObj = new Date(startObj.getTime() + durationMin * 60000);

        // 4. Nettoyage Nom
        const profRaw = row[kProf].toString().trim();

        // Ajout
        DB.edt[targetKey].push({
            profName: profRaw,
            start: startObj,
            end: endObj,
            // On stocke aussi les minutes depuis minuit pour la comparaison rapide
            dayKey: `${startObj.getDate()}/${startObj.getMonth()}`, // "16/2" (Mars=2)
            startMin: startObj.getHours() * 60 + startObj.getMinutes(),
            endMin: endObj.getHours() * 60 + endObj.getMinutes()
        });
        rapport.succes++;
    });

    const statusId = (targetKey === 'cancelled') ? 'edtStatus_Cancelled' : 'edtStatus_Maintained';
    const label = (targetKey === 'cancelled') ? 'Dû' : 'Maintenu';

    document.getElementById(statusId).innerHTML = `✅ <b>${rapport.succes}</b> cours importés. <br><small>(Ex: 1er cours le ${DB.edt[targetKey][0]?.start.toLocaleDateString()} à ${DB.edt[targetKey][0]?.start.toLocaleTimeString()})</small>`;

    // Alerte immédiate pour vérifier si la date est bonne
    if (rapport.succes > 0) {
        const premier = DB.edt[targetKey][0];
        console.log(`Test Import ${label}:`, premier);
    } else {
        showToast('❌ Zéro cours détectés dans ce fichier. Vérifiez les colonnes.', 'error');
    }

    renderPlanning();
    autoSave();
}
// --- CORRECTION ULTIME : COMPARAISON EN MINUTES (IGNORE ANNÉE/SECONDES) ---
function getProfStatusForSlot(profObj, slotStartISO, slotEndISO) {
    if (!DB.edt.cancelled && !DB.edt.maintained) return { code: 'UNKNOWN', label: '' };

    const sStart = new Date(slotStartISO);
    const sEnd = new Date(slotEndISO);

    // Convertisseur Date -> Minutes depuis minuit (ex: 10h30 -> 630)
    const getMins = (d) => d.getHours() * 60 + d.getMinutes();

    // Plage du créneau de surveillance (en minutes)
    const slotMinStart = getMins(sStart);
    const slotMinEnd = getMins(sEnd);

    // Nettoyage Nom (Tokenisation)
    const blackList = ['M', 'MME', 'MR', 'MELLE', 'DR', 'PR', 'LE', 'LA', 'DE', 'DU', 'VON', 'VAN'];
    const getTokens = (str) => str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, " ").split(" ").filter(w => w.length > 1 && !blackList.includes(w));
    const dbTokens = getTokens(profObj.nom + " " + (profObj.prenom || ""));

    const isInList = (list) => {
        return list.some(c => {
            // 1. Vérification JOUR / MOIS (On ignore l'année pour éviter les bugs 2025/2026)
            if (c.start.getDate() !== sStart.getDate() || c.start.getMonth() !== sStart.getMonth()) {
                return false;
            }

            // 2. Vérification HORAIRE par Minutes
            const courseMinStart = getMins(c.start);
            const courseMinEnd = getMins(c.end);

            // Formule de chevauchement mathématique stricte :
            // (DebutA < FinB) ET (FinA > DebutB)
            // Ex: Cours 10h30(630)-11h30(690) vs Surv 11h00(660)-11h30(690)
            // 630 < 690 (Vrai) ET 690 > 660 (Vrai) -> MATCH !
            const overlap = (courseMinStart < slotMinEnd) && (courseMinEnd > slotMinStart);

            if (!overlap) return false;

            // 3. Vérification NOM (Tokens)
            const csvTokens = getTokens(c.profName);
            return csvTokens.some(token => dbTokens.includes(token)) ||
                dbTokens.some(token => csvTokens.includes(token));
        });
    };

    if (isInList(DB.edt.maintained)) return { code: 'BUSY_CLASS', label: '🔴 (Maintenu)' };
    if (isInList(DB.edt.cancelled)) return { code: 'DUE', label: '🟢 DÛ' };

    return { code: 'FREE', label: '⚪ HSE' };
}
// --- GESTION INTELLIGENTE DU SWITCH SURVEILLANTS ---
function handleSurvSwitch(checkbox) {
    const newVal = checkbox.checked ? 2 : 1;

    // Message d'avertissement si on réduit le nombre
    if (newVal === 1) {
        showConfirm("⚠️ ATTENTION : RETOUR À 1 SURVEILLANT\n\nCela va supprimer le 2ème surveillant de TOUTES les salles et nettoyer le planning.\n\nConfirmer ?", () => {
            // Nettoyage des données du surveillant n°2 (index 1)
            Object.keys(DB.planning).forEach(key => {
                if (key.endsWith("_1")) delete DB.planning[key];
            });

            // Mise à jour de la config globale (pour mémoire)
            DB.config.nbSurv = newVal;

            // Application à TOUTES les salles individuelles
            DB.rooms.forEach(r => r.nbSurv = newVal);

            renderPlanning();
            autoSave();
        });
        // On restaure la case en attendant la réponse de l'utilisateur
        checkbox.checked = true;
        return;
    }

    // Mise à jour de la config globale (pour mémoire)
    DB.config.nbSurv = newVal;

    // Application à TOUTES les salles individuelles
    DB.rooms.forEach(r => r.nbSurv = newVal);

    renderPlanning();
    autoSave();
}

// =========================================================================
// === MODULE FINAL : PLANNING UNIFIÉ (AFFICHAGE EMPILÉ + PDF + AUTOMATISMES) ===
// =========================================================================

// --- 1. UTILITAIRES GLOBAUX ---
window.toMin = function (t) {
    if (!t || typeof t !== 'string') return 0;
    const [h, m] = t.split(':').map(Number);
    return (h * 60) + m;
};

window.getComputedSlots = function (exam, type) {
    if (exam.slots && exam.slots[type] && exam.slots[type].length > 0) {
        return exam.slots[type].map((s, i) => ({ ...s, originalIdx: i }));
    }
    const startTime = (type === 'tt' && exam.timeTT) ? exam.timeTT : exam.time;
    const duration = type === 'tt' ? exam.durTT : exam.durStd;
    const startMin = window.toMin(startTime);
    const endMin = startMin + parseInt(duration);
    const endH = Math.floor(endMin / 60) % 24;
    const endM = endMin % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    return [{ start: startTime, end: endTime, originalIdx: 0 }];
};

function isFrenchGrammarExam(exam) {
    const name = (exam && exam.name ? exam.name : '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return name.includes('FRANCAIS') && name.includes('GRAMMAIRE');
}

function getDictationSlot(exam, roomOrType) {
    if (!isFrenchGrammarExam(exam)) return null;
    let type = null;
    if (typeof roomOrType === 'string') type = roomOrType;
    else if (roomOrType) type = (roomOrType.isTT === true || roomOrType.isTT === 'true') ? 'tt' : 'std';

    const allSlots = type
        ? window.getComputedSlots(exam, type).filter(s => s && s.start && s.end)
        : [...window.getComputedSlots(exam, 'std'), ...window.getComputedSlots(exam, 'tt')].filter(s => s && s.start && s.end);
    if (allSlots.length === 0) return null;
    const latestEnd = allSlots.reduce((max, slot) => Math.max(max, window.toMin(slot.end)), 0);
    if (!latestEnd) return null;
    const startMin = Math.max(0, latestEnd - 20);
    const toTime = (minutes) => {
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    return { start: toTime(startMin), end: toTime(latestEnd), originalIdx: 0, isDictation: true };
}

function isFrenchTeacher(teacher) {
    const subject = `${teacher && teacher.matiere ? teacher.matiere : ''} ${teacher && teacher.nom ? teacher.nom : ''}`.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return subject.includes('FRANCAIS') || subject.includes('LETTRES');
}

function getDictationKey(examIdx, roomName) {
    return `${examIdx}_${roomName}_dict_0_0`;
}

window.getFullDate = function (dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-');
    const [hh, mm] = timeStr.split(':');
    return new Date(y, m - 1, d, hh, mm);
};

window.getTeacherPlanningName = function (teacher) {
    if (!teacher) return "";
    return normalizePlanningTeacherName(`${teacher.nom || ""} ${teacher.prenom || ""}`);
};

function normalizePlanningTeacherName(name) {
    return (name || "").replace(/\s+/g, " ").trim();
}

function getTeacherNameSet() {
    return new Set((DB.teachers || []).map(t => window.getTeacherPlanningName(t)).filter(Boolean));
}

function ensurePlanningReserve() {
    if (!DB.planningReserve) DB.planningReserve = {};
    return DB.planningReserve;
}

function getExamReserveSlot(exam) {
    const slotsStd = window.getComputedSlots(exam, 'std');
    const slotsTT = window.getComputedSlots(exam, 'tt');
    const allSlots = [...slotsStd, ...slotsTT].filter(s => s && s.start && s.end);
    allSlots.sort((a, b) => window.toMin(a.start) - window.toMin(b.start));
    return allSlots[0] || { start: exam.time || '08:00', end: exam.time || '08:00', originalIdx: 0 };
}

function getReserveKey(examIdx, reserveIdx) {
    return `${examIdx}_reserve_${reserveIdx}`;
}

function getReserveDisplayLabel() {
    return "Secrétariat d'examen / réserve";
}

function getReserveShortLabel() {
    return "Secrétariat / réserve";
}

function getPlanningSlotForKey(parts) {
    const examIdx = parseInt(parts[0], 10);
    const type = parts[2];
    const slotIdx = parseInt(parts[3], 10);
    const exam = DB.exams && DB.exams[examIdx];
    if (!exam || !type || Number.isNaN(slotIdx)) return null;

    if (type === 'dict') {
        const room = DB.rooms && DB.rooms.find(r => r.nom === parts[1]);
        return getDictationSlot(exam, room || 'std');
    }

    const slots = window.getComputedSlots(exam, type);
    return slots.find(s => (s.originalIdx !== undefined ? s.originalIdx : 0) === slotIdx) || slots[slotIdx] || null;
}

function parsePlanningKey(key) {
    const parts = String(key || "").split('_');
    if (parts.length < 5) return null;

    const examIdx = parseInt(parts[0], 10);
    const survIdx = parseInt(parts[parts.length - 1], 10);
    const slotIdx = parseInt(parts[parts.length - 2], 10);
    const type = parts[parts.length - 3];
    const roomName = parts.slice(1, -3).join('_');

    if (Number.isNaN(examIdx) || Number.isNaN(slotIdx) || Number.isNaN(survIdx) || !roomName || !type) return null;
    return { examIdx, roomName, type, slotIdx, survIdx };
}

function getPlanningDuty(key) {
    const parsed = parsePlanningKey(key);
    if (!parsed) return null;

    const exam = DB.exams && DB.exams[parsed.examIdx];
    const room = DB.rooms && DB.rooms.find(r => r.nom === parsed.roomName);
    if (!exam || !room) return null;

    const activeRoom = ((DB.distribution && DB.distribution[room.nom]) || []).length > 0;
    if (!activeRoom) return null;

    const expectedType = (room.isTT === true || room.isTT === 'true') ? 'tt' : 'std';
    if (parsed.type !== expectedType && parsed.type !== 'dict') return null;

    const limit = parsed.type === 'dict' ? 1 : (room.nbSurv || DB.config.nbSurv || 1);
    if (parsed.survIdx < 0 || parsed.survIdx >= limit) return null;

    const slot = parsed.type === 'dict'
        ? getDictationSlot(exam, room)
        : getPlanningSlotForKey([parsed.examIdx, parsed.roomName, parsed.type, parsed.slotIdx]);
    if (!slot || !slot.start || !slot.end) return null;

    return { ...parsed, exam, room, slot, minutes: window.toMin(slot.end) - window.toMin(slot.start) };
}

function getReserveDuty(key) {
    const parts = String(key || "").split('_');
    if (parts.length !== 3 || parts[1] !== 'reserve') return null;
    const examIdx = parseInt(parts[0], 10);
    const reserveIdx = parseInt(parts[2], 10);
    const exam = DB.exams && DB.exams[examIdx];
    if (!exam || Number.isNaN(reserveIdx) || reserveIdx < 0 || reserveIdx > 1) return null;
    const slot = getExamReserveSlot(exam);
    return { examIdx, reserveIdx, exam, slot, minutes: window.toMin(slot.end) - window.toMin(slot.start) };
}

function cleanupPlanningAssignments() {
    if (!DB.planning) DB.planning = {};
    const knownTeachers = getTeacherNameSet();
    let changed = false;

    Object.keys(DB.planning).forEach(key => {
        const cleanName = normalizePlanningTeacherName(DB.planning[key]);
        if (!cleanName || !knownTeachers.has(cleanName) || !getPlanningDuty(key)) {
            delete DB.planning[key];
            changed = true;
            return;
        }
        if (DB.planning[key] !== cleanName) {
            DB.planning[key] = cleanName;
            changed = true;
        }
    });

    const reserves = ensurePlanningReserve();
    Object.keys(reserves).forEach(key => {
        const cleanName = normalizePlanningTeacherName(reserves[key]);
        if (!cleanName || !knownTeachers.has(cleanName) || !getReserveDuty(key)) {
            delete reserves[key];
            changed = true;
            return;
        }
        if (reserves[key] !== cleanName) {
            reserves[key] = cleanName;
            changed = true;
        }
    });

    return changed;
}

// --- NOUVELLE FONCTION : Gestion flexible du nombre de surveillants ---
window.changeRoomSurvCount = function (roomName, delta) {
    const room = DB.rooms.find(r => r.nom === roomName);
    if (!room) return;

    // Initialisation si nécessaire
    if (!room.nbSurv) room.nbSurv = DB.config.nbSurv || 1;

    const oldVal = room.nbSurv;
    const newVal = oldVal + delta;

    // Sécurité : Impossible d'avoir moins de 1 surveillant
    if (newVal < 1) return;

    // Si on diminue le nombre (ex: passage de 3 à 2)
    if (delta < 0) {
        // On demande confirmation car on va effacer le surveillant du dernier créneau
        showConfirm(`Réduire le nombre de surveillants pour "${roomName}" à ${newVal} ?\n(Le surveillant n°${oldVal} sera effacé)`, () => {
            // Nettoyage : On supprime les données correspondant à l'index qu'on enlève (index = newVal, car ça commence à 0)
            // Ex: si on passe de 3 à 2. Les index étaient 0, 1, 2. On supprime l'index 2.
            const indexToRemove = newVal;

            Object.keys(DB.planning).forEach(key => {
                // La clé ressemble à : examIdx_RoomName_type_slotIdx_survIndex
                if (key.includes(`_${roomName}_`) && key.endsWith(`_${indexToRemove}`)) {
                    delete DB.planning[key];
                }
            });

            room.nbSurv = newVal;
            renderPlanning();
            if (typeof autoSave === 'function') autoSave();
        });
        return;
    }

    room.nbSurv = newVal;
    renderPlanning();
    if (typeof autoSave === 'function') autoSave();
};


// --- 2. AFFICHAGE PLANNING (Mode "L'un sous l'autre") ---
window.renderPlanning = function () {
    const container = document.getElementById('planningContainer');
    if (!container) return;
    container.innerHTML = '';
    container.style.flexDirection = 'column';

    // Sécurité : on garde une valeur par défaut globale au cas où
    const globalNbSurv = DB.config.nbSurv || 1;

    if (DB.exams.length === 0 || DB.rooms.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#7f8c8d;">Veuillez configurer les Examens et les Salles.</div>';
        return;
    }

    if (cleanupPlanningAssignments() && typeof autoSave === 'function') autoSave();

    DB.exams.forEach((exam, examIdx) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "30px";
        wrapper.innerHTML = `<h3 style="border-left:5px solid var(--secondary); padding-left:10px; margin:20px 0 10px 0;">${exam.name} <span style="font-size:0.8rem; color:#666">(${exam.date})</span></h3>`;

        // Calcul des créneaux
        const slotsStd = window.getComputedSlots(exam, 'std');
        const slotsTT = window.getComputedSlots(exam, 'tt');
        const allPoints = new Set();
        [...slotsStd, ...slotsTT].forEach(s => { allPoints.add(s.start); allPoints.add(s.end); });
        const sortedPoints = Array.from(allPoints).sort((a, b) => window.toMin(a) - window.toMin(b));
        const gridCols = [];
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            gridCols.push({ start: sortedPoints[i], end: sortedPoints[i + 1] });
        }

        const dictationSlot = getDictationSlot(exam);
        if (dictationSlot) {
            const note = document.createElement('div');
            note.style.cssText = 'margin:0 0 10px 0; padding:8px 12px; border-left:5px solid #8e44ad; background:#f5eef8; color:#4a235a; border-radius:4px; font-weight:bold;';
            note.innerHTML = `<i class="fas fa-pen-nib"></i> Dictée : les 20 dernières minutes de cette épreuve nécessitent un renfort par salle, avec priorité aux enseignants de français.`;
            wrapper.appendChild(note);
        }

        const table = document.createElement('table');
        table.className = 'planning-matrix';
        const tbody = document.createElement('tbody');

        let activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);

        // Tri des salles
        activeRooms.sort((a, b) => {
            const isSpecialA = (a.isTT === true || a.isTT === 'true' || a.isAmen === true || a.isAmen === 'true');
            const isSpecialB = (b.isTT === true || b.isTT === 'true' || b.isAmen === true || b.isAmen === 'true');
            if (isSpecialA && !isSpecialB) return -1;
            if (!isSpecialA && isSpecialB) return 1;
            return a.nom.localeCompare(b.nom);
        });

        activeRooms.forEach(room => {
            const tr = document.createElement('tr');

            // --- Cellule Salle (Colonne Gauche) ---
            const tdRoom = document.createElement('td');
            const isRTt = (room.isTT === true || room.isTT === 'true');
            const isRAmen = (room.isAmen === true || room.isAmen === 'true');
            let classes = 'room-cell';
            if (isRTt) classes += ' is-tt';
            if (isRAmen) classes += ' is-amen';
            tdRoom.className = classes;

            // Init nbSurv local si absent
            if (!room.nbSurv) room.nbSurv = globalNbSurv;

            // --- NOUVEAU CONTROLEUR PLUS / MOINS ---
            const safeRoomName = room.nom.replace(/'/g, "\\'"); // Protection apostrophe
            const survControlHtml = `
                <div style="margin-top:5px; display:flex; align-items:center; gap:3px; background:#f0f0f0; padding:2px 4px; border-radius:12px; border:1px solid #ccc; width:fit-content; margin-left:auto; margin-right:auto;">
                    <button onclick="changeRoomSurvCount('${safeRoomName}', -1)"
                            title="Moins de surveillants"
                            style="cursor:pointer; border:none; background:#e74c3c; color:white; width:18px; height:18px; border-radius:50%; font-weight:bold; display:flex; align-items:center; justify-content:center; padding:0; font-size:12px;">-</button>

                    <span style="font-weight:bold; font-size:0.8rem; color:#333; min-width:15px; text-align:center;">${room.nbSurv}</span>

                    <button onclick="changeRoomSurvCount('${safeRoomName}', 1)"
                            title="Plus de surveillants"
                            style="cursor:pointer; border:none; background:#27ae60; color:white; width:18px; height:18px; border-radius:50%; font-weight:bold; display:flex; align-items:center; justify-content:center; padding:0; font-size:12px;">+</button>
                </div>`;

            let badgesHtml = '';
            if (isRTt) badgesHtml += `<span class="badge-mini" style="background:var(--tt-color);">TT</span>`;
            if (isRAmen) badgesHtml += `<span class="badge-mini" style="background:var(--amen-color);">Amén.</span>`;

            tdRoom.innerHTML = `<span class="room-name-text">${room.nom}</span><div class="room-badges-container">${badgesHtml}</div>${survControlHtml}`;
            tr.appendChild(tdRoom);

            const roomSlots = isRTt ? slotsTT : slotsStd;
            const roomType = isRTt ? 'tt' : 'std';
            let skipCols = 0;

            gridCols.forEach((col, colIdx) => {
                if (skipCols > 0) { skipCols--; return; }

                const colStart = window.toMin(col.start);
                const colEnd = window.toMin(col.end);
                const activeSlot = roomSlots.find(rs => (window.toMin(rs.start) <= colStart && window.toMin(rs.end) >= colEnd));
                const tdSlot = document.createElement('td');
                tdSlot.className = 'surv-cell';

                if (activeSlot) {
                    let span = 1;
                    const slotEndVal = window.toMin(activeSlot.end);
                    for (let k = colIdx + 1; k < gridCols.length; k++) {
                        if (slotEndVal >= window.toMin(gridCols[k].end)) span++;
                        else break;
                    }
                    if (span > 1) { tdSlot.setAttribute('colspan', span); skipCols = span - 1; }

                    tdSlot.innerHTML = `<span class="surv-time-label" style="background:#e8f8f5; color:#16a085;">⏱️ ${activeSlot.start} - ${activeSlot.end}</span>`;

                    const slotIdx = activeSlot.originalIdx !== undefined ? activeSlot.originalIdx : 0;

                    // --- MODIFICATION MAJEURE ICI : BOUCLE SUR room.nbSurv ---
                    const limit = room.nbSurv || 1;

                    for (let i = 0; i < limit; i++) {
                        const planKey = `${examIdx}_${room.nom}_${roomType}_${slotIdx}_${i}`;
                        const currentVal = (DB.planning[planKey] || "").replace(/\s+/g, " ").trim();
                        if (DB.planning[planKey] && DB.planning[planKey] !== currentVal) DB.planning[planKey] = currentVal;

                        const select = document.createElement('select');
                        select.className = 'surv-select';
                        select.style.display = "block";
                        select.style.width = "100%";
                        select.style.marginBottom = "4px";
                        select.title = `Surveillant n°${i + 1}`;

                        if (currentVal) select.style.fontWeight = 'bold';

                        // Construction des options (Profs)
                        let optsDue = [], optsFree = [], optsBusy = [];
                        const slotStartObj = window.getFullDate(exam.date, activeSlot.start);
                        const slotEndObj = window.getFullDate(exam.date, activeSlot.end);

                        DB.teachers.forEach(t => {
                            const fullName = window.getTeacherPlanningName(t);
                            // Vérification collision
                            let conflictRoom = (typeof checkTeacherCollision === 'function') ? checkTeacherCollision(fullName, exam.date, activeSlot.start, activeSlot.end, planKey) : false;
                            // Vérification EDT
                            let edtStatus = (typeof getProfStatusForSlot === 'function') ? getProfStatusForSlot(t, slotStartObj, slotEndObj) : { code: 'FREE', label: '' };

                            let opt = document.createElement('option'); opt.value = fullName;

                            if (conflictRoom) {
                                if (fullName === currentVal) {
                                    opt.text = `⚠️ ${fullName}`; opt.selected = true; select.style.border = "2px solid #e74c3c"; optsDue.unshift(opt);
                                } else {
                                    opt.text = `${fullName} (Surv. ${conflictRoom})`; opt.disabled = true; opt.style.color = "#ccc"; optsBusy.push(opt);
                                }
                            } else if (edtStatus.code === 'BUSY_CLASS') {
                                opt.text = `${fullName} ${edtStatus.label}`; opt.disabled = true; opt.style.color = "#ccc"; optsBusy.push(opt);
                            } else {
                                if (edtStatus.code === 'DUE') { opt.text = `🟢 ${fullName} (Dû)`; opt.style.color = "#145a32"; opt.style.fontWeight = "bold"; optsDue.push(opt); }
                                else { opt.text = `${fullName} ${edtStatus.label}`; optsFree.push(opt); }
                                if (fullName === currentVal) opt.selected = true;
                            }
                        });

                        select.appendChild(new Option(`-- Surv. ${i + 1} --`, ""));
                        optsDue.forEach(o => select.appendChild(o));
                        if (optsFree.length > 0) { let sep = new Option("--- HSE ---", ""); sep.disabled = true; select.appendChild(sep); optsFree.forEach(o => select.appendChild(o)); }
                        if (optsBusy.length > 0) { let sep = new Option("--- Indisp. ---", ""); sep.disabled = true; select.appendChild(sep); optsBusy.forEach(o => select.appendChild(o)); }

                        select.onchange = (e) => { DB.planning[planKey] = e.target.value; renderPlanning(); autoSave(); };
                        tdSlot.appendChild(select);
                    }
                } else {
                    tdSlot.style.backgroundColor = "#f9f9f9";
                    tdSlot.innerHTML = `<div style="color:#eee; font-size:1.5rem; text-align:center;">/</div>`;
                }
                tr.appendChild(tdSlot);
            });
            tbody.appendChild(tr);
        });
        const reserveBox = renderReserveSelectorsForExam(exam, examIdx);
        table.appendChild(tbody);
        wrapper.appendChild(table);
        if (dictationSlot) wrapper.appendChild(renderDictationSelectorsForExam(exam, examIdx, activeRooms));
        if (reserveBox) wrapper.appendChild(reserveBox);
        container.appendChild(wrapper);
    });
};

function renderDictationSelectorsForExam(exam, examIdx, activeRooms) {
    const box = document.createElement('div');
    box.style.cssText = 'margin:8px 0 0 0; padding:10px 12px; background:#fbf7ff; border:1px solid #d7bde2; border-left:5px solid #8e44ad; border-radius:6px;';
    box.innerHTML = `<div style="font-weight:bold; color:#4a235a; margin-bottom:8px;"><i class="fas fa-pen-nib"></i> Renfort Dictée - priorité Français</div>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;';

    activeRooms.forEach(room => {
        const slot = getDictationSlot(exam, room);
        if (!slot) return;
        const key = getDictationKey(examIdx, room.nom);
        const currentVal = (DB.planning[key] || "").replace(/\s+/g, " ").trim();
        if (DB.planning[key] && DB.planning[key] !== currentVal) DB.planning[key] = currentVal;

        const item = document.createElement('label');
        item.style.cssText = 'display:grid; grid-template-columns:90px 1fr; align-items:center; gap:8px; font-weight:bold; color:#2c3e50;';
        item.appendChild(document.createTextNode(`${room.nom} (${slot.start}-${slot.end})`));

        const select = document.createElement('select');
        select.className = 'surv-select';
        select.appendChild(new Option('-- Dictée --', ''));

        const addOptions = (teachers, label) => {
            if (teachers.length === 0) return;
            const sep = new Option(label, '');
            sep.disabled = true;
            select.appendChild(sep);
            teachers.forEach(t => {
                const fullName = window.getTeacherPlanningName(t);
                const opt = new Option(fullName, fullName);
                const conflict = checkTeacherCollision(fullName, exam.date, slot.start, slot.end, key);
                const busy = isTeacherBusyInMaintainedEdt(t, exam, slot);
                if ((conflict || busy) && fullName !== currentVal) {
                    opt.disabled = true;
                    opt.text = conflict ? `${fullName} (occupé)` : `${fullName} (indisponible)`;
                }
                if (fullName === currentVal) opt.selected = true;
                select.appendChild(opt);
            });
        };

        const teachers = [...DB.teachers].sort((a, b) => window.getTeacherPlanningName(a).localeCompare(window.getTeacherPlanningName(b)));
        addOptions(teachers.filter(isFrenchTeacher), '--- Français ---');
        addOptions(teachers.filter(t => !isFrenchTeacher(t)), '--- Autres ---');

        select.onchange = (e) => {
            if (e.target.value) DB.planning[key] = e.target.value;
            else delete DB.planning[key];
            renderPlanning();
            if (typeof autoSave === 'function') autoSave();
        };

        item.appendChild(select);
        grid.appendChild(item);
    });

    box.appendChild(grid);
    return box;
}

function renderReserveSelectorsForExam(exam, examIdx) {
    const reserves = ensurePlanningReserve();
    const slot = getExamReserveSlot(exam);
    const box = document.createElement('div');
    box.style.cssText = 'margin:8px 0 0 0; padding:10px 12px; background:#f4f6f7; border:1px solid #dfe6e9; border-left:5px solid #8e44ad; border-radius:6px; display:grid; grid-template-columns:180px 1fr 1fr; gap:10px; align-items:center;';
    box.innerHTML = `<div style="font-weight:bold; color:#2c3e50;"><i class="fas fa-user-shield"></i> ${getReserveDisplayLabel()}<br><small style="font-weight:normal; color:#7f8c8d;">${slot.start} - ${slot.end}</small></div>`;

    for (let i = 0; i < 2; i++) {
        const key = getReserveKey(examIdx, i);
        const currentVal = (reserves[key] || "").replace(/\s+/g, " ").trim();
        if (reserves[key] && reserves[key] !== currentVal) reserves[key] = currentVal;

        const select = document.createElement('select');
        select.className = 'surv-select';
        select.style.width = '100%';
        select.appendChild(new Option(`-- ${getReserveShortLabel()} ${i + 1} --`, ""));

        DB.teachers.forEach(t => {
            const fullName = window.getTeacherPlanningName(t);
            const opt = new Option(fullName, fullName);
            const conflict = checkTeacherCollision(fullName, exam.date, slot.start, slot.end, key);
            const busy = isTeacherBusyInMaintainedEdt(t, exam, slot);
            const usedOtherReserve = Object.entries(reserves).some(([reserveKey, name]) => reserveKey !== key && reserveKey.startsWith(`${examIdx}_reserve_`) && name === fullName);

            if ((conflict || busy || usedOtherReserve) && fullName !== currentVal) {
                opt.disabled = true;
                opt.text = conflict ? `${fullName} (déjà en salle)` : `${fullName} (indisponible)`;
            }
            if (fullName === currentVal) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            const value = e.target.value;
            if (value) reserves[key] = value;
            else delete reserves[key];
            renderPlanning();
            if (typeof autoSave === 'function') autoSave();
        };
        box.appendChild(select);
    }

    return box;
}

// =========================================================
// --- VUE GLOBALE PROFESSEURS ---
function renderPlanningProfs() {
    const container = document.getElementById('profViewContainer');
    if (!container) return;
    if (cleanupPlanningAssignments() && typeof autoSave === 'function') autoSave();

    // 1. Récupérer l'état du Switch
    const isVisualMode = document.getElementById('toggleProfView').checked;

    // Bascule de l'affichage des boutons d'export (visibles qu'en synthèse)
    const btnExportHSE = document.getElementById('btnExportHSE');
    if (btnExportHSE) {
        btnExportHSE.style.display = isVisualMode ? 'none' : 'flex';
    }

    // 2. Préparer les données
    const clean = (s) => s ? s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

    // 3. Aiguillage selon le mode
    if (isVisualMode) renderProfPlanningMatrix(container);
    else renderProfSynthesis(container, clean);
}

// Shared logic for teacher hours data
function getTeacherHoursData(cleanFn) {
    let rawData = [];
    DB.teachers.forEach(t => {
        const dbNom = cleanFn(t.nom);
        const dbInitial = t.prenom ? cleanFn(t.prenom).charAt(0) : "";

        // Calcul Heures Libérées (Source : Excel "Annulés" / Dû)
        let minutesDue = 0;
        const sourceList = (DB.edt && DB.edt.cancelled) ? DB.edt.cancelled : [];

        sourceList.forEach(cours => {
            const xlsName = cleanFn(cours.profName);
            if (xlsName.includes(dbNom)) {
                const normalize = (s) => s ? s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-.]/g, " ").trim() : "";
                const dbNomClean = normalize(dbNom);
                const xlsNameClean = normalize(xlsName);
                const dbTokens = dbNomClean.split(/\s+/).filter(t => t.length > 0);
                const xlsTokens = xlsNameClean.split(/\s+/).filter(t => t.length > 0);

                let match = true;
                let remainingXlsTokens = [...xlsTokens];

                for (const token of dbTokens) {
                    const idx = remainingXlsTokens.indexOf(token);
                    if (idx === -1) { match = false; break; }
                    remainingXlsTokens.splice(idx, 1);
                }

                if (match && remainingXlsTokens.length > 0) {
                    const dbInitClean = dbInitial ? normalize(dbInitial) : "";
                    const remainderStr = remainingXlsTokens.join(" ");
                    if (dbInitClean && remainderStr !== dbInitClean && !remainderStr.startsWith(dbInitClean)) match = false;
                }

                if (match) {
                    let start = new Date(cours.start);
                    let end = new Date(cours.end);
                    if (!isNaN(start) && !isNaN(end)) minutesDue += (end - start) / 60000;
                }
            }
        });

        // Calcul Heures Faites (Source : Planning actuel)
        let minutesDone = 0;
        const fullName = window.getTeacherPlanningName(t);
        const dutyDetails = [];

        Object.keys(DB.planning).forEach(key => {
            if (normalizePlanningTeacherName(DB.planning[key]) !== fullName) return;
            const duty = getPlanningDuty(key);
            if (!duty) return;
            minutesDone += duty.minutes;
            dutyDetails.push(`${duty.exam.date} ${duty.exam.name} - ${duty.roomName} (${duty.slot.start}-${duty.slot.end})`);
        });

        const reserves = ensurePlanningReserve();
        Object.entries(reserves).forEach(([key, name]) => {
            if (normalizePlanningTeacherName(name) !== fullName) return;
            const duty = getReserveDuty(key);
            if (!duty) return;
            minutesDone += duty.minutes;
            dutyDetails.push(`${duty.exam.date} ${duty.exam.name} - ${getReserveDisplayLabel()} (${duty.slot.start}-${duty.slot.end})`);
        });

        const balance = minutesDone - minutesDue;
        rawData.push({
            name: fullName,
            minutesDue,
            minutesDone,
            balance,
            dutyDetails
        });
    });

    rawData.sort((a, b) => a.name.localeCompare(b.name));
    return rawData;
}

window.exportTeacherHoursPDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const cleanFn = (s) => s ? s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
    const data = getTeacherHoursData(cleanFn);

    const startY = typeof drawExamPdfHeader === 'function'
        ? drawExamPdfHeader(doc, { title: "Bilan des Heures Supplémentaires (HSE)", y: 8, logoSize: 26 })
        : 25;
    if (typeof drawExamPdfHeader !== 'function') {
        doc.setFontSize(16);
        doc.text("Bilan des Heures Supplémentaires (HSE)", 105, 15, { align: "center" });
    }

    const formatTime = (m) => m <= 0 ? "-" : `${Math.floor(m / 60)}h${Math.round(m % 60).toString().padStart(2, '0')}`;

    let body = data.map(r => {
        let balStr = "Eq";
        if (r.balance > 0) balStr = `+${formatTime(r.balance)}`;
        else if (r.balance < 0) balStr = formatTime(Math.abs(r.balance));
        return [r.name, formatTime(r.minutesDue), formatTime(r.minutesDone), balStr, (r.dutyDetails || []).join('\n')];
    });

    doc.autoTable({
        head: [['Professeur', 'Heures Libérées', 'Heures Surv.', 'Balance', 'Détail']],
        body: body,
        startY,
        theme: 'grid',
        styles: { halign: 'center' },
        columnStyles: { 0: { halign: 'left' } },
        didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 3) {
                const bal = body[data.row.index][3];
                if (bal.startsWith('+')) data.cell.styles.textColor = [200, 0, 0]; // Rouge pour +
                else if (bal !== "Eq") data.cell.styles.textColor = [0, 150, 0]; // Vert pour négatif
            }
        }
    });

    doc.save("Bilan_HSE_Professeurs.pdf");
};

window.exportTeacherHoursXLSX = function () {
    const cleanFn = (s) => s ? s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
    const rawData = getTeacherHoursData(cleanFn);

    const formatTime = (m) => m <= 0 ? "-" : `${Math.floor(m / 60)}h${Math.round(m % 60).toString().padStart(2, '0')}`;

    let data = [["Professeur", "Heures Libérées", "Heures Surv.", "Balance", "Détail"]];
    rawData.forEach(r => {
        let balStr = "Eq";
        if (r.balance > 0) balStr = `+${formatTime(r.balance)}`;
        else if (r.balance < 0) balStr = formatTime(Math.abs(r.balance));
        data.push([r.name, formatTime(r.minutesDue), formatTime(r.minutesDone), balStr, (r.dutyDetails || []).join('\n')]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bilan HSE");
    XLSX.writeFile(wb, "Bilan_HSE_Professeurs.xlsx");
};

// --- SOUS-FONCTION 1 : TABLEAU DE SYNTHÈSE ---
function renderProfSynthesis(container, cleanFn) {
    let html = `
    <div style="padding:15px; background:#eaf2f8; border-bottom:1px solid #ddd; margin-bottom:15px;">
        <small><strong>Note :</strong> Les "Heures Libérées" proviennent du fichier Excel (Zone Verte) importé. Les "Heures Surv." proviennent de votre planning actuel.</small>
    </div>

    <div style="overflow-x:auto;">
        <table class="table table-bordered table-striped table-hover text-center align-middle"
               style="width: auto !important; table-layout: auto !important; min-width: 600px;">
	            <thead class="table-dark sticky-top">
	                <tr>
	                    <th style="text-align:left; width: 350px;">Professeur</th>
	                    <th style="width:150px;">Heures Libérées<br><small>(Cours annulés)</small></th>
	                    <th style="width:150px;">Heures Surv.<br><small>(Affectées)</small></th>
	                    <th style="width:150px;">Balance</th>
	                    <th style="min-width:260px;">Détail compté</th>
	                </tr>
	            </thead>
            <tbody>`;

    let rows = [];
    const formatTime = (m) => m <= 0 ? "-" : `${Math.floor(m / 60)}h${Math.round(m % 60).toString().padStart(2, '0')}`;
    const rawData = getTeacherHoursData(cleanFn);

    rawData.forEach(r => {
        let balanceColor = "text-muted";
        let balanceText = "Eq";

        if (r.balance > 0) { balanceColor = "text-danger fw-bold"; balanceText = `+${formatTime(r.balance)}`; }
        else if (r.balance < 0) { balanceColor = "text-success fw-bold"; balanceText = formatTime(Math.abs(r.balance)); }

	        rows.push({
	            name: r.name,
	            dueStr: formatTime(r.minutesDue),
	            doneStr: formatTime(r.minutesDone),
	            balHtml: `<span class="${balanceColor}">${balanceText}</span>`,
	            detailHtml: (r.dutyDetails && r.dutyDetails.length > 0)
	                ? r.dutyDetails.map(d => `<div>${escapeHTML(d)}</div>`).join('')
	                : '<span class="text-muted">-</span>'
	        });
    });

    rows.forEach(r => {
        html += `<tr>
            <td style="text-align:left; font-weight:bold;">${r.name}</td>
            <td style="background:#ebf5fb;">${r.dueStr}</td>
            <td style="background:#eafaf1;">${r.doneStr}</td>
	            <td>${r.balHtml}</td>
	            <td style="text-align:left; font-size:0.8rem;">${r.detailHtml}</td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// --- SOUS-FONCTION 2 : MATRICE VISUELLE (CORRECTION FINALE : MINUTES + TIERS-TEMPS) ---
// --- SOUS-FONCTION 2 : MATRICE VISUELLE (VERSION FINALE & CORRIGÉE) ---
function renderProfPlanningMatrix(container) {

    // 1. Outils internes (pour être indépendant)
    const toMin = (tStr) => {
        if (!tStr) return 0;
        const [h, m] = tStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Normalisation "Mots Clés" (La même que l'import)
    const normalize = (s) => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, " ").split(" ").filter(w => w.length > 1);

    const namesMatch = (n1, n2) => {
        const t1 = normalize(n1);
        const t2 = normalize(n2);
        // Si au moins un mot de plus de 2 lettres correspond, c'est bon
        return t1.some(w => t2.includes(w)) || t2.some(w => t1.includes(w));
    };

    // 2. Préparation des colonnes (Créneaux)
    let columns = [];

    DB.exams.forEach((ex, exIdx) => {
        // Parsing de la date (Format YYYY-MM-DD)
        const parts = ex.date.split('-');
        const d = parseInt(parts[2]);
        const m = parseInt(parts[1]);
        const dayKey = `${d}/${m - 1}`;

        // Récupération des slots STD et TT
        const sStd = (ex.slots && ex.slots.std.length > 0) ? ex.slots.std : [{ start: ex.time, end: addMinutesObj(ex.time, ex.durStd) }];
        const sTT = (ex.slots && ex.slots.tt.length > 0) ? ex.slots.tt : [{ start: ex.timeTT || ex.time, end: addMinutesObj(ex.timeTT || ex.time, ex.durTT) }];

        // Fusion des créneaux pour avoir toutes les bornes temporelles
        const allSlots = [...sStd, ...sTT];

        const seen = new Set();
        allSlots.forEach(s => {
            const minStart = toMin(s.start);
            const minEnd = toMin(s.end);

            // Clé unique pour éviter les doublons de colonnes
            const colKey = `${dayKey}_${minStart}_${minEnd}`;

            if (!seen.has(colKey)) {
                seen.add(colKey);
                columns.push({
                    label: `${ex.name}<br><small>${s.start}-${s.end}</small>`,
                    examIdx: exIdx,
                    date: ex.date,
                    start: s.start,
                    end: s.end,
                    dayKey: dayKey,
                    minStart: minStart,
                    minEnd: minEnd
                });
            }
        });
    });

    // Tri Chronologique : D'abord par jour, ensuite par heure
    columns.sort((a, b) => {
        // Astuce : On trie grossièrement sur la chaîne jour (approximatif mais suffisant pour une session)
        // ou mieux : on suppose que les exams sont déjà dans l'ordre dans DB.exams
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return a.minStart - b.minStart || a.examIdx - b.examIdx;
    });

    // 3. Construction HTML
    let html = `

    <div style="overflow-x:auto;">
    <table class="table table-bordered table-sm text-center" style="font-size:0.85rem;">
        <thead class="table-dark">
            <tr>
                <th style="min-width:150px; position:sticky; left:0; z-index:10; background:#2c3e50;">Professeur</th>
                ${columns.map(c => `<th>${c.label}</th>`).join('')}
            </tr>
        </thead>
        <tbody>`;

    // Boucle sur les Profs
    DB.teachers.sort((a, b) => a.nom.localeCompare(b.nom)).forEach(t => {
        const tName = window.getTeacherPlanningName(t);

        html += `<tr><td style="text-align:left; font-weight:bold; position:sticky; left:0; background:white; z-index:5; border-right:2px solid #ddd;">${tName}</td>`;

        columns.forEach(col => {
            // A. SURVEILLANCE (Priorité 1 : Bleu)
            let surveillanceLabel = "";
            for (const key in DB.planning) {
                if (normalizePlanningTeacherName(DB.planning[key]) !== tName) continue;
                const duty = getPlanningDuty(key);
                if (!duty || duty.examIdx !== col.examIdx) continue;
                const overlaps = window.toMin(duty.slot.start) < col.minEnd && window.toMin(duty.slot.end) > col.minStart;
                if (!overlaps) continue;
                surveillanceLabel = `${duty.roomName}<br><small>${duty.slot.start}-${duty.slot.end}</small>`;
                break;
            }

            const reserves = ensurePlanningReserve();
            let reserveLabel = "";
            Object.entries(reserves).forEach(([reserveKey, name]) => {
                if (reserveLabel || normalizePlanningTeacherName(name) !== tName) return;
                const duty = getReserveDuty(reserveKey);
                if (!duty || duty.examIdx !== col.examIdx) return;
                const overlaps = window.toMin(duty.slot.start) < col.minEnd && window.toMin(duty.slot.end) > col.minStart;
                if (overlaps) reserveLabel = `${getReserveShortLabel()}<br><small>${duty.slot.start}-${duty.slot.end}</small>`;
            });

            if (surveillanceLabel) {
                html += `<td style="background-color:#3498db; color:white; border:1px solid white;">${surveillanceLabel}</td>`;
            } else if (reserveLabel) {
                html += `<td style="background-color:#8e44ad; color:white; border:1px solid white;">${reserveLabel}</td>`;
            } else {
                // B. COURS MAINTENU (Priorité 2 : Gris Foncé)
                // On vérifie dans la liste ROUGE importée
                let isBusy = false;
                const listMaintained = (DB.edt && DB.edt.maintained) ? DB.edt.maintained : [];

                isBusy = listMaintained.some(c => {
                    // 1. Vérif Nom
                    if (!namesMatch(c.profName, t.nom)) return false;
                    // 2. Vérif Jour
                    if (c.dayKey !== col.dayKey) return false;
                    // 3. Vérif Chevauchement (Minutes)
                    // (StartA < EndB) ET (EndA > StartB)
                    return (c.startMin < col.minEnd && c.endMin > col.minStart);
                });

                if (isBusy) {
                    html += `<td style="background-color:#343a40; color:white; opacity:0.9;">Cours</td>`;
                }
                else {
                    // C. COURS ANNULÉ (Priorité 3 : Vert)
                    // On vérifie dans la liste VERTE importée
                    let isFree = false;
                    const listCancelled = (DB.edt && DB.edt.cancelled) ? DB.edt.cancelled : [];

                    isFree = listCancelled.some(c => {
                        if (!namesMatch(c.profName, t.nom)) return false;
                        if (c.dayKey !== col.dayKey) return false;
                        return (c.startMin < col.minEnd && c.endMin > col.minStart);
                    });

                    if (isFree) {
                        html += `<td style="background-color:#27ae60; color:white; cursor:pointer;" title="Cours annulé">Dispo</td>`;
                    } else {
                        // D. RIEN (Blanc)
                        html += `<td style="background-color:#f8f9fa; color:#eee;">.</td>`;
                    }
                }
            }
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// --- 3. EXPORT EXCEL PLANNING ---
window.exportPlanningXLSX = function () {
    if (!DB.exams || DB.exams.length === 0) return showToast("Aucune épreuve à exporter.", 'warning');
    if (!DB.rooms || DB.rooms.length === 0) return showToast("Aucune salle définie.", 'warning');

    const data = [["Date", "Épreuve", "Salle", "Type de Salle", "Début Créneau", "Fin Créneau", "Surveillants"]];
    const nbSurv = DB.config.nbSurv || 1;

    DB.exams.forEach((exam, examIdx) => {
        const slotsStd = window.getComputedSlots(exam, 'std');
        const slotsTT = window.getComputedSlots(exam, 'tt');

        let activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);

        activeRooms.forEach(room => {
            const isRTt = (room.isTT === true || room.isTT === 'true');
            const roomSlots = isRTt ? slotsTT : slotsStd;
            const roomType = isRTt ? 'tt' : 'std';
            const roomTypeReadable = isRTt ? "Tiers-Temps" : "Standard";

            roomSlots.forEach((slot, slotIdx) => {
                let survs = [];
                // slot.originalIdx was used in the PDF export, check if it's there
                const actualSlotIdx = slot.originalIdx !== undefined ? slot.originalIdx : slotIdx;
                for (let i = 0; i < nbSurv; i++) {
                    const planKey = `${examIdx}_${room.nom}_${roomType}_${actualSlotIdx}_${i}`;
                    if (DB.planning[planKey]) survs.push(DB.planning[planKey]);
                }

                data.push([
                    exam.date,
                    exam.name,
                    room.nom,
                    roomTypeReadable,
                    slot.start,
                    slot.end,
                    survs.join(', ')
                ]);
            });

            const dictSlot = getDictationSlot(exam, room);
            if (dictSlot) {
                const dictTeacher = DB.planning[getDictationKey(examIdx, room.nom)] || '';
                data.push([
                    exam.date,
                    `${exam.name} - Dictée`,
                    room.nom,
                    "Renfort Dictée",
                    dictSlot.start,
                    dictSlot.end,
                    dictTeacher
                ]);
            }
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vues_Surveillances");
    XLSX.writeFile(wb, "Planning_Surveillances.xlsx");
};

function formatDateLongFR(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getExamMainSlot(exam, room) {
    const isRTt = room && (room.isTT === true || room.isTT === 'true');
    const slots = window.getComputedSlots(exam, isRTt ? 'tt' : 'std');
    return slots[0] || getExamReserveSlot(exam);
}

function getPlanningSummaryColumns() {
    return (DB.exams || []).map((exam, examIdx) => ({
        exam,
        examIdx,
        sortKey: `${exam.date || '9999-12-31'}_${exam.time || '99:99'}_${examIdx.toString().padStart(3, '0')}`,
        dateLabel: formatDateLongFR(exam.date || ''),
        subjectLabel: exam.name || 'Épreuve',
        stdSlot: window.getComputedSlots(exam, 'std')[0] || getExamReserveSlot(exam),
        ttSlot: window.getComputedSlots(exam, 'tt')[0] || getExamReserveSlot(exam)
    })).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function getSummaryTimeLabel(column) {
    const stdLabel = `${column.stdSlot.start}-${column.stdSlot.end}`;
    const ttLabel = `${column.ttSlot.start}-${column.ttSlot.end}`;
    const baseLabel = stdLabel === ttLabel ? stdLabel : `${stdLabel}\n* TT : ${ttLabel}`;
    const dictStd = getDictationSlot(column.exam, 'std');
    if (!dictStd) return baseLabel;
    const dictTt = getDictationSlot(column.exam, 'tt');
    const dictStdLabel = `${dictStd.start}-${dictStd.end}`;
    const dictTtLabel = dictTt ? `${dictTt.start}-${dictTt.end}` : dictStdLabel;
    const dictLabel = dictStdLabel === dictTtLabel ? `Dictée : ${dictStdLabel}` : `Dictée : ${dictStdLabel}\n* TT dictée : ${dictTtLabel}`;
    return `${baseLabel}\n${dictLabel}`;
}

function getPlanningSummaryRows() {
    const rows = [];
    const reserves = ensurePlanningReserve();
    const activeRooms = DB.rooms
        .filter(room => (DB.distribution[room.nom] || []).length > 0)
        .sort((a, b) => {
            const specialA = !!(a.isTT || a.isAmen);
            const specialB = !!(b.isTT || b.isAmen);
            if (specialA !== specialB) return specialA ? 1 : -1;
            return a.nom.localeCompare(b.nom);
        });

    activeRooms.forEach(room => {
        const limit = room.nbSurv || DB.config.nbSurv || 1;
        for (let i = 0; i < limit; i++) {
            rows.push({
                type: 'room',
                label: `${room.nom}${room.isTT ? ' *' : ''}`,
                capacity: (DB.distribution[room.nom] || []).length || room.capacite || '',
                room,
                survIdx: i
            });
        }
    });

    for (let i = 0; i < 2; i++) {
        rows.push({
            type: 'reserve',
            label: i === 0 ? getReserveDisplayLabel() : '',
            capacity: '',
            reserveIdx: i,
            reserves
        });
    }

    return rows;
}

function getSummaryCell(row, column) {
    if (row.type === 'reserve') {
        return row.reserves[getReserveKey(column.examIdx, row.reserveIdx)] || '';
    }

    const room = row.room;
    const isRTt = room.isTT === true || room.isTT === 'true';
    const slotType = isRTt ? 'tt' : 'std';
    const slot = getExamMainSlot(column.exam, room);
    const slotIdx = slot.originalIdx !== undefined ? slot.originalIdx : 0;
    const mainTeacher = DB.planning[`${column.examIdx}_${room.nom}_${slotType}_${slotIdx}_${row.survIdx}`] || '';
    const dictSlot = getDictationSlot(column.exam, room);
    if (!dictSlot || row.survIdx !== 0) return mainTeacher;

    const dictTeacher = DB.planning[getDictationKey(column.examIdx, room.nom)];
    if (!dictTeacher) return mainTeacher;
    return mainTeacher ? `${mainTeacher}\nDictée : ${dictTeacher}` : `Dictée : ${dictTeacher}`;
}

function buildPlanningSummaryAOA() {
    const columns = getPlanningSummaryColumns();
    const rows = getPlanningSummaryRows();
    const title = `Tableau des surveillances du DNB - Session ${DB.config.year || ''}`;
    const header1 = ['', '', ...columns.map(c => c.dateLabel)];
    const header2 = ['', '', ...columns.map(c => c.subjectLabel)];
    const header3 = ['', '', ...columns.map(c => getSummaryTimeLabel(c))];
    const body = rows.map(row => [
        row.label,
        row.capacity,
        ...columns.map(column => getSummaryCell(row, column))
    ]);
    return [[title], [], header1, header2, header3, ...body, [], ['* Salle tiers-temps : horaires indiqués en ligne "TT" dans l’en-tête.']];
}

window.exportPlanningSummaryXLSX = function () {
    if (typeof XLSX === 'undefined') return showToast("Librairie Excel non chargée.", 'error');
    const aoa = buildPlanningSummaryAOA();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const columns = getPlanningSummaryColumns();
    const rows = getPlanningSummaryRows();

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length + 1 } }
    ];
    ws['!cols'] = [
        { wch: 22 },
        { wch: 8 },
        ...columns.map(() => ({ wch: 24 }))
    ];

    rows.forEach((row, idx) => {
        if (idx > 0 && row.type === 'room' && rows[idx - 1].label === row.label) {
            const excelRow = idx + 6;
            const prevExcelRow = excelRow - 1;
            ws['!merges'].push({ s: { r: prevExcelRow - 1, c: 0 }, e: { r: excelRow - 1, c: 0 } });
            ws['!merges'].push({ s: { r: prevExcelRow - 1, c: 1 }, e: { r: excelRow - 1, c: 1 } });
        }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Synthese");
    XLSX.writeFile(wb, "Tableau_Surveillances_DNB.xlsx");
};

window.exportPlanningSummaryPDF = function () {
    if (!window.jspdf) return showToast("Librairie PDF non chargée.", 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const columns = getPlanningSummaryColumns();
    const rows = getPlanningSummaryRows();
    const head = [
        [
            { content: 'Salle', styles: { halign: 'center', fillColor: [190, 190, 190] } },
            ...columns.map(c => ({ content: c.dateLabel, styles: { halign: 'center', fillColor: [190, 190, 190] } }))
        ],
        [
            { content: '', styles: { fillColor: [205, 205, 205] } },
            ...columns.map(c => ({ content: c.subjectLabel, styles: { halign: 'center', fillColor: [205, 205, 205] } }))
        ],
        [
            { content: '', styles: { fillColor: [205, 205, 205] } },
            ...columns.map(c => ({ content: getSummaryTimeLabel(c), styles: { halign: 'center', fillColor: [205, 205, 205] } }))
        ]
    ];
    const body = rows.map(row => {
        const fill = row.type === 'reserve' ? [230, 238, 252] : [255, 255, 255];
        return [
            { content: row.label, styles: { fontStyle: row.label ? 'bold' : 'normal', fillColor: row.type === 'reserve' ? [180, 203, 238] : fill } },
            ...columns.map(column => ({ content: getSummaryCell(row, column), styles: { halign: 'center', fillColor: fill } }))
        ];
    });

    const title = `Tableau des surveillances - ${typeof getExamDisplayName === 'function' ? getExamDisplayName() : 'DNB'}`;
    const startY = typeof drawExamPdfHeader === 'function'
        ? drawExamPdfHeader(doc, { title, y: 4, logoSize: 22, titleFontSize: 13 })
        : 25;
    if (typeof drawExamPdfHeader !== 'function') {
        addSmartLogo(doc, 2, 2, 24);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Tableau des surveillances du DNB - Session ${DB.config.year || ''}`, 148, 14, { align: 'center' });
    }
    doc.autoTable({
        head,
        body,
        startY,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0], valign: 'middle' },
        headStyles: { textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: 32 }
        }
    });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('* Salle tiers-temps : horaires indiqués en ligne "TT" dans l’en-tête.', 10, 205);
    doc.save("Tableau_Surveillances_DNB.pdf");
};

// --- 3bis. EXPORT PDF PLANNING (Noms l'un sous l'autre) ---
window.exportPlanning = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const nbSurv = DB.config.nbSurv || 1;
    let pageAdded = false;

    DB.exams.forEach((exam, examIdx) => {
        if (pageAdded) doc.addPage();
        pageAdded = true;

        addSmartLogo(doc, 10, 10, 45);
        doc.setFontSize(16); doc.setTextColor(44, 62, 80);
        doc.text("PLANNING DES SURVEILLANCES", 148, 15, { align: 'center' });
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text(`${exam.name} (${exam.date})`, 148, 22, { align: 'center' });

        // Grille & Largeurs (Smart Width)
        const slotsStd = window.getComputedSlots(exam, 'std');
        const slotsTT = window.getComputedSlots(exam, 'tt');
        const allPoints = new Set();
        [...slotsStd, ...slotsTT].forEach(s => { allPoints.add(s.start); allPoints.add(s.end); });
        const sortedPoints = Array.from(allPoints).sort((a, b) => window.toMin(a) - window.toMin(b));

        const gridCols = [];
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            gridCols.push({ start: sortedPoints[i], end: sortedPoints[i + 1] });
        }

        const totalWidthAvailable = 240;
        let colsData = gridCols.map((c, i) => ({ idx: i, dur: window.toMin(c.end) - window.toMin(c.start), label: `${c.start}` }));
        const totalDuration = colsData.reduce((acc, c) => acc + c.dur, 0);
        colsData.forEach(c => { c.rawWidth = (c.dur / totalDuration) * totalWidthAvailable; });

        const MIN_WIDTH = 25;
        let usedWidth = 0;
        colsData.forEach(c => {
            if (c.rawWidth < MIN_WIDTH) c.finalWidth = MIN_WIDTH; else c.finalWidth = c.rawWidth;
            usedWidth += c.finalWidth;
        });

        if (usedWidth > totalWidthAvailable) {
            const overflow = usedWidth - totalWidthAvailable;
            const largeCols = colsData.filter(c => c.finalWidth > MIN_WIDTH);
            const totalLargeWidth = largeCols.reduce((acc, c) => acc + c.finalWidth, 0);
            largeCols.forEach(c => { c.finalWidth -= (overflow * (c.finalWidth / totalLargeWidth)); });
        }

        let pdfColumns = [{ header: 'Salle', dataKey: 'room' }];
        let pdfColStyles = { 0: { cellWidth: 35, fontStyle: 'bold', fillColor: [240, 240, 240] } };
        colsData.forEach(c => {
            const key = `col_${c.idx}`;
            pdfColumns.push({ header: c.label, dataKey: key });
            pdfColStyles[c.idx + 1] = { cellWidth: c.finalWidth, halign: 'center' };
        });

        // Données
        let activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);
        activeRooms.sort((a, b) => {
            const isSpecialA = (a.isTT === true || a.isTT === 'true' || a.isAmen === true || a.isAmen === 'true');
            const isSpecialB = (b.isTT === true || b.isTT === 'true' || b.isAmen === true || b.isAmen === 'true');
            if (isSpecialA && !isSpecialB) return -1;
            if (!isSpecialA && isSpecialB) return 1;
            return a.nom.localeCompare(b.nom);
        });

        let body = [];
        activeRooms.forEach(room => {
            let row = {};
            const isRTt = (room.isTT === true || room.isTT === 'true');
            const isRAmen = (room.isAmen === true || room.isAmen === 'true');
            row['room'] = `${room.nom}\n${isRTt ? '(TT)' : ''}${isRAmen ? '(Amén.)' : ''}`;

            const roomSlots = isRTt ? slotsTT : slotsStd;
            const roomType = isRTt ? 'tt' : 'std';
            let skipCols = 0;

            gridCols.forEach((col, colIdx) => {
                const key = `col_${colIdx}`;
                if (skipCols > 0) { skipCols--; return; }

                const colStart = window.toMin(col.start);
                const colEnd = window.toMin(col.end);
                const activeSlot = roomSlots.find(rs => (window.toMin(rs.start) <= colStart && window.toMin(rs.end) >= colEnd));

                if (activeSlot) {
                    let span = 1;
                    const slotEndVal = window.toMin(activeSlot.end);
                    for (let k = colIdx + 1; k < gridCols.length; k++) {
                        if (slotEndVal >= window.toMin(gridCols[k].end)) span++;
                        else break;
                    }

                    const slotIdx = activeSlot.originalIdx !== undefined ? activeSlot.originalIdx : 0;
                    let cellContent = `${activeSlot.start}-${activeSlot.end}\n`;
                    let survs = [];
                    for (let i = 0; i < nbSurv; i++) {
                        const planKey = `${examIdx}_${room.nom}_${roomType}_${slotIdx}_${i}`;
                        if (DB.planning[planKey]) survs.push(DB.planning[planKey]);
                    }
                    // --- MODIFICATION ICI : SAUT DE LIGNE POUR PDF ---
                    cellContent += survs.length > 0 ? survs.join('\n') : "(Vide)";
                    const dictSlot = getDictationSlot(exam, room);
                    const dictTeacher = dictSlot ? DB.planning[getDictationKey(examIdx, room.nom)] : '';
                    if (dictTeacher && window.toMin(activeSlot.start) <= window.toMin(dictSlot.start) && window.toMin(activeSlot.end) >= window.toMin(dictSlot.end)) {
                        cellContent += `\nDictée ${dictSlot.start}-${dictSlot.end}\n${dictTeacher}`;
                    }
                    // -------------------------------------------------

                    row[key] = {
                        content: cellContent,
                        colSpan: span,
                        styles: { fillColor: [255, 255, 255], valign: 'middle' }
                    };
                    if (span > 1) skipCols = span - 1;
                } else {
                    row[key] = { content: "-", styles: { fillColor: [245, 245, 245], textColor: [220, 220, 220] } };
                }
            });
            body.push(row);
        });

        doc.autoTable({
            columns: pdfColumns,
            body: body,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [44, 62, 80], fontSize: 9, halign: 'center' },
            columnStyles: pdfColStyles
        });

        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Généré le ${new Date().toLocaleDateString()}`, 10, 200);
    });
    doc.save("Planning_Surveillances.pdf");
};

function switchPochetteTab(zoneId, element) {
    // 1. Gestion des onglets visuels
    document.querySelectorAll('.pochette-zone').forEach(el => el.classList.remove('active'));
    // Reset styles par défaut
    document.querySelectorAll('.pochette-zone').forEach(el => {
        el.style.border = "none"; el.style.background = "#fff"; el.style.color = "#555"; el.style.fontWeight = "normal";
        if (el.innerText.includes('P1')) { el.style.background = "#fff"; }
    });

    // Active l'élément cliqué
    element.classList.add('active');

    // 2. Gestion des zones de texte
    document.querySelectorAll('.edit-zone').forEach(el => el.style.display = 'none');
    document.getElementById('edit-zone-' + zoneId).style.display = 'block';
}

window.exportPochettesPDF = function () {
    if (DB.exams.length === 0 || DB.rooms.length === 0) return showToast("Veuillez d'abord configurer les examens et les salles.", 'warning');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a3');

    const txtActions = document.getElementById('txtPochetteActions').value;
    const txtProfs = document.getElementById('txtPochetteProfs').value;
    const txtEleves = document.getElementById('txtPochetteEleves').value;

    const year = DB.config.year || "2025";
    const examTitle = typeof getExamTitle === 'function' ? getExamTitle() : (DB.config.examType || "DNB Blanc").toUpperCase();
    let pageCount = 0;
    const PG_H = 297; const HALF_W = 210; const M = 15;

    DB.exams.forEach((exam, examIdx) => {
        const slotsStd = window.getComputedSlots(exam, 'std');
        const slotsTT = window.getComputedSlots(exam, 'tt');
        const activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);
        activeRooms.sort((a, b) => a.nom.localeCompare(b.nom));

        activeRooms.forEach(room => {
            if (pageCount > 0) doc.addPage("a3", "l");
            pageCount++;

            // --- PAGE 1 : RECTO ---
            doc.setDrawColor(200); doc.setLineDash([5, 5], 0);
            doc.line(HALF_W, 0, HALF_W, PG_H); doc.setLineDash([]);

            // GAUCHE : PV
            const pvX = M; const pvW = HALF_W - (2 * M); const pvCenterX = M + (pvW / 2);

            // LOGO (Gauche)
            addSmartLogo(doc, pvX, 10, 45); // <--- LOGO ICI

            doc.setFontSize(16); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("PROCÈS-VERBAL DE SALLE", pvCenterX, 20, { align: 'center' });
            doc.setFontSize(12); doc.text(`${examTitle} ${year}`, pvCenterX, 28, { align: 'center' });

            doc.setDrawColor(0); doc.setLineWidth(0.4); doc.rect(pvX, 35, pvW, 25);
            doc.setFontSize(11);
            doc.text(`ÉPREUVE : ${exam.name}`, pvX + 5, 42);
            doc.text(`DATE : ${new Date(exam.date).toLocaleDateString('fr-FR')}`, pvX + 5, 52);
            doc.text(`SALLE : ${room.nom}`, pvX + 90, 42);
            const nbInscrits = (DB.distribution[room.nom] || []).length;

            doc.setFillColor(245, 245, 245); doc.rect(pvX, 63, pvW, 15, 'FD');
            doc.setFontSize(10); doc.setFont("helvetica", "bold");
            const stepW = pvW / 4;
            doc.text(`INSCRITS : ${nbInscrits}`, pvX + 5, 73);
            doc.text("PRÉSENTS : .......", pvX + stepW + 2, 73);
            doc.text("ABSENTS : .......", pvX + (stepW * 2) + 2, 73);
            doc.text("RETARDS : .......", pvX + (stepW * 3) + 2, 73);

            let emptyRows = []; for (let k = 0; k < 10; k++) emptyRows.push(["", ""]);
            doc.autoTable({
                head: [['RELEVÉ NOMINATIF (Absences, Retards, Incidents)']], body: [], startY: 85, margin: { left: pvX }, tableWidth: pvW,
                headStyles: { fillColor: [50, 50, 50], textColor: 255, halign: 'center', fontStyle: 'bold' }
            });
            doc.autoTable({
                head: [['Nom / Prénom du candidat', 'Nature (Abs, Retard) & Motif']], body: emptyRows, startY: doc.lastAutoTable.finalY, margin: { left: pvX }, tableWidth: pvW,
                theme: 'grid', styles: { minCellHeight: 10 }, columnStyles: { 0: { cellWidth: 70 } }
            });

            const sigY = PG_H - 40;
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Noms et Signatures des Examinateurs / Surveillants :", pvX, sigY);
            doc.rect(pvX, sigY + 5, pvW, 25);

            // DROITE : COUVERTURE
            const covX = HALF_W + M; const covW = HALF_W - (2 * M); const covCenterX = covX + (covW / 2);

            // LOGO (Droite)
            addSmartLogo(doc, covX, 10, 45); // <--- LOGO ICI

            doc.setFontSize(22); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
            doc.text(`${examTitle} ${year}`, covCenterX, 30, { align: 'center' });

            const startY = 45;
            doc.setDrawColor(200); doc.setFillColor(248, 249, 250); doc.rect(covX, startY, covW, 40, 'FD');
            doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("ÉPREUVE :", covX + 5, startY + 10); doc.setFont("helvetica", "normal"); doc.text(exam.name.toUpperCase(), covX + 35, startY + 10);
            doc.setFont("helvetica", "bold"); doc.text("DATE :", covX + 5, startY + 20); doc.setFont("helvetica", "normal"); doc.text(new Date(exam.date).toLocaleDateString('fr-FR'), covX + 35, startY + 20);
            doc.setFont("helvetica", "bold"); doc.text("SALLE :", covX + 5, startY + 30); doc.setFontSize(16); doc.text(room.nom, covX + 35, startY + 30);

            let badgeX = covX + 110; let badgeY = startY + 5;
            if (room.isTT) { doc.setFillColor(142, 68, 173); doc.roundedRect(badgeX, badgeY, 35, 8, 2, 2, 'F'); doc.setTextColor(255); doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("TIERS-TEMPS", badgeX + 17.5, badgeY + 5.5, { align: 'center' }); badgeY += 10; }
            if (room.isAmen) { doc.setFillColor(230, 126, 34); doc.roundedRect(badgeX, badgeY, 35, 8, 2, 2, 'F'); doc.setTextColor(255); doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("AMÉNAGEMENT", badgeX + 17.5, badgeY + 5.5, { align: 'center' }); }

            const currentSlots = room.isTT ? slotsTT : slotsStd;
            const roomType = room.isTT ? 'tt' : 'std';
            const nbSurv = DB.config.nbSurv || 1;
            let scheduleData = [];
            currentSlots.forEach((slot, sIdx) => {
                let profs = [];
                const slotKeyIdx = slot.originalIdx !== undefined ? slot.originalIdx : 0;
                for (let i = 0; i < nbSurv; i++) {
                    const key = `${examIdx}_${room.nom}_${roomType}_${slotKeyIdx}_${i}`;
                    if (DB.planning[key]) profs.push(DB.planning[key]);
                }
                scheduleData.push([`${slot.start} - ${slot.end}`, profs.join("\n")]);
            });

            doc.autoTable({
                head: [[room.isTT ? "Horaires (TT)" : "Horaires (Std)", 'Surveillants']], body: scheduleData, startY: startY + 45, margin: { left: covX }, tableWidth: covW, theme: 'grid',
                headStyles: { fillColor: [44, 62, 80], fontSize: 11, halign: 'center' }, styles: { fontSize: 11, cellPadding: 4, valign: 'middle' },
                columnStyles: { 0: { cellWidth: 40, halign: 'center', fontStyle: 'bold' } }
            });

            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14); doc.setTextColor(39, 174, 96); doc.setFont("helvetica", "bold"); doc.text("ACTIONS À RÉALISER :", covX, finalY);
            const checklistBody = txtActions.split('\n').filter(l => l.trim()).map(l => ["", l.replace(/^-\s*/, '').trim()]);
            doc.autoTable({
                head: [['Fait', 'Description de l\'action']], body: checklistBody, startY: finalY + 5, margin: { left: covX }, tableWidth: covW, theme: 'grid',
                styles: { fontSize: 10, cellPadding: 3, valign: 'middle', lineColor: [150, 150, 150] }, headStyles: { fillColor: [232, 248, 245], textColor: [22, 160, 133], fontStyle: 'bold' },
                columnStyles: { 0: { cellWidth: 15 } }
            });

            // --- PAGE 2 : VERSO ---
            doc.addPage("a3", "l");
            doc.setDrawColor(200); doc.setLineDash([5, 5], 0); doc.line(HALF_W, 0, HALF_W, PG_H); doc.setLineDash([]);
            doc.setFontSize(16); doc.setTextColor(41, 128, 185); doc.setFont("helvetica", "bold"); doc.text("CONSIGNES SURVEILLANTS", M + (HALF_W - 2 * M) / 2, 20, { align: 'center' });
            doc.setDrawColor(41, 128, 185); doc.setLineWidth(0.5); doc.line(M, 25, M + (HALF_W - 2 * M), 25);
            doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(txtProfs, HALF_W - 2 * M), M, 35);
            const rX = HALF_W + M; const rW = HALF_W - (2 * M);
            doc.setFontSize(16); doc.setTextColor(211, 84, 0); doc.setFont("helvetica", "bold"); doc.text("CONSIGNES AUX CANDIDATS", rX + rW / 2, 20, { align: 'center' });
            doc.setFontSize(11); doc.setTextColor(100); doc.setFont("helvetica", "italic"); doc.text("(À lire à haute voix)", rX + rW / 2, 27, { align: 'center' });
            doc.setDrawColor(211, 84, 0); doc.setLineWidth(0.5); doc.line(rX, 30, rX + rW, 30);
            doc.setFontSize(11); doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(txtEleves, rW), rX, 40);
        });
    });
    doc.save(`Pochettes_Surveillants_${examTitle.replace(/[^A-Z0-9]+/g, '_')}_${year}.pdf`);
};


// =========================================================================
// === MODULE AUTOMATISATION : CORRECTION DOUBLE AFFECTATION & OPTIMISATION ===
// =========================================================================

// --- 1. GÉNÉRATION AUTOMATIQUE (Auto-Fill) ---
window.autoFillPlanning = function () {
    if (!DB.edt) DB.edt = { cancelled: [], maintained: [] };

    const hasCancelledEdt = DB.edt.cancelled && DB.edt.cancelled.length > 0;
    const hasMaintainedEdt = DB.edt.maintained && DB.edt.maintained.length > 0;
    const hasAnyEdt = hasCancelledEdt || hasMaintainedEdt;
    const activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);

    if (!DB.teachers || DB.teachers.length === 0) {
        showToast("⚠️ Aucun professeur n'est configuré.", 'warning');
        return;
    }
    if (activeRooms.length === 0) {
        showToast("⚠️ Aucune salle active. Faites d'abord la répartition des élèves.", 'warning');
        return;
    }

    if (!hasCancelledEdt) {
        const msg = hasAnyEdt
            ? "🚀 LANCER L'AFFECTATION HSE ?\nAucun cours annulé n'est chargé. Les cours maintenus seront évités, puis les autres surveillances seront réparties automatiquement par demi-journée."
            : "🚀 LANCER L'AFFECTATION HSE ?\nAucun import EDT n'est chargé. Les professeurs seront affectés automatiquement au-delà de leurs disponibilités ordinaires, avec une seule salle par demi-journée.";
        showConfirm(msg, () => {
            if (typeof createActionBackup === 'function') createActionBackup('Avant planning automatique');
            autoFillPlanningWithoutEdt(activeRooms);
        });
        return;
    }

	    showConfirm("🚀 LANCER L'AFFECTATION ?\nPriorité aux profs du fichier Vert (Dû).", () => {
	        if (typeof createActionBackup === 'function') createActionBackup('Avant planning automatique');
	        clearActivePlanningSlots(activeRooms);
	        cleanupPlanningAssignments();
	        const nbSurv = DB.config.nbSurv || 1;
    let countDue = 0, countHSE = 0, countDict = 0;

    // --- COMPARATEUR DE NOMS (Mots clés) ---
    // Gère "CONAN-JANIN" vs "CONAN"
    const normalize = (s) => s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, " ").split(" ").filter(w => w.length > 2);
    const namesMatch = (n1, n2) => {
        const t1 = normalize(n1);
        const t2 = normalize(n2);
        // Si un mot de 3 lettres+ est commun, c'est la même personne
        return t1.some(w => t2.includes(w)) || t2.some(w => t1.includes(w));
    };

    // --- BOUCLE PAR PHASES ---
    ['PHASE_DUE', 'PHASE_HSE'].forEach(phase => {

        DB.exams.forEach((exam, examIdx) => {
            // Récupération de la date de l'examen (Jour/Mois)
            const [y, mStr, dStr] = exam.date.split('-');
            const examDayKey = `${parseInt(dStr)}/${parseInt(mStr) - 1}`; // ex: "16/2" pour 16 mars

            const activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);

            activeRooms.forEach(room => {
                const isRTt = (room.isTT === true || room.isTT === 'true');
                const slots = isRTt ? window.getComputedSlots(exam, 'tt') : window.getComputedSlots(exam, 'std');
                const slotType = isRTt ? 'tt' : 'std';

                slots.forEach((slot, sIdx) => {
                    // Conversion créneau exam en minutes
                    const [h1, m1] = slot.start.split(':').map(Number);
                    const [h2, m2] = slot.end.split(':').map(Number);
                    const sStartMin = h1 * 60 + m1;
                    const sEndMin = h2 * 60 + m2;

                    // On remplit les N places
                    const limit = room.nbSurv || 1; // <--- MODIFICATION ICI

                    // On remplit les N places de CETTE salle
                    for (let i = 0; i < limit; i++) {
                        const planKey = `${examIdx}_${room.nom}_${slotType}_${sIdx}_${i}`;

                        let bestCandidate = null;

                        if (phase === 'PHASE_DUE') {
                            // On cherche un prof LIBÉRÉ
                            // 1. On filtre l'Excel pour ne garder que ceux du BON JOUR et BON HORAIRE
                            const availableProfs = DB.edt.cancelled.filter(c => {
                                // Même jour ?
                                if (c.dayKey !== examDayKey) return false;
                                // Chevauchement ? (CoursDebut < SurvFin ET CoursFin > SurvDebut)
                                if (!(c.startMin < sEndMin && c.endMin > sStartMin)) return false;
                                return true;
                            });

                            // 2. On essaie de trouver ces profs dans notre base
                            for (let c of availableProfs) {
                                const dbProf = DB.teachers.find(t => namesMatch(t.nom, c.profName));
                                if (!dbProf) continue; // Prof excel non trouvé en base

                                const fullName = window.getTeacherPlanningName(dbProf);
                                // 3. Est-il déjà occupé ailleurs ?
                                if (window.checkTeacherCollision(fullName, exam.date, slot.start, slot.end, planKey)) continue;

                                // 4. Est-il dans la liste ROUGE (Maintenu) ?
                                const isRed = DB.edt.maintained && DB.edt.maintained.some(m =>
                                    m.dayKey === examDayKey &&
                                    (m.startMin < sEndMin && m.endMin > sStartMin) &&
                                    namesMatch(m.profName, fullName)
                                );
                                if (isRed) continue;

                                bestCandidate = fullName;
                                break; // On a trouvé un DÛ ! On le prend.
                            }
                            if (bestCandidate) countDue++;
                        }
                        else {
                            // ===========================================
                            // PHASE HSE (Bouchage de trous)
                            // ===========================================

                            // On mélange les profs pour l'équité
                            const shuffled = [...DB.teachers].sort(() => 0.5 - Math.random());

                            const winner = shuffled.find(t => {
                                // 1. Vérification REFUS HSE (Nouveau !)
                                // Si le prof a coché "Non", on le saute direct
                                if (t.noHSE === true) return false;

                                // 2. Vérifications Classiques
                                const name = window.getTeacherPlanningName(t);

                                // Collision Planning ?
                                if (window.checkTeacherCollision(name, exam.date, slot.start, slot.end, planKey)) return false;

                                // Liste Rouge (Maintenus) ?
                                const isRed = DB.edt.maintained && DB.edt.maintained.some(m =>
                                    m.dayKey === examDayKey &&
                                    (m.startMin < sEndMin && m.endMin > sStartMin) &&
                                    namesMatch(m.profName, name)
                                );
                                if (isRed) return false;

                                return true;
                            });

                            if (winner) {
                                bestCandidate = window.getTeacherPlanningName(winner);
                                countHSE++;
                            }
                        }

                        if (bestCandidate) DB.planning[planKey] = bestCandidate;
                    }
                });
            });
        });
    });

    const dictStats = fillDictationTeachers(activeRooms);
    countDict = dictStats.filled;
    fillReserveTeachersForExistingPlanning(activeRooms);
    renderPlanning();
    showAlertModal('Terminé !\nVERT (Dû) : ' + countDue + '\nBLANC (HSE) : ' + countHSE + '\nDICTÉE : ' + countDict, 'success');
    });
};

function getPlanningHalfDayKey(exam, slot) {
    const startMin = window.toMin(slot.start);
    const half = startMin < 12 * 60 ? 'AM' : 'PM';
    return `${exam.date}_${half}`;
}

function isTeacherBusyInMaintainedEdt(teacher, exam, slot) {
    if (!DB.edt || !DB.edt.maintained || DB.edt.maintained.length === 0) return false;
    const startObj = window.getFullDate(exam.date, slot.start);
    const endObj = window.getFullDate(exam.date, slot.end);
    const status = getProfStatusForSlot(teacher, startObj, endObj);
    return status.code === 'BUSY_CLASS';
}

function getTeacherLoad(planning) {
    const loads = {};
    Object.entries(planning || {}).forEach(([key, name]) => {
        if (!name) return;
        if (!getPlanningDuty(key)) return;
        const cleanName = name.replace(/\s+/g, " ").trim();
        loads[cleanName] = (loads[cleanName] || 0) + 1;
    });
    return loads;
}

function getTeacherDayMap(planning) {
    const days = {};
    Object.entries(planning || {}).forEach(([key, name]) => {
        if (!name) return;
        const duty = getPlanningDuty(key);
        if (!duty) return;
        const cleanName = name.replace(/\s+/g, " ").trim();
        const exam = duty.exam;
        if (!exam.date) return;
        if (!days[cleanName]) days[cleanName] = new Set();
        days[cleanName].add(exam.date);
    });
    return days;
}

function fillDictationTeachers(activeRooms, loads = getTeacherLoad(DB.planning), teacherDays = getTeacherDayMap(DB.planning)) {
    let filled = 0;
    let missing = 0;
    const eligibleTeachers = DB.teachers.filter(t => t.noHSE !== true);
    const teacherPool = eligibleTeachers.length > 0 ? eligibleTeachers : DB.teachers;

    DB.exams.forEach((exam, examIdx) => {
        activeRooms.forEach(room => {
            const slot = getDictationSlot(exam, room);
            if (!slot) return;
            const key = getDictationKey(examIdx, room.nom);
            const reserves = ensurePlanningReserve();
            const reservedThisExam = new Set([reserves[getReserveKey(examIdx, 0)], reserves[getReserveKey(examIdx, 1)]].filter(Boolean));
            delete DB.planning[key];

            const candidates = teacherPool
                .map(teacher => ({ teacher, name: window.getTeacherPlanningName(teacher) }))
                .filter(({ teacher, name }) => {
                    if (!name) return false;
                    if (reservedThisExam.has(name)) return false;
                    if (window.checkTeacherCollision(name, exam.date, slot.start, slot.end, key)) return false;
                    if (isTeacherBusyInMaintainedEdt(teacher, exam, slot)) return false;
                    return true;
                });

            if (candidates.length === 0) {
                missing++;
                return;
            }

            const winner = candidates.map(({ teacher, name }) => {
                const days = teacherDays[name] || new Set();
                return {
                    name,
                    score:
                        (isFrenchTeacher(teacher) ? 0 : 1000) +
                        ((loads[name] || 0) * 50) +
                        (days.has(exam.date) ? 0 : 80) +
                        (days.size * 8)
                };
            }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))[0];

            DB.planning[key] = winner.name;
            loads[winner.name] = (loads[winner.name] || 0) + 1;
            if (!teacherDays[winner.name]) teacherDays[winner.name] = new Set();
            teacherDays[winner.name].add(exam.date);
            filled++;
        });
    });

    return { filled, missing };
}

function clearActivePlanningSlots(activeRooms) {
    const reserves = ensurePlanningReserve();
    DB.exams.forEach((exam, examIdx) => {
        activeRooms.forEach(room => {
            const isRTt = (room.isTT === true || room.isTT === 'true');
            const slotType = isRTt ? 'tt' : 'std';
            const slots = window.getComputedSlots(exam, slotType);
            const limit = room.nbSurv || DB.config.nbSurv || 1;

            slots.forEach(slot => {
                const slotIdx = slot.originalIdx !== undefined ? slot.originalIdx : 0;
                for (let i = 0; i < limit; i++) {
                    delete DB.planning[`${examIdx}_${room.nom}_${slotType}_${slotIdx}_${i}`];
                }
            });
            delete DB.planning[getDictationKey(examIdx, room.nom)];
        });
        delete reserves[getReserveKey(examIdx, 0)];
        delete reserves[getReserveKey(examIdx, 1)];
    });
}

function fillReserveTeachersForExistingPlanning(activeRooms) {
    const reserves = ensurePlanningReserve();
    const loads = getTeacherLoad(DB.planning);
    const teacherDays = getTeacherDayMap(DB.planning);
    const eligibleTeachers = DB.teachers.filter(t => t.noHSE !== true);
    const teacherPool = eligibleTeachers.length > 0 ? eligibleTeachers : DB.teachers;

    DB.exams.forEach((exam, examIdx) => {
        const slot = getExamReserveSlot(exam);
        const reservedForExam = new Set();
        delete reserves[getReserveKey(examIdx, 0)];
        delete reserves[getReserveKey(examIdx, 1)];

        for (let reserveIdx = 0; reserveIdx < 2; reserveIdx++) {
            const candidates = teacherPool
                .map(teacher => ({ teacher, name: window.getTeacherPlanningName(teacher) }))
                .filter(({ teacher, name }) => {
                    if (!name || reservedForExam.has(name)) return false;
                    if (window.checkTeacherCollision(name, exam.date, slot.start, slot.end, getReserveKey(examIdx, reserveIdx))) return false;
                    if (isTeacherBusyInMaintainedEdt(teacher, exam, slot)) return false;
                    return true;
                });

            if (candidates.length === 0) continue;

            const minLoad = Math.min(...candidates.map(({ name }) => loads[name] || 0));
            const winner = candidates.map(({ name }) => {
                const days = teacherDays[name] || new Set();
                return {
                    name,
                    score: ((loads[name] || 0) - minLoad) * 60 + (days.has(exam.date) ? 0 : 80) + days.size * 8
                };
            }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))[0];

            reserves[getReserveKey(examIdx, reserveIdx)] = winner.name;
            reservedForExam.add(winner.name);
            loads[winner.name] = (loads[winner.name] || 0) + 1;
            if (!teacherDays[winner.name]) teacherDays[winner.name] = new Set();
            teacherDays[winner.name].add(exam.date);
        }
    });
}

function autoFillPlanningWithoutEdt(activeRooms) {
    const roomKeeper = {};
    const teacherHalfDayRoom = {};
    const reserves = ensurePlanningReserve();

    clearActivePlanningSlots(activeRooms);
    cleanupPlanningAssignments();

    const loads = getTeacherLoad(DB.planning);
    const teacherDays = getTeacherDayMap(DB.planning);
    let countHSE = 0;
    let countDict = 0;
    let missing = 0;

    const getTeacherName = (teacher) => window.getTeacherPlanningName(teacher);
    const eligibleTeachers = DB.teachers.filter(t => t.noHSE !== true);
    const fallbackTeachers = eligibleTeachers.length > 0 ? eligibleTeachers : DB.teachers;

    const pickTeacher = (exam, examIdx, slot, room, slotType, slotIdx, survIdx, planKey) => {
        const halfDayKey = getPlanningHalfDayKey(exam, slot);
        const keeperKey = `${halfDayKey}_${room.nom}_${survIdx}`;
        const keptName = roomKeeper[keeperKey];

        const candidates = fallbackTeachers
            .map(teacher => ({ teacher, name: getTeacherName(teacher) }))
            .filter(({ teacher, name }) => {
                if (!name) return false;
                if (window.checkTeacherCollision(name, exam.date, slot.start, slot.end, planKey)) return false;
                if (isTeacherBusyInMaintainedEdt(teacher, exam, slot)) return false;

                const occupiedRoom = teacherHalfDayRoom[`${halfDayKey}_${name}`];
                return !occupiedRoom || occupiedRoom === room.nom;
            });

        if (candidates.length === 0) return null;

        const minLoad = Math.min(...candidates.map(({ name }) => loads[name] || 0));

        const keptTeacher = keptName ? DB.teachers.find(t => getTeacherName(t) === keptName) : null;
        const keptIsValid = keptName && candidates.some(({ name }) => name === keptName);
        if (keptIsValid && (!keptTeacher || !isTeacherBusyInMaintainedEdt(keptTeacher, exam, slot)) && (loads[keptName] || 0) <= minLoad + 1) {
            return keptName;
        }

        const scored = candidates.map(({ teacher, name }) => {
            const load = loads[name] || 0;
            const days = teacherDays[name] || new Set();
            const alreadyThisDay = days.has(exam.date);
            const occupiedRoom = teacherHalfDayRoom[`${halfDayKey}_${name}`];
            const sameRoomHalfDay = occupiedRoom === room.nom;

            return {
                teacher,
                name,
                score:
                    ((load - minLoad) * 60) +
                    (alreadyThisDay ? 0 : 80) +
                    (days.size * 8) +
                    (sameRoomHalfDay ? -40 : 0)
            };
        }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));

        const winner = scored[0];

        if (!winner) return null;

        const name = winner.name;
        roomKeeper[keeperKey] = name;
        teacherHalfDayRoom[`${halfDayKey}_${name}`] = room.nom;
        return name;
    };

    const pickReserveTeacher = (exam, examIdx, slot, reserveIdx) => {
        const halfDayKey = getPlanningHalfDayKey(exam, slot);
        const key = getReserveKey(examIdx, reserveIdx);
        const alreadyReserved = new Set([reserves[getReserveKey(examIdx, 0)], reserves[getReserveKey(examIdx, 1)]].filter(Boolean));

        const candidates = fallbackTeachers
            .map(teacher => ({ teacher, name: getTeacherName(teacher) }))
            .filter(({ teacher, name }) => {
                if (!name) return false;
                if (alreadyReserved.has(name)) return false;
                if (window.checkTeacherCollision(name, exam.date, slot.start, slot.end, key)) return false;
                if (isTeacherBusyInMaintainedEdt(teacher, exam, slot)) return false;
                return !teacherHalfDayRoom[`${halfDayKey}_${name}`];
            });

        if (candidates.length === 0) return null;

        const minLoad = Math.min(...candidates.map(({ name }) => loads[name] || 0));
        const scored = candidates.map(({ name }) => {
            const load = loads[name] || 0;
            const days = teacherDays[name] || new Set();
            const alreadyThisDay = days.has(exam.date);

            return {
                name,
                score:
                    ((load - minLoad) * 60) +
                    (alreadyThisDay ? 0 : 80) +
                    (days.size * 8)
            };
        }).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));

        const winnerName = scored[0].name;
        reserves[key] = winnerName;
        teacherHalfDayRoom[`${halfDayKey}_${winnerName}`] = 'RESERVE';
        loads[winnerName] = (loads[winnerName] || 0) + 1;
        if (!teacherDays[winnerName]) teacherDays[winnerName] = new Set();
        teacherDays[winnerName].add(exam.date);
        return winnerName;
    };

    DB.exams.forEach((exam, examIdx) => {
        activeRooms.forEach(room => {
            if (!room.nbSurv) room.nbSurv = DB.config.nbSurv || 1;
            const isRTt = (room.isTT === true || room.isTT === 'true');
            const slotType = isRTt ? 'tt' : 'std';
            const slots = window.getComputedSlots(exam, slotType);

            slots.forEach((slot) => {
                const slotIdx = slot.originalIdx !== undefined ? slot.originalIdx : 0;
                const limit = room.nbSurv || DB.config.nbSurv || 1;

                for (let i = 0; i < limit; i++) {
                    const planKey = `${examIdx}_${room.nom}_${slotType}_${slotIdx}_${i}`;
                    const teacherName = pickTeacher(exam, examIdx, slot, room, slotType, slotIdx, i, planKey);
                    if (teacherName) {
                        DB.planning[planKey] = teacherName;
                        loads[teacherName] = (loads[teacherName] || 0) + 1;
                        if (!teacherDays[teacherName]) teacherDays[teacherName] = new Set();
                        teacherDays[teacherName].add(exam.date);
                        countHSE++;
                    } else {
                        delete DB.planning[planKey];
                        missing++;
                    }
                }
            });
        });

        const reserveSlot = getExamReserveSlot(exam);
        for (let i = 0; i < 2; i++) {
            const reserveName = pickReserveTeacher(exam, examIdx, reserveSlot, i);
            if (reserveName) countHSE++;
            else missing++;
        }
    });

    const dictStats = fillDictationTeachers(activeRooms, loads, teacherDays);
    countDict = dictStats.filled;
    missing += dictStats.missing;

    renderPlanning();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof autoSave === 'function') autoSave();

    const mobilizedTeachers = Object.keys(teacherDays).filter(name => (loads[name] || 0) > 0).length;
    const teacherDayCount = Object.values(teacherDays).reduce((sum, days) => sum + days.size, 0);
    let msg = `Affectation HSE terminée.\n${countHSE} surveillance(s) positionnée(s) automatiquement.\n${countDict} renfort(s) Dictée positionné(s).\n${mobilizedTeachers} enseignant(s) mobilisé(s), ${teacherDayCount} venue(s) enseignant/jour.`;
    if (missing > 0) {
        msg += `\n\n⚠️ ${missing} emplacement(s) restent sans surveillant : pas assez de professeurs disponibles avec la règle "une salle par demi-journée".`;
    }
    showAlertModal(msg, missing > 0 ? 'warning' : 'success');
}

function getPlanningProposalStats(planning, reserves) {
    const assignments = Object.entries(planning || {}).filter(([, name]) => !!name);
    const teachers = new Set(assignments.map(([, name]) => name));
    const reserveCount = Object.values(reserves || {}).filter(Boolean).length;
    const dictCount = assignments.filter(([key]) => key.includes('_dictation_')).length;
    const byTeacher = {};
    assignments.forEach(([key, name]) => {
        const duty = getPlanningDuty(key);
        byTeacher[name] = byTeacher[name] || { count: 0, days: new Set() };
        byTeacher[name].count++;
        if (duty && duty.exam && duty.exam.date) byTeacher[name].days.add(duty.exam.date);
    });
    Object.values(reserves || {}).forEach(name => {
        if (!name) return;
        byTeacher[name] = byTeacher[name] || { count: 0, days: new Set() };
        byTeacher[name].count++;
    });
    const maxLoad = Math.max(0, ...Object.values(byTeacher).map(item => item.count));
    const minLoad = Math.min(...Object.values(byTeacher).map(item => item.count), maxLoad);
    const teacherDays = Object.values(byTeacher).reduce((sum, item) => sum + item.days.size, 0);
    return {
        assignments: assignments.length,
        teachers: teachers.size,
        reserveCount,
        dictCount,
        maxLoad,
        minLoad,
        teacherDays
    };
}

window.simulateAutoFillPlanning = function () {
    if (!DB.edt) DB.edt = { cancelled: [], maintained: [] };
    const hasCancelledEdt = DB.edt.cancelled && DB.edt.cancelled.length > 0;
    const hasMaintainedEdt = DB.edt.maintained && DB.edt.maintained.length > 0;
    const activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);

    if (!DB.teachers || DB.teachers.length === 0) return showToast("Aucun professeur n'est configuré.", 'warning');
    if (activeRooms.length === 0) return showToast("Aucune salle active. Faites d'abord la répartition.", 'warning');
    if (hasCancelledEdt) {
        showAlertModal("Simulation indisponible pour l'instant avec un fichier EDT de cours annulés.\n\nLa simulation est active pour le mode sans EDT ou avec cours maintenus uniquement.", 'info');
        return;
    }

    const previousPlanning = JSON.parse(JSON.stringify(DB.planning || {}));
    const previousReserve = JSON.parse(JSON.stringify(DB.planningReserve || {}));
    const originalAutoSave = window.autoSave;
    const originalRenderPlanning = window.renderPlanning;
    const originalRenderDashboard = window.renderDashboard;
    const originalShowAlertModal = window.showAlertModal;

    try {
        window.autoSave = function () {};
        window.renderPlanning = function () {};
        window.renderDashboard = function () {};
        window.showAlertModal = function () {};

        autoFillPlanningWithoutEdt(activeRooms);
        const proposalPlanning = JSON.parse(JSON.stringify(DB.planning || {}));
        const proposalReserve = JSON.parse(JSON.stringify(DB.planningReserve || {}));

        DB.planning = previousPlanning;
        DB.planningReserve = previousReserve;
        window.autoSave = originalAutoSave;
        window.renderPlanning = originalRenderPlanning;
        window.renderDashboard = originalRenderDashboard;
        window.showAlertModal = originalShowAlertModal;
        if (typeof renderPlanning === 'function') renderPlanning();

        DB.planningSimulation = {
            createdAt: new Date().toISOString(),
            planning: proposalPlanning,
            planningReserve: proposalReserve,
            withMaintainedEdt: hasMaintainedEdt
        };
        showPlanningSimulationResult(DB.planningSimulation);
    } catch (error) {
        DB.planning = previousPlanning;
        DB.planningReserve = previousReserve;
        window.autoSave = originalAutoSave;
        window.renderPlanning = originalRenderPlanning;
        window.renderDashboard = originalRenderDashboard;
        window.showAlertModal = originalShowAlertModal;
        console.error(error);
        showAlertModal(`Simulation impossible : ${error.message}`, 'error');
    }
};

function showPlanningSimulationResult(simulation) {
    const stats = getPlanningProposalStats(simulation.planning, simulation.planningReserve);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay-custom';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
    overlay.innerHTML = `
        <div style="background:white; width:min(620px, 96vw); border-radius:10px; box-shadow:0 15px 40px rgba(0,0,0,0.25); padding:22px;">
            <h3 style="margin:0 0 8px; color:#2c3e50;">Simulation du planning automatique</h3>
            <p style="margin:0 0 14px; color:#566573;">Le planning actuel n'a pas été modifié.</p>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin:14px 0;">
                <div style="background:#f8f9fa; border-radius:8px; padding:12px;"><b>${stats.assignments}</b><br><span style="font-size:0.85rem; color:#666;">affectations</span></div>
                <div style="background:#f8f9fa; border-radius:8px; padding:12px;"><b>${stats.teachers}</b><br><span style="font-size:0.85rem; color:#666;">enseignants mobilisés</span></div>
                <div style="background:#f8f9fa; border-radius:8px; padding:12px;"><b>${stats.reserveCount}</b><br><span style="font-size:0.85rem; color:#666;">réserves</span></div>
                <div style="background:#f8f9fa; border-radius:8px; padding:12px;"><b>${stats.dictCount}</b><br><span style="font-size:0.85rem; color:#666;">renforts dictée</span></div>
                <div style="background:#f8f9fa; border-radius:8px; padding:12px;"><b>${stats.minLoad} à ${stats.maxLoad}</b><br><span style="font-size:0.85rem; color:#666;">charges par enseignant</span></div>
                <div style="background:#f8f9fa; border-radius:8px; padding:12px;"><b>${stats.teacherDays}</b><br><span style="font-size:0.85rem; color:#666;">venues enseignant/jour</span></div>
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:18px; flex-wrap:wrap;">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay-custom').remove()">Ignorer</button>
                <button class="btn btn-primary" onclick="applyPlanningSimulation()">Appliquer cette proposition</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

window.applyPlanningSimulation = function () {
    const simulation = DB.planningSimulation;
    if (!simulation || !simulation.planning) return showToast("Aucune simulation disponible.", 'warning');
    if (typeof createActionBackup === 'function') createActionBackup('Avant application simulation planning');
    DB.planning = JSON.parse(JSON.stringify(simulation.planning));
    DB.planningReserve = JSON.parse(JSON.stringify(simulation.planningReserve || {}));
    delete DB.planningSimulation;
    document.querySelector('.modal-overlay-custom')?.remove();
    if (typeof renderPlanning === 'function') renderPlanning();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof autoSave === 'function') autoSave();
    showToast("Simulation appliquée au planning.", 'success');
};

// --- FONCTION D'OPTIMISATION (Avec Popup & Règle Multi-Profs) ---
// --- FONCTION D'OPTIMISATION AVANCÉE (Bouche-trous + Échanges) ---
window.optimizePlanningMoves = function (silentMode = false) {

    if (!silentMode) {
    }

    let fillsCount = 0;
    let swapsCount = 0;
    const nbSurv = DB.config.nbSurv || 1;

    // Helper: Qui est dans cette salle à ce créneau précis ?
    const getProfInSlot = (examIdx, roomNom, slotType, slotIdx, survIdx) => {
        return DB.planning[`${examIdx}_${roomNom}_${slotType}_${slotIdx}_${survIdx}`];
    };

    // Helper: Vérifier si un prof est déjà occupé AILLEURS sur ce créneau (Anti-Ubiquité)
    const isProfBusyInSlot = (profName, examIdx, slotType, slotIdx) => {
        const exam = DB.exams[examIdx];
        if (!exam) return false;

        const slots = slotType === 'tt'
            ? window.getComputedSlots(exam, 'tt')
            : window.getComputedSlots(exam, 'std');
        const slot = slots.find(s => (s.originalIdx !== undefined ? s.originalIdx : 0) === slotIdx) || slots[slotIdx];
        if (!slot) return false;

        return !!window.checkTeacherCollision(profName, exam.date, slot.start, slot.end, '');
    };

    // ==============================================================================
    // PHASE 1 : COMBLER LES TROUS (Logique existante, conservée pour la sécurité)
    // ==============================================================================
    DB.exams.forEach((exam, examIdx) => {
        const slotsStd = window.getComputedSlots(exam, 'std');
        const slotsTT = window.getComputedSlots(exam, 'tt');
        const activeRooms = DB.rooms.filter(r => (DB.distribution[r.nom] || []).length > 0);

        activeRooms.forEach(room => {
            const isRTt = (room.isTT === true || room.isTT === 'true');
            const slots = isRTt ? slotsTT : slotsStd;
            const slotType = isRTt ? 'tt' : 'std';

            slots.forEach((slot) => {
                const slotIdx = slot.originalIdx !== undefined ? slot.originalIdx : 0;

                for (let i = 0; i < nbSurv; i++) {
                    const planKey = `${examIdx}_${room.nom}_${slotType}_${slotIdx}_${i}`;

                    if (!DB.planning[planKey]) { // Si vide
                        let bestCandidate = null;
                        DB.teachers.forEach(t => {
                            if (t.noHSE) return; // Respect du refus HSE
	                            const fullName = window.getTeacherPlanningName(t);
                            if (isProfBusyInSlot(fullName, examIdx, slotType, slotIdx)) return;

                            // Vérif EDT (Dû)
                            const sStart = window.getFullDate(exam.date, slot.start);
                            const sEnd = window.getFullDate(exam.date, slot.end);
                            if (typeof getProfStatusForSlot === 'function') {
                                const st = getProfStatusForSlot(t, sStart, sEnd);
                                if (st.code === 'DUE') bestCandidate = fullName;
                            }
                        });

                        if (bestCandidate) {
                            DB.planning[planKey] = bestCandidate;
                            fillsCount++;
                        }
                    }
                }
            });
        });
    });

    // ==============================================================================
    // PHASE 2 : ÉCHANGES INTELLIGENTS (SWAP) - Le cœur de votre demande
    // ==============================================================================
    // On parcourt les créneaux deux par deux (t et t+1)

    DB.exams.forEach((exam, examIdx) => {
        const slotsStd = window.getComputedSlots(exam, 'std');
        const slotsTT = window.getComputedSlots(exam, 'tt');

        // On traite séparément les salles Standard et TT
        ['std', 'tt'].forEach(sType => {
            const currentSlots = (sType === 'std') ? slotsStd : slotsTT;
            // Pas d'optimisation possible s'il n'y a qu'un seul créneau
            if (currentSlots.length < 2) return;

            // On boucle sur les transitions : Créneau 0 -> 1, 1 -> 2, etc.
            for (let sIdx = 0; sIdx < currentSlots.length - 1; sIdx++) {
                const sNextIdx = sIdx + 1;

                // On regarde chaque salle
                DB.rooms.forEach(room => {
                    // On ne traite que les salles du bon type
                    const rIsTT = (room.isTT === true || room.isTT === 'true');
                    if ((sType === 'tt' && !rIsTT) || (sType === 'std' && rIsTT)) return;

                    // Pour chaque surveillant (si 2 par salle)
                    for (let k = 0; k < nbSurv; k++) {
                        const profAtT = getProfInSlot(examIdx, room.nom, sType, sIdx, k);
                        const profAtTNext = getProfInSlot(examIdx, room.nom, sType, sNextIdx, k);

                        // CAS A OPTIMISER :
                        // Le prof à T est "DUPONT".
                        // Le prof à T+1 est "DURAND".
                        // DUPONT n'est pas là. Où est-il ?
                        if (profAtT && profAtTNext && profAtT !== profAtTNext) {

                            // 1. Où est passé DUPONT (profAtT) au créneau suivant (sNextIdx) ?
                            let dupontFoundElsewhere = null; // {room: 'Salle 12', index: 0}

                            for (let otherRoom of DB.rooms) {
                                // On cherche dans les salles du même type (sinon horaires incompatibles)
                                const otherIsTT = (otherRoom.isTT === true || otherRoom.isTT === 'true');
                                if (otherIsTT !== rIsTT) continue;
                                if (otherRoom.nom === room.nom) continue; // C'est la salle courante

                                for (let j = 0; j < nbSurv; j++) {
                                    if (getProfInSlot(examIdx, otherRoom.nom, sType, sNextIdx, j) === profAtT) {
                                        dupontFoundElsewhere = { room: otherRoom.nom, k: j };
                                    }
                                }
                                if (dupontFoundElsewhere) break;
                            }

                            // 2. Si on a trouvé DUPONT ailleurs (ex: en Salle 12 avec DURAND à sa place ici)
                            if (dupontFoundElsewhere) {
                                // On a la situation :
                                // Salle A (ici) : T=Dupont, T+1=Durand
                                // Salle B (autre): T=...,    T+1=Dupont

                                // ACTION : On propose à DURAND d'aller en Salle B à T+1, et DUPONT revient en Salle A.
                                // Echange : Dupont prend Salle A (T+1), Durand prend Salle B (T+1).

                                const roomB = dupontFoundElsewhere.room;
                                const indexB = dupontFoundElsewhere.k;
                                const profDurand = profAtTNext;

                                // On effectue l'échange
                                const keySalleA_Next = `${examIdx}_${room.nom}_${sType}_${sNextIdx}_${k}`;
                                const keySalleB_Next = `${examIdx}_${roomB}_${sType}_${sNextIdx}_${indexB}`;

                                DB.planning[keySalleA_Next] = profAtT; // Dupont revient chez lui
                                DB.planning[keySalleB_Next] = profDurand; // Durand va ailleurs

                                swapsCount++;
                                // console.log(`Swap: ${profAtT} reste en ${room.nom}, ${profDurand} va en ${roomB}`);
                            }
                        }
                    }
                });
            }
        });
    });

    if (!silentMode) {
        renderPlanning();
        autoSave();
        let msg = "✅ Optimisation terminée.\n";
        if (fillsCount === 0 && swapsCount === 0) msg += "Le planning est déjà optimal.";
        else {
            if (fillsCount > 0) msg += `\n- ${fillsCount} trous comblés.`;
            if (swapsCount > 0) msg += `\n- ${swapsCount} échanges de salles effectués (Continuité).`;
        }
        showAlertModal(msg, 'success');
    }

    return fillsCount + swapsCount;
};
window.resetPlanning = function () {
    showConfirm("🗑️ Attention : Vous allez effacer TOUT le planning.\nContinuer ?", () => {
        if (typeof createActionBackup === 'function') createActionBackup('Avant reset planning');
        DB.planning = {};
        DB.planningReserve = {};
        renderPlanning();
        autoSave();
        showToast("✅ Planning réinitialisé.", 'success');
    });
}

// --- FONCTION UTILITAIRE : LOGO PROPORTIONNEL ---
function addSmartLogo(doc, x, y, size) {
    if (!DB.config.logo) return;
    try {
        // 1. Récupérer les vraies dimensions de l'image
        const props = doc.getImageProperties(DB.config.logo);
        const ratio = props.width / props.height;

        // On limite volontairement la zone d'en-tête : un logo trop grand mord sur les titres.
        const maxSize = Math.min(size || 28, 28);
        let w = maxSize;
        let h = maxSize;

        // 2. Calculer les nouvelles dimensions pour tenir dans le carré réservé.
        if (ratio > 1) {
            // Image rectangulaire (Paysage) -> On fixe la largeur, on réduit la hauteur
            h = maxSize / ratio;
        } else {
            // Image haute (Portrait) -> On fixe la hauteur, on réduit la largeur
            w = maxSize * ratio;
        }

        // 3. Centrer le logo dans sa zone et préserver un fond blanc lisible.
        const boxW = maxSize;
        const boxH = maxSize;
        const drawX = x + (boxW - w) / 2;
        const drawY = y + (boxH - h) / 2;
        doc.setFillColor(255, 255, 255);
        doc.rect(x - 1, y - 1, boxW + 2, boxH + 2, 'F');
        const format = props.fileType || 'PNG';
        doc.addImage(DB.config.logo, format, drawX, drawY, w, h, undefined, 'FAST');
    } catch (e) {
        // Sécurité si l'image est corrompue
        console.error("Erreur logo", e);
    }
}

// ============================================================
// === CORRECTIF ULTIME "AUTO-RÉPARATION" DES LABELS ===
// (Ne supprimez rien d'autre, collez ceci à la toute fin)
// ============================================================

// 1. On définit la liste de secours ICI pour être sûr à 100% qu'elle est accessible
const LABELS_SECOURS = [
    { code: "TTEMPS", color: "#8e44ad", name: "Tiers-Temps (Auto)" },
    { code: "DNBPRO", color: "#88f10f", name: "DNB Pro" },
    { code: "SEGPA", color: "#0f31f1", name: "SEGPA" },
    { code: "ULIS", color: "#e6f10f", name: "ULIS" },
    { code: "ORDI", color: "#e67e22", name: "Ordinateur" },
    { code: "LECT", color: "#27ae60", name: "Assistant Lecteur" },
    { code: "AESH", color: "#c0392b", name: "Présence AESH" },
    { code: "DICT", color: "#f1c40f", name: "Dictée Aménagée" },
    { code: "SCRIPT", color: "#16a085", name: "Scripteur" },
    { code: "SORT", color: "#95a5a6", name: "Sortie 1ère Heure" },
    { code: "TPSDECOMP", color: "#2c3e50", name: "Temps Décompté" }
];

// 2. On ÉCRASE la fonction d'affichage par une version qui se répare toute seule
window.renderLabels = function () {
    // Sécurité : on s'assure que DB existe
    if (typeof DB === 'undefined') return;
    if (!DB.config) DB.config = {};

    // --- LE CŒUR DU FIX ---
    // Si la liste des labels est vide ou inexistante, on la remplit DE FORCE
    if (!DB.config.labels || DB.config.labels.length === 0) {
        console.log("⚠️ Labels vides -> Réparation automatique immédiate.");
        DB.config.labels = []; // On initialise

        LABELS_SECOURS.forEach(def => {
            DB.config.labels.push({
                id: '_' + Math.random().toString(36).substr(2, 9), // ID Unique
                code: def.code,
                name: def.name,
                color: def.color
            });
        });

        // On sauvegarde cette réparation pour ne pas la refaire à chaque fois
        if (typeof saveDB === 'function') saveDB();
    }
    // -----------------------

    // Maintenant que la liste est sûre d'être pleine, on affiche
    const list = document.getElementById('labelsList');
    if (!list) return;

    let html = '';
    DB.config.labels.forEach(l => {
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:#f8f9fa; padding:5px; border-radius:4px; border-left: 5px solid ${l.color}">
            <div style="flex:1">
                <strong>${l.code}</strong>
                <span style="font-size:0.8em; color:#666; margin-left:10px;">${l.name || ''}</span>
            </div>
            <div>
                <button class="btn btn-sm btn-warning" onclick="editLabel('${l.code}')" style="font-size:0.7rem; padding:2px 6px;">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLabel('${l.code}')" style="font-size:0.7rem; padding:2px 6px;">🗑️</button>
            </div>
        </div>`;
    });
    list.innerHTML = html;

    // On force aussi la mise à jour des badges dans le tableau des élèves (partie droite)
    // car si les labels étaient vides, les élèves n'avaient pas de couleurs non plus
    if (typeof renderAmenagements === 'function' && document.getElementById('data-amenagements').classList.contains('active')) {
        renderAmenagements();
    }
};

// 3. On lance la fonction une première fois après 1 seconde pour initialiser
setTimeout(renderLabels, 1000);

// ============================================================
// === CORRECTIF : RESTAURATION DU BOUTON EXPORT AMÉNAGEMENTS ===
// (Collez ceci tout en bas du fichier)
// ============================================================

setTimeout(function () {
    // 1. On repère la barre de recherche dans l'onglet Aménagements
    const searchInput = document.getElementById('amenSearchInput');

    // Si la barre existe et que le bouton n'est pas encore là
    if (searchInput && !document.getElementById('btnRestoredExport')) {

        console.log("🔧 Restauration du bouton PDF Aménagements...");

        // 2. On configure le conteneur pour aligner la recherche et le bouton
        const container = searchInput.parentElement;
        container.style.display = "flex";
        container.style.gap = "10px"; // Espace entre les deux
        container.style.alignItems = "center";

        // 3. On crée le bouton manquant
        const btn = document.createElement('button');
        btn.id = 'btnRestoredExport'; // ID unique
        btn.className = "btn btn-dark"; // Style sombre standard
        btn.innerHTML = "🖨️ Imprimer Liste";
        btn.style.whiteSpace = "nowrap"; // Empêche le texte de se couper

        // 4. On relie le bouton à la fonction existante
        btn.onclick = function () {
            if (typeof openAmenagOptions === 'function') {
                openAmenagOptions();
            } else {
                showToast("Erreur critique : La fonction openAmenagOptions est introuvable.", 'error');
            }
        };

        // 5. On insère le bouton juste après la barre de recherche
        container.appendChild(btn);
    }
}, 1500); // On attend 1.5s pour être sûr que l'interface est chargée

// ============================================================
// === CORRECTIF : RÉPARATION DU CLIC SUR LES LABELS ===
// (Collez ceci tout en bas du fichier)
// ============================================================

// On remplace la fonction d'affichage par la version CORRIGÉE (avec le "this")
window.renderAmenagements = function () {
    // 1. Initialisation des filtres MEF si nécessaire
    const mefContainer = document.getElementById('mefCheckContainer');
    if (mefContainer && (!mefContainer.innerHTML.includes('input') && typeof DB !== 'undefined' && DB.students.length > 0)) {
        if (typeof updateMefCheckboxes === 'function') updateMefCheckboxes();
    }

    const tbody = document.getElementById('amenBody');
    if (!tbody) return;

    // 2. Récupération des filtres
    const searchVal = document.getElementById('amenSearchInput') ? document.getElementById('amenSearchInput').value.toLowerCase() : "";
    const checkboxes = document.querySelectorAll('.mef-checkbox');
    const checkedMefs = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    const ignoreMefFilter = (checkboxes.length === 0);

    tbody.innerHTML = "";

    // 3. Filtrage
    const filtered = DB.students.filter(s => {
        if (searchVal && !s.nom.toLowerCase().includes(searchVal) && !s.prenom.toLowerCase().includes(searchVal)) return false;

        if (!ignoreMefFilter) {
            if (s.mef && !checkedMefs.includes(s.mef)) return false;
            if (!s.mef && checkedMefs.length === 0) return false;
        }
        return true;
    });

    // 4. Affichage (AVEC LE FIX DU CLIC)
    filtered.sort((a, b) => a.nom.localeCompare(b.nom)).forEach(s => {
        let badges = "";
        const labelsDef = (DB.config && DB.config.labels) ? DB.config.labels : [];

        labelsDef.forEach(l => {
            const isActive = (s.labels || []).includes(l.code);

            // Style Visuel (Actif / Inactif)
            const style = isActive
                ? `background:${l.color}; color:white; border:1px solid ${l.color}; opacity:1; font-weight:bold;`
                : `background:white; color:#ccc; border:1px solid #ddd; opacity:0.5;`;

            // --- LE CORRECTIF EST ICI ---
            // On a ajouté ", this" dans les parenthèses de toggleStudentLabel
            badges += `<span onclick="toggleStudentLabel(${s.id}, '${l.code}', this)"
                       style="cursor:pointer; padding:4px 8px; border-radius:12px; font-size:0.75rem; margin-right:5px; transition:all 0.1s; display:inline-block; margin-bottom:3px; user-select:none; ${style}">
                       ${l.code}</span>`;
        });

        tbody.innerHTML += `
        <tr>
            <td style="font-weight:600;">${s.nom} <span style="font-weight:normal; font-size:0.9em">${s.prenom}</span></td>
            <td style="text-align:center; font-size:0.85rem;">${s.classe}</td>
            <td style="text-align:center; font-size:0.8rem; color:#2980b9;">${s.mef || '-'}</td>
            <td>${badges}</td>
        </tr>`;
    });
};

// On force le rafraîchissement immédiat pour appliquer le fix
if (document.getElementById('data-amenagements') && document.getElementById('data-amenagements').classList.contains('active')) {
    renderAmenagements();
}

// ============================================================
// === CORRECTIF VISUEL INSTANTANÉ (CLIC & COULEURS) ===
// (Collez ceci tout en bas du fichier)
// ============================================================

window.toggleStudentLabel = function (studentId, code, btnElement) {
    // 1. Récupération des données
    const s = DB.students.find(st => st.id === studentId);
    if (!s) return;
    if (!s.labels) s.labels = []; // Sécurité

    const labelConfig = DB.config.labels.find(l => l.code === code);
    if (!labelConfig) return;

    let isActive = false;

    // 2. Bascule de l'état (ON/OFF)
    if (s.labels.includes(code)) {
        // On désactive
        s.labels = s.labels.filter(l => l !== code);
        if (code === 'TTEMPS') s.tt = false;
        isActive = false;
    } else {
        // On active
        s.labels.push(code);
        if (code === 'TTEMPS') s.tt = true;
        isActive = true;
    }

    // 3. MISE À JOUR VISUELLE IMMÉDIATE (Le Correctif est ici)
    // On force le style CSS directement sur le bouton cliqué pour qu'il
    // ressemble exactement à ce qu'il sera après rechargement.
    if (btnElement) {
        if (isActive) {
            // Style ACTIF (Fond couleur, Texte blanc)
            btnElement.style.background = labelConfig.color;
            btnElement.style.color = "white";
            btnElement.style.border = `1px solid ${labelConfig.color}`;
            btnElement.style.opacity = "1";
            btnElement.style.fontWeight = "bold";
        } else {
            // Style INACTIF (Fond blanc, Texte gris)
            btnElement.style.background = "white";
            btnElement.style.color = "#ccc";
            btnElement.style.border = "1px solid #ddd";
            btnElement.style.opacity = "0.5";
            btnElement.style.fontWeight = "normal";
        }

        // Petit effet de ressort pour confirmer le clic visuellement
        btnElement.style.transform = "scale(0.90)";
        setTimeout(() => btnElement.style.transform = "scale(1)", 100);
    }

    // 4. Sauvegarde silencieuse (pour ne pas perdre la modif)
    if (typeof autoSave === 'function') autoSave();
};

// 3. On lance la vérification au démarrage
// importMissingLabels();


// ============================================================
// === EXTENSION : GESTION DYNAMIQUE DES ÉPREUVES (ADD/EDIT/DEL) ===
// ============================================================

// 1. Nouvelle fonction pour AJOUTER une épreuve
window.addExam = function () {
    // On prend la date de la dernière épreuve pour pré-remplir, ou la date du jour
    let defaultDate = DB.exams.length > 0 ? DB.exams[DB.exams.length - 1].date : "2026-06-01";

    DB.exams.push({
        name: "Nouvelle Épreuve",
        date: defaultDate,
        time: "09:00",
        timeTT: "09:00",
        durStd: 60,
        durTT: 80,
        slots: { std: [], tt: [] } // Important pour le découpage
    });

    renderExamTable();
    if (typeof saveActiveExamProfile === 'function') saveActiveExamProfile();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof autoSave === 'function') autoSave();
};

// 2. Nouvelle fonction pour SUPPRIMER une épreuve
window.removeExam = function (index) {
    const examName = DB.exams[index].name;

    // Alerte de sécurité car cela impacte le planning
    showConfirm(`⚠️ Supprimer l'épreuve "${examName}" ?\n\nAttention : Si vous avez déjà fait un planning ou une répartition pour cette épreuve, les données associées seront décalées ou perdues.`, () => {

        // Suppression de l'épreuve
        DB.exams.splice(index, 1);

        // Nettoyage du planning pour éviter les clés orphelines (Optionnel mais propre)
        // On supprime les entrées de planning qui commençaient par cet index
        Object.keys(DB.planning).forEach(key => {
            if (key.startsWith(index + "_")) {
                delete DB.planning[key];
            }
        });

        if (typeof saveActiveExamProfile === 'function') saveActiveExamProfile();
        if (typeof renderDashboard === 'function') renderDashboard();
        renderExamTable();
        if (typeof autoSave === 'function') autoSave();
    });
};

// 3. Surcharge de la fonction d'affichage du tableau (RENDER)
// Cette version remplace la version précédente pour inclure les boutons et les inputs
window.renderExamTable = function () {
    const tbody = document.getElementById('examTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    DB.exams.forEach((e, i) => {
        // Logique du bouton "Découpage" (conservée)
        const hasSlots = e.slots && (e.slots.std.length > 1 || e.slots.tt.length > 1);
        const btnStyle = hasSlots ? "background:#27ae60; color:white;" : "background:#95a5a6; color:white;";
        const btnText = hasSlots ? "✅ Découpé" : "✂️ Découper";

        // Construction de la ligne
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>
            <div style="display:flex; gap:5px; margin-bottom:4px;">
                <input type="text" value="${e.name}"
                       style="font-weight:bold; width:100%; border:1px solid #ccc; padding:4px;"
                       onchange="updateExam(${i},'name',this.value)">

                <button class="btn btn-danger btn-sm" onclick="removeExam(${i})"
                        style="padding:2px 8px; font-size:1rem;" title="Supprimer">🗑️</button>
            </div>
            <button class="btn btn-sm" style="${btnStyle}; font-size:0.75rem; padding:2px 6px; width:100%;"
                    onclick="openSlotConfig(${i})">${btnText}</button>
        </td>
        <td style="vertical-align:top"><input type="date" value="${e.date}" onchange="updateExam(${i},'date',this.value)"></td>
        <td style="vertical-align:top"><input type="time" value="${e.time}" onchange="updateExam(${i},'time',this.value)"></td>
        <td style="vertical-align:top"><input type="time" value="${e.timeTT || e.time}" style="background-color:#fef9e7;" onchange="updateExam(${i},'timeTT',this.value)"></td>

        <td style="vertical-align:top"><input type="number" value="${e.durStd}" style="width:70px; text-align:center" onchange="updateExam(${i},'durStd',this.value)"></td>
        <td style="vertical-align:top; color:var(--tt-color)"><input type="number" value="${e.durTT}" style="width:70px; text-align:center" onchange="updateExam(${i},'durTT',this.value)"></td>
        `;
        tbody.appendChild(row);
    });

    // Ajout de la ligne "Ajouter une épreuve"
    const addRow = document.createElement('tr');
    addRow.innerHTML = `
        <td colspan="6" style="text-align:center; background-color:#f8f9fa; padding:10px;">
            <button class="btn btn-success" onclick="addExam()" style="border-style:dashed;">➕ Ajouter une épreuve</button>
        </td>
    `;
    tbody.appendChild(addRow);
};

// On force le rafraichissement immédiat pour voir les changements
renderExamTable();

// Sécurité anti-fermeture accidentelle
window.addEventListener('beforeunload', function (e) {
    // Si on a des élèves, on demande confirmation avant de fermer
    if (DB.students && DB.students.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Affiche le message standard du navigateur
    }
});



// ============================================================
// === MODULE ORAUX (RE-IMPLEMENTATION) ===
// ============================================================
