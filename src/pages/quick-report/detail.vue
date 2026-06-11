<template>
  <view v-if="record" class="detail-page">
    <view class="card">
      <view class="head-row">
        <text class="title">{{ record.productName }} · {{ record.productCode }}</text>
      </view>
      <view v-if="record.workOrderNo" class="info-row">
        <text class="label">工单编号</text>
        <text class="val primary">{{ record.workOrderNo }}</text>
      </view>
      <view class="info-row">
        <text class="label">登记日期</text>
        <text class="val">{{ record.reportDate }}</text>
      </view>
      <view v-if="record.routeName" class="info-row">
        <text class="label">工艺路线</text>
        <text class="val">{{ record.routeName }}</text>
      </view>
      <view class="info-row">
        <text class="label">良品数</text>
        <text class="val primary">{{ record.goodQty ?? record.finishedQty }} 件</text>
      </view>
      <view class="info-row">
        <text class="label">不良品数</text>
        <text class="val defect">{{ record.defectQty || 0 }} 件</text>
      </view>
      <view class="info-row">
        <text class="label">合计完工</text>
        <text class="val">{{ record.finishedQty }} 件</text>
      </view>
      <view class="info-row">
        <text class="label">工序数</text>
        <text class="val">{{ record.processCount }}</text>
      </view>
      <view class="info-row">
        <text class="label">操作人员</text>
        <text class="val">{{ record.operators.join('、') }}</text>
      </view>
      <view class="info-row">
        <text class="label">登记人</text>
        <text class="val">{{ record.reporter }}</text>
      </view>
      <view v-if="record.remark" class="info-row">
        <text class="label">备注</text>
        <text class="val">{{ record.remark }}</text>
      </view>
    </view>

    <view class="card">
      <text class="section-title">工序明细</text>
      <view v-for="(p, i) in record.processes" :key="i" class="process-item">
        <view class="p-main">
          <text class="p-name">{{ p.name }}</text>
          <text class="p-qty">良 {{ p.goodQty ?? p.qty }} / 不良 {{ p.defectQty || 0 }}</text>
        </view>
        <text v-if="p.defectItemNames?.length" class="p-defect">
          不良原因：{{ p.defectItemNames.join('、') }}
        </text>
      </view>
    </view>

    <view class="foot-actions">
      <button class="btn outline" @tap="goBack">返回</button>
      <button class="btn primary" @tap="goEdit">编辑</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getQuickReportById } from '@/mock/quickReport'

const record = ref(null)
const recordId = ref('')

onLoad((query) => {
  recordId.value = query.id
  loadRecord()
})

onShow(() => loadRecord())

function loadRecord() {
  record.value = getQuickReportById(recordId.value)
  if (!record.value) {
    uni.showToast({ title: '记录不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
}

function goEdit() {
  uni.navigateTo({ url: `/pages/quick-report/form?id=${recordId.value}` })
}

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
  padding-bottom: 120rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
}

.info-row {
  display: flex;
  padding: 14rpx 0;
  font-size: 26rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.label {
  width: 160rpx;
  color: #999;
  flex-shrink: 0;
}

.val {
  flex: 1;
  color: #333;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.val.defect {
  color: #ff4d4f;
  font-weight: 600;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.process-item {
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}

.p-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.p-qty {
  color: $primary;
  font-weight: 600;
}

.p-defect {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.foot-actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 48rpx;
  display: flex;
  gap: 20rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  border: none;
  margin: 0;
}

.btn.outline {
  background: #fff;
  color: $primary;
  border: 2rpx solid $primary;
}

.btn.primary {
  background: $primary;
  color: #fff;
}
</style>
