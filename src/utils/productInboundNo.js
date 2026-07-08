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

/** 成品入库申请单号 RK{YYYYMMDD}{seq} */
export function generateProductInboundNo(existing = []) {
  const date = padDate()
  const prefix = `RK${date}`
  const sameDay = existing.filter((r) => r.inboundNo?.startsWith(prefix))
  const seq = String(sameDay.length + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

/** 入库单号（与 WEB 一致）1-{YYYYMMDD}-{seq} */
export function generateInboundDocNo(existingOrders = []) {
  const date = padDate()
  const prefix = `1-${date}-`
  const max = existingOrders.reduce((m, o) => {
    const str = String(o.docNo || '')
    if (!str.startsWith(prefix)) return m
    return Math.max(m, Number(str.slice(prefix.length)) || 0)
  }, 0)
  return `${prefix}${String(max + 1).padStart(5, '0')}`
}

export function createInboundLineId() {
  return `pi-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function createInboundTaskId() {
  return `mp-task-${Date.now()}`
}

export { formatDateTime, padDate }
