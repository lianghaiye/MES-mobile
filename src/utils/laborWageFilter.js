function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function createEmptyLaborWageFilters() {
  return {
    orderNo: '',
    products: [],
    processes: [],
    period: '',
    startDate: '',
    endDate: '',
  }
}

export function hasTimeFilter(filters = {}) {
  return Boolean(filters.period || filters.startDate || filters.endDate)
}

export function sumLaborWageSalary(list = []) {
  return list.reduce((sum, row) => sum + (Number(row.salaryAmount) || 0), 0)
}

export function getWeekDateRange() {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [formatDate(monday), formatDate(sunday)]
}

export function getMonthDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return [formatDate(start), formatDate(end)]
}

function resolveLineDate(line) {
  return (line.reportTime || line.pushedAt || '').slice(0, 10)
}

function matchPeriod(line, period) {
  const date = resolveLineDate(line)
  if (!date) return false
  if (period === 'week') {
    const [start, end] = getWeekDateRange()
    return date >= start && date <= end
  }
  if (period === 'month') {
    const [start, end] = getMonthDateRange()
    return date >= start && date <= end
  }
  return true
}

export function collectLaborWageFilterOptions(list = []) {
  const products = new Set()
  const processes = new Set()
  list.forEach((row) => {
    if (row.materialName) products.add(row.materialName)
    if (row.processName) processes.add(row.processName)
  })
  return {
    products: [...products].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    processes: [...processes].sort((a, b) => a.localeCompare(b, 'zh-CN')),
  }
}

export function filterLaborWageLines(list = [], filters = {}) {
  let rows = [...list]
  const orderNo = (filters.orderNo || '').trim().toLowerCase()
  if (orderNo) {
    rows = rows.filter((row) => {
      const fields = [row.salesOrderNo, row.workOrderCode, row.taskNo].filter(Boolean)
      return fields.some((f) => String(f).toLowerCase().includes(orderNo))
    })
  }
  if (filters.products?.length) {
    const set = new Set(filters.products)
    rows = rows.filter((row) => set.has(row.materialName))
  }
  if (filters.processes?.length) {
    const set = new Set(filters.processes)
    rows = rows.filter((row) => set.has(row.processName))
  }
  if (filters.period) {
    rows = rows.filter((row) => matchPeriod(row, filters.period))
  } else if (filters.startDate || filters.endDate) {
    const start = filters.startDate || '1970-01-01'
    const end = filters.endDate || '2999-12-31'
    rows = rows.filter((row) => {
      const date = resolveLineDate(row)
      return date && date >= start && date <= end
    })
  }
  return rows
}
