"use strict";

/* =========================================================
   GARME ACESSÍVEL - DESENHO.JS FINAL
========================================================= */

/* =========================================================
   VARIÁVEIS GLOBAIS
========================================================= */

let canvasDesenho = null;
let ctxDesenho = null;

let desenhando = false;
let ultimoX = 0;
let ultimoY = 0;

let espessuraLinha = 3;
let corLinha = "#000000";

let modoDesenhoAtivo = false;

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function inicializarDesenho() {

    canvasDesenho = document.getElementById("quadroDesenho");

    if (!canvasDesenho) return;

    ctxDesenho = canvasDesenho.getContext("2d");

    configurarEventosCanvas();
    ajustarCanvasResponsivo();
}

/* =========================================================
   CANVAS RESPONSIVO
========================================================= */

function ajustarCanvasResponsivo() {

    if (!canvasDesenho) return;

    const largura = canvasDesenho.parentElement.offsetWidth;

    canvasDesenho.width = largura;
    canvasDesenho.height = largura * 0.6;
}

/* =========================================================
   EVENTOS CANVAS
========================================================= */

function configurarEventosCanvas() {

    if (!canvasDesenho) return;

    canvasDesenho.addEventListener("mousedown", iniciarDesenhoMouse);
    canvasDesenho.addEventListener("mousemove", desenharMouse);
    canvasDesenho.addEventListener("mouseup", pararDesenho);

    canvasDesenho.addEventListener("touchstart", iniciarDesenhoTouch);
    canvasDesenho.addEventListener("touchmove", desenharTouch);
    canvasDesenho.addEventListener("touchend", pararDesenho);
}

/* =========================================================
   DESENHO MOUSE
========================================================= */

function iniciarDesenhoMouse(e) {

    if (!modoDesenhoAtivo) return;

    desenhando = true;

    const rect = canvasDesenho.getBoundingClientRect();

    ultimoX = e.clientX - rect.left;
    ultimoY = e.clientY - rect.top;
}

function desenharMouse(e) {

    if (!desenhando) return;
    if (!modoDesenhoAtivo) return;

    const rect = canvasDesenho.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    desenharLinhaLocal(ultimoX, ultimoY, x, y);

    // ENVIO PARA MULTIPLAYER
    if (window.enviarPontoDesenho01) {
        window.enviarPontoDesenho01(x, y);
    }

    ultimoX = x;
    ultimoY = y;
}

/* =========================================================
   DESENHO TOUCH (CELULAR)
========================================================= */

function iniciarDesenhoTouch(e) {

    if (!modoDesenhoAtivo) return;

    desenhando = true;

    const rect = canvasDesenho.getBoundingClientRect();
    const touch = e.touches[0];

    ultimoX = touch.clientX - rect.left;
    ultimoY = touch.clientY - rect.top;
}

function desenharTouch(e) {

    if (!desenhando) return;
    if (!modoDesenhoAtivo) return;

    const rect = canvasDesenho.getBoundingClientRect();
    const touch = e.touches[0];

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    desenharLinhaLocal(ultimoX, ultimoY, x, y);

    if (window.enviarPontoDesenho01) {
        window.enviarPontoDesenho01(x, y);
    }

    ultimoX = x;
    ultimoY = y;
}

function pararDesenho() {
    desenhando = false;
}

/* =========================================================
   DESENHO LOCAL
========================================================= */

function desenharLinhaLocal(x1, y1, x2, y2) {

    if (!ctxDesenho) return;

    ctxDesenho.strokeStyle = corLinha;
    ctxDesenho.lineWidth = espessuraLinha;
    ctxDesenho.lineCap = "round";

    ctxDesenho.beginPath();
    ctxDesenho.moveTo(x1, y1);
    ctxDesenho.lineTo(x2, y2);
    ctxDesenho.stroke();
}

/* =========================================================
   DESENHO REMOTO (OUTROS JOGADORES)
========================================================= */

function desenharPontoRemoto(x, y) {

    desenharLinhaLocal(ultimoX, ultimoY, x, y);

    ultimoX = x;
    ultimoY = y;
}

/* =========================================================
   LIMPAR CANVAS
========================================================= */

function limparQuadroLocal() {

    if (!ctxDesenho) return;

    ctxDesenho.clearRect(
        0,
        0,
        canvasDesenho.width,
        canvasDesenho.height
    );
}

/* =========================================================
   LIMPAR SINCRONIZADO (FIREBASE)
========================================================= */

function limparQuadroSincronizado() {

    limparQuadroLocal();

    if (window.limparDesenhoFirebase01) {
        window.limparDesenhoFirebase01();
    }

    anunciarDesenho("Quadro limpo");
}

/* =========================================================
   CONTROLE DESENHO
========================================================= */

function ativarModoDesenho() {
    modoDesenhoAtivo = true;
    anunciarDesenho("Modo desenho ativado");
}

function desativarModoDesenho() {
    modoDesenhoAtivo = false;
}

/* =========================================================
   ACESSIBILIDADE
========================================================= */

function anunciarDesenho(msg) {

    const area = document.getElementById("areaAcessivel");

    if (!area) return;

    area.innerText = msg;
}

/* =========================================================
   CONTROLE DE LINHA
========================================================= */

function alterarEspessura(valor) {
    espessuraLinha = valor;
}

function alterarCor(cor) {
    corLinha = cor;
}

/* =========================================================
   TECLADO ACESSÍVEL
========================================================= */

let cursorX = 50;
let cursorY = 50;

function desenharTeclado(e) {

    if (!modoDesenhoAtivo) return;

    let novoX = cursorX;
    let novoY = cursorY;

    if (e.key === "ArrowRight") novoX += 5;
    if (e.key === "ArrowLeft") novoX -= 5;
    if (e.key === "ArrowUp") novoY -= 5;
    if (e.key === "ArrowDown") novoY += 5;

    desenharLinhaLocal(cursorX, cursorY, novoX, novoY);

    if (window.enviarPontoDesenho01) {
        window.enviarPontoDesenho01(novoX, novoY);
    }

    cursorX = novoX;
    cursorY = novoY;
}

document.addEventListener("keydown", desenharTeclado);

/* =========================================================
   RESPONSIVO
========================================================= */

function detectarTela() {

    if (!canvasDesenho) return;

    const largura = window.innerWidth;

    espessuraLinha = largura < 600 ? 5 : 3;
}

window.addEventListener("resize", () => {

    ajustarCanvasResponsivo();
    detectarTela();

});

/* =========================================================
   SINCRONIZAÇÃO FIREBASE
========================================================= */

function sincronizarDesenhoCompleto() {

    if (!window.db || !window.firebaseDesenho01) return;

    window.db.ref(firebaseDesenho01 + "/pontos").on("child_added", (snapshot) => {

        const ponto = snapshot.val();
        if (!ponto) return;

        desenharPontoRemoto(ponto.x, ponto.y);

    });

}

/* =========================================================
   RESET COMPLETO
========================================================= */

function resetarDesenhoJogoCompleto() {

    limparQuadroLocal();

    cursorX = 50;
    cursorY = 50;

    desenhando = false;

    espessuraLinha = 3;
    corLinha = "#000000";
}

/* =========================================================
   BLOQUEIO / LIBERAÇÃO
========================================================= */

function bloquearDesenho() {
    modoDesenhoAtivo = false;
}

function liberarDesenho() {
    modoDesenhoAtivo = true;
}

/* =========================================================
   INICIALIZAÇÃO FINAL
========================================================= */

function iniciarDesenhoSistema() {

    inicializarDesenho();
    detectarTela();
    sincronizarDesenhoCompleto();

}

window.addEventListener("load", () => {
    iniciarDesenhoSistema();
});

/* =========================================================
   EXPORT GLOBAL
========================================================= */

window.limparQuadroLocal = limparQuadroLocal;
window.limparQuadroSincronizado = limparQuadroSincronizado;
window.desenharPontoRemoto = desenharPontoRemoto;
window.resetarDesenhoJogoCompleto = resetarDesenhoJogoCompleto;
window.bloquearDesenho = bloquearDesenho;
window.liberarDesenho = liberarDesenho;

/* =========================================================
   LOG FINAL
========================================================= */

console.log("DESENHO.JS FINAL PRONTO E SINCRONIZADO");