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
} from './disassemblyTasks'
import { getProcessReportMode } from '@/utils/iodomsStorage'
import { isDurationReportMode } from '@/utils/reportMode'
import { resolveWorkerDisplayName } from '@/utils/workerGroup'

const REPORTABLE_CATEGORIES = ['生产工单', '总装工单']
const ACTIVE_TASK_STATUS = ['待开始', '执行中']

/** 演示：工单号 → 销售订单号 */
const SALES_ORDER_BY_WO_CODE = {
  'WO-062': '1-20260602-001',
  'WO-058': '1-20260529-002',
  'WO-055': '1-20260528-003',
  'WO-071': '1-20260604-001',
  'WO-068': '1-20260603-002',
  'WO-ZZ-012': '1-20260605-001',
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
  if (!isUnclaimedPoolTask(task)) return false
  const targets = task.claimTargets?.length ? task.claimTargets : task.executors
  if (!targets?.length) return false
  return names.some((name) => targets.includes(name))
}

function findTaskReportRecord(task, user) {
  const list = getMyRecords(user, 'all')
  return (
    list.find(
      (r) =>
        r.source === 'workorder' &&
        (r.taskId === task.id ||
          (r.workOrderId === task.workOrderId && r.processName === task.processName)),
    ) || null
  )
}

function enrichTask(task, user) {
  const reportMode = getProcessReportMode(task.processName)
  const record = findTaskReportRecord(task, user)
  const reported = !!record || task.reportStatus === '待审核' || task.reportStatus === '已审核'

  let status = 'pending'
  if (task.serialLocked) status = 'locked'
  else if (reported) status = 'reported'
  else if (!ACTIVE_TASK_STATUS.includes(task.taskStatus)) status = 'locked'

  return {
    ...task,
    workOrderNo: task.workOrderCode,
    productCode: task.itemCode || task.productCode || '',
    targetQty: task.expectedQty ?? task.targetQty ?? 0,
    salesOrderNo: resolveSalesOrderNo(task),
    groupName: task.groupName || '',
    reportMode,
    status,
    lockReason: task.serialLocked ? '等待前序工序' : '',
    reportedGoodQty: record?.goodQty ?? task.reportedGoodQty ?? 0,
    reportedDefectQty: record?.defectQty ?? task.reportedDefectQty ?? 0,
    reportStatus: record?.status || task.reportStatus || '',
    reportRecordId: record?.id || '',
  }
}

function enrichClaimTask(task) {
  const targets = task.claimTargets?.length ? task.claimTargets : task.executors || []
  return {
    ...task,
    workOrderNo: task.workOrderCode,
    productCode: task.itemCode || task.productCode || '',
    targetQty: task.expectedQty ?? task.targetQty ?? 0,
    salesOrderNo: resolveSalesOrderNo(task),
    groupName: task.groupName || '',
    reportMode: getProcessReportMode(task.processName),
    claimTargets: targets,
    claimTargetLabel: targets.join('、'),
  }
}

function isTaskInTodayScope(task, today) {
  const created = (task.createdAt || '').slice(0, 10)
  if (created === today) return true
  if (ACTIVE_TASK_STATUS.includes(task.taskStatus)) return true
  if (task.reportStatus === '待审核') return true
  if (task.serialLocked) return true
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

export function claimReportTask(taskId, user) {
  const userName = resolveWorkerDisplayName(user)
  return claimTask(taskId, userName)
}

export function getTodayReportTasks(user) {
  mergePcSyncedTasks()
  const executorNames = resolveExecutorNames(user)
  const today = todayStr()

  return getAllTasks()
    .filter((t) => REPORTABLE_CATEGORIES.includes(t.orderCategory))
    .filter((t) => isTaskForUser(t, executorNames))
    .filter((t) => !isUnclaimedPoolTask(t))
    .filter((t) => isTaskInTodayScope(t, today))
    .map((t) => enrichTask(t, user))
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

export function getReportTaskById(taskId, user) {
  const task = getTodayReportTasks(user).find((t) => t.id === taskId)
  return task || null
}

export function markTaskReported(taskId, payload = {}) {
  const patch = {
    reportStatus: '待审核',
    reportedGoodQty: payload.goodQty,
    reportedDefectQty: payload.defectQty,
    taskStatus: '执行中',
  }
  return updateTaskById(taskId, patch)
}

function buildBatchReportPayload(task) {
  const targetQty = Number(task.targetQty) || 0
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
    targetQty,
    reportMode: task.reportMode,
    goodQty: targetQty,
    defectQty: 0,
    defectBreakdown: [],
    workHours: durationMode ? Math.max(0.5, Math.round(targetQty * 0.5 * 10) / 10) : null,
    startTime: time,
    endTime: time,
    remark: '批量报工',
    operator: task.executor || '',
    groupName: task.groupName || '',
    images: [],
  }
}

/** 批量报工：按目标数量默认提交（良品=目标，不良=0） */
export function batchReportTasks(taskIds, user) {
  if (!taskIds?.length) return { ok: false, message: '请选择待报工任务' }

  const pendingMap = new Map(
    getTodayReportTasks(user)
      .filter((t) => t.status === 'pending')
      .map((t) => [t.id, t]),
  )

  let okCount = 0
  let failCount = 0

  for (const id of taskIds) {
    const task = pendingMap.get(id)
    if (!task) continue
    const res = submitProcessReport(buildBatchReportPayload(task))
    if (res.ok) {
      markTaskReported(task.id, { goodQty: task.targetQty, defectQty: 0 })
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

export function getReportTasksByIds(taskIds, user) {
  if (!taskIds?.length) return []
  const idSet = new Set(taskIds)
  return getTodayReportTasks(user).filter((t) => idSet.has(t.id) && t.status === 'pending')
}

/** 自主批量报工：按用户填写的各任务数据提交 */
export function submitBatchCustomReports(entries, user) {
  if (!entries?.length) return { ok: false, message: '没有可提交的数据' }

  const pendingMap = new Map(
    getTodayReportTasks(user)
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

export function buildCustomReportPayload(task, form, sharedRemark = '') {
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
    operator: task.executor || '',
    groupName: task.groupName || '',
    images: form.images || [],
  }
}
