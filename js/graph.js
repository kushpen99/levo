// /js/graph.js
console.log('[graph.js] module evaluated');

import { mountScenarioTable } from './scenarioTable.js';

// will be filled in by mountGraphEditor so the standalone
// renderCytoscapeGraph() always knows where to draw
let gCyContainer = null, gJsonTextarea = null;

// Shared graph-state flags (needed by renderCytoscapeGraph **and**
// by code inside mountGraphEditor)
let connectMode   = false;
let connectSource = null;

 // ———————————————————————————————
//  Connect-Option modal (hidden by default)
// ———————————————————————————————
const connectOptionModalHtml = `
<div id="connect-option-modal"
     class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 hidden">
  <div class="bg-white rounded shadow p-6 w-96 space-y-4">
    <h2 class="text-xl font-semibold">New Option</h2>

    <div>
      <label class="block text-sm font-medium mb-1" for="opt-text">
        Link text
      </label>
      <input id="opt-text" type="text"
             class="border rounded w-full px-3 py-2"
             placeholder="e.g. Start antibiotics">
    </div>

    <div>
      <label class="block text-sm font-medium mb-1" for="opt-drug">
        Drug (optional)
      </label>
      <input id="opt-drug" type="text"
             class="border rounded w-full px-3 py-2"
             placeholder="e.g. ceftriaxone">
    </div>

    <div class="flex justify-end gap-2">
      <button id="opt-cancel"
              class="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400">
        Cancel
      </button>
      <button id="opt-save"
              class="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white">
        Add
      </button>
    </div>
  </div>
</div>`;

if (!document.getElementById('connect-option-modal')) {
  document.body.insertAdjacentHTML('beforeend', connectOptionModalHtml);
}

function showConnectOptionModal(onSave) {
  const modal = document.getElementById('connect-option-modal');
  const txt   = document.getElementById('opt-text');
  const drug  = document.getElementById('opt-drug');
  const btnOk = document.getElementById('opt-save');
  const btnNo = document.getElementById('opt-cancel');

  txt.value  = '';
  drug.value = '';
  modal.classList.remove('hidden');
  txt.focus();

  /* — live red/green colouring + “＋” shortcut — */
  drug.oninput = () => window.paintDrugInput(drug);     // from drugHelpers.js
  window.paintDrugInput(drug);                          // initialise

  function close() {
    modal.classList.add('hidden');
    btnOk.onclick = btnNo.onclick = drug.oninput = null;
  }

  btnOk.onclick = () => {
    const textVal  = txt.value.trim();
    const drugVal  = drug.value.trim();
    if (!textVal) { txt.focus(); return; }
    onSave({ text: textVal, drug: drugVal || undefined });
    close();
  };
  btnNo.onclick = close;
}


function openScenarioEditModal(scenarioId, scenarioData) {
  const modal = document.getElementById('scenario-edit-modal');
  const nameInput = document.getElementById('scenario-edit-name');
  const textInput = document.getElementById('scenario-edit-text');
  const pathResultInput = document.getElementById('scenario-edit-pathResult');
  nameInput.value = scenarioData.name || '';
  textInput.value = scenarioData.text || '';
  pathResultInput.value = scenarioData.pathResult || 'undetermined';
  modal.classList.remove('hidden');

  
  

const optionsSection = document.getElementById('scenario-options-section');
let   fullDraft      = JSON.parse(JSON.stringify(JSON.parse(gJsonTextarea.value)));
const draftSc        = fullDraft.scenarios[scenarioId];

function redrawOptions () {
  /* 0️⃣  wipe the container */
  optionsSection.innerHTML = '';

  /* 1️⃣  fresh helpers every redraw ------------------------------ */
  const scenarioNameMap = Object.fromEntries(
    Object.entries(fullDraft.scenarios)
          .map(([id, sc]) => [id, sc.name || id])
  );
  const allScenarioIds = Object.keys(fullDraft.scenarios)
                               .filter(id => id !== scenarioId);

  /* 2️⃣  build the rows ----------------------------------------- */
  const list = document.createElement('div');
  list.className = 'space-y-2';

  (draftSc.options || []).forEach((opt, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center space-x-2';

    /* --- Text input ------------------------------------------- */
    const textInp = document.createElement('input');
    textInp.type  = 'text';
    textInp.value = opt.text || '';
    textInp.className = 'border rounded px-2 py-1 w-1/2';
    textInp.oninput = () => { opt.text = textInp.value; };
    row.appendChild(textInp);

    /* --- Target dropdown -------------------------------------- */
    const sel = document.createElement('select');
    sel.className = 'border rounded px-2 py-1 w-1/3';
    allScenarioIds.forEach(id => {
      const o = new Option(
        scenarioNameMap[id] ? `${scenarioNameMap[id]} (${id})` : id,
        id,
        false,
        id === opt.id            // selected?
      );
      sel.append(o);
    });
    sel.onchange = () => { opt.id = sel.value; };
    row.appendChild(sel);

    /* --- Drug field ------------------------------------------- */
    const drugInp = document.createElement('input');
    drugInp.type  = 'text';
    drugInp.value = opt.drug || '';
    drugInp.placeholder = 'Drug';
    drugInp.className = 'border rounded px-2 py-1 w-1/3';
    drugInp.oninput = () => {            // just update draft
      opt.drug = drugInp.value.trim();
      window.paintDrugInput(drugInp);    // colour + “＋” shortcut
    };
    window.paintDrugInput(drugInp);      // first run
    row.appendChild(drugInp);

    /* --- Delete btn ------------------------------------------ */
    const del = document.createElement('button');
    del.textContent = '🗑';
    del.className   = 'text-red-600 hover:text-red-800 px-2';
    del.onclick     = () => { draftSc.options.splice(idx, 1); redrawOptions(); };
    row.appendChild(del);

    list.appendChild(row);
  });

  optionsSection.appendChild(list);

  /* 3️⃣  “Add Option” button ------------------------------------ */
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ Add Option';
  addBtn.className =
    'bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mt-2';
  addBtn.onclick = () => {
    if (!allScenarioIds.length) {
      alert('Add another scenario first – nowhere to link to.');
      return;
    }
    draftSc.options = draftSc.options || [];
    draftSc.options.push({ text: 'Option', id: allScenarioIds[0] });
    redrawOptions();                       // redraw only
  };
  optionsSection.appendChild(addBtn);
}

/* call once right after you define the function */
redrawOptions();

  // Save handler
  const saveBtn = document.getElementById('scenario-edit-save');
  const cancelBtn = document.getElementById('scenario-edit-cancel');
  const deleteBtn = document.getElementById('scenario-edit-delete');
  function closeModal() {
    modal.classList.add('hidden');
    saveBtn.onclick = null;
    cancelBtn.onclick = null;
    deleteBtn.onclick = null;
  }
  saveBtn.onclick = () => {
        // write back the pieces the user may have edited
        draftSc.name       = nameInput.value;
        draftSc.text       = textInput.value;
        draftSc.pathResult = pathResultInput.value;
    
        /* 2️⃣ commit draft to real JSON + redraw once */
        gJsonTextarea.value = JSON.stringify(fullDraft, null, 2);
        renderCytoscapeGraph(fullDraft);
        if (window.redrawMermaid) window.redrawMermaid();
        closeModal();
  };

  cancelBtn.onclick = closeModal;
  deleteBtn.onclick = () => {
    if (!confirm('Delete this scenario and all its connections?')) return;
    let full;
    try { full = JSON.parse(gJsonTextarea.value); } catch { closeModal(); return; }
    if (!full.scenarios[scenarioId]) { closeModal(); return; }
    // Remove all options pointing to this scenario
    Object.values(full.scenarios).forEach(sc => {
      if (Array.isArray(sc.options)) {
        sc.options = sc.options.filter(opt => opt.id !== scenarioId);
      }
    });
    // Remove the scenario itself
    delete full.scenarios[scenarioId];
    gJsonTextarea.value = JSON.stringify(full, null, 2);
    renderCytoscapeGraph(full);
    closeModal();
  };
}

/* --------------------------------------------------------------- */
  /* 3. Main render-function                                         */
  /* --------------------------------------------------------------- */
  function renderCytoscapeGraph(data) {
    console.log('[graph] renderCytoscapeGraph called',
      data && Object.keys(data.scenarios || {}).length, 'scenarios');

    const c = gCyContainer;
    if (!c) { console.warn('[graph] ⬇ gCyContainer missing'); return; }
    c.innerHTML = '';

    // Build Cytoscape elements ─ nodes first, then edges
    const elements = [];
    if (data && data.scenarios) {
      Object.entries(data.scenarios).forEach(([id, sc]) => {
        elements.push({
          data: { id, label: sc.name || id, pathResult: sc.pathResult || 'undetermined' }
        });
      });
      Object.entries(data.scenarios).forEach(([id, sc]) => {
        (sc.options || []).forEach(opt => {
          if (opt.id && data.scenarios[opt.id]) {
            elements.push({ data: { source: id, target: opt.id, label: opt.text || '' } });
          }
        });
      });
    }
    console.log('[graph] building Cytoscape with', elements.length, 'elements');

    const cy = (window.cy = cytoscape({
      container: c,
      elements,
      pixelRatio: undefined,
      minZoom: 0.2,
      maxZoom: 2,
      style: [
        /* nodes */
        { selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#fff',
            color: '#111',
            'font-family': 'Trebuchet MS, Verdana, Arial, sans-serif',
            'font-size': 14,
            'text-valign': 'center',
            'text-halign': 'center',
            shape: 'roundrectangle',
            width: 'label', height: 'label',
            padding: 6,
            'text-wrap': 'wrap',
            'text-max-width': 300,
            'border-width': 1.2, 'border-color': '#333'
          }},
        { selector: 'node[pathResult = "success"]',
          style: { 'background-color': '#22c55e', 'border-color': '#15803d' }},
        { selector: 'node[pathResult = "failure"]',
          style: { 'background-color': '#ef4444', 'border-color': '#991b1b' }},
        { selector: 'node[pathResult = "undetermined"]',
          style: { 'background-color': '#3b82f6', 'border-color': '#1e3a8a' }},
        /* edges */
        { selector: 'edge',
          style: {
            label: 'data(label)',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            width: 2, 'line-color': '#bbb', 'target-arrow-color': '#bbb',
            'font-size': 14,
          }},
          /* ★ START node (id === OPT0) — bright star shape */
          { selector: '.start-node',
            style: {
              shape            : 'roundrectangle',   // keep same shape
              'background-color' : '#facc15',        // gold  (Tailwind “yellow-400”)
              'border-color'     : '#b45309',        // darker gold/brown border
              'border-width'     : 2  
            }
          }
      ]
    }));

    /* mark entry node */
    cy.$('#OPT0').addClass('start-node');

    /* --------------- node tap = edit or connect ------------------ */
    const connectBtn = document.getElementById('connect-scenario-btn');

    cy.off('tap', 'node');
    cy.on('tap', 'node', evt => {
      if (connectMode) {
        const node = evt.target;
        if (!connectSource) {
          connectSource = node.id();
          cy.nodes().removeClass('connect-source');
          node.addClass('connect-source');
          if (connectBtn) connectBtn.textContent =
            'Connecting… (now click target)';
        } else {
          const sourceId = connectSource;
          const targetId = node.id();
          if (sourceId === targetId) { 
            node.animate({ position: node.position() }, {
              duration: 100, style: { 'border-color': '#ef4444' }
            });
            return; 
          }

          let full;
          try { full = JSON.parse(gJsonTextarea.value); } catch { return; }
          if (!full.scenarios[sourceId] || !full.scenarios[targetId]) return;

          full.scenarios[sourceId].options = full.scenarios[sourceId].options || [];
          
          showConnectOptionModal(({ text, drug }) => {
            full.scenarios[sourceId].options = full.scenarios[sourceId].options || [];
            const option = { text, id: targetId };
            if (drug) option.drug = drug;              // only store if user typed one
            full.scenarios[sourceId].options.push(option);
          
            gJsonTextarea.value = JSON.stringify(full, null, 2);
            renderCytoscapeGraph(full);
          });

          gJsonTextarea.value = JSON.stringify(full, null, 2);
          renderCytoscapeGraph(full);

          connectMode = false;
          connectSource = null;
          if (connectBtn) {
            connectBtn.classList.remove('bg-green-700');
            connectBtn.classList.add('bg-green-500');
            connectBtn.textContent = 'Connect';
          }
          cy.nodes().removeClass('connect-source');
        }
        evt.stopPropagation();
        return false;
      } else {
        const scenarioId   = evt.target.id();
        const scenarioData = data.scenarios[scenarioId];
        if (scenarioData) openScenarioEditModal(scenarioId, scenarioData);
      }
    });

    cy.style().selector('.connect-source').style({
      'border-width': 4,
      'border-color': '#22c55e',
      'border-style': 'double'
    }).update();

    // Layout
    /* ---------- ELK “layered” layout: minimises crossings ---------- */
    const layout = cy.layout({
      name: 'elk',
      padding: 40,                 // space around the graph
      fit: true,                   // zoom/centre afterwards
      elk: {
        algorithm  : 'layered',    // hierarchical, left→right
        'elk.direction' : 'RIGHT',
        /* nicer looking edge routing */
        'elk.layered.edgeRouting' : 'ORTHOGONAL',
        'elk.layered.nodePlacement.strategy'  : 'NETWORK_SIMPLEX',

        /* Spacing tweeks so edges do not overlap text */
        'elk.spacing.nodeNode'                : 100,   // between nodes in same layer
        'elk.layered.spacing.nodeNodeBetweenLayers': 110,

        /* ask ELK to try harder on crossings */
        'elk.layered.crossingMinimization.strategy' : 'LAYER_SWEEP',
      }
    });

    layout.one('layoutstart', () => {
      const start = cy.getElementById('OPT0');
      if (start && start.nonempty()) {
        /* pick any coordinates you like; these work well for LEFT→RIGHT */
        start.position({ x: 80, y: 200 });
        start.lock();              // prevents further movement
      }
    });

    layout.run();

    layout.promiseOn('layoutstop').then(() => {
      const start = cy.$('#OPT0');
      start.unlock();
      start.grabify();
    });
  }

  

/* ------------------------------------------------------------------ */
/*  PUBLIC factory – host injects <div id="cy-editor"> and the        */
/*  <textarea id="story-json"> so this module never touches document. */
/* ------------------------------------------------------------------ */
export function mountGraphEditor({
  cyContainer,      // div#cy-editor
  jsonTextarea      // textarea#story-json
}) {

  // expose to the top-level render function
  gCyContainer  = cyContainer;
  gJsonTextarea = jsonTextarea;


  /* ------------------------------------------------------------------ */
/*  2.1 Group graph tool buttons in a flex container for spacing      */
/* ------------------------------------------------------------------ */
if (cyContainer && !document.getElementById('graph-tools-container')) {
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'graph-tools-container';
  buttonContainer.className = 'flex space-x-2 mb-4';
  cyContainer.parentElement.insertBefore(buttonContainer, cyContainer);

  // Add Scenario button
  const addBtn = document.createElement('button');
  addBtn.id = 'add-scenario-btn';
  addBtn.textContent = 'Add Scenario';
  addBtn.className =
    'graph-tools bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded';
  addBtn.onclick = () => {
    let full;
    try { full = JSON.parse(gJsonTextarea.value); } catch { return; }
    full.scenarios = full.scenarios || {};
    showAddScenarioModal(name => {
      const existingIds = Object.keys(full.scenarios);
      const id = generateScenarioId(name, existingIds);
      full.scenarios[id] = {
         name,
          text: '',
          options: [],
          pathResult: 'undetermined'
      };
      gJsonTextarea.value = JSON.stringify(full, null, 2);
      renderCytoscapeGraph(full);
      if (window.redrawMermaid) window.redrawMermaid();
    });
    return;
  };
  buttonContainer.appendChild(addBtn);

  // Connect button
  if (!document.getElementById('connect-scenario-btn')) {
    const connectBtn = document.createElement('button');
    connectBtn.id   = 'connect-scenario-btn';
    connectBtn.textContent = 'Connect';
    connectBtn.className =
      'graph-tools bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors';
    connectBtn.addEventListener('click', () => {
      connectMode   = !connectMode;
      connectSource = null;
      connectBtn.classList.toggle('bg-green-700', connectMode);
      connectBtn.classList.toggle('bg-green-500', !connectMode);
      connectBtn.textContent =
        connectMode
          ? 'Connecting… (click source, then target)'
          : 'Connect';
      if (window.cy) window.cy.nodes().removeClass('connect-source');
    });
    buttonContainer.appendChild(connectBtn);

    // Zoom buttons
    const makeBtn = (id, label, title) => {
      const b = document.createElement('button');
      b.id         = id;
      b.textContent= label;
      b.title      = title;
      b.className  =
        'graph-tools bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-3 py-1 rounded';
      return b;
    };
    const zoomInBtn  = makeBtn('zoom-in-btn',  '＋', 'Zoom in');
    const zoomOutBtn = makeBtn('zoom-out-btn', '－', 'Zoom out');
    buttonContainer.appendChild(zoomInBtn);
    buttonContainer.appendChild(zoomOutBtn);
    // Zoom handlers
    const ZOOM_STEP = 1.2;
    const safeZoom = factor => {
      if (!window.cy) return;
      const cy   = window.cy;
      const zoom = cy.zoom() * factor;
      cy.zoom(Math.max(cy.minZoom(), Math.min(cy.maxZoom(), zoom)));
      cy.center();
    };
    zoomInBtn.onclick  = () => safeZoom(ZOOM_STEP);
    zoomOutBtn.onclick = () => safeZoom(1 / ZOOM_STEP);
  }
}

function generateScenarioId(name, existingIds) {
  let base = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  if (!base) base = 'scenario';
  let id = base, n = 1;
  while (existingIds.includes(id)) id = `${base}-${n++}`;
  return id;
}

// Update scenario edit modal to include Delete button
const scenarioEditModalHtml = `
<div id="scenario-edit-modal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 hidden">
  <div class="bg-white p-6 rounded shadow w-full max-w-md">
    <h2 class="text-xl font-semibold mb-4">Edit Scenario</h2>
    <div class="mb-3">
      <label for="scenario-edit-name" class="block font-semibold mb-1">Name</label>
      <input id="scenario-edit-name" type="text" class="border rounded px-3 py-2 w-full" />
    </div>
    <div class="mb-3">
      <label for="scenario-edit-text" class="block font-semibold mb-1">Text</label>
      <textarea id="scenario-edit-text" rows="3" class="border rounded px-3 py-2 w-full"></textarea>
    </div>
    <div class="mb-3">
      <label for="scenario-edit-pathResult" class="block font-semibold mb-1">Path Result</label>
      <select id="scenario-edit-pathResult" class="border rounded px-3 py-2 w-full">
        <option value="undetermined">Undetermined</option>
        <option value="success">Success</option>
        <option value="failure">Failure</option>
      </select>
    </div>
    <div class="mb-4" id="scenario-options-section"></div>
    <div class="flex items-center space-x-2 mb-2">
      <button id="scenario-edit-save" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Save</button>
      <button id="scenario-edit-cancel" class="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">Cancel</button>
      <button id="scenario-edit-delete" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded ml-auto">Delete</button>
    </div>
  </div>
</div>
`;
if (!document.getElementById('scenario-edit-modal')) {
  document.body.insertAdjacentHTML('beforeend', scenarioEditModalHtml);
}

 // ────────────────────────────────────────────────────────────────
 //  NEW: “Add Scenario” modal (hidden by default)
 // ────────────────────────────────────────────────────────────────
 const addScenarioModalHtml = `
 <div id="add-scenario-modal"
      class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 hidden">
   <div class="bg-white rounded shadow p-6 w-80 space-y-4">
     <h2 class="text-xl font-semibold">Add Scenario</h2>

     <div>
       <label class="block text-sm font-medium mb-1" for="new-scn-name">
         Scenario name
       </label>
       <input id="new-scn-name" type="text"
              class="border rounded w-full px-3 py-2"
              placeholder="e.g. First choice">
     </div>

     <div class="flex justify-end gap-2">
       <button id="add-scn-cancel"
               class="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400">
         Cancel
       </button>
       <button id="add-scn-save"
               class="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white">
         Add
       </button>
     </div>
   </div>
 </div>`;

 if (!document.getElementById('add-scenario-modal')) {
   document.body.insertAdjacentHTML('beforeend', addScenarioModalHtml);
 }



 function showAddScenarioModal(onSave) {
  const modal   = document.getElementById('add-scenario-modal');
  const input   = document.getElementById('new-scn-name');
  const btnSave = document.getElementById('add-scn-save');
  const btnCancel = document.getElementById('add-scn-cancel');

  input.value = '';
  modal.classList.remove('hidden');
  input.focus();

  function close() {
    modal.classList.add('hidden');
    btnSave.onclick   = null;
    btnCancel.onclick = null;
  }

  btnSave.onclick = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    onSave(name);
    close();
  };
  btnCancel.onclick = close;
}

  /* --------------------------------------------------------------- */
  /* 2.2 “Connect” toolbar button (added once)                        */
  /* --------------------------------------------------------------- */
  if (cyContainer && !document.getElementById('connect-scenario-btn')) {
    const connectBtn = document.createElement('button');
    connectBtn.id   = 'connect-scenario-btn';
    connectBtn.textContent =
      'Connect';                                     // default caption
    connectBtn.className =
      'graph-tools mb-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded ' +
      'transition-colors';
    cyContainer.parentElement.insertBefore(connectBtn, cyContainer);

    connectBtn.addEventListener('click', () => {
      connectMode   = !connectMode;
      connectSource = null;
      connectBtn.classList.toggle('bg-green-700', connectMode);
      connectBtn.classList.toggle('bg-green-500', !connectMode);
      connectBtn.textContent =
        connectMode
          ? 'Connecting… (click source, then target)'
          : 'Connect';
      if (window.cy) window.cy.nodes().removeClass('connect-source');
    });

       
    /* ─────────────── NEW: Zoom-buttons right after “Connect” ─────────────── */
    const makeBtn = (id, label, title) => {
    const b = document.createElement('button');
    b.id         = id;
    b.textContent= label;
    b.title      = title;
    b.className  =
      'graph-tools mb-2 bg-gray-200 hover:bg-gray-300 text-gray-900 ' +
      'font-semibold px-3 py-1 rounded';
    return b;
  };

  const zoomInBtn  = makeBtn('zoom-in-btn',  '＋', 'Zoom in');
  const zoomOutBtn = makeBtn('zoom-out-btn', '－', 'Zoom out');

  /* insert them right after the Connect button */
  connectBtn.after(zoomInBtn, zoomOutBtn);

  /* ---- handlers ------------------------------------------------------- */
  const ZOOM_STEP = 1.2;                 // 20 % per click feels nice

  const safeZoom = factor => {
    if (!window.cy) return;
    const cy   = window.cy;
    const zoom = cy.zoom() * factor;
    /* clamp to the limits you set when you created cy */
    cy.zoom(Math.max(cy.minZoom(), Math.min(cy.maxZoom(), zoom)));
    cy.center();                        // keep graph in view
  };

  zoomInBtn.onclick  = () => safeZoom(ZOOM_STEP);
  zoomOutBtn.onclick = () => safeZoom(1 / ZOOM_STEP);
    
  }

  function rerender(data) {
    if (!data) {
      try {
        data = JSON.parse(gJsonTextarea?.value || '{}');
      } catch {
        // malformed JSON → don’t change the graph
        return;
      }
    }
    renderCytoscapeGraph(data);   
  }

  /* ---------------------------------------------------------------- */
  /* 4. Scenario-edit modal                                           */
  /* ---------------------------------------------------------------- */
  /* — unchanged. keep your existing scenarioEditModalHtml template   */
  /*   and openScenarioEditModal() function here                     */

  /* ---------------------------------------------------------------- */
  /* 5. Resize observer                                               */
  /* ---------------------------------------------------------------- */
  const ro = new ResizeObserver(() => {
    if (window.cy) {
      window.cy.resize();
      window.cy.fit(window.cy.elements(), 20);
      window.cy.center();
    }
  });
  ro.observe(cyContainer);

  window.addEventListener('resize', () => {
    if (window.cy) {
      window.cy.resize();
      window.cy.fit(window.cy.elements(), 20);
      window.cy.center();
    }
  });

  /* --------------- expose a tiny public API ----------------------- */
  return {
    rerender
  };
}

export { renderCytoscapeGraph };

