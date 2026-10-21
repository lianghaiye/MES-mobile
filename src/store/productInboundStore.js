/**
 * 成品入库申请（与 WEB 共用 storage key：i_doms_mobile_finished_inbounds）
 * 对齐领料申请：小程序提交 → 功能参数控制是否自动审核 → 通过后生成入库单。
 */
import { getUser } from '@/utils/auth'
import { appendInboundFromMiniProgram, getInboundOrderById } from '@/utils/inboundBridge'
import { getInboundTaskById } from '@/utils/inboundTaskStore'
import { generateFinishedInboundReqNo, formatDateTime } from '@/utils/productInboundNo'
import { mergeProductInboundLinesWithSources } from '@/utils/productInboundHelpers'

const STORAGE_KEY = 'i_doms_mobile_finished_inbounds'
const LEGACY_STORAGE_KEY = 'i_doms_mobile_product_inbounds'
const SEED_VERSION_KEY = 'i_doms_mobile_finished_inbounds_seed_v'
const SEED_VERSION = '1'

function ensureSeedRecords() {
  try {
    if (uni.getStorageSync(SEED_VERSION_KEY) === SEED_VERSION) return
    const existing = loadRecords()
    const hasDemo = existing.some((r) => r.id === 'fi-seed-mobile-1' || r.id === 'pi-seed-applied-1')
    if (!hasDemo) {
      existing.unshift({
        id: 'fi-seed-mobile-1',
        reqNo: 'FI202608110001',
        inboundNo: 'FI202608110001',
        mode: 'work-order',
        workOrderId: 'wo-done-1',
        workOrderCode: 'WO20260608001',
        workOrderName: '清水离心泵生产',
        workOrderIds: ['wo-done-1'],
        workOrders: [
          {
            id: 'wo-done-1',
            code: 'WO20260608001',
            productName: '清水离心泵 ISG50-160',
            productCode: 'CP2610001',
            specModel: 'ISG50-160',
            material: '',
            drawingNo: '',
            planQty: 10,
            scheduleQty: 10,
          },
        ],
        salesOrderNo: '1-20260602-001',
        productName: '清水离心泵 ISG50-160',
        productCode: 'CP2610001',
        specModel: 'ISG50-160',
        orderCategory: '生产工单',
        workshop: '总装车间',
        warehouse: '成品主仓',
        remark: '演示：成品入库申请',
        lineCount: 1,
        totalQty: 10,
        lines: [],
        inboundId: '',
        inboundDocNo: '',
        inboundStatus: '—',
        auditStatus: '待审核',
        rejectReason: '',
        miniProgramTaskId: '',
        applicant: '演示用户',
        createdAt: '2026-08-11 09:00',
        sourceChannel: 'mini-program',
      })
      saveRecords(existing)
    }
    uni.setStorageSync(SEED_VERSION_KEY, SEED_VERSION)
  } catch {
    /* ignore */
  }
}

function loadLegacyRecords() {
  try {
    const raw = uni.getStorageSync(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed?.items) ? parsed.items : []
  } catch {
    return []
  }
}

function normalizeRecord(row) {
  if (!row) return row
  const reqNo = row.reqNo || row.inboundNo || ''
  const auditStatus =
    row.auditStatus ||
    (row.inboundId || row.inboundDocNo ? '审核通过' : '待审核')
  return {
    ...row,
    reqNo,
    inboundNo: row.inboundNo || reqNo,
    auditStatus,
    rejectReason: row.rejectReason || '',
    sourceChannel: row.sourceChannel || 'mini-program',
  }
}

function loadRecords() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    let items = []
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      items = Array.isArray(parsed?.items) ? parsed.items : []
    }
    // 兼容旧版小程序独立 storage，合并进申请单池（仅首次有旧数据时）
    if (!items.length) {
      const legacy = loadLegacyRecords()
      if (legacy.length) {
        items = legacy.map((r) =>
          normalizeRecord({
            ...r,
            reqNo: r.reqNo || r.inboundNo,
            auditStatus: r.auditStatus || (r.inboundDocNo ? '审核通过' : '待审核'),
          }),
        )
        saveRecords(items)
      }
    }
    return items.map(normalizeRecord)
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

function modeLabel(mode) {
  if (mode === 'quick') return '快速入库'
  if (mode === 'batch-work-order') return '工单入库（多工单）'
  return '工单入库'
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
  if (payload.mode !== 'batch-work-order') {
    return payload.workOrderCode || ''
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

function listInboundRefs(row) {
  const fromList = Array.isArray(row.inboundOrders)
    ? row.inboundOrders
        .map((o) => ({
          id: o.id || '',
          docNo: o.docNo || '',
          warehouse: o.warehouse || '',
          status: o.status || '',
          inboundType: o.inboundType || '',
        }))
        .filter((o) => o.id || o.docNo)
    : []
  if (fromList.length) return fromList
  if (row.inboundId || row.inboundDocNo) {
    return [
      {
        id: row.inboundId || '',
        docNo: row.inboundDocNo || '',
        warehouse: row.warehouse || '',
        status: row.inboundStatus || '',
        inboundType: '',
      },
    ]
  }
  return []
}

function enrichRecord(row) {
  const normalized = normalizeRecord(row)
  const refs = listInboundRefs(normalized)
  const enrichedRefs = refs.map((ref) => {
    const live = getInboundOrderById(ref.id)
    return {
      id: live?.id || ref.id || '',
      docNo: live?.docNo || ref.docNo || '',
      warehouse: live?.warehouse || ref.warehouse || '',
      status: live?.status || ref.status || '',
      inboundType: live?.inboundType || ref.inboundType || '',
    }
  })
  const docNos = enrichedRefs.map((r) => r.docNo).filter(Boolean)
  const statuses = enrichedRefs.map((r) => r.status).filter(Boolean)
  const task = normalized.miniProgramTaskId
    ? getInboundTaskById(normalized.miniProgramTaskId)
    : null
  let inboundStatus = normalized.inboundStatus || task?.inboundStatus || '—'
  if (statuses.length) {
    inboundStatus = statuses.every((s) => s === statuses[0]) ? statuses[0] : '多单进行中'
  }
  return {
    ...normalized,
    modeLabel: modeLabel(normalized.mode),
    inboundOrders: enrichedRefs,
    inboundStatus,
    inboundDocNo: docNos.join('、') || normalized.inboundDocNo || task?.inboundDocNo || '',
    inboundId: enrichedRefs[0]?.id || normalized.inboundId || '',
  }
}

function isFinishedInboundAutoApprove() {
  try {
    const raw = uni.getStorageSync('i_doms_function_params')
    if (!raw) return false
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Boolean(parsed?.autoApproveDocs?.finishedInbound)
  } catch {
    return false
  }
}

export function resetProductInboundDemoData() {
  try {
    uni.removeStorageSync(STORAGE_KEY)
    uni.removeStorageSync(LEGACY_STORAGE_KEY)
    uni.removeStorageSync(SEED_VERSION_KEY)
  } catch {
    /* ignore */
  }
  ensureSeedRecords()
}

function matchesInboundKeyword(row, keyword) {
  const kw = String(keyword || '').trim().toLowerCase()
  if (!kw) return true
  const parts = [
    row.reqNo,
    row.inboundNo,
    row.workOrderCode,
    row.productName,
    row.productCode,
    row.drawingNo,
    ...(row.workOrders || []).map((w) => w.code || w.workOrderCode),
    ...(row.lines || []).flatMap((l) => [
      l.itemName,
      l.itemCode,
      l.productName,
      l.productCode,
      l.drawingNo,
    ]),
  ]
  return parts.filter(Boolean).join(' ').toLowerCase().includes(kw)
}

export function listProductInbounds({ keyword = '' } = {}) {
  ensureSeedRecords()
  return loadRecords()
    .map(enrichRecord)
    .filter((row) => matchesInboundKeyword(row, keyword))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

/** 别名：成品入库申请列表 */
export function listFinishedInboundApplications() {
  return listProductInbounds()
}

export function getProductInboundById(id) {
  const row = loadRecords().find((r) => r.id === id)
  return row ? enrichRecord(row) : null
}

export function getFinishedInboundApplicationById(id) {
  return getProductInboundById(id)
}

/**
 * @param {object} payload
 * @param {'work-order'|'quick'|'batch-work-order'} payload.mode
 */
export function submitProductInbound(payload) {
  const isBatch = payload.mode === 'batch-work-order'
  const mergeFn = isBatch ? mergeProductInboundLinesWithSources : (lines) => lines
  const lines = mergeFn((payload.lines || []).filter((line) => line.itemCode))
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
  const reqNo = generateFinishedInboundReqNo(existing)
  const userName = currentUserName()
  const workshop = payload.workshop || '默认工厂'
  const warehouse = payload.warehouse || lines[0]?.warehouse || '成品主仓'
  const reqId = `fi-${Date.now()}`
  const inboundId = `ib-${Date.now()}`
  const miniProgramTaskId = `mp-task-${Date.now()}`
  const autoApprove = isFinishedInboundAutoApprove()
  const auditStatus = autoApprove ? '审核通过' : '待审核'

  const sourceOrderNo = isBatch
    ? resolveBatchSourceOrderNo(payload)
    : payload.workOrderCode || ''

  const remarkBase = payload.remark
    ? `成品入库申请：${payload.remark}`
    : `成品入库申请（${modeLabel(payload.mode)}）`

  const workOrdersPayload =
    Array.isArray(payload.workOrders) && payload.workOrders.length
      ? payload.workOrders
      : payload.workOrderCode || payload.workOrderId
        ? [
            {
              id: payload.workOrderId,
              code: payload.workOrderCode,
              productName: payload.productName,
              productCode: payload.productCode,
              specModel: payload.specModel,
              material: payload.material,
              drawingNo: payload.drawingNo,
              planQty: payload.planQty ?? payload.scheduleQty,
              scheduleQty: payload.scheduleQty,
              salesOrderNo: payload.salesOrderNo,
              bom: payload.bom,
            },
          ]
        : []

  let inboundResult = { ok: true, order: null, orders: [], taskId: '' }
  if (autoApprove) {
    inboundResult = appendInboundFromMiniProgram({
      inboundId,
      miniProgramTaskId,
      mode: payload.mode,
      handler: userName,
      creator: userName,
      warehouseKeeper: userName,
      workshop,
      workOrderCode: isBatch ? sourceOrderNo : payload.workOrderCode || '',
      productName: payload.productName || lines[0]?.itemName || '',
      remark: remarkBase,
      warehouse: '',
      workOrders: workOrdersPayload,
      finishedInboundReqId: reqId,
      finishedInboundReqNo: reqNo,
      lineItems: lines.map((line) => ({
        itemCode: line.itemCode,
        itemName: line.itemName,
        itemType: line.itemType || '产品',
        materialType: line.materialType || '',
        inboundType: line.inboundType || '',
        specModel: line.specModel,
        specAttr: line.specAttr || '',
        material: line.material,
        drawingNo: line.drawingNo,
        variantSummary: line.variantSummary || '',
        qty: line.qty,
        unit: line.unit || '件',
        warehouse: line.warehouse,
        unitPrice: line.unitPrice ?? null,
        weight: line.weight ?? null,
        lineSource: '成品入库申请',
        sourceDocNo: resolveLineSourceDocNo(payload, line),
        sourceWorkOrders: line.sourceWorkOrders || [],
      })),
    })
    if (!inboundResult.ok) return inboundResult
  }

  const createdOrders = inboundResult.orders || (inboundResult.order ? [inboundResult.order] : [])
  const inboundRefs = createdOrders.map((o) => ({
    id: o.id,
    docNo: o.docNo,
    warehouse: o.warehouse || '',
    status: o.status || '',
    inboundType: o.inboundType || '',
  }))

  const record = {
    id: reqId,
    reqNo,
    inboundNo: reqNo,
    mode: payload.mode,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    workOrderIds: payload.workOrderIds || [],
    workOrders: payload.workOrders || workOrdersPayload,
    salesOrderNo: payload.salesOrderNo || '',
    productName: payload.productName || lines[0]?.itemName || '',
    productCode: payload.productCode || lines[0]?.itemCode || '',
    specModel: payload.specModel || lines[0]?.specModel || '',
    material: payload.material || lines[0]?.material || '',
    drawingNo: payload.drawingNo || lines[0]?.drawingNo || '',
    orderCategory: payload.orderCategory || '',
    workshop,
    warehouse,
    remark: payload.remark || '',
    lineCount: lines.length,
    totalQty: lines.reduce((s, l) => s + (Number(l.qty) || 0), 0),
    lines,
    inboundOrders: inboundRefs,
    inboundId: inboundRefs[0]?.id || '',
    inboundDocNo: inboundRefs.map((r) => r.docNo).filter(Boolean).join('、'),
    inboundStatus: inboundRefs.length
      ? inboundRefs.every((r) => r.status === inboundRefs[0].status)
        ? inboundRefs[0].status
        : '多单进行中'
      : '—',
    auditStatus,
    rejectReason: '',
    miniProgramTaskId: inboundResult.taskId || '',
    applicant: userName,
    createdAt: formatDateTime(),
    sourceChannel: 'mini-program',
  }

  existing.unshift(record)
  saveRecords(existing)
  return { ok: true, record: enrichRecord(record), order: createdOrders[0] || null, orders: createdOrders }
}

/** 别名：提交成品入库申请 */
export function submitFinishedInboundApplication(payload) {
  return submitProductInbound(payload)
}
