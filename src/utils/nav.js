import { workbenchModules } from '@/config/modules'

export function openModule(mod) {
  if (mod.placeholder) {
    uni.navigateTo({
      url: `/pages/placeholder/index?title=${encodeURIComponent(mod.title)}`,
    })
    return
  }
  uni.navigateTo({ url: mod.path })
}

export function statusColor(status) {
  const map = {
    待质检: '#1677ff',
    已完成: '#52c41a',
    已终止: '#8c8c8c',
    质检通过: '#52c41a',
    质检不通过: '#ff4d4f',
    部分通过: '#faad14',
    待分发: '#07c160',
    待开始: '#07c160',
    执行中: '#07c160',
    已确认: '#52c41a',
    待确认: '#fa8c16',
  }
  return map[status] || '#8c8c8c'
}

export { workbenchModules }
