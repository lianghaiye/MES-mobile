<template>
  <PlaceholderPage :title="title" />
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PlaceholderPage from '@/components/PlaceholderPage.vue'

const title = ref('功能开发中')

onLoad((query) => {
  if (query.title) title.value = decodeURIComponent(query.title)
})
</script>
