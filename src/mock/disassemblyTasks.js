import {
  getEbomByKey,
  initEbomExecutionState,
  calcDisassemblyStats,
  flattenLeafNodes,
  initQcDisplayState,
} from '@/mock/disassemblyEbom'
import { generateLinesFromSyncedTasks } from '@/mock/reportConfirmStore'

const STORAGE_KEY = 'i_doms_mobile_disassembly_tasks'
const DRAFT_KEY = 'i_doms_mobile_disassembly_drafts'
const RESULT_KEY = 'i_doms_disassembly_results'
const SYNC_KEY = 'i_doms_disassembly_pc_sync'
const MOBILE_TASK_SYNC_KEY = 'i_doms_mobile_tasks_sync'
const INBOUND_KEY = 'i_doms_disassembly_inbound'
const SCRAP_MGMT_KEY = 'i_doms_disassembly_scrap_mgmt'
const WO_STATUS_KEY = 'i_doms_disassembly_wo_status'

export const warehouseOptions = ['半成品仓', '成品仓', '原料仓', '报废品仓']

/** 任务状态 */
export const taskStatusOptions = ['待领取', '待分发', '待开始', '执行中', '已完成']

/** 拆解工艺路线工序（一张工单拆成多条任务） */
const DISASSEMBLY_PROCESSES = ['拆解', '拆解质检', '入库']

function formatTaskDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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
  // —— 生产工单任务（工序报工） ——
  taskSeed({
    id: 'pt-001',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-1',
    workOrderCode: 'WO-062',
    workOrderName: '货架支架生产工单',
    taskNo: 'T20260602011',
    processName: '点焊',
    processSeq: 1,
    productName: '货架支架',
    itemCode: 'SJ-2024-A',
    specModel: '1200×600mm',
    barcodeType: '一批一码',
    processRoute: '标准焊接工艺 v2',
    executor: '张三',
    groupName: '焊接小组',
    expectedQty: 25,
    taskStatus: '待开始',
    placement: 'todo',
    serialLocked: false,
    createdAt: `${formatTaskDate()} 08:00:00`,
  }),
  taskSeed({
    id: 'pt-002',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-1',
    workOrderCode: 'WO-062',
    workOrderName: '货架支架生产工单',
    taskNo: 'T20260602012',
    processName: '打磨',
    processSeq: 2,
    productName: '货架支架',
    itemCode: 'SJ-2024-A',
    specModel: '1200×600mm',
    barcodeType: '一批一码',
    processRoute: '标准焊接工艺 v2',
    executor: '张三',
    groupName: '焊接小组',
    expectedQty: 25,
    taskStatus: '待开始',
    placement: 'todo',
    serialLocked: false,
    createdAt: `${formatTaskDate()} 08:00:00`,
  }),
  taskSeed({
    id: 'pt-003',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-1',
    workOrderCode: 'WO-062',
    workOrderName: '货架支架生产工单',
    taskNo: 'T20260602013',
    processName: '装配',
    processSeq: 3,
    productName: '货架支架',
    itemCode: 'SJ-2024-A',
    specModel: '1200×600mm',
    barcodeType: '一批一码',
    processRoute: '标准焊接工艺 v2',
    executor: '张三',
    groupName: '加工小组',
    expectedQty: 25,
    taskStatus: '待开始',
    placement: 'todo',
    serialLocked: true,
    createdAt: `${formatTaskDate()} 08:00:00`,
  }),
  taskSeed({
    id: 'pt-004',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-2',
    workOrderCode: 'WO-058',
    workOrderName: '泵轴生产工单',
    taskNo: 'T20260602014',
    processName: '车削',
    processSeq: 1,
    productName: '泵轴',
    itemCode: 'BX-2024-03',
    specModel: 'Φ50×L800 45#',
    barcodeType: '一批一码',
    processRoute: '车铣加工路线',
    executor: '张三',
    groupName: '加工小组',
    expectedQty: 15,
    taskStatus: '执行中',
    placement: 'todo',
    serialLocked: false,
    reportStatus: '待审核',
    reportedGoodQty: 14,
    reportedDefectQty: 1,
    createdAt: `${formatTaskDate()} 09:00:00`,
  }),
  taskSeed({
    id: 'pt-005',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-2',
    workOrderCode: 'WO-058',
    workOrderName: '泵轴生产工单',
    taskNo: 'T20260602015',
    processName: '铣削',
    processSeq: 2,
    productName: '泵轴',
    itemCode: 'BX-2024-03',
    specModel: 'Φ50×L800 45#',
    barcodeType: '一批一码',
    processRoute: '车铣加工路线',
    executor: '张三',
    groupName: '加工小组',
    expectedQty: 15,
    taskStatus: '待开始',
    placement: 'todo',
    serialLocked: false,
    createdAt: `${formatTaskDate()} 09:00:00`,
  }),
  taskSeed({
    id: 'pt-006',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-3',
    workOrderCode: 'WO-055',
    workOrderName: '泵壳生产工单',
    taskNo: 'T20260602016',
    processName: '热处理',
    processSeq: 1,
    productName: '泵壳',
    itemCode: 'BK-2024-01',
    specModel: 'HT200 铸铁',
    barcodeType: '一批一码',
    processRoute: '铸造加工路线',
    executor: '张三',
    groupName: '加工小组',
    expectedQty: 12,
    taskStatus: '待开始',
    placement: 'todo',
    serialLocked: false,
    createdAt: `${formatTaskDate()} 10:00:00`,
  }),
  // —— 多人执行 · 待领取（工序报工） ——
  taskSeed({
    id: 'pt-claim-1',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-4',
    workOrderCode: 'WO-071',
    workOrderName: '法兰盘生产工单',
    taskNo: 'T20260602021',
    processName: '点焊',
    processSeq: 1,
    productName: '法兰盘',
    itemCode: 'FL-2024-C',
    specModel: 'DN150 PN16',
    barcodeType: '一批一码',
    processRoute: '标准焊接工艺 v2',
    executor: '',
    executors: ['张三', '王五'],
    claimTargets: ['张三', '王五'],
    groupName: '焊接小组',
    expectedQty: 20,
    taskStatus: '待领取',
    placement: 'claim',
    resourceType: '工人',
    serialLocked: false,
    createdAt: `${formatTaskDate()} 07:30:00`,
  }),
  taskSeed({
    id: 'pt-claim-2',
    orderCategory: '生产工单',
    workOrderId: 'wo-pr-5',
    workOrderCode: 'WO-068',
    workOrderName: '深井潜水泵生产工单',
    taskNo: 'T20260602022',
    processName: '精车',
    processSeq: 2,
    productName: '深井潜水泵',
    itemCode: 'CP2610004',
    specModel: 'QJ200-50/4',
    barcodeType: '一批一码',
    processRoute: '机加标准路线',
    executor: '',
    executors: ['李四', '赵六'],
    claimTargets: ['李四', '赵六'],
    groupName: '机加小组',
    expectedQty: 8,
    taskStatus: '待领取',
    placement: 'claim',
    resourceType: '工人',
    serialLocked: false,
    createdAt: `${formatTaskDate()} 08:15:00`,
  }),
  taskSeed({
    id: 'pt-claim-3',
    orderCategory: '总装工单',
    workOrderId: 'wo-asm-1',
    workOrderCode: 'WO-ZZ-012',
    workOrderName: '污水泵总装工单',
    taskNo: 'T20260602023',
    processName: '总装',
    processSeq: 1,
    productName: '污水泵',
    itemCode: 'CP2610002',
    specModel: 'ISG80-160(I)A',
    barcodeType: '一批一码',
    processRoute: '装配标准路线',
    executor: '',
    executors: ['张三', '李四'],
    claimTargets: ['张三', '李四'],
    groupName: '总装小组',
    expectedQty: 6,
    taskStatus: '待领取',
    placement: 'claim',
    resourceType: '工人',
    serialLocked: false,
    createdAt: `${formatTaskDate()} 08:45:00`,
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
    resourceType: partial.resourceType || '工人',
    placement: partial.placement || 'todo',
    serialLocked: partial.serialLocked ?? false,
    claimTargets: partial.claimTargets || [],
    groupLeader: partial.groupLeader || '',
    leaderParticipates: partial.leaderParticipates ?? true,
    groupWorkers: partial.groupWorkers || [],
    executors: partial.executors || [],
    ...partial,
  }
}

function getNextProcess(current) {
  const idx = DISASSEMBLY_PROCESSES.indexOf(current)
  if (idx < 0 || idx >= DISASSEMBLY_PROCESSES.length - 1) return ''
  return DISASSEMBLY_PROCESSES[idx + 1]
}

const TASK_SEED_VERSION_KEY = 'i_doms_mobile_tasks_seed_v'
const TASK_SEED_VERSION = '5'

function buildSeedTasks() {
  const today = formatTaskDate()
  const fresh = JSON.parse(JSON.stringify(seedTasks))
  fresh.forEach((t) => {
    if (typeof t.id === 'string' && (t.id.startsWith('pt-') || t.id.startsWith('pt-claim-')) && t.createdAt) {
      const timePart = t.createdAt.split(' ').slice(1).join(' ') || '08:00:00'
      t.createdAt = `${today} ${timePart}`
    }
  })
  return fresh
}

function load() {
  if (uni.getStorageSync(TASK_SEED_VERSION_KEY) !== TASK_SEED_VERSION) {
    const fresh = buildSeedTasks()
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(fresh))
    uni.setStorageSync(TASK_SEED_VERSION_KEY, TASK_SEED_VERSION)
    return fresh
  }
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

  unlockNextSerialTask(task.workOrderId, task.processSeq)
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

function readPcSyncQueue() {
  const queues = []
  try {
    const rawUni = uni.getStorageSync(MOBILE_TASK_SYNC_KEY)
    if (rawUni) queues.push(typeof rawUni === 'string' ? JSON.parse(rawUni) : rawUni)
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const rawWeb = localStorage.getItem(MOBILE_TASK_SYNC_KEY)
      if (rawWeb) queues.push(JSON.parse(rawWeb))
    }
  } catch {
    /* ignore */
  }
  return queues.flat()
}

export function mergePcSyncedTasks() {
  const synced = readPcSyncQueue()
  if (!synced.length) return 0
  let merged = 0
  const newTasks = []
  for (const task of synced) {
    if (!task?.id) continue
    const idx = cache.findIndex((t) => t.id === task.id)
    const normalized = taskSeed(task)
    if (idx >= 0) {
      cache[idx] = { ...cache[idx], ...normalized }
    } else {
      cache.unshift(normalized)
      newTasks.push(normalized)
      merged += 1
    }
  }
  if (merged) {
    save()
    generateLinesFromSyncedTasks(newTasks)
  }
  return merged
}

function visibleTasks() {
  return cache.filter((t) => !t.serialLocked)
}

export function getTaskList(tab = 'todo') {
  mergePcSyncedTasks()
  const list = visibleTasks()
  if (tab === 'history') {
    return list.filter((t) => t.taskStatus === '已完成')
  }
  if (tab === 'claim') {
    return list.filter((t) => t.placement === 'claim' && t.taskStatus !== '已完成')
  }
  return list.filter((t) => t.taskStatus !== '已完成' && t.placement !== 'claim')
}

export function claimTask(taskId, userName = 'admin') {
  const task = getTaskById(taskId)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.placement !== 'claim') return { ok: false, message: '该任务不在待领列表' }
  if (task.claimedBy) return { ok: false, message: '任务已被领取' }
  const targets = task.claimTargets?.length ? task.claimTargets : task.executors
  if (targets?.length && !targets.includes(userName)) {
    return { ok: false, message: '您不在该任务的领取范围内' }
  }
  task.placement = 'todo'
  task.claimedBy = userName
  task.claimedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  if (task.resourceType === '工人小组') {
    task.groupLeader = userName
    task.executor = userName
    task.taskStatus = '待分发'
  } else {
    task.executor = userName
    task.taskStatus = '待开始'
  }
  save()
  return { ok: true, task }
}

export function getDistributableWorkers(task) {
  const workers = task.groupWorkers || []
  if (task.leaderParticipates) return workers
  return workers.filter((w) => !w.isLeader)
}

export function distributeTask(taskId, executorName) {
  const task = getTaskById(taskId)
  if (!task) return { ok: false, message: '任务不存在' }
  if (task.taskStatus !== '待分发') return { ok: false, message: '当前任务不可分发' }
  const allowed = getDistributableWorkers(task).map((w) => w.name)
  if (!allowed.includes(executorName)) {
    return { ok: false, message: '所选执行人不在可分发范围内' }
  }
  task.executor = executorName
  task.taskStatus = '待开始'
  task.distributedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  save()
  return { ok: true, task }
}

function unlockNextSerialTask(workOrderId, completedProcessSeq) {
  const next = cache.find(
    (t) =>
      t.workOrderId === workOrderId &&
      t.processSeq === completedProcessSeq + 1 &&
      t.serialLocked,
  )
  if (!next) return null
  next.serialLocked = false
  save()
  return next
}

export function getTaskById(id) {
  mergePcSyncedTasks()
  return cache.find((t) => t.id === id) || null
}

export function getAllTasks() {
  mergePcSyncedTasks()
  return [...cache]
}

export function updateTaskById(id, patch) {
  const task = cache.find((t) => t.id === id)
  if (!task) return null
  Object.assign(task, patch)
  save()
  return task
}

export function getPendingTaskCount() {
  mergePcSyncedTasks()
  return visibleTasks().filter(
    (t) => t.taskStatus !== '已完成' && ['todo', 'claim'].includes(t.placement || 'todo'),
  ).length
}

export function getClaimTaskCount() {
  mergePcSyncedTasks()
  return getTaskList('claim').length
}

/** 获取或初始化执行态 EBOM */
export function getTaskExecutionState(taskId) {
  const task = getTaskById(taskId)
  if (!task) return null
  const drafts = loadDrafts()
  if (drafts[taskId]?.ebomNodes) {
    return {
      task,
      ebomNodes: drafts[taskId].ebomNodes,
      reuseWarehouse: drafts[taskId].reuseWarehouse || '',
      scrapWarehouse: drafts[taskId].scrapWarehouse || '',
    }
  }
  const raw = getEbomByKey(task.ebomKey)
  const ebomNodes = initEbomExecutionState(raw)
  return { task, ebomNodes, reuseWarehouse: '', scrapWarehouse: '' }
}

export function validateDisassemblyWarehouse(ebomNodes, reuseWarehouse, scrapWarehouse) {
  const stats = calcDisassemblyStats(ebomNodes)
  if (stats.reuse > 0 && !reuseWarehouse) {
    return { ok: false, message: '有回用物品时请填写回用仓库' }
  }
  if (stats.scrap > 0 && !scrapWarehouse) {
    return { ok: false, message: '有报废物品时请填写报废仓库' }
  }
  return { ok: true }
}

export function saveTaskDraft(taskId, payload) {
  const ebomNodes = Array.isArray(payload) ? payload : payload.ebomNodes
  const drafts = loadDrafts()
  drafts[taskId] = {
    ebomNodes,
    reuseWarehouse: payload.reuseWarehouse || '',
    scrapWarehouse: payload.scrapWarehouse || '',
    savedAt: new Date().toISOString(),
  }
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

  const whCheck = validateDisassemblyWarehouse(
    ebomNodes,
    payload.reuseWarehouse,
    payload.scrapWarehouse,
  )
  if (!whCheck.ok) return whCheck

  const stats = calcDisassemblyStats(ebomNodes)
  task.taskStatus = '已完成'
  task.finishedAt = payload.endTime || new Date().toISOString().slice(0, 19).replace('T', ' ')
  task.completion = {
    reuseQty: stats.reuse,
    scrapQty: stats.scrap,
    reuseWarehouse: payload.reuseWarehouse || '',
    scrapWarehouse: payload.scrapWarehouse || '',
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
    reuseWarehouse: payload.reuseWarehouse || '',
    scrapWarehouse: payload.scrapWarehouse || '',
    disassemblyExecutor: task.executor,
    completedAt: task.finishedAt,
  })

  unlockNextSerialTask(task.workOrderId, task.processSeq)
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
