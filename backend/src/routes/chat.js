const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const { runChat } = require('../services/chat/agent')

router.use(authenticate)

// POST /api/chat — envia mensagens e recebe resposta via SSE
router.post('/', async (req, res) => {
  const { messages } = req.body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages deve ser um array não-vazio' })
  }

  // Validação leve — só aceita text simples (o front nunca manda tool_result direto)
  const clean = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20) // últimas 20 mensagens de contexto

  if (!clean.length) {
    return res.status(400).json({ error: 'Nenhuma mensagem válida' })
  }

  // Se for a última mensagem for de assistant, é inválido (precisamos de user por último)
  if (clean[clean.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'A última mensagem deve ser do usuário' })
  }

  // Setup SSE
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders?.()

  const emit = (type, data) => {
    res.write(`event: ${type}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // Heartbeat pra manter a conexão viva em proxies
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000)

  req.on('close', () => clearInterval(heartbeat))

  try {
    await runChat({
      messages: clean,
      ctx: { userId: req.user?.id, role: req.user?.role },
      emit,
    })
  } catch (err) {
    console.error('[chat]', err)
    emit('error', { message: err.message || 'Erro no chat' })
  } finally {
    clearInterval(heartbeat)
    res.end()
  }
})

module.exports = router
