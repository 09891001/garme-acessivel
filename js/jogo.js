/* =========================================================
   GARME ACESSÍVEL - LÓGICA INTEGRAL COM FIREBASE
   REGRAS: 16 PLAYERS | 120 SEGUNDOS | ACESSIBILIDADE TOTAL
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Configuração Oficial do Firebase
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

/**
 * EXPOSIÇÃO GLOBAL (window)
 * Resolve o erro "ReferenceError: function is not defined"
 */

window.realizarLogin = function() {
    const inputNome = document.getElementById('nomeUsuario');
    const nome = inputNome ? inputNome.value.trim() : "";
    
    if (!nome) {
        alert("Por favor, digite seu nome.");
        return;
    }

    meuId = nome; 
    minhaInfo.nome = nome;

    // Sincroniza entrada no Firebase
    set(ref(db, 'jogadores/' + meuId), minhaInfo);
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('displayUsuario').innerText = nome;
    
    comunicarAoNarrador(`Olá ${nome}, você entrou na sala. Escolha seu modo.`);
};

window.setModoJogador = function(modo) {
    minhaInfo.modo = modo;
    let palavraEscolhida = "";
    
    if (modo === 'manual') {
        palavraEscolhida = prompt("O que você vai desenhar?") || "objeto";
    }

    // Atualiza prontidão para todos os 16 jogadores
    update(ref(db, 'jogadores/' + meuId), { 
        modo: modo, 
        palavra: palavraEscolhida.toLowerCase() 
    });

    document.querySelector('.controles-modo').classList.add('hidden');
    comunicarAoNarrador(`Modo ${modo} salvo. Aguardando os outros jogadores.`);
};

window.modoManual = function() {
    window.setModoJogador('manual');
};

window.alternarModoAutomatico = function() {
    const galeria = document.getElementById('galeriaDesenhos');
    const lista = document.getElementById('listaDesenhos');
    
    galeria.style.display = 'flex';
    lista.innerHTML = ""; 

    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        Object.keys(BIBLIOTECA_DESENHOS).forEach((item) => {
            const btn = document.createElement('button');
            btn.innerText = item.toUpperCase();
            btn.className = "btn-desenho";

            btn.onclick = () => {
                const palavra = item.toLowerCase();
                update(ref(db, 'jogadores/' + meuId), { modo: 'automatico', palavra: palavra });
                galeria.style.display = 'none';
                document.querySelector('.controles-modo').classList.add('hidden');
            };
            lista.appendChild(btn);
        });
    }
};

window.enviarChute = function() {
    const input = document.getElementById('chutePalavra');
    const chute = input ? input.value.toLowerCase().trim() : "";
    
    if (chute === palavraDaRodada) {
        minhaInfo.pontos += 10;
        update(ref(db, 'jogadores/' + meuId), { pontos: minhaInfo.pontos });
        comunicarAoNarrador("Parabéns! Você acertou a palavra.");
        encerrarRodada();
    }
    if (input) input.value = "";
};

window.dispararInicioSincronizado = function() {
    const ids = Object.keys(jogadores);
    const primeiroId = ids[0]; // O primeiro a entrar é o mestre da rodada
    const palavra = jogadores[primeiroId].palavra || "casa";

    set(ref(db, 'estadoJogo'), {
        ativo: true,
        desenhistaId: primeiroId,
        palavra: palavra,
        timestamp: Date.now()
    });
};

/**
 * MONITORAMENTO EM TEMPO REAL (FIREBASE)
 */

function ouvirJogadores() {
    onValue(ref(db, 'jogadores'), (snapshot) => {
        jogadores = snapshot.val() || {};
        const ids = Object.keys(jogadores);
        let contagemProntos = 0;

        ids.forEach(id => {
            if (jogadores[id].modo) contagemProntos++;
        });

        // Habilita início quando todos (até 16) estiverem prontos
        const btnOk = document.getElementById('btnConfirmarInicio');
        if (contagemProntos === ids.length && ids.length > 0) {
            btnOk.classList.remove('hidden');
            btnOk.onclick = window.dispararInicioSincronizado;
        }
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

/**
 * LÓGICA DA RODADA E ACESSIBILIDADE
 */

function iniciarRodadaLocal(estado) {
    palavraDaRodada = estado.palavra;
    tempoRestante = 120; // Regra oficial de 2 minutos

    if (meuId !== estado.desenhistaId) {
        comunicarAoNarrador(`${estado.desenhistaId} está desenhando agora. Tente adivinhar.`);
    } else {
        comunicarAoNarrador("Sua vez de desenhar! O robô iniciará o traçado.");
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
        const fb = document.getElementById('feedbackAcessivel');
        if (fb) fb.innerText = `Tempo: ${tempoRestante}s`;
        if (tempoRestante <= 0) encerrarRodada();
    }, 1000);
}

function encerrarRodada() {
    clearInterval(intervaloCronometro);
    comunicarAoNarrador("Fim da rodada.");
}

function comunicarAoNarrador(texto) {
    const n = document.getElementById('narrador');
    if (n) {
        n.innerText = ""; // Limpa para forçar a leitura do aria-live
        setTimeout(() => { n.innerText = texto; }, 50);
    }
}

// Inicialização dos ouvintes
ouvirJogadores();
ouvirEstadoDoJogo();