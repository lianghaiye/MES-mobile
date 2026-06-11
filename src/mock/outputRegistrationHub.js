/** 登记产出 - 列表 hub（与工序报工共用工单数据源） */

import {
  getTodayAssignments,
  hasTodayAssignments,
} from './processReportAssignments'

export function getTodayRegistrationOrders(user) {
  return getTodayAssignments(user).map((wo) => {
    const targetQty = Math.max(...wo.processes.map((p) => p.targetQty || 0), 0)
    return {
      id: wo.id,
      workOrderNo: wo.workOrderNo,
      productName: wo.productName,
      productCode: wo.productCode,
      targetQty,
      processCount: wo.processes.length,
      processSummary: wo.processes.map((p) => p.name).join('、'),
    }
  })
}

export function hasTodayRegistrationOrders(user) {
  return hasTodayAssignments(user)
}

const FREQ_REG_KEY = 'i_doms_mobile_frequent_registrations'
const FREQ_LIMIT = 10

function defaultFrequent() {
  return [
    {
      id: 'freq-reg-1',
      productId: 'prod-1',
      productName: '货架支架',
      productCode: 'SJ-2024-A',
      routeName: '标准焊接工艺 v2',
      lastSummary: '昨天 登记25件 · 良品23 不良2',
    },
    {
      id: 'freq-reg-2',
      productId: 'prod-2',
      productName: '电机外壳',
      productCode: 'DJ-2024-B',
      routeName: '冲压工艺 v1',
      lastSummary: '前天 登记18件 · 良品16 不良2',
    },
    {
      id: 'freq-reg-3',
      productId: 'prod-3',
      productName: '法兰盘',
      productCode: 'FL-2024-C',
      routeName: '机加标准路线',
      lastSummary: '3天前 登记12件',
    },
  ]
}

export function getFrequentRegistrations() {
  let list = []
  try {
    const raw = uni.getStorageSync(FREQ_REG_KEY)
    if (raw) list = JSON.parse(raw)
  } catch {
    /* ignore */
  }
  if (!list.length) list = defaultFrequent()
  return list.slice(0, FREQ_LIMIT)
}

export function updateFrequentRegistration(payload) {
  const list = getFrequentRegistrations()
  const idx = list.findIndex((f) => f.productCode === payload.productCode)
  const total = (Number(payload.goodQty) || 0) + (Number(payload.defectQty) || 0)
  const row = {
    id: idx >= 0 ? list[idx].id : `freq-reg-${Date.now()}`,
    productId: payload.productId,
    productName: payload.productName,
    productCode: payload.productCode,
    routeName: payload.routeName || '',
    lastSummary: `今天 登记${total}件 · 良品${payload.goodQty || 0} 不良${payload.defectQty || 0}`,
  }
  if (idx >= 0) list.splice(idx, 1)
  list.unshift(row)
  uni.setStorageSync(FREQ_REG_KEY, JSON.stringify(list.slice(0, FREQ_LIMIT)))
}
