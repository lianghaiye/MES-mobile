<template>
  <view class="page">
    <view class="section">
      <view class="section-title">基本信息</view>
      <view class="field">
        <text class="label">盘点仓库</text>
        <picker
          class="field-picker"
          :range="warehouseLabels"
          :value="warehouseIndex"
          @change="onWarehouseChange"
        >
          <view class="value-wrap">
            <text class="value">{{ form.warehouse || '请选择' }}</text>
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>
      <view class="field">
        <text class="label">盘点类型</text>
        <picker
          class="field-picker"
          :range="typeOptions"
          :value="typeIndex"
          @change="onTypeChange"
        >
          <view class="value-wrap">
            <text class="value">{{ form.stocktakeType }}</text>
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>
      <view class="field">
        <text class="label">备注</text>
        <input v-model="form.remark" class="input" placeholder="选填" />
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">盘点清单（明盘）</text>
        <text class="hint">差异 = 实盘 − 账面</text>
      </view>
      <view class="toolbar">
        <view class="tool-btn primary" @tap="onLoadWarehouse">加载本仓</view>
        <view class="tool-btn" @tap="onManualAdd">手动添加</view>
        <view class="tool-btn" @tap="onScan">扫码添加</view>
      </view>

      <view v-for="group in groupedLines" :key="group.itemCode" class="item-group">
        <view class="group-head">
          <text class="group-name">{{ group.itemName }}</text>
          <text v-if="group.lines.length > 1" class="group-count">{{ group.lines.length }} 行</text>
        </view>
        <text class="group-meta">{{ formatLineMeta(group) }}</text>

        <view
          v-for="line in group.lines"
          :key="line.id"
          class="line-card"
          :class="{ dedicated: line.dedicated }"
        >
          <view class="line-head">
            <text class="line-tag" :class="{ orange: line.dedicated }">
              {{ line.dedicated ? '按单' : '自由' }}
            </text>
            <text v-if="line.salesOrderNo" class="line-so">销售单 {{ line.salesOrderNo }}</text>
          </view>
          <view class="line-qty">
            <view class="qty-item">
              <text class="qty-label">账面</text>
              <text class="qty-val">{{ line.bookQty }}</text>
            </view>
            <view class="qty-item">
              <text class="qty-label">实盘</text>
              <input
                class="qty-input"
                type="digit"
                :value="String(line.actualQty)"
                @blur="(e) => onActualBlurById(line.id, e)"
              />
            </view>
            <view class="qty-item">
              <text class="qty-label">差异</text>
              <text
                class="qty-val"
                :class="{ pos: line.diffQty > 0, neg: line.diffQty < 0 }"
              >
                {{ line.diffQty }}
              </text>
            </view>
          </view>
          <view class="line-actions">
            <view class="act-btn" @tap="bumpQtyById(line.id, 1)">
              <text class="act-text">实盘 +1</text>
            </view>
            <view
              class="act-btn"
              :class="{ muted: Number(line.diffQty) === 0 }"
              @tap="resetQtyById(line.id)"
            >
              <text class="act-text">恢复账面</text>
            </view>
            <view class="act-btn danger" @tap="removeLineById(line.id)">
              <text class="act-text">删除</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!form.lineItems.length" class="empty-lines">请加载本仓库存或扫码添加</view>
    </view>

    <view class="footer">
      <view class="footer-btn ghost" @tap="onSave">保存草稿</view>
      <view class="footer-btn primary" @tap="onSubmit">提交审核</view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getUser } from '@/utils/auth'
import { consumeSelectionResult } from '@/utils/selection'
import {
  warehouseOptions,
  stocktakeTypeOptions,
  STOCKTAKE_TYPE,
  getStocktakeOrderById,
  canEditStocktake,
  createStocktakeOrder,
  updateStocktakeOrder,
  submitStocktakeOrder,
  loadWarehouseStockLines,
  resolveScanToLines,
  mergeScanLines,
  ensureMobileStocktakeDemoSeed,
} from '@/utils/stocktakeBridge'

const editId = ref('')
const form = reactive({
  warehouse: '',
  stocktakeType: STOCKTAKE_TYPE.OTHER,
  remark: '',
  lineItems: [],
})

const warehouseLabels = warehouseOptions.map((o) => o.label)
const typeOptions = stocktakeTypeOptions

const warehouseIndex = computed(() => {
  const i = warehouseOptions.findIndex((o) => o.value === form.warehouse)
  return i >= 0 ? i : 0
})

const typeIndex = computed(() => {
  const i = typeOptions.indexOf(form.stocktakeType)
  return i >= 0 ? i : 0
})

/** 同编码物料聚在一起：自由在前，按单在后 */
const groupedLines = computed(() => {
  const map = new Map()
  form.lineItems.forEach((line) => {
    const code = String(line.itemCode || '').trim() || line.id
    if (!map.has(code)) {
      map.set(code, {
        itemCode: code,
        itemName: line.itemName || code,
        specModel: line.specModel || '',
        material: line.material || '',
        variantSummary: line.variantSummary || '',
        lines: [],
      })
    }
    const g = map.get(code)
    if (!g.itemName && line.itemName) g.itemName = line.itemName
    if (!g.specModel && line.specModel) g.specModel = line.specModel
    if (!g.material && line.material) g.material = line.material
    if (!g.variantSummary && line.variantSummary) g.variantSummary = line.variantSummary
    g.lines.push(line)
  })
  return [...map.values()].map((g) => {
    g.lines = [...g.lines].sort((a, b) => Number(Boolean(a.dedicated)) - Number(Boolean(b.dedicated)))
    return g
  })
})

function formatLineMeta(groupOrLine) {
  const parts = [
    groupOrLine.itemCode,
    groupOrLine.specModel,
    groupOrLine.material,
    groupOrLine.variantSummary,
  ]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
  return parts.join(' / ') || '—'
}

function findLine(id) {
  return form.lineItems.find((l) => l.id === id) || null
}

function operatorName() {
  const user = getUser()
  return user?.displayName || user?.username || 'mobile'
}

function syncDiff(line) {
  const book = Number(line.bookQty) || 0
  const actual = Number(line.actualQty) || 0
  line.diffQty = Math.round((actual - book) * 10000) / 10000
}

function onWarehouseChange(e) {
  const i = Number(e.detail.value) || 0
  form.warehouse = warehouseOptions[i]?.value || ''
}

function onTypeChange(e) {
  const i = Number(e.detail.value) || 0
  form.stocktakeType = typeOptions[i] || STOCKTAKE_TYPE.OTHER
}

function onActualBlurById(id, e) {
  const line = findLine(id)
  if (!line) return
  line.actualQty = Number(e.detail.value) || 0
  syncDiff(line)
}

function bumpQtyById(id, delta) {
  const line = findLine(id)
  if (!line) return
  line.actualQty = Math.max(0, Math.round((Number(line.actualQty) + delta) * 10000) / 10000)
  syncDiff(line)
}

function resetQtyById(id) {
  const line = findLine(id)
  if (!line) return
  line.actualQty = Number(line.bookQty) || 0
  syncDiff(line)
}

function removeLineById(id) {
  const idx = form.lineItems.findIndex((l) => l.id === id)
  if (idx >= 0) form.lineItems.splice(idx, 1)
}

function onLoadWarehouse() {
  if (!form.warehouse) {
    uni.showToast({ title: '请先选择仓库', icon: 'none' })
    return
  }
  const lines = loadWarehouseStockLines(form.warehouse)
  if (!lines.length) {
    uni.showToast({ title: '本仓暂无库存数据', icon: 'none' })
    return
  }
  form.lineItems = lines
  uni.showToast({ title: `已加载 ${lines.length} 行`, icon: 'success' })
}

function applyScannedCode(code, { confirmFirst = true } = {}) {
  if (!form.warehouse) {
    uni.showToast({ title: '请先选择仓库', icon: 'none' })
    return
  }
  const result = resolveScanToLines(form.warehouse, code)
  if (!result.ok) {
    uni.showToast({ title: result.message || '未识别', icon: 'none' })
    return
  }
  const preview = result.lines[0]
  const doMerge = () => {
    form.lineItems = mergeScanLines(form.lineItems, result.lines, { addQty: 1 })
    uni.showToast({ title: '已加入盘点清单', icon: 'success' })
  }
  if (!confirmFirst) {
    doMerge()
    return
  }
  const ownership = preview.dedicated ? `按单 ${preview.salesOrderNo || ''}` : '自由'
  uni.showModal({
    title: '确认添加',
    content: `${preview.itemName || preview.itemCode}\n编码 ${preview.itemCode}\n账面 ${preview.bookQty}${preview.unit || ''}\n${ownership}`,
    confirmText: '加入清单',
    success: (res) => {
      if (res.confirm) doMerge()
    },
  })
}

function onScan() {
  if (!form.warehouse) {
    uni.showToast({ title: '请先选择仓库', icon: 'none' })
    return
  }
  uni.scanCode({
    onlyFromCamera: true,
    success: (res) => applyScannedCode(String(res.result || '').trim(), { confirmFirst: true }),
    fail: () => uni.showToast({ title: '已取消扫码', icon: 'none' }),
  })
}

function onManualAdd() {
  if (!form.warehouse) {
    uni.showToast({ title: '请先选择仓库', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/stocktake/item-pick?warehouse=${encodeURIComponent(form.warehouse)}`,
  })
}

function applyPickedItem(payload) {
  if (!payload || !form.warehouse) return
  if (payload.source === 'warehouse' && payload.line) {
    form.lineItems = mergeScanLines(form.lineItems, [payload.line], { addQty: 1 })
    uni.showToast({ title: '已加入盘点清单', icon: 'success' })
    return
  }
  if (payload.source === 'catalog' && payload.product) {
    const code = payload.product.code
    const resolved = resolveScanToLines(form.warehouse, code)
    if (resolved.ok) {
      form.lineItems = mergeScanLines(form.lineItems, resolved.lines, { addQty: 1 })
    } else {
      form.lineItems = mergeScanLines(
        form.lineItems,
        [
          {
            itemCode: code,
            itemName: payload.product.name || code,
            itemType: payload.product.itemType || '物料',
            specModel: payload.product.spec || '',
            material: payload.product.material || '',
            unit: '件',
            bookQty: 0,
            actualQty: 1,
          },
        ],
        { addQty: 1 },
      )
    }
    uni.showToast({ title: '已加入盘点清单', icon: 'success' })
  }
}

function buildPayload() {
  return {
    warehouse: form.warehouse,
    stocktakeType: form.stocktakeType,
    remark: form.remark,
    lineItems: form.lineItems,
  }
}

function onSave() {
  const op = operatorName()
  const payload = buildPayload()
  const result = editId.value
    ? updateStocktakeOrder(editId.value, payload, { operator: op })
    : createStocktakeOrder(payload, { operator: op })
  if (!result.ok) {
    uni.showToast({ title: result.message || '保存失败', icon: 'none' })
    return
  }
  editId.value = result.order.id
  uni.showToast({ title: '已保存', icon: 'success' })
}

function onSubmit() {
  const op = operatorName()
  let id = editId.value
  if (!id) {
    const created = createStocktakeOrder(buildPayload(), { operator: op })
    if (!created.ok) {
      uni.showToast({ title: created.message || '保存失败', icon: 'none' })
      return
    }
    id = created.order.id
    editId.value = id
  } else {
    const updated = updateStocktakeOrder(id, buildPayload(), { operator: op })
    if (!updated.ok) {
      uni.showToast({ title: updated.message || '保存失败', icon: 'none' })
      return
    }
  }
  const submitted = submitStocktakeOrder(id, { operator: op })
  if (!submitted.ok) {
    uni.showToast({ title: submitted.message || '提交失败', icon: 'none' })
    return
  }
  uni.showToast({ title: '已提交，请到 PC 审核', icon: 'success' })
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/stocktake/index' })
  }, 500)
}

onLoad((query) => {
  ensureMobileStocktakeDemoSeed()
  const id = query?.id
  if (!id) return
  const order = getStocktakeOrderById(id)
  if (!order) {
    uni.showToast({ title: '单据不存在', icon: 'none' })
    return
  }
  if (!canEditStocktake(order)) {
    uni.redirectTo({ url: `/pages/stocktake/detail?id=${id}` })
    return
  }
  editId.value = order.id
  form.warehouse = order.warehouse || ''
  form.stocktakeType = order.stocktakeType || STOCKTAKE_TYPE.OTHER
  form.remark = order.remark || ''
  form.lineItems = (order.lineItems || []).map((l) => ({ ...l }))
})

onShow(() => {
  const picked = consumeSelectionResult('stocktake-item')
  if (picked) applyPickedItem(picked)
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 160rpx;
  background: #f5f6f8;
}

.section {
  margin-bottom: 20rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #262626;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.hint {
  font-size: 22rpx;
  color: #8c8c8c;
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 20rpx 0;
  border-bottom: 1px solid #f0f0f0;
}

.label {
  flex-shrink: 0;
  width: 160rpx;
  font-size: 28rpx;
  color: #595959;
}

.field-picker {
  flex: 1;
  min-width: 0;
}

.value-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  min-width: 0;
}

.value,
.input {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 28rpx;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  flex-shrink: 0;
  font-size: 32rpx;
  color: #bfbfbf;
  line-height: 1;
}

.toolbar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.tool-btn {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 24rpx;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 10rpx;

  &.primary {
    color: #fff;
    background: #1677ff;
  }
}

.item-group {
  margin-bottom: 16rpx;
  padding: 20rpx;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 12rpx;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.group-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #262626;
}

.group-count {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #8c8c8c;
  background: #fff;
  border: 1px solid #e8e8e8;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
}

.group-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
  line-height: 1.4;
}

.line-card {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #fff;
  border-radius: 10rpx;
  border: 1px solid #f0f0f0;

  &.dedicated {
    border-color: #ffe7ba;
    background: #fffbf5;
  }
}

.line-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.line-tag {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #1677ff;
  background: #e6f4ff;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;

  &.orange {
    color: #d46b08;
    background: #fff7e6;
  }
}

.line-so {
  flex: 1;
  font-size: 24rpx;
  color: #8c8c8c;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-qty {
  display: flex;
  margin-top: 16rpx;
  gap: 12rpx;
}

.qty-item {
  flex: 1;
  text-align: center;
}

.qty-label {
  display: block;
  font-size: 22rpx;
  color: #8c8c8c;
}

.qty-val {
  display: block;
  margin-top: 6rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #262626;

  &.pos {
    color: #52c41a;
  }

  &.neg {
    color: #ff4d4f;
  }
}

.qty-input {
  margin-top: 6rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #262626;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.line-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.act-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 52rpx;
  padding: 0 16rpx;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 8rpx;

  &.danger {
    background: #fff1f0;
    border-color: #ffa39e;

    .act-text {
      color: #ff4d4f;
    }
  }

  &.muted {
    opacity: 0.45;
  }
}

.act-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #1677ff;
  line-height: 1;
}

.empty-lines {
  padding: 48rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #bfbfbf;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.footer-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 600;

  &.ghost {
    color: #1677ff;
    background: #e6f4ff;
  }

  &.primary {
    color: #fff;
    background: #1677ff;
  }
}
</style>
