<template>
  <view class="qc-list-page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索质检单号 / 销售单号 / 客户"
        confirm-type="search"
        @confirm="loadList"
      />
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

    <view v-if="!list.length" class="empty">暂无质检任务</view>

    <view
      v-for="item in list"
      :key="item.id"
      class="card"
      @tap="goDetail(item)"
    >
      <view class="card-head">
        <text class="qc-no">{{ item.qcNo || '待生成单号' }}</text>
        <StatusTag :text="item.qcStatus" />
      </view>
      <view class="row">
        <text class="label">销售单号</text>
        <text class="val">{{ item.salesOrderNo }}</text>
      </view>
      <view class="row">
        <text class="label">客户</text>
        <text class="val">{{ item.customerName }}</text>
      </view>
      <view class="row">
        <text class="label">出库单号</text>
        <text class="val">{{ item.outboundDocNo || '-' }}</text>
      </view>
      <view v-if="item.qcResult" class="row">
        <text class="label">质检结果</text>
        <StatusTag :text="item.qcResult" />
      </view>
      <view v-if="item.qcStatus === '待质检'" class="card-foot">
        <button class="btn-sm" size="mini" @tap.stop="goInspect(item)">去质检</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import { getQcList } from '@/mock/factoryQc'

const keyword = ref('')
const statusFilter = ref('')
const allList = ref([])

const tabs = computed(() => {
  const all = allList.value
  return [
    { label: '全部', value: '', count: all.length },
    { label: '待质检', value: '待质检', count: all.filter((r) => r.qcStatus === '待质检').length },
    { label: '已完成', value: '已完成', count: all.filter((r) => r.qcStatus === '已完成').length },
  ]
})

const list = computed(() => {
  return getQcList({
    qcStatus: statusFilter.value || undefined,
    keyword: keyword.value.trim(),
  })
})

function loadList() {
  allList.value = getQcList({})
}

function setFilter(val) {
  statusFilter.value = val
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/qc-task/detail?id=${item.id}` })
}

function goInspect(item) {
  uni.navigateTo({ url: `/pages/qc-task/inspect?id=${item.id}` })
}

onShow(() => loadList())

onPullDownRefresh(() => {
  loadList()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.qc-list-page {
  padding: 24rpx;
  padding-bottom: 48rpx;
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-input {
  height: 72rpx;
  padding: 0 24rpx;
  background: $bg-card;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.tabs {
  white-space: nowrap;
  margin-bottom: 24rpx;
}

.tab {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: $text-secondary;
  background: $bg-card;
  border-radius: 32rpx;
}

.tab.active {
  color: $primary;
  background: $primary-light;
  font-weight: 600;
}

.tab-count {
  margin-left: 4rpx;
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: $text-secondary;
}

.card {
  background: $bg-card;
  border-radius: $radius;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.qc-no {
  font-size: 30rpx;
  font-weight: 600;
  color: $primary;
}

.row {
  display: flex;
  margin-top: 10rpx;
  font-size: 26rpx;
}

.label {
  width: 160rpx;
  color: $text-secondary;
  flex-shrink: 0;
}

.val {
  flex: 1;
  color: $text-primary;
}

.card-foot {
  margin-top: 20rpx;
  text-align: right;
}

.btn-sm {
  background: $primary;
  color: #fff;
  border: none;
}
</style>
