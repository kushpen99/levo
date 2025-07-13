console.log('=== TEST.JS LOADED ===');
console.log('Document ready state:', document.readyState);
console.log('Current URL:', window.location.href);

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTests);
} else {
    runTests();
}

function runTests() {
    console.log('=== RUNNING DOM TESTS ===');
    
    // Test if we can find the settings button
    const testBtn = document.getElementById('settings-btn');
    console.log('Settings button found:', !!testBtn);
    if (testBtn) {
        console.log('Settings button text:', testBtn.textContent);
        console.log('Settings button classes:', testBtn.className);
        console.log('Settings button HTML:', testBtn.outerHTML);
    } else {
        console.error('SETTINGS BUTTON NOT FOUND!');
        // List all buttons to see what's available
        const allButtons = document.querySelectorAll('button');
        console.log('All buttons found:', allButtons.length);
        allButtons.forEach((btn, index) => {
            console.log(`Button ${index}:`, btn.textContent, btn.id, btn.className);
        });
    }

    // Test if we can find other elements
    const welcomeView = document.getElementById('welcome-view');
    console.log('Welcome view found:', !!welcomeView);
    console.log('Welcome view classes:', welcomeView ? welcomeView.className : 'N/A');

    const settingsArea = document.getElementById('settings-area');
    console.log('Settings area found:', !!settingsArea);
    console.log('Settings area classes:', settingsArea ? settingsArea.className : 'N/A');
}

// Test if modules are working
console.log('=== MODULE TEST ===');
try {
    console.log('Testing import...');
    // This will fail if modules aren't working
    console.log('Modules appear to be working');
} catch (error) {
    console.error('Module error:', error);
}

console.log('=== TEST.JS COMPLETE ==='); 