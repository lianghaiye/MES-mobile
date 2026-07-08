<template>
  <view class="wh-field">
    <view class="wh-trigger" @tap="openSheet">
      <text class="wh-value" :class="{ placeholder: !modelValue }">{{ displayText }}</text>
      <text class="arrow">›</text>
    </view>

    <view v-if="sheetOpen" class="sheet-mask" @tap="closeSheet">
      <view class="sheet-panel" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ title }}</text>
          <text class="sheet-close" @tap="closeSheet">×</text>
        </view>
        <scroll-view scroll-y class="sheet-list">
          <view
            v-for="item in options"
            :key="item.value"
            class="sheet-row"
            :class="{ active: item.value === modelValue }"
            @tap="selectItem(item)"
          >
            <text class="sheet-label">{{ item.label }}</text>
            <text v-if="item.value === modelValue" class="sheet-check">✓</text>
          </view>
          <view v-if="!options.length" class="sheet-empty">暂无可选仓库</view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择仓库' },
  title: { type: String, default: '选择仓库' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const sheetOpen = ref(false)

const displayText = computed(() => {
  if (!props.modelValue) return props.placeholder
  const hit = props.options.find((item) => item.value === props.modelValue)
  return hit?.label || props.modelValue
})

function openSheet() {
  if (!props.options.length) return
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
}

function selectItem(item) {
  emit('update:modelValue', item.value)
  emit('change', item.value)
  closeSheet()
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.wh-trigger {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  min-width: 0;
}

.wh-value {
  font-size: 28rpx;
  color: #262626;
  text-align: right;
}

.wh-value.placeholder {
  color: #bfbfbf;
}

.arrow {
  color: #8c8c8c;
  flex-shrink: 0;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1200;
  display: flex;
  align-items: flex-end;
}

.sheet-panel {
  width: 100%;
  height: 56vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  flex-shrink: 0;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
}

.sheet-close {
  font-size: 44rpx;
  color: #8c8c8c;
  line-height: 1;
}

.sheet-list {
  flex: 1;
  height: 0;
}

.sheet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 8rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 28rpx;
  color: #262626;
}

.sheet-row.active {
  color: $primary;
}

.sheet-check {
  color: $primary;
  font-weight: 600;
}

.sheet-empty {
  text-align: center;
  color: #8c8c8c;
  padding: 48rpx 0;
  font-size: 26rpx;
}
</style>
