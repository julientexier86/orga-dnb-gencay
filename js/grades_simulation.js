// === MODULE: grades_simulation ===
// Contient : renderGrades, renderSimulation, sortGrades, filterSimulation,
//            openReleveOptions, validateConvocOptions, exportRelevesNotes

// Helper : retourne un nombre valide ou null
function validNum(v) { if (v == null || v === "") return null; const n = parseFloat(v); return isNaN(n) ? null : n; }

// Les relevés de notes sont volontairement basés uniquement sur la base
// pédagogique du DNB blanc. Les résultats Cyclades vivent dans DB.officialResults.
function getBlankGradeStudents() {
    return (DB.students || []).filter(student => student && student.grades);
}

function renderGrades() {
    const tbody = document.querySelector('#tableGradesPreview tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const activeSciences = DB.config.scienceSubjects || ['SVT', 'PC', 'TECH'];
    const searchInput = document.getElementById('searchGradesInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let displayList = DB.students.map(s => {
        if (!s.grades) return null;
        if (searchTerm && !(s.nom || '').toLowerCase().includes(searchTerm) && !(s.prenom || '').toLowerCase().includes(searchTerm)) return null;
        let sumSci = 0, countSci = 0;
        let v;
        if (activeSciences.includes('SVT') && (v = validNum(s.grades.svt)) !== null) { sumSci += v; countSci++; }
        if (activeSciences.includes('PC') && (v = validNum(s.grades.pc)) !== null) { sumSci += v; countSci++; }
        if (activeSciences.includes('TECH') && (v = validNum(s.grades.tech)) !== null) { sumSci += v; countSci++; }
        const moySci = countSci > 0 ? (sumSci / countSci) : null;
        let sumGen = 0, countGen = 0;
        if ((v = validNum(s.grades.fr)) !== null) { sumGen += v; countGen++; }
        if ((v = validNum(s.grades.math)) !== null) { sumGen += v; countGen++; }
        // HG/EMC : utilise getDetailHGEMC si disponible
        if (typeof getDetailHGEMC === 'function') {
            const resHG = getDetailHGEMC(s);
            if (resHG.average !== null && !isNaN(resHG.average)) { sumGen += resHG.average; countGen++; }
        } else {
            if ((v = validNum(s.grades.hg)) !== null) { sumGen += v; countGen++; }
        }
        if (moySci !== null) { sumGen += moySci; countGen++; }
        const moyDNB = countGen > 0 ? (sumGen / countGen) : null;
        return { ...s, moySciVal: moySci, moyDNBVal: moyDNB };
    }).filter(s => s !== null);
    const k = gradeSortState.key; const o = gradeSortState.order === 'asc' ? 1 : -1;
    displayList.sort((a, b) => { let valA, valB; if (k === 'nom') { valA = a.nom; valB = b.nom; } else if (k === 'moyDNB') { valA = a.moyDNBVal || -1; valB = b.moyDNBVal || -1; } else { valA = a.grades[k] || -1; valB = b.grades[k] || -1; } if (valA < valB) return -1 * o; if (valA > valB) return 1 * o; return 0; });
    const totalCount = displayList.length;
    if (!searchTerm && displayList.length > 30) { displayList = displayList.slice(0, 30); document.getElementById('gradeCountLabel').innerText = `Affichage: 30 / ${totalCount} élèves (Utilisez la recherche pour tout voir)`; } else { document.getElementById('gradeCountLabel').innerText = `${totalCount} élèves affichés`; }
    displayList.forEach(s => { const ms = s.moySciVal !== null ? s.moySciVal.toFixed(2) : "-"; const md = s.moyDNBVal !== null ? s.moyDNBVal.toFixed(2) : "-"; tbody.innerHTML += `<tr><td>${s.nom} ${s.prenom}</td><td>${s.classe || ""}</td><td style="background:#eef3f0; font-weight:bold; color:#145a32;">${md}</td><td>${s.grades.fr || "-"}</td><td>${s.grades.math || "-"}</td><td>${s.grades.hg || "-"}</td><td>${s.grades.svt || "-"}</td><td>${s.grades.pc || "-"}</td><td>${s.grades.tech || "-"}</td><td style="background:#eef2f0; font-weight:bold;">${ms}</td></tr>`; });
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
        let sumSci = 0, countSci = 0, vv;
        if (activeSciences.includes('SVT') && (vv = validNum(s.grades.svt)) !== null) { sumSci += vv; countSci++; }
        if (activeSciences.includes('PC') && (vv = validNum(s.grades.pc)) !== null) { sumSci += vv; countSci++; }
        if (activeSciences.includes('TECH') && (vv = validNum(s.grades.tech)) !== null) { sumSci += vv; countSci++; }
        const moySci = countSci > 0 ? (sumSci / countSci) : null;

        // 2. Calcul Somme Écrits (avec HG/EMC pondéré si séparé)
        let sumEcrit = 0, countEcrit = 0;
        if ((vv = validNum(s.grades.fr)) !== null) { sumEcrit += vv; countEcrit++; }
        if ((vv = validNum(s.grades.math)) !== null) { sumEcrit += vv; countEcrit++; }
        // HG/EMC : utilise getDetailHGEMC si disponible (gère le mode séparé HG+EMC)
        if (typeof getDetailHGEMC === 'function') {
            const resHG = getDetailHGEMC(s);
            if (resHG.average !== null && !isNaN(resHG.average)) { sumEcrit += resHG.average; countEcrit++; }
        } else {
            if ((vv = validNum(s.grades.hg)) !== null) { sumEcrit += vv; countEcrit++; }
        }
        if (moySci !== null) { sumEcrit += moySci; countEcrit++; }

        const moyEcritsVal = countEcrit > 0 ? (sumEcrit / countEcrit) : 0;

        // 3. Calcul Moyenne Épreuves (Écrits + Oral)
        let sumEpreuves = sumEcrit;
        let countEpreuves = countEcrit;

        if ((vv = validNum(s.grades.oral)) !== null) {
            sumEpreuves += vv;
            countEpreuves++;
        }
        const moyEpreuves = countEpreuves > 0 ? (sumEpreuves / countEpreuves) : 0;

        // 4. Calcul Moyenne DNB (60% Épreuves / 40% Contrôle Continu)
        const moyGen = validNum(s.grades.genAvg) || 0;
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
        let color = "#9a4a2e";
        if (s.finalAvg >= 10) color = "#2f6f5e";
        if (s.finalAvg >= 12) color = "#9a7a2e";
        if (s.finalAvg >= 14) color = "#1f3a5c";
        if (s.finalAvg >= 16) color = "#6b4a72";
        if (s.finalAvg >= 18) color = "#7a5f22";

        tbody.innerHTML += `<tr>
                <td>${s.nom} ${s.prenom}</td>
                <td>${s.classe || ""}</td>
                <td style="text-align:center">${s.moyEcritsVal.toFixed(2)}</td>
                <td style="text-align:center">${s.grades.oral !== undefined && s.grades.oral !== null ? s.grades.oral : "-"}</td>
                <td style="text-align:center; font-weight:bold; color:#4b5254;">${s.moyEpreuves.toFixed(2)}</td>
                <td style="text-align:center">${s.grades.genAvg !== undefined && s.grades.genAvg !== null ? s.grades.genAvg : "-"}</td>
                <td style="background:#eef2f0; text-align:center; font-weight:bold; font-size:1.1em;">${s.finalAvg.toFixed(2)} / 20</td>
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
    if (getBlankGradeStudents().length === 0) return showToast("Aucun élève avec des notes de DNB blanc dans la base.", 'error');

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
    modal.innerHTML = `<h3 style="color:#1f3a5c; margin-top:0;">📊 Imprimer les Relevés de Notes</h3>`;

    // Conteneur des Boutons
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex', gap: '20px', marginTop: '25px', justifyContent: 'center'
    });

    // Fonction utilitaire pour créer une carte visuelle
    function createCard(emoji, title, desc, color, sortMode) {
        const card = document.createElement('div');
        Object.assign(card.style, {
            flex: '1', padding: '20px', border: '2px solid #ece9e0', borderRadius: '10px',
            cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#faf9f6'
        });

        card.innerHTML = `
                <div style="font-size:40px; margin-bottom:10px;">${emoji}</div>
                <div style="font-weight:bold; color:${color}; font-size:16px;">${title}</div>
                <div style="font-size:12px; color:#656d70; margin-top:5px;">${desc}</div>
            `;

        // Effet de survol
        card.onmouseenter = () => {
            card.style.borderColor = color;
            card.style.backgroundColor = 'white';
            card.style.transform = 'translateY(-3px)';
            card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        };
        card.onmouseleave = () => {
            card.style.borderColor = '#ece9e0';
            card.style.backgroundColor = '#faf9f6';
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
        "#2f6f5e",
        "class"
    );

    // Option B : Alphabétique (Bleu)
    const btnAlpha = createCard(
        "🌍",
        "Alphabétique",
        "Trié de A à Z (Tout le collège mélangé)",
        "#1f3a5c",
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
        marginTop: "25px", color: "#9aa0a2", cursor: "pointer",
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

// 4. RELEVÉS DE NOTES (Complet avec Oral + Contrôle Continu)
window.exportRelevesNotes = function (sortMode, targetId) {
    DB.config.schoolName = document.getElementById('schoolName').value;
    DB.config.year = document.getElementById('sessionYear').value;
    const activeSciences = DB.config.scienceSubjects || ['SVT', 'PC', 'TECH'];
    const examTitle = "DNB blanc";
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let count = 0;

    const blankStudents = getBlankGradeStudents();
    let studentsToPrint = [];
    if (targetId && targetId !== 'all') {
        studentsToPrint = blankStudents.filter(s => s.id == targetId);
    } else {
        studentsToPrint = [...blankStudents];
    }

    studentsToPrint.sort((a, b) => {
        if (sortMode === 'class') {
            if ((a.classe || "") < (b.classe || "")) return -1;
            if ((a.classe || "") > (b.classe || "")) return 1;
        }
        return (a.nom || "").localeCompare(b.nom || "");
    });

    studentsToPrint.forEach((student) => {
        if (!student.grades) student.grades = {};
        if (count > 0) doc.addPage(); count++;

        // --- EN-TÊTE ---
        if (typeof addSmartLogo === 'function') addSmartLogo(doc, 15, 10, 45);

        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(examTitle, 195, 15, { align: 'right' });
        doc.text(`Session ${DB.config.year}`, 195, 20, { align: 'right' });

        doc.setFontSize(14); doc.setTextColor(44, 62, 80); doc.setFont("helvetica", "bold");
        doc.text(DB.config.schoolName || "Collège", 105, 22, { align: 'center' });
        doc.setFontSize(18); doc.setTextColor(0); doc.text("RELEVÉ DE NOTES", 105, 38, { align: 'center' });

        // --- BLOC CANDIDAT ---
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.rect(15, 48, 180, 18);
        doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text(`Candidat(e) : ${student.nom.toUpperCase()} ${student.prenom}`, 20, 59);
        doc.text(`Classe : ${student.classe || "N/C"}`, 155, 59);

        // --- CALCULS ---
        const parse = (v) => { let n = parseFloat(v); return isNaN(n) ? null : n; };

        const nFR = parse(student.grades.fr);
        const nMA = parse(student.grades.math);

        // HG-EMC avec détail
        let nHG = null, detailHG = "HG: - | EMC: -";
        if (typeof getDetailHGEMC === "function") {
            const resHG = getDetailHGEMC(student);
            nHG = parse(resHG.average);
            detailHG = (resHG.detail || "").replace(/NaN/g, "-");
        } else {
            nHG = parse(student.grades.hg);
        }

        // Sciences
        let sSum = 0, sCount = 0, detSci = [];
        if (activeSciences.includes('SVT')) { let v = parse(student.grades.svt); if (v !== null) { sSum += v; sCount++; detSci.push("SVT: " + v.toFixed(1)); } else { detSci.push("SVT: -"); } }
        if (activeSciences.includes('PC')) { let v = parse(student.grades.pc); if (v !== null) { sSum += v; sCount++; detSci.push("PC: " + v.toFixed(1)); } else { detSci.push("PC: -"); } }
        if (activeSciences.includes('TECH')) { let v = parse(student.grades.tech); if (v !== null) { sSum += v; sCount++; detSci.push("Tech: " + v.toFixed(1)); } else { detSci.push("Tech: -"); } }
        const nSCI = sCount > 0 ? (sSum / sCount) : null;

        // Oral
        const nOral = parse(student.grades.oral);

        const getNote = (v) => v !== null ? v.toFixed(1) + " / 20" : "Abs";

        // --- TABLEAU ÉPREUVES ÉCRITES ---
        const bodyEcrits = [
            ["Français", getNote(nFR), "Épreuve unique"],
            ["Mathématiques", getNote(nMA), "Épreuve unique"],
            ["Hist-Géo / EMC", getNote(nHG), detailHG],
            ["Sciences", getNote(nSCI), detSci.join(' | ')]
        ];

        doc.autoTable({
            startY: 75,
            head: [['Épreuves Écrites', 'Note / 20', 'Détails']],
            body: bodyEcrits,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], halign: 'center' },
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: { 1: { halign: 'center', fontStyle: 'bold', cellWidth: 30 } }
        });

        let yPos = doc.lastAutoTable.finalY + 3;

        // --- ÉPREUVE ORALE ---
        doc.autoTable({
            startY: yPos,
            head: [['Épreuve Orale', 'Note / 20', '']],
            body: [["Oral de soutenance", getNote(nOral), ""]],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], halign: 'center' },
            styles: { fontSize: 10, cellPadding: 4 },
            columnStyles: { 1: { halign: 'center', fontStyle: 'bold', cellWidth: 30 } }
        });

        yPos = doc.lastAutoTable.finalY + 8;

        // --- MOYENNE DES ÉPREUVES ---
        const notesEpreuves = [nFR, nMA, nHG, nSCI, nOral].filter(v => v !== null);
        const moyEpreuves = notesEpreuves.length > 0 ? (notesEpreuves.reduce((a, b) => a + b, 0) / notesEpreuves.length) : null;

        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(44, 62, 80);
        doc.text(`Moyenne des épreuves : ${moyEpreuves !== null ? moyEpreuves.toFixed(2) + " / 20" : "-"}`, 105, yPos, { align: 'center' });

        yPos += 10;

        // --- CONTRÔLE CONTINU (SIMULATION) ---
        const moyGenAvg = parse(student.grades.genAvg);

        if (moyGenAvg !== null) {
            doc.autoTable({
                startY: yPos,
                head: [['Contrôle Continu (Simulation)', 'Note / 20']],
                body: [["Moyenne générale annuelle", moyGenAvg.toFixed(1) + " / 20"]],
                theme: 'grid',
                headStyles: { fillColor: [142, 68, 173], halign: 'center' },
                styles: { fontSize: 10, cellPadding: 4 },
                columnStyles: { 1: { halign: 'center', fontStyle: 'bold', cellWidth: 35 } }
            });

            yPos = doc.lastAutoTable.finalY + 8;

            // --- NOTE FINALE SIMULÉE ---
            let finalAvg = 0;
            if (moyGenAvg > 0 && moyEpreuves !== null && moyEpreuves > 0) {
                finalAvg = (moyGenAvg * 0.4) + (moyEpreuves * 0.6);
            } else if (moyEpreuves !== null) {
                finalAvg = moyEpreuves;
            } else if (moyGenAvg > 0) {
                finalAvg = moyGenAvg;
            }

            let mention = "";
            if (finalAvg >= 18) mention = "Très Bien (Félicitations)";
            else if (finalAvg >= 16) mention = "Très Bien";
            else if (finalAvg >= 14) mention = "Bien";
            else if (finalAvg >= 12) mention = "Assez Bien";
            else if (finalAvg >= 10) mention = "Admis";
            else mention = "Non admis";

            doc.setFillColor(240, 248, 255); doc.setDrawColor(41, 128, 185); doc.setLineWidth(0.5);
            doc.rect(30, yPos, 150, 18, 'FD');
            doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text(`NOTE FINALE SIMULÉE : ${finalAvg.toFixed(2)} / 20`, 105, yPos + 8, { align: 'center' });
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text(`Mention estimée : ${mention}  (60% épreuves + 40% contrôle continu)`, 105, yPos + 15, { align: 'center' });

            yPos += 25;
        } else {
            // Pas de contrôle continu : juste afficher la moyenne épreuves en gras
            doc.setFillColor(240, 248, 255); doc.setDrawColor(41, 128, 185); doc.setLineWidth(0.5);
            doc.rect(30, yPos, 150, 12, 'FD');
            doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
            doc.text(`MOYENNE GÉNÉRALE : ${moyEpreuves !== null ? moyEpreuves.toFixed(2) + " / 20" : "-"}`, 105, yPos + 8, { align: 'center' });
            yPos += 20;
        }

        // --- SIGNATURE ---
        if (yPos > 245) { doc.addPage(); yPos = 40; }
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0);
        doc.text(`Fait à ${DB.config.city || ""}, le ${new Date().toLocaleDateString()}`, 130, yPos);
        yPos += 8;
        doc.setFont("helvetica", "bold");
        doc.text(DB.config.director?.civ || "Le Principal", 130, yPos);
        doc.text(DB.config.director?.name || "", 130, yPos + 5);

        if (DB.config.signature) {
            try { doc.addImage(DB.config.signature, 'PNG', 130, yPos + 10, 45, 20, undefined, 'FAST'); } catch (e) { }
        }
    });

    const yearSuffix = DB.config.year || "";
    doc.save(`Releves_Notes_${examTitle.replace(/\s+/g, '')}_${yearSuffix}.pdf`);
};

// 5. POCHETTES DE CLASSE POUR RELEVÉS DE NOTES (A3 paysage)
window.exportFolderCoversNotes = function () {
    const blankStudents = getBlankGradeStudents();
    if (blankStudents.length === 0) return showToast("Veuillez d'abord charger les élèves et leurs notes de DNB blanc.", "error");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a3');
    const examTitle = "DNB blanc";

    const classes = [...new Set(blankStudents.map(s => s.classe))].sort();
    const year = DB.config.year || "";
    const schoolName = DB.config.schoolName || "Établissement";

    const HALF_W = 210;
    const M = 15;

    classes.forEach((className, idx) => {
        if (idx > 0) doc.addPage("a3", "l");

        // --- RECTO (DROITE) : COUVERTURE ---
        const covX = HALF_W + M;
        const covW = HALF_W - (2 * M);
        const covCenterX = covX + (covW / 2);

        if (typeof addSmartLogo === "function") addSmartLogo(doc, covX, 15, 45);
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text(schoolName, covX + 65, 25);

        doc.setFontSize(28); doc.setTextColor(44, 62, 80);
        doc.text("RELEVÉS DE NOTES", covCenterX, 95, { align: 'center' });
        doc.setFontSize(20);
        doc.text(`${examTitle} - SESSION ${year}`, covCenterX, 110, { align: 'center' });

        doc.setDrawColor(44, 62, 80); doc.setLineWidth(1.5);
        doc.rect(covX + 35, 135, covW - 70, 55);
        doc.setFontSize(75);
        doc.text(className, covCenterX, 178, { align: 'center' });

        // Effectif de la classe
        const effectif = blankStudents.filter(s => s.classe === className).length;
        doc.setFontSize(14); doc.setTextColor(100); doc.setFont("helvetica", "normal");
        doc.text(`${effectif} élèves`, covCenterX, 200, { align: 'center' });

        // Ligne de pliure centrale
        doc.setDrawColor(220); doc.setLineDash([5, 5], 0);
        doc.line(HALF_W, 0, HALF_W, 297); doc.setLineDash([]);
    });

    doc.save(`Pochettes_Releves_Notes_${year}.pdf`);
};
