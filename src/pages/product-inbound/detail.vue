<template>
  <view class="detail-page">
    <view v-if="record" class="card">
      <view class="head-row">
        <text class="req-no">{{ record.inboundNo }}</text>
        <text class="status-tag">{{ record.inboundStatus }}</text>
      </view>
      <view class="info-row">
        <text class="label">入库方式</text>
        <text class="val">{{ record.mode === 'quick' ? '快速入库' : '工单入库' }}</text>
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
        <text class="label">来源车间</text>
        <text class="val">{{ record.workshop }}</text>
      </view>
      <view class="info-row">
        <text class="label">入库单号</text>
        <text class="val primary">{{ record.inboundDocNo || '—' }}</text>
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
      <text class="section-title">入库明细（{{ record.lineCount }} 项 / 合计 {{ record.totalQty }}）</text>
      <view v-for="line in record.lines" :key="line.id" class="line-row">
        <view class="line-main">
          <text class="line-name">{{ line.itemName }}</text>
          <text class="line-code">{{ line.itemCode }}</text>
        </view>
        <view class="line-sub">
          <text>{{ line.specModel || '—' }}</text>
        </view>
        <view class="line-sub">
          <text>仓库：{{ formatWarehouse(line.warehouse) }}</text>
        </view>
        <view class="line-sub">
          <text class="line-qty">{{ line.qty }} {{ line.unit || '件' }}</text>
        </view>
      </view>
    </view>

    <view v-if="record" class="tip-card">
      <text>提交后已在 WEB 端入库管理生成「成品入库」单，状态为待审批，需仓管审批后方可确认入库。</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getProductInboundById } from '@/store/productInboundStore'
import { formatFinishedWarehouseLabel } from '@/utils/warehouseBridge'

const record = ref(null)

function formatWarehouse(value) {
  return formatFinishedWarehouseLabel(value)
}

onLoad((query) => {
  record.value = getProductInboundById(query.id)
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
  color: #52c41a;
  font-weight: 600;
}

.tip-card {
  background: #f6ffed;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  color: #389e0d;
  line-height: 1.6;
}
</style>
