<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

withDefaults(
  defineProps<{
    heading?: string
    leftLabel?: string
    rightLabel?: string
  }>(),
  { leftLabel: 'ANTE', rightLabel: 'POST' },
)
</script>

<template>
  <div class="slidev-layout zmc-compare">
    <OrreryBackdrop variant="faint" anchor="center" />
    <h1 v-if="heading" class="zmc-head">{{ heading }}</h1>
    <slot />
    <div class="zmc-compare-grid">
      <div class="zmc-compare-pane">
        <div class="zmc-compare-label">{{ leftLabel }}</div>
        <slot name="left" />
      </div>
      <div class="zmc-compare-pane">
        <div class="zmc-compare-label brass">{{ rightLabel }}</div>
        <slot name="right" />
      </div>
    </div>
  </div>
</template>
