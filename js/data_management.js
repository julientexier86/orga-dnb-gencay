// --- STUDENT LOGIC ---
function renderStudents() {
    const tbody = document.querySelector('#tableStudents tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // Si UI lockée
    if(DB.uiState && DB.uiState.locked && DB.uiState.locked.students) {
        // Optionnel : un affichage réduit, ou on affiche tout quand même sans les boutons.
    }

    let list = [...DB.students];
    const k = sortState.type === 'students' ? sortState.key : 'nom';
    const o = sortState.order === 'asc' ? 1 : -1;
    
    list.sort((a, b) => {
        let valA = a[k] || "";
        let valB = b[k] || "";
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return -1 * o;
        if (valA > valB) return 1 * o;
        return 0;
    });

    list.forEach(s => {
        // Badges pour Aménagements
        let amenBadges = "";
        if(s.amenagements && Array.isArray(s.amenagements)) {
            s.amenagements.forEach(code => {
                const label = DB.config.labels.find(l => l.code === code);
                if(label) {
                    amenBadges += `<span class="badge" style="background-color:${label.color}; margin-right:3px;">${label.name}</span>`;
                }
            });
        }

        const ttChecked = s.tt ? 'checked' : '';
        const acts = (DB.uiState && DB.uiState.locked && DB.uiState.locked.students) 
            ? '<button class="btn btn-warning btn-sm" disabled><i class="fas fa-edit"></i></button><button class="btn btn-danger btn-sm" disabled><i class="fas fa-trash-alt"></i></button>' 
            : `<button class="btn btn-warning btn-sm" onclick="editStudent('${s.id}')"><i class="fas fa-edit"></i></button><button class="btn btn-danger btn-sm" onclick="DB.students = DB.students.filter(x => x.id !== '${s.id}'); renderStudents();"><i class="fas fa-trash-alt"></i></button>`;

        const ttToggle = (DB.uiState && DB.uiState.locked && DB.uiState.locked.students)
            ? `<input type="checkbox" disabled ${ttChecked}>`
            : `<input type="checkbox" onchange="toggleTT('${s.id}', this.checked)" ${ttChecked}>`;

        tbody.innerHTML += `<tr>
            <td>${s.nom}</td>
            <td>${s.prenom}</td>
            <td>${s.sexe}</td>
            <td>${s.classe || "Non Classé"}</td>
            <td><input type="text" value="${s.anonymat || ""}" onchange="updateAno('${s.id}', this.value)" style="width:100px; padding:2px;" ${(DB.uiState && DB.uiState.locked && DB.uiState.locked.students) ? 'disabled' : ''}></td>
            <td>${amenBadges}</td>
            <td style="text-align:center">${ttToggle}</td>
            <td>${acts}</td>
        </tr>`;
    });
}

function toggleTT(id, checked) {
    const s = DB.students.find(x => x.id === id);
    if (s) {
        s.tt = checked;
        
        // Auto-ajout/retrait du label "TTEMPS"
        if (!s.amenagements) s.amenagements = [];
        
        if (checked) {
            if (!s.amenagements.includes("TTEMPS")) {
                s.amenagements.push("TTEMPS");
            }
        } else {
            s.amenagements = s.amenagements.filter(code => code !== "TTEMPS");
        }
        
        // Rafraîchir les UI concernées
        if(typeof renderStudents === 'function') renderStudents();
        if(typeof renderAmenagements === 'function') renderAmenagements();
    }
}

function updateAno(id, val) {
    const s = DB.students.find(x => x.id === id);
    if (s) s.anonymat = val;
}

// --- ROOMS LOGIC ---
function renderRooms() {
    const tbody = document.querySelector('#tableRooms tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let list = [...DB.rooms];
    const k = sortState.type === 'rooms' ? sortState.key : 'nom';
    const o = sortState.order === 'asc' ? 1 : -1;
    list.sort((a, b) => {
        let valA = a[k] || "";
        let valB = b[k] || "";
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return -1 * o;
        if (valA > valB) return 1 * o;
        return 0;
    });

    list.forEach((r, idx) => {
        const isLocked = (DB.uiState && DB.uiState.locked && DB.uiState.locked.rooms);
        const disabled = isLocked ? 'disabled' : '';
        const acts = isLocked ? `<button class="btn btn-danger btn-sm" disabled><i class="fas fa-trash-alt"></i></button>` : `<button class="btn btn-danger btn-sm" onclick="DB.rooms.splice(${idx}, 1); renderRooms();"><i class="fas fa-trash-alt"></i></button>`;

        tbody.innerHTML += `<tr>
            <td><input type="text" value="${r.nom}" onchange="DB.rooms[${idx}].nom=this.value; renderRooms();" ${disabled}></td>
            <td style="text-align:center;"><input type="number" value="${r.capacite}" style="width:60px; text-align:center" onchange="DB.rooms[${idx}].capacite=parseInt(this.value); renderRooms();" ${disabled}></td>
            <td style="text-align:center;"><input type="checkbox" ${r.isTT ? 'checked' : ''} onchange="DB.rooms[${idx}].isTT=this.checked; renderRooms();" ${disabled}></td>
            <td style="text-align:center;"><input type="checkbox" ${r.isAmen ? 'checked' : ''} onchange="DB.rooms[${idx}].isAmen=this.checked; renderRooms();" ${disabled}></td>
            <td style="text-align:center;">${acts}</td>
        </tr>`;
    });
}

// --- TEACHERS LOGIC ---
function renderTeachers() {
    const container = document.getElementById('teachers-list');
    if(!container) return;
    container.innerHTML = '';

    if (DB.teachers.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#7f8c8d; font-style:italic;">Aucun professeur enregistré.</p>`;
        return;
    }

    const isLocked = (DB.uiState && DB.uiState.locked && DB.uiState.locked.teachers);
    const disabledAttr = isLocked ? 'disabled' : '';

    let html = `<table class="table table-striped table-hover" style="width:100%; border-collapse:collapse; background:white;">
        <thead style="background:#f8f9fa; position:sticky; top:0; z-index:10; border-bottom:2px solid #dee2e6;">
            <tr>
                <th style="padding:10px; text-align:left; font-weight:bold; color:#2c3e50;">Civilité</th>
                <th style="padding:10px; text-align:left; font-weight:bold; color:#2c3e50;">Nom</th>
                <th style="padding:10px; text-align:left; font-weight:bold; color:#2c3e50;">Prénom</th>
                <th style="padding:10px; text-align:left; font-weight:bold; color:#2c3e50;">Matière principale</th>
                <th style="padding:10px; text-align:center; font-weight:bold; color:#e74c3c;" title="Cocher si le professeur refuse les heures supplémentaires (il ne sera convoqué que sur ses heures de cours).">
                    <i class="fas fa-ban"></i> Refus HSE
                </th>
                <th style="padding:10px; text-align:center; font-weight:bold; color:#2c3e50;">Action</th>
            </tr>
        </thead>
        <tbody>`;

    DB.teachers.forEach((t, idx) => {
        // Valeur par défaut si absente
        const civ = t.civ || "M.";
        const isHSE = t.refuseHSE ? "checked" : "";

        // Sélecteur de civilité :
        const selCiv = `
            <select style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc; font-size:0.9rem;" 
                    onchange="DB.teachers[${idx}].civ=this.value" ${disabledAttr}>
                <option value="M." ${civ === "M." ? "selected" : ""}>M.</option>
                <option value="Mme" ${civ === "Mme" ? "selected" : ""}>Mme</option>
            </select>`;

        // Sélecteur de matières prédéfinies (avec option "Autre" = Divers)
        const subjects = ["Mathématiques", "Français", "Histoire-Géo", "SVT", "Physique-Chimie", "Technologie", "Anglais", "Espagnol", "Allemand", "Arts Plastiques", "Éducation Musicale", "EPS", "Documentation", "Divers"];
        let selMatOptions = subjects.map(s => `<option value="${s}" ${t.matiere === s ? "selected" : ""}>${s}</option>`).join('');

        const selMat = `
            <select style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc; font-size:0.9rem;" 
                    onchange="DB.teachers[${idx}].matiere=this.value" ${disabledAttr}>
                ${selMatOptions}
            </select>`;

        const acts = isLocked
            ? `<button class="btn btn-danger btn-sm" disabled><i class="fas fa-trash-alt"></i></button>`
            : `<button class="btn btn-danger btn-sm" onclick="DB.teachers.splice(${idx}, 1); renderTeachers();"><i class="fas fa-trash-alt"></i></button>`;

        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${selCiv}</td>
                <td style="padding:8px;">
                    <input type="text" value="${t.nom}" style="width:100%; padding:5px; font-weight:bold; text-transform:uppercase; border:1px solid #ccc; border-radius:4px;" 
                           onchange="DB.teachers[${idx}].nom=this.value.toUpperCase()" ${disabledAttr}>
                </td>
                <td style="padding:8px;">
                    <input type="text" value="${t.prenom || ''}" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:4px;" 
                           onchange="DB.teachers[${idx}].prenom=this.value" ${disabledAttr}>
                </td>
                <td style="padding:8px;">${selMat}</td>
                <td style="padding:8px; text-align:center; vertical-align:middle;">
                    <div class="custom-control custom-switch" style="display:inline-block;">
                        <input type="checkbox" class="custom-control-input" id="hseSwitch_${idx}" ${isHSE} 
                               onchange="DB.teachers[${idx}].refuseHSE=this.checked" 
                               style="transform: scale(1.5); cursor:pointer;" ${disabledAttr}>
                    </div>
                </td>
                <td style="padding:8px; text-align:center;">${acts}</td>
            </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function sortData(type, key) {
    if (sortState.type === type && sortState.key === key) {
        sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.type = type;
        sortState.key = key;
        sortState.order = 'asc';
    }
    document.querySelectorAll(`span[id^="sort-${type}"]`).forEach(el => el.innerHTML = '');
    const span = document.getElementById(`sort-${type}-${key}`);
    if (span) span.innerHTML = sortState.order === 'asc' ? '▲' : '▼';

    if (type === 'students' && typeof renderStudents === 'function') renderStudents();
    if (type === 'rooms' && typeof renderRooms === 'function') renderRooms();
}

function openStudentModal() {
    const nom = prompt("Nom de l'élève :");
    if (!nom) return;
    const prenom = prompt("Prénom de l'élève :");
    if (!prenom) return;
    
    DB.students.push({
        id: Date.now().toString(),
        nom: nom.toUpperCase(),
        prenom: prenom,
        classe: "Non Classé",
        sexe: "M",
        tt: false,
        anonymat: "",
        amenagements: [] // Toujours initialiser comme tableau pour inclure TTEMPS via checkbox
    });
    
    // NOUVEAU : Enregistre immédiatement l'action
    if(typeof saveGlobalData === 'function') saveGlobalData(true);
    if(typeof renderStudents === 'function') renderStudents();
}

function openRoomModal() {
    const nom = prompt("Nom de la salle :");
    if (!nom) return;
    
    DB.rooms.push({
        nom: nom.toUpperCase(),
        capacite: 20,
        isTT: false,
        isAmen: false
    });
    
    if(typeof saveGlobalData === 'function') saveGlobalData(true);
    if(typeof renderRooms === 'function') renderRooms();
}

function openTeacherModal() {
    const nom = prompt("Nom du professeur :");
    if (!nom) return;
    
    DB.teachers.push({
        nom: nom.toUpperCase(),
        prenom: "",
        civ: "M.",
        matiere: "Divers",
        refuseHSE: false
    });
    
    if(typeof saveGlobalData === 'function') saveGlobalData(true);
    if(typeof renderTeachers === 'function') renderTeachers();
}

// Fonction de validation
function editStudent(id) {
    // Basic prompt implementation, the full one requires modal
    const s = DB.students.find(x => x.id === id);
    if(s) {
        const nom = prompt("Nouveau nom:", s.nom);
        if(nom) s.nom = nom.toUpperCase();
        if(typeof renderStudents === 'function') renderStudents();
    }
}
