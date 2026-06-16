<template>
  <view v-if="defectQty > 0 && items.length" class="defect-breakdown">
    <view class="breakdown-head">
      <text class="breakdown-label">不良原因分配</text>
      <text class="breakdown-status" :class="statusClass">{{ allocated }} / {{ defectQty }}</text>
    </view>
    <view v-for="item in items" :key="item.id" class="breakdown-row">
      <text class="reason-name">{{ item.name }}</text>
      <view class="mini-stepper">
        <view class="mini-btn" @tap="change(item, -1)">−</view>
        <text class="mini-val">{{ getQty(item.id) }}</text>
        <view class="mini-btn primary" :class="{ disabled: !canIncrease }" @tap="change(item, 1)">
          +
        </view>
      </view>
    </view>
    <text v-if="allocated !== defectQty" class="breakdown-hint">请用 + 将不良品数量分配到各原因</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import {
  changeBreakdownQty,
  getBreakdownQty,
  sumBreakdownQty,
} from '@/utils/defectBreakdown'

const props = defineProps({
  defectQty: { type: Number, default: 0 },
  items: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const allocated = computed(() => sumBreakdownQty(props.modelValue))

const statusClass = computed(() => {
  if (allocated.value === props.defectQty) return 'ok'
  if (allocated.value > props.defectQty) return 'over'
  return 'warn'
})

const canIncrease = computed(() => allocated.value < props.defectQty)

function getQty(itemId) {
  return getBreakdownQty(props.modelValue, itemId)
}

function change(item, delta) {
  const next = changeBreakdownQty(props.modelValue, item, delta, props.defectQty)
  emit('update:modelValue', next)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.defect-breakdown {
  margin-bottom: 28rpx;
  padding: 20rpx;
  background: #fafafa;
  border-radius: 12rpx;
}

.breakdown-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.breakdown-label {
  font-size: 26rpx;
  color: #595959;
}

.breakdown-status {
  font-size: 24rpx;
  color: #fa8c16;
  font-weight: 600;
}

.breakdown-status.ok {
  color: #52c41a;
}

.breakdown-status.over {
  color: #ff4d4f;
}

.breakdown-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.breakdown-row:last-child {
  border-bottom: none;
}

.reason-name {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
}

.mini-stepper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.mini-btn {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  background: #f0f0f0;
  border-radius: 10rpx;
  font-size: 32rpx;
  color: #595959;
}

.mini-btn.primary {
  background: $primary;
  color: #fff;
}

.mini-btn.primary.disabled {
  opacity: 0.35;
}

.mini-val {
  min-width: 48rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.breakdown-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}
</style>
