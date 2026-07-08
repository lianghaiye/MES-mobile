const ORDER_SOURCES = [
  { storageKey: 'i_doms_work_orders', field: 'orders', categories: ['生产工单', '外协工单'] },
  { storageKey: 'i_doms_assembly_work_orders', field: 'orders', categories: ['总装工单'] },
  { storageKey: 'i_doms_disassembly_work_orders', field: 'orders', categories: ['拆解工单'] },
  { storageKey: 'i_doms_qc_work_orders', field: 'orders', categories: ['质检工单'] },
]

function readStore(storageKey, field) {
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

/** 更新共享存储中的工单状态（与 WEB 同源 localStorage） */
export function updateWorkOrderStatus(workOrderId, status, orderCategory = '') {
  if (!workOrderId || !status) return false
  for (const src of resolveSources(orderCategory)) {
    const data = readStore(src.storageKey, src.field)
    const list = data?.[src.field]
    if (!Array.isArray(list)) continue
    const idx = list.findIndex((o) => o.id === workOrderId)
    if (idx < 0) continue
    list[idx] = {
      ...list[idx],
      status,
      ...(status === '完成'
        ? { completedAt: list[idx].completedAt || formatNow() }
        : {}),
    }
    writeStore(src.storageKey, { ...data, [src.field]: list })
    return true
  }
  return false
}

function formatNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
