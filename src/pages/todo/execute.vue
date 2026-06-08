<template>
  <view v-if="task" class="execute-page">
    <view class="action-row">
      <button class="action-btn outline" :loading="saving" @tap="onSave">暂存</button>
      <button class="action-btn primary" @tap="onCompleteClick">完工</button>
    </view>

    <view class="summary-card">
      <view class="summary-row">
        <text class="summary-label">物品名称</text>
        <text class="summary-val">{{ task.productName }} {{ task.specModel }}</text>
      </view>
      <view v-if="task.barcodeType === '一物一码'" class="summary-row">
        <text class="summary-label">序列号/条形码</text>
        <text class="summary-val">{{ task.serialNo }}</text>
      </view>
      <view class="stats-row">
        <text>已拆 <text class="num">{{ stats.dismantled }}</text> 项</text>
        <text>回用 <text class="num green">{{ stats.reuse }}</text> 件</text>
        <text>报废 <text class="num orange">{{ stats.scrap }}</text> 件</text>
      </view>
    </view>

    <view class="list-section">
      <text class="list-title">拆解列表</text>
      <EbomNode
        v-for="node in ebomNodes"
        :key="node.id"
        :node="node"
        @change="onEbomChange"
      />
    </view>

    <view class="warehouse-card">
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
              <text :class="{ placeholder: !reuseWarehouse }">
                {{ reuseWarehouse || '数据来源：仓库' }}
              </text>
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
              <text :class="{ placeholder: !scrapWarehouse }">
                {{ scrapWarehouse || '数据来源：仓库' }}
              </text>
              <text class="arrow">▼</text>
            </view>
          </picker>
        </view>
        <text v-if="needScrapWarehouse" class="hint required-hint field-hint">有报废物品时必填!</text>
      </view>
    </view>

    <CompleteModal
      v-model:visible="showComplete"
      :stats="stats"
      :next-process="task.nextProcess"
      :labor-method="task.laborCalcMethod"
      @confirm="onComplete"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import EbomNode from '@/components/disassembly/EbomNode.vue'
import CompleteModal from '@/components/disassembly/CompleteModal.vue'
import { calcDisassemblyStats } from '@/mock/disassemblyEbom'
import {
  getTaskExecutionState,
  saveTaskDraft,
  completeDisassemblyTask,
  validateDisassemblyWarehouse,
  warehouseOptions,
  getTaskById,
} from '@/mock/disassemblyTasks'

const task = ref(null)
const ebomNodes = ref([])
const reuseWarehouse = ref('')
const scrapWarehouse = ref('')
const saving = ref(false)
const showComplete = ref(false)

const stats = computed(() => calcDisassemblyStats(ebomNodes.value))

const needReuseWarehouse = computed(() => stats.value.reuse > 0)
const needScrapWarehouse = computed(() => stats.value.scrap > 0)

const reuseWhIndex = computed(() => {
  const i = warehouseOptions.indexOf(reuseWarehouse.value)
  return i >= 0 ? i : 0
})

const scrapWhIndex = computed(() => {
  const i = warehouseOptions.indexOf(scrapWarehouse.value)
  return i >= 0 ? i : 0
})

onLoad((query) => {
  const state = getTaskExecutionState(query.id)
  if (!state) {
    uni.showToast({ title: '任务不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  task.value = state.task
  ebomNodes.value = state.ebomNodes
  reuseWarehouse.value = state.reuseWarehouse || ''
  scrapWarehouse.value = state.scrapWarehouse || ''
  if (task.value.processName !== '拆解') {
    uni.showToast({ title: '仅拆解工序可执行', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
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

function onSave() {
  if (!task.value || saving.value) return
  saving.value = true
  const res = saveTaskDraft(task.value.id, {
    ebomNodes: ebomNodes.value,
    reuseWarehouse: reuseWarehouse.value,
    scrapWarehouse: scrapWarehouse.value,
  })
  saving.value = false
  task.value = getTaskById(task.value.id)
  uni.showToast({ title: res.message, icon: 'success' })
}

function onCompleteClick() {
  const check = validateDisassemblyWarehouse(
    ebomNodes.value,
    reuseWarehouse.value,
    scrapWarehouse.value,
  )
  if (!check.ok) {
    uni.showToast({ title: check.message, icon: 'none' })
    return
  }
  showComplete.value = true
}

function onComplete(form) {
  const res = completeDisassemblyTask(task.value.id, {
    ebomNodes: ebomNodes.value,
    reuseWarehouse: reuseWarehouse.value,
    scrapWarehouse: scrapWarehouse.value,
    ...form,
  })
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  showComplete.value = false
  uni.showToast({ title: res.message, icon: 'success' })
  setTimeout(() => {
    backToTodoList()
  }, 1200)
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

.execute-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 48rpx;
}

.action-row {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  background: #fff;
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

.summary-card {
  margin: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.summary-row {
  margin-bottom: 12rpx;
  font-size: 26rpx;
}

.summary-label {
  display: block;
  color: #999;
  margin-bottom: 6rpx;
}

.summary-val {
  color: #333;
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

.num {
  font-weight: 600;
  color: #333;
}

.num.green {
  color: $green;
}

.num.orange {
  color: #fa8c16;
}

.list-section {
  margin: 0 24rpx;
}

.warehouse-card {
  margin: 20rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.list-title,
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: #333;
}

.field {
  margin-bottom: 20rpx;
}

.parallel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.parallel-label {
  width: 160rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #999;
}

.parallel-control {
  flex: 1;
  min-width: 0;
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

.hint.required-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #ff4d4f;
}

.field-hint {
  margin-left: 160rpx;
  padding-left: 16rpx;
}
</style>
