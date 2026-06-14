"use strict";
var canvas01, ctx01, desenhando01 = false, ultimoX01 = 0, ultimoY01 = 0;
var bufferPontos01 = [], historicoTracos01 = [], estadoCanvas = "LIMPO";
var refDesenhoPontos = null, refLimpezaRemota = null, tentativasReconexao01 = 0;
var MAX_TENTATIVAS_01 = 5;
var cursorVirtual = { x: 400, y: 250 }, desenhandoTeclado = false, ultimaTeclaTime = 0;
var desenhandoAutoAgora = false, autoDrawTimer = null, autoDrawCancel = false;

function anunciar(m) {
    var e = document.getElementById("anuncioAcessivel");
    if (e) e.textContent = m;
    if (typeof window.announce === "function") window.announce(m, false);
}

function getPath() {
    if (!window.db) return null;
    if (typeof window.pathDesenho !== "function") return null;
    var p = window.pathDesenho();
    return (p && typeof p === "string" && p.indexOf("undefined") === -1) ? p : null;
}

function logD(e, m, d) {
    var t = new Date().toLocaleTimeString();
    if (d !== undefined) console.log("%c[" + t + "][DESENHO/" + e + "]", "color:#ffaa00;font-weight:bold", m, d);
    else console.log("%c[" + t + "][DESENHO/" + e + "]", "color:#ffaa00;font-weight:bold", m);
}

function initDesenho() {
    canvas01 = document.getElementById("quadroDesenho");
    if (!canvas01) return;
    if (canvas01.dataset.initialized) return;
    canvas01.dataset.initialized = "1";
    ctx01 = canvas01.getContext("2d");
    canvas01.tabIndex = 0;
    canvas01.setAttribute("role", "img");
    canvas01.setAttribute("aria-label", "Area de desenho. Use as setas do teclado para desenhar.");
    configurarEventos();
    carregarHistoricoInicial();
    escutarLimpezaRemota();
    window.addEventListener("beforeunload", desligarListenersDesenho);
    window.addEventListener("pagehide", desligarListenersDesenho);
    logD("INIT", "Engine de desenho inicializado.");
}

function desligarListenersDesenho() {
    if (autoDrawTimer) { clearInterval(autoDrawTimer); autoDrawTimer = null; }
    autoDrawCancel = true;
    desenhandoAutoAgora = false;
    if (refDesenhoPontos) { refDesenhoPontos.off(); refDesenhoPontos = null; }
    if (refLimpezaRemota) { refLimpezaRemota.off(); refLimpezaRemota = null; }
}

function renderizarLinha(x1, y1, x2, y2, cor, espessura) {
    if (!ctx01) return;
    if (![x1, y1, x2, y2].every(function (n) { return typeof n === "number" && isFinite(n); })) return;
    ctx01.beginPath();
    ctx01.strokeStyle = cor || "#000";
    ctx01.lineWidth = espessura || 3;
    ctx01.lineJoin = "round";
    ctx01.lineCap = "round";
    ctx01.moveTo(x1, y1);
    ctx01.lineTo(x2, y2);
    ctx01.stroke();
    ctx01.closePath();
}

function redrawCanvas() {
    if (!ctx01) return;
    window.requestAnimationFrame(function () {
        ctx01.clearRect(0, 0, canvas01.width, canvas01.height);
        historicoTracos01.forEach(function (t) {
            if (!Array.isArray(t)) return;
            for (var i = 1; i < t.length; i++) {
                var a = t[i - 1], b = t[i];
                if (!a || !b) continue;
                renderizarLinha(a.x, a.y, b.x, b.y);
            }
        });
        estadoCanvas = historicoTracos01.length > 0 ? "DESENHANDO" : "LIMPO";
    });
}

function carregarHistoricoInicial() {
    var path = getPath();
    if (!path) {
        if (tentativasReconexao01 < MAX_TENTATIVAS_01) {
            tentativasReconexao01++;
            setTimeout(carregarHistoricoInicial, Math.min(3000 * tentativasReconexao01, 15000));
        }
        return;
    }
    tentativasReconexao01 = 0;
    window.db.ref(path + "/pontos").once("value").then(function (snap) {
        historicoTracos01 = [];
        window.__processedTracoKeys = new Set();
        if (snap.exists()) {
            snap.forEach(function (child) {
                var d = child.val();
                if (d && Array.isArray(d.p)) {
                    historicoTracos01.push(d.p);
                    window.__processedTracoKeys.add(child.key);
                }
            });
        }
        redrawCanvas();
        escutarTracosNovos();
    }).catch(function (err) { logD("ERRO", "Historico falhou", err); });
}

function escutarTracosNovos() {
    var path = getPath();
    if (!path) return;
    if (refDesenhoPontos) refDesenhoPontos.off();
    if (!window.__processedTracoKeys) window.__processedTracoKeys = new Set();
    refDesenhoPontos = window.db.ref(path + "/pontos");
    refDesenhoPontos.on("child_added", function (snap) {
        if (window.ehDesenhista === true) return;
        if (window.__processedTracoKeys.has(snap.key)) return;
        var dados = snap.val();
        if (!dados || !Array.isArray(dados.p)) return;
        var pontos = dados.p;
        window.__processedTracoKeys.add(snap.key);
        historicoTracos01.push(pontos);
        if (historicoTracos01.length > 500) historicoTracos01.shift();
        for (var i = 1; i < pontos.length; i++) {
            var a = pontos[i - 1], b = pontos[i];
            if (!a || !b) continue;
            renderizarLinha(a.x, a.y, b.x, b.y);
        }
    });
}

function escutarLimpezaRemota() {
    var path = getPath();
    if (!path) return;
    if (refLimpezaRemota) refLimpezaRemota.off();
    refLimpezaRemota = window.db.ref(path);
    refLimpezaRemota.on("value", function (snap) {
        if (!snap) return;
        if (!snap.hasChild("pontos") && estadoCanvas !== "LIMPO") {
            historicoTracos01 = [];
            redrawCanvas();
            if (autoDrawTimer) { clearInterval(autoDrawTimer); autoDrawTimer = null; }
            autoDrawCancel = true;
            desenhandoAutoAgora = false;
            anunciar("Quadro limpo.");
            atualizarDescricaoDesenho();
        }
    });
}

window.limparQuadroSincronizado = function () {
    var path = getPath();
    if (!path) return;
    if (autoDrawTimer) { clearInterval(autoDrawTimer); autoDrawTimer = null; }
    autoDrawCancel = true;
    desenhandoAutoAgora = false;
    window.db.ref(path).remove().catch(function (e) { logD("ERRO", "limparQuadro falhou", e); });
};

function configurarEventos() {
    function obterPos(e) {
        var rect = canvas01.getBoundingClientRect();
        var scaleX = canvas01.width / rect.width;
        var scaleY = canvas01.height / rect.height;
        var cX = e.touches ? e.touches[0].clientX : e.clientX;
        var cY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cX - rect.left) * scaleX, y: (cY - rect.top) * scaleY };
    }
    function iniciar(e) {
        if (window.ehDesenhista !== true || estadoCanvas === "BLOQUEADO") return;
        if (e.cancelable) e.preventDefault();
        desenhando01 = true;
        var pos = obterPos(e);
        ultimoX01 = pos.x; ultimoY01 = pos.y;
        bufferPontos01 = [{ x: pos.x, y: pos.y }];
        anunciar("Desenho iniciado");
    }
    function mover(e) {
        if (!desenhando01 || window.ehDesenhista !== true) return;
        if (e.cancelable) e.preventDefault();
        var pos = obterPos(e);
        renderizarLinha(ultimoX01, ultimoY01, pos.x, pos.y);
        bufferPontos01.push({ x: pos.x, y: pos.y });
        ultimoX01 = pos.x; ultimoY01 = pos.y;
        if (bufferPontos01.length >= 25) enviarTraco();
    }
    function finalizar() { if (desenhando01) { enviarTraco(); desenhando01 = false; } }
    canvas01.addEventListener("mousedown", iniciar);
    canvas01.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", finalizar);
    canvas01.addEventListener("touchstart", iniciar, { passive: false });
    canvas01.addEventListener("touchmove", mover, { passive: false });
    canvas01.addEventListener("touchend", finalizar);
    configurarAcessibilidadeTeclado();
}

function enviarTraco() {
    var path = getPath();
    if (!path || bufferPontos01.length < 2 || window.ehDesenhista !== true) return;
    var traco = bufferPontos01.slice();
    var pushRef = window.db.ref(path + "/pontos").push({
        p: traco,
        t: firebase.database.ServerValue.TIMESTAMP,
        autor: window.usuarioIdUnico || null
    }).catch(function () {});
    if (pushRef && pushRef.key && window.__processedTracoKeys) window.__processedTracoKeys.add(pushRef.key);
    historicoTracos01.push(traco);
    if (historicoTracos01.length > 500) historicoTracos01.shift();
    bufferPontos01 = [traco[traco.length - 1]];
    estadoCanvas = "DESENHANDO";
}

function configurarAcessibilidadeTeclado() {
    canvas01.addEventListener("keydown", function (e) {
        if (window.ehDesenhista !== true) return;
        if (Date.now() - ultimaTeclaTime < 30) return;
        ultimaTeclaTime = Date.now();
        var passo = e.shiftKey ? 30 : 10;
        var moveu = false;
        switch (e.key) {
            case "ArrowUp": cursorVirtual.y = Math.max(0, cursorVirtual.y - passo); moveu = true; break;
            case "ArrowDown": cursorVirtual.y = Math.min(500, cursorVirtual.y + passo); moveu = true; break;
            case "ArrowLeft": cursorVirtual.x = Math.max(0, cursorVirtual.x - passo); moveu = true; break;
            case "ArrowRight": cursorVirtual.x = Math.min(800, cursorVirtual.x + passo); moveu = true; break;
            case " ":
                e.preventDefault();
                desenhandoTeclado = !desenhandoTeclado;
                anunciar(desenhandoTeclado ? "Desenhando com teclado" : "Traco solto");
                if (desenhandoTeclado) bufferPontos01 = [{ x: cursorVirtual.x, y: cursorVirtual.y }];
                else enviarTraco();
                break;
        }
        if (moveu) {
            e.preventDefault();
            if (desenhandoTeclado) {
                renderizarLinha(ultimoX01, ultimoY01, cursorVirtual.x, cursorVirtual.y);
                bufferPontos01.push({ x: cursorVirtual.x, y: cursorVirtual.y });
                if (bufferPontos01.length > 15) enviarTraco();
            }
            ultimoX01 = cursorVirtual.x; ultimoY01 = cursorVirtual.y;
        }
    });
}

window.liberarDesenho = function (status) {
    bufferPontos01 = []; desenhando01 = false; desenhandoTeclado = false; window.ehDesenhista = !!status;
    if (canvas01) {
        canvas01.style.pointerEvents = status ? "auto" : "none";
        canvas01.style.cursor = status ? "crosshair" : "not-allowed";
        if (status) {
            estadoCanvas = historicoTracos01.length > 0 ? "DESENHANDO" : "LIMPO";
            setTimeout(function () { try { canvas01.focus(); } catch (e) {} }, 500);
        }
    }
};
window.bloquearDesenho = function () { window.ehDesenhista = false; estadoCanvas = "BLOQUEADO"; if (canvas01) canvas01.style.pointerEvents = "none"; };
window.renderizarLinha = renderizarLinha;
window.temTracoNoCanvas = function () { return Array.isArray(historicoTracos01) && historicoTracos01.length > 0; };

window.executarDesenhoAutomatico = function (palavra, onProgress) {
    return new Promise(function (resolve) {
        if (!palavra) { resolve(); return; }
        var instrucoes = (window.bancoTracos || {})[palavra];
        if (!Array.isArray(instrucoes) || instrucoes.length === 0) {
            if (onProgress) onProgress(0, 0, false);
            resolve();
            return;
        }
        if (desenhandoAutoAgora) { resolve(); return; }
        desenhandoAutoAgora = true;
        autoDrawCancel = false;
        var idx = 0;
        var total = instrucoes.length;
        if (!ctx01) { desenhandoAutoAgora = false; resolve(); return; }
        autoDrawTimer = setInterval(function () {
            if (autoDrawCancel || !window.ehDesenhista || !gameCache01 || gameCache01.status !== "JOGANDO") {
                clearInterval(autoDrawTimer); autoDrawTimer = null;
                desenhandoAutoAgora = false;
                if (onProgress) onProgress(total, total, true);
                resolve();
                return;
            }
            if (idx >= total) {
                clearInterval(autoDrawTimer); autoDrawTimer = null;
                desenhandoAutoAgora = false;
                if (onProgress) onProgress(total, total, false);
                anunciar("Desenho automatico concluido");
                atualizarDescricaoDesenho();
                resolve();
                return;
            }
            var t = instrucoes[idx];
            if (t) renderizarLinha(t.x1, t.y1, t.x2, t.y2, t.cor, t.espessura);
            idx++;
            if (onProgress) onProgress(idx, total, false);
        }, 800);
    });
};

/* P12: Accessible drawing description for visually impaired players */
var __ultimaDescricao = "";
window.descreverDesenho = function () {
    if (!Array.isArray(historicoTracos01) || historicoTracos01.length === 0) {
        return "O desenho esta vazio.";
    }
    var circulos = 0, retas = 0, curvas = 0;
    historicoTracos01.forEach(function (stroke) {
        if (!Array.isArray(stroke) || stroke.length < 2) return;
        var p = stroke[0], u = stroke[stroke.length - 1];
        if (!p || !u) return;
        var dx = Math.abs(u.x - p.x), dy = Math.abs(u.y - p.y);
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 30 && stroke.length > 8) { circulos++; return; }
        if (stroke.length <= 6) { retas++; } else { curvas++; }
    });
    var partes = [];
    if (circulos > 0) partes.push(circulos + " " + (circulos === 1 ? "circulo" : "circulos"));
    if (retas > 0) partes.push(retas + " " + (retas === 1 ? "linha reta" : "linhas retas"));
    if (curvas > 0) partes.push(curvas + " " + (curvas === 1 ? "curva" : "curvas"));
    return "O desenho possui " + (partes.length > 0 ? partes.join(", ") : historicoTracos01.length + " tracos") + ".";
};

function atualizarDescricaoDesenho() {
    var el = document.getElementById("descricaoDesenho");
    if (!el) return;
    var descr = window.descreverDesenho ? window.descreverDesenho() : "";
    if (descr === __ultimaDescricao) return;
    __ultimaDescricao = descr;
    el.textContent = descr;
}

window.addEventListener("load", initDesenho);
