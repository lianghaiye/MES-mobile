<template>
  <view class="pick-page">
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索产品名称、编码、规格、图号..."
        confirm-type="search"
        @input="onSearch"
      />
    </view>

    <view class="tabs">
      <view
        class="tab"
        :class="{ active: activeTab === 'warehouse' }"
        @tap="activeTab = 'warehouse'"
      >
        本仓物品 ({{ filteredWarehouseList.length }})
      </view>
      <view
        class="tab"
        :class="{ active: activeTab === 'catalog' }"
        @tap="activeTab = 'catalog'"
      >
        全部产品/物料 ({{ searchList.length }})
      </view>
    </view>

    <template v-if="activeTab === 'warehouse'">
      <view
        v-for="item in filteredWarehouseList"
        :key="`wh-${item.code}-${item.batchId || ''}`"
        class="card recent"
        @tap="onSelectStock(item)"
      >
        <view class="card-head">
          <text class="name">{{ item.name }}</text>
          <text class="link">选择 ›</text>
        </view>
        <text class="meta">
          {{ item.itemType }} · 编码 {{ item.code }}
          <text v-if="item.spec"> · 规格 {{ item.spec }}</text>
        </text>
        <text class="stock">账面 {{ item.bookQty }}{{ item.unit ? ` ${item.unit}` : '' }}</text>
        <text v-if="item.salesOrderNo" class="so">销售单 {{ item.salesOrderNo }}</text>
      </view>
      <view v-if="!filteredWarehouseList.length" class="empty">
        {{ keyword.trim() ? '本仓没有匹配的库存物品' : '本仓暂无库存，可切换到全部产品/物料添加' }}
      </view>
    </template>

    <template v-else>
      <view v-for="item in searchList" :key="item.id" class="card" @tap="onSelectCatalog(item)">
        <view class="card-head">
          <text class="name">{{ item.name }}</text>
          <text class="link">选择 ›</text>
        </view>
        <text class="meta">
          {{ item.itemType }} · 编码 {{ item.code }}
          <text v-if="item.spec"> · 规格 {{ item.spec }}</text>
        </text>
        <text v-if="item.drawingNo" class="meta">图号 {{ item.drawingNo }}</text>
      </view>
      <view v-if="!searchList.length" class="empty">未找到匹配产品，请调整搜索关键词</view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { searchProductMaterials } from '@/mock/productMaterialInfo'
import { setSelectionResult } from '@/utils/selection'
import {
  ensureMobileStocktakeDemoSeed,
  loadWarehouseStockLines,
} from '@/utils/stocktakeBridge'

const warehouse = ref('')
const keyword = ref('')
const activeTab = ref('warehouse')
const warehouseStockList = ref([])
const searchList = ref([])

const filteredWarehouseList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return warehouseStockList.value
  return warehouseStockList.value.filter((item) => {
    const hay = [item.name, item.code, item.spec, item.drawingNo, item.salesOrderNo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(kw)
  })
})

function refreshWarehouseStock() {
  const lines = loadWarehouseStockLines(warehouse.value)
  warehouseStockList.value = lines.map((l) => ({
    code: l.itemCode,
    name: l.itemName,
    itemType: l.itemType,
    spec: l.specModel,
    unit: l.unit,
    bookQty: l.bookQty,
    batchId: l.batchId,
    batchNo: l.batchNo,
    salesOrderNo: l.salesOrderNo,
    salesOrderId: l.salesOrderId,
    dedicated: l.dedicated,
    rawLine: l,
  }))
}

function onSearch() {
  searchList.value = searchProductMaterials(keyword.value).slice(0, 80)
}

function onSelectStock(item) {
  setSelectionResult('stocktake-item', {
    source: 'warehouse',
    warehouse: warehouse.value,
    line: item.rawLine,
  })
  uni.navigateBack()
}

function onSelectCatalog(item) {
  setSelectionResult('stocktake-item', {
    source: 'catalog',
    warehouse: warehouse.value,
    product: item,
  })
  uni.navigateBack()
}

onLoad((query) => {
  ensureMobileStocktakeDemoSeed()
  warehouse.value = decodeURIComponent(String(query?.warehouse || '').trim())
  if (!warehouse.value) {
    uni.showToast({ title: '缺少仓库参数', icon: 'none' })
  }
  refreshWarehouseStock()
  onSearch()
})
</script>

<style lang="scss" scoped>
$primary: #1677ff;

.pick-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding: 24rpx;
  padding-bottom: 48rpx;
}

.search-bar {
  margin-bottom: 16rpx;
}

.tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx;
}

.tab {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #595959;
  line-height: 64rpx;
  border-radius: 12rpx;
}

.tab.active {
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

.section-label {
  display: block;
  font-size: 24rpx;
  color: #8c8c8c;
  margin: 8rpx 0 16rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
}

.card.recent {
  border: 2rpx solid rgba(22, 119, 255, 0.18);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.link {
  flex-shrink: 0;
  color: $primary;
  font-size: 26rpx;
}

.meta,
.stock,
.so {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8c8c8c;
}

.stock {
  color: #595959;
}

.so {
  color: #d46b08;
}

.empty {
  text-align: center;
  padding: 80rpx 24rpx;
  color: #999;
  font-size: 28rpx;
}
</style>
