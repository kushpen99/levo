// Helper script to set up initial language documents in Firestore
// Run this in the browser console or as a Node.js script

const englishLanguage = {
  code: "en",
  name: "English",
  direction: "ltr",
  isActive: true,
  isDefault: true,
  translations: {
    story_portal: "Story Portal",
    create_story: "Create Story",
    settings: "Settings",
    language: "Language",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    preview: "Preview",
    loading: "Loading",
    error: "Error",
    success: "Success",
    story_title: "Story Title",
    story_id: "Story ID",
    story_type: "Type",
    story_status: "Status",
    draft: "Draft",
    review: "Review",
    published: "Published",
    archived: "Archived",
    save_story: "Save Story",
    delete_story: "Delete Story",
    create_new_story: "Create New Story",
    from_scratch: "From Scratch",
    with_ai: "With AI",
    application_language: "Application Language",
    choose_language: "Choose the language for the application interface",
    language_management: "Language Management",
    add_new_language: "Add New Language",
    edit_translations: "Edit Translations",
    language_code: "Language Code",
    language_name: "Language Name",
    text_direction: "Text Direction",
    set_as_default: "Set as default language",
    left_to_right: "Left to Right (LTR)",
    right_to_left: "Right to Left (RTL)",
    no_languages: "No languages available",
    no_languages_found: "No languages found. Please add languages first.",
    failed_load_languages: "Failed to load languages",
    changing_language: "Changing language...",
    language_not_found: "Language not found",
    language_changed: "Language changed to",
    failed_change_language: "Failed to change language",
    please_select_language: "Please select a language first",
    language_data_not_found: "Language data not found",
    please_fill_fields: "Please fill in all required fields",
    language_code_exists: "Language code already exists",
    saving: "Saving...",
    language_saved: "Language saved successfully!",
    failed_save_language: "Failed to save language",
    saving_translations: "Saving translations...",
    translations_saved: "Translations saved successfully!",
    failed_save_translations: "Failed to save translations"
  },
  createdAt: new Date()
};

const hebrewLanguage = {
  code: "he",
  name: "עברית",
  direction: "rtl",
  isActive: true,
  isDefault: false,
  translations: {
    story_portal: "פורטל סיפורים",
    create_story: "צור סיפור",
    settings: "הגדרות",
    language: "שפה",
    back: "חזור",
    save: "שמור",
    cancel: "ביטול",
    delete: "מחק",
    edit: "ערוך",
    preview: "תצוגה מקדימה",
    loading: "טוען",
    error: "שגיאה",
    success: "הצלחה",
    story_title: "כותרת הסיפור",
    story_id: "מזהה הסיפור",
    story_type: "סוג",
    story_status: "סטטוס",
    draft: "טיוטה",
    review: "בבדיקה",
    published: "מפורסם",
    archived: "בארכיון",
    save_story: "שמור סיפור",
    delete_story: "מחק סיפור",
    create_new_story: "צור סיפור חדש",
    from_scratch: "מאפס",
    with_ai: "עם בינה מלאכותית",
    application_language: "שפת האפליקציה",
    choose_language: "בחר את השפה לממשק האפליקציה",
    language_management: "ניהול שפות",
    add_new_language: "הוסף שפה חדשה",
    edit_translations: "ערוך תרגומים",
    language_code: "קוד השפה",
    language_name: "שם השפה",
    text_direction: "כיוון הטקסט",
    set_as_default: "הגדר כשפה ברירת מחדל",
    left_to_right: "שמאל לימין (LTR)",
    right_to_left: "ימין לשמאל (RTL)",
    no_languages: "אין שפות זמינות",
    no_languages_found: "לא נמצאו שפות. אנא הוסף שפות תחילה.",
    failed_load_languages: "שגיאה בטעינת שפות",
    changing_language: "מחליף שפה...",
    language_not_found: "השפה לא נמצאה",
    language_changed: "השפה השתנתה ל",
    failed_change_language: "שגיאה בהחלפת שפה",
    please_select_language: "אנא בחר שפה תחילה",
    language_data_not_found: "נתוני השפה לא נמצאו",
    please_fill_fields: "אנא מלא את כל השדות הנדרשים",
    language_code_exists: "קוד השפה כבר קיים",
    saving: "שומר...",
    language_saved: "השפה נשמרה בהצלחה!",
    failed_save_language: "שגיאה בשמירת השפה",
    saving_translations: "שומר תרגומים...",
    translations_saved: "התרגומים נשמרו בהצלחה!",
    failed_save_translations: "שגיאה בשמירת התרגומים"
  },
  createdAt: new Date()
};

// Instructions for setting up languages in Firestore:
console.log('To set up languages in Firestore, follow these steps:');
console.log('');
console.log('1. Go to your Firebase Console');
console.log('2. Navigate to Firestore Database');
console.log('3. Create a new collection called "languages"');
console.log('4. Add two documents with the following data:');
console.log('');
console.log('Document 1 - ID: "en"');
console.log(JSON.stringify(englishLanguage, null, 2));
console.log('');
console.log('Document 2 - ID: "he"');
console.log(JSON.stringify(hebrewLanguage, null, 2));
console.log('');
console.log('Or you can use the Firebase Admin SDK to programmatically add these documents.');

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { englishLanguage, hebrewLanguage };
} 