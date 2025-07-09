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
      pixelRatio: 'auto',
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
            'font-size': 16,
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
            'text-background-color': '#fff',
            'text-background-opacity': 1,
            'text-background-padding': 2
          }}
      ]
    }));

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
          if (sourceId === targetId) { alert('Cannot connect to itself'); return; }

          let full;
          try { full = JSON.parse(gJsonTextarea.value); } catch { return; }
          if (!full.scenarios[sourceId] || !full.scenarios[targetId]) return;

          full.scenarios[sourceId].options = full.scenarios[sourceId].options || [];
          const text = prompt('Option text:', '');
          if (text === null) return;
          full.scenarios[sourceId].options.push({ text, id: targetId });
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
    const bfs = cy.layout({
      name: 'breadthfirst',
      directed: true,
      padding: 20,
      spacingFactor: 1.5,
      orientation: 'horizontal',
      animate: false
    });
    bfs.on('layoutstop', () => {
      const n = cy.nodes().length;
      if (n === 1) {
        /* One node → bounding box is 0×0, so fit() misbehaves.
          Use a fixed zoom that fills the editor nicely. */
        cy.zoom(1);    // or 1.2 if you like it bigger
        cy.center();
      } else {
        /* Two or more nodes → fit works correctly */
        cy.fit(cy.elements(), 40);   // 40-px padding looks good
        cy.center();
      }
    });
    bfs.run();
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
/*  2.1 “Add Scenario” button – only once                                 */
/* ------------------------------------------------------------------ */
if (cyContainer && !document.getElementById('add-scenario-btn')) {
  const addBtn = document.createElement('button');
  addBtn.id = 'add-scenario-btn';
  addBtn.textContent = 'Add Scenario';
  addBtn.className =
    'graph-tools mb-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded';
  cyContainer.parentElement.insertBefore(addBtn, cyContainer);

  addBtn.onclick = () => {
    let full;
    try { full = JSON.parse(jsonTextarea.value); } catch { return; }

    full.scenarios = full.scenarios || {};

    showAddScenarioModal(name => {
      // ← everything that used to be inside the old handler now lives here
      
      const existingIds = Object.keys(full.scenarios);
      const id = generateScenarioId(name, existingIds);
      
      full.scenarios[id] = {
         name,
          text: '',
          options: [],
          pathResult: 'undetermined'
      };
      
      jsonTextarea.value = JSON.stringify(full, null, 2);
      renderCytoscapeGraph(full);
      if (window.redrawMermaid) window.redrawMermaid();
    });
    return;            // bail out – all work happens in the callback

  };
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

  

function openScenarioEditModal(scenarioId, scenarioData) {
  const modal = document.getElementById('scenario-edit-modal');
  const nameInput = document.getElementById('scenario-edit-name');
  const textInput = document.getElementById('scenario-edit-text');
  const pathResultInput = document.getElementById('scenario-edit-pathResult');
  nameInput.value = scenarioData.name || '';
  textInput.value = scenarioData.text || '';
  pathResultInput.value = scenarioData.pathResult || 'undetermined';
  modal.classList.remove('hidden');

  // Render options management
  const optionsSection = document.getElementById('scenario-options-section');
  let full;
  try { full = JSON.parse(jsonTextarea.value); } catch { full = null; }
  // Build a map of id -> name for all scenarios
  const scenarioNameMap = full ? Object.fromEntries(Object.entries(full.scenarios).map(([id, sc]) => [id, sc.name || id])) : {};
  const allScenarioIds = full ? Object.keys(full.scenarios).filter(id => id !== scenarioId) : [];
  optionsSection.innerHTML = '';
  // List current options
  const optionsList = document.createElement('div');
  optionsList.className = 'space-y-2';
  (scenarioData.options || []).forEach((opt, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center space-x-2';
    // Option text
    const textInp = document.createElement('input');
    textInp.type = 'text';
    textInp.value = opt.text || '';
    textInp.className = 'border rounded px-2 py-1 w-1/2';
    textInp.oninput = e => {
      opt.text = textInp.value;
      let full2;
      try { full2 = JSON.parse(jsonTextarea.value); } catch { return; }
      full2.scenarios[scenarioId].options[idx].text = textInp.value;
      jsonTextarea.value = JSON.stringify(full2, null, 2);
      renderCytoscapeGraph(full2);
    };
    row.appendChild(textInp);
    // Target scenario dropdown (show names, value is id)
    const targetSel = document.createElement('select');
    targetSel.className = 'border rounded px-2 py-1 w-1/3';
    allScenarioIds.forEach(id => {
      const optEl = document.createElement('option');
      optEl.value = id;
      optEl.textContent = scenarioNameMap[id] ? `${scenarioNameMap[id]} (${id})` : id;
      if (opt.id === id) optEl.selected = true;
      targetSel.appendChild(optEl);
    });
    targetSel.onchange = e => {
      opt.id = targetSel.value;
      let full2;
      try { full2 = JSON.parse(jsonTextarea.value); } catch { return; }
      full2.scenarios[scenarioId].options[idx].id = targetSel.value;
      jsonTextarea.value = JSON.stringify(full2, null, 2);
      renderCytoscapeGraph(full2);
    };
    row.appendChild(targetSel);
    // Delete option button
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.className = 'text-red-600 hover:text-red-800 px-2';
    delBtn.onclick = () => {
      let full2;
      try { full2 = JSON.parse(jsonTextarea.value); } catch { return; }
      full2.scenarios[scenarioId].options.splice(idx, 1);
      jsonTextarea.value = JSON.stringify(full2, null, 2);
      renderCytoscapeGraph(full2);
      openScenarioEditModal(scenarioId, full2.scenarios[scenarioId]); // re-render modal
    };
    row.appendChild(delBtn);
    optionsList.appendChild(row);
  });
  optionsSection.appendChild(optionsList);
  // Add Option button
  const addOptBtn = document.createElement('button');
  addOptBtn.textContent = '+ Add Option';
  addOptBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mt-2';
  addOptBtn.onclick = () => {
    if (!allScenarioIds.length) return;
    let full2;
    try { full2 = JSON.parse(jsonTextarea.value); } catch { return; }
    full2.scenarios[scenarioId].options = full2.scenarios[scenarioId].options || [];
    full2.scenarios[scenarioId].options.push({ text: 'Option', id: allScenarioIds[0] });
    jsonTextarea.value = JSON.stringify(full2, null, 2);
    renderCytoscapeGraph(full2);
    openScenarioEditModal(scenarioId, full2.scenarios[scenarioId]); // re-render modal
  };
  optionsSection.appendChild(addOptBtn);

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
    // Update the JSON
    let full;
    try { full = JSON.parse(jsonTextarea.value); } catch { closeModal(); return; }
    if (!full.scenarios[scenarioId]) { closeModal(); return; }
    full.scenarios[scenarioId].name = nameInput.value;
    full.scenarios[scenarioId].text = textInput.value;
    full.scenarios[scenarioId].pathResult = pathResultInput.value;
    jsonTextarea.value = JSON.stringify(full, null, 2);
    renderCytoscapeGraph(full);
    closeModal();
  };
  cancelBtn.onclick = closeModal;
  deleteBtn.onclick = () => {
    if (!confirm('Delete this scenario and all its connections?')) return;
    let full;
    try { full = JSON.parse(jsonTextarea.value); } catch { closeModal(); return; }
    if (!full.scenarios[scenarioId]) { closeModal(); return; }
    // Remove all options pointing to this scenario
    Object.values(full.scenarios).forEach(sc => {
      if (Array.isArray(sc.options)) {
        sc.options = sc.options.filter(opt => opt.id !== scenarioId);
      }
    });
    // Remove the scenario itself
    delete full.scenarios[scenarioId];
    jsonTextarea.value = JSON.stringify(full, null, 2);
    renderCytoscapeGraph(full);
    closeModal();
  };
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
  }

  function rerender(data) {            // local alias
    renderCytoscapeGraph(cyContainer, jsonTextarea, data);
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

