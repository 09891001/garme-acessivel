/* =========================================================
   GARME ACESSÍVEL - CÓDIGO INTEGRAL (JOGO.JS)
   COMPATÍVEL COM NARRAÇÃO E REGRAS OFICIAIS
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Configuração do Firebase
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

// Variáveis de Controle
let meuId = null;
let minhaInfo = { nome: "", modo: "", pontos: 0, palavra: "" };
let jogadores = {};
let tempoRestante = 120; // Regra: 2 minutos
let intervaloCronometro = null;
let palavraDaRodada = "";

/**
 * ACESSIBILIDADE: COMUNICAÇÃO COM NARRADOR
 * Envia texto para a div aria-live
 */
function comunicarAoNarrador(texto) {
    const n = document.getElementById('narrador');
    if (n) {
        n.innerText = ""; 
        setTimeout(() => { n.innerText = texto; }, 50);
    }
}

/**
 * EXPOSIÇÃO GLOBAL (window)
 * Resolve o erro "is not defined" ao usar type="module"
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

    // Registra o jogador no Firebase (suporta até 16)
    set(ref(db, 'jogadores/' + meuId), minhaInfo);
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('displayUsuario').innerText = nome;
    
    comunicarAoNarrador(`Olá ${nome}, login realizado com sucesso.`);
};

window.modoManual = function() {
    const p = prompt("O que você vai desenhar?");
    if (p) {
        minhaInfo.modo = 'manual';
        minhaInfo.palavra = p.toLowerCase().trim();
        update(ref(db, 'jogadores/' + meuId), { modo: 'manual', palavra: minhaInfo.palavra });
        document.querySelector('.controles-modo').classList.add('hidden');
        comunicarAoNarrador(`Modo manual. Você desenhará: ${minhaInfo.palavra}.`);
    }
};

window.alternarModoAutomatico = function() {
    const galeria = document.getElementById('galeriaDesenhos');
    const lista = document.getElementById('listaDesenhos');
    
    galeria.style.display = 'flex';
    lista.innerHTML = ""; 

    // Verifica se a biblioteca em desenho.js está carregada
    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        Object.keys(BIBLIOTECA_DESENHOS).forEach((item) => {
            const btn = document.createElement('button');
            btn.innerText = item.toUpperCase();
            btn.className = "btn-desenho";

            btn.onclick = () => {
                minhaInfo.modo = 'automatico';
                minhaInfo.palavra = item.toLowerCase();
                update(ref(db, 'jogadores/' + meuId), { modo: 'automatico', palavra: minhaInfo.palavra });
                galeria.style.display = 'none';
                document.querySelector('.controles-modo').classList.add('hidden');
                comunicarAoNarrador(`Modo automático selecionado. O robô desenhará: ${item}.`);
            };
            lista.appendChild(btn);
        });
    }
};

window.enviarChute = function() {
    const input = document.getElementById('chutePalavra');
    const chute = input ? input.value.toLowerCase().trim() : "";
    
    if (chute === palavraDaRodada && palavraDaRodada !== "") {
        minhaInfo.pontos += 10;
        update(ref(db, 'jogadores/' + meuId), { pontos: minhaInfo.pontos });
        comunicarAoNarrador("Parabéns! Você acertou e ganhou 10 pontos.");
        encerrarRodada();
    } else {
        push(ref(db, 'chat'), { usuario: meuId || "Visitante", mensagem: chute });
    }
    if (input) input.value = "";
};

/**
 * SINCRONIZAÇÃO EM TEMPO REAL
 */

// Monitora a lista de jogadores e libera o botão de início
onValue(ref(db, 'jogadores'), (snapshot) => {
    jogadores = snapshot.val() || {};
    const ids = Object.keys(jogadores);
    let prontos = 0;

    ids.forEach(id => {
        if (jogadores[id].modo) prontos++;
    });

    const btnOk = document.getElementById('btnConfirmarInicio');
    if (btnOk && prontos > 0) {
        btnOk.classList.remove('hidden');
        btnOk.onclick = () => {
            // Define o desenhista e inicia para todos
            set(ref(db, 'estadoJogo'), {
                ativo: true,
                desenhistaId: ids[0],
                palavra: jogadores[ids[0]].palavra
            });
        };
    }
});

// Monitora o estado da rodada
onValue(ref(db, 'estadoJogo'), (snapshot) => {
    const estado = snapshot.val();
    if (estado && estado.ativo) {
        palavraDaRodada = estado.palavra;
        // Se eu for o desenhista, inicia o desenho automático se for o caso
        if (meuId === estado.desenhistaId && typeof desenharObjetoAutomatico === "function") {
            desenharObjetoAutomatico(palavraDaRodada);
        }
        iniciarCronometro();
    }
});

// Atualiza o Chat
onChildAdded(ref(db, 'chat'), (snapshot) => {
    const msg = snapshot.val();
    const janela = document.getElementById('janelaChat');
    if (janela) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${msg.usuario}:</strong> ${msg.mensagem}`;
        janela.appendChild(p);
        janela.scrollTop = janela.scrollHeight;
    }
});

/**
 * REGRAS: CRONÔMETRO E FINALIZAÇÃO
 */

function iniciarCronometro() {
    tempoRestante = 120; // 2 minutos
    if (intervaloCronometro) clearInterval(intervaloCronometro);
    
    intervaloCronometro = setInterval(() => {
        tempoRestante--;
        const fb = document.getElementById('feedbackAcessivel');
        if (fb) fb.innerText = `Tempo: ${tempoRestante}s`;
        
        if (tempoRestante <= 0) {
            encerrarRodada();
        }
    }, 1000);
}

function encerrarRodada() {
    clearInterval(intervaloCronometro);
    comunicarAoNarrador("A rodada terminou.");
    
    // Reseta estado local para nova rodada
    if (meuId) {
        update(ref(db, 'jogadores/' + meuId), { modo: "", palavra: "" });
    }
    
    // Finaliza estado no Firebase e limpa chat
    set(ref(db, 'estadoJogo'), { ativo: false });
    remove(ref(db, 'chat'));
}