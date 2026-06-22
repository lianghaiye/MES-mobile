/**
 * 小程序「工时工资」列表（与 WEB 工时管理推送共用 storage key）
 */
import {
  MOBILE_LABOR_WAGE_KEY,
  PUSH_STATUS,
  TASK_STATUS,
  isPushedToMobile,
} from '@/utils/laborWageConstants'
import { buildLaborWageItemFromRecord } from '@/utils/laborWageBreakdown'
import {
  createLaborWageSeed,
  LABOR_WAGE_SEED_VERSION,
  LABOR_WAGE_SEED_VERSION_KEY,
} from '@/mock/laborWageSeed'
import { reloadProcessReportRecords, resolveRecordPushStatus } from '@/mock/processReportRecords'
import { filterLaborWageLines, collectLaborWageFilterOptions } from '@/utils/laborWageFilter'

function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function resolveUserNames(user) {
  if (!user) return []
  const names = [user.displayName, user.name, user.nickname, user.username].filter(Boolean)
  if (user.displayName === '管理员' || user.username === 'admin') {
    return [...new Set([...names, '张三', 'admin', '管理员'])]
  }
  if (!names.length) return ['张三']
  return [...new Set(names)]
}

function saveList(list) {
  uni.setStorageSync(MOBILE_LABOR_WAGE_KEY, JSON.stringify(list))
}

function loadList() {
  try {
    const raw = uni.getStorageSync(MOBILE_LABOR_WAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

function shouldReseed() {
  return uni.getStorageSync(LABOR_WAGE_SEED_VERSION_KEY) !== LABOR_WAGE_SEED_VERSION
}

function seedLaborWageList() {
  const list = createLaborWageSeed()
  saveList(list)
  uni.setStorageSync(LABOR_WAGE_SEED_VERSION_KEY, LABOR_WAGE_SEED_VERSION)
  return list
}

/** 将已推送的工序报工记录同步进工时工资列表 */
function syncFromProcessReports(list) {
  const records = reloadProcessReportRecords().filter((r) => isPushedToMobile(resolveRecordPushStatus(r)))
  if (!records.length) return list

  const map = new Map(list.map((row) => [row.id, row]))
  records.forEach((record) => {
    const item = buildLaborWageItemFromRecord({
      ...record,
      pushStatus: resolveRecordPushStatus(record),
    })
    if (map.has(item.id)) {
      map.set(item.id, { ...map.get(item.id), ...item })
    } else {
      map.set(item.id, item)
    }
  })
  return [...map.values()]
}

function ensureLaborWageList() {
  let list = loadList()
  if (!list || shouldReseed()) {
    list = seedLaborWageList()
  }
  list = syncFromProcessReports(list)
  saveList(list)
  return list
}

function getWorkerBaseLines(user) {
  const names = resolveUserNames(user)
  return ensureLaborWageList().filter(
    (row) => names.includes(row.executor) && isPushedToMobile(row.pushStatus),
  )
}

export function getWorkerLaborWageFilterOptions(user) {
  return collectLaborWageFilterOptions(getWorkerBaseLines(user))
}

export function getWorkerLaborWageLines(user, tab = 'all', filters = {}) {
  let list = getWorkerBaseLines(user)
  if (tab === 'reported') {
    list = list.filter((row) => row.taskStatus === TASK_STATUS.REPORTED)
  } else if (tab === 'audited') {
    list = list.filter((row) => row.taskStatus === TASK_STATUS.AUDITED)
  }
  list = filterLaborWageLines(list, filters)
  return list.sort((a, b) =>
    (b.pushedAt || b.reportTime || '').localeCompare(a.pushedAt || a.reportTime || ''),
  )
}

export function getWorkerMonthSalary(user) {
  const month = formatDate().slice(0, 7)
  return getWorkerLaborWageLines(user, 'all')
    .filter((row) => (row.reportTime || '').slice(0, 7) === month)
    .reduce((sum, row) => sum + (Number(row.salaryAmount) || 0), 0)
}

export function getLaborWageLineById(id) {
  if (!id) return null
  return ensureLaborWageList().find((row) => row.id === id) || null
}

export { TASK_STATUS, PUSH_STATUS }
