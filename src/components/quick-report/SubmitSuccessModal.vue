<template>
  <view v-if="visible" class="modal-mask">
    <view class="modal-box" @tap.stop>
      <view class="success-icon">✓</view>
      <text class="modal-title">报工成功</text>
      <text class="modal-sub">工单已生成，领料清单已推送至仓库待确认</text>

      <view class="info-card">
        <view class="info-row">
          <text class="label">工单号</text>
          <text class="val primary">{{ data.workOrderNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">产品</text>
          <text class="val">{{ data.productName }} · {{ data.productCode }}</text>
        </view>
        <view class="info-row">
          <text class="label">完工数量</text>
          <text class="val">{{ data.finishedQty }} 件</text>
        </view>
        <view class="info-row">
          <text class="label">工序</text>
          <text class="val">{{ processText }}</text>
        </view>
        <view class="info-row">
          <text class="label">操作人员</text>
          <text class="val">{{ operatorText }}</text>
        </view>
      </view>

      <view class="modal-foot">
        <button class="btn outline" @tap="onViewMaterial">查看领料清单</button>
        <button class="btn primary" @tap="onDone">完成</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  data: {
    type: Object,
    default: () => ({
      workOrderNo: '',
      productName: '',
      productCode: '',
      finishedQty: 0,
      processes: [],
      operators: [],
      reportId: '',
    }),
  },
})

const emit = defineEmits(['update:visible', 'view-material', 'done'])

const processText = computed(() =>
  (props.data.processes || []).map((p) => `${p.name} ${p.qty}件`).join('、'),
)

const operatorText = computed(() => (props.data.operators || []).join('、'))

function onViewMaterial() {
  emit('view-material', props.data.reportId)
}

function onDone() {
  emit('update:visible', false)
  emit('done')
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.modal-box {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 36rpx 32rpx;
}

.success-icon {
  width: 96rpx;
  height: 96rpx;
  margin: 0 auto 20rpx;
  border-radius: 50%;
  background: #f6ffed;
  color: #52c41a;
  font-size: 48rpx;
  line-height: 96rpx;
  text-align: center;
}

.modal-title {
  display: block;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.modal-sub {
  display: block;
  text-align: center;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.info-card {
  margin-top: 32rpx;
  padding: 24rpx;
  background: #f8f9fb;
  border-radius: 16rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 16rpx;
  font-size: 26rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  color: #8c8c8c;
  flex-shrink: 0;
}

.val {
  color: #1a1a1a;
  text-align: right;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.modal-foot {
  display: flex;
  gap: 20rpx;
  margin-top: 36rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin: 0;
  border: none;
}

.btn.outline {
  background: #fff;
  color: $primary;
  border: 1rpx solid $primary;
}

.btn.primary {
  background: $primary;
  color: #fff;
}
</style>
