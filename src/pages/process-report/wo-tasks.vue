<template>
  <view class="wo-tasks-page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">工单任务</text>
      <view class="nav-placeholder" />
    </view>

    <view v-if="hint" class="hint-banner">{{ hint }}</view>

    <view v-if="!tasks.length" class="empty">
      <text>暂无工序任务（可能尚未下发）</text>
    </view>

    <view
      v-for="task in tasks"
      :key="task.id"
      class="task-card"
      @tap="onOpenTask(task)"
    >
      <view class="task-head">
        <text class="proc-seq">{{ task.processSeq }}</text>
        <text class="proc-name">{{ task.processName }}</text>
        <text class="status" :class="statusClass(task)">{{ statusText(task) }}</text>
      </view>
      <text class="meta">工单 {{ task.workOrderNo || '—' }} · 目标 {{ task.targetQty ?? '—' }} 件</text>
      <text class="meta">{{ task.productName }} · {{ task.productCode || task.itemCode || '' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getUser } from '@/utils/auth'
import { getAllTasks, mergePcSyncedTasks } from '@/mock/disassemblyTasks'
import { getReportTaskById, getClaimableReportTaskById } from '@/mock/processReportTasks'

const workOrderId = ref('')
const hint = ref('')
const tasks = ref([])

function goBack() {
  uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/workbench/index' }) })
}

function statusText(task) {
  return task.taskStatus || task.status || '—'
}

function statusClass(task) {
  const s = statusText(task)
  if (s === '已完成') return 'done'
  if (s === '待领取') return 'claim'
  return 'pending'
}

function reload() {
  try {
    mergePcSyncedTasks()
  } catch {
    /* ignore */
  }
  const id = workOrderId.value
  const list = getAllTasks()
    .filter((t) => t.workOrderId === id && !t.hiddenByTerminate)
    .sort((a, b) => Number(a.processSeq) - Number(b.processSeq))
  tasks.value = list
}

function onOpenTask(task) {
  const u = getUser()
  const needClaim =
    (task.placement === 'claim' && task.taskStatus === '待领取') ||
    (task.taskStatus === '待领取' && !task.claimedBy)

  if (needClaim) {
    const claimable = getClaimableReportTaskById(task.id, u)
    if (!claimable) {
      uni.showToast({ title: '该任务不可领取或不在您的范围', icon: 'none' })
    }
    uni.navigateTo({
      url: `/pages/process-report/claim-detail?id=${encodeURIComponent(task.id)}&mode=claim`,
    })
    return
  }

  if (task.taskStatus === '已完成') {
    uni.navigateTo({
      url: `/pages/process-report/claim-detail?id=${encodeURIComponent(task.id)}&mode=report`,
    })
    return
  }

  const reportable = getReportTaskById(task.id, u)
  if (reportable && reportable.status === 'pending') {
    uni.navigateTo({
      url: `/pages/process-report/execute?source=workorder&taskId=${encodeURIComponent(task.id)}`,
    })
    return
  }

  uni.navigateTo({
    url: `/pages/process-report/claim-detail?id=${encodeURIComponent(task.id)}&mode=report`,
  })
}

onLoad((query) => {
  workOrderId.value = query.workOrderId ? decodeURIComponent(query.workOrderId) : ''
  hint.value = query.hint ? decodeURIComponent(query.hint) : ''
  reload()
})

onShow(() => {
  reload()
})
</script>

<style lang="scss" scoped>
.wo-tasks-page {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: 48rpx;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 24rpx 16rpx;
  background: #fff;
}

.nav-back,
.nav-placeholder {
  width: 64rpx;
}

.back-arrow {
  font-size: 48rpx;
  line-height: 1;
  color: $text-primary;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
}

.hint-banner {
  margin: 16rpx 24rpx 0;
  padding: 16rpx 20rpx;
  background: #fff7e6;
  color: #d48806;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.empty {
  padding: 80rpx 24rpx;
  text-align: center;
  color: $text-secondary;
}

.task-card {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: $bg-card;
  border-radius: 12rpx;
}

.task-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.proc-seq {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 22rpx;
  text-align: center;
  line-height: 40rpx;
}

.proc-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
}

.status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.status.claim {
  background: #fff7e6;
  color: #d48806;
}

.status.pending {
  background: #e6f4ff;
  color: #1677ff;
}

.status.done {
  background: #f6ffed;
  color: #52c41a;
}

.meta {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  line-height: 1.5;
}
</style>
