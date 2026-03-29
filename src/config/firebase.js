const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCAT0zVEs1POMHWVR7ZEVlX8qQ3kztxoRs",
  authDomain:        "clashquebrada-a1946.firebaseapp.com",
  databaseURL:       "https://clashquebrada-a1946-default-rtdb.firebaseio.com",
  projectId:         "clashquebrada-a1946",
  storageBucket:     "clashquebrada-a1946.firebasestorage.app",
  messagingSenderId: "71493294988",
  appId:             "1:71493294988:web:ee50cd5fd8d27d2ce594a9"
};

let _db = null;
let _auth = null;

export function initFirebase() {
  if (_db) return true;
  if (!FIREBASE_CONFIG.databaseURL) return false;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.database();
    try { _auth = firebase.auth(); } catch(e) { _auth = null; }
    return true;
  } catch(e) { return false; }
}

export function getDb() { return _db; }
export function getAuth() { return _auth; }

export function fbKey(email) {
  return btoa(email.toLowerCase().trim()).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
