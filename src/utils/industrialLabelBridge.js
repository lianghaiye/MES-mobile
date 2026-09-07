/**
 * 工业标识 Storage 桥：与 PC 同源 key i_doms_industrial_labels_v1
 * 支持按 SN / 销售单号查询、装牌确认
 */

const STORAGE_KEY = 'i_doms_industrial_labels_v1'
const SALES_STORAGE_KEY = 'i_doms_sales_orders'
const MOBILE_SEED_FLAG = 'i_doms_mobile_industrial_label_seed_v1'

function nowText() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
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

function loadLabelState() {
  const parsed = readStore(STORAGE_KEY)
  if (!parsed || typeof parsed !== 'object') {
    return { requests: [], labels: [], seq: 0 }
  }
  return {
    requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    labels: Array.isArray(parsed.labels) ? parsed.labels : [],
    seq: Number(parsed.seq) || 0,
  }
}

function saveLabelState(state) {
  writeStore(STORAGE_KEY, {
    requests: state.requests || [],
    labels: state.labels || [],
    seq: state.seq || 0,
  })
}

function findSalesOrderMeta(salesOrderNo) {
  const parsed = readStore(SALES_STORAGE_KEY)
  const orders = Array.isArray(parsed?.orders) ? parsed.orders : []
  const hit = orders.find((o) => o.orderNo === salesOrderNo)
  if (!hit) return { customerName: '', orderId: '' }
  return { customerName: hit.customerName || '', orderId: hit.id || '' }
}

/** 无 PC 数据时写入少量演示 SN，便于纯小程序联调 */
export function ensureMobileIndustrialLabelSeed() {
  const state = loadLabelState()
  const hasIl02 = state.labels.some((l) => l.salesOrderNo === '1-20260903-IL02')
  const hasIl03 = state.labels.some((l) => l.salesOrderNo === '1-20260901-IL03')
  if (hasIl02 && hasIl03) return

  const now = nowText()
  const toAdd = []

  if (!hasIl02) {
    const salesOrderNo = '1-20260903-IL02'
    const requestNo = 'GYHLBS260903001'
    toAdd.push(
      {
        id: 'ilbl-mobile-demo-1',
        labelCode: 'IL02202609030001',
        status: '有效',
        qrStatus: '待绑定',
      engraveStatus: '待刻录',
        requestOrderNo: requestNo,
        sourceType: 'sales_order',
        salesOrderId: 'so-seed-industrial-label-done',
        salesOrderNo,
        salesLineId: 'line-seed-il2-a',
        productCode: 'CP2610001',
        productName: '清水离心泵 ISG50-160',
        specModel: 'ISG50-160',
        material: '钢',
        batchNo: salesOrderNo,
        templateName: '标准泵铭牌',
        customerName: '华东机械制造有限公司',
        regTime: now,
        lifecycle: [{ type: 'sales_order', docNo: salesOrderNo, docId: '', at: now }],
        operationLogs: [{ type: '注册', detail: '销售订单审核自动注册', operator: 'system', time: now }],
      },
      {
        id: 'ilbl-mobile-demo-2',
        labelCode: 'IL02202609030002',
        status: '有效',
        qrStatus: '待绑定',
      engraveStatus: '待刻录',
        requestOrderNo: requestNo,
        sourceType: 'sales_order',
        salesOrderId: 'so-seed-industrial-label-done',
        salesOrderNo,
        salesLineId: 'line-seed-il2-a',
        productCode: 'CP2610001',
        productName: '清水离心泵 ISG50-160',
        specModel: 'ISG50-160',
        material: '钢',
        batchNo: salesOrderNo,
        templateName: '标准泵铭牌',
        customerName: '华东机械制造有限公司',
        regTime: now,
        lifecycle: [{ type: 'sales_order', docNo: salesOrderNo, docId: '', at: now }],
        operationLogs: [{ type: '注册', detail: '销售订单审核自动注册', operator: 'system', time: now }],
      },
      {
        id: 'ilbl-mobile-demo-3',
        labelCode: 'IL02202609030003',
        status: '有效',
        qrStatus: '待绑定',
      engraveStatus: '待刻录',
        requestOrderNo: requestNo,
        sourceType: 'sales_order',
        salesOrderId: 'so-seed-industrial-label-done',
        salesOrderNo,
        salesLineId: 'line-seed-il2-b',
        productCode: 'CP2610002',
        productName: '立式多级离心泵 CDL4-40',
        specModel: 'CDL4-40',
        material: '',
        batchNo: salesOrderNo,
        templateName: '标准泵铭牌',
        customerName: '华东机械制造有限公司',
        regTime: now,
        lifecycle: [{ type: 'sales_order', docNo: salesOrderNo, docId: '', at: now }],
        operationLogs: [{ type: '注册', detail: '销售订单审核自动注册', operator: 'system', time: now }],
      },
      {
        id: 'ilbl-mobile-demo-4',
        labelCode: 'IL02202609030004',
        status: '有效',
        qrStatus: '已绑定',
      engraveStatus: '已刻录',
        requestOrderNo: requestNo,
        sourceType: 'sales_order',
        salesOrderId: 'so-seed-industrial-label-done',
        salesOrderNo,
        salesLineId: 'line-seed-il2-b',
        productCode: 'CP2610002',
        productName: '立式多级离心泵 CDL4-40',
        specModel: 'CDL4-40',
        material: '',
        batchNo: salesOrderNo,
        templateName: '标准泵铭牌',
        nameplateMountedAt: now,
        nameplateMountedBy: '演示',
        boundAtInbound: true,
        customerName: '华东机械制造有限公司',
        regTime: now,
        lifecycle: [{ type: 'sales_order', docNo: salesOrderNo, docId: '', at: now }],
        operationLogs: [{ type: '装牌确认', detail: '演示已装牌', operator: '演示', time: now }],
      },
    )
    if (!state.requests.some((r) => r.orderNo === requestNo)) {
      state.requests.unshift({
        id: 'ilreq-mobile-demo-il02',
        orderNo: requestNo,
        sourceType: 'sales_order',
        salesOrderNo,
        batchNo: salesOrderNo,
        status: '全部成功',
        remark: '小程序演示申请单',
        createTime: now,
        successCount: 4,
        failCount: 0,
        totalCount: 4,
      })
    }
  }

  if (!hasIl03) {
    const doneOrderNo = '1-20260901-IL03'
    toAdd.push(
      {
        id: 'ilbl-mobile-done-1',
        labelCode: 'IL03202609010001',
        status: '有效',
        qrStatus: '已绑定',
      engraveStatus: '已刻录',
        requestOrderNo: 'GYHLBS260901001',
        sourceType: 'sales_order',
        salesOrderId: 'so-seed-industrial-label-all-done',
        salesOrderNo: doneOrderNo,
        salesLineId: 'line-seed-il3-a',
        productCode: 'CP2610001',
        productName: '清水离心泵 ISG50-160',
        specModel: 'ISG50-160',
        material: '钢',
        batchNo: doneOrderNo,
        templateName: '标准泵铭牌',
        nameplateMountedAt: now,
        nameplateMountedBy: '演示',
        boundAtInbound: true,
        customerName: '齐鲁石化装备公司',
        regTime: now,
        lifecycle: [{ type: 'sales_order', docNo: doneOrderNo, docId: '', at: now }],
        operationLogs: [{ type: '装牌确认', detail: '演示已装牌', operator: '演示', time: now }],
      },
      {
        id: 'ilbl-mobile-done-2',
        labelCode: 'IL03202609010002',
        status: '有效',
        qrStatus: '已绑定',
      engraveStatus: '已刻录',
        requestOrderNo: 'GYHLBS260901001',
        sourceType: 'sales_order',
        salesOrderId: 'so-seed-industrial-label-all-done',
        salesOrderNo: doneOrderNo,
        salesLineId: 'line-seed-il3-a',
        productCode: 'CP2610001',
        productName: '清水离心泵 ISG50-160',
        specModel: 'ISG50-160',
        material: '钢',
        batchNo: doneOrderNo,
        templateName: '标准泵铭牌',
        nameplateMountedAt: now,
        nameplateMountedBy: '演示',
        boundAtInbound: true,
        customerName: '齐鲁石化装备公司',
        regTime: now,
        lifecycle: [{ type: 'sales_order', docNo: doneOrderNo, docId: '', at: now }],
        operationLogs: [{ type: '装牌确认', detail: '演示已装牌', operator: '演示', time: now }],
      },
    )
  }

  if (!toAdd.length) return
  state.labels = [...toAdd, ...state.labels]
  saveLabelState(state)
  try {
    uni.setStorageSync(MOBILE_SEED_FLAG, '1')
  } catch {
    /* ignore */
  }
}

function enrichLabel(label) {
  if (!label) return null
  const meta = label.salesOrderNo ? findSalesOrderMeta(label.salesOrderNo) : { customerName: '' }
  return {
    ...label,
    customerName: meta.customerName || label.customerName || '',
  }
}

export function getLabelByCode(labelCode) {
  ensureMobileIndustrialLabelSeed()
  const code = String(labelCode || '').trim()
  if (!code) return null
  const state = loadLabelState()
  const hit = state.labels.find((l) => String(l.labelCode).toUpperCase() === code.toUpperCase())
  return enrichLabel(hit)
}

/** 按关键词查：SN / 销售单号 / 产品编码 / 产品名称 */
export function searchIndustrialLabels(keyword = '') {
  ensureMobileIndustrialLabelSeed()
  const kw = String(keyword || '').trim().toLowerCase()
  const state = loadLabelState()
  let rows = state.labels.filter((l) => l.status !== '作废')
  if (kw) {
    rows = rows.filter((l) => {
      const blob = [
        l.labelCode,
        l.salesOrderNo,
        l.productCode,
        l.productName,
        l.specModel,
        l.requestOrderNo,
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(kw)
    })
  }
  return rows.map(enrichLabel).sort((a, b) => String(b.regTime || '').localeCompare(String(a.regTime || '')))
}

export function listLabelsBySalesOrder(salesOrderNo) {
  ensureMobileIndustrialLabelSeed()
  const no = String(salesOrderNo || '').trim()
  if (!no) return []
  return searchIndustrialLabels(no).filter((l) => l.salesOrderNo === no)
}

function isLabelMounted(label) {
  return Boolean(
    label?.nameplateMountedAt ||
      label?.engraveStatus === '已刻录' ||
      label?.boundAtInbound ||
      label?.qrStatus === '已绑定',
  )
}

/**
 * 按销售单聚合铭牌任务（工人任务视角）
 * @param {{ status?: 'pending'|'done'|'' , keyword?: string }} filters
 */
export function listNameplateOrderTasks(filters = {}) {
  ensureMobileIndustrialLabelSeed()
  const status = filters.status || ''
  const kw = String(filters.keyword || '').trim().toLowerCase()
  const labels = searchIndustrialLabels('').filter((l) => l.salesOrderNo)

  const byOrder = new Map()
  labels.forEach((label) => {
    const orderNo = label.salesOrderNo
    if (!byOrder.has(orderNo)) {
      byOrder.set(orderNo, [])
    }
    byOrder.get(orderNo).push(label)
  })

  const tasks = []
  byOrder.forEach((rows, orderNo) => {
    const meta = findSalesOrderMeta(orderNo)
    const productsMap = new Map()
    rows.forEach((l) => {
      const key = `${l.salesLineId || ''}|${l.productCode || ''}|${l.productName || ''}`
      if (!productsMap.has(key)) {
        productsMap.set(key, {
          key,
          salesLineId: l.salesLineId || '',
          productCode: l.productCode || '',
          productName: l.productName || '未命名产品',
          specModel: l.specModel || '',
          material: l.material || '',
          labels: [],
        })
      }
      productsMap.get(key).labels.push(l)
    })

    const products = [...productsMap.values()].map((p) => {
      const total = p.labels.length
      const done = p.labels.filter(isLabelMounted).length
      const pending = total - done
      return {
        ...p,
        total,
        done,
        pending,
        status: pending <= 0 ? '已完成' : done > 0 ? '进行中' : '待刻录',
        labels: p.labels
          .slice()
          .sort((a, b) => String(a.labelCode).localeCompare(String(b.labelCode)))
          .map((l) => ({
            ...l,
            mounted: isLabelMounted(l),
          })),
      }
    })

    const total = rows.length
    const done = rows.filter(isLabelMounted).length
    const pending = total - done
    const taskStatus = pending <= 0 ? '已完成' : done > 0 ? '进行中' : '待刻录'
    const customerName = meta.customerName || rows[0]?.customerName || ''

    if (kw) {
      const blob = [orderNo, customerName, ...products.map((p) => `${p.productName} ${p.productCode}`)]
        .join(' ')
        .toLowerCase()
      if (!blob.includes(kw)) return
    }
    if (status === 'pending' && pending <= 0) return
    if (status === 'done' && pending > 0) return

    tasks.push({
      orderNo,
      customerName,
      total,
      done,
      pending,
      status: taskStatus,
      products,
      latestRegTime: rows.map((r) => r.regTime || '').sort().reverse()[0] || '',
    })
  })

  return tasks.sort((a, b) => {
    // 待刻/进行中优先，再按时间
    const rank = (s) => (s === '待刻录' ? 0 : s === '进行中' ? 1 : 2)
    const d = rank(a.status) - rank(b.status)
    if (d !== 0) return d
    return String(b.latestRegTime).localeCompare(String(a.latestRegTime))
  })
}

export function getNameplateOrderTask(salesOrderNo) {
  const no = String(salesOrderNo || '').trim()
  if (!no) return null
  return listNameplateOrderTasks({}).find((t) => t.orderNo === no) || null
}

/**
 * 装牌确认：此时才将 SN 挂到实物（方案 A：入库不自动挂）
 */
export function confirmNameplateMount(labelCode, { operator = '小程序', pieceSerialNo = '' } = {}) {
  ensureMobileIndustrialLabelSeed()
  const code = String(labelCode || '').trim()
  if (!code) return { ok: false, message: '请输入 SN 码' }

  const state = loadLabelState()
  const idx = state.labels.findIndex(
    (l) => String(l.labelCode).toUpperCase() === code.toUpperCase(),
  )
  if (idx < 0) return { ok: false, message: '未找到该 SN' }
  const label = state.labels[idx]
  if (label.status === '作废') return { ok: false, message: '该标识已作废，不可装牌' }
  if (label.nameplateMountedAt || label.engraveStatus === '已刻录' || label.boundAtInbound) {
    return { ok: true, label: enrichLabel(label), message: '该 SN 已装牌确认', already: true }
  }

  const now = nowText()
  label.qrStatus = '已绑定'
  label.boundAtInbound = true
  label.engraveStatus = '已刻录'
  label.nameplateMountedAt = now
  label.nameplateMountedBy = operator || '小程序'
  if (pieceSerialNo) {
    label.pieceId = pieceSerialNo
    label.pieceSerialNo = pieceSerialNo
  }
  label.operationLogs = label.operationLogs || []
  label.operationLogs.unshift({
    type: '装牌确认',
    detail: pieceSerialNo ? `铭牌已刻装，件号 ${pieceSerialNo}` : '铭牌已刻装确认',
    operator: label.nameplateMountedBy,
    time: now,
  })
  state.labels[idx] = label
  saveLabelState(state)
  return { ok: true, label: enrichLabel(label), message: '装牌确认成功' }
}
