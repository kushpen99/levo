// js/scenarioEditDialog.js

/**
 * Scenario Edit Dialog (modular, reusable)
 * Usage: openScenarioEditDialog(scenarioId, scenarioData, { onSave, onDelete, onCancel, jsonTextarea, resources })
 */

import { renderQuizEditor } from './quizEditor.js';
import { renderSummaryEditor } from './summaryEditor.js';

export function openScenarioEditDialog(scenarioId, scenarioData, {
  onSave, onDelete, onCancel, jsonTextarea, resources
}) {
  // Insert modal HTML if not present
  if (!document.getElementById('scenario-edit-modal')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="scenario-edit-modal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 hidden">
        <div class="bg-white p-6 rounded shadow w-full max-w-md" style="max-height:90vh; overflow-y:auto;">
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
          <label id="scenario-options-title" class="block font-semibold mb-1">Options:</label>
          <div class="mb-4" id="scenario-options-section"></div>
          <label id="scenario-resources-title" class="block font-semibold mb-1">Resources:</label>
          <div class="resource-checkbox-list mb-2" id="scenario-resources-section"></div>
          <div class="flex items-center space-x-2 mb-2">
            <button id="scenario-edit-save" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Save</button>
            <button id="scenario-edit-cancel" class="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">Cancel</button>
            <button id="scenario-edit-delete" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded ml-auto">Delete</button>
          </div>
        </div>
      </div>
    `);
  }

  const modal = document.getElementById('scenario-edit-modal');
  const nameInput = document.getElementById('scenario-edit-name');
  const textInput = document.getElementById('scenario-edit-text');
  const pathResultInput = document.getElementById('scenario-edit-pathResult');
  const optionsSection = document.getElementById('scenario-options-section');
  const resourcesSection = document.getElementById('scenario-resources-section');
  const saveBtn = document.getElementById('scenario-edit-save');
  const cancelBtn = document.getElementById('scenario-edit-cancel');
  const deleteBtn = document.getElementById('scenario-edit-delete');
  const modalContent = modal.querySelector('div.bg-white');

  // Fill fields
  nameInput.value = scenarioData.name || '';
  textInput.value = scenarioData.text || '';
  pathResultInput.value = scenarioData.pathResult || 'undetermined';

  // Show modal
  modal.classList.remove('hidden');
  if (modalContent) modalContent.scrollTop = 0;

  // Overlay click = cancel
  function handleOverlayClick(e) {
    if (e.target === modal) {
      closeModal();
      if (onCancel) onCancel();
    }
  }
  modal.addEventListener('mousedown', handleOverlayClick);

  // Render options editor (simple for now: just show options as text)
  function renderOptions() {
    optionsSection.innerHTML = '';
    (scenarioData.options || []).forEach((opt, idx) => {
      const row = document.createElement('div');
      row.className = 'flex items-center space-x-2 mb-1';
      // Text
      const textInp = document.createElement('input');
      textInp.type = 'text';
      textInp.value = opt.text || '';
      textInp.className = 'border rounded px-2 py-1 w-1/2';
      textInp.oninput = () => { opt.text = textInp.value; };
      row.appendChild(textInp);
      // Target
      const sel = document.createElement('select');
      sel.className = 'border rounded px-2 py-1 w-1/3';
      // Populate with all scenario IDs except this one
      let allScenarioIds = Object.keys((jsonTextarea && JSON.parse(jsonTextarea.value).scenarios) || {}).filter(id => id !== scenarioId);
      let scenarioNameMap = {};
      if (jsonTextarea) {
        try {
          const allScenarios = JSON.parse(jsonTextarea.value).scenarios || {};
          scenarioNameMap = Object.fromEntries(Object.entries(allScenarios).map(([id, sc]) => [id, sc.name || id]));
        } catch {}
      }
      allScenarioIds.forEach(id => {
        const label = scenarioNameMap[id] ? `${scenarioNameMap[id]} (${id})` : id;
        const o = new Option(label, id, false, id === opt.id);
        sel.append(o);
      });
      sel.onchange = () => { opt.id = sel.value; };
      row.appendChild(sel);
      // Delete
      const del = document.createElement('button');
      del.textContent = '🗑';
      del.className = 'text-red-600 hover:text-red-800 px-2';
      del.onclick = () => {
        scenarioData.options.splice(idx, 1);
        renderOptions();
      };
      row.appendChild(del);
      optionsSection.appendChild(row);
    });
    // Add Option button
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Option';
    addBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mt-2';
    addBtn.onclick = () => {
      let allScenarioIds = Object.keys((jsonTextarea && JSON.parse(jsonTextarea.value).scenarios) || {}).filter(id => id !== scenarioId);
      if (!allScenarioIds.length) {
        alert('Add another scenario first – nowhere to link to.');
        return;
      }
      scenarioData.options = scenarioData.options || [];
      scenarioData.options.push({ text: 'Option', id: allScenarioIds[0] });
      renderOptions();
    };
    optionsSection.appendChild(addBtn);
  }
  renderOptions();

  // Render resources as checkboxes
  function renderResources() {
    resourcesSection.innerHTML = '';
    const allResources = Object.entries(resources || {});
    (scenarioData.resourceIds || []).forEach((rid, i, arr) => { if (!allResources.find(([id]) => id === rid)) arr.splice(i, 1); });
    allResources.forEach(([rid, res]) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'flex items-center space-x-2 mb-1 text-xs cursor-pointer';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = rid;
      cb.checked = (scenarioData.resourceIds || []).includes(rid);
      cb.onchange = () => {
        let ids = new Set(scenarioData.resourceIds || []);
        if (cb.checked) ids.add(rid); else ids.delete(rid);
        scenarioData.resourceIds = Array.from(ids);
      };
      wrapper.append(cb);
      const name = document.createElement('span');
      name.textContent = res.displayName || rid;
      wrapper.append(name);
      if (res.url) {
        const link = document.createElement('a');
        link.href = res.url;
        link.target = '_blank';
        link.className = 'text-blue-600 underline text-xs ml-2';
        link.textContent = 'Open';
        wrapper.append(link);
      }
      if (res.description) {
        const desc = document.createElement('span');
        desc.className = 'ml-2 text-gray-600 text-xs';
        desc.textContent = res.description;
        wrapper.append(desc);
      }
      resourcesSection.append(wrapper);
    });
  }
  renderResources();

  // Remove quiz and summary editors from the scenario edit dialog
  // (Do not call renderQuizEditor or renderSummaryEditor here)

  // Save handler
  saveBtn.onclick = () => {
    scenarioData.name = nameInput.value;
    scenarioData.text = textInput.value;
    scenarioData.pathResult = pathResultInput.value;
    // Ensure quiz and summary are included in the saved object
    const updated = {
      ...scenarioData,
      name: nameInput.value,
      text: textInput.value,
      pathResult: pathResultInput.value,
      quiz: scenarioData.quiz,
      summary: scenarioData.summary
    };
    if (onSave) onSave(updated);
    closeModal();
  };
  cancelBtn.onclick = () => { closeModal(); if (onCancel) onCancel(); };
  deleteBtn.onclick = () => { if (onDelete) onDelete(scenarioData); closeModal(); };

  function closeModal() {
    modal.classList.add('hidden');
    saveBtn.onclick = null;
    cancelBtn.onclick = null;
    deleteBtn.onclick = null;
    modal.removeEventListener('mousedown', handleOverlayClick);
  }
} 