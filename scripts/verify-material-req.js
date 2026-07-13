/**
 * 领料管理联调脚本（Node 环境，内联核心逻辑避免 @ 别名）
 */
const storage = new Map()

global.uni = {
  getStorageSync(key) {
    return storage.get(key) || ''
  },
  setStorageSync(key, value) {
    storage.set(key, value)
  },
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

function mergeMaterialLinesWithSources(lines = []) {
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

function attachWorkOrderSourceToLines(workOrder, lines = []) {
  return lines.map((line) => ({
    ...line,
    sourceWorkOrders: [
      {
        workOrderId: workOrder.id,
        workOrderCode: workOrder.code,
        qty: Number(line.shipQty) || 0,
      },
    ],
  }))
}

function fromComponentLines(lines = [], scheduleQty = 1) {
  return lines.map((line) => {
    const unitQty = Number(line.unitQty) || 1
    const requiredQty = line.requiredQty ?? unitQty * scheduleQty
    return {
      itemCode: line.itemCode || '',
      itemName: line.itemName || '',
      shipQty: Number(requiredQty) || 0,
      lineSource: 'EBOM',
    }
  })
}

function resolveBatchWorkOrderMaterialLines(workOrders = []) {
  const allLines = []
  const emptyWorkOrders = []
  for (const wo of workOrders) {
    const lines = fromComponentLines(wo.componentLines || [], wo.scheduleQty || 1)
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

function run() {
  const batchWos = [
    {
      id: 'wo-mock-1',
      code: 'WO-062',
      scheduleQty: 10,
      componentLines: [
        { itemCode: 'MAT-001', itemName: '轴承座', unitQty: 2, requiredQty: 20 },
        { itemCode: 'MAT-002', itemName: '叶轮', unitQty: 1, requiredQty: 10 },
      ],
    },
    {
      id: 'wo-mock-1a',
      code: 'WO-063',
      scheduleQty: 10,
      componentLines: [
        { itemCode: 'MAT-001', itemName: '轴承座', unitQty: 1, requiredQty: 10 },
        { itemCode: 'MAT-003', itemName: '密封圈', unitQty: 2, requiredQty: 20 },
      ],
    },
    {
      id: 'wo-mock-1b',
      code: 'WO-064',
      scheduleQty: 10,
      componentLines: [
        { itemCode: 'MAT-002', itemName: '叶轮', unitQty: 1, requiredQty: 10 },
        { itemCode: 'MAT-001', itemName: '轴承座', unitQty: 1, requiredQty: 10 },
      ],
    },
  ]

  const { lines, emptyWorkOrders } = resolveBatchWorkOrderMaterialLines(batchWos)
  if (!lines.length) throw new Error('batch EBOM lines empty')
  if (emptyWorkOrders.length) throw new Error('unexpected empty work orders')

  const bearingLine = lines.find((line) => line.itemCode === 'MAT-001')
  if (!bearingLine) throw new Error('merged MAT-001 missing')
  if (Number(bearingLine.shipQty) !== 40) {
    throw new Error(`MAT-001 qty expected 40, got ${bearingLine.shipQty}`)
  }
  if ((bearingLine.sourceWorkOrders || []).length !== 3) {
    throw new Error('MAT-001 should have 3 source work orders')
  }

  const manualMerged = mergeMaterialLinesWithSources([
    {
      itemCode: 'MAT-999',
      itemName: '测试件',
      shipQty: 2,
      lineSource: 'EBOM',
      sourceWorkOrders: [{ workOrderId: 'wo-a', workOrderCode: 'WO-A', qty: 2 }],
    },
    {
      itemCode: 'MAT-999',
      itemName: '测试件',
      shipQty: 3,
      lineSource: 'EBOM',
      sourceWorkOrders: [{ workOrderId: 'wo-b', workOrderCode: 'WO-B', qty: 3 }],
    },
  ])
  if (manualMerged.length !== 1 || manualMerged[0].shipQty !== 5) {
    throw new Error('mergeMaterialLinesWithSources failed')
  }

  const batchRecord = {
    mode: 'batch-work-order',
    workOrderIds: batchWos.map((wo) => wo.id),
    workOrders: batchWos.map((wo) => ({ id: wo.id, code: wo.code })),
    salesOrderNo: '1-20260602-001',
    lineCount: lines.length,
    lines,
  }

  const outboundOrder = {
    outboundType: '领料出库',
    status: '待处理',
    sourceChannel: 'mini-program',
    sourceOrderNo: batchRecord.salesOrderNo,
    lineItems: lines.map((line) => ({
      itemCode: line.itemCode,
      shipQty: line.shipQty,
      lineSource: '工单领料',
      sourceWorkOrders: line.sourceWorkOrders || [],
    })),
  }

  const checks = [
    batchRecord.mode === 'batch-work-order',
    batchRecord.workOrderIds.length === 3,
    outboundOrder.outboundType === '领料出库',
    outboundOrder.lineItems.length === lines.length,
    outboundOrder.lineItems.some((l) => l.itemCode === 'MAT-001' && l.shipQty === 40),
  ]
  if (!checks.every(Boolean)) throw new Error('batch record/outbound structure check failed')

  console.log(
    JSON.stringify(
      {
        ok: true,
        message: '批量领料数据结构验证通过',
        workOrderCount: batchRecord.workOrderIds.length,
        lineCount: batchRecord.lineCount,
        mat001Qty: bearingLine.shipQty,
        mat001Sources: bearingLine.sourceWorkOrders.length,
      },
      null,
      2,
    ),
  )
}

run()
