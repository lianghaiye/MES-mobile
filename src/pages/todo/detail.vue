<template>
  <view v-if="task" class="detail-page">
    <view class="action-row">
      <button class="action-btn outline" @tap="onDispatch">分发</button>
      <button v-if="canStart" class="action-btn primary" @tap="onStart">开工</button>
    </view>

    <view class="section">
      <text class="section-title">工单信息</text>
      <view class="info-list">
        <view v-for="row in workOrderRows" :key="row.label" class="info-row">
          <text class="info-icon">▦</text>
          <text class="info-label">{{ row.label }}</text>
          <text class="info-value">{{ row.value }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">任务信息</text>
      <view class="info-list">
        <view v-for="row in taskRows" :key="row.label" class="info-row">
          <text class="info-icon">▦</text>
          <text class="info-label">{{ row.label }}</text>
          <text class="info-value">{{ row.value }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getTaskById, startTask } from '@/mock/disassemblyTasks'

const task = ref(null)

const canStart = computed(() => {
  if (!task.value) return false
  return ['待开始', '执行中'].includes(task.value.taskStatus)
})

const workOrderRows = computed(() => {
  const t = task.value
  if (!t) return []
  return [
    { label: '工单编号', value: t.workOrderCode },
    { label: '工单名称', value: t.workOrderName },
    { label: '产品名称', value: t.productName },
    { label: '工艺路线', value: t.processRoute },
    { label: '工单备注', value: t.workOrderRemark || '—' },
  ]
})

const taskRows = computed(() => {
  const t = task.value
  if (!t) return []
  const rows = [
    { label: '所属工序', value: t.processName },
    { label: '工序名称', value: `${t.processName}【第${t.processSeq}步】` },
    { label: '任务编号', value: t.taskNo },
    { label: '创建时间', value: t.createdAt },
    { label: '预计产量', value: String(t.expectedQty) },
    { label: '执行人', value: t.executor },
    { label: '所属组别', value: t.groupName },
    { label: '条码类型', value: t.barcodeType },
  ]
  if (t.serialNo) rows.push({ label: '序列号', value: t.serialNo })
  return rows
})

onLoad((query) => {
  task.value = getTaskById(query.id)
  if (!task.value) {
    uni.showToast({ title: '任务不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function onDispatch() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function onStart() {
  if (!task.value) return
  if (task.value.taskStatus === '待分发') {
    uni.showToast({ title: '请先完成分发', icon: 'none' })
    return
  }
  const res = startTask(task.value.id)
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  task.value = getTaskById(task.value.id)
  if (task.value.processName === '拆解') {
    uni.navigateTo({ url: `/pages/todo/execute?id=${task.value.id}` })
    return
  }
  if (task.value.processName === '拆解质检') {
    uni.navigateTo({ url: `/pages/todo/qc-execute?id=${task.value.id}` })
    return
  }
  uni.showToast({ title: '该工序执行页开发中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
$green: #07c160;

.detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 48rpx;
}

.action-row {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  background: #fff;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
}

.action-btn.primary {
  background: $green;
  color: #fff;
}

.action-btn.outline {
  background: #fff;
  color: $green;
  border: 2rpx solid $green;
}

.section {
  margin: 20rpx 24rpx 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.section-title {
  display: block;
  padding: 24rpx 28rpx 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.info-list {
  padding: 0 28rpx 16rpx;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 26rpx;
}

.info-icon {
  color: $green;
  margin-right: 12rpx;
  font-size: 24rpx;
}

.info-label {
  width: 180rpx;
  color: #999;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  color: #333;
}
</style>
