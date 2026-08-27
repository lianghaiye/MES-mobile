import {
  ensureApprovalStorageSeed,
  getPendingApprovalCount as bridgePendingCount,
  listPendingApprovals,
  listDoneApprovals,
  getApprovalDetail,
  approveDocument,
  rejectDocument,
  canApproveDetail,
} from '@/utils/approvalBridge'

export {
  ensureApprovalStorageSeed,
  listPendingApprovals,
  listDoneApprovals,
  getApprovalDetail,
  approveDocument,
  rejectDocument,
  canApproveDetail,
}

/** 待我审批数量 */
export function getPendingApprovalCount(user) {
  ensureApprovalStorageSeed()
  return bridgePendingCount(user)
}
