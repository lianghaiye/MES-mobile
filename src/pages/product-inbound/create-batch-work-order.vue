<template>
  <view class="create-page">
    <view v-if="workOrders.length" class="card summary-card">
      <view class="summary-row">
        <text class="label">已选工单</text>
        <text class="val primary">{{ workOrders.length }} 个</text>
      </view>
      <view class="summary-row">
        <text class="label">销售订单</text>
        <text class="val">{{ salesOrderLabel }}</text>
      </view>
      <view class="summary-toggle" @tap="woListExpanded = !woListExpanded">
        <text>工单清单</text>
        <text class="toggle-text">{{ woListExpanded ? '收起' : '展开' }}</text>
      </view>
      <view v-if="woListExpanded" class="wo-list">
        <view v-for="wo in workOrders" :key="wo.id" class="wo-item">
          <text class="wo-code">{{ wo.code }}</text>
          <text class="wo-product">{{ wo.productName }} · {{ wo.scheduleQty }} 件</text>
        </view>
      </view>
    </view>

    <view v-if="emptyWorkOrderCodes.length" class="warn-card">
      <text>{{ emptyWorkOrderCodes.length }} 个工单无产品信息：{{ emptyWorkOrderCodes.join('、') }}</text>
    </view>

    <view v-if="warnings.length" class="warn-card">
      <text v-for="(msg, index) in warnings" :key="index">{{ msg }}</text>
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
      <text class="section-title">合并入库产品</text>
    </view>

    <BatchProductInboundEditor
      v-for="(line, index) in lines"
      :key="line.id"
      :line="line"
      :work-center="form.workshop"
      @update:line="updateLine(index, $event)"
    />
    <view v-if="!lines.length" class="empty">未解析到产品，请返回重新选择工单</view>

    <view class="footer-bar">
      <view class="summary">
        <text>共 {{ lines.length }} 项</text>
        <text>合计 {{ totalQty }} 件</text>
      </view>
      <button class="submit-btn" :loading="submitting" @tap="onSubmit">提交批量入库</button>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import BatchProductInboundEditor from '@/components/product-inbound/BatchProductInboundEditor.vue'
import { getCompletedWorkOrdersByIds } from '@/mock/workOrderBridge'
import { resolveBatchWorkOrderProductLines } from '@/utils/productInboundHelpers'
import { submitProductInbound } from '@/store/productInboundStore'

const workOrders = ref([])
const lines = ref([])
const emptyWorkOrderCodes = ref([])
const submitting = ref(false)
const woListExpanded = ref(false)

const form = reactive({
  workshop: '',
  remark: '',
})

const totalQty = computed(() =>
  lines.value.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
)

const salesOrderLabel = computed(() => {
  const set = new Set(workOrders.value.map((wo) => wo.salesOrderNo).filter(Boolean))
  if (!set.size) return '—'
  if (set.size === 1) return [...set][0]
  return '多订单'
})

const resolvedSalesOrderNo = computed(() => {
  const set = new Set(workOrders.value.map((wo) => wo.salesOrderNo).filter(Boolean))
  if (set.size === 1) return [...set][0]
  if (set.size > 1) return 'MULTI'
  return ''
})

const warnings = computed(() => {
  const msgs = []
  const centers = new Set(workOrders.value.map((wo) => wo.workCenter).filter(Boolean))
  if (centers.size > 1) {
    msgs.push('涉及多个车间，请确认来源车间')
  }
  const orders = new Set(workOrders.value.map((wo) => wo.salesOrderNo).filter(Boolean))
  if (orders.size > 1) {
    msgs.push('涉及多个销售订单')
  }
  return msgs
})

function resolveMajorityWorkCenter(orders) {
  const counts = {}
  for (const wo of orders) {
    const wc = wo.workCenter || '默认工厂'
    counts[wc] = (counts[wc] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '默认工厂'
}

function loadBatchLines(orders) {
  const result = resolveBatchWorkOrderProductLines(orders)
  lines.value = result.lines
  emptyWorkOrderCodes.value = result.emptyWorkOrders.map((wo) => wo.code)
}

onLoad((query) => {
  const ids = String(query.workOrderIds || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  if (!ids.length) {
    uni.showToast({ title: '请先选择工单', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  const orders = getCompletedWorkOrdersByIds(ids)
  if (!orders.length) {
    uni.showToast({ title: '工单不存在或未完成', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  workOrders.value = orders
  form.workshop = resolveMajorityWorkCenter(orders)
  loadBatchLines(orders)
})

function updateLine(index, next) {
  lines.value[index] = next
}

function onSubmit() {
  if (!workOrders.value.length || submitting.value) return
  submitting.value = true
  const result = submitProductInbound({
    mode: 'batch-work-order',
    workOrderIds: workOrders.value.map((wo) => wo.id),
    workOrders: workOrders.value.map((wo) => ({
      id: wo.id,
      code: wo.code,
      productName: wo.productName,
      scheduleQty: wo.scheduleQty,
      salesOrderNo: wo.salesOrderNo,
    })),
    salesOrderNo: resolvedSalesOrderNo.value,
    productName:
      workOrders.value.length === 1
        ? workOrders.value[0].productName
        : `${workOrders.value.length} 个工单合并入库`,
    workshop: form.workshop,
    remark: form.remark,
    lines: lines.value,
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
$primary: #52c41a;

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

.summary-card {
  padding: 16rpx 24rpx;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  font-size: 28rpx;
}

.label {
  color: #8c8c8c;
}

.val.primary {
  color: $primary;
  font-weight: 600;
}

.summary-toggle {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: $primary;
  border-top: 1rpx solid #f0f0f0;
}

.toggle-text {
  color: #8c8c8c;
}

.wo-list {
  padding-bottom: 8rpx;
}

.wo-item {
  padding: 10rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.wo-item:last-child {
  border-bottom: none;
}

.wo-code {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
}

.wo-product {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-top: 4rpx;
}

.warn-card {
  background: #fff7e6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #d46b08;
  line-height: 1.5;
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

.empty {
  text-align: center;
  color: #8c8c8c;
  padding: 60rpx 0;
  font-size: 26rpx;
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
  background: $primary;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
