/** 工序报工类型（与 WEB 工序配置 reportMode 一致） */

const LEGACY_REPORT_MODE_MAP = {
  按件数: '批量计件',
  按时长: '时长报工',
}

export function normalizeReportMode(mode) {
  if (!mode) return ''
  return LEGACY_REPORT_MODE_MAP[mode] || mode
}

export function defaultReportMode() {
  return '批量计件'
}

export function isDurationReportMode(mode) {
  return normalizeReportMode(mode) === '时长报工'
}

export function resolveReportMode(mode) {
  return normalizeReportMode(mode) || defaultReportMode()
}

/** 报工来源：任务报工 / 快速报工 */
export function displayReportSource(source) {
  return source === 'workorder' ? '任务报工' : '快速报工'
}

export function isQuickReportSource(source) {
  return source !== 'workorder'
}
