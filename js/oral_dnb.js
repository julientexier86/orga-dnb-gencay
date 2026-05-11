// ============================================================
// MODULE ORAL DNB V2.7 (DB.oralConfig)
// Système parallèle à stage-orals (DB.stage)
// Ne pas modifier sans comprendre l'architecture globale
// ============================================================

function setupOralDatabase() {
    // 1. Assurer l'existence de l'objet global DB
    if (typeof DB === 'undefined') window.DB = {};
    
    // 2. Création de la structure si elle n'existe pas du tout
    if (!DB.oralConfig) {
        DB.oralConfig = {
            general: { name: "", date: "", start: "", end: "" },
            pauses: [],
            languages: [],
            themes: { "Parcours Avenir": [], "Parcours Citoyen": [], "Parcours PEAC": [], "Parcours Santé": [], "Histoire des Arts": [], "EPI": [] },
            students: [],
            teachers: [],
            distribution: {}, // Le tiroir pour stocker les jurys et créneaux
            
            // --- Création initiale de la grille d'évaluation ---
            grille: {
                prestation: { maxPoints: 8, criteres: [] },
                contenu: { maxPoints: 12, criteres: [] },
                bonus: { enabled: true, maxPoints: 2, niveaux: [0, 1, 2] }
            }
            // -----------------------------------------------------------
        };
    }
    
    // 3. --- SÉCURITÉ POUR LES ANCIENNES SAUVEGARDES (Migration) ---
    // Si on charge un ancien fichier qui n'avait pas encore ces tiroirs, on les crée.
    if (!DB.oralConfig.teachers) DB.oralConfig.teachers = [];
    if (!DB.oralConfig.students) DB.oralConfig.students = [];
    if (!DB.oralConfig.pauses) DB.oralConfig.pauses = [];
    if (!DB.oralConfig.languages) DB.oralConfig.languages = [];
    if (!DB.oralConfig.general) DB.oralConfig.general = {};
    if (!DB.oralConfig.themes) DB.oralConfig.themes = { "Parcours Avenir": [], "Parcours Citoyen": [], "Parcours PEAC": [], "Parcours Santé": [], "Histoire des Arts": [], "EPI": [] };
    if (!DB.oralConfig.distribution) DB.oralConfig.distribution = {}; 
    
    // --- Sécurisation du tiroir de la grille pour les anciens fichiers ---
    if (!DB.oralConfig.grille) {
        DB.oralConfig.grille = {
            prestation: { maxPoints: 8, criteres: [] },
            contenu: { maxPoints: 12, criteres: [] },
            bonus: { enabled: true, maxPoints: 2, niveaux: [0, 1, 2] }
        };
    }
    // -----------------------------------------------------------------------------

    // 4. Le Pont : on lie le travail en cours à la base de données
    window.oralConfig = DB.oralConfig;
}

/**
 * @why Étape 2 : Lancer l'initialisation modifiée
 */
function launchApp() {
    setupOralDatabase();
    
    if (typeof initOralConfiguration === 'function') {
        initOralConfiguration();
    }
    if (typeof renderOralStudentsTable === 'function') {
        renderOralStudentsTable();
    }
}

// Sécurité : lancement automatique au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchApp);
} else {
    launchApp();
}

function initOralConfiguration() {
    
    // --- 1. GESTION DES CHAMPS GÉNÉRAUX (NOM, DATE, HORAIRES) ---
    const generalFields = {
        'oral-name': 'name',
        'oral-date': 'date',
        'oral-start': 'start',
        'oral-end': 'end'
    };

    function renderOralGeneral() {
        const gen = window.oralConfig.general || {};
        Object.entries(generalFields).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.value = gen[key] || "";
        });
    }

    // Sauvegarde auto des champs textes généraux
Object.entries(generalFields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('has-listener')) {
        el.addEventListener('input', () => {
            window.oralConfig.general[key] = el.value;
            // ON AJOUTE CECI : déclenche l'autosave globale si elle existe
            if(typeof autoSave === 'function') autoSave(); 
        });
        el.classList.add('has-listener');
    }
});
    // --- 2. GESTION DES PAUSES ---
    const pauseStart = document.getElementById('pause-start');
    const pauseEnd = document.getElementById('pause-end');
    const pauseLabel = document.getElementById('pause-label');
    const btnAddPause = document.getElementById('btn-add-pause');
    const pauseList = document.getElementById('pause-list');

    function renderPauses() {
        if (!pauseList) return;
        pauseList.innerHTML = '';
        if (!window.oralConfig.pauses) window.oralConfig.pauses = [];
        window.oralConfig.pauses.sort((a, b) => a.start.localeCompare(b.start));
        
        window.oralConfig.pauses.forEach((pause, index) => {
            const text = `☕ ${pause.start} - ${pause.end} : ${pause.label || 'Pause'}`;
            const item = createBadge(text, () => {
                window.oralConfig.pauses.splice(index, 1);
                renderPauses();
            }, true);
            pauseList.appendChild(item);
        });
    }

    if (btnAddPause && !btnAddPause.classList.contains('has-listener')) {
        btnAddPause.addEventListener('click', () => {
            const start = pauseStart.value;
            const end = pauseEnd.value;
            const label = pauseLabel.value.trim();
            
            if (start && end && start < end) {
                window.oralConfig.pauses.push({ start, end, label });
                pauseStart.value = ''; pauseEnd.value = ''; pauseLabel.value = '';
                renderPauses();
            } else {
                alert("Veuillez saisir une heure de début et de fin valides pour la pause.");
            }
        });
        btnAddPause.classList.add('has-listener');
    }

    // --- 3. GESTION DES LANGUES ---
    const langInput = document.getElementById('new-language-input');
    const langBtn = document.getElementById('btn-add-language');
    const langList = document.getElementById('language-list');

    function renderLanguages() {
        if (!langList) return;
        langList.innerHTML = '';
        if (!window.oralConfig.languages) window.oralConfig.languages = [];
        window.oralConfig.languages.forEach((lang, index) => {
            const badge = createBadge(lang, () => {
                window.oralConfig.languages.splice(index, 1);
                renderLanguages();
            });
            langList.appendChild(badge);
        });
    }

    if (langBtn && !langBtn.classList.contains('has-listener')) {
        langBtn.addEventListener('click', () => {
            const val = langInput.value.trim();
            if (val && !window.oralConfig.languages.includes(val)) {
                window.oralConfig.languages.push(val);
                langInput.value = '';
                renderLanguages();
            }
        });
        langBtn.classList.add('has-listener');
    }

    // --- 4. GESTION DES THÈMES & PARCOURS (GRILLE) ---
    const gridContainer = document.getElementById('themes-grid-container');
    const btnAddMainTheme = document.getElementById('btn-add-main-theme');
    const newMainThemeInput = document.getElementById('new-main-theme-input');

    if (btnAddMainTheme && !btnAddMainTheme.classList.contains('has-listener')) {
        btnAddMainTheme.addEventListener('click', () => {
            const name = newMainThemeInput.value.trim();
            if (name && !window.oralConfig.themes[name]) {
                window.oralConfig.themes[name] = []; 
                newMainThemeInput.value = '';
                renderThemesGrid(); 
            }
        });
        btnAddMainTheme.classList.add('has-listener');
    }

    function renderThemesGrid() {
        if (!gridContainer) return;
        gridContainer.innerHTML = ''; 
        
        Object.keys(window.oralConfig.themes).forEach(themeName => {
            const row = document.createElement('div');
            row.style.cssText = 'display: grid; grid-template-columns: 250px 1fr; gap: 20px; padding: 15px 10px; border-bottom: 1px solid #eee; align-items: start; transition: background 0.2s;';
            row.onmouseenter = () => row.style.backgroundColor = '#fcfcfc';
            row.onmouseleave = () => row.style.backgroundColor = 'transparent';

            const colLeft = document.createElement('div');
            colLeft.style.cssText = 'font-weight: 600; color: #2c3e50; font-size: 0.95em; display: flex; justify-content: space-between; align-items: center;';
            colLeft.innerHTML = `<span>${themeName}</span>`;
            
            const officialThemes = ["Parcours Avenir", "Parcours Citoyen", "Parcours PEAC", "Parcours Santé", "Histoire des Arts", "EPI"];
            if (!officialThemes.includes(themeName)) {
                const delThemeBtn = document.createElement('button');
                delThemeBtn.innerHTML = '🗑️';
                delThemeBtn.setAttribute('aria-label', `Supprimer le parcours ${themeName}`);
                delThemeBtn.style.cssText = 'background:none; border:none; cursor:pointer; font-size: 1em; opacity: 0.6;';
                delThemeBtn.onclick = () => { 
                    if(confirm(`Êtes-vous sûr de vouloir supprimer l'intitulé "${themeName}" et tous ses sujets ?`)) { 
                        delete window.oralConfig.themes[themeName]; 
                        renderThemesGrid(); 
                    } 
                };
                colLeft.appendChild(delThemeBtn);
            }

            const colRight = document.createElement('div');
            colRight.innerHTML = `
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" placeholder="Ajouter un sujet/problématique..." style="flex:1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em; box-sizing: border-box;">
                    <button class="btn-sub" style="background:#2ecc71; color:white; border:none; padding: 8px 15px; border-radius:4px; cursor:pointer; font-size: 0.9em; font-weight: bold;">+ Ajouter</button>
                </div>
                <div class="list-sub" style="display: flex; flex-direction: column; gap: 5px;"></div>
            `;

            const subInput = colRight.querySelector('input');
            const subBtn = colRight.querySelector('.btn-sub');
            const subList = colRight.querySelector('.list-sub');

            function renderSubs() {
                subList.innerHTML = '';
                window.oralConfig.themes[themeName].forEach((sub, idx) => {
                    const item = createBadge(sub, () => {
                        window.oralConfig.themes[themeName].splice(idx, 1);
                        renderSubs();
                    }, true);
                    subList.appendChild(item);
                });
            }

            subBtn.onclick = () => {
                const val = subInput.value.trim();
                if(val) {
                    window.oralConfig.themes[themeName].push(val);
                    subInput.value = '';
                    renderSubs();
                }
            };

            renderSubs();
            row.appendChild(colLeft);
            row.appendChild(colRight);
            gridContainer.appendChild(row);
        });
    }

    // --- 5. FACTORY : CRÉATION DES BADGES VISUELS ---
    function createBadge(text, onDelete, isList = false) {
        const el = document.createElement('div');
        el.style.cssText = isList 
            ? 'display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em;'
            : 'display: inline-flex; align-items: center; background: #e0eaf1; color: #2c3e50; padding: 6px 12px; border-radius: 15px; font-size: 0.85em; font-weight: 500;';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '×';
        delBtn.setAttribute('aria-label', `Supprimer`);
        delBtn.style.cssText = isList
            ? 'background: none; border: none; color: #e74c3c; cursor: pointer; font-weight: bold; font-size: 1.5em; padding: 0 5px; line-height: 1;'
            : 'background: none; border: none; margin-left: 8px; cursor: pointer; font-weight: bold; color: #7f8c8d; font-size: 1.2em; padding: 0; line-height: 1;';
        
        delBtn.addEventListener('click', onDelete);
        el.appendChild(textSpan); el.appendChild(delBtn);
        return el;
    }

    // --- 6. INITIALISATION DE TOUS LES AFFICHAGES ---
    renderOralGeneral();
    renderPauses();
    renderLanguages();
    renderThemesGrid();
}


// --- GESTION DES ÉLÈVES ---

function openIntegrationModal() {
    if (!DB.students || DB.students.length === 0) {
        return alert("Aucun élève trouvé dans la base principale (Menu Données).");
    }
    const choice = confirm("Voulez-vous intégrer les élèves de la base ?\n\nOK : Compléter la liste actuelle\nANNULER : Écraser la liste actuelle et repartir à zéro");
    if (choice === null) return; 

    integrateStudents(confirm("Cliquez sur OK pour COMPLÉTER ou ANNULER pour TOUT ÉCRASER") ? "append" : "overwrite");
}

function integrateStudents(mode) {
    if (mode === "overwrite") window.oralConfig.students = [];

    DB.students.forEach(s => {
        const exists = window.oralConfig.students.find(os => os.id === s.id);
        if (!exists) {
            window.oralConfig.students.push({
                id: s.id, 
                nom: s.nom, 
                prenom: s.prenom, 
                classe: s.classe,
                sexe: s.sexe || "?", // 👈 NOUVEAUTÉ : On récupère le sexe de la base de données
                langue: "", 
                parcours: "", 
                sujet: "", 
                groupId: null
            });
        }
    });
    renderOralStudentsTable();
}

/**
 * @why Génère une matrice Excel de saisie robuste et interopérable (Excel/LibreOffice).
 * Utilise un système de double onglet (Saisie + Référentiel) pour pallier l'absence de 
 * listes déroulantes natives dans la version gratuite de SheetJS, tout en garantissant 
 * l'intégrité des données saisies par les enseignants.
 */
window.exportOralDataEntryTemplate = function() {
    if (typeof XLSX === 'undefined') return alert("⚠️ La librairie XLSX n'est pas chargée.");
    
    // On s'assure qu'il y a des élèves dans la base générale du collège
    if (!DB.students || DB.students.length === 0) {
        return alert("⚠️ Aucun élève dans la base générale. Importez d'abord vos élèves dans le menu principal.");
    }

    const wb = XLSX.utils.book_new();

    // ==========================================
    // ONGLET 1 : La Matrice de Saisie
    // ==========================================
    const wsData = [
        ["Nom", "Prénom", "Classe", "Sexe", "Langue", "Groupe", "Parcours", "Sujet"]
    ];

    // Tri par classe puis par ordre alphabétique pour faciliter la lecture par les PP
    const sortedStudents = [...DB.students].sort((a,b) => 
        (a.classe || "").localeCompare(b.classe || "") || 
        (a.nom || "").localeCompare(b.nom || "")
    );

    sortedStudents.forEach(s => {
        // Si l'élève a déjà des données orales, on les pré-remplit, sinon on met le tiret par défaut
        wsData.push([
            s.nom, 
            s.prenom, 
            s.classe || "N/C", 
            s.sexe || "M", 
            s.langue || "-", 
            s.groupId ? "En groupe" : "Individuel", 
            s.parcours || "-", 
            s.sujet || "-"
        ]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ergonomie : Élargissement des colonnes pour la lisibilité
    ws1['!cols'] = [
        {wch: 25}, // Nom
        {wch: 20}, // Prénom
        {wch: 10}, // Classe
        {wch: 8},  // Sexe
        {wch: 15}, // Langue
        {wch: 15}, // Groupe
        {wch: 30}, // Parcours
        {wch: 45}  // Sujet
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "1_Saisie_Candidats");

    // ==========================================
    // ONGLET 2 : Le Référentiel (Documentation)
    // ==========================================
    const refData = [
        ["⚠️ INFORMATIONS DE SAISIE"],
        ["Veuillez copier-coller les valeurs ci-dessous dans l'onglet '1_Saisie_Candidats' pour éviter les erreurs d'importation dans le logiciel."],
        [],
        ["🌍 LANGUES DISPONIBLES :"],
        ["-"], // Valeur par défaut
    ];

    // Injection dynamique des langues configurées
    if (DB.oralConfig && DB.oralConfig.languages) {
        DB.oralConfig.languages.forEach(l => refData.push([l]));
    } else {
        refData.push(["(Aucune langue configurée dans le logiciel)"]);
    }

    refData.push(
        [],
        ["👥 OPTIONS DE GROUPE :"],
        ["Individuel"],
        ["En groupe"],
        [],
        ["🎯 PARCOURS ET SUJETS ASSOCIÉS :"],
        ["-"] // Valeur par défaut
    );

    // Injection dynamique de l'arborescence Parcours -> Sujets
    if (DB.oralConfig && DB.oralConfig.themes) {
        Object.keys(DB.oralConfig.themes).forEach(theme => {
            refData.push([`▶ PARCOURS : ${theme}`]);
            const subjects = DB.oralConfig.themes[theme];
            if (subjects && subjects.length > 0) {
                subjects.forEach(sub => refData.push([`    ↳ SUJET : ${sub}`]));
            } else {
                refData.push([`    ↳ (Aucun sujet configuré)`]);
            }
        });
    } else {
        refData.push(["(Aucun parcours configuré dans le logiciel)"]);
    }

    const ws2 = XLSX.utils.aoa_to_sheet(refData);
    ws2['!cols'] = [{wch: 90}]; // Colonne très large pour lire les longs sujets
    XLSX.utils.book_append_sheet(wb, ws2, "2_Données_Référence");

    // ==========================================
    // EXPORTATION
    // ==========================================
    const year = DB.config.year || new Date().getFullYear();
    XLSX.writeFile(wb, `Matrice_Saisie_Oral_${year}.xlsx`);
};

/**
 * @why Ingère la matrice Excel et met à jour les données des candidats à l'oral en mémoire.
 * Version expurgée de l'auto-sauvegarde pour laisser le contrôle du fichier à l'utilisateur.
 * Cible le sous-objet DB.oralConfig.students et gère l'auto-intégration.
 * 
 * @param {Event} event - L'événement onchange de l'input type="file"
 */
window.processOralExcelImport = function(event) {
    if (typeof XLSX === 'undefined') return alert("⚠️ La librairie XLSX n'est pas chargée.");
    
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 1. Ciblage de l'onglet (résilient si renommé par erreur)
            const sheetName = workbook.SheetNames.includes("1_Saisie_Candidats") 
                ? "1_Saisie_Candidats" 
                : workbook.SheetNames[0];
            
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            let successCount = 0;
            let errorCount = 0;

            // SÉCURITÉ : S'assurer que le vivier oral existe
            if (!DB.oralConfig) DB.oralConfig = {};
            if (!DB.oralConfig.students) DB.oralConfig.students = [];

            // 2. Traitement ligne par ligne
            jsonData.forEach(row => {
                const getVal = (keywords) => {
                    const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
                    return key ? String(row[key]).trim() : "";
                };

                const nom = getVal(['nom']);
                const prenom = getVal(['prénom', 'prenom']);
                const langue = getVal(['langue']);
                const groupe = getVal(['groupe']);
                const parcours = getVal(['parcours']);
                const sujet = getVal(['sujet']);

                if (!nom) return; // Ignore les lignes vides

                // 3. Recherche dans le vivier de l'oral (Tolérance majuscules/minuscules)
                let studentOral = DB.oralConfig.students.find(s => 
                    s.nom === nom.toUpperCase() && 
                    (s.prenom || "").toLowerCase() === prenom.toLowerCase()
                );

                // 4. AUTO-INTÉGRATION : S'il n'y est pas, on le récupère du collège global
                if (!studentOral) {
                    const studentGlobal = DB.students.find(s => 
                        s.nom === nom.toUpperCase() && 
                        (s.prenom || "").toLowerCase() === prenom.toLowerCase()
                    );
                    
                    if (studentGlobal) {
                        studentOral = JSON.parse(JSON.stringify(studentGlobal)); // Clone propre
                        DB.oralConfig.students.push(studentOral);
                    }
                }

                // 5. Hydratation des données en mémoire
                if (studentOral) {
                    studentOral.langue = (langue && langue !== "-") ? langue : null;
                    studentOral.parcours = (parcours && parcours !== "-") ? parcours : "Général";
                    studentOral.sujet = (sujet && sujet !== "-") ? sujet : null;

                    // Logique de création de Groupe
                    if (groupe.toLowerCase() === "en groupe" && studentOral.sujet) {
                        const subjectSlug = studentOral.sujet.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
                        studentOral.groupId = `grp_oral_${subjectSlug}`;
                    } else {
                        studentOral.groupId = null;
                    }

                    // Répercussion dans la base globale pour cohérence
                    const studentGlobal = DB.students.find(s => s.nom === nom.toUpperCase() && (s.prenom || "").toLowerCase() === prenom.toLowerCase());
                    if (studentGlobal) {
                        studentGlobal.langue = studentOral.langue;
                        studentGlobal.parcours = studentOral.parcours;
                        studentGlobal.sujet = studentOral.sujet;
                        studentGlobal.groupId = studentOral.groupId;
                    }

                    successCount++;
                } else {
                    errorCount++;
                    console.warn(`⚠️ Élève non reconnu dans le fichier : ${nom} ${prenom}`);
                }
            });

            // 6. Nettoyage et rafraîchissement DOM
            event.target.value = ""; 
            
            // Rafraîchissement du tableau visuel
            if (typeof renderOralStudentsTable === 'function') renderOralStudentsTable();
            
            // Affichage du bilan
            let msg = `✅ Importation réussie ! ${successCount} dossiers ont été mis à jour en mémoire.`;
            if (errorCount > 0) msg += `\n⚠️ ${errorCount} lignes ignorées (Élèves introuvables).`;
            msg += `\n\nN'oubliez pas de sauvegarder votre projet manuellement.`;
            
            alert(msg);

        } catch (err) {
            console.error(err);
            alert("❌ Erreur de lecture. Le fichier est peut-être corrompu ou ouvert dans Excel.");
        }
    };
    
    reader.onerror = () => alert("❌ Échec de la lecture du fichier par le navigateur.");
    reader.readAsArrayBuffer(file);
};

/**
 * @why Exporte l'intégralité des données des candidats à l'oral vers un fichier Excel.
 * Permet au secrétariat ou à la direction d'avoir une vue d'ensemble, d'archiver les choix, 
 * et de vérifier la composition exacte des groupes avant de lancer la répartition algorithmique.
 */
window.exportOralStudentsData = function() {
    if (typeof XLSX === 'undefined') return alert("⚠️ La librairie XLSX n'est pas chargée.");
    
    // Sécurité : Vérification de l'existence des données de l'oral
    if (!DB.oralConfig || !DB.oralConfig.students || DB.oralConfig.students.length === 0) {
        return alert("⚠️ Aucun élève n'est actuellement inscrit dans le vivier de l'épreuve orale.");
    }

    const wb = XLSX.utils.book_new();

    // 1. Initialisation des en-têtes de colonnes
    const wsData = [
        ["Nom", "Prénom", "Classe", "Sexe", "Langue", "Type de passage", "Parcours", "Sujet", "Composition du groupe"]
    ];

    // 2. Tri pour une lecture plus aisée (par classe puis par ordre alphabétique)
    const sortedStudents = [...DB.oralConfig.students].sort((a,b) => 
        (a.classe || "").localeCompare(b.classe || "") || 
        (a.nom || "").localeCompare(b.nom || "")
    );

    // 3. Moteur d'extraction et de formatage des lignes
    sortedStudents.forEach(student => {
        let composition = "-";

        // Détection et formatage des membres du groupe
        if (student.groupId) {
            const groupMembers = DB.oralConfig.students.filter(s => s.groupId === student.groupId);
            // On formate la liste des noms (ex: "DUPONT Jean, MARTIN Alice")
            composition = groupMembers.map(m => `${m.nom.toUpperCase()} ${m.prenom}`).join(", ");
        }

        wsData.push([
            student.nom,
            student.prenom,
            student.classe || "N/C",
            student.sexe || "M",
            student.langue || "-",
            student.groupId ? "En groupe" : "Individuel",
            student.parcours || "Général",
            student.sujet || "-",
            composition // La colonne calculée dynamiquement
        ]);
    });

    // 4. Création de la feuille et ajustement ergonomique des colonnes
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    ws['!cols'] = [
        {wch: 25}, // Nom
        {wch: 20}, // Prénom
        {wch: 10}, // Classe
        {wch: 8},  // Sexe
        {wch: 15}, // Langue
        {wch: 15}, // Type de passage
        {wch: 30}, // Parcours
        {wch: 45}, // Sujet
        {wch: 50}  // Composition groupe (Large pour contenir plusieurs noms)
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Donnees_Oral");

    // 5. Sauvegarde du fichier
    const year = DB.config.year || new Date().getFullYear();
    XLSX.writeFile(wb, `Export_Complet_Oral_${year}.xlsx`);
};

function renderOralStudentsTable() {
    const body = document.getElementById('oral-students-body');
    const searchInput = document.getElementById('search-oral-student');
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    if (!body) return;

    body.innerHTML = '';
    
    window.oralConfig.students.forEach(s => {
        if (s.nom.toLowerCase().includes(search) || s.classe.toLowerCase().includes(search)) {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            tr.style.cursor = "pointer";
            
            tr.onmouseenter = () => tr.style.backgroundColor = "#f8f9fa";
            tr.onmouseleave = () => tr.style.backgroundColor = "transparent";
            
            tr.onclick = (e) => { 
                if(e.target.tagName !== 'BUTTON') openEditModal(s.id); 
            };
            
            // J'ai ajouté la ligne <td> pour le sexe juste après la classe
            tr.innerHTML = `
                <td style="padding: 12px;"><b>${s.nom.toUpperCase()}</b> ${s.prenom}</td>
                <td style="padding: 12px;"><span style="background:#eee; padding:2px 6px; border-radius:4px; font-size:0.85em;">${s.classe}</span></td>
                <td style="padding: 12px; font-weight: bold; color: #7f8c8d;">${s.sexe || '?'}</td>
				<td style="padding: 12px; text-align:center; font-size: 1.2rem;"><span onclick="event.stopPropagation(); togglePriority('${s.id}')" style="cursor:pointer; filter: ${s.isPriority ? 'none' : 'grayscale(1) opacity(0.2)'};" title="${s.isPriority ? 'Prioritaire' : 'Cliquer pour rendre prioritaire'}">⭐</span></td>
                <td style="padding: 12px;">${s.langue || '-'}</td>
                <td style="padding: 12px;">${s.groupId ? '👥 <small>En groupe</small>' : '👤 <small>Individuel</small>'}</td>
                <td style="padding: 12px;">${s.parcours || '-'}</td>
                <td style="padding: 12px; font-size: 0.9em; color: #555;">${s.sujet || '-'}</td>
                <td style="padding: 12px;">
                    <button onclick="openEditModal('${s.id}')" style="background: white; border: 1px solid #3498db; color: #3498db; padding: 5px 10px; border-radius: 4px; cursor:pointer;">Modifier</button>
                </td>
            `;
            body.appendChild(tr);
        }
    });
}

window.togglePriority = function(id) {
    const s = window.oralConfig.students.find(st => st.id == id);
    if (s) {
        s.isPriority = !s.isPriority;
        renderOralStudentsTable();
        if (typeof autoSave === 'function') autoSave();
    }
};

/**
 * @why Ouvre la modal de modification d'un élève et pré-remplit les champs, 
 * y compris la nouvelle option de priorité ⭐.
 */
function openEditModal(studentId) {
    // 1. Recherche de l'élève (gestion flexible du type d'ID)
    const student = window.oralConfig.students.find(s => s.id == studentId);
    if (!student) return;

    // 2. Remplissage des champs de base
    document.getElementById('edit-student-id').value = studentId;
    document.getElementById('edit-modal-title').textContent = `Modification : ${student.nom} ${student.prenom}`;

    // 3. Gestion de la case à cocher Priorité ⭐
    const prioCheckbox = document.getElementById('edit-oral-priority');
    if (prioCheckbox) {
        prioCheckbox.checked = student.isPriority || false;
    }

    // 4. Remplissage dynamique des menus déroulants (Langues)
    const langSelect = document.getElementById('edit-oral-lang');
    langSelect.innerHTML = '<option value="">Aucune</option>' + 
        window.oralConfig.languages.map(l => 
            `<option value="${l}" ${student.langue === l ? 'selected' : ''}>${l}</option>`
        ).join('');

    // 5. Remplissage dynamique des parcours
    const parcoursSelect = document.getElementById('edit-oral-parcours');
    parcoursSelect.innerHTML = '<option value="">Choisir un parcours...</option>' + 
        Object.keys(window.oralConfig.themes).map(t => 
            `<option value="${t}" ${student.parcours === t ? 'selected' : ''}>${t}</option>`
        ).join('');

    // 6. Mise à jour des dépendances (Sujets et Groupes)
    updateSubThemeDropdown(student.sujet);
    refreshGroupDisplay(student);

    // 7. Affichage de la modal
    document.getElementById('modal-edit-student').style.display = 'flex';
}

function updateSubThemeDropdown(selectedSujet = "") {
    const p = document.getElementById('edit-oral-parcours').value;
    const sSelect = document.getElementById('edit-oral-sujet');
    if (!p || !window.oralConfig.themes[p]) {
        sSelect.innerHTML = '<option value="">Sélectionnez d\'abord un parcours</option>';
        return;
    }
    sSelect.innerHTML = window.oralConfig.themes[p].map(s => `<option value="${s}" ${selectedSujet === s ? 'selected' : ''}>${s}</option>`).join('');
}

function refreshGroupDisplay(student) {
    const list = document.getElementById('group-members-list');
    list.innerHTML = '';
    
    if (student.groupId) {
        const members = window.oralConfig.students.filter(s => s.groupId === student.groupId);
        members.forEach(m => {
            const span = document.createElement('span');
            span.style.cssText = "background: #3498db; color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.85em; display: flex; align-items: center; gap: 8px;";
            span.innerHTML = `<span>${m.nom} ${m.prenom} (${m.classe})</span>`;
            
            const delBtn = document.createElement('b');
            delBtn.innerHTML = '×';
            delBtn.style.cursor = 'pointer';
            delBtn.onclick = () => { m.groupId = null; refreshGroupDisplay(student); };
            
            span.appendChild(delBtn);
            list.appendChild(span);
        });
    } else {
        list.innerHTML = '<span style="color:#aaa; font-size:0.9em; padding:5px;">Individuel</span>';
    }

    const addSelect = document.getElementById('add-to-group-select');
    const available = window.oralConfig.students
        .filter(s => s.id !== student.id && (!student.groupId || s.groupId !== student.groupId))
        .sort((a, b) => a.nom.localeCompare(b.nom));

    addSelect.innerHTML = '<option value="">Sélectionner un élève...</option>' + 
        available.map(s => `<option value="${s.id}">${s.nom} ${s.prenom} [${s.classe}]</option>`).join('');
}

function handleAddMemberClick() {
    const studentId = document.getElementById('edit-student-id').value;
    const addedId = document.getElementById('add-to-group-select').value;
    if (!addedId) return;

    const mainStudent = window.oralConfig.students.find(s => s.id == studentId);
    const targetStudent = window.oralConfig.students.find(s => s.id == addedId);

    if (!mainStudent.groupId) mainStudent.groupId = "GRP-" + Date.now();
    targetStudent.groupId = mainStudent.groupId;
    refreshGroupDisplay(mainStudent);
}

function closeEditModal() {
    document.getElementById('modal-edit-student').style.display = 'none';
}

// L'UNIQUE gestionnaire d'enregistrement mis à jour
document.getElementById('form-edit-student').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-student-id').value;
    const student = window.oralConfig.students.find(s => s.id == id);
    if (!student) return;

    // --- 1. RÉCUPÉRATION DES NOUVELLES VALEURS (Y COMPRIS L'ÉTOILE) ---
    const newLang = document.getElementById('edit-oral-lang').value;
    const newParcours = document.getElementById('edit-oral-parcours').value;
    const newSujet = document.getElementById('edit-oral-sujet').value;
    const newPriority = document.getElementById('edit-oral-priority').checked; // <--- BIEN RÉCUPÉRER ICI

    // --- 2. APPLICATION DES MODIFICATIONS ---
    if (student.groupId) {
        // Si l'élève est en groupe, on applique les changements à tout le groupe
        window.oralConfig.students.forEach(s => {
            if (s.groupId === student.groupId) {
                s.langue = newLang;
                s.parcours = newParcours;
                s.sujet = newSujet;
                s.isPriority = newPriority; // <--- APPLIQUÉ AU GROUPE
            }
        });
    } else {
        // Élève individuel
        student.langue = newLang;
        student.parcours = newParcours;
        student.sujet = newSujet;
        student.isPriority = newPriority; // <--- APPLIQUÉ À L'INDIVIDU
    }

    // --- 3. FINALISATION ---
    closeEditModal();
    renderOralStudentsTable(); // Relance le rendu du tableau pour voir l'étoile changer

    // Synchronisation et sauvegarde
    if (typeof syncOralDistributionData === 'function') {
        syncOralDistributionData();
    }
    
    if (typeof autoSave === 'function') {
        autoSave();
    }
});

// ==========================================
// --- GESTION DES PROFESSEURS / JURYS ---
// ==========================================

/**
 * @why Ouvre la modal et génère la liste des profs depuis la DB principale
 * INCLUT UN PATCH DE RÉTROCOMPATIBILITÉ pour réparer les anciens IDs en double.
 */
function openTeacherImportModal() {
    if (!DB.teachers || DB.teachers.length === 0) {
        return alert("Aucun professeur trouvé dans la base principale.");
    }

    // --- DÉBUT DU PATCH DE RÉTROCOMPATIBILITÉ ---
    // 1. On vérifie s'il y a des doublons d'ID dans la base générale
    const seenIds = new Set();
    let hasDuplicateIds = false;
    
    DB.teachers.forEach(t => {
        if (seenIds.has(t.id)) {
            hasDuplicateIds = true;
        }
        seenIds.add(t.id);
    });

    // 2. Si on a détecté des clones, on répare toute la base silencieusement
    if (hasDuplicateIds) {
        console.log("🛠️ Réparation des IDs professeurs (Rétrocompatibilité)...");
        DB.teachers.forEach((t, index) => {
            // On recrée un ID unique pour chacun
            t.id = "FIX-" + Date.now() + "-" + index;
        });
        
        // On déclenche une sauvegarde automatique pour acter la réparation
        if (typeof autoSave === 'function') autoSave(); 
    }
    // --- FIN DU PATCH ---

    const listDiv = document.getElementById('import-teachers-list');
    listDiv.innerHTML = '';
    document.getElementById('chk-all-teachers').checked = false;

    const sortedProfs = [...DB.teachers].sort((a, b) => a.nom.localeCompare(b.nom));

    sortedProfs.forEach(p => {
        const isAlreadyIn = window.oralConfig.teachers.some(ot => ot.id === p.id);
        
        // Création de la ligne en mode Grille pour un alignement parfait
        const row = document.createElement('div');
        row.style.cssText = `
            display: grid; 
            grid-template-columns: 50px 250px 1fr; 
            align-items: center; 
            padding: 12px 15px; 
            border-bottom: 1px solid #f1f1f1; 
            cursor: pointer;
            transition: background 0.1s;
        `;
        
        // Effet de survol
        row.onmouseenter = () => row.style.background = "#f8fbff";
        row.onmouseleave = () => row.style.background = "transparent";
        
        // Cliquer sur la ligne coche la case
        row.onclick = (e) => {
            if(e.target.type !== 'checkbox') {
                const chk = row.querySelector('input');
                chk.checked = !chk.checked;
            }
        };

        // Note : J'ai ajouté "p.matiere || p.matieres" pour gérer les deux orthographes selon l'import
        row.innerHTML = `
            <div><input type="checkbox" class="chk-import-prof" value="${p.id}" ${isAlreadyIn ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;"></div>
            <div style="font-weight: 600; color: #2c3e50;">${p.nom.toUpperCase()} <span style="font-weight: 400;">${p.prenom}</span></div>
            <div style="color: #7f8c8d; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.matiere || p.matieres || ''}">
                ${p.matiere || p.matieres || '<i style="color:#ccc">Non renseigné</i>'}
            </div>
        `;
        listDiv.appendChild(row);
    });

    document.getElementById('modal-import-teachers').style.display = 'flex';
}

function toggleAllTeachers(isChecked) {
    const checkboxes = document.querySelectorAll('.chk-import-prof');
    checkboxes.forEach(chk => chk.checked = isChecked);
}

/**
 * @why Récupère les cases cochées et met à jour la base de l'oral selon le choix de l'utilisateur.
 * Injecte automatiquement les horaires par défaut de la configuration générale.
 */
function importTeachersToOral(mode) {
    const checkboxes = document.querySelectorAll('.chk-import-prof');
    
    // On liste les IDs de tous les profs cochés
    const selectedIds = Array.from(checkboxes).filter(chk => chk.checked).map(chk => chk.value);
    
    if (selectedIds.length === 0 && mode === 'append') {
        alert("Veuillez sélectionner au moins un professeur pour compléter la liste.");
        return;
    }

    // Si on choisit "Remplacer", on met une sécurité supplémentaire
    if (mode === 'overwrite') {
        if (!confirm("⚠️ ATTENTION : Vous allez effacer tous les professeurs actuellement dans le tableau des jurys...")) {
            return; 
        }
        window.oralConfig.teachers = []; 
    }

    // --- RÉCUPÉRATION DES HORAIRES PAR DÉFAUT ---
    const defaultStart = (window.oralConfig.general && window.oralConfig.general.start) || "08:00";
    const defaultEnd = (window.oralConfig.general && window.oralConfig.general.end) || "17:00";

    // On parcourt les IDs sélectionnés pour les ajouter
    selectedIds.forEach(id => {
        const profDb = DB.teachers.find(p => String(p.id) === String(id));
        
        if (profDb) {
            const exists = window.oralConfig.teachers.find(ot => String(ot.id) === String(id));
            
            if (!exists) {
                window.oralConfig.teachers.push({
                    id: profDb.id,
                    nom: profDb.nom || "",
                    prenom: profDb.prenom || "",
                    matiere: profDb.matieres || profDb.matiere || "N/C", // Harmonisé
                    startTime: defaultStart, // Heure de début par défaut
                    endTime: defaultEnd,     // Heure de fin par défaut
                    langue: "",
                    jury: "",
                    salle: ""
                });
            }
        } else {
            console.warn("Professeur introuvable dans DB.teachers avec l'ID :", id);
        }
    });

    // Fermeture de la modal
    document.getElementById('modal-import-teachers').style.display = 'none';

    // Mise à jour visuelle et sauvegarde
    if (typeof renderOralTeachersTable === 'function') {
        renderOralTeachersTable();
    }
    
    if (typeof autoSave === 'function') {
        autoSave();
    }

    alert(`${selectedIds.length} professeur(s) traité(s) avec les horaires : ${defaultStart} - ${defaultEnd}`);
}

/**
 * @why Rendu du tableau des professeurs avec alignement parfait, 
 * menu déroulant pour les langues, champs éditables pour Jury/Salle,
 * et une NOUVELLE colonne pour la gestion des professeurs de réserve.
 */
function renderOralTeachersTable() {
    const body = document.getElementById('oral-teachers-body');
    const searchInput = document.getElementById('search-oral-teacher');
    const search = searchInput ? searchInput.value.toLowerCase() : "";
    if (!body) return;

    body.innerHTML = '';

    // Tri par numéro de jury
    const sortedTeachers = [...window.oralConfig.teachers].sort((a, b) => {
        return (a.jury || "").localeCompare(b.jury || "", undefined, {numeric: true});
    });

    // Récupération des langues pour le menu déroulant
    const availableLangs = window.oralConfig.languages || [];

    sortedTeachers.forEach(t => {
        if (t.nom.toLowerCase().includes(search) || (t.matiere && t.matiere.toLowerCase().includes(search))) {
            
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            // Ligne légèrement colorée si le prof est de réserve
            tr.style.backgroundColor = t.isReserve ? "#fff3e0" : "white";

            const startTime = t.startTime || (window.oralConfig.general && window.oralConfig.general.start) || "08:00";
            const endTime = t.endTime || (window.oralConfig.general && window.oralConfig.general.end) || "17:00";

            // Construction des options du menu langue
            let langOptions = `<option value="">Aucune</option>`;
            availableLangs.forEach(l => {
                langOptions += `<option value="${l}" ${t.langue === l ? 'selected' : ''}>${l}</option>`;
            });

            // Redistribution des largeurs pour atteindre 100% avec la nouvelle colonne
            tr.innerHTML = `
                <td style="padding: 12px; width: 18%;"><b>${t.nom.toUpperCase()}</b> ${t.prenom || ""}</td>
                
                <td style="padding: 12px; width: 14%; color: #7f8c8d; font-size: 0.85em;">${t.matiere || t.fonction || '-'}</td>
                
                <td style="padding: 12px; width: 20%;">
                    <div style="display: flex; align-items: center; gap: 4px; background: #f8f9fa; padding: 4px; border-radius: 4px; border: 1px solid #dee2e6; width: fit-content;">
                        <input type="time" value="${startTime}" 
                               onchange="updateJuryTime('${t.id}', 'startTime', this.value)"
                               style="border:none; background:transparent; font-size: 0.85em; width:70px;">
                        <span>-</span>
                        <input type="time" value="${endTime}" 
                               onchange="updateJuryTime('${t.id}', 'endTime', this.value)"
                               style="border:none; background:transparent; font-size: 0.85em; width:70px;">
                    </div>
                </td>
                
                <td style="padding: 12px; width: 8%; text-align: center;">
                    <input type="checkbox" 
                           ${t.isReserve ? 'checked' : ''} 
                           onchange="updateTeacherReserve('${t.id}', this.checked)"
                           style="width: 18px; height: 18px; cursor: pointer; accent-color: #e67e22;"
                           title="Définir comme professeur de réserve">
                </td>

                <td style="padding: 12px; width: 12%;">
                    <select onchange="updateTeacherField('${t.id}', 'langue', this.value)"
                            ${t.isReserve ? 'disabled' : ''} 
                            style="width: 100%; padding: 5px; border: 1px solid #eee; border-radius: 4px; font-size: 0.9em; ${t.isReserve ? 'background:#f2f2f2;' : ''}">
                        ${langOptions}
                    </select>
                </td>
                
                <td style="padding: 12px; width: 8%;">
                    <input type="text" value="${t.jury || ''}" 
                           onchange="updateTeacherField('${t.id}', 'jury', this.value)"
                           ${t.isReserve ? 'disabled' : ''} 
                           style="width: 50px; padding: 5px; border: 1px solid #3498db; border-radius: 4px; font-weight: bold; text-align: center; color: #2980b9; ${t.isReserve ? 'background:#f2f2f2; border-color:#ccc;' : ''}">
                </td>
                
                <td style="padding: 12px; width: 8%;">
                    <input type="text" value="${t.salle || ''}" 
                           placeholder="Salle"
                           onchange="updateTeacherField('${t.id}', 'salle', this.value)"
                           ${t.isReserve ? 'disabled' : ''} 
                           style="width: 70px; padding: 5px; border: 1px solid #eee; border-radius: 4px; ${t.isReserve ? 'background:#f2f2f2;' : ''}">
                </td>
                
                <td style="padding: 12px; width: 12%; text-align: center;">
                    <button onclick="deleteOralTeacher('${t.id}')" 
                            style="background: #fadbd8; color: #e74c3c; border: none; padding: 5px 10px; border-radius: 4px; cursor:pointer; font-size: 0.8em;">
                        Supprimer
                    </button>
                </td>
            `;
            body.appendChild(tr);
        }
    });
}

/**
 * @why Gère le basculement d'un professeur en mode "Réserve".
 * Logique métier : Un professeur de réserve ne doit pas avoir de jury, ni de salle assignée.
 * Cette fonction nettoie ces données automatiquement si la case est cochée.
 */
window.updateTeacherReserve = function(teacherId, isChecked) {
    const teacher = window.oralConfig.teachers.find(t => t.id == teacherId);
    if (teacher) {
        teacher.isReserve = isChecked;
        
        if (isChecked) {
            // Nettoyage pour éviter les conflits dans le publipostage
            teacher.jury = "";
            teacher.salle = "";
            teacher.langue = "";
        }
        
        if (typeof autoSave === 'function') {
            autoSave();
        }
        
        // On relance le rendu pour griser/verrouiller les champs (Jury/Salle) et colorer la ligne
        renderOralTeachersTable();
    }
};

/**
 * SUPPRESSION D'UN PROFESSEUR DU MODULE ORAL
 * @why Cette fonction retire un enseignant de la liste des jurys oraux.
 * Elle ne supprime PAS le professeur de la base de données générale du collège.
 * @param {string|number} teacherId - L'identifiant unique du professeur.
 */
window.deleteOralTeacher = function(teacherId) {
    // 1. Récupération du professeur pour personnaliser le message de confirmation
    const teacher = DB.oralConfig.teachers.find(t => String(t.id) === String(teacherId));
    
    if (!teacher) {
        console.error("Professeur introuvable avec l'ID :", teacherId);
        return;
    }

    // 2. Sécurité : Demande de confirmation à l'utilisateur
    const confirmation = confirm(`Voulez-vous vraiment retirer ${teacher.nom.toUpperCase()} ${teacher.prenom} de la liste des jurys ?\n\n(Cette action ne supprimera pas le professeur de la base générale du collège)`);

    if (confirmation) {
        // 3. Filtrage de la liste pour exclure l'ID supprimé
        DB.oralConfig.teachers = DB.oralConfig.teachers.filter(t => String(t.id) !== String(teacherId));

        // 4. Mise à jour de l'interface graphique
        if (typeof renderOralTeachersTable === 'function') {
            renderOralTeachersTable();
        }

        // 5. Sauvegarde automatique si la fonction existe
        if (typeof autoSave === 'function') {
            autoSave();
        }

        // Optionnel : Notification console pour le débug
        console.log(`✅ Professeur ${teacherId} supprimé avec succès du module Oral.`);
    }
};

/**
 * @why Mise à jour générique d'un champ et sauvegarde
 */
function updateTeacherField(id, field, value) {
    const teacher = window.oralConfig.teachers.find(t => t.id == id);
    if (teacher) {
        teacher[field] = value;
        if (typeof autoSave === 'function') autoSave();
        // Si on change le jury ou la salle, on rafraîchit pour la cohérence visuelle
        if (field === 'jury' || field === 'salle') renderOralTeachersTable();
    }
}



// Fonction utilitaire pour la sauvegarde automatique des champs en ligne
window.updateOralTeacher = function(id, field, value) {
    const teacher = window.oralConfig.teachers.find(t => t.id == id);
    if (teacher) {
        teacher[field] = value;
    }
};

window.removeOralTeacher = function(id) {
    if(confirm("Retirer ce professeur de l'épreuve orale ?")) {
        window.oralConfig.teachers = window.oralConfig.teachers.filter(t => t.id != id);
        renderOralTeachersTable();
    }
};

/**
 * @why Ajoute manuellement un professeur directement dans le tableau des jurys de l'oral.
 * Initialise les horaires avec les valeurs par défaut de la configuration générale.
 */
function addManualTeacher(e) {
    e.preventDefault(); // Empêche la page de se recharger
    
    const nom = document.getElementById('manual-teacher-nom').value.trim();
    const prenom = document.getElementById('manual-teacher-prenom').value.trim();
    const matiere = document.getElementById('manual-teacher-matiere').value.trim();
    
    if (!nom) return;

    // Création d'un identifiant unique (EXT = Externe)
    const newId = "EXT-" + Date.now();

    // --- RÉCUPÉRATION DES HORAIRES PAR DÉFAUT ---
    // On va chercher dans la config générale, sinon on met des valeurs de secours
    const defaultStart = (window.oralConfig.general && window.oralConfig.general.start) || "08:00";
    const defaultEnd = (window.oralConfig.general && window.oralConfig.general.end) || "17:00";

    // On l'ajoute à la configuration de l'oral
    window.oralConfig.teachers.push({
        id: newId,
        nom: nom,
        prenom: prenom,
        matiere: matiere || "Externe", // Harmonisé en 'matiere' (sans s) pour correspondre au render
        startTime: defaultStart,       // Applique l'heure de début par défaut
        endTime: defaultEnd,           // Applique l'heure de fin par défaut
        isReserve: false,
		langue: "",
        jury: "",
        salle: ""
    });

    // On vide le formulaire
    document.getElementById('manual-teacher-nom').value = '';
    document.getElementById('manual-teacher-prenom').value = '';
    document.getElementById('manual-teacher-matiere').value = '';
    
    // On ferme la fenêtre
    document.getElementById('modal-manual-teacher').style.display = 'none';

    // On déclenche l'affichage et la sauvegarde automatique
    if (typeof renderOralTeachersTable === 'function') renderOralTeachersTable();
    if (typeof autoSave === 'function') autoSave();
}

/**
 * @why Centralise la mise à jour de l'interface de configuration de l'oral
 * pour garantir que la vue correspond toujours aux données importées.
 */
function renderOralConfig() {
    // 1. Restauration des champs de saisie simples (Modalités et Temps)
    // On vérifie l'existence des éléments du DOM avant de leur assigner une valeur pour éviter les erreurs
    const nameInput = document.getElementById('oral-name');
    const dateInput = document.getElementById('oral-date');
    const startInput = document.getElementById('oral-start');
    const endInput = document.getElementById('oral-end');

    // Note : Adapte "DB.oral" selon la structure exacte de ton objet de sauvegarde
    if (DB.oral) {
        if (nameInput) nameInput.value = DB.oral.name || "";
        if (dateInput) dateInput.value = DB.oral.date || "";
        if (startInput) startInput.value = DB.oral.startTime || "";
        if (endInput) endInput.value = DB.oral.endTime || "";
    }

    // 2. Restauration des listes dynamiques (Pauses, Langues, Thématiques)
    // On appelle les fonctions de rendu spécifiques à l'oral si elles existent
    if (typeof renderPauses === 'function') {
        renderPauses();
    }
    
    if (typeof renderLanguages === 'function') {
        renderLanguages();
    }
    
    if (typeof renderThemes === 'function') {
        renderThemes();
    }
}

/**
 * @why Regénère l'interface des thématiques et sujets pour garantir
 * la synchronisation exacte entre la mémoire (DB) et la vue (DOM) après un import.
 */
window.renderThemes = function() {
    const container = document.getElementById('themes-grid-container');
    
    // Sécurité : on s'assure que le conteneur existe dans le DOM avant d'agir
    if (!container) return;

    // Nettoyage : on vide le conteneur pour éviter de dupliquer les éléments à chaque appel
    container.innerHTML = '';

    // Vérification de la présence des données
    if (!DB.oral || !Array.isArray(DB.oral.themes) || DB.oral.themes.length === 0) {
        // Notification RGAA polie pour indiquer qu'il n'y a pas de données
        container.innerHTML = `<p aria-live="polite" style="color: #7f8c8d; font-style: italic; padding: 10px;">Aucun parcours configuré pour le moment.</p>`;
        return;
    }

    // Reconstruction du DOM
    DB.oral.themes.forEach((theme, themeIndex) => {
        // Création de la ligne conteneur pour ce parcours
        const row = document.createElement('div');
        row.style.cssText = "display: grid; grid-template-columns: 250px 1fr; gap: 20px; padding: 15px 10px; border-bottom: 1px solid #eee; align-items: start;";
        
        // Colonne 1 : Le nom du parcours
        const colParcours = document.createElement('div');
        colParcours.style.cssText = "font-weight: bold; color: #2c3e50;";
        colParcours.textContent = theme.name || "Parcours sans nom";
        
        // Colonne 2 : La liste des sujets associés
        const colSujets = document.createElement('div');
        colSujets.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";
        
        // S'il y a des sujets, on crée des badges (visuellement clairs)
        if (Array.isArray(theme.subjects) && theme.subjects.length > 0) {
            theme.subjects.forEach((subject, subIndex) => {
                const badge = document.createElement('span');
                badge.style.cssText = "background: #ebf5fb; color: #2980b9; padding: 5px 10px; border-radius: 15px; border: 1px solid #bce8f1; font-size: 0.9em;";
                badge.textContent = subject;
                // RGAA : On indique vocalement qu'il s'agit d'un sujet appartenant à un parcours
                badge.setAttribute('aria-label', `Sujet : ${subject}`);
                colSujets.appendChild(badge);
            });
        } else {
            colSujets.innerHTML = `<span style="color: #95a5a6; font-size: 0.9em;">Aucun sujet associé</span>`;
        }

        // Assemblage
        row.appendChild(colParcours);
        row.appendChild(colSujets);
        container.appendChild(row);
    });
};

/**
 * @why Ouvre la modale de l'assistant de répartition de l'oral.
 */
function openOralDistribWizard() {
    // Vérifier s'il y a des élèves et des jurys créés
    // if (!DB.oralStudents || DB.oralStudents.length === 0) return alert("Aucun élève configuré pour l'oral.");
    // if (!DB.oralJurys || DB.oralJurys.length === 0) return alert("Aucun jury configuré.");
    
    document.getElementById('modal-oral-wizard').style.display = 'flex';
}

/**
 * @why Vide la répartition existante.
 */
function clearOralDistribution() {
    if(confirm("⚠️ Voulez-vous vraiment effacer la répartition actuelle ?")) {
        DB.oralDistribution = {};
        renderOralVisualDistribution();
    }
}

/**
 * @why Audit de faisabilité linguistique. Vérifie que les compétences linguistiques 
 * requises par les élèves sont bien présentes dans les jurys constitués.
 * @returns {boolean} true si l'audit est OK, false si un blocage est détecté.
 */
window.auditLanguageCapacity = function() {
    const students = DB.oralConfig.students || [];
    const teachers = DB.oralConfig.teachers || [];
    
    // 1. Recensement des langues demandées par les élèves
    let languesDemandees = new Set();
    students.forEach(s => {
        if (s.langue && s.langue.trim() !== "") {
            languesDemandees.add(s.langue.trim().toUpperCase());
        }
    });

    // S'il n'y a aucune demande en langue, l'audit est validé d'office
    if (languesDemandees.size === 0) return true;

    // 2. Recensement des langues proposées : tout prof avec langue renseignée
    // (on ne requiert plus de jury assigné — la langue seule suffit pour valider)
    let languesProposees = new Set();
    teachers.forEach(t => {
        if (t.langue && t.langue.trim() !== "") {
            languesProposees.add(t.langue.trim().toUpperCase());
        }
    });

    // 3. Comparaison : Chaque langue demandée doit exister dans les jurys
    let erreurs = [];
    languesDemandees.forEach(lang => {
        if (!languesProposees.has(lang)) {
            // On compte combien d'élèves sont impactés pour un message clair
            const nbEleves = students.filter(s => s.langue && s.langue.trim().toUpperCase() === lang).length;
            erreurs.push(`- ${nbEleves} élève(s) demande(nt) l'évaluation en ${lang}, mais AUCUN professeur compétent dans cette langue n'est assigné à un jury.`);
        }
    });

    // 4. Blocage si erreur
    if (erreurs.length > 0) {
        alert("🚨 AUDIT LINGUISTIQUE ÉCHOUÉ :\n\n" + erreurs.join("\n") + "\n\n👉 Action requise : Veuillez ajouter un professeur compétent dans cette langue à l'un de vos jurys (onglet Professeurs) avant de lancer la répartition.");
        return false;
    }

    return true;
};

/**
 * @why Cœur algorithmique de l'Oral (Version 3.0).
 * Gère : 
 * 1. Priorités (⭐) : Placés en début de journée.
 * 2. Disponibilités Jurys : Heure de début et de fin spécifique par jury.
 * 3. Pauses (☕) : Saut automatique des créneaux de repos.
 * 4. Équilibrage : Langues et thématiques (EPI/Parcours).
 */
function runOralAlgorithm() {
    // --- 0. SÉCURITÉ ET PARAMÈTRES ---

    const durIndiv = parseInt(document.getElementById('oral-dur-indiv')?.value) || 15;
    const durGroup = parseInt(document.getElementById('oral-dur-group')?.value) || 25;
    const durHarm = parseInt(document.getElementById('oral-dur-harm')?.value) || 5;
    const stratGroup = document.getElementById('oral-strat-group')?.value || 'start';
    const stratTheme = document.getElementById('oral-strat-theme')?.value || 'homogenous';
    const breaks = DB.oralConfig.pauses || [];

    // --- AUTO-FALLBACK ÉLÈVES ---
    // Si le module oral V2 n'a pas encore d'élèves configurés, on utilise DB.students
    let sourceStudents = DB.oralConfig.students || [];
    if (sourceStudents.length === 0 && DB.students && DB.students.length > 0) {
        sourceStudents = DB.students.map(s => ({
            id: s.id,
            nom: s.nom || "",
            prenom: s.prenom || "",
            classe: s.classe || "",
            groupId: null,
            langue: null,
            parcours: "Général",
            sujet: null,
            isPriority: !!s.tt
        }));
    }
    if (sourceStudents.length === 0) return alert("Erreur : Aucun élève trouvé. Importez vos élèves dans la section Données > Élèves ou dans l'onglet Candidats.");

    // --- AUTO-FALLBACK JURYS ---
    // Priorité : jurys configurés dans le module oral V2
    // Fallback 1 : jurys de DB.stage (ancien module)
    // Fallback 2 : création automatique depuis la config du nombre de jurys
    let syntheticTeachers = DB.oralConfig.teachers ? [...DB.oralConfig.teachers] : [];
    const oralStart = DB.oralConfig.general?.start || DB.stage?.config?.start || "08:30";
    const oralEnd   = DB.oralConfig.general?.end   || DB.stage?.config?.end   || "17:00";

    const hasConfiguredJurys = syntheticTeachers.some(t => t.jury);
    if (!hasConfiguredJurys) {
        // Fallback sur DB.stage.juries
        const stageJuries = DB.stage?.juries || [];
        if (stageJuries.length > 0) {
            stageJuries.forEach(j => {
                syntheticTeachers.push({
                    id: 'auto_' + j.id,
                    nom: j.name || ("Jury " + j.id),
                    jury: j.name || ("Jury " + j.id),
                    langue: null,
                    startTime: j.startTime || oralStart,
                    endTime: j.endTime || oralEnd
                });
            });
        } else {
            // Dernier recours : créer des jurys depuis le nombre configuré
            const nbJurys = DB.stage?.config?.juryCount || 5;
            for (let i = 1; i <= nbJurys; i++) {
                syntheticTeachers.push({
                    id: 'auto_' + i,
                    nom: "Jury " + i,
                    jury: "Jury " + i,
                    langue: null,
                    startTime: oralStart,
                    endTime: oralEnd
                });
            }
        }
    }

    const uniqueJurys = [...new Set(syntheticTeachers.map(t => t.jury).filter(Boolean))];
    if (uniqueJurys.length === 0) return alert("Erreur : Aucun jury n'a pu être déterminé. Configurez vos jurys dans l'onglet Jurys ou vérifiez votre ancien module Oraux.");

    // Audit linguistique — basé sur syntheticTeachers (la liste réellement utilisée)
    // On ne bloque que si AUCUN prof parmi les jurys effectifs ne parle la langue demandée
    const languesDemandees = new Set(
        sourceStudents.filter(s => s.langue && s.langue.trim() !== "")
                      .map(s => s.langue.trim().toUpperCase())
    );
    if (languesDemandees.size > 0) {
        // Langues disponibles : tout prof avec une langue renseignée (jury requis OU non)
        const languesProposees = new Set(
            syntheticTeachers
                .filter(t => t.langue && t.langue.trim() !== "")
                .map(t => t.langue.trim().toUpperCase())
        );
        const manquantes = [...languesDemandees].filter(l => !languesProposees.has(l));
        if (manquantes.length > 0) {
            const msgs = manquantes.map(lang => {
                const nb = sourceStudents.filter(s => s.langue && s.langue.trim().toUpperCase() === lang).length;
                return `- ${nb} élève(s) en ${lang}`;
            });
            alert(`🚨 AUDIT LINGUISTIQUE ÉCHOUÉ :\n\nAucun jury ne parle : ${manquantes.join(', ')}\n${msgs.join('\n')}\n\n👉 Renseignez la "Langue évaluée" pour au moins un membre de jury dans l'onglet Jurys.`);
            return;
        }
    }

    // Réinitialisation de la distribution
    DB.oralConfig.distribution = {};
    const jurysInfos = {};

    // --- 1. INITIALISATION DES JURYS (PLAGES HORAIRES SPÉCIFIQUES) ---
    uniqueJurys.forEach(juryName => {
        DB.oralConfig.distribution[juryName] = [];

        // On récupère les horaires saisis dans le tableau des jurys (syntheticTeachers = V2 ou fallback)
        const members = syntheticTeachers.filter(t => t.jury === juryName);
        const specificStart = members.find(m => m.startTime)?.startTime || oralStart;
        const specificEnd   = members.find(m => m.endTime)?.endTime   || oralEnd;

        jurysInfos[juryName] = {
            currentTime: specificStart,
            maxTime: specificEnd,
            themes: new Set(),
            languages: new Set(members.map(t => t.langue?.trim().toUpperCase()).filter(Boolean)),
            langCounts: {}
        };
    });

    // --- 2. PRÉPARATION ET TRI DES PASSAGES (PRIORITÉS ⭐) ---
    let passages = [];
    let processedStudentIds = new Set();

    sourceStudents.forEach(student => {
        if (processedStudentIds.has(student.id)) return;

        let currentPassage = {
            students: [student],
            theme: student.parcours || "Général",
            langue: student.langue ? student.langue.trim().toUpperCase() : null,
            isGroup: false,
            duration: durIndiv
        };

        if (student.groupId) {
            const groupMembers = sourceStudents.filter(s => s.groupId === student.groupId);
            currentPassage.students = groupMembers;
            currentPassage.isGroup = true;
            currentPassage.duration = durGroup;
            groupMembers.forEach(m => processedStudentIds.add(m.id));
        } else {
            processedStudentIds.add(student.id);
        }
        passages.push(currentPassage);
    });

    // Tri de la pile de travail
    passages.sort((a, b) => {
        // A. Priorité ⭐ (Un passage est prioritaire si au moins un élève l'est)
        const aPrio = a.students.some(s => s.isPriority);
        const bPrio = b.students.some(s => s.isPriority);
        if (aPrio && !bPrio) return -1;
        if (!aPrio && bPrio) return 1;

        // B. Stratégie de groupe
        if (stratGroup === 'start') {
            const groupSort = (a.isGroup === b.isGroup) ? 0 : a.isGroup ? -1 : 1;
            if (groupSort !== 0) return groupSort;
        } else if (stratGroup === 'end') {
            const groupSort = (a.isGroup === b.isGroup) ? 0 : a.isGroup ? 1 : -1;
            if (groupSort !== 0) return groupSort;
        }

        // C. Stabilité alphabétique
        return a.students[0].nom.localeCompare(b.students[0].nom);
    });

    // --- 3. DISTRIBUTION DYNAMIQUE ---
    passages.forEach(passage => {
        let bestJury = null;
        let bestScore = -Infinity;
        const tempsRequisTotal = passage.duration + durHarm;

        uniqueJurys.forEach(juryName => {
            const info = jurysInfos[juryName];
            
            // Calcul de l'heure de début possible en tenant compte des pauses
            const potentialStart = getNextValidStartTime(info.currentTime, tempsRequisTotal, breaks);
            const potentialEnd = addMinutesToTime(potentialStart, passage.duration);

            // BARRIÈRE : Le jury a-t-il fini son service ?
            if (timeToMins(potentialEnd) > timeToMins(info.maxTime)) return;

            let score = 0;

            // Filtre et Équilibrage des Langues
            if (passage.langue) {
                if (!info.languages.has(passage.langue)) return; 
                const currentLangCount = info.langCounts[passage.langue] || 0;
                score -= (currentLangCount * 200); 
            }

            // Priorité au jury qui est disponible le plus tôt
            score -= timeToMins(potentialStart); 

            // Stratégie thématique (EPI/Parcours)
            const hasTheme = info.themes.has(passage.theme);
            if (stratTheme === 'homogenous' && hasTheme) score += 50; 
            else if (stratTheme === 'heterogenous' && !hasTheme) score += 50; 

            if (score > bestScore) {
                bestScore = score;
                bestJury = juryName;
            }
        });

        // Attribution du passage au meilleur jury trouvé
        if (bestJury) {
            const info = jurysInfos[bestJury];
            const finalStart = getNextValidStartTime(info.currentTime, tempsRequisTotal, breaks);
            const finalEnd = addMinutesToTime(finalStart, passage.duration);
            
            DB.oralConfig.distribution[bestJury].push({
                type: passage.isGroup ? "group" : "indiv",
                theme: passage.theme,
                langue: passage.langue,
                students: passage.students,
                startTime: finalStart,
                endTime: finalEnd
            });

            // Mise à jour des compteurs du jury
            if (passage.langue) {
                info.langCounts[passage.langue] = (info.langCounts[passage.langue] || 0) + 1;
            }
            info.currentTime = addMinutesToTime(finalEnd, durHarm);
            info.themes.add(passage.theme);
        } else {
            console.error(`Impossible de placer l'élève ${passage.students[0].nom} : aucun jury disponible dans sa plage horaire.`);
        }
    });

    // --- 4. FINALISATION ---
    const modalWizard = document.getElementById('modal-oral-wizard');
    if (modalWizard) modalWizard.style.display = 'none';

    if (typeof renderOralVisualDistribution === 'function') renderOralVisualDistribution();

    // Sauvegarde automatique immédiate après la répartition
    if (typeof autoSave === 'function') autoSave();

    // Vérification si des élèves n'ont pas été placés
    const totalPlaced = Object.values(DB.oralConfig.distribution).reduce((sum, list) => sum + list.length, 0);
    if (totalPlaced < passages.length) {
        alert(`⚠️ Attention : Seuls ${totalPlaced} passages sur ${passages.length} ont pu être placés. Vérifiez les disponibilités horaires de vos jurys.`);
    } else {
        alert(`✅ Répartition terminée ! ${totalPlaced} passages répartis sur ${uniqueJurys.length} jury(s).`);
    }
}
/**
 * @why Utilitaire (Helper) pour l'addition de minutes à une heure au format "HH:MM".
 * Refactorisé en "Clean Code" : réutilise les convertisseurs mathématiques pour éviter les bugs liés à l'objet Date.
 * @param {string} timeStr - Heure de base ("08:00")
 * @param {number} minsToAdd - Minutes à ajouter
 * @returns {string} Nouvelle heure au format "HH:MM"
 */
function addMinutesToTime(timeStr, minsToAdd) {
    if (!timeStr) return "00:00";
    // On convertit en minutes absolues, on additionne, et on reconvertit en texte. Imparable.
    return minsToTime(timeToMins(timeStr) + minsToAdd);
}

/**
 * @why Convertit "HH:MM" en minutes (depuis minuit) pour des comparaisons mathématiques fiables.
 */
function timeToMins(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * @why Convertit des minutes totales en chaîne de caractères "HH:MM".
 */
function minsToTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

/**
 * @why Vérifie si un créneau [début + durée] chevauche une pause. 
 * Si oui, repousse l'heure au premier créneau disponible après la pause.
 * @param {string} startTimeStr - Heure de début prévue (ex: "10:00")
 * @param {number} durationMins - Durée totale (passage + harmonisation éventuellement)
 * @param {Array} pauses - Tableau des pauses [{start: "10:20", end: "10:35"}]
 * @returns {string} L'heure de début valide (ex: "10:35")
 */
function getNextValidStartTime(startTimeStr, durationMins, pauses = []) {
    let startMins = timeToMins(startTimeStr);
    let endMins = startMins + durationMins;
    
    // 1. On s'assure que les pauses sont triées chronologiquement
    const sortedPauses = [...pauses].sort((a, b) => timeToMins(a.start) - timeToMins(b.start));

    let hasConflict = true;
    // On boucle tant qu'un conflit est trouvé (au cas où deux pauses se suivent)
    while (hasConflict) {
        hasConflict = false;
        for (let p of sortedPauses) {
            let pStart = timeToMins(p.start);
            let pEnd = timeToMins(p.end);

            // LOGIQUE DE CONFLIT : 
            // Le créneau commence AVANT la fin de la pause ET finit APRÈS le début de la pause
            if (startMins < pEnd && endMins > pStart) {
                // On repousse le début exactement à la fin de la pause
                startMins = pEnd;
                endMins = startMins + durationMins;
                hasConflict = true; 
                break; // On recommence la vérification avec le nouvel horaire
            }
        }
    }
    return minsToTime(startMins);
}

/**
 * @why Recalcule les horaires de passage pour un jury spécifique.
 * Utilisé après un Drag & Drop ou une modification manuelle pour 
 * s'assurer que les horaires se suivent sans chevaucher les pauses.
 */
function recalculateJuryTimes(juryName) {
    // 1. Récupération des créneaux (slots) de ce jury
    const slots = DB.oralConfig.distribution[juryName];
    if (!slots || slots.length === 0) return;

    // 2. Récupération des paramètres globaux
    const globalStartTime = DB.oralConfig.general.start || "08:00";
    const durHarm = parseInt(document.getElementById('oral-dur-harm')?.value) || 5;
    const durIndiv = parseInt(document.getElementById('oral-dur-indiv')?.value) || 15;
    const durGroup = parseInt(document.getElementById('oral-dur-group')?.value) || 25;
    
    // 3. RÉCUPÉRATION DES PAUSES (Essentiel pour le calcul)
    const breaks = DB.oralConfig.pauses || [];

    let currentStartTime = globalStartTime;

    slots.forEach(slot => {
        // Détermination de la durée selon le type de passage
        const passageDuration = slot.type === "group" ? durGroup : durIndiv;
        
        // TEMPS REQUIS : On vérifie si l'épreuve + l'harmonisation tiennent
        // cela évite de finir l'élève à 12h00 mais de n'avoir l'harmonisation qu'à 12h05 (pendant la pause)
        const totalBlockMins = passageDuration + durHarm;

        // 4. APPEL SÉCURISÉ : On passe les "breaks" à la fonction
        currentStartTime = getNextValidStartTime(currentStartTime, totalBlockMins, breaks);

        // 5. Mise à jour du créneau
        slot.startTime = currentStartTime;
        slot.endTime = addMinutesToTime(currentStartTime, passageDuration);

        // 6. Préparation du créneau suivant (Heure de fin + Harmonisation)
        currentStartTime = addMinutesToTime(slot.endTime, durHarm);
    });

    // 7. Mise à jour visuelle si nécessaire
    if (typeof renderOralVisualDistribution === 'function') {
        renderOralVisualDistribution();
    }
}

/**
 * @why Génère l'affichage complet des colonnes de jurys.
 * Design : En-tête sur deux lignes pour éviter les chevauchements.
 * Intègre : Pauses (☕), Priorités (⭐), Séparateurs Drag & Drop, Badges Langues.
 */
function renderOralVisualDistribution() {
    const container = document.getElementById('oral-visual-distrib');
    if (!container) return;
    container.innerHTML = '';

    const dist = DB.oralConfig.distribution || {};
    const pauses = DB.oralConfig.pauses || [];

    // Sécurité : Si aucune répartition n'est générée
    if (Object.keys(dist).length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; text-align:center; width:100%; padding:20px;">Aucune répartition pour le moment. Utilisez l'assistant de génération.</p>`;
        return;
    }

    // On trie les jurys par nom pour un affichage ordonné
    Object.keys(dist).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(juryName => {
        const slots = dist[juryName];
        
        // --- 1. Récupération des informations du Jury ---
        const juryTeachers = DB.oralConfig.teachers.filter(t => t.jury === juryName);
        // On met les noms en gras et majuscules pour la lisibilité
        const teacherNames = juryTeachers.map(t => t.nom.toUpperCase()).join(' / ');
        const juryLangs = [...new Set(juryTeachers.map(t => t.langue).filter(Boolean))].join(', ');
        
        let card = document.createElement('div');
        card.className = 'dd-room-card';
        card.style.width = "320px"; // Largeur fixe pour éviter les cartes déformées
        card.style.minWidth = "300px";

        // --- 2. Injection de l'en-tête (Design à 2 lignes) ---
        card.innerHTML = `
            <div class="dd-room-header" style="background:#2c3e50; color:white; padding:12px; border-radius:8px 8px 0 0;">
                <div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                    <span style="font-weight:bold; font-size:1.1rem;">🧑‍⚖️ JURY ${juryName}</span>
                    <span style="font-size:0.75rem; background:#3498db; color:white; padding:2px 10px; border-radius:12px; white-space:nowrap;">
                        ${slots.length} passages
                    </span>
                </div>
                
                <div style="text-align:center;">
                    <div style="font-size:0.85rem; font-weight:500; color:#ecf0f1; line-height:1.2; word-break:break-word;">
                        ${teacherNames || 'Aucun prof assigné'}
                    </div>
                    ${juryLangs ? `
                        <div style="margin-top:5px;">
                            <span style="font-size:0.7rem; background:#e67e22; color:white; padding:1px 6px; border-radius:4px; text-transform:uppercase; font-weight:bold;">
                                🗣️ ${juryLangs}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        let body = document.createElement('div');
        body.className = 'dd-room-body';
        body.style.padding = "10px";
        body.style.backgroundColor = "#f8f9fa";

        // Helper pour créer les séparateurs bleus (Drag & Drop)
        const createSeparator = (insertIndex) => {
            let sep = document.createElement('div');
            sep.className = 'inter-slot-separator';
            sep.setAttribute('data-jury', juryName);
            sep.setAttribute('data-insert-index', insertIndex);
            sep.style.cssText = "height: 8px; margin: -4px 0; border-radius: 4px; transition: all 0.2s ease; position: relative; z-index:10;";
            sep.addEventListener('dragover', (e) => { 
                e.preventDefault(); 
                e.currentTarget.style.backgroundColor = "#3498db"; 
                e.currentTarget.style.height = "25px"; 
            });
            sep.addEventListener('dragleave', (e) => { 
                e.currentTarget.style.backgroundColor = "transparent"; 
                e.currentTarget.style.height = "8px"; 
            });
            sep.addEventListener('drop', handleOralDrop);
            return sep;
        };

        // Zone d'insertion initiale (Index 0)
        body.appendChild(createSeparator(0));

        slots.forEach((slot, index) => {
            
            // --- 3. GESTION VISUELLE DES PAUSES ---
            const pauseHere = pauses.find(p => p.end === slot.startTime);
            if (pauseHere) {
                let pDiv = document.createElement('div');
                pDiv.style.cssText = "background:#f1f2f6; border:2px dashed #bdc3c7; border-radius:5px; padding:8px; margin-bottom:8px; display:flex; align-items:center; color:#7f8c8d; font-size:0.85rem;";
                pDiv.innerHTML = `
                    <span style="font-size:1.2rem; margin-right:10px;">☕</span> 
                    <div style="flex-grow:1;">
                        <strong>${pauseHere.label || 'PAUSE'}</strong><br>
                        <small>${pauseHere.start} - ${pauseHere.end}</small>
                    </div>
                `;
                body.appendChild(pDiv);
            }

            // --- 4. RENDU DU CRÉNEAU ÉLÈVE (SLOT) ---
            let slotDiv = document.createElement('div');
            slotDiv.style.cssText = "border: 1px solid #ccc; border-radius: 5px; margin-bottom: 8px; background: white; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";
            
            slotDiv.innerHTML = `
                <div style="background:#e9ecef; padding:5px; font-size:0.85rem; font-weight:bold; border-bottom:1px solid #ccc; display:flex; justify-content:space-between;">
                    <span>⏱️ ${slot.startTime} - ${slot.endTime}</span>
                    <span style="color:#7f8c8d; font-size:0.75rem;">${slot.type === 'group' ? '👥 Groupe' : '👤 Indiv.'}</span>
                </div>
            `;

            let dropZone = document.createElement('div');
            dropZone.style.minHeight = "35px";
            dropZone.style.padding = "5px";
            dropZone.setAttribute('data-jury', juryName);
            dropZone.setAttribute('data-slot-index', index);
            
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = "#d4edda"; });
            dropZone.addEventListener('dragleave', (e) => { e.currentTarget.style.backgroundColor = "transparent"; });
            dropZone.addEventListener('drop', handleOralDrop);

            // Rendu de chaque élève à l'intérieur du créneau
            slot.students.forEach((student, studentIndex) => {
                let stDiv = document.createElement('div');
                stDiv.className = 'dd-student';
                stDiv.draggable = true;
                
                const langueBadge = student.langue ? `<span style="font-size:0.65rem; background:#95a5a6; color:white; padding:1px 4px; border-radius:3px; margin-left:4px;">${student.langue}</span>` : "";
                const priorityStar = student.isPriority ? `<span style="color: #f1c40f; margin-right: 5px; font-size:1.1rem;" title="Élève Prioritaire">⭐</span>` : "";

                stDiv.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div style="flex-grow:1; display:flex; align-items:center; font-size:0.9rem; overflow:hidden;">
                            ${priorityStar}
                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                <strong>${student.nom.toUpperCase()}</strong>&nbsp;${student.prenom} 
                            </span>
                            ${langueBadge}
                        </div>
                        <button style="background:transparent; border:none; cursor:pointer; color:#e74c3c; font-weight:bold; padding:0 5px;" 
                                onclick="removeStudentFromSlot('${juryName}', ${index}, ${studentIndex})"
                                title="Retirer l'élève">❌</button>
                    </div>
                `;
                
                stDiv.addEventListener('dragstart', (e) => {
                    if(e.target.tagName === 'BUTTON') return e.preventDefault();
                    e.dataTransfer.setData('text/plain', JSON.stringify({ 
                        juryName: juryName, 
                        slotIndex: index, 
                        studentId: student.id 
                    }));
                });
                
                dropZone.appendChild(stDiv);
            });

            slotDiv.appendChild(dropZone);
            body.appendChild(slotDiv);
            
            // Zone d'insertion après chaque créneau
            body.appendChild(createSeparator(index + 1));
        });

        card.appendChild(body);
        container.appendChild(card);
    });
}

/**
 * @why Gère le routage du Dépôt (Drop) avec sécurité ANTI-PAUSE.
 * Empêche la fusion d'un élève sur un créneau de pause.
 */
function handleOralDrop(e) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = "transparent";
    
    // Reset style pour les séparateurs
    if (e.currentTarget.className === 'inter-slot-separator') {
        e.currentTarget.style.height = "8px";
    }
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const targetJury = e.currentTarget.getAttribute('data-jury');
        const isInsertion = e.currentTarget.hasAttribute('data-insert-index');
        const sourceJury = data.juryName;
        const sourceSlotIndex = data.slotIndex;
        const studentId = data.studentId;

        // 1. Extraction de l'élève source
        const sourceSlot = DB.oralConfig.distribution[sourceJury][sourceSlotIndex];
        const studentIndex = sourceSlot.students.findIndex(s => s.id === studentId);
        if (studentIndex === -1) return;

        // --- BARRIÈRE DE SÉCURITÉ : FUSION SUR PAUSE ---
        if (!isInsertion) {
            const targetSlotIndex = parseInt(e.currentTarget.getAttribute('data-slot-index'));
            const targetSlot = DB.oralConfig.distribution[targetJury][targetSlotIndex];
            
            // Si le créneau cible est une pause, on annule tout
            if (targetSlot && (targetSlot.isPause || targetSlot.type === 'pause')) {
                alert("⚠️ Action impossible : Vous ne pouvez pas ajouter un élève sur un créneau de pause.");
                return;
            }
        }

        // 2. Déplacement effectif (on ne retire l'élève qu'après avoir validé la cible)
        const [studentToMove] = sourceSlot.students.splice(studentIndex, 1);

        // Nettoyage de la source
        let sourceSlotRemoved = false;
        if (sourceSlot.students.length === 0) {
            DB.oralConfig.distribution[sourceJury].splice(sourceSlotIndex, 1);
            sourceSlotRemoved = true;
        } else if (sourceSlot.students.length === 1) {
            sourceSlot.type = "indiv";
        }

        // 3. Routage de l'action
        if (isInsertion) {
            let insertIndex = parseInt(e.currentTarget.getAttribute('data-insert-index'));
            
            // Ajustement d'index si suppression au-dessus dans le même jury
            if (sourceJury === targetJury && sourceSlotRemoved && sourceSlotIndex < insertIndex) {
                insertIndex--;
            }

            const newSlot = {
                type: "indiv",
                theme: studentToMove.parcours || "Général",
                langue: studentToMove.langue || null,
                students: [studentToMove],
                startTime: "", 
                endTime: ""
            };
            DB.oralConfig.distribution[targetJury].splice(insertIndex, 0, newSlot);

        } else {
            let targetSlotIndex = parseInt(e.currentTarget.getAttribute('data-slot-index'));
            if (sourceJury === targetJury && sourceSlotRemoved && sourceSlotIndex < targetSlotIndex) {
                targetSlotIndex--;
            }

            const targetSlot = DB.oralConfig.distribution[targetJury][targetSlotIndex];
            targetSlot.students.push(studentToMove);
            if (targetSlot.students.length > 1) targetSlot.type = "group";
        }

        // 4. Moteur de recalcul (Appelle la version optimisée avec gestion des pauses)
        if (typeof recalculateJuryTimes === 'function') {
            recalculateJuryTimes(sourceJury);
            if (sourceJury !== targetJury) {
                recalculateJuryTimes(targetJury);
            }
        }

        // 5. Rafraichissement Visuel
        renderOralVisualDistribution();

    } catch (error) {
        console.error("Erreur technique lors du déplacement :", error);
    }
}

// --- LOGIQUE DRAG & DROP ORAL ---
function handleOralDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = "#d4edda"; // Feedback visuel vert
}

function handleOralDragLeave(e) {
    e.currentTarget.style.backgroundColor = ""; // Reset
}

/**
 * @why Génère le planning PDF de l'épreuve orale au format paysage.
 * Une page par jury avec les créneaux listés verticalement, incluant des zones pour l'émargement et les notes.
 */
window.exportOralPlannings = function() {
    // 1. Sécurité : Vérifier que la répartition existe
    if (!DB.oralConfig || !DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        alert("⚠️ Aucune répartition à imprimer. Veuillez d'abord lancer l'assistant de répartition.");
        return;
    }

    // 2. Initialisation du document PDF en format Paysage ('l' = landscape)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    let pageCount = 0;

    // Récupération des infos générales de l'examen
    const dateExamen = DB.oralConfig.general.date ? new Date(DB.oralConfig.general.date).toLocaleDateString('fr-FR') : "Date non définie";
    const nomExamen = DB.oralConfig.general.name || "Épreuve Orale";

    // 3. Boucle de génération : Une page par Jury
    Object.keys(DB.oralConfig.distribution).forEach(juryName => {
        const slots = DB.oralConfig.distribution[juryName];
        if (!slots || slots.length === 0) return;

        // Saut de page si ce n'est pas le premier jury
        if (pageCount > 0) doc.addPage();
        pageCount++;

        // --- A. EN-TÊTE DU DOCUMENT ---
        doc.setFontSize(16);
        doc.setTextColor(44, 62, 80);
        doc.setFont("helvetica", "bold");
        doc.text(`${nomExamen} - Planning du ${juryName}`, 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`${DB.config.schoolName || "Établissement"} | Date prévue : ${dateExamen}`, 14, 28);

        // Recherche des professeurs composant ce jury pour l'afficher
        const juryTeachers = DB.oralConfig.teachers.filter(t => t.jury === juryName).map(t => t.nom).join(', ');
        doc.setFont("helvetica", "italic");
        doc.text(`Membres du jury : ${juryTeachers || "Non définis"}`, 14, 34);

        // --- B. PRÉPARATION DES DONNÉES DU TABLEAU ---
        const tableBody = [];

        slots.forEach(slot => {
            const timeStr = `${slot.startTime} - ${slot.endTime}`;
            
            // Formatage des élèves (Retour à la ligne si groupe)
            const studentsStr = slot.students.map(s => `${s.nom.toUpperCase()} ${s.prenom}`).join('\n');
            
            // Dédoublonnage des classes (ex: si 2 élèves de 3A, on affiche juste "3A")
            const classesStr = [...new Set(slot.students.map(s => s.classe))].join(', ');
            
            const typeStr = slot.type === 'group' ? 'Groupe' : 'Indiv.';
            
            // Formatage du thème et de la langue (ex: "EPI \n Anglais")
            let detailsStr = slot.theme;
            if (slot.langue) detailsStr += `\n(Langue: ${slot.langue})`;

            tableBody.push([
                timeStr,
                studentsStr,
                classesStr,
                typeStr,
                detailsStr,
                "", // Espace pour l'émargement manuel
                ""  // Espace pour la notation manuelle
            ]);
        });

        // --- C. GÉNÉRATION DU TABLEAU ---
        doc.autoTable({
            startY: 40,
            head: [['Horaire', 'Candidat(s)', 'Classe', 'Type', 'Parcours / Thème', 'Émargement', 'Note / Appréciation']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94], halign: 'center', valign: 'middle' }, // Bleu foncé élégant
            styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 32 }, // Horaire
                1: { cellWidth: 55 }, // Candidat(s)
                2: { halign: 'center', cellWidth: 20 }, // Classe
                3: { halign: 'center', cellWidth: 20 }, // Type
                4: { cellWidth: 40 }, // Parcours
                5: { cellWidth: 45 }, // Émargement (largeur vide)
                6: { cellWidth: 55 }  // Note/Appréciation (largeur vide)
            },
            // Ajout d'un pied de page automatique
            didDrawPage: function (data) {
                doc.setFontSize(9);
                doc.setTextColor(150);
                doc.setFont("helvetica", "normal");
                const pageStr = `Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${doc.internal.getNumberOfPages()}`;
                doc.text(pageStr, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
    });

    // 4. Téléchargement du fichier
    if (pageCount === 0) {
        alert("⚠️ Un problème est survenu : les jurys semblent vides.");
        return;
    }
    
    // Nom du fichier nettoyé des espaces
    const fileName = `Planning_Oral_${nomExamen.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};

/**
 * @why Vide la répartition actuelle de l'épreuve orale en mémoire.
 * Demande une confirmation explicite pour prévenir les pertes accidentelles de travail.
 * L'action se fait uniquement en mémoire (pas d'écriture disque forcée).
 */
window.clearOralDistribution = function() {
    // 1. Contrôle : Y a-t-il réellement des données à effacer ?
    if (!DB.oralConfig || !DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        alert("ℹ️ Il n'y a aucune répartition à effacer pour le moment.");
        return;
    }

    // 2. Fenêtre de confirmation (Sécurité anti-misclick)
    const messageConfirmation = "⚠️ Attention : Voulez-vous vraiment effacer toute la répartition de l'oral ?\n\nTous les créneaux générés seront supprimés. Cette action est irréversible en mémoire.";
    
    if (confirm(messageConfirmation)) {
        
        // 3. Purge des données (On réinitialise le tiroir de l'oral à un objet vide)
        DB.oralConfig.distribution = {};

        // 4. Rafraîchissement de l'interface graphique (DOM)
        if (typeof renderOralVisualDistribution === 'function') {
            renderOralVisualDistribution();
        }
        
        // Feedback utilisateur
        console.log("🧹 La répartition de l'oral a été réinitialisée avec succès.");
    }
};

/**
 * @why Moteur de rendu principal de la page. Construit le DOM basé sur l'état de DB.oralConfig.grille.
 * Vérifie l'intégrité des totaux à chaque rendu.
 */
function renderOralGrilleConfig() {
    // L'initialisation est garantie par setupOralDatabase(), on peut lire en sécurité
    const grille = DB.oralConfig.grille; 

    // Fonction Helper pour dessiner les critères d'un bloc
    const renderBloc = (typeId, typeData) => {
        const container = document.getElementById(`container-criteres-${typeId}`);
        if (!container) return; // Sécurité si le DOM n'est pas encore prêt
        
        container.innerHTML = "";
        let currentTotal = 0;

        typeData.criteres.forEach((critere, index) => {
            currentTotal += parseFloat(critere.maxPts || 0);

            // Construction dynamique des inputs pour les niveaux de compétence
            let niveauxHtml = "";
            critere.niveaux.forEach((pts, lvlIndex) => {
                niveauxHtml += `
                    <div style="display:flex; flex-direction:column; align-items:center; flex:1;">
                        <label style="font-size:0.75rem; color:#7f8c8d;">Niv. ${lvlIndex + 1} (pts)</label>
                        <input type="number" step="0.5" min="0" value="${pts}" class="form-control" style="width:100%; text-align:center;" 
                               onchange="updateOralCriterionLvl('${typeId}', ${index}, ${lvlIndex}, this.value)">
                    </div>
                `;
            });

            // Carte du critère
            const critDiv = document.createElement("div");
            critDiv.style.cssText = "background:white; border:1px solid #ddd; padding:15px; border-radius:6px; box-shadow:0 2px 4px rgba(0,0,0,0.02);";
            critDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; gap:15px; margin-bottom:10px;">
                    <div style="flex:2;">
                        <label style="font-size:0.85rem; font-weight:bold;">Nom du critère</label>
                        <input type="text" class="form-control" value="${critere.label}" placeholder="Ex: Clarté de la voix..." 
                               onchange="updateOralCriterion('${typeId}', ${index}, 'label', this.value)">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.85rem; font-weight:bold;">Échelle (Niveaux)</label>
                        <select class="form-control" onchange="changeOralCriterionScale('${typeId}', ${index}, this.value)">
                            ${[2,3,4,5,6].map(n => `<option value="${n}" ${critere.niveaux.length === n ? 'selected' : ''}>${n} niveaux</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex; align-items:flex-end;">
                        <button class="btn btn-danger btn-sm" onclick="removeOralCriterion('${typeId}', ${index})" title="Supprimer ce critère" aria-label="Supprimer le critère ${critere.label || ''}">🗑️</button>
                    </div>
                </div>
                <div style="display:flex; gap:10px; background:#f9f9f9; padding:10px; border-radius:4px; border:1px dashed #ccc;">
                    ${niveauxHtml}
                </div>
            `;
            container.appendChild(critDiv);
        });

        // Validation visuelle du total (RGAA : aria-live est géré côté HTML)
        const totalSpan = document.getElementById(`total-${typeId}`);
        if (totalSpan) {
            totalSpan.innerText = `${currentTotal} / ${typeData.maxPoints} pts`;
            
            if (currentTotal === typeData.maxPoints) {
                totalSpan.style.backgroundColor = "#d4edda";
                totalSpan.style.color = "#155724";
                totalSpan.style.border = "1px solid #c3e6cb";
            } else {
                totalSpan.style.backgroundColor = "#f8d7da";
                totalSpan.style.color = "#721c24";
                totalSpan.style.border = "1px solid #f5c6cb";
            }
        }
    };

    renderBloc("prestation", grille.prestation);
    renderBloc("contenu", grille.contenu);

    // Configuration Bonus
    const bonusCheckbox = document.getElementById("bonus-enabled");
    if (bonusCheckbox) {
        bonusCheckbox.checked = grille.bonus.enabled;
    }
    
    const bonusContainer = document.getElementById("container-bonus-config");
    if (bonusContainer) {
        bonusContainer.style.display = grille.bonus.enabled ? "block" : "none";
        
        if (grille.bonus.enabled) {
            document.getElementById("bonus-max-pts").value = grille.bonus.maxPoints;
            document.getElementById("bonus-nb-niveaux").value = grille.bonus.niveaux.length;
            
            const bonusLvlContainer = document.getElementById("bonus-niveaux-inputs");
            if (bonusLvlContainer) {
                bonusLvlContainer.innerHTML = grille.bonus.niveaux.map((pts, idx) => `
                    <div style="flex:1; text-align:center;">
                        <label style="font-size:0.8rem;">Niveau ${idx+1} (pts)</label>
                        <input type="number" step="0.5" value="${pts}" class="form-control" style="text-align:center;" onchange="updateBonusLvl(${idx}, this.value)">
                    </div>
                `).join('');
            }
        }
    }
}

/**
 * @why Ajoute un nouveau critère vierge dans un bloc (prestation ou contenu).
 */
window.addOralCriterion = function(typeId) {
    DB.oralConfig.grille[typeId].criteres.push({
        label: "",
        maxPts: 0,
        niveaux: [0, 0, 0, 0] // Par défaut : 4 niveaux vierges
    });
    renderOralGrilleConfig();
};

window.removeOralCriterion = function(typeId, index) {
    if(confirm("Supprimer ce critère ?")) {
        DB.oralConfig.grille[typeId].criteres.splice(index, 1);
        renderOralGrilleConfig();
    }
};

window.updateOralCriterion = function(typeId, index, field, value) {
    DB.oralConfig.grille[typeId].criteres[index][field] = value;
};

/**
 * @why Met à jour le nombre de niveaux d'un critère (ajoute des 0 ou tronque le tableau).
 */
window.changeOralCriterionScale = function(typeId, index, newScale) {
    const nb = parseInt(newScale);
    let niveaux = DB.oralConfig.grille[typeId].criteres[index].niveaux;
    
    if (nb > niveaux.length) {
        while(niveaux.length < nb) niveaux.push(0);
    } else if (nb < niveaux.length) {
        niveaux = niveaux.slice(0, nb);
    }
    
    DB.oralConfig.grille[typeId].criteres[index].niveaux = niveaux;
    // On recalcule le point max basé sur le dernier niveau
    DB.oralConfig.grille[typeId].criteres[index].maxPts = Math.max(...niveaux);
    renderOralGrilleConfig();
};

/**
 * @why Met à jour la valeur en point d'un niveau spécifique et recalcule le max du critère.
 */
window.updateOralCriterionLvl = function(typeId, critIndex, lvlIndex, value) {
    const valNum = parseFloat(value) || 0;
    const critere = DB.oralConfig.grille[typeId].criteres[critIndex];
    critere.niveaux[lvlIndex] = valNum;
    
    // Le max du critère est la valeur la plus haute de son échelle
    critere.maxPts = Math.max(...critere.niveaux);
    renderOralGrilleConfig();
};

// --- GESTION DU BONUS ---
window.toggleBonusLangue = function(isEnabled) {
    DB.oralConfig.grille.bonus.enabled = isEnabled;
    renderOralGrilleConfig();
};

window.updateBonusConfig = function() {
    const maxPts = parseInt(document.getElementById("bonus-max-pts").value) || 2;
    const nbNiv = parseInt(document.getElementById("bonus-nb-niveaux").value) || 3;
    
    DB.oralConfig.grille.bonus.maxPoints = maxPts;
    
    let niveaux = DB.oralConfig.grille.bonus.niveaux;
    if (nbNiv > niveaux.length) {
        while(niveaux.length < nbNiv) niveaux.push(0);
    } else if (nbNiv < niveaux.length) {
        niveaux = niveaux.slice(0, nbNiv);
    }
    DB.oralConfig.grille.bonus.niveaux = niveaux;
    renderOralGrilleConfig();
};

window.updateBonusLvl = function(lvlIndex, value) {
    DB.oralConfig.grille.bonus.niveaux[lvlIndex] = parseFloat(value) || 0;
};

/**
 * @why Génère un fichier PDF A4 propre de la grille d'évaluation configurée.
 * Version épurée : Titre fusionné avec la session, sous-titres supprimés,
 * logo adaptatif maintenu, intégration du Parcours et note finale figée sur 20.
 * CORRECTIF : Gestion des textes longs avec retour à la ligne automatique (overflow).
 */
window.exportGrillePDF = function() {
    if (!window.jspdf) return alert("Erreur : La librairie jsPDF n'est pas chargée.");
    if (!DB.oralConfig || !DB.oralConfig.grille) {
        alert("⚠️ Aucune grille configurée. Veuillez d'abord paramétrer la grille d'évaluation.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const grille = DB.oralConfig.grille;

    // --- A. EN-TÊTE DU DOCUMENT ET LOGO ---
    const nomExamen = DB.oralConfig.general?.name || "Epreuve_Orale"; 
    const sessionYear = DB.config.year || new Date().getFullYear();
    
    if (DB.config.logo) {
        try {
            const imgProps = doc.getImageProperties(DB.config.logo);
            const maxW = 30; 
            const maxH = 25; 
            const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
            const w = imgProps.width * ratio;
            const h = imgProps.height * ratio;
            doc.addImage(DB.config.logo, 'PNG', 14, 10, w, h, undefined, 'FAST');
        } catch (e) {
            console.error("Erreur lors de l'insertion du logo :", e);
        }
    }
    
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80); 
    doc.setFont("helvetica", "bold");
    doc.text(`Grille d'évaluation - Session ${sessionYear}`, 105, 22, { align: 'center' });

    doc.setDrawColor(200);
    doc.setFillColor(248, 249, 250);
    doc.rect(14, 31, 182, 26, 'FD'); 
    doc.setFontSize(12);
    doc.setTextColor(0);
    
    doc.text("Candidat(e) : .....................................................................", 18, 38);
    doc.text("Parcours / EPI : ................................................................", 18, 45);
    doc.text("Jury : ..................................................................................", 18, 52);

    let startY = 65; 

    // --- B. FONCTION HELPER POUR GÉNÉRER UN TABLEAU ---
    const primaryColor = [44, 62, 80]; 

    const drawSectionTable = (title, data, maxTotal) => {
        if (data.criteres.length === 0) return;

        let maxLvlCount = 0;
        data.criteres.forEach(c => { if (c.niveaux.length > maxLvlCount) maxLvlCount = c.niveaux.length; });
        
        let headRow = ['Critères d\'évaluation'];
        for (let i = 0; i < maxLvlCount; i++) {
            headRow.push(`Niveau ${i + 1}`);
        }
        headRow.push('Note'); 

        let bodyRows = [];
        data.criteres.forEach(critere => {
            let row = [critere.label || "Critère non nommé"];
            for (let i = 0; i < maxLvlCount; i++) {
                if (i < critere.niveaux.length) {
                    row.push(`${critere.niveaux[i]} pts`);
                } else {
                    row.push("-"); 
                }
            }
            row.push(""); 
            bodyRows.push(row);
        });

        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text(`${title} (Max : ${maxTotal} pts)`, 14, startY - 2);

        doc.autoTable({
            startY: startY,
            head: [headRow],
            body: bodyRows,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, halign: 'center' },
            // MODIFICATION ICI : overflow ajouté
            styles: { fontSize: 10, cellPadding: 3, valign: 'middle', overflow: 'linebreak' },
            columnStyles: { 
                // MODIFICATION ICI : largeur fixe au lieu de 'auto' pour forcer le retour à la ligne
                0: { cellWidth: 70 }, 
                [headRow.length - 1]: { cellWidth: 20, halign: 'center', fillColor: [240, 240, 240] }
            }
        });

        startY = doc.lastAutoTable.finalY + 15; 
    };

    // --- C. DESSIN DES SECTIONS ---
    drawSectionTable("Prestation Orale", grille.prestation, 8);
    
    if (startY > 220) { doc.addPage(); startY = 20; }
    drawSectionTable("Contenu de l'exposé", grille.contenu, 12);

    if (grille.bonus && grille.bonus.enabled) {
        if (startY > 250) { doc.addPage(); startY = 20; }
        
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor); 
        doc.text(`Bonus Évaluation en Langue Vivante (Max : +${grille.bonus.maxPoints} pts)`, 14, startY);
        
        let bonusRow = ['Qualité de l\'expression en langue étrangère'];
        grille.bonus.niveaux.forEach((pts) => {
            bonusRow.push(`${pts} pts`);
        });
        bonusRow.push("");

        let headBonus = ['Critère (Si option choisie)'];
        grille.bonus.niveaux.forEach((_, i) => headBonus.push(`Niv. ${i+1}`));
        headBonus.push('Bonus');

        doc.autoTable({
            startY: startY + 3,
            head: [headBonus],
            body: [bonusRow],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, halign: 'center' },
            // MODIFICATION ICI
            styles: { fontSize: 10, cellPadding: 3, valign: 'middle', overflow: 'linebreak' },
            columnStyles: { 
                0: { cellWidth: 70 }, // MODIFICATION ICI
                [headBonus.length - 1]: { cellWidth: 20, halign: 'center', fillColor: [250, 240, 230] }
            }
        });
        startY = doc.lastAutoTable.finalY + 15;
    }

    // --- D. BLOC DE NOTATION FINALE ---
    if (startY > 200) { doc.addPage(); startY = 20; }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(14, startY, 182, 40); 

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Appréciations générales du jury :", 18, startY + 6);
    
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(18, startY + 15, 190, startY + 15);
    doc.line(18, startY + 25, 190, startY + 25);
    doc.line(18, startY + 35, 190, startY + 35);

    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.setFillColor(236, 240, 241);
    doc.rect(130, startY + 45, 66, 20, 'FD');
    
    doc.setFontSize(14);
    doc.text(`NOTE FINALE :        / 20`, 135, startY + 58);

    const safeName = nomExamen.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Grille_Evaluation_${safeName}.pdf`);
};

/**
 * @why Génère une liste chronologique simplifiée (Portrait) de tous les passages.
 * Optimisée pour la Vie Scolaire : focus sur l'heure, l'élève et le lieu (Jury/Salle).
 */
window.exportOralDisplayGlobal = function() {
    // Vérification de l'existence des données de répartition[cite: 1]
    if (!DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        return alert("⚠️ Aucune répartition disponible. Veuillez d'abord lancer l'assistant.");
    }

    const { jsPDF } = window.jspdf;
    // Basculement en mode Portrait ('p') pour une lecture verticale standard
    const doc = new jsPDF('p', 'mm', 'a4'); 
    const primaryColor = [44, 62, 80]; // Bleu institutionnel

    // 1. Mise à plat et enrichissement des données pour le tri
    let allPassages = [];
    Object.keys(DB.oralConfig.distribution).forEach(jury => {
        DB.oralConfig.distribution[jury].forEach(slot => {
            // Récupération de la salle associée au jury via le vivier des professeurs[cite: 1]
            const profs = DB.oralConfig.teachers.filter(t => t.jury === jury);
            const salle = profs.length > 0 ? (profs[0].salle || "---") : "---";
            
            allPassages.push({
                heure: slot.startTime,
                jury: jury,
                salle: salle,
                // Formatage des élèves : Nom (MAJUSCULE) Prénom[cite: 1]
                eleves: slot.students.map(s => `${s.nom.toUpperCase()} ${s.prenom}`).join('\n'),
                classe: [...new Set(slot.students.map(s => s.classe))].join(', ')
            });
        });
    });

    // 2. Tri chronologique strict utilisant l'utilitaire timeToMins
    allPassages.sort((a, b) => timeToMins(a.heure) - timeToMins(b.heure));

    // 3. Construction du document
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(`Vie Scolaire : Liste Chronologique des Oraux`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${DB.config.schoolName || "Établissement"} - Session ${DB.config.year}`, 14, 20);

    // 4. Génération du tableau AutoTable
    doc.autoTable({
        startY: 25,
        head: [['Heure', 'Candidat(s)', 'Classe', 'Jury', 'Salle']],
        body: allPassages.map(p => [p.heure, p.eleves, p.classe, p.jury, p.salle]),
        theme: 'grid',
        headStyles: { fillColor: primaryColor, halign: 'center' },
        styles: { fontSize: 10, cellPadding: 3, valign: 'middle' },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'center', cellWidth: 25 }, // Heure
            1: { cellWidth: 65 },                                      // Candidats
            2: { halign: 'center', cellWidth: 25 },                    // Classe
            3: { halign: 'center', cellWidth: 35 },                    // Jury
            4: { halign: 'center', fontStyle: 'bold', cellWidth: 32 }  // Salle
        },
        // Pied de page avec pagination
        didDrawPage: function (data) {
            doc.setFontSize(8);
            doc.setTextColor(150);
            const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
            doc.text(pageStr, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
    });

    // 5. Sauvegarde du fichier
    const fileName = `Oral_${DB.config.year}_VieScolaire_Chronologique.pdf`;
    doc.save(fileName);
};

/**
 * @why Génère les listes d'affichage publiques destinées aux portes des salles d'examen.
 * Version avec Logo adaptatif et titres centrés.
 */
window.exportOralDisplayByRoom = function() {
    if (!DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        return alert("⚠️ Aucune répartition disponible.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [44, 62, 80];
    let pageCount = 0;

    Object.keys(DB.oralConfig.distribution).forEach(jury => {
        const slots = DB.oralConfig.distribution[jury];
        if (slots.length === 0) return;

        if (pageCount > 0) doc.addPage();
        pageCount++;

        renderOralDocLogo(doc); // Injection du logo

        const profs = DB.oralConfig.teachers.filter(t => t.jury === jury);
        const salle = (profs.length > 0 && profs[0].salle) ? profs[0].salle : "Non définie";

        // En-tête centré pour laisser respirer le logo
        doc.setFontSize(18);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text(`Liste d'Affichage - Salle : ${salle}`, 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Épreuve Orale DNB - Session ${DB.config.year || new Date().getFullYear()}`, 105, 28, { align: 'center' });
        doc.text(`Jury N°${jury}`, 105, 34, { align: 'center' });

        const body = slots.map(slot => [
            `${slot.startTime}`,
            slot.students.map(s => `${s.nom.toUpperCase()} ${s.prenom}`).join('\n'),
            [...new Set(slot.students.map(s => s.classe))].join(', ')
        ]);

        doc.autoTable({
            startY: 45,
            head: [['Heure', 'Candidat(s)', 'Classe']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, halign: 'center' },
            styles: { fontSize: 11, cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 30 },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 30 }
            }
        });
    });

    doc.save(`Affichages_Salles_Oral_${DB.config.year || "2026"}.pdf`);
};

/**
 * @why Génère les pochettes de jury au format A3 (pliage central).
 * Page de droite : Garde, Planning détaillé (avec Langues) et Consignes.
 * Page de gauche : Procès-Verbal de séance et Signatures nominatives.
 * MODIFICATION : Intégration de la langue entre parenthèses après le parcours.
 */
window.exportOralJuryPochettes = function() {
    if (!DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        return alert("⚠️ Aucune répartition disponible.");
    }

    const { jsPDF } = window.jspdf;
    // Format A3 Paysage pour pliage A4 central
    const doc = new jsPDF('l', 'mm', 'a3'); 
    const primaryColor = [44, 62, 80];
    const sessionYear = DB.config.year || "2026";

    Object.keys(DB.oralConfig.distribution).forEach((juryName, idx) => {
        if (idx > 0) doc.addPage();

        const slots = DB.oralConfig.distribution[juryName];
        const juryTeachers = DB.oralConfig.teachers.filter(t => t.jury === juryName);

        // =========================================================
        // PAGE DE DROITE (RECTO / GARDE) : x de 210 à 420
        // =========================================================
        
        // 1. Logo du collège (Adaptatif)
        if (DB.config.logo) {
            try {
                const imgProps = doc.getImageProperties(DB.config.logo);
                const maxW = 35; const maxH = 25;
                const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
                doc.addImage(DB.config.logo, 'PNG', 225, 10, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
            } catch (e) { console.error("Logo error:", e); }
        }

        // 2. Titres
        doc.setFontSize(22);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text(`Oral du DNB - Session ${sessionYear}`, 320, 25, { align: 'center' });
        
        doc.setFontSize(18);
        doc.text(`DOSSIER JURY N°${juryName}`, 320, 35, { align: 'center' });

        // 3. Composition du jury
        const names = juryTeachers.map(t => `${t.civ || ""} ${t.nom.toUpperCase()} ${t.prenom}`).join(' / ');
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Jurys : ${names}`, 320, 45, { align: 'center' });

        // 4. Tableau Planning (Page de droite) avec intégration de la langue
        const tableBody = slots.map(slot => {
            // Formatage spécifique pour inclure la langue après le parcours
            const studentDetails = slot.students.map(s => {
                const parcoursInfo = s.parcours || slot.theme || "Général";
                const langueSuffix = (s.langue && s.langue.trim() !== "") ? ` (${s.langue.trim()})` : "";
                return `${parcoursInfo}${langueSuffix}${slot.sujet ? '\nSujet : ' + slot.sujet : ''}`;
            });

            return [
                slot.startTime,
                slot.students.map(s => `${s.nom.toUpperCase()} ${s.prenom}`).join('\n'),
                [...new Set(slot.students.map(s => s.classe))].join(', '),
                [...new Set(studentDetails)].join('\n---\n') // On évite les doublons de parcours dans le même créneau
            ];
        });

        doc.autoTable({
            startY: 55,
            margin: { left: 225 },
            tableWidth: 180,
            head: [['Heure', 'Candidat(s)', 'Cl.', 'Parcours (Langue) & Sujet']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, fontSize: 10, halign: 'center' },
            styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
            columnStyles: { 
                0: { cellWidth: 20, halign: 'center' }, 
                1: { cellWidth: 50 }, 
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 'auto' }
            }
        });

        // 5. Bloc Consignes (Hauteur adaptative)
        let finalY = doc.lastAutoTable.finalY + 10;
        const consignes = [
            "- Vérifier l'identité des candidats",
            "- Faire émarger les candidats",
            "- Respecter strictement le temps d'harmonisation",
            "- Compléter et signer (par chaque jury) la fiche individuelle d'évaluation.",
            "  La note ainsi qu'une appréciation sont obligatoires.",
            "- Rendre le dossier complet au secrétariat en fin de session"
        ];
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Consignes :", 225, finalY);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const textX = 225;
        let textY = finalY + 7;
        consignes.forEach(line => {
            doc.text(line, textX + 5, textY);
            textY += 6;
        });

        // Cadre autour des consignes
        doc.setDrawColor(...primaryColor);
        doc.rect(220, finalY - 5, 190, (textY - finalY) + 5);

        // =========================================================
        // PAGE DE GAUCHE (PV DE SÉANCE) : x de 0 à 210
        // =========================================================
        
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("PROCÈS-VERBAL DE SÉANCE", 105, 20, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`${DB.config.schoolName || "Établissement"} - Jury N°${juryName}`, 20, 30);
        
        // Statistiques de présence
        const totalCandidats = slots.reduce((acc, s) => acc + s.students.length, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`Nombre de candidats à évaluer : ${totalCandidats}`, 20, 45);
        doc.setFont("helvetica", "normal");
        doc.text(`Nombre de présents : ............`, 20, 55);
        doc.text(`Nombre d'absents : ............`, 110, 55);

        doc.text("Incidents ou observations éventuelles (retards, pannes matérielles, etc.) :", 20, 70);
        doc.setDrawColor(200);
        doc.rect(20, 75, 170, 80);

        // Zone de signatures nominatives
        doc.setFont("helvetica", "bold");
        doc.text("Signatures des membres du jury :", 20, 170);
        
        let sigY = 180;
        juryTeachers.forEach(t => {
            const label = `${t.civ || ""} ${t.nom.toUpperCase()} ${t.prenom}`;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(label, 25, sigY);
            doc.line(25, sigY + 2, 90, sigY + 2); // Ligne pour signer
            sigY += 20;
        });

        // Ligne de pliure centrale (guide pour le secrétariat)
        doc.setDrawColor(220);
        doc.setLineDash([5, 5], 0);
        doc.line(210, 0, 210, 297);
        doc.setLineDash([]);
    });

    doc.save(`Pochettes_A3_Oral_${sessionYear}.pdf`);
};

/**
 * @why Insère le logo de l'établissement de manière adaptative (ratio préservé) 
 * en haut à gauche d'un document jsPDF.
 * @param {object} doc - L'instance du document jsPDF en cours.
 */
const renderOralDocLogo = (doc) => {
    if (DB.config.logo) {
        try {
            const imgProps = doc.getImageProperties(DB.config.logo);
            const maxW = 30; // Largeur maximale (mm)
            const maxH = 20; // Hauteur maximale (mm)
            const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
            doc.addImage(DB.config.logo, 'PNG', 14, 10, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
        } catch (e) {
            console.error("Erreur d'insertion du logo :", e);
        }
    }
};

// État local pour la modale
let signExportOptions = { withParcours: false, withSujet: false };

window.openOralSignModal = function() {
    const modal = document.getElementById('modal-oral-sign-settings');
    if (!modal) return alert("Erreur : modal introuvable. Veuillez rafraîchir la page (F5).");
    modal.style.display = 'flex';
    // Reset visuel par défaut
    toggleSignTile('parcours', false);
    toggleSignTile('sujet', false);
};

window.toggleSignTile = function(type, value) {
    if (type === 'parcours') {
        signExportOptions.withParcours = value;
        document.getElementById('tile-parcours-yes').className = value ? 'btn btn-primary active-tile' : 'btn btn-outline';
        document.getElementById('tile-parcours-no').className = !value ? 'btn btn-primary active-tile' : 'btn btn-outline';
    } else {
        signExportOptions.withSujet = value;
        document.getElementById('tile-sujet-yes').className = value ? 'btn btn-primary active-tile' : 'btn btn-outline';
        document.getElementById('tile-sujet-no').className = !value ? 'btn btn-primary active-tile' : 'btn btn-outline';
    }
};

window.confirmOralSignExport = function() {
    document.getElementById('modal-oral-sign-settings').style.display = 'none';
    exportOralSignLists(signExportOptions.withParcours, signExportOptions.withSujet);
};

window.exportOralSignLists = function(withParcours = false, withSujet = false) {
    if (!DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        return alert("⚠️ Aucune répartition disponible.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [44, 62, 80];
    let pageCount = 0;

    Object.keys(DB.oralConfig.distribution).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(jury => {
        const slots = DB.oralConfig.distribution[jury];
        if (slots.length === 0) return;

        if (pageCount > 0) doc.addPage();
        pageCount++;

        const profs = DB.oralConfig.teachers.filter(t => t.jury === jury);
        const salle = (profs.length > 0 && profs[0].salle) ? profs[0].salle : "Non définie";

        // En-tête
        doc.setFontSize(16).setTextColor(...primaryColor).setFont("helvetica", "bold");
        doc.text(`Feuille d'Émargement - Jury N°${jury}`, 14, 20);

        doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal");
        const dateStr = DB.oralConfig.general.date ? new Date(DB.oralConfig.general.date).toLocaleDateString('fr-FR') : '---';
        doc.text(`${DB.config.schoolName || "Établissement"} | Salle : ${salle} | Date : ${dateStr}`, 14, 28);

        // Construction du corps du tableau
        const body = [];
        slots.forEach(slot => {
            slot.students.forEach((student, index) => {
                const timeDisplay = index === 0 ? `${slot.startTime}` : `(Groupe)`;
                
                // --- CONSTRUCTION DU NOM AVEC OPTIONS ---
                let candidateDisplay = `${student.nom.toUpperCase()} ${student.prenom}`;
                
                if (withParcours && student.parcours) {
                    candidateDisplay += `\nParcours : ${student.parcours}`;
                }
                if (withSujet && student.sujet) {
                    candidateDisplay += `\nSujet : ${student.sujet}`;
                }

                body.push([
                    timeDisplay,
                    candidateDisplay,
                    student.classe,
                    "" // Signature
                ]);
            });
        });

        doc.autoTable({
            startY: 35,
            head: [['Heure', 'Candidat(e)', 'Classe', 'Signature du candidat']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, halign: 'center' },
            styles: { 
                fontSize: 9, 
                minCellHeight: 14, // Légèrement augmenté pour le confort
                valign: 'middle',
                overflow: 'linebreak' // Force le retour à la ligne
            },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
                1: { cellWidth: 70 }, // Élargi pour accueillir les infos parcours/sujet
                2: { halign: 'center', cellWidth: 20 },
                3: { cellWidth: 'auto' }
            }
        });
    });

    doc.save(`Emargement_Jurys_Oral_${DB.config.year}.pdf`);
};


/**
 * @why Génère le bordereau de notation en format PORTRAIT.
 * Optimisation : Plus de lignes par page et colonnes ajustées pour la largeur A4 Portrait.
 */
window.exportOralNotationSheets = function() {
    if (!DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        return alert("⚠️ Aucune répartition disponible.");
    }

    const { jsPDF } = window.jspdf;
    // 'p' pour Portrait, 'mm' pour millimètres, 'a4' pour le format papier
    const doc = new jsPDF('p', 'mm', 'a4'); 
    const primaryColor = [44, 62, 80];
    let pageCount = 0;

    // Le centre de la page A4 en portrait est à 105mm (210 / 2)
    const centerX = 105;

    Object.keys(DB.oralConfig.distribution).forEach(juryKey => {
        const slots = DB.oralConfig.distribution[juryKey];
        if (slots.length === 0) return;

        if (pageCount > 0) doc.addPage();
        pageCount++;

        // Affichage du logo si la fonction existe
        if (typeof renderOralDocLogo === 'function') {
            renderOralDocLogo(doc);
        }

        // Nettoyage de l'ID du jury (pour enlever "jury-" si présent)
        const juryNum = juryKey.replace('jury-', '');

        // En-tête centré
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text(`Bordereau de Synthèse des Notes - Jury N°${juryNum}`, centerX, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        
        // Récupération des membres du jury
        const juryMembers = DB.oralConfig.teachers
            .filter(t => String(t.juryNumber || t.jury) === String(juryNum))
            .map(t => t.nom.toUpperCase())
            .join(', ');
            
        doc.text(`Session ${DB.config.year || new Date().getFullYear()} | Membres : ${juryMembers || "Non définis"}`, centerX, 27, { align: 'center' });

        // Construction des données du tableau
        const body = [];
        slots.forEach(slot => {
            slot.students.forEach(student => {
                body.push([
                    `${student.nom.toUpperCase()} ${student.prenom}`,
                    student.classe || "-",
                    student.sujet || slot.theme || "Non précisé",
                    "" // Case note vide
                ]);
            });
        });

        // Génération du tableau (Largeurs ajustées pour Portrait : total env. 182mm)
        doc.autoTable({
            startY: 35,
            head: [['Candidat(e)', 'Cl.', 'Parcours / Sujet', 'Note / 20']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, halign: 'center', fontSize: 10 },
            styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 55, fontStyle: 'bold' }, // Nom
                1: { halign: 'center', cellWidth: 15 }, // Classe réduite
                2: { cellWidth: 82 },                   // Sujet
                3: { halign: 'center', cellWidth: 30, fillColor: [248, 249, 250] } // Note
            },
            // Permet au tableau de continuer sur la page suivante si trop de lignes
            margin: { left: 14, right: 14, bottom: 30 } 
        });

        // Zone de signatures (en bas de la dernière page du jury ou après le tableau)
        let finalY = doc.lastAutoTable.finalY + 15;
        
        // Sécurité si le tableau finit trop bas sur la page
        if (finalY > 260) {
            doc.addPage();
            finalY = 25;
        }

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("Signatures des membres du jury :", 14, finalY);
        
        doc.setDrawColor(150);
        doc.line(14, finalY + 15, 80, finalY + 15);  // Signature 1
        doc.line(120, finalY + 15, 186, finalY + 15); // Signature 2
    });

    const year = DB.config.year || new Date().getFullYear();
    doc.save(`Bordereaux_Notation_${year}.pdf`);
};

/**
 * @why Met à jour visuellement l'année de session sur le badge du secrétariat.
 * Fonction isolée pour éviter les conflits de routage.
 */
window.updateSecretariatYearDisplay = function() {
    const badge = document.getElementById('badge-session-secretariat');
    // On vérifie que le badge existe et que la base de données est bien chargée
    if (badge && typeof DB !== 'undefined' && DB.config) {
        const year = DB.config.year || new Date().getFullYear();
        badge.innerText = `Session ${year}`;
    }
};

/**
 * @why Retire un élève spécifique d'un créneau de passage dans la répartition en mémoire.
 * Permet de gérer les aléas (départ d'un élève) sans détruire le travail algorithmique déjà validé.
 * 
 * @param {string} juryName - Le nom de la clé du jury (ex: "Jury 1")
 * @param {number} slotIndex - L'index du créneau de passage dans le tableau du jury
 * @param {number} studentIndex - L'index de l'élève dans le tableau des étudiants de ce créneau
 */
window.removeStudentFromSlot = function(juryName, slotIndex, studentIndex) {
    // 1. Contrôle d'intégrité
    if (!DB.oralConfig.distribution[juryName] || !DB.oralConfig.distribution[juryName][slotIndex]) return;

    const slot = DB.oralConfig.distribution[juryName][slotIndex];
    const student = slot.students[studentIndex];

    // 2. Sécurité : Demande de confirmation
    const msg = `⚠️ Voulez-vous vraiment retirer ${student.nom.toUpperCase()} ${student.prenom} de ce créneau de passage ?\n\nCette action libérera sa place. Pensez à sauvegarder votre projet ensuite.`;
    
    if (confirm(msg)) {
        // 3. Mutation : Retrait de l'élève du tableau
        slot.students.splice(studentIndex, 1);

        // 4. Nettoyage : Si le créneau n'a plus aucun élève, on supprime le créneau complet
        if (slot.students.length === 0) {
            DB.oralConfig.distribution[juryName].splice(slotIndex, 1);
        }

        // 5. Réactivité : On force le rafraîchissement visuel du DOM
        if (typeof renderOralVisualDistribution === 'function') {
            renderOralVisualDistribution();
        }
        
        console.log(`🧹 Élève retiré avec succès du ${juryName}.`);
    }
};

/**
 * @why Utilitaire métier qui dessine la trame d'une fiche d'évaluation individuelle.
 * Respecte les standards du BO (8 pts prestation / 12 pts contenu).
 * @param {object} doc - Instance de jsPDF
 * @param {object} data - Objet contenant les infos (nom, prenom, classe, parcours, sujet, jury, date)
 */
function drawEvaluationSheet(doc, data) {
    const primaryColor = [44, 62, 80];

    // Insertion du logo (utilise votre fonction existante)
    if (typeof renderOralDocLogo === 'function') {
        renderOralDocLogo(doc);
    }

    // En-tête
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(`Fiche d'Évaluation Individuelle - Épreuve Orale`, 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Session ${DB.config.year || new Date().getFullYear()} - ${DB.config.schoolName || "Établissement"}`, 105, 28, { align: 'center' });

    // Cadre Identité Candidat
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Candidat(e) : ${data.nom} ${data.prenom}`, 20, 43);
    doc.text(`Classe : ${data.classe}`, 140, 43);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Jury : ${data.jury}`, 20, 51);
    doc.text(`Date / Heure : ${data.date}`, 140, 51);
    
    doc.setFont("helvetica", "italic");
    doc.text(`Parcours / EPI : ${data.parcours}`, 20, 59);
    doc.text(`Sujet : ${data.sujet}`, 20, 65);

    // Grille d'évaluation
    const gridBody = [
        [
            "Maîtrise de l'expression orale\n(Clarté, vocabulaire, fluidité, posture)", 
            "Prestation Orale\n( / 8 pts)", 
            "" // Case pour la note et remarques
        ],
        [
            "Maîtrise du sujet et des connaissances\n(Argumentation, pertinence, réponses aux questions)", 
            "Contenu\n( / 12 pts)", 
            "" 
        ],
        [
            "Points supplémentaires (Optionnel)\n(Utilisation d'une langue étrangère, etc.)", 
            "Bonus\n( / 20 pts -> Non exclusif)", 
            "" 
        ]
    ];

    doc.autoTable({
        startY: 75,
        body: gridBody,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 8, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 80, fontStyle: 'normal' },
            1: { cellWidth: 35, halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] },
            2: { cellWidth: 'auto' } // Zone de saisie manuelle large
        }
    });

    const finalY = doc.lastAutoTable.finalY + 15;

    // Bloc Note Finale
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(140, finalY, 56, 15);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("NOTE FINALE :        / 20", 143, finalY + 10);

    // Appréciation Globale et Signatures
    doc.setFont("helvetica", "bold");
    doc.text("Appréciation Globale et Signatures du Jury :", 14, finalY + 5);
    doc.setDrawColor(150);
    doc.setLineDash([1, 1], 0);
    doc.line(14, finalY + 25, 130, finalY + 25);
    doc.line(14, finalY + 35, 130, finalY + 35);
    doc.line(14, finalY + 45, 130, finalY + 45);
    doc.setLineDash([]);
}

/**
 * @why Fonction maîtresse pour le publipostage des fiches d'évaluation.
 * Ajoute la récupération du "sujet" pour chaque élève.
 */
window.exportPrefilledEvalSheets = function() {
    if (!DB.oralConfig.distribution || Object.keys(DB.oralConfig.distribution).length === 0) {
        return alert("⚠️ Aucune répartition disponible. Veuillez d'abord répartir les élèves.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    let pageCount = 0;

    const dateExam = DB.oralConfig.general?.date 
        ? new Date(DB.oralConfig.general.date).toLocaleDateString('fr-FR') 
        : 'Non définie';

    Object.keys(DB.oralConfig.distribution).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(juryName => {
        const slots = DB.oralConfig.distribution[juryName];

        slots.forEach(slot => {
            slot.students.forEach(student => {
                if (pageCount > 0) doc.addPage();
                
                const langueCandidat = (student.langue && student.langue.trim() !== "") ? student.langue.trim() : null;

                const evalData = {
                    nom: student.nom.toUpperCase(),
                    prenom: student.prenom,
                    classe: student.classe || "N/C",
                    parcours: student.parcours || "Non précisé",
                    sujet: student.sujet || "Non précisé", // RÉCUPÉRATION DU SUJET
                    jury: juryName,
                    horaire: `${dateExam} à ${slot.startTime}`,
                    langue: langueCandidat,
                    isGroup: slot.students.length > 1
                };

                internalRenderEvalDesign(doc, evalData);
                pageCount++;
            });
        });
    });

    const session = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName ? DB.config.schoolName.replace(/[^a-z0-9]/gi, '_') : "Etablissement";
    
    doc.save(`Fiches_Evaluation_Oral_${schoolName}_${session}.pdf`);
};

/**
 * @why Logique de dessin de la fiche d'évaluation (Version Complète).
 * Inversion : Parcours en GRAS, Sujet en NORMAL.
 * CORRECTIF : Retour à la ligne automatique pour les critères longs.
 * AJOUT : Intégration du bloc des signatures du jury en bas de page.
 */
function internalRenderEvalDesign(doc, data) {
    const grille = DB.oralConfig.grille;
    const primaryColor = [44, 62, 80];

    // 1. Logo
    if (DB.config.logo) {
        try {
            const imgProps = doc.getImageProperties(DB.config.logo);
            const ratio = Math.min(30 / imgProps.width, 25 / imgProps.height);
            doc.addImage(DB.config.logo, 'PNG', 14, 10, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
        } catch (e) { console.error("Erreur logo:", e); }
    }

    // 2. Titre du document
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(`Fiche d'Évaluation - Session ${DB.config.year || new Date().getFullYear()}`, 105, 22, { align: 'center' });

    // 3. Bloc d'en-tête (Cadre de 32mm de hauteur)
    doc.setDrawColor(200);
    doc.setFillColor(248, 249, 250);
    doc.rect(14, 31, 182, 32, 'FD'); 
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Candidat(e) : ${data.nom} ${data.prenom} (${data.classe})`, 18, 38);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Parcours : ${data.parcours}`, 18, 44);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Sujet : ${data.sujet}`, 18, 50);
    
    doc.text(`Jury : ${data.jury} | Horaire : ${data.horaire}`, 18, 56);

    if (data.langue) {
        doc.setTextColor(39, 174, 96);
        doc.setFont("helvetica", "bold");
        doc.text(`Option Langue : ${data.langue}`, 18, 61);
        doc.setTextColor(0);
    }

    let startY = 72; 
    
    // 4. Fonction interne de génération des tableaux de la grille
    const drawTable = (title, sectionData, maxPts) => {
        if (!sectionData || !sectionData.criteres || sectionData.criteres.length === 0) return;
        
        let maxLvl = 0;
        sectionData.criteres.forEach(c => { 
            if (c.niveaux && c.niveaux.length > maxLvl) maxLvl = c.niveaux.length; 
        });

        const head = [['Critères', ...Array.from({length: maxLvl}, (_, i) => `Niv ${i+1}`), 'Note']];
        const body = sectionData.criteres.map(c => [
            c.label, 
            ...Array.from({length: maxLvl}, (_, i) => c.niveaux[i] !== undefined ? `${c.niveaux[i]} pts` : '-'),
            "" 
        ]);

        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text(`${title} (Max : ${maxPts} pts)`, 14, startY - 2);

        doc.autoTable({
            startY: startY,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, halign: 'center' },
            styles: { fontSize: 9, cellPadding: 3, valign: 'middle', overflow: 'linebreak' },
            columnStyles: { 
                0: { cellWidth: 70 }, 
                [head[0].length - 1]: { cellWidth: 15, fillColor: [240, 240, 240] } 
            }
        });
        startY = doc.lastAutoTable.finalY + 12;
    };

    // --- AFFICHAGE DES DEUX TABLEAUX DE LA GRILLE ---
    drawTable("Prestation Orale", grille.prestation, 8);
    
    if (startY > 230) { doc.addPage(); startY = 20; }
    drawTable("Contenu de l'exposé", grille.contenu, 12);

    // 5. Section Bonus LVE
    if (grille.bonus?.enabled && data.langue) {
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text(`Bonus LVE : ${data.langue} (Max : +${grille.bonus.maxPoints} pts)`, 14, startY);
        
        const bonusHead = [['Critère', ...grille.bonus.niveaux.map((_, i) => `Niv ${i+1}`), 'Bonus']];
        const bonusBody = [[`Expression en ${data.langue}`, ...grille.bonus.niveaux.map(pts => `${pts} pts`), ""]];
        
        doc.autoTable({
            startY: startY + 2,
            head: bonusHead,
            body: bonusBody,
            theme: 'grid',
            headStyles: { fillColor: primaryColor },
            styles: { fontSize: 9, cellPadding: 3, valign: 'middle', overflow: 'linebreak' },
            columnStyles: { 
                0: { cellWidth: 70 }, 
                [bonusHead[0].length - 1]: { fillColor: [250, 240, 230], halign: 'center', cellWidth: 15 } 
            }
        });
        startY = doc.lastAutoTable.finalY + 10;
    }

    // 6. Bloc Appréciations, Note Finale et SIGNATURES
    // Sécurité : On anticipe le besoin d'espace supplémentaire pour les signatures
    if (startY > 220) { doc.addPage(); startY = 20; }
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(14, startY, 182, 35); 
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.text("Appréciations du jury :", 18, startY + 6);
    
    // Cadre de la Note Finale (à droite)
    doc.setFillColor(236, 240, 241);
    doc.rect(130, startY + 38, 66, 15, 'FD');
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL :        / 20`, 135, startY + 48);

    // NOUVEAU : Bloc Signatures (à gauche)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Signatures des membres du jury :", 18, startY + 44);
    
    // Ligne de signature esthétique
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.line(18, startY + 51, 100, startY + 51);
}
/**
 * @why Initialise et affiche la liste des jurys dans la barre latérale du menu Notes.
 */
function initOralNotesMenu() {
    const listCont = document.getElementById('oral-notes-jurys-list');
    const dist = DB.oralConfig.distribution;
    
    if (!dist || Object.keys(dist).length === 0) {
        listCont.innerHTML = '<p style="font-size: 0.8rem; color: #e74c3c; text-align: center;">Aucune répartition générée.</p>';
        return;
    }

    let html = "";
    Object.keys(dist).forEach(juryId => {
        // Récupération des noms des profs du jury
        const profs = DB.oralConfig.teachers
            .filter(t => t.jury == juryId)
            .map(t => `${t.nom}`)
            .join(' / ');

        html += `
            <div class="jury-item" onclick="selectJuryForNotes('${juryId}')" 
                 style="padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; transition: 0.2s;">
                <div style="font-weight: bold; color: var(--secondary);">Jury ${juryId}</div>
                <div style="font-size: 0.75rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${profs || 'Membres non définis'}</div>
            </div>
        `;
    });
    listCont.innerHTML = html;
}

/**
 * @why Affiche les élèves du jury sélectionné avec une ligne par élève (saisie individuelle).
 * Gère le tri alphabétique des membres à l'intérieur des groupes pour plus de clarté.
 * @param {string} juryId - L'identifiant du jury à afficher.
 */
window.selectJuryForNotes = function(juryId) {
    // UI : Mise en évidence visuelle du jury actif
    document.querySelectorAll('.jury-item').forEach(el => {
        el.style.borderColor = "#ddd";
        el.style.backgroundColor = "white";
    });
    
    const currentEl = event.currentTarget;
    if (currentEl) {
        currentEl.style.borderColor = "var(--secondary)";
        currentEl.style.backgroundColor = "#ebf5fb";
    }

    const container = document.getElementById('oral-notes-table-container');
    const placeholder = document.getElementById('oral-notes-placeholder');
    const tbody = document.getElementById('oral-notes-tbody');
    const title = document.getElementById('current-jury-title');
    const btnSave = document.getElementById('btnSaveOralNotes');

    placeholder.style.display = 'none';
    container.style.display = 'block';
    title.innerText = `Jury ${juryId} : Saisie des notes individuelles`;
    btnSave.innerText = `💾 Sauvegarder les notes du Jury ${juryId}`;
    btnSave.onclick = () => saveJuryNotes(juryId);

    const passages = DB.oralConfig.distribution[juryId] || [];
    tbody.innerHTML = "";

    let rowCounter = 0;

    passages.forEach((p) => {
        // 1. TRI ALPHABÉTIQUE des élèves à l'intérieur du passage
        const sortedStudents = [...p.students].sort((a, b) => a.nom.localeCompare(b.nom));

        sortedStudents.forEach((student, sIdx) => {
            // Recherche de la note existante dans le vivier central de l'oral
            const studentData = DB.oralConfig.students.find(s => s.id === student.id);
            const savedNote = (studentData && studentData.noteOral !== undefined) ? studentData.noteOral : "";

            // On n'affiche l'heure que pour la première ligne du groupe pour plus de lisibilité
            const timeDisplay = (sIdx === 0) ? `<b>${p.startTime}</b>` : `<span style="color:#ccc">${p.startTime}</span>`;
            
            // Style visuel pour marquer le regroupement (bordure plus épaisse entre les créneaux)
            const rowStyle = (sIdx === 0 && rowCounter > 0) ? "border-top: 2px solid #34495e;" : "";

            tbody.innerHTML += `
                <tr style="${rowStyle}">
                    <td style="font-family: monospace; vertical-align: middle;">${timeDisplay}</td>
                    <td style="vertical-align: middle;">
                        <b>${student.nom.toUpperCase()}</b> ${student.prenom}
                        <br><small style="color:#7f8c8d;">${student.parcours || student.sujet || 'Individuel'}</small>
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
                        <input type="number" step="0.5" min="0" max="20" 
                               class="oral-note-input" 
                               data-nav-idx="${rowCounter}"
                               data-student-id="${student.id}"
                               value="${savedNote}"
                               aria-label="Note pour ${student.nom}"
                               style="text-align: center; font-weight: bold; font-size: 1.1rem; border: 1px solid var(--secondary); border-radius: 4px; padding: 5px; width: 80px;"
                               onkeydown="handleNoteNavigation(event, ${rowCounter})">
                    </td>
                </tr>
            `;
            rowCounter++;
        });
    });
};

/**
 * @why Gère le passage à la ligne suivante (Entrée) dans le nouvel ordre généré.
 */
function handleNoteNavigation(event, currentIndex) {
    if (event.key === "Enter") {
        event.preventDefault();
        const nextInput = document.querySelector(`.oral-note-input[data-nav-idx="${currentIndex + 1}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        } else {
            document.getElementById('btnSaveOralNotes').focus();
        }
    }
}

/**
 * @why Enregistre les notes INDIVIDUELLES dans l'objet global DB.
 * Met à jour à la fois le module Oral et le module Simulation (Grades).
 */
function saveJuryNotes(juryId) {
    const inputs = document.querySelectorAll('.oral-note-input');
    let count = 0;

    inputs.forEach(input => {
        const studentId = input.getAttribute('data-student-id');
        const val = input.value === "" ? undefined : parseFloat(input.value);
        
        // 1. Mise à jour dans le vivier spécifique à l'oral (pour la persistance du menu actuel)
        const sOral = DB.oralConfig.students.find(s => s.id == studentId);
        if (sOral) sOral.noteOral = val;

        // 2. Mise à jour dans la base globale des élèves (pour le menu Simulation/Résultats)[cite: 1]
        const sGlobal = DB.students.find(s => s.id == studentId);
        if (sGlobal) {
            if (!sGlobal.grades) sGlobal.grades = {};
            sGlobal.grades.oral = val;
        }
        count++;
    });

    alert(`✅ ${count} notes individuelles enregistrées pour le Jury ${juryId}.`);
}

/**
 * @why Construit le tableau des résultats en croisant les données des élèves et de la répartition.
 * @logic Tri alphabétique systématique et filtrage dynamique.
 */
window.renderOralResultsTable = function() {
    const tbody = document.getElementById('oral-results-tbody');
    const searchTerm = document.getElementById('search-oral-results').value.toLowerCase();
    
    if (!DB.oralConfig.students) return;

    // 1. Préparation et Tri des données
    const students = [...DB.oralConfig.students].sort((a, b) => a.nom.localeCompare(b.nom));

    // 2. Génération du HTML
    let html = "";
    students.forEach(s => {
        // Recherche du jury dans la distribution
        let juryId = "-";
        Object.keys(DB.oralConfig.distribution || {}).forEach(jId => {
            const found = DB.oralConfig.distribution[jId].some(slot => 
                slot.students.some(st => st.id === s.id)
            );
            if (found) juryId = jId;
        });

        const fullName = `${s.nom.toUpperCase()} ${s.prenom}`;
        
        // Filtre de recherche
        if (searchTerm && !fullName.toLowerCase().includes(searchTerm) && !s.classe?.toLowerCase().includes(searchTerm)) {
            return;
        }

        const note = (s.noteOral !== undefined) ? s.noteOral : "";

        html += `
            <tr onclick="editOralNoteInline('${s.id}')" style="cursor: pointer;" title="Cliquez pour modifier la note">
                <td><b>${s.nom.toUpperCase()}</b> ${s.prenom}</td>
                <td>${s.classe || "N/C"}</td>
                <td><small>${s.parcours || "Général"}</small></td>
                <td style="text-align: center;"><span class="badge" style="background:#eee; color:#333;">${juryId}</span></td>
                <td style="text-align: center; font-weight: bold; color: var(--primary);" id="note-cell-${s.id}">
                    ${note !== "" ? note : '<span style="color:#ccc; font-weight:normal;">-</span>'}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center; padding:30px;">Aucun résultat trouvé.</td></tr>';
};

/**
 * @why Permet la modification rapide d'une note directement depuis le tableau.
 */
window.editOralNoteInline = function(studentId) {
    const student = DB.oralConfig.students.find(s => s.id == studentId);
    if (!student) return;

    const newNote = prompt(`Saisir la note de ${student.nom} ${student.prenom} :`, student.noteOral || "");
    
    if (newNote === null) return; // Annulation

    const parsedNote = newNote === "" ? undefined : parseFloat(newNote.replace(',', '.'));

    if (newNote !== "" && (isNaN(parsedNote) || parsedNote < 0 || parsedNote > 20)) {
        alert("⚠️ Veuillez saisir une note valide entre 0 et 20.");
        return;
    }

    // Mise à jour base Oral
    student.noteOral = parsedNote;

    // Mise à jour base globale pour la simulation
    const sGlobal = DB.students.find(s => s.id == studentId);
    if (sGlobal) {
        if (!sGlobal.grades) sGlobal.grades = {};
        sGlobal.grades.oral = parsedNote;
    }

    renderOralResultsTable(); // Rafraîchissement visuel
};

/**
 * @why Génère un fichier Excel des résultats.
 */
window.exportOralResultsExcel = function() {
    const data = DB.oralConfig.students.map(s => {
        let juryId = "-";
        Object.keys(DB.oralConfig.distribution || {}).forEach(jId => {
            const found = DB.oralConfig.distribution[jId].some(slot => slot.students.some(st => st.id === s.id));
            if (found) juryId = jId;
        });

        return {
            "Nom": s.nom.toUpperCase(),
            "Prénom": s.prenom,
            "Classe": s.classe || "",
            "Parcours": s.parcours || "Général",
            "Jury": juryId,
            "Note / 20": s.noteOral !== undefined ? s.noteOral : ""
        };
    }).sort((a,b) => a.Nom.localeCompare(b.Nom));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Résultats Orale");
    XLSX.writeFile(wb, `Resultats_Oral_${DB.config.year}.xlsx`);
};

/**
 * @why Génère le procès-verbal officiel des résultats de l'épreuve orale au format PDF.
 * CORRECTIF : Gestion dynamique de l'axe Y pour éviter le chevauchement avec le logo.
 */
window.exportOralResultsPDF = function() {
    // 1. Sécurité : Vérification des librairies et des données
    if (typeof window.jspdf === 'undefined') return alert("⚠️ La librairie jsPDF n'est pas chargée.");
    if (!DB.oralConfig || !DB.oralConfig.students || DB.oralConfig.students.length === 0) {
        return alert("⚠️ Aucun résultat à exporter.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [44, 62, 80]; // Bleu foncé institutionnel

    // Position Y par défaut pour le titre (si pas de logo)
    let startYOffset = 22; 

    // 2. En-tête du document et Logo
    if (DB.config.logo) {
        try {
            const imgProps = doc.getImageProperties(DB.config.logo);
            const ratio = Math.min(30 / imgProps.width, 25 / imgProps.height);
            doc.addImage(DB.config.logo, 'PNG', 14, 10, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
            
            // On repousse le titre sous le logo (le logo a une hauteur max de 25, positionné à Y=10)
            startYOffset = 45; 
        } catch (e) { 
            console.error("Erreur logo:", e); 
        }
    }

    // 3. Titres (Dynamiques selon la présence du logo)
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Procès-Verbal des Résultats - Épreuve Orale", 105, startYOffset, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";
    doc.text(`Session ${sessionYear} - ${schoolName}`, 105, startYOffset + 8, { align: 'center' });

    // 4. Préparation des données du tableau
    const students = [...DB.oralConfig.students].sort((a, b) => a.nom.localeCompare(b.nom));
    
    const tableBody = students.map(s => {
        let juryId = "-";
        if (DB.oralConfig.distribution) {
            Object.keys(DB.oralConfig.distribution).forEach(jId => {
                const found = DB.oralConfig.distribution[jId].some(slot => slot.students.some(st => st.id === s.id));
                if (found) juryId = jId;
            });
        }

        const noteAffichage = (s.noteOral !== undefined && s.noteOral !== null && s.noteOral !== "") 
            ? `${s.noteOral} / 20` 
            : "ABS / Non saisie";

        return [
            `${s.nom.toUpperCase()} ${s.prenom}`,
            s.classe || "N/C",
            s.parcours || "Général",
            `Jury ${juryId}`,
            noteAffichage
        ];
    });

    // 5. Génération de la grille PDF
    doc.autoTable({
        startY: startYOffset + 18, // Repousse le tableau en fonction du titre
        head: [['Nom Prénom', 'Classe', 'Parcours', 'Jury', 'Note']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, halign: 'center' },
        styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 50 },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold', textColor: [39, 174, 96] }
        },
        // Coloration en rouge des absents / notes non saisies
        didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 4) {
                if (data.cell.raw === "ABS / Non saisie") {
                    data.cell.styles.textColor = [231, 76, 60]; 
                    data.cell.styles.fontStyle = 'italic';
                }
            }
        }
    });

    // 6. Sauvegarde et Formatage du nom de fichier
    const safeName = schoolName
        .normalize("NFD")                      // Décompose les accents (ex: é -> e + ´)
        .replace(/[\u0300-\u036f]/g, "")       // Supprime les marques d'accentuation
        .replace(/[^a-zA-Z0-9]/g, '_')         // Remplace ponctuation et espaces par des underscores
        .replace(/_+/g, '_')                   // Fusionne les underscores multiples (ex: de_l__Estey -> de_l_Estey)
        .replace(/^_|_$/g, '');                // Nettoie les underscores en début ou fin de chaîne

    doc.save(`Resultats_Oral_${safeName}_${sessionYear}.pdf`);
};

/**
 * @why Utilitaire mathématique central. Évite la répétition de code.
 * @logic Filtre les élèves n'ayant pas de note valide, puis calcule min, max et moyenne.
 * @param {Array} studentsList - Liste d'objets élèves
 * @returns {Object} Objet contenant {min, max, avg, count}
 */
function calculateGradeStats(studentsList) {
    const graded = studentsList.filter(s => typeof s.noteOral === 'number' && !isNaN(s.noteOral));
    
    if (graded.length === 0) return { min: "-", max: "-", avg: "-", count: 0 };
    
    const grades = graded.map(s => s.noteOral);
    const min = Math.min(...grades);
    const max = Math.max(...grades);
    const avg = (grades.reduce((sum, val) => sum + val, 0) / grades.length).toFixed(2);
    
    return { min, max, avg, count: graded.length };
}

/**
 * @why Génère un tableau de bord d'harmonisation "haute densité" (Vision Macro).
 * Optimise l'espace pour afficher jusqu'à 7 colonnes de jurys simultanément.
 */
window.renderOralHarmonisation = function() {
    const cohortBanner = document.getElementById('harmonisation-cohort-banner');
    const cardsGrid = document.getElementById('harmonisation-cards-grid');
    
    if (!cohortBanner || !cardsGrid || !DB.oralConfig.students) return;

    // 1. Forçage CSS pour la haute densité (Grid CSS optimisée)
    cardsGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(160px, 1fr))";
    cardsGrid.style.gap = "15px";

    // 2. Statistiques globales (La Référence) - Version compacte
    const cohortStats = calculateGradeStats(DB.oralConfig.students);
    
    cohortBanner.style.marginBottom = "15px"; // Moins de marge sous la bannière
    cohortBanner.innerHTML = `
        <article aria-label="Statistiques de la cohorte" style="background: linear-gradient(135deg, #2c3e50, #34495e); color: white; padding: 12px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div>
                <h4 style="margin: 0 0 2px 0; font-size: 1rem; color: #ecf0f1;">COHORTE GLOBALE (${cohortStats.count} candidats)</h4>
                <div style="font-size: 0.8rem; color: #bdc3c7;">Min : <b>${cohortStats.min}</b> | Max : <b>${cohortStats.max}</b></div>
            </div>
            <div style="text-align: right; font-size: 1.8rem; font-weight: bold; line-height: 1;">
                ${cohortStats.avg} <span style="font-size: 0.9rem; color: #bdc3c7; font-weight: normal;">/ 20</span>
            </div>
        </article>
    `;

    // 3. Statistiques par Jury (Génération des mini-cartes)
    const dist = DB.oralConfig.distribution || {};
    let cardsHtml = "";

    Object.keys(dist).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(juryId => {
        let studentIdsInJury = [];
        dist[juryId].forEach(slot => {
            slot.students.forEach(s => studentIdsInJury.push(s.id));
        });

        const juryStudents = DB.oralConfig.students.filter(s => studentIdsInJury.includes(s.id));
        const stats = calculateGradeStats(juryStudents);

        let alertBadge = "";
        let cardBorder = "border: 1px solid #e0e0e0;";
        let avgColor = "var(--primary)";

        // Analyse de l'écart (Miniaturisation des badges)
        if (cohortStats.avg !== "-" && stats.avg !== "-") {
            const diff = parseFloat(stats.avg) - parseFloat(cohortStats.avg);
            if (diff >= 1.5) {
                alertBadge = `<span title="Sur-notation potentielle" aria-label="Sur-noté de ${diff.toFixed(2)}" style="background: #e8f8f5; color: #27ae60; padding: 2px 6px; border-radius: 8px; font-size: 0.7rem; font-weight: bold;">+${diff.toFixed(2)}</span>`;
                cardBorder = "border: 2px solid #27ae60;";
                avgColor = "#27ae60";
            } else if (diff <= -1.5) {
                alertBadge = `<span title="Sous-notation potentielle" aria-label="Sous-noté de ${diff.toFixed(2)}" style="background: #fdedec; color: #e74c3c; padding: 2px 6px; border-radius: 8px; font-size: 0.7rem; font-weight: bold;">${diff.toFixed(2)}</span>`;
                cardBorder = "border: 2px solid #e74c3c;";
                avgColor = "#e74c3c";
            } else {
                alertBadge = `<span title="Notation dans la norme" aria-label="Dans la norme" style="background: #f8f9fa; color: #7f8c8d; padding: 2px 6px; border-radius: 8px; font-size: 0.7rem;">≈</span>`;
            }
        }

        cardsHtml += `
            <article aria-label="Jury ${juryId}" style="background: white; border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); ${cardBorder} display: flex; flex-direction: column;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 0.95rem; color: var(--secondary);">Jury ${juryId} <span style="font-size: 0.8rem; color: #7f8c8d; font-weight: normal;">(${stats.count})</span></h4>
                    <div>${alertBadge}</div>
                </div>

                <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px 0;">
                    <div style="text-align: center;">
                        <span style="font-size: 2rem; font-weight: bold; color: ${avgColor}; line-height: 1;">${stats.avg}</span>
                    </div>
                </div>

                <div style="border-top: 1px solid #eee; padding-top: 8px; display: flex; justify-content: space-between; font-size: 0.75rem; color: #34495e;">
                    <div>Min: <b>${stats.min}</b></div>
                    <div>Max: <b>${stats.max}</b></div>
                </div>
            </article>
        `;
    });

    cardsGrid.innerHTML = cardsHtml || "<p style='grid-column: 1 / -1; text-align: center; color: #7f8c8d;'>Aucune donnée de jury disponible.</p>";
};

/**
 * @why Génère un tableau de bord visuel (bar charts en CSS pur) pour analyser les performances.
 * Respecte les normes RGAA via des attributs ARIA sur les barres de progression.
 */
window.renderOralDataViz = function() {
    const kpiBanner = document.getElementById('dataviz-kpi-banner');
    const demoCharts = document.getElementById('dataviz-demo-charts');
    const parcoursCharts = document.getElementById('dataviz-parcours-charts');
    
    if (!kpiBanner || !demoCharts || !parcoursCharts || !DB.oralConfig.students) return;

    const students = DB.oralConfig.students;
    const cohortStats = calculateGradeStats(students);

    if (cohortStats.count === 0) {
        kpiBanner.innerHTML = "<p style='color: #7f8c8d;'>Aucune donnée saisie pour le moment.</p>";
        demoCharts.innerHTML = ""; parcoursCharts.innerHTML = "";
        return;
    }

    // --- 1. BANDEAU KPI (Indicateurs clés) ---
    kpiBanner.innerHTML = `
        <div style="flex: 1; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-left: 5px solid var(--primary);">
            <div style="font-size: 0.9rem; color: #7f8c8d; text-transform: uppercase;">Moyenne Globale</div>
            <div style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">${cohortStats.avg} <span style="font-size: 1.2rem; color: #bdc3c7;">/ 20</span></div>
        </div>
        <div style="flex: 1; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-left: 5px solid #27ae60;">
            <div style="font-size: 0.9rem; color: #7f8c8d; text-transform: uppercase;">Note Maximale</div>
            <div style="font-size: 2.5rem; font-weight: bold; color: #27ae60;">${cohortStats.max}</div>
        </div>
        <div style="flex: 1; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-left: 5px solid #e74c3c;">
            <div style="font-size: 0.9rem; color: #7f8c8d; text-transform: uppercase;">Note Minimale</div>
            <div style="font-size: 2.5rem; font-weight: bold; color: #e74c3c;">${cohortStats.min}</div>
        </div>
    `;

    // --- 2. FONCTION HELPER : BARRE DE PROGRESSION CSS ---
    const createVisualBar = (label, stats) => {
        if (stats.count === 0 || stats.avg === "-") return '';
        
        const avgNum = parseFloat(stats.avg);
        const percentage = (avgNum / 20) * 100;
        
        // Colorimétrie sémantique douce
        let barColor = "var(--primary)";
        if (avgNum >= 15) barColor = "#27ae60"; // Vert (Très bien)
        else if (avgNum < 10) barColor = "#e74c3c"; // Rouge (Fragile)

        return `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: #2c3e50;">${label} <span style="font-size: 0.8rem; color: #7f8c8d; font-weight: normal;">(${stats.count})</span></span>
                    <span style="font-weight: bold; color: ${barColor};">${stats.avg}</span>
                </div>
                <!-- Jauge accessible RGAA -->
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1; background: #ecf0f1; border-radius: 6px; height: 14px; overflow: hidden;" 
                         role="progressbar" aria-valuenow="${avgNum}" aria-valuemin="0" aria-valuemax="20" aria-label="Moyenne ${label}">
                        <div style="width: ${percentage}%; background: ${barColor}; height: 100%; border-radius: 6px; transition: width 0.8s ease-out;"></div>
                    </div>
                    <div style="font-size: 0.75rem; color: #95a5a6; width: 85px; text-align: right; font-family: monospace;">
                        ${stats.min} <span style="color:#ccc;">↔</span> ${stats.max}
                    </div>
                </div>
            </div>
        `;
    };

    // --- 3. RENDU DÉMOGRAPHIE ET CLASSES ---
    const girls = students.filter(s => s.sexe === 'F');
    const boys = students.filter(s => s.sexe === 'M');
    
    let htmlDemo = "";
    htmlDemo += createVisualBar("👧 Filles", calculateGradeStats(girls));
    htmlDemo += createVisualBar("👦 Garçons", calculateGradeStats(boys));
    
    htmlDemo += `<div style="height: 1px; background: #eee; margin: 25px 0;"></div>`; // Séparateur

    const classes = [...new Set(students.map(s => s.classe || "N/C"))].sort();
    classes.forEach(c => {
        const classStudents = students.filter(s => (s.classe || "N/C") === c);
        htmlDemo += createVisualBar(`Classe ${c}`, calculateGradeStats(classStudents));
    });
    demoCharts.innerHTML = htmlDemo;

    // --- 4. RENDU PARCOURS & EPI ---
    let htmlParcours = "";
    const parcoursList = [...new Set(students.map(s => s.parcours || "Général"))].sort();
    parcoursList.forEach(p => {
        const parcoursStudents = students.filter(s => (s.parcours || "Général") === p);
        htmlParcours += createVisualBar(`📍 ${p}`, calculateGradeStats(parcoursStudents));
    });
    parcoursCharts.innerHTML = htmlParcours || "<p style='color: #7f8c8d;'>Aucun parcours défini.</p>";
};

/**
 * @why Génère le rapport analytique d'harmonisation au format PDF.
 * Construit un tableau colorimétrique pour repérer les écarts de notation sur papier.
 */
window.exportOralHarmonisationPDF = function() {
    if (typeof window.jspdf === 'undefined') return alert("⚠️ La librairie jsPDF n'est pas chargée.");
    if (!DB.oralConfig || !DB.oralConfig.students) return alert("⚠️ Aucune donnée à exporter.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [44, 62, 80];

    // --- 1. En-tête et Titre ---
    if (DB.config.logo) {
        try {
            const imgProps = doc.getImageProperties(DB.config.logo);
            const ratio = Math.min(30 / imgProps.width, 25 / imgProps.height);
            doc.addImage(DB.config.logo, 'PNG', 14, 10, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
        } catch (e) { console.error(e); }
    }

    const startY = DB.config.logo ? 45 : 22;
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Rapport d'Harmonisation - Épreuve Orale", 105, startY, { align: 'center' });

    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Session ${sessionYear} - ${schoolName}`, 105, startY + 8, { align: 'center' });

    // --- 2. Calcul des données ---
    const cohortStats = calculateGradeStats(DB.oralConfig.students);
    const dist = DB.oralConfig.distribution || {};
    
    // Construction des lignes du tableau PDF
    const tableBody = [];
    
    // Première ligne : La Cohorte (Référence)
    tableBody.push([
        "COHORTE GLOBALE", 
        cohortStats.count.toString(), 
        cohortStats.min.toString(), 
        cohortStats.max.toString(), 
        cohortStats.avg.toString(), 
        "RÉFÉRENCE"
    ]);

    Object.keys(dist).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(juryId => {
        let studentIdsInJury = [];
        dist[juryId].forEach(slot => slot.students.forEach(s => studentIdsInJury.push(s.id)));

        const juryStudents = DB.oralConfig.students.filter(s => studentIdsInJury.includes(s.id));
        const stats = calculateGradeStats(juryStudents);

        let ecartAffichage = "Dans la norme";
        if (cohortStats.avg !== "-" && stats.avg !== "-") {
            const diff = parseFloat(stats.avg) - parseFloat(cohortStats.avg);
            if (diff >= 1.5) ecartAffichage = `+${diff.toFixed(2)}`;
            else if (diff <= -1.5) ecartAffichage = diff.toFixed(2);
        }

        tableBody.push([
            `Jury ${juryId}`,
            stats.count.toString(),
            stats.min.toString(),
            stats.max.toString(),
            stats.avg.toString(),
            ecartAffichage
        ]);
    });

    // --- 3. Génération de la grille autoTable ---
    doc.autoTable({
        startY: startY + 18,
        head: [['Périmètre', 'Candidats', 'Min', 'Max', 'Moyenne / 20', 'Écart vs Cohorte']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, halign: 'center' },
        styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center', fontStyle: 'bold' }
        },
        // Logique de coloration des cellules (Vert = Sur-notation, Rouge = Sous-notation)
        didParseCell: function(data) {
            // Mise en évidence de la ligne Cohorte
            if (data.row.index === 0) {
                data.cell.styles.fillColor = [236, 240, 241]; // Gris très clair
                data.cell.styles.textColor = [44, 62, 80];
            }
            
            // Coloration de l'écart
            if (data.section === 'body' && data.column.index === 5 && data.row.index > 0) {
                const ecart = data.cell.raw;
                if (ecart.startsWith('+')) {
                    data.cell.styles.textColor = [39, 174, 96]; // Vert
                } else if (ecart !== "Dans la norme") {
                    data.cell.styles.textColor = [231, 76, 60]; // Rouge
                } else {
                    data.cell.styles.textColor = [127, 140, 141]; // Gris
                    data.cell.styles.fontStyle = 'normal';
                }
            }
        }
    });

    // --- 4. Export (Avec nettoyage de chaîne sécurisé) ---
    const safeName = schoolName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    doc.save(`Harmonisation_Oral_${safeName}_${sessionYear}.pdf`);
};
/**
 * @why Génère un rapport PDF natif, vectoriel et institutionnel des statistiques de performances.
 * Reproduit la sémantique colorimétrique (Vert/Rouge) de la vue écran pour faciliter l'analyse sur papier.
 */
window.exportOralDataVizPDF = function() {
    if (typeof window.jspdf === 'undefined') return alert("⚠️ La librairie jsPDF n'est pas chargée.");
    if (!DB.oralConfig || !DB.oralConfig.students || DB.oralConfig.students.length === 0) {
        return alert("⚠️ Aucune donnée à exporter.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [44, 62, 80]; // Bleu foncé

    let startYOffset = 22; 

    // --- 1. En-tête Institutionnel et Logo ---
    if (DB.config.logo) {
        try {
            const imgProps = doc.getImageProperties(DB.config.logo);
            const ratio = Math.min(30 / imgProps.width, 25 / imgProps.height);
            doc.addImage(DB.config.logo, 'PNG', 14, 10, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
            startYOffset = 45; 
        } catch (e) { console.error("Erreur logo:", e); }
    }

    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Rapport Pédagogique - Épreuve Orale", 105, startYOffset, { align: 'center' });

    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Session ${sessionYear} - ${schoolName}`, 105, startYOffset + 8, { align: 'center' });

    // --- 2. Recalcul des Données et KPIs ---
    const students = DB.oralConfig.students;
    const cohortStats = calculateGradeStats(students);

    // Bloc textuel pour les KPI Globaux
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("1. Indicateurs Globaux de la Cohorte", 14, startYOffset + 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Effectif évalué : ${cohortStats.count} candidats`, 14, startYOffset + 28);
    doc.text(`Moyenne de l'établissement : ${cohortStats.avg} / 20`, 14, startYOffset + 33);
    doc.text(`Amplitude : Note minimale (${cohortStats.min}) | Note maximale (${cohortStats.max})`, 14, startYOffset + 38);

    // --- Fonction Helper pour coloriser les cellules (Feedback Visuel) ---
    const colorizeGradeCell = (data) => {
        if (data.section === 'body' && data.column.index === 2 && data.cell.raw !== "-") {
            const val = parseFloat(data.cell.raw);
            if (val >= 15) {
                data.cell.styles.textColor = [39, 174, 96]; // Vert (Excellence)
            } else if (val < 10) {
                data.cell.styles.textColor = [231, 76, 60]; // Rouge (Fragilité)
            } else {
                data.cell.styles.textColor = [41, 128, 185]; // Bleu (Standard)
            }
        }
    };

    // Configuration standard pour autoTable
    const tableConfig = {
        theme: 'striped',
        headStyles: { fillColor: primaryColor, halign: 'center' },
        styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center', fontStyle: 'bold' },
            3: { halign: 'center' },
            4: { halign: 'center' }
        },
        didParseCell: colorizeGradeCell
    };

    // --- 3. Tableau Démographie & Classes ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("2. Analyse Démographique et par Classes", 14, startYOffset + 50);

    const demoBody = [];
    demoBody.push(["Filles", ...Object.values(calculateGradeStats(students.filter(s => s.sexe === 'F')))]);
    demoBody.push(["Garçons", ...Object.values(calculateGradeStats(students.filter(s => s.sexe === 'M')))]);
    
    const classes = [...new Set(students.map(s => s.classe || "N/C"))].sort();
    classes.forEach(c => {
        demoBody.push([`Classe ${c}`, ...Object.values(calculateGradeStats(students.filter(s => (s.classe || "N/C") === c)))]);
    });

    doc.autoTable({
        startY: startYOffset + 54,
        head: [['Périmètre', 'Min', 'Max', 'Moyenne / 20', 'Effectif']],
        body: demoBody.map(row => [row[0], row[1], row[2], row[3], row[4]]), // Réorganisation des colonnes de calculateGradeStats
        ...tableConfig
    });

    // --- 4. Tableau Parcours ---
    const finalY = doc.lastAutoTable.finalY || (startYOffset + 54);
    
    // Ajout d'une nouvelle page si on manque de place
    if (finalY > 250) doc.addPage();
    
    const parcoursStartY = (finalY > 250) ? 20 : finalY + 15;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("3. Analyse par Parcours Éducatifs", 14, parcoursStartY);

    const parcoursBody = [];
    const parcoursList = [...new Set(students.map(s => s.parcours || "Général"))].sort();
    parcoursList.forEach(p => {
        parcoursBody.push([p, ...Object.values(calculateGradeStats(students.filter(s => (s.parcours || "Général") === p)))]);
    });

    doc.autoTable({
        startY: parcoursStartY + 4,
        head: [['Parcours', 'Min', 'Max', 'Moyenne / 20', 'Effectif']],
        body: parcoursBody.map(row => [row[0], row[1], row[2], row[3], row[4]]),
        ...tableConfig
    });

    // --- 5. Formatage du Nom de Fichier et Sauvegarde ---
    const safeName = schoolName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    doc.save(`Statistiques_Oral_${safeName}_${sessionYear}.pdf`);
};

/**
 * @why Génère un document officiel listant la composition des jurys et leurs salles.
 * Version corrigée : Récupère la salle directement depuis les données des professeurs (t.salle).
 */
window.exportOralJurysPDF = function() {
    // 1. Vérifications de sécurité
    if (typeof window.jspdf === 'undefined') return alert("⚠️ La librairie jsPDF n'est pas chargée.");
    if (!DB.oralConfig || !DB.oralConfig.teachers || DB.oralConfig.teachers.length === 0) {
        return alert("⚠️ Aucun enseignant n'est configuré pour l'oral.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor = [44, 62, 80];

    let startYOffset = 22; 

    // 2. En-tête Institutionnel
    if (DB.config.logo) {
        try {
            const imgProps = doc.getImageProperties(DB.config.logo);
            const ratio = Math.min(30 / imgProps.width, 25 / imgProps.height);
            doc.addImage(DB.config.logo, 'PNG', 14, 10, imgProps.width * ratio, imgProps.height * ratio, undefined, 'FAST');
            startYOffset = 45; 
        } catch (e) { console.error("Erreur logo:", e); }
    }

    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Composition des Jurys - Épreuve Orale", 105, startYOffset, { align: 'center' });

    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Session ${sessionYear} - ${schoolName}`, 105, startYOffset + 8, { align: 'center' });

    // 3. Agrégation des données
    const juriesSet = new Set(
        DB.oralConfig.teachers
            .filter(t => t.jury && t.jury !== "")
            .map(t => t.jury)
    );
    
    const juriesList = [...juriesSet].sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));

    if (juriesList.length === 0) {
        return alert("⚠️ Aucun jury n'a encore été constitué.");
    }

    const tableBody = juriesList.map(juryId => {
        // Récupération des membres du jury
        const members = DB.oralConfig.teachers.filter(t => t.jury == juryId);
        const membersFormatted = members.map(t => `• ${t.nom.toUpperCase()} ${t.prenom || ""}`).join('\n');

        // CORRECTIF : Recherche de la salle sur les membres du jury (prioritaire)
        let roomDisplay = "Non assignée";
        
        // On cherche le premier prof du jury qui a une salle saisie
        const teacherWithRoom = members.find(t => t.salle && String(t.salle).trim() !== "");
        
        if (teacherWithRoom) {
            roomDisplay = teacherWithRoom.salle;
        } else if (DB.oralConfig.rooms && Array.isArray(DB.oralConfig.rooms)) {
            // Fallback : recherche dans le tableau rooms si non trouvé sur le prof
            const room = DB.oralConfig.rooms.find(r => r.jury == juryId);
            if (room) {
                roomDisplay = room.nom || room.name || room.libelle || `Salle ${room.id}`;
            }
        }

        return [
            `Jury ${juryId}`,
            roomDisplay,
            membersFormatted
        ];
    });

    // 4. Génération de la grille PDF
    doc.autoTable({
        startY: startYOffset + 18,
        head: [['Jury', 'Salle', 'Membres du Jury']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, halign: 'center', fontSize: 11 },
        styles: { fontSize: 10, cellPadding: 5, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: primaryColor },
            1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
            2: { cellWidth: 'auto' }
        }
    });

    // 5. Sauvegarde
    const safeName = schoolName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    doc.save(`Composition_Jurys_Oral_${safeName}_${sessionYear}.pdf`);
};
// ==========================================
// HELPERS (Utilitaires de croisement de données)
// ==========================================

/**
 * @why Convertit une date AAAA-MM-JJ en format français JJ/MM/AAAA
 */
function formatDateFR(dateStr) {
    if (!dateStr || dateStr.trim() === "" || dateStr === "Date non définie") return "Date non définie";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr; // Si déjà formaté ou format inconnu
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * @why Trouve les informations de passage d'un élève précis dans la distribution globale.
 */
function getStudentOralSchedule(studentId) {
    const dist = DB.oralConfig.distribution || {};
    for (let juryId in dist) {
        for (let slot of dist[juryId]) {
            if (slot.students.some(s => s.id === studentId)) {
                return { juryId, startTime: slot.startTime, endTime: slot.endTime };
            }
        }
    }
    return null; // Non planifié
}

/**
 * @why Trouve le nom de la salle affectée à un jury.
 */
function getJuryRoomName(juryId) {
    if (!DB.oralConfig.rooms) return "Non assignée";
    const room = DB.oralConfig.rooms.find(r => r.jury == juryId);
    return room ? (room.nom || room.name || `Salle ${room.id}`) : "Non assignée";
}

/**
 * @why Construit l'en-tête officiel standardisé pour tous les documents.
 * Correction : Intègre le formatage de la date en français.
 */
function drawOfficialHeader(doc, title, startY = 15) {
    if (DB.config.logo) {
        try {
            const props = doc.getImageProperties(DB.config.logo);
            const ratio = Math.min(25 / props.width, 20 / props.height);
            doc.addImage(DB.config.logo, 'PNG', 14, startY, props.width * ratio, props.height * ratio);
        } catch(e){}
    }
    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";
    
    // --- MODIFICATION ICI ---
    const rawDate = DB.oralConfig.general?.date || "";
    const oralDate = formatDateFR(rawDate);
    // ------------------------

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text(title, 105, startY + 10, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Session ${sessionYear} - ${schoolName} | Date de l'épreuve : ${oralDate}`, 105, startY + 16, { align: 'center' });
}

// Logique d'affichage conditionnel du champ minutes
    document.getElementById('convoc-check-accueil').addEventListener('change', function(e) {
        document.getElementById('convoc-offset-container').style.display = e.target.checked ? 'block' : 'none';
    });
	
	
	/**
 * Ouvre la modale et pré-remplit avec les dernières valeurs sauvegardées
 */
window.openOralConvocModal = function() {
    if (typeof setupOralDatabase === 'function') setupOralDatabase();
    const modal = document.getElementById('modal-oral-convoc-settings');
    if (!modal) return alert("Erreur : modal introuvable. Veuillez rafraîchir la page (F5).");

    const params = (DB.oralConfig && DB.oralConfig.convocParams) || {
        showArrival: true,
        offset: 15,
        text: "Le candidat devra se présenter muni d'une pièce d'identité et de la présente convocation. Il est impératif d'arriver au moins 15 minutes avant l'heure de passage indiquée."
    };

    document.getElementById('convoc-check-accueil').checked = params.showArrival;
    document.getElementById('convoc-offset-mins').value = params.offset;
    document.getElementById('convoc-text-instructions').value = params.text;
    document.getElementById('convoc-offset-container').style.display = params.showArrival ? 'block' : 'none';
    modal.style.display = 'flex';
};

/**
 * Sauvegarde les paramètres et lance l'export
 */
window.confirmOralConvocGeneration = function() {
    const params = {
        showArrival: document.getElementById('convoc-check-accueil').checked,
        offset: parseInt(document.getElementById('convoc-offset-mins').value) || 0,
        text: document.getElementById('convoc-text-instructions').value
    };
    
    // Persistance dans la base de données locale
    DB.oralConfig.convocParams = params;
    if (typeof saveDB === 'function') saveDB(); 
    
    document.getElementById('modal-oral-convoc-settings').style.display = 'none';
    exportOralConvocEleves(params);
};

/**
 * Helper : calcule HH:mm - X minutes
 */
function getArrivalTime(startTime, offsetMins) {
    if (!startTime || startTime === "N/C") return "N/C";
    try {
        const [h, m] = startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m - offsetMins, 0);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return startTime; }
}

window.exportOralConvocEleves = function(params) {
    if (!window.jspdf) return alert("Librairie jsPDF manquante.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Utiliser les params passés ou ceux de la DB par défaut
    const p = params || DB.oralConfig.convocParams || { showArrival: false, offset: 0, text: "" };

    const scheduleMap = {};
    const dist = DB.oralConfig.distribution || {};
    Object.entries(dist).forEach(([juryId, slots]) => {
        slots.forEach(slot => {
            const heurePassage = slot.time || slot.startTime || "N/C";
            if (slot.students) {
                slot.students.forEach(st => {
                    scheduleMap[st.id] = { juryId, startTime: heurePassage };
                });
            }
        });
    });

    const students = [...(DB.oralConfig.students || [])].sort((a, b) => {
        const c = (a.classe || "").localeCompare(b.classe || "");
        return c !== 0 ? c : a.nom.localeCompare(b.nom);
    });

    let count = 0;

    students.forEach(s => {
        const schedule = scheduleMap[s.id];
        if (!schedule) return;

        if (count > 0) doc.addPage();
        count++;

        if (typeof drawOfficialHeader === 'function') {
            drawOfficialHeader(doc, "CONVOCATION - ÉPREUVE ORALE DNB", 20);
        }

        let civilite = s.sexe === 'F' ? "Madame" : (s.sexe === 'M' ? "Monsieur" : "Candidat(e)");

        // --- CADRE 1 : IDENTITÉ ---
        doc.setDrawColor(44, 62, 80).setLineWidth(0.5);
        const sujetTexte = s.sujet || "Non renseigné";
        const sujetLines = doc.splitTextToSize(sujetTexte, 155);
        const cadre1Height = 48 + ((sujetLines.length - 1) * 5);
        doc.rect(14, 50, 182, cadre1Height); 

        doc.setFontSize(12).setFont("helvetica", "bold");
        doc.text(`${civilite} ${s.nom.toUpperCase()} ${s.prenom}`, 20, 60);
        doc.setFont("helvetica", "normal").setFontSize(11);
        doc.text(`Classe : ${s.classe || "N/C"}`, 20, 72);
        doc.setFont("helvetica", "bold").text(`Parcours : ${s.parcours || "Général"}`, 20, 80);
        doc.text("Sujet : ", 20, 86);
        doc.setFont("helvetica", "normal").text(sujetLines, 35, 86); 

        // --- CADRE 2 : INFOS PASSAGE ---
        const cadre2Y = 50 + cadre1Height + 5; 
        doc.rect(14, cadre2Y, 182, p.showArrival ? 40 : 30);
        const roomName = (typeof getJuryRoomName === 'function') ? getJuryRoomName(schedule.juryId) : "N/C";
        
        doc.setFont("helvetica", "bold").setFontSize(11);
        doc.text(`JURY ${schedule.juryId.replace('jury-', '')} - Salle ${roomName}`, 20, cadre2Y + 10);
        
        if (p.showArrival) {
            const heureAccueil = getArrivalTime(schedule.startTime, p.offset);
            doc.setFont("helvetica", "bold").setTextColor(231, 76, 60); // Rouge pour attirer l'oeil
            doc.text(`HEURE DE CONVOCATION : ${heureAccueil}`, 20, cadre2Y + 20);
            doc.setTextColor(0);
            doc.setFontSize(14).text(`Heure de passage : ${schedule.startTime}`, 20, cadre2Y + 32);
        } else {
            doc.setFontSize(14).text(`Heure de passage : ${schedule.startTime}`, 20, cadre2Y + 22);
        }

        // --- BLOC CONSIGNES ---
        let finalY = cadre2Y + (p.showArrival ? 45 : 35) + 10;
        if (p.text) {
            doc.setFontSize(10).setFont("helvetica", "bold");
            doc.text("CONSIGNES IMPORTANTES :", 14, finalY);
            doc.setFont("helvetica", "normal");
            const instructionLines = doc.splitTextToSize(p.text, 180);
            doc.text(instructionLines, 14, finalY + 6);
        }

        // --- BLOC SIGNATURE ---
        const signatureY = 235;
        const centerX = 150; 
        const city = DB.config.city || "votre ville";
        
        doc.setFontSize(11).setFont("helvetica", "normal");
        doc.text(`Fait à ${city}, le ${new Date().toLocaleDateString('fr-FR')}`, centerX, signatureY, { align: 'center' });

        const dirCiv = DB.config.director?.civ || "Le Chef d'Établissement";
        const dirName = DB.config.director?.name || "";
        doc.setFont("helvetica", "bold").text(dirCiv, centerX, signatureY + 7, { align: 'center' });
        if (dirName) doc.text(dirName, centerX, signatureY + 14, { align: 'center' });

        if (DB.config.signature) {
            try {
                doc.addImage(DB.config.signature, 'PNG', centerX - 22.5, signatureY + 18, 45, 0);
            } catch (e) { console.error(e); }
        }
    });

    if (count === 0) return alert("Aucun élève trouvé.");
    doc.save(`Convocations_Oral_DNB.pdf`);
};

// =========================================================
// === 2. POCHETTES CONVOCATIONS ORAL (A3 PLIÉ - OPTIMISÉ) ===
// =========================================================
window.exportOralPochettesEleves = function() {
    // 1. Sécurité
    if (!DB.oralConfig || !DB.oralConfig.students || DB.oralConfig.students.length === 0) {
        return alert("Veuillez d'abord charger la liste des élèves pour l'épreuve orale.");
    }
    if (typeof window.jspdf === 'undefined') return alert("Librairie jsPDF manquante.");

    const { jsPDF } = window.jspdf;
    
    // Format A3 Paysage : Largeur 420mm x Hauteur 297mm
    // Plié en deux, cela fait une chemise A4 standard.
    const doc = new jsPDF('l', 'mm', 'a3'); 
    
    // On extrait la liste unique des classes concernées par l'oral
    const classes = [...new Set(DB.oralConfig.students.map(s => s.classe || "N/C"))].sort();
    
    const year = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Établissement";
    
    const PG_H = 297; 
    const HALF_W = 210; // Milieu de la page (pliure)
    const M = 15; // Marge globale

    let isFirstPage = true;

    classes.forEach((className) => {
        // Récupération des élèves de la classe planifiés à l'oral
        const classStudents = DB.oralConfig.students
            .filter(s => (s.classe || "N/C") === className && getStudentOralSchedule(s.id))
            .sort((a, b) => a.nom.localeCompare(b.nom));

        if (classStudents.length === 0) return; // Si aucun élève planifié dans cette classe, on passe.

        if (!isFirstPage) doc.addPage("a3", "l");
        isFirstPage = false;

        // ===================================================
        // === PARTIE DROITE (RECTO) : COUVERTURE ===
        // ===================================================
        const covX = HALF_W + M; 
        const covW = HALF_W - (2*M); 
        const covCenterX = covX + (covW/2);

        // Logo (si disponible dans la config globale)
        if (DB.config.logo) {
            try {
                const imgProps = doc.getImageProperties(DB.config.logo);
                const ratio = Math.min(45 / imgProps.width, 35 / imgProps.height);
                doc.addImage(DB.config.logo, 'PNG', covX, 15, imgProps.width * ratio, imgProps.height * ratio);
            } catch (e) {}
        }
        
        // En-tête Établissement
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text(schoolName, covX + 65, 25); 

        // Titres spécifiques à l'oral
        doc.setFontSize(28); doc.setTextColor(44, 62, 80);
        doc.text("CONVOCATIONS ÉLÈVES", covCenterX, 95, {align:'center'});
        
        doc.setFontSize(20);
        doc.text(`ÉPREUVE ORALE DNB - SESSION ${year}`, covCenterX, 110, {align:'center'});

        // Cadre et Classe
        doc.setDrawColor(44, 62, 80); doc.setLineWidth(1.5);
        doc.rect(covX + 35, 135, covW - 70, 55);
        
        doc.setFontSize(75);
        doc.text(className, covCenterX, 178, {align:'center'});

        // ===================================================
        // === PARTIE GAUCHE (VERSO) : LISTE D'ÉMARGEMENT ===
        // ===================================================
        const listX = M;
        const listW = HALF_W - (2*M);
        // On divise la largeur disponible en deux colonnes de tableaux
        const colW = (listW / 2) - 5; 

        // Découpage de la liste en deux (Haut -> Bas, puis changement de colonne)
        const mid = Math.ceil(classStudents.length / 2);
        
        // Fonction de mapping (Intègre les données de passage oral sous le nom)
        const mapStudentRow = (s) => {
            const sch = getStudentOralSchedule(s.id);
            // On affiche le Nom en majuscule, et en dessous le Jury + Heure
            const info = `${s.nom.toUpperCase()} ${s.prenom}\n(Jury ${sch.juryId} - ${sch.startTime})`;
            return [info, ""];
        };
        
        const col1 = classStudents.slice(0, mid).map(mapStudentRow);
        const col2 = classStudents.slice(mid).map(mapStudentRow);

        const tableConfig = {
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], fontSize: 9, cellPadding: 2, halign: 'center' },
            styles: { fontSize: 9, cellPadding: 4, valign: 'middle', lineColor: [200] },
            columnStyles: { 
                0: { cellWidth: 55, fontStyle: 'bold' }, // Nom Prénom + Infos Oral : 5.5cm
                1: { cellWidth: 'auto' } // Signature : Reste de l'espace
            },
            startY: 20
        };

        // Titre de la liste d'émargement
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text("ÉMARGEMENT DES ÉLÈVES LORS DE LA REMISE DES CONVOCATIONS", listX + (listW/2), 12, {align: 'center'});

        // Tableau Colonne 1 (Gauche de la page de gauche)
        doc.autoTable({
            ...tableConfig,
            head: [['Candidat / Heure de passage', 'Signature']],
            body: col1,
            margin: { left: listX },
            tableWidth: colW
        });

        // Tableau Colonne 2 (Droite de la page de gauche)
        doc.autoTable({
            ...tableConfig,
            head: [['Candidat / Heure de passage', 'Signature']],
            body: col2,
            margin: { left: listX + colW + 10 }, 
            tableWidth: colW
        });

        // ===================================================
        // === FINITIONS ===
        // ===================================================
        // Ligne de pliure centrale (pointillés discrets)
        doc.setDrawColor(220); doc.setLineDash([5, 5], 0);
        doc.line(HALF_W, 0, HALF_W, PG_H); 
        doc.setLineDash([]);
    });

    // Nettoyage de chaîne pour le nom de fichier
    const safeName = schoolName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Pochettes_Convocations_Oral_${safeName}_${year}.pdf`);
};

/**
 * Ouvre la modale des profs avec les données sauvegardées
 */
window.openOralProfConvocModal = function() {
    if (typeof setupOralDatabase === 'function') setupOralDatabase(); // sécurité init
    const defaultText = "Présence requise 30 minutes avant le début du premier passage.\nRemise obligatoire des livrets d'évaluation au secrétariat avant le départ.";

    const params = (DB.oralConfig && DB.oralConfig.profConvocParams) || { text: defaultText };

    const textarea = document.getElementById('prof-text-instructions');
    const modal    = document.getElementById('modal-oral-prof-settings');
    if (!textarea || !modal) return alert("Erreur : modal introuvable. Veuillez rafraîchir la page (F5).");
    textarea.value = params.text;
    modal.style.display = 'flex';
};

/**
 * Enregistre les modifications et lance l'export
 */
window.confirmOralProfConvocGeneration = function() {
    const text = document.getElementById('prof-text-instructions').value;
    
    // Sauvegarde en DB
    DB.oralConfig.profConvocParams = { text: text };
    if (typeof saveDB === 'function') saveDB(); 
    
    document.getElementById('modal-oral-prof-settings').style.display = 'none';
    
    // Lancement de l'export avec les nouvelles données
    exportOralConvocProfs({ text: text });
};

/**
 * Lance la génération des convocations avec une fusion sécurisée des paramètres
 */
window.exportOralConvocProfsDirect = function() {
    // Valeurs de secours (au cas où la DB soit vide ou incomplète)
    const defaults = {
        text: "Présence requise 30 minutes avant le début du premier passage.\nRemise obligatoire des livrets d'évaluation au secrétariat avant le départ.",
        reserveStart: "08:00",
        reserveEnd: "12:30"
    };

    // On fusionne : les données de la DB écrasent les défauts SEULEMENT si elles existent
    const savedParams = DB.oralConfig.profConvocParams || {};
    const finalParams = {
        text: savedParams.text || defaults.text,
        reserveStart: savedParams.reserveStart || defaults.reserveStart,
        reserveEnd: savedParams.reserveEnd || defaults.reserveEnd
    };

    exportOralConvocProfs(finalParams);
};

/**
 * @why Génère les convocations professeurs (Jurys classiques & Réserves).
 * Gère l'affichage dynamique : tableau pour les jurys, bloc horaire pour les réserves.
 * Sécurisé contre les valeurs manquantes (undefined).
 */
window.exportOralConvocProfs = function(params) {
    if (!window.jspdf) return alert("Librairie jsPDF manquante.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- CORRECTION ICI : Récupération dynamique des heures de la base de données ---
    const globalStart = (DB.oralConfig.general && DB.oralConfig.general.start) ? DB.oralConfig.general.start : "08:00";
    const globalEnd = (DB.oralConfig.general && DB.oralConfig.general.end) ? DB.oralConfig.general.end : "17:00";

    // 1. Sécurisation des paramètres (Fusion entre paramètres passés, DB et Défauts)
    const defaults = {
        text: "Présence requise 30 minutes avant le début du premier passage.\nRemise obligatoire des livrets d'évaluation au secrétariat avant le départ.",
        reserveStart: globalStart, // Utilise l'heure de début globale
        reserveEnd: globalEnd      // Utilise l'heure de fin globale
    };

    const savedParams = DB.oralConfig.profConvocParams || {};
    const p = {
        text: params?.text || savedParams.text || defaults.text,
        reserveStart: params?.reserveStart || savedParams.reserveStart || defaults.reserveStart,
        reserveEnd: params?.reserveEnd || savedParams.reserveEnd || defaults.reserveEnd
    };

    // 2. Filtrage des enseignants (Jury affecté OU coché en Réserve)
    const allTeachers = DB.oralConfig.teachers || [];
    const teachersToConvoque = allTeachers.filter(t => (t.jury && t.jury !== "") || t.isReserve);
    
    if (teachersToConvoque.length === 0) {
        return alert("Aucun enseignant à convoquer (pas de jury assigné et aucun prof en réserve).");
    }

    // 3. Indexation des données de Jury (pour les membres classiques)
    const juryDataMap = {};
    allTeachers.forEach(t => {
        if (!t.jury) return;
        if (!juryDataMap[t.jury]) {
            juryDataMap[t.jury] = { room: "Non définie", members: [] };
        }
        juryDataMap[t.jury].members.push(`${t.nom.toUpperCase()} ${t.prenom || ""}`);
        if (t.salle && t.salle.trim() !== "") {
            juryDataMap[t.jury].room = t.salle;
        }
    });

    let isFirstPage = true;

    teachersToConvoque.forEach(t => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        let currentY = 20;

        // --- BRANCHEMENT : RÉSERVE OU JURY CLASSIQUE ---
        if (t.isReserve) {
            // --- CAS A : ENSEIGNANT DE RÉSERVE ---
            drawOfficialHeader(doc, "CONVOCATION - ENSEIGNANT DE RÉSERVE", currentY);
            
            doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(0);
            doc.text(`Enseignant(e) : ${t.nom.toUpperCase()} ${t.prenom || ""}`, 14, 50);
            
            // Cadre d'information visuel pour la Réserve
            doc.setDrawColor(230, 126, 34); // Orange institutionnel
            doc.setFillColor(253, 242, 233);
            doc.rect(14, 60, 182, 35, 'FD');
            
            doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(211, 84, 0);
            doc.text("AFFECTATION : MEMBRE DU JURY DE RÉSERVE", 18, 68);
            
            doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(0);
            doc.text(`Votre présence est requise dans l'établissement de ${p.reserveStart} à ${p.reserveEnd}.`, 18, 78);
            doc.text("Vous pourrez être sollicité(e) à tout moment pour pallier l'absence d'un juré.", 18, 85);
            
            currentY = 110;
        } 
        else {
            // --- CAS B : JURY CLASSIQUE ---
            drawOfficialHeader(doc, "CONVOCATION JURY - ÉPREUVE ORALE", currentY);

            const juryInfo = juryDataMap[t.jury] || { room: "N/A", members: [] };
            
            doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(0);
            doc.text(`Enseignant(e) : ${t.nom.toUpperCase()} ${t.prenom || ""}`, 14, 50);
            doc.text(`Affectation : JURY ${t.jury} - Salle ${juryInfo.room}`, 14, 60);
            
            const colleagues = juryInfo.members
                .filter(m => m !== `${t.nom.toUpperCase()} ${t.prenom || ""}`)
                .join(', ');

            doc.setFontSize(10).setFont("helvetica", "normal");
            doc.text(`Co-évaluateur(s) : ${colleagues || "Aucun"}`, 14, 68);

            // Planning des passages
            const passages = (DB.oralConfig.distribution && DB.oralConfig.distribution[t.jury]) || [];
            doc.text(`Votre planning d'interrogation :`, 14, 85);

            const tableBody = passages.map(slot => {
                const names = slot.students.map(s => `${s.nom.toUpperCase()} ${s.prenom}`).join(' & ');
                const parcours = slot.students[0]?.parcours || "-";
                return [slot.startTime, names, parcours];
            });

            doc.autoTable({
                startY: 90,
                head: [['Heure', 'Candidat(s)', 'Parcours']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [44, 62, 80] },
                styles: { fontSize: 9 }
            });

            currentY = doc.lastAutoTable.finalY + 15;
        }

        // --- BLOC COMMUN : CONSIGNES ET SIGNATURE ---
        if (currentY > 220) { doc.addPage(); currentY = 20; }

        // Consignes importantes
        doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(0);
        doc.text("Important :", 14, currentY);
        doc.setFontSize(9).setFont("helvetica", "italic");
        const instructionLines = doc.splitTextToSize(p.text, 180);
        doc.text(instructionLines, 14, currentY + 6);

        // Bloc Signature
        const signatureY = 235;
        const centerX = 150; 
        const city = DB.config.city || "votre ville";
        
        doc.setFontSize(11).setFont("helvetica", "normal");
        doc.text(`Fait à ${city}, le ${new Date().toLocaleDateString('fr-FR')}`, centerX, signatureY, { align: 'center' });

        const dirCiv = DB.config.director?.civ || "Le Chef d'Établissement";
        const dirName = DB.config.director?.name || "";
        doc.setFont("helvetica", "bold").text(dirCiv, centerX, signatureY + 7, { align: 'center' });
        if (dirName) doc.text(dirName, centerX, signatureY + 14, { align: 'center' });

        if (DB.config.signature) {
            try {
                // Signature non déformée (largeur 45mm)
                doc.addImage(DB.config.signature, 'PNG', centerX - 22.5, signatureY + 18, 45, 0);
            } catch (e) { console.error("Erreur signature:", e); }
        }
    });

    // 4. Finalisation du nom de fichier
    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = (DB.config.schoolName || "Export").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
    
    doc.save(`Convocations_Profs_Oral_${schoolName}_${sessionYear}.pdf`);
};

/**
 * Intercepte le choix depuis la modale et lance la génération.
 * @param {boolean} withSubjects - Détermine si le script doit boucler sur les sujets.
 */
window.triggerOralParcoursExport = function(withSubjects) {
    // 1. Fermeture de la modale proprement
    document.getElementById('modal-oral-subjects-option').style.display = 'none';
    
    // 2. Appel à ta fonction principale de génération avec le paramètre de configuration
    exportOralParcoursJury(withSubjects);
};

// ==========================================
// 4. LISTE SYNTHÉTIQUE (PARCOURS, SUJETS & LANGUES PAR JURY)
// ==========================================
/**
 * Exporte la liste des parcours par jury en PDF.
 * @param {boolean} withSubjects - Si true, inclut le détail des sujets par parcours. Défaut: true.
 */
window.exportOralParcoursJury = function(withSubjects = true) {
    if (!window.jspdf) return alert("Librairie jsPDF manquante.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    drawOfficialHeader(doc, "RÉCAPITULATIF DES SPÉCIFICITÉS PAR JURY", 15);
    let currentY = 35;

    const dist = DB.oralConfig.distribution || {};
    const juriesList = Object.keys(dist).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));

    if (juriesList.length === 0) return alert("Répartition vide. Veuillez générer les jurys.");

    juriesList.forEach(juryId => {
        // --- 1. En-tête du Jury ---
        const roomName = getJuryRoomName(juryId);
        const members = (DB.oralConfig.teachers || []).filter(t => t.jury == juryId).map(t => t.nom).join(', ');
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 62, 80);
        doc.text(`JURY ${juryId} - ${roomName}`, 14, currentY);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Membres : ${members || "Non définis"}`, 14, currentY + 5);

        // --- 2. Agrégation Hiérarchique (Parcours > Sujets) ---
        const dataTree = {}; // Structure : { "Parcours": { total: X, sujets: { "Sujet A": Y } } }
        const langueCount = {};
        
        if (dist[juryId]) {
            dist[juryId].forEach(slot => {
                slot.students.forEach(s => {
                    // Logique Parcours & Sujets
                    const p = s.parcours || "Non défini";
                    const suj = s.sujet || "Sujet non précisé";

                    if (!dataTree[p]) dataTree[p] = { total: 0, sujets: {} };
                    dataTree[p].total++;
                    dataTree[p].sujets[suj] = (dataTree[p].sujets[suj] || 0) + 1;
                    
                    // Comptage Langues
                    if (s.langue && s.langue.trim() !== "") {
                        const l = s.langue.trim();
                        langueCount[l] = (langueCount[l] || 0) + 1;
                    }
                });
            });
        }

        // --- 3. Construction du corps du tableau Parcours/Sujets ---
        const parcoursBody = [];
        Object.keys(dataTree).sort().forEach(pName => {
            // Ligne Parent (Le Parcours)
            parcoursBody.push([
                { content: pName, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }, 
                { content: dataTree[pName].total.toString(), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }
            ]);

            // Lignes Enfants (Les Sujets sous ce parcours) conditionnées par le paramètre withSubjects
            if (withSubjects) {
                Object.keys(dataTree[pName].sujets).sort().forEach(sujName => {
                    parcoursBody.push([
                        `   • ${sujName}`, 
                        dataTree[pName].sujets[sujName].toString()
                    ]);
                });
            }
        });

        if (parcoursBody.length === 0) parcoursBody.push(["Aucun candidat affecté", "-"]);

        // Rendu du Tableau des Parcours & Sujets
        doc.autoTable({
            startY: currentY + 9,
            // Le titre de la colonne s'adapte au choix de l'utilisateur
            head: [[withSubjects ? 'Parcours / Sujets précis' : 'Parcours', 'Total']],
            body: parcoursBody,
            theme: 'grid',
            styles: { fontSize: 9, padding: 3 },
            headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 30, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        // --- 4. Rendu du Tableau des Langues (Si nécessaire) ---
        const langueBody = Object.keys(langueCount).sort().map(lName => [lName, langueCount[lName].toString()]);
        
        if (langueBody.length > 0) {
            doc.autoTable({
                startY: currentY,
                head: [['Langue Vivante', 'Candidats']],
                body: langueBody,
                theme: 'grid',
                styles: { fontSize: 9, padding: 3 },
                headStyles: { fillColor: [127, 140, 141], textColor: [255, 255, 255] },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 30, halign: 'center' }
                }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        } else {
            currentY += 10;
        }

        // --- 5. Saut de page ---
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
    });

    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Etablissement";
    const safeName = schoolName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
    
    // Le nom du fichier indique si c'est une version détaillée ou simplifiée (optionnel, mais bon pour l'UX)
    const fileNameSuffix = withSubjects ? "Détaillé" : "Simplifié";
    doc.save(`Récapitulatif_Jurys_Parcours_${fileNameSuffix}_${safeName}_${sessionYear}.pdf`);
};

// ============================================================================
// 🛠️ 1. UTILITAIRE CORE : GÉNÉRATEUR D'ID UNIVERSEL (À ajouter au début du script)
// ============================================================================

/**
 * @description Génère un UUID v4 de manière universelle (Standard + Polyfill hors ligne).
 * @why En EPLE, le fichier HTML est souvent ouvert en local (protocole file://). 
 * L'API native crypto.randomUUID() crashe hors HTTPS. Ce polyfill garantit 
 * un fonctionnement ininterrompu, sans serveur web.
 * @returns {string} Identifiant unique sécurisé.
 */
function generateSecureID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Polyfill Vanilla JS (génération mathématique formatée UUID v4)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================================
// 🛠️ 2. FONCTION DE RÉPARATION DE BACKUP (À remplacer, vers la ligne 140)
// ============================================================================

function sanitizeBackupIDs() {
    if (!DB.students || DB.students.length === 0) return;

    const seenIds = new Set();
    const idChanges = {};

    DB.students.forEach(student => {
        if (!student.id || seenIds.has(student.id)) {
            const oldId = student.id;
            const newId = generateSecureID(); // Appel sécurisé hors ligne
            student.id = newId;
            idChanges[`${oldId}_${student.nom}_${student.prenom}`] = newId;
        }
        seenIds.add(student.id);
    });

    if (DB.corrections && DB.corrections.lots) {
        Object.keys(DB.corrections.lots).forEach(subject => {
            DB.corrections.lots[subject].forEach(lot => {
                if (lot.copies) {
                    lot.copies.forEach(copy => {
                        const changeKey = `${copy.id}_${copy.nom}_${copy.prenom}`;
                        if (idChanges[changeKey]) copy.id = idChanges[changeKey]; 
                    });
                }
            });
        });
    }
}

// ============================================================================
// 🛠️ 3. MODULE ÉLÈVES - Création et Import (À remplacer, vers la ligne 475 et 1500)
// ============================================================================

/**
 * @description Création manuelle d'un élève.
 * @why Standardisation de l'ID à la création pour assurer l'intégrité du module Corrections.
 */
function saveNewStudent() { 
    const n = document.getElementById('modStNom').value;
    const p = document.getElementById('modStPrenom').value; 
    
    if(n && p){ 
        DB.students.push({
            id: generateSecureID(), // Appel de l'utilitaire universel
            nom: String(n).toUpperCase().trim(),
            prenom: String(p).trim(),
            classe: document.getElementById('modStClasse').value,
            sexe: document.getElementById('modStSexe').value,
            tt: document.getElementById('modStTT').checked
        }); 
        renderStudents(); 
        closeStudentModal(); 
    } else {
        alert("⚠️ Les champs Nom et Prénom sont obligatoires.");
    }
}

/**
 * @description Moteur d'importation des élèves via Excel.
 */
function executeStudentImport(data, mapping, isStrictReplace) {
    let count = 0;
    if (isStrictReplace && confirm("Attention : Le mode Remplacement va effacer tous les élèves existants. Continuer ?")) {
        DB.students = [];
    }

    data.forEach(row => {
        const nom = mapping.nom ? row[mapping.nom] : null;
        if (nom) {
            const newS = {
                id: generateSecureID(), // Appel de l'utilitaire universel
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

// ============================================================================
// 🛠️ 4. MODULE PROFS - Création et Import (À remplacer, vers la ligne 491 et 1545)
// ============================================================================

/**
 * @description Création manuelle d'un enseignant.
 * @why Code réécrit sur plusieurs lignes (Clean Code) pour y insérer la génération d'ID manquante.
 */
function saveNewTeacher() { 
    const n = document.getElementById('modTeaNom').value; 
    if(n) { 
        DB.teachers.push({
            id: generateSecureID(), // Harmonisation totale de la BDD
            civ: document.getElementById('modTeaCiv').value, 
            nom: String(n).toUpperCase().trim(), 
            prenom: document.getElementById('modTeaPrenom').value.trim(), 
            matiere: document.getElementById('modTeaMatiere').value.trim(),
            noHSE: false // Assure l'intégrité de la propriété
        }); 
        renderTeachers(); 
        closeTeacherModal(); 
    } else {
        alert("⚠️ Le nom du professeur est obligatoire.");
    }
}

/**
 * @description Moteur d'importation des professeurs via Excel.
 */
function executeTeacherImport(data, mapping, isStrictReplace) {
    let count = 0;
    if (isStrictReplace) DB.teachers = []; 

    // 1. On rajoute 'index' ici pour récupérer le numéro de la ligne en cours
    data.forEach((row, index) => {
        const nom = mapping.nom ? row[mapping.nom] : null;
        if(nom) {
            const newT = {
                // 2. On greffe l'index à la fin de ton ID sécurisé pour forcer l'unicité
                id: generateSecureID() + "-" + index, 
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
            if(!existing) {
                DB.teachers.push(newT);
                count++;
            }
        }
    });

    renderTeachers();
    alert(`Terminé ! ${count} professeurs ajoutés.`);
}

/**
 * @why Permet de retrouver instantanément un élève dans la répartition visuelle de l'Oral
 * Affiche un bandeau informatif (Jury + Heures) et met en surbrillance la carte de l'élève.
 */
window.findStudentInOralDistrib = function(searchTerm) {
    const resultBox = document.getElementById('oral-search-result');
    const search = searchTerm.toLowerCase().trim();
    
    // Si la recherche est vide, on cache le bandeau et on retire les surlignages
    if (!search) {
        resultBox.style.display = 'none';
        document.querySelectorAll('#oral-visual-distrib .dd-student').forEach(el => {
            el.style.boxShadow = 'none';
            el.style.transform = 'none';
            el.style.border = '1px solid #eee';
        });
        return;
    }

    let foundHtml = "";
    
    // 1. On fouille dans la base de données pour générer le message du bandeau
    if (DB.oralConfig && DB.oralConfig.distribution) {
        for (const [juryName, passages] of Object.entries(DB.oralConfig.distribution)) {
            passages.forEach(passage => {
                passage.students.forEach(s => {
                    const fullName = `${s.nom} ${s.prenom}`.toLowerCase();
                    if (fullName.includes(search)) {
                        foundHtml += `
                        <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #bce8f1;">
                            🎓 <strong>${s.nom.toUpperCase()} ${s.prenom}</strong> 
                            est assigné(e) au jury N° <strong style="color: #2980b9;">${juryName}</strong> 
                            <span style="color:#e67e22; font-weight:bold; margin-left: 10px;">
                                ⏱️ Passage : ${passage.startTime} - ${passage.endTime}
                            </span>
                        </div>`;
                    }
                });
            });
        }
    }

    // Affichage du bandeau selon le résultat
    if (foundHtml === "") {
        resultBox.style.display = 'block';
        resultBox.style.background = '#fdedec';
        resultBox.style.borderColor = '#e74c3c';
        resultBox.innerHTML = `❌ Aucun élève trouvé avec "<b>${searchTerm}</b>" dans la répartition actuelle.`;
    } else {
        resultBox.style.display = 'block';
        resultBox.style.background = '#e8f4fd';
        resultBox.style.borderColor = '#3498db';
        resultBox.innerHTML = `✅ <strong>Résultat(s) de la recherche :</strong><br><br>${foundHtml}`;
    }
    
    // 2. Surlignage visuel directement dans les colonnes Drag & Drop
    document.querySelectorAll('#oral-visual-distrib .dd-student').forEach(el => {
        // On vérifie le texte de l'élément visuel
        if (el.innerText.toLowerCase().includes(search)) {
            el.style.boxShadow = '0 0 0 3px #f1c40f'; // Épaisse bordure jaune
            el.style.border = 'none';
            el.style.transform = 'scale(1.03)'; // Léger zoom
            el.style.transition = 'all 0.2s ease';
            
            // Fait défiler la page pour que l'élève soit visible (optionnel mais pratique)
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            // On remet normal ceux qui ne correspondent pas
            el.style.boxShadow = 'none';
            el.style.border = '1px solid #eee';
            el.style.transform = 'none';
        }
    });
};
/**
 * @why Synchronise la répartition avec les nouvelles données des élèves 
 * (Changement de parcours, langue, etc. APRES avoir fait la répartition)
 */
window.syncOralDistributionData = function() {
    if (!DB.oralConfig || !DB.oralConfig.distribution) return;

    Object.values(DB.oralConfig.distribution).forEach(passages => {
        passages.forEach(passage => {
            if (passage.students && passage.students.length > 0) {
                // On prend l'ID du premier élève du passage (valable même pour les groupes)
                const refId = passage.students[0].id;
                const liveStudent = DB.oralConfig.students.find(s => s.id === refId);
                
                if (liveStudent) {
                    // 1. On met à jour les informations du créneau (affichées sur la carte)
                    passage.theme = liveStudent.parcours || "-";
                    passage.langue = liveStudent.langue ? liveStudent.langue.trim().toUpperCase() : null;
                    
                    // 2. On rafraîchit la référence complète de l'élève à l'intérieur
                    passage.students = passage.students.map(ds => {
                        return DB.oralConfig.students.find(s => s.id === ds.id) || ds;
                    });
                }
            }
        });
    });

    // 3. Rafraîchit visuellement les colonnes du drag & drop si l'onglet est ouvert
    if (typeof renderOralVisualDistribution === 'function') {
        renderOralVisualDistribution();
    }
};
/**
 * @why Récupère la salle associée à un jury en regardant la salle attribuée aux professeurs de ce jury.
 * (Si deux professeurs d'un même jury ont des salles différentes par erreur, on prend la première trouvée).
 */
window.getJuryRoomName = function(juryId) {
    // Sécurité : on vérifie que la base des professeurs existe
    if (!DB.oralConfig || !DB.oralConfig.teachers) {
        return "Non assignée";
    }

    // 1. On cherche tous les professeurs affectés à ce jury précis
    // (On utilise == au lieu de === au cas où l'un soit un texte "1" et l'autre un chiffre 1)
    const juryTeachers = DB.oralConfig.teachers.filter(t => t.jury == juryId);

    // 2. On cherche parmi eux le premier qui a une salle renseignée
    const teacherWithRoom = juryTeachers.find(t => t.salle && t.salle.trim() !== "");

    // 3. Si on en trouve un, on renvoie sa salle, sinon on renvoie "Non assignée"
    if (teacherWithRoom) {
        return teacherWithRoom.salle.trim();
    } else {
        return "Non assignée";
    }
};

/**
 * @why Génère un fichier Excel complet de la répartition orale.
 * Croise les données élèves, créneaux, jurys, salles et professeurs.
 */
window.exportOralDistributionExcel = function() {
    if (typeof XLSX === 'undefined') {
        return alert("⚠️ La librairie SheetJS (XLSX) n'est pas chargée.");
    }

    const dist = DB.oralConfig.distribution || {};
    const teachers = DB.oralConfig.teachers || [];
    const excelData = [];

    // 1. Pré-calculer les membres et les salles par jury pour gagner en performance
    const juryMap = {};
    teachers.forEach(t => {
        if (!t.jury) return;
        if (!juryMap[t.jury]) {
            juryMap[t.jury] = { members: [], room: "Non assignée" };
        }
        juryMap[t.jury].members.push(`${t.nom.toUpperCase()} ${t.prenom || ""}`);
        if (t.salle && t.salle.trim() !== "") {
            juryMap[t.jury].room = t.salle;
        }
    });

    // 2. Parcourir la distribution pour construire les lignes du tableau
    Object.entries(dist).forEach(([juryId, slots]) => {
        const infoJury = juryMap[juryId] || { members: [], room: "Non assignée" };
        const nomsProfs = infoJury.members.join(" / ");

        slots.forEach(slot => {
            slot.students.forEach(s => {
                excelData.push({
                    "Nom": s.nom.toUpperCase(),
                    "Prénom": s.prenom || "",
					"Classe": s.classe || "N/C",
                    "Sexe": s.sexe || "",
                    "Parcours": s.parcours || "Général",
                    "Option/Langue": s.langue || "",
                    "Jury": juryId,
                    "Salle": infoJury.room,
                    "Heure Début": slot.startTime,
                    "Heure Fin": slot.endTime || "",
                    "Membres du Jury": nomsProfs
                });
            });
        });
    });

    if (excelData.length === 0) {
        return alert("⚠️ Aucune donnée à exporter. Vérifiez la répartition.");
    }

    // 3. Création du classeur Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Répartition Orale");

    // Ajustement automatique de la largeur des colonnes (optionnel mais recommandé)
    const wscols = [
        {wch: 10}, {wch: 20}, {wch: 20}, {wch: 5}, {wch: 25}, 
        {wch: 15}, {wch: 10}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 50}
    ];
    worksheet['!cols'] = wscols;

    // 4. Téléchargement du fichier
    const sessionYear = DB.config.year || new Date().getFullYear();
    const schoolName = DB.config.schoolName || "Export";
    const fileName = `Repartition_Oral_${schoolName}_${sessionYear}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
};

window.updateJuryTime = function(teacherId, field, value) {
    const teacher = DB.oralConfig.teachers.find(t => t.id == teacherId);
    if (teacher) {
        teacher[field] = value;
        // Optionnel : si c'est un binôme, on peut synchroniser l'autre membre du jury
        const binome = DB.oralConfig.teachers.find(t => t.jury === teacher.jury && t.id !== teacherId);
        if (binome) binome[field] = value;
        
        saveDB(); // Sauvegarde locale
    }
};
// ----------------------

/**
 * Restaure l'état visuel complet du menu Configuration de l'Oral.
 * Utilisée lors de la navigation vers sec-oral-config ou après un chargement de données.
 */
function refreshOralConfigUI() {
    if (!DB.oralConfig) return;

    // 1. Restauration des champs texte et date
    const fields = {
        'oral-name': DB.oralConfig.general?.name || "",
        'oral-date': DB.oralConfig.general?.date || "",
        'oral-start': DB.oralConfig.general?.start || "",
        'oral-end': DB.oralConfig.general?.end || ""
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    });

    // 2. Déclenchement des fonctions de rendu pour les listes dynamiques
    if (typeof renderPauseList === 'function') renderPauseList();
    if (typeof renderLanguageList === 'function') renderLanguageList();
    if (typeof renderThemesGrid === 'function') renderThemesGrid();

    console.log("Interface de configuration orale synchronisée.");
}