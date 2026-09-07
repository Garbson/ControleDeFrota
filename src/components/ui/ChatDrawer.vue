<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { getAccessToken } from '../../composables/useApi'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const open = ref(false)
const input = ref('')
const messages = ref([])          // { role, content, files?, tools? }
const sending = ref(false)
const errorMsg = ref('')
const scrollEl = ref(null)

const canSend = computed(() => input.value.trim().length > 0 && !sending.value)

function toggle() {
  open.value = !open.value
  if (open.value) nextTick(scrollToBottom)
}

function scrollToBottom() {
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function newAssistantMessage() {
  const msg = { role: 'assistant', content: '', tools: [], files: [] }
  messages.value.push(msg)
  return msg
}

function parseSSE(chunk, buffer) {
  buffer.value += chunk
  const events = []
  let idx
  while ((idx = buffer.value.indexOf('\n\n')) !== -1) {
    const raw = buffer.value.slice(0, idx)
    buffer.value = buffer.value.slice(idx + 2)
    if (raw.startsWith(':')) continue // comment/heartbeat
    let event = 'message'
    let data = ''
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    try { events.push({ event, data: JSON.parse(data) }) } catch { /* ignore */ }
  }
  return events
}

async function send() {
  if (!canSend.value) return
  const text = input.value.trim()
  input.value = ''
  errorMsg.value = ''
  messages.value.push({ role: 'user', content: text })
  await nextTick(scrollToBottom)

  sending.value = true
  const assistant = newAssistantMessage()

  try {
    const payload = {
      messages: messages.value
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
        .slice(0, -1) // remove o placeholder do assistant que acabamos de criar
        .map(m => ({ role: m.role, content: m.content })),
    }

    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Erro ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    const buffer = { value: '' }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const events = parseSSE(decoder.decode(value, { stream: true }), buffer)

      for (const ev of events) {
        if (ev.event === 'text') {
          assistant.content += ev.data.text
        } else if (ev.event === 'tool_use') {
          assistant.tools.push({ name: ev.data.name, status: 'rodando' })
        } else if (ev.event === 'tool_result') {
          const t = assistant.tools.find(t => t.name === ev.data.name && t.status === 'rodando')
          if (t) t.status = ev.data.ok ? 'ok' : 'erro'
          const arquivo = ev.data.preview?.arquivo
          if (arquivo) assistant.files.push(arquivo)
        } else if (ev.event === 'error') {
          throw new Error(ev.data.message)
        }
        await nextTick(scrollToBottom)
      }
    }
  } catch (err) {
    errorMsg.value = err.message || 'Erro ao conversar'
    assistant.content += (assistant.content ? '\n\n' : '') + `⚠️ ${errorMsg.value}`
  } finally {
    sending.value = false
    await nextTick(scrollToBottom)
  }
}

function clear() {
  messages.value = []
  errorMsg.value = ''
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function downloadUrl(url) {
  // urls do backend vêm como /uploads/chat/... — o proxy do vite/nginx cuida
  return url
}

watch(() => messages.value.length, () => nextTick(scrollToBottom))
</script>

<template>
  <!-- Botão flutuante -->
  <button
    v-if="!open"
    @click="toggle"
    class="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
    title="Assistente da frota"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  </button>

  <!-- Drawer -->
  <div
    v-if="open"
    class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
      <div>
        <div class="font-semibold text-stone-800">Assistente da Frota</div>
        <div class="text-xs text-stone-500">Pergunte sobre veículos, motoristas, contas, relatórios…</div>
      </div>
      <div class="flex gap-1">
        <button @click="clear" title="Limpar conversa" class="p-2 hover:bg-stone-200 rounded text-stone-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14"/></svg>
        </button>
        <button @click="toggle" title="Fechar" class="p-2 hover:bg-stone-200 rounded text-stone-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Mensagens -->
    <div ref="scrollEl" class="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
      <div v-if="!messages.length" class="text-stone-400 text-sm text-center mt-8">
        <div class="mb-3">👋 Como posso ajudar?</div>
        <div class="text-xs space-y-1">
          <div>• "Quantos veículos tenho ativos?"</div>
          <div>• "Motoristas com CNH vencendo em 30 dias"</div>
          <div>• "Gasto de combustível esse mês"</div>
          <div>• "Gera uma planilha das contas a pagar vencidas"</div>
        </div>
      </div>

      <div
        v-for="(m, i) in messages"
        :key="i"
        :class="m.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <div
          :class="[
            'max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap',
            m.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm'
          ]"
        >
          <div v-if="m.content">{{ m.content }}</div>
          <div v-else-if="m.role === 'assistant' && sending" class="text-stone-400 italic">pensando…</div>

          <!-- Chips de tools -->
          <div v-if="m.tools?.length" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="(t, k) in m.tools"
              :key="k"
              :class="[
                'text-[10px] px-2 py-0.5 rounded-full border',
                t.status === 'ok'    ? 'border-green-300 bg-green-50 text-green-700' :
                t.status === 'erro'  ? 'border-red-300 bg-red-50 text-red-700' :
                                       'border-stone-300 bg-stone-100 text-stone-500'
              ]"
            >
              {{ t.status === 'rodando' ? '⟳' : t.status === 'ok' ? '✓' : '✗' }} {{ t.name }}
            </span>
          </div>

          <!-- Anexos gerados -->
          <div v-if="m.files?.length" class="mt-2 space-y-1">
            <a
              v-for="(f, k) in m.files"
              :key="k"
              :href="downloadUrl(f.url)"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 text-xs transition-colors"
            >
              <span class="uppercase font-bold text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded">{{ f.formato }}</span>
              <span class="truncate flex-1">{{ f.nome }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-stone-200 p-3 bg-white">
      <div v-if="errorMsg" class="text-xs text-red-600 mb-2">{{ errorMsg }}</div>
      <div class="flex gap-2">
        <textarea
          v-model="input"
          @keydown="onKeydown"
          rows="2"
          placeholder="Pergunte alguma coisa… (Enter para enviar)"
          :disabled="sending"
          class="flex-1 resize-none border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-stone-100"
        />
        <button
          @click="send"
          :disabled="!canSend"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <span v-if="sending">…</span>
          <span v-else>Enviar</span>
        </button>
      </div>
      <div class="text-[10px] text-stone-400 mt-1">
        Powered by Claude · dados vêm ao vivo do seu banco
      </div>
    </div>
  </div>
</template>
