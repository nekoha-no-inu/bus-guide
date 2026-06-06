// ======================================
// Firebase 共通初期化
// ※ memo.js / shopping.js / todo.js / scheduler.js から読み込む
// ======================================

// FIREBASE_CONFIG は common.js で定義済み
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();
