/**
 * 工时工资核算（与 WEB 工序报工 demo 配置对齐，供小程序 MOCK 展示）
 */

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

/** 物料/产品 × 工序 → 工时工资配置 */
export const LABOR_CONFIG_BY_CODE = {
  'LH-MAT-01': {
    机加工: {
      reportType: '批量计件',
      salaryMethod: '计件工资',
      standardMinutesPerPiece: 30,
      setupMinutesPerBatch: 40,
      standardHourlyRate: 40,
      pieceRate: 15,
    },
  },
  'LH-MAT-02': {
    领料: {
      reportType: '批量计件',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 12,
      setupMinutesPerBatch: 50,
      standardHourlyRate: 38,
      pieceRate: 0,
    },
  },
  'LH-MAT-03': {
    调试: {
      reportType: '时长报工',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 10,
      setupMinutesPerBatch: 15,
      standardHourlyRate: 42,
      pieceRate: 0,
    },
  },
  'LH-MAT-04': {
    检验: {
      reportType: '时长报工',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 8,
      setupMinutesPerBatch: 10,
      standardHourlyRate: 45,
      pieceRate: 0,
    },
  },
  CP2510001: {
    粗车: {
      reportType: '批量计件',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 18,
      setupMinutesPerBatch: 45,
      standardHourlyRate: 42,
      pieceRate: 0,
    },
    精车: {
      reportType: '批量计件',
      salaryMethod: '计件工资',
      standardMinutesPerPiece: 15,
      setupMinutesPerBatch: 30,
      standardHourlyRate: 40,
      pieceRate: 22,
    },
  },
  CP2510002: {
    领料: {
      reportType: '批量计件',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 10,
      setupMinutesPerBatch: 45,
      standardHourlyRate: 38,
      pieceRate: 0,
    },
    轴承装配: {
      reportType: '批量计件',
      salaryMethod: '计件工资',
      standardMinutesPerPiece: 18,
      setupMinutesPerBatch: 40,
      standardHourlyRate: 40,
      pieceRate: 10,
    },
    总装: {
      reportType: '批量计件',
      salaryMethod: '计件工资',
      standardMinutesPerPiece: 20,
      setupMinutesPerBatch: 40,
      standardHourlyRate: 40,
      pieceRate: 25,
    },
  },
  CP2510003: {
    领料: {
      reportType: '批量计件',
      salaryMethod: '计件工资',
      standardMinutesPerPiece: 10,
      setupMinutesPerBatch: 30,
      standardHourlyRate: 38,
      pieceRate: 8,
    },
    预装: {
      reportType: '批量计件',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 14,
      setupMinutesPerBatch: 35,
      standardHourlyRate: 40,
      pieceRate: 0,
    },
    调试: {
      reportType: '时长报工',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 10,
      setupMinutesPerBatch: 15,
      standardHourlyRate: 42,
      pieceRate: 0,
    },
    入库: {
      reportType: '时长报工',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 8,
      setupMinutesPerBatch: 10,
      standardHourlyRate: 45,
      pieceRate: 0,
    },
  },
  'SJ-2024-A': {
    点焊: {
      reportType: '批量计件',
      salaryMethod: '计件工资',
      standardMinutesPerPiece: 15,
      setupMinutesPerBatch: 30,
      standardHourlyRate: 38,
      pieceRate: 8.5,
    },
  },
  'BX-2024-03': {
    车削: {
      reportType: '批量计件',
      salaryMethod: '计件工资',
      standardMinutesPerPiece: 22,
      setupMinutesPerBatch: 35,
      standardHourlyRate: 40,
      pieceRate: 12,
    },
  },
  'BK-2024-01': {
    热处理: {
      reportType: '时长报工',
      salaryMethod: '计时工资',
      standardMinutesPerPiece: 0,
      setupMinutesPerBatch: 20,
      standardHourlyRate: 42,
      pieceRate: 0,
    },
  },
}

export function resolveLaborConfig(productCode, processName) {
  const map = LABOR_CONFIG_BY_CODE[productCode] || {}
  const config = map[processName] || {
    reportType: '批量计件',
    salaryMethod: '计件工资',
    standardMinutesPerPiece: 20,
    setupMinutesPerBatch: 30,
    standardHourlyRate: 40,
    pieceRate: 10,
  }
  if (config.reportType === '时长报工' && config.salaryMethod === '计件工资') {
    return { ...config, salaryMethod: '计时工资', pieceRate: 0 }
  }
  return config
}

export function getApprovedGoodQty(line = {}) {
  return line.adjustedGoodQty != null ? Number(line.adjustedGoodQty) || 0 : Number(line.goodQty) || 0
}

export function getApprovedWorkHours(line = {}, config = null) {
  if (line.adjustedWorkHours != null && line.adjustedWorkHours !== '') {
    return Number(line.adjustedWorkHours) || 0
  }
  if (
    config?.reportType === '批量计件' &&
    config?.salaryMethod === '计时工资' &&
    line.adjustedGoodQty != null
  ) {
    const prep = Number(config.setupMinutesPerBatch) || 0
    const std = Number(config.standardMinutesPerPiece) || 0
    return round2((prep + getApprovedGoodQty(line) * std) / 60)
  }
  return Number(line.workHours ?? line.reportDuration) || 0
}

export function calcAccountHours(config, line) {
  if (!config) return 0
  const approvedQty = getApprovedGoodQty(line)
  const approvedDuration = getApprovedWorkHours(line, config)
  const prep = Number(config.setupMinutesPerBatch) || 0
  const std = Number(config.standardMinutesPerPiece) || 0

  if (config.reportType === '批量计件') {
    return round2((prep + approvedQty * std) / 60)
  }
  if (config.reportType === '时长报工') {
    return round2(prep / 60 + approvedDuration)
  }
  return 0
}

export function calcSalaryAmount(config, line) {
  if (!config) return 0
  const approvedQty = getApprovedGoodQty(line)
  const approvedDuration = getApprovedWorkHours(line, config)
  const subsidyQty = Number(line.subsidyReportQty) || 0
  const subsidyHours = Number(line.subsidyHours) || 0
  const subsidyFixed = Number(line.subsidyFixedAmount) || 0
  const qualityDeduction = Number(line.manualQualityDeduction) || 0
  const prep = Number(config.setupMinutesPerBatch) || 0
  const std = Number(config.standardMinutesPerPiece) || 0
  const hourlyRate = Number(config.standardHourlyRate) || 0
  const pieceRate = Number(config.pieceRate) || 0

  let salary = 0

  if (config.salaryMethod === '计件工资') {
    salary = round2(approvedQty * pieceRate + subsidyQty * pieceRate)
    if (subsidyFixed > 0) salary = round2(salary + subsidyFixed)
  } else if (config.salaryMethod === '计时工资') {
    let hours = 0
    if (config.reportType === '批量计件') {
      hours = round2((prep + approvedQty * std) / 60 + subsidyHours)
    } else if (config.reportType === '时长报工') {
      hours = round2(prep / 60 + approvedDuration + subsidyHours)
    }
    salary = round2(hours * hourlyRate)
    if (subsidyFixed > 0) salary = round2(salary + subsidyFixed)
  }

  return round2(Math.max(0, salary - qualityDeduction))
}

export function resolveSubsidyAmount(line = {}, config = {}) {
  const fixed = Number(line.subsidyFixedAmount) || 0
  if (fixed > 0) return round2(fixed)

  const qty = Number(line.subsidyReportQty) || 0
  const hours = Number(line.subsidyHours) || 0
  const pieceRate = Number(config.pieceRate) || 0
  const hourlyRate = Number(config.standardHourlyRate) || 0

  if (qty > 0 && config.salaryMethod === '计件工资') {
    return round2(qty * pieceRate)
  }
  if (hours > 0 && config.salaryMethod === '计时工资') {
    return round2(hours * hourlyRate)
  }
  if (qty > 0) return round2(qty * 3)
  return 0
}
