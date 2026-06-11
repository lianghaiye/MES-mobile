/** 与 WEB 端 localStorage 键名对齐的种子数据 */

export const DEFECT_ITEMS_KEY = 'i_doms_defect_items'
export const PROCESS_CONFIG_KEY = 'i_doms_process_config'
export const DEFECT_SEED_VERSION = 'i_doms_defect_items_seed_v'
export const PROCESS_SEED_VERSION = 'i_doms_process_config_seed_v'

export function createDefectItemSeed() {
  return [
    { id: 'di-1', code: 'qita', name: '其他', createdAt: '2025-12-31' },
    { id: 'di-2', code: 'BL202512310001', name: '有气孔', createdAt: '2025-12-31' },
    { id: 'di-3', code: 'BL202512310002', name: '有沙眼', createdAt: '2025-12-31' },
    { id: 'di-4', code: 'BL202512310003', name: '焊渣', createdAt: '2026-01-05' },
    { id: 'di-5', code: 'BL202512310004', name: '气孔', createdAt: '2026-01-05' },
    { id: 'di-6', code: 'BL202512310005', name: '尺寸超差', createdAt: '2026-01-05' },
    { id: 'di-7', code: 'BL202512310006', name: '表面划伤', createdAt: '2026-01-08' },
    { id: 'di-8', code: 'BL202512310007', name: '硬度不合格', createdAt: '2026-01-10' },
  ]
}

const PROCESS_DEFECT_MAP = {
  点焊: ['di-4', 'di-5', 'di-6'],
  打磨: ['di-6', 'di-7'],
  装配: ['di-1', 'di-7'],
  车削: ['di-2', 'di-3', 'di-6'],
  铣削: ['di-3', 'di-6'],
  热处理: ['di-8', 'di-1'],
  粗车: ['di-2', 'di-3'],
  精车: ['di-6', 'di-7'],
}

const PROCESS_REPORT_MODE = {
  点焊: '按件数',
  打磨: '按件数',
  装配: '按时长',
  车削: '按件数',
  铣削: '按件数',
  热处理: '按时长',
  粗车: '按件数',
  精车: '按件数',
}

function padCode(n) {
  return `GX${String(n).padStart(8, '0')}`
}

export function createProcessConfigSeed() {
  const names = [
    '点焊', '打磨', '装配', '车削', '铣削', '热处理', '粗车', '精车',
    '下料', '钻孔', '质检', '入库',
  ]
  return names.map((name, i) => ({
    id: `proc-m-${String(i + 1).padStart(3, '0')}`,
    code: padCode(i + 1),
    name,
    category: '机械',
    resourceType: '工人',
    position: '机加工岗',
    status: '使用中',
    reportMode: PROCESS_REPORT_MODE[name] || '按件数',
    defectItemIds: [...(PROCESS_DEFECT_MAP[name] || [])],
    defaultExecutors: [],
    createdAt: '2026-05-01',
    updatedAt: '2026-06-01',
  }))
}

export function ensureIodomsSeed() {
  if (uni.getStorageSync(DEFECT_SEED_VERSION) !== '1') {
    uni.setStorageSync(DEFECT_ITEMS_KEY, JSON.stringify({ items: createDefectItemSeed() }))
    uni.setStorageSync(DEFECT_SEED_VERSION, '1')
  }
  if (uni.getStorageSync(PROCESS_SEED_VERSION) !== '4') {
    uni.setStorageSync(PROCESS_CONFIG_KEY, JSON.stringify({ processes: createProcessConfigSeed() }))
    uni.setStorageSync(PROCESS_SEED_VERSION, '4')
  }
}
