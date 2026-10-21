/** 工序报工：产品规格/材质/图号、销售订单号（任务与记录共用） */

const PRODUCT_MATERIAL_MAP = {
  'SJ-2024-A': { specModel: 'L1200×W800×H2000', material: 'Q235', drawingNo: 'SJ-A-DWG-001' },
  'BX-2024-03': { specModel: 'Φ50×L800 45#', material: '45#', drawingNo: 'BX-2024-03-DWG' },
  'CP2610004': { specModel: 'QJ200-50/4', material: '不锈钢304', drawingNo: 'QJ200-50/4-DWG' },
  'CP2610002': { specModel: 'ISG80-160(I)A', material: 'HT250', drawingNo: 'ISG80-160-DWG' },
  'FL-2024-C': { specModel: 'DN150 PN16', material: 'HT200', drawingNo: 'FL-DN150-01' },
  'BK-2024-01': { specModel: 'HT200 铸铁', material: 'HT200', drawingNo: 'BK-DWG-01' },
  'DJ-2024-B': { specModel: 'φ180mm', material: '冷轧板', drawingNo: 'DJ-B-DWG-01' },
}

const SALES_ORDER_BY_WO_CODE = {
  'WO-062': '1-20260602-001',
  'WO-058': '1-20260529-002',
  'WO-055': '1-20260528-003',
  'WO-071': '1-20260604-001',
  'WO-068': '1-20260603-002',
  'WO-072': '1-20260606-001',
  'WO-ZZ-012': '1-20260605-001',
  'WO-LH-01': '1-20260606-101',
  'WO-LH-02': '1-20260606-102',
  'WO-LH-03': '1-20260606-103',
  'WO-LH-04': '1-20260606-104',
  'WO-LH-05': '1-20260606-105',
  'WO-LH-06': '1-20260606-106',
  'WO-LH-07': '1-20260606-106',
}

export function resolveProductMeta(row = {}) {
  const code = row.itemCode || row.productCode || ''
  const hit = PRODUCT_MATERIAL_MAP[code] || {}
  return {
    specModel: row.specModel || hit.specModel || '',
    material: row.material || hit.material || '',
    drawingNo: row.drawingNo || hit.drawingNo || '',
  }
}

export function resolveSalesOrderNo(row = {}) {
  return (
    row.salesOrderNo ||
    row.sourceOrderNo ||
    SALES_ORDER_BY_WO_CODE[row.workOrderCode] ||
    SALES_ORDER_BY_WO_CODE[row.workOrderNo] ||
    ''
  )
}

export function attachRecordProductMeta(row = {}) {
  const meta = resolveProductMeta(row)
  return {
    ...row,
    specModel: meta.specModel,
    material: meta.material,
    drawingNo: meta.drawingNo,
    salesOrderNo: resolveSalesOrderNo(row),
  }
}
