// /js/drugHelpers.js
import * as fb          from './firebase-init.js';          // NEW – full SDK
import { doc, getDoc }  from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

console.log('[drugHelpers.js] module evaluated');

  /* ───────── DOM handles (global) ───────── */
  const drugsArea     = document.getElementById('drugs-area');
  const drugEditor    = document.getElementById('drug-editor');
  const drugAiBtn     = document.getElementById('drug-ai-btn');
  
  const drugNameEl        = document.getElementById('drug-name');
  const drugFamilyExEl    = document.getElementById('family-ex');
  const drugSubclassExEl  = document.getElementById('subclass-ex');
  const drugMoAExEl       = document.getElementById('mechanism-of-action-ex');
  const drugSpectrumExEl  = document.getElementById('spectrum-of-coverage-ex');
  const drugMajorResExEl  = document.getElementById('major-resistance-mechanisms-ex');
  const drugPdExEl        = document.getElementById('pd-ex');
  const drugPkExEl2       = document.getElementById('pk-ex');
  const drugToxExEl       = document.getElementById('toxicity-ex');
  
  const drugFamilySumEl   = document.getElementById('family-sum');
  const drugSpectrumSumEl = document.getElementById('spectrum-of-coverage-sum');
  const drugPkSumEl       = document.getElementById('pk-sum');
  const drugToxicitySumEl = document.getElementById('toxicity-sum');
  
  const drugDeleteBtn     = document.getElementById('drug-delete-btn');
  const drugStatus        = document.getElementById('drug-status');

  function openDrugEditor(id = '') {
    

    drugsArea.classList.remove('hidden');

    drugEditor.classList.remove('hidden');
    drugAiBtn.classList.remove('hidden');

    console.log('[drug] openDrugEditor called with', id || '(new)');

    console.log('[drug] drugEditor =', drugEditor);

    if (id) {

        // load existing doc
        fb.getDoc(fb.doc(fb.db, 'drugs', id)).then(snap => {
            if (snap.exists()) {
                const d = snap.data();
                drugNameEl.value = id;
                drugFamilyExEl.value = d['family-ex'] || '';
                drugSubclassExEl.value = d['subclass-ex'] || '';
                drugMoAExEl.value = d['mechanism-of-action-ex'] || '';
                drugSpectrumExEl.value = d['spectrum-of-coverage-ex'] || '';
                drugMajorResExEl.value = d['major-resistance-mechanisms-ex'] || '';
                drugPdExEl.value = d['pd-ex'] || '';
                drugPkExEl2.value = d['pk-ex'] || '';
                drugToxExEl.value = d['toxicity-ex'] || '';

                drugFamilySumEl.value = d['family-sum'] || '';
                drugSpectrumSumEl.value = d['spectrum-of-coverage-sum'] || '';
                drugPkSumEl.value = d['pk-sum'] || '';
                drugToxicitySumEl.value = d['toxicity-sum'] || '';

                drugDeleteBtn.classList.remove('hidden');
            } else {
                // new doc with prefilled name
                drugNameEl.value = id;
                drugFamilyExEl.value = '';
                drugSubclassExEl.value = '';
                drugMoAExEl.value = '';
                drugSpectrumExEl.value = '';
                drugMajorResExEl.value = '';
                drugPdExEl.value = '';
                drugPkExEl2.value = '';
                drugToxExEl.value = '';

                drugFamilySumEl.value = '';
                drugSpectrumSumEl.value = '';
                drugPkSumEl.value = '';
                drugToxicitySumEl.value = '';

                drugDeleteBtn.classList.add('hidden');
            }
        });
    } else {
        resetDrugEditor();
    }
}

window.openDrugEditor = openDrugEditor;

  
  

/**
 * Initialise drug helpers once.
 * @param {Firestore} db  The Firestore instance from main.js
 */
function initDrugHelpers(db) {
  /* ------------------  1. memoised drugExists()  ------------------ */
  const cache = new Map();               // drugName → Promise<boolean>

  async function drugExists(name) {
    if (cache.has(name)) return cache.get(name);
    const p = getDoc(doc(db, 'drugs', name))
      .then(snap => snap.exists())
      .catch(()   => false);             // treat network/perm error as missing
    cache.set(name, p);
    return p;
  }


  
    // simple memo so we never hit Firestore twice for the same name
    const drugCache = new Map();


  /* ------------------  2. colour + Add-drug shortcut -------------- */
  function showAddDrugShortcut(inputEl) {
    if (inputEl.parentElement.querySelector('.add-drug-btn')) return; // already

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.textContent = '+';
    btn.title       = 'Add this drug';
    btn.className =
      'add-drug-btn absolute right-2 top-1 z-20 flex items-center justify-center ' +
      'w-7 h-7 rounded-full shadow-sm bg-white border border-blue-500 ' +
      'text-blue-600 font-semibold text-lg leading-none hover:bg-blue-50';

    btn.onclick = e => {
        console.log('AddDrug button onclick 1');
      e.stopPropagation();
      console.log('AddDrug button onclick 2');
      // you already have openDrugEditor(name) in another module:
      if (window.openDrugEditor) 
      {
        console.log('AddDrug button onclick 3');
        window.openDrugEditor(inputEl.value.trim());
      }
    
      console.log('AddDrug button onclick 4');

      document.getElementById('drugs-area')
              ?.scrollIntoView({ behavior: 'smooth' });

        console.log('AddDrug button onclick 5');

    };

    inputEl.parentElement.style.position = 'relative';
    inputEl.parentElement.append(btn);
  }

  function hideAddDrugShortcut(inputEl) {
    inputEl.parentElement.querySelector('.add-drug-btn')?.remove();
  }

  /**
   * Paint the <input> background green/red depending on DB presence.
   * Also toggles the "+ add drug" shortcut button.
   */
  function paintDrugInput(inputEl) {
    const name = inputEl.value.trim();
  
    /* reset colours */
    inputEl.classList.remove('bg-emerald-100', 'bg-rose-100');
  
    /* Empty field → clear button and return */
    if (!name) { hideAddDrugShortcut(inputEl); return; }
  
    /* ───── asynchronous branch ───── */
    drugExists(name).then(exists => {
  
      if (exists) {
        /* ← drug IN database */
        inputEl.classList.add('bg-emerald-100');
        hideAddDrugShortcut(inputEl);      // ← hide only now
      } else {
        /* ← drug NOT in database */
        inputEl.classList.add('bg-rose-100');
        showAddDrugShortcut(inputEl);      // keep / create button
      }
    });
  }
  

  /* ---------- expose helpers globally for any module to use ------- */
  window.paintDrugInput = paintDrugInput;
  window.drugExists     = drugExists;      // in case something else needs it
}


/* ───────────── DRUGS CRUD ───────────── */

async function loadDrugs() {
    const sel = document.getElementById('drug-select');
    sel.innerHTML = '<option value="">-- select --</option>';
    const snap = await fb.getDocs(fb.collection(fb.db, 'drugs'));
    snap.forEach(d => {
        const o = new Option(d.id, d.id);
        sel.append(o);
    });
}

async function saveDrug() {
    const id = drugNameEl.value.trim();
    if (!id) return setDrugStatus('Drug name required', 'text-red-600');

    const payload = {
        'family-ex': drugFamilyExEl.value.trim(),
        'subclass-ex': drugSubclassExEl.value.trim(),
        'mechanism-of-action-ex': drugMoAExEl.value.trim(),
        'spectrum-of-coverage-ex': drugSpectrumExEl.value.trim(),
        'major-resistance-mechanisms-ex': drugMajorResExEl.value.trim(),
        'pd-ex': drugPdExEl.value.trim(),
        'pk-ex': drugPkExEl2.value.trim(),
        'toxicity-ex': drugToxExEl.value.trim(),

        'family-sum': drugFamilySumEl.value.trim(),
        'spectrum-of-coverage-sum': drugSpectrumSumEl.value.trim(),
        'pk-sum': drugPkSumEl.value.trim(),
        'toxicity-sum': drugToxicitySumEl.value.trim(),
    };

    await fb.setDoc(fb.doc(fb.db, 'drugs', id), payload);
}


async function deleteDrug() {
    const id = drugSelect.value;
    if (!id) return;
    const ok = confirm(`Delete drug "${id}" permanently?`);
    if (!ok) return;
    await fb.deleteDoc(fb.doc(fb.db, 'drugs', id));
    setDrugStatus(`Drug "${id}" deleted`, 'text-green-600');
    resetDrugEditor();
    await loadDrugs();
    invalidateDrugCache(id);
}


function resetDrugEditor() {

    /* keep the panel visible; caller decides when to hide */
    drugAiBtn.classList.add('hidden');   // this is fine to hide
    drugDeleteBtn.classList.add('hidden');

    setDrugStatus('');
  
    /* clear every field in one shot */
    [
      drugNameEl,
      /* ---- extended (“-ex”) fields ---- */
      drugFamilyExEl, drugSubclassExEl, drugMoAExEl,
      drugSpectrumExEl, drugMajorResExEl, drugPdExEl, drugPkExEl2, drugToxExEl,
      /* ---- summary (“-sum”) fields ---- */
      drugFamilySumEl, drugSpectrumSumEl, drugPkSumEl, drugToxicitySumEl
    ].forEach(el => { if (el) el.value = ''; });
  
    /* optional: remove red/green colouring */
    document
      .querySelectorAll('#drug-editor textarea, #drug-editor input')
      .forEach(el =>
        el.classList.remove('bg-emerald-100', 'bg-rose-100')
      );
  }
  

// ——————————————————————————————————————————————————
//  Helpers for your dynamic form
// ——————————————————————————————————————————————————

/**
 * Inserts one <fieldset> into your form, with:
 *  • an input for the key name  
 *  • an input for the value  
 *  • a delete button
 */
function addDrugAiFieldRow(key = '', val = '') {
    
    const d = document.createElement('div');
    
    // input
    const inp = document.createElement('input');
    inp.placeholder = 'field name';
    inp.id = key;
    inp.type = 'text';
    inp.className = 'border rounded px-2 py-1 w-full';

    // label
    const lbl = document.createElement('label');
    lbl.placeholder = 'value';
    lbl.value = key;
    lbl.className = 'block font-semibold mb-1';

    // delete button
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '🗑';
    del.className = 'text-red-600 hover:text-red-800';
    del.onclick = () => d.remove();

    d.append(lbl, inp, del);

    // insert before "Add field" if it exists, otherwise at end
    drugForm.append(d);
}


async function generateDrugInfoByAI() {
    clearDrugAiStatus();
    drugAiBtn.disabled = true;
    drugAispinner.classList.remove('hidden');
    try {
        // 1) build your prompt however you like—here's a placeholder:
        const prompt = `You are an expert clinical pharmacologist and researcher.  
When given a drug name, fetch its pharmacologic and microbiologic data **only** from authoritative, publicly-available sources (e.g. PubChem, DrugBank, FDA drug labels, WHO Essential Medicines List, up-to-date peer-reviewed literature).  

**Output must be valid JSON, with exactly these keys** (no extra fields):

{
"drug-name":      "string",
"family-ex":      "string",  // extended description
"subclass-ex":    "string",
"mechanism-of-action-ex":         "string",
"spectrum-of-coverage-ex":        "string",
"major-resistance-mechanisms-ex": "string",
"pd-ex":          "string",  // pharmacodynamics
"pk-ex":          "string",  // pharmacokinetics
"toxicity-ex":    "string",
"family-sum":     "string",  // 1–2 sentence summary
"spectrum-of-coverage-sum":    "string",
"pk-sum":        "string",
"toxicity-sum":  "string",
"sources":      ["string"]    // list of URLs or PubMed IDs you used
}

**Guidelines**  
1. For every ' - ex' field, give a detailed, referenced description (include in-line citations if possible).  
2. For every '- sum' field, give a concise 1–2 sentence bullet-style summary.  
3. List all your references in the """sources""" array.  
4. Do **not** output any explanation outside of the JSON.  

Here is the drug to look up:
${ drugNameEl.value }
`;


        // 2) call your AI endpoint
        const res = await fetch(chatEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o',
                prompt
            })
        });

        if (!res.ok) throw new Error(await res.text());

        const { reply } = await res.json();

        // 3) clean code fences (if any) and parse JSON
        let txt = reply.trim();
        if (txt.startsWith('```')) {
            txt = txt.replace(/^```(?:json)?\s*/, '').replace(/```$/, '');
        }
        const aiData = JSON.parse(txt);

        // 4) merge into the form, but don't overwrite non-empty fields
        Object.entries(aiData).forEach(([key, value]) => {
            // look for an existing row whose key input === `key`

            console.log("key: " + key);
            console.log("value: " + value);


            const inputEL = document.getElementById(key);
            
            if (inputEL) {
                console.log("inputEL: " + inputEL.id);
                if (!inputEL.value || inputEL.value === '') inputEL.value = value;
            } else {
                console.log("inputEL: null");
                // if it doesn't exist, add a new row
                //addDrugAiFieldRow(key, value);
            }
        });

        setDrugAiSuccess('✔ AI data populated (existing fields untouched)');
    } catch (err) {
        setDrugAiError('AI generation failed: ' + err.message);
    } finally {
        drugAiBtn.disabled = false;
        drugAispinner.classList.add('hidden');
    }
}

function clearDrugAiStatus() {
    drugAiStatus.textContent = '';
    drugAiStatus.className = '';
    drugAiStatus.classList.add('hidden');
}

function setDrugAiError(msg) {
    drugAiStatus.classList.remove('hidden');
    drugAiStatus.textContent = msg;
    drugAiStatus.className = 'text-red-600';
}

function setDrugAiSuccess(msg) {
    drugAiStatus.classList.remove('hidden');
    drugAiStatus.textContent = msg;
    drugAiStatus.className = 'text-green-600';
}



function setDrugStatus(msg = '', cls = '') {
    drugStatus.textContent = msg;
    drugStatus.className = cls;
}

/* invalidate one entry in the exists-cache */
function invalidateDrugCache(name) {
    drugCache.delete(name);
}

/* ---------------------------------------------------------- */
/*  PUBLIC EXPORTS – other modules import *exactly* these     */
/* ---------------------------------------------------------- */
export {
    initDrugHelpers,   // already runs once in table.js
    loadDrugs,
    saveDrug,
    deleteDrug,
    generateDrugInfoByAI,
    openDrugEditor
  };
  
