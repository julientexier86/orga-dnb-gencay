// === MODULE: stage_orals ===
// --- 1. CONFIGURATION ---
// --- 1. CONFIGURATION ---
function renderStageConfigUI() {
    if (!DB.stage) return;
    const c = DB.stage.config;
    document.getElementById('stgDate').value = c.date || "";
    document.getElementById('stgStart').value = c.start || "08:00";
    document.getElementById('stgEnd').value = c.end || "17:00";
    document.getElementById('stgDuration').value = c.duration || 20;
    document.getElementById('stgBreak').value = c.break || 0;
    document.getElementById('stgLunchStart').value = c.lunchStart || "12:00";
    document.getElementById('stgLunchEnd').value = c.lunchEnd || "13:30";

    // New Configs
    document.getElementById('stgJuryCount').value = c.juryCount || 5;

    // Render Teacher Pool
    const poolDiv = document.getElementById('stgTeachersPool');
    if (poolDiv) {
        poolDiv.innerHTML = "";
        // Init pool if not exists (default all teachers)
        if (!c.teacherPool) {
            c.teacherPool = DB.teachers.map(t => t.id);
        }

        DB.teachers.sort((a, b) => (a.nom || "").localeCompare(b.nom || "")).forEach(t => {
            let d = document.createElement('div');
            let chk = document.createElement('input'); chk.type = "checkbox";
            chk.value = t.id;
            chk.checked = c.teacherPool.includes(t.id);
            chk.onchange = () => {
                if (chk.checked) c.teacherPool.push(t.id);
                else c.teacherPool = c.teacherPool.filter(id => id !== t.id);
                // Save implicit handled by object ref, but good to be explicit if needed
            };
            d.appendChild(chk);
            d.appendChild(document.createTextNode(" " + (t.nom || "") + " " + (t.prenom || "")));
            poolDiv.appendChild(d);
        });
    }
}

function updateStageConfig() {
    DB.stage.config.date = document.getElementById('stgDate').value;
    DB.stage.config.start = document.getElementById('stgStart').value;
    DB.stage.config.end = document.getElementById('stgEnd').value;
    DB.stage.config.duration = parseInt(document.getElementById('stgDuration').value);
    DB.stage.config.break = parseInt(document.getElementById('stgBreak').value);
    DB.stage.config.lunchStart = document.getElementById('stgLunchStart').value;
    DB.stage.config.lunchEnd = document.getElementById('stgLunchEnd').value;

    // New fields
    DB.stage.config.juryCount = parseInt(document.getElementById('stgJuryCount').value);

    renderStagePlanning(); // Refresh grille
}

function toggleAllTeachersPool() {
    const c = DB.stage.config;
    const allIds = DB.teachers.map(t => t.id);
    if (c.teacherPool && c.teacherPool.length === allIds.length) {
        c.teacherPool = []; // Uncheck all
    } else {
        c.teacherPool = [...allIds]; // Check all
    }
    renderStageConfigUI();
}

function initStageJuriesFromConfig() {
    showConfirm("⚠️ Attention : Cela va écraser tous les jurys existants et vider le planning.\nContinuer ?", () => {
        const count = DB.stage.config.juryCount || 5;
        DB.stage.juries = [];
        DB.stage.planning = []; // Reset planning as juries IDs change

        for (let i = 0; i < count; i++) {
            DB.stage.juries.push({
                id: "J" + (Date.now() + i),
                name: "Jury " + (i + 1),
                room: "",
                members: [] // Could auto-assign from pool later
            });
        }

        showToast(count + " jurys ont été initialisés.", 'info');
        renderJuriesList();
        renderStagePlanning();
    });
}

function generateStageSlots() {
    showConfirm("⚠️ Attention : Recalculer les créneaux peut décaler le planning existant.\nContinuer ?", () => {
        renderStagePlanning();
        showToast("Créneaux régénérés selon les horaires.", 'success');
    });
}

// --- 2. GESTION JURYS ---
function renderJuriesList() {
    const list = document.getElementById('juriesList');
    list.innerHTML = "";
    DB.stage.juries.forEach((j, idx) => {
        let membersNames = j.members.map(mid => {
            let t = DB.teachers.find(x => x.id == mid);
            return t ? t.nom : "?";
        }).join(", ");
        let roomName = "Sans salle";
        let r = DB.rooms.find(x => x.id == j.room);
        if (r) roomName = r.nom;

        let div = document.createElement('div');
        div.className = "jury-card";
        div.innerHTML = `<strong>${j.name}</strong><br><small>${roomName}</small><br><span style="font-size:0.8rem; color:#555;">${membersNames}</span>`;
        div.style.cursor = "pointer";
        div.onclick = () => loadJuryDetail(idx);
        list.appendChild(div);
    });
}

let currentJuryIdx = -1;
function loadJuryDetail(idx) {
    currentJuryIdx = idx;
    document.getElementById('juryDetail').style.display = 'block';
    document.getElementById('juryEmptyMsg').style.display = 'none';

    let j = DB.stage.juries[idx];
    document.getElementById('editJuryName').value = j.name;

    // Salle (Input texte simple maintenant)
    document.getElementById('editJuryRoom').value = j.room || "";

    // Membres (Profs)
    const divM = document.getElementById('editJuryMembers');
    divM.innerHTML = "";
    // Tri sécurisé
    DB.teachers.sort((a, b) => (a.nom || "").localeCompare(b.nom || "")).forEach(t => {
        let d = document.createElement('div');
        let chk = document.createElement('input'); chk.type = "checkbox";
        chk.value = t.id;
        // Comparaison lâche (String vs Number)
        if (j.members.some(m => m == t.id)) chk.checked = true;
        chk.onchange = () => saveJuryDetail();
        d.appendChild(chk);
        d.appendChild(document.createTextNode(" " + (t.nom || "") + " " + (t.prenom || "")));
        divM.appendChild(d);
    });
}

function addJury() {
    DB.stage.juries.push({ id: Date.now(), name: "Nouveau Jury", room: "", members: [] });
    renderJuriesList();
    loadJuryDetail(DB.stage.juries.length - 1);
}

function saveJuryDetail() {
    if (currentJuryIdx < 0) return;
    let j = DB.stage.juries[currentJuryIdx];
    j.name = document.getElementById('editJuryName').value;
    j.room = document.getElementById('editJuryRoom').value;

    j.members = [];
    // Sauvegarde en string ou number selon l'origine, on garde la valeur brute
    document.querySelectorAll('#editJuryMembers input:checked').forEach(c => j.members.push(c.value));

    renderJuriesList();
}

function deleteJury() {
    if (currentJuryIdx < 0) return;
    showConfirm("Supprimer ce jury ?", () => {
        DB.stage.juries.splice(currentJuryIdx, 1);
        currentJuryIdx = -1;
        document.getElementById('juryDetail').style.display = 'none';
        document.getElementById('juryEmptyMsg').style.display = 'block';
        renderJuriesList();
    });
}

// --- 3. PLANNING ET SLOTS DYNAMIQUES ---
function renderStagePlanning() {
    const grid = document.getElementById('stageGrid');
    grid.innerHTML = "";

    const conf = DB.stage.config;
    const startMin = timeToMin(conf.start);
    const endMin = timeToMin(conf.end);
    const stdDur = parseInt(conf.duration);
    const pause = parseInt(conf.break);
    const lunchStart = timeToMin(conf.lunchStart);
    const lunchEnd = timeToMin(conf.lunchEnd);

    // Génération COLONNES (Jurys) avec Timeline DYNAMIQUE
    DB.stage.juries.forEach(j => {
        let col = document.createElement('div');
        col.className = "stage-col";
        col.innerHTML = `<div class="stage-col-header">${j.name}</div>`;

        let cursor = startMin;

        while (cursor + stdDur <= endMin) {
            // 1. Gestion Pause Déjeuner (Prioritaire)
            if (cursor >= lunchStart && cursor < lunchEnd) {
                cursor = lunchEnd;
                continue;
            }

            // 2. Détermination de la Durée du Slot
            let currentDur = stdDur;
            let timeStr = minToTime(cursor);

            // Chercher si un élève est assigné ici
            let assignment = DB.stage.planning.find(p => p.juryId == j.id && p.time == timeStr);
            let assignedStudent = null;

            if (assignment) {
                assignedStudent = DB.students.find(s => s.id == assignment.studentId);
                // Si Tiers-Temps => Durée majorée (ex: +33% ou arrondi supérieur)
                // On peut aussi imaginer un champ 'customDuration' dans assignment
                if (assignedStudent && (assignedStudent.isTiersTemps || assignedStudent.tt)) {
                    // Règle: 20min pour 15min standard, ou +5min
                    currentDur = stdDur + 5;
                }
                // Si assignment a une durée custom (futur feature), on la prendrait ici
            }

            // 3. Création du slot
            let slotDiv = document.createElement('div');
            slotDiv.className = "stage-slot";
            // Ajout d'une classe si durée spéciale
            if (currentDur > stdDur) slotDiv.classList.add("slot-tt");

            // Hauteur visuelle proportionnelle ? (Optionnel, garder simple pour l'instant)
            // slotDiv.style.flex = ...

            slotDiv.innerHTML = `<span class="stage-slot-time">${minToTime(cursor)} <small>(${currentDur}mn)</small></span>`;

            // Gestion Drop
            // On capture la valeur de 'cursor' au moment de la création (closure)
            let dropTime = minToTime(cursor);
            slotDiv.ondragover = (e) => e.preventDefault();
            slotDiv.ondrop = (e) => handleStageDrop(e, j.id, dropTime);

            // Contenu
            if (assignedStudent) {
                let badge = createStudentBadge(assignedStudent);
                if (currentDur > stdDur) {
                    let ttBadge = document.createElement('span');
                    ttBadge.className = 'badge-tt';
                    ttBadge.innerText = " +T.Temps";
                    badge.appendChild(ttBadge);
                }
                slotDiv.appendChild(badge);

                // Bouton delete (petit 'x')
                let delBtn = document.createElement('span');
                delBtn.innerHTML = " &times;";
                delBtn.style.cursor = "pointer";
                delBtn.style.color = "red";
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    unassignStageStudent(assignment.studentId);
                };
                badge.appendChild(delBtn);
            }

            col.appendChild(slotDiv);

            // 4. Avancer le curseur
            cursor += currentDur + pause;
        }
        grid.appendChild(col);
    });

    renderUnplacedStageStudents();
}

function createStudentBadge(st) {
    let el = document.createElement('div');
    el.className = "stage-student";
    el.draggable = true;
    el.innerText = st.nom + " " + st.prenom + " (" + st.classe + ")";
    el.ondragstart = (e) => {
        e.dataTransfer.setData("text/plain", st.id);
        // On stocke aussi l'origine pour savoir si on déplace ou si on vient du pool
        e.dataTransfer.setData("origin", "planning");
    };
    // Bouton delete (désassigner)
    let x = document.createElement('span');
    x.innerHTML = " &times;";
    x.style.color = "red"; x.style.fontWeight = "bold"; x.style.cursor = "pointer";
    x.onclick = (e) => { e.stopPropagation(); unassignStageStudent(st.id); };
    el.appendChild(x);
    return el;
}

function renderUnplacedStageStudents() {
    // DEBUG
    if (DB.students.length === 0) console.warn("DEBUG: DB.students est vide ! Vérifiez l'import.");

    const container = document.getElementById('unplacedStageStudents');
    container.innerHTML = "";
    let count = 0;
    const filter = (document.querySelector('#stage-planning input[type="text"]').value || "").toLowerCase();

    DB.students.sort((a, b) => a.nom.localeCompare(b.nom)).forEach(s => {
        // Est-il déjà placé ?
        if (DB.stage.planning.find(p => p.studentId == s.id)) return;

        // Filtre Recherche
        if (filter && !s.nom.toLowerCase().includes(filter) && !s.prenom.toLowerCase().includes(filter)) return;

        let d = document.createElement('div');
        d.className = "stage-student";
        d.style.background = "white"; // Différent du planning
        d.draggable = true;
        d.innerText = s.nom + " " + s.prenom + " (" + s.classe + ")";
        d.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", s.id);
        };
        container.appendChild(d);
        count++;
    });
    document.getElementById('countUnplacedStage').innerText = count;
}

function handleStageDrop(e, juryId, time) {
    e.preventDefault();
    let sId = e.dataTransfer.getData("text/plain");
    if (!sId) return;
    sId = parseInt(sId) || sId; // Id peut être string ou number

    // Nettoyage: Si l'élève était déjà ailleurs, on l'enlève
    unassignStageStudent(sId);

    // Verif: Est-ce que ce jury est déjà occupé à cette heure ?
    let existing = DB.stage.planning.find(p => p.juryId == juryId && p.time == time);
    if (existing) {
        // On "éjecte" l'occupant actuel (retour pool)
        // Ou on refuse ? Ejectons pour simplifier.
    }
    // On supprime l'éventuel occupant précédent de ce slot (overwrite)
    DB.stage.planning = DB.stage.planning.filter(p => !(p.juryId == juryId && p.time == time));

    // Nouvelle assignation
    DB.stage.planning.push({ juryId: juryId, time: time, studentId: sId });
    renderStagePlanning();
    if (typeof autoSave === 'function') autoSave();
}

function unassignStageStudent(sId) {
    DB.stage.planning = DB.stage.planning.filter(p => p.studentId != sId);
    renderStagePlanning();
    if (typeof autoSave === 'function') autoSave();
}

function filterStageStudents() { renderUnplacedStageStudents(); }

function resetStagePlanning() {
    showConfirm("Tout effacer ?", () => {
        DB.stage.planning = [];
        renderStagePlanning();
        if (typeof autoSave === 'function') autoSave();
    });
}

function timeToMin(t) {
    let [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}
function minToTime(min) {
    let h = Math.floor(min / 60);
    let m = min % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

function recalculateStageTimes() {
    showConfirm("Voulez-vous réaligner TOUS les horaires du planning actuel ?\n\nCela va :\n1. Trier les élèves par ordre chronologique actuel.\n2. Recalculer l'heure de passage exacte selon la durée (15 ou 20mn) et le Tiers-Temps.\n3. Corriger les décalages d'affichage.", () => {
    const conf = DB.stage.config;
    const startMin = timeToMin(conf.start);
    const stdDur = parseInt(conf.duration) || 15;
    const pause = parseInt(conf.break) || 0;
    const lunchStart = timeToMin(conf.lunchStart);
    const lunchEnd = timeToMin(conf.lunchEnd);

    let changedCount = 0;

    DB.stage.juries.forEach(j => {
        // 1. Récupérer les créneaux de ce jury et les trier par temps
        let assignments = DB.stage.planning.filter(p => p.juryId == j.id);
        assignments.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

        let cursor = startMin;

        assignments.forEach(p => {
            // Gestion Pause Dej avant d'assigner
            // Si le curseur tombe pendant le repas, on saute
            if (cursor >= lunchStart && cursor < lunchEnd) cursor = lunchEnd;

            // Calcul durée pour cet élève
            let s = DB.students.find(x => x.id == p.studentId);
            let currentDur = stdDur;
            if (s && (s.isTiersTemps || s.tt)) currentDur += 5; // Ajout forfaitaire TT

            let newTime = minToTime(cursor);
            if (p.time !== newTime) {
                p.time = newTime;
                changedCount++;
            }

            cursor += currentDur + pause;
        });
    });

    renderStagePlanning();
    if (typeof autoSave === 'function') autoSave();
    showToast("Planning réaligné ! " + changedCount + " horaires corrigés.", 'success');
    });
}

// --- 4. AUTO-FILL DYNAMIQUE ---
function autoFillStage() {
    showConfirm("Remplissage automatique intelligent (Tiers-Temps inclus) ?\nCela complètera les jurys existants.", () => {
    const conf = DB.stage.config;
    const startMin = timeToMin(conf.start);
    const endMin = timeToMin(conf.end);
    const stdDur = parseInt(conf.duration);
    const pause = parseInt(conf.break);
    const lunchStart = timeToMin(conf.lunchStart);
    const lunchEnd = timeToMin(conf.lunchEnd);

    // 1. Identifier les élèves non placés
    let unplaced = DB.students.filter(s => !DB.stage.planning.find(p => p.studentId == s.id));
    if (unplaced.length === 0) { showToast("Tous les élèves sont déjà placés !", 'info'); return; }

    // Prioriser les Tiers-Temps pour les placer en premier (ou mieux : les répartir ?)
    // Ici on mélange simple ou tri par classe
    unplaced.sort((a, b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom));

    // 2. Pour chaque Jury, calculer son "Curseur" actuel (là où s'arrête le dernier créneau occupé)
    let juryCursors = {};
    DB.stage.juries.forEach(j => {
        // Trouver le max time occupé
        let assigned = DB.stage.planning.filter(p => p.juryId == j.id);
        let maxTime = startMin;

        assigned.forEach(p => {
            let t = timeToMin(p.time);
            let s = DB.students.find(x => x.id == p.studentId);
            let d = stdDur;
            if (s && (s.isTiersTemps || s.tt)) d += 5; // Regle dur Tiers Temps
            if (t + d + pause > maxTime) maxTime = t + d + pause;
        });

        // Ajuster si on tombe dans la pause déj ou avant start
        if (maxTime < startMin) maxTime = startMin;
        juryCursors[j.id] = maxTime;
    });

    // 3. Distribution Round-Robin
    let placedCount = 0;
    let juryIndex = 0;
    const juries = DB.stage.juries;

    while (unplaced.length > 0) {
        let st = unplaced.shift();
        let placed = false;

        // Essayer chaque jury en partant de juryIndex (pour équilibrer)
        for (let k = 0; k < juries.length; k++) {
            let j = juries[(juryIndex + k) % juries.length];
            let cursor = juryCursors[j.id];

            // Ajustement Pause Déj
            if (cursor >= lunchStart && cursor < lunchEnd) cursor = lunchEnd;

            // Calcul Durée pour cet élève
            let d = stdDur;
            if (st.isTiersTemps || st.tt) d += 5;

            // Est-ce que ça rentre avant la fin ?
            if (cursor + d <= endMin) {
                // Bingo
                DB.stage.planning.push({
                    juryId: j.id,
                    time: minToTime(cursor),
                    studentId: st.id
                });
                juryCursors[j.id] = cursor + d + pause;
                placed = true;
                placedCount++;
                juryIndex = (juryIndex + k + 1) % juries.length; // Tourner
                break;
            }
        }
    }

    renderStagePlanning();
    if (typeof autoSave === 'function') autoSave();
    showToast(placedCount + " élèves placés automatiquement.", 'success');
    renderUnplacedStageStudents(); // Refresh la liste à gauche
    });
}

window.generateStageGradesPDF = function generateStageGradesPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    DB.stage.juries.forEach((j, i) => {
        if (i > 0) doc.addPage();

        doc.setFontSize(16);
        doc.text(`SESSION ORAUX DNB - ${DB.config.year || "2026"}`, 105, 15, { align: "center" });
        doc.setFontSize(14);
        doc.text(`FICHE DE NOTATION - ${j.name}`, 105, 25, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Salle : ${j.room || "?"}`, 14, 35);

        let membersNames = j.members.map(mid => {
            let t = DB.teachers.find(x => x.id == mid);
            return t ? (t.nom + " " + t.prenom) : "?";
        }).join(" - ");
        doc.text(`Jury : ${membersNames}`, 14, 40);

        // Planning du jury trié par heure
        let url = DB.stage.planning.filter(p => p.juryId == j.id).sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

        let rows = url.map(p => {
            let s = DB.students.find(x => x.id == p.studentId);
            if (!s) return [];
            return [
                p.time,
                s.nom + " " + s.prenom,
                s.classe,
                (s.isTiersTemps || s.tt) ? "T.Temps" : "",
                "       / 20", // Col note
                "" // Col Obs
            ];
        });

        doc.autoTable({
            startY: 45,
            head: [['Heure', 'Nom Prénom', 'Classe', 'Spéc.', 'Note', 'Observations']],
            body: rows,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 50 },
                2: { cellWidth: 20 },
                4: { cellWidth: 30 }
            }
        });
    });
    doc.save("Fiches_Notation_Oraux.pdf");
};
// --- 5. IMPRESSIONS PDF ---
window.printStageConvocs = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // On récupère les élèves PLANIFIÉS seulement ? ou tous avec mention "Non planifié" ?
    // Disons planifiés.
    let tasks = DB.stage.planning.map(p => {
        let s = DB.students.find(x => x.id == p.studentId);
        let j = DB.stage.juries.find(x => x.id == p.juryId);
        let r = j && DB.rooms.find(x => x.id == j.room);
        return {
            student: s,
            jury: j,
            room: r ? r.nom : "Indéfinie",
            time: p.time,
            date: DB.stage.config.date
        };
    }).filter(t => t.student); // Sécurité

    // Tri par classe puis Nom
    tasks.sort((a, b) => {
        if (a.student.classe !== b.student.classe) return a.student.classe.localeCompare(b.student.classe);
        return a.student.nom.localeCompare(b.student.nom);
    });

    tasks.forEach((t, i) => {
        if (i > 0) doc.addPage();

        doc.setFontSize(18); doc.text("CONVOCATION - ORAL", 105, 40, { align: "center" });
        doc.setFontSize(14); doc.text(DB.config.schoolName || "Collège", 105, 50, { align: "center" });

        doc.rect(20, 70, 170, 60);
        doc.setFontSize(14);
        doc.text(`Nom : ${t.student.nom} ${t.student.prenom}`, 30, 85);
        doc.text(`Classe : ${t.student.classe}`, 30, 95);

        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text("Vous êtes convoqué(e) le :", 30, 115);

        let dateFr = new Date(t.date).toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        doc.setTextColor(230, 126, 34);
        doc.text(`${dateFr} à ${t.time}`, 40, 130);

        doc.setTextColor(0);
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text(`Jury : ${t.jury.name}`, 30, 150);
        doc.text(`Salle : ${t.room}`, 100, 150);

        doc.text("Veuillez vous présenter 10 minutes avant l'heure indiquée.", 105, 200, { align: "center" });
    });

    doc.save("Convocations_Oraux.pdf");
};

window.printStagePlanning = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l'); // Paysage

    DB.stage.juries.forEach((j, i) => {
        if (i > 0) doc.addPage();

        doc.setFontSize(16); doc.text(`Planning Jury : ${j.name}`, 10, 15);
        let r = DB.rooms.find(x => x.id == j.room);
        doc.setFontSize(12); doc.text(`Salle : ${r ? r.nom : (j.room || "?")}`, 10, 22);

        let membersNames = j.members.map(mid => {
            let t = DB.teachers.find(x => x.id == mid);
            return t ? (t.nom + " " + t.prenom) : "?";
        }).join(" - ");
        doc.text(`Enseignant(s) : ${membersNames}`, 10, 29);

        // Récup slots de ce jury
        let mySlots = DB.stage.planning.filter(p => p.juryId == j.id).sort((a, b) => a.time.localeCompare(b.time));

        let body = mySlots.map(p => {
            let s = DB.students.find(x => x.id == p.studentId);
            if (!s) return [p.time, "?"];
            let ttStar = (s.isTiersTemps || s.tt) ? " *" : "";
            return [p.time, `${s.nom} ${s.prenom} (${s.classe})${ttStar}`];
        });

        doc.autoTable({
            head: [['Heure', 'Candidat (Élève)']],
            body: body,
            startY: 35,
            theme: 'grid'
        });
    });
    doc.save("Planning_Jurys_Oraux.pdf");
};

window.printStageJuriesSummary = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Récapitulatif des Jurys d'Oraux", 105, 15, { align: "center" });

    let body = DB.stage.juries.map(j => {
        let r = DB.rooms.find(x => x.id == j.room);
        let roomName = r ? r.nom : (j.room || "Non définie");
        let membersNames = j.members.map(mid => {
            let t = DB.teachers.find(x => x.id == mid);
            return t ? (t.nom + " " + t.prenom) : "?";
        }).join("\n");
        return [j.name, roomName, membersNames];
    });

    doc.autoTable({
        head: [['Jury', 'Salle', 'Enseignants']],
        body: body,
        startY: 25,
        theme: 'grid',
        styles: { cellPadding: 3, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 } }
    });

    doc.save("Recapitulatif_Jurys_Oraux.pdf");
};

window.printStageJuriesSummaryXLSX = function () {
    if (!DB.stage || !DB.stage.juries || DB.stage.juries.length === 0) return showToast("Aucun jury à exporter.", 'warning');

    let data = [["Jury", "Salle", "Enseignants"]];

    DB.stage.juries.forEach(j => {
        let r = DB.rooms.find(x => x.id == j.room);
        let roomName = r ? r.nom : (j.room || "Non définie");
        let membersNames = j.members.map(mid => {
            let t = DB.teachers.find(x => x.id == mid);
            return t ? (t.nom + " " + t.prenom) : "?";
        }).join(", ");
        data.push([j.name, roomName, membersNames]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jurys");
    XLSX.writeFile(wb, "Recapitulatif_Jurys_Oraux.xlsx");
};

window.printStageSignSheets = function () {
    // Même logique que Planning Jury mais avec colonnes signature
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l');

    DB.stage.juries.forEach((j, i) => {
        if (i > 0) doc.addPage();

        doc.setFontSize(16); doc.text(`FEUILLE D'ÉMARGEMENT - ${j.name}`, 10, 15);
        let r = DB.rooms.find(x => x.id == j.room);
        doc.setFontSize(12); doc.text(`Salle : ${r ? r.nom : "?"}`, 10, 22);

        let mySlots = DB.stage.planning.filter(p => p.juryId == j.id).sort((a, b) => a.time.localeCompare(b.time));

        let body = mySlots.map(p => {
            let s = DB.students.find(x => x.id == p.studentId);
            let ttStar = (s && (s.isTiersTemps || s.tt)) ? " *" : "";
            return [p.time, s ? `${s.nom} ${s.prenom}${ttStar}` : "?", s ? s.classe : "", "", ""];
        });

        doc.autoTable({
            head: [['Heure', 'Candidat', 'Classe', 'Signature Candidat', 'Note / Obs']],
            body: body,
            startY: 30,
            theme: 'grid',
            columnStyles: { 3: { cellWidth: 50 }, 4: { cellWidth: 80 } },
            styles: { minCellHeight: 15, valign: 'middle' }
        });
    });
    doc.save("Emargement_Oraux.pdf");
};

function switchPochetteJuryTab(zoneId, element) {
    document.querySelectorAll('.pochette-jury-zone').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.pochette-jury-zone').forEach(el => {
        el.style.border = "none"; el.style.background = "#fff"; el.style.color = "#555"; el.style.fontWeight = "normal";
        if (el.innerText.includes('P1')) { el.style.background = "#fff"; }
    });

    element.classList.add('active');

    document.querySelectorAll('.edit-jury-zone').forEach(el => el.style.display = 'none');
    document.getElementById('edit-jury-zone-' + zoneId).style.display = 'block';
}

window.exportPochettesJuryPDF = function () {
    if (!DB.stage || !DB.stage.juries || DB.stage.juries.length === 0) return showToast("Veuillez d'abord configurer les jurys des oraux.", 'warning');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a3');

    const txtActions = document.getElementById('txtPochetteJuryActions').value;
    const txtProfs = document.getElementById('txtPochetteJuryProfs').value;
    const txtEleves = document.getElementById('txtPochetteJuryEleves').value;

    const year = DB.config.year || "2025";
    let pageCount = 0;
    const PG_H = 297; const HALF_W = 210; const M = 15;

    // Get sorted juries
    const juries = [...DB.stage.juries].sort((a, b) => a.name.localeCompare(b.name));

    juries.forEach(jury => {
        if (pageCount > 0) doc.addPage("a3", "l");
        pageCount++;

        // --- PAGE 1 : RECTO ---
        doc.setDrawColor(200); doc.setLineDash([5, 5], 0);
        doc.line(HALF_W, 0, HALF_W, PG_H); doc.setLineDash([]);

        // GAUCHE : PV JURY
        const pvX = M; const pvW = HALF_W - (2 * M); const pvCenterX = M + (pvW / 2);

        // LOGO
        if (typeof addSmartLogo === 'function') addSmartLogo(doc, pvX, 10, 45);

        doc.setFontSize(16); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text("PROCÈS-VERBAL DE JURY", pvCenterX, 20, { align: 'center' });
        doc.setFontSize(12); doc.text(`ORAUX - ${typeof getExamTitle === 'function' ? getExamTitle() : 'DNB BLANC'} ${year}`, pvCenterX, 28, { align: 'center' });

        doc.setDrawColor(0); doc.setLineWidth(0.4); doc.rect(pvX, 35, pvW, 25);
        doc.setFontSize(11);
        doc.text(`JURY : ${jury.name}`, pvX + 5, 42);
        doc.text(`DATE : ${DB.stage.config.date ? new Date(DB.stage.config.date).toLocaleDateString('fr-FR') : "Date à définir"}`, pvX + 5, 52);

        let roomObj = DB.rooms.find(x => x.id == jury.room);
        let roomName = roomObj ? roomObj.nom : (jury.room || "Non définie");
        doc.text(`SALLE : ${roomName}`, pvX + 90, 42);

        // Fetch students for this jury
        let mySlots = DB.stage.planning.filter(p => p.juryId == jury.id).sort((a, b) => a.time.localeCompare(b.time));
        const nbInscrits = mySlots.length;

        doc.setFillColor(245, 245, 245); doc.rect(pvX, 63, pvW, 15, 'FD');
        doc.setFontSize(10); doc.setFont("helvetica", "bold");
        const stepW = pvW / 4;
        doc.text(`CANDIDATS : ${nbInscrits}`, pvX + 5, 73);
        doc.text("PRÉSENTS : .......", pvX + stepW + 2, 73);
        doc.text("ABSENTS : .......", pvX + (stepW * 2) + 2, 73);
        doc.text("RETARDS : .......", pvX + (stepW * 3) + 2, 73);

        let pvBody = mySlots.map((p, idx) => {
            let s = DB.students.find(x => x.id == p.studentId);
            return s ? [p.time, s.nom + " " + s.prenom, s.classe, "", ""] : [p.time, "Inconnu", "", "", ""];
        });

        // Pad with empty rows if few students
        while (pvBody.length < 5) pvBody.push(["", "", "", "", ""]);

        doc.autoTable({
            head: [['Heure', 'Nom Prénom', 'Classe', 'Émargement', 'Obs. (Abs, Retard)']],
            body: pvBody,
            startY: 85,
            margin: { left: pvX },
            tableWidth: pvW,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: 255, halign: 'center', fontStyle: 'bold' },
            styles: { minCellHeight: 12, valign: 'middle', fontSize: 9 },
            columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 50 }, 2: { cellWidth: 15 }, 3: { cellWidth: 40 } }
        });

        const sigY = PG_H - 40;
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Noms et Signatures des Membres du Jury :", pvX, sigY);
        doc.rect(pvX, sigY + 5, pvW, 25);
        let membersNames = jury.members.map(mid => {
            let t = DB.teachers.find(x => x.id == mid);
            return t ? (t.nom + " " + t.prenom) : "?";
        }).join(" - ");
        doc.setFont("helvetica", "normal");
        doc.text(membersNames, pvX + 5, sigY + 12);

        // DROITE : COUVERTURE
        const covX = HALF_W + M; const covW = HALF_W - (2 * M); const covCenterX = covX + (covW / 2);

        // LOGO
        if (typeof addSmartLogo === 'function') addSmartLogo(doc, covX, 10, 45);

        doc.setFontSize(22); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
        doc.text(`ORAUX - ${typeof getExamTitle === 'function' ? getExamTitle() : 'DNB BLANC'} ${year}`, covCenterX, 30, { align: 'center' });

        const startY = 45;
        doc.setDrawColor(200); doc.setFillColor(248, 249, 250); doc.rect(covX, startY, covW, 40, 'FD');
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text("JURY :", covX + 5, startY + 10); doc.setFontSize(14); doc.text(jury.name, covX + 35, startY + 10);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold"); doc.text("DATE :", covX + 5, startY + 20); doc.setFont("helvetica", "normal"); doc.text(DB.stage.config.date ? new Date(DB.stage.config.date).toLocaleDateString('fr-FR') : "Date à définir", covX + 35, startY + 20);
        doc.setFont("helvetica", "bold"); doc.text("SALLE :", covX + 5, startY + 30); doc.setFontSize(16); doc.text(roomName, covX + 35, startY + 30);

        let examGroupText = "MEMBRES : \n" + membersNames.split(" - ").join("\n");
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(examGroupText, covX + 110, startY + 10);

        let scheduleData = mySlots.map(p => {
            let s = DB.students.find(x => x.id == p.studentId);
            return [p.time, s ? `${s.nom} ${s.prenom} (${s.classe})` : "?"];
        });

        doc.autoTable({
            head: [["Horaire", 'Candidat']], body: scheduleData, startY: startY + 45, margin: { left: covX }, tableWidth: covW, theme: 'grid',
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
        doc.setFontSize(16); doc.setTextColor(41, 128, 185); doc.setFont("helvetica", "bold"); doc.text("CONSIGNES JURYS", M + (HALF_W - 2 * M) / 2, 20, { align: 'center' });
        doc.setDrawColor(41, 128, 185); doc.setLineWidth(0.5); doc.line(M, 25, M + (HALF_W - 2 * M), 25);
        doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(txtProfs, HALF_W - 2 * M), M, 35);
        const rX = HALF_W + M; const rW = HALF_W - (2 * M);
        doc.setFontSize(16); doc.setTextColor(211, 84, 0); doc.setFont("helvetica", "bold"); doc.text("CONSIGNES AUX CANDIDATS", rX + rW / 2, 20, { align: 'center' });
        doc.setFontSize(11); doc.setTextColor(100); doc.setFont("helvetica", "italic"); doc.text("(À lire avant ou pendant l'accueil du candidat)", rX + rW / 2, 27, { align: 'center' });
        doc.setDrawColor(211, 84, 0); doc.setLineWidth(0.5); doc.line(rX, 30, rX + rW, 30);
        doc.setFontSize(11); doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(txtEleves, rW), rX, 40);
    });

    doc.save("Pochettes_Jurys_Oraux.pdf");
};


// ============================================================
// NOUVELLES FONCTIONS V14.7 - Intégrées le 2026-03-14
// ============================================================
