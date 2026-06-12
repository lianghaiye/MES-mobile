/** 工序报工记录（工单报工 + 快速报工合并） */

import { getUser } from '@/utils/auth'
import { isDurationReportMode } from '@/utils/reportMode'

export const RECORD_STATUS = ['待审核', '已审核', '已拒绝']

const STORAGE_KEY = 'i_doms_mobile_process_report_records'
const FREQ_KEY = 'i_doms_mobile_frequent_reports'

export function formatReportDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatWeekday(d = new Date()) {
  return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
}

export function getDateHeader() {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${formatWeekday(d)}`
}

function createSeed() {
  const today = formatReportDate()
  return [
    {
      id: 'pr-1',
      source: 'workorder',
      workOrderNo: 'WO-062',
      processName: '点焊',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      reportMode: '批量计件',
      goodQty: 23,
      defectQty: 2,
      finishedQty: 25,
      workHours: null,
      startTime: '',
      endTime: '',
      defectItemIds: ['di-5'],
      defectItemNames: ['气孔'],
      remark: '',
      status: '待审核',
      rejectReason: '',
      reporter: '张三',
      createdAt: `${today} 14:30`,
      timeLabel: '今天 14:30',
    },
    {
      id: 'pr-2',
      source: 'quick',
      workOrderNo: '',
      processName: '热处理',
      productName: '泵壳',
      productCode: 'BK-2024-01',
      reportMode: '时长报工',
      goodQty: 12,
      defectQty: 0,
      finishedQty: 12,
      workHours: 4.5,
      startTime: '08:00',
      endTime: '12:30',
      defectItemIds: [],
      defectItemNames: [],
      remark: '',
      status: '待审核',
      rejectReason: '',
      reporter: '张三',
      createdAt: `${today} 10:15`,
      timeLabel: '今天 10:15',
    },
    {
      id: 'pr-3',
      source: 'workorder',
      taskId: 'pt-004',
      taskNo: 'T20260602014',
      workOrderNo: 'WO-058',
      processName: '车削',
      productName: '泵轴',
      productCode: 'BX-2024-03',
      reportMode: '批量计件',
      goodQty: 14,
      defectQty: 1,
      finishedQty: 15,
      workHours: null,
      defectItemIds: ['di-2'],
      defectItemNames: ['有气孔'],
      remark: '',
      status: '已审核',
      rejectReason: '',
      reporter: '张三',
      createdAt: '2026-06-10 16:20',
      timeLabel: '昨天 16:20',
    },
    {
      id: 'pr-4',
      source: 'quick',
      workOrderNo: '',
      processName: '装配',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      reportMode: '时长报工',
      goodQty: 0,
      defectQty: 0,
      finishedQty: 0,
      workHours: 3.0,
      startTime: '13:00',
      endTime: '16:00',
      defectItemIds: [],
      defectItemNames: [],
      remark: '',
      status: '已拒绝',
      rejectReason: '工时填写不完整，请重新报工',
      reporter: '张三',
      createdAt: '2026-06-09 15:40',
      timeLabel: '前天 15:40',
    },
  ]
}

function load() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return createSeed()
}

let cache = load()

function save() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(cache))
}

function resolveReporterNames(user) {
  const displayName = user?.displayName || ''
  const username = user?.username || ''
  if (displayName === '管理员' || username === 'admin') {
    return ['管理员', 'admin', '张三']
  }
  if (!displayName && !username) return ['张三']
  return [...new Set([displayName, username].filter(Boolean))]
}

export function getMyRecords(user, filter = 'all') {
  const names = resolveReporterNames(user)
  let list = cache.filter((r) => names.includes(r.reporter))
  if (filter !== 'all') list = list.filter((r) => r.status === filter)
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getRecordStats(user) {
  const list = getMyRecords(user, 'all')
  return {
    pending: list.filter((r) => r.status === '待审核').length,
    approved: list.filter((r) => r.status === '已审核').length,
    rejected: list.filter((r) => r.status === '已拒绝').length,
  }
}

export function getRecordById(id) {
  return cache.find((r) => r.id === id) || null
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function submitProcessReport(payload) {
  const user = getUser()
  const reporter = user?.displayName || '当前用户'
  const today = formatReportDate()

  const good = Number(payload.goodQty) || 0
  const defect = Number(payload.defectQty) || 0
  if (good + defect <= 0) return { ok: false, message: '请填写良品数或不良品数' }

  if (isDurationReportMode(payload.reportMode)) {
    const hours = Number(payload.workHours)
    if (!hours || hours <= 0) return { ok: false, message: '请填写工作时长' }
  }

  const record = {
    id: `pr-${Date.now()}`,
    source: payload.source || 'quick',
    taskId: payload.taskId || '',
    taskNo: payload.taskNo || '',
    workOrderNo: payload.workOrderNo || '',
    workOrderId: payload.workOrderId || '',
    processId: payload.processId || '',
    processName: payload.processName,
    productName: payload.productName,
    productCode: payload.productCode,
    targetQty: payload.targetQty || null,
    reportMode: payload.reportMode,
    goodQty: good,
    defectQty: defect,
    finishedQty: good + defect,
    workHours: isDurationReportMode(payload.reportMode) ? Number(payload.workHours) : null,
    startTime: payload.startTime || nowTime(),
    endTime: payload.endTime || nowTime(),
    defectItemIds: payload.defectItemIds || [],
    defectItemNames: payload.defectItemNames || [],
    remark: payload.remark || '',
    status: '待审核',
    rejectReason: '',
    reporter,
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    timeLabel: `今天 ${nowTime()}`,
  }

  cache.unshift(record)
  save()
  updateFrequentReport(payload)
  return { ok: true, message: '报工已提交，等待审核', record }
}

function defaultFrequent() {
  return [
    {
      id: 'freq-1',
      processName: '点焊',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      reportMode: '批量计件',
      lastSummary: '昨天 23件 · 良品21 不良2',
    },
    {
      id: 'freq-2',
      processName: '车削',
      productName: '泵轴',
      productCode: 'BX-2024-03',
      reportMode: '批量计件',
      lastSummary: '前天 15件 · 良品14 不良1',
    },
    {
      id: 'freq-3',
      processName: '热处理',
      productName: '泵壳',
      productCode: 'BK-2024-01',
      reportMode: '时长报工',
      lastSummary: '3天前 4.5小时 · 良品12 不良0',
    },
  ]
}

const FREQ_LIMIT = 10

export function getFrequentReports() {
  let list = []
  try {
    const raw = uni.getStorageSync(FREQ_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  if (!list.length) list = defaultFrequent()
  return list.slice(0, FREQ_LIMIT)
}

function updateFrequentReport(payload) {
  const list = getFrequentReports()
  const idx = list.findIndex(
    (f) => f.processName === payload.processName && f.productCode === payload.productCode,
  )
  const mode = payload.reportMode
  let summary = ''
  const total = (Number(payload.goodQty) || 0) + (Number(payload.defectQty) || 0)
  if (!isDurationReportMode(mode)) {
    summary = `今天 ${total}件 · 良品${payload.goodQty || 0} 不良${payload.defectQty || 0}`
  } else {
    summary = `今天 ${payload.workHours}小时 · ${total}件 · 良品${payload.goodQty || 0} 不良${payload.defectQty || 0}`
  }
  const row = {
    id: idx >= 0 ? list[idx].id : `freq-${Date.now()}`,
    processName: payload.processName,
    productName: payload.productName,
    productCode: payload.productCode,
    reportMode: mode,
    lastSummary: summary,
  }
  if (idx >= 0) list.splice(idx, 1)
  list.unshift(row)
  uni.setStorageSync(FREQ_KEY, JSON.stringify(list.slice(0, FREQ_LIMIT)))
}
