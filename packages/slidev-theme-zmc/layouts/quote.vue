<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

defineProps<{
  author?: string
}>()
</script>

<template>
  <div class="slidev-layout zmc-quote">
    <OrreryBackdrop variant="faint" anchor="center" />
    <div class="zmc-quote-body">
      <slot />
    </div>
    <p v-if="author" class="zmc-eyebrow zmc-quote-author">— {{ author }}</p>
  </div>
</template>
