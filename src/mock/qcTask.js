/**
 * 质检任务数据层：转发 WEB 同源 bridge（不再使用独立 mock 种子）
 */
export {
  QC_BIZ_SCOPES,
  QC_BIZ_SCOPE_META,
  QC_TASK_STATUS,
  QC_TASK_RESULT,
  inspectMethodOptions,
  getQcBizScopeMeta,
  isInboundQcBizScope,
  getTreatmentPlanOptions,
  mapConclusionToResult,
  resolveLineResult,
  aggregateLineResults,
  needTreatment,
  getQcList,
  getQcById,
  getPendingQcCount,
  getQcScopePendingCounts,
  startQcInspection,
  submitQcInspection,
  ensureSharedQcDemoSeed,
} from '@/utils/qcTaskBridge'
