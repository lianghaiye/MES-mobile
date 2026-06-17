/**
 * 报工确认 - 工单下发自动生成报工数据，主任核对后推送工人确认
 * 状态：待确认 → 待工人确认 → 已确认
 */

import { getProcessReportMode } from '@/utils/iodomsStorage'
import { resolveReportMode } from '@/utils/reportMode'

export const REPORT_CONFIRM_STORAGE_KEY = 'i_doms_report_confirm_lines'
export const REPORT_CONFIRM_SEED_VERSION = '2'
export const REPORT_CONFIRM_SEED_VERSION_KEY = 'i_doms_report_confirm_seed_v'

export const CONFIRM_STATUS = {
  PENDING: '待确认',
  WORKER_PENDING: '待工人确认',
  CONFIRMED: '已确认',
}

/** 演示用工时配置（与 WEB processReportLaborConfig 对齐） */
const LABOR_BY_CODE = {
  'SJ-2024-A': {
    点焊: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 8.5 },
    打磨: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 6.2 },
    装配: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 38 },
  },
  'BX-2024-03': {
    车削: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 12 },
    铣削: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 15 },
  },
  'BK-2024-01': {
    热处理: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 42 },
  },
  'FL-2024-C': {
    点焊: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 9 },
    砂轮切割: { reportType: '批量计件', salaryMethod: '计件工资', pieceRate: 9 },
  },
  CP2610004: {
    精车: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 45 },
    精磨: { reportType: '时长报工', salaryMethod: '计时工资', standardHourlyRate: 45 },
  },
}

function formatNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function resolveLabor(productCode, processName) {
  const map = LABOR_BY_CODE[productCode] || {}
  const hit = map[processName] || {}
  const reportType = resolveReportMode(hit.reportType || getProcessReportMode(processName))
  const salaryMethod = hit.salaryMethod || '计件工资'
  return { reportType, salaryMethod, pieceRate: hit.pieceRate || 0, standardHourlyRate: hit.standardHourlyRate || 0 }
}

function calcSalary(line) {
  const cfg = resolveLabor(line.productCode, line.processName)
  const good = Number(line.adjustedGoodQty ?? line.goodQty) || 0
  const subsidyQty = Number(line.subsidyReportQty) || 0
  const duration = Number(line.adjustedDuration ?? line.reportDuration) || 0
  const subsidyHours = Number(line.subsidyHours) || 0
  if (cfg.salaryMethod === '计件工资') {
    return Math.round((good * cfg.pieceRate + subsidyQty * cfg.pieceRate) * 100) / 100
  }
  const hours = duration + subsidyHours
  return Math.round(hours * cfg.standardHourlyRate * 100) / 100
}

function enrichLine(line) {
  const labor = resolveLabor(line.productCode, line.processName)
  const salary =
    line.confirmStatus === CONFIRM_STATUS.CONFIRMED ? calcSalary(line) : calcSalary({ ...line, adjustedGoodQty: line.goodQty })
  return {
    ...line,
    reportType: labor.reportType,
    salaryMethod: labor.salaryMethod,
    reportTypeLabel: `${labor.reportType}+${labor.salaryMethod}`,
    calculatedSalary: line.confirmStatus === CONFIRM_STATUS.CONFIRMED ? calcSalary(line) : null,
    displaySalary: line.confirmStatus === CONFIRM_STATUS.CONFIRMED ? calcSalary(line) : salary,
  }
}

function createSeedLines() {
  const today = formatDate()
  const now = formatNow()
  return [
    {
      id: 'rc-001',
      taskNo: 'T20260602011',
      workOrderId: 'wo-pr-1',
      workOrderNo: 'WO-062',
      workOrderName: '货架支架生产工单',
      processName: '点焊',
      processSeq: 1,
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      executor: '张三',
      reportTime: `${today} 08:00:00`,
      taskQty: 25,
      goodQty: 25,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
      dispatchedAt: today,
      director: '张主任',
    },
    {
      id: 'rc-002',
      taskNo: 'T20260602012',
      workOrderId: 'wo-pr-1',
      workOrderNo: 'WO-062',
      workOrderName: '货架支架生产工单',
      processName: '打磨',
      processSeq: 2,
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      executor: '王五',
      reportTime: `${today} 08:00:00`,
      taskQty: 25,
      goodQty: 25,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
      dispatchedAt: today,
      director: '张主任',
    },
    {
      id: 'rc-003',
      taskNo: 'T20260602022',
      workOrderId: 'wo-pr-5',
      workOrderNo: 'WO-068',
      workOrderName: '深井潜水泵生产工单',
      processName: '精车',
      processSeq: 2,
      productName: '深井潜水泵',
      productCode: 'CP2610004',
      executor: '李四',
      reportTime: `${today} 08:15:00`,
      taskQty: 8,
      goodQty: 8,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 12,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
      dispatchedAt: today,
      director: '张主任',
    },
    {
      id: 'rc-004',
      taskNo: 'T202609090001',
      workOrderId: 'wo-demo-1',
      workOrderNo: 'WO-DEMO-01',
      workOrderName: '精磨演示工单',
      processName: '精磨',
      processSeq: 1,
      productName: '演示轴套',
      productCode: 'CP2610004',
      executor: '张三',
      reportTime: `${today} 09:30:00`,
      taskQty: 12,
      goodQty: 12,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 12,
      remark: '',
      confirmStatus: CONFIRM_STATUS.WORKER_PENDING,
      pushedAt: `${today} 10:00:00`,
      dispatchedAt: today,
      director: '张主任',
    },
    {
      id: 'rc-005',
      taskNo: 'T202609090002',
      workOrderId: 'wo-demo-2',
      workOrderNo: 'WO-DEMO-02',
      workOrderName: '砂轮切割演示工单',
      processName: '砂轮切割',
      processSeq: 1,
      productName: '法兰盘',
      productCode: 'FL-2024-C',
      executor: '张三',
      reportTime: `${today} 11:20:00`,
      taskQty: 10,
      goodQty: 10,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '备注内容',
      confirmStatus: CONFIRM_STATUS.CONFIRMED,
      adjustedGoodQty: 10,
      adjustedDuration: 0,
      subsidyReportQty: 1,
      adjustReason: '调整原因',
      subsidyReason: '补贴原因',
      calculatedSalary: 99,
      pushedAt: `${today} 11:30:00`,
      workerConfirmedAt: now,
      dispatchedAt: today,
      director: '张主任',
    },
    {
      id: 'rc-partial-1',
      taskNo: 'T20260615001',
      workOrderId: 'wo-partial-1',
      workOrderNo: 'GD-20260615-008',
      workOrderName: '货架支架加急工单',
      processName: '点焊',
      processSeq: 1,
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      executor: '张三',
      reportTime: `${today} 07:30:00`,
      taskQty: 50,
      goodQty: 23,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '',
      confirmStatus: CONFIRM_STATUS.PENDING,
      dispatchedAt: '2026-06-15',
      director: '张主任',
    },
    {
      id: 'rc-partial-2',
      taskNo: 'T20260614001',
      workOrderId: 'wo-partial-2',
      workOrderNo: 'GD-20260614-005',
      workOrderName: '货架支架标准工单',
      processName: '打磨',
      processSeq: 1,
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      executor: '王五',
      reportTime: `${today} 08:00:00`,
      taskQty: 50,
      goodQty: 50,
      defectQty: 0,
      scrapQty: 0,
      reportDuration: 0,
      remark: '',
      confirmStatus: CONFIRM_STATUS.WORKER_PENDING,
      pushedAt: `${today} 09:00:00`,
      dispatchedAt: '2026-06-14',
      director: '张主任',
    },
    {
      id: 'rc-partial-3',
      taskNo: 'T20260612001',
      workOrderId: 'wo-partial-3',
      workOrderNo: 'GD-20260612-003',
      workOrderName: '货架支架返工工单',
      processName: '装配',
      processSeq: 1,
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      executor: '李四',
      reportTime: `${today} 08:00:00`,
      taskQty: 50,
      goodQty: 49,
      defectQty: 1,
      scrapQty: 0,
      reportDuration: 10,
      remark: '',
      confirmStatus: CONFIRM_STATUS.CONFIRMED,
      adjustedGoodQty: 49,
      adjustedDuration: 10,
      workerConfirmedAt: `${today} 16:00:00`,
      dispatchedAt: '2026-06-12',
      director: '张主任',
    },
  ].map(enrichLine)
}

function loadLines() {
  if (uni.getStorageSync(REPORT_CONFIRM_SEED_VERSION_KEY) !== REPORT_CONFIRM_SEED_VERSION) {
    const seed = createSeedLines()
    uni.setStorageSync(REPORT_CONFIRM_STORAGE_KEY, JSON.stringify(seed))
    uni.setStorageSync(REPORT_CONFIRM_SEED_VERSION_KEY, REPORT_CONFIRM_SEED_VERSION)
    return seed
  }
  try {
    const raw = uni.getStorageSync(REPORT_CONFIRM_STORAGE_KEY)
    if (raw) return JSON.parse(raw).map(enrichLine)
  } catch {
    /* ignore */
  }
  return createSeedLines()
}

let cache = loadLines()

function save() {
  uni.setStorageSync(REPORT_CONFIRM_STORAGE_KEY, JSON.stringify(cache))
}

function reload() {
  cache = loadLines()
  return cache
}

function resolveUserNames(user) {
  const displayName = user?.displayName || ''
  const username = user?.username || ''
  if (displayName === '管理员' || username === 'admin') {
    return ['管理员', 'admin', '张三', '李四', '王五']
  }
  if (!displayName && !username) return ['张三']
  return [...new Set([displayName, username].filter(Boolean))]
}

export function isDirectorUser(user) {
  const names = resolveUserNames(user)
  return names.some((n) => ['管理员', 'admin'].includes(n))
}

export function getDirectorConfirmLines() {
  reload()
  return cache
    .filter((l) => l.confirmStatus === CONFIRM_STATUS.PENDING)
    .map(enrichLine)
    .sort((a, b) => (a.workOrderNo || '').localeCompare(b.workOrderNo || ''))
}

export function getDirectorConfirmGroups() {
  const lines = getDirectorConfirmLines()
  const map = new Map()
  lines.forEach((line) => {
    const key = line.workOrderId || line.workOrderNo
    if (!map.has(key)) {
      map.set(key, {
        workOrderId: line.workOrderId,
        workOrderNo: line.workOrderNo,
        workOrderName: line.workOrderName,
        productName: line.productName,
        productCode: line.productCode,
        tasks: [],
      })
    }
    map.get(key).tasks.push(line)
  })
  return [...map.values()]
}

function resolveWorkOrderListStatus(lines) {
  if (lines.every((l) => l.confirmStatus === CONFIRM_STATUS.CONFIRMED)) return '已完成'
  return '待确认'
}

function buildWorkOrderSummary(lines) {
  const first = lines[0]
  const targetQty = first.taskQty || 0
  const reportedQty = lines.length
    ? Math.min(...lines.map((l) => Number(l.adjustedGoodQty ?? l.goodQty) || 0))
    : 0
  const completionRate = targetQty ? Math.round((reportedQty / targetQty) * 100) : 0
  const dispatchedAt = first.dispatchedAt || (first.reportTime || '').slice(0, 10)
  return {
    workOrderId: first.workOrderId,
    workOrderNo: first.workOrderNo,
    workOrderName: first.workOrderName,
    productName: first.productName,
    productCode: first.productCode,
    targetQty,
    reportedQty,
    completionRate,
    listStatus: resolveWorkOrderListStatus(lines),
    dispatchedAt,
    director: first.director || '张主任',
    taskCount: lines.length,
    lines: lines.sort((a, b) => (a.processSeq || 0) - (b.processSeq || 0)),
  }
}

export function getWorkOrderConfirmSummaries({ tab = 'all', keyword = '' } = {}) {
  reload()
  const map = new Map()
  cache.forEach((line) => {
    const enriched = enrichLine(line)
    const key = enriched.workOrderId || enriched.workOrderNo
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(enriched)
  })

  let summaries = [...map.values()].map((lines) => buildWorkOrderSummary(lines))

  if (tab === 'pending') {
    summaries = summaries.filter((s) => s.listStatus === '待确认')
  } else if (tab === 'done') {
    summaries = summaries.filter((s) => s.listStatus === '已完成')
  }

  const kw = (keyword || '').trim().toLowerCase()
  if (kw) {
    summaries = summaries.filter(
      (s) =>
        (s.workOrderNo || '').toLowerCase().includes(kw) ||
        (s.productName || '').toLowerCase().includes(kw) ||
        (s.productCode || '').toLowerCase().includes(kw),
    )
  }

  return summaries.sort((a, b) => (b.dispatchedAt || '').localeCompare(a.dispatchedAt || ''))
}

export function getWorkOrderConfirmTabCounts(keyword = '') {
  const all = getWorkOrderConfirmSummaries({ tab: 'all', keyword })
  return {
    all: all.length,
    pending: all.filter((s) => s.listStatus === '待确认').length,
    done: all.filter((s) => s.listStatus === '已完成').length,
  }
}

export function getWorkOrderConfirmById(workOrderId) {
  reload()
  const lines = cache
    .filter((l) => l.workOrderId === workOrderId)
    .map(enrichLine)
  if (!lines.length) return null
  return buildWorkOrderSummary(lines)
}

export function getWorkerConfirmLines(user, tab = 'all') {
  reload()
  const names = resolveUserNames(user)
  let list = cache.filter((l) => names.includes(l.executor))
  if (tab === 'pending') {
    list = list.filter((l) => l.confirmStatus === CONFIRM_STATUS.WORKER_PENDING)
  } else if (tab === 'confirmed') {
    list = list.filter((l) => l.confirmStatus === CONFIRM_STATUS.CONFIRMED)
  } else {
    list = list.filter(
      (l) =>
        l.confirmStatus === CONFIRM_STATUS.WORKER_PENDING ||
        l.confirmStatus === CONFIRM_STATUS.CONFIRMED,
    )
  }
  return list.map(enrichLine).sort((a, b) => (b.reportTime || '').localeCompare(a.reportTime || ''))
}

export function getWorkerMonthSalary(user) {
  const month = formatDate().slice(0, 7)
  return getWorkerConfirmLines(user, 'confirmed')
    .filter((l) => (l.workerConfirmedAt || l.reportTime || '').slice(0, 7) === month)
    .reduce((sum, l) => sum + (Number(l.calculatedSalary ?? l.displaySalary) || 0), 0)
}

export function getLineById(id) {
  reload()
  const line = cache.find((l) => l.id === id)
  return line ? enrichLine(line) : null
}

export function adjustConfirmLine(id, payload = {}) {
  const line = cache.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  if (line.confirmStatus !== CONFIRM_STATUS.PENDING) {
    return { ok: false, message: '仅待确认数据可调整' }
  }
  if (payload.goodQty != null) line.adjustedGoodQty = Math.max(0, Number(payload.goodQty) || 0)
  if (payload.defectQty != null) line.adjustedDefectQty = Math.max(0, Number(payload.defectQty) || 0)
  if (payload.reportDuration != null) line.adjustedDuration = Math.max(0, Number(payload.reportDuration) || 0)
  if (payload.remark != null) line.remark = payload.remark
  if (payload.adjustReason != null) line.adjustReason = payload.adjustReason
  Object.assign(line, enrichLine(line))
  save()
  return { ok: true, line: enrichLine(line) }
}

export function subsidyConfirmLine(id, payload = {}) {
  const line = cache.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  if (line.confirmStatus !== CONFIRM_STATUS.PENDING) {
    return { ok: false, message: '仅待确认数据可补贴' }
  }
  const labor = resolveLabor(line.productCode, line.processName)
  if (labor.salaryMethod === '计件工资') {
    line.subsidyReportQty = Math.max(0, Number(payload.subsidyReportQty) || 0)
  } else {
    line.subsidyHours = Math.max(0, Number(payload.subsidyHours) || 0)
  }
  if (payload.subsidyReason != null) line.subsidyReason = payload.subsidyReason
  Object.assign(line, enrichLine(line))
  save()
  return { ok: true, line: enrichLine(line) }
}

export function pushConfirmToWorker(id) {
  const line = cache.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  if (line.confirmStatus !== CONFIRM_STATUS.PENDING) {
    return { ok: false, message: '当前状态不可推送' }
  }
  line.confirmStatus = CONFIRM_STATUS.WORKER_PENDING
  line.pushedAt = formatNow()
  Object.assign(line, enrichLine(line))
  save()
  return { ok: true, line: enrichLine(line), message: '已推送给工人确认' }
}

export function workerConfirmLine(id, user) {
  const line = cache.find((l) => l.id === id)
  if (!line) return { ok: false, message: '记录不存在' }
  const names = resolveUserNames(user)
  if (!names.includes(line.executor)) {
    return { ok: false, message: '无权确认该任务' }
  }
  if (line.confirmStatus !== CONFIRM_STATUS.WORKER_PENDING) {
    return { ok: false, message: '当前状态不可确认' }
  }
  line.confirmStatus = CONFIRM_STATUS.CONFIRMED
  line.workerConfirmedAt = formatNow()
  line.calculatedSalary = calcSalary(line)
  Object.assign(line, enrichLine(line))
  save()
  syncToLaborHour(line)
  return { ok: true, line: enrichLine(line), message: '确认成功' }
}

/** 同步已确认行到工时工资（与 WEB 共用 key） */
function syncToLaborHour(line) {
  const LABOR_SYNC_KEY = 'i_doms_report_confirm_labor_sync'
  let list = []
  try {
    const raw = uni.getStorageSync(LABOR_SYNC_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const idx = list.findIndex((l) => l.id === line.id)
  const row = { ...line, syncedAt: formatNow() }
  if (idx >= 0) list[idx] = row
  else list.unshift(row)
  uni.setStorageSync(LABOR_SYNC_KEY, JSON.stringify(list))
}

export function generateLinesFromTask(task) {
  if (!task?.workOrderId || !task.processName) return null
  reload()
  const exists = cache.find(
    (l) => l.workOrderId === task.workOrderId && l.processName === task.processName,
  )
  if (exists) return exists
  const qty = task.expectedQty ?? task.targetQty ?? task.scheduleQty ?? 0
  const productCode = task.itemCode || task.productCode || ''
  const labor = resolveLabor(productCode, task.processName)
  const processSeq = task.processSeq || 1
  const line = enrichLine({
    id: `rc-${task.workOrderId}-${processSeq}`,
    taskNo: task.taskNo || `T${Date.now()}`,
    workOrderId: task.workOrderId,
    workOrderNo: task.workOrderCode || task.workOrderNo,
    workOrderName: task.workOrderName || '',
    processName: task.processName,
    processSeq,
    productName: task.productName,
    productCode,
    executor: task.executor || task.executors?.[0] || '',
    reportTime: formatNow(),
    taskQty: qty,
    goodQty: qty,
    defectQty: 0,
    scrapQty: 0,
    reportDuration: labor.reportType === '时长报工' ? Math.round(qty * 0.5 * 10) / 10 : 0,
    remark: '',
    confirmStatus: CONFIRM_STATUS.PENDING,
    orderCategory: task.orderCategory || '',
    dispatchedAt: formatDate(),
    director: '张主任',
  })
  cache.unshift(line)
  save()
  return line
}

/** PC 下发同步到小程序任务后，批量生成报工确认行 */
export function generateLinesFromSyncedTasks(tasks = []) {
  if (!tasks.length) return []
  return tasks.map((task) => generateLinesFromTask(task)).filter(Boolean)
}

export { enrichLine, calcSalary, resolveLabor, formatDate }
