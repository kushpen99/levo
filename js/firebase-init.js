import {
    initializeApp
  } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
  import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut,
    onAuthStateChanged
  } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
  import {
    getFirestore, collection, doc, getDoc, getDocs,
    setDoc, deleteDoc, serverTimestamp, query, where, updateDoc, orderBy
  } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
  
  const firebaseConfig = {
    apiKey: "AIzaSyD2cVMm6WNBb8x5Re4Sip5A0h5shu3fayU",
    authDomain: "levo-project-id.firebaseapp.com",
    projectId: "levo-project-id",
    storageBucket: "levo-project-id.firebasestorage.app",
    messagingSenderId: "997714562916",
    appId: "1:997714562916:web:955c75f082fb253c033471",
    measurementId: "G-NN272GRG6F"
  };


  const app  = initializeApp(firebaseConfig);
  const db   = getFirestore(app);
  const auth = getAuth(app);
  
  export {
    app, db, auth,
    GoogleAuthProvider,
    signInWithPopup, signOut, onAuthStateChanged,
    collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp,
    query, where, updateDoc, orderBy
  };
  