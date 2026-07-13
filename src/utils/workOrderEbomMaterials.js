import { createLineId } from '@/utils/materialRequisitionNo'
import { enrichLinesWithStock, resolvePickWarehouseForItem } from '@/utils/inventoryStockBridge'

const BOM_STORAGE_KEY = 'i_doms_product_bom'

function loadProductBoms() {
  try {
    const raw = uni.getStorageSync(BOM_STORAGE_KEY)
    if (!raw) return []
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return parsed?.boms || []
  } catch {
    return []
  }
}

function getBomById(bomId) {
  if (!bomId) return null
  return loadProductBoms().find((b) => String(b.id) === String(bomId)) || null
}

function flattenMaterialTree(materials = [], scheduleQty = 1, acc = []) {
  for (const mat of materials || []) {
    const unitUsage = Number(mat.unitUsage) || 1
    const demandQty = mat.demandQty ?? unitUsage * scheduleQty
    acc.push({
      id: mat.id || createLineId(),
      itemCode: mat.code || mat.materialCode || '',
      itemName: mat.name || mat.itemName || '',
      specModel: mat.spec || mat.specModel || '',
      material: mat.material || '',
      drawingNo: mat.drawingNo || '',
      unit: mat.unit || '件',
      unitUsage,
      suggestedQty: Number(demandQty) || 0,
      shipQty: Number(demandQty) || 0,
      lineSource: 'EBOM',
      itemId: mat.itemId || '',
    })
    if (mat.children?.length) {
      flattenMaterialTree(mat.children, scheduleQty, acc)
    }
  }
  return acc
}

function fromComponentLines(lines = [], scheduleQty = 1) {
  return lines.map((line) => {
    const unitQty = Number(line.unitQty) || 1
    const requiredQty = line.requiredQty ?? unitQty * scheduleQty
    return {
      id: line.id || createLineId(),
      itemCode: line.itemCode || line.materialCode || '',
      itemName: line.itemName || '',
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      unit: line.unit || '件',
      unitUsage: unitQty,
      suggestedQty: Number(requiredQty) || 0,
      shipQty: Number(requiredQty) || 0,
      lineSource: 'EBOM',
      itemId: line.itemId || '',
    }
  })
}

function fromBomLineItems(bom, scheduleQty = 1) {
  if (!bom?.lineItems?.length) return []
  const qty = Number(scheduleQty) || 1
  return bom.lineItems.map((line, index) => {
    const unitQty = Number(line.unitQty) || 1
    const demandQty = unitQty * qty
    return {
      id: line.id || `bom-line-${index}`,
      itemCode: line.materialCode || line.itemCode || '',
      itemName: line.itemName || '',
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || '',
      unit: line.unit || '件',
      unitUsage: unitQty,
      suggestedQty: demandQty,
      shipQty: demandQty,
      lineSource: 'EBOM',
      itemId: line.itemId || '',
    }
  })
}

function fromDisassemblyEbomTree(nodes = [], scheduleQty = 1, acc = []) {
  for (const node of nodes || []) {
    const unitQty = Number(node.unitQty) || 1
    const demandQty = unitQty * scheduleQty
    acc.push({
      id: node.id || createLineId(),
      itemCode: node.materialCode || '',
      itemName: node.materialName || '',
      specModel: node.specModel || '',
      material: node.material || '',
      drawingNo: node.drawingNo || '',
      unit: node.unit || '件',
      unitUsage: unitQty,
      suggestedQty: demandQty,
      shipQty: demandQty,
      lineSource: 'EBOM',
    })
    if (node.children?.length) {
      fromDisassemblyEbomTree(node.children, demandQty, acc)
    }
  }
  return acc
}

/** 根据工单解析 EBOM 下级物料，输出领料明细行 */
export function resolveWorkOrderMaterialLines(workOrder) {
  if (!workOrder || workOrder.skipEbom) return []

  const scheduleQty = Number(workOrder.scheduleQty) || 1
  let lines = []

  if (workOrder.ebomSnapshot?.materials?.length) {
    lines = flattenMaterialTree(workOrder.ebomSnapshot.materials, scheduleQty)
  } else if (Array.isArray(workOrder.ebomSnapshot) && workOrder.ebomSnapshot.length) {
    lines = fromDisassemblyEbomTree(workOrder.ebomSnapshot, scheduleQty)
  } else if (workOrder.componentLines?.length) {
    lines = fromComponentLines(workOrder.componentLines, scheduleQty)
  } else {
    const bom = getBomById(workOrder.bomId)
    if (bom) lines = fromBomLineItems(bom, scheduleQty)
  }

  return enrichLinesWithStock(lines)
}

export function createManualMaterialLine(item, qty = 1, warehouse) {
  const wh = warehouse || resolvePickWarehouseForItem(item)
  return enrichLinesWithStock(
    [
      {
        id: createLineId(),
        itemCode: item.code || item.itemCode || '',
        itemName: item.name || item.itemName || '',
        specModel: item.spec || item.specModel || '',
        material: item.material || '',
        drawingNo: item.drawingNo || '',
        unit: item.unit || '件',
        unitUsage: 1,
        suggestedQty: 0,
        shipQty: Number(qty) || 1,
        lineSource: '手工添加',
        itemId: item.id || '',
        itemType: item.itemType || '物料',
        shipWarehouse: warehouse,
      },
    ],
    warehouse,
  )[0]
}

export function mergeMaterialLines(lines = []) {
  const map = new Map()
  for (const line of lines) {
    const key = line.itemCode || line.itemName
    if (!key) continue
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...line })
      continue
    }
    existing.shipQty = Number(existing.shipQty || 0) + Number(line.shipQty || 0)
    if (line.lineSource === '手工添加') existing.lineSource = '手工添加'
  }
  return [...map.values()].filter((l) => Number(l.shipQty) > 0)
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

/** 为明细行附加来源工单溯源 */
export function attachWorkOrderSourceToLines(workOrder, lines = []) {
  const workOrderId = workOrder.id
  const workOrderCode = workOrder.code
  return lines.map((line) => ({
    ...line,
    sourceWorkOrders: [
      {
        workOrderId,
        workOrderCode,
        qty: Number(line.shipQty) || 0,
      },
    ],
  }))
}

/** 合并多工单物料行，保留 sourceWorkOrders 溯源 */
export function mergeMaterialLinesWithSources(lines = []) {
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
    existing.shipQty = Number(existing.shipQty || 0) + Number(line.shipQty || 0)
    existing.suggestedQty = Number(existing.suggestedQty || 0) + Number(line.suggestedQty || 0)
    existing.sourceWorkOrders = mergeSourceWorkOrders(
      existing.sourceWorkOrders,
      line.sourceWorkOrders,
    )
    if (line.lineSource === '手工添加') existing.lineSource = '手工添加'
  }
  return [...map.values()].filter((l) => Number(l.shipQty) > 0)
}

/** 解析多个工单的 EBOM 物料并合并 */
export function resolveBatchWorkOrderMaterialLines(workOrders = []) {
  const allLines = []
  const emptyWorkOrders = []
  for (const wo of workOrders) {
    const lines = resolveWorkOrderMaterialLines(wo)
    if (!lines.length) {
      emptyWorkOrders.push(wo)
      continue
    }
    allLines.push(...attachWorkOrderSourceToLines(wo, lines))
  }
  return {
    lines: mergeMaterialLinesWithSources(allLines),
    emptyWorkOrders,
  }
}
