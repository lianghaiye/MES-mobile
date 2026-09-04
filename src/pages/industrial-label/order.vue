<template>
  <view v-if="task" class="order-page">
    <view class="header-card">
      <view class="head">
        <text class="order-no">{{ task.orderNo }}</text>
        <text class="tag" :class="statusClass(task.status)">{{ task.status }}</text>
      </view>
      <view class="customer">{{ task.customerName || '—' }}</view>
      <view class="progress-text">本单进度：已刻 {{ task.done }} / {{ task.total }}</view>
      <view class="progress-track">
        <view class="progress-fill" :style="{ width: progressWidth }" />
      </view>
    </view>

    <view class="guide">按产品查看 SN，刻完一块点「确认已刻」打勾，避免重复或漏刻。</view>

    <view v-for="p in task.products" :key="p.key" class="product-card">
      <view class="product-head">
        <view class="product-title">{{ p.productName }}</view>
        <text class="tag" :class="statusClass(p.status)">{{ p.status }}</text>
      </view>
      <view class="product-sub">
        {{ p.productCode || '—' }}
        <text v-if="p.specModel"> · {{ p.specModel }}</text>
        <text v-if="p.material"> · {{ p.material }}</text>
      </view>
      <view class="product-count">需刻 {{ p.total }} 块 · 已完成 {{ p.done }} · 待刻 {{ p.pending }}</view>

      <view
        v-for="(lbl, idx) in p.labels"
        :key="lbl.id"
        class="sn-row"
        :class="{ done: lbl.mounted, highlight: highlightCode === lbl.labelCode }"
      >
        <view class="sn-left" @tap="goDetail(lbl)">
          <view class="sn-index">{{ idx + 1 }}</view>
          <view class="sn-body">
            <text class="sn-code">{{ lbl.labelCode }}</text>
            <text v-if="lbl.mounted" class="sn-time">已刻 {{ lbl.nameplateMountedAt || '' }}</text>
            <text v-else class="sn-tip">待刻录</text>
          </view>
        </view>
        <view v-if="lbl.mounted" class="sn-check">✓ 已刻</view>
        <button v-else class="btn-mount" size="mini" @tap.stop="onMount(lbl)">确认已刻</button>
      </view>
    </view>
  </view>
  <view v-else class="empty">未找到该销售单铭牌任务</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  confirmNameplateMount,
  getNameplateOrderTask,
} from '@/utils/industrialLabelBridge'

const orderNo = ref('')
const highlightCode = ref('')
const task = ref(null)

const progressWidth = computed(() => {
  const t = task.value
  if (!t?.total) return '0%'
  return `${Math.round((t.done / t.total) * 100)}%`
})

function reload() {
  task.value = getNameplateOrderTask(orderNo.value)
  if (task.value) {
    uni.setNavigationBarTitle({
      title: task.value.pending > 0 ? '刻录任务' : '已完成刻录',
    })
  }
}

function statusClass(status) {
  if (status === '已完成') return 'ok'
  if (status === '进行中') return 'doing'
  return 'pending'
}

function goDetail(lbl) {
  uni.navigateTo({
    url: `/pages/industrial-label/detail?code=${encodeURIComponent(lbl.labelCode)}`,
  })
}

function onMount(lbl) {
  uni.showModal({
    title: '确认已刻',
    content: `确认 SN「${lbl.labelCode}」已刻录并装到实物？`,
    success: (res) => {
      if (!res.confirm) return
      const result = confirmNameplateMount(lbl.labelCode, { operator: '小程序' })
      if (!result.ok) {
        uni.showToast({ title: result.message || '失败', icon: 'none' })
        return
      }
      uni.showToast({ title: '已标记完成', icon: 'success' })
      reload()
    },
  })
}

onLoad((query) => {
  orderNo.value = decodeURIComponent(query.orderNo || '')
  highlightCode.value = query.code ? decodeURIComponent(query.code) : ''
  reload()
})

onShow(() => {
  if (orderNo.value) reload()
})
</script>

<style lang="scss" scoped>
.order-page {
  padding: 24rpx;
  padding-bottom: 80rpx;
}

.header-card,
.product-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.order-no {
  font-size: 34rpx;
  font-weight: 700;
  color: #1677ff;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.tag.ok {
  background: #f6ffed;
  color: #52c41a;
}

.tag.doing {
  background: #e6f4ff;
  color: #1677ff;
}

.tag.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.customer {
  font-size: 26rpx;
  color: #595959;
  margin-bottom: 16rpx;
}

.progress-text {
  font-size: 26rpx;
  margin-bottom: 12rpx;
}

.progress-track {
  height: 14rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #52c41a;
}

.guide {
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 16rpx;
  line-height: 1.5;
}

.product-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.product-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #262626;
}

.product-sub {
  font-size: 24rpx;
  color: #8c8c8c;
  margin-bottom: 8rpx;
}

.product-count {
  font-size: 24rpx;
  color: #595959;
  margin-bottom: 16rpx;
}

.sn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 16rpx;
  margin-top: 12rpx;
  background: #fff7e6;
  border-radius: 12rpx;
  border: 1rpx solid #ffd591;
}

.sn-row.done {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.sn-row.highlight {
  box-shadow: 0 0 0 4rpx rgba(22, 119, 255, 0.25);
}

.sn-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.sn-index {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 50%;
  background: #fff;
  font-size: 24rpx;
  color: #595959;
  flex-shrink: 0;
}

.sn-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sn-code {
  font-size: 28rpx;
  font-weight: 600;
  color: #1677ff;
  word-break: break-all;
}

.sn-tip {
  font-size: 22rpx;
  color: #fa8c16;
  margin-top: 4rpx;
}

.sn-time {
  font-size: 22rpx;
  color: #8c8c8c;
  margin-top: 4rpx;
}

.sn-check {
  flex-shrink: 0;
  font-size: 26rpx;
  color: #52c41a;
  font-weight: 600;
}

.btn-mount {
  flex-shrink: 0;
  background: #1677ff !important;
  color: #fff !important;
  margin: 0;
}

.empty {
  text-align: center;
  padding: 120rpx 24rpx;
  color: #8c8c8c;
}
</style>
