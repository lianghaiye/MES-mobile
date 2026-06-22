/**
 * 小程序工时工资核算（与 WEB processReportWageCalc 对齐的简化版）
 */
import { resolveLaborConfig } from '@/utils/laborWageCalc'

function round2(val) {
  return Math.round((Number(val) || 0) * 100) / 100
}

const DEFAULT_SUBSIDY_UNIT_PRICE = 3

/** 与 WEB defectItemSeed 对齐的不良项折算规则 */
const DEFECT_ITEM_RULES = {
  'di-1': { apply: false },
  'di-2': { apply: true, mode: 'discount', discountRate: 0.8 },
  'di-3': { apply: true, mode: 'discount', discountRate: 0.75 },
  'di-4': { apply: false },
  'di-5': { apply: true, mode: 'discount', discountRate: 0.6 },
  'di-6': { apply: true, mode: 'discount', discountRate: 0.5 },
  'di-7': { apply: true, mode: 'discount', discountRate: 1 },
  'di-8': { apply: false },
  'di-9': { apply: true, mode: 'deduction', deductionAmount: 5 },
}

function resolveSubsidyMethod(line = {}) {
  if (line.subsidyMethod === 'qty' || line.subsidyMethod === 'fixed') return line.subsidyMethod
  if (Number(line.subsidyFixedAmount) > 0) return 'fixed'
  if (Number(line.subsidyReportQty) > 0 || Number(line.subsidyHours) > 0) return 'qty'
  return ''
}

function getApprovedGoodQty(line = {}) {
  return line.adjustedGoodQty != null ? Number(line.adjustedGoodQty) || 0 : Number(line.goodQty) || 0
}

function getApprovedDefectQty(line = {}) {
  return line.adjustedDefectQty != null
    ? Number(line.adjustedDefectQty) || 0
    : Number(line.defectQty) || 0
}

function getApprovedWorkHours(line = {}, config = null) {
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
  return Number(line.workHours) || 0
}

function getSubsidyPieceQty(line = {}) {
  if (resolveSubsidyMethod(line) === 'fixed') return 0
  return Number(line.subsidyReportQty) || 0
}

function getDefectBreakdown(line = {}) {
  if (line.adjustedDefectBreakdown?.length) return line.adjustedDefectBreakdown
  return line.defectBreakdown || []
}

function resolveBreakdownRules(breakdown = []) {
  return breakdown.map((row) => ({
    ...row,
    qty: Number(row.qty) || 0,
    rule: DEFECT_ITEM_RULES[row.id] || { apply: false },
  }))
}

function getUnitWage(config = {}) {
  const pieceRate = Number(config.pieceRate) || 0
  const hourlyRate = Number(config.standardHourlyRate) || 0
  const stdMin = Number(config.standardMinutesPerPiece) || 0
  if (config.salaryMethod === '计件工资') return pieceRate
  if (config.salaryMethod === '计时工资' && config.reportType === '批量计件') {
    return round2((stdMin / 60) * hourlyRate)
  }
  return 0
}

function getUnitDeductionAmount(fixedDeductionAmount, stdMin) {
  const hoursPerPiece = (Number(stdMin) || 0) / 60
  if (!hoursPerPiece) return 0
  return round2((Number(fixedDeductionAmount) || 0) / hoursPerPiece)
}

function resolveSubsidyWage(line = {}, config = {}) {
  const method = resolveSubsidyMethod(line)
  if (method === 'fixed') return round2(Number(line.subsidyFixedAmount) || 0)
  const unitPrice = Number(config.subsidyUnitPrice) || DEFAULT_SUBSIDY_UNIT_PRICE
  const qty = getSubsidyPieceQty(line)
  if (config.salaryMethod === '计件工资') {
    return round2(qty * (Number(config.pieceRate) || unitPrice))
  }
  const hours = Number(line.subsidyHours) || 0
  if (hours > 0) return round2(hours * (Number(config.standardHourlyRate) || 0))
  return round2(qty * unitPrice)
}

export function calcFinalPieceQty(line = {}) {
  return round2(getApprovedGoodQty(line) + getApprovedDefectQty(line) + getSubsidyPieceQty(line))
}

/** 报工数据卡片：按工人原始报工数核算的工时（不含调整、补贴） */
export function calcReportAccountHours(config, record = {}) {
  const reportType = config?.reportType || ''
  const salaryMethod = config?.salaryMethod || ''
  if (salaryMethod !== '计时工资' || reportType !== '批量计件') return null

  const goodQty = Number(record.goodQty) || 0
  const defectQty = Number(record.defectQty) || 0
  const totalQty = goodQty + defectQty
  const prepMin = Number(config.setupMinutesPerBatch) || 0
  const stdMin = Number(config.standardMinutesPerPiece) || 0
  const prepHours = round2(prepMin / 60)
  const breakdownRules = resolveBreakdownRules(record.defectBreakdown || [])

  let discountWeightedDefect = 0
  const useHourlyDeductionMode = breakdownRules.some(
    (row) => row.rule?.apply && row.rule.mode === 'deduction',
  )

  breakdownRules.forEach((row) => {
    if (!row.rule?.apply || row.rule.mode !== 'discount') return
    discountWeightedDefect += (Number(row.qty) || 0) * row.rule.discountRate
  })

  const hoursQty = useHourlyDeductionMode ? totalQty : round2(goodQty + discountWeightedDefect)
  const processHours = round2((hoursQty * stdMin) / 60)
  return round2(prepHours + processHours)
}

/** 工序报工任务行工资核算（与 WEB calcProcessReportWage 对齐） */
export function calcMobileLaborWage(config, record = {}) {
  const line = {
    goodQty: record.goodQty,
    defectQty: record.defectQty,
    adjustedGoodQty: record.adjustedGoodQty,
    adjustedDefectQty: record.adjustedDefectQty,
    workHours: record.workHours,
    adjustedWorkHours: record.adjustedWorkHours,
    subsidyReportQty: record.subsidyReportQty,
    subsidyHours: record.subsidyHours,
    subsidyFixedAmount: record.subsidyFixedAmount,
    subsidyMethod: record.subsidyMethod,
    manualQualityDeduction: record.manualQualityDeduction,
    defectBreakdown: getDefectBreakdown(record),
    adjustedDefectBreakdown: record.adjustedDefectBreakdown,
  }

  const goodQty = getApprovedGoodQty(line)
  const defectQty = getApprovedDefectQty(line)
  const totalQty = goodQty + defectQty
  const pieceRate = Number(config?.pieceRate) || 0
  const hourlyRate = Number(config?.standardHourlyRate) || 0
  const stdMin = Number(config.standardMinutesPerPiece) || 0
  const prepMin = Number(config.setupMinutesPerBatch) || 0
  const prepHours = round2(prepMin / 60)
  const reportType = config?.reportType || ''
  const salaryMethod = config?.salaryMethod || ''
  const manualQualityDeduction = round2(Number(line.manualQualityDeduction) || 0)
  const breakdownRules = resolveBreakdownRules(getDefectBreakdown(line))
  const subsidyMethod = resolveSubsidyMethod(line)
  const subsidyQty = getSubsidyPieceQty(line)
  const subsidyHours = Number(line.subsidyHours) || 0
  const unitWage = getUnitWage(config)

  let defectWage = 0
  let qualityDeduction = 0
  let discountWeightedDefect = 0
  let unitDeductionSum = 0
  const useHourlyDeductionMode = breakdownRules.some(
    (row) => row.rule?.apply && row.rule.mode === 'deduction',
  )

  breakdownRules.forEach((row) => {
    if (!row.rule?.apply) return
    const qty = Number(row.qty) || 0
    if (row.rule.mode === 'discount') {
      discountWeightedDefect += qty * row.rule.discountRate
      if (salaryMethod === '计件工资' && reportType === '批量计件') {
        defectWage += round2(qty * pieceRate * row.rule.discountRate)
      }
    } else if (row.rule.mode === 'deduction') {
      if (salaryMethod === '计件工资' && reportType === '批量计件') {
        defectWage += round2(qty * pieceRate - qty * (row.rule.deductionAmount || 0))
      } else if (salaryMethod === '计时工资' && reportType === '批量计件') {
        unitDeductionSum += qty * getUnitDeductionAmount(row.rule.deductionAmount, stdMin)
      }
    }
  })

  let goodWage = 0
  let salaryAmount = 0
  let accountHours = 0
  let finalSalaryHours = 0
  let subsidyWage = 0

  if (salaryMethod === '计件工资' && reportType === '批量计件') {
    goodWage = round2(goodQty * pieceRate)
    subsidyWage = resolveSubsidyWage(line, config)
    salaryAmount = round2(goodWage + defectWage + subsidyWage - manualQualityDeduction)
    accountHours = round2((prepMin + goodQty * stdMin) / 60)
  } else if (salaryMethod === '计时工资' && reportType === '批量计件') {
    const hoursQty = useHourlyDeductionMode ? totalQty : round2(goodQty + discountWeightedDefect)
    const processHours = round2((hoursQty * stdMin) / 60)
    accountHours = round2(prepHours + processHours + subsidyHours)
    goodWage = round2(accountHours * hourlyRate)
    subsidyWage =
      subsidyMethod === 'fixed'
        ? round2(Number(line.subsidyFixedAmount) || 0)
        : subsidyHours > 0
          ? round2(subsidyHours * hourlyRate)
          : round2(subsidyQty * DEFAULT_SUBSIDY_UNIT_PRICE * hourlyRate)
    if (!useHourlyDeductionMode) {
      defectWage = round2(((discountWeightedDefect * stdMin) / 60) * hourlyRate)
    }
    qualityDeduction = round2(unitDeductionSum + manualQualityDeduction)
    salaryAmount = round2(
      goodWage + (subsidyMethod === 'fixed' ? subsidyWage : 0) - unitDeductionSum - manualQualityDeduction,
    )
  } else if (salaryMethod === '计时工资' && reportType === '时长报工') {
    const approvedHours = getApprovedWorkHours(line, config)
    finalSalaryHours = round2(approvedHours + subsidyHours)
    accountHours = round2(prepHours + approvedHours + subsidyHours)
    goodWage = round2((prepHours + approvedHours) * hourlyRate)
    subsidyWage = resolveSubsidyWage(line, config)
    salaryAmount = round2(goodWage + subsidyWage - manualQualityDeduction)
    defectWage = 0
  }

  defectWage = round2(defectWage)
  qualityDeduction = round2(qualityDeduction || manualQualityDeduction)

  const subsidyAmount =
    subsidyMethod === 'fixed'
      ? round2(Number(line.subsidyFixedAmount) || 0)
      : subsidyWage

  return {
    goodWage,
    defectWage,
    subsidyWage,
    subsidyAmount,
    subsidyReportQty: subsidyQty,
    subsidyHours,
    qualityDeduction,
    manualQualityDeduction,
    accountHours,
    finalSalaryHours,
    reportAccountHours: calcReportAccountHours(config, record),
    finalPieceQty: calcFinalPieceQty(line),
    salaryAmount: round2(Math.max(0, salaryAmount)),
    adjustedGoodQty: goodQty,
    adjustedDefectQty: defectQty,
    adjustedWorkHours: getApprovedWorkHours(line, config),
  }
}

export function enrichLaborWageFromRecord(record, bundle = {}) {
  const config = resolveLaborConfig(record.productCode, record.processName)
  const wage = calcMobileLaborWage(config, record)
  const subsidyMethod = resolveSubsidyMethod(record)

  return {
    id: record.id,
    source: 'process-report',
    laborOrderId: bundle.id || record.workOrderId || '',
    workOrderId: record.workOrderId || '',
    workOrderCode: record.workOrderNo || bundle.workOrderCode || '',
    workOrderName: bundle.workOrderName || record.productName || '',
    salesOrderNo: record.salesOrderNo || bundle.salesOrderNo || '',
    materialCode: record.productCode || '',
    materialName: record.productName || '',
    taskNo: record.taskNo || '',
    processName: record.processName || '',
    executor: record.reporter || '',
    operator: record.operator || record.reporter || '',
    taskStatus: record.taskStatus || (record.status === '已审核' ? '已审核' : '已报工'),
    pushStatus: record.pushStatus || '已推送',
    goodQty: Number(record.goodQty) || 0,
    defectQty: Number(record.defectQty) || 0,
    workHours: Number(record.workHours) || 0,
    reportQty: (Number(record.goodQty) || 0) + (Number(record.defectQty) || 0),
    reportDuration: Number(record.workHours) || 0,
    adjustedGoodQty: record.adjustedGoodQty ?? null,
    adjustedDefectQty: record.adjustedDefectQty ?? null,
    adjustedWorkHours: record.adjustedWorkHours ?? null,
    subsidyReportQty: wage.subsidyReportQty || 0,
    subsidyHours: wage.subsidyHours || 0,
    subsidyMethod,
    subsidyFixedAmount: Number(record.subsidyFixedAmount) || 0,
    subsidyReason: record.subsidyReason || '',
    goodWage: wage.goodWage,
    defectWage: wage.defectWage,
    subsidyAmount: wage.subsidyAmount,
    qualityDeduction: wage.qualityDeduction,
    manualQualityDeduction: wage.manualQualityDeduction,
    finalPieceQty: wage.finalPieceQty,
    reportAccountHours: wage.reportAccountHours,
    accountHours: wage.accountHours,
    finalAccountHours:
      config.reportType === '批量计件' && config.salaryMethod === '计时工资'
        ? wage.accountHours
        : config.reportType === '时长报工' && config.salaryMethod === '计时工资'
          ? wage.finalSalaryHours
          : null,
    salaryAmount: wage.salaryAmount,
    reportType: config.reportType,
    salaryMethod: config.salaryMethod,
    reportTypeLabel: `${config.reportType}+${config.salaryMethod}`,
    adjustReason: record.adjustReason || '',
    remark: record.remark || '',
    defectReasonLabel: record.defectReasonLabel || '',
    reportTime: record.taskEndTime || record.createdAt || '',
    pushedAt: record.pushedAt || record.createdAt || '',
  }
}

export const buildLaborWageItemFromRecord = enrichLaborWageFromRecord
