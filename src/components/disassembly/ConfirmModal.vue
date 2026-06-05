<template>
  <view v-if="visible" class="modal-mask" @tap="onCancel">
    <view class="modal-box" @tap.stop>
      <view class="modal-head">
        <text class="modal-title">{{ title }}</text>
        <text class="modal-close" @tap="onCancel">×</text>
      </view>
      <view class="modal-body">
        <text class="message">{{ message }}</text>
      </view>
      <view class="modal-foot">
        <button class="btn-cancel" @tap="onCancel">取消</button>
        <button class="btn-ok" @tap="onConfirm">确定</button>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认' },
  message: { type: String, default: '是否确认？' },
})

const emit = defineEmits(['update:visible', 'confirm'])

function onCancel() {
  emit('update:visible', false)
}

function onConfirm() {
  emit('confirm')
}
</script>

<style lang="scss" scoped>
$green: #07c160;

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.modal-box {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-head {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 28rpx;
  position: relative;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
}

.modal-close {
  position: absolute;
  right: 24rpx;
  font-size: 40rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 40rpx 32rpx;
}

.message {
  font-size: 28rpx;
  color: #333;
  text-align: center;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding: 16rpx 24rpx 24rpx;
}

.btn-cancel,
.btn-ok {
  min-width: 140rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
  padding: 0 32rpx;
}

.btn-cancel {
  background: #fff;
  color: #333;
  border: 1rpx solid #d9d9d9;
}

.btn-ok {
  background: $green;
  color: #fff;
}
</style>
