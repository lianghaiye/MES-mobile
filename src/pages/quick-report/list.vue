<template>
  <view class="hub-page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">登记产出</text>
      <view class="nav-placeholder" />
    </view>

    <view class="tabs">
      <view
        v-for="tab in mainTabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >{{ tab.label }}</view>
    </view>

    <text class="date-line">{{ dateHeader }}</text>

    <!-- 工单登记 -->
    <view v-if="activeTab === 'today'" class="panel">
      <text class="panel-sub">共 {{ todayOrders.length }} 条待登记工单</text>
      <view v-for="wo in todayOrders" :key="wo.id" class="wo-card">
        <view class="wo-head">
          <text class="wo-title">{{ wo.productName }} · {{ wo.productCode }}</text>
          <text class="wo-tag">{{ wo.workOrderNo }}</text>
        </view>
        <text class="wo-meta">排产 {{ wo.targetQty }} 件 · {{ wo.processCount }} 道工序</text>
        <text class="wo-process">{{ wo.processSummary }}</text>
        <button class="wo-btn" @tap="goRegisterFromWo(wo)">去登记</button>
      </view>
      <view v-if="!todayOrders.length" class="empty">今日暂无待登记工单</view>
    </view>

    <!-- 快速登记 -->
    <view v-if="activeTab === 'quick'" class="panel">
      <button class="add-btn" @tap="goNewRegister">+ 新增登记产出</button>
      <text class="section-title">最近常登记录</text>
      <view v-for="f in frequentList" :key="f.id" class="freq-card">
        <text class="freq-name">{{ f.productName }} · {{ f.productCode }}</text>
        <text v-if="f.routeName" class="freq-route">{{ f.routeName }}</text>
        <text class="freq-history">上次登记：{{ f.lastSummary }}</text>
        <button class="freq-btn" @tap="goRegisterFromFreq(f)">快速登记</button>
      </view>
    </view>

    <!-- 历史记录 -->
    <view v-if="activeTab === 'history'" class="panel">
      <view class="time-chips">
        <view
          v-for="t in timeFilters"
          :key="t.key"
          class="chip"
          :class="{ active: historyFilter === t.key }"
          @tap="historyFilter = t.key"
        >{{ t.label }}</view>
      </view>
      <text class="panel-sub">共 {{ historyList.length }} 条记录 · {{ filterLabel }}</text>

      <view v-if="!historyList.length" class="empty">暂无登记记录</view>

      <view
        v-for="item in historyList"
        :key="item.id"
        class="history-card"
        @tap="goDetail(item)"
      >
        <view class="card-head">
          <text class="product-title">{{ item.productName }} · {{ item.productCode }}</text>
        </view>
        <text v-if="item.workOrderNo" class="wo-no">工单号 {{ item.workOrderNo }}</text>
        <text class="date">{{ item.reportDate }}</text>

        <view class="metrics">
          <view class="metric">
            <text class="metric-num">{{ item.goodQty ?? item.finishedQty }}</text>
            <text class="metric-label">良品数(件)</text>
          </view>
          <view class="metric">
            <text class="metric-num defect">{{ item.defectQty || 0 }}</text>
            <text class="metric-label">不良品数(件)</text>
          </view>
          <view class="metric">
            <text class="metric-num">{{ item.processCount }}</text>
            <text class="metric-label">工序数</text>
          </view>
        </view>

        <view class="process-tags">
          <text v-for="(p, i) in item.processes" :key="i" class="tag">
            {{ p.name }} {{ p.qty }}件
          </text>
        </view>

        <text class="operators">操作人员：{{ item.operators.join('、') }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getDateHeader } from '@/mock/processReportRecords'
import {
  getTodayRegistrationOrders,
  hasTodayRegistrationOrders,
  getFrequentRegistrations,
} from '@/mock/outputRegistrationHub'
import { getQuickReportList, getFilterLabel } from '@/mock/quickReport'

const mainTabs = [
  { key: 'today', label: '工单登记' },
  { key: 'quick', label: '快速登记' },
  { key: 'history', label: '历史记录' },
]

const timeFilters = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'all', label: '全部' },
]

const activeTab = ref('today')
const historyFilter = ref('today')
const refreshKey = ref(0)
const dateHeader = getDateHeader()

const todayOrders = computed(() => {
  refreshKey.value
  return getTodayRegistrationOrders(null)
})

const frequentList = computed(() => {
  refreshKey.value
  return getFrequentRegistrations()
})

const historyList = computed(() => {
  refreshKey.value
  return getQuickReportList(historyFilter.value)
})

const filterLabel = computed(() => getFilterLabel(historyFilter.value))

onLoad(() => {
  activeTab.value = hasTodayRegistrationOrders(null) ? 'today' : 'quick'
})

onShow(() => {
  refreshKey.value += 1
})

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/workbench/index' })
  }
}

function goNewRegister() {
  uni.navigateTo({ url: '/pages/quick-report/form' })
}

function goRegisterFromWo(wo) {
  const q = [
    `woId=${wo.id}`,
    `workOrderNo=${encodeURIComponent(wo.workOrderNo)}`,
    `productCode=${encodeURIComponent(wo.productCode)}`,
    `targetQty=${wo.targetQty}`,
  ].join('&')
  uni.navigateTo({ url: `/pages/quick-report/form?${q}` })
}

function goRegisterFromFreq(f) {
  uni.navigateTo({ url: `/pages/quick-report/form?productId=${f.productId}` })
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/quick-report/detail?id=${item.id}` })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.hub-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 0 24rpx 48rpx;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 12rpx) 0 20rpx;
  background: #f5f6f8;
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  font-size: 52rpx;
  color: $primary;
  line-height: 1;
  font-weight: 300;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.nav-placeholder {
  width: 72rpx;
}

.tabs {
  display: flex;
  background: #e8e8e8;
  border-radius: 12rpx;
  padding: 6rpx;
  margin-bottom: 20rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #595959;
  border-radius: 8rpx;
}

.tab.active {
  background: #fff;
  color: $primary;
  font-weight: 600;
}

.date-line {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 20rpx;
}

.panel-sub,
.section-title {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.wo-card,
.freq-card,
.history-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.wo-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}

.wo-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
}

.wo-tag {
  font-size: 22rpx;
  color: $primary;
  background: #e6f4ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.wo-meta,
.wo-process {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.wo-btn {
  margin-top: 20rpx;
  width: 100%;
  height: 72rpx;
  line-height: 72rpx;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.add-btn {
  width: 100%;
  margin-bottom: 24rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.freq-name {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
}

.freq-route,
.freq-history {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.freq-btn {
  margin-top: 20rpx;
  width: 100%;
  height: 72rpx;
  line-height: 72rpx;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.time-chips {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.chip {
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  background: #fff;
  font-size: 26rpx;
  color: #595959;
}

.chip.active {
  background: $primary;
  color: #fff;
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: #999;
  font-size: 28rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.wo-no {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: $primary;
  font-weight: 600;
}

.date {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.metrics {
  display: flex;
  gap: 48rpx;
  margin: 24rpx 0 20rpx;
}

.metric-num {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: $primary;
  line-height: 1.1;

  &.defect {
    color: #ff4d4f;
  }
}

.metric-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.process-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.tag {
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #595959;
}

.operators {
  font-size: 24rpx;
  color: #8c8c8c;
}
</style>
