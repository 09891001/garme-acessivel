// Configurações extraídas do seu console Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBxav0baX6bucdYUlw1pRWOFcv9AwtqymY",
  authDomain: "garme-acessivel.firebaseapp.com",
  databaseURL: "https://garme-acessivel-default-rtdb.firebaseio.com",
  projectId: "garme-acessivel",
  storageBucket: "garme-acessivel.firebasestorage.app",
  messagingSenderId: "69205141908",
  appId: "1:69205141908:web:d3ce0b770f699c1a8ac781"
};

// Inicializa o Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
console.log("🔥 Firebase conectado ao projeto Garme Acessível!");