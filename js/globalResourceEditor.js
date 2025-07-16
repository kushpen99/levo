// js/globalResourceEditor.js
// Modular global resource editor for story resources
// Usage: import { createGlobalResourceEditor } from './globalResourceEditor.js';
//        container.append(createGlobalResourceEditor(resources, onChange))

export function createGlobalResourceEditor(resources, onChange) {
    // Defensive copy
    let resObj = { ...resources };
    // Helper to generate next resource ID
    function nextResourceId() {
        const ids = Object.keys(resObj).map(id => parseInt(id.replace(/^R/, ''))).filter(n => !isNaN(n));
        const max = ids.length ? Math.max(...ids) : 0;
        return 'R' + (max + 1);
    }

    // Main container
    const container = document.createElement('div');
    container.className = 'global-resource-editor bg-gray-50 p-4 rounded shadow mb-4';

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center mb-2';
    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold flex-1';
    title.textContent = 'Global Resources';
    header.append(title);
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Resource';
    addBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded';
    header.append(addBtn);
    container.append(header);

    // Resource list
    const list = document.createElement('div');
    container.append(list);

    function renderList() {
        list.innerHTML = '';
        Object.entries(resObj).forEach(([rid, res]) => {
            const card = document.createElement('div');
            card.className = 'mb-3 p-3 border rounded bg-white relative';
            // ID label
            const idLabel = document.createElement('span');
            idLabel.className = 'absolute top-2 right-3 text-xs text-gray-400';
            idLabel.textContent = rid;
            card.append(idLabel);
            // Display Name
            const nameLabel = document.createElement('label');
            nameLabel.textContent = 'Display Name:';
            nameLabel.className = 'block text-xs mb-1';
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = res.displayName || '';
            nameInput.className = 'border rounded px-1 py-0.5 w-full mb-2';
            card.append(nameLabel, nameInput);
            // Type
            const typeLabel = document.createElement('label');
            typeLabel.textContent = 'Type:';
            typeLabel.className = 'block text-xs mb-1';
            const typeSelect = document.createElement('select');
            typeSelect.className = 'border rounded px-1 py-0.5 w-full mb-2';
            ['article', 'doc', 'tool', 'dataset', 'youtube'].forEach(t => {
                const optEl = document.createElement('option');
                optEl.value = t;
                optEl.textContent = t.charAt(0).toUpperCase() + t.slice(1);
                if (res.type === t) optEl.selected = true;
                typeSelect.append(optEl);
            });
            card.append(typeLabel, typeSelect);
            // URL
            const urlLabel = document.createElement('label');
            urlLabel.textContent = 'URL:';
            urlLabel.className = 'block text-xs mb-1';
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = res.url || '';
            urlInput.className = 'border rounded px-1 py-0.5 w-full mb-2';
            card.append(urlLabel, urlInput);
            // Importance
            const impLabel = document.createElement('label');
            impLabel.textContent = 'Importance:';
            impLabel.className = 'block text-xs mb-1';
            const impSelect = document.createElement('select');
            impSelect.className = 'border rounded px-1 py-0.5 w-full mb-2';
            ['', 'recommended', 'optional', 'advanced'].forEach(val => {
                const optEl = document.createElement('option');
                optEl.value = val;
                optEl.textContent = val ? val.charAt(0).toUpperCase() + val.slice(1) : '(none)';
                if (res.importance === val) optEl.selected = true;
                impSelect.append(optEl);
            });
            card.append(impLabel, impSelect);
            // Description
            const descLabel = document.createElement('label');
            descLabel.textContent = 'Description:';
            descLabel.className = 'block text-xs mb-1';
            const descInput = document.createElement('input');
            descInput.type = 'text';
            descInput.value = res.description || '';
            descInput.className = 'border rounded px-1 py-0.5 w-full mb-2';
            card.append(descLabel, descInput);
            // Save and Delete buttons
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.className = 'bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded mr-2';
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.className = 'bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded';
            card.append(saveBtn, delBtn);
            // Save handler
            saveBtn.onclick = () => {
                resObj[rid] = {
                    displayName: nameInput.value.trim(),
                    type: typeSelect.value,
                    url: urlInput.value.trim(),
                    importance: impSelect.value || undefined,
                    description: descInput.value.trim() || undefined
                };
                if (onChange) onChange({ ...resObj });
                renderList();
            };
            // Delete handler
            delBtn.onclick = () => {
                delete resObj[rid];
                if (onChange) onChange({ ...resObj });
                renderList();
            };
            list.append(card);
        });
    }

    addBtn.onclick = () => {
        const newId = nextResourceId();
        resObj[newId] = { displayName: '', type: 'article', url: '' };
        if (onChange) onChange({ ...resObj });
        renderList();
    };

    renderList();
    return container;
} 