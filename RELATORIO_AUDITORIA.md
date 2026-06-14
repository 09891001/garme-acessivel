# Relatório Consolidado de Auditoria — Fase 3.5

## Resumo

8 fases auditadas (A-H). **0 novos bugs introduzidos.** **0 bugs críticos abertos** (C1+C2 corrigidos). **3 bugs HIGH corrigidos** (agendarResetSala, timeout sem admin, P6 set). **10 bugs corrigidos** no total. **1 risco arquitetural** (dois listeners — mantido, não unificar).

---

## Bugs Críticos (P0) — CORRIGIDOS

### C1. XSS via innerHTML em renderLobby ✅
- **Local**: `jogo.js:312-320`
- **Problema**: `li.innerHTML = (j.nome || "?") + ' <span>ADMIN</span>';`
- **Fix**: `textContent` + `createElement('span')` + `appendChild`
- **Risco de regressão**: Nulo. Nenhum código lê innerHTML como getter.

### C2. innerHTML em canvasOverlay ✅
- **Local**: `jogo.js:919-922`
- **Problema**: `elOverlay.innerHTML = "<span>" + game.desenhistaNome + " está desenhando...</span>";`
- **Fix**: `createElement('span')` + `textContent` + `appendChild`

---

## Bugs Corrigidos (Fase 3.5 — HIGH)

### H1. agendarResetSala destrutivo ✅
- **Local**: `jogo.js:493-534`
- **Problema**: `set()` não-transacional sobrescrevia todo o game node, podendo apagar jogador entrando simultaneamente.
- **Fix**: `transaction` verifica se `jogadores` está vazio antes de resetar. Se alguém entrou entre a verificação e a escrita, a transação aborta e retenta.
- **Risco de regressão**: Baixo. Transaction mantém estado existente se não vazio.

### H2. Timeout sem admin ✅
- **Local**: `jogo.js:1527-1539`
- **Problema**: Watchdog de timeout (120s) só rodava no admin. Se admin saísse, partida travava.
- **Fix**: Timeout movido para ANTES do guard admin-only. Todos os clientes agora forçam timeout via transaction com guard de status.
- **Risco de regressão**: Mínimo. Múltiplos clientes tentam transaction, mas guard `g.status !== "JOGANDO"` + compare-and-swap do Firebase permitem apenas um commit.

### H3. P6 set → transaction ✅
- **Local**: `jogo.js:747-759`
- **Problema**: `set()` em child path podia perder jogador se `iniciarPartida` transaction ocorresse simultaneamente.
- **Fix**: `transaction` no game node inteiro, adiciona jogador atomicamente.
- **Risco de regressão**: Baixo. Mesmo padrão do P10 (já validado).

---

## Bugs Corrigidos (Fases 1-3) — Validados

| Bug | Local | Como testamos | Resultado |
|-----|-------|---------------|-----------|
| Hash incompleto | jogo.js:760 | Simulação ESCOLHENDO_MODO sem status → hash mudava | ✅ Hash agora inclui dicaAtual, modoDesenho, inicio, palavraOpcoes, pontosJogo, filaIndex |
| Watchdog N-clientes | jogo.js:1479-1482 | Análise de guard `adminId !== usuarioIdUnico` | ✅ Apenas admin executa watchdog |
| adminId null | jogo.js:675-681 | Fallback seta primeiro jogador como admin | ✅ Dois paths de fix (escutarLobbyJogadores + escutarEstadoGlobal) |
| P10 pendente ativo | jogo.js:730-745 | Transaction adiciona jogadores+filaOrdem atomicamente | ✅ Cobre revanche e qualquer status não-aguardando |
| Dedup traços | desenho.js:91-118 | Set de Firebase keys substitui heurística frágil | ✅ Imune a backfill de child_added |
| Presença multi-tab | config.js + jogo.js:519 | sessionId como chave, userId como campo | ✅ Cada aba gerencia seu nó; agregação por userId field |
| __foiOfflineCount > 3 | config.js:111-114 | Limite removido | ✅ Reconexão sempre permitida |
| Dica double-advance | jogo.js:1139 | Guard `(g.dicaIndex||0) !== dicaEsperado` | ✅ Apenas um commit vence |

---

## Gargalos de Carga (Fase A)

### Firebase writes por rodada (estimativa com 15 jogadores)

| Operação | Qtde | Tipo |
|----------|------|------|
| Traços de desenho | ~40 | `.push()` |
| Mensagens de chat | ~30 | `.push()` |
| Dicas automáticas | 3 | `transaction` |
| Acerto de palavra (1º) | 1 | `transaction` + ~5 `transaction` ranking |
| Watchdog timeout | 1 | `transaction` (admin-only) |
| FIM_RODADA → próximo | 1 | `transaction` + 2 `.remove()` |
| Ranking por acertador | ~5 × N | `transaction` (contadores) |
| **Total por rodada** | **~45 pushes + ~6-75 transactions** | |

### Preocupação de performance
- 2 listeners `value` em PATH.game() causam ~2× downloads
- Ranking usa `encodeURIComponent(nome)` como chave — mudança de nome perde histórico
- EscutarChat com `value` (não `child_added`) redownload de 15 msgs a cada nova mensagem

---

## Decisão: Dois listeners NÃO unificados

Auditoria concluiu que **não existem bugs causados pelos dois listeners** que justifiquem a unificação agora:

- Race conditions com perda de dados? ❌ Nenhuma
- Renderizações duplicadas relevantes? ❌ Só `renderLobby` duplicado (cosmético, lobby oculto durante jogo)
- Download duplicado com impacto? ❌ Mesmo snapshot, processado duas vezes
- Escritas conflitantes? ❌ Admin transfer via `set` + `transaction` — Firebase CAS resolve
- Admin inconsistente? ❌ Ambos elegem o mesmo jogador

**Custo da unificação >> benefício atual.** Reavaliar após testes reais.

---

## Riscos Arquiteturais

1. **ServerValue.TIMESTAMP** para `inicio` — todos clientes calculam `tempoRestante` com seu próprio relógio. Discrepância possível de 1-3s.
2. **Chave de ranking = nome do jogador** — quebra se jogador renomear
3. **`innerHTML = ""` sem preservar foco** — UX de acessibilidade prejudicada
4. **Nenhum mecanismo de debounce** no `escutarEstadoGlobal` — cada write no game dispara o listener simultaneamente em 15 clientes

---

## Recomendações para Fase 4

### Prioridade alta
1. **Testes reais com 2+ navegadores** — validar C1, C2, H1, H2, H3 em produção
2. **Adicionar debounce** no render do estado global (200ms) — evitar re-renders em cascata

### Prioridade média
3. **Trocar `escutarChat` para `child_added`** — evitar redownload de mensagens antigas
4. **Preservar foco** após re-renders — `aria-live` em regiões dinâmicas

### Prioridade baixa
5. **Chave de ranking por userId** em vez de nome
6. **Reavaliar unificação de listeners** após testes reais com 15 jogadores

---

## Arquivos auditados

| Arquivo | Linhas | Funções críticas |
|---------|--------|------------------|
| `js/jogo.js` | 1554 | escutarEstadoGlobal (638), escutarLobbyJogadores (545), renderJogo (776), renderFimRodada (944), watchdogJogo (1479), agendarResetSala (506), avancarDicaAuto (1135), enviarChute (1177) |
| `js/config.js` | 270 | setupPresenca (95), setupPresenceView (174), __cleanupPresenca (226) |
| `js/desenho.js` | 317 | carregarHistoricoInicial (79), escutarTracosNovos (106), enviarTraco (193) |
