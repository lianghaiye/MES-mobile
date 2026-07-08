import { formatDateTime } from '@/utils/productInboundNo'

export const MP_INBOUND_TASK_KEY = 'i_doms_mp_inbound_tasks'

function loadTasks() {
  try {
    const raw = uni.getStorageSync(MP_INBOUND_TASK_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveTasks(tasks) {
  uni.setStorageSync(MP_INBOUND_TASK_KEY, JSON.stringify(tasks))
}

export function getInboundTaskById(taskId) {
  if (!taskId) return null
  return loadTasks().find((t) => t.id === taskId) || null
}

export function upsertInboundTask(partial) {
  if (!partial?.id) return null
  const tasks = loadTasks()
  const idx = tasks.findIndex((t) => t.id === partial.id)
  const row = {
    status: '待开始',
    createdAt: formatDateTime(),
    ...(idx >= 0 ? tasks[idx] : {}),
    ...partial,
    updatedAt: formatDateTime(),
  }
  if (idx >= 0) tasks[idx] = row
  else tasks.unshift(row)
  saveTasks(tasks)
  return row
}
