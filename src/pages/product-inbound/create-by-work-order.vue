<template>
  <view class="create-page">
    <view v-if="workOrder" class="card wo-card">
      <view class="wo-row">
        <text class="label">工单号</text>
        <text class="val primary">{{ workOrder.code }}</text>
      </view>
      <view class="wo-row">
        <text class="label">产品</text>
        <text class="val">{{ workOrder.productName }}</text>
      </view>
      <view class="wo-row">
        <text class="label">计划数量</text>
        <text class="val">{{ workOrder.scheduleQty }} 件</text>
      </view>
      <view class="wo-row">
        <text class="label">车间</text>
        <text class="val">{{ workOrder.workCenter }}</text>
      </view>
    </view>

    <view class="card">
      <view class="field-row">
        <text class="field-label">来源车间</text>
        <input v-model="form.workshop" class="field-input" placeholder="请输入车间" />
      </view>
      <view class="field-row">
        <text class="field-label">备注</text>
        <input v-model="form.remark" class="field-input" placeholder="选填" />
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">入库产品</text>
    </view>

    <ProductInboundEditor
      v-if="line"
      :line="line"
      :work-center="form.workshop"
      @update:line="line = $event"
    />

    <view class="footer-bar">
      <view class="summary">
        <text>入库数量 {{ line?.qty || 0 }} 件</text>
        <text>仓库 {{ line?.warehouse || '—' }}</text>
      </view>
      <button class="submit-btn" :loading="submitting" @tap="onSubmit">提交入库申请</button>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ProductInboundEditor from '@/components/product-inbound/ProductInboundEditor.vue'
import { getWorkOrderById, isCompletedWorkOrder } from '@/mock/workOrderBridge'
import { resolveWorkOrderProductLine } from '@/utils/productInboundHelpers'
import { submitProductInbound } from '@/store/productInboundStore'

const workOrder = ref(null)
const line = ref(null)
const submitting = ref(false)

const form = reactive({
  workshop: '',
  remark: '',
})

onLoad((query) => {
  const wo = getWorkOrderById(query.workOrderId)
  if (!wo || !isCompletedWorkOrder(wo)) {
    uni.showToast({ title: '工单不存在或未完成', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  workOrder.value = wo
  form.workshop = wo.workCenter || '默认工厂'
  line.value = resolveWorkOrderProductLine(wo)
})

function onSubmit() {
  if (!workOrder.value || !line.value || submitting.value) return
  submitting.value = true
  const wo = workOrder.value
  const result = submitProductInbound({
    mode: 'work-order',
    workOrderId: wo.id,
    workOrderCode: wo.code,
    workOrderName: wo.name,
    productName: wo.productName,
    productCode: wo.productCode,
    orderCategory: wo.orderCategory,
    workshop: form.workshop,
    remark: form.remark,
    lines: [line.value],
  })
  submitting.value = false
  if (!result.ok) {
    uni.showToast({ title: result.message || '提交失败', icon: 'none' })
    return
  }
  uni.showToast({ title: '提交成功', icon: 'success' })
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/product-inbound/index' })
  }, 500)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.create-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx 24rpx 180rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  margin-bottom: 20rpx;
}

.wo-card {
  padding: 16rpx 24rpx;
}

.wo-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  font-size: 28rpx;
}

.label {
  color: #8c8c8c;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.field-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.field-row:last-child {
  border-bottom: none;
}

.field-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #595959;
}

.field-input {
  flex: 1;
  font-size: 28rpx;
}

.section-head {
  margin: 8rpx 0 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
}

.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.summary {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.submit-btn {
  background: #52c41a;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
