<template>
  <view v-if="record" class="inspect-page">
    <view class="card header-card">
      <view class="header-top">
        <text class="qc-no">{{ record.qcNo }}</text>
        <text class="biz-tag">{{ record.bizScope }}</text>
      </view>
      <view v-for="row in headerRows" :key="row.label" class="header-row">
        <text class="header-label">{{ row.label }}</text>
        <text class="header-val">{{ row.value }}</text>
      </view>
    </view>

    <view v-for="(line, index) in formLines" :key="line.id" class="line-card">
      <text class="line-title">明细 {{ index + 1 }} · {{ line.itemName }}</text>
      <view class="item-meta">{{ formatItemMeta(line) }}</view>
      <view class="info-row">
        <text class="info-label">模板</text>
        <text class="info-val">{{ line.templateName || '—' }}</text>
      </view>
      <view v-if="sheetRuleTip(line)" class="rule-tip">{{ sheetRuleTip(line) }}</view>

      <!-- 基本信息：方式 / 数量 / 备注 -->
      <view v-if="headerFields(line).length" class="sheet-section">
        <view class="sheet-title">基本信息</view>
        <view
          v-for="field in headerFields(line)"
          :key="field.code"
          class="field-block"
        >
          <QcFieldInput
            :field="field"
            :model-value="getFieldValue(line, field.code)"
            @update:model-value="(v) => setFieldValue(line, field, v)"
          />
        </view>
      </view>

      <!-- 检验项目 -->
      <view class="sheet-section">
        <view class="sheet-title">检验项目</view>
        <view v-if="!inspectBlocks(line).length" class="section-empty">该模板未配置检验项目</view>
        <template v-for="block in inspectBlocks(line)" :key="block.key">
          <view v-if="block.type === 'simple'" class="inspect-item-card">
            <QcFieldInput
              :field="block.field"
              :model-value="getFieldValue(line, block.field.code)"
              @update:model-value="(v) => setFieldValue(line, block.field, v)"
            />
          </view>
          <view v-else class="composite-card">
            <view class="composite-card-head">
              <view class="composite-card-title-wrap">
                <text class="composite-card-title">{{ block.field.name }}</text>
                <text class="composite-badge">复合</text>
              </view>
              <text v-if="block.field.required !== false" class="composite-req">必填</text>
            </view>
            <view
              v-for="child in block.children"
              :key="child.code"
              class="composite-child"
            >
              <QcFieldInput
                :field="child"
                :model-value="getFieldValue(line, child.code)"
                @update:model-value="(v) => setFieldValue(line, child, v)"
              />
            </view>
          </view>
        </template>
      </view>

      <!-- 整单结论 -->
      <view class="sheet-section sheet-conclusion">
        <view class="sheet-title">整单结论</view>
        <view
          v-for="field in conclusionFields(line)"
          :key="field.code"
          class="field-block"
        >
          <QcFieldInput
            :field="field"
            :model-value="getFieldValue(line, field.code)"
            @update:model-value="(v) => setFieldValue(line, field, v)"
          />
        </view>

        <view v-if="needTreatmentForLine(line)" class="field-block">
          <text class="field-label"><text class="req">*</text>处理方案</text>
          <text class="hint">业务处置字段，不属于质检模板指标</text>
          <picker
            mode="selector"
            :range="planOpts"
            :value="planPickerIndex(line)"
            @change="onTreatmentPlanChange($event, line)"
          >
            <view class="picker-field">
              <text :class="{ placeholder: !line.treatmentPlan }">
                {{ line.treatmentPlan || '请选择' }}
              </text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view v-if="needDispositionForLine(line)" class="disp-card">
          <text class="disp-title">数量处置</text>
          <view class="disp-row">
            <text class="disp-label">合格入库</text>
            <input
              class="disp-input"
              type="digit"
              :value="line.acceptInboundQty"
              @input="onDispInput($event, line, 'acceptInboundQty')"
            />
          </view>
          <view class="disp-row">
            <text class="disp-label">退货</text>
            <input
              class="disp-input"
              type="digit"
              :value="line.returnQty"
              @input="onDispInput($event, line, 'returnQty')"
            />
          </view>
          <view class="disp-row">
            <text class="disp-label">换货</text>
            <input
              class="disp-input"
              type="digit"
              :value="line.exchangeQty"
              @input="onDispInput($event, line, 'exchangeQty')"
            />
          </view>
          <text class="hint">三项合计不可超过质检数量 {{ lineInspectQty(line) }}</text>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="field-label">整单备注</text>
      <textarea v-model="remark" class="textarea" placeholder="请输入备注" />
    </view>

    <button class="btn-primary" :loading="submitting" @tap="handleSubmit">提交质检</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  getQcById,
  startQcInspection,
  submitQcInspection,
  getTreatmentPlanOptions,
  isInboundQcBizScope,
  mapConclusionToResult,
  needTreatment,
  QC_TASK_RESULT,
} from '@/mock/qcTask'
import { getUser } from '@/utils/auth'
import QcFieldInput from '@/components/QcFieldInput.vue'

const record = ref(null)
const formLines = ref([])
const remark = ref('')
const submitting = ref(false)
const listBizScope = ref('')

const planOpts = computed(() => getTreatmentPlanOptions(record.value?.bizScope))

const headerRows = computed(() => {
  const r = record.value
  if (!r) return []
  if (r.bizScope === '来料质检' || r.bizScope === '外协回货检') {
    return [
      { label: '来源单号', value: r.sourceDocNo || '—' },
      { label: '供应商', value: r.supplier || '—' },
    ]
  }
  if (r.bizScope === '生产过程检' || r.bizScope === '成品检') {
    return [
      { label: '工单号', value: r.workOrderNo || '—' },
      { label: '工序', value: r.processName || '—' },
    ]
  }
  return [
    { label: '客户', value: r.customerName || '—' },
    { label: '销售单号', value: r.salesOrderNo || '—' },
    { label: '出库仓库', value: r.outboundWarehouse || '—' },
  ]
})

function formatItemMeta(line) {
  const parts = [line.itemCode, line.specModel, line.drawingNo].map((v) =>
    String(v || '').trim(),
  )
  const text = parts.filter(Boolean).join(' / ')
  return text || '—'
}

function isEnabledField(f) {
  return f && f.enabled !== false
}

function isHeaderField(f) {
  if (!isEnabledField(f)) return false
  if (f.isPresetInspectMethod || f.code === 'QC_INSPECT_METHOD' || f.name === '质检方式') {
    return true
  }
  if (f.isPresetInspectQty || f.code === 'QC_INSPECT_QTY' || f.name === '质检数量') return true
  if (f.isPresetInspectRemark || f.code === 'QC_INSPECT_REMARK' || f.name === '检验备注') {
    return true
  }
  return false
}

function isConclusionField(f) {
  if (!isEnabledField(f)) return false
  return Boolean(f.isConclusion || f.code === 'QC_CONCLUSION' || f.name === '质检结果')
}

function isCompositeField(f) {
  return f?.type === 'composite' || (Array.isArray(f?.children) && f.children.length > 0)
}

function headerFields(line) {
  return (line.templateFields || []).filter(isHeaderField)
}

function conclusionFields(line) {
  return (line.templateFields || []).filter(isConclusionField)
}

function isTreatmentPlanField(f) {
  const code = String(f?.code || '')
    .trim()
    .toUpperCase()
  if (code === 'QC_TREATMENT_PLAN' || code === 'TREATMENT_PLAN') return true
  return String(f?.name || '').trim() === '处理方案'
}

function inspectBlocks(line) {
  const blocks = []
  for (const f of line.templateFields || []) {
    if (!isEnabledField(f)) continue
    if (f.type === 'matrix' || f.type === 'group') continue
    if (isHeaderField(f) || isConclusionField(f) || isTreatmentPlanField(f)) continue
    if (isCompositeField(f)) {
      blocks.push({
        type: 'composite',
        key: f.code,
        field: f,
        children: (f.children || []).map((child) => ({
          ...child,
          required: f.required !== false ? child.required !== false : false,
        })),
      })
      continue
    }
    blocks.push({ type: 'simple', key: f.code, field: f })
  }
  return blocks
}

function sheetRuleTip(line) {
  const rule = String(line.sheetPassRule || '').trim()
  if (rule === 'allPass') {
    return '整单规则「全部达标才通过」：请完整填写检验项后再选结论'
  }
  if (rule === 'keyFields') {
    return '整单规则「关键项达标」：标记为关键的检验项须达标'
  }
  if (rule === 'manual') {
    return '整单规则「人工判定」：可按实际情况选择结论（含特采等）'
  }
  return ''
}

function getFieldValue(line, code) {
  const hit = (line.fieldValues || []).find((v) => v.fieldCode === code)
  return hit?.value ?? ''
}

function ensureFieldValues(line) {
  if (!Array.isArray(line.fieldValues)) line.fieldValues = []
}

function setFieldValue(line, field, value) {
  ensureFieldValues(line)
  const next = [...line.fieldValues]
  const idx = next.findIndex((v) => v.fieldCode === field.code)
  const row = { fieldCode: field.code, fieldName: field.name, value }
  if (idx >= 0) next[idx] = row
  else next.push(row)
  line.fieldValues = next

  if (field.code === 'QC_INSPECT_QTY') {
    line.inspectQty = Number(value) || 0
  }
  if (field.code === 'QC_INSPECT_METHOD') {
    line.inspectMethod = value
  }
  if (field.isConclusion || field.code === 'QC_CONCLUSION') {
    onConclusionChange(line, value)
  }
}

function conclusionField(line) {
  return (line.templateFields || []).find(
    (f) => f.isConclusion || f.code === 'QC_CONCLUSION' || f.name === '质检结果',
  )
}

function getConclusionLabel(line) {
  const f = conclusionField(line)
  return f ? String(getFieldValue(line, f.code) || '').trim() : ''
}

function mappedConclusion(line) {
  const f = conclusionField(line)
  return mapConclusionToResult(getConclusionLabel(line), f)
}

function needTreatmentForLine(line) {
  return needTreatment(getConclusionLabel(line), mappedConclusion(line))
}

function needDispositionForLine(line) {
  if (!isInboundQcBizScope(record.value?.bizScope)) return false
  return needTreatmentForLine(line)
}

function lineInspectQty(line) {
  const v = getFieldValue(line, 'QC_INSPECT_QTY')
  return Number(v ?? line.inspectQty ?? line.receiptQty ?? 0) || 0
}

function clearDisposition(line) {
  line.acceptInboundQty = undefined
  line.returnQty = undefined
  line.exchangeQty = undefined
}

function applyDefaultDisposition(line) {
  if (!needDispositionForLine(line)) {
    clearDisposition(line)
    return
  }
  const base = lineInspectQty(line)
  const plan = String(line.treatmentPlan || '').trim()
  const mapped = mappedConclusion(line)
  if (plan === '让步接收' || (mapped === QC_TASK_RESULT.PASS && plan.includes('让步'))) {
    line.acceptInboundQty = base
    line.returnQty = 0
    line.exchangeQty = 0
    return
  }
  if (plan === '换货') {
    line.acceptInboundQty = 0
    line.returnQty = 0
    line.exchangeQty = base
    return
  }
  // 退货 / 未选 / 其它：默认退货全量
  line.acceptInboundQty = 0
  line.returnQty = base
  line.exchangeQty = 0
}

function onConclusionChange(line, raw) {
  const mapped = mapConclusionToResult(raw, conclusionField(line))
  if (!needTreatment(raw, mapped)) {
    line.treatmentPlan = ''
    clearDisposition(line)
    return
  }
  if (raw.includes('让步')) {
    line.treatmentPlan = isInboundQcBizScope(record.value?.bizScope)
      ? '让步接收'
      : line.treatmentPlan || planOpts.value[0]
  } else if (!line.treatmentPlan) {
    if (isInboundQcBizScope(record.value?.bizScope)) line.treatmentPlan = '退货'
    else if (record.value?.bizScope === '出厂质检') line.treatmentPlan = '返工'
    else line.treatmentPlan = planOpts.value[0] || '返工'
  }
  applyDefaultDisposition(line)
}

function planPickerIndex(line) {
  const i = planOpts.value.indexOf(line.treatmentPlan)
  return i >= 0 ? i : 0
}

function onTreatmentPlanChange(e, line) {
  line.treatmentPlan = planOpts.value[Number(e.detail.value)]
  applyDefaultDisposition(line)
}

function onDispInput(e, line, key) {
  const raw = e.detail.value
  const n = raw === '' ? undefined : Number(raw)
  line[key] = Number.isFinite(n) ? n : undefined
  if (key === 'acceptInboundQty' && isInboundQcBizScope(record.value?.bizScope)) {
    const base = lineInspectQty(line)
    const accept = Math.max(0, Number(line.acceptInboundQty) || 0)
    const remain = Math.max(0, base - accept)
    const plan = String(line.treatmentPlan || '').trim()
    if (plan === '换货') {
      line.exchangeQty = remain
      line.returnQty = 0
    } else {
      line.returnQty = remain
      line.exchangeQty = 0
    }
  }
}

function pushInitValue(fieldValues, existing, field, fallback) {
  let value = existing.find((v) => v.fieldCode === field.code)?.value
  if (value == null || value === '') {
    if (fallback != null && fallback !== '') value = fallback
    else if (field.defaultValue != null) value = field.defaultValue
    else value = ''
  }
  if (value !== '' && value != null) {
    fieldValues.push({ fieldCode: field.code, fieldName: field.name, value })
  }
}

function initLineForm(line) {
  const existing = line.fieldValues || []
  const fieldValues = []
  for (const field of line.templateFields || []) {
    if (isCompositeField(field)) {
      for (const child of field.children || []) {
        pushInitValue(fieldValues, existing, child)
      }
      continue
    }
    let fallback
    if (field.code === 'QC_INSPECT_QTY') fallback = line.inspectQty
    else if (field.code === 'QC_INSPECT_METHOD') {
      fallback = line.inspectMethod || field.defaultValue || '抽检'
    }
    pushInitValue(fieldValues, existing, field, fallback)
  }
  return {
    ...line,
    fieldValues,
    treatmentPlan: line.treatmentPlan || '',
    acceptInboundQty: line.acceptInboundQty,
    returnQty: line.returnQty,
    exchangeQty: line.exchangeQty,
  }
}

function backToQcTaskList() {
  const scope = listBizScope.value || record.value?.bizScope || ''
  const listUrl = scope
    ? `/pages/qc-task/list?bizScope=${encodeURIComponent(scope)}`
    : '/pages/qc-task/list'
  const pages = getCurrentPages()
  for (let i = pages.length - 2; i >= 0; i--) {
    if (pages[i].route?.includes('qc-task/list')) {
      uni.navigateBack({ delta: pages.length - 1 - i })
      return
    }
  }
  uni.redirectTo({ url: listUrl })
}

onLoad((query) => {
  listBizScope.value = decodeURIComponent(query.bizScope || '')
  const started = startQcInspection(query.id, { entryChannel: 'miniprogram' })
  const r = started.ok ? started.task : getQcById(query.id)
  if (!r || r.qcStatus !== '待质检') {
    uni.showToast({ title: started.message || '任务不可质检', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  record.value = r
  remark.value = r.remark || ''
  formLines.value = (r.lineItems || []).map(initLineForm)
})

function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  const user = getUser()
  const result = submitQcInspection(record.value.id, {
    lineItems: formLines.value,
    remark: remark.value,
    inspector: user?.displayName || user?.username || '当前用户',
    entryChannel: 'miniprogram',
  })
  submitting.value = false
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none', duration: 2500 })
    return
  }
  uni.showToast({ title: result.message, icon: 'success' })
  setTimeout(backToQcTaskList, 1200)
}
</script>

<style lang="scss" scoped>
.inspect-page {
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.card,
.line-card {
  background: $bg-card;
  border-radius: $radius;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.qc-no {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  font-weight: 600;
  color: $primary;
  margin-right: 16rpx;
}

.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.biz-tag {
  flex-shrink: 0;
  max-width: 220rpx;
  padding: 6rpx 14rpx;
  font-size: 22rpx;
  line-height: 1.3;
  color: $primary;
  background: $primary-light;
  border-radius: 8rpx;
  text-align: center;
}

.item-meta {
  margin-top: 8rpx;
  margin-bottom: 4rpx;
  font-size: 24rpx;
  line-height: 1.45;
  color: $text-secondary;
  word-break: break-all;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $border;
}

.header-label {
  font-size: 26rpx;
  color: $text-secondary;
  flex-shrink: 0;
  margin-right: 16rpx;
}

.header-val {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: $text-primary;
}

.line-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
  color: $primary;
}

.info-row {
  display: flex;
  margin-top: 8rpx;
  font-size: 26rpx;
}

.info-label {
  width: 160rpx;
  color: $text-secondary;
  flex-shrink: 0;
}

.info-val {
  flex: 1;
  color: $text-primary;
}

.sheet-section {
  margin-top: 24rpx;
  padding: 20rpx 20rpx 8rpx;
  background: #fafbfc;
  border: 1rpx solid #e8e8e8;
  border-radius: 12rpx;
}

.sheet-title {
  margin-bottom: 8rpx;
  padding-left: 12rpx;
  border-left: 6rpx solid $primary;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.3;
}

.sheet-conclusion {
  background: #fff;
  border-color: #d6e4ff;
}

.section-empty {
  padding: 12rpx 0 20rpx;
  font-size: 24rpx;
  color: $text-secondary;
}

.field-block {
  margin-top: 16rpx;
  margin-bottom: 12rpx;
}

.inspect-item-card {
  margin-top: 16rpx;
  margin-bottom: 12rpx;
  padding: 20rpx;
  background: #fff;
  border: 1rpx solid #f0f0f0;
  border-radius: 10rpx;
}

.composite-card {
  margin-top: 16rpx;
  margin-bottom: 12rpx;
  padding: 0;
  background: #f0f7ff;
  border: 1rpx solid #91caff;
  border-left: 8rpx solid #1677ff;
  border-radius: 12rpx;
  overflow: hidden;
}

.composite-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #e6f4ff;
  border-bottom: 1rpx solid #bae0ff;
}

.composite-card-title-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.composite-card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0958d9;
}

.composite-badge {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: #1677ff;
  background: #fff;
  border: 1rpx solid #91caff;
  border-radius: 6rpx;
}

.composite-req {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #ff4d4f;
}

.composite-child {
  margin: 0;
  padding: 20rpx;
  background: #fff;
  border-top: 1rpx solid #eef2f7;
}

.composite-card-head + .composite-child {
  border-top: none;
}

.rule-tip {
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  font-size: 22rpx;
  line-height: 1.45;
  color: #0958d9;
  background: #e6f4ff;
  border-radius: 8rpx;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  margin-bottom: 8rpx;
}

.unit-tag {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: rgba(0, 0, 0, 0.35);
}

.standard-hint {
  display: block;
  margin: -2rpx 0 10rpx;
  font-size: 22rpx;
  color: #d48806;
}

.req {
  color: #ff4d4f;
  margin-right: 4rpx;
}

.hint {
  display: block;
  font-size: 22rpx;
  color: $text-secondary;
  margin: -4rpx 0 10rpx;
}

.num-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.num-input,
.picker-field {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.num-unit {
  flex-shrink: 0;
  font-size: 24rpx;
  color: $text-secondary;
}

.picker-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-field .placeholder {
  color: #999;
}

.picker-arrow {
  font-size: 22rpx;
  color: $text-secondary;
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.result-btns {
  display: flex;
  gap: 12rpx;
}

.result-btns.wrap {
  flex-wrap: wrap;
}

.opt {
  min-width: 140rpx;
  text-align: center;
  padding: 14rpx 20rpx;
  font-size: 26rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  border: 2rpx solid transparent;
}

.opt.active {
  color: $primary;
  background: $primary-light;
  border-color: $primary;
}

.disp-card {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #fafafa;
  border-radius: 8rpx;
  border: 1rpx solid $border;
}

.disp-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.disp-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.disp-label {
  width: 140rpx;
  font-size: 26rpx;
  color: $text-secondary;
}

.disp-input {
  flex: 1;
  height: 64rpx;
  padding: 0 16rpx;
  background: #fff;
  border-radius: 8rpx;
  border: 1rpx solid $border;
  font-size: 28rpx;
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
