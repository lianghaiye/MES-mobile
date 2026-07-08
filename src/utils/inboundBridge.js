import { generateInboundDocNo, formatDateTime, createInboundTaskId } from '@/utils/productInboundNo'
import { upsertInboundTask } from '@/utils/inboundTaskStore'

export const INBOUND_STORAGE_KEY = 'i_doms_inbound_orders'

function loadInboundOrders() {
  try {
    const raw = uni.getStorageSync(INBOUND_STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.orders || []
  } catch {
    return []
  }
}

function saveInboundOrders(orders) {
  uni.setStorageSync(INBOUND_STORAGE_KEY, JSON.stringify({ orders }))
}

function createInboundLine(partial = {}) {
  return {
    id: `ib-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: '',
    itemName: '',
    specAttr: '',
    specModel: '',
    material: '',
    drawingNo: '',
    qty: 1,
    weight: null,
    unit: '件',
    unitPrice: null,
    totalPrice: null,
    lineSource: '',
    sourceDocNo: '',
    stockQty: null,
    warehouseStockQty: null,
    barcodeBatchNo: '',
    productionDate: '',
    expiryDate: '',
    lineRemark: '',
    warehouse: '',
    ...partial,
  }
}

function createInboundOrder(partial = {}) {
  const now = formatDateTime()
  const today = now.slice(0, 10)
  return {
    id: '',
    docNo: '',
    inboundType: '成品入库',
    status: '待审批',
    warehouse: undefined,
    warehouseKeeper: '',
    inboundDate: today,
    deliveryDate: '',
    itemType: '产品',
    supplier: undefined,
    sourceOrderNo: '',
    sourceType: '',
    sourceWorkshop: '',
    invoiceNo: '',
    handler: '',
    creator: '',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    approver: '',
    approvedAt: '',
    remark: '',
    miniProgramTaskId: '',
    purchaseOrderId: '',
    lineItems: [],
    sourceChannel: 'mini-program',
    ...partial,
  }
}

/**
 * 将小程序成品入库写入 WEB 入库单存储
 * @returns {{ ok: boolean, order?: object, taskId?: string, message?: string }}
 */
export function appendInboundFromMiniProgram(payload) {
  const orders = loadInboundOrders()
  const docNo = payload.docNo || generateInboundDocNo(orders)
  if (orders.some((o) => o.docNo === docNo)) {
    return { ok: false, message: '入库单号已存在' }
  }
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条入库明细' }
  }

  const lineItems = payload.lineItems.map((line) =>
    createInboundLine({
      ...line,
      qty: Number(line.qty) || 0,
      warehouse: line.warehouse || payload.warehouse || '',
      lineSource: payload.workOrderCode ? '工单入库' : '快速入库',
      sourceDocNo: payload.workOrderCode || '',
    }),
  )

  const invalid = lineItems.find((line) => !line.warehouse || !line.qty || line.qty <= 0)
  if (invalid) {
    return { ok: false, message: '请完善入库仓库和入库数量' }
  }

  const headerWarehouse =
    payload.warehouse || lineItems.find((line) => line.warehouse)?.warehouse || ''
  const taskId = payload.miniProgramTaskId || createInboundTaskId()
  const inboundId = payload.inboundId || `ib-${Date.now()}`

  const order = createInboundOrder({
    id: inboundId,
    docNo,
    inboundType: '成品入库',
    status: '待审批',
    warehouse: headerWarehouse || undefined,
    warehouseKeeper: payload.warehouseKeeper || payload.handler || '',
    itemType: '产品',
    sourceOrderNo: payload.workOrderCode || '',
    sourceType: payload.workOrderCode ? '生产工单' : '小程序',
    sourceWorkshop: payload.workshop || '',
    handler: payload.handler || payload.creator || '',
    creator: payload.creator || payload.handler || '',
    remark: payload.remark || '小程序成品入库',
    miniProgramTaskId: taskId,
    sourceChannel: 'mini-program',
    lineItems,
  })

  orders.unshift(order)
  saveInboundOrders(orders)

  upsertInboundTask({
    id: taskId,
    status: '已提交',
    inboundId: order.id,
    inboundDocNo: order.docNo,
    inboundStatus: order.status,
    workOrderCode: payload.workOrderCode || '',
    productName: payload.productName || lineItems[0]?.itemName || '',
    mode: payload.mode || '',
    workshop: payload.workshop || '',
    createdAt: order.createdAt,
  })

  return { ok: true, order, taskId }
}

export function getInboundOrderById(id) {
  if (!id) return null
  return loadInboundOrders().find((o) => o.id === id) || null
}

export function getInboundOrderByDocNo(docNo) {
  if (!docNo) return null
  return loadInboundOrders().find((o) => o.docNo === docNo) || null
}
