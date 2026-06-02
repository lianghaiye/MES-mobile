<template>
  <view v-if="record" class="detail-page">
    <view class="card">
      <view class="head">
        <text class="title">{{ record.qcNo || record.id }}</text>
        <StatusTag :text="record.qcStatus" />
      </view>
      <view class="row"><text class="l">销售单号</text><text class="v">{{ record.salesOrderNo }}</text></view>
      <view class="row"><text class="l">客户名称</text><text class="v">{{ record.customerName }}</text></view>
      <view class="row"><text class="l">出库单号</text><text class="v">{{ record.outboundDocNo || '-' }}</text></view>
      <view class="row"><text class="l">来源</text><text class="v">{{ record.source }}</text></view>
      <view v-if="record.qcResult" class="row">
        <text class="l">质检结果</text>
        <StatusTag :text="record.qcResult" />
      </view>
      <view v-if="record.inspector" class="row">
        <text class="l">质检人</text><text class="v">{{ record.inspector }}</text>
      </view>
    </view>

    <view class="section-title">质检明细</view>
    <view v-for="(line, i) in record.lineItems" :key="line.id" class="line-card">
      <text class="line-title">{{ i + 1 }}. {{ line.itemName }}</text>
      <view class="row"><text class="l">物料编码</text><text class="v">{{ line.itemCode }}</text></view>
      <view class="row"><text class="l">发货数量</text><text class="v">{{ line.shipQty }} {{ line.unit || '' }}</text></view>
      <view v-if="line.lineQcResult" class="row">
        <text class="l">行结果</text>
        <StatusTag :text="line.lineQcResult" />
      </view>
    </view>

    <button v-if="record.qcStatus === '待质检'" class="btn-primary" @tap="goInspect">执行质检</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import { getQcById } from '@/mock/factoryQc'

const record = ref(null)

onLoad((query) => {
  record.value = getQcById(query.id)
  if (!record.value) {
    uni.showToast({ title: '任务不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function goInspect() {
  uni.navigateTo({ url: `/pages/qc-task/inspect?id=${record.value.id}` })
}
</script>

<style lang="scss" scoped>
.detail-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.card,
.line-card {
  background: $bg-card;
  border-radius: $radius;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
}

.row {
  display: flex;
  margin-top: 12rpx;
  font-size: 26rpx;
}

.l {
  width: 160rpx;
  color: $text-secondary;
}

.v {
  flex: 1;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin: 8rpx 0 16rpx;
}

.line-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.btn-primary {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 48rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: $primary;
  color: #fff;
  border-radius: 12rpx;
  border: none;
}
</style>
