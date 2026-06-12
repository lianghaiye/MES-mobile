<template>
  <view class="execute-page">
    <view class="custom-nav">
      <view class="nav-back" @tap="onNavBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">填写报工</text>
      <view class="nav-placeholder" />
    </view>

    <view class="sub-title">{{ processName }} · {{ productName }} {{ productCode }}</view>

    <view class="mode-tag">{{ reportMode }}</view>

    <view class="card">
      <text class="card-title">报工信息{{ isDurationReportMode(reportMode) ? '（时长型）' : '' }}</text>

      <view v-if="targetQty" class="target-bar">
        <text>今日目标</text>
        <text class="target-num">{{ targetQty }} 件</text>
      </view>

      <!-- 批量计件 -->
      <template v-if="!isDurationReportMode(reportMode)">
        <view class="field">
          <text class="label required">良品数量</text>
          <view class="stepper">
            <view class="step-btn" @tap="changeQty('good', -1)">−</view>
            <input v-model.number="form.goodQty" class="step-val" type="digit" />
            <view class="step-btn primary" @tap="changeQty('good', 1)">+</view>
          </view>
        </view>
        <view class="field">
          <text class="label">不良品数量</text>
          <view class="stepper">
            <view class="step-btn" @tap="changeQty('defect', -1)">−</view>
            <input v-model.number="form.defectQty" class="step-val" type="digit" />
            <view class="step-btn primary" @tap="changeQty('defect', 1)">+</view>
          </view>
        </view>
        <view v-if="defectItems.length" class="field">
          <text class="label">不良原因（选填）</text>
          <view class="chips">
            <view
              v-for="item in defectItems"
              :key="item.id"
              class="chip"
              :class="{ active: form.defectItemIds.includes(item.id) }"
              @tap="toggleDefect(item.id)"
            >{{ item.name }}</view>
          </view>
        </view>
      </template>

      <!-- 时长报工 -->
      <template v-else>
        <view class="field">
          <text class="label required">工作时长（小时）</text>
          <view class="stepper">
            <view class="step-btn" @tap="changeHours(-0.5)">−</view>
            <input v-model="form.workHours" class="step-val" type="digit" />
            <view class="step-btn primary" @tap="changeHours(0.5)">+</view>
          </view>
        </view>
        <view class="field">
          <text class="label required">良品数量</text>
          <view class="stepper">
            <view class="step-btn" @tap="changeQty('good', -1)">−</view>
            <input v-model.number="form.goodQty" class="step-val" type="digit" />
            <view class="step-btn primary" @tap="changeQty('good', 1)">+</view>
          </view>
        </view>
        <view class="field">
          <text class="label">不良品数量</text>
          <view class="stepper">
            <view class="step-btn" @tap="changeQty('defect', -1)">−</view>
            <input v-model.number="form.defectQty" class="step-val" type="digit" />
            <view class="step-btn primary" @tap="changeQty('defect', 1)">+</view>
          </view>
        </view>
        <view v-if="defectItems.length" class="field">
          <text class="label">不良原因（选填）</text>
          <view class="chips">
            <view
              v-for="item in defectItems"
              :key="item.id"
              class="chip"
              :class="{ active: form.defectItemIds.includes(item.id) }"
              @tap="toggleDefect(item.id)"
            >{{ item.name }}</view>
          </view>
        </view>
        <view class="time-row">
          <view class="time-col">
            <text class="label">开始时间</text>
            <picker mode="time" :value="form.startTime" @change="onStartChange">
              <view class="time-box">{{ form.startTime }}</view>
            </picker>
          </view>
          <view class="time-col">
            <text class="label">结束时间</text>
            <picker mode="time" :value="form.endTime" @change="onEndChange">
              <view class="time-box">{{ form.endTime }}</view>
            </picker>
          </view>
        </view>
      </template>

      <view class="field">
        <text class="label">备注（选填）</text>
        <textarea v-model="form.remark" class="remark" placeholder="添加备注..." />
      </view>
    </view>

    <view class="foot">
      <button class="btn cancel" @tap="onPrevStep">
        {{ context.source === 'quick' ? '上一步' : '取消' }}
      </button>
      <button class="btn submit" :loading="submitting" @tap="onSubmit">提交报工</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'
import {
  getProcessDefectItems,
  getProcessReportMode,
} from '@/utils/iodomsStorage'
import { isDurationReportMode } from '@/utils/reportMode'
import { submitProcessReport } from '@/mock/processReportRecords'
import { markTaskReported } from '@/mock/processReportTasks'

const submitting = ref(false)
const processName = ref('')
const productName = ref('')
const productCode = ref('')
const reportMode = ref('批量计件')
const targetQty = ref(null)
const defectItems = ref([])
const context = reactive({
  source: 'quick',
  productId: '',
  taskId: '',
  taskNo: '',
  workOrderNo: '',
  workOrderId: '',
  processId: '',
})

const form = reactive({
  goodQty: 0,
  defectQty: 0,
  finishedQty: 0,
  workHours: 4.5,
  startTime: '',
  endTime: '',
  defectItemIds: [],
  remark: '',
})

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onLoad((query) => {
  processName.value = decodeURIComponent(query.processName || '')
  productName.value = decodeURIComponent(query.productName || '')
  productCode.value = query.productCode || ''
  targetQty.value = query.targetQty ? Number(query.targetQty) : null
  context.source = query.source || 'quick'
  context.productId = query.productId || ''
  context.taskId = query.taskId || ''
  context.taskNo = query.taskNo || ''
  context.workOrderNo = query.workOrderNo || ''
  context.workOrderId = query.workOrderId || ''
  context.processId = query.processId || ''

  reportMode.value = query.reportMode || getProcessReportMode(processName.value)
  defectItems.value = getProcessDefectItems(processName.value)
  form.startTime = nowTime()
  form.endTime = nowTime()
  if (targetQty.value) {
    form.goodQty = targetQty.value
    form.finishedQty = targetQty.value
  }
})

function changeQty(field, delta) {
  const key = field === 'good' ? 'goodQty' : 'defectQty'
  form[key] = Math.max(0, (Number(form[key]) || 0) + delta)
}

function changeHours(delta) {
  form.workHours = Math.max(0, (Number(form.workHours) || 0) + delta)
}

function toggleDefect(id) {
  const i = form.defectItemIds.indexOf(id)
  if (i >= 0) form.defectItemIds.splice(i, 1)
  else form.defectItemIds.push(id)
}

function onStartChange(e) {
  form.startTime = e.detail.value
}

function onEndChange(e) {
  form.endTime = e.detail.value
}

function onNavBack() {
  if (context.source === 'quick') {
    uni.redirectTo({ url: '/pages/process-report/index?tab=quick' })
    return
  }
  uni.navigateBack()
}

function onPrevStep() {
  if (context.source === 'quick' && context.productId) {
    const q = [
      `productId=${encodeURIComponent(context.productId)}`,
      `processName=${encodeURIComponent(processName.value)}`,
    ].join('&')
    uni.redirectTo({ url: `/pages/process-report/quick-process?${q}` })
    return
  }
  uni.navigateBack()
}

onBackPress(() => {
  if (context.source === 'quick') {
    onNavBack()
    return true
  }
  return false
})

function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  const names = defectItems.value
    .filter((d) => form.defectItemIds.includes(d.id))
    .map((d) => d.name)
  const res = submitProcessReport({
    ...context,
    processName: processName.value,
    productName: productName.value,
    productCode: productCode.value,
    targetQty: targetQty.value,
    reportMode: reportMode.value,
    goodQty: form.goodQty,
    defectQty: form.defectQty,
    finishedQty: (Number(form.goodQty) || 0) + (Number(form.defectQty) || 0),
    workHours: form.workHours,
    startTime: form.startTime,
    endTime: form.endTime,
    defectItemIds: [...form.defectItemIds],
    defectItemNames: names,
    remark: form.remark,
  })
  submitting.value = false
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  if (context.taskId) {
    markTaskReported(context.taskId, {
      goodQty: form.goodQty,
      defectQty: form.defectQty,
    })
  }
  uni.showToast({ title: res.message, icon: 'none', duration: 2000 })
  setTimeout(() => {
    if (context.source === 'workorder') {
      uni.navigateBack()
    } else {
      uni.redirectTo({ url: '/pages/process-report/index?tab=records' })
    }
  }, 2000)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.execute-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 0 24rpx 160rpx;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 12rpx) 0 20rpx;
  background: #f5f6f8;
  position: sticky;
  top: 0;
  z-index: 10;
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

.sub-title {
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 12rpx;
}

.mode-tag {
  display: inline-block;
  margin-bottom: 20rpx;
  padding: 6rpx 16rpx;
  background: #e6f4ff;
  color: $primary;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
}

.card-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.target-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #e6f4ff;
  border-radius: 12rpx;
  margin-bottom: 28rpx;
  font-size: 26rpx;
  color: #595959;
}

.target-num {
  font-size: 36rpx;
  font-weight: 700;
  color: $primary;
}

.field {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 12rpx;
}

.label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4rpx;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.step-btn {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 36rpx;
  color: #595959;
}

.step-btn.primary {
  background: $primary;
  color: #fff;
}

.step-val {
  flex: 1;
  text-align: center;
  font-size: 56rpx;
  font-weight: 700;
  color: $primary;
  height: 80rpx;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  padding: 12rpx 28rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #595959;
}

.chip.active {
  border-color: $primary;
  color: $primary;
  background: #e6f4ff;
}

.time-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

.time-col {
  flex: 1;
}

.time-box {
  margin-top: 12rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: center;
  font-size: 32rpx;
  color: #1a1a1a;
}

.remark {
  width: 100%;
  min-height: 120rpx;
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
  padding: 20rpx 24rpx 40rpx;
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
