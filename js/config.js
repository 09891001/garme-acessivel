// ==========================================
// CONFIG.JS - Configuração do Firebase
// Projeto: Garme Acessível
// ==========================================

// Este arquivo é responsável por:
// 1. Inicializar o Firebase
// 2. Criar a conexão com o Realtime Database
// 3. Disponibilizar o banco globalmente para todo o jogo
// 4. Proteger contra erros de carregamento

(function () {

    // ==========================================
    // 1. Verificação de carregamento do Firebase
    // ==========================================

    if (typeof firebase === "undefined") {
        console.error("❌ Firebase não foi carregado. Verifique os scripts no HTML.");
        return;
    }

    // ==========================================
    // 2. Configuração do Firebase
    // ==========================================

    const firebaseConfig = {
        apiKey: "AIzaSyBxav0baX6bucdYUlw1pRWOFcv9AwtqymY",
        authDomain: "garme-acessivel.firebaseapp.com",
        databaseURL: "https://garme-acessivel-default-rtdb.firebaseio.com",
        projectId: "garme-acessivel",
        storageBucket: "garme-acessivel.firebasestorage.app",
        messagingSenderId: "69205141908",
        appId: "1:69205141908:web:d3ce0b770f699c1a8ac781"
    };

    // ==========================================
    // 3. Inicialização segura do Firebase
    // ==========================================

    try {

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("🔥 Firebase inicializado com sucesso.");
        } else {
            firebase.app();
            console.log("🔥 Firebase já estava inicializado.");
        }

    } catch (erro) {
        console.error("❌ Erro ao inicializar Firebase:", erro);
        return;
    }

    // ==========================================
    // 4. Criação da conexão com o banco
    // ==========================================

    let db;

    try {

        db = firebase.database();

        console.log("📡 Conectado ao Realtime Database.");

    } catch (erro) {

        console.error("❌ Erro ao conectar ao banco:", erro);
        return;

    }

    // ==========================================
    // 5. Disponibiliza o banco globalmente
    // ==========================================

    window.db = db;

    // ==========================================
    // 6. Referências principais usadas no jogo
    // ==========================================

    window.refPlayers = db.ref("players");
    window.refChat = db.ref("chat");
    window.refDesenho = db.ref("desenho");
    window.refRodada = db.ref("rodada");
    window.refSistema = db.ref("sistema");

    console.log("✅ Referências principais criadas.");

    // ==========================================
    // 7. Função utilitária para gerar ID único
    // ==========================================

    window.gerarIdUnico = function () {
        return "player_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    };

    // ==========================================
    // 8. Função para limpar dados do jogo
    // ==========================================

    window.limparDadosJogo = function () {

        if (!window.db) return;

        db.ref("desenho").remove();
        db.ref("chat").remove();

        console.log("🧹 Dados de desenho e chat foram limpos.");

    };

    // ==========================================
    // 9. Função para enviar mensagem no chat
    // ==========================================

    window.enviarMensagemSistema = function (mensagem) {

        if (!window.db) return;

        const dados = {
            nome: "Sistema",
            mensagem: mensagem,
            tipo: "sistema",
            timestamp: Date.now()
        };

        db.ref("chat").push(dados);

    };

    // ==========================================
    // 10. Confirmação final
    // ==========================================

    console.log("🚀 Configuração do Garme Acessível carregada com sucesso.");

})();