import {
  getEbomByKey,
  initEbomExecutionState,
  calcDisassemblyStats,
  flattenLeafNodes,
  initQcDisplayState,
} from '@/mock/disassemblyEbom'

const STORAGE_KEY = 'i_doms_mobile_disassembly_tasks'
const DRAFT_KEY = 'i_doms_mobile_disassembly_drafts'
const RESULT_KEY = 'i_doms_disassembly_results'
const SYNC_KEY = 'i_doms_disassembly_pc_sync'
const INBOUND_KEY = 'i_doms_disassembly_inbound'
const SCRAP_MGMT_KEY = 'i_doms_disassembly_scrap_mgmt'
const WO_STATUS_KEY = 'i_doms_disassembly_wo_status'

export const warehouseOptions = ['半成品仓', '成品仓', '原料仓', '报废品仓']

/** 任务状态 */
export const taskStatusOptions = ['待分发', '待开始', '执行中', '已完成']

/** 拆解工艺路线工序（一张工单拆成多条任务） */
const DISASSEMBLY_PROCESSES = ['拆解', '拆解质检', '入库']

const seedTasks = [
  // 工单1：一批一码 — 拆解待分发
  taskSeed({
    id: 'dt-001',
    workOrderId: 'dwo-m-1',
    workOrderCode: 'CJGD20260602001',
    workOrderName: '测试质检一批一码拆解001',
    taskNo: 'T20260602001',
    processName: '拆解',
    processSeq: 1,
    productName: '测试质检一批一码',
    itemCode: 'CP-QC-BATCH-01',
    specModel: '一批一码',
    barcodeType: '一批一码',
    processRoute: '拆解标准路线',
    executor: 'admin',
    groupName: '加工小组',
    expectedQty: 5,
    taskStatus: '待分发',
    ebomKey: 'ebom-batch-qc',
    createdAt: '2026-06-02 09:00:00',
  }),
  // 工单2：一类一码 — 拆解待开始
  taskSeed({
    id: 'dt-002',
    workOrderId: 'dwo-m-2',
    workOrderCode: 'CJGD20260602002',
    workOrderName: '清水离心泵拆解001',
    taskNo: 'T20260602002',
    processName: '拆解',
    processSeq: 1,
    productName: '清水离心泵',
    itemCode: 'CP2610001',
    specModel: '一类一码',
    barcodeType: '一类一码',
    processRoute: '机加标准路线',
    executor: '张三',
    groupName: '机加小组',
    expectedQty: 1,
    taskStatus: '待开始',
    ebomKey: 'ebom-centrifugal',
    createdAt: '2026-06-02 10:30:00',
  }),
  // 工单3：一物一码 — 拆解执行中
  taskSeed({
    id: 'dt-003',
    workOrderId: 'dwo-m-3',
    workOrderCode: 'CJGD20260602003',
    workOrderName: '污水泵拆解001',
    taskNo: 'T20260602003',
    processName: '拆解',
    processSeq: 1,
    productName: '污水泵',
    itemCode: 'CP2610002',
    specModel: 'ISG80-160(I)A',
    barcodeType: '一物一码',
    serialNo: 'SN-WB-20260602001',
    processRoute: '装配标准路线',
    executor: '孙琴丽',
    groupName: '总装小组',
    expectedQty: 1,
    taskStatus: '执行中',
    ebomKey: 'ebom-sewage-pump',
    createdAt: '2026-06-02 11:00:00',
    startedAt: '2026-06-02 14:00:00',
  }),
  // 工单3 — 拆解质检执行中
  taskSeed({
    id: 'dt-004',
    workOrderId: 'dwo-m-3',
    workOrderCode: 'CJGD20260602003',
    workOrderName: '污水泵拆解001',
    taskNo: 'T20260602004',
    processName: '拆解质检',
    processSeq: 2,
    productName: '污水泵',
    itemCode: 'CP2610002',
    specModel: 'ISG80-160(I)A',
    barcodeType: '一物一码',
    serialNo: 'SN-WB-20260602001',
    processRoute: '装配标准路线',
    executor: '李质检',
    groupName: '质检小组',
    expectedQty: 1,
    taskStatus: '执行中',
    ebomKey: 'ebom-sewage-pump',
    createdAt: '2026-06-02 15:00:00',
  }),
  // 工单3 — 拆解质检待开始（便于测试）
  taskSeed({
    id: 'dt-008',
    workOrderId: 'dwo-m-3',
    workOrderCode: 'CJGD20260602003',
    workOrderName: '污水泵拆解001',
    taskNo: 'T20260602008',
    processName: '拆解质检',
    processSeq: 2,
    productName: '污水泵',
    itemCode: 'CP2610002',
    specModel: 'ISG80-160(I)A',
    barcodeType: '一物一码',
    serialNo: 'SN-WB-20260602001',
    processRoute: '装配标准路线',
    executor: '李质检',
    groupName: '质检小组',
    expectedQty: 1,
    taskStatus: '待开始',
    ebomKey: 'ebom-sewage-pump',
    createdAt: '2026-06-03 09:00:00',
  }),
  // 工单4 — 入库已完成
  taskSeed({
    id: 'dt-005',
    workOrderId: 'dwo-m-4',
    workOrderCode: 'CJGD20260601005',
    workOrderName: '立式多级泵拆解001',
    taskNo: 'T20260601005',
    processName: '入库',
    processSeq: 3,
    productName: '立式多级泵',
    itemCode: 'CP2610003',
    specModel: 'CDL4-40',
    barcodeType: '一批一码',
    processRoute: '装配标准路线',
    executor: '李四',
    groupName: '装配小组',
    expectedQty: 1,
    taskStatus: '已完成',
    ebomKey: 'ebom-multi-stage',
    createdAt: '2026-06-01 08:00:00',
    finishedAt: '2026-06-01 17:30:00',
  }),
  // 工单4 — 拆解已完成（历史）
  taskSeed({
    id: 'dt-006',
    workOrderId: 'dwo-m-4',
    workOrderCode: 'CJGD20260601005',
    workOrderName: '立式多级泵拆解001',
    taskNo: 'T20260601006',
    processName: '拆解',
    processSeq: 1,
    productName: '立式多级泵',
    itemCode: 'CP2610003',
    specModel: 'CDL4-40',
    barcodeType: '一批一码',
    processRoute: '装配标准路线',
    executor: '李四',
    groupName: '装配小组',
    expectedQty: 1,
    taskStatus: '已完成',
    ebomKey: 'ebom-multi-stage',
    createdAt: '2026-06-01 08:00:00',
    finishedAt: '2026-06-01 12:00:00',
  }),
  // 工单5 — 深井泵拆解待开始
  taskSeed({
    id: 'dt-007',
    workOrderId: 'dwo-m-5',
    workOrderCode: 'CJGD20260603007',
    workOrderName: '深井潜水泵拆解001',
    taskNo: 'T20260603007',
    processName: '拆解',
    processSeq: 1,
    productName: '深井潜水泵',
    itemCode: 'CP2610004',
    specModel: 'QJ200-50/4',
    barcodeType: '一类一码',
    processRoute: '装配标准路线',
    executor: 'admin',
    groupName: '加工小组',
    expectedQty: 2,
    taskStatus: '待开始',
    ebomKey: 'ebom-sewage-pump',
    createdAt: '2026-06-03 08:30:00',
  }),
]

function taskSeed(partial) {
  return {
    orderCategory: '拆解工单',
    orderSource: '生产报废',
    workOrderRemark: '',
    nextProcess: getNextProcess(partial.processName),
    laborCalcMethod: '时长报工+计时工资',
    ...partial,
  }
}

function getNextProcess(current) {
  const idx = DISASSEMBLY_PROCESSES.indexOf(current)
  if (idx < 0 || idx >= DISASSEMBLY_PROCESSES.length - 1) return ''
  return DISASSEMBLY_PROCESSES[idx + 1]
}

function load() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(seedTasks))
}

let cache = load()

function save() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(cache))
}

function loadDrafts() {
  try {
    const raw = uni.getStorageSync(DRAFT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function saveDrafts(drafts) {
  uni.setStorageSync(DRAFT_KEY, JSON.stringify(drafts))
}

function loadResults() {
  try {
    const raw = uni.getStorageSync(RESULT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function saveResults(results) {
  uni.setStorageSync(RESULT_KEY, JSON.stringify(results))
}

function loadJson(key, fallback = []) {
  try {
    const raw = uni.getStorageSync(key)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return fallback
}

function saveJson(key, data) {
  uni.setStorageSync(key, JSON.stringify(data))
}

export function getDisassemblyResult(workOrderId) {
  const results = loadResults()
  if (results[workOrderId]) return results[workOrderId]
  return buildSeedDisassemblyResult(workOrderId)
}

function buildSeedDisassemblyResult(workOrderId) {
  if (workOrderId !== 'dwo-m-3') return null
  const raw = getEbomByKey('ebom-sewage-pump')
  const nodes = initEbomExecutionState(raw)
  const pumpBody = nodes[0]
  pumpBody.expanded = true
  pumpBody.disposeMode = 'partial'
  pumpBody.children[0].expanded = true
  const casting = pumpBody.children[0].children[0]
  casting.reuseQty = 1
  casting.scrapQty = 0
  casting.disposeMode = 'all_reuse'
  const flange = pumpBody.children[0].children[1]
  flange.reuseQty = 1
  flange.scrapQty = 1
  flange.disposeMode = 'partial'
  flange.scrapReason = '加工损坏'
  flange.processResult = '直接弃用'
  const pumpHead = nodes[1]
  pumpHead.expanded = false
  pumpHead.disposeMode = 'all_reuse'
  return {
    workOrderId,
    ebomNodes: nodes,
    stats: calcDisassemblyStats(nodes),
    disassemblyExecutor: '孙琴丽',
    completedAt: '2026-06-02 16:30:00',
  }
}

export function saveDisassemblyResult(workOrderId, payload) {
  const results = loadResults()
  results[workOrderId] = payload
  saveResults(results)
  syncToPcMaterials(workOrderId, payload)
}

function syncToPcMaterials(workOrderId, payload) {
  const sync = loadJson(SYNC_KEY, {})
  const materials = flattenLeafNodes(payload.ebomNodes || []).map((n, i) => ({
    id: `dm-sync-${workOrderId}-${i}`,
    materialName: n.materialName,
    materialCode: n.materialCode,
    specModel: '—',
    qty: n.unitQty,
    reuseQty: n.reuseQty,
    scrapQty: n.scrapQty,
    scrapReason: n.scrapReason,
    processResult: n.processResult || '',
    unit: n.unit || '件',
    disposeMode: n.disposeMode,
  }))
  sync[workOrderId] = {
    materials,
    stats: payload.stats,
    syncedAt: new Date().toISOString(),
  }
  saveJson(SYNC_KEY, sync)
}

export function getTasksByWorkOrder(workOrderId) {
  return cache.filter((t) => t.workOrderId === workOrderId)
}

export function getWorkOrderProgress(workOrderId) {
  const statusMap = loadJson(WO_STATUS_KEY, {})
  return statusMap[workOrderId] || '执行中'
}

function setWorkOrderProgress(workOrderId, progress) {
  const statusMap = loadJson(WO_STATUS_KEY, {})
  statusMap[workOrderId] = progress
  saveJson(WO_STATUS_KEY, statusMap)
}

/** 质检执行页数据 */
export function getQcExecutionState(taskId) {
  const task = getTaskById(taskId)
  if (!task || task.processName !== '拆解质检') return null
  const result = getDisassemblyResult(task.workOrderId)
  if (!result) {
    return { task, result: null, ebomNodes: [], stats: { dismantled: 0, reuse: 0, scrap: 0 } }
  }
  const ebomNodes = initQcDisplayState(result.ebomNodes)
  return {
    task,
    result,
    ebomNodes,
    stats: calcDisassemblyStats(ebomNodes),
    disassemblyExecutor: result.disassemblyExecutor || '—',
  }
}

function validateWarehouseBeforePass(ebomNodes, reuseWarehouse, scrapWarehouse) {
  const leaves = flattenLeafNodes(ebomNodes)
  const hasReuse = leaves.some((n) => n.reuseQty > 0)
  const needScrapWarehouse = leaves.some(
    (n) => n.scrapQty > 0 && n.processResult === '财务变现',
  )
  if (hasReuse && !reuseWarehouse) {
    return { ok: false, message: '请先填写目标仓库，再执行操作。' }
  }
  if (needScrapWarehouse && !scrapWarehouse) {
    return { ok: false, message: '请先填写目标仓库，再执行操作。' }
  }
  return { ok: true }
}

export function validateQcWarehouse(ebomNodes, reuseWarehouse, scrapWarehouse) {
  return validateWarehouseBeforePass(ebomNodes, reuseWarehouse, scrapWarehouse)
}

export function passQcInspection(taskId, payload) {
  const task = getTaskById(taskId)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.processName !== '拆解质检') {
    return { ok: false, message: '仅拆解质检任务可通过' }
  }

  const ebomNodes = payload.ebomNodes || []
  const check = validateWarehouseBeforePass(
    ebomNodes,
    payload.reuseWarehouse,
    payload.scrapWarehouse,
  )
  if (!check.ok) return check

  const stats = calcDisassemblyStats(ebomNodes)
  task.taskStatus = '已完成'
  task.finishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  task.qcResult = {
    passed: true,
    reuseWarehouse: payload.reuseWarehouse,
    scrapWarehouse: payload.scrapWarehouse,
    stats,
  }
  save()

  setWorkOrderProgress(task.workOrderId, '已完成')
  saveDisassemblyResult(task.workOrderId, {
    ...getDisassemblyResult(task.workOrderId),
    ebomNodes,
    stats,
    qcPassedAt: task.finishedAt,
  })

  createInboundRecords(task, ebomNodes, payload.reuseWarehouse)
  createScrapRecords(task, ebomNodes)

  const inboundTask = cache.find(
    (t) => t.workOrderId === task.workOrderId && t.processName === '入库' && t.taskStatus !== '已完成',
  )
  if (inboundTask) {
    inboundTask.taskStatus = '待开始'
  }
  save()

  return { ok: true, message: '质检通过' }
}

function createInboundRecords(task, ebomNodes, warehouse) {
  const list = loadJson(INBOUND_KEY, [])
  const leaves = flattenLeafNodes(ebomNodes).filter((n) => n.reuseQty > 0)
  leaves.forEach((n, i) => {
    list.unshift({
      id: `in-${task.workOrderId}-${Date.now()}-${i}`,
      workOrderCode: task.workOrderCode,
      materialName: n.materialName,
      materialCode: n.materialCode,
      qty: n.reuseQty,
      warehouse: warehouse || '半成品仓',
      status: '待处理',
      type: '拆解回用',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
  })
  saveJson(INBOUND_KEY, list)
}

function createScrapRecords(task, ebomNodes) {
  const list = loadJson(SCRAP_MGMT_KEY, [])
  const leaves = flattenLeafNodes(ebomNodes).filter((n) => n.scrapQty > 0)
  leaves.forEach((n, i) => {
    list.unshift({
      id: `sc-${task.workOrderId}-${Date.now()}-${i}`,
      workOrderCode: task.workOrderCode,
      materialName: n.materialName,
      materialCode: n.materialCode,
      scrapQty: n.scrapQty,
      scrapReason: n.scrapReason,
      processResult: n.processResult || '直接弃用',
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
  })
  saveJson(SCRAP_MGMT_KEY, list)
}

export function rejectQcInspection(taskId) {
  const task = getTaskById(taskId)
  if (!task) return { ok: false, message: '任务不存在' }

  task.taskStatus = '已完成'
  task.finishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  task.qcResult = { passed: false, rejected: true }
  save()

  const disassemblyTask = cache.find(
    (t) => t.workOrderId === task.workOrderId && t.processName === '拆解',
  )
  const executor = disassemblyTask?.executor || 'admin'
  const reworkTask = taskSeed({
    id: `dt-rework-${Date.now()}`,
    workOrderId: task.workOrderId,
    workOrderCode: task.workOrderCode,
    workOrderName: `${task.productName}拆解返工`,
    taskNo: `T${Date.now()}`,
    processName: '拆解',
    processSeq: 1,
    productName: task.productName,
    itemCode: task.itemCode,
    specModel: task.specModel,
    barcodeType: task.barcodeType,
    serialNo: task.serialNo,
    processRoute: task.processRoute,
    executor,
    groupName: disassemblyTask?.groupName || '加工小组',
    expectedQty: task.expectedQty,
    taskStatus: '待开始',
    ebomKey: task.ebomKey,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    isRework: true,
  })
  cache.unshift(reworkTask)
  save()

  return { ok: true, message: '已驳回，已生成拆解返工任务' }
}

export function getTaskList(tab = 'todo') {
  if (tab === 'history') {
    return cache.filter((t) => t.taskStatus === '已完成')
  }
  return cache.filter((t) => t.taskStatus !== '已完成')
}

export function getTaskById(id) {
  return cache.find((t) => t.id === id) || null
}

export function getPendingTaskCount() {
  return cache.filter((t) => ['待分发', '待开始', '执行中'].includes(t.taskStatus)).length
}

/** 获取或初始化执行态 EBOM */
export function getTaskExecutionState(taskId) {
  const task = getTaskById(taskId)
  if (!task) return null
  const drafts = loadDrafts()
  if (drafts[taskId]?.ebomNodes) {
    return { task, ebomNodes: drafts[taskId].ebomNodes }
  }
  const raw = getEbomByKey(task.ebomKey)
  const ebomNodes = initEbomExecutionState(raw)
  return { task, ebomNodes }
}

export function saveTaskDraft(taskId, ebomNodes) {
  const drafts = loadDrafts()
  drafts[taskId] = { ebomNodes, savedAt: new Date().toISOString() }
  saveDrafts(drafts)
  const task = getTaskById(taskId)
  if (task && task.taskStatus === '待开始') {
    task.taskStatus = '执行中'
    task.startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    save()
  }
  return { ok: true, message: '已暂存' }
}

export function startTask(taskId) {
  const task = getTaskById(taskId)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.taskStatus === '待分发') {
    return { ok: false, message: '请先完成分发' }
  }
  if (task.taskStatus === '已完成') {
    return { ok: false, message: '任务已完成' }
  }
  if (task.taskStatus === '待开始') {
    task.taskStatus = '执行中'
    task.startedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
    save()
  }
  return { ok: true, task }
}

export function completeDisassemblyTask(taskId, payload) {
  const task = getTaskById(taskId)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.processName !== '拆解') {
    return { ok: false, message: '当前仅支持拆解工序完工' }
  }

  const ebomNodes = payload.ebomNodes || []
  for (const n of flattenNodes(ebomNodes)) {
    if (n.reuseQty + n.scrapQty !== n.unitQty) {
      return { ok: false, message: `「${n.materialName}」回用与报废数量之和须等于可拆数量` }
    }
  }

  if (!payload.workDuration && payload.workDuration !== 0) {
    return { ok: false, message: '请填写本次报工时长' }
  }

  const stats = calcDisassemblyStats(ebomNodes)
  task.taskStatus = '已完成'
  task.finishedAt = payload.endTime || new Date().toISOString().slice(0, 19).replace('T', ' ')
  task.completion = {
    reuseQty: stats.reuse,
    scrapQty: stats.scrap,
    workDuration: payload.workDuration,
    startTime: payload.startTime,
    endTime: payload.endTime,
    remark: payload.remark || '',
  }
  save()

  const disassemblyTask = cache.find(
    (t) => t.workOrderId === task.workOrderId && t.processName === '拆解',
  )
  saveDisassemblyResult(task.workOrderId, {
    workOrderId: task.workOrderId,
    ebomNodes,
    stats,
    disassemblyExecutor: task.executor,
    completedAt: task.finishedAt,
  })

  const qcTask = cache.find(
    (t) =>
      t.workOrderId === task.workOrderId &&
      t.processName === '拆解质检' &&
      t.taskStatus !== '已完成',
  )
  if (qcTask && qcTask.taskStatus === '待分发') {
    /* 拆解完成后质检任务仍待分发时不自动推进 */
  } else if (qcTask && qcTask.taskStatus !== '已完成') {
    qcTask.taskStatus = '待开始'
  }
  save()

  const drafts = loadDrafts()
  delete drafts[taskId]
  saveDrafts(drafts)

  return {
    ok: true,
    message: '拆解完工',
    stats,
    nextProcess: task.nextProcess,
  }
}

function flattenNodes(nodes, out = []) {
  return flattenLeafNodes(nodes, out)
}

export { DISASSEMBLY_PROCESSES }
