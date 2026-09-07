import { getGroupLeaderName } from '@/mock/employeeGroups'

export const REPORTABLE_TASK_STATUS = ['待报工', '待开始', '执行中']

export function getTaskAssignGroups(task = {}) {
  if (Array.isArray(task.groupNames) && task.groupNames.length) return task.groupNames
  if (task.groupName) return [task.groupName]
  return []
}

export function isMultiGroupTask(task = {}) {
  return task.resourceType === '工人小组' && getTaskAssignGroups(task).length > 1
}

export function isGroupReportTask(task = {}) {
  return task.resourceType === '工人小组'
}

export function isPersonalLeaderTask(task = {}, leaderName = '') {
  if (task.resourceType === '工人小组') return false
  return task.executor === leaderName || task.claimedBy === leaderName
}

export function getLeaderGroupsForTask(task = {}, leaderName = '') {
  if (!leaderName) return []
  return getTaskAssignGroups(task).filter((groupName) => getGroupLeaderName(groupName) === leaderName)
}

export function getLeaderGroupForTask(task = {}, leaderName = '') {
  return getLeaderGroupsForTask(task, leaderName)[0] || ''
}

export function getUnclaimedLeaderGroups(task = {}, leaderName = '') {
  const claimed = task.claimedGroups || []
  return getLeaderGroupsForTask(task, leaderName).filter((groupName) => !claimed.includes(groupName))
}

export function formatTaskSpecLine(task = {}) {
  const spec = task.specModel || '—'
  const material = task.material || '—'
  const drawing = task.drawingNo || '—'
  return `${spec} / ${material} / ${drawing}`
}

export function getTaskResourceLabel(task = {}, leaderName = '') {
  if (!isGroupReportTask(task)) return '工人'
  if (leaderName) {
    const claimedMine = getLeaderGroupsForTask(task, leaderName).find((groupName) =>
      (task.claimedGroups || []).includes(groupName),
    )
    if (claimedMine) return claimedMine
  }
  const names = getTaskAssignGroups(task)
  if (names.length === 1) return names[0]
  if (names.length > 1) return names.join('、')
  return task.groupName || '小组'
}

export function isGroupClaimedByLeader(task = {}, leaderName = '') {
  if (!isGroupReportTask(task)) return false
  if (isMultiGroupTask(task)) {
    return getLeaderGroupsForTask(task, leaderName).some((groupName) =>
      (task.claimedGroups || []).includes(groupName),
    )
  }
  const leader = getGroupLeaderName(task.groupName)
  return leader === leaderName && (task.claimedBy === leaderName || task.groupLeader === leaderName || task.placement === 'todo')
}

export function isGroupTaskReadyForLeader(task = {}, leaderName = '') {
  if (!isGroupReportTask(task)) return false
  const groups = getTaskAssignGroups(task)
  if (groups.length <= 1) {
    const leader = getGroupLeaderName(groups[0] || task.groupName)
    return (
      leader === leaderName &&
      task.placement === 'todo' &&
      REPORTABLE_TASK_STATUS.includes(task.taskStatus)
    )
  }
  return isGroupClaimedByLeader(task, leaderName)
}

export function getTaskReportedTotal(task = {}) {
  const good = Number(task.reportedGoodQty) || 0
  const defect = Number(task.reportedDefectQty) || 0
  if (task.reportedFinishedQty != null) {
    return Math.max(Number(task.reportedFinishedQty) || 0, good + defect)
  }
  return good + defect
}

export function isCollaborativeTask(task = {}) {
  return task.taskExecutionMode === 'collaborative'
}

export function getCollaborationProgressLabel(task = {}) {
  if (!isCollaborativeTask(task)) return ''
  const slot = task.collaborationSlot || 1
  const total = task.collaborationTotal || 1
  return `协作 ${slot}/${total}`
}

export function getTaskRemainingQty(task = {}) {
  const target = Number(task.expectedQty ?? task.targetQty) || 0
  return Math.max(0, target - getTaskReportedTotal(task))
}
