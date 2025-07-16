// /js/scenarioTable.js
console.log('[scenarioTable.js] module evaluated');

import { createResourceEditor } from './resourceEditor.js';
import { openScenarioEditDialog } from './scenarioEditDialog.js';

/**
 * Host must call `mountScenarioTable` ONCE and pass:
 *   tableContainer   – an empty <div> for the table
 *   jsonTextarea     – <textarea id="story-json"> (single source of truth)
 *
 * Returns { redraw } so other modules can force a refresh.
 */
export function mountScenarioTable({ tableContainer, jsonTextarea }) {
  /* ---------------------------------------------------------------- */
  /*  1.  Helper lifted from your old code                             */
  /* ---------------------------------------------------------------- */
  function generateScenarioId(name, existingIds) {
    let base = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
                                 .replace(/\s+/g, '-');
    if (!base) base = 'scenario';
    let id = base, n = 1;
    while (existingIds.includes(id)) id = `${base}-${n++}`;
    return id;
  }

  /* ---------------------------------------------------------------- */
  /*  2.  Safe wrapper for paintDrugInput (lives in another module)    */
  /* ---------------------------------------------------------------- */
  const paintDrugInputSafe =
    window.paintDrugInput ? window.paintDrugInput : () => {};

  /* ---------------------------------------------------------------- */
  /*  3.  Full drawScenarioTable implementation (pasted unchanged)     */
  /* ---------------------------------------------------------------- */
  function drawScenarioTable() {
    let data;
    try { data = JSON.parse(jsonTextarea.value); } catch { return; }

    tableContainer.innerHTML = '';

    /* ---- Add Scenario button ---- */
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Scenario';
    addBtn.className =
      'mb-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded';
    addBtn.onclick = () => {
      const name = prompt('Scenario name:');
      if (!name) return;

      const full  = JSON.parse(jsonTextarea.value);
      full.scenarios = full.scenarios || {};

      const id = generateScenarioId(name, Object.keys(full.scenarios));
      full.scenarios[id] = {
        name, text: '', options: [], pathResult: 'undetermined'
      };

      jsonTextarea.value = JSON.stringify(full, null, 2);
      drawScenarioTable();
      if (window.renderCytoscapeGraph) window.renderCytoscapeGraph(full);
      if (window.redrawMermaid)        window.redrawMermaid();
    };
    tableContainer.append(addBtn);

    /* ---- Table skeleton ---- */
    const tbl = document.createElement('table');
    tbl.className = 'table-auto w-full border-collapse';
    tbl.innerHTML = `
      <thead><tr class='bg-gray-50 text-left'>
        <th class='border px-2 py-1'>ID</th>
        <th class='border px-2 py-1'>Name</th>
        <th class='border px-2 py-1'>Text</th>
        <th class='border px-2 py-1'>Result</th>
        <th class='border px-2 py-1'>Options</th>
        <th class='border px-2 py-1'>❌</th>
      </tr></thead>`;
    const tbody = document.createElement('tbody');
    tbl.append(tbody);

    Object.entries(data.scenarios || {}).forEach(([sid, sc]) => {
      const tr = document.createElement('tr'); tr.className = 'align-top cursor-pointer hover:bg-gray-50';

      // Open dialog on row click (except delete)
      tr.addEventListener('click', e => {
        if (e.target.closest('button')) return; // don't trigger on delete btn
        // Deep clone to avoid mutating original until save
        const draft = JSON.parse(JSON.stringify(sc));
        openScenarioEditDialog(sid, draft, {
          jsonTextarea,
          resources: data.resources || {},
          onSave: updated => {
            let full = JSON.parse(jsonTextarea.value);
            full.scenarios[sid] = updated;
            jsonTextarea.value = JSON.stringify(full, null, 2);
            drawScenarioTable();
            if (window.renderCytoscapeGraph) window.renderCytoscapeGraph(full);
            if (window.redrawMermaid) window.redrawMermaid();
          },
          onDelete: () => {
            let full = JSON.parse(jsonTextarea.value);
            // Remove all options pointing to this scenario
            Object.values(full.scenarios).forEach(s => {
              if (Array.isArray(s.options)) {
                s.options = s.options.filter(opt => opt.id !== sid);
              }
            });
            delete full.scenarios[sid];
            jsonTextarea.value = JSON.stringify(full, null, 2);
            drawScenarioTable();
            if (window.renderCytoscapeGraph) window.renderCytoscapeGraph(full);
            if (window.redrawMermaid) window.redrawMermaid();
          },
          onCancel: () => {}
        });
      });

      // ID cell
      tr.append(tdPlain(sid));
      // Name cell
      tr.append(tdPlain(sc.name || ''));
      // Text cell
      tr.append(tdPlain(sc.text || ''));
      // pathResult cell
      tr.append(tdPlain(sc.pathResult || 'undetermined'));
      // ResourceIds cell (show comma-separated display names)
      const tdResIds = document.createElement('td');
      tdResIds.className = 'border px-2 py-1 text-xs';
      const allResources = data.resources || {};
      const selected = (sc.resourceIds || []).map(rid => allResources[rid]?.displayName || rid);
      tdResIds.textContent = selected.join(', ');
      tr.append(tdResIds);
      // Options-count cell (show count)
      const tdOpt = document.createElement('td');
      tdOpt.className = 'border px-2 py-1 text-xs';
      tdOpt.textContent = (sc.options || []).length + ' option' + ((sc.options||[]).length === 1 ? '' : 's');
      tr.append(tdOpt);
      // Delete row btn
      const tdDel = document.createElement('td');
      tdDel.className = 'border px-2 py-1 text-center';
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑';
      delBtn.onclick = e => { e.stopPropagation(); deleteScenario(sid); };
      tdDel.append(delBtn); tr.append(tdDel);

      tbody.append(tr);
    });

    tableContainer.append(tbl);

    /* ---------- helpers inside drawScenarioTable ---------- */
    function tdPlain(t) {
      const td = document.createElement('td');
      td.className = 'border px-2 py-1 text-xs break-all';
      td.textContent = t;
      return td;
    }

    function createOptionsCell(sid, optionsArr) {
      const td = document.createElement('td');
      td.className = 'border px-2 py-1 align-top';

      const btn = document.createElement('button');
      btn.textContent = 'Edit…';
      btn.className =
        'bg-gray-200 hover:bg-gray-300 text-sm px-2 py-1 rounded';
      td.append(btn);

      const panel = document.createElement('div');
      panel.className =
        'options-editor hidden mt-2 p-2 bg-gray-50 rounded shadow';
      td.append(panel);

      btn.onclick = () => {
        panel.classList.toggle('hidden');
        if (!panel._rendered) {
          renderOptionsEditor(sid, panel);
          panel._rendered = true;
        }
      };

      return td;
    }

    function renderOptionsEditor(sid, panel) {
        // 0️⃣ clear previous content
        panel.innerHTML = '';
      
        // 1️⃣ get fresh JSON object
        let full;
        try { full = JSON.parse(jsonTextarea.value); }
        catch { return; }
      
        const opts = full.scenarios[sid].options =
                     full.scenarios[sid].options || [];
      
        // 2️⃣ "Done" button
        const doneBtn = document.createElement('button');
        doneBtn.textContent = '✓ Done';
        doneBtn.className =
          'mb-2 ml-2 bg-gray-300 hover:bg-gray-400 text-xs px-2 py-1 rounded';
        doneBtn.onclick = () => {
          panel.classList.add('hidden');
        };
        panel.append(doneBtn);
      
        // 3️⃣ table skeleton
        const tbl = document.createElement('table');
        tbl.className = 'w-full mb-2';
        tbl.innerHTML = `
          <thead class="text-left text-sm text-gray-600">
            <tr>
              <th class="py-1">Text</th>
              <th class="py-1">Target</th>
              <th class="py-1">Drug</th>
              <th></th>
            </tr>
          </thead>`;
        const tbody = document.createElement('tbody');
        tbl.append(tbody);
        panel.append(tbl);
      
        // 4️⃣ renderer
        function rebuild() {
          tbody.innerHTML = '';
      
          opts.forEach((o, i) => {
            const tr = document.createElement('tr'); tr.className = 'align-top';
      
            // label
            const tdLabel = document.createElement('td'); tdLabel.className = 'py-1 pr-2';
            const inpLabel = document.createElement('input');
            inpLabel.type  = 'text'; inpLabel.value = o.text || '';
            inpLabel.className = 'border rounded px-1 py-0.5 w-full';
            inpLabel.oninput = () => { o.text = inpLabel.value; push(); };
            tdLabel.append(inpLabel); tr.append(tdLabel);
      
            // target dropdown
            const tdTarget = document.createElement('td'); tdTarget.className = 'py-1 pr-2';
            const sel = document.createElement('select');
            sel.className = 'border rounded px-1 py-0.5 w-full';
      
            Object.entries(full.scenarios).sort().forEach(([key, sc]) => {
              if (key === sid) return;               // no self-link
              const optEl = document.createElement('option');
              optEl.value = key;
              optEl.textContent = sc.name
                ? `${sc.name} (${key})` : key;
              if (o.id === key) optEl.selected = true;
              sel.append(optEl);
            });
            sel.onchange = () => { o.id = sel.value; push(); };
            tdTarget.append(sel); tr.append(tdTarget);
      
            // drug input
            const tdDrug = document.createElement('td');
            tdDrug.className = 'py-1 pr-2 relative';
            const inpDrug = document.createElement('input');
            inpDrug.type  = 'text'; inpDrug.value = o.drugName || '';
            inpDrug.className =
              'border rounded px-1 py-0.5 w-full pr-10';
            inpDrug.oninput = () => {
              o.drugName = inpDrug.value; push();
              paintDrugInputSafe(inpDrug);
            };
            inpDrug.addEventListener('blur', () => paintDrugInputSafe(inpDrug));
            tdDrug.append(inpDrug); tr.append(tdDrug);
            paintDrugInputSafe(inpDrug);
      
            // resource editor
            const tdResource = document.createElement('td');
            tdResource.className = 'py-1 pr-2 relative';
            tdResource.append(createResourceEditor(o, push));
            tr.append(tdResource);
      
            // delete
            const tdDel = document.createElement('td'); tdDel.className =
              'py-1 text-center';
            const delBtn = document.createElement('button');
            delBtn.textContent = '✕';
            delBtn.className   = 'text-red-500 hover:text-red-700';
            delBtn.onclick = () => {
              opts.splice(i, 1); push(); rebuild();
            };
            tdDel.append(delBtn); tr.append(tdDel);
      
            tbody.append(tr);
          });
        }
      
        // 5️⃣ "+ Add Option" button
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Add Option';
        addBtn.className =
          'bg-blue-500 hover:bg-blue-600 text-white text-sm px-2 py-1 rounded';
        addBtn.onclick = () => {
          const scenarioIds = Object.keys(full.scenarios).filter(id => id !== sid);
          const firstTarget = scenarioIds.length ? scenarioIds[0] : '';
          opts.push({ text: '', id: firstTarget });
          push(); rebuild();
        };
        panel.append(addBtn);
      
        // push changes back to textarea without triggering full preview loop
        function push() {
          jsonTextarea.value = JSON.stringify(full, null, 2);
          if (window.renderCytoscapeGraph) window.renderCytoscapeGraph(full);
          if (window.redrawMermaid)        window.redrawMermaid();
        }
      
        rebuild();
      }
      
      function renderResourceEditor(opt, panel) {
        panel.innerHTML = '';
        // Display Name
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Display Name:';
        nameLabel.className = 'block text-xs font-semibold mb-1';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = opt.resource?.displayName || '';
        nameInput.className = 'border rounded px-1 py-0.5 w-full mb-2';
        panel.append(nameLabel, nameInput);
        // Type
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Type:';
        typeLabel.className = 'block text-xs font-semibold mb-1';
        const typeSelect = document.createElement('select');
        typeSelect.className = 'border rounded px-1 py-0.5 w-full mb-2';
        ['url', 'youtube'].forEach(t => {
          const optEl = document.createElement('option');
          optEl.value = t;
          optEl.textContent = t;
          if (opt.resource?.type === t) optEl.selected = true;
          typeSelect.append(optEl);
        });
        panel.append(typeLabel, typeSelect);
        // URL
        const urlLabel = document.createElement('label');
        urlLabel.textContent = 'URL:';
        urlLabel.className = 'block text-xs font-semibold mb-1';
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = opt.resource?.url || '';
        urlInput.className = 'border rounded px-1 py-0.5 w-full mb-2';
        panel.append(urlLabel, urlInput);
        // Save/Remove buttons
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded mr-2';
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded';
        panel.append(saveBtn, removeBtn);
        saveBtn.onclick = () => {
          opt.resource = {
            displayName: nameInput.value.trim(),
            type: typeSelect.value,
            url: urlInput.value.trim()
          };
          push();
          panel.classList.add('hidden');
          panel._rendered = false;
          rebuild();
        };
        removeBtn.onclick = () => {
          delete opt.resource;
          push();
          panel.classList.add('hidden');
          panel._rendered = false;
          rebuild();
        };
      }

    function updateField(sid, key, value) {
      const full = JSON.parse(jsonTextarea.value);
      full.scenarios[sid][key] = value;
      jsonTextarea.value = JSON.stringify(full, null, 2);
      if (currentViewIsTable()) drawScenarioTable();
    }

    function deleteScenario(sid) {
      if (!confirm('Delete scenario?')) return;
      const full = JSON.parse(jsonTextarea.value);
      delete full.scenarios[sid];
      jsonTextarea.value = JSON.stringify(full, null, 2);
      drawScenarioTable();
      if (window.renderCytoscapeGraph) window.renderCytoscapeGraph(full);
    }

    function currentViewIsTable() {
      return !tableContainer.classList.contains('hidden');
    }
  } // end drawScenarioTable

  /* ---------------------------------------------------------------- */
  /*  4.  Initial draw + textarea sync                                */
  /* ---------------------------------------------------------------- */
  drawScenarioTable();
  jsonTextarea.addEventListener('input', () => {
    if (!tableContainer.classList.contains('hidden')) drawScenarioTable();
  });

  /* ---------------------------------------------------------------- */
  /* 5.  expose API to caller                                         */
  /* ---------------------------------------------------------------- */
  return { redraw: drawScenarioTable };
}
