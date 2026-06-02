<template>
  <view v-if="record" class="inspect-page">
    <view class="card">
      <text class="qc-no">{{ record.qcNo || '待质检' }}</text>
      <text class="sub">{{ record.customerName }} · {{ record.salesOrderNo }}</text>
    </view>

    <view v-for="(line, index) in formLines" :key="line.id" class="line-card">
      <text class="line-name">{{ line.itemName }}</text>
      <view class="row">
        <text class="l">检验数量</text>
        <input v-model.number="line.inspectQty" class="num-input" type="digit" />
      </view>
      <view class="row">
        <text class="l">质检结果</text>
        <view class="result-btns">
          <view
            v-for="opt in resultOpts"
            :key="opt"
            class="opt"
            :class="{ active: line.lineQcResult === opt }"
            @tap="setLineResult(line, opt)"
          >
            {{ opt }}
          </view>
        </view>
      </view>
      <view v-if="line.lineQcResult === '不合格'" class="row">
        <text class="l">处理方案</text>
        <picker
          mode="selector"
          :range="planOpts"
          :value="planPickerIndex(line)"
          @change="onTreatmentPlanChange($event, line)"
        >
          <view class="picker-field">
            <text :class="{ placeholder: !line.treatmentPlan }">
              {{ line.treatmentPlan || '请选择' }}
            </text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="card">
      <text class="field-label">备注</text>
      <textarea v-model="remark" class="textarea" placeholder="请输入备注" />
    </view>

    <button class="btn-primary" :loading="submitting" @tap="handleSubmit">提交质检</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  getQcById,
  submitQcInspection,
  lineQcResultOptions,
  treatmentPlanOptions,
} from '@/mock/factoryQc'
import { getUser } from '@/utils/auth'

const record = ref(null)
const formLines = ref([])
const remark = ref('')
const submitting = ref(false)
const resultOpts = lineQcResultOptions
const planOpts = treatmentPlanOptions

function setLineResult(line, opt) {
  line.lineQcResult = opt
  if (opt !== '不合格') line.treatmentPlan = ''
}

function planPickerIndex(line) {
  const i = planOpts.indexOf(line.treatmentPlan)
  return i >= 0 ? i : 0
}

function onTreatmentPlanChange(e, line) {
  const idx = Number(e.detail.value)
  line.treatmentPlan = planOpts[idx]
}

onLoad((query) => {
  const r = getQcById(query.id)
  if (!r || r.qcStatus !== '待质检') {
    uni.showToast({ title: '任务不可质检', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  record.value = r
  formLines.value = r.lineItems.map((l) => ({
    ...l,
    inspectQty: l.inspectQty ?? l.shipQty,
    lineQcResult: l.lineQcResult || '',
    treatmentPlan: l.treatmentPlan || '',
  }))
})

function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  const user = getUser()
  const result = submitQcInspection(record.value.id, {
    lineItems: formLines.value,
    remark: remark.value,
    inspector: user?.displayName || '当前用户',
  })
  submitting.value = false
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
    return
  }
  uni.showToast({ title: result.message, icon: 'success' })
  setTimeout(() => {
    uni.navigateBack({ delta: 2 })
  }, 1200)
}
</script>

<style lang="scss" scoped>
.inspect-page {
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.card,
.line-card {
  background: $bg-card;
  border-radius: $radius;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.qc-no {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $primary;
}

.sub {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: $text-secondary;
}

.line-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.row {
  margin-top: 16rpx;
}

.l {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 8rpx;
}

.num-input,
.picker-field {
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-field .placeholder {
  color: #999;
}

.picker-arrow {
  font-size: 22rpx;
  color: $text-secondary;
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  margin-top: 12rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.field-label {
  font-size: 26rpx;
  color: $text-secondary;
}

.result-btns {
  display: flex;
  gap: 16rpx;
}

.opt {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  font-size: 26rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  border: 2rpx solid transparent;
}

.opt.active {
  color: $primary;
  background: $primary-light;
  border-color: $primary;
}

.btn-primary {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 48rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: $primary;
  color: #fff;
  border-radius: 12rpx;
  border: none;
}
</style>
