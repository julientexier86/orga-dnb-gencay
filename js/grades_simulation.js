// === MODULE: grades_simulation ===
// Contient : renderGrades, renderSimulation, sortGrades, filterSimulation,
//            openReleveOptions, validateConvocOptions, exportRelevesNotes

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
    if (DB.students.length === 0) return showToast("Aucun élève dans la base.", 'error');

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

