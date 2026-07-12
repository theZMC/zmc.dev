<script setup lang="ts">
/**
 * The coordinate strip: deck title, current section, and the slide count as
 * a completing orbit. Divider plates (cover/section/end) and the bare `full`
 * canvas stay clean.
 */
import { computed } from 'vue'
import { useNav, configs } from '@slidev/client'
import ProgressDial from './components/ProgressDial.vue'

const { currentSlideNo, total, slides, currentSlideRoute } = useNav()

const layout = computed(() => {
  const fm = (currentSlideRoute.value as any)?.meta?.slide?.frontmatter
  return fm?.layout ?? (currentSlideNo.value === 1 ? 'cover' : 'default')
})
const bare = computed(() => ['cover', 'section', 'end', 'full'].includes(layout.value))

const section = computed(() => {
  let name = ''
  for (const s of slides.value as any[]) {
    if (s.no > currentSlideNo.value)
      break
    const slide = s.meta?.slide
    if (slide?.frontmatter?.layout === 'section')
      name = slide.frontmatter?.title ?? slide.title ?? ''
  }
  return name
})

const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <footer v-if="!bare" class="zmc-foot">
    <span v-if="configs.title" class="zmc-foot-title">{{ configs.title }}</span>
    <span v-if="section" class="zmc-foot-sec">{{ section }}</span>
    <span class="zmc-foot-count">
      <ProgressDial />
      <span>{{ pad(currentSlideNo) }} / {{ pad(total) }}</span>
    </span>
  </footer>
</template>
