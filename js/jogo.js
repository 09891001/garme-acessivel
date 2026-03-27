"use strict";

// ===============================
// ESTADO GLOBAL
// ===============================

let usuarioNome01 = null;
let usuarioId01 = null;
let usuarioLogado01 = false;

let desenhistaAtual01 = null;
let palavraAtual01 = null;

let timerAtual01 = 120;
let timerIntervalo01 = null;

let jogoEmAndamento01 = false;

let listaUsuarios01 = {};
let rankingUsuarios01 = {};

let liderAtual01 = null;

// dicas progressivas
let intervaloDica01 = null;
let etapaDica01 = 0;

// ===============================
// BANCO DE PALAVRAS
// ===============================

const bancoPalavras01 = [
{ palavra:"gato", dicas:["Animal doméstico","Tem quatro patas","Mia"] },
{ palavra:"avião", dicas:["Voa no céu","Transporta pessoas","Tem asas"] },
{ palavra:"carro", dicas:["Veículo terrestre","Tem rodas","Anda na rua"] },
{ palavra:"bola", dicas:["Objeto redondo","Usado em esportes","Quica"] },
{ palavra:"livro", dicas:["Objeto de leitura","Tem páginas","Conta histórias"] },
{ palavra:"cachorro", dicas:["Animal doméstico","Late","Melhor amigo do homem"] },
{ palavra:"árvore", dicas:["Tem folhas","Fica no chão","Tem tronco"] },
{ palavra:"telefone", dicas:["Faz ligações","Tem tela","Usado no dia a dia"] },
{ palavra:"cadeira", dicas:["Serve para sentar","Tem pernas","Está em casas"] },
{ palavra:"relógio", dicas:["Mostra o tempo","Tem horas","Pode ser digital"] },
{ palavra:"bicicleta", dicas:["Tem duas rodas","Usado para pedalar","Sem motor"] },
{ palavra:"computador", dicas:["Usado para trabalhar","Tem tela","Tem teclado"] },
{ palavra:"óculos", dicas:["Ajuda a enxergar","Fica no rosto","Tem lentes"] },
{ palavra:"janela", dicas:["Entrada de luz","Fica na parede","Pode abrir"] },
{ palavra:"porta", dicas:["Entrada de casa","Abre e fecha","Tem maçaneta"] },
{ palavra:"helicóptero", dicas:["Voa com hélice","Não precisa de pista","Faz barulho alto"] },
{ palavra:"geladeira", dicas:["Mantém frio","Fica na cozinha","Guarda comida"] },
{ palavra:"chuveiro", dicas:["Usado para banho","Sai água","Fica no banheiro"] },
{ palavra:"microfone", dicas:["Amplifica voz","Usado para falar","Tem cabo ou não"] },
{ palavra:"escada", dicas:["Serve para subir","Tem degraus","Pode ser alta"] },
{ palavra:"dragão", dicas:["Criatura fictícia","Cospe fogo","Tem asas"] },
{ palavra:"castelo", dicas:["Construção antiga","Reis moravam","Grande"] },
{ palavra:"robô", dicas:["Máquina inteligente","Pode andar","Faz tarefas"] },
{ palavra:"planeta", dicas:["No espaço","Gira no universo","Como Terra"] },
{ palavra:"foguete", dicas:["Vai ao espaço","Tem combustível","Sobe rápido"] }
];

let palavrasUsadas01 = [];

// ===============================
// VOZ
// ===============================

function falarTexto(texto){

if(!window.speechSynthesis) return;

const fala = new SpeechSynthesisUtterance(texto);
fala.lang = "pt-BR";

window.speechSynthesis.cancel();
window.speechSynthesis.speak(fala);

}

// ===============================
// ELEMENTOS
// ===============================

let areaJogo01;
let lobby01;
let statusSistema01;
let displayUsuario01;
let janelaChat01;
let listaRanking01;
let timerPartida01;
let palavraAtualTexto01;
let areaEscolhaDesenho01;
let statusPartida01;

// ===============================
// INIT
// ===============================

document.addEventListener("DOMContentLoaded", ()=>{

areaJogo01 = document.getElementById("areaJogo");
lobby01 = document.getElementById("lobby");
statusSistema01 = document.getElementById("statusSistema");
displayUsuario01 = document.getElementById("displayUsuario");
janelaChat01 = document.getElementById("janelaChat");
listaRanking01 = document.getElementById("listaRanking");
timerPartida01 = document.getElementById("timerPartida");
palavraAtualTexto01 = document.getElementById("palavraAtual");
areaEscolhaDesenho01 = document.getElementById("areaEscolhaDesenho");
statusPartida01 = document.getElementById("statusPartida");

escutarUsuarios01();
escutarChat01();
escutarEstado01();
escutarRanking01();

});

// ===============================
// LOGIN
// ===============================

function realizarLogin(){

const input = document.getElementById("nomeUsuario");
if(!input) return;

const nome = input.value.trim();
if(nome.length < 2) return;

usuarioNome01 = nome;
usuarioId01 = Date.now().toString();
usuarioLogado01 = true;

lobby01.style.display = "none";
areaJogo01.style.display = "block";

displayUsuario01.textContent = nome;
statusSistema01.textContent = "Online";

registrarUsuarioFirebase01(usuarioId01, nome);

falarTexto("Bem vindo " + nome);

}

// ===============================
// USUÁRIOS
// ===============================

function escutarUsuarios01(){

db.ref(firebaseUsuarios01).on("value", snap=>{

const data = snap.val();
if(!data) return;

listaUsuarios01 = data;

const nomes = Object.values(data).map(u=>u.nome);

db.ref(firebaseEstado01 + "/jogadores").set(nomes);

});

}

// ===============================
// CHAT
// ===============================

function enviarChute(){

const input = document.getElementById("chutePalavra");
if(!input) return;

const msg = input.value.trim();
if(!msg) return;

enviarMensagemChatFirebase01(usuarioNome01, msg);

input.value = "";

}

function escutarChat01(){

db.ref(firebaseChat01).on("child_added", snap=>{

const d = snap.val();
if(!d) return;

const texto = d.nome + ": " + d.mensagem;

escreverChat01(texto);
falarTexto(texto);

verificarResposta01(d.mensagem, d.nome);

});

}

function escreverChat01(texto){

const div = document.createElement("div");
div.textContent = texto;

janelaChat01.appendChild(div);
janelaChat01.scrollTop = janelaChat01.scrollHeight;

}
 
// ===============================
// TURNOS JUSTOS
// ===============================

function escolherProximoDesenhista01(){

db.ref(firebaseEstado01).once("value", snap=>{

const estado = snap.val();
if(!estado || !estado.jogadores) return;

let index = estado.turnoIndex || 0;
index = (index + 1) % estado.jogadores.length;

const proximo = estado.jogadores[index];

db.ref(firebaseEstado01).update({
desenhista: proximo,
turnoIndex: index,
emPartida: true
});

});

}

// ===============================
// ESTADO GLOBAL
// ===============================

function escutarEstado01(){

db.ref(firebaseEstado01).on("value", snap=>{

const estado = snap.val();
if(!estado) return;

desenhistaAtual01 = estado.desenhista;
palavraAtual01 = estado.palavra;

if(statusPartida01){

if(usuarioNome01 === desenhistaAtual01){
statusPartida01.textContent = "Você está desenhando";
}else{
statusPartida01.textContent = "Aguardando " + desenhistaAtual01;
}

}

if(desenhistaAtual01){
falarTexto("Agora é a vez de " + desenhistaAtual01);
}

if(usuarioNome01 === desenhistaAtual01){

areaEscolhaDesenho01.style.display = "block";

window.liberarDesenho && window.liberarDesenho();

falarTexto("Você é o desenhista. Escolha manual ou automático");

}else{

areaEscolhaDesenho01.style.display = "none";

window.bloquearDesenho && window.bloquearDesenho();

}

});

}

// ===============================
// DICAS
// ===============================

function iniciarDicas(dicas){

clearInterval(intervaloDica01);

etapaDica01 = 0;

intervaloDica01 = setInterval(()=>{

if(etapaDica01 >= dicas.length){
clearInterval(intervaloDica01);
return;
}

const texto = "Dica: " + dicas[etapaDica01];

falarTexto(texto);
escreverChat01("Sistema: " + texto);

etapaDica01++;

},10000);

}

// ===============================
// DESENHO AUTOMÁTICO
// ===============================

function escolherDesenhoAutomatico(){

if(usuarioNome01 !== desenhistaAtual01) return;

let disponiveis = bancoPalavras01.filter(p=>!palavrasUsadas01.includes(p.palavra));

if(disponiveis.length===0){
palavrasUsadas01=[];
disponiveis=bancoPalavras01;
}

const escolha = disponiveis[Math.floor(Math.random()*disponiveis.length)];

palavrasUsadas01.push(escolha.palavra);

definirPalavraFirebase01(escolha.palavra);

palavraAtualTexto01.textContent = "Desenhando...";

falarTexto("Modo automático selecionado");
falarTexto("Desenhe algo. " + escolha.dicas[0]);

iniciarDicas(escolha.dicas);

areaEscolhaDesenho01.style.display="none";

}

// ===============================
// DESENHO MANUAL
// ===============================

function escolherDesenhoManual(){

if(usuarioNome01 !== desenhistaAtual01) return;

const palavra = prompt("Digite a palavra para os outros adivinharem");

if(!palavra) return;

definirPalavraFirebase01(palavra);

palavraAtualTexto01.textContent = "Desenhando...";

falarTexto("Modo manual selecionado");

areaEscolhaDesenho01.style.display="none";

}

// ===============================
// RESPOSTA
// ===============================

function verificarResposta01(msg, nome){

if(!palavraAtual01) return;

if(msg.toLowerCase() === palavraAtual01.toLowerCase()){
acertouPalavra01(nome);
}

}

function acertouPalavra01(nome){

const texto = nome + " acertou";

falarTexto(texto);
atualizarPontuacao01(nome);

finalizarRodada01();

}

// ===============================
// TIMER
// ===============================

function iniciarTimer(){

clearInterval(timerIntervalo01);

timerAtual01 = 120;

timerIntervalo01 = setInterval(()=>{

timerAtual01--;

timerPartida01.textContent = "Tempo: " + timerAtual01;

if(timerAtual01<=0){
finalizarRodada01();
}

},1000);

}

// ===============================
// RODADA
// ===============================

function entrarPartida(){

if(!usuarioLogado01) return;

db.ref(firebaseEstado01).set({
desenhista: usuarioNome01,
turnoIndex: 0,
emPartida: true,
palavra: "",
jogadores: []
});

iniciarRodadaCompleta01();

}

function iniciarRodadaCompleta01(){

jogoEmAndamento01 = true;

escolherProximoDesenhista01();

if(window.limparQuadroSincronizado){
window.limparQuadroSincronizado();
}

iniciarTimer();

falarTexto("Rodada iniciada");

}

function finalizarRodada01(){

clearInterval(timerIntervalo01);

falarTexto("Fim da rodada");

setTimeout(()=>{
escolherProximoDesenhista01();
},2000);

}

// ===============================
// RANKING
// ===============================

function atualizarPontuacao01(nome){

if(!rankingUsuarios01[nome]){
rankingUsuarios01[nome]=0;
}

rankingUsuarios01[nome]++;

falarTexto(nome + " marcou ponto");

db.ref(firebaseRanking01).set(rankingUsuarios01);

}

function escutarRanking01(){

db.ref(firebaseRanking01).on("value", snap=>{

const data = snap.val();
if(!data) return;

rankingUsuarios01 = data;

renderizarRanking01();

});

}

function renderizarRanking01(){

listaRanking01.innerHTML="";

let maior=0;
let lider=null;

Object.keys(rankingUsuarios01).forEach(nome=>{

const pontos = rankingUsuarios01[nome];

if(pontos>maior){
maior=pontos;
lider=nome;
}

const li = document.createElement("li");
li.textContent = nome+" - "+pontos;

listaRanking01.appendChild(li);

});

if(lider && lider!==liderAtual01){
liderAtual01=lider;
falarTexto("Novo líder " + lider);
}

}

// ===============================
// SAIR
// ===============================

function sairPartida(){

if(!usuarioId01) return;

removerUsuarioFirebase01(usuarioId01);

usuarioLogado01=false;

displayUsuario01.textContent="Offline";
statusSistema01.textContent="Offline";

jogoEmAndamento01=false;

falarTexto("Você saiu da partida");

}

// ===============================
// RESET
// ===============================

function resetarJogoCompleto(){

if(typeof resetarFirebaseCompleto01 === "function"){
resetarFirebaseCompleto01();
}

jogoEmAndamento01=false;
palavraAtual01=null;

clearInterval(timerIntervalo01);

if(window.limparQuadroSincronizado){
window.limparQuadroSincronizado();
}

if(palavraAtualTexto01){
palavraAtualTexto01.textContent="Aguardando rodada";
}

if(timerPartida01){
timerPartida01.textContent="Tempo: 120";
}

falarTexto("Jogo resetado");

}

// ===============================
// EXPORT GLOBAL
// ===============================

window.realizarLogin = realizarLogin;
window.enviarChute = enviarChute;
window.entrarPartida = entrarPartida;
window.sairPartida = sairPartida;
window.resetarJogoCompleto = resetarJogoCompleto;
window.escolherDesenhoAutomatico = escolherDesenhoAutomatico;
window.escolherDesenhoManual = escolherDesenhoManual;

// ===============================
// LOG FINAL
// ===============================

console.log("JOGO.JS COMPLETO E FUNCIONAL");