<template>
  <div class="dialog-header">
    <span class="el-dialog__title dialog-header__title">{{ title }}</span>
    <!-- На телефоне и планшете диалог закрывает собой шапку игры вместе с
         таймером, а маска не пускает к нему клик - показываем тот же таймер
         здесь. На компьютере шапка видна над диалогом, второй ни к чему -->
    <GameTimer v-if="isCompact" compact />
  </div>
</template>

<script setup>
import GameTimer from '../GameTimer.vue'
import { useBreakpoints } from '@/composables/useBreakpoints'

defineProps({
  title: {
    type: String,
    required: true
  }
})

const { isCompact } = useBreakpoints()
</script>

<style scoped>
/* Шапка диалога с крестиком получает справа лишние 16px под него
   (.el-dialog__header.show-close). Забираем их обратно, иначе полоса таймера
   заметно смещена влево относительно тела диалога */
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  margin-right: calc(-1 * var(--el-message-close-size, 16px));
}

/* Крестик закрытия - квадрат 48x48 в правом верхнем углу диалога. Заголовок
   держим левее его значка, а таймер уходит из-под него следующей строкой */
.dialog-header__title {
  padding-right: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
