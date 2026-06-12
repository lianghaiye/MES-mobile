<template>
  <view class="select-page">
    <view class="filter-section">
      <text class="filter-label">加工中心</text>
      <scroll-view scroll-x class="center-scroll" :show-scrollbar="false">
        <view class="center-row">
          <text
            class="center-chip"
            :class="{ active: !activeWorkCenter }"
            @tap="setWorkCenter('')"
          >
            全部
          </text>
          <text
            v-for="center in workCenters"
            :key="center"
            class="center-chip"
            :class="{ active: activeWorkCenter === center }"
            @tap="setWorkCenter(center)"
          >
            {{ center }}
          </text>
        </view>
      </scroll-view>
    </view>

    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索姓名、部门"
        @input="onSearch"
      />
    </view>

    <view class="selected-bar" v-if="selected.length">
      <text class="selected-label">已选 {{ selected.length }} 人</text>
      <view class="tags">
        <view v-for="name in selected" :key="name" class="tag">
          <text>{{ name }}</text>
          <text class="tag-x" @tap.stop="toggle(name)">×</text>
        </view>
      </view>
    </view>

    <view
      v-for="person in results"
      :key="person.id"
      class="item"
      :class="{ active: selected.includes(person.name) }"
      @tap="toggle(person.name)"
    >
      <view class="check">{{ selected.includes(person.name) ? '✓' : '' }}</view>
      <view class="info">
        <text class="name">{{ person.name }}</text>
        <text class="dept">{{ person.dept }}</text>
      </view>
    </view>

    <view class="foot">
      <button class="confirm-btn" @tap="onConfirm">确定</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getWorkCenterOptions, searchPersonnel } from '@/mock/personnel'
import { setSelectionResult } from '@/utils/selection'

const keyword = ref('')
const activeWorkCenter = ref('')
const workCenters = ref(getWorkCenterOptions())
const results = ref(searchPersonnel())
const selected = ref([])
const processId = ref('')

onLoad((query) => {
  processId.value = query.processId || ''
  if (query.selected) {
    try {
      selected.value = JSON.parse(decodeURIComponent(query.selected))
    } catch {
      selected.value = query.selected.split(',').filter(Boolean)
    }
  }
})

function refreshList() {
  results.value = searchPersonnel(keyword.value, activeWorkCenter.value)
}

function onSearch() {
  refreshList()
}

function setWorkCenter(center) {
  activeWorkCenter.value = center
  refreshList()
}

function toggle(name) {
  const i = selected.value.indexOf(name)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(name)
}

function onConfirm() {
  setSelectionResult('personnel', {
    processId: processId.value,
    operators: [...selected.value],
  })
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.select-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
  padding-bottom: 140rpx;
}

.filter-section {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
}

.filter-label {
  display: block;
  margin-bottom: 16rpx;
  font-size: 26rpx;
  color: #595959;
}

.center-scroll {
  white-space: nowrap;
}

.center-row {
  display: inline-flex;
  gap: 16rpx;
}

.center-chip {
  display: inline-block;
  padding: 10rpx 24rpx;
  border-radius: 28rpx;
  background: #f5f6f8;
  font-size: 24rpx;
  color: #595959;
}

.center-chip.active {
  background: #e6f4ff;
  color: $primary;
  font-weight: 600;
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.selected-bar {
  margin: 20rpx 0;
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
}

.selected-label {
  font-size: 24rpx;
  color: #8c8c8c;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #e6f4ff;
  color: $primary;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.tag-x {
  font-size: 28rpx;
}

.item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
}

.item.active {
  background: #f0f7ff;
}

.check {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 8rpx;
  text-align: center;
  line-height: 36rpx;
  font-size: 24rpx;
  color: $primary;
}

.item.active .check {
  border-color: $primary;
  background: #e6f4ff;
}

.name {
  display: block;
  font-size: 30rpx;
  color: #1a1a1a;
}

.dept {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.foot {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx 40rpx;
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.confirm-btn {
  height: 88rpx;
  line-height: 88rpx;
  background: $primary;
  color: #fff;
  border-radius: 44rpx;
  border: none;
  font-size: 30rpx;
}
</style>
