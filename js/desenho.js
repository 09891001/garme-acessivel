// ==========================================
// DESENHO.JS - Sistema de Desenho do Garme
// ==========================================
// Responsável por:
// 1. Capturar desenho com mouse ou toque
// 2. Enviar pontos para o Firebase
// 3. Reproduzir desenho de outros jogadores
// 4. Limpar o quadro
// 5. Desenhar objetos automáticos acessíveis
// ==========================================

(function () {

    let canvas = null;
    let ctx = null;

    let desenhando = false;
    let ultimoX = 0;
    let ultimoY = 0;

    let podeDesenhar = false;

    // ==========================================
    // Inicialização do Canvas
    // ==========================================

    function iniciarCanvas() {

        canvas = document.getElementById("quadro");

        if (!canvas) {
            console.warn("Canvas não encontrado.");
            return;
        }

        ctx = canvas.getContext("2d");

        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000000";

        ajustarCanvas();

        registrarEventos();

        ouvirDesenhosFirebase();

        console.log("🎨 Canvas inicializado.");

    }

    // ==========================================
    // Ajuste do canvas para tela
    // ==========================================

    function ajustarCanvas() {

        if (!canvas) return;

        const larguraMax = window.innerWidth * 0.95;
        const alturaMax = window.innerHeight * 0.60;

        canvas.width = larguraMax;
        canvas.height = alturaMax;

    }

    window.addEventListener("resize", ajustarCanvas);

    // ==========================================
    // Eventos de mouse e toque
    // ==========================================

    function registrarEventos() {

        canvas.addEventListener("mousedown", iniciarDesenho);
        canvas.addEventListener("mousemove", moverDesenho);
        canvas.addEventListener("mouseup", pararDesenho);
        canvas.addEventListener("mouseleave", pararDesenho);

        canvas.addEventListener("touchstart", iniciarToque);
        canvas.addEventListener("touchmove", moverToque);
        canvas.addEventListener("touchend", pararDesenho);

    }

    // ==========================================
    // Controle de permissão
    // ==========================================

    window.habilitarDesenho = function () {
        podeDesenhar = true;
    };

    window.desabilitarDesenho = function () {
        podeDesenhar = false;
    };

    // ==========================================
    // Início do desenho
    // ==========================================

    function iniciarDesenho(e) {

        if (!podeDesenhar) return;

        desenhando = true;

        const rect = canvas.getBoundingClientRect();

        ultimoX = e.clientX - rect.left;
        ultimoY = e.clientY - rect.top;

    }

    function moverDesenho(e) {

        if (!desenhando) return;
        if (!podeDesenhar) return;

        const rect = canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        desenharLinhaLocal(ultimoX, ultimoY, x, y);

        enviarLinhaFirebase(ultimoX, ultimoY, x, y);

        ultimoX = x;
        ultimoY = y;

    }

    function pararDesenho() {

        desenhando = false;

    }

    // ==========================================
    // Toque para celular
    // ==========================================

    function iniciarToque(e) {

        if (!podeDesenhar) return;

        e.preventDefault();

        const toque = e.touches[0];
        const rect = canvas.getBoundingClientRect();

        desenhando = true;

        ultimoX = toque.clientX - rect.left;
        ultimoY = toque.clientY - rect.top;

    }

    function moverToque(e) {

        if (!desenhando) return;
        if (!podeDesenhar) return;

        e.preventDefault();

        const toque = e.touches[0];
        const rect = canvas.getBoundingClientRect();

        const x = toque.clientX - rect.left;
        const y = toque.clientY - rect.top;

        desenharLinhaLocal(ultimoX, ultimoY, x, y);

        enviarLinhaFirebase(ultimoX, ultimoY, x, y);

        ultimoX = x;
        ultimoY = y;

    }

    // ==========================================
    // Desenho local no canvas
    // ==========================================

    function desenharLinhaLocal(x1, y1, x2, y2) {

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

    }

    // ==========================================
    // Enviar desenho para Firebase
    // ==========================================

    function enviarLinhaFirebase(x1, y1, x2, y2) {

        if (!window.refDesenho) return;

        refDesenho.push({
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            timestamp: Date.now()
        });

    }

    // ==========================================
    // Ouvir desenho de outros jogadores
    // ==========================================

    function ouvirDesenhosFirebase() {

        if (!window.refDesenho) return;

        refDesenho.on("child_added", function (snapshot) {

            const dados = snapshot.val();

            if (!dados) return;

            if (dados.tipo === "clear") {

                limparQuadroLocal();
                return;

            }

            desenharLinhaLocal(
                dados.x1,
                dados.y1,
                dados.x2,
                dados.y2
            );

        });

    }

    // ==========================================
    // Limpar quadro
    // ==========================================

    window.limparQuadro = function () {

        if (!window.refDesenho) return;

        refDesenho.push({
            tipo: "clear",
            timestamp: Date.now()
        });

    };

    function limparQuadroLocal() {

        if (!canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

    }

    // ==========================================
    // Desenhos automáticos acessíveis
    // ==========================================

    window.escolherDesenhoPronto = function (objeto) {

        limparQuadroLocal();

        switch (objeto) {

            case "casa":
                desenharCasa();
                break;

            case "sol":
                desenharSol();
                break;

            case "bola":
                desenharBola();
                break;

            case "arvore":
                desenharArvore();
                break;

            case "carro":
                desenharCarro();
                break;

            default:
                console.log("Objeto não reconhecido:", objeto);
        }

    };

    function desenharCasa() {

        ctx.strokeRect(200, 200, 200, 150);

        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.lineTo(300, 120);
        ctx.lineTo(400, 200);
        ctx.stroke();

    }

    function desenharSol() {

        ctx.beginPath();
        ctx.arc(300, 200, 60, 0, Math.PI * 2);
        ctx.stroke();

    }

    function desenharBola() {

        ctx.beginPath();
        ctx.arc(300, 250, 80, 0, Math.PI * 2);
        ctx.stroke();

    }

    function desenharArvore() {

        ctx.strokeRect(290, 220, 20, 100);

        ctx.beginPath();
        ctx.arc(300, 200, 60, 0, Math.PI * 2);
        ctx.stroke();

    }

    function desenharCarro() {

        ctx.strokeRect(220, 240, 200, 60);

        ctx.beginPath();
        ctx.arc(260, 300, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(380, 300, 20, 0, Math.PI * 2);
        ctx.stroke();

    }

    // ==========================================
    // Inicialização automática
    // ==========================================

    document.addEventListener("DOMContentLoaded", iniciarCanvas);

})();