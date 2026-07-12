<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

defineProps<{
  heading?: string
}>()
</script>

<template>
  <div class="slidev-layout zmc-code">
    <OrreryBackdrop variant="faint" anchor="right" />
    <h1 v-if="heading" class="zmc-head">{{ heading }}</h1>
    <div class="zmc-code-stage">
      <slot />
    </div>
  </div>
</template>
