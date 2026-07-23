import { getUser } from '@/utils/auth'
import { appendOutboundFromRequisition, getOutboundOrderById } from '@/utils/outboundBridge'
import { generateMaterialReqNo, formatDateTime } from '@/utils/materialRequisitionNo'
import {
  mergeMaterialLines,
  mergeMaterialLinesWithSources,
} from '@/utils/workOrderEbomMaterials'

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

function modeLabel(mode) {
  if (mode === 'quick') return '快速领料'
  if (mode === 'sales-order') return '订单领料'
  if (mode === 'batch-work-order') return '工单领料'
  return '工单领料'
}

function resolveBatchSourceOrderNo(payload) {
  if (payload.salesOrderNo && payload.salesOrderNo !== 'MULTI') {
    return payload.salesOrderNo
  }
  const codes = (payload.workOrders || [])
    .map((wo) => wo.code)
    .filter(Boolean)
    .slice(0, 3)
  return codes.join('、')
}

function resolveLineSourceDocNo(payload, line) {
  if (payload.mode !== 'batch-work-order' && payload.mode !== 'sales-order') {
    return payload.workOrderCode || payload.salesOrderNo || ''
  }
  const sources = line.sourceWorkOrders || []
  if (sources.length === 1) return sources[0].workOrderCode || ''
  if (sources.length > 1) {
    return sources
      .map((s) => s.workOrderCode)
      .filter(Boolean)
      .slice(0, 3)
      .join('、')
  }
  return resolveBatchSourceOrderNo(payload)
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
 * @param {'work-order'|'quick'|'batch-work-order'|'sales-order'} payload.mode
 */
export function submitMaterialRequisition(payload) {
  const isMulti = payload.mode === 'batch-work-order' || payload.mode === 'sales-order'
  const mergeFn = isMulti ? mergeMaterialLinesWithSources : mergeMaterialLines
  const lines = mergeFn(payload.lines || [])
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

  const sourceOrderNo = isMulti
    ? resolveBatchSourceOrderNo(payload)
    : payload.workOrderCode || payload.salesOrderNo || ''

  const remarkBase = payload.remark
    ? `小程序领料申请：${payload.remark}`
    : `小程序领料申请（${modeLabel(payload.mode)}）`

  const autoApprove = isMaterialRequisitionAutoApprove()
  const auditStatus = autoApprove ? '审核通过' : '待审核'

  let outboundResult = { ok: true, order: null }
  if (autoApprove) {
    outboundResult = appendOutboundFromRequisition({
      id: outboundId,
      handler: userName,
      creator: userName,
      warehouseKeeper: userName,
      workshop,
      requisitionDept: workshop,
      receiveWarehouse: payload.receiveWarehouse || '',
      sourceOrderNo,
      warehouse: payload.warehouse || '',
      remark: remarkBase,
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
        sourceDocNo: resolveLineSourceDocNo(payload, line),
        itemId: line.itemId || '',
        sourceWorkOrders: line.sourceWorkOrders || [],
      })),
    })
    if (!outboundResult.ok) return outboundResult
  }

  const record = {
    id: `mr-${Date.now()}`,
    reqNo,
    mode: payload.mode,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    workOrderIds: payload.workOrderIds || [],
    workOrders: payload.workOrders || [],
    salesOrderNo: payload.salesOrderNo || '',
    productName: payload.productName || '',
    orderCategory: payload.orderCategory || '',
    workshop,
    receiveWarehouse: payload.receiveWarehouse || '',
    remark: payload.remark || '',
    lineCount: lines.length,
    totalQty: lines.reduce((s, l) => s + (Number(l.shipQty) || 0), 0),
    lines,
    outboundId: outboundResult.order?.id || '',
    outboundDocNo: outboundResult.order?.docNo || '',
    outboundStatus: outboundResult.order?.status || '—',
    auditStatus,
    rejectReason: '',
    applicant: userName,
    createdAt: formatDateTime(),
    _outboundDraft: autoApprove
      ? undefined
      : {
          remarkBase,
          sourceOrderNo,
          warehouse: payload.warehouse || '',
          lineItems: lines,
          receiveWarehouse: payload.receiveWarehouse || '',
          workshop,
        },
  }

  existing.unshift(record)
  saveReqs(existing)
  return { ok: true, record, order: outboundResult.order }
}

function isMaterialRequisitionAutoApprove() {
  try {
    const raw = uni.getStorageSync('i_doms_function_params')
    if (!raw) return false
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Boolean(parsed?.autoApproveDocs?.materialRequisition)
  } catch {
    return false
  }
}
