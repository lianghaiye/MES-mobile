<template>
  <view v-if="record" class="detail-page">
    <view class="card">
      <view class="head-row">
        <text class="title">{{ record.processName }} · {{ record.productName }}</text>
        <text class="status" :class="statusClass">{{ record.status }}</text>
      </view>
      <view v-if="record.workOrderNo" class="row">
        <text class="label">工单号</text>
        <text class="val">{{ record.workOrderNo }}</text>
      </view>
      <view class="row">
        <text class="label">报工时间</text>
        <text class="val">{{ record.timeLabel }}</text>
      </view>
      <view class="row">
        <text class="label">报工类型</text>
        <text class="val">{{ displayReportMode(record.reportMode) }}</text>
      </view>
      <template v-if="!isDurationReportMode(record.reportMode)">
        <view class="row">
          <text class="label">良品数</text>
          <text class="val primary">{{ record.goodQty }} 件</text>
        </view>
        <view class="row">
          <text class="label">不良品数</text>
          <text class="val defect">{{ record.defectQty }} 件</text>
        </view>
        <view v-if="record.defectItemNames?.length" class="row">
          <text class="label">不良原因</text>
          <text class="val">{{ record.defectItemNames.join('、') }}</text>
        </view>
      </template>
      <template v-else>
        <view class="row">
          <text class="label">工作时长</text>
          <text class="val primary">{{ record.workHours }} 小时</text>
        </view>
        <view class="row">
          <text class="label">良品数</text>
          <text class="val primary">{{ record.goodQty }} 件</text>
        </view>
        <view class="row">
          <text class="label">不良品数</text>
          <text class="val defect">{{ record.defectQty }} 件</text>
        </view>
        <view v-if="record.defectItemNames?.length" class="row">
          <text class="label">不良原因</text>
          <text class="val">{{ record.defectItemNames.join('、') }}</text>
        </view>
        <view class="row">
          <text class="label">合计完工</text>
          <text class="val">{{ record.finishedQty }} 件</text>
        </view>
        <view class="row">
          <text class="label">起止时间</text>
          <text class="val">{{ record.startTime }} - {{ record.endTime }}</text>
        </view>
      </template>
      <view v-if="record.remark" class="row">
        <text class="label">备注</text>
        <text class="val">{{ record.remark }}</text>
      </view>
      <view v-if="record.status === '已拒绝'" class="reject-tip">
        退回原因：{{ record.rejectReason }}
      </view>
    </view>
    <view class="foot">
      <button class="btn" @tap="goBack">返回</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getRecordById } from '@/mock/processReportRecords'
import { isDurationReportMode, resolveReportMode } from '@/utils/reportMode'

function displayReportMode(mode) {
  return resolveReportMode(mode)
}

const record = ref(null)

const statusClass = computed(() => {
  const s = record.value?.status
  if (s === '待审核') return 'pending'
  if (s === '已审核') return 'approved'
  if (s === '已拒绝') return 'rejected'
  return ''
})

onLoad((query) => {
  record.value = getRecordById(query.id)
  if (!record.value) {
    uni.showToast({ title: '记录不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
}

.head-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
  flex: 1;
}

.status.pending { color: #fa8c16; }
.status.approved { color: #52c41a; }
.status.rejected { color: #ff4d4f; }

.row {
  display: flex;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 26rpx;
}

.label {
  width: 160rpx;
  color: #999;
}

.val.primary { color: $primary; font-weight: 600; }
.val.defect { color: #ff4d4f; font-weight: 600; }

.reject-tip {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #fff1f0;
  color: #ff4d4f;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.foot {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 48rpx;
}

.btn {
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: $primary;
  border: 2rpx solid $primary;
  border-radius: 44rpx;
}
</style>
