import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Region } from '../types'
import { formatAuthHeader } from '../utils/region-prefix'
import { apiService } from '../services/api.service'

const STORAGE_KEY = 'jimeng_settings'

interface StoredSettings {
  apiBaseUrl: string
  sessionId: string
  region: Region
}

function normalizeBaseUrl(input: string): string {
  const v = (input ?? '').trim()

  // 空字串代表同源：請求會變成 /v1/...，交給 nginx 反代到後端
  if (!v) return ''

  // 自動遷移：舊版常見預設 http://localhost:5100
  // 在「透過 GUI 入口（5173）+ nginx 反代」的部署模型下，localhost/127.0.0.1 會指向使用者自己的機器，應改為同源。
  // （如果你真的想指定遠端 API，請填入 VPS 的 IP/網域，例如 http://192.168.1.100:5226）
  const isLocalhost =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(v) ||
    /^https?:\/\/(localhost|127\.0\.0\.1):5100\/?$/i.test(v)

  if (isLocalhost) return ''

  // 避免輸入尾端斜線，導致後面拼接成 //v1/...
  return v.replace(/\/+$/, '')
}

export const useSettingsStore = defineStore('settings', () => {
  // State（預設改為同源）
  const apiBaseUrl = ref('')
  const sessionId = ref('')
  const region = ref<Region>('cn')

  // Getters
  const isConfigured = computed(() => sessionId.value.length > 0)

  const formattedSessionId = computed(() => {
    if (!sessionId.value) return ''
    const prefix = region.value === 'cn' ? '' : `${region.value}-`
    return `${prefix}${sessionId.value}`
  })

  const authHeader = computed(() => {
    if (!sessionId.value) return ''
    return formatAuthHeader(sessionId.value, region.value)
  })

  // Actions
  function setConfig(config: Partial<StoredSettings>) {
    if (config.apiBaseUrl !== undefined) apiBaseUrl.value = normalizeBaseUrl(config.apiBaseUrl)
    if (config.sessionId !== undefined) sessionId.value = config.sessionId
    if (config.region !== undefined) region.value = config.region
    saveToStorage()
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: StoredSettings = JSON.parse(stored)
        apiBaseUrl.value = normalizeBaseUrl(parsed.apiBaseUrl || '')
        sessionId.value = parsed.sessionId || ''
        region.value = parsed.region || 'cn'
      }
    } catch {
      // If parsing fails, use defaults
    }
  }

  function saveToStorage() {
    const settings: StoredSettings = {
      apiBaseUrl: normalizeBaseUrl(apiBaseUrl.value),
      sessionId: sessionId.value,
      region: region.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }

  function clearConfig() {
    apiBaseUrl.value = ''
    sessionId.value = ''
    region.value = 'cn'
    localStorage.removeItem(STORAGE_KEY)
  }

  async function generateNewSession(): Promise<{ success: boolean; message: string }> {
    try {
      apiService.setConfig({
        baseUrl: normalizeBaseUrl(apiBaseUrl.value),
        sessionId: sessionId.value || 'temp',
        region: region.value,
      })

      const result = await apiService.generateSession()

      sessionId.value = result.sessionId
      saveToStorage()

      return {
        success: true,
        message: result.message || 'Session ID 生成成功',
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Session ID 生成失败',
      }
    }
  }

  return {
    apiBaseUrl,
    sessionId,
    region,
    isConfigured,
    formattedSessionId,
    authHeader,
    setConfig,
    loadFromStorage,
    saveToStorage,
    clearConfig,
    generateNewSession,
  }
})
