import { getPendingQcCount } from '@/mock/factoryQc'
import { getPendingTaskCount } from '@/mock/disassemblyTasks'
import { getPendingApprovalCount } from '@/mock/approval'

/** 我的待办 = 待办任务 + 待质检 + 待我审批 */
export function getMyPendingCount(user) {
  const todo = getPendingTaskCount()
  const qc = getPendingQcCount()
  const approval = getPendingApprovalCount(user)
  return {
    total: todo + qc + approval,
    todo,
    qc,
    approval,
  }
}
