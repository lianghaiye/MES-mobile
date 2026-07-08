const STOCK_STORAGE_KEY = 'i_doms_inventory_stock'

/** 领料出库来源仓库（行级可选） */
export const pickWarehouseOptions = [
  { label: '原材料仓', value: '原材料仓' },
  { label: '成品仓', value: '成品仓' },
  { label: '半成品仓', value: '半成品仓' },
]

/** 领入目标仓库（单头，默认线边仓）— 请通过 warehouseBridge 按车间动态获取 */
export const receiveWarehouseOptions = []

/** 全部仓库（库存查询等场景） */
export const warehouseOptions = [
  ...pickWarehouseOptions,
  { label: '库线边仓', value: '库线边仓' },
  { label: '原料仓', value: '原料仓' },
  { label: '库A仓', value: '库A仓' },
  { label: '库库仓', value: '库库仓' },
]

export const defaultPickWarehouse = pickWarehouseOptions[0].value
/** @deprecated 使用 resolveDefaultReceiveWarehouse(workCenter) */
export const defaultReceiveWarehouse = ''
/** @deprecated 使用 defaultPickWarehouse */
export const defaultWarehouse = defaultPickWarehouse

function loadStockRecords() {
  try {
    const raw = uni.getStorageSync(STOCK_STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.records || []
  } catch {
    return []
  }
}

/** 按物料类型推断默认出库仓库 */
export function resolvePickWarehouseForItem(item = {}) {
  const itemType = item.itemType || '物料'
  if (itemType === '产品') return '成品仓'
  return '原材料仓'
}

/** 查询指定仓库下物料库存数量 */
export function getWarehouseStockQty(warehouse, itemCode) {
  if (!warehouse || !itemCode) return 0
  const records = loadStockRecords()
  const hit = records.find((r) => r.warehouse === warehouse && r.itemCode === itemCode)
  if (hit) return Number(hit.qty) || 0
  return demoStockQty(itemCode, warehouse)
}

/** 无库存数据时的演示库存 */
function demoStockQty(itemCode, warehouse) {
  if (!itemCode) return 0
  let hash = 0
  const seed = `${warehouse}::${itemCode}`
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000
  }
  return 20 + (hash % 180)
}

export function enrichLineWithStock(line, warehouse) {
  const shipWarehouse = warehouse || line.shipWarehouse || resolvePickWarehouseForItem(line)
  const warehouseStockQty = getWarehouseStockQty(shipWarehouse, line.itemCode)
  return {
    ...line,
    shipWarehouse,
    warehouseStockQty,
  }
}

export function enrichLinesWithStock(lines = [], defaultWh = defaultPickWarehouse) {
  return lines.map((line) =>
    enrichLineWithStock(line, line.shipWarehouse || defaultWh || resolvePickWarehouseForItem(line)),
  )
}
