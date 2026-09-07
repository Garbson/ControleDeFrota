# Assistente IA — Chat da Frota

Chat conversacional embutido no ControleDeFrota. O usuário pergunta em linguagem natural
e o modelo consulta o banco através de "tools" (funções) definidas em `tools.js`,
gerando texto, tabelas ou arquivos (PDF/XLSX) sob demanda.

## Como funciona

```
Vue (ChatDrawer.vue)
        │  POST /api/chat  { messages: [...] }
        ▼
Express (routes/chat.js)  ──stream SSE──►  Vue (renderiza tokens + chips + anexos)
        │
        ▼
services/chat/agent.js
        │  loop de tool use (max 6 iterações)
        ▼
Anthropic API (Claude)
        │  decide chamar tool
        ▼
services/chat/tools.js  ──►  MySQL / gera arquivo em uploads/chat/
```

## Configuração

Adicione ao seu `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...    # https://console.anthropic.com/settings/keys
CHAT_MODEL=claude-haiku-4-5-20251001
```

Se `ANTHROPIC_API_KEY` estiver vazia, a rota `/api/chat` responde 500 no primeiro
uso (o app inteiro continua funcionando normalmente).

## Custos aproximados

Com **Claude Haiku 4.5** (padrão) e uso típico de gestor de frota
(~50 perguntas/dia, 2k tokens input + 500 output cada):

- ~R$ 4 a R$ 8 por empresa/mês em API

Trocar para **Sonnet 4.5** (mais preciso em análises complexas) multiplica o custo
por 3-5x. Recomendo começar com Haiku e só migrar se algum caso pedir.

## Tools disponíveis

| Nome | O que faz |
|---|---|
| `listar_veiculos` | Lista veículos ativos (filtro por tipo) |
| `detalhes_veiculo` | Detalhes por placa + histórico de pneus + últimos abastecimentos |
| `listar_motoristas` | Lista motoristas + CNH vencendo em N dias |
| `consumo_combustivel` | Abastecimentos + agregações (total, ticket médio, R$/litro) |
| `contas_pagar` | Consulta contas a pagar (status, categoria, vencendo em N dias) |
| `contas_receber` | Consulta contas a receber |
| `resumo_dashboard` | KPIs consolidados da frota |
| `gerar_relatorio` | Gera PDF ou XLSX a partir de dados tabulares |

## Adicionar novas tools

1. Edite `tools.js`
2. Adicione a definição em `toolDefinitions` (nome, descrição, schema JSON)
3. Adicione o handler em `toolHandlers` (função async que retorna dados)
4. Pronto — o modelo vai descobrir e usar quando fizer sentido

## Segurança

- Rota protegida pelo mesmo `authenticate` do resto da API (JWT)
- Modelo só executa tools listadas — **não tem acesso ao SQL cru**
- Nenhuma tool aceita SQL do usuário — tudo é consulta parametrizada
- Rate limit padrão da API (`/api`) se aplica: 300 req/min por IP

## Limitações conhecidas

- Máximo 6 iterações por pergunta (evita loops infinitos e explosão de custo)
- Contexto de conversa limitado às últimas 20 mensagens
- Arquivos gerados vão para `uploads/chat/` e ficam lá até limpeza manual
