<template>
  <view class="select-page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索工单号 / 产品名称 / 图号"
        confirm-type="search"
      />
    </view>

    <view
      v-for="item in list"
      :key="item.id"
      class="wo-card"
      @tap="selectWorkOrder(item)"
    >
      <view class="wo-head">
        <text class="wo-code">{{ item.code }}</text>
        <text class="wo-tag">{{ item.orderCategory }}</text>
      </view>
      <text class="wo-product">{{ item.productName }} · {{ item.productCode || '—' }}</text>
      <view class="wo-detail">
        <text>材质：{{ item.material || '—' }}</text>
        <text>图号：{{ item.drawingNo || '—' }}</text>
      </view>
      <view class="wo-detail">
        <text>销售订单：{{ item.salesOrderNo || '—' }}</text>
      </view>
      <view class="wo-meta">
        <text>数量 {{ item.scheduleQty }}</text>
        <text>{{ item.workCenter }}</text>
        <text class="status">{{ item.status }}</text>
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无可领料工单</view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { filterWorkOrders } from '@/mock/workOrderBridge'

const keyword = ref('')

const list = computed(() => filterWorkOrders({ keyword: keyword.value }))

function selectWorkOrder(item) {
  uni.navigateTo({
    url: `/pages/material-req/create-by-work-order?workOrderId=${item.id}`,
  })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.select-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.search-bar {
  margin-bottom: 20rpx;
}

.search-input {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}

.wo-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.wo-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wo-code {
  font-size: 30rpx;
  font-weight: 600;
  color: $primary;
}

.wo-tag {
  font-size: 22rpx;
  color: #595959;
  background: #f5f6f8;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.wo-product {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  color: #262626;
}

.wo-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 24rpx;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #595959;
}

.wo-meta {
  display: flex;
  gap: 20rpx;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.status {
  color: #52c41a;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 80rpx 0;
  font-size: 26rpx;
}
</style>
