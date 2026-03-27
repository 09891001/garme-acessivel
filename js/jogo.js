"use strict";

// ===============================
// GARME ACESSÍVEL - JOGO.JS (VERSÃO CORRIGIDA)
// ===============================

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================

let usuarioNome01 = null;
let usuarioId01 = null;
let usuarioLogado01 = false;

let desenhistaAtual01 = null;
let palavraAtual01 = null;

let timerAtual01 = 120;
let timerIntervalo01 = null;

let rodadaAtual01 = 0;
let jogoEmAndamento01 = false;

let listaUsuarios01 = {};
let rankingUsuarios01 = {};


// ===============================
// ELEMENTOS DOM
// ===============================

let inputNome01;
let btnEntrarPartida01;

let btnManual01;
let btnAuto01;

let btnLimparQuadro01;
let btnEnviarChute01;

let btnEntrarRodada01;
let btnSair01;
let btnReset01;

let areaJogo01;
let lobby01;

let janelaChat01;
let listaRanking01;

let timerPartida01;
let palavraAtualTexto01;

let statusSistema01;
let displayUsuario01;

let areaEscolhaDesenho01;


// ===============================
// INICIALIZAÇÃO
// ===============================

document.addEventListener("DOMContentLoaded", function(){

inputNome01 = document.getElementById("nomeUsuario");
btnEntrarPartida01 = document.getElementById("btnEntrarPartida");

btnManual01 = document.getElementById("btnManual");
btnAuto01 = document.getElementById("btnAuto");

btnLimparQuadro01 = document.getElementById("btnLimparQuadro");
btnEnviarChute01 = document.getElementById("btnEnviarChute");

btnEntrarRodada01 = document.getElementById("btnEntrarRodada");
btnSair01 = document.getElementById("btnSair");
btnReset01 = document.getElementById("botaoResetAcessivel");

areaJogo01 = document.getElementById("areaJogo");
lobby01 = document.getElementById("lobby");

janelaChat01 = document.getElementById("janelaChat");
listaRanking01 = document.getElementById("listaRanking");

timerPartida01 = document.getElementById("timerPartida");
palavraAtualTexto01 = document.getElementById("palavraAtual");

statusSistema01 = document.getElementById("statusSistema");
displayUsuario01 = document.getElementById("displayUsuario");

areaEscolhaDesenho01 = document.getElementById("areaEscolhaDesenho");

// ❌ REMOVIDO: configurarEventos duplicado (controlado pelo index.html)

escutarUsuarios01();
escutarChat01();
escutarEstado01();
escutarRanking01();
escutarResetGlobal01();

});


// ===============================
// LOGIN
// ===============================

function realizarLogin(){

if(!inputNome01) return;

const nome = inputNome01.value.trim();

if(nome.length < 2){

escreverSistema01("Digite um nome válido");
return;

}

usuarioNome01 = nome;
usuarioId01 = Date.now().toString();

usuarioLogado01 = true;

lobby01.style.display = "none";
areaJogo01.style.display = "block";

displayUsuario01.textContent = usuarioNome01;
statusSistema01.textContent = "Online";

// ✔ USANDO CONFIG.JS
if(typeof registrarUsuarioFirebase01 === "function"){
registrarUsuarioFirebase01(usuarioId01, usuarioNome01);
}

escreverSistema01(usuarioNome01 + " entrou na partida");

anunciarAcessibilidade01("Você entrou na partida");

}


// ===============================
// FIREBASE USUÁRIOS
// ===============================

function escutarUsuarios01(){

if(!db) return;

db.ref(firebaseUsuarios01).on("value", function(snapshot){

const data = snapshot.val();

if(!data){

listaUsuarios01 = {};
return;

}

listaUsuarios01 = data;

});

}


// ===============================
// CHAT
// ===============================

function enviarChute(){

const input = document.getElementById("chutePalavra");

if(!input) return;

const mensagem = input.value.trim();

if(mensagem.length === 0) return;

if(typeof enviarMensagemChatFirebase01 === "function"){

enviarMensagemChatFirebase01(usuarioNome01, mensagem);

}

input.value = "";

}

function escutarChat01(){

if(!db) return;

db.ref(firebaseChat01).on("child_added", function(snapshot){

const data = snapshot.val();

if(!data) return;

escreverChat01(data.nome + ": " + data.mensagem);

verificarResposta01(data.mensagem, data.nome);

});

}

function escreverChat01(texto){

const div = document.createElement("div");

div.textContent = texto;

janelaChat01.appendChild(div);

janelaChat01.scrollTop = janelaChat01.scrollHeight;

}


// ===============================
// SISTEMA
// ===============================

function escreverSistema01(texto){

const div = document.createElement("div");

div.textContent = "Sistema: " + texto;

janelaChat01.appendChild(div);

janelaChat01.scrollTop = janelaChat01.scrollHeight;

}

function anunciarAcessibilidade01(texto){

const area = document.getElementById("areaAcessivel");

if(!area) return;

area.textContent = "";

setTimeout(function(){

area.textContent = texto;

},100);

}


// ===============================
// CONTROLE DE RODADAS
// ===============================

function entrarPartida(){

if(!usuarioLogado01) return;

if(jogoEmAndamento01) return;

iniciarRodadaCompleta01();

}

function iniciarRodadaCompleta01(){

jogoEmAndamento01 = true;

escolherProximoDesenhista01();

iniciarTimerLocal01();

if(typeof limparQuadroSincronizado === "function"){
limparQuadroSincronizado();
}

}


// ===============================
// DESENHISTA
// ===============================

function escolherProximoDesenhista01(){

const ids = Object.keys(listaUsuarios01);

if(ids.length === 0) return;

const indice = Math.floor(Math.random() * ids.length);

const id = ids[indice];

const usuario = listaUsuarios01[id];

if(typeof definirDesenhistaFirebase01 === "function"){
definirDesenhistaFirebase01(usuario.nome);
}

escreverSistema01(usuario.nome + " é o desenhista");

}


// ===============================
// ESCUTA ESTADO
// ===============================

function escutarEstado01(){

if(!db) return;

db.ref(firebaseEstado01).on("value", function(snapshot){

const estado = snapshot.val();

if(!estado) return;

desenhistaAtual01 = estado.desenhista;
palavraAtual01 = estado.palavra;

atualizarControleBotoes01();

});

}

function atualizarControleBotoes01(){

if(usuarioNome01 === desenhistaAtual01){

areaEscolhaDesenho01.style.display = "block";

// ✔ INTEGRAÇÃO COM DESENHO.JS
if(window.liberarDesenho){
window.liberarDesenho();
}

}else{

areaEscolhaDesenho01.style.display = "none";

if(window.bloquearDesenho){
window.bloquearDesenho();
}

}

}


// ===============================
// ESCOLHA DESENHO
// ===============================

function escolherDesenhoManual(){

if(usuarioNome01 !== desenhistaAtual01) return;

const palavra = prompt("Digite a palavra");

if(!palavra) return;

if(typeof definirPalavraFirebase01 === "function"){
definirPalavraFirebase01(palavra);
}

palavraAtualTexto01.textContent = "Desenhando...";

areaEscolhaDesenho01.style.display = "none";

}

function escolherDesenhoAutomatico(){

if(usuarioNome01 !== desenhistaAtual01) return;

const palavras = [
"casa","carro","gato","cachorro","árvore",
"avião","barco","telefone","livro","bola"
];

const palavra = palavras[Math.floor(Math.random() * palavras.length)];

if(typeof definirPalavraFirebase01 === "function"){
definirPalavraFirebase01(palavra);
}

palavraAtualTexto01.textContent = "Desenhando...";

areaEscolhaDesenho01.style.display = "none";

}


// ===============================
// VERIFICAR RESPOSTA
// ===============================

function verificarResposta01(mensagem, nome){

if(!palavraAtual01) return;

if(mensagem.toLowerCase() === palavraAtual01.toLowerCase()){

acertouPalavra01(nome);

}

}

function acertouPalavra01(nome){

escreverSistema01(nome + " acertou a palavra");

atualizarPontuacao01(nome);

resetarRodada01();

}


// ===============================
// TIMER
// ===============================

function iniciarTimerLocal01(){

clearInterval(timerIntervalo01);

timerAtual01 = 120;

timerIntervalo01 = setInterval(function(){

timerAtual01--;

if(timerPartida01){
timerPartida01.textContent = "Tempo: " + timerAtual01;
}

if(timerAtual01 <= 0){

clearInterval(timerIntervalo01);

finalizarRodada01();

}

},1000);

}

function finalizarRodada01(){

jogoEmAndamento01 = false;

palavraAtual01 = null;

if(palavraAtualTexto01){
palavraAtualTexto01.textContent = "Aguardando rodada";
}

escreverSistema01("Tempo esgotado");

anunciarAcessibilidade01("Tempo esgotado");

resetarRodada01();

}


// ===============================
// RESET RODADA
// ===============================

function resetarRodada01(){

clearInterval(timerIntervalo01);

timerAtual01 = 120;

if(timerPartida01){
timerPartida01.textContent = "Tempo: 120";
}

palavraAtual01 = null;
jogoEmAndamento01 = false;

}


// ===============================
// RANKING
// ===============================

function atualizarPontuacao01(nome){

if(!rankingUsuarios01[nome]){
rankingUsuarios01[nome] = 0;
}

rankingUsuarios01[nome]++;

if(typeof atualizarPontuacaoFirebase01 === "function"){
// opcional manter sincronizado
}

}

function escutarRanking01(){

if(!db) return;

db.ref(firebaseRanking01).on("value", function(snapshot){

const data = snapshot.val();

if(!data){
rankingUsuarios01 = {};
renderizarRanking01();
return;
}

rankingUsuarios01 = data;

renderizarRanking01();

});

}

function renderizarRanking01(){

if(!listaRanking01) return;

listaRanking01.innerHTML = "";

Object.keys(rankingUsuarios01).forEach(function(nome){

const li = document.createElement("li");

li.textContent = nome + " - " + rankingUsuarios01[nome];

listaRanking01.appendChild(li);

});

}


// ===============================
// RESET GLOBAL
// ===============================

function resetarJogoCompleto(){

if(typeof resetarFirebaseCompleto01 === "function"){
resetarFirebaseCompleto01();
}

resetarEstadoLocal01();
resetarInterface01();

if(typeof limparQuadroSincronizado === "function"){
limparQuadroSincronizado();
}

escreverSistema01("Jogo resetado");
anunciarAcessibilidade01("Jogo resetado");

}

function resetarEstadoLocal01(){

desenhistaAtual01 = null;
palavraAtual01 = null;
timerAtual01 = 120;
rodadaAtual01 = 0;
jogoEmAndamento01 = false;

}

function resetarInterface01(){

if(timerPartida01){
timerPartida01.textContent = "Tempo: 120";
}

if(palavraAtualTexto01){
palavraAtualTexto01.textContent = "Aguardando rodada";
}

if(janelaChat01){
janelaChat01.innerHTML = "";
}

if(listaRanking01){
listaRanking01.innerHTML = "";
}

}


// ===============================
// SAIR
// ===============================

function sairPartida(){

if(!usuarioId01) return;

if(typeof removerUsuarioFirebase01 === "function"){
removerUsuarioFirebase01(usuarioId01);
}

usuarioLogado01 = false;

if(displayUsuario01){
displayUsuario01.textContent = "Offline";
}

if(statusSistema01){
statusSistema01.textContent = "Offline";
}

escreverSistema01("Usuário saiu da partida");

}


// ===============================
// RESET GLOBAL ESCUTA
// ===============================

function escutarResetGlobal01(){

if(!db) return;

db.ref(firebaseReset01).on("value", function(snapshot){

const data = snapshot.val();

if(data){
resetarJogoCompleto();
}

});

}


// ===============================
// INICIALIZAÇÃO FINAL
// ===============================

function iniciarSistemaFinal01(){

if(!db){
console.error("Firebase não inicializado");
return;
}

}

document.addEventListener("DOMContentLoaded", function(){
iniciarSistemaFinal01();
});