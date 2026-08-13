<template>
  <view class="select-page">
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'list' }"
        @tap="activeTab = 'list'"
      >
        工单列表
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'sales' }"
        @tap="activeTab = 'sales'"
      >
        按销售订单
      </view>
    </view>

    <text class="hint">选 1 个工单为单工单入库，选多个为批量合并</text>

    <view class="filter-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索工单号 / 产品 / 图号 / 销售订单"
        confirm-type="search"
      />
      <view class="filter-selectors">
        <view
          class="filter-cell"
          :class="{ active: !!dateRange }"
          @tap="openDatePicker"
        >
          <text class="filter-cell-text">{{ dateRangeLabel }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <view
          class="filter-cell"
          :class="{ active: !!orderType }"
          @tap="openTypePicker"
        >
          <text class="filter-cell-text">{{ orderTypeLabel }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <view
          class="filter-cell"
          :class="{ active: !!workCenter }"
          @tap="openWorkCenterPicker"
        >
          <text class="filter-cell-text">{{ workCenterLabel }}</text>
          <text class="filter-arrow">▾</text>
        </view>
        <text v-if="hasActiveFilters" class="filter-reset" @tap="resetFilters">重置</text>
      </view>
    </view>

    <template v-if="activeTab === 'list'">
      <view class="quick-actions">
        <text class="quick-btn" @tap="selectAllVisible">全选当前列表</text>
        <text v-if="canSelectBySalesOrder" class="quick-btn" @tap="selectBySalesOrder">
          按订单全选
        </text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="wo-card"
        @tap="toggleItem(item.id)"
      >
        <view class="checkbox" :class="{ checked: selectedIds.has(item.id) }">
          <text v-if="selectedIds.has(item.id)">✓</text>
        </view>
        <view class="wo-body">
          <view class="wo-head">
            <view class="wo-head-left">
              <text class="wo-code">{{ item.code }}</text>
              <text v-if="isApplied(item)" class="applied-badge">已申请入库</text>
            </view>
            <text class="wo-tag">{{ item.orderCategory }}</text>
          </view>
          <text class="wo-product">{{ item.productName }} · {{ item.productCode || '—' }}</text>
          <view class="wo-detail">
            <text>规格：{{ item.specModel || '—' }}</text>
            <text>材质：{{ item.material || '—' }}</text>
            <text>图号：{{ item.drawingNo || '—' }}</text>
          </view>
          <view class="wo-detail">
            <text>销售订单：{{ item.salesOrderNo || '—' }}</text>
          </view>
          <view class="wo-meta">
            <text>计划 {{ item.scheduleQty }}</text>
            <text>{{ item.workCenter }}</text>
            <text class="status" :class="statusClass(item.status)">{{ item.status }}</text>
          </view>
        </view>
      </view>

      <view v-if="!list.length" class="empty">暂无已完成工单</view>
    </template>

    <template v-else>
      <view
        v-for="group in salesOrderGroups"
        :key="group.displayNo"
        class="so-card"
        @tap="openGroup(group)"
      >
        <view class="so-head">
          <text class="so-no">{{ group.displayNo }}</text>
          <text class="so-count">{{ group.workOrderCount }} 个工单</text>
        </view>
        <text class="so-products">{{ group.productSummary || '—' }}</text>
        <text class="so-meta">车间：{{ group.workCenterLabel || '—' }}</text>
      </view>

      <view v-if="!salesOrderGroups.length" class="empty">暂无可入库的销售订单</view>
    </template>

    <view class="footer-bar">
      <text class="footer-text">已选 {{ selectedIds.size }} 个工单</text>
      <button class="confirm-btn" :disabled="!selectedIds.size" @tap="goCreate">
        {{ confirmLabel }}
      </button>
    </view>

    <view v-if="activeGroup" class="sheet-mask" @tap="closeGroup">
      <view class="sheet-panel" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ activeGroup.displayNo }}</text>
          <text class="sheet-close" @tap="closeGroup">关闭</text>
        </view>
        <text class="sheet-sub">选择要入库的工单（默认全选）</text>

        <scroll-view scroll-y class="sheet-list">
          <view
            v-for="wo in activeGroup.workOrders"
            :key="wo.id"
            class="wo-row"
            @tap="toggleWo(wo.id)"
          >
            <view class="checkbox" :class="{ checked: sheetSelectedIds.has(wo.id) }">
              <text v-if="sheetSelectedIds.has(wo.id)">✓</text>
            </view>
            <view class="wo-info">
              <view class="wo-info-head">
                <text class="wo-code">{{ wo.code }}</text>
                <text v-if="isApplied(wo)" class="applied-badge sm">已申请入库</text>
              </view>
              <text class="wo-product">{{ wo.productName }} · {{ wo.scheduleQty }} 件</text>
              <text class="wo-center">{{ wo.workCenter }} · {{ wo.status }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="sheet-foot">
          <text class="select-all" @tap="toggleAllInGroup">全选 / 取消</text>
          <button class="confirm-btn" :disabled="!sheetSelectedIds.size" @tap="goCreateFromSheet">
            {{ sheetConfirmLabel }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  filterCompletedWorkOrders,
  getAppliedProductInboundWorkOrderKeys,
  isWorkOrderProductInboundApplied,
  listDistinctCompletedWorkCenters,
  listSalesOrdersWithCompletedWorkOrders,
  WORK_ORDER_DATE_FILTERS,
  WORK_ORDER_TYPE_FILTERS,
} from '@/mock/workOrderBridge'

const activeTab = ref('list')
const keyword = ref('')
const workCenter = ref('')
const dateRange = ref('')
const orderType = ref('')
const selectedIds = ref(new Set())
const activeGroup = ref(null)
const sheetSelectedIds = ref(new Set())
const appliedKeys = ref(getAppliedProductInboundWorkOrderKeys())

const dateFilterOptions = WORK_ORDER_DATE_FILTERS
const typeFilterOptions = WORK_ORDER_TYPE_FILTERS

const workCenterOptions = computed(() => [
  { value: '', label: '全部车间' },
  ...listDistinctCompletedWorkCenters().map((wc) => ({ value: wc, label: wc })),
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

const list = computed(() =>
  filterCompletedWorkOrders({
    keyword: keyword.value,
    workCenter: workCenter.value,
    dateRange: dateRange.value,
    orderType: orderType.value,
  }),
)

const salesOrderGroups = computed(() =>
  listSalesOrdersWithCompletedWorkOrders({
    keyword: keyword.value,
    workCenter: workCenter.value,
    dateRange: dateRange.value,
    orderType: orderType.value,
  }),
)

const canSelectBySalesOrder = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return false
  return list.value.some((item) => (item.salesOrderNo || '').includes(kw))
})

const confirmLabel = computed(() => {
  const n = selectedIds.value.size
  if (n <= 0) return '请选择工单'
  if (n === 1) return '去入库'
  return `合并入库 (${n})`
})

const sheetConfirmLabel = computed(() => {
  const n = sheetSelectedIds.value.size
  if (n <= 0) return '请选择工单'
  if (n === 1) return '去入库'
  return `已选 ${n} 个，合并入库`
})

onLoad((query) => {
  if (query.tab === 'sales') activeTab.value = 'sales'
})

onShow(() => {
  appliedKeys.value = getAppliedProductInboundWorkOrderKeys()
})

function isApplied(item) {
  return isWorkOrderProductInboundApplied(item, appliedKeys.value)
}

function statusClass(status) {
  if (status === '执行中' || status === '进行中') return 'running'
  if (status === '待下发') return 'pending'
  if (status === '完成' || status === '已完成' || status === '已完工' || status === '已关闭') {
    return 'done'
  }
  return ''
}

function toggleItem(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function selectAllVisible() {
  const ids = list.value.map((item) => item.id)
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.value.has(id))
  selectedIds.value = allSelected ? new Set() : new Set(ids)
}

function selectBySalesOrder() {
  const kw = keyword.value.trim()
  if (!kw) return
  const ids = list.value
    .filter((item) => (item.salesOrderNo || '').includes(kw))
    .map((item) => item.id)
  selectedIds.value = new Set(ids)
}

function openGroup(group) {
  activeGroup.value = group
  sheetSelectedIds.value = new Set(group.workOrders.map((wo) => wo.id))
}

function closeGroup() {
  activeGroup.value = null
  sheetSelectedIds.value = new Set()
}

function toggleWo(id) {
  const next = new Set(sheetSelectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  sheetSelectedIds.value = next
}

function toggleAllInGroup() {
  if (!activeGroup.value) return
  const allIds = activeGroup.value.workOrders.map((wo) => wo.id)
  const allSelected = allIds.every((id) => sheetSelectedIds.value.has(id))
  sheetSelectedIds.value = allSelected ? new Set() : new Set(allIds)
}

function navigateWithIds(ids) {
  if (!ids.length) return
  if (ids.length === 1) {
    uni.navigateTo({
      url: `/pages/product-inbound/create-by-work-order?workOrderId=${ids[0]}`,
    })
    return
  }
  uni.navigateTo({
    url: `/pages/product-inbound/create-batch-work-order?workOrderIds=${ids.join(',')}`,
  })
}

function goCreate() {
  navigateWithIds([...selectedIds.value])
}

function goCreateFromSheet() {
  const ids = [...sheetSelectedIds.value]
  closeGroup()
  navigateWithIds(ids)
}
</script>

<style lang="scss" scoped>
$primary: #52c41a;

.select-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx 24rpx 180rpx;
}

.tab-bar {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  padding: 6rpx;
  margin-bottom: 16rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #595959;
  border-radius: 8rpx;
}

.tab-item.active {
  background: $primary;
  color: #fff;
  font-weight: 600;
}

.hint {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.filter-bar {
  margin-bottom: 12rpx;
}

.search-input {
  width: 100%;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
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
  border-color: #b7eb8f;
  background: #f6ffed;
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

.quick-actions {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.quick-btn {
  font-size: 26rpx;
  color: $primary;
}

.wo-card {
  display: flex;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #fff;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.checkbox.checked {
  background: $primary;
  border-color: $primary;
}

.wo-body {
  flex: 1;
  min-width: 0;
}

.wo-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
}

.wo-head-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx 12rpx;
  min-width: 0;
}

.wo-code {
  font-size: 28rpx;
  font-weight: 600;
  color: $primary;
}

.applied-badge {
  font-size: 20rpx;
  color: #d46b08;
  background: #fff7e6;
  border: 1rpx solid #ffd591;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  line-height: 1.4;
}

.applied-badge.sm {
  font-size: 20rpx;
}

.wo-tag {
  font-size: 22rpx;
  color: #8c8c8c;
  background: #f5f6f8;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.wo-product {
  display: block;
  font-size: 26rpx;
  color: #262626;
  margin-top: 8rpx;
}

.wo-detail,
.wo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 16rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.status {
  color: #8c8c8c;
}

.status.running {
  color: #52c41a;
}

.status.pending {
  color: #1677ff;
}

.status.done {
  color: #52c41a;
}

.so-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.so-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.so-no {
  font-size: 30rpx;
  font-weight: 600;
  color: $primary;
}

.so-count {
  font-size: 24rpx;
  color: #8c8c8c;
}

.so-products {
  display: block;
  font-size: 28rpx;
  color: #262626;
  margin-bottom: 8rpx;
}

.so-meta {
  font-size: 24rpx;
  color: #8c8c8c;
}

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 80rpx 0;
  font-size: 26rpx;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.footer-text {
  font-size: 26rpx;
  color: #595959;
  flex-shrink: 0;
}

.confirm-btn {
  flex: 1;
  background: $primary;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.confirm-btn[disabled] {
  opacity: 0.5;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.sheet-panel {
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
}

.sheet-close {
  font-size: 28rpx;
  color: #8c8c8c;
}

.sheet-sub {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin: 12rpx 0 16rpx;
}

.sheet-list {
  flex: 1;
  max-height: 50vh;
}

.wo-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.wo-info-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx 12rpx;
}

.wo-info .wo-code {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #262626;
}

.wo-info .wo-product {
  display: block;
  font-size: 26rpx;
  color: #595959;
  margin-top: 4rpx;
}

.wo-center {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-top: 4rpx;
}

.sheet-foot {
  margin-top: 16rpx;
}

.select-all {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: $primary;
  margin-bottom: 16rpx;
}
</style>
