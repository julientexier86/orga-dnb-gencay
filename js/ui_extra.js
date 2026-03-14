// === MODULE: ui_extra ===
// --- ÉTIQUETTES DE TABLE ---
function generateTableLabelsPDF(nbCols, nbRows) {
    if (window.syncDistributionData) window.syncDistributionData();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const items = [];
    if (DB.distribution && Object.keys(DB.distribution).length > 0) {
        Object.keys(DB.distribution).sort().forEach(roomName => {
            if (roomName === "Zone Tampon") return;
            DB.distribution[roomName].forEach(s => {
                items.push({ room: roomName, name: `${s.nom} ${s.prenom}`, classe: s.classe, code: s.anonymat || "" });
            });
        });
    } else {
        DB.students.forEach(s => items.push({ room: "NON PLACÉ", name: `${s.nom} ${s.prenom}`, classe: s.classe, code: s.anonymat || "" }));
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
        doc.setDrawColor(200); doc.setLineDash([1, 1]); doc.rect(x, y, boxW, boxH); doc.setLineDash([]);
        doc.setFontSize(8); doc.setTextColor(100); doc.text(`DNB ${DB.config.year || ""} - Salle ${item.room}`, cx, y + 8, {align:'center'});
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.text(item.name, cx, cy, {align:'center'});
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(item.classe, cx, cy + 6, {align:'center'});
        if (item.code) { doc.setFontSize(11); doc.setTextColor(192, 57, 43); doc.text(item.code, cx, y + boxH - 6, {align:'center'}); }
    });
    doc.save("Etiquettes_Table.pdf");
}


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

