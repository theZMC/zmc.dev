<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'
</script>

<template>
  <div class="slidev-layout zmc-default">
    <OrreryBackdrop variant="faint" anchor="right" />
    <div class="zmc-panel">
      <slot />
    </div>
  </div>
</template>
