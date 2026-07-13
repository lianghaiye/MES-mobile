import { buildMockPickableWorkOrders } from '@/mock/materialRequisitionSeed'
import { buildMockCompletedWorkOrders } from '@/mock/productInboundSeed'

const WORK_ORDER_SOURCES = [
  { key: 'production', storageKey: 'i_doms_work_orders', field: 'orders', category: '生产工单' },
  { key: 'assembly', storageKey: 'i_doms_assembly_work_orders', field: 'orders', category: '总装工单' },
  { key: 'disassembly', storageKey: 'i_doms_disassembly_work_orders', field: 'orders', category: '拆解工单' },
  { key: 'qc', storageKey: 'i_doms_qc_work_orders', field: 'orders', category: '质检工单' },
]

const PICKABLE_STATUSES = new Set(['待下发', '执行中', '待报工', '已报工', '进行中'])
const COMPLETED_STATUSES = new Set(['已完成', '完成', '已完工', '已关闭'])

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

export function filterWorkOrders({ keyword = '', salesOrderNo = '', workCenter = '' } = {}) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  const so = String(salesOrderNo || '').trim()
  const wc = String(workCenter || '').trim()
  return loadAllWorkOrders()
    .filter(isPickableWorkOrder)
    .filter((o) => {
      if (so && o.salesOrderNo !== so) return false
      if (wc && o.workCenter !== wc) return false
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
    })
    .sort((a, b) => String(b.code).localeCompare(String(a.code)))
}

export function getWorkOrdersByIds(ids = []) {
  const idSet = new Set((ids || []).filter(Boolean))
  if (!idSet.size) return []
  return loadAllWorkOrders().filter((o) => idSet.has(o.id))
}

export function listDistinctWorkCenters() {
  const set = new Set()
  for (const wo of loadAllWorkOrders().filter(isPickableWorkOrder)) {
    if (wo.workCenter) set.add(wo.workCenter)
  }
  return [...set].sort()
}

export function listSalesOrdersWithPickableWorkOrders({ keyword = '', workCenter = '' } = {}) {
  const orders = filterWorkOrders({ keyword, workCenter })
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

export function filterCompletedWorkOrders({ keyword = '', workCenter = '' } = {}) {
  const kw = String(keyword || '')
    .trim()
    .toLowerCase()
  const wc = String(workCenter || '').trim()
  const fromStorage = loadAllWorkOrders().filter(isCompletedWorkOrder)
  const source = fromStorage.length ? fromStorage : buildMockCompletedWorkOrders()
  return source
    .filter((o) => {
      if (wc && o.workCenter !== wc) return false
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
    })
    .sort((a, b) => String(b.code).localeCompare(String(a.code)))
}

export function getCompletedWorkOrdersByIds(ids = []) {
  const idSet = new Set((ids || []).filter(Boolean))
  if (!idSet.size) return []
  const fromStorage = loadAllWorkOrders().filter(isCompletedWorkOrder)
  const source = fromStorage.length ? fromStorage : buildMockCompletedWorkOrders()
  return source.filter((o) => idSet.has(o.id))
}

export function listDistinctCompletedWorkCenters() {
  const set = new Set()
  const fromStorage = loadAllWorkOrders().filter(isCompletedWorkOrder)
  const source = fromStorage.length ? fromStorage : buildMockCompletedWorkOrders()
  for (const wo of source) {
    if (wo.workCenter) set.add(wo.workCenter)
  }
  return [...set].sort()
}

export function listSalesOrdersWithCompletedWorkOrders({ keyword = '', workCenter = '' } = {}) {
  const orders = filterCompletedWorkOrders({ keyword, workCenter })
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
