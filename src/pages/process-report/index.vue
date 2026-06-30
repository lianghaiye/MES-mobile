<template>
  <view class="hub-page" :class="{ 'with-batch-bar': activeTab === 'today' && selectedCount > 0 }">
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
      >
        <text>{{ tab.label }}</text>
        <text v-if="tab.key === 'claim' && claimCount > 0" class="tab-badge">{{ claimCount }}</text>
      </view>
    </view>

    <text class="date-line">{{ dateHeader }}</text>

    <!-- 待领任务 -->
    <view v-if="activeTab === 'claim'" class="panel">
      <text class="panel-sub">共 {{ claimCount }} 项待领取</text>
      <view
        v-for="task in claimTasks"
        :key="task.id"
        class="task-card claim-card"
        @tap="goClaimDetail(task)"
      >
        <view class="task-head">
          <text class="task-title">{{ task.productName }} · {{ task.productCode }}</text>
          <text v-if="task.salesOrderNo" class="task-tag sales">{{ task.salesOrderNo }}</text>
          <text v-else class="task-tag claim-tag">待领取</text>
        </view>
        <text class="task-wo">工单 {{ task.workOrderNo }} · {{ task.orderCategory }}</text>
        <text class="task-spec">
          材质: {{ task.material || '—' }} · 图号: {{ task.drawingNo || '—' }}
        </text>
        <view class="task-body">
          <view class="proc-info">
            <text class="proc-seq">{{ task.processSeq }}</text>
            <view>
              <text class="proc-name">{{ task.processName }}</text>
              <text class="proc-meta">
                目标: {{ task.targetQty }}件 · {{ displayReportMode(task.reportMode) }}
              </text>
              <text v-if="task.isMultiGroup" class="proc-meta">
                执行小组: {{ (task.groupNames || []).join('、') }}
              </text>
            </view>
          </view>
          <text class="action claim" @tap.stop="onClaimTask(task)">领取 ›</text>
        </view>
      </view>
      <view v-if="!claimTasks.length" class="empty">暂无待领任务</view>
    </view>

    <!-- 今日待报工 -->
    <view v-if="activeTab === 'today'" class="panel">
      <view class="today-toolbar">
        <text class="panel-sub inline">共 {{ pendingReportCount }} 项待报工任务</text>
        <view v-if="selectableTasks.length" class="select-actions">
          <view class="select-all" @tap="toggleSelectAll">
            <view class="checkbox" :class="{ checked: isAllSelected }">
              <text v-if="isAllSelected" class="check-mark">✓</text>
            </view>
            <text class="select-all-text">全选</text>
          </view>
          <text class="select-action-divider">|</text>
          <text class="select-invert" @tap="invertSelection">反选</text>
        </view>
      </view>

      <view v-if="showMemberSelector" class="member-bar">
        <scroll-view scroll-x class="member-scroll" :show-scrollbar="false">
          <view class="member-chips">
            <view
              v-for="member in ledMembers"
              :key="member.name"
              class="member-chip"
              :class="{ active: reportForMember === member.name }"
              @tap="selectReportMember(member.name)"
            >
              <text>{{ member.name }}</text>
              <text v-if="member.isLeader" class="leader-tag">组长</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="group-chips">
        <view
          v-for="mode in todayGroupModes"
          :key="mode.key"
          class="group-chip"
          :class="{ active: todayGroupMode === mode.key }"
          @tap="todayGroupMode = mode.key"
        >{{ mode.label }}</view>
      </view>

      <view class="scope-chips">
        <view
          v-for="scope in todayTaskScopeFilters"
          :key="scope.key"
          class="scope-chip"
          :class="{ active: todayTaskScopeFilter === scope.key }"
          @tap="todayTaskScopeFilter = scope.key"
        >{{ scope.label }}</view>
      </view>

      <template v-for="group in groupedReportTasks" :key="group.key">
        <!-- 按工序：汇总卡片 -->
        <view
          v-if="todayGroupMode !== 'task' && group.label"
          class="summary-group-card process"
        >
          <view class="summary-group-head">
            <view class="summary-group-title">
              <text class="summary-group-icon process">
                {{ group.processSeq }}
              </text>
              <view class="summary-group-name-wrap">
                <text class="summary-group-name">{{ group.label }}</text>
                <text class="summary-group-sub">{{ group.summary }}</text>
              </view>
            </view>
            <view v-if="group.pendingCount > 0" class="summary-group-badge pending">
              待报工 {{ group.pendingCount }}
            </view>
          </view>
          <view class="summary-group-body">
            <view
              v-for="task in group.tasks"
              :key="task.id"
              class="task-row"
              :class="{
                selectable: task.status === 'pending',
                selected: isTaskSelected(task.id),
                compact: true,
              }"
            >
              <view
                v-if="task.status === 'pending'"
                class="checkbox-col"
                @tap.stop="toggleTaskSelect(task.id)"
              >
                <view class="checkbox" :class="{ checked: isTaskSelected(task.id) }">
                  <text v-if="isTaskSelected(task.id)" class="check-mark">✓</text>
                </view>
              </view>
              <view class="task-card" :class="task.status" @tap="goTaskDetail(task)">
                <view class="task-head">
                  <text class="task-title">{{ task.productName }} · {{ task.productCode }}</text>
                  <text v-if="task.isPersonalTask" class="task-tag personal-tag">个人</text>
                  <text v-else-if="task.isGroupTask" class="task-tag group-tag">小组</text>
                  <text v-if="task.status === 'reported'" class="task-tag reported-tag">{{ task.reportStatus || '已报工' }}</text>
                  <text v-else-if="task.salesOrderNo" class="task-tag sales">{{ task.salesOrderNo }}</text>
                </view>
                <text class="task-wo">工单 {{ task.workOrderNo }}</text>
                <text class="task-spec">
                  材质: {{ task.material || '—' }} · 图号: {{ task.drawingNo || '—' }}
                </text>
                <view class="task-body">
                  <view class="proc-info">
                    <text class="proc-meta">{{ taskQtyText(task) }}</text>
                  </view>
                  <text
                    v-if="task.status === 'pending'"
                    class="action go"
                    @tap.stop="goWorkReport(task)"
                  >去报工 ›</text>
                  <text
                    v-else-if="task.status === 'reported'"
                    class="action view"
                    @tap.stop="goRecordFromTask(task)"
                  >查看 ›</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 按任务：平铺列表 -->
        <template v-else>
          <view
            v-for="task in group.tasks"
            :key="task.id"
            class="task-row"
            :class="{
              selectable: task.status === 'pending',
              selected: isTaskSelected(task.id),
            }"
          >
            <view
              v-if="task.status === 'pending'"
              class="checkbox-col"
              @tap.stop="toggleTaskSelect(task.id)"
            >
              <view class="checkbox" :class="{ checked: isTaskSelected(task.id) }">
                <text v-if="isTaskSelected(task.id)" class="check-mark">✓</text>
              </view>
            </view>
            <view class="task-card" :class="task.status" @tap="goTaskDetail(task)">
              <view class="task-head">
                <text class="task-title">{{ task.productName }} · {{ task.productCode }}</text>
                <text v-if="task.isPersonalTask" class="task-tag personal-tag">个人</text>
                <text v-else-if="task.isGroupTask" class="task-tag group-tag">小组</text>
                <text v-if="task.status === 'reported'" class="task-tag reported-tag">{{ task.reportStatus || '已报工' }}</text>
                <text v-else-if="task.salesOrderNo" class="task-tag sales">{{ task.salesOrderNo }}</text>
              </view>
              <text class="task-wo">工单 {{ task.workOrderNo }}</text>
              <text class="task-spec">
                材质: {{ task.material || '—' }} · 图号: {{ task.drawingNo || '—' }}
              </text>
              <view class="task-body">
                <view class="proc-info">
                  <text class="proc-seq">{{ task.processSeq }}</text>
                  <view>
                    <text class="proc-name">{{ task.processName }}</text>
                    <text class="proc-meta">{{ taskQtyText(task) }}</text>
                  </view>
                </view>
                <text
                  v-if="task.status === 'pending'"
                  class="action go"
                  @tap.stop="goWorkReport(task)"
                >去报工 ›</text>
                <text
                  v-else-if="task.status === 'reported'"
                  class="action view"
                  @tap.stop="goRecordFromTask(task)"
                >查看 ›</text>
              </view>
            </view>
          </view>
        </template>
      </template>

      <view v-if="!scopedReportTasks.length" class="empty">今日暂无待报工任务</view>
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
        <view class="stat orange"><text class="stat-num">{{ stats.notPushed }}</text><text>未推送</text></view>
        <view class="stat blue"><text class="stat-num">{{ stats.pushed }}</text><text>已推送</text></view>
        <view class="stat green"><text class="stat-num">{{ stats.autoPushed }}</text><text>已自动推送</text></view>
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
        :class="pushStatusClass(r)"
        @tap="goRecordDetail(r)"
      >
        <view class="rc-head">
          <view class="rc-title-wrap">
            <text class="rc-title">{{ r.processName }} · {{ r.productName }}</text>
            <view v-if="r.source === 'workorder' && r.taskScope" class="rc-scope-tags">
              <text class="scope-tag" :class="r.taskScope === '小组' ? 'group' : 'personal'">{{ r.taskScope }}</text>
            </view>
          </view>
          <text class="rc-status">{{ resolveRecordPushStatus(r) }}</text>
        </view>
        <text class="rc-meta">{{ r.workOrderNo ? r.workOrderNo + ' · ' : '' }}{{ r.timeLabel }}</text>
        <view class="rc-metrics">
          <text>报工方式: {{ displayReportSource(r.source) }}</text>
          <text>审核状态: {{ r.status }}</text>
          <text v-if="r.source === 'workorder' && r.reporter">执行人: {{ r.reporter }}</text>
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

    <!-- 批量报工底栏 -->
    <view v-if="activeTab === 'today' && selectedCount > 0" class="batch-bar">
      <text class="batch-count">已选择 {{ selectedCount }} 项任务</text>
      <button class="batch-cancel" @tap="clearSelection">取消</button>
      <button class="batch-submit" @tap="openBatchConfirm">批量报工 ({{ selectedCount }})</button>
    </view>

    <BatchReportConfirmModal
      :open="batchConfirmOpen"
      :count="selectedCount"
      @cancel="closeBatchConfirm"
      @confirm="onBatchQuickConfirm"
      @abnormal="onBatchAbnormal"
    />
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getUser } from '@/utils/auth'
import {
  getTodayReportTasks,
  getClaimableReportTasks,
  getClaimableReportTaskCount,
  claimReportTask,
  hasTodayReportTasks,
  batchReportTasks,
} from '@/mock/processReportTasks'
import {
  getDateHeader,
  getFrequentReports,
  getMyRecords,
  getRecordStats,
  resolveRecordPushStatus,
  PUSH_STATUS,
} from '@/mock/processReportRecords'
import { getProcessReportMode } from '@/utils/iodomsStorage'
import { isDurationReportMode, resolveReportMode, displayReportSource } from '@/utils/reportMode'
import {
  isGroupLeader,
  getLedGroupMembers,
  resolveWorkerDisplayName,
} from '@/utils/workerGroup'
import { getQuickProductByCode } from '@/mock/processReportProducts'
import BatchReportConfirmModal from '@/components/process-report/BatchReportConfirmModal.vue'

function displayReportMode(mode) {
  return resolveReportMode(mode)
}

const tabs = [
  { key: 'claim', label: '待领任务' },
  { key: 'today', label: '今日待报工' },
  { key: 'quick', label: '快速报工' },
  { key: 'records', label: '我的记录' },
]

const activeTab = ref('today')
const todayGroupMode = ref('task')
const todayTaskScopeFilter = ref('all')
const reportForMember = ref('')
const selectedTaskIds = ref([])
const batchConfirmOpen = ref(false)
const recordFilter = ref('all')
const refreshKey = ref(0)
const dateHeader = getDateHeader()

const todayGroupModes = [
  { key: 'task', label: '按任务' },
  { key: 'process', label: '按工序' },
]

const todayTaskScopeFilters = [
  { key: 'all', label: '全部' },
  { key: 'personal', label: '个人' },
  { key: 'group', label: '小组' },
]

const recordFilters = [
  { key: 'all', label: '全部' },
  { key: PUSH_STATUS.NOT_PUSHED, label: PUSH_STATUS.NOT_PUSHED },
  { key: PUSH_STATUS.PUSHED, label: PUSH_STATUS.PUSHED },
  { key: PUSH_STATUS.AUTO_PUSHED, label: PUSH_STATUS.AUTO_PUSHED },
]

const user = computed(() => getUser())

const ledMembers = computed(() => {
  refreshKey.value
  if (!isGroupLeader(user.value)) return []
  return getLedGroupMembers(user.value)
})

const showMemberSelector = computed(() => {
  refreshKey.value
  if (!isGroupLeader(user.value)) return false
  return reportTasks.value.some((t) => t.isGroupTask && t.status === 'pending')
})

function taskQtyText(task) {
  if (task.status === 'reported') {
    return `目标: ${task.targetQty}件 · 已报: ${task.reportedTotalQty || task.targetQty}件 · ${task.reportTypeLabel || displayReportMode(task.reportMode)}`
  }
  const parts = [`目标: ${task.targetQty}件`, `待报: ${task.remainingQty ?? task.targetQty}件`]
  if ((task.reportedTotalQty || 0) > 0) parts.push(`已报: ${task.reportedTotalQty}件`)
  parts.push(task.reportTypeLabel || displayReportMode(task.reportMode))
  return parts.join(' · ')
}

function initReportForMember() {
  const name = resolveWorkerDisplayName(user.value)
  if (!reportForMember.value) {
    reportForMember.value = name
    return
  }
  if (ledMembers.value.length && !ledMembers.value.some((m) => m.name === reportForMember.value)) {
    reportForMember.value = name
  }
}

const reportOptions = computed(() => ({
  reportForMember: reportForMember.value || resolveWorkerDisplayName(user.value),
}))

const claimTasks = computed(() => {
  refreshKey.value
  return getClaimableReportTasks(user.value)
})

const claimCount = computed(() => {
  refreshKey.value
  return getClaimableReportTaskCount(user.value)
})

const reportTasks = computed(() => {
  refreshKey.value
  return getTodayReportTasks(user.value, reportOptions.value)
})

const scopedReportTasks = computed(() => {
  const tasks = reportTasks.value
  if (todayTaskScopeFilter.value === 'personal') {
    return tasks.filter((t) => t.isPersonalTask)
  }
  if (todayTaskScopeFilter.value === 'group') {
    return tasks.filter((t) => t.isGroupTask)
  }
  return tasks
})

const pendingReportCount = computed(() => {
  refreshKey.value
  return scopedReportTasks.value.filter((t) => t.status === 'pending').length
})

const groupedReportTasks = computed(() => {
  const tasks = scopedReportTasks.value
  if (!tasks.length) return []

  if (todayGroupMode.value === 'task') {
    return [{ key: 'all', label: '', tasks, summary: '' }]
  }

  const map = new Map()
  tasks.forEach((task) => {
    const label = task.processName || '未指定工序'
    if (!map.has(label)) map.set(label, [])
    map.get(label).push(task)
  })

  const statusOrder = { pending: 0, reported: 1 }
  const sortTasks = (list) =>
    [...list].sort((a, b) => {
      const diff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      if (diff !== 0) return diff
      return (a.processSeq || 0) - (b.processSeq || 0)
    })

  const buildSummary = (groupTasks) => {
    const pending = groupTasks.filter((t) => t.status === 'pending').length
    const reported = groupTasks.filter((t) => t.status === 'reported').length
    const parts = []
    if (pending) parts.push(`待报工 ${pending}`)
    if (reported) parts.push(`已报工 ${reported}`)
    return parts.join(' · ') || `${groupTasks.length} 项`
  }

  const sortGroups = (entries) =>
    entries.sort(([, tasksA], [, tasksB]) => {
      const pendingA = tasksA.filter((t) => t.status === 'pending').length
      const pendingB = tasksB.filter((t) => t.status === 'pending').length
      if (pendingB !== pendingA) return pendingB - pendingA
      const seqA = Math.min(...tasksA.map((t) => t.processSeq || 99))
      const seqB = Math.min(...tasksB.map((t) => t.processSeq || 99))
      return seqA - seqB
    })

  return sortGroups([...map.entries()]).map(([label, groupTasks]) => {
    const sorted = sortTasks(groupTasks)
    return {
      key: `process-${label}`,
      label,
      processSeq: sorted[0]?.processSeq ?? '',
      tasks: sorted,
      pendingCount: sorted.filter((t) => t.status === 'pending').length,
      reportedCount: sorted.filter((t) => t.status === 'reported').length,
      summary: buildSummary(sorted),
    }
  })
})

const selectableTasks = computed(() => {
  refreshKey.value
  return scopedReportTasks.value.filter((t) => t.status === 'pending')
})

const selectedCount = computed(() => selectedTaskIds.value.length)

const isAllSelected = computed(() => {
  const list = selectableTasks.value
  return list.length > 0 && list.every((t) => selectedTaskIds.value.includes(t.id))
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
  initReportForMember()
  if (query.tab === 'records') activeTab.value = 'records'
  else if (query.tab === 'quick') activeTab.value = 'quick'
  else if (query.tab === 'claim') activeTab.value = 'claim'
  else if (query.tab === 'today') activeTab.value = 'today'
  else if (getClaimableReportTaskCount(user.value) > 0) activeTab.value = 'claim'
  else activeTab.value = hasTodayReportTasks(user.value) ? 'today' : 'quick'
})

onShow(() => {
  refreshKey.value += 1
  initReportForMember()
  if (activeTab.value === 'today') {
    selectAllPending()
    return
  }
  const valid = new Set(
    scopedReportTasks.value
      .filter((t) => t.status === 'pending')
      .map((t) => t.id),
  )
  selectedTaskIds.value = selectedTaskIds.value.filter((id) => valid.has(id))
})

watch(reportForMember, () => {
  if (activeTab.value === 'today') selectAllPending()
  else clearSelection()
})

watch(todayTaskScopeFilter, () => {
  if (activeTab.value === 'today') selectAllPending()
})

watch(activeTab, (tab) => {
  if (tab === 'today') selectAllPending()
  else clearSelection()
})

function selectAllPending() {
  selectedTaskIds.value = selectableTasks.value.map((t) => t.id)
}

function isTaskSelected(id) {
  return selectedTaskIds.value.includes(id)
}

function toggleTaskSelect(id) {
  if (selectedTaskIds.value.includes(id)) {
    selectedTaskIds.value = selectedTaskIds.value.filter((item) => item !== id)
  } else {
    selectedTaskIds.value = [...selectedTaskIds.value, id]
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    clearSelection()
    return
  }
  selectedTaskIds.value = selectableTasks.value.map((t) => t.id)
}

function invertSelection() {
  const allIds = selectableTasks.value.map((t) => t.id)
  const selected = new Set(selectedTaskIds.value)
  selectedTaskIds.value = allIds.filter((id) => !selected.has(id))
}

function clearSelection() {
  selectedTaskIds.value = []
}

function openBatchConfirm() {
  if (!selectedCount.value) return
  batchConfirmOpen.value = true
}

function closeBatchConfirm() {
  batchConfirmOpen.value = false
}

function selectReportMember(name) {
  if (reportForMember.value === name) return
  reportForMember.value = name
  refreshKey.value += 1
}

function onBatchQuickConfirm() {
  const ids = [...selectedTaskIds.value]
  closeBatchConfirm()
  const result = batchReportTasks(ids, user.value, reportOptions.value)
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' })
    return
  }
  clearSelection()
  refreshKey.value += 1
  uni.showToast({ title: result.message, icon: 'success' })
}

function onBatchAbnormal() {
  const ids = [...selectedTaskIds.value]
  closeBatchConfirm()
  const q = [
    `ids=${encodeURIComponent(ids.join(','))}`,
    `reportFor=${encodeURIComponent(reportForMember.value || resolveWorkerDisplayName(user.value))}`,
  ].join('&')
  uni.navigateTo({ url: `/pages/process-report/batch-execute?${q}` })
}

function pushStatusClass(record) {
  const status = resolveRecordPushStatus(record)
  if (status === PUSH_STATUS.AUTO_PUSHED) return 'push-auto'
  if (status === PUSH_STATUS.PUSHED) return 'push-manual'
  return 'push-not'
}

function buildExecuteQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
}

function onClaimTask(task) {
  const res = claimReportTask(task.id, user.value)
  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }
  uni.showToast({ title: '领取成功', icon: 'success' })
  refreshKey.value += 1
  activeTab.value = 'today'
}

function goClaimDetail(task) {
  uni.navigateTo({ url: `/pages/process-report/claim-detail?id=${task.id}` })
}

function goTaskDetail(task) {
  const reportFor = encodeURIComponent(
    reportForMember.value || resolveWorkerDisplayName(user.value),
  )
  uni.navigateTo({
    url: `/pages/process-report/claim-detail?id=${task.id}&mode=report&reportFor=${reportFor}`,
  })
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
    specModel: task.specModel,
    material: task.material,
    drawingNo: task.drawingNo,
    targetQty: task.targetQty,
    remainingQty: task.remainingQty ?? task.targetQty,
    isGroupTask: task.isGroupTask ? '1' : '0',
    reportMode: task.reportMode || getProcessReportMode(task.processName),
    groupName: task.groupName || '',
    reportFor: reportForMember.value || resolveWorkerDisplayName(user.value),
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

  &.with-batch-bar {
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
  }
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  text-align: center;
  padding: 16rpx 0;
  font-size: 24rpx;
  color: #595959;
  border-radius: 8rpx;
}

.tab-badge {
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
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

.panel-sub.inline {
  margin-bottom: 0;
}

.today-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.select-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.select-action-divider {
  font-size: 24rpx;
  color: #d9d9d9;
}

.select-invert {
  font-size: 26rpx;
  color: $primary;
}

.select-all-text {
  font-size: 26rpx;
  color: #595959;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  flex-shrink: 0;
}

.checkbox.checked {
  border-color: $primary;
  background: $primary;
}

.check-mark {
  color: #fff;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 700;
}

.task-row {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
  margin-bottom: 20rpx;
  border-radius: 16rpx;
}

.task-row.selectable.selected {
  .task-card {
    background: #e6f4ff;
    border: 2rpx solid $primary;
  }
}

.checkbox-col {
  display: flex;
  align-items: center;
  padding-left: 4rpx;
}

.task-row .task-card {
  flex: 1;
  margin-bottom: 0;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}

.member-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding: 16rpx 20rpx;
  background: #fff;
  border-radius: 16rpx;
}

.member-bar-label {
  flex-shrink: 0;
  font-size: 26rpx;
  color: #595959;
}

.member-scroll {
  flex: 1;
  white-space: nowrap;
}

.member-chips {
  display: inline-flex;
  gap: 12rpx;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #595959;
  background: #f5f6f8;
  border: 2rpx solid transparent;
}

.member-chip.active {
  color: $primary;
  background: rgba(22, 119, 255, 0.08);
  border-color: rgba(22, 119, 255, 0.35);
}

.leader-tag {
  font-size: 20rpx;
  color: #fa8c16;
  background: rgba(250, 140, 22, 0.12);
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}

.group-chips {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.group-chip {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #595959;
  background: #fff;
}

.group-chip.active {
  background: $primary;
  color: #fff;
  font-weight: 600;
}

.scope-chips {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.scope-chip {
  padding: 10rpx 24rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #595959;
  background: #fff;
  border: 2rpx solid #f0f0f0;
}

.scope-chip.active {
  color: $primary;
  border-color: rgba(22, 119, 255, 0.35);
  background: rgba(22, 119, 255, 0.08);
}

.group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 4rpx 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.group-count {
  font-size: 24rpx;
  font-weight: 400;
  color: #8c8c8c;
}

.summary-group-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  border: 2rpx solid #e6f4ff;

  &.person {
    border-color: #d9f7be;
  }
}

.summary-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: linear-gradient(90deg, #e6f4ff 0%, #f0f7ff 100%);
  border-bottom: 1rpx solid #d6e8ff;
}

.summary-group-card.person .summary-group-head {
  background: linear-gradient(90deg, #f6ffed 0%, #fcfff6 100%);
  border-bottom-color: #d9f7be;
}

.summary-group-title {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.summary-group-icon {
  width: 48rpx;
  height: 48rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 50%;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;

  &.process {
    background: $primary;
    color: #fff;
  }

  &.person {
    background: #52c41a;
    color: #fff;
  }
}

.summary-group-name-wrap {
  flex: 1;
  min-width: 0;
}

.summary-group-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.summary-group-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8c8c8c;
}

.summary-group-badge {
  flex-shrink: 0;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 600;

  &.pending {
    color: #fa8c16;
    background: #fff7e6;
  }
}

.summary-group-body {
  padding: 16rpx 16rpx 4rpx;
}

.summary-group-body .task-row {
  margin-bottom: 16rpx;
}

.summary-group-body .task-card {
  background: #fafafa;
  border-radius: 12rpx;
}

.summary-group-body .task-card.reported {
  background: #f5f5f5;
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
  background: #fafafa;
  padding: 20rpx 24rpx;
}

.task-card.reported .task-title {
  font-weight: 500;
  color: #8c8c8c;
}

.task-card.reported .task-wo,
.task-card.reported .proc-meta,
.task-card.reported .reported-qty {
  color: #bfbfbf;
}

.task-card.reported .proc-name {
  font-weight: 500;
  color: #bfbfbf;
}

.task-card.reported .proc-seq {
  background: #ebebeb;
  color: #bfbfbf;
}

.task-card.reported .task-body {
  border-top-color: #f0f0f0;
  padding-top: 16rpx;
  margin-top: 12rpx;
}

.task-card.reported .action.view {
  color: #bfbfbf;
  font-size: 24rpx;
}

.task-tag.reported-tag {
  color: #bfbfbf;
  background: #f0f0f0;
  font-weight: 400;
}

.task-card.claim-card {
  border: 2rpx solid #ffd591;
}

.claim-tag {
  color: #fa8c16 !important;
  background: #fff7e6 !important;
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

  &.sales {
    max-width: 240rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.personal-tag {
    color: #531dab;
    background: #f9f0ff;
  }

  &.group-tag {
    color: #08979c;
    background: #e6fffb;
  }
}

.task-wo {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.task-spec {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #595959;
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
  color: #8c8c8c;
}

.action.lock {
  color: #bfbfbf;
}

.action.claim {
  color: $primary;
  font-weight: 600;
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
.stat.blue .stat-num { color: #1890ff; }
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

.record-card.push-not { border-left-color: #d9d9d9; }
.record-card.push-manual { border-left-color: #1677ff; }
.record-card.push-auto { border-left-color: #52c41a; }

.rc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}

.rc-title-wrap {
  flex: 1;
  min-width: 0;
}

.rc-scope-tags {
  margin-top: 8rpx;
}

.scope-tag {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 500;

  &.personal {
    color: #531dab;
    background: #f9f0ff;
  }

  &.group {
    color: #08979c;
    background: #e6fffb;
  }
}

.rc-title {
  font-size: 30rpx;
  font-weight: 600;
}

.rc-status {
  font-size: 24rpx;
  flex-shrink: 0;
}

.record-card.push-not .rc-status { color: #8c8c8c; }
.record-card.push-manual .rc-status { color: #1677ff; }
.record-card.push-auto .rc-status { color: #52c41a; }

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

.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.batch-count {
  flex: 1;
  font-size: 28rpx;
  color: $primary;
  font-weight: 600;
}

.batch-cancel {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  margin: 0;
  font-size: 28rpx;
  color: #595959;
  background: #fff;
  border: 2rpx solid #d9d9d9;
  border-radius: 36rpx;
}

.batch-submit {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  margin: 0;
  font-size: 28rpx;
  color: #fff;
  background: $primary;
  border: none;
  border-radius: 36rpx;
  font-weight: 600;
}
</style>
