// Firebase
const db = firebase.database();

const salaRef = db.ref("sala_v1");
const jogadoresRef = db.ref("jogadores");
const chatRef = db.ref("chat");
const desenhoRef = db.ref("desenho");

// DOM
const placar = document.getElementById("placar");
const avisos = document.getElementById("avisos");
const listaMensagens = document.getElementById("lista-mensagens");
const inputPalpite = document.getElementById("palpite");
const btnEnviar = document.getElementById("btn-enviar");

// Nome do jogador
const meuNome = localStorage.getItem("nomeJogador") || "Jogador";

// registrar jogador
jogadoresRef.child(meuNome).set({
    nome: meuNome,
    pontos: 0
});

// iniciar jogo
function iniciarRodadaOficial() {

    jogadoresRef.once("value", snap => {

        const jogadores = snap.val();
        const lista = Object.keys(jogadores);

        if (lista.length < 2) {
            alert("mínimo 2 jogadores");
            return;
        }

        salaRef.set({
            status: "escolhendo",
            indiceDesenhista: 0,
            rodada: 1,
            tempo: 0,
            palavraAtual: "",
            dica: "Aguardando palavra"
        });

        chatRef.push({
            nome: "SISTEMA",
            mensagem: "Jogo iniciado"
        });

        escolherProximoDesenhista();

    });

}

// escolher desenhista
function escolherProximoDesenhista() {

    jogadoresRef.once("value", snap => {

        const jogadores = snap.val();
        const lista = Object.keys(jogadores);

        salaRef.once("value", sala => {

            let dados = sala.val();

            let indice = dados.indiceDesenhista;

            if (indice >= lista.length) {

                indice = 0;
                dados.rodada++;

                if (dados.rodada > 3) {

                    finalizarJogo();
                    return;

                }

            }

            const desenhista = lista[indice];

            salaRef.update({
                desenhista: desenhista,
                status: "escolhendo",
                indiceDesenhista: indice + 1,
                dica: "Desenhista escolhendo palavra"
            });

            chatRef.push({
                nome: "SISTEMA",
                mensagem: `${desenhista} está desenhando`
            });

        });

    });

}

// definir palavra
function definirPalavraManual() {

    const palavra = document
        .getElementById("palavra-manual")
        .value
        .toLowerCase()
        .trim();

    if (!palavra) return;

    iniciarDesenho(palavra);

}

// iniciar desenho
function iniciarDesenho(palavra) {

    const dica = palavra[0] + " " + "_ ".repeat(palavra.length - 1);

    salaRef.update({
        status: "jogando",
        palavraAtual: palavra,
        dica: dica,
        tempo: 90
    });

    desenhoRef.remove();

}

// enviar palpite
function enviarPalpite() {

    const texto = inputPalpite.value.toLowerCase().trim();

    if (!texto) return;

    salaRef.once("value", snap => {

        const dados = snap.val();

        if (dados.status !== "jogando") return;

        if (dados.desenhista === meuNome) return;

        if (texto === dados.palavraAtual) {

            jogadoresRef.child(meuNome).once("value", p => {

                const pontos = p.val().pontos;

                jogadoresRef.child(meuNome).update({
                    pontos: pontos + 100
                });

            });

            finalizarRodada(`${meuNome} acertou`);

        } else {

            chatRef.push({
                nome: meuNome,
                mensagem: texto
            });

        }

    });

    inputPalpite.value = "";

}

// finalizar rodada
function finalizarRodada(msg) {

    salaRef.update({
        status: "encerrado",
        tempo: 0,
        dica: msg
    });

    setTimeout(() => {

        escolherProximoDesenhista();

    }, 4000);

}

// finalizar jogo
function finalizarJogo() {

    chatRef.push({
        nome: "SISTEMA",
        mensagem: "Fim do jogo"
    });

    salaRef.update({
        status: "finalizado",
        dica: "Jogo terminou"
    });

}

// timer
setInterval(() => {

    salaRef.once("value", snap => {

        const dados = snap.val();

        if (!dados) return;

        if (dados.status === "jogando" && dados.desenhista === meuNome) {

            if (dados.tempo > 0) {

                salaRef.update({
                    tempo: dados.tempo - 1
                });

            } else {

                finalizarRodada("Tempo esgotado");

            }

        }

    });

}, 1000);

// atualizar tela
salaRef.on("value", snap => {

    const dados = snap.val();

    if (!dados) return;

    placar.innerText =
        "Rodada: " + dados.rodada +
        " | Tempo: " + dados.tempo +
        " | Desenhista: " + dados.desenhista;

    avisos.innerText = dados.dica;

});

// chat
chatRef.limitToLast(20).on("child_added", snap => {

    const msg = snap.val();

    const div = document.createElement("div");

    div.innerHTML =
        "<strong>" + msg.nome + ":</strong> " + msg.mensagem;

    listaMensagens.appendChild(div);

    listaMensagens.scrollTop =
        listaMensagens.scrollHeight;

});

// enter
inputPalpite.addEventListener("keypress", e => {

    if (e.key === "Enter") enviarPalpite();

});

btnEnviar.onclick = enviarPalpite;