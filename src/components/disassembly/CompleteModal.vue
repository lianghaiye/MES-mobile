<template>
  <view v-if="visible" class="modal-mask" @tap="onCancel">
    <view class="modal-box" @tap.stop>
      <view class="modal-head">
        <text class="modal-title">完工</text>
        <text class="modal-close" @tap="onCancel">×</text>
      </view>

      <view class="modal-body">
        <text class="summary">回用：{{ stats.reuse }} 件，报废：{{ stats.scrap }} 件</text>

        <view v-if="nextProcess" class="field">
          <text class="label">下道工序</text>
          <view class="next-tag">{{ nextProcess }}</view>
        </view>

        <view class="labor-box">
          <text class="labor-tip">工序工时核算方式：{{ laborMethod }}</text>
          <view class="field">
            <text class="label">开工时间</text>
            <picker mode="time" :value="form.startTime" @change="onStartChange">
              <view class="picker-val">{{ form.startTime || '请选择时间' }}</view>
            </picker>
          </view>
          <view class="field">
            <text class="label">完工时间</text>
            <picker mode="time" :value="form.endTime" @change="onEndChange">
              <view class="picker-val">{{ form.endTime || '请选择时间' }}</view>
            </picker>
          </view>
          <view class="field">
            <text class="label required">本次报工时长</text>
            <view class="duration-row">
              <input
                v-model="form.workDuration"
                class="duration-input"
                type="digit"
                placeholder="请输入"
              />
              <text class="unit">小时</text>
            </view>
          </view>
        </view>

        <view class="field">
          <text class="label">备注</text>
          <textarea v-model="form.remark" class="textarea" placeholder="请输入" />
        </view>
      </view>

      <view class="modal-foot">
        <button class="btn-cancel" @tap="onCancel">取消</button>
        <button class="btn-ok" @tap="onConfirm">确定</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  stats: { type: Object, default: () => ({ reuse: 0, scrap: 0 }) },
  nextProcess: { type: String, default: '' },
  laborMethod: { type: String, default: '时长报工+计时工资' },
})

const emit = defineEmits(['update:visible', 'confirm'])

const form = reactive({
  startTime: '',
  endTime: '',
  workDuration: '',
  remark: '',
})

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    const now = new Date()
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    form.startTime = form.startTime || t
    form.endTime = t
  },
)

function onStartChange(e) {
  form.startTime = e.detail.value
}

function onEndChange(e) {
  form.endTime = e.detail.value
}

function onCancel() {
  emit('update:visible', false)
}

function onConfirm() {
  if (!form.workDuration && form.workDuration !== 0) {
    uni.showToast({ title: '请填写本次报工时长', icon: 'none' })
    return
  }
  emit('confirm', { ...form })
}
</script>

<style lang="scss" scoped>
$green: #07c160;

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-box {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 85vh;
  overflow-y: auto;
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
  right: 28rpx;
  font-size: 40rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 24rpx 28rpx;
}

.summary {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
}

.field {
  margin-bottom: 20rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
}

.label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4rpx;
}

.next-tag {
  display: inline-block;
  padding: 10rpx 24rpx;
  background: #e8f8ef;
  color: $green;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.labor-box {
  border: 1rpx solid #b7eb8f;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.labor-tip {
  display: block;
  font-size: 24rpx;
  color: $green;
  margin-bottom: 16rpx;
}

.picker-val,
.duration-input {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.duration-input {
  flex: 1;
}

.unit {
  font-size: 26rpx;
  color: #666;
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.modal-foot {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 28rpx 48rpx;
}

.btn-cancel,
.btn-ok {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
}

.btn-cancel {
  background: #fff;
  color: #666;
  border: 1rpx solid #d9d9d9;
}

.btn-ok {
  background: $green;
  color: #fff;
}
</style>
