<template>
  <view class="create-page">
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
      <text class="section-title">入库产品</text>
      <text class="add-btn" @tap="pickerOpen = true">+ 添加产品</text>
    </view>

    <ProductInboundEditor
      v-for="(line, index) in lines"
      :key="line.id"
      :line="line"
      :work-center="form.workshop"
      removable
      @update:line="updateLine(index, $event)"
      @remove="removeLine(index)"
    />
    <view v-if="!lines.length" class="empty" @tap="pickerOpen = true">点击选择要入库的产品</view>

    <view class="footer-bar">
      <view class="summary">
        <text>共 {{ lines.length }} 项</text>
        <text>合计 {{ totalQty }} 件</text>
      </view>
      <button class="submit-btn" :loading="submitting" @tap="onSubmit">提交入库申请</button>
    </view>

    <ProductPicker v-if="pickerOpen" @select="onPickProduct" @close="pickerOpen = false" />
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import ProductInboundEditor from '@/components/product-inbound/ProductInboundEditor.vue'
import ProductPicker from '@/components/product-inbound/ProductPicker.vue'
import { createProductInboundLine } from '@/utils/productInboundHelpers'
import { submitProductInbound } from '@/store/productInboundStore'
import { getUser } from '@/utils/auth'

const form = reactive({
  workshop: getUser()?.factory || '默认工厂',
  remark: '',
})

const lines = ref([])
const pickerOpen = ref(false)
const submitting = ref(false)

const totalQty = computed(() =>
  lines.value.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
)

function updateLine(index, next) {
  lines.value[index] = next
}

function removeLine(index) {
  lines.value.splice(index, 1)
}

function onPickProduct(product) {
  const exists = lines.value.find((l) => l.itemCode === product.code)
  if (exists) {
    exists.qty = Number(exists.qty || 0) + 1
  } else {
    lines.value.push(createProductInboundLine(product, 1))
  }
  pickerOpen.value = false
}

function buildProductName() {
  if (!lines.value.length) return ''
  if (lines.value.length === 1) return lines.value[0].itemName
  return `${lines.value[0].itemName} 等${lines.value.length}项`
}

function onSubmit() {
  if (!lines.value.length || submitting.value) return
  submitting.value = true
  const result = submitProductInbound({
    mode: 'quick',
    workshop: form.workshop,
    remark: form.remark,
    productName: buildProductName(),
    productCode: lines.value[0]?.itemCode || '',
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
  background: #fff;
  border-radius: 16rpx;
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
  background: #52c41a;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
}
</style>
