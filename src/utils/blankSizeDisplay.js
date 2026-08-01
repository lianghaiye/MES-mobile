/** 下料尺寸展示（与 WEB bomBlankSize 文案规则对齐，仅用于领料等只读展示） */

const BLANK_SIZE_FIELDS = [
  { key: 'length', label: '长' },
  { key: 'width', label: '宽' },
  { key: 'height', label: '高' },
  { key: 'thickness', label: '厚' },
  { key: 'innerDiameter', label: '内径' },
  { key: 'outerDiameter', label: '外径' },
]

function formatNum(val) {
  const n = Number(val)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (Math.abs(n - Math.round(n)) < 1e-12) return String(Math.round(n))
  return String(n).replace(/\.?0+$/, '')
}

/** 从 blankSize 对象拼展示文案；无有效尺寸返回空串 */
export function formatBlankSizeText(blankSize) {
  if (!blankSize || typeof blankSize !== 'object') return ''
  const units = blankSize.units && typeof blankSize.units === 'object' ? blankSize.units : {}
  const parts = []
  for (const f of BLANK_SIZE_FIELDS) {
    const text = formatNum(blankSize[f.key])
    if (!text) continue
    const unit = String(units[f.key] || blankSize[`${f.key}Unit`] || 'mm')
    parts.push(`${f.label}${text}${unit}`)
  }
  return parts.join(' ')
}

/** 行上优先 blankSizeText，否则由 blankSize 生成 */
export function resolveLineBlankSizeText(line) {
  const owned = String(line?.blankSizeText || '').trim()
  if (owned) return owned
  return formatBlankSizeText(line?.blankSize)
}
