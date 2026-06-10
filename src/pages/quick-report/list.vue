<template>
  <view class="report-page">
    <view class="page-head">
      <view class="head-top">
        <text class="page-title">快速报工</text>
        <button class="head-btn" size="mini" @tap="goForm">快速报工</button>
      </view>
      <text class="page-sub">共 {{ list.length }} 条记录 · {{ filterLabel }}</text>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeFilter === tab.key }"
        @tap="activeFilter = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无报工记录</view>

    <view
      v-for="item in list"
      :key="item.id"
      class="card"
      @tap="goDetail(item)"
    >
      <view class="card-head">
        <text class="product-title">{{ item.productName }} · {{ item.productCode }}</text>
        <view class="status-badge" :class="item.status === '已确认' ? 'confirmed' : 'pending'">
          <text class="status-icon">{{ item.status === '已确认' ? '✓' : '…' }}</text>
          <text>{{ item.status }}</text>
        </view>
      </view>
      <text class="date">{{ item.reportDate }}</text>

      <view class="metrics">
        <view class="metric">
          <text class="metric-num">{{ item.goodQty ?? item.finishedQty }}</text>
          <text class="metric-label">良品数(件)</text>
        </view>
        <view class="metric">
          <text class="metric-num defect">{{ item.defectQty || 0 }}</text>
          <text class="metric-label">不良品数(件)</text>
        </view>
        <view class="metric">
          <text class="metric-num">{{ item.processCount }}</text>
          <text class="metric-label">工序数</text>
        </view>
      </view>

      <view class="process-tags">
        <text v-for="(p, i) in item.processes" :key="i" class="tag">
          {{ p.name }} {{ p.qty }}件
        </text>
      </view>

      <text class="operators">操作人员：{{ item.operators.join('、') }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getQuickReportList, getFilterLabel } from '@/mock/quickReport'

const activeFilter = ref('today')
const refreshKey = ref(0)

const tabs = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'all', label: '全部' },
]

const list = computed(() => {
  refreshKey.value
  return getQuickReportList(activeFilter.value)
})
const filterLabel = computed(() => getFilterLabel(activeFilter.value))

onShow(() => {
  refreshKey.value += 1
})

function goForm() {
  uni.navigateTo({ url: '/pages/quick-report/form' })
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/quick-report/detail?id=${item.id}` })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.report-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
  padding-bottom: 48rpx;
}

.page-head {
  margin-bottom: 24rpx;
}

.head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.page-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.head-btn {
  margin: 0;
  padding: 0 28rpx;
  height: 64rpx;
  line-height: 64rpx;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 32rpx;
  font-size: 26rpx;
}

.page-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #8c8c8c;
}

.tabs {
  display: flex;
  gap: 40rpx;
  margin-bottom: 28rpx;
  border-bottom: 1rpx solid #e8e8e8;
}

.tab-item {
  padding-bottom: 16rpx;
  font-size: 30rpx;
  color: #8c8c8c;
  position: relative;
}

.tab-item.active {
  color: $primary;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4rpx;
  background: $primary;
  border-radius: 2rpx;
}

.empty {
  text-align: center;
  padding: 100rpx;
  color: #999;
  font-size: 28rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}

.product-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  flex-shrink: 0;
}

.status-badge.confirmed {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-icon {
  font-size: 20rpx;
}

.date {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.metrics {
  display: flex;
  gap: 48rpx;
  margin: 24rpx 0 20rpx;
}

.metric-num {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: $primary;
  line-height: 1.1;

  &.defect {
    color: #ff4d4f;
  }
}

.metric-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.process-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.tag {
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #595959;
}

.operators {
  font-size: 24rpx;
  color: #8c8c8c;
}
</style>
