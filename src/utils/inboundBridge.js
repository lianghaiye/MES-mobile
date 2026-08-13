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
 * 将小程序成品入库写入 WEB 入库单存储（按入库仓库拆分，一仓一张）
 * @returns {{ ok: boolean, order?: object, orders?: object[], taskId?: string, message?: string }}
 */
export function appendInboundFromMiniProgram(payload) {
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条入库明细' }
  }

  const mappedLines = payload.lineItems.map((line) =>
    createInboundLine({
      ...line,
      qty: Number(line.qty) || 0,
      warehouse: String(line.warehouse || payload.warehouse || '').trim(),
      lineSource: payload.workOrderCode ? '工单入库' : '快速入库',
      sourceDocNo: payload.workOrderCode || '',
    }),
  )

  const invalid = mappedLines.find((line) => !line.warehouse || !line.qty || line.qty <= 0)
  if (invalid) {
    return { ok: false, message: '请完善入库仓库和入库数量' }
  }

  const groups = new Map()
  mappedLines.forEach((line) => {
    const wh = line.warehouse
    if (!groups.has(wh)) groups.set(wh, [])
    groups.get(wh).push(line)
  })

  const orders = loadInboundOrders()
  const created = []
  let index = 0
  const taskId = payload.miniProgramTaskId || createInboundTaskId()
  const remarkBase = payload.remark || '小程序成品入库'
  const baseId = payload.inboundId || `ib-${Date.now()}`

  for (const [warehouse, lineItems] of groups) {
    index += 1
    const docNo = generateInboundDocNo(orders.concat(created))
    if (orders.concat(created).some((o) => o.docNo === docNo)) {
      return { ok: false, message: '入库单号已存在' }
    }
    const remark = groups.size > 1 ? `${remarkBase}（仓库：${warehouse}）` : remarkBase
    const order = createInboundOrder({
      id: groups.size > 1 ? `${baseId}-${index}` : baseId,
      docNo,
      inboundType: '成品入库',
      status: '待审批',
      warehouse,
      warehouseKeeper: payload.warehouseKeeper || payload.handler || '',
      itemType: '产品',
      sourceOrderNo: payload.workOrderCode || '',
      sourceType: payload.workOrderCode ? '生产工单' : '小程序',
      sourceWorkshop: payload.workshop || '',
      handler: payload.handler || payload.creator || '',
      creator: payload.creator || payload.handler || '',
      remark,
      miniProgramTaskId: taskId,
      sourceChannel: 'mini-program',
      lineItems,
    })
    created.push(order)
  }

  orders.unshift(...created)
  saveInboundOrders(orders)

  upsertInboundTask({
    id: taskId,
    status: '已提交',
    inboundId: created[0]?.id || '',
    inboundDocNo: created.map((o) => o.docNo).filter(Boolean).join('、'),
    inboundOrderIds: created.map((o) => o.id),
    inboundStatus: created[0]?.status || '待审批',
    workOrderCode: payload.workOrderCode || '',
    productName: payload.productName || created[0]?.lineItems?.[0]?.itemName || '',
    mode: payload.mode || '',
    workshop: payload.workshop || '',
    createdAt: created[0]?.createdAt || formatDateTime(),
  })

  return { ok: true, order: created[0] || null, orders: created, taskId }
}

export function getInboundOrderById(id) {
  if (!id) return null
  return loadInboundOrders().find((o) => o.id === id) || null
}

export function getInboundOrderByDocNo(docNo) {
  if (!docNo) return null
  return loadInboundOrders().find((o) => o.docNo === docNo) || null
}
