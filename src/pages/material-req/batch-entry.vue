<template>
  <view class="redirect-page" />
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app'

onLoad((query) => {
  const tab = query.tab ? `?tab=${query.tab}` : ''
  uni.redirectTo({ url: `/pages/material-req/work-order-select${tab}` })
})
</script>
