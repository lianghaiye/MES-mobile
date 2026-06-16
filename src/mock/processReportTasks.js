/**
 * 工序报工 - 今日待报工（按任务取值）
 * 工单 1:N 任务，每条任务对应一道工序
 */

import { formatReportDate, getMyRecords } from './processReportRecords'
import {
  mergePcSyncedTasks,
  getAllTasks,
  updateTaskById,
} from './disassemblyTasks'
import { getProcessReportMode } from '@/utils/iodomsStorage'

const REPORTABLE_CATEGORIES = ['生产工单', '总装工单']
const ACTIVE_TASK_STATUS = ['待开始', '执行中']

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

function isTaskForUser(task, names) {
  if (!names.length) return false
  return names.some(
    (name) =>
      task.executor === name ||
      task.claimedBy === name ||
      (task.executors || []).includes(name),
  )
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

function isTaskInTodayScope(task, today) {
  const created = (task.createdAt || '').slice(0, 10)
  if (created === today) return true
  if (ACTIVE_TASK_STATUS.includes(task.taskStatus)) return true
  if (task.reportStatus === '待审核') return true
  if (task.serialLocked) return true
  return false
}

export function getTodayReportTasks(user) {
  mergePcSyncedTasks()
  const executorNames = resolveExecutorNames(user)
  const today = todayStr()

  return getAllTasks()
    .filter((t) => REPORTABLE_CATEGORIES.includes(t.orderCategory))
    .filter((t) => isTaskForUser(t, executorNames))
    .filter((t) => isTaskInTodayScope(t, today))
    .map((t) => enrichTask(t, user))
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
