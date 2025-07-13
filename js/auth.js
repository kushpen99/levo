import * as fb from './firebase-init.js';

export function attachAuthUI({
  signInBtn, signOutBtn, welcomeView, adminUI, drugsArea,
  onLogin
}) {
  signInBtn.onclick  = () =>
    fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider());

  signOutBtn.onclick = () => fb.signOut(fb.auth);

  fb.onAuthStateChanged(fb.auth, user => {
    const logged = !!user;
    signInBtn.classList.toggle('hidden', logged);
    signOutBtn.classList.toggle('hidden', !logged);

    // basic view-state logic
    adminUI.classList.add('hidden');
    drugsArea.classList.add('hidden');
    welcomeView.classList.toggle('hidden', !logged);

    if (logged) onLogin && onLogin(user);   // callback to load stories etc.
  });
}