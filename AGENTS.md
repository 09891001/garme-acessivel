# Garme Acessível — Referência de Arquitetura e Regras de Segurança

## OBJETIVO
Este documento preserva toda a lógica atual do jogo funcionando. Qualquer alteração futura DEVE respeitar estas regras para não quebrar nada.

---

## ARQUITETURA GERAL

### Scripts (ordem de carregamento no index.html)
1. `js/config.js` — Firebase init, storage, visibilitychange, .info/connected
2. `js/participantes.js` — ParticipantManager (IIFE), LobbyManager, renderLobby
3. `js/voz.js` — Narracao, announce, fila de acessibilidade
4. `js/palavras.js` — Banco de palavras
5. `js/palavras-extras.js` — Palavras extras
6. `js/desenho.js` — Canvas, desenho automatico
7. `js/jogo.js` — Game engine, listeners, iniciarPartida, renderJogo

### Firebase Structure
```
salas/{salaCodigo}/
  participantes/
    {uid}/ { nome, online, admin, entrouEm, lastSeen, sessionId }
  game/
    status, adminId, jogadores/{uid}/{nome}, filaOrdem, filaIndex,
    desenhistaId, desenhistaNome, palavra, palavraOpcoes, modoDesenho,
    rodada, totalRodadas, inicio, dicaIndex, dicaAtual, acertadores,
    pontosJogo/{uid}/{pontos}, atualizadoEm
  chat/
  ranking/
  desenho/
  fila/
  historico/
```

---

## REGRAS FUNDAMENTAIS (NUNCA ALTERAR)

### REGRA 1: Fonte Única
- `participantes/` é a ÚNICA fonte de verdade para: quem está na sala, quem está online, quem é admin
- `game/jogadores` é ESCrito APENAS pelo admin via `__syncGameJogadores()`
- NUNCA ler `game/jogadores` para decisões de lobby

### REGRA 2: Admin Determinístico
- Admin = jogador com MENOR `entrouEm` em `participantes/` (ServerValue.TIMESTAMP)
- NÃO usar array local, caches ou `game/adminId` para definir admin
- Cross-client: todos os clientes calculam o mesmo admin

### REGRA 3: Apenas Admin Escreve em game/jogadores
- `__syncGameJogadores()` é chamada SOMENTE pelo admin
- Clientes normais NUNCA escrevem em `game/jogadores`
- Exceção: `iniciarPartida()` e `iniciarRevanche()` (admin só)

### REGRA 4: Numeração Cosmética
- `window.__jogadorNumMap` = posição no sort por `entrouEm`
- NUNCA gravado no Firebase
- Usado apenas para exibição ("Jogador 1", "Jogador 2")

### REGRA 5: visibilitychange
- Apenas `.update({online: true, lastSeen})` quando aba fica visible
- NUNCA chamar `registrar()` em visibilitychange
- NUNCA usar `db.goOffline()` ou `db.goOnline()` — Firebase gerencia conexão

### REGRA 6: Registros Firebase
- `entrouEm` = `ServerValue.TIMESTAMP` (servidor), preservado no F5
- `online` = `true`/`false` via `.update()` ou `.onDisconnect()`
- Ghost cleanup: delay 2s, remove duplicatas com mesmo `nome` e `online:true`

### REGRA 7: Transições de Estado
- Estados válidos: `aguardando → ESCOLHENDO_PALAVRA → ESCOLHENDO_MODO → JOGANDO → FIM_RODADA → FIM_PARTIDA → aguardando`
- `aplicarEstadoVisao(ESTADO_GAME)` quando: `euNoJogo && !ehAguardando`
- `aplicarEstadoVisao(ESTADO_LOBBY)` quando: `!euNoJogo || ehAguardando`
- Bypass de visibilidade: força display no listener ANTES de `aplicarEstadoVisao`

### REGRA 8: Hash Check
- `__lastGameHash` compara estado atual com anterior
- Se hash idêntico E status não mudou → skip render
- Se status mudou → SEMPRE renderizar (ignora hash)
- `iniciarPartida()` limpa `__lastGameHash = ""` após update

---

## IDs DO HTML (NUNCA MUDAR SEM VERIFICAR)

| ID | Elemento | Visível quando |
|---|---|---|
| `lobby` | `<section>` wrapper | Sempre (contém telaEntrada e salaEspera) |
| `telaEntrada` | `<div>` card login | Antes de entrar |
| `salaEspera` | `<div>` lobby content | Após entrar, status=aguardando |
| `listaJogadores` | `<ul>` jogadores | Dentro de salaEspera |
| `statusSala` | `<p>` status texto | Dentro de salaEspera |
| `contadorOnline` | `<span>` num online | Header top bar |
| `btnIniciar` | `<button>` iniciar | Admin only, >=2 jogadores |
| `areaJogo` | `<section>` game | status != aguardando && euNoJogo |
| `statusPartida` | `<h2>` status game | Dentro de areaJogo |
| `cardVoce` | `<div>` info player | Durante jogo |
| `areaEscolhaPalavra` | `<div>` word choice | ESCOLHENDO_PALAVRA + desenhista |
| `areaEscolhaDesenho` | `<div>` mode choice | ESCOLHENDO_MODO + desenhista |
| `areaFimRodada` | `<div>` round end | FIM_RODADA |
| `containerChute` | `<div>` guess input | JOGANDO + não desenhista |

**NÃO EXISTE:** `#area-do-jogo`, `#game-area`, `#jogadoresSala`, `#onlineCount`, `#painelControleAdmin`

---

## FLUXO DE DADOS DO LOBBY

### Quem chama renderLobby
1. `participantes.js` listener Firebase → `renderLobby(participantes, adminId)` ✅ CORRETO
2. `LobbyManager.forcarRender()` → lê Firebase → `renderLobby(participantes, adminId)` ✅ CORRETO
3. `jogo.js:renderLobby(game)` → lê `window.__participantesOnline` cache ⚠️ FALLBACK

### Regra: SEMPRE usar LobbyManager.forcarRender()
- `aplicarEstadoVisao(ESTADO_LOBBY)` usa `LobbyManager.forcarRender()` (async, lê Firebase)
- NUNCA chamar `renderLobby(game)` de jogo.js diretamente — pode ter cache vazio
- O fallback `else { renderLobby(game); }` foi REMOVIDO intencionalmente

### Fluxo correto ao mostrar lobby:
```
game listener → aplicarEstadoVisao(ESTADO_LOBBY) → LobbyManager.forcarRender()
  → .once("value") no Firebase → renderLobby(participantes, adminId) → DOM atualizado
```

---

## FLUXO DE DADOS DO GAME

### game listener (escutarEstadoGlobal)
1. Recebe snap do Firebase
2. Valida status (inválido → força "aguardando")
3. Strip dados sensíveis para não-desenhista
4. Salva em `gameCache01`
5. Bypass de visibilidade (força display)
6. FIM_PARTIDA recovery
7. `validarConsistenciaJogo()`
8. Se `!euNoJogo || ehAguardando` → `aplicarEstadoVisao(ESTADO_LOBBY)`
9. Hash check → `aplicarEstadoVisao(ESTADO_GAME)`

### iniciarPartida (admin only)
1. Lê `participantes/` via `.once("value")`
2. Filtra `online === true && nome`
3. Valida `>= 2` jogadores
4. Admin = sort por `entrouEm` → `[0]`
5. Valida `trueAdmin === window.usuarioIdUnico`
6. Constrói `jogadoresIniciais` a partir de `participantes/`
7. Embaralha fila
8. Seleciona palavras
9. `gameRef.update(...)` atômico
10. `__lastGameHash = ""` (força re-render)

### __syncGameJogadores (admin only)
- Chamada pelo `participantes.js` listener quando `adminId === uid`
- Sincroniza `participantes/` → `game/jogadores`
- Adiciona jogadores faltantes, remove offline (quando aguardando)
- Usa `.transaction()` para evitar conflitos
- Guard: `__syncRunning` previne execuções paralelas

---

## GUARDIÕES DE SEGURANÇA

### resetarEstadoPartida()
- NÃO reseta se status é: JOGANDO, ESCOLHENDO_PALAVRA, ESCOLHENDO_MODO, FIM_RODADA
- Usa `.set()` (não `.transaction()`) para evitar conflitos com sync
- Guard: `__resetandoPartida` previne execuções paralelas

### executarResetSala()
- NÃO reseta se status é: JOGANDO, ESCOLHENDO_PALAVRA, ESCOLHENDO_MODO, FIM_RODADA
- Delay: 30s (não 15s)
- Verifica `participantes/online` antes de resetar
- Limpa: game/, chat/, desenho/, fila/, ranking/, historico/, participantes/

### validarConsistenciaJogo()
- Se `jogadores < 2` → força "aguardando"
- Se desenhista não está no jogo → força "FIM_RODADA"
- Chamada a cada atualização do game listener

### Desduplicação (Ghost Cleanup)
- Delay: 2s após `registrar()`
- Compara: `p.nome === nome && p.online === true` (UID diferente)
- Marca ghost como `online: false`
- NÃO remove o nó — apenas atualiza flag

---

## VARIÁVEIS GLOBAIS IMPORTANTES

| Variável | Arquivo | Descrição |
|---|---|---|
| `window.usuarioIdUnico` | config.js | UID único (localStorage) |
| `window.sessionId` | config.js | Sessão (sessionStorage) |
| `window.db` | config.js | Firebase Database instance |
| `window.salaCodigo01` | config.js | Código da sala |
| `window.gameCache01` | jogo.js | Cache do estado atual do game |
| `window.__lastGameHash` | jogo.js | Hash para evitar re-renders |
| `window.__participantesOnline` | participantes.js | Array de UIDs online |
| `window.__participantesMap` | participantes.js | Mapa uid→nome |
| `window.__jogadorNumMap` | participantes.js | Mapa uid→"Jogador N" |
| `window.__abaVisivel` | config.js | Se aba está visível |
| `window.LobbyManager` | participantes.js | Interface pública do lobby |
| `window.ParticipantManager` | participantes.js | Alias de LobbyManager |
| `window.__syncGameJogadores` | jogo.js | Sync participantes→game |

---

## O QUE NUNCA FAZER

1. **NUNCA** usar `db.goOffline()` ou `db.goOnline()` — Firebase gerencia sozinho
2. **NUNCA** chamar `registrar()` em visibilitychange — apenas `.update({online:true})`
3. **NUNCA** ler `game/jogadores` para decisões de lobby — usar `participantes/`
4. **NUNCA** chamar `renderLobby(game)` de jogo.js — usar `LobbyManager.forcarRender()`
5. **NUNCA** escrever `entrouEm` manualmente — usar `ServerValue.TIMESTAMP`
6. **NUNCA** usar `.transaction()` em `resetarEstadoPartida()` — usar `.set()`
7. **NUNCA** remover o hash check — ele previne re-renders desnecessários
8. **NUNCA** alterar IDs do HTML sem verificar todos os `getElementById`
9. **NUNCA** adicionar `else { renderLobby(game); }` em `aplicarEstadoVisao`
10. **NUNCA** gravar numeração de jogadores no Firebase — é cosmética

---

## LOGS DE DIAGNÓSTICO (ATIVOS)

| Log | Arquivo | Quando |
|---|---|---|
| `[FULL_ERROR]` | config.js | Erro global |
| `[VISIBILITY_DEBUG]` | config.js | Mudança de aba |
| `[PARTICIPANTES_FIREBASE]` | participantes.js | Listener dispara |
| `[PARTICIPANTES_DESCARTADO]` | participantes.js | UID filtrado |
| `[PARTICIPANTES_PROCESSADOS]` | participantes.js | Após filtro |
| `[GHOST_CHECK]` | participantes.js | Verificação de ghost |
| `[GHOST_CLEANUP]` | participantes.js | Ghost removido |
| `[GHOST_APPLY]` | participantes.js | Update aplicado |
| `[DEDUP_DEBUG]` | participantes.js | Antes/depois do filtro |
| `[LOBBY_RENDER_START]` | participantes.js | Início do render |
| `[LOBBY_DOM]` | participantes.js | IDs do DOM |
| `[LOBBY_RENDER_END]` | participantes.js | Fim do render |
| `[LOBBY_GAME_CALL]` | jogo.js | Versão errada chamada |
| `[DEBUG_TELA]` | jogo.js | Status detectado |
| `[GAME_STATE]` | jogo.js | Status recebido |
| `[VIEW_DEBUG]` | jogo.js | Troca de tela |
| `[START_CLICK]` | jogo.js | Clique em iniciar |
| `[START_ACTION]` | jogo.js | Antes do update |
| `[START_SUCCESS]` | jogo.js | Update completou |

---

## VERIFICAÇÃO PÓS-ALTERAÇÃO

Antes de commitar qualquer mudança, verificar:
1. `node --check js/config.js` — sem erros de sintaxe
2. `node --check js/participantes.js` — sem erros de sintaxe
3. `node --check js/jogo.js` — sem erros de sintaxe
4. `node --check js/voz.js` — sem erros de sintaxe
5. Todos os `getElementById` apontam para IDs que existem no HTML
6. Nenhuma variável global foi renomeada ou removida
7. Nenhum listener Firebase foi removido ou alterado
8. A ordem de carregamento dos scripts não foi alterada
