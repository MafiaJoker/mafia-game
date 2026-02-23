<template>
  <svg :width="size" :height="size" viewBox="0 0 24 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 16.5C2 15.67 2.67 15 3.5 15H6V26H3.5C2.67 26 2 25.33 2 24.5V16.5Z"/>
    <path d="M8 15.1V25C8 25.55 8.45 26 9 26H18.09C18.72 26 19.27 25.59 19.43 24.98L21.87 15.98C22.08 15.18 21.48 14.4 20.65 14.4H14.82L15.72 9.58C15.78 9.28 15.69 8.97 15.49 8.75L14.4 7.6L8.65 13.72C8.24 14.16 8 14.75 8 15.1Z"/>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [String, Number], default: 16 }
})
</script>
