import { createProcessConfigSeed } from './processConfigSeed'

/** 与 Web 工序配置共用 storage key（H5 同域可互通） */
const STORAGE_KEY = 'i_doms_process_config'
const SEED_VERSION_KEY = 'i_doms_process_config_seed_v'
const CURRENT_SEED_VERSION = '3'

let cache = null

function loadFromStorage() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (!raw) return null
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed?.processes)) return parsed.processes
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return uni.getStorageSync(SEED_VERSION_KEY) !== CURRENT_SEED_VERSION
}

function persist(list) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify({ processes: list }))
  uni.setStorageSync(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

export function reloadProcessConfig() {
  const stored = loadFromStorage()
  if (shouldReseed() || !stored) {
    cache = createProcessConfigSeed()
    persist(cache)
  } else {
    cache = stored
  }
  return cache
}

function ensureCache() {
  if (!cache) reloadProcessConfig()
  return cache
}

export function getActiveProcesses() {
  return ensureCache().filter((p) => p.status === '使用中')
}

export function getProcessCategories() {
  const cats = new Set(getActiveProcesses().map((p) => p.category))
  return [...cats]
}

export function searchActiveProcesses({ keyword = '', category = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return getActiveProcesses().filter((p) => {
    if (category && p.category !== category) return false
    if (!kw) return true
    return (
      p.name.toLowerCase().includes(kw) ||
      p.code.toLowerCase().includes(kw)
    )
  })
}

export function resolveDefaultExecutors(process) {
  if (!process) return []
  const list = process.defaultExecutors
  return Array.isArray(list) && list.length ? [...list] : []
}
