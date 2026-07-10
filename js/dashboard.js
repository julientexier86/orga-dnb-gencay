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

function getDashboardActionTarget(action) {
    const map = {
        'Configuration': 'config',
        'Données > Élèves': 'data-eleves',
        'Données > Salles': 'data-salles',
        'Données > Professeurs': 'data-profs',
        'Répartition': 'organization',
        'Aménagements': 'data-amenagements',
        'Planning': 'planning-rooms',
        'Convocations': 'convoc-eleves',
        'Secrétariat': 'sec-orga'
    };
    return map[action] || 'dashboard';
}

function goDashboardAction(action) {
    const targetId = getDashboardActionTarget(action);
    goDashboardTarget(targetId);
}

function goDashboardTarget(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return showToast('Section introuvable.', 'warning');
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active'));

    const refreshers = {
        'data-eleves': 'renderStudents',
        'data-salles': 'renderRooms',
        'data-profs': 'renderTeachers',
        'data-amenagements': 'renderAmenagements',
        'organization': 'renderVisualDistribution',
        'planning-rooms': 'renderPlanning',
        'convoc-eleves': null,
        'sec-orga': 'initPochettesClasses'
    };
    const fnName = refreshers[targetId];
    if (fnName && typeof window[fnName] === 'function') window[fnName]();
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
        issues.push({ severity, title, detail, action, target: getDashboardActionTarget(action) });
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
    if (activeRooms.length > 0 && planningAssignments.length > 0 && planningAssignments.length < expectedPlanningSlots) {
        pushIssue('warning', 'Planning surveillants incomplet', `${planningAssignments.length}/${expectedPlanningSlots} affectation(s) détectée(s).`, 'Planning');
    }

    if (!DB.config.logo) {
        pushIssue('warning', 'Logo non configuré', 'Les documents officiels sortiront sans logo établissement.', 'Configuration');
    }
    if (!DB.config.director || !DB.config.director.name) {
        pushIssue('warning', 'Direction incomplète', 'Le nom de signature manque pour les convocations et documents officiels.', 'Configuration');
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
    const examDayLogCount = (DB.examDayLog || []).length;
    const attendanceCount = (DB.examAttendance || []).length;
    const checklist = Array.isArray(DB.examDayChecklist) ? DB.examDayChecklist : [];
    const examDayChecklistDone = checklist.filter(item => item.done).length;
    const examDayChecklistTotal = checklist.length || getDefaultExamDayChecklist().length;
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
            expectedPlanningSlots,
            examDayLogCount,
            attendanceCount,
            examDayChecklistDone,
            examDayChecklistTotal
        },
        readyErrors,
        readyWarnings
    };
}

function getPreparationSteps(status) {
    const m = status.metrics;
    const hasExamIdentity = !!(DB.config && DB.config.schoolName && DB.config.year && (DB.config.examType || DB.config.customExamName));
    const hasCompleteExams = (DB.exams || []).length > 0 && (DB.exams || []).every(exam => exam.date && exam.time && exam.durStd && exam.durTT);
    const hasStudents = m.students > 0;
    const hasRooms = m.rooms > 0;
    const hasTeachers = m.teachers > 0;
    const hasDistribution = m.placed > 0 && m.unassigned === 0 && m.buffer === 0;
    const hasPlanning = m.expectedPlanningSlots === 0 ? false : m.planningAssignments >= m.expectedPlanningSlots;
    const hasInstructions = typeof getInstructionTemplate !== 'function'
        ? true
        : ['candidates', 'teachers', 'aesh'].every(key => getInstructionTemplate(key).trim().length > 0);
    const readyForPack = status.readyErrors === 0 && hasStudents && hasRooms && hasDistribution;

    return [
        {
            label: 'Identifier l’examen',
            detail: hasExamIdentity ? `${typeof getExamSessionLabel === 'function' ? getExamSessionLabel() : DB.config.year}` : 'Renseigner établissement, session et type d’examen.',
            done: hasExamIdentity && hasCompleteExams,
            warning: hasExamIdentity && !hasCompleteExams,
            target: 'config'
        },
        {
            label: 'Importer les données',
            detail: `${m.students} élève(s), ${m.rooms} salle(s), ${m.teachers} professeur(s).`,
            done: hasStudents && hasRooms && hasTeachers,
            warning: hasStudents && hasRooms && !hasTeachers,
            target: hasStudents ? (hasRooms ? 'data-profs' : 'data-salles') : 'data-eleves'
        },
        {
            label: 'Vérifier les aménagements',
            detail: `${m.amenStudents} aménagement(s), ${m.ttStudents} tiers-temps.`,
            done: hasStudents,
            warning: hasStudents && m.ttStudents > 0 && !DB.rooms.some(room => room.isTT === true || room.isTT === 'true'),
            target: 'data-amenagements'
        },
        {
            label: 'Répartir les élèves',
            detail: hasDistribution ? `${m.placed} élève(s) placé(s).` : `${m.unassigned} sans salle, ${m.buffer} en zone tampon.`,
            done: hasDistribution,
            warning: m.placed > 0 && !hasDistribution,
            target: 'organization'
        },
        {
            label: 'Préparer les surveillances',
            detail: `${m.planningAssignments}/${m.expectedPlanningSlots || 0} affectation(s).`,
            done: hasPlanning,
            warning: m.planningAssignments > 0 && !hasPlanning,
            target: 'planning-rooms'
        },
        {
            label: 'Finaliser les documents',
            detail: readyForPack ? 'Pack final prêt à contrôler/générer.' : 'Corriger les anomalies avant impression finale.',
            done: readyForPack && hasInstructions,
            warning: readyForPack && !hasInstructions,
            target: 'dashboard'
        }
    ];
}

function renderDashboard() {
    const kpis = document.getElementById('dashboardKpis');
    const readiness = document.getElementById('dashboardReadiness');
    const issuesContainer = document.getElementById('dashboardIssues');
    const workflow = document.getElementById('dashboardWorkflow');
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
        subtitle.textContent = `${DB.config.schoolName || 'Établissement'} - ${typeof getExamSessionLabel === 'function' ? getExamSessionLabel() : (DB.config.year || 'session non renseignée')}`;
    }

    const cards = [
        ['Élèves', m.students, `${m.placed} placé(s), ${m.unassigned} sans salle`],
        ['Salles', m.rooms, `${m.capacity} place(s) configurée(s)`],
        ['Aménagements', m.amenStudents, `${m.ttStudents} tiers-temps`],
        ['Professeurs', m.teachers, `${m.planningAssignments} affectation(s)`],
        ['Épreuves', m.exams, 'Configuration écrits'],
        ['Jour J', m.examDayLogCount + m.attendanceCount, `${m.attendanceCount} absence/retard - checklist ${m.examDayChecklistDone}/${m.examDayChecklistTotal}`],
        ['Anomalies', status.issues.length, `${status.readyErrors} critique(s), ${status.readyWarnings} vigilance`]
    ];

    kpis.innerHTML = cards.map(([label, value, hint]) => `
        <div class="card" style="margin:0; padding:16px; border-left:5px solid ${value === status.issues.length && status.readyErrors > 0 ? '#e74c3c' : '#3498db'};">
            <div style="font-size:0.78rem; color:#7f8c8d; text-transform:uppercase; font-weight:bold;">${escapeHTML(label)}</div>
            <div style="font-size:2rem; font-weight:bold; color:#2c3e50; line-height:1.2;">${escapeHTML(value)}</div>
            <div style="font-size:0.82rem; color:#7f8c8d;">${escapeHTML(hint)}</div>
        </div>
    `).join('');

    if (workflow) {
        const steps = getPreparationSteps(status);
        workflow.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:12px;">
                ${steps.map((step, idx) => {
                    const color = step.done ? '#27ae60' : step.warning ? '#f39c12' : '#95a5a6';
                    const bg = step.done ? '#eafaf1' : step.warning ? '#fef9e7' : '#f8f9fa';
                    const icon = step.done ? 'fa-check-circle' : step.warning ? 'fa-triangle-exclamation' : 'fa-circle';
                    return `
                        <div style="border:1px solid ${color}; background:${bg}; border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:8px; min-height:132px;">
                            <div style="display:flex; gap:9px; align-items:center;">
                                <i class="fas ${icon}" style="color:${color};"></i>
                                <div style="font-size:0.78rem; color:#7f8c8d; font-weight:bold;">Étape ${idx + 1}</div>
                            </div>
                            <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(step.label)}</div>
                            <div style="font-size:0.86rem; color:#566573; flex:1;">${escapeHTML(step.detail)}</div>
                            <button class="btn btn-secondary" style="align-self:flex-start; padding:6px 10px; font-size:0.8rem;" onclick="${step.target === 'dashboard' ? 'openExamFinalPack()' : `goDashboardTarget('${step.target}')`}">${step.target === 'dashboard' ? 'Pack final' : 'Ouvrir'}</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    readiness.innerHTML = `
        <div style="border:1px solid ${readinessColor}; background:${status.readyErrors > 0 ? '#fdedec' : status.readyWarnings > 0 ? '#fef9e7' : '#eafaf1'}; border-radius:8px; padding:14px 16px; display:flex; justify-content:space-between; gap:15px; align-items:center; flex-wrap:wrap;">
            <div>
                <div style="font-weight:bold; color:${readinessColor}; font-size:1.05rem;">${escapeHTML(readinessText)}</div>
                <div style="color:#566573; font-size:0.9rem;">${status.issues.length === 0 ? 'Aucune anomalie détectée sur les contrôles principaux.' : 'Traitez les points ci-dessous avant de générer le pack final.'}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="btn btn-primary" onclick="openExamFinalPack()"><i class="fas fa-box-open"></i> Pack final</button>
                <button class="btn btn-dark" onclick="exportDashboardPrepPDF()"><i class="fas fa-file-pdf"></i> Synthèse PDF</button>
                <button class="btn btn-success" onclick="copyDashboardReport()">Copier le rapport</button>
            </div>
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
                    <button class="btn btn-secondary" style="font-size:0.78rem; padding:6px 10px; white-space:nowrap;" onclick="goDashboardTarget('${escapeHTML(issue.target)}')">${escapeHTML(issue.action)}</button>
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
                entityType: 'student',
                id: normalizeStudentId(student.id),
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
                entityType: 'teacher',
                id: String(teacher.id ?? teacher.nom),
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
                entityType: 'room',
                id: room.nom,
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
        <div style="display:grid; grid-template-columns:110px 1fr auto; gap:12px; padding:10px 0; border-bottom:1px solid #ecf0f1; align-items:center;">
            <span style="font-size:0.75rem; color:#2980b9; font-weight:bold; text-transform:uppercase;">${escapeHTML(result.type)}</span>
            <div>
                <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(result.title)}</div>
                <div style="font-size:0.86rem; color:#7f8c8d;">${escapeHTML(result.detail)}</div>
            </div>
            <button class="btn btn-secondary" style="padding:6px 10px; font-size:0.8rem;" onclick="openDashboardEntityCard('${escapeHTML(result.entityType)}', '${escapeHTML(result.id)}')">Fiche</button>
        </div>
    `).join('');
}

function formatDashboardDate(dateStr) {
    if (!dateStr) return 'Date non définie';
    const date = new Date(`${dateStr}T12:00:00`);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDashboardExamSlot(exam, isTT) {
    const type = isTT ? 'tt' : 'std';
    const slots = typeof window.getComputedSlots === 'function'
        ? window.getComputedSlots(exam, type)
        : [];
    if (slots && slots.length > 0) return slots[0];
    const start = isTT ? (exam.timeTT || exam.time) : exam.time;
    const duration = isTT ? exam.durTT : exam.durStd;
    return { start, end: typeof addMinutes === 'function' ? addMinutes(start, Number(duration || 0)) : '' };
}

function getStudentPlacementDetails(student) {
    const roomName = getStudentRoom(student.id);
    const room = (DB.rooms || []).find(r => r.nom === roomName);
    return { roomName, room, isTT: !!(room && (room.isTT === true || room.isTT === 'true')) };
}

function getStudentExamRows(student) {
    const placement = getStudentPlacementDetails(student);
    if (!placement.room) return [];
    return (DB.exams || []).map(exam => {
        const slot = getDashboardExamSlot(exam, placement.isTT);
        return [
            formatDashboardDate(exam.date),
            exam.name || 'Épreuve',
            `${slot.start || '?'} - ${slot.end || '?'}`,
            placement.roomName || 'Sans salle'
        ];
    });
}

function normalizeDashboardTeacherName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim();
}

function getTeacherDashboardName(teacher) {
    if (typeof window.getTeacherPlanningName === 'function') return window.getTeacherPlanningName(teacher);
    return normalizeDashboardTeacherName(`${teacher.nom || ''} ${teacher.prenom || ''}`);
}

function parseDashboardPlanningKey(key) {
    const parts = String(key || '').split('_');
    if (parts.length < 5) return null;
    const examIdx = parseInt(parts[0], 10);
    const survIdx = parseInt(parts[parts.length - 1], 10);
    const slotIdx = parseInt(parts[parts.length - 2], 10);
    const type = parts[parts.length - 3];
    const roomName = parts.slice(1, -3).join('_');
    if (Number.isNaN(examIdx) || Number.isNaN(slotIdx) || Number.isNaN(survIdx)) return null;
    return { examIdx, roomName, type, slotIdx, survIdx };
}

function getTeacherDashboardDuties(teacher) {
    const teacherName = getTeacherDashboardName(teacher);
    const duties = [];
    Object.entries(DB.planning || {}).forEach(([key, assignedName]) => {
        if (normalizeDashboardTeacherName(assignedName) !== teacherName) return;
        const parsed = parseDashboardPlanningKey(key);
        if (!parsed) return;
        const exam = DB.exams && DB.exams[parsed.examIdx];
        const room = DB.rooms && DB.rooms.find(r => r.nom === parsed.roomName);
        if (!exam) return;
        const slots = typeof window.getComputedSlots === 'function'
            ? window.getComputedSlots(exam, parsed.type === 'tt' ? 'tt' : 'std')
            : [];
        const slot = slots[parsed.slotIdx] || getDashboardExamSlot(exam, parsed.type === 'tt');
        duties.push({
            date: exam.date || '',
            label: parsed.type === 'dict' ? `${exam.name || 'Épreuve'} - Dictée` : (exam.name || 'Épreuve'),
            time: `${slot.start || '?'} - ${slot.end || '?'}`,
            room: room ? room.nom : parsed.roomName,
            kind: parsed.type === 'tt' ? 'Tiers-temps' : parsed.type === 'dict' ? 'Dictée' : 'Surveillance'
        });
    });
    const reserves = DB.planningReserve || {};
    Object.entries(reserves).forEach(([key, assignedName]) => {
        if (normalizeDashboardTeacherName(assignedName) !== teacherName) return;
        const parts = key.split('_');
        const examIdx = parseInt(parts[0], 10);
        const exam = DB.exams && DB.exams[examIdx];
        if (!exam) return;
        const slot = getDashboardExamSlot(exam, false);
        duties.push({
            date: exam.date || '',
            label: exam.name || 'Épreuve',
            time: `${slot.start || '?'} - ${slot.end || '?'}`,
            room: 'Réserve',
            kind: 'Réserve'
        });
    });
    return duties.sort((a, b) => `${a.date}_${a.time}`.localeCompare(`${b.date}_${b.time}`));
}

function renderMiniTable(head, rows) {
    if (!rows || rows.length === 0) return '<div style="color:#7f8c8d; padding:10px 0;">Aucune donnée.</div>';
    return `
        <div style="overflow:auto; border:1px solid #e5e7eb; border-radius:8px;">
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <thead><tr>${head.map(h => `<th style="text-align:left; padding:8px; background:#f4f6f7; border-bottom:1px solid #e5e7eb;">${escapeHTML(h)}</th>`).join('')}</tr></thead>
                <tbody>
                    ${rows.map(row => `<tr>${row.map(cell => `<td style="padding:8px; border-bottom:1px solid #f0f2f4;">${escapeHTML(cell)}</td>`).join('')}</tr>`).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openDashboardEntityCard(type, id) {
    let title = '';
    let body = '';

    if (type === 'student') {
        const student = (DB.students || []).find(s => normalizeStudentId(s.id) === normalizeStudentId(id));
        if (!student) return showToast('Élève introuvable.', 'error');
        const placement = getStudentPlacementDetails(student);
        const labels = (student.labels || []).join(', ') || 'Aucun';
        title = `${student.nom || ''} ${student.prenom || ''}`;
        body = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:14px;">
                <div><b>Classe</b><br>${escapeHTML(student.classe || '-')}</div>
                <div><b>Salle</b><br>${escapeHTML(placement.roomName || 'Sans salle')}</div>
                <div><b>Anonymat</b><br>${escapeHTML(student.anonymat || '-')}</div>
                <div><b>Aménagements</b><br>${escapeHTML(labels)}</div>
            </div>
            <h4 style="margin:14px 0 8px;">Épreuves écrites</h4>
            ${renderMiniTable(['Date', 'Épreuve', 'Horaire', 'Salle'], getStudentExamRows(student))}
        `;
    } else if (type === 'teacher') {
        const teacher = (DB.teachers || []).find(t => String(t.id ?? t.nom) === String(id));
        if (!teacher) return showToast('Professeur introuvable.', 'error');
        const duties = getTeacherDashboardDuties(teacher);
        const totalDuties = duties.length;
        title = getTeacherDashboardName(teacher);
        body = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:14px;">
                <div><b>Matière</b><br>${escapeHTML(teacher.matiere || teacher.matieres || '-')}</div>
                <div><b>HSE</b><br>${teacher.noHSE ? 'Refusées' : 'Autorisées'}</div>
                <div><b>Affectations</b><br>${totalDuties}</div>
            </div>
            <h4 style="margin:14px 0 8px;">Missions</h4>
            ${renderMiniTable(['Date', 'Horaire', 'Mission', 'Salle'], duties.map(d => [formatDashboardDate(d.date), d.time, `${d.kind} - ${d.label}`, d.room]))}
        `;
    } else if (type === 'room') {
        const room = (DB.rooms || []).find(r => r.nom === id);
        if (!room) return showToast('Salle introuvable.', 'error');
        const students = (DB.distribution && DB.distribution[room.nom]) || [];
        title = room.nom;
        body = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:14px;">
                <div><b>Capacité</b><br>${escapeHTML(room.capacite || '-')}</div>
                <div><b>Élèves placés</b><br>${students.length}</div>
                <div><b>Type</b><br>${room.isTT ? 'Tiers-temps' : room.isAmen ? 'Aménagements' : 'Standard'}</div>
            </div>
            <h4 style="margin:14px 0 8px;">Élèves</h4>
            ${renderMiniTable(['Nom', 'Prénom', 'Classe', 'Aménagements'], students.map(s => [s.nom || '', s.prenom || '', s.classe || '', (s.labels || []).join(', ')]))}
        `;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay-custom';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
    overlay.innerHTML = `
        <div style="background:white; width:min(760px, 96vw); max-height:88vh; overflow:auto; border-radius:10px; box-shadow:0 15px 40px rgba(0,0,0,0.25); padding:22px;">
            <div style="display:flex; justify-content:space-between; gap:15px; align-items:start; border-bottom:1px solid #ecf0f1; padding-bottom:12px; margin-bottom:14px;">
                <div>
                    <h3 style="margin:0; color:#2c3e50;">${escapeHTML(title)}</h3>
                    <div style="color:#7f8c8d; margin-top:4px;">Fiche ${escapeHTML(type === 'student' ? 'élève' : type === 'teacher' ? 'professeur' : 'salle')}</div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
                    <button class="btn btn-dark" onclick="exportDashboardEntityPDF('${escapeHTML(type)}', '${escapeHTML(id)}')">PDF</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay-custom').remove()">Fermer</button>
                </div>
            </div>
            ${body}
        </div>
    `;
    document.body.appendChild(overlay);
}

function exportDashboardEntityPDF(type, id) {
    if (!window.jspdf) return showToast("Librairie PDF non chargée.", 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let title = '';
    let subtitle = '';
    let blocks = [];
    let table = null;

    if (type === 'student') {
        const student = (DB.students || []).find(s => normalizeStudentId(s.id) === normalizeStudentId(id));
        if (!student) return showToast('Élève introuvable.', 'error');
        const placement = getStudentPlacementDetails(student);
        title = `${student.nom || ''} ${student.prenom || ''}`;
        subtitle = `Fiche élève - ${student.classe || 'Sans classe'}`;
        blocks = [
            ['Classe', student.classe || '-'],
            ['Salle', placement.roomName || 'Sans salle'],
            ['Anonymat', student.anonymat || '-'],
            ['Aménagements', (student.labels || []).join(', ') || 'Aucun']
        ];
        table = {
            head: ['Date', 'Épreuve', 'Horaire', 'Salle'],
            rows: getStudentExamRows(student)
        };
    } else if (type === 'teacher') {
        const teacher = (DB.teachers || []).find(t => String(t.id ?? t.nom) === String(id));
        if (!teacher) return showToast('Professeur introuvable.', 'error');
        const duties = getTeacherDashboardDuties(teacher);
        title = getTeacherDashboardName(teacher);
        subtitle = 'Fiche professeur';
        blocks = [
            ['Matière', teacher.matiere || teacher.matieres || '-'],
            ['HSE', teacher.noHSE ? 'Refusées' : 'Autorisées'],
            ['Affectations', duties.length.toString()]
        ];
        table = {
            head: ['Date', 'Horaire', 'Mission', 'Salle'],
            rows: duties.map(d => [formatDashboardDate(d.date), d.time, `${d.kind} - ${d.label}`, d.room])
        };
    } else if (type === 'room') {
        const room = (DB.rooms || []).find(r => r.nom === id);
        if (!room) return showToast('Salle introuvable.', 'error');
        const students = (DB.distribution && DB.distribution[room.nom]) || [];
        title = room.nom;
        subtitle = 'Fiche salle';
        blocks = [
            ['Capacité', String(room.capacite || '-')],
            ['Élèves placés', String(students.length)],
            ['Type', room.isTT ? 'Tiers-temps' : room.isAmen ? 'Aménagements' : 'Standard']
        ];
        table = {
            head: ['Nom', 'Prénom', 'Classe', 'Aménagements'],
            rows: students.map(s => [s.nom || '', s.prenom || '', s.classe || '', (s.labels || []).join(', ')])
        };
    }

    let y = typeof drawExamPdfHeader === 'function'
        ? drawExamPdfHeader(doc, { title, subtitle, y: 8, logoSize: 28 })
        : 25;

    const blockRows = [];
    for (let i = 0; i < blocks.length; i += 2) {
        blockRows.push([
            `${blocks[i][0]} : ${blocks[i][1]}`,
            blocks[i + 1] ? `${blocks[i + 1][0]} : ${blocks[i + 1][1]}` : ''
        ]);
    }
    doc.autoTable({
        body: blockRows,
        startY: y,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { fontStyle: 'bold' } }
    });
    y = doc.lastAutoTable.finalY + 8;
    if (table) {
        doc.autoTable({
            head: [table.head],
            body: table.rows,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' }
        });
    }

    const safeTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
    doc.save(`Fiche_${type}_${safeTitle}_${DB.config.year || ''}.pdf`);
}

function ensureExamDayLog() {
    if (!DB.examDayLog) DB.examDayLog = [];
    return DB.examDayLog;
}

function ensureExamAttendance() {
    if (!DB.examAttendance || !Array.isArray(DB.examAttendance)) DB.examAttendance = [];
    return DB.examAttendance;
}

function getAttendanceExamLabel(exam, index) {
    if (!exam) return 'Épreuve inconnue';
    return `${formatDashboardDate(exam.date)} - ${exam.name || `Épreuve ${index + 1}`}`;
}

function populateExamAttendanceControls() {
    const examSelect = document.getElementById('attendanceExamSelect');
    const studentSelect = document.getElementById('attendanceStudentSelect');
    const filterSelect = document.getElementById('attendanceFilterExamSelect');
    if (!examSelect || !studentSelect) return;

    const currentExam = examSelect.value;
    const currentFilter = filterSelect ? filterSelect.value : 'all';
    const currentStudent = studentSelect.value;
    examSelect.innerHTML = (DB.exams || []).map((exam, index) => `
        <option value="${index}" ${String(index) === currentExam ? 'selected' : ''}>${escapeHTML(getAttendanceExamLabel(exam, index))}</option>
    `).join('');
    if (filterSelect) {
        const options = ['<option value="all">Toutes les épreuves</option>'].concat((DB.exams || []).map((exam, index) => `
            <option value="${index}" ${String(index) === currentFilter ? 'selected' : ''}>${escapeHTML(getAttendanceExamLabel(exam, index))}</option>
        `));
        filterSelect.innerHTML = options.join('');
        if (currentFilter === 'all') filterSelect.value = 'all';
    }

    const sortedStudents = [...(DB.students || [])].sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
    studentSelect.innerHTML = sortedStudents.map(student => `
        <option value="${escapeHTML(normalizeStudentId(student.id))}" ${normalizeStudentId(student.id) === currentStudent ? 'selected' : ''}>${escapeHTML(`${student.nom || ''} ${student.prenom || ''} (${student.classe || '-'})`)}</option>
    `).join('');
}

function addExamAttendanceEntry() {
    const examSelect = document.getElementById('attendanceExamSelect');
    const studentSelect = document.getElementById('attendanceStudentSelect');
    const statusSelect = document.getElementById('attendanceStatusSelect');
    const noteInput = document.getElementById('attendanceNoteInput');
    if (!examSelect || !studentSelect || !statusSelect || !noteInput) return;

    const examIdx = parseInt(examSelect.value, 10);
    const studentId = normalizeStudentId(studentSelect.value);
    const exam = DB.exams && DB.exams[examIdx];
    const student = (DB.students || []).find(s => normalizeStudentId(s.id) === studentId);
    if (!exam || !student) return showToast('Épreuve ou élève introuvable.', 'warning');

    const placement = getStudentPlacementDetails(student);
    const attendance = ensureExamAttendance();
    const existing = attendance.find(entry => entry.examIdx === examIdx && normalizeStudentId(entry.studentId) === studentId);
    const payload = {
        examIdx,
        studentId,
        status: statusSelect.value,
        note: noteInput.value.trim(),
        roomName: placement.roomName || '',
        updatedAt: new Date().toISOString()
    };
    if (existing) Object.assign(existing, payload);
    else attendance.unshift({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), ...payload });

    noteInput.value = '';
    renderExamAttendance();
    renderDashboard();
    if (typeof autoSave === 'function') autoSave();
}

function deleteExamAttendanceEntry(id) {
    DB.examAttendance = ensureExamAttendance().filter(entry => entry.id !== id);
    renderExamAttendance();
    renderDashboard();
    if (typeof autoSave === 'function') autoSave();
}

function getAttendanceDisplay(entry) {
    const exam = DB.exams && DB.exams[entry.examIdx];
    const student = (DB.students || []).find(s => normalizeStudentId(s.id) === normalizeStudentId(entry.studentId));
    return {
        examLabel: exam ? getAttendanceExamLabel(exam, entry.examIdx) : 'Épreuve inconnue',
        studentLabel: student ? `${student.nom || ''} ${student.prenom || ''}`.trim() : 'Élève inconnu',
        classLabel: student ? (student.classe || '-') : '-',
        roomName: entry.roomName || (student ? getStudentRoom(student.id) : '') || '-'
    };
}

function getFilteredExamAttendance() {
    const filterSelect = document.getElementById('attendanceFilterExamSelect');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    const attendance = ensureExamAttendance();
    if (filterValue === 'all' || filterValue === '') return attendance;
    const examIdx = parseInt(filterValue, 10);
    return attendance.filter(entry => entry.examIdx === examIdx);
}

function getSelectedAttendanceExamIdx() {
    const filterSelect = document.getElementById('attendanceFilterExamSelect');
    const filterValue = filterSelect ? filterSelect.value : 'all';
    if (filterValue === 'all' || filterValue === '') return null;
    const examIdx = parseInt(filterValue, 10);
    return Number.isNaN(examIdx) ? null : examIdx;
}

function getAttendanceExportContext() {
    const examIdx = getSelectedAttendanceExamIdx();
    const exam = examIdx === null ? null : (DB.exams || [])[examIdx];
    const label = exam ? getAttendanceExamLabel(exam, examIdx) : 'Toutes les épreuves';
    const suffixSource = exam ? (exam.name || 'epreuve') : 'global';
    const safeSuffix = suffixSource.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
    return { examIdx, exam, label, safeSuffix };
}

function getExamAttendanceSummary(examIdx = null) {
    const entries = ensureExamAttendance().filter(entry => examIdx === null || entry.examIdx === examIdx);
    const summary = {
        expected: (DB.students || []).length,
        absent: 0,
        late: 0,
        early: 0,
        presentFlagged: 0,
        byRoom: new Map(),
        entries
    };

    entries.forEach(entry => {
        const display = getAttendanceDisplay(entry);
        if (entry.status === 'Absent') summary.absent++;
        else if (entry.status === 'Retard') summary.late++;
        else if (entry.status === 'Sortie anticipée') summary.early++;
        else if (entry.status === 'Présent signalé') summary.presentFlagged++;
        const roomName = display.roomName || '-';
        if (!summary.byRoom.has(roomName)) summary.byRoom.set(roomName, { roomName, absent: 0, late: 0, early: 0, presentFlagged: 0, total: 0 });
        const room = summary.byRoom.get(roomName);
        room.total++;
        if (entry.status === 'Absent') room.absent++;
        else if (entry.status === 'Retard') room.late++;
        else if (entry.status === 'Sortie anticipée') room.early++;
        else if (entry.status === 'Présent signalé') room.presentFlagged++;
    });

    return summary;
}

function getAttendanceRoomExpectedCounts() {
    const counts = new Map();
    getDistributionEntries().forEach(entry => {
        const roomName = entry.roomName || 'Zone Tampon';
        counts.set(roomName, (counts.get(roomName) || 0) + 1);
    });
    if (counts.size === 0 && (DB.students || []).length > 0) counts.set('Élèves importés', DB.students.length);
    return counts;
}

function renderAttendanceSummaryLine() {
    const line = document.getElementById('attendanceSummaryLine');
    if (!line) return;
    const examIdx = getSelectedAttendanceExamIdx();
    const summary = getExamAttendanceSummary(examIdx);
    const presentEstimated = Math.max(0, summary.expected - summary.absent);
    line.textContent = `${summary.entries.length} signalement(s) - ${summary.absent} absent(s), ${summary.late} retard(s), ${summary.early} sortie(s), ${presentEstimated}/${summary.expected} présent(s) estimés`;
}

function renderExamAttendance() {
    populateExamAttendanceControls();
    const container = document.getElementById('examAttendanceList');
    if (!container) return;
    const attendance = getFilteredExamAttendance();
    renderAttendanceSummaryLine();
    if (attendance.length === 0) {
        container.innerHTML = '<div style="color:#7f8c8d; padding:10px 0;">Aucune absence ou retard enregistré.</div>';
        return;
    }
    container.innerHTML = attendance.map(entry => {
        const display = getAttendanceDisplay(entry);
        const color = entry.status === 'Absent' ? '#c0392b' : entry.status === 'Retard' ? '#e67e22' : '#2980b9';
        return `
            <div style="display:grid; grid-template-columns:1.2fr 1fr 100px 1fr auto; gap:10px; align-items:start; padding:10px 0; border-bottom:1px solid #ecf0f1;">
                <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(display.examLabel)}</div>
                <div>${escapeHTML(display.studentLabel)}<br><span style="font-size:0.82rem; color:#7f8c8d;">${escapeHTML(display.classLabel)} - ${escapeHTML(display.roomName)}</span></div>
                <div><span style="font-size:0.78rem; color:white; background:${color}; padding:3px 7px; border-radius:999px; font-weight:bold;">${escapeHTML(entry.status)}</span></div>
                <div style="font-size:0.88rem; color:#566573;">${escapeHTML(entry.note || '')}</div>
                <button class="btn btn-danger" style="padding:5px 8px; font-size:0.75rem;" onclick="deleteExamAttendanceEntry('${entry.id}')">Supprimer</button>
            </div>
        `;
    }).join('');
}

function getDefaultExamDayChecklist() {
    return [
        'Secrétariat d’examen ouvert et identifié',
        'Salles ouvertes, affichages vérifiés',
        'Sujets, copies et brouillons prêts par salle',
        'Émargements élèves prêts',
        'Surveillants présents ou remplacements organisés',
        'Réserves joignables',
        'AESH et salles tiers-temps vérifiés',
        'Téléphones/objets connectés rappelés aux candidats',
        'Consignes lues aux surveillants',
        'Procédure incident/fraude disponible'
    ];
}

function ensureExamDayChecklist() {
    if (!DB.examDayChecklist || !Array.isArray(DB.examDayChecklist)) {
        DB.examDayChecklist = getDefaultExamDayChecklist().map((label, index) => ({
            id: `default_${index}`,
            label,
            done: false
        }));
    }
    return DB.examDayChecklist;
}

function toggleExamDayChecklistItem(id, checked) {
    const item = ensureExamDayChecklist().find(entry => entry.id === id);
    if (!item) return;
    item.done = checked;
    renderExamDayChecklist();
    if (typeof autoSave === 'function') autoSave();
}

function resetExamDayChecklist() {
    showConfirm("Réinitialiser la checklist jour J ?", () => {
        DB.examDayChecklist = getDefaultExamDayChecklist().map((label, index) => ({
            id: `default_${index}`,
            label,
            done: false
        }));
        renderExamDayChecklist();
        if (typeof autoSave === 'function') autoSave();
    });
}

function renderExamDayChecklist() {
    const container = document.getElementById('examDayChecklist');
    if (!container) return;
    const items = ensureExamDayChecklist();
    const doneCount = items.filter(item => item.done).length;
    container.innerHTML = `
        <div class="exam-day-checklist-count">${doneCount}/${items.length} point(s) validé(s)</div>
        <div class="exam-day-checklist-grid">
            ${items.map(item => `
                <label class="exam-day-checklist-item ${item.done ? 'is-done' : ''}">
                    <input class="exam-day-checklist-checkbox" type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleExamDayChecklistItem('${item.id}', this.checked)">
                    <span class="exam-day-checklist-label">${escapeHTML(item.label)}</span>
                </label>
            `).join('')}
        </div>
    `;
}

function addExamDayLogEntry() {
    const typeEl = document.getElementById('examDayLogType');
    const subjectEl = document.getElementById('examDayLogSubject');
    const noteEl = document.getElementById('examDayLogNote');
    if (!typeEl || !subjectEl || !noteEl) return;
    const note = noteEl.value.trim();
    const subject = subjectEl.value.trim();
    if (!note && !subject) return showToast('Ajoutez au moins une personne/salle ou une note.', 'warning');

    ensureExamDayLog().unshift({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        type: typeEl.value,
        subject,
        note
    });
    subjectEl.value = '';
    noteEl.value = '';
    renderExamDayLog();
    if (typeof autoSave === 'function') autoSave();
}

function deleteExamDayLogEntry(id) {
    DB.examDayLog = ensureExamDayLog().filter(entry => entry.id !== id);
    renderExamDayLog();
    if (typeof autoSave === 'function') autoSave();
}

function renderExamDayLog() {
    const container = document.getElementById('examDayLogList');
    if (!container) return;
    const log = ensureExamDayLog();
    if (log.length === 0) {
        container.innerHTML = '<div style="color:#7f8c8d; padding:10px 0;">Aucun événement enregistré.</div>';
        renderExamDayChecklist();
        renderExamAttendance();
        return;
    }
    container.innerHTML = log.slice(0, 20).map(entry => {
        const date = new Date(entry.createdAt);
        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return `
            <div style="display:grid; grid-template-columns:82px 135px 1fr auto; gap:10px; align-items:start; padding:10px 0; border-bottom:1px solid #ecf0f1;">
                <div style="font-weight:bold; color:#7f8c8d;">${escapeHTML(time)}</div>
                <div><span style="font-size:0.78rem; color:#2980b9; font-weight:bold; text-transform:uppercase;">${escapeHTML(entry.type)}</span></div>
                <div>
                    <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(entry.subject || '-')}</div>
                    <div style="font-size:0.88rem; color:#566573;">${escapeHTML(entry.note || '')}</div>
                </div>
                <button class="btn btn-danger" style="padding:5px 8px; font-size:0.75rem;" onclick="deleteExamDayLogEntry('${entry.id}')">Supprimer</button>
            </div>
        `;
    }).join('');
    renderExamDayChecklist();
    renderExamAttendance();
}

function exportExamAttendancePDF() {
    if (!window.jspdf) return showToast("Librairie PDF non chargée.", 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const context = getAttendanceExportContext();
    const attendance = getFilteredExamAttendance();
    const y = typeof drawExamPdfHeader === 'function'
        ? drawExamPdfHeader(doc, { title: "Absences et retards par épreuve", y: 8, logoSize: 28 })
        : 22;

    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    doc.text(context.label, 14, y);

    doc.autoTable({
        head: [['Épreuve', 'Élève', 'Classe', 'Salle', 'Statut', 'Note']],
        body: attendance.map(entry => {
            const display = getAttendanceDisplay(entry);
            return [display.examLabel, display.studentLabel, display.classLabel, display.roomName, entry.status || '', entry.note || ''];
        }),
        startY: y + 5,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8, cellPadding: 2.2, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 40 }, 2: { cellWidth: 18 }, 3: { cellWidth: 22 }, 4: { cellWidth: 24 } }
    });
    doc.save(`Absences_Retards_${context.safeSuffix}_${DB.config.year || ''}.pdf`);
}

function exportExamAttendanceXLSX() {
    if (typeof XLSX === 'undefined') return showToast("Librairie Excel non chargée.", 'error');
    const context = getAttendanceExportContext();
    const summary = getExamAttendanceSummary(context.examIdx);
    const expectedByRoom = getAttendanceRoomExpectedCounts();
    const presentEstimated = Math.max(0, summary.expected - summary.absent);

    const detailRows = [
        ['Profil', typeof getExamSessionLabel === 'function' ? getExamSessionLabel() : (DB.config.examType || '')],
        ['Sélection', context.label],
        ['Exporté le', new Date().toLocaleString('fr-FR')],
        [],
        ['Épreuve', 'Date', 'Élève', 'Classe', 'Salle', 'Statut', 'Note', 'Créé le', 'Mis à jour le']
    ];
    summary.entries.forEach(entry => {
        const display = getAttendanceDisplay(entry);
        const exam = DB.exams && DB.exams[entry.examIdx];
        detailRows.push([
            exam ? (exam.name || '') : display.examLabel,
            exam ? (exam.date || '') : '',
            display.studentLabel,
            display.classLabel,
            display.roomName,
            entry.status || '',
            entry.note || '',
            entry.createdAt ? new Date(entry.createdAt).toLocaleString('fr-FR') : '',
            entry.updatedAt ? new Date(entry.updatedAt).toLocaleString('fr-FR') : ''
        ]);
    });

    const synthesisRows = [
        ['Sélection', context.label],
        [],
        ['Attendus', 'Présents estimés', 'Absents', 'Retards', 'Sorties anticipées', 'Présents signalés'],
        [summary.expected, presentEstimated, summary.absent, summary.late, summary.early, summary.presentFlagged],
        [],
        ['Salle', 'Attendus', 'Présents estimés', 'Absents', 'Retards', 'Sorties anticipées', 'Présents signalés']
    ];
    const roomNames = new Set([...expectedByRoom.keys(), ...summary.byRoom.keys()]);
    [...roomNames].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })).forEach(roomName => {
        const room = summary.byRoom.get(roomName) || {};
        const expected = expectedByRoom.get(roomName) || 0;
        synthesisRows.push([
            roomName,
            expected,
            Math.max(0, expected - (room.absent || 0)),
            room.absent || 0,
            room.late || 0,
            room.early || 0,
            room.presentFlagged || 0
        ]);
    });

    const wb = XLSX.utils.book_new();
    const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
    const synthesisSheet = XLSX.utils.aoa_to_sheet(synthesisRows);
    detailSheet['!cols'] = [
        { wch: 32 }, { wch: 12 }, { wch: 26 }, { wch: 12 }, { wch: 20 },
        { wch: 18 }, { wch: 36 }, { wch: 20 }, { wch: 20 }
    ];
    synthesisSheet['!cols'] = [
        { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 12 },
        { wch: 12 }, { wch: 18 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, detailSheet, 'Signalements');
    XLSX.utils.book_append_sheet(wb, synthesisSheet, 'Synthese');
    XLSX.writeFile(wb, `Absences_Retards_${context.safeSuffix}_${DB.config.year || ''}.xlsx`);
}

function exportExamAttendanceSummaryPDF() {
    if (!window.jspdf) return showToast("Librairie PDF non chargée.", 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const context = getAttendanceExportContext();
    const summary = getExamAttendanceSummary(context.examIdx);
    const exam = context.exam;
    const title = exam ? `Synthèse fin d'épreuve - ${exam.name || 'Épreuve'}` : "Synthèse absences et retards";
    let y = typeof drawExamPdfHeader === 'function'
        ? drawExamPdfHeader(doc, { title, y: 8, logoSize: 28 })
        : 22;

    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    if (exam) {
        doc.text(`${formatDashboardDate(exam.date)} - ${exam.start || ''} ${exam.end ? `à ${exam.end}` : ''}`.trim(), 14, y);
        y += 7;
    } else {
        doc.text("Toutes les épreuves", 14, y);
        y += 7;
    }

    const presentEstimated = Math.max(0, summary.expected - summary.absent);
    doc.autoTable({
        head: [['Attendus', 'Présents estimés', 'Absents', 'Retards', 'Sorties', 'Présents signalés']],
        body: [[summary.expected, presentEstimated, summary.absent, summary.late, summary.early, summary.presentFlagged]],
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 10, halign: 'center', cellPadding: 2.5 }
    });
    y = doc.lastAutoTable.finalY + 7;

    const expectedByRoom = getAttendanceRoomExpectedCounts();
    const roomNames = new Set([...expectedByRoom.keys(), ...summary.byRoom.keys()]);
    const roomRows = [...roomNames].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })).map(roomName => {
        const room = summary.byRoom.get(roomName) || {};
        const expected = expectedByRoom.get(roomName) || 0;
        return [
            roomName,
            expected,
            Math.max(0, expected - (room.absent || 0)),
            room.absent || 0,
            room.late || 0,
            room.early || 0,
            room.presentFlagged || 0
        ];
    });
    doc.autoTable({
        head: [['Salle', 'Attendus', 'Présents estimés', 'Absents', 'Retards', 'Sorties', 'Présents signalés']],
        body: roomRows,
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [80, 100, 150] },
        styles: { fontSize: 8, cellPadding: 2.2, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 45 } }
    });
    y = doc.lastAutoTable.finalY + 7;

    if (summary.entries.length > 0) {
        doc.autoTable({
            head: [['Épreuve', 'Élève', 'Classe', 'Salle', 'Statut', 'Note']],
            body: summary.entries.map(entry => {
                const display = getAttendanceDisplay(entry);
                return [display.examLabel, display.studentLabel, display.classLabel, display.roomName, entry.status || '', entry.note || ''];
            }),
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 38 }, 2: { cellWidth: 16 }, 3: { cellWidth: 24 }, 4: { cellWidth: 24 } }
        });
    } else {
        doc.text("Aucun signalement enregistré pour cette sélection.", 14, y);
    }

    doc.save(`Synthese_Epreuve_${context.safeSuffix}_${DB.config.year || ''}.pdf`);
}

function exportExamDayLogPDF() {
    if (!window.jspdf) return showToast("Librairie PDF non chargée.", 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const log = ensureExamDayLog();
    const checklist = ensureExamDayChecklist();
    let y = typeof drawExamPdfHeader === 'function'
        ? drawExamPdfHeader(doc, { title: "Journal jour J", y: 8, logoSize: 28 })
        : 22;

    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text(`Checklist : ${checklist.filter(item => item.done).length}/${checklist.length} point(s) validé(s)`, 14, y);
    y += 7;

    doc.autoTable({
        head: [['Statut', 'Point de contrôle']],
        body: checklist.map(item => [item.done ? 'OK' : 'À faire', item.label]),
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        columnStyles: { 0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' } },
        didParseCell: data => {
            if (data.section === 'body' && data.column.index === 0) {
                data.cell.styles.textColor = data.cell.raw === 'OK' ? [39, 174, 96] : [192, 57, 43];
            }
        }
    });
    y = doc.lastAutoTable.finalY + 8;

    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text("Événements journalisés", 14, y);
    y += 5;

    if (log.length === 0) {
        doc.setFontSize(12);
        doc.text("Aucun événement enregistré.", 14, y);
    } else {
        doc.autoTable({
            head: [['Heure', 'Type', 'Personne / salle', 'Note']],
            body: log.map(entry => {
                const date = new Date(entry.createdAt);
                return [
                    date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    entry.type || '',
                    entry.subject || '',
                    entry.note || ''
                ];
            }),
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 34 }, 2: { cellWidth: 44 } }
        });
    }
    doc.save(`Journal_Jour_J_${DB.config.year || ''}.pdf`);
}

function copyDashboardReport() {
    const status = getDashboardStatus();
    const lines = [
        `Rapport Orga Examen - ${DB.config.schoolName || 'Établissement'} ${typeof getExamSessionLabel === 'function' ? getExamSessionLabel() : (DB.config.year || '')}`,
        `Élèves: ${status.metrics.students}`,
        `Salles: ${status.metrics.rooms} (${status.metrics.capacity} places)`,
        `Professeurs: ${status.metrics.teachers}`,
        `Journal jour J: ${status.metrics.examDayLogCount} événement(s), ${status.metrics.attendanceCount} absence/retard, checklist ${status.metrics.examDayChecklistDone}/${status.metrics.examDayChecklistTotal}`,
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

function openExamFinalPack() {
    const status = getDashboardStatus();
    const m = status.metrics;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay-custom';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';

    const hasPlacedStudents = m.placed > 0;
    const hasPlanning = m.planningAssignments > 0;
    const hasAeshSelection = !!(DB.config && DB.config.aeshConvocations && Object.values(DB.config.aeshConvocations.assignments || {}).some(item => item && item.enabled));
    const packItems = [
        ['Listes par salle', 'Affichage élèves par salle', 'exportDisplayPDF', 'fa-list', hasPlacedStudents, 'Répartition élèves requise'],
        ['Émargements élèves', 'Feuilles d’émargement par épreuve et salle', 'exportSignPDF', 'fa-signature', hasPlacedStudents, 'Répartition élèves requise'],
        ['Planning surveillants', 'Tableau synthèse des surveillances', 'exportPlanningSummaryPDF', 'fa-calendar-days', hasPlanning, 'Planning surveillants requis'],
        ['Planning Excel', 'Tableau de surveillance modifiable', 'exportPlanningSummaryXLSX', 'fa-file-excel', hasPlanning, 'Planning surveillants requis'],
        ['Convocations élèves', 'Convocations individuelles élèves', 'openConvocOptions', 'fa-user-graduate', hasPlacedStudents, 'Répartition élèves requise'],
        ['Convocations professeurs', 'Surveillances seules', 'exportConvocationTeachersSurveillanceOnly', 'fa-user-tie', hasPlanning, 'Planning surveillants requis'],
        ['Convocations AESH', 'Convocations individuelles AESH', 'exportAeshConvocationsPDF', 'fa-hands-helping', hasAeshSelection, 'Sélection AESH requise'],
        ['Pochettes organisation', 'Choisir les pochettes logistiques A3', 'nav:sec-orga', 'fa-folder-open', true, ''],
        ['Pochettes surveillants', 'Pochettes de surveillance', 'exportPochettesPDF', 'fa-folder', hasPlanning, 'Planning surveillants requis']
    ];

    const rows = packItems.map(([label, detail, fnName, icon, ready, missingReason]) => {
        const isNav = fnName.startsWith('nav:');
        const available = isNav || typeof window[fnName] === 'function' || typeof globalThis[fnName] === 'function';
        const enabled = available && ready;
        const actionLabel = isNav ? 'Ouvrir' : 'Générer';
        const action = isNav ? `onclick="runFinalPackExport('${fnName}')"` : `onclick="runFinalPackExport('${fnName}')"`;
        return `
            <div style="display:grid; grid-template-columns:34px 1fr auto; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid #ecf0f1;">
                <i class="fas ${icon}" style="color:${enabled ? '#2980b9' : ready ? '#95a5a6' : '#f39c12'};"></i>
                <div>
                    <div style="font-weight:bold; color:#2c3e50;">${escapeHTML(label)}</div>
                    <div style="font-size:0.84rem; color:#7f8c8d;">${escapeHTML(detail)}${!ready ? ` - ${escapeHTML(missingReason)}` : ''}</div>
                </div>
                <button class="btn ${enabled ? 'btn-primary' : 'btn-secondary'}" ${enabled ? action : 'disabled'} style="padding:7px 12px;">${actionLabel}</button>
            </div>
        `;
    }).join('');

    overlay.innerHTML = `
        <div style="background:white; width:min(760px, 96vw); max-height:88vh; overflow:auto; border-radius:10px; box-shadow:0 15px 40px rgba(0,0,0,0.25); padding:22px;">
            <div style="display:flex; justify-content:space-between; gap:15px; align-items:start; border-bottom:1px solid #ecf0f1; padding-bottom:12px;">
                <div>
                    <h3 style="margin:0; color:#2c3e50;">Pack final d’examen</h3>
                    <div style="color:#7f8c8d; margin-top:4px;">${escapeHTML(typeof getExamSessionLabel === 'function' ? getExamSessionLabel() : 'Session')}</div>
                </div>
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay-custom').remove()">Fermer</button>
            </div>
            <div style="margin:14px 0; padding:12px; border-radius:8px; background:${status.readyErrors > 0 ? '#fdedec' : status.readyWarnings > 0 ? '#fef9e7' : '#eafaf1'}; color:#2c3e50;">
                ${status.readyErrors > 0 ? `${status.readyErrors} anomalie(s) critique(s) à corriger avant impression.` : status.readyWarnings > 0 ? `${status.readyWarnings} point(s) de vigilance détecté(s).` : 'Contrôles principaux au vert.'}
            </div>
            ${rows}
        </div>
    `;
    document.body.appendChild(overlay);
}

function runFinalPackExport(fnName) {
    if (fnName && fnName.startsWith('nav:')) {
        document.querySelector('.modal-overlay-custom')?.remove();
        goDashboardTarget(fnName.replace('nav:', ''));
        return;
    }
    const fn = window[fnName] || globalThis[fnName];
    if (typeof fn !== 'function') return showToast('Export indisponible dans cette configuration.', 'warning');
    try {
        fn();
    } catch (error) {
        console.error(error);
        showAlertModal(`Export impossible : ${error.message}`, 'error');
    }
}

function exportDashboardPrepPDF() {
    if (!window.jspdf) return showToast("Librairie PDF non chargée.", 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const status = getDashboardStatus();
    const steps = getPreparationSteps(status);
    let y = typeof drawExamPdfHeader === 'function'
        ? drawExamPdfHeader(doc, { title: "Synthèse de préparation", y: 8, logoSize: 28 })
        : 22;

    if (typeof drawExamPdfHeader !== 'function') {
        doc.setFontSize(16);
        doc.text("Synthèse de préparation", 105, 15, { align: 'center' });
    }

    doc.setFontSize(11);
    doc.setTextColor(44, 62, 80);
    doc.text(`Contrôles critiques : ${status.readyErrors} | Points de vigilance : ${status.readyWarnings}`, 14, y);
    y += 8;
    doc.text(`Journal jour J : ${status.metrics.examDayLogCount} événement(s), ${status.metrics.attendanceCount} absence/retard, checklist ${status.metrics.examDayChecklistDone}/${status.metrics.examDayChecklistTotal}`, 14, y);
    y += 8;

    doc.autoTable({
        head: [['Étape', 'Statut', 'Détail']],
        body: steps.map((step, index) => [
            `${index + 1}. ${step.label}`,
            step.done ? 'OK' : step.warning ? 'À vérifier' : 'À faire',
            step.detail
        ]),
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' } },
        didParseCell: data => {
            if (data.section === 'body' && data.column.index === 1) {
                const value = data.cell.raw;
                if (value === 'OK') data.cell.styles.textColor = [39, 174, 96];
                else if (value === 'À vérifier') data.cell.styles.textColor = [243, 156, 18];
                else data.cell.styles.textColor = [192, 57, 43];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    y = doc.lastAutoTable.finalY + 10;
    if (status.issues.length > 0) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text("Anomalies et vigilances", 14, y);
        y += 5;
        doc.autoTable({
            head: [['Type', 'Point', 'Détail', 'Action']],
            body: status.issues.map(issue => [
                issue.severity === 'error' ? 'Critique' : 'Vigilance',
                issue.title,
                issue.detail,
                issue.action
            ]),
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 48 }, 3: { cellWidth: 30 } }
        });
    } else {
        doc.setFontSize(12);
        doc.setTextColor(39, 174, 96);
        doc.text("Aucune anomalie détectée sur les contrôles principaux.", 14, y);
    }

    doc.save(`Synthese_Preparation_${(DB.config.schoolName || 'Examen').replace(/[^a-zA-Z0-9]+/g, '_')}_${DB.config.year || ''}.pdf`);
}

window.addEventListener('load', () => {
    setTimeout(() => {
        if (document.getElementById('dashboard')?.classList.contains('active')) renderDashboard();
        renderExamDayLog();
        renderExamDayChecklist();
        renderExamAttendance();
    }, 250);
});
