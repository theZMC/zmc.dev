<script setup lang="ts">
/**
 * The site's reading-progress dial, repurposed: an orbit that completes as
 * the deck advances, the brass body riding the arc's leading edge.
 */
import { computed } from 'vue'
import { useNav } from '@slidev/client'

const { currentSlideNo, total } = useNav()

const CIRCUMFERENCE = 2 * Math.PI * 9 // r=9 → 56.55, matches the dasharray

const progress = computed(() => {
  if (total.value <= 1)
    return 1
  return (currentSlideNo.value - 1) / (total.value - 1)
})
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value))
const bodyAngle = computed(() => progress.value * 360)
</script>

<template>
  <svg class="progress-dial" viewBox="0 0 22 22" aria-hidden="true">
    <circle class="track" cx="11" cy="11" r="9" />
    <circle class="arc" cx="11" cy="11" r="9" :style="{ strokeDashoffset: dashOffset }" />
    <g :transform="`rotate(${bodyAngle} 11 11)`">
      <circle class="body" cx="20" cy="11" r="1.6" />
    </g>
  </svg>
</template>
