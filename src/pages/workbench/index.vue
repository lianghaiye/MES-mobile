<template>
  <view class="workbench">
    <view class="platform-banner">
      <text class="platform-title">工业互联网平台</text>
      <view class="platform-slogan-pill">
        <text class="platform-slogan">让制造更简单 · 让产业更智慧</text>
      </view>
    </view>

    <view class="section-title">常用功能</view>
    <view class="module-grid">
      <ModuleCard
        v-for="mod in modules"
        :key="mod.key"
        :mod="mod"
        :badge="mod.key === 'qc-task' ? pendingQc : mod.key === 'todo' ? pendingTodo : 0"
        @tap="onModuleTap(mod)"
      />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ModuleCard from '@/components/ModuleCard.vue'
import { workbenchModules, openModule } from '@/utils/nav'
import { getUser, isLoggedIn } from '@/utils/auth'
import { getMyPendingCount } from '@/mock/myPending'

const modules = workbenchModules
const pendingQc = ref(0)
const pendingTodo = ref(0)

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  const user = getUser()
  const pending = getMyPendingCount(user)
  pendingQc.value = pending.qc
  pendingTodo.value = pending.todo
})

function onModuleTap(mod) {
  openModule(mod)
}
</script>

<style lang="scss" scoped>
.workbench {
  padding: 24rpx;
  padding-bottom: 32rpx;
}

.platform-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56rpx 32rpx 48rpx;
  margin-bottom: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #fafff9 0%, #edf9e6 45%, #d8f2cc 100%);
  box-shadow: 0 8rpx 24rpx rgba(82, 196, 26, 0.08);
}

.platform-title {
  font-size: 52rpx;
  font-weight: 700;
  color: #5cadff;
  letter-spacing: 4rpx;
  line-height: 1.3;
}

.platform-slogan-pill {
  margin-top: 24rpx;
  padding: 14rpx 32rpx;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 999rpx;
}

.platform-slogan {
  font-size: 24rpx;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.4;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  color: $text-primary;
}

.module-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
</style>
