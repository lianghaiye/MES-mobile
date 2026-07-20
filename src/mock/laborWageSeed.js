/**
 * 小程序「工时工资」MOCK — 与 WEB 工序报工/工时管理数据对齐
 *
 * 场景覆盖（执行人 张三，均已推送）：
 * 1. 批量计件+计件：不良品打折 + 质量扣款
 * 2. 批量计件+计件：多原因不良折算
 * 3. 批量计件+计件：已审核 + 调整良品数
 * 4. 批量计件+计时：不良品扣减 + 补贴工时
 * 5. 批量计件+计时：补贴固定金额
 * 6. 时长报工+计时：补贴工时
 * 7. 时长报工+计时：不良品 + 调整工时
 * 8. 轴承工单：调整良品/不良 + 补贴金额
 * 9. 定子铁芯：三种有效计薪组合
 */
import { PUSH_STATUS, TASK_STATUS } from '@/utils/laborWageConstants'
import { buildLaborWageItemFromRecord } from '@/utils/laborWageBreakdown'

function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

function dateTime(day, time) {
  return `${day} ${time}`
}

function taskNo(day, seq) {
  return `T${day.replace(/-/g, '')}${String(seq).padStart(3, '0')}`
}

function createRecord(partial) {
  const goodQty = Number(partial.goodQty) || 0
  const defectQty = Number(partial.defectQty) || 0
  return {
    source: 'workorder',
    operator: partial.reporter || '张三',
    taskStatus: partial.status === '已审核' ? TASK_STATUS.AUDITED : TASK_STATUS.REPORTED,
    pushStatus: partial.pushStatus || PUSH_STATUS.PUSHED,
    ...partial,
    goodQty,
    defectQty,
  }
}

/** 与 WEB processReportTaskSeed 对齐的报工记录（推送给张三） */
function createProcessReportRecordsForWage() {
  const today = formatDate()
  const yesterday = daysAgo(1)
  const twoDaysAgo = daysAgo(2)

  return [
    // —— LH-MAT-01 批量计件+计件：不良打折 + 质量扣款 ——
    createRecord({
      id: 'pr-lh-01',
      workOrderId: 'wo-lh-demo-1',
      workOrderNo: 'WO202605270-LH01',
      taskNo: taskNo(today, 1),
      processName: '机加工',
      productName: '工时演示-批量计件计件',
      productCode: 'LH-MAT-01',
      reportMode: '批量计件',
      goodQty: 8,
      defectQty: 3,
      defectBreakdown: [
        { id: 'di-2', name: '有气孔', qty: 1 },
        { id: 'di-6', name: '尺寸超差', qty: 2 },
      ],
      reporter: '张三',
      status: '待审核',
      pushStatus: PUSH_STATUS.PUSHED,
      pushedAt: dateTime(today, '11:50:00'),
      taskEndTime: dateTime(today, '11:30'),
      createdAt: dateTime(today, '11:45'),
      manualQualityDeduction: 15,
      remark: '铸件气孔+尺寸超差，含质量扣款',
    }),

    // —— LH-MAT-01：三种不良原因折算 ——
    createRecord({
      id: 'pr-lh-01c',
      workOrderId: 'wo-lh-demo-1',
      workOrderNo: 'WO202605270-LH01',
      taskNo: taskNo(today, 17),
      processName: '机加工',
      productName: '工时演示-批量计件计件',
      productCode: 'LH-MAT-01',
      reportMode: '批量计件',
      goodQty: 6,
      defectQty: 4,
      defectBreakdown: [
        { id: 'di-2', name: '有气孔', qty: 2 },
        { id: 'di-3', name: '有沙眼', qty: 1 },
        { id: 'di-6', name: '尺寸超差', qty: 1 },
      ],
      reporter: '张三',
      status: '待审核',
      pushStatus: PUSH_STATUS.AUTO_PUSHED,
      pushedAt: dateTime(today, '17:45:00'),
      taskEndTime: dateTime(today, '17:30'),
      createdAt: dateTime(today, '17:40'),
      remark: '机加工-三种不良原因折算',
    }),

    // —— LH-MAT-01：已审核 + 调整良品数 ——
    createRecord({
      id: 'pr-lh-01b',
      workOrderId: 'wo-lh-demo-1',
      workOrderNo: 'WO202605270-LH01',
      taskNo: taskNo(yesterday, 2),
      processName: '机加工',
      productName: '工时演示-批量计件计件',
      productCode: 'LH-MAT-01',
      reportMode: '批量计件',
      goodQty: 10,
      defectQty: 0,
      reporter: '张三',
      status: '已审核',
      adjustedGoodQty: 9,
      adjustedDefectQty: 0,
      adjustReason: '复核后扣减 1 件良品',
      pushedAt: dateTime(yesterday, '17:25:00'),
      taskEndTime: dateTime(yesterday, '17:00'),
      createdAt: dateTime(yesterday, '17:20'),
    }),

    // —— LH-MAT-02 批量计件+计时：不良扣减 + 补贴工时 ——
    createRecord({
      id: 'pr-lh-02b',
      workOrderId: 'wo-lh-demo-2',
      workOrderNo: 'ZZGD202605270-LH02',
      taskNo: taskNo(today, 4),
      processName: '领料',
      productName: '工时演示-批量计件计时',
      productCode: 'LH-MAT-02',
      reportMode: '批量计件',
      goodQty: 5,
      defectQty: 2,
      defectBreakdown: [
        { id: 'di-2', name: '有气孔', qty: 1 },
        { id: 'di-3', name: '有沙眼', qty: 1 },
      ],
      reporter: '张三',
      status: '待审核',
      subsidyHours: 0.5,
      subsidyReason: '补录等待物料时间',
      pushedAt: dateTime(today, '15:55:00'),
      taskEndTime: dateTime(today, '15:30'),
      createdAt: dateTime(today, '15:50'),
      remark: '计时工资-不良扣减+补贴工时',
    }),

    // —— LH-MAT-02：补贴固定金额 ——
    createRecord({
      id: 'pr-lh-02-subsidy-fixed',
      workOrderId: 'wo-lh-demo-2',
      workOrderNo: 'ZZGD202605270-LH02',
      taskNo: taskNo(yesterday, 18),
      processName: '领料',
      productName: '工时演示-批量计件计时',
      productCode: 'LH-MAT-02',
      reportMode: '批量计件',
      goodQty: 8,
      defectQty: 0,
      reporter: '张三',
      status: '已审核',
      subsidyMethod: 'fixed',
      subsidyFixedAmount: 50,
      subsidyReason: '夜班津贴',
      pushedAt: dateTime(yesterday, '17:50:00'),
      taskEndTime: dateTime(yesterday, '10:15'),
      createdAt: dateTime(yesterday, '17:45'),
      remark: '补贴固定金额 50 元',
    }),

    // —— LH-MAT-03 时长报工+计时：补贴工时 ——
    createRecord({
      id: 'pr-lh-03b',
      workOrderId: 'wo-lh-demo-3',
      workOrderNo: 'WO202605270-LH03',
      taskNo: taskNo(twoDaysAgo, 6),
      processName: '调试',
      productName: '工时演示-时长计时',
      productCode: 'LH-MAT-03',
      reportMode: '时长报工',
      goodQty: 4,
      defectQty: 1,
      defectBreakdown: [{ id: 'di-7', name: '表面划伤', qty: 1 }],
      workHours: 2.8,
      reporter: '张三',
      status: '已审核',
      subsidyHours: 0.5,
      subsidyReason: '客户加急补时',
      pushedAt: dateTime(twoDaysAgo, '16:35:00'),
      taskEndTime: dateTime(twoDaysAgo, '16:18'),
      createdAt: dateTime(twoDaysAgo, '16:30'),
      remark: '时长计时-补贴工时 0.5h',
    }),

    // —— LH-MAT-04 时长报工+计时：不良 + 调整工时 ——
    createRecord({
      id: 'pr-lh-04',
      workOrderId: 'wo-lh-demo-4',
      workOrderNo: 'WO202605270-LH04',
      taskNo: taskNo(today, 7),
      processName: '检验',
      productName: '工时演示-时长计时',
      productCode: 'LH-MAT-04',
      reportMode: '时长报工',
      goodQty: 4,
      defectQty: 2,
      defectBreakdown: [
        { id: 'di-6', name: '尺寸超差', qty: 1 },
        { id: 'di-1', name: '其他', qty: 1 },
      ],
      workHours: 2.5,
      adjustedWorkHours: 2.2,
      reporter: '张三',
      status: '待审核',
      adjustReason: '复核后扣减无效等待 0.3h',
      pushedAt: dateTime(today, '11:45:00'),
      taskEndTime: dateTime(today, '11:30'),
      createdAt: dateTime(today, '11:40'),
      remark: '时长计时-调整报工时长',
    }),

    // —— CP2510001 粗车：已审核 + 调整良品不良（计时） ——
    createRecord({
      id: 'pr-init-1',
      workOrderId: 'wo-init-1',
      workOrderNo: 'WO202505280-001',
      taskNo: 'T20260610001',
      processName: '粗车',
      productName: '下导轴承座毛坯',
      productCode: 'CP2510001',
      reportMode: '批量计件',
      goodQty: 10,
      defectQty: 3,
      defectBreakdown: [
        { id: 'di-2', name: '有气孔', qty: 1 },
        { id: 'di-9', name: '裂纹', qty: 1 },
        { id: 'di-3', name: '有沙眼', qty: 1 },
      ],
      reporter: '张三',
      status: '已审核',
      adjustedGoodQty: 9,
      adjustedDefectQty: 3,
      adjustReason: '复核后按实际合格数调整',
      pushedAt: '2026-06-10 16:25:00',
      taskEndTime: dateTime('2026-06-10', '11:30'),
      createdAt: dateTime('2026-06-10', '16:20'),
    }),

    // —— CP2510002 轴承装配：调整良品/不良 ——
    createRecord({
      id: 'pr-init-2b',
      workOrderId: 'wo-init-2',
      workOrderNo: 'WO202505280-002',
      taskNo: taskNo(today, 11),
      processName: '轴承装配',
      productName: '上导轴承座',
      productCode: 'CP2510002',
      reportMode: '批量计件',
      goodQty: 18,
      defectQty: 0,
      adjustedGoodQty: 17,
      adjustedDefectQty: 2,
      adjustedDefectBreakdown: [
        { id: 'di-7', name: '表面划伤', qty: 1 },
        { id: 'di-2', name: '有气孔', qty: 1 },
      ],
      adjustReason: '复核发现划伤与气孔各 1 件',
      reporter: '张三',
      status: '待审核',
      pushedAt: dateTime(today, '15:15:00'),
      taskEndTime: dateTime(today, '12:00'),
      createdAt: dateTime(today, '15:10'),
      remark: '第二批装配-调整后不良折算',
    }),

    // —— CP2510002 领料：补贴金额 + 已审核（对应截图 T20260621012） ——
    createRecord({
      id: 'pr-init-2c',
      workOrderId: 'wo-init-2',
      workOrderNo: 'WO202505280-002',
      taskNo: taskNo(yesterday, 12),
      processName: '领料',
      productName: '上导轴承座',
      productCode: 'CP2510002',
      reportMode: '批量计件',
      goodQty: 20,
      defectQty: 0,
      reporter: '张三',
      status: '已审核',
      subsidyMethod: 'fixed',
      subsidyFixedAmount: 50,
      subsidyReason: '搬运补贴',
      pushedAt: dateTime(yesterday, '17:50:00'),
      taskEndTime: dateTime(yesterday, '10:15'),
      createdAt: dateTime(yesterday, '17:45'),
      remark: '领料计时+补贴金额',
    }),

    // —— CP2510003 定子铁芯：计件领料 + 不良 ——
    createRecord({
      id: 'pr-init-3a',
      workOrderId: 'wo-init-3',
      workOrderNo: 'WO202505280-003',
      taskNo: taskNo(today, 13),
      processName: '领料',
      productName: '定子铁芯组件',
      productCode: 'CP2510003',
      reportMode: '批量计件',
      goodQty: 15,
      defectQty: 1,
      defectBreakdown: [{ id: 'di-2', name: '有气孔', qty: 1 }],
      reporter: '张三',
      status: '待审核',
      pushedAt: dateTime(today, '09:50:00'),
      taskEndTime: dateTime(today, '09:30'),
      createdAt: dateTime(today, '09:45'),
      remark: '定子铁芯领料-批量计件计件',
    }),

    // —— CP2510003 预装：计时 + 多不良 ——
    createRecord({
      id: 'pr-init-3b',
      workOrderId: 'wo-init-3',
      workOrderNo: 'WO202505280-003',
      taskNo: taskNo(today, 14),
      processName: '预装',
      productName: '定子铁芯组件',
      productCode: 'CP2510003',
      reportMode: '批量计件',
      goodQty: 14,
      defectQty: 3,
      defectBreakdown: [
        { id: 'di-7', name: '表面划伤', qty: 2 },
        { id: 'di-4', name: '焊渣', qty: 1 },
      ],
      reporter: '张三',
      status: '待审核',
      pushedAt: dateTime(today, '12:50:00'),
      taskEndTime: dateTime(today, '12:30'),
      createdAt: dateTime(today, '12:45'),
      remark: '定子铁芯预装-批量计件计时',
    }),

    // —— CP2510003 调试：时长计时 + 已审核 ——
    createRecord({
      id: 'pr-init-3c',
      workOrderId: 'wo-init-3',
      workOrderNo: 'WO202505280-003',
      taskNo: taskNo(yesterday, 15),
      processName: '调试',
      productName: '定子铁芯组件',
      productCode: 'CP2510003',
      reportMode: '时长报工',
      goodQty: 12,
      defectQty: 0,
      workHours: 4.0,
      reporter: '张三',
      status: '已审核',
      pushedAt: dateTime(yesterday, '17:55:00'),
      taskEndTime: dateTime(yesterday, '17:30'),
      createdAt: dateTime(yesterday, '17:50'),
      remark: '定子铁芯调试-时长计时',
    }),

    // —— 快速报工：热处理 时长计时 ——
    createRecord({
      id: 'pr-2',
      source: 'quick',
      workOrderNo: '',
      taskNo: taskNo(today, 22),
      processName: '热处理',
      productName: '泵壳',
      productCode: 'BK-2024-01',
      reportMode: '时长报工',
      goodQty: 12,
      defectQty: 0,
      workHours: 4.5,
      reporter: '张三',
      status: '待审核',
      pushStatus: PUSH_STATUS.PUSHED,
      pushedAt: dateTime(today, '10:20:00'),
      taskEndTime: dateTime(today, '12:30'),
      createdAt: dateTime(today, '10:15'),
      remark: '快速报工-时长计时',
    }),
  ]
}

const BUNDLE_META = {
  'wo-lh-demo-1': {
    workOrderName: '工时演示工单-批量计件计件',
    salesOrderNo: 'SO-LH-001',
  },
  'wo-lh-demo-2': {
    workOrderName: '工时演示工单-批量计件计时',
    salesOrderNo: 'SO-LH-002',
  },
  'wo-lh-demo-3': {
    workOrderName: '工时演示工单-时长计时',
    salesOrderNo: 'SO-LH-003',
  },
  'wo-lh-demo-4': {
    workOrderName: '工时演示工单-时长计时',
    salesOrderNo: 'SO-LH-004',
  },
  'wo-init-1': {
    workOrderName: '下导轴承座机加工工单',
    salesOrderNo: 'SO20250528001',
  },
  'wo-init-2': {
    workOrderName: '上导轴承座装配工单',
    salesOrderNo: 'SO20250528002',
  },
  'wo-init-3': {
    workOrderName: '定子铁芯装配工单',
    salesOrderNo: 'SO20250528003',
  },
}

export function createLaborWageSeed() {
  return createProcessReportRecordsForWage().map((record) => {
    const meta = BUNDLE_META[record.workOrderId] || {}
    const bundle = {
      id: record.workOrderId,
      workOrderCode: record.workOrderNo,
      workOrderName: meta.workOrderName || record.productName,
      salesOrderNo: meta.salesOrderNo || '',
    }
    return buildLaborWageItemFromRecord(record, bundle)
  })
}

export const LABOR_WAGE_SEED_VERSION = '8'
export const LABOR_WAGE_SEED_VERSION_KEY = 'i_doms_labor_wage_seed_v'
