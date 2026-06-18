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
        @input="refreshList"
      />
    </view>

    <template v-if="recentList.length">
      <text class="section-label">最近常选 ({{ recentList.length }})</text>
      <view v-for="item in recentList" :key="`recent-${item.id}`" class="card recent" @tap="onSelect(item)">
        <view class="card-head">
          <text class="name">{{ item.name }}</text>
          <text class="link">选择 ›</text>
        </view>
        <text class="meta">编码: {{ item.code }} · 规格: {{ item.spec }}</text>
        <view class="tags">
          <text v-for="(p, i) in item.processNames" :key="i" class="tag">{{ p }}</text>
        </view>
      </view>
    </template>

    <text class="section-label">{{ listTitle }} ({{ allList.length }})</text>

    <view v-for="item in allList" :key="item.id" class="card" @tap="onSelect(item)">
      <view class="card-head">
        <text class="name">{{ item.name }}</text>
        <text class="link">选择 ›</text>
      </view>
      <text class="meta">编码: {{ item.code }} · 规格: {{ item.spec }}</text>
      <view class="tags">
        <text v-for="(p, i) in item.processNames" :key="i" class="tag">{{ p }}</text>
      </view>
    </view>

    <view v-if="!recentList.length && !allList.length" class="empty">未找到匹配的产品</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getQuickProductPickSections } from '@/mock/processReportProducts'

const keyword = ref('')
const recentList = ref([])
const allList = ref([])

const listTitle = computed(() => (keyword.value.trim() ? '搜索结果' : '全部产品'))

function refreshList() {
  const sections = getQuickProductPickSections(keyword.value)
  recentList.value = sections.recent
  allList.value = sections.all
}

refreshList()

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

.card.recent {
  border: 2rpx solid rgba(22, 119, 255, 0.15);
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

.empty {
  text-align: center;
  padding: 80rpx 0;
  font-size: 28rpx;
  color: #8c8c8c;
}
</style>
