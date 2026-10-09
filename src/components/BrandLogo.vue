<template>
  <span class="brand" :class="{ dark: onDark }">
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--ion-color-primary)" />
      <path d="M7 16.5 16 9l9 7.5V24a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill="var(--ion-color-primary-contrast)" />
      <rect x="13" y="17" width="6" height="8" rx="1" fill="var(--ion-color-secondary)" />
    </svg>
    <span class="name">Board<b>Mate</b></span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ onDark?: boolean }>()
</script>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ion-text-color);
}
.name {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.brand.dark {
  color: #fff;
}
.brand.dark svg rect:first-child {
  fill: #fff;
}
.brand.dark svg path {
  fill: var(--ion-color-primary);
}
.brand.dark .name b {
  color: var(--ion-color-secondary);
}
.name b {
  color: var(--ion-color-primary);
  font-weight: 800;
}
</style>
