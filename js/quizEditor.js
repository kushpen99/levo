// js/quizEditor.js

export function renderQuizEditor({ container, scenarioData, jsonTextarea }) {
  // Remove any previous quiz editor
  let prev = container.querySelector('#scenario-quiz-editor');
  if (prev) prev.remove();

  // Root
  const root = document.createElement('div');
  root.id = 'scenario-quiz-editor';
  root.className = 'mb-6';

  // Title
  const title = document.createElement('h3');
  title.className = 'text-lg font-semibold mb-2 text-blue-600';
  title.textContent = 'Quiz Editor';
  root.appendChild(title);

  // Add Question button
  const add = document.createElement('button');
  add.textContent = 'Add Question';
  add.className = 'mb-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded';
  add.onclick = () => {
    scenarioData.quiz = scenarioData.quiz || { choices: [] };
    scenarioData.quiz.choices.push({ id: `Q${scenarioData.quiz.choices.length + 1}`, question: '', options: [], correct: '' });
    renderQuizEditor({ container, scenarioData, jsonTextarea });
  };
  root.appendChild(add);

  // Table
  const table = document.createElement('table');
  table.className = 'table-auto w-full border-collapse';
  table.innerHTML = `<thead><tr class='bg-gray-50'><th class='border px-2 py-1'>#</th><th class='border px-2 py-1'>ID</th><th class='border px-2 py-1'>Question</th><th class='border px-2 py-1'>Options (comma)</th><th class='border px-2 py-1'>Correct</th><th class='border px-2 py-1'>Remove</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  (scenarioData.quiz?.choices || []).forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.append(tdPlain(i + 1));
    tr.append(tdInput(c.id || '', v => update(i, 'id', v), '', 'ID'));
    tr.append(tdInput(c.question || '', v => update(i, 'question', v), 'w-64', 'Question', true));
    tr.append(tdInput((c.options || []).join(', '), v => update(i, 'options', v.split(',').map(s => s.trim()).filter(Boolean)), 'w-64', 'Options (comma-separated)', true));
    tr.append(tdInput(c.correct || '', v => update(i, 'correct', v), '', 'Correct'));
    const td = document.createElement('td'); td.className = 'border px-2 py-1 text-center';
    const rm = document.createElement('button'); rm.textContent = '🗑'; rm.onclick = () => { scenarioData.quiz.choices.splice(i, 1); renderQuizEditor({ container, scenarioData, jsonTextarea }); }; td.append(rm); tr.append(td);
    tbody.append(tr);
  });
  table.append(tbody); root.appendChild(table);

  function tdPlain(t) { const td = document.createElement('td'); td.className = 'border px-2 py-1'; td.textContent = t; return td; }
  function showEditModal({ label, value, multiline, onSave }) {
    // Remove any existing modal
    let prev = document.getElementById('quiz-edit-modal');
    if (prev) prev.remove();
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'quiz-edit-modal';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50';
    // Modal
    const modal = document.createElement('div');
    modal.className = 'bg-white p-6 rounded shadow w-full max-w-md';
    // Label
    const lbl = document.createElement('div');
    lbl.className = 'font-semibold mb-2';
    lbl.textContent = label;
    modal.appendChild(lbl);
    // Input
    let inp;
    if (multiline) {
      inp = document.createElement('textarea');
      inp.rows = 6;
      inp.className = 'border rounded px-3 py-2 w-full mb-4';
      inp.value = value;
    } else {
      inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'border rounded px-3 py-2 w-full mb-4';
      inp.value = value;
    }
    modal.appendChild(inp);
    // Buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'flex space-x-2';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded';
    saveBtn.onclick = () => { onSave(inp.value); overlay.remove(); };
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded';
    cancelBtn.onclick = () => overlay.remove();
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    inp.focus();
  }
  function tdInput(v, cb, cls = '', label = '', multiline = false) {
    const td = document.createElement('td');
    td.className = `border px-2 py-1 ${cls} cursor-pointer`;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = v;
    inp.className = 'border rounded px-1 py-0.5 w-full';
    inp.readOnly = true;
    td.append(inp);
    td.onclick = () => {
      showEditModal({
        label,
        value: v,
        multiline,
        onSave: newVal => cb(newVal)
      });
    };
    return td;
  }
  function update(i, k, v) { scenarioData.quiz.choices[i][k] = v; if (jsonTextarea) { try { const full = JSON.parse(jsonTextarea.value); full.quiz = scenarioData.quiz; jsonTextarea.value = JSON.stringify(full, null, 2); } catch {} } }

  container.appendChild(root);
} 