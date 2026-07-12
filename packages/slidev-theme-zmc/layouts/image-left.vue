<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

defineProps<{
  image?: string
  caption?: string
  heading?: string
}>()
</script>

<template>
  <div class="slidev-layout zmc-image">
    <OrreryBackdrop variant="faint" anchor="right" />
    <div class="zmc-image-cols">
      <div class="zmc-image-pane">
        <img v-if="image" :src="image" :alt="caption ?? ''" />
        <p v-if="caption" class="zmc-eyebrow zmc-image-caption">{{ caption }}</p>
      </div>
      <div class="zmc-prose-pane">
        <h1 v-if="heading" class="zmc-head">{{ heading }}</h1>
        <slot />
      </div>
    </div>
  </div>
</template>
