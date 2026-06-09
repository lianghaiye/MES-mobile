<template>
  <view class="search-page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索产品名称、编号"
        confirm-type="search"
        @input="onSearch"
      />
    </view>

    <view v-if="!results.length" class="empty">未找到匹配产品</view>

    <view
      v-for="item in results"
      :key="item.id"
      class="item"
      @tap="onSelect(item)"
    >
      <text class="name">{{ item.name }} · {{ item.code }}</text>
      <text v-if="item.spec" class="spec">{{ item.spec }}</text>
      <text class="route">{{ item.routes[0]?.name }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { searchProducts } from '@/mock/quickReportProducts'
import { setSelectionResult } from '@/utils/selection'

const keyword = ref('')
const results = ref(searchProducts())

onLoad((query) => {
  if (query.keyword) {
    keyword.value = query.keyword
    results.value = searchProducts(keyword.value)
  }
})

function onSearch() {
  results.value = searchProducts(keyword.value)
}

function onSelect(product) {
  setSelectionResult('product', product)
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.search-bar {
  margin-bottom: 24rpx;
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: #999;
  font-size: 28rpx;
}

.item {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.spec,
.route {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}
</style>
