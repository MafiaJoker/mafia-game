import { ref, computed, onMounted, onUnmounted } from 'vue'

// Границы экранов - те же, что в медиазапросах (src/assets/global.css):
// телефон до 767px, планшет 768-1023px, дальше - настольный экран.
// 1024px - альбомный iPad, ему уже хватает настольной вёрстки
export const MOBILE_MAX_WIDTH = 767
export const TABLET_MAX_WIDTH = 1023

// Одна ширина на всё приложение: слушатель resize вешаем один раз,
// а не по разу на каждый компонент, который спросил про экран
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : TABLET_MAX_WIDTH + 1)
let subscribers = 0

const updateWidth = () => {
  viewportWidth.value = window.innerWidth
}

export function useBreakpoints() {
  onMounted(() => {
    if (subscribers === 0) {
      window.addEventListener('resize', updateWidth)
    }
    subscribers++
    updateWidth()
  })

  onUnmounted(() => {
    subscribers--
    if (subscribers === 0) {
      window.removeEventListener('resize', updateWidth)
    }
  })

  const isMobile = computed(() => viewportWidth.value <= MOBILE_MAX_WIDTH)
  const isTablet = computed(() => (
    viewportWidth.value > MOBILE_MAX_WIDTH && viewportWidth.value <= TABLET_MAX_WIDTH
  ))
  const isDesktop = computed(() => viewportWidth.value > TABLET_MAX_WIDTH)
  // Телефон или планшет: где хватает места на одну колонку, но не на таблицу
  const isCompact = computed(() => viewportWidth.value <= TABLET_MAX_WIDTH)

  return { viewportWidth, isMobile, isTablet, isDesktop, isCompact }
}
