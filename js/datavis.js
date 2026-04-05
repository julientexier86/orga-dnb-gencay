// === MODULE: datavis ===
// --- PARTIE DATA VISUALISATION (FINALE V21.0) ---

// Fonction de calcul statistique
function calculateStats(students) {
    const subjects = ['total', 'fr', 'math', 'hg', 'sci', 'oral', 'moy20'];
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
            if (sub === 'oral') return s.grades.oral;

            if (sub === 'total') {
                let t = 0;
                if (s.grades.fr != null) t += s.grades.fr;
                if (s.grades.math != null) t += s.grades.math;
                if (s.grades.hg != null) t += s.grades.hg;
                if (sciScore != null) t += sciScore;
                if (s.grades.oral != null) t += s.grades.oral;
                return t;
            }

            if (sub === 'moy20') {
                let sum = 0, count = 0;
                if (s.grades.fr != null) { sum += s.grades.fr; count++; }
                if (s.grades.math != null) { sum += s.grades.math; count++; }
                if (s.grades.hg != null) { sum += s.grades.hg; count++; }
                if (sciScore != null) { sum += sciScore; count++; }
                if (s.grades.oral != null) { sum += s.grades.oral; count++; }
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

// Calcul de la répartition des mentions
function calculateMentions(students) {
    const activeSciences = DB.config.scienceSubjects || ['SVT', 'PC', 'TECH'];
    const mentions = { 'Refusé': 0, 'Admis': 0, 'Assez Bien': 0, 'Bien': 0, 'Très Bien': 0 };
    let total = 0;

    students.forEach(s => {
        if (!s.grades) return;
        const vn = (v) => { if (v == null || v === "") return null; const n = parseFloat(v); return isNaN(n) ? null : n; };

        // Sciences
        let sumSci = 0, cSci = 0;
        if (activeSciences.includes('SVT') && vn(s.grades.svt) !== null) { sumSci += vn(s.grades.svt); cSci++; }
        if (activeSciences.includes('PC') && vn(s.grades.pc) !== null) { sumSci += vn(s.grades.pc); cSci++; }
        if (activeSciences.includes('TECH') && vn(s.grades.tech) !== null) { sumSci += vn(s.grades.tech); cSci++; }
        const moySci = cSci > 0 ? (sumSci / cSci) : null;

        // Écrits
        let sumEcrit = 0, cEcrit = 0;
        if (vn(s.grades.fr) !== null) { sumEcrit += vn(s.grades.fr); cEcrit++; }
        if (vn(s.grades.math) !== null) { sumEcrit += vn(s.grades.math); cEcrit++; }
        if (typeof getDetailHGEMC === 'function') {
            const resHG = getDetailHGEMC(s);
            if (resHG.average !== null && !isNaN(resHG.average)) { sumEcrit += resHG.average; cEcrit++; }
        } else {
            if (vn(s.grades.hg) !== null) { sumEcrit += vn(s.grades.hg); cEcrit++; }
        }
        if (moySci !== null) { sumEcrit += moySci; cEcrit++; }

        // Épreuves (écrits + oral)
        let sumEpr = sumEcrit, cEpr = cEcrit;
        if (vn(s.grades.oral) !== null) { sumEpr += vn(s.grades.oral); cEpr++; }
        const moyEpr = cEpr > 0 ? (sumEpr / cEpr) : 0;

        // Note finale
        const moyGen = vn(s.grades.genAvg) || 0;
        let finalAvg = 0;
        if (moyGen > 0 && moyEpr > 0) finalAvg = (moyGen * 0.4) + (moyEpr * 0.6);
        else if (moyEpr > 0) finalAvg = moyEpr;
        else if (moyGen > 0) finalAvg = moyGen;
        else return; // pas de notes du tout

        total++;
        if (finalAvg >= 16) mentions['Très Bien']++;
        else if (finalAvg >= 14) mentions['Bien']++;
        else if (finalAvg >= 12) mentions['Assez Bien']++;
        else if (finalAvg >= 10) mentions['Admis']++;
        else mentions['Refusé']++;
    });

    return { mentions, total };
}

// Génère le HTML de la répartition des mentions
function buildMentionsHtml(students) {
    const { mentions, total } = calculateMentions(students);
    if (total === 0) return '';

    const pct = (n) => total > 0 ? (n / total * 100).toFixed(1) : '0';
    const data = [
        { label: 'Très Bien', count: mentions['Très Bien'], color: '#8e44ad' },
        { label: 'Bien', count: mentions['Bien'], color: '#3498db' },
        { label: 'Assez Bien', count: mentions['Assez Bien'], color: '#f39c12' },
        { label: 'Admis', count: mentions['Admis'], color: '#27ae60' },
        { label: 'Refusé', count: mentions['Refusé'], color: '#e74c3c' }
    ];

    let html = `<div style="margin-bottom:25px; padding:20px; background:#f8f9fa; border-radius:12px; border:1px solid #eee;">
        <h4 style="margin:0 0 15px 0; color:#2c3e50;">🏅 Répartition des Mentions (${total} élèves)</h4>
        <div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">`;

    data.forEach(d => {
        const isRefuse = d.label === 'Refusé';
        const borderStyle = isRefuse ? 'border:2px solid #e74c3c;' : 'border:1px solid #eee;';
        const bgStyle = isRefuse ? 'background:#fff5f5;' : 'background:white;';
        html += `<div style="flex:1; min-width:120px; padding:15px; border-radius:10px; text-align:center; ${borderStyle} ${bgStyle}">
            <div style="font-size:2rem; font-weight:bold; color:${d.color};">${pct(d.count)}%</div>
            <div style="font-size:0.85rem; font-weight:bold; color:${d.color};">${d.label}</div>
            <div style="font-size:0.8rem; color:${isRefuse ? '#e74c3c' : '#999'}; font-weight:${isRefuse ? 'bold' : 'normal'};">${d.count} élève${d.count > 1 ? 's' : ''}</div>
        </div>`;
    });

    // Barre de progression
    html += `</div><div style="margin-top:15px; height:24px; border-radius:12px; overflow:hidden; display:flex; background:#eee;">`;
    data.forEach(d => {
        const w = total > 0 ? (d.count / total * 100) : 0;
        if (w > 0) html += `<div style="width:${w}%; background:${d.color}; display:flex; align-items:center; justify-content:center; color:white; font-size:0.7rem; font-weight:bold;">${w >= 5 ? pct(d.count) + '%' : ''}</div>`;
    });
    html += `</div></div>`;

    return html;
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
                <div class="stat-row"><span>🎤 Oral :</span> <b>${stats.oral.moy !== '-' ? stats.oral.moy + ' / 20' : '-'}</b></div>
                <div class="stat-footer">
                    🎓 Moyenne : ${stats.moy20.moy} / 20
                </div>
            </div>`;
    });
    viewChartsHtml += `</div>`;

    // A-bis. Répartition des mentions (global)
    viewChartsHtml += buildMentionsHtml(DB.students);

    // A-ter. Répartition des mentions par classe
    classes.forEach(cls => {
        const classStudents = DB.students.filter(s => s.classe === cls);
        const { mentions: cMentions, total: cTotal } = calculateMentions(classStudents);
        if (cTotal === 0) return;
        const pct = (n) => cTotal > 0 ? (n / cTotal * 100).toFixed(1) : '0';
        viewChartsHtml += `<div style="margin-bottom:15px; padding:12px 18px; background:#f8f9fa; border-radius:10px; border:1px solid #eee;">
            <b>${cls}</b> — ${cTotal} élèves :
            <span style="color:#8e44ad;">TB ${pct(cMentions['Très Bien'])}%</span> ·
            <span style="color:#3498db;">B ${pct(cMentions['Bien'])}%</span> ·
            <span style="color:#f39c12;">AB ${pct(cMentions['Assez Bien'])}%</span> ·
            <span style="color:#27ae60;">Admis ${pct(cMentions['Admis'])}%</span> ·
            <span style="color:#e74c3c; font-weight:bold;">Refusé ${cMentions['Refusé']} (${pct(cMentions['Refusé'])}%)</span>
        </div>`;
    });

    // B. Graphiques
    viewChartsHtml += `
            <div class="chart-grid">
                <div class="chart-box"><div class="chart-header">🖍️ Français (Répartition)</div><div class="chart-container"><canvas id="chartFr"></canvas></div></div>
                <div class="chart-box"><div class="chart-header">🔢 Mathématiques (Répartition)</div><div class="chart-container"><canvas id="chartMath"></canvas></div></div>
                <div class="chart-box"><div class="chart-header">🏛️ Hist-Géo (Répartition)</div><div class="chart-container"><canvas id="chartHg"></canvas></div></div>
                <div class="chart-box"><div class="chart-header">🧪 Sciences (Répartition)</div><div class="chart-container"><canvas id="chartSci"></canvas></div></div>
                <div class="chart-box"><div class="chart-header">🎤 Oral (Répartition)</div><div class="chart-container"><canvas id="chartOral"></canvas></div></div>
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
                            <th colspan="5" style="text-align:center; background:#f5eef8;">Oral</th>
                        </tr>
                        <tr style="font-size:0.8rem">
                            <th>Min</th><th>Moy</th><th>Max</th><th>Med</th><th>Ec-T</th>
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
                <td>${stats.oral.min}</td><td style="font-weight:bold">${stats.oral.moy}</td><td>${stats.oral.max}</td><td>${stats.oral.med}</td><td style="color:#777">${stats.oral.ecart}</td>
            </tr>`;
    });
    viewTableHtml += `</tbody></table></div>`;

    // --- Tableau des mentions par groupe ---
    viewTableHtml += `
        <div style="margin-top:30px;">
            <h4 style="color:#2c3e50; margin-bottom:15px;">🏅 Répartition des Mentions par Groupe</h4>
            <div style="overflow-x:auto;">
                <table class="table-striped">
                    <thead>
                        <tr>
                            <th>Groupe</th>
                            <th style="text-align:center; background:#8e44ad; color:white;">Très Bien</th>
                            <th style="text-align:center; background:#3498db; color:white;">Bien</th>
                            <th style="text-align:center; background:#f39c12; color:white;">Assez Bien</th>
                            <th style="text-align:center; background:#27ae60; color:white;">Admis</th>
                            <th style="text-align:center; background:#e74c3c; color:white;">Refusé</th>
                        </tr>
                    </thead>
                    <tbody>`;

    groups.forEach(g => {
        const groupStudents = DB.students.filter(g.filter);
        const { mentions: gMentions, total: gTotal } = calculateMentions(groupStudents);
        const pct = (n) => gTotal > 0 ? (n / gTotal * 100).toFixed(1) : '0';
        const mentionCell = (n, isRefuse) => {
            const style = isRefuse ? 'color:#e74c3c; font-weight:bold;' : '';
            return `<td style="text-align:center; ${style}">${n} <span style="font-size:0.8rem; color:${isRefuse ? '#e74c3c' : '#999'};">(${pct(n)}%)</span></td>`;
        };
        viewTableHtml += `
            <tr>
                <td style="font-weight:bold;">${g.name}</td>
                ${mentionCell(gMentions['Très Bien'], false)}
                ${mentionCell(gMentions['Bien'], false)}
                ${mentionCell(gMentions['Assez Bien'], false)}
                ${mentionCell(gMentions['Admis'], false)}
                ${mentionCell(gMentions['Refusé'], true)}
            </tr>`;
    });

    viewTableHtml += `</tbody></table></div></div>`;

    viewTableHtml += `</div>`;
    container.innerHTML += viewTableHtml;

    renderHistogram('chartFr', 'fr', 20, 1);
    renderHistogram('chartMath', 'math', 20, 1);
    renderHistogram('chartHg', 'hg', 20, 1);
    renderHistogram('chartSci', 'sci', 20, 1);
    renderHistogram('chartOral', 'oral', 20, 1);
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
        if (subject === 'oral') val = s.grades.oral;
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
    yPos += 6;
    doc.text(`• Oral : ${stats.oral.moy !== '-' ? stats.oral.moy + ' / 20' : '-'}`, leftX, yPos);

    yPos += 15;

    // --- 1b. MENTIONS ---
    const { mentions, total: mentionTotal } = calculateMentions(DB.students);
    if (mentionTotal > 0) {
        doc.setFontSize(14); doc.setTextColor(41, 128, 185);
        doc.text("2. Répartition des Mentions", 14, yPos);
        yPos += 10;

        const mentionData = [
            { label: 'Très Bien', count: mentions['Très Bien'], color: [142, 68, 173] },
            { label: 'Bien', count: mentions['Bien'], color: [52, 152, 219] },
            { label: 'Assez Bien', count: mentions['Assez Bien'], color: [243, 156, 18] },
            { label: 'Admis', count: mentions['Admis'], color: [39, 174, 96] },
            { label: 'Refusé', count: mentions['Refusé'], color: [231, 76, 60] }
        ];

        const barX = 20, barW = 170, barH = 10;
        mentionData.forEach(m => {
            const pct = (m.count / mentionTotal * 100).toFixed(1);
            const isRefuse = m.label === 'Refusé';

            doc.setFontSize(11);
            doc.setTextColor(isRefuse ? 231 : 0, isRefuse ? 76 : 0, isRefuse ? 60 : 0);
            doc.setFont("helvetica", isRefuse ? "bold" : "normal");
            doc.text(`${m.label} : ${pct}% (${m.count} élève${m.count > 1 ? 's' : ''})`, barX, yPos);
            yPos += 5;

            // Barre de fond
            doc.setFillColor(230, 230, 230);
            doc.rect(barX, yPos, barW, barH, 'F');
            // Barre colorée
            const w = (m.count / mentionTotal) * barW;
            if (w > 0) {
                doc.setFillColor(m.color[0], m.color[1], m.color[2]);
                doc.rect(barX, yPos, w, barH, 'F');
            }
            yPos += barH + 5;
        });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        yPos += 5;
    }

    // --- 3. GRAPHIQUES ---
    const chartsIds = ['chartFr', 'chartMath', 'chartHg', 'chartSci', 'chartOral'];
    const chartTitles = ['Français', 'Maths', 'Hist-Géo', 'Sciences', 'Oral'];

    const firstCanvas = document.getElementById(chartsIds[0]);
    if (firstCanvas && firstCanvas.width > 0) {
        doc.setFontSize(14); doc.setTextColor(41, 128, 185); // Bleu
        doc.text("3. Distribution des Notes (Graphiques)", 14, yPos);
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

    // --- 4. TABLEAU (nouvelle page) ---
    doc.addPage(); yPos = 20;

    doc.setFontSize(14); doc.setTextColor(41, 128, 185); // Bleu
    doc.text("4. Détail par Groupe", 14, yPos);
    yPos += 10;

    const classes = [...new Set(DB.students.map(s => s.classe).filter(c => c))].sort();
    const groups = [{ name: "Global", filter: s => true }, { name: "Filles", filter: s => s.sexe === 'F' }, { name: "Garçons", filter: s => s.sexe === 'M' }];
    classes.forEach(c => groups.push({ name: c, filter: s => s.classe === c }));

    let body = [];
    groups.forEach(g => {
        const gStats = calculateStats(groupStudents = DB.students.filter(g.filter));
        body.push([g.name, gStats.moy20.moy, gStats.fr.moy, gStats.math.moy, gStats.hg.moy, gStats.sci.moy, gStats.oral.moy]);
    });

    doc.autoTable({
        head: [['Groupe', 'Moy. Générale', 'Français', 'Maths', 'Hist-Géo', 'Sciences', 'Oral']],
        body: body,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    // --- 5. TABLEAU MENTIONS PAR GROUPE ---
    yPos = doc.lastAutoTable.finalY + 15;
    if (yPos > 220) { doc.addPage(); yPos = 20; }

    doc.setFontSize(14); doc.setTextColor(41, 128, 185);
    doc.text("5. Répartition des Mentions par Groupe", 14, yPos);
    yPos += 10;

    let mentionBody = [];
    groups.forEach(g => {
        const groupStudents = DB.students.filter(g.filter);
        const { mentions: gM, total: gT } = calculateMentions(groupStudents);
        const pct = (n) => gT > 0 ? (n / gT * 100).toFixed(1) + '%' : '-';
        mentionBody.push([
            g.name,
            gM['Très Bien'] + ' (' + pct(gM['Très Bien']) + ')',
            gM['Bien'] + ' (' + pct(gM['Bien']) + ')',
            gM['Assez Bien'] + ' (' + pct(gM['Assez Bien']) + ')',
            gM['Admis'] + ' (' + pct(gM['Admis']) + ')',
            gM['Refusé'] + ' (' + pct(gM['Refusé']) + ')'
        ]);
    });

    doc.autoTable({
        head: [['Groupe', 'Très Bien', 'Bien', 'Assez Bien', 'Admis', 'Refusé']],
        body: mentionBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { halign: 'center', fontSize: 9 },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            5: { textColor: [231, 76, 60], fontStyle: 'bold' }
        }
    });

    doc.save("Rapport_Statistiques.pdf");
}
function exportSimulationXLSX() {
    // 1. On vérifie qu'il y a des données
    if (DB.students.length === 0) return showToast("Aucun élève à exporter.", 'error');

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
    if (DB.students.length === 0) return showToast("Aucune donnée à exporter.", 'error');

    // 1. Préparation des colonnes
    // On crée un tableau avec une ligne d'en-tête
    const data = [
        ["Groupe", "Effectif", "Moyenne Générale /20", "Français /20", "Maths /20", "Hist-Géo /20", "Sciences /20", "Oral /20"]
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
                parseFloat(stats.sci.moy),   // Sciences
                stats.oral.moy !== '-' ? parseFloat(stats.oral.moy) : "-" // Oral
            ]);
        } else {
            // Si le groupe est vide (ex: une classe sans élèves importés)
            data.push([g.name, 0, "-", "-", "-", "-", "-", "-"]);
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
        { wch: 15 }, // Largeur Sci
        { wch: 15 }  // Largeur Oral
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
                showConfirm("Attention : Cela va écraser les données actuelles par la sauvegarde automatique. Continuer ?", () => {
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
                        showAlertModal("Erreur lors de la restauration : " + e.message, 'error');
                    }
                });
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

