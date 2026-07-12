<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

defineProps<{
  caption?: string
}>()
</script>

<template>
  <div class="slidev-layout zmc-fact">
    <OrreryBackdrop variant="faint" anchor="center" />
    <div class="zmc-fact-body">
      <slot />
    </div>
    <div v-if="caption || $slots.caption" class="zmc-fact-caption">
      <slot name="caption">{{ caption }}</slot>
    </div>
  </div>
</template>
