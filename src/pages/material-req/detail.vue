<template>
  <view class="detail-page">
    <view v-if="record" class="card">
      <view class="head-row">
        <text class="req-no">{{ record.reqNo }}</text>
        <text class="status-tag">{{ record.outboundStatus }}</text>
      </view>
      <view class="info-row">
        <text class="label">领料方式</text>
        <text class="val">{{ record.mode === 'quick' ? '快速领料' : '工单领料' }}</text>
      </view>
      <view v-if="record.workOrderCode" class="info-row">
        <text class="label">关联工单</text>
        <text class="val">{{ record.workOrderCode }}</text>
      </view>
      <view v-if="record.productName" class="info-row">
        <text class="label">产品</text>
        <text class="val">{{ record.productName }}</text>
      </view>
      <view class="info-row">
        <text class="label">领用车间</text>
        <text class="val">{{ record.workshop }}</text>
      </view>
      <view v-if="record.receiveWarehouse" class="info-row">
        <text class="label">领入仓库</text>
        <text class="val">{{ formatReceiveWarehouse(record.receiveWarehouse) }}</text>
      </view>
      <view class="info-row">
        <text class="label">出库单号</text>
        <text class="val primary">{{ record.outboundDocNo || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">申请人</text>
        <text class="val">{{ record.applicant }}</text>
      </view>
      <view class="info-row">
        <text class="label">申请时间</text>
        <text class="val">{{ record.createdAt }}</text>
      </view>
      <view v-if="record.remark" class="info-row">
        <text class="label">备注</text>
        <text class="val">{{ record.remark }}</text>
      </view>
    </view>

    <view v-if="record" class="card">
      <text class="section-title">领料明细（{{ record.lineCount }} 项 / 合计 {{ record.totalQty }}）</text>
      <view v-for="line in record.lines" :key="line.id" class="line-row">
        <view class="line-main">
          <text class="line-name">{{ line.itemName }}</text>
          <text class="line-code">{{ line.itemCode }}</text>
        </view>
        <view class="line-sub">
          <text>{{ line.specModel || '—' }}</text>
        </view>
        <view class="line-sub">
          <text>仓库：{{ line.shipWarehouse || '—' }}</text>
          <text>库存：{{ line.warehouseStockQty ?? '—' }}</text>
        </view>
        <view class="line-sub">
          <text class="line-qty">{{ line.shipQty }} {{ line.unit || '件' }}</text>
        </view>
      </view>
    </view>

    <view v-if="record" class="tip-card">
      <text>提交后已在 WEB 端出库管理生成「领料出库」单，状态为待处理，需仓管审批后出库。</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMaterialRequisitionById } from '@/store/materialRequisitionStore'
import { formatReceiveWarehouseLabel } from '@/utils/warehouseBridge'

const record = ref(null)

function formatReceiveWarehouse(value) {
  return formatReceiveWarehouseLabel(value)
}

onLoad((query) => {
  record.value = getMaterialRequisitionById(query.id)
  if (!record.value) {
    uni.showToast({ title: '申请单不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.req-no {
  font-size: 32rpx;
  font-weight: 600;
}

.status-tag {
  font-size: 24rpx;
  color: #fa8c16;
  background: #fff7e6;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  font-size: 28rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: #8c8c8c;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.line-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.line-row:last-child {
  border-bottom: none;
}

.line-name {
  display: block;
  font-size: 28rpx;
  color: #262626;
}

.line-code {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-top: 4rpx;
}

.line-sub {
  display: flex;
  justify-content: space-between;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #595959;
}

.line-qty {
  color: $primary;
  font-weight: 600;
}

.tip-card {
  background: #e6f4ff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  color: #0958d9;
  line-height: 1.6;
}
</style>
