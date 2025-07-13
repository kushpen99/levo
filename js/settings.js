import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from './firebase-init.js';
import { getUserSetting, setUserSetting, isUserLoggedIn } from './userService.js';

console.log('=== SETTINGS.JS STARTING ===');

/**
 * Settings Manager Class
 * Handles all settings-related functionality in a modular way
 */
class SettingsManager {
    constructor() {
        this.currentLanguage = 'en';
        this.availableLanguages = [];
        this.elements = {};
        this.isInitialized = false;
    }

    /**
     * Initialize the settings manager
     * @returns {boolean} True if initialization was successful
     */
    init() {
        console.log('[SettingsManager] Starting initialization...');
        try {
            console.log('[SettingsManager] Getting DOM elements...');
            this._getDOMElements();
            console.log('[SettingsManager] DOM elements found:', Object.keys(this.elements));
            
            console.log('[SettingsManager] Binding event listeners...');
            this._bindEventListeners();
            console.log('[SettingsManager] Event listeners bound successfully');
            
            console.log('[SettingsManager] Loading saved language...');
            this._loadSavedLanguage();
            console.log('[SettingsManager] Saved language loaded:', this.currentLanguage);
            
            this.isInitialized = true;
            console.log('[SettingsManager] Initialized successfully');
            return true;
        } catch (error) {
            console.error('[SettingsManager] Initialization failed:', error);
            return false;
        }
    }

    /**
     * Get all required DOM elements
     * @private
     */
    _getDOMElements() {
        const requiredElements = {
            settingsBtn: 'settings-btn',
            backFromSettingsBtn: 'back-from-settings-btn',
            settingsArea: 'settings-area',
            welcomeView: 'welcome-view',
            languageSelect: 'language-select',
            languageStatus: 'language-status',
            addLanguageBtn: 'add-language-btn'
        };

        for (const [key, id] of Object.entries(requiredElements)) {
            console.log(`[SettingsManager] Looking for element: ${id}`);
            const element = document.getElementById(id);
            if (!element) {
                console.error(`[SettingsManager] Element not found: ${id}`);
                throw new Error(`Required DOM element not found: ${id}`);
            }
            console.log(`[SettingsManager] Found element: ${id}`, element);
            this.elements[key] = element;
        }
    }

    /**
     * Bind all event listeners
     * @private
     */
    _bindEventListeners() {
        console.log('[SettingsManager] Binding settings button click...');
        // Settings button click
        this.elements.settingsBtn.addEventListener('click', (e) => {
            console.log('[SettingsManager] Settings button clicked!', e);
            this._showSettingsView();
        });

        console.log('[SettingsManager] Binding back from settings button...');
        // Back from settings button
        this.elements.backFromSettingsBtn.addEventListener('click', () => {
            console.log('[SettingsManager] Back from settings button clicked');
            this._hideSettingsView();
        });

        console.log('[SettingsManager] Binding language select change...');
        // Language select change
        this.elements.languageSelect.addEventListener('change', (e) => {
            console.log('[SettingsManager] Language select changed:', e.target.value);
            const newLanguage = e.target.value;
            if (newLanguage && newLanguage !== this.currentLanguage) {
                this.changeLanguage(newLanguage);
            }
        });

        console.log('[SettingsManager] Binding add language button...');
        // Add language button
        this.elements.addLanguageBtn.addEventListener('click', () => {
            console.log('[SettingsManager] Add language button clicked');
            this._showAddLanguageModal();
        });

        console.log('[SettingsManager] Edit translations button removed - simplified structure');
    }

    /**
     * Load saved language from user settings
     * @private
     */
    _loadSavedLanguage() {
        if (isUserLoggedIn()) {
            const savedLanguage = getUserSetting('language', 'en');
            this.currentLanguage = savedLanguage;
            console.log('[SettingsManager] Loaded language from user settings:', savedLanguage);
        } else {
            console.log('[SettingsManager] No user logged in, using default language: en');
            this.currentLanguage = 'en';
        }
    }

    /**
     * Show settings view
     * @private
     */
    _showSettingsView() {
        console.log('[SettingsManager] Showing settings view...');
        console.log('[SettingsManager] Welcome view element:', this.elements.welcomeView);
        console.log('[SettingsManager] Settings area element:', this.elements.settingsArea);
        
        this.elements.welcomeView.classList.add('hidden');
        this.elements.settingsArea.classList.remove('hidden');
        
        // Check if user is logged in
        if (!isUserLoggedIn()) {
            this._showStatus('Please log in to save your language preferences', 'info');
        }
        
        console.log('[SettingsManager] Classes updated, loading languages...');
        this.loadLanguages();
    }

    /**
     * Hide settings view
     * @private
     */
    _hideSettingsView() {
        this.elements.settingsArea.classList.add('hidden');
        this.elements.welcomeView.classList.remove('hidden');
    }

    /**
     * Load available languages from Firestore
     */
    async loadLanguages() {
        try {
            this.elements.languageSelect.innerHTML = '<option value="">Loading languages...</option>';
            
            const languagesQuery = query(collection(db, 'languages'), where('isActive', '==', true));
            const snapshot = await getDocs(languagesQuery);
            
            this.availableLanguages = [];
            this.elements.languageSelect.innerHTML = '';
            
            snapshot.forEach(doc => {
                const languageData = doc.data();
                this.availableLanguages.push({
                    id: doc.id,
                    ...languageData
                });
                
                const option = document.createElement('option');
                option.value = languageData.code;
                option.textContent = languageData.name;
                if (languageData.code === this.currentLanguage) {
                    option.selected = true;
                }
                this.elements.languageSelect.appendChild(option);
            });
            
            if (this.availableLanguages.length === 0) {
                this.elements.languageSelect.innerHTML = '<option value="">No languages available</option>';
                this._showStatus('No languages found. Please add languages first.', 'error');
            } else {
                this._showStatus(`Loaded ${this.availableLanguages.length} language(s)`, 'success');
            }
        } catch (error) {
            console.error('[SettingsManager] Error loading languages:', error);
            this.elements.languageSelect.innerHTML = '<option value="">Error loading languages</option>';
            this._showStatus('Failed to load languages', 'error');
        }
    }

    /**
     * Change application language
     * @param {string} languageCode - The language code to change to
     */
    async changeLanguage(languageCode) {
        try {
            this._showStatus('Changing language...', 'info');
            
            // Find the language data
            const languageData = this.availableLanguages.find(lang => lang.code === languageCode);
            if (!languageData) {
                this._showStatus('Language not found', 'error');
                return;
            }
            
            // Save to user settings
            if (isUserLoggedIn()) {
                await setUserSetting('language', languageCode);
                console.log('[SettingsManager] Language saved to user settings:', languageCode);
            } else {
                console.log('[SettingsManager] No user logged in, language not saved');
            }
            this.currentLanguage = languageCode;
            
            // Update UI direction if needed
            document.documentElement.dir = languageData.direction || 'ltr';
            document.documentElement.lang = languageCode;
            
            if (isUserLoggedIn()) {
                this._showStatus(`Language changed to ${languageData.name} (saved to your account)`, 'success');
            } else {
                this._showStatus(`Language changed to ${languageData.name} (not saved - please log in)`, 'info');
            }
            
            // Note: Language preference is now saved to user account
            // No page reload needed since we're not applying translations
            
        } catch (error) {
            console.error('[SettingsManager] Error changing language:', error);
            this._showStatus('Failed to change language', 'error');
        }
    }



    /**
     * Show add language modal
     * @private
     */
    _showAddLanguageModal() {
        const modal = this._createModal({
            title: 'Add New Language',
            content: this._getAddLanguageFormHTML(),
            onSave: (modal) => this._saveNewLanguage(modal),
            onCancel: (modal) => modal.remove()
        });
    }

    /**
     * Get HTML for add language form
     * @private
     */
    _getAddLanguageFormHTML() {
        return `
            <div class="space-y-3">
                <div>
                    <label class="block font-semibold mb-1">Language Code</label>
                    <input id="new-lang-code" type="text" class="border rounded px-3 py-2 w-full" placeholder="e.g., es, fr, ar" />
                </div>
                <div>
                    <label class="block font-semibold mb-1">Language Name</label>
                    <input id="new-lang-name" type="text" class="border rounded px-3 py-2 w-full" placeholder="e.g., Spanish, Français, العربية" />
                </div>
                <div>
                    <label class="block font-semibold mb-1">Text Direction</label>
                    <select id="new-lang-direction" class="border rounded px-3 py-2 w-full">
                        <option value="ltr">Left to Right (LTR)</option>
                        <option value="rtl">Right to Left (RTL)</option>
                    </select>
                </div>
                <div class="flex items-center">
                    <input id="new-lang-default" type="checkbox" class="mr-2" />
                    <label for="new-lang-default">Set as default language</label>
                </div>
            </div>
        `;
    }

    /**
     * Save new language to Firestore
     * @param {HTMLElement} modal - The modal element
     * @private
     */
    async _saveNewLanguage(modal) {
        const code = modal.querySelector('#new-lang-code').value.trim();
        const name = modal.querySelector('#new-lang-name').value.trim();
        const direction = modal.querySelector('#new-lang-direction').value;
        const isDefault = modal.querySelector('#new-lang-default').checked;
        const statusEl = modal.querySelector('#modal-status');
        
        if (!code || !name) {
            this._updateModalStatus(statusEl, 'Please fill in all required fields', 'error');
            return;
        }
        
        try {
            this._updateModalStatus(statusEl, 'Saving...', 'info');
            
            // Check if language code already exists
            const existingQuery = query(collection(db, 'languages'), where('code', '==', code));
            const existingSnapshot = await getDocs(existingQuery);
            
            if (!existingSnapshot.empty) {
                this._updateModalStatus(statusEl, 'Language code already exists', 'error');
                return;
            }
            
            // If this is default, unset other defaults
            if (isDefault) {
                const defaultQuery = query(collection(db, 'languages'), where('isDefault', '==', true));
                const defaultSnapshot = await getDocs(defaultQuery);
                for (const doc of defaultSnapshot.docs) {
                    await updateDoc(doc.ref, { isDefault: false });
                }
            }
            
            // Create new language document
            const newLanguage = {
                code,
                name,
                direction,
                isActive: true,
                isDefault
            };
            
            await setDoc(doc(collection(db, 'languages'), code), newLanguage);
            
            this._updateModalStatus(statusEl, 'Language saved successfully!', 'success');
            
            setTimeout(() => {
                modal.remove();
                this.loadLanguages();
            }, 1500);
            
        } catch (error) {
            console.error('[SettingsManager] Error saving language:', error);
            this._updateModalStatus(statusEl, 'Failed to save language', 'error');
        }
    }



    /**
     * Create a modal with standard structure
     * @param {Object} options - Modal options
     * @private
     */
    _createModal(options) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded shadow w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <h2 class="text-xl font-semibold mb-4">${options.title}</h2>
                ${options.content}
                <div class="flex items-center space-x-2 mt-4">
                    <button id="modal-save-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Save</button>
                    <button id="modal-cancel-btn" class="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">Cancel</button>
                </div>
                <p id="modal-status" class="mt-2 text-sm"></p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('#modal-save-btn').addEventListener('click', () => options.onSave(modal));
        modal.querySelector('#modal-cancel-btn').addEventListener('click', () => options.onCancel(modal));
        
        return modal;
    }

    /**
     * Update modal status message
     * @param {HTMLElement} statusEl - Status element
     * @param {string} message - Status message
     * @param {string} type - Status type
     * @private
     */
    _updateModalStatus(statusEl, message, type = 'info') {
        const statusClasses = {
            success: 'text-green-600',
            error: 'text-red-600',
            info: 'text-blue-600'
        };
        
        statusEl.textContent = message;
        statusEl.className = `mt-2 text-sm ${statusClasses[type] || statusClasses.info}`;
    }

    /**
     * Show status message in settings area
     * @param {string} message - Status message
     * @param {string} type - Status type
     * @private
     */
    _showStatus(message, type = 'info') {
        const statusClasses = {
            success: 'text-green-600',
            error: 'text-red-600',
            info: 'text-blue-600'
        };
        
        this.elements.languageStatus.textContent = message;
        this.elements.languageStatus.className = `text-sm ${statusClasses[type] || statusClasses.info}`;
        
        // Auto-clear after 5 seconds
        setTimeout(() => {
            this.elements.languageStatus.textContent = '';
        }, 5000);
    }

    /**
     * Get current language
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get current language data
     * @returns {Object|null} Current language data
     */
    getLanguageData() {
        return this.availableLanguages.find(lang => lang.code === this.currentLanguage) || null;
    }

    /**
     * Check if settings manager is initialized
     * @returns {boolean} True if initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Create singleton instance
const settingsManager = new SettingsManager();

// Export initialization function
export function initSettings() {
    return settingsManager.init();
}

// Export utility functions
export function getCurrentLanguage() {
    return settingsManager.getCurrentLanguage();
}

export function getLanguageData() {
    return settingsManager.getLanguageData();
}

export function isSettingsReady() {
    return settingsManager.isReady();
} 