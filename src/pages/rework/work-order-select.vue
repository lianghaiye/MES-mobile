<template>
  <view class="select-page">
    <view class="filter-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索工单号 / 产品 / 图号"
        confirm-type="search"
      />
    </view>
    <text class="hint">仅可选生产/总装且执行中、已完成或返工中的工单；列表前几条为带工序的演示工单</text>

    <view v-for="item in list" :key="item.id" class="wo-card" @tap="pick(item)">
      <view class="wo-head">
        <text class="wo-code">{{ item.code }}</text>
        <text class="wo-tag">{{ item.orderCategory }}</text>
      </view>
      <text class="wo-product">{{ item.productName }} · {{ item.productCode || '—' }}</text>
      <view class="wo-detail">
        <text>规格：{{ item.specModel || '—' }}</text>
        <text>图号：{{ item.drawingNo || '—' }}</text>
      </view>
      <view class="wo-meta">
        <text>数量 {{ item.scheduleQty || item.planQty || '—' }}</text>
        <text>{{ item.workCenter || '—' }}</text>
        <text class="status">{{ item.status }}</text>
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无可选工单</view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { listReworkableWorkOrders } from '@/store/reworkOrderStore'

const keyword = ref('')

const list = computed(() => listReworkableWorkOrders({ keyword: keyword.value }))

function pick(item) {
  uni.navigateTo({ url: `/pages/rework/create?workOrderId=${item.id}` })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.select-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.filter-bar {
  margin-bottom: 12rpx;
}

.search-input {
  background: #fff;
  border-radius: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
}

.hint {
  display: block;
  font-size: 22rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.wo-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.wo-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wo-code {
  font-size: 28rpx;
  font-weight: 600;
  color: $primary;
}

.wo-tag {
  font-size: 22rpx;
  color: #1677ff;
  background: #e6f4ff;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
}

.wo-product {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #262626;
}

.wo-detail,
.wo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 20rpx;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.status {
  color: #fa8c16;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 80rpx 0;
  font-size: 26rpx;
}
</style>
