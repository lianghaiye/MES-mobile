/** 工人小组（与 WEB 端共用 localStorage） */

const STORAGE_KEY = 'i_doms_employee_groups'

function createSeedGroups() {
  return [
    {
      id: 'eg-1',
      code: 'WG20260310002',
      name: '加工小组',
      workCenter: '机泵',
      position: '泵装配调试',
      status: '启用',
      leaderName: '张三',
      workers: [
        { id: 'emp-2', name: '张三', isLeader: true },
        { id: 'emp-3', name: '李四', isLeader: false },
        { id: 'emp-9', name: '赵六', isLeader: false },
      ],
    },
    {
      id: 'eg-2',
      code: 'WG20260310003',
      name: '总装小组',
      workCenter: '组装中心',
      position: '泵装配调试',
      status: '启用',
      leaderName: '孙琴丽',
      workers: [
        { id: 'emp-1', name: '孙琴丽', isLeader: true },
        { id: 'emp-4', name: '王五', isLeader: false },
      ],
    },
    {
      id: 'eg-4',
      code: 'WG20260310001',
      name: '机加小组',
      workCenter: '机泵',
      position: '车间工人',
      status: '启用',
      leaderName: '李四',
      workers: [
        { id: 'emp-3', name: '李四', isLeader: true },
        { id: 'emp-9', name: '赵六', isLeader: false },
      ],
    },
    {
      id: 'eg-5',
      code: 'WG20260310005',
      name: '焊接小组',
      workCenter: '机泵',
      position: '车间工人',
      status: '启用',
      leaderName: '王五',
      workers: [
        { id: 'emp-4', name: '王五', isLeader: true },
        { id: 'emp-2', name: '张三', isLeader: false },
      ],
    },
  ]
}

function loadGroups() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.groups) && parsed.groups.length) return parsed.groups
    }
  } catch {
    /* ignore */
  }
  return createSeedGroups()
}

export function getEmployeeGroupByName(name = '') {
  if (!name) return null
  return loadGroups().find((g) => g.name === name && g.status === '启用') || null
}

export function getGroupWorkers(groupName = '') {
  const group = getEmployeeGroupByName(groupName)
  if (!group) return []
  return (group.workers || []).map((w) => ({
    id: w.id,
    name: w.name,
    dept: group.name,
    workCenter: group.workCenter || group.name,
    isLeader: !!w.isLeader,
  }))
}

export function getGroupWorkerNames(groupName = '') {
  return getGroupWorkers(groupName).map((w) => w.name)
}

export function getUserWorkerGroupNames(user) {
  const names = resolveUserAliases(user)
  return loadGroups()
    .filter((g) => g.status === '启用')
    .filter((g) => (g.workers || []).some((w) => names.includes(w.name)))
    .map((g) => g.name)
}

function resolveUserAliases(user) {
  const displayName = user?.displayName || ''
  const username = user?.username || ''
  if (displayName === '管理员' || username === 'admin') {
    return ['管理员', 'admin', '张三']
  }
  if (!displayName && !username) return ['张三']
  return [...new Set([displayName, username].filter(Boolean))]
}

export function resolveWorkerDisplayName(user) {
  const aliases = resolveUserAliases(user)
  if (aliases.includes('张三')) return '张三'
  return aliases[0] || '张三'
}

export function resolveTaskGroupName(task = {}, user) {
  if (task.groupName) return task.groupName
  const userGroups = getUserWorkerGroupNames(user)
  return userGroups[0] || ''
}
