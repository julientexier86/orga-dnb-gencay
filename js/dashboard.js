// === MODULE: dashboard ===
function getDistributionEntries() {
    const entries = [];
    if (!DB || !DB.distribution) return entries;

    Object.entries(DB.distribution).forEach(([roomName, students]) => {
        (students || []).forEach(student => {
            entries.push({ roomName, student });
        });
    });
    return entries;
}

function getStudentRoom(studentId) {
    const id = normalizeStudentId(studentId);
    const match = getDistributionEntries().find(entry => normalizeStudentId(entry.student.id) === id);
    return match ? match.roomName : "";
}

function getPlanningAssignments() {
    if (!DB || !DB.planning) return [];
    return Object.entries(DB.planning)
        .filter(([, teacher]) => teacher)
        .map(([key, teacher]) => {
            const parts = key.split('_');
            const examIdx = parseInt(parts[0], 10);
            const exam = DB.exams && DB.exams[examIdx] ? DB.exams[examIdx] : null;
            return {
                key,
                teacher,
                examIdx,
                exam,
                room: parts[1] || "",
                type: parts[2] || "",
                slotIdx: parseInt(parts[3], 10) || 0
            };
        });
}

function getDashboardStatus() {
    const issues = [];
    const students = DB.students || [];
    const rooms = DB.rooms || [];
    const teachers = DB.teachers || [];
    const distributionEntries = getDistributionEntries();
    const assignedStudentIds = new Set(distributionEntries.map(entry => normalizeStudentId(entry.student.id)));
    const bufferCount = (DB.distribution && DB.distribution["Zone Tampon"] || []).length;

    const pushIssue = (severity, title, detail, action) => {
        issues.push({ severity, title, detail, action });
    };

    if (students.length === 0) pushIssue('error', 'Aucun élève importé', 'Importez ou ajoutez les élèves avant de préparer les salles et convocations.', 'Données > Élèves');
    if (rooms.length === 0) pushIssue('error', 'Aucune salle configurée', 'La répartition ne peut pas être validée sans salle.', 'Données > Salles');
    if (teachers.length === 0) pushIssue('warning', 'Aucun professeur configuré', 'Le planning de surveillance et les convocations professeurs seront incomplets.', 'Données > Professeurs');

    const unassigned = students.filter(s => !assignedStudentIds.has(normalizeStudentId(s.id)));
    if (students.length > 0 && Object.keys(DB.distribution || {}).length === 0) {
        pushIssue('warning', 'Répartition non lancée', 'Aucun élève n’est encore placé dans une salle.', 'Répartition');
    } else if (unassigned.length > 0) {
        pushIssue('error', `${unassigned.length} élève(s) sans salle`, unassigned.slice(0, 8).map(s => `${s.nom} ${s.prenom}`).join(', '), 'Répartition');
    }
    if (bufferCount > 0) {
        pushIssue('error', `${bufferCount} élève(s) en Zone Tampon`, 'Ces élèves n’ont pas trouvé de salle compatible ou disponible.', 'Répartition');
    }

    rooms.forEach(room => {
        const count = (DB.distribution && DB.distribution[room.nom] || []).length;
        const capacity = parseInt(room.capacite, 10) || 0;
        if (capacity > 0 && count > capacity) {
            pushIssue('error', `Salle ${room.nom} en surcharge`, `${count} élève(s) pour ${capacity} place(s).`, 'Répartition');
        }
    });

    distributionEntries.forEach(({ roomName, student }) => {
        if (roomName === "Zone Tampon") return;
        const room = rooms.find(r => r.nom === roomName);
        if (!room) return;
        const labels = student.labels || [];
        const hasAmen = labels.some(label => label !== 'TTEMPS');
        if (student.tt && !room.isTT) {
            pushIssue('warning', `${student.nom} ${student.prenom} TT en salle standard`, `Salle actuelle : ${roomName}.`, 'Répartition');
        }
        if (hasAmen && !room.isAmen) {
            pushIssue('warning', `${student.nom} ${student.prenom} avec aménagement en salle non aménagée`, `Salle actuelle : ${roomName}.`, 'Aménagements');
        }
    });

    const exams = DB.exams || [];
    exams.forEach(exam => {
        if (!exam.date || !exam.time || !exam.durStd || !exam.durTT) {
            pushIssue('warning', `Épreuve incomplète : ${exam.name || 'Sans nom'}`, 'Date, horaire ou durée manquante.', 'Configuration');
        }
    });

    const activeRooms = rooms.filter(room => (DB.distribution && DB.distribution[room.nom] || []).length > 0);
    const expectedPlanningSlots = exams.length * activeRooms.reduce((sum, room) => sum + (parseInt(room.nbSurv, 10) || DB.config.nbSurv || 1), 0);
    const planningAssignments = getPlanningAssignments();
    if (students.length > 0 && activeRooms.length > 0 && planningAssignments.length === 0) {
        pushIssue('warning', 'Planning surveillants vide', 'Aucun surveillant n’est affecté aux salles actives.', 'Planning');
    }

    const duplicateAssignments = new Map();
    planningAssignments.forEach(assignment => {
        const slotKey = `${assignment.examIdx}_${assignment.type}_${assignment.slotIdx}_${assignment.teacher}`;
        if (!duplicateAssignments.has(slotKey)) duplicateAssignments.set(slotKey, []);
        duplicateAssignments.get(slotKey).push(assignment.room);
    });
    duplicateAssignments.forEach((roomsList, key) => {
        if (roomsList.length > 1) {
            const teacher = key.split('_').slice(3).join('_');
            pushIssue('error', `Double affectation possible : ${teacher}`, `Présent sur ${roomsList.join(', ')} au même créneau.`, 'Planning');
        }
    });

    const capacity = rooms.reduce((sum, room) => sum + (parseInt(room.capacite, 10) || 0), 0);
    const ttStudents = students.filter(s => s.tt).length;
    const amenStudents = students.filter(s => (s.labels || []).some(label => label !== 'TTEMPS')).length;
    const readyErrors = issues.filter(issue => issue.severity === 'error').length;
    const readyWarnings = issues.filter(issue => issue.severity === 'warning').length;

    return {
        issues,
        metrics: {
            students: students.length,
            rooms: rooms.length,
            teachers: teachers.length,
            capacity,
            placed: assignedStudentIds.size,
            unassigned: unassigned.length,
            buffer: bufferCount,
            ttStudents,
            amenStudents,
            exams: exams.length,
            planningAssignments: planningAssignments.length,
            expectedPlanningSlots
        },
        readyErrors,
        readyWarnings
    };
}

function renderDashboard() {
    const kpis = document.getElementById('dashboardKpis');
    const readiness = document.getElementById('dashboardReadiness');
    const issuesContainer = document.getElementById('dashboardIssues');
    const subtitle = document.getElementById('dashboardSubtitle');
    if (!kpis || !readiness || !issuesContainer) return;

    const status = getDashboardStatus();
    const m = status.metrics;
    const readinessColor = status.readyErrors > 0 ? '#e74c3c' : status.readyWarnings > 0 ? '#f39c12' : '#27ae60';
    const readinessText = status.readyErrors > 0
        ? 'À corriger avant impression'
        : status.readyWarnings > 0
            ? 'Presque prêt, vérifications conseillées'
            : 'Prêt pour les exports';

    if (subtitle) {
        subtitle.textContent = `${DB.config.schoolName || 'Établissement'} - ${DB.config.year || 'session non renseignée'}`;
    }

    const cards = [
        ['Élèves', m.students, `${m.placed} placé(s), ${m.unassigned} sans salle`],
        ['Salles', m.rooms, `${m.capacity} place(s) configurée(s)`],
        ['Aménagements', m.amenStudents, `${m.ttStudents} tiers-temps`],
        ['Professeurs', m.teachers, `${m.planningAssignments} affectation(s)`],
        ['Épreuves', m.exams, 'Configuration écrits'],
        ['Anomalies', status.issues.length, `${status.readyErrors} critique(s), ${status.readyWarnings} vigilance`]
    ];

    kpis.innerHTML = cards.map(([label, value, hint]) => `
        <div class="card" style="margin:0; padding:16px; border-left:5px solid ${value === status.issues.length && status.readyErrors > 0 ? '#e74c3c' : '#3498db'};">
            <div style="font-size:0.78rem; color:#7f8c8d; text-transform:uppercase; font-weight:bold;">${escapeHTML(label)}</div>
            <div style="font-size:2rem; font-weight:bold; color:#2c3e50; line-height:1.2;">${escapeHTML(value)}</div>
            <div style="font-size:0.82rem; color:#7f8c8d;">${escapeHTML(hint)}</div>
        </div>
    `).join('');

    readiness.innerHTML = `
        <div style="border:1px solid ${readinessColor}; background:${status.readyErrors > 0 ? '#fdedec' : status.readyWarnings > 0 ? '#fef9e7' : '#eafaf1'}; border-radius:8px; padding:14px 16px; display:flex; justify-content:space-between; gap:15px; align-items:center; flex-wrap:wrap;">
            <div>
                <div style="font-weight:bold; color:${readinessColor}; font-size:1.05rem;">${escapeHTML(readinessText)}</div>
                <div style="color:#566573; font-size:0.9rem;">${status.issues.length === 0 ? 'Aucune anomalie détectée sur les contrôles principaux.' : 'Traitez les points ci-dessous avant de générer le pack final.'}</div>
            </div>
            <button class="btn btn-success" onclick="copyDashboardReport()">Copier le rapport</button>
        </div>
    `;

    if (status.issues.length === 0) {
        issuesContainer.innerHTML = '<div style="padding:18px; text-align:center; color:#27ae60; font-weight:bold;">Tout est cohérent sur les contrôles principaux.</div>';
    } else {
        issuesContainer.innerHTML = status.issues.map(issue => {
            const color = issue.severity === 'error' ? '#e74c3c' : '#f39c12';
            const icon = issue.severity === 'error' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation';
            return `
                <div style="display:grid; grid-template-columns:28px 1fr auto; gap:10px; align-items:start; padding:12px 0; border-bottom:1px solid #ecf0f1;">
                    <i class="fas ${icon}" style="color:${color}; margin-top:3px;"></i>
                    <div>
                        <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(issue.title)}</div>
                        <div style="font-size:0.88rem; color:#7f8c8d;">${escapeHTML(issue.detail)}</div>
                    </div>
                    <span style="font-size:0.78rem; color:${color}; font-weight:bold; white-space:nowrap;">${escapeHTML(issue.action)}</span>
                </div>
            `;
        }).join('');
    }

    const searchInput = document.getElementById('dashboardSearchInput');
    if (searchInput && searchInput.value) dashboardSearch(searchInput.value);
}

function dashboardSearch(query) {
    const container = document.getElementById('dashboardSearchResults');
    if (!container) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        container.innerHTML = '<div style="color:#95a5a6; padding:10px;">Saisissez au moins quelques lettres pour chercher.</div>';
        return;
    }

    const results = [];
    (DB.students || []).forEach(student => {
        const haystack = `${student.nom} ${student.prenom} ${student.classe || ''} ${student.mef || ''} ${(student.labels || []).join(' ')}`.toLowerCase();
        if (haystack.includes(q)) {
            results.push({
                type: 'Élève',
                title: `${student.nom} ${student.prenom}`,
                detail: `${student.classe || 'Sans classe'} - ${getStudentRoom(student.id) || 'Sans salle'}${student.tt ? ' - TT' : ''}`
            });
        }
    });
    (DB.teachers || []).forEach(teacher => {
        const fullName = `${teacher.nom} ${teacher.prenom}`;
        const haystack = `${fullName} ${teacher.matiere || ''}`.toLowerCase();
        if (haystack.includes(q)) {
            const assignments = getPlanningAssignments().filter(a => a.teacher === fullName).length;
            results.push({
                type: 'Professeur',
                title: fullName,
                detail: `${teacher.matiere || 'Matière non renseignée'} - ${assignments} surveillance(s)`
            });
        }
    });
    (DB.rooms || []).forEach(room => {
        const haystack = `${room.nom} ${room.isTT ? 'tt tiers temps' : ''} ${room.isAmen ? 'amenagement' : ''}`.toLowerCase();
        if (haystack.includes(q)) {
            const count = (DB.distribution && DB.distribution[room.nom] || []).length;
            results.push({
                type: 'Salle',
                title: room.nom,
                detail: `${count}/${room.capacite || 0} élève(s)${room.isTT ? ' - TT' : ''}${room.isAmen ? ' - Aménagements' : ''}`
            });
        }
    });

    if (results.length === 0) {
        container.innerHTML = '<div style="color:#95a5a6; padding:10px;">Aucun résultat.</div>';
        return;
    }

    container.innerHTML = results.slice(0, 30).map(result => `
        <div style="display:grid; grid-template-columns:110px 1fr; gap:12px; padding:10px 0; border-bottom:1px solid #ecf0f1;">
            <span style="font-size:0.75rem; color:#2980b9; font-weight:bold; text-transform:uppercase;">${escapeHTML(result.type)}</span>
            <div>
                <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(result.title)}</div>
                <div style="font-size:0.86rem; color:#7f8c8d;">${escapeHTML(result.detail)}</div>
            </div>
        </div>
    `).join('');
}

function copyDashboardReport() {
    const status = getDashboardStatus();
    const lines = [
        `Rapport Orga DNB - ${DB.config.schoolName || 'Établissement'} ${DB.config.year || ''}`,
        `Élèves: ${status.metrics.students}`,
        `Salles: ${status.metrics.rooms} (${status.metrics.capacity} places)`,
        `Professeurs: ${status.metrics.teachers}`,
        `Anomalies critiques: ${status.readyErrors}`,
        `Points de vigilance: ${status.readyWarnings}`,
        ''
    ];
    if (status.issues.length === 0) {
        lines.push('Aucune anomalie détectée.');
    } else {
        status.issues.forEach(issue => {
            lines.push(`[${issue.severity.toUpperCase()}] ${issue.title} - ${issue.detail}`);
        });
    }

    const text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Rapport copié.', 'success'))
            .catch(() => showAlertModal(text, 'info'));
    } else {
        showAlertModal(text, 'info');
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        if (document.getElementById('dashboard')?.classList.contains('active')) renderDashboard();
    }, 250);
});
