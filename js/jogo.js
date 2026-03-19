/* =========================================================
   GARME ACESSÍVEL - LÓGICA MULTIPLAYER COM LOGS E PRESENÇA
   REGRAS: 16 PLAYERS | 120 SEGUNDOS | ACESSIBILIDADE TOTAL
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, onChildAdded, remove, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

console.log("🚀 Sistema Iniciado: Carregando Firebase...");

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
let jogadoresConectados = {};
let palavraDaRodada = "";
let intervaloCronometro = null;

/**
 * ACESSIBILIDADE: NARRAÇÃO
 */
function comunicarAoNarrador(texto) {
    const n = document.getElementById('narrador');
    if (n) {
        n.innerText = ""; 
        setTimeout(() => { n.innerText = texto; }, 50);
    }
}

// --- FUNÇÕES GLOBAIS (WINDOW) ---

window.realizarLogin = function() {
    const inputNome = document.getElementById('nomeUsuario');
    const nome = inputNome ? inputNome.value.trim() : "";
    
    if (!nome) {
        console.warn("⚠️ Tentativa de login sem nome.");
        return;
    }

    meuId = nome; 
    minhaInfo.nome = nome;

    console.log(`👤 Login: Tentando entrar como ${nome}...`);

    const playerRef = ref(db, 'jogadores/' + meuId);
    
    // LIMPEZA DE FANTASMAS: Remove do Firebase se o usuário fechar a aba
    onDisconnect(playerRef).remove();

    update(playerRef, minhaInfo)
        .then(() => console.log("✅ Login realizado e persistido no Firebase."))
        .catch(err => console.error("❌ Erro ao salvar login:", err));
    
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('displayUsuario').innerText = nome;
    comunicarAoNarrador(`Login realizado. Olá ${nome}.`);
};

window.modoManual = function() {
    const p = prompt("O que você vai desenhar?");
    if (p) {
        const palavra = p.toLowerCase().trim();
        update(ref(db, 'jogadores/' + meuId), { modo: 'manual', palavra: palavra });
        console.log(`✍️ Modo Manual: Palavra definida -> ${palavra}`);
    }
};

window.alternarModoAutomatico = function() {
    const galeria = document.getElementById('galeriaDesenhos');
    const lista = document.getElementById('listaDesenhos');
    galeria.style.display = 'flex';
    lista.innerHTML = ""; 

    console.log("🤖 Abrindo galeria de desenhos automáticos...");

    if (typeof BIBLIOTECA_DESENHOS !== 'undefined') {
        Object.keys(BIBLIOTECA_DESENHOS).forEach((item) => {
            const btn = document.createElement('button');
            btn.innerText = item.toUpperCase();
            btn.className = "btn-desenho";
            btn.onclick = () => {
                update(ref(db, 'jogadores/' + meuId), { modo: 'automatico', palavra: item.toLowerCase() });
                galeria.style.display = 'none';
                console.log(`🤖 Modo Automático: Escolhido -> ${item}`);
            };
            lista.appendChild(btn);
        });
    } else {
        console.error("❌ Erro: BIBLIOTECA_DESENHOS não encontrada.");
    }
};

window.enviarChute = function() {
    const input = document.getElementById('chutePalavra');
    const chute = input ? input.value.toLowerCase().trim() : "";
    
    if (chute === palavraDaRodada && palavraDaRodada !== "") {
        console.log("🎉 Acerto detectado!");
        minhaInfo.pontos += 10;
        update(ref(db, 'jogadores/' + meuId), { pontos: minhaInfo.pontos });
        comunicarAoNarrador("Parabéns! Você acertou.");
        finalizarRodada();
    } else {
        push(ref(db, 'chat'), { usuario: meuId || "Anônimo", mensagem: chute });
    }
    if (input) input.value = "";
};

// --- SINCRONIZAÇÃO E REGRAS ---

onValue(ref(db, 'jogadores'), (snapshot) => {
    jogadoresConectados = snapshot.val() || {};
    const ids = Object.keys(jogadoresConectados);
    
    console.log(`👥 Atualização de Sala: ${ids.length} online.`);

    const nomes = ids.map(id => jogadoresConectados[id].nome).join(", ");
    document.getElementById('feedbackAcessivel').innerText = `Online: ${nomes}`;

    const btnOk = document.getElementById('btnConfirmarInicio');
    
    // Identifica quem definiu o desenho (Mestre)
    let mestreId = ids.find(id => jogadoresConectados[id] && jogadoresConectados[id].modo !== "");
    
    if (ids.length >= 2 && mestreId) {
        console.log("🔘 Botão de Iniciar Liberado.");
        btnOk.classList.remove('hidden');
        btnOk.onclick = () => {
            console.log("🏁 Disparando rodada oficial...");
            set(ref(db, 'estadoJogo'), {
                ativo: true,
                desenhistaId: mestreId,
                palavra: jogadoresConectados[mestreId].palavra
            });
        };
    } else {
        btnOk.classList.add('hidden');
    }
});

onValue(ref(db, 'estadoJogo'), (snapshot) => {
    const estado = snapshot.val();
    if (estado && estado.ativo) {
        console.log("🎮 Partida em andamento...");
        palavraDaRodada = estado.palavra;
        document.querySelector('.controles-modo').classList.add('hidden');
        
        if (meuId === estado.desenhistaId && typeof desenharObjetoAutomatico === "function") {
            desenharObjetoAutomatico(palavraDaRodada);
        }
        iniciarCronometro();
    }
});

function iniciarCronometro() {
    let tempo = 120; // 2 minutos
    if (intervaloCronometro) clearInterval(intervaloCronometro);
    
    intervaloCronometro = setInterval(() => {
        tempo--;
        const fb = document.getElementById('feedbackAcessivel');
        if (fb) fb.innerText = `Tempo: ${tempo}s | Jogador: ${minhaInfo.nome}`;
        
        if (tempo <= 0) {
            console.log("⏰ Tempo esgotado.");
            finalizarRodada();
        }
    }, 1000);
}

function finalizarRodada() {
    clearInterval(intervaloCronometro);
    console.log("🏁 Rodada Finalizada.");
    
    if (meuId) {
        update(ref(db, 'jogadores/' + meuId), { modo: "", palavra: "" });
    }
    
    set(ref(db, 'estadoJogo'), { ativo: false });
    remove(ref(db, 'chat'));
    document.querySelector('.controles-modo').classList.remove('hidden');
    comunicarAoNarrador("Fim da rodada. Verifiquem o chat.");
}

// Chat
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