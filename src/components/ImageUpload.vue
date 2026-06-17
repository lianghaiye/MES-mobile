<template>
  <view class="image-upload">
    <view v-if="label" class="upload-label">
      <text>{{ label }}</text>
      <text v-if="hint" class="upload-hint">{{ hint }}</text>
    </view>
    <view class="grid">
      <view
        v-for="(url, index) in modelValue"
        :key="`${url}-${index}`"
        class="thumb-wrap"
        @tap="onPreview(index)"
      >
        <image class="thumb" :src="url" mode="aspectFill" />
        <view v-if="!readonly" class="remove-btn" @tap.stop="onRemove(index)">×</view>
      </view>
      <view
        v-if="!readonly && modelValue.length < max"
        class="add-btn"
        @tap="onChoose"
      >
        <text class="add-icon">+</text>
        <text class="add-text">上传图片</text>
      </view>
    </view>
    <text v-if="!readonly" class="tip">最多 {{ max }} 张，支持拍照或相册选择</text>
  </view>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  max: {
    type: Number,
    default: 9,
  },
  label: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

function onChoose() {
  const remain = props.max - (props.modelValue?.length || 0)
  if (remain <= 0) {
    uni.showToast({ title: `最多上传 ${props.max} 张`, icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const paths = res.tempFilePaths || []
      const next = [...(props.modelValue || []), ...paths].slice(0, props.max)
      emit('update:modelValue', next)
    },
  })
}

function onRemove(index) {
  const next = [...(props.modelValue || [])]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function onPreview(index) {
  const urls = props.modelValue || []
  if (!urls.length) return
  uni.previewImage({
    urls,
    current: urls[index] || urls[0],
  })
}
</script>

<style lang="scss" scoped>
.image-upload {
  width: 100%;
}

.upload-label {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: #595959;
}

.upload-hint {
  font-size: 22rpx;
  color: #bfbfbf;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.thumb-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.thumb {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
}

.remove-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  line-height: 36rpx;
  text-align: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 28rpx;
  border-bottom-left-radius: 12rpx;
}

.add-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.add-icon {
  font-size: 48rpx;
  color: #bfbfbf;
  line-height: 1;
  margin-bottom: 8rpx;
}

.add-text {
  font-size: 22rpx;
  color: #8c8c8c;
}

.tip {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #bfbfbf;
}
</style>
