<template>
  <view class="qc-field">
    <view class="field-label-row">
      <text class="field-label">
        <text v-if="field.required !== false" class="req">*</text>
        {{ field.name }}
        <text v-if="unitText" class="unit-tag">{{ unitText }}</text>
      </text>
    </view>
    <text v-if="hint" class="standard-hint">{{ hint }}</text>

    <view v-if="isChoice" class="result-btns wrap">
      <view
        v-for="opt in options"
        :key="opt"
        class="opt"
        :class="{ active: modelValue === opt }"
        @tap="emitValue(opt)"
      >
        {{ opt }}
      </view>
    </view>

    <view v-else-if="field.type === 'number'" class="num-wrap">
      <input
        class="num-input"
        type="digit"
        :value="modelValue"
        :placeholder="field.placeholder || `请输入${field.name}`"
        @input="onNumber"
      />
      <text v-if="unitText" class="num-unit">{{ unitText }}</text>
    </view>

    <textarea
      v-else-if="field.type === 'textarea'"
      class="textarea"
      :value="modelValue"
      :placeholder="field.placeholder || `请输入${field.name}`"
      @input="onText"
    />

    <input
      v-else
      class="num-input"
      type="text"
      :value="modelValue"
      :placeholder="field.placeholder || `请输入${field.name}`"
      @input="onText"
    />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:modelValue'])

const isChoice = computed(
  () =>
    props.field?.type === 'radio' ||
    props.field?.type === 'select' ||
    props.field?.isConclusion,
)

const options = computed(() => {
  const f = props.field || {}
  if (Array.isArray(f.options) && f.options.length) return f.options
  if (Array.isArray(f.optionItems)) return f.optionItems.map((o) => o.value).filter(Boolean)
  return []
})

const unitText = computed(() => String(props.field?.unit || '').trim())

const hint = computed(() => {
  const field = props.field || {}
  const unit = unitText.value
  const min = field.standardMin
  const max = field.standardMax
  const hasMin = min != null && min !== ''
  const hasMax = max != null && max !== ''
  if (field.judgeRule === 'range' || hasMin || hasMax) {
    if (hasMin && hasMax) return `标准：${min}${unit} ~ ${max}${unit}`
    if (hasMax) return `标准：≤ ${max}${unit}`
    if (hasMin) return `标准：≥ ${min}${unit}`
  }
  if (
    field.judgeRule === 'optionPass' &&
    Array.isArray(field.passOptions) &&
    field.passOptions.length
  ) {
    return `合格选项：${field.passOptions.join('、')}`
  }
  return ''
})

function emitValue(v) {
  emit('update:modelValue', v)
}

function onNumber(e) {
  const v = e.detail.value
  emitValue(v === '' ? '' : Number(v))
}

function onText(e) {
  emitValue(e.detail.value)
}
</script>

<style lang="scss" scoped>
.qc-field {
  width: 100%;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  margin-bottom: 8rpx;
}

.unit-tag {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.35);
}

.standard-hint {
  display: block;
  margin: -2rpx 0 10rpx;
  font-size: 22rpx;
  color: #d48806;
}

.req {
  color: #ff4d4f;
  margin-right: 4rpx;
}

.result-btns {
  display: flex;
  gap: 12rpx;
}

.result-btns.wrap {
  flex-wrap: wrap;
}

.opt {
  min-width: 140rpx;
  text-align: center;
  padding: 14rpx 20rpx;
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

.num-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.num-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.num-unit {
  flex-shrink: 0;
  font-size: 24rpx;
  color: $text-secondary;
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
</style>
