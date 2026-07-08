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
 * 将小程序领料申请写入 WEB 出库单存储
 * @returns {{ ok: boolean, order?: object, message?: string }}
 */
export function appendOutboundFromRequisition(payload) {
  const orders = loadOutboundOrders()
  const docNo = payload.docNo || generateOutboundDocNo(orders)
  if (orders.some((o) => o.docNo === docNo)) {
    return { ok: false, message: '出库单号已存在' }
  }
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条明细' }
  }

  const lineItems = payload.lineItems.map((line) =>
    createOutboundLine({
      ...line,
      shipQty: Number(line.shipQty) || 0,
      shipWarehouse: line.shipWarehouse || payload.warehouse || '',
    }),
  )

  const order = createOutboundOrder({
    id: payload.id || `ob-${Date.now()}`,
    docNo,
    outboundType: '领料出库',
    status: '待处理',
    warehouse: payload.warehouse || lineItems.find((l) => l.shipWarehouse)?.shipWarehouse || '',
    handler: payload.handler || payload.creator || '',
    creator: payload.creator || payload.handler || '',
    warehouseKeeper: payload.warehouseKeeper || payload.handler || '',
    requisitionDept: payload.requisitionDept || payload.workshop || '',
    workshop: payload.workshop || payload.requisitionDept || '默认工厂',
    receiveWarehouse: payload.receiveWarehouse || '',
    sourceOrderNo: payload.sourceOrderNo || '',
    remark: payload.remark || '小程序领料申请',
    sourceChannel: 'mini-program',
    lineItems,
  })

  orders.unshift(order)
  saveOutboundOrders(orders)
  return { ok: true, order }
}

export function getOutboundOrderById(id) {
  if (!id) return null
  return loadOutboundOrders().find((o) => o.id === id) || null
}

export function getOutboundOrderByDocNo(docNo) {
  if (!docNo) return null
  return loadOutboundOrders().find((o) => o.docNo === docNo) || null
}
