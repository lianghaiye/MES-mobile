import {
  DEFECT_ITEMS_KEY,
  PROCESS_CONFIG_KEY,
  ensureIodomsSeed,
} from '@/mock/iodomsSeed'
import { normalizeReportMode, resolveReportMode } from '@/utils/reportMode'

ensureIodomsSeed()

export function getDefectItems() {
  try {
    const raw = uni.getStorageSync(DEFECT_ITEMS_KEY)
    if (raw) return JSON.parse(raw).items || []
  } catch {
    /* ignore */
  }
  return []
}

export function getProcessConfigs() {
  try {
    const raw = uni.getStorageSync(PROCESS_CONFIG_KEY)
    if (raw) return JSON.parse(raw).processes || []
  } catch {
    /* ignore */
  }
  return []
}

export function getProcessByName(name) {
  return getProcessConfigs().find((p) => p.name === name && p.status === '使用中') || null
}

export function getDefectItemsByIds(ids = []) {
  const all = getDefectItems()
  return ids.map((id) => all.find((i) => i.id === id)).filter(Boolean)
}

export function getProcessDefectItems(processName) {
  const proc = getProcessByName(processName)
  if (!proc?.defectItemIds?.length) return []
  return getDefectItemsByIds(proc.defectItemIds)
}

export function getProcessReportMode(processName) {
  const proc = getProcessByName(processName)
  return resolveReportMode(proc?.reportMode)
}

export { normalizeReportMode }
