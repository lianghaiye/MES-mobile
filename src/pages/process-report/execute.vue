<template>
  <view class="execute-page">
    <view class="custom-nav">
      <view class="nav-back" @tap="onNavBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">{{ editId ? '重新报工' : '填写报工' }}</text>
      <view class="nav-placeholder" />
    </view>

    <view class="sub-title">{{ processName }} · {{ productName }} {{ productCode }}</view>

    <view class="mode-tags">
      <view class="mode-tag">{{ displayReportMode(reportMode) }}</view>
      <view class="source-tag">{{ displayReportSource(context.source) }}</view>
    </view>

    <view class="card">
      <text class="card-title">报工信息{{ isDurationReportMode(reportMode) ? '（时长型）' : '' }}</text>

      <view v-if="targetQty" class="target-bar">
        <view class="target-item">
          <text>排产数量</text>
          <text class="target-num">{{ targetQty }} 件</text>
        </view>
        <view v-if="remainingQty != null" class="target-item highlight">
          <text>待报工</text>
          <text class="target-num">{{ remainingQty }} 件</text>
        </view>
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
            <input v-model.number="form.defectQty" class="step-val" type="digit" @focus="onDefectQtyFocus" @blur="onDefectQtyBlur" />
            <view class="step-btn primary" @tap="changeQty('defect', 1)">+</view>
          </view>
        </view>
        <DefectBreakdownField
          :defect-qty="Number(form.defectQty) || 0"
          :items="defectItems"
          :model-value="form.defectBreakdown"
          @update:model-value="onDefectBreakdownUpdate"
        />
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
            <input v-model.number="form.defectQty" class="step-val" type="digit" @focus="onDefectQtyFocus" @blur="onDefectQtyBlur" />
            <view class="step-btn primary" @tap="changeQty('defect', 1)">+</view>
          </view>
        </view>
        <DefectBreakdownField
          :defect-qty="Number(form.defectQty) || 0"
          :items="defectItems"
          :model-value="form.defectBreakdown"
          @update:model-value="onDefectBreakdownUpdate"
        />
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

      <view v-if="!isQuickSource && isProxyMode" class="field readonly-field">
        <text class="label">执行人</text>
        <text class="readonly-val">{{ form.reporter }}</text>
      </view>

      <view v-if="!isQuickSource && isProxyMode" class="field readonly-field">
        <text class="label">操作人</text>
        <text class="readonly-val">{{ form.operator }}</text>
      </view>

      <view v-if="!isQuickSource && !isProxyMode" class="field operator-field" @tap="goSelectOperator">
        <text class="label required">操作人</text>
        <view class="operator-picker">
          <text :class="{ placeholder: !form.operator }">{{ form.operator || '请选择操作人' }}</text>
          <text class="arrow">›</text>
        </view>
        <text v-if="context.groupName" class="field-hint">可选范围：{{ context.groupName }}成员</text>
      </view>

      <view class="field">
        <ImageUpload v-model="form.images" label="现场图片（选填）" hint="可上传报工现场照片" />
      </view>

      <view class="field">
        <text class="label">备注（选填）</text>
        <textarea v-model="form.remark" class="remark" placeholder="添加备注..." />
      </view>
    </view>

    <view class="foot">
      <button class="btn cancel" @tap="onPrevStep">
        {{ isQuickSource ? '上一步' : '取消' }}
      </button>
      <button class="btn submit" :loading="submitting" @tap="onSubmit">
        {{ editId ? '重新提交' : '提交报工' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad, onBackPress, onShow } from '@dcloudio/uni-app'
import {
  getProcessDefectItems,
  getProcessReportMode,
} from '@/utils/iodomsStorage'
import { isDurationReportMode, resolveReportMode, displayReportSource, isQuickReportSource } from '@/utils/reportMode'
import {
  breakdownToLegacy,
  ensureDefectBreakdown,
  syncDefectBreakdownOnQtyChange,
  validateDefectBreakdown,
} from '@/utils/defectBreakdown'
import DefectBreakdownField from '@/components/quick-report/DefectBreakdownField.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import {
  applyLinkedSingleQtyChange,
  applyLinkedSingleQtyFromDefect,
} from '@/utils/processReportQuantities'

function displayReportMode(mode) {
  return resolveReportMode(mode)
}
import { getQuickProductByCode } from '@/mock/processReportProducts'
import { getRecordById, resubmitProcessReport, submitProcessReport } from '@/mock/processReportRecords'
import { markTaskReported } from '@/mock/processReportTasks'
import { getUser } from '@/utils/auth'
import { getGroupWorkerNames, resolveWorkerDisplayName, getUserWorkerGroupNames, isGroupLeader } from '@/utils/workerGroup'
import { consumeSelectionResult } from '@/utils/selection'

const submitting = ref(false)
const editId = ref('')
const processName = ref('')
const productName = ref('')
const productCode = ref('')
const reportMode = ref('批量计件')
const targetQty = ref(null)
const remainingQty = ref(null)
const defectItems = ref([])
const context = reactive({
  source: 'quick',
  productId: '',
  taskId: '',
  taskNo: '',
  workOrderNo: '',
  workOrderId: '',
  processId: '',
  groupName: '',
  reportFor: '',
  isGroupTask: false,
})

const form = reactive({
  goodQty: 0,
  defectQty: 0,
  finishedQty: 0,
  workHours: 4.5,
  startTime: '',
  endTime: '',
  defectBreakdown: [],
  defectItemIds: [],
  defectItemNames: [],
  remark: '',
  operator: '',
  reporter: '',
  images: [],
})

const isQuickSource = computed(() => isQuickReportSource(context.source))

const isProxyMode = computed(() => {
  if (context.source !== 'workorder' || !context.isGroupTask) return false
  const leaderName = resolveWorkerDisplayName(getUser())
  return !!context.reportFor && context.reportFor !== leaderName && isGroupLeader(getUser())
})

const useLinkedQty = computed(() => !!targetQty.value)

const defectQtySnapshot = reactive({ goodQty: 0, defectQty: 0 })

function resolveProductId() {
  if (context.productId) return context.productId
  if (!productCode.value) return ''
  const product = getQuickProductByCode(productCode.value)
  if (!product) return ''
  context.productId = product.id
  return product.id
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onLoad((query) => {
  if (query.editId) {
    editId.value = query.editId
    const row = getRecordById(query.editId)
    if (!row) {
      uni.showToast({ title: '记录不存在', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }
    if (row.status !== '已拒绝') {
      uni.showToast({ title: '仅已拒绝记录可重新编辑', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }
    loadFromRecord(row)
    return
  }

  processName.value = decodeURIComponent(query.processName || '')
  productName.value = decodeURIComponent(query.productName || '')
  productCode.value = query.productCode || ''
  targetQty.value = query.targetQty ? Number(query.targetQty) : null
  remainingQty.value = query.remainingQty != null ? Number(query.remainingQty) : targetQty.value
  context.source = query.source || 'quick'
  context.productId = query.productId || ''
  context.taskId = query.taskId || ''
  context.taskNo = query.taskNo || ''
  context.workOrderNo = query.workOrderNo || ''
  context.workOrderId = query.workOrderId || ''
  context.processId = query.processId || ''
  context.groupName = query.groupName ? decodeURIComponent(query.groupName) : ''
  context.reportFor = query.reportFor ? decodeURIComponent(query.reportFor) : ''
  context.isGroupTask = query.isGroupTask === '1'

  reportMode.value = query.reportMode || getProcessReportMode(processName.value)
  defectItems.value = getProcessDefectItems(processName.value)
  resolveProductId()
  initTaskOperator()
  form.startTime = nowTime()
  form.endTime = nowTime()
  if (targetQty.value) {
    const pending = Math.max(0, Number(remainingQty.value ?? targetQty.value) || 0)
    form.goodQty = pending
    form.finishedQty = pending
    refreshQtySnapshot()
  }
})

onShow(() => {
  const picked = consumeSelectionResult('processOperator')
  if (picked?.operator) {
    form.operator = picked.operator
  }
})

function initTaskOperator() {
  if (context.source !== 'workorder') return
  const user = getUser()
  const leaderName = resolveWorkerDisplayName(user)
  const reportFor = context.reportFor || leaderName
  if (!context.groupName) {
    const groups = getUserWorkerGroupNames(user)
    context.groupName = groups[0] || ''
  }
  if (isProxyMode.value) {
    form.reporter = reportFor
    form.operator = leaderName
    return
  }
  const defaultName = reportFor || leaderName
  if (!form.operator) form.operator = defaultName
  form.reporter = form.operator
  const allowed = getGroupWorkerNames(context.groupName)
  if (form.operator && allowed.length && !allowed.includes(form.operator)) {
    form.operator = allowed.includes(defaultName) ? defaultName : allowed[0] || ''
    form.reporter = form.operator
  }
}

function goSelectOperator() {
  if (!context.groupName) {
    uni.showToast({ title: '未找到工人小组', icon: 'none' })
    return
  }
  const selected = form.operator ? [form.operator] : []
  const q = [
    'scope=group',
    `groupName=${encodeURIComponent(context.groupName)}`,
    'mode=single',
    'selectionType=processOperator',
    `selected=${encodeURIComponent(JSON.stringify(selected))}`,
  ].join('&')
  uni.navigateTo({ url: `/pages/quick-report/personnel-select?${q}` })
}

function loadFromRecord(row) {
  processName.value = row.processName || ''
  productName.value = row.productName || ''
  productCode.value = row.productCode || ''
  targetQty.value = row.targetQty ?? null
  context.source = row.source || 'quick'
  context.productId = row.productId || ''
  context.taskId = row.taskId || ''
  context.taskNo = row.taskNo || ''
  context.workOrderNo = row.workOrderNo || ''
  context.workOrderId = row.workOrderId || ''
  context.processId = row.processId || ''
  context.groupName = row.groupName || ''

  reportMode.value = row.reportMode || getProcessReportMode(processName.value)
  defectItems.value = getProcessDefectItems(processName.value)
  resolveProductId()

  form.goodQty = Number(row.goodQty) || 0
  form.defectQty = Number(row.defectQty) || 0
  form.finishedQty = Number(row.finishedQty) || 0
  form.workHours = row.workHours != null ? Number(row.workHours) : 4.5
  form.startTime = row.startTime || nowTime()
  form.endTime = row.endTime || nowTime()
  form.defectBreakdown = ensureDefectBreakdown(row, defectItems.value)
  form.remark = row.remark || ''
  form.operator = row.operator || ''
  form.reporter = row.reporter || row.operator || ''
  form.images = Array.isArray(row.images) ? [...row.images] : []
  applyDefectLegacy()
  refreshQtySnapshot()
  initTaskOperator()
}

function refreshQtySnapshot() {
  defectQtySnapshot.goodQty = Math.max(0, Number(form.goodQty) || 0)
  defectQtySnapshot.defectQty = Math.max(0, Number(form.defectQty) || 0)
}

function syncDefectBreakdown() {
  if (Number(form.defectQty) <= 0) {
    form.defectBreakdown = []
  } else {
    form.defectBreakdown = syncDefectBreakdownOnQtyChange(
      { defectQty: form.defectQty, defectBreakdown: form.defectBreakdown },
      defectItems.value,
    )
  }
  applyDefectLegacy()
}

function changeQty(field, delta) {
  if (useLinkedQty.value) {
    applyLinkedSingleQtyChange(form, field, delta)
    form.finishedQty = (Number(form.goodQty) || 0) + (Number(form.defectQty) || 0)
    refreshQtySnapshot()
    if (field === 'defect') syncDefectBreakdown()
    return
  }
  const key = field === 'good' ? 'goodQty' : 'defectQty'
  form[key] = Math.max(0, (Number(form[key]) || 0) + delta)
  if (field === 'defect') syncDefectBreakdown()
}

function onDefectQtyFocus() {
  if (!useLinkedQty.value) return
  refreshQtySnapshot()
}

function onDefectQtyBlur() {
  if (useLinkedQty.value) {
    applyLinkedSingleQtyFromDefect(form, defectQtySnapshot)
    form.finishedQty = (Number(form.goodQty) || 0) + (Number(form.defectQty) || 0)
    refreshQtySnapshot()
  }
  syncDefectBreakdown()
}

function changeHours(delta) {
  form.workHours = Math.max(0, (Number(form.workHours) || 0) + delta)
}

function onDefectBreakdownUpdate(breakdown) {
  form.defectBreakdown = breakdown
  applyDefectLegacy()
}

function applyDefectLegacy() {
  Object.assign(form, breakdownToLegacy(form.defectBreakdown))
}

function onStartChange(e) {
  form.startTime = e.detail.value
}

function onEndChange(e) {
  form.endTime = e.detail.value
}

function onNavBack() {
  if (editId.value) {
    uni.navigateBack()
    return
  }
  if (isQuickSource.value) {
    goQuickProcessStep()
    return
  }
  uni.navigateBack()
}

function goQuickProcessStep() {
  const productId = resolveProductId()
  if (!productId) {
    uni.redirectTo({ url: '/pages/process-report/index?tab=quick' })
    return
  }
  const q = [
    `productId=${encodeURIComponent(productId)}`,
    `processName=${encodeURIComponent(processName.value)}`,
  ]
  if (editId.value) q.push(`editId=${encodeURIComponent(editId.value)}`)
  uni.redirectTo({ url: `/pages/process-report/quick-process?${q.join('&')}` })
}

function onPrevStep() {
  if (isQuickSource.value) {
    goQuickProcessStep()
    return
  }
  uni.navigateBack()
}

onBackPress(() => {
  if (editId.value) return false
  if (isQuickSource.value) {
    onNavBack()
    return true
  }
  return false
})

function onSubmit() {
  if (submitting.value) return
  if (!isQuickSource.value) {
    if (!form.operator) {
      uni.showToast({ title: '请选择操作人', icon: 'none' })
      return
    }
    if (!isProxyMode.value) {
      const allowed = getGroupWorkerNames(context.groupName)
      if (allowed.length && !allowed.includes(form.operator)) {
        uni.showToast({ title: '操作人不在当前工人小组', icon: 'none' })
        return
      }
    }
  }
  const defectErr = validateDefectBreakdown(
    form.defectQty,
    form.defectBreakdown,
    defectItems.value,
  )
  if (defectErr) {
    uni.showToast({ title: defectErr, icon: 'none' })
    return
  }
  if (!isQuickSource.value && remainingQty.value != null) {
    const total = (Number(form.goodQty) || 0) + (Number(form.defectQty) || 0)
    if (total <= 0) {
      uni.showToast({ title: '请填写报工数量', icon: 'none' })
      return
    }
    if (total > remainingQty.value) {
      uni.showToast({ title: `报工数量不能超过待报 ${remainingQty.value} 件`, icon: 'none' })
      return
    }
  }
  submitting.value = true
  const legacy = breakdownToLegacy(form.defectBreakdown)
  const payload = {
    ...context,
    productId: resolveProductId(),
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
    defectBreakdown: legacy.defectBreakdown,
    defectItemIds: legacy.defectItemIds,
    defectItemNames: legacy.defectItemNames,
    defectReasonLabel: legacy.defectReasonLabel,
    remark: form.remark,
    images: [...(form.images || [])],
    operator: isQuickSource.value ? '' : form.operator,
    reporter: isQuickSource.value ? '' : (form.reporter || form.operator),
    groupName: isQuickSource.value ? '' : context.groupName,
  }
  const res = editId.value
    ? resubmitProcessReport(editId.value, payload)
    : submitProcessReport(payload)
  submitting.value = false
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  if (!editId.value && context.taskId) {
    markTaskReported(context.taskId, {
      goodQty: form.goodQty,
      defectQty: form.defectQty,
    })
  }
  uni.showToast({ title: res.message, icon: 'none', duration: 2000 })
  setTimeout(() => {
    if (editId.value) {
      uni.redirectTo({ url: '/pages/process-report/index?tab=records' })
      return
    }
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

.mode-tags {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.mode-tag {
  display: inline-block;
  padding: 6rpx 16rpx;
  background: #e6f4ff;
  color: $primary;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.source-tag {
  display: inline-block;
  padding: 6rpx 16rpx;
  background: #f6ffed;
  color: #52c41a;
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
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: #e6f4ff;
  border-radius: 12rpx;
  margin-bottom: 28rpx;
}

.target-item {
  flex: 1;
  font-size: 26rpx;
  color: #595959;

  &.highlight .target-num {
    color: #fa8c16;
  }
}

.target-num {
  display: block;
  margin-top: 8rpx;
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

.readonly-field .readonly-val {
  display: block;
  padding: 20rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #262626;
}

.operator-field .operator-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.operator-picker .placeholder {
  color: #bfbfbf;
}

.operator-picker .arrow {
  color: #bfbfbf;
  font-size: 32rpx;
}

.field-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8c8c8c;
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
