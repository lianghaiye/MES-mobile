<template>
  <view class="login-page">
    <view class="brand">
      <view class="brand-text">
        <text class="logo">I-DOMS</text>
        <text class="sub">制造执行系统 · 移动端</text>
      </view>
      <image class="mascot" :src="mascotImg" mode="aspectFit" />
    </view>
    <view class="form-card">
      <view class="field">
        <text class="label">账号</text>
        <input v-model="username" class="input" placeholder="请输入账号" />
      </view>
      <view class="field">
        <text class="label">密码</text>
        <input v-model="password" class="input" password placeholder="请输入密码" />
      </view>
      <button class="btn-primary" @tap="handleLogin">登录</button>
      <text class="tip">演示账号：admin / 任意密码</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { login } from '@/utils/auth'
import mascotImg from '@/assets/brand/beng-xiaozhi.png'

const username = ref('admin')
const password = ref('')
const redirectUrl = ref('')

onLoad((query) => {
  if (query.redirect) {
    try {
      redirectUrl.value = decodeURIComponent(query.redirect)
    } catch {
      redirectUrl.value = query.redirect
    }
  }
})

function handleLogin() {
  const result = login(username.value, password.value)
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
    return
  }
  if (redirectUrl.value && redirectUrl.value.startsWith('/')) {
    uni.redirectTo({
      url: redirectUrl.value,
      fail: () => {
        uni.reLaunch({ url: redirectUrl.value })
      },
    })
    return
  }
  uni.switchTab({ url: '/pages/workbench/index' })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1677ff 0%, #0958d9 45%, #f5f6f8 45%);
  padding: 100rpx 40rpx 48rpx;
}

.brand {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 40rpx;
  padding-right: 8rpx;
}

.brand-text {
  flex: 1;
  min-width: 0;
  padding-top: 28rpx;
}

.mascot {
  width: 220rpx;
  height: 220rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
  margin-top: -12rpx;
}

.logo {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #fff;
}

.sub {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
}

.form-card {
  background: $bg-card;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.field {
  margin-bottom: 32rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  margin-bottom: 12rpx;
}

.input {
  height: 88rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.btn-primary {
  margin-top: 16rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: $primary;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;
  border: none;
}

.tip {
  display: block;
  margin-top: 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: $text-secondary;
}
</style>
