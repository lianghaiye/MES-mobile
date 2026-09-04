<template>
  <view class="task-page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜销售单号 / 客户 / 产品"
        confirm-type="search"
        @confirm="reload"
      />
      <view class="scan-btn" @tap="onBindProductInfo">标识绑定</view>
    </view>

    <scroll-view scroll-x class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab"
        :class="{ active: statusFilter === tab.value }"
        @tap="setFilter(tab.value)"
      >
        {{ tab.label }}
        <text v-if="tab.count > 0" class="tab-count">({{ tab.count }})</text>
      </view>
    </scroll-view>

    <view class="summary-bar">
      <text>待刻 {{ pendingSnCount }} 块 · 本页 {{ list.length }} 单</text>
    </view>

    <view v-if="!list.length" class="empty">暂无铭牌任务</view>

    <view v-for="task in list" :key="task.orderNo" class="card" @tap="goOrder(task)">
      <view class="card-head">
        <text class="order-no">{{ task.orderNo }}</text>
        <text class="tag" :class="statusClass(task.status)">{{ task.status }}</text>
      </view>
      <view class="customer">{{ task.customerName || '—' }}</view>
      <view class="progress-row">
        <text class="progress-text">已刻 {{ task.done }}/{{ task.total }}</text>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: progressWidth(task) }" />
        </view>
      </view>
      <view v-for="p in task.products" :key="p.key" class="product-line">
        <text class="p-name">{{ p.productName }}</text>
        <text class="p-meta">
          ×{{ p.total }}
          <text v-if="p.pending > 0" class="p-pending">待刻 {{ p.pending }}</text>
          <text v-else class="p-done">已完成</text>
        </text>
      </view>
      <view class="card-foot">点进查看要刻的 SN →</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  ensureMobileIndustrialLabelSeed,
  listNameplateOrderTasks,
} from '@/utils/industrialLabelBridge'

const keyword = ref('')
const statusFilter = ref('pending')
const allTasks = ref([])

const tabs = computed(() => {
  const all = allTasks.value
  return [
    {
      label: '待刻录',
      value: 'pending',
      count: all.filter((t) => t.pending > 0).length,
    },
    {
      label: '已完成',
      value: 'done',
      count: all.filter((t) => t.pending <= 0).length,
    },
    { label: '全部', value: '', count: all.length },
  ]
})

const list = computed(() =>
  listNameplateOrderTasks({
    status: statusFilter.value,
    keyword: keyword.value.trim(),
  }),
)

const pendingSnCount = computed(() =>
  allTasks.value.reduce((s, t) => s + (Number(t.pending) || 0), 0),
)

function reload() {
  ensureMobileIndustrialLabelSeed()
  allTasks.value = listNameplateOrderTasks({})
}

function setFilter(val) {
  statusFilter.value = val
}

function statusClass(status) {
  if (status === '已完成') return 'ok'
  if (status === '进行中') return 'doing'
  return 'pending'
}

function progressWidth(task) {
  if (!task.total) return '0%'
  return `${Math.round((task.done / task.total) * 100)}%`
}

function goOrder(task) {
  uni.navigateTo({
    url: `/pages/industrial-label/order?orderNo=${encodeURIComponent(task.orderNo)}`,
  })
}

function onBindProductInfo() {
  uni.showToast({ title: '标识绑定功能开发中', icon: 'none' })
}

onShow(() => reload())
</script>

<style lang="scss" scoped>
.task-page {
  padding: 24rpx;
  padding-bottom: 48rpx;
}

.search-bar {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin-bottom: 16rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.scan-btn {
  flex-shrink: 0;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  background: #1677ff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.tabs {
  white-space: nowrap;
  margin-bottom: 16rpx;
}

.tab {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: #8c8c8c;
  background: #fff;
  border-radius: 32rpx;
}

.tab.active {
  color: #1677ff;
  background: #e6f4ff;
  font-weight: 600;
}

.tab-count {
  margin-left: 4rpx;
}

.summary-bar {
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 80rpx 0;
  font-size: 28rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.order-no {
  font-size: 32rpx;
  font-weight: 700;
  color: #1677ff;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.tag.ok {
  background: #f6ffed;
  color: #52c41a;
}

.tag.doing {
  background: #e6f4ff;
  color: #1677ff;
}

.tag.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.customer {
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 16rpx;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.progress-text {
  font-size: 24rpx;
  color: #262626;
  flex-shrink: 0;
}

.progress-track {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #52c41a;
  border-radius: 8rpx;
}

.product-line {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 10rpx 0;
  border-top: 1rpx solid #f5f5f5;
  font-size: 26rpx;
}

.p-name {
  flex: 1;
  color: #262626;
  font-weight: 500;
}

.p-meta {
  flex-shrink: 0;
  color: #8c8c8c;
}

.p-pending {
  margin-left: 8rpx;
  color: #fa8c16;
}

.p-done {
  margin-left: 8rpx;
  color: #52c41a;
}

.card-foot {
  margin-top: 16rpx;
  text-align: right;
  font-size: 24rpx;
  color: #1677ff;
}
</style>
