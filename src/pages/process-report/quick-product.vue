<template>
  <view class="step-page">
    <view class="stepper">
      <view class="step active"><text class="num">1</text><text>选择产品</text></view>
      <view class="line active" />
      <view class="step"><text class="num">2</text><text>选择工序</text></view>
      <view class="line" />
      <view class="step"><text class="num">3</text><text>填写报工</text></view>
    </view>

    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索产品名称或编码..."
        @input="onSearch"
      />
    </view>

    <text class="section-label">全部产品 ({{ list.length }})</text>

    <view v-for="item in list" :key="item.id" class="card" @tap="onSelect(item)">
      <view class="card-head">
        <text class="name">{{ item.name }}</text>
        <text class="link">选择 ›</text>
      </view>
      <text class="meta">编码: {{ item.code }} · 规格: {{ item.spec }}</text>
      <view class="tags">
        <text v-for="(p, i) in item.processNames" :key="i" class="tag">{{ p }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { searchQuickProducts } from '@/mock/processReportProducts'

const keyword = ref('')
const list = ref(searchQuickProducts())

function onSearch() {
  list.value = searchQuickProducts(keyword.value)
}

function onSelect(item) {
  uni.navigateTo({
    url: `/pages/process-report/quick-process?productId=${item.id}`,
  })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.step-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
  gap: 8rpx;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 22rpx;
  color: #8c8c8c;
}

.step.active {
  color: $primary;
}

.num {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 50%;
  background: #e8e8e8;
  color: #8c8c8c;
  margin-bottom: 6rpx;
  font-size: 24rpx;
}

.step.active .num {
  background: $primary;
  color: #fff;
}

.line {
  width: 60rpx;
  height: 4rpx;
  background: #e8e8e8;
  margin-bottom: 24rpx;
}

.line.active {
  background: $primary;
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  margin-bottom: 24rpx;
}

.section-label {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name {
  font-size: 32rpx;
  font-weight: 700;
}

.link {
  color: $primary;
  font-size: 28rpx;
}

.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.tag {
  padding: 6rpx 16rpx;
  background: #f0f7ff;
  color: $primary;
  border-radius: 8rpx;
  font-size: 22rpx;
}
</style>
