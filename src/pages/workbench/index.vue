<template>
  <view class="workbench">
    <view class="hero">
      <view class="hero-decor hero-decor--a" />
      <view class="hero-decor hero-decor--b" />
      <view class="hero-decor hero-decor--c" />

      <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
        <view class="nav-inner">
          <text class="nav-title">工作台</text>
        </view>
      </view>

      <view class="hero-top">
        <view class="hero-copy">
          <text class="greet-line">{{ greetText }}，{{ userName }}</text>
          <view class="factory-chip">
            <text class="factory-dot" />
            <text class="factory-text">{{ factoryName }}</text>
          </view>
          <text class="hero-hint">泵小智陪你高效开工</text>
        </view>
        <view
          class="hero-mascot"
          :style="{ backgroundImage: 'url(' + mascotImg + ')' }"
        />
      </view>
    </view>

    <view class="body">
      <view class="section-head">
        <view class="section-bar" />
        <text class="section-title">常用功能</text>
      </view>
      <view class="module-grid">
        <ModuleCard
          v-for="mod in modules"
          :key="mod.key"
          :mod="mod"
          :badge="
            mod.key === 'qc-task'
              ? pendingQc
              : mod.key === 'todo'
                ? pendingTodo
                : mod.key === 'approval'
                  ? pendingApproval
                  : 0
          "
          @tap="onModuleTap(mod)"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ModuleCard from '@/components/ModuleCard.vue'
import { workbenchModules, openModule } from '@/utils/nav'
import { getUser, isLoggedIn } from '@/utils/auth'
import { getMyPendingCount } from '@/mock/myPending'
import mascotImg from '@/assets/brand/beng-xiaozhi.png'

const modules = workbenchModules
const pendingQc = ref(0)
const pendingTodo = ref(0)
const pendingApproval = ref(0)
const statusBarHeight = ref(20)

try {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 20
} catch {
  statusBarHeight.value = 20
}

const userName = computed(() => getUser()?.displayName || '用户')
const factoryName = computed(() => getUser()?.factory || '默认工厂')

const greetText = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  const user = getUser()
  const pending = getMyPendingCount(user)
  pendingQc.value = pending.qc
  pendingTodo.value = pending.todo
  pendingApproval.value = pending.approval
})

function onModuleTap(mod) {
  openModule(mod)
}
</script>

<style lang="scss" scoped>
.workbench {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 32rpx;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: 0 28rpx 12rpx;
  background: linear-gradient(180deg, #4c9aff 0%, #3b8cff 36%, #1677ff 100%);
}

.nav {
  position: relative;
  z-index: 2;
}

.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}

.hero-decor {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.hero-decor--a {
  width: 280rpx;
  height: 280rpx;
  top: -40rpx;
  right: -40rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 70%);
}

.hero-decor--b {
  width: 180rpx;
  height: 180rpx;
  bottom: 40rpx;
  left: -60rpx;
  background: rgba(255, 255, 255, 0.08);
}

.hero-decor--c {
  width: 80rpx;
  height: 80rpx;
  top: 200rpx;
  left: 220rpx;
  background: rgba(255, 255, 255, 0.1);
}

.hero-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  min-height: 200rpx;
  padding-bottom: 8rpx;
}

.hero-copy {
  flex: 1;
  min-width: 0;
  padding-bottom: 28rpx;
}

.greet-line {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1rpx;
  line-height: 1.3;
}

.factory-chip {
  display: inline-flex;
  align-items: center;
  margin-top: 16rpx;
  padding: 8rpx 18rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.28);
}

.factory-dot {
  width: 12rpx;
  height: 12rpx;
  margin-right: 10rpx;
  border-radius: 50%;
  background: #95de64;
  box-shadow: 0 0 0 4rpx rgba(149, 222, 100, 0.28);
}

.factory-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.92);
  max-width: 280rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.hero-hint {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.72);
}

.hero-mascot {
  width: 220rpx;
  height: 220rpx;
  flex-shrink: 0;
  margin-right: -8rpx;
  margin-bottom: -4rpx;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.body {
  padding: 28rpx 24rpx 0;
}

.section-head {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-bar {
  width: 8rpx;
  height: 28rpx;
  margin-right: 12rpx;
  border-radius: 8rpx;
  background: linear-gradient(180deg, #1677ff, #69b1ff);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.module-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}
</style>
