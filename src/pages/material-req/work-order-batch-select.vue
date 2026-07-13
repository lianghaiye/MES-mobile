<template>
  <view class="redirect-page" />
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app'

onLoad(() => {
  uni.redirectTo({ url: '/pages/material-req/work-order-select' })
})
</script>
