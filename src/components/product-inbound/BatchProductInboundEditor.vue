<template>
  <view class="batch-line-wrap">
    <ProductInboundEditor
      :line="line"
      :work-center="workCenter"
      :removable="removable"
      @update:line="$emit('update:line', $event)"
      @remove="$emit('remove')"
    />
    <view v-if="line.sourceWorkOrders?.length" class="source-block">
      <view class="source-head" @tap="expanded = !expanded">
        <text class="source-title">来源工单（{{ line.sourceWorkOrders.length }}）</text>
        <text class="source-toggle">{{ expanded ? '收起' : '展开' }}</text>
      </view>
      <view v-if="expanded" class="source-list">
        <view
          v-for="source in line.sourceWorkOrders"
          :key="source.workOrderId"
          class="source-row"
        >
          <text class="source-code">{{ source.workOrderCode }}</text>
          <text class="source-qty">× {{ source.qty }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import ProductInboundEditor from '@/components/product-inbound/ProductInboundEditor.vue'

defineProps({
  line: { type: Object, required: true },
  workCenter: { type: String, default: '' },
  removable: { type: Boolean, default: false },
})

defineEmits(['update:line', 'remove'])

const expanded = ref(false)
</script>

<style lang="scss" scoped>
$primary: #52c41a;

.batch-line-wrap {
  margin-bottom: 16rpx;
}

.source-block {
  background: #fff;
  border-radius: 0 0 16rpx 16rpx;
  margin-top: -8rpx;
  padding: 0 24rpx 20rpx;
  border-top: 1rpx solid #f5f5f5;
}

.source-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0 8rpx;
}

.source-title {
  font-size: 24rpx;
  color: #595959;
}

.source-toggle {
  font-size: 24rpx;
  color: $primary;
}

.source-list {
  padding-bottom: 4rpx;
}

.source-row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  font-size: 24rpx;
}

.source-code {
  color: #262626;
}

.source-qty {
  color: #8c8c8c;
}
</style>
