/** 快速报工 mock */

import { calcMaterialList, getProductByCode, getProductById } from './quickReportProducts'
import { getProductMaterialById } from './productMaterialInfo'
import { resolveProcessQuantities } from './quickReportProcess'
import { updateFrequentRegistration } from './outputRegistrationHub'
import { getProcessDefectItems } from '../utils/iodomsStorage'
import { createWorkOrderLinkedQuickReportSeed } from './quickReportWorkOrderSeed'

export const reportStatusOptions = ['待确认', '已确认']

const STORAGE_KEY = 'i_doms_mobile_quick_reports'
const SEED_VERSION_KEY = 'i_doms_quick_reports_seed_v'
const SEED_VERSION = '2'
const MATERIAL_KEY = 'i_doms_mobile_quick_material_lists'
const OPERATOR_MEMORY_KEY = 'i_doms_mobile_qr_last_operators'

function formatDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

function startOfWeek() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function isToday(dateStr) {
  return dateStr === formatDate()
}

function isThisWeek(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr.replace(/-/g, '/'))
  return d >= startOfWeek() && d <= new Date()
}

function calcFinishedQty(processes, fallback) {
  if (fallback != null && fallback !== '') return Number(fallback) || 0
  const active = (processes || []).filter((p) => !p.deleted)
  if (!active.length) return 0
  return Math.max(...active.map((p) => Number(p.qty) || 0))
}

function resolveReportQuantities(row = {}) {
  const legacyFinished = Number(row.finishedQty) || 0
  const hasSplit =
    (row.goodQty != null && row.goodQty !== '') ||
    (row.defectQty != null && row.defectQty !== '')
  if (!hasSplit) {
    return {
      goodQty: legacyFinished,
      defectQty: 0,
      finishedQty: legacyFinished,
    }
  }
  const goodQty = Math.max(0, Number(row.goodQty) || 0)
  const defectQty = Math.max(0, Number(row.defectQty) || 0)
  return {
    goodQty,
    defectQty,
    finishedQty: goodQty + defectQty,
  }
}

function parseSubmitQuantities(payload = {}) {
  const goodQty = Number(payload.goodQty) || 0
  const defectQty = Number(payload.defectQty) || 0
  if (goodQty < 0 || defectQty < 0) {
    return { ok: false, message: '数量不能为负数' }
  }
  if (goodQty + defectQty <= 0) {
    return { ok: false, message: '请填写良品数或不良品数' }
  }
  return { ok: true, goodQty, defectQty, finishedQty: goodQty + defectQty }
}

function flattenOperators(processes, overallOperators, perProcessMode) {
  if (!perProcessMode) return overallOperators || []
  const set = new Set()
  ;(processes || [])
    .filter((p) => !p.deleted)
    .forEach((p) => (p.operators || []).forEach((n) => set.add(n)))
  return [...set]
}

function resolveProcessDefectNames(process = {}) {
  const ids = process.defectItemIds || []
  if (!ids.length) return process.defectItemNames || []
  return getProcessDefectItems(process.name)
    .filter((d) => ids.includes(d.id))
    .map((d) => d.name)
}

function normalizeProcess(p) {
  const qty = resolveProcessQuantities(p)
  const defectItemIds = [...(p.defectItemIds || [])]
  return {
    ...p,
    deleted: !!p.deleted,
    operators: p.operators || [],
    goodQty: qty.goodQty,
    defectQty: qty.defectQty,
    qty: qty.qty,
    defectItemIds,
    defectItemNames: resolveProcessDefectNames({ ...p, defectItemIds }),
  }
}

function normalizeRecord(row) {
  const processes = (row.processes || []).map((p) => normalizeProcess(p))
  const operators = row.operators?.length
    ? row.operators
    : flattenOperators(processes, [], row.perProcessMode)
  const qty = resolveReportQuantities({
    ...row,
    finishedQty: row.finishedQty ?? calcFinishedQty(processes, row.finishedQty),
  })
  return {
    ...row,
    processes,
    processCount: processes.filter((p) => !p.deleted).length,
    ...qty,
    operators,
    status: row.materialConfirmed ? '已确认' : row.status || '待确认',
    workOrderStatus: row.workOrderStatus || '已报工',
  }
}

function createSeed() {
  const today = formatDate()
  const legacy = [
    normalizeRecord({
      id: 'qr-1',
      productId: 'prod-1',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      reportDate: today,
      finishedQty: 25,
      routeId: 'route-1',
      routeName: '标准焊接工艺 v2',
      perProcessMode: false,
      processes: [
        { id: 'p1', name: '点焊', qty: 25, deleted: false, operators: [] },
        { id: 'p2', name: '打磨', qty: 20, deleted: false, operators: [] },
      ],
      operators: ['张三', '李四'],
      materialConfirmed: true,
      status: '已确认',
      workOrderNo: `QK-${today.replace(/-/g, '')}-001`,
      workOrderStatus: '已报工',
      reporter: '张三',
      createdAt: `${today} 09:30`,
      remark: '',
    }),
    normalizeRecord({
      id: 'qr-2',
      productId: 'prod-2',
      productName: '电机外壳',
      productCode: 'DJ-2024-B',
      reportDate: today,
      finishedQty: 18,
      goodQty: 16,
      defectQty: 2,
      routeId: 'route-2a',
      routeName: '冲压工艺 v1',
      perProcessMode: false,
      processes: [
        { id: 'p3', name: '冲压', qty: 18, deleted: false, operators: [] },
        { id: 'p4', name: '去毛刺', qty: 18, deleted: false, operators: [] },
      ],
      operators: ['王五'],
      materialConfirmed: false,
      status: '待确认',
      workOrderNo: `QK-${today.replace(/-/g, '')}-002`,
      workOrderStatus: '已报工',
      reporter: '王五',
      createdAt: `${today} 11:20`,
      remark: '',
    }),
    normalizeRecord({
      id: 'qr-3',
      productId: 'prod-3',
      productName: '法兰盘',
      productCode: 'FL-2024-C',
      reportDate: daysAgo(3),
      finishedQty: 12,
      routeId: 'route-3',
      routeName: '机加标准路线',
      perProcessMode: false,
      processes: [{ id: 'p5', name: '机加工', qty: 12, deleted: false, operators: [] }],
      operators: ['赵六', '钱七'],
      materialConfirmed: true,
      status: '已确认',
      workOrderNo: `QK-${daysAgo(3).replace(/-/g, '')}-001`,
      workOrderStatus: '已报工',
      reporter: '赵六',
      createdAt: `${daysAgo(3)} 15:00`,
      remark: '',
    }),
    normalizeRecord({
      id: 'qr-4',
      productId: 'prod-4',
      productName: '密封圈',
      productCode: 'SEAL-2024-D',
      reportDate: daysAgo(10),
      finishedQty: 200,
      routeId: 'route-4',
      routeName: '硫化成型路线',
      perProcessMode: false,
      processes: [
        { id: 'p6', name: '硫化', qty: 200, deleted: false, operators: [] },
        { id: 'p7', name: '检验', qty: 200, deleted: false, operators: [] },
      ],
      operators: ['孙八'],
      materialConfirmed: false,
      status: '待确认',
      workOrderNo: `QK-${daysAgo(10).replace(/-/g, '')}-003`,
      workOrderStatus: '已报工',
      reporter: '孙八',
      createdAt: `${daysAgo(10)} 08:45`,
      remark: '',
    }),
  ]
  return [...createWorkOrderLinkedQuickReportSeed(formatDate, normalizeRecord), ...legacy]
}

function load() {
  if (uni.getStorageSync(SEED_VERSION_KEY) !== SEED_VERSION) {
    const seed = createSeed()
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(seed))
    uni.setStorageSync(SEED_VERSION_KEY, SEED_VERSION)
    return seed
  }
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return JSON.parse(raw).map(normalizeRecord)
  } catch {
    /* ignore */
  }
  const seed = createSeed()
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(seed))
  uni.setStorageSync(SEED_VERSION_KEY, SEED_VERSION)
  return seed
}

let cache = load()

function save() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(cache))
}

function loadMaterialLists() {
  try {
    const raw = uni.getStorageSync(MATERIAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

let materialLists = loadMaterialLists()

function saveMaterialLists() {
  uni.setStorageSync(MATERIAL_KEY, JSON.stringify(materialLists))
}

const filterLabels = { today: '今日', week: '本周', all: '全部' }

export function getFilterLabel(filter) {
  return filterLabels[filter] || '全部'
}

export function filterReports(list, filter = 'today') {
  if (filter === 'all') return list
  if (filter === 'today') return list.filter((r) => isToday(r.reportDate))
  if (filter === 'week') return list.filter((r) => isThisWeek(r.reportDate))
  return list
}

export function getQuickReportList(filter = 'today') {
  return filterReports(cache, filter)
}

export function getQuickReportCount(filter = 'today') {
  return getQuickReportList(filter).length
}

export function getQuickReportById(id) {
  const row = cache.find((r) => r.id === id)
  return row ? normalizeRecord(row) : null
}

export function getMaterialListByReportId(reportId) {
  return materialLists[reportId] || null
}

export function getLastOperators() {
  try {
    const raw = uni.getStorageSync(OPERATOR_MEMORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return ['张三', '李四']
}

export function saveLastOperators(operators) {
  if (!operators?.length) return
  uni.setStorageSync(OPERATOR_MEMORY_KEY, JSON.stringify(operators))
}

function generateWorkOrderNo(reportDate) {
  const datePart = (reportDate || formatDate()).replace(/-/g, '')
  const key = `qr_wo_seq_${datePart}`
  let seq = Number(uni.getStorageSync(key) || 0)
  seq += 1
  uni.setStorageSync(key, String(seq))
  return `QK-${datePart}-${String(seq).padStart(3, '0')}`
}

function validateSubmit(payload) {
  if (!payload.productId && !payload.productName?.trim()) {
    return '请选择产品'
  }
  const qtyCheck = parseSubmitQuantities(payload)
  if (!qtyCheck.ok) return qtyCheck.message
  if (!payload.reportDate) {
    return '请选择生产日期'
  }
  const activeProcesses = (payload.processes || []).filter((p) => !p.deleted && p.name?.trim())
  if (!activeProcesses.length) {
    return '请至少保留一道工序'
  }
  if (payload.perProcessMode) {
    const missing = activeProcesses.find((p) => !p.operators?.length)
    if (missing) return `请为「${missing.name}」指定操作人员`
  } else if (!payload.operators?.length) {
    return '请选择操作人员'
  }
  return null
}

export function submitQuickReport(payload) {
  const err = validateSubmit(payload)
  if (err) return { ok: false, message: err }

  const activeProcesses = payload.processes
    .filter((p) => !p.deleted && p.name?.trim())
    .map((p) =>
      normalizeProcess({
        ...p,
        name: p.name.trim(),
        deleted: false,
      }),
    )

  const operators = payload.perProcessMode
    ? flattenOperators(activeProcesses, [], true)
    : payload.operators

  const product =
    getProductMaterialById(payload.productId) ||
    getProductById(payload.productId) ||
    getProductByCode(payload.productCode)
  const qtyCheck = parseSubmitQuantities(payload)
  const { goodQty, defectQty, finishedQty } = qtyCheck

  const materialItems = product ? calcMaterialList(product, finishedQty) : []

  const isEdit = !!payload.id
  const existing = isEdit ? cache.find((r) => r.id === payload.id) : null
  if (existing?.status === '已确认' && !payload.forceEdit) {
    return { ok: false, message: '已确认记录不可修改' }
  }

  const workOrderNo =
    payload.sourceWorkOrderNo ||
    existing?.workOrderNo ||
    generateWorkOrderNo(payload.reportDate)

  const record = normalizeRecord({
    id: payload.id || `qr-${Date.now()}`,
    productId: payload.productId,
    productName: payload.productName.trim(),
    productCode: payload.productCode?.trim() || '',
    reportDate: payload.reportDate,
    goodQty,
    defectQty,
    finishedQty,
    routeId: payload.routeId,
    routeName: payload.routeName,
    perProcessMode: !!payload.perProcessMode,
    processes: activeProcesses,
    operators,
    materialConfirmed: false,
    status: '待确认',
    workOrderNo,
    workOrderStatus: '已报工',
    reporter: payload.reporter || '当前用户',
    remark: payload.remark || '',
    createdAt:
      existing?.createdAt ||
      new Date().toISOString().slice(0, 16).replace('T', ' '),
  })

  const idx = cache.findIndex((r) => r.id === record.id)
  if (idx >= 0) {
    cache[idx] = { ...cache[idx], ...record }
  } else {
    cache.unshift(record)
  }

  save()
  saveLastOperators(operators)

  updateFrequentRegistration({
    productId: record.productId,
    productName: record.productName,
    productCode: record.productCode,
    routeName: record.routeName,
    goodQty: record.goodQty,
    defectQty: record.defectQty,
  })

  return {
    ok: true,
    message: '登记成功',
    record,
  }
}

/** 兼容旧调用 */
export function saveQuickReport(payload) {
  return submitQuickReport(payload)
}

export function confirmMaterial(id) {
  const row = cache.find((r) => r.id === id)
  if (!row) return { ok: false, message: '记录不存在' }
  row.materialConfirmed = true
  row.status = '已确认'
  if (materialLists[id]) {
    materialLists[id].status = '已确认'
    saveMaterialLists()
  }
  save()
  return { ok: true, message: '仓库已确认领料' }
}

export { formatDate as formatReportDate, daysAgo as reportDaysAgo }
