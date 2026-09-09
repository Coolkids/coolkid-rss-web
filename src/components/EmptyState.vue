<template>
  <div class="workspace-empty" :role="error ? 'alert' : 'status'">
    <div class="workspace-empty__icon"><q-icon :name="icon || (error ? 'cloud_off' : 'inbox')" size="32px" /></div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
<script setup lang="ts">
defineProps<{ title: string; description: string; icon?: string; error?: boolean }>()
</script>
