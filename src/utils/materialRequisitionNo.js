function padDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function formatDateTime(d = new Date()) {
  const date = padDate(d)
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${h}:${min}:${s}`
}

/** 领料申请单号 ML{YYYYMMDD}{seq} */
export function generateMaterialReqNo(existing = []) {
  const date = padDate()
  const prefix = `ML${date}`
  const sameDay = existing.filter((r) => r.reqNo?.startsWith(prefix))
  const seq = String(sameDay.length + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

/** 出库单号 OUT{YYYYMMDD}{seq} */
export function generateOutboundDocNo(existingOrders = []) {
  const date = padDate()
  const prefix = `OUT${date}`
  const sameDay = existingOrders.filter((o) => o.docNo?.startsWith(prefix))
  const seq = String(sameDay.length + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

export function createLineId() {
  return `mr-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export { formatDateTime, padDate }
