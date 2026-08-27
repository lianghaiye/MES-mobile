import { APPROVAL_BIZ, PENDING_STATUS } from '@/constants/approvalTypes'

function sumLineAmount(lines = []) {
  return lines.reduce((acc, line) => acc + (Number(line.totalPriceInTax ?? line.totalPriceExTax) || 0), 0)
}

export function isPurchaseOrderPending(order) {
  return String(order?.status || '') === PENDING_STATUS
}

export function toPurchaseApprovalItem(order) {
  if (!order) return null
  return {
    id: order.id,
    bizType: APPROVAL_BIZ.PURCHASE_ORDER,
    bizNo: order.orderNo || '',
    title: order.supplier || '采购订单',
    subtitle: order.applyType ? `类型：${order.applyType}` : '',
    applicant: order.creator || order.buyer || '—',
    submittedAt: order.updatedAt || order.createdAt || order.documentDate || '',
    amount: sumLineAmount(order.lineItems),
    status: order.status,
    raw: order,
  }
}

export function toPurchaseDetailView(order) {
  const item = toPurchaseApprovalItem(order)
  if (!item) return null
  return {
    ...item,
    headerFields: [
      { label: '采购单号', value: order.orderNo },
      { label: '供应商', value: order.supplier },
      { label: '单据日期', value: order.documentDate },
      { label: '交货日期', value: order.deliveryDate || '—' },
      { label: '采购类型', value: order.applyType || '—' },
      { label: '备注', value: order.remark || order.urgencyNote || '—' },
    ],
    lineColumns: [
      { key: 'itemName', label: '物料', altKey: 'productName' },
      { key: 'specModel', label: '规格' },
      { key: 'purchaseQty', label: '数量', suffixKey: 'unit' },
      { key: 'unitPriceExTax', label: '单价', money: true },
      { key: 'totalPriceExTax', label: '金额', money: true },
    ],
    lines: (order.lineItems || []).map((line) => ({
      ...line,
      itemName: line.itemName || line.productName,
      purchaseQty: line.purchaseQty ?? line.qty,
    })),
    approvalRecords: order.approvalRecords || [],
    warnings: [],
  }
}
