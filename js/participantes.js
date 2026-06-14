"use strict";
var DEBUG_SYNC = true;
/* ==========================================================================
   PARTICIPANTES — única fonte oficial de participantes da sala
   ==========================================================================
   salas/{sala}/participantes/{userId} = { nome, online, admin, entrouEm, lastSeen }
   
   Lobby renderizado SOMENTE por participantes.
   Admin eleito SOMENTE por AdminManager.
   Nenhuma dependência de game.jogadores ou presenca para lobby.
   ========================================================================== */

(function ParticipantManager() {
    if (!window.db || !window.usuarioIdUnico) return;
    window.__partLog = function (e, m, d) {
        var t = new Date().toLocaleTimeString();
        console.log("%c[" + t + "][PARTICIPANTES]", "color:#ff6b6b;font-weight:bold", "[" + e + "]", m, d || "");
    };

    var base = function () { return "salas/" + (window.salaCodigo01 || "sala_publica"); };
    var minhaRef = function () { return window.db.ref(base() + "/participantes/" + window.usuarioIdUnico); };

    function registrar(nome) {
        if (!nome) return;
        var ref = minhaRef();
        ref.onDisconnect().update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(function () {});
        ref.update({
            nome: nome,
            online: true,
            entrouEm: firebase.database.ServerValue.TIMESTAMP,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(function () {});
        if (DEBUG_SYNC) console.log("[PLAYER_JOIN]", { uid: window.usuarioIdUnico, nome: nome, timestamp: Date.now() });
        window.__partLog("JOIN", nome + " registrado em participantes");
    }

    /* Heartbeat — 10s interval */
    if (!window.__participanteHeartbeat) {
        window.__participanteHeartbeat = setInterval(function () {
            if (!window.__abaVisivel) return;
            minhaRef().update({
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).catch(function () {});
        }, 10000);
    }

    /* Cleanup on unload */
    function cleanup() {
        if (window.__participanteHeartbeat) {
            clearInterval(window.__participanteHeartbeat);
            window.__participanteHeartbeat = null;
        }
        minhaRef().update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(function () {});
    }
    window.addEventListener("beforeunload", cleanup);
    window.addEventListener("pagehide", cleanup);

    window.ParticipantManager = { registrar: registrar, ref: minhaRef };
    window.__partLog("INIT", "ParticipantManager carregado");
})();

/* ==========================================================================
   ADMIN MANAGER — único responsável por eleger/transferir admin
   ==========================================================================
   Escuta participantes/ e elege o primeiro online (ordem alfabética).
   Escreve admin em participantes/{uid}/admin.
   Nenhum outro listener altera adminId.
   ========================================================================== */

(function AdminManager() {
    if (!window.db) return;

    var base = function () { return "salas/" + (window.salaCodigo01 || "sala_publica"); };
    var refParticipantes = function () { return window.db.ref(base() + "/participantes"); };
    var __elegendo = false;

    function elegerAdmin() {
        if (__elegendo) return;
        refParticipantes().once("value").then(function (snap) {
            var participantes = snap.val() || {};
            var online = Object.keys(participantes)
                .filter(function (uid) { return participantes[uid] && participantes[uid].online === true; })
                .sort();
            if (online.length === 0) return;

            var adminAtual = null;
            Object.keys(participantes).forEach(function (uid) {
                if (participantes[uid] && participantes[uid].admin === true) adminAtual = uid;
            });

            var eleito = online[0];
            if (adminAtual === eleito && participantes[eleito] && participantes[eleito].admin) return;

            __elegendo = true;
            var updates = {};
            if (adminAtual && adminAtual !== eleito) updates[adminAtual + "/admin"] = false;
            updates[eleito + "/admin"] = true;

            refParticipantes().update(updates).then(function () {
                __elegendo = false;
                window.__partLog("ADMIN", "Admin: " + eleito + " (anterior: " + (adminAtual || "nenhum") + ")");
                /* Sync game.adminId for game mechanics */
                if (window.db) {
                    window.db.ref(base() + "/game/adminId").set(eleito).catch(function () {});
                }
            }).catch(function () { __elegendo = false; });
        }).catch(function () {});
    }

    /* Listen for participants changes */
    refParticipantes().on("value", function (snap) {
        if (__elegendo) return;
        var participantes = snap.val() || {};
        var online = Object.keys(participantes)
            .filter(function (uid) { return participantes[uid] && participantes[uid].online === true; })
            .sort();
        if (online.length === 0) return;

        var adminAtual = null;
        Object.keys(participantes).forEach(function (uid) {
            if (participantes[uid] && participantes[uid].admin === true) adminAtual = uid;
        });

        /* Re-elect if no admin or admin offline */
        if (!adminAtual || participantes[adminAtual].online !== true) {
            elegerAdmin();
        }
    });

    /* Re-elect on reconnect */
    window.db.ref(".info/connected").on("value", function (snap) {
        if (snap.val() === true) elegerAdmin();
    });

    window.AdminManager = { eleger: elegerAdmin };
    window.__partLog("ADMIN", "AdminManager carregado");
})();

/* ==========================================================================
   LOBBY MANAGER — renderiza lobby SOMENTE de participantes
   ==========================================================================
   Nenhuma leitura de game.jogadores ou presenca.
   ========================================================================== */

(function LobbyManager() {
    if (!window.db) return;

    var base = function () { return "salas/" + (window.salaCodigo01 || "sala_publica"); };

    function renderLobby(participantes) {
        var lista = document.getElementById("listaJogadores");
        var btnIniciar = document.getElementById("btnIniciar");
        var statusSala = document.getElementById("statusSala");
        var contadorOnline = document.getElementById("contadorOnline");
        if (!lista) return;

        /* Filter only online participants */
        var online = {};
        Object.keys(participantes).forEach(function (uid) {
            var p = participantes[uid];
            if (p && p.online === true && p.nome) online[uid] = p;
        });

        var nomes = Object.keys(online).sort();
        var adminId = null;
        Object.keys(online).forEach(function (uid) {
            if (online[uid].admin === true) adminId = uid;
        });

        /* P23: Diagnostic — track which renderLobby wrote last */
        var ts = new Date().toLocaleTimeString();
        var gameJogadoresCount = (window.gameCache01 && window.gameCache01.jogadores) ? Object.keys(window.gameCache01.jogadores).length : 0;
        console.log("[COUNT_LOBBY] [" + ts + "] [participantes.js]",
            "participantesOnline=" + nomes.length,
            "gameJogadores=" + gameJogadoresCount,
            "adminIdPart=" + (adminId || "null"),
            "gameAdmin=" + ((window.gameCache01 && window.gameCache01.adminId) || "null"),
            "euAdmin=" + (adminId === window.usuarioIdUnico),
            "gameStatus=" + ((window.gameCache01 && window.gameCache01.status) || "null")
        );

        /* Render player list */
        lista.innerHTML = "";
        nomes.forEach(function (uid, idx) {
            var p = online[uid];
            var li = document.createElement("li");
            var nomeExib = (window.__jogadorNumMap && window.__jogadorNumMap[uid]) || p.nome;
            if (uid === adminId) {
                li.textContent = nomeExib;
                var tag = document.createElement("span");
                tag.className = "jogador-admin-tag";
                tag.textContent = "ADMIN";
                li.appendChild(tag);
            } else {
                li.textContent = nomeExib;
            }
            lista.appendChild(li);
        });

        /* Online counter */
        if (contadorOnline) contadorOnline.textContent = nomes.length;

        /* Status and start button */
        var inLobby = !window.gameCache01 || !window.gameCache01.status ||
                      window.gameCache01.status === "aguardando" ||
                      window.gameCache01.status === "FIM_PARTIDA";
        console.log("[LOBBY_DEBUG]", {
            inLobby: inLobby,
            gameCacheStatus: window.gameCache01 ? window.gameCache01.status : null,
            nomesLength: nomes.length,
            adminIdDeParticipantes: adminId,
            usuarioIdUnico: window.usuarioIdUnico,
            euAdmin: adminId === window.usuarioIdUnico,
            btnExiste: !!btnIniciar,
            btnDisplay: btnIniciar ? btnIniciar.style.display : 'N/A'
        });
        if (inLobby && statusSala && btnIniciar) {
            if (nomes.length < 2) {
                statusSala.textContent = "Aguardando mais jogadores (" + nomes.length + " na sala, mínimo 2)";
                btnIniciar.style.display = "none";
            } else {
                var euAdmin = (adminId === window.usuarioIdUnico);
                btnIniciar.style.display = euAdmin ? "block" : "none";
                statusSala.textContent = euAdmin
                    ? nomes.length + " jogador(es) na sala. Pronto para começar!"
                    : "Aguardando o administrador iniciar a partida...";
            }
        } else if (statusSala) {
            if (btnIniciar) btnIniciar.style.display = "none";
        }

        console.log("[BTN_INICIAR] [" + ts + "] [participantes.js]",
            "exists=" + !!btnIniciar,
            "display=" + (btnIniciar ? btnIniciar.style.display : "N/A"),
            "visibility=" + (btnIniciar ? getComputedStyle(btnIniciar).visibility : "N/A"),
            "hidden=" + (btnIniciar ? btnIniciar.hidden : "N/A"),
            "disabled=" + (btnIniciar ? btnIniciar.disabled : "N/A"),
            "parent=" + (btnIniciar && btnIniciar.parentNode ? btnIniciar.parentNode.id || btnIniciar.parentNode.tagName : "ORPHAN"),
            "nomes=" + nomes.length,
            "gameJogadores=" + ((window.gameCache01 && window.gameCache01.jogadores) ? Object.keys(window.gameCache01.jogadores).length : 0),
            "adminIdPart=" + (adminId || "null"),
            "gameAdmin=" + ((window.gameCache01 && window.gameCache01.adminId) || "null"),
            "euAdmin=" + (adminId === window.usuarioIdUnico),
            "inLobby=" + inLobby,
            "gameStatus=" + ((window.gameCache01 && window.gameCache01.status) || "null"),
            "motivo=" + (!inLobby ? "NAO_ESTA_NO_LOBBY" : nomes.length < 2 ? "POUCOS_JOGADORES" : adminId !== window.usuarioIdUnico ? "NAO_E_ADMIN" : "OK")
        );

        /* Cache para getJogadoresAtivos (watchdog) */
        window.__participantesOnline = Object.keys(online);
        /* Cache de nomes para fallback em renderFila/ranking */
        var _map = {};
        Object.keys(online).forEach(function (uid) { _map[uid] = online[uid].nome || null; });
        window.__participantesMap = _map;
        /* Cache de identidade estável: UID → "Jogador N" (preserva atribuições existentes) */
        if (!window.__jogadorNumMap) window.__jogadorNumMap = {};
        var _existing = window.__jogadorNumMap;
        var _nextNum = 1;
        /* Find highest existing number */
        Object.keys(_existing).forEach(function (uid) {
            var m = _existing[uid] && _existing[uid].match(/Jogador (\d+)/);
            if (m) { var n = parseInt(m[1], 10); if (n >= _nextNum) _nextNum = n + 1; }
        });
        /* Assign numbers to new players only */
        Object.keys(online).sort().forEach(function (uid) {
            if (!_existing[uid]) {
                _existing[uid] = "Jogador " + _nextNum;
                _nextNum++;
            }
        });
        /* Remove players that left */
        Object.keys(_existing).forEach(function (uid) {
            if (!online[uid]) delete _existing[uid];
        });
        window.__jogadorNumMap = _existing;

        window.__partLog("LOBBY", "online=" + nomes.length + " admin=" + (adminId || "?") + " euAdmin=" + (adminId === window.usuarioIdUnico));
        if (typeof window.__auditBtnIniciar === "function") window.__auditBtnIniciar("participantes.js");
    }

    /* Só escuta após DOM pronto para garantir elementos existirem */
    document.addEventListener("DOMContentLoaded", function () {
        window.db.ref(base() + "/participantes").on("value", function (snap) {
            var participantes = snap.val() || {};
            var _t = Date.now();
            var _onlineIds = Object.keys(participantes).filter(function (uid) {
                return participantes[uid] && participantes[uid].online === true;
            });
            if (DEBUG_SYNC) console.log("[FIREBASE_UPDATE]", { online: _onlineIds.length, uid: _onlineIds, timestamp: _t });
            renderLobby(participantes);
            if (DEBUG_SYNC) console.log("[UI_RENDER]", { online: _onlineIds.length, timestamp: Date.now() });

            /* PROBLEMA 1+3: Sync game/jogadores with participantes/ when aguardando */
            var onlineIds = Object.keys(participantes).filter(function (uid) {
                return participantes[uid] && participantes[uid].online === true;
            });
            if (typeof window.__syncGameJogadores === "function") {
                window.__syncGameJogadores(participantes, onlineIds);
            }

            /* Reset scheduling when room is empty */
            var onlineCount = onlineIds.length;
            if (onlineCount === 0) {
                if (typeof window.agendarResetSala === "function") window.agendarResetSala();
            } else {
                if (typeof window.cancelarResetSala === "function") window.cancelarResetSala();
            }
        });
        window.__partLog("LOBBY", "LobbyManager escutando participantes/");
    });

    window.LobbyManager = { render: renderLobby };
    window.__partLog("LOBBY", "LobbyManager carregado");
})();
