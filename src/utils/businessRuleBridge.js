const STORAGE_KEY = 'i_doms_business_rules'
const FUNCTION_PARAM_KEY = 'i_doms_function_params'

function readStorage(key) {
  try {
    let raw = null
    try {
      raw = uni.getStorageSync(key)
    } catch {
      /* ignore */
    }
    if (!raw && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(key)
    }
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

function loadRules() {
  return readStorage(STORAGE_KEY)
}

export function getProductionMode() {
  return loadRules()?.productionMode || 'standard'
}

export function isMinimalReportMode() {
  return getProductionMode() === 'minimal'
}

/** 与 WEB 功能参数「工序任务时序下发」共用 */
function isSequentialProcessTaskEnabled() {
  return readStorage(FUNCTION_PARAM_KEY)?.enableSequentialProcessTask === true
}

/**
 * 工序任务是否并行下发
 * - 极简报工：始终并行
 * - 其他：功能参数关闭时序=并行，开启时序=串行锁定
 */
export function isParallelTaskDispatch() {
  if (isMinimalReportMode()) return true
  return !isSequentialProcessTaskEnabled()
}
