<template>
  <view class="page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">我的工时</text>
      <view class="nav-filter" @tap="showFilterTip">
        <text class="filter-icon">⏷</text>
      </view>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >{{ tab.label }}</view>
    </view>

    <scroll-view scroll-y class="list-scroll" :class="{ 'has-footer': activeTab !== 'all' || monthSalary > 0 }">
      <view v-for="item in list" :key="item.id" class="card">
        <view class="card-head">
          <text class="task-no">{{ item.taskNo }}</text>
          <text class="status" :class="statusClass(item.confirmStatus)">{{ item.confirmStatus }}</text>
        </view>
        <view class="card-title-row">
          <text class="proc-name">{{ item.processName }}</text>
          <text class="mode">【{{ item.reportTypeLabel }}】</text>
        </view>
        <view class="fields">
          <view class="row">
            <text class="label">报工时间</text>
            <text class="val">{{ item.reportTime }}</text>
          </view>
          <view class="row">
            <text class="label">任务数量</text>
            <text class="val">{{ item.taskQty }}</text>
          </view>
          <view class="row">
            <text class="label">报工数量</text>
            <text class="val blue">{{ item.goodQty }}</text>
          </view>
          <view v-if="item.reportType === '时长报工'" class="row">
            <text class="label">报工时长</text>
            <text class="val">{{ item.reportDuration }}</text>
          </view>
          <view v-if="item.confirmStatus === '已确认' && item.scrapQty != null" class="row">
            <text class="label">报废数量</text>
            <text class="val">{{ item.scrapQty || 0 }}</text>
          </view>
          <view v-if="item.remark && item.confirmStatus !== '已确认'" class="row">
            <text class="label">备注</text>
            <text class="val">{{ item.remark }}</text>
          </view>
        </view>

        <!-- 已确认：调整区 -->
        <view v-if="item.confirmStatus === '已确认'" class="adjust-box">
          <view class="row">
            <text class="label">调整后数量</text>
            <text class="val">{{ item.adjustedGoodQty ?? item.goodQty }}</text>
          </view>
          <view v-if="item.reportType === '时长报工'" class="row">
            <text class="label">调整后工时</text>
            <text class="val">{{ item.adjustedDuration ?? item.reportDuration }}</text>
          </view>
          <view v-if="item.subsidyReportQty" class="row">
            <text class="label">补贴报工数</text>
            <text class="val">{{ item.subsidyReportQty }}</text>
          </view>
          <view v-if="item.subsidyHours" class="row">
            <text class="label">补贴工时</text>
            <text class="val">{{ item.subsidyHours }}h</text>
          </view>
          <view class="row salary-row">
            <text class="label">计薪</text>
            <text class="salary">{{ formatMoney(item.calculatedSalary) }}元</text>
          </view>
          <view v-if="item.adjustReason" class="row">
            <text class="label">调整原因</text>
            <text class="val reason">{{ item.adjustReason }}</text>
          </view>
          <view v-if="item.subsidyReason" class="row">
            <text class="label">补贴原因</text>
            <text class="val reason">{{ item.subsidyReason }}</text>
          </view>
        </view>

        <!-- 待工人确认：展示推送后的调整预览 -->
        <view v-else-if="item.confirmStatus === '待工人确认'" class="adjust-box pending">
          <view v-if="hasAdjustment(item)" class="row">
            <text class="label">调整后数量</text>
            <text class="val">{{ item.adjustedGoodQty ?? item.goodQty }}</text>
          </view>
          <view v-if="item.reportType === '时长报工' && (item.adjustedDuration != null || item.reportDuration)" class="row">
            <text class="label">调整后工时</text>
            <text class="val">{{ item.adjustedDuration ?? item.reportDuration }}</text>
          </view>
          <view v-if="item.subsidyReportQty" class="row">
            <text class="label">补贴报工数</text>
            <text class="val">{{ item.subsidyReportQty }}</text>
          </view>
          <view v-if="item.subsidyHours" class="row">
            <text class="label">补贴工时</text>
            <text class="val">{{ item.subsidyHours }}h</text>
          </view>
          <view v-if="item.adjustReason" class="row">
            <text class="label">调整原因</text>
            <text class="val reason">{{ item.adjustReason }}</text>
          </view>
          <view v-if="item.subsidyReason" class="row">
            <text class="label">补贴原因</text>
            <text class="val reason">{{ item.subsidyReason }}</text>
          </view>
        </view>

        <button
          v-if="item.confirmStatus === '待工人确认'"
          class="confirm-btn"
          @tap="onConfirm(item)"
        >确认</button>
      </view>

      <view v-if="!list.length" class="empty">暂无工时记录</view>
    </scroll-view>

    <view v-if="monthSalary > 0" class="footer-bar">
      <text>本月计薪：{{ formatMoney(monthSalary) }}元</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUser, isLoggedIn } from '@/utils/auth'
import {
  getWorkerConfirmLines,
  getWorkerMonthSalary,
  workerConfirmLine,
  CONFIRM_STATUS,
} from '@/mock/reportConfirmStore'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
]
const activeTab = ref('all')
const list = ref([])
const monthSalary = ref(0)

const tabKeyMap = { all: 'all', pending: 'pending', confirmed: 'confirmed' }

function refresh() {
  const user = getUser()
  list.value = getWorkerConfirmLines(user, tabKeyMap[activeTab.value])
  monthSalary.value = getWorkerMonthSalary(user)
}

watch(activeTab, refresh)

onShow(() => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  refresh()
})

function goBack() {
  uni.navigateBack()
}

function showFilterTip() {
  uni.showToast({ title: '筛选功能开发中', icon: 'none' })
}

function statusClass(status) {
  if (status === CONFIRM_STATUS.CONFIRMED) return 'confirmed'
  if (status === CONFIRM_STATUS.WORKER_PENDING) return 'pending'
  return ''
}

function hasAdjustment(item) {
  return (
    item.adjustedGoodQty != null ||
    item.adjustedDefectQty != null ||
    item.adjustedDuration != null ||
    item.subsidyReportQty ||
    item.subsidyHours
  )
}

function formatMoney(n) {
  const v = Number(n) || 0
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function onConfirm(item) {
  uni.showModal({
    title: '确认报工',
    content: `确认任务 ${item.taskNo} 的报工数据？确认后将计入本月计薪。`,
    success: (r) => {
      if (!r.confirm) return
      const res = workerConfirmLine(item.id, getUser())
      if (!res.ok) {
        uni.showToast({ title: res.message, icon: 'none' })
        return
      }
      refresh()
      uni.showToast({ title: '确认成功', icon: 'success' })
    },
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 88rpx 24rpx 16rpx;
  background: #fff;
}

.nav-back,
.nav-filter {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  font-size: 48rpx;
  color: #333;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
}

.filter-icon {
  font-size: 36rpx;
  color: #595959;
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #595959;
  position: relative;

  &.active {
    color: #1677ff;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      left: 25%;
      right: 25%;
      bottom: 0;
      height: 4rpx;
      background: #1677ff;
      border-radius: 2rpx;
    }
  }
}

.list-scroll {
  flex: 1;
  padding: 16rpx 24rpx;
  box-sizing: border-box;

  &.has-footer {
    padding-bottom: 120rpx;
  }
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.task-no {
  font-size: 24rpx;
  color: #8c8c8c;
}

.status {
  font-size: 24rpx;
  color: #ff4d4f;

  &.confirmed {
    color: #1677ff;
  }

  &.pending {
    color: #fa8c16;
  }
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.proc-name {
  font-size: 32rpx;
  font-weight: 600;
}

.mode {
  font-size: 22rpx;
  color: #8c8c8c;
}

.fields .row,
.adjust-box .row {
  display: flex;
  justify-content: space-between;
  padding: 6rpx 0;
  font-size: 26rpx;
}

.label {
  color: #8c8c8c;
}

.val {
  color: #262626;

  &.blue {
    color: #1677ff;
    font-weight: 600;
  }

  &.reason {
    max-width: 60%;
    text-align: right;
  }
}

.adjust-box {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f6ffed;
  border-radius: 12rpx;
  border: 1rpx solid #b7eb8f;

  &.pending {
    background: #fffbe6;
    border-color: #ffe58f;
  }
}

.salary-row .salary {
  color: #52c41a;
  font-weight: 700;
  font-size: 30rpx;
}

.confirm-btn {
  margin-top: 20rpx;
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #52c41a;
  color: #fff;
  text-align: center;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  font-size: 30rpx;
  font-weight: 600;
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: #bfbfbf;
}
</style>
