/**
 * 工单报工二维码 token（与 Web 演示约定一致：base64url JSON）
 */

export const WORK_ORDER_QR_SCOPE = {
  ORDER: 'order',
  PROCESS: 'process',
}

function fromBase64Url(token) {
  const b64 = String(token || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const raw = b64 + pad
  try {
    // uni / 浏览器
    if (typeof atob === 'function') {
      const bin = atob(raw)
      try {
        return decodeURIComponent(
          Array.from(bin)
            .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
            .join(''),
        )
      } catch {
        return bin
      }
    }
  } catch {
    /* fallthrough */
  }
  return ''
}

export function parseWorkOrderQrToken(token) {
  try {
    const text = fromBase64Url(token)
    if (!text) return null
    const data = JSON.parse(text)
    if (!data || data.v !== 1 || !data.workOrderId) return null
    if (data.scope !== WORK_ORDER_QR_SCOPE.ORDER && data.scope !== WORK_ORDER_QR_SCOPE.PROCESS) {
      return null
    }
    return data
  } catch {
    return null
  }
}

const CLOSED_STATUSES = new Set(['已完成', '完成', '终止', '已关闭'])
const QR_GRACE_MS = 7 * 24 * 60 * 60 * 1000

function parseTime(val) {
  if (!val) return null
  const t = new Date(String(val).replace(/-/g, '/')).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * 从共享 storage 读工单（演示）
 */
export function getWorkOrderSnapshot(workOrderId) {
  if (!workOrderId) return null
  const keys = [
    'i_doms_work_orders',
    'i_doms_assembly_work_orders',
    'i_doms_disassembly_work_orders',
    'i_doms_qc_work_orders',
  ]
  for (const storageKey of keys) {
    try {
      let raw = uni.getStorageSync(storageKey)
      if (!raw && typeof localStorage !== 'undefined') raw = localStorage.getItem(storageKey)
      if (!raw) continue
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      const list = parsed?.orders
      if (!Array.isArray(list)) continue
      const hit = list.find((o) => o.id === workOrderId)
      if (hit) return hit
    } catch {
      /* ignore */
    }
  }
  return null
}

function isWorkOrderQrExpired(wo) {
  if (!wo) return false
  const status = String(wo.status || '')
  if (!CLOSED_STATUSES.has(status) && status !== '终止') return false
  const closedAt =
    parseTime(wo.closedAt) ||
    parseTime(wo.completedAt) ||
    parseTime(wo.terminatedAt) ||
    parseTime(wo.updatedAt)
  if (!closedAt) return false
  return Date.now() > closedAt + QR_GRACE_MS
}

function isWorkOrderClosedReadonly(wo) {
  if (!wo) return false
  const status = String(wo.status || '')
  return CLOSED_STATUSES.has(status) || status === '终止'
}

/**
 * 解析扫码落地
 * @returns {{ ok, landType, workOrderId?, processTaskId?, message?, tip? }}
 */
export function resolveWorkOrderQrToken(token, { tasks = [], user } = {}) {
  const payload = parseWorkOrderQrToken(token)
  if (!payload) {
    return { ok: false, landType: 'expired', message: '二维码无效或已损坏' }
  }

  const wo = getWorkOrderSnapshot(payload.workOrderId)
  // 无共享工单快照时仍允许按任务库解析（纯移动演示数据）
  if (wo && isWorkOrderQrExpired(wo)) {
    return { ok: false, landType: 'expired', message: '工单已关闭超过 7 天，链接已失效' }
  }

  const woTasks = (tasks || []).filter(
    (t) => t && t.workOrderId === payload.workOrderId && !t.hiddenByTerminate,
  )

  if (payload.scope === WORK_ORDER_QR_SCOPE.ORDER) {
    if (!woTasks.length && !wo) {
      return { ok: false, landType: 'expired', message: '未找到工单或工序任务' }
    }
    if (wo && isWorkOrderClosedReadonly(wo)) {
      return {
        ok: true,
        landType: 'wo_task_list',
        workOrderId: payload.workOrderId,
        message: '工单已关闭，仅可查看任务状态',
        readonly: true,
      }
    }
    return {
      ok: true,
      landType: 'wo_task_list',
      workOrderId: payload.workOrderId,
    }
  }

  // process scope
  let task = null
  if (payload.processTaskId) {
    task = woTasks.find((t) => t.id === payload.processTaskId) || null
  }
  if (!task && payload.processSeq != null) {
    const seq = Number(payload.processSeq)
    const sameSeq = woTasks.filter((t) => Number(t.processSeq) === seq)
    // 优先待领取、再待报工
    task =
      sameSeq.find((t) => t.taskStatus === '待领取' || t.placement === 'claim') ||
      sameSeq.find((t) => t.taskStatus === '待报工' || t.taskStatus === '待开始' || t.taskStatus === '执行中') ||
      sameSeq[0] ||
      null
  }

  if (!task) {
    return {
      ok: false,
      landType: 'expired',
      message: '未找到对应工序任务（可能尚未下发）',
      workOrderId: payload.workOrderId,
    }
  }

  if (wo && isWorkOrderClosedReadonly(wo)) {
    return {
      ok: true,
      landType: 'readonly',
      workOrderId: payload.workOrderId,
      processTaskId: task.id,
      message: '工单已关闭，仅可查看',
      tip: task.taskStatus === '已完成' ? '该工序已报工完成' : `任务状态：${task.taskStatus}`,
    }
  }

  const status = String(task.taskStatus || '')
  if (status === '已完成' || (Number(task.remainingQty) === 0 && Number(task.reportedTotalQty) > 0)) {
    return {
      ok: true,
      landType: 'readonly',
      workOrderId: payload.workOrderId,
      processTaskId: task.id,
      tip: '该工序已报工',
      message: '该工序已报工',
    }
  }

  const needClaim =
    (task.placement === 'claim' && status === '待领取') ||
    (status === '待领取' && !task.claimedBy)

  if (needClaim) {
    return {
      ok: true,
      landType: 'claim_detail',
      workOrderId: payload.workOrderId,
      processTaskId: task.id,
      message: '请先领取任务后再报工',
      tip: '请先领取任务后再报工',
    }
  }

  // 可报工状态
  const reportable = ['待报工', '待开始', '执行中', '待分发'].includes(status)
  if (reportable) {
    return {
      ok: true,
      landType: 'execute',
      workOrderId: payload.workOrderId,
      processTaskId: task.id,
    }
  }

  return {
    ok: true,
    landType: 'claim_detail',
    workOrderId: payload.workOrderId,
    processTaskId: task.id,
    tip: `任务状态：${status || '未知'}`,
  }
}
