"use strict";
var DEBUG_SYNC = true;
/* ==========================================================================
   PARTICIPANTES — única fonte oficial de participantes da sala
   ==========================================================================
   salas/{sala}/participantes/{userId} = { nome, online, admin, entrouEm, numero, lastSeen }

   - entrouEm: ServerValue.TIMESTAMP (servidor), preservado no F5.
   - numero: cosmético apenas (posição no sort por entrouEm), nunca gravado no Firebase.
   - Admin: menor entrouEm do Firebase (determinístico cross-client).
   - visibilitychange: apenas .update({online:true}), NÃO chama registrar().
   ========================================================================== */

(function ParticipantManager() {
    if (!window.db || !window.usuarioIdUnico) return;

    window.__partLog = function (e, m, d) {
        var t = new Date().toLocaleTimeString();
        console.log("%c[" + t + "][PARTICIPANTES]", "color:#ff6b6b;font-weight:bold", "[" + e + "]", m, d || "");
    };

    var base = function () { return "salas/" + (window.salaCodigo01 || "sala_publica"); };
    var minhaRef = function () { return window.db.ref(base() + "/participantes/" + window.usuarioIdUnico); };
    var connectedRef = window.db.ref(".info/connected");

    /* REGRAS 1+5: Monitor .info/connected — só marcar online quando Firebase confirmar */
    connectedRef.on("value", function (snap) {
        if (snap.val() === true) {
            minhaRef().update({
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).catch(function () {});
        }
    });

    /* REGRA 5: visibilitychange = apenas online:true, NÃO chama registrar() */
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            minhaRef().update({
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).catch(function () {});
        }
    });

    /* --- REGISTRO --- */
    function registrar(nome) {
        if (!nome) return;
        var ref = minhaRef();
        var partRef = window.db.ref(base() + "/participantes");

        /* Configurar onDisconnect UMA VEZ */
        ref.onDisconnect().update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).catch(function () {});

        /* Desduplicar fantasma com delay de 2s (Firebase precisa sincronizar após reconexão) */
        setTimeout(function () {
            partRef.once("value").then(function (snap) {
                var participantes = snap.val() || {};
                console.log("[GHOST_CHECK]", { total: Object.keys(participantes).length, uids: Object.keys(participantes) });
                var updates = {};
                Object.keys(participantes).forEach(function (uid) {
                    if (uid === window.usuarioIdUnico) return;
                    var p = participantes[uid];
                    if (!p) return;
                    /* Regra 1: outro UID com mesmo nome E online → marca offline */
                    if (p.nome === nome && p.online === true) {
                        updates[uid + "/online"] = false;
                        updates[uid + "/lastSeen"] = firebase.database.ServerValue.TIMESTAMP;
                        console.log("[GHOST_CLEANUP]", { ghostUid: uid, nome: nome, motivo: "mesmo_nome_e_online" });
                    }
                    /* Regra 2: outro UID com mesmo nome mas offline → remove nó */
                    else if (p.nome === nome && p.online === false) {
                        updates[uid] = null;
                        console.log("[GHOST_CLEANUP]", { ghostUid: uid, nome: nome, motivo: "mesmo_nome_offline_remove" });
                    }
                });
                if (Object.keys(updates).length > 0) {
                    console.log("[GHOST_APPLY]", { updates: updates });
                    return partRef.update(updates);
                }
            }).catch(function () {});
        }, 2000);

        /* Registro normal: preservar entrouEm se já existe (F5) */
        ref.once("value").then(function (snap) {
            var atual = snap.val() || {};
            var updates = {
                nome: nome,
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            };
            if (!atual.entrouEm) {
                updates.entrouEm = firebase.database.ServerValue.TIMESTAMP;
            }
            return ref.update(updates);
        }).catch(function () {});

        if (DEBUG_SYNC) console.log("[PLAYER_JOIN]", { uid: window.usuarioIdUnico, nome: nome });
        window.__partLog("JOIN", nome + " registrado em participantes");
    }

    /* Heartbeat — 10s */
    if (!window.__participanteHeartbeat) {
        window.__participanteHeartbeat = setInterval(function () {
            if (!window.__abaVisivel) return;
            minhaRef().update({
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).catch(function () {});
        }, 10000);
    }

    /* Periodic ghost cleanup — remove ALL offline entries from participantes/ */
    if (!window.__ghostCleanupInterval) {
        window.__ghostCleanupInterval = setInterval(function () {
            if (!window.__abaVisivel || !window.db) return;
            var partRef = window.db.ref(base() + "/participantes");
            partRef.once("value").then(function (snap) {
                var participantes = snap.val() || {};
                var updates = {};
                var now = window.agora ? window.agora() : Date.now();
                Object.keys(participantes).forEach(function (uid) {
                    if (uid === window.usuarioIdUnico) return;
                    var p = participantes[uid];
                    if (!p) return;
                    var lastSeen = p.lastSeen || 0;
                    if (typeof lastSeen !== "number") lastSeen = 0;
                    /* Remove offline entries (onDisconnect marked them) */
                    if (p.online === false) {
                        /* Preserve if lastSeen is very recent (< 5s) — might be reconnecting */
                        if (lastSeen > 0 && (now - lastSeen) < 5000) return;
                        updates[uid] = null;
                    }
                    /* Remove entries with no name (never completed registration) */
                    else if (!p.nome) {
                        updates[uid] = null;
                    }
                    /* Remove ghost: online:true but lastSeen > 15s */
                    else if (p.online === true && lastSeen > 0 && (now - lastSeen) > 15000) {
                        updates[uid + "/online"] = false;
                        updates[uid + "/lastSeen"] = firebase.database.ServerValue.TIMESTAMP;
                    }
                });
                if (Object.keys(updates).length > 0) {
                    if (DEBUG_SYNC) console.log("[GHOST_PERIODIC]", { removing: Object.keys(updates).length, uids: Object.keys(updates) });
                    partRef.update(updates).catch(function () {});
                }
            }).catch(function () {});
        }, 15000);
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

    /* --- REGRA 3: Admin = menor entrouEm do Firebase --- */
    function __syncAdmin(sortedIds, participantes) {
        if (sortedIds.length === 0) return;
        var adminUid = sortedIds[0];
        var refPart = window.db.ref(base() + "/participantes");
        refPart.once("value").then(function (snap) {
            var p = snap.val() || {};
            var updates = {};
            Object.keys(p).forEach(function (uid) {
                if (p[uid] && p[uid].admin === true && uid !== adminUid) {
                    updates[uid + "/admin"] = false;
                }
            });
            if (p[adminUid] && !p[adminUid].admin) {
                updates[adminUid + "/admin"] = true;
            }
            if (Object.keys(updates).length > 0) {
                refPart.update(updates).catch(function () {});
            }
        }).catch(function () {});
        /* Sync game.adminId */
        if (window.db) {
            window.db.ref(base() + "/game/adminId").set(adminUid).catch(function () {});
        }
    }

    /* --- LOBBY RENDER --- */
    function renderLobby(participantes, adminId) {
        console.log("[LOBBY_RENDER_START]", {
            participantesKeys: Object.keys(participantes || {}),
            participantes: participantes,
            adminId: adminId
        });
        /* Deterministic sort by entrouEm (server timestamp), UID tiebreaker */
        var jogadoresOrdenados = Object.keys(participantes).map(function (uid) {
            return Object.assign({ uid: uid }, participantes[uid]);
        }).filter(function (p) {
            return p.online === true && p.nome;
        }).sort(function (a, b) {
            if (a.entrouEm === b.entrouEm) return a.uid.localeCompare(b.uid);
            return (a.entrouEm || 0) - (b.entrouEm || 0);
        });

        var _onlineIds = jogadoresOrdenados.map(function (p) { return p.uid; });

        console.log("[DEDUP_DEBUG]", {
            totalEncontrados: Object.keys(participantes).length,
            antes: Object.keys(participantes).map(function (uid) {
                var p = participantes[uid];
                return { uid: uid, nome: p && p.nome, online: p && p.online, entrouEm: p && p.entrouEm, sessionId: p && p.sessionId };
            }),
            depois: jogadoresOrdenados.map(function (j) {
                return { uid: j.uid, nome: j.nome, online: j.online, entrouEm: j.entrouEm };
            }),
            idsFiltrados: _onlineIds,
            meuUid: window.usuarioIdUnico
        });

        /* Numeração cosmética: posição no sort por entrouEm — NÃO gravada no Firebase */
        window.__jogadorNumMap = {};
        jogadoresOrdenados.forEach(function (jog, index) {
            window.__jogadorNumMap[jog.uid] = "Jogador " + (index + 1);
        });

        /* When game is not in lobby, skip DOM rendering — update caches only */
        var _gameStatus = (window.gameCache01 && window.gameCache01.status) || "aguardando";
        var _inLobbyNow = !_gameStatus || _gameStatus === "aguardando" || _gameStatus === "FIM_PARTIDA";
        if (!_inLobbyNow) {
            window.__participantesOnline = _onlineIds;
            var _map = {};
            jogadoresOrdenados.forEach(function (jog) { _map[jog.uid] = jog.nome || null; });
            window.__participantesMap = _map;
            return;
        }

        /* --- DOM Rendering --- */
        var lista = document.getElementById("listaJogadores");
        var btnIniciar = document.getElementById("btnIniciar");
        var statusSala = document.getElementById("statusSala");
        var contadorOnline = document.getElementById("contadorOnline");
        console.log("[LOBBY_DOM]", {
            lista: !!lista,
            btnIniciar: !!btnIniciar,
            statusSala: !!statusSala,
            contadorOnline: !!contadorOnline
        });
        if (!lista) return;

        lista.innerHTML = "";
        jogadoresOrdenados.forEach(function (jog) {
            var li = document.createElement("li");
            var nomeExib = (window.__jogadorNumMap && window.__jogadorNumMap[jog.uid]) || jog.nome;
            if (jog.uid === window.usuarioIdUnico) nomeExib += " (VOCÊ)";
            if (jog.uid === adminId) {
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

        if (contadorOnline) contadorOnline.textContent = _onlineIds.length;

        if (statusSala && btnIniciar) {
            if (_onlineIds.length < 2) {
                statusSala.textContent = "Aguardando mais jogadores (" + _onlineIds.length + " na sala, mínimo 2)";
                btnIniciar.style.display = "none";
            } else {
                var euAdmin = (adminId === window.usuarioIdUnico);
                btnIniciar.style.display = euAdmin ? "block" : "none";
                statusSala.textContent = euAdmin
                    ? _onlineIds.length + " jogador(es) na sala. Pronto para começar!"
                    : "Aguardando o administrador iniciar a partida...";
            }
        }

        /* Caches */
        window.__participantesOnline = _onlineIds;
        var _map = {};
        jogadoresOrdenados.forEach(function (jog) { _map[jog.uid] = jog.nome || null; });
        window.__participantesMap = _map;

        window.__partLog("LOBBY", "online=" + _onlineIds.length + " admin=" + (adminId || "?") + " euAdmin=" + (adminId === window.usuarioIdUnico));
        console.log("[LOBBY_RENDER_END]", {
            htmlGerado: lista.innerHTML,
            onlineCount: contadorOnline ? contadorOnline.textContent : "?"
        });
    }

    /* --- Listener Firebase --- */
    document.addEventListener("DOMContentLoaded", function () {
        window.db.ref(base() + "/participantes").on("value", function (snap) {
            var participantes = snap.val() || {};
            console.log("[PARTICIPANTES_FIREBASE]", JSON.parse(JSON.stringify(participantes)));

            /* --- PRE-RENDER GHOST CLEANUP --- */
            var now = window.agora ? window.agora() : Date.now();
            var ghostUpdates = {};
            Object.keys(participantes).forEach(function (uid) {
                if (uid === window.usuarioIdUnico) return;
                var p = participantes[uid];
                if (!p) return;
                /* Ghost: online:true mas lastSeen > 15s (desconectou sem onDisconnect) */
                var lastSeen = p.lastSeen || 0;
                if (typeof lastSeen !== "number") return;
                if (p.online === true && (now - lastSeen) > 15000) {
                    ghostUpdates[uid + "/online"] = false;
                    ghostUpdates[uid + "/lastSeen"] = firebase.database.ServerValue.TIMESTAMP;
                    console.log("[GHOST_CLEANUP]", { uid: uid, nome: p.nome, lastSeen: lastSeen, ageMs: now - lastSeen });
                }
            });
            if (Object.keys(ghostUpdates).length > 0) {
                console.log("[GHOST_CLEANUP] Removidos:", Object.keys(ghostUpdates).filter(function (k) { return k.endsWith("/online"); }).length, "fantasmas");
                window.db.ref(base() + "/participantes").update(ghostUpdates).catch(function () {});
                /* Atualizar objeto local para consistência imediata */
                Object.keys(ghostUpdates).forEach(function (k) {
                    var uid = k.split("/")[0];
                    if (k.endsWith("/online") && participantes[uid]) participantes[uid].online = false;
                });
            }

            /* Single source: online=true AND nome exists, sorted by entrouEm */
            var sortedIds = Object.keys(participantes).filter(function (uid) {
                var p = participantes[uid];
                var keep = p && p.online === true && p.nome;
                if (!keep) console.log("[PARTICIPANTES_DESCARTADO]", { uid: uid, participante: p, motivo: !p ? "null" : !p.online ? "offline" : !p.nome ? "sem_nome" : "?" });
                return keep;
            }).sort(function (a, b) {
                return (participantes[a].entrouEm || 0) - (participantes[b].entrouEm || 0);
            });
            console.log("[PARTICIPANTES_PROCESSADOS]", { total: Object.keys(participantes).length, afterFilter: sortedIds.length, uids: sortedIds });

            /* REGRA 3: Admin = menor entrouEm do Firebase (determinístico) */
            var adminId = sortedIds[0] || null;

            renderLobby(participantes, adminId);
            __syncAdmin(sortedIds, participantes);

            /* REGRA 4: Apenas admin sincroniza game/jogadores */
            if (adminId === window.usuarioIdUnico && typeof window.__syncGameJogadores === "function") {
                window.__syncGameJogadores(participantes, sortedIds, adminId);
            }

            /* Reset scheduling when room is empty */
            if (sortedIds.length === 0) {
                if (typeof window.agendarResetSala === "function") window.agendarResetSala();
            } else {
                if (typeof window.cancelarResetSala === "function") window.cancelarResetSala();
            }
        });
        window.__partLog("LOBBY", "ParticipantManager escutando participantes/");
    });

    window.LobbyManager = {
        registrar: registrar,
        render: function (participantes) { renderLobby(participantes, null); },
        forcarRender: function () {
            window.db.ref(base() + "/participantes").once("value", function (snap) {
                var participantes = snap.val() || {};
                var sortedIds = Object.keys(participantes).filter(function (uid) {
                    return participantes[uid] && participantes[uid].online === true && participantes[uid].nome;
                }).sort(function (a, b) {
                    return (participantes[a].entrouEm || 0) - (participantes[b].entrouEm || 0);
                });
                renderLobby(participantes, sortedIds[0] || null);
            });
        }
    };
    window.ParticipantManager = window.LobbyManager;
    window.__partLog("INIT", "ParticipantManager carregado");
})();
