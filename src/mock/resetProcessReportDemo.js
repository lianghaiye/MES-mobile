import { resetProcessReportRecordDemoData } from './processReportRecords'
import { resetDisassemblyTaskDemoData } from './disassemblyTasks'
import { resetProcessAssignmentDemoData } from './processReportAssignments'
import { resetMaterialRequisitionDemoData } from '@/store/materialRequisitionStore'
import { resetProductInboundDemoData } from '@/store/productInboundStore'
import { resetInboundOrderDemoData } from '@/utils/inboundBridge'
import { resetInboundTaskDemoData } from '@/utils/inboundTaskStore'
import { resetOutboundOrderDemoData } from '@/utils/outboundBridge'
import { resetInventoryStockDemoData } from '@/utils/inventoryStockBridge'
import { resetStocktakeDemoData } from '@/utils/stocktakeBridge'

/** 工序报工演示数据：待领/今日任务 + 我的记录 + 常报工序 + 同步队列 */
export function resetProcessReportDemoData() {
  resetDisassemblyTaskDemoData()
  resetProcessReportRecordDemoData()
  resetProcessAssignmentDemoData()
}

export function resetMaterialFlowDemoData() {
  resetMaterialRequisitionDemoData()
  resetOutboundOrderDemoData()
  resetProductInboundDemoData()
  resetInboundOrderDemoData()
  resetInboundTaskDemoData()
  resetInventoryStockDemoData()
}

/** 工序报工 + 领料 + 入库 + 盘点 */
export function resetMobileDemoData() {
  resetProcessReportDemoData()
  resetMaterialFlowDemoData()
  resetStocktakeDemoData()
}
