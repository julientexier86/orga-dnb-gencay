// --- NAVIGATION ET UI ---
function nav(id, btn) {
    // 1. Masquer toutes les sections
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));

    // 2. Afficher la section demandée (sécurité si l'ID n'existe pas)
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    else console.error("Section introuvable : " + id);

    // 3. Gestion des boutons actifs (Menu)
    document.querySelectorAll('.menu-item, .submenu-item').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');

    // 4. Gestion des sous-menus (Garder le parent allumé)
    if (btn.classList.contains('submenu-item')) {
        let pid = "";
        if (id.startsWith('data-')) pid = "btnData";
        else if (id.startsWith('res-')) pid = "btnRes";
        else if (id.startsWith('convoc-')) pid = "btnConvoc";
        else if (id.startsWith('planning-')) pid = "btnPlanning";
        else if (id.startsWith('sec-oral-')) pid = "btnOralDNB";

        if (pid) {
            const parent = document.getElementById(pid);
            if (parent) parent.classList.add('active');
        }
    }

    // 5. Déclencheurs spécifiques (Rafraichissement des données)
    if (id === 'data-eleves') if(typeof renderStudents === 'function') renderStudents();
    if (id === 'organization') if(typeof renderVisualDistribution === 'function') renderVisualDistribution();

    if (id === 'planning-rooms') if(typeof renderPlanning === 'function') renderPlanning();
    if (id === 'planning-profs') if(typeof renderPlanningProfs === 'function') renderPlanningProfs();

    if (id === 'res-import') if(typeof renderGrades === 'function') renderGrades();
    if (id === 'res-simul') if(typeof renderSimulation === 'function') renderSimulation();
    if (id === 'res-datavis') if(typeof renderDatavisStats === 'function') renderDatavisStats();
    if (id === 'data-amenagements') {
        if(typeof renderAmenagements === 'function') renderAmenagements();
        if(typeof renderLabels === 'function') renderLabels();
    }
    if (id === 'stage-orals') {
        if(typeof renderStageConfigUI === 'function') renderStageConfigUI();
        if(typeof renderJuriesList === 'function') renderJuriesList();
        if(typeof renderStagePlanning === 'function') renderStagePlanning();
    }

    // --- MODULE ORAL DNB V2.7 (DB.oralConfig) ---
    if (id === 'sec-oral-config') if(typeof refreshOralConfigUI === 'function') refreshOralConfigUI();
    if (id === 'sec-oral-jurys') if(typeof renderOralTeachersTable === 'function') renderOralTeachersTable();
    if (id === 'sec-oral-eleves') if(typeof renderOralStudentsTable === 'function') renderOralStudentsTable();
    if (id === 'sec-oral-repart') if(typeof renderOralVisualDistribution === 'function') renderOralVisualDistribution();
    if (id === 'sec-oral-grille') if(typeof renderOralGrilleConfig === 'function') renderOralGrilleConfig();
    if (id === 'sec-oral-import') if(typeof initOralNotesMenu === 'function') initOralNotesMenu();
    if (id === 'sec-oral-resultats') if(typeof renderOralResultsTable === 'function') renderOralResultsTable();
    if (id === 'sec-oral-harmonisation') if(typeof renderOralHarmonisation === 'function') renderOralHarmonisation();
    if (id === 'sec-oral-dataviz') if(typeof renderOralDataViz === 'function') renderOralDataViz();
    // ---------------------------------------------
}

function navStage(subId, btn) {
    try {
        console.log("NavStage called with:", subId);

        // 1. Visuel Onglets
        const tabs = document.querySelectorAll('.stage-tab');
        if (tabs) tabs.forEach(el => el.classList.remove('active'));
        if (btn) btn.classList.add('active');

        // 2. Visuel Sections
        const sections = document.querySelectorAll('.stage-sub-section');
        if (sections) sections.forEach(el => el.classList.remove('active'));

        const target = document.getElementById('stage-' + subId);
        if (target) {
            target.classList.add('active');
        } else {
            console.error("Stage section not found: stage-" + subId);
            return;
        }

        // 3. Refresh Data
        if (!DB || !DB.stage) {
            console.warn("DB.stage not ready yet.");
            return;
        }

        if (subId === 'config') if(typeof renderStageConfigUI === 'function') renderStageConfigUI();
        if (subId === 'juries') if(typeof renderJuriesList === 'function') renderJuriesList();
        if (subId === 'planning') if(typeof renderStagePlanning === 'function') renderStagePlanning();
    } catch (e) {
        console.error("Error in navStage:", e);
    }
}

function toggleSubmenu(id, btn) {
    // 1. On ferme TOUS les autres sous-menus
    document.querySelectorAll('.submenu').forEach(el => {
        if (el.id !== id) {
            el.classList.remove('open');
        }
    });

    // 2. On bascule celui qu'on vient de cliquer
    const target = document.getElementById(id);
    if (target) target.classList.toggle('open');

    // 3. Gestion de la couleur "Active" sur le bouton principal
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function toggleLock(type) { 
    DB.uiState.locked[type] = !DB.uiState.locked[type]; 
    updateLockUI(type); 
}

function updateLockUI(type) {
    const locked = DB.uiState.locked[type];
    const btn = document.getElementById(`lock-${type}`);
    if (btn) { 
        if (locked) { 
            btn.innerHTML = "🔒 Déverrouiller"; 
            btn.classList.add('locked'); 
        } else { 
            btn.innerHTML = "🔓 Verrouiller"; 
            btn.classList.remove('locked'); 
        } 
    }
    const wrapper = document.getElementById(`wrapper-${type}`); 
    const actions = document.getElementById(`actions-${type}`);
    if (locked) { 
        if (wrapper) wrapper.classList.add('is-locked-hidden'); 
        if (actions) actions.classList.add('is-locked-hidden'); 
    } else { 
        if (wrapper) wrapper.classList.remove('is-locked-hidden'); 
        if (actions) actions.classList.remove('is-locked-hidden'); 
    }
    
    if (type === 'students' && typeof renderStudents === 'function') renderStudents(); 
    if (type === 'rooms' && typeof renderRooms === 'function') renderRooms(); 
    if (type === 'teachers' && typeof renderTeachers === 'function') renderTeachers();
}
