<template>
  <view class="todo-page">
    <view class="top-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        {{ tab.label }}
        <text v-if="tab.key === 'claim' && claimCount > 0" class="tab-badge">{{ claimCount }}</text>
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

    <view v-if="!list.length" class="empty">
      暂无{{ emptyLabel }}任务
    </view>

    <view
      v-for="item in list"
      :key="item.id"
      class="task-card"
      @tap="onCardTap(item)"
    >
      <view class="card-head">
        <view class="head-left">
          <text class="category-tag" :class="categoryClass(item.orderCategory)">
            {{ item.orderCategory || '拆解工单' }}
          </text>
          <text class="wo-name">{{ item.workOrderName }}（排产数：{{ item.expectedQty }}）</text>
        </view>
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
      <view v-if="activeTab === 'claim'" class="claim-foot">
        <button class="claim-btn" size="mini" @tap.stop="onClaim(item)">领取</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTaskList, getClaimTaskCount, claimTask, mergePcSyncedTasks } from '@/mock/disassemblyTasks'

const activeTab = ref('todo')
const autoReport = ref(false)
const claimCount = ref(0)

const tabs = [
  { key: 'todo', label: '待办任务' },
  { key: 'claim', label: '待领任务' },
  { key: 'history', label: '历史任务' },
]

const list = computed(() => getTaskList(activeTab.value))

const emptyLabel = computed(() => {
  const map = { todo: '待办', claim: '待领', history: '历史' }
  return map[activeTab.value] || '待办'
})

function loadList() {
  mergePcSyncedTasks()
  claimCount.value = getClaimTaskCount()
}

function switchTab(key) {
  activeTab.value = key
  loadList()
}

function showTraceCol(item) {
  return item.processName === '拆解' || item.barcodeType === '一物一码' || item.specModel
}

function traceLabel(item) {
  if (item.barcodeType === '一物一码') return '序列号/条码'
  return '规格型号'
}

function traceValue(item) {
  if (item.barcodeType === '一物一码') return item.serialNo || '一物一码'
  return item.specModel || item.barcodeType
}

function categoryClass(category) {
  const map = {
    生产工单: 'production',
    总装工单: 'assembly',
    拆解工单: 'disassembly',
  }
  return map[category] || 'disassembly'
}

function statusClass(status) {
  const map = {
    待领取: 'pending',
    待分发: 'pending',
    待开始: 'ready',
    执行中: 'doing',
    已完成: 'done',
  }
  return map[status] || ''
}

function onCardTap(item) {
  if (activeTab.value === 'claim') return
  uni.navigateTo({ url: `/pages/todo/detail?id=${item.id}` })
}

function onClaim(item) {
  const res = claimTask(item.id, 'admin')
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  uni.showToast({ title: '领取成功', icon: 'success' })
  loadList()
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

.tab-badge {
  margin-left: 6rpx;
  font-size: 22rpx;
  color: #ff4d4f;
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

.head-left {
  flex: 1;
  min-width: 0;
}

.category-tag {
  display: inline-block;
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  margin-bottom: 8rpx;
}

.category-tag.production {
  background: #e6f4ff;
  color: #1677ff;
}

.category-tag.assembly {
  background: #f6ffed;
  color: #52c41a;
}

.category-tag.disassembly {
  background: #fff7e6;
  color: #fa8c16;
}

.wo-name {
  display: block;
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

.claim-foot {
  margin-top: 16rpx;
  text-align: right;
}

.claim-btn {
  background: $green;
  color: #fff;
  border: none;
}
</style>
