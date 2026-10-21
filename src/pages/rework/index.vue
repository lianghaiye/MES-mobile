<template>
  <view class="index-page">
    <view class="action-row">
      <view class="action-card primary" @tap="goCreate">
        <text class="action-icon">🔧</text>
        <text class="action-title">新建返工单</text>
        <text class="action-desc">选择工单，指定重做工序后生效</text>
      </view>
    </view>

    <view class="filter-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="返工单号 / 工单号 / 产品名称 / 产品编号 / 图号"
        confirm-type="search"
      />
    </view>

    <view class="list-head">
      <text class="list-title">返工单</text>
      <text class="list-count">共 {{ list.length }} 条</text>
    </view>

    <view v-for="item in list" :key="item.id" class="req-card" @tap="goDetail(item)">
      <view class="req-head">
        <view class="req-head-left">
          <text class="req-no">{{ item.reworkNo }}</text>
          <text class="req-mode">{{ item.source || '车间小程序' }}</text>
        </view>
        <text class="req-status" :class="statusClass(item.status)">{{ item.status }}</text>
      </view>
      <text class="req-main">
        {{ item.productName || '—' }}
        <text v-if="item.workOrderNo" class="req-sub"> · {{ item.workOrderNo }}</text>
      </text>
      <view class="req-foot">
        <text>返工 {{ item.qty }} 件</text>
        <text class="dot">·</text>
        <text>{{ item.workCenter || '—' }}</text>
        <text class="dot">·</text>
        <text>{{ processText(item) }}</text>
        <text class="dot">·</text>
        <text>{{ formatTime(item.createdAt) }}</text>
      </view>
    </view>

    <view v-if="!list.length" class="empty">{{
      keyword.trim() ? '没有匹配的返工单' : '暂无返工单，点击上方新建'
    }}</view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listReworkOrders } from '@/store/reworkOrderStore'

const keyword = ref('')
const refreshKey = ref(0)

const list = computed(() => {
  refreshKey.value
  return listReworkOrders({ keyword: keyword.value })
})

function loadList() {
  refreshKey.value += 1
}

onShow(() => {
  loadList()
})

onPullDownRefresh(() => {
  loadList()
  uni.stopPullDownRefresh()
})

function goCreate() {
  uni.navigateTo({ url: '/pages/rework/work-order-select' })
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/rework/detail?id=${item.id}` })
}

function processText(item) {
  const names = (item.processes || []).map((p) => p.processName).filter(Boolean)
  if (!names.length) return '未指定工序'
  if (names.length <= 2) return names.join('、')
  return `${names.slice(0, 2).join('、')} 等${names.length}道`
}

function formatTime(value) {
  if (!value) return '—'
  const text = String(value)
  return text.length >= 16 ? text.slice(5, 16) : text
}

function statusClass(status) {
  if (status === '已完成') return 'ok'
  if (status === '已关闭') return 'muted'
  if (status === '返工中') return 'doing'
  return ''
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

.filter-bar {
  margin-bottom: 16rpx;
}

.search-input {
  background: #fff;
  border-radius: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
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

  &.ok {
    color: #52c41a;
  }
  &.doing {
    color: #1677ff;
  }
  &.muted {
    color: #8c8c8c;
  }
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
