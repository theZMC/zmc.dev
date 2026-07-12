<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'
</script>

<template>
  <div class="slidev-layout zmc-statement">
    <OrreryBackdrop variant="faint" anchor="center" />
    <div class="zmc-statement-body">
      <slot />
    </div>
  </div>
</template>
