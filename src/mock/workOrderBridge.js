import { buildMockPickableWorkOrders } from '@/mock/materialRequisitionSeed'
import { buildMockCompletedWorkOrders } from '@/mock/productInboundSeed'
import { listMaterialRequisitions } from '@/store/materialRequisitionStore'
import { listProductInbounds } from '@/store/productInboundStore'

const WORK_ORDER_SOURCES = [
  { key: 'production', storageKey: 'i_doms_work_orders', field: 'orders', category: '生产工单' },
  { key: 'assembly', storageKey: 'i_doms_assembly_work_orders', field: 'orders', category: '总装工单' },
  { key: 'disassembly', storageKey: 'i_doms_disassembly_work_orders', field: 'orders', category: '拆解工单' },
  { key: 'qc', storageKey: 'i_doms_qc_work_orders', field: 'orders', category: '质检工单' },
]

const PICKABLE_STATUSES = new Set(['待下发', '执行中', '待报工', '已报工', '进行中'])
const COMPLETED_STATUSES = new Set(['已完成', '完成', '已完工', '已关闭'])

/** 工单领料列表状态排序：执行中 > 待下发 > 完成 */
const STATUS_SORT_RANK = {
  执行中: 1,
  进行中: 1,
  待报工: 1,
  已报工: 1,
  待下发: 2,
  完成: 3,
  已完成: 3,
  已完工: 3,
  已关闭: 3,
}

/** 工单类型筛选：生产 / 总装 / 部装 / 外协 / 维修 */
export const WORK_ORDER_TYPE_FILTERS = [
  { value: '', label: '全部类型' },
  { value: 'production', label: '生产' },
  { value: 'assembly', label: '总装' },
  { value: 'subAssembly', label: '部装' },
  { value: 'outsource', label: '外协' },
  { value: 'maintenance', label: '维修' },
]

const ORDER_TYPE_CATEGORIES = {
  production: ['生产工单', '试制工单'],
  assembly: ['总装工单'],
  subAssembly: ['部装工单'],
  outsource: ['外协工单'],
  maintenance: ['维修工单', '返修工单'],
}

/** 时间筛选：今日 / 昨日 / 近三天 */
export const WORK_ORDER_DATE_FILTERS = [
  { value: '', label: '全部时间' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'last3', label: '近三天' },
]

function loadJson(key, field) {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.[field] || []
  } catch {
    return []
  }
}

function resolveCreatedAt(row = {}) {
  return (
    row.createdAt ||
    row.createTime ||
    row.createdTime ||
    row.createDate ||
    row.planStartDate ||
    ''
  )
}

function normalizeProductionOrder(row, sourceKey, defaultCategory) {
  return {
    id: row.id,
    code: row.code || row.workOrderCode || '',
    name: row.name || row.workOrderName || row.productName || '',
    productName: row.productName || row.itemName || row.name || '',
    productCode: row.materialCode || row.itemCode || row.productCode || '',
    material: row.material || '',
    drawingNo: row.drawingNo || '',
    salesOrderNo: row.salesOrderNo || row.sourceOrderNo || '',
    orderCategory: row.orderCategory || defaultCategory,
    status: row.status || '待下发',
    workCenter: row.workCenter || row.workshop || '默认工厂',
    warehouse: row.warehouse || '',
    scheduleQty: row.scheduleQty ?? row.planQty ?? row.disassemblyQty ?? 0,
    bomId: row.bomId || '',
    bom: row.bom || row.bomLabel || row.ebomName || '',
    componentLines: row.componentLines || [],
    ebomSnapshot: row.ebomSnapshot || null,
    skipEbom: Boolean(row.skipEbom),
    createdAt: resolveCreatedAt(row),
    source: sourceKey,
    raw: row,
  }
}

function normalizeDisassemblyOrder(row) {
  return {
    id: row.id,
    code: row.code || row.workOrderCode || '',
    name: row.name || row.workOrderName || row.itemName || '',
    productName: row.itemName || row.productName || row.name || '',
    productCode: row.itemCode || row.materialCode || '',
    material: row.material || '',
    drawingNo: row.drawingNo || '',
    salesOrderNo: row.salesOrderNo || row.sourceOrderNo || '',
    orderCategory: '拆解工单',
    status: row.status || '待下发',
    workCenter: row.workCenter || '拆解车间',
    warehouse: row.warehouse || '',
    scheduleQty: row.disassemblyQty ?? row.scheduleQty ?? row.planQty ?? 0,
    bomId: row.bomId || '',
    bom: row.ebomName || row.bom || '',
    componentLines: row.componentLines || [],
    ebomSnapshot: row.ebomSnapshot || row.disassemblyEbom || null,
    skipEbom: false,
    createdAt: resolveCreatedAt(row),
    source: 'disassembly',
    raw: row,
  }
}

function loadOrdersFromStorage() {
  const list = []
  for (const src of WORK_ORDER_SOURCES) {
    const rows = loadJson(src.storageKey, src.field)
    for (const row of rows) {
      if (src.key === 'disassembly') {
        list.push(normalizeDisassemblyOrder(row))
      } else {
        list.push(normalizeProductionOrder(row, src.key, src.category))
      }
    }
  }
  return list
}

export function isPickableWorkOrder(order) {
  if (!order) return false
  if (COMPLETED_STATUSES.has(order.status)) return false
  return PICKABLE_STATUSES.has(order.status) || !order.status
}

export function isCompletedWorkOrder(order) {
  if (!order) return false
  return COMPLETED_STATUSES.has(order.status)
}

/** 工单领料可选：含执行中/待下发/完成 */
export function isMaterialReqListableWorkOrder(order) {
  if (!order) return false
  return isPickableWorkOrder(order) || isCompletedWorkOrder(order)
}

export function loadAllWorkOrders() {
  const fromStorage = loadOrdersFromStorage()
  if (fromStorage.length) return fromStorage
  return buildMockPickableWorkOrders()
}

export function getWorkOrderById(id) {
  if (!id) return null
  const hit = loadAllWorkOrders().find((o) => o.id === id)
  if (hit) return hit
  return buildMockCompletedWorkOrders().find((o) => o.id === id) || null
}

function startOfDayMs(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function parseWorkOrderCreatedAtMs(order) {
  const raw = order?.createdAt || resolveCreatedAt(order?.raw || {})
  if (!raw) return 0
  const normalized = String(raw).trim().replace(/-/g, '/')
  const t = Date.parse(normalized)
  return Number.isFinite(t) ? t : 0
}

function matchDateRange(order, dateRange) {
  const range = String(dateRange || '').trim()
  if (!range) return true
  const createdMs = parseWorkOrderCreatedAtMs(order)
  if (!createdMs) return false
  const dayMs = 24 * 60 * 60 * 1000
  const orderDay = startOfDayMs(createdMs)
  const today = startOfDayMs()
  if (range === 'today') return orderDay === today
  if (range === 'yesterday') return orderDay === today - dayMs
  if (range === 'last3') return orderDay >= today - 2 * dayMs && orderDay <= today
  return true
}

function matchOrderType(order, orderType) {
  const type = String(orderType || '').trim()
  if (!type) return true
  const categories = ORDER_TYPE_CATEGORIES[type]
  if (!categories) return true
  return categories.includes(String(order.orderCategory || '').trim())
}

function statusSortRank(status) {
  return STATUS_SORT_RANK[String(status || '').trim()] || 99
}

/** 状态优先级 → 创建时间倒序 */
export function sortWorkOrdersForMaterialReq(list = []) {
  return [...list].sort((a, b) => {
    const rankDiff = statusSortRank(a.status) - statusSortRank(b.status)
    if (rankDiff !== 0) return rankDiff
    return parseWorkOrderCreatedAtMs(b) - parseWorkOrderCreatedAtMs(a)
  })
}

/**
 * 已申请过领料的工单 id / code 集合
 * @returns {{ ids: Set<string>, codes: Set<string> }}
 */
export function getAppliedMaterialReqWorkOrderKeys() {
  const ids = new Set()
  const codes = new Set()
  for (const req of listMaterialRequisitions()) {
    if (req.mode === 'quick') continue
    if (req.workOrderId) ids.add(String(req.workOrderId))
    if (req.workOrderCode) codes.add(String(req.workOrderCode))
    for (const id of req.workOrderIds || []) {
      if (id) ids.add(String(id))
    }
    for (const wo of req.workOrders || []) {
      if (wo?.id) ids.add(String(wo.id))
      if (wo?.code) codes.add(String(wo.code))
    }
  }
  return { ids, codes }
}

export function isWorkOrderMaterialReqApplied(order, appliedKeys) {
  if (!order) return false
  const keys = appliedKeys || getAppliedMaterialReqWorkOrderKeys()
  if (order.id && keys.ids.has(String(order.id))) return true
  if (order.code && keys.codes.has(String(order.code))) return true
  return false
}

export function filterWorkOrders({
  keyword = '',
  salesOrderNo = '',
  workCenter = '',
  dateRange = '',
  orderType = '',
  includeCompleted = false,
} = {}) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  const so = String(salesOrderNo || '').trim()
  const wc = String(workCenter || '').trim()
  const statusFilter = includeCompleted ? isMaterialReqListableWorkOrder : isPickableWorkOrder
  return sortWorkOrdersForMaterialReq(
    loadAllWorkOrders()
      .filter(statusFilter)
      .filter((o) => {
        if (so && o.salesOrderNo !== so) return false
        if (wc && o.workCenter !== wc) return false
        if (!matchDateRange(o, dateRange)) return false
        if (!matchOrderType(o, orderType)) return false
        if (!kw) return true
        const hay = [
          o.code,
          o.name,
          o.productName,
          o.productCode,
          o.orderCategory,
          o.material,
          o.drawingNo,
          o.salesOrderNo,
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(kw)
      }),
  )
}

export function getWorkOrdersByIds(ids = []) {
  const idSet = new Set((ids || []).filter(Boolean))
  if (!idSet.size) return []
  return loadAllWorkOrders().filter((o) => idSet.has(o.id))
}

export function listDistinctWorkCenters() {
  const set = new Set()
  for (const wo of loadAllWorkOrders().filter(isMaterialReqListableWorkOrder)) {
    if (wo.workCenter) set.add(wo.workCenter)
  }
  return [...set].sort()
}

export function listSalesOrdersWithPickableWorkOrders({
  keyword = '',
  workCenter = '',
  dateRange = '',
  orderType = '',
} = {}) {
  const orders = filterWorkOrders({
    keyword,
    workCenter,
    dateRange,
    orderType,
    includeCompleted: true,
  })
  const map = new Map()
  for (const wo of orders) {
    const key = wo.salesOrderNo || '(无销售订单)'
    if (!map.has(key)) {
      map.set(key, {
        salesOrderNo: wo.salesOrderNo || '',
        displayNo: key,
        workOrderCount: 0,
        workCenterSet: new Set(),
        productNames: new Set(),
        workOrders: [],
      })
    }
    const group = map.get(key)
    group.workOrderCount += 1
    group.workCenterSet.add(wo.workCenter)
    group.productNames.add(wo.productName)
    group.workOrders.push(wo)
  }
  return [...map.values()]
    .map((group) => ({
      salesOrderNo: group.salesOrderNo,
      displayNo: group.displayNo,
      workOrderCount: group.workOrderCount,
      workCenters: [...group.workCenterSet],
      workCenterLabel: [...group.workCenterSet].join('、'),
      productSummary:
        [...group.productNames].slice(0, 3).join('、') +
        (group.productNames.size > 3 ? '…' : ''),
      workOrders: group.workOrders,
    }))
    .sort((a, b) => String(b.salesOrderNo).localeCompare(String(a.salesOrderNo)))
}

function resolveCompletedWorkOrderSource() {
  const stored = loadOrdersFromStorage()
  if (stored.length) {
    return loadAllWorkOrders().filter(isCompletedWorkOrder)
  }
  // 无本地工单时，使用成品入库演示种子（含时间/类型筛选样例）
  return buildMockCompletedWorkOrders()
}

export function filterCompletedWorkOrders({
  keyword = '',
  workCenter = '',
  dateRange = '',
  orderType = '',
} = {}) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  const wc = String(workCenter || '').trim()
  const source = resolveCompletedWorkOrderSource()
  return sortWorkOrdersForMaterialReq(
    source.filter((o) => {
      if (wc && o.workCenter !== wc) return false
      if (!matchDateRange(o, dateRange)) return false
      if (!matchOrderType(o, orderType)) return false
      if (!kw) return true
      const hay = [
        o.code,
        o.name,
        o.productName,
        o.productCode,
        o.orderCategory,
        o.material,
        o.drawingNo,
        o.salesOrderNo,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(kw)
    }),
  )
}

export function getCompletedWorkOrdersByIds(ids = []) {
  const idSet = new Set((ids || []).filter(Boolean))
  if (!idSet.size) return []
  return resolveCompletedWorkOrderSource().filter((o) => idSet.has(o.id))
}

export function listDistinctCompletedWorkCenters() {
  const set = new Set()
  for (const wo of resolveCompletedWorkOrderSource()) {
    if (wo.workCenter) set.add(wo.workCenter)
  }
  return [...set].sort()
}

export function listSalesOrdersWithCompletedWorkOrders({
  keyword = '',
  workCenter = '',
  dateRange = '',
  orderType = '',
} = {}) {
  const orders = filterCompletedWorkOrders({ keyword, workCenter, dateRange, orderType })
  const map = new Map()
  for (const wo of orders) {
    const key = wo.salesOrderNo || '(无销售订单)'
    if (!map.has(key)) {
      map.set(key, {
        salesOrderNo: wo.salesOrderNo || '',
        displayNo: key,
        workOrderCount: 0,
        workCenterSet: new Set(),
        productNames: new Set(),
        workOrders: [],
      })
    }
    const group = map.get(key)
    group.workOrderCount += 1
    group.workCenterSet.add(wo.workCenter)
    group.productNames.add(wo.productName)
    group.workOrders.push(wo)
  }
  return [...map.values()]
    .map((group) => ({
      salesOrderNo: group.salesOrderNo,
      displayNo: group.displayNo,
      workOrderCount: group.workOrderCount,
      workCenters: [...group.workCenterSet],
      workCenterLabel: [...group.workCenterSet].join('、'),
      productSummary:
        [...group.productNames].slice(0, 3).join('、') +
        (group.productNames.size > 3 ? '…' : ''),
      workOrders: group.workOrders,
    }))
    .sort((a, b) => String(b.salesOrderNo).localeCompare(String(a.salesOrderNo)))
}

/**
 * 已申请过成品入库的工单 id / code 集合
 * @returns {{ ids: Set<string>, codes: Set<string> }}
 */
export function getAppliedProductInboundWorkOrderKeys() {
  const ids = new Set()
  const codes = new Set()
  for (const req of listProductInbounds()) {
    if (req.mode === 'quick') continue
    if (req.workOrderId) ids.add(String(req.workOrderId))
    if (req.workOrderCode) codes.add(String(req.workOrderCode))
    for (const id of req.workOrderIds || []) {
      if (id) ids.add(String(id))
    }
    for (const wo of req.workOrders || []) {
      if (wo?.id) ids.add(String(wo.id))
      if (wo?.code) codes.add(String(wo.code))
    }
  }
  return { ids, codes }
}

export function isWorkOrderProductInboundApplied(order, appliedKeys) {
  if (!order) return false
  const keys = appliedKeys || getAppliedProductInboundWorkOrderKeys()
  if (order.id && keys.ids.has(String(order.id))) return true
  if (order.code && keys.codes.has(String(order.code))) return true
  return false
}
