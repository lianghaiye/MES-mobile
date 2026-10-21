import {
  getWorkOrderById,
  loadAllWorkOrders,
  withDefaultProcesses,
} from '@/mock/workOrderBridge'
import { appendReworkMobileTasks } from '@/mock/disassemblyTasks'

const STORAGE_KEY = 'i_doms_rework_orders'
const SEED_VERSION_KEY = 'i_doms_rework_orders_seed_v'
const SEED_VERSION = '1'

export const REWORK_ORDER_STATUS = {
  PENDING: '待返工',
  IN_PROGRESS: '返工中',
  DONE: '已完成',
  CLOSED: '已关闭',
}

export const REWORK_ORDER_SOURCE = {
  PROCESS_QC: '过程检',
  FINISHED_QC: '成品检',
  WORKSHOP_WEB: '车间Web',
  WORKSHOP_MOBILE: '车间小程序',
}

const OPEN_WO_STATUSES = new Set(['执行中', '已完成', '完成', '返工中'])
const REWORKABLE_CATEGORIES = new Set(['生产工单', '总装工单'])

function nowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function seedReworkOrders() {
  return [
    {
      id: 'rw-demo-1',
      reworkNo: 'FG20261021001',
      status: REWORK_ORDER_STATUS.PENDING,
      source: REWORK_ORDER_SOURCE.PROCESS_QC,
      workOrderId: 'wo-rework-mock-1',
      workOrderNo: 'WO-RW-001',
      workOrderCategory: '生产工单',
      productName: '潜水电泵 QJ200-40/3',
      productCode: 'CP2610004',
      specModel: 'QJ200-40/3',
      material: 'HT200',
      drawingNo: 'DWG-QJ200',
      workCenter: '机加车间',
      processRouteName: '机加标准路线',
      scheduleQty: 20,
      planQty: 20,
      qty: 2,
      reason: '尺寸超差',
      remark: '过程检判定超差，指定张三返工',
      creator: '质检员',
      createdAt: '2026-10-21 09:10:00',
      updatedAt: '2026-10-21 09:10:00',
      completedAt: '',
      processes: [
        normalizeLine(
          {
            processName: '粗车',
            processIndex: 2,
            originalExecutors: ['李四'],
            reworkAssignee: '张三',
            doneQty: 0,
          },
          2,
        ),
        normalizeLine(
          {
            processName: '精车',
            processIndex: 3,
            originalExecutors: ['李四'],
            reworkAssignee: '张三',
            doneQty: 0,
          },
          2,
        ),
      ],
      reportLogs: [],
    },
    {
      id: 'rw-demo-2',
      reworkNo: 'FG20261021002',
      status: REWORK_ORDER_STATUS.IN_PROGRESS,
      source: REWORK_ORDER_SOURCE.WORKSHOP_WEB,
      workOrderId: 'wo-lh-demo-1',
      workOrderNo: 'WO202605270-LH01',
      workOrderCategory: '生产工单',
      productName: '工时演示-批量计件计件',
      productCode: 'LH-MAT-01',
      specModel: 'DEMO-BC-P',
      material: 'HT250',
      drawingNo: 'LH-01-DWG',
      workCenter: '机加车间',
      processRouteName: '机加标准路线',
      scheduleQty: 10,
      planQty: 10,
      qty: 3,
      reason: '气孔超标',
      remark: '已报 1 件，剩余待返工',
      creator: 'admin1',
      createdAt: '2026-10-20 16:20:00',
      updatedAt: '2026-10-21 08:40:00',
      completedAt: '',
      processes: [
        normalizeLine(
          {
            processName: '机加工',
            processIndex: 1,
            originalExecutors: ['张三'],
            reworkAssignee: '张三',
            doneQty: 1,
          },
          3,
        ),
      ],
      reportLogs: [],
    },
    {
      id: 'rw-demo-3',
      reworkNo: 'FG20261020003',
      status: REWORK_ORDER_STATUS.DONE,
      source: REWORK_ORDER_SOURCE.FINISHED_QC,
      workOrderId: 'wo-pr-1',
      workOrderNo: 'WO-062',
      workOrderCategory: '生产工单',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      specModel: '1200×600mm',
      material: 'Q235',
      drawingNo: 'SJ-2024-A-DWG',
      workCenter: '焊接车间',
      processRouteName: '标准焊接工艺 v2',
      scheduleQty: 25,
      planQty: 25,
      qty: 4,
      reason: '焊缝未熔合',
      remark: '成品检返工已全部报完',
      creator: '质检员',
      createdAt: '2026-10-19 11:00:00',
      updatedAt: '2026-10-20 10:15:00',
      completedAt: '2026-10-20 10:15:00',
      processes: [
        normalizeLine(
          {
            processName: '点焊',
            processIndex: 1,
            originalExecutors: ['张三'],
            reworkAssignee: '张三',
            doneQty: 4,
          },
          4,
        ),
      ],
      reportLogs: [],
    },
    {
      id: 'rw-demo-4',
      reworkNo: 'FG20261019004',
      status: REWORK_ORDER_STATUS.CLOSED,
      source: REWORK_ORDER_SOURCE.WORKSHOP_MOBILE,
      workOrderId: 'wo-rework-mock-2',
      workOrderNo: 'WO-RW-002',
      workOrderCategory: '生产工单',
      productName: '立式多级离心泵',
      productCode: 'CP2610002',
      specModel: 'ISG80-160',
      material: 'HT250',
      drawingNo: 'ISG80-160-DWG',
      workCenter: '机加车间',
      processRouteName: '机加标准路线',
      scheduleQty: 10,
      planQty: 10,
      qty: 1,
      reason: '',
      remark: '现场关闭，未继续返工',
      creator: '车间工人',
      createdAt: '2026-10-19 14:00:00',
      updatedAt: '2026-10-19 14:30:00',
      completedAt: '',
      processes: [
        normalizeLine(
          {
            processName: '钻孔',
            processIndex: 4,
            originalExecutors: ['王五'],
            reworkAssignee: '王五',
            doneQty: 0,
          },
          1,
        ),
      ],
      reportLogs: [],
    },
  ]
}

function loadBundle() {
  const seeded = seedReworkOrders()
  let existing = []
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      existing = Array.isArray(parsed?.orders) ? parsed.orders : []
    }
  } catch {
    existing = []
  }
  const version = uni.getStorageSync(SEED_VERSION_KEY)
  const userOrders = existing.filter((o) => !String(o?.id || '').startsWith('rw-demo-'))
  if (version !== SEED_VERSION) {
    const orders = [...seeded, ...userOrders]
    saveOrders(orders)
    uni.setStorageSync(SEED_VERSION_KEY, SEED_VERSION)
    return { orders }
  }
  if (!existing.length) {
    saveOrders(seeded)
    return { orders: seeded }
  }
  const ids = new Set(existing.map((o) => o.id))
  const extra = seeded.filter((s) => !ids.has(s.id))
  if (!extra.length) return { orders: existing }
  const orders = [...extra, ...existing]
  saveOrders(orders)
  return { orders }
}

function saveOrders(orders) {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify({ orders }))
}

function normalizeLine(line = {}, qty) {
  const q = Number(line.qty) || Number(qty) || 0
  const doneQty = Number(line.doneQty) || 0
  return {
    processId: line.processId || '',
    processName: line.processName || '',
    processIndex: line.processIndex || 0,
    originalExecutors: line.originalExecutors || [],
    reworkAssignee: line.reworkAssignee || '',
    qty: q,
    doneQty,
    pendingQty: Math.max(0, q - doneQty),
  }
}

export function listReworkOrders({ keyword = '' } = {}) {
  const orders = loadBundle().orders
  const kw = String(keyword || '').trim().toLowerCase()
  if (!kw) return orders
  return orders.filter((o) => {
    const blob = [o.reworkNo, o.workOrderNo, o.productName, o.productCode, o.drawingNo]
      .join(' ')
      .toLowerCase()
    return blob.includes(kw)
  })
}

export function getReworkOrderById(id) {
  return listReworkOrders().find((o) => o.id === id) || null
}

function buildReworkDemoWorkOrders() {
  return [
    withDefaultProcesses({
      id: 'wo-rework-mock-1',
      code: 'WO-RW-001',
      name: '潜水电泵返工演示',
      productName: '潜水电泵 QJ200-40/3',
      productCode: 'CP2610004',
      specModel: 'QJ200-40/3',
      material: 'HT200',
      drawingNo: 'DWG-QJ200',
      orderCategory: '生产工单',
      status: '执行中',
      workCenter: '机加车间',
      scheduleQty: 20,
      processRouteName: '机加标准路线',
    }),
    withDefaultProcesses({
      id: 'wo-rework-mock-2',
      code: 'WO-RW-002',
      name: '立式多级泵机加演示',
      productName: '立式多级离心泵',
      productCode: 'CP2610002',
      specModel: 'ISG80-160',
      material: 'HT250',
      drawingNo: 'ISG80-160-DWG',
      orderCategory: '生产工单',
      status: '已完成',
      workCenter: '机加车间',
      scheduleQty: 10,
      processRouteName: '机加标准路线',
    }),
    withDefaultProcesses({
      id: 'wo-rework-mock-3',
      code: 'WO-ZZ-RW-001',
      name: '泵组总装返工演示',
      productName: '立式多级泵组',
      productCode: 'CP2610100',
      specModel: 'QJ200 总成',
      material: '组合件',
      drawingNo: 'ASM-QJ200',
      orderCategory: '总装工单',
      status: '执行中',
      workCenter: '总装车间',
      scheduleQty: 6,
      processRouteName: '装配标准路线',
    }),
  ]
}

export function listReworkableWorkOrders({ keyword = '' } = {}) {
  const kw = String(keyword || '').trim().toLowerCase()
  const live = loadAllWorkOrders()
    .filter((o) => {
      if (!OPEN_WO_STATUSES.has(o.status)) return false
      if (o.orderCategory && !REWORKABLE_CATEGORIES.has(o.orderCategory)) return false
      return true
    })
    .map(withDefaultProcesses)
  const demo = buildReworkDemoWorkOrders()
  const ids = new Set(live.map((o) => o.id))
  const merged = [...demo.filter((d) => !ids.has(d.id)), ...live]
  if (!kw) return merged
  return merged.filter((o) => {
    const blob = [o.code, o.productName, o.productCode, o.specModel, o.drawingNo]
      .join(' ')
      .toLowerCase()
    return blob.includes(kw)
  })
}

export function getReworkableWorkOrderById(id) {
  if (!id) return null
  return (
    listReworkableWorkOrders().find((o) => o.id === id) ||
    withDefaultProcesses(getWorkOrderById(id))
  )
}

export function isReworkOrderOpen(status) {
  return status === REWORK_ORDER_STATUS.PENDING || status === REWORK_ORDER_STATUS.IN_PROGRESS
}

function nextReworkNo(orders) {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const seq = String(orders.length + 1).padStart(3, '0')
  return `FG${y}${m}${day}${seq}`
}

export function createReworkOrderFromWorkOrder(payload = {}) {
  const wo = getReworkableWorkOrderById(payload.workOrderId)
  if (!wo) return { ok: false, message: '请选择工单' }
  const qty = Number(payload.qty) || 0
  if (!(qty > 0)) return { ok: false, message: '返工数量须大于 0' }
  const processNames = payload.processNames || []
  if (!processNames.length) return { ok: false, message: '请至少勾选一道重做工序' }
  const reason = String(payload.reason || '').trim()

  const assignees = payload.processAssignees || {}
  const processes = processNames.map((name, index) => {
    const hit = (wo.processes || []).find((p) => p.name === name)
    const originalExecutors = [...(hit?.executors || [])]
    const reworkAssignee = String(assignees[name] || '').trim() || originalExecutors[0] || ''
    return normalizeLine(
      {
        processId: hit?.id || '',
        processName: name,
        processIndex: hit?.index ?? hit?.stepNo ?? index + 1,
        originalExecutors,
        reworkAssignee,
      },
      qty,
    )
  })

  const stamp = Date.now()
  const createdAt = nowText()
  const { orders } = loadBundle()
  const order = {
    id: `rw-m-${stamp}`,
    reworkNo: nextReworkNo(orders),
    status: REWORK_ORDER_STATUS.PENDING,
    source: REWORK_ORDER_SOURCE.WORKSHOP_MOBILE,
    workOrderId: wo.id,
    workOrderNo: wo.code,
    workOrderCategory: wo.orderCategory || '生产工单',
    productName: wo.productName || '',
    productCode: wo.productCode || wo.materialCode || '',
    specModel: wo.specModel || '',
    material: wo.material || '',
    drawingNo: wo.drawingNo || '',
    workCenter: wo.workCenter || '',
    processRouteName: wo.processRouteName || '',
    scheduleQty: Number(wo.scheduleQty) || Number(wo.planQty) || 0,
    planQty: Number(wo.planQty) || Number(wo.scheduleQty) || 0,
    qty,
    reason,
    remark: payload.remark || '',
    creator: payload.creator || '车间工人',
    createdAt,
    updatedAt: createdAt,
    completedAt: '',
    processes,
    reportLogs: [],
  }

  orders.unshift(order)
  saveOrders(orders)

  const dateStr = createdAt.slice(0, 10).replace(/-/g, '')
  const mobileTasks = processes.map((line, index) => {
    const reporter = line.reworkAssignee || ''
    return {
      id: `mobile-rw-${order.id}-${index}`,
      taskNo: `RW${dateStr}${String((stamp % 1000) + index + 1).padStart(3, '0')}`,
      workOrderId: wo.id,
      workOrderCode: wo.code,
      workOrderName: wo.name || '',
      processName: line.processName,
      processSeq: line.processIndex || index + 1,
      productName: order.productName,
      itemCode: order.productCode,
      expectedQty: qty,
      scheduleQty: qty,
      executor: reporter,
      executors: reporter ? [reporter] : [...(line.originalExecutors || [])],
      claimTargets: [],
      taskStatus: '待报工',
      placement: 'todo',
      isRework: true,
      reworkOrderId: order.id,
      reworkNo: order.reworkNo,
      orderCategory: wo.orderCategory || '生产工单',
      createdAt,
      remark: `返工任务 · ${order.reworkNo}`,
    }
  })
  appendReworkMobileTasks(mobileTasks)

  return {
    ok: true,
    order,
    message: `已创建返工单「${order.reworkNo}」，并生成 ${mobileTasks.length} 条返工任务`,
  }
}

export function closeReworkOrder(id) {
  const { orders } = loadBundle()
  const order = orders.find((o) => o.id === id)
  if (!order) return { ok: false, message: '返工单不存在' }
  if (order.status === REWORK_ORDER_STATUS.DONE) {
    return { ok: false, message: '返工单已完成' }
  }
  order.status = REWORK_ORDER_STATUS.CLOSED
  order.updatedAt = nowText()
  saveOrders(orders)
  return { ok: true, order, message: `已关闭返工单「${order.reworkNo}」` }
}
