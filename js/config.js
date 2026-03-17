/**
 * ATENÇÃO - SEGURANÇA TOTVS ATS:
 * No console do Firebase (Realtime Database > Regras), certifique-se de que esteja:
 * {
 * "rules": {
 * ".read": true,
 * ".write": true
 * }
 * }
 */

// Configuração oficial do projeto Garme Acessível
var firebaseConfig = {
    apiKey: "AIzaSyBxav0baX6bucdYUlw1pRWOFcv9AwtqymY",
    authDomain: "garme-acessivel.firebaseapp.com",
    databaseURL: "https://garme-acessivel-default-rtdb.firebaseio.com",
    projectId: "garme-acessivel",
    storageBucket: "garme-acessivel.firebasestorage.app",
    messagingSenderId: "69205141908",
    appId: "1:69205141908:web:d3ce0b770f699c1a8ac781"
};

// Inicializa o Firebase (Utilizando o SDK compatível com scripts globais)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Exporta a instância do Realtime Database para uso global nos scripts jogo.js
var db = firebase.database();

console.log("✅ Firebase conectado com sucesso ao projeto: " + firebaseConfig.projectId);