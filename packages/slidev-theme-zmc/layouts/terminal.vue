<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

withDefaults(
  defineProps<{
    heading?: string
  }>(),
  { heading: 'CONSOLE' },
)
</script>

<template>
  <div class="slidev-layout zmc-terminal">
    <OrreryBackdrop variant="faint" anchor="right" />
    <div class="zmc-terminal-frame">
      <div class="zmc-terminal-head">
        <span class="sun" />
        <span>{{ heading }}</span>
      </div>
      <div class="zmc-terminal-body">
        <slot />
      </div>
    </div>
  </div>
</template>
