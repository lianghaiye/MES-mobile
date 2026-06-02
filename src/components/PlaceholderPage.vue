<template>
  <view class="placeholder-page">
    <text class="icon">🚧</text>
    <text class="title">{{ title }}</text>
    <text class="desc">功能开发中，敬请期待</text>
    <text class="hint">与 PC 端 IDOMS 能力将逐步对齐</text>
  </view>
</template>

<script setup>
defineProps({
  title: { type: String, default: '功能开发中' },
})
</script>

<style lang="scss" scoped>
.placeholder-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 48rpx;
}

.icon {
  font-size: 96rpx;
  margin-bottom: 24rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 600;
  color: $text-primary;
}

.desc {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: $text-secondary;
}

.hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $text-secondary;
}
</style>
