/**
 * 审批管理：按单据类型分流（对齐质检任务）
 * - 销售订单审批 / 采购订单审批 / 外协订单审批
 * - H5 同域优先读 WEB localStorage；无数据时写入小程序演示种子
 */

const SALES_KEY = 'i_doms_sales_orders'
const PURCHASE_KEY = 'i_doms_purchase_orders'
const OUTSOURCING_KEY = 'i_doms_outsourcing_orders'
const MOBILE_SEED_FLAG = 'i_doms_mobile_approval_demo_seed_v2'

/** @typedef {'sales' | 'purchase' | 'outsourcing'} ApprovalScope */

export const APPROVAL_SCOPE_META = [
  {
    scope: 'sales',
    title: '销售订单审批',
    desc: '待审核销售订单',
    group: '销售履约',
    icon: '🛒',
    tone: 'blue',
    storageKey: SALES_KEY,
    statusField: 'progressStatus',
    pendingStatus: '待审核',
  },
  {
    scope: 'purchase',
    title: '采购订单审批',
    desc: '待审核采购订单',
    group: '采购供应链',
    icon: '📦',
    tone: 'orange',
    storageKey: PURCHASE_KEY,
    statusField: 'status',
    pendingStatus: '待审核',
  },
  {
    scope: 'outsourcing',
    title: '外协订单审批',
    desc: '待审核外协订单',
    group: '采购供应链',
    icon: '🔧',
    tone: 'purple',
    storageKey: OUTSOURCING_KEY,
    statusField: 'status',
    pendingStatus: '待审核',
  },
]

export function getApprovalScopeMeta(scope) {
  return APPROVAL_SCOPE_META.find((m) => m.scope === scope) || APPROVAL_SCOPE_META[0]
}

function readStore(storageKey) {
  try {
    let raw = null
    try {
      raw = uni.getStorageSync(storageKey)
    } catch {
      /* ignore */
    }
    if (!raw && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(storageKey)
    }
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

function writeStore(storageKey, data) {
  const text = JSON.stringify(data)
  try {
    uni.setStorageSync(storageKey, text)
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, text)
    }
  } catch {
    /* ignore */
  }
}

function nowText() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function todayText() {
  return nowText().slice(0, 10)
}

function loadOrders(storageKey) {
  const parsed = readStore(storageKey)
  return Array.isArray(parsed?.orders) ? parsed.orders : []
}

function saveOrders(storageKey, orders, extra = {}) {
  const prev = readStore(storageKey) || {}
  writeStore(storageKey, { ...prev, ...extra, orders })
}

function patchMobileSalesDemoLines(orders) {
  let changed = false
  for (const order of orders) {
    if (!String(order?.id || '').startsWith('so-m-appr')) continue
    const qty = sumSalesQty(order)
    const amount = sumSalesAmount(order)
    if (qty > 0 && amount > 0 && Array.isArray(order.lineItems) && order.lineItems.length) continue
    if (!Array.isArray(order.lineItems) || !order.lineItems.length) {
      const fallbackQty = Number(order.totalQty) || 1
      const fallbackAmount = Number(order.amountInTax ?? order.totalAmountInTax) || 0
      order.lineItems = [
        {
          id: `${order.id}-l1`,
          productName: order.customerName ? `${order.customerName}关联产品` : '演示产品',
          productCode: 'P-DEMO',
          salesQty: fallbackQty,
          unit: '台',
          totalPriceInTax: fallbackAmount || 10000,
        },
      ]
      changed = true
    }
    if (!Number(order.totalQty)) {
      order.totalQty = sumSalesQty(order)
      changed = true
    }
    if (!Number(order.amountInTax) && !Number(order.totalAmountInTax)) {
      order.amountInTax = sumSalesAmount(order)
      changed = true
    }
  }
  return changed
}

/** 无 WEB 数据时补演示待审单，便于纯小程序联调 */
export function ensureApprovalDemoSeed() {
  const now = nowText()
  const day = todayText()
  let touched = false

  const sales = loadOrders(SALES_KEY)
  if (sales.length && patchMobileSalesDemoLines(sales)) {
    saveOrders(SALES_KEY, sales, { version: 1 })
    touched = true
  }
  if (!sales.length) {
    saveOrders(
      SALES_KEY,
      [
        {
          id: 'so-m-appr-1',
          orderNo: 'SO20261010001',
          customerName: '山东化工泵业集团',
          salesperson: '王芳',
          progressStatus: '待审核',
          businessType: '自产销售',
          documentDate: day,
          createdAt: now,
          creator: '王芳',
          totalQty: 6,
          amountInTax: 128000,
          remark: '小程序审批演示：销售待审',
          lineItems: [
            {
              id: 'so-m-appr-1-l1',
              productName: 'ISG50-160 管道泵',
              productCode: 'P-ISG50',
              salesQty: 4,
              unit: '台',
              totalPriceInTax: 80000,
            },
            {
              id: 'so-m-appr-1-l2',
              productName: '机械密封组件',
              productCode: 'M-SEAL-01',
              salesQty: 2,
              unit: '套',
              totalPriceInTax: 48000,
            },
          ],
        },
        {
          id: 'so-m-appr-2',
          orderNo: 'SO20261010002',
          customerName: '淄博水务有限公司',
          salesperson: '李强',
          progressStatus: '待审核',
          businessType: '贸易销售',
          documentDate: day,
          createdAt: now,
          creator: '李强',
          totalQty: 2,
          amountInTax: 56000,
          lineItems: [
            {
              id: 'so-m-appr-2-l1',
              productName: '潜水泵 QJ200',
              productCode: 'P-QJ200',
              salesQty: 2,
              unit: '台',
              totalPriceInTax: 56000,
            },
          ],
        },
      ],
      { version: 1 },
    )
    touched = true
  } else if (!sales.some((o) => (o.progressStatus || o.status) === '待审核')) {
    sales.unshift({
      id: 'so-m-appr-pending',
      orderNo: 'SO20261010PEND',
      customerName: '演示客户（待审）',
      salesperson: '王芳',
      progressStatus: '待审核',
      documentDate: day,
      createdAt: now,
      creator: '王芳',
      totalQty: 3,
      amountInTax: 88000,
      lineItems: [
        {
          id: 'so-m-appr-p-l1',
          productName: '演示泵',
          productCode: 'P-DEMO',
          salesQty: 3,
          unit: '台',
          totalPriceInTax: 88000,
        },
      ],
    })
    saveOrders(SALES_KEY, sales, { version: 1 })
    touched = true
  }

  const purchase = loadOrders(PURCHASE_KEY)
  if (!purchase.length) {
    saveOrders(PURCHASE_KEY, [
      {
        id: 'po-m-appr-1',
        orderNo: 'PO20261010001',
        supplier: '济南密封件厂',
        purchaser: '赵采购',
        status: '待审核',
        approvalResult: '待审核',
        documentDate: day,
        createdAt: now,
        creator: '赵采购',
        totalAmountInTax: 23600,
        remark: '小程序审批演示：采购待审',
      },
      {
        id: 'po-m-appr-2',
        orderNo: 'PO20261010002',
        supplier: '青岛铸件供应',
        purchaser: '赵采购',
        status: '待审核',
        approvalResult: '待审核',
        documentDate: day,
        createdAt: now,
        creator: '赵采购',
        totalAmountInTax: 41200,
      },
    ])
    touched = true
  } else if (!purchase.some((o) => o.status === '待审核')) {
    purchase.unshift({
      id: 'po-m-appr-pending',
      orderNo: 'PO20261010PEND',
      supplier: '演示供应商（待审）',
      purchaser: '赵采购',
      status: '待审核',
      approvalResult: '待审核',
      documentDate: day,
      createdAt: now,
      creator: '赵采购',
      totalAmountInTax: 15000,
    })
    saveOrders(PURCHASE_KEY, purchase)
    touched = true
  }

  const outsourcing = loadOrders(OUTSOURCING_KEY)
  if (!outsourcing.length) {
    saveOrders(OUTSOURCING_KEY, [
      {
        id: 'os-m-appr-1',
        orderNo: 'OS20261010001',
        supplier: '淄博机加外协厂',
        purchaser: '钱外协',
        status: '待审核',
        approvalResult: '待审核',
        documentDate: day,
        createdAt: now,
        creator: '钱外协',
        totalAmountInTax: 18900,
        remark: '小程序审批演示：外协待审',
      },
    ])
    touched = true
  } else if (!outsourcing.some((o) => o.status === '待审核')) {
    outsourcing.unshift({
      id: 'os-m-appr-pending',
      orderNo: 'OS20261010PEND',
      supplier: '演示外协厂（待审）',
      purchaser: '钱外协',
      status: '待审核',
      approvalResult: '待审核',
      documentDate: day,
      createdAt: now,
      creator: '钱外协',
      totalAmountInTax: 9900,
    })
    saveOrders(OUTSOURCING_KEY, outsourcing)
    touched = true
  }

  if (touched) {
    try {
      uni.setStorageSync(MOBILE_SEED_FLAG, '1')
    } catch {
      /* ignore */
    }
  }
}

function orderStatus(order, meta) {
  return String(order?.[meta.statusField] || order?.status || order?.progressStatus || '').trim()
}

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `¥${n.toFixed(2)}`
}

function formatQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
}

function sumSalesQty(order) {
  if (Number.isFinite(Number(order?.totalQty)) && Number(order.totalQty) > 0) {
    return Number(order.totalQty)
  }
  const lines = Array.isArray(order?.lineItems) ? order.lineItems : []
  return lines.reduce((s, line) => s + (Number(line.salesQty ?? line.qty) || 0), 0)
}

function sumSalesAmount(order) {
  const direct = Number(order?.amountInTax ?? order?.totalAmountInTax ?? order?.orderAmount)
  if (Number.isFinite(direct) && direct > 0) return direct
  const lines = Array.isArray(order?.lineItems) ? order.lineItems : []
  return lines.reduce((s, line) => s + (Number(line.totalPriceInTax) || 0), 0)
}

function formatCreateInfo(creator, createdAt) {
  const name = String(creator || '').trim() || '—'
  const time = String(createdAt || '').trim()
  const shortTime = time.length >= 16 ? time.slice(0, 16) : time || '—'
  return `${name}/${shortTime}`
}

function normalizeApprovalItem(order, meta) {
  const status = orderStatus(order, meta) || '—'
  const creator = order.creator || order.applicant || ''
  const createdAt = order.createdAt || ''
  const base = {
    id: order.id || `${meta.scope}-${order.orderNo}`,
    scope: meta.scope,
    scopeTitle: meta.title,
    orderNo: order.orderNo || '—',
    status,
    documentDate: order.documentDate || '',
    createdAt,
    creator,
    createInfo: formatCreateInfo(creator, createdAt),
    remark: order.remark || '',
    canApprove: status === meta.pendingStatus,
    lineItems: Array.isArray(order.lineItems) ? order.lineItems : [],
  }

  if (meta.scope === 'sales') {
    const salesQty = sumSalesQty(order)
    const salesAmount = sumSalesAmount(order)
    return {
      ...base,
      partyLabel: '客户',
      partyName: order.customerName || '—',
      ownerLabel: '业务员',
      ownerName: order.salesperson || order.creator || '—',
      bizType: order.businessType || '',
      salesQty,
      salesAmount,
      salesInfo: `${formatQty(salesQty)}/${formatMoney(salesAmount)}`,
      amountText: formatMoney(salesAmount),
    }
  }

  const amount = Number(
    order.totalAmountInTax ?? order.amountInTax ?? order.totalAmount ?? order.amount,
  )
  return {
    ...base,
    partyLabel: '供应商',
    partyName: order.supplier || order.supplierName || '—',
    ownerLabel: meta.scope === 'outsourcing' ? '外协员' : '采购员',
    ownerName: order.purchaser || order.creator || '—',
    bizType: order.orderType || order.businessType || '',
    amountText: formatMoney(amount),
  }
}

function currentApproverName() {
  try {
    const raw = uni.getStorageSync('i_doms_mobile_user')
    const user = raw ? JSON.parse(raw) : null
    return user?.displayName || user?.username || '管理员'
  } catch {
    return '管理员'
  }
}

/**
 * 读取原始订单（含明细）
 * @param {ApprovalScope} scope
 * @param {string} id
 */
export function getApprovalOrderRaw(scope, id) {
  ensureApprovalDemoSeed()
  const meta = getApprovalScopeMeta(scope)
  const orders = loadOrders(meta.storageKey)
  return orders.find((o) => String(o.id) === String(id)) || null
}

/** 列表/详情统一展示模型 */
export function getApprovalOrderDetail(scope, id) {
  const raw = getApprovalOrderRaw(scope, id)
  if (!raw) return null
  const meta = getApprovalScopeMeta(scope)
  return { ...normalizeApprovalItem(raw, meta), raw }
}

/**
 * 小程序侧审核：写回同源 storage 状态（销售审核不跑 WEB 下游自动生成）
 * @param {ApprovalScope} scope
 * @param {string} id
 * @param {'pass' | 'reject'} action
 * @param {string} [opinion]
 */
export function decideApproval(scope, id, action, opinion = '') {
  ensureApprovalDemoSeed()
  const meta = getApprovalScopeMeta(scope)
  const orders = loadOrders(meta.storageKey)
  const idx = orders.findIndex((o) => String(o.id) === String(id))
  if (idx < 0) return { ok: false, message: '单据不存在' }
  const order = orders[idx]
  const status = orderStatus(order, meta)
  if (status !== meta.pendingStatus) {
    return { ok: false, message: `仅「${meta.pendingStatus}」状态可审核` }
  }

  const now = nowText()
  const approver = currentApproverName()
  const pass = action === 'pass'

  if (meta.scope === 'sales') {
    order.progressStatus = pass ? '进行中' : '已拒绝'
    order.approver = approver
    order.approvedAt = now
  } else {
    order.status = pass ? '进行中' : '已拒绝'
    order.approvalResult = pass ? '审核通过' : '已拒绝'
    order.approverName = approver
    order.approvedAt = now
  }

  const records = Array.isArray(order.approvalRecords) ? order.approvalRecords : []
  records.push({
    id: `apr-${Date.now()}`,
    result: pass ? '已通过' : '已驳回',
    opinion: String(opinion || '').trim(),
    operator: approver,
    time: now,
  })
  order.approvalRecords = records
  order.updater = approver
  order.updatedAt = now

  orders[idx] = order
  const extra = meta.scope === 'sales' ? { version: 1 } : {}
  saveOrders(meta.storageKey, orders, extra)

  return {
    ok: true,
    message: pass
      ? `${meta.title.replace('审批', '')}「${order.orderNo}」审核通过`
      : `${meta.title.replace('审批', '')}「${order.orderNo}」已拒绝`,
  }
}

/**
 * @param {{ scope?: ApprovalScope, status?: string, keyword?: string }} [opts]
 */
export function getApprovalList(opts = {}) {
  ensureApprovalDemoSeed()
  const keyword = String(opts.keyword || '')
    .trim()
    .toLowerCase()
  const scopes = opts.scope
    ? APPROVAL_SCOPE_META.filter((m) => m.scope === opts.scope)
    : APPROVAL_SCOPE_META

  const rows = []
  for (const meta of scopes) {
    const orders = loadOrders(meta.storageKey)
    for (const order of orders) {
      const item = normalizeApprovalItem(order, meta)
      if (opts.status && item.status !== opts.status) continue
      if (keyword) {
        const hay = `${item.orderNo} ${item.partyName} ${item.ownerName} ${item.creator} ${item.remark}`.toLowerCase()
        if (!hay.includes(keyword)) continue
      }
      rows.push(item)
    }
  }

  rows.sort((a, b) => String(b.createdAt || b.documentDate).localeCompare(String(a.createdAt || a.documentDate)))
  return rows
}

/** 各类型待审核数量 */
export function getApprovalScopePendingCounts() {
  ensureApprovalDemoSeed()
  const map = {}
  for (const meta of APPROVAL_SCOPE_META) {
    const orders = loadOrders(meta.storageKey)
    map[meta.scope] = orders.filter((o) => orderStatus(o, meta) === meta.pendingStatus).length
  }
  return map
}

/** 待审批总数（工作台角标 / 我的待办） */
export function getPendingApprovalCount(_user) {
  const counts = getApprovalScopePendingCounts()
  return APPROVAL_SCOPE_META.reduce((sum, m) => sum + (counts[m.scope] || 0), 0)
}
