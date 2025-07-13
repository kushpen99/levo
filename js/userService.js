import { db, collection, doc, getDoc, setDoc, updateDoc, auth } from './firebase-init.js';

console.log('=== USER SERVICE STARTING ===');

/**
 * User Service Class
 * Handles user account management and settings storage
 */
class UserService {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the user service
     * @returns {boolean} True if initialization was successful
     */
    init() {
        console.log('[UserService] Starting initialization...');
        try {
            // Listen for auth state changes
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('[UserService] User signed in:', user.uid);
                    this.currentUser = user;
                    this.loadUserData();
                } else {
                    console.log('[UserService] User signed out');
                    this.currentUser = null;
                    this.userData = null;
                }
            });
            
            this.isInitialized = true;
            console.log('[UserService] Initialized successfully');
            return true;
        } catch (error) {
            console.error('[UserService] Initialization failed:', error);
            return false;
        }
    }

    /**
     * Load or create user data from Firestore
     * @private
     */
    async loadUserData() {
        if (!this.currentUser) {
            console.log('[UserService] No user logged in, skipping user data load');
            return;
        }

        try {
            console.log('[UserService] Loading user data for:', this.currentUser.uid);
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                this.userData = userDoc.data();
                console.log('[UserService] User data loaded:', this.userData);
            } else {
                // Create new user document
                console.log('[UserService] Creating new user document');
                this.userData = {
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    displayName: this.currentUser.displayName,
                    photoURL: this.currentUser.photoURL,
                    language: 'en', // Default language
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                await setDoc(userDocRef, this.userData);
                console.log('[UserService] New user document created');
            }
        } catch (error) {
            console.error('[UserService] Error loading user data:', error);
        }
    }

    /**
     * Update user settings
     * @param {Object} settings - Settings to update
     */
    async updateUserSettings(settings) {
        if (!this.currentUser) {
            console.error('[UserService] No user logged in, cannot update settings');
            return false;
        }

        try {
            console.log('[UserService] Updating user settings:', settings);
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            
            const updateData = {
                ...settings,
                updatedAt: new Date()
            };

            await updateDoc(userDocRef, updateData);
            
            // Update local user data
            this.userData = {
                ...this.userData,
                ...updateData
            };
            
            console.log('[UserService] User settings updated successfully');
            return true;
        } catch (error) {
            console.error('[UserService] Error updating user settings:', error);
            return false;
        }
    }

    /**
     * Get user setting by key
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if setting doesn't exist
     * @returns {*} Setting value or default
     */
    getUserSetting(key, defaultValue = null) {
        if (!this.userData) {
            console.log(`[UserService] No user data available, returning default for ${key}`);
            return defaultValue;
        }
        
        const value = this.userData[key];
        console.log(`[UserService] Getting setting ${key}:`, value !== undefined ? value : defaultValue);
        return value !== undefined ? value : defaultValue;
    }

    /**
     * Set user setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    async setUserSetting(key, value) {
        console.log(`[UserService] Setting ${key} to:`, value);
        return await this.updateUserSettings({ [key]: value });
    }

    /**
     * Get current user
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get user data
     * @returns {Object|null} User data object or null
     */
    getUserData() {
        return this.userData;
    }

    /**
     * Check if user service is ready
     * @returns {boolean} True if initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Check if user is logged in
     * @returns {boolean} True if user is logged in
     */
    isLoggedIn() {
        return !!this.currentUser;
    }
}

// Create singleton instance
const userService = new UserService();

// Export initialization function
export function initUserService() {
    return userService.init();
}

// Export user service instance
export { userService };

// Export convenience functions
export function getCurrentUser() {
    return userService.getCurrentUser();
}

export function getUserData() {
    return userService.getUserData();
}

export function getUserSetting(key, defaultValue = null) {
    return userService.getUserSetting(key, defaultValue);
}

export function setUserSetting(key, value) {
    return userService.setUserSetting(key, value);
}

export function isUserServiceReady() {
    return userService.isReady();
}

export function isUserLoggedIn() {
    return userService.isLoggedIn();
} 