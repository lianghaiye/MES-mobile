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

/** 成品入库申请单号 FI{YYYYMMDD}{seq}（与 WEB 一致） */
export function generateFinishedInboundReqNo(existing = []) {
  const date = padDate()
  const prefix = `FI${date}`
  let max = 0
  ;(existing || []).forEach((row) => {
    const no = String(row.reqNo || row.inboundNo || '')
    if (!no.startsWith(prefix)) return
    const n = Number(no.slice(prefix.length))
    if (Number.isFinite(n) && n > max) max = n
  })
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

/** @deprecated 使用 generateFinishedInboundReqNo */
export function generateProductInboundNo(existing = []) {
  return generateFinishedInboundReqNo(existing)
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
