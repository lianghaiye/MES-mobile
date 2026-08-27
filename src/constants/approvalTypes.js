/** 审批单据类型（与 PC 端 store 对齐） */
export const APPROVAL_BIZ = {
  SALES_ORDER: 'sales_order',
  PURCHASE_ORDER: 'purchase_order',
  OUTSOURCING_ORDER: 'outsourcing_order',
}

export const APPROVAL_BIZ_LABEL = {
  [APPROVAL_BIZ.SALES_ORDER]: '销售订单',
  [APPROVAL_BIZ.PURCHASE_ORDER]: '采购订单',
  [APPROVAL_BIZ.OUTSOURCING_ORDER]: '外协订单',
}

export const APPROVAL_FILTER_OPTIONS = [
  { label: '全部', value: '' },
  { label: '销售', value: APPROVAL_BIZ.SALES_ORDER },
  { label: '采购', value: APPROVAL_BIZ.PURCHASE_ORDER },
  { label: '外协', value: APPROVAL_BIZ.OUTSOURCING_ORDER },
]

export const PENDING_STATUS = '待审核'

export const STORAGE_KEYS = {
  SALES: 'i_doms_sales_orders',
  PURCHASE: 'i_doms_purchase_orders',
  OUTSOURCING: 'i_doms_outsourcing_orders',
}
