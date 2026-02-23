<template>
  <svg :width="size" :height="size" viewBox="0 0 28 31" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.0274 2.23755L17.9772 9.68753L25.8839 9.68337L21.3265 15.9283L25.8839 22.1731L17.9772 22.169L14.0274 29.619L10.0776 22.169L2.1709 22.1731L6.72833 15.9283L2.1709 9.68337L10.0776 9.68753L14.0274 2.23755Z"/>
    <circle cx="13.9697" cy="2.20749" r="1.4111"/>
    <circle cx="13.9697" cy="29.589" r="1.4111"/>
    <circle cx="25.8593" cy="9.77341" r="1.4111"/>
    <circle cx="2.1406" cy="9.77341" r="1.4111"/>
    <circle cx="25.8593" cy="21.7227" r="1.4111"/>
    <circle cx="2.1406" cy="21.7227" r="1.4111"/>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [String, Number], default: 16 }
})
</script>
