<template>
  <view class="detail-page">
    <view v-if="record" class="card">
      <view class="head-row">
        <text class="req-no">{{ record.reworkNo }}</text>
        <text class="status-tag">{{ record.status }}</text>
      </view>
      <view class="info-row">
        <text class="label">来源</text>
        <text class="val">{{ record.source || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">工单号</text>
        <text class="val primary">{{ record.workOrderNo || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">加工中心</text>
        <text class="val">{{ record.workCenter || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">产品</text>
        <text class="val">{{ record.productName || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">规格 / 图号</text>
        <text class="val">{{ record.specModel || '—' }} / {{ record.drawingNo || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">返工数量</text>
        <text class="val">{{ record.qty }}</text>
      </view>
      <view class="info-row">
        <text class="label">返工原因</text>
        <text class="val">{{ record.reason || '—' }}</text>
      </view>
      <view v-if="record.remark" class="info-row">
        <text class="label">备注</text>
        <text class="val">{{ record.remark }}</text>
      </view>
      <view class="info-row">
        <text class="label">创建人</text>
        <text class="val">{{ record.creator || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">创建时间</text>
        <text class="val">{{ record.createdAt || '—' }}</text>
      </view>
    </view>

    <view v-if="record" class="card">
      <text class="section-title">重做工序</text>
      <view v-for="line in record.processes || []" :key="line.processName" class="line-row">
        <view class="line-main">
          <text class="line-name">{{ line.processName }}</text>
          <text class="line-code">返工人 {{ line.reworkAssignee || '—' }}</text>
        </view>
        <text class="line-qty">{{ line.doneQty || 0 }}/{{ line.qty || 0 }}</text>
      </view>
    </view>

    <view class="footer-bar">
      <button v-if="canClose" class="danger-btn" @tap="onClose">关闭返工单</button>
      <button class="back-btn" @tap="goBack">返回列表</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  closeReworkOrder,
  getReworkOrderById,
  isReworkOrderOpen,
} from '@/store/reworkOrderStore'

const record = ref(null)

const canClose = computed(() => isReworkOrderOpen(record.value?.status))

onLoad((query) => {
  record.value = getReworkOrderById(query.id)
  if (!record.value) {
    uni.showToast({ title: '返工单不存在', icon: 'none' })
  }
})

function goBack() {
  uni.navigateBack({
    fail: () => uni.redirectTo({ url: '/pages/rework/index' }),
  })
}

function onClose() {
  uni.showModal({
    title: '关闭返工单',
    content: '关闭后将不再继续返工报工，确定关闭？',
    success: (res) => {
      if (!res.confirm || !record.value) return
      const result = closeReworkOrder(record.value.id)
      if (!result.ok) {
        uni.showToast({ title: result.message, icon: 'none' })
        return
      }
      record.value = result.order
      uni.showToast({ title: '已关闭', icon: 'success' })
    },
  })
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx 24rpx 160rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.req-no {
  font-size: 32rpx;
  font-weight: 600;
}

.status-tag {
  font-size: 24rpx;
  color: #fa8c16;
  background: #fff7e6;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 14rpx 0;
  font-size: 28rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: #8c8c8c;
  flex-shrink: 0;
}

.val {
  flex: 1;
  text-align: right;
  color: #262626;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.line-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.line-row:last-child {
  border-bottom: none;
}

.line-name {
  display: block;
  font-size: 28rpx;
}

.line-code {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.line-qty {
  font-size: 26rpx;
  color: #1677ff;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
}

.danger-btn,
.back-btn {
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.danger-btn {
  flex: 0 0 34%;
  height: 72rpx;
  font-size: 26rpx;
  background: #fff1f0;
  color: #ff4d4f;
}

.back-btn {
  flex: 1;
  margin-left: auto;
  height: 88rpx;
  font-size: 30rpx;
  font-weight: 600;
  background: $primary;
  color: #fff;
}
</style>
