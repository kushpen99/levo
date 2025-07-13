// resourceEditor.js
// Modular resource editor for scenario options

export function createResourceEditor(option, onChange) {
  // Create the main container
  const container = document.createElement('div');
  container.className = 'resource-editor';

  // Button to open/close the resource editor panel
  const resourceBtn = document.createElement('button');
  resourceBtn.textContent = option.resource ? 'Edit Resource' : 'Attach Resource';
  resourceBtn.className = 'bg-gray-200 hover:bg-gray-300 text-xs px-2 py-1 rounded mb-1';
  container.append(resourceBtn);

  // Resource summary (if exists)
  if (option.resource) {
    const summary = document.createElement('div');
    summary.className = 'text-xs text-gray-700 mb-1';
    summary.textContent = `${option.resource.displayName || ''} (${option.resource.type || ''})`;
    container.append(summary);
  }

  // Resource editor panel (hidden by default)
  const resourcePanel = document.createElement('div');
  resourcePanel.className = 'bg-gray-50 p-2 rounded shadow mt-1 mb-1 hidden';
  container.append(resourcePanel);

  resourceBtn.onclick = () => {
    resourcePanel.classList.toggle('hidden');
    if (!resourcePanel._rendered) {
      renderResourceEditor(option, resourcePanel, onChange);
      resourcePanel._rendered = true;
    }
  };

  return container;
}

function renderResourceEditor(opt, panel, onChange) {
  panel.innerHTML = '';

  // Display Name
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Display Name:';
  nameLabel.className = 'block text-xs mb-1';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = opt.resource?.displayName || '';
  nameInput.className = 'border rounded px-1 py-0.5 w-full mb-2';
  panel.append(nameLabel, nameInput);

  // Type
  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Type:';
  typeLabel.className = 'block text-xs mb-1';
  const typeSelect = document.createElement('select');
  typeSelect.className = 'border rounded px-1 py-0.5 w-full mb-2';
  ['url', 'youtube'].forEach(t => {
    const optEl = document.createElement('option');
    optEl.value = t;
    optEl.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (opt.resource?.type === t) optEl.selected = true;
    typeSelect.append(optEl);
  });
  panel.append(typeLabel, typeSelect);

  // URL
  const urlLabel = document.createElement('label');
  urlLabel.textContent = 'URL:';
  urlLabel.className = 'block text-xs mb-1';
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.value = opt.resource?.url || '';
  urlInput.className = 'border rounded px-1 py-0.5 w-full mb-2';
  panel.append(urlLabel, urlInput);

  // Save and Remove buttons
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
      url: urlInput.value.trim(),
    };
    panel.classList.add('hidden');
    if (onChange) onChange();
  };
  removeBtn.onclick = () => {
    delete opt.resource;
    panel.classList.add('hidden');
    if (onChange) onChange();
  };
} 