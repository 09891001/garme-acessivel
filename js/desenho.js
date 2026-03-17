/* =========================================================
   BIBLIOTECA DE DESENHOS COMPLETA (25 OBJETOS)
========================================================= */
var BIBLIOTECA_DESENHOS = {
    sol: {
        pontos: [[400,200],[420,180],[440,200],[420,220],[400,200],[400,160],[400,240],[360,200],[440,200],[380,180],[420,220],[420,180],[380,220]],
        etapas_texto: ["Iniciando o sol", "Desenhando o círculo e os raios", "Sol finalizado"]
    },
    lua: {
        pontos: [[420,180],[440,200],[430,230],[400,240],[380,220],[390,200],[420,180],[410,190],[420,210],[410,230]],
        etapas_texto: ["Iniciando a lua", "Desenhando a curvatura", "Lua finalizada"]
    },
    nuvem: {
        pontos: [[350,200],[370,180],[400,180],[430,180],[450,200],[440,220],[410,230],[380,220],[350,200]],
        etapas_texto: ["Iniciando a nuvem", "Desenhando o topo arredondado", "Nuvem finalizada"]
    },
    estrela: {
        pontos: [[400,170],[410,200],[440,200],[415,215],[425,245],[400,225],[375,245],[385,215],[360,200],[390,200],[400,170]],
        etapas_texto: ["Iniciando a estrela", "Traçando as pontas", "Estrela finalizada"]
    },
    arvore: {
        pontos: [[400,260],[400,220],[400,180],[370,200],[430,200],[360,180],[440,180],[400,220],[380,260],[420,260]],
        etapas_texto: ["Desenhando o tronco", "Adicionando os galhos", "Árvore finalizada"]
    },
    flor: {
        pontos: [[400,260],[400,220],[380,200],[400,180],[420,200],[400,220],[390,200],[410,200]],
        etapas_texto: ["Desenhando o caule", "Criando as pétalas", "Flor finalizada"]
    },
    casa: {
        pontos: [[350,260],[450,260],[450,180],[350,180],[350,260],[350,180],[400,140],[450,180],[380,260],[380,220],[420,220],[420,260]],
        etapas_texto: ["Base da casa", "Paredes e telhado", "Casa finalizada"]
    },
    mesa: {
        pontos: [[350,200],[450,200],[360,200],[360,260],[440,200],[440,260]],
        etapas_texto: ["Tampo da mesa", "Desenhando as pernas", "Mesa finalizada"]
    },
    cadeira: {
        pontos: [[380,220],[420,220],[380,220],[380,260],[420,220],[420,260],[380,220],[380,180],[420,180],[420,220]],
        etapas_texto: ["Assento da cadeira", "Pernas e encosto", "Cadeira finalizada"]
    },
    lampada: {
        pontos: [[400,180],[420,200],[400,220],[380,200],[400,180],[390,220],[410,220],[400,240]],
        etapas_texto: ["Bulbo da lâmpada", "Base rosqueável", "Lâmpada finalizada"]
    },
    chave: {
        pontos: [[350,200],[450,200],[420,200],[420,210],[440,210],[440,200],[400,200],[400,210]],
        etapas_texto: ["Haste da chave", "Dentes de abertura", "Chave finalizada"]
    },
    livro: {
        pontos: [[350,180],[450,180],[450,260],[350,260],[350,180],[400,180],[400,260]],
        etapas_texto: ["Capa do livro", "Divisão das páginas", "Livro finalizado"]
    },
    copo: {
        pontos: [[380,180],[420,180],[420,180],[410,260],[410,260],[390,260],[390,260],[380,180]],
        etapas_texto: ["Topo do copo", "Laterais", "Copo finalizado"]
    },
    computador: {
        pontos: [[350,180],[450,180],[450,240],[350,240],[350,180],[380,240],[420,240],[400,260]],
        etapas_texto: ["Tela do monitor", "Base de apoio", "Computador finalizado"]
    },
    telefone: {
        pontos: [[380,180],[420,180],[420,260],[380,260],[380,180],[390,200],[410,200]],
        etapas_texto: ["Corpo do telefone", "Detalhes frontais", "Telefone finalizado"]
    },
    carro: {
        pontos: [[350,260],[450,260],[450,260],[430,200],[370,200],[350,260],[370,260],[370,280],[430,260],[430,280]],
        etapas_texto: ["Base do carro", "Cabine superior", "Carro finalizado"]
    },
    aviao: {
        pontos: [[350,200],[450,200],[400,200],[400,160],[400,200],[400,240],[370,210],[430,210]],
        etapas_texto: ["Fuselagem central", "Asas laterais", "Avião finalizado"]
    },
    barco: {
        pontos: [[350,260],[450,260],[420,220],[380,220],[350,260],[400,220],[400,180]],
        etapas_texto: ["Casco do barco", "Mastro e vela", "Barco finalizado"]
    },
    bicicleta: {
        pontos: [[370,260],[370,280],[430,260],[430,280],[370,260],[400,220],[430,260]],
        etapas_texto: ["Rodas da bicicleta", "Quadro e guidão", "Bicicleta finalizada"]
    },
    coracao: {
        pontos: [[400,230],[420,200],[440,220],[400,270],[360,220],[380,200],[400,230]],
        etapas_texto: ["Curvas superiores", "Vértice inferior", "Coração finalizado"]
    },
    peixe: {
        pontos: [[350,200],[400,180],[450,200],[400,220],[350,200],[450,200],[470,180],[470,220],[450,200]],
        etapas_texto: ["Corpo do peixe", "Cauda e barbatanas", "Peixe finalizado"]
    },
    passaro: {
        pontos: [[350,200],[400,180],[450,200],[370,190],[400,200],[430,190]],
        etapas_texto: ["Asas em voo", "Corpo central", "Pássaro finalizado"]
    },
    cachorro: {
        pontos: [[350,240],[450,240],[450,240],[430,200],[370,200],[350,240],[370,240],[370,270],[430,240],[430,270]],
        etapas_texto: ["Corpo e dorso", "Cabeça e orelhas", "Cachorro finalizado"]
    },
    gato: {
        pontos: [[360,240],[440,240],[400,200],[380,180],[420,180],[400,200],[400,260]],
        etapas_texto: ["Cabeça do gato", "Orelhas pontudas", "Gato finalizado"]
    },
    pipa: {
        pontos: [[400,180],[440,220],[400,260],[360,220],[400,180],[400,260],[400,300]],
        etapas_texto: ["Losango da pipa", "Estrutura e linha", "Pipa finalizada"]
    }
};

/* =========================================================
   LÓGICA DE DESENHO E ACESSIBILIDADE
========================================================= */

let canvas, ctx;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('quadro');
    if (canvas) {
        ctx = canvas.getContext('2d');
        ctx.strokeStyle = "#004b81";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
    }
});

function comunicarAoNarrador(texto) {
    const narrador = document.getElementById('narrador');
    const feedback = document.getElementById('feedbackAcessivel');
    if (narrador) narrador.innerText = texto;
    if (feedback) feedback.innerText = texto;
}

function desenharPonto(x, y) {
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Telemetria em tempo real para o cego
    const posicao = getDescricaoEspacial(x, y);
    comunicarAoNarrador(posicao);
}

function limparQuadro() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    comunicarAoNarrador("Quadro limpo.");
}

function getDescricaoEspacial(x, y) {
    var coluna = x < 266 ? "Esquerda" : (x < 533 ? "Centro" : "Direita");
    var linha = y < 166 ? "Superior" : (y < 333 ? "Centro" : "Inferior");
    return "Pincel em: " + linha + " " + coluna;
}

function desenharObjetoAutomatico(idObjeto) {
    const desenho = BIBLIOTECA_DESENHOS[idObjeto];
    if (!desenho) return;

    limparQuadro();
    let i = 0;
    
    const intervalo = setInterval(() => {
        const p = desenho.pontos[i];
        if (i === 0) ctx.moveTo(p[0], p[1]);
        
        desenharPonto(p[0], p[1]);
        
        // Narra o progresso baseado na etapa (Início, Meio, Fim)
        const percentual = (i / desenho.pontos.length) * 100;
        narrarProgresso(desenho.etapas_texto, percentual);

        i++;
        if (i >= desenho.pontos.length) clearInterval(intervalo);
    }, 400); // Velocidade lenta para que o cego consiga acompanhar a narração
}

function narrarProgresso(etapas, percentual) {
    if (percentual <= 10) comunicarAoNarrador(etapas[0]);
    else if (percentual > 85) comunicarAoNarrador(etapas[2]);
    else if (percentual % 30 === 0) comunicarAoNarrador(etapas[1]); 
}