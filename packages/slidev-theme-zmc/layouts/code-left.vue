<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

defineProps<{
  heading?: string
}>()
</script>

<template>
  <div class="slidev-layout zmc-code-beside">
    <OrreryBackdrop variant="faint" anchor="right" />
    <div class="zmc-code-cols code-left">
      <div class="zmc-code-pane">
        <slot name="code" />
      </div>
      <div class="zmc-prose-pane">
        <h1 v-if="heading" class="zmc-head">{{ heading }}</h1>
        <slot />
      </div>
    </div>
  </div>
</template>
