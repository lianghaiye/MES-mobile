<template>
  <view class="qc-node" :style="{ paddingLeft: depth > 0 ? '16rpx' : '0' }">
    <view class="node-card">
      <view class="node-head" @tap="toggleExpand">
        <text v-if="node.hasChildren" class="expand-icon">{{ node.expanded ? '▼' : '▶' }}</text>
        <text class="node-title">【{{ node.level }}级】{{ node.materialCode }} {{ node.materialName }}</text>
        <text v-if="showDisposeLabel" class="mode-tag">{{ disposeModeLabel(node.disposeMode) }}</text>
      </view>

      <view v-if="!node.hasChildren || !node.expanded" class="qty-block">
        <view class="qty-row">
          <text class="qty-label">应拆数量</text>
          <text class="qty-val">{{ node.unitQty }} {{ node.unit }}</text>
        </view>
        <view class="qty-row">
          <text class="qty-label">回用数量</text>
          <text class="qty-val green">{{ node.reuseQty }}</text>
          <text class="qty-label ml">报废数量</text>
          <text class="qty-val orange">{{ node.scrapQty }}</text>
        </view>
        <view v-if="node.scrapQty > 0 && node.scrapReason && node.scrapReason !== '无'" class="qty-row">
          <text class="qty-label">报废原因</text>
          <text class="qty-val">{{ node.scrapReason }}</text>
        </view>
        <view v-if="node.scrapQty > 0" class="parallel-row result-row">
          <text class="qty-label">处理结果</text>
          <picker
            class="parallel-control"
            mode="selector"
            :range="processResultOptions"
            :value="resultIndex"
            @change="onResultChange"
          >
            <view class="result-picker">
              <text>{{ node.processResult || '请选择' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <view v-if="node.expanded && node.children?.length" class="children">
      <QcEbomNode
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
import { disposeModeLabel, scrapProcessResultOptions } from '@/mock/disassemblyEbom'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

const emit = defineEmits(['change'])

const processResultOptions = scrapProcessResultOptions

const showDisposeLabel = computed(() => !props.node.hasChildren || !props.node.expanded)

const resultIndex = computed(() => {
  const i = processResultOptions.indexOf(props.node.processResult)
  return i >= 0 ? i : 0
})

function toggleExpand() {
  if (!props.node.hasChildren) return
  props.node.expanded = !props.node.expanded
  emit('change')
}

function onResultChange(e) {
  const idx = Number(e.detail.value)
  props.node.processResult = processResultOptions[idx]
  emit('change')
}
</script>

<script>
export default { name: 'QcEbomNode' }
</script>

<style lang="scss" scoped>
$green: #07c160;

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

.mode-tag {
  font-size: 22rpx;
  color: $green;
  flex-shrink: 0;
}

.qty-block {
  margin-top: 12rpx;
}

.qty-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
  font-size: 24rpx;
}

.qty-label {
  width: 160rpx;
  flex-shrink: 0;
  color: #999;
  margin-right: 0;
}

.qty-label.ml {
  margin-left: 24rpx;
}

.qty-val.green {
  color: $green;
}

.qty-val.orange {
  color: #fa8c16;
}

.result-row {
  margin-top: 12rpx;
}

.parallel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.parallel-control {
  flex: 1;
  min-width: 0;
}

.result-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
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
