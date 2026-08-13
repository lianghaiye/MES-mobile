const ORDER_SOURCES = [
  { storageKey: 'i_doms_work_orders', field: 'orders', categories: ['生产工单', '外协工单', '维修工单'] },
  { storageKey: 'i_doms_assembly_work_orders', field: 'orders', categories: ['总装工单'] },
  { storageKey: 'i_doms_disassembly_work_orders', field: 'orders', categories: ['拆解工单'] },
  { storageKey: 'i_doms_qc_work_orders', field: 'orders', categories: ['质检工单'] },
]

const LOCKED = new Set(['暂停', '终止', '已完成', '完成'])

function readStore(storageKey) {
  try {
    let raw = null
    try {
      raw = uni.getStorageSync(storageKey)
    } catch {
      /* ignore */
    }
    if (!raw && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(storageKey)
    }
    if (!raw) return null
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed
  } catch {
    return null
  }
}

function writeStore(storageKey, data) {
  const text = JSON.stringify(data)
  try {
    uni.setStorageSync(storageKey, text)
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, text)
    }
  } catch {
    /* ignore */
  }
}

function resolveSources(orderCategory) {
  if (orderCategory) {
    const hit = ORDER_SOURCES.find((s) => s.categories.includes(orderCategory))
    if (hit) return [hit]
  }
  return ORDER_SOURCES
}

function formatNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function normalizeStatus(status) {
  if (status === '完成') return '已完成'
  return status
}

function patchWorkOrder(workOrderId, patch, orderCategory = '') {
  if (!workOrderId || !patch) return false
  for (const src of resolveSources(orderCategory)) {
    const data = readStore(src.storageKey)
    const list = data?.[src.field]
    if (!Array.isArray(list)) continue
    const idx = list.findIndex((o) => o.id === workOrderId)
    if (idx < 0) continue
    const prev = list[idx]
    if (LOCKED.has(prev.status) && patch.status && patch.status !== prev.status) {
      // 锁定态仅允许同状态字段补充，不允许自动回写覆盖
      if (patch.status && normalizeStatus(patch.status) !== normalizeStatus(prev.status)) {
        return false
      }
    }
    const nextStatus = patch.status != null ? normalizeStatus(patch.status) : prev.status
    list[idx] = {
      ...prev,
      ...patch,
      status: nextStatus,
      ...(nextStatus === '已完成'
        ? { completedAt: prev.completedAt || formatNow() }
        : {}),
    }
    writeStore(src.storageKey, { ...data, [src.field]: list })
    return true
  }
  return false
}

/** 更新共享存储中的工单状态（与 WEB 同源 localStorage） */
export function updateWorkOrderStatus(workOrderId, status, orderCategory = '') {
  if (!workOrderId || !status) return false
  return patchWorkOrder(workOrderId, { status: normalizeStatus(status) }, orderCategory)
}

/** 领取后：升「执行中」并标记 hasClaimedTask */
export function markWorkOrderClaimedOnClaim(workOrderId, orderCategory = '') {
  if (!workOrderId) return false
  for (const src of resolveSources(orderCategory)) {
    const data = readStore(src.storageKey)
    const list = data?.[src.field]
    if (!Array.isArray(list)) continue
    const idx = list.findIndex((o) => o.id === workOrderId)
    if (idx < 0) continue
    const prev = list[idx]
    if (LOCKED.has(prev.status)) return false
    list[idx] = {
      ...prev,
      hasClaimedTask: true,
      status: '执行中',
      executedAt: prev.executedAt || formatNow(),
    }
    writeStore(src.storageKey, { ...data, [src.field]: list })
    return true
  }
  return false
}

export function getWorkOrderStatus(workOrderId, orderCategory = '') {
  if (!workOrderId) return ''
  for (const src of resolveSources(orderCategory)) {
    const data = readStore(src.storageKey)
    const list = data?.[src.field]
    if (!Array.isArray(list)) continue
    const hit = list.find((o) => o.id === workOrderId)
    if (hit) return normalizeStatus(hit.status) || ''
  }
  return ''
}

export function isWorkOrderPaused(workOrderId, orderCategory = '') {
  return getWorkOrderStatus(workOrderId, orderCategory) === '暂停'
}

export function isWorkOrderTerminated(workOrderId, orderCategory = '') {
  return getWorkOrderStatus(workOrderId, orderCategory) === '终止'
}
