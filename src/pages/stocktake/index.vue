<template>
  <view class="page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索单号/仓库"
        confirm-type="search"
        @confirm="reload"
      />
    </view>

    <view class="action-row">
      <view class="action-btn" @tap="goCreate">
        <text class="action-icon">＋</text>
        <text>新建盘点</text>
      </view>
    </view>

    <scroll-view scroll-x class="status-scroll" :show-scrollbar="false">
      <view class="status-track">
        <view
          v-for="tab in statusTabs"
          :key="tab.value || 'all'"
          class="status-pill"
          :class="{ active: statusFilter === tab.value }"
          @tap="onStatusTap(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>
    </scroll-view>

    <view v-for="item in list" :key="item.id" class="card" @tap="goDetail(item)">
      <view class="card-head">
        <text class="doc-no">{{ item.docNo }}</text>
        <text class="status" :style="{ color: statusColor(item.status) }">{{ item.status }}</text>
      </view>
      <view class="card-meta">{{ item.warehouse || '—' }} · {{ item.stocktakeType || '—' }}</view>
      <view class="card-foot">
        <text>{{ lineCount(item) }} 行 · 明盘</text>
        <text>{{ item.createdAt || '' }}</text>
      </view>
      <view v-if="canEdit(item)" class="card-actions" @tap.stop>
        <text class="link" @tap="goEdit(item)">编辑</text>
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无盘点单，可新建或在 PC 创建后同步查看</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import {
  listStocktakeOrders,
  canEditStocktake,
  stocktakeStatusColor,
  ensureMobileStocktakeDemoSeed,
  STOCKTAKE_STATUS,
} from '@/utils/stocktakeBridge'

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])

const statusTabs = [
  { label: '全部', value: '' },
  { label: STOCKTAKE_STATUS.DRAFT, value: STOCKTAKE_STATUS.DRAFT },
  { label: STOCKTAKE_STATUS.PENDING_APPROVAL, value: STOCKTAKE_STATUS.PENDING_APPROVAL },
  { label: STOCKTAKE_STATUS.APPROVED, value: STOCKTAKE_STATUS.APPROVED },
  { label: STOCKTAKE_STATUS.REFUSED, value: STOCKTAKE_STATUS.REFUSED },
]

function reload() {
  ensureMobileStocktakeDemoSeed()
  list.value = listStocktakeOrders({
    keyword: keyword.value,
    status: statusFilter.value,
  })
}

function onStatusTap(value) {
  statusFilter.value = value
  reload()
}

function lineCount(item) {
  return (item.lineItems || []).length
}

function canEdit(item) {
  return canEditStocktake(item)
}

function statusColor(status) {
  return stocktakeStatusColor(status)
}

function goCreate() {
  uni.navigateTo({ url: '/pages/stocktake/edit' })
}

function goEdit(item) {
  uni.navigateTo({ url: `/pages/stocktake/edit?id=${item.id}` })
}

function goDetail(item) {
  if (canEditStocktake(item)) {
    goEdit(item)
    return
  }
  uni.navigateTo({ url: `/pages/stocktake/detail?id=${item.id}` })
}

onShow(() => reload())

onPullDownRefresh(() => {
  reload()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 48rpx;
  background: #f5f6f8;
}

.search-bar {
  margin-bottom: 16rpx;
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.status-scroll {
  width: 100%;
  margin-bottom: 20rpx;
  white-space: nowrap;
}

.status-track {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 0;
  background: transparent;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #595959;
  background: #fff;
  border-radius: 999rpx;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &.active {
    color: #fff;
    background: #1677ff;
    font-weight: 600;
    box-shadow: none;
  }
}

.action-row {
  margin-bottom: 20rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 80rpx;
  background: #1677ff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.action-icon {
  font-size: 36rpx;
}

.card {
  margin-bottom: 16rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-no {
  font-size: 30rpx;
  font-weight: 700;
  color: #262626;
}

.status {
  font-size: 24rpx;
  font-weight: 600;
}

.card-meta {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #595959;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.card-actions {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1px solid #f0f0f0;
}

.link {
  color: #1677ff;
  font-size: 26rpx;
}

.empty {
  margin-top: 80rpx;
  text-align: center;
  color: #8c8c8c;
  font-size: 28rpx;
}
</style>
