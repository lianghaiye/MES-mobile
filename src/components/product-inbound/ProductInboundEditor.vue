<template>
  <view class="line-card">
    <view class="line-head">
      <view class="line-info">
        <text class="line-name">{{ line.itemName }}</text>
        <text class="line-code">{{ line.itemCode }}</text>
      </view>
      <text v-if="removable" class="line-del" @tap="$emit('remove')">删除</text>
    </view>
    <view class="line-meta">
      <text>规格：{{ line.specModel || '—' }}</text>
      <text>材质：{{ line.material || '—' }}</text>
      <text>图号：{{ line.drawingNo || '—' }}</text>
    </view>

    <view class="warehouse-row">
      <view class="warehouse-left">
        <text class="warehouse-label">入库仓库</text>
        <text class="warehouse-hint">成品仓</text>
      </view>
      <WarehouseSelectField
        :model-value="line.warehouse"
        :options="warehouseOptions"
        title="选择入库仓库"
        placeholder="请选择仓库"
        @update:model-value="onWarehouseChange"
      />
    </view>

    <view class="line-qty-row">
      <view class="qty-left">
        <text class="qty-label">入库数量</text>
        <text v-if="line.suggestedQty > 0" class="qty-suggest">工单计划 {{ line.suggestedQty }}</text>
      </view>
      <view class="stepper">
        <view class="step-btn" @tap="changeQty(-1)">−</view>
        <input
          class="step-val"
          type="digit"
          :value="String(line.qty)"
          @input="onQtyInput"
          @blur="normalizeQty"
        />
        <view class="step-btn primary" @tap="changeQty(1)">+</view>
        <text class="unit">{{ line.unit || '件' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import WarehouseSelectField from '@/components/common/WarehouseSelectField.vue'
import { getFinishedInboundWarehouseOptions } from '@/utils/warehouseBridge'

const props = defineProps({
  line: { type: Object, required: true },
  removable: { type: Boolean, default: false },
  workCenter: { type: String, default: '' },
})

const emit = defineEmits(['update:line', 'remove'])

const warehouseOptions = computed(() => getFinishedInboundWarehouseOptions(props.workCenter))

function patchLine(partial) {
  emit('update:line', { ...props.line, ...partial })
}

function onWarehouseChange(warehouse) {
  patchLine({ warehouse })
}

function changeQty(delta) {
  const next = Math.max(0, Number(props.line.qty || 0) + delta)
  patchLine({ qty: next })
}

function onQtyInput(e) {
  const val = Number(e.detail.value)
  patchLine({ qty: Number.isFinite(val) ? val : 0 })
}

function normalizeQty() {
  const qty = Math.max(0, Number(props.line.qty) || 0)
  patchLine({ qty })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.line-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.line-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.line-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #262626;
}

.line-code {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-top: 4rpx;
}

.line-del {
  color: #ff4d4f;
  font-size: 26rpx;
}

.line-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 24rpx;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #595959;
}

.warehouse-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  font-size: 26rpx;
  gap: 16rpx;
}

.warehouse-label {
  color: #595959;
}

.warehouse-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex-shrink: 0;
}

.warehouse-hint {
  font-size: 22rpx;
  color: #bfbfbf;
}

.line-qty-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
}

.qty-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.qty-label {
  font-size: 26rpx;
  color: #262626;
}

.qty-suggest {
  font-size: 22rpx;
  color: #8c8c8c;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.step-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 8rpx;
  background: #f5f6f8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #595959;
}

.step-btn.primary {
  background: $primary;
  color: #fff;
}

.step-val {
  width: 88rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
}

.unit {
  font-size: 24rpx;
  color: #8c8c8c;
  margin-left: 4rpx;
}
</style>
