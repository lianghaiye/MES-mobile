import { resolveDefaultExecutors } from './processConfig'

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
  const quantities = resolveProcessQuantities(qtys)
  return extractProcessNames(routeName).map((name, index) => ({
    id: `proc-${index}-${Date.now()}`,
    name,
    code: '',
    processConfigId: '',
    goodQty: quantities.goodQty,
    defectQty: quantities.defectQty,
    qty: quantities.qty,
    deleted: false,
    manual: false,
    operators: [...resolveDefaultExecutors({ name })],
    defectItemIds: [],
    defectItemNames: [],
  }))
}
