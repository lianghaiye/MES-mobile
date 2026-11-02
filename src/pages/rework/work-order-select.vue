<template>
  <view class="select-page">
    <view class="filter-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索工单号 / 产品 / 图号"
        confirm-type="search"
      />
      <view class="filter-selectors">
        <view class="filter-cell" :class="{ active: !!dateRange }" @tap="openDatePicker">
          <text class="filter-cell-text">{{ dateRangeLabel }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <view class="filter-cell" :class="{ active: !!orderType }" @tap="openTypePicker">
          <text class="filter-cell-text">{{ orderTypeLabel }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <view class="filter-cell" :class="{ active: !!workCenter }" @tap="openWorkCenterPicker">
          <text class="filter-cell-text">{{ workCenterLabel }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <text v-if="hasActiveFilters" class="filter-reset" @tap="resetFilters">重置</text>
      </view>
    </view>
    <text class="hint">仅可选生产/总装且执行中、已完成或返工中的工单；列表前几条为带工序的演示工单</text>

    <view v-for="item in list" :key="item.id" class="wo-card" @tap="pick(item)">
      <view class="wo-head">
        <text class="wo-code">{{ item.code }}</text>
        <text class="wo-tag">{{ item.orderCategory }}</text>
      </view>
      <text class="wo-product">{{ item.productName }} · {{ item.productCode || '—' }}</text>
      <view class="wo-detail">
        <text>规格：{{ item.specModel || '—' }}</text>
        <text>图号：{{ item.drawingNo || '—' }}</text>
      </view>
      <view class="wo-meta">
        <text>数量 {{ item.scheduleQty || item.planQty || '—' }}</text>
        <text>{{ item.workCenter || '—' }}</text>
        <text class="status">{{ item.status }}</text>
      </view>
    </view>

    <view v-if="!list.length" class="empty">暂无可选工单</view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  WORK_ORDER_DATE_FILTERS,
  WORK_ORDER_TYPE_FILTERS,
} from '@/mock/workOrderBridge'
import {
  listDistinctReworkableWorkCenters,
  listReworkableWorkOrders,
} from '@/store/reworkOrderStore'

const keyword = ref('')
const workCenter = ref('')
const dateRange = ref('')
const orderType = ref('')

const dateFilterOptions = WORK_ORDER_DATE_FILTERS
/** 返工仅生产/总装，类型筛选项与可返工范围对齐 */
const typeFilterOptions = WORK_ORDER_TYPE_FILTERS.filter(
  (o) => !o.value || o.value === 'production' || o.value === 'assembly',
)

const workCenterOptions = computed(() => [
  { value: '', label: '全部车间' },
  ...listDistinctReworkableWorkCenters().map((wc) => ({ value: wc, label: wc })),
])

const dateRangeLabel = computed(() => {
  if (!dateRange.value) return '时间'
  const hit = dateFilterOptions.find((o) => o.value === dateRange.value)
  return hit?.label || '时间'
})

const orderTypeLabel = computed(() => {
  if (!orderType.value) return '类型'
  const hit = typeFilterOptions.find((o) => o.value === orderType.value)
  return hit?.label || '类型'
})

const workCenterLabel = computed(() => {
  if (!workCenter.value) return '车间'
  return workCenter.value
})

const hasActiveFilters = computed(
  () => Boolean(dateRange.value || orderType.value || workCenter.value),
)

const list = computed(() =>
  listReworkableWorkOrders({
    keyword: keyword.value,
    workCenter: workCenter.value,
    dateRange: dateRange.value,
    orderType: orderType.value,
  }),
)

function pickFromOptions(options, onSelect) {
  uni.showActionSheet({
    itemList: options.map((o) => o.label),
    success: (res) => {
      const picked = options[res.tapIndex]
      if (!picked) return
      onSelect(picked.value)
    },
  })
}

function openDatePicker() {
  pickFromOptions(dateFilterOptions, (v) => {
    dateRange.value = v
  })
}

function openTypePicker() {
  pickFromOptions(typeFilterOptions, (v) => {
    orderType.value = v
  })
}

function openWorkCenterPicker() {
  pickFromOptions(workCenterOptions.value, (v) => {
    workCenter.value = v
  })
}

function resetFilters() {
  dateRange.value = ''
  orderType.value = ''
  workCenter.value = ''
}

function pick(item) {
  uni.navigateTo({ url: `/pages/rework/create?workOrderId=${item.id}` })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.select-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
}

.filter-bar {
  margin-bottom: 12rpx;
}

.search-input {
  width: 100%;
  background: #fff;
  border-radius: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.filter-selectors {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.filter-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  background: #fff;
  border-radius: 10rpx;
  padding: 14rpx 10rpx;
  border: 1rpx solid #f0f0f0;
}

.filter-cell.active {
  border-color: #91caff;
  background: #e6f4ff;
}

.filter-cell-text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24rpx;
  color: #595959;
}

.filter-cell.active .filter-cell-text {
  color: $primary;
  font-weight: 500;
}

.filter-arrow {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #bfbfbf;
  line-height: 1;
}

.filter-cell.active .filter-arrow {
  color: $primary;
}

.filter-reset {
  flex-shrink: 0;
  font-size: 24rpx;
  color: $primary;
  padding: 0 4rpx;
}

.hint {
  display: block;
  font-size: 22rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.wo-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.wo-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wo-code {
  font-size: 28rpx;
  font-weight: 600;
  color: $primary;
}

.wo-tag {
  font-size: 22rpx;
  color: #1677ff;
  background: #e6f4ff;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
}

.wo-product {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #262626;
}

.wo-detail,
.wo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 20rpx;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.status {
  color: #fa8c16;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 80rpx 0;
  font-size: 26rpx;
}
</style>
