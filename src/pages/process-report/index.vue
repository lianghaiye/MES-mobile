<template>
  <view class="hub-page">
    <view class="custom-nav">
      <view class="nav-back" @tap="goBack">
        <text class="back-arrow">‹</text>
      </view>
      <text class="nav-title">工序报工</text>
      <view class="nav-placeholder" />
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >{{ tab.label }}</view>
    </view>

    <text class="date-line">{{ dateHeader }}</text>

    <!-- 今日待报工 -->
    <view v-if="activeTab === 'today'" class="panel">
      <text class="panel-sub">共 {{ pendingCount }} 项待报工</text>
      <view
        v-for="task in reportTasks"
        :key="task.id"
        class="task-card"
        :class="task.status"
      >
        <view class="task-head">
          <text class="task-title">{{ task.productName }} · {{ task.productCode }}</text>
          <text class="task-tag">{{ task.taskNo }}</text>
        </view>
        <text class="task-wo">工单 {{ task.workOrderNo }}</text>
        <view class="task-body">
          <view class="proc-info">
            <text class="proc-seq">{{ task.processSeq }}</text>
            <view>
              <text class="proc-name">{{ task.processName }}</text>
              <text class="proc-meta">
                目标: {{ task.targetQty }}件 · {{ displayReportMode(task.reportMode) }}
                <text v-if="task.lockReason"> · {{ task.lockReason }}</text>
                <text v-if="task.status === 'reported'">
                  · 已报工 {{ (task.reportedGoodQty || 0) + (task.reportedDefectQty || 0) }}件
                  · 良品{{ task.reportedGoodQty || 0 }} 不良{{ task.reportedDefectQty || 0 }}
                  · {{ task.reportStatus }}
                </text>
              </text>
            </view>
          </view>
          <text
            v-if="task.status === 'pending'"
            class="action go"
            @tap="goWorkReport(task)"
          >去报工 ›</text>
          <text
            v-else-if="task.status === 'reported'"
            class="action view"
            @tap="goRecordFromTask(task)"
          >查看 ›</text>
          <text v-else class="action lock">未开始</text>
        </view>
      </view>
      <view v-if="!reportTasks.length" class="empty">今日暂无待报工任务</view>
    </view>

    <!-- 快速报工 -->
    <view v-if="activeTab === 'quick'" class="panel">
      <button class="add-btn" @tap="goQuickAdd">+ 新增快速报工</button>
      <text class="section-title">最近常报工序</text>
      <view v-for="f in frequentList" :key="f.id" class="freq-card">
        <view class="freq-head">
          <text class="freq-name">{{ f.processName }}</text>
          <text class="mode-tag" :class="isDurationReportMode(f.reportMode) ? 'duration' : ''">
            {{ displayReportMode(f.reportMode) }}
          </text>
        </view>
        <text class="freq-product">{{ f.productName }} · {{ f.productCode }}</text>
        <text class="freq-history">上次报工：{{ f.lastSummary }}</text>
        <button class="freq-btn" @tap="goQuickFromFreq(f)">快速报工</button>
      </view>
    </view>

    <!-- 我的记录 -->
    <view v-if="activeTab === 'records'" class="panel">
      <view class="stats-row">
        <view class="stat orange"><text class="stat-num">{{ stats.pending }}</text><text>待审核</text></view>
        <view class="stat green"><text class="stat-num">{{ stats.approved }}</text><text>已审核</text></view>
        <view class="stat red"><text class="stat-num">{{ stats.rejected }}</text><text>已拒绝</text></view>
      </view>
      <view class="filter-chips">
        <view
          v-for="f in recordFilters"
          :key="f.key"
          class="chip"
          :class="{ active: recordFilter === f.key }"
          @tap="recordFilter = f.key"
        >{{ f.label }}</view>
      </view>
      <view
        v-for="r in records"
        :key="r.id"
        class="record-card"
        :class="statusClass(r.status)"
        @tap="goRecordDetail(r)"
      >
        <view class="rc-head">
          <text class="rc-title">{{ r.processName }} · {{ r.productName }}</text>
          <text class="rc-status">{{ r.status }}</text>
        </view>
        <text class="rc-meta">{{ r.workOrderNo ? r.workOrderNo + ' · ' : '' }}{{ r.timeLabel }}</text>
        <view class="rc-metrics">
          <text>报工方式: {{ displayReportSource(r.source) }}</text>
          <text v-if="r.source === 'workorder' && r.operator">操作人: {{ r.operator }}</text>
          <template v-if="isDurationReportMode(r.reportMode)">
            <text>时长: {{ r.workHours }}h</text>
          </template>
          <text>良品: {{ r.goodQty }}</text>
          <text>不良: {{ r.defectQty }}</text>
          <text>报工类型: {{ displayReportMode(r.reportMode) }}</text>
        </view>
        <view v-if="r.status === '已拒绝'" class="reject-box">{{ r.rejectReason }}</view>
      </view>
      <view v-if="!records.length" class="empty">暂无报工记录</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getUser } from '@/utils/auth'
import {
  getTodayReportTasks,
  hasTodayReportTasks,
  getPendingReportTaskCount,
} from '@/mock/processReportTasks'
import {
  getDateHeader,
  getFrequentReports,
  getMyRecords,
  getRecordStats,
} from '@/mock/processReportRecords'
import { getProcessReportMode } from '@/utils/iodomsStorage'
import { isDurationReportMode, resolveReportMode, displayReportSource } from '@/utils/reportMode'
import { getQuickProductByCode } from '@/mock/processReportProducts'

function displayReportMode(mode) {
  return resolveReportMode(mode)
}

const tabs = [
  { key: 'today', label: '今日待报工' },
  { key: 'quick', label: '快速报工' },
  { key: 'records', label: '我的记录' },
]

const activeTab = ref('today')
const recordFilter = ref('all')
const refreshKey = ref(0)
const dateHeader = getDateHeader()

const recordFilters = [
  { key: 'all', label: '全部' },
  { key: '待审核', label: '待审核' },
  { key: '已审核', label: '已审核' },
  { key: '已拒绝', label: '已拒绝' },
]

const user = computed(() => getUser())

const reportTasks = computed(() => {
  refreshKey.value
  return getTodayReportTasks(user.value)
})

const pendingCount = computed(() => {
  refreshKey.value
  return getPendingReportTaskCount(user.value)
})

const frequentList = computed(() => {
  refreshKey.value
  return getFrequentReports()
})

const stats = computed(() => {
  refreshKey.value
  return getRecordStats(user.value)
})

const records = computed(() => {
  refreshKey.value
  return getMyRecords(user.value, recordFilter.value)
})

onLoad((query) => {
  if (query.tab === 'records') activeTab.value = 'records'
  else if (query.tab === 'quick') activeTab.value = 'quick'
  else activeTab.value = hasTodayReportTasks(user.value) ? 'today' : 'quick'
})

onShow(() => {
  refreshKey.value += 1
})

function statusClass(status) {
  if (status === '待审核') return 'pending'
  if (status === '已审核') return 'approved'
  if (status === '已拒绝') return 'rejected'
  return ''
}

function buildExecuteQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
}

function goWorkReport(task) {
  const q = buildExecuteQuery({
    source: 'workorder',
    taskId: task.id,
    taskNo: task.taskNo,
    workOrderNo: task.workOrderNo,
    workOrderId: task.workOrderId,
    processId: task.id,
    processName: task.processName,
    productName: task.productName,
    productCode: task.productCode,
    targetQty: task.targetQty,
    reportMode: task.reportMode || getProcessReportMode(task.processName),
    groupName: task.groupName || '',
  })
  uni.navigateTo({ url: `/pages/process-report/execute?${q}` })
}

function goQuickFromFreq(f) {
  const product = getQuickProductByCode(f.productCode)
  const q = buildExecuteQuery({
    source: 'quick',
    productId: product?.id || '',
    processName: f.processName,
    productName: f.productName,
    productCode: f.productCode,
    reportMode: f.reportMode || getProcessReportMode(f.processName),
  })
  uni.navigateTo({ url: `/pages/process-report/execute?${q}` })
}

function goQuickAdd() {
  uni.navigateTo({ url: '/pages/process-report/quick-product' })
}

function goRecordDetail(r) {
  uni.navigateTo({ url: `/pages/process-report/record-detail?id=${r.id}` })
}

function goRecordFromTask(task) {
  if (task.reportRecordId) {
    goRecordDetail({ id: task.reportRecordId })
    return
  }
  const list = getMyRecords(user.value, 'all')
  const found = list.find(
    (r) =>
      r.taskId === task.id ||
      (r.workOrderNo === task.workOrderNo && r.processName === task.processName),
  )
  if (found) goRecordDetail(found)
  else uni.showToast({ title: '暂无报工记录', icon: 'none' })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/workbench/index' })
  }
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.hub-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 0 24rpx 48rpx;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 12rpx) 0 20rpx;
  background: #f5f6f8;
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-arrow {
  font-size: 52rpx;
  color: $primary;
  line-height: 1;
  font-weight: 300;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.nav-placeholder {
  width: 72rpx;
}

.tabs {
  display: flex;
  background: #e8e8e8;
  border-radius: 12rpx;
  padding: 6rpx;
  margin-bottom: 20rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #595959;
  border-radius: 8rpx;
}

.tab.active {
  background: #fff;
  color: $primary;
  font-weight: 600;
}

.date-line {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 20rpx;
}

.panel-sub,
.section-title {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.task-card,
.freq-card,
.record-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.task-card.reported {
  background: #f6ffed;
}

.task-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}

.task-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
}

.task-tag {
  font-size: 22rpx;
  color: $primary;
  background: #e6f4ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.task-wo {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.task-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  margin-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}

.proc-info {
  display: flex;
  gap: 16rpx;
  flex: 1;
}

.proc-seq {
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 22rpx;
  flex-shrink: 0;
}

.proc-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
}

.proc-meta {
  display: block;
  font-size: 22rpx;
  color: #8c8c8c;
  margin-top: 4rpx;
}

.action {
  font-size: 26rpx;
  flex-shrink: 0;
}

.action.go {
  color: #fa8c16;
}

.action.view {
  color: #52c41a;
}

.action.lock {
  color: #bfbfbf;
}

.freq-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.freq-name {
  font-size: 32rpx;
  font-weight: 700;
}

.mode-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  background: #f6ffed;
  color: #52c41a;
  border-radius: 8rpx;
}

.mode-tag.duration {
  background: #fff7e6;
  color: #fa8c16;
}

.freq-product,
.freq-history {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin-top: 8rpx;
}

.add-btn {
  width: 100%;
  margin-bottom: 24rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.freq-btn {
  margin-top: 20rpx;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
}

.stats-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.stat {
  flex: 1;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  text-align: center;
  font-size: 24rpx;
  color: #8c8c8c;
}

.stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  margin-bottom: 4rpx;
}

.stat.orange .stat-num { color: #fa8c16; }
.stat.green .stat-num { color: #52c41a; }
.stat.red .stat-num { color: #ff4d4f; }

.filter-chips {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.chip {
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  background: #fff;
  font-size: 26rpx;
  color: #595959;
}

.chip.active {
  background: $primary;
  color: #fff;
}

.record-card {
  border-left: 8rpx solid #d9d9d9;
}

.record-card.pending { border-left-color: #fa8c16; }
.record-card.approved { border-left-color: #52c41a; }
.record-card.rejected { border-left-color: #ff4d4f; }

.rc-head {
  display: flex;
  justify-content: space-between;
}

.rc-title {
  font-size: 30rpx;
  font-weight: 600;
}

.rc-status {
  font-size: 24rpx;
}

.record-card.pending .rc-status { color: #fa8c16; }
.record-card.approved .rc-status { color: #52c41a; }
.record-card.rejected .rc-status { color: #ff4d4f; }

.rc-meta {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin: 8rpx 0 12rpx;
}

.rc-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 24rpx;
  font-size: 26rpx;
  color: #595959;
}

.reject-box {
  margin-top: 12rpx;
  padding: 16rpx;
  background: #fff1f0;
  color: #ff4d4f;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: #999;
}
</style>
