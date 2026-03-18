/* =========================================================
   CONTROLE PRINCIPAL - GARME ACESSÍVEL (VERSÃO INTEGRAL)
   REGRAS: DESENHO LENTO (1 MIN) + NARRAÇÃO EM TEMPO REAL
========================================================= */

let usuarioLogado = "";
let tempoRestante = 120; // 2 minutos oficiais
let cronometroIntervalo = null;
let palavraCerta = ""; 
let jogoIniciado = false;

/**
 * Inicialização do Sistema
 */
document.addEventListener('DOMContentLoaded', () => {
    configurarInterfaceInicial();
    configurarFeedbackManual();
});

function configurarInterfaceInicial() {
    const btnIniciar = document.getElementById('btnIniciarPartida');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', realizarLogin);
    }
    
    // Inicia com interface limpa conforme aprovado
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

    comunicarAoNarrador(`Olá ${usuarioLogado}. Escolha DESENHO MANUAL ou AUTOMÁTICO.`);
}

/**
 * MODO AUTOMÁTICO (ROBÔ MESTRE)
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
                comunicarAoNarrador(`Tema ${id} selecionado. Clique em OK para o robô começar.`);
                
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
 * MODO MANUAL (DESENHO LIVRE)
 */
function modoManual() {
    const dica = prompt("Qual objeto você vai desenhar manualmente?");
    if (dica && dica.trim() !== "") {
        palavraCerta = dica.toLowerCase().trim();
        comunicarAoNarrador(`Dica registrada. O tempo é livre para desenhar. Clique em OK para começar.`);
        
        const btnOk = document.getElementById('btnConfirmarInicio');
        if (btnOk) {
            btnOk.classList.remove('hidden');
            btnOk.focus();
        }
    }
}

function configurarFeedbackManual() {
    const canvas = document.getElementById('quadro');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let desenhando = false;

    canvas.addEventListener('mousedown', () => { 
        desenhando = true; 
        ctx.beginPath(); 
    });
    
    canvas.addEventListener('mouseup', () => { 
        desenhando = false; 
        if (jogoIniciado) comunicarAoNarrador("Traço finalizado no quadro."); 
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!desenhando) return;
        ctx.lineWidth = 4;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    });
}

/**
 * DISPARO DA RODADA
 */
function confirmarInicioJogo() {
    if (jogoIniciado || !palavraCerta) return;

    jogoIniciado = true;
    tempoRestante = 120;
    
    const btnOk = document.getElementById('btnConfirmarInicio');
    if (btnOk) btnOk.classList.add('hidden');
    
    comunicarAoNarrador("A rodada começou! Valendo 2 minutos.");

    iniciarCronometro();

    // Se for automático, desenha lentamente em 1 minuto com narração passo a passo
    if (typeof BIBLIOTECA_DESENHOS !== 'undefined' && BIBLIOTECA_DESENHOS[palavraCerta]) {
        executarDesenhoAnimado(BIBLIOTECA_DESENHOS[palavraCerta]);
    }
}

/**
 * ANIMAÇÃO DO ROBÔ: TERMINA EM 1 MINUTO COM FEEDBACK PARA O CEGO
 */
async function executarDesenhoAnimado(objeto) {
    const canvas = document.getElementById('quadro');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = 4;

    // Calcula intervalo para durar exatamente 60 segundos (1 minuto)
    const totalPontos = objeto.pontos.length;
    const intervaloMs = Math.floor(60000 / totalPontos);

    for (let i = 0; i < objeto.pontos.length; i++) {
        if (!jogoIniciado) break;

        const p = objeto.pontos[i];
        
        // Narração síncrona de cada etapa do desenho para o analista cego
        if (objeto.etapas && objeto.etapas[i]) {
            comunicarAoNarrador(objeto.etapas[i]);
        }

        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
        
        ctx.stroke();

        await new Promise(resolve => setTimeout(resolve, intervaloMs));
    }
    
    if (jogoIniciado) {
        comunicarAoNarrador("O robô terminou o desenho! Resta 1 minuto para as tentativas finais.");
    }
}

/**
 * CRONÔMETRO COM ALERTAS VERBAIS OBRIGATÓRIOS
 */
function iniciarCronometro() {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);

    cronometroIntervalo = setInterval(() => {
        tempoRestante--;
        
        const feedbackDisplay = document.getElementById('feedbackAcessivel');
        if (feedbackDisplay) feedbackDisplay.innerText = `Tempo: ${tempoRestante}s`;

        if (tempoRestante === 60) {
            comunicarAoNarrador("Atenção: Falta 1 minuto!");
        } 
        else if (tempoRestante === 30) {
            comunicarAoNarrador("Últimos 30 segundos! O tempo está acabando.");
        }
        else if (tempoRestante <= 10 && tempoRestante > 0) {
            comunicarAoNarrador(tempoRestante.toString());
        }

        if (tempoRestante <= 0) {
            finalizarRodada("Tempo esgotado! A palavra era " + palavraCerta.toUpperCase());
        }
    }, 1000);
}

/**
 * SISTEMA DE CHUTES
 */
function enviarChute() {
    const input = document.getElementById('chutePalavra');
    if (!input) return;

    const chute = input.value.toLowerCase().trim();
    if (!chute) return;

    if (chute === palavraCerta) {
        finalizarRodada(`VITÓRIA! ${usuarioLogado} acertou a palavra: ${palavraCerta.toUpperCase()}`);
    } else {
        comunicarAoNarrador(`Chute incorreto.`);
    }

    input.value = "";
}

function finalizarRodada(mensagem) {
    if (cronometroIntervalo) clearInterval(cronometroIntervalo);
    jogoIniciado = false;
    comunicarAoNarrador(mensagem);
    alert(mensagem);
    if (document.getElementById('feedbackAcessivel')) {
        document.getElementById('feedbackAcessivel').innerText = "Rodada finalizada.";
    }
}

function comunicarAoNarrador(texto) {
    const narrador = document.getElementById('narrador');
    if (narrador) {
        narrador.innerText = ""; 
        setTimeout(() => { narrador.innerText = texto; }, 50);
    }
}