<template>
  <view class="page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">报工确认详情</text>
      <view class="nav-placeholder" />
    </view>

    <view v-if="summary" class="summary-card">
      <view class="card-head">
        <text class="wo-no">{{ summary.workOrderNo }}</text>
        <text class="status-tag" :class="summary.listStatus === '已完成' ? 'done' : 'pending'">
          {{ summary.listStatus }}
        </text>
      </view>
      <text class="product-line">{{ summary.productName }} · {{ summary.productCode }}</text>
      <view class="metrics">
        <view class="metric">
          <text class="metric-label">目标件数</text>
          <text class="metric-val">{{ summary.targetQty }} 件</text>
        </view>
        <view class="metric">
          <text class="metric-label">已报工</text>
          <text class="metric-val blue">{{ summary.reportedQty }} 件</text>
        </view>
        <view class="metric">
          <text class="metric-label">完成率</text>
          <text class="metric-val" :class="rateClass(summary)">{{ summary.completionRate }}%</text>
        </view>
      </view>
    </view>

    <text class="section-title">工序任务（{{ summary?.taskCount || 0 }}）</text>

    <view v-for="task in summary?.lines || []" :key="task.id" class="task-card">
      <view class="task-head">
        <text class="task-no">{{ task.taskNo }}</text>
        <text class="task-status">{{ task.confirmStatus }}</text>
      </view>
      <view class="task-row">
        <text class="proc-name">{{ task.processName }}</text>
        <text class="mode-label">【{{ task.reportTypeLabel }}】</text>
      </view>
      <view class="field-grid">
        <view class="field">
          <text class="label">执行人</text>
          <text class="value">{{ task.executor }}</text>
        </view>
        <view class="field">
          <text class="label">报工数量</text>
          <text class="value highlight">{{ task.adjustedGoodQty ?? task.goodQty }}</text>
        </view>
        <view v-if="task.reportType === '时长报工'" class="field">
          <text class="label">报工时长</text>
          <text class="value">{{ task.adjustedDuration ?? task.reportDuration }}h</text>
        </view>
        <view class="field">
          <text class="label">报工时间</text>
          <text class="value">{{ task.reportTime }}</text>
        </view>
      </view>
      <view v-if="task.confirmStatus === '待确认'" class="actions">
        <button class="btn outline" size="mini" @tap="openAdjust(task)">调整</button>
        <button class="btn outline" size="mini" @tap="openSubsidy(task)">补贴</button>
        <button class="btn primary" size="mini" @tap="onPush(task)">推送确认</button>
      </view>
    </view>

    <view v-if="!summary" class="empty">工单不存在</view>

    <!-- 调整弹窗 -->
    <view v-if="adjustVisible" class="mask" @tap="adjustVisible = false">
      <view class="modal" @tap.stop>
        <text class="modal-title">调整报工</text>
        <text class="modal-sub">{{ activeLine?.processName }} · {{ activeLine?.executor }}</text>
        <view class="form-item">
          <text class="form-label">良品数</text>
          <input v-model.number="adjustForm.goodQty" type="digit" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">不良品数</text>
          <input v-model.number="adjustForm.defectQty" type="digit" class="form-input" />
        </view>
        <view v-if="activeLine?.reportType === '时长报工'" class="form-item">
          <text class="form-label">报工时长(h)</text>
          <input v-model.number="adjustForm.reportDuration" type="digit" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">调整原因</text>
          <textarea v-model="adjustForm.adjustReason" class="form-textarea" placeholder="请输入" />
        </view>
        <view class="modal-actions">
          <button class="btn outline" @tap="adjustVisible = false">取消</button>
          <button class="btn primary" @tap="submitAdjust">确定</button>
        </view>
      </view>
    </view>

    <!-- 补贴弹窗 -->
    <view v-if="subsidyVisible" class="mask" @tap="subsidyVisible = false">
      <view class="modal" @tap.stop>
        <text class="modal-title">补贴</text>
        <text class="modal-sub">{{ activeLine?.processName }} · {{ activeLine?.salaryMethod }}</text>
        <view v-if="activeLine?.salaryMethod === '计件工资'" class="form-item">
          <text class="form-label">补贴报工数</text>
          <input v-model.number="subsidyForm.subsidyReportQty" type="digit" class="form-input" />
        </view>
        <view v-else class="form-item">
          <text class="form-label">补贴工时(h)</text>
          <input v-model.number="subsidyForm.subsidyHours" type="digit" class="form-input" />
        </view>
        <view class="form-item">
          <text class="form-label">补贴原因</text>
          <textarea v-model="subsidyForm.subsidyReason" class="form-textarea" placeholder="请输入" />
        </view>
        <view class="modal-actions">
          <button class="btn outline" @tap="subsidyVisible = false">取消</button>
          <button class="btn primary" @tap="submitSubsidy">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  getWorkOrderConfirmById,
  adjustConfirmLine,
  subsidyConfirmLine,
  pushConfirmToWorker,
} from '@/mock/reportConfirmStore'

const workOrderId = ref('')
const summary = ref(null)
const adjustVisible = ref(false)
const subsidyVisible = ref(false)
const activeLine = ref(null)
const adjustForm = ref({ goodQty: 0, defectQty: 0, reportDuration: 0, adjustReason: '' })
const subsidyForm = ref({ subsidyReportQty: 0, subsidyHours: 0, subsidyReason: '' })

onLoad((query) => {
  workOrderId.value = query.id || ''
})

onShow(() => {
  if (workOrderId.value) {
    summary.value = getWorkOrderConfirmById(workOrderId.value)
  }
})

function goBack() {
  uni.navigateBack()
}

function rateClass(item) {
  if (item.completionRate >= 100) return 'green'
  if (item.listStatus === '已完成' && item.completionRate < 100) return 'warn'
  return ''
}

function openAdjust(task) {
  activeLine.value = task
  adjustForm.value = {
    goodQty: task.adjustedGoodQty ?? task.goodQty,
    defectQty: task.adjustedDefectQty ?? task.defectQty,
    reportDuration: task.adjustedDuration ?? task.reportDuration,
    adjustReason: task.adjustReason || '',
  }
  adjustVisible.value = true
}

function openSubsidy(task) {
  activeLine.value = task
  subsidyForm.value = {
    subsidyReportQty: task.subsidyReportQty || 0,
    subsidyHours: task.subsidyHours || 0,
    subsidyReason: task.subsidyReason || '',
  }
  subsidyVisible.value = true
}

function submitAdjust() {
  const res = adjustConfirmLine(activeLine.value.id, adjustForm.value)
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  adjustVisible.value = false
  summary.value = getWorkOrderConfirmById(workOrderId.value)
  uni.showToast({ title: '调整已保存', icon: 'success' })
}

function submitSubsidy() {
  const res = subsidyConfirmLine(activeLine.value.id, subsidyForm.value)
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  subsidyVisible.value = false
  summary.value = getWorkOrderConfirmById(workOrderId.value)
  uni.showToast({ title: '补贴已保存', icon: 'success' })
}

function onPush(task) {
  uni.showModal({
    title: '推送确认',
    content: `将任务 ${task.taskNo} 推送给 ${task.executor} 确认？`,
    success: (r) => {
      if (!r.confirm) return
      const res = pushConfirmToWorker(task.id)
      if (!res.ok) {
        uni.showToast({ title: res.message, icon: 'none' })
        return
      }
      summary.value = getWorkOrderConfirmById(workOrderId.value)
      uni.showToast({ title: res.message, icon: 'success' })
    },
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 32rpx;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 88rpx 24rpx 16rpx;
  background: #fff;
}

.nav-back,
.nav-placeholder {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  font-size: 48rpx;
  color: #333;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
}

.summary-card {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.wo-no {
  font-size: 32rpx;
  font-weight: 700;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  &.pending {
    color: #1677ff;
    background: #e6f4ff;
  }

  &.done {
    color: #52c41a;
    background: #f6ffed;
  }
}

.product-line {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 20rpx;
}

.metrics {
  display: flex;
  justify-content: space-between;
}

.metric {
  flex: 1;
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 22rpx;
  color: #8c8c8c;
  margin-bottom: 8rpx;
}

.metric-val {
  font-size: 30rpx;
  font-weight: 600;

  &.blue {
    color: #1677ff;
  }

  &.green {
    color: #52c41a;
  }

  &.warn {
    color: #ff4d4f;
  }
}

.section-title {
  display: block;
  padding: 8rpx 24rpx 16rpx;
  font-size: 26rpx;
  color: #8c8c8c;
}

.task-card {
  margin: 0 24rpx 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.task-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.task-no {
  font-size: 24rpx;
  color: #8c8c8c;
}

.task-status {
  font-size: 22rpx;
  color: #1677ff;
}

.task-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.proc-name {
  font-size: 30rpx;
  font-weight: 600;
}

.mode-label {
  font-size: 22rpx;
  color: #8c8c8c;
}

.field-grid {
  display: flex;
  flex-wrap: wrap;
}

.field {
  width: 50%;
  margin-bottom: 8rpx;
}

.label {
  display: block;
  font-size: 22rpx;
  color: #8c8c8c;
}

.value {
  font-size: 26rpx;

  &.highlight {
    color: #1677ff;
    font-weight: 600;
  }
}

.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  justify-content: flex-end;
}

.btn {
  font-size: 24rpx;
  padding: 0 24rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 8rpx;

  &.outline {
    background: #fff;
    color: #1677ff;
    border: 1rpx solid #1677ff;
  }

  &.primary {
    background: #1677ff;
    color: #fff;
    border: none;
  }
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: #bfbfbf;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.modal {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 24rpx calc(32rpx + env(safe-area-inset-bottom));
}

.modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.modal-sub {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 20rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 8rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  padding: 0 16rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  padding: 16rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;

  .btn {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    text-align: center;
  }
}
</style>
