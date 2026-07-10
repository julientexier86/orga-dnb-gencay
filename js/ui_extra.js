// [Nettoyage 07/2026] `generateTableLabelsPDF` supprimée ici : doublon mort, la version active est dans js/v12_features.js.


// --- SYNCHRONISATION DONNÉES DE RÉPARTITION ---
window.syncDistributionData = function() {
    if (!DB.distribution || !DB.students) return;
    const validStudentKeys = new Set(DB.students.map(s => `${s.nom}_${s.prenom}`));
    Object.keys(DB.distribution).forEach(roomName => {
        DB.distribution[roomName] = DB.distribution[roomName]
            .filter(s => validStudentKeys.has(`${s.nom}_${s.prenom}`))
            .map(distStudent => DB.students.find(s => s.nom === distStudent.nom && s.prenom === distStudent.prenom) || distStudent);
    });
    if (!DB.distribution["Zone Tampon"]) DB.distribution["Zone Tampon"] = [];
    const placedKeys = new Set();
    Object.keys(DB.distribution).forEach(roomName => {
        DB.distribution[roomName].forEach(s => placedKeys.add(`${s.nom}_${s.prenom}`));
    });
    DB.students.forEach(student => {
        if (!placedKeys.has(`${student.nom}_${student.prenom}`)) {
            if(!DB.distribution["Zone Tampon"].find(s => s.nom === student.nom && s.prenom === student.prenom)) {
                DB.distribution["Zone Tampon"].push(student);
            }
        }
    });
};

// --- MODALE SALLE SPÉCIALE ---
window.openSpecialRoomModal = function() {
    currentSpecialRoomSelection = "";
    document.getElementById('customSpecialRoomContainer').style.display = 'none';
    document.getElementById('customSpecialRoomInput').value = "";
    document.querySelectorAll('#specialRoomModal .tile').forEach(t => {
        t.style.borderColor = '#edeff0'; t.style.backgroundColor = '#fdfdfd';
        t.setAttribute('aria-checked', 'false');
    });
    document.getElementById('specialRoomModal').style.display = 'flex';
};

window.selectSpecialRoom = function(name, element) {
    currentSpecialRoomSelection = name;
    document.getElementById('customSpecialRoomContainer').style.display = 'none';
    document.querySelectorAll('#specialRoomModal .tile').forEach(t => {
        t.style.borderColor = '#edeff0'; t.style.backgroundColor = '#fdfdfd';
        t.setAttribute('aria-checked', 'false');
    });
    if(element) {
        element.style.borderColor = '#3498db'; element.style.backgroundColor = '#f0f7ff';
        element.setAttribute('aria-checked', 'true');
    }
};

window.toggleCustomSpecialRoom = function() {
    currentSpecialRoomSelection = "CUSTOM";
    document.getElementById('customSpecialRoomContainer').style.display = 'block';
    document.querySelectorAll('#specialRoomModal .tile').forEach(t => {
        t.style.borderColor = '#edeff0'; t.style.backgroundColor = '#fdfdfd';
        t.setAttribute('aria-checked', 'false');
    });
    const customTile = document.getElementById('tileCustomRoom');
    if(customTile) {
        customTile.style.borderColor = '#3498db'; customTile.style.backgroundColor = '#f0f7ff';
        customTile.setAttribute('aria-checked', 'true');
    }
    document.getElementById('customSpecialRoomInput').focus();
};

window.validateSpecialRoom = function() {
    let roomName = currentSpecialRoomSelection;
    if (roomName === "CUSTOM") {
        roomName = document.getElementById('customSpecialRoomInput').value.trim();
        if (!roomName) return showToast("Veuillez saisir un nom pour le lieu personnalisé.", 'warning');
    } else if (!roomName) {
        return showToast("Veuillez sélectionner un lieu.", 'warning');
    }
    DB.rooms.push({
        id: Date.now() + Math.random(), nom: roomName, capacite: 0,
        isTT: true, isAmen: false, isSpecial: true
    });
    document.getElementById('specialRoomModal').style.display = 'none';
    if(typeof renderRooms === "function") renderRooms();
    if(typeof renderPlanning === "function") renderPlanning();
    if(typeof autoSave === 'function') autoSave();
    if(typeof showToast === 'function') showToast(`Lieu "${roomName}" ajouté !`);
};

