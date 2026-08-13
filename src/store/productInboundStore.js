import { getUser } from '@/utils/auth'
import { appendInboundFromMiniProgram, getInboundOrderById } from '@/utils/inboundBridge'
import { getInboundTaskById } from '@/utils/inboundTaskStore'
import { generateProductInboundNo, formatDateTime } from '@/utils/productInboundNo'
import { mergeProductInboundLinesWithSources } from '@/utils/productInboundHelpers'

const STORAGE_KEY = 'i_doms_mobile_product_inbounds'
const SEED_VERSION_KEY = 'i_doms_mobile_product_inbounds_seed_v'
const SEED_VERSION = '3'

function ensureSeedRecords() {
  try {
    if (uni.getStorageSync(SEED_VERSION_KEY) === SEED_VERSION) return
    const existing = loadRecords()
    const hasDemo = existing.some((r) => r.id === 'pi-seed-applied-1')
    if (!hasDemo) {
      existing.unshift({
        id: 'pi-seed-applied-1',
        inboundNo: 'CPRK-SEED-001',
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
        remark: '演示：已申请入库标记',
        lineCount: 1,
        totalQty: 10,
        lines: [],
        inboundId: '',
        inboundDocNo: '',
        inboundStatus: '待处理',
        miniProgramTaskId: '',
        applicant: '演示用户',
        createdAt: '2026-08-11 09:00',
      })
      saveRecords(existing)
    } else {
      // 升级已有演示种子的工单清单字段
      const row = existing.find((r) => r.id === 'pi-seed-applied-1')
      if (row) {
        row.workOrders = [
          {
            id: row.workOrderId || 'wo-done-1',
            code: row.workOrderCode || 'WO20260608001',
            productName: row.productName || '清水离心泵 ISG50-160',
            productCode: row.productCode || 'CP2610001',
            specModel: row.specModel || 'ISG50-160',
            material: row.material || '',
            drawingNo: row.drawingNo || '',
            planQty: 10,
            scheduleQty: 10,
          },
        ]
        saveRecords(existing)
      }
    }
    uni.setStorageSync(SEED_VERSION_KEY, SEED_VERSION)
  } catch {
    /* ignore */
  }
}

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

function modeLabel(mode) {
  if (mode === 'quick') return '快速入库'
  if (mode === 'batch-work-order') return '批量入库'
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
        }))
        .filter((o) => o.id || o.docNo)
    : []
  if (fromList.length) return fromList
  if (row.inboundId || row.inboundDocNo) {
    return [
      {
        id: row.inboundId || '',
        docNo: row.inboundDocNo || '',
        warehouse: '',
        status: row.inboundStatus || '',
      },
    ]
  }
  return []
}

function enrichRecord(row) {
  const refs = listInboundRefs(row)
  const enrichedRefs = refs.map((ref) => {
    const live = getInboundOrderById(ref.id)
    return {
      id: live?.id || ref.id || '',
      docNo: live?.docNo || ref.docNo || '',
      warehouse: live?.warehouse || ref.warehouse || '',
      status: live?.status || ref.status || '',
    }
  })
  const docNos = enrichedRefs.map((r) => r.docNo).filter(Boolean)
  const statuses = enrichedRefs.map((r) => r.status).filter(Boolean)
  const task = row.miniProgramTaskId ? getInboundTaskById(row.miniProgramTaskId) : null
  let inboundStatus = row.inboundStatus || task?.inboundStatus || '—'
  if (statuses.length) {
    inboundStatus = statuses.every((s) => s === statuses[0]) ? statuses[0] : '多单进行中'
  }
  return {
    ...row,
    inboundOrders: enrichedRefs,
    inboundStatus,
    inboundDocNo: docNos.join('、') || row.inboundDocNo || task?.inboundDocNo || '',
    inboundId: enrichedRefs[0]?.id || row.inboundId || '',
  }
}

export function listProductInbounds() {
  ensureSeedRecords()
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
  const inboundNo = generateProductInboundNo(existing)
  const userName = currentUserName()
  const workshop = payload.workshop || '默认工厂'
  const inboundId = `ib-${Date.now()}`
  const miniProgramTaskId = `mp-task-${Date.now()}`

  const sourceOrderNo = isBatch
    ? resolveBatchSourceOrderNo(payload)
    : payload.workOrderCode || ''

  const remarkBase = payload.remark
    ? `小程序成品入库：${payload.remark}`
    : `小程序成品入库（${modeLabel(payload.mode)}）`

  const inboundResult = appendInboundFromMiniProgram({
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
      lineSource: '工单入库',
      sourceDocNo: resolveLineSourceDocNo(payload, line),
      sourceWorkOrders: line.sourceWorkOrders || [],
    })),
  })

  if (!inboundResult.ok) {
    return inboundResult
  }

  const createdOrders = inboundResult.orders || (inboundResult.order ? [inboundResult.order] : [])
  const inboundRefs = createdOrders.map((o) => ({
    id: o.id,
    docNo: o.docNo,
    warehouse: o.warehouse || '',
    status: o.status || '',
  }))

  const record = {
    id: `pi-${Date.now()}`,
    inboundNo,
    mode: payload.mode,
    workOrderId: payload.workOrderId || '',
    workOrderCode: payload.workOrderCode || '',
    workOrderName: payload.workOrderName || '',
    workOrderIds: payload.workOrderIds || [],
    workOrders: payload.workOrders || [],
    salesOrderNo: payload.salesOrderNo || '',
    productName: payload.productName || lines[0]?.itemName || '',
    productCode: payload.productCode || lines[0]?.itemCode || '',
    specModel: payload.specModel || lines[0]?.specModel || '',
    material: payload.material || lines[0]?.material || '',
    drawingNo: payload.drawingNo || lines[0]?.drawingNo || '',
    orderCategory: payload.orderCategory || '',
    workshop,
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
    miniProgramTaskId: inboundResult.taskId,
    applicant: userName,
    createdAt: formatDateTime(),
  }

  existing.unshift(record)
  saveRecords(existing)
  return { ok: true, record, order: createdOrders[0] || null, orders: createdOrders }
}
