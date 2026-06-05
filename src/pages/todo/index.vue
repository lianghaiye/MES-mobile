<template>
  <view class="todo-page">
    <view class="top-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        {{ tab.label }}
      </view>
      <text class="filter-icon">☰</text>
    </view>

    <view v-if="activeTab === 'todo'" class="action-bar">
      <view class="scan-btn">
        <text class="scan-icon">📷</text>
        <text>扫一扫</text>
      </view>
      <view class="auto-switch">
        <text>分发自动报工</text>
        <switch :checked="autoReport" color="#07c160" @change="autoReport = $event.detail.value" />
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无{{ activeTab === 'todo' ? '待办' : '历史' }}任务</view>

    <view
      v-for="item in list"
      :key="item.id"
      class="task-card"
      @tap="goDetail(item)"
    >
      <view class="card-head">
        <text class="wo-name">工单名称：{{ item.workOrderName }}</text>
        <text class="status" :class="statusClass(item.taskStatus)">{{ item.taskStatus }}</text>
      </view>
      <view class="info-grid">
        <view v-if="showTraceCol(item)" class="grid-item">
          <text class="grid-label">{{ traceLabel(item) }}</text>
          <text class="grid-val">{{ traceValue(item) }}</text>
        </view>
        <view class="grid-item">
          <text class="grid-label">产品名称</text>
          <text class="grid-val">{{ item.productName }}</text>
        </view>
        <view class="grid-item">
          <text class="grid-label">工序</text>
          <text class="grid-val">{{ item.processName }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTaskList } from '@/mock/disassemblyTasks'

const activeTab = ref('todo')
const autoReport = ref(false)
const allList = ref([])

const tabs = [
  { key: 'todo', label: '待办任务' },
  { key: 'history', label: '历史任务' },
]

const list = computed(() => getTaskList(activeTab.value))

function loadList() {
  allList.value = getTaskList('todo').concat(getTaskList('history'))
}

function showTraceCol(item) {
  return item.processName === '拆解' || item.barcodeType === '一物一码'
}

function traceLabel(item) {
  if (item.barcodeType === '一物一码') return '序列号/条码'
  return '规格型号'
}

function traceValue(item) {
  if (item.barcodeType === '一物一码') return item.serialNo || '一物一码'
  return item.specModel || item.barcodeType
}

function statusClass(status) {
  const map = {
    待分发: 'pending',
    待开始: 'ready',
    执行中: 'doing',
    已完成: 'done',
  }
  return map[status] || ''
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/todo/detail?id=${item.id}` })
}

onShow(() => loadList())
</script>

<style lang="scss" scoped>
$green: #07c160;

.todo-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 32rpx;
}

.top-tabs {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #eee;
}

.tab-item {
  padding: 24rpx 28rpx;
  font-size: 28rpx;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: $green;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 28rpx;
  right: 28rpx;
  bottom: 0;
  height: 4rpx;
  background: $green;
  border-radius: 2rpx;
}

.filter-icon {
  margin-left: auto;
  font-size: 32rpx;
  color: #999;
  padding: 16rpx;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  margin-bottom: 16rpx;
}

.scan-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: $green;
  font-size: 28rpx;
}

.scan-icon {
  font-size: 32rpx;
}

.auto-switch {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  color: #666;
}

.empty {
  text-align: center;
  padding: 100rpx;
  color: #999;
  font-size: 28rpx;
}

.task-card {
  margin: 0 24rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
  gap: 16rpx;
}

.wo-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.status {
  font-size: 24rpx;
  flex-shrink: 0;
}

.status.pending,
.status.ready,
.status.doing {
  color: $green;
}

.status.done {
  color: #999;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 0;
}

.grid-item {
  width: 33.33%;
  text-align: center;
}

.grid-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.grid-val {
  display: block;
  font-size: 24rpx;
  color: $green;
  font-weight: 500;
}
</style>
