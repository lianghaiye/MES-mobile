<template>
  <view class="detail-page">
    <view v-if="!detail" class="empty">单据不存在或已处理</view>

    <template v-else>
      <view class="section">
        <view class="section-title">{{ bizLabel(detail.bizType) }} · {{ detail.bizNo }}</view>
        <StatusTag :text="detail.status" />
      </view>

      <view class="section card">
        <view class="block-title">基本信息</view>
        <view v-for="field in detail.headerFields" :key="field.label" class="info-row">
          <text class="label">{{ field.label }}</text>
          <text class="value">{{ field.value || '—' }}</text>
        </view>
      </view>

      <view class="section card">
        <view class="block-title">明细（{{ detail.lines.length }} 行）</view>
        <view v-for="(line, idx) in visibleLines" :key="line.id || idx" class="line-card">
          <view class="line-title">{{ lineTitle(line) }}</view>
          <view v-for="col in detail.lineColumns" :key="col.key" class="line-row">
            <text class="label">{{ col.label }}</text>
            <text class="value">{{ formatLineValue(line, col) }}</text>
          </view>
        </view>
        <view v-if="detail.lines.length > 3" class="expand-btn" @tap="expanded = !expanded">
          {{ expanded ? '收起' : `展开全部 ${detail.lines.length} 行` }}
        </view>
      </view>

      <view v-if="detail.approvalRecords?.length" class="section card">
        <view class="block-title">审批记录</view>
        <view v-for="(rec, idx) in detail.approvalRecords" :key="idx" class="timeline-item">
          <view class="timeline-head">
            <text class="timeline-name">{{ rec.name }}</text>
            <text class="timeline-result">{{ rec.result }}</text>
          </view>
          <view class="timeline-meta">{{ rec.role }} · {{ rec.time }}</view>
          <view v-if="rec.opinion" class="timeline-opinion">{{ rec.opinion }}</view>
        </view>
      </view>

      <view v-if="canAct" class="action-panel">
        <view class="opinion-label">审批意见</view>
        <textarea
          v-model="opinion"
          class="opinion-input"
          placeholder="驳回必填；通过选填"
          maxlength="200"
        />
        <view class="action-row">
          <button class="btn reject" :loading="submitting" @tap="onReject">驳回</button>
          <button class="btn approve" :loading="submitting" @tap="onApprove">通过</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import StatusTag from '@/components/StatusTag.vue'
import { APPROVAL_BIZ_LABEL } from '@/constants/approvalTypes'
import { getUser } from '@/utils/auth'
import {
  getApprovalDetail,
  approveDocument,
  rejectDocument,
  canApproveDetail,
} from '@/mock/approval'

const bizType = ref('')
const bizId = ref('')
const detail = ref(null)
const opinion = ref('')
const expanded = ref(false)
const submitting = ref(false)

const canAct = computed(() => canApproveDetail(detail.value))

const visibleLines = computed(() => {
  if (!detail.value?.lines) return []
  return expanded.value ? detail.value.lines : detail.value.lines.slice(0, 3)
})

function bizLabel(type) {
  return APPROVAL_BIZ_LABEL[type] || '单据'
}

function lineTitle(line) {
  return line.productName || line.itemName || line.productCode || line.itemCode || '明细行'
}

function formatLineValue(line, col) {
  const val = line[col.key] ?? (col.altKey ? line[col.altKey] : undefined)
  if (val == null || val === '') return '—'
  if (col.money) {
    return `¥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (col.suffixKey && line[col.suffixKey]) return `${val} ${line[col.suffixKey]}`
  return String(val)
}

function reload() {
  if (!bizType.value || !bizId.value) return
  detail.value = getApprovalDetail(bizType.value, bizId.value)
}

function onApprove() {
  if (submitting.value) return
  submitting.value = true
  const user = getUser()
  const res = approveDocument(bizType.value, bizId.value, opinion.value, user)
  submitting.value = false
  if (!res.ok) {
    uni.showToast({ title: res.message || '操作失败', icon: 'none' })
    return
  }
  uni.showToast({ title: '审核通过', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 500)
}

function onReject() {
  if (submitting.value) return
  submitting.value = true
  const user = getUser()
  const res = rejectDocument(bizType.value, bizId.value, opinion.value, user)
  submitting.value = false
  if (!res.ok) {
    uni.showToast({ title: res.message || '操作失败', icon: 'none' })
    return
  }
  uni.showToast({ title: '已驳回', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 500)
}

onLoad((query) => {
  bizType.value = query.bizType || ''
  bizId.value = query.bizId || ''
})

onShow(() => {
  reload()
})
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 280rpx;
}

.empty {
  padding: 120rpx 24rpx;
  text-align: center;
  color: #8c8c8c;
}

.section {
  margin: 24rpx 24rpx 0;
}

.section-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #262626;
  margin-bottom: 12rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.block-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16rpx;
}

.info-row,
.line-row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 10rpx 0;
  font-size: 26rpx;
}

.label {
  color: #8c8c8c;
  flex-shrink: 0;
}

.value {
  color: #262626;
  text-align: right;
  word-break: break-all;
}

.line-card {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #fafafa;
  border-radius: 12rpx;
}

.line-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.expand-btn {
  margin-top: 16rpx;
  text-align: center;
  color: #1677ff;
  font-size: 26rpx;
}

.timeline-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.timeline-item:last-child {
  border-bottom: none;
}

.timeline-head {
  display: flex;
  justify-content: space-between;
  font-size: 28rpx;
}

.timeline-name {
  font-weight: 600;
}

.timeline-result {
  color: #1677ff;
}

.timeline-meta {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.timeline-opinion {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #595959;
}

.action-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.opinion-label {
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 8rpx;
}

.opinion-input {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: #fafafa;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.action-row {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.reject {
  background: #fff;
  color: #ff4d4f;
  border: 1rpx solid #ff4d4f;
}

.approve {
  background: #07c160;
  color: #fff;
  border: none;
}
</style>
