// Lógica Principal do Jogo - Garme Acessível
// Desenvolvido para o Time ATS - TOTVS

// 1. Variáveis Globais e Referências
const nomeUsuario = localStorage.getItem("usuario_garme") || "Jogador Anônimo";
const chatRef = db.ref("chat");
const pontosRef = db.ref("pontos_globais");
const mensagensExibidasNoJogo = new Set();

// 2. Sincronização do Placar em Tempo Real
pontosRef.on("value", (snapshot) => {
    const totalPontos = snapshot.val() || 0;
    const elementoPontos = document.getElementById("pontos");
    if (elementoPontos) {
        elementoPontos.innerText = totalPontos;
    }
});

// 3. Lógica do Chat (Receber Mensagens)
chatRef.limitToLast(15).on("child_added", (snapshot) => {
    const data = snapshot.val();
    const janelaChat = document.getElementById("janela-chat");
    
    if (!janelaChat) return;

    // Identificador único para evitar duplicados na tela
    const idMsg = `${data.nome}_${data.mensagem}_${data.timestamp}`;

    if (!mensagensExibidasNoJogo.has(idMsg)) {
        const div = document.createElement("div");
        div.style.marginBottom = "5px";
        div.style.padding = "3px";
        div.style.borderBottom = "1px solid #eee";
        
        // Destaque para mensagens do Sistema
        if (data.nome === "SISTEMA") {
            div.style.color = "#00509d";
            div.style.fontWeight = "bold";
            div.style.fontSize = "0.85rem";
        }

        div.innerHTML = `<strong>${data.nome}:</strong> ${data.mensagem}`;
        janelaChat.appendChild(div);
        
        // Rola o chat para o final automaticamente
        janelaChat.scrollTop = janelaChat.scrollHeight;
        
        mensagensExibidasNoJogo.add(idMsg);
    }
});

// 4. Função para Enviar Palpite
function enviarPalpite() {
    const input = document.getElementById("input-palpite");
    const mensagem = input.value.trim();

    if (mensagem !== "") {
        // Envia para o Firebase
        chatRef.push({
            nome: nomeUsuario,
            mensagem: mensagem,
            timestamp: Date.now()
        });

        // Lógica simples de acerto (Exemplo: se a palavra for 'caneca')
        // Você pode integrar isso com o nó 'desenho_atual/nome' do seu banco
        db.ref("desenho_atual/nome").once("value", (snapshot) => {
            const palavraCerta = snapshot.val();
            if (palavraCerta && mensagem.toLowerCase() === palavraCerta.toLowerCase()) {
                ganharPonto();
            }
        });

        input.value = "";
        input.focus();
    }
}

// 5. Função para Computar Pontos
function ganharPonto() {
    pontosRef.transaction((valorAtual) => {
        return (valorAtual || 0) + 10;
    });

    chatRef.push({
        nome: "SISTEMA",
        mensagem: `🌟 ${nomeUsuario} ACERTOU a palavra e ganhou 10 pontos!`,
        timestamp: Date.now()
    });
}

// 6. Configuração de Atalhos (Tecla Enter)
document.addEventListener("DOMContentLoaded", () => {
    const inputPalpite = document.getElementById("input-palpite");
    if (inputPalpite) {
        inputPalpite.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                enviarPalpite();
            }
        });
    }
    
    console.log("🎮 Jogo iniciado como: " + nomeUsuario);
});