"use strict";
(function () {
    var taxa = 1.0, tom = 1.0, vozSelecionada = null;
    var __ultimoAnuncio = "";
    var __ultimaFala = "";
    var __filaAnuncios = [];
    var __processandoFila = false;

    try {
        taxa = parseFloat(localStorage.getItem("voz_taxa")) || 1.0;
        tom = parseFloat(localStorage.getItem("voz_tom")) || 1.0;
    } catch (e) {}

    function obterVozPT() {
        if (vozSelecionada) return vozSelecionada;
        if (!window.speechSynthesis) return null;
        var vozes = window.speechSynthesis.getVoices();
        vozSelecionada = vozes.find(function (v) { return v.lang && v.lang.startsWith("pt") && v.lang.includes("BR"); })
            || vozes.find(function (v) { return v.lang && v.lang.startsWith("pt"); })
            || vozes.find(function (v) { return v.lang && v.lang.startsWith("en"); });
        return vozSelecionada;
    }

    window.falarVoz = function () {};

    window.definirVozPrefs = function (novaTaxa, novoTom) {
        taxa = Math.max(0.5, Math.min(2.0, novaTaxa || taxa));
        tom = Math.max(0.5, Math.min(2.0, novoTom || tom));
        try {
            localStorage.setItem("voz_taxa", taxa);
            localStorage.setItem("voz_tom", tom);
        } catch (e) {}
    };

    /* Process queue — one message at a time, 500ms interval */
    function processarFila() {
        if (__processandoFila) return;
        if (__filaAnuncios.length === 0) return;
        __processandoFila = true;
        var item = __filaAnuncios.shift();
        var el = document.getElementById("sr-announcer");
        if (el) {
            el.setAttribute("aria-live", item.urgent ? "assertive" : "polite");
            el.textContent = "";
            el.textContent = item.message;
        }
        window.__partLog("ACESSIBILIDADE", (item.urgent ? "[URGENTE] " : "") + item.message);
        setTimeout(function () {
            __processandoFila = false;
            processarFila();
        }, 500);
    }

    /* Centralized announcement system — queued, deduplicated */
    window.announce = function (message, urgent) {
        if (!message) return;
        if (message === __ultimoAnuncio) return;
        __ultimoAnuncio = message;
        __filaAnuncios.push({ message: message, urgent: !!urgent });
        processarFila();
    };

    /* Backward compat — route through announce */
    window.narrar = function (texto) {
        if (!texto) return;
        if (texto === __ultimaFala) return;
        __ultimaFala = texto;
        console.log("[VOICE]", texto);
        var el = document.getElementById("anuncioAcessivel");
        if (el) el.textContent = texto;
        if (window.falarVoz && texto && texto.length < 300) window.falarVoz(texto);
        window.announce(texto, false);
    };

    window.narrarPrioritario = function (texto) {
        if (!texto) return;
        if (texto === __ultimaFala) return;
        __ultimaFala = texto;
        console.log("[VOICE]", texto);
        var el = document.getElementById("anuncioPrioritario");
        if (el) { el.textContent = ""; el.textContent = texto; }
        if (window.falarVoz) window.falarVoz(texto);
        window.announce(texto, true);
    };

    window.narrarEvento = function (texto) {
        if (typeof narrar === "function") narrar(texto);
    };

    window.narrarConexao = function (online) {
        var el = document.getElementById("statusSistema");
        if (el) {
            el.textContent = online ? "Conectado" : "Reconectando...";
            el.className = "badge " + (online ? "status-online" : "status-offline");
        }
        if (online) {
            console.log("[VOICE]", "Conexao com o servidor restabelecida.");
            var srEl = document.getElementById("srStatusconexao");
            if (srEl) { srEl.textContent = ""; srEl.textContent = "Conexão com o servidor restabelecida."; }
            window.narrarPrioritario("Conexao com o servidor restabelecida.");
        }
    };

    window.narrarTurno = function (desenhistaNome, rodada, maxRodadas) {
        window.narrarPrioritario("Rodada " + (rodada || 1) + " de " + (maxRodadas || 5) + ". " + (desenhistaNome || "Alguem") + " vai desenhar.");
    };

    window.narrarPalavraSecreta = function (palavra, ehDesenhista) {
        if (ehDesenhista) {
            window.narrarPrioritario("Sua vez de desenhar.");
        } else {
            window.narrarPrioritario("Desenho iniciado. Tente adivinhar!");
        }
    };

    window.narrarFimRodada = function (palavra) {
        window.narrarPrioritario("Rodada encerrada. A palavra era: " + (palavra || "?"));
    };

    window.narrarAcerto = function (nomeJogador) {
        if (nomeJogador) window.narrarPrioritario(nomeJogador + " acertou a palavra!");
    };

    window.narrarDica = function (dicaTexto) {
        if (dicaTexto) window.narrar("" + dicaTexto);
    };

    /* Silencioso — apenas atualiza o label visual, sem aria-live */
    window.narrarTempoRestante = function () {};

    window.narrarBemVindo = function (nome) {
        if (nome) window.narrarPrioritario("Bem-vindo, " + nome + ".");
    };

    window.narrarAutoDrawEtapa = function (etapa, total, descricao) {
        if (descricao) window.narrarPrioritario("" + descricao);
    };

    window.narrarEscolherPalavra = function () {
        window.narrar("Escolha uma das tres palavras.");
    };

    window.narrarAcertouBloqueado = function () {
        window.narrarPrioritario("Voce ja acertou. Aguarde.");
    };

    window.narrarFimPartida = function () {
        window.narrarPrioritario("Fim de partida!");
    };

    window.narrarAguardandoAdmin = function () {
        window.narrar("Aguardando o administrador iniciar a partida.");
    };

    window.narrarRevanche = function () {
        window.narrarPrioritario("Nova partida.");
    };

    window.narrarErroRecuperacao = function () {
        window.narrarPrioritario("Ocorreu um erro. Tentando recuperar a partida.");
    };

    try {
        window.speechSynthesis.getVoices();
    } catch (e) {}
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = function () { vozSelecionada = null; };
    }
})();
