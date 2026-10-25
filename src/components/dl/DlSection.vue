<template>
  <section class="dl-section" :aria-label="title">
    <div v-if="title || $slots.action" class="head">
      <h2 class="dl-h2">{{ title }}</h2>
      <slot name="action">
        <router-link v-if="linkLabel && to" :to="to" class="link">{{ linkLabel }}</router-link>
        <span v-else-if="meta" class="dl-data meta">{{ meta }}</span>
      </slot>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
/** A titled block of a screen: H2 with an optional "See all" link or mono meta on the right. */
withDefaults(defineProps<{ title?: string; linkLabel?: string; to?: string; meta?: string }>(), {
  title: undefined,
  linkLabel: undefined,
  to: undefined,
  meta: undefined,
})
</script>

<style scoped>
.dl-section {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  margin-bottom: var(--section-gap);
}
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.link {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-primary);
  text-decoration: none;
}
.meta { color: var(--text-muted); }
</style>
