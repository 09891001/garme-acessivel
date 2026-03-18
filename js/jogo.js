/* =========================================================
   CONTROLE PRINCIPAL - GARME ACESSÍVEL (VERSÃO COMPLETA)
   MELHORIAS: DESENHO ANIMADO E FEEDBACK DE TEMPO POR VOZ
========================================================= */

let usuarioLogado = "";
let tempoRestante = 120; // 2 Minutos Oficiais
let cronometroIntervalo = null;
let palavraCerta = ""; 
let jogoIniciado = false;

/**
 * Inicialização do Sistema
 */
document.addEventListener('DOMContentLoaded', () => {
    configurarInterfaceInicial();
});

function configurarInterfaceInicial() {
    const btnIniciar = document.getElementById('btnIniciarPartida');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', realizarLogin);
    }
    
    // Garante que a galeria e o botão OK iniciem escondidos (image_9623a1.png)
    const galeria = document.getElementById('galeriaDesenhos');
    if (galeria) galeria.style.display = 'none';
    
    const btnOk = document.getElementById('btnConfirmarInicio');
    if (btnOk) btnOk.classList.add('hidden');

    comunicarAoNarrador("Sistema carregado. Digite seu nome para entrar na partida.");
}

/**
 * Fluxo de Login
 */
function realizarLogin() {
    const inputNome = document.getElementById('nomeUsuario');
    usuarioLogado = inputNome ? inputNome.value.trim() : "";
    
    if (!usuarioLogado) {
        alert("Por favor, digite seu nome.");
        return;
    }

    const lobby = document.getElementById('lobby');
    if (lobby) lobby.style.display = 'none';
    
    const displayUser = document.getElementById('displayUsuario');
    if (displayUser) displayUser.innerText = usuarioLogado;

    comunicarAoNarrador(`Olá ${usuarioLogado}. Escolha DESENHO MANUAL ou DESENHO AUTOMÁTICO.`);
}

/**
 * MODO AUTOMÁTICO (ROBÔ)
 */
function alternarModoAutomatico() {
    const galeria = document.getElementById('galeriaDesenhos');
    const container = document.getElementById('listaDesenhos');
    
    if (!galeria || !container) return;

    galeria.style.display = 'flex';
    container.innerHTML = ""; 

    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        Object.keys(BIBLIOTECA_DESENHOS).forEach((id, index) => {
            const btn = document.createElement('button');
            btn.innerText = id.toUpperCase();
            btn.className = "btn-desenho";
            btn.setAttribute('aria-label', "Robô desenha " + id);
            
            if (index === 0) btn.id = "focoGaleria";
            
            btn.onclick = () => {
                palavraCerta = id.toLowerCase();
                galeria.style.display = 'none';
                comunicarAoNarrador(`Tema ${id} selecionado. Agora, clique no botão OK para iniciar.`);
                
                const btnOk = document.getElementById('btnConfirmarInicio');
                if (btnOk) {
                    btnOk.classList.remove('hidden');
                    btnOk.focus();
                }
            };
            container.appendChild(btn);
        });
    }
    
    setTimeout(() => document.getElementById('focoGaleria')?.focus(), 150);
}

/**
 * MODO MANUAL (DICA)
 */
function modoManual() {
    const dica = prompt("Qual objeto você vai desenhar manualmente?");
    if (dica && dica.trim() !== "") {
        palavraCerta = dica.toLowerCase().trim();
        comunicarAoNarrador(`Dica registrada. Clique em OK para iniciar o tempo de 2 minutos.`);
        
        const btnOk = document.getElementById('btnConfirmarInicio');
        if (btnOk) {
            btnOk.classList.remove('hidden');
            btnOk.focus();
        }
    }
}

/**
 * DISPARO DA RODADA (BOTÃO OK)
 */
function confirmarInicioJogo() {
    if (jogoIniciado || !palavraCerta) return;

    jogoIniciado = true;
    tempoRestante = 120;
    
    const btnOk = document.getElementById('btnConfirmarInicio');
    if (btnOk) btnOk.classList.add('hidden');
    
    comunicarAoNarrador("A rodada começou! Valendo 2 minutos.");

    iniciarCronometro();

    // Se for automático, desenha com animação lenta
    if (typeof BIBLIOTECA_DESENHOS !== 'undefined' && BIBLIOTECA_DESENHOS[palavraCerta]) {
        desenharComAnimacao(BIBLIOTECA_DESENHOS[palavraCerta]);
    }
}

/**
 * MELHORIA: DESENHO ANIMADO E LENTO
 * Usa 'async/await' para desenhar ponto a ponto com atraso
 */
async function desenharComAnimacao(pontos) {
    const canvas = document.getElementById('quadro');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000";

    for (let i = 0; i < pontos.length; i++) {
        if (!jogoIniciado) break; // Para o desenho se alguém acertar a palavra

        const p = pontos[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
        
        ctx.stroke();

        // VELOCIDADE DA ANIMAÇÃO: 150ms entre cada ponto
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    if (jogoIniciado) {
        comunicarAoNarrador("O robô terminou o desenho. Podem chutar!");
    }
}

/**
 * MELHORIA: CRONÔMETRO COM ALERTAS VERBAIS (image_95bea4.png)
 */
function iniciarCronometro() {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);

    cronometroIntervalo = setInterval(() => {
        tempoRestante--;
        
        const feedbackDisplay = document.getElementById('feedbackAcessivel');
        if (feedbackDisplay) {
            feedbackDisplay.innerText = `Tempo: ${tempoRestante}s`;
        }

        // ALERTAS DE VOZ OBRIGATÓRIOS
        if (tempoRestante === 60) {
            comunicarAoNarrador("Atenção: Falta apenas 1 minuto!");
        } 
        else if (tempoRestante === 30) {
            comunicarAoNarrador("Últimos 30 segundos! O tempo está acabando.");
        }
        else if (tempoRestante <= 10 && tempoRestante > 0) {
            comunicarAoNarrador(tempoRestante.toString()); // Contagem final 10, 9, 8...
        }

        if (tempoRestante <= 0) {
            finalizarRodada("Tempo esgotado! A palavra era " + palavraCerta.toUpperCase());
        }
    }, 1000);
}

/**
 * SISTEMA DE CHUTES E MONITORAMENTO
 */
function enviarChute() {
    const input = document.getElementById('chutePalavra');
    if (!input) return;

    const chute = input.value.toLowerCase().trim();
    if (!chute) return;

    if (chute === palavraCerta) {
        finalizarRodada(`VITÓRIA! ${usuarioLogado} acertou a palavra: ${palavraCerta.toUpperCase()}`);
    } else {
        comunicarAoNarrador(`Chute "${chute}" incorreto.`);
    }

    input.value = "";
}

/**
 * FINALIZAÇÃO
 */
function finalizarRodada(mensagem) {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);
    
    jogoIniciado = false;
    comunicarAoNarrador(mensagem);
    alert(mensagem);
    
    const feedbackDisplay = document.getElementById('feedbackAcessivel');
    if (feedbackDisplay) feedbackDisplay.innerText = "Rodada finalizada.";
}

/**
 * MOTOR DE VOZ (ARIA-LIVE)
 */
function comunicarAoNarrador(texto) {
    const narrador = document.getElementById('narrador');
    if (narrador) {
        narrador.innerText = ""; 
        setTimeout(() => {
            narrador.innerText = texto;
        }, 50);
    }
}