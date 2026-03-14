// --- IMPORT FICHIERS EXCEL/CSV ---
function handleFileSelect(type) {
    // 1. Vérification que la librairie Excel est bien chargée
    if (typeof XLSX === 'undefined') {
        showAlertModal("ERREUR CRITIQUE : La librairie 'SheetJS' (XLSX) n'est pas chargée.\n\nAssurez-vous d'avoir une connexion internet (si version CDN) ou que le dossier '_fichiers' est bien à côté du HTML.", 'error');
        return;
    }

    const idMap = { 'students': 'fileStudents', 'rooms': 'fileRooms', 'teachers': 'fileTeachers', 'grades': 'fileGrades', 'oral': 'fileOral', 'general': 'fileGenAvg' };
    const input = document.getElementById(idMap[type]);

    if (!input.files[0]) return;

    // Vérification verrouillage
    if ((type === 'grades' && DB.uiState.locked.grades) || (type.match(/oral|general/) && DB.uiState.locked.simul)) {
        showToast("Section verrouillée. Veuillez déverrouiller le cadenas.", 'warning');
        input.value = "";
        return;
    }

    const reader = new FileReader();

    // Gestion des erreurs de lecture fichier
    reader.onerror = () => {
        showAlertModal("Erreur lors de la lecture du fichier. Est-il ouvert dans Excel ? Si oui, fermez-le.", 'error');
        input.value = "";
    };

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // On récupère la 1ère feuille
            if (workbook.SheetNames.length === 0) throw new Error("Le fichier Excel semble vide (aucune feuille).");
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // Lecture brute pour trouver l'en-tête (Correction "Ligne vide")
            const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            let headerRowIndex = 0;
            const keywords = ['nom', 'name', 'salle', 'room', 'etablissement', 'classe', 'matiere'];

            // Scan des 20 premières lignes pour trouver les titres
            for (let i = 0; i < Math.min(rawData.length, 20); i++) {
                const rowStr = (rawData[i] || []).join(' ').toLowerCase();
                if (keywords.some(kw => rowStr.includes(kw))) {
                    headerRowIndex = i;
                    break;
                }
            }

            // Extraction finale
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: headerRowIndex, defval: "" });

            console.log(`Import: En-tête trouvé ligne ${headerRowIndex + 1}. ${jsonData.length} lignes lues.`);
            processExcelData(jsonData, type);

        } catch (err) {
            console.error(err);
            showAlertModal("Erreur lors de l'analyse du fichier Excel :\n" + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(input.files[0]);
    input.value = ""; // Reset pour permettre de réimporter le même fichier si besoin
}

function processExcelData(data, type) {
    if (!data || data.length === 0) return showToast("❌ Le fichier semble vide ou illisible.", 'error');

    // On stocke les données et le type pour plus tard
    tempImportData = data;
    currentImportType = type;

    // 1. IMPORT DES NOTES (Passe par le choix HG/EMC puis le mapping)
    if (type === 'grades') {
        document.getElementById('modalHGEMC').style.display = 'flex';
        return;
    }

    // 2. IMPORT ÉLÈVES (Lance le mapping)
    if (type === 'students') {
        if(typeof prepareStudentMapping === 'function') prepareStudentMapping(data);
        return;
    }

    // 3. IMPORT PROFS (Lance le mapping)
    if (type === 'teachers') {
        if(typeof prepareTeacherMapping === 'function') prepareTeacherMapping(data);
        return;
    }

    // 4. AUTRES (Salles, oral, general -> Import direct)
    if(typeof finalizeGeneralImport === 'function') finalizeGeneralImport(data, type);
}

function findKey(row, keywords) { 
    const keys = Object.keys(row); 
    for (let k of keys) { 
        const kLow = k.toLowerCase(); 
        for (let kw of keywords) { 
            if (kLow.includes(kw)) return k; 
        } 
    } 
    return null; 
}

function parseGrade(val) { 
    if (val === undefined || val === null || val === "") return null; 
    if (typeof val === 'number') return val; 
    let vStr = val.toString().replace(',', '.').trim(); 
    let num = parseFloat(vStr); 
    return isNaN(num) ? null : num; 
}

function cleanNumber(val) {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === 'number') return val;
    // Remplace virgule par point et enlève les espaces
    let vStr = val.toString().replace(',', '.').trim();
    let num = parseFloat(vStr);
    return isNaN(num) ? null : num;
}
