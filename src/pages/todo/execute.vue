<template>
  <view v-if="task" class="execute-page">
    <view class="action-row">
      <button class="action-btn outline" :loading="saving" @tap="onSave">暂存</button>
      <button class="action-btn primary" @tap="showComplete = true">完工</button>
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
  getTaskById,
} from '@/mock/disassemblyTasks'

const task = ref(null)
const ebomNodes = ref([])
const saving = ref(false)
const showComplete = ref(false)

const stats = computed(() => calcDisassemblyStats(ebomNodes.value))

onLoad((query) => {
  const state = getTaskExecutionState(query.id)
  if (!state) {
    uni.showToast({ title: '任务不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  task.value = state.task
  ebomNodes.value = state.ebomNodes
  if (task.value.processName !== '拆解') {
    uni.showToast({ title: '仅拆解工序可执行', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function onEbomChange() {
  ebomNodes.value = [...ebomNodes.value]
}

function onSave() {
  if (!task.value || saving.value) return
  saving.value = true
  const res = saveTaskDraft(task.value.id, ebomNodes.value)
  saving.value = false
  task.value = getTaskById(task.value.id)
  uni.showToast({ title: res.message, icon: 'success' })
}

function onComplete(form) {
  const res = completeDisassemblyTask(task.value.id, {
    ebomNodes: ebomNodes.value,
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

.list-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: #333;
}
</style>
