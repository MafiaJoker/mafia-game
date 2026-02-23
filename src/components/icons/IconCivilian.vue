<template>
  <svg :width="size" :height="size" viewBox="0 0 480 480" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,480) scale(1,-1)">
      <path d="M169 409 c-63 -67 -20 -169 71 -169 58 0 100 42 100 100 0 92 -108 136 -171 69z"/>
      <path d="M115 198 c-3 -13 -10 -48 -15 -78 -12 -76 -5 -80 140 -80 148 0 154 4 140 85 -19 104 -6 95 -140 95 -116 0 -120 -1 -125 -22z"/>
    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [String, Number], default: 16 }
})
</script>
