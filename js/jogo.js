/* =========================================================
   CONTROLE PRINCIPAL DO JOGO - VERSÃO FINAL ACESSÍVEL
========================================================= */

let usuarioLogado = "";
let minhaVez = false;
let estadoJogo = "esperando"; // estados: esperando, escolhendo, desenhando

/**
 * Inicializa o jogo assim que o DOM estiver carregado.
 */
document.addEventListener('DOMContentLoaded', () => {
    configurarInterfaceInicial();
});

/**
 * Configuração inicial dos elementos da interface.
 */
function configurarInterfaceInicial() {
    const btnIniciar = document.getElementById('btnIniciarPartida');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', iniciarFluxoPartida);
    }
    
    // Garante que a galeria comece escondida para evitar poluição visual
    const galeria = document.getElementById('galeriaDesenhos');
    if (galeria) {
        galeria.style.display = 'none';
    }
}

/**
 * Inicia o fluxo da partida, validando o usuário e definindo papéis.
 */
function iniciarFluxoPartida() {
    const inputNome = document.getElementById('nomeUsuario');
    usuarioLogado = inputNome ? inputNome.value : "";
    
    if (!usuarioLogado) {
        alert("Por favor, digite seu nome.");
        return;
    }

    // Define o usuário atual como o desenhista conforme as regras de teste.
    minhaVez = true; 
    
    const lobby = document.getElementById('lobby');
    if (lobby) {
        lobby.style.display = 'none';
    }

    if (minhaVez) {
        mostrarEscolhaDesenho();
    } else {
        comunicarAoNarrador("Aguardando o desenhista escolher um objeto.");
    }
}

/**
 * Exibe a galeria de botões para o desenhista escolher o objeto.
 * Limpa o container antes de gerar para evitar duplicados.
 */
function mostrarEscolhaDesenho() {
    estadoJogo = "escolhendo";
    const galeria = document.getElementById('galeriaDesenhos');
    const containerBotoes = document.getElementById('listaDesenhos');
    
    if (!galeria || !containerBotoes) return;

    galeria.style.display = 'block';
    containerBotoes.innerHTML = ""; // Limpeza essencial para acessibilidade

    // Percorre a biblioteca definida no arquivo js/desenho.js
    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        Object.keys(BIBLIOTECA_DESENHOS).forEach(id => {
            const btn = document.createElement('button');
            btn.innerText = id.toUpperCase();
            btn.className = "btn-desenho";
            
            // Atributo essencial para leitores de tela saberem o que o botão faz
            btn.setAttribute('aria-label', "Desenhar " + id);
            
            btn.onclick = () => selecionarDesenho(id);
            containerBotoes.appendChild(btn);
        });
    }

    comunicarAoNarrador("Sua vez de desenhar. Escolha um objeto na lista de botões.");
}

/**
 * Finaliza a escolha e inicia o desenho automático no canvas.
 */
function selecionarDesenho(id) {
    estadoJogo = "desenhando";
    
    // Esconde a galeria para focar a atenção no desenho e limpar o DOM
    const galeria = document.getElementById('galeriaDesenhos');
    if (galeria) {
        galeria.style.display = 'none';
    }

    // Aciona a lógica de desenho automático presente no js/desenho.js
    if (typeof desenharObjetoAutomatico === "function") {
        desenharObjetoAutomatico(id);
    } else {
        console.error("Erro: A função desenharObjetoAutomatico não foi encontrada.");
        comunicarAoNarrador("Erro ao iniciar o desenho. Verifique os arquivos.");
    }
}

/**
 * Processa a tentativa de adivinhação do usuário.
 */
function enviarChute() {
    const input = document.getElementById('chutePalavra');
    if (!input) return;

    const chute = input.value.toLowerCase().trim();
    
    if (!chute) {
        comunicarAoNarrador("Digite uma palavra antes de enviar.");
        return;
    }

    comunicarAoNarrador("Você enviou o chute: " + chute);
    input.value = "";
}

/**
 * Função de ponte para atualizar o status de acessibilidade e visual.
 */
function comunicarAoNarrador(texto) {
    const narrador = document.getElementById('narrador');
    const feedback = document.getElementById('feedbackAcessivel');
    
    // O 'narrador' é a div sr-only com aria-live para o leitor de tela
    if (narrador) {
        narrador.innerText = texto;
    }
    
    // O 'feedbackAcessivel' é o texto visível na tela
    if (feedback) {
        feedback.innerText = texto;
    }
}