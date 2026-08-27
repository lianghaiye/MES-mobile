/**
 * 移动端独立演示：PC storage 为空时注入待审样例（字段与 i-doms-web mock 对齐）
 */
import { STORAGE_KEYS } from '@/constants/approvalTypes'

function nowText() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function buildApprovalDemoPayload() {
  const ts = nowText()
  return {
    [STORAGE_KEYS.SALES]: {
      version: 10,
      orders: [
        {
          id: 'so-mobile-pending-1',
          orderNo: '1-20260602-001',
          customerName: '华东机械制造有限公司',
          salesperson: '王芳',
          progressStatus: '待审核',
          documentDate: '2026-06-02',
          createdAt: '2026-06-02 09:00',
          creator: '王芳',
          remark: '移动端演示：销售订单待审',
          deliveryDate: '2026-07-01',
          lineItems: [
            {
              id: 'so-m-line-1',
              productName: '清水离心泵',
              productCode: 'CP-QS-001',
              specModel: 'ISG50-160',
              salesQty: 2,
              unit: '台',
              unitPriceExTax: 12800,
              totalPriceExTax: 25600,
              businessType: '标准销售',
            },
          ],
          approvalRecords: [],
        },
      ],
    },
    [STORAGE_KEYS.PURCHASE]: {
      orders: [
        {
          id: 'po-mobile-pending-1',
          orderNo: 'CG20260804002',
          supplier: 'SKF代理商',
          status: '待审核',
          approvalResult: '待审核',
          documentDate: '2026-08-04',
          deliveryDate: '2026-08-10',
          creator: '采购员A',
          createdAt: ts,
          remark: '移动端演示：采购订单待审',
          lineItems: [
            {
              id: 'po-m-line-1',
              itemCode: 'MAT-EXT-001',
              itemName: '进口轴承',
              productName: '进口轴承',
              specModel: '6312-2RS',
              purchaseQty: 16,
              unit: '套',
              unitPriceExTax: 800,
              totalPriceExTax: 12800,
            },
          ],
          approvalRecords: [],
        },
      ],
    },
    [STORAGE_KEYS.OUTSOURCING]: {
      orders: [
        {
          id: 'wx-mobile-pending-1',
          orderNo: 'WX-260806001',
          workOrderName: '表面处理外协',
          supplier: '标准件供应商',
          status: '待审核',
          approvalResult: '待审核',
          planDate: '2026-08-20',
          creator: '计划员B',
          createdAt: ts,
          remark: '移动端演示：外协订单待审',
          lineItems: [
            {
              id: 'wx-m-line-1',
              productName: '钢板件',
              productCode: 'MAT-PLATE-10',
              specModel: '10mm',
              planQty: 15,
              unit: '张',
              unitPriceExTax: 12,
              totalPriceExTax: 180,
            },
          ],
          approvalRecords: [],
        },
      ],
    },
  }
}
