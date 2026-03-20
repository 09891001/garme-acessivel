/* =========================================================
   CONTROLE PRINCIPAL - GARME ACESSÍVEL (VERSÃO INTEGRAL)
   (COM SINCRONIZAÇÃO SEGURA VIA FIREBASE)
========================================================= */

let usuarioLogado = "";
let tempoRestante = 120; // 2 minutos de rodada oficial
let cronometroIntervalo = null;
let palavraCerta = ""; 
let jogoIniciado = false;

/* =========================================================
   CONTROLE LOCAL (PRESERVADO)
========================================================= */
let jogadores = [];
let indiceJogadorAtual = 0;
let desenhistaAtual = "";
let escolhasJogadores = {};

/* =========================================================
   FIREBASE (NÃO INVASIVO)
========================================================= */
let salaRef = null;
let jogadoresRef = null;
let estadoRef = null;
let dadosJogadores = {};

/**
 * Inicialização do Sistema
 */
document.addEventListener('DOMContentLoaded', () => {
    configurarInterfaceInicial();
    configurarEventosTeclado();
});

function configurarInterfaceInicial() {
    const btnIniciar = document.getElementById('btnIniciarPartida');
    if (btnIniciar) btnIniciar.onclick = realizarLogin;
    
    document.getElementById('galeriaDesenhos').style.display = 'none';
    document.getElementById('btnConfirmarInicio').classList.add('hidden');
    
    const chatSection = document.querySelector('.chat-section');
    if (chatSection) {
        chatSection.style.opacity = "0.5";
        chatSection.style.pointerEvents = "none";
    }

    comunicarAoNarrador("Sistema pronto. Digite seu nome e clique em entrar ou pressione Enter.");
}

/**
 * Teclado (mantido)
 */
function configurarEventosTeclado() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const ativo = document.activeElement;
            if (ativo.id === 'nomeUsuario') realizarLogin();
            else if (ativo.id === 'chutePalavra') enviarChute();
            else if (ativo.id === 'btnConfirmarInicio') confirmarInicioJogo();
        }
    });
}

/**
 * LOGIN (COM PRESENÇA FIREBASE)
 */
function realizarLogin() {
    const inputNome = document.getElementById('nomeUsuario');
    usuarioLogado = inputNome ? inputNome.value.trim() : "";
    
    if (!usuarioLogado) {
        alert("Por favor, digite seu nome.");
        return;
    }

    if (!jogadores.includes(usuarioLogado)) {
        jogadores.push(usuarioLogado);
    }

    document.getElementById('lobby').style.display = 'none';
    document.getElementById('displayUsuario').innerText = usuarioLogado;

    comunicarAoNarrador(`Olá ${usuarioLogado}. Conectando à sala...`);

    /* =========================================================
       🔧 FIREBASE (SEM INTERFERIR NA LÓGICA)
    ========================================================= */
    if (typeof db !== "undefined") {
        salaRef = db.ref("salas/sala1");
        jogadoresRef = salaRef.child("jogadores");
        estadoRef = salaRef.child("estado");

        const meuRef = jogadoresRef.child(usuarioLogado);

        meuRef.set({
            nome: usuarioLogado,
            pontos: 0,
            online: true
        });

        meuRef.onDisconnect().remove();

        jogadoresRef.on("value", (snapshot) => {
            const dados = snapshot.val();

            jogadores = [];
            dadosJogadores = {};

            if (dados) {
                Object.keys(dados).forEach(nome => {
                    jogadores.push(nome);
                    dadosJogadores[nome] = dados[nome];
                });
            }

            atualizarListaVisualJogadores();
        });

        /* =========================================================
           🔧 ESCUTA ESTADO (SEM QUEBRAR LOCAL)
        ========================================================= */
        estadoRef.on("value", (snap) => {
            const estado = snap.val();
            if (!estado) return;

            // Só entra se ainda não iniciou localmente
            if (estado.jogoIniciado && !jogoIniciado) {
                iniciarRodadaSincronizada(estado);
            }
        });
    }

    comunicarAoNarrador(`Olá ${usuarioLogado}. Escolha Manual ou Automático para definir o desenho.`);
}

/* =========================================================
   LISTA VISUAL + RANKING (NÃO INVADE HTML)
========================================================= */
function atualizarListaVisualJogadores() {
    let painel = document.getElementById('painelJogadores');

    if (!painel) {
        painel = document.createElement('div');
        painel.id = "painelJogadores";
        painel.style.position = "fixed";
        painel.style.top = "70px";
        painel.style.right = "10px";
        painel.style.background = "#002a4d";
        painel.style.padding = "10px";
        painel.style.borderRadius = "8px";
        painel.style.maxWidth = "250px";
        painel.style.zIndex = "999";
        document.body.appendChild(painel);
    }

    painel.innerHTML = "<strong>Jogadores / Ranking</strong><br>";

    const listaOrdenada = Object.values(dadosJogadores).sort((a, b) => b.pontos - a.pontos);

    listaOrdenada.forEach((j, index) => {
        const linha = document.createElement('div');
        linha.innerText = `${index + 1}º ${j.nome} - ${j.pontos} pts`;
        painel.appendChild(linha);
    });
}

/**
 * DESENHO AUTOMÁTICO (mantido)
 */
function alternarModoAutomatico() {
    const galeria = document.getElementById('galeriaDesenhos');
    const container = document.getElementById('listaDesenhos');
    
    if (!galeria || !container) return;

    galeria.style.display = 'flex';
    container.innerHTML = ""; 

    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        const itens = Object.keys(BIBLIOTECA_DESENHOS);
        
        itens.forEach((id, index) => {
            const btn = document.createElement('button');
            btn.innerText = id.toUpperCase();
            btn.className = "btn-desenho";
            btn.setAttribute("aria-label", `Selecionar desenho de ${id}`);
            
            if (index === 0) btn.id = "focoInicialGaleria";

            btn.onclick = (e) => {
                e.preventDefault();
                palavraCerta = id.toLowerCase();

                escolhasJogadores[usuarioLogado] = palavraCerta;

                galeria.style.display = 'none';
                validarInicio();
                comunicarAoNarrador(`${id} selecionado.`);
            };
            container.appendChild(btn);
        });

        setTimeout(() => {
            const primeiroItem = document.getElementById('focoInicialGaleria');
            if (primeiroItem) primeiroItem.focus();
        }, 150);
    }
}

/**
 * Modo Manual (mantido)
 */
function modoManual() {
    const dica = prompt("O que você vai desenhar?");
    if (dica && dica.trim() !== "") {
        palavraCerta = dica.toLowerCase().trim();

        escolhasJogadores[usuarioLogado] = palavraCerta;

        validarInicio();
        comunicarAoNarrador("Palavra manual definida.");
    }
}

/**
 * VALIDAÇÃO (mantida)
 */
function validarInicio() {
    const total = jogadores.length;
    const escolhidos = Object.keys(escolhasJogadores).length;

    const btnOk = document.getElementById('btnConfirmarInicio');

    if (total > 0 && escolhidos === total) {
        btnOk.classList.remove('hidden');
        btnOk.focus();
        comunicarAoNarrador("Todos escolheram. Pode iniciar.");
    } else {
        comunicarAoNarrador(`Aguardando (${escolhidos}/${total})`);
    }
}

/**
 * CONFIRMAR INÍCIO (AGORA TAMBÉM ENVIA PARA FIREBASE)
 */
function confirmarInicioJogo() {
    if (!palavraCerta) {
        alert("Escolha Manual ou Automático antes de iniciar!");
        return;
    }

    if (jogoIniciado) return;

    // LÓGICA ORIGINAL PRESERVADA
    jogoIniciado = true;
    tempoRestante = 120;

    if (jogadores.length > 0) {
        desenhistaAtual = jogadores[indiceJogadorAtual];
        palavraCerta = escolhasJogadores[desenhistaAtual] || palavraCerta;
    }

    /* 🔧 NOVO: SINCRONIZA */
    if (estadoRef) {
        estadoRef.set({
            jogoIniciado: true,
            desenhista: desenhistaAtual,
            palavraAtual: palavraCerta,
            tempo: tempoRestante
        });
    }

    iniciarRodadaLocal();
}

/**
 * 🔧 NOVO: EXECUÇÃO LOCAL ORIGINAL
 */
function iniciarRodadaLocal() {
    document.querySelector('.controles-modo').style.display = 'none';
    document.getElementById('btnConfirmarInicio').classList.add('hidden');

    const chat = document.querySelector('.chat-section');
    const inputChat = document.getElementById('chutePalavra');

    chat.style.opacity = "1";
    chat.style.pointerEvents = "all";

    if (usuarioLogado === desenhistaAtual) {
        inputChat.disabled = true;
    } else {
        inputChat.disabled = false;
        inputChat.focus();
    }

    comunicarAoNarrador("Rodada iniciada.");
    iniciarCronometro();

    if (typeof desenharObjetoAutomatico === "function") {
        desenharObjetoAutomatico(palavraCerta);
    }
}

/**
 * 🔧 NOVO: SINCRONIZADO
 */
function iniciarRodadaSincronizada(estado) {
    jogoIniciado = true;
    palavraCerta = estado.palavraAtual;
    desenhistaAtual = estado.desenhista;
    tempoRestante = estado.tempo;

    iniciarRodadaLocal();
}

/**
 * CRONÔMETRO (mantido)
 */
function iniciarCronometro() {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);

    cronometroIntervalo = setInterval(() => {
        tempoRestante--;

        if (tempoRestante <= 0) {
            finalizarRodada(`Fim de tempo!`);
        }
    }, 1000);
}

/**
 * CHUTE (com pontuação Firebase)
 */
function enviarChute() {
    const input = document.getElementById('chutePalavra');
    const chute = input.value.toLowerCase().trim();
    if (!chute) return;

    if (chute === palavraCerta) {

        if (jogadoresRef) {
            jogadoresRef.child(usuarioLogado).child("pontos")
                .transaction(p => (p || 0) + 1);
        }

        finalizarRodada(`VITÓRIA! ${usuarioLogado}`);
    }

    input.value = "";
}

/**
 * FINALIZAÇÃO (com limpeza Firebase)
 */
function finalizarRodada(mensagem) {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);

    jogoIniciado = false;
    palavraCerta = "";

    if (estadoRef) estadoRef.set(null);

    alert(mensagem);
    comunicarAoNarrador(mensagem);

    escolhasJogadores = {};

    document.querySelector('.controles-modo').style.display = 'flex';
    document.querySelector('.chat-section').style.opacity = "0.5";
    document.getElementById('feedbackAcessivel').innerText = "Aguardando próxima rodada...";
}

/**
 * Narrador (mantido)
 */
function comunicarAoNarrador(texto) {
    const n = document.getElementById('narrador');
    if (n) {
        n.innerText = "";
        setTimeout(() => { n.innerText = texto; }, 50);
    }
}