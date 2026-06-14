"use strict";
if (!window.salaCodigo01) window.salaCodigo01 = "sala_publica";

function __validarSala() {
    if (!window.salaCodigo01 || window.salaCodigo01.indexOf("undefined") !== -1) {
        window.salaCodigo01 = "sala_publica";
    }
    return window.salaCodigo01;
}

var PATH = {
    game: function () { return "salas/" + __validarSala() + "/game"; },
    chat: function () { return "salas/" + __validarSala() + "/chat"; },
    ranking: function () { return "salas/" + __validarSala() + "/ranking"; },
    desenho: function () { return "salas/" + __validarSala() + "/desenho"; }
};

if (typeof window.pathDesenho !== "function") window.pathDesenho = function () { return PATH.desenho(); };

var usuarioNome01 = (function () { try { return localStorage.getItem("usuarioNome") || "Jogador"; } catch (e) { return "Jogador"; } })();
var gameCache01 = null;
var ultimoStatusNarrado = "";
var __lastGameHash = "";
var chatTimestamps = [];

/* Name lookup: game.jogadores → __participantesMap → null */
function __resolverNome(uid, jogadores) {
    if (jogadores && jogadores[uid] && jogadores[uid].nome && jogadores[uid].nome !== "?") return jogadores[uid].nome;
    if (window.__participantesMap && window.__participantesMap[uid]) return window.__participantesMap[uid];
    return null;
}

/* Stable display name: UID → "Jogador N" (sorted position) */
function __nomeExibicao(uid) {
    if (window.__jogadorNumMap && window.__jogadorNumMap[uid]) return window.__jogadorNumMap[uid];
    return __resolverNome(uid) || "Jogador";
}
var tentativasChute01 = [];
var CHAT_SPAM_LIMIT = 3;
var CHAT_SPAM_WINDOW_MS = 5000;
var GAME_SESSION_KEY = "garme_session";
var __watchdogInterval = null;

/* P17: Temporarily disable a button to prevent double-clicks */
function __disableTemporario(btnId, ms) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    if (btn.disabled) return;
    btn.disabled = true;
    setTimeout(function () { btn.disabled = false; }, ms || 1500);
}

/* P19: Show recovery UI and reload state from Firebase */
window.__showRecovery = function () {
    var banner = document.getElementById("bannerRecuperacao");
    if (banner) return;
    banner = document.createElement("div");
    banner.id = "bannerRecuperacao";
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;padding:12px;background:#e74c3c;color:#fff;text-align:center;font-weight:700;font-size:.9rem;box-shadow:0 2px 8px rgba(0,0,0,.3)";
    banner.setAttribute("role", "alert");
    var msg = document.createElement("span");
    msg.textContent = "Ocorreu um erro. Tentando recuperar a partida...";
    banner.appendChild(msg);
    var btn = document.createElement("button");
    btn.textContent = "OK";
    btn.style.cssText = "margin-left:12px;padding:4px 16px;background:#fff;color:#e74c3c;border:none;border-radius:4px;cursor:pointer;font-weight:700";
    btn.onclick = function () { if (banner.parentNode) banner.parentNode.removeChild(banner); };
    banner.appendChild(btn);
    document.body.insertBefore(banner, document.body.firstChild);
    /* Attempt state recovery */
    if (typeof window.__refreshGameState === "function") {
        window.__refreshGameState();
        if (typeof window.narrarErroRecuperacao === "function") window.narrarErroRecuperacao();
    }
    /* Auto-dismiss after 8 seconds */
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 8000);
};

function log(e, m, d) {
    var t = new Date().toLocaleTimeString();
    console.log("%c[" + t + "][" + e + "]", "color:#00ff88;font-weight:bold", m);
    if (d !== undefined) console.dir(d);
}

/* P23: Button audit — called after each renderLobby to capture final DOM state */
window.__auditBtnIniciar = function (origem) {
    var btn = document.getElementById("btnIniciar");
    var ts = new Date().toLocaleTimeString();
    if (!btn) {
        console.log("[BTN_AUDIT] [" + ts + "] [" + origem + "]",
            "exists=false",
            "MOTIVO=BOTAO_NAO_ENCONTRADO_NO_DOM"
        );
        return;
    }
    var container = btn.parentNode;
    var containerId = container ? (container.id || container.className || container.tagName) : "NO_PARENT";
    var estilo = window.getComputedStyle(btn);
    console.log("[BTN_AUDIT] [" + ts + "] [" + origem + "]",
        "exists=true",
        "id=" + btn.id,
        "display=" + btn.style.display,
        "computedDisplay=" + estilo.display,
        "visibility=" + estilo.visibility,
        "hidden=" + btn.hidden,
        "disabled=" + btn.disabled,
        "opacity=" + estilo.opacity,
        "pointerEvents=" + estilo.pointerEvents,
        "parentTag=" + (container ? container.tagName : "null"),
        "parentId=" + containerId,
        "parentDisplay=" + (container && container.style ? container.style.display : "N/A"),
        "siblingCount=" + (container ? container.children.length : 0),
        "innerHTMLLen=" + (container ? container.innerHTML.length : 0),
        "positionInParent=" + Array.prototype.indexOf.call(container ? container.children : [], btn)
    );
};

function salvarSessao(game) {
    if (!game) return;
    try {
        localStorage.setItem(GAME_SESSION_KEY, JSON.stringify({
            status: game.status, desenhistaId: game.desenhistaId,
            palavra: game.palavra, rodada: game.rodada,
            dicaIndex: game.dicaIndex, timestamp: Date.now()
        }));
    } catch (e) {}
}

function obterPalavrasComTracos(qtd) {
    var banco = window.bancoTracos || {};
    var tracos = Object.keys(banco);
    for (var i = tracos.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = tracos[i]; tracos[i] = tracos[j]; tracos[j] = tmp;
    }
    return tracos.slice(0, Math.min(qtd || 3, tracos.length));
}

function narrarEvento(texto) {
    if (typeof narrar === "function") narrar(texto);
}

/* --- DOM READY --- */
document.addEventListener("DOMContentLoaded", function () {
    if (!window.db) { log("ERRO", "Firebase offline."); return; }
    if (!window.usuarioIdUnico || window.usuarioIdUnico.indexOf("undefined") !== -1) {
        log("ERRO", "usuarioIdUnico invalido."); return;
    }
    /* nomeSalvo removido — tela de entrada sempre limpa */

    document.getElementById("btnEntrar").onclick = function () { entrarJogo(); };
    document.getElementById("nomeUsuario").onkeydown = function (e) { if (e.key === "Enter") entrarJogo(); };
    var _btnInit = document.getElementById("btnIniciar");
    _btnInit.onclick = iniciarPartida;
    console.log("[BTN_BIND]", { id: _btnInit.id, existe: !!_btnInit });
    document.getElementById("btnSairLobby").onclick = function () {
        try { localStorage.removeItem("usuarioNome"); } catch (e) {}
        location.reload();
    };
    document.getElementById("btnSair").onclick = function () {
        try { localStorage.removeItem("usuarioNome"); } catch (e) {}
        location.reload();
    };
    document.getElementById("btnConfig").onclick = function () {
        var panel = document.getElementById("painelConfig");
        if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
    };

    var inputChute = document.getElementById("chutePalavra");
    if (inputChute) inputChute.onkeydown = function (e) { if (e.key === "Enter") enviarChute(); };
    var btnChute = document.getElementById("btnEnviarChute");
    if (btnChute) btnChute.onclick = enviarChute;

    document.getElementById("btnLimparQuadro").onclick = function () { window.limparQuadroSincronizado(); narrar("Quadro limpo"); };
    document.getElementById("btnProximaDica").onclick = avancarDica;
    document.getElementById("btnModoManual").onclick = function () { escolherModo("MANUAL"); };
    document.getElementById("btnModoAuto").onclick = function () { escolherModo("AUTO"); };

    /* P1: Name change button */
    var btnAlterar = document.getElementById("btnAlterarNome");
    var btnConfirmar = document.getElementById("btnConfirmarNome");
    var inputNome = document.getElementById("inputNovoNome");
    var nomeAtual = document.getElementById("nomeAtual");
    if (btnAlterar && btnConfirmar && inputNome && nomeAtual) {
        btnAlterar.onclick = function () {
            inputNome.value = usuarioNome01 || "";
            btnAlterar.style.display = "none";
            nomeAtual.style.display = "none";
            inputNome.style.display = "inline";
            btnConfirmar.style.display = "inline";
            inputNome.focus();
        };
        btnConfirmar.onclick = function () {
            var novo = (inputNome.value || "").trim().substring(0, 20);
            if (!novo || novo === usuarioNome01) {
                inputNome.style.display = "none";
                btnConfirmar.style.display = "none";
                btnAlterar.style.display = "inline";
                nomeAtual.style.display = "inline";
                return;
            }
            var antigo = usuarioNome01;
            usuarioNome01 = novo;
            try { localStorage.setItem("usuarioNome", novo); } catch (e) {}
            document.getElementById("displayUsuario").textContent = novo;
            nomeAtual.textContent = novo;
            /* Update participantes/ */
            if (typeof window.ParticipantManager !== "undefined" && window.ParticipantManager.registrar) {
                window.ParticipantManager.registrar(novo);
            }
            /* Update game.jogadores if in game */
            if (window.db && window.usuarioIdUnico && gameCache01 && gameCache01.jogadores && gameCache01.jogadores[window.usuarioIdUnico]) {
                window.db.ref(PATH.game() + "/jogadores/" + window.usuarioIdUnico + "/nome").set(novo).catch(function () {});
            }
            inputNome.style.display = "none";
            btnConfirmar.style.display = "none";
            btnAlterar.style.display = "inline";
            nomeAtual.style.display = "inline";
            if (typeof window.announce === "function") window.announce("Nome alterado para " + novo, false);
        };
        inputNome.onkeydown = function (e) { if (e.key === "Enter") btnConfirmar.click(); };
    }

    escutarEstadoGlobal();
    escutarChat();
    escutarRankingGeral();
    configurarTema();

    /* P2+P6: Show entry screen — user must type name and confirm */
    var telaEntrada = document.getElementById("telaEntrada");
    if (telaEntrada) {
        telaEntrada.style.display = "block";
        var nomeInput = document.getElementById("nomeUsuario");
        if (nomeInput) {
            nomeInput.value = "";
            nomeInput.focus();
        }
    }

    log("BOOT", "Jogo V10 carregado", window.usuarioIdUnico);
});

/* --- ENTRAR NA SALA / LOBBY --- */
function entrarJogo() {
    var input = document.getElementById("nomeUsuario");
    var nome = (input.value || "").trim();
    if (!nome) { narrarPrioritario("Digite seu nome"); input.focus(); return; }
    if (nome.length > 20) nome = nome.substring(0, 20);
    usuarioNome01 = nome;
    try { localStorage.setItem("usuarioNome", nome); } catch (e) {}

    /* Register in participantes/ (single source of truth for lobby) */
    if (typeof window.ParticipantManager !== "undefined" && window.ParticipantManager.registrar) {
        window.ParticipantManager.registrar(nome);
    }

    /* Read participantes/ to count online — single source of truth */
    window.db.ref("salas/" + window.salaCodigo01 + "/participantes").once("value").then(function (psnap) {
        var participantes = psnap.val() || {};
        var online = Object.keys(participantes).filter(function (k) {
            return participantes[k] && participantes[k].online === true;
        });
        var otherOnline = online.filter(function (k) { return k !== window.usuarioIdUnico; });

        console.log("[JOIN]", {
            usuario: window.usuarioIdUnico,
            participantes: online.length,
            status: (window.gameCache01 && window.gameCache01.status) || "null"
        });

        /* If room is empty or only self, create clean state */
        if (otherOnline.length === 0) {
            window.db.ref(PATH.game()).set({
                status: "aguardando",
                jogadores: {},
                adminId: null,
                rodada: 0
            }).then(function () {
                /* Clean all stale data */
                window.db.ref("salas/" + window.salaCodigo01 + "/ranking").remove().catch(function () {});
                window.db.ref("salas/" + window.salaCodigo01 + "/historico").remove().catch(function () {});
                window.db.ref("salas/" + window.salaCodigo01 + "/chat").remove().catch(function () {});
                window.db.ref("salas/" + window.salaCodigo01 + "/desenho").remove().catch(function () {});
                window.db.ref("salas/" + window.salaCodigo01 + "/fila").remove().catch(function () {});
                return entrarJogoContinuar(nome);
            }).catch(function () {});
            return;
        }

        /* Other players exist — check game state */
        window.db.ref(PATH.game()).once("value").then(function (snap) {
            var g = snap.val();
            var gameStatus = g ? g.status : null;

            if (gameStatus && gameStatus !== "aguardando") {
                /* Game active — enter as pending */
                window.__pendente = true;
                narrarPrioritario("Partida em andamento. Você entrará automaticamente na próxima rodada.");
                document.getElementById("telaEntrada").style.display = "none";
                document.getElementById("salaEspera").style.display = "block";
                document.getElementById("displayUsuario").textContent = nome;
                document.getElementById("statusSistema").textContent = "Aguardando próxima rodada";
                return;
            }

            /* Game in lobby — join normally */
            return entrarJogoContinuar(nome);
        }).catch(function () {
            return entrarJogoContinuar(nome);
        });
    }).catch(function () {
        /* Fallback — join anyway */
        entrarJogoContinuar(nome);
    });
}

function entrarJogoContinuar(nome, _tentativa) {
    var tentativa = _tentativa || 0;
    var MAX_TENTATIVAS = 3;
    var BACKOFF_MS = [300, 600, 1200];
    var gameRef = window.db.ref(PATH.game());
    console.log("[JOIN_GAME]", { usuario: window.usuarioIdUnico, nome: nome, tentativa: tentativa, timestamp: Date.now() });
    gameRef.transaction(function (g2) {
        if (!g2) g2 = {};
        if (!g2.jogadores) g2.jogadores = {};
        if (!g2.status) g2.status = "aguardando";
        if (!g2.rodada) g2.rodada = 0;
        g2.jogadores[window.usuarioIdUnico] = { nome: nome };
        return g2;
    }).then(function (res) {
        console.log("[JOIN_RESULT]", { committed: res.committed, uid: window.usuarioIdUnico, tentativa: tentativa });
        if (!res.committed) {
            if (tentativa < MAX_TENTATIVAS - 1) {
                console.log("[JOIN_RETRY]", { tentativa: tentativa + 1, delay: BACKOFF_MS[tentativa] });
                setTimeout(function () { entrarJogoContinuar(nome, tentativa + 1); }, BACKOFF_MS[tentativa]);
                return;
            }
            narrarPrioritario("Não foi possível entrar na sala após várias tentativas. Tente novamente.");
            return;
        }
        document.getElementById("telaEntrada").style.display = "none";
        document.getElementById("salaEspera").style.display = "block";
        document.getElementById("displayUsuario").textContent = nome;
        document.getElementById("statusSistema").textContent = "Conectado";
        document.getElementById("statusSistema").className = "badge status-online";
        var nc = document.getElementById("nomeContainer");
        var na = document.getElementById("nomeAtual");
        if (nc) nc.style.display = "block";
        if (na) na.textContent = nome;
        if (typeof window.narrarBemVindo === "function") window.narrarBemVindo(nome);
        setTimeout(function () { var el = document.getElementById("tituloSala"); if (el) el.focus(); }, 300);
    }).catch(function (e) {
        log("ERRO", "entrarJogoContinuar", e);
        if (tentativa < MAX_TENTATIVAS - 1) {
            setTimeout(function () { entrarJogoContinuar(nome, tentativa + 1); }, BACKOFF_MS[tentativa]);
        }
    });
}

/* P11+P12: Structured error logging with failsafe */
window.logErro = function (contexto, erro) {
    log("ERRO", contexto + ": " + (erro && erro.message ? erro.message : erro));
    if (erro && erro.stack) console.debug("[ERRO/STACK]", erro.stack);
};

/* P12: Global Firebase operation wrapper — never crashes the UI */
window.fireOp = function (promise, fallback) {
    if (!promise || typeof promise.then !== "function") return promise;
    return promise.catch(function (erro) {
        log("ERRO", "Firebase: " + (erro && erro.message ? erro.message : erro));
        return fallback !== undefined ? fallback : null;
    });
};

/* P17: Reconnection queue handler (called by config.js on reconnect) */
var __reconectando = false;
window.reentrarFilaAposReconexao = function () {
    if (__reconectando) return;
    __reconectando = true;
    if (!window.db || !window.usuarioIdUnico) { __reconectando = false; return; }
    var nome = usuarioNome01;
    if (!nome) { __reconectando = false; return; }

    /* Re-register in participantes/ */
    if (typeof window.ParticipantManager !== "undefined" && window.ParticipantManager.registrar) {
        window.ParticipantManager.registrar(nome);
    }

    /* Read participantes/ to check online count */
    window.db.ref("salas/" + window.salaCodigo01 + "/participantes").once("value").then(function (psnap) {
        var participantes = psnap.val() || {};
        var online = Object.keys(participantes).filter(function (k) {
            return participantes[k] && participantes[k].online === true;
        });

        if (online.length <= 1) {
            /* Only self or empty — create clean state */
            window.db.ref(PATH.game()).set({
                status: "aguardando", jogadores: {}, adminId: null, rodada: 0
            }).then(function () {
                /* Clean stale data */
                window.db.ref("salas/" + window.salaCodigo01 + "/ranking").remove().catch(function () {});
                window.db.ref("salas/" + window.salaCodigo01 + "/historico").remove().catch(function () {});
            }).catch(function () {});
        }

        /* Join game */
        window.db.ref(PATH.game()).transaction(function (g) {
            if (!g) return;
            if (!g.jogadores) g.jogadores = {};
            if (!g.status) g.status = "aguardando";
            g.jogadores[window.usuarioIdUnico] = { nome: nome };
            return g;
        }).then(function (res) {
            if (res.committed) narrarPrioritario("Reconectado ao servidor.");
            __reconectando = false;
        }).catch(function () { __reconectando = false; });
    }).catch(function () { __reconectando = false; });
};

/* P14: Refresh game state from Firebase when tab returns to foreground */
window.__refreshGameState = function () {
    if (!window.db || !window.usuarioIdUnico) return;
    log("ESTADO", "Refreshing game state after tab return");
    window.db.ref(PATH.game()).once("value").then(function (snap) {
        var g = snap.val();
        if (g && typeof g === "object") gameCache01 = g;
        /* Already listened via escutarEstadoGlobal — will re-render on next value event */
    }).catch(function (e) { log("ERRO", "refreshState", e); });
};

/* P1+P2: Reset all local state variables on initial load */
function resetEstadoLocal() {
    window.__desenhistaAtual = null;
    window.__rodadaAtual = null;
    window.__palavraAtual = null;
    window.__statusAtual = null;
    window.__filaLocal = null;
    gameCache01 = null;
    __lastGameHash = "";
    ultimoStatusNarrado = "";
    window.__pendente = false;
    window.__desenhoAutoIniciado = false;
    window.__ultimaEtapaAuto = -1;
    if (window.__fimRodadaTimer) { clearTimeout(window.__fimRodadaTimer); window.__fimRodadaTimer = null; }
    pararCronometroReal();
    try { sessionStorage.clear(); } catch (e) {}
    try {
        var elTela = document.getElementById("telaEntrada");
        if (elTela) elTela.style.display = "block";
        var elLobby = document.getElementById("salaEspera");
        if (elLobby) elLobby.style.display = "none";
        var elJogo = document.getElementById("areaJogo");
        if (elJogo) elJogo.style.display = "none";
    } catch (e) {}
    log("ESTADO", "[ESTADO] resetEstadoLocal concluido");
}
resetEstadoLocal();

/* --- P2: RECONEXAO AUTOMATICA (com validacao de estado) --- */
function reentrarJogo() {
    var nome = usuarioNome01;
    if (!nome) return;

    /* Re-register in participantes/ */
    if (typeof window.ParticipantManager !== "undefined" && window.ParticipantManager.registrar) {
        window.ParticipantManager.registrar(nome);
    }

    /* Read participantes/ to check online count */
    window.db.ref("salas/" + window.salaCodigo01 + "/participantes").once("value").then(function (psnap) {
        var participantes = psnap.val() || {};
        var online = Object.keys(participantes).filter(function (k) {
            return participantes[k] && participantes[k].online === true;
        });

        if (online.length <= 1) {
            /* Only self or empty — create clean state */
            window.db.ref(PATH.game()).set({
                status: "aguardando", jogadores: {}, adminId: null, rodada: 0
            }).catch(function () {});
        }

        /* Join game */
        window.db.ref(PATH.game()).transaction(function (g2) {
            if (!g2) g2 = {};
            if (!g2.jogadores) g2.jogadores = {};
            if (!g2.status) g2.status = "aguardando";
            g2.jogadores[window.usuarioIdUnico] = { nome: nome };
            return g2;
        }).then(function (res) {
            if (!res || !res.committed) return;
            document.getElementById("telaEntrada").style.display = "none";
            document.getElementById("salaEspera").style.display = "block";
            document.getElementById("displayUsuario").textContent = nome;
            document.getElementById("statusSistema").textContent = "Conectado";
            document.getElementById("statusSistema").className = "badge status-online";
            var nc = document.getElementById("nomeContainer"); if (nc) nc.style.display = "block";
            var na = document.getElementById("nomeAtual"); if (na) na.textContent = nome;
            if (typeof window.narrarBemVindo === "function") window.narrarBemVindo(nome);
            setTimeout(function () { var el = document.getElementById("tituloSala"); if (el) el.focus(); }, 300);
        }).catch(function (e) { log("ERRO", "reentrarJogo", e); });
    }).catch(function () {
        /* Fallback — join anyway */
        window.db.ref(PATH.game()).transaction(function (g2) {
            if (!g2) g2 = {};
            if (!g2.jogadores) g2.jogadores = {};
            if (!g2.status) g2.status = "aguardando";
            g2.jogadores[window.usuarioIdUnico] = { nome: nome };
            return g2;
        }).catch(function () {});
    });
}

/* --- LOBBY RENDER --- */
function renderLobby(game) {
    if (!game) return;
    var lista = document.getElementById("listaJogadores");
    var btnIniciar = document.getElementById("btnIniciar");
    var statusSala = document.getElementById("statusSala");
    if (!lista) return;

    /* Use participantes/ for player list — single source of truth */
    var partOnline = window.__participantesOnline || [];
    var nomes = partOnline.slice().sort();
    var adminId = null;
    if (window.gameCache01 && window.gameCache01.adminId) {
        adminId = window.gameCache01.adminId;
    }

    lista.innerHTML = "";
    nomes.forEach(function (id) {
        var li = document.createElement("li");
        li.textContent = id;
        if (id === adminId) {
            var adminSpan = document.createElement("span");
            adminSpan.className = "jogador-admin-tag";
            adminSpan.textContent = "ADMIN";
            li.appendChild(adminSpan);
        }
        lista.appendChild(li);
    });

    var gameStatus = (game && game.status) || "aguardando";
    var inLobby = !gameStatus || gameStatus === "aguardando" || gameStatus === "FIM_PARTIDA";

    if (!inLobby) {
        if (statusSala) statusSala.textContent = "Partida em andamento.";
        if (btnIniciar) btnIniciar.style.display = "none";
    } else if (nomes.length < 2) {
        if (statusSala) statusSala.textContent = "Aguardando mais jogadores (" + nomes.length + " na sala, mínimo 2)";
        if (btnIniciar) btnIniciar.style.display = "none";
    } else {
        var euAdmin = (adminId === window.usuarioIdUnico);
        if (statusSala) statusSala.textContent = euAdmin
            ? nomes.length + " jogador(es) na sala. Pronto para começar!"
            : "Aguardando o administrador iniciar a partida...";
        if (btnIniciar) btnIniciar.style.display = euAdmin ? "block" : "none";
    }
}

/* --- INICIAR PARTIDA (admin only) --- */
function iniciarPartida() {
    console.log("[BTN_CLICK]", { timestamp: Date.now(), usuario: window.usuarioIdUnico });
    console.log("[START_ENTER]", { usuario: window.usuarioIdUnico, admin: true, timestamp: Date.now() });
    __disableTemporario("btnIniciar", 2000);

    /* Read participantes/ and game/ in parallel to guarantee consistency */
    var base = "salas/" + window.salaCodigo01;
    Promise.all([
        window.db.ref(base + "/participantes").once("value"),
        window.db.ref(PATH.game()).once("value")
    ]).then(function (snaps) {
        var participantes = snaps[0].val() || {};
        var game = snaps[1].val() || {};

        /* Online user IDs from participantes/ */
        var onlineIds = Object.keys(participantes).filter(function (k) {
            return participantes[k] && participantes[k].online === true;
        }).sort();

        /* Player IDs from game/jogadores */
        var gameJogadores = game.jogadores || {};
        var gameIds = Object.keys(gameJogadores).sort();

        /* Compare the two lists */
        var missing = onlineIds.filter(function (id) { return gameIds.indexOf(id) === -1; });

        console.log("[CONSISTENCIA_CHECK]", {
            participantes: onlineIds.length,
            gameJogadores: gameIds.length,
            usuariosParticipantes: onlineIds,
            usuariosGame: gameIds
        });

        console.log("[START_GAME]", {
            admin: window.usuarioIdUnico,
            participantes: onlineIds.length,
            gameJogadores: gameIds.length,
            status: game.status || "null",
            divergencia: missing.length > 0
        });

        /* Validate minimum participants */
        if (onlineIds.length < 2) {
            narrarPrioritario("Mínimo de 2 jogadores para iniciar.");
            console.log("[START_ABORT]", { motivo: "PARTICIPANTES_INSUFICIENTES", count: onlineIds.length });
            return;
        }

        /* Validate minimum game.jogadores */
        if (gameIds.length < 2) {
            narrarPrioritario("Mínimo de 2 jogadores para iniciar.");
            console.log("[START_ABORT]", { motivo: "GAME_JOGADORES_INSUFICIENTES", count: gameIds.length });
            return;
        }

        /* Validate consistency — participantes and game.jogadores must match */
        if (missing.length > 0) {
            narrarPrioritario("Aguardando jogadores se sincronizarem. Tente novamente em alguns segundos.");
            console.log("[CONSISTENCIA_FALHOU]", {
                participantes: onlineIds.length,
                gameJogadores: gameIds.length,
                usuariosAusentes: missing
            });
            return;
        }

        /* All validations passed — proceed with transaction */
        console.log("[START_TRANSACTION_BEGIN]");
        var gameRef = window.db.ref(PATH.game());
        gameRef.transaction(function (g) {
            console.log("[START_TRANSACTION_EXEC]", { statusAtual: g && g.status, jogadores: Object.keys(g && g.jogadores || {}) });
            if (!g || !g.jogadores) { console.log("[START_RETURN]", { motivo: "GAME_NULL_OU_SEM_JOGADORES" }); return g; }
            var jogos = g.jogadores;
            var ids = Object.keys(jogos);
            if (ids.length < 2) { console.log("[START_RETURN]", { motivo: "TRANSACAO_JOGADORES_INSUFICIENTES", count: ids.length }); return g; }
            if (g.adminId !== window.usuarioIdUnico) { console.log("[START_RETURN]", { motivo: "NAO_E_ADMIN_NA_TRANSACTION" }); return g; }
            if (g.status !== "aguardando") { console.log("[START_RETURN]", { motivo: "STATUS_NAO_AGUARDANDO_NA_TRANSACTION", status: g.status }); return g; }

            var fila = ids.slice();
            for (var i = fila.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = fila[i]; fila[i] = fila[j]; fila[j] = tmp;
            }

            var opcoes = obterPalavrasComTracos(3);
            if (opcoes.length < 3) { console.log("[START_RETURN]", { motivo: "PALAVRAS_INSUFICIENTES", count: opcoes.length }); return g; }

            var novo = Object.assign({}, g);
            novo.status = "ESCOLHENDO_PALAVRA";
            novo.filaOrdem = fila;
            novo.filaIndex = 0;
            novo.desenhistaId = fila[0];
            novo.desenhistaNome = __resolverNome(fila[0], jogos) || (jogos[fila[0]] && jogos[fila[0]].nome) || "Jogador";
            novo.palavraOpcoes = {};
            opcoes.forEach(function (p, idx) { novo.palavraOpcoes[idx] = p; });
            novo.palavra = null;
            novo.modoDesenho = null;
            novo.rodada = 1;
            novo.totalRodadas = fila.length * 2;
            novo.inicio = null;
            novo.dicaIndex = 0;
            novo.dicaAtual = null;
            novo.acertadores = {};
            novo.pontosJogo = {};
            console.log("[START_WRITE]", { status: "ESCOLHENDO_PALAVRA", jogadores: ids.length });
            return novo;
        }).then(function (res) {
            console.log("[START_TRANSACTION_RESULT]", { committed: res && res.committed });
            console.log("[START_RESULT]", { committed: res.committed });
            if (res.committed) {
                var val = res.snapshot.val();
                console.log("[START_SUCCESS]", { status: val.status, jogadores: Object.keys(val.jogadores || {}).length });
            }
        }).catch(function (e) { log("ERRO", "iniciarPartida", e); });
    }).catch(function (e) {
        log("ERRO", "iniciarPartida.consistencia", e);
    });
}

/* --- REVANCHE --- */
function iniciarRevanche() {
    if (window.__iniciandoRevanche) return;
    window.__iniciandoRevanche = true;
    setTimeout(function () { window.__iniciandoRevanche = false; }, 2000);

    /* Read participantes/ and game/ in parallel to guarantee consistency */
    var base = "salas/" + window.salaCodigo01;
    Promise.all([
        window.db.ref(base + "/participantes").once("value"),
        window.db.ref(PATH.game()).once("value")
    ]).then(function (snaps) {
        var participantes = snaps[0].val() || {};
        var game = snaps[1].val() || {};

        var onlineIds = Object.keys(participantes).filter(function (k) {
            return participantes[k] && participantes[k].online === true;
        }).sort();

        var gameJogadores = game.jogadores || {};
        var gameIds = Object.keys(gameJogadores).sort();

        var missing = onlineIds.filter(function (id) { return gameIds.indexOf(id) === -1; });

        console.log("[REVANCHE_CONSISTENCIA]", {
            participantes: onlineIds.length,
            gameJogadores: gameIds.length,
            divergencia: missing.length > 0
        });

        if (onlineIds.length < 2 || gameIds.length < 2 || missing.length > 0) {
            narrarPrioritario("Jogadores insuficientes ou fora de sincronia para revanche.");
            console.log("[REVANCHE_ABORT]", { motivo: "INCONSISTENCIA", missing: missing });
            return;
        }

        var gameRef = window.db.ref(PATH.game());
        gameRef.transaction(function (g) {
            if (!g || !g.jogadores) return g;
            var jogos = g.jogadores;
            var ids = Object.keys(jogos);
            if (ids.length < 2) return g;

            var fila = ids.slice();
            for (var i = fila.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = fila[i]; fila[i] = fila[j]; fila[j] = tmp;
            }

            var opcoes = obterPalavrasComTracos(3);
            if (opcoes.length < 3) return g;

            var novo = Object.assign({}, g);
            novo.status = "ESCOLHENDO_PALAVRA";
            novo.filaOrdem = fila;
            novo.filaIndex = 0;
            novo.desenhistaId = fila[0];
            novo.desenhistaNome = __resolverNome(fila[0], jogos) || (jogos[fila[0]] && jogos[fila[0]].nome) || "Jogador";
            novo.palavraOpcoes = {};
            opcoes.forEach(function (p, idx) { novo.palavraOpcoes[idx] = p; });
            novo.palavra = null;
            novo.modoDesenho = null;
            novo.rodada = 1;
            novo.totalRodadas = fila.length * 2;
            novo.inicio = null;
            novo.dicaIndex = 0;
            novo.dicaAtual = null;
            novo.acertadores = {};
            novo.pontosJogo = {};
            return novo;
        }).then(function (res) {
            if (res.committed) {
                log("SISTEMA", "Revanche iniciada");
                if (typeof window.narrarRevanche === "function") window.narrarRevanche();
            }
        }).catch(function (e) { log("ERRO", "iniciarRevanche", e); });
    }).catch(function (e) {
        log("ERRO", "iniciarRevanche.consistencia", e);
    });
}

/* --- ESCOLHER PALAVRA (desenhista only) --- */
function escolherPalavra(palavra) {
    if (!palavra || window.__escolhendoPalavra) return;
    window.__escolhendoPalavra = true;
    setTimeout(function () { window.__escolhendoPalavra = false; }, 1500);
    var gameRef = window.db.ref(PATH.game());
    gameRef.transaction(function (g) {
        if (!g) return g;
        if (g.status !== "ESCOLHENDO_PALAVRA") return g;
        if (g.desenhistaId !== window.usuarioIdUnico) return g;
        var novo = Object.assign({}, g);
        novo.palavra = palavra;
        novo.status = "ESCOLHENDO_MODO";
        return novo;
    }).then(function (res) {
        if (res.committed) log("SISTEMA", "Palavra escolhida: " + palavra);
    }).catch(function (e) { log("ERRO", "escolherPalavra", e); });
}

/* --- ESCOLHER MODO (desenhista only) --- */
function escolherModo(modo) {
    if (!modo || window.__escolhendoModo) return;
    window.__escolhendoModo = true;
    setTimeout(function () { window.__escolhendoModo = false; }, 1500);
    var gameRef = window.db.ref(PATH.game());
    gameRef.transaction(function (g) {
        if (!g) return g;
        if (g.status !== "ESCOLHENDO_MODO") return g;
        if (g.desenhistaId !== window.usuarioIdUnico) return g;
        var novo = Object.assign({}, g);
        novo.modoDesenho = modo;
        novo.status = "JOGANDO";
        novo.inicio = firebase.database.ServerValue.TIMESTAMP;
        novo.dicaIndex = 0;
        novo.acertadores = {};
        return novo;
    }).then(function (res) {
        if (res.committed) {
            log("SISTEMA", "Modo " + modo + " - rodada " + (res.snapshot.val().rodada || 1));
            if (modo === "MANUAL" && typeof window.narrarPalavraSecreta === "function") {
                window.narrarPalavraSecreta(res.snapshot.val().palavra, true);
            }
        }
    }).catch(function (e) { log("ERRO", "escolherModo", e); });
}

/* --- LOBBY JOGADORES LISTENER (tempo real) --- */
/* P1+P3+P4: Sala vazia — reset completo do Firebase com delay de 15s */
var __timerResetSala = null;
var RESET_SALA_DELAY_MS = 15000;

function cancelarResetSala() {
    if (__timerResetSala) {
        clearTimeout(__timerResetSala);
        __timerResetSala = null;
        log("ESTADO", "[ESTADO] Reset cancelado — jogadores retornaram");
    }
}

function executarResetSala() {
    __timerResetSala = null;
    if (!window.db || !window.salaCodigo01) return;
    var base = "salas/" + window.salaCodigo01;

    /* Read state before reset for log */
    window.db.ref(base).once("value").then(function (snap) {
        var data = snap.val() || {};
        var participantes = data.participantes || {};
        var onlineCount = Object.keys(participantes).filter(function (k) {
            return participantes[k] && participantes[k].online === true;
        }).length;

        console.log("[RESET_SALA]", {
            participantesAntes: onlineCount,
            statusAntes: (data.game && data.game.status) || "null"
        });

        /* Reset game/ to clean state */
        return window.db.ref(base + "/game").set({
            status: "aguardando",
            jogadores: {},
            adminId: null,
            rodada: 0
        });
    }).then(function () {
        /* Remove ALL stale data */
        return Promise.all([
            window.db.ref(base + "/chat").remove(),
            window.db.ref(base + "/desenho").remove(),
            window.db.ref(base + "/fila").remove(),
            window.db.ref(base + "/ranking").remove(),
            window.db.ref(base + "/historico").remove(),
            window.db.ref(base + "/participantes").remove()
        ]);
    }).then(function () {
        console.log("[RESET_SALA_DONE]", { timestamp: Date.now() });
    }).catch(function (e) { log("ERRO", "executarResetSala", e); });
}

function agendarResetSala() {
    if (__timerResetSala) return;
    if (!window.db || !window.salaCodigo01) return;
    log("ESTADO", "[ESTADO] Sala vazia — aguardando " + (RESET_SALA_DELAY_MS / 1000) + "s para confirmar");
    __timerResetSala = setTimeout(function () {
        /* Confirm room is genuinely empty — check only participantes/online.
           game/jogadores may have stale entries from crashed clients.
           executarResetSala() transaction has its own guard: if game/jogadores
           is non-empty it aborts, so this pre-check is safe to skip. */
        window.db.ref("salas/" + window.salaCodigo01 + "/participantes").once("value").then(function (snap) {
            var participantes = snap.val() || {};
            var algumOnline = Object.keys(participantes).some(function (uid) {
                return participantes[uid] && participantes[uid].online === true;
            });
            if (!algumOnline) {
                executarResetSala();
            } else {
                log("ESTADO", "[ESTADO] Reset cancelado — participante(s) ainda ativo(s)");
                __timerResetSala = null;
            }
        }).catch(function () {
            executarResetSala();
        });
    }, RESET_SALA_DELAY_MS);
}

/* escutarLobbyJogadores removido — LobbyManager + AdminManager em participantes.js substituem */

/* P5: State machine — exactly one view visible at all times */
var ESTADO_LOBBY = "LOBBY";
var ESTADO_GAME = "GAME";

function aplicarEstadoVisao(estado, game) {
    console.log("[VIEW_APPLY]", { estado: estado });
    var lobby = document.getElementById("salaEspera");
    var gameArea = document.getElementById("areaJogo");
    var telaEntrada = document.getElementById("telaEntrada");
    if (!lobby || !gameArea) return false;
    if (estado === ESTADO_LOBBY) {
        if (gameArea.style.display !== "none") gameArea.style.display = "none";
        if (lobby.style.display === "none") {
            lobby.style.display = "block";
            if (telaEntrada && telaEntrada.style.display !== "none") telaEntrada.style.display = "none";
        }
        var _cardV = document.getElementById("cardVoce");
        if (_cardV) _cardV.style.display = "none";
        /* LobbyManager (participantes.js) renderiza de participantes/ — fallback mantido */
        if (typeof window.LobbyManager !== "undefined" && window.LobbyManager.render) {
            /* LobbyManager já escuta participantes/ e renderiza automaticamente */
        } else {
            renderLobby(game);
        }
        return true;
    }
    if (estado === ESTADO_GAME) {
        if (lobby.style.display !== "none") lobby.style.display = "none";
        if (gameArea.style.display === "none") {
            gameArea.style.display = "block";
            setTimeout(function () { var el = document.getElementById("statusPartida"); if (el) el.focus(); }, 200);
        }
        renderJogo(game);
        return true;
    }
    return false;
}

/* P4: Valid game statuses — strict state machine */
var ESTADOS_VALIDOS = ["aguardando", "ESCOLHENDO_PALAVRA", "ESCOLHENDO_MODO", "JOGANDO", "FIM_RODADA", "FIM_PARTIDA"];

function estadoValido(s) {
    if (!s) return false;
    return ESTADOS_VALIDOS.indexOf(s) !== -1;
}

/* --- GAME STATE LISTENER --- */
var __listenersSetup = {};
function escutarEstadoGlobal() {
    if (__listenersSetup["estadoGlobal"]) return;
    __listenersSetup["estadoGlobal"] = true;
    window.db.ref(PATH.game()).on("value", function (snap) {
        var game = snap.val();
        if (!game || typeof game !== "object") return;

        console.log("[STATE_RECEIVED]", { status: game && game.status });

        /* P4: Validate state — force invalid status to "aguardando" */
        var statusOriginal = game.status;
        if (statusOriginal && !estadoValido(statusOriginal)) {
            log("ESTADO", "[ESTADO] INVALIDO \"" + statusOriginal + "\" forcado para AGUARDANDO");
            game = Object.assign({}, game);
            game.status = "aguardando";
            game.desenhistaId = null;
            game.desenhistaNome = null;
            game.palavra = null;
            game.palavraOpcoes = null;
            game.modoDesenho = null;
            game.filaOrdem = null;
            game.filaIndex = null;
        }

        /* P1: Strip sensitive data for non-drawers (except at round-end reveal) */
        var ehDesenhista = (game.desenhistaId === window.usuarioIdUnico);
        var statusRevelado = (game.status === "FIM_RODADA" || game.status === "FIM_PARTIDA");
        if (!ehDesenhista && !statusRevelado) {
            game = Object.assign({}, game);
            delete game.palavra;
            delete game.palavraOpcoes;
            delete game.modoDesenho;
        }

        var _oldStatus = window.gameCache01 ? window.gameCache01.status : null;
        var _partOnline = window.__participantesOnline ? window.__participantesOnline.length : 0;

        console.log("[STATE_SYNC]", {
            status: game.status || "null",
            participantes: _partOnline,
            gameJogadores: Object.keys(game.jogadores || {}).length
        });

        gameCache01 = game;
        salvarSessao(game);

        /* P5: State machine decision — use participantes/ for count */
        var euNoJogo = game.jogadores && game.jogadores[window.usuarioIdUnico];
        var ehAguardandoOuNulo = !game.status || game.status === "aguardando";

        /* Auto-add pending participant when game returns to lobby */
        if (ehAguardandoOuNulo && window.__pendente && window.usuarioIdUnico) {
            window.__pendente = false;
            var uid = window.usuarioIdUnico;
            var nome = usuarioNome01;
            window.db.ref(PATH.game()).transaction(function (g) {
                if (!g) return;
                if (!g.jogadores) g.jogadores = {};
                if (g.jogadores[uid]) return;
                g.jogadores[uid] = { nome: nome };
                return g;
            }).catch(function () {});
        }

        /* User not in game.jogadores — show lobby */
        if (!euNoJogo || ehAguardandoOuNulo) {
            console.log("[VIEW_REQUEST]", { estado: ESTADO_LOBBY });
            aplicarEstadoVisao(ESTADO_LOBBY, game);
            return;
        }

        /* P5: Hash check — skip render if nothing changed */
        var jogadoresIds = Object.keys(game.jogadores || {}).sort().join(",");
        var ptsStr = game.pontosJogo ? Object.keys(game.pontosJogo).sort().map(function (k) { return k + ":" + ((game.pontosJogo[k] && game.pontosJogo[k].pontos) || 0); }).join(",") : "";
        var hash = (game.status || "") + "_" + (game.rodada || 0) + "_" + (game.palavra || "") + "_" + (game.dicaIndex || 0) + "_" + (game.dicaAtual || "") + "_" + Object.keys(game.acertadores || {}).length + "_" + jogadoresIds + "_" + Object.keys(game.jogadores || {}).length + "_" + (game.adminId || "") + "_" + (game.desenhistaId || "") + "_" + (game.modoDesenho || "") + "_" + (game.inicio || "") + "_" + (game.filaIndex || 0) + "_" + ptsStr;
        if (window.__lastGameHash === hash) {
            return;
        }
        window.__lastGameHash = hash;

        console.log("[VIEW_REQUEST]", { estado: ESTADO_GAME });
        aplicarEstadoVisao(ESTADO_GAME, game);

        var podeDesenhar = ehDesenhista && (game.status === "JOGANDO");
        if (typeof window.liberarDesenho === "function") window.liberarDesenho(podeDesenhar);
    });
}

/* --- SYNC: participantes/ ↔ game/jogadores ---
   Called by LobbyManager when participantes/ changes.
   When status = aguardando:
     - Removes offline users from game/jogadores
     - Adds missing online users to game/jogadores (uses real names from participantes)
   Never removes online users. Never uses game.set(). Only transactions.
   Flow: participantes mudou → read status only → transaction (no redundant read) */
var __syncRunning = false;
window.__syncGameJogadores = function (participantes, onlineIds) {
    if (__syncRunning) return;
    if (!window.db || !window.usuarioIdUnico) return;
    if (!participantes || !Array.isArray(onlineIds) || onlineIds.length === 0) return;

    __syncRunning = true;
    var gamePath = PATH.game();

    /* PROBLEMA 2: read real status from Firebase, not gameCache01 */
    window.db.ref(gamePath + "/status").once("value").then(function (snap) {
        var status = snap.val();
        if (status && status !== "aguardando") {
            __syncRunning = false;
            return;
        }
        /* participantes already passed — no redundant read */
        return window.db.ref(gamePath).transaction(function (g) {
            if (!g) return;
            if (!g.jogadores) g.jogadores = {};
            if (g.status && g.status !== "aguardando") return;
            var changed = false;
            var gameIds = Object.keys(g.jogadores);
            gameIds.forEach(function (uid) {
                if (onlineIds.indexOf(uid) === -1) {
                    delete g.jogadores[uid];
                    changed = true;
                }
            });
            onlineIds.forEach(function (uid) {
                if (!g.jogadores[uid]) {
                    var p = participantes[uid];
                    var nome = (p && p.nome) ? p.nome : null;
                    if (!nome) return;
                    g.jogadores[uid] = { nome: nome };
                    changed = true;
                }
            });
            return changed ? g : undefined;
        });
    }).then(function (res) {
        __syncRunning = false;
        if (res && res.committed) {
            console.log("[SYNC_GAME]", { committed: true, online: onlineIds.length });
        }
    }).catch(function () { __syncRunning = false; });
};

/* --- CARD VOCÊ --- */
function atualizarCardVoce(game) {
    var card = document.getElementById("cardVoce");
    var nomeEl = document.getElementById("cardVoceNome");
    var statusEl = document.getElementById("cardVoceStatus");
    if (!card || !nomeEl || !statusEl) return;
    if (!game || !game.jogadores || !game.jogadores[window.usuarioIdUnico]) {
        card.style.display = "none";
        return;
    }
    card.style.display = "block";
    var nome = __nomeExibicao(window.usuarioIdUnico);
    var ehAdmin = (game.adminId === window.usuarioIdUnico);
    var ehDesenhista = (game.desenhistaId === window.usuarioIdUnico);
    var status = game.status || "aguardando";
    nomeEl.textContent = ehAdmin ? nome + " (Admin)" : nome;
    if (status === "aguardando") statusEl.textContent = "Aguardando sua vez";
    else if (status === "ESCOLHENDO_PALAVRA" && ehDesenhista) statusEl.textContent = "Escolhendo palavra";
    else if (status === "ESCOLHENDO_PALAVRA") statusEl.textContent = "Escolhendo palavra...";
    else if (status === "ESCOLHENDO_MODO" && ehDesenhista) statusEl.textContent = "Escolhendo modo de desenho";
    else if (status === "ESCOLHENDO_MODO") statusEl.textContent = "Escolhendo modo...";
    else if (status === "JOGANDO" && ehDesenhista) statusEl.textContent = "Desenhando agora";
    else if (status === "JOGANDO") statusEl.textContent = "Aguardando palpite";
    else if (status === "FIM_RODADA") statusEl.textContent = "Rodada encerrada";
    else if (status === "FIM_PARTIDA") statusEl.textContent = "Fim de partida";
    else statusEl.textContent = "";
}

/* --- RENDER JOGO --- */
function renderJogo(game) {
    if (!game) return;
    var status = game.status || "aguardando";
    window.ehDesenhista = (game.desenhistaId === window.usuarioIdUnico);
    log("RENDER", "renderJogo status=" + status + " ehDesenhista=" + window.ehDesenhista + " admin=" + (game.adminId === window.usuarioIdUnico));
    var ehAdmin = (game.adminId === window.usuarioIdUnico);

    pararCronometroReal();

    var elSt = document.getElementById("statusPartida");
    var areaEscolhaDesenho = document.getElementById("areaEscolhaDesenho");
    var escolhaModo = document.getElementById("escolhaModo");
    var controlesDesenho = document.getElementById("controlesDesenho");
    var areaEscolhaPalavra = document.getElementById("areaEscolhaPalavra");
    var areaFimRodada = document.getElementById("areaFimRodada");
    var containerChute = document.getElementById("containerChute");

    document.getElementById("cronometro").textContent = "--:--";
    document.getElementById("textoDica").textContent = "Aguardando...";

    /* P2: Hide guess input by default — show only during JOGANDO for non-drawers */
    if (containerChute) containerChute.style.display = "none";

    if (areaEscolhaDesenho) areaEscolhaDesenho.style.display = "none";
    if (escolhaModo) escolhaModo.style.display = "none";
    if (controlesDesenho) controlesDesenho.style.display = "none";
    if (areaEscolhaPalavra) areaEscolhaPalavra.style.display = "none";
    if (areaFimRodada) areaFimRodada.style.display = "none";

    renderFila(game);
    atualizarCardVoce(game);

    if (status === "ESCOLHENDO_PALAVRA") {
        /* P1+P9: Clean up previous round artifacts when entering choice phase */
        limparTransicaoRodada();
        if (elSt) elSt.innerHTML = window.ehDesenhista ? "Escolha a palavra para desenhar" : __nomeExibicao(game.desenhistaId) + '<span class="status-sub">está escolhendo a palavra...</span>';
        if (window.ehDesenhista && areaEscolhaPalavra) {
            areaEscolhaPalavra.style.display = "block";
            var grid = document.getElementById("opcoesPalavra");
            grid.innerHTML = "";
            var opcoes = game.palavraOpcoes || {};
            Object.keys(opcoes).sort().forEach(function (k) {
                var p = opcoes[k];
                var btn = document.createElement("button");
                btn.textContent = p;
                btn.setAttribute("aria-label", "Desenhar " + p);
                btn.onclick = function () { escolherPalavra(p); };
                grid.appendChild(btn);
            });
            if (typeof window.narrarEscolherPalavra === "function") window.narrarEscolherPalavra();
            /* Focus word choice */
            var tituloPalavra = document.getElementById("tituloEscolhaPalavra");
            if (tituloPalavra) { tituloPalavra.setAttribute("tabindex", "-1"); setTimeout(function () { tituloPalavra.focus(); }, 100); }
        }
        return;
    }

    if (status === "ESCOLHENDO_MODO") {
        if (elSt) elSt.innerHTML = window.ehDesenhista ? "Escolha como desenhar: Manual ou Automático" : __nomeExibicao(game.desenhistaId) + '<span class="status-sub">está escolhendo o modo de desenho...</span>';
        if (window.ehDesenhista && areaEscolhaDesenho) {
            areaEscolhaDesenho.style.display = "flex";
            if (escolhaModo) escolhaModo.style.display = "flex";
            var tituloControles = document.getElementById("tituloControles");
            if (tituloControles) { tituloControles.setAttribute("tabindex", "-1"); setTimeout(function () { tituloControles.focus(); }, 100); }
        }
        return;
    }

    if (status === "JOGANDO") {
        iniciarCronometroReal();
        var agora = window.agora ? window.agora() : Date.now();
        var inicio = typeof game.inicio === "number" ? game.inicio : agora;
        var tempoRestante = Math.max(0, 120 - Math.floor((agora - inicio) / 1000));
        var min = String(Math.floor(tempoRestante / 60)).padStart(2, "0");
        var seg = String(tempoRestante % 60).padStart(2, "0");
        document.getElementById("cronometro").textContent = min + ":" + seg;

        atualizarDica(game);

        if (window.ehDesenhista) {
            if (elSt) elSt.textContent = "Você está desenhando: " + (game.palavra || "?");
            if (areaEscolhaDesenho) areaEscolhaDesenho.style.display = "flex";
            if (escolhaModo) escolhaModo.style.display = "none";
            if (controlesDesenho) controlesDesenho.style.display = "flex";
        }

        if (game.modoDesenho === "AUTO" && window.ehDesenhista && !window.__desenhoAutoIniciado) {
            window.__desenhoAutoIniciado = true;
            window.__ultimaEtapaAuto = -1;
            window.executarDesenhoAutomatico(game.palavra, function (atual, total, cancelado) {
                if (cancelado) return;
                var pct = Math.floor((atual / total) * 100);
                var etapa = -1;
                if (atual >= total) etapa = 4;
                else if (pct >= 75) etapa = 3;
                else if (pct >= 50) etapa = 2;
                else if (pct >= 25) etapa = 1;
                else etapa = 0;
                if (etapa === window.__ultimaEtapaAuto) return;
                window.__ultimaEtapaAuto = etapa;
                var descricoes = ["iniciando o desenho", "desenhando estrutura principal", "adicionando mais elementos", "finalizando detalhes", "desenho concluido"];
                if (typeof window.narrarAutoDrawEtapa === "function") window.narrarAutoDrawEtapa(atual, total, descricoes[etapa] || "");
            });
        }

        /* P2: Show guess input only for non-drawers who haven't guessed */
        if (!window.ehDesenhista && (!game.acertadores || !game.acertadores[window.usuarioIdUnico])) {
            if (containerChute) containerChute.style.display = "flex";
            if (elSt) elSt.innerHTML = "Rodada " + (game.rodada || 1) + " de " + (game.totalRodadas || "?") + '<span class="status-sub">' + __nomeExibicao(game.desenhistaId) + " está desenhando</span>";
        } else if (game.acertadores && game.acertadores[window.usuarioIdUnico]) {
            if (containerChute) containerChute.style.display = "none";
            if (elSt) elSt.textContent = "Você acertou! Aguarde o fim da rodada.";
        }

        /* Narrar transicoes */
        if (status !== ultimoStatusNarrado) {
            if (typeof window.narrarTurno === "function") window.narrarTurno(game.desenhistaNome, game.rodada, game.totalRodadas);
            if (typeof window.narrarPalavraSecreta === "function") window.narrarPalavraSecreta(game.palavra, window.ehDesenhista);
            ultimoStatusNarrado = status;
        }
        return;
    }

    if (status === "FIM_RODADA") {
        if (elSt) elSt.textContent = "Fim da Rodada " + (game.rodada || 1) + " de " + (game.totalRodadas || "?");
        renderFimRodada(game);
        return;
    }

    if (status === "FIM_PARTIDA") {
        if (elSt) elSt.textContent = "Partida Encerrada";
        renderFimPartida(game);
        return;
    }

    if (elSt) elSt.textContent = "Aguardando...";
    /* P10: Canvas empty-state overlay */
    var elOverlay = document.getElementById("canvasOverlay");
    if (elOverlay) {
        if (status === "JOGANDO") {
            var temTraco = typeof window.temTracoNoCanvas === "function" ? window.temTracoNoCanvas() : false;
            if (temTraco || game.modoDesenho === "AUTO") {
                elOverlay.style.display = "none";
            } else {
                var overlaySpan = document.createElement("span");
                overlaySpan.textContent = game.desenhistaNome + " está desenhando...";
                elOverlay.textContent = "";
                elOverlay.appendChild(overlaySpan);
                elOverlay.style.display = "flex";
            }
        } else {
            elOverlay.style.display = "none";
        }
    }
    /* P12: Hide countdown overlay on any non-FIM_RODADA state */
    if (status !== "FIM_RODADA" && status !== "FIM_PARTIDA") {
        var cdOverlay = document.getElementById("countdownOverlay");
        if (cdOverlay) cdOverlay.style.display = "none";
        if (window.__countdownInterval) { clearInterval(window.__countdownInterval); window.__countdownInterval = null; }
    }
    log("RENDER", "Render concluido: " + status);
}

/* P4+P9: Clean up ALL transient state between rounds */
function limparTransicaoRodada() {
    if (window.__fimRodadaTimer) { clearTimeout(window.__fimRodadaTimer); window.__fimRodadaTimer = null; }
    window.__desenhoAutoIniciado = false;
    window.__ultimaEtapaAuto = -1;
    var inputChute = document.getElementById("chutePalavra");
    if (inputChute) { inputChute.value = ""; }
    document.getElementById("textoDica").textContent = "Aguardando...";
    document.getElementById("cronometro").textContent = "--:--";
    limparChatRodada();
    if (typeof window.limparQuadroSincronizado === "function") window.limparQuadroSincronizado();
}

/* --- FIM DE RODADA --- */
function renderFimRodada(game) {
    limparTransicaoRodada();
    var container = document.getElementById("areaFimRodada");
    var conteudo = container ? container.querySelector(".fim-rodada-conteudo") : null;
    if (!container || !conteudo) return;
    container.style.display = "block";
    container.querySelector("h3") && container.querySelector("h3").remove();

    var h3 = document.createElement("h3");
    h3.textContent = "Fim da Rodada " + (game.rodada || 1);
    h3.setAttribute("tabindex", "-1");
    container.insertBefore(h3, conteudo);

    conteudo.innerHTML = "";
    var pPalavra = document.createElement("p");
    pPalavra.className = "fim-rodada-palavra";
    pPalavra.textContent = "A palavra era: " + (game.palavra || "?");
    conteudo.appendChild(pPalavra);

    var acertadores = game.acertadores || {};
    var keys = Object.keys(acertadores);
    if (keys.length > 0) {
        keys.sort(function (a, b) { return (acertadores[a].ordem || 0) - (acertadores[b].ordem || 0); });
        keys.forEach(function (id) {
            var info = acertadores[id] || {};
            var p = document.createElement("p");
            p.className = "fim-rodada-acertador";
            p.textContent = __nomeExibicao(id) + " acertou! (" + (info.pontos || 0) + " pts)";
            conteudo.appendChild(p);
        });
    } else {
        var pNinguem = document.createElement("p");
        pNinguem.className = "fim-rodada-errou";
        pNinguem.textContent = "Ninguem acertou nesta rodada.";
        conteudo.appendChild(pNinguem);
    }

    if (typeof window.narrarFimRodada === "function") window.narrarFimRodada(game.palavra);
    ultimoStatusNarrado = "FIM_RODADA";

    /* Focus on round-end heading */
    var focoRodada = container.querySelector("h3");
    if (focoRodada) setTimeout(function () { focoRodada.focus(); }, 100);

    /* P12: Countdown overlay — silencioso, sem aria-live */
    var overlay = document.getElementById("countdownOverlay");
    if (overlay) {
        var totalSeg = 8;
        overlay.style.display = "flex";
        overlay.innerHTML = "<span class='count-num'>" + totalSeg + "</span><span class='count-label'>Nova rodada em...</span>";
        var spanNum = overlay.querySelector(".count-num");
        var contadorSeg = totalSeg;
        if (window.__countdownInterval) { clearInterval(window.__countdownInterval); window.__countdownInterval = null; }
        window.__countdownInterval = setInterval(function () {
            contadorSeg--;
            if (overlay && contadorSeg > 0 && spanNum) {
                spanNum.textContent = contadorSeg;
            }
            if (contadorSeg <= 0) {
                clearInterval(window.__countdownInterval);
                window.__countdownInterval = null;
                if (overlay) overlay.style.display = "none";
            }
        }, 1000);
    }

    if (window.__fimRodadaTimer) clearTimeout(window.__fimRodadaTimer);
    window.__fimRodadaTimer = setTimeout(function () {
        var gameRef = window.db.ref(PATH.game());
        gameRef.transaction(function (g) {
            if (!g) return g;
            if (g.status !== "FIM_RODADA") return g;
            /* P7: Increment rodadasDesenhadas for the outgoing drawer */
            if (g.desenhistaId && g.pontosJogo) {
                var pts = Object.assign({}, g.pontosJogo);
                if (pts[g.desenhistaId]) {
                    pts[g.desenhistaId].rodadasDesenhadas = (pts[g.desenhistaId].rodadasDesenhadas || 0) + 1;
                    g.pontosJogo = pts;
                }
            }
            var idx = (g.filaIndex || 0) + 1;
            var total = g.totalRodadas || 1;
            if (idx >= total) {
                var novo = Object.assign({}, g);
                novo.status = "FIM_PARTIDA";
                return novo;
            }
            var fila = g.filaOrdem || [];
            var proxId = fila[idx % fila.length];
            var jogos = g.jogadores || {};
            var opcoes = obterPalavrasComTracos(3);
            if (opcoes.length < 3) opcoes = ["casa", "sol", "arvore"];
            var novo = Object.assign({}, g);
            novo.status = "ESCOLHENDO_PALAVRA";
            novo.filaIndex = idx;
            novo.desenhistaId = proxId;
            novo.desenhistaNome = __resolverNome(proxId, jogos) || (jogos[proxId] && jogos[proxId].nome) || "Jogador";
            novo.palavraOpcoes = {};
            opcoes.forEach(function (p, i) { novo.palavraOpcoes[i] = p; });
            novo.palavra = null;
            novo.modoDesenho = null;
            novo.rodada = (g.rodada || 1) + 1;
            novo.inicio = null;
            novo.dicaIndex = 0;
            novo.acertadores = {};
            if (typeof window.limparQuadroSincronizado === "function") window.limparQuadroSincronizado();
            window.__desenhoAutoIniciado = false;
            return novo;
        }).then(function (res) {
            if (res.committed) {
            log("TURNO", "Proximo turno", res.snapshot.val());
            /* P4+P9: Clear chat + desenho from Firebase for fresh round */
            if (window.db) {
                window.db.ref(PATH.chat()).remove().catch(function () {});
                window.db.ref(PATH.desenho()).remove().catch(function () {});
            }
        }
        }).catch(function (e) { log("ERRO", "avancarTurno", e); });
    }, 8000);
}

/* --- FIM DE PARTIDA --- */
function renderFimPartida(game) {
    document.getElementById("cronometro").textContent = "--:--";
    var container = document.getElementById("areaFimRodada");
    var conteudo = container ? container.querySelector(".fim-rodada-conteudo") : null;
    if (!container || !conteudo) return;
    container.style.display = "block";
    container.querySelector("h3") && container.querySelector("h3").remove();

    var h3 = document.createElement("h3");
    h3.textContent = "Fim de Partida!";
    container.insertBefore(h3, conteudo);

    conteudo.innerHTML = "";

    var ptsJogo = game.pontosJogo || {};
    var ordenado = Object.keys(ptsJogo).sort(function (a, b) {
        return (ptsJogo[b].pontos || 0) - (ptsJogo[a].pontos || 0);
    });

    var medalhas = ["🥇", "🥈", "🥉"];
    ordenado.forEach(function (id, idx) {
        var info = ptsJogo[id] || {};
        var p = document.createElement("p");
        var prefixo = idx < 3 ? medalhas[idx] + " " : (idx + 1) + "o ";
        p.textContent = prefixo + __nomeExibicao(id) + " - " + (info.pontos || 0) + " pts";
        conteudo.appendChild(p);
    });

    var btnRev = document.createElement("button");
    btnRev.className = "btn-revanche";
    btnRev.textContent = "Jogar Novamente";
    btnRev.setAttribute("aria-label", "Iniciar nova partida com os mesmos jogadores");
    btnRev.onclick = iniciarRevanche;
    conteudo.appendChild(btnRev);

    if (typeof window.narrarFimPartida === "function") window.narrarFimPartida();
    ultimoStatusNarrado = "FIM_PARTIDA";

    /* Focus on game-over heading */
    if (h3) { h3.setAttribute("tabindex", "-1"); setTimeout(function () { h3.focus(); }, 100); }

    /* P16: Save game history */
    if (window.db) {
        var historico = { resultado: [], data: firebase.database.ServerValue.TIMESTAMP, sala: window.salaCodigo01 };
        ordenado.forEach(function (id, idx) {
            var info = ptsJogo[id] || {};
            historico.resultado.push({ nome: info.nome || "?", pontos: info.pontos || 0, posicao: idx + 1, vitorias: info.vitorias || 0, rodadasDesenhadas: info.rodadasDesenhadas || 0 });
        });
        window.db.ref("salas/" + window.salaCodigo01 + "/historico").push(historico).catch(function () {});
    }
}

/* --- DICAS (P1: usa dicaAtual do estado para não-desenhistas) --- */
function atualizarDica(game) {
    var el = document.getElementById("textoDica");
    if (!el) return;
    if (game.dicaAtual) {
        el.textContent = game.dicaAtual;
        return;
    }
    var banco = window.bancoDicas || {};
    var palavra = game.palavra;
    var dIndex = Math.max(game.dicaIndex || 0, 1);
    var dados = banco[palavra];
    if (dados && Array.isArray(dados.dicas) && dados.dicas.length > 0) {
        var total = dados.dicas.length;
        var txt = dados.dicas[Math.min(dIndex - 1, total - 1)] || "Sem dica disponivel";
        el.textContent = "Dica " + dIndex + " de " + total + ": " + txt;
    } else {
        el.textContent = dados && dados.categoria ? "Categoria: " + dados.categoria : "Aguardando dica...";
    }
}

function avancarDicaAuto() {
    if (!gameCache01) return;
    var dicaEsperado = gameCache01.dicaIndex || 0;
    window.db.ref(PATH.game()).transaction(function (g) {
        if (!g) return g;
        var dicas = (window.bancoDicas[g.palavra] && window.bancoDicas[g.palavra].dicas) || [];
        var total = Math.max(dicas.length, 4);
        if ((g.dicaIndex || 0) >= total - 1) return g;
        /* Guard: only advance if dicaIndex hasn't changed since we checked */
        if ((g.dicaIndex || 0) !== dicaEsperado) return g;
        var novo = Object.assign({}, g);
        novo.dicaIndex = (g.dicaIndex || 0) + 1;
        var txt = dicas[novo.dicaIndex];
        if (!txt) txt = "Sem mais dicas";
        else if (txt.toLowerCase() === (g.palavra || "").toLowerCase()) txt = "Dica disponível";
        novo.dicaAtual = "Dica " + novo.dicaIndex + " de " + total + ": " + txt;
        return novo;
    }).then(function (res) {
        if (res.committed) log("DICA", "Dica auto avancada");
    }).catch(function () {});
}

function avancarDica() {
    if (!gameCache01 || !window.ehDesenhista) return;
    window.db.ref(PATH.game()).transaction(function (g) {
        if (!g) return g;
        var dicas = (window.bancoDicas[g.palavra] && window.bancoDicas[g.palavra].dicas) || [];
        var total = Math.max(dicas.length, 4);
        if ((g.dicaIndex || 0) >= total - 1) return g;
        var novo = Object.assign({}, g);
        novo.dicaIndex = (g.dicaIndex || 0) + 1;
        var txt = dicas[novo.dicaIndex];
        if (!txt) txt = "Sem mais dicas";
        else if (txt.toLowerCase() === (g.palavra || "").toLowerCase()) txt = "Dica disponível";
        novo.dicaAtual = "Dica " + novo.dicaIndex + " de " + total + ": " + txt;
        return novo;
    }).then(function (res) {
        if (res.committed) {
            var snap = res.snapshot.val();
            var dica = (snap && snap.dicaAtual) || "Sem mais dicas";
            if (typeof window.narrarDica === "function") window.narrarDica(dica);
            else narrarPrioritario("Dica: " + dica);
        }
    }).catch(function () {});
}

/* --- CHUTE + ACERTO (P1+P5+P9+P13) --- */
var __ultimoChuteTexto = "";
var __ultimoChuteTime = 0;
function enviarChute() {
    var input = document.getElementById("chutePalavra");
    if (!input || !input.value.trim() || !gameCache01) return;

    /* Rate limit */
    var agora = Date.now();
    tentativasChute01 = tentativasChute01.filter(function (t) { return agora - t < 3000; });
    if (tentativasChute01.length > 4) { narrarPrioritario("Muitos chutes! Aguarde."); return; }
    tentativasChute01.push(agora);

    /* P16: Same text within 1 second — ignore */
    var chute = input.value.trim();
    if (chute === __ultimoChuteTexto && agora - __ultimoChuteTime < 1000) return;
    __ultimoChuteTexto = chute;
    __ultimoChuteTime = agora;

    input.value = "";

    /* P9: Drawer cannot guess — send as normal chat */
    if (window.ehDesenhista) {
        if (chute.length > 200) chute = chute.substring(0, 200);
        if (detectarSpam(chute)) return;
        enviarMensagemChat(chute);
        return;
    }

    if (gameCache01.status !== "JOGANDO") return;
    if (gameCache01.acertadores && gameCache01.acertadores[window.usuarioIdUnico]) {
        if (typeof window.narrarAcertouBloqueado === "function") window.narrarAcertouBloqueado();
        return;
    }

    if (detectarSpam(chute)) return;

    /* P1+P5: Validate guess via Firebase transaction (server has palavra) */
    window.db.ref(PATH.game()).transaction(function (currentGame) {
        if (!currentGame || currentGame.status !== "JOGANDO") return;
        if (currentGame.acertadores && currentGame.acertadores[window.usuarioIdUnico]) return;
        if (currentGame.desenhistaId === window.usuarioIdUnico) return;

        var palavraCorreta = (currentGame.palavra || "").toLowerCase();
        if (chute.toLowerCase() !== palavraCorreta) return;

        /* Correct guess */
        var acertadores = Object.assign({}, currentGame.acertadores || {});
        var ordem = Object.keys(acertadores).length + 1;
        var pt = ordem === 1 ? 100 : ordem === 2 ? 75 : ordem === 3 ? 50 : 25;

        acertadores[window.usuarioIdUnico] = { nome: usuarioNome01, ordem: ordem, pontos: pt };

        var pontosJogo = Object.assign({}, currentGame.pontosJogo || {});
        if (!pontosJogo[window.usuarioIdUnico]) pontosJogo[window.usuarioIdUnico] = { nome: usuarioNome01, pontos: 0, vitorias: 0, rodadasDesenhadas: 0 };
        pontosJogo[window.usuarioIdUnico].pontos = (pontosJogo[window.usuarioIdUnico].pontos || 0) + pt;
        if (ordem === 1) pontosJogo[window.usuarioIdUnico].vitorias = (pontosJogo[window.usuarioIdUnico].vitorias || 0) + 1;

        /* Drawer bonus proportional to acertadores */
        var idD = currentGame.desenhistaId;
        var nomeD = __resolverNome(idD, currentGame.jogadores) || currentGame.desenhistaNome || "?";
        if (idD && !pontosJogo[idD]) pontosJogo[idD] = { nome: nomeD, pontos: 0, vitorias: 0, rodadasDesenhadas: 0 };
        if (idD) pontosJogo[idD].pontos = (pontosJogo[idD].pontos || 0) + Math.floor(pt / 3);

        /* P13: End round on first correct guess */
        var novo = Object.assign({}, currentGame);
        novo.acertadores = acertadores;
        novo.pontosJogo = pontosJogo;
        novo.status = "FIM_RODADA";
        return novo;
    }).then(function (res) {
        if (!res.committed) {
            /* Wrong guess — send as chat, round continues (P5) */
            log("CHUTE", "Errou: " + chute);
            if (chute.length > 200) chute = chute.substring(0, 200);
            enviarMensagemChat(chute);
            return;
        }
        /* Correct guess */
        var d = res.snapshot.val();
        if (d && d.acertadores && d.acertadores[window.usuarioIdUnico]) {
            var pt = d.acertadores[window.usuarioIdUnico].pontos;
            if (typeof window.narrarAcerto === "function") window.narrarAcerto(usuarioNome01);
            else narrarPrioritario("Voce acertou! " + pt + " pontos");
            enviarMensagemChat("ACERTOU A PALAVRA!");

            if (usuarioNome01) {
                var refR = function (campo) { return PATH.ranking() + "/" + encodeURIComponent(usuarioNome01) + "/" + campo; };
                window.db.ref(refR("acertos")).transaction(function (v) { return (v || 0) + 1; });
                window.db.ref(refR("pontos")).transaction(function (v) { return (v || 0) + pt; });
                window.db.ref(refR("partidas")).transaction(function (v) { return (v || 0) + 1; });
                if (d.acertadores && d.acertadores[window.usuarioIdUnico] && d.acertadores[window.usuarioIdUnico].ordem === 1) {
                    window.db.ref(refR("vitorias")).transaction(function (v) { return (v || 0) + 1; });
                }
                if (d.desenhistaNome && d.desenhistaNome !== usuarioNome01) {
                    window.db.ref(PATH.ranking() + "/" + encodeURIComponent(d.desenhistaNome) + "/pontos").transaction(function (v) { return (v || 0) + Math.floor(pt / 3); });
                    window.db.ref(PATH.ranking() + "/" + encodeURIComponent(d.desenhistaNome) + "/rodadasDesenhadas").transaction(function (v) { return (v || 0) + 1; });
                }
            }

            var chatContainer = document.getElementById("containerChute");
            if (chatContainer) chatContainer.style.display = "none";
        }
    }).catch(function (e) { log("ERRO", "enviarChute", e); });
}

/* P1+P9: Clear chat window when a new round starts */
/* P4+P9: Ephemeral chat per round — clear local DOM + Firebase */
function limparChatRodada() {
    var janela = document.getElementById("janelaChat");
    if (janela) janela.innerHTML = "";
    if (window.db) {
        window.db.ref(PATH.chat()).remove().catch(function () {});
    }
    tentativasChute01 = [];
    chatTimestamps = [];
}

function limparJanelaChat() {
    var janela = document.getElementById("janelaChat");
    if (janela) janela.innerHTML = "";
}

function detectarSpam(msg) {
    var agora = Date.now();
    chatTimestamps = chatTimestamps.filter(function (t) { return agora - t < CHAT_SPAM_WINDOW_MS; });
    if (chatTimestamps.length >= CHAT_SPAM_LIMIT) return true;
    chatTimestamps.push(agora);
    if (msg.length < 2) return true;
    if (/(.)\1{10,}/.test(msg)) return true;
    return false;
}

/* --- CHAT --- */
function enviarMensagemChat(msg) {
    if (!window.db || !msg) return;
    window.db.ref(PATH.chat()).push({
        nome: usuarioNome01, mensagem: msg,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).catch(function () {});
    window.db.ref(PATH.chat()).limitToFirst(100).once("value").then(function (snap) {
        var total = snap.numChildren();
        if (total > 50) {
            var apagados = 0;
            snap.forEach(function (child) { if (apagados < total - 50) { child.ref.remove(); apagados++; } });
        }
    }).catch(function () {});
}

function escutarChat() {
    if (__listenersSetup["chat"]) return;
    __listenersSetup["chat"] = true;
    var __msgIds = {};
    window.db.ref(PATH.chat()).limitToLast(15).on("value", function (snap) {
        var janela = document.getElementById("janelaChat");
        if (!janela) return;
        /* Only render chat when in an active game */
        if (!gameCache01 || !gameCache01.jogadores || !gameCache01.jogadores[window.usuarioIdUnico]) return;
        var anyNew = false;
        snap.forEach(function (child) {
            var key = child.key;
            if (__msgIds[key]) return;
            __msgIds[key] = true;
            anyNew = true;
            var d = child.val();
            if (!d || !d.mensagem) return;
            var div = document.createElement("div");
            div.className = "msg-item";
            var b = document.createElement("b");
            b.textContent = (d.nome || "?") + ": ";
            div.appendChild(b);
            div.appendChild(document.createTextNode(String(d.mensagem || "")));
            janela.appendChild(div);
            if (d.mensagem.indexOf("ACERTOU") !== -1) {
                if (typeof window.narrarAcerto === "function") window.narrarAcerto(d.nome);
            } else if (d.nome !== usuarioNome01 && d.mensagem.length < 60) {
                if (typeof window.announce === "function") window.announce(d.nome + " disse: " + d.mensagem.substring(0, 50), false);
            }
        });
        if (anyNew) {
            /* P13: Cap chat DOM to 100 messages to prevent memory leak */
            while (janela.children.length > 100) janela.removeChild(janela.firstChild);
            janela.scrollTop = janela.scrollHeight;
        }
    });
    /* Clear chat state when leaving game */
    window.__limparChat = function () { __msgIds = {}; };
}

/* P9: Draw queue */
function renderFila(game) {
    var el = document.getElementById("listaFila");
    if (!el) return;
    var box = el.closest(".fila-box");
    if (!box) return;
    if (!game.filaOrdem || game.status === "aguardando" || !game.status) {
        el.innerHTML = "";
        box.style.display = "none";
        log("FILA", "[FILA] oculta (sem filaOrdem ou status=" + (game.status||"none") + ")");
        return;
    }
    box.style.display = "block";
    log("FILA", "[FILA] visivel: index=" + (game.filaIndex||0) + " total=" + (game.filaOrdem||[]).length + " status=" + game.status);
    var fila = game.filaOrdem || [];
    var idx = game.filaIndex || 0;
    var jogos = game.jogadores || {};
    el.innerHTML = "";
    fila.forEach(function (id, i) {
        var j = jogos[id] || {};
        var li = document.createElement("li");
        var nomeResolvido = __nomeExibicao(id);
        var label = "";
        if (i === idx) { label = "Agora"; li.className = "fila-item fila-ativo"; }
        else if (i === idx + 1) { label = "Próximo"; li.className = "fila-item fila-proximo"; }
        else if (i > idx + 1) { label = "Depois"; li.className = "fila-item fila-depois"; }
        else { li.className = "fila-item fila-ja-passou"; }
        var labelSpan = document.createElement("span");
        labelSpan.className = "fila-label";
        labelSpan.textContent = label;
        li.appendChild(labelSpan);
        var nomeSpan = document.createElement("span");
        nomeSpan.className = "fila-nome";
        nomeSpan.textContent = nomeResolvido;
        li.appendChild(nomeSpan);
        el.appendChild(li);
    });
}

/* --- RANKING GERAL (lobby + jogo) --- */
function escutarRankingGeral() {
    if (__listenersSetup["rankingGeral"]) return;
    __listenersSetup["rankingGeral"] = true;
    window.db.ref(PATH.ranking()).on("value", function (snap) {
        var dados = snap.val();
        if (typeof dados !== "object" || dados === null) dados = {};
        var ordenado = Object.keys(dados).sort(function (a, b) {
            var pA = (dados[a] && dados[a].pontos) || 0;
            var pB = (dados[b] && dados[b].pontos) || 0;
            return pB - pA;
        });

        var lobbyLista = document.getElementById("lobbyListaRanking");
        if (lobbyLista) {
            lobbyLista.innerHTML = "";
            ordenado.slice(0, 10).forEach(function (nome, index) {
                var nomeExibicao = decodeURIComponent(nome);
                var info = dados[nome] || {};
                var pts = info.pontos || 0;
                var acertos = info.acertos || 0;
                var erros = info.erros || 0;
                var partidas = info.partidas || 0;
                var li = document.createElement("li");
                li.textContent = nomeExibicao + ": " + pts + " pts";
                if (acertos || erros) li.textContent += " (" + acertos + "A/" + erros + "E)";
                if (index === 0) li.style.fontWeight = "bold";
                lobbyLista.appendChild(li);
            });
        }

        /* P13: General ranking in game area */
        var gameListaGeral = document.getElementById("listaRankingGeral");
        var gameBoxGeral = document.getElementById("listaRankingGeral") ? document.getElementById("listaRankingGeral").closest(".ranking-geral-box") : null;
        if (gameListaGeral) {
            gameListaGeral.innerHTML = "";
            ordenado.slice(0, 5).forEach(function (nome, index) {
                var nomeExibicao = decodeURIComponent(nome);
                var info = dados[nome] || {};
                var pts = info.pontos || 0;
                var li = document.createElement("li");
                li.textContent = nomeExibicao + ": " + pts + " pts";
                if (index === 0) li.style.fontWeight = "bold";
                gameListaGeral.appendChild(li);
            });
        }
        if (gameBoxGeral) {
            gameBoxGeral.style.display = (gameCache01 && gameCache01.status && gameCache01.status !== "aguardando") ? "block" : "none";
        }

        var gameLista = document.getElementById("listaRanking");
        if (gameLista && gameCache01 && gameCache01.status && gameCache01.status !== "aguardando") {
            gameLista.innerHTML = "";
            var ptsJogo = gameCache01.pontosJogo || {};
            var ordenadoJogo = Object.keys(ptsJogo).sort(function (a, b) {
                return (ptsJogo[b].pontos || 0) - (ptsJogo[a].pontos || 0);
            });
            ordenadoJogo.forEach(function (id, idx) {
                var info = ptsJogo[id] || {};
                var li = document.createElement("li");
                li.textContent = __nomeExibicao(id) + ": " + (info.pontos || 0) + " pts";
                if (idx === 0) { li.setAttribute("aria-label", "Lider: " + __nomeExibicao(id) + " com " + (info.pontos || 0) + " pontos"); li.style.fontWeight = "bold"; }
                gameLista.appendChild(li);
            });
        }
    });
}

/* --- CRONOMETRO TEMPO REAL --- */
var __cronometroInterval = null;

function iniciarCronometroReal() {
    if (__cronometroInterval) return;
    var ultimoDicaIndex = -1;
    var ultimoAnuncio = -1;
    __cronometroInterval = setInterval(function () {
        if (!gameCache01 || gameCache01.status !== "JOGANDO") { pararCronometroReal(); return; }
        var agora = window.agora ? window.agora() : Date.now();
        var inicio = typeof gameCache01.inicio === "number" ? gameCache01.inicio : agora;
        var tempoRestante = Math.max(0, 120 - Math.floor((agora - inicio) / 1000));
        var min = String(Math.floor(tempoRestante / 60)).padStart(2, "0");
        var seg = String(tempoRestante % 60).padStart(2, "0");
        var el = document.getElementById("cronometro");
        if (el) el.textContent = min + ":" + seg;
        /* P3: Trigger dica auto-advance when crossing thresholds */
        var dicaIdx = gameCache01.dicaIndex || 0;
        if (dicaIdx !== ultimoDicaIndex) {
            ultimoDicaIndex = dicaIdx;
            atualizarDica(gameCache01);
        }
        if (tempoRestante <= 100 && dicaIdx < 1) { avancarDicaAuto(); }
        else if (tempoRestante <= 70 && dicaIdx < 2) { avancarDicaAuto(); }
        else if (tempoRestante <= 40 && dicaIdx < 3) { avancarDicaAuto(); }
        /* Announce only at specific thresholds — no per-second spam */
        if (tempoRestante !== ultimoAnuncio) {
            ultimoAnuncio = tempoRestante;
            log("CRONOMETRO", "t=" + tempoRestante + "s");
            if (tempoRestante === 60) { if (typeof window.announce === "function") window.announce("Falta 1 minuto.", true); }
            else if (tempoRestante === 30) { if (typeof window.announce === "function") window.announce("Faltam 30 segundos.", true); }
            else if (tempoRestante === 10) { if (typeof window.announce === "function") window.announce("Faltam 10 segundos.", true); }
            else if (tempoRestante === 0) { if (typeof window.announce === "function") window.announce("Tempo encerrado.", true); }
        }
    }, 1000);
}

function pararCronometroReal() {
    if (__cronometroInterval) { clearInterval(__cronometroInterval); __cronometroInterval = null; }
}

/* --- WATCHDOG (P3+P4: timeout + inactivity) --- */
function watchdogJogo() {
    if (!gameCache01) return;
    var agora = window.agora ? window.agora() : Date.now();

    /* Timeout watchdog — ALL clients enforce (transaction guard prevents double-commit) */
    if (gameCache01.status === "JOGANDO" && gameCache01.inicio && (agora - gameCache01.inicio > 120000)) {
        window.db.ref(PATH.game()).transaction(function (g) {
            if (!g) return g;
            if (g.status !== "JOGANDO") return g;
            var novo = Object.assign({}, g);
            novo.status = "FIM_RODADA";
            return novo;
        }).then(function (res) {
            if (res.committed) log("WATCHDOG", "Tempo esgotado");
        }).catch(function () {});
        return;
    }

    /* Only admin runs drawer-inactivity watchdog */
    if (gameCache01.adminId && gameCache01.adminId !== window.usuarioIdUnico) return;

    /* P4: Check if drawer has gone inactive during SELECTION phases only (not JOGANDO — timer governs that) */
    var precisaDesenhista = (gameCache01.status === "ESCOLHENDO_PALAVRA" || gameCache01.status === "ESCOLHENDO_MODO");
    if (precisaDesenhista && gameCache01.desenhistaId && !window.__processandoSaidaDesenho) {
        var ativos = typeof window.getJogadoresAtivos === "function" ? window.getJogadoresAtivos() : [];
        if (ativos.indexOf(gameCache01.desenhistaId) === -1) {
            window.__processandoSaidaDesenho = true;
            window.db.ref(PATH.game()).transaction(function (g) {
                if (!g) return;
                if (g.desenhistaId !== gameCache01.desenhistaId) return;
                var n = Object.assign({}, g);
                n.status = "FIM_RODADA";
                return n;
            }).then(function (res) {
                if (res.committed) log("WATCHDOG", "Desenhista inativo. Rodada encerrada.");
                window.__processandoSaidaDesenho = false;
            }).catch(function () { window.__processandoSaidaDesenho = false; });
        }
    }
}

/* --- TEMA --- */
function configurarTema() {
    var btn = document.getElementById("btnAlternarTema");
    if (!btn) return;
    var temas = ["light-mode", "dark-mode", "high-contrast"];
    var atual = "dark-mode";
    try { atual = localStorage.getItem("garme_tema") || "dark-mode"; } catch (e) {}
    if (atual !== "dark-mode") document.body.classList.add(atual);
    if (atual === "high-contrast") btn.textContent = "🔲";
    else if (atual === "light-mode") btn.textContent = "☀️";
    btn.onclick = function () {
        temas.forEach(function (t) { document.body.classList.remove(t); });
        if (atual === "dark-mode") { atual = "high-contrast"; btn.textContent = "🔲"; btn.setAttribute("aria-label", "Alternar para tema claro"); }
        else if (atual === "high-contrast") { atual = "light-mode"; btn.textContent = "☀️"; btn.setAttribute("aria-label", "Alternar para tema escuro"); }
        else { atual = "dark-mode"; btn.textContent = "🌙"; btn.setAttribute("aria-label", "Alternar para alto contraste"); }
        if (atual !== "dark-mode") document.body.classList.add(atual);
        try { localStorage.setItem("garme_tema", atual); } catch (e) {}
    };
}

/* --- INIT WATCHDOG --- */
if (!__watchdogInterval) {
    __watchdogInterval = setInterval(watchdogJogo, 2000);
}

/* P5: Cleanup all intervals on unload */
window.addEventListener("beforeunload", function () {
    if (__cronometroInterval) { clearInterval(__cronometroInterval); __cronometroInterval = null; }
    if (__watchdogInterval) { clearInterval(__watchdogInterval); __watchdogInterval = null; }
});
window.addEventListener("pagehide", function () {
    if (__cronometroInterval) { clearInterval(__cronometroInterval); __cronometroInterval = null; }
    if (__watchdogInterval) { clearInterval(__watchdogInterval); __watchdogInterval = null; }
});

log("SISTEMA", "Jogo V10 carregado");
