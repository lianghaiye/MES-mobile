/**
 * 审批 Storage 桥接：读取 PC 同源 localStorage/uni.storage，执行通过/驳回
 */
import {
  APPROVAL_BIZ,
  PENDING_STATUS,
  STORAGE_KEYS,
} from '@/constants/approvalTypes'
import { buildApprovalDemoPayload } from '@/mock/approvalSeed'
import {
  isSalesOrderPending,
  toSalesApprovalItem,
  toSalesDetailView,
} from '@/utils/approvalAdapters/salesOrder'
import {
  isPurchaseOrderPending,
  toPurchaseApprovalItem,
  toPurchaseDetailView,
} from '@/utils/approvalAdapters/purchaseOrder'
import {
  isOutsourcingOrderPending,
  toOutsourcingApprovalItem,
  toOutsourcingDetailView,
} from '@/utils/approvalAdapters/outsourcingOrder'

const SEED_FLAG_KEY = 'i_doms_mobile_approval_seed_v1'

function nowText() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function readStorage(key) {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

function writeStorage(key, payload) {
  uni.setStorageSync(key, JSON.stringify(payload))
}

function loadOrders(key) {
  const parsed = readStorage(key)
  if (!parsed) return []
  if (Array.isArray(parsed.orders)) return parsed.orders
  if (Array.isArray(parsed)) return parsed
  return []
}

function saveOrders(key, orders, extra = {}) {
  const existing = readStorage(key) || {}
  writeStorage(key, { ...existing, orders, ...extra })
}

/** PC 审批人 mock 为 admin1；移动端 admin/管理员 视为同一审批人 */
export function resolveApproverName(user) {
  const name = String(user?.username || user?.displayName || '').trim()
  if (!name) return 'admin1'
  if (name === 'admin' || name === '管理员') return 'admin1'
  return name
}

export function ensureApprovalStorageSeed() {
  const sales = loadOrders(STORAGE_KEYS.SALES)
  const purchase = loadOrders(STORAGE_KEYS.PURCHASE)
  const outsourcing = loadOrders(STORAGE_KEYS.OUTSOURCING)
  const hasPending =
    sales.some(isSalesOrderPending) ||
    purchase.some(isPurchaseOrderPending) ||
    outsourcing.some(isOutsourcingOrderPending)
  if (hasPending) return
  if (uni.getStorageSync(SEED_FLAG_KEY)) return

  const demo = buildApprovalDemoPayload()
  Object.entries(demo).forEach(([key, payload]) => {
    writeStorage(key, payload)
  })
  uni.setStorageSync(SEED_FLAG_KEY, '1')
}

function pushApprovalRecord(order, { role, result, opinion }, approverName) {
  if (!Array.isArray(order.approvalRecords)) order.approvalRecords = []
  order.approvalRecords.unshift({
    name: approverName,
    role,
    result,
    time: nowText(),
    opinion: String(opinion || '').trim(),
  })
}

function findOrder(bizType, bizId) {
  ensureApprovalStorageSeed()
  if (bizType === APPROVAL_BIZ.SALES_ORDER) {
    return loadOrders(STORAGE_KEYS.SALES).find((o) => o.id === bizId) || null
  }
  if (bizType === APPROVAL_BIZ.PURCHASE_ORDER) {
    return loadOrders(STORAGE_KEYS.PURCHASE).find((o) => o.id === bizId) || null
  }
  if (bizType === APPROVAL_BIZ.OUTSOURCING_ORDER) {
    return loadOrders(STORAGE_KEYS.OUTSOURCING).find((o) => o.id === bizId) || null
  }
  return null
}

function updateOrder(bizType, bizId, mutator) {
  ensureApprovalStorageSeed()
  if (bizType === APPROVAL_BIZ.SALES_ORDER) {
    const orders = loadOrders(STORAGE_KEYS.SALES)
    const idx = orders.findIndex((o) => o.id === bizId)
    if (idx < 0) return { ok: false, message: '销售订单不存在' }
    mutator(orders[idx])
    saveOrders(STORAGE_KEYS.SALES, orders)
    return { ok: true, order: orders[idx] }
  }
  if (bizType === APPROVAL_BIZ.PURCHASE_ORDER) {
    const orders = loadOrders(STORAGE_KEYS.PURCHASE)
    const idx = orders.findIndex((o) => o.id === bizId)
    if (idx < 0) return { ok: false, message: '采购订单不存在' }
    mutator(orders[idx])
    saveOrders(STORAGE_KEYS.PURCHASE, orders)
    return { ok: true, order: orders[idx] }
  }
  if (bizType === APPROVAL_BIZ.OUTSOURCING_ORDER) {
    const orders = loadOrders(STORAGE_KEYS.OUTSOURCING)
    const idx = orders.findIndex((o) => o.id === bizId)
    if (idx < 0) return { ok: false, message: '外协订单不存在' }
    mutator(orders[idx])
    saveOrders(STORAGE_KEYS.OUTSOURCING, orders)
    return { ok: true, order: orders[idx] }
  }
  return { ok: false, message: '未知单据类型' }
}

function collectPendingItems(bizTypeFilter = '') {
  ensureApprovalStorageSeed()
  const items = []
  if (!bizTypeFilter || bizTypeFilter === APPROVAL_BIZ.SALES_ORDER) {
    loadOrders(STORAGE_KEYS.SALES)
      .filter(isSalesOrderPending)
      .forEach((o) => {
        const mapped = toSalesApprovalItem(o)
        if (mapped) items.push(mapped)
      })
  }
  if (!bizTypeFilter || bizTypeFilter === APPROVAL_BIZ.PURCHASE_ORDER) {
    loadOrders(STORAGE_KEYS.PURCHASE)
      .filter(isPurchaseOrderPending)
      .forEach((o) => {
        const mapped = toPurchaseApprovalItem(o)
        if (mapped) items.push(mapped)
      })
  }
  if (!bizTypeFilter || bizTypeFilter === APPROVAL_BIZ.OUTSOURCING_ORDER) {
    loadOrders(STORAGE_KEYS.OUTSOURCING)
      .filter(isOutsourcingOrderPending)
      .forEach((o) => {
        const mapped = toOutsourcingApprovalItem(o)
        if (mapped) items.push(mapped)
      })
  }
  return items.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
}

function userHandledRecord(records = [], approverName) {
  return records.find(
    (r) =>
      r.name === approverName &&
      (r.result === '已通过' || r.result === '已驳回' || r.result === '审核通过'),
  )
}

export function listPendingApprovals(bizTypeFilter = '') {
  return collectPendingItems(bizTypeFilter)
}

export function listDoneApprovals(user, bizTypeFilter = '') {
  ensureApprovalStorageSeed()
  const approverName = resolveApproverName(user)
  const items = []
  const pushDone = (orders, bizType, toItem, isPending) => {
    orders.forEach((order) => {
      if (isPending(order)) return
      const hit = userHandledRecord(order.approvalRecords, approverName)
      if (!hit) return
      if (bizTypeFilter && bizTypeFilter !== bizType) return
      const mapped = toItem(order)
      if (mapped) {
        items.push({ ...mapped, status: hit.result, lastOpinion: hit.opinion, handledAt: hit.time })
      }
    })
  }
  pushDone(loadOrders(STORAGE_KEYS.SALES), APPROVAL_BIZ.SALES_ORDER, toSalesApprovalItem, isSalesOrderPending)
  pushDone(
    loadOrders(STORAGE_KEYS.PURCHASE),
    APPROVAL_BIZ.PURCHASE_ORDER,
    toPurchaseApprovalItem,
    isPurchaseOrderPending,
  )
  pushDone(
    loadOrders(STORAGE_KEYS.OUTSOURCING),
    APPROVAL_BIZ.OUTSOURCING_ORDER,
    toOutsourcingApprovalItem,
    isOutsourcingOrderPending,
  )
  return items.sort((a, b) => String(b.handledAt || b.submittedAt).localeCompare(String(a.handledAt || a.submittedAt)))
}

export function getPendingApprovalCount(user) {
  void user
  return listPendingApprovals().length
}

export function getApprovalDetail(bizType, bizId) {
  const order = findOrder(bizType, bizId)
  if (!order) return null
  if (bizType === APPROVAL_BIZ.SALES_ORDER) return toSalesDetailView(order)
  if (bizType === APPROVAL_BIZ.PURCHASE_ORDER) return toPurchaseDetailView(order)
  if (bizType === APPROVAL_BIZ.OUTSOURCING_ORDER) return toOutsourcingDetailView(order)
  return null
}

function assertPending(bizType, order) {
  if (bizType === APPROVAL_BIZ.SALES_ORDER && !isSalesOrderPending(order)) {
    return { ok: false, message: '销售订单当前不可审核' }
  }
  if (bizType === APPROVAL_BIZ.PURCHASE_ORDER && !isPurchaseOrderPending(order)) {
    return { ok: false, message: '采购订单当前不可审核' }
  }
  if (bizType === APPROVAL_BIZ.OUTSOURCING_ORDER && !isOutsourcingOrderPending(order)) {
    return { ok: false, message: '外协订单当前不可审核' }
  }
  return { ok: true }
}

/** 销售订单：移动端简化审核（状态+记录；级联下游单据仍建议在 PC 完成） */
function approveSalesOrderSimple(order, opinion, approverName) {
  order.progressStatus = '进行中'
  order.approver = approverName
  order.approvedAt = nowText()
  order.updatedAt = nowText()
  pushApprovalRecord(order, { role: '销售审核', result: '已通过', opinion }, approverName)
}

function approvePurchaseOrderSimple(order, opinion, approverName) {
  order.status = '进行中'
  order.approvalResult = '审核通过'
  order.approverName = approverName
  order.approvedAt = nowText()
  order.updatedAt = nowText()
  pushApprovalRecord(order, { role: '采购审核', result: '已通过', opinion }, approverName)
}

function approveOutsourcingOrderSimple(order, opinion, approverName) {
  order.status = '进行中'
  order.approvalResult = '审核通过'
  order.approverName = approverName
  order.updatedAt = nowText()
  pushApprovalRecord(order, { role: '外协审核', result: '已通过', opinion }, approverName)
}

function rejectOrderSimple(order, bizType, opinion, approverName) {
  const roleMap = {
    [APPROVAL_BIZ.SALES_ORDER]: '销售审核',
    [APPROVAL_BIZ.PURCHASE_ORDER]: '采购审核',
    [APPROVAL_BIZ.OUTSOURCING_ORDER]: '外协审核',
  }
  if (bizType === APPROVAL_BIZ.SALES_ORDER) {
    order.progressStatus = '已拒绝'
    order.approver = approverName
    order.approvedAt = nowText()
    order.updatedAt = nowText()
  } else {
    order.status = '已拒绝'
    order.approvalResult = '已拒绝'
    order.approverName = approverName
    order.updatedAt = nowText()
  }
  pushApprovalRecord(order, { role: roleMap[bizType], result: '已驳回', opinion }, approverName)
}

export function approveDocument(bizType, bizId, opinion = '', user = null) {
  const order = findOrder(bizType, bizId)
  if (!order) return { ok: false, message: '单据不存在' }
  const guard = assertPending(bizType, order)
  if (!guard.ok) return guard

  const approverName = resolveApproverName(user)
  const result = updateOrder(bizType, bizId, (target) => {
    if (bizType === APPROVAL_BIZ.SALES_ORDER) approveSalesOrderSimple(target, opinion, approverName)
    else if (bizType === APPROVAL_BIZ.PURCHASE_ORDER) approvePurchaseOrderSimple(target, opinion, approverName)
    else approveOutsourcingOrderSimple(target, opinion, approverName)
  })
  if (!result.ok) return result
  return { ok: true, message: '审核通过' }
}

export function rejectDocument(bizType, bizId, opinion = '', user = null) {
  const trimmed = String(opinion || '').trim()
  if (!trimmed) return { ok: false, message: '驳回须填写审批意见' }

  const order = findOrder(bizType, bizId)
  if (!order) return { ok: false, message: '单据不存在' }
  const guard = assertPending(bizType, order)
  if (!guard.ok) return guard

  const approverName = resolveApproverName(user)
  const result = updateOrder(bizType, bizId, (target) => {
    rejectOrderSimple(target, bizType, trimmed, approverName)
  })
  if (!result.ok) return result
  return { ok: true, message: '已驳回' }
}

export function canApproveDetail(detail) {
  return String(detail?.status || '') === PENDING_STATUS
}
