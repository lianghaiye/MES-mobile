const WAREHOUSE_STORAGE_KEY = 'i_doms_warehouses'
const LINE_SIDE_CATEGORY = '线边仓'

/** 领用车间与 WEB 仓库「所属工作中心」别名映射 */
const WORK_CENTER_ALIASES = {
  机加车间: ['机械中心', '机泵'],
  装配车间: ['组装中心'],
  总装车间: ['组装中心', '机械中心'],
  拆解车间: ['默认工厂'],
  质检车间: ['默认工厂', '质检中心'],
}

const fallbackLineSideWarehouses = [
  {
    id: 'wh-002',
    name: '库线边仓',
    categoryName: '线边仓',
    workCenter: '机械中心',
    enabled: true,
  },
  {
    id: 'wh-004',
    name: '原料仓',
    categoryName: '线边仓',
    workCenter: '默认工厂',
    enabled: true,
  },
]

function loadWarehouses() {
  try {
    const raw = uni.getStorageSync(WAREHOUSE_STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.warehouses || []
  } catch {
    return []
  }
}

function normalizeWorkCenter(value = '') {
  return String(value || '').trim()
}

function isWorkCenterMatched(warehouseWorkCenter, workshop) {
  const wh = normalizeWorkCenter(warehouseWorkCenter)
  const ws = normalizeWorkCenter(workshop)
  if (!ws) return true
  if (!wh) return false
  if (wh === ws) return true
  const aliases = WORK_CENTER_ALIASES[ws] || []
  return aliases.includes(wh)
}

function isLineSideWarehouse(warehouse) {
  if (!warehouse || warehouse.enabled === false) return false
  return warehouse.categoryName === LINE_SIDE_CATEGORY
}

function toReceiveOption(warehouse) {
  return {
    label: warehouse.name,
    value: warehouse.name,
    id: warehouse.id,
    workCenter: warehouse.workCenter || '',
  }
}

function loadAllLineSideWarehouses() {
  const warehouses = loadWarehouses().filter(isLineSideWarehouse)
  if (warehouses.length) return warehouses
  return fallbackLineSideWarehouses
}

function getMatchedReceiveWarehouseOptions(workCenter = '') {
  return loadAllLineSideWarehouses()
    .filter((w) => isWorkCenterMatched(w.workCenter, workCenter))
    .map(toReceiveOption)
}

/** 领入仓库下拉选项：全部线边仓，供用户手工选择 */
export function getReceiveWarehouseOptions() {
  return loadAllLineSideWarehouses().map(toReceiveOption)
}

/** 解析领入仓库默认值：仅当车间匹配到线边仓时自动带出，否则留空由用户选择 */
export function resolveDefaultReceiveWarehouse(workCenter = '', currentValue = '') {
  const matched = getMatchedReceiveWarehouseOptions(workCenter)
  if (!matched.length) return ''
  if (currentValue && matched.some((item) => item.value === currentValue)) {
    return currentValue
  }
  return matched[0].value
}

export function hasMatchedReceiveWarehouseForWorkCenter(workCenter = '') {
  return getMatchedReceiveWarehouseOptions(workCenter).length > 0
}

export function formatReceiveWarehouseLabel(value = '') {
  if (!value) return '—'
  const hit = getReceiveWarehouseOptions().find((item) => item.value === value)
  return hit?.label || value
}

const FINISHED_WAREHOUSE_CATEGORY = '成品仓'

const fallbackFinishedWarehouses = [
  { id: 'wh-003', name: '成品主仓', categoryName: '成品仓', workCenter: '组装中心', enabled: true },
  { id: 'wh-fb-1', name: '成品仓', categoryName: '成品仓', workCenter: '默认工厂', enabled: true },
]

function isFinishedWarehouse(warehouse) {
  if (!warehouse || warehouse.enabled === false) return false
  return warehouse.categoryName === FINISHED_WAREHOUSE_CATEGORY
}

function toWarehouseOption(warehouse) {
  return {
    label: warehouse.name,
    value: warehouse.name,
    id: warehouse.id,
    workCenter: warehouse.workCenter || '',
  }
}

/** 成品入库可选仓库（成品仓） */
export function getFinishedInboundWarehouseOptions(workCenter = '') {
  const warehouses = loadWarehouses()
  const matched = warehouses
    .filter((w) => isFinishedWarehouse(w) && isWorkCenterMatched(w.workCenter, workCenter))
    .map(toWarehouseOption)

  if (matched.length) return matched

  const fallback = fallbackFinishedWarehouses
    .filter((w) => isWorkCenterMatched(w.workCenter, workCenter))
    .map(toWarehouseOption)

  if (fallback.length) return fallback

  return fallbackFinishedWarehouses.map(toWarehouseOption)
}

export function resolveDefaultFinishedWarehouse(workCenter = '', currentValue = '') {
  const options = getFinishedInboundWarehouseOptions(workCenter)
  if (currentValue && options.some((item) => item.value === currentValue)) {
    return currentValue
  }
  return options[0]?.value || '成品主仓'
}

export function formatFinishedWarehouseLabel(value = '') {
  if (!value) return '—'
  const options = getFinishedInboundWarehouseOptions()
  const hit = options.find((item) => item.value === value)
  return hit?.label || value
}
