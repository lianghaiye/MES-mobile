import { createInboundLineId } from '@/utils/productInboundNo'
import { resolveDefaultFinishedWarehouse } from '@/utils/warehouseBridge'
import { resolveInboundTypeByProduct, resolveProductInboundKind } from '@/utils/resolveInboundType'

/** 从已完成工单解析成品入库行（单产品） */
export function resolveWorkOrderProductLine(workOrder) {
  if (!workOrder) return null
  const warehouse =
    workOrder.warehouse || resolveDefaultFinishedWarehouse(workOrder.workCenter)
  const materialType = workOrder.raw?.materialType || workOrder.materialType || ''
  const productKind = resolveProductInboundKind({
    itemCode: workOrder.productCode || workOrder.raw?.materialCode || '',
    itemName: workOrder.productName || workOrder.name || '',
    materialType,
    warehouse,
    raw: workOrder.raw,
  })
  return {
    id: createInboundLineId(),
    itemCode: workOrder.productCode || workOrder.raw?.materialCode || '',
    itemName: workOrder.productName || workOrder.name || '',
    specModel: workOrder.raw?.specModel || workOrder.specModel || workOrder.spec || '',
    specAttr: workOrder.raw?.specAttr || '',
    material: workOrder.material || workOrder.raw?.material || '',
    drawingNo: workOrder.drawingNo || workOrder.raw?.drawingNo || '',
    unit: workOrder.raw?.inventoryUnit || '件',
    itemType: productKind === '半成品' ? '物料' : '产品',
    materialType: materialType || (productKind === '半成品' ? '半成品' : ''),
    inboundType: resolveInboundTypeByProduct({
      itemCode: workOrder.productCode || workOrder.raw?.materialCode || '',
      itemName: workOrder.productName || workOrder.name || '',
      materialType,
      warehouse,
      raw: workOrder.raw,
    }),
    qty: workOrder.scheduleQty || 1,
    warehouse,
    suggestedQty: workOrder.scheduleQty || 0,
  }
}

/** 从主数据产品创建快速入库行 */
export function createProductInboundLine(product, qty = 1) {
  const materialType = product.materialType || ''
  const warehouse = product.warehouse || resolveDefaultFinishedWarehouse()
  return {
    id: createInboundLineId(),
    itemCode: product.code,
    itemName: product.name,
    specModel: product.spec || product.specModel || '',
    specAttr: product.specAttr || '',
    material: product.material || '',
    drawingNo: product.drawingNo || '',
    unit: product.unit || '件',
    itemType: product.itemType === '物料' ? '物料' : '产品',
    materialType,
    inboundType: resolveInboundTypeByProduct({
      itemCode: product.code,
      itemName: product.name,
      materialType,
      warehouse,
    }),
    qty,
    warehouse,
    suggestedQty: 0,
    itemId: product.id || '',
  }
}

function mergeSourceWorkOrders(target = [], incoming = []) {
  const map = new Map()
  for (const source of [...target, ...incoming]) {
    if (!source?.workOrderId) continue
    const existing = map.get(source.workOrderId)
    if (!existing) {
      map.set(source.workOrderId, { ...source })
      continue
    }
    existing.qty = Number(existing.qty || 0) + Number(source.qty || 0)
  }
  return [...map.values()]
}

/** 合并多工单产品行，保留 sourceWorkOrders 溯源 */
export function mergeProductInboundLinesWithSources(lines = []) {
  const map = new Map()
  for (const line of lines) {
    const key = line.itemCode || line.itemName
    if (!key) continue
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        ...line,
        sourceWorkOrders: [...(line.sourceWorkOrders || [])],
      })
      continue
    }
    existing.qty = Number(existing.qty || 0) + Number(line.qty || 0)
    existing.suggestedQty = Number(existing.suggestedQty || 0) + Number(line.suggestedQty || 0)
    existing.sourceWorkOrders = mergeSourceWorkOrders(
      existing.sourceWorkOrders,
      line.sourceWorkOrders,
    )
  }
  return [...map.values()].filter((l) => Number(l.qty) > 0)
}

/** 解析多个已完成工单的成品入库行并合并 */
export function resolveBatchWorkOrderProductLines(workOrders = []) {
  const allLines = []
  const emptyWorkOrders = []
  for (const wo of workOrders) {
    const line = resolveWorkOrderProductLine(wo)
    if (!line?.itemCode) {
      emptyWorkOrders.push(wo)
      continue
    }
    allLines.push({
      ...line,
      sourceWorkOrders: [
        {
          workOrderId: wo.id,
          workOrderCode: wo.code,
          qty: Number(line.qty) || 0,
        },
      ],
    })
  }
  return {
    lines: mergeProductInboundLinesWithSources(allLines),
    emptyWorkOrders,
  }
}
