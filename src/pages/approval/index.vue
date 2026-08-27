<template>
  <view class="approval-page">
    <view class="top-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        {{ tab.label }}
        <text v-if="tab.key === 'pending' && pendingCount > 0" class="tab-badge">{{ pendingCount }}</text>
      </view>
    </view>

    <scroll-view scroll-x class="filter-tabs">
      <view
        v-for="opt in filterOptions"
        :key="opt.value"
        class="filter-chip"
        :class="{ active: bizFilter === opt.value }"
        @tap="bizFilter = opt.value"
      >
        {{ opt.label }}
      </view>
    </scroll-view>

    <view v-if="!list.length" class="empty">暂无{{ activeTab === 'pending' ? '待审批' : '已审批' }}单据</view>

    <view v-for="item in list" :key="`${item.bizType}-${item.id}`" class="card" @tap="goDetail(item)">
      <view class="card-head">
        <text class="type-tag">{{ bizLabel(item.bizType) }}</text>
        <StatusTag :text="displayStatus(item)" />
      </view>
      <view class="biz-no">{{ item.bizNo }}</view>
      <view class="title">{{ item.title }}</view>
      <view v-if="item.subtitle" class="subtitle">{{ item.subtitle }}</view>
      <view class="meta-row">
        <text>申请人：{{ item.applicant }}</text>
        <text>{{ item.submittedAt || item.handledAt || '—' }}</text>
      </view>
      <view v-if="item.amount > 0" class="amount">合计 ¥{{ formatMoney(item.amount) }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import { APPROVAL_BIZ_LABEL, APPROVAL_FILTER_OPTIONS } from '@/constants/approvalTypes'
import { getUser } from '@/utils/auth'
import { listPendingApprovals, listDoneApprovals } from '@/mock/approval'

const activeTab = ref('pending')
const bizFilter = ref('')
const pendingCount = ref(0)

const tabs = [
  { key: 'pending', label: '待我审批' },
  { key: 'done', label: '已审批' },
]

const filterOptions = APPROVAL_FILTER_OPTIONS

const list = computed(() => {
  const user = getUser()
  if (activeTab.value === 'pending') return listPendingApprovals(bizFilter.value)
  return listDoneApprovals(user, bizFilter.value)
})

function loadData() {
  pendingCount.value = listPendingApprovals().length
}

function bizLabel(bizType) {
  return APPROVAL_BIZ_LABEL[bizType] || '单据'
}

function displayStatus(item) {
  if (activeTab.value === 'pending') return '待审核'
  return item.status || '已处理'
}

function formatMoney(val) {
  return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function goDetail(item) {
  uni.navigateTo({
    url: `/pages/approval/detail?bizType=${item.bizType}&bizId=${item.id}`,
  })
}

onShow(() => {
  loadData()
})

onPullDownRefresh(() => {
  loadData()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.approval-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 32rpx;
}

.top-tabs {
  display: flex;
  align-items: center;
  background: #07c160;
  padding: 0 24rpx;
}

.tab-item {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 28rpx 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 30rpx;
}

.tab-item.active {
  color: #fff;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 8rpx;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  background: #fff;
  border-radius: 3rpx;
}

.tab-badge {
  display: inline-block;
  min-width: 32rpx;
  margin-left: 8rpx;
  padding: 0 8rpx;
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  line-height: 32rpx;
  border-radius: 16rpx;
  vertical-align: top;
}

.filter-tabs {
  white-space: nowrap;
  padding: 20rpx 24rpx 8rpx;
}

.filter-chip {
  display: inline-block;
  margin-right: 16rpx;
  padding: 10rpx 24rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #595959;
}

.filter-chip.active {
  background: #e6f7ff;
  color: #1677ff;
}

.empty {
  padding: 120rpx 24rpx;
  text-align: center;
  color: #8c8c8c;
  font-size: 28rpx;
}

.card {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.type-tag {
  padding: 4rpx 12rpx;
  background: #f0f5ff;
  color: #2f54eb;
  font-size: 22rpx;
  border-radius: 6rpx;
}

.biz-no {
  font-size: 28rpx;
  color: #262626;
  font-weight: 600;
}

.title {
  margin-top: 8rpx;
  font-size: 30rpx;
  color: #262626;
}

.subtitle {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.amount {
  margin-top: 12rpx;
  font-size: 28rpx;
  color: #fa541c;
  font-weight: 600;
}
</style>
