<template>
  <view class="form-page">
    <!-- 工单登记：顶部工单信息 -->
    <view v-if="fromWorkOrder" class="card wo-info-card">
      <view class="card-title">
        <text>工单信息</text>
      </view>
      <view class="wo-info-row">
        <text class="wo-info-label">工单编号</text>
        <text class="wo-info-val primary">{{ sourceWorkOrderNo }}</text>
      </view>
      <view class="wo-info-row">
        <text class="wo-info-label">产品</text>
        <text class="wo-info-val">{{ productDisplay }}</text>
      </view>
      <view class="wo-info-row">
        <text class="wo-info-label">排产数量</text>
        <text class="wo-info-val">{{ planQty }} 件</text>
      </view>
    </view>

    <!-- 卡片1：产品信息 / 登记数量 -->
    <view class="card">
      <view class="card-title">
        <text>{{ fromWorkOrder ? '登记数量' : '产品信息' }}</text>
        <text class="badge required-badge">必填</text>
      </view>

      <view v-if="!fromWorkOrder" class="field-row" @tap="goProductSearch">
        <text class="field-label required">产品</text>
        <view class="field-value picker-like">
          <text :class="{ placeholder: !form.productName }">
            {{ productDisplay || '请选择产品' }}
          </text>
          <text class="arrow">›</text>
        </view>
      </view>

      <text v-if="fromWorkOrder" class="qty-hint">报工数量可小于排产数量</text>

      <view class="qty-field">
        <text class="qty-label required">良品数量</text>
        <view class="stepper">
          <view class="step-btn" @tap="changeFormQty('good', -1)">−</view>
          <input
            v-model.number="form.goodQty"
            class="step-val"
            type="digit"
            @blur="syncProcessQtyFromForm"
          />
          <view class="step-btn primary" @tap="changeFormQty('good', 1)">+</view>
        </view>
      </view>

      <view class="qty-field">
        <text class="qty-label">不良品数量</text>
        <view class="stepper">
          <view class="step-btn" @tap="changeFormQty('defect', -1)">−</view>
          <input
            v-model.number="form.defectQty"
            class="step-val"
            type="digit"
            @blur="syncProcessQtyFromForm"
          />
          <view class="step-btn primary" @tap="changeFormQty('defect', 1)">+</view>
        </view>
      </view>

      <view class="qty-total-row">
        <text class="qty-total-label">合计完工</text>
        <text class="qty-total-value">{{ totalReportQty }} 件</text>
      </view>

      <view class="field-row date-row">
        <text class="field-label required">生产日期</text>
        <view class="date-chips">
          <view
            class="chip"
            :class="{ active: dateChip === 'today' }"
            @tap="setDateChip('today')"
          >今天</view>
          <view
            class="chip"
            :class="{ active: dateChip === 'yesterday' }"
            @tap="setDateChip('yesterday')"
          >昨天</view>
          <picker mode="date" :value="form.reportDate" @change="onCustomDate">
            <view
              class="chip"
              :class="{ active: dateChip === 'custom' }"
              @tap="prepareCustomDate"
            >
              {{ customChipLabel }}
            </view>
          </picker>
        </view>
        <view v-if="showSelectedDate" class="date-result">
          <text class="date-result-label">已选日期</text>
          <text class="date-result-value">{{ form.reportDate }}</text>
        </view>
      </view>
    </view>

    <!-- 卡片2：生产详情 -->
    <view class="card">
      <view class="card-title">
        <text>生产详情</text>
        <text class="badge optional-badge">可选</text>
      </view>

      <view class="toggle-row">
        <view class="toggle-info">
          <text class="toggle-title">按工序指定人员</text>
          <text class="toggle-hint">关闭：所有工序统一人员 · 打开：每道工序单独指定</text>
        </view>
        <switch
          :checked="form.perProcessMode"
          color="#07c160"
          @change="onPerProcessToggle"
        />
      </view>

      <view v-if="form.routeName" class="field-row">
        <text class="field-label">工艺路线</text>
        <picker
          v-if="routeOptions.length > 1"
          mode="selector"
          :range="routeOptions"
          range-key="name"
          :value="routeIndex"
          @change="onRouteChange"
        >
          <view class="field-value route-picker">
            <text>{{ form.routeName }}</text>
            <text class="arrow down">▼</text>
          </view>
        </picker>
        <view v-else class="field-value route-picker readonly">
          <text>{{ form.routeName }}</text>
        </view>
      </view>

      <view class="process-section">
        <view class="process-head" @tap="processExpanded = !processExpanded">
          <text class="process-title">当前工序</text>
          <text class="process-hint">点击展开/收起</text>
          <text class="expand-icon">{{ processExpanded ? '▲' : '▼' }}</text>
        </view>

        <view v-show="processExpanded">
          <view
            v-for="(p, i) in form.processes"
            :key="p.id"
            class="process-block"
            :class="{ deleted: p.deleted }"
          >
            <template v-if="!p.deleted">
              <view class="proc-header">
                <view class="proc-left">
                  <view class="status-dot" />
                  <text class="proc-name">{{ p.name }}</text>
                </view>
                <text class="proc-del" @tap="softDeleteProcess(i)">×</text>
              </view>

              <view class="qty-field">
                <text class="qty-label required">良品数量</text>
                <view class="stepper">
                  <view class="step-btn" @tap="changeProcessQty(p, 'good', -1)">−</view>
                  <input
                    v-model.number="p.goodQty"
                    class="step-val"
                    type="digit"
                    @blur="onProcessQtyBlur(p)"
                  />
                  <view class="step-btn primary" @tap="changeProcessQty(p, 'good', 1)">+</view>
                </view>
              </view>

              <view class="qty-field">
                <text class="qty-label">不良品数量</text>
                <view class="stepper">
                  <view class="step-btn" @tap="changeProcessQty(p, 'defect', -1)">−</view>
                  <input
                    v-model.number="p.defectQty"
                    class="step-val"
                    type="digit"
                    @blur="onProcessQtyBlur(p)"
                  />
                  <view class="step-btn primary" @tap="changeProcessQty(p, 'defect', 1)">+</view>
                </view>
              </view>

              <view v-if="getDefectItemsForProcess(p.name).length" class="qty-field">
                <text class="qty-label">不良原因（选填）</text>
                <view class="defect-chips">
                  <view
                    v-for="item in getDefectItemsForProcess(p.name)"
                    :key="item.id"
                    class="defect-chip"
                    :class="{ active: (p.defectItemIds || []).includes(item.id) }"
                    @tap="toggleProcessDefect(p, item.id)"
                  >{{ item.name }}</view>
                </view>
              </view>
            </template>
            <template v-else>
              <text class="proc-deleted-name">{{ p.name }}</text>
              <text class="undo-btn" @tap="undoDeleteProcess(i)">撤销删除</text>
            </template>
          </view>

          <text class="add-process" @tap="openProcessSelect">+ 添加工序</text>
        </view>
      </view>

      <!-- 操作人员：整体模式 -->
      <view v-if="!form.perProcessMode" class="operator-section">
        <text class="operator-title">操作人员（整体）</text>
        <view class="operator-tags">
          <view v-for="name in form.operators" :key="name" class="op-tag">
            <text>{{ name }}</text>
            <text class="op-x" @tap="removeOperator(name)">×</text>
          </view>
          <text class="op-add" @tap="goSelectOperators()">+ 添加</text>
        </view>
      </view>

      <!-- 操作人员：按工序模式 -->
      <view v-else class="operator-section">
        <text class="operator-title">操作人员（按工序）</text>
        <text class="operator-hint">每道工序可单独指定操作人员</text>
        <view
          v-for="p in activeProcesses"
          :key="p.id"
          class="proc-operator-row"
          @tap="goSelectOperators(p.id)"
        >
          <text class="proc-op-name">{{ p.name }}</text>
          <text class="proc-op-link">
            {{ p.operators?.length ? p.operators.join('、') : '指定人员' }} ›
          </text>
        </view>
      </view>
    </view>

    <!-- 卡片3：备注 -->
    <view class="card">
      <view class="card-title">
        <text>备注</text>
        <text class="badge optional-badge">可选</text>
      </view>
      <textarea
        v-model="form.remark"
        class="remark-area"
        placeholder="本批次使用替代螺丝规格M6×20..."
        maxlength="500"
      />
    </view>

    <!-- 底部操作栏 -->
    <view class="foot-bar">
      <button class="foot-btn cancel" @tap="onCancel">取消</button>
      <button class="foot-btn submit" :loading="submitting" @tap="onSubmit">提交登记</button>
    </view>

    <SubmitSuccessModal
      v-model:visible="showSuccess"
      :data="successData"
      @done="onSuccessDone"
    />

    <ProcessSelectModal
      v-model:visible="processSelectVisible"
      :exclude-process-ids="excludeProcessIds"
      :exclude-names="excludeProcessNames"
      @confirm="onProcessesSelected"
    />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import SubmitSuccessModal from '@/components/quick-report/SubmitSuccessModal.vue'
import ProcessSelectModal from '@/components/quick-report/ProcessSelectModal.vue'
import { resolveDefaultExecutors } from '@/mock/processConfig'
import { getProductMaterialById } from '@/mock/productMaterialInfo'
import { getProductByCode, getProductById } from '@/mock/quickReportProducts'
import {
  buildQuickReportProcessesFromRoute,
  getActiveRouteNames,
  resolveProcessQuantities,
} from '@/mock/quickReportProcess'
import {
  formatReportDate,
  getLastOperators,
  getQuickReportById,
  reportDaysAgo,
  submitQuickReport,
} from '@/mock/quickReport'
import { consumeSelectionResult } from '@/utils/selection'
import { getUser } from '@/utils/auth'
import { getProcessDefectItems } from '@/utils/iodomsStorage'

const submitting = ref(false)
const editId = ref('')
const processExpanded = ref(true)
const dateChip = ref('today')
const showSuccess = ref(false)
const successData = ref({})
const processSelectVisible = ref(false)
const sourceWorkOrderNo = ref('')
const planQty = ref(null)

const selectedProduct = ref(null)
const routeOptions = ref([])

const form = reactive({
  productId: '',
  productName: '',
  productCode: '',
  reportDate: formatReportDate(),
  goodQty: 0,
  defectQty: 0,
  routeId: '',
  routeName: '',
  perProcessMode: false,
  processes: [],
  operators: [],
  remark: '',
})

const productDisplay = computed(() => {
  if (!form.productName) return ''
  return form.productCode
    ? `${form.productName} · ${form.productCode}`
    : form.productName
})

const activeProcesses = computed(() =>
  form.processes.filter((p) => !p.deleted),
)

const excludeProcessIds = computed(() =>
  form.processes
    .filter((p) => !p.deleted && p.processConfigId)
    .map((p) => p.processConfigId),
)

const excludeProcessNames = computed(() =>
  form.processes.filter((p) => !p.deleted).map((p) => p.name),
)

const routeIndex = computed(() => {
  const i = routeOptions.value.findIndex((r) => r.id === form.routeId)
  return i >= 0 ? i : 0
})

const showSelectedDate = computed(() => dateChip.value === 'custom' && !!form.reportDate)

const customChipLabel = computed(() =>
  dateChip.value === 'custom' && form.reportDate ? form.reportDate : '选择日期',
)

const totalReportQty = computed(
  () => (Number(form.goodQty) || 0) + (Number(form.defectQty) || 0),
)

const fromWorkOrder = computed(() => !!sourceWorkOrderNo.value)

onLoad((query) => {
  if (!query.id) {
    form.operators = [...getLastOperators()]
    if (query.workOrderNo) {
      sourceWorkOrderNo.value = decodeURIComponent(query.workOrderNo)
    }
    if (query.productId) {
      const product =
        getProductById(query.productId) || getProductMaterialById(query.productId)
      if (product) applyProduct(product)
    } else if (query.productCode) {
      const product = getProductByCode(decodeURIComponent(query.productCode))
      if (product) applyProduct(product)
    }
    if (query.targetQty) {
      const qty = Number(query.targetQty)
      if (qty > 0) planQty.value = qty
    }
    return
  }
  editId.value = query.id
  const row = getQuickReportById(query.id)
  if (!row) {
    uni.showToast({ title: '记录不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  if (row.status === '已确认') {
    uni.showToast({ title: '已确认记录不可编辑', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  loadFromRecord(row)
})

onShow(() => {
  if (!fromWorkOrder.value) {
    const product = consumeSelectionResult('product')
    if (product) applyProduct(product)
  }

  const personnel = consumeSelectionResult('personnel')
  if (personnel) applyPersonnel(personnel)
})

function loadFromRecord(row) {
  form.productId = row.productId || ''
  form.productName = row.productName
  form.productCode = row.productCode
  form.reportDate = row.reportDate
  form.goodQty = row.goodQty ?? row.finishedQty ?? 0
  form.defectQty = row.defectQty || 0
  form.routeId = row.routeId || ''
  form.routeName = row.routeName || ''
  form.perProcessMode = !!row.perProcessMode
  form.processes = row.processes.map((p) => ({
    ...p,
    id: p.id || `proc-${Date.now()}`,
    defectItemIds: [...(p.defectItemIds || [])],
  }))
  form.operators = [...(row.operators || [])]
  form.remark = row.remark || ''

  const today = formatReportDate()
  const yesterday = reportDaysAgo(1)
  if (row.reportDate === today) dateChip.value = 'today'
  else if (row.reportDate === yesterday) dateChip.value = 'yesterday'
  else dateChip.value = 'custom'

  if (row.productId) {
    selectedProduct.value = getProductMaterialById(row.productId)
    routeOptions.value = getActiveRouteNames(row.productName).map((name) => ({
      id: name,
      name,
    }))
  }
}

function applyProduct(product) {
  selectedProduct.value = product
  form.productId = product.id
  form.productName = product.name
  form.productCode = product.code
  routeOptions.value = getActiveRouteNames(product.name).map((name) => ({ id: name, name }))

  const route = routeOptions.value[0]
  if (route) applyRoute(route)
}

function applyRoute(route) {
  form.routeId = route.id
  form.routeName = route.name
  form.processes = buildQuickReportProcessesFromRoute(route.name, {
    goodQty: form.goodQty,
    defectQty: form.defectQty,
    finishedQty: totalReportQty.value,
  })
}

function onRouteChange(e) {
  const route = routeOptions.value[Number(e.detail.value)]
  if (route) applyRoute(route)
}

function setDateChip(chip) {
  dateChip.value = chip
  if (chip === 'today') form.reportDate = formatReportDate()
  else if (chip === 'yesterday') form.reportDate = reportDaysAgo(1)
}

function prepareCustomDate() {
  dateChip.value = 'custom'
}

function onCustomDate(e) {
  const val = e.detail?.value
  if (!val) return
  dateChip.value = 'custom'
  form.reportDate = val
}

function changeFormQty(field, delta) {
  const key = field === 'good' ? 'goodQty' : 'defectQty'
  form[key] = Math.max(0, (Number(form[key]) || 0) + delta)
  syncProcessQtyFromForm()
}

function syncProcessQtyFromForm() {
  form.goodQty = Math.max(0, Number(form.goodQty) || 0)
  form.defectQty = Math.max(0, Number(form.defectQty) || 0)
  const qtys = { goodQty: form.goodQty, defectQty: form.defectQty }
  form.processes.forEach((p) => {
    if (!p.deleted) Object.assign(p, resolveProcessQuantities(qtys))
  })
}

function changeProcessQty(record, field, delta) {
  const key = field === 'good' ? 'goodQty' : 'defectQty'
  record[key] = Math.max(0, (Number(record[key]) || 0) + delta)
  onProcessQtyBlur(record)
}

function onProcessQtyBlur(record) {
  Object.assign(record, resolveProcessQuantities(record))
}

function getDefectItemsForProcess(processName) {
  return getProcessDefectItems(processName)
}

function toggleProcessDefect(process, itemId) {
  if (!process.defectItemIds) process.defectItemIds = []
  const i = process.defectItemIds.indexOf(itemId)
  if (i >= 0) process.defectItemIds.splice(i, 1)
  else process.defectItemIds.push(itemId)
}

function onPerProcessToggle(e) {
  form.perProcessMode = e.detail.value
}

function softDeleteProcess(index) {
  form.processes[index].deleted = true
}

function undoDeleteProcess(index) {
  form.processes[index].deleted = false
}

function openProcessSelect() {
  processSelectVisible.value = true
}

function onProcessesSelected(rows) {
  const qtys = resolveProcessQuantities({
    goodQty: form.goodQty,
    defectQty: form.defectQty,
    finishedQty: totalReportQty.value,
  })
  rows.forEach((proc) => {
    form.processes.push({
      id: `cfg-${proc.id}-${Date.now()}`,
      processConfigId: proc.id,
      name: proc.name,
      code: proc.code,
      goodQty: qtys.goodQty,
      defectQty: qtys.defectQty,
      qty: qtys.qty,
      deleted: false,
      manual: true,
      operators: [...resolveDefaultExecutors(proc)],
      defectItemIds: [],
      defectItemNames: [],
    })
  })
  processExpanded.value = true
}

function goProductSearch() {
  uni.navigateTo({ url: '/pages/quick-report/product-search' })
}

function goSelectOperators(processId = '') {
  let selected = []
  if (processId) {
    const proc = form.processes.find((p) => p.id === processId)
    selected = proc?.operators || []
  } else {
    selected = form.operators
  }
  const encoded = encodeURIComponent(JSON.stringify(selected))
  const url = processId
    ? `/pages/quick-report/personnel-select?processId=${processId}&selected=${encoded}`
    : `/pages/quick-report/personnel-select?selected=${encoded}`
  uni.navigateTo({ url })
}

function applyPersonnel({ processId, operators }) {
  if (processId) {
    const proc = form.processes.find((p) => p.id === processId)
    if (proc) proc.operators = [...operators]
  } else {
    form.operators = [...operators]
  }
}

function removeOperator(name) {
  const i = form.operators.indexOf(name)
  if (i >= 0) form.operators.splice(i, 1)
}

function onCancel() {
  uni.navigateBack()
}

function onSubmit() {
  if (submitting.value) return
  syncProcessQtyFromForm()

  submitting.value = true
  const user = getUser()
  const res = submitQuickReport({
    id: editId.value || undefined,
    productId: form.productId,
    productName: form.productName,
    productCode: form.productCode,
    reportDate: form.reportDate,
    goodQty: form.goodQty,
    defectQty: form.defectQty,
    routeId: form.routeId,
    routeName: form.routeName,
    perProcessMode: form.perProcessMode,
    processes: form.processes,
    operators: form.operators,
    reporter: user?.displayName || '当前用户',
    remark: form.remark,
    sourceWorkOrderNo: sourceWorkOrderNo.value || undefined,
  })
  submitting.value = false

  if (!res.ok) {
    uni.showToast({ title: res.message, icon: 'none' })
    return
  }

  successData.value = {
    reportId: res.record.id,
    workOrderNo: res.record.workOrderNo,
    productName: res.record.productName,
    productCode: res.record.productCode,
    goodQty: res.record.goodQty,
    defectQty: res.record.defectQty,
    finishedQty: res.record.finishedQty,
    processes: res.record.processes,
    operators: res.record.operators,
  }
  showSuccess.value = true
}

function onSuccessDone() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.form-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.wo-info-card {
  background: linear-gradient(180deg, #e6f4ff 0%, #fff 100%);
}

.wo-info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.wo-info-row:last-child {
  border-bottom: none;
}

.wo-info-label {
  font-size: 26rpx;
  color: #8c8c8c;
  flex-shrink: 0;
}

.wo-info-val {
  font-size: 28rpx;
  color: #1a1a1a;
  text-align: right;
  flex: 1;
}

.wo-info-val.primary {
  color: $primary;
  font-weight: 600;
}

.qty-hint {
  display: block;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 28rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 400;
}

.required-badge {
  background: #fff1f0;
  color: #ff4d4f;
}

.optional-badge {
  background: #f5f5f5;
  color: #8c8c8c;
}

.field-row {
  margin-bottom: 28rpx;
}

.field-row:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 12rpx;
}

.field-label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4rpx;
}

.field-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}

.field-value .placeholder {
  color: #bfbfbf;
}

.arrow {
  color: #bfbfbf;
  font-size: 32rpx;
}

.arrow.down {
  font-size: 22rpx;
}

.qty-field {
  margin-bottom: 28rpx;
}

.qty-label {
  display: block;
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 12rpx;
}

.qty-label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4rpx;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.step-btn {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 36rpx;
  color: #595959;
}

.step-btn.primary {
  background: $primary;
  color: #fff;
}

.step-val {
  flex: 1;
  text-align: center;
  font-size: 56rpx;
  font-weight: 700;
  color: $primary;
  height: 80rpx;
}

.defect-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.defect-chip {
  padding: 12rpx 28rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #595959;
}

.defect-chip.active {
  border-color: $primary;
  color: $primary;
  background: #e6f4ff;
}

.qty-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0 4rpx;
}

.qty-total-label {
  font-size: 28rpx;
  color: #8c8c8c;
}

.qty-total-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.date-chips {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.chip {
  padding: 14rpx 32rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #595959;
}

.chip.active {
  border-color: $primary;
  color: $primary;
  background: #e6f4ff;
}

.date-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.date-result-label {
  font-size: 26rpx;
  color: #8c8c8c;
}

.date-result-value {
  font-size: 32rpx;
  font-weight: 600;
  color: $primary;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 28rpx;
  padding-bottom: 28rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.toggle-title {
  display: block;
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.toggle-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8c8c8c;
  line-height: 1.4;
}

.route-picker {
  margin-top: 0;
}

.route-picker.readonly {
  color: #595959;
}

.process-section {
  margin-top: 8rpx;
}

.process-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 0;
}

.process-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.process-hint {
  flex: 1;
  font-size: 22rpx;
  color: #8c8c8c;
}

.expand-icon {
  font-size: 22rpx;
  color: #8c8c8c;
}

.process-block {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.process-block:last-of-type {
  border-bottom: none;
}

.process-block.deleted {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff1f0;
  margin: 0 -16rpx;
  padding: 20rpx 16rpx;
  border-radius: 8rpx;
  border-bottom: none;
}

.proc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.proc-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #52c41a;
  flex-shrink: 0;
}

.proc-name {
  font-size: 28rpx;
  color: #1a1a1a;
}

.proc-name-input {
  flex: 1;
  font-size: 28rpx;
  border-bottom: 1rpx solid #d9d9d9;
}

.proc-del {
  font-size: 36rpx;
  color: #ff4d4f;
  padding: 0 8rpx;
  line-height: 1;
}

.proc-deleted-name {
  flex: 1;
  font-size: 28rpx;
  color: #ff4d4f;
  text-decoration: line-through;
}

.undo-btn {
  font-size: 26rpx;
  color: $primary;
}

.add-process {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  color: $primary;
}

.operator-section {
  margin-top: 28rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid #f0f0f0;
}

.operator-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.operator-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
}

.operator-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}

.op-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: #e6f4ff;
  color: $primary;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.op-x {
  font-size: 28rpx;
}

.op-add {
  font-size: 28rpx;
  color: $primary;
}

.proc-operator-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.proc-op-name {
  font-size: 28rpx;
  color: #1a1a1a;
}

.proc-op-link {
  font-size: 26rpx;
  color: $primary;
  max-width: 360rpx;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remark-area {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.foot-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx 40rpx;
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.foot-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  margin: 0;
  border: none;
}

.foot-btn.cancel {
  background: #fff;
  color: #1a1a1a;
  border: 2rpx solid #d9d9d9;
}

.foot-btn.submit {
  background: $primary;
  color: #fff;
}
</style>
