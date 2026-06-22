<template>
  <view class="page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">工时工资</text>
      <view class="nav-filter" @tap="openFilter">
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

    <scroll-view scroll-y class="list-scroll" :class="{ 'has-footer': showFooterBar }">
      <view v-for="item in list" :key="item.id" class="card" @tap="goDetail(item)">
        <view class="card-head">
          <text class="task-no">{{ item.taskNo || '—' }}</text>
          <text class="status" :class="statusClass(item.taskStatus)">{{ item.taskStatus }}</text>
        </view>
        <view class="card-title-row">
          <view class="title-main">
            <text class="proc-name">{{ item.processName }}</text>
            <text class="product-name">{{ item.materialName }}</text>
          </view>
          <text class="mode">【{{ item.reportTypeLabel }}】</text>
        </view>
        <view class="fields">
          <view class="row">
            <text class="label">销售订单</text>
            <text class="val">{{ item.salesOrderNo || '—' }}</text>
          </view>
          <view class="row">
            <text class="label">工单编号</text>
            <text class="val">{{ item.workOrderCode || '—' }}</text>
          </view>
          <view class="row">
            <text class="label">产品编码</text>
            <text class="val">{{ item.materialCode || '—' }}</text>
          </view>
          <view class="row">
            <text class="label">报工时间</text>
            <text class="val">{{ item.reportTime }}</text>
          </view>
          <view class="row">
            <text class="label">报工数量</text>
            <text class="val blue">{{ item.reportQty }}</text>
          </view>
          <view v-if="item.reportType === '时长报工'" class="row">
            <text class="label">报工时长</text>
            <text class="val">{{ item.reportDuration }}h</text>
          </view>
          <view v-if="showFinalAccountHours(item)" class="row">
            <text class="label">最终核算工时</text>
            <text class="val">{{ item.finalAccountHours }}h</text>
          </view>
        </view>

        <view class="adjust-box">
          <view v-if="showMoney(item.goodWage)" class="row">
            <text class="label">良品工资</text>
            <text class="val">{{ formatMoney(item.goodWage) }}元</text>
          </view>
          <view v-if="showMoney(item.defectWage)" class="row">
            <text class="label">不良品工资</text>
            <text class="val">{{ formatMoney(item.defectWage) }}元</text>
          </view>
          <view v-if="showQty(item.subsidyReportQty)" class="row">
            <text class="label">补贴工数</text>
            <text class="val">{{ item.subsidyReportQty }}</text>
          </view>
          <view v-if="showQty(item.subsidyHours)" class="row">
            <text class="label">补贴工时</text>
            <text class="val">{{ item.subsidyHours }}h</text>
          </view>
          <view v-if="showMoney(item.subsidyAmount)" class="row">
            <text class="label">补贴金额</text>
            <text class="val">{{ formatMoney(item.subsidyAmount) }}元</text>
          </view>
          <view v-if="hasAdjustQty(item.adjustedGoodQty)" class="row">
            <text class="label">调整良品数</text>
            <text class="val">{{ item.adjustedGoodQty }}</text>
          </view>
          <view v-if="hasAdjustQty(item.adjustedDefectQty)" class="row">
            <text class="label">调整不良品数</text>
            <text class="val">{{ item.adjustedDefectQty }}</text>
          </view>
          <view v-if="showMoney(item.qualityDeduction || item.manualQualityDeduction)" class="row">
            <text class="label">质量扣款</text>
            <text class="val deduct">{{ formatMoney(item.qualityDeduction || item.manualQualityDeduction) }}元</text>
          </view>
          <view v-if="item.adjustReason" class="row">
            <text class="label">调整原因</text>
            <text class="val reason">{{ item.adjustReason }}</text>
          </view>
          <view v-if="item.subsidyReason" class="row">
            <text class="label">补贴原因</text>
            <text class="val reason">{{ item.subsidyReason }}</text>
          </view>
          <view class="row salary-row">
            <text class="label">计薪</text>
            <text class="salary">{{ formatMoney(item.salaryAmount) }}元</text>
          </view>
        </view>
      </view>

      <view v-if="!list.length" class="empty">暂无已推送的工时工资记录</view>
    </scroll-view>

    <view v-if="showFooterBar" class="footer-bar">
      <text>{{ footerLabel }}：{{ formatMoney(footerSalary) }}元</text>
    </view>

    <view v-if="filterVisible" class="filter-mask" @tap="closeFilter">
      <view class="filter-panel" @tap.stop>
        <view class="filter-head">
          <text class="filter-title">筛选条件</text>
          <text class="filter-close" @tap="closeFilter">×</text>
        </view>

        <scroll-view scroll-y class="filter-body" :style="{ height: filterScrollHeight + 'px' }">
          <view class="filter-section">
            <text class="section-label">单号</text>
            <input
              v-model="draftFilters.orderNo"
              class="order-input"
              placeholder="销售单号/工单号/任务单号"
              confirm-type="search"
              @confirm="searchFilter"
            />
          </view>

          <view class="filter-section">
            <text class="section-label">产品</text>
            <view class="search-bar">
              <text class="search-icon">⌕</text>
              <input
                v-model="productKeyword"
                class="search-input"
                placeholder="请输入关键字进行搜索"
              />
            </view>
            <view class="tag-list">
              <view
                v-for="name in filteredProducts"
                :key="name"
                class="tag"
                :class="{ active: draftFilters.products.includes(name) }"
                @tap="toggleProduct(name)"
              >{{ name }}</view>
              <view v-if="!filteredProducts.length" class="tag-empty">暂无匹配产品</view>
            </view>
          </view>

          <view class="filter-section">
            <text class="section-label">工序</text>
            <view class="search-bar">
              <text class="search-icon">⌕</text>
              <input
                v-model="processKeyword"
                class="search-input"
                placeholder="请输入关键字进行搜索"
              />
            </view>
            <view class="tag-list">
              <view
                v-for="name in filteredProcesses"
                :key="name"
                class="tag"
                :class="{ active: draftFilters.processes.includes(name) }"
                @tap="toggleProcess(name)"
              >{{ name }}</view>
              <view v-if="!filteredProcesses.length" class="tag-empty">暂无匹配工序</view>
            </view>
          </view>

          <view class="filter-section">
            <text class="section-label">时间</text>
            <view class="period-row">
              <view
                class="period-btn"
                :class="{ active: draftFilters.period === 'week' }"
                @tap="selectPeriod('week')"
              >本周</view>
              <view
                class="period-btn"
                :class="{ active: draftFilters.period === 'month' }"
                @tap="selectPeriod('month')"
              >本月</view>
            </view>
            <text class="custom-label">自定义时间段:</text>
            <view class="date-row">
              <picker mode="date" :value="draftFilters.startDate" @change="onStartDateChange">
                <view class="date-picker">{{ draftFilters.startDate || '开始时间' }}</view>
              </picker>
              <text class="date-sep">—</text>
              <picker mode="date" :value="draftFilters.endDate" @change="onEndDateChange">
                <view class="date-picker">{{ draftFilters.endDate || '结束时间' }}</view>
              </picker>
            </view>
          </view>
        </scroll-view>

        <view class="filter-foot">
          <button class="btn-reset" @tap="resetFilter">重置</button>
          <button class="btn-search" @tap="searchFilter">搜索</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, computed, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getUser, isLoggedIn } from '@/utils/auth'
import { createEmptyLaborWageFilters, hasTimeFilter, sumLaborWageSalary } from '@/utils/laborWageFilter'
import {
  getWorkerLaborWageLines,
  getWorkerLaborWageFilterOptions,
  getWorkerMonthSalary,
  TASK_STATUS,
} from '@/mock/laborWageStore'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'reported', label: '已报工' },
  { key: 'audited', label: '已审核' },
]
const activeTab = ref('all')
const list = ref([])
const monthSalary = ref(0)
const filterVisible = ref(false)
const appliedFilters = ref(createEmptyLaborWageFilters())
const draftFilters = reactive(createEmptyLaborWageFilters())
const productKeyword = ref('')
const processKeyword = ref('')
const filterOptions = ref({ products: [], processes: [] })
const filterScrollHeight = ref(400)

const isTimeFiltered = computed(() => hasTimeFilter(appliedFilters.value))

const footerLabel = computed(() => (isTimeFiltered.value ? '当前计薪' : '本月计薪'))

const footerSalary = computed(() => {
  if (isTimeFiltered.value) return sumLaborWageSalary(list.value)
  return monthSalary.value
})

const showFooterBar = computed(() => isTimeFiltered.value || footerSalary.value > 0)

const filteredProducts = computed(() => {
  const kw = productKeyword.value.trim().toLowerCase()
  if (!kw) return filterOptions.value.products
  return filterOptions.value.products.filter((name) => name.toLowerCase().includes(kw))
})

const filteredProcesses = computed(() => {
  const kw = processKeyword.value.trim().toLowerCase()
  if (!kw) return filterOptions.value.processes
  return filterOptions.value.processes.filter((name) => name.toLowerCase().includes(kw))
})

function refresh() {
  const user = getUser()
  filterOptions.value = getWorkerLaborWageFilterOptions(user)
  list.value = getWorkerLaborWageLines(user, activeTab.value, appliedFilters.value)
  monthSalary.value = getWorkerMonthSalary(user)
}

function syncDraftFromApplied() {
  const next = createEmptyLaborWageFilters()
  Object.assign(next, JSON.parse(JSON.stringify(appliedFilters.value)))
  Object.assign(draftFilters, next)
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

function openFilter() {
  syncDraftFromApplied()
  productKeyword.value = ''
  processKeyword.value = ''
  updateFilterScrollHeight()
  filterVisible.value = true
}

function updateFilterScrollHeight() {
  const sys = uni.getSystemInfoSync()
  const topInset = sys.safeAreaInsets?.top || sys.statusBarHeight || 0
  const bottomInset = sys.safeAreaInsets?.bottom || 0
  const maskPaddingTop = topInset + uni.upx2px(80)
  const maskPaddingBottom = uni.upx2px(24)
  const headH = uni.upx2px(90)
  const footH = uni.upx2px(120) + bottomInset
  const available = sys.windowHeight - maskPaddingTop - maskPaddingBottom - headH - footH
  filterScrollHeight.value = Math.max(200, available)
}

function closeFilter() {
  filterVisible.value = false
}

function toggleProduct(name) {
  const idx = draftFilters.products.indexOf(name)
  if (idx >= 0) draftFilters.products.splice(idx, 1)
  else draftFilters.products.push(name)
}

function toggleProcess(name) {
  const idx = draftFilters.processes.indexOf(name)
  if (idx >= 0) draftFilters.processes.splice(idx, 1)
  else draftFilters.processes.push(name)
}

function selectPeriod(period) {
  draftFilters.period = draftFilters.period === period ? '' : period
  if (draftFilters.period) {
    draftFilters.startDate = ''
    draftFilters.endDate = ''
  }
}

function onStartDateChange(e) {
  draftFilters.startDate = e.detail.value
  draftFilters.period = ''
}

function onEndDateChange(e) {
  draftFilters.endDate = e.detail.value
  draftFilters.period = ''
}

function resetFilter() {
  const empty = createEmptyLaborWageFilters()
  Object.assign(draftFilters, empty)
  productKeyword.value = ''
  processKeyword.value = ''
  appliedFilters.value = JSON.parse(JSON.stringify(empty))
  refresh()
}

function searchFilter() {
  appliedFilters.value = JSON.parse(JSON.stringify(draftFilters))
  filterVisible.value = false
  refresh()
}

function statusClass(status) {
  if (status === TASK_STATUS.AUDITED) return 'confirmed'
  return 'pending'
}

function formatMoney(n) {
  const v = Number(n) || 0
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function hasAdjustQty(v) {
  return v != null && v !== ''
}

function showMoney(v) {
  return Number(v) > 0
}

function showQty(v) {
  return Number(v) > 0
}

function isBatchPieceSalary(item) {
  return item?.reportType === '批量计件' && item?.salaryMethod === '计件工资'
}

function isHourlySalary(item) {
  return item?.salaryMethod === '计时工资'
}

/** 最终核算工时：仅计时工资模式展示；批量计件+计件工资不展示 */
function showFinalAccountHours(item) {
  if (!item || isBatchPieceSalary(item) || !isHourlySalary(item)) return false
  const hours = item.finalAccountHours
  return hours != null && hours !== '' && Number(hours) > 0
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/work-hours/detail?id=${item.id}` })
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
  padding: calc(env(safe-area-inset-top, 0px) + 12rpx) 24rpx 16rpx;
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
  font-size: 26rpx;
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
  color: #fa8c16;

  &.confirmed {
    color: #1677ff;
  }
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
  gap: 12rpx;
}

.title-main {
  flex: 1;
  min-width: 0;
}

.proc-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
}

.product-name {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #8c8c8c;
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

  &.deduct {
    color: #ff4d4f;
  }
}

.adjust-box {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #f6ffed;
  border-radius: 12rpx;
  border: 1rpx solid #b7eb8f;
}

.salary-row .salary {
  color: #52c41a;
  font-weight: 700;
  font-size: 30rpx;
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

.filter-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 200;
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top, 0px) + 80rpx) 24rpx 24rpx;
  box-sizing: border-box;
}

.filter-panel {
  width: 100%;
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 28rpx 32rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #262626;
}

.filter-close {
  font-size: 44rpx;
  color: #8c8c8c;
  line-height: 1;
  padding: 0 8rpx;
}

.filter-body {
  width: 100%;
  padding: 8rpx 32rpx 24rpx;
  box-sizing: border-box;
}

.filter-section {
  margin-top: 24rpx;
}

.section-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16rpx;
}

.order-input {
  width: 100%;
  height: 72rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
  background: #fafafa;
}

.search-bar {
  display: flex;
  align-items: center;
  height: 72rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 36rpx;
  padding: 0 24rpx;
  margin-bottom: 16rpx;
  background: #fafafa;
}

.search-icon {
  font-size: 28rpx;
  color: #bfbfbf;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag {
  padding: 12rpx 24rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #595959;
  background: #fff;

  &.active {
    border-color: #1677ff;
    color: #1677ff;
    background: #e6f4ff;
  }
}

.tag-empty {
  font-size: 24rpx;
  color: #bfbfbf;
}

.period-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.period-btn {
  min-width: 140rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #595959;

  &.active {
    border-color: #1677ff;
    color: #1677ff;
    background: #e6f4ff;
  }
}

.custom-label {
  display: block;
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 12rpx;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.date-picker {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #595959;
  background: #fafafa;
}

.date-sep {
  color: #8c8c8c;
}

.filter-foot {
  display: flex;
  gap: 24rpx;
  flex-shrink: 0;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.btn-reset,
.btn-search {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 8rpx;
  font-size: 30rpx;
  border: none;

  &::after {
    border: none;
  }
}

.btn-reset {
  background: #52c41a;
  color: #fff;
}

.btn-search {
  background: #1677ff;
  color: #fff;
}
</style>
