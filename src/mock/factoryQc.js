/** 出厂质检 mock（与 PC 端 factoryQc 字段对齐，便于后续接 API） */
export const qcStatusOptions = ['待质检', '已完成', '已终止']
export const qcResultOptions = ['', '质检通过', '质检不通过', '部分通过']
export const lineQcResultOptions = ['合格', '不合格']
export const treatmentPlanOptions = ['返工', '换批次']

const records = [
  {
    id: 'fqc-m1',
    qcNo: 'CCZJ202606020001',
    qcStatus: '待质检',
    qcResult: '',
    salesOrderNo: '1-20260529-002',
    customerName: '测试人员',
    outboundDocNo: 'OUT202606020002',
    source: '销售发货',
    inspectDate: '2026-06-02',
    lineItems: [
      {
        id: 'l1',
        itemName: '测试产品00002',
        itemCode: 'SPARE-50*30-001',
        specModel: '50*30',
        shipQty: 3,
        shipWarehouse: '成品仓',
        unit: '个',
        inspectQty: 3,
      },
    ],
  },
  {
    id: 'fqc-m2',
    qcNo: 'CCZJ202606030001',
    qcStatus: '已完成',
    qcResult: '部分通过',
    salesOrderNo: '1-20260603-001',
    customerName: '复检客户',
    outboundDocNo: 'OUT202606030006',
    source: '销售发货',
    inspectDate: '2026-06-03',
    inspector: 'admin1',
    lineItems: [
      {
        id: 'l2',
        itemName: '法兰盘',
        itemCode: 'PRD-FLANGE-01',
        shipQty: 8,
        lineQcResult: '合格',
        inspectQty: 8,
      },
      {
        id: 'l3',
        itemName: '密封圈',
        itemCode: 'PRD-SEAL-02',
        shipQty: 20,
        lineQcResult: '不合格',
        inspectQty: 20,
        treatmentPlan: '返工',
      },
    ],
  },
  {
    id: 'fqc-m3',
    qcNo: 'CCZJ202605280001',
    qcStatus: '已完成',
    qcResult: '质检通过',
    salesOrderNo: '1-20260528-001',
    customerName: '人纷纷',
    outboundDocNo: 'OUT202605280005',
    source: '销售发货',
    inspector: 'admin1',
    lineItems: [
      {
        id: 'l4',
        itemName: '潜水电机',
        itemCode: 'PRD-YQST250',
        shipQty: 2,
        lineQcResult: '合格',
        inspectQty: 2,
      },
    ],
  },
]

const STORAGE_KEY = 'i_doms_mobile_factory_qc'

function load() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(records))
}

let cache = load()

function save() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(cache))
}

export function getQcList(filters = {}) {
  return cache.filter((r) => {
    if (filters.qcStatus && r.qcStatus !== filters.qcStatus) return false
    if (filters.keyword) {
      const k = filters.keyword
      const hit =
        r.qcNo?.includes(k) ||
        r.salesOrderNo?.includes(k) ||
        r.customerName?.includes(k) ||
        r.outboundDocNo?.includes(k)
      if (!hit) return false
    }
    return true
  })
}

export function getQcById(id) {
  return cache.find((r) => r.id === id) || null
}

export function getPendingQcCount() {
  return cache.filter((r) => r.qcStatus === '待质检').length
}

export function submitQcInspection(id, payload) {
  const record = getQcById(id)
  if (!record || record.qcStatus !== '待质检') {
    return { ok: false, message: '仅待质检任务可提交' }
  }
  const lines = payload.lineItems || []
  for (const line of lines) {
    if (!line.lineQcResult) return { ok: false, message: '请填写每条明细的质检结果' }
    if (line.lineQcResult === '不合格' && !line.treatmentPlan) {
      return { ok: false, message: `「${line.itemName}」不合格请选择处理方案` }
    }
    if (
      line.lineQcResult === '不合格' &&
      !treatmentPlanOptions.includes(line.treatmentPlan)
    ) {
      return { ok: false, message: `「${line.itemName}」处理方案须为返工或换批次` }
    }
  }
  const results = lines.map((l) => l.lineQcResult)
  let qcResult = '部分通过'
  if (results.every((r) => r === '合格')) qcResult = '质检通过'
  else if (results.every((r) => r === '不合格')) qcResult = '质检不通过'

  Object.assign(record, {
    qcStatus: '已完成',
    qcResult,
    lineItems: lines,
    inspector: payload.inspector || '当前用户',
    inspectedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    remark: payload.remark || '',
  })
  save()
  return { ok: true, message: `质检完成：${qcResult}` }
}
