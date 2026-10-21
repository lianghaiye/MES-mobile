<template>
  <view class="mine-page">
    <view class="profile-card">
      <view class="avatar">{{ avatarText }}</view>
      <view class="info">
        <text class="name">{{ user?.displayName || '未登录' }}</text>
        <text class="meta">账号：{{ user?.username || '-' }}</text>
        <text class="meta">工厂：{{ user?.factory || '-' }}</text>
      </view>
    </view>

    <view class="menu-card">
      <view class="menu-item" @tap="goLogin">
        <text>切换账号</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="handleResetMobileDemo">
        <view class="menu-copy">
          <text>重置演示数据</text>
          <text class="menu-desc">报工、领料、入库、盘点恢复为仓库种子</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="handleLogout">
        <text class="danger">退出登录</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <text class="version">I-DOMS Mobile v0.1.0</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUser, logout, isLoggedIn } from '@/utils/auth'
import { resetMobileDemoData } from '@/mock/resetProcessReportDemo'

const user = computed(() => getUser())
const avatarText = computed(() => (user.value?.displayName || 'U').slice(0, 1))

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
  }
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

function handleResetMobileDemo() {
  uni.showModal({
    title: '重置演示数据',
    content: '将清除本机工序报工、领料、入库、盘点缓存（含出库/入库单据与库存批次），恢复为仓库种子数据。登录账号不受影响。此操作不可撤销。',
    confirmText: '重置',
    confirmColor: '#ff4d4f',
    success(res) {
      if (!res.confirm) return
      resetMobileDemoData()
      uni.showToast({ title: '已恢复仓库演示数据', icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/workbench/index' })
      }, 400)
    },
  })
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success(res) {
      if (res.confirm) {
        logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
.mine-page {
  padding: 24rpx;
}

.profile-card {
  display: flex;
  align-items: center;
  background: $bg-card;
  border-radius: $radius;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  background: $primary-light;
  color: $primary;
  font-size: 44rpx;
  font-weight: 600;
  border-radius: 50%;
  margin-right: 24rpx;
}

.name {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: $text-secondary;
}

.menu-card {
  background: $bg-card;
  border-radius: $radius;
  overflow: hidden;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid $border;
  font-size: 30rpx;
}

.menu-copy {
  flex: 1;
  min-width: 0;
}

.menu-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-secondary;
}

.menu-item:last-child {
  border-bottom: none;
}

.arrow {
  color: $text-secondary;
}

.danger {
  color: $error;
}

.version {
  display: block;
  text-align: center;
  margin-top: 48rpx;
  font-size: 24rpx;
  color: $text-secondary;
}
</style>
