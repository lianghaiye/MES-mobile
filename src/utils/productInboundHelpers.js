import { createInboundLineId } from '@/utils/productInboundNo'
import { resolveDefaultFinishedWarehouse } from '@/utils/warehouseBridge'

/** 从已完成工单解析成品入库行（单产品） */
export function resolveWorkOrderProductLine(workOrder) {
  if (!workOrder) return null
  const warehouse = resolveDefaultFinishedWarehouse(workOrder.workCenter)
  return {
    id: createInboundLineId(),
    itemCode: workOrder.productCode || workOrder.raw?.materialCode || '',
    itemName: workOrder.productName || workOrder.name || '',
    specModel: workOrder.raw?.specModel || workOrder.spec || '',
    specAttr: workOrder.raw?.specAttr || '',
    material: workOrder.material || workOrder.raw?.material || '',
    drawingNo: workOrder.drawingNo || workOrder.raw?.drawingNo || '',
    unit: workOrder.raw?.inventoryUnit || '件',
    itemType: '产品',
    qty: workOrder.scheduleQty || 1,
    warehouse,
    suggestedQty: workOrder.scheduleQty || 0,
  }
}

/** 从主数据产品创建快速入库行 */
export function createProductInboundLine(product, qty = 1) {
  return {
    id: createInboundLineId(),
    itemCode: product.code,
    itemName: product.name,
    specModel: product.spec || product.specModel || '',
    specAttr: product.specAttr || '',
    material: product.material || '',
    drawingNo: product.drawingNo || '',
    unit: product.unit || '件',
    itemType: '产品',
    qty,
    warehouse: resolveDefaultFinishedWarehouse(),
    suggestedQty: 0,
    itemId: product.id || '',
  }
}
