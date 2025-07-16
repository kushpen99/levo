import * as fb from './firebase-init.js';
import { attachAuthUI } from './auth.js';
import { getUserSetting, isUserLoggedIn } from './userService.js';
import {
    initDrugHelpers,
    loadDrugs,
    saveDrug,
    deleteDrug,
    generateDrugInfoByAI,
    openDrugEditor
} from './drugHelpers.js';
import { renderMarkupToHtmlString } from './codeTagUtils.js';



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
const languageSelect = document.getElementById('story-language');
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

/**
 * Load available languages into the story language dropdown
 */
async function loadStoryLanguages() {
    try {
        languageSelect.innerHTML = '<option value="">Loading languages...</option>';
        
        const languagesQuery = fb.query(fb.collection(fb.db, 'languages'), fb.where('isActive', '==', true));
        const snapshot = await fb.getDocs(languagesQuery);
        
        languageSelect.innerHTML = '';
        
        snapshot.forEach(doc => {
            const languageData = doc.data();
            const option = document.createElement('option');
            option.value = languageData.code;
            option.textContent = languageData.name;
            languageSelect.appendChild(option);
        });
        
        // Set default language to user's preference
        const userLanguage = getUserSetting('language', 'en');
        if (userLanguage) {
            languageSelect.value = userLanguage;
        }
        
        console.log('[table.js] Languages loaded for story creation, default set to:', userLanguage);
    } catch (error) {
        console.error('[table.js] Error loading languages:', error);
        languageSelect.innerHTML = '<option value="en">English</option>';
    }
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
        
        // Load languages and set the language field
        await loadStoryLanguages();
        languageSelect.value = full.language || 'en';

        if (window.cy) {
            const running = window.cy.layouting && window.cy.layouting();
            if (running) running.stop();
            window.cy.destroy();
            window.cy = null;
        }
          
        views.redrawAll();
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
        views.redrawAll();
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

languageSelect.onchange = () => {
    let full;
    try {
        full = JSON.parse(storyJsonArea.value);
    } catch {
        return;
    }
    full.language = languageSelect.value || 'en';
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

    // Always show presentation area if quiz or summary exists
    const hasQuiz = !!data.quiz;
    const hasSummary = !!data.summary;
    
    if (!hasQuiz && !hasSummary) return hidePresentation();
    
    // Always show the presentation area (no dropdown needed)
    presArea.classList.remove('hidden');
    renderPresentation();
}

function renderPresentation() {
    let data;
    try { data = JSON.parse(storyJsonArea.value); } catch { return; }
    presContent.innerHTML = '';
    
    // Create buttons to add quiz/summary if they don't exist
    const addButtonsContainer = document.createElement('div');
    addButtonsContainer.className = 'mb-6 flex space-x-4';
    
    if (!data.quiz) {
        const addQuizBtn = document.createElement('button');
        addQuizBtn.textContent = '+ Add Quiz';
        addQuizBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded';
        addQuizBtn.onclick = () => {
            const full = JSON.parse(storyJsonArea.value);
            full.quiz = { choices: [] };
            storyJsonArea.value = JSON.stringify(full, null, 2);
            renderPresentation();
        };
        addButtonsContainer.appendChild(addQuizBtn);
    }
    
    if (!data.summary) {
        const addSummaryBtn = document.createElement('button');
        addSummaryBtn.textContent = '+ Add Summary';
        addSummaryBtn.className = 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded';
        addSummaryBtn.onclick = () => {
            const full = JSON.parse(storyJsonArea.value);
            full.summary = { points: [] };
            storyJsonArea.value = JSON.stringify(full, null, 2);
            renderPresentation();
        };
        addButtonsContainer.appendChild(addSummaryBtn);
    }
    
    if (addButtonsContainer.children.length > 0) {
        presContent.appendChild(addButtonsContainer);
    }
    
    // Always render both quiz and summary editors if they exist
    if (data.quiz) {
        const quizSection = document.createElement('div');
        quizSection.className = 'mb-8';
        
        const quizTitle = document.createElement('h3');
        quizTitle.className = 'text-lg font-semibold mb-4 text-blue-600';
        quizTitle.textContent = 'Quiz Editor';
        quizSection.appendChild(quizTitle);
        
        // Render each quiz question and its choices with code tag support
        (data.quiz.choices || []).forEach(q => {
            const qDiv = document.createElement('div');
            qDiv.className = 'quiz-question mb-2 p-2 bg-blue-50 rounded';
            qDiv.innerHTML = `<strong>Q:</strong> ${renderMarkupToHtmlString(q.question || '')}`;
            if (q.options && Array.isArray(q.options)) {
                const ul = document.createElement('ul');
                ul.className = 'quiz-options list-disc pl-6';
                q.options.forEach(opt => {
                    const li = document.createElement('li');
                    li.innerHTML = renderMarkupToHtmlString(opt);
                    ul.appendChild(li);
                });
                qDiv.appendChild(ul);
            }
            quizSection.appendChild(qDiv);
        });
        presContent.appendChild(quizSection);
    }
    
    if (data.summary) {
        const summarySection = document.createElement('div');
        summarySection.className = 'mb-8';
        
        const summaryTitle = document.createElement('h3');
        summaryTitle.className = 'text-lg font-semibold mb-4 text-green-600';
        summaryTitle.textContent = 'Summary Editor';
        summarySection.appendChild(summaryTitle);
        
        // Render each summary point with code tag support
        (data.summary.points || []).forEach(point => {
            const div = document.createElement('div');
            div.className = 'summary-point mb-2 p-2 bg-gray-100 rounded';
            div.innerHTML = renderMarkupToHtmlString(point);
            summarySection.appendChild(div);
        });
        presContent.appendChild(summarySection);
    }
    // Render scenario texts with code tag support
    if (data.scenarios) {
        Object.entries(data.scenarios).forEach(([sid, sc]) => {
            if (sc.text) {
                const div = document.createElement('div');
                div.className = 'scenario-text-preview my-2 p-2 bg-gray-50 rounded';
                div.innerHTML = renderMarkupToHtmlString(sc.text);
                presContent.appendChild(div);
            }
        });
    }
}


/* --------------------- OTHER RENDERERS ------------------------------ */
function renderSummary(data, container = presContent) {
    // Render each summary point with code tag support
    (data.summary?.points || []).forEach(point => {
        const div = document.createElement('div');
        div.className = 'summary-point mb-2 p-2 bg-gray-100 rounded';
        div.innerHTML = renderMarkupToHtmlString(point);
        container.appendChild(div);
    });
}

function renderQuiz(data, container = presContent) {
    const add = document.createElement('button'); add.textContent = 'Add Question'; add.className = 'mb-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded';
    add.onclick = () => { const full = JSON.parse(storyJsonArea.value); full.quiz = full.quiz || { choices: [] }; full.quiz.choices.push({ id: `Q${full.quiz.choices.length + 1}`, question: '', options: [], correct: '' }); storyJsonArea.value = JSON.stringify(full, null, 2); renderPresentation(); };
    container.append(add);
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
    table.append(tbody); container.append(table);
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
    const topOrder = ['title', 'status', 'language', 'createdAt', 'updatedAt',
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

// Status message elements
const statusMsgTop = document.getElementById('status-msg-top');
const statusMsgBottom = document.getElementById('status-msg-bottom');

function showStatusTop(msg, cls = '') { 
    statusMsgTop.textContent = msg; 
    statusMsgTop.className = cls; 
    // Clear bottom status
    statusMsgBottom.textContent = '';
    statusMsgBottom.className = '';
}

function showStatusBottom(msg, cls = '') { 
    statusMsgBottom.textContent = msg; 
    statusMsgBottom.className = cls; 
    // Clear top status
    statusMsgTop.textContent = '';
    statusMsgTop.className = '';
}

// Keep the old function for backward compatibility
function showStatus(msg, cls = '') { 
    // Default to showing in top status
    showStatusTop(msg, cls); 
}

/* ------------------------- SAVE ----------------------------------- */
// Note: Original buttons removed, using top and bottom buttons instead

/* ------------------------- DELETE ----------------------------------- */
// Note: Original buttons removed, using top and bottom buttons instead

/* ----------------------- PREVIEW STORY -------------------------------------*/
// Note: Original buttons removed, using top and bottom buttons instead

/* ----------------------- DUPLICATE BUTTON HANDLERS -------------------------------------*/

// Top buttons
const uploadBtnTop = document.getElementById('upload-btn-top');
const deleteBtnTop = document.getElementById('delete-btn-top');
const previewBtnTop = document.getElementById('preview-btn-top');

// Bottom buttons
const uploadBtnBottom = document.getElementById('upload-btn-bottom');
const deleteBtnBottom = document.getElementById('delete-btn-bottom');
const previewBtnBottom = document.getElementById('preview-btn-bottom');

// Top button handlers
uploadBtnTop.onclick = async () => {
    const id = storyIdInput.value.trim(); const raw = storyJsonArea.value;
    if (!id || !raw) return showStatusTop('Story ID and JSON required.', 'text-red-600');
    let obj; try { obj = JSON.parse(raw); } catch { return showStatusTop('Invalid JSON.', 'text-red-600'); }
    const ref = fb.doc(fb.db, 'stories', id); 
    const snap = await fb.getDoc(ref);
    const save = { 
        ...obj, 
        language: languageSelect.value || 'en',
        updatedAt: fb.serverTimestamp(), 
        createdAt: snap.exists() ? snap.data().createdAt : fb.serverTimestamp(), 
        type: typeSelect.value 
    };
    await fb.setDoc(ref, save);
    showStatusTop(`Story "${id}" saved.`, 'text-green-600'); 
    loadStories();
};

deleteBtnTop.onclick = async () => {
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
        showStatusTop(`Story "${id}" deleted.`, 'text-green-600');

        // Clear form
        storyIdInput.value = '';
        storyJsonArea.value = '';

        // Hide presentation pane
        hidePresentation();

        // Refresh the drop-down list
        loadStories();
    } catch (e) {
        showStatusTop(e.message, 'text-red-600');
    }
};

// --- Preview Top Button ---
previewBtnTop.onclick = () => {
    const rawJson = storyJsonArea.value.trim();
    if (!rawJson) {
        alert('Nothing to preview – please load or create a story JSON first.');
        return;
    }
    // Store in localStorage and open preview (fixes HTTP 431 error with Hebrew text)
    localStorage.setItem('preview-story-data', rawJson);
    const previewUrl = `story.html?preview=1`;
    window.open(previewUrl, '_blank');
};

// Bottom button handlers
uploadBtnBottom.onclick = async () => {
    const id = storyIdInput.value.trim(); const raw = storyJsonArea.value;
    if (!id || !raw) return showStatusBottom('Story ID and JSON required.', 'text-red-600');
    let obj; try { obj = JSON.parse(raw); } catch { return showStatusBottom('Invalid JSON.', 'text-red-600'); }
    const ref = fb.doc(fb.db, 'stories', id); 
    const snap = await fb.getDoc(ref);
    const save = { 
        ...obj, 
        language: languageSelect.value || 'en',
        updatedAt: fb.serverTimestamp(), 
        createdAt: snap.exists() ? snap.data().createdAt : fb.serverTimestamp(), 
        type: typeSelect.value 
    };
    await fb.setDoc(ref, save);
    showStatusBottom(`Story "${id}" saved.`, 'text-green-600'); 
    loadStories();
};

deleteBtnBottom.onclick = async () => {
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
        showStatusBottom(`Story "${id}" deleted.`, 'text-green-600');

        // Clear form
        storyIdInput.value = '';
        storyJsonArea.value = '';

        // Hide presentation pane
        hidePresentation();

        // Refresh the drop-down list
        loadStories();
    } catch (e) {
        showStatusBottom(e.message, 'text-red-600');
    }
};

// --- Preview Bottom Button ---
previewBtnBottom.onclick = () => {
    const rawJson = storyJsonArea.value.trim();
    if (!rawJson) {
        alert('Nothing to preview – please load or create a story JSON first.');
        return;
    }
    // Store in localStorage and open preview (fixes HTTP 431 error with Hebrew text)
    localStorage.setItem('preview-story-data', rawJson);
    const previewUrl = `story.html?preview=1`;
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

createFromScratchBtn.onclick = async () => {
    createStoryOptions.classList.add('hidden');
    welcomeView.classList.add('hidden');
    adminUI.classList.remove('hidden');
    drugsArea.classList.remove('hidden');
  
    // Load languages and set default
    await loadStoryLanguages();
  
    /* -------------- build blank skeleton -------------- */
    const now  = new Date();
    const ts   = { seconds: Math.floor(now.getTime() / 1000), nanoseconds: 0 };
  
    const scratchJson = {
      title   : '',
      status  : 'draft',
      language: languageSelect.value || 'en',
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
        const running = window.cy.layouting && window.cy.layouting(); // v 2.x
        if (running) running.stop();          // abort animation / promise
        window.cy.destroy();          // removes old Cytoscape instance
        window.cy = null;
    }
  
    /* -------------- draw the blank graph once -------------- */
    views.redrawAll();
  
    /* sync the "Story ID / Title / Type" small fields */
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
    
   
    const subject = aiStorySubject.value.trim();
    const instr = aiStoryInstr.value.trim();
    const language = document.getElementById('ai-story-language').value || 'en';
    
    // Prompt injection variables – Hebrew Grade 6 Fractions lesson
const expertField = subject;
const narrativeStyle = "mentor-apprentice";
const tone = "supportive but challenging";

const learningObjectivesJSON = [
  "להכיר את מושג המשתנה",
  "להגדיר משתנה ולהשתמש בו בקוד"
];

const commonMisconceptionsJSON = [
  "סדר לא נכון בשימוש באופרטור השמה. משתנה מימין"
];

const mustIncludePointsJSON = [
  "חישוב האופרנד הימני לפני ההשמה",
  "הדפסת משתנה",
  "השמת משתנה למשתנה"
];

    const prompt = `You are an assistant that generates interactive, branching case-study stories for students across domains. All information must be rigorously accurate—if the conclusions in a story prove wrong or misleading, the student (already struggling to meet the institute’s minimum requirements) is likely to fail the upcoming exam and be expelled.

You are an acknowledged expert in ${expertField}.

Language: ${language}. All learner-visible text (scenario names, texts, options, feedback, summary, quiz) must be in this language and respect its writing direction.

Narrative style: ${narrativeStyle || 'mentor-apprentice'}.
Tone: ${tone || 'supportive but challenging'}.

Learning objectives (array): ${learningObjectivesJSON}.
Common misconceptions to surface: ${commonMisconceptionsJSON}.
Must-include summary points: ${mustIncludePointsJSON}.

Math & Code Markup (RTL Safety)
--------------------------------
If the target language is right-to-left (Hebrew, Arabic, etc.):

• Wrap every inline mathematical expression in <math-inline>…</math-inline>.
• Wrap display / multi-line math in <math-block>…</math-block>.
• Wrap every inline code fragment in <code-inline lang="LANG">…</code-inline> where LANG is a short code such as "js", "py", "sql"; use "text" if unknown.
• Wrap multi-line / display code in <code-block lang="LANG">…</code-block>. Put a newline immediately after the opening tag and before the closing tag (represented as \n in JSON strings) so indentation is preserved.
• Do NOT use Markdown backticks inside JSON strings.
• Escape double quotes and backslashes as required to maintain valid JSON.
• The renderer will convert these wrappers into proper LTR <span> / <pre><code> elements with syntax highlighting; do not insert additional HTML attributes.

Engagement & Reflection Rules
-----------------------------
• In decision scenarios, include a “Pause & predict” reflection cue marked by the literal token <<reflect>>.
• The UI will collect a brief student prediction before enabling options (may be skipped; logged).
• Provide 2–4 options per decision scenario: 1 best action, ≥1 plausible but incomplete action, ≥1 misconception reflecting common student errors.
• In the resulting scenario.text after a choice: first 1–2 sentences = outcome feedback; next 1–3 sentences = teaching point; final sentence = forward hook / next challenge.

GLOBAL RESOURCES (NEW SCHEMA)
-----------------------------
All learning resources are defined ONCE at the top level under "resources". Options no longer embed resources.
Each scenario may list a subset of relevant materials in "resourceIds" (array of resourceId strings).
The platform will show:
  • All resources in the story intro screen.
  • Scenario-specific resources (those listed in that scenario’s ``resourceIds``) near the scenario text.
  • The full global resource list beside the summary and quiz views.

Resource object fields:
  displayName (required)
  type (required)
  url (required)
  importance (optional: recommended | optional | advanced)
  description (optional learner-visible blurb; short)

Schema (NEW OUTPUT)
-------------------
Top-level keys in order:
  - title
  - status
  - createdAt
  - updatedAt
  - resources
  - scenarios
  - summary
  - quiz

Timestamp object format:
  { "seconds": <int>, "nanoseconds": <int> }

Scenario object keys in order:
  - name
  - text
  - pathResult (undetermined | success | failure)
  - options (array)
  - resourceIds (optional array of strings referencing top-level resources)
  - meta (optional object; see below)

Option object:
  - text (≤60 chars, single line)
  - id (string matching scenario key)

(Legacy stories may contain ``drugName`` fields; DO NOT use in new output.)

Mermaid compliance:
  - Scenario IDs become graph node IDs.
  - Option texts must be short, single-line labels without unsupported Unicode.

Structural Rules
----------------
** Exactly one OPT0 scenario which is the starting point. **
** A scenario with pathResult=success must always have an empty options array. **
** A scenario with pathResult=failure must always have exactly one option whose text is Back, returning the user to the scenario they came from. **
   - If multiple parents lead to the same failure concept, create distinct failure scenarios per parent (e.g., FAIL_OPT1, FAIL_OPT2) so each Back leads correctly.

Content Length Guides
---------------------
• Scenario.text target length: 60–220 words (short failure remediations allowed ≥20 words).
• summary.points: must include all must-include summary points; each point ≤160 chars; additional concise points allowed.
• quiz must include at least 3 questions; each with "options" array (2–5 choices), one "correct" value, and may include "explanations" map (keyed by option string) with 1–2 sentence rationales.

Optional scenario.meta object:
  {
    "difficulty": 1-5,
    "cognitiveLevel": "recall" | "apply" | "analyze" | "evaluate" | "create",
    "tags": ["..."],
    "prereqSuccess": ["OPT1","OPT2"]   // show only if these succeeded; optional
  }

Validation Self-Check (DO THIS SILENTLY BEFORE OUTPUT)
------------------------------------------------------
1. JSON parses (UTF-8, double-quoted keys/strings, valid escapes).
2. All referenced scenario IDs exist.
3. Exactly one OPT0.
4. All success scenarios have options=[].
5. All failure scenarios have exactly one Back option to a valid scenario.
6. No use of drugName; no resource objects in options.
7. All learner-visible text localized to ${language}.
8. Required math/code markup used if ${language} is RTL.
9. Option texts ≤60 chars, one line.
10. All scenario.resourceIds reference valid resource IDs defined in top-level ``resources``.
11. summary.points include all ${mustIncludePointsJSON} items (translated).

REFERENCE EXAMPLES (structure only — DO NOT COPY CONTENT)
=========================================================

--- MINIMAL EXAMPLE (global resources + scenario.resourceIds) ---
{
  "title": "Minimal Example – Adding Fractions",
  "status": "draft",
  "createdAt": { "seconds": 0, "nanoseconds": 0 },
  "updatedAt": { "seconds": 0, "nanoseconds": 0 },
  "resources": {
    "R1": {
      "displayName": "Fraction Visualizer",
      "type": "tool",
      "url": "https://example.com/fractions",
      "importance": "recommended"
    },
    "R2": {
      "displayName": "Quick Fraction Review",
      "type": "article",
      "url": "https://example.com/fraction-review",
      "importance": "recommended"
    },
    "R3": {
      "displayName": "Worksheet: Practice Fractions",
      "type": "doc",
      "url": "https://example.com/fraction-worksheet",
      "importance": "optional"
    }
  },
  "scenarios": {
    "OPT0": {
      "name": "Start – Add Fractions",
      "text": "You must add <math-inline>1/2 + 1/4</math-inline>. <<reflect>> Choose the method you think is correct.",
      "pathResult": "undetermined",
      "options": [
        { "text": "Find common denominator", "id": "OPT1" },
        { "text": "Add numerators only", "id": "OPT2" }
      ],
      "resourceIds": ["R1","R2"]
    },
    "OPT1": {
      "name": "Correct Addition",
      "text": "Nice! Converting 1/2 to 2/4 gives <math-inline>2/4 + 1/4 = 3/4</math-inline>. This shows why common denominators matter. You can now apply this to unlike fractions in homework.",
      "pathResult": "success",
      "options": [],
      "resourceIds": ["R1","R3"]
    },
    "OPT2": {
      "name": "Incorrect – Numerators Only",
      "text": "Adding just 1 + 1 and keeping 2 gives 2/2, which misreads denominators. Proper addition needs equal parts. Review and try again.",
      "pathResult": "failure",
      "options": [
        { "text": "Back", "id": "OPT0" }
      ],
      "resourceIds": ["R2"]
    }
  },
  "summary": {
    "points": [
      "Convert to a common denominator before adding fractions.",
      "Add numerators; keep the common denominator.",
      "Simplify the result when possible."
    ]
  },
  "quiz": {
    "choices": [
      {
        "id": "Q1",
        "question": "1. What is 1/2 + 1/4?",
        "options": ["2/2","3/4","1/6"],
        "correct": "3/4"
      },
      {
        "id": "Q2",
        "question": "2. Why find a common denominator?",
        "options": ["To match part sizes","To change the answer","No reason"],
        "correct": "To match part sizes"
      },
      {
        "id": "Q3",
        "question": "3. Simplify 2/4:",
        "options": ["1/2","2","4/2"],
        "correct": "1/2"
      }
    ]
  }
}

--- MAXIMAL EXAMPLE (global resources + scenario.resourceIds + meta) ---
{
  "title": "Maximal Example – Decoding a Medieval Charter with Date Math & Code",
  "status": "draft",
  "createdAt": { "seconds": 0, "nanoseconds": 0 },
  "updatedAt": { "seconds": 0, "nanoseconds": 0 },
  "resources": {
    "R1": {
      "displayName": "Roman Calendar Guide",
      "type": "article",
      "url": "https://example.com/roman-calendar",
      "importance": "recommended",
      "description": "How Roman inclusive dating works."
    },
    "R2": {
      "displayName": "Date-Parser Notebook",
      "type": "tool",
      "url": "https://example.com/date-parser",
      "importance": "advanced"
    },
    "R3": {
      "displayName": "Reign Timeline DB",
      "type": "dataset",
      "url": "https://example.com/regnal-timeline"
    },
    "R4": {
      "displayName": "Seal Iconography Atlas",
      "type": "doc",
      "url": "https://example.com/seal-atlas"
    },
    "R5": {
      "displayName": "Guide: Reading Medieval Dates",
      "type": "article",
      "url": "https://example.com/medieval-dates",
      "importance": "recommended"
    }
  },
  "scenarios": {
    "OPT0": {
      "name": "You Receive the Charter",
      "text": "A damaged Latin charter claims a land grant was issued in the reign of King X on \"the 14th day before the Kalends of May, Year 1215.\" You must verify authenticity. <<reflect>> What do you do first?",
      "pathResult": "undetermined",
      "options": [
        { "text": "Examine date system", "id": "S1" },
        { "text": "Assume date is correct", "id": "F_OPT0_ASSUME" },
        { "text": "Run script to parse date", "id": "S2" }
      ],
      "resourceIds": ["R1","R2"]
    },
    "S1": {
      "name": "Analyze Roman Date",
      "text": "Good start. Roman-style dating counts backward from fixed points. \"Kalends of May\" = May 1. \"14th day before\" (inclusive) maps to <math-inline>May 1 - 13 days</math-inline> = April 18. <<reflect>> Next?",
      "pathResult": "undetermined",
      "options": [
        { "text": "Cross-check regnal year", "id": "S3" },
        { "text": "Trust inscription blindly", "id": "F_S1_TRUST" }
      ],
      "resourceIds": ["R1","R3"]
    },
    "S2": {
      "name": "Parse Date by Code",
      "text": "You choose automation. Here's a snippet you consider running:<code-block lang=\"py\">\nimport datetime\n# Roman date helper pseudo-code\n# target: '14th day before Kalends of May 1215'\n</code-block>\nAutomating helps scale archival work, but mis-parsed rules can corrupt data. <<reflect>> Proceed?",
      "pathResult": "undetermined",
      "options": [
        { "text": "Validate logic manually", "id": "S1" },
        { "text": "Run unvalidated script", "id": "F_S2_RUNBAD" }
      ],
      "resourceIds": ["R2"]
    },
    "S3": {
      "name": "Check Regnal Alignment",
      "text": "Records show King X's 3rd regnal year began <math-inline>1214-11-03</math-inline>. April 18, 1215 falls in the 3rd year—consistent! You now verify seal integrity. <<reflect>>",
      "pathResult": "undetermined",
      "options": [
        { "text": "Inspect wax seal clues", "id": "S4" },
        { "text": "Skip seal; accept validity", "id": "F_S3_SKIPSEAL" }
      ],
      "resourceIds": ["R3","R4"]
    },
    "S4": {
      "name": "Seal Verified – Charter Authentic",
      "text": "Seal matrix, inscription style, and regnal dating all align. The charter is likely authentic; catalog with provenance notes.",
      "pathResult": "success",
      "options": [],
      "resourceIds": ["R4"]
    },
    "F_OPT0_ASSUME": {
      "name": "Assumed Date Without Checking",
      "text": "You accept the charter at face value. Later analysis finds the date format was miscopied; your catalog entry is flagged. Careful dating matters in medieval sources.",
      "pathResult": "failure",
      "options": [
        { "text": "Back", "id": "OPT0" }
      ],
      "resourceIds": ["R5"]
    },
    "F_S1_TRUST": {
      "name": "Trusted Inscription Blindly",
      "text": "The scribe omitted an intercalary adjustment; your chronology drifts. Always confirm calendar conversions.",
      "pathResult": "failure",
      "options": [
        { "text": "Back", "id": "S1" }
      ],
      "resourceIds": ["R1","R5"]
    },
    "F_S2_RUNBAD": {
      "name": "Ran Script Without Validation",
      "text": "The parser misread ordinal text and logged May 14 instead of April 18. Automated errors propagate widely. Validate logic first.",
      "pathResult": "failure",
      "options": [
        { "text": "Back", "id": "S2" }
      ],
      "resourceIds": ["R2"]
    },
    "F_S3_SKIPSEAL": {
      "name": "Skipped Seal Verification",
      "text": "A forged seal was later detected on similar documents; without inspection you miss critical fraud signals.",
      "pathResult": "failure",
      "options": [
        { "text": "Back", "id": "S3" }
      ],
      "resourceIds": ["R4"]
    }
  },
  "summary": {
    "points": [
      "Convert Roman calendar dates carefully; inclusive counting matters.",
      "Always cross-check regnal years before authenticating charters.",
      "Validate code tools on known samples before batch processing records.",
      "Physical seals provide key anti-forgery evidence."
    ]
  },
  "quiz": {
    "choices": [
      {
        "id": "Q1",
        "question": "1. \"14th day before the Kalends of May\" corresponds to which modern date (inclusive count)?",
        "options": ["April 18","April 17","May 14"],
        "correct": "April 18"
      },
      {
        "id": "Q2",
        "question": "2. Why confirm regnal years when dating charters?",
        "options": ["To match ruler chronology","To translate language","To restore parchment"],
        "correct": "To match ruler chronology"
      },
      {
        "id": "Q3",
        "question": "3. Best practice before running a date-parsing script on an archive?",
        "options": ["Run immediately","Validate on samples","Ignore errors"],
        "correct": "Validate on samples"
      },
      {
        "id": "Q4",
        "question": "4. What can seals help detect?",
        "options": ["Forgery","Ink color","Parchment humidity"],
        "correct": "Forgery"
      }
    ]
  }
}

=========================================================

--- INSTRUCTIONS TO MODEL ---
Using ALL rules above and the injected variables, create a brand-new interactive case-study story JSON.

Title should reflect: Subject: ${subject}; Additional instructions: ${instr || 'none'}.
status MUST start as "draft".
Use current timestamp integers for createdAt/updatedAt (seconds + nanoseconds; nanoseconds may be 0 if unknown).

Output ONLY the JSON. No markdown, no commentary.
`;

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
        
        // Load languages and set default
        await loadStoryLanguages();
        
        storyJsonArea.value = cleaned;
        try {
            const newStory = JSON.parse(cleaned);
            const title = newStory.title || '';
            const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
            storyIdInput.value = slug;
            storyTitleInput.value = newStory.title || '';
            statusSelect.value = newStory.status || 'draft';
            typeSelect.value = newStory.type || '';
            
            // Set language to user's preference
            languageSelect.value = getUserSetting('language', 'en');
            
            // Update the JSON to include the language
            newStory.language = languageSelect.value || 'en';
            storyJsonArea.value = JSON.stringify(newStory, null, 2);
        } catch {}
        storyJsonArea.dispatchEvent(new Event('input', { bubbles: true }));
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
  