/**
 * 工序作业分项（小程序侧）
 * 与 i-doms-web/src/utils/processWorkItem.js 对齐
 */

export const REPORT_QTY_MODE = {
  SCHEDULE: 'schedule',
  ITEMIZED: 'itemized',
}

export const WAGE_QTY_MODE = {
  REPORTED: 'reported',
  ITEMIZED: 'itemized',
}

export function normalizeReportQtyMode(mode) {
  return mode === REPORT_QTY_MODE.ITEMIZED ? REPORT_QTY_MODE.ITEMIZED : REPORT_QTY_MODE.SCHEDULE
}

export function normalizeWageQtyMode(mode) {
  return mode === WAGE_QTY_MODE.ITEMIZED ? WAGE_QTY_MODE.ITEMIZED : WAGE_QTY_MODE.REPORTED
}

export function isScheduleReportMode(reportQtyMode) {
  return normalizeReportQtyMode(reportQtyMode) === REPORT_QTY_MODE.SCHEDULE
}

export function isItemizedReportMode(reportQtyMode) {
  return normalizeReportQtyMode(reportQtyMode) === REPORT_QTY_MODE.ITEMIZED
}

export function isItemizedWageMode(wageQtyMode) {
  return normalizeWageQtyMode(wageQtyMode) === WAGE_QTY_MODE.ITEMIZED
}

/** 仅分项计薪时必须填分项数量 */
export function requiresWorkItemQty(reportQtyMode, wageQtyMode) {
  void reportQtyMode
  return isItemizedWageMode(wageQtyMode)
}

export function requiresWorkItemReport(reportQtyMode, wageQtyMode) {
  return requiresWorkItemQty(reportQtyMode, wageQtyMode)
}

/**
 * - none: 无分项
 * - select: 勾选分项不填量（排产+报工 / 分项+报工）
 * - qty: 填分项数量（分项计薪）
 */
export function resolveWorkItemEntryMode(reportQtyMode, wageQtyMode, hasTemplates = false) {
  if (requiresWorkItemQty(reportQtyMode, wageQtyMode)) return 'qty'
  if (hasTemplates && !isItemizedWageMode(wageQtyMode)) return 'select'
  return 'none'
}

export function normalizeReportWorkItems(list = [], snapshotCatalog = []) {
  const catalog = new Map(
    (snapshotCatalog || []).map((c) => [String(c.code || c.itemCode || ''), c]),
  )
  return (Array.isArray(list) ? list : [])
    .map((row) => {
      const itemCode = String(row.itemCode || row.code || '').trim()
      if (!itemCode) return null
      const hit = catalog.get(itemCode)
      const qty = Number(row.qty) || 0
      const selected = row.selected === true || qty > 0
      const unitPrice =
        row.unitPriceSnapshot != null && row.unitPriceSnapshot !== ''
          ? Number(row.unitPriceSnapshot)
          : Number(row.unitPrice ?? hit?.unitPrice) || 0
      return {
        itemCode,
        itemName: String(row.itemName || hit?.name || itemCode),
        unit: String(row.unit || hit?.unit || '个'),
        qty,
        selected,
        unitPriceSnapshot: unitPrice,
      }
    })
    .filter(Boolean)
}

export function validateReportWorkItems({
  reportQtyMode,
  wageQtyMode,
  workItems = [],
  catalog = [],
} = {}) {
  const mode = resolveWorkItemEntryMode(
    reportQtyMode,
    wageQtyMode,
    (catalog || []).length > 0 || (workItems || []).length > 0,
  )
  if (mode === 'none') return { ok: true }

  const normalized = normalizeReportWorkItems(workItems, catalog)

  if (mode === 'select') {
    if (isItemizedReportMode(reportQtyMode)) {
      const selected = normalized.filter((r) => r.selected)
      if (!selected.length) {
        return { ok: false, message: '请至少勾选一条作业分项' }
      }
    }
    return { ok: true }
  }

  const positive = normalized.filter((r) => r.qty > 0)
  if (!positive.length) {
    return { ok: false, message: '请至少填写一条作业分项数量' }
  }
  if (isItemizedWageMode(wageQtyMode)) {
    const missing = positive.find((r) => !(Number(r.unitPriceSnapshot) > 0))
    if (missing) {
      return { ok: false, message: `分项「${missing.itemName}」缺少单价，无法计薪` }
    }
  }
  return { ok: true }
}

export function buildWorkItemFormRows(catalog = [], entryMode = 'qty') {
  return (Array.isArray(catalog) ? catalog : []).map((item) => ({
    itemCode: item.code || item.itemCode,
    itemName: item.name || item.itemName || item.code || item.itemCode,
    unit: item.unit || '个',
    qty: 0,
    selected: false,
    unitPriceSnapshot: Number(item.unitPrice) || 0,
    plannedQtyTotal: item.plannedQtyTotal ?? null,
    entryMode,
  }))
}
