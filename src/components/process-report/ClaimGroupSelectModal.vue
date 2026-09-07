<template>
  <view v-if="open" class="mask" @tap="onMaskTap">
    <view class="dialog" @tap.stop>
      <text class="title">选择执行小组</text>
      <text class="content">检测到该任务关联到多个小组，请选择执行任务小组。</text>
      <view class="options">
        <view
          v-for="name in groups"
          :key="name"
          class="option"
          @tap="selected = name"
        >
          <view class="radio" :class="{ checked: selected === name }">
            <view v-if="selected === name" class="dot" />
          </view>
          <text class="option-name">{{ name }}</text>
        </view>
      </view>
      <view class="footer">
        <view class="action cancel" @tap="emit('cancel')">取消</view>
        <view class="divider-v" />
        <view
          class="action confirm"
          :class="{ disabled: !selected }"
          @tap="onConfirm"
        >
          确定
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: Boolean,
  groups: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'cancel', 'confirm'])

const selected = ref('')

watch(
  () => [props.open, props.groups],
  ([open]) => {
    if (!open) return
    selected.value = props.groups?.[0] || ''
  },
)

function onMaskTap() {
  emit('cancel')
}

function onConfirm() {
  if (!selected.value) return
  emit('confirm', selected.value)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.dialog {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.title {
  display: block;
  padding: 40rpx 32rpx 16rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.content {
  display: block;
  padding: 0 40rpx 24rpx;
  text-align: center;
  font-size: 28rpx;
  color: #8c8c8c;
  line-height: 1.6;
}

.options {
  padding: 0 32rpx 24rpx;
}

.option {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 8rpx;
  border-top: 1rpx solid #f5f5f5;
}

.radio {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    border-color: $primary;
  }
}

.dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: $primary;
}

.option-name {
  font-size: 30rpx;
  color: #1a1a1a;
}

.footer {
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  height: 96rpx;
}

.action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #595959;

  &.confirm {
    color: $primary;
    font-weight: 600;
  }

  &.disabled {
    color: #bfbfbf;
  }
}

.divider-v {
  width: 1rpx;
  background: #f0f0f0;
}
</style>
