import { normalizeReportMode } from '@/utils/reportMode'

export const DEFAULT_TASK_EXECUTION_MODE = 'single_claim'

export function normalizeTaskExecutionMode(mode) {
  return mode === 'collaborative' ? 'collaborative' : 'single_claim'
}

export function isCollaborativeExecutionMode(mode) {
  return normalizeTaskExecutionMode(mode) === 'collaborative'
}

export function isCollaborativeTask(task = {}) {
  return task.taskExecutionMode === 'collaborative'
}

export function shouldSplitCollaborativeTasks(process) {
  if (!process) return false
  if (normalizeTaskExecutionMode(process.taskExecutionMode) !== 'collaborative') return false
  if (process.resourceType && process.resourceType !== '工人') return false
  if (normalizeReportMode(process.reportMode) !== '时长报工') return false
  return (process.executors || []).length > 1
}

export function buildTaskGroupId(workOrderId, processSeq) {
  return `tg-${workOrderId}-${processSeq}`
}
