/**
 * 质检任务 Storage 桥：与 WEB 共用
 * - i_doms_qc_tasks：来料/外协/过程/成品
 * - i_doms_factory_qc：出厂质检
 * - i_doms_qc_templates：模板快照（回填 templateFields）
 */

import {
  SHARED_QC_DEMO_SEED_KEY,
  SHARED_QC_DEMO_SEED_VERSION,
  buildSharedQcTaskSeed,
  buildSharedFactoryQcSeed,
  buildSharedQcTemplateSeed,
} from '@/mock/qcSharedSeed'

export const QC_TASK_STORAGE_KEY = 'i_doms_qc_tasks'
export const QC_TASK_STORAGE_VERSION = 3
export const FACTORY_QC_STORAGE_KEY = 'i_doms_factory_qc'
export const FACTORY_QC_STORAGE_VERSION = 5
export const QC_TEMPLATE_STORAGE_KEY = 'i_doms_qc_templates'
export const QC_TEMPLATE_STORAGE_VERSION = 1

export const QC_BIZ_SCOPES = ['来料质检', '外协回货检', '生产过程检', '成品检', '出厂质检']

export const QC_BIZ_SCOPE_META = [
  {
    scope: '来料质检',
    short: '来料',
    title: '来料质检',
    desc: '采购收货后的来料检验',
    icon: '📦',
    tone: 'blue',
    group: '采购供应链',
  },
  {
    scope: '外协回货检',
    short: '外协',
    title: '外协回货检',
    desc: '外协加工回货检验',
    icon: '🔧',
    tone: 'cyan',
    group: '采购供应链',
  },
  {
    scope: '生产过程检',
    short: '过程',
    title: '生产过程检',
    desc: '工序过程质量检验',
    icon: '⚙️',
    tone: 'orange',
    group: '生产制造',
  },
  {
    scope: '成品检',
    short: '成品',
    title: '成品检',
    desc: '完工成品入库前检验',
    icon: '🏭',
    tone: 'green',
    group: '生产制造',
  },
  {
    scope: '出厂质检',
    short: '出厂',
    title: '出厂质检',
    desc: '销售发货前出厂检验',
    icon: '🚚',
    tone: 'purple',
    group: '销售履约',
  },
]

export const QC_TASK_STATUS = {
  PENDING: '待质检',
  COMPLETED: '已完成',
  CANCELLED: '已终止',
}

export const QC_TASK_RESULT = {
  PASS: '质检通过',
  FAIL: '质检不通过',
  PARTIAL: '部分通过',
}

export const inspectMethodOptions = ['抽检', '全检']

const DEFAULT_CONCLUSION_OPTIONS = [
  { value: '合格', result: QC_TASK_RESULT.PASS },
  { value: '不合格', result: QC_TASK_RESULT.FAIL },
  { value: '让步合格', result: QC_TASK_RESULT.PASS },
  { value: '部分合格', result: QC_TASK_RESULT.PARTIAL },
]

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

function formatNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function normalizeStatus(status) {
  if (status === '检验中' || status === '检测中') return QC_TASK_STATUS.PENDING
  return status || QC_TASK_STATUS.PENDING
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function getQcBizScopeMeta(scope) {
  return QC_BIZ_SCOPE_META.find((m) => m.scope === scope) || null
}

export function isInboundQcBizScope(bizScope) {
  return bizScope === '来料质检' || bizScope === '外协回货检'
}

export function getTreatmentPlanOptions(bizScope) {
  if (bizScope === '来料质检') return ['退货', '换货', '让步接收']
  if (bizScope === '外协回货检') return ['退货', '换货', '让步接收', '返工']
  if (bizScope === '出厂质检') return ['返工', '换批次']
  return ['返工', '让步接收', '报废']
}

function loadTemplates() {
  const parsed = readStore(QC_TEMPLATE_STORAGE_KEY)
  if (parsed?.version === QC_TEMPLATE_STORAGE_VERSION && Array.isArray(parsed.templates)) {
    return parsed.templates
  }
  return []
}

function getTemplateByCode(code) {
  const c = String(code || '').trim()
  if (!c) return null
  return loadTemplates().find((t) => t.code === c) || null
}

function normalizeConclusionItems(items) {
  if (Array.isArray(items) && items.length) {
    return items.map((o) => ({
      value: String(o.value || '').trim(),
      result: o.result || mapConclusionToResult(o.value),
    })).filter((o) => o.value)
  }
  return DEFAULT_CONCLUSION_OPTIONS.map((o) => ({ ...o }))
}

function buildSystemFields(sheetConclusionOptionItems, inspectQty) {
  const items = normalizeConclusionItems(sheetConclusionOptionItems)
  return [
    {
      code: 'QC_INSPECT_METHOD',
      name: '质检方式',
      type: 'radio',
      required: true,
      options: [...inspectMethodOptions],
      defaultValue: '抽检',
      isPresetInspectMethod: true,
    },
    {
      code: 'QC_INSPECT_QTY',
      name: '质检数量',
      type: 'number',
      required: true,
      defaultValue: inspectQty,
      isPresetInspectQty: true,
    },
    {
      code: 'QC_CONCLUSION',
      name: '质检结果',
      type: 'radio',
      required: true,
      isConclusion: true,
      options: items.map((o) => o.value),
      optionItems: items,
      optionResults: Object.fromEntries(items.map((o) => [o.value, o.result])),
    },
    {
      code: 'QC_INSPECT_REMARK',
      name: '检验备注',
      type: 'textarea',
      required: false,
      placeholder: '选填',
    },
  ]
}

function ensureConclusionField(fields = [], sheetConclusionOptionItems) {
  const list = (fields || []).filter(
    (f) => !(f.isConclusion || f.code === 'QC_CONCLUSION' || f.name === '质检结果'),
  )
  const items = normalizeConclusionItems(sheetConclusionOptionItems)
  list.push({
    code: 'QC_CONCLUSION',
    name: '质检结果',
    type: 'radio',
    required: true,
    isConclusion: true,
    options: items.map((o) => o.value),
    optionItems: items,
    optionResults: Object.fromEntries(items.map((o) => [o.value, o.result])),
  })
  return list
}

function hydrateLine(line = {}) {
  if (Array.isArray(line.templateFields) && line.templateFields.length) {
    return {
      ...line,
      productName: line.productName || line.itemName,
      templateFields: ensureConclusionField(
        line.templateFields,
        line.sheetConclusionOptionItems,
      ),
    }
  }
  const tpl = getTemplateByCode(line.templateCode)
  const inspectQty = Number(line.inspectQty ?? line.receiptQty ?? line.shipQty ?? 0) || 0
  if (tpl?.fields?.length) {
    return {
      ...line,
      productName: line.productName || line.itemName,
      templateId: line.templateId || tpl.id,
      templateName: line.templateName || tpl.name,
      sheetPassRule: line.sheetPassRule || tpl.sheetPassRule,
      sheetConclusionOptionItems:
        line.sheetConclusionOptionItems || tpl.sheetConclusionOptionItems,
      templateFields: ensureConclusionField(
        clone(tpl.fields),
        line.sheetConclusionOptionItems || tpl.sheetConclusionOptionItems,
      ),
    }
  }
  return {
    ...line,
    productName: line.productName || line.itemName,
    templateName: line.templateName || '系统通用模板',
    templateFields: buildSystemFields(line.sheetConclusionOptionItems, inspectQty),
  }
}

function hydrateTask(task = {}) {
  return {
    ...task,
    qcStatus: normalizeStatus(task.qcStatus),
    lineItems: (task.lineItems || []).map((l) => hydrateLine(l)),
  }
}

function slimTasks(tasks = []) {
  return (tasks || []).map((t) => {
    const rest = { ...t }
    delete rest.templateFields
    return {
      ...rest,
      lineItems: (t.lineItems || []).map((l) => {
        const lineRest = { ...l }
        delete lineRest.templateFields
        delete lineRest.fieldMap
        return lineRest
      }),
    }
  })
}

function loadQcTasksRaw() {
  const parsed = readStore(QC_TASK_STORAGE_KEY)
  if (
    parsed &&
    (parsed.version === QC_TASK_STORAGE_VERSION || parsed.version === 2) &&
    Array.isArray(parsed.tasks)
  ) {
    return parsed.tasks
  }
  return []
}

function saveQcTasks(tasks) {
  writeStore(QC_TASK_STORAGE_KEY, {
    version: QC_TASK_STORAGE_VERSION,
    tasks: slimTasks(tasks),
  })
}

function loadFactoryRaw() {
  const parsed = readStore(FACTORY_QC_STORAGE_KEY)
  if (parsed?.version === FACTORY_QC_STORAGE_VERSION && Array.isArray(parsed.records)) {
    return parsed.records
  }
  return []
}

function saveFactoryRecords(records) {
  writeStore(FACTORY_QC_STORAGE_KEY, {
    version: FACTORY_QC_STORAGE_VERSION,
    records,
  })
}

function factoryToTask(record) {
  if (!record) return null
  return hydrateTask({
    ...record,
    bizScope: '出厂质检',
    sourceType: record.sourceType || 'sales_outbound',
    sourceDocNo: record.outboundDocNo || record.sourceOrderNo || '',
    supplier: record.customerName || '',
    creator: record.creator || '',
    createdAt: record.createdAt || '',
    lineItems: (record.lineItems || []).map((l) => ({
      ...l,
      receiptQty: l.receiptQty ?? l.shipQty,
      inspectQty: l.inspectQty ?? l.shipQty,
    })),
  })
}

function loadAllTasks() {
  const normal = loadQcTasksRaw().map((t) => hydrateTask(t))
  const factory = loadFactoryRaw().map((r) => factoryToTask(r)).filter(Boolean)
  return [...normal, ...factory]
}

export function mapConclusionToResult(raw, field = null) {
  const v = String(raw || '').trim()
  if (!v) return ''
  if (field?.optionResults?.[v]) return field.optionResults[v]
  const hit = (field?.optionItems || DEFAULT_CONCLUSION_OPTIONS).find((o) => o.value === v)
  if (hit?.result) return hit.result
  if (v.includes('部分')) return QC_TASK_RESULT.PARTIAL
  if (v.includes('不') || v === '不合格') return QC_TASK_RESULT.FAIL
  if (v.includes('合格') || v.includes('通过') || v.includes('让步')) return QC_TASK_RESULT.PASS
  return ''
}

export function resolveLineResult(line) {
  const fields = line?.templateFields || []
  const conclusion = fields.find(
    (f) => f.isConclusion || f.code === 'QC_CONCLUSION' || f.name === '质检结果',
  )
  if (!conclusion) return line?.lineQcResult || ''
  const values = line?.fieldValues || []
  const hit =
    values.find((v) => v.fieldCode === conclusion.code || v.code === conclusion.code) ||
    values.find((v) => v.fieldName === conclusion.name)
  return mapConclusionToResult(hit?.value ?? hit?.fieldValue, conclusion)
}

export function aggregateLineResults(lineResults = []) {
  const list = (lineResults || []).filter(Boolean)
  if (!list.length) return ''
  if (list.every((r) => r === QC_TASK_RESULT.PASS)) return QC_TASK_RESULT.PASS
  if (list.every((r) => r === QC_TASK_RESULT.FAIL)) return QC_TASK_RESULT.FAIL
  return QC_TASK_RESULT.PARTIAL
}

export function needTreatment(conclusionLabel, mappedResult) {
  const raw = String(conclusionLabel || '').trim()
  if (!raw) return false
  if (mappedResult === QC_TASK_RESULT.FAIL || mappedResult === QC_TASK_RESULT.PARTIAL) return true
  if (raw.includes('让步')) return true
  return false
}

export function getQcList(filters = {}) {
  return loadAllTasks()
    .filter((r) => {
      if (filters.bizScope && r.bizScope !== filters.bizScope) return false
      if (filters.qcStatus && r.qcStatus !== filters.qcStatus) return false
      if (filters.keyword) {
        const k = String(filters.keyword).trim()
        const hit =
          r.qcNo?.includes(k) ||
          r.sourceDocNo?.includes(k) ||
          r.supplier?.includes(k) ||
          r.customerName?.includes(k) ||
          r.salesOrderNo?.includes(k) ||
          r.outboundDocNo?.includes(k) ||
          r.workOrderNo?.includes(k) ||
          r.itemName?.includes(k) ||
          r.itemCode?.includes(k) ||
          r.creator?.includes(k) ||
          (r.lineItems || []).some(
            (l) => l.itemName?.includes(k) || l.itemCode?.includes(k),
          )
        if (!hit) return false
      }
      return true
    })
    .map((r) => clone(r))
}

export function getQcById(id) {
  const row = loadAllTasks().find((r) => r.id === id) || null
  return row ? clone(row) : null
}

export function getPendingQcCount() {
  return loadAllTasks().filter((r) => r.qcStatus === QC_TASK_STATUS.PENDING).length
}

export function getQcScopePendingCounts() {
  const map = Object.fromEntries(QC_BIZ_SCOPES.map((s) => [s, 0]))
  loadAllTasks().forEach((r) => {
    if (r.qcStatus === QC_TASK_STATUS.PENDING && map[r.bizScope] != null) {
      map[r.bizScope] += 1
    }
  })
  return map
}

/**
 * 写入 WEB 同源演示质检任务（来料/外协/过程/成品/出厂）
 * 仅替换 id 以 shared- 开头的演示单，保留其它真实数据
 */
export function ensureSharedQcDemoSeed({ force = false } = {}) {
  let flag = ''
  try {
    flag = uni.getStorageSync(SHARED_QC_DEMO_SEED_KEY) || ''
  } catch {
    /* ignore */
  }
  if (!flag && typeof localStorage !== 'undefined') {
    try {
      flag = localStorage.getItem(SHARED_QC_DEMO_SEED_KEY) || ''
    } catch {
      /* ignore */
    }
  }

  const tasks = loadQcTasksRaw()
  const factory = loadFactoryRaw()
  const templates = loadTemplates()
  const empty = !tasks.length && !factory.length
  const needSeed = force || flag !== SHARED_QC_DEMO_SEED_VERSION || empty
  if (!needSeed) return { ok: true, seeded: false }

  const demoTasks = buildSharedQcTaskSeed()
  const demoFactory = buildSharedFactoryQcSeed()
  const nextTasks = [
    ...demoTasks,
    ...tasks.filter((t) => !String(t.id || '').startsWith('shared-')),
  ]
  const nextFactory = [
    ...demoFactory,
    ...factory.filter((r) => !String(r.id || '').startsWith('shared-')),
  ]
  saveQcTasks(nextTasks)
  saveFactoryRecords(nextFactory)

  if (!templates.length) {
    writeStore(QC_TEMPLATE_STORAGE_KEY, {
      version: QC_TEMPLATE_STORAGE_VERSION,
      templates: buildSharedQcTemplateSeed(),
    })
  } else {
    const demoTpls = buildSharedQcTemplateSeed()
    const demoCodes = new Set(demoTpls.map((t) => t.code))
    const kept = templates.filter((t) => !demoCodes.has(t.code))
    writeStore(QC_TEMPLATE_STORAGE_KEY, {
      version: QC_TEMPLATE_STORAGE_VERSION,
      templates: [...demoTpls, ...kept],
    })
  }

  try {
    uni.setStorageSync(SHARED_QC_DEMO_SEED_KEY, SHARED_QC_DEMO_SEED_VERSION)
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SHARED_QC_DEMO_SEED_KEY, SHARED_QC_DEMO_SEED_VERSION)
    }
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    seeded: true,
    taskCount: demoTasks.length,
    factoryCount: demoFactory.length,
  }
}

export function startQcInspection(id, { entryChannel = 'miniprogram' } = {}) {
  const task = getQcById(id)
  if (!task) return { ok: false, message: '质检任务不存在' }
  if (task.qcStatus === QC_TASK_STATUS.CANCELLED) {
    return { ok: false, message: '已终止任务不可检验' }
  }
  if (task.qcStatus === QC_TASK_STATUS.COMPLETED) {
    return { ok: false, message: '任务已完成' }
  }

  if (task.bizScope === '出厂质检') {
    const records = loadFactoryRaw()
    const row = records.find((r) => r.id === id)
    if (row) {
      row.entryChannel = entryChannel
      saveFactoryRecords(records)
    }
  } else {
    const tasks = loadQcTasksRaw()
    const row = tasks.find((r) => r.id === id)
    if (row) {
      row.entryChannel = entryChannel
      row.updatedAt = formatNow()
      if (row.qcStatus === '检验中' || row.qcStatus === '检测中') {
        row.qcStatus = QC_TASK_STATUS.PENDING
      }
      saveQcTasks(tasks)
    }
  }
  return { ok: true, task: getQcById(id) }
}

function findConclusionValue(line) {
  const fields = line?.templateFields || []
  const conclusion = fields.find(
    (f) => f.isConclusion || f.code === 'QC_CONCLUSION' || f.name === '质检结果',
  )
  const values = line?.fieldValues || []
  const hit = values.find((v) => v.fieldCode === (conclusion?.code || 'QC_CONCLUSION'))
  return String(hit?.value ?? '').trim()
}

function validateDisposition(line, bizScope) {
  if (!isInboundQcBizScope(bizScope)) return { ok: true }
  const mapped = resolveLineResult(line)
  const raw = findConclusionValue(line)
  if (!needTreatment(raw, mapped)) return { ok: true }

  const base =
    Number(
      (line.fieldValues || []).find((v) => v.fieldCode === 'QC_INSPECT_QTY')?.value ??
        line.inspectQty,
    ) || 0
  const accept = Math.max(0, Number(line.acceptInboundQty) || 0)
  const ret = Math.max(0, Number(line.returnQty) || 0)
  const exch = Math.max(0, Number(line.exchangeQty) || 0)
  const sum = accept + ret + exch
  if (sum - base > 0.0001) {
    return { ok: false, message: '合格入库+退货+换货不可超过质检数量' }
  }
  if (mapped === QC_TASK_RESULT.PARTIAL && sum <= 0) {
    return { ok: false, message: '部分合格请至少填写一项处置数量（合格入库/退货/换货）' }
  }
  return { ok: true }
}

function syncReceiptAfterSubmit(task) {
  if (!task?.sourceDocId) return
  let receiptQcStatus = ''
  if (task.qcResult === QC_TASK_RESULT.PASS) receiptQcStatus = '质检通过'
  else if (task.qcResult === QC_TASK_RESULT.FAIL) receiptQcStatus = '质检不通过'
  else if (task.qcResult === QC_TASK_RESULT.PARTIAL) receiptQcStatus = '部分通过'
  if (!receiptQcStatus) return

  const patch = {
    qcStatus: receiptQcStatus,
    qcResult: task.qcResult || '',
    inspector: task.inspector || '',
    inspectedAt: task.inspectedAt || '',
  }
  if (task.qcNo) patch.qcNo = task.qcNo

  const isWx =
    task.bizScope === '外协回货检' || task.sourceType === 'outsourcing_receipt'
  const key = isWx ? 'i_doms_outsourcing_receipts' : 'i_doms_purchase_receipts'
  const field = isWx ? 'receipts' : 'receipts'
  const parsed = readStore(key)
  const list = Array.isArray(parsed?.[field]) ? parsed[field] : Array.isArray(parsed) ? parsed : null
  if (!list) return
  const row = list.find((r) => r.id === task.sourceDocId)
  if (!row) return
  Object.assign(row, patch)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    writeStore(key, { ...parsed, [field]: list })
  }
}

function buildSubmittedLines(lines, lineResults) {
  return lines.map((l, idx) => {
    const next = { ...l }
    delete next.fieldMap
    next.inspectMethod =
      (l.fieldValues || []).find((v) => v.fieldCode === 'QC_INSPECT_METHOD')?.value ||
      l.inspectMethod
    next.inspectQty = Number(
      (l.fieldValues || []).find((v) => v.fieldCode === 'QC_INSPECT_QTY')?.value ?? l.inspectQty,
    )
    next.lineQcResult = lineResults[idx]
    return next
  })
}

/**
 * 提交检验：写回 WEB 同源 storage
 */
export function submitQcInspection(id, payload = {}) {
  const current = getQcById(id)
  if (!current) return { ok: false, message: '质检任务不存在' }
  if (current.qcStatus !== QC_TASK_STATUS.PENDING) {
    return { ok: false, message: '仅待质检任务可提交' }
  }

  const lines = Array.isArray(payload.lineItems) ? payload.lineItems : []
  if (!lines.length) return { ok: false, message: '缺少质检明细' }

  for (const lineItem of lines) {
    const fields = (lineItem.templateFields || []).filter((f) => f.enabled !== false)
    const valueMap = Object.fromEntries(
      (lineItem.fieldValues || []).map((v) => [v.fieldCode, v.value]),
    )
    for (const field of fields) {
      if (field.type === 'matrix') continue
      if (field.type === 'composite' || (Array.isArray(field.children) && field.children.length)) {
        for (const child of field.children || []) {
          if (child.required === false) continue
          const val = valueMap[child.code]
          if (val === undefined || val === null || String(val).trim() === '') {
            return {
              ok: false,
              message: `请填写「${lineItem.itemName || lineItem.itemCode}」的${field.name}/${child.name}`,
            }
          }
        }
        continue
      }
      if (field.type === 'group') continue
      if (field.required === false) continue
      const val = valueMap[field.code]
      if (val === undefined || val === null || String(val).trim() === '') {
        return {
          ok: false,
          message: `请填写「${lineItem.itemName || lineItem.itemCode}」的${field.name}`,
        }
      }
    }
    const mapped = resolveLineResult(lineItem)
    if (!mapped) {
      return { ok: false, message: `请为「${lineItem.itemName || lineItem.itemCode}」选择质检结果` }
    }
    const raw = findConclusionValue(lineItem)
    if (needTreatment(raw, mapped) && !String(lineItem.treatmentPlan || '').trim()) {
      return { ok: false, message: `请为「${lineItem.itemName || lineItem.itemCode}」选择处理方案` }
    }
    const qtyCheck = validateDisposition(lineItem, current.bizScope)
    if (!qtyCheck.ok) {
      return {
        ok: false,
        message: `「${lineItem.itemName || lineItem.itemCode}」：${qtyCheck.message}`,
      }
    }
  }

  const lineResults = lines.map((l) => resolveLineResult(l))
  const qcResult = aggregateLineResults(lineResults)
  const methods = [
    ...new Set(
      lines
        .map(
          (l) =>
            (l.fieldValues || []).find((v) => v.fieldCode === 'QC_INSPECT_METHOD')?.value ||
            l.inspectMethod,
        )
        .filter(Boolean),
    ),
  ]
  const now = formatNow()
  const submittedLines = buildSubmittedLines(lines, lineResults)

  if (current.bizScope === '出厂质检') {
    const records = loadFactoryRaw()
    const row = records.find((r) => r.id === id)
    if (!row) return { ok: false, message: '质检任务不存在' }
    Object.assign(row, {
      qcStatus: QC_TASK_STATUS.COMPLETED,
      qcResult,
      lineItems: submittedLines.map((l) => ({
        ...l,
        shipQty: l.shipQty ?? l.receiptQty,
        receiptQty: l.receiptQty ?? l.shipQty,
      })),
      inspectMethod: methods.join('、') || row.inspectMethod,
      inspector: payload.inspector || '当前用户',
      inspectedAt: now,
      entryChannel: payload.entryChannel || 'miniprogram',
      remark: payload.remark != null ? payload.remark : row.remark,
    })
    saveFactoryRecords(records)
  } else {
    const tasks = loadQcTasksRaw()
    const row = tasks.find((r) => r.id === id)
    if (!row) return { ok: false, message: '质检任务不存在' }
    Object.assign(row, {
      qcStatus: QC_TASK_STATUS.COMPLETED,
      qcResult,
      lineItems: submittedLines,
      inspectMethod: methods.join('、') || row.inspectMethod,
      inspector: payload.inspector || '当前用户',
      inspectedAt: now,
      entryChannel: payload.entryChannel || 'miniprogram',
      remark: payload.remark != null ? payload.remark : row.remark,
      updatedAt: now,
    })
    saveQcTasks(tasks)
    syncReceiptAfterSubmit(hydrateTask(row))
  }

  return {
    ok: true,
    message: `质检完成：${qcResult}`,
    qcResult,
    task: getQcById(id),
  }
}
