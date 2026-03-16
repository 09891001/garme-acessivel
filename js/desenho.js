// ==========================================
// DESENHO.JS - Controle do Quadro de Pintura
// ==========================================

const canvas = document.getElementById("quadro");
const ctx = canvas.getContext("2d");
const dRef = firebase.database().ref("desenho");

// Configurações do traço
ctx.lineWidth = 4;
ctx.lineCap = "round";
ctx.strokeStyle = "#000000";

let desenhando = false;

// --- SINCRONIZAÇÃO EM TEMPO REAL ---
// Escuta novos pontos enviados ao Firebase
dRef.on("child_added", (snapshot) => {
    const ponto = snapshot.val();
    
    if (ponto.movendo) {
        ctx.lineTo(ponto.x, ponto.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ponto.x, ponto.y);
    } else {
        ctx.beginPath(); // Novo traço iniciado
    }
});

// Limpa o quadro quando a rodada é reiniciada
dRef.on("child_removed", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
});

// --- DESENHO MANUAL (MOUSE E TOUCH) ---
function pegarCoordenadas(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function iniciarDesenho(e) {
    desenhando = true;
    const coords = pegarCoordenadas(e);
    dRef.push({ x: coords.x, y: coords.y, movendo: false });
}

function desenhar(e) {
    if (!desenhando) return;
    const coords = pegarCoordenadas(e);
    dRef.push({ x: coords.x, y: coords.y, movendo: true });
}

function pararDesenho() {
    desenhando = false;
    dRef.push({ movendo: false });
}

// Eventos de Mouse
canvas.addEventListener("mousedown", iniciarDesenho);
canvas.addEventListener("mousemove", desenhar);
canvas.addEventListener("mouseup", pararDesenho);
canvas.addEventListener("mouseleave", pararDesenho);

// Eventos de Touch (Mobile)
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); iniciarDesenho(e); });
canvas.addEventListener("touchmove", (e) => { e.preventDefault(); desenhar(e); });
canvas.addEventListener("touchend", pararDesenho);

// --- MODELOS DE DESENHO AUTOMÁTICO (CARDS) ---
function escolherDesenhoPronto(tipo) {
    // Limpa o quadro atual antes de começar o modelo
    dRef.remove();

    let pontos = [];

    if (tipo === 'casa') {
        pontos = [{x:100,y:300},{x:100,y:150},{x:200,y:50},{x:300,y:150},{x:300,y:300},{x:100,y:300}];
    } else if (tipo === 'bola') {
        for(let i=0; i<=Math.PI*2; i+=0.4) {
            pontos.push({x: 200 + Math.cos(i)*80, y: 200 + Math.sin(i)*80});
        }
    } else if (tipo === 'sol') {
        pontos = [{x:200,y:200},{x:200,y:100},{x:200,y:200},{x:300,y:200},{x:200,y:200},{x:200,y:300},{x:200,y:200},{x:100,y:200}];
    } else if (tipo === 'mesa') {
        pontos = [{x:100,y:200},{x:300,y:200},{x:300,y:220},{x:100,y:220},{x:100,y:200},{x:120,y:220},{x:120,y:300},{x:280,y:220},{x:280,y:300}];
    } else if (tipo === 'carro') {
        pontos = [{x:100,y:250},{x:350,y:250},{x:350,y:200},{x:300,y:150},{x:150,y:150},{x:100,y:200},{x:100,y:250}];
    } else if (tipo === 'coracao') {
        pontos = [{x:200,y:150},{x:250,y:100},{x:300,y:150},{x:200,y:300},{x:100,y:150},{x:150,y:100},{x:200,y:150}];
    }

    // Envia os pontos com intervalo para criar o efeito de animação
    let index = 0;
    const animacao = setInterval(() => {
        if (index >= pontos.length) {
            clearInterval(animacao);
            return;
        }
        // O primeiro ponto do modelo vai como 'movendo: false' para iniciar o traço
        dRef.push({ 
            x: pontos[index].x, 
            y: pontos[index].y, 
            movendo: index !== 0 
        });
        index++;
    }, 100);
}