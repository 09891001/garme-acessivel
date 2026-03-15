const canvas = document.getElementById('quadro');
const ctx = canvas.getContext('2d');
const desenhoRef = firebase.database().ref('desenho');

// Configurações iniciais do pincel
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.strokeStyle = '#000000';

let desenhando = false;
let podeDesenhar = false;

// Ajusta o tamanho do canvas para o tamanho visível (importante para mobile)
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// --- 1. VERIFICAÇÃO DE PERMISSÃO ---
// Só permite desenhar se o status for 'jogando' e você for o desenhista
function checarPermissao() {
    dbRef.once('value', (snapshot) => {
        const dados = snapshot.val();
        podeDesenhar = (dados && dados.status === 'jogando' && dados.desenhista === meuNomeLogado);
    });
}

// --- 2. DESENHO MANUAL (MOUSE E TOUCH) ---
function iniciarDesenho(e) {
    checarPermissao();
    if (!podeDesenhar) return;
    desenhando = true;
    desenhar(e);
}

function pararDesenho() {
    desenhando = false;
    ctx.beginPath();
}

function desenhar(e) {
    if (!desenhando || !podeDesenhar) return;

    // Pega as coordenadas corretas (mouse ou touch)
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    // Desenha localmente
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Envia para o Firebase para os outros verem em tempo real
    desenhoRef.push({ x, y, movendo: true });
}

// Eventos de Mouse
canvas.addEventListener('mousedown', iniciarDesenho);
canvas.addEventListener('mouseup', pararDesenho);
canvas.addEventListener('mousemove', desenhar);

// Eventos de Touch (Celular)
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); iniciarDesenho(e); });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); pararDesenho(); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); desenhar(e); });

// --- 3. SINCRONIZAÇÃO (PARA QUEM ESTÁ ASSISTINDO) ---
desenhoRef.on('child_added', (snapshot) => {
    const ponto = snapshot.val();
    if (ponto.movendo) {
        ctx.lineTo(ponto.x, ponto.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ponto.x, ponto.y);
    } else {
        ctx.beginPath();
    }
});

// Limpa o quadro quando o banco for resetado
desenhoRef.on('child_removed', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
});

// --- 4. DESENHO AUTOMÁTICO (CARDS) ---
// Se o usuário clicar em um card azul, esta função faz o desenho sozinho
function desenharAutomatico(tipo) {
    if (!podeDesenhar) return;
    
    const desenhos = {
        'casa': [{x:50,y:150}, {x:150,y:50}, {x:250,y:150}, {x:50,y:150}, {x:50,y:250}, {x:250,y:250}, {x:250,y:150}],
        'bola': [{x:150,y:100}, {x:200,y:150}, {x:150,y:200}, {x:100,y:150}, {x:150,y:100}],
        'sol': [{x:150,y:150}, {x:150,y:80}, {x:150,y:150}, {x:220,y:150}, {x:150,y:150}, {x:150,y:220}, {x:150,y:150}, {x:80,y:150}]
    };

    const pontos = desenhos[tipo] || [];
    let i = 0;

    const intervalo = setInterval(() => {
        if (i >= pontos.length) {
            clearInterval(intervalo);
            return;
        }
        const p = pontos[i];
        desenhoRef.push({ x: p.x, y: p.y, movendo: true });
        i++;
    }, 100); // Desenha um ponto a cada 100ms
}