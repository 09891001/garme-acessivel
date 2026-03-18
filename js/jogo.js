/* =========================================================
   GARME ACESSÍVEL - LÓGICA INTEGRAL COM FIREBASE
   URL: https://09891001.github.io/garme-acessivel/
   REGRAS: 16 PLAYERS | 2 MINUTOS | ACESSIBILIDADE TOTAL
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Configuração Oficial do seu Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBxav0baX6bucdYUlw1pRWOFcv9AwtqymY",
  authDomain: "garme-acessivel.firebaseapp.com",
  databaseURL: "https://garme-acessivel-default-rtdb.firebaseio.com",
  projectId: "garme-acessivel",
  storageBucket: "garme-acessivel.firebasestorage.app",
  messagingSenderId: "69205141908",
  appId: "1:69205141908:web:d3ce0b770f699c1a8ac781"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let meuId = null;
let minhaInfo = { nome: "", modo: "", pontos: 0, palavra: "" };
let jogadores = {};
let tempoRestante = 120;
let intervaloCronometro = null;
let palavraDaRodada = "";
let jogoIniciado = false;

/**
 * Inicialização do Sistema
 */
document.addEventListener('DOMContentLoaded', () => {
    configurarInterfaceInicial();
    ouvirJogadores();
    ouvirEstadoDoJogo();
});

function configurarInterfaceInicial() {
    const btnEntrar = document.getElementById('btnIniciarPartida');
    if (btnEntrar) btnEntrar.onclick = realizarLogin;
    
    document.getElementById('galeriaDesenhos').style.display = 'none';
    document.getElementById('btnConfirmarInicio').classList.add('hidden');
    
    comunicarAoNarrador("Sistema Garme Acessível pronto. Digite seu nome para entrar na sala.");
}

/**
 * LOGIN: Sincroniza sua entrada para todos os 16 jogadores
 */
function realizarLogin() {
    const inputNome = document.getElementById('nomeUsuario');
    const nome = inputNome ? inputNome.value.trim() : "";
    
    if (!nome) {
        alert("Por favor, digite seu nome.");
        return;
    }

    meuId = nome; 
    minhaInfo.nome = nome;

    // Salva no Firebase para que os outros te vejam
    set(ref(db, 'jogadores/' + meuId), minhaInfo);
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('displayUsuario').innerText = nome;
    
    comunicarAoNarrador(`Olá ${nome}, você entrou na sala. Escolha agora o seu modo de desenho.`);
}

/**
 * SINCRONIZAÇÃO: Monitora quem entra e quem está pronto
 */
function ouvirJogadores() {
    onValue(ref(db, 'jogadores'), (snapshot) => {
        jogadores = snapshot.val() || {};
        atualizarListaVisual();
    });
}

function atualizarListaVisual() {
    const listaArea = document.getElementById('listaParticipantes'); 
    if (!listaArea) return;

    listaArea.innerHTML = "<h3>Participantes na Sala:</h3>";
    let contagemProntos = 0;
    const ids = Object.keys(jogadores);

    ids.forEach(id => {
        const j = jogadores[id];
        const status = j.modo ? "✅ Pronto" : "⏳ Escolhendo...";
        if (j.modo) contagemProntos++;
        listaArea.innerHTML += `<p><strong>${j.nome}</strong>: ${status}</p>`;
    });

    // O botão OK só habilita quando TODOS na sala escolherem o modo
    const btnOk = document.getElementById('btnConfirmarInicio');
    if (contagemProntos === ids.length && ids.length > 0) {
        btnOk.classList.remove('hidden');
        btnOk.onclick = dispararInicioSincronizado;
        comunicarAoNarrador("Todos estão prontos! O mestre já pode iniciar a partida.");
    } else {
        btnOk.classList.add('hidden');
    }
}

/**
 * ESCOLHA DE MODO: Manual ou Automático
 */
window.setModoJogador = function(modo) {
    minhaInfo.modo = modo;
    let palavraEscolhida = "";
    
    if (modo === 'manual') {
        palavraEscolhida = prompt("O que você vai desenhar na sua vez?") || "objeto";
    }

    // Atualiza o Firebase para os outros saberem seu status
    update(ref(db, 'jogadores/' + meuId), { 
        modo: modo, 
        palavra: palavraEscolhida.toLowerCase() 
    });

    document.querySelector('.controles-modo').classList.add('hidden');
    comunicarAoNarrador(`Modo ${modo} salvo. Aguardando o início da rodada.`);
}

/**
 * CONTROLE DE RODADA: Sincronização de 2 minutos
 */
function dispararInicioSincronizado() {
    const primeiroId = Object.keys(jogadores)[0];
    const palavra = jogadores[primeiroId].palavra || "casa";

    set(ref(db, 'estadoJogo'), {
        ativo: true,
        desenhistaId: primeiroId,
        palavra: palavra,
        timestamp: Date.now()
    });
}

function ouvirEstadoDoJogo() {
    onValue(ref(db, 'estadoJogo'), (snapshot) => {
        const estado = snapshot.val();
        if (estado && estado.ativo) {
            iniciarRodadaLocal(estado);
        }
    });
}

function iniciarRodadaLocal(estado) {
    jogoIniciado = true;
    palavraDaRodada = estado.palavra;
    tempoRestante = 120;

    // Ativa interface de jogo
    document.querySelector('.chat-section').style.opacity = "1";
    document.querySelector('.chat-section').style.pointerEvents = "all";
    document.getElementById('chutePalavra').focus();

    // PRIVACIDADE: Esconde menus de quem não desenha
    const areaControle = document.querySelector('.controles-modo');
    if (meuId !== estado.desenhistaId) {
        areaControle.style.display = 'none';
        comunicarAoNarrador(`${estado.desenhistaId} está desenhando. Tente acertar no chat!`);
    } else {
        areaControle.style.display = 'flex';
        comunicarAoNarrador("Sua vez de desenhar! O robô iniciará em instantes.");
        if (typeof desenharObjetoAutomatico === "function") {
            desenharObjetoAutomatico(palavraDaRodada);
        }
    }

    iniciarCronometro();
}

function iniciarCronometro() {
    if (intervaloCronometro) clearInterval(intervaloCronometro);
    intervaloCronometro = setInterval(() => {
        tempoRestante--;
        document.getElementById('feedbackAcessivel').innerText = `Tempo: ${tempoRestante}s`;
        
        if (tempoRestante === 60) comunicarAoNarrador("Falta 1 minuto!");
        if (tempoRestante <= 0) encerrarRodada();
    }, 1000);
}

/**
 * CHAT E RANKING
 */
window.enviarChute = function() {
    const input = document.getElementById('chutePalavra');
    const chute = input.value.toLowerCase().trim();
    
    if (chute === palavraDaRodada) {
        minhaInfo.pontos += 10;
        update(ref(db, 'jogadores/' + meuId), { pontos: minhaInfo.pontos });
        comunicarAoNarrador("Você acertou! +10 pontos no ranking.");
        encerrarRodada();
    }
    input.value = "";
}

function encerrarRodada() {
    clearInterval(intervaloCronometro);
    jogoIniciado = false;
    
    // Mostra o ranking básico no final
    const ranking = Object.values(jogadores).sort((a, b) => b.pontos - a.pontos);
    let msg = "Fim da rodada! Ranking:\n";
    ranking.forEach((j, i) => msg += `${i+1}º ${j.nome}: ${j.pontos} pts\n`);
    
    alert(msg);
    comunicarAoNarrador(msg);
}

/**
 * GALERIA ACESSÍVEL
 */
window.alternarModoAutomatico = function() {
    const galeria = document.getElementById('galeriaDesenhos');
    const lista = document.getElementById('listaDesenhos');
    
    galeria.style.display = 'flex';
    lista.innerHTML = ""; 

    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        Object.keys(BIBLIOTECA_DESENHOS).forEach((item, index) => {
            const btn = document.createElement('button');
            btn.innerText = item.toUpperCase();
            btn.className = "btn-desenho";
            if (index === 0) btn.id = "focoGaleria";

            btn.onclick = () => {
                const palavra = item.toLowerCase();
                update(ref(db, 'jogadores/' + meuId), { modo: 'automatico', palavra: palavra });
                galeria.style.display = 'none';
                document.querySelector('.controles-modo').classList.add('hidden');
            };
            lista.appendChild(btn);
        });
        setTimeout(() => document.getElementById('focoGaleria')?.focus(), 100);
    }
}

window.fecharGaleria = function() {
    document.getElementById('galeriaDesenhos').style.display = 'none';
}

/**
 * MOTOR DE VOZ
 */
function comunicarAoNarrador(texto) {
    const n = document.getElementById('narrador');
    if (n) {
        n.innerText = "";
        setTimeout(() => { n.innerText = texto; }, 50);
    }
}