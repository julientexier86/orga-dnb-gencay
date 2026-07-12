// === MODULE: datavis_reports ===
// Nouveaux designs de rapport (PDF synthèse + PPTX synthèse), aux côtés des exports historiques.
// Réutilise les calculs de datavis.js : calculateStats, calculateMentions, getReportDataset, etc.

const REPORT_V2 = {
    navy: [31, 52, 82],
    pink: [217, 43, 132],
    slate: [100, 116, 139],
    cardBg: [248, 250, 252],
    cardBorder: [226, 232, 240],
    classPalette: ['D92B84', '1F3452', '3498DB', '27AE60', 'F39C12', '8E44AD', 'E74C3C', '16A085']
};

function fmtFr1(value) {
    const num = parseFloat(String(value).replace(',', '.'));
    if (!Number.isFinite(num)) return '-';
    return num.toFixed(1).replace('.', ',');
}

function fmtFrDelta(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1).replace('.', ',')}`;
}

function statToNumber(value) {
    const num = parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(num) ? num : null;
}

// Pourcentages au format français (virgule décimale).
function frPct(text) {
    return String(text).replace('.', ',');
}

function frRate(count, total) {
    return frPct(getRateText(count, total));
}

function getSubjectValueForReport(student, subject) {
    if (!student || !student.grades) return null;
    if (subject === 'sci') return getScienceScore(student);
    const num = parseFloat(String(student.grades[subject] ?? '').toString().replace(',', '.'));
    return Number.isFinite(num) ? num : null;
}

// --- Rendu de graphiques hors écran (fond blanc, haute résolution) ---
function renderOffscreenChart(config, width, height) {
    if (typeof Chart === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    config.options = config.options || {};
    config.options.responsive = false;
    config.options.animation = false;
    config.options.devicePixelRatio = 2;
    let chart = null;
    try {
        chart = new Chart(canvas.getContext('2d'), config);
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        // JPEG sans alpha : jsPDF stocke les PNG avec transparence en bitmap brut (fichiers de plusieurs Mo).
        return canvas.toDataURL('image/jpeg', 0.92);
    } catch (error) {
        console.error('Rendu graphique hors écran impossible :', error);
        return null;
    } finally {
        if (chart) chart.destroy();
    }
}

function mentionColorForBucket(bucket) {
    if (bucket >= 18) return '#1f3a5c';
    if (bucket >= 16) return '#6b4a72';
    if (bucket >= 14) return '#1f3a5c';
    if (bucket >= 12) return '#9a7a2e';
    if (bucket >= 10) return '#2f6f5e';
    return '#9a4a2e';
}

// Histogramme de la moyenne finale /20, barres colorées par bande de mention.
function buildFinalAvgHistogramImage(students, width, height) {
    const counts = new Array(21).fill(0);
    let hasValues = false;
    students.forEach(student => {
        const avg = getGradeAverage(student);
        if (avg === null || avg === undefined || Number.isNaN(avg)) return;
        let bucket = Math.floor(avg);
        if (bucket < 0) bucket = 0;
        if (bucket > 20) bucket = 20;
        counts[bucket]++;
        hasValues = true;
    });
    if (!hasValues) return null;
    const labels = counts.map((_, i) => String(i));
    const colors = counts.map((_, i) => mentionColorForBucket(i));
    return renderOffscreenChart({
        type: 'bar',
        data: {
            labels,
            datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0, borderRadius: 3, maxBarThickness: 40 }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'Moyenne finale /20', font: { size: 15 } }, grid: { display: false }, ticks: { font: { size: 13 } } },
                y: { title: { display: true, text: "Nombre d'élèves", font: { size: 15 } }, beginAtZero: true, ticks: { precision: 0, font: { size: 13 } } }
            }
        }
    }, width, height);
}

// Nuage de points DNB blanc (x) vs DNB officiel (y) avec diagonale y = x.
function buildBlankOfficialScatterImage(comparisonRows, width, height) {
    const points = comparisonRows
        .filter(row => row.blankAvg !== null && row.officialAvg !== null)
        .map(row => ({ x: Number(row.blankAvg.toFixed(2)), y: Number(row.officialAvg.toFixed(2)) }));
    if (points.length < 2) return null;
    return renderOffscreenChart({
        type: 'scatter',
        data: {
            datasets: [
                { type: 'line', data: [{ x: 0, y: 0 }, { x: 20, y: 20 }], borderColor: '#94a3b8', borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0 },
                { data: points, backgroundColor: 'rgba(217,43,132,0.75)', pointRadius: 4 }
            ]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { type: 'linear', min: 0, max: 20, title: { display: true, text: 'Moyenne DNB blanc', font: { size: 15 } }, ticks: { font: { size: 13 } } },
                y: { type: 'linear', min: 0, max: 20, title: { display: true, text: 'Moyenne DNB officiel', font: { size: 15 } }, ticks: { font: { size: 13 } } }
            }
        }
    }, width, height);
}

// --- Faits marquants générés automatiquement ---
function buildReportInsights(students, report, comparisonRows) {
    const insights = [];
    const stats = report.stats;

    insights.push({ tone: 'info', text: `Taux de réussite : ${frPct(report.successRate)} (${report.successCount}/${report.total} élèves). Part d'excellence (TB ou Félicitations) : ${frPct(report.excellenceRate)}.` });

    const oral = statToNumber(stats.oral.moy);
    const writtenParts = [stats.fr.moy, stats.math.moy, stats.hg.moy, stats.sci.moy].map(statToNumber).filter(v => v !== null);
    if (oral !== null && writtenParts.length) {
        const written = writtenParts.reduce((s, v) => s + v, 0) / writtenParts.length;
        const gap = oral - written;
        if (Math.abs(gap) >= 0.8) {
            insights.push({
                tone: gap > 0 ? 'pos' : 'neg',
                text: gap > 0
                    ? `L'oral tire les résultats : ${fmtFr1(oral)} de moyenne, soit ${fmtFrDelta(gap)} pt sur la moyenne des écrits (${fmtFr1(written)}).`
                    : `L'oral est en retrait : ${fmtFr1(oral)} de moyenne, ${fmtFrDelta(gap)} pt sous la moyenne des écrits (${fmtFr1(written)}).`
            });
        }
    }

    const subjectDefs = [['fr', 'Français'], ['math', 'Mathématiques'], ['hg', 'Hist-géo / EMC'], ['sci', 'Sciences'], ['oral', 'Oral']];
    const rankable = subjectDefs
        .map(([key, label]) => ({ key, label, avg: statToNumber(stats[key].moy) }))
        .filter(item => item.avg !== null);
    if (rankable.length >= 2) {
        const sorted = rankable.slice().sort((a, b) => a.avg - b.avg);
        const weakest = sorted[0];
        const best = sorted[sorted.length - 1];
        const fragile = students.filter(s => {
            const value = getSubjectValueForReport(s, weakest.key);
            return value !== null && value < 8;
        }).length;
        insights.push({ tone: 'neg', text: `Point de vigilance : ${weakest.label} (${fmtFr1(weakest.avg)}/20)${fragile ? `, ${fragile} élève(s) sous 8/20` : ''}.` });
        insights.push({ tone: 'pos', text: `Discipline la plus favorable : ${best.label} (${fmtFr1(best.avg)}/20).` });
    }

    const girls = students.filter(s => getStudentSex(s) === 'F');
    const boys = students.filter(s => getStudentSex(s) === 'M');
    if (girls.length >= 3 && boys.length >= 3) {
        const avgOf = list => {
            const values = list.map(getGradeAverage).filter(v => v !== null && !Number.isNaN(v));
            return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
        };
        const gAvg = avgOf(girls);
        const bAvg = avgOf(boys);
        if (gAvg !== null && bAvg !== null && Math.abs(gAvg - bAvg) >= 0.5) {
            const ahead = gAvg > bAvg ? 'filles' : 'garçons';
            insights.push({ tone: 'warn', text: `Écart filles-garçons : ${fmtFrDelta(Math.abs(gAvg - bAvg))} pt en faveur des ${ahead} sur la moyenne finale.` });
        }
    }

    const thresholds = [10, 12, 14, 16, 18];
    const nearMiss = students.filter(s => {
        const avg = getGradeAverage(s);
        if (avg === null || avg === undefined || Number.isNaN(avg)) return false;
        return thresholds.some(t => avg < t && t - avg <= 0.5);
    }).length;
    if (nearMiss > 0) {
        insights.push({ tone: 'warn', text: `${nearMiss} élève(s) à moins de 0,5 point d'un seuil (admission ou mention supérieure).` });
    }

    if (comparisonRows && comparisonRows.length) {
        const comparable = comparisonRows.filter(row => row.diff !== null);
        if (comparable.length >= 3) {
            const avgDelta = comparable.reduce((s, row) => s + row.diff, 0) / comparable.length;
            const up = comparable.filter(row => row.diff > 0.01).length;
            const down = comparable.filter(row => row.diff < -0.01).length;
            insights.push({
                tone: avgDelta >= 0 ? 'pos' : 'neg',
                text: `Par rapport au DNB blanc : écart moyen ${fmtFrDelta(avgDelta)} pt (${up} progression(s), ${down} baisse(s) sur ${comparable.length} élèves comparés).`
            });
        }
    }

    return insights;
}

function insightPdfColor(tone) {
    if (tone === 'pos') return [39, 174, 96];
    if (tone === 'neg') return [231, 76, 60];
    if (tone === 'warn') return [243, 156, 18];
    return REPORT_V2.navy;
}

function insightPptColor(tone) {
    if (tone === 'pos') return '27AE60';
    if (tone === 'neg') return 'E74C3C';
    if (tone === 'warn') return 'F39C12';
    return '1F3452';
}

// --- Données par classe (profil vs cohorte) ---
function buildClassProfiles(students) {
    const cohortStats = calculateStats(students);
    const classes = [...new Set(students.map(s => s.classe).filter(Boolean))].sort();
    return classes.map(cls => {
        const classStudents = students.filter(s => s.classe === cls);
        const stats = calculateStats(classStudents);
        const { mentions, total } = calculateMentions(classStudents);
        const refused = mentions['Refusé'] || 0;
        const subjects = [['fr', 'Français'], ['math', 'Maths'], ['hg', 'HG/EMC'], ['sci', 'Sciences'], ['oral', 'Oral'], ['moy20', 'Moyenne']]
            .map(([key, label]) => ({
                key, label,
                value: statToNumber(stats[key].moy),
                cohort: statToNumber(cohortStats[key].moy)
            }));
        const deltas = subjects
            .filter(item => item.key !== 'moy20' && item.value !== null && item.cohort !== null)
            .map(item => ({ label: item.label, delta: item.value - item.cohort }));
        deltas.sort((a, b) => b.delta - a.delta);
        const fragile = classStudents.filter(s => {
            const avg = getGradeAverage(s);
            return avg !== null && avg !== undefined && !Number.isNaN(avg) && avg < 8;
        }).length;
        return { cls, classStudents, stats, cohortStats, mentions, total, refused, subjects, deltas, fragile };
    });
}

function buildClassInsightText(profile) {
    const parts = [];
    if (profile.deltas.length) {
        const best = profile.deltas[0];
        const worst = profile.deltas[profile.deltas.length - 1];
        if (best.delta >= 0.3) parts.push(`point fort en ${best.label.toLowerCase()} (${fmtFrDelta(best.delta)} sur la cohorte)`);
        if (worst.delta <= -0.3) parts.push(`fragilité en ${worst.label.toLowerCase()} (${fmtFrDelta(worst.delta)})`);
    }
    if (profile.fragile > 0) parts.push(`${profile.fragile} élève(s) sous 8/20 à suivre`);
    if (!parts.length) return 'Profil homogène, proche de la cohorte.';
    const text = parts.join(' ; ');
    return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

function getClassBlankDelta(comparisonRows, cls) {
    if (!comparisonRows) return null;
    const rows = comparisonRows.filter(row => row.diff !== null && ((row.official && row.official.classe === cls) || (row.student && row.student.classe === cls)));
    if (!rows.length) return null;
    return rows.reduce((s, row) => s + row.diff, 0) / rows.length;
}

// ============================================================
// ===                    PDF SYNTHÈSE                      ===
// ============================================================

function drawReportHeaderV2(doc, title, subtitle) {
    const pageWidth = doc.internal.pageSize.width;
    doc.setFillColor(...REPORT_V2.navy);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFillColor(...REPORT_V2.pink);
    doc.rect(0, 30, pageWidth, 2, 'F');
    addSmartLogo(doc, 12, 4, 22);
    doc.setTextColor(159, 179, 206);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth / 2, 12, { align: 'center' });
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, pageWidth / 2, 22, { align: 'center' });
    doc.setTextColor(0);
}

function drawSectionTitleV2(doc, title, y) {
    doc.setTextColor(...REPORT_V2.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, 14, y);
    doc.setDrawColor(...REPORT_V2.pink);
    doc.setLineWidth(0.7);
    doc.line(14, y + 2, 44, y + 2);
    doc.setTextColor(0);
}

function drawMentionStackedBarPdf(doc, x, y, w, h, students, withLegend) {
    const { mentions, total } = calculateMentions(students);
    if (!total) return y + h;
    const data = getMentionDisplayData(mentions);
    let cursor = x;
    doc.setFontSize(7.5);
    data.forEach(m => {
        const segW = (m.count / total) * w;
        if (segW <= 0) return;
        doc.setFillColor(...m.pdfColor);
        doc.rect(cursor, y, segW, h, 'F');
        if (segW >= 9) {
            doc.setTextColor(255);
            doc.setFont('helvetica', 'bold');
            doc.text(String(m.count), cursor + segW / 2, y + h / 2 + 1.1, { align: 'center' });
        }
        cursor += segW;
    });
    doc.setTextColor(0);
    if (!withLegend) return y + h;
    let legendX = x;
    const legendY = y + h + 5;
    doc.setFontSize(7.5);
    data.forEach(m => {
        if (!m.count) return;
        doc.setFillColor(...m.pdfColor);
        doc.rect(legendX, legendY - 2.4, 3, 3, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70);
        const label = `${m.short} ${frRate(m.count, total)}`;
        doc.text(label, legendX + 4.2, legendY);
        legendX += doc.getTextWidth(label) + 10;
    });
    doc.setTextColor(0);
    return legendY + 3;
}

function heatmapCellStyle(rawText) {
    const value = parseFloat(String(rawText).replace(',', '.'));
    if (!Number.isFinite(value)) return { fill: [248, 250, 252], text: [100, 116, 139] };
    if (value >= 1) return { fill: [159, 225, 203], text: [4, 52, 44] };
    if (value >= 0.15) return { fill: [225, 245, 238], text: [8, 80, 65] };
    if (value <= -1) return { fill: [247, 193, 193], text: [80, 19, 19] };
    if (value <= -0.15) return { fill: [252, 235, 235], text: [121, 31, 31] };
    return { fill: [248, 250, 252], text: [100, 116, 139] };
}

function exportDatavisPDFv2() {
    const { jsPDF } = window.jspdf;
    const dataStudents = getActiveDatavisStudents();
    if (dataStudents.length === 0) return showToast('Aucune donnée à exporter pour ' + getDatavisSourceLabel(), 'error');

    const doc = new jsPDF('p', 'mm', 'a4');
    const report = getReportDataset(dataStudents);
    const isOfficial = getDatavisSource() === 'official';
    const comparisonRows = isOfficial && (DB.officialResults || []).length && (DB.students || []).length
        ? getComparisonRows().filter(row => row.diff !== null)
        : null;
    const insights = buildReportInsights(dataStudents, report, comparisonRows);
    const profiles = buildClassProfiles(dataStudents);
    const subtitle = `${DB.config.schoolName || 'Établissement'} · Session ${DB.config.year || ''} · ${getDatavisSourceLabel()} · ${dataStudents.length} élève(s)`;

    // --- PAGE 1 : SYNTHÈSE DE DIRECTION ---
    drawReportHeaderV2(doc, `Résultats — ${getReportExamLabel()}`, subtitle);
    drawSectionTitleV2(doc, 'Synthèse générale', 42);
    const mentionAmongAdmis = report.successCount > 0
        ? frRate(report.successCount - (report.mentions['Admis'] || 0), report.successCount)
        : '-';
    const globalBlankDelta = comparisonRows && comparisonRows.length
        ? comparisonRows.reduce((s, row) => s + row.diff, 0) / comparisonRows.length
        : null;
    drawPdfKpi(doc, 14, 47, 43, 'Réussite', frPct(report.successRate), `${report.successCount}/${report.total} élèves`, [39, 174, 96]);
    drawPdfKpi(doc, 61, 47, 43, 'Moyenne', `${fmtFr1(report.stats.moy20.moy)}/20`, `médiane ${fmtFr1(report.stats.moy20.med)}`, REPORT_V2.navy);
    drawPdfKpi(doc, 108, 47, 43, 'Mentions', mentionAmongAdmis, 'des admis avec mention', [142, 68, 173]);
    if (globalBlankDelta !== null) {
        drawPdfKpi(doc, 155, 47, 41, 'vs DNB blanc', `${fmtFrDelta(globalBlankDelta)} pt`, 'écart moyen', globalBlankDelta >= 0 ? [39, 174, 96] : [231, 76, 60]);
    } else {
        drawPdfKpi(doc, 155, 47, 41, 'Effectif', dataStudents.length, 'élèves analysés', REPORT_V2.pink);
    }

    drawSectionTitleV2(doc, 'Répartition des mentions', 88);
    drawMentionStackedBarPdf(doc, 14, 93, 182, 10, dataStudents, true);

    drawSectionTitleV2(doc, 'Distribution de la moyenne finale', 122);
    const histImage = buildFinalAvgHistogramImage(dataStudents, 1600, 640);
    if (histImage) {
        doc.addImage(histImage, 'JPEG', 14, 127, 182, 72.8);
    } else {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text('Aucune moyenne finale disponible.', 14, 132);
        doc.setTextColor(0);
    }

    drawSectionTitleV2(doc, 'Faits marquants', 210);
    let insightY = 217;
    insights.slice(0, 6).forEach(insight => {
        const color = insightPdfColor(insight.tone);
        doc.setFillColor(...color);
        doc.rect(14, insightY - 3.4, 1.4, 8, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const lines = doc.splitTextToSize(insight.text, 174);
        doc.text(lines, 18.5, insightY);
        insightY += lines.length * 4.2 + 4.5;
    });
    doc.setTextColor(0);

    // --- PAGE 2 : CLASSES × DISCIPLINES ---
    if (profiles.length) {
        doc.addPage();
        drawReportHeaderV2(doc, 'Analyse par classes', subtitle);
        drawSectionTitleV2(doc, 'Classes × disciplines — écart à la cohorte', 42);
        const cohortRow = ['Cohorte', fmtFr1(report.stats.moy20.moy), fmtFr1(report.stats.fr.moy), fmtFr1(report.stats.math.moy), fmtFr1(report.stats.hg.moy), fmtFr1(report.stats.sci.moy), fmtFr1(report.stats.oral.moy)];
        const body = [cohortRow];
        profiles.forEach(profile => {
            const cells = [profile.cls];
            ['moy20', 'fr', 'math', 'hg', 'sci', 'oral'].forEach(key => {
                const item = profile.subjects.find(s => s.key === key);
                cells.push(item && item.value !== null && item.cohort !== null ? fmtFrDelta(item.value - item.cohort) : '-');
            });
            body.push(cells);
        });
        doc.autoTable({
            head: [['Groupe', 'Moyenne', 'Français', 'Maths', 'HG/EMC', 'Sciences', 'Oral']],
            body,
            startY: 47,
            theme: 'grid',
            headStyles: { fillColor: REPORT_V2.navy, textColor: 255, fontSize: 8.5 },
            styles: { fontSize: 8.5, halign: 'center', cellPadding: 2.2 },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold', textColor: REPORT_V2.navy } },
            didParseCell: data => {
                if (data.section !== 'body' || data.column.index === 0) return;
                if (data.row.index === 0) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [237, 242, 247];
                    data.cell.styles.textColor = REPORT_V2.navy;
                    return;
                }
                const style = heatmapCellStyle(data.cell.raw);
                data.cell.styles.fillColor = style.fill;
                data.cell.styles.textColor = style.text;
            }
        });
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text('Première ligne : moyennes de la cohorte. Lignes suivantes : écart de chaque classe à la cohorte (vert = au-dessus, rouge = en dessous).', 14, doc.lastAutoTable.finalY + 5);
        doc.setTextColor(0);

        let barsY = doc.lastAutoTable.finalY + 14;
        drawSectionTitleV2(doc, 'Mentions par classe', barsY);
        barsY += 6;
        profiles.forEach(profile => {
            if (barsY > 262) return;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...REPORT_V2.navy);
            doc.text(`${profile.cls} (${profile.total})`, 14, barsY + 5.5);
            doc.setTextColor(0);
            drawMentionStackedBarPdf(doc, 42, barsY, 154, 8, profile.classStudents, false);
            barsY += 12;
        });
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text('De gauche à droite : Félicitations, Très Bien, Bien, Assez Bien, Admis, Refusé.', 14, barsY + 3);
        doc.setTextColor(0);
    }

    // --- PAGES SUIVANTES : UNE CLASSE = UNE PAGE ---
    profiles.forEach(profile => {
        doc.addPage();
        drawReportHeaderV2(doc, `Classe ${profile.cls} — ${profile.classStudents.length} élèves`, subtitle);

        const classSuccess = frRate(profile.total - profile.refused, profile.total);
        const moyItem = profile.subjects.find(s => s.key === 'moy20');
        const moyDelta = moyItem && moyItem.value !== null && moyItem.cohort !== null ? moyItem.value - moyItem.cohort : null;
        const classBlankDelta = getClassBlankDelta(comparisonRows, profile.cls);
        drawPdfKpi(doc, 14, 40, 43, 'Moyenne', moyItem && moyItem.value !== null ? `${fmtFr1(moyItem.value)}/20` : '-', moyDelta !== null ? `${fmtFrDelta(moyDelta)} vs cohorte` : '', REPORT_V2.navy);
        drawPdfKpi(doc, 61, 40, 43, 'Réussite', classSuccess, `${profile.total - profile.refused}/${profile.total} admis`, [39, 174, 96]);
        drawPdfKpi(doc, 108, 40, 43, 'Refusés', profile.refused, profile.fragile ? `dont ${profile.fragile} sous 8/20` : '', profile.refused ? [231, 76, 60] : [39, 174, 96]);
        if (classBlankDelta !== null) {
            drawPdfKpi(doc, 155, 40, 41, 'vs DNB blanc', `${fmtFrDelta(classBlankDelta)} pt`, 'écart moyen', classBlankDelta >= 0 ? [39, 174, 96] : [231, 76, 60]);
        } else {
            drawPdfKpi(doc, 155, 40, 41, 'Effectif', profile.classStudents.length, 'élèves', REPORT_V2.pink);
        }

        drawSectionTitleV2(doc, 'Profil par discipline — classe vs cohorte', 82);
        let barY = 90;
        profile.subjects.forEach(subject => {
            doc.setFont('helvetica', subject.key === 'moy20' ? 'bold' : 'normal');
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            doc.text(subject.label, 14, barY + 4);
            const barX = 46;
            const barW = 118;
            doc.setFillColor(237, 242, 247);
            doc.roundedRect(barX, barY, barW, 5.5, 1.5, 1.5, 'F');
            if (subject.value !== null) {
                doc.setFillColor(...REPORT_V2.pink);
                doc.roundedRect(barX, barY, Math.max(2, (subject.value / 20) * barW), 5.5, 1.5, 1.5, 'F');
            }
            if (subject.cohort !== null) {
                const tickX = barX + (subject.cohort / 20) * barW;
                doc.setDrawColor(...REPORT_V2.navy);
                doc.setLineWidth(1);
                doc.line(tickX, barY - 1.2, tickX, barY + 6.7);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(80);
            const valueText = subject.value !== null ? fmtFr1(subject.value) : '-';
            const cohortText = subject.cohort !== null ? ` · coh. ${fmtFr1(subject.cohort)}` : '';
            doc.text(`${valueText}${cohortText}`, 168, barY + 4);
            barY += 11;
        });
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text('Barre rose : moyenne de la classe. Trait bleu marine : moyenne de la cohorte.', 14, barY + 2);
        doc.setTextColor(0);

        drawSectionTitleV2(doc, 'Mentions de la classe', barY + 14);
        drawMentionStackedBarPdf(doc, 14, barY + 19, 182, 9, profile.classStudents, true);

        drawSectionTitleV2(doc, 'Lecture', barY + 46);
        doc.setFillColor(...REPORT_V2.pink);
        doc.rect(14, barY + 50, 1.4, 9, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(doc.splitTextToSize(buildClassInsightText(profile), 174), 18.5, barY + 54);
        doc.setTextColor(0);
    });

    // --- PAGE COMPARAISON BLANC / OFFICIEL ---
    if (comparisonRows && comparisonRows.length >= 2) {
        doc.addPage();
        drawReportHeaderV2(doc, 'Fiabilité du DNB blanc', subtitle);
        const avgDelta = comparisonRows.reduce((s, row) => s + row.diff, 0) / comparisonRows.length;
        const up = comparisonRows.filter(row => row.diff > 0.01).length;
        const down = comparisonRows.filter(row => row.diff < -0.01).length;
        drawPdfKpi(doc, 14, 40, 58, 'Écart moyen', `${fmtFrDelta(avgDelta)} pt`, 'officiel - blanc', avgDelta >= 0 ? [39, 174, 96] : [231, 76, 60]);
        drawPdfKpi(doc, 76, 40, 58, 'Progressions', up, `sur ${comparisonRows.length} comparés`, [39, 174, 96]);
        drawPdfKpi(doc, 138, 40, 58, 'Baisses', down, `sur ${comparisonRows.length} comparés`, [231, 76, 60]);
        const scatterImage = buildBlankOfficialScatterImage(comparisonRows, 1100, 1100);
        if (scatterImage) {
            drawSectionTitleV2(doc, 'Moyenne au DNB blanc vs moyenne officielle (chaque point = un élève)', 82);
            doc.addImage(scatterImage, 'JPEG', 40, 88, 130, 130);
            doc.setFontSize(7.5);
            doc.setTextColor(120);
            doc.text('Au-dessus de la diagonale : élève au-dessus de son résultat au DNB blanc. En dessous : en retrait.', 14, 225);
            doc.setTextColor(0);
        }
    }

    // --- PIED DE PAGE ---
    const pageCount = doc.internal.getNumberOfPages();
    const generatedOn = new Date().toLocaleDateString('fr-FR');
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text(`Rapport synthèse — ${getReportExamLabel()} — Session ${DB.config.year || ''} · généré le ${generatedOn}`, 14, 292);
        doc.text(`${i}/${pageCount}`, 196, 292, { align: 'right' });
    }
    doc.setTextColor(0);

    doc.save(`Rapport_Synthese_${getReportFileLabel()}_${DB.config.year || ''}.pdf`);
}
window.exportDatavisPDFv2 = exportDatavisPDFv2;

// ============================================================
// ===                   PPTX SYNTHÈSE                      ===
// ============================================================

function exportDatavisPPTXv2() {
    const PptxCtor = window.PptxGenJS || window.pptxgen;
    if (!PptxCtor) return showToast('Librairie PowerPoint non chargée.', 'error');
    const dataStudents = getActiveDatavisStudents();
    if (dataStudents.length === 0) return showToast('Aucune donnée à exporter pour ' + getDatavisSourceLabel(), 'error');

    const ppt = new PptxCtor();
    ppt.layout = 'LAYOUT_WIDE';
    ppt.author = DB.config.schoolName || 'Orga DNB';
    ppt.subject = `Rapport synthèse ${getReportExamLabel()}`;
    ppt.title = `Rapport synthèse - ${getReportExamLabel()}`;
    ppt.company = DB.config.schoolName || '';
    ppt.lang = 'fr-FR';
    ppt.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'fr-FR' };

    const report = getReportDataset(dataStudents);
    const isOfficial = getDatavisSource() === 'official';
    const comparisonRows = isOfficial && (DB.officialResults || []).length && (DB.students || []).length
        ? getComparisonRows().filter(row => row.diff !== null)
        : null;
    const insights = buildReportInsights(dataStudents, report, comparisonRows);
    const profiles = buildClassProfiles(dataStudents);
    const subtitle = `${DB.config.schoolName || 'Établissement'} · Session ${DB.config.year || ''} · ${getDatavisSourceLabel()} · ${dataStudents.length} élève(s)`;

    // --- DIAPO 1 : TITRE ---
    let slide = ppt.addSlide();
    slide.background = { color: '1F3452' };
    slide.addShape(ppt.ShapeType.rect, { x: 0, y: 5.05, w: 13.333, h: 0.07, fill: { color: 'D92B84' }, line: { color: 'D92B84' } });
    slide.addText((DB.config.schoolName || 'Établissement').toUpperCase(), { x: 0.9, y: 1.15, w: 11.5, h: 0.4, fontSize: 14, color: '9FB3CE', charSpacing: 3 });
    slide.addText(`Résultats — ${getReportExamLabel()}`, { x: 0.9, y: 1.6, w: 11.5, h: 1.0, fontSize: 40, bold: true, color: 'FFFFFF' });
    slide.addText(`Session ${DB.config.year || ''} · ${dataStudents.length} élèves`, { x: 0.9, y: 2.7, w: 11.5, h: 0.4, fontSize: 16, color: 'DDE6F3' });
    const mentionAmongAdmis = report.successCount > 0
        ? frRate(report.successCount - (report.mentions['Admis'] || 0), report.successCount)
        : '-';
    addPptKpi(ppt, slide, 0.9, 3.5, 2.7, 'Réussite', frPct(report.successRate), `${report.successCount}/${report.total} élèves`, '27AE60');
    addPptKpi(ppt, slide, 3.85, 3.5, 2.7, 'Moyenne', `${fmtFr1(report.stats.moy20.moy)}/20`, `médiane ${fmtFr1(report.stats.moy20.med)}`, '1F3452');
    addPptKpi(ppt, slide, 6.8, 3.5, 2.7, 'Mentions', mentionAmongAdmis, 'des admis avec mention', '8E44AD');
    const globalBlankDelta = comparisonRows && comparisonRows.length
        ? comparisonRows.reduce((s, row) => s + row.diff, 0) / comparisonRows.length
        : null;
    if (globalBlankDelta !== null) {
        addPptKpi(ppt, slide, 9.75, 3.5, 2.7, 'vs DNB blanc', `${fmtFrDelta(globalBlankDelta)} pt`, 'écart moyen', globalBlankDelta >= 0 ? '27AE60' : 'E74C3C');
    } else {
        addPptKpi(ppt, slide, 9.75, 3.5, 2.7, 'Excellence', frPct(report.excellenceRate), `${report.excellenceCount} TB ou +`, 'D92B84');
    }
    slide.addText(`Généré le ${new Date().toLocaleDateString('fr-FR')} · Orga DNB`, { x: 0.9, y: 6.75, w: 11.5, h: 0.3, fontSize: 10, color: '7E93B2' });

    // --- DIAPO 2 : MENTIONS + DISCIPLINES (GRAPHIQUES NATIFS ÉDITABLES) ---
    slide = ppt.addSlide();
    addPptHeader(ppt, slide, 'Mentions et disciplines', subtitle);
    const mentionData = report.mentionData.filter(m => m.count > 0);
    if (mentionData.length) {
        slide.addText('Répartition des mentions', { x: 0.55, y: 1.05, w: 5.5, h: 0.3, fontSize: 14, bold: true, color: '1F3452' });
        slide.addChart(ppt.ChartType.doughnut, [{
            name: 'Mentions',
            labels: mentionData.map(m => m.label),
            values: mentionData.map(m => m.count)
        }], {
            x: 0.45, y: 1.45, w: 5.7, h: 5.3,
            chartColors: mentionData.map(m => pptColor(m.color)),
            holeSize: 55,
            showPercent: true,
            dataLabelColor: 'FFFFFF',
            dataLabelFontSize: 10,
            showLegend: true,
            legendPos: 'b',
            legendFontSize: 10,
            dataBorder: { pt: 1.5, color: 'FFFFFF' }
        });
    }
    if (profiles.length) {
        const subjectLabels = ['Français', 'Maths', 'HG/EMC', 'Sciences', 'Oral'];
        const subjectKeys = ['fr', 'math', 'hg', 'sci', 'oral'];
        const series = profiles.map(profile => ({
            name: profile.cls,
            labels: subjectLabels,
            values: subjectKeys.map(key => {
                const item = profile.subjects.find(s => s.key === key);
                return item && item.value !== null ? Number(item.value.toFixed(2)) : 0;
            })
        }));
        series.push({
            name: 'Cohorte',
            labels: subjectLabels,
            values: subjectKeys.map(key => {
                const value = statToNumber(report.stats[key].moy);
                return value !== null ? Number(value.toFixed(2)) : 0;
            })
        });
        slide.addText('Moyennes par discipline et par classe', { x: 6.7, y: 1.05, w: 6, h: 0.3, fontSize: 14, bold: true, color: '1F3452' });
        slide.addChart(ppt.ChartType.bar, series, {
            x: 6.6, y: 1.45, w: 6.3, h: 5.3,
            barDir: 'col',
            chartColors: REPORT_V2.classPalette.slice(0, profiles.length).concat(['64748B']),
            valAxisMinVal: 0,
            valAxisMaxVal: 20,
            catAxisLabelFontSize: 10,
            valAxisLabelFontSize: 10,
            showLegend: true,
            legendPos: 'b',
            legendFontSize: 10
        });
    }

    // --- DIAPO 3 : DISTRIBUTION + FAITS MARQUANTS ---
    slide = ppt.addSlide();
    addPptHeader(ppt, slide, 'Distribution et faits marquants', subtitle);
    const histImage = buildFinalAvgHistogramImage(dataStudents, 1600, 640);
    if (histImage) {
        slide.addText('Moyennes finales /20 (couleur = bande de mention)', { x: 0.55, y: 1.05, w: 8, h: 0.3, fontSize: 14, bold: true, color: '1F3452' });
        slide.addImage({ data: histImage, x: 0.55, y: 1.45, w: 8.1, h: 3.24 });
    }
    slide.addText('Faits marquants', { x: 9.0, y: 1.05, w: 3.8, h: 0.3, fontSize: 14, bold: true, color: '1F3452' });
    let insightY = 1.5;
    insights.slice(0, 5).forEach(insight => {
        slide.addShape(ppt.ShapeType.rect, { x: 9.0, y: insightY, w: 0.05, h: 0.85, fill: { color: insightPptColor(insight.tone) }, line: { color: insightPptColor(insight.tone) } });
        slide.addText(insight.text, { x: 9.15, y: insightY, w: 3.9, h: 0.85, fontSize: 10, color: '334155', valign: 'top' });
        insightY += 1.02;
    });

    // --- DIAPOS PAR CLASSE ---
    profiles.forEach(profile => {
        const classSlide = ppt.addSlide();
        addPptHeader(ppt, classSlide, `Classe ${profile.cls} — ${profile.classStudents.length} élèves`, subtitle);

        const radarSubjects = profile.subjects.filter(s => s.key !== 'moy20' && s.value !== null && s.cohort !== null);
        if (radarSubjects.length >= 3) {
            classSlide.addText('Profil vs cohorte', { x: 0.55, y: 1.05, w: 5, h: 0.3, fontSize: 14, bold: true, color: '1F3452' });
            classSlide.addChart(ppt.ChartType.radar, [
                { name: profile.cls, labels: radarSubjects.map(s => s.label), values: radarSubjects.map(s => Number(s.value.toFixed(2))) },
                { name: 'Cohorte', labels: radarSubjects.map(s => s.label), values: radarSubjects.map(s => Number(s.cohort.toFixed(2))) }
            ], {
                x: 0.45, y: 1.4, w: 5.7, h: 5.3,
                radarStyle: 'standard',
                chartColors: ['D92B84', '1F3452'],
                valAxisMinVal: 0,
                valAxisMaxVal: 20,
                catAxisLabelFontSize: 10,
                showLegend: true,
                legendPos: 'b',
                legendFontSize: 10
            });
        }

        const moyItem = profile.subjects.find(s => s.key === 'moy20');
        const moyDelta = moyItem && moyItem.value !== null && moyItem.cohort !== null ? moyItem.value - moyItem.cohort : null;
        addPptKpi(ppt, classSlide, 6.6, 1.4, 3.05, 'Moyenne', moyItem && moyItem.value !== null ? `${fmtFr1(moyItem.value)}/20` : '-', moyDelta !== null ? `${fmtFrDelta(moyDelta)} vs cohorte` : '', '1F3452');
        addPptKpi(ppt, classSlide, 9.85, 1.4, 3.05, 'Réussite', frRate(profile.total - profile.refused, profile.total), `${profile.total - profile.refused}/${profile.total} admis`, '27AE60');

        classSlide.addText('Mentions de la classe', { x: 6.7, y: 2.65, w: 4, h: 0.25, fontSize: 12, bold: true, color: '1F3452' });
        let barY = 3.05;
        getMentionDisplayData(profile.mentions).forEach(m => {
            addPptBar(ppt, classSlide, 6.7, barY, 1.9, m.label, m.count, profile.total, pptColor(m.color));
            barY += 0.34;
        });

        classSlide.addShape(ppt.ShapeType.rect, { x: 6.7, y: 5.5, w: 0.05, h: 1.0, fill: { color: 'D92B84' }, line: { color: 'D92B84' } });
        classSlide.addText(buildClassInsightText(profile), { x: 6.85, y: 5.5, w: 6.1, h: 1.0, fontSize: 12, color: '334155', valign: 'top' });
    });

    // --- DIAPO COMPARAISON BLANC / OFFICIEL ---
    if (comparisonRows && comparisonRows.length >= 2) {
        slide = ppt.addSlide();
        addPptHeader(ppt, slide, 'Fiabilité du DNB blanc', subtitle);
        const avgDelta = comparisonRows.reduce((s, row) => s + row.diff, 0) / comparisonRows.length;
        const up = comparisonRows.filter(row => row.diff > 0.01).length;
        const down = comparisonRows.filter(row => row.diff < -0.01).length;
        const scatterImage = buildBlankOfficialScatterImage(comparisonRows, 1100, 1100);
        if (scatterImage) {
            slide.addImage({ data: scatterImage, x: 0.7, y: 1.35, w: 5.3, h: 5.3 });
        }
        addPptKpi(ppt, slide, 6.7, 1.6, 3.0, 'Écart moyen', `${fmtFrDelta(avgDelta)} pt`, 'officiel - blanc', avgDelta >= 0 ? '27AE60' : 'E74C3C');
        addPptKpi(ppt, slide, 9.9, 1.6, 3.0, 'Comparés', comparisonRows.length, 'élèves rapprochés', '1F3452');
        addPptKpi(ppt, slide, 6.7, 2.8, 3.0, 'Progressions', up, 'au-dessus du blanc', '27AE60');
        addPptKpi(ppt, slide, 9.9, 2.8, 3.0, 'Baisses', down, 'en dessous du blanc', 'E74C3C');
        slide.addText('Chaque point est un élève : au-dessus de la diagonale, il a fait mieux que son DNB blanc.', {
            x: 6.7, y: 4.3, w: 6.2, h: 0.8, fontSize: 13, italic: true, color: '64748B'
        });
    }

    ppt.writeFile({ fileName: `Rapport_Synthese_${getReportFileLabel()}_${DB.config.year || ''}.pptx` });
}
window.exportDatavisPPTXv2 = exportDatavisPPTXv2;
