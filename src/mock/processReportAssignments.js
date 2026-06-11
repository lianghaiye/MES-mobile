/** 今日待报工 - 工单指派 mock */

import { formatReportDate } from './processReportRecords'

function createAssignments(userName) {
  const today = formatReportDate()
  return [
    {
      id: 'wo-assign-1',
      workOrderNo: 'WO-062',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      assignee: userName,
      reportDate: today,
      processes: [
        {
          id: 'wp-1',
          seq: 1,
          name: '点焊',
          targetQty: 25,
          reportMode: '按件数',
          status: 'pending',
        },
        {
          id: 'wp-2',
          seq: 2,
          name: '打磨',
          targetQty: 25,
          reportMode: '按件数',
          status: 'pending',
        },
        {
          id: 'wp-3',
          seq: 3,
          name: '装配',
          targetQty: 25,
          reportMode: '按时长',
          status: 'locked',
          lockReason: '等待前序工序',
        },
      ],
    },
    {
      id: 'wo-assign-2',
      workOrderNo: 'WO-058',
      productName: '泵轴',
      productCode: 'BX-2024-03',
      assignee: userName,
      reportDate: today,
      processes: [
        {
          id: 'wp-4',
          seq: 1,
          name: '车削',
          targetQty: 15,
          reportMode: '按件数',
          status: 'reported',
          reportedGoodQty: 14,
          reportedDefectQty: 1,
          reportStatus: '待审核',
        },
        {
          id: 'wp-5',
          seq: 2,
          name: '铣削',
          targetQty: 15,
          reportMode: '按件数',
          status: 'pending',
        },
      ],
    },
    {
      id: 'wo-assign-3',
      workOrderNo: 'WO-055',
      productName: '泵壳',
      productCode: 'BK-2024-01',
      assignee: userName,
      reportDate: today,
      processes: [
        {
          id: 'wp-6',
          seq: 1,
          name: '热处理',
          targetQty: 12,
          reportMode: '按时长',
          status: 'pending',
        },
      ],
    },
  ]
}

const STORAGE_KEY = 'i_doms_mobile_process_assignments'

function load(userName) {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return (data.assignments || []).filter((a) => a.assignee === userName)
    }
  } catch {
    /* ignore */
  }
  return createAssignments(userName)
}

let cache = null
let cacheUser = ''

function save() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify({ assignments: cache }))
}

export function getTodayAssignments(user) {
  const userName = user?.displayName || '张三'
  if (cacheUser !== userName || !cache) {
    cache = load(userName)
    cacheUser = userName
  }
  const today = formatReportDate()
  return cache.filter((a) => a.reportDate === today)
}

export function hasTodayAssignments(user) {
  return getTodayAssignments(user).length > 0
}

export function getPendingAssignmentCount(user) {
  const list = getTodayAssignments(user)
  let count = 0
  list.forEach((wo) => {
    wo.processes.forEach((p) => {
      if (p.status === 'pending') count += 1
    })
  })
  return count
}

export function getAssignmentProcess(workOrderId, processId) {
  const wo = cache?.find((a) => a.id === workOrderId)
  if (!wo) return null
  const proc = wo.processes.find((p) => p.id === processId)
  if (!proc) return null
  return { workOrder: wo, process: proc }
}

export function markProcessReported(workOrderId, processId) {
  const wo = cache?.find((a) => a.id === workOrderId)
  const proc = wo?.processes.find((p) => p.id === processId)
  if (proc) {
    proc.status = 'reported'
    proc.reportStatus = '待审核'
    save()
  }
}
