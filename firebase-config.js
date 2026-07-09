// Firebase接続設定です。Firebaseを使う場合は enabled を true にして各値を差し替えてください。
window.firebaseConsentConfig = {
  enabled: false,
  salonId: "default-salon",
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
  },
};
