<script setup lang="ts">
import OrreryBackdrop from '../components/OrreryBackdrop.vue'
import QrBeacon from '../components/QrBeacon.vue'

// withDefaults, not `qr !== false`: Vue casts an absent boolean prop to
// false, so without the default every slide would read as opted out
withDefaults(
  defineProps<{
    author?: string
    coord?: string
    /** the talk's QR beacon, on unless the slide says `qr: false` */
    qr?: boolean
  }>(),
  { qr: true },
)
</script>

<template>
  <div class="slidev-layout zmc-cover zmc-end">
    <OrreryBackdrop variant="bold" anchor="left" />
    <QrBeacon v-if="qr" class="zmc-end-qr" />
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
