/** 出厂质检 mock（与 PC 端 factoryQc 字段对齐，便于后续接 API） */
export const qcStatusOptions = ['待质检', '已完成', '已终止']
export const qcResultOptions = ['', '质检通过', '质检不通过', '部分通过']
export const lineQcResultOptions = ['合格', '不合格']
export const treatmentPlanOptions = ['返工', '换批次']
export const inspectMethodOptions = ['抽检', '全检']

function normalizeQcRecord(record) {
  if (!record) return null
  const lineItems = (record.lineItems || []).map((line) => ({
    ...line,
    productName: line.productName || line.itemName,
    specModel: line.specModel ?? '—',
  }))
  return {
    ...record,
    lineItems,
    inspectMethod: record.inspectMethod || '抽检',
    outboundWarehouse:
      record.outboundWarehouse || lineItems[0]?.shipWarehouse || '',
  }
}

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
    inspectMethod: '抽检',
    outboundWarehouse: '成品仓',
    lineItems: [
      {
        id: 'l1',
        productName: '测试产品00002',
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
  {
    id: 'fqc-4',
    qcNo: 'CCZJ202606020002',
    qcStatus: '待质检',
    qcResult: '',
    salesOrderNo: '1-20260529-002',
    customerName: '测试人员',
    outboundDocNo: 'OUT202606020002',
    source: '销售发货',
    inspectDate: '2026-06-02',
    lineItems: [
      {
        id: 'l5',
        itemName: '测试产品00002',
        itemCode: 'SPARE-50*30-001',
        shipQty: 3,
        inspectQty: 3,
        unit: '个',
      },
    ],
  },
  {
    id: 'fqc-5',
    qcNo: 'CCZJ202606040001',
    qcStatus: '待质检',
    salesOrderNo: '1-20260604-001',
    customerName: '深圳智联科技',
    outboundDocNo: 'OUT202606040001',
    source: '销售发货',
    inspectDate: '2026-06-04',
    lineItems: [
      { id: 'l6', itemName: '控制柜总成', itemCode: 'PRD-CTRL-200', shipQty: 5, inspectQty: 5, unit: '台' },
      { id: 'l7', itemName: '触摸屏模组', itemCode: 'PRD-HMI-10', shipQty: 5, inspectQty: 5, unit: '块' },
    ],
  },
  {
    id: 'fqc-6',
    qcNo: 'CCZJ202606040002',
    qcStatus: '待质检',
    salesOrderNo: '1-20260604-002',
    customerName: '北方重工',
    outboundDocNo: 'OUT202606040002',
    source: '销售发货',
    lineItems: [
      { id: 'l8', itemName: '主轴箱体', itemCode: 'PRD-SPD-BOX', shipQty: 2, inspectQty: 2, unit: '件' },
    ],
  },
  {
    id: 'fqc-7',
    qcNo: 'CCZJ202606050001',
    qcStatus: '待质检',
    salesOrderNo: '1-20260605-001',
    customerName: '华东机械制造有限公司',
    outboundDocNo: 'OUT202606050001',
    source: '销售发货',
    lineItems: [
      { id: 'l9', itemName: '精密模芯', itemCode: 'MD-200-BLK', shipQty: 1, inspectQty: 1, unit: '件' },
    ],
  },
  {
    id: 'fqc-8',
    qcNo: 'CCZJ202606010001',
    qcStatus: '待质检',
    salesOrderNo: '1-20260601-003',
    customerName: '广州海工装备',
    outboundDocNo: 'OUT202606010008',
    source: '销售发货',
    lineItems: [
      { id: 'l10', itemName: '海水泵叶轮', itemCode: 'PRD-IMP-316', shipQty: 12, inspectQty: 12, unit: '件' },
    ],
  },
  {
    id: 'fqc-9',
    qcNo: 'CCZJ202605300001',
    qcStatus: '已完成',
    qcResult: '质检通过',
    salesOrderNo: '1-20260530-001',
    customerName: '测试人员',
    inspector: '张三',
    lineItems: [
      {
        id: 'l11',
        itemName: '联轴器',
        itemCode: 'MAT-CPL-88',
        shipQty: 24,
        inspectQty: 24,
        lineQcResult: '合格',
      },
    ],
  },
  {
    id: 'fqc-10',
    qcNo: 'CCZJ202605310001',
    qcStatus: '已完成',
    qcResult: '质检不通过',
    salesOrderNo: '1-20260531-001',
    customerName: '北方重工',
    inspector: 'admin1',
    lineItems: [
      {
        id: 'l12',
        itemName: '轴承座',
        itemCode: 'MAT-BRG-120',
        shipQty: 40,
        inspectQty: 40,
        lineQcResult: '不合格',
        treatmentPlan: '返工',
      },
    ],
  },
  {
    id: 'fqc-11',
    qcNo: 'CCZJ202606010002',
    qcStatus: '已完成',
    qcResult: '部分通过',
    salesOrderNo: '1-20260601-001',
    customerName: '华东机械制造有限公司',
    inspector: '张三',
    lineItems: [
      { id: 'l13', itemName: '液压缸', itemCode: 'PRD-HYD-80', shipQty: 4, lineQcResult: '合格', inspectQty: 4 },
      {
        id: 'l14',
        itemName: '密封组件',
        itemCode: 'PRD-SEAL-KIT',
        shipQty: 4,
        lineQcResult: '不合格',
        treatmentPlan: '换批次',
        inspectQty: 4,
      },
    ],
  },
  {
    id: 'fqc-16',
    qcNo: 'CCZJ202606060001',
    qcStatus: '待质检',
    salesOrderNo: '1-20260606-001',
    customerName: '测试人员',
    outboundDocNo: 'OUT202606060001',
    source: '销售发货',
    lineItems: [
      { id: 'l15', itemName: '减速机', itemCode: 'PRD-RED-350', shipQty: 3, inspectQty: 3, unit: '台' },
      { id: 'l16', itemName: '输入轴', itemCode: 'PRD-SHAFT-IN', shipQty: 3, inspectQty: 3, unit: '根' },
    ],
  },
  {
    id: 'fqc-18',
    qcNo: 'CCZJ202606070001',
    qcStatus: '待质检',
    salesOrderNo: '1-20260607-001',
    customerName: '复检客户',
    outboundDocNo: 'OUT202606070001',
    source: '销售发货',
    lineItems: [
      { id: 'l17', itemName: '密封圈', itemCode: 'PRD-SEAL-02', shipQty: 20, inspectQty: 20, unit: '件' },
    ],
  },
]

const STORAGE_KEY = 'i_doms_mobile_factory_qc_v2'

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
  return cache
    .filter((r) => {
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
    .map(normalizeQcRecord)
}

export function getQcById(id) {
  const row = cache.find((r) => r.id === id) || null
  return normalizeQcRecord(row)
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
  if (!payload.inspectMethod) {
    return { ok: false, message: '请选择质检方式' }
  }
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
    inspectMethod: payload.inspectMethod,
    inspector: payload.inspector || '当前用户',
    inspectedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    remark: payload.remark || '',
  })
  save()
  return { ok: true, message: `质检完成：${qcResult}` }
}
