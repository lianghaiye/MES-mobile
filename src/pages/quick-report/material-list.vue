<template>
  <view v-if="material" class="material-page">
    <view class="head-card">
      <view class="head-row">
        <text class="label">工单号</text>
        <text class="val primary">{{ material.workOrderNo }}</text>
      </view>
      <view class="head-row">
        <text class="label">产品</text>
        <text class="val">{{ material.productName }} · {{ material.productCode }}</text>
      </view>
      <view class="head-row">
        <text class="label">报工数量</text>
        <text class="val">{{ material.finishedQty }} 件</text>
      </view>
      <view class="status-tip" :class="material.status === '已确认' ? 'ok' : 'pending'">
        {{ material.status === '已确认' ? '仓库已确认领料' : '待仓库确认领料' }}
      </view>
    </view>

    <view class="list-card">
      <text class="section-title">领料清单（倒冲计算）</text>
      <view v-for="item in material.items" :key="item.id" class="mat-row">
        <view class="mat-info">
          <text class="mat-name">{{ item.materialName }}</text>
          <text class="mat-spec">{{ item.spec }}</text>
        </view>
        <text class="mat-qty">{{ item.qty }} {{ item.unit }}</text>
      </view>
      <view v-if="!material.items.length" class="empty">暂无用料数据</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMaterialListByReportId } from '@/mock/quickReport'

const material = ref(null)

onLoad((query) => {
  material.value = getMaterialListByReportId(query.reportId)
  if (!material.value) {
    uni.showToast({ title: '领料清单不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.material-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.head-card,
.list-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.head-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
  font-size: 28rpx;
}

.label {
  color: #8c8c8c;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.status-tip {
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.status-tip.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status-tip.ok {
  background: #f6ffed;
  color: #52c41a;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
}

.mat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.mat-row:last-child {
  border-bottom: none;
}

.mat-name {
  display: block;
  font-size: 28rpx;
  color: #1a1a1a;
}

.mat-spec {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.mat-qty {
  font-size: 28rpx;
  color: $primary;
  font-weight: 600;
  flex-shrink: 0;
}

.empty {
  text-align: center;
  padding: 40rpx;
  color: #999;
}
</style>
