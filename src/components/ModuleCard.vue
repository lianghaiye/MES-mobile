<template>
  <view class="module-card" @tap="$emit('tap')">
    <view class="icon-wrap" :style="{ background: mod.color + '18' }">
      <text class="icon">{{ mod.icon }}</text>
    </view>
    <text class="title">{{ mod.title }}</text>
    <text class="desc">{{ mod.desc }}</text>
    <view v-if="badge > 0" class="badge">{{ badge > 99 ? '99+' : badge }}</view>
    <view v-if="mod.stub" class="tag">待开发</view>
  </view>
</template>

<script setup>
defineProps({
  mod: { type: Object, required: true },
  badge: { type: Number, default: 0 },
})
defineEmits(['tap'])
</script>

<style lang="scss" scoped>
.module-card {
  position: relative;
  background: $bg-card;
  border-radius: $radius;
  padding: 28rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.icon {
  font-size: 40rpx;
}

.title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-secondary;
}

.badge {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  min-width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 10rpx;
  text-align: center;
  font-size: 22rpx;
  color: #fff;
  background: $error;
  border-radius: 18rpx;
}

.tag {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  font-size: 20rpx;
  color: $text-secondary;
  background: #f5f5f5;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
</style>
