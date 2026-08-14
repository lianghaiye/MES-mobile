import { generateInboundDocNo, formatDateTime, createInboundTaskId } from '@/utils/productInboundNo'
import { upsertInboundTask } from '@/utils/inboundTaskStore'
import { resolveInboundTypeByProduct } from '@/utils/resolveInboundType'

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
    workOrders: [],
    lineItems: [],
    sourceChannel: 'mini-program',
    ...partial,
  }
}

function snapshotWorkOrders(workOrders = []) {
  return (workOrders || []).map((wo) => ({
    id: wo.id || wo.workOrderId || '',
    code: wo.code || wo.workOrderCode || '',
    productName: wo.productName || wo.name || '',
    productCode: wo.productCode || wo.materialCode || '',
    specModel: wo.specModel || wo.spec || '',
    material: wo.material || '',
    drawingNo: wo.drawingNo || '',
    bom: wo.bom || wo.bomLabel || '',
    planQty: wo.planQty ?? wo.scheduleQty ?? 0,
    scheduleQty: wo.scheduleQty ?? wo.planQty ?? 0,
    salesOrderNo: wo.salesOrderNo || '',
  }))
}

function filterWorkOrdersForLines(allWorkOrders, lineItems) {
  const all = snapshotWorkOrders(allWorkOrders)
  if (!all.length) return []
  const ids = new Set()
  const codes = new Set()
  ;(lineItems || []).forEach((line) => {
    ;(line.sourceWorkOrders || []).forEach((s) => {
      if (s.workOrderId) ids.add(String(s.workOrderId))
      if (s.workOrderCode) codes.add(String(s.workOrderCode))
    })
    if (line.sourceDocNo) codes.add(String(line.sourceDocNo))
  })
  if (!ids.size && !codes.size) return all
  const filtered = all.filter(
    (w) => (w.id && ids.has(String(w.id))) || (w.code && codes.has(String(w.code))),
  )
  return filtered.length ? filtered : all
}

/**
 * 将小程序成品/半成品入库写入 WEB 入库单存储
 * 按「入库类型 + 仓库」拆分（一仓一类型一张）
 * @returns {{ ok: boolean, order?: object, orders?: object[], taskId?: string, message?: string }}
 */
export function appendInboundFromMiniProgram(payload) {
  if (!payload.lineItems?.length) {
    return { ok: false, message: '请至少添加一条入库明细' }
  }

  const mappedLines = payload.lineItems.map((line) => {
    const inboundType =
      line.inboundType ||
      resolveInboundTypeByProduct({
        itemCode: line.itemCode,
        itemName: line.itemName,
        materialType: line.materialType,
        warehouse: line.warehouse || payload.warehouse,
      })
    return createInboundLine({
      ...line,
      qty: Number(line.qty) || 0,
      warehouse: String(line.warehouse || payload.warehouse || '').trim(),
      inboundType,
      lineSource: payload.workOrderCode ? '工单入库' : '快速入库',
      sourceDocNo: line.sourceDocNo || payload.workOrderCode || '',
    })
  })

  const invalid = mappedLines.find((line) => !line.warehouse || !line.qty || line.qty <= 0)
  if (invalid) {
    return { ok: false, message: '请完善入库仓库和入库数量' }
  }

  const groups = new Map()
  mappedLines.forEach((line) => {
    const inboundType = line.inboundType || '成品入库'
    const wh = line.warehouse
    const key = `${inboundType}::${wh}`
    if (!groups.has(key)) groups.set(key, { inboundType, warehouse: wh, lines: [] })
    groups.get(key).lines.push(line)
  })

  const orders = loadInboundOrders()
  const created = []
  let index = 0
  const taskId = payload.miniProgramTaskId || createInboundTaskId()
  const remarkBase = payload.remark || '小程序入库'
  const baseId = payload.inboundId || `ib-${Date.now()}`
  const allWorkOrders = payload.workOrders || []

  for (const { inboundType, warehouse, lines: lineItems } of groups.values()) {
    index += 1
    const docNo = generateInboundDocNo(orders.concat(created))
    if (orders.concat(created).some((o) => o.docNo === docNo)) {
      return { ok: false, message: '入库单号已存在' }
    }
    const typeLabel = inboundType === '半成品入库' ? '半成品' : '成品'
    let remark = remarkBase
    if (groups.size > 1) {
      remark = `${remarkBase}（${typeLabel} / 仓库：${warehouse}）`
    } else if (inboundType === '半成品入库' && !String(remarkBase).includes('半成品')) {
      remark = remarkBase.replace(/成品入库/g, '半成品入库')
    }
    const workOrders = filterWorkOrdersForLines(allWorkOrders, lineItems)
    const order = createInboundOrder({
      id: groups.size > 1 ? `${baseId}-${index}` : baseId,
      docNo,
      inboundType,
      status: '待审批',
      warehouse,
      warehouseKeeper: payload.warehouseKeeper || payload.handler || '',
      itemType: inboundType === '半成品入库' ? '物料' : '产品',
      sourceOrderNo: payload.workOrderCode || '',
      sourceType: payload.workOrderCode ? '生产工单' : '小程序',
      sourceWorkshop: payload.workshop || '',
      handler: payload.handler || payload.creator || '',
      creator: payload.creator || payload.handler || '',
      remark,
      miniProgramTaskId: taskId,
      sourceChannel: 'mini-program',
      workOrders,
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
    inboundTypes: [...new Set(created.map((o) => o.inboundType))],
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
