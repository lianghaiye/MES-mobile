<template>
  <view v-if="product" class="step-page">
    <view class="stepper">
      <view class="step done"><text class="num">1</text><text>选择产品</text></view>
      <view class="line active" />
      <view class="step active"><text class="num">2</text><text>选择工序</text></view>
      <view class="line" />
      <view class="step"><text class="num">3</text><text>填写报工</text></view>
    </view>

    <view class="product-card">
      <view class="pc-head">
        <text class="pc-name">{{ product.name }} · {{ product.code }}</text>
        <text class="pc-edit" @tap="goBack">修改 ›</text>
      </view>
      <text class="pc-spec">规格: {{ product.spec }}</text>
    </view>

    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索工序名称..."
        @input="refreshList"
      />
    </view>

    <template v-if="recentList.length">
      <text class="section-label">最近常选 ({{ recentList.length }})</text>
      <view
        v-for="p in recentList"
        :key="`recent-${p.name}`"
        class="proc-card recent"
        :class="{ selected: selectedName === p.name }"
        @tap="selectedName = p.name"
      >
        <view class="proc-left">
          <text class="proc-name">{{ p.name }}</text>
          <text class="proc-sub">{{ displayReportMode(p.reportMode) }}{{ p.estimate ? ` · ${p.estimate}` : '' }}</text>
        </view>
        <text v-if="selectedName === p.name" class="selected-tag">已选</text>
        <view v-else class="radio" />
      </view>
    </template>

    <text class="section-label">{{ listTitle }} ({{ allList.length }})</text>
    <text v-if="!keyword.trim()" class="hint-sub">请选择本次要报工的工序</text>

    <view
      v-for="p in allList"
      :key="p.name"
      class="proc-card"
      :class="{ selected: selectedName === p.name }"
      @tap="selectedName = p.name"
    >
      <view class="proc-left">
        <text class="proc-name">{{ p.name }}</text>
        <text class="proc-sub">{{ displayReportMode(p.reportMode) }}{{ p.estimate ? ` · ${p.estimate}` : '' }}</text>
      </view>
      <text v-if="selectedName === p.name" class="selected-tag">已选</text>
      <view v-else class="radio" />
    </view>

    <view v-if="!recentList.length && !allList.length" class="empty">未找到匹配的工序</view>

    <view class="foot">
      <button class="btn outline" @tap="goBack">上一步</button>
      <button class="btn primary" :disabled="!selectedName" @tap="goNext">下一步</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getQuickProductById, getQuickProcessPickSections } from '@/mock/processReportProducts'
import { getProcessReportMode } from '@/utils/iodomsStorage'
import { resolveReportMode } from '@/utils/reportMode'

function displayReportMode(mode) {
  return resolveReportMode(mode)
}

const product = ref(null)
const selectedName = ref('')
const editId = ref('')
const keyword = ref('')
const recentList = ref([])
const allList = ref([])

const listTitle = computed(() => (keyword.value.trim() ? '搜索结果' : '全部工序'))

function refreshList() {
  if (!product.value) return
  const sections = getQuickProcessPickSections(product.value, keyword.value)
  recentList.value = sections.recent
  allList.value = sections.all
}

onLoad((query) => {
  product.value = getQuickProductById(query.productId)
  editId.value = query.editId || ''
  if (query.processName) {
    selectedName.value = decodeURIComponent(query.processName)
  }
  if (!product.value) {
    uni.showToast({ title: '产品不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  refreshList()
})

function goBack() {
  uni.navigateBack()
}

function goNext() {
  if (!selectedName.value || !product.value) return
  const mode = getProcessReportMode(selectedName.value)
  const q = [
    `productId=${product.value.id}`,
    `processName=${encodeURIComponent(selectedName.value)}`,
    `productName=${encodeURIComponent(product.value.name)}`,
    `productCode=${product.value.code}`,
    `reportMode=${encodeURIComponent(mode)}`,
    'source=quick',
  ]
  if (editId.value) q.push(`editId=${encodeURIComponent(editId.value)}`)
  uni.navigateTo({ url: `/pages/process-report/execute?${q.join('&')}` })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.step-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
  padding-bottom: 160rpx;
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

.step.active,
.step.done {
  color: $primary;
}

.num {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 50%;
  background: #e8e8e8;
  margin-bottom: 6rpx;
  font-size: 24rpx;
}

.step.active .num,
.step.done .num {
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

.product-card {
  background: #f0f0f0;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.pc-head {
  display: flex;
  justify-content: space-between;
}

.pc-name {
  font-size: 30rpx;
  font-weight: 600;
}

.pc-edit {
  color: $primary;
  font-size: 26rpx;
}

.pc-spec {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.search-bar {
  margin-bottom: 20rpx;
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

.hint-sub {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin: -8rpx 0 20rpx;
}

.proc-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 2rpx solid #f0f0f0;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.proc-card.recent {
  border-color: rgba(22, 119, 255, 0.15);
}

.proc-card.selected {
  border-color: $primary;
  background: #f0f7ff;
}

.proc-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
}

.proc-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.selected-tag {
  color: $primary;
  font-size: 26rpx;
  font-weight: 600;
}

.radio {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 50%;
}

.empty {
  text-align: center;
  padding: 60rpx 0;
  font-size: 28rpx;
  color: #8c8c8c;
}

.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx 40rpx;
  background: #fff;
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  margin: 0;
  border: none;
}

.btn.outline {
  background: #fff;
  border: 2rpx solid #d9d9d9;
}

.btn.primary {
  background: $primary;
  color: #fff;
}

.btn.primary[disabled] {
  opacity: 0.5;
}
</style>
