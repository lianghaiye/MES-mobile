<template>
  <view class="detail-page">
    <view v-if="!detail" class="empty">
      <text>未找到该销售订单</text>
    </view>

    <template v-else>
      <view class="head-card">
        <view class="head-row">
          <text class="order-no">{{ detail.orderNo }}</text>
          <StatusTag :text="detail.status" />
        </view>
        <text class="sub">{{ detail.bizType || '销售订单' }}</text>
      </view>

      <view class="section">
        <text class="section-title">基本信息</text>
        <view class="row">
          <text class="label">客户</text>
          <text class="val">{{ detail.partyName }}</text>
        </view>
        <view class="row">
          <text class="label">销售信息</text>
          <text class="val">{{ detail.salesInfo }}</text>
        </view>
        <view class="row">
          <text class="label">业务员</text>
          <text class="val">{{ detail.ownerName }}</text>
        </view>
        <view class="row">
          <text class="label">单据日期</text>
          <text class="val">{{ detail.documentDate || '—' }}</text>
        </view>
        <view class="row">
          <text class="label">创建信息</text>
          <text class="val">{{ detail.createInfo }}</text>
        </view>
        <view v-if="detail.remark" class="row">
          <text class="label">备注</text>
          <text class="val">{{ detail.remark }}</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">销售明细</text>
        <view v-if="!lines.length" class="empty-lines">暂无销售明细</view>
        <view v-for="(line, idx) in lines" :key="line.id || idx" class="line-card">
          <view class="line-head">
            <text class="line-idx">{{ idx + 1 }}.</text>
            <text class="line-name">{{ line.productName || '—' }}</text>
          </view>
          <view class="line-meta">
            <text>编码 {{ line.productCode || '—' }}</text>
            <text>数量 {{ formatQty(line.salesQty ?? line.qty) }}{{ line.unit || '' }}</text>
          </view>
          <view class="line-meta">
            <text>金额 {{ formatMoney(line.totalPriceInTax) }}</text>
          </view>
        </view>
      </view>

      <view v-if="detail.canApprove" class="footer-bar">
        <button class="btn-reject" @tap="onReject">拒绝</button>
        <button class="btn-pass" @tap="onPass">审核通过</button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import { getApprovalOrderDetail, decideApproval } from '@/mock/approval'

const orderId = ref('')
const detail = ref(null)

const lines = computed(() => detail.value?.lineItems || detail.value?.raw?.lineItems || [])

function formatQty(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
}

function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `¥${n.toFixed(2)}`
}

function load() {
  if (!orderId.value) {
    detail.value = null
    return
  }
  detail.value = getApprovalOrderDetail('sales', orderId.value)
  if (detail.value?.orderNo) {
    uni.setNavigationBarTitle({ title: `销售订单 ${detail.value.orderNo}` })
  }
}

function confirmDecide(action) {
  if (!detail.value) return
  const title = action === 'pass' ? '审核通过' : '拒绝'
  uni.showModal({
    title,
    content:
      action === 'pass'
        ? `确认通过销售订单「${detail.value.orderNo}」？`
        : `确认拒绝销售订单「${detail.value.orderNo}」？`,
    success: (res) => {
      if (!res.confirm) return
      const result = decideApproval('sales', orderId.value, action)
      uni.showToast({ title: result.message, icon: result.ok ? 'success' : 'none' })
      if (result.ok) {
        load()
        setTimeout(() => {
          uni.navigateBack({ fail: () => {} })
        }, 500)
      }
    },
  })
}

function onPass() {
  confirmDecide('pass')
}

function onReject() {
  confirmDecide('reject')
}

onLoad((query) => {
  orderId.value = String(query?.id || '')
  load()
})

onShow(() => load())
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 160rpx;
  background: #f5f6f8;
  box-sizing: border-box;
}

.empty {
  margin-top: 120rpx;
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 28rpx;
}

.head-card,
.section {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 6rpx 20rpx rgba(15, 35, 80, 0.05);
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.order-no {
  font-size: 34rpx;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  word-break: break-all;
}

.sub {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(0, 0, 0, 0.45);
}

.section-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 10rpx 0;
  font-size: 26rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}

.row:last-child {
  border-bottom: none;
}

.label {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
}

.val {
  text-align: right;
  color: rgba(0, 0, 0, 0.78);
  word-break: break-all;
}

.empty-lines {
  font-size: 26rpx;
  color: rgba(0, 0, 0, 0.4);
  padding: 12rpx 0;
}

.line-card {
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}

.line-card:last-child {
  border-bottom: none;
}

.line-head {
  display: flex;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.line-idx {
  color: rgba(0, 0, 0, 0.45);
  font-size: 26rpx;
}

.line-name {
  font-size: 28rpx;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.line-meta {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: rgba(0, 0, 0, 0.55);
  padding: 2rpx 0;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.btn-pass,
.btn-reject {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  margin: 0;
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
