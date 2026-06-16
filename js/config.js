// --- CONFIGURATION DE BASE ---
window.onload = function () {
    if(typeof renderExamTable === 'function') renderExamTable();
    if(typeof checkLogo === 'function') checkLogo();
    if(typeof checkSignature === 'function') checkSignature();
    if(typeof updateLockUI === 'function') {
        updateLockUI('students');
        updateLockUI('rooms');
        updateLockUI('teachers');
        if(typeof updateDistribLock === 'function') updateDistribLock();
        updateLockUI('grades');
        updateLockUI('simul');
    }
    if (!DB.config.labels) DB.config.labels = JSON.parse(JSON.stringify(DEFAULT_LABELS));
    if (document.getElementById('nbSurveillantsToggle')) document.getElementById('nbSurveillantsToggle').checked = (DB.config.nbSurv === 2);

    if (DB.config.director) {
        if(document.getElementById('dirName')) document.getElementById('dirName').value = DB.config.director.name || "";
        if(typeof setDirectorCiv === 'function') setDirectorCiv(DB.config.director.civ || "M. le Principal");
    }

    if (DB.config.city && document.getElementById('schoolCity')) document.getElementById('schoolCity').value = DB.config.city;
    if (DB.config.schoolName && document.getElementById('schoolName')) document.getElementById('schoolName').value = DB.config.schoolName;

    if (document.getElementById('txtConvocInfo')) {
        if (DB.config.convocText) {
            document.getElementById('txtConvocInfo').value = DB.config.convocText;
        } else {
            DB.config.convocText = document.getElementById('txtConvocInfo').value;
        }
    }

    if (DB.config.scienceSubjects) {
        if(document.getElementById('chkSVT')) document.getElementById('chkSVT').checked = DB.config.scienceSubjects.includes('SVT');
        if(document.getElementById('chkPC')) document.getElementById('chkPC').checked = DB.config.scienceSubjects.includes('PC');
        if(document.getElementById('chkTech')) document.getElementById('chkTech').checked = DB.config.scienceSubjects.includes('TECH');
    } else {
        if(document.getElementById('chkSVT')) document.getElementById('chkSVT').checked = true;
        if(document.getElementById('chkPC')) document.getElementById('chkPC').checked = true;
        if(document.getElementById('chkTech')) document.getElementById('chkTech').checked = true;
    }
    if(typeof renderAmenagements === 'function') renderAmenagements();
};

function updateScienceConfig() {
    DB.config.scienceSubjects = [];
    if (document.getElementById('chkSVT') && document.getElementById('chkSVT').checked) DB.config.scienceSubjects.push('SVT');
    if (document.getElementById('chkPC') && document.getElementById('chkPC').checked) DB.config.scienceSubjects.push('PC');
    if (document.getElementById('chkTech') && document.getElementById('chkTech').checked) DB.config.scienceSubjects.push('TECH');
    if(typeof renderGrades === 'function') renderGrades();
    if(typeof renderSimulation === 'function') renderSimulation();
}

function importLogo() {
    const input = document.getElementById('logoInput');
    if(!input) return;
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        DB.config.logo = e.target.result;
        checkLogo();
    };
    r.readAsDataURL(f);
}

function checkLogo() {
    const i = document.getElementById('appLogoImg');
    if(!i) return;
    if (DB.config.logo) {
        i.src = DB.config.logo;
        i.style.display = 'block';
    } else {
        i.style.display = 'none';
    }
}

function importSignature() {
    const input = document.getElementById('sigInput');
    if(!input) return;
    const f = input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        DB.config.signature = e.target.result;
        checkSignature();
    };
    r.readAsDataURL(f);
}

function checkSignature() {
    const i = document.getElementById('imgSigPreview');
    if(!i) return;
    if (DB.config.signature) {
        i.src = DB.config.signature;
        i.style.display = 'block';
    } else {
        i.style.display = 'none';
    }
}

function updateExam(idx, field, value) {
    if (field === 'durStd' || field === 'durTT') value = parseInt(value);
    DB.exams[idx][field] = value;
    if (field === 'time' && !DB.exams[idx].timeTT) {
        DB.exams[idx].timeTT = value;
        if(typeof renderExamTable === 'function') renderExamTable();
    }
}
