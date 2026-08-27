import { APPROVAL_BIZ, PENDING_STATUS } from '@/constants/approvalTypes'

function sumLineAmount(lines = []) {
  return lines.reduce((acc, line) => acc + (Number(line.totalPriceInTax ?? line.totalPriceExTax) || 0), 0)
}

export function isSalesOrderPending(order) {
  return String(order?.progressStatus || '') === PENDING_STATUS
}

export function toSalesApprovalItem(order) {
  if (!order) return null
  return {
    id: order.id,
    bizType: APPROVAL_BIZ.SALES_ORDER,
    bizNo: order.orderNo || '',
    title: order.customerName || '销售订单',
    subtitle: order.salesperson ? `业务员：${order.salesperson}` : '',
    applicant: order.creator || order.salesperson || '—',
    submittedAt: order.updatedAt || order.createdAt || order.documentDate || '',
    amount: sumLineAmount(order.lineItems),
    status: order.progressStatus,
    raw: order,
  }
}

export function toSalesDetailView(order) {
  const item = toSalesApprovalItem(order)
  if (!item) return null
  return {
    ...item,
    headerFields: [
      { label: '销售单号', value: order.orderNo },
      { label: '客户', value: order.customerName },
      { label: '业务员', value: order.salesperson },
      { label: '单据日期', value: order.documentDate },
      { label: '交货日期', value: order.deliveryDate || '—' },
      { label: '备注', value: order.remark || '—' },
    ],
    lineColumns: [
      { key: 'productName', label: '产品' },
      { key: 'specModel', label: '规格' },
      { key: 'salesQty', label: '数量', suffixKey: 'unit' },
      { key: 'unitPriceExTax', label: '单价', money: true },
      { key: 'totalPriceExTax', label: '金额', money: true },
    ],
    lines: (order.lineItems || []).map((line) => ({
      ...line,
      salesQty: line.salesQty ?? line.qty,
      unit: line.unit || '件',
    })),
    approvalRecords: order.approvalRecords || [],
    warnings: [],
  }
}
