import * as firebase from 'firebase'
require('@firebase/firestore')

var firebaseConfig = {
    apiKey: "AIzaSyAAIFQDtwy90wFo3JpFpY0R-U_NDOhrgx0",
    authDomain: "wily-app-3cf82.firebaseapp.com",
    projectId: "wily-app-3cf82",
    storageBucket: "wily-app-3cf82.appspot.com",
    messagingSenderId: "980200731030",
    appId: "1:980200731030:web:40d64990cf3d1b59556db7"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  export default firebase.firestore();