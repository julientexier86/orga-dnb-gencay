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

    // On parcourt TOUT le planning
    for (const [key, assignedTeacher] of Object.entries(DB.planning)) {
        if (assignedTeacher !== teacherName) continue; // Pas le même prof
        if (key === myKey) continue; // C'est moi-même

        // Décodage de la clé : examIdx_roomName_type_slotIdx_survIdx
        const parts = key.split('_');
        if (parts.length < 5) continue; // Ancienne clé ou invalide

        const otherExamIdx = parseInt(parts[0]);
        const otherRoom = parts[1];
        const otherType = parts[2];
        const otherSlotIdx = parseInt(parts[3]);

        const otherExam = DB.exams[otherExamIdx];

        // Règle 1 : Même jour ?
        if (otherExam.date !== dateStr) continue;

        // Règle 2 : Chevauchement horaire ?
        // On récupère les horaires du créneau "concurrent"
        let otherSlot = null;
        if (otherExam.slots && otherExam.slots[otherType]) {
            otherSlot = otherExam.slots[otherType][otherSlotIdx];
        }

        if (otherSlot) {
            const otherStart = timeToMin(otherSlot.start);
            const otherEnd = timeToMin(otherSlot.end);

            // Formule collision : Max(Starts) < Min(Ends)
            if (Math.max(startMin, otherStart) < Math.min(endMin, otherEnd)) {
                return otherRoom; // Retourne le nom de la salle où il y a conflit
            }
        }
    }
    return false; // Pas de conflit
}

// Helpers Temps
function timeToMin(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
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

window.exportConvocationTeachers = function () {
    DB.config.schoolName = document.getElementById('schoolName').value;
    DB.config.year = document.getElementById('sessionYear').value;
    if (!DB.config.director) DB.config.director = { civ: "M. le Principal", name: "" };

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let count = 0;

    DB.teachers.forEach(teacher => {
        const fullName = `${teacher.nom} ${teacher.prenom}`;
        let duties = [];

        // Scan du planning (Nouvelle structure par Slot)
        for (const [key, assignedName] of Object.entries(DB.planning)) {
            if (assignedName !== fullName) continue;

            const parts = key.split('_');
            if (parts.length < 5) continue; // Skip vieilles données

            const examIdx = parseInt(parts[0]);
            const roomName = parts[1];
            const type = parts[2];
            const slotIdx = parseInt(parts[3]);

            const exam = DB.exams[examIdx];
            // Récupération horaire précis du slot
            let slot = { start: "??", end: "??" };
            if (exam.slots && exam.slots[type] && exam.slots[type][slotIdx]) {
                slot = exam.slots[type][slotIdx];
            } else {
                // Fallback : Calcul basé sur l'horaire global de l'épreuve
                const startTime = (type === 'tt') ? (exam.timeTT || exam.time) : exam.time;
                const duration = (type === 'tt') ? exam.durTT : exam.durStd;

                if (startTime && duration) {
                    slot = {
                        start: startTime,
                        end: addMinutes(startTime, duration)
                    };
                }
            }

            duties.push({
                date: exam.date,
                start: slot.start,
                end: slot.end,
                name: exam.name,
                room: roomName,
                isTT: (type === 'tt')
            });
        }

        if (duties.length === 0) return;

        if (count > 0) doc.addPage();
        count++;

        // --- MÊME HEADER QUE PRECEDEMMENT ---
        addSmartLogo(doc, 15, 10, 45);
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text("DNB BLANC", 195, 12, { align: 'right' });
        doc.text(`Session ${DB.config.year}`, 195, 17, { align: 'right' });

        doc.setFontSize(14); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
        doc.text(DB.config.schoolName || "Collège", 105, 18, { align: 'center' });

        doc.setFontSize(18); doc.setTextColor(0);
        doc.text("CONVOCATION SURVEILLANCE", 105, 40, { align: 'center' });

        // Info Prof
        doc.setFillColor(248, 249, 250); doc.setDrawColor(44, 62, 80);
        doc.rect(15, 50, 180, 20, 'FD');
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text(`${teacher.civ || ""} ${fullName}`, 20, 62);

        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text("Planning de vos créneaux de surveillance :", 15, 85);

        // Tri chronologique : Date puis Heure Début
        duties.sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return a.start.localeCompare(b.start);
        });

        let body = duties.map(d => {
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
            head: [['Date', 'Créneau', 'Épreuve', 'Salle']],
            body: body,
            startY: 90,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { cellPadding: 3, valign: 'middle', fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 35, fontStyle: 'bold' },
                3: { cellWidth: 25, halign: 'center' }
            }
        });

        // --- SECTION ORAUX ---
        let currentY = doc.lastAutoTable.finalY + 10;

        if (DB.stage && DB.stage.juries) {
            // Filter juries where teacher is participating
            let myJuries = DB.stage.juries.filter(j => j.members && j.members.includes(teacher.id));

            if (myJuries.length > 0) {
                myJuries.forEach(jury => {
                    // Page Break Check
                    if (currentY + 30 > 270) { doc.addPage(); currentY = 20; }

                    // Violet Box
                    doc.setFillColor(142, 68, 173); // Wisteria Violet
                    doc.rect(15, currentY, 180, 22, 'F');

                    doc.setTextColor(255, 255, 255); // White
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.text(`🎯 JURY ORAL`, 20, currentY + 7);

                    doc.setFontSize(10);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Date : ${DB.stage.config.date}`, 20, currentY + 15);
                    doc.text(`Heure : ${DB.stage.config.start} - ${DB.stage.config.end}`, 80, currentY + 15);

                    let rObj = DB.rooms.find(r => r.id === jury.room);
                    let rName = rObj ? rObj.nom : "Salle ?";
                    doc.text(`Salle : ${rName}`, 140, currentY + 15);
                    doc.text(`Groupe : ${jury.name}`, 20, currentY + 20);

                    currentY += 28; // Space for next element
                });
            }
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

    doc.save("Convocations_Profs_Details.pdf");
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

window.getFullDate = function (dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-');
    const [hh, mm] = timeStr.split(':');
    return new Date(y, m - 1, d, hh, mm);
};

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
                        const currentVal = DB.planning[planKey] || "";

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
                            const fullName = `${t.nom} ${t.prenom}`;
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
        table.appendChild(tbody);
        wrapper.appendChild(table);
        container.appendChild(wrapper);
    });
};

// =========================================================
// --- VUE GLOBALE PROFESSEURS ---
function renderPlanningProfs() {
    const container = document.getElementById('profViewContainer');
    if (!container) return;

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
        const fullName = `${t.nom} ${t.prenom}`;

        Object.keys(DB.planning).forEach(key => {
            if (DB.planning[key] === fullName) {
                const parts = key.split('_');
                const examIdx = parseInt(parts[0]);
                const type = parts[2];
                const slotIdx = parseInt(parts[3]);

                const exam = DB.exams[examIdx];
                let slotDur = 0;

                if (exam.slots && exam.slots[type] && exam.slots[type][slotIdx]) {
                    const s = exam.slots[type][slotIdx];
                    slotDur = window.toMin(s.end) - window.toMin(s.start);
                } else {
                    slotDur = type === 'tt' ? exam.durTT : exam.durStd;
                }
                minutesDone += slotDur;
            }
        });

        // --- AJOUT : Heures des Oraux ---
        if (DB.stage && DB.stage.juries && DB.stage.config && DB.stage.config.start && DB.stage.config.end) {
            let myJuries = DB.stage.juries.filter(j => j.members && j.members.includes(t.id));
            if (myJuries.length > 0) {
                let oralDur = window.toMin(DB.stage.config.end) - window.toMin(DB.stage.config.start);
                // Soustraire la pause repas si configurée et valide
                if (DB.stage.config.lunchStart && DB.stage.config.lunchEnd) {
                    let lunchDur = window.toMin(DB.stage.config.lunchEnd) - window.toMin(DB.stage.config.lunchStart);
                    if (lunchDur > 0) oralDur -= lunchDur;
                }
                if (oralDur > 0) {
                    // Si le prof est dans plusieurs jurys (anormal mais possible), on boucle
                    minutesDone += (oralDur * myJuries.length);
                }
            }
        }

        const balance = minutesDone - minutesDue;
        rawData.push({
            name: fullName,
            minutesDue,
            minutesDone,
            balance
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

    doc.setFontSize(16);
    doc.text("Bilan des Heures Supplémentaires (HSE)", 105, 15, { align: "center" });

    const formatTime = (m) => m <= 0 ? "-" : `${Math.floor(m / 60)}h${Math.round(m % 60).toString().padStart(2, '0')}`;

    let body = data.map(r => {
        let balStr = "Eq";
        if (r.balance > 0) balStr = `+${formatTime(r.balance)}`;
        else if (r.balance < 0) balStr = formatTime(Math.abs(r.balance));
        return [r.name, formatTime(r.minutesDue), formatTime(r.minutesDone), balStr];
    });

    doc.autoTable({
        head: [['Professeur', 'Heures Libérées', 'Heures Surv.', 'Balance']],
        body: body,
        startY: 25,
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

    let data = [["Professeur", "Heures Libérées", "Heures Surv.", "Balance"]];
    rawData.forEach(r => {
        let balStr = "Eq";
        if (r.balance > 0) balStr = `+${formatTime(r.balance)}`;
        else if (r.balance < 0) balStr = formatTime(Math.abs(r.balance));
        data.push([r.name, formatTime(r.minutesDue), formatTime(r.minutesDone), balStr]);
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
            balHtml: `<span class="${balanceColor}">${balanceText}</span>`
        });
    });

    rows.forEach(r => {
        html += `<tr>
            <td style="text-align:left; font-weight:bold;">${r.name}</td>
            <td style="background:#ebf5fb;">${r.dueStr}</td>
            <td style="background:#eafaf1;">${r.doneStr}</td>
            <td>${r.balHtml}</td>
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
        // IMPORTANT : On garde les entiers tels quels pour matcher l'import (Ex: Mars = 3)
        const d = parseInt(parts[2]);
        const m = parseInt(parts[1]);
        const dayKey = `${d}-${m}`; // Ex: "16-3"

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
                    dayKey: dayKey,    // "16-3"
                    minStart: minStart,// ex: 510
                    minEnd: minEnd     // ex: 600
                });
            }
        });
    });

    // Tri Chronologique : D'abord par jour, ensuite par heure
    columns.sort((a, b) => {
        // Astuce : On trie grossièrement sur la chaîne jour (approximatif mais suffisant pour une session)
        // ou mieux : on suppose que les exams sont déjà dans l'ordre dans DB.exams
        if (a.examIdx !== b.examIdx) return a.examIdx - b.examIdx;
        return a.minStart - b.minStart;
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
        const tName = `${t.nom} ${t.prenom}`;

        html += `<tr><td style="text-align:left; font-weight:bold; position:sticky; left:0; background:white; z-index:5; border-right:2px solid #ddd;">${tName}</td>`;

        columns.forEach(col => {
            // A. SURVEILLANCE (Priorité 1 : Bleu)
            let isSurv = false;
            // On cherche dans le planning
            for (const key in DB.planning) {
                if (DB.planning[key] === tName) {
                    // key format: examIdx_Room_Type_SlotIdx_SurvIdx
                    const parts = key.split('_');
                    if (parseInt(parts[0]) === col.examIdx) {
                        // C'est le bon examen, est-ce le bon créneau horaire ?
                        // Simplification : Si le prof surveille cet exam, on colore la case
                        // (Pour être au pixel près, il faudrait parser les slots du planning, mais c'est souvent suffisant)
                        isSurv = true;
                        break;
                    }
                }
            }

            if (isSurv) {
                html += `<td style="background-color:#3498db; color:white; border:1px solid white;">Surv.</td>`;
            }
            else {
                // B. COURS MAINTENU (Priorité 2 : Gris Foncé)
                // On vérifie dans la liste ROUGE importée
                let isBusy = false;
                const listMaintained = (DB.edt && DB.edt.maintained) ? DB.edt.maintained : [];

                isBusy = listMaintained.some(c => {
                    // 1. Vérif Nom
                    if (!namesMatch(c.profName, t.nom)) return false;
                    // 2. Vérif Jour (16-3 === 16-3 ?)
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
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vues_Surveillances");
    XLSX.writeFile(wb, "Planning_Surveillances.xlsx");
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
            doc.setFontSize(12); doc.text(`DNB BLANC ${year}`, pvCenterX, 28, { align: 'center' });

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
            doc.text(`DNB BLANC ${year}`, covCenterX, 30, { align: 'center' });

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
    doc.save("Pochettes_Surveillants.pdf");
};


// =========================================================================
// === MODULE AUTOMATISATION : CORRECTION DOUBLE AFFECTATION & OPTIMISATION ===
// =========================================================================

// --- 1. GÉNÉRATION AUTOMATIQUE (Auto-Fill) ---
window.autoFillPlanning = function () {
    // Sécurités
    if (!DB.edt.cancelled || DB.edt.cancelled.length === 0) {
        showToast("⚠️ Aucun cours annulé n'a été chargé ! Importez le fichier dans la zone verte.", 'warning');
        return;
    }

    showConfirm("🚀 LANCER L'AFFECTATION ?\nPriorité aux profs du fichier Vert (Dû).", () => {
    const nbSurv = DB.config.nbSurv || 1;
    let countDue = 0, countHSE = 0;

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

                                const fullName = `${dbProf.nom} ${dbProf.prenom}`;
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
                                const name = `${t.nom} ${t.prenom}`;

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
                                bestCandidate = `${winner.nom} ${winner.prenom}`;
                                countHSE++;
                            }
                        }

                        if (bestCandidate) DB.planning[planKey] = bestCandidate;
                    }
                });
            });
        });
    });

    renderPlanning();
    showAlertModal('Terminé !\nVERT (Dû) : ' + countDue + '\nBLANC (HSE) : ' + countHSE, 'success');
    });
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
        // On parcourt toutes les salles pour ce créneau
        for (let r of DB.rooms) {
            const limit = room.nbSurv || 1; // <--- MODIFICATION ICI

            // On remplit les N places de CETTE salle
            for (let i = 0; i < limit; i++) {
                const planKey = `${examIdx}_${room.nom}_${slotType}_${sIdx}_${i}`;
            }
        }
        return false;
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
                            const fullName = `${t.nom} ${t.prenom}`;
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
        DB.planning = {}; renderPlanning(); autoSave();
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

        let w = size;
        let h = size;

        // 2. Calculer les nouvelles dimensions pour tenir dans le carré "size x size"
        if (ratio > 1) {
            // Image rectangulaire (Paysage) -> On fixe la largeur, on réduit la hauteur
            h = size / ratio;
        } else {
            // Image haute (Portrait) -> On fixe la hauteur, on réduit la largeur
            w = size * ratio;
        }

        // 3. Afficher l'image sans déformation
        doc.addImage(DB.config.logo, 'JPEG', x, y, w, h);
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

