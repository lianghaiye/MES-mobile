const STORAGE_KEY = 'i_doms_business_rules'

function loadRules() {
  try {
    let raw = null
    try {
      raw = uni.getStorageSync(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    if (!raw && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(STORAGE_KEY)
    }
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

export function getProductionMode() {
  return loadRules()?.productionMode || 'standard'
}

export function isMinimalReportMode() {
  return getProductionMode() === 'minimal'
}

/** 极简报工：工序任务并行下发，非时序控制 */
export function isParallelTaskDispatch() {
  return isMinimalReportMode()
}
