<template>
  <view v-if="item" class="page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">工时工资详情</text>
      <view class="nav-placeholder" />
    </view>

    <scroll-view scroll-y class="detail-scroll">
      <view class="card">
        <view class="card-head">
          <text class="task-no">{{ item.taskNo || '—' }}</text>
          <text class="status" :class="statusClass(item.taskStatus)">{{ item.taskStatus }}</text>
        </view>
        <view class="title-row">
          <text class="proc-name">{{ item.processName }}</text>
          <text class="mode">【{{ item.reportTypeLabel }}】</text>
        </view>
        <text class="product-name">{{ item.materialName }}</text>
      </view>

      <view class="card">
        <text class="section-title">任务信息</text>
        <view class="row">
          <text class="label">执行人</text>
          <text class="val">{{ item.executor || '—' }}</text>
        </view>
        <view class="row">
          <text class="label">操作人</text>
          <text class="val">{{ item.operator || '—' }}</text>
        </view>
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
          <text class="val">{{ item.reportTime || '—' }}</text>
        </view>
        <view class="row">
          <text class="label">推送时间</text>
          <text class="val">{{ item.pushedAt || '—' }}</text>
        </view>
      </view>

      <view class="card">
        <text class="section-title">报工数据</text>
        <view class="row">
          <text class="label">报工良品数</text>
          <text class="val blue">{{ item.goodQty ?? item.reportQty ?? 0 }}</text>
        </view>
        <view class="row">
          <text class="label">不良品数</text>
          <text class="val defect">{{ item.defectQty ?? 0 }}</text>
        </view>
        <view class="row">
          <text class="label">报工数量</text>
          <text class="val">{{ item.reportQty }}</text>
        </view>
        <view v-if="item.reportType === '时长报工'" class="row">
          <text class="label">报工时长</text>
          <text class="val">{{ item.workHours ?? item.reportDuration }}h</text>
        </view>
        <view v-if="isBatchHourly && item.reportAccountHours" class="row">
          <text class="label">核算工时</text>
          <text class="val">{{ item.reportAccountHours }}h</text>
        </view>
        <view v-else-if="!isBatchPiece && !isDurationHourly && item.accountHours" class="row">
          <text class="label">最终核算工时</text>
          <text class="val">{{ item.accountHours }}h</text>
        </view>
        <view v-if="hasAdjustedGoodQty(item)" class="row">
          <text class="label">调整良品数</text>
          <text class="val">{{ item.adjustedGoodQty }}</text>
        </view>
        <view v-if="hasAdjustedDefectQty(item)" class="row">
          <text class="label">调整不良品数</text>
          <text class="val">{{ item.adjustedDefectQty }}</text>
        </view>
        <view v-if="hasAdjustedWorkHours(item)" class="row">
          <text class="label">调整时长</text>
          <text class="val">{{ item.adjustedWorkHours }}h</text>
        </view>
        <view v-if="item.adjustReason" class="row">
          <text class="label">调整原因</text>
          <text class="val reason">{{ item.adjustReason }}</text>
        </view>
        <view v-if="item.remark" class="row">
          <text class="label">备注</text>
          <text class="val reason">{{ item.remark }}</text>
        </view>
      </view>

      <view class="card salary-card">
        <text class="section-title">工资核算</text>
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
        <view v-if="item.subsidyReason" class="row">
          <text class="label">补贴原因</text>
          <text class="val reason">{{ item.subsidyReason }}</text>
        </view>
        <view v-if="showMoney(item.qualityDeduction || item.manualQualityDeduction)" class="row">
          <text class="label">质量扣款</text>
          <text class="val deduct">{{ formatMoney(item.qualityDeduction || item.manualQualityDeduction) }}元</text>
        </view>
        <view v-if="(isBatchHourly || isDurationHourly) && item.finalAccountHours" class="row">
          <text class="label">最终核算工时</text>
          <text class="val">{{ item.finalAccountHours }}h</text>
        </view>
        <view v-if="item.finalPieceQty && !isDurationHourly" class="row">
          <text class="label">最终计件数</text>
          <text class="val">{{ item.finalPieceQty }}</text>
        </view>
        <view class="row salary-row">
          <text class="label">计薪</text>
          <text class="salary">{{ formatMoney(item.salaryAmount) }}元</text>
        </view>
      </view>
    </scroll-view>
  </view>

  <view v-else class="page empty-page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">工时工资详情</text>
      <view class="nav-placeholder" />
    </view>
    <text class="empty">记录不存在</text>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getLaborWageLineById, TASK_STATUS } from '@/mock/laborWageStore'

const item = ref(null)
const recordId = ref('')

const isBatchHourly = computed(
  () => item.value?.reportType === '批量计件' && item.value?.salaryMethod === '计时工资',
)

const isBatchPiece = computed(
  () => item.value?.reportType === '批量计件' && item.value?.salaryMethod === '计件工资',
)

const isDurationHourly = computed(
  () => item.value?.reportType === '时长报工' && item.value?.salaryMethod === '计时工资',
)

onLoad((query) => {
  recordId.value = query.id || ''
  loadItem()
})

onShow(() => loadItem())

function loadItem() {
  item.value = getLaborWageLineById(recordId.value)
}

function goBack() {
  uni.navigateBack()
}

function statusClass(status) {
  if (status === TASK_STATUS.AUDITED) return 'confirmed'
  return 'pending'
}

function formatMoney(n) {
  const v = Number(n) || 0
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function hasAdjustedGoodQty(row) {
  if (!row || row.adjustedGoodQty == null || row.adjustedGoodQty === '') return false
  return Number(row.adjustedGoodQty) !== Number(row.goodQty)
}

function hasAdjustedDefectQty(row) {
  if (!row || row.adjustedDefectQty == null || row.adjustedDefectQty === '') return false
  return Number(row.adjustedDefectQty) !== Number(row.defectQty)
}

function hasAdjustedWorkHours(row) {
  if (!row || row.adjustedWorkHours == null || row.adjustedWorkHours === '') return false
  return Number(row.adjustedWorkHours) !== Number(row.workHours ?? row.reportDuration)
}

function showMoney(v) {
  return Number(v) > 0
}

function showQty(v) {
  return Number(v) > 0
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
.nav-placeholder {
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

.detail-scroll {
  flex: 1;
  height: calc(100vh - env(safe-area-inset-top, 0px) - 100rpx);
  padding: 16rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
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

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.proc-name {
  font-size: 32rpx;
  font-weight: 600;
}

.mode {
  font-size: 22rpx;
  color: #8c8c8c;
}

.product-name {
  font-size: 26rpx;
  color: #8c8c8c;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  font-size: 26rpx;
}

.label {
  color: #8c8c8c;
  flex-shrink: 0;
}

.val {
  color: #262626;
  text-align: right;
  margin-left: 24rpx;

  &.blue {
    color: #1677ff;
    font-weight: 600;
  }

  &.defect {
    color: #ff4d4f;
  }

  &.deduct {
    color: #ff4d4f;
  }

  &.reason {
    max-width: 65%;
  }
}

.salary-card {
  background: #f6ffed;
  border: 1rpx solid #b7eb8f;
}

.salary-row .salary {
  color: #52c41a;
  font-weight: 700;
  font-size: 30rpx;
}

.empty-page .empty {
  display: block;
  text-align: center;
  padding: 120rpx 40rpx;
  color: #bfbfbf;
  font-size: 28rpx;
}
</style>
