<template>
  <view class="scan-entry-page">
    <view class="card">
      <text class="title">{{ title }}</text>
      <text class="desc">{{ message }}</text>
      <button v-if="showRetry" class="btn" @tap="runResolve">重试</button>
      <button class="btn ghost" @tap="goHome">返回工作台</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { isLoggedIn, getUser } from '@/utils/auth'
import { resolveWorkOrderQrToken } from '@/utils/workOrderQrResolve'
import { getAllTasks } from '@/mock/disassemblyTasks'
import { mergePcSyncedTasks } from '@/mock/disassemblyTasks'

const title = ref('正在打开…')
const message = ref('请稍候')
const showRetry = ref(false)
const tokenRef = ref('')

function goHome() {
  uni.switchTab({ url: '/pages/workbench/index' })
}

function buildExecuteUrl(taskId) {
  return `/pages/process-report/execute?source=workorder&taskId=${encodeURIComponent(taskId)}`
}

function navigateByResolve(result) {
  const { landType, processTaskId, workOrderId, tip, message: msg } = result
  if (tip || msg) {
    uni.showToast({ title: tip || msg, icon: 'none', duration: 2200 })
  }

  if (landType === 'expired') {
    title.value = '链接已失效'
    message.value = msg || tip || '无法打开该二维码'
    showRetry.value = true
    return
  }

  if (landType === 'wo_task_list') {
    const hint = encodeURIComponent(msg || tip || '')
    uni.redirectTo({
      url: `/pages/process-report/wo-tasks?workOrderId=${encodeURIComponent(workOrderId || '')}${
        hint ? `&hint=${hint}` : ''
      }`,
    })
    return
  }

  if (landType === 'execute' && processTaskId) {
    uni.redirectTo({ url: buildExecuteUrl(processTaskId) })
    return
  }

  if ((landType === 'claim_detail' || landType === 'readonly') && processTaskId) {
    const pageMode = landType === 'claim_detail' ? 'claim' : 'report'
    uni.redirectTo({
      url: `/pages/process-report/claim-detail?id=${encodeURIComponent(processTaskId)}&mode=${pageMode}${
        tip || msg
          ? `&tip=${encodeURIComponent(tip || msg)}`
          : ''
      }`,
    })
    return
  }

  title.value = '无法打开'
  message.value = msg || '未识别的落地类型'
  showRetry.value = true
}

function runResolve() {
  showRetry.value = false
  title.value = '正在打开…'
  message.value = '请稍候'
  const token = tokenRef.value
  if (!token) {
    title.value = '缺少二维码参数'
    message.value = '请重新扫描工单上的报工二维码'
    showRetry.value = false
    return
  }
  if (!isLoggedIn()) {
    const back = `/pages/process-report/scan-entry?token=${encodeURIComponent(token)}`
    uni.redirectTo({
      url: `/pages/login/index?redirect=${encodeURIComponent(back)}`,
    })
    return
  }

  try {
    mergePcSyncedTasks()
  } catch {
    /* ignore */
  }
  const tasks = getAllTasks()
  const result = resolveWorkOrderQrToken(token, { tasks, user: getUser() })
  navigateByResolve(result)
}

onLoad((query) => {
  tokenRef.value = query.token ? decodeURIComponent(query.token) : ''
  runResolve()
})
</script>

<style lang="scss" scoped>
.scan-entry-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  background: $bg-page;
}

.card {
  width: 100%;
  background: $bg-card;
  border-radius: 16rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 16rpx;
}

.desc {
  display: block;
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

.btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  background: #1677ff;
  color: #fff;
  font-size: 30rpx;
  margin-bottom: 20rpx;
}

.btn.ghost {
  background: #fff;
  color: #1677ff;
  border: 1px solid #1677ff;
}
</style>
