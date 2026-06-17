<template>
  <view v-if="open" class="mask" @tap="onMaskTap">
    <view class="dialog" @tap.stop>
      <text class="title">批量报工</text>
      <text class="content">
        将按目标数量为 {{ count }} 项任务提交报工（良品=目标数，不良=0），确认？
      </text>
      <view class="footer">
        <view class="footer-row">
          <view class="action cancel" @tap="emit('cancel')">取消</view>
          <view class="divider-v" />
          <view class="action abnormal" @tap="emit('abnormal')">异常报工</view>
        </view>
        <view class="divider-h" />
        <view class="action confirm" @tap="emit('confirm')">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  open: Boolean,
  count: { type: Number, default: 0 },
})

const emit = defineEmits(['update:open', 'cancel', 'confirm', 'abnormal'])

function onMaskTap() {
  emit('cancel')
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
  padding: 0 40rpx 40rpx;
  text-align: center;
  font-size: 28rpx;
  color: #8c8c8c;
  line-height: 1.6;
}

.footer {
  border-top: 1rpx solid #f0f0f0;
}

.footer-row {
  display: flex;
  height: 96rpx;
}

.action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}

.action.cancel {
  color: #1a1a1a;
}

.action.abnormal {
  color: #fa8c16;
  font-weight: 500;
}

.action.confirm {
  height: 96rpx;
  color: $primary;
  font-weight: 600;
}

.divider-v {
  width: 1rpx;
  background: #f0f0f0;
}

.divider-h {
  height: 1rpx;
  background: #f0f0f0;
}
</style>
