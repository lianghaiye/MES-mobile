<template>
  <view class="workbench">
    <view class="header">
      <view class="user-block">
        <text class="hello">你好，{{ userName }}</text>
        <text class="factory">{{ factoryName }}</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ myPendingCount }}</text>
        <text class="stat-label">我的待办</text>
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
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ModuleCard from '@/components/ModuleCard.vue'
import { workbenchModules, openModule } from '@/utils/nav'
import { getUser, isLoggedIn } from '@/utils/auth'
import { getPendingQcCount } from '@/mock/factoryQc'
import { getPendingTaskCount } from '@/mock/disassemblyTasks'
import { getMyPendingCount } from '@/mock/myPending'

const modules = workbenchModules
const myPendingCount = ref(0)
const pendingQc = ref(0)
const pendingTodo = ref(0)

const userName = computed(() => getUser()?.displayName || '用户')
const factoryName = computed(() => getUser()?.factory || '默认工厂')

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  const user = getUser()
  const pending = getMyPendingCount(user)
  myPendingCount.value = pending.total
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

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1677ff, #4096ff);
  border-radius: $radius;
  padding: 32rpx;
  margin-bottom: 32rpx;
  color: #fff;
}

.hello {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.factory {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.9;
}

.stat {
  text-align: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}

.stat-label {
  font-size: 22rpx;
  opacity: 0.9;
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
