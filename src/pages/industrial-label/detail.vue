<template>
  <view v-if="record" class="detail-page">
    <view class="card">
      <view class="head">
        <text class="title">{{ record.labelCode }}</text>
        <text class="tag" :class="record.qrStatus === '已绑定' ? 'ok' : 'pending'">
          {{ record.qrStatus || '待绑定' }}
        </text>
      </view>
      <view class="row"><text class="l">标识状态</text><text class="v">{{ record.status || '—' }}</text></view>
      <view class="row"><text class="l">销售单号</text><text class="v">{{ record.salesOrderNo || '—' }}</text></view>
      <view class="row"><text class="l">客户</text><text class="v">{{ record.customerName || '—' }}</text></view>
      <view class="row"><text class="l">产品名称</text><text class="v">{{ record.productName || '—' }}</text></view>
      <view class="row"><text class="l">产品编码</text><text class="v">{{ record.productCode || '—' }}</text></view>
      <view class="row"><text class="l">规格型号</text><text class="v">{{ record.specModel || '—' }}</text></view>
      <view class="row"><text class="l">材质</text><text class="v">{{ record.material || '—' }}</text></view>
      <view class="row"><text class="l">申请单号</text><text class="v">{{ record.requestOrderNo || '—' }}</text></view>
      <view class="row"><text class="l">注册时间</text><text class="v">{{ record.regTime || '—' }}</text></view>
      <view v-if="record.nameplateMountedAt" class="row">
        <text class="l">装牌时间</text>
        <text class="v">{{ record.nameplateMountedAt }}（{{ record.nameplateMountedBy || '—' }}）</text>
      </view>
    </view>

    <view class="section-title">刻装说明</view>
    <view class="card tip-card">
      <text class="tip">请按本 SN 刻制铭牌并装到实际出厂机台上。建议从「铭牌任务」按销售单逐块确认，避免漏刻/重刻。</text>
    </view>

    <view v-if="canMount" class="form-card">
      <text class="form-label">件号（可选）</text>
      <input v-model="pieceSerialNo" class="form-input" placeholder="有实物件号可填写" />
    </view>

    <button v-if="canMount" class="btn-primary" @tap="onConfirmMount">确认已装铭牌</button>
    <view v-else class="done-hint">该 SN 已完成装牌确认</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { confirmNameplateMount, getLabelByCode } from '@/utils/industrialLabelBridge'

const record = ref(null)
const pieceSerialNo = ref('')

const canMount = computed(
  () => record.value && record.value.status !== '作废' && record.value.qrStatus !== '已绑定',
)

function reload(code) {
  record.value = getLabelByCode(code)
  if (!record.value) {
    uni.showToast({ title: '未找到该 SN', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1200)
  }
}

onLoad((query) => {
  const code = decodeURIComponent(query.code || '')
  reload(code)
})

function onConfirmMount() {
  if (!record.value) return
  uni.showModal({
    title: '确认装牌',
    content: `确认 SN「${record.value.labelCode}」已刻装到实物？`,
    success: (res) => {
      if (!res.confirm) return
      const result = confirmNameplateMount(record.value.labelCode, {
        operator: '小程序',
        pieceSerialNo: pieceSerialNo.value.trim(),
      })
      if (!result.ok) {
        uni.showToast({ title: result.message || '失败', icon: 'none' })
        return
      }
      record.value = result.label
      uni.showToast({ title: '装牌确认成功', icon: 'success' })
    },
  })
}
</script>

<style lang="scss" scoped>
.detail-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1677ff;
  word-break: break-all;
  padding-right: 16rpx;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.tag.ok {
  background: #f6ffed;
  color: #52c41a;
}

.tag.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
  font-size: 26rpx;
}

.l {
  color: #8c8c8c;
  flex-shrink: 0;
}

.v {
  color: #262626;
  text-align: right;
  word-break: break-all;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  margin: 8rpx 0 16rpx;
}

.tip-card .tip {
  font-size: 26rpx;
  color: #595959;
  line-height: 1.6;
}

.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #8c8c8c;
  margin-bottom: 12rpx;
}

.form-input {
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f6f8;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.btn-primary {
  background: #1677ff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.done-hint {
  text-align: center;
  color: #52c41a;
  font-size: 28rpx;
  padding: 24rpx;
}
</style>
