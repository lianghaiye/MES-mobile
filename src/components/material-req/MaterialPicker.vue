<template>
  <view class="picker-mask" @tap="$emit('close')">
    <view class="picker-panel" @tap.stop>
      <view class="picker-head">
        <text class="picker-title">选择物料</text>
        <text class="picker-close" @tap="$emit('close')">×</text>
      </view>
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索编码 / 名称 / 图号"
        confirm-type="search"
      />
      <scroll-view scroll-y class="picker-list">
        <view
          v-for="item in filtered"
          :key="item.id"
          class="picker-row"
          @tap="selectItem(item)"
        >
          <view class="picker-info">
            <text class="picker-name">{{ item.name }}</text>
            <text class="picker-meta">{{ item.code }} · {{ item.spec || '—' }}</text>
            <text v-if="item.drawingNo" class="picker-drawing">图号：{{ item.drawingNo }}</text>
          </view>
          <text class="picker-add">添加</text>
        </view>
        <view v-if="!filtered.length" class="empty">暂无匹配物料</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { searchProductMaterials } from '@/mock/productMaterialInfo'

const emit = defineEmits(['select', 'close'])

const keyword = ref('')

const filtered = computed(() => searchProductMaterials(keyword.value).slice(0, 50))

function selectItem(item) {
  emit('select', item)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.picker-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.picker-panel {
  width: 100%;
  height: 75vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  flex-shrink: 0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
}

.picker-close {
  font-size: 44rpx;
  color: #8c8c8c;
  line-height: 1;
}

.search-input {
  background: #f5f6f8;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
  flex-shrink: 0;
}

.picker-list {
  flex: 1;
  height: 0;
}

.picker-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.picker-name {
  display: block;
  font-size: 28rpx;
  color: #262626;
}

.picker-meta {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-top: 6rpx;
}

.picker-drawing {
  display: block;
  font-size: 24rpx;
  color: #595959;
  margin-top: 4rpx;
}

.picker-add {
  color: $primary;
  font-size: 26rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 40rpx 0;
  font-size: 26rpx;
}
</style>
