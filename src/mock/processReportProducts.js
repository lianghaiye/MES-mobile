/** 快速报工产品列表 */

export const quickReportProducts = [
  {
    id: 'prod-1',
    name: '货架支架',
    code: 'SJ-2024-A',
    spec: 'L1200×W800×H2000',
    processNames: ['车削', '点焊', '打磨', '装配'],
  },
  {
    id: 'prod-2',
    name: '泵轴',
    code: 'BX-2024-03',
    spec: 'Φ50×L800 45#',
    processNames: ['车削', '铣削', '热处理'],
  },
  {
    id: 'prod-3',
    name: '泵壳',
    code: 'BK-2024-01',
    spec: 'HT200 铸铁',
    processNames: ['粗车', '热处理', '精车'],
  },
  {
    id: 'prod-4',
    name: '电机外壳',
    code: 'DJ-2024-B',
    spec: 'φ180mm',
    processNames: ['点焊', '打磨'],
  },
]

export function searchQuickProducts(keyword = '') {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return [...quickReportProducts]
  return quickReportProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(kw) ||
      p.code.toLowerCase().includes(kw) ||
      p.spec.toLowerCase().includes(kw),
  )
}

export function getQuickProductById(id) {
  return quickReportProducts.find((p) => p.id === id) || null
}

export function getQuickProductByCode(code = '') {
  const normalized = String(code).trim().toLowerCase()
  if (!normalized) return null
  return quickReportProducts.find((p) => p.code.toLowerCase() === normalized) || null
}
