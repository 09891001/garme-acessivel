// ================================
// CONFIG FIREBASE GARME ACESSIVEL
// ================================

var firebaseConfig = {
apiKey: "AIzaSyBxav0baX6bucdYUlw1pRWOFcv9AwtqymY",
authDomain: "garme-acessivel.firebaseapp.com",
databaseURL: "https://garme-acessivel-default-rtdb.firebaseio.com/",
projectId: "garme-acessivel",
storageBucket: "garme-acessivel.firebasestorage.app",
messagingSenderId: "69205141908",
appId: "1:69205141908:web:d3ce0b770f699c1a8ac781"
};

// ================================
// INICIALIZAÇÃO FIREBASE
// ================================

if (!firebase.apps.length) {
firebase.initializeApp(firebaseConfig);
}

window.db = firebase.database();

// ================================
// CAMINHOS DO BANCO
// ================================

const firebaseRoot01 = "garmeAcessivel01";

const firebaseUsuarios01 = firebaseRoot01 + "/usuarios01";
const firebaseChat01 = firebaseRoot01 + "/chat01";
const firebaseDesenho01 = firebaseRoot01 + "/desenho01";
const firebaseEstado01 = firebaseRoot01 + "/estado01";
const firebaseRanking01 = firebaseRoot01 + "/ranking01";
const firebaseTimer01 = firebaseRoot01 + "/timer01";
const firebaseRodada01 = firebaseRoot01 + "/rodada01";
const firebaseReset01 = firebaseRoot01 + "/reset01";
const firebaseControle01 = firebaseRoot01 + "/controle01";

// ================================
// RESET FIREBASE COMPLETO
// ================================

function limparFirebaseCompleto01() {
return window.db.ref(firebaseRoot01).remove();
}

// ================================
// RESET ESTADO
// ================================

function resetarEstadoFirebase01() {

window.db.ref(firebaseEstado01).set({
status: "aguardando",
desenhista: "",
palavra: "",
rodada: 0,
emPartida: false
});

}

// ================================
// RESET CHAT
// ================================

function resetarChatFirebase01() {
window.db.ref(firebaseChat01).remove();
}

// ================================
// RESET DESENHO
// ================================

function resetarDesenhoFirebase01() {
window.db.ref(firebaseDesenho01).remove();
}

// ================================
// RESET RANKING
// ================================

function resetarRankingFirebase01() {
window.db.ref(firebaseRanking01).remove();
}

// ================================
// RESET TIMER
// ================================

function resetarTimerFirebase01() {

window.db.ref(firebaseTimer01).set({
tempo: 120,
ativo: false
});

}

// ================================
// RESET RODADA
// ================================

function resetarRodadaFirebase01() {

window.db.ref(firebaseRodada01).set({
numero: 0
});

}

// ================================
// RESET CONTROLE
// ================================

function resetarControleFirebase01() {

window.db.ref(firebaseControle01).set({
ativo: false
});

}

// ================================
// RESET COMPLETO
// ================================

function resetarFirebaseCompleto01() {

resetarEstadoFirebase01();
resetarChatFirebase01();
resetarDesenhoFirebase01();
resetarRankingFirebase01();
resetarTimerFirebase01();
resetarRodadaFirebase01();
resetarControleFirebase01();

}

// ================================
// USUARIOS
// ================================

function registrarUsuarioFirebase01(id, nome) {

window.db.ref(firebaseUsuarios01 + "/" + id).set({
nome: nome,
pontuacao: 0,
online: true
});

}

function removerUsuarioFirebase01(id) {

window.db.ref(firebaseUsuarios01 + "/" + id).remove();

}

function atualizarPontuacaoFirebase01(id, pontos) {

window.db.ref(firebaseUsuarios01 + "/" + id + "/pontuacao").set(pontos);

}

// ================================
// CHAT
// ================================

function enviarMensagemChatFirebase01(nome, mensagem) {

window.db.ref(firebaseChat01).push({
nome: nome,
mensagem: mensagem,
timestamp: Date.now()
});

}

// ================================
// DESENHO
// ================================

function enviarDesenhoFirebase01(dados) {

window.db.ref(firebaseDesenho01).push(dados);

}

function limparDesenhoFirebase01() {

window.db.ref(firebaseDesenho01).remove();

}

// ================================
// ESTADO JOGO
// ================================

function definirDesenhistaFirebase01(nome) {

window.db.ref(firebaseEstado01 + "/desenhista").set(nome);

}

function definirPalavraFirebase01(palavra) {

window.db.ref(firebaseEstado01 + "/palavra").set(palavra);

}

// ================================
// TIMER
// ================================

function iniciarTimerFirebase01() {

window.db.ref(firebaseTimer01).set({
tempo: 120,
ativo: true
});

}

function pararTimerFirebase01() {

window.db.ref(firebaseTimer01).update({
ativo: false
});

}

function atualizarTempoFirebase01(tempo) {

window.db.ref(firebaseTimer01).update({
tempo: tempo
});

}

// ================================
// RODADA
// ================================

function proximaRodadaFirebase01(numero) {

window.db.ref(firebaseRodada01).set({
numero: numero
});

}

// ================================
// RESET GLOBAL
// ================================

function ativarResetFirebase01() {

window.db.ref(firebaseReset01).set({
executar: true,
timestamp: Date.now()
});

}

function escutarResetFirebase01(callback) {

window.db.ref(firebaseReset01).on("value", function(snapshot){

var data = snapshot.val();

if(data && data.executar){

callback();

}

});

}

// ================================
// SAIDA USUARIO
// ================================

window.addEventListener("beforeunload", function(){

if(window.usuarioId01){

removerUsuarioFirebase01(window.usuarioId01);

}

});

// ================================
// STATUS CONEXÃO
// ================================

window.db.ref(".info/connected").on("value", function(snapshot){

if(snapshot.val() === true){

console.log("Firebase conectado");

}else{

console.log("Firebase desconectado");

}

});
