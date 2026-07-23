<template>
  <view class="index-page">
    <view class="action-row">
      <view class="action-card primary" @tap="goWorkOrder">
        <text class="action-icon">📋</text>
        <text class="action-title">工单领料</text>
        <text class="action-desc">选择工单，支持单工单或批量合并</text>
      </view>
      <view class="action-card" @tap="goSalesOrder">
        <text class="action-icon">📄</text>
        <text class="action-title">订单领料</text>
        <text class="action-desc">按销售订单选择关联工单领料</text>
      </view>
      <view class="action-card" @tap="goQuick">
        <text class="action-icon">⚡</text>
        <text class="action-title">快速领料</text>
        <text class="action-desc">无工单，手工添加物料</text>
      </view>
    </view>

    <view class="list-head">
      <text class="list-title">我的领料申请</text>
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
          <text class="req-no">{{ item.reqNo }}</text>
          <text class="req-mode">{{ modeLabel(item.mode) }}</text>
        </view>
        <text class="req-status">{{ item.outboundStatus }}</text>
      </view>
      <text class="req-main">
        {{ displayMain(item) }}
        <text v-if="item.workOrderCode && item.mode !== 'batch-work-order'" class="req-sub"> · {{ item.workOrderCode }}</text>
      </text>
      <view class="req-foot">
        <text>{{ item.totalQty }} 件</text>
        <text class="dot">·</text>
        <text>{{ item.outboundDocNo || '待生成出库单' }}</text>
        <text class="dot">·</text>
        <text>{{ formatTime(item.createdAt) }}</text>
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无领料申请，点击上方按钮发起</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listMaterialRequisitions } from '@/store/materialRequisitionStore'

const list = ref([])

function loadList() {
  list.value = listMaterialRequisitions()
}

onShow(() => {
  loadList()
})

onPullDownRefresh(() => {
  loadList()
  uni.stopPullDownRefresh()
})

function goWorkOrder() {
  uni.navigateTo({ url: '/pages/material-req/work-order-select' })
}

function goSalesOrder() {
  uni.navigateTo({ url: '/pages/material-req/work-order-select?tab=sales' })
}

function goQuick() {
  uni.navigateTo({ url: '/pages/material-req/create-quick' })
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/material-req/detail?id=${item.id}` })
}

function modeLabel(mode) {
  if (mode === 'quick') return '快速领料'
  if (mode === 'sales-order') return '订单领料'
  if (mode === 'batch-work-order') return '工单领料'
  return '工单领料'
}

function displayMain(item) {
  if (item.mode === 'sales-order') {
    if (item.salesOrderNo && item.salesOrderNo !== 'MULTI') {
      return `${item.salesOrderNo} · ${item.lineCount || 0} 项物料`
    }
    const count = item.workOrderIds?.length || item.workOrders?.length || 0
    return count ? `${count} 个工单 · ${item.lineCount || 0} 项物料` : item.productName || '订单领料'
  }
  if (item.mode === 'batch-work-order') {
    const count = item.workOrderIds?.length || item.workOrders?.length || 0
    if (count) return `${count} 个工单 · ${item.lineCount || 0} 项物料`
    return item.productName || '工单领料'
  }
  if (item.productName) return item.productName
  const first = item.lines?.[0]?.itemName
  if (!first) return '—'
  if (item.lineCount > 1) return `${first} 等${item.lineCount}项`
  return first
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
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.action-card {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
}

.action-card.primary {
  background: linear-gradient(135deg, #1677ff, #4096ff);
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

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 80rpx 0;
  font-size: 26rpx;
}
</style>
