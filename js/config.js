// Configuração oficial do seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBxav0baX6bucdYUlw1pRWOFcv9AwtqymY",
  authDomain: "garme-acessivel.firebaseapp.com",
  projectId: "garme-acessivel",
  storageBucket: "garme-acessivel.firebasestorage.app",
  messagingSenderId: "69205141908",
  appId: "1:69205141908:web:d3ce0b770f699c1a8ac781"
};

// Inicializa o Firebase garantindo que ele não tente carregar duas vezes
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase conectado com sucesso!");
    }
} catch (error) {
    console.error("Erro ao inicializar o Firebase: ", error);
}