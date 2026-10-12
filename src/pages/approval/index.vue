<template>
  <view class="hub-page">
    <view class="hero">
      <view class="hero-glow" />
      <text class="hero-kicker">APPROVAL</text>
      <text class="hero-title">审批管理</text>
      <text class="hero-desc">按单据类型分流查看待审核订单</text>
      <view class="hero-stat">
        <text class="stat-num">{{ totalPending }}</text>
        <text class="stat-label">项待审核</text>
      </view>
    </view>

    <view v-for="group in groups" :key="group.name" class="group-block">
      <view class="group-head">
        <view class="group-bar" />
        <text class="group-name">{{ group.name }}</text>
      </view>
      <view class="card-grid" :class="{ single: group.items.length === 1 }">
        <view
          v-for="item in group.items"
          :key="item.scope"
          class="scope-card"
          :class="`tone-${item.tone}`"
          @tap="goList(item.scope)"
        >
          <view class="card-top">
            <view class="icon-wrap">
              <text class="icon">{{ item.icon }}</text>
            </view>
            <view v-if="pendingMap[item.scope]" class="pending-pill">
              {{ pendingMap[item.scope] }} 待审
            </view>
            <view v-else class="pending-pill idle">暂无</view>
          </view>
          <text class="card-title">{{ item.title }}</text>
          <text class="card-desc">{{ item.desc }}</text>
          <view class="card-foot">
            <text class="enter">进入列表</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  APPROVAL_SCOPE_META,
  getApprovalScopePendingCounts,
  getPendingApprovalCount,
  ensureApprovalDemoSeed,
} from '@/mock/approval'

const pendingMap = ref({})
const totalPending = ref(0)

const groups = computed(() => {
  const order = ['销售履约', '采购供应链']
  return order.map((name) => ({
    name,
    items: APPROVAL_SCOPE_META.filter((m) => m.group === name),
  }))
})

function refresh() {
  ensureApprovalDemoSeed()
  pendingMap.value = getApprovalScopePendingCounts()
  totalPending.value = getPendingApprovalCount()
}

function goList(scope) {
  uni.navigateTo({
    url: `/pages/approval/list?scope=${encodeURIComponent(scope)}`,
  })
}

onShow(() => refresh())
</script>

<style lang="scss" scoped>
.hub-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 48rpx;
  background: linear-gradient(180deg, #f5f0ff 0%, #f5f6f8 28%, #f5f6f8 100%);
  box-sizing: border-box;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: 40rpx 32rpx 36rpx;
  margin-bottom: 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #722ed1 0%, #531dab 48%, #391085 100%);
  box-shadow: 0 16rpx 40rpx rgba(114, 46, 209, 0.28);
}

.hero-glow {
  position: absolute;
  right: -40rpx;
  top: -60rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.28) 0%, transparent 70%);
}

.hero-kicker {
  position: relative;
  display: block;
  font-size: 20rpx;
  letter-spacing: 4rpx;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 12rpx;
}

.hero-title {
  position: relative;
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.hero-desc {
  position: relative;
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.5;
}

.hero-stat {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 28rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
}

.stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.group-block {
  margin-bottom: 28rpx;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
}

.group-bar {
  width: 8rpx;
  height: 28rpx;
  border-radius: 8rpx;
  background: #722ed1;
}

.group-name {
  font-size: 26rpx;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.card-grid.single {
  grid-template-columns: 1fr;
}

.scope-card {
  position: relative;
  padding: 24rpx 22rpx 20rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(15, 35, 80, 0.06);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.scope-card::after {
  content: '';
  position: absolute;
  right: -20rpx;
  bottom: -20rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  opacity: 0.14;
}

.tone-blue::after {
  background: #1677ff;
}
.tone-orange::after {
  background: #fa8c16;
}
.tone-purple::after {
  background: #722ed1;
}

.tone-blue .icon-wrap {
  background: #e6f4ff;
}
.tone-orange .icon-wrap {
  background: #fff7e6;
}
.tone-purple .icon-wrap {
  background: #f9f0ff;
}

.tone-blue .card-foot {
  color: #1677ff;
}
.tone-orange .card-foot {
  color: #fa8c16;
}
.tone-purple .card-foot {
  color: #722ed1;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  font-size: 36rpx;
}

.pending-pill {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: #cf1322;
  background: #fff1f0;
}

.pending-pill.idle {
  color: rgba(0, 0, 0, 0.45);
  background: #f5f5f5;
  font-weight: 500;
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 8rpx;
}

.card-desc {
  display: block;
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.45;
  min-height: 64rpx;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.04);
  font-size: 24rpx;
  font-weight: 600;
}

.arrow {
  font-size: 32rpx;
  line-height: 1;
}
</style>
