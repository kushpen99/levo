import * as fb from './firebase-init.js';
import { attachAuthUI } from './auth.js';
import {
    initDrugHelpers,
    loadDrugs,
    saveDrug,
    deleteDrug,
    generateDrugInfoByAI,
    openDrugEditor
} from './drugHelpers.js';



console.log('[table.js] 0-module evaluated');

initDrugHelpers(fb.db);



// Private, module-level handles populated by initStoriesTable()
let _tableBody   = null;
let _onEdit      = null;

export function initStoriesTable({          // ⬅ exported factory
    tableBody,
    onEditRequested      // callback we’ll get from main.js
  }) {
    console.log('[table.js] 1-initStoriesTable called');

    // expose these DOM refs to the inner helpers:
    _tableBody = tableBody;
    _onEdit    = onEditRequested;

    console.log('[table.js] 1a - tableBody is',
        _tableBody ? 'OK ✔' : 'NULL ✖');
  
    loadStoriesTable();           // initial fetch
  }
  
let allStories = [];
let filteredStories = [];
let filters = { id: '', title: '', type: '', status: '', updatedAt: '' };
let sortState = { col: 'updatedAt', dir: 'desc' }; // Default: newest first

/* ------------------------------ UI -------------------------------- */
const adminUI = document.getElementById('admin-ui');
const welcomeView = document.getElementById('welcome-view');

const storyIdInput = document.getElementById('story-id');
const storyTitleInput = document.getElementById('story-title');
const statusSelect = document.getElementById('story-status');
const typeSelect = document.getElementById('story-type');
const toggleJsonBtn = document.getElementById('toggle-json-btn');
const jsonContainer = document.getElementById('json-container');
const storyJsonArea = document.getElementById('story-json');
const uploadBtn = document.getElementById('upload-btn');
const deleteBtn = document.getElementById('delete-btn');
const previewBtn = document.getElementById('preview-btn');
let createBtn = document.getElementById('create-story-btn');
const createForm = document.getElementById('create-story-form');
const subjectInput = document.getElementById('new-story-subject');
const instrInput = document.getElementById('new-story-instr');
const submitBtn = document.getElementById('new-story-submit');
const spinner = document.getElementById('new-story-spinner');
const newStoryStatus = document.getElementById('new-story-status');

const statusMsg = document.getElementById('status-msg');

const presControls = document.getElementById('presentation-controls');
const presSelect = document.getElementById('presentation-select');
const presArea = document.getElementById('presentation-area');
const presContent = document.getElementById('presentation-content');



/* drugs UI handles */
const drugSelect = document.getElementById('drug-select');
const newDrugBtn = document.getElementById('new-drug-btn');
const drugAiBtn = document.getElementById('drug-ai-btn');
const drugAispinner = document.getElementById('drug-ai-spinner');

const drugEditor = document.getElementById('drug-editor');
const drugAiStatus = document.getElementById('drug-ai-status');
const drugForm = document.getElementById('drug-form');

const drugNameEl = document.getElementById('drug-name');

const drugFamilyExEl = document.getElementById('family-ex');
const drugSubclassExEl = document.getElementById('subclass-ex');
const drugMoAExEl = document.getElementById('mechanism-of-action-ex');
const drugSpectrumExEl = document.getElementById('spectrum-of-coverage-ex');
const drugMajorResExEl = document.getElementById('major-resistance-mechanisms-ex');
const drugPdExEl = document.getElementById('pd-ex');
const drugPkExEl2 = document.getElementById('pk-ex');               // rename local var if needed
const drugToxExEl = document.getElementById('toxicity-ex');

const drugFamilySumEl = document.getElementById('family-sum');
const drugSpectrumSumEl = document.getElementById('spectrum-of-coverage-sum');
const drugPkSumEl = document.getElementById('pk-sum');
const drugToxicitySumEl = document.getElementById('toxicity-sum');



const drugSaveBtn = document.getElementById('drug-save-btn');
const drugDeleteBtn = document.getElementById('drug-delete-btn');
const drugCancelBtn = document.getElementById('drug-cancel-btn');
const drugStatus = document.getElementById('drug-status');


/* ───────── view-state memory ───────── */
let currentMode = null;   // 'graph', 'quiz', 'summary', …
let currentGraphView = 'graphic'; // 'graphic' | 'table'

/* ───────── view-refresh guard ───────── */
let suppressPresentation = false;   // true only while we programmatically
// change the JSON textarea

/* ----------------------------- Auth ------------------------------- */
attachAuthUI({
    signInBtn:   document.getElementById('sign-in-btn'),
    signOutBtn:  document.getElementById('sign-out-btn'),
    welcomeView: document.getElementById('welcome-view'),
    adminUI:     document.getElementById('admin-ui'),
    drugsArea:   document.getElementById('drugs-area'),
    onLogin: () => {
      loadStories();          // functions you still have in main.js
      loadDrugs();
    }
  });

const storiesTableSection = document.getElementById('stories-table-section');
const storiesTableBody = document.querySelector('#stories-table tbody');
const drugsArea = document.getElementById('drugs-area');



/* --------------------- Firestore helpers -------------------------- */
async function loadStories() {
    storyIdInput.innerHTML = '<option value="">-- Select a story --</option>';
    const snap = await fb.getDocs(fb.collection(fb.db, 'stories'));
    snap.forEach(docSnap => {
        const opt = document.createElement('option');
        opt.value = docSnap.id;
        const d = docSnap.data();
        opt.textContent = d.title || d.name || docSnap.id;
        storyIdInput.append(opt);
    });
}


/* --------------------------- UI logic ----------------------------- */
// Track last loaded JSON for unsaved changes detection
let lastLoadedStoryJson = '';
storyIdInput.onchange = async () => {
    const id = storyIdInput.value;
    if (!id) return hidePresentation();
    const snap = await fb.getDoc(fb.doc(fb.db, 'stories', id));
    if (!snap.exists()) return hidePresentation();
    const data = snap.data();
    storyJsonArea.value = orderKeys(data);
    storyJsonArea.dispatchEvent(new Event('input'));   // 🚀 fire redraw

    lastLoadedStoryJson = storyJsonArea.value;
    setupPresentation();
    try {
        const full = JSON.parse(storyJsonArea.value);
        storyTitleInput.value = full.title || '';
        statusSelect.value = full.status || 'Draft';
        typeSelect.value = full.type || '';
        renderCytoscapeGraph(full); // <-- render graph
    } catch {/* ignore if JSON invalid */ }
};

storyJsonArea.oninput = () => {
    if (suppressPresentation) {        // ← skip redraw during quiet updates
        suppressPresentation = false;
        return;
    }
    try {
        JSON.parse(storyJsonArea.value);
    }
    catch { return; }
    setupPresentation();
    try {
        const full = JSON.parse(storyJsonArea.value);
        storyTitleInput.value = full.title || '';
        statusSelect.value = full.status || 'Draft';
        typeSelect.value = full.type || '';
        renderCytoscapeGraph(full); // <-- render graph
    } catch {/* ignore if JSON invalid */ }
};

storyTitleInput.oninput = () => {
    let full;
    try {
        full = JSON.parse(storyJsonArea.value);
    } catch {
        return;
    }
    full.title = storyTitleInput.value;
    storyJsonArea.value = JSON.stringify(full, null, 2);
    setupPresentation();
};

statusSelect.onchange = () => {
    let full;
    try {
        full = JSON.parse(storyJsonArea.value);
    } catch {
        return;
    }
    full.status = statusSelect.value;
    storyJsonArea.value = JSON.stringify(full, null, 2);
    setupPresentation();
};

typeSelect.onchange = () => {
    let full;
    try {
        full = JSON.parse(storyJsonArea.value);
    } catch {
        return;
    }
    full.type = typeSelect.value;
    storyJsonArea.value = JSON.stringify(full, null, 2);
    setupPresentation();
};

toggleJsonBtn.onclick = () => {
    const isNowHidden = jsonContainer.classList.toggle('hidden');
    toggleJsonBtn.textContent = isNowHidden ? 'Show' : 'Hide';
};

/* drugs UI events */
newDrugBtn.onclick = () => openDrugEditor('');
drugAiBtn.onclick = () => generateDrugInfoByAI();
drugSelect.onchange = () => openDrugEditor(drugSelect.value);
drugSaveBtn.onclick = () => saveDrug();
drugDeleteBtn.onclick = () => deleteDrug();
drugCancelBtn.onclick = () => resetDrugEditor();

/* ------------------------ Presentation ---------------------------- */
function setupPresentation() {
    let data;
    try { data = JSON.parse(storyJsonArea.value); } catch { return hidePresentation(); }

    // keep whatever was selected before the re-render
    const prev = currentMode ?? presSelect.value;

    presSelect.innerHTML = '';

    const views = [];
    if (data.drugInfo) views.push(['drugInfo', 'Drug Info']);
    if (data.quiz) views.push(['quiz', 'Quiz']);
    if (data.summary) views.push(['summary', 'Summary']);
    if (!views.length) return hidePresentation();
    views.forEach(([val, label]) => {
        const o = new Option(label, val);
        presSelect.append(o);
    });
    presControls.classList.remove('hidden');
    presArea.classList.remove('hidden');
    presSelect.onchange = renderPresentation;
    // restore previous main view if still available, else default
    presSelect.value = views.some(v => v[0] === prev) ? prev : views[0][0];
    renderPresentation();
}

function renderPresentation() {
    let data;
    try { data = JSON.parse(storyJsonArea.value); } catch { return; }
    presContent.innerHTML = '';
    const mode = presSelect.value;
    currentMode = mode;                 // <-- remember
    if (mode === 'graph') renderGraphView(data);
    else if (mode === 'drugInfo') renderDrugInfo(data);
    else if (mode === 'quiz') renderQuiz(data);
    else if (mode === 'summary') renderSummary(data);
}


/* --------------------- OTHER RENDERERS ------------------------------ */
function renderSummary(data) {
    const ta = document.createElement('textarea');
    ta.className = 'border rounded px-2 py-1 w-full h-32';
    ta.value = (data.summary?.points || []).join('\n');
    ta.oninput = () => { const full = JSON.parse(storyJsonArea.value); full.summary = { points: ta.value.split('\n') }; storyJsonArea.value = JSON.stringify(full, null, 2); };
    presContent.append(ta);
}

function renderQuiz(data) {
    const add = document.createElement('button'); add.textContent = 'Add Question'; add.className = 'mb-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded';
    add.onclick = () => { const full = JSON.parse(storyJsonArea.value); full.quiz = full.quiz || { choices: [] }; full.quiz.choices.push({ id: `Q${full.quiz.choices.length + 1}`, question: '', options: [], correct: '' }); storyJsonArea.value = JSON.stringify(full, null, 2); renderPresentation(); };
    presContent.append(add);
    const table = document.createElement('table'); table.className = 'table-auto w-full border-collapse'; table.innerHTML = `<thead><tr class='bg-gray-50'><th class='border px-2 py-1'>#</th><th class='border px-2 py-1'>ID</th><th class='border px-2 py-1'>Question</th><th class='border px-2 py-1'>Options (comma)</th><th class='border px-2 py-1'>Correct</th><th class='border px-2 py-1'>Remove</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    (data.quiz?.choices || []).forEach((c, i) => {
        const tr = document.createElement('tr');
        tr.append(tdPlain(i + 1));
        tr.append(tdInput(c.id || '', v => update(i, 'id', v)));
        tr.append(tdInput(c.question || '', v => update(i, 'question', v), 'w-64'));
        tr.append(tdInput((c.options || []).join(', '), v => update(i, 'options', v.split(',').map(s => s.trim()).filter(Boolean)), 'w-64'));
        tr.append(tdInput(c.correct || '', v => update(i, 'correct', v)));
        const td = document.createElement('td'); td.className = 'border px-2 py-1 text-center';
        const rm = document.createElement('button'); rm.textContent = '🗑'; rm.onclick = () => { const full = JSON.parse(storyJsonArea.value); full.quiz.choices.splice(i, 1); storyJsonArea.value = JSON.stringify(full, null, 2); renderPresentation(); }; td.append(rm); tr.append(td);
        tbody.append(tr);
    });
    table.append(tbody); presContent.append(table);
    function tdPlain(t) { const td = document.createElement('td'); td.className = 'border px-2 py-1'; td.textContent = t; return td; }
    function tdInput(v, cb, cls = '') { const td = document.createElement('td'); td.className = `border px-2 py-1 ${cls}`; const inp = document.createElement('input'); inp.type = 'text'; inp.value = v; inp.className = 'border rounded px-1 py-0.5 w-full'; inp.oninput = () => cb(inp.value); td.append(inp); return td; }
    function update(i, k, v) { const full = JSON.parse(storyJsonArea.value); full.quiz.choices[i][k] = v; storyJsonArea.value = JSON.stringify(full, null, 2); }
}

function renderDrugInfo(data) {
    const add = document.createElement('button'); add.textContent = 'Add Drug'; add.className = 'mb-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded';
    add.onclick = () => { const full = JSON.parse(storyJsonArea.value); full.drugInfo = full.drugInfo || {}; let n = 1; while (full.drugInfo['Drug' + n]) n++; full.drugInfo['Drug' + n] = { Family: '', PK: '', Spectrum: '', Toxicities: '' }; storyJsonArea.value = JSON.stringify(full, null, 2); renderPresentation(); };
    presContent.append(add);

    const table = document.createElement('table'); table.className = 'table-auto w-full border-collapse'; table.innerHTML = `<thead><tr class='bg-gray-50'><th class='border px-2 py-1'>Name</th><th class='border px-2 py-1'>Family</th><th class='border px-2 py-1'>PK</th><th class='border px-2 py-1'>Spectrum</th><th class='border px-2 py-1'>Toxicities</th><th class='border px-2 py-1'>Remove</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    Object.entries(data.drugInfo || {}).forEach(([name, info]) => {
        const tr = document.createElement('tr');
        tr.append(tdInput(name, v => renameDrug(name, v)));
        ['Family', 'PK', 'Spectrum', 'Toxicities'].forEach(f => tr.append(tdInput(info[f] || '', v => updateDrug(name, f, v))));
        const tdR = document.createElement('td'); tdR.className = 'border px-2 py-1 text-center'; const rm = document.createElement('button'); rm.textContent = '🗑'; rm.onclick = () => { const full = JSON.parse(storyJsonArea.value); delete full.drugInfo[name]; storyJsonArea.value = JSON.stringify(full, null, 2); renderPresentation(); }; tdR.append(rm); tr.append(tdR);
        tbody.append(tr);
    }); table.append(tbody); presContent.append(table);
    function tdInput(v, cb) { const td = document.createElement('td'); td.className = 'border px-2 py-1'; const inp = document.createElement('input'); inp.type = 'text'; inp.value = v; inp.className = 'border rounded px-1 py-0.5 w-full'; inp.oninput = () => cb(inp.value); td.append(inp); return td; }
    function renameDrug(oldN, newN) { if (!newN || oldN === newN) return; const full = JSON.parse(storyJsonArea.value); if (full.drugInfo[newN]) return; full.drugInfo[newN] = { ...full.drugInfo[oldN] }; delete full.drugInfo[oldN]; storyJsonArea.value = JSON.stringify(full, null, 2); renderPresentation(); }
    function updateDrug(n, f, val) { const full = JSON.parse(storyJsonArea.value); full.drugInfo[n][f] = val; storyJsonArea.value = JSON.stringify(full, null, 2); }
}

/* ------------------------- UTILITIES ------------------------------- */
function orderKeys(data) {
    // ---------- top-level ----------
    const topOrder = ['title', 'status', 'createdAt', 'updatedAt',
        'scenarios', 'drugInfo', 'summary', 'quiz'];

    const result = {};
    topOrder.forEach(k => { if (data[k] !== undefined) result[k] = data[k]; });
    Object.keys(data).forEach(k => { if (!result.hasOwnProperty(k)) result[k] = data[k]; });

    // ---------- per-scenario ----------
    if (result.scenarios) {
        const sorted = {};
        Object.keys(result.scenarios)
            .sort((a, b) => a.localeCompare(b))
            .forEach(id => {
                sorted[id] = result.scenarios[id];
            });

        const reorderedScenarios = {};
        Object.entries(sorted).forEach(([id, sc]) => {
            reorderedScenarios[id] = orderScenarioFields(sc);
        });
        result.scenarios = reorderedScenarios;
    }

    return JSON.stringify(result, null, 2);
}


// Re-orders one scenario object →  { name, text, options, …rest }
function orderScenarioFields(sc) {
    const ordered = {};
    ['name', 'text', 'options'].forEach(k => {
        if (sc[k] !== undefined) ordered[k] = sc[k];
    });
    Object.keys(sc).forEach(k => {
        if (!ordered.hasOwnProperty(k)) ordered[k] = sc[k];
    });

    // ----- inside the options array -----
    if (Array.isArray(ordered.options)) {
        ordered.options = ordered.options.map(orderOptionFields);
    }

    return ordered;
}


// Re-orders one option object → { text, id, …rest }
function orderOptionFields(opt) {
    const ordered = {};
    ['text', 'id'].forEach(k => {
        if (opt[k] !== undefined) ordered[k] = opt[k];
    });
    Object.keys(opt).forEach(k => {
        if (!ordered.hasOwnProperty(k)) ordered[k] = opt[k];
    });
    return ordered;
}


function hidePresentation() { presControls.classList.add('hidden'); presArea.classList.add('hidden'); presContent.innerHTML = ''; }
function showStatus(msg, cls = '') { statusMsg.textContent = msg; statusMsg.className = cls; }

/* ------------------------- SAVE ----------------------------------- */
uploadBtn.onclick = async () => {
    const id = storyIdInput.value.trim(); const raw = storyJsonArea.value;
    if (!id || !raw) return showStatus('Story ID and JSON required.', 'text-red-600');
    let obj; try { obj = JSON.parse(raw); } catch { return showStatus('Invalid JSON.', 'text-red-600'); }
    const ref = fb.doc(fb.db, 'stories', id); 
    const snap = await fb.getDoc(ref);
    const save = { ...obj, updatedAt: fb.serverTimestamp(), createdAt: snap.exists() ? snap.data().createdAt : fb.serverTimestamp(), type: typeSelect.value };
    await fb.setDoc(ref, save);
    showStatus(`Story "${id}" saved.`, 'text-green-600'); 
    loadStories();
};
/* ------------------------- DELETE ----------------------------------- */
// ---------- Delete Story ----------
deleteBtn.onclick = async () => {
    const id = storyIdInput.value.trim();
    if (!id) {
        alert('Please select a story first.');
        return;
    }

    // 1) Confirm with the user
    const sure = confirm(`Delete story "${id}" permanently?`);
    if (!sure) return;

    try {
        // 2) Remove from Firestore
        await fb.deleteDoc(fb.doc(fb.db, 'stories', id));

        // 3) Update UI + feedback
        showStatus(`Story "${id}" deleted.`, 'text-green-600');

        // Clear form
        storyIdInput.value = '';
        storyJsonArea.value = '';

        // Hide presentation pane
        hidePresentation();

        // Refresh the drop-down list
        loadStories();
    } catch (e) {
        showStatus(e.message, 'text-red-600');
    }
};

/* ----------------------- PREVIEW STORY -------------------------------------*/

previewBtn.onclick = () => {
    const rawJson = storyJsonArea.value.trim();
    if (!rawJson) {
        alert('Nothing to preview – please load or create a story JSON first.');
        return;
    }
    // URL-encode and open in new tab
    const encoded = encodeURIComponent(rawJson);
    const previewUrl = `story.html?preview=1&data=${encoded}`;
    window.open(previewUrl, '_blank');
};

/* ------------------------- CREATE STORY ----------------------------------- */

// 1. Toggle the form when "Create New Story" is clicked
createBtn = document.getElementById('create-story-btn');
const createStoryOptions = document.getElementById('create-story-options');
const createFromScratchBtn = document.getElementById('create-from-scratch');
const createWithAiBtn = document.getElementById('create-with-ai');
const createStoryModal = document.getElementById('create-story-modal');
const aiStorySubject = document.getElementById('ai-story-subject');
const aiStoryInstr = document.getElementById('ai-story-instr');
const aiStorySubmit = document.getElementById('ai-story-submit');
const aiStoryCancel = document.getElementById('ai-story-cancel');
const aiStorySpinner = document.getElementById('ai-story-spinner');
const aiStoryStatus = document.getElementById('ai-story-status');

createBtn.onclick = () => {
    createStoryOptions.classList.toggle('hidden');
};

createFromScratchBtn.onclick = () => {
    createStoryOptions.classList.add('hidden');
    welcomeView.classList.add('hidden');
    adminUI.classList.remove('hidden');
    drugsArea.classList.remove('hidden');
  
    /* -------------- build blank skeleton -------------- */
    const now  = new Date();
    const ts   = { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 };
  
    const scratchJson = {
      title   : '',
      status  : 'draft',
      createdAt: ts,
      updatedAt: ts,
      scenarios: {
        OPT0: {
          name: 'Intro',
          text: '',
          options: [],
          pathResult: 'undetermined'
        }
      },
      summary: { points: [] },
      quiz   : { choices: [] },
      type   : 'Antibiotics&Bugs'
    };
  
    /* -------------- STEP 1 ­– replace textarea -------------- */
    storyJsonArea.value = JSON.stringify(scratchJson, null, 2);
  
    /* -------------- STEP 2 ­– broadcast change -------------- */
    storyJsonArea.dispatchEvent(new Event('input', { bubbles: true }));
  
    /* -------------- STEP 3 ­– wipe the previous graph -------------- */
    if (window.cy) {
      window.cy.destroy();          // removes old Cytoscape instance
      window.cy = null;
    }
  
    /* -------------- draw the blank graph once -------------- */
    renderCytoscapeGraph(scratchJson);
  
    /* sync the “Story ID / Title / Type” small fields */
    storyIdInput.value    = '';
    storyTitleInput.value = '';
    typeSelect.value      = 'Antibiotics&Bugs';
  };
  
createWithAiBtn.onclick = () => {
    createStoryOptions.classList.add('hidden');
    createStoryModal.classList.remove('hidden');
    aiStorySubject.value = '';
    aiStoryInstr.value = '';
    aiStoryStatus.textContent = '';
};
aiStoryCancel.onclick = () => {
    createStoryModal.classList.add('hidden');
};
aiStorySubmit.onclick = async () => {
    aiStoryStatus.textContent = '';
    aiStorySpinner.classList.remove('hidden');
    aiStorySubmit.disabled = true;
    // Fetch the first published story as example
    const snap = await fb.getDocs(fb.collection(fb.db, 'stories'));
    let exampleJson = '';
    snap.forEach(docSnap => {
        const d = docSnap.data();
        if (!exampleJson && d.status === 'published') {
            exampleJson = JSON.stringify(d, null, 2);
        }
    });
    if (!exampleJson) {
        aiStoryStatus.textContent = 'No published story found for example.';
        aiStorySpinner.classList.add('hidden');
        aiStorySubmit.disabled = false;
        return;
    }
    const subject = aiStorySubject.value.trim();
    const instr = aiStoryInstr.value.trim();
    const prompt = `You are an assistant that generates interactive case-study stories for medical students, helping them learn the correct treatment pathways.\nThese stories are represented as JSON following our established schema. Here is an example of an existing story (for reference):\n\n\\n${exampleJson}\n\\n\nUsing this schema:\n1. **Top-level keys** in order:\n   - title (string)\n   - status (string - initial value: draft)\n   - createdAt, updatedAt (timestamp objects)\n   - scenarios (object of scenario-objects)\n   - summary (object with a \"points\" array)\n   - quiz (object with a \"choices\" array)\n2. **Each scenario** must have keys in this order:\n   - name (string)\n   - text (string)\n   - pathResult (string. one of the values: undetermined, success, failure)\n   - options (array of option-objects)\n3. **Each option** must have:\n   - text (string)\n   - id (string matching one of the scenario keys)\n   - drugName(string, the name of the chosen drug if this option represents a drug choice, starts with a capital letter)\n5. **Mermaid compliance**:\n   - Scenario IDs become graph node IDs.\n   - Option texts must be short, single-line labels without unsupported Unicode.\n** There always must be an OPT0 scenario which is the starting point**\n** Scenario with pathResult=success must always have an empty options array**\n** Scenario with pathResult=failure must always have one option with the text Back which is getting the user back to the scenario he came from**\n---\n**Now** create a **brand new interactive case-study story JSON** with:\n- **Title** based on: Subject: ${subject} and on Additional instructions (if any): ${instr || 'none'}\n\nOutput **only** the new story's JSON, ready for Mermaid rendering.`;
    try {
        
        const res = await fetch(chatEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        const raw = await res.text();
        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            throw new Error(`Invalid JSON response:\n${raw}`);
        }
        if (!res.ok) {
            const msg = data.error || JSON.stringify(data);
            throw new Error(`API error ${res.status}: ${msg}\n${data.stack || ''}`);
        }
        let reply = data.reply;
        let cleaned = reply.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```$/, '');
        }
        // Open main panel and fill fields
        createStoryModal.classList.add('hidden');
        welcomeView.classList.add('hidden');
        adminUI.classList.remove('hidden');
        drugsArea.classList.remove('hidden');
        storyJsonArea.value = cleaned;
        try {
            const newStory = JSON.parse(cleaned);
            const title = newStory.title || '';
            const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
            storyIdInput.value = slug;
            storyTitleInput.value = newStory.title || '';
            statusSelect.value = newStory.status || 'draft';
            typeSelect.value = newStory.type || '';
        } catch {}
        setupPresentation();
    } catch (e) {
        aiStoryStatus.textContent = `Error: ${e.message}`;
    } finally {
        aiStorySpinner.classList.add('hidden');
        aiStorySubmit.disabled = false;
    }
};

// Function to load stories into the table
async function loadStoriesTable() {
    console.log('[table.js] 2-loadStoriesTable → Firestore');

    try {
        _tableBody.innerHTML = '';        // will crash if _tableBody === null
      } catch (e) {
        console.error('[table.js] 2-FATAL: _tableBody is null', e);
        throw e;                           // stop here—no point continuing
      }
    
      try {
        const snap = await fb.getDocs(fb.collection(fb.db, 'stories'));
        console.log('[table.js] 2a - got', snap.size, 'docs');
      } catch (e) {
        console.error('[table.js] 2-FATAL Firestore read failed', e);
        throw e;
      }

    _tableBody.innerHTML = '';
    allStories = [];
    const snap = await fb.getDocs(fb.collection(fb.db, 'stories'));
    snap.forEach(docSnap => {
        const d = docSnap.data();
        // Format updatedAt as human-friendly string
        let updatedAtDisplay = '';
        if (d.updatedAt && typeof d.updatedAt === 'object' && d.updatedAt.seconds) {
            const date = new Date(d.updatedAt.seconds * 1000);
            updatedAtDisplay = date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        allStories.push({
            id: docSnap.id,
            title: d.title || '',
            type: d.type || '',
            status: d.status || '',
            updatedAt: d.updatedAt?.seconds || 0,
            updatedAtDisplay
        });
    });
    updateStoriesTable();
    
    // Initialize sort icons after table is loaded
    renderSortIcons();

    console.log('[table.js] 2z - updateStoriesTable about to run');

}

// --- Utility: get unique values for a column ---
function getUniqueValues(arr, key) {
    if (key === 'updatedAt') {
        // Use human-friendly date for filter dropdown
        const vals = arr.map(s => s.updatedAtDisplay || '').filter(Boolean);
        return Array.from(new Set(vals)).sort();
    }
    const vals = arr.map(s => s[key] || '').filter(Boolean);
    return Array.from(new Set(vals)).sort();
}

// --- Render filter dropdowns ---
function renderFilterDropdowns() {
    ['id', 'title', 'type', 'status', 'updatedAt'].forEach(col => {
        const dropdown = document.querySelector(`.filter-dropdown[data-filter="${col}"]`);
        if (!dropdown) return;
        dropdown.innerHTML = '';
        dropdown.className = 'filter-dropdown relative';
        const btn = document.createElement('button');
        btn.className = 'bg-white border border-gray-300 rounded px-2 py-1 text-xs hover:bg-gray-100 w-full text-left';
        btn.textContent = filters[col] ? `Filter: ${filters[col]}` : 'Filter';
        btn.onclick = e => {
            e.stopPropagation();
            showDropdownMenu(col, dropdown, btn);
        };
        dropdown.appendChild(btn);
    });
}

function showDropdownMenu(col, dropdown, btn) {
    // Remove any existing menu
    document.querySelectorAll('.filter-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'filter-menu absolute left-0 mt-1 bg-white border border-gray-300 rounded shadow z-50 w-40 max-h-60 overflow-auto';
    const opts = getUniqueValues(allStories, col);
    // 'Clear' option
    const clear = document.createElement('div');
    clear.className = 'px-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-500';
    clear.textContent = 'Clear filter';
    clear.onclick = () => { filters[col] = ''; updateStoriesTable(); menu.remove(); };
    menu.appendChild(clear);
    opts.forEach(val => {
        const opt = document.createElement('div');
        opt.className = 'px-3 py-2 hover:bg-blue-100 cursor-pointer';
        opt.textContent = val;
        opt.onclick = () => { filters[col] = val; updateStoriesTable(); menu.remove(); };
        menu.appendChild(opt);
    });
    // Position below button
    dropdown.appendChild(menu);
    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', function handler(e) {
            if (!menu.contains(e.target) && e.target !== btn) {
                menu.remove();
                document.removeEventListener('click', handler);
            }
        });
    }, 10);
}

// --- Sorting ---
function renderSortIcons() {
    ['id', 'title', 'type', 'status', 'updatedAt'].forEach(col => {
        const th = document.querySelector(`th[data-col="${col}"]`);
        const icon = th.querySelector('.sort-icon');
        if (sortState.col === col) {
            icon.innerHTML = sortState.dir === 'asc' ? '▲' : (sortState.dir === 'desc' ? '▼' : '↕');
            icon.className = 'sort-icon inline-block ml-1 text-xs text-blue-600';
        } else {
            icon.innerHTML = '↕';
            icon.className = 'sort-icon inline-block ml-1 text-xs text-gray-400';
        }
    });
}

function handleSort(col) {
    if (sortState.col === col) {
        if (sortState.dir === 'asc') sortState.dir = 'desc';
        else if (sortState.dir === 'desc') sortState.dir = '';
        else sortState.dir = 'asc';
    } else {
        sortState.col = col;
        sortState.dir = 'asc';
    }
    updateStoriesTable();
}

// --- Main table update ---
function updateStoriesTable() {
    console.log('[table.js] 3-updateStoriesTable filters=',
        JSON.stringify(filters), 'sort=', JSON.stringify(sortState));

    // 1. Filter
    filteredStories = allStories.filter(story => {
        return (!filters.id || story.id === filters.id)
            && (!filters.title || story.title === filters.title)
            && (!filters.type || story.type === filters.type)
            && (!filters.status || story.status === filters.status)
            && (!filters.updatedAt || story.updatedAtDisplay === filters.updatedAt);
    });
    // 2. Sort
    if (sortState.col && sortState.dir) {
        filteredStories.sort((a, b) => {
            let vA = a[sortState.col] || '';
            let vB = b[sortState.col] || '';
            // For updatedAt, sort numerically
            if (sortState.col === 'updatedAt') {
                vA = a.updatedAt;
                vB = b.updatedAt;
                return sortState.dir === 'asc' ? vA - vB : vB - vA;
            }
            vA = (vA || '').toString().toLowerCase();
            vB = (vB || '').toString().toLowerCase();
            if (vA < vB) return sortState.dir === 'asc' ? -1 : 1;
            if (vA > vB) return sortState.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    console.log('[table.js] 3a - after filter:', filteredStories.length);

    // 3. Render rows
    _tableBody.innerHTML = '';
    filteredStories.forEach(story => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="border px-2 py-1">${story.id}</td><td class="border px-2 py-1">${story.title || ''}</td><td class="border px-2 py-1">${story.type || ''}</td><td class="border px-2 py-1">${story.status || ''}</td><td class=\"border px-2 py-1 whitespace-nowrap\">${story.updatedAtDisplay || ''}</td>`;
        const editTd = document.createElement('td');
        editTd.className = 'border px-4 py-2 text-center';
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded';
        editBtn.addEventListener('click', () => {
            _onEdit(story.id);
        });
        editTd.appendChild(editBtn);
        tr.appendChild(editTd);
        _tableBody.appendChild(tr);
    });

    console.log('[table.js] 3z - rendered', filteredStories.length, 'rows');

    renderFilterDropdowns();
    renderSortIcons();
}

/* ------------------------------------------------------------------ */
/*  Export a helper for main.js to attach the <th> sort listeners     */
/* ------------------------------------------------------------------ */
export function attachHeaderSort(thEls) {
    thEls.forEach(th => {
      th.addEventListener('click', e => {
        if (e.target.closest('.filter-dropdown')) return; // ignore filter clicks
        handleSort(th.getAttribute('data-col'));
      });
    });
  }
  