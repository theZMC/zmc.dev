<script setup lang="ts">
import { computed } from 'vue'
import { configs } from '@slidev/client'
import OrreryBackdrop from '../components/OrreryBackdrop.vue'

// The cover is usually the first slide, whose frontmatter is the deck
// headmatter — Slidev consumes `author` (and `title`/`presenter`) as config
// there, so it never arrives as a prop. Fall back to the parsed config.
const props = defineProps<{
  event?: string
  author?: string
  date?: string
  coord?: string
}>()

const byline = computed(() => props.author ?? (configs as any).author)
</script>

<template>
  <div class="slidev-layout zmc-cover">
    <OrreryBackdrop variant="bold" anchor="right" />
    <div class="zmc-cover-body">
      <p v-if="event" class="zmc-eyebrow">{{ event }}</p>
      <slot />
      <div class="zmc-rule" />
      <p class="zmc-cover-meta">
        <span v-if="byline">{{ byline }}</span>
        <span v-if="date">{{ date }}</span>
        <span v-if="coord">{{ coord }}</span>
      </p>
    </div>
  </div>
</template>
