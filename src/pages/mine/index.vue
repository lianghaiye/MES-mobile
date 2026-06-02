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
  padding: 32rpx;
  border-bottom: 1rpx solid $border;
  font-size: 30rpx;
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
