<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

defineProps<{
  author?: string
  coord?: string
}>()
</script>

<template>
  <div class="slidev-layout zmc-cover zmc-end">
    <OrreryBackdrop variant="bold" anchor="left" />
    <div class="zmc-cover-body" style="margin-left: auto; text-align: right">
      <p class="zmc-eyebrow">FINIS · TRANSMISSIONIS</p>
      <slot />
      <div class="zmc-rule" style="margin-left: auto" />
      <p class="zmc-cover-meta" style="justify-content: flex-end">
        <span v-if="author">{{ author }}</span>
        <span v-if="coord">{{ coord }}</span>
      </p>
    </div>
  </div>
</template>
