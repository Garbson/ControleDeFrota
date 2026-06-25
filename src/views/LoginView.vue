<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const emit = defineEmits(['login'])

const { login, loading, error } = useAuth()

const email = ref('')
const password = ref('')
const showPass = ref(false)

async function submit() {
  if (!email.value || !password.value) return
  const ok = await login(email.value, password.value)
  if (ok) emit('login')
}
</script>

<template>
  <div class="login-bg min-h-screen flex items-center justify-center">
    <!-- Orbs -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="w-full max-w-[380px] mx-5 relative z-10">

      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="logo-wrapper mb-5">
          <img src="/logo.png" alt="Transportadora Triunfo" class="h-auto w-full object-contain" />
        </div>
        <p class="text-[11px] text-stone-400 uppercase tracking-[0.2em] font-semibold">Sistema de Gestão de Frota</p>
      </div>

      <!-- Card -->
      <div class="login-card px-8 py-8">
        <h2 class="text-stone-700 font-semibold text-[14px] mb-6 text-center">Acesse sua conta</h2>

        <!-- Erro -->
        <div v-if="error" class="mb-5 px-4 py-3 rounded-xl flex items-center gap-2.5" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2)">
          <svg width="15" height="15" fill="#f87171" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <p class="text-red-600 text-[13px]">{{ error }}</p>
        </div>

        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="field-label">E-mail</label>
            <input v-model="email" type="email" placeholder="seu@email.com" autocomplete="email" required class="field-input" />
          </div>
          <div>
            <label class="field-label">Senha</label>
            <div class="relative">
              <input v-model="password" :type="showPass ? 'text' : 'password'" placeholder="••••••••" autocomplete="current-password" required class="field-input pr-11" />
              <button type="button" @click="showPass = !showPass" class="eye-btn">
                <svg v-if="!showPass" width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                <svg v-else width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" :disabled="loading" class="submit-btn">
            <svg v-if="loading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            {{ loading ? 'Entrando...' : 'Entrar no sistema' }}
          </button>
        </form>
      </div>

      <p class="text-center text-stone-400 text-[11px] mt-5">
        Transportadora Triunfo Transportes &amp; Logística © {{ new Date().getFullYear() }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-bg {
  background: #f5f0e8;
  position: relative;
}

.orb { position: absolute; border-radius: 50%; pointer-events: none; }
.orb-1 { width: 500px; height: 500px; top: -150px; left: -100px; background: radial-gradient(circle, rgba(180,160,100,0.18) 0%, transparent 70%); filter: blur(60px); }
.orb-2 { width: 400px; height: 400px; bottom: -100px; right: -80px; background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%); filter: blur(80px); }
.orb-3 { width: 300px; height: 300px; top: 50%; left: 50%; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(210,190,140,0.12) 0%, transparent 70%); filter: blur(40px); }

.logo-wrapper {
  width: 240px;
}

.login-card {
  background: rgba(255, 253, 248, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255,255,255,0.9);
}

.field-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #92806a;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}

.field-input {
  width: 100%;
  padding: 10px 14px;
  background: white;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 12px;
  font-size: 13.5px;
  color: #1c1917;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.field-input::placeholder { color: #a8a29e; }
.field-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
}

.eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  color: #a8a29e; background: none; border: none; cursor: pointer;
  padding: 2px; display: flex; align-items: center; transition: color 0.15s;
}
.eye-btn:hover { color: #57534e; }

.submit-btn {
  width: 100%;
  padding: 11px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  font-weight: 700;
  font-size: 13.5px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  box-shadow: 0 4px 20px rgba(37,99,235,0.30), inset 0 1px 0 rgba(255,255,255,0.15);
  letter-spacing: 0.02em;
}
.submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
.submit-btn:active:not(:disabled) { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
