import { resolveDefaultExecutors } from './processConfig'
import { getProcessDefectItems, getProcessReportMode } from '@/utils/iodomsStorage'
import { breakdownToLegacy, syncDefectBreakdownOnQtyChange } from '@/utils/defectBreakdown'
import {
  createScheduledProcessQuantities,
  resolveScheduleQty,
} from '@/utils/processReportQuantities'
import { isDurationReportMode, resolveReportMode } from '@/utils/reportMode'

function defaultProcessTimes() {
  const d = new Date()
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { startTime: t, endTime: t }
}

export function enrichQuickReportProcess(process = {}, qtys = {}) {
  const quantities = resolveProcessQuantities({ ...process, ...qtys })
  const reportMode = resolveReportMode(process.reportMode || getProcessReportMode(process.name))
  const duration = isDurationReportMode(reportMode)
  const times = defaultProcessTimes()
  const items = getProcessDefectItems(process.name)
  const defectQty = quantities.defectQty
  let defectBreakdown = [...(process.defectBreakdown || [])]
  if (defectQty > 0) {
    defectBreakdown = syncDefectBreakdownOnQtyChange(
      { defectQty, defectBreakdown },
      items,
    )
  } else {
    defectBreakdown = []
  }
  const legacy = breakdownToLegacy(defectBreakdown)
  return {
    id: process.id || `proc-${Date.now()}`,
    name: process.name,
    code: process.code || '',
    processConfigId: process.processConfigId || '',
    deleted: !!process.deleted,
    manual: !!process.manual,
    goodQty: quantities.goodQty,
    defectQty: quantities.defectQty,
    qty: quantities.qty,
    reportMode,
    workHours: duration ? Number(process.workHours) || 0 : null,
    startTime: duration ? process.startTime || times.startTime : '',
    endTime: duration ? process.endTime || times.endTime : '',
    scheduleQty: process.scheduleQty ?? quantities.goodQty,
    operators: process.operators || [],
    defectBreakdown: legacy.defectBreakdown,
    defectItemIds: legacy.defectItemIds,
    defectItemNames: legacy.defectItemNames,
    defectReasonLabel: legacy.defectReasonLabel,
  }
}

const ROUTE_KEY = 'i_doms_process_routes'

const legacyRoutes = {
  标准焊接工艺: ['点焊', '打磨', '装配'],
  冲压工艺: ['冲压', '去毛刺', '喷涂'],
  机加标准路线: ['粗车', '精车', '钻孔'],
}

function loadRoutes() {
  try {
    const raw = uni.getStorageSync(ROUTE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return (parsed.routes || []).filter((r) => r.status === '使用中')
  } catch {
    return []
  }
}

export function getActiveRouteNames(productName = '') {
  const routes = loadRoutes()
  if (!routes.length) {
    const hit = Object.entries(legacyRoutes).find(([name]) => productName.includes(name.slice(0, 2)))
    if (hit) return [hit[0]]
    return ['标准焊接工艺']
  }
  const matched = routes.filter((r) => {
    if (r.applyScope === '全部产品') return true
    const display = r.productDisplay || r.itemName || ''
    return display && productName && productName.includes(display)
  })
  const list = (matched.length ? matched : routes).map((r) => r.name)
  return [...new Set(list)]
}

export function resolveProcessQuantities(qtys = {}) {
  let goodQty = Math.max(0, Number(qtys.goodQty) || 0)
  let defectQty = Math.max(0, Number(qtys.defectQty) || 0)
  const legacyQty = Math.max(0, Number(qtys.qty) || 0)
  const finishedQty =
    qtys.finishedQty != null ? Math.max(0, Number(qtys.finishedQty) || 0) : goodQty + defectQty

  if (goodQty + defectQty <= 0 && legacyQty > 0) {
    return { goodQty: legacyQty, defectQty: 0, qty: legacyQty }
  }
  if (goodQty + defectQty <= 0 && finishedQty > 0) {
    return { goodQty: finishedQty, defectQty: 0, qty: finishedQty }
  }
  return { goodQty, defectQty, qty: goodQty + defectQty }
}

function extractProcessNames(routeName) {
  const route = loadRoutes().find((r) => r.name === routeName)
  if (route?.grid?.length) {
    const names = []
    route.grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell?.processName && !names.includes(cell.processName)) {
          names.push(cell.processName)
        }
      })
    })
    if (names.length) return names
  }
  const legacy = legacyRoutes[routeName]
  if (legacy) return legacy
  return ['工序1', '工序2']
}

export function buildQuickReportProcessesFromRoute(routeName, qtys = {}) {
  const scheduleQty = resolveScheduleQty(qtys)
  const useScheduleDefault = qtys.useScheduleDefault !== false && scheduleQty > 0 && qtys.scheduleQty != null
  const quantities = useScheduleDefault
    ? createScheduledProcessQuantities(scheduleQty)
    : resolveProcessQuantities(qtys)
  return extractProcessNames(routeName).map((name, index) =>
    enrichQuickReportProcess(
      {
        id: `proc-${index}-${Date.now()}`,
        name,
        deleted: false,
        manual: false,
        scheduleQty: useScheduleDefault ? scheduleQty : quantities.goodQty,
        operators: resolveDefaultExecutors({ name }).slice(0, 1),
      },
      quantities,
    ),
  )
}
