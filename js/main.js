console.log('=== MAIN.JS STARTING ===');
console.log('[main.js] 0-module evaluated');   

/* ------------------------------------------------------------------ */
/* 1.  Grab the DOM handles **before** you mount any feature modules  */
/* ------------------------------------------------------------------ */
const storyJsonArea = document.getElementById('story-json'); 
const viewsHolder   = document.getElementById('scenario-views'); // add an empty <div> in HTML

const tableBody     = document.querySelector('#stories-table tbody');
const headThEls     = document.querySelectorAll('#stories-table th[data-col]');

/* ------------------------------------------------------------------ */
/*  DOM handles needed by the Edit callback                           */
/* ------------------------------------------------------------------ */
const welcomeView   = document.getElementById('welcome-view');
const adminUI       = document.getElementById('admin-ui');
const drugsArea     = document.getElementById('drugs-area');
const storyIdInput  = document.getElementById('story-id');
const backBtn     = document.getElementById('back-to-welcome-btn');
const statusMsg   = document.getElementById('status-msg');   // optional


/* ------------------------------------------------------------------ */
/* Back-to-welcome button                                             */
/* ------------------------------------------------------------------ */

backBtn.addEventListener('click', () => {
  /* hide the editing panes … */
  adminUI.classList.add('hidden');
  drugsArea.classList.add('hidden');

  /* …and show the stories list */
  welcomeView.classList.remove('hidden');

  /* clear any status message (optional) */
  if (statusMsg) statusMsg.textContent = '';
});



/* ----------------------------- ChatGpt -----------------------------*/
window.chatEndpoint = '/api/chat';


/* ------------------------------------------------------------------ */
/* 2.  Mount the graph editor                                         */
/* ------------------------------------------------------------------ */
import { mountScenarioViews } from './scenarioViews.js';


const views = mountScenarioViews({
  wrapperDiv:  viewsHolder,
  jsonTextarea: storyJsonArea
});

window.views = views; 

/* any change to the textarea (typed or programmatic) = redraw current view */
storyJsonArea.addEventListener('input', () => views.redrawAll());

console.log('[main.js] scenario views mounted', views);

/* ------------------------------------------------------------------ */
/* 3.  Wire the stories list table                                    */
/* ------------------------------------------------------------------ */
import { initStoriesTable, attachHeaderSort } from './table.js';

/* ------------------------------------------------------------------ */
/* 4.  Initialize user service                                        */
/* ------------------------------------------------------------------ */
import { initUserService } from './userService.js';
console.log('[main.js] User service module imported');

const userServiceInitResult = initUserService();
console.log('[main.js] User service init result:', userServiceInitResult);

/* ------------------------------------------------------------------ */
/* 5.  Initialize settings functionality                              */
/* ------------------------------------------------------------------ */
import { initSettings } from './settings.js';
console.log('[main.js] Settings module imported');

initStoriesTable({
  tableBody,
  onEditRequested: id => {
        // 1. swap views
        welcomeView.classList.add('hidden');
        adminUI.classList.remove('hidden');
        drugsArea.classList.remove('hidden');
    
        // 2. pick the story
        storyJsonArea.value = '';           // optional: clear first
        storyIdInput.value  = id;
        storyIdInput.dispatchEvent(new Event('change'));
    }
    
});
attachHeaderSort(headThEls);

console.log('[main.js] graph editor mounted', views);



// Back button logic
const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
backToWelcomeBtn.onclick = () => {
    adminUI.classList.add('hidden');
    drugsArea.classList.add('hidden');
    welcomeView.classList.remove('hidden');
    showStatus('');
};

// Utility: Generate scenario ID from name
function generateScenarioId(name, existingIds) {
    let base = name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '') // keep only alphanum and spaces
        .trim()
        .replace(/\s+/g, '-');      // spaces to dashes
    if (!base) base = 'scenario';
    let id = base;
    let counter = 1;
    while (existingIds.includes(id)) {
        id = `${base}-${counter++}`;
    }
    return id;
}


console.log('[main.js] 1-DOM query',
    'tableBody=', !!tableBody, 'headThEls.length=', headThEls.length);

// Debug: Check if settings button exists
const settingsBtnDebug = document.getElementById('settings-btn');
console.log('[main.js] Settings button found:', !!settingsBtnDebug, settingsBtnDebug);

// Initialize settings
console.log('[main.js] About to initialize settings...');
const settingsInitResult = initSettings();
console.log('[main.js] Settings init result:', settingsInitResult);
if (settingsInitResult) {
    console.log('[main.js] settings initialized successfully');
} else {
    console.warn('[main.js] settings initialization failed - some features may not work');
}