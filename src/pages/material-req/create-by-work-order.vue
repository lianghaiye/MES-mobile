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
        <text class="field-label">领用车间</text>
        <input
          v-model="form.workshop"
          class="field-input"
          placeholder="请输入领用部门/车间"
          @blur="syncReceiveWarehouse"
        />
      </view>
      <view class="field-block">
        <view class="field-row wh-row">
          <text class="field-label">领入仓库</text>
          <WarehouseSelectField
            v-if="receiveWarehouseOptions.length"
            v-model="form.receiveWarehouse"
            :options="receiveWarehouseOptions"
            title="选择领入仓库"
            placeholder="请选择领入仓库"
          />
          <text v-else class="field-empty">未配置线边仓</text>
        </view>
        <text class="field-hint">物料从下方「领料仓库」出库后，领入至此线边暂存</text>
        <text v-if="receiveWarehouseOptions.length && !hasMatchedReceiveWarehouse" class="field-warning">
          当前车间未匹配到默认线边仓，请手动选择领入仓库
        </text>
        <text v-if="!receiveWarehouseOptions.length" class="field-warning">
          系统暂未配置线边仓，请在 WEB「仓库管理」中维护
        </text>
      </view>
      <view class="field-row">
        <text class="field-label">备注</text>
        <input v-model="form.remark" class="field-input" placeholder="选填" />
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">领料明细</text>
      <text class="add-btn" @tap="pickerOpen = true">+ 添加物料</text>
    </view>

    <MaterialLineEditor
      v-for="(line, index) in lines"
      :key="line.id"
      :line="line"
      :show-warehouse="true"
      @update:line="updateLine(index, $event)"
      @remove="removeLine(index)"
    />
    <view v-if="!lines.length" class="empty">
      {{ workOrder?.skipEbom ? '该工单无 EBOM，请手工添加物料' : '未解析到 EBOM 物料，请手工添加' }}
    </view>

    <view class="footer-bar">
      <view class="summary">
        <text>共 {{ lines.length }} 项</text>
        <text>合计 {{ totalQty }} 件</text>
      </view>
      <button class="submit-btn" :loading="submitting" @tap="onSubmit">提交领料申请</button>
    </view>

    <MaterialPicker v-if="pickerOpen" @select="onPickMaterial" @close="pickerOpen = false" />
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import MaterialLineEditor from '@/components/material-req/MaterialLineEditor.vue'
import MaterialPicker from '@/components/material-req/MaterialPicker.vue'
import WarehouseSelectField from '@/components/common/WarehouseSelectField.vue'
import { getWorkOrderById } from '@/mock/workOrderBridge'
import {
  createManualMaterialLine,
  resolveWorkOrderMaterialLines,
} from '@/utils/workOrderEbomMaterials'
import {
  getReceiveWarehouseOptions,
  hasMatchedReceiveWarehouseForWorkCenter,
  resolveDefaultReceiveWarehouse,
} from '@/utils/warehouseBridge'
import { submitMaterialRequisition } from '@/store/materialRequisitionStore'

const workOrder = ref(null)
const lines = ref([])
const pickerOpen = ref(false)
const submitting = ref(false)

const form = reactive({
  workshop: '',
  receiveWarehouse: '',
  remark: '',
})

const receiveWarehouseOptions = computed(() => getReceiveWarehouseOptions())

const hasMatchedReceiveWarehouse = computed(() =>
  hasMatchedReceiveWarehouseForWorkCenter(form.workshop),
)

function syncReceiveWarehouse() {
  form.receiveWarehouse = resolveDefaultReceiveWarehouse(form.workshop, form.receiveWarehouse)
}

const totalQty = computed(() =>
  lines.value.reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0),
)

onLoad((query) => {
  const wo = getWorkOrderById(query.workOrderId)
  if (!wo) {
    uni.showToast({ title: '工单不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  workOrder.value = wo
  form.workshop = wo.workCenter || '默认工厂'
  form.receiveWarehouse = resolveDefaultReceiveWarehouse(form.workshop)
  lines.value = resolveWorkOrderMaterialLines(wo)
})

function updateLine(index, next) {
  lines.value[index] = next
}

function removeLine(index) {
  lines.value.splice(index, 1)
}

function onPickMaterial(item) {
  const exists = lines.value.find((l) => l.itemCode === item.code)
  if (exists) {
    exists.shipQty = Number(exists.shipQty || 0) + 1
    exists.lineSource = '手工添加'
  } else {
    lines.value.push(createManualMaterialLine(item, 1))
  }
  pickerOpen.value = false
}

function onSubmit() {
  if (!workOrder.value || submitting.value) return
  if (!form.receiveWarehouse) {
    uni.showToast({ title: '请选择领入仓库', icon: 'none' })
    return
  }
  submitting.value = true
  const wo = workOrder.value
  const result = submitMaterialRequisition({
    mode: 'work-order',
    workOrderId: wo.id,
    workOrderCode: wo.code,
    workOrderName: wo.name,
    productName: wo.productName,
    orderCategory: wo.orderCategory,
    workshop: form.workshop,
    receiveWarehouse: form.receiveWarehouse,
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
    uni.redirectTo({ url: '/pages/material-req/index' })
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

.field-block {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.field-block .field-row {
  padding: 0;
  border-bottom: none;
}

.field-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8c8c8c;
  line-height: 1.5;
}

.field-warning {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #fa8c16;
  line-height: 1.5;
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

.field-row.wh-row {
  align-items: flex-start;
}

.field-row.wh-row .field-label {
  padding-top: 4rpx;
}

.field-empty {
  flex: 1;
  font-size: 28rpx;
  color: #fa8c16;
}

.field-row.wh-row :deep(.wh-field) {
  flex: 1;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8rpx 0 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
}

.add-btn {
  color: $primary;
  font-size: 28rpx;
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
