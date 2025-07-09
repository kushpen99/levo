import {
    initializeApp
  } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
  import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut,
    onAuthStateChanged
  } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
  import {
    getFirestore, collection, doc, getDoc, getDocs,
    setDoc, deleteDoc, serverTimestamp
  } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
  
  const firebaseConfig = {
    apiKey: "AIzaSyClEgpGrVTXT2zQNNDBDg0TNX2F24k6oTg",
    authDomain: "urushka99.firebaseapp.com",
    projectId: "urushka99",
    storageBucket: "urushka99.firebasestorage.app",
    messagingSenderId: "954120822793",
    appId: "1:954120822793:web:6c316b1b178081b56758d8",
    measurementId: "G-5LCB9E7PL9"
  };

  const app  = initializeApp(firebaseConfig);
  const db   = getFirestore(app);
  const auth = getAuth(app);
  
  export {
    app, db, auth,
    GoogleAuthProvider,
    signInWithPopup, signOut, onAuthStateChanged,
    collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp
  };
  