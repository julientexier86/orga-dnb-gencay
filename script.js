                    tt: false
                });
                report.success++;
            } else {
                addError(lineNum, "Nom ou Prénom manquant");
            }
        });
        renderStudents();
    }
    // --- 3. IMPORT PROFS ---
    else if (type === 'teachers') {
        const kNom = findKey(data[0], ['nom']);
        if (!kNom) return alert("❌ Colonne 'Nom' introuvable.");

        const kPrenom = findKey(data[0], ['prénom', 'prenom']);
        // CORRECTION ICI : On rétablit la recherche de la colonne Civilité
        const kCiv = findKey(data[0], ['civilité', 'civ', 'civilite']);
        const kMat = findKey(data[0], ['matière', 'discipline']);

        data.forEach((row, idx) => {
            if (row[kNom]) {
                DB.teachers.push({
                    // Si la colonne existe, on l'utilise, sinon "M." par défaut
                    civ: kCiv ? row[kCiv] : "M.",
                    nom: row[kNom].toString().trim().toUpperCase(),
                    prenom: kPrenom ? row[kPrenom].toString().trim() : "",
                    matiere: kMat ? row[kMat].toString().trim() : "Divers"
                });
                report.success++;
        if (!kNom || !kVal) return alert("❌ Colonnes 'Nom' ou 'Note/Moyenne' introuvables.");

        data.forEach((row, idx) => {
            const student = DB.students.find(s => s.nom.toLowerCase() === row[kNom].toString().trim().toLowerCase());
            if (student) {
                if (!student.grades) student.grades = {};
                let val = cleanNumber(row[kVal]);

                if (type === 'oral') student.grades.oral = val;
                else student.grades.genAvg = val;

                report.success++;
            } else {
                addError(idx + 2, `Élève inconnu pour simulation: ${row[kNom]}`);
            }
        });
        renderSimulation();
    }

    // --- RAPPORT FINAL ---
    let msg = `✅ ${report.success} éléments importés avec succès.`;
    if (report.errors.length > 0) {
        msg += `\n\n⚠️ ATTENTION : ${report.errors.length} anomalies détectées :\n`;
        msg += report.errors.join("\n");
        msg += `\n\n(Vérifiez l'orthographe des noms ou le format des notes)`;
    }
    alert(msg);
}
// --- FIN DE L'ANCIENNE VERSION ---

function renderGrades() {
    if (select && select.options.length === 1 && uniqueClasses.length > 0) { uniqueClasses.forEach(c => { let opt = document.createElement('option'); opt.value = c; opt.text = c; select.appendChild(opt); }); }
    let displayList = DB.students.map(s => {
        if (!s.grades) return null;
        if (filterVal !== "all" && s.classe !== filterVal) return null;
        let sumSci = 0, countSci = 0;
        if (activeSciences.includes('SVT') && s.grades.svt !== null) { sumSci += s.grades.svt; countSci++; }
        if (activeSciences.includes('PC') && s.grades.pc !== null) { sumSci += s.grades.pc; countSci++; }
        if (activeSciences.includes('TECH') && s.grades.tech !== null) { sumSci += s.grades.tech; countSci++; }
        const moySci = countSci > 0 ? (sumSci / countSci) : null;
        let sumGen = 0, countGen = 0;
        if (s.grades.fr !== null) { sumGen += s.grades.fr; countGen++; }
        if (s.grades.math !== null) { sumGen += s.grades.math; countGen++; }
        if (s.grades.hg !== null) { sumGen += s.grades.hg; countGen++; }
        if (moySci !== null) { sumGen += moySci; countGen++; }
        const moyDNB = countGen > 0 ? (sumGen / countGen) : null;
        return { ...s, moySciVal: moySci, moyDNBVal: moyDNB };
    }).filter(s => s !== null);
    const k = gradeSortState.key; const o = gradeSortState.order === 'asc' ? 1 : -1;
    displayList.sort((a, b) => { let valA, valB; if (k === 'nom') { valA = a.nom; valB = b.nom; } else if (k === 'moyDNB') { valA = a.moyDNBVal || -1; valB = b.moyDNBVal || -1; } else { valA = a.grades[k] || -1; valB = b.grades[k] || -1; } if (valA < valB) return -1 * o; if (valA > valB) return 1 * o; return 0; });
    const totalCount = displayList.length;
    if (filterVal === 'all' && displayList.length > 30) { displayList = displayList.slice(0, 30); document.getElementById('gradeCountLabel').innerText = `Affichage: 30 / ${totalCount} élèves (Utilisez le filtre pour tout voir)`; } else { document.getElementById('gradeCountLabel').innerText = `${totalCount} élèves affichés`; }
    displayList.forEach(s => { const ms = s.moySciVal !== null ? s.moySciVal.toFixed(2) : "-"; const md = s.moyDNBVal !== null ? s.moyDNBVal.toFixed(2) : "-"; tbody.innerHTML += `<tr><td>${s.nom} ${s.prenom}</td><td>${s.classe || ""}</td><td style="background:#e8f8f5; font-weight:bold; color:#145a32;">${md}</td><td>${s.grades.fr || "-"}</td><td>${s.grades.math || "-"}</td><td>${s.grades.hg || "-"}</td><td>${s.grades.svt || "-"}</td><td>${s.grades.pc || "-"}</td><td>${s.grades.tech || "-"}</td><td style="background:#eaf2f8; font-weight:bold;">${ms}</td></tr>`; });
}
function sortGrades(key) { if (gradeSortState.key === key) { gradeSortState.order = gradeSortState.order === 'asc' ? 'desc' : 'asc'; } else { gradeSortState.key = key; gradeSortState.order = 'desc'; } renderGrades(); }

function filterSimulation(val) { simulSearchTerm = val.toLowerCase(); renderSimulation(); }

function renderSimulation() {
    const tbody = document.querySelector('#tableSimulation tbody'); tbody.innerHTML = '';
    const activeSciences = DB.config.scienceSubjects || ['SVT', 'PC', 'TECH'];

    let list = DB.students.map(s => {
        if (!s.grades) return null;
        if (simulSearchTerm && !s.nom.toLowerCase().includes(simulSearchTerm) && !s.prenom.toLowerCase().includes(simulSearchTerm)) return null;

        // 1. Calcul Moyenne Sciences
        let sumSci = 0, countSci = 0;
        if (activeSciences.includes('SVT') && s.grades.svt !== null) { sumSci += s.grades.svt; countSci++; }
        if (activeSciences.includes('PC') && s.grades.pc !== null) { sumSci += s.grades.pc; countSci++; }
        if (activeSciences.includes('TECH') && s.grades.tech !== null) { sumSci += s.grades.tech; countSci++; }
        const moySci = countSci > 0 ? (sumSci / countSci) : null;

        // 2. Calcul Somme Écrits
        let sumEcrit = 0, countEcrit = 0;
        if (s.grades.fr !== null) { sumEcrit += s.grades.fr; countEcrit++; }
        if (s.grades.math !== null) { sumEcrit += s.grades.math; countEcrit++; }
        if (s.grades.hg !== null) { sumEcrit += s.grades.hg; countEcrit++; }
        if (moySci !== null) { sumEcrit += moySci; countEcrit++; }

        const moyEcritsVal = countEcrit > 0 ? (sumEcrit / countEcrit) : 0;

        // 3. Calcul Moyenne Épreuves (Écrits + Oral)
        // CORRECTION ICI : on ne multiplie plus par countEcrit
        let sumEpreuves = sumEcrit;
        let countEpreuves = countEcrit;

        if (s.grades.oral !== null && s.grades.oral !== undefined) {
            sumEpreuves += s.grades.oral;
            countEpreuves++;
        }
        const moyEpreuves = countEpreuves > 0 ? (sumEpreuves / countEpreuves) : 0;

        // 4. Calcul Moyenne DNB (60% Épreuves / 40% Contrôle Continu)
        const moyGen = (s.grades.genAvg !== null) ? s.grades.genAvg : 0;
        let finalAvg = 0;
        if (moyGen > 0 && moyEpreuves > 0) finalAvg = (moyGen * 0.4) + (moyEpreuves * 0.6);
        else if (moyEpreuves > 0) finalAvg = moyEpreuves;
        else if (moyGen > 0) finalAvg = moyGen;

        let mention = "Refusé";
        if (finalAvg >= 10) mention = "Admis";
        if (finalAvg >= 12) mention = "Assez Bien";
        if (finalAvg >= 14) mention = "Bien";
        if (finalAvg >= 16) mention = "Très Bien";
        if (finalAvg >= 18) mention = "TB (Félicitations)";

        return { ...s, moyEcritsVal, moyEpreuves, moyGen, finalAvg, mention };
    }).filter(s => s !== null);

    // Tri et Affichage
    const k = simulSortState.key; const o = simulSortState.order === 'asc' ? 1 : -1;
    list.sort((a, b) => {
        let valA, valB;
        if (k === 'nom') { valA = a.nom; valB = b.nom; }
        else if (k === 'classe') { valA = a.classe; valB = b.classe; }
        else if (k === 'moyEcrit') { valA = a.moyEcritsVal; valB = b.moyEcritsVal; }
        else if (k === 'oral') { valA = a.grades.oral || -1; valB = b.grades.oral || -1; }
        else if (k === 'moyEpreuve') { valA = a.moyEpreuves; valB = b.moyEpreuves; }
        else if (k === 'moyGen') { valA = a.moyGen; valB = b.moyGen; }
        else if (k === 'final') { valA = a.finalAvg; valB = b.finalAvg; }
        if (valA < valB) return -1 * o; if (valA > valB) return 1 * o; return 0;
    });

    list.forEach(s => {
        let color = "#e74c3c";
        if (s.finalAvg >= 10) color = "#27ae60";
        if (s.finalAvg >= 12) color = "#f39c12";
        if (s.finalAvg >= 14) color = "#3498db";
        if (s.finalAvg >= 16) color = "#8e44ad";
        if (s.finalAvg >= 18) color = "#d35400";

        tbody.innerHTML += `<tr>
                <td>${s.nom} ${s.prenom}</td>
                <td>${s.classe || ""}</td>
                <td style="text-align:center">${s.moyEcritsVal.toFixed(2)}</td>
                <td style="text-align:center">${s.grades.oral !== undefined && s.grades.oral !== null ? s.grades.oral : "-"}</td>
                <td style="text-align:center; font-weight:bold; color:#555;">${s.moyEpreuves.toFixed(2)}</td>
                <td style="text-align:center">${s.grades.genAvg !== undefined && s.grades.genAvg !== null ? s.grades.genAvg : "-"}</td>
                <td style="background:#eaf2f8; text-align:center; font-weight:bold; font-size:1.1em;">${s.finalAvg.toFixed(2)} / 20</td>
                <td style="text-align:center; font-weight:bold; color:${color}">${s.mention}</td>
            </tr>`;
    });
}

function sortSimulation(key) {
    if (simulSortState.key === key) { simulSortState.order = simulSortState.order === 'asc' ? 'desc' : 'asc'; }
    else { simulSortState.key = key; simulSortState.order = 'desc'; }
    renderSimulation();
}

// MENU VISUEL POUR LES RELEVÉS DE NOTES (Remplace l'ancien menu liste)
function openReleveOptions() {
    if (DB.students.length === 0) return alert("Aucun élève dans la base.");

    // --- 1. CRÉATION DU FOND (OVERLAY) ---
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: '9999',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    });

    // --- 2. CRÉATION DE LA FENÊTRE (MODAL) ---
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        backgroundColor: 'white', padding: '30px', borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center',
        maxWidth: '600px', width: '90%', fontFamily: 'Helvetica, sans-serif'
    });

    // Titre
    modal.innerHTML = `<h3 style="color:#2c3e50; margin-top:0;">📊 Imprimer les Relevés de Notes</h3>`;

    // Conteneur des Boutons
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex', gap: '20px', marginTop: '25px', justifyContent: 'center'
    });

    // Fonction utilitaire pour créer une carte visuelle
    function createCard(emoji, title, desc, color, sortMode) {
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

        // Effet de survol
        card.onmouseenter = () => {
            card.style.borderColor = color;
            card.style.backgroundColor = 'white';
            card.style.transform = 'translateY(-3px)';
            card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        };
        card.onmouseleave = () => {
            card.style.borderColor = '#eee';
            card.style.backgroundColor = '#f8f9fa';
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        };

        // Action au clic
        card.onclick = () => {
            document.body.removeChild(overlay); // Ferme la fenêtre
            exportRelevesNotes(sortMode, 'all'); // Lance l'impression
        };

        return card;
    }

    // --- 3. CRÉATION DES DEUX OPTIONS ---

    // Option A : Par Classe (Vert)
    const btnClass = createCard(
        "🏫",
        "Par Classe",
        "Trié par classe, puis par nom (Sauts de page inclus)",
        "#27ae60",
        "class"
    );

    // Option B : Alphabétique (Bleu)
    const btnAlpha = createCard(
        "🌍",
        "Alphabétique",
        "Trié de A à Z (Tout le collège mélangé)",
        "#2980b9",
        "alpha"
    );

    // Ajout des cartes au conteneur
    btnContainer.appendChild(btnClass);
    btnContainer.appendChild(btnAlpha);
    modal.appendChild(btnContainer);

    // --- 4. BOUTON ANNULER ---
    const btnCancel = document.createElement('div');
    btnCancel.innerText = "Annuler";
    Object.assign(btnCancel.style, {
        marginTop: "25px", color: "#999", cursor: "pointer",
        fontSize: "14px", textDecoration: "underline"
    });
    btnCancel.onclick = () => document.body.removeChild(overlay);
    modal.appendChild(btnCancel);

    // Assemblage final
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
function validateConvocOptions() {
    const type = document.getElementById('printType').value;
    const sortMode = document.querySelector('input[name="convocSort"]:checked').value;
    const targetId = document.getElementById('convocStudentSelect').value;

    if (type === 'releve') exportRelevesNotes(sortMode, targetId);
    else exportConvocationStudents(sortMode, targetId);

    closeConvocOptions();
    document.getElementById('printType').value = 'convoc';
}

// 4. RELEVÉS DE NOTES (Corrigé, Complet avec Calculs)
window.exportRelevesNotes = function (sortMode, targetId) {
    DB.config.schoolName = document.getElementById('schoolName').value;
    DB.config.year = document.getElementById('sessionYear').value;
    const activeSciences = DB.config.scienceSubjects || ['SVT', 'PC', 'TECH'];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let count = 0;

    let studentsToPrint = [];
    if (targetId && targetId !== 'all') {
        studentsToPrint = DB.students.filter(s => s.id == targetId);
    } else {
        studentsToPrint = [...DB.students];
    }

    // Tri
    studentsToPrint.sort((a, b) => {
        if (sortMode === 'class') {
            if (a.classe < b.classe) return -1;
            if (a.classe > b.classe) return 1;
        }
        return a.nom.localeCompare(b.nom);
    });

    studentsToPrint.forEach((student, idx) => {
        if (!student.grades) student.grades = { fr: null, math: null, hg: null, svt: null, pc: null, tech: null };
        if (count > 0) doc.addPage(); count++;

        // --- LOGO ---
        addSmartLogo(doc, 15, 10, 45);

        doc.setFontSize(10); doc.setTextColor(100);
        doc.text("DNB BLANC", 195, 15, { align: 'right' });
        doc.text(`Session ${DB.config.year}`, 195, 20, { align: 'right' });

        doc.setFontSize(14); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
        doc.text(DB.config.schoolName || "Collège", 105, 18, { align: 'center' });
        doc.setFontSize(18); doc.setTextColor(0); doc.text("RELEVÉ DE NOTES", 105, 35, { align: 'center' });

        doc.setFillColor(248, 249, 250); doc.setDrawColor(44, 62, 80); doc.setLineWidth(0.5);
        doc.rect(15, 45, 180, 20, 'FD');

        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        const fullName = `${student.nom} ${student.prenom}`;
        doc.text(`Candidat(e) :  ${fullName}`, 20, 53);
        doc.text(`Classe :  ${student.classe}`, 150, 53);

        if (student.tt) {
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text("(Bénéficie d'un Tiers-Temps)", 20, 60);
        }

        // --- CALCULS (CRITIQUE : RE-AJOUTÉ) ---
        const getRaw = (v) => (v !== null && v !== undefined && v !== "") ? parseFloat(v) : null;
        let sumSci = 0, cSci = 0; let details = [];

        if (activeSciences.includes('SVT')) { if (getRaw(student.grades.svt) != null) { sumSci += getRaw(student.grades.svt); cSci++ } details.push("SVT"); }
        if (activeSciences.includes('PC')) { if (getRaw(student.grades.pc) != null) { sumSci += getRaw(student.grades.pc); cSci++ } details.push("PC"); }
        if (activeSciences.includes('TECH')) { if (getRaw(student.grades.tech) != null) { sumSci += getRaw(student.grades.tech); cSci++ } details.push("Tech"); }
        const moySci = cSci > 0 ? (sumSci / cSci) : null;

        const getNote = (v) => (v !== null && v !== undefined && v !== "") ? parseFloat(v).toFixed(1) : "Abs";

        const body = [
            ["Français", getNote(student.grades.fr) + " / 20"],
            ["Mathématiques", getNote(student.grades.math) + " / 20"],
            ["Hist-Géo / EMC", getNote(student.grades.hg) + " / 20"],
            [`Sciences (${details.join('+')})`, moySci !== null ? moySci.toFixed(1) + " / 20" : "Abs"]
        ];

        doc.autoTable({
            head: [['Épreuves Écrites', 'Note Obtenue']],
            body: body,
            startY: 80,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], halign: 'left' }
        });

        let finalY = doc.lastAutoTable.finalY + 30; if (finalY > 250) { doc.addPage(); finalY = 40; }
        doc.setFontSize(11); doc.text(`Fait à ${DB.config.city || "SJI"}, le ${new Date().toLocaleDateString()}`, 130, finalY, { align: 'center' });
        doc.setFont("helvetica", "bold"); doc.text(DB.config.director.civ || "Le Chef", 130, finalY + 5, { align: 'center' });
        doc.text(DB.config.director.name || "", 130, finalY + 10, { align: 'center' });

        if (DB.config.signature) {
            try {
                const imgProps = doc.getImageProperties(DB.config.signature);
                const ratio = imgProps.width / imgProps.height;
                doc.addImage(DB.config.signature, 'PNG', 110, finalY + 15, 20 * ratio, 20);
            } catch (e) { }
        }
    });

    doc.save("Releves_Notes.pdf");
};

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
        const codeDisplay = s.anonymat ? `<span style="font-family:courier; font-weight:bold; color:#d35400">${s.anonymat}</span>` : '<span style="color:#ccc; font-size:0.8rem">--</span>';

        let labelsHtml = "";
        if (s.labels && s.labels.length > 0) {
            s.labels.forEach(labCode => {
                const def = DB.config.labels.find(d => d.code === labCode);
                const col = def ? def.color : '#999';
                labelsHtml += `<span class="badge" style="background-color:${col}; margin-right:3px;">${labCode}</span>`;
            });
        }

        tbodyHtml += `
        <tr>
            <td style="font-weight:bold;">${s.nom}</td>
            <td>${s.prenom}</td>
            <td>${s.sexe}</td>
            <td><span class="badge bg-secondary" style="background:#6c757d; color:white;">${s.classe}</span></td>
            <td style="color:#2980b9; font-size:0.9rem;">${s.mef || "-"}</td> <td>${codeDisplay}</td>
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
        <td>${r.nom}</td>
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
            <td>${t.civ || ""}</td>
            
            <td style="font-weight:bold;">${t.nom}</td>
            <td>${t.prenom}</td>
            
            <td style="text-align:center;">
                <input type="checkbox" ${noHSE} onchange="toggleNoHSE(${i})" 
                       style="transform: scale(1.3); cursor:pointer;" title="Cochez pour interdire les HSE">
            </td>
            
            <td><span style="${matStyle}">${t.matiere}</span></td>
            
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
    if (confirm(`Supprimer définitivement ${DB.teachers[index].nom} ?`)) {
        DB.teachers.splice(index, 1);
        renderTeachers();
        autoSave();
    }
};
function renderExamTable() { const b = document.getElementById('examTable'); b.innerHTML = ''; DB.exams.forEach((e, i) => { b.innerHTML += `<tr><td>${e.name}</td><td><input type="date" value="${e.date}" onchange="updateExam(${i},'date',this.value)"></td><td><input type="time" value="${e.time}" onchange="updateExam(${i},'time',this.value)"></td><td><input type="time" value="${e.timeTT || e.time}" style="background-color:#fef9e7;" onchange="updateExam(${i},'timeTT',this.value)"></td><td><input type="number" value="${e.durStd}" style="width:80px; text-align:center" onchange="updateExam(${i},'durStd',this.value)"></td><td style="color:var(--tt-color)"><input type="number" value="${e.durTT}" style="width:80px; text-align:center" onchange="updateExam(${i},'durTT',this.value)"></td></tr>`; }); }
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
function saveNewStudent() { const n = document.getElementById('modStNom').value, p = document.getElementById('modStPrenom').value; if (n && p) { DB.students.push({ id: Date.now(), nom: n, prenom: p, classe: document.getElementById('modStClasse').value, sexe: document.getElementById('modStSexe').value, tt: document.getElementById('modStTT').checked }); renderStudents(); closeStudentModal(); } }
function openTeacherModal() { document.getElementById('modTeaNom').value = ""; document.getElementById('teacherModal').style.display = 'flex'; }
function closeTeacherModal() { document.getElementById('teacherModal').style.display = 'none'; }
function saveNewTeacher() { const n = document.getElementById('modTeaNom').value; if (n) { DB.teachers.push({ civ: document.getElementById('modTeaCiv').value, nom: n, prenom: document.getElementById('modTeaPrenom').value, matiere: document.getElementById('modTeaMatiere').value }); renderTeachers(); closeTeacherModal(); } }
function toggleDistribLock() { if (!DB.uiState.locked.distrib) DB.uiState.locked.distrib = false; DB.uiState.locked.distrib = !DB.uiState.locked.distrib; updateDistribLock(); }
function updateDistribLock() { const locked = DB.uiState.locked.distrib; const btn = document.getElementById('lock-distrib'), cont = document.getElementById('visualDistrib'), btnWiz = document.getElementById('btnLaunchDistrib'), btnReset = document.getElementById('btnResetDistrib'); if (locked) { btn.innerHTML = "🔒 Déverrouiller"; btn.classList.add('locked'); cont.classList.add('is-locked-disabled'); btnWiz.disabled = true; btnReset.disabled = true; } else { btn.innerHTML = "🔓 Verrouiller"; btn.classList.remove('locked'); cont.classList.remove('is-locked-disabled'); btnWiz.disabled = false; btnReset.disabled = false; } }
function renderVisualDistribution() {
    const container = document.getElementById('visualDistrib');
    container.innerHTML = '';

    // Zone Tampon
    if (!DB.distribution["Zone Tampon"]) DB.distribution["Zone Tampon"] = [];
    const bufferList = DB.distribution["Zone Tampon"];
    let bufferCard = createRoomCard("Zone Tampon", bufferList, { nom: "Zone Tampon", capacite: 9999 }, true);
    container.appendChild(bufferCard);

    // Salles
    DB.rooms.forEach(room => {
        if (!DB.distribution[room.nom]) DB.distribution[room.nom] = [];
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

        if (warning && !confirm(`⚠️ Alerte Répartition :\n${warning}\n\nContinuer ?`)) return;

        const currentCount = (DB.distribution[targetRoomName] || []).length;
        if (currentCount >= targetRoom.capacite) { if (!confirm(`La salle est pleine ! Forcer ?`)) return; }
    }

    // Le code de déplacement standard (inchangé)
    const srcIndex = DB.distribution[sourceRoomName].findIndex(s => s.id === draggedStudent.id);
    if (srcIndex > -1) {
        DB.distribution[sourceRoomName].splice(srcIndex, 1);
        if (!DB.distribution[targetRoomName]) DB.distribution[targetRoomName] = [];
        DB.distribution[targetRoomName].push(draggedStudent);
        DB.distribution[targetRoomName].sort((a, b) => a.nom.localeCompare(b.nom));
        renderVisualDistribution();
        autoSave();
    }
}
function resetDistribution() { if (confirm("Tout effacer ?")) { DB.distribution = {}; DB.rooms.forEach(r => DB.distribution[r.nom] = []); renderVisualDistribution(); } }
function openDistribWizard() { document.getElementById('distribModal').style.display = 'flex'; wizGoToStep(1); const list = document.getElementById('wizTTListContainer'); list.innerHTML = ''; DB.students.filter(s => s.tt).forEach(s => { list.innerHTML += `<label class="check-item"><input type="checkbox" value="${s.id}" checked> &nbsp; ${s.nom} ${s.prenom} (${s.classe})</label>`; }); }
function closeDistribWizard() { document.getElementById('distribModal').style.display = 'none'; }
function toggleWizTTList(show) { document.getElementById('wizTTListContainer').style.display = show ? 'block' : 'none'; }
function wizGoToStep(n) { document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active')); document.getElementById('wiz-step-' + n).classList.add('active'); }
function wizGoToStep2() { const mode = document.querySelector('input[name="wizTTMode"]:checked').value; wizData.selectedTTIds = []; if (mode === 'auto') wizData.selectedTTIds = DB.students.filter(s => s.tt).map(s => s.id); else document.querySelectorAll('#wizTTListContainer input:checked').forEach(cb => wizData.selectedTTIds.push(parseFloat(cb.value))); const ttCount = wizData.selectedTTIds.length; const ttRooms = DB.rooms.filter(r => r.isTT); const ttCap = ttRooms.reduce((acc, r) => acc + (parseInt(r.capacite) || 0), 0); const totalStudents = DB.students.length; const stdCount = totalStudents - ttCount; const stdRooms = DB.rooms.filter(r => !r.isTT); const stdCap = stdRooms.reduce((acc, r) => acc + (parseInt(r.capacite) || 0), 0); const msgDiv = document.getElementById('wizCapCheckMsg'); const btnNext = document.getElementById('btnWizStep2Next'); let html = ""; let error = false; if (ttCount > ttCap) { html += `<div style="color:#c0392b;margin-bottom:10px;"><strong>⛔ TT Insuffisant !</strong> Besoin:${ttCount} / Dispo:${ttCap}</div>`; error = true; } else html += `<div style="color:#27ae60;margin-bottom:10px;"><strong>✅ TT OK</strong> (${ttCount}/${ttCap})</div>`; if (stdCount > stdCap) { html += `<div style="color:#c0392b;"><strong>⛔ Standard Insuffisant !</strong> Besoin:${stdCount} / Dispo:${stdCap}</div>`; error = true; } else html += `<div style="color:#27ae60;"><strong>✅ Standard OK</strong> (${stdCount}/${stdCap})</div>`; msgDiv.innerHTML = html; if (error) { msgDiv.style.background = "#fdedec"; btnNext.style.display = 'none'; } else { msgDiv.style.background = "#e8f6f3"; btnNext.style.display = 'inline-block'; } wizGoToStep(2); }
function wizGoToStep3() { wizGoToStep(3); }
function executeDistribution() {
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
    const isTT = (s) => wizData.selectedTTIds.includes(s.id);
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
    alert(msg);
}



function getTakenTeachersForExam(examIdx) { let taken = []; const nbSurv = DB.config.nbSurv || 1; DB.rooms.forEach(room => { for (let i = 0; i < nbSurv; i++) { const val = DB.planning[`${examIdx}_${room.nom}_${i}`]; if (val) taken.push(val); } }); return taken; }
function countOccurrences(arr, val) { return arr.filter((v) => (v === val)).length; }
function addMinutes(time, mins) { if (!time) return "??:??"; const [h, m] = time.split(':').map(Number); const date = new Date(); date.setHours(h, m + mins); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

// [PDF Exports]
function drawHeader(doc, title, subtitle) { addSmartLogo(doc, 10, 10, 35); doc.setFontSize(18); doc.text(DB.config.schoolName, 40, 20); doc.setFontSize(14); doc.text("DNB Blanc - Session " + DB.config.year, 40, 28); doc.setFontSize(16); doc.text(title, 14, 45); if (subtitle) { doc.setFontSize(12); doc.text(subtitle, 14, 52); } return 60; }
function exportDisplayPDF() { const { jsPDF } = window.jspdf; const doc = new jsPDF(); let pageCount = 0; DB.rooms.forEach((r) => { if ((DB.distribution[r.nom] || []).length === 0) return; if (pageCount > 0) doc.addPage(); drawHeader(doc, `Liste d'affichage - Salle ${r.nom}`, r.isTT ? "Tiers-Temps" : "Standard"); const body = (DB.distribution[r.nom] || []).map(s => [s.nom, s.prenom, s.classe, s.tt ? "OUI" : ""]); doc.autoTable({ head: [['Nom', 'Prénom', 'Classe', 'TT']], body: body, startY: 60 }); pageCount++; }); doc.save("listes_affichage.pdf"); }
function exportDisplayXLSX() { const data = [["Salle", "Type", "Nom", "Prénom", "Classe", "TT"]]; DB.rooms.forEach((r) => { if ((DB.distribution[r.nom] || []).length === 0) return; const roomType = r.isTT ? "Tiers-Temps" : "Standard"; (DB.distribution[r.nom] || []).forEach(s => { data.push([r.nom, roomType, s.nom, s.prenom, s.classe, s.tt ? "OUI" : ""]); }); }); const ws = XLSX.utils.aoa_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Listes_Affichage"); XLSX.writeFile(wb, "Listes_Affichage.xlsx"); }
function exportSignPDF() { const { jsPDF } = window.jspdf; const doc = new jsPDF(); let pageCount = 0; DB.exams.forEach(exam => { DB.rooms.forEach(room => { if ((DB.distribution[room.nom] || []).length === 0) return; if (pageCount > 0) doc.addPage(); const dur = room.isTT ? exam.durTT : exam.durStd; const startTime = room.isTT ? (exam.timeTT || exam.time) : exam.time; const endTime = addMinutes(startTime, dur); drawHeader(doc, `Émargement - ${exam.name} - Salle ${room.nom}`, `Date: ${exam.date} | Horaire: ${startTime} - ${endTime}`); const body = (DB.distribution[room.nom] || []).map(s => [s.nom, s.prenom, s.classe, s.tt ? "TT" : "", ""]); doc.autoTable({ head: [['Nom', 'Prénom', 'Classe', 'TT', 'Signature']], body: body, startY: 65, columnStyles: { 4: { minCellWidth: 40 } } }); pageCount++; }); }); doc.save("feuilles_emargement.pdf"); }
function exportSignXLSX() { const data = [["Épreuve", "Date", "Horaire", "Salle", "Type", "Nom", "Prénom", "Classe", "TT", "Signature"]]; DB.exams.forEach(exam => { DB.rooms.forEach(room => { if ((DB.distribution[room.nom] || []).length === 0) return; const dur = room.isTT ? exam.durTT : exam.durStd; const startTime = room.isTT ? (exam.timeTT || exam.time) : exam.time; const endTime = addMinutes(startTime, dur); const roomType = room.isTT ? "Tiers-Temps" : "Standard"; const horaire = `${startTime} - ${endTime}`; (DB.distribution[room.nom] || []).forEach(s => { data.push([exam.name, exam.date, horaire, room.nom, roomType, s.nom, s.prenom, s.classe, s.tt ? "TT" : "", ""]); }); }); }); const ws = XLSX.utils.aoa_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Emargements"); XLSX.writeFile(wb, "Emargements.xlsx"); }

function openConvocOptions() { if (!DB.config.director) DB.config.director = { civ: "M. le Principal", name: "" }; if (DB.students.length === 0) return alert("Aucun élève"); if (Object.keys(DB.distribution).length === 0) return alert("Veuillez faire la répartition"); const sel = document.getElementById('convocStudentSelect'); sel.innerHTML = '<option value="all">-- Tous les élèves --</option>'; const sortedStudents = [...DB.students].sort((a, b) => a.nom.localeCompare(b.nom)); sortedStudents.forEach(s => { let opt = document.createElement('option'); opt.value = s.id; opt.text = `${s.nom} ${s.prenom} (${s.classe})`; sel.appendChild(opt); }); document.getElementById('convocOptionsModal').style.display = 'flex'; }
function closeConvocOptions() { document.getElementById('convocOptionsModal').style.display = 'none'; }

// =========================================================
// === EXPORT CONVOCATIONS ÉLÈVES (VERSION V4 - TEXTE LONG) ===
// =========================================================

window.exportConvocationStudents = function (targetId = null) {
    // ... (début de la fonction inchangé) ...
    const txtArea = document.getElementById('txtConvocInfo');
    if (txtArea) txtArea.style.height = "250px";

    if (!confirm("🖨️ IMPORTANT : MODE RECTO-VERSO\n\nCertaines convocations contiennent beaucoup de texte et seront générées sur 2 pages.\n\n👉 Veuillez régler votre imprimante sur RECTO-VERSO (bords longs).")) return;

    const generatePDF = (sortMode, specificId) => {
        // ... (configuration PDF inchangée) ...
        DB.config.schoolName = document.getElementById('schoolName').value;
        DB.config.year = document.getElementById('sessionYear').value;
        const customText = document.getElementById('txtConvocInfo').value;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const PAGE_W = 210; const PAGE_H = 297; const MARGIN = 20; const TEXT_WIDTH = PAGE_W - (MARGIN * 2);
        let count = 0;

        let studentsToPrint = [];
        if (specificId && typeof specificId !== 'object') studentsToPrint = DB.students.filter(s => s.id == specificId);
        else studentsToPrint = [...DB.students];

        studentsToPrint.sort((a, b) => {
            if (sortMode === 'class') { if (a.classe < b.classe) return -1; if (a.classe > b.classe) return 1; return a.nom.localeCompare(b.nom); }
            return a.nom.localeCompare(b.nom);
        });

        if (studentsToPrint.length === 0) return alert("Aucun élève à imprimer.");

        let studentPlacement = {};
        DB.rooms.forEach(r => { (DB.distribution[r.nom] || []).forEach(s => { studentPlacement[s.id] = { room: r.nom, isTT: r.isTT }; }); });

        studentsToPrint.forEach((student) => {
            const place = studentPlacement[student.id];

            // Check for oral assignment
            let stageAssignment = null;
            if (DB.stage && DB.stage.planning) {
                stageAssignment = DB.stage.planning.find(p => p.studentId == student.id);
            }

            // Skip if no written place AND no oral assignment
            if (!place && !stageAssignment) return;

            if (count > 0) doc.addPage(); count++;

            // --- HEADER ---
            if (typeof addSmartLogo === 'function') addSmartLogo(doc, 15, 10, 45);

            doc.setFontSize(10); doc.setTextColor(100);
            doc.text("DNB BLANC", 195, 15, { align: 'right' });
            doc.text(`Session ${DB.config.year}`, 195, 20, { align: 'right' });

            doc.setFontSize(14); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
            doc.text(DB.config.schoolName || "Collège", 105, 18, { align: 'center' });
            doc.setFontSize(18); doc.setTextColor(0); doc.text("CONVOCATION", 105, 35, { align: 'center' });

            doc.setFillColor(248, 249, 250); doc.setDrawColor(44, 62, 80); doc.setLineWidth(0.5);
            doc.rect(15, 45, 180, 25, 'FD');

            doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text(`Candidat(e) :  ${student.nom} ${student.prenom}`, 20, 53);
            doc.text(`Classe :  ${student.classe}`, 120, 53);

            if (student.anonymat) { doc.setTextColor(192, 57, 43); doc.text(`N° Anonymat :  ${student.anonymat}`, 20, 62); }
            else { doc.setTextColor(150); doc.setFontSize(10); doc.text("(Code non généré)", 20, 62); }

            doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
            if (place) {
                doc.text(`Salle : ${place.room}`, 120, 62);
                if (place.isTT) { doc.setFontSize(10); doc.setTextColor(142, 68, 173); doc.text("(Tiers-Temps)", 155, 62); }
            } else {
                doc.text(`Salle : Orale uniquement`, 120, 62);
            }

            if (place) {
                doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
                doc.text("Veuillez vous présenter aux épreuves selon le planning ci-dessous :", 15, 80);
            }

            let body = [];
            DB.exams.forEach(exam => {
                // --- CORRECTIF DATE : ON FORCE MIDI POUR ÉVITER LE BUG DU JOUR ---
                // "2026-01-29" + "T12:00:00" = Date fixée à midi, insensible aux décalages horaires minimes
                const dateObj = new Date(exam.date + "T12:00:00");
                const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

                // --- FIN CORRECTIF ---

                let finalStart = place.isTT ? (exam.timeTT || exam.time) : exam.time;
                const slotType = place.isTT ? 'tt' : 'std';
                if (exam.slots && exam.slots[slotType] && exam.slots[slotType].length > 0) {
                    finalStart = exam.slots[slotType][0].start;
                }
                let finalDurVal = place.isTT ? exam.durTT : exam.durStd;

                body.push([
                    dateStr.charAt(0).toUpperCase() + dateStr.slice(1),
                    exam.name,
                    finalStart,
                    `${finalDurVal} min`
                ]);
            });

            if (place && DB.exams && DB.exams.length > 0) {
                doc.autoTable({
                    head: [['Date', 'Épreuve', 'Début', 'Durée']], body: body, startY: 85, theme: 'grid',
                    headStyles: { fillColor: [44, 62, 80] }, styles: { cellPadding: 3, valign: 'middle', fontSize: 10 },
                    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center', fontStyle: 'bold' } }
                });
            }

            // --- AJOUT ORAUX ---
            // (stageAssignment already fetched above)

            if (stageAssignment) {
                let finalY = (place && doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 80;
                let jury = DB.stage.juries.find(j => j.id == stageAssignment.juryId);
                let dateStage = DB.stage.config.date || "Date à définir";

                // Formatage Date
                const dObj = new Date(dateStage);
                const dStr = dObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

                doc.setFillColor(230, 230, 250); // Lavande léger
                doc.setDrawColor(142, 68, 173); // Violet
                doc.setLineWidth(0.5);
                doc.rect(15, finalY, 180, 25, 'FD');

                doc.setFont("helvetica", "bold");
                doc.setTextColor(142, 68, 173);
                doc.setFontSize(12);
                doc.text("ÉPREUVE ORALE", 105, finalY + 8, { align: "center" });

                doc.setTextColor(0);
                doc.setFontSize(10);
                doc.text(`Date : ${dStr}`, 20, finalY + 18);
                doc.text(`Heure : ${stageAssignment.time}`, 80, finalY + 18);

                if (jury) {
                    doc.text(`Jury : ${jury.name}`, 120, finalY + 18);
                    doc.text(`Salle : ${jury.room || "?"}`, 160, finalY + 18);
                }
            }
            // ----------------------------

            // --- GESTION TEXTE ET SIGNATURE (INCHANGÉE) ---
            let currentY = (place && doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 80;
            if (stageAssignment) currentY += 35; // Décalage pour laisser la place au bloc Stage
            const signatureHeight = 40; const bottomMargin = 15;
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            const textLines = doc.splitTextToSize(customText, TEXT_WIDTH);
            const textHeight = textLines.length * 5;
            const spaceRemaining = PAGE_H - currentY - bottomMargin;
            const spaceNeededTotal = textHeight + signatureHeight + 10;
            let signatureY = 0;

            if (spaceNeededTotal < spaceRemaining) {
                doc.setFont("helvetica", "bold"); doc.text("INFORMATIONS :", 20, currentY);
                doc.setFont("helvetica", "normal"); doc.text(textLines, 20, currentY + 6);
                signatureY = currentY + 6 + textHeight + 10;
            } else {
                const boxH = 16;
                doc.setDrawColor(192, 57, 43); doc.setLineWidth(0.8); doc.setFillColor(250, 229, 211);
                doc.roundedRect(MARGIN, currentY, TEXT_WIDTH, boxH, 2, 2, 'FD');
                doc.setFillColor(241, 196, 15); doc.triangle(MARGIN + 5, currentY + 11, MARGIN + 8, currentY + 5, MARGIN + 11, currentY + 11, 'F');
                doc.setFontSize(11); doc.setTextColor(192, 57, 43); doc.setFont("helvetica", "bold");
                doc.text("VOIR CONSIGNES DÉTAILLÉES AU VERSO", 105, currentY + 10, { align: 'center' });
                signatureY = currentY + 30;

                doc.addPage();
                doc.setFontSize(16); doc.setTextColor(44, 62, 80); doc.text("CONSIGNES & INFORMATIONS", 105, 20, { align: 'center' });
                doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(MARGIN, 25, PAGE_W - MARGIN, 25);
                doc.setFontSize(11); doc.setTextColor(0); doc.setFont("helvetica", "normal");
                const versoLines = doc.splitTextToSize(customText, TEXT_WIDTH);
                doc.text(versoLines, MARGIN, 35);
                doc.setPage(doc.internal.getNumberOfPages() - 1);
            }

            const centerX = 140; if (signatureY > 260) signatureY = 260;
            doc.setTextColor(0); doc.setFontSize(11); doc.setFont("helvetica", "normal");
            doc.text(`Fait à ${DB.config.city || "SJI"}, le ${new Date().toLocaleDateString()}`, centerX, signatureY, { align: 'center' });
            doc.setFont("helvetica", "bold"); doc.text(DB.config.director.civ || "Le Chef d'Établissement", centerX, signatureY + 5, { align: 'center' });
            doc.text(DB.config.director.name || "", centerX, signatureY + 10, { align: 'center' });

            if (DB.config.signature) {
                try {
                    const imgProps = doc.getImageProperties(DB.config.signature);
                    const ratio = imgProps.width / imgProps.height; const h = 20; const w = h * ratio;
                    doc.addImage(DB.config.signature, 'PNG', centerX - (w / 2), signatureY + 15, w, h);
                } catch (e) { }
            }
        });
        doc.save(`Convocations_Eleves_${sortMode || 'Single'}.pdf`);
    };

    if (targetId && typeof targetId !== 'object' && targetId !== 'all') { generatePDF(null, targetId); return; }

    // --- POPUP CHOIX TRI ---
    const overlay = document.createElement('div');
    Object.assign(overlay.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: '9999', display: 'flex', justifyContent: 'center', alignItems: 'center' });
    const modal = document.createElement('div');
    Object.assign(modal.style, { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', textAlign: 'center', maxWidth: '600px', width: '90%', fontFamily: 'Helvetica, sans-serif' });
    modal.innerHTML = `<h3 style="color:#2c3e50; margin-top:0;">🖨️ Imprimer les Convocations</h3>`;
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, { display: 'flex', gap: '20px', marginTop: '25px', justifyContent: 'center' });

    function createCard(emoji, title, desc, color, action) {
        const card = document.createElement('div');
        Object.assign(card.style, { flex: '1', padding: '20px', border: '2px solid #eee', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#f8f9fa' });
        card.innerHTML = `<div style="font-size:40px; margin-bottom:10px;">${emoji}</div><div style="font-weight:bold; color:${color}; font-size:16px;">${title}</div><div style="font-size:12px; color:#7f8c8d; margin-top:5px;">${desc}</div>`;
        card.onclick = () => { document.body.removeChild(overlay); action(); };
        return card;
    }
    const btnClass = createCard("🏫", "Par Classe", "Trié par classe puis par nom", "#27ae60", () => generatePDF('class'));
    const btnAlpha = createCard("🌍", "Alphabétique", "Trié de A à Z", "#2980b9", () => generatePDF('alpha'));
    btnContainer.append(btnClass, btnAlpha); modal.appendChild(btnContainer);

    const btnCancel = document.createElement('div');
    btnCancel.innerText = "Annuler"; Object.assign(btnCancel.style, { marginTop: "20px", color: "#999", cursor: "pointer", fontSize: "14px", textDecoration: "underline" });
    btnCancel.onclick = () => document.body.removeChild(overlay); modal.appendChild(btnCancel);
    overlay.appendChild(modal); document.body.appendChild(overlay);
};


// 3. CONVOCATIONS PROFS (Corrigé & Complet)
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

        for (const [key, assignedName] of Object.entries(DB.planning)) {
            if (assignedName !== fullName) continue;
            const parts = key.split('_');
            if (parts.length < 5) continue;
            const examIdx = parseInt(parts[0]);
            const roomName = parts[1];
            const type = parts[2];
            const slotIdx = parseInt(parts[3]);
            const exam = DB.exams[examIdx];
            let slot = { start: "??", end: "??" };
            if (exam.slots && exam.slots[type] && exam.slots[type][slotIdx]) {
                slot = exam.slots[type][slotIdx];
            } else {
                slot = { start: type === 'tt' ? (exam.timeTT || exam.time) : exam.time, end: "..." };
            }
            duties.push({ date: exam.date, start: slot.start, end: slot.end, name: exam.name, room: roomName, isTT: (type === 'tt') });
        }

        if (duties.length === 0) return;
        if (count > 0) doc.addPage(); count++;

        addSmartLogo(doc, 15, 10, 45);
        doc.setFontSize(10); doc.setTextColor(100); doc.text("DNB BLANC", 195, 12, { align: 'right' }); doc.text(`Session ${DB.config.year}`, 195, 17, { align: 'right' });
        doc.setFontSize(14); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold"); doc.text(DB.config.schoolName || "Collège", 105, 18, { align: 'center' });
        doc.setFontSize(18); doc.setTextColor(0); doc.text("CONVOCATION SURVEILLANCE", 105, 40, { align: 'center' });

        doc.setFillColor(248, 249, 250); doc.setDrawColor(44, 62, 80); doc.rect(15, 50, 180, 20, 'FD');
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.text(`${teacher.civ || ""} ${fullName}`, 20, 62);

        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text("Planning de vos créneaux de surveillance :", 15, 85);

        duties.sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return a.start.localeCompare(b.start);
        });

        let body = duties.map(d => {
            // --- CORRECTIF DATE : ON FORCE MIDI ---
            const dateObj = new Date(d.date + "T12:00:00");
            const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            // ------------------------------------
            return [dateStr, `${d.start} - ${d.end}`, d.name + (d.isTT ? " (TT)" : ""), d.room];
        });

        doc.autoTable({
            head: [['Date', 'Créneau', 'Épreuve', 'Salle']], body: body, startY: 90, theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] }, styles: { cellPadding: 3, valign: 'middle', fontSize: 10 },
            columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 35, fontStyle: 'bold' }, 3: { cellWidth: 25, halign: 'center' } }
        });

        let finalY = doc.lastAutoTable.finalY + 30;
        if (finalY > 250) { doc.addPage(); finalY = 40; }
        doc.setFontSize(11); doc.text(`Fait à ${DB.config.city || "SJI"}, le ${new Date().toLocaleDateString()}`, 140, finalY, { align: 'center' });
        doc.setFont("helvetica", "bold"); doc.text(DB.config.director.civ || "Le Chef", 140, finalY + 5, { align: 'center' });
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

// --- MODULE LOGISTIQUE & ANONYMAT (CORRIGÉ & SYNCHRONISÉ) ---

// 1. Générer les codes (Format DNB2026-IndexClasse-YY) ET Synchroniser
window.generateAnonymityCodes = function () {
    if (DB.students.length === 0) return alert("Aucun élève dans la base.");

    // CORRECTION 1 : On définit l'année AVANT d'afficher le message
    const year = DB.config.year || "2026";

    // CORRECTION 2 : Le message d'alerte est maintenant dynamique (DNB${year})
    const mode = confirm(`Générer les codes d'anonymat ?\n\nFormat : DNB${year}-[N°Classe]-[Aléatoire]\n(Ex: 3A=1, 3B=2...)\n\n- OK : Tout écraser et régénérer\n- Annuler : Ne rien faire`);

    if (!mode) return;

    let count = 0;

    // A. Identifier les classes pour l'index (3A=1, 3B=2...)
    const uniqueClasses = [...new Set(DB.students.map(s => s.classe).filter(c => c))].sort();
    let classMap = {};
    uniqueClasses.forEach((cls, index) => { classMap[cls] = index + 1; });

    // B. Générer les codes dans la liste principale
    const existingCodes = new Set();
    DB.students.forEach(s => {
        const classIndex = classMap[s.classe] || 0;
        let newCode;

        // Génération unique pour éviter les doublons
        do {
            const num = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // 00 à 99
            newCode = `DNB${year}-${classIndex}-${num}`;
        } while (existingCodes.has(newCode));

        s.anonymat = newCode;
        existingCodes.add(newCode);
        count++;
    });

    // C. SYNCHRONISATION CRITIQUE (Transférer les codes vers les salles)
    Object.keys(DB.distribution).forEach(roomName => {
        if (DB.distribution[roomName]) {
            DB.distribution[roomName].forEach(studentInRoom => {
                // On retrouve l'élève original par son ID
                const original = DB.students.find(s => s.id === studentInRoom.id);
                if (original) {
                    studentInRoom.anonymat = original.anonymat; // On copie le code
                }
            });
        }
    });

    renderStudents(); // Mise à jour tableau des élèves
    showToast(`✅ Succès : ${count} codes générés et synchronisés.`, 'success');

    if (typeof autoSave === 'function') autoSave();
}

// 2. Export Liste Secrétariat (VERSION VISUELLE MODERNE)
function exportAnonymityList() {
    if (DB.students.length === 0) return alert("Aucun élève.");

    // --- A. CRÉATION DE LA POP-UP VISUELLE ---

    // 1. L'arrière-plan sombre
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0'; overlay.style.left = '0';
    overlay.style.width = '100%'; overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    // 2. La fenêtre blanche
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.padding = '30px';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    modal.style.textAlign = 'center';
    modal.style.maxWidth = '600px';
    modal.style.width = '90%';
    modal.style.fontFamily = 'Helvetica, sans-serif';

    // 3. Titre
    const title = document.createElement('h3');
    title.innerText = "📄 Choisir le format de la liste";
    title.style.color = '#2c3e50';
    title.style.marginTop = '0';
    modal.appendChild(title);

    // Fonction pour créer une "Carte Bouton"
    function createOptionCard(emoji, titleText, subText, color, onClick) {
        const card = document.createElement('div');
        card.style.flex = '1';
        card.style.padding = '20px';
        card.style.border = '2px solid #eee';
        card.style.borderRadius = '10px';
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.2s';
        card.style.backgroundColor = '#f8f9fa';

        card.innerHTML = `
                <div style="font-size:40px; margin-bottom:10px;">${emoji}</div>
                <div style="font-weight:bold; color:${color}; font-size:16px;">${titleText}</div>
                <div style="font-size:12px; color:#7f8c8d; margin-top:5px;">${subText}</div>
            `;

        // Effet Hover
        card.onmouseenter = () => { card.style.borderColor = color; card.style.backgroundColor = 'white'; card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; };
        card.onmouseleave = () => { card.style.borderColor = '#eee'; card.style.backgroundColor = '#f8f9fa'; card.style.transform = 'translateY(0)'; card.style.boxShadow = 'none'; };

        card.onclick = () => {
            document.body.removeChild(overlay); // Fermer la pop-up
            onClick(); // Lancer l'action
        };

        return card;
    }

    // --- B. DEFINITION DES ACTIONS PDF ---

    // Action 1 : PDF Global
    const actionGlobal = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        printHeader(doc, " - GLOBALE (A-Z)");

        // Tri de tous les élèves par Nom
        const sortedStudents = [...DB.students].sort((a, b) => a.nom.localeCompare(b.nom));
        const body = sortedStudents.map(s => [s.classe, s.nom, s.prenom, s.anonymat || "---"]);

        generateTable(doc, body);
        doc.save("Liste_Anonymat_Globale.pdf");
    };

    // Action 2 : PDF Par Classe
    const actionClass = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const classes = [...new Set(DB.students.map(s => s.classe).filter(c => c))].sort();

        classes.forEach((cls, index) => {
            if (index > 0) doc.addPage();
            printHeader(doc, ` - CLASSE ${cls}`);

            const classStudents = DB.students.filter(s => s.classe === cls).sort((a, b) => a.nom.localeCompare(b.nom));
            const body = classStudents.map(s => [s.classe, s.nom, s.prenom, s.anonymat || "---"]);

            generateTable(doc, body);
        });
        doc.save("Liste_Anonymat_Par_Classe.pdf");
    };

    // Objectif helpers PDF:
    function printHeader(doc, titleSuffix) {
        doc.setFontSize(16); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
        doc.text(`Liste d'Anonymat${titleSuffix}`, 14, 20);
        doc.setFontSize(11); doc.setTextColor(100); doc.setFont("helvetica", "normal");
        doc.text(`Session ${DB.config.year} - ${DB.config.schoolName}`, 14, 28);
    }
    function generateTable(doc, body) {
        doc.autoTable({
            head: [['Classe', 'Nom', 'Prénom', 'Code Anonymat']],
            body: body, startY: 35, theme: 'grid', headStyles: { fillColor: [52, 73, 94] },
            columnStyles: { 3: { fontStyle: 'bold', textColor: [192, 57, 43], cellWidth: 50 } }
        });
    }

    // Action 3 : Excel Global
    const actionGlobalXLSX = () => {
        const sortedStudents = [...DB.students].sort((a, b) => a.nom.localeCompare(b.nom));
        const data = [["Classe", "Nom", "Prénom", "Code Anonymat"]];
        sortedStudents.forEach(s => data.push([s.classe, s.nom, s.prenom, s.anonymat || "---"]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Anonymat_Global");
        XLSX.writeFile(wb, "Liste_Anonymat_Globale.xlsx");
    };

    // Action 4 : Excel Par Classe
    const actionClassXLSX = () => {
        const wb = XLSX.utils.book_new();
        const classes = [...new Set(DB.students.map(s => s.classe).filter(c => c))].sort();
        classes.forEach(cls => {
            const classStudents = DB.students.filter(s => s.classe === cls).sort((a, b) => a.nom.localeCompare(b.nom));
            const data = [["Classe", "Nom", "Prénom", "Code Anonymat"]];
            classStudents.forEach(s => data.push([s.classe, s.nom, s.prenom, s.anonymat || "---"]));
            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, `Classe_${cls}`);
        });
        XLSX.writeFile(wb, "Liste_Anonymat_Par_Classe.xlsx");
    };

    // --- C. ASSEMBLAGE ---

    const btnContainer1 = document.createElement('div');
    btnContainer1.style.display = 'flex';
    btnContainer1.style.gap = '20px';
    btnContainer1.style.marginTop = '25px';
    btnContainer1.style.justifyContent = 'center';

    const btnContainer2 = document.createElement('div');
    btnContainer2.style.display = 'flex';
    btnContainer2.style.gap = '20px';
    btnContainer2.style.marginTop = '15px';
    btnContainer2.style.justifyContent = 'center';

    const btnGlobal = createOptionCard("🌍", "Alpha (PDF)", "Toute l'école de A à Z", "#2980b9", actionGlobal);
    const btnClass = createOptionCard("📚", "Par Classe (PDF)", "Trié par classe (1 page/classe)", "#27ae60", actionClass);

    const btnGlobalXLSX = createOptionCard("🌍", "Alpha (Excel)", "Toute l'école de A à Z", "#8e44ad", actionGlobalXLSX);
    const btnClassXLSX = createOptionCard("📚", "Par Classe (Excel)", "Trié par classe", "#e67e22", actionClassXLSX);

    btnContainer1.appendChild(btnGlobal);
    btnContainer1.appendChild(btnClass);

    btnContainer2.appendChild(btnGlobalXLSX);
    btnContainer2.appendChild(btnClassXLSX);

    modal.appendChild(btnContainer1);
    modal.appendChild(btnContainer2);

    // Bouton Annuler (texte discret)
    const btnCancel = document.createElement('div');
    btnCancel.innerText = "Annuler";
    btnCancel.style.marginTop = "20px";
    btnCancel.style.color = "#999";
    btnCancel.style.cursor = "pointer";
    btnCancel.style.fontSize = "14px";
    btnCancel.style.textDecoration = "underline";
    btnCancel.onclick = () => document.body.removeChild(overlay);
    modal.appendChild(btnCancel);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
// =========================================================
// === MODULE ETIQUETTES (V5 - UI MODERNE "BRIQUES") ===
// =========================================================

// 1. Ouvre la fenêtre de configuration avec la nouvelle UI
function openLabelConfig(type) {
    if (!DB.students || DB.students.length === 0) return alert("Aucun élève dans la base.");

    // Sécurité Anonymat
    if (type === 'anonymat') {
        const hasCodes = DB.students.some(s => s.anonymat && s.anonymat.length > 0);
        if (!hasCodes) {
            alert("⚠️ Action impossible : Codes non générés.\n\n👉 Cliquez d'abord sur '🎲 Générer Codes'.");
            return;
        }
    }

    const isTable = (type === 'table');
    let title = isTable ? "🏷️ Étiquettes de Table" : "✂️ Étiquettes de Copies";
    let defCols = isTable ? 2 : 3;
    let defRows = isTable ? 4 : 8;

    // --- ÉTAT INITIAL DE L'INTERFACE ---
    // On stocke les choix de l'utilisateur ici
    let uiState = {
        qty: 'single',      // 'single' ou 'exams'
        group: 'student',   // 'student' ou 'subject'
        sort: isTable ? 'room' : 'alpha' // 'alpha' ou 'room'
    };

    // --- STYLES CSS POUR LES BRIQUES ---
    // Style inactif (gris)
    const sBrick = "flex:1; padding:15px 10px; border:2px solid #e0e0e0; background:#f9f9f9; border-radius:8px; cursor:pointer; text-align:center; transition:all 0.2s ease; color:#7f8c8d;";
    // Style actif (bleu, en relief)
    const sBrickActive = "flex:1; padding:15px 10px; border:2px solid #3498db; background:#ebf5fb; border-radius:8px; cursor:pointer; text-align:center; transition:all 0.2s ease; color:#2c3e50; font-weight:bold; box-shadow:0 4px 8px rgba(52, 152, 219, 0.2); transform:translateY(-2px);";

    // --- CONSTRUCTION DU HTML DE LA MODALE ---
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center;";

    const modal = document.createElement('div');
    // Modale un peu plus large pour accueillir les briques
    modal.style.cssText = "background:white; border-radius:12px; width:420px; font-family:'Segoe UI', sans-serif; box-shadow:0 15px 40px rgba(0,0,0,0.3); overflow:hidden; display:flex; flex-direction:column; max-height:95vh;";

    let contentHtml = `
        <div style="background:#2c3e50; color:white; padding:15px; text-align:center;">
            <h3 style="margin:0; font-size:1.2rem;">${title}</h3>
        </div>
        <div style="padding:20px; overflow-y:auto; background:#f4f6f7;">
    `;

    if (!isTable) {
        // --- SECTION 1 : QUANTITÉ (Anonymat uniquement) ---
        contentHtml += `
            <div style="margin-bottom:20px;">
                <label style="font-weight:bold; color:#34495e; display:block; margin-bottom:10px;">1. Quantité d'étiquettes :</label>
                <div style="display:flex; gap:10px;">
                    <div id="brick-qty-single" style="${sBrickActive}">
                        <div style="font-size:1.4rem;">👤</div>
                        <div>Une seule<br><small style="font-weight:normal">Par élève</small></div>
                    </div>
                    <div id="brick-qty-exams" style="${sBrick}">
                        <div style="font-size:1.4rem;">📚</div>
                        <div>Par Épreuve<br><small style="font-weight:normal">${DB.exams.length} matières</small></div>
                    </div>
                </div>
            </div>

            <div id="section-group" style="margin-bottom:20px; display:none; padding-left:15px; border-left:3px solid #3498db; animation:fadeIn 0.3s;">
                <label style="font-weight:bold; color:#2980b9; display:block; margin-bottom:10px;">↳ Option de Regroupement :</label>
                <div style="display:flex; gap:10px;">
                    <div id="brick-group-student" style="${sBrickActive}">
                        <div style="font-size:1.2rem;">👨‍🎓</div>
                        <div>Par Candidat<br><small style="font-weight:normal">Toutes ses matières à la suite</small></div>
                    </div>
                    <div id="brick-group-subject" style="${sBrick}">
                        <div style="font-size:1.2rem;">📂</div>
                        <div>Par Épreuve<br><small style="font-weight:normal">Groupé par matière (Saut de page)</small></div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- SECTION 2 : TRI ---
    contentHtml += `
        <div style="margin-bottom:20px;">
            <label style="font-weight:bold; color:#34495e; display:block; margin-bottom:10px;">${isTable ? '1.' : '2.'} Organisation du tri :</label>
            <div style="display:flex; gap:10px;">
                <div id="brick-sort-alpha" style="${uiState.sort === 'alpha' ? sBrickActive : sBrick}">
                    <div style="font-size:1.4rem;">🇦.🇿</div>
                    <div>Global<br><small style="font-weight:normal">Alphabétique</small></div>
                </div>
                <div id="brick-sort-room" style="${uiState.sort === 'room' ? sBrickActive : sBrick}">
                    <div style="font-size:1.4rem;">🏫</div>
                    <div>Par Salle<br><small style="font-weight:normal">Selon répartition</small></div>
                </div>
            </div>
        </div>
    `;

    // --- SECTION GRILLE ---
    contentHtml += `
        <div style="background:white; padding:15px; border-radius:8px; border:1px solid #e0e0e0; display:flex; justify-content:space-between; align-items:center;">
            <div><span style="font-weight:bold; color:#555;">📏 Grille (A4)</span></div>
            <div style="display:flex; gap:10px;">
                <div style="text-align:center;"><small>Colonnes</small><br><input type="number" id="lblCols" value="${defCols}" min="1" max="5" style="width:45px; text-align:center; padding:5px; border:1px solid #ccc; border-radius:4px;"></div>
                <div style="text-align:center;"><small>Lignes</small><br><input type="number" id="lblRows" value="${defRows}" min="1" max="20" style="width:45px; text-align:center; padding:5px; border:1px solid #ccc; border-radius:4px;"></div>
            </div>
        </div>
        </div> <div style="padding:15px; background:white; border-top:1px solid #eee; display:flex; gap:10px;">
            <button id="btnCan" class="btn btn-secondary" style="flex:1; padding:10px;">Annuler</button>
            <button id="btnGen" class="btn btn-success" style="flex:2; padding:10px; font-size:1.1rem; font-weight:bold;">🖨️ Générer PDF</button>
        </div>
    `;

    modal.innerHTML = contentHtml;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // --- LOGIQUE D'INTERACTION (RAFRAÎCHISSEMENT DE L'UI) ---
    function refreshUI() {
        if (isTable) return; // Pas besoin pour les tables

        // 1. Gestion des briques Quantité
        document.getElementById('brick-qty-single').style.cssText = (uiState.qty === 'single') ? sBrickActive : sBrick;
        document.getElementById('brick-qty-exams').style.cssText = (uiState.qty === 'exams') ? sBrickActive : sBrick;

        // 2. Affichage conditionnel de la section Regroupement
        const groupSection = document.getElementById('section-group');
        if (uiState.qty === 'exams') {
            groupSection.style.display = 'block';
            // Mise à jour des briques Regroupement
            document.getElementById('brick-group-student').style.cssText = (uiState.group === 'student') ? sBrickActive : sBrick;
            document.getElementById('brick-group-subject').style.cssText = (uiState.group === 'subject') ? sBrickActive : sBrick;
        } else {
            groupSection.style.display = 'none';
        }
    }

    // Fonction générique pour gérer le clic sur une brique de tri
    function handleSortClick(mode) {
        uiState.sort = mode;
        document.getElementById('brick-sort-alpha').style.cssText = (mode === 'alpha') ? sBrickActive : sBrick;
        document.getElementById('brick-sort-room').style.cssText = (mode === 'room') ? sBrickActive : sBrick;
    }

    // --- ATTACHEMENT DES ÉVÉNEMENTS (CLICS) ---
    if (!isTable) {
        document.getElementById('brick-qty-single').onclick = () => { uiState.qty = 'single'; refreshUI(); };
        document.getElementById('brick-qty-exams').onclick = () => { uiState.qty = 'exams'; refreshUI(); };
        document.getElementById('brick-group-student').onclick = () => { uiState.group = 'student'; refreshUI(); };
        document.getElementById('brick-group-subject').onclick = () => { uiState.group = 'subject'; refreshUI(); };
    }

    document.getElementById('brick-sort-alpha').onclick = () => handleSortClick('alpha');
    document.getElementById('brick-sort-room').onclick = () => handleSortClick('room');

    // Boutons footer
    document.getElementById('btnCan').onclick = () => document.body.removeChild(overlay);
    document.getElementById('btnGen').onclick = () => {
        const c = parseInt(document.getElementById('lblCols').value) || defCols;
        const r = parseInt(document.getElementById('lblRows').value) || defRows;

        // Préparation des paramètres pour la génération
        let params = {
            qtyMode: uiState.qty,
            sortMode: uiState.sort,
            groupMode: uiState.group
        };

        document.body.removeChild(overlay);
        // Petit délai pour laisser la UI se fermer
        setTimeout(() => generateLabelsPDF(type, c, r, params), 50);
    };

    // Initialisation visuelle au lancement
    refreshUI();
}

// 2. Génération du PDF (Moteur V5 - Identique fonctionnellement à la V4)
function generateLabelsPDF(type, nbCols, nbRows, params) {
    if (!window.jspdf) return alert("Erreur librairie PDF.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const items = [];

    // --- HELPER AJOUT ---
    function addItem(s, roomName, subject = null) {
        if (type === 'anonymat') {
            if (s.anonymat) {
                items.push({
                    type: 'anonymat',
                    l1: "DNB " + (DB.config.year || "2026"),
                    l2: s.anonymat,
                    subject: subject,
                    room: roomName
                });
            }
        } else {
            items.push({
                type: 'table',
                l1: `DNB ${DB.config.year || "2026"} - ${roomName}`,
                l2: `${s.nom} ${s.prenom}`,
                l3: `Classe : ${s.classe}`,
                room: roomName,
                isCode: !!s.anonymat,
                code: s.anonymat
            });
        }
    }

    // --- TRAITEMENT LISTE ---
    function processStudentList(studentList, roomName) {
        if (params.qtyMode === 'single') {
            studentList.forEach(s => addItem(s, roomName));
        }
        else if (params.qtyMode === 'exams') {
            if (params.groupMode === 'student') {
                studentList.forEach(s => {
                    DB.exams.forEach(ex => addItem(s, roomName, ex.name));
                });
            }
            else if (params.groupMode === 'subject') {
                DB.exams.forEach(ex => {
                    studentList.forEach(s => addItem(s, roomName, ex.name));
                    items.push({ type: 'BREAK', room: roomName });
                });
            }
        }
    }

    // --- LOGIQUE DE TRI ---
    if (type === 'table' || (type === 'anonymat' && params.sortMode === 'room')) {
        const hasDistrib = DB.distribution && Object.keys(DB.distribution).length > 0;
        if (hasDistrib) {
            Object.keys(DB.distribution).sort().forEach(room => {
                const list = DB.distribution[room].sort((a, b) => a.nom.localeCompare(b.nom));
                processStudentList(list, room);
                if (items.length > 0 && items[items.length - 1].type !== 'BREAK') items.push({ type: 'BREAK', room: room });
            });
        } else {
            const list = [...DB.students].sort((a, b) => a.nom.localeCompare(b.nom));
            processStudentList(list, "---");
        }
    } else {
        const list = [...DB.students].sort((a, b) => a.nom.localeCompare(b.nom));
        processStudentList(list, "Toutes Salles");
    }

    if (items.length === 0) return alert("Rien à imprimer !");

    // --- IMPRESSION ---
    const m = 10;
    const boxW = (210 - 2 * m) / nbCols;
    const boxH = (297 - 2 * m) / nbRows;
    const perPage = nbCols * nbRows;

    let idxPage = 0;
    let currentRoom = null;
    let currentSubject = null;

    while (items.length > 0 && items[items.length - 1].type === 'BREAK') items.pop();

    items.forEach((item, i) => {
        if (item.type === 'BREAK') {
            idxPage = perPage; return;
        }

        let newPage = false;
        if (idxPage >= perPage) newPage = true;
        if ((params.sortMode === 'room' || type === 'table') && item.room !== currentRoom) {
            if (currentRoom !== null) newPage = true;
        }

        if (i === 0 || newPage) {
            if (i > 0) doc.addPage();
            idxPage = 0;
            currentRoom = item.room;
            currentSubject = item.subject;

            doc.setFontSize(8); doc.setTextColor(150);
            let header = (type === 'table') ? `Salle : ${currentRoom}` : ((params.sortMode === 'room') ? `Salle : ${currentRoom}` : "Global Alpha");
            if (params.qtyMode === 'exams' && params.groupMode === 'subject' && currentSubject) header += ` - Épreuve : ${currentSubject}`;
            doc.text(header, m, 5);
        }

        const col = idxPage % nbCols;
        const row = Math.floor(idxPage / nbCols);
        const x = m + col * boxW;
        const y = m + row * boxH;
        const cx = x + boxW / 2;
        const cy = y + boxH / 2;

        doc.setDrawColor(200); doc.setLineWidth(0.1); doc.setLineDash([2, 2]);
        doc.rect(x, y, boxW, boxH); doc.setLineDash([]);
        doc.setTextColor(0);

        if (type === 'anonymat') {
            doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
            doc.text(item.l1, cx, y + 10, { align: 'center' });

            doc.setFontSize(22); doc.setFont("courier", "bold"); doc.setTextColor(0);
            doc.text(item.l2, cx, cy + 2, { align: 'center' });

            if (item.subject) {
                doc.setFillColor(241, 242, 246); doc.rect(x + 5, y + boxH - 14, boxW - 10, 9, 'F');
                doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(44, 62, 80);
                doc.text(item.subject, cx, y + boxH - 7, { align: 'center' });
            }
        } else {
            doc.setFontSize(8); doc.setTextColor(100);
            doc.text(item.l1, cx, y + 8, { align: 'center' });
            doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text(doc.splitTextToSize(item.l2, boxW - 4), cx, cy, { align: 'center' });
            doc.setFontSize(10); doc.setFont("helvetica", "normal");
            doc.text(item.l3, cx, cy + 8, { align: 'center' });
            if (item.isCode) {
                doc.setFont("courier", "bold"); doc.setTextColor(192, 57, 43); doc.setFontSize(10);
                doc.text(item.code, x + boxW - 2, y + boxH - 2, { align: 'right' });
            }
        }
        idxPage++;
    });

    doc.save(`Etiquettes_${type}.pdf`);
}

function saveGlobalData() {
    const d = new Date();
    const fn = `${d.getFullYear()} ${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')} - Sauvegarde DNB.data`;
    const a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB));
    a.download = fn;
    a.click();

    // RESET DE L'ALERTE
    firstUnsavedTime = null;
    updateSaveButtonStatus(); // Arrête le clignotement
    showToast("✅ Projet exporté avec succès !", 'success');
}

// Fonction qui vérifie le temps écoulé et change le style du bouton
function updateSaveButtonStatus() {
    const btn = document.getElementById('btnGlobalSave');
    if (!btn) return;

    if (firstUnsavedTime !== null && (Date.now() - firstUnsavedTime > SAVE_ALERT_DELAY)) {
        // Ça fait plus de 10 min
        if (!btn.classList.contains('btn-alert-save')) {
            btn.classList.add('btn-alert-save');
            btn.innerHTML = "⚠️ Sauvegarde Requise !";
            btn.title = "Dernier export fichier il y a plus de 10 minutes";
        }
    } else {
        // Tout va bien
        btn.classList.remove('btn-alert-save');
        btn.innerHTML = "💾 Sauvegarder Projet";
        btn.title = "";
    }
}

// Vérification régulière (toutes les minutes)
setInterval(updateSaveButtonStatus, 60000);

// Vérification immédiate au cas où
function checkSaveStatus() {
    // Si on vient de modifier, on vérifie dans SAVE_ALERT_DELAY ms
    setTimeout(updateSaveButtonStatus, SAVE_ALERT_DELAY + 1000);
}

function loadGlobalData() {
    const f = document.getElementById('loadInput').files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            DB = JSON.parse(e.target.result);

            // --- DATA REPAIR (Legacy Support) ---
            // Assign IDs to Teachers & Rooms if missing (Legacy files usually rely on index/name)
            if (DB.teachers && Array.isArray(DB.teachers)) {
                DB.teachers.forEach((t, i) => { if (!t.id) t.id = "T" + (Date.now() + i); });
            }
            if (DB.rooms && Array.isArray(DB.rooms)) {
                DB.rooms.forEach((r, i) => { if (!r.id) r.id = "R" + (Date.now() + i); });
            }
            // ------------------------------------

            // MIGRATION / SÉCURITÉ ORAUX STAGE
            if (!DB.stage) {
                DB.stage = {
                    config: { date: "2026-06-01", start: "08:00", end: "17:00", duration: 20, break: 0, lunchStart: "12:00", lunchEnd: "13:30" },
                    juries: [],
                    planning: []
                };
            }
            // Ensure DB.edt is initialized
            if (!DB.edt) {
                DB.edt = { cancelled: [], maintained: [] };
            } else {
                // Restore Date objects for DB.edt
                if (DB.edt.cancelled) {
                    DB.edt.cancelled.forEach(c => {
                        if (typeof c.start === 'string') c.start = new Date(c.start);
                        if (typeof c.end === 'string') c.end = new Date(c.end);
                    });
                }
                if (DB.edt.maintained) {
                    DB.edt.maintained.forEach(m => {
                        if (typeof m.start === 'string') m.start = new Date(m.start);
                        if (typeof m.end === 'string') m.end = new Date(m.end);
                    });
                }
            }

            // --- MIGRATION LEGACY (Sauvegarde Utilisateur) ---
            if (DB.oralJuries && Array.isArray(DB.oralJuries) && DB.oralJuries.length > 0) {
                console.log("♻️ Migration des données orales détectée...");

                // Helpers locaux pour migration sûre
                const timeToMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
                const minToTime = min => {
                    let h = Math.floor(min / 60);
                    let m = min % 60;
                    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                };

                // 1. Config
                if (DB.config.oralDate) DB.stage.config.date = DB.config.oralDate;
                if (DB.config.oralStart) DB.stage.config.start = DB.config.oralStart;
                if (DB.config.oralEnd) DB.stage.config.end = DB.config.oralEnd;
                if (DB.config.oralDuration) DB.stage.config.duration = parseInt(DB.config.oralDuration);

                // 2. Juries & Planning
                DB.stage.juries = [];
                DB.stage.planning = [];

                DB.oralJuries.forEach((oldJ, idx) => {
                    // Création du Jury
                    let newJury = {
                        id: oldJ.id || Date.now() + idx,
                        name: "Jury " + (idx + 1),
                        room: "",
                        members: []
                    };

                    // Mapping Salle (Nom -> ID)
                    if (oldJ.room) {
                        let roomObj = DB.rooms.find(r => r.nom === oldJ.room);
                        if (roomObj) newJury.room = roomObj.id;
                    }

                    // Mapping Profs (Nom -> ID)
                    if (oldJ.teachers && Array.isArray(oldJ.teachers)) {
                        oldJ.teachers.forEach(tName => {
                            if (!tName.trim()) return;
                            // Recherche approximative nom/prenom
                            let tObj = DB.teachers.find(t => (t.nom + " " + t.prenom).includes(tName.trim()) || tName.includes(t.nom));
                            if (tObj) newJury.members.push(tObj.id);
                        });
                    }
                    DB.stage.juries.push(newJury);

                    // Mapping Elèves -> Planning (Generation des heures)
                    if (oldJ.students && Array.isArray(oldJ.students)) {
                        let cursorMin = timeToMin(DB.stage.config.start);
                        const dur = DB.stage.config.duration;
                        const pause = DB.stage.config.break || 0;
                        // Helper simple pour l'heure
                        // Note: On ne gère pas la pause dej ici pour la migration brutale, on séquence juste.

                        oldJ.students.forEach(st => {
                            // Retrouver l'ID élève réel dans DB.students (les IDs peuvent avoir changé ou être identiques)
                            // On préfère matcher par ID si possible, sinon Nom/Prénom
                            let realStudent = DB.students.find(s => s.id == st.id);
                            if (!realStudent) {
                                realStudent = DB.students.find(s => s.nom === st.nom && s.prenom === st.prenom);
                            }

                            if (realStudent) {
                                DB.stage.planning.push({
                                    juryId: newJury.id,
                                    studentId: realStudent.id,
                                    time: minToTime(cursorMin)
                                });
                                cursorMin += dur + pause;
                            }
                        });
                    }
                });

                // Nettoyage pour ne pas re-migrer
                delete DB.oralJuries;
                showToast("✅ Données orales récupérées et converties !", 'success');
            }
            // -----------------------------------------------------

            // Ecrase config si vide
            if (!DB.config.schoolName) DB.config.schoolName = "";

            // REFRESH FULL UI
            renderStageConfigUI(); // Force refresh of Stage Config specifically

            // 1. ON FORCE LE VERROUILLAGE
            DB.uiState = DB.uiState || {};
            if (!DB.uiState.locked) DB.uiState.locked = { students: true, rooms: true, teachers: true, distrib: true, grades: true, simul: true };

            // 2. Initialisation des variables manquantes (sécurité)
            if (DB.config.director) {
                document.getElementById('dirName').value = DB.config.director.name || "";
                setDirectorCiv(DB.config.director.civ || "M. le Principal");
            }
            if (DB.config.nbSurv === undefined) DB.config.nbSurv = 1;
            if (!DB.config.scienceSubjects) DB.config.scienceSubjects = ['SVT', 'PC', 'TECH'];

            // Correction des horaires TT si manquants
            DB.exams.forEach(ex => { if (!ex.timeTT) ex.timeTT = ex.time; });

            // 3. Mise à jour de l'affichage
            renderExamTable();
            checkLogo();
            checkSignature();

            // Mise à jour visuelle des cadenas
            updateLockUI('students'); updateLockUI('rooms'); updateLockUI('teachers'); updateDistribLock(); updateLockUI('grades'); updateLockUI('simul');

            // Mise à jour des autres sections
            renderVisualDistribution();

            // Remplissage des champs de configuration
            if (DB.config.director) {
                document.getElementById('dirName').value = DB.config.director.name || "";
                const radios = document.getElementsByName('dirCiv');
                for (let r of radios) { if (r.value === DB.config.director.civ) r.checked = true; }
            }
            if (DB.config.schoolName) document.getElementById('schoolName').value = DB.config.schoolName;
            if (DB.config.year) document.getElementById('sessionYear').value = DB.config.year;
            if (DB.config.city) document.getElementById('schoolCity').value = DB.config.city;
            // Mise à jour des cases à cocher Sciences
            document.getElementById('chkSVT').checked = DB.config.scienceSubjects.includes('SVT');
            document.getElementById('chkPC').checked = DB.config.scienceSubjects.includes('PC');
            document.getElementById('chkTech').checked = DB.config.scienceSubjects.includes('TECH');

            showToast("Données chargées et sécurisées !", 'success');
        } catch (err) {
            console.error(err);
            alert("Erreur lors du chargement : " + err.message);
        }
    };
    r.readAsText(f);
}

// --- PARTIE DATA VISUALISATION (FINALE V21.0) ---

// Fonction de calcul statistique
function calculateStats(students) {
    const subjects = ['total', 'fr', 'math', 'hg', 'sci', 'moy20'];
    let result = {};

    subjects.forEach(sub => {
        let values = students.map(s => {
            if (!s.grades) return null;

            let sc = 0, c = 0;
            if (s.grades.svt != null) { sc += s.grades.svt; c++; }
            if (s.grades.pc != null) { sc += s.grades.pc; c++; }
            if (s.grades.tech != null) { sc += s.grades.tech; c++; }
            const sciScore = c > 0 ? sc / c : null;

            if (sub === 'fr') return s.grades.fr;
            if (sub === 'math') return s.grades.math;
            if (sub === 'hg') return s.grades.hg;
            if (sub === 'sci') return sciScore;

            if (sub === 'total') {
                let t = 0;
                if (s.grades.fr != null) t += s.grades.fr;
                if (s.grades.math != null) t += s.grades.math;
                if (s.grades.hg != null) t += s.grades.hg;
                if (sciScore != null) t += sciScore;
                return t;
            }

            if (sub === 'moy20') {
                let sum = 0, count = 0;
                if (s.grades.fr != null) { sum += s.grades.fr; count++; }
                if (s.grades.math != null) { sum += s.grades.math; count++; }
                if (s.grades.hg != null) { sum += s.grades.hg; count++; }
                if (sciScore != null) { sum += sciScore; count++; }
                return count > 0 ? (sum / count) : null;
            }
        }).filter(v => v !== null && v !== undefined);

        if (values.length === 0) {
            result[sub] = { min: '-', moy: '-', max: '-', med: '-', ecart: '-' };
        } else {
            values.sort((a, b) => a - b);
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = values[0];
            const max = values[values.length - 1];
            let med = 0;
            const mid = Math.floor(values.length / 2);
            if (values.length % 2 !== 0) med = values[mid];
            else med = (values[mid - 1] + values[mid]) / 2;

            const squareDiffs = values.map(v => Math.pow(v - avg, 2));
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(avgSquareDiff);

            result[sub] = {
                min: min.toFixed(1).replace('.0', ''),
                moy: avg.toFixed(1).replace('.0', ''),
                max: max.toFixed(1).replace('.0', ''),
                med: med.toFixed(1).replace('.0', ''),
                ecart: stdDev.toFixed(1).replace('.0', '')
            };
        }
    });
    return result;
}

// Gestion des onglets
function switchDatavisTab(tabName) {
    document.querySelectorAll('.nav-pill').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-tab-' + tabName).classList.add('active');
    document.querySelectorAll('.datavis-view').forEach(view => view.classList.remove('active'));
    document.getElementById('view-' + tabName).classList.add('active');
}

// Affichage principal DataVis
function renderDatavisStats() {
    if (DB.students.length === 0) return;

    const container = document.getElementById('res-datavis').querySelector('.card');
    container.innerHTML = '';

    // 1. MENU D'ONGLETS + BOUTONS EXPORT
    const headerHtml = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap;">
                <div class="nav-tabs-container" style="margin-bottom:0;">
                    <div id="btn-tab-charts" class="nav-pill active" onclick="switchDatavisTab('charts')">
                        📊 Graphiques & Répartition
                    </div>
                    <div id="btn-tab-table" class="nav-pill" onclick="switchDatavisTab('table')">
                        📄 Tableau Statistique
                    </div>
                </div>
                <div>
                    <button class="btn btn-dark" onclick="exportDatavisPDF()">🖨️ Rapport PDF</button>
                    <button class="btn btn-success" style="margin-left:5px;" onclick="exportDatavisXLSX()">💾 Excel</button>
                </div>
            </div>
        `;
    container.innerHTML += headerHtml;

    const classes = [...new Set(DB.students.map(s => s.classe).filter(c => c))].sort();

    // --- VUE 1 : GRAPHIQUES ---
    let viewChartsHtml = `<div id="view-charts" class="datavis-view active">`;

    // A. Cartes (Vertes) - MODIFICATION ICI POUR LE /20
    viewChartsHtml += `<div style="display:flex; flex-wrap:wrap; gap:15px; margin-bottom:25px;">`;
    classes.forEach(cls => {
        const classStudents = DB.students.filter(s => s.classe === cls);
        const stats = calculateStats(classStudents);
        viewChartsHtml += `
            <div class="stat-card">
                <h4>${cls}</h4>
                <div class="stat-row"><span>🖍️ Français :</span> <b>${stats.fr.moy} / 20</b></div>
                <div class="stat-row"><span>🔢 Maths :</span> <b>${stats.math.moy} / 20</b></div>
                <div class="stat-row"><span>🏛️ Hist-Géo :</span> <b>${stats.hg.moy} / 20</b></div>
                <div class="stat-row"><span>🧪 Sciences :</span> <b>${stats.sci.moy} / 20</b></div>
                <div class="stat-footer">
                    🎓 Moyenne : ${stats.moy20.moy} / 20
                </div>
            </div>`;
    });
    viewChartsHtml += `</div>`;

    // B. Graphiques
    viewChartsHtml += `
            <div class="chart-grid">
                <div class="chart-box"><div class="chart-header">🖍️ Français (Répartition)</div><div class="chart-container"><canvas id="chartFr"></canvas></div></div>
                <div class="chart-box"><div class="chart-header">🔢 Mathématiques (Répartition)</div><div class="chart-container"><canvas id="chartMath"></canvas></div></div>
                <div class="chart-box"><div class="chart-header">🏛️ Hist-Géo (Répartition)</div><div class="chart-container"><canvas id="chartHg"></canvas></div></div>
                <div class="chart-box"><div class="chart-header">🧪 Sciences (Répartition)</div><div class="chart-container"><canvas id="chartSci"></canvas></div></div>
            </div>
        `;
    viewChartsHtml += `</div>`;
    container.innerHTML += viewChartsHtml;

    // --- VUE 2 : TABLEAU ---
    let viewTableHtml = `<div id="view-table" class="datavis-view">`;
    viewTableHtml += `
            <div style="overflow-x:auto;">
                <table id="fullStatTable" class="table-striped">
                    <thead>
                        <tr>
                            <th rowspan="2">Groupe</th>
                            <th colspan="5" style="text-align:center; background:#e8f6f3;">Total Points / Moyenne</th>
                            <th colspan="5" style="text-align:center; background:#fef9e7;">Français</th>
                            <th colspan="5" style="text-align:center; background:#fef9e7;">Maths</th>
                            <th colspan="5" style="text-align:center; background:#fef9e7;">Hist-Géo</th>
                            <th colspan="5" style="text-align:center; background:#fef9e7;">Sciences</th>
                        </tr>
                        <tr style="font-size:0.8rem">
                            <th>Min</th><th>Moy</th><th>Max</th><th>Med</th><th>Ec-T</th>
                            <th>Min</th><th>Moy</th><th>Max</th><th>Med</th><th>Ec-T</th>
                            <th>Min</th><th>Moy</th><th>Max</th><th>Med</th><th>Ec-T</th>
                            <th>Min</th><th>Moy</th><th>Max</th><th>Med</th><th>Ec-T</th>
                            <th>Min</th><th>Moy</th><th>Max</th><th>Med</th><th>Ec-T</th>
                        </tr>
                    </thead>
                    <tbody>`;

    const groups = [
        { name: "Cohorte (Global)", filter: s => true },
        { name: "Filles", filter: s => s.sexe === 'F' },
        { name: "Garçons", filter: s => s.sexe === 'M' }
    ];
    classes.forEach(c => groups.push({ name: c, filter: s => s.classe === c }));

    groups.forEach(g => {
        const groupStudents = DB.students.filter(g.filter);
        const stats = calculateStats(groupStudents);
        viewTableHtml += `
            <tr>
                <td class="row-header" style="font-weight:bold;">${g.name}</td>
                <td>${stats.total.min}</td><td style="font-weight:bold">${stats.total.moy}</td><td>${stats.total.max}</td><td>${stats.total.med}</td><td style="color:#777">${stats.total.ecart}</td>
                <td>${stats.fr.min}</td><td style="font-weight:bold">${stats.fr.moy}</td><td>${stats.fr.max}</td><td>${stats.fr.med}</td><td style="color:#777">${stats.fr.ecart}</td>
                <td>${stats.math.min}</td><td style="font-weight:bold">${stats.math.moy}</td><td>${stats.math.max}</td><td>${stats.math.med}</td><td style="color:#777">${stats.math.ecart}</td>
                <td>${stats.hg.min}</td><td style="font-weight:bold">${stats.hg.moy}</td><td>${stats.hg.max}</td><td>${stats.hg.med}</td><td style="color:#777">${stats.hg.ecart}</td>
                <td>${stats.sci.min}</td><td style="font-weight:bold">${stats.sci.moy}</td><td>${stats.sci.max}</td><td>${stats.sci.med}</td><td style="color:#777">${stats.sci.ecart}</td>
            </tr>`;
    });
    viewTableHtml += `</tbody></table></div></div>`;
    container.innerHTML += viewTableHtml;

    renderHistogram('chartFr', 'fr', 20, 1);
    renderHistogram('chartMath', 'math', 20, 1);
    renderHistogram('chartHg', 'hg', 20, 1);
    renderHistogram('chartSci', 'sci', 20, 1);
}

function renderHistogram(canvasId, subject, maxScore, step) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();

    // Create gradient
    const gradientStroke = ctx.createLinearGradient(0, 230, 0, 50);
    gradientStroke.addColorStop(1, 'rgba(203,12,159,0.8)');
    gradientStroke.addColorStop(0.2, 'rgba(203,12,159,0.2)');
    gradientStroke.addColorStop(0, 'rgba(203,12,159,0.1)'); //purple colors

    const labels = []; const dataCounts = [];
    for (let i = 0; i <= maxScore; i += step) { labels.push(i.toString()); dataCounts.push(0); }
    DB.students.forEach(s => {
        if (!s.grades) return;
        let val = null;
        if (subject === 'fr') val = s.grades.fr;
        if (subject === 'math') val = s.grades.math;
        if (subject === 'hg') val = s.grades.hg;
        if (subject === 'sci') {
            let sc = 0, c = 0;
            if (s.grades.svt != null) { sc += s.grades.svt; c++ }
            if (s.grades.pc != null) { sc += s.grades.pc; c++ }
            if (s.grades.tech != null) { sc += s.grades.tech; c++ }
            if (c > 0) val = sc / c;
        }
        if (val !== null) {
            let bucketIndex = Math.round(val);
            if (bucketIndex < 0) bucketIndex = 0;
            if (bucketIndex > maxScore) bucketIndex = maxScore;
            dataCounts[bucketIndex]++;
        }
    });

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre d\'élèves',
                data: dataCounts,
                tension: 0.4,
                borderWidth: 0,
                borderRadius: 4,
                borderSkipped: false,
                backgroundColor: gradientStroke,
                maxBarThickness: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
            scales: {
                y: {
                    grid: { drawBorder: false, display: true, drawOnChartArea: true, drawTicks: false, borderDash: [5, 5] },
                    ticks: { suggestedMin: 0, suggestedMax: 10, beginAtZero: true, padding: 15, font: { size: 11, family: "Open Sans", style: 'normal', lineHeight: 2 }, color: "#b2b9bf" }
                },
                x: {
                    grid: { drawBorder: false, display: false, drawOnChartArea: false, drawTicks: false, borderDash: [5, 5] },
                    ticks: { display: true, color: '#b2b9bf', padding: 20, font: { size: 11, family: "Open Sans", style: 'normal', lineHeight: 2 } }
                }
            }
        }
    });
}

// EXPORT PDF DATAVIS (Thème Bleu)
function exportDatavisPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    addSmartLogo(doc, 10, 10, 40);
    doc.setFontSize(16); doc.text("Rapport Statistique DNB Blanc", pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12); doc.text("Session " + DB.config.year, pageWidth / 2, 28, { align: 'center' });

    let yPos = 40;

    // --- 1. TUILES ---
    const stats = calculateStats(DB.students);

    doc.setFontSize(14); doc.setTextColor(41, 128, 185); // Bleu
    doc.text("1. Synthèse des résultats (Moyennes Globales)", 14, yPos);
    yPos += 10;

    doc.setFontSize(11); doc.setTextColor(0);
    const leftX = 20; const rightX = 110;

    doc.setFont("helvetica", "bold");
    doc.text(`• Moyenne Générale : ${stats.moy20.moy} / 20`, leftX, yPos);
    doc.setFont("helvetica", "normal");

    yPos += 8;
    doc.text(`• Français : ${stats.fr.moy} / 20`, leftX, yPos);
    doc.text(`• Mathématiques : ${stats.math.moy} / 20`, rightX, yPos);
    yPos += 6;
    doc.text(`• Hist-Géo : ${stats.hg.moy} / 20`, leftX, yPos);
    doc.text(`• Sciences : ${stats.sci.moy} / 20`, rightX, yPos);

    yPos += 15;

    // --- 2. GRAPHIQUES ---
    const chartsIds = ['chartFr', 'chartMath', 'chartHg', 'chartSci'];
    const chartTitles = ['Français', 'Maths', 'Hist-Géo', 'Sciences'];

    const firstCanvas = document.getElementById(chartsIds[0]);
    if (firstCanvas && firstCanvas.width > 0) {
        doc.setFontSize(14); doc.setTextColor(41, 128, 185); // Bleu
        doc.text("2. Distribution des Notes (Graphiques)", 14, yPos);
        yPos += 10;
        let x = 15;
        chartsIds.forEach((id, idx) => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const imgData = canvas.toDataURL("image/png", 1.0);
                if (yPos + 55 > 280) { doc.addPage(); yPos = 20; }
                doc.addImage(imgData, 'PNG', x, yPos, 85, 50);
                doc.setFontSize(10); doc.setTextColor(0);
                doc.text(chartTitles[idx], x + 42, yPos - 2, { align: 'center' });
            }
            if (idx % 2 === 1) { x = 15; yPos += 65; } else { x = 110; }
        });
        yPos += 10;
    } else {
        doc.setFontSize(10); doc.setTextColor(150);
        doc.text("(Les graphiques ne sont exportés que s'ils sont affichés à l'écran)", 14, yPos);
        yPos += 10;
    }

    // --- 3. TABLEAU ---
    if (yPos > 220) { doc.addPage(); yPos = 20; } else { yPos += 10; }

    doc.setFontSize(14); doc.setTextColor(41, 128, 185); // Bleu
    doc.text("3. Détail par Groupe", 14, yPos);
    yPos += 10;

    const classes = [...new Set(DB.students.map(s => s.classe).filter(c => c))].sort();
    const groups = [{ name: "Global", filter: s => true }, { name: "Filles", filter: s => s.sexe === 'F' }, { name: "Garçons", filter: s => s.sexe === 'M' }];
    classes.forEach(c => groups.push({ name: c, filter: s => s.classe === c }));

    let body = [];
    groups.forEach(g => {
        const gStats = calculateStats(groupStudents = DB.students.filter(g.filter));
        body.push([g.name, gStats.moy20.moy, gStats.fr.moy, gStats.math.moy, gStats.hg.moy, gStats.sci.moy]);
    });

    doc.autoTable({
        head: [['Groupe', 'Moy. Générale', 'Français', 'Maths', 'Hist-Géo', 'Sciences']],
        body: body,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // En-tête Bleu
        styles: { halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });
    doc.save("Rapport_Statistiques.pdf");
}
function exportSimulationXLSX() {
    // 1. On vérifie qu'il y a des données
    if (DB.students.length === 0) return alert("Aucun élève à exporter.");

    // 2. On prépare les en-têtes du fichier Excel
    const data = [
        ["Nom", "Prénom", "Classe", "Moy. Écrits", "Note Oral", "Moy. Épreuves (60%)", "Moy. Générale (40%)", "NOTE FINALE DNB", "Mention"]
    ];

    // 3. On récupère la configuration des sciences
    const activeSciences = DB.config.scienceSubjects || ['SVT', 'PC', 'TECH'];

    // 4. On boucle sur chaque élève pour recalculer les notes (exactement comme l'affichage)
    DB.students.forEach(s => {
        if (!s.grades) return;

        // --- Calculs identiques à renderSimulation ---

        // Calcul Sciences
        let sumSci = 0, countSci = 0;
        if (activeSciences.includes('SVT') && s.grades.svt !== null) { sumSci += s.grades.svt; countSci++; }
        if (activeSciences.includes('PC') && s.grades.pc !== null) { sumSci += s.grades.pc; countSci++; }
        if (activeSciences.includes('TECH') && s.grades.tech !== null) { sumSci += s.grades.tech; countSci++; }
        const moySci = countSci > 0 ? (sumSci / countSci) : null;

        // Calcul Écrits
        let sumEcrit = 0, countEcrit = 0;
        if (s.grades.fr !== null) { sumEcrit += s.grades.fr; countEcrit++; }
        if (s.grades.math !== null) { sumEcrit += s.grades.math; countEcrit++; }
        if (s.grades.hg !== null) { sumEcrit += s.grades.hg; countEcrit++; }
        if (moySci !== null) { sumEcrit += moySci; countEcrit++; }
        const moyEcritsVal = countEcrit > 0 ? (sumEcrit / countEcrit) : 0;

        // Calcul Épreuves (Écrits + Oral)
        let sumEpreuves = sumEcrit;
        let countEpreuves = countEcrit;
        if (s.grades.oral !== null && s.grades.oral !== undefined) {
            sumEpreuves += s.grades.oral;
            countEpreuves++;
        }
        const moyEpreuves = countEpreuves > 0 ? (sumEpreuves / countEpreuves) : 0;

        // Calcul Final
        const moyGen = (s.grades.genAvg !== null) ? s.grades.genAvg : 0;
        let finalAvg = 0;
        if (moyGen > 0 && moyEpreuves > 0) finalAvg = (moyGen * 0.4) + (moyEpreuves * 0.6);
        else if (moyEpreuves > 0) finalAvg = moyEpreuves;
        else if (moyGen > 0) finalAvg = moyGen;

        // Calcul Mention
        let mention = "Refusé";
        if (finalAvg >= 10) mention = "Admis";
        if (finalAvg >= 12) mention = "Assez Bien";
        if (finalAvg >= 14) mention = "Bien";
        if (finalAvg >= 16) mention = "Très Bien";
        if (finalAvg >= 18) mention = "TB (Félicitations)";

        // 5. On ajoute la ligne au tableau Excel
        data.push([
            s.nom,
            s.prenom,
            s.classe,
            parseFloat(moyEcritsVal.toFixed(2)),       // Moyenne Écrits
            s.grades.oral !== null ? s.grades.oral : "", // Note Oral
            parseFloat(moyEpreuves.toFixed(2)),      // Moyenne Épreuves
            s.grades.genAvg !== null ? s.grades.genAvg : "", // Moyenne Générale
            parseFloat(finalAvg.toFixed(2)),         // NOTE FINALE
            mention                                  // Mention
        ]);
    });

    // 6. Création du fichier Excel avec SheetJS
    const ws = XLSX.utils.aoa_to_sheet(data); // Convertit le tableau en feuille
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Simulation DNB");

    // Téléchargement
    XLSX.writeFile(wb, "Simulation_DNB_Complet.xlsx");
}
function exportDatavisXLSX() {
    if (DB.students.length === 0) return alert("Aucune donnée à exporter.");

    // 1. Préparation des colonnes
    // On crée un tableau avec une ligne d'en-tête
    const data = [
        ["Groupe", "Effectif", "Moyenne Générale /20", "Français /20", "Maths /20", "Hist-Géo /20", "Sciences /20"]
    ];

    // 2. Définition des groupes à analyser
    // On récupère la liste des classes
    const classes = [...new Set(DB.students.map(s => s.classe).filter(c => c))].sort();

    const groups = [
        { name: "Cohorte (Global)", filter: s => true },
        { name: "Filles", filter: s => s.sexe === 'F' },
        { name: "Garçons", filter: s => s.sexe === 'M' }
    ];

    // On ajoute chaque classe à la liste des groupes
    classes.forEach(c => groups.push({ name: "Classe " + c, filter: s => s.classe === c }));

    // 3. Boucle de calcul (identique au tableau affiché à l'écran)
    groups.forEach(g => {
        // On filtre les élèves du groupe actuel
        const groupStudents = DB.students.filter(g.filter);
        const count = groupStudents.length;

        if (count > 0) {
            // On utilise la fonction existante calculateStats pour avoir les moyennes
            const stats = calculateStats(groupStudents);

            // On ajoute la ligne dans le tableau Excel
            data.push([
                g.name,                 // Nom du groupe
                count,                  // Effectif
                parseFloat(stats.moy20.moy), // Moyenne Générale
                parseFloat(stats.fr.moy),    // Français
                parseFloat(stats.math.moy),  // Maths
                parseFloat(stats.hg.moy),    // Hist-Géo
                parseFloat(stats.sci.moy)    // Sciences
            ]);
        } else {
            // Si le groupe est vide (ex: une classe sans élèves importés)
            data.push([g.name, 0, "-", "-", "-", "-", "-"]);
        }
    });

    // 4. Génération du fichier
    const ws = XLSX.utils.aoa_to_sheet(data); // Convertit le tableau JS en feuille Excel

    // Petit ajustement esthétique des largeurs de colonnes (optionnel mais propre)
    ws['!cols'] = [
        { wch: 20 }, // Largeur Groupe
        { wch: 10 }, // Largeur Effectif
        { wch: 20 }, // Largeur Moyenne Gen
        { wch: 15 }, // Largeur Fr
        { wch: 15 }, // Largeur Math
        { wch: 15 }, // Largeur HG
        { wch: 15 }  // Largeur Sci
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statistiques DNB");

    // Téléchargement
    XLSX.writeFile(wb, "Statistiques_DNB_Blanc.xlsx");
}
// ============================================================
// === MODULE DE SAUVEGARDE AUTOMATIQUE (CORRIGÉ & COMPLET) ===
// ============================================================

// 1. ROBUST AUTO-SAVE (MULTI-SLOT)
const SAVE_SLOTS = ['DNB_Manager_Current', 'DNB_Manager_Backup_1', 'DNB_Manager_Backup_2', 'DNB_Manager_Backup_3'];
let lastRotationTime = Date.now();

function autoSave() {
    if (typeof DB === 'undefined' || !DB) return;

    // 1. Sauvegarde slot CURRENT
    localStorage.setItem(SAVE_SLOTS[0], JSON.stringify(DB));

    // 2. Rotation des backups (toutes les 5 min)
    if (Date.now() - lastRotationTime > 5 * 60 * 1000) {
        lastRotationTime = Date.now();
        // Rotation : 2->3, 1->2, 0->1
        if (localStorage.getItem(SAVE_SLOTS[2])) localStorage.setItem(SAVE_SLOTS[3], localStorage.getItem(SAVE_SLOTS[2]));
        if (localStorage.getItem(SAVE_SLOTS[1])) localStorage.setItem(SAVE_SLOTS[2], localStorage.getItem(SAVE_SLOTS[1]));
        localStorage.setItem(SAVE_SLOTS[1], localStorage.getItem(SAVE_SLOTS[0]));
        console.log("🔄 Rotation des backups effectuée.");
    }

    // Logic Alerte Bouton
    if (firstUnsavedTime === null) {
        firstUnsavedTime = Date.now();
        checkSaveStatus();
    }
}

// 3. Déclencheurs (Debounce)
let saveTimeout;
const triggerSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(autoSave, 2000); // Save après 2s d'inactivité
};

document.addEventListener('change', triggerSave);
document.addEventListener('input', triggerSave);
document.addEventListener('mouseup', () => setTimeout(autoSave, 500)); // Click ending logic

// 4. Restauration au démarrage (LOGIQUE MISE À JOUR)
window.addEventListener('load', function () {
    setTimeout(() => {
        const backup = localStorage.getItem('DNB_Manager_Current');
        if (backup) {
            let btn = document.createElement('button');
            btn.innerHTML = "⚠️ <strong>Une sauvegarde existe</strong> : Restaurer la session ?";
            btn.style.cssText = "position:fixed; top:10px; left:50%; transform:translateX(-50%); background:#e74c3c; color:white; padding:12px 25px; border:none; border-radius:50px; z-index:10000; cursor:pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-size:1rem; animation: slideDown 0.5s;";

            btn.onclick = function () {
                if (confirm("Attention : Cela va écraser les données actuelles par la sauvegarde automatique. Continuer ?")) {
                    try {
                        DB = JSON.parse(backup);

                        // A. Initialisation des défauts (Migration)
                        if (!DB.config.labels) DB.config.labels = JSON.parse(JSON.stringify(DEFAULT_LABELS));
                        if (!DB.config.scienceSubjects) DB.config.scienceSubjects = ['SVT', 'PC', 'TECH'];
                        if (!DB.edt) {
                            DB.edt = { cancelled: [], maintained: [] };
                        } else {
                            // Restore Date objects for DB.edt
                            if (DB.edt.cancelled) {
                                DB.edt.cancelled.forEach(c => {
                                    if (typeof c.start === 'string') c.start = new Date(c.start);
                                    if (typeof c.end === 'string') c.end = new Date(c.end);
                                });
                            }
                            if (DB.edt.maintained) {
                                DB.edt.maintained.forEach(m => {
                                    if (typeof m.start === 'string') m.start = new Date(m.start);
                                    if (typeof m.end === 'string') m.end = new Date(m.end);
                                });
                            }
                        }

                        // B. Relance sécurisée des affichages
                        const safeRun = (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) { console.warn(e); } };

                        safeRun(renderExamTable);
                        safeRun(checkLogo);
                        safeRun(checkSignature);
                        safeRun(renderStudents);
                        safeRun(renderRooms);
                        safeRun(renderTeachers);
                        safeRun(renderVisualDistribution);
                        safeRun(renderGrades);
                        safeRun(renderSimulation);
                        safeRun(renderPlanning);
                        safeRun(renderAmenagements);

                        if (document.getElementById('res-datavis') && document.getElementById('res-datavis').querySelector('.card')) {
                            safeRun(renderDatavisStats);
                        }

                        // C. Mise à jour de l'interface (Cadenas & Config)
                        updateLockUI('students'); updateLockUI('rooms'); updateLockUI('teachers');
                        updateDistribLock(); updateLockUI('grades'); updateLockUI('simul');

                        // Restauration Champs Config de base
                        if (DB.config.schoolName) document.getElementById('schoolName').value = DB.config.schoolName;
                        if (DB.config.year) document.getElementById('sessionYear').value = DB.config.year;
                        if (DB.config.city) document.getElementById('schoolCity').value = DB.config.city;
                        // --- CORRECTIF 1 : DIRECTION ---
                        if (DB.config.director) {
                            if (document.getElementById('dirName')) document.getElementById('dirName').value = DB.config.director.name || "";
                            // On utilise la fonction visuelle pour réactiver la bonne "brique"
                            if (typeof setDirectorCiv === 'function') setDirectorCiv(DB.config.director.civ || "M. le Principal");
                        }

                        // --- CORRECTIF 2 : SCIENCES ---
                        if (DB.config.scienceSubjects) {
                            document.getElementById('chkSVT').checked = DB.config.scienceSubjects.includes('SVT');
                            document.getElementById('chkPC').checked = DB.config.scienceSubjects.includes('PC');
                            document.getElementById('chkTech').checked = DB.config.scienceSubjects.includes('TECH');
                        }

                        showToast("✅ Session restaurée avec succès !", 'success');
                        btn.remove();
                    } catch (e) {
                        console.error(e);
                        alert("Erreur lors de la restauration : " + e.message);
                    }
                }
            };

            let btnClose = document.createElement('span');
            btnClose.innerHTML = " ✖";
            btnClose.style.marginLeft = "10px";
            btnClose.onclick = (e) => { e.stopPropagation(); btn.remove(); };
            btn.appendChild(btnClose);
            document.body.appendChild(btn);
        }
    }, 800);
});

// --- MODULE ETIQUETTES (CODE RETOUR V5) ---

// --- CORRECTIF FONCTION MANQUANTE ---
// Copiez cette fonction si elle n'existe pas ailleurs dans votre code
function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

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

    if (!code) return alert("Le CODE est obligatoire !");

    // Initialisation DB si besoin
    if (!DB.config) DB.config = {};
    if (!DB.config.labels) DB.config.labels = [];

    // Vérif doublon
    if (DB.config.labels.find(l => l.code === code)) {
        return alert("Ce CODE existe déjà !");
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
    if (code === 'TTEMPS') return alert("Impossible de supprimer le label système TTEMPS");

    if (confirm("Supprimer ce label ?")) {
        DB.config.labels = DB.config.labels.filter(l => l.code !== code);

        // Nettoyage élèves
        DB.students.forEach(s => {
            if (s.labels) s.labels = s.labels.filter(l => l !== code);
        });

        saveDB();
        renderLabels();
    }
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
            if (!hasDistrib) alert("⚠️ Veuillez d'abord effectuer la répartition dans l'onglet 'Répartition'.");
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

    if (body.length === 0) return alert("Aucun élève avec aménagement trouvé.");

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
    // On pourrait ajouter un blocage si les durées ne correspondent pas, 
    // mais on laisse la liberté (juste un confirm)
    if (!confirm("Valider ce découpage ? \n\nATTENTION : Si vous modifiez le nombre de créneaux, vous devrez refaire le planning de cette épreuve.")) return;
    document.getElementById('slotModal').style.display = 'none';
    renderExamTable(); // Rafraichit le bouton
    // On vide le planning existant pour éviter les incohérences d'index
    // (Optionnel : on pourrait essayer de migrer mais c'est risqué)
    renderPlanning();
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
        alert(`❌ Zéro cours détectés dans le fichier ${label}. Vérifiez les colonnes.`);
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
        if (!confirm("⚠️ ATTENTION : RETOUR À 1 SURVEILLANT\n\nCela va supprimer le 2ème surveillant de TOUTES les salles et nettoyer le planning.\n\nConfirmer ?")) {
            checkbox.checked = true; // On annule visuellement
            return;
        }

        // Nettoyage des données du surveillant n°2 (index 1)
        Object.keys(DB.planning).forEach(key => {
            if (key.endsWith("_1")) delete DB.planning[key];
        });
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
        if (!confirm(`Réduire le nombre de surveillants pour "${roomName}" à ${newVal} ?\n(Le surveillant n°${oldVal} sera effacé)`)) return;

        // Nettoyage : On supprime les données correspondant à l'index qu'on enlève (index = newVal, car ça commence à 0)
        // Ex: si on passe de 3 à 2. Les index étaient 0, 1, 2. On supprime l'index 2.
        const indexToRemove = newVal;

        Object.keys(DB.planning).forEach(key => {
            // La clé ressemble à : examIdx_RoomName_type_slotIdx_survIndex
            if (key.includes(`_${roomName}_`) && key.endsWith(`_${indexToRemove}`)) {
                delete DB.planning[key];
            }
        });
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
    if (!DB.exams || DB.exams.length === 0) return alert("Aucune épreuve à exporter.");
    if (!DB.rooms || DB.rooms.length === 0) return alert("Aucune salle définie.");

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
    if (DB.exams.length === 0 || DB.rooms.length === 0) return alert("Veuillez d'abord configurer les examens et les salles.");

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
        alert("⚠️ Aucun cours annulé n'a été chargé ! Importez le fichier dans la zone verte.");
        return;
    }

    if (!confirm("🚀 LANCER L'AFFECTATION ?\nPriorité aux profs du fichier Vert (Dû).")) return;

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
    alert(`Terminé !\nVERT (Dû) : ${countDue}\nBLANC (HSE) : ${countHSE}`);
};

// --- FONCTION D'OPTIMISATION (Avec Popup & Règle Multi-Profs) ---
// --- FONCTION D'OPTIMISATION AVANCÉE (Bouche-trous + Échanges) ---
window.optimizePlanningMoves = function (silentMode = false) {

    if (!silentMode) {
        if (!confirm("🤖 Optimiser les déplacements ?\n\n1. Comblement des trous.\n2. Échange des salles pour éviter aux profs de bouger.")) return 0;
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
        alert(msg);
    }

    return fillsCount + swapsCount;
};
window.resetPlanning = function () {
    if (confirm("🗑️ Attention : Vous allez effacer TOUT le planning.\nContinuer ?")) {
        DB.planning = {}; renderPlanning(); autoSave();
        showToast("✅ Planning réinitialisé.", 'success');
    }
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
                alert("Erreur critique : La fonction openAmenagOptions est introuvable.");
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
    if (confirm(`⚠️ Supprimer l'épreuve "${examName}" ?\n\nAttention : Si vous avez déjà fait un planning ou une répartition pour cette épreuve, les données associées seront décalées ou perdues.`)) {

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
    }
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
    if (!confirm("⚠️ Attention : Cela va écraser tous les jurys existants et vider le planning.\\nContinuer ?")) return;

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
}

function generateStageSlots() {
    if (!confirm("⚠️ Attention : Recalculer les créneaux peut décaler le planning existant.\\nContinuer ?")) return;
    renderStagePlanning();
    showToast("Créneaux régénérés selon les horaires.", 'success');
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
    if (!confirm("Supprimer ce jury ?")) return;
    DB.stage.juries.splice(currentJuryIdx, 1);
    currentJuryIdx = -1;
    document.getElementById('juryDetail').style.display = 'none';
    document.getElementById('juryEmptyMsg').style.display = 'block';
    renderJuriesList();
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
    if (DB.students.length === 0) alert("DEBUG: DB.students est vide ! Vérifiez l'import.");

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
    if (confirm("Tout effacer ?")) {
        DB.stage.planning = [];
        renderStagePlanning();
        if (typeof autoSave === 'function') autoSave();
    }
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
    if (!confirm("Voulez-vous réaligner TOUS les horaires du planning actuel ?\n\nCela va :\n1. Trier les élèves par ordre chronologique actuel.\n2. Recalculer l'heure de passage exacte selon la durée (15 ou 20mn) et le Tiers-Temps.\n3. Corriger les décalages d'affichage.")) return;

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
}

// --- 4. AUTO-FILL DYNAMIQUE ---
function autoFillStage() {
    if (!confirm("Remplissage automatique intelligent (Tiers-Temps inclus) ?\nCela complètera les jurys existants.")) return;

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
    if (!DB.stage || !DB.stage.juries || DB.stage.juries.length === 0) return alert("Aucun jury à exporter.");

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
    if (!DB.stage || !DB.stage.juries || DB.stage.juries.length === 0) return alert("Veuillez d'abord configurer les jurys des oraux.");

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
        doc.setFontSize(12); doc.text(`ORAUX - DNB BLANC ${year}`, pvCenterX, 28, { align: 'center' });

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
        doc.text(`ORAUX - DNB BLANC ${year}`, covCenterX, 30, { align: 'center' });

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
        { key: 'tech', label: 'Technologie', keywords: ['tech', 'techno'] }
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
            options += `<option value="${h}" ${selected} style="${style}">${h}</option>`;
        });
        html += `<tr style="border-bottom:1px solid #f5f5f5;">
            <td style="padding:10px 5px; font-weight:500;">${f.label}</td>
            <td style="padding:5px;"><select id="map_sel_${f.key}" style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px;">${options}</select></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    html += `<div style="margin-top:20px; padding-top:10px; border-top:1px dashed #ddd;">
        <div style="font-size:0.8em; font-weight:bold; color:#666; margin-bottom:5px;">Aperçu (Ligne 1) :</div>
        <div style="overflow-x:auto; font-size:0.75em; background:#f9f9f9; padding:5px; border-radius:4px;">
            <code>${Object.values(data[0]).join(' | ').substring(0, 100)}...</code>
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
    if (isStrictReplace && confirm("Attention : Le mode Remplacement va effacer tous les élèves existants. Continuer ?")) {
        DB.students = [];
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
    alert(`Terminé ! ${count} nouveaux élèves ajoutés (et les existants mis à jour).`);
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
    alert(`Terminé ! ${count} professeurs ajoutés.`);
}

// --- IMPORT : EXECUTION NOTES ---
function executeImport(data, mapping, isStrictReplace) {
    let countSuccess = 0;
    let notFound = [];
    const kNom = findKey(data[0], ['nom', 'élève', 'eleve']);
    const kPrenom = findKey(data[0], ['prénom', 'prenom']);
    const kClasse = findKey(data[0], ['classe', 'division', 'groupe']);
    const kAno = findKey(data[0], ['anonymat', 'ano', 'code', 'numéro']);
    if(!kNom) { alert("Erreur: Colonne NOM introuvable !"); return; }

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
                emc: resolve('emc'), svt: resolve('svt'), pc: resolve('pc'), tech: resolve('tech')
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
            notFoundList.map(name => `<li>${name}</li>`).join('') + "</ul>";
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

    if(report.success > 0) alert(`✅ Importation terminée : ${report.success} éléments ajoutés ou mis à jour.`);
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

// --- NOTES MANUELLES : OUVRIR MODAL ---
function openManualGradeModal(studentId) {
    const s = DB.students.find(st => st.id == studentId);
    if(!s) return;
    document.getElementById('manualGradeStudentId').value = s.id;
    document.getElementById('manualGradeTitle').innerText = `Notes de ${s.nom} ${s.prenom}`;
    const g = s.grades || {};
    document.getElementById('mGradeFr').value = g.fr ?? "";
    document.getElementById('mGradeMath').value = g.math ?? "";
    document.getElementById('mGradeHg').value = g.hg ?? "";
    document.getElementById('mGradeSvt').value = g.svt ?? "";
    document.getElementById('mGradePc').value = g.pc ?? "";
    document.getElementById('mGradeTech').value = g.tech ?? "";
    const emcCont = document.getElementById('containerMGradeEmc');
    const labelHg = document.getElementById('labelHg');
    if (DB.config.splitHGEMC) {
        labelHg.innerText = "Hist-Géo";
        emcCont.style.display = "block";
        document.getElementById('mGradeEmc').value = g.emc ?? "";
    } else {
        labelHg.innerText = "HG / EMC";
        emcCont.style.display = "none";
    }
    document.getElementById('manualGradeModal').style.display = 'flex';
}

// --- NOTES MANUELLES : SAUVEGARDER ---
function saveManualGrades() {
    const id = document.getElementById('manualGradeStudentId').value;
    const s = DB.students.find(st => st.id == id);
    if(!s) return;
    const getVal = (id) => {
        const v = document.getElementById(id).value;
        return (v === "") ? null : parseFloat(v);
    };
    const oldGrades = s.grades || {};
    s.grades = {
        ...oldGrades,
        fr: getVal('mGradeFr'), math: getVal('mGradeMath'), hg: getVal('mGradeHg'),
        emc: DB.config.splitHGEMC ? getVal('mGradeEmc') : oldGrades.emc,
        svt: getVal('mGradeSvt'), pc: getVal('mGradePc'), tech: getVal('mGradeTech')
    };
    saveDB();
    renderGrades();
    document.getElementById('manualGradeModal').style.display = 'none';
    if(typeof showToast === 'function') showToast("Modifications enregistrées");
}

// --- SIMULATION : MODAL ÉDITION ---
function openSimuGradeModal(studentId) {
    const student = DB.students.find(s => s.id === studentId);
    if (!student) return;
    const g = student.grades || {};

    const overlay = document.createElement('div');
    overlay.id = 'simu-modal-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: '9999',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    });
    overlay.innerHTML = `
        <div style="background:white; border-radius:8px; width:450px; max-width:95%; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
            <div style="background:#2c3e50; color:white; padding:15px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center;">
                <h5 style="margin:0;">Édition : ${student.nom} ${student.prenom}</h5>
                <span style="cursor:pointer; font-size:1.5rem;" onclick="closeSimuGradeModal()">×</span>
            </div>
            <div style="padding:20px;">
                <p style="background:#dbeafe; padding:10px; border-radius:5px; font-size:0.9rem;">Saisissez les notes. Laissez vide pour effacer.</p>
                <div style="margin-bottom:15px;">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Note d'Oral (sur 20)</label>
                    <input type="number" id="modal-edit-oral" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;"
                           value="${g.oral !== undefined ? g.oral : ''}" min="0" max="20" step="0.01">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="font-weight:bold; display:block; margin-bottom:5px;">Moyenne Générale (sur 20)</label>
                    <input type="number" id="modal-edit-gen" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;"
                           value="${g.genAvg !== undefined ? g.genAvg : ''}" min="0" max="400" step="0.01">
                </div>
                <div style="text-align:right; display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="closeSimuGradeModal()">Annuler</button>
                    <button class="btn btn-success" onclick="saveSimuGradeModal(${student.id})">💾 Enregistrer</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('modal-edit-oral').focus();
    overlay.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSimuGradeModal();
        if (e.key === 'Enter') saveSimuGradeModal(student.id);
    });
}

function closeSimuGradeModal() {
    const overlay = document.getElementById('simu-modal-overlay');
    if (overlay) overlay.remove();
}

function saveSimuGradeModal(studentId) {
    const student = DB.students.find(s => s.id === studentId);
    if (!student) return;
    const valOral = document.getElementById('modal-edit-oral').value.trim();
    const valGen = document.getElementById('modal-edit-gen').value.trim();
    if (!student.grades) student.grades = {};
    if (valOral === '') delete student.grades.oral;
    else student.grades.oral = parseFloat(valOral);
    if (valGen === '') delete student.grades.genAvg;
    else student.grades.genAvg = parseFloat(valGen);
    if (typeof saveDB === 'function') saveDB();
    closeSimuGradeModal();
    renderSimulation();
}

// --- CALCUL HG/EMC PONDÉRÉ ---
function getNoteHGEMC(student) {
    if (!student.grades) return null;
    const g = student.grades;
    if (DB.config.splitHGEMC) {
        const hg = (g.hg !== null && g.hg !== undefined) ? parseFloat(g.hg) : null;
        const emc = (g.emc !== null && g.emc !== undefined) ? parseFloat(g.emc) : null;
        if (hg === null && emc === null) return null;
        return ((hg || 0) * 1.5 + (emc || 0) * 0.5) / 2;
    }
    return (g.hg !== null && g.hg !== undefined) ? parseFloat(g.hg) : null;
}

function getDetailSciences(student) {
    if (!student.grades) return { average: null, detail: "" };
    const g = student.grades;
    let notes = [], total = 0;
    if (g.svt !== null && g.svt !== undefined) { notes.push(`SVT: ${g.svt}`); total += g.svt; }
    if (g.pc !== null && g.pc !== undefined)  { notes.push(`PC: ${g.pc}`); total += g.pc; }
    if (g.tech !== null && g.tech !== undefined) { notes.push(`Tech: ${g.tech}`); total += g.tech; }
    if (notes.length === 0) return { average: null, detail: "" };
    return { average: total / notes.length, detail: notes.length > 1 ? notes.join(" | ") : "" };
}

function getDetailHGEMC(student) {
    if (!student.grades) return { average: null, detail: "" };
    const g = student.grades;
    if (DB.config.splitHGEMC) {
        const hg = g.hg !== null && g.hg !== undefined ? parseFloat(g.hg) : null;
        const emc = g.emc !== null && g.emc !== undefined ? parseFloat(g.emc) : null;
        if (hg === null && emc === null) return { average: null, detail: "" };
        return { average: ((hg || 0) * 1.5 + (emc || 0) * 0.5) / 2, detail: `HG: ${hg ?? '-'} | EMC: ${emc ?? '-'}` };
    } else {
        return { average: g.hg !== null && g.hg !== undefined ? parseFloat(g.hg) : null, detail: "" };
    }
}

// --- EXPORT PDF STATISTIQUES SALLES ---
function exportRoomStatsPDF() {
    if (!DB.distribution || Object.keys(DB.distribution).length === 0) return alert("Aucune répartition disponible.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    if (typeof addSmartLogo === 'function') addSmartLogo(doc, 10, 10, 35);
    doc.setFontSize(18); doc.text("Récapitulatif des Effectifs par Salle", 60, 20);
    doc.setFontSize(12); doc.text(`Établissement : ${DB.config.schoolName || 'Non défini'}`, 60, 28);
    doc.text(`Session : ${DB.config.year || '2026'}`, 60, 34);
    const tableBody = [];
    let totalGlobal = 0;
    const roomNames = Object.keys(DB.distribution).sort();
    roomNames.forEach(roomName => {
        const students = DB.distribution[roomName];
        if (students.length === 0) return;
        const countTT = students.filter(s => s.tt).length;
        tableBody.push([roomName, students.length - countTT, countTT, students.length]);
        totalGlobal += students.length;
    });
    doc.autoTable({
        startY: 50,
        head: [['Nom de la Salle', 'Élèves Standards', 'Tiers-Temps', 'Total Salle']],
        body: tableBody, theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], halign: 'center' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', fontStyle: 'bold' } },
        foot: [['TOTAL GÉNÉRAL', '', '', totalGlobal]],
        footStyles: { fillColor: [231, 76, 60], halign: 'center' }
    });
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10); doc.text(`Document généré le ${new Date().toLocaleDateString()}`, 14, finalY);
    doc.save("Recapitulatif_Salles_DNB.pdf");
}

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

// --- WIDGET FEEDBACK ---
function toggleFeedback() {
    const box = document.getElementById('feedbackBox');
    const isHidden = (getComputedStyle(box).display === 'none');
    box.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) { setTimeout(() => document.getElementById('fbMessage').focus(), 100); }
}

function checkAttachmentHint() {
    const typeVal = document.getElementById('fbType').value;
    const hint = document.getElementById('pjHint');
    if (hint) hint.style.display = (typeVal === 'BUG') ? 'block' : 'none';
}

function sendFeedbackEmail() {
    const typeSelect = document.getElementById('fbType');
    const typeLabel = typeSelect.options[typeSelect.selectedIndex].text;
    const msg = document.getElementById('fbMessage').value;
    if(!msg.trim()) { alert("Merci de saisir un message avant d'envoyer."); return; }
    const screenRes = `${window.screen.width} x ${window.screen.height}`;
    const windowSize = `${window.innerWidth} x ${window.innerHeight}`;
    const userAgent = navigator.userAgent;
    let schoolName = "Non défini";
    let schoolCity = "Non défini";
    if (typeof DB !== 'undefined' && DB.config) {
        schoolName = DB.config.schoolName || "Nom manquant";
        schoolCity = DB.config.schoolCity || DB.config.city || DB.config.commune || DB.config.ville || "Ville manquante";
    }
    const destEmail = "frederic.vedrenne3@ac-bordeaux.fr";
    const subject = encodeURIComponent(`[Orga DNB] ${typeLabel} - ${schoolCity}`);
    const bodyContent = `Bonjour,\n\n${msg}\n\n` +
        `--------------------------------\nINFOS CONTEXTE (AUTO) :\n` +
        `🏫 Établissement : ${schoolName}\n📍 Ville : ${schoolCity}\n` +
        `🖥️ Résolution : ${screenRes}\n📏 Fenêtre : ${windowSize}\n🌍 Navigateur : ${userAgent}`;
    window.location.href = `mailto:${destEmail}?subject=${subject}&body=${encodeURIComponent(bodyContent)}`;
    toggleFeedback();
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
        if (!roomName) return alert("Veuillez saisir un nom pour le lieu personnalisé.");
    } else if (!roomName) {
        return alert("Veuillez sélectionner un lieu.");
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

// --- ÉTIQUETTES : NOUVELLE INTERFACE (window.openLabelConfig) ---
window.openLabelConfig = function() {
    if (!DB.students || DB.students.length === 0) return alert("Aucun élève dans la base.");

    const styleId = 'label-ui-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .lbl-modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(3px); }
            .lbl-modal { background:white; border-radius:12px; width:900px; max-height:95vh; display:flex; flex-direction:column; font-family:'Segoe UI', sans-serif; box-shadow:0 20px 50px rgba(0,0,0,0.3); overflow:hidden; }
            .lbl-header { background:#2c3e50; color:white; padding:15px; text-align:center; }
            .lbl-body { display:flex; flex:1; overflow:hidden; }
            .lbl-sidebar { width:280px; background:#f8f9fa; border-right:1px solid #ddd; padding:15px; display:flex; flex-direction:column; gap:10px; overflow-y:auto; }
            .lbl-content { flex:1; padding:20px; overflow-y:auto; background:white; }
            .mode-tile { padding:10px; border:2px solid #ddd; border-radius:8px; cursor:pointer; text-align:center; transition:all 0.2s; background:white; margin-bottom:5px; }
            .mode-tile:hover { border-color:#bdc3c7; background:#fdfdfd; }
            .mode-tile.active { border-color:#3498db; background:#ebf5fb; box-shadow:0 0 0 2px rgba(52,152,219,0.2); }
            .mode-tile h4 { margin:0 0 2px 0; color:#2c3e50; font-size:0.95rem; }
            .mode-tile p { margin:0; font-size:0.75rem; color:#7f8c8d; }
            .sort-opt { display:flex; align-items:center; gap:10px; padding:8px; border:1px solid #eee; border-radius:6px; cursor:pointer; margin-bottom:5px; font-size:0.9rem; }
            .sort-opt:hover { background:#f9f9f9; }
            .sort-opt.selected { background:#e8f6f3; border-color:#27ae60; color:#27ae60; font-weight:bold; }
            .zone-config { border:1px dashed #bbb; padding:15px; border-radius:8px; margin-bottom:15px; position:relative; }
            .zone-title { position:absolute; top:-10px; left:15px; background:white; padding:0 5px; font-weight:bold; color:#7f8c8d; font-size:0.8rem; }
            .field-grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:5px; }
            .field-check { display:flex; align-items:center; gap:5px; font-size:0.9rem; cursor:pointer; }
            .btn-action { padding:12px 25px; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1rem; transition:background 0.2s; }
            .btn-cancel { background:#95a5a6; color:white; }
            .btn-print { background:#2ecc71; color:white; }
            .btn-print:hover { background:#27ae60; }
        `;
        document.head.appendChild(style);
    }

    let state = {
        mode: 'DNB', sort: 'room', grouping: 'student',
        custom: { hasCutLine: true, cols: 2, rows: 8, zone1: ['anonymat', 'epreuve', 'salle'], zone2: ['nom', 'classe', 'salle'] }
    };

    const overlay = document.createElement('div');
    overlay.className = 'lbl-modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'lbl-modal';
    modal.innerHTML = `
        <div class="lbl-header"><h2 style="margin:0">🖨️ Impression Étiquettes</h2></div>
        <div class="lbl-body">
            <div class="lbl-sidebar">
                <label style="font-weight:bold; color:#34495e; font-size:0.9rem;">1. Format</label>
                <div class="mode-tile active" id="tile-dnb" onclick="uiSetMode('DNB')">
                    <div style="font-size:1.2rem">🇫🇷</div><h4>Officiel DNB</h4><p>Gauche: Anonymat / Droite: Identité</p>
                </div>
                <div class="mode-tile" id="tile-custom" onclick="uiSetMode('CUSTOM')">
                    <div style="font-size:1.2rem">🎨</div><h4>Personnalisé</h4><p>Mise en page libre</p>
                </div>
                <hr style="width:100%; border:0; border-top:1px solid #ddd; margin:10px 0;">
                <label style="font-weight:bold; color:#34495e; font-size:0.9rem;">2. Ordre de tri</label>
                <div class="sort-opt selected" id="sort-room" onclick="uiSetSort('room')"><span>🏫</span> Par Salle</div>
                <div class="sort-opt" id="sort-class" onclick="uiSetSort('class')"><span>🎓</span> Par Classe</div>
                <div class="sort-opt" id="sort-alpha" onclick="uiSetSort('alpha')"><span>🔤</span> Alphabétique</div>
                <hr style="width:100%; border:0; border-top:1px solid #ddd; margin:10px 0;">
                <label style="font-weight:bold; color:#34495e; font-size:0.9rem;">3. Regroupement</label>
                <div class="mode-tile active" id="grp-student" onclick="uiSetGroup('student')">
                    <h4>👤 Par Élève</h4><p>Toutes les matières de l'élève à la suite.</p>
                </div>
                <div class="mode-tile" id="grp-exam" onclick="uiSetGroup('exam')">
                    <h4>📚 Par Épreuve</h4><p>Toute la salle en Maths, puis en Histoire...</p>
                </div>
            </div>
            <div class="lbl-content" id="config-panel"></div>
        </div>
        <div style="padding:15px; background:#f1f2f6; text-align:right; border-top:1px solid #ddd; display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn-action btn-cancel" id="btn-close">Annuler</button>
            <button class="btn-action btn-print" id="btn-generate">Lancer l'impression PDF 🖨️</button>
        </div>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    window.uiSetMode = (m) => {
        state.mode = m;
        document.getElementById('tile-dnb').classList.toggle('active', m === 'DNB');
        document.getElementById('tile-custom').classList.toggle('active', m === 'CUSTOM');
        renderLabelConfigPanel();
    };
    window.uiSetSort = (s) => {
        state.sort = s;
        ['room','class','alpha'].forEach(k => document.getElementById('sort-'+k).classList.toggle('selected', s === k));
    };
    window.uiSetGroup = (g) => {
        state.grouping = g;
        document.getElementById('grp-student').classList.toggle('active', g === 'student');
        document.getElementById('grp-exam').classList.toggle('active', g === 'exam');
    };
    window.uiToggleField = (zone, field) => {
        const arr = state.custom[zone];
        const idx = arr.indexOf(field);
        if (idx > -1) arr.splice(idx, 1); else arr.push(field);
    };
    window.uiRenderFields = (zone) => {
        const fields = [
            {id:'nom', label:'Nom Prénom'}, {id:'classe', label:'Classe'}, {id:'ddn', label:'Date Naissance'},
            {id:'salle', label:'Salle'}, {id:'anonymat', label:'N° Anonymat'}, {id:'epreuve', label:'Épreuve'}, {id:'amenagement', label:'Label Aménagement'}
        ];
        let html = `<div class="field-grid">`;
        fields.forEach(f => {
            const isChecked = state.custom[zone].includes(f.id) ? 'checked' : '';
            html += `<label class="field-check"><input type="checkbox" ${isChecked} onchange="uiToggleField('${zone}', '${f.id}')"> ${f.label}</label>`;
        });
        html += `</div>`;
        return html;
    };

    function renderLabelConfigPanel() {
        const p = document.getElementById('config-panel');
        if (state.mode === 'DNB') {
            p.innerHTML = `<div style="text-align:center; color:#7f8c8d; margin-top:50px;">
                <h3>Configuration DNB</h3><p>Standardisé : Anonymat + Salle (Gauche) / Identité (Droite)</p>
                <div style="margin-top:20px; font-size:0.9rem; background:#eee; padding:10px; border-radius:5px; display:inline-block;">Trait de coupe vertical inclus</div>
            </div>`;
        } else {
            p.innerHTML = `<h3 style="margin-top:0;">⚙️ Personnalisation</h3>
                <div style="display:flex; gap:20px; margin-bottom:20px;">
                    <div><label>Colonnes</label><br><input type="number" value="${state.custom.cols}" min="1" max="5" style="width:60px;" onchange="state.custom.cols=this.value"></div>
                    <div><label>Lignes</label><br><input type="number" value="${state.custom.rows}" min="1" max="20" style="width:60px;" onchange="state.custom.rows=this.value"></div>
                    <div style="flex:1; display:flex; align-items:end;"><label style="cursor:pointer; font-weight:bold; color:#e74c3c;">
                        <input type="checkbox" id="chk-cut" ${state.custom.hasCutLine ? 'checked' : ''}> ✂️ Trait de coupe vertical</label></div>
                </div>
                <div class="zone-config" style="background:#fff3e0;"><span class="zone-title">ZONE 1 (Gauche)</span>${window.uiRenderFields('zone1')}</div>
                <div class="zone-config" style="background:#e8f6f3;"><span class="zone-title">ZONE 2 (Droite)</span>${window.uiRenderFields('zone2')}</div>`;
        }
    }

    document.getElementById('btn-close').onclick = () => {
        document.body.removeChild(overlay);
        delete window.uiSetMode; delete window.uiSetSort; delete window.uiToggleField; delete window.uiSetGroup;
    };
    document.getElementById('btn-generate').onclick = () => {
        const chk = document.getElementById('chk-cut');
        if (chk) state.custom.hasCutLine = chk.checked;
        const finalState = JSON.parse(JSON.stringify(state));
        document.body.removeChild(overlay);
        setTimeout(() => window.generateLabelsEngine(finalState), 100);
    };

    renderLabelConfigPanel();
};

// --- MOTEUR GÉNÉRATION ÉTIQUETTES PDF ---
window.generateLabelsEngine = function(params) {
    if (window.syncDistributionData) window.syncDistributionData();
    if (!window.jspdf) return alert("Erreur : La librairie jsPDF n'est pas chargée.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setProperties({ title: "Etiquettes_DNB.pdf" });

    const items = [];
    const createLabelData = (s, r, e) => ({ student: s, room: r, exam: e, type: 'label' });
    const grouping = params.grouping || 'student';

    if (grouping === 'student') {
        if (params.sort === 'room' && DB.distribution) {
            const rooms = Object.keys(DB.distribution).sort();
            rooms.forEach(r => {
                if (r === "Zone Tampon") return;
                DB.distribution[r].sort((a,b) => a.nom.localeCompare(b.nom)).forEach(s => {
                    DB.exams.forEach(ex => items.push(createLabelData(s, r, ex.name)));
                });
                items.push({ type: 'BREAK' });
            });
        } else {
            let sorted = params.sort === 'class'
                ? [...DB.students].sort((a,b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom))
                : [...DB.students].sort((a,b) => a.nom.localeCompare(b.nom));
            sorted.forEach(s => {
                let room = "---";
                if (DB.distribution) { for (const [rName, list] of Object.entries(DB.distribution)) { if (list.some(st => st.nom === s.nom && st.prenom === s.prenom)) { room = rName; break; } } }
                DB.exams.forEach(ex => items.push(createLabelData(s, room, ex.name)));
            });
        }
    } else if (grouping === 'exam') {
        DB.exams.forEach(exam => {
            if (params.sort === 'room' && DB.distribution) {
                Object.keys(DB.distribution).sort().forEach(r => {
                    if (r === "Zone Tampon") return;
                    DB.distribution[r].sort((a,b) => a.nom.localeCompare(b.nom)).forEach(s => items.push(createLabelData(s, r, exam.name)));
                    items.push({ type: 'BREAK' });
                });
            } else {
                let sorted = params.sort === 'class'
                    ? [...DB.students].sort((a,b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom))
                    : [...DB.students].sort((a,b) => a.nom.localeCompare(b.nom));
                sorted.forEach(s => {
                    let room = "---";
                    if (DB.distribution) { for (const [rName, list] of Object.entries(DB.distribution)) { if (list.some(st => st.nom === s.nom && st.prenom === s.prenom)) { room = rName; break; } } }
                    items.push(createLabelData(s, room, exam.name));
                });
            }
            items.push({ type: 'BREAK' });
        });
    }

    if (items.length === 0) return alert("Rien à générer.");

    let nbCols = 2, nbRows = 8;
    if (params.mode === 'CUSTOM') { nbCols = parseInt(params.custom.cols) || 2; nbRows = parseInt(params.custom.rows) || 8; }

    const m = 10, pageW = 210, pageH = 297;
    const boxW = (pageW - (2 * m)) / nbCols;
    const boxH = (pageH - (2 * m)) / nbRows;
    const perPage = nbCols * nbRows;
    let idxPage = 0;

    while(items.length > 0 && items[items.length-1].type === 'BREAK') items.pop();

    items.forEach((item) => {
        if (item.type === 'BREAK') {
            const remainder = idxPage % perPage;
            if (remainder !== 0) idxPage += (perPage - remainder);
            return;
        }
        if (idxPage === 0 || idxPage % perPage === 0) {
            if (idxPage > 0) doc.addPage();
            doc.setDrawColor(200); doc.setLineWidth(0.1);
            doc.line(m-2, m, m, m); doc.line(pageW-m, m, pageW-m+2, m);
            doc.line(m-2, pageH-m, m, pageH-m); doc.line(pageW-m, pageH-m, pageW-m+2, pageH-m);
        }

        const col = idxPage % nbCols;
        const row = Math.floor((idxPage % perPage) / nbCols);
        const x = m + (col * boxW);
        const y = m + (row * boxH);
        const cutX = x + (boxW * 0.5);
        const s = item.student;

        doc.setDrawColor(230); doc.setLineWidth(0.1); doc.rect(x, y, boxW, boxH);
        if (s.tiersTemps || s.tt || (s.labels && s.labels.length > 0)) {
            doc.setFillColor(231, 76, 60); doc.circle(x + boxW - 4, y + 4, 1.5, 'F');
        }

        if (params.mode === 'DNB') {
            doc.setDrawColor(0); doc.setLineWidth(0.2); doc.setLineDash([2, 2], 0);
            doc.line(cutX, y, cutX, y + boxH); doc.setLineDash([]);
            doc.setFontSize(10); doc.setTextColor(150); doc.text("✂", cutX - 1.5, y + boxH - 1);
            const centerXLeft = x + (boxW * 0.25);
            const centerY = y + (boxH / 2);
            doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
            doc.text(s.anonymat || "---", centerXLeft, centerY - 3, {align:'center'});
            doc.setFont("helvetica", "bold"); doc.setFontSize(9);
            doc.text(`Salle : ${item.room}`, centerXLeft, centerY + 2, {align:'center'});
            doc.setFont("helvetica", "normal"); doc.setFontSize(8);
            doc.text(item.exam || "", centerXLeft, y + boxH - 4, {align:'center', maxWidth:(boxW*0.45)});
            const mx = cutX + 3;
            doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
            doc.text(`${s.nom}`.toUpperCase(), mx, y + 7);
            doc.setFont("helvetica", "normal"); doc.text(`${s.prenom}`, mx, y + 12);
            doc.setFontSize(9); doc.text(`Classe: ${s.classe}`, mx, y + 17);
            doc.setFontSize(8); doc.setFont("helvetica", "oblique");
            let examText = item.exam || "";
            if(examText.length > 22) examText = examText.substring(0, 22) + "...";
            doc.text(examText, mx, y + 23);
            doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text(`${s.anonymat || '---'}`, mx, y + boxH - 4);
        } else {
            const cfg = params.custom || {};
            const showCutLine = (cfg.hasCutLine === true);
            if (showCutLine) {
                doc.setDrawColor(0); doc.setLineWidth(0.2); doc.setLineDash([2, 2], 0);
                doc.line(cutX, y, cutX, y + boxH); doc.setLineDash([]);
                doc.setFontSize(10); doc.setTextColor(150); doc.text("✂", cutX - 1.5, y + boxH - 1);
            }
            const drawFields = (list, dx, dy, w) => {
                if (!list) return;
                let cy = dy + 6;
                doc.setTextColor(0);
                list.forEach(f => {
                    let txt="", isBold=false, size=9;
                    if (f==='nom') { txt=`${s.nom} ${s.prenom}`; isBold=true; size=10; }
                    else if (f==='classe') txt=`Classe: ${s.classe}`;
                    else if (f==='ddn') { txt=`Né(e): ${s.ddn||'--'}`; size=8; }
                    else if (f==='salle') { txt=`Salle: ${item.room}`; isBold=true; }
                    else if (f==='anonymat') { txt=s.anonymat||"---"; isBold=true; size=12; }
                    else if (f==='epreuve') { txt=item.exam||""; size=8; doc.setTextColor(100); }
                    if(!txt) return;
                    doc.setFontSize(size); doc.setFont("helvetica", isBold?"bold":"normal");
                    doc.setTextColor(0);
                    doc.text(txt, dx+2, cy, {maxWidth:w-2});
                    cy += (size/3)+3;
                });
            };
            drawFields(cfg.zone1, x, y, boxW*0.5);
            drawFields(cfg.zone2, showCutLine ? cutX+1 : x+(boxW*0.5), y, boxW*0.5-1);
        }
        idxPage++;
    });

    doc.save(`Etiquettes_Copies_${params.mode}.pdf`);
};

// --- TABLEAU DES ÉPREUVES : NOUVELLE VERSION (add/remove) ---
window.renderExamTable = function() {
    const tbody = document.getElementById('examTable');
    if(!tbody) return;
    tbody.innerHTML = '';

    DB.exams.forEach((e, i) => {
        const hasSlots = e.slots && (e.slots.std.length > 1 || e.slots.tt.length > 1);
        const btnStyle = hasSlots ? "background:#27ae60; color:white;" : "background:#95a5a6; color:white;";
        const btnText = hasSlots ? "✅ Découpé" : "✂️ Découper";
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
        <td style="vertical-align:top; color:var(--tt-color)"><input type="number" value="${e.durTT}" style="width:70px; text-align:center" onchange="updateExam(${i},'durTT',this.value)"></td>`;
        tbody.appendChild(row);
    });

    const addRow = document.createElement('tr');
    addRow.innerHTML = `<td colspan="6" style="text-align:center; background-color:#f8f9fa; padding:10px;">
        <button class="btn btn-success" onclick="addExam()" style="border-style:dashed;">➕ Ajouter une épreuve</button>
    </td>`;
    tbody.appendChild(addRow);
};

window.addExam = function() {
    let defaultDate = DB.exams.length > 0 ? DB.exams[DB.exams.length-1].date : "2026-06-01";
    DB.exams.push({ name: "Nouvelle Épreuve", date: defaultDate, time: "09:00", timeTT: "09:00", durStd: 60, durTT: 80, slots: { std: [], tt: [] } });
    window.renderExamTable();
    if(typeof autoSave === 'function') autoSave();
};

window.removeExam = function(index) {
    const examName = DB.exams[index].name;
    if(confirm(`⚠️ Supprimer l'épreuve "${examName}" ?\n\nAttention : Les données de planning associées peuvent être décalées.`)) {
        DB.exams.splice(index, 1);
        Object.keys(DB.planning).forEach(key => { if(key.startsWith(index + "_")) delete DB.planning[key]; });
        window.renderExamTable();
        if(typeof autoSave === 'function') autoSave();
    }
};
