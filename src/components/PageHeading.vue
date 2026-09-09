<template>
  <header class="workspace-heading">
    <div class="workspace-heading__text">
      <div class="workspace-eyebrow"><span /> {{ eyebrow || 'RSS 工作台' }}</div>
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="workspace-heading__actions"><slot /></div>
  </header>
</template>
<script setup lang="ts">
defineProps<{ title: string; subtitle: string; eyebrow?: string }>()
</script>
