<template>
  <el-tooltip placement="top" :trigger="isCompact ? 'click' : ['hover', 'focus']">
    <template #content>
      <div class="hint-tooltip-text">{{ text }}</div>
    </template>
    <!-- Кнопка, а не иконка: до неё доходят табом. .stop - клик не должен
         сортировать колонку, в заголовке которой она стоит -->
    <button type="button" class="hint-icon" :aria-label="label" @click.stop>
      <el-icon><QuestionFilled /></el-icon>
    </button>
  </el-tooltip>
</template>

<script setup>
// Подсказка «?» к подписи или заголовку колонки. На компьютере открывается
// наведением и фокусом с клавиатуры, на телефоне и планшете - тапом:
// hover-подсказка на тач-экране осталась бы висеть
import { QuestionFilled } from '@element-plus/icons-vue'
import { useBreakpoints } from '@/composables/useBreakpoints'

defineProps({
  text: {
    type: String,
    required: true
  },
  // Имя кнопки для экранного диктора: что поясняет подсказка
  label: {
    type: String,
    required: true
  }
})

const { isCompact } = useBreakpoints()
</script>

<style scoped>
/* Поле вокруг иконки шире её самой, а отрицательный отступ его прячет: в иконку
   проще попасть пальцем, а подпись рядом не сдвигается */
.hint-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: -4px;
  padding: 4px;
  border: none;
  border-radius: 50%;
  background: none;
  color: #909399;
  font: inherit;
  line-height: 1;
  vertical-align: middle;
  cursor: help;
}

.hint-icon:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}

.hint-tooltip-text {
  max-width: 260px;
  line-height: 1.5;
}
</style>
