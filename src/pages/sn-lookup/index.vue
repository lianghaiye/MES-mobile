<template>
  <view class="sn-page">
    <view class="hero">
      <text class="hero-title">扫码查单</text>
      <text class="hero-desc">扫描或输入铭牌工业 SN，查询对应销售订单</text>
    </view>

    <button class="btn-scan" type="primary" @tap="onScan">打开摄像头扫码</button>

    <view class="manual">
      <input
        v-model="snInput"
        class="sn-input"
        placeholder="输入完整工业 SN"
        confirm-type="search"
        @confirm="onQuery"
      />
      <button class="btn-query" type="primary" :loading="querying" @tap="onQuery">查询</button>
    </view>

    <view v-if="errorMsg" class="error-box">{{ errorMsg }}</view>

    <view v-if="card" class="result-card">
      <view class="result-head">
        <text class="result-title">查单结果</text>
        <text class="tag" :class="card.mountStatus === '已装牌' ? 'ok' : 'pending'">
          {{ card.mountStatus }}
        </text>
      </view>
      <view class="row">
        <text class="l">SN 码</text>
        <text class="v mono">{{ card.labelCode }}</text>
      </view>
      <view class="row">
        <text class="l">标识状态</text>
        <text class="v">{{ card.status || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">销售单号</text>
        <text class="v accent">{{ card.salesOrderNo || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">客户</text>
        <text class="v">{{ card.customerName || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">产品名称</text>
        <text class="v">{{ card.productName || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">产品编码</text>
        <text class="v">{{ card.productCode || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">规格型号</text>
        <text class="v">{{ card.specModel || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">材质</text>
        <text class="v">{{ card.material || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">申请单号</text>
        <text class="v">{{ card.requestOrderNo || '—' }}</text>
      </view>
      <view class="row">
        <text class="l">注册时间</text>
        <text class="v">{{ card.regTime || '—' }}</text>
      </view>

      <button class="btn-link" @tap="goLabelDetail">查看标识详情</button>
      <button class="btn-ghost" @tap="resetAll">再扫一单</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { lookupSalesOrderBySn } from '@/utils/industrialLabelBridge'

const snInput = ref('')
const querying = ref(false)
const errorMsg = ref('')
const card = ref(null)

function applyResult(res) {
  if (!res.ok) {
    card.value = null
    errorMsg.value = res.message || '查询失败'
    return
  }
  errorMsg.value = ''
  card.value = res.card
}

function onQuery() {
  const code = String(snInput.value || '').trim()
  if (!code) {
    errorMsg.value = '请输入 SN 码'
    card.value = null
    return
  }
  querying.value = true
  try {
    applyResult(lookupSalesOrderBySn(code))
  } finally {
    querying.value = false
  }
}

function onScan() {
  uni.scanCode({
    onlyFromCamera: false,
    scanType: ['barCode', 'qrCode'],
    success: (res) => {
      const code = String(res?.result || '').trim()
      if (!code) {
        uni.showToast({ title: '未识别到有效内容', icon: 'none' })
        return
      }
      snInput.value = code
      applyResult(lookupSalesOrderBySn(code))
    },
    fail: (err) => {
      const msg = err?.errMsg || ''
      if (/cancel/i.test(msg)) return
      uni.showToast({ title: '扫码失败，请改用手输', icon: 'none' })
    },
  })
}

function goLabelDetail() {
  if (!card.value?.labelCode) return
  uni.navigateTo({
    url: `/pages/industrial-label/detail?code=${encodeURIComponent(card.value.labelCode)}`,
  })
}

function resetAll() {
  snInput.value = ''
  errorMsg.value = ''
  card.value = null
}

onLoad((query) => {
  const sn = String(query?.sn || '').trim()
  if (!sn) return
  snInput.value = sn
  applyResult(lookupSalesOrderBySn(sn))
})
</script>

<style lang="scss" scoped>
.sn-page {
  min-height: 100vh;
  padding: 32rpx 28rpx 64rpx;
  background: #f5f6f8;
  box-sizing: border-box;
}

.hero {
  margin-bottom: 28rpx;
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #262626;
  margin-bottom: 8rpx;
}

.hero-desc {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  line-height: 1.5;
}

.btn-scan {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #1677ff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
  margin-bottom: 24rpx;
  border: none;
}

.btn-scan::after {
  border: none;
}

.manual {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.sn-input {
  height: 88rpx;
  padding: 0 28rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e8e8e8;
  font-size: 28rpx;
}

.btn-query {
  height: 88rpx;
  line-height: 88rpx;
  background: #1677ff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
}

.btn-query::after {
  border: none;
}

.error-box {
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  background: #fff2f0;
  border: 1rpx solid #ffccc7;
  border-radius: 12rpx;
  color: #cf1322;
  font-size: 26rpx;
}

.result-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.result-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.result-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #262626;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.tag.ok {
  background: #f6ffed;
  color: #52c41a;
}

.tag.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 16rpx 0;
  border-top: 1rpx solid #f5f5f5;
  font-size: 26rpx;
}

.l {
  flex-shrink: 0;
  color: #8c8c8c;
  width: 160rpx;
}

.v {
  flex: 1;
  text-align: right;
  color: #262626;
  word-break: break-all;
}

.v.mono {
  font-family: Menlo, Consolas, monospace;
}

.v.accent {
  color: #1677ff;
  font-weight: 600;
}

.btn-link,
.btn-ghost {
  margin-top: 20rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.btn-link {
  background: #e6f4ff;
  color: #1677ff;
  border: none;
}

.btn-ghost {
  background: #fff;
  color: #595959;
  border: 1rpx solid #d9d9d9;
}

.btn-link::after,
.btn-ghost::after {
  border: none;
}
</style>
