/** 审批待办 mock（待我审批） */

const seedApprovals = [
  {
    id: 'ap-1',
    title: '采购订单 PO20260608001',
    type: '采购审批',
    status: '待审批',
    approver: '管理员',
    applicant: '王小虎',
    createdAt: '2026-06-08 09:00',
  },
  {
    id: 'ap-2',
    title: '领料申请 ML20260608002',
    type: '领料审批',
    status: '待审批',
    approver: '管理员',
    applicant: '张三',
    createdAt: '2026-06-08 10:30',
  },
  {
    id: 'ap-3',
    title: '发货申请 FH20260607003',
    type: '发货审批',
    status: '待审批',
    approver: '李主管',
    applicant: '孙琴丽',
    createdAt: '2026-06-07 16:00',
  },
  {
    id: 'ap-4',
    title: '报废单 BF20260606004',
    type: '报废审批',
    status: '已完成',
    approver: '管理员',
    applicant: '李四',
    createdAt: '2026-06-06 14:00',
  },
]

const STORAGE_KEY = 'i_doms_mobile_approvals'

function load() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(seedApprovals))
}

let cache = load()

/** 待我审批数量 */
export function getPendingApprovalCount(user) {
  const name = user?.displayName || user?.username || ''
  if (!name) return 0
  return cache.filter((a) => a.status === '待审批' && a.approver === name).length
}
