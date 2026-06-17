<template>
  <view class="page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">报工确认</text>
      <view class="nav-placeholder" />
    </view>

    <view class="search-row">
      <view class="search-bar">
        <text class="search-icon">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索工单号 / 产品名称"
          confirm-type="search"
          @confirm="refresh"
        />
      </view>
      <text class="filter-btn" @tap="showFilterTip">筛选</text>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view
        v-for="tab in tabList"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        {{ tab.label }}<text class="tab-count">({{ tab.count }})</text>
      </view>
    </scroll-view>

    <view class="list-panel">
      <view
        v-for="item in list"
        :key="item.workOrderId"
        class="wo-card"
        @tap="goDetail(item)"
      >
        <view class="card-head">
          <text class="wo-no">{{ item.workOrderNo }}</text>
          <text class="status-tag" :class="statusClass(item.listStatus)">{{ item.listStatus }}</text>
        </view>
        <text class="product-line">{{ item.productName }} · {{ item.productCode }}</text>

        <view class="metrics">
          <view class="metric">
            <text class="metric-label">目标件数</text>
            <text class="metric-val">{{ item.targetQty }} 件</text>
          </view>
          <view class="metric">
            <text class="metric-label">已报工</text>
            <text class="metric-val blue">{{ item.reportedQty }} 件</text>
          </view>
          <view class="metric">
            <text class="metric-label">完成率</text>
            <text class="metric-val" :class="rateClass(item)">{{ item.completionRate }}%</text>
          </view>
        </view>

        <view class="card-foot">
          <text class="foot-text">下发: {{ item.dispatchedAt }} · {{ item.director }}</text>
          <text class="chevron">›</text>
        </view>
      </view>

      <view v-if="!list.length" class="empty">暂无报工确认工单</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUser, isLoggedIn } from '@/utils/auth'
import { mergePcSyncedTasks } from '@/mock/disassemblyTasks'
import {
  getWorkOrderConfirmSummaries,
  getWorkOrderConfirmTabCounts,
  isDirectorUser,
} from '@/mock/reportConfirmStore'

const keyword = ref('')
const activeTab = ref('all')
const list = ref([])
const tabCounts = ref({ all: 0, pending: 0, done: 0 })

const tabList = computed(() => [
  { key: 'all', label: '全部', count: tabCounts.value.all },
  { key: 'pending', label: '待确认', count: tabCounts.value.pending },
  { key: 'done', label: '已完成', count: tabCounts.value.done },
])

function refresh() {
  tabCounts.value = getWorkOrderConfirmTabCounts(keyword.value)
  list.value = getWorkOrderConfirmSummaries({ tab: activeTab.value, keyword: keyword.value })
}

watch(activeTab, refresh)
watch(keyword, refresh)

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  const user = getUser()
  if (!isDirectorUser(user)) {
    uni.showToast({ title: '仅车间主任可访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  mergePcSyncedTasks()
  refresh()
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/workbench/index' })
}

function showFilterTip() {
  uni.showToast({ title: '筛选功能开发中', icon: 'none' })
}

function statusClass(status) {
  return status === '已完成' ? 'done' : 'pending'
}

function rateClass(item) {
  if (item.completionRate >= 100) return 'green'
  if (item.listStatus === '已完成' && item.completionRate < 100) return 'warn'
  return ''
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/report-confirm/detail?id=${item.workOrderId}` })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 32rpx;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 88rpx 24rpx 16rpx;
  background: #fff;
}

.nav-back,
.nav-placeholder {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  font-size: 48rpx;
  color: #333;
  line-height: 1;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f1f1f;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background: #fff;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
}

.search-icon {
  font-size: 32rpx;
  color: #bfbfbf;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #262626;
}

.filter-btn {
  font-size: 28rpx;
  color: #1677ff;
  white-space: nowrap;
}

.tabs {
  white-space: nowrap;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: #595959;
  background: #f5f5f5;
  border-radius: 32rpx;

  &.active {
    color: #fff;
    background: #1677ff;
    font-weight: 600;
  }
}

.tab-count {
  margin-left: 4rpx;
}

.list-panel {
  padding: 16rpx 24rpx;
}

.wo-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.wo-no {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f1f1f;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  &.pending {
    color: #1677ff;
    background: #e6f4ff;
  }

  &.done {
    color: #52c41a;
    background: #f6ffed;
  }
}

.product-line {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 20rpx;
}

.metrics {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.metric {
  flex: 1;
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 22rpx;
  color: #8c8c8c;
  margin-bottom: 8rpx;
}

.metric-val {
  font-size: 30rpx;
  font-weight: 600;
  color: #262626;

  &.blue {
    color: #1677ff;
  }

  &.green {
    color: #52c41a;
  }

  &.warn {
    color: #ff4d4f;
  }
}

.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.foot-text {
  font-size: 24rpx;
  color: #bfbfbf;
}

.chevron {
  font-size: 36rpx;
  color: #d9d9d9;
  line-height: 1;
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: #bfbfbf;
  font-size: 28rpx;
}
</style>
