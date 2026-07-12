<script setup lang="ts">
import { computed } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

const props = defineProps<{
  plate?: string
  coord?: string
}>()

const { slides } = useNav()
const { $page } = useSlideContext()

function roman(n: number) {
  const table: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let out = ''
  for (const [v, s] of table) {
    while (n >= v) {
      out += s
      n -= v
    }
  }
  return out
}

// number the plates I, II, III… by counting section slides up to this one
const plateNumber = computed(() => {
  if (props.plate)
    return props.plate
  let count = 0
  for (const s of slides.value as any[]) {
    if (s.no > $page.value)
      break
    if (s.meta?.slide?.frontmatter?.layout === 'section')
      count += 1
  }
  return roman(Math.max(count, 1))
})
</script>

<template>
  <div class="slidev-layout zmc-section">
    <OrreryBackdrop variant="bold" anchor="bottom" />
    <p class="zmc-section-plate">TABVLA · {{ plateNumber }}</p>
    <slot />
    <div class="zmc-rule" />
    <p v-if="coord" class="zmc-eyebrow zmc-section-coord">{{ coord }}</p>
  </div>
</template>
