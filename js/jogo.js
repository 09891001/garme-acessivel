/* =========================================================
   CONTROLE PRINCIPAL - GARME ACESSÍVEL (VERSÃO INTEGRAL)
   REGRAS: 2 MINUTOS | FOCO ACESSÍVEL | GALERIA TELA CHEIA
========================================================= */

let usuarioLogado = "";
let tempoRestante = 120; // 2 minutos de rodada oficial
let cronometroIntervalo = null;
let palavraCerta = ""; 
let jogoIniciado = false;

/**
 * Inicialização do Sistema
 */
document.addEventListener('DOMContentLoaded', () => {
    configurarInterfaceInicial();
    configurarEventosTeclado();
});

function configurarInterfaceInicial() {
    // Vincula o clique do botão de login
    const btnIniciar = document.getElementById('btnIniciarPartida');
    if (btnIniciar) btnIniciar.onclick = realizarLogin;
    
    // Estados iniciais de visibilidade
    document.getElementById('galeriaDesenhos').style.display = 'none';
    document.getElementById('btnConfirmarInicio').classList.add('hidden');
    
    // O chat começa desativado até o início da rodada
    const chatSection = document.querySelector('.chat-section');
    if (chatSection) {
        chatSection.style.opacity = "0.5";
        chatSection.style.pointerEvents = "none";
    }

    comunicarAoNarrador("Sistema pronto. Digite seu nome e clique em entrar ou pressione Enter.");
}

/**
 * Teclado (Enter) - Atalhos para agilizar a navegação
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
 * Login do Usuário
 */
function realizarLogin() {
    const inputNome = document.getElementById('nomeUsuario');
    usuarioLogado = inputNome ? inputNome.value.trim() : "";
    
    if (!usuarioLogado) {
        alert("Por favor, digite seu nome.");
        return;
    }

    // Esconde a tela de login
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('displayUsuario').innerText = usuarioLogado;
    comunicarAoNarrador(`Olá ${usuarioLogado}. Escolha Manual ou Automático para definir o desenho.`);
}

/**
 * DESENHO AUTOMÁTICO - Galeria em Tela Cheia
 */
function alternarModoAutomatico() {
    const galeria = document.getElementById('galeriaDesenhos');
    const container = document.getElementById('listaDesenhos');
    
    if (!galeria || !container) return;

    // Exibe a galeria em tela cheia (escondendo os menus de fundo no CSS)
    galeria.style.display = 'flex';
    container.innerHTML = ""; 

    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        const itens = Object.keys(BIBLIOTECA_DESENHOS);
        
        itens.forEach((id, index) => {
            const btn = document.createElement('button');
            btn.innerText = id.toUpperCase();
            btn.className = "btn-desenho";
            btn.setAttribute("aria-label", `Selecionar desenho de ${id}`);
            
            // ID para foco automático no primeiro item
            if (index === 0) btn.id = "focoInicialGaleria";

            btn.onclick = (e) => {
                e.preventDefault();
                palavraCerta = id.toLowerCase();
                galeria.style.display = 'none'; // Fecha e volta aos menus
                
                const btnOk = document.getElementById('btnConfirmarInicio');
                btnOk.classList.remove('hidden');
                btnOk.focus();
                comunicarAoNarrador(`${id} selecionado. Clique no botão verde para iniciar a rodada.`);
            };
            container.appendChild(btn);
        });

        // ACESSIBILIDADE: Direciona o foco para o primeiro desenho imediatamente
        setTimeout(() => {
            const primeiroItem = document.getElementById('focoInicialGaleria');
            if (primeiroItem) primeiroItem.focus();
        }, 150);
    }
}

/**
 * Modo Manual
 */
function modoManual() {
    const dica = prompt("O que você vai desenhar?");
    if (dica && dica.trim() !== "") {
        palavraCerta = dica.toLowerCase().trim();
        const btnOk = document.getElementById('btnConfirmarInicio');
        btnOk.classList.remove('hidden');
        btnOk.focus();
        comunicarAoNarrador("Palavra manual definida. Clique em OK para começar.");
    }
}

/**
 * CONFIRMAR INÍCIO - Traz o quadro e o chat para frente
 */
function confirmarInicioJogo() {
    if (!palavraCerta) {
        alert("Escolha Manual ou Automático antes de iniciar!");
        return;
    }

    if (jogoIniciado) return;

    jogoIniciado = true;
    tempoRestante = 120; // Reseta cronômetro para 2 minutos
    
    // 1. Esconde os botões de configuração (Manual/Automático)
    document.querySelector('.controles-modo').style.display = 'none';
    document.getElementById('btnConfirmarInicio').classList.add('hidden');

    // 2. Prioriza visualmente o Quadro
    const quadro = document.getElementById('quadro');
    quadro.style.zIndex = "50";

    // 3. Ativa o Chat para interação
    const chat = document.querySelector('.chat-section');
    chat.style.opacity = "1";
    chat.style.pointerEvents = "all";
    chat.style.zIndex = "60";
    document.getElementById('chutePalavra').focus();

    comunicarAoNarrador("A rodada começou! O robô iniciou o desenho. O chat está ativo.");
    iniciarCronometro();

    // Dispara a lógica de desenho do robô (definida em biblioteca.js/robo.js)
    if (typeof desenharObjetoAutomatico === "function") {
        desenharObjetoAutomatico(palavraCerta);
    }
}

/**
 * Cronômetro Oficial (2 Minutos)
 */
function iniciarCronometro() {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);
    cronometroIntervalo = setInterval(() => {
        tempoRestante--;
        const fb = document.getElementById('feedbackAcessivel');
        if (fb) fb.innerText = `Tempo Restante: ${tempoRestante}s`;

        // Alertas de voz automáticos para acessibilidade
        if (tempoRestante === 60) comunicarAoNarrador("Atenção: Falta 1 minuto!");
        if (tempoRestante === 10) comunicarAoNarrador("Últimos 10 segundos!");

        if (tempoRestante <= 0) {
            finalizarRodada(`Fim de tempo! A palavra era ${palavraCerta.toUpperCase()}`);
        }
    }, 1000);
}

/**
 * Lógica de Chutes no Chat
 */
function enviarChute() {
    const input = document.getElementById('chutePalavra');
    const chute = input.value.toLowerCase().trim();
    if (!chute) return;

    if (chute === palavraCerta) {
        finalizarRodada(`VITÓRIA! ${usuarioLogado} acertou a palavra: ${palavraCerta.toUpperCase()}`);
    } else {
        comunicarAoNarrador(`Incorreto. Tentaram ${chute}.`);
    }
    input.value = "";
}

/**
 * Finalização e Reset da Interface
 */
function finalizarRodada(mensagem) {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);
    if (typeof pararDesenhoRobo === "function") pararDesenhoRobo();

    jogoIniciado = false;
    palavraCerta = ""; 

    alert(mensagem);
    comunicarAoNarrador(mensagem);
    
    // Retorna os controles para permitir nova partida
    document.querySelector('.controles-modo').style.display = 'flex';
    document.querySelector('.chat-section').style.opacity = "0.5";
    document.getElementById('feedbackAcessivel').innerText = "Aguardando próxima rodada...";
}

/**
 * Motor de Voz (Narrador Acessível)
 */
function comunicarAoNarrador(texto) {
    const n = document.getElementById('narrador');
    if (n) {
        n.innerText = "";
        setTimeout(() => { n.innerText = texto; }, 50);
    }
}

/**
 * Função para o botão Cancelar dentro da galeria
 */
function fecharGaleria() {
    document.getElementById('galeriaDesenhos').style.display = 'none';
    comunicarAoNarrador("Seleção de desenho cancelada.");
}