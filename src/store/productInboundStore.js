import { getUser } from '@/utils/auth'
import { appendInboundFromMiniProgram, getInboundOrderById } from '@/utils/inboundBridge'
import { getInboundTaskById } from '@/utils/inboundTaskStore'
import { generateProductInboundNo, formatDateTime } from '@/utils/productInboundNo'

const STORAGE_KEY = 'i_doms_mobile_product_inbounds'

function loadRecords() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.items || []
  } catch {
    return []
  }
}

function saveRecords(items) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify({ items }))
}

function currentUserName() {
  const user = getUser()
  return user?.displayName || user?.username || '工人'
}

function enrichRecord(row) {
  const inbound = row.inboundId ? getInboundOrderById(row.inboundId) : null
  const task = row.miniProgramTaskId ? getInboundTaskById(row.miniProgramTaskId) : null
  return {
    ...row,
    inboundStatus: inbound?.status || task?.inboundStatus || row.inboundStatus || '—',
    inboundDocNo: inbound?.docNo || row.inboundDocNo || '',
  }
}

export function listProductInbounds() {
  return loadRecords()
    .map(enrichRecord)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export function getProductInboundById(id) {
  const row = loadRecords().find((r) => r.id === id)
  return row ? enrichRecord(row) : null
}

/**
 * @param {object} payload
 * @param {'work-order'|'quick'} payload.mode
 */
export function submitProductInbound(payload) {
  const lines = (payload.lines || []).filter((line) => line.itemCode)
  if (!lines.length) {
    return { ok: false, message: '请添加入库产品' }
  }
  for (const line of lines) {
    if (!line.warehouse) {
      return { ok: false, message: `「${line.itemName || line.itemCode}」请选择入库仓库` }
    }
    if (!Number(line.qty) || Number(line.qty) <= 0) {
      return { ok: false, message: `「${line.itemName || line.itemCode}」入库数量须大于 0` }
    }
  }

  const existing = loadRecords()
  const inboundNo = generateProductInboundNo(existing)
  const userName = currentUserName()
  const workshop = payload.workshop || '默认工厂'
  const inboundId = `ib-${Date.now()}`
  const miniProgramTaskId = `mp-task-${Date.now()}`

  const inboundResult = appendInboundFromMiniProgram({
    inboundId,
    miniProgramTaskId,
    mode: payload.mode,
    handler: userName,
    creator: userName,
    warehouseKeeper: userName,
    workshop,
    workOrderCode: payload.workOrderCode || '',
    productName: payload.productName || lines[0]?.itemName || '',
    remark: payload.remark
      ? `小程序成品入库：${payload.remark}`
      : `小程序成品入库（${payload.mode === 'quick' ? '快速入库' : '工单入库'}）`,
    warehouse: lines.length === 1 ? lines[0].warehouse : '',
    lineItems: lines.map((line) => ({
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: '产品',
      specModel: line.specModel,
      specAttr: line.specAttr || '',
      material: line.material,
      drawingNo: line.drawingNo,
      qty: line.qty,
      unit: line.unit || '件',
      warehouse: line.warehouse,
      unitPrice: line.unitPrice ?? null,
      weight: line.weight ?? null,
    })),
  })

  if (!inboundResult.ok) {
    return inboundResult
  }

  const record = {
    id: `pi-${Date.now()}`,
    inboundNo,
    mode: payload.mode,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    productName: payload.productName || lines[0]?.itemName || '',
    productCode: payload.productCode || lines[0]?.itemCode || '',
    orderCategory: payload.orderCategory || '',
    workshop,
    remark: payload.remark || '',
    lineCount: lines.length,
    totalQty: lines.reduce((s, l) => s + (Number(l.qty) || 0), 0),
    lines,
    inboundId: inboundResult.order.id,
    inboundDocNo: inboundResult.order.docNo,
    inboundStatus: inboundResult.order.status,
    miniProgramTaskId: inboundResult.taskId,
    applicant: userName,
    createdAt: formatDateTime(),
  }

  existing.unshift(record)
  saveRecords(existing)
  return { ok: true, record, order: inboundResult.order }
}
