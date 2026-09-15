/**
 * @deprecated 请改用 @/mock/qcTask 或 @/utils/qcTaskBridge
 */
export {
  getQcList,
  getQcById,
  getPendingQcCount,
  submitQcInspection,
  inspectMethodOptions,
} from '@/utils/qcTaskBridge'

export const qcStatusOptions = ['待质检', '已完成', '已终止']
export const qcResultOptions = ['', '质检通过', '质检不通过', '部分通过']
export const lineQcResultOptions = ['合格', '不合格', '让步合格', '部分合格']
export const treatmentPlanOptions = ['返工', '换批次']
