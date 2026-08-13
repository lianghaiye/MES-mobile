import { generateOutboundDocNo, formatDateTime } from '@/utils/materialRequisitionNo'

export const OUTBOUND_STORAGE_KEY = 'i_doms_outbound_orders'

function loadOutboundOrders() {
  try {
    const raw = uni.getStorageSync(OUTBOUND_STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.orders || []
  } catch {
    return []
  }
}

function saveOutboundOrders(orders) {
  uni.setStorageSync(OUTBOUND_STORAGE_KEY, JSON.stringify({ orders }))
}

function createOutboundLine(partial = {}) {
  return {
    id: `ob-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemName: '',
    itemCode: '',
    itemType: '物料',
    specAttr: '',
    specModel: '',
    material: '',
    drawingNo: '',
    barcodeBatchNo: '',
    shipQty: 1,
    weight: null,
    shipWarehouse: '',
    unit: '件',
    unitPrice: null,
    totalPrice: null,
    lineSource: '',
    costAmount: null,
    costUnitPrice: null,
    purpose: '',
    sourceDocNo: '',
    itemId: '',
    stockQty: null,
    warehouseStockQty: null,
    ...partial,
  }
}

function createOutboundOrder(partial = {}) {
  const now = formatDateTime()
  return {
    projectNo: '',
    outboundType: '领料出库',
    docNo: '',
    warehouse: '',
    handler: '',
    requisitionDept: '',
    sourceOrderNo: '',
    salesOrderNo: '',
    customerName: '',
    itemType: '',
    totalWeight: null,
    status: '待处理',
    createdAt: now,
    completedAt: '',
    auditDate: '',
    auditor: '',
    warehouseKeeper: '',
    workshop: '',
    receiveWarehouse: '',
    remark: '',
    outboundTime: now,
    creator: '',
    lineItems: [],
    factoryQcId: '',
    sourceChannel: 'mini-program',
    ...partial,
  }
}

/**
 * 将小程序领料申请写入 WEB 出库单存储（按领料仓库拆分，一仓一张）
 * @returns {{ ok: boolean, order?: object, orders?: object[], message?: string }}
 */
export function appendOutboundFromRequisition(payload) {
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条明细' }
  }

  const mappedLines = payload.lineItems.map((line) =>
    createOutboundLine({
      ...line,
      shipQty: Number(line.shipQty) || 0,
      shipWarehouse:
        String(line.shipWarehouse || payload.warehouse || '').trim() || '未指定仓库',
    }),
  )

  const groups = new Map()
  mappedLines.forEach((line) => {
    const wh = line.shipWarehouse
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push(line)
  })

  const orders = loadOutboundOrders()
  const created = []
  let index = 0
  const remarkBase = payload.remark || '小程序领料申请'
  const status = resolveMiniOutboundStatus()

  for (const [warehouse, lineItems] of groups) {
    index += 1
    const docNo = generateOutboundDocNo(orders.concat(created))
    if (orders.concat(created).some((o) => o.docNo === docNo)) {
      return { ok: false, message: '出库单号已存在' }
    }
    const remark = groups.size > 1 ? `${remarkBase}（仓库：${warehouse}）` : remarkBase
    const order = createOutboundOrder({
      id: payload.id
        ? `${payload.id}-${index}`
        : `ob-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
      docNo,
      outboundType: '领料出库',
      status,
      warehouse,
      handler: payload.handler || payload.creator || '',
      creator: payload.creator || payload.handler || '',
      warehouseKeeper: payload.warehouseKeeper || payload.handler || '',
      requisitionDept: payload.requisitionDept || payload.workshop || '',
      workshop: payload.workshop || payload.requisitionDept || '默认工厂',
      receiveWarehouse: payload.receiveWarehouse || '',
      sourceOrderNo: payload.sourceOrderNo || '',
      materialReqId: payload.materialReqId || '',
      materialReqNo: payload.materialReqNo || '',
      remark,
      sourceChannel: 'mini-program',
      lineItems,
    })
    created.push(order)
  }

  orders.unshift(...created)
  saveOutboundOrders(orders)
  return { ok: true, order: created[0] || null, orders: created }
}

function resolveMiniOutboundStatus() {
  try {
    const raw = uni.getStorageSync('i_doms_business_rules')
    if (!raw) return '待处理'
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed?.productionMode === 'minimal') return '待出库'
  } catch {
    /* ignore */
  }
  return '待处理'
}

export function getOutboundOrderById(id) {
  if (!id) return null
  return loadOutboundOrders().find((o) => o.id === id) || null
}

export function getOutboundOrderByDocNo(docNo) {
  if (!docNo) return null
  return loadOutboundOrders().find((o) => o.docNo === docNo) || null
}
