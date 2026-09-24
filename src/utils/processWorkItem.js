/**
 * 工序作业分项（小程序侧：报工校验与规范化）
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

export function requiresWorkItemReport(reportQtyMode, wageQtyMode) {
  const report = normalizeReportQtyMode(reportQtyMode)
  const wage = normalizeWageQtyMode(wageQtyMode)
  return report === REPORT_QTY_MODE.ITEMIZED || wage === WAGE_QTY_MODE.ITEMIZED
}

export function isScheduleReportMode(reportQtyMode) {
  return normalizeReportQtyMode(reportQtyMode) === REPORT_QTY_MODE.SCHEDULE
}

export function isItemizedWageMode(wageQtyMode) {
  return normalizeWageQtyMode(wageQtyMode) === WAGE_QTY_MODE.ITEMIZED
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
      const unitPrice =
        row.unitPriceSnapshot != null && row.unitPriceSnapshot !== ''
          ? Number(row.unitPriceSnapshot)
          : Number(row.unitPrice ?? hit?.unitPrice) || 0
      return {
        itemCode,
        itemName: String(row.itemName || hit?.name || itemCode),
        unit: String(row.unit || hit?.unit || '个'),
        qty,
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
  if (!requiresWorkItemReport(reportQtyMode, wageQtyMode)) return { ok: true }
  const normalized = normalizeReportWorkItems(workItems, catalog)
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

export function buildWorkItemFormRows(catalog = []) {
  return (Array.isArray(catalog) ? catalog : []).map((item) => ({
    itemCode: item.code || item.itemCode,
    itemName: item.name || item.itemName || item.code || item.itemCode,
    unit: item.unit || '个',
    qty: 0,
    unitPriceSnapshot: Number(item.unitPrice) || 0,
    plannedQtyTotal: item.plannedQtyTotal ?? null,
  }))
}
