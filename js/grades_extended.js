// === MODULE: grades_extended ===
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
    if (!DB.distribution || Object.keys(DB.distribution).length === 0) return showToast("Aucune répartition disponible.", 'warning');
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

