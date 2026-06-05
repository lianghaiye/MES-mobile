<template>
  <view v-if="task" class="qc-page">
    <view class="summary-card">
      <view class="parallel-row">
        <text class="parallel-label">物品名称</text>
        <text class="parallel-val">{{ task.productName }} {{ task.specModel }}</text>
      </view>
      <view class="parallel-row">
        <text class="parallel-label">工单编号</text>
        <text class="parallel-val">{{ task.workOrderCode }}</text>
      </view>
      <view class="parallel-row">
        <text class="parallel-label">执行人</text>
        <text class="parallel-val">{{ disassemblyExecutor }}</text>
      </view>
      <view class="stats-row">
        <text>已拆 <text class="num">{{ stats.dismantled }}</text> 项</text>
        <text>回用 <text class="num green">{{ stats.reuse }}</text> 件</text>
        <text>报废 <text class="num orange">{{ stats.scrap }}</text> 件</text>
      </view>
    </view>

    <view v-if="!hasResult" class="empty-tip">暂无拆解结果，请先完成拆解工序</view>

    <view v-else class="list-section">
      <text class="list-title">拆解列表</text>
      <QcEbomNode
        v-for="node in ebomNodes"
        :key="node.id"
        :node="node"
        @change="onEbomChange"
      />
    </view>

    <view v-if="hasResult" class="warehouse-card">
      <text class="section-title">请选择仓库</text>
      <view class="field">
        <view class="parallel-row">
          <text class="parallel-label">回用仓库</text>
          <picker
            class="parallel-control"
            mode="selector"
            :range="warehouseOptions"
            :value="reuseWhIndex"
            @change="onReuseWhChange"
          >
            <view class="picker-field">
              <text :class="{ placeholder: !reuseWarehouse }">{{ reuseWarehouse || '数据来源：仓库' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <text v-if="needReuseWarehouse" class="hint required-hint field-hint">有回用物品时必填!</text>
      </view>
      <view class="field">
        <view class="parallel-row">
          <text class="parallel-label">报废仓库</text>
          <picker
            class="parallel-control"
            mode="selector"
            :range="warehouseOptions"
            :value="scrapWhIndex"
            @change="onScrapWhChange"
          >
            <view class="picker-field">
              <text :class="{ placeholder: !scrapWarehouse }">{{ scrapWarehouse || '数据来源：仓库' }}</text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <text v-if="needScrapWarehouse" class="hint required-hint field-hint">处理结果为"财务变现"时必填!</text>
      </view>
    </view>

    <view v-if="hasResult" class="footer-actions">
      <button class="action-btn outline" @tap="showReject = true">驳回返工</button>
      <button class="action-btn primary" @tap="onPassClick">质检通过</button>
    </view>

    <ConfirmModal
      v-model:visible="showReject"
      title="驳回返工"
      message="是否确认驳回返工？"
      @confirm="onRejectConfirm"
    />
    <ConfirmModal
      v-model:visible="showPass"
      title="质检通过"
      message="是否确认通过?"
      @confirm="onPassConfirm"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import QcEbomNode from '@/components/disassembly/QcEbomNode.vue'
import ConfirmModal from '@/components/disassembly/ConfirmModal.vue'
import { calcDisassemblyStats, flattenLeafNodes } from '@/mock/disassemblyEbom'
import {
  getQcExecutionState,
  passQcInspection,
  rejectQcInspection,
  validateQcWarehouse,
  warehouseOptions,
} from '@/mock/disassemblyTasks'

const task = ref(null)
const ebomNodes = ref([])
const disassemblyExecutor = ref('—')
const hasResult = ref(false)
const reuseWarehouse = ref('')
const scrapWarehouse = ref('')
const showReject = ref(false)
const showPass = ref(false)

const stats = computed(() => calcDisassemblyStats(ebomNodes.value))

const needReuseWarehouse = computed(() =>
  flattenLeafNodes(ebomNodes.value).some((n) => n.reuseQty > 0),
)

const needScrapWarehouse = computed(() =>
  flattenLeafNodes(ebomNodes.value).some(
    (n) => n.scrapQty > 0 && n.processResult === '财务变现',
  ),
)

const reuseWhIndex = computed(() => {
  const i = warehouseOptions.indexOf(reuseWarehouse.value)
  return i >= 0 ? i : 0
})

const scrapWhIndex = computed(() => {
  const i = warehouseOptions.indexOf(scrapWarehouse.value)
  return i >= 0 ? i : 0
})

onLoad((query) => {
  const state = getQcExecutionState(query.id)
  if (!state) {
    uni.showToast({ title: '任务不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  task.value = state.task
  ebomNodes.value = state.ebomNodes
  disassemblyExecutor.value = state.disassemblyExecutor
  hasResult.value = Boolean(state.result)
})

function onEbomChange() {
  ebomNodes.value = [...ebomNodes.value]
}

function onReuseWhChange(e) {
  reuseWarehouse.value = warehouseOptions[Number(e.detail.value)]
}

function onScrapWhChange(e) {
  scrapWarehouse.value = warehouseOptions[Number(e.detail.value)]
}

function validateWarehouse() {
  const res = validateQcWarehouse(
    ebomNodes.value,
    reuseWarehouse.value,
    scrapWarehouse.value,
  )
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return false
  }
  return true
}

function onPassClick() {
  if (!validateWarehouse()) return
  showPass.value = true
}

function onPassConfirm() {
  showPass.value = false
  const res = passQcInspection(task.value.id, {
    ebomNodes: ebomNodes.value,
    reuseWarehouse: reuseWarehouse.value,
    scrapWarehouse: scrapWarehouse.value,
  })
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  uni.showToast({ title: res.message, icon: 'success' })
  setTimeout(backToTodoList, 1200)
}

function onRejectConfirm() {
  showReject.value = false
  const res = rejectQcInspection(task.value.id)
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  uni.showToast({ title: res.message, icon: 'success' })
  setTimeout(backToTodoList, 1200)
}

function backToTodoList() {
  const pages = getCurrentPages()
  for (let i = pages.length - 2; i >= 0; i--) {
    if (pages[i].route?.includes('todo/index')) {
      uni.navigateBack({ delta: pages.length - 1 - i })
      return
    }
  }
  uni.redirectTo({ url: '/pages/todo/index' })
}
</script>

<style lang="scss" scoped>
$green: #07c160;

.qc-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 160rpx;
}

.summary-card,
.warehouse-card {
  margin: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.field {
  margin-bottom: 20rpx;
}

.parallel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.parallel-label {
  width: 160rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #999;
}

.parallel-val {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #333;
}

.parallel-control {
  flex: 1;
  min-width: 0;
}

.field-hint {
  margin: -8rpx 0 12rpx 160rpx;
  padding-left: 16rpx;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
  font-size: 26rpx;
  color: #666;
}

.num.green {
  color: $green;
  font-weight: 600;
}

.num.orange {
  color: #fa8c16;
  font-weight: 600;
}

.empty-tip {
  text-align: center;
  padding: 80rpx;
  color: #999;
  font-size: 28rpx;
}

.list-section {
  margin: 0 24rpx;
}

.list-title,
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: #333;
}

.picker-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-field .placeholder {
  color: #999;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #999;
}

.hint.required-hint {
  color: #ff4d4f;
}

.footer-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx 48rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.action-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
}

.action-btn.primary {
  background: $green;
  color: #fff;
}

.action-btn.outline {
  background: #fff;
  color: $green;
  border: 2rpx solid $green;
}
</style>
