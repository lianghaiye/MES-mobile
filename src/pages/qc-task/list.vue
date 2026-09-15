<template>
  <view class="qc-list-page">
    <view class="top-bar">
      <view class="hub-link" @tap="goHub">回到质检首页</view>
    </view>

    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        :placeholder="searchPlaceholder"
        confirm-type="search"
        @confirm="noop"
      />
    </view>

    <scroll-view scroll-x class="tabs">
      <view
        v-for="tab in statusTabs"
        :key="String(tab.value)"
        class="tab"
        :class="{ active: statusFilter === tab.value }"
        @tap="statusFilter = tab.value"
      >
        {{ tab.label }}
        <text v-if="tab.count > 0" class="tab-count">({{ tab.count }})</text>
      </view>
    </scroll-view>

    <view v-if="!list.length" class="empty">
      <text class="empty-title">暂无{{ currentMeta?.title || '质检' }}任务</text>
      <text class="empty-tip">请先在 WEB 端生成质检单；H5 同域可与 WEB 数据互通</text>
    </view>

    <view v-for="item in list" :key="item.id" class="card" @tap="goDetail(item)">
      <view class="card-head">
        <text class="qc-no">{{ item.qcNo || '待生成单号' }}</text>
        <StatusTag :text="item.qcStatus" />
      </view>
      <view v-for="row in summaryRows(item)" :key="row.label" class="row">
        <text class="label">{{ row.label }}</text>
        <text class="val">{{ row.value }}</text>
      </view>
      <view class="row">
        <text class="label">创建人</text>
        <text class="val">{{ item.creator || '—' }}</text>
      </view>
      <view class="row">
        <text class="label">创建时间</text>
        <text class="val">{{ formatTime(item.createdAt) }}</text>
      </view>
      <view v-if="item.qcResult" class="row">
        <text class="label">质检结果</text>
        <StatusTag :text="item.qcResult" />
      </view>
      <view v-if="item.qcStatus === '待质检'" class="card-foot">
        <button class="btn-sm" size="mini" @tap.stop="goInspect(item)">去质检</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import { getQcList, getQcBizScopeMeta, ensureSharedQcDemoSeed } from '@/mock/qcTask'

const keyword = ref('')
const bizScope = ref('来料质检')
const statusFilter = ref('待质检')
const allList = ref([])

const currentMeta = computed(() => getQcBizScopeMeta(bizScope.value))

const scopedAll = computed(() => allList.value.filter((r) => r.bizScope === bizScope.value))

const statusTabs = computed(() => {
  const all = scopedAll.value
  return [
    { label: '全部', value: '', count: all.length },
    { label: '待质检', value: '待质检', count: all.filter((r) => r.qcStatus === '待质检').length },
    { label: '已完成', value: '已完成', count: all.filter((r) => r.qcStatus === '已完成').length },
  ]
})

const list = computed(() =>
  getQcList({
    bizScope: bizScope.value || undefined,
    qcStatus: statusFilter.value || undefined,
    keyword: keyword.value.trim(),
  }),
)

const searchPlaceholder = computed(() => {
  if (bizScope.value === '来料质检' || bizScope.value === '外协回货检') {
    return '搜索单号 / 物料 / 供应商'
  }
  if (bizScope.value === '生产过程检' || bizScope.value === '成品检') {
    return '搜索单号 / 物料 / 工单'
  }
  return '搜索单号 / 销售单 / 客户'
})

function summaryRows(item) {
  if (item.bizScope === '来料质检' || item.bizScope === '外协回货检') {
    return [
      { label: '来源单号', value: item.sourceDocNo || '—' },
      { label: '供应商', value: item.supplier || '—' },
      { label: '物料', value: item.itemName || '—' },
    ]
  }
  if (item.bizScope === '生产过程检' || item.bizScope === '成品检') {
    return [
      { label: '工单号', value: item.workOrderNo || '—' },
      { label: '工序', value: item.processName || '—' },
      { label: '物料', value: item.itemName || '—' },
    ]
  }
  return [
    { label: '销售单号', value: item.salesOrderNo || '—' },
    { label: '客户', value: item.customerName || '—' },
    { label: '出库单号', value: item.outboundDocNo || '—' },
  ]
}

function formatTime(value) {
  if (!value) return '—'
  const text = String(value)
  return text.length >= 16 ? text.slice(0, 16) : text
}

function syncNavTitle() {
  uni.setNavigationBarTitle({ title: currentMeta.value?.title || '质检任务' })
}

function loadList() {
  ensureSharedQcDemoSeed()
  allList.value = getQcList({})
}

function goHub() {
  const pages = getCurrentPages()
  for (let i = pages.length - 2; i >= 0; i--) {
    if (pages[i].route?.includes('qc-task/index')) {
      uni.navigateBack({ delta: pages.length - 1 - i })
      return
    }
  }
  uni.redirectTo({ url: '/pages/qc-task/index' })
}

function noop() {}

function goDetail(item) {
  uni.navigateTo({
    url: `/pages/qc-task/detail?id=${item.id}&bizScope=${encodeURIComponent(bizScope.value)}`,
  })
}

function goInspect(item) {
  uni.navigateTo({
    url: `/pages/qc-task/inspect?id=${item.id}&bizScope=${encodeURIComponent(bizScope.value)}`,
  })
}

watch(bizScope, () => syncNavTitle())

onLoad((query) => {
  const scope = decodeURIComponent(query.bizScope || '')
  if (getQcBizScopeMeta(scope)) {
    bizScope.value = scope
  } else {
    bizScope.value = '来料质检'
  }
  syncNavTitle()
})

onShow(() => loadList())

onPullDownRefresh(() => {
  loadList()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.qc-list-page {
  padding: 20rpx 24rpx 48rpx;
}

.top-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16rpx;
}

.hub-link {
  padding: 12rpx 22rpx;
  font-size: 24rpx;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 999rpx;
  font-weight: 600;
}

.search-bar {
  margin-bottom: 16rpx;
}

.search-input {
  height: 72rpx;
  padding: 0 24rpx;
  background: $bg-card;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.tabs {
  white-space: nowrap;
  margin-bottom: 20rpx;
}

.tab {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: $text-secondary;
  background: $bg-card;
  border-radius: 32rpx;
}

.tab.active {
  color: $primary;
  background: $primary-light;
  font-weight: 600;
}

.tab-count {
  margin-left: 4rpx;
}

.empty {
  text-align: center;
  padding: 80rpx 40rpx;
  color: $text-secondary;
}

.empty-title {
  display: block;
  font-size: 28rpx;
  margin-bottom: 12rpx;
}

.empty-tip {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.35);
}

.card {
  background: $bg-card;
  border-radius: $radius;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.qc-no {
  font-size: 30rpx;
  font-weight: 600;
  color: $primary;
}

.row {
  display: flex;
  margin-top: 10rpx;
  font-size: 26rpx;
}

.label {
  width: 160rpx;
  color: $text-secondary;
  flex-shrink: 0;
}

.val {
  flex: 1;
  color: $text-primary;
}

.card-foot {
  margin-top: 20rpx;
  text-align: right;
}

.btn-sm {
  background: $primary;
  color: #fff;
  border: none;
}
</style>
