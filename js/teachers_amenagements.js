// === MODULE: teachers_amenagements ===
// --- MODULE ETIQUETTES (CODE RETOUR V5) ---

// --- MODULE ETIQUETTES (VERSION V5 RÉPARÉE) ---
// --- FONCTIONS UTILITAIRES MANQUANTES ---

function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function saveDB() {
    // Cette ligne sauvegarde vos données dans la mémoire du navigateur.
    // IMPORTANT : Vérifiez que 'OrgaDNB_V5_Data' correspond bien à ce qui est dans votre fonction loadDB() plus bas/haut.
    // Si vos données ne reviennent pas après rechargement, remplacez 'OrgaDNB_V5_Data' par le nom trouvé dans loadDB.
    localStorage.setItem('OrgaDNB_V5_Data', JSON.stringify(DB));

    // Si vous avez un système de notification toast, on peut l'afficher (optionnel)
    // console.log("Sauvegarde effectuée");
}

// ----------------------------------------
function addLabel() {
    // Récupération des champs (inputs en haut de la liste)
    const codeInput = document.getElementById('newAmenCode');
    const nameInput = document.getElementById('newAmenName'); // Champ description ajouté
    const colorInput = document.getElementById('newAmenColor');

    const code = codeInput.value.trim().toUpperCase();
    const name = nameInput ? nameInput.value.trim() : ""; // Sécurité si le champ n'est pas là
    const color = colorInput.value;

    if (!code) return showToast("Le CODE est obligatoire !", 'error');

    // Initialisation DB si besoin
    if (!DB.config) DB.config = {};
    if (!DB.config.labels) DB.config.labels = [];

    // Vérif doublon
    if (DB.config.labels.find(l => l.code === code)) {
        return showToast("Ce CODE existe déjà !", 'error');
    }

    // Ajout
    DB.config.labels.push({
        id: generateUniqueId(),
        code: code,
        name: name,
        color: color
    });

    // Reset des champs
    codeInput.value = '';
    if (nameInput) nameInput.value = '';

    saveDB();
    renderLabels();
}

function editLabel(oldCode) {
    const label = DB.config.labels.find(l => l.code === oldCode);
    if (!label) return;

    // POPUP 1 : Code
    let newCode = prompt("Modifier le CODE (court) :", label.code);
    if (newCode === null) return;
    newCode = newCode.toUpperCase().trim();

    // POPUP 2 : Description
    let newName = prompt("Modifier la DESCRIPTION :", label.name || "");
    if (newName === null) return;

    // POPUP 3 : Couleur
    let newColor = prompt("Modifier la COULEUR (Hexa) :", label.color);
    if (newColor === null) return;

    // Mise à jour des élèves si le code change
    if (newCode !== oldCode) {
        DB.students.forEach(s => {
            if (s.labels && s.labels.includes(oldCode)) {
                const idx = s.labels.indexOf(oldCode);
                s.labels[idx] = newCode;
            }
        });
    }

    label.code = newCode;
    label.name = newName;
    label.color = newColor;

    saveDB();
    renderLabels();
}

function deleteLabel(code) {
    if (code === 'TTEMPS') return showToast("Impossible de supprimer le label système TTEMPS.", 'warning');

    showConfirm("Supprimer ce label ?", () => {
        DB.config.labels = DB.config.labels.filter(l => l.code !== code);

        // Nettoyage élèves
        DB.students.forEach(s => {
            if (s.labels) s.labels = s.labels.filter(l => l !== code);
        });

        saveDB();
        renderLabels();
    });
}

function renderLabels() {
    const list = document.getElementById('labelsList');
    if (!list) return;

    if (!DB.config) DB.config = {};
    if (!DB.config.labels) DB.config.labels = [];

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
}

function toggleStudentLabel(studentId, code, btnElement) {
    const s = DB.students.find(st => st.id === studentId);
    if (!s) return;
    if (!s.labels) s.labels = [];

    // 1. Mise à jour des DONNÉES (Invisible)
    const labelConfig = DB.config.labels.find(l => l.code === code);
    let isActive = false;

    if (s.labels.includes(code)) {
        // Retrait
        s.labels = s.labels.filter(l => l !== code);
        if (code === 'TTEMPS') s.tt = false;
        isActive = false;
    } else {
        // Ajout
        s.labels.push(code);
        if (code === 'TTEMPS') s.tt = true;
        isActive = true;
    }

    // 2. Mise à jour VISUELLE INSTANTANÉE (Chirurgicale)
    // On modifie directement le style de l'élément cliqué (btnElement)
    if (btnElement) {
        btnElement.style.opacity = isActive ? "1" : "0.2";
        btnElement.style.border = isActive ? `2px solid ${labelConfig.color}` : "1px solid #ccc";
        btnElement.style.fontWeight = isActive ? "bold" : "normal";

        // Petit effet de "scale" pour sentir le clic
        btnElement.style.transform = "scale(0.95)";
        setTimeout(() => btnElement.style.transform = "scale(1)", 100);
    }

    // NOTE : On NE lance PAS renderAmenagements() ni renderStudents() ici.
    // C'est ce qui causait la latence.
}

// --- FONCTION DE GÉNÉRATION DES FILTRES MEF (ALIGNEMENT GAUCHE FORCÉ) ---
function updateMefCheckboxes() {
    const container = document.getElementById('mefCheckContainer');
    if (!container) return;

    // Récupération des MEF uniques
    const allMefs = [...new Set(DB.students.map(s => s.mef).filter(m => m && m.trim() !== ""))].sort();

    if (allMefs.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:#999; font-style:italic; text-align:left;">Aucun MEF détecté.</div>';
        return;
    }

    // Sauvegarde de l'état
    const existingChecks = Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
    const isFirstRun = (container.querySelectorAll('input').length === 0);

    let html = '';
    allMefs.forEach(mef => {
        const checked = isFirstRun ? 'checked' : (existingChecks.includes(mef) ? 'checked' : '');

        // C'est ICI que l'alignement se joue : "justify-content: flex-start" = GAUCHE
        html += `
        <label style="display:flex !important; align-items:center !important; justify-content:flex-start !important; width:100% !important; margin-bottom:2px !important; padding:2px !important; cursor:pointer !important; text-align:left !important;">
 <input type="checkbox" class="mef-checkbox" value="${mef}" ${checked} onchange="renderAmenagements()" style="margin:0 10px 0 0 !important; width:auto !important;">
            <span title="${mef}" style="font-size:0.85rem !important; white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; text-align:left !important;">${mef}</span>
        </label>`;
    });

    container.innerHTML = html;
}

// --- 2. AFFICHAGE PRINCIPAL (Le coeur du filtre) ---
window.renderAmenagements = function () {
    // A. Initialisation (Si les cases n'existent pas encore)
    const mefContainer = document.getElementById('mefCheckContainer');
    if (mefContainer && (!mefContainer.innerHTML.includes('input') && DB.students.length > 0)) {
        updateMefCheckboxes();
    }

    // B. Récupération des filtres
    const searchVal = document.getElementById('amenSearchInput') ? document.getElementById('amenSearchInput').value.toLowerCase() : "";

    // Filtre MEF : On liste ce qui est coché
    const checkboxes = document.querySelectorAll('.mef-checkbox');
    const checkedMefs = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    // Si aucune case n'existe (pas de MEF), on considère qu'on affiche tout
    const ignoreMefFilter = (checkboxes.length === 0);

    // D. Rendu Tableau Élèves (Droite)
    const tbody = document.getElementById('amenBody');
    if (!tbody) return;

    tbody.innerHTML = "";

    // On filtre
    const filtered = DB.students.filter(s => {
        // 1. Recherche Texte
        if (searchVal && !s.nom.toLowerCase().includes(searchVal) && !s.prenom.toLowerCase().includes(searchVal)) return false;

        // 2. Filtre MEF
        if (!ignoreMefFilter) {
            // Si l'élève a un MEF, est-il coché ?
            // (Note: s.mef || "" gère le cas où le champ est vide)
            if (s.mef && !checkedMefs.includes(s.mef)) return false;
            // Si l'élève n'a PAS de MEF, on décide de l'afficher seulement si "Tout" est coché ou selon votre préférence. 
            // Ici : Si je décoche tout, je cache tout.
            if (!s.mef && checkedMefs.length === 0) return false;
        }
        return true;
    });

    // On trie et on affiche
    filtered.sort((a, b) => a.nom.localeCompare(b.nom)).forEach(s => {
        // Badges
        let badges = "";
        (DB.config.labels || []).forEach(l => {
            const isActive = (s.labels || []).includes(l.code);
            const style = isActive
                ? `background:${l.color}; color:white; border:1px solid ${l.color};`
                : `background:white; color:#ccc; border:1px solid #ddd;`;

            badges += `<span onclick="toggleStudentLabel(${s.id}, '${l.code}')" 
                       style="cursor:pointer; padding:2px 6px; border-radius:10px; font-size:0.7rem; margin-right:4px; user-select:none; ${style}">
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
// =========================================================
// === MODULE EXPORT AMÉNAGEMENTS (AJOUT MANQUANT) ===
// =========================================================

function openAmenagOptions() {
    const hasDistrib = DB.distribution && Object.keys(DB.distribution).length > 0;

    // --- A. CRÉATION DU FOND (OVERLAY) ---
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: '9999',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    });

    // --- B. CRÉATION DE LA FENÊTRE (MODAL) ---
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: 'white', padding: '30px', borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center',
        maxWidth: '600px', width: '90%', fontFamily: 'Helvetica, sans-serif'
    });

    modal.innerHTML = `<h3 style="color:#2c3e50; margin-top:0;">♿ Liste des Aménagements</h3>`;

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex', gap: '20px', marginTop: '25px', justifyContent: 'center'
    });

    // Fonction Helper pour les Cartes
    function createCard(emoji, title, desc, color, action) {
        const card = document.createElement('div');
        Object.assign(card.style, {
            flex: '1', padding: '20px', border: '2px solid #eee', borderRadius: '10px',
            cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#f8f9fa'
        });

        card.innerHTML = `
            <div style="font-size:40px; margin-bottom:10px;">${emoji}</div>
            <div style="font-weight:bold; color:${color}; font-size:16px;">${title}</div>
            <div style="font-size:12px; color:#7f8c8d; margin-top:5px;">${desc}</div>
        `;

        card.onmouseenter = () => { card.style.borderColor = color; card.style.backgroundColor = 'white'; card.style.transform = 'translateY(-3px)'; };
        card.onmouseleave = () => { card.style.borderColor = '#eee'; card.style.backgroundColor = '#f8f9fa'; card.style.transform = 'translateY(0)'; };

        card.onclick = () => {
            document.body.removeChild(overlay);
            action();
        };
        return card;
    }

    // Option 1 : Alphabétique
    const btnAlpha = createCard(
        "🔤",
        "Alphabétique",
        "Liste complète triée de A à Z (Avec salle)",
        "#3498db",
        () => exportAmenagPDF('alpha')
    );

    // Option 2 : Par Salle
    const btnRoom = createCard(
        "🏫",
        "Par Salle",
        hasDistrib ? "Groupé par salle d'examen" : "⚠️ Répartition requise !",
        hasDistrib ? "#e67e22" : "#95a5a6",
        () => {
            if (!hasDistrib) showToast("⚠️ Veuillez d'abord effectuer la répartition dans l'onglet Répartition.", 'warning');
            else exportAmenagPDF('room');
        }
    );

    btnContainer.appendChild(btnAlpha);
    btnContainer.appendChild(btnRoom);
    modal.appendChild(btnContainer);

    // Bouton Annuler
    const btnCancel = document.createElement('div');
    btnCancel.innerText = "Annuler";
    Object.assign(btnCancel.style, { marginTop: "20px", color: "#999", cursor: "pointer", fontSize: "14px", textDecoration: "underline" });
    btnCancel.onclick = () => document.body.removeChild(overlay);
    modal.appendChild(btnCancel);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

// --- EXPORT PDF AMÉNAGEMENTS (AVEC MEF) ---
window.exportAmenagPDF = function (sortMode) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    addSmartLogo(doc, 10, 10, 45);
    doc.setFontSize(16); doc.text("Liste des Aménagements DNB Blanc", 105, 15, { align: 'center' });
    doc.setFontSize(11); doc.text(`Session ${DB.config.year} - ${DB.config.schoolName}`, 105, 22, { align: 'center' });

    if (sortMode === 'room') {
        doc.setFontSize(10); doc.setTextColor(230, 126, 34);
        doc.text("Trié par Salle", 105, 27, { align: 'center' });
    }

    let studentRoomMap = {};
    if (DB.distribution) {
        Object.keys(DB.distribution).forEach(roomName => {
            DB.distribution[roomName].forEach(s => { studentRoomMap[s.id] = roomName; });
        });
    }

    let body = [];
    const getRow = (s, room) => [room, s.classe, s.mef || "", s.nom, s.prenom, (s.labels || []).join(', ')];

    // LOGIQUE DE TRI
    if (sortMode === 'room') {
        const sortedRooms = Object.keys(DB.distribution).sort();
        sortedRooms.forEach(room => {
            const roomStudents = DB.distribution[room].filter(s => s.labels && s.labels.length > 0);
            roomStudents.sort((a, b) => a.nom.localeCompare(b.nom));
            roomStudents.forEach(s => body.push(getRow(s, room)));
        });
    } else {
        const sortedStudents = [...DB.students].sort((a, b) => a.nom.localeCompare(b.nom));
        sortedStudents.forEach(s => {
            if (s.labels && s.labels.length > 0) {
                body.push(getRow(s, studentRoomMap[s.id] || "-"));
            }
        });
    }

    if (body.length === 0) return showToast("Aucun élève avec aménagement trouvé.", 'warning');

    doc.autoTable({
        head: [['Salle', 'Cl.', 'MEF', 'Nom', 'Prénom', 'Aménagements']], // En-tête mis à jour
        body: body,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: [44, 62, 80], cellWidth: 25 },
            1: { cellWidth: 15 },
            2: { cellWidth: 20, fontSize: 8, textColor: [41, 128, 185] }, // Style colonne MEF
            5: { textColor: [230, 126, 34], fontStyle: 'bold' }
        }
    });

    doc.save(`Liste_Amenagements_${sortMode}.pdf`);
};
// =========================================================================
// === EXTENSION V4 : GESTION DES CRÉNEAUX HORAIRES & PLANNING TEMPOREL ===
// =========================================================================

