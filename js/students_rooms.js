// === MODULE: students_rooms ===
// --- FONCTION D'AFFICHAGE AVEC FILTRES ET MEF ---
window.renderStudents = function () {
    const l = DB.uiState.locked.students;
    const table = document.getElementById('tableStudents');

    if (!table) return;

    // 1. On réécrit l'EN-TÊTE pour inclure les CHAMPS DE FILTRE
    // Note : On ajoute des 'input' dans une deuxième ligne d'en-tête
    let theadHtml = `
        <thead>
            <tr>
                <th style="width:20%">Nom</th>
                <th style="width:20%">Prénom</th>
                <th style="width:50px">Sexe</th>
                <th style="width:10%">Classe</th>
                <th style="width:15%">MEF</th> <th>Anonymat</th>
                <th>Aménagements</th> 
                <th style="width:50px; text-align:center">TT</th> 
                <th style="width:50px">Act.</th> 
            </tr>
            <tr style="background:#e9ecef;">
                <th><input type="text" class="filter-input" placeholder="Filtrer..." onkeyup="filterStudentsTable(0)"></th>
                <th><input type="text" class="filter-input" placeholder="Filtrer..." onkeyup="filterStudentsTable(1)"></th>
                <th></th>
                <th><input type="text" class="filter-input" placeholder="Filtrer..." onkeyup="filterStudentsTable(3)"></th>
                <th><input type="text" class="filter-input" placeholder="Filtrer..." onkeyup="filterStudentsTable(4)"></th> <th><input type="text" class="filter-input" placeholder="Code..." onkeyup="filterStudentsTable(5)"></th>
                <th></th>
                <th></th>
                <th></th>
            </tr>
        </thead>`;

    // 2. On génère le CORPS du tableau
    let tbodyHtml = '<tbody>';

    DB.students.forEach((s, i) => {
        const codeDisplay = s.anonymat ? `<span style="font-family:courier; font-weight:bold; color:#d35400">${escapeHTML(s.anonymat)}</span>` : '<span style="color:#ccc; font-size:0.8rem">--</span>';

        let labelsHtml = "";
        if (s.labels && s.labels.length > 0) {
            s.labels.forEach(labCode => {
                const def = DB.config.labels.find(d => d.code === labCode);
                const col = def ? def.color : '#999';
                labelsHtml += `<span class="badge" style="background-color:${escapeHTML(col)}; margin-right:3px;">${escapeHTML(labCode)}</span>`;
            });
        }

        tbodyHtml += `
        <tr>
            <td style="font-weight:bold;">${escapeHTML(s.nom)}</td>
            <td>${escapeHTML(s.prenom)}</td>
            <td>${escapeHTML(s.sexe)}</td>
            <td><span class="badge bg-secondary" style="background:#6c757d; color:white;">${escapeHTML(s.classe)}</span></td>
            <td style="color:#2980b9; font-size:0.9rem;">${escapeHTML(s.mef || "-")}</td> <td>${codeDisplay}</td>
            <td>${labelsHtml}</td> 
            <td style="text-align:center">
                <input type="checkbox" ${s.tt ? 'checked' : ''} ${l ? 'disabled' : ''} onchange="toggleStudentTT(${i}, this.checked)">
            </td>
            <td style="text-align:center">${!l ? `<button class="btn btn-danger btn-sm" onclick="DB.students.splice(${i},1);renderStudents()">X</button>` : ''}</td>
        </tr>`;
    });

    tbodyHtml += '</tbody>';

    // Mise à jour complète du tableau
    table.innerHTML = theadHtml + tbodyHtml;

    // Dans processExcelData (partie students) ou à la fin de renderStudents :
    updateMefCheckboxes();
};

// --- NOUVELLE FONCTION POUR GÉRER LES FILTRES ---
window.filterStudentsTable = function (colIndex) {
    // Récupère la table et les lignes
    const table = document.getElementById('tableStudents');
    const tr = table.getElementsByTagName("tr");

    // Récupère tous les inputs de filtre
    const inputs = table.querySelectorAll('.filter-input');

    // On parcourt toutes les lignes de données (on commence après les 2 lignes d'en-tête)
    for (let i = 2; i < tr.length; i++) {
        let showRow = true;
        const tds = tr[i].getElementsByTagName("td");

        // On vérifie chaque filtre actif
        inputs.forEach((input, index) => {
            // L'index de l'input correspond-il à une colonne qui existe ?
            // (Note: j'ai mis des onkeyup="filterStudentsTable(N)" pour cibler la bonne colonne)
            // Ici on va faire plus simple : on regarde l'index du parent TH de l'input
            const thIndex = input.parentElement.cellIndex;

            if (input.value) {
                const filterVal = input.value.toUpperCase();
                const txtValue = tds[thIndex].textContent || tds[thIndex].innerText;
                if (txtValue.toUpperCase().indexOf(filterVal) === -1) {
                    showRow = false;
                }
            }
        });

        tr[i].style.display = showRow ? "" : "none";
    }
};

// Nouvelle fonction helper pour la case à cocher TT
function toggleStudentTT(idx, val) {
    const s = DB.students[idx];
    s.tt = val;
    if (!s.labels) s.labels = [];
    if (val) {
        if (!s.labels.includes('TTEMPS')) s.labels.push('TTEMPS');
    } else {
        s.labels = s.labels.filter(l => l !== 'TTEMPS');
    }
    renderStudents();
}
function renderRooms() {
    const l = DB.uiState.locked.rooms;
    document.querySelector('#tableRooms tbody').innerHTML = DB.rooms.map((r, i) => `<tr>
        <td>${escapeHTML(r.nom)}</td>
        <td><input type="number" value="${r.capacite}" style="width:60px" ${l ? 'disabled' : ''} onchange="DB.rooms[${i}].capacite=parseInt(this.value)"></td>
        <td style="text-align:center"><input type="checkbox" ${r.isTT ? 'checked' : ''} ${l ? 'disabled' : ''} onchange="DB.rooms[${i}].isTT=this.checked; renderRooms()"></td>
        <td style="text-align:center"><input type="checkbox" ${r.isAmen ? 'checked' : ''} ${l ? 'disabled' : ''} onchange="DB.rooms[${i}].isAmen=this.checked; renderRooms()"></td>
        <td style="text-align:center">${!l ? `<button class="btn btn-danger btn-sm" onclick="DB.rooms.splice(${i},1);renderRooms()">X</button>` : ''}</td>
    </tr>`).join('');
}
// --- GESTION DES PROFS (Avec Édition et Refus HSE) ---
// --- GESTION DES PROFS (CORRIGÉE : Civilité + Couleurs + Ordre Colonnes) ---
window.renderTeachers = function () {
    const container = document.getElementById('teachers-list');
    if (!container) return;

    // Entête du tableau
    let html = `
    <table class="table table-striped table-hover" style="font-size:0.9rem;">
        <thead class="thead-dark">
            <tr>
                <th style="width:60px;">Civ.</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th style="text-align:center; width:80px;" title="Cochez si le prof refuse les HSE">HSE 🚫</th>
                <th>Matière</th>
                <th style="text-align:center; width:100px;">Actions</th>
            </tr>
        </thead>
        <tbody>`;

    // Trier les profs par nom
    DB.teachers.sort((a, b) => a.nom.localeCompare(b.nom));

    DB.teachers.forEach((t, i) => {
        // Sécurisation des valeurs
        const noHSE = t.noHSE ? 'checked' : '';
        // Si refus HSE, on grise légèrement la ligne, sinon blanc
        const rowStyle = t.noHSE ? 'background-color: #f2f2f2; color: #888;' : '';

        // Style de la matière : Fond Sombre + Texte Blanc pour le contraste
        const matStyle = "background-color: #2c3e50; color: white; padding: 5px 8px; border-radius: 4px; font-weight: normal;";

        html += `
        <tr style="${rowStyle}">
            <td>${escapeHTML(t.civ || "")}</td>
            
            <td style="font-weight:bold;">${escapeHTML(t.nom)}</td>
            <td>${escapeHTML(t.prenom)}</td>
            
            <td style="text-align:center;">
                <input type="checkbox" ${noHSE} onchange="toggleNoHSE(${i})" 
                       style="transform: scale(1.3); cursor:pointer;" title="Cochez pour interdire les HSE">
            </td>
            
            <td><span style="${matStyle}">${escapeHTML(t.matiere)}</span></td>
            
            <td style="text-align:center;">
                <button class="btn btn-sm btn-warning" onclick="editTeacher(${i})" title="Modifier" style="padding:2px 6px;">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTeacher(${i})" title="Supprimer" style="padding:2px 6px;">🗑️</button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;

    // Ajout d'un compteur
    html += `<div style="margin-top:10px; text-align:right; color:#666;">
                Total : <b>${DB.teachers.length}</b> professeurs 
                (dont <b>${DB.teachers.filter(t => t.noHSE).length}</b> sans HSE)
             </div>`;

    container.innerHTML = html;
};

// --- NOUVELLES FONCTIONS D'ACTION ---

// 1. Basculer le statut HSE
window.toggleNoHSE = function (index) {
    DB.teachers[index].noHSE = !DB.teachers[index].noHSE;
    renderTeachers(); // On rafraîchit pour griser la ligne
    autoSave();
};

// 2. Éditer un prof (Nom, Prénom, Matière)
// Fonction pour éditer un prof (Incluant la Civilité)
window.editTeacher = function (index) {
    const t = DB.teachers[index];

    // On demande d'abord la civilité (M. ou Mme)
    // On propose une petite astuce pour basculer rapidement
    let newCiv = prompt("Civilité (M. ou Mme) :", t.civ || "M.");
    if (newCiv === null) return;

    const newNom = prompt("Nom :", t.nom);
    if (newNom === null) return;

    const newPrenom = prompt("Prénom :", t.prenom);
    if (newPrenom === null) return;

    const newMat = prompt("Matière :", t.matiere);
    if (newMat === null) return;

    // Mise à jour
    DB.teachers[index].civ = newCiv;
    DB.teachers[index].nom = newNom.toUpperCase();
    DB.teachers[index].prenom = newPrenom;
    DB.teachers[index].matiere = newMat;

    renderTeachers();
    autoSave();
};

// 3. Supprimer un prof (au cas où)
window.deleteTeacher = function (index) {
    showConfirm(`Supprimer définitivement ${DB.teachers[index].nom} ?`, () => {
        DB.teachers.splice(index, 1);
        renderTeachers();
        autoSave();
    });
};
function openRoomModal() { document.getElementById('modalRoomName').value = ""; document.getElementById('roomModal').style.display = 'flex'; }
function closeRoomModal() { document.getElementById('roomModal').style.display = 'none'; }
function saveNewRoom() {
    const n = document.getElementById('modalRoomName').value;
    if (n) {
        DB.rooms.push({
            nom: n,
            capacite: parseInt(document.getElementById('modalRoomCap').value),
            isTT: document.getElementById('modalRoomTT').checked,
            isAmen: document.getElementById('modalRoomAmen').checked // AJOUT
        });
        renderRooms();
        closeRoomModal();
    }
}
function openStudentModal() { document.getElementById('modStNom').value = ""; document.getElementById('studentModal').style.display = 'flex'; }
function closeStudentModal() { document.getElementById('studentModal').style.display = 'none'; }
// [Nettoyage 07/2026] `saveNewStudent` supprimée ici : doublon mort, la version active est dans js/oral_dnb.js.
function openTeacherModal() { document.getElementById('modTeaNom').value = ""; document.getElementById('teacherModal').style.display = 'flex'; }
function closeTeacherModal() { document.getElementById('teacherModal').style.display = 'none'; }
// [Nettoyage 07/2026] `saveNewTeacher` supprimée ici : doublon mort, la version active est dans js/oral_dnb.js.
function toggleDistribLock() { if (!DB.uiState.locked.distrib) DB.uiState.locked.distrib = false; DB.uiState.locked.distrib = !DB.uiState.locked.distrib; updateDistribLock(); }
function updateDistribLock() { const locked = DB.uiState.locked.distrib; const btn = document.getElementById('lock-distrib'), cont = document.getElementById('visualDistrib'), btnWiz = document.getElementById('btnLaunchDistrib'), btnReset = document.getElementById('btnResetDistrib'); if (locked) { btn.innerHTML = "🔒 Déverrouiller"; btn.classList.add('locked'); cont.classList.add('is-locked-disabled'); btnWiz.disabled = true; btnReset.disabled = true; } else { btn.innerHTML = "🔓 Verrouiller"; btn.classList.remove('locked'); cont.classList.remove('is-locked-disabled'); btnWiz.disabled = false; btnReset.disabled = false; } }
function syncDistributionBuffer() {
    if (!DB.distribution) DB.distribution = {};

    const studentById = new Map((DB.students || []).map(student => [normalizeStudentId(student.id), student]));
    const assignedIds = new Set();

    DB.rooms.forEach(room => {
        const seenInRoom = new Set();
        const currentList = Array.isArray(DB.distribution[room.nom]) ? DB.distribution[room.nom] : [];
        DB.distribution[room.nom] = currentList.filter(student => {
            const id = normalizeStudentId(student && student.id);
            if (!id || !studentById.has(id) || seenInRoom.has(id) || assignedIds.has(id)) return false;
            seenInRoom.add(id);
            assignedIds.add(id);
            return true;
        }).map(student => studentById.get(normalizeStudentId(student.id)));
    });

    DB.distribution["Zone Tampon"] = (DB.students || []).filter(student => !assignedIds.has(normalizeStudentId(student.id)));
}

function renderVisualDistribution() {
    const container = document.getElementById('visualDistrib');
    container.innerHTML = '';
    syncDistributionBuffer();

    // Zone Tampon
    const bufferList = DB.distribution["Zone Tampon"];
    let bufferCard = createRoomCard("Zone Tampon", bufferList, { nom: "Zone Tampon", capacite: 9999 }, true);
    container.appendChild(bufferCard);

    // Salles
    DB.rooms.forEach(room => {
        const list = DB.distribution[room.nom];
        let card = createRoomCard(room.nom, list, room, false);
        container.appendChild(card);
    });
}

// Fonction helper pour créer les cartes (simplifie le code)
// Fonction helper pour créer les cartes (simplifie le code)
function createRoomCard(name, list, roomData, isBuffer) {
    let card = document.createElement('div');
    card.className = 'dd-room-card';
    card.setAttribute('data-room', name); // Ajout utile pour le debug

    if (isBuffer) { card.style.border = "2px dashed #f39c12"; card.style.backgroundColor = "#fef9e7"; }

    let badges = "";
    if (roomData.isTT) badges += '<span class="badge badge-tt">TT</span>';
    if (roomData.isAmen) badges += '<span class="badge badge-amen">Amén.</span>';

    const headerColor = isBuffer ? "background:#f39c12; color:white;" : "";
    card.innerHTML = `<div class="dd-room-header" style="${headerColor}"><span>${name} ${badges}</span> <span>${list.length}/${isBuffer ? '∞' : roomData.capacite}</span></div>`;

    let body = document.createElement('div'); body.className = 'dd-room-body';
    body.addEventListener('dragover', (e) => handleDragOver(e, body, list.length, roomData.capacite));
    body.addEventListener('dragleave', (e) => handleDragLeave(e, card));
    body.addEventListener('drop', (e) => handleDrop(e, name));

    list.forEach(student => {
        let st = document.createElement('div');
        let classes = "dd-student";
        if (student.tt) classes += " is-tt";
        // Bordure de couleur si aménagement
        if (student.labels && student.labels.some(l => l !== 'TTEMPS')) classes += " is-amen";

        st.className = classes;
        st.draggable = !DB.uiState.locked.distrib;

        // Badges sur l'élève
        let stBadges = "";
        if (student.labels) {
            student.labels.forEach(l => {
                if (l === 'TTEMPS') return;
                const def = DB.config.labels.find(d => d.code === l);
                const col = def ? def.color : "#666";
                stBadges += `<span class="badge" style="background:${col}; font-size:0.6rem; padding:1px 3px;">${l}</span>`;
            });
        }

        st.innerHTML = `<div><strong>${student.nom}</strong> ${student.prenom}</div><div style="text-align:right;">${stBadges}</div>`;
        st.addEventListener('dragstart', (e) => { draggedStudent = student; sourceRoomName = name; e.dataTransfer.effectAllowed = 'move'; });
        body.appendChild(st);
    });

    // --- C'EST CETTE LIGNE QUI MANQUAIT ---
    card.appendChild(body);
    // --------------------------------------

    return card;
}
function handleDragStart(e, student, roomName) { draggedStudent = student; sourceRoomName = roomName; e.dataTransfer.effectAllowed = 'move'; }
function handleDragOver(e, bodyElement, currentCount, maxCap) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const card = bodyElement.parentElement; card.classList.remove('drag-over-green', 'drag-over-red'); if (currentCount < maxCap) card.classList.add('drag-over-green'); else card.classList.add('drag-over-red'); }
function handleDragLeave(e, card) { card.classList.remove('drag-over-green', 'drag-over-red'); }
function handleDrop(e, targetRoomName) {
    e.preventDefault();
    document.querySelectorAll('.dd-room-card').forEach(c => c.classList.remove('drag-over-green', 'drag-over-red'));
    if (targetRoomName === sourceRoomName) return;

    if (targetRoomName !== "Zone Tampon") {
        const targetRoom = DB.rooms.find(r => r.nom === targetRoomName);
        const s = draggedStudent;
        const hasAmen = s.labels && s.labels.some(l => l !== 'TTEMPS');

        let warning = "";
        // Alerte TT
        if (s.tt && !targetRoom.isTT) warning = "Élève Tiers-Temps dans salle Standard ?";
        else if (!s.tt && targetRoom.isTT) warning = "Élève Standard dans salle Tiers-Temps ?";

        // Alerte Aménagement
        if (hasAmen && !targetRoom.isAmen) warning = "Élève avec Aménagement (ORDI...) dans salle sans label Aménagement ?";

        // Déplacement effectif
        const execMove = () => {
            const srcIndex = DB.distribution[sourceRoomName].findIndex(s => s.id === draggedStudent.id);
            if (srcIndex > -1) {
                DB.distribution[sourceRoomName].splice(srcIndex, 1);
                if (!DB.distribution[targetRoomName]) DB.distribution[targetRoomName] = [];
                DB.distribution[targetRoomName].push(draggedStudent);
                DB.distribution[targetRoomName].sort((a, b) => a.nom.localeCompare(b.nom));
                renderVisualDistribution();
                autoSave();
            }
        };
        const checkCapacity = () => {
            const currentCount = (DB.distribution[targetRoomName] || []).length;
            if (currentCount >= targetRoom.capacite) {
                showConfirm(`La salle est pleine ! Forcer ?`, execMove);
            } else {
                execMove();
            }
        };
        if (warning) { showConfirm(`⚠️ Alerte Répartition :\n${warning}\n\nContinuer ?`, checkCapacity); return; }
        checkCapacity();
        return;
    }

    // Déplacement direct (Zone Tampon, sans vérification)
    const srcIdx = DB.distribution[sourceRoomName].findIndex(s => s.id === draggedStudent.id);
    if (srcIdx > -1) {
        DB.distribution[sourceRoomName].splice(srcIdx, 1);
        if (!DB.distribution[targetRoomName]) DB.distribution[targetRoomName] = [];
        DB.distribution[targetRoomName].push(draggedStudent);
        DB.distribution[targetRoomName].sort((a, b) => a.nom.localeCompare(b.nom));
        renderVisualDistribution();
        autoSave();
    }
}
function resetDistribution() {
    showConfirm("Tout effacer ?", () => {
        if (typeof createActionBackup === 'function') createActionBackup('Avant reset répartition élèves');
        DB.distribution = {};
        DB.rooms.forEach(r => DB.distribution[r.nom] = []);
        DB.distribution["Zone Tampon"] = [...DB.students];
        renderVisualDistribution();
        if (typeof autoSave === 'function') autoSave();
    });
}
function openDistribWizard() { document.getElementById('distribModal').style.display = 'flex'; wizGoToStep(1); const list = document.getElementById('wizTTListContainer'); list.innerHTML = ''; DB.students.filter(s => s.tt).forEach(s => { list.innerHTML += `<label class="check-item"><input type="checkbox" value="${escapeHTML(normalizeStudentId(s.id))}" checked> &nbsp; ${escapeHTML(s.nom)} ${escapeHTML(s.prenom)} (${escapeHTML(s.classe)})</label>`; }); }
function closeDistribWizard() { document.getElementById('distribModal').style.display = 'none'; }
function toggleWizTTList(show) { document.getElementById('wizTTListContainer').style.display = show ? 'block' : 'none'; }
function wizGoToStep(n) { document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active')); document.getElementById('wiz-step-' + n).classList.add('active'); }
function wizGoToStep2() { const mode = document.querySelector('input[name="wizTTMode"]:checked').value; wizData.selectedTTIds = []; if (mode === 'auto') wizData.selectedTTIds = DB.students.filter(s => s.tt).map(s => normalizeStudentId(s.id)); else document.querySelectorAll('#wizTTListContainer input:checked').forEach(cb => wizData.selectedTTIds.push(normalizeStudentId(cb.value))); const ttCount = wizData.selectedTTIds.length; const ttRooms = DB.rooms.filter(r => r.isTT); const ttCap = ttRooms.reduce((acc, r) => acc + (parseInt(r.capacite) || 0), 0); const totalStudents = DB.students.length; const stdCount = totalStudents - ttCount; const stdRooms = DB.rooms.filter(r => !r.isTT); const stdCap = stdRooms.reduce((acc, r) => acc + (parseInt(r.capacite) || 0), 0); const msgDiv = document.getElementById('wizCapCheckMsg'); const btnNext = document.getElementById('btnWizStep2Next'); let html = ""; let error = false; if (ttCount > ttCap) { html += `<div style="color:#c0392b;margin-bottom:10px;"><strong>⛔ TT Insuffisant !</strong> Besoin:${ttCount} / Dispo:${ttCap}</div>`; error = true; } else html += `<div style="color:#27ae60;margin-bottom:10px;"><strong>✅ TT OK</strong> (${ttCount}/${ttCap})</div>`; if (stdCount > stdCap) { html += `<div style="color:#c0392b;"><strong>⛔ Standard Insuffisant !</strong> Besoin:${stdCount} / Dispo:${stdCap}</div>`; error = true; } else html += `<div style="color:#27ae60;"><strong>✅ Standard OK</strong> (${stdCount}/${stdCap})</div>`; msgDiv.innerHTML = html; if (error) { msgDiv.style.background = "#fdedec"; btnNext.style.display = 'none'; } else { msgDiv.style.background = "#e8f6f3"; btnNext.style.display = 'inline-block'; } wizGoToStep(2); }
function wizGoToStep3() { wizGoToStep(3); }
function executeDistribution() {
    if (typeof createActionBackup === 'function') createActionBackup('Avant assistant répartition élèves');
    // 1. Récupération des options de l'assistant
    const sortMode = document.querySelector('input[name="wizSortMode"]:checked').value;
    const fillTT = document.querySelector('input[name="wizFillTT"]:checked').value;
    const fillStd = document.querySelector('input[name="wizFillStd"]:checked').value;

    // 2. Reset de la répartition (On vide les salles)
    DB.distribution = {};
    DB.rooms.forEach(r => DB.distribution[r.nom] = []);

    // --- FONCTION UTILITAIRE DE DISTRIBUTION ---
    // Tente de placer les élèves 'pool' dans les salles 'rooms'
    // Retourne la liste des élèves qui n'ont PAS trouvé de place
    const distribute = (pool, rooms, mode) => {
        let leftovers = [...pool]; // Copie pour ne pas casser la liste d'origine

        if (rooms.length === 0) return leftovers;

        // Tri des salles par nom pour que ce soit toujours le même ordre
        rooms.sort((a, b) => a.nom.localeCompare(b.nom));

        if (mode === 'max') {
            // Remplissage MAX : on remplit la salle A à 100% avant de passer à la salle B
            rooms.forEach(room => {
                while (leftovers.length > 0 && DB.distribution[room.nom].length < room.capacite) {
                    DB.distribution[room.nom].push(leftovers.shift());
                }
            });
        } else {
            // Remplissage ÉQUILIBRÉ : on distribue un par un (A, puis B, puis A...)
            let placedSomething = true;
            let loopSecu = 0;
            while (leftovers.length > 0 && placedSomething && loopSecu < 5000) {
                placedSomething = false;
                rooms.forEach(room => {
                    if (leftovers.length > 0 && DB.distribution[room.nom].length < room.capacite) {
                        DB.distribution[room.nom].push(leftovers.shift());
                        placedSomething = true;
                    }
                });
                loopSecu++;
            }
        }
        return leftovers;
    };

    // 3. Définition des Groupes (Pools)
    const isTT = (s) => wizData.selectedTTIds.includes(normalizeStudentId(s.id));
    const hasAmen = (s) => s.labels && s.labels.some(l => l !== 'TTEMPS');

    // On prépare les 4 listes d'élèves
    let pool_TTAmen = DB.students.filter(s => isTT(s) && hasAmen(s));    // TT + Aménagement
    let pool_TTOnly = DB.students.filter(s => isTT(s) && !hasAmen(s));   // TT Seul
    let pool_AmenOnly = DB.students.filter(s => !isTT(s) && hasAmen(s)); // Aménagement Seul (Non TT)
    let pool_Standard = DB.students.filter(s => !isTT(s) && !hasAmen(s));// Standard

    // 4. Tri des élèves avant placement (Alphabétique ou Par classe)
    const sortFn = (a, b) => {
        if (sortMode === 'class') {
            if (a.classe < b.classe) return -1;
            if (a.classe > b.classe) return 1;
        }
        return a.nom.localeCompare(b.nom);
    };
    pool_TTAmen.sort(sortFn);
    pool_TTOnly.sort(sortFn);
    pool_AmenOnly.sort(sortFn);
    pool_Standard.sort(sortFn);

    // 5. Identification des Salles
    const r_TTAmen = DB.rooms.filter(r => r.isTT && r.isAmen);    // Salles TT + Aménagement
    const r_TTOnly = DB.rooms.filter(r => r.isTT && !r.isAmen);   // Salles TT "Pures"
    const r_AmenOnly = DB.rooms.filter(r => !r.isTT && r.isAmen); // Salles Aménagement "Pures"
    const r_Standard = DB.rooms.filter(r => !r.isTT && !r.isAmen);// Salles Standards

    // =========================================================
    // === APPLICATION STRICTE DE VOTRE MÉTHODOLOGIE ===
    // =========================================================

    // ETAPE 1 : TT + Aménagement -> Salles [TT + Amen]
    let rest_TTAmen = distribute(pool_TTAmen, r_TTAmen, fillTT);

    // ETAPE 2 : TT Uniquement -> Salles [TT Uniquement]
    let rest_TTOnly = distribute(pool_TTOnly, r_TTOnly, fillTT);

    // ETAPE 3 : Aménagement Uniquement -> Salles [Aménagement Uniquement]
    let rest_AmenOnly = distribute(pool_AmenOnly, r_AmenOnly, fillTT);

    // ETAPE 4 (Standard) : Les élèves restants -> Salles Standards
    let rest_Standard = distribute(pool_Standard, r_Standard, fillStd);


    // =========================================================
    // === GESTION INTELLIGENTE DES "OUBLIÉS" (OVERFLOW) ===
    // =========================================================
    // Permet de régler le cas de "l'élève TT jamais placé" s'il reste de la place ailleurs

    // Cas A : Il reste des "TT Seuls" non placés ?
    // -> On regarde s'il reste de la place dans les salles "TT + Amen" (C'est compatible car c'est une salle TT)
    if (rest_TTOnly.length > 0) {
        rest_TTOnly = distribute(rest_TTOnly, r_TTAmen, 'max');
    }

    // Cas B : Il reste des "Standards" non placés ?
    // -> On regarde s'il reste de la place dans les salles "Amen Only" (Compatible car horaires standards)
    // -> MAIS JAMAIS dans les salles TT (Interdit)
    if (rest_Standard.length > 0) {
        rest_Standard = distribute(rest_Standard, r_AmenOnly, 'max');
    }

    // =========================================================
    // === FINALISATION ===
    // =========================================================

    // On met tous ceux qui restent en Zone Tampon
    if (!DB.distribution["Zone Tampon"]) DB.distribution["Zone Tampon"] = [];

    const allRest = [...rest_TTAmen, ...rest_TTOnly, ...rest_AmenOnly, ...rest_Standard];
    allRest.forEach(s => DB.distribution["Zone Tampon"].push(s));

    renderVisualDistribution();
    closeDistribWizard();

    // Message de rapport
    let msg = "Répartition terminée selon la méthodologie stricte.\n";
    if (allRest.length > 0) {
        msg += `⚠️ ${allRest.length} élèves en Zone Tampon (Salles pleines pour leur catégorie).`;
        const nbTT = allRest.filter(s => isTT(s)).length;
        if (nbTT > 0) msg += `\n- Dont ${nbTT} élèves Tiers-Temps non placés.`;
    } else {
        msg += "✅ Tous les élèves ont trouvé une place correspondante.";
    }
    showAlertModal(msg, msg.includes('⚠️') ? 'warning' : 'success');
}



function getTakenTeachersForExam(examIdx) { let taken = []; const nbSurv = DB.config.nbSurv || 1; DB.rooms.forEach(room => { for (let i = 0; i < nbSurv; i++) { const val = DB.planning[`${examIdx}_${room.nom}_${i}`]; if (val) taken.push(val); } }); return taken; }
function countOccurrences(arr, val) { return arr.filter((v) => (v === val)).length; }
function addMinutes(time, mins) { if (!time) return "??:??"; const [h, m] = time.split(':').map(Number); const date = new Date(); date.setHours(h, m + mins); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
