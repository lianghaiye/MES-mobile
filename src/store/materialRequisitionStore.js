import { getUser } from '@/utils/auth'
import { appendOutboundFromRequisition, getOutboundOrderById } from '@/utils/outboundBridge'
import { generateMaterialReqNo, formatDateTime } from '@/utils/materialRequisitionNo'
import {
  mergeMaterialLines,
  mergeMaterialLinesWithSources,
} from '@/utils/workOrderEbomMaterials'

const STORAGE_KEY = 'i_doms_mobile_material_reqs'
const SEED_VERSION_KEY = 'i_doms_mobile_material_reqs_seed_v'
const SEED_VERSION = '2'

function ensureSeedReqs() {
  try {
    if (uni.getStorageSync(SEED_VERSION_KEY) === SEED_VERSION) return
    const existing = loadReqs()
    const hasDemo = existing.some((r) => r.id === 'mr-seed-applied-1')
    if (!hasDemo) {
      existing.unshift({
        id: 'mr-seed-applied-1',
        reqNo: 'LL-SEED-001',
        mode: 'work-order',
        workOrderId: 'wo-mock-1',
        workOrderCode: 'WO-062',
        workOrderName: '立式多级离心泵生产',
        workOrderIds: ['wo-mock-1'],
        workOrders: [{ id: 'wo-mock-1', code: 'WO-062', productName: '立式多级离心泵', scheduleQty: 10 }],
        salesOrderNo: '1-20260602-001',
        productName: '立式多级离心泵',
        orderCategory: '生产工单',
        workshop: '机加车间',
        receiveWarehouse: '库线边仓',
        remark: '演示：已申请领料标记',
        lineCount: 1,
        totalQty: 10,
        lines: [],
        outboundId: '',
        outboundDocNo: '',
        outboundStatus: '待处理',
        auditStatus: '审核通过',
        rejectReason: '',
        applicant: '演示用户',
        createdAt: '2026-08-11 09:00',
      })
      saveReqs(existing)
    }
    uni.setStorageSync(SEED_VERSION_KEY, SEED_VERSION)
  } catch {
    /* ignore */
  }
}

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
  ensureSeedReqs()
  return loadReqs()
    .map(enrichRequisition)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export function getMaterialRequisitionById(id) {
  const row = loadReqs().find((r) => r.id === id)
  return row ? enrichRequisition(row) : null
}

function listOutboundRefs(row) {
  const fromList = Array.isArray(row.outboundOrders)
    ? row.outboundOrders
        .map((o) => ({
          id: o.id || '',
          docNo: o.docNo || '',
          warehouse: o.warehouse || '',
          status: o.status || '',
        }))
        .filter((o) => o.id || o.docNo)
    : []
  if (fromList.length) return fromList
  if (row.outboundId || row.outboundDocNo) {
    return [
      {
        id: row.outboundId || '',
        docNo: row.outboundDocNo || '',
        warehouse: '',
        status: row.outboundStatus || '',
      },
    ]
  }
  return []
}

function enrichRequisition(row) {
  const refs = listOutboundRefs(row)
  const enrichedRefs = refs.map((ref) => {
    const live = getOutboundOrderById(ref.id)
    return {
      id: live?.id || ref.id || '',
      docNo: live?.docNo || ref.docNo || '',
      warehouse: live?.warehouse || ref.warehouse || '',
      status: live?.status || ref.status || '',
    }
  })
  const docNos = enrichedRefs.map((r) => r.docNo).filter(Boolean)
  const statuses = enrichedRefs.map((r) => r.status).filter(Boolean)
  let outboundStatus = row.outboundStatus || '—'
  if (statuses.length) {
    outboundStatus = statuses.every((s) => s === statuses[0]) ? statuses[0] : '多单进行中'
  }
  return {
    ...row,
    outboundOrders: enrichedRefs,
    outboundStatus,
    outboundDocNo: docNos.join('、') || row.outboundDocNo || '',
    outboundId: enrichedRefs[0]?.id || row.outboundId || '',
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
  const reqId = `mr-${Date.now()}`

  const sourceOrderNo = isMulti
    ? resolveBatchSourceOrderNo(payload)
    : payload.workOrderCode || payload.salesOrderNo || ''

  const remarkBase = payload.remark
    ? `小程序领料申请：${payload.remark}`
    : `小程序领料申请（${modeLabel(payload.mode)}）`

  const autoApprove = isMaterialRequisitionAutoApprove()
  const auditStatus = autoApprove ? '审核通过' : '待审核'

  let outboundResult = { ok: true, order: null, orders: [] }
  if (autoApprove) {
    outboundResult = appendOutboundFromRequisition({
      id: outboundId,
      materialReqId: reqId,
      materialReqNo: reqNo,
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

  const createdOrders = outboundResult.orders || (outboundResult.order ? [outboundResult.order] : [])
  const outboundRefs = createdOrders.map((o) => ({
    id: o.id,
    docNo: o.docNo,
    warehouse: o.warehouse || '',
    status: o.status || '',
  }))

  const record = {
    id: reqId,
    reqNo,
    mode: payload.mode,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    workOrderIds: payload.workOrderIds || [],
    workOrders: payload.workOrders || [],
    salesOrderNo: payload.salesOrderNo || '',
    productName: payload.productName || '',
    productCode: payload.productCode || '',
    specModel: payload.specModel || '',
    material: payload.material || '',
    drawingNo: payload.drawingNo || '',
    orderCategory: payload.orderCategory || '',
    workshop,
    receiveWarehouse: payload.receiveWarehouse || '',
    remark: payload.remark || '',
    lineCount: lines.length,
    totalQty: lines.reduce((s, l) => s + (Number(l.shipQty) || 0), 0),
    lines,
    outboundOrders: outboundRefs,
    outboundId: outboundRefs[0]?.id || '',
    outboundDocNo: outboundRefs.map((r) => r.docNo).filter(Boolean).join('、'),
    outboundStatus: outboundRefs.length
      ? outboundRefs.every((r) => r.status === outboundRefs[0].status)
        ? outboundRefs[0].status
        : '多单进行中'
      : '—',
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
  return { ok: true, record, order: createdOrders[0] || null, orders: createdOrders }
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
