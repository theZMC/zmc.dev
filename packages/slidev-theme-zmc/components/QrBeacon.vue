<script setup lang="ts">
import { useId } from 'vue'
import { svg, url } from 'virtual:zmc-qr'

// per-instance id: the end plate and a dedicated qr slide can both carry
// the beacon in one deck, and a shared id would cross their toggles
const id = useId()
</script>

<template>
  <div v-if="svg" class="zmc-qr">
    <input
      :id="id"
      type="checkbox"
      class="zmc-qr-toggle"
      aria-label="Invert QR colors for scanning"
    >
    <figure class="zmc-qr-figure" v-html="svg" />
    <p class="zmc-qr-url">{{ url }}</p>
    <label class="zmc-qr-pill" :for="id">Invert</label>
  </div>
</template>
