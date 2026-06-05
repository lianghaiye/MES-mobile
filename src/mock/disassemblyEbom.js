/** 拆解执行用 EBOM 树（多级，与 PC 端 BOM 结构对齐） */

export const scrapReasonOptions = ['无', '磨损报废', '腐蚀损坏', '无法修复', '加工损坏', '其他']

/** 报废物料处理结果 */
export const scrapProcessResultOptions = ['直接弃用', '财务变现', '返修后再用']

export function disposeModeLabel(mode) {
  const map = {
    all_reuse: '全部回用',
    partial: '部分回用',
    all_scrap: '全部报废',
  }
  return map[mode] || '—'
}

function node(partial) {
  return {
    id: partial.id,
    level: partial.level,
    materialCode: partial.materialCode,
    materialName: partial.materialName,
    unitQty: partial.unitQty ?? 1,
    unit: partial.unit || '件',
    children: partial.children || [],
    hasChildren: Boolean(partial.children?.length),
  }
}

/** 污水泵 EBOM（含 3 级嵌套，用于演示逐级展开） */
export function buildSewagePumpEbom() {
  return [
    node({
      id: 'ebom-l1-1',
      level: 1,
      materialCode: '010040001',
      materialName: '泵体部件总成',
      unitQty: 1,
      children: [
        node({
          id: 'ebom-l2-1',
          level: 2,
          materialCode: '010050001',
          materialName: '泵体（泵壳）',
          unitQty: 1,
          children: [
            node({
              id: 'ebom-l3-1',
              level: 3,
              materialCode: '010050101',
              materialName: '泵体铸件',
              unitQty: 1,
            }),
            node({
              id: 'ebom-l3-2',
              level: 3,
              materialCode: '010050102',
              materialName: '连接法兰',
              unitQty: 2,
            }),
          ],
        }),
        node({
          id: 'ebom-l2-2',
          level: 2,
          materialCode: '010050002',
          materialName: '泵盖',
          unitQty: 1,
        }),
      ],
    }),
    node({
      id: 'ebom-l1-2',
      level: 1,
      materialCode: '010070014',
      materialName: '泵头部件总成',
      unitQty: 1,
      children: [
        node({
          id: 'ebom-l2-3',
          level: 2,
          materialCode: '010060001',
          materialName: '叶轮',
          unitQty: 1,
        }),
        node({
          id: 'ebom-l2-4',
          level: 2,
          materialCode: '010060002',
          materialName: '机械密封',
          unitQty: 1,
        }),
        node({
          id: 'ebom-l2-5',
          level: 2,
          materialCode: '010060003',
          materialName: '轴承组件',
          unitQty: 2,
          children: [
            node({
              id: 'ebom-l3-3',
              level: 3,
              materialCode: '010060301',
              materialName: '滚动轴承',
              unitQty: 2,
            }),
          ],
        }),
      ],
    }),
  ]
}

/** 测试质检一批一码 EBOM（较扁平） */
export function buildBatchQcEbom() {
  return [
    node({
      id: 'ebom-bq-1',
      level: 1,
      materialCode: '020010001',
      materialName: '电机总成',
      unitQty: 1,
      children: [
        node({
          id: 'ebom-bq-2',
          level: 2,
          materialCode: '020010101',
          materialName: '定子组件',
          unitQty: 1,
        }),
        node({
          id: 'ebom-bq-3',
          level: 2,
          materialCode: '020010102',
          materialName: '转子组件',
          unitQty: 1,
        }),
      ],
    }),
    node({
      id: 'ebom-bq-4',
      level: 1,
      materialCode: '020020001',
      materialName: '接线盒总成',
      unitQty: 1,
    }),
  ]
}

const ebomBuilders = {
  'ebom-sewage-pump': buildSewagePumpEbom,
  'ebom-batch-qc': buildBatchQcEbom,
  'ebom-centrifugal': buildSewagePumpEbom,
  'ebom-multi-stage': buildBatchQcEbom,
}

export function getEbomByKey(key) {
  const builder = ebomBuilders[key]
  if (!builder) return buildSewagePumpEbom()
  return JSON.parse(JSON.stringify(builder()))
}

/** 初始化执行状态：默认全部回用，一级自动展开 */
export function initEbomExecutionState(ebomNodes) {
  return ebomNodes.map((n) => initNodeState(n, true))
}

function initNodeState(raw, autoExpandLevel1) {
  const expanded = autoExpandLevel1 && raw.level === 1
  const disposeMode = 'all_reuse'
  const reuseQty = raw.unitQty
  const scrapQty = 0
  const children = (raw.children || []).map((c) => initNodeState(c, false))
  return {
    ...raw,
    expanded,
    disposeMode,
    reuseQty,
    scrapQty,
    scrapReason: '无',
    children,
    hasChildren: children.length > 0,
  }
}

/** 统计：未展开用本级可拆数量；已展开汇总子级 */
export function calcDisassemblyStats(nodes) {
  let reuse = 0
  let scrap = 0
  let dismantled = 0

  function walk(list) {
    for (const n of list) {
      if (n.hasChildren && n.expanded) {
        walk(n.children)
      } else {
        dismantled += n.unitQty
        reuse += n.reuseQty
        scrap += n.scrapQty
      }
    }
  }
  walk(nodes)
  return { dismantled, reuse, scrap }
}

/** 收集叶子节点（统计/校验用） */
export function flattenLeafNodes(nodes, out = []) {
  for (const n of nodes) {
    if (n.hasChildren && n.expanded) flattenLeafNodes(n.children, out)
    else out.push(n)
  }
  return out
}

/** 质检页只读展示：保留拆解结果，补充处理结果默认值 */
export function initQcDisplayState(ebomNodes) {
  return JSON.parse(JSON.stringify(ebomNodes)).map((n) => initQcNode(n))
}

function initQcNode(raw) {
  const children = (raw.children || []).map((c) => initQcNode(c))
  return {
    ...raw,
    children,
    hasChildren: children.length > 0,
    processResult: raw.processResult || (raw.scrapQty > 0 ? '直接弃用' : ''),
  }
}

export function setNodeDisposeMode(node, mode) {
  if (mode === 'all_reuse') {
    node.disposeMode = 'all_reuse'
    node.reuseQty = node.unitQty
    node.scrapQty = 0
    node.scrapReason = '无'
  } else if (mode === 'all_scrap') {
    node.disposeMode = 'all_scrap'
    node.reuseQty = 0
    node.scrapQty = node.unitQty
  } else {
    node.disposeMode = 'partial'
    if (node.reuseQty + node.scrapQty !== node.unitQty) {
      node.reuseQty = node.unitQty
      node.scrapQty = 0
    }
  }
}

export function updateNodeQty(node, field, value) {
  const max = node.unitQty
  let reuse = field === 'reuseQty' ? value : node.reuseQty
  let scrap = field === 'scrapQty' ? value : node.scrapQty
  reuse = Math.max(0, Math.min(max, Number(reuse) || 0))
  scrap = Math.max(0, Math.min(max, Number(scrap) || 0))
  if (reuse + scrap > max) {
    if (field === 'reuseQty') scrap = max - reuse
    else reuse = max - scrap
  }
  node.reuseQty = reuse
  node.scrapQty = scrap
  node.disposeMode = reuse === max && scrap === 0 ? 'all_reuse' : scrap === max && reuse === 0 ? 'all_scrap' : 'partial'
}
