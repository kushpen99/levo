# User Account Structure

## Overview
The application now includes a user account system that stores user preferences and settings in Firestore. Each authenticated user gets their own document in the `users` collection.

## Firestore Collection: `users`

### Document ID
- Uses the Firebase Auth UID as the document ID
- Example: `users/{firebase-auth-uid}`

### Document Structure
```json
{
  "uid": "firebase-auth-uid",
  "email": "user@example.com",
  "displayName": "User Name",
  "photoURL": "https://example.com/photo.jpg",
  "language": "en",
  "createdAt": "2025-07-13T12:00:00.000Z",
  "updatedAt": "2025-07-13T12:00:00.000Z"
}
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `uid` | string | Firebase Auth UID | `"abc123def456"` |
| `email` | string | User's email address | `"user@example.com"` |
| `displayName` | string | User's display name | `"John Doe"` |
| `photoURL` | string | User's profile photo URL | `"https://..."` |
| `language` | string | User's preferred language code | `"en"`, `"he"`, `"es"` |
| `createdAt` | timestamp | When the user account was created | `2025-07-13T12:00:00.000Z` |
| `updatedAt` | timestamp | When the user account was last updated | `2025-07-13T12:00:00.000Z` |

## Language Settings

### Supported Language Codes
- `en` - English (default)
- `he` - Hebrew
- `es` - Spanish
- `fr` - French
- `ar` - Arabic
- And any other language codes you add to the `languages` collection

### How Language Preferences Work
1. When a user first signs in, a default language of `"en"` is set
2. Users can change their language preference in the Settings panel
3. Language preferences are stored per user account
4. If no user is logged in, language changes are temporary and not saved
5. Language preferences persist across sessions when logged in

## User Service API

### Key Functions
- `getUserSetting(key, defaultValue)` - Get a user setting
- `setUserSetting(key, value)` - Set a user setting
- `isUserLoggedIn()` - Check if user is authenticated
- `getCurrentUser()` - Get current user object
- `getUserData()` - Get user's Firestore data

### Example Usage
```javascript
import { getUserSetting, setUserSetting, isUserLoggedIn } from './userService.js';

// Get user's language preference
const language = getUserSetting('language', 'en');

// Set user's language preference
await setUserSetting('language', 'he');

// Check if user is logged in
if (isUserLoggedIn()) {
    // User is authenticated
}
```

## Security Rules (Recommended)

For the `users` collection, you should set up Firestore security rules like this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures users can only read and write their own user documents.

## Migration from localStorage

The application previously stored language preferences in localStorage. With this new system:

1. **Logged-in users**: Language preferences are now stored in their Firestore user document
2. **Non-logged-in users**: Language changes are temporary and not persisted
3. **First-time users**: Get a default language of "en" when they first sign in

## Benefits

1. **Cross-device sync**: Language preferences sync across all devices when logged in
2. **User-specific settings**: Each user can have their own preferences
3. **Scalable**: Easy to add more user settings in the future
4. **Secure**: Settings are protected by Firebase Auth
5. **Persistent**: Settings survive browser data clearing 