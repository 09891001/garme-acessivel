/* =========================================================
   GARME ACESSÍVEL - DESENHO.JS
   Controle completo de canvas acessível sincronizado
========================================================= */

"use strict";

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

    const rect = canvasDesenho.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    desenharLinhaLocal(ultimoX, ultimoY, x, y);

    if (window.enviarPontoDesenho) {
        window.enviarPontoDesenho(x, y);
    }

    ultimoX = x;
    ultimoY = y;

}

/* =========================================================
   DESENHO TOUCH
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

    const rect = canvasDesenho.getBoundingClientRect();

    const touch = e.touches[0];

    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    desenharLinhaLocal(ultimoX, ultimoY, x, y);

    if (window.enviarPontoDesenho) {
        window.enviarPontoDesenho(x, y);
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
   DESENHO REMOTO
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
   LIMPAR SINCRONIZADO
========================================================= */

function limparQuadroSincronizado() {

    limparQuadroLocal();

    if (window.refDesenho) {
        window.refDesenho.set(null);
    }

}

/* =========================================================
   CONTROLE DESENHO
========================================================= */

function ativarModoDesenho() {

    modoDesenhoAtivo = true;

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
   BOTÃO LIMPAR
========================================================= */

function botaoLimparQuadro() {

    const btn = document.getElementById("btnLimparQuadro");

    if (!btn) return;

    btn.addEventListener("click", () => {

        limparQuadroSincronizado();

        anunciarDesenho("Quadro limpo");

    });

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

function configurarTecladoAcessivel() {

    document.addEventListener("keydown", (e) => {

        if (!modoDesenhoAtivo) return;

        if (e.key === "Delete") {

            limparQuadroSincronizado();

        }

        if (e.altKey && e.key === "ArrowUp") {

            espessuraLinha++;

        }

        if (e.altKey && e.key === "ArrowDown") {

            espessuraLinha--;

            if (espessuraLinha < 1) {
                espessuraLinha = 1;
            }

        }

    });

}

/* =========================================================
   DESENHO POR TECLADO
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

    if (window.enviarPontoDesenho) {
        window.enviarPontoDesenho(novoX, novoY);
    }

    cursorX = novoX;
    cursorY = novoY;

}

document.addEventListener("keydown", desenharTeclado);

/* =========================================================
   DETECTAR TAMANHO TELA
========================================================= */

function detectarTela() {

    if (!canvasDesenho) return;

    const largura = window.innerWidth;

    if (largura < 600) {

        espessuraLinha = 5;

    } else {

        espessuraLinha = 3;

    }

}

/* =========================================================
   REINICIAR DESENHO
========================================================= */

function resetarDesenhoCompleto() {

    limparQuadroLocal();

    cursorX = 50;
    cursorY = 50;

    espessuraLinha = 3;

}

/* =========================================================
   EVENTOS WINDOW
========================================================= */

window.addEventListener("resize", () => {

    ajustarCanvasResponsivo();
    detectarTela();

});

/* =========================================================
   SINCRONIZAÇÃO
========================================================= */

function sincronizarDesenhoCompleto() {

    if (!window.refDesenho) return;

    window.refDesenho.child("pontos").on("child_added", (snapshot) => {

        const ponto = snapshot.val();

        desenharPontoRemoto(ponto.x, ponto.y);

    });

}

/* =========================================================
   MODO DESENHISTA
========================================================= */

function definirDesenhista(valor) {

    if (valor) {

        ativarModoDesenho();

    } else {

        desativarModoDesenho();

    }

}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarDesenhoSistema() {

    inicializarDesenho();
    botaoLimparQuadro();
    configurarTecladoAcessivel();
    detectarTela();
    sincronizarDesenhoCompleto();

}

/* =========================================================
   CARREGAMENTO
========================================================= */

window.addEventListener("load", () => {

    iniciarDesenhoSistema();

});
/* =========================================================
   RESET COMPLETO DO DESENHO (INTEGRAÇÃO COM JOGO.JS)
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
   BLOQUEIO DE DESENHO QUANDO NÃO FOR DESENHISTA
========================================================= */

function bloquearDesenho() {

    modoDesenhoAtivo = false;

}

function liberarDesenho() {

    modoDesenhoAtivo = true;

}

/* =========================================================
   GARANTIA DE SINCRONIZAÇÃO FIREBASE
========================================================= */

function limparFirebaseDesenho() {

    if (window.refDesenho) {

        window.refDesenho.set(null);

    }

}

/* =========================================================
   SINCRONIZAÇÃO COMPLETA
========================================================= */

function sincronizacaoCompletaDesenho() {

    sincronizarDesenhoCompleto();

}

/* =========================================================
   GARANTIA FUNÇÃO GLOBAL
========================================================= */

window.limparQuadroLocal = limparQuadroLocal;
window.limparQuadroSincronizado = limparQuadroSincronizado;
window.desenharPontoRemoto = desenharPontoRemoto;
window.resetarDesenhoJogoCompleto = resetarDesenhoJogoCompleto;
window.definirDesenhista = definirDesenhista;
window.bloquearDesenho = bloquearDesenho;
window.liberarDesenho = liberarDesenho;

/* =========================================================
   GARANTIA FINAL
========================================================= */

function garantirDesenhoSistema() {

    if (!canvasDesenho) {

        inicializarDesenho();

    }

}

setTimeout(garantirDesenhoSistema, 1500);

/* =========================================================
   SISTEMA CARREGADO
========================================================= */

console.log("DESENHO.JS CARREGADO COMPLETO");