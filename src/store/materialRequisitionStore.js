import { getUser } from '@/utils/auth'
import { appendOutboundFromRequisition, getOutboundOrderById } from '@/utils/outboundBridge'
import { generateMaterialReqNo, formatDateTime } from '@/utils/materialRequisitionNo'
import { mergeMaterialLines } from '@/utils/workOrderEbomMaterials'

const STORAGE_KEY = 'i_doms_mobile_material_reqs'

function loadReqs() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.items || []
  } catch {
    return []
  }
}

function saveReqs(items) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify({ items }))
}

function currentUserName() {
  const user = getUser()
  return user?.displayName || user?.username || '工人'
}

export function listMaterialRequisitions() {
  return loadReqs()
    .map(enrichRequisition)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export function getMaterialRequisitionById(id) {
  const row = loadReqs().find((r) => r.id === id)
  return row ? enrichRequisition(row) : null
}

function enrichRequisition(row) {
  const outbound = row.outboundId ? getOutboundOrderById(row.outboundId) : null
  return {
    ...row,
    outboundStatus: outbound?.status || row.outboundStatus || '—',
    outboundDocNo: outbound?.docNo || row.outboundDocNo || '',
  }
}

/**
 * @param {object} payload
 * @param {'work-order'|'quick'} payload.mode
 */
export function submitMaterialRequisition(payload) {
  const lines = mergeMaterialLines(payload.lines || [])
  if (!lines.length) {
    return { ok: false, message: '请至少添加一条领料明细' }
  }
  for (const line of lines) {
    if (!Number(line.shipQty) || Number(line.shipQty) <= 0) {
      return { ok: false, message: `「${line.itemName || line.itemCode}」领料数量须大于 0` }
    }
  }

  const existing = loadReqs()
  const reqNo = generateMaterialReqNo(existing)
  const userName = currentUserName()
  const workshop = payload.workshop || payload.requisitionDept || '默认工厂'
  const outboundId = `ob-${Date.now()}`

  const outboundResult = appendOutboundFromRequisition({
    id: outboundId,
    handler: userName,
    creator: userName,
    warehouseKeeper: userName,
    workshop,
    requisitionDept: workshop,
    receiveWarehouse: payload.receiveWarehouse || '',
    sourceOrderNo: payload.workOrderCode || '',
    warehouse: payload.warehouse || '',
    remark: payload.remark
      ? `小程序领料申请：${payload.remark}`
      : `小程序领料申请（${payload.mode === 'quick' ? '快速领料' : '工单领料'}）`,
    lineItems: lines.map((line) => ({
      itemCode: line.itemCode,
      itemName: line.itemName,
      itemType: line.itemType || '物料',
      specModel: line.specModel,
      specAttr: line.specAttr || '',
      material: line.material,
      drawingNo: line.drawingNo,
      shipQty: line.shipQty,
      unit: line.unit || '件',
      shipWarehouse: line.shipWarehouse || payload.warehouse || '',
      stockQty: line.warehouseStockQty ?? null,
      warehouseStockQty: line.warehouseStockQty ?? null,
      lineSource: line.lineSource === 'EBOM' ? '工单领料' : '手工添加',
      sourceDocNo: payload.workOrderCode || '',
      itemId: line.itemId || '',
    })),
  })

  if (!outboundResult.ok) {
    return outboundResult
  }

  const record = {
    id: `mr-${Date.now()}`,
    reqNo,
    mode: payload.mode,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    productName: payload.productName || '',
    orderCategory: payload.orderCategory || '',
    workshop,
    receiveWarehouse: payload.receiveWarehouse || '',
    remark: payload.remark || '',
    lineCount: lines.length,
    totalQty: lines.reduce((s, l) => s + (Number(l.shipQty) || 0), 0),
    lines,
    outboundId: outboundResult.order.id,
    outboundDocNo: outboundResult.order.docNo,
    outboundStatus: outboundResult.order.status,
    applicant: userName,
    createdAt: formatDateTime(),
  }

  existing.unshift(record)
  saveReqs(existing)
  return { ok: true, record, order: outboundResult.order }
}
