<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'
import QrBeacon from '../components/QrBeacon.vue'
</script>

<template>
  <div class="slidev-layout zmc-qr-slide">
    <OrreryBackdrop variant="faint" anchor="center" />
    <slot />
    <QrBeacon />
  </div>
</template>
