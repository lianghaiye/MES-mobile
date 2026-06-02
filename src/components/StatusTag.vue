<template>
  <text class="status-tag" :style="{ color, background: color + '18', borderColor: color + '40' }">
    {{ text }}
  </text>
</template>

<script setup>
import { computed } from 'vue'
import { statusColor } from '@/utils/nav'

const props = defineProps({
  text: { type: String, default: '' },
})

const color = computed(() => statusColor(props.text))
</script>

<style lang="scss" scoped>
.status-tag {
  display: inline-block;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  border: 1rpx solid;
}
</style>
