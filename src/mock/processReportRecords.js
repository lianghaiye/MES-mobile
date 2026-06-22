/** 工序报工记录（工单报工 + 快速报工合并） */

import { getUser } from '@/utils/auth'
import { isDurationReportMode, resolveReportMode } from '@/utils/reportMode'
import { breakdownToLegacy, validateDefectBreakdown } from '@/utils/defectBreakdown'
import { getProcessDefectItems } from '@/utils/iodomsStorage'
import { PUSH_STATUS, TASK_STATUS, isAutoSalaryPush } from '@/utils/laborWageConstants'

const MIGRATE_KEY = 'i_doms_process_report_mode_migrate_v'
const MIGRATE_VERSION = '3'

function withNormalizedMode(row) {
  if (!row) return row
  return { ...row, reportMode: resolveReportMode(row.reportMode) }
}

function migrateFrequentList(list) {
  return (list || []).map(withNormalizedMode)
}

function resolvePushStatus(row = {}) {
  let pushStatus = row.pushStatus
  if (!pushStatus) {
    pushStatus = row.pushedAt ? PUSH_STATUS.PUSHED : PUSH_STATUS.NOT_PUSHED
  }
  if (
    isAutoSalaryPush() &&
    pushStatus === PUSH_STATUS.NOT_PUSHED &&
    row.source === 'workorder'
  ) {
    pushStatus = PUSH_STATUS.AUTO_PUSHED
  }
  return pushStatus
}

function migrateRecord(row) {
  const next = withNormalizedMode(row)
  if (!next.taskStatus) {
    next.taskStatus = next.status === '已审核' ? TASK_STATUS.AUDITED : TASK_STATUS.REPORTED
  }
  if (!next.operator) next.operator = next.reporter || ''
  next.pushStatus = resolvePushStatus(next)
  if (!next.taskScope && next.source === 'workorder') {
    next.taskScope = next.operator && next.reporter && next.operator !== next.reporter
      ? '小组'
      : '个人'
  }
  return next
}

function migrateStoredRecords(list) {
  return (list || []).map(migrateRecord)
}

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
      operator: '张三',
      groupName: '焊接小组',
      goodQty: 23,
      defectQty: 2,
      finishedQty: 25,
      workHours: null,
      startTime: '',
      endTime: '',
      defectBreakdown: [{ id: 'di-5', name: '气孔', qty: 2 }],
      defectItemIds: ['di-5'],
      defectItemNames: ['气孔'],
      defectReasonLabel: '气孔×2',
      remark: '',
      status: '待审核',
      rejectReason: '',
      reporter: '张三',
      taskScope: '小组',
      pushStatus: PUSH_STATUS.NOT_PUSHED,
      createdAt: `${today} 14:30`,
      timeLabel: '今天 14:30',
    },
    {
      id: 'pr-2',
      source: 'quick',
      productId: 'prod-3',
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
      pushStatus: PUSH_STATUS.NOT_PUSHED,
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
      operator: '张三',
      groupName: '加工小组',
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
      taskScope: '个人',
      pushStatus: PUSH_STATUS.PUSHED,
      pushedAt: '2026-06-10 16:25:00',
      createdAt: '2026-06-10 16:20',
      timeLabel: '昨天 16:20',
    },
    {
      id: 'pr-4',
      source: 'quick',
      productId: 'prod-1',
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
      pushStatus: PUSH_STATUS.NOT_PUSHED,
      createdAt: '2026-06-09 15:40',
      timeLabel: '前天 15:40',
    },
  ]
}

function load() {
  let list = null
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  if (!list) return migrateStoredRecords(createSeed())
  if (uni.getStorageSync(MIGRATE_KEY) !== MIGRATE_VERSION) {
    list = migrateStoredRecords(list)
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(list))
    migrateFrequentReports()
    uni.setStorageSync(MIGRATE_KEY, MIGRATE_VERSION)
  }
  return migrateStoredRecords(list)
}

let cache = load()

export function reloadProcessReportRecords() {
  cache = load()
  return cache
}

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

export function resolveRecordPushStatus(record) {
  return resolvePushStatus(record || {})
}

export function getMyRecords(user, pushFilter = 'all') {
  reloadProcessReportRecords()
  const names = resolveReporterNames(user)
  let list = cache.filter(
    (r) => names.includes(r.reporter) || (r.operator && names.includes(r.operator)),
  )
  if (pushFilter !== 'all') {
    list = list.filter((r) => resolveRecordPushStatus(r) === pushFilter)
  }
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export { PUSH_STATUS }

export function getRecordStats(user) {
  const list = getMyRecords(user, 'all')
  return {
    notPushed: list.filter((r) => resolveRecordPushStatus(r) === PUSH_STATUS.NOT_PUSHED).length,
    pushed: list.filter((r) => resolveRecordPushStatus(r) === PUSH_STATUS.PUSHED).length,
    autoPushed: list.filter((r) => resolveRecordPushStatus(r) === PUSH_STATUS.AUTO_PUSHED).length,
  }
}

export function getRecordById(id) {
  reloadProcessReportRecords()
  return cache.find((r) => r.id === id) || null
}

function validateReportPayload(payload) {
  const good = Number(payload.goodQty) || 0
  const defect = Number(payload.defectQty) || 0
  const durationMode = isDurationReportMode(payload.reportMode)

  if (durationMode) {
    const hours = Number(payload.workHours)
    if (!hours || hours <= 0) return { ok: false, message: '请填写工作时长' }
  } else if (good + defect <= 0) {
    return { ok: false, message: '请填写良品数或不良品数' }
  }

  const defectItems = getProcessDefectItems(payload.processName)
  const defectErr = validateDefectBreakdown(defect, payload.defectBreakdown, defectItems)
  if (defectErr) return { ok: false, message: defectErr }

  return { ok: true, good, defect, defectItems }
}

function buildRecordFromPayload(payload, base = {}) {
  const check = validateReportPayload(payload)
  if (!check.ok) return check

  const { good, defect } = check
  const legacy = breakdownToLegacy(payload.defectBreakdown || [])
  const time = nowTime()

  return {
    ok: true,
    record: migrateRecord({
      ...base,
      source: payload.source || base.source || 'quick',
      taskId: payload.taskId || base.taskId || '',
      taskNo: payload.taskNo || base.taskNo || '',
      workOrderNo: payload.workOrderNo || base.workOrderNo || '',
      workOrderId: payload.workOrderId || base.workOrderId || '',
      processId: payload.processId || base.processId || '',
      productId: payload.productId || base.productId || '',
      processName: payload.processName,
      productName: payload.productName,
      productCode: payload.productCode,
      targetQty: payload.targetQty ?? base.targetQty ?? null,
      reportMode: resolveReportMode(payload.reportMode),
      goodQty: good,
      defectQty: defect,
      finishedQty: good + defect,
      workHours: isDurationReportMode(payload.reportMode) ? Number(payload.workHours) : null,
      startTime: payload.startTime || nowTime(),
      endTime: payload.endTime || nowTime(),
      defectBreakdown: legacy.defectBreakdown,
      defectItemIds: legacy.defectItemIds,
      defectItemNames: legacy.defectItemNames,
      defectReasonLabel: legacy.defectReasonLabel,
      remark: payload.remark || '',
      images: Array.isArray(payload.images) ? [...payload.images] : [],
      operator: payload.operator || base.operator || '',
      reporter: payload.reporter || base.reporter || '',
      groupName: payload.groupName || base.groupName || '',
      taskScope: payload.taskScope || base.taskScope || '',
      pushedAt: payload.pushedAt || base.pushedAt || '',
      status: '待审核',
      rejectReason: '',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      timeLabel: `今天 ${time}`,
    }),
  }
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function submitProcessReport(payload) {
  const user = getUser()
  const reporter = payload.reporter || user?.displayName || '当前用户'
  const built = buildRecordFromPayload(payload, {
    id: `pr-${Date.now()}`,
    reporter,
  })
  if (!built.ok) return built

  cache.unshift(built.record)
  save()
  updateFrequentReport(payload)
  return { ok: true, message: '报工已提交，等待审核', record: built.record }
}

export function resubmitProcessReport(id, payload) {
  const idx = cache.findIndex((r) => r.id === id)
  if (idx < 0) return { ok: false, message: '记录不存在' }

  const existing = cache[idx]
  if (existing.status !== '已拒绝') {
    return { ok: false, message: '仅已拒绝的记录可重新提交' }
  }

  const built = buildRecordFromPayload(payload, {
    id: existing.id,
    reporter: existing.reporter,
  })
  if (!built.ok) return built

  cache[idx] = built.record
  save()
  updateFrequentReport(payload)
  return { ok: true, message: '已重新提交，等待审核', record: built.record }
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

function migrateFrequentReports() {
  let list = []
  try {
    const raw = uni.getStorageSync(FREQ_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  if (!list.length) return
  const migrated = migrateFrequentList(list)
  uni.setStorageSync(FREQ_KEY, JSON.stringify(migrated))
}

export function getFrequentReports() {
  let list = []
  try {
    const raw = uni.getStorageSync(FREQ_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  if (!list.length) list = defaultFrequent()
  return migrateFrequentList(list).slice(0, FREQ_LIMIT)
}

function updateFrequentReport(payload) {
  const list = getFrequentReports()
  const idx = list.findIndex(
    (f) => f.processName === payload.processName && f.productCode === payload.productCode,
  )
  const mode = resolveReportMode(payload.reportMode)
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
    productId: payload.productId || '',
    reportMode: mode,
    lastSummary: summary,
  }
  if (idx >= 0) list.splice(idx, 1)
  list.unshift(row)
  uni.setStorageSync(FREQ_KEY, JSON.stringify(list.slice(0, FREQ_LIMIT)))
}
