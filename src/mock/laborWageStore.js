/**
 * 小程序「工时工资」列表（与 WEB 工时管理推送共用 storage key）
 */
import {
  MOBILE_LABOR_WAGE_KEY,
  PUSH_STATUS,
  TASK_STATUS,
  isPushedToMobile,
} from '@/utils/laborWageConstants'

function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function resolveUserNames(user) {
  if (!user) return []
  const names = [user.name, user.nickname, user.username].filter(Boolean)
  return [...new Set(names)]
}

function loadList() {
  try {
    const raw = uni.getStorageSync(MOBILE_LABOR_WAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

export function getWorkerLaborWageLines(user, tab = 'all') {
  const names = resolveUserNames(user)
  let list = loadList().filter(
    (row) => names.includes(row.executor) && isPushedToMobile(row.pushStatus),
  )
  if (tab === 'reported') {
    list = list.filter((row) => row.taskStatus === TASK_STATUS.REPORTED)
  } else if (tab === 'audited') {
    list = list.filter((row) => row.taskStatus === TASK_STATUS.AUDITED)
  }
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

export { TASK_STATUS, PUSH_STATUS }
