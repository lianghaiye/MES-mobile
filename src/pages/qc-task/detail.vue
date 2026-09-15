<template>
  <view v-if="record" class="detail-page">
    <view class="card">
      <view class="head">
        <text class="title">{{ record.qcNo || record.id }}</text>
        <StatusTag :text="record.qcStatus" />
      </view>
      <view class="row"><text class="l">业务类型</text><text class="v">{{ record.bizScope }}</text></view>
      <view v-if="record.qcResult" class="row">
        <text class="l">质检结果</text>
        <StatusTag :text="record.qcResult" />
      </view>
      <view v-for="row in headerRows" :key="row.label" class="row">
        <text class="l">{{ row.label }}</text>
        <text class="v">{{ row.value }}</text>
      </view>
      <view class="row"><text class="l">创建人</text><text class="v">{{ record.creator || '—' }}</text></view>
      <view class="row"><text class="l">创建时间</text><text class="v">{{ record.createdAt || '—' }}</text></view>
      <view class="row"><text class="l">质检模板</text><text class="v">{{ record.templateName || '—' }}</text></view>
      <view class="row"><text class="l">质检方式</text><text class="v">{{ record.inspectMethod || '—' }}</text></view>
      <view v-if="record.inspector" class="row">
        <text class="l">质检人</text><text class="v">{{ record.inspector }}</text>
      </view>
      <view v-if="record.inspectedAt" class="row">
        <text class="l">质检时间</text><text class="v">{{ record.inspectedAt }}</text>
      </view>
      <view v-if="record.entryChannel" class="row">
        <text class="l">录入端</text><text class="v">{{ channelLabel }}</text>
      </view>
      <view v-if="record.remark" class="row">
        <text class="l">备注</text><text class="v">{{ record.remark }}</text>
      </view>
    </view>

    <view class="section-title">质检明细</view>
    <view v-for="(line, i) in record.lineItems" :key="line.id" class="line-card">
      <text class="line-title">{{ i + 1 }}. {{ line.itemName || line.productName }}</text>
      <view class="row"><text class="l">物料编码</text><text class="v">{{ line.itemCode || '—' }}</text></view>
      <view v-if="line.specModel" class="row">
        <text class="l">规格型号</text><text class="v">{{ line.specModel }}</text>
      </view>
      <view v-if="line.receiptQty != null" class="row">
        <text class="l">收货数量</text>
        <text class="v">{{ line.receiptQty }} {{ line.unit || '' }}</text>
      </view>
      <view v-if="line.shipQty != null" class="row">
        <text class="l">发货数量</text>
        <text class="v">{{ line.shipQty }} {{ line.unit || '' }}</text>
      </view>
      <view class="row">
        <text class="l">检验数量</text>
        <text class="v">{{ line.inspectQty ?? '—' }} {{ line.unit || '' }}</text>
      </view>
      <view class="row"><text class="l">模板</text><text class="v">{{ line.templateName || '—' }}</text></view>
      <view v-if="line.lineQcResult" class="row">
        <text class="l">行结果</text>
        <StatusTag :text="line.lineQcResult" />
      </view>
      <view v-if="line.treatmentPlan" class="row">
        <text class="l">处理方案</text><text class="v">{{ line.treatmentPlan }}</text>
      </view>
      <view v-if="showDisposition(line)" class="disp-block">
        <view class="row">
          <text class="l">合格入库</text><text class="v">{{ fmtQty(line.acceptInboundQty) }}</text>
        </view>
        <view class="row">
          <text class="l">退货</text><text class="v">{{ fmtQty(line.returnQty) }}</text>
        </view>
        <view class="row">
          <text class="l">换货</text><text class="v">{{ fmtQty(line.exchangeQty) }}</text>
        </view>
      </view>
      <view v-if="(line.fieldValues || []).length" class="field-block">
        <text class="field-title">检验项</text>
        <view v-for="fv in line.fieldValues" :key="fv.fieldCode" class="row">
          <text class="l">{{ fieldName(line, fv.fieldCode) }}</text>
          <text class="v">{{ fv.value ?? '—' }}</text>
        </view>
      </view>
    </view>

    <button v-if="record.qcStatus === '待质检'" class="btn-primary" @tap="goInspect">执行质检</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import { getQcById, isInboundQcBizScope } from '@/mock/qcTask'

const record = ref(null)
const listBizScope = ref('')

const channelLabel = computed(() => {
  const c = record.value?.entryChannel
  if (c === 'miniprogram') return '小程序'
  if (c === 'web') return 'WEB'
  return c || '—'
})

const headerRows = computed(() => {
  const r = record.value
  if (!r) return []
  if (r.bizScope === '来料质检' || r.bizScope === '外协回货检') {
    return [
      { label: '来源单号', value: r.sourceDocNo || '—' },
      { label: '供应商', value: r.supplier || '—' },
    ]
  }
  if (r.bizScope === '生产过程检' || r.bizScope === '成品检') {
    return [
      { label: '工单号', value: r.workOrderNo || '—' },
      { label: '工序', value: r.processName || '—' },
      { label: '排产批次', value: r.scheduleBatchNo || '—' },
    ]
  }
  return [
    { label: '销售单号', value: r.salesOrderNo || '—' },
    { label: '客户', value: r.customerName || '—' },
    { label: '出库单号', value: r.outboundDocNo || '—' },
    { label: '出库仓库', value: r.outboundWarehouse || '—' },
  ]
})

function showDisposition(line) {
  if (!isInboundQcBizScope(record.value?.bizScope)) return false
  return (
    line.acceptInboundQty != null || line.returnQty != null || line.exchangeQty != null
  )
}

function fmtQty(v) {
  if (v == null || v === '') return '—'
  return v
}

function fieldName(line, code) {
  const f = (line.templateFields || []).find((x) => x.code === code)
  return f?.name || code
}

onLoad((query) => {
  listBizScope.value = decodeURIComponent(query.bizScope || '')
  record.value = getQcById(query.id)
  if (!record.value) {
    uni.showToast({ title: '任务不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function goInspect() {
  const scope = listBizScope.value || record.value?.bizScope || ''
  const qs = scope ? `&bizScope=${encodeURIComponent(scope)}` : ''
  uni.navigateTo({ url: `/pages/qc-task/inspect?id=${record.value.id}${qs}` })
}
</script>

<style lang="scss" scoped>
.detail-page {
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.card,
.line-card {
  background: $bg-card;
  border-radius: $radius;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
}

.row {
  display: flex;
  margin-top: 12rpx;
  font-size: 26rpx;
}

.l {
  width: 160rpx;
  color: $text-secondary;
  flex-shrink: 0;
}

.v {
  flex: 1;
  color: $text-primary;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin: 8rpx 0 16rpx;
}

.line-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.disp-block,
.field-block {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $border;
}

.field-title {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 4rpx;
}

.btn-primary {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 48rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: $primary;
  color: #fff;
  border-radius: 12rpx;
  border: none;
}
</style>
