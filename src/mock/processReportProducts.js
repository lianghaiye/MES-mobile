/** 快速报工产品列表 */

import { getFrequentReports } from './processReportRecords'
import { getProcessReportMode } from '@/utils/iodomsStorage'

const PICK_LIMIT = 10

/** 工序创建时间（演示：用于「最近常选」不足时按创建时间填充） */
export const processCreatedAt = {
  车削: '2026-06-08',
  铣削: '2026-06-07',
  点焊: '2026-06-06',
  打磨: '2026-06-05',
  装配: '2026-06-04',
  热处理: '2026-06-03',
  粗车: '2026-06-02',
  精车: '2026-06-01',
}

export const quickReportProducts = [
  {
    id: 'prod-1',
    name: '货架支架',
    code: 'SJ-2024-A',
    spec: 'L1200×W800×H2000',
    processNames: ['车削', '点焊', '打磨', '装配'],
    createdAt: '2026-05-28',
  },
  {
    id: 'prod-2',
    name: '泵轴',
    code: 'BX-2024-03',
    spec: 'Φ50×L800 45#',
    processNames: ['车削', '铣削', '热处理'],
    createdAt: '2026-06-06',
  },
  {
    id: 'prod-3',
    name: '泵壳',
    code: 'BK-2024-01',
    spec: 'HT200 铸铁',
    processNames: ['粗车', '热处理', '精车'],
    createdAt: '2026-06-05',
  },
  {
    id: 'prod-4',
    name: '电机外壳',
    code: 'DJ-2024-B',
    spec: 'φ180mm',
    processNames: ['点焊', '打磨'],
    createdAt: '2026-06-08',
  },
  {
    id: 'prod-5',
    name: '法兰盘',
    code: 'FL-2024-C',
    spec: 'DN150 PN16',
    processNames: ['点焊', '粗车', '精车'],
    createdAt: '2026-06-07',
  },
  {
    id: 'prod-6',
    name: '深井潜水泵',
    code: 'CP2610004',
    spec: 'QJ200-50/4',
    processNames: ['装配', '点焊', '精车'],
    createdAt: '2026-06-04',
  },
]

const PROCESS_ESTIMATE = {
  车削: '预计 30分钟/件',
  热处理: '预计 4小时/批',
}

function matchProductKeyword(product, kw) {
  if (!kw) return true
  return (
    product.name.toLowerCase().includes(kw) ||
    product.code.toLowerCase().includes(kw) ||
    product.spec.toLowerCase().includes(kw)
  )
}

function matchProcessKeyword(name, kw) {
  if (!kw) return true
  return String(name).toLowerCase().includes(kw)
}

function sortProductsByCreatedAt(list) {
  return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

function sortProcessNames(names) {
  return [...names].sort((a, b) =>
    (processCreatedAt[b] || '').localeCompare(processCreatedAt[a] || ''),
  )
}

export function buildQuickProcessItem(name) {
  return {
    name,
    reportMode: getProcessReportMode(name),
    estimate: PROCESS_ESTIMATE[name] || '',
  }
}

export function getQuickProductPickSections(keyword = '') {
  const kw = keyword.trim().toLowerCase()
  const recentIds = new Set()
  const recent = []

  for (const f of getFrequentReports()) {
    const product = getQuickProductByCode(f.productCode) || getQuickProductById(f.productId)
    if (!product || recentIds.has(product.id)) continue
    if (!matchProductKeyword(product, kw)) continue
    recentIds.add(product.id)
    recent.push(product)
    if (recent.length >= PICK_LIMIT) break
  }

  if (recent.length < PICK_LIMIT) {
    const fillers = sortProductsByCreatedAt(
      quickReportProducts.filter((p) => !recentIds.has(p.id) && matchProductKeyword(p, kw)),
    )
    for (const product of fillers) {
      recentIds.add(product.id)
      recent.push(product)
      if (recent.length >= PICK_LIMIT) break
    }
  }

  const all = sortProductsByCreatedAt(
    quickReportProducts.filter((p) => !recentIds.has(p.id) && matchProductKeyword(p, kw)),
  )

  return {
    recent,
    all,
    total: recent.length + all.length,
  }
}

export function getQuickProcessPickSections(product, keyword = '') {
  if (!product) return { recent: [], all: [], total: 0 }
  const kw = keyword.trim().toLowerCase()
  const names = product.processNames || []
  const recentNames = new Set()
  const recent = []

  for (const f of getFrequentReports()) {
    if (f.productCode !== product.code) continue
    if (!names.includes(f.processName)) continue
    if (recentNames.has(f.processName)) continue
    if (!matchProcessKeyword(f.processName, kw)) continue
    recentNames.add(f.processName)
    recent.push(buildQuickProcessItem(f.processName))
    if (recent.length >= PICK_LIMIT) break
  }

  if (recent.length < PICK_LIMIT) {
    const fillers = sortProcessNames(
      names.filter((name) => !recentNames.has(name) && matchProcessKeyword(name, kw)),
    )
    for (const name of fillers) {
      recentNames.add(name)
      recent.push(buildQuickProcessItem(name))
      if (recent.length >= PICK_LIMIT) break
    }
  }

  const all = sortProcessNames(
    names.filter((name) => !recentNames.has(name) && matchProcessKeyword(name, kw)),
  ).map(buildQuickProcessItem)

  return {
    recent,
    all,
    total: recent.length + all.length,
  }
}

/** @deprecated 使用 getQuickProductPickSections */
export function searchQuickProducts(keyword = '') {
  const { recent, all } = getQuickProductPickSections(keyword)
  return [...recent, ...all]
}

export function getQuickProductById(id) {
  return quickReportProducts.find((p) => p.id === id) || null
}

export function getQuickProductByCode(code = '') {
  const normalized = String(code).trim().toLowerCase()
  if (!normalized) return null
  return quickReportProducts.find((p) => p.code.toLowerCase() === normalized) || null
}
