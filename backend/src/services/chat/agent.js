const Anthropic = require('@anthropic-ai/sdk')
const { toolDefinitions, executarTool } = require('./tools')

const MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5-20251001'
const MAX_ITERATIONS = 6
const MAX_TOKENS = 2048

const SYSTEM_PROMPT = `Você é o assistente do ControleDeFrota, um sistema de gestão de frota de caminhões.
Data atual: ${new Date().toISOString().slice(0, 10)}.

Você tem acesso ao banco de dados da frota através das tools. Use-as sempre que precisar de dados reais — nunca invente números, placas, nomes ou valores.

Regras:
- Responda em português brasileiro, direto e objetivo.
- Formate valores monetários como R$ 1.234,56 e datas como DD/MM/AAAA.
- Quando o usuário pedir um relatório, planilha ou PDF, primeiro consulte os dados com as tools de leitura, depois use "gerar_relatorio" passando as linhas prontas. Ao final, informe o link retornado.
- Se um filtro for ambíguo (ex: "esse mês"), assuma o mês corrente e diga isso na resposta.
- Se uma consulta trouxer muitos registros, resuma os principais e ofereça gerar a planilha completa.
- Nunca exponha estruturas internas (nomes de tabelas, SQL) — fale em linguagem de negócio.`

function createClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no ambiente.')
  return new Anthropic({ apiKey })
}

/**
 * Roda o loop de tool use, emitindo eventos SSE.
 * emit(type, data) — cada chamada envia um evento para o cliente.
 */
async function runChat({ messages, ctx, emit }) {
  const client = createClient()
  const conversation = [...messages]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    emit('status', { iteration: i + 1 })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages: conversation,
    })

    // Emite texto que veio da resposta
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        emit('text', { text: block.text })
      }
    }

    // Se não tem tool use, terminamos
    if (response.stop_reason !== 'tool_use') {
      emit('done', { stop_reason: response.stop_reason, usage: response.usage })
      return
    }

    // Adiciona a resposta do assistant à conversa
    conversation.push({ role: 'assistant', content: response.content })

    // Executa cada tool call
    const toolResults = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      emit('tool_use', { name: block.name, input: block.input, id: block.id })

      const result = await executarTool(block.name, block.input, ctx)
      emit('tool_result', {
        id: block.id,
        name: block.name,
        ok: result.ok,
        preview: previewResult(result),
      })

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result.ok ? result.data : { erro: result.error }),
        is_error: !result.ok,
      })
    }

    conversation.push({ role: 'user', content: toolResults })
  }

  emit('done', { stop_reason: 'max_iterations' })
}

function previewResult(result) {
  if (!result.ok) return { erro: result.error }
  const data = result.data
  if (data == null) return {}
  if (typeof data === 'object' && data.url && data.formato) {
    return { arquivo: { url: data.url, formato: data.formato, nome: data.nome } }
  }
  if (typeof data === 'object') {
    const totalKey = Object.keys(data).find(k => k.startsWith('total'))
    return totalKey ? { [totalKey]: data[totalKey] } : { chaves: Object.keys(data).slice(0, 5) }
  }
  return {}
}

module.exports = { runChat }
