/**
 * 工序报工 - 待领任务 / 今日待报工（按任务取值）
 * 工单 1:N 任务，每条任务对应一道工序
 */

import { formatReportDate, getMyRecords, submitProcessReport } from './processReportRecords'
import {
  mergePcSyncedTasks,
  getAllTasks,
  updateTaskById,
  claimTask,
  getTaskById,
} from './disassemblyTasks'
import { getProcessReportMode } from '@/utils/iodomsStorage'
import { resolveLaborConfig } from '@/utils/laborWageCalc'
import { isDurationReportMode } from '@/utils/reportMode'
import {
  resolveWorkerDisplayName,
  getGroupLeaderName,
  getGroupWorkerNames,
  isGroupLeader,
} from '@/utils/workerGroup'
import {
  REPORTABLE_TASK_STATUS,
  getTaskAssignGroups,
  isMultiGroupTask,
  isGroupReportTask,
  isPersonalLeaderTask,
  isGroupTaskReadyForLeader,
  getTaskReportedTotal,
  getTaskRemainingQty,
} from '@/utils/processReportTaskRules'

const REPORTABLE_CATEGORIES = ['生产工单', '总装工单']
const ACTIVE_TASK_STATUS = REPORTABLE_TASK_STATUS

/** 演示：物品编码 → 材质/图号（任务种子未填时兜底） */
const PRODUCT_MATERIAL_MAP = {
  'SJ-2024-A': { material: 'Q235', drawingNo: 'SJ-A-DWG-001' },
  'BX-2024-03': { material: '45#', drawingNo: 'BX-2024-03-DWG' },
  'CP2610004': { material: '不锈钢304', drawingNo: 'QJ200-50/4-DWG' },
  'CP2610002': { material: 'HT250', drawingNo: 'ISG80-160-DWG' },
  'FL-2024-C': { material: 'HT200', drawingNo: 'FL-DN150-01' },
  'BK-2024-01': { material: 'HT200', drawingNo: 'BK-DWG-01' },
  'DJ-2024-B': { material: '冷轧板', drawingNo: 'DJ-B-DWG-01' },
}

function resolveTaskProductMeta(task) {
  const code = task.itemCode || task.productCode || ''
  const hit = PRODUCT_MATERIAL_MAP[code] || {}
  return {
    material: task.material || hit.material || '',
    drawingNo: task.drawingNo || hit.drawingNo || '',
    specModel: task.specModel || hit.specModel || '',
  }
}

/** 演示：工单号 → 销售订单号 */
const SALES_ORDER_BY_WO_CODE = {
  'WO-062': '1-20260602-001',
  'WO-058': '1-20260529-002',
  'WO-055': '1-20260528-003',
  'WO-071': '1-20260604-001',
  'WO-068': '1-20260603-002',
  'WO-072': '1-20260606-001',
  'WO-ZZ-012': '1-20260605-001',
  'WO-LH-01': '1-20260606-101',
  'WO-LH-02': '1-20260606-102',
  'WO-LH-03': '1-20260606-103',
  'WO-LH-04': '1-20260606-104',
  'WO-LH-05': '1-20260606-105',
  'WO-LH-06': '1-20260606-106',
  'WO-LH-07': '1-20260606-106',
}

function resolveSalesOrderNo(task) {
  return (
    task.salesOrderNo ||
    task.sourceOrderNo ||
    SALES_ORDER_BY_WO_CODE[task.workOrderCode] ||
    ''
  )
}

function todayStr() {
  return formatReportDate()
}

/** 演示环境：admin/管理员 与工人账号 张三 共用报工任务 */
function resolveExecutorNames(user) {
  const displayName = user?.displayName || ''
  const username = user?.username || ''
  if (displayName === '管理员' || username === 'admin') {
    return ['管理员', 'admin', '张三']
  }
  if (!displayName && !username) return ['张三']
  return [...new Set([displayName, username].filter(Boolean))]
}

function isUnclaimedPoolTask(task) {
  return task.taskStatus === '待领取' && task.placement === 'claim' && !task.claimedBy
}

function isTaskForUser(task, names) {
  if (!names.length) return false
  if (isUnclaimedPoolTask(task)) return false
  if (task.claimedBy) {
    return names.some((name) => name === task.claimedBy || name === task.executor)
  }
  return names.some(
    (name) =>
      task.executor === name ||
      (task.executors || []).includes(name),
  )
}

function isTaskClaimableForUser(task, names) {
  if (task.taskStatus !== '待领取' || task.placement !== 'claim') return false
  if (isGroupReportTask(task)) {
    if (!isMultiGroupTask(task)) return false
    return getTaskAssignGroups(task).some((groupName) => {
      const leader = getGroupLeaderName(groupName)
      return leader && names.includes(leader) && !(task.claimedGroups || []).includes(groupName)
    })
  }
  if (task.claimedBy) return false
  const targets = task.claimTargets?.length ? task.claimTargets : task.executors
  if (!targets?.length) return false
  return names.some((name) => targets.includes(name))
}

function isTaskVisibleToUser(task, names) {
  if (isGroupReportTask(task)) {
    return names.some((name) => isGroupTaskReadyForLeader(task, name))
  }
  if (task.placement === 'claim' && task.taskStatus === '待领取') return false
  return isTaskForUser(task, names)
}

function isTaskForReportMember(task, memberName, leaderName) {
  if (isPersonalLeaderTask(task, leaderName)) {
    return memberName === leaderName
  }
  if (isGroupReportTask(task) && isGroupTaskReadyForLeader(task, leaderName)) {
    const groupName = task.groupName || getTaskAssignGroups(task)[0]
    return getGroupWorkerNames(groupName).includes(memberName)
  }
  if (task.claimedBy) return task.claimedBy === memberName || task.executor === memberName
  return task.executor === memberName || (task.executors || []).includes(memberName)
}

export function resolveReportContext(user, options = {}, task = null) {
  const operatorName = resolveWorkerDisplayName(user)
  const reportForMember = options.reportForMember || operatorName
  const groupTask = task ? isGroupReportTask(task) : !!options.isGroupTask
  const proxy = isGroupLeader(user) && groupTask && reportForMember !== operatorName
  return {
    operator: proxy ? operatorName : reportForMember,
    reporter: reportForMember,
    isProxy: proxy,
    isGroupTask: !!groupTask,
  }
}

function enrichTask(task, user, options = {}) {
  const reportMode = getProcessReportMode(task.processName)
  const productCode = task.itemCode || task.productCode || ''
  const laborCfg = resolveLaborConfig(productCode, task.processName)
  const leaderName = resolveWorkerDisplayName(user)
  const targetQty = task.expectedQty ?? task.targetQty ?? 0
  const reportedTotalQty = getTaskReportedTotal(task)
  const remainingQty = getTaskRemainingQty(task)
  const isGroupTask = isGroupReportTask(task)
  const isPersonalTask = isPersonalLeaderTask(task, leaderName)

  let status = remainingQty <= 0 ? 'reported' : 'pending'
  if (!REPORTABLE_TASK_STATUS.includes(task.taskStatus) && remainingQty > 0) {
    status = 'locked'
  }

  return {
    ...task,
    workOrderNo: task.workOrderCode,
    productCode: task.itemCode || task.productCode || '',
    targetQty,
    remainingQty,
    reportedTotalQty,
    salesOrderNo: resolveSalesOrderNo(task),
    groupName: task.groupName || getTaskAssignGroups(task)[0] || '',
    reportMode,
    salaryMethod: laborCfg.salaryMethod,
    reportTypeLabel: `${laborCfg.reportType}+${laborCfg.salaryMethod}`,
    status,
    isGroupTask,
    isPersonalTask,
    lockReason: '',
    reportedGoodQty: Number(task.reportedGoodQty) || 0,
    reportedDefectQty: Number(task.reportedDefectQty) || 0,
    reportStatus: remainingQty <= 0 ? task.reportStatus || '待审核' : '',
    reportRecordId: '',
    ...resolveTaskProductMeta(task),
  }
}

function enrichClaimTask(task) {
  const groups = getTaskAssignGroups(task)
  return {
    ...task,
    workOrderNo: task.workOrderCode,
    productCode: task.itemCode || task.productCode || '',
    targetQty: task.expectedQty ?? task.targetQty ?? 0,
    salesOrderNo: resolveSalesOrderNo(task),
    groupName: task.groupName || groups[0] || '',
    groupNames: groups,
    isMultiGroup: isMultiGroupTask(task),
    reportMode: getProcessReportMode(task.processName),
    ...resolveTaskProductMeta(task),
  }
}

function isTaskInTodayScope(task, today) {
  const created = (task.createdAt || '').slice(0, 10)
  if (created === today) return true
  if (ACTIVE_TASK_STATUS.includes(task.taskStatus)) return true
  if (task.taskStatus === '待领取') return true
  if (getTaskRemainingQty(task) > 0) return true
  return false
}

export function getClaimableReportTasks(user) {
  mergePcSyncedTasks()
  const executorNames = resolveExecutorNames(user)
  const today = todayStr()

  return getAllTasks()
    .filter((t) => REPORTABLE_CATEGORIES.includes(t.orderCategory))
    .filter((t) => isTaskClaimableForUser(t, executorNames))
    .filter((t) => isTaskInTodayScope(t, today) || isUnclaimedPoolTask(t))
    .map(enrichClaimTask)
    .sort((a, b) => (a.processSeq || 0) - (b.processSeq || 0))
}

export function getClaimableReportTaskCount(user) {
  return getClaimableReportTasks(user).length
}

export function getClaimableReportTaskById(taskId, user) {
  return getClaimableReportTasks(user).find((t) => t.id === taskId) || null
}

export function claimReportTask(taskId, user) {
  const userName = resolveWorkerDisplayName(user)
  return claimTask(taskId, userName)
}

export function getTodayReportTasks(user, options = {}) {
  mergePcSyncedTasks()
  const executorNames = resolveExecutorNames(user)
  const leaderName = resolveWorkerDisplayName(user)
  const reportForMember = options.reportForMember || leaderName
  const today = todayStr()

  return getAllTasks()
    .filter((t) => REPORTABLE_CATEGORIES.includes(t.orderCategory))
    .filter((t) => isTaskVisibleToUser(t, executorNames))
    .filter((t) => {
      if (isMultiGroupTask(t) && t.placement === 'claim') {
        return executorNames.some((name) => isGroupTaskReadyForLeader(t, name))
      }
      return !(t.placement === 'claim' && t.taskStatus === '待领取' && !isMultiGroupTask(t))
    })
    .filter((t) => isTaskInTodayScope(t, today))
    .filter((t) => {
      if (isGroupLeader(user)) {
        return isTaskForReportMember(t, reportForMember, leaderName)
      }
      return isTaskForUser(t, [reportForMember])
    })
    .map((t) => enrichTask(t, user, { reportForMember }))
    .filter((t) => t.status !== 'locked')
    .sort((a, b) => {
      const order = { pending: 0, reported: 1, locked: 2 }
      const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (diff !== 0) return diff
      return (a.processSeq || 0) - (b.processSeq || 0)
    })
}

export function hasTodayReportTasks(user) {
  return getTodayReportTasks(user).length > 0
}

export function getPendingReportTaskCount(user) {
  return getTodayReportTasks(user).filter((t) => t.status === 'pending').length
}

export function getReportTaskById(taskId, user, options = {}) {
  const task = getTodayReportTasks(user, options).find((t) => t.id === taskId)
  return task || null
}

export function markTaskReported(taskId, payload = {}) {
  const task = getTaskById(taskId)
  if (!task) return null
  const addGood = Number(payload.goodQty) || 0
  const addDefect = Number(payload.defectQty) || 0
  const reportedGoodQty = (Number(task.reportedGoodQty) || 0) + addGood
  const reportedDefectQty = (Number(task.reportedDefectQty) || 0) + addDefect
  const reportedFinishedQty = reportedGoodQty + reportedDefectQty
  const target = Number(task.expectedQty ?? task.targetQty) || 0
  const complete = reportedFinishedQty >= target
  const patch = {
    reportedGoodQty,
    reportedDefectQty,
    reportedFinishedQty,
    reportStatus: complete ? '待审核' : '',
    taskStatus: complete ? '执行中' : '待报工',
  }
  return updateTaskById(taskId, patch)
}

function buildBatchReportPayload(task, reportContext) {
  const remainingQty = Number(task.remainingQty ?? getTaskRemainingQty(task)) || 0
  const durationMode = isDurationReportMode(task.reportMode)
  const d = new Date()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return {
    source: 'workorder',
    taskId: task.id,
    taskNo: task.taskNo,
    workOrderNo: task.workOrderNo,
    workOrderId: task.workOrderId,
    processId: task.id,
    processName: task.processName,
    productName: task.productName,
    productCode: task.productCode,
    targetQty: task.targetQty,
    reportMode: task.reportMode,
    goodQty: remainingQty,
    defectQty: 0,
    defectBreakdown: [],
    workHours: durationMode ? Math.max(0.5, Math.round(remainingQty * 0.5 * 10) / 10) : null,
    startTime: time,
    endTime: time,
    remark: '批量报工',
    operator: reportContext.operator,
    reporter: reportContext.reporter,
    groupName: task.groupName || '',
    taskScope: task.isGroupTask ? '小组' : '个人',
    images: [],
  }
}

/** 批量报工：按目标数量默认提交（良品=目标，不良=0） */
export function batchReportTasks(taskIds, user, options = {}) {
  if (!taskIds?.length) return { ok: false, message: '请选择待报工任务' }

  const pendingMap = new Map(
    getTodayReportTasks(user, options)
      .filter((t) => t.status === 'pending')
      .map((t) => [t.id, t]),
  )

  let okCount = 0
  let failCount = 0

  for (const id of taskIds) {
    const task = pendingMap.get(id)
    if (!task) continue
    const reportContext = resolveReportContext(user, options, task)
    const res = submitProcessReport(buildBatchReportPayload(task, reportContext))
    if (res.ok) {
      markTaskReported(task.id, { goodQty: task.remainingQty ?? getTaskRemainingQty(task), defectQty: 0 })
      okCount += 1
    } else {
      failCount += 1
    }
  }

  if (!okCount && !failCount) {
    return { ok: false, message: '没有可报工的任务' }
  }

  return {
    ok: okCount > 0,
    okCount,
    failCount,
    message:
      failCount > 0
        ? `成功 ${okCount} 项，失败 ${failCount} 项`
        : `已成功报工 ${okCount} 项`,
  }
}

export function getReportTasksByIds(taskIds, user, options = {}) {
  if (!taskIds?.length) return []
  const idSet = new Set(taskIds)
  return getTodayReportTasks(user, options).filter((t) => idSet.has(t.id) && t.status === 'pending')
}

/** 自主批量报工：按用户填写的各任务数据提交 */
export function submitBatchCustomReports(entries, user, options = {}) {
  if (!entries?.length) return { ok: false, message: '没有可提交的数据' }

  const pendingMap = new Map(
    getTodayReportTasks(user, options)
      .filter((t) => t.status === 'pending')
      .map((t) => [t.id, t]),
  )

  let okCount = 0
  let failCount = 0
  let lastMessage = ''

  for (const entry of entries) {
    const task = pendingMap.get(entry.taskId)
    if (!task) continue
    const res = submitProcessReport(entry.payload)
    if (res.ok) {
      markTaskReported(task.id, {
        goodQty: entry.payload.goodQty,
        defectQty: entry.payload.defectQty,
      })
      okCount += 1
    } else {
      failCount += 1
      lastMessage = res.message
    }
  }

  if (!okCount && !failCount) {
    return { ok: false, message: '没有可报工的任务' }
  }

  return {
    ok: okCount > 0,
    okCount,
    failCount,
    message:
      failCount > 0
        ? lastMessage || `成功 ${okCount} 项，失败 ${failCount} 项`
        : `已成功报工 ${okCount} 项`,
  }
}

export function buildCustomReportPayload(task, form, sharedRemark = '', reportContext = null) {
  const ctx = reportContext || {
    operator: task.executor || '',
    reporter: task.executor || '',
  }
  const d = new Date()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const remark = [form.remark, sharedRemark].filter(Boolean).join('；') || form.remark || sharedRemark || ''
  return {
    source: 'workorder',
    taskId: task.id,
    taskNo: task.taskNo,
    workOrderNo: task.workOrderNo,
    workOrderId: task.workOrderId,
    processId: task.id,
    processName: task.processName,
    productName: task.productName,
    productCode: task.productCode,
    targetQty: task.targetQty,
    reportMode: task.reportMode,
    goodQty: Number(form.goodQty) || 0,
    defectQty: Number(form.defectQty) || 0,
    defectBreakdown: form.defectBreakdown || [],
    workHours: isDurationReportMode(task.reportMode) ? Number(form.workHours) || 0 : null,
    startTime: form.startTime || time,
    endTime: form.endTime || time,
    remark: remark || '异常报工',
    operator: ctx.operator,
    reporter: ctx.reporter,
    taskScope: task.isGroupTask ? '小组' : '个人',
    groupName: task.groupName || '',
    images: form.images || [],
  }
}
