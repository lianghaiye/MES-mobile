<template>
  <view class="create-page">
    <view v-if="workOrder" class="card">
      <view class="wo-row">
        <text class="label">工单号</text>
        <text class="val primary">{{ workOrder.code }}</text>
      </view>
      <view class="wo-row">
        <text class="label">产品</text>
        <text class="val">{{ workOrder.productName }}</text>
      </view>
      <view class="wo-row">
        <text class="label">规格 / 图号</text>
        <text class="val">{{ workOrder.specModel || '—' }} / {{ workOrder.drawingNo || '—' }}</text>
      </view>
      <view class="wo-row">
        <text class="label">排产数量</text>
        <text class="val">{{ workOrder.scheduleQty || workOrder.planQty || '—' }}</text>
      </view>
      <view class="wo-row">
        <text class="label">加工中心</text>
        <text class="val">{{ workOrder.workCenter || '—' }}</text>
      </view>
    </view>

    <view class="card">
      <view class="field-row">
        <text class="field-label">返工数量</text>
        <input v-model="form.qty" class="field-input" type="number" placeholder="请输入数量" />
      </view>
      <view class="field-row">
        <text class="field-label">返工原因</text>
        <input v-model="form.reason" class="field-input" placeholder="选填" />
      </view>
      <view class="field-row">
        <text class="field-label">备注</text>
        <input v-model="form.remark" class="field-input" placeholder="选填" />
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">重做工序</text>
      <text class="hint">勾选需重做的工序；默认返工人为原执行人，可点选更换</text>
    </view>
    <view class="card">
      <view v-for="proc in processOptions" :key="proc.name" class="proc-row">
        <view class="checkbox" :class="{ checked: selected.has(proc.name) }" @tap="toggleProcess(proc.name)">
          <text v-if="selected.has(proc.name)">✓</text>
        </view>
        <view class="proc-body">
          <text class="proc-name" @tap="toggleProcess(proc.name)">{{ proc.name }}</text>
          <text class="proc-meta">原执行人 {{ (proc.executors || []).join('、') || '—' }}</text>
          <view
            v-if="selected.has(proc.name)"
            class="assignee-row"
            @tap.stop="pickAssignee(proc)"
          >
            <text class="assignee-label">返工人</text>
            <text class="assignee-val">{{ assigneeOf(proc) }}</text>
            <text class="assignee-arrow">选择 ›</text>
          </view>
        </view>
      </view>
      <view v-if="!processOptions.length" class="empty">该工单暂无工序列表</view>
    </view>

    <view class="footer-bar">
      <button class="submit-btn" :loading="submitting" @tap="onSubmit">创建并生效</button>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { consumeSelectionResult } from '@/utils/selection'
import {
  createReworkOrderFromWorkOrder,
  getReworkableWorkOrderById,
} from '@/store/reworkOrderStore'

const workOrder = ref(null)
const processOptions = ref([])
const selected = ref(new Set())
const assignees = reactive({})
const submitting = ref(false)
const form = reactive({
  qty: 1,
  reason: '',
  remark: '',
})

onLoad((query) => {
  const wo = getReworkableWorkOrderById(query.workOrderId)
  if (!wo) {
    uni.showToast({ title: '工单不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1200)
    return
  }
  workOrder.value = wo
  form.qty = Math.max(1, Number(wo.scheduleQty) || Number(wo.planQty) || 1)
  const procs = (wo.processes || [])
    .map((p) => ({
      name: p.name || p.processName,
      executors: p.executors || [],
    }))
    .filter((p) => p.name)
  processOptions.value = procs
  selected.value = new Set()
})

onShow(() => {
  const picked = consumeSelectionResult('reworkAssignee')
  if (!picked?.processName) return
  if (picked.name) assignees[picked.processName] = picked.name
})

function defaultAssignee(proc) {
  return (proc?.executors || [])[0] || ''
}

function assigneeOf(proc) {
  return assignees[proc.name] || defaultAssignee(proc) || '请选择'
}

function toggleProcess(name) {
  const next = new Set(selected.value)
  if (next.has(name)) {
    next.delete(name)
  } else {
    next.add(name)
    const proc = processOptions.value.find((p) => p.name === name)
    if (!assignees[name] && defaultAssignee(proc)) {
      assignees[name] = defaultAssignee(proc)
    }
  }
  selected.value = next
}

function pickAssignee(proc) {
  if (!selected.value.has(proc.name)) {
    toggleProcess(proc.name)
  }
  const current = assigneeOf(proc)
  const encoded = encodeURIComponent(JSON.stringify(current && current !== '请选择' ? [current] : []))
  uni.navigateTo({
    url: `/pages/quick-report/personnel-select?mode=single&selectionType=reworkAssignee&processId=${encodeURIComponent(proc.name)}&selected=${encoded}`,
  })
}

function onSubmit() {
  if (submitting.value || !workOrder.value) return
  submitting.value = true
  const processNames = [...selected.value]
  const processAssignees = {}
  processNames.forEach((name) => {
    if (assignees[name]) processAssignees[name] = assignees[name]
  })
  const res = createReworkOrderFromWorkOrder({
    workOrderId: workOrder.value.id,
    qty: Number(form.qty),
    reason: form.reason,
    remark: form.remark,
    processNames,
    processAssignees,
  })
  submitting.value = false
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  uni.showToast({ title: '已创建', icon: 'success' })
  setTimeout(() => {
    uni.redirectTo({ url: `/pages/rework/detail?id=${res.order.id}` })
  }, 400)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.create-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx 24rpx 160rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  margin-bottom: 16rpx;
}

.wo-row,
.field-row,
.proc-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.proc-row {
  align-items: flex-start;
}

.wo-row:last-child,
.field-row:last-child,
.proc-row:last-child {
  border-bottom: none;
}

.label,
.field-label {
  width: 160rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #8c8c8c;
}

.val {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #262626;
  text-align: left;
  word-break: break-all;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.field-input {
  flex: 1;
  font-size: 26rpx;
  text-align: right;
}

.section-head {
  margin: 8rpx 8rpx 12rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
}

.hint {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  margin-top: 6rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #fff;
  flex-shrink: 0;
}

.checkbox.checked {
  background: $primary;
  border-color: $primary;
}

.proc-body {
  flex: 1;
  min-width: 0;
}

.proc-name {
  display: block;
  font-size: 28rpx;
  color: #262626;
}

.proc-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.assignee-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 16rpx;
  background: #f5f8ff;
  border-radius: 10rpx;
}

.assignee-label {
  font-size: 22rpx;
  color: #8c8c8c;
  flex-shrink: 0;
}

.assignee-val {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #1677ff;
  font-weight: 500;
}

.assignee-arrow {
  font-size: 22rpx;
  color: #1677ff;
  flex-shrink: 0;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 32rpx 0;
  font-size: 26rpx;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.submit-btn {
  background: $primary;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
