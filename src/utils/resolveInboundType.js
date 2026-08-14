/**
 * 根据工单关联产品/物料判断入库类型：半成品 → 半成品入库，否则 → 成品入库
 */

const PRODUCT_KEY = 'i_doms_product_info'
const MATERIAL_KEY = 'i_doms_material_info'
const SEMI_NAME_KEYWORDS = ['总成', '半成品', '泵体部件', '泵头部件']

function loadJson(key, field) {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.[field] || []
  } catch {
    return []
  }
}

function findMasterByCode(code) {
  const c = String(code || '').trim()
  if (!c) return null
  const products = loadJson(PRODUCT_KEY, 'products')
  const materials = loadJson(MATERIAL_KEY, 'materials')
  return products.find((p) => p.code === c) || materials.find((m) => m.code === c) || null
}

/**
 * @returns {'半成品'|'成品'}
 */
export function resolveProductInboundKind(opts = {}) {
  const code = opts.itemCode || opts.productCode || ''
  const name = String(opts.itemName || opts.productName || opts.name || '')
  const master = findMasterByCode(code)
  const materialType = String(
    opts.materialType || master?.materialType || opts.raw?.materialType || '',
  ).trim()
  if (materialType === '半成品') return '半成品'
  if (SEMI_NAME_KEYWORDS.some((k) => name.includes(k))) return '半成品'
  const warehouse = String(opts.warehouse || opts.raw?.warehouse || '')
  if (warehouse.includes('半成品')) return '半成品'
  return '成品'
}

export function resolveInboundTypeByProduct(opts = {}) {
  return resolveProductInboundKind(opts) === '半成品' ? '半成品入库' : '成品入库'
}
