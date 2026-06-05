<template>
  <view class="ebom-node" :style="{ paddingLeft: depth > 0 ? '16rpx' : '0' }">
    <view class="node-card">
      <view class="node-head" @tap="toggleExpand">
        <text v-if="node.hasChildren" class="expand-icon">{{ node.expanded ? '▼' : '▶' }}</text>
        <text class="node-title">【{{ node.level }}级】{{ node.materialCode }} {{ node.materialName }}</text>
        <text
          v-if="node.hasChildren"
          class="expand-link"
          @tap.stop="toggleExpand"
        >
          {{ node.expanded ? '收起下级' : '展开下级' }}
        </text>
      </view>

      <view class="qty-row">
        <text class="qty-label">可拆数量</text>
        <text class="qty-val">{{ node.unitQty }} {{ node.unit }}</text>
      </view>
      <view class="qty-row">
        <text class="qty-label">回用数量</text>
        <text class="qty-val green">{{ node.reuseQty }}</text>
        <text class="qty-label ml">报废数量</text>
        <text class="qty-val orange">{{ node.scrapQty }}</text>
      </view>

      <view v-if="!node.hasChildren || !node.expanded" class="dispose-btns">
        <view
          class="dispose-btn"
          :class="{ active: node.disposeMode === 'all_reuse' }"
          @tap="setMode('all_reuse')"
        >
          全部回用
        </view>
        <view
          class="dispose-btn"
          :class="{ active: node.disposeMode === 'partial' }"
          @tap="setMode('partial')"
        >
          部分回用
        </view>
        <view
          class="dispose-btn"
          :class="{ active: node.disposeMode === 'all_scrap' }"
          @tap="setMode('all_scrap')"
        >
          全部报废
        </view>
      </view>

      <view v-if="node.disposeMode === 'partial' && (!node.hasChildren || !node.expanded)" class="stepper-row">
        <view class="stepper-item">
          <text class="stepper-label">回用数量</text>
          <view class="stepper">
            <text class="step-btn" @tap="step('reuseQty', -1)">-</text>
            <text class="step-val">{{ node.reuseQty }}</text>
            <text class="step-btn" @tap="step('reuseQty', 1)">+</text>
          </view>
        </view>
        <view class="stepper-item">
          <text class="stepper-label">报废数量</text>
          <view class="stepper">
            <text class="step-btn" @tap="step('scrapQty', -1)">-</text>
            <text class="step-val">{{ node.scrapQty }}</text>
            <text class="step-btn" @tap="step('scrapQty', 1)">+</text>
          </view>
        </view>
      </view>

      <view
        v-if="node.scrapQty > 0 && (!node.hasChildren || !node.expanded)"
        class="scrap-reason"
      >
        <text class="qty-label">报废原因</text>
        <picker
          mode="selector"
          :range="scrapReasonOptions"
          :value="reasonIndex"
          @change="onReasonChange"
        >
          <view class="reason-picker">
            <text>{{ node.scrapReason || '无' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view v-if="node.expanded && node.children?.length" class="children">
      <EbomNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @change="$emit('change')"
      />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { scrapReasonOptions, setNodeDisposeMode, updateNodeQty } from '@/mock/disassemblyEbom'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

const emit = defineEmits(['change'])

const reasonIndex = computed(() => {
  const i = scrapReasonOptions.indexOf(props.node.scrapReason)
  return i >= 0 ? i : 0
})

function toggleExpand() {
  if (!props.node.hasChildren) return
  props.node.expanded = !props.node.expanded
  if (props.node.expanded) {
    props.node.disposeMode = 'partial'
  }
  emit('change')
}

function setMode(mode) {
  setNodeDisposeMode(props.node, mode)
  emit('change')
}

function step(field, delta) {
  const cur = field === 'reuseQty' ? props.node.reuseQty : props.node.scrapQty
  updateNodeQty(props.node, field, cur + delta)
  emit('change')
}

function onReasonChange(e) {
  const idx = Number(e.detail.value)
  props.node.scrapReason = scrapReasonOptions[idx]
  emit('change')
}
</script>

<script>
export default { name: 'EbomNode' }
</script>

<style lang="scss" scoped>
$green: #07c160;
$green-light: #e8f8ef;

.node-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #e8e8e8;
}

.node-head {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.expand-icon {
  font-size: 22rpx;
  color: $green;
  margin-top: 4rpx;
}

.node-title {
  flex: 1;
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.expand-link {
  font-size: 22rpx;
  color: $green;
  flex-shrink: 0;
}

.qty-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
  font-size: 24rpx;
}

.qty-label {
  color: #999;
  margin-right: 12rpx;
}

.qty-label.ml {
  margin-left: 24rpx;
}

.qty-val {
  color: #333;
  font-weight: 500;
}

.qty-val.green {
  color: $green;
}

.qty-val.orange {
  color: #fa8c16;
}

.dispose-btns {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.dispose-btn {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 24rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  color: #666;
  background: #fff;
}

.dispose-btn.active {
  color: $green;
  border-color: $green;
  background: $green-light;
}

.stepper-row {
  margin-top: 16rpx;
}

.stepper-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.stepper-label {
  font-size: 24rpx;
  color: #666;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.step-btn {
  width: 48rpx;
  height: 48rpx;
  line-height: 48rpx;
  text-align: center;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.step-val {
  min-width: 40rpx;
  text-align: center;
  font-size: 28rpx;
}

.scrap-reason {
  margin-top: 16rpx;
}

.reason-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.children {
  margin-left: 8rpx;
  border-left: 2rpx dashed #d9f7e8;
  padding-left: 8rpx;
}
</style>
