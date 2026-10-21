/**
 * 盘点 Storage 桥：与 PC 同源 key i_doms_stocktake_orders
 * 小程序：建单 / 录实盘 / 提交待审核；审核与过账在 PC
 */

const STORAGE_KEY = 'i_doms_stocktake_orders'
const BATCH_STORAGE_KEY = 'i_doms_stock_batches'
const PRODUCT_STORAGE_KEY = 'i_doms_product_info'
const MATERIAL_STORAGE_KEY = 'i_doms_material_info'
const MOBILE_SEED_FLAG = 'i_doms_mobile_stocktake_demo_seed_v2'

export const STOCKTAKE_STATUS = {
  DRAFT: '待提交',
  PENDING_APPROVAL: '待审核',
  APPROVED: '审核通过',
  REFUSED: '已拒绝',
}

export const STOCKTAKE_TYPE = {
  OPENING: '期初盘点',
  CLOSING: '期末盘点',
  COST: '成本调整',
  OTHER: '其他调整',
}

export const stocktakeTypeOptions = [
  STOCKTAKE_TYPE.OPENING,
  STOCKTAKE_TYPE.CLOSING,
  STOCKTAKE_TYPE.COST,
  STOCKTAKE_TYPE.OTHER,
]

export const warehouseOptions = [
  { label: '原材料仓', value: '原材料仓' },
  { label: '成品仓', value: '成品仓' },
  { label: '半成品仓', value: '半成品仓' },
  { label: '库线边仓', value: '库线边仓' },
]

function nowText() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function todayText() {
  return nowText().slice(0, 10)
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

function loadOrders() {
  ensureMobileStocktakeDemoSeed()
  const parsed = readStore(STORAGE_KEY)
  const orders = Array.isArray(parsed?.orders) ? parsed.orders : []
  return orders
}

function saveOrders(orders) {
  writeStore(STORAGE_KEY, { orders })
}

function loadBatches() {
  ensureMobileStocktakeDemoSeed()
  const parsed = readStore(BATCH_STORAGE_KEY)
  return Array.isArray(parsed?.batches) ? parsed.batches : []
}

function saveBatches(batches) {
  writeStore(BATCH_STORAGE_KEY, { batches })
}

function removeStore(storageKey) {
  try {
    uni.removeStorageSync(storageKey)
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey)
  } catch {
    /* ignore */
  }
}

/** 清除本机盘点单与演示批次，再写入仓库种子 */
export function resetStocktakeDemoData() {
  removeStore(STORAGE_KEY)
  removeStore(BATCH_STORAGE_KEY)
  removeStore(MOBILE_SEED_FLAG)
  ensureMobileStocktakeDemoSeed()
}

/** 小程序无 PC 库存时写入演示批次 + 盘点单，便于验证「加载本仓」 */
export function ensureMobileStocktakeDemoSeed() {
  let seedFlag = ''
  try {
    seedFlag = uni.getStorageSync(MOBILE_SEED_FLAG) || ''
  } catch {
    /* ignore */
  }
  if (!seedFlag && typeof localStorage !== 'undefined') {
    seedFlag = localStorage.getItem(MOBILE_SEED_FLAG) || ''
  }

  const batchParsed = readStore(BATCH_STORAGE_KEY)
  let batches = Array.isArray(batchParsed?.batches) ? batchParsed.batches.slice() : []
  const needFinished =
    !batches.some((b) => b.warehouse === '成品仓' && (Number(b.qty) || 0) > 0) ||
    !batches.some((b) => b.warehouse === '原材料仓' && (Number(b.qty) || 0) > 0)

  if (needFinished) {
    const demoBatches = [
      {
        id: 'bat-m-st-fg-pump',
        warehouse: '成品仓',
        itemCode: 'CP-ISG50-160',
        itemName: '清水离心泵 ISG50-160',
        itemType: '产品',
        unit: '台',
        qty: 12,
        batchNo: 'FG-BATCH-001',
        attrs: { specModel: 'ISG50-160', material: '铸铁' },
      },
      {
        id: 'bat-m-st-fg-valve',
        warehouse: '成品仓',
        itemCode: 'CP-VALVE-DN50',
        itemName: '闸阀 DN50',
        itemType: '产品',
        unit: '件',
        qty: 36,
        batchNo: 'FG-BATCH-002',
        attrs: { specModel: 'DN50', material: '铸铁' },
      },
      {
        id: 'bat-m-st-fg-so',
        warehouse: '成品仓',
        itemCode: 'CP-ISG50-160',
        itemName: '清水离心泵 ISG50-160',
        itemType: '产品',
        unit: '台',
        qty: 3,
        batchNo: 'FG-BATCH-SO-01',
        salesOrderNo: 'SO20260918001',
        salesOrderId: 'so-demo-st-1',
        attrs: { specModel: 'ISG50-160', material: '铸铁' },
      },
      {
        id: 'bat-m-st-raw-bearing',
        warehouse: '原材料仓',
        itemCode: 'MAT-BEARING-6205',
        itemName: '深沟球轴承 6205-2RS',
        itemType: '物料',
        unit: '件',
        qty: 80,
        batchNo: 'RAW-BATCH-001',
        attrs: { specModel: '6205-2RS', material: 'GCr15' },
      },
      {
        id: 'bat-m-st-raw-pipe',
        warehouse: '原材料仓',
        itemCode: 'MAT-PIPE-50',
        itemName: '无缝钢管 φ50×3',
        itemType: '物料',
        unit: '米',
        qty: 120,
        batchNo: 'RAW-BATCH-002',
        attrs: { specModel: 'φ50×3', material: 'Q235' },
      },
      {
        id: 'bat-m-st-semi-blank',
        warehouse: '半成品仓',
        itemCode: 'SEMI-IMPELLER-01',
        itemName: '叶轮毛坯',
        itemType: '半成品',
        unit: '件',
        qty: 25,
        batchNo: 'SEMI-BATCH-001',
        attrs: { specModel: '叶轮-01', material: 'HT200' },
      },
      {
        id: 'bat-m-st-line-bolt',
        warehouse: '库线边仓',
        itemCode: 'MAT-BOLT-M8',
        itemName: '六角螺栓 M8',
        itemType: '物料',
        unit: '件',
        qty: 500,
        batchNo: 'LINE-BATCH-001',
        attrs: { specModel: 'M8×30', material: '45#' },
      },
    ]
    const existIds = new Set(batches.map((b) => b.id))
    demoBatches.forEach((b) => {
      if (!existIds.has(b.id)) batches.push(b)
    })
    saveBatches(batches)
  }

  const orderParsed = readStore(STORAGE_KEY)
  let orders = Array.isArray(orderParsed?.orders) ? orderParsed.orders.slice() : []
  const hasMobileSeed = orders.some((o) => String(o.id || '').startsWith('st-m-seed-'))
  if (!hasMobileSeed) {
    const today = todayText()
    const demoOrders = [
      {
        id: 'st-m-seed-draft',
        docNo: 'PD-MOBILE-001',
        status: STOCKTAKE_STATUS.DRAFT,
        sourceChannel: 'miniprogram',
        warehouse: '成品仓',
        stocktakeType: STOCKTAKE_TYPE.OTHER,
        stocktakeDate: today,
        applicant: '仓管员甲',
        creator: '仓管员甲',
        createdAt: `${today} 09:10:00`,
        remark: '演示：待提交草稿，可编辑实盘后提交',
        postingStatus: '',
        lineItems: [
          createLine({
            id: 'st-m-seed-draft-l1',
            itemCode: 'CP-ISG50-160',
            itemName: '清水离心泵 ISG50-160',
            itemType: '产品',
            specModel: 'ISG50-160',
            unit: '台',
            bookQty: 12,
            actualQty: 11,
            batchNo: 'FG-BATCH-001',
          }),
          createLine({
            id: 'st-m-seed-draft-l2',
            itemCode: 'CP-VALVE-DN50',
            itemName: '闸阀 DN50',
            itemType: '产品',
            specModel: 'DN50',
            unit: '件',
            bookQty: 36,
            actualQty: 36,
            batchNo: 'FG-BATCH-002',
          }),
        ],
        operationLogs: [],
        linkedOutboundIds: [],
        linkedInboundIds: [],
        linkedOutboundDocNos: [],
        linkedInboundDocNos: [],
      },
      {
        id: 'st-m-seed-pending',
        docNo: 'PD-MOBILE-002',
        status: STOCKTAKE_STATUS.PENDING_APPROVAL,
        sourceChannel: 'miniprogram',
        warehouse: '原材料仓',
        stocktakeType: STOCKTAKE_TYPE.CLOSING,
        stocktakeDate: today,
        applicant: '仓管员乙',
        creator: '仓管员乙',
        createdAt: `${today} 10:30:00`,
        submittedBy: '仓管员乙',
        submittedAt: `${today} 11:00:00`,
        remark: '演示：已提交待 PC 审核',
        postingStatus: '',
        lineItems: [
          createLine({
            id: 'st-m-seed-pending-l1',
            itemCode: 'MAT-BEARING-6205',
            itemName: '深沟球轴承 6205-2RS',
            itemType: '物料',
            unit: '件',
            bookQty: 80,
            actualQty: 78,
            lineStatus: STOCKTAKE_STATUS.PENDING_APPROVAL,
          }),
        ],
        operationLogs: [],
        linkedOutboundIds: [],
        linkedInboundIds: [],
        linkedOutboundDocNos: [],
        linkedInboundDocNos: [],
      },
      {
        id: 'st-m-seed-pc-draft',
        docNo: 'PD-PC-DEMO-003',
        status: STOCKTAKE_STATUS.DRAFT,
        sourceChannel: 'manual',
        warehouse: '半成品仓',
        stocktakeType: STOCKTAKE_TYPE.OPENING,
        stocktakeDate: today,
        applicant: 'admin1',
        creator: '管理员',
        createdAt: `${today} 08:00:00`,
        remark: '演示：PC 创建的草稿单，小程序也可编辑',
        postingStatus: '',
        lineItems: [
          createLine({
            id: 'st-m-seed-pc-l1',
            itemCode: 'SEMI-IMPELLER-01',
            itemName: '叶轮毛坯',
            itemType: '半成品',
            unit: '件',
            bookQty: 25,
            actualQty: 25,
          }),
        ],
        operationLogs: [],
        linkedOutboundIds: [],
        linkedInboundIds: [],
        linkedOutboundDocNos: [],
        linkedInboundDocNos: [],
      },
    ]
    orders = [...demoOrders, ...orders]
    saveOrders(orders)
  }

  try {
    uni.setStorageSync(MOBILE_SEED_FLAG, '2')
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MOBILE_SEED_FLAG, '2')
  } catch {
    /* ignore */
  }
}

function generateStocktakeNo() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  return `PD${stamp}${String(Math.floor(Math.random() * 90) + 10)}`
}

function createLine(partial = {}) {
  const bookQty = Number(partial.bookQty) || 0
  const actualQty =
    partial.actualQty != null && partial.actualQty !== '' ? Number(partial.actualQty) : bookQty
  const diffQty = Math.round((actualQty - bookQty) * 10000) / 10000
  return {
    id: partial.id || `st-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: partial.itemCode || '',
    itemName: partial.itemName || '',
    itemType: partial.itemType || '物料',
    specModel: partial.specModel || '',
    material: partial.material || '',
    variantSummary: partial.variantSummary || '',
    unit: partial.unit || '件',
    batchId: partial.batchId || '',
    batchNo: partial.batchNo || '',
    salesOrderId: partial.salesOrderId || '',
    salesOrderNo: partial.salesOrderNo || '',
    salesLineId: partial.salesLineId || '',
    locationNo: partial.locationNo || '',
    dedicated: Boolean(partial.dedicated || partial.salesOrderNo),
    bookQty,
    actualQty,
    diffQty,
    lineStatus: partial.lineStatus || STOCKTAKE_STATUS.DRAFT,
    ...partial,
    bookQty,
    actualQty,
    diffQty,
  }
}

function appendLog(order, { action, operator, remark }) {
  if (!order.operationLogs) order.operationLogs = []
  order.operationLogs.unshift({
    id: `st-log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    action,
    operator: operator || order.creator || 'mobile',
    operatedAt: nowText(),
    remark: remark || '',
  })
}

function findMasterByCode(itemCode) {
  const code = String(itemCode || '').trim()
  if (!code) return null
  const products = readStore(PRODUCT_STORAGE_KEY)
  const productList = Array.isArray(products?.products)
    ? products.products
    : Array.isArray(products)
      ? products
      : []
  const p = productList.find((x) => x.code === code)
  if (p) return { ...p, itemType: '产品' }
  const materials = readStore(MATERIAL_STORAGE_KEY)
  const materialList = Array.isArray(materials?.materials)
    ? materials.materials
    : Array.isArray(materials)
      ? materials
      : []
  const m = materialList.find((x) => x.code === code)
  if (m) return { ...m, itemType: '物料' }
  return null
}

function formatVariantSummary(values) {
  if (!values) return ''
  if (typeof values === 'string') return values.trim()
  if (typeof values !== 'object') return ''
  return Object.entries(values)
    .map(([k, v]) => {
      const val = String(v ?? '').trim()
      if (!val) return ''
      return `${k}:${val}`
    })
    .filter(Boolean)
    .join(' ')
}

export function listStocktakeOrders(filters = {}) {
  let list = loadOrders().slice()
  const status = String(filters.status || '').trim()
  const warehouse = String(filters.warehouse || '').trim()
  const keyword = String(filters.keyword || '').trim().toLowerCase()
  if (status) list = list.filter((o) => o.status === status)
  if (warehouse) list = list.filter((o) => o.warehouse === warehouse)
  if (keyword) {
    list = list.filter(
      (o) =>
        String(o.docNo || '')
          .toLowerCase()
          .includes(keyword) ||
        String(o.warehouse || '')
          .toLowerCase()
          .includes(keyword),
    )
  }
  return list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function getStocktakeOrderById(id) {
  return loadOrders().find((o) => o.id === id) || null
}

export function canEditStocktake(order) {
  return order?.status === STOCKTAKE_STATUS.DRAFT
}

export function canSubmitStocktake(order) {
  return order?.status === STOCKTAKE_STATUS.DRAFT && (order.lineItems || []).length > 0
}

/** 加载本仓库存：自由 + 按单分行 */
export function loadWarehouseStockLines(warehouse) {
  const wh = String(warehouse || '').trim()
  if (!wh) return []
  const batches = loadBatches().filter((b) => {
    if (String(b.warehouse || '') !== wh) return false
    const qty = Number(b.qty ?? b.remainingQty ?? b.inStockQty) || 0
    return qty > 0
  })
  return batches.map((b) => {
    const master = findMasterByCode(b.itemCode) || {}
    const attrs = b.attrs || {}
    const bookQty = Number(b.qty ?? b.remainingQty ?? b.inStockQty) || 0
    return createLine({
      itemCode: b.itemCode || '',
      itemName: b.itemName || master.name || b.itemCode,
      itemType: b.itemType || master.itemType || '物料',
      specModel: attrs.specModel || attrs.spec || master.specModel || master.spec || '',
      material: attrs.material || master.material || '',
      variantSummary:
        attrs.variantSummary ||
        master.variantSummary ||
        formatVariantSummary(attrs.variantValues || master.variantValues) ||
        '',
      unit: b.unit || master.inventoryUnit || '件',
      batchId: b.id || '',
      batchNo: b.batchNo || '',
      salesOrderId: b.salesOrderId || '',
      salesOrderNo: b.salesOrderNo || '',
      salesLineId: b.salesLineId || '',
      dedicated: Boolean(b.salesOrderNo || b.salesOrderId),
      bookQty,
      actualQty: bookQty,
    })
  })
}

/** 按编码匹配库存行（扫码加入）；无批次时用主数据建一行账面 0 */
export function resolveScanToLines(warehouse, scannedCode) {
  const code = String(scannedCode || '').trim()
  if (!code) return { ok: false, message: '无效条码' }
  const wh = String(warehouse || '').trim()
  const batches = loadBatches().filter((b) => {
    if (wh && String(b.warehouse || '') !== wh) return false
    return String(b.itemCode || '') === code || String(b.batchNo || '') === code
  })
  if (batches.length) {
    return {
      ok: true,
      lines: batches.map((b) => {
        const master = findMasterByCode(b.itemCode) || {}
        const attrs = b.attrs || {}
        const bookQty = Number(b.qty ?? b.remainingQty ?? b.inStockQty) || 0
        return createLine({
          itemCode: b.itemCode || code,
          itemName: b.itemName || master.name || code,
          itemType: b.itemType || master.itemType || '物料',
          specModel: attrs.specModel || attrs.spec || master.specModel || master.spec || '',
          material: attrs.material || master.material || '',
          variantSummary:
            attrs.variantSummary ||
            master.variantSummary ||
            formatVariantSummary(attrs.variantValues || master.variantValues) ||
            '',
          unit: b.unit || master.inventoryUnit || '件',
          batchId: b.id || '',
          batchNo: b.batchNo || '',
          salesOrderId: b.salesOrderId || '',
          salesOrderNo: b.salesOrderNo || '',
          dedicated: Boolean(b.salesOrderNo || b.salesOrderId),
          bookQty,
          actualQty: bookQty,
        })
      }),
    }
  }
  const master = findMasterByCode(code)
  if (master) {
    return {
      ok: true,
      lines: [
        createLine({
          itemCode: master.code || code,
          itemName: master.name || code,
          itemType: master.itemType || '物料',
          specModel: master.specModel || master.spec || '',
          material: master.material || '',
          variantSummary:
            master.variantSummary || formatVariantSummary(master.variantValues) || '',
          unit: master.inventoryUnit || '件',
          bookQty: 0,
          actualQty: 0,
        }),
      ],
    }
  }
  return { ok: false, message: `未找到编码 ${code}` }
}

export function createStocktakeOrder(payload = {}, { operator = 'mobile' } = {}) {
  const warehouse = String(payload.warehouse || '').trim()
  if (!warehouse) return { ok: false, message: '请选择盘点仓库' }
  const lineItems = (payload.lineItems || []).map((l) => createLine(l))
  if (!lineItems.length) return { ok: false, message: '请至少添加一条明细' }
  const orders = loadOrders()
  const docNo = String(payload.docNo || '').trim() || generateStocktakeNo()
  if (orders.some((o) => o.docNo === docNo)) return { ok: false, message: '盘点单号已存在' }
  const row = {
    id: `st-${Date.now()}`,
    docNo,
    status: STOCKTAKE_STATUS.DRAFT,
    sourceChannel: 'miniprogram',
    warehouse,
    stocktakeType: payload.stocktakeType || STOCKTAKE_TYPE.OTHER,
    stocktakeDate: payload.stocktakeDate || todayText(),
    applicant: operator,
    creator: operator,
    createdAt: nowText(),
    confirmer: '',
    confirmedAt: '',
    approver: '',
    approvedAt: '',
    poster: '',
    postedAt: '',
    postingStatus: '',
    postingError: '',
    remark: payload.remark || '',
    linkedOutboundIds: [],
    linkedInboundIds: [],
    linkedOutboundDocNos: [],
    linkedInboundDocNos: [],
    lineItems,
    operationLogs: [],
  }
  appendLog(row, {
    action: '创建',
    operator,
    remark: `小程序创建盘点单 ${row.docNo}，仓库 ${row.warehouse}`,
  })
  orders.unshift(row)
  saveOrders(orders)
  return { ok: true, order: row }
}

export function updateStocktakeOrder(id, patch = {}, { operator = 'mobile' } = {}) {
  const orders = loadOrders()
  const idx = orders.findIndex((o) => o.id === id)
  if (idx < 0) return { ok: false, message: '盘点单不存在' }
  const order = orders[idx]
  if (!canEditStocktake(order)) return { ok: false, message: '当前状态不可编辑' }
  const warehouse = String((patch.warehouse ?? order.warehouse) || '').trim()
  if (!warehouse) return { ok: false, message: '请选择盘点仓库' }
  if (patch.lineItems) {
    patch.lineItems = patch.lineItems.map((l) => createLine(l))
  }
  Object.assign(order, patch, { warehouse })
  appendLog(order, { action: '编辑', operator, remark: '小程序更新盘点单' })
  orders[idx] = order
  saveOrders(orders)
  return { ok: true, order }
}

export function submitStocktakeOrder(id, { operator = 'mobile' } = {}) {
  const orders = loadOrders()
  const idx = orders.findIndex((o) => o.id === id)
  if (idx < 0) return { ok: false, message: '盘点单不存在' }
  const order = orders[idx]
  if (!canSubmitStocktake(order)) return { ok: false, message: '当前状态不可提交' }
  order.status = STOCKTAKE_STATUS.PENDING_APPROVAL
  order.postingStatus = ''
  order.postingError = ''
  order.submittedBy = operator
  order.submittedAt = nowText()
  ;(order.lineItems || []).forEach((line) => {
    line.lineStatus = STOCKTAKE_STATUS.PENDING_APPROVAL
  })
  appendLog(order, { action: '提交', operator, remark: '小程序提交审核' })
  orders[idx] = order
  saveOrders(orders)
  return { ok: true, order }
}

/** 合并扫码结果到明细：同 batchId/同编码+销售单 则累加实盘 */
export function mergeScanLines(existingLines = [], scannedLines = [], { addQty = 1 } = {}) {
  const lines = existingLines.map((l) => ({ ...l }))
  scannedLines.forEach((incoming) => {
    const hit = lines.find((l) => {
      if (incoming.batchId && l.batchId) return l.batchId === incoming.batchId
      return (
        l.itemCode === incoming.itemCode &&
        String(l.salesOrderNo || '') === String(incoming.salesOrderNo || '')
      )
    })
    if (hit) {
      hit.actualQty = Math.round((Number(hit.actualQty) + Number(addQty || 1)) * 10000) / 10000
      hit.diffQty = Math.round((hit.actualQty - Number(hit.bookQty || 0)) * 10000) / 10000
    } else {
      const row = createLine({
        ...incoming,
        actualQty: Number(incoming.actualQty) > 0 ? incoming.actualQty : addQty,
      })
      if (!(Number(incoming.actualQty) > 0)) {
        row.actualQty = Number(addQty) || 1
        row.diffQty = Math.round((row.actualQty - Number(row.bookQty || 0)) * 10000) / 10000
      }
      lines.push(row)
    }
  })
  return lines
}

export function stocktakeStatusColor(status) {
  if (status === STOCKTAKE_STATUS.APPROVED) return '#1677ff'
  if (status === STOCKTAKE_STATUS.REFUSED) return '#ff4d4f'
  if (status === STOCKTAKE_STATUS.PENDING_APPROVAL) return '#fa8c16'
  return '#8c8c8c'
}
