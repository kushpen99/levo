// /js/scenarioViews.js
import { mountGraphEditor }   from './graph.js';
import { mountScenarioTable } from './scenarioTable.js';

console.log('[scenarioViews.js] module evaluated');

/**
 * Host must call mountScenarioViews once and pass:
 *   wrapperDiv    – a parent <div> (empty)
 *   jsonTextarea  – <textarea id="story-json">
 *
 * Returns { redrawAll }
 */
export function mountScenarioViews({ wrapperDiv, jsonTextarea }) {

  /* 0 ⚙️ build the title and dropdown */
  const headerContainer = document.createElement('div');
  headerContainer.className = 'flex items-center justify-between mb-4';

  // Title
  const title = document.createElement('h3');
  title.className = 'text-lg font-semibold text-purple-600';
  title.textContent = 'Scenario Editor';
  headerContainer.appendChild(title);

  // Dropdown on the right
  const toolbar = document.createElement('div');
  toolbar.className = 'flex items-center space-x-2';

  const sel = document.createElement('select');
  sel.className = 'border rounded px-2 py-1';
  sel.innerHTML =
    '<option value="graph" selected>Graph view</option>' +
    '<option value="table">Table view</option>';

  toolbar.append(sel);
  headerContainer.appendChild(toolbar);
  wrapperDiv.append(headerContainer);

  /* 1 📦 create two inner holders (siblings) */
  const graphHolder  = document.createElement('div');
    graphHolder.style.width  = '100%';
    graphHolder.style.height = '600px';
    graphHolder.style.border = '1px solid #ddd';
    graphHolder.style.borderRadius = '8px';

  const tableHolder  = document.createElement('div');
  tableHolder.classList.add('hidden');          // graph is default

  wrapperDiv.append(graphHolder, tableHolder);

  /* 2 🚀 mount sub-modules once */
  const graphMod = mountGraphEditor({
    cyContainer: graphHolder,
    jsonTextarea
  });

  const tableMod = mountScenarioTable({
    tableContainer: tableHolder,
    jsonTextarea
  });

  /* 3 🔀 switching logic */
  function show(view) {
    if (view === 'graph') {
      graphHolder.classList.remove('hidden');
      tableHolder.classList.add('hidden');

      document.querySelectorAll('.graph-tools')
            .forEach(el => el.classList.remove('hidden'));

      let data;
      try { data = JSON.parse(jsonTextarea.value); } catch { data = null; }
      if (data) graphMod.rerender(data);
    } else {
      graphHolder.classList.add('hidden');
      tableHolder.classList.remove('hidden');

      document.querySelectorAll('.graph-tools')
            .forEach(el => el.classList.add('hidden'));

      tableMod.redraw();
    }
    current = view;
  }

  let current = 'graph';          // default
  sel.onchange = () => show(sel.value);

  /* 4 🔁 redrawAll that updates whichever view is visible */
  function redrawAll() {
    if (current === 'graph') {
        let data;
        try { data = JSON.parse(jsonTextarea.value); } catch { data = null; }
        if (data) graphMod.rerender(data);
    }
    else                     tableMod.redraw();
  }

    /* first paint (default graph) */
    show('graph');
  return { redrawAll };
}
