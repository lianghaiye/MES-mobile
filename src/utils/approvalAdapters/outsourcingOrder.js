import { APPROVAL_BIZ, PENDING_STATUS } from '@/constants/approvalTypes'

function sumLineAmount(lines = []) {
  return lines.reduce((acc, line) => acc + (Number(line.totalPriceInTax ?? line.totalPriceExTax) || 0), 0)
}

export function isOutsourcingOrderPending(order) {
  return String(order?.status || '') === PENDING_STATUS
}

export function toOutsourcingApprovalItem(order) {
  if (!order) return null
  return {
    id: order.id,
    bizType: APPROVAL_BIZ.OUTSOURCING_ORDER,
    bizNo: order.orderNo || '',
    title: order.supplier || '外协订单',
    subtitle: order.workOrderName || '',
    applicant: order.creator || order.updater || '—',
    submittedAt: order.updatedAt || order.createdAt || order.planDate || '',
    amount: sumLineAmount(order.lineItems),
    status: order.status,
    raw: order,
  }
}

export function toOutsourcingDetailView(order) {
  const item = toOutsourcingApprovalItem(order)
  if (!item) return null
  return {
    ...item,
    headerFields: [
      { label: '外协单号', value: order.orderNo },
      { label: '外协供应商', value: order.supplier },
      { label: '外协名称', value: order.workOrderName || '—' },
      { label: '计划日期', value: order.planDate || '—' },
      { label: '销售单号', value: order.salesOrderNo || '—' },
      { label: '备注', value: order.remark || '—' },
    ],
    lineColumns: [
      { key: 'productName', label: '产品' },
      { key: 'specModel', label: '规格' },
      { key: 'planQty', label: '数量', suffixKey: 'unit' },
      { key: 'unitPriceExTax', label: '单价', money: true },
      { key: 'totalPriceExTax', label: '金额', money: true },
    ],
    lines: order.lineItems || [],
    approvalRecords: order.approvalRecords || [],
    warnings: [],
  }
}
