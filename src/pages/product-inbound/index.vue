<template>
  <view class="index-page">
    <view class="action-row">
      <view class="action-card primary" @tap="goWorkOrder">
        <text class="action-icon">📋</text>
        <text class="action-title">按工单入库</text>
        <text class="action-desc">选择已完成工单，带出产品</text>
      </view>
      <view class="action-card" @tap="goQuick">
        <text class="action-icon">⚡</text>
        <text class="action-title">快速入库</text>
        <text class="action-desc">直接选择产品入库</text>
      </view>
    </view>

    <view class="list-head">
      <text class="list-title">我的入库申请</text>
      <text class="list-count">共 {{ list.length }} 条</text>
    </view>

    <view
      v-for="item in list"
      :key="item.id"
      class="req-card"
      @tap="goDetail(item)"
    >
      <view class="req-head">
        <view class="req-head-left">
          <text class="req-no">{{ item.inboundNo }}</text>
          <text class="req-mode">{{ item.mode === 'quick' ? '快速入库' : '工单入库' }}</text>
        </view>
        <text class="req-status">{{ item.inboundStatus }}</text>
      </view>
      <text class="req-main">
        {{ item.productName || '—' }}
        <text v-if="item.workOrderCode" class="req-sub"> · {{ item.workOrderCode }}</text>
      </text>
      <view class="req-foot">
        <text>{{ item.totalQty }} 件</text>
        <text class="dot">·</text>
        <text>{{ item.inboundDocNo || '待生成入库单' }}</text>
        <text class="dot">·</text>
        <text>{{ formatTime(item.createdAt) }}</text>
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无入库申请，点击上方按钮发起</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listProductInbounds } from '@/store/productInboundStore'

const list = ref([])

function loadList() {
  list.value = listProductInbounds()
}

onShow(() => {
  loadList()
})

onPullDownRefresh(() => {
  loadList()
  uni.stopPullDownRefresh()
})

function goWorkOrder() {
  uni.navigateTo({ url: '/pages/product-inbound/work-order-select' })
}

function goQuick() {
  uni.navigateTo({ url: '/pages/product-inbound/create-quick' })
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/product-inbound/detail?id=${item.id}` })
}

function formatTime(value) {
  if (!value) return '—'
  const text = String(value)
  return text.length >= 16 ? text.slice(5, 16) : text
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.index-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.action-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.action-card {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 20rpx;
}

.action-card.primary {
  background: linear-gradient(135deg, #52c41a, #73d13d);
  color: #fff;
}

.action-icon {
  display: block;
  font-size: 40rpx;
  margin-bottom: 12rpx;
}

.action-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
}

.action-desc {
  display: block;
  font-size: 22rpx;
  margin-top: 8rpx;
  opacity: 0.85;
}

.action-card:not(.primary) .action-desc {
  color: #8c8c8c;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.list-title {
  font-size: 30rpx;
  font-weight: 600;
}

.list-count {
  font-size: 24rpx;
  color: #8c8c8c;
}

.req-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.req-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10rpx;
}

.req-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.req-no {
  font-size: 28rpx;
  font-weight: 600;
  color: $primary;
}

.req-mode {
  font-size: 22rpx;
  color: #8c8c8c;
  background: #f5f6f8;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.req-status {
  font-size: 22rpx;
  color: #fa8c16;
  flex-shrink: 0;
}

.req-main {
  display: block;
  font-size: 28rpx;
  color: #262626;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.req-sub {
  color: #8c8c8c;
  font-size: 24rpx;
}

.req-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.dot {
  color: #d9d9d9;
}

.req-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #595959;
  padding: 8rpx 0;
}

.label {
  color: #8c8c8c;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 80rpx 0;
  font-size: 26rpx;
}
</style>
