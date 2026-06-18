<template>
  <view class="page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">批量报工确认</text>
      <view class="nav-placeholder" />
    </view>

    <text class="page-sub">填写各任务报工数量</text>

    <view v-for="item in forms" :key="item.taskId" class="task-card">
      <view class="card-head">
        <text class="product">{{ item.task.productName }} · {{ item.task.productCode }}</text>
        <text class="target-badge piece">
          目标 {{ item.task.targetQty }} 件
        </text>
      </view>
      <text class="card-sub">工单 {{ item.task.workOrderNo }} · {{ item.task.processName }}</text>

      <template v-if="!item.durationMode">
        <view class="field-row">
          <view class="field half">
            <text class="label">良品数量</text>
            <view class="stepper">
              <view class="step-btn" @tap="changeQty(item, 'good', -1)">−</view>
              <input v-model.number="item.goodQty" class="step-val" type="digit" />
              <view class="step-btn primary" @tap="changeQty(item, 'good', 1)">+</view>
            </view>
          </view>
          <view class="field half">
            <text class="label">不良品数量</text>
            <view class="stepper">
              <view class="step-btn" @tap="changeQty(item, 'defect', -1)">−</view>
              <input
                v-model.number="item.defectQty"
                class="step-val"
                type="digit"
                @focus="onDefectFocus(item)"
                @blur="onDefectBlur(item)"
              />
              <view class="step-btn primary" @tap="changeQty(item, 'defect', 1)">+</view>
            </view>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="field-row">
          <view class="field half">
            <text class="label">工作时长（小时）</text>
            <view class="stepper">
              <view class="step-btn" @tap="changeHours(item, -0.5)">−</view>
              <input v-model="item.workHours" class="step-val sm" type="digit" />
              <view class="step-btn primary" @tap="changeHours(item, 0.5)">+</view>
            </view>
          </view>
          <view class="field half">
            <text class="label">完成数量（件）</text>
            <view class="stepper">
              <view class="step-btn" @tap="changeQty(item, 'good', -1)">−</view>
              <input v-model.number="item.goodQty" class="step-val sm" type="digit" />
              <view class="step-btn primary" @tap="changeQty(item, 'good', 1)">+</view>
            </view>
          </view>
        </view>
        <view class="field">
          <text class="label">不良品数量</text>
          <view class="stepper narrow">
            <view class="step-btn" @tap="changeQty(item, 'defect', -1)">−</view>
            <input
              v-model.number="item.defectQty"
              class="step-val sm"
              type="digit"
              @blur="syncDefectBreakdown(item)"
            />
            <view class="step-btn primary" @tap="changeQty(item, 'defect', 1)">+</view>
          </view>
        </view>
      </template>

      <DefectBreakdownField
        v-if="Number(item.defectQty) > 0"
        :defect-qty="Number(item.defectQty) || 0"
        :items="item.defectItems"
        :model-value="item.defectBreakdown"
        @update:model-value="(v) => onDefectBreakdownUpdate(item, v)"
      />
    </view>

    <view class="remark-card">
      <text class="label">备注（选填）</text>
      <textarea
        v-model="sharedRemark"
        class="remark"
        placeholder="可填写异常情况、备注说明等"
      />
    </view>

    <view class="foot">
      <button class="btn cancel" @tap="goBack">取消</button>
      <button class="btn submit" :loading="submitting" @tap="onSubmit">提交报工</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import DefectBreakdownField from '@/components/quick-report/DefectBreakdownField.vue'
import { getProcessDefectItems } from '@/utils/iodomsStorage'
import { isDurationReportMode } from '@/utils/reportMode'
import {
  syncDefectBreakdownOnQtyChange,
  validateDefectBreakdown,
} from '@/utils/defectBreakdown'
import {
  applyLinkedSingleQtyChange,
  applyLinkedSingleQtyFromDefect,
} from '@/utils/processReportQuantities'
import { getUser } from '@/utils/auth'
import {
  getReportTasksByIds,
  submitBatchCustomReports,
  buildCustomReportPayload,
  resolveReportContext,
} from '@/mock/processReportTasks'

const forms = ref([])
const sharedRemark = ref('')
const submitting = ref(false)
const reportForMember = ref('')

function createFormItem(task) {
  const targetQty = Number(task.targetQty) || 0
  const durationMode = isDurationReportMode(task.reportMode)
  return {
    taskId: task.id,
    task,
    durationMode,
    goodQty: targetQty,
    defectQty: 0,
    workHours: durationMode ? Math.max(0.5, Math.round(targetQty * 0.5 * 10) / 10) : 0,
    defectBreakdown: [],
    defectItems: getProcessDefectItems(task.processName),
    qtySnapshot: { goodQty: targetQty, defectQty: 0 },
    startTime: '',
    endTime: '',
    remark: '',
    images: [],
  }
}

onLoad((query) => {
  reportForMember.value = query.reportFor ? decodeURIComponent(query.reportFor) : ''
  const ids = (query.ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const options = reportForMember.value ? { reportForMember: reportForMember.value } : {}
  const tasks = getReportTasksByIds(ids, getUser(), options)
  if (!tasks.length) {
    uni.showToast({ title: '任务不存在或已报工', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1200)
    return
  }
  forms.value = tasks.map(createFormItem)
})

function goBack() {
  uni.navigateBack()
}

function refreshSnapshot(item) {
  item.qtySnapshot = {
    goodQty: Math.max(0, Number(item.goodQty) || 0),
    defectQty: Math.max(0, Number(item.defectQty) || 0),
  }
}

function changeQty(item, field, delta) {
  applyLinkedSingleQtyChange(item, field, delta)
  refreshSnapshot(item)
  if (field === 'defect') syncDefectBreakdown(item)
}

function onDefectFocus(item) {
  refreshSnapshot(item)
}

function onDefectBlur(item) {
  applyLinkedSingleQtyFromDefect(item, item.qtySnapshot)
  refreshSnapshot(item)
  syncDefectBreakdown(item)
}

function changeHours(item, delta) {
  item.workHours = Math.max(0, (Number(item.workHours) || 0) + delta)
}

function syncDefectBreakdown(item) {
  if (Number(item.defectQty) <= 0) {
    item.defectBreakdown = []
    return
  }
  item.defectBreakdown = syncDefectBreakdownOnQtyChange(
    { defectQty: item.defectQty, defectBreakdown: item.defectBreakdown },
    item.defectItems,
  )
}

function onDefectBreakdownUpdate(item, breakdown) {
  item.defectBreakdown = breakdown
}

function validateForms() {
  for (const item of forms.value) {
    const good = Number(item.goodQty) || 0
    const defect = Number(item.defectQty) || 0
    if (item.durationMode) {
      const hours = Number(item.workHours)
      if (!hours || hours <= 0) {
        return { ok: false, message: `${item.task.processName}：请填写工作时长` }
      }
    } else if (good + defect <= 0) {
      return { ok: false, message: `${item.task.processName}：请填写报工数量` }
    }
    const defectErr = validateDefectBreakdown(defect, item.defectBreakdown, item.defectItems)
    if (defectErr) {
      return { ok: false, message: `${item.task.processName}：${defectErr}` }
    }
  }
  return { ok: true }
}

function onSubmit() {
  if (submitting.value) return
  const check = validateForms()
  if (!check.ok) {
    uni.showToast({ title: check.message, icon: 'none' })
    return
  }
  submitting.value = true
  const user = getUser()
  const options = reportForMember.value ? { reportForMember: reportForMember.value } : {}
  const entries = forms.value.map((item) => ({
    taskId: item.taskId,
    payload: buildCustomReportPayload(
      item.task,
      item,
      sharedRemark.value,
      resolveReportContext(user, options, item.task),
    ),
  }))
  const res = submitBatchCustomReports(entries, user, options)
  submitting.value = false
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  uni.showToast({ title: res.message, icon: 'success' })
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/process-report/index?tab=today' })
  }, 1500)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 0 24rpx calc(160rpx + env(safe-area-inset-bottom));
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 12rpx) 0 16rpx;
}

.nav-back,
.nav-placeholder {
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
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
}

.page-sub {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 20rpx;
}

.task-card,
.remark-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.product {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.target-badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  flex-shrink: 0;

  &.piece {
    color: $primary;
    background: #e6f4ff;
  }

  &.hours {
    color: #52c41a;
    background: #f6ffed;
  }
}

.card-sub {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 20rpx;
}

.field-row {
  display: flex;
  gap: 20rpx;
}

.field {
  margin-bottom: 20rpx;

  &.half {
    flex: 1;
    min-width: 0;
  }
}

.label {
  display: block;
  font-size: 24rpx;
  color: #595959;
  margin-bottom: 12rpx;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx;
  background: #f5f5f5;
  border-radius: 12rpx;

  &.narrow {
    max-width: 360rpx;
  }
}

.step-btn {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  background: #fff;
  border-radius: 8rpx;
  font-size: 32rpx;
  color: #595959;
}

.step-btn.primary {
  background: $primary;
  color: #fff;
}

.step-val {
  flex: 1;
  text-align: center;
  font-size: 40rpx;
  font-weight: 700;
  color: $primary;
  height: 64rpx;

  &.sm {
    font-size: 32rpx;
  }
}

.remark-card .label {
  margin-bottom: 12rpx;
}

.remark {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  margin: 0;
  border: none;
}

.btn.cancel {
  background: #fff;
  color: #1a1a1a;
  border: 2rpx solid #d9d9d9;
}

.btn.submit {
  background: $primary;
  color: #fff;
}
</style>
