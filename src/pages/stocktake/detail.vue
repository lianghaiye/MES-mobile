<template>
  <view class="page">
    <view v-if="order" class="section">
      <view class="head">
        <text class="doc-no">{{ order.docNo }}</text>
        <text class="status" :style="{ color: statusColor(order.status) }">{{ order.status }}</text>
      </view>
      <view class="meta">仓库 {{ order.warehouse || '—' }}</view>
      <view class="meta">类型 {{ order.stocktakeType || '—' }} · 明盘</view>
      <view class="meta">创建 {{ order.createdAt || '—' }}</view>
      <view v-if="order.remark" class="meta">备注 {{ order.remark }}</view>
      <view class="tip">审核与过账请在 PC 端盘点管理完成</view>
    </view>

    <view v-if="order" class="section">
      <view class="section-title">盘点清单 · {{ (order.lineItems || []).length }} 行</view>
      <view v-for="line in order.lineItems || []" :key="line.id" class="line-card">
        <view class="line-head">
          <text class="line-name">{{ line.itemName || line.itemCode }}</text>
          <text class="line-tag">{{ line.dedicated ? '按单' : '自由' }}</text>
        </view>
        <text class="line-code">{{ line.itemCode }}</text>
        <view class="line-qty">
          <text>账面 {{ line.bookQty }}</text>
          <text>实盘 {{ line.actualQty }}</text>
          <text :class="{ pos: line.diffQty > 0, neg: line.diffQty < 0 }">
            差异 {{ line.diffQty }}
          </text>
        </view>
      </view>
    </view>

    <view v-else class="empty">单据不存在</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getStocktakeOrderById, stocktakeStatusColor } from '@/utils/stocktakeBridge'

const order = ref(null)

function statusColor(status) {
  return stocktakeStatusColor(status)
}

onLoad((query) => {
  order.value = getStocktakeOrderById(query?.id) || null
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f5f6f8;
}

.section {
  margin-bottom: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-no {
  font-size: 32rpx;
  font-weight: 700;
}

.status {
  font-size: 26rpx;
  font-weight: 600;
}

.meta {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #595959;
}

.tip {
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: #fff7e6;
  color: #d46b08;
  font-size: 24rpx;
  border-radius: 8rpx;
}

.section-title {
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.line-card {
  padding: 16rpx 0;
  border-top: 1px solid #f5f5f5;
}

.line-head {
  display: flex;
  justify-content: space-between;
}

.line-name {
  font-size: 28rpx;
  font-weight: 600;
}

.line-tag {
  font-size: 22rpx;
  color: #1677ff;
}

.line-code {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.line-qty {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #595959;

  .pos {
    color: #52c41a;
  }

  .neg {
    color: #ff4d4f;
  }
}

.empty {
  margin-top: 80rpx;
  text-align: center;
  color: #8c8c8c;
}
</style>
