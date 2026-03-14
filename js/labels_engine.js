// === MODULE: labels_engine ===
// --- ÉTIQUETTES : NOUVELLE INTERFACE (window.openLabelConfig) ---
window.openLabelConfig = function() {
    if (!DB.students || DB.students.length === 0) return showToast("Aucun élève dans la base.", 'error');

    const styleId = 'label-ui-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .lbl-modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(3px); }
            .lbl-modal { background:white; border-radius:12px; width:900px; max-height:95vh; display:flex; flex-direction:column; font-family:'Segoe UI', sans-serif; box-shadow:0 20px 50px rgba(0,0,0,0.3); overflow:hidden; }
            .lbl-header { background:#2c3e50; color:white; padding:15px; text-align:center; }
            .lbl-body { display:flex; flex:1; overflow:hidden; }
            .lbl-sidebar { width:280px; background:#f8f9fa; border-right:1px solid #ddd; padding:15px; display:flex; flex-direction:column; gap:10px; overflow-y:auto; }
            .lbl-content { flex:1; padding:20px; overflow-y:auto; background:white; }
            .mode-tile { padding:10px; border:2px solid #ddd; border-radius:8px; cursor:pointer; text-align:center; transition:all 0.2s; background:white; margin-bottom:5px; }
            .mode-tile:hover { border-color:#bdc3c7; background:#fdfdfd; }
            .mode-tile.active { border-color:#3498db; background:#ebf5fb; box-shadow:0 0 0 2px rgba(52,152,219,0.2); }
            .mode-tile h4 { margin:0 0 2px 0; color:#2c3e50; font-size:0.95rem; }
            .mode-tile p { margin:0; font-size:0.75rem; color:#7f8c8d; }
            .sort-opt { display:flex; align-items:center; gap:10px; padding:8px; border:1px solid #eee; border-radius:6px; cursor:pointer; margin-bottom:5px; font-size:0.9rem; }
            .sort-opt:hover { background:#f9f9f9; }
            .sort-opt.selected { background:#e8f6f3; border-color:#27ae60; color:#27ae60; font-weight:bold; }
            .zone-config { border:1px dashed #bbb; padding:15px; border-radius:8px; margin-bottom:15px; position:relative; }
            .zone-title { position:absolute; top:-10px; left:15px; background:white; padding:0 5px; font-weight:bold; color:#7f8c8d; font-size:0.8rem; }
            .field-grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:5px; }
            .field-check { display:flex; align-items:center; gap:5px; font-size:0.9rem; cursor:pointer; }
            .btn-action { padding:12px 25px; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1rem; transition:background 0.2s; }
            .btn-cancel { background:#95a5a6; color:white; }
            .btn-print { background:#2ecc71; color:white; }
            .btn-print:hover { background:#27ae60; }
        `;
        document.head.appendChild(style);
    }

    let state = {
        mode: 'DNB', sort: 'room', grouping: 'student',
        custom: { hasCutLine: true, cols: 2, rows: 8, zone1: ['anonymat', 'epreuve', 'salle'], zone2: ['nom', 'classe', 'salle'] }
    };

    const overlay = document.createElement('div');
    overlay.className = 'lbl-modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'lbl-modal';
    modal.innerHTML = `
        <div class="lbl-header"><h2 style="margin:0">🖨️ Impression Étiquettes</h2></div>
        <div class="lbl-body">
            <div class="lbl-sidebar">
                <label style="font-weight:bold; color:#34495e; font-size:0.9rem;">1. Format</label>
                <div class="mode-tile active" id="tile-dnb" onclick="uiSetMode('DNB')">
                    <div style="font-size:1.2rem">🇫🇷</div><h4>Officiel DNB</h4><p>Gauche: Anonymat / Droite: Identité</p>
                </div>
                <div class="mode-tile" id="tile-custom" onclick="uiSetMode('CUSTOM')">
                    <div style="font-size:1.2rem">🎨</div><h4>Personnalisé</h4><p>Mise en page libre</p>
                </div>
                <hr style="width:100%; border:0; border-top:1px solid #ddd; margin:10px 0;">
                <label style="font-weight:bold; color:#34495e; font-size:0.9rem;">2. Ordre de tri</label>
                <div class="sort-opt selected" id="sort-room" onclick="uiSetSort('room')"><span>🏫</span> Par Salle</div>
                <div class="sort-opt" id="sort-class" onclick="uiSetSort('class')"><span>🎓</span> Par Classe</div>
                <div class="sort-opt" id="sort-alpha" onclick="uiSetSort('alpha')"><span>🔤</span> Alphabétique</div>
                <hr style="width:100%; border:0; border-top:1px solid #ddd; margin:10px 0;">
                <label style="font-weight:bold; color:#34495e; font-size:0.9rem;">3. Regroupement</label>
                <div class="mode-tile active" id="grp-student" onclick="uiSetGroup('student')">
                    <h4>👤 Par Élève</h4><p>Toutes les matières de l'élève à la suite.</p>
                </div>
                <div class="mode-tile" id="grp-exam" onclick="uiSetGroup('exam')">
                    <h4>📚 Par Épreuve</h4><p>Toute la salle en Maths, puis en Histoire...</p>
                </div>
            </div>
            <div class="lbl-content" id="config-panel"></div>
        </div>
        <div style="padding:15px; background:#f1f2f6; text-align:right; border-top:1px solid #ddd; display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn-action btn-cancel" id="btn-close">Annuler</button>
            <button class="btn-action btn-print" id="btn-generate">Lancer l'impression PDF 🖨️</button>
        </div>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    window.uiSetMode = (m) => {
        state.mode = m;
        document.getElementById('tile-dnb').classList.toggle('active', m === 'DNB');
        document.getElementById('tile-custom').classList.toggle('active', m === 'CUSTOM');
        renderLabelConfigPanel();
    };
    window.uiSetSort = (s) => {
        state.sort = s;
        ['room','class','alpha'].forEach(k => document.getElementById('sort-'+k).classList.toggle('selected', s === k));
    };
    window.uiSetGroup = (g) => {
        state.grouping = g;
        document.getElementById('grp-student').classList.toggle('active', g === 'student');
        document.getElementById('grp-exam').classList.toggle('active', g === 'exam');
    };
    window.uiToggleField = (zone, field) => {
        const arr = state.custom[zone];
        const idx = arr.indexOf(field);
        if (idx > -1) arr.splice(idx, 1); else arr.push(field);
    };
    window.uiRenderFields = (zone) => {
        const fields = [
            {id:'nom', label:'Nom Prénom'}, {id:'classe', label:'Classe'}, {id:'ddn', label:'Date Naissance'},
            {id:'salle', label:'Salle'}, {id:'anonymat', label:'N° Anonymat'}, {id:'epreuve', label:'Épreuve'}, {id:'amenagement', label:'Label Aménagement'}
        ];
        let html = `<div class="field-grid">`;
        fields.forEach(f => {
            const isChecked = state.custom[zone].includes(f.id) ? 'checked' : '';
            html += `<label class="field-check"><input type="checkbox" ${isChecked} onchange="uiToggleField('${zone}', '${f.id}')"> ${f.label}</label>`;
        });
        html += `</div>`;
        return html;
    };

    function renderLabelConfigPanel() {
        const p = document.getElementById('config-panel');
        if (state.mode === 'DNB') {
            p.innerHTML = `<div style="text-align:center; color:#7f8c8d; margin-top:50px;">
                <h3>Configuration DNB</h3><p>Standardisé : Anonymat + Salle (Gauche) / Identité (Droite)</p>
                <div style="margin-top:20px; font-size:0.9rem; background:#eee; padding:10px; border-radius:5px; display:inline-block;">Trait de coupe vertical inclus</div>
            </div>`;
        } else {
            p.innerHTML = `<h3 style="margin-top:0;">⚙️ Personnalisation</h3>
                <div style="display:flex; gap:20px; margin-bottom:20px;">
                    <div><label>Colonnes</label><br><input type="number" value="${state.custom.cols}" min="1" max="5" style="width:60px;" onchange="state.custom.cols=this.value"></div>
                    <div><label>Lignes</label><br><input type="number" value="${state.custom.rows}" min="1" max="20" style="width:60px;" onchange="state.custom.rows=this.value"></div>
                    <div style="flex:1; display:flex; align-items:end;"><label style="cursor:pointer; font-weight:bold; color:#e74c3c;">
                        <input type="checkbox" id="chk-cut" ${state.custom.hasCutLine ? 'checked' : ''}> ✂️ Trait de coupe vertical</label></div>
                </div>
                <div class="zone-config" style="background:#fff3e0;"><span class="zone-title">ZONE 1 (Gauche)</span>${window.uiRenderFields('zone1')}</div>
                <div class="zone-config" style="background:#e8f6f3;"><span class="zone-title">ZONE 2 (Droite)</span>${window.uiRenderFields('zone2')}</div>`;
        }
    }

    document.getElementById('btn-close').onclick = () => {
        document.body.removeChild(overlay);
        delete window.uiSetMode; delete window.uiSetSort; delete window.uiToggleField; delete window.uiSetGroup;
    };
    document.getElementById('btn-generate').onclick = () => {
        const chk = document.getElementById('chk-cut');
        if (chk) state.custom.hasCutLine = chk.checked;
        const finalState = JSON.parse(JSON.stringify(state));
        document.body.removeChild(overlay);
        setTimeout(() => window.generateLabelsEngine(finalState), 100);
    };

    renderLabelConfigPanel();
};

// --- MOTEUR GÉNÉRATION ÉTIQUETTES PDF ---
window.generateLabelsEngine = function(params) {
    if (window.syncDistributionData) window.syncDistributionData();
    if (!window.jspdf) return showToast("Erreur : La librairie jsPDF n'est pas chargée.", 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setProperties({ title: "Etiquettes_DNB.pdf" });

    const items = [];
    const createLabelData = (s, r, e) => ({ student: s, room: r, exam: e, type: 'label' });
    const grouping = params.grouping || 'student';

    if (grouping === 'student') {
        if (params.sort === 'room' && DB.distribution) {
            const rooms = Object.keys(DB.distribution).sort();
            rooms.forEach(r => {
                if (r === "Zone Tampon") return;
                DB.distribution[r].sort((a,b) => a.nom.localeCompare(b.nom)).forEach(s => {
                    DB.exams.forEach(ex => items.push(createLabelData(s, r, ex.name)));
                });
                items.push({ type: 'BREAK' });
            });
        } else {
            let sorted = params.sort === 'class'
                ? [...DB.students].sort((a,b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom))
                : [...DB.students].sort((a,b) => a.nom.localeCompare(b.nom));
            sorted.forEach(s => {
                let room = "---";
                if (DB.distribution) { for (const [rName, list] of Object.entries(DB.distribution)) { if (list.some(st => st.nom === s.nom && st.prenom === s.prenom)) { room = rName; break; } } }
                DB.exams.forEach(ex => items.push(createLabelData(s, room, ex.name)));
            });
        }
    } else if (grouping === 'exam') {
        DB.exams.forEach(exam => {
            if (params.sort === 'room' && DB.distribution) {
                Object.keys(DB.distribution).sort().forEach(r => {
                    if (r === "Zone Tampon") return;
                    DB.distribution[r].sort((a,b) => a.nom.localeCompare(b.nom)).forEach(s => items.push(createLabelData(s, r, exam.name)));
                    items.push({ type: 'BREAK' });
                });
            } else {
                let sorted = params.sort === 'class'
                    ? [...DB.students].sort((a,b) => a.classe.localeCompare(b.classe) || a.nom.localeCompare(b.nom))
                    : [...DB.students].sort((a,b) => a.nom.localeCompare(b.nom));
                sorted.forEach(s => {
                    let room = "---";
                    if (DB.distribution) { for (const [rName, list] of Object.entries(DB.distribution)) { if (list.some(st => st.nom === s.nom && st.prenom === s.prenom)) { room = rName; break; } } }
                    items.push(createLabelData(s, room, exam.name));
                });
            }
            items.push({ type: 'BREAK' });
        });
    }

    if (items.length === 0) return showToast("Rien à générer.", 'warning');

    let nbCols = 2, nbRows = 8;
    if (params.mode === 'CUSTOM') { nbCols = parseInt(params.custom.cols) || 2; nbRows = parseInt(params.custom.rows) || 8; }

    const m = 10, pageW = 210, pageH = 297;
    const boxW = (pageW - (2 * m)) / nbCols;
    const boxH = (pageH - (2 * m)) / nbRows;
    const perPage = nbCols * nbRows;
    let idxPage = 0;

    while(items.length > 0 && items[items.length-1].type === 'BREAK') items.pop();

    items.forEach((item) => {
        if (item.type === 'BREAK') {
            const remainder = idxPage % perPage;
            if (remainder !== 0) idxPage += (perPage - remainder);
            return;
        }
        if (idxPage === 0 || idxPage % perPage === 0) {
            if (idxPage > 0) doc.addPage();
            doc.setDrawColor(200); doc.setLineWidth(0.1);
            doc.line(m-2, m, m, m); doc.line(pageW-m, m, pageW-m+2, m);
            doc.line(m-2, pageH-m, m, pageH-m); doc.line(pageW-m, pageH-m, pageW-m+2, pageH-m);
        }

        const col = idxPage % nbCols;
        const row = Math.floor((idxPage % perPage) / nbCols);
        const x = m + (col * boxW);
        const y = m + (row * boxH);
        const cutX = x + (boxW * 0.5);
        const s = item.student;

        doc.setDrawColor(230); doc.setLineWidth(0.1); doc.rect(x, y, boxW, boxH);
        if (s.tiersTemps || s.tt || (s.labels && s.labels.length > 0)) {
            doc.setFillColor(231, 76, 60); doc.circle(x + boxW - 4, y + 4, 1.5, 'F');
        }

        if (params.mode === 'DNB') {
            doc.setDrawColor(0); doc.setLineWidth(0.2); doc.setLineDash([2, 2], 0);
            doc.line(cutX, y, cutX, y + boxH); doc.setLineDash([]);
            doc.setFontSize(10); doc.setTextColor(150); doc.text("✂", cutX - 1.5, y + boxH - 1);
            const centerXLeft = x + (boxW * 0.25);
            const centerY = y + (boxH / 2);
            doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
            doc.text(s.anonymat || "---", centerXLeft, centerY - 3, {align:'center'});
            doc.setFont("helvetica", "bold"); doc.setFontSize(9);
            doc.text(`Salle : ${item.room}`, centerXLeft, centerY + 2, {align:'center'});
            doc.setFont("helvetica", "normal"); doc.setFontSize(8);
            doc.text(item.exam || "", centerXLeft, y + boxH - 4, {align:'center', maxWidth:(boxW*0.45)});
            const mx = cutX + 3;
            doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
            doc.text(`${s.nom}`.toUpperCase(), mx, y + 7);
            doc.setFont("helvetica", "normal"); doc.text(`${s.prenom}`, mx, y + 12);
            doc.setFontSize(9); doc.text(`Classe: ${s.classe}`, mx, y + 17);
            doc.setFontSize(8); doc.setFont("helvetica", "oblique");
            let examText = item.exam || "";
            if(examText.length > 22) examText = examText.substring(0, 22) + "...";
            doc.text(examText, mx, y + 23);
            doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text(`${s.anonymat || '---'}`, mx, y + boxH - 4);
        } else {
            const cfg = params.custom || {};
            const showCutLine = (cfg.hasCutLine === true);
            if (showCutLine) {
                doc.setDrawColor(0); doc.setLineWidth(0.2); doc.setLineDash([2, 2], 0);
                doc.line(cutX, y, cutX, y + boxH); doc.setLineDash([]);
                doc.setFontSize(10); doc.setTextColor(150); doc.text("✂", cutX - 1.5, y + boxH - 1);
            }
            const drawFields = (list, dx, dy, w) => {
                if (!list) return;
                let cy = dy + 6;
                doc.setTextColor(0);
                list.forEach(f => {
                    let txt="", isBold=false, size=9;
                    if (f==='nom') { txt=`${s.nom} ${s.prenom}`; isBold=true; size=10; }
                    else if (f==='classe') txt=`Classe: ${s.classe}`;
                    else if (f==='ddn') { txt=`Né(e): ${s.ddn||'--'}`; size=8; }
                    else if (f==='salle') { txt=`Salle: ${item.room}`; isBold=true; }
                    else if (f==='anonymat') { txt=s.anonymat||"---"; isBold=true; size=12; }
                    else if (f==='epreuve') { txt=item.exam||""; size=8; doc.setTextColor(100); }
                    if(!txt) return;
                    doc.setFontSize(size); doc.setFont("helvetica", isBold?"bold":"normal");
                    doc.setTextColor(0);
                    doc.text(txt, dx+2, cy, {maxWidth:w-2});
                    cy += (size/3)+3;
                });
            };
            drawFields(cfg.zone1, x, y, boxW*0.5);
            drawFields(cfg.zone2, showCutLine ? cutX+1 : x+(boxW*0.5), y, boxW*0.5-1);
        }
        idxPage++;
    });

    doc.save(`Etiquettes_Copies_${params.mode}.pdf`);
};

// --- TABLEAU DES ÉPREUVES : NOUVELLE VERSION (add/remove) ---
window.renderExamTable = function() {
    const tbody = document.getElementById('examTable');
    if(!tbody) return;
    tbody.innerHTML = '';

    DB.exams.forEach((e, i) => {
        const hasSlots = e.slots && (e.slots.std.length > 1 || e.slots.tt.length > 1);
        const btnStyle = hasSlots ? "background:#27ae60; color:white;" : "background:#95a5a6; color:white;";
        const btnText = hasSlots ? "✅ Découpé" : "✂️ Découper";
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>
            <div style="display:flex; gap:5px; margin-bottom:4px;">
                <input type="text" value="${e.name}"
                       style="font-weight:bold; width:100%; border:1px solid #ccc; padding:4px;"
                       onchange="updateExam(${i},'name',this.value)">
                <button class="btn btn-danger btn-sm" onclick="removeExam(${i})"
                        style="padding:2px 8px; font-size:1rem;" title="Supprimer">🗑️</button>
            </div>
            <button class="btn btn-sm" style="${btnStyle}; font-size:0.75rem; padding:2px 6px; width:100%;"
                    onclick="openSlotConfig(${i})">${btnText}</button>
        </td>
        <td style="vertical-align:top"><input type="date" value="${e.date}" onchange="updateExam(${i},'date',this.value)"></td>
        <td style="vertical-align:top"><input type="time" value="${e.time}" onchange="updateExam(${i},'time',this.value)"></td>
        <td style="vertical-align:top"><input type="time" value="${e.timeTT || e.time}" style="background-color:#fef9e7;" onchange="updateExam(${i},'timeTT',this.value)"></td>
        <td style="vertical-align:top"><input type="number" value="${e.durStd}" style="width:70px; text-align:center" onchange="updateExam(${i},'durStd',this.value)"></td>
        <td style="vertical-align:top; color:var(--tt-color)"><input type="number" value="${e.durTT}" style="width:70px; text-align:center" onchange="updateExam(${i},'durTT',this.value)"></td>`;
        tbody.appendChild(row);
    });

    const addRow = document.createElement('tr');
    addRow.innerHTML = `<td colspan="6" style="text-align:center; background-color:#f8f9fa; padding:10px;">
        <button class="btn btn-success" onclick="addExam()" style="border-style:dashed;">➕ Ajouter une épreuve</button>
    </td>`;
    tbody.appendChild(addRow);
};

window.addExam = function() {
    let defaultDate = DB.exams.length > 0 ? DB.exams[DB.exams.length-1].date : "2026-06-01";
    DB.exams.push({ name: "Nouvelle Épreuve", date: defaultDate, time: "09:00", timeTT: "09:00", durStd: 60, durTT: 80, slots: { std: [], tt: [] } });
    window.renderExamTable();
    if(typeof autoSave === 'function') autoSave();
};

window.removeExam = function(index) {
    const examName = DB.exams[index].name;
    showConfirm(`⚠️ Supprimer l'épreuve "${examName}" ?\n\nAttention : Les données de planning associées peuvent être décalées.`, () => {
        DB.exams.splice(index, 1);
        Object.keys(DB.planning).forEach(key => { if(key.startsWith(index + "_")) delete DB.planning[key]; });
        window.renderExamTable();
        if(typeof autoSave === 'function') autoSave();
    });
};
