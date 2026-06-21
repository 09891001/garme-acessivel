"use strict";
window.addEventListener("error", function(e){
    console.error("[FULL_ERROR]", {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
    });
});
window.__cfgLog = function (e, m, d) {
    var t = new Date().toLocaleTimeString();
    console.log("%c[" + t + "][CFG/" + e + "]", "color:#00bcd4;font-weight:bold", m, d || "");
};

(function () {
    try {
        var uid = localStorage.getItem("userId");
        if (!uid) {
            uid = "U_" + Math.random().toString(36).substr(2, 6).toUpperCase();
            localStorage.setItem("userId", uid);
        }
        window.userId = uid;
        window.usuarioIdUnico = uid;
    } catch (e) {
        window.userId = window.userId || "U_" + Math.random().toString(36).substr(2, 6).toUpperCase();
        window.usuarioIdUnico = window.userId;
    }
    try {
        var sid = sessionStorage.getItem("sessionId");
        if (!sid) {
            sid = "S_" + Math.random().toString(36).substr(2, 6).toUpperCase();
            sessionStorage.setItem("sessionId", sid);
        }
        window.sessionId = sid;
    } catch (e) {
        window.sessionId = "S_" + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    if (!window.usuarioIdUnico || window.usuarioIdUnico.indexOf("undefined") !== -1) {
        window.usuarioIdUnico = "U_" + Math.random().toString(36).substr(2, 8).toUpperCase();
        console.error("[CFG] ID gerado como fallback");
    }
})();

var firebaseConfig = {
    apiKey: "AIzaSyBxav0baX6bucdyUlwipRWOFCv9AWtquyM",
    authDomain: "garme-acessivel.firebaseapp.com",
    databaseURL: "https://garme-acessivel-default-rtdb.firebaseio.com/",
    projectId: "garme-acessivel",
    storageBucket: "garme-acessivel.appspot.com",
    messagingSenderId: "69205141908",
    appId: "1:69205141908:web:d3ce0b770f699c1a8ac781"
};

if (typeof firebase === "undefined") {
    console.error("[CFG] Firebase SDK ausente");
} else {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    window.db = firebase.database();
    window.__cfgLog("INIT", "Firebase OK");
}

if (!window.salaCodigo01) window.salaCodigo01 = "sala_publica";

/* P8: Maximum players per room */
window.MAX_JOGADORES = 15;

/* P3: Reset stale session data on fresh load (preserve userId and nome) */
window.resetSessaoUsuario = function () {
    try {
        var keepKeys = ["userId", "garme_tema", "sessionId"];
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && keepKeys.indexOf(key) === -1) keysToRemove.push(key);
        }
        keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
        try {
            var sidKeep = sessionStorage.getItem("sessionId");
            sessionStorage.clear();
            if (sidKeep) sessionStorage.setItem("sessionId", sidKeep);
        } catch (e) {}
    } catch (e) {}
    window.__lastGameHash = "";
    window.gameCache01 = null;
    window.__desenhoAutoIniciado = false;
    window.__ultimaEtapaAuto = -1;
};
window.resetSessaoUsuario();

window.offsetServidor = 0;
if (window.db) {
    window.db.ref(".info/serverTimeOffset").on("value", function (s) {
        window.offsetServidor = s.val() || 0;
    });
}

window.agora = function () { return Date.now() + window.offsetServidor; };

window.__abaVisivel = document.visibilityState !== "hidden";
document.addEventListener("visibilitychange", function () {
    var ativo = document.visibilityState !== "hidden";
    window.__abaVisivel = ativo;
    console.log("[VISIBILITY_DEBUG]", {
        state: document.visibilityState,
        event: "visibilitychange",
        timestamp: new Date().getTime()
    });
    if (ativo) {
        if (window.__reconectarFila) { window.__reconectarFila(); window.__reconectarFila = null; }
        if (typeof window.__refreshGameState === "function") window.__refreshGameState();
        /* goOffline/goOnline removido — Firebase gerencia conexão sozinho */
    }
});

/* P5: Reconnection trigger on .info/connected */
window.db.ref(".info/connected").on("value", function (snap) {
    if (snap.val() !== true) {
        window.__cfgLog("CONN", "Offline detectado");
        if (typeof window.narrarConexao === "function") window.narrarConexao(false);
        return;
    }
    window.__cfgLog("CONN", "Online");
    if (typeof window.narrarConexao === "function") window.narrarConexao(true);
    /* P10: Attempt reconnection on return — inner guards handle restrictions */
    if (typeof window.reentrarFilaAposReconexao === "function") {
        window.__reconectarFila = window.reentrarFilaAposReconexao;
    }
    /* P1+P2: Clean orphaned presenca entries (old userId_sessionId format) — backward compat */
    window.db.ref("salas/" + window.salaCodigo01 + "/presenca").once("value").then(function (snap) {
        var data = snap.val() || {};
        var toRemove = [];
        Object.keys(data).forEach(function (key) {
            if (key.indexOf("_") === -1) return;
            var entry = data[key];
            if (entry && entry.userId && entry.userId === key.split("_")[0]) {
                toRemove.push(key);
            }
        });
        if (toRemove.length > 0) {
            var updates = {};
            toRemove.forEach(function (k) { updates[k] = null; });
            window.db.ref("salas/" + window.salaCodigo01 + "/presenca").update(updates).catch(function () {});
            window.__cfgLog("PRESENCA", "Limpou " + toRemove.length + " presencas orfas");
        }
    }).catch(function () {});
    /* P2: Dedup jogadores — merge old userId_sessionId entries into userId */
    window.db.ref("salas/" + window.salaCodigo01 + "/game/jogadores").once("value").then(function (snap) {
        var jogadores = snap.val() || {};
        var deduped = {}, merged = {};
        Object.keys(jogadores).forEach(function (key) {
            var uid = key.indexOf("_") !== -1 ? key.split("_")[0] : key;
            if (!deduped[uid]) { deduped[uid] = true; merged[uid] = jogadores[key]; }
        });
        if (Object.keys(merged).length < Object.keys(jogadores).length) {
            window.db.ref("salas/" + window.salaCodigo01 + "/game/jogadores").set(merged).catch(function () {});
            window.__cfgLog("JOGADORES", "Dedup: " + Object.keys(merged).length + " de " + Object.keys(jogadores).length);
        }
    }).catch(function () {});
});

/* getJogadoresAtivos — usado pelo watchdog, alimentado pelo LobbyManager */
window.getJogadoresAtivos = function () {
    return Array.isArray(window.__participantesOnline) ? window.__participantesOnline.slice() : [];
};

window.__cleanupPresenca = function () {
    if (window.db && window.salaCodigo01) {
        /* P3: If drawer leaves, end the round immediately */
        try {
            if (window.gameCache01 && window.gameCache01.desenhistaId === window.usuarioIdUnico) {
                var s = window.gameCache01.status;
                if (s === "JOGANDO" || s === "ESCOLHENDO_PALAVRA" || s === "ESCOLHENDO_MODO") {
                    window.db.ref("salas/" + window.salaCodigo01 + "/game").transaction(function (g) {
                        if (!g) return;
                        if (g.desenhistaId !== window.usuarioIdUnico) return;
                        var n = Object.assign({}, g);
                        n.status = "FIM_RODADA";
                        return n;
                    }).catch(function () {});
                }
            }
        } catch (e) {}
    }
    if (window.db && window.salaCodigo01) {
        try {
            window.db.ref("salas/" + window.salaCodigo01 + "/fila").transaction(function (f) {
                if (!Array.isArray(f)) return f;
                return f.filter(function (id) { return id !== window.usuarioIdUnico; });
            });
        } catch (e) {}
    }
};

window.addEventListener("beforeunload", window.__cleanupPresenca);
window.addEventListener("pagehide", window.__cleanupPresenca);

/* P5: Global error handler for uncaught exceptions */
window.addEventListener("error", function (e) {
    window.__cfgLog("GLOBAL_ERRO", e.message || "Erro nao tratado", { filename: e.filename, lineno: e.lineno });
    if (typeof window.__showRecovery === "function") window.__showRecovery();
    return false;
});

window.__cfgLog("BOOT", "Config carregado");
