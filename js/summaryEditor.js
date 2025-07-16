// js/summaryEditor.js

export function renderSummaryEditor({ container, scenarioData, jsonTextarea }) {
  // Remove any previous summary editor
  let prev = container.querySelector('#scenario-summary-editor');
  if (prev) prev.remove();

  // Root
  const root = document.createElement('div');
  root.id = 'scenario-summary-editor';
  root.className = 'mb-6';

  // Title
  const title = document.createElement('h3');
  title.className = 'text-lg font-semibold mb-2 text-green-600';
  title.textContent = 'Summary Editor';
  root.appendChild(title);

  // Textarea for summary points (one per line)
  const ta = document.createElement('textarea');
  ta.className = 'border rounded px-2 py-1 w-full h-32';
  ta.value = (scenarioData.summary?.points || []).join('\n');
  ta.oninput = () => {
    scenarioData.summary = { points: ta.value.split('\n') };
    if (jsonTextarea) {
      try {
        const full = JSON.parse(jsonTextarea.value);
        full.summary = scenarioData.summary;
        jsonTextarea.value = JSON.stringify(full, null, 2);
      } catch {}
    }
  };
  root.appendChild(ta);

  container.appendChild(root);
} 