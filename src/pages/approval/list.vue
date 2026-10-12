<template>
  <view class="approval-list-page">
    <view class="top-bar">
      <view class="hub-link" @tap="goHub">回到审批首页</view>
    </view>

    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        :placeholder="searchPlaceholder"
        confirm-type="search"
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
      <text class="empty-title">暂无{{ currentMeta?.title || '审批' }}单据</text>
      <text class="empty-tip">请先在 WEB 端提交待审核订单；H5 同域可与 WEB 数据互通</text>
    </view>

    <view v-for="item in list" :key="item.id" class="card" @tap="goDetail(item)">
      <view class="card-head">
        <text class="order-no">{{ item.orderNo }}</text>
        <StatusTag :text="item.status" />
      </view>
      <view class="row">
        <text class="label">{{ item.partyLabel }}</text>
        <text class="val">{{ item.partyName }}</text>
      </view>
      <view v-if="item.scope === 'sales'" class="row">
        <text class="label">销售信息</text>
        <text class="val">{{ item.salesInfo }}</text>
      </view>
      <view v-else-if="item.amountText && item.amountText !== '—'" class="row">
        <text class="label">金额</text>
        <text class="val accent">{{ item.amountText }}</text>
      </view>
      <view class="row">
        <text class="label">{{ item.ownerLabel }}</text>
        <text class="val">{{ item.ownerName }}</text>
      </view>
      <view class="row">
        <text class="label">单据日期</text>
        <text class="val">{{ item.documentDate || '—' }}</text>
      </view>
      <view class="row">
        <text class="label">创建信息</text>
        <text class="val">{{ item.createInfo }}</text>
      </view>
      <view v-if="item.remark" class="row">
        <text class="label">备注</text>
        <text class="val">{{ item.remark }}</text>
      </view>

      <view v-if="item.canApprove" class="card-actions" @tap.stop>
        <button class="btn-reject" size="mini" @tap.stop="onReject(item)">拒绝</button>
        <button class="btn-pass" size="mini" @tap.stop="onPass(item)">审核通过</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import {
  getApprovalList,
  getApprovalScopeMeta,
  ensureApprovalDemoSeed,
  decideApproval,
} from '@/mock/approval'

const keyword = ref('')
const scope = ref('sales')
const statusFilter = ref('待审核')
const allList = ref([])

const currentMeta = computed(() => getApprovalScopeMeta(scope.value))

const scopedAll = computed(() => allList.value.filter((r) => r.scope === scope.value))

const statusTabs = computed(() => {
  const all = scopedAll.value
  return [
    { label: '待审核', value: '待审核', count: all.filter((r) => r.status === '待审核').length },
    { label: '全部', value: '', count: all.length },
  ]
})

const list = computed(() =>
  getApprovalList({
    scope: scope.value,
    status: statusFilter.value || undefined,
    keyword: keyword.value.trim(),
  }),
)

const searchPlaceholder = computed(() => {
  if (scope.value === 'sales') return '搜索单号 / 客户 / 业务员'
  if (scope.value === 'outsourcing') return '搜索单号 / 供应商 / 外协员'
  return '搜索单号 / 供应商 / 采购员'
})

function syncNavTitle() {
  uni.setNavigationBarTitle({ title: currentMeta.value?.title || '审批管理' })
}

function loadList() {
  ensureApprovalDemoSeed()
  allList.value = getApprovalList({ scope: scope.value })
}

function goHub() {
  const pages = getCurrentPages()
  for (let i = pages.length - 2; i >= 0; i--) {
    if (pages[i].route?.includes('approval/index')) {
      uni.navigateBack({ delta: pages.length - 1 - i })
      return
    }
  }
  uni.redirectTo({ url: '/pages/approval/index' })
}

function goDetail(item) {
  if (item.scope !== 'sales') {
    uni.showToast({ title: '暂仅支持销售订单详情', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/approval/sales-detail?id=${encodeURIComponent(item.id)}`,
  })
}

function confirmDecide(item, action) {
  const title = action === 'pass' ? '审核通过' : '拒绝'
  const kind =
    item.scope === 'sales' ? '销售订单' : item.scope === 'outsourcing' ? '外协订单' : '采购订单'
  uni.showModal({
    title,
    content:
      action === 'pass'
        ? `确认通过${kind}「${item.orderNo}」？`
        : `确认拒绝${kind}「${item.orderNo}」？`,
    success: (res) => {
      if (!res.confirm) return
      const result = decideApproval(item.scope, item.id, action)
      uni.showToast({ title: result.message, icon: result.ok ? 'success' : 'none' })
      if (result.ok) loadList()
    },
  })
}

function onPass(item) {
  confirmDecide(item, 'pass')
}

function onReject(item) {
  confirmDecide(item, 'reject')
}

onLoad((query) => {
  if (query?.scope) scope.value = String(query.scope)
  syncNavTitle()
  loadList()
})

onShow(() => {
  syncNavTitle()
  loadList()
})

watch(scope, () => {
  statusFilter.value = '待审核'
  syncNavTitle()
  loadList()
})

onPullDownRefresh(() => {
  loadList()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.approval-list-page {
  min-height: 100vh;
  padding: 16rpx 24rpx 48rpx;
  background: #f5f6f8;
  box-sizing: border-box;
}

.top-bar {
  margin-bottom: 12rpx;
}

.hub-link {
  display: inline-flex;
  padding: 8rpx 0;
  font-size: 26rpx;
  color: #722ed1;
  font-weight: 600;
}

.search-bar {
  margin-bottom: 16rpx;
}

.search-input {
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: #fff;
  font-size: 28rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.06);
}

.tabs {
  white-space: nowrap;
  margin-bottom: 16rpx;
}

.tab {
  display: inline-flex;
  align-items: center;
  margin-right: 16rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: rgba(0, 0, 0, 0.55);
  background: #fff;
}

.tab.active {
  color: #fff;
  background: #722ed1;
  font-weight: 600;
}

.tab-count {
  margin-left: 4rpx;
  font-size: 22rpx;
}

.empty {
  margin-top: 80rpx;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 12rpx;
}

.empty-tip {
  display: block;
  font-size: 24rpx;
  color: rgba(0, 0, 0, 0.4);
  line-height: 1.5;
  padding: 0 40rpx;
}

.card {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 6rpx 20rpx rgba(15, 35, 80, 0.05);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  gap: 16rpx;
}

.order-no {
  font-size: 30rpx;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  word-break: break-all;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 6rpx 0;
  font-size: 26rpx;
}

.label {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
}

.val {
  text-align: right;
  color: rgba(0, 0, 0, 0.75);
  word-break: break-all;
}

.val.accent {
  color: #cf1322;
  font-weight: 600;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.06);
}

.btn-pass,
.btn-reject {
  margin: 0;
  padding: 0 28rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
}

.btn-pass {
  color: #fff;
  background: #52c41a;
  border: none;
}

.btn-reject {
  color: #ff4d4f;
  background: #fff1f0;
  border: 1rpx solid #ffa39e;
}

.btn-pass::after,
.btn-reject::after {
  border: none;
}
</style>
