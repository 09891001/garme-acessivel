/* global db, firebase */
// ==========================================
// GARME - ENGINE COMPLETA DO JOGO
// modo B - desenhista fixo
// ==========================================

// ===============================
// 1 VARIÁVEIS GLOBAIS
// ===============================

const nomeUsuario = localStorage.getItem("usuario_garme") || "Jogador Anônimo";

const chatRef = db.ref("chat");
const statusRef = db.ref("status_partida");
const desenhoRef = db.ref("desenho");
const pontosRef = db.ref("pontos_globais");
const jogadoresRef = db.ref("jogadores");

let jogadorRegistrado = false;
let intervaloCronometro = null;
let mensagensRenderizadas = new Set();

const TEMPO_RODADA = 60;

// ===============================
// 2 LISTA DE PALAVRAS / DESENHOS
// ===============================

const listaPalavras = [

"casa",
"cachorro",
"carro",
"árvore",
"sol",
"gato",
"flor",
"avião",
"barco",
"livro",
"bola",
"pizza",
"cadeira",
"mesa",
"telefone",
"computador",
"óculos",
"chave",
"relógio",
"coração",
"estrela",
"lua",
"montanha",
"chuva",
"bicicleta"

];

// ===============================
// 3 INICIALIZAÇÃO
// ===============================

document.addEventListener("DOMContentLoaded", function(){

registrarJogador();

escutarChat();

escutarStatus();

escutarTempo();

escutarPlacar();

});

// ===============================
// 4 REGISTRO DE JOGADOR
// ===============================

function registrarJogador(){

if(jogadorRegistrado) return;

jogadoresRef.child(nomeUsuario).set(true);

chatRef.push({

nome:"SISTEMA",
mensagem:`🚀 ${nomeUsuario} entrou no jogo!`,
timestamp:Date.now()

});

jogadorRegistrado = true;

verificarDesenhista();

}

// ===============================
// 5 DEFINIR DESENHISTA
// ===============================

function verificarDesenhista(){

statusRef.once("value", function(snapshot){

const status = snapshot.val();

if(!status || !status.desenhista){

statusRef.set({

desenhista:nomeUsuario,
palavra_atual:"",
em_andamento:false,
tempo_restante:0

});

chatRef.push({

nome:"SISTEMA",
mensagem:`🎨 ${nomeUsuario} será o desenhista.`,
timestamp:Date.now()

});

mostrarEscolhaDesenho();

}

});

}

// ===============================
// 6 MENU DE ESCOLHA DO DESENHO
// ===============================

function mostrarEscolhaDesenho(){

const area = document.getElementById("box-mensagens");

if(!area) return;

const div = document.createElement("div");

div.style.padding="10px";
div.style.background="#eef7ff";
div.style.marginBottom="10px";

div.innerHTML="Escolha uma palavra para desenhar:";

listaPalavras.forEach(function(palavra){

const btn=document.createElement("button");

btn.innerText=palavra;

btn.style.margin="4px";

btn.onclick=function(){

engineIniciarRodada(palavra);

div.remove();

};

div.appendChild(btn);

});

const manual=document.createElement("button");

manual.innerText="Desenhar manualmente";

manual.style.display="block";
manual.style.marginTop="10px";

manual.onclick=function(){

const palavra=prompt("Digite a palavra que será desenhada");

if(palavra){

engineIniciarRodada(palavra);

div.remove();

}

};

div.appendChild(manual);

area.appendChild(div);

}

// ===============================
// 7 INICIAR RODADA
// ===============================

function engineIniciarRodada(palavra){

chatRef.remove();

desenhoRef.remove();

statusRef.update({

palavra_atual:palavra,
em_andamento:true,
tempo_restante:TEMPO_RODADA

});

chatRef.push({

nome:"SISTEMA",
mensagem:`🎨 ${nomeUsuario} começou a desenhar!`,
timestamp:Date.now()

});

}

// ===============================
// 8 ESCUTAR CHAT
// ===============================

function escutarChat(){

chatRef.on("child_added", function(snapshot){

const data = snapshot.val();

const id = snapshot.key;

const box = document.getElementById("box-mensagens");

if(!box) return;

if(mensagensRenderizadas.has(id)) return;

const div=document.createElement("div");

div.style.padding="4px";

if(data.nome==="SISTEMA"){

div.style.fontWeight="bold";

div.style.color="#004b81";

}

div.innerText=`${data.nome}: ${data.mensagem}`;

box.appendChild(div);

box.scrollTop=box.scrollHeight;

mensagensRenderizadas.add(id);

});

}

// ===============================
// 9 ENVIAR PALPITE
// ===============================

function enviarPalpite(){

const campo=document.getElementById("campo-palpite");

if(!campo) return;

const texto=campo.value.trim();

if(texto==="") return;

chatRef.push({

nome:nomeUsuario,
mensagem:texto,
timestamp:Date.now()

});

validarPalpite(texto);

campo.value="";

}

// ===============================
// 10 VALIDAR PALPITE
// ===============================

function validarPalpite(palpite){

statusRef.once("value", function(snapshot){

const status=snapshot.val();

if(!status) return;

if(!status.em_andamento) return;

if(status.desenhista===nomeUsuario) return;

const normalPalpite=normalizarTexto(palpite);

const normalCorreta=normalizarTexto(status.palavra_atual);

if(normalPalpite===normalCorreta){

acertouPalavra();

}

});

}

// ===============================
// 11 NORMALIZAR TEXTO
// ===============================

function normalizarTexto(txt){

return txt
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"");

}

// ===============================
// 12 ACERTO DA PALAVRA
// ===============================

function acertouPalavra(){

pontosRef.transaction(function(v){

return (v||0)+10;

});

chatRef.push({

nome:"SISTEMA",
mensagem:`🌟 ${nomeUsuario} acertou a palavra!`,
timestamp:Date.now()

});

setTimeout(function(){

finalizarRodada("Palavra adivinhada");

},2000);

}

// ===============================
// 13 CRONÔMETRO
// ===============================

function escutarTempo(){

statusRef.child("tempo_restante").on("value", function(snapshot){

const tempo=snapshot.val();

const tag=document.getElementById("cronometro-tag");

if(tag && tempo!==null){

let min=Math.floor(tempo/60);

let seg=tempo%60;

tag.innerText=`${min.toString().padStart(2,"0")}:${seg.toString().padStart(2,"0")}`;

}

});

}

// ===============================
// 14 MOTOR DO TEMPO
// ===============================

function escutarStatus(){

statusRef.on("value", function(snapshot){

const status=snapshot.val();

if(!status) return;

if(status.desenhista===nomeUsuario && status.em_andamento){

if(!intervaloCronometro){

intervaloCronometro=setInterval(function(){

statusRef.child("tempo_restante").transaction(function(t){

if(t<=0){

clearInterval(intervaloCronometro);

intervaloCronometro=null;

finalizarRodada("Tempo acabou");

return 0;

}

return t-1;

});

},1000);

}

}else{

if(intervaloCronometro){

clearInterval(intervaloCronometro);

intervaloCronometro=null;

}

}

});

}

// ===============================
// 15 FINALIZAR RODADA
// ===============================

function finalizarRodada(motivo){

statusRef.once("value", function(snapshot){

const status=snapshot.val();

if(!status) return;

chatRef.push({

nome:"SISTEMA",
mensagem:`🛑 Fim da rodada: ${motivo}`,
timestamp:Date.now()

});

chatRef.push({

nome:"SISTEMA",
mensagem:`📢 A palavra era: ${status.palavra_atual}`,
timestamp:Date.now()

});

statusRef.update({

em_andamento:false,
palavra_atual:"",
tempo_restante:0

});

if(typeof limparQuadro==="function"){

limparQuadro();

}

setTimeout(function(){

if(status.desenhista===nomeUsuario){

mostrarEscolhaDesenho();

}

},3000);

});

}

// ===============================
// 16 PLACAR
// ===============================

function escutarPlacar(){

pontosRef.on("value", function(snapshot){

const total=snapshot.val()||0;

const el=document.getElementById("pontos");

if(el){

el.innerText=total;

}

});

}