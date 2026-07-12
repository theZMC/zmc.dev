<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

defineProps<{
  heading?: string
}>()
</script>

<template>
  <div class="slidev-layout zmc-two-cols">
    <OrreryBackdrop variant="faint" anchor="left" />
    <div class="zmc-panel">
      <h1 v-if="heading" class="zmc-head">{{ heading }}</h1>
      <div class="zmc-cols">
        <div class="zmc-col">
          <slot />
        </div>
        <div class="zmc-col">
          <slot name="right" />
        </div>
      </div>
    </div>
  </div>
</template>
