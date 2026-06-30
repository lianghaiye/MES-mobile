<template>
  <view v-if="task" class="claim-detail-page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">任务详情</text>
      <view class="nav-placeholder" />
    </view>

    <view class="status-banner">
      <text class="status-tag" :class="statusTagClass">{{ statusLabel }}</text>
      <text v-if="task.salesOrderNo" class="sales-no">{{ task.salesOrderNo }}</text>
      <text v-if="isReportMode && task.isPersonalTask" class="scope-tag personal">个人</text>
      <text v-else-if="isReportMode && task.isGroupTask" class="scope-tag group">小组</text>
    </view>

    <view class="section-card">
      <text class="section-title">工单信息</text>
      <view class="info-list">
        <view v-for="row in workOrderRows" :key="row.label" class="info-row">
          <text class="info-label">{{ row.label }}</text>
          <text class="info-value">{{ row.value }}</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">产品信息</text>
      <view class="info-list">
        <view v-for="row in productRows" :key="row.label" class="info-row">
          <text class="info-label">{{ row.label }}</text>
          <text class="info-value">{{ row.value }}</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">任务信息</text>
      <view class="info-list">
        <view v-for="row in taskRows" :key="row.label" class="info-row">
          <text class="info-label">{{ row.label }}</text>
          <text class="info-value">{{ row.value }}</text>
        </view>
      </view>
    </view>

    <view class="footer-bar">
      <template v-if="isReportMode">
        <button
          v-if="task.status === 'pending'"
          class="claim-btn"
          @tap="onGoReport"
        >
          去报工
        </button>
        <button
          v-else-if="task.status === 'reported'"
          class="claim-btn secondary"
          @tap="onViewRecord"
        >
          查看报工记录
        </button>
      </template>
      <button v-else class="claim-btn" :loading="claiming" @tap="onClaim">领取任务</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getUser } from '@/utils/auth'
import {
  getClaimableReportTaskById,
  getReportTaskById,
  claimReportTask,
} from '@/mock/processReportTasks'
import { getMyRecords } from '@/mock/processReportRecords'
import { getProcessReportMode } from '@/utils/iodomsStorage'
import { resolveReportMode } from '@/utils/reportMode'
import { resolveWorkerDisplayName } from '@/utils/workerGroup'

function displayReportMode(mode) {
  return resolveReportMode(mode)
}

const taskId = ref('')
const pageMode = ref('claim')
const reportFor = ref('')
const task = ref(null)
const claiming = ref(false)

const isReportMode = computed(() => pageMode.value === 'report')

const statusLabel = computed(() => {
  if (!isReportMode.value) return '待领取'
  if (task.value?.status === 'reported') return '已报工'
  return '待报工'
})

const statusTagClass = computed(() => {
  if (!isReportMode.value) return 'claim'
  if (task.value?.status === 'reported') return 'reported'
  return 'pending'
})

const workOrderRows = computed(() => {
  const t = task.value
  if (!t) return []
  return [
    { label: '工单类型', value: t.orderCategory || '—' },
    { label: '工单编号', value: t.workOrderNo || '—' },
    { label: '工单名称', value: t.workOrderName || '—' },
    { label: '销售单号', value: t.salesOrderNo || '—' },
    { label: '工艺路线', value: t.processRoute || '—' },
  ]
})

const productRows = computed(() => {
  const t = task.value
  if (!t) return []
  return [
    { label: '产品名称', value: t.productName || '—' },
    { label: '物品编码', value: t.productCode || '—' },
    { label: '规格型号', value: t.specModel || '—' },
    { label: '材质', value: t.material || '—' },
    { label: '图号', value: t.drawingNo || '—' },
    { label: '条码类型', value: t.barcodeType || '—' },
  ]
})

const taskRows = computed(() => {
  const t = task.value
  if (!t) return []
  const rows = [
    { label: '任务编号', value: t.taskNo || '—' },
    { label: '所属工序', value: `${t.processName || '—'}【第${t.processSeq || '—'}步】` },
    { label: '目标数量', value: `${t.targetQty ?? '—'} 件` },
    { label: '报工模式', value: displayReportMode(t.reportMode) },
    { label: '资源类型', value: t.resourceType || '工人' },
    { label: '创建时间', value: t.createdAt || '—' },
  ]
  if (isReportMode.value) {
    rows.splice(3, 0, {
      label: '待报数量',
      value: `${t.remainingQty ?? t.targetQty ?? '—'} 件`,
    })
    if ((t.reportedTotalQty || 0) > 0) {
      rows.splice(4, 0, { label: '已报数量', value: `${t.reportedTotalQty} 件` })
    }
    if (t.executor || t.claimedBy) {
      rows.push({ label: '执行人', value: t.claimedBy || t.executor || '—' })
    }
  }
  if (t.isMultiGroup && t.groupNames?.length) {
    rows.splice(6, 0, { label: '执行小组', value: t.groupNames.join('、') })
  } else if (t.groupName) {
    rows.splice(6, 0, { label: '所属组别', value: t.groupName })
  }
  if (!isReportMode.value) {
    const targets = t.claimTargets?.length ? t.claimTargets : t.executors
    if (targets?.length) {
      rows.push({ label: '可领取人', value: targets.join('、') })
    }
  }
  return rows
})

function reload() {
  if (!taskId.value) return
  const u = getUser()
  if (isReportMode.value) {
    task.value = getReportTaskById(taskId.value, u, {
      reportForMember: reportFor.value || resolveWorkerDisplayName(u),
    })
  } else {
    task.value = getClaimableReportTaskById(taskId.value, u)
  }
}

onLoad((query) => {
  taskId.value = query.id || ''
  pageMode.value = query.mode === 'report' ? 'report' : 'claim'
  reportFor.value = query.reportFor ? decodeURIComponent(query.reportFor) : ''
  reload()
  if (!task.value) {
    uni.showToast({
      title: isReportMode.value ? '任务不存在' : '任务不存在或不可领取',
      icon: 'none',
    })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

onShow(() => {
  reload()
})

function buildExecuteQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
}

function onGoReport() {
  const t = task.value
  if (!t) return
  const q = buildExecuteQuery({
    source: 'workorder',
    taskId: t.id,
    taskNo: t.taskNo,
    workOrderNo: t.workOrderNo,
    workOrderId: t.workOrderId,
    processId: t.id,
    processName: t.processName,
    productName: t.productName,
    productCode: t.productCode,
    specModel: t.specModel,
    material: t.material,
    drawingNo: t.drawingNo,
    targetQty: t.targetQty,
    remainingQty: t.remainingQty ?? t.targetQty,
    isGroupTask: t.isGroupTask ? '1' : '0',
    reportMode: t.reportMode || getProcessReportMode(t.processName),
    groupName: t.groupName || '',
    reportFor: reportFor.value || resolveWorkerDisplayName(getUser()),
  })
  uni.navigateTo({ url: `/pages/process-report/execute?${q}` })
}

function onViewRecord() {
  const t = task.value
  if (!t) return
  const list = getMyRecords(getUser(), 'all')
  const found = list.find(
    (r) =>
      r.taskId === t.id ||
      (r.workOrderNo === t.workOrderNo && r.processName === t.processName),
  )
  if (found) {
    uni.navigateTo({ url: `/pages/process-report/record-detail?id=${found.id}` })
    return
  }
  uni.showToast({ title: '暂无报工记录', icon: 'none' })
}

function onClaim() {
  if (!task.value || claiming.value) return
  claiming.value = true
  const res = claimReportTask(task.value.id, getUser())
  claiming.value = false
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  uni.showToast({ title: '领取成功', icon: 'success' })
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/process-report/index?tab=today' })
  }, 500)
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else {
    uni.redirectTo({
      url: `/pages/process-report/index?tab=${isReportMode.value ? 'today' : 'claim'}`,
    })
  }
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.claim-detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 0 24rpx calc(160rpx + env(safe-area-inset-bottom));
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 12rpx) 0 20rpx;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f5f6f8;
}

.nav-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  font-size: 52rpx;
  color: $primary;
  line-height: 1;
  font-weight: 300;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.nav-placeholder {
  width: 72rpx;
}

.status-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.status-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 600;

  &.claim {
    color: #fa8c16;
    background: #fff7e6;
  }

  &.pending {
    color: #fa8c16;
    background: #fff7e6;
  }

  &.reported {
    color: #8c8c8c;
    background: #f0f0f0;
  }
}

.sales-no {
  font-size: 24rpx;
  color: $primary;
  background: #e6f4ff;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.scope-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;

  &.personal {
    color: #531dab;
    background: #f9f0ff;
  }

  &.group {
    color: #08979c;
    background: #e6fffb;
  }
}

.section-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  font-size: 28rpx;
}

.info-label {
  width: 160rpx;
  flex-shrink: 0;
  color: #8c8c8c;
}

.info-value {
  flex: 1;
  color: #1a1a1a;
  word-break: break-all;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.claim-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 600;

  &.secondary {
    background: #fff;
    color: $primary;
    border: 2rpx solid $primary;
  }
}
</style>
