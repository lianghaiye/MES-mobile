<template>
  <view v-if="visible" class="modal-mask" @tap="onCancel">
    <view class="modal-panel" @tap.stop>
      <view class="modal-head">
        <text class="modal-title">选择工序</text>
        <text class="modal-close" @tap="onCancel">×</text>
      </view>

      <view class="search-row">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索工序名称、编码"
          confirm-type="search"
          @input="onSearch"
        />
      </view>

      <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
        <view class="category-row">
          <text
            class="cat-chip"
            :class="{ active: !activeCategory }"
            @tap="setCategory('')"
          >
            全部
          </text>
          <text
            v-for="cat in categories"
            :key="cat"
            class="cat-chip"
            :class="{ active: activeCategory === cat }"
            @tap="setCategory(cat)"
          >
            {{ cat }}
          </text>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="list-scroll">
        <view v-if="!displayList.length" class="empty">暂无可选工序</view>
        <view
          v-for="item in displayList"
          :key="item.id"
          class="list-item"
          @tap="toggleSelect(item.id)"
        >
          <view class="check-box" :class="{ checked: selectedIds.includes(item.id) }">
            <text v-if="selectedIds.includes(item.id)" class="check-mark">✓</text>
          </view>
          <view class="item-main">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-meta">{{ item.code }} · {{ item.category }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="modal-foot">
        <text class="foot-hint">已选 {{ selectedIds.length }} 项</text>
        <view class="foot-btns">
          <button class="btn ghost" @tap="onCancel">取消</button>
          <button
            class="btn primary"
            :disabled="!selectedIds.length"
            @tap="onConfirm"
          >
            确定添加
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  getActiveProcesses,
  getProcessCategories,
  reloadProcessConfig,
  searchActiveProcesses,
} from '@/mock/processConfig'

const props = defineProps({
  visible: { type: Boolean, default: false },
  excludeProcessIds: { type: Array, default: () => [] },
  excludeNames: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible', 'confirm'])

const keyword = ref('')
const activeCategory = ref('')
const selectedIds = ref([])
const categories = ref([])

const displayList = computed(() => {
  const list = searchActiveProcesses({
    keyword: keyword.value,
    category: activeCategory.value,
  })
  const idSet = new Set(props.excludeProcessIds)
  const nameSet = new Set(props.excludeNames)
  return list.filter((p) => !idSet.has(p.id) && !nameSet.has(p.name))
})

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    reloadProcessConfig()
    categories.value = getProcessCategories()
    keyword.value = ''
    activeCategory.value = ''
    selectedIds.value = []
  },
)

function onSearch() {
  /* keyword 已绑定，displayList 自动更新 */
}

function setCategory(cat) {
  activeCategory.value = cat
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function onCancel() {
  emit('update:visible', false)
}

function onConfirm() {
  if (!selectedIds.value.length) {
    uni.showToast({ title: '请至少选择一道工序', icon: 'none' })
    return
  }
  const picked = getActiveProcesses().filter((p) => selectedIds.value.includes(p.id))
  emit('confirm', picked)
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.modal-panel {
  width: 100%;
  max-height: 82vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.modal-close {
  font-size: 44rpx;
  color: #8c8c8c;
  line-height: 1;
  padding: 0 8rpx;
}

.search-row {
  padding: 0 32rpx 16rpx;
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #f5f6f8;
  border-radius: 36rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.category-scroll {
  white-space: nowrap;
  padding: 0 32rpx 16rpx;
}

.category-row {
  display: inline-flex;
  gap: 16rpx;
}

.cat-chip {
  display: inline-block;
  padding: 10rpx 24rpx;
  border-radius: 28rpx;
  background: #f5f6f8;
  font-size: 24rpx;
  color: #595959;

  &.active {
    background: #e6f4ff;
    color: $primary;
    font-weight: 600;
  }
}

.list-scroll {
  flex: 1;
  min-height: 360rpx;
  max-height: 52vh;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.empty {
  text-align: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.check-box {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    background: $primary;
    border-color: $primary;
  }
}

.check-mark {
  color: #fff;
  font-size: 24rpx;
  line-height: 1;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-size: 30rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.item-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.modal-foot {
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.foot-hint {
  display: block;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.foot-btns {
  display: flex;
  gap: 20rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  margin: 0;
  padding: 0;

  &::after {
    border: none;
  }
}

.btn.ghost {
  background: #f5f6f8;
  color: #595959;
}

.btn.primary {
  background: $primary;
  color: #fff;

  &[disabled] {
    opacity: 0.45;
  }
}
</style>
